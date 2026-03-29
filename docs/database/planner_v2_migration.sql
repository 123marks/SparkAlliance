-- =============================================
-- 星火规划模块 V2 增量更新（修复版）
-- 解决：策略重复 + trigger 兼容 goal_id=null + 任务记录表
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1) planner_tasks: goal_id 改为可空（支持快捷独立任务）
ALTER TABLE planner_tasks ALTER COLUMN goal_id DROP NOT NULL;

-- 2) planner_tasks: 新增状态字段（支持取消）和完成备注
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS completion_note TEXT;

-- 给已有记录补 status
UPDATE planner_tasks SET status = 'pending' WHERE status IS NULL;
UPDATE planner_tasks SET status = 'completed' WHERE is_completed = TRUE AND (status IS NULL OR status = 'pending');

-- 添加 CHECK 约束（如果不存在）
DO $$ BEGIN
  ALTER TABLE planner_tasks ADD CONSTRAINT chk_task_status CHECK (status IN ('pending','in_progress','completed','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) 修复触发器：goal_id 为空时跳过 user_id 同步（快捷任务由前端直接传 user_id）
CREATE OR REPLACE FUNCTION planner_sync_task_user_id()
RETURNS TRIGGER AS $$
DECLARE owner_id UUID;
BEGIN
  -- 如果 goal_id 为空（快捷独立任务），不修改 user_id，直接放行
  IF NEW.goal_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT user_id INTO owner_id FROM goals WHERE id = NEW.goal_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'goal_id % not found', NEW.goal_id; END IF;
  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) 修复进度回写：goal_id 为空时跳过
CREATE OR REPLACE FUNCTION planner_on_task_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.goal_id IS NOT NULL THEN
      PERFORM planner_refresh_goal_progress(OLD.goal_id);
    END IF;
  ELSE
    IF NEW.goal_id IS NOT NULL THEN
      PERFORM planner_refresh_goal_progress(NEW.goal_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5) goal_reviews 表（如果不存在才创建）
CREATE TABLE IF NOT EXISTS goal_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  improvements TEXT,
  shared_to_wall BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_goal ON goal_reviews(goal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON goal_reviews(user_id, created_at DESC);

-- RLS（先删再建，避免重复）
ALTER TABLE goal_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gr_sel ON goal_reviews;
DROP POLICY IF EXISTS gr_ins ON goal_reviews;
DROP POLICY IF EXISTS gr_upd ON goal_reviews;
DROP POLICY IF EXISTS gr_del ON goal_reviews;
CREATE POLICY gr_sel ON goal_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY gr_ins ON goal_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY gr_upd ON goal_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY gr_del ON goal_reviews FOR DELETE USING (auth.uid() = user_id);

-- 6) task_evidence 表：任务完成记录（图片/视频/文本证据）
CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type VARCHAR(20) NOT NULL CHECK (evidence_type IN ('image','video','text','file')),
  content TEXT,             -- 文本内容或描述
  media_url TEXT,           -- 图片/视频/文件的存储 URL
  ai_feedback TEXT,         -- AI 评审反馈
  ai_score SMALLINT CHECK (ai_score IS NULL OR (ai_score BETWEEN 1 AND 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_task ON task_evidence(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_user ON task_evidence(user_id, created_at DESC);

-- RLS
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS te_sel ON task_evidence;
DROP POLICY IF EXISTS te_ins ON task_evidence;
DROP POLICY IF EXISTS te_upd ON task_evidence;
DROP POLICY IF EXISTS te_del ON task_evidence;
CREATE POLICY te_sel ON task_evidence FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY te_ins ON task_evidence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY te_upd ON task_evidence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY te_del ON task_evidence FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
