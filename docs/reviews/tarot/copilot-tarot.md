# Copilot CLI — 星火卡罗牌功能头脑风暴指令

## 任务背景

星火校园（Spark Alliance）是面向大学生的综合平台，技术栈为 Vue 3 + TypeScript + Vite + Supabase。
项目根目录：`c:\Users\whw\Desktop\Spark-Alliance`
现有模块参考：`frontend/src/pages/app/`（了解代码风格）

**新功能：星火卡罗牌**
融合塔罗文化与AI解读的趣味占卜模块，用户每日抽牌，AI根据用户提问进行个性化解读，支持分享至校园墙。

---

## 你的任务

从**TypeScript实现与前端技术**角度进行头脑风暴：

### 1. 数据模型设计（完整 SQL）

设计以下数据表，给出完整建表SQL（统一使用 `uuid_generate_v4()`，用户外键引用 `auth.users(id)`）：

- `tarot_cards` —— 卡牌基础信息表（牌名、图片URL、正位含义、逆位含义、类型）
- `tarot_readings` —— 用户抽牌记录表（用户ID、抽到的牌、是否逆位、用户提问、AI解读内容、创建时间）
- `tarot_daily_limit` —— 可用 `tarot_readings` 表按日期聚合代替，不需单独建表

每张表都需要配套 RLS 策略：
- `tarot_cards`：所有人可读，管理员可写
- `tarot_readings`：用户只能读写自己的记录

### 2. 卡牌翻转动画实现

设计一个 `TarotCard.vue` 组件，要求：
- CSS 3D 翻转动画（正面展示牌背，点击翻转显示牌面）
- 逆位时牌面旋转180°显示
- 翻转过程中有粒子/光效（与项目 ParticleBackground.vue 风格一致）
- 给出完整的 Vue 3 + TypeScript 组件代码骨架和关键 CSS

### 3. 抽牌逻辑

```typescript
// 请设计以下函数的实现思路：

// 1. 随机抽牌（考虑正逆位，避免每天重复）
function drawCard(userId: string, existingTodayCards: string[]): DrawResult

// 2. 三牌阵（过去-现在-未来）
function drawThreeCards(userId: string): ThreeCardSpread

// 3. 调用AI解读（Edge Function）
async function getAIReading(card: TarotCard, isReversed: boolean, userQuestion: string): Promise<string>
```

### 4. AI 解读 Edge Function

设计 `supabase/functions/tarot-reading/index.ts`：
- 接收：cardId、isReversed、userQuestion、userId
- 检查每日调用限额（复用 `api_usage_logs` 表，feature='tarot_reading'，每日限3次）
- 调用 AI（Gemini Flash），Prompt 设计要点：
  - 输入：牌名 + 正/逆位含义 + 用户的问题
  - 输出：200字内的个性化解读，语气温暖有趣，适合大学生
  - 避免过于神秘主义，侧重心理引导和积极暗示
- 返回解读文本

### 5. 动画与视觉效果

- 进入占卜页面时的"神秘登场"动画如何用 CSS transition 实现？
- 多张牌展开的扇形排布如何用 CSS transform 计算角度？
- 抽牌"洗牌"动画是否需要用到 @vueuse/gesture？

### 6. 性能优化

- 卡牌图片（22-78张）如何懒加载？
- AI解读结果如何缓存（同一用户同一天同一问题不重复调用AI）？
- 卡牌图片用 Supabase Storage 还是内嵌 SVG？各有什么利弊？

## 输出格式

```
## 完整数据库SQL（建表 + RLS）
## TarotCard.vue 组件代码骨架
## 抽牌逻辑实现方案
## Edge Function 代码
## 动画实现方案
## 性能优化建议
## 代码实现风险点
```

输出保存到：`docs/reviews/tarot/copilot-tarot-output.md`
