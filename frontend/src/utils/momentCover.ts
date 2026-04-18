/**
 * momentCover.ts —— 伴侣动态智能封面生成器
 *
 * 规则：当用户发的动态没有任何图片/视频时，根据正文内容智能推导一个封面：
 *   - 优先取正文里第一个 emoji
 *   - 无 emoji 时按关键词类别匹配一个代表 emoji
 *   - 16 套精选渐变，根据 emoji/内容的"情感色"挑配色
 *
 * 导出：
 *   - generateCoverStyle(content, hasMedia) → CoverStyle
 *   - CoverStyle 的类型
 *   - COVER_GRADIENTS 16 套渐变，供 UI 组件复用
 */

export interface CoverStyle {
  emoji: string
  /** 渐变两端颜色 [start, end]，CSS 可直接拼接 linear-gradient(135deg, start, end) */
  gradient: [string, string]
  /** 渐变角度（度），默认 135 */
  angle?: number
  /** 渐变方案的命名，主要用于调试 —— 从数据库读出时可能是任意字符串，故放宽类型 */
  theme?: CoverTheme | string
}

export type CoverTheme =
  | 'sunrise' | 'ocean' | 'forest' | 'candy'
  | 'berry' | 'mint' | 'cosmic' | 'amber'
  | 'aurora' | 'cherry' | 'lime' | 'ink'
  | 'coral' | 'lavender' | 'fire' | 'steel'

/**
 * 16 套精心调色的渐变，对应不同情感/话题的视觉氛围。
 * 颜色选择原则：saturation 适中、明度平衡、avatar/emoji 叠在上面要清晰可读。
 */
export const COVER_GRADIENTS: Record<CoverTheme, [string, string]> = {
  sunrise: ['#FFB75E', '#ED8F03'],   // 晨曦橙：元气、早安
  ocean:   ['#2193B0', '#6DD5ED'],   // 海洋蓝：静谧、旅行
  forest:  ['#11998E', '#38EF7D'],   // 森林绿：自然、平静
  candy:   ['#FF6A88', '#FF99AC'],   // 甜蜜粉：可爱、少女
  berry:   ['#CB356B', '#BD3F32'],   // 浆果红：激烈、热血
  mint:    ['#00B09B', '#96C93D'],   // 薄荷：清新、健康
  cosmic:  ['#6A11CB', '#2575FC'],   // 宇宙紫：科技、深度
  amber:   ['#F7971E', '#FFD200'],   // 琥珀金：温暖、怀念
  aurora:  ['#667EEA', '#764BA2'],   // 极光紫蓝：梦幻、情绪
  cherry:  ['#EB3349', '#F45C43'],   // 樱红：热情、表白
  lime:    ['#A8FF78', '#78FFD6'],   // 青柠：活力、运动
  ink:     ['#232526', '#414345'],   // 墨：冷峻、深夜思考
  coral:   ['#FF9966', '#FF5E62'],   // 珊瑚：治愈、元气
  lavender: ['#DA22FF', '#9733EE'],  // 薰衣草：文艺、内省
  fire:    ['#F12711', '#F5AF19'],   // 烈焰：激情、胜利
  steel:   ['#485563', '#29323C'],   // 钢铁：技术、专注
}

/**
 * 关键词 → emoji 映射。命中任意关键词即采用对应 emoji。
 * 顺序即优先级：前面的优先。
 */
const KEYWORD_TO_EMOJI: Array<[RegExp, string, CoverTheme]> = [
  [/早安|早上好|起床|早起|晨跑|早餐/, '🌅', 'sunrise'],
  [/晚安|睡觉|入睡|深夜|凌晨|困了/, '🌙', 'ink'],
  [/晚餐|吃饭|午餐|美食|好吃|馋|饭|面|火锅|烧烤|奶茶|咖啡/, '🍜', 'amber'],
  [/旅行|出游|风景|海边|山|旅游|机票|打卡/, '🏞️', 'ocean'],
  [/运动|跑步|健身|篮球|足球|羽毛球|爬山|骑行|游泳/, '💪', 'lime'],
  [/考试|复习|作业|论文|背书|自习|图书馆|学习|刷题|毕业|绩点/, '📚', 'cosmic'],
  [/代码|编程|bug|debug|开发|前端|后端|程序员|算法|数据结构/, '💻', 'steel'],
  [/电影|追剧|综艺|动漫|番剧|b站|视频|演出|演唱会/, '🎬', 'lavender'],
  [/音乐|歌曲|唱歌|演唱|耳机|专辑/, '🎵', 'aurora'],
  [/生日|庆祝|祝贺|彩蛋|惊喜|happy|蛋糕|礼物/, '🎉', 'candy'],
  [/恋爱|女朋友|男朋友|告白|表白|喜欢你|爱你|约会|情侣/, '💕', 'cherry'],
  [/哭|难过|emo|伤心|失恋|分手|抑郁|焦虑/, '😭', 'aurora'],
  [/笑|搞笑|哈哈|好笑|笑死|笑抽/, '😂', 'amber'],
  [/生气|气死|烦|崩溃|发疯|发火/, '😤', 'fire'],
  [/加油|努力|冲|奋斗|坚持|拼|战|打工/, '🔥', 'fire'],
  [/思考|想|哲学|灵感|觉悟|顿悟/, '💭', 'cosmic'],
  [/感谢|谢谢|感恩|温暖|治愈/, '🌸', 'coral'],
  [/天气|下雨|阳光|雪|春|夏|秋|冬|樱花/, '🌸', 'mint'],
  [/拍照|摄影|自拍|照片|九宫格|滤镜/, '📷', 'cosmic'],
  [/宠物|猫|狗|喵|汪|主子/, '🐾', 'forest'],
  [/游戏|吃鸡|王者|原神|mc|steam|主机|手游/, '🎮', 'berry'],
  [/新年|春节|元旦|圣诞|中秋|端午/, '✨', 'fire'],
]

/** 常见 emoji → 推荐主题（让情感契合） */
const EMOJI_TO_THEME: Record<string, CoverTheme> = {
  '😄': 'amber', '😂': 'amber', '🤣': 'amber',
  '😊': 'coral', '🥰': 'candy', '😘': 'cherry',
  '😭': 'aurora', '😢': 'ocean', '🥺': 'lavender',
  '😤': 'fire', '🤬': 'fire', '😡': 'berry',
  '🤔': 'cosmic', '😶': 'steel', '🤯': 'cosmic',
  '😴': 'ink', '🥱': 'ink', '💤': 'ink',
  '🔥': 'fire', '💪': 'lime', '✨': 'candy',
  '🎉': 'candy', '🎂': 'candy', '🎁': 'cherry',
  '❤️': 'cherry', '💕': 'candy', '💖': 'cherry',
  '☀️': 'sunrise', '🌙': 'ink', '🌅': 'sunrise',
  '🌈': 'aurora', '🌸': 'candy', '🌺': 'coral',
  '🍜': 'amber', '🍣': 'ocean', '☕': 'amber',
  '📚': 'cosmic', '✏️': 'cosmic', '🎓': 'lavender',
  '💻': 'steel', '⌨️': 'steel', '🖥️': 'steel',
  '🎵': 'aurora', '🎧': 'aurora', '🎤': 'cherry',
  '🎬': 'lavender', '🎮': 'berry', '🏀': 'lime',
  '🏞️': 'ocean', '🌊': 'ocean', '⛰️': 'forest',
  '🌲': 'forest', '🍃': 'mint', '🌿': 'mint',
  '🐾': 'forest', '🐱': 'candy', '🐶': 'amber',
}

/**
 * 从文本提取第一个 emoji（支持 surrogate pair 和组合字符）。
 * 注意：emoji 正则不能覆盖所有 Unicode 平面，但常用集合足够。
 */
const EMOJI_REGEX = /\p{Extended_Pictographic}/u

function extractFirstEmoji(text: string): string | null {
  const match = text.match(EMOJI_REGEX)
  return match ? match[0] : null
}

function themeFromEmoji(emoji: string): CoverTheme | null {
  if (EMOJI_TO_THEME[emoji]) return EMOJI_TO_THEME[emoji]
  // 基于 emoji 大类做降级：比如所有动物归 forest，所有食物归 amber
  // （这里 emoji 第一个 codepoint 可以粗略分类，简化实现）
  return null
}

function hashStringToTheme(text: string): CoverTheme {
  const themes = Object.keys(COVER_GRADIENTS) as CoverTheme[]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return themes[Math.abs(hash) % themes.length]
}

/**
 * 为一条动态生成封面样式。
 *
 * @param content 动态正文
 * @param hasMedia 是否已有图片/视频；为 true 时返回 null（UI 直接展示原媒体）
 * @returns 封面样式，或 null（不需要封面）
 */
export function generateCoverStyle(content: string, hasMedia: boolean): CoverStyle | null {
  if (hasMedia) return null
  const text = (content || '').trim()
  if (!text) {
    return {
      emoji: '✨',
      gradient: COVER_GRADIENTS.aurora,
      theme: 'aurora',
      angle: 135,
    }
  }

  // 1) 先看正文里有没有现成的 emoji
  const firstEmoji = extractFirstEmoji(text)
  if (firstEmoji) {
    const theme = themeFromEmoji(firstEmoji) || hashStringToTheme(text)
    return {
      emoji: firstEmoji,
      gradient: COVER_GRADIENTS[theme],
      theme,
      angle: 135,
    }
  }

  // 2) 关键词匹配
  for (const [re, emoji, theme] of KEYWORD_TO_EMOJI) {
    if (re.test(text)) {
      return {
        emoji,
        gradient: COVER_GRADIENTS[theme],
        theme,
        angle: 135,
      }
    }
  }

  // 3) 兜底：内容哈希到随机主题，emoji 用中性的 🌟
  const theme = hashStringToTheme(text)
  return {
    emoji: '🌟',
    gradient: COVER_GRADIENTS[theme],
    theme,
    angle: 135,
  }
}

/**
 * 把 CoverStyle 序列化成 CSS background 字符串，方便模板直接绑定 :style。
 */
export function coverStyleToCss(style: CoverStyle): string {
  const angle = style.angle ?? 135
  return `linear-gradient(${angle}deg, ${style.gradient[0]} 0%, ${style.gradient[1]} 100%)`
}

/**
 * v13.1 助手：把数据库 / 老代码里的 cover_style（可能是 JSON 字符串、主题名、或对象）
 * 统一归一化为 CoverStyle 对象，无效输入返回 null。
 */
export function parseCoverStyle(input: string | CoverStyle | null | undefined): CoverStyle | null {
  if (!input) return null
  if (typeof input === 'object') {
    if ('emoji' in input && Array.isArray((input as CoverStyle).gradient)) {
      return input as CoverStyle
    }
    return null
  }
  // string 形式：先尝试 JSON 解析
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && parsed.emoji && Array.isArray(parsed.gradient)) {
          return parsed as CoverStyle
        }
      } catch { /* not JSON */ }
    }
    // 主题名 fallback：匹配 COVER_GRADIENTS 的 key
    if (trimmed in COVER_GRADIENTS) {
      return {
        emoji: '✨',
        gradient: COVER_GRADIENTS[trimmed as CoverTheme],
        theme: trimmed as CoverTheme,
        angle: 135,
      }
    }
  }
  return null
}
