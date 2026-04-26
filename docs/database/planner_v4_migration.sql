-- =============================================
-- 星火规划模块 V4 增量更新
-- 新增：扩展目标类型 + 安全性增强
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1) 扩展 goal_type 枚举，支持新增类型
-- 先删除旧约束再建新约束
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN (
    'academic','skill','habit','fitness','career','custom',
    'reading','social','creativity','emotional','finance'
  ));

-- 2) 确保 task_evidence 表存在（V2 已创建，此处幂等）
CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type VARCHAR(20) NOT NULL CHECK (evidence_type IN ('image','video','text','file')),
  content TEXT,
  media_url TEXT,
  ai_feedback TEXT,
  ai_score SMALLINT CHECK (ai_score IS NULL OR (ai_score BETWEEN 1 AND 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) 确保索引存在
CREATE INDEX IF NOT EXISTS idx_evidence_task ON task_evidence(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_user ON task_evidence(user_id, created_at DESC);

-- 4) 确保 RLS 策略存在
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS te_sel ON task_evidence;
DROP POLICY IF EXISTS te_ins ON task_evidence;
DROP POLICY IF EXISTS te_upd ON task_evidence;
DROP POLICY IF EXISTS te_del ON task_evidence;
CREATE POLICY te_sel ON task_evidence FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY te_ins ON task_evidence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY te_upd ON task_evidence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY te_del ON task_evidence FOR DELETE USING (auth.uid() = user_id);

-- 5) 安全性增强：限制 planner_tasks 的 source 字段
ALTER TABLE planner_tasks DROP CONSTRAINT IF EXISTS planner_tasks_source_check;
ALTER TABLE planner_tasks ADD CONSTRAINT planner_tasks_source_check
  CHECK (source IN ('manual','ai','template'));

-- 6) 确保 goal_reviews 的 RLS 策略完整
ALTER TABLE goal_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gr_sel ON goal_reviews;
DROP POLICY IF EXISTS gr_ins ON goal_reviews;
DROP POLICY IF EXISTS gr_upd ON goal_reviews;
DROP POLICY IF EXISTS gr_del ON goal_reviews;
CREATE POLICY gr_sel ON goal_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY gr_ins ON goal_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY gr_upd ON goal_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY gr_del ON goal_reviews FOR DELETE USING (auth.uid() = user_id);

-- 7) 确保 user_stats 和 user_achievements 的 RLS 策略完整
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS us_sel ON user_stats;
DROP POLICY IF EXISTS us_ins ON user_stats;
DROP POLICY IF EXISTS us_upd ON user_stats;
CREATE POLICY us_sel ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY us_ins ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY us_upd ON user_stats FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ua_sel ON user_achievements;
DROP POLICY IF EXISTS ua_ins ON user_achievements;
CREATE POLICY ua_sel ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ua_ins ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
