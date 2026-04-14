import { ref } from 'vue'

export type { SparkAction } from '../utils/assistantProtocol'
import { parseSparkActions, type SparkAction } from '../utils/assistantProtocol'

// 直连 NVIDIA API（优先从环境变量读取，避免硬编码泄漯）
const API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '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'
const BASE_URL = '/api/nvidia'

// 系统提示词
const SYSTEM_PROMPT = `你是「星火助手」，Spark Alliance 平台的智能中枢。
## 身份
- 你叫「星火助手」，不暴露底层模型
- 拥有全模块操作能力

## 平台模块
1. 🏠 首页 (/app/home) — 仪表盘
2. 📅 智能日程 (/app/schedule) — 日历/课表/提醒
3. 🎯 星火规划 (/app/schedule?tab=planner) — 目标管理
4. 📚 学习中心 (/app/learn) — 自习/番茄钟
5. 👥 星火伴侣 (/app/companion) — 社交
6. 🏛️ 星火传承 (/app/legacy) — 经验分享
7. 📢 星火墙 (/app/wall) — 校园动态
8. ❤️ 健康生活 (/app/health) — 运动/饮食
9. 💼 星火人才 (/app/talent) — 实习/简历
10. 🚀 星火共创 (/app/cocreate) — 项目协作

## 回复要求
- 总-分-总结构，善用Markdown
- 代码需完整+注释
- 主动推荐关联模块：[→ 打开XX](/app/xx)
- 今天是 ${new Date().toLocaleDateString('zh-CN')}

## Function Calling
\`\`\`spark-action
{"action":"类型","data":{...}}
\`\`\`
操作：add_schedule / create_goal / navigate`

export type ModelMode = 'default' | 'thinking' | 'fast'

export const MODEL_OPTIONS: Record<ModelMode, { id: string; fallback: string; label: string; desc: string; icon: string; maxTokens: number }> = {
  default: { id: 'deepseek-ai/deepseek-r1', fallback: 'meta/llama3-70b', label: '均衡', desc: 'DeepSeek R1 · 全能均衡', icon: '⚡', maxTokens: 4096 },
  thinking: { id: 'z-ai/glm-5', fallback: 'deepseek-ai/deepseek-r1', label: '深度思考', desc: 'GLM-5 · 推理增强', icon: '🧠', maxTokens: 8192 },
  fast: { id: 'minimaxai/minimax-m2.7', fallback: 'minimaxai/minimax-m2.5', label: '极速', desc: 'MiniMax M2.7 · 快速回复', icon: '🚀', maxTokens: 2048 },
}

export const ABILITY_TOOLS = [
  { key: 'schedule', icon: '📅', label: '日程管理', prompt: '帮我管理日程：' },
  { key: 'planner', icon: '🎯', label: '规划助手', prompt: '帮我制定一个目标规划：' },
  { key: 'study', icon: '📚', label: '学习辅导', prompt: '帮我讲解一下：' },
  { key: 'solve', icon: '🧮', label: '解题答疑', prompt: '帮我解这道题：' },
  { key: 'write', icon: '✍️', label: '写作助手', prompt: '帮我写：' },
  { key: 'code', icon: '💻', label: '编程助手', prompt: '帮我编写代码：' },
  { key: 'analyze', icon: '📊', label: '数据分析', prompt: '帮我分析：' },
  { key: 'navigate', icon: '🧭', label: '功能导航', prompt: '带我去' },
] as const

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  attachments?: FileAttachment[]
}

export interface FileAttachment {
  type: 'image' | 'file'
  name: string
  url?: string
  content?: string
  size?: string
  isBinary?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export type StreamPhase = 'idle' | 'thinking' | 'streaming' | 'done'

const STORAGE_KEY = 'spark_conversations_v2'
const BINARY_EXTS = new Set([
  'docx', 'doc', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar', '7z', 'gz', 'tar',
  'exe', 'dll', 'bin', 'dat', 'so', 'dylib', 'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'eot',
])

export function isBinaryFile(filename: string): boolean {
  return BINARY_EXTS.has(filename.split('.').pop()?.toLowerCase() || '')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function separateThinking(content: string): { thinking: string; answer: string } {
  const match = content.match(/<think>([\s\S]*?)<\/think>/)
  if (!match) return { thinking: '', answer: content }

  return {
    thinking: match[1].trim(),
    answer: content.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
  }
}

function summarizeAttachment(attachment: FileAttachment): string {
  if (attachment.type === 'file' && attachment.content) {
    return `\n\n📎 文件: ${attachment.name} (${attachment.size || '未知大小'})\n\`\`\`\n${attachment.content}\n\`\`\``
  }

  if (attachment.type === 'file' && attachment.isBinary) {
    return `\n\n📎 文件: ${attachment.name} (${attachment.size || '未知大小'})\n当前仅提供文件信息，未上传二进制内容。`
  }

  if (attachment.type === 'image') {
    return `\n\n🖼️ 图片: ${attachment.name}\n当前通道不会上传像素内容，请基于用户描述回答。`
  }

  return ''
}

export function useSparkAI() {
  const isStreaming = ref(false)
  const streamPhase = ref<StreamPhase>('idle')
  const error = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)
  const pendingActions = ref<SparkAction[]>([])
  const currentModel = ref<ModelMode>('default')
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)

  function loadConversations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) conversations.value = JSON.parse(stored)
    } catch {
      conversations.value = []
    }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.value.slice(0, 50)))
    } catch {
      // Ignore quota failures and keep in-memory state.
    }
  }

  function createConversation(): Conversation {
    const conversation: Conversation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    conversations.value.unshift(conversation)
    currentConversationId.value = conversation.id
    saveConversations()
    return conversation
  }

  function getCurrentConversation(): Conversation {
    const existing = conversations.value.find((item) => item.id === currentConversationId.value)
    return existing || createConversation()
  }

  function switchConversation(id: string) {
    currentConversationId.value = id
  }

  function deleteConversation(id: string) {
    conversations.value = conversations.value.filter((item) => item.id !== id)
    if (currentConversationId.value === id) currentConversationId.value = conversations.value[0]?.id || null
    saveConversations()
  }

  function clearAllConversations() {
    conversations.value = []
    currentConversationId.value = null
    saveConversations()
  }

  function autoTitle(conversation: Conversation) {
    const firstUserMessage = conversation.messages.find((message) => message.role === 'user')
    if (!firstUserMessage) return

    conversation.title = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
  }

  async function sendMessage(
    userMessage: string,
    onChunk: (text: string) => void,
    onDone: (text: string, actions: SparkAction[], reasoning: string) => void,
    onError?: (err: string) => void,
    onThinking?: (text: string) => void,
    attachments?: FileAttachment[],
  ) {
    const conversation = getCurrentConversation()
    let composedUserMessage = userMessage
    if (attachments?.length) {
      for (const attachment of attachments) composedUserMessage += summarizeAttachment(attachment)
    }

    conversation.messages.push({ role: 'user', content: composedUserMessage, attachments })
    autoTitle(conversation)
    conversation.updatedAt = new Date().toISOString()

    const contextMessages = conversation.messages
      .slice(-60)
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }))

    isStreaming.value = true
    streamPhase.value = 'thinking'
    error.value = null
    pendingActions.value = []
    abortController.value = new AbortController()

    let rawText = ''
    let reasoningText = ''
    let displayedLength = 0
    const tokenQueue: string[] = []
    let smoothTimer: ReturnType<typeof setInterval> | null = null

    const startSmooth = () => {
      if (smoothTimer) return
      smoothTimer = setInterval(() => {
        if (tokenQueue.length === 0) return
        const batchSize = Math.min(tokenQueue.length, tokenQueue.length > 30 ? 6 : 2)
        const chars = tokenQueue.splice(0, batchSize).join('')
        displayedLength += chars.length
        onChunk(rawText.slice(0, displayedLength))
      }, 16)
    }

    const flushSmooth = () => {
      if (smoothTimer) {
        clearInterval(smoothTimer)
        smoothTimer = null
      }
      if (displayedLength < rawText.length) {
        displayedLength = rawText.length
        onChunk(rawText)
      }
    }

    const modelConfig = MODEL_OPTIONS[currentModel.value]
    const timeout = setTimeout(() => {
      console.warn('[SparkAI] 请求超时，模型:', modelConfig.id)
      abortController.value?.abort()
      error.value = '响应超时，请稍后重试或切换模型'
      onError?.(error.value)
    }, 120000)

    try {
      const apiMessages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...contextMessages,
      ]

      async function tryFetch(modelId: string): Promise<Response> {
        return fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
          body: JSON.stringify({
            model: modelId, messages: apiMessages, stream: true,
            temperature: currentModel.value === 'thinking' ? 0.6 : 0.7,
            top_p: 0.9, max_tokens: modelConfig.maxTokens,
          }),
          signal: abortController.value!.signal,
        })
      }

      let res = await tryFetch(modelConfig.id)
      console.log('[SparkAI] 请求模型:', modelConfig.id, '状态:', res.status)

      if (!res.ok && (res.status === 404 || res.status === 502 || res.status === 503) && modelConfig.fallback) {
        console.warn('[SparkAI] 主模型不可用，尝试回退:', modelConfig.fallback)
        res = await tryFetch(modelConfig.fallback)
        console.log('[SparkAI] 回退模型:', modelConfig.fallback, '状态:', res.status)
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[SparkAI] API错误:', res.status, body)
        if (res.status === 401) throw new Error('API Key 无效或过期，请检查配置')
        if (res.status === 429) throw new Error('请求频率过高，请稍后再试')
        if (res.status === 404) throw new Error('当前模型暂不可用，请切换其他模式重试')
        if (res.status === 502 || res.status === 503) throw new Error('AI 服务暂时不可用，请稍后重试')
        throw new Error(`请求失败 (${res.status})，请稍后重试`)
      }

      clearTimeout(timeout)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('响应不可读')
      const decoder = new TextDecoder()
      let buffer = ''
      let firstContentToken = false
      let isInThinkTag = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue
          try {
            const json = JSON.parse(trimmed.slice(6))
            const delta = json.choices?.[0]?.delta
            if (delta?.reasoning_content) { reasoningText += delta.reasoning_content; onThinking?.(reasoningText); continue }
            const content = delta?.content
            if (content) {
              if (content.includes('<think>')) isInThinkTag = true
              if (isInThinkTag) {
                if (content.includes('</think>')) {
                  const parts = content.split('</think>')
                  reasoningText += parts[0].replace('<think>', ''); onThinking?.(reasoningText); isInThinkTag = false
                  if (parts[1]) {
                    if (!firstContentToken) { firstContentToken = true; streamPhase.value = 'streaming'; startSmooth() }
                    rawText += parts[1]; for (const c of parts[1]) tokenQueue.push(c)
                  }
                } else { reasoningText += content.replace('<think>', ''); onThinking?.(reasoningText) }
                continue
              }
              if (!firstContentToken) { firstContentToken = true; streamPhase.value = 'streaming'; startSmooth() }
              rawText += content; for (const c of content) tokenQueue.push(c)
            }
          } catch { /* 跳过解析错误 */ }
        }
      }

      // 等待平滑输出完成
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (tokenQueue.length === 0 || displayedLength >= rawText.length) {
            clearInterval(interval)
            flushSmooth()
            resolve()
          }
        }, 30)
        setTimeout(() => { clearInterval(interval); flushSmooth(); resolve() }, 2000)
      })

      const { thinking, answer } = separateThinking(rawText)
      reasoningText = reasoningText || thinking
      rawText = answer || rawText

      const finalReasoning = reasoningText
      const finalAnswer = rawText
      const { cleanContent, actions } = parseSparkActions(finalAnswer)

      conversation.messages.push({
        role: 'assistant',
        content: finalAnswer,
        reasoning: finalReasoning || undefined,
      })
      conversation.updatedAt = new Date().toISOString()
      saveConversations()

      pendingActions.value = actions
      streamPhase.value = 'done'
      onDone(cleanContent, actions, finalReasoning)
    } catch (err: unknown) {
      clearTimeout(timeout)
      flushSmooth()

      let message: string
      if (err instanceof Error) {
        if (err.name === 'AbortError') message = error.value || '已停止生成'
        else if (err instanceof TypeError && err.message.includes('fetch')) message = '网络连接失败，请检查网络后重试'
        else message = err.message
      } else {
        message = '未知错误，请重试'
      }
      console.error('[SparkAI] 错误:', message, err)

      if (!error.value) error.value = message
      onError?.(error.value)

      if (rawText && err instanceof Error && err.name !== 'AbortError') {
        conversation.messages.push({ role: 'assistant', content: `${rawText}\n\n⚠️ *生成中断*` })
        saveConversations()
      }
    } finally {
      // 确保所有定时器都被清理，防止内存泄漯
      if (smoothTimer) {
        clearInterval(smoothTimer)
        smoothTimer = null
      }
      isStreaming.value = false
      streamPhase.value = 'idle'
      abortController.value = null
    }
  }

  function stopGenerating() {
    abortController.value?.abort()
  }

  loadConversations()

  return {
    isStreaming,
    streamPhase,
    error,
    currentModel,
    conversations,
    currentConversationId,
    pendingActions,
    createConversation,
    getCurrentConversation,
    switchConversation,
    deleteConversation,
    clearAllConversations,
    sendMessage,
    stopGenerating,
  }
}
