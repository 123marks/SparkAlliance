-- =============================================
-- 星火联盟 · 数据持久化 Phase 2
-- 目标：为 useCompanion / useSparkAI / useSettings 等所有 localStorage 状态
--       提供跨设备同步的通用 KV 存储，同时保留本地优先的离线能力。
-- 使用：在 Supabase SQL Editor 中执行一次即可。
-- =============================================

-- ====== spark_user_state — 通用用户状态 KV 表 ======
-- 每条记录 = 一个 localStorage key 对应的 JSON blob。
-- 典型 state_key：
--   spark_companion_profile / spark_companion_friends
--   spark_companion_moments / spark_companion_groups
--   spark_companion_tags / spark_companion_blacklist
--   spark_companion_friend_permissions / spark_companion_moment_visibility
--   spark_companion_favorites / spark_companion_ai_chat
--   spark_appearance / spark_semester_config / spark_ai_conversations
CREATE TABLE IF NOT EXISTS spark_user_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  size_bytes INT GENERATED ALWAYS AS (octet_length(data::text)) STORED,
  UNIQUE(user_id, state_key)
);

CREATE INDEX IF NOT EXISTS idx_sus_user_key ON spark_user_state(user_id, state_key);
CREATE INDEX IF NOT EXISTS idx_sus_updated ON spark_user_state(user_id, updated_at DESC);

ALTER TABLE spark_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sus_sel ON spark_user_state;
DROP POLICY IF EXISTS sus_ins ON spark_user_state;
DROP POLICY IF EXISTS sus_upd ON spark_user_state;
DROP POLICY IF EXISTS sus_del ON spark_user_state;

CREATE POLICY sus_sel ON spark_user_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY sus_ins ON spark_user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY sus_upd ON spark_user_state FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY sus_del ON spark_user_state FOR DELETE
  USING (auth.uid() = user_id);

-- 自动刷新 updated_at 触发器
CREATE OR REPLACE FUNCTION spark_user_state_touch()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果客户端未显式带入 updated_at，或带入值比当前还旧，则写入当前时间。
  IF NEW.updated_at IS NULL OR NEW.updated_at < OLD.updated_at THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sus_touch ON spark_user_state;
CREATE TRIGGER trg_sus_touch
  BEFORE UPDATE ON spark_user_state
  FOR EACH ROW EXECUTE FUNCTION spark_user_state_touch();

-- ====== 存储配额保护（单行 256KB 上限，单用户 8MB 上限） ======
-- 防止单个键被滥用后把行撑爆或占满用户空间。
CREATE OR REPLACE FUNCTION spark_user_state_guard()
RETURNS TRIGGER AS $$
DECLARE
  total_size BIGINT;
BEGIN
  IF octet_length(NEW.data::text) > 262144 THEN
    RAISE EXCEPTION 'spark_user_state row too large (>256KB) for key %', NEW.state_key;
  END IF;

  SELECT COALESCE(SUM(size_bytes), 0) INTO total_size
    FROM spark_user_state
    WHERE user_id = NEW.user_id AND state_key <> NEW.state_key;

  IF total_size + octet_length(NEW.data::text) > 8 * 1024 * 1024 THEN
    RAISE EXCEPTION 'spark_user_state quota exceeded (>8MB) for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sus_guard ON spark_user_state;
CREATE TRIGGER trg_sus_guard
  BEFORE INSERT OR UPDATE ON spark_user_state
  FOR EACH ROW EXECUTE FUNCTION spark_user_state_guard();

-- =============================================
-- 完成！在 Supabase SQL Editor 执行后，前端 persistSync.ts 会自动启用。
-- 回滚方案：DROP TABLE spark_user_state CASCADE;
-- =============================================
