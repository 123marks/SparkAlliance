-- =============================================
-- 星火规划模块 V3 - 成就系统
-- 增加用户粘性的成就徽章和等级系统
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1) 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_tasks_completed INT NOT NULL DEFAULT 0 CHECK (total_tasks_completed >= 0),
  total_goals_completed INT NOT NULL DEFAULT 0 CHECK (total_goals_completed >= 0),
  current_daily_streak INT NOT NULL DEFAULT 0 CHECK (current_daily_streak >= 0),
  longest_daily_streak INT NOT NULL DEFAULT 0 CHECK (longest_daily_streak >= 0),
  longest_habit_streak INT NOT NULL DEFAULT 0 CHECK (longest_habit_streak >= 0),
  total_xp INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) 用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(64) NOT NULL,
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id, unlocked_at DESC);

-- 3) updated_at 触发器
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_user_stats_updated ON user_stats;
  CREATE TRIGGER trg_user_stats_updated BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();
END $$;

-- 4) RLS 策略
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- user_stats
DROP POLICY IF EXISTS us_sel ON user_stats;
DROP POLICY IF EXISTS us_ins ON user_stats;
DROP POLICY IF EXISTS us_upd ON user_stats;
DROP POLICY IF EXISTS us_del ON user_stats;
CREATE POLICY us_sel ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY us_ins ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY us_upd ON user_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY us_del ON user_stats FOR DELETE USING (auth.uid() = user_id);

-- user_achievements
DROP POLICY IF EXISTS ua_sel ON user_achievements;
DROP POLICY IF EXISTS ua_ins ON user_achievements;
DROP POLICY IF EXISTS ua_upd ON user_achievements;
DROP POLICY IF EXISTS ua_del ON user_achievements;
CREATE POLICY ua_sel ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ua_ins ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ua_upd ON user_achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ua_del ON user_achievements FOR DELETE USING (auth.uid() = user_id);

-- 5) 自动初始化用户统计（新用户注册时）
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 注意：此触发器需要在 auth.users 表上创建
-- 如果没有权限，可以在前端首次访问时初始化

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
