-- ======================================================================
-- 星火联盟 — 星火寄语 (Spark Messages) 数据表
-- 跨代际寄语平台，独立于校园墙，面向全体用户
-- ======================================================================

-- 1. 寄语主表
CREATE TABLE IF NOT EXISTS public.spark_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '星火用户',

  -- 寄语类别
  --   to_youth    = 成年人想对年轻人说的话
  --   to_self     = 年轻人想对自己说的话
  --   to_future   = 给未来的自己
  --   inspiration = 灵感与感悟
  category TEXT NOT NULL DEFAULT 'to_youth'
    CHECK (category IN ('to_youth', 'to_self', 'to_future', 'inspiration')),

  -- 内容
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  media_urls TEXT[] DEFAULT '{}',        -- 图片/视频 URL 列表

  -- 可见性：public(广场) / private(仅自己可见)
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),

  -- 统计（冗余计数，定期用函数同步）
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,

  -- 是否置顶
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_spark_messages_category ON public.spark_messages(category);
CREATE INDEX IF NOT EXISTS idx_spark_messages_created_at ON public.spark_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spark_messages_like_count ON public.spark_messages(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_spark_messages_author_id ON public.spark_messages(author_id);

-- RLS 策略
ALTER TABLE public.spark_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public messages"
  ON public.spark_messages FOR SELECT
  USING (visibility = 'public' OR author_id = auth.uid());

CREATE POLICY "Users can create messages"
  ON public.spark_messages FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own messages"
  ON public.spark_messages FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own messages"
  ON public.spark_messages FOR DELETE
  USING (auth.uid() = author_id);

-- 2. 点赞表
CREATE TABLE IF NOT EXISTS public.spark_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.spark_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.spark_message_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes" ON public.spark_message_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.spark_message_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.spark_message_likes FOR DELETE USING (auth.uid() = user_id);

-- 3. 评论表
CREATE TABLE IF NOT EXISTS public.spark_message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.spark_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '星火用户',
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  media_urls TEXT[] DEFAULT '{}',
  parent_comment_id UUID REFERENCES public.spark_message_comments(id) ON DELETE CASCADE,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_msg_comments_message ON public.spark_message_comments(message_id);

ALTER TABLE public.spark_message_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.spark_message_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.spark_message_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON public.spark_message_comments FOR DELETE USING (auth.uid() = author_id);

-- 4. 私信表（寄语场景下的1对1私信）
CREATE TABLE IF NOT EXISTS public.spark_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  media_urls TEXT[] DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_dm_sender ON public.spark_direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_spark_dm_receiver ON public.spark_direct_messages(receiver_id);

ALTER TABLE public.spark_direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own DMs" ON public.spark_direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send DMs" ON public.spark_direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 5. 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_spark_messages_updated_at ON public.spark_messages;
CREATE TRIGGER set_spark_messages_updated_at
  BEFORE UPDATE ON public.spark_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
