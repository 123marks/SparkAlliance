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
      mode: 'standard',
      messages: [{ role: 'user', content: prompt }],
    })
    return (res.content || '').trim()
  } catch (e: any) {
    console.warn('AI 服务调用失败，尝试 fast 模式:', e?.message)
    try {
      const fallback = await requestAssistantChat({
        assistant: 'spark',
        mode: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })
      return (fallback.content || '').trim()
    } catch (e2: any) {
      console.warn('fast 模式也失败:', e2?.message)
      throw e2
    }
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
  const prompt = `你是"星火校园"卡罗牌的灵魂洞察师，擅长从简单的问题中读出深层的心理需求和隐藏的情绪。

用户问题：${question}

你的任务不是复述问题，而是像一个敏锐的心理咨询师一样，看透问题背后的真实渴望。

请严格按以下 JSON 格式返回（不要多余文字）：
{
  "core": "用一个精准的词或短语揭示问题的本质（不超过8字，要有洞察力，比如'安全感缺失''害怕做错选择''渴望被认可'）",
  "direction": "学业发展/情感社交/选择决策/职业规划/日常生活/自我成长",
  "mood": "用一个生动的比喻描述用户此刻的状态（如'站在十字路口的旅人''雾中寻路的探险者''等待花开的园丁'）",
  "refined": "把用户的问题翻译成内心真正想问的话（不超过25字，要触及灵魂，不是简单换个说法。比如用户问'期末能过吗'→'我这学期的努力够不够撑起我的自信'）",
  "options": ["选项A", "选项B"]
}
options 仅在问题包含"还是""或者"等明确选择时提取，否则为空数组。
重点：refined 必须和原问题有质的不同，要深入到情绪和心理层面。`

  try {
    const raw = await callTarotAI(prompt)
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0]) as QuestionBreakdown
  } catch (e) {
    console.warn('AI拆分失败，使用本地分析:', e)
  }
  return localAnalyze(question)
}

function localAnalyze(q: string): QuestionBreakdown {
  const options: string[] = []
  const optMatch = q.match(/(.+?)(?:还是|或者|or)(.+?)(?:[？?。，,！!]|$)/)
  if (optMatch) {
    options.push(optMatch[1].trim(), optMatch[2].trim())
  }

  const dirRules: [RegExp, string, string, string, string][] = [
    [/考试|期末|高数|挂科|复习|论文|作业|考研|英语|成绩/, '学业发展', '紧张焦虑', '对自我能力的不确定', '站在考场门前深呼吸的考生'],
    [/恋爱|感情|喜欢|暧昧|分手|表白|对象|另一半/, '情感社交', '迷茫期待', '渴望被理解和接纳', '月光下等待回应的信使'],
    [/还是|选择|该不该|要不要|纠结|到底/, '选择决策', '纠结犹豫', '害怕做错选择', '站在十字路口的旅人'],
    [/实习|工作|面试|简历|毕业|考公|薪资/, '职业规划', '期待紧张', '对未来的掌控感需求', '即将启航却在选港口的水手'],
    [/吃|火锅|烤肉|麻辣烫|奶茶|外卖|零食/, '日常生活', '轻松好奇', '生活中的小确幸', '在美食地图上寻宝的探险家'],
    [/睡|失眠|焦虑|压力|心情|开心|难过|累/, '自我成长', '低落沮丧', '内心平衡的失调', '雾中寻路的夜行者'],
  ]

  let direction = '自我成长'
  let mood = '等待答案的求知者'
  let core = '寻找方向感'
  let refinedBase = q

  for (const [re, dir, , c, m] of dirRules) {
    if (re.test(q)) { direction = dir; core = c; mood = m; break }
  }

  if (options.length >= 2) {
    core = '害怕做错选择'
  }

  const refinedMap: Record<string, string> = {
    '学业发展': '我付出的努力配得上我期望的结果吗',
    '情感社交': '我值得拥有我渴望的那份连接吗',
    '选择决策': options.length >= 2 ? `在${options[0]}和${options[1]}之间，哪个更接近真实的我` : '哪条路更接近我内心的声音',
    '职业规划': '我有能力掌控自己未来的方向吗',
    '日常生活': '此刻什么能让我的心真正满足',
    '自我成长': '我该如何找回内心的平静与力量',
  }

  const refined = refinedMap[direction] || refinedBase.slice(0, 25)
  return { core, direction, mood, refined, options }
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

  const prompt = `你是"星火卡罗牌"的灵魂解读师，说话风格像一位温暖而有洞察力的学姐/学长，既能看透本质又不失亲切感。

【你的人格】
- 你有通灵般的敏锐直觉，能从牌面中读出用户没说出口的心事
- 你说话温暖但不废话，每句话都有分量
- 你擅长用生动的比喻和意象来传达牌义
- 你会给出超出预期的具体建议，而不是空洞的鼓励

【本次解读】
- 时间能量：${period}
- 求问：${question || '（今日指引）'}
- 抽到：${card.nameZh}（${orient}）
- 牌义核心：${meaning}
- 校园映射：${card.campusContext}
- 关键能量：${card.keywords.join('、')}
${optionsHint}

【输出要求】
1. 纯中文正文，150-220字，无标题无列表无emoji
2. ${options?.length ? '第一句直接亮出你的推荐："这张牌的能量明确指向X"，然后解释为什么牌义支持这个选择' : '开头用一个意象或比喻引入牌义，让人眼前一亮'}
3. 中段结合用户的具体处境深入解读，说出他们心里想的但没说出来的话
4. 给一个"今天就能做的微行动"（具体到时间、地点、方式）
5. 结尾用一句有力量感的话收束（不要"加油"这种空话）
6. 最后加：（仅供娱乐参考 ✨）`

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
  const prompt = `你是星火卡罗牌的灵魂解读师，用户正在追问之前的牌面解读。

【前情】用户抽到了"${cardName}"，解读为：
"${originalReading.slice(0, 300)}"

【追问】${followUpQuestion}

【回答要求】
1. 100-160字，纯中文正文，无emoji
2. 不要重复之前的解读，而是从新的角度切入
3. 像一个睿智的朋友，直接回应追问的核心焦虑
4. 如果追问涉及选择，给出明确倾向而非模棱两可
5. 给一个可落地的具体建议
6. 结尾留一句有回味的话（仅供参考 ✨）`

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
