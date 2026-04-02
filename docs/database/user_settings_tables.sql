-- =============================================
-- 用户设置表 — user_settings
-- 存储隐私/通知/功能/推荐/辅助功能/教育信息
-- 遵循幂等原则，可重复执行
-- =============================================

-- 创建表
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 教育信息（平铺字段，便于查询和索引）
  university TEXT,
  department TEXT,
  major TEXT,
  grade TEXT,
  student_id TEXT,
  enrollment_year INT,

  -- 隐私设置 (JSONB)
  privacy JSONB DEFAULT '{
    "profileVisibility": "public",
    "postVisibility": "public",
    "showOnlineStatus": true,
    "showLastActive": true,
    "showLocation": false,
    "showUniversity": true,
    "allowSearch": true,
    "aiDataUsage": true,
    "personalizedRecommendation": true,
    "anonymousAnalytics": true
  }'::jsonb,

  -- 通知设置 (JSONB)
  notifications JSONB DEFAULT '{
    "message": true,
    "comment": true,
    "like": true,
    "follow": true,
    "system": true,
    "schedule": true,
    "doNotDisturb": false,
    "doNotDisturbStart": null,
    "doNotDisturbEnd": null,
    "emailDigest": "daily"
  }'::jsonb,

  -- 功能设置 (JSONB)
  features JSONB DEFAULT '{
    "ai": {
      "defaultModel": "gpt-3.5-turbo",
      "contextLength": "medium",
      "temperature": 0.7,
      "streamOutput": true
    },
    "schedule": {
      "defaultView": "week",
      "timeFormat": "24h",
      "weekStart": 1,
      "defaultReminder": 15
    }
  }'::jsonb,

  -- 推荐设置 (JSONB)
  recommendation JSONB DEFAULT '{
    "tags": [],
    "sources": {
      "sameUniversity": true,
      "sameMajor": false,
      "following": true
    },
    "diversity": 0.5
  }'::jsonb,

  -- 辅助功能 (JSONB)
  accessibility JSONB DEFAULT '{
    "highContrast": false,
    "reduceMotion": false,
    "keyboardNavigation": false
  }'::jsonb,

  -- Schema 版本管理
  schema_version INT DEFAULT 1,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 一个用户只有一条设置记录
  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settings_updated ON user_settings;
CREATE TRIGGER trigger_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 用户只能读自己的设置
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能更新自己的设置
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用户可以创建自己的设置（首次）
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的设置（注销时）
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);
