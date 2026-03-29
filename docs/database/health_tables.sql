-- =============================================
-- 健康生活模块 — Supabase 建表 SQL
-- =============================================

-- 1. 每日打卡主表
CREATE TABLE IF NOT EXISTS health_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- 饮食
  meals JSONB DEFAULT '{"breakfast":{"done":false,"tags":[],"note":"","image_url":""},"lunch":{"done":false,"tags":[],"note":"","image_url":""},"dinner":{"done":false,"tags":[],"note":"","image_url":""}}',
  -- 睡眠
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  -- 运动
  exercise_type TEXT,
  exercise_minutes INT DEFAULT 0,
  exercise_intensity TEXT CHECK (exercise_intensity IN ('light','moderate','high')),
  exercise_image_url TEXT,
  -- 社交分享
  is_public BOOLEAN DEFAULT FALSE,
  share_text TEXT,
  share_tags TEXT[] DEFAULT '{}',
  ai_comment TEXT,
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 每人每天只有一条记录
  UNIQUE(user_id, date)
);

-- 2. 连续打卡缓存表
CREATE TABLE IF NOT EXISTS health_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_checkin_date DATE
);

-- 3. 点赞/鼓掌表
CREATE TABLE IF NOT EXISTS health_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES health_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','clap')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checkin_id, user_id, type)
);

-- 4. 评论表
CREATE TABLE IF NOT EXISTS health_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES health_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 索引 ======
CREATE INDEX IF NOT EXISTS idx_health_checkins_user_date ON health_checkins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_checkins_public ON health_checkins(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_health_likes_checkin ON health_likes(checkin_id);
CREATE INDEX IF NOT EXISTS idx_health_comments_checkin ON health_comments(checkin_id, created_at);

-- ====== RLS 策略 ======
ALTER TABLE health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_comments ENABLE ROW LEVEL SECURITY;

-- health_checkins: 自己可 CRUD，公开记录所有登录用户可读
CREATE POLICY "用户可管理自己的打卡" ON health_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "公开打卡所有人可读" ON health_checkins FOR SELECT USING (is_public = TRUE);

-- health_streaks: 仅自己可读写
CREATE POLICY "用户可管理自己的连续打卡" ON health_streaks FOR ALL USING (auth.uid() = user_id);

-- health_likes: 自己可插入/删除，所有人可读
CREATE POLICY "用户可管理自己的点赞" ON health_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "所有人可查看点赞" ON health_likes FOR SELECT USING (TRUE);

-- health_comments: 自己可插入/删除，所有人可读
CREATE POLICY "用户可管理自己的评论" ON health_comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "所有人可查看评论" ON health_comments FOR SELECT USING (TRUE);

-- ====== Storage Bucket ======
-- 在 Supabase Dashboard → Storage 中创建:
-- Bucket名: health-images  (Private)
-- 上传策略: 允许登录用户上传到自己的子文件夹
