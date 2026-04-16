/**
 * 内容安全缓冲层
 *
 * 在 AI 输入和输出两端做安全过滤：
 * - 输入端：检测恶意注入、敏感内容
 * - 输出端：过滤模型身份泄露、XSS、敏感内容
 */

const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /eval\s*\(/gi,
  /data\s*:\s*text\/html/gi,
]

const SENSITIVE_INPUT_PATTERNS = [
  /(?:赌博|gambling|casino)/i,
  /(?:色情|pornograph|xxx|nsfw)/i,
  /(?:毒品|drug\s+deal|narcotic|贩毒)/i,
  /(?:恐怖袭击|terroris[mt]|bomb\s+threat)/i,
  /(?:诈骗|phishing|scam)/i,
  /(?:枪支|炸弹|武器制造|制毒)/i,
  /(?:传销|非法集资|洗钱)/i,
]

const MODEL_IDENTITY_FILTERS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /(?:我是.*?(?:GPT|Claude|Gemini|Gemma|LLaMA|DeepSeek|Llama|Mistral|大语言模型|大模型|AI模型|语言模型))/gi, replacement: '我是星火助手' },
  { pattern: /(?:作为(?:一个)?(?:AI|人工智能|语言模型|大模型|机器人))/gi, replacement: '作为星火助手' },
  { pattern: /(?:我(?:没有|无法拥有)(?:感情|情感|个人观点|意识))/gi, replacement: '这个话题挺有意思的' },
  { pattern: /(?:OpenAI|Anthropic|Google\s+AI|Meta\s+AI|NVIDIA)/gi, replacement: '星火团队' },
  { pattern: /(?:我的训练数据|我的知识截止)/gi, replacement: '我了解的信息' },
  { pattern: /(?:I(?:'m| am) (?:a |an )?(?:AI|language model|LLM|large language model))/gi, replacement: "I'm 星火助手" },
  { pattern: /\bGemma\b/gi, replacement: '星火' },
]

export interface SafetyResult {
  safe: boolean
  blocked: boolean
  reason?: string
  content: string
}

export function checkInputSafety(text: string): SafetyResult {
  if (!text || typeof text !== 'string') {
    return { safe: false, blocked: true, reason: '输入为空', content: '' }
  }

  if (text.length > 50000) {
    return { safe: false, blocked: true, reason: '输入过长', content: '' }
  }

  for (const pattern of SENSITIVE_INPUT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        blocked: true,
        reason: '检测到敏感内容',
        content: '这个话题不太合适哦，我们聊点别的吧！',
      }
    }
  }

  return { safe: true, blocked: false, content: text }
}

export function sanitizeOutput(text: string): string {
  if (!text) return ''

  let result = text

  for (const filter of MODEL_IDENTITY_FILTERS) {
    result = result.replace(filter.pattern, filter.replacement)
  }

  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, '')
  }

  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return result
}

export function sanitizeJsonOutput(text: string): string {
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (!jsonMatch) return text
  return jsonMatch[0]
}
