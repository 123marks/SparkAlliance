-- ============================================================
-- 星火卡罗牌 数据表 + RLS + 配额函数
-- 基于 codex-tarot-final.md 终审方案
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 通用 updated_at 触发器函数
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 管理员判断函数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() ->> 'role', '') IN ('service_role', 'supabase_admin');
$$;

-- ============================================================
-- 1. 卡牌表（22张大阿尔卡纳）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tarot_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_no INT NOT NULL UNIQUE CHECK (card_no BETWEEN 0 AND 21),
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  arcana_type TEXT NOT NULL DEFAULT 'major' CHECK (arcana_type = 'major'),
  image_url TEXT NOT NULL,
  upright_meaning TEXT NOT NULL,    -- 正位含义
  reversed_meaning TEXT NOT NULL,   -- 逆位含义
  campus_context TEXT NOT NULL,     -- 校园语境解读
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarot_cards_active
  ON public.tarot_cards(is_active);

DROP TRIGGER IF EXISTS trg_tarot_cards_updated_at ON public.tarot_cards;
CREATE TRIGGER trg_tarot_cards_updated_at
BEFORE UPDATE ON public.tarot_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. 抽牌记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.tarot_cards(id) ON DELETE RESTRICT,
  reading_mode TEXT NOT NULL DEFAULT 'question' CHECK (reading_mode IN ('question', 'daily')),
  spread_type TEXT NOT NULL DEFAULT 'single' CHECK (spread_type IN ('single')),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  user_question TEXT,
  -- 同题缓存用 hash
  question_hash TEXT GENERATED ALWAYS AS (
    CASE
      WHEN user_question IS NULL OR btrim(user_question) = '' THEN NULL
      ELSE md5(lower(regexp_replace(btrim(user_question), '\s+', ' ', 'g')))
    END
  ) STORED,
  question_category TEXT,    -- study/love/social/self 等
  ai_reading TEXT,
  ai_provider TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  shared_to_wall BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 约束：question 模式必须有问题，daily 模式问题为空
  CONSTRAINT tarot_readings_question_rule CHECK (
    (reading_mode = 'question' AND user_question IS NOT NULL AND char_length(btrim(user_question)) BETWEEN 1 AND 500)
    OR
    (reading_mode = 'daily' AND user_question IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_created
  ON public.tarot_readings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_day
  ON public.tarot_readings(user_id, ((created_at AT TIME ZONE 'Asia/Shanghai')::date));

CREATE INDEX IF NOT EXISTS idx_tarot_readings_question_hash
  ON public.tarot_readings(user_id, question_hash, ((created_at AT TIME ZONE 'Asia/Shanghai')::date));

-- ============================================================
-- 3. RLS 策略
-- ============================================================
ALTER TABLE public.tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- tarot_cards: 所有人可读
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_public_read'
  ) THEN
    CREATE POLICY tarot_cards_public_read
      ON public.tarot_cards FOR SELECT USING (true);
  END IF;

  -- tarot_cards: 仅管理员可写
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_insert'
  ) THEN
    CREATE POLICY tarot_cards_admin_insert
      ON public.tarot_cards FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_update'
  ) THEN
    CREATE POLICY tarot_cards_admin_update
      ON public.tarot_cards FOR UPDATE TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_delete'
  ) THEN
    CREATE POLICY tarot_cards_admin_delete
      ON public.tarot_cards FOR DELETE TO authenticated USING (public.is_admin());
  END IF;

  -- tarot_readings: 仅本人可读写
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_select'
  ) THEN
    CREATE POLICY tarot_readings_own_select
      ON public.tarot_readings FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_insert'
  ) THEN
    CREATE POLICY tarot_readings_own_insert
      ON public.tarot_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_update'
  ) THEN
    CREATE POLICY tarot_readings_own_update
      ON public.tarot_readings FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_delete'
  ) THEN
    CREATE POLICY tarot_readings_own_delete
      ON public.tarot_readings FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. api_usage_logs 建表（如果从未建过）+ feature 维度迁移
-- ============================================================

-- 先确保表存在（兼容从未执行过 ai_import_tables.sql 的情况）
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INT DEFAULT 0,
  daily_limit INT DEFAULT 5,
  feature TEXT NOT NULL DEFAULT 'ai_schedule_import',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果表已存在但缺少 feature 列，补上
ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_schedule_import';

-- 删除旧的唯一约束（可能不存在，忽略错误）
ALTER TABLE public.api_usage_logs
  DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_usage_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_usage_logs_user_feature_usage_date_key'
  ) THEN
    ALTER TABLE public.api_usage_logs
      ADD CONSTRAINT api_usage_logs_user_feature_usage_date_key
      UNIQUE (user_id, feature, usage_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_feature_date
  ON public.api_usage_logs(user_id, feature, usage_date);

-- ============================================================
-- 5. 原子配额扣减函数
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_feature_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_daily_limit INT,
  p_usage_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Shanghai')::date)
)
RETURNS TABLE (
  allowed BOOLEAN,
  usage_count INT,
  daily_limit INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 不存在则插入
  INSERT INTO public.api_usage_logs (id, user_id, feature, usage_date, usage_count, daily_limit)
  VALUES (uuid_generate_v4(), p_user_id, p_feature, p_usage_date, 0, p_daily_limit)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  -- 原子更新（usage_count < daily_limit 才成功）
  UPDATE public.api_usage_logs
  SET
    usage_count = api_usage_logs.usage_count + 1,
    daily_limit = p_daily_limit,
    updated_at = NOW()
  WHERE
    api_usage_logs.user_id = p_user_id
    AND api_usage_logs.feature = p_feature
    AND api_usage_logs.usage_date = p_usage_date
    AND api_usage_logs.usage_count < p_daily_limit
  RETURNING TRUE, api_usage_logs.usage_count, api_usage_logs.daily_limit
  INTO allowed, usage_count, daily_limit;

  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- 已超限
  SELECT FALSE, l.usage_count, l.daily_limit
  INTO allowed, usage_count, daily_limit
  FROM public.api_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.feature = p_feature
    AND l.usage_date = p_usage_date;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_feature_quota(UUID, TEXT, INT, DATE)
TO authenticated, service_role;

-- ============================================================
-- 6. 同题缓存查询函数
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_today_cached_tarot_reading(
  p_user_id UUID,
  p_question TEXT,
  p_usage_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Shanghai')::date)
)
RETURNS TABLE (
  id UUID,
  ai_reading TEXT,
  card_id UUID,
  is_reversed BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.ai_reading,
    r.card_id,
    r.is_reversed
  FROM public.tarot_readings r
  WHERE r.user_id = p_user_id
    AND r.question_hash = md5(lower(regexp_replace(btrim(p_question), '\s+', ' ', 'g')))
    AND (r.created_at AT TIME ZONE 'Asia/Shanghai')::date = p_usage_date
    AND r.ai_reading IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_today_cached_tarot_reading(UUID, TEXT, DATE)
TO authenticated, service_role;
