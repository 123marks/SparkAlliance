import { ref } from 'vue'
import { supabase } from '../supabase'

export type { SparkAction } from '../utils/assistantProtocol'
import { parseSparkActions, type SparkAction } from '../utils/assistantProtocol'
import { checkAIResponseSafety, hasSensitiveContent } from '../utils/contentSafety'
import { loadPersist, savePersist, subscribePersist } from '../utils/persist'

function getEdgeFunctionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) throw new Error('缺少 SUPABASE_URL 配置')
  return `${base}/functions/v1/assistant-chat`
}

/**
 * 获取有效的 Supabase session —— 若剩余生命周期 < 90s 会主动刷新。
 * 这是修复"明明登录了却报登录过期"bug 的核心：之前只在 session 为空时才刷新，
 * 对于过期但未清除的 session 会把坏 token 发给 Edge Function。
 */
async function getValidSession() {
  try {
    let { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      try {
        const refreshed = await supabase.auth.refreshSession()
        session = refreshed.data?.session ?? null
      } catch { /* ignore */ }
      return session
    }
    const nowSec = Math.floor(Date.now() / 1000)
    const expSec = session.expires_at ?? 0
    if (expSec > 0 && expSec - nowSec < 90) {
      try {
        const refreshed = await supabase.auth.refreshSession()
        session = refreshed.data?.session ?? session
      } catch { /* refresh 失败就走原 token，让 Edge Function 明确 401 */ }
    }
    return session
  } catch {
    return null
  }
}

/** 本地 Gamma4 / Gemma 3 Ollama 服务地址（services/local-ai）
 *  - 开发环境：同机 http://localhost:3721
 *  - 生产环境：设置 VITE_LOCAL_AI_URL 到反向代理的 HTTPS 域名
 *  - 完全未配置时只走云端（Edge Function）
 */
const LOCAL_AI_URL = import.meta.env.VITE_LOCAL_AI_URL || 'http://localhost:3721'
/** 健康检查缓存：5 分钟内不重复 ping，避免反复探测 */
const LOCAL_HEALTH_TTL_MS = 5 * 60 * 1000
const BACKEND_PREF_KEY = 'spark_ai_backend_pref_v1'

export type ModelMode = 'default' | 'thinking' | 'fast'
/** 后端选择：cloud=只用云端 Edge Function；local=只用本机 Ollama；auto=先云端失败降级本地 */
export type BackendMode = 'cloud' | 'local' | 'auto'

/**
 * 3 种模式映射到不同的真实底层模型（Edge Function 侧实际路由），
 * 前端这里仅展示用途。品牌对外统一叫"星火"，内部使用 NVIDIA NIM。
 * - default（标准）→ Gemma 3 27B：本项目默认，速度质量平衡
 * - thinking（深度）→ DeepSeek R1：真推理链，适合复杂题
 * - fast（极速）→ Llama 3.1 8B：快速回答
 */
export const MODEL_OPTIONS: Record<ModelMode, { id: string; fallbacks: string[]; label: string; desc: string; icon: string; maxTokens: number }> = {
  default: {
    id: 'google/gemma-3-27b-it',
    fallbacks: ['meta/llama-3.1-8b-instruct'],
    label: '标准',
    desc: '星火 · Gemma 3 27B（项目默认）',
    icon: '⚡',
    maxTokens: 4096,
  },
  thinking: {
    id: 'deepseek-ai/deepseek-r1',
    fallbacks: ['google/gemma-3-27b-it', 'meta/llama-3.1-8b-instruct'],
    label: '深度思考',
    desc: '星火 · DeepSeek R1 推理链',
    icon: '🧠',
    maxTokens: 8192,
  },
  fast: {
    id: 'meta/llama-3.1-8b-instruct',
    fallbacks: ['google/gemma-3-27b-it'],
    label: '极速',
    desc: '星火 · Llama 3.1 8B 快答',
    icon: '🚀',
    maxTokens: 2048,
  },
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
  /** 消息稳定 ID（跨渲染、跨收藏/反应保持不变，首次出现自动补齐） */
  id?: string
  /** 消息创建时间（ISO），未设置时从 conversation.updatedAt 估算 */
  createdAt?: string
  /** 来自响应缓存时标记（UI 展示"命中缓存"徽章） */
  fromCache?: boolean
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
  isPinned?: boolean   // v8: 置顶会话（在列表顶部）
  isArchived?: boolean // v9: 归档会话（默认折叠显示）
  tags?: string[]      // v9: 会话标签（自定义分组）
}

/** 反应类型（用户对 AI 回复的快速反馈） */
export type MessageReaction = 'like' | 'dislike'

/** 全局收藏条目（跨会话汇总） */
export interface FavoriteMessage {
  id: string                 // 消息稳定 ID
  conversationId: string
  conversationTitle: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string          // 消息自身的创建时间
  savedAt: string            // 收藏时间
}

/**
 * 一键工作流预设 —— 粒度比 ABILITY_TOOLS 更大，指向常见完整任务。
 * 选中后自动填充 prompt 模板到输入框，用户只需补充具体内容即可发送。
 */
export const WORKFLOW_PRESETS: Array<{ key: string; icon: string; label: string; prompt: string; hint?: string }> = [
  { key: 'notes', icon: '📝', label: '整理笔记', prompt: '请帮我整理并优化这段学习笔记，要求：1) 添加合理的标题和层级；2) 高亮关键概念；3) 末尾给出 3-5 条复习要点。原始笔记：\n\n', hint: '粘贴你的笔记原文' },
  { key: 'schedule', icon: '📅', label: '生成日程', prompt: '我下周要完成：\n\n请帮我生成一份详细的每日日程表，按优先级安排，留出缓冲时间，每项标注预估耗时。', hint: '列出这周要做的事' },
  { key: 'breakdown', icon: '🎯', label: '目标拆解', prompt: '我的目标是：\n\n截止日期：\n\n请帮我把这个目标拆解为可执行的里程碑和每日/每周具体任务。', hint: '告诉我目标和截止时间' },
  { key: 'explain', icon: '💡', label: '讲解概念', prompt: '请用通俗的方式给我讲解"\n\n"这个概念，给出：核心定义 / 关键公式或原理 / 生活化例子 / 常见误区。', hint: '填入你想学的概念' },
  { key: 'essay', icon: '✍️', label: '作文润色', prompt: '请帮我润色下面这段文字，让它更流畅、更有文采，但保留原意。润色后请同时给出 3 点修改说明：\n\n', hint: '粘贴你的原稿' },
  { key: 'code_review', icon: '🧪', label: '代码审查', prompt: '请审查下面这段代码：指出潜在 bug、性能问题、最佳实践建议，并给出重构后的完整代码：\n\n```\n\n```', hint: '粘贴你的代码' },
  { key: 'summarize', icon: '📚', label: '长文总结', prompt: '请把下面这段内容总结成结构化要点（含 3-5 个主题 + 每个主题 2-3 条要点），末尾给出一句话核心结论：\n\n', hint: '粘贴长文' },
  { key: 'translate', icon: '🌐', label: 'AI 翻译', prompt: '请把以下文字翻译成自然地道的中文（若原文是中文则翻译为英文），保留专有名词：\n\n', hint: '粘贴原文' },
]

export type StreamPhase = 'idle' | 'thinking' | 'streaming' | 'done'

const STORAGE_KEY = 'spark_conversations_v2'
/** 全局收藏消息列表（跨会话） */
const FAVORITES_KEY = 'spark_ai_favorites_v1'
/** 消息反应映射：{ [msgId]: 'like' | 'dislike' } */
const REACTIONS_KEY = 'spark_ai_reactions_v1'
/** 最多保留的会话数（超过按 updatedAt 淘汰非置顶会话） */
const MAX_CONVERSATIONS = 80
/** 单会话最大消息数（超过时最早的对话做摘要折叠，避免 token 和 storage 爆炸） */
const MAX_MESSAGES_PER_CONVERSATION = 200

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

/** 生成短稳定 ID（时间戳 + 随机，8-10 字符，足够无冲突） */
function genId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** 回填缺失的 id/createdAt，保证老数据升级后不丢反应/收藏能力 */
function ensureMessageMeta(conversation: Conversation): boolean {
  let changed = false
  const base = new Date(conversation.createdAt || conversation.updatedAt || Date.now()).getTime()
  for (let i = 0; i < conversation.messages.length; i++) {
    const m = conversation.messages[i]
    if (!m.id) { m.id = genId('m_'); changed = true }
    if (!m.createdAt) { m.createdAt = new Date(base + i * 1000).toISOString(); changed = true }
  }
  return changed
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
  const favorites = ref<FavoriteMessage[]>([])
  const reactions = ref<Record<string, MessageReaction>>({})

  // v9: 后端选择（用户偏好，会持久化）+ 本地服务健康状态
  const currentBackend = ref<BackendMode>(loadPersist<BackendMode>(BACKEND_PREF_KEY, 'auto'))
  const localAvailable = ref<boolean | null>(null)  // null = 未检测
  const localModelName = ref<string>('')
  let lastLocalHealthAt = 0

  function setBackend(b: BackendMode) {
    currentBackend.value = b
    savePersist(BACKEND_PREF_KEY, b)
  }

  /** 本地 AI 服务健康检查（带 5min 缓存，避免反复 ping） */
  async function checkLocalHealth(force = false): Promise<boolean> {
    const now = Date.now()
    if (!force && now - lastLocalHealthAt < LOCAL_HEALTH_TTL_MS && localAvailable.value !== null) {
      return !!localAvailable.value
    }
    try {
      const res = await fetch(`${LOCAL_AI_URL}/health`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) { localAvailable.value = false; lastLocalHealthAt = now; return false }
      const data = await res.json().catch(() => ({}))
      const ok = data?.status === 'healthy' && data?.ollama === true && data?.model === true
      localAvailable.value = ok
      localModelName.value = typeof data?.modelName === 'string' ? data.modelName : ''
      lastLocalHealthAt = now
      return ok
    } catch {
      localAvailable.value = false
      lastLocalHealthAt = now
      return false
    }
  }

  function loadConversations() {
    const arr = loadPersist<Conversation[]>(STORAGE_KEY, [])
    if (!Array.isArray(arr)) return
    // 老数据回填 id/createdAt，保证跨版本兼容
    let anyChanged = false
    for (const c of arr) {
      if (ensureMessageMeta(c)) anyChanged = true
    }
    conversations.value = sortConversations(arr)
    if (anyChanged) saveConversations()
  }

  function loadFavorites() {
    const arr = loadPersist<FavoriteMessage[]>(FAVORITES_KEY, [])
    if (Array.isArray(arr)) favorites.value = arr
  }
  function saveFavorites() { savePersist(FAVORITES_KEY, favorites.value.slice(0, 500)) }

  function loadReactions() {
    const obj = loadPersist<Record<string, MessageReaction>>(REACTIONS_KEY, {})
    if (obj && typeof obj === 'object') reactions.value = obj
  }
  function saveReactions() { savePersist(REACTIONS_KEY, reactions.value) }

  function saveConversations() {
    // v8: 通过 persistSync 自动云同步（spark_conversations_v2 已加入 SYNC_KEYS）
    // 按 updatedAt 倒序保留 MAX_CONVERSATIONS 条（置顶优先保留）
    const sorted = sortConversations(conversations.value)
    const trimmed: Conversation[] = []
    for (const c of sorted) {
      if (trimmed.length >= MAX_CONVERSATIONS) {
        if (c.isPinned) trimmed.push(c)
        continue
      }
      trimmed.push(c)
    }
    savePersist(STORAGE_KEY, trimmed)
  }

  /** 排序：置顶会话按 updatedAt 排前，其他会话按 updatedAt 倒序 */
  function sortConversations(arr: Conversation[]): Conversation[] {
    return [...arr].sort((a, b) => {
      const ap = a.isPinned ? 1 : 0
      const bp = b.isPinned ? 1 : 0
      if (ap !== bp) return bp - ap
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }

  function createConversation(): Conversation {
    const now = new Date().toISOString()
    const conversation: Conversation = {
      id: genId('c_'),
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
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

  /** 重命名会话（v8 闭环） */
  function renameConversation(id: string, newTitle: string): boolean {
    const c = conversations.value.find((item) => item.id === id)
    if (!c) return false
    const title = newTitle.trim().slice(0, 40)
    if (!title) return false
    c.title = title
    c.updatedAt = new Date().toISOString()
    saveConversations()
    return true
  }

  /** 切换置顶（v8 闭环：置顶的会话总在列表顶部） */
  function togglePinConversation(id: string): boolean {
    const c = conversations.value.find((item) => item.id === id)
    if (!c) return false
    c.isPinned = !c.isPinned
    // 重新按 isPinned + updatedAt 排序
    conversations.value = sortConversations(conversations.value)
    saveConversations()
    return !!c.isPinned
  }

  /** 切换归档（v9：归档会话默认在侧边栏折叠显示） */
  function toggleArchiveConversation(id: string): boolean {
    const c = conversations.value.find((item) => item.id === id)
    if (!c) return false
    c.isArchived = !c.isArchived
    // 归档时自动取消置顶
    if (c.isArchived && c.isPinned) c.isPinned = false
    conversations.value = sortConversations(conversations.value)
    saveConversations()
    return !!c.isArchived
  }

  /** 克隆会话（v9：复制完整消息列表到新会话，方便做"从此分支"类型探索） */
  function duplicateConversation(id: string): Conversation | null {
    const src = conversations.value.find((item) => item.id === id)
    if (!src) return null
    const now = new Date().toISOString()
    const clone: Conversation = {
      id: genId('c_'),
      title: `${src.title} · 副本`,
      // 深拷贝消息，并重新生成每条消息的 id（避免与原会话收藏/反应错乱）
      messages: src.messages.map((m) => ({ ...m, id: genId('m_') })),
      createdAt: now,
      updatedAt: now,
      tags: src.tags ? [...src.tags] : undefined,
    }
    conversations.value.unshift(clone)
    currentConversationId.value = clone.id
    saveConversations()
    return clone
  }

  /** 搜索会话（v9）：按标题 + 消息内容模糊匹配，返回高亮结果 */
  function searchConversations(query: string): Array<{ conversation: Conversation; hitInTitle: boolean; hitSnippet: string }> {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: Array<{ conversation: Conversation; hitInTitle: boolean; hitSnippet: string }> = []
    for (const c of conversations.value) {
      const title = (c.title || '').toLowerCase()
      const hitInTitle = title.includes(q)
      let hitSnippet = ''
      if (!hitInTitle) {
        for (const m of c.messages) {
          const content = (m.content || '').toLowerCase()
          const pos = content.indexOf(q)
          if (pos >= 0) {
            const start = Math.max(0, pos - 12)
            const end = Math.min(m.content.length, pos + q.length + 24)
            hitSnippet = (start > 0 ? '…' : '') + m.content.slice(start, end) + (end < m.content.length ? '…' : '')
            break
          }
        }
      }
      if (hitInTitle || hitSnippet) out.push({ conversation: c, hitInTitle, hitSnippet })
    }
    return out
  }

  /** 收藏/取消收藏一条消息（跨会话汇总到 favorites 列表） */
  function toggleFavoriteMessage(conversationId: string, messageId: string): boolean {
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (!conv) return false
    const msg = conv.messages.find((m) => m.id === messageId)
    if (!msg) return false
    const idx = favorites.value.findIndex((f) => f.id === messageId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
      saveFavorites()
      return false
    }
    favorites.value.unshift({
      id: messageId,
      conversationId,
      conversationTitle: conv.title,
      role: msg.role === 'system' ? 'assistant' : msg.role,
      content: msg.content,
      createdAt: msg.createdAt || new Date().toISOString(),
      savedAt: new Date().toISOString(),
    })
    saveFavorites()
    return true
  }

  /** 是否已收藏 */
  function isMessageFavorited(messageId: string): boolean {
    return favorites.value.some((f) => f.id === messageId)
  }

  /** 设置反应（like / dislike / null 取消） */
  function setMessageReaction(messageId: string, reaction: MessageReaction | null) {
    if (reaction === null) {
      delete reactions.value[messageId]
    } else {
      reactions.value[messageId] = reaction
    }
    saveReactions()
  }

  /** 获取反应 */
  function getMessageReaction(messageId: string): MessageReaction | null {
    return reactions.value[messageId] || null
  }

  /** 跳转到收藏所在会话 + 对应消息 */
  function jumpToFavorite(favorite: FavoriteMessage): boolean {
    const exists = conversations.value.some((c) => c.id === favorite.conversationId)
    if (!exists) return false
    currentConversationId.value = favorite.conversationId
    return true
  }

  /**
   * 导出会话（v8 闭环）
   * @param id 会话 ID
   * @param format 'markdown' | 'json'
   * @returns { filename, content, mime } 供前端触发下载
   */
  function exportConversation(id: string, format: 'markdown' | 'json' = 'markdown'): { filename: string; content: string; mime: string } | null {
    const c = conversations.value.find((item) => item.id === id)
    if (!c) return null
    const safeTitle = c.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'json') {
      return {
        filename: `spark-${safeTitle}-${stamp}.json`,
        content: JSON.stringify(c, null, 2),
        mime: 'application/json',
      }
    }
    // markdown
    const lines: string[] = []
    lines.push(`# ${c.title}`)
    lines.push('')
    lines.push(`> 导出自星火助手 · ${new Date(c.createdAt).toLocaleString('zh-CN')} ~ ${new Date(c.updatedAt).toLocaleString('zh-CN')}`)
    lines.push('')
    for (const msg of c.messages) {
      const who = msg.role === 'user' ? '🧑 用户' : msg.role === 'assistant' ? '⚡ 星火助手' : 'ℹ️ 系统'
      lines.push(`## ${who}`)
      if (msg.reasoning) {
        lines.push('')
        lines.push('<details><summary>💭 思考过程</summary>')
        lines.push('')
        lines.push(msg.reasoning)
        lines.push('')
        lines.push('</details>')
      }
      lines.push('')
      lines.push(msg.content)
      if (msg.attachments?.length) {
        lines.push('')
        for (const a of msg.attachments) lines.push(`- 附件：${a.type === 'image' ? '🖼️' : '📎'} ${a.name}${a.size ? ` (${a.size})` : ''}`)
      }
      lines.push('')
      lines.push('---')
      lines.push('')
    }
    return {
      filename: `spark-${safeTitle}-${stamp}.md`,
      content: lines.join('\n'),
      mime: 'text/markdown',
    }
  }

  /** 监听 persistSync 推送：其他设备登录时自动同步会话列表 */
  subscribePersist<Conversation[]>(STORAGE_KEY, (v) => {
    if (Array.isArray(v)) {
      conversations.value = sortConversations(v)
    }
  })

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
    extraContext?: string,
  ) {
    const conversation = getCurrentConversation()

    if (hasSensitiveContent(userMessage)) {
      const safeReply = '这个话题不太合适哦，我们聊点别的吧！我可以帮你管理日程、辅导学习、规划目标 😊'
      const now = new Date().toISOString()
      conversation.messages.push({ id: genId('m_'), createdAt: now, role: 'user', content: userMessage, attachments })
      conversation.messages.push({ id: genId('m_'), createdAt: now, role: 'assistant', content: safeReply })
      autoTitle(conversation)
      conversation.updatedAt = now
      saveConversations()
      onChunk(safeReply)
      onDone(safeReply, [], '')
      return
    }

    let composedUserMessage = userMessage
    if (attachments?.length) {
      for (const attachment of attachments) composedUserMessage += summarizeAttachment(attachment)
    }

    const nowIso = new Date().toISOString()
    conversation.messages.push({ id: genId('m_'), createdAt: nowIso, role: 'user', content: composedUserMessage, attachments })
    autoTitle(conversation)
    conversation.updatedAt = nowIso
    // 单会话消息上限保护：超过时最早的消息按批折叠（保留最近 MAX_MESSAGES_PER_CONVERSATION）
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.splice(0, conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION)
    }

    const contextMessages = conversation.messages
      .slice(-60)
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }))

    // v7.3: 如果前端传入了 extraContext（RAG 检索结果），把它作为一条系统前缀 user 消息注入
    if (extraContext && extraContext.trim()) {
      contextMessages.unshift({
        role: 'user',
        content: `[知识上下文]\n${extraContext}\n\n请基于以上知识上下文回答用户的问题。如上下文与问题无关，正常回答即可。`,
      })
    }

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

    // v10: 云端调用（Supabase Edge Function → NVIDIA API）
    // 关键修复：之前只在首次 session 为空或拿到 401 时才刷新 token，
    // 对于已经过期但前端尚未同步的 session，会把过期 token 先发给服务端，
    // 触发"登录状态已过期"提示（其实用户 UI 上明明已登录）。
    // 这里改为：发送前主动检查 expires_at，剩余 < 90s 主动 refresh。
    async function callCloud(): Promise<Response> {
      let session = await getValidSession()
      if (!session?.access_token) throw new Error('NO_AUTH')

      const fetchCloud = async (token: string) => fetch(getEdgeFunctionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          assistant: 'spark',
          mode: currentModel.value,
          messages: contextMessages,
          stream: true,
        }),
        signal: abortController.value!.signal,
      })

      let res = await fetchCloud(session.access_token)
      if (res.ok) return res

      if (res.status === 401) {
        try {
          const refreshed = await supabase.auth.refreshSession()
          session = refreshed.data?.session ?? null
        } catch {
          session = null
        }
        if (session?.access_token) {
          res = await fetchCloud(session.access_token)
          if (res.ok) return res
          if (res.status === 401) throw new Error('AI 服务认证异常，请刷新页面后重试')
          if (res.status === 429) throw new Error('请求过于频繁，请等待几秒后重试')
          throw new Error(`Edge Function 失败 (${res.status})`)
        }
        throw new Error('AI 服务认证异常，请刷新页面后重试')
      }
      if (res.status === 429) throw new Error('请求过于频繁，请等待几秒后重试')
      const errText = await res.text().catch(() => '')
      throw new Error(`Edge Function 失败 (${res.status})${errText ? ': ' + errText.slice(0, 120) : ''}`)
    }

    // v9: 本地调用（services/local-ai + Ollama Gamma4 / Gemma3）
    async function callLocal(): Promise<Response> {
      const modeCfg = MODEL_OPTIONS[currentModel.value]
      const temperature = currentModel.value === 'thinking' ? 0.6 : currentModel.value === 'fast' ? 0.8 : 0.75
      const res = await fetch(`${LOCAL_AI_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'spark', // 使用服务端 spark prompt module（与云端口吻一致）
          messages: contextMessages,
          temperature,
          max_tokens: modeCfg.maxTokens,
          stream: true,
        }),
        signal: abortController.value!.signal,
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        if (res.status === 429) throw new Error('本地 AI 请求过于频繁，请稍后重试')
        throw new Error(`本地 AI 失败 (${res.status})${errText ? ': ' + errText.slice(0, 100) : ''}`)
      }
      return res
    }

    try {
      let res: Response
      let usedBackend: 'cloud' | 'local' = 'cloud'
      const backend = currentBackend.value

      try {
        if (backend === 'local') {
          if (!(await checkLocalHealth())) {
            throw new Error('本地 AI 未启动，请在 services/local-ai 目录运行 npm run dev')
          }
          res = await callLocal()
          usedBackend = 'local'
        } else if (backend === 'cloud') {
          res = await callCloud()
          usedBackend = 'cloud'
        } else {
          // auto：云端优先，失败且本地可用时降级
          try {
            res = await callCloud()
            usedBackend = 'cloud'
          } catch (cloudErr: unknown) {
            if (cloudErr instanceof Error && cloudErr.name === 'AbortError') throw cloudErr
            const msg = cloudErr instanceof Error ? cloudErr.message : ''
            // 不降级的错误：登录/认证/速率限制类，直接上抛让用户处理
            const noDowngrade = msg === 'NO_AUTH'
              || msg.includes('登录')
              || msg.includes('认证')
              || msg.includes('频繁')
            if (noDowngrade) throw cloudErr
            // 尝试本地降级
            if (await checkLocalHealth(true)) {
              console.warn('[SparkAI] 云端失败，降级到本地 Gamma4:', msg)
              res = await callLocal()
              usedBackend = 'local'
            } else {
              throw cloudErr
            }
          }
        }
      } catch (edgeErr: unknown) {
        if (edgeErr instanceof Error && edgeErr.name === 'AbortError') throw edgeErr
        if (edgeErr instanceof Error && edgeErr.message === 'NO_AUTH') {
          throw new Error('请先登录后再使用 AI 助手')
        }
        throw edgeErr
      }
      console.log(`[SparkAI] 使用后端: ${usedBackend}${usedBackend === 'local' ? ` · ${localModelName.value || 'ollama'}` : ''}`)

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

      const assistantNow = new Date().toISOString()
      conversation.messages.push({
        id: genId('m_'),
        createdAt: assistantNow,
        role: 'assistant',
        content: finalAnswer,
        reasoning: finalReasoning || undefined,
      })
      conversation.updatedAt = assistantNow
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
        conversation.messages.push({
          id: genId('m_'),
          createdAt: new Date().toISOString(),
          role: 'assistant',
          content: `${rawText}\n\n⚠️ *生成中断*`,
        })
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
  loadFavorites()
  loadReactions()
  // 跨设备同步：其他设备写入收藏/反应时自动应用
  subscribePersist<FavoriteMessage[]>(FAVORITES_KEY, (v) => {
    if (Array.isArray(v)) favorites.value = v
  })
  subscribePersist<Record<string, MessageReaction>>(REACTIONS_KEY, (v) => {
    if (v && typeof v === 'object') reactions.value = v
  })
  // v9: 启动时探测本地 AI 服务（不 await，异步更新 localAvailable）
  void checkLocalHealth()

  return {
    isStreaming,
    streamPhase,
    error,
    currentModel,
    currentBackend,
    localAvailable,
    localModelName,
    conversations,
    currentConversationId,
    pendingActions,
    favorites,
    reactions,
    createConversation,
    getCurrentConversation,
    switchConversation,
    deleteConversation,
    clearAllConversations,
    renameConversation,
    togglePinConversation,
    toggleArchiveConversation,
    duplicateConversation,
    searchConversations,
    exportConversation,
    toggleFavoriteMessage,
    isMessageFavorited,
    setMessageReaction,
    getMessageReaction,
    jumpToFavorite,
    setBackend,
    checkLocalHealth,
    sendMessage,
    stopGenerating,
  }
}
