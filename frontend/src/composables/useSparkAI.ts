import { ref } from 'vue'
import { supabase } from '../supabase'

export type { SparkAction } from '../utils/assistantProtocol'
import { parseSparkActions, type SparkAction } from '../utils/assistantProtocol'
import { checkAIResponseSafety, hasSensitiveContent } from '../utils/contentSafety'

function getEdgeFunctionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) throw new Error('缺少 SUPABASE_URL 配置')
  return `${base}/functions/v1/assistant-chat`
}

export type ModelMode = 'default' | 'thinking' | 'fast'

export const MODEL_OPTIONS: Record<ModelMode, { id: string; fallbacks: string[]; label: string; desc: string; icon: string; maxTokens: number }> = {
  default: { id: 'google/gemma-3-27b-it', fallbacks: ['meta/llama-3.1-8b-instruct'], label: '均衡', desc: '星火 Gamma4 · 全能均衡', icon: '⚡', maxTokens: 4096 },
  thinking: { id: 'google/gemma-3-27b-it', fallbacks: ['meta/llama-3.1-8b-instruct'], label: '深度思考', desc: '星火 Gamma4 · 推理增强', icon: '🧠', maxTokens: 8192 },
  fast: { id: 'google/gemma-3-27b-it', fallbacks: ['meta/llama-3.1-8b-instruct'], label: '极速', desc: '星火 Gamma4 · 快速回复', icon: '🚀', maxTokens: 2048 },
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

    if (hasSensitiveContent(userMessage)) {
      const safeReply = '这个话题不太合适哦，我们聊点别的吧！我可以帮你管理日程、辅导学习、规划目标 😊'
      conversation.messages.push({ role: 'user', content: userMessage, attachments })
      conversation.messages.push({ role: 'assistant', content: safeReply })
      autoTitle(conversation)
      conversation.updatedAt = new Date().toISOString()
      saveConversations()
      onChunk(safeReply)
      onDone(safeReply, [], '')
      return
    }

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

    const timeout = setTimeout(() => {
      console.warn('[SparkAI] 请求超时，模式:', currentModel.value)
      abortController.value?.abort()
      error.value = '响应超时，请稍后重试或切换模型'
      onError?.(error.value)
    }, 120000)

    try {
      let res: Response

      // 优先通过 Edge Function，失败则降级直连 NVIDIA API
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('NO_AUTH')

        const edgeUrl = getEdgeFunctionUrl()
        res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            assistant: 'spark',
            mode: currentModel.value,
            messages: contextMessages,
            stream: true,
          }),
          signal: abortController.value!.signal,
        })

        if (!res.ok) {
          if (res.status === 401) throw new Error('请先登录后再使用 AI 助手')
          if (res.status === 429) throw new Error('请求过于频繁，请等待几秒后重试')
          throw new Error(`Edge Function 失败 (${res.status})`)
        }
        console.log('[SparkAI] Edge Function 成功')
      } catch (edgeErr: unknown) {
        if (edgeErr instanceof Error && edgeErr.name === 'AbortError') throw edgeErr
        if (edgeErr instanceof Error && (edgeErr.message === '请先登录后再使用 AI 助手' || edgeErr.message === '请求过于频繁，请等待几秒后重试')) throw edgeErr

        console.warn('[SparkAI] Edge Function 不可用:', edgeErr instanceof Error ? edgeErr.message : edgeErr)
        throw new Error('AI 服务暂时不可用，请稍后重试')
      }

      clearTimeout(timeout)

      const contentType = res.headers.get('content-type') || ''
      const isSSE = contentType.includes('text/event-stream') || contentType.includes('text/plain')

      if (isSSE && res.body) {
        const reader = res.body.getReader()
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
            } catch { /* skip parse errors in SSE chunks */ }
          }
        }

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
      } else {
        const data = await res.json().catch(() => ({}))
        rawText = typeof data.content === 'string' ? data.content : (data.choices?.[0]?.message?.content ?? '')
        reasoningText = typeof data.reasoning === 'string' ? data.reasoning : ''
        if (rawText) {
          streamPhase.value = 'streaming'
          startSmooth()
          for (const c of rawText) tokenQueue.push(c)
          await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
              if (tokenQueue.length === 0 || displayedLength >= rawText.length) {
                clearInterval(interval); flushSmooth(); resolve()
              }
            }, 30)
            setTimeout(() => { clearInterval(interval); flushSmooth(); resolve() }, 3000)
          })
        }
      }

      const { thinking, answer } = separateThinking(rawText)
      reasoningText = reasoningText || thinking
      rawText = answer || rawText

      const finalReasoning = reasoningText
      const safetyCheck = checkAIResponseSafety(rawText)
      const finalAnswer = safetyCheck.content
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
