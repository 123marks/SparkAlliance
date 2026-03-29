-- =============================================
-- 健康生活模块 V2 迁移 — 饮水追踪 + 健康挑战
-- =============================================

-- 1. 为 health_checkins 添加 water_intake 列
ALTER TABLE health_checkins
  ADD COLUMN IF NOT EXISTS water_intake INT DEFAULT 0;

-- 添加约束：饮水量 0-5000ml
ALTER TABLE health_checkins
  ADD CONSTRAINT chk_water_intake CHECK (water_intake >= 0 AND water_intake <= 5000);

-- 2. 健康挑战表
CREATE TABLE IF NOT EXISTS health_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('sleep', 'exercise', 'water', 'meal', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value INT DEFAULT 0,
  current_value INT DEFAULT 0,
  target_days INT NOT NULL CHECK (target_days > 0),
  completed_days INT DEFAULT 0 CHECK (completed_days >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  reward_xp INT DEFAULT 0 CHECK (reward_xp >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 同一用户同一类型同时只能有一个进行中的挑战
  CONSTRAINT uniq_active_challenge UNIQUE (user_id, challenge_type, status)
    -- 注意：此 UNIQUE 约束仅在 status = 'active' 时有意义
    -- 如果需要更精确的控制，可使用 partial unique index（见下方）
);

-- 移除上面的简单约束，改用 partial unique index 更精确
-- 保证同一用户同一类型最多只有一个 active 挑战
ALTER TABLE health_challenges DROP CONSTRAINT IF EXISTS uniq_active_challenge;
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_challenges_active_unique
  ON health_challenges(user_id, challenge_type)
  WHERE status = 'active';

-- 3. 健康成就记录表（与 planner 模块类似）
CREATE TABLE IF NOT EXISTS health_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

-- 4. 健康经验值/等级表
CREATE TABLE IF NOT EXISTS health_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  challenges_completed INT DEFAULT 0,
  total_water_ml BIGINT DEFAULT 0,
  total_exercise_min INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 索引 ======
CREATE INDEX IF NOT EXISTS idx_health_challenges_user
  ON health_challenges(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_challenges_active
  ON health_challenges(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_health_achievements_user
  ON health_achievements(user_id);

-- ====== RLS 策略 ======
ALTER TABLE health_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_stats ENABLE ROW LEVEL SECURITY;

-- health_challenges: 仅自己可操作
CREATE POLICY "用户可管理自己的挑战"
  ON health_challenges FOR ALL
  USING (auth.uid() = user_id);

-- health_achievements: 自己可读写，他人可读（用于展示徽章）
CREATE POLICY "用户可管理自己的成就"
  ON health_achievements FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "所有人可查看成就"
  ON health_achievements FOR SELECT
  USING (TRUE);

-- health_stats: 自己可读写，他人可读
CREATE POLICY "用户可管理自己的健康统计"
  ON health_stats FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "所有人可查看健康统计"
  ON health_stats FOR SELECT
  USING (TRUE);
