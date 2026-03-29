-- ======================================================================
-- 星火联盟 — 星火寄语 (Spark Messages) 数据表
-- 跨代际寄语平台，独立于校园墙，面向全体用户
-- 前置条件：先执行 supabase-schema.sql 创建 profiles 表
-- ======================================================================

-- 1. 寄语主表
CREATE TABLE IF NOT EXISTS spark_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '星火用户',

  -- 寄语类别
  category TEXT NOT NULL DEFAULT 'to_youth'
    CHECK (category IN ('to_youth', 'to_self', 'to_future', 'inspiration')),

  -- 内容
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  media_urls TEXT[] DEFAULT '{}',

  -- 可见性：public(广场) / private(仅自己可见)
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),

  -- 统计
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_messages_category ON spark_messages(category);
CREATE INDEX IF NOT EXISTS idx_spark_messages_created_at ON spark_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spark_messages_like_count ON spark_messages(like_count DESC);

ALTER TABLE spark_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm_select" ON spark_messages;
CREATE POLICY "sm_select" ON spark_messages FOR SELECT
  USING (visibility = 'public' OR author_id = auth.uid());

DROP POLICY IF EXISTS "sm_insert" ON spark_messages;
CREATE POLICY "sm_insert" ON spark_messages FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "sm_update" ON spark_messages;
CREATE POLICY "sm_update" ON spark_messages FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "sm_delete" ON spark_messages;
CREATE POLICY "sm_delete" ON spark_messages FOR DELETE
  USING (auth.uid() = author_id);

-- 2. 点赞表
CREATE TABLE IF NOT EXISTS spark_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES spark_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE spark_message_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sml_select" ON spark_message_likes;
CREATE POLICY "sml_select" ON spark_message_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "sml_insert" ON spark_message_likes;
CREATE POLICY "sml_insert" ON spark_message_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sml_delete" ON spark_message_likes;
CREATE POLICY "sml_delete" ON spark_message_likes FOR DELETE USING (auth.uid() = user_id);

-- 3. 评论表
CREATE TABLE IF NOT EXISTS spark_message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES spark_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '星火用户',
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  media_urls TEXT[] DEFAULT '{}',
  parent_comment_id UUID REFERENCES spark_message_comments(id) ON DELETE CASCADE,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smc_message ON spark_message_comments(message_id);
ALTER TABLE spark_message_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smc_select" ON spark_message_comments;
CREATE POLICY "smc_select" ON spark_message_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "smc_insert" ON spark_message_comments;
CREATE POLICY "smc_insert" ON spark_message_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "smc_delete" ON spark_message_comments;
CREATE POLICY "smc_delete" ON spark_message_comments FOR DELETE USING (auth.uid() = author_id);

-- 4. 私信表
CREATE TABLE IF NOT EXISTS spark_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  media_urls TEXT[] DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spark_direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sdm_select" ON spark_direct_messages;
CREATE POLICY "sdm_select" ON spark_direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "sdm_insert" ON spark_direct_messages;
CREATE POLICY "sdm_insert" ON spark_direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 5. 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_spark_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_spark_messages_updated_at ON spark_messages;
CREATE TRIGGER set_spark_messages_updated_at
  BEFORE UPDATE ON spark_messages
  FOR EACH ROW EXECUTE FUNCTION update_spark_messages_updated_at();

-- 6. Storage bucket（手动在 Supabase Dashboard 创建）
-- 创建名为 spark-messages 的 Storage bucket
-- 允许认证用户上传图片和视频
-- MIME: image/*, video/mp4, video/webm
-- 最大文件: 50MB
