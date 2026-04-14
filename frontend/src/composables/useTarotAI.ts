/**
 * useTarotAI - V3 重构
 *
 * 核心改进：
 * 1. 智能选牌：根据问题方向筛选语义相关候选牌
 * 2. 追问功能：对历史记录追加提问
 * 3. 今日指引：结合时段给出有针对性的建议
 * 4. 更智能的本地 fallback
 */
import { ref } from 'vue'
import { TAROT_CARDS, type TarotCard } from '../data/tarotCards'
import { requestAssistantChat } from '../utils/assistantApi'

// ====== 通用 AI 调用（通过统一 assistant-chat 接口）======
async function callTarotAI(prompt: string): Promise<string> {
  try {
    const res = await requestAssistantChat({
      assistant: 'spark',
      mode: 'fast',
      messages: [{ role: 'user', content: prompt }],
    })
    return (res.content || '').trim()
  } catch (e: any) {
    console.warn('AI 服务调用失败:', e?.message)
    throw e
  }
}

// ====== 问题拆分 ======
export interface QuestionBreakdown {
  core: string
  direction: string
  mood: string
  refined: string
  options?: string[] // 提取的选项（如"火锅"和"麻辣烫"）
}

export async function analyzeQuestion(question: string): Promise<QuestionBreakdown> {
  const prompt = `你是"星火校园"卡罗牌的问题理解助手。请深入理解用户的问题，提取核心诉求。

用户问题：${question}

请严格按以下 JSON 格式返回（不要多余文字）：
{
  "core": "一句话概括核心诉求（10字内）",
  "direction": "学业发展/情感社交/选择决策/职业规划/日常生活/自我成长",
  "mood": "迷茫焦虑/轻松好奇/期待紧张/低落沮丧/平和理性",
  "refined": "重新组织的清晰问题（20字内）",
  "options": ["选项A", "选项B"]
}
其中 options 仅在问题包含"还是""或者"等选择时提取，否则为空数组。`

  try {
    const raw = await callTarotAI(prompt)
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0]) as QuestionBreakdown
  } catch (e) {
    console.warn('AI拆分失败，使用本地分析:', e)
  }
  return localAnalyze(question)
}

// ====== 本地智能分析（V3增强版）======
function localAnalyze(q: string): QuestionBreakdown {
  // 提取选项
  const options: string[] = []
  const optMatch = q.match(/(.+?)(?:还是|或者|or)(.+?)(?:[？?。，,！!]|$)/)
  if (optMatch) {
    options.push(optMatch[1].trim(), optMatch[2].trim())
  }

  // 识别方向
  const dirRules: [RegExp, string, string][] = [
    [/考试|期末|高数|挂科|复习|论文|作业|考研|英语|成绩/, '学业发展', '紧张焦虑'],
    [/恋爱|感情|喜欢|暧昧|分手|表白|对象|另一半/, '情感社交', '迷茫期待'],
    [/还是|选择|该不该|要不要|纠结|到底/, '选择决策', '纠结犹豫'],
    [/实习|工作|面试|简历|毕业|考公|薪资/, '职业规划', '期待紧张'],
    [/吃|火锅|烤肉|麻辣烫|奶茶|外卖|零食/, '日常生活', '轻松好奇'],
    [/睡|失眠|焦虑|压力|心情|开心|难过|累/, '自我成长', '低落沮丧'],
  ]

  let direction = '自我成长'
  let mood = '平和理性'
  for (const [re, dir, mo] of dirRules) {
    if (re.test(q)) { direction = dir; mood = mo; break }
  }

  // 生成核心概括
  const core = options.length >= 2
    ? `${options[0]}还是${options[1]}`
    : q.replace(/[？?！!。，,\s]+/g, '').slice(0, 10)

  return { core, direction, mood, refined: q.slice(0, 20), options }
}

// ====== 智能选牌：根据问题方向筛选候选牌 ======
// 每个牌与不同方向的关联度
const CARD_AFFINITY: Record<string, number[]> = {
  '选择决策': [6, 7, 10, 11, 14, 0, 12],  // 恋人、战车、命运之轮、正义、节制、愚者、倒吊人
  '学业发展': [1, 4, 7, 8, 9, 11, 17],    // 魔术师、皇帝、战车、力量、隐者、正义、星星
  '情感社交': [2, 3, 6, 14, 17, 19, 21],   // 女祭司、女皇、恋人、节制、星星、太阳、世界
  '职业规划': [1, 4, 7, 10, 20, 21, 8],     // 魔术师、皇帝、战车、命运之轮、审判、世界、力量
  '日常生活': [0, 3, 10, 14, 17, 19, 6],    // 愚者、女皇、命运之轮、节制、星星、太阳、恋人
  '自我成长': [2, 5, 9, 12, 13, 17, 20],    // 女祭司、教皇、隐者、倒吊人、死神、星星、审判
}

export function selectRelevantCards(direction: string, count = 7): TarotCard[] {
  const indices = CARD_AFFINITY[direction] || CARD_AFFINITY['自我成长']
  // 取前 count 张候选牌
  const selected = indices.slice(0, count).map(i => TAROT_CARDS[i])
  // 随机打乱顺序
  return selected.sort(() => Math.random() - 0.5)
}

export function pickOneCard(candidates: TarotCard[]): { card: TarotCard; isReversed: boolean } {
  const card = candidates[Math.floor(Math.random() * candidates.length)]
  return { card, isReversed: Math.random() < 0.4 }
}

// ====== 获取时段 ======
function getTimePeriod(): string {
  const h = new Date().getHours()
  if (h < 6) return '深夜'
  if (h < 9) return '清晨'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  if (h < 21) return '傍晚'
  return '夜晚'
}

// ====== 塔罗 AI 解读 ======
export async function generateReading(
  card: TarotCard, isReversed: boolean, question?: string, options?: string[]
): Promise<string> {
  const orient = isReversed ? '逆位（提醒能量）' : '正位（正向能量）'
  const meaning = isReversed ? card.reversedMeaning : card.uprightMeaning
  const period = getTimePeriod()

  const optionsHint = options?.length
    ? `用户在纠结：${options.join(' vs ')}。你必须结合牌义明确推荐其中一个选项，用"推荐你选 X"这样的语气，给出清晰理由。不要模棱两可。`
    : ''

  const prompt = `你是"星火校园"卡罗牌解读搭子，帮大学生做选择、给行动建议。

【核心原则】用户来这里是为了得到一个明确的方向，不是听废话。你必须给出清晰、具体的建议。

【输入】
- 时间：${period}
- 问题：${question || '（今日指引）'}
- 卡牌：${card.nameZh}（${orient}）
- 牌义：${meaning}
- 场景：${card.campusContext}
${optionsHint}

【要求】
1. 纯中文正文，120-180字，无标题无列表
2. ${options?.length ? '开头直接说"推荐你选 X"，然后用牌义解释为什么' : '先解释牌义，再给具体行动建议'}
3. 建议要具体可执行（什么时候做、怎么做）
4. 结尾一句轻松鼓励
5. 最后加：（仅供娱乐参考 ✨）`

  try {
    return await callTarotAI(prompt)
  } catch (e) {
    console.warn('AI解读失败:', e)
    return localReading(card, isReversed, question, options)
  }
}

// ====== 今日指引专用 ======
export async function generateDailyGuidance(card: TarotCard, isReversed: boolean): Promise<string> {
  const period = getTimePeriod()
  const meaning = isReversed ? card.reversedMeaning : card.uprightMeaning
  const orient = isReversed ? '逆位' : '正位'

  const prompt = `你是"星火校园"的每日能量指引师。现在是${period}，请根据以下塔罗牌为大学生给出今日指引。

卡牌：${card.nameZh}（${orient}）
牌义：${meaning}
关键词：${card.keywords.join('、')}

要求：
1. 120-160字，纯中文正文
2. 结合${period}的时间特点给建议（比如清晨说"今天适合..."，夜晚说"今晚不妨..."）
3. 给出一个今天就能做的小行动
4. 温暖有趣，不说教
5. 结尾用一句话总结今日能量关键词`

  try {
    return await callTarotAI(prompt)
  } catch (e) {
    console.warn('今日指引AI失败:', e)
    return `${period}好！${card.nameZh}以${orient}带来今日指引——${meaning} 在校园里，${card.campusContext}。今天的能量关键词是「${card.keywords[0]}」，不妨${period === '清晨' || period === '上午' ? '用一杯温水开启这一天' : period === '夜晚' || period === '深夜' ? '在睡前写下三个小确幸' : '给自己一个十分钟的放空时间'}。✨（仅供参考）`
  }
}

// ====== 历史追问 ======
export async function askFollowUp(
  cardName: string, originalReading: string, followUpQuestion: string
): Promise<string> {
  const prompt = `用户之前抽到了"${cardName}"，当时的解读是：
"${originalReading.slice(0, 200)}"

现在用户想追问：${followUpQuestion}

请基于之前的牌面和解读，给出 100-150 字的补充解答。语气温暖，贴近大学生。`

  try {
    return await callTarotAI(prompt)
  } catch (e) {
    return `关于你的追问——回到${cardName}的能量场景中，它想告诉你的核心信息没有变：保持开放的心态，一步一步来。每个选择都没有绝对的对错，重要的是你在做选择时的内心状态。✨（仅供参考）`
  }
}

// ====== 本地 fallback 解读 ======
function localReading(card: TarotCard, isReversed: boolean, question?: string, options?: string[]): string {
  const meaning = isReversed ? card.reversedMeaning : card.uprightMeaning
  const orient = isReversed ? '逆位' : '正位'
  const period = getTimePeriod()

  let optionAdvice = ''
  if (options?.length === 2) {
    // 直接给出明确推荐
    const pick = isReversed ? options[1] : options[0]
    const reason = isReversed
      ? `${card.nameZh}逆位提醒你跳出惯性思维，尝试不一样的选择`
      : `${card.nameZh}正位鼓励你跟随内心的第一直觉去行动`
    optionAdvice = `推荐你选「${pick}」！${reason}。`
  }

  const advice = [
    '现在就去行动，不要再犹豫了！',
    '把决定告诉一个朋友，让它变成现实。',
    '给自己设一个30分钟的执行倒计时。',
    '先从最小的一步开始，行动起来。',
    '今天就去做，明天你会感谢自己。',
  ]

  return `${period}好！${card.nameZh}以${orient}出现——${meaning} ${optionAdvice || (question ? `关于你的问题，这张牌提醒你保持开放的心态。` : `今天的能量围绕着「${card.keywords[0]}」。`)}不妨试试：${advice[Math.floor(Math.random() * advice.length)]}（仅供轻娱乐参考 ✨）`
}

// ====== Hook ======
export function useTarotAI() {
  const analyzing = ref(false)
  const generating = ref(false)

  async function doAnalyze(q: string) {
    analyzing.value = true
    try { return await analyzeQuestion(q) } finally { analyzing.value = false }
  }

  async function doReading(card: TarotCard, isReversed: boolean, q?: string, opts?: string[]) {
    generating.value = true
    try { return await generateReading(card, isReversed, q, opts) } finally { generating.value = false }
  }

  async function doDailyReading(card: TarotCard, isReversed: boolean) {
    generating.value = true
    try { return await generateDailyGuidance(card, isReversed) } finally { generating.value = false }
  }

  async function doFollowUp(cardName: string, reading: string, q: string) {
    generating.value = true
    try { return await askFollowUp(cardName, reading, q) } finally { generating.value = false }
  }

  return { analyzing, generating, doAnalyze, doReading, doDailyReading, doFollowUp, selectRelevantCards, pickOneCard }
}
