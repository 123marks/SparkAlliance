-- =============================================
-- 星火伴侣 V12 增量迁移（2026-04-18）
-- 配合前端 Companion 新需求：
--   1. 媒体文件真实上传到 Storage（bucket: moment-media）
--   2. 动态置顶 is_pinned + 时间范围可见性
--   3. 部分可见 visible_to / 标签 tags / 地区 region
--   4. 评论配图 image_url / 评论点赞 likes / 评论可见性 is_hidden
--   5. 动态作者可删除自己动态下的评论（RLS 增强）
--   6. 动态详情页的默认陌生人可见评论开关 strangers_can_see_comments
--   7. 每条评论的删除保留作者 / 动态作者双通道
--
-- 安全说明：
--   所有语句使用 IF NOT EXISTS / DROP IF EXISTS / ON CONFLICT 幂等执行
--   不会破坏旧数据，旧字段保留；仅追加新字段
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → RUN
-- =============================================

-- ====== 1. companion_moments 补充新字段 ======
ALTER TABLE companion_moments
  ADD COLUMN IF NOT EXISTS is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visible_to      UUID[]  NOT NULL DEFAULT '{}',     -- 部分可见时指定的好友 user_id（与 spark_id 字段区分，此处存 user_id 更安全）
  ADD COLUMN IF NOT EXISTS visible_to_spark_ids TEXT[] NOT NULL DEFAULT '{}', -- 冗余存 spark_id 便于前端直连
  ADD COLUMN IF NOT EXISTS tags            TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS region          TEXT,
  ADD COLUMN IF NOT EXISTS file_urls       TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_names      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_sizes      BIGINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_live         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS strangers_can_see_comments BOOLEAN NOT NULL DEFAULT FALSE, -- 默认陌生人不可见评论，作者可开
  ADD COLUMN IF NOT EXISTS cover_strategy  VARCHAR(16) DEFAULT 'auto',       -- auto | first_image | first_video | gradient
  ADD COLUMN IF NOT EXISTS cover_url       TEXT,                              -- 显式封面（若作者自定义）
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_cm_pinned ON companion_moments(user_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_tags   ON companion_moments USING gin(tags);

-- 维护 updated_at 触发器
CREATE OR REPLACE FUNCTION cm_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cm_touch ON companion_moments;
CREATE TRIGGER trg_cm_touch BEFORE UPDATE ON companion_moments
  FOR EACH ROW EXECUTE FUNCTION cm_touch_updated_at();

-- ====== 2. companion_moments RLS 增强：部分可见 + 时间范围 ======
-- 兼容前端只有 spark_id 的现实，visible_to_spark_ids 作为主判断源
-- （visible_to UUID[] 留作未来增强，不参与当前 RLS 判断）
DROP POLICY IF EXISTS cm_sel ON companion_moments;
CREATE POLICY cm_sel ON companion_moments FOR SELECT USING (
  -- 动态未过期
  (expires_at IS NULL OR expires_at > NOW()) AND (
    -- 作者本人始终可见
    user_id = auth.uid()
    -- 公开动态
    OR visibility = 'public'
    -- friends 可见但需要是好友
    OR (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM friendships f WHERE
        (f.user_id = auth.uid() AND f.friend_id = companion_moments.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = companion_moments.user_id)
    ))
    -- 部分可见：调用者的 spark_id 必须在 visible_to_spark_ids 中（且是好友）
    OR (visibility = 'private' AND EXISTS (
      SELECT 1 FROM spark_profiles sp
      WHERE sp.user_id = auth.uid()
        AND sp.spark_id = ANY(companion_moments.visible_to_spark_ids)
    ) AND EXISTS (
      SELECT 1 FROM friendships f WHERE
        (f.user_id = auth.uid() AND f.friend_id = companion_moments.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = companion_moments.user_id)
    ))
  )
);

-- 允许作者更新自己的动态（置顶/取消置顶、开关陌生人评论可见、改 cover）
DROP POLICY IF EXISTS cm_upd ON companion_moments;
CREATE POLICY cm_upd ON companion_moments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ====== 3. moment_comments 增强：配图 / 点赞 / 隐藏 ======
ALTER TABLE moment_comments
  ADD COLUMN IF NOT EXISTS image_url   TEXT,
  ADD COLUMN IF NOT EXISTS video_url   TEXT,
  ADD COLUMN IF NOT EXISTS likes       UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,   -- 动态作者隐藏某条评论（软删除保留历史）
  ADD COLUMN IF NOT EXISTS parent_id   UUID,                              -- 回复评论（支持二级回复）
  ADD COLUMN IF NOT EXISTS reply_to_user_id UUID,                         -- @回复的用户
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_mcom_parent ON moment_comments(parent_id) WHERE parent_id IS NOT NULL;

-- ====== 4. moment_comments RLS：评论者 + 动态作者都能删 ======
DROP POLICY IF EXISTS mcom2_del ON moment_comments;
CREATE POLICY mcom2_del ON moment_comments FOR DELETE USING (
  auth.uid() = user_id   -- 评论者自己
  OR EXISTS (            -- 动态作者
    SELECT 1 FROM companion_moments cm
    WHERE cm.id = moment_comments.moment_id AND cm.user_id = auth.uid()
  )
);

-- 评论可见性：遵循 strangers_can_see_comments + 好友关系
DROP POLICY IF EXISTS mcom2_sel ON moment_comments;
CREATE POLICY mcom2_sel ON moment_comments FOR SELECT USING (
  -- 自己的评论始终可见
  auth.uid() = user_id
  -- 动态作者始终可见
  OR EXISTS (
    SELECT 1 FROM companion_moments cm
    WHERE cm.id = moment_comments.moment_id AND cm.user_id = auth.uid()
  )
  -- 好友或开启陌生人可见：可见（除非被作者隐藏）
  OR (NOT is_hidden AND EXISTS (
    SELECT 1 FROM companion_moments cm
    WHERE cm.id = moment_comments.moment_id
      AND (
        cm.strangers_can_see_comments
        OR EXISTS (
          SELECT 1 FROM friendships f WHERE
            (f.user_id = auth.uid() AND f.friend_id = cm.user_id)
            OR (f.friend_id = auth.uid() AND f.user_id = cm.user_id)
        )
      )
  ))
);

-- 允许动态作者把评论 is_hidden 置为 true（相当于"软删除"）
DROP POLICY IF EXISTS mcom2_upd ON moment_comments;
CREATE POLICY mcom2_upd ON moment_comments FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM companion_moments cm WHERE cm.id = moment_comments.moment_id AND cm.user_id = auth.uid())
);

-- ====== 5. moment-media Storage Bucket ======
-- 创建 public bucket（图片/视频/评论图）
INSERT INTO storage.buckets (id, name, public)
VALUES ('moment-media', 'moment-media', true)
ON CONFLICT (id) DO NOTHING;

-- 公开读取（所有访客都能看到已发布的图片/视频）
DROP POLICY IF EXISTS moment_media_select ON storage.objects;
CREATE POLICY moment_media_select ON storage.objects FOR SELECT
  USING (bucket_id = 'moment-media');

-- 认证用户可上传到以自己 user_id 开头的路径
DROP POLICY IF EXISTS moment_media_insert ON storage.objects;
CREATE POLICY moment_media_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'moment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户可删除自己上传的文件
DROP POLICY IF EXISTS moment_media_delete ON storage.objects;
CREATE POLICY moment_media_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'moment-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户可更新自己的文件元数据
DROP POLICY IF EXISTS moment_media_update ON storage.objects;
CREATE POLICY moment_media_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'moment-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ====== 6. 评论删除辅助 RPC（避免前端直接 DELETE 引起的 RLS 复杂判断） ======
-- 返回：'ok' / 'not_found' / 'no_permission'
CREATE OR REPLACE FUNCTION companion_delete_comment(p_comment_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_moment_owner UUID;
  v_commenter    UUID;
  v_caller       UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RETURN 'no_permission'; END IF;

  SELECT mc.user_id, cm.user_id
    INTO v_commenter, v_moment_owner
    FROM moment_comments mc
    JOIN companion_moments cm ON cm.id = mc.moment_id
    WHERE mc.id = p_comment_id;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_caller = v_commenter OR v_caller = v_moment_owner THEN
    DELETE FROM moment_comments WHERE id = p_comment_id;
    RETURN 'ok';
  END IF;

  RETURN 'no_permission';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION companion_delete_comment(UUID) TO authenticated;

-- ====== 7. 动态"仅自己可见"独立配置（时间范围设置）======
-- 每个用户一行，存储他希望别人看他星火域时的时间限制
CREATE TABLE IF NOT EXISTS moment_visibility_settings (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  time_range       VARCHAR(16) NOT NULL DEFAULT 'forever'
    CHECK (time_range IN ('three_days', 'one_month', 'half_year', 'forever')),
  allow_strangers  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moment_visibility_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mvs_sel ON moment_visibility_settings;
DROP POLICY IF EXISTS mvs_upd ON moment_visibility_settings;
DROP POLICY IF EXISTS mvs_ins ON moment_visibility_settings;
-- 所有人可读（判断对方的时间范围限制）
CREATE POLICY mvs_sel ON moment_visibility_settings FOR SELECT USING (true);
CREATE POLICY mvs_ins ON moment_visibility_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mvs_upd ON moment_visibility_settings FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 完成！请在 Supabase SQL Editor 中整段执行本文件。
-- =============================================
