-- 初始化校园墙数据表结构 (Supabase PostgreSQL)
-- 执行方法：在 Supabase 控制台的 SQL Editor 中运行此脚本
-- 更新时间：2026-03-28

-- ============================================
-- 1. 创建 posts 表（帖子）
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_seed UUID DEFAULT gen_random_uuid(),
  tags TEXT[],
  media_urls TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 创建 likes 表（帖子点赞）
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- 3. 创建 comments 表（评论系统）
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_seed UUID DEFAULT gen_random_uuid(),
  reply_to UUID REFERENCES comments(id) ON DELETE SET NULL,
  like_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  report_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 创建 comment_likes 表（评论点赞）
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 5. 创建 reports 表（举报系统，支持帖子和评论）
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 每个用户对同一帖子或评论只能举报一次
  UNIQUE(post_id, reporter_id) WHERE comment_id IS NULL,
  UNIQUE(comment_id, reporter_id) WHERE comment_id IS NOT NULL
);

-- ============================================
-- 6. 创建 content_appeals 表（内容申诉）
-- ============================================
CREATE TABLE IF NOT EXISTS content_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 每个用户对同一内容只能申诉一次
  UNIQUE(user_id, post_id) WHERE comment_id IS NULL,
  UNIQUE(user_id, comment_id) WHERE comment_id IS NOT NULL
);

-- ============================================
-- 7. 创建 user_sanctions 表（用户制裁）
-- ============================================
CREATE TABLE IF NOT EXISTS user_sanctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'comment_ban', 'post_ban', 'full_ban'
  reason TEXT,
  related_report_id UUID REFERENCES reports(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_sanctions_user_type ON user_sanctions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_sanctions_expires ON user_sanctions(expires_at);

-- ============================================
-- 8. 开启行级安全策略 (RLS)
-- ============================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. 配置策略 (Policy)
-- ============================================

-- posts
DROP POLICY IF EXISTS "Public can view posts" ON posts;
DROP POLICY IF EXISTS "Users can insert posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Public can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- likes
DROP POLICY IF EXISTS "Public can view likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;
CREATE POLICY "Public can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- comments
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
DROP POLICY IF EXISTS "Authenticated can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);

-- comment_likes
DROP POLICY IF EXISTS "Public can view comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can insert comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete comment_likes" ON comment_likes;
CREATE POLICY "Public can view comment_likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert comment_likes" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comment_likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- reports
DROP POLICY IF EXISTS "Authenticated can insert reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Authenticated can insert reports" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- content_appeals
DROP POLICY IF EXISTS "Users can insert appeals" ON content_appeals;
DROP POLICY IF EXISTS "Users can view own appeals" ON content_appeals;
CREATE POLICY "Users can insert appeals" ON content_appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own appeals" ON content_appeals FOR SELECT USING (auth.uid() = user_id);

-- user_sanctions (用户只能查看自己的制裁记录)
DROP POLICY IF EXISTS "Users can view own sanctions" ON user_sanctions;
CREATE POLICY "Users can view own sanctions" ON user_sanctions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 10. 触发器函数
-- ============================================

-- 评论计数触发器（自动维护 posts.comment_count 字段）
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_count ON comments;
CREATE TRIGGER trigger_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- 评论点赞计数触发器（自动维护 comments.like_count 字段）
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_like_count ON comment_likes;
CREATE TRIGGER trigger_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- 举报计数触发器（自动维护 comments.report_count 并在达到阈值时隐藏）
CREATE OR REPLACE FUNCTION update_comment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE comments 
    SET report_count = report_count + 1,
        is_hidden = CASE WHEN report_count + 1 >= 3 THEN TRUE ELSE is_hidden END
    WHERE id = NEW.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_report_count ON reports;
CREATE TRIGGER trigger_comment_report_count
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION update_comment_report_count();

-- ============================================
-- 迁移脚本（如果表已存在，执行以下命令）
-- ============================================
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES comments(id) ON DELETE SET NULL;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_count INT DEFAULT 0;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
