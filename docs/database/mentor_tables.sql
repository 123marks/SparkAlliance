-- =============================================
-- 星火学长分享模块 (Mentors) 数据库脚本
-- 共 5 张表 + RLS + 索引 + 触发器
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- ====== 1. mentor_profiles — 学长认证档案 ======
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 基本信息
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  bio TEXT,                          -- 个人简介
  university VARCHAR(100),            -- 院校
  major VARCHAR(100),                 -- 专业
  grade VARCHAR(20),                  -- 年级（大一/大二/大三/大四/研一/研二...）
  graduation_year SMALLINT,           -- 预计毕业年份
  -- 认证信息
  certification_level VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (certification_level IN ('pending', 'normal', 'excellent', 'gold')),
  certification_proof JSONB DEFAULT '[]'::jsonb,  -- 认证材料URL数组
  certified_at TIMESTAMPTZ,
  -- 擅长领域
  expertise_tags TEXT[] DEFAULT '{}',  -- 如 ['高等数学','考研英语','Python','简历优化']
  expertise_areas TEXT[] DEFAULT '{}', -- 大分类 ['academic','life','career','postgrad']
  -- 统计
  article_count INT DEFAULT 0,
  consultation_count INT DEFAULT 0,
  total_likes INT DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0.0,
  contribution_points INT DEFAULT 0,  -- 贡献积分
  -- 设置
  is_accepting_consult BOOLEAN DEFAULT TRUE,  -- 是否接受咨询
  consult_price JSONB DEFAULT '{"text": 0, "voice": 0, "video": 0}'::jsonb,
  -- 时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_user ON mentor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_level ON mentor_profiles(certification_level);
CREATE INDEX IF NOT EXISTS idx_mp_university ON mentor_profiles(university);
CREATE INDEX IF NOT EXISTS idx_mp_expertise ON mentor_profiles USING GIN(expertise_tags);
CREATE INDEX IF NOT EXISTS idx_mp_points ON mentor_profiles(contribution_points DESC);

-- RLS
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mp_sel ON mentor_profiles;
DROP POLICY IF EXISTS mp_ins ON mentor_profiles;
DROP POLICY IF EXISTS mp_upd ON mentor_profiles;
DROP POLICY IF EXISTS mp_del ON mentor_profiles;
CREATE POLICY mp_sel ON mentor_profiles FOR SELECT USING (true);  -- 所有人可查看
CREATE POLICY mp_ins ON mentor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mp_upd ON mentor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY mp_del ON mentor_profiles FOR DELETE USING (auth.uid() = user_id);


-- ====== 2. mentor_articles — 经验文章 ======
CREATE TABLE IF NOT EXISTS mentor_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 内容
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,              -- 正文（Markdown 格式）
  summary TEXT,                       -- AI 生成摘要
  cover_url TEXT,                     -- 封面图URL
  media_urls TEXT[] DEFAULT '{}',     -- 附件图片/视频URL
  -- 分类
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('academic', 'life', 'career', 'postgrad')),
  tags TEXT[] DEFAULT '{}',           -- 标签如 ['高等数学','期末复习']
  -- 统计
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  bookmark_count INT DEFAULT 0,
  -- 状态
  status VARCHAR(20) DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived', 'reported')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,  -- 精选推荐
  -- 时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_author ON mentor_articles(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ma_category ON mentor_articles(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ma_tags ON mentor_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ma_popular ON mentor_articles(like_count DESC, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_ma_featured ON mentor_articles(is_featured, created_at DESC);

-- RLS
ALTER TABLE mentor_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ma_sel ON mentor_articles;
DROP POLICY IF EXISTS ma_ins ON mentor_articles;
DROP POLICY IF EXISTS ma_upd ON mentor_articles;
DROP POLICY IF EXISTS ma_del ON mentor_articles;
CREATE POLICY ma_sel ON mentor_articles FOR SELECT USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY ma_ins ON mentor_articles FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY ma_upd ON mentor_articles FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY ma_del ON mentor_articles FOR DELETE USING (auth.uid() = author_id);


-- ====== 3. mentor_consultations — 一对一咨询工单 ======
CREATE TABLE IF NOT EXISTS mentor_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 咨询信息
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('academic', 'life', 'career', 'postgrad')),
  consult_type VARCHAR(20) DEFAULT 'text'
    CHECK (consult_type IN ('text', 'voice', 'video', 'offline')),
  -- 状态流转：pending → matched → accepted → in_progress → completed → reviewed
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'accepted', 'in_progress', 'completed', 'reviewed', 'cancelled')),
  -- AI 匹配
  ai_match_score NUMERIC(4,1),        -- AI 匹配度 0-100
  ai_match_reason TEXT,               -- AI 匹配理由
  -- 预约时间
  scheduled_at TIMESTAMPTZ,
  schedule_event_id UUID,             -- 关联日程 ID（打通日程模块）
  -- 评价
  rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  review_text TEXT,
  -- 时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mc_student ON mentor_consultations(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_mentor ON mentor_consultations(mentor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_status ON mentor_consultations(status);

-- RLS（学生和学长都能看自己的咨询）
ALTER TABLE mentor_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mc_sel ON mentor_consultations;
DROP POLICY IF EXISTS mc_ins ON mentor_consultations;
DROP POLICY IF EXISTS mc_upd ON mentor_consultations;
CREATE POLICY mc_sel ON mentor_consultations FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);
CREATE POLICY mc_ins ON mentor_consultations FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY mc_upd ON mentor_consultations FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);


-- ====== 4. mentor_comments — 文章评论 ======
CREATE TABLE IF NOT EXISTS mentor_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES mentor_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES mentor_comments(id) ON DELETE CASCADE,  -- 楼中楼
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcom_article ON mentor_comments(article_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_mcom_user ON mentor_comments(user_id);

-- RLS
ALTER TABLE mentor_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcom_sel ON mentor_comments;
DROP POLICY IF EXISTS mcom_ins ON mentor_comments;
DROP POLICY IF EXISTS mcom_del ON mentor_comments;
CREATE POLICY mcom_sel ON mentor_comments FOR SELECT USING (true);  -- 公开可见
CREATE POLICY mcom_ins ON mentor_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mcom_del ON mentor_comments FOR DELETE USING (auth.uid() = user_id);


-- ====== 5. mentor_bookmarks — 收藏 ======
CREATE TABLE IF NOT EXISTS mentor_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES mentor_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_mbk_user ON mentor_bookmarks(user_id, created_at DESC);

-- RLS
ALTER TABLE mentor_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mbk_sel ON mentor_bookmarks;
DROP POLICY IF EXISTS mbk_ins ON mentor_bookmarks;
DROP POLICY IF EXISTS mbk_del ON mentor_bookmarks;
CREATE POLICY mbk_sel ON mentor_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY mbk_ins ON mentor_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mbk_del ON mentor_bookmarks FOR DELETE USING (auth.uid() = user_id);


-- ====== 触发器：文章统计自动更新 ======

-- 评论数自动更新
CREATE OR REPLACE FUNCTION mentor_update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mentor_articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mentor_articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_comment_count ON mentor_comments;
CREATE TRIGGER trg_mentor_comment_count
  AFTER INSERT OR DELETE ON mentor_comments
  FOR EACH ROW EXECUTE FUNCTION mentor_update_comment_count();

-- 收藏数自动更新
CREATE OR REPLACE FUNCTION mentor_update_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mentor_articles SET bookmark_count = bookmark_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mentor_articles SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_bookmark_count ON mentor_bookmarks;
CREATE TRIGGER trg_mentor_bookmark_count
  AFTER INSERT OR DELETE ON mentor_bookmarks
  FOR EACH ROW EXECUTE FUNCTION mentor_update_bookmark_count();

-- 学长文章数/总赞/咨询数 统计更新
CREATE OR REPLACE FUNCTION mentor_refresh_profile_stats()
RETURNS TRIGGER AS $$
DECLARE target_user UUID;
BEGIN
  IF TG_TABLE_NAME = 'mentor_articles' THEN
    target_user := COALESCE(NEW.author_id, OLD.author_id);
    UPDATE mentor_profiles SET
      article_count = (SELECT COUNT(*) FROM mentor_articles WHERE author_id = target_user AND status = 'published'),
      total_likes = (SELECT COALESCE(SUM(like_count), 0) FROM mentor_articles WHERE author_id = target_user)
    WHERE user_id = target_user;
  ELSIF TG_TABLE_NAME = 'mentor_consultations' THEN
    target_user := COALESCE(NEW.mentor_id, OLD.mentor_id);
    IF target_user IS NOT NULL THEN
      UPDATE mentor_profiles SET
        consultation_count = (SELECT COUNT(*) FROM mentor_consultations WHERE mentor_id = target_user AND status IN ('completed', 'reviewed')),
        avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM mentor_consultations WHERE mentor_id = target_user AND rating IS NOT NULL)
      WHERE user_id = target_user;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_stats ON mentor_articles;
CREATE TRIGGER trg_article_stats
  AFTER INSERT OR UPDATE OR DELETE ON mentor_articles
  FOR EACH ROW EXECUTE FUNCTION mentor_refresh_profile_stats();

DROP TRIGGER IF EXISTS trg_consult_stats ON mentor_consultations;
CREATE TRIGGER trg_consult_stats
  AFTER INSERT OR UPDATE OR DELETE ON mentor_consultations
  FOR EACH ROW EXECUTE FUNCTION mentor_refresh_profile_stats();

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
