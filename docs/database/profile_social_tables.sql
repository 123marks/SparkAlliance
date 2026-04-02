-- ============================================================
-- 个人主页社交系统 — Supabase 数据表
-- 基于《个人主页设计分析与改进方案》
-- ============================================================

-- 关注关系表
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id) -- 不能关注自己
);

-- 用户收藏表（统一管理动态、商品、资源等收藏）
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'product', 'resource', 'mentor')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_target ON user_favorites(target_type, target_id);

-- 扩展 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS products_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS likes_received_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';

-- ============================================================
-- RLS 策略
-- ============================================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- follows
CREATE POLICY "任何人可查看关注关系" ON follows FOR SELECT USING (true);
CREATE POLICY "登录用户可关注他人" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "用户可取消自己的关注" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- favorites
CREATE POLICY "任何人可查看收藏" ON user_favorites FOR SELECT USING (true);
CREATE POLICY "登录用户可收藏" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可取消收藏" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 关注计数触发器
-- ============================================================

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_follow_counts ON follows;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();
