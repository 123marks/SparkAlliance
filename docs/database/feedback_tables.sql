-- ============================================================
-- 用户反馈系统 — Supabase 数据表
-- 基于《用户反馈系统完整设计方案》Phase 1 MVP
-- ============================================================

-- 反馈主表
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基础信息
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'experience', 'report', 'other')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),

  -- 分类
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'closed')),
  module TEXT DEFAULT NULL, -- 关联模块：AI助手/校园墙/日程/购物/...
  tags TEXT[] DEFAULT '{}',

  -- Bug 特有字段
  bug_type TEXT DEFAULT NULL, -- 功能异常/显示问题/性能问题/数据问题/安全问题
  severity TEXT DEFAULT NULL, -- 严重/高/中/低
  steps TEXT[] DEFAULT '{}', -- 复现步骤列表

  -- 建议特有字段
  importance TEXT DEFAULT NULL, -- 非常重要/重要/一般
  use_case TEXT DEFAULT NULL,   -- 使用场景

  -- 环境信息（自动采集）
  environment JSONB DEFAULT '{}',
  -- { browser, os, resolution, network, page, userAgent }

  -- 附件（Supabase Storage URLs）
  attachments TEXT[] DEFAULT '{}',

  -- 联系方式（选填）
  contact_email TEXT DEFAULT NULL,

  -- 投票数（冗余字段，加速查询）
  vote_count INT NOT NULL DEFAULT 0,

  -- 处理信息
  assignee_id UUID DEFAULT NULL,
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  closed_at TIMESTAMPTZ DEFAULT NULL,
  admin_reply TEXT DEFAULT NULL,

  -- 是否公开到反馈广场
  is_public BOOLEAN NOT NULL DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 投票表（一人一票）
CREATE TABLE IF NOT EXISTS feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON feedbacks(priority);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_vote ON feedbacks(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_fid ON feedback_votes(feedback_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedbacks_updated ON feedbacks;
CREATE TRIGGER trg_feedbacks_updated
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_updated_at();

-- ============================================================
-- RLS 策略
-- ============================================================

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- 反馈：登录用户可读公开反馈 + 自己的全部反馈
CREATE POLICY "用户可查看公开反馈和自己的反馈" ON feedbacks
  FOR SELECT USING (
    is_public = true OR auth.uid() = user_id
  );

-- 反馈：登录用户可提交
CREATE POLICY "登录用户可提交反馈" ON feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 反馈：用户可更新自己的反馈（仅限 pending 状态）
CREATE POLICY "用户可更新自己待处理的反馈" ON feedbacks
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 反馈：用户可删除自己的反馈（仅限 pending 状态）
CREATE POLICY "用户可删除自己待处理的反馈" ON feedbacks
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- 投票：登录用户可投票
CREATE POLICY "登录用户可投票" ON feedback_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 投票：用户可取消自己的投票
CREATE POLICY "用户可取消自己的投票" ON feedback_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 投票：可查看投票记录
CREATE POLICY "可查看投票记录" ON feedback_votes
  FOR SELECT USING (true);

-- ============================================================
-- 投票计数触发器：投票增删时自动更新 feedbacks.vote_count
-- ============================================================

CREATE OR REPLACE FUNCTION update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedbacks SET vote_count = vote_count + 1 WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feedbacks SET vote_count = vote_count - 1 WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_count ON feedback_votes;
CREATE TRIGGER trg_vote_count
  AFTER INSERT OR DELETE ON feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_vote_count();
