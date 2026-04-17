-- =============================================
-- 星火联盟 · RAG Phase 1（真向量化 pgvector）
-- 目标：用 pgvector + HNSW 索引替代 tsvector，为 AI 问答提供精准语义检索。
-- 向量维度：1024（匹配 NVIDIA nv-embedqa-e5-v5 / nv-embed-v1）
-- =============================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================== spark_knowledge 表 ===================
-- 通用知识库文档切片（chunks）。
-- 典型来源(source)：'module-docs'、'resource'、'news'、'moment'、'legacy'、'user-note'
CREATE TABLE IF NOT EXISTS spark_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- NVIDIA nv-embedqa-e5-v5 输出 1024 维；如切换到其他模型请同步调整
  embedding vector(1024),
  -- 可选：所属用户（null = 全局可见）
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 可见性：public(任何人)、logged_in(登录用户)、private(仅 owner)
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','logged_in','private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, title, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_sk_source ON spark_knowledge(source);
CREATE INDEX IF NOT EXISTS idx_sk_owner ON spark_knowledge(owner_id) WHERE owner_id IS NOT NULL;

-- HNSW 索引（O(log n) 近似最近邻），用 cosine 距离。创建较慢，但查询极快。
-- 若行数 < 1000 pgvector 建议用 IVFFlat；这里先默认 HNSW 方便生产扩展。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sk_embedding_hnsw') THEN
    CREATE INDEX idx_sk_embedding_hnsw ON spark_knowledge
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- HNSW 不支持时退化为 IVFFlat
  RAISE NOTICE 'HNSW not available, falling back to IVFFlat';
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sk_embedding_ivf') THEN
    CREATE INDEX idx_sk_embedding_ivf ON spark_knowledge
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  END IF;
END $$;

-- =================== RLS ===================
ALTER TABLE spark_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sk_sel ON spark_knowledge;
DROP POLICY IF EXISTS sk_ins ON spark_knowledge;
DROP POLICY IF EXISTS sk_upd ON spark_knowledge;
DROP POLICY IF EXISTS sk_del ON spark_knowledge;

-- 读：public 任何人；logged_in 任何登录用户；private 仅 owner
CREATE POLICY sk_sel ON spark_knowledge FOR SELECT USING (
  visibility = 'public'
  OR (visibility = 'logged_in' AND auth.uid() IS NOT NULL)
  OR (visibility = 'private' AND auth.uid() = owner_id)
);
-- 写：仅登录用户，且必须写自己的（service role 绕过 RLS 即可大批量导入 module-docs）
CREATE POLICY sk_ins ON spark_knowledge FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (owner_id IS NULL OR auth.uid() = owner_id));
CREATE POLICY sk_upd ON spark_knowledge FOR UPDATE
  USING (auth.uid() = owner_id OR owner_id IS NULL);
CREATE POLICY sk_del ON spark_knowledge FOR DELETE
  USING (auth.uid() = owner_id);

-- =================== 触发器：updated_at ===================
CREATE OR REPLACE FUNCTION spark_knowledge_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sk_touch ON spark_knowledge;
CREATE TRIGGER trg_sk_touch
  BEFORE UPDATE ON spark_knowledge
  FOR EACH ROW EXECUTE FUNCTION spark_knowledge_touch();

-- =================== 最近邻检索 RPC ===================
-- match_spark_knowledge(query_embedding, match_count, source_filter, min_score)
-- 返回按 cosine 相似度（1 - cosine_distance）降序排列的 top-K 片段。
-- 视图通过 RLS 控制用户可见范围，无需 RPC 再校验 owner_id。
CREATE OR REPLACE FUNCTION match_spark_knowledge(
  query_embedding vector(1024),
  match_count INT DEFAULT 5,
  source_filter TEXT DEFAULT NULL,
  min_score FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  title TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB,
  score FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    k.id,
    k.source,
    k.title,
    k.content,
    k.url,
    k.metadata,
    -- cosine similarity = 1 - cosine distance
    (1 - (k.embedding <=> query_embedding))::float AS score
  FROM spark_knowledge k
  WHERE k.embedding IS NOT NULL
    AND (source_filter IS NULL OR k.source = source_filter)
    AND (1 - (k.embedding <=> query_embedding)) >= min_score
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =================== 种子静态知识（MODULE_DOCS 从前端同步到数据库） ===================
-- 注：embedding 列留 NULL，后续通过 embedding backfill 脚本或手动调 spark-rag/ingest 接口填充。
INSERT INTO spark_knowledge (source, title, content, visibility, metadata) VALUES
 ('module-docs', '星火助手（Chat）', '路径 /app/chat。用户与 AI 模型对话的主入口，支持 3 种模式（均衡/深度思考/极速）底层都用 Gemma 3 27B。支持代码块/公式/导航链接渲染，一键复制 LaTeX。', 'public', '{"module":"chat"}'::jsonb),
 ('module-docs', '星火伴侣（Companion）', '路径 /app/companion。仿微信的好友/群聊/动态三合一。可发语音（自动转文字 AI 润色）、图片、文件。标签组管理好友，星标好友有⭐徽章。有星火域（动态墙），支持发布/点赞/评论/收藏/置顶，置顶动态在顶部横向滚动展示。', 'public', '{"module":"companion"}'::jsonb),
 ('module-docs', '智能日程（SmartSchedule）', '路径 /app/schedule。日、周、月三视图。事件类型：course/exam/task/life/reminder/holiday。支持 AI 导入（把文本/课表图识别为结构化事件）、优先级、提醒。', 'public', '{"module":"schedule"}'::jsonb),
 ('module-docs', '校园墙（CampusWall）', '路径 /app/wall。全校园内容流，支持发帖、评论、点赞、标签、地区过滤。AI 生成 ai_summary 帮助快速浏览。', 'public', '{"module":"wall"}'::jsonb),
 ('module-docs', '星火自习室 / LearnHub', '路径 /app/learn。番茄钟、环境白噪音、专注时长统计、学习资源广场（文档/视频/笔记分享）。', 'public', '{"module":"learn"}'::jsonb),
 ('module-docs', '星火共创（CoCreate）', '路径 /app/cocreate。学生项目协作广场，可发布项目招队友/简历匹配/里程碑管理。', 'public', '{"module":"cocreate"}'::jsonb),
 ('module-docs', '星火传承（SparkLegacy）', '路径 /app/legacy。学长学姐经验分享、考研/保研/就业指导、文章库。', 'public', '{"module":"legacy"}'::jsonb),
 ('module-docs', '人才招募（Talent）', '路径 /app/talent。学生简历 + 企业/社团招募信息，AI 简历诊断（年度版特权）。', 'public', '{"module":"talent"}'::jsonb),
 ('module-docs', '资讯中心（News）', '路径 /app/news。每日热榜 + 深度 AI 解读，多源聚合（学术/政策/科技）。', 'public', '{"module":"news"}'::jsonb),
 ('module-docs', '校园购物（Shop）', '路径 /app/shop。学生二手市场 / 周边，会员可提升商品曝光优先级。', 'public', '{"module":"shop"}'::jsonb),
 ('module-docs', '健康生活（Health）', '路径 /app/health。运动打卡、饮食记录、睡眠分析、心理健康自评。', 'public', '{"module":"health"}'::jsonb),
 ('module-docs', 'AI 模型架构', '生产环境：前端 → Supabase Edge Function（assistant-chat / spark-ai-general / spark-rag）→ NVIDIA NIM API（Gemma 3 27B 主模型 + LLaMA 3.1 8B 回退 + nv-embedqa-e5-v5 embeddings）。开发环境可回退本地 Ollama（VITE_LOCAL_AI_URL）。所有 API Key 仅存在服务端，不前端明文。', 'public', '{"module":"infra"}'::jsonb),
 ('module-docs', '数据安全', '所有敏感参数（NVIDIA_API_KEY 等）只在 Supabase Edge Function 服务端保管，前端仅持有用户 session JWT。全链路 HTTPS；内容安全层（contentSafety.ts）过滤 XSS、敏感词、AI 身份暴露。spark-rag 每次查询都有鉴权、敏感词前置过滤、输入长度限制。', 'public', '{"module":"safety"}'::jsonb),
 ('module-docs', '星火 ID 系统', '每用户有唯一 spark_id（可自定义，字母数字下划线 4-16 位），每年只能修改一次。spark_profiles 表为唯一用户资料真实来源。', 'public', '{"module":"identity"}'::jsonb),
 ('module-docs', '标签组功能', '位置：星火伴侣→通讯录→标签组。支持创建/重命名/删除标签，成员 CRUD，星标置顶（★ 优先级 0-99），中文拼音首字母分组，搜索（标签名/成员昵称/SparkID），8 色预设。', 'public', '{"module":"companion"}'::jsonb),
 ('module-docs', '发布动态', '可附带文字、图片、视频、文件、标签、地区、可见范围（公开/仅好友/部分好友/私密）。支持 24h 实况（Live）动态、自动过期、置顶。', 'public', '{"module":"companion"}'::jsonb)
ON CONFLICT (source, title, chunk_index) DO UPDATE
  SET content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

-- =============================================
-- 执行后下一步：
-- 1. 部署 supabase/functions/spark-rag（参见 index.ts）
-- 2. 运行首次 backfill：对所有 embedding IS NULL 的行调 spark-rag ingest 接口
-- 3. 前端改造后自动走新 RAG 链路
-- 回滚：DROP TABLE spark_knowledge CASCADE; DROP FUNCTION match_spark_knowledge;
-- =============================================
