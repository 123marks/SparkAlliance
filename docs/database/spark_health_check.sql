-- =============================================
-- 星火联盟 · 数据库闭环健康体检脚本
-- ---------------------------------------------
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行，
-- 结果会清晰告诉你：
--   1. 每个必需表是否存在
--   2. 每张表当前记录数
--   3. RLS 策略是否启用
--   4. 关键索引是否就位
--   5. 星火助手 v9 新 key 是否已有用户数据
-- =============================================

-- ====== 1. 核心表存在性检查 ======
WITH required_tables(name, category) AS (
  VALUES
    -- 核心
    ('spark_profiles', '核心'),
    ('spark_user_state', '核心'),
    ('spark_knowledge', 'RAG'),
    -- 星火寄语
    ('spark_messages', '星火寄语'),
    ('spark_message_comments', '星火寄语'),
    ('spark_message_likes', '星火寄语'),
    ('spark_direct_messages', '星火寄语'),
    -- 伴侣
    ('companion_moments', '伴侣'),
    -- 规划
    ('planner_goals', '规划'),
    ('planner_tasks', '规划'),
    -- 日程
    ('schedule_events', '日程'),
    -- 其他
    ('spark_resources', '学习资源'),
    ('news_items', '资讯'),
    ('campus_wall_posts', '校园墙'),
    ('shop_items', '购物'),
    ('health_records', '健康'),
    ('tarot_readings', '塔罗')
),
existing AS (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
)
SELECT
  r.category            AS "模块",
  r.name                AS "表名",
  CASE WHEN e.table_name IS NOT NULL THEN '✅ 存在' ELSE '❌ 缺失' END AS "状态"
FROM required_tables r
LEFT JOIN existing e ON e.table_name = r.name
ORDER BY r.category, r.name;

-- ====== 2. 记录数统计（仅对存在的表）======
-- 不使用 DO 块，直接跑已知表
SELECT 'spark_profiles' AS "表名", (SELECT COUNT(*) FROM spark_profiles)::TEXT AS "记录数"
UNION ALL SELECT 'spark_user_state', (SELECT COUNT(*) FROM spark_user_state)::TEXT
UNION ALL SELECT 'spark_knowledge', (SELECT COUNT(*) FROM spark_knowledge)::TEXT;
-- 如果上面报错 relation does not exist，说明对应表未创建，执行对应 SQL 文件即可。

-- ====== 3. RLS 启用状态 ======
SELECT
  c.relname              AS "表名",
  CASE WHEN c.relrowsecurity THEN '🛡 启用' ELSE '⚠️ 关闭' END AS "RLS",
  COUNT(p.policyname)    AS "策略数"
FROM pg_class c
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'r'
  AND c.relname LIKE 'spark_%'
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ====== 4. 关键索引检查 ======
SELECT
  indexname  AS "索引名",
  tablename  AS "表名"
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'spark_%' OR tablename LIKE 'companion_%' OR tablename LIKE 'planner_%')
ORDER BY tablename, indexname;

-- ====== 5. 星火助手 v9 云同步数据审计 ======
-- 哪些用户在使用新的收藏/反应/缓存 key？
SELECT
  state_key                            AS "同步键",
  COUNT(*)                             AS "使用用户数",
  pg_size_pretty(SUM(size_bytes)::bigint) AS "总大小",
  MAX(updated_at)                      AS "最近更新"
FROM spark_user_state
WHERE state_key IN (
  'spark_conversations_v2',   -- 会话历史（v9 修复的 key）
  'spark_ai_favorites_v1',    -- 收藏消息
  'spark_ai_reactions_v1',    -- 👍/👎 反应
  'spark_ai_emoji_recent_v1'  -- 最近 emoji
)
GROUP BY state_key
ORDER BY state_key;

-- ====== 6. 检测是否有"孤儿 state_key"（本地已弃用但云端还留着）======
-- 之前版本的 spark_ai_conversations（没对应 localStorage key，应清理）
SELECT
  state_key  AS "孤儿键",
  COUNT(*)   AS "行数"
FROM spark_user_state
WHERE state_key IN (
  'spark_ai_conversations'  -- 旧 bug：已废弃
)
GROUP BY state_key;

-- 如要清理：
-- DELETE FROM spark_user_state WHERE state_key = 'spark_ai_conversations';

-- ====== 7. pgvector 扩展是否已启用（RAG 真向量化前置条件）======
SELECT
  extname         AS "扩展名",
  extversion      AS "版本"
FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp', 'pgcrypto');

-- ====== 8. spark_knowledge RAG 状态 ======
-- 若表不存在此查询会报错；看不到结果说明需要执行 rag_phase1.sql
SELECT
  source                 AS "来源分类",
  COUNT(*)               AS "片段数",
  pg_size_pretty(SUM(octet_length(content)))::TEXT AS "总大小"
FROM spark_knowledge
GROUP BY source
ORDER BY COUNT(*) DESC;

-- =============================================
-- 执行完后的行动建议：
-- 1) 任何行显示 "❌ 缺失" → 在 docs/database/ 找对应 SQL 文件并执行
-- 2) 任何 RLS "⚠️ 关闭" → 对应 SQL 里应该有 ENABLE ROW LEVEL SECURITY，重新执行
-- 3) 孤儿 state_key 有行 → 跑上面的 DELETE 清理（v9 已在应用层无伤）
-- 4) pgvector 扩展未启用 → 在 Database → Extensions 启用 vector，再执行 rag_phase1.sql
-- =============================================
