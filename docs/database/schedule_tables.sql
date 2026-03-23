-- =============================================
-- 智能日程模块 - 数据库表结构
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 日程事件表
CREATE TABLE IF NOT EXISTS schedule_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(200),

  -- 时间
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,

  -- 类型与颜色
  event_type VARCHAR(20) NOT NULL,       -- course/exam/task/life/reminder/holiday
  event_subtype VARCHAR(20),
  color VARCHAR(20),

  -- 重复设置
  recurrence_type VARCHAR(20) DEFAULT 'none', -- none/daily/weekly/biweekly/monthly
  recurrence_days INT[],                      -- 星期几 [1,3,5]
  recurrence_end DATE,

  -- 提醒
  reminders JSONB DEFAULT '[]',

  -- 状态与优先级
  status VARCHAR(20) DEFAULT 'active',        -- active/completed/cancelled
  priority INT DEFAULT 0,                     -- -1低 0普通 1高 2紧急

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_sched_user ON schedule_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sched_time ON schedule_events(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_sched_type ON schedule_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sched_status ON schedule_events(status);

-- 3. RLS 策略
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own events' AND tablename = 'schedule_events') THEN
    CREATE POLICY "Users manage own events" ON schedule_events
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedule_updated_at ON schedule_events;
CREATE TRIGGER trigger_schedule_updated_at
  BEFORE UPDATE ON schedule_events
  FOR EACH ROW EXECUTE FUNCTION update_schedule_updated_at();
