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
  /(?:色情|pornograph|xxx|nsfw)/i,
  /(?:毒品|drug\s+deal|narcotic)/i,
  /(?:暴力|terroris[mt]|bomb\s+threat)/i,
  /(?:诈骗|phishing|scam)/i,
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
