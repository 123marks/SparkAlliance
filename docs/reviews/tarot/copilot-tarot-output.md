## 完整数据库SQL（建表 + RLS）

```sql
-- =============================================
-- Spark Tarot Module (Supabase / PostgreSQL)
-- 约定：统一使用 uuid_generate_v4()，用户外键引用 auth.users(id)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) 统一 updated_at 触发器函数（若已有可复用）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2) 管理员判断函数（用于 tarot_cards 写权限）
-- 说明：建议在 Supabase Auth 的 app_metadata.role 写入 "admin"
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() ->> 'role', '') IN ('service_role', 'supabase_admin');
$$;

-- 3) tarot_cards：卡牌基础信息表
CREATE TABLE IF NOT EXISTS public.tarot_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_no INT NOT NULL UNIQUE, -- 0~77
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  arcana_type TEXT NOT NULL CHECK (arcana_type IN ('major', 'minor')),
  suit TEXT CHECK (suit IN ('wands', 'cups', 'swords', 'pentacles') OR suit IS NULL),
  image_url TEXT NOT NULL,
  upright_meaning TEXT NOT NULL,
  reversed_meaning TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana_type ON public.tarot_cards(arcana_type);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_is_active ON public.tarot_cards(is_active);

DROP TRIGGER IF EXISTS trg_tarot_cards_updated_at ON public.tarot_cards;
CREATE TRIGGER trg_tarot_cards_updated_at
BEFORE UPDATE ON public.tarot_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4) tarot_readings：用户抽牌记录表
CREATE TABLE IF NOT EXISTS public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.tarot_cards(id) ON DELETE RESTRICT,
  spread_type TEXT NOT NULL DEFAULT 'single' CHECK (spread_type IN ('single', 'three')),
  spread_position TEXT CHECK (spread_position IN ('past', 'present', 'future') OR spread_position IS NULL),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  user_question TEXT NOT NULL CHECK (char_length(trim(user_question)) BETWEEN 1 AND 500),
  question_hash TEXT GENERATED ALWAYS AS (
    md5(lower(regexp_replace(trim(user_question), '\s+', ' ', 'g')))
  ) STORED,
  ai_reading TEXT,
  ai_provider TEXT DEFAULT 'gemini-flash',
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  shared_to_wall BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_created
  ON public.tarot_readings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_day
  ON public.tarot_readings(user_id, ((created_at AT TIME ZONE 'Asia/Shanghai')::date));

CREATE INDEX IF NOT EXISTS idx_tarot_readings_cache_lookup
  ON public.tarot_readings(user_id, question_hash, ((created_at AT TIME ZONE 'Asia/Shanghai')::date));

CREATE INDEX IF NOT EXISTS idx_tarot_readings_card_id ON public.tarot_readings(card_id);

-- 5) 复用 api_usage_logs：增加 feature 维度（兼容 schedule + tarot）
ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_schedule_import';

-- 若历史表是 UNIQUE(user_id, usage_date)，需改为 UNIQUE(user_id, feature, usage_date)
ALTER TABLE public.api_usage_logs
  DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_usage_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_usage_logs_user_feature_usage_date_key'
  ) THEN
    ALTER TABLE public.api_usage_logs
      ADD CONSTRAINT api_usage_logs_user_feature_usage_date_key
      UNIQUE (user_id, feature, usage_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_feature_date
  ON public.api_usage_logs(user_id, feature, usage_date);

-- 6) 原子配额消费函数（避免并发竞争）
CREATE OR REPLACE FUNCTION public.consume_feature_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_daily_limit INT
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
  INSERT INTO public.api_usage_logs (id, user_id, feature, usage_date, usage_count, daily_limit)
  VALUES (uuid_generate_v4(), p_user_id, p_feature, CURRENT_DATE, 0, p_daily_limit)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  UPDATE public.api_usage_logs
  SET
    usage_count = usage_count + 1,
    daily_limit = p_daily_limit,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND feature = p_feature
    AND usage_date = CURRENT_DATE
    AND usage_count < p_daily_limit
  RETURNING TRUE, public.api_usage_logs.usage_count, public.api_usage_logs.daily_limit
  INTO allowed, usage_count, daily_limit;

  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT FALSE, l.usage_count, l.daily_limit
  INTO allowed, usage_count, daily_limit
  FROM public.api_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.feature = p_feature
    AND l.usage_date = CURRENT_DATE;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_feature_quota(UUID, TEXT, INT) TO authenticated, service_role;

-- 7) 当日同题缓存查询函数（避免重复 AI 调用）
CREATE OR REPLACE FUNCTION public.find_today_cached_tarot_reading(
  p_user_id UUID,
  p_question TEXT,
  p_tz TEXT DEFAULT 'Asia/Shanghai'
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
    AND r.question_hash = md5(lower(regexp_replace(trim(p_question), '\s+', ' ', 'g')))
    AND (r.created_at AT TIME ZONE p_tz)::date = (NOW() AT TIME ZONE p_tz)::date
    AND r.ai_reading IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_today_cached_tarot_reading(UUID, TEXT, TEXT) TO authenticated, service_role;

-- 8) RLS
ALTER TABLE public.tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;

-- tarot_cards：所有人可读，管理员可写
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_public_read'
  ) THEN
    CREATE POLICY tarot_cards_public_read
      ON public.tarot_cards
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_insert'
  ) THEN
    CREATE POLICY tarot_cards_admin_insert
      ON public.tarot_cards
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_update'
  ) THEN
    CREATE POLICY tarot_cards_admin_update
      ON public.tarot_cards
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_delete'
  ) THEN
    CREATE POLICY tarot_cards_admin_delete
      ON public.tarot_cards
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- tarot_readings：用户只能读写自己的记录
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_select'
  ) THEN
    CREATE POLICY tarot_readings_own_select
      ON public.tarot_readings
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_insert'
  ) THEN
    CREATE POLICY tarot_readings_own_insert
      ON public.tarot_readings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_update'
  ) THEN
    CREATE POLICY tarot_readings_own_update
      ON public.tarot_readings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_delete'
  ) THEN
    CREATE POLICY tarot_readings_own_delete
      ON public.tarot_readings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9) 每日次数统计（替代 tarot_daily_limit 表）
-- 示例：查询某用户今日抽牌次数
-- SELECT COUNT(*)::int AS today_draw_count
-- FROM public.tarot_readings
-- WHERE user_id = auth.uid()
--   AND (created_at AT TIME ZONE 'Asia/Shanghai')::date = (NOW() AT TIME ZONE 'Asia/Shanghai')::date;
```

## TarotCard.vue 组件代码骨架

```vue
<template>
  <button
    class="tarot-card"
    :class="{ 'is-flipped': flipped, 'is-disabled': disabled }"
    :disabled="disabled"
    @click="onFlip"
  >
    <div class="tarot-card__inner">
      <!-- 牌背 -->
      <div class="tarot-card__face tarot-card__face--back">
        <div class="glow-ring" />
        <div class="sigil">Spark Tarot</div>
      </div>

      <!-- 牌面 -->
      <div class="tarot-card__face tarot-card__face--front">
        <img
          v-if="card?.image_url"
          class="card-image"
          :class="{ reversed: isReversed }"
          :src="card.image_url"
          :alt="card.name_zh"
          loading="lazy"
          decoding="async"
        />
        <div class="card-meta">
          <h4>{{ card?.name_zh }}</h4>
          <p>{{ isReversed ? '逆位' : '正位' }}</p>
        </div>
        <div class="spark-layer" aria-hidden="true">
          <span v-for="n in 10" :key="n" class="spark" />
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
interface TarotCardModel {
  id: string
  name_zh: string
  image_url: string
}

const props = defineProps<{
  card?: TarotCardModel
  flipped: boolean
  isReversed: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'flip'): void
}>()

const onFlip = () => {
  if (props.disabled) return
  emit('flip')
}
</script>

<style scoped>
.tarot-card {
  width: 220px;
  height: 360px;
  border: none;
  background: transparent;
  padding: 0;
  perspective: 1400px;
  cursor: pointer;
  transition: transform .28s ease;
}

.tarot-card:hover {
  transform: translateY(-4px) scale(1.01);
}

.tarot-card.is-disabled {
  opacity: .6;
  cursor: not-allowed;
}

.tarot-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform .85s cubic-bezier(.22, .61, .36, 1);
}

.tarot-card.is-flipped .tarot-card__inner {
  transform: rotateY(180deg);
}

.tarot-card__face {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  backface-visibility: hidden;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .18);
  box-shadow:
    0 10px 32px rgba(0, 0, 0, .4),
    inset 0 0 0 1px rgba(255, 255, 255, .08);
}

.tarot-card__face--back {
  background:
    radial-gradient(circle at 20% 15%, rgba(56, 189, 248, .25), transparent 40%),
    radial-gradient(circle at 80% 85%, rgba(168, 85, 247, .25), transparent 40%),
    linear-gradient(160deg, rgba(15, 23, 42, .95), rgba(30, 41, 59, .92));
  display: grid;
  place-items: center;
}

.glow-ring {
  position: absolute;
  inset: 18% 20%;
  border: 1px solid rgba(125, 211, 252, .35);
  border-radius: 999px;
  filter: blur(.3px);
  animation: pulse 2.4s ease-in-out infinite;
}

.sigil {
  color: rgba(226, 232, 240, .88);
  letter-spacing: .08em;
  font-size: 14px;
}

.tarot-card__face--front {
  background: rgba(15, 23, 42, .72);
  transform: rotateY(180deg);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .6s ease;
}

.card-image.reversed {
  transform: rotate(180deg);
}

.card-meta {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(2, 6, 23, .56);
  backdrop-filter: blur(8px);
  color: #e2e8f0;
}

.spark-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.spark {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(125, 211, 252, .95);
  box-shadow: 0 0 8px rgba(125, 211, 252, .75);
  animation: floatUp 1.4s linear infinite;
}

.spark:nth-child(odd) {
  background: rgba(196, 181, 253, .92);
  box-shadow: 0 0 8px rgba(196, 181, 253, .72);
}

.spark:nth-child(1) { left: 10%; top: 92%; animation-delay: .1s; }
.spark:nth-child(2) { left: 25%; top: 96%; animation-delay: .35s; }
.spark:nth-child(3) { left: 40%; top: 95%; animation-delay: .55s; }
.spark:nth-child(4) { left: 52%; top: 97%; animation-delay: .2s; }
.spark:nth-child(5) { left: 64%; top: 93%; animation-delay: .7s; }
.spark:nth-child(6) { left: 76%; top: 96%; animation-delay: .45s; }
.spark:nth-child(7) { left: 88%; top: 94%; animation-delay: .85s; }
.spark:nth-child(8) { left: 18%; top: 98%; animation-delay: 1s; }
.spark:nth-child(9) { left: 34%; top: 98%; animation-delay: .9s; }
.spark:nth-child(10){ left: 70%; top: 98%; animation-delay: 1.15s; }

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: .6; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes floatUp {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0;
  }
  20% { opacity: 1; }
  100% {
    transform: translate3d(-8px, -120px, 0) scale(0.2);
    opacity: 0;
  }
}
</style>
```

## 抽牌逻辑实现方案

```ts
type UUID = string

interface TarotCard {
  id: UUID
  name_zh: string
  upright_meaning: string
  reversed_meaning: string
}

interface DrawResult {
  cardId: UUID
  isReversed: boolean
}

interface SpreadCard extends DrawResult {
  position: 'past' | 'present' | 'future'
}

interface ThreeCardSpread {
  cards: SpreadCard[]
}

const cryptoRand = (maxExclusive: number): number => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % maxExclusive
}

const randomBool = (trueRate = 0.5): boolean => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] / 0xffffffff) < trueRate
}

// 1) 单抽：优先避开用户今天已抽过的牌，若全部用尽再回退全牌池
export function drawCard(userId: string, existingTodayCards: string[], deckIds: string[]): DrawResult {
  if (!userId) throw new Error('userId is required')
  if (!deckIds.length) throw new Error('deckIds is empty')

  const used = new Set(existingTodayCards)
  const candidate = deckIds.filter((id) => !used.has(id))
  const pool = candidate.length > 0 ? candidate : deckIds

  const cardId = pool[cryptoRand(pool.length)]
  return {
    cardId,
    isReversed: randomBool(0.48), // 轻微偏向正位，体验更积极
  }
}

// 2) 三牌阵：一次随机 3 张且不重复（过去-现在-未来）
export function drawThreeCards(userId: string, deckIds: string[]): ThreeCardSpread {
  if (!userId) throw new Error('userId is required')
  if (deckIds.length < 3) throw new Error('deck size must >= 3')

  const arr = [...deckIds]
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = cryptoRand(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return {
    cards: [
      { position: 'past', cardId: arr[0], isReversed: randomBool() },
      { position: 'present', cardId: arr[1], isReversed: randomBool() },
      { position: 'future', cardId: arr[2], isReversed: randomBool() },
    ],
  }
}

// 3) 调用 AI 解读（Edge Function）
export async function getAIReading(
  card: TarotCard,
  isReversed: boolean,
  userQuestion: string
): Promise<string> {
  if (!userQuestion.trim()) throw new Error('请输入你的问题')

  const { data, error } = await supabase.functions.invoke('tarot-reading', {
    body: {
      cardId: card.id,
      isReversed,
      userQuestion,
    },
  })

  if (error) throw error
  if (!data?.reading) throw new Error('AI 返回为空')
  return data.reading as string
}
```

实现要点（建议落地）：

- 前端抽牌只用于动画和即时反馈，最终结果以服务端入库为准（防前端伪造）。
- `existingTodayCards` 建议来自 `tarot_readings` 当天记录（按用户查询）。
- “同一用户同一天同一问题”缓存：由服务端按 `question_hash + date` 命中旧解读，避免重复消耗 AI 配额。

## Edge Function 代码

```ts
// supabase/functions/tarot-reading/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RequestBody = {
  cardId: string
  isReversed: boolean
  userQuestion: string
  userId?: string // 可选，最终以 token user 为准
}

const normalizeQuestion = (q: string) =>
  q.trim().replace(/\s+/g, ' ').slice(0, 500)

const truncate200 = (text: string) => {
  const s = text.trim()
  return s.length <= 200 ? s : s.slice(0, 200)
}

function buildPrompt(input: {
  cardName: string
  orientation: '正位' | '逆位'
  meaning: string
  question: string
}) {
  return `你是“星火校园”里的温暖占卜搭子，不是神棍。

用户问题：${input.question}
卡牌：${input.cardName}
朝向：${input.orientation}
牌义：${input.meaning}

请输出 120-200 字中文解读，要求：
1) 语气温暖、具体、友好，贴近大学生语境；
2) 避免宿命论，不制造恐惧；
3) 重点给出可执行的小建议（学习/社交/情绪管理）；
4) 不要出现“你一定会”“注定”这类绝对表述；
5) 只输出解读正文，不要标题和列表。`
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 320,
      },
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`Gemini error ${resp.status}: ${detail}`)
  }

  const data = await resp.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini empty response')
  return text as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!supabaseUrl || !serviceKey || !geminiApiKey) {
      throw new Error('Missing required env vars')
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')

    const { data: userData, error: authError } = await admin.auth.getUser(token)
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Auth failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = userData.user.id

    const body = (await req.json()) as RequestBody
    if (!body?.cardId || typeof body.isReversed !== 'boolean' || !body.userQuestion?.trim()) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedQuestion = normalizeQuestion(body.userQuestion)

    // 1) 同用户、同一天、同问题缓存命中（不重复调用 AI）
    const { data: cacheRows, error: cacheError } = await admin.rpc('find_today_cached_tarot_reading', {
      p_user_id: userId,
      p_question: normalizedQuestion,
      p_tz: 'Asia/Shanghai',
    })

    if (cacheError) throw cacheError
    const cached = cacheRows?.[0]

    if (cached?.ai_reading) {
      return new Response(JSON.stringify({
        reading: cached.ai_reading,
        cached: true,
        usageFeature: 'tarot_reading',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) 配额检查（每日 3 次，feature='tarot_reading'）
    const { data: quotaData, error: quotaError } = await admin.rpc('consume_feature_quota', {
      p_user_id: userId,
      p_feature: 'tarot_reading',
      p_daily_limit: 3,
    })

    if (quotaError) throw quotaError
    const quota = quotaData?.[0]
    if (!quota?.allowed) {
      return new Response(JSON.stringify({
        error: '今日塔罗解读次数已用完（3次）',
        usage: quota?.usage_count ?? 3,
        limit: quota?.daily_limit ?? 3,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) 查询卡牌信息
    const { data: card, error: cardError } = await admin
      .from('tarot_cards')
      .select('id, name_zh, upright_meaning, reversed_meaning')
      .eq('id', body.cardId)
      .eq('is_active', true)
      .single()

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4) 调用 Gemini Flash
    const meaning = body.isReversed ? card.reversed_meaning : card.upright_meaning
    const prompt = buildPrompt({
      cardName: card.name_zh,
      orientation: body.isReversed ? '逆位' : '正位',
      meaning,
      question: normalizedQuestion,
    })

    const aiText = await callGemini(geminiApiKey, prompt)
    const finalReading = truncate200(aiText)

    // 5) 入库
    const { error: insertError } = await admin
      .from('tarot_readings')
      .insert({
        user_id: userId,
        card_id: body.cardId,
        is_reversed: body.isReversed,
        user_question: normalizedQuestion,
        ai_reading: finalReading,
        ai_provider: 'gemini-1.5-flash',
        cache_hit: false,
        spread_type: 'single',
      })

    if (insertError) throw insertError

    return new Response(JSON.stringify({
      reading: finalReading,
      cached: false,
      usage: quota.usage_count,
      limit: quota.daily_limit,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

> 说明：`question_hash` 已在数据库层统一生成，Edge Function 通过 `rpc(find_today_cached_tarot_reading)` 命中缓存，避免运行时手动 hash 带来的兼容问题。

## 动画实现方案

1. 进入页面“神秘登场”：
   - 容器先 `opacity:0; transform: translateY(14px) scale(.98)`。
   - 挂载后加 `.is-ready`，过渡到 `opacity:1; transform: none`，时长 `480ms`，`cubic-bezier(.22,.61,.36,1)`。
   - 叠加背景层 `radial-gradient` + 轻微 blur，做“空间感”。

2. 多张牌扇形排布（CSS transform 计算）：
   - 设总展开角 `fanAngle = 36deg`，起始角 `start = -fanAngle / 2`。
   - 第 `i` 张角度：`angle = start + i * (fanAngle / (count - 1))`。
   - 位置：
     - `x = radius * sin(angleRad)`
     - `y = abs(radius * (1 - cos(angleRad))) * 0.45`
   - 变换：`translate(x, y) rotate(angle)`，中心牌 `z-index` 最高。

3. 洗牌动画：
   - MVP 不需要 `@vueuse/gesture`，纯 CSS + JS 定时器足够（成本低、可控）。
   - 关键帧：
     - `shuffle-left/right`: 左右交错平移 + 轻旋转；
     - `shuffle-stack`: z-index 轮换模拟“切牌”；
     - 结束后回到扇形布局。
   - 如后续做移动端“摇一摇抽牌”，再引入手势库更合适。

## 性能优化建议

1. 卡牌图片（22~78 张）懒加载：
   - 使用 `<img loading="lazy" decoding="async">` + `IntersectionObserver`。
   - 首屏仅预加载：牌背图 + 当前抽中的 1~3 张。
   - 图片格式优先 WebP/AVIF，控制单张 80~150KB（移动端体验更稳）。

2. AI 解读缓存：
   - 服务端缓存键：`(user_id, question_hash, local_date)`。
   - 命中后直接返回 `ai_reading`，不再调用 AI，也不再消耗配额。
   - 前端再做会话级缓存（如 `Map`）避免重复请求同结果页面。

3. Supabase Storage vs 内嵌 SVG：
   - Storage（推荐）：
     - 优点：更适合 22~78 张复杂牌面，CDN 缓存好，替换素材方便。
     - 缺点：需要管理 Bucket 与权限、版本控制稍复杂。
   - 内嵌 SVG：
     - 优点：可主题化染色、体积可能小、打包后离线可用。
     - 缺点：复杂插画开发成本高，初期美术压力大。
   - 结论：MVP 用 Storage；后续若要“可主题化卡背”，可补充 SVG 卡背层。

## 代码实现风险点

1. 管理员写权限依赖 JWT 声明：
   - 若 `app_metadata.role=admin` 没配好，会导致运营无法维护卡牌。

2. 配额并发竞争：
   - 若不用原子函数（`consume_feature_quota`），高并发可能“超扣次数”。

3. 缓存语义冲突：
   - “同问题复用解读”会让用户第二次抽牌结果看起来“没变化”，需在 UI 提示“已命中今日同题缓存”。

4. 合规与内容边界：
   - 必须在 UI 和 Prompt 中明确“娱乐与心理建议”定位，避免宿命论、医疗/法律/伤害建议。

5. 素材版权风险：
   - 塔罗牌图若来自网络，需核验商用授权；优先自制或可商用资源。

6. 路由与联动一致性：
   - 当前路由已预留 `/app/tarot`，分享到校园墙时建议带 `post.category='tarot'` 便于后续筛选与审核。
