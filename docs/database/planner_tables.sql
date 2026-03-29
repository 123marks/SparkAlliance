-- =============================================
-- 星火规划模块 - 数据库表结构
-- 在 Supabase SQL Editor 中执行
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1) goals：目标表
-- =============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  goal_type VARCHAR(32) NOT NULL CHECK (goal_type IN ('academic','skill','habit','fitness','career','custom')),
  deadline DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  total_progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_progress >= 0 AND total_progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);

-- =============================================
-- 2) goal_milestones：里程碑表
-- =============================================
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','missed')),
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones(goal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON goal_milestones(user_id, status);

-- =============================================
-- 3) planner_tasks：规划任务表
-- =============================================
CREATE TABLE IF NOT EXISTS planner_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES goal_milestones(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  estimated_minutes INT CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 1440)),
  difficulty SMALLINT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','template')),
  sort_order INT NOT NULL DEFAULT 0,
  schedule_event_id UUID REFERENCES schedule_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 完成状态一致性约束
  CHECK (
    (is_completed = FALSE AND completed_at IS NULL) OR
    (is_completed = TRUE AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ptasks_user_goal ON planner_tasks(user_id, goal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ptasks_user_due ON planner_tasks(user_id, due_date, is_completed);
CREATE INDEX IF NOT EXISTS idx_ptasks_milestone ON planner_tasks(milestone_id);

-- =============================================
-- 4) habits：习惯表
-- =============================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily','weekly')),
  target_days SMALLINT NOT NULL DEFAULT 7 CHECK (target_days BETWEEN 1 AND 7),
  current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, status);

-- =============================================
-- 5) habit_logs：习惯打卡日志
-- =============================================
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_hlogs_user_date ON habit_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_hlogs_habit_date ON habit_logs(habit_id, log_date DESC);

-- =============================================
-- 6) 通用 updated_at 触发器
-- =============================================
CREATE OR REPLACE FUNCTION planner_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_goals_updated ON goals;
  CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

  DROP TRIGGER IF EXISTS trg_milestones_updated ON goal_milestones;
  CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON goal_milestones
  FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

  DROP TRIGGER IF EXISTS trg_ptasks_updated ON planner_tasks;
  CREATE TRIGGER trg_ptasks_updated BEFORE UPDATE ON planner_tasks
  FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

  DROP TRIGGER IF EXISTS trg_habits_updated ON habits;
  CREATE TRIGGER trg_habits_updated BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();
END $$;

-- =============================================
-- 7) 任务完成 → 自动回写目标进度
-- =============================================
CREATE OR REPLACE FUNCTION planner_refresh_goal_progress(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  total_count INT;
  done_count INT;
  pct NUMERIC(5,2);
BEGIN
  SELECT COUNT(*) INTO total_count FROM planner_tasks WHERE goal_id = p_goal_id;
  SELECT COUNT(*) INTO done_count FROM planner_tasks WHERE goal_id = p_goal_id AND is_completed = TRUE;

  IF total_count = 0 THEN pct := 0;
  ELSE pct := ROUND((done_count::NUMERIC / total_count::NUMERIC) * 100, 2);
  END IF;

  UPDATE goals
  SET total_progress = pct,
      status = CASE
        WHEN pct >= 100 THEN 'completed'
        WHEN status = 'completed' AND pct < 100 THEN 'active'
        ELSE status
      END
  WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION planner_on_task_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM planner_refresh_goal_progress(OLD.goal_id);
  ELSE
    PERFORM planner_refresh_goal_progress(NEW.goal_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ptask_progress ON planner_tasks;
CREATE TRIGGER trg_ptask_progress
AFTER INSERT OR UPDATE OF is_completed OR DELETE ON planner_tasks
FOR EACH ROW EXECUTE FUNCTION planner_on_task_changed();

-- =============================================
-- 8) 子表 user_id 自动同步（防止客户端伪造）
-- =============================================
CREATE OR REPLACE FUNCTION planner_sync_task_user_id()
RETURNS TRIGGER AS $$
DECLARE owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM goals WHERE id = NEW.goal_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'goal_id % not found', NEW.goal_id; END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ptask_sync_uid ON planner_tasks;
CREATE TRIGGER trg_ptask_sync_uid BEFORE INSERT OR UPDATE OF goal_id ON planner_tasks
FOR EACH ROW EXECUTE FUNCTION planner_sync_task_user_id();

CREATE OR REPLACE FUNCTION planner_sync_milestone_user_id()
RETURNS TRIGGER AS $$
DECLARE owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM goals WHERE id = NEW.goal_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'goal_id % not found', NEW.goal_id; END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_milestone_sync_uid ON goal_milestones;
CREATE TRIGGER trg_milestone_sync_uid BEFORE INSERT OR UPDATE OF goal_id ON goal_milestones
FOR EACH ROW EXECUTE FUNCTION planner_sync_milestone_user_id();

CREATE OR REPLACE FUNCTION planner_sync_hlog_user_id()
RETURNS TRIGGER AS $$
DECLARE owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM habits WHERE id = NEW.habit_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'habit_id % not found', NEW.habit_id; END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hlog_sync_uid ON habit_logs;
CREATE TRIGGER trg_hlog_sync_uid BEFORE INSERT OR UPDATE OF habit_id ON habit_logs
FOR EACH ROW EXECUTE FUNCTION planner_sync_hlog_user_id();

-- =============================================
-- 9) RLS 策略
-- =============================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- goals
CREATE POLICY goals_sel ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goals_ins ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_upd ON goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_del ON goals FOR DELETE USING (auth.uid() = user_id);

-- goal_milestones
CREATE POLICY ms_sel ON goal_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ms_ins ON goal_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ms_upd ON goal_milestones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ms_del ON goal_milestones FOR DELETE USING (auth.uid() = user_id);

-- planner_tasks
CREATE POLICY pt_sel ON planner_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pt_ins ON planner_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pt_upd ON planner_tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY pt_del ON planner_tasks FOR DELETE USING (auth.uid() = user_id);

-- habits
CREATE POLICY hb_sel ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY hb_ins ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY hb_upd ON habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY hb_del ON habits FOR DELETE USING (auth.uid() = user_id);

-- habit_logs
CREATE POLICY hl_sel ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY hl_ins ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY hl_upd ON habit_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY hl_del ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 完成！在 Supabase SQL Editor 中执行本文件
-- =============================================
