-- 初始化校园墙数据表结构 (Supabase PostgreSQL)
-- 执行方法：在 Supabase 控制台的 SQL Editor 中运行此脚本

-- 1. 创建 posts 表
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

-- 2. 创建 likes 表
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 3. 创建 comments 表（评论系统）
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_seed UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 reports 表（严格举报系统）
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 5. 开启行级安全策略 (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 6. 配置策略 (Policy)

-- posts
CREATE POLICY "Public can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- likes
CREATE POLICY "Public can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- comments
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);

-- reports
CREATE POLICY "Authenticated can insert reports" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- 7. 评论计数触发器（自动维护 comment_count 字段）
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
-- 5. 创建 comment_likes 表（评论点赞）
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view comment_likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert comment_likes" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comment_likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ===== 如果表已存在，执行以下迁移 =====
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INT DEFAULT 0;
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS anonymous_seed UUID DEFAULT gen_random_uuid();
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES comments(id) ON DELETE SET NULL;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS anonymous_seed UUID DEFAULT gen_random_uuid();
