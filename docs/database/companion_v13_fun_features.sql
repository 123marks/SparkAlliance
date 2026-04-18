-- =============================================
-- 星火伴侣 V13 趣味玩法 & 富消息增量迁移
-- 依赖：先执行 companion_tables.sql → companion_moments_v12_migration.sql
-- =============================================
--
-- 目的：在 V12 基础设施（moment-media bucket + 动态基础字段）之上，
-- 再追加 V13 的新能力：
--   · 动态字段：cover_style JSONB / location JSONB / share_chain / allowed_tag_ids
--   · 评论点赞独立表（替代 moment_comments.likes 数组的线性扫描）
--   · 好友私聊表 friend_chat_messages（含富消息字段）
--   · 群消息富字段 msg_type / share_data / reactions / mentions / quote_msg
--   · 签到 checkin_records
--   · 成就 user_achievements
--
-- 幂等执行：全部 ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS / DROP IF EXISTS
-- =============================================

-- =============================================
-- 一、companion_moments —— 追加 V13 字段（不与 V12 重复）
-- =============================================

ALTER TABLE companion_moments
  ADD COLUMN IF NOT EXISTS cover_style JSONB,                     -- 无图动态智能封面 { emoji, gradient, angle, theme }
  ADD COLUMN IF NOT EXISTS location JSONB,                         -- { name, lat, lng, city, region, country, source }
  ADD COLUMN IF NOT EXISTS share_chain JSONB DEFAULT '[]'::jsonb,  -- 转发链路 [{by_spark_id, by_nickname, at, note}]
  ADD COLUMN IF NOT EXISTS allowed_tag_ids UUID[] DEFAULT '{}',    -- 允许可见的好友标签 ID 列表（与 visible_to 取并集）
  ADD COLUMN IF NOT EXISTS live_expires_at TIMESTAMPTZ;            -- 实况过期时间（实况开关已在 V12 加 is_live）

-- 实况流 TTL 清理辅助（pg_cron 可定时调用）
CREATE OR REPLACE FUNCTION cleanup_expired_live_moments()
RETURNS void AS $$
BEGIN
  DELETE FROM companion_moments
  WHERE is_live = TRUE
    AND live_expires_at IS NOT NULL
    AND live_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扩展索引
CREATE INDEX IF NOT EXISTS idx_cm_live
  ON companion_moments(live_expires_at)
  WHERE is_live = TRUE;

CREATE INDEX IF NOT EXISTS idx_cm_allowed_tag_ids
  ON companion_moments USING gin(allowed_tag_ids);


-- =============================================
-- 二、moment_comment_likes —— 评论点赞独立表
-- 替代 moment_comments.likes[] 线性扫描，支持触发器维护 like_count
-- =============================================

CREATE TABLE IF NOT EXISTS moment_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES moment_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mcl_comment ON moment_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_mcl_user ON moment_comment_likes(user_id);

ALTER TABLE moment_comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcl_sel ON moment_comment_likes;
DROP POLICY IF EXISTS mcl_ins ON moment_comment_likes;
DROP POLICY IF EXISTS mcl_del ON moment_comment_likes;
CREATE POLICY mcl_sel ON moment_comment_likes FOR SELECT USING (TRUE);
CREATE POLICY mcl_ins ON moment_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mcl_del ON moment_comment_likes FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 三、friend_chat_messages —— 好友私聊表（含富消息）
-- =============================================

CREATE TABLE IF NOT EXISTS friend_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  msg_type TEXT DEFAULT 'text'
    CHECK (msg_type IN ('text', 'image', 'share', 'system', 'voice', 'file', 'video', 'poke')),
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  share_data JSONB,
  voice_duration INT,
  voice_transcript TEXT,
  mentions TEXT[] DEFAULT '{}',
  quote_msg JSONB,
  sender_name TEXT,
  sender_avatar TEXT,
  sender_avatar_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 老表兼容：如果已存在但缺字段，幂等补齐
ALTER TABLE friend_chat_messages
  ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS share_data JSONB,
  ADD COLUMN IF NOT EXISTS voice_duration INT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quote_msg JSONB,
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fcm_sender_time ON friend_chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcm_receiver_time ON friend_chat_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcm_pair
  ON friend_chat_messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcm_unread
  ON friend_chat_messages(receiver_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

ALTER TABLE friend_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcm_sel ON friend_chat_messages;
DROP POLICY IF EXISTS fcm_ins ON friend_chat_messages;
DROP POLICY IF EXISTS fcm_upd ON friend_chat_messages;
DROP POLICY IF EXISTS fcm_del ON friend_chat_messages;
CREATE POLICY fcm_sel ON friend_chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY fcm_ins ON friend_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY fcm_upd ON friend_chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
CREATE POLICY fcm_del ON friend_chat_messages FOR DELETE
  USING (auth.uid() = sender_id);


-- =============================================
-- 四、group_messages —— 富消息字段扩展
-- =============================================

ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text'
    CHECK (msg_type IN ('text', 'image', 'share', 'system', 'voice', 'file', 'video', 'poke')),
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS share_data JSONB,
  ADD COLUMN IF NOT EXISTS voice_duration INT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quote_msg JSONB,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_gmsg_type_time
  ON group_messages(group_id, msg_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmsg_mentions
  ON group_messages USING gin(mentions);


-- =============================================
-- 五、checkin_records —— 签到记录（V13 趣味玩法·连续签到）
-- =============================================

CREATE TABLE IF NOT EXISTS checkin_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  mood VARCHAR(20),
  note TEXT,
  streak_days INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_ck_user_date ON checkin_records(user_id, checkin_date DESC);

ALTER TABLE checkin_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ck_sel ON checkin_records;
DROP POLICY IF EXISTS ck_ins ON checkin_records;
DROP POLICY IF EXISTS ck_upd ON checkin_records;
DROP POLICY IF EXISTS ck_del ON checkin_records;
CREATE POLICY ck_sel ON checkin_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ck_ins ON checkin_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ck_upd ON checkin_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ck_del ON checkin_records FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 六、user_achievements —— 成就徽章表（V13 趣味玩法）
-- =============================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🏆',
  rarity VARCHAR(20) DEFAULT 'common'
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_ua_user ON user_achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_code ON user_achievements(achievement_code);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ua_sel ON user_achievements;
DROP POLICY IF EXISTS ua_ins ON user_achievements;
DROP POLICY IF EXISTS ua_del ON user_achievements;
CREATE POLICY ua_sel ON user_achievements FOR SELECT USING (TRUE);  -- 徽章公开可见
CREATE POLICY ua_ins ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ua_del ON user_achievements FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 七、验证（可选手动 Run）
-- =============================================

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'companion_moments' ORDER BY ordinal_position;

-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('companion_moments', 'moment_comments', 'moment_comment_likes',
--                     'friend_chat_messages', 'group_messages', 'checkin_records', 'user_achievements')
-- ORDER BY tablename, cmd;

-- =============================================
-- V13 迁移完成。请确保 V12 已先执行；两者幂等，可重复运行。
-- =============================================
