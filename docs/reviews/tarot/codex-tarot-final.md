# 星火卡罗牌终审报告

> 终审时间：2026-03-25  
> 终审角色：Codex  
> 结论摘要：星火卡罗牌的正确做法不是重新发明一套“校园玄学系统”，而是做一个基于传统塔罗骨架、用校园语境重新包装的轻娱乐 AI 指引功能。MVP 必须收敛到 22 张大阿尔卡纳、独立页面、服务端抽牌、每日 3 次配额、AI 解读、历史记录和校园墙分享，先把闭环跑通，再谈自创牌组和社交玩法扩张。

## 一、关键分歧裁决

| 分歧点 | 选项A | 选项B | 我的裁决 | 理由 |
|--------|-------|-------|----------|------|
| 卡牌体系 | 传统 78 张塔罗 | 自创校园主题卡 | **MVP 采用传统塔罗骨架，但只做 22 张大阿尔卡纳；校园主题卡延后到 v1.1 扩展包** | 78 张完整牌组对素材、文案、测试成本过高；完全自创牌组又会损失用户认知与可信度。22 张大阿尔卡纳兼顾认知基础、神秘感和落地速度，是最稳妥的中间解。 |
| 功能形式 | 独立页面 | 嵌入首页 / Modal | **独立页面** | 该功能需要完整的沉浸感、翻牌动画、结果展示和分享出口，Modal 会压缩解读内容，也不利于后续扩展历史记录和分享卡。仓库中 `/app/tarot` 路由已预留，直接承接最合理。 |
| 抽牌前是否必须提问 | 必须输入问题 | 可随缘一抽 | **支持两种模式，默认引导提问，但不强制** | 强制提问会显著提高首次使用门槛；完全无问题输入又会弱化个性化价值。最终方案应是“推荐提问 + 支持随缘一抽”，分别对应“问题解读”和“今日指引”。 |
| 牌面视觉风格 | 赛博朋克星空 | 中国水墨星火 | **以赛博朋克星空为主，少量融入东方星火细节，不采用纯水墨主视觉** | 项目整体调性已经明确偏 AI、星火、暗色、未来感。纯水墨会破坏产品统一性，且商业化视觉可扩展性弱。东方元素适合作为点缀，而不是主骨架。 |
| MVP 卡牌数量 | 22 张（大阿尔卡纳） | 自定义 30 张校园牌 | **22 张大阿尔卡纳** | 22 张足够表达完整情绪光谱，能支撑单张抽牌 MVP；30 张自定义牌需要额外命名、牌义、素材与世界观解释，风险高且收益不成正比。 |

## 二、共识整合：强烈推荐必须实现清单

1. 使用 `/app/tarot` 独立页面，不做首页内嵌弹窗版。
2. MVP 仅上线 22 张大阿尔卡纳，每张牌保留正位/逆位与校园化文案。
3. 提供“输入问题抽牌”和“随缘一抽”双模式，默认推荐输入问题。
4. 抽牌随机性和逆位判定必须由服务端完成，前端只负责动画表现。
5. 复用 `api_usage_logs`，但必须增加 `feature` 维度，并用数据库原子函数处理每日 3 次配额。
6. 同一用户、同一天、同一问题的解读支持缓存，缓存命中不重复消耗 AI 配额。
7. AI 输出必须是温暖、非宿命论、非医疗/法律/伤害建议的“娱乐型心理指引”。
8. MVP 必须包含结果页、历史记录、基础分享卡和校园墙分享入口。
9. 牌面资源先追求统一和可商用，优先 22 张统一风格素材，不追求首版就做完整原创世界观。
10. 与现有模块至少打通两条联动链路：校园墙分享、日程跳转。

## 三、星火卡罗牌完整设计文档

## 功能定位

星火卡罗牌是星火校园中的轻娱乐 AI 指引功能。它不承担“预测未来”的严肃占卜角色，而是借助传统塔罗的象征体系，为大学生在学业、感情、社交和自我状态问题上提供一种更有情绪价值、更容易传播的“抽牌 + 解读 + 行动建议”体验。它的产品价值不在玄学本身，而在于低门槛情绪陪伴、校园语境表达、分享传播和与现有模块形成联动。

## 卡牌体系

- MVP 卡组：22 张大阿尔卡纳。
- 表达方式：保留正位 / 逆位，但前端文案可使用“正向能量 / 提醒能量”降低理解门槛。
- 文案策略：牌名与基础含义保持传统，补充 `campus_context` 字段，把牌义翻译成校园生活语境。
- 首版支持的使用模式：
  - `question`：用户输入问题，获得针对性解读。
  - `daily`：用户不输入问题，获得“今日指引”。
- 延后到 v1.1 的能力：
  - 12 张原创校园扩展牌。
  - 三牌阵。
  - 好友互抽。
  - 会员权益与明日预告。

## 核心流程

1. 用户进入 `/app/tarot`。
2. 用户选择“输入问题抽牌”或“随缘一抽”。
3. 前端展示洗牌和翻牌动画，但不自行决定结果。
4. 前端调用 `supabase/functions/tarot-reading`。
5. Edge Function 校验身份、检查缓存、扣减配额、服务端随机抽牌、调用 AI、写入 `tarot_readings`。
6. 前端展示牌面、解读正文、一个可执行的小建议。
7. 用户继续执行以下任一动作：
   - 分享到校园墙。
   - 生成分享卡。
   - 查看历史记录。
   - 若问题为学业 / 目标类，一键跳转日程创建提醒。

## 数据模型（完整建表 SQL，含 `tarot_cards` + `tarot_readings` + RLS）

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() ->> 'role', '') IN ('service_role', 'supabase_admin');
$$;

CREATE TABLE IF NOT EXISTS public.tarot_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_no INT NOT NULL UNIQUE CHECK (card_no BETWEEN 0 AND 21),
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  arcana_type TEXT NOT NULL DEFAULT 'major' CHECK (arcana_type = 'major'),
  image_url TEXT NOT NULL,
  upright_meaning TEXT NOT NULL,
  reversed_meaning TEXT NOT NULL,
  campus_context TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.tarot_cards(id) ON DELETE RESTRICT,
  reading_mode TEXT NOT NULL DEFAULT 'question' CHECK (reading_mode IN ('question', 'daily')),
  spread_type TEXT NOT NULL DEFAULT 'single' CHECK (spread_type IN ('single')),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  user_question TEXT,
  question_hash TEXT GENERATED ALWAYS AS (
    CASE
      WHEN user_question IS NULL OR btrim(user_question) = '' THEN NULL
      ELSE md5(lower(regexp_replace(btrim(user_question), '\s+', ' ', 'g')))
    END
  ) STORED,
  question_category TEXT,
  ai_reading TEXT,
  ai_provider TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  shared_to_wall BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

ALTER TABLE public.tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_public_read'
  ) THEN
    CREATE POLICY tarot_cards_public_read
      ON public.tarot_cards
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_insert'
  ) THEN
    CREATE POLICY tarot_cards_admin_insert
      ON public.tarot_cards
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_update'
  ) THEN
    CREATE POLICY tarot_cards_admin_update
      ON public.tarot_cards
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_cards' AND policyname = 'tarot_cards_admin_delete'
  ) THEN
    CREATE POLICY tarot_cards_admin_delete
      ON public.tarot_cards
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_select'
  ) THEN
    CREATE POLICY tarot_readings_own_select
      ON public.tarot_readings
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_insert'
  ) THEN
    CREATE POLICY tarot_readings_own_insert
      ON public.tarot_readings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_update'
  ) THEN
    CREATE POLICY tarot_readings_own_update
      ON public.tarot_readings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarot_readings' AND policyname = 'tarot_readings_own_delete'
  ) THEN
    CREATE POLICY tarot_readings_own_delete
      ON public.tarot_readings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_schedule_import';

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
  INSERT INTO public.api_usage_logs (id, user_id, feature, usage_date, usage_count, daily_limit)
  VALUES (uuid_generate_v4(), p_user_id, p_feature, p_usage_date, 0, p_daily_limit)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  UPDATE public.api_usage_logs
  SET
    usage_count = usage_count + 1,
    daily_limit = p_daily_limit,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND feature = p_feature
    AND usage_date = p_usage_date
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
    AND l.usage_date = p_usage_date;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_feature_quota(UUID, TEXT, INT, DATE)
TO authenticated, service_role;

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
```

### 建表与种子数据执行说明

- 现有仓库中的 `docs/database/ai_import_tables.sql` 里，`api_usage_logs` 仍是 `UNIQUE(user_id, usage_date)`，没有 `feature` 字段。这个迁移必须真实执行，不能只写在设计稿里。
- 卡牌种子数据不要走管理后台首录，直接新增 `docs/database/seed_tarot_cards.sql`，一次性写入 22 张大阿尔卡纳。
- `tarot_cards.image_url` 首版只要求可稳定访问、风格统一，不要求一次到位做成完整高定插画体系。

## AI解读 Prompt 模板（最终版）

```text
你是“星火校园”里的卡罗牌解读搭子。你提供的是轻娱乐、心理支持和行动建议，不是预言、宗教裁决或医学法律意见。

【产品边界】
1. 禁止宿命论、恐吓式表达、绝对化判断。
2. 禁止鼓励伤害自己或他人，禁止违法、色情、赌博、极端、政治敏感内容。
3. 遇到明显的心理危机、伤害风险、医疗或法律问题时，不做塔罗式判断，只温和建议用户尽快寻求专业帮助。
4. 输出必须贴近大学生语境，但不要油腻、不要故作玄虚。

【输入】
- 模式：{reading_mode}  // question 或 daily
- 用户问题：{user_question_or_empty}
- 卡牌名：{card_name_zh}
- 朝向：{orientation}
- 基础牌义：{base_meaning}
- 校园语境：{campus_context}
- 关键词：{keywords}

【输出要求】
1. 只输出中文正文，不要标题，不要列表，不要 Markdown。
2. 总长度 140 到 220 字。
3. 结构上依次包含：
   - 先解释这张牌此刻代表什么；
   - 再结合用户问题或“今日指引”场景给出具体理解；
   - 最后给一个今天就能执行的小建议。
4. 语气温暖、具体、克制，允许有一点神秘感，但不能像神棍。
5. 避免使用“注定”“一定会”“命中注定”“你必须”等表达。

【输出风格示例】
这张牌更像是在提醒你把注意力从结果焦虑拉回到眼前能做的事。就你现在关心的这件事来说，局面并没有你想得那么失控，真正决定走向的还是你接下来一两天的节奏和选择。别急着给自己下结论，先把最关键的一步补齐，比如把今晚最想逃避的那件小事做完，你会立刻稳下来。
```

## Edge Function 设计（`supabase/functions/tarot-reading`）

**输入**

```json
{
  "readingMode": "question",
  "userQuestion": "这次高数期中能稳住吗？"
}
```

或

```json
{
  "readingMode": "daily"
}
```

**输出**

```json
{
  "readingId": "uuid",
  "card": {
    "id": "uuid",
    "cardNo": 7,
    "nameZh": "战车",
    "imageUrl": "..."
  },
  "isReversed": false,
  "reading": "......",
  "cached": false,
  "usage": 1,
  "limit": 3
}
```

**执行流程**

1. 校验 `Authorization`，通过 `auth.getUser(token)` 确认当前用户。
2. 校验请求体：
   - `readingMode` 仅允许 `question` 或 `daily`。
   - `question` 模式必须有 1 到 500 字问题。
   - `daily` 模式问题为空。
3. 若为 `question` 模式，先调用 `find_today_cached_tarot_reading` 查询同题缓存；命中则直接返回，不扣配额。
4. 调用 `consume_feature_quota(user_id, 'tarot_reading', 3)` 原子扣减每日 3 次配额。
5. 从 `public.tarot_cards` 中服务端随机抽取一张启用中的卡：
   - `ORDER BY random() LIMIT 1`
   - `is_reversed` 建议 40% 概率为 `true`。
6. 用卡牌信息构建 Prompt，调用 Gemini Flash。
7. 将结果写入 `tarot_readings`。
8. 返回卡牌、朝向、AI 解读、配额信息。

**关键裁决**

- 前端不得上传 `cardId` 作为最终结果。前端只负责动画，服务端负责真实抽牌结果。
- `daily` 模式不做“固定今日全校同牌”机制，避免人为制造重复感；如果后续要做“今日星火牌”，放到 v1.1。
- 错误返回要清晰区分 401、400、429、500。

## 牌面资源方案（MVP 如何快速获得牌面图）

**最终方案：双轨制**

### 主方案

- 先做 22 张统一风格的 AI 生成牌面。
- 风格基线：深蓝紫底色、星火橙高光、赛博星空氛围、轻几何边框。
- 每张牌使用统一 Prompt 模板，只替换牌名和主体意象。
- 导出为 WebP，建议单张控制在 100 KB 到 180 KB。

### 兜底方案

- 如果 22 张 AI 生成素材来不及统一到可上线水平，则临时改用可商用 / 公版塔罗图，外加统一品牌卡框、滤镜和标题条。
- 无论选哪条路径，都要先做版权归档，不允许“临时网上找图先上”。

### 不建议的方案

- MVP 直接做 30 张校园原创牌。
- MVP 追求纯水墨国风重绘。
- MVP 做 78 张完整全量牌面。

## API 配额设置（复用 `api_usage_logs`，每日 3 次）

- `feature` 统一使用 `tarot_reading`。
- 每个用户每日上限 3 次。
- 缓存命中不扣次数。
- `api_usage_logs` 当前在仓库中仍是单功能结构，必须迁移为 `(user_id, feature, usage_date)` 唯一。
- 前端文案不要写“次数用尽”，要写“今日解读额度已用完，明天再来抽一张”，保留温和气氛。

## 路由方案（`/app/tarot` or `/app/fortune`）

**裁决：使用 `/app/tarot`。**

原因如下：

1. 语义更明确，用户认知成本更低。
2. 仓库里 `frontend/src/router/index.ts` 已经预留 `/app/tarot`，当前仅指向 `Placeholder.vue`。
3. `frontend/src/pages/app/AppHome.vue` 和 `frontend/src/pages/app/AppLayout.vue` 已经存在 `/app/tarot` 入口，不需要新增导航结构。
4. `/app/fortune` 过于宽泛，未来若接星座、签文、心测，反而会命名冲突。

## 与现有模块联动（校园墙分享、日程跳转）

### 校园墙分享

- 结果页提供“一键分享到校园墙”。
- 默认隐藏原始问题，仅分享牌面、简短解读和一句心情文案。
- 用户手动开启时才显示问题全文。
- 发帖时建议增加 `category='tarot'` 或等价标记，方便后续审核与筛选。

### 日程跳转

- 当 `question_category` 属于 `study`、`goal`、`exam` 时，在结果页底部显示“把建议加入日程”。
- 跳转形式建议沿用现有日程页能力：
  - `/app/schedule?action=create&title=复习提醒&source=tarot&readingId=xxx`
- 不做复杂自动写日程，先做预填表单。

### 后续可扩展联动

- AI 聊天中识别“帮我抽一张牌”，调用同一 Edge Function。
- 个人中心展示“最近 7 天抽牌次数”和“最近一张守护牌”。
- 这些都不属于 MVP 必做项。

## 四、反重力最终开发指令

```text
━━━━━━━━━━━━━━━━━━━━━━━━
【前置步骤】
━━━━━━━━━━━━━━━━━━━━━━━━
1. 在 Supabase SQL Editor 执行终审版 SQL：
   - 新建 public.tarot_cards
   - 新建 public.tarot_readings
   - 为 api_usage_logs 增加 feature 字段
   - 创建 consume_feature_quota / find_today_cached_tarot_reading 两个函数
   - 开启并验证 RLS

2. 新建 docs/database/seed_tarot_cards.sql
   - 只初始化 22 张大阿尔卡纳
   - 每张牌写入：card_no, name_zh, name_en, image_url, upright_meaning, reversed_meaning, campus_context, keywords

3. 检查前端路由现状
   - frontend/src/router/index.ts 已存在 /app/tarot
   - 当前指向 Placeholder.vue
   - 不要重复新增路由，只替换页面组件

4. 新建 Edge Function
   - 路径：supabase/functions/tarot-reading/index.ts
   - 功能：鉴权、缓存检查、配额扣减、服务端抽牌、AI 解读、记录入库

━━━━━━━━━━━━━━━━━━━━━━━━
【开发任务（Day 1-3 MVP）】
━━━━━━━━━━━━━━━━━━━━━━━━
Day 1：数据层 + 页面骨架
- 落库 SQL 与种子数据
- 创建 Tarot 页面组件，替换 Placeholder
- 完成页面基础布局：标题、模式切换、输入框、抽牌按钮、结果区空态
- 接好基础样式，风格采用暗色星空 + 星火高光

Day 2：抽牌交互 + AI 解读
- 前端加入洗牌 / 翻牌动画
- 调用 supabase/functions/tarot-reading
- 结果页展示牌面、正逆位、解读正文
- 处理 loading / error / quota exhausted / cached 命中提示

Day 3：分享 + 历史 + 配额体验
- 历史记录列表页或同页历史抽屉
- 分享卡生成与分享到校园墙
- 学业类问题增加“加入日程”跳转
- 完成每日 3 次限制文案与交互

━━━━━━━━━━━━━━━━━━━━━━━━
【关键实现细节】
━━━━━━━━━━━━━━━━━━━━━━━━
1. 前端不能决定 cardId。服务端才是唯一真实结果来源。
2. 支持两种模式：
   - question：必须输入问题
   - daily：不输入问题，走今日指引
3. 缓存只针对 question 模式：
   - 同用户
   - 同一天
   - 同问题
   - 命中后直接复用 ai_reading
4. AI 输出必须是连续正文，140-220 字，不要标题和列表。
5. 结果页至少保留三个动作：
   - 再抽一张
   - 分享
   - 查看历史
6. 分享到校园墙时默认隐藏问题全文，避免隐私泄露。
7. `api_usage_logs` 的现有逻辑有并发漏洞，必须改成数据库原子扣减。
8. 当前仓库首页和侧边栏已经有 `/app/tarot` 入口，不要重复造导航。

━━━━━━━━━━━━━━━━━━━━━━━━
【风险点与注意事项】
━━━━━━━━━━━━━━━━━━━━━━━━
1. 合规风险
   - 全站文案统一定义为娱乐和心理指引
   - 不做预测式承诺
   - 对心理危机、违法、医疗、法律问题做拒答和转介

2. 性能风险
   - 首屏只加载牌背和当前结果图
   - 历史记录图片懒加载
   - 低性能设备动画可降级

3. 数据风险
   - RLS 必须确保 tarot_readings 仅本人可读写
   - service role 仅用于 Edge Function

4. 版权风险
   - 牌面素材必须有可商用来源
   - 不允许直接抓取网络塔罗图上线

5. 体验风险
   - 不要把限制提示写得像报错
   - 不要把 UI 做成宗教感或恐怖感
   - 不要在 MVP 塞入三牌阵、好友互抽、会员弹窗
```

## 五、综合评分

| 维度 | 满分 | 得分 | 说明 |
|------|------|------|------|
| 产品创意与差异化 | 20 | 18 | “校园语境 + AI 解读 + 分享传播”方向成立，但前提是坚持传统塔罗骨架，不要把差异化做成世界观负担。 |
| 技术可行性 | 20 | 18 | 现有 Vue + Supabase 架构完全能承接，且 `/app/tarot` 路由已预留；真实难点主要在配额迁移和服务端抽牌细节。 |
| 用户体验设计 | 20 | 18 | iflow 提供了足够强的仪式感和分享感，但 MVP 需要克制，先保留翻牌、结果页、分享，不要一次做满所有动效。 |
| 系统完整性 | 20 | 17 | Copilot 和 OpenCode 的数据层、RLS、配额、缓存方案较完整；当前不足是仓库现状还未完成 `feature` 迁移和 Edge Function 实装。 |
| 商业价值 | 20 | 16 | 它更适合作为留存和传播功能，而不是直接营收功能。短期价值在用户活跃和分享裂变，商业化要放后面。 |
| **总分** | **100** | **87** | 方向值得做，且适合以 3 天 MVP 先落地验证。关键在于控制范围、避免自创过度、优先跑通闭环。 |

## 六、终审备注

### 本次明确暂缓的内容

- 78 张完整牌组。
- 30 张校园原创主牌体系。
- 三牌阵。
- 好友互抽。
- 会员付费弹窗。
- 明日运势预告。
- 全校同款每日牌。

### 最终一句话决策

先做一个“传统塔罗骨架 + 校园语境包装 + 服务端抽牌 + AI 解读 + 分享联动”的收敛 MVP；不要把第一版做成大而散的世界观工程。
