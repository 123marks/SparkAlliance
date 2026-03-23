-- =============================================
-- 星火校园 增量迁移 SQL v2
-- 在 Supabase SQL Editor 中一键执行
-- 本脚本使用 IF NOT EXISTS，已有的不会重建
-- =============================================

-- ============ 1. posts 表字段补全 ============
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS anonymous_seed UUID DEFAULT gen_random_uuid();
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '';

-- 兼容 supabase-schema.sql 字段名
-- 如果你的 posts 表用的是 likes_count/comments_count 而不是 comment_count：
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0;

-- ============ 2. comments 表补全 ============
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS anonymous_seed UUID DEFAULT gen_random_uuid();
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES comments(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;

-- ============ 3. reports 表（严格举报系统）============
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- reports RLS（用 DO 块防止策略已存在报错）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can insert reports' AND tablename = 'reports') THEN
    CREATE POLICY "Authenticated can insert reports" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own reports' AND tablename = 'reports') THEN
    CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
END $$;

-- ============ 4. comment_likes 表（评论点赞）============
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view comment_likes' AND tablename = 'comment_likes') THEN
    CREATE POLICY "Public can view comment_likes" ON comment_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert comment_likes' AND tablename = 'comment_likes') THEN
    CREATE POLICY "Users can insert comment_likes" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete comment_likes' AND tablename = 'comment_likes') THEN
    CREATE POLICY "Users can delete comment_likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============ 5. 评论计数触发器 ============
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    -- 兼容 comments_count 字段
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_count ON comments;
CREATE TRIGGER trigger_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ============ 6. RLS 补全（防已存在报错）============
DO $$
BEGIN
  -- posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own posts' AND tablename = 'posts') THEN
    CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);
  END IF;

  -- comments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read comments' AND tablename = 'comments') THEN
    CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can insert comments' AND tablename = 'comments') THEN
    CREATE POLICY "Authenticated can insert comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own comments' AND tablename = 'comments') THEN
    CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

-- ============ 7. Realtime 订阅开启 ============
-- 允许前端监听 comments 表变更
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;

-- ============ 完成 ============
-- 执行成功后刷新浏览器即可看到所有新功能生效
