/**
 * useEasterEggs —— 星火伴侣彩蛋触发器（v13.1）
 *
 * 三类触发器：
 *  1. **节日 / 特殊日期**：今天的 MM-DD 命中节日表，触发节日问候上下文
 *  2. **里程碑**：连续签到 3/7/30/100 天，或解锁某些徽章后，触发庆贺彩蛋
 *  3. **隐藏词句**：用户在 AI 聊天中输入暗号（"叫醒星火"、"给我一首诗"…），AI 进入特殊回复模式
 *
 * 设计：
 *  - 模块单例 + 纯函数，方便任何 composable / 组件复用
 *  - 不持久化触发状态（同一个彩蛋当天可能多次被触发，由调用方决定是否去重）
 *  - 给出的 prompt context 是 Markdown，由调用者拼到 AI 的 [Context] 块
 */

import { reactive } from 'vue'

export interface EasterEgg {
  key: string
  type: 'festival' | 'milestone' | 'phrase' | 'birthday'
  title: string
  /** 触发后给 AI 的额外 system context（拼到 prompt 头部） */
  ai_context: string
  /** 触发后给前端展示的横幅消息（可空） */
  banner?: { icon: string; text: string }
  /** 触发后追加到伴侣 AI 聊天历史的隐藏系统消息（可空） */
  system_msg?: string
}

// ======== 节日表（MM-DD → EasterEgg） ========
const FESTIVALS: Record<string, EasterEgg> = {
  '01-01': {
    key: 'festival_new_year',
    type: 'festival',
    title: '新年快乐',
    ai_context: '## 节日提示\n今天是元旦。先给用户一句温暖的新年祝福，再回到他的问题；可顺便引导他在星火规划里立一个本年度小目标。',
    banner: { icon: '🎉', text: '新年好！这一年，要更勇敢一点 🎊' },
  },
  '02-14': {
    key: 'festival_valentine',
    type: 'festival',
    title: '情人节',
    ai_context: '## 节日提示\n今天是情人节，对待用户的话题更柔软一些；他若提及关系话题，给具体建议而非鸡汤。',
    banner: { icon: '💌', text: '今天宜温柔，宜表达爱意' },
  },
  '03-08': {
    key: 'festival_women',
    type: 'festival',
    title: '女神节',
    ai_context: '## 节日提示\n今天是 3·8 妇女节/女神节，可主动问候女性用户，鼓励她做任何让自己快乐的事。',
  },
  '04-01': {
    key: 'festival_april_fools',
    type: 'festival',
    title: '愚人节',
    ai_context: '## 节日提示\n今天是愚人节，可以稍微调皮一点，但不要骗用户做出实际伤害自己的事。',
    banner: { icon: '🤡', text: '今天可以骗自己一句"我不熬夜"' },
  },
  '05-04': {
    key: 'festival_youth',
    type: 'festival',
    title: '青年节',
    ai_context: '## 节日提示\n今天是五四青年节，对话语气热血一点，鼓励用户行动。',
  },
  '06-01': {
    key: 'festival_kids',
    type: 'festival',
    title: '儿童节',
    ai_context: '## 节日提示\n今天是六一儿童节，记得提醒用户：成年人也可以快乐如孩童。',
    banner: { icon: '🍭', text: '记得保留一点孩子气' },
  },
  '09-10': {
    key: 'festival_teacher',
    type: 'festival',
    title: '教师节',
    ai_context: '## 节日提示\n今天是教师节，若用户提及老师，给走心的感谢话术建议。',
  },
  '10-01': {
    key: 'festival_national',
    type: 'festival',
    title: '国庆节',
    ai_context: '## 节日提示\n今天是国庆节，假期氛围；如果用户在赶 ddl 不要责备，给放松小贴士。',
    banner: { icon: '🇨🇳', text: '国庆快乐，记得也给自己放个假' },
  },
  '11-11': {
    key: 'festival_singles',
    type: 'festival',
    title: '光棍节',
    ai_context: '## 节日提示\n今天是双 11，调侃地避开"剁手"话题；用户若买了东西，先肯定他的犒劳自己。',
  },
  '12-24': {
    key: 'festival_xmas_eve',
    type: 'festival',
    title: '平安夜',
    ai_context: '## 节日提示\n今天是平安夜，温暖的祝福语调；可推荐他把感谢的话发给身边的人。',
    banner: { icon: '🎄', text: '平安夜快乐，记得给爱的人留个位置' },
  },
  '12-25': {
    key: 'festival_xmas',
    type: 'festival',
    title: '圣诞节',
    ai_context: '## 节日提示\n今天是圣诞节，可以送一句俏皮的圣诞祝福。',
  },
}

// ======== 隐藏词句触发表 ========
interface PhraseTrigger {
  /** 命中任一关键词即触发（已小写） */
  keywords: string[]
  egg: EasterEgg
}

const PHRASE_TRIGGERS: PhraseTrigger[] = [
  {
    keywords: ['星火生日', '你生日', 'spark birthday', '伴侣生日'],
    egg: {
      key: 'phrase_birthday',
      type: 'phrase',
      title: '星火生日彩蛋',
      ai_context: '## 隐藏彩蛋\n用户提到了你的生日。星火诞生于 2025 年的春天，请用第一人称俏皮地讲一句"我的生日故事"，再问他一个童年回忆。',
    },
  },
  {
    keywords: ['给我写首诗', '写一首诗', '来首诗', 'write a poem'],
    egg: {
      key: 'phrase_poem',
      type: 'phrase',
      title: '诗意彩蛋',
      ai_context: '## 隐藏彩蛋\n用户希望你写一首诗。请写一首 4 行原创现代诗，主题贴合用户当下的处境，结尾带一个 emoji。',
    },
  },
  {
    keywords: ['我累了', '好累啊', '撑不住', '想放弃', 'i am tired', 'so tired'],
    egg: {
      key: 'phrase_tired',
      type: 'phrase',
      title: '安抚彩蛋',
      ai_context: '## 隐藏彩蛋\n用户表达了疲惫/想放弃的情绪。**先共情两句**，再给出一个 5 分钟内可执行的小行动（喝水/拉伸/写一句给明天的自己）。不要任何"加油"式空话。',
    },
  },
  {
    keywords: ['今天不开心', '今天难过', '心情不好', '想哭'],
    egg: {
      key: 'phrase_sad',
      type: 'phrase',
      title: '陪伴彩蛋',
      ai_context: '## 隐藏彩蛋\n用户心情低落。**先停留**，告诉他你听到了；再给一个被科学验证的"3 分钟自助情绪练习"（如方块呼吸/感官 5-4-3-2-1）。',
    },
  },
  {
    keywords: ['谢谢你', '谢谢星火', 'thank you spark'],
    egg: {
      key: 'phrase_thanks',
      type: 'phrase',
      title: '答谢彩蛋',
      ai_context: '## 隐藏彩蛋\n用户在感谢你。请用一句俏皮真诚的话回应（不要油腻），可以提一句"我也在你身上学到东西"。',
    },
  },
  {
    keywords: ['hello world', 'hello, world'],
    egg: {
      key: 'phrase_hello_world',
      type: 'phrase',
      title: '程序员暗号',
      ai_context: '## 隐藏彩蛋\n用户输入了程序员的"Hello, World!"。识别这个梗，用一句程序员才懂的双关回复（例如"return joy(0);"），再回到他正题。',
    },
  },
  {
    keywords: ['彩蛋', 'easter egg'],
    egg: {
      key: 'phrase_meta_egg',
      type: 'phrase',
      title: '元彩蛋',
      ai_context: '## 隐藏彩蛋\n用户在问"彩蛋"本身。请俏皮地告诉他：星火伴侣里至少埋了七个隐藏入口（节日、连续签到 3/7/30/100、特定词句…），但具体内容要他自己探索。',
    },
  },
]

// ======== 里程碑触发器（连续签到天数 → 彩蛋） ========
interface MilestoneTrigger {
  streak: number
  egg: EasterEgg
}

const STREAK_MILESTONES: MilestoneTrigger[] = [
  {
    streak: 3,
    egg: {
      key: 'milestone_streak_3',
      type: 'milestone',
      title: '三日坚持',
      ai_context: '## 里程碑\n用户已经连续签到 3 天。请用一句话肯定他的坚持，并提示再坚持 4 天就解锁「一周达人」。',
      banner: { icon: '🔥', text: '连续 3 天打卡，开了个好头！' },
      system_msg: '🌱 连续打卡 3 天达成。坚持比天赋更重要。',
    },
  },
  {
    streak: 7,
    egg: {
      key: 'milestone_streak_7',
      type: 'milestone',
      title: '一周达人',
      ai_context: '## 里程碑\n用户连续签到 7 天，已经形成习惯雏形。请鼓励一下，并问他"这周的最大收获是什么？"。',
      banner: { icon: '✨', text: '一周连击！习惯正在生根' },
      system_msg: '🌿 连续打卡 7 天达成。大脑已经把这件事写进默认行为。',
    },
  },
  {
    streak: 30,
    egg: {
      key: 'milestone_streak_30',
      type: 'milestone',
      title: '月度冠军',
      ai_context: '## 里程碑\n用户连续签到 30 天（月度冠军）。这是一个重大里程碑！请用一段稍微长一点（4-6 句）的真挚话，承认他的坚持，并问他要不要把这一个月的心情/笔记导出做成"月度复盘"。',
      banner: { icon: '🌙', text: '连续 30 天，你正在成为另一个自己' },
      system_msg: '🌳 连续打卡 30 天达成。看，你做到了曾经觉得不可能的事。',
    },
  },
  {
    streak: 100,
    egg: {
      key: 'milestone_streak_100',
      type: 'milestone',
      title: '百日传奇',
      ai_context: '## 里程碑\n用户连续签到 100 天（百日传奇）。这是星火伴侣的传奇成就之一，请用最走心的语气祝贺，并主动提议：把他这百日的故事整理为一篇专属传记，可以分享到星火域。',
      banner: { icon: '💎', text: '百日传奇！你已经是少数中的少数' },
      system_msg: '💎 连续打卡 100 天达成。这就是「星火」二字的含义。',
    },
  },
]

// ======== 当日已触发的彩蛋（去重，避免节日反复弹） ========
const _firedToday = reactive<Record<string, boolean>>({})
const _firedDateKey = { value: new Date().toISOString().slice(0, 10) }

function ensureDateKey() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== _firedDateKey.value) {
    _firedDateKey.value = today
    for (const k in _firedToday) delete _firedToday[k]
  }
}

export function useEasterEggs() {
  /** 命中今天的节日彩蛋（按 MM-DD），无则 null */
  function getFestivalEgg(): EasterEgg | null {
    const now = new Date()
    const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return FESTIVALS[md] || null
  }

  /** 用户输入命中隐藏词句 → 返回彩蛋（多个匹配只返回首个） */
  function detectPhraseEgg(userText: string): EasterEgg | null {
    if (!userText) return null
    const lc = userText.toLowerCase()
    for (const trigger of PHRASE_TRIGGERS) {
      if (trigger.keywords.some(k => lc.includes(k.toLowerCase()))) {
        return trigger.egg
      }
    }
    return null
  }

  /** 签到 streak 命中里程碑 → 彩蛋；否则 null */
  function detectStreakEgg(streak: number): EasterEgg | null {
    return STREAK_MILESTONES.find(m => m.streak === streak)?.egg || null
  }

  /** 给定上下文（streak/today mood/...）综合返回所有当下应该展示的彩蛋集合 */
  function getActiveContextEggs(opts: { streak?: number }): EasterEgg[] {
    ensureDateKey()
    const eggs: EasterEgg[] = []
    const fest = getFestivalEgg()
    if (fest) eggs.push(fest)
    if (typeof opts.streak === 'number') {
      const milestone = detectStreakEgg(opts.streak)
      if (milestone) eggs.push(milestone)
    }
    return eggs
  }

  /** 标记一个彩蛋"今天已触发"，调用方可用来避免重复弹横幅 */
  function markFiredToday(eggKey: string) {
    ensureDateKey()
    _firedToday[eggKey] = true
  }

  function hasFiredToday(eggKey: string): boolean {
    ensureDateKey()
    return !!_firedToday[eggKey]
  }

  /** 把一组彩蛋拼接成 AI 可用的 system context Markdown */
  function buildEggContext(eggs: EasterEgg[]): string {
    if (!eggs.length) return ''
    return eggs.map(e => e.ai_context).join('\n\n')
  }

  return {
    getFestivalEgg,
    detectPhraseEgg,
    detectStreakEgg,
    getActiveContextEggs,
    markFiredToday,
    hasFiredToday,
    buildEggContext,
  }
}
