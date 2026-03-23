-- =============================================
-- 评论举报自动下架系统 — 数据库扩展
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. reports 表增加 comment_id（兼容帖子和评论举报）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 更新唯一约束：同一用户对同一目标只能举报一次
-- 注意：需要先删除旧约束
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_post_id_reporter_id_key') THEN
    ALTER TABLE reports DROP CONSTRAINT reports_post_id_reporter_id_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_unique_target') THEN
    ALTER TABLE reports ADD CONSTRAINT reports_unique_target
      UNIQUE (reporter_id, post_id, comment_id);
  END IF;
END $$;

-- 2. comments 表增加举报计数 + 隐藏字段
ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_count INT DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- 3. 用户制裁表（限制评论/发帖权限）
CREATE TABLE IF NOT EXISTS user_sanctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- 'comment_ban' | 'post_ban' | 'full_ban'
  reason TEXT,
  expires_at TIMESTAMPTZ,         -- NULL = 永久
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sanctions' AND tablename = 'user_sanctions') THEN
    CREATE POLICY "Users can view own sanctions" ON user_sanctions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. 用户通知表
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- 'report_hidden' | 'sanction_applied' | 'appeal_result'
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  reference_id UUID,               -- 关联的 comment_id / sanction_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own notifications' AND tablename = 'user_notifications') THEN
    CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert notifications' AND tablename = 'user_notifications') THEN
    CREATE POLICY "System can insert notifications" ON user_notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notifications' AND tablename = 'user_notifications') THEN
    CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. 内容申诉表
CREATE TABLE IF NOT EXISTS content_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',    -- 'pending' | 'approved' | 'rejected'
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);
ALTER TABLE content_appeals ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own appeals' AND tablename = 'content_appeals') THEN
    CREATE POLICY "Users can view own appeals" ON content_appeals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert appeals' AND tablename = 'content_appeals') THEN
    CREATE POLICY "Users can insert appeals" ON content_appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. 自动下架触发器
-- 当评论被举报达到阈值（>=3）自动隐藏 + 通知 + 屡次违规自动制裁
CREATE OR REPLACE FUNCTION auto_hide_reported_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_current_count INT;
  v_hidden_count INT;
BEGIN
  -- 仅处理评论举报（comment_id 不为空）
  IF NEW.comment_id IS NULL THEN RETURN NEW; END IF;

  -- 更新举报计数
  UPDATE comments SET report_count = report_count + 1
  WHERE id = NEW.comment_id
  RETURNING report_count, author_id INTO v_current_count, v_author_id;

  -- 达到阈值（3次举报）→ 自动隐藏
  IF v_current_count >= 3 THEN
    UPDATE comments SET is_hidden = true, hidden_reason = '举报达到阈值，系统自动隐藏'
    WHERE id = NEW.comment_id AND is_hidden = false;

    -- 通知评论作者
    INSERT INTO user_notifications (user_id, type, title, message, reference_id)
    VALUES (v_author_id, 'report_hidden',
            '你的评论已被隐藏',
            '你的评论因多次被举报已被系统自动隐藏，如有异议可提交申诉',
            NEW.comment_id);

    -- 检查是否屡次违规（30天内被隐藏 >= 3 条）→ 限制评论权限 7 天
    SELECT count(*) INTO v_hidden_count
    FROM comments
    WHERE author_id = v_author_id
      AND is_hidden = true
      AND created_at > NOW() - INTERVAL '30 days';

    IF v_hidden_count >= 3 THEN
      -- 插入制裁（如果当前无有效制裁）
      INSERT INTO user_sanctions (user_id, type, reason, expires_at)
      SELECT v_author_id, 'comment_ban', '30天内多次发布违规评论', NOW() + INTERVAL '7 days'
      WHERE NOT EXISTS (
        SELECT 1 FROM user_sanctions
        WHERE user_id = v_author_id AND type = 'comment_ban' AND expires_at > NOW()
      );

      -- 通知用户
      INSERT INTO user_notifications (user_id, type, title, message)
      VALUES (v_author_id, 'sanction_applied',
              '评论权限已被限制',
              '因多次发布违规评论，你的评论功能已被限制 7 天。请遵守社区规范。');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_hide_comment ON reports;
CREATE TRIGGER trigger_auto_hide_comment
AFTER INSERT ON reports
FOR EACH ROW
WHEN (NEW.comment_id IS NOT NULL)
EXECUTE FUNCTION auto_hide_reported_comment();
