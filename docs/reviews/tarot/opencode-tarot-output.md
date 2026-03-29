# 星火卡罗牌系统设计评审报告

> 本报告基于对星火校园项目的全面分析，包括现有数据库架构、路由配置、AI配额管理方案等技术文档的深度学习，从系统完整性、安全性、可扩展性等多维度给出专业评审意见。

## 一、系统设计漏洞与修复建议

### 1.1 卡牌数据初始化方案

**核心问题**：78张塔罗牌数据如何高效入库？

**现状分析**：现有数据库schema中并未包含`tarot_cards`表，这意味着需要新建表来存储卡牌数据。通过对现有项目结构的分析，建议采用SQL Seed脚本方案，原因如下。

**推荐方案**：创建`docs/database/seed_tarot_cards.sql`脚本文件，包含78张韦特塔罗牌的完整数据。脚本应包含卡牌ID（基于逆位编号体系）、卡牌名称（中文与英文对照）、卡牌正位含义、卡牌逆位含义、卡牌关键词、对应元素与星座关联、基础图像描述等字段。采用SQL脚本而非管理后台的优势在于：首先，78张牌的元数据相对固定，一次性写入即可，无需频繁管理；其次，SQL脚本便于版本控制，与项目代码一起管理更符合GitOps理念；第三，便于后续数据迁移和快速重建。

**建议的表结构**：

```sql
CREATE TABLE IF NOT EXISTS tarot_cards (
  id INT PRIMARY KEY,                          -- 卡牌编号（0-77）
  name_cn VARCHAR(50) NOT NULL,                 -- 中文名称
  name_en VARCHAR(50) NOT NULL,                 -- 英文名称
  name_alt VARCHAR(50),                         -- 别名
  card_type VARCHAR(20) NOT NULL,               -- 大阿尔卡纳/权杖/圣杯/宝剑/ pentacles
  upright_meaning TEXT NOT NULL,               -- 正位含义
  reversed_meaning TEXT NOT NULL,              -- 逆位含义
  keywords TEXT[],                              -- 关键词标签
  element VARCHAR(20),                          -- 对应元素
  zodiac_sign VARCHAR(20),                      -- 对应星座
  image_url TEXT,                              -- 卡牌图像URL
  description TEXT,                            -- 详细描述
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tarot_cards_type ON tarot_cards(card_type);
CREATE INDEX idx_tarot_cards_element ON tarot_cards(element);
```

**实施建议**：在项目初始化时通过Supabase CLI执行seed脚本，或在应用首次加载时通过Edge Function自动检测并初始化数据。

### 1.2 每日限额机制的并发问题

**核心问题**：复用`api_usage_logs`表是否存在Race Condition？

**现状分析**：现有`api_usage_logs`表采用`UNIQUE(user_id, usage_date)`约束保证每日唯一记录，但业务逻辑需要在应用层实现**查询-判断-写入**的三步操作。这一操作序列在高频并发场景下存在明显漏洞：当用户快速点击多次时，多个请求可能同时通过限额检查，导致实际使用次数超出限制。

**技术风险评估**：虽然学生用户的实际使用频率较低（每日3次），极端情况下仍可能出现并发问题。更重要的是，现有方案缺乏原子性操作保障，在分布式部署场景下风险更高。

**推荐修复方案**：采用数据库层面的原子操作，使用`INSERT ... ON CONFLICT`配合计数器更新：

```sql
-- 原子化限额检查与扣减（推荐在Edge Function中实现）
CREATE OR REPLACE FUNCTION check_and_use_tarot_quota(p_user_id UUID, p_feature VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INT;
  v_limit INT;
  v_result BOOLEAN := FALSE;
BEGIN
  -- 获取功能对应的限额配置
  v_limit := CASE p_feature
    WHEN 'tarot_reading' THEN 3
    WHEN 'ai_schedule_import' THEN 5
    ELSE 10
  END;
  
  -- 原子操作：更新计数并返回结果
  INSERT INTO api_usage_logs (user_id, usage_date, usage_count, daily_limit, feature)
    VALUES (p_user_id, CURRENT_DATE, 1, v_limit, p_feature)
  ON CONFLICT (user_id, usage_date, feature) 
    DO UPDATE SET usage_count = api_usage_logs.usage_count + 1
  WHERE api_usage_logs.usage_count < v_limit
  RETURNING (SELECT usage_count FROM api_usage_logs 
             WHERE user_id = p_user_id AND usage_date = CURRENT_DATE AND feature = p_feature) <= v_limit
    INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**替代方案**：如果不想修改数据库逻辑，也可以在应用层使用分布式锁（如Redis分布式锁）来保证原子性，但会增加系统复杂度。综合评估，建议采用数据库原子操作方案。

### 1.3 抽牌随机性的服务端保障

**核心问题**：前端抽牌是否存在伪造风险？

**技术分析**：如果抽牌逻辑完全在前端实现，用户可以通过修改JavaScript代码或拦截网络请求来伪造抽牌结果。这种风险虽然对于娱乐性质的功能影响有限，但从系统完整性角度，仍建议在服务端实现随机性保障。

**推荐方案**：采用服务端抽牌模式。用户点击抽牌时，前端发送请求到Edge Function，服务端从78张牌中随机选取对应数量的卡牌（单张或三张），将结果返回前端。这一方案的优势在于：首先，随机性由服务端保障，用户无法篡改；其次，便于记录抽牌历史用于后续分析；第三，便于实现防刷机制（如记录IP、设备指纹等）。

**技术实现要点**：在Edge Function中使用PostgreSQL的`RANDOM()`函数配合`ORDER BY RANDOM() LIMIT n`实现随机抽取，同时记录抽牌元数据到`tarot_readings`表。

### 1.4 三牌阵与单牌抽取的数据模型差异

**设计考量**：三牌阵（过去/现在/未来）与单牌抽取在数据存储层面应保持统一设计，通过字段区分。

**推荐设计**：

```sql
CREATE TABLE IF NOT EXISTS tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 抽牌类型
  reading_type VARCHAR(20) NOT NULL CHECK (reading_type IN ('single', 'three_card', 'celtic_cross', 'custom')),
  
  -- 抽取的卡牌（JSON数组存储）
  drawn_cards JSONB NOT NULL,
  -- 格式示例：[{"card_id": 0, "position": "past"}, {"card_id": 17, "position": "present"}, {"card_id": 21, "position": "future"}]
  
  -- 用户问题（可选）
  user_question TEXT,
  
  -- AI解读
  ai_interpretation TEXT,
  
  -- 解读类型
  interpretation_type VARCHAR(20) DEFAULT 'brief',  -- brief/detailed
  
  -- 状态
  is_shared BOOLEAN DEFAULT FALSE,                   -- 是否已分享到校园墙
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tarot_readings_user ON tarot_readings(user_id);
CREATE INDEX idx_tarot_readings_created ON tarot_readings(created_at DESC);
```

**设计说明**：统一使用`drawn_cards` JSON数组存储抽取的卡牌，通过`reading_type`区分不同牌阵。对于三牌阵，使用`position`字段标注每张牌的位置（过去/现在/未来），这样既保证了数据模型的统一性，又满足不同牌阵的灵活性需求。

---

## 二、安全与合规风险

### 2.1 AI解读内容安全防护

**风险识别**：用户可能输入涉及政治敏感、色情暴力、封建迷信、心理健康等不当内容，要求AI进行解读。塔罗牌占卜本身具有一定的心理暗示作用，如果AI输出不当内容，可能对用户造成负面影响，尤其考虑到产品面向大学生群体，部分用户可能处于心理敏感期。

**防护方案建议**：构建多层防护体系。在Prompt层面，必须在系统提示词中明确内容边界：

```typescript
const tarotSystemPrompt = `你是一位专业的塔罗牌解读师。你的职责是以积极、正面的方式解读塔罗牌，为用户提供心灵指引和正向鼓励。

【内容边界】（必须严格遵守）
1. 绝对禁止：政治敏感话题、色情暴力内容、封建迷信宣传、邪教组织内容
2. 拒绝回答：涉及伤害自己或他人、违法乱纪、诈骗赌博等问题
3. 心理关怀：当用户表达严重负面情绪时，应给予温暖回应并建议寻求专业心理帮助
4. 科学态度：塔罗牌解读应保持娱乐性质，不可声称具有预测未来的能力

【解读风格】
- 积极正面：强调用户的自驱力和积极可能性
- 专业得体：使用优雅、智慧的语言风格
- 心理疏导：通过牌面象征引导用户思考和成长

请根据用户的问题和抽取的卡牌，给出温暖、专业、有启发性的解读。`;
```

在应用层面，增加输入内容预检机制。可以通过关键词匹配或轻量级AI模型对用户输入进行预检，过滤明显违规内容。同时建立用户举报机制，允许用户标记不当解读内容供人工审核。

### 2.2 用户输入安全

**风险识别**：用户输入的问题内容可能存在SQL注入、XSS攻击等安全风险。虽然Supabase的JavaScript客户端默认使用参数化查询，但仍需在前端和后端双重防护。

**防护方案**：在前端使用Vue的`v-html`指令时避免直接渲染用户输入，后端Edge Function中接收用户输入时使用`text()`类型参数而非字符串拼接。对用户输入进行长度限制（建议问题内容不超过500字符），既可防止滥用，也可减少Prompt注入风险。

### 2.3 迷信合规风险

**合规分析**：塔罗牌占卜涉及传统文化中的迷信元素，在面向公众的互联网产品中需要特别注意。根据中国相关法律法规，互联网信息服务不得宣扬迷信思想。面向大学生群体，虽然属于成年人，但产品形象和合规性仍需重视。

**合规建议**：在产品设计中明确塔罗牌的**娱乐定位**，避免过度神化其预测能力。在用户协议和隐私政策中增加相关说明。AI解读内容应强调**心理疏导和自我反思**的价值，而非预测未来。在适当位置添加理性消费提示，如“本产品仅供娱乐参考，不可作为重大决策依据”。对于未成年用户（如果产品允许），建议增加适龄提示或限制功能。

---

## 三、数据模型完整方案（含扩展字段）

### 3.1 完整表结构设计

基于对现有数据库schema的分析和对星火卡罗牌功能的深入理解，以下是完整的表结构方案：

```sql
-- =============================================
-- 星火卡罗牌模块 - 数据库表结构
-- =============================================

-- 1. 塔罗卡牌基础数据表（仅包含78张标准卡牌元数据）
CREATE TABLE IF NOT EXISTS tarot_cards (
  id INT PRIMARY KEY,                          -- 卡牌编号（0-77，愚人到世界）
  name_cn VARCHAR(50) NOT NULL,                -- 中文名称
  name_en VARCHAR(50) NOT NULL,               -- 英文名称
  name_alt VARCHAR(50),                       -- 别名/旧译
  category VARCHAR(20) NOT NULL,              -- 大类：major_arcana/minor_arcana
  suit VARCHAR(20),                           -- 小阿尔卡纳花色：wands/cups/swords/coins
  suit_cn VARCHAR(20),                        -- 花色中文：权杖/圣杯/宝剑/金币
  number INT,                                 -- 牌面数字（1-10）
  upright_meaning TEXT NOT NULL,               -- 正位核心含义
  reversed_meaning TEXT NOT NULL,             -- 逆位核心含义
  keywords TEXT[],                            -- 关键词标签（数组）
  element VARCHAR(20),                        -- 对应元素
  zodiac_sign VARCHAR(20),                   -- 对应星座
  keywords_positive TEXT[],                   -- 积极解读关键词
  keywords_negative TEXT[],                   -- 需要注意的解读
  image_url TEXT,                             -- 卡牌图像URL
  thumbnail_url TEXT,                         -- 缩略图URL
  description TEXT,                           -- 详细描述/故事背景
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 主题卡组表（支持扩展）
CREATE TABLE IF NOT EXISTS tarot_card_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,                -- 卡组名称
  name_en VARCHAR(100),                      -- 英文名称
  description TEXT,                          -- 卡组描述
  cover_image TEXT,                          -- 封面图
  card_ids INT[],                            -- 包含的卡牌ID数组
  is_limited BOOLEAN DEFAULT FALSE,          -- 是否限定卡组
  valid_from DATE,                           -- 有效期开始
  valid_until DATE,                          -- 有效期结束
  is_premium BOOLEAN DEFAULT FALSE,          -- 是否付费/会员专属
  sort_order INT DEFAULT 0,                 -- 排序权重
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 占卜记录表
CREATE TABLE IF NOT EXISTS tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 卡组信息
  card_set_id UUID REFERENCES tarot_card_sets(id),  -- 使用的卡组
  
  -- 抽牌类型
  reading_type VARCHAR(20) NOT NULL,         -- single/three_card/celtic_cross/custom
  position_labels JSONB,                     -- 位置标签定义
  
  -- 抽取的卡牌
  drawn_cards JSONB NOT NULL,                -- [{"card_id": 0, "position": "past", "is_reversed": false}]
  
  -- 用户问题
  user_question TEXT,                        -- 用户的问题（可选）
  question_category VARCHAR(20),              -- 问题分类：love/career/study/health/general
  
  -- AI解读
  ai_interpretation TEXT,                    -- 完整AI解读
  ai_interpretation_brief TEXT,              -- 简要解读（用于分享）
  interpretation_tokens INT,                 -- 解读使用的token数
  
  -- 解读状态
  interpretation_status VARCHAR(20) DEFAULT 'pending',  -- pending/processing/completed/failed
  interpretation_error TEXT,                -- 解读失败时的错误信息
  
  -- 分享状态
  is_shared BOOLEAN DEFAULT FALSE,           -- 是否已分享到校园墙
  shared_post_id UUID,                      -- 关联的帖子ID
  
  -- 会话追踪
  session_id VARCHAR(50),                    -- 浏览器会话ID（用于匿名用户）
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ                   -- 解读完成时间
);

-- 4. 分享到校园墙的帖子扩展表（可选，用于特殊展示）
CREATE TABLE IF NOT EXISTS tarot_shared_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id UUID REFERENCES tarot_readings(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  
  -- 分享时截取的解读片段
  excerpt TEXT,                              -- 分享的摘要文字
  cover_card_id INT,                        -- 封面展示的卡牌ID
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 索引
CREATE INDEX idx_tarot_cards_category ON tarot_cards(category);
CREATE INDEX idx_tarot_cards_suit ON tarot_cards(suit);
CREATE INDEX idx_tarot_card_sets_premium ON tarot_card_sets(is_premium) WHERE is_premium = TRUE;
CREATE INDEX idx_tarot_readings_user ON tarot_readings(user_id);
CREATE INDEX idx_tarot_readings_created ON tarot_readings(created_at DESC);
CREATE INDEX idx_tarot_readings_type ON tarot_readings(reading_type);
CREATE INDEX idx_tarot_readings_question_category ON tarot_readings(question_category);
CREATE INDEX idx_tarot_readings_shared ON tarot_readings(is_shared) WHERE is_shared = TRUE;

-- 6. RLS策略
ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_card_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_shared_posts ENABLE ROW LEVEL SECURITY;

-- tarot_cards: 公开可读
CREATE POLICY "tarot_cards_select" ON tarot_cards FOR SELECT USING (true);

-- tarot_card_sets: 公开可读
CREATE POLICY "tarot_card_sets_select" ON tarot_card_sets FOR SELECT USING (true);

-- tarot_readings: 仅自己可读写
CREATE POLICY "tarot_readings_all" ON tarot_readings USING (auth.uid() = user_id);

-- tarot_shared_posts: 关联读写
CREATE POLICY "tarot_shared_posts_all" ON tarot_shared_posts USING (
  EXISTS (SELECT 1 FROM tarot_readings WHERE tarot_readings.id = reading_id AND auth.uid() = user_id)
);
```

### 3.2 扩展字段规划

为支持未来功能扩展，在关键表中预留了扩展字段：

| 表名 | 扩展字段 | 用途说明 |
|------|----------|----------|
| tarot_card_sets | `valid_from`, `valid_until` | 支持节日限定卡（如春节、五四青年节）的时间管理 |
| tarot_card_sets | `is_premium` | 支持付费/会员专属卡组 |
| tarot_card_sets | `card_ids` | 支持自定义卡组（期末运势限定套牌） |
| tarot_readings | `session_id` | 支持未登录用户的临时会话记录 |
| tarot_readings | `question_category` | 支持问题分类统计和趋势分析 |
| tarot_readings | `interpretation_tokens` | 用于AI成本核算和配额追踪 |

---

## 四、AI配额整合方案

### 4.1 现有配额管理分析

根据对`api_usage_logs`表的分析，现有方案采用`feature`字段区分不同功能。但通过检查实际代码发现，现有表结构中**并未包含`feature`字段**，这意味着需要扩展表结构或在业务逻辑中处理。

**问题识别**：现有`api_usage_logs`表只有`user_id`和`usage_date`的联合唯一约束，如果要支持多个功能独立配额，需要添加`feature`字段。这是一次数据库迁移的必要变更。

### 4.2 推荐的配额管理方案

**方案一：扩展现有表结构（推荐）**

```sql
-- 扩展 api_usage_logs 表以支持多功能独立配额
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS feature VARCHAR(50) NOT NULL DEFAULT 'general';

-- 更新唯一约束
ALTER TABLE api_usage_logs DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_usage_date_key;
ALTER TABLE api_usage_logs ADD CONSTRAINT api_usage_logs_unique 
  UNIQUE (user_id, usage_date, feature);
```

此方案的优势在于复用现有表结构，减少代码改动。需要注意原有数据的兼容处理。

**方案二：新建功能专用配额表**

如果希望保持更清晰的功能边界，可以新建`tarot_api_quota`专用表：

```sql
CREATE TABLE IF NOT EXISTS tarot_api_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  readings_count INT DEFAULT 0,
  daily_limit INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);
```

### 4.3 跨功能配额控制

**是否需要全局每日上限？**

分析表明，当前设计下用户每日总AI调用次数 = 日程导入次数（5次）+ 塔罗牌解读次数（3次）= 8次。按照每次调用成本0.01元估算，单用户日成本约0.08元，月成本约2.4元。在产品初期用户量有限的情况下，这一成本是可接受的。

**建议**：暂不设置全局上限，但需要建立监控告警机制。当单用户日调用超过10次或全站日调用超过1000次时触发告警，便于及时调整策略。

### 4.4 配额使用流程

```
用户点击"开始占卜"
    ↓
前端调用 checkQuota Edge Function
    ↓
检查用户当日剩余次数（查询 api_usage_logs）
    ↓
如果有余额 → 允许抽牌 → 抽牌完成后调用 useQuota 扣减次数
    ↓
调用 AI 解读 Edge Function
    ↓
解读完成后记录 token 消耗（可选，用于成本分析）
```

---

## 五、模块整合接口设计

### 5.1 与校园墙（CampusWall）整合

**整合场景**：用户希望将塔罗牌解读分享到校园墙。

**现有数据结构分析**：现有`posts`表包含`author_id`、`content`、`category`、`is_anonymous`等字段，能够满足基本的分享需求。

**扩展方案**：无需修改`posts`表结构，通过在分享内容中嵌入特定格式来实现塔罗牌内容的展示。建议采用以下方案：

在分享时，系统自动生成包含卡牌信息的富文本内容：

```typescript
const generateShareContent = (reading: TarotReading) => {
  const cardEmojis = reading.drawnCards.map(card => 
    getCardEmoji(card.id) // 获取卡牌对应emoji
  ).join(' ');
  
  return `🔮 今日星火占卜 ${cardEmojis}

${reading.question ? `💭 问题：${reading.question}\n\n` : ''}
${reading.briefInterpretation}

——来自星火卡罗牌的智慧指引 ✨`;
};
```

在校园墙展示时，前端组件识别特定格式并渲染为塔罗牌专用样式。

**如果需要更强的整合**：可以在`posts`表添加可选的`metadata`JSONB字段，存储塔罗牌分享的扩展信息（卡牌ID列表、解读类型等），便于后续筛选和统计。

### 5.2 与AI助手（Chat）整合

**整合场景**：用户在AI聊天中说“帮我抽一张塔罗牌”，Chat模块需要调用卡罗牌逻辑。

**接口设计**：建议在`/frontend/src/composables`中创建`useTarot.ts`Composable，供Chat模块调用：

```typescript
// frontend/src/composables/useTarot.ts
import { ref } from 'vue'
import { supabase } from '@/supabase'

export interface TarotCard {
  id: number
  name_cn: string
  name_en: string
  upright_meaning: string
  reversed_meaning: string
  keywords: string[]
}

export interface TarotReading {
  id: string
  reading_type: 'single' | 'three_card'
  drawn_cards: Array<{
    card_id: number
    position: string
    is_reversed: boolean
  }>
  user_question?: string
  ai_interpretation?: string
}

export function useTarot() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // 抽牌
  const drawCards = async (type: 'single' | 'three_card', question?: string): Promise<TarotReading | null> => {
    isLoading.value = true
    error.value = null
    
    try {
      // 调用 Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('tarot-draw', {
        body: { reading_type: type, user_question: question }
      })
      
      if (fnError) throw fnError
      return data.reading
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  // 获取解读
  const getInterpretation = async (readingId: string): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tarot-interpret', {
        body: { reading_id: readingId }
      })
      
      if (fnError) throw fnError
      return data.interpretation
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }
  
  return {
    isLoading,
    error,
    drawCards,
    getInterpretation
  }
}
```

**Chat模块调用方式**：

```typescript
// 在 Chat 组件中
import { useTarot } from '@/composables/useTarot'

const { drawCards, getInterpretation } = useTarot()

const handleTarotCommand = async (message: string) => {
  if (message.includes('抽一张塔罗牌') || message.includes('塔罗占卜')) {
    const reading = await drawCards('single')
    if (reading) {
      const interpretation = await getInterpretation(reading.id)
      return `🔮 你抽到了 ${reading.drawnCards[0].name_cn}...\n\n${interpretation}`
    }
  }
}
```

### 5.3 与智能日程（Schedule）整合

**整合场景**：当用户抽到与学业相关的卡牌时（如“星星”牌代表希望与学习新知），可以一键将“制定学习计划”添加到日程。

**跳转参数设计**：

```
/app/schedule?action=create&title=学习计划&tarot_card_id=17&tarot_reading_id=xxx
```

参数说明：

| 参数 | 必填 | 说明 |
|------|------|------|
| action | 是 | 固定值`create`，表示创建日程 |
| title | 是 | 日程标题，可预填基于卡牌的建议 |
| tarot_card_id | 否 | 关联的塔罗牌ID |
| tarot_reading_id | 否 | 关联的占卜记录ID |
| description | 否 | 预填的日程描述 |

**Schedule页面处理逻辑**：

```typescript
// frontend/src/pages/app/Schedule.vue (伪代码)
onMounted(() => {
  const route = useRoute()
  if (route.query.action === 'create') {
    // 打开新建日程弹窗，预填内容
    openCreateModal({
      title: route.query.title as string || '',
      description: route.query.description as string || '',
      metadata: {
        tarotCardId: route.query.tarot_card_id,
        tarotReadingId: route.query.tarot_reading_id
      }
    })
  }
})
```

### 5.4 与个人中心（Profile）整合

**整合场景**：在个人中心展示“最近7天运势”摘要。

**数据聚合查询**：

```sql
-- 获取用户最近7天的占卜记录统计
SELECT 
  COUNT(*) as total_readings,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_readings,
  jsonb_agg(
    jsonb_build_object(
      'date', DATE(created_at),
      'cards', (
        SELECT jsonb_agg(card_id::text) 
        FROM jsonb_array_elements(drawn_cards) AS c(card_id)
      )
    ) ORDER BY created_at DESC
  ) as recent_cards
FROM tarot_readings
WHERE user_id = :userId 
  AND created_at >= NOW() - INTERVAL '7 days';
```

**性能优化建议**：

- 使用物化视图缓存聚合数据，每小时刷新一次
- 对历史数据（月/季度）使用预计算，避免实时聚合
- 考虑使用Redis缓存用户的运势摘要

---

## 六、路由接入方案

### 6.1 路由选择分析

**对比分析**：

| 路由 | 优势 | 劣势 |
|------|------|------|
| `/app/tarot` | 语义明确，用户认知度高 | 路径较长 |
| `/app/fortune` | 简洁，更通用 | 语义略宽泛，可能与其他功能冲突 |

**建议**：采用`/app/tarot`。原因如下：第一，塔罗牌是具体的产品功能命名，用户认知清晰；第二，`fortune`可能与未来的其他占卜功能（如星座、水晶球）冲突；第三，现有路由中已有`/app/tarot`的占位（见`router/index.ts`第69行），无需新增路由。

### 6.2 路由配置现状

查看现有路由配置，发现已预留位置：

```typescript
// frontend/src/router/index.ts 第69行
{ path: 'tarot', name: 'AppTarot', component: () => import('../pages/app/Placeholder.vue') },
```

这意味着路由已预留，只需将`Placeholder.vue`替换为实际的塔罗牌页面组件。

### 6.3 页面形式选择

**分析**：塔罗牌功能是作为独立页面还是Modal/抽屉更好？

| 形式 | 适用场景 | 星火卡罗牌的适配性 |
|------|----------|-------------------|
| 独立页面 | 功能完整、交互复杂、需要沉浸式体验 | ✅ 抽牌、选牌阵、看解读需要一个完整展示空间 |
| Modal | 轻量功能、辅助决策、不打断主流程 | ❌ 塔罗牌需要沉浸式的占卜体验 |
| 抽屉 | 功能适中、需要快速访问 | ❌ 解读内容较长，抽屉空间受限 |

**建议**：采用**独立页面**形式。原因：第一，塔罗牌解读是一个完整的用户体验旅程（选牌阵→抽牌→看解读→分享），需要完整的页面空间；第二，解读内容通常较长（数百字），不适合Modal或抽屉；第三，学生用户群体对这种沉浸式娱乐功能有较高期待。

### 6.4 页面结构规划

```
/app/tarot
├── 首页（/app/tarot 或 /app/tarot/index）
│   ├── 卡组选择（标准韦特/主题卡组）
│   ├── 牌阵选择（单牌/三牌阵/更多）
│   ├── 输入问题（可选）
│   └── 开始占卜按钮
├── 抽牌页（/app/tarot/draw）
│   ├── 动画抽牌过程
│   ├── 展示抽取的卡牌
│   └── 确认抽牌结果
├── 解读页（/app/tarot/result/:id）
│   ├── 卡牌展示（正位/逆位）
│   ├── AI解读内容
│   ├── 分享按钮
│   └── 添加到日程按钮
└── 历史页（/app/tarot/history）
    ├── 我的占卜记录列表
    └── 运势趋势分析
```

---

## 七、可扩展性评估

### 7.1 好友互占功能

**功能描述**：用户A可以为用户B抽牌，AI解读B的问题。

**技术可行性**：高

**实现方案**：需要新增表字段或在`tarot_readings`表添加`target_user_id`字段。当`target_user_id`不为空时，表示这是为他人占卜。系统需要验证用户A与用户B的好友关系（或设置隐私策略），确保只有授权用户才能查看解读结果。

**数据模型扩展**：

```sql
ALTER TABLE tarot_readings ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES profiles(id);
ALTER TABLE tarot_readings ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;  -- 是否作为礼物赠送

CREATE INDEX idx_tarot_readings_target ON tarot_readings(target_user_id);
```

### 7.2 群体占卜功能

**功能描述**：社团活动前全员抽牌，AI给出集体运势分析。

**技术可行性**：中（需要开发独立功能模块）

**实现方案**：这相当于一个独立的功能模块，需要新建`tarot_group_readings`表来管理群体占卜活动。核心思路是创建一个活动（包含参与用户列表），每个用户独立抽牌，AI对所有卡牌进行综合分析。

**建议优先级**：低。建议在MVP版本之后再考虑，当前版本聚焦核心功能。

### 7.3 占卜历史与AI趋势分析

**功能描述**：“你最近一个月的整体运势趋势”，基于历史占卜数据进行统计分析。

**技术可行性**：中

**实现方案**：利用已有的`tarot_readings`表，通过分析用户历史抽牌记录，生成趋势报告。需要关注的问题包括数据量不足时的处理（如果用户只抽过1-2次，无法生成有意义的趋势）、不同牌阵的可比性问题（三牌阵vs单牌阵）。

**数据聚合设计**：

```sql
-- 月度运势分析查询示例
SELECT 
  DATE_TRUNC('month', created_at) as month,
  jsonb_agg(drawn_cards) as all_cards,
  COUNT(*) as reading_count,
  (
    SELECT jsonb_agg(card_id) 
    FROM jsonb_array_elements(drawn_cards) 
    WHERE (card_id % 22) = 0
  ) as major_arcana_count  -- 大阿尔卡纳出现频次
FROM tarot_readings
WHERE user_id = :userId 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('month', created_at);
```

### 7.4 付费卡组功能

**功能描述**：高级主题牌面，会员解锁专属卡组。

**技术可行性**：高（复用已有的卡组系统）

**实现方案**：利用`tarot_card_sets`表的`is_premium`字段来标识付费卡组。需要结合用户订阅状态（参考`profiles`表或新建订阅表）来判断用户是否有权访问。后续可扩展为独立的风味卡组商店。

**与会员系统整合**：建议星火卡罗牌的付费功能与整个星火校园平台的会员体系打通，而非单独建立支付系统。

### 7.5 扩展性评估总结

| 功能 | 技术可行性 | 业务价值 | 建议开发时机 |
|------|------------|----------|--------------|
| 好友互占 | 高 | 中 | v1.1 |
| 群体占卜 | 中 | 中高 | v1.2 |
| 趋势分析 | 中 | 中 | v1.1 |
| 付费卡组 | 高 | 高 | v1.2（需配合会员系统） |

---

## 八、综合评分

### 8.1 评分维度说明

| 维度 | 权重 | 评分标准 |
|------|------|----------|
| 系统完整性 | 20% | 数据模型、核心功能、边界处理 |
| 安全性 | 20% | 内容安全、输入安全、合规性 |
| 可扩展性 | 15% | 预留字段、模块解耦、未来功能空间 |
| 成本控制 | 15% | AI配额、数据库成本、维护成本 |
| 用户体验 | 15% | 交互流畅、视觉设计、响应速度 |
| 技术实现难度 | 10% | 开发复杂度、依赖项、技术风险 |
| 商业价值 | 5% | 用户留存、付费转化、品牌价值 |

### 8.2 详细评分

| 维度 | 得分 | 说明 |
|------|------|------|
| 系统完整性 | 85/100 | 数据模型设计完整，核心链路清晰；扣分点在于并发处理、离线支持未考虑 |
| 安全性 | 75/100 | AI内容安全有基本方案，输入安全有保障；扣分点在于合规风险提示不足 |
| 可扩展性 | 90/100 | 表结构预留充分，模块解耦合理，支持多种扩展方向 |
| 成本控制 | 80/100 | 配额方案可行，成本可预估；扣分点在于缺少全局监控告警机制 |
| 用户体验 | 80/100 | 独立页面设计合理，模块整合方案完善；可进一步优化加载动画 |
| 技术实现难度 | 85/100 | 技术栈清晰（Vue3+Supabase），无需引入新技术；Edge Function实现即可 |
| 商业价值 | 75/100 | 娱乐属性强，适合校园社交场景；付费功能需配合会员体系 |

**综合评分：81.5/100**

### 8.3 评分总结

该设计方案达到了**良好**水平，具备以下优势：数据模型设计完整且考虑周全，扩展性预留充分；模块整合方案清晰，与现有功能衔接自然；技术实现路径明确，难度适中。主要提升空间在于：需要补充并发场景的边界处理、完善合规风险提示、建立成本监控机制。

---

## 九、开发优先级建议

### 9.1 MVP版本（第一阶段）

**目标**：完成核心占卜功能，用户可完成“抽牌→AI解读”的完整闭环。

**必须实现**：

| 序号 | 功能 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 1 | tarot_cards表设计与数据导入 | P0 | 0.5天 |
| 2 | tarot_readings表与RLS策略 | P0 | 0.5天 |
| 3 | Edge Function：抽牌逻辑 | P0 | 1天 |
| 4 | Edge Function：AI解读调用 | P0 | 1天 |
| 5 | 配额管理（复用或扩展api_usage_logs） | P0 | 0.5天 |
| 6 | 前端页面：占卜首页 | P0 | 1天 |
| 7 | 前端页面：抽牌与结果展示 | P0 | 1天 |
| 8 | 路由接入与导航 | P0 | 0.5天 |

**MVP交付物**：用户可以选择牌阵、输入问题、抽取卡牌、获得AI解读，完整流程可跑通。

**预计工时**：约5.5天（按每天6小时有效工作时间）

### 9.2 增强版本（第二阶段）

**目标**：完善功能细节，提升用户体验，增加社交分享能力。

| 序号 | 功能 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 1 | 分享到校园墙 | P1 | 1天 |
| 2 | 占卜历史记录 | P1 | 1天 |
| 3 | 主题卡组支持（扩展字段） | P1 | 1天 |
| 4 | 与智能日程整合 | P2 | 0.5天 |
| 5 | 加载与动画优化 | P2 | 0.5天 |
| 6 | 移动端适配优化 | P1 | 1天 |

### 9.3 高级版本（第三阶段）

**目标**：探索商业化方向，增加高级功能。

| 序号 | 功能 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 1 | 好友互占 | P2 | 2天 |
| 2 | 趋势分析 | P2 | 2天 |
| 3 | 付费卡组 | P3 | 待定（依赖会员系统） |
| 4 | 群体占卜 | P3 | 待定 |

### 9.4 风险提示与注意事项

**开发风险**：Edge Function的冷启动时间可能影响首次抽牌体验，建议配置预热或使用Supabase Pro的Edge Function Proxies。

**运营风险**：AI解读的响应时间和质量直接影响用户满意度，建议在上线前进行大量测试，确保Prompt的效果。

**合规风险**：建议在产品正式上线前咨询法务，确认塔罗牌占卜类功能的合规性要求。

---

## 附录：推荐的技术债务清单

以下问题建议在开发过程中同步解决，不影响功能上线但需要技术关注：

1. **api_usage_logs表扩展**：需要添加`feature`字段以支持多功能独立配额
2. **并发处理**：实现原子化的配额扣减逻辑
3. **成本监控**：建立AI调用的监控告警机制
4. **日志记录**：增加占卜记录的操作审计日志
5. **缓存策略**：对卡牌元数据进行缓存，减少数据库查询

---

**报告完成日期**：2026-03-25  
**评审版本**：v1.0  
**基于文档版本**：opencode-tarot.md (v1.0)
