# Copilot Planner Output — 星火规划模块深度方案

我基于你仓库中的现有实现风格完成了本方案对齐，重点对齐了以下事实：

- 前端当前栈与风格：Vue 3 + TS + Vite，暗黑玻璃拟态（`frontend/src/style.css`、`Schedule.vue`）。
- 路由已预留：`/app/planner`（当前是 Placeholder，可直接替换）。
- Supabase 现有约定：优先 `uuid_generate_v4()`、用户归属外键 `auth.users(id)`、RLS 按 `auth.uid() = user_id`。
- 已有 AI Edge Function 模式：`supabase/functions/ai-schedule-import/index.ts`（CORS、鉴权、配额、AI 调用、JSON 解析）。
- 已有配额表存在两种约定：`docs/database/ai_import_tables.sql`（`usage_date + usage_count`）和 `MODULE-SCHEDULE.md`（`feature + used_at + call_count`）。我提供了兼容改造 SQL，保证可落地。

---

## 完整数据库SQL（所有表 + RLS + 索引建议）

```sql
-- =============================================
-- Spark Planner Module SQL
-- 目标：goals / tasks / habits / habit_logs / achievements / user_achievements
-- 可选扩展：goal_milestones / user_stats / user_xp_logs
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 0) 兼容改造：api_usage_logs 支持 feature 维度
-- 说明：
-- - 现有 ai_import_tables.sql 是 (user_id, usage_date) 唯一
-- - planner 需要 feature='goal_planning' 且每日限制 3 次
-- - 本改造保留 usage_date/usage_count 命名，最小化对现有函数影响
-- =============================================

ALTER TABLE IF EXISTS api_usage_logs
  ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_schedule_import';

ALTER TABLE IF EXISTS api_usage_logs
  ALTER COLUMN daily_limit SET DEFAULT 5;

-- 移除旧唯一约束（若存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_usage_logs_user_id_usage_date_key'
  ) THEN
    ALTER TABLE api_usage_logs DROP CONSTRAINT api_usage_logs_user_id_usage_date_key;
  END IF;
END $$;

-- 新唯一约束：同用户、同功能、同一天一条记录
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_usage_logs_user_feature_usage_date_key'
  ) THEN
    ALTER TABLE api_usage_logs
      ADD CONSTRAINT api_usage_logs_user_feature_usage_date_key
      UNIQUE (user_id, feature, usage_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_feature_date
  ON api_usage_logs(user_id, feature, usage_date DESC);

-- =============================================
-- 1) goals：目标表
-- =============================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  goal_type VARCHAR(32) NOT NULL CHECK (goal_type IN ('academic', 'skill', 'habit', 'fitness', 'career', 'custom')),
  deadline DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  total_progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_progress >= 0 AND total_progress <= 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_status_deadline
  ON goals(user_id, status, deadline);

CREATE INDEX IF NOT EXISTS idx_goals_user_created
  ON goals(user_id, created_at DESC);

-- =============================================
-- 2) goal_milestones：里程碑表（建议新增）
-- 理由：
-- - AI 输出天然包含里程碑，直接存表可视化和回顾更稳定
-- - 便于“星空领域”节点连线和阶段奖励结算
-- =============================================

CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_goal_date
  ON goal_milestones(user_id, goal_id, target_date);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_status
  ON goal_milestones(user_id, status, target_date);

-- =============================================
-- 3) tasks：任务表
-- =============================================

CREATE TABLE IF NOT EXISTS tasks (
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
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'template', 'sync')),
  sort_order INT NOT NULL DEFAULT 0,
  schedule_event_id UUID REFERENCES schedule_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (is_completed = FALSE AND completed_at IS NULL)
    OR
    (is_completed = TRUE AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_goal
  ON tasks(user_id, goal_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_due
  ON tasks(user_id, due_date, is_completed);

CREATE INDEX IF NOT EXISTS idx_tasks_milestone
  ON tasks(milestone_id);

CREATE INDEX IF NOT EXISTS idx_tasks_schedule_event
  ON tasks(schedule_event_id);

-- =============================================
-- 4) habits：习惯表
-- =============================================

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
  target_days SMALLINT NOT NULL CHECK (target_days BETWEEN 1 AND 7),
  current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_status
  ON habits(user_id, status, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON habit_logs(user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
  ON habit_logs(habit_id, log_date DESC);

-- =============================================
-- 6) achievements：成就模板（系统字典表）
-- 说明：这是全局配置，不属于“用户私有数据”
-- - 用户可读（看成就列表）
-- - 写入建议仅服务端（service_role）执行
-- =============================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(120) NOT NULL,
  unlock_condition_type VARCHAR(32) NOT NULL CHECK (unlock_condition_type IN ('task_count', 'goal_completed', 'streak', 'xp', 'milestone', 'custom')),
  unlock_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_active_type
  ON achievements(is_active, unlock_condition_type);

-- =============================================
-- 7) user_achievements：用户解锁记录
-- =============================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_unlocked
  ON user_achievements(user_id, unlocked_at DESC);

-- =============================================
-- 8) user_stats：游戏化核心统计（建议独立，不塞 profiles）
-- 理由：
-- - 高频更新（XP、level、积分）与资料字段解耦
-- - 降低 profiles 热行写冲突
-- =============================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  star_points INT NOT NULL DEFAULT 0 CHECK (star_points >= 0),
  tasks_completed INT NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
  habit_checks INT NOT NULL DEFAULT 0 CHECK (habit_checks >= 0),
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_level_xp
  ON user_stats(level DESC, xp DESC);

-- =============================================
-- 9) user_xp_logs：积分流水（风控 + 回溯）
-- =============================================

CREATE TABLE IF NOT EXISTS user_xp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('task', 'habit', 'milestone', 'achievement', 'manual')),
  source_id UUID,
  xp_delta INT NOT NULL,
  star_points_delta INT NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user_time
  ON user_xp_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_xp_logs_source
  ON user_xp_logs(source_type, source_id);

-- =============================================
-- 10) 通用 updated_at 触发器
-- =============================================

CREATE OR REPLACE FUNCTION planner_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goals_updated_at ON goals;
CREATE TRIGGER trg_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

DROP TRIGGER IF EXISTS trg_goal_milestones_updated_at ON goal_milestones;
CREATE TRIGGER trg_goal_milestones_updated_at
BEFORE UPDATE ON goal_milestones
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

DROP TRIGGER IF EXISTS trg_habits_updated_at ON habits;
CREATE TRIGGER trg_habits_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

DROP TRIGGER IF EXISTS trg_achievements_updated_at ON achievements;
CREATE TRIGGER trg_achievements_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

DROP TRIGGER IF EXISTS trg_user_stats_updated_at ON user_stats;
CREATE TRIGGER trg_user_stats_updated_at
BEFORE UPDATE ON user_stats
FOR EACH ROW EXECUTE FUNCTION planner_touch_updated_at();

-- =============================================
-- 11) 子表 user_id 一致性触发器
-- 目标：禁止前端伪造 user_id
-- =============================================

CREATE OR REPLACE FUNCTION planner_sync_task_user_id()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM goals WHERE id = NEW.goal_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'goal_id % not found', NEW.goal_id;
  END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_sync_user_id ON tasks;
CREATE TRIGGER trg_tasks_sync_user_id
BEFORE INSERT OR UPDATE OF goal_id ON tasks
FOR EACH ROW EXECUTE FUNCTION planner_sync_task_user_id();

CREATE OR REPLACE FUNCTION planner_sync_milestone_user_id()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM goals WHERE id = NEW.goal_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'goal_id % not found', NEW.goal_id;
  END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goal_milestones_sync_user_id ON goal_milestones;
CREATE TRIGGER trg_goal_milestones_sync_user_id
BEFORE INSERT OR UPDATE OF goal_id ON goal_milestones
FOR EACH ROW EXECUTE FUNCTION planner_sync_milestone_user_id();

CREATE OR REPLACE FUNCTION planner_sync_habit_log_user_id()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM habits WHERE id = NEW.habit_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'habit_id % not found', NEW.habit_id;
  END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_habit_logs_sync_user_id ON habit_logs;
CREATE TRIGGER trg_habit_logs_sync_user_id
BEFORE INSERT OR UPDATE OF habit_id ON habit_logs
FOR EACH ROW EXECUTE FUNCTION planner_sync_habit_log_user_id();

-- =============================================
-- 12) 自动回写 goals.total_progress（按任务完成率）
-- =============================================

CREATE OR REPLACE FUNCTION planner_refresh_goal_progress(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  total_tasks INT;
  done_tasks INT;
  pct NUMERIC(5,2);
BEGIN
  SELECT COUNT(*) INTO total_tasks FROM tasks WHERE goal_id = p_goal_id;
  SELECT COUNT(*) INTO done_tasks FROM tasks WHERE goal_id = p_goal_id AND is_completed = TRUE;

  IF total_tasks = 0 THEN
    pct := 0;
  ELSE
    pct := ROUND((done_tasks::NUMERIC / total_tasks::NUMERIC) * 100, 2);
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

CREATE OR REPLACE FUNCTION planner_on_tasks_changed()
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

DROP TRIGGER IF EXISTS trg_tasks_progress_refresh ON tasks;
CREATE TRIGGER trg_tasks_progress_refresh
AFTER INSERT OR UPDATE OF is_completed OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION planner_on_tasks_changed();

-- =============================================
-- 13) RLS
-- =============================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_logs ENABLE ROW LEVEL SECURITY;

-- goals
DROP POLICY IF EXISTS goals_select_own ON goals;
CREATE POLICY goals_select_own ON goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS goals_insert_own ON goals;
CREATE POLICY goals_insert_own ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS goals_update_own ON goals;
CREATE POLICY goals_update_own ON goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS goals_delete_own ON goals;
CREATE POLICY goals_delete_own ON goals FOR DELETE USING (auth.uid() = user_id);

-- goal_milestones
DROP POLICY IF EXISTS goal_milestones_select_own ON goal_milestones;
CREATE POLICY goal_milestones_select_own ON goal_milestones FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS goal_milestones_insert_own ON goal_milestones;
CREATE POLICY goal_milestones_insert_own ON goal_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS goal_milestones_update_own ON goal_milestones;
CREATE POLICY goal_milestones_update_own ON goal_milestones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS goal_milestones_delete_own ON goal_milestones;
CREATE POLICY goal_milestones_delete_own ON goal_milestones FOR DELETE USING (auth.uid() = user_id);

-- tasks
DROP POLICY IF EXISTS tasks_select_own ON tasks;
CREATE POLICY tasks_select_own ON tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tasks_insert_own ON tasks;
CREATE POLICY tasks_insert_own ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS tasks_update_own ON tasks;
CREATE POLICY tasks_update_own ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS tasks_delete_own ON tasks;
CREATE POLICY tasks_delete_own ON tasks FOR DELETE USING (auth.uid() = user_id);

-- habits
DROP POLICY IF EXISTS habits_select_own ON habits;
CREATE POLICY habits_select_own ON habits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS habits_insert_own ON habits;
CREATE POLICY habits_insert_own ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS habits_update_own ON habits;
CREATE POLICY habits_update_own ON habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS habits_delete_own ON habits;
CREATE POLICY habits_delete_own ON habits FOR DELETE USING (auth.uid() = user_id);

-- habit_logs
DROP POLICY IF EXISTS habit_logs_select_own ON habit_logs;
CREATE POLICY habit_logs_select_own ON habit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS habit_logs_insert_own ON habit_logs;
CREATE POLICY habit_logs_insert_own ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS habit_logs_update_own ON habit_logs;
CREATE POLICY habit_logs_update_own ON habit_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS habit_logs_delete_own ON habit_logs;
CREATE POLICY habit_logs_delete_own ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- achievements（全局读）
DROP POLICY IF EXISTS achievements_read_all ON achievements;
CREATE POLICY achievements_read_all ON achievements FOR SELECT TO authenticated USING (true);

-- user_achievements
DROP POLICY IF EXISTS user_achievements_select_own ON user_achievements;
CREATE POLICY user_achievements_select_own ON user_achievements FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_achievements_insert_own ON user_achievements;
CREATE POLICY user_achievements_insert_own ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_stats
DROP POLICY IF EXISTS user_stats_select_own ON user_stats;
CREATE POLICY user_stats_select_own ON user_stats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_stats_insert_own ON user_stats;
CREATE POLICY user_stats_insert_own ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_stats_update_own ON user_stats;
CREATE POLICY user_stats_update_own ON user_stats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_xp_logs
DROP POLICY IF EXISTS user_xp_logs_select_own ON user_xp_logs;
CREATE POLICY user_xp_logs_select_own ON user_xp_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_xp_logs_insert_own ON user_xp_logs;
CREATE POLICY user_xp_logs_insert_own ON user_xp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## AI Goal Planner Edge Function 完整代码

> 文件路径：`supabase/functions/ai-goal-planner/index.ts`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PlannerRequest = {
  goalTitle: string
  goalType: 'academic' | 'skill' | 'habit' | 'fitness' | 'career' | 'custom' | string
  deadline: string // YYYY-MM-DD
  userId?: string
}

type AIMilestone = {
  title: string
  description?: string
  target_date: string
  weight?: number
}

type AITask = {
  title: string
  description?: string
  estimated_minutes?: number
  difficulty?: number
  due_date?: string
  milestone_title?: string
}

type AIPlan = {
  milestones: AIMilestone[]
  daily_tasks: AITask[]
}

function isDateOnly(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input)
}

function daysUntil(deadline: string): number {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const target = new Date(`${deadline}T00:00:00.000Z`)
  const deltaMs = target.getTime() - today.getTime()
  return Math.max(0, Math.ceil(deltaMs / (1000 * 60 * 60 * 24)))
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeAiPlan(raw: AIPlan, deadline: string): AIPlan {
  const milestones = (raw.milestones || []).map((m, idx) => ({
    title: (m.title || `里程碑 ${idx + 1}`).slice(0, 200),
    description: (m.description || '').slice(0, 1000),
    target_date: isDateOnly(m.target_date) ? m.target_date : deadline,
    weight: clamp(Number(m.weight || 1), 1, 100),
  }))

  const dailyTasks = (raw.daily_tasks || []).map((t, idx) => ({
    title: (t.title || `任务 ${idx + 1}`).slice(0, 200),
    description: (t.description || '').slice(0, 1000),
    estimated_minutes: clamp(Number(t.estimated_minutes || 45), 10, 240),
    difficulty: clamp(Number(t.difficulty || 3), 1, 5),
    due_date: t.due_date && isDateOnly(t.due_date) ? t.due_date : deadline,
    milestone_title: t.milestone_title ? t.milestone_title.slice(0, 200) : undefined,
  }))

  return {
    milestones,
    daily_tasks: dailyTasks,
  }
}

function buildPrompt(goalTitle: string, goalType: string, deadline: string, remainingDays: number) {
  return `
你是一个严谨的学习与成长规划助手。请根据用户目标拆解出“可执行”的里程碑和任务。

输入信息：
- 目标标题：${goalTitle}
- 目标类型：${goalType}
- 截止日期：${deadline}
- 剩余天数：${remainingDays}

输出要求（必须返回 JSON，不要 markdown，不要解释文本）：
{
  "milestones": [
    {
      "title": "里程碑名称",
      "description": "阶段目标说明",
      "target_date": "YYYY-MM-DD",
      "weight": 1
    }
  ],
  "daily_tasks": [
    {
      "title": "任务标题",
      "description": "任务说明",
      "estimated_minutes": 60,
      "difficulty": 3,
      "due_date": "YYYY-MM-DD",
      "milestone_title": "关联里程碑名称"
    }
  ]
}

约束：
1) 任务必须“具体可执行”，避免笼统描述。
2) 任务数量与剩余天数匹配，默认产出 10-30 条（剩余天数过短时最少 5 条）。
3) 每条任务都要有 due_date 与 estimated_minutes。
4) 里程碑 target_date 必须 <= 截止日期。
5) 所有日期使用 YYYY-MM-DD。
`.trim()
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callQwen(apiKey: string, prompt: string): Promise<string> {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      input: { prompt },
      parameters: { temperature: 0.2 },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Qwen API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.output?.text || ''
}

function parseAIPlan(text: string): AIPlan {
  let payload = text.trim()
  if (payload.startsWith('```')) {
    payload = payload.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const jsonMatch = payload.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI response does not contain JSON object')
  }

  const parsed = JSON.parse(jsonMatch[0]) as AIPlan
  if (!Array.isArray(parsed.milestones) || !Array.isArray(parsed.daily_tasks)) {
    throw new Error('AI response JSON shape invalid')
  }

  return parsed
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Auth failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const authUser = authData.user

    const body = (await req.json()) as PlannerRequest
    const goalTitle = body.goalTitle?.trim()
    const goalType = body.goalType?.trim()
    const deadline = body.deadline?.trim()
    const reqUserId = body.userId?.trim()

    if (!goalTitle || !goalType || !deadline) {
      return new Response(JSON.stringify({ error: 'goalTitle, goalType, deadline are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isDateOnly(deadline)) {
      return new Response(JSON.stringify({ error: 'deadline must be YYYY-MM-DD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reqUserId && reqUserId !== authUser.id) {
      return new Response(JSON.stringify({ error: 'userId mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const usageDate = new Date().toISOString().split('T')[0]
    const feature = 'goal_planning'
    const dailyLimit = 3

    const { data: usageRow, error: usageError } = await supabase
      .from('api_usage_logs')
      .select('usage_count')
      .eq('user_id', authUser.id)
      .eq('feature', feature)
      .eq('usage_date', usageDate)
      .maybeSingle()

    if (usageError) {
      throw new Error(`usage check failed: ${usageError.message}`)
    }

    const currentUsage = usageRow?.usage_count ?? 0
    if (currentUsage >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: 'quota_exceeded',
          feature,
          usage: currentUsage,
          limit: dailyLimit,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const remainDays = daysUntil(deadline)
    const prompt = buildPrompt(goalTitle, goalType, deadline, remainDays)

    const provider = Deno.env.get('AI_PROVIDER') || 'gemini'
    let rawText = ''

    if (provider === 'qwen') {
      const qwenKey = Deno.env.get('QWEN_API_KEY')
      if (!qwenKey) throw new Error('QWEN_API_KEY missing')
      rawText = await callQwen(qwenKey, prompt)
    } else {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiKey) throw new Error('GEMINI_API_KEY missing')
      rawText = await callGemini(geminiKey, prompt)
    }

    const parsed = parseAIPlan(rawText)
    const plan = normalizeAiPlan(parsed, deadline)

    // 1) 创建目标
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: authUser.id,
        title: goalTitle,
        goal_type: goalType,
        deadline,
        status: 'active',
        total_progress: 0,
      })
      .select('*')
      .single()

    if (goalError || !goal) {
      throw new Error(`create goal failed: ${goalError?.message || 'unknown'}`)
    }

    // 2) 写入里程碑
    const milestoneRows = plan.milestones.map((m, idx) => ({
      goal_id: goal.id,
      user_id: authUser.id,
      title: m.title,
      description: m.description || null,
      target_date: m.target_date,
      weight: m.weight || 1,
      status: 'pending',
      sort_order: idx,
    }))

    let insertedMilestones: { id: string; title: string }[] = []
    if (milestoneRows.length > 0) {
      const { data, error } = await supabase
        .from('goal_milestones')
        .insert(milestoneRows)
        .select('id,title')

      if (error) throw new Error(`insert milestones failed: ${error.message}`)
      insertedMilestones = (data || []) as { id: string; title: string }[]
    }

    const milestoneTitleMap = new Map(insertedMilestones.map((m) => [m.title, m.id]))

    // 3) 写入任务（可直接落 tasks 表）
    const taskRows = plan.daily_tasks.map((t, idx) => ({
      goal_id: goal.id,
      user_id: authUser.id,
      milestone_id: t.milestone_title ? milestoneTitleMap.get(t.milestone_title) ?? null : null,
      title: t.title,
      description: t.description || null,
      estimated_minutes: t.estimated_minutes || 45,
      difficulty: t.difficulty || 3,
      due_date: t.due_date || deadline,
      is_completed: false,
      completed_at: null,
      source: 'ai',
      sort_order: idx,
    }))

    const { data: insertedTasks, error: taskError } = await supabase
      .from('tasks')
      .insert(taskRows)
      .select('*')

    if (taskError) throw new Error(`insert tasks failed: ${taskError.message}`)

    // 4) 更新配额
    const { error: upsertUsageError } = await supabase
      .from('api_usage_logs')
      .upsert(
        {
          user_id: authUser.id,
          feature,
          usage_date: usageDate,
          usage_count: currentUsage + 1,
          daily_limit: dailyLimit,
        },
        { onConflict: 'user_id,feature,usage_date' },
      )

    if (upsertUsageError) {
      throw new Error(`usage upsert failed: ${upsertUsageError.message}`)
    }

    return new Response(
      JSON.stringify({
        goal,
        milestones: insertedMilestones,
        tasks: insertedTasks ?? [],
        quota: {
          feature,
          usage: currentUsage + 1,
          limit: dailyLimit,
        },
        provider,
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    return new Response(
      JSON.stringify({
        error: message,
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
```

---

## 游戏化积分系统设计

### 1) 用户经验值和等级存储建议

推荐独立 `user_stats` 表，不扩展 `profiles`：

- `profiles` 属于低频资料写入。
- XP/积分是高频写操作，拆分后可以减少行锁冲突。
- 方便后续排行榜、赛季制、会员倍率等扩展。

推荐字段：

- `xp`：总经验值
- `level`：等级
- `star_points`：星空领域积分（可独立于 XP）
- `tasks_completed` / `habit_checks`：核心行为计数
- `last_activity_at`：活跃时间

再配套 `user_xp_logs` 做流水，可追踪风控与回放。

### 2) 星空领域积分规则（建议）

基础规则（可配到配置表）：

- 完成任务：`+20` 星火积分
- 提前完成任务：额外 `+5`
- 每日首次习惯打卡：`+8`
- 同习惯连续打卡第 N 天：额外 `+min(N, 7)`
- 完成里程碑：`+80`
- 解锁成就：`+50`（一次性）

避免刷分建议：

- 同一任务只计一次（由 `is_completed` 从 `false -> true` 触发）。
- 同一天同一习惯只计一次（`UNIQUE(habit_id, log_date)`）。
- 所有加分在服务端执行，不依赖前端提交分值。

### 3) 成就解锁：触发器 vs 前端触发

推荐：**服务端函数/RPC + 触发器辅助**，不要前端直接判定。

- 前端可做“预计解锁动画”。
- 真正落库和防重由服务端执行。
- `user_achievements` 上 `UNIQUE(user_id, achievement_id)` 防止重复解锁。

执行策略建议：

- `task` 完成后触发 `planner_apply_reward(...)`。
- 该函数内部更新 `user_stats`、写 `user_xp_logs`、检查成就条件并插入 `user_achievements`。

### 4) 积分计算函数（TypeScript）

```ts
export type Task = {
  id: string
  difficulty: 1 | 2 | 3 | 4 | 5
  due_date?: string | null
  completed_at?: string | null
}

export type HabitLog = {
  streakAfterCheckin: number
}

/**
 * XP 计算策略：
 * - 任务基础分
 * - 难度倍率
 * - 准时奖励
 * - 连续打卡 bonus（可选）
 */
export function calculateXP(task: Task, habit?: HabitLog): number {
  const baseXP = 30

  const difficultyMultiplierMap: Record<Task['difficulty'], number> = {
    1: 0.8,
    2: 1.0,
    3: 1.2,
    4: 1.5,
    5: 1.8,
  }
  const difficultyXP = Math.round(baseXP * difficultyMultiplierMap[task.difficulty])

  let onTimeBonus = 0
  if (task.due_date && task.completed_at) {
    const dueEnd = new Date(`${task.due_date}T23:59:59.999Z`).getTime()
    const doneAt = new Date(task.completed_at).getTime()
    if (doneAt <= dueEnd) onTimeBonus = 8
  }

  let streakBonus = 0
  if (habit) {
    // 连续打卡上限 bonus：20
    streakBonus = Math.min(habit.streakAfterCheckin, 10) * 2
  }

  return difficultyXP + onTimeBonus + streakBonus
}
```

---

## 核心组件代码骨架

> 风格对齐：暗黑 + 玻璃拟态 + 渐变色变量（`style.css` 中的品牌色）。

### 1) `frontend/src/components/planner/GoalCard.vue`

```vue
<template>
  <article class="goal-card glass-pro spring-hover" @click="expanded = !expanded">
    <header class="goal-header">
      <div>
        <h3 class="goal-title">{{ goal.title }}</h3>
        <p class="goal-meta">{{ goal.goal_type }} · 截止 {{ goal.deadline }}</p>
      </div>
      <span class="goal-deadline">{{ countdownText }}</span>
    </header>

    <div class="progress-wrap">
      <div class="progress-track">
        <div class="progress-fill" :style="fillStyle" />
      </div>
      <span class="progress-label">{{ progress }}%</span>
    </div>

    <Transition name="fade">
      <ul v-if="expanded" class="task-list">
        <li v-for="task in tasks" :key="task.id" class="task-item">
          <input
            type="checkbox"
            :checked="task.is_completed"
            @change.stop="emit('toggle-task', task.id)"
          />
          <span :class="{ done: task.is_completed }">{{ task.title }}</span>
          <small>{{ task.due_date || '无截止' }}</small>
        </li>
      </ul>
    </Transition>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Goal = {
  id: string
  title: string
  goal_type: string
  deadline: string
  total_progress: number
}

type PlannerTask = {
  id: string
  title: string
  due_date?: string | null
  is_completed: boolean
}

const props = defineProps<{
  goal: Goal
  tasks: PlannerTask[]
}>()

const emit = defineEmits<{
  'toggle-task': [taskId: string]
}>()

const expanded = ref(false)

const progress = computed(() => Math.round(props.goal.total_progress))

const fillColor = computed(() => {
  if (progress.value >= 80) return 'var(--color-brand-green)'
  if (progress.value >= 40) return 'var(--color-brand-orange)'
  return '#ef4444'
})

const fillStyle = computed(() => ({
  width: `${progress.value}%`,
  background: fillColor.value,
}))

const countdownText = computed(() => {
  const today = new Date()
  const due = new Date(`${props.goal.deadline}T00:00:00`)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `已超期 ${Math.abs(diff)} 天`
  if (diff === 0) return '今天截止'
  return `剩余 ${diff} 天`
})
</script>

<style scoped>
.goal-card { border-radius: var(--radius-lg); padding: 16px; cursor: pointer; }
.goal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.goal-title { margin: 0; font-size: 17px; color: var(--color-text-primary); }
.goal-meta { margin-top: 4px; color: var(--color-text-secondary); font-size: 12px; }
.goal-deadline { font-size: 12px; color: var(--color-text-secondary); }
.progress-wrap { margin-top: 14px; display: flex; align-items: center; gap: 10px; }
.progress-track { flex: 1; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
.progress-fill { height: 100%; transition: width .35s ease, background .35s ease; }
.progress-label { font-size: 12px; color: var(--color-text-secondary); }
.task-list { margin-top: 12px; display: grid; gap: 8px; }
.task-item { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.done { text-decoration: line-through; color: var(--color-text-muted); }
</style>
```

### 2) `frontend/src/components/planner/HabitTracker.vue`

```vue
<template>
  <section class="habit-card glass-pro">
    <header class="habit-header">
      <h4>{{ habit.name }}</h4>
      <span class="streak-badge">🔥 {{ habit.current_streak }} 天</span>
    </header>

    <div class="grid">
      <button
        v-for="cell in weekCells"
        :key="cell.date"
        class="cell"
        :class="{ done: cell.done, today: cell.isToday, pending: optimisticPendingDate === cell.date }"
        :disabled="!cell.isToday || cell.done || optimisticPendingDate === cell.date"
        @click="checkinToday(cell.date)"
      >
        {{ cell.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Habit = {
  id: string
  name: string
  current_streak: number
}

type HabitLog = {
  log_date: string // YYYY-MM-DD
}

const props = defineProps<{
  habit: Habit
  logs: HabitLog[]
}>()

const emit = defineEmits<{
  'checkin': [payload: { habitId: string; date: string }]
}>()

const optimisticPendingDate = ref<string | null>(null)

function toDateOnly(d: Date): string {
  return d.toISOString().split('T')[0]
}

const weekCells = computed(() => {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))

  const set = new Set(props.logs.map((l) => l.log_date))
  const labels = ['一', '二', '三', '四', '五', '六', '日']

  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const date = toDateOnly(d)
    return {
      date,
      label: labels[idx],
      done: set.has(date) || optimisticPendingDate.value === date,
      isToday: date === toDateOnly(now),
    }
  })
})

async function checkinToday(date: string) {
  optimisticPendingDate.value = date
  emit('checkin', { habitId: props.habit.id, date })
  // 失败回滚由父组件 store 处理后重置传入 logs，这里只做视觉 pending
  setTimeout(() => {
    optimisticPendingDate.value = null
  }, 1200)
}
</script>

<style scoped>
.habit-card { border-radius: var(--radius-lg); padding: 16px; }
.habit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.streak-badge { color: #f59e0b; font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.cell {
  height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.03); color: var(--color-text-secondary); cursor: pointer;
}
.cell.done { background: rgba(16,185,129,.25); border-color: rgba(16,185,129,.45); color: #d1fae5; }
.cell.today { border-color: var(--color-brand-blue); }
.cell.pending { opacity: .7; }
</style>
```

### 3) `frontend/src/components/planner/StarMap.vue`

```vue
<template>
  <section class="star-map glass-pro">
    <header class="map-header">
      <h4>星空领域</h4>
      <span>积分 {{ starPoints }}</span>
    </header>

    <svg class="sky" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="constellationLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4f8ef7" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>

      <circle
        v-for="star in stars"
        :key="star.id"
        :cx="star.x"
        :cy="star.y"
        :r="star.r"
        :fill="star.color"
        :opacity="star.opacity"
      />

      <polyline
        v-if="showConstellation"
        :points="constellationPoints"
        fill="none"
        stroke="url(#constellationLine)"
        stroke-width="2"
        stroke-linecap="round"
        class="constellation-line"
      />
    </svg>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  starPoints: number
  milestoneReached: boolean
}>()

const showConstellation = ref(false)

const stars = computed(() => {
  const intensity = Math.min(props.starPoints / 1000, 1)
  return Array.from({ length: 30 }).map((_, idx) => {
    const seed = idx + 1
    return {
      id: seed,
      x: 20 + (seed * 73) % 760,
      y: 20 + (seed * 47) % 280,
      r: 1.5 + ((seed * 17) % 4) * (0.5 + intensity),
      opacity: 0.25 + intensity * 0.65,
      color: seed % 2 ? '#9ec5ff' : '#d6bcfa',
    }
  })
})

const constellationPoints = computed(() =>
  stars.value
    .slice(0, 8)
    .map((s) => `${s.x},${s.y}`)
    .join(' ')
)

watch(
  () => props.milestoneReached,
  (v) => {
    if (v) {
      showConstellation.value = false
      requestAnimationFrame(() => {
        showConstellation.value = true
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.star-map { border-radius: var(--radius-lg); padding: 14px; }
.map-header { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--color-text-secondary); }
.sky {
  width: 100%;
  height: 260px;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 20%, rgba(79,142,247,.18), rgba(10,10,15,.95));
}
.constellation-line {
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  animation: line-draw 1s ease forwards;
}
@keyframes line-draw {
  to { stroke-dashoffset: 0; }
}
</style>
```

---

## 状态管理方案

### 1) 是否需要 Pinia

需要。规划模块是跨组件高频状态（目标、任务、习惯、成就、统计）：

- `GoalCard`、`HabitTracker`、`StarMap` 会共享与互相影响状态。
- 打卡和任务完成都要同步影响 XP、等级、成就、星图亮度。
- 后续与 `Schedule` 联动时，store 更容易承接“同步状态 + 回滚”。

建议结构：

- `stores/planner.ts`：核心 store（goals/tasks/habits/logs/achievements/stats）
- `composables/usePlannerApi.ts`：纯 API 调用层
- `composables/usePlannerGamification.ts`：XP 计算与奖励逻辑

### 2) 乐观更新（打卡/任务完成）

推荐流程（保证流畅 + 可回滚）：

1. 本地先改状态（例如 `task.is_completed=true`）。
2. 立刻更新 UI（进度条、积分、动画）。
3. 异步调用 Supabase。
4. 失败则回滚本地快照并提示 toast。

关键点：

- 用 `pendingMap` 标记提交中的实体，避免重复点击。
- 仅在“可逆操作”上用乐观更新（删除类操作可谨慎）。

### 3) 实时订阅（好友打卡）

可以用 Supabase Realtime：

- 订阅源：`habit_logs` 的 `INSERT`。
- 过滤条件：`user_id IN (我的好友id列表)`。
- 进入页面创建 channel，离开页面必须 `removeChannel` 清理。

推荐只实时推“轻量事件”（谁打卡了），详细数据再按需拉取，避免大 payload。

---

## 与日程联动接口设计

### 1) 数据共享还是独立

推荐：**独立存储 + 关联同步**（不是强耦合同表）。

- `tasks` 专注“目标达成语义”。
- `schedule_events` 专注“时间编排语义”。
- 两边通过双向引用关联：
  - `tasks.schedule_event_id`
  - `schedule_events.related_task_id`（你在 schedule 设计里已预留这个方向）

这样可以避免互相污染字段，也方便后续单模块演进。

### 2) 转换接口设计

```ts
type PlannerTask = {
  id: string
  user_id: string
  title: string
  description?: string | null
  due_date?: string | null
  estimated_minutes?: number | null
  difficulty: number
}

type ScheduleEventInsert = {
  user_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  event_type: 'task'
  event_subtype: 'planner_task'
  priority: number
  related_task_id: string
  status: 'active'
}

export function pushTaskToSchedule(task: PlannerTask): ScheduleEventInsert {
  const start = task.due_date
    ? new Date(`${task.due_date}T19:00:00`)
    : new Date()

  const duration = Math.max(20, Math.min(task.estimated_minutes ?? 60, 180))
  const end = new Date(start.getTime() + duration * 60 * 1000)

  return {
    user_id: task.user_id,
    title: `🎯 ${task.title}`,
    description: task.description ?? null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    event_type: 'task',
    event_subtype: 'planner_task',
    priority: task.difficulty >= 4 ? 1 : 0,
    related_task_id: task.id,
    status: 'active',
  }
}
```

### 3) 同步策略建议

- Planner -> Schedule：创建任务时可选“推送到日程”。
- Schedule 删除事件：**默认不删除任务**，仅清空 `tasks.schedule_event_id`（防误删目标数据）。
- Task 完成时：如果有关联日程事件，可将 `schedule_events.status` 改为 `completed`。

---

## 代码实现风险点

1. **配额表结构冲突风险**
- 风险：`api_usage_logs` 在不同文档中字段定义不一致。
- 处理：先执行兼容迁移（新增 `feature`，唯一键改为 `user_id+feature+usage_date`）。

2. **RLS 与子表 user_id 被伪造**
- 风险：前端插入 `tasks` 时传了别人的 `user_id`。
- 处理：子表 `user_id` 由触发器按父表回填，不信任客户端。

3. **AI JSON 不稳定**
- 风险：大模型可能返回非严格 JSON。
- 处理：Edge Function 强制提取 JSON、结构校验、归一化兜底、再入库。

4. **时区导致截止日偏差**
- 风险：`deadline`/`due_date` 与 UTC 混用导致提前/延后一天。
- 处理：目标截止统一用 `DATE`；事件排期转换时统一本地时段 + ISO 输出。

5. **乐观更新与真实状态偏离**
- 风险：UI 已成功但后端失败。
- 处理：store 内保存快照并回滚；失败 toast 明确反馈。

6. **积分作弊**
- 风险：前端自行改分。
- 处理：所有积分写入走服务端函数，`user_xp_logs` 留审计链。

7. **Realtime 通道泄漏**
- 风险：页面反复进入导致重复订阅。
- 处理：页面卸载时清理 channel；组件不直接持有全局订阅实例。

8. **任务与日程强耦合误删**
- 风险：用户删日程事件导致目标任务丢失。
- 处理：联动默认“解关联不删任务”，除非用户明确选择“同步删除”。

---

如果你愿意，我可以下一步直接给你补全**可执行迁移顺序**（按依赖顺序一条条可运行），并附上 `Planner.vue + plannerStore.ts + usePlannerApi.ts` 的首版落地代码，直接替换 `/app/planner` 的 Placeholder。  
