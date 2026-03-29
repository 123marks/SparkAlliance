-- =============================================
-- 星火伴侣 V2 数据库重构
-- 星火ID体系 + 好友广场 + 群聊 + 动态增强
-- =============================================

-- ====== 0. 星火ID — 唯一社交标识 ======
-- 每个用户拥有独一无二的6位字母数字星火ID
CREATE TABLE IF NOT EXISTS spark_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  spark_id VARCHAR(12) NOT NULL UNIQUE,         -- 唯一星火ID（6-12位字母+数字）
  nickname TEXT NOT NULL DEFAULT '星火用户',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  gender VARCHAR(10) DEFAULT 'unknown',          -- male/female/unknown
  university TEXT DEFAULT '',
  school_year VARCHAR(10) DEFAULT '',            -- 年级
  interests TEXT[] DEFAULT '{}',                  -- 兴趣标签
  qr_code_seed UUID DEFAULT uuid_generate_v4(),  -- 二维码种子（变更后旧码失效）
  show_in_plaza BOOLEAN DEFAULT TRUE,            -- 是否出现在好友广场
  online_status VARCHAR(10) DEFAULT 'offline',    -- online/offline/busy
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  id_changed BOOLEAN DEFAULT FALSE,              -- 星火ID是否已修改过（仅一次）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生成唯一6位星火ID的函数
CREATE OR REPLACE FUNCTION generate_spark_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 排除易混淆字符 I/O/0/1
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  -- 检查唯一性
  IF EXISTS (SELECT 1 FROM spark_profiles WHERE spark_id = result) THEN
    RETURN generate_spark_id();  -- 递归重试
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_sp_sparkid ON spark_profiles(spark_id);
CREATE INDEX IF NOT EXISTS idx_sp_user ON spark_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_nickname ON spark_profiles USING gin(to_tsvector('simple', nickname));

ALTER TABLE spark_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sp_sel ON spark_profiles;
DROP POLICY IF EXISTS sp_ins ON spark_profiles;
DROP POLICY IF EXISTS sp_upd ON spark_profiles;
CREATE POLICY sp_sel ON spark_profiles FOR SELECT USING (true);  -- 公开可见
CREATE POLICY sp_ins ON spark_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sp_upd ON spark_profiles FOR UPDATE USING (auth.uid() = user_id);


-- ====== 1. friend_requests — 好友申请 ======
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  source VARCHAR(20) DEFAULT 'search',  -- search/qrcode/plaza/group
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_fr_to ON friend_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_fr_from ON friend_requests(from_user_id);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fr_sel ON friend_requests;
DROP POLICY IF EXISTS fr_ins ON friend_requests;
DROP POLICY IF EXISTS fr_upd ON friend_requests;
CREATE POLICY fr_sel ON friend_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY fr_ins ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY fr_upd ON friend_requests FOR UPDATE
  USING (auth.uid() = to_user_id);


-- ====== 2. friendships — 好友关系 ======
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_fs_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_fs_friend ON friendships(friend_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fs_sel ON friendships;
DROP POLICY IF EXISTS fs_ins ON friendships;
DROP POLICY IF EXISTS fs_del ON friendships;
CREATE POLICY fs_sel ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY fs_ins ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY fs_del ON friendships FOR DELETE USING (auth.uid() = user_id);


-- ====== 3. companion_chats — AI伴侣对话 ======
CREATE TABLE IF NOT EXISTS companion_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_user ON companion_chats(user_id, created_at DESC);

ALTER TABLE companion_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cc_sel ON companion_chats;
DROP POLICY IF EXISTS cc_ins ON companion_chats;
DROP POLICY IF EXISTS cc_del ON companion_chats;
CREATE POLICY cc_sel ON companion_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cc_ins ON companion_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cc_del ON companion_chats FOR DELETE USING (auth.uid() = user_id);


-- ====== 4. companion_moments V2 — 动态增强 ======
CREATE TABLE IF NOT EXISTS companion_moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',       -- 图片URL
  video_urls TEXT[] DEFAULT '{}',       -- 视频URL
  visibility VARCHAR(20) DEFAULT 'friends'
    CHECK (visibility IN ('public', 'friends', 'private')),
  show_in_plaza BOOLEAN DEFAULT FALSE,  -- 是否推送到好友广场
  expires_at TIMESTAMPTZ,               -- 有效期到期时间（NULL=永久）
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_user ON companion_moments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_time ON companion_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_plaza ON companion_moments(show_in_plaza, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_expires ON companion_moments(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE companion_moments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cm_sel ON companion_moments;
DROP POLICY IF EXISTS cm_ins ON companion_moments;
DROP POLICY IF EXISTS cm_del ON companion_moments;
CREATE POLICY cm_sel ON companion_moments FOR SELECT USING (
  -- 过期动态不可见
  (expires_at IS NULL OR expires_at > NOW()) AND (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM friendships WHERE
        (friendships.user_id = auth.uid() AND friendships.friend_id = companion_moments.user_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = companion_moments.user_id)
    ))
  )
);
CREATE POLICY cm_ins ON companion_moments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cm_del ON companion_moments FOR DELETE USING (auth.uid() = user_id);


-- ====== 5. moment_likes ======
CREATE TABLE IF NOT EXISTS moment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES companion_moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

ALTER TABLE moment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ml_sel ON moment_likes;
DROP POLICY IF EXISTS ml_ins ON moment_likes;
DROP POLICY IF EXISTS ml_del ON moment_likes;
CREATE POLICY ml_sel ON moment_likes FOR SELECT USING (true);
CREATE POLICY ml_ins ON moment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_del ON moment_likes FOR DELETE USING (auth.uid() = user_id);


-- ====== 6. moment_comments ======
CREATE TABLE IF NOT EXISTS moment_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES companion_moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcom2_moment ON moment_comments(moment_id, created_at ASC);

ALTER TABLE moment_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcom2_sel ON moment_comments;
DROP POLICY IF EXISTS mcom2_ins ON moment_comments;
DROP POLICY IF EXISTS mcom2_del ON moment_comments;
CREATE POLICY mcom2_sel ON moment_comments FOR SELECT USING (true);
CREATE POLICY mcom2_ins ON moment_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mcom2_del ON moment_comments FOR DELETE USING (auth.uid() = user_id);


-- ====== 7. group_chats — 群聊 ======
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '群聊',
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN DEFAULT TRUE,              -- AI是否参与群聊
  max_members INT DEFAULT 50,
  member_count INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gc_sel ON group_chats;
DROP POLICY IF EXISTS gc_ins ON group_chats;
DROP POLICY IF EXISTS gc_upd ON group_chats;
CREATE POLICY gc_sel ON group_chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_chats.id AND user_id = auth.uid())
);
CREATE POLICY gc_ins ON group_chats FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY gc_upd ON group_chats FOR UPDATE USING (auth.uid() = owner_id);


-- ====== 8. group_members ======
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(10) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members(user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_sel ON group_members;
DROP POLICY IF EXISTS gm_ins ON group_members;
DROP POLICY IF EXISTS gm_del ON group_members;
CREATE POLICY gm_sel ON group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid())
);
CREATE POLICY gm_ins ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY gm_del ON group_members FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_chats WHERE id = group_members.group_id AND owner_id = auth.uid()
  )
);


-- ====== 9. group_messages ======
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type VARCHAR(10) DEFAULT 'user' CHECK (sender_type IN ('user', 'ai')),
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmsg_group ON group_messages(group_id, created_at DESC);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gmsg_sel ON group_messages;
DROP POLICY IF EXISTS gmsg_ins ON group_messages;
CREATE POLICY gmsg_sel ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY gmsg_ins ON group_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);


-- ====== 触发器 ======

-- 动态点赞计数
CREATE OR REPLACE FUNCTION companion_update_moment_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE companion_moments SET like_count = like_count + 1 WHERE id = NEW.moment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companion_moments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.moment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_moment_likes ON moment_likes;
CREATE TRIGGER trg_moment_likes
  AFTER INSERT OR DELETE ON moment_likes
  FOR EACH ROW EXECUTE FUNCTION companion_update_moment_likes();

-- 动态评论计数
CREATE OR REPLACE FUNCTION companion_update_moment_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE companion_moments SET comment_count = comment_count + 1 WHERE id = NEW.moment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companion_moments SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.moment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_moment_comments ON moment_comments;
CREATE TRIGGER trg_moment_comments
  AFTER INSERT OR DELETE ON moment_comments
  FOR EACH ROW EXECUTE FUNCTION companion_update_moment_comments();

-- 好友申请通过 → 自动建双向关系
CREATE OR REPLACE FUNCTION companion_auto_add_friend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO friendships(user_id, friend_id) VALUES (NEW.from_user_id, NEW.to_user_id) ON CONFLICT DO NOTHING;
    INSERT INTO friendships(user_id, friend_id) VALUES (NEW.to_user_id, NEW.from_user_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_auto_add_friend ON friend_requests;
CREATE TRIGGER trg_auto_add_friend
  AFTER UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION companion_auto_add_friend();

-- 群成员计数
CREATE OR REPLACE FUNCTION companion_update_group_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_chats SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_chats SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_group_count ON group_members;
CREATE TRIGGER trg_group_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION companion_update_group_count();

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
