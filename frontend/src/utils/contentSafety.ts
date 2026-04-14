/**
 * contentSafety.ts — 内容安全检查（AI缓冲层）
 *
 * 前端层面的内容安全防护，过滤 AI 返回结果中的异常内容：
 * 1. XSS 注入检测和清洗
 * 2. 超长文本截断
 * 3. 非法字符清理
 * 4. 敏感关键词检测
 */

/** 文本最大长度限制 */
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_LOCATION_LENGTH = 200

/** XSS 危险模式 */
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object\b[^>]*>[\s\S]*?<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /data\s*:\s*text\/html/gi,
  /expression\s*\(/gi,
  /eval\s*\(/gi,
]

/** 敏感内容关键词（中英混合） */
const SENSITIVE_PATTERNS = [
  /(?:赌博|gambling|casino)/i,
  /(?:色情|pornograph|xxx|nsfw|黄色|裸体)/i,
  /(?:毒品|drug\s+deal|narcotic|吸毒|贩毒)/i,
  /(?:暴力|terroris[mt]|bomb\s+threat|恐怖袭击)/i,
  /(?:诈骗|phishing|scam|骗钱|骗局)/i,
  /(?:自杀|自残|自我伤害|suicide|self[- ]harm|割腕|跳楼)/i,
  /(?:枪支|炸弹|爆炸物|武器制造|制毒)/i,
  /(?:传销|非法集资|洗钱|高利贷)/i,
  /(?:翻墙|VPN教程|科学上网方法)/i,
  /(?:代写|代考|作弊|买答案|论文代做)/i,
]

/** AI 响应中需要过滤/替换的模式 */
const AI_RESPONSE_FILTERS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(?:我是.*(?:GPT|Claude|Gemini|LLaMA|DeepSeek|Llama|Mistral|大语言模型|大模型|AI模型|语言模型))/gi, replacement: '我是星火助手' },
  { pattern: /(?:作为(?:一个)?(?:AI|人工智能|语言模型|大模型|机器人))/gi, replacement: '作为星火助手' },
  { pattern: /(?:我(?:没有|无法拥有)(?:感情|情感|个人观点|意识))/gi, replacement: '这个话题挺有意思的' },
  { pattern: /(?:OpenAI|Anthropic|Google\s+AI|Meta\s+AI|NVIDIA\s+NIM)/gi, replacement: '星火团队' },
  { pattern: /(?:我的训练数据|我的知识截止)/gi, replacement: '我了解的信息' },
]

/** 清洗单个文本字段 */
export function sanitizeText(text: string, maxLength: number = MAX_DESCRIPTION_LENGTH): string {
  if (!text || typeof text !== 'string') return ''

  let cleaned = text.trim()

  // 移除 XSS 危险内容
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  // 移除 HTML 标签
  cleaned = cleaned.replace(/<[^>]+>/g, '')

  // 移除控制字符（保留换行和制表符）
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 截断超长文本
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + '…'
  }

  return cleaned
}

/** 检查文本是否包含敏感内容 */
export function hasSensitiveContent(text: string): boolean {
  if (!text) return false
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text))
}

/** 内容安全检查结果 */
export interface SafetyCheckResult {
  safe: boolean
  warnings: string[]
  sanitizedTitle: string
  sanitizedDescription: string
  sanitizedLocation: string
}

/** 对单个事件进行内容安全检查和清洗 */
export function checkEventSafety(event: {
  title: string
  description: string
  location: string
}): SafetyCheckResult {
  const warnings: string[] = []

  const sanitizedTitle = sanitizeText(event.title, MAX_TITLE_LENGTH)
  const sanitizedDescription = sanitizeText(event.description, MAX_DESCRIPTION_LENGTH)
  const sanitizedLocation = sanitizeText(event.location, MAX_LOCATION_LENGTH)

  // 标题不能为空
  if (!sanitizedTitle) {
    warnings.push('事件标题为空或包含非法内容')
  }

  // 检查敏感内容
  const fullText = `${sanitizedTitle} ${sanitizedDescription} ${sanitizedLocation}`
  if (hasSensitiveContent(fullText)) {
    warnings.push('检测到可能的敏感内容，请确认')
  }

  // 检查是否有内容被清洗（说明有潜在XSS）
  if (event.title !== sanitizedTitle && event.title.length > 0) {
    warnings.push('标题中的异常内容已被过滤')
  }

  return {
    safe: warnings.length === 0,
    warnings,
    sanitizedTitle: sanitizedTitle || '未命名事件',
    sanitizedDescription,
    sanitizedLocation,
  }
}

/** 过滤 AI 响应内容（缓冲层） */
export function sanitizeAIResponse(text: string): string {
  if (!text) return ''
  let result = text

  for (const filter of AI_RESPONSE_FILTERS) {
    result = result.replace(filter.pattern, filter.replacement)
  }

  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, '')
  }

  return result
}

/** 检查 AI 响应是否包含敏感内容，返回安全版本 */
export function checkAIResponseSafety(text: string): { safe: boolean; content: string } {
  if (!text) return { safe: true, content: '' }

  if (hasSensitiveContent(text)) {
    return {
      safe: false,
      content: '抱歉，这个话题我不太方便展开讨论。换个问题聊聊？我可以帮你管理日程、辅导学习、规划目标等等 😊',
    }
  }

  return { safe: true, content: sanitizeAIResponse(text) }
}

/** 批量安全检查和清洗导入事件 */
export function sanitizeImportedEvents<T extends { title: string; description: string; location: string }>(
  events: T[],
): { events: T[]; totalWarnings: string[] } {
  const totalWarnings: string[] = []

  const sanitized = events.map((event) => {
    const result = checkEventSafety(event)
    if (result.warnings.length > 0) {
      totalWarnings.push(`「${event.title || '未命名'}」: ${result.warnings.join(', ')}`)
    }
    return {
      ...event,
      title: result.sanitizedTitle,
      description: result.sanitizedDescription,
      location: result.sanitizedLocation,
    }
  })

  // 过滤掉标题为空的事件
  const valid = sanitized.filter(e => e.title && e.title !== '未命名事件' || e.description)

  return { events: valid as T[], totalWarnings }
}
