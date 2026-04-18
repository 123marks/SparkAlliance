import { ref } from 'vue'
import { supabase, invokeEdgeFunction } from '../supabase'

export type { SparkAction } from '../utils/assistantProtocol'
import { parseSparkActions, type SparkAction } from '../utils/assistantProtocol'
import { checkAIResponseSafety, hasSensitiveContent } from '../utils/contentSafety'
import { loadPersist, savePersist, subscribePersist } from '../utils/persist'

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

export type ModelMode = 'default' | 'thinking' | 'fast' | 'standard'

/**
 * 星火助手 4 模式 UI 配置。
 *
 * 底层真实模型由 Edge Function 侧环境变量决定，前端完全不暴露模型名称。
 * 前端只持有展示用的 label / desc / icon / maxTokens。
 */
export const MODEL_OPTIONS: Record<ModelMode, { label: string; desc: string; icon: string; maxTokens: number }> = {
  default: {
    label: '均衡',
    desc: '默认模式，质量与速度兼顾',
    icon: '⚡',
    maxTokens: 4096,
  },
  thinking: {
    label: '深度思考',
    desc: '展示完整推理链，适合复杂题',
    icon: '🧠',
    maxTokens: 8192,
  },
  fast: {
    label: '极速',
    desc: '秒级响应，适合闲聊和简单问题',
    icon: '🚀',
    maxTokens: 2048,
  },
  standard: {
    label: '标准',
    desc: '稳定可靠，适合日常对话',
    icon: '✨',
    maxTokens: 4096,
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
/**
 * v11 记忆压缩：发送给 AI 的上下文条数上限（排除 system 后的 user/assistant 条数）。
 * 超出时早期消息会被 AI 自动压成一条 system 摘要，保留最近 SUMMARIZE_KEEP_RECENT 条 + 摘要。
 */
const CONTEXT_WINDOW = 120
/** 自动触发后台摘要的阈值：会话消息数 ≥ 此值时 sendMessage 结束后异步压缩 */
const AUTO_SUMMARIZE_THRESHOLD = 60
/** 摘要后保留多少条最近消息不被折叠（保留上下文连贯性） */
const SUMMARIZE_KEEP_RECENT = 20

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

/**
 * 把 Edge Function 返回的结构化错误（error + code + attempts）
 * 转成对用户友好的中文提示。
 * code 列表详见 supabase/functions/assistant-chat/index.ts
 */
function humanizeErrorCode(code: string, serverMsg: string): string {
  switch (code) {
    case 'NO_AUTH':
      return '请先登录后再使用星火助手'
    case 'AUTH_FAILED':
      return '登录状态已失效，请刷新页面（Ctrl+Shift+R）后重试；若仍失败请重新登录'
    case 'GATEWAY_TOKEN_ALG_MISMATCH':
      // supabase.ts 已把 server 原文替换成可操作中文提示，这里直接透传。
      return serverMsg || '星火助手后端密钥与前端不匹配，请管理员检查 Supabase API Keys 配置'
    case 'BAD_REQUEST':
      return `请求参数有误：${serverMsg || '未知原因'}`
    case 'SERVER_MISCONFIGURED':
      return '星火助手后端尚未完成配置（缺上游 AI 密钥）。请联系管理员运行 scripts/setup-ai-secrets.ps1 或在 Supabase Dashboard → Edge Function Secrets 配置上游密钥'
    case 'UPSTREAM_AUTH_FAILED':
      return '星火上游 AI 密钥无效或已过期，请联系管理员更新'
    case 'UPSTREAM_MODEL_NOT_FOUND':
      return `当前模式所需的上游模型不可用（所有备用通道也都失败）：${serverMsg}`
    case 'UPSTREAM_RATE_LIMIT':
      return '请求过于频繁（上游限流），请等 30 秒后再试，或切换到「极速」/「标准」模式分散额度'
    case 'UPSTREAM_SERVER_ERROR':
      return `上游 AI 服务临时故障：${serverMsg}`
    case 'INTERNAL_ERROR':
      return `服务端异常：${serverMsg}`
    case 'NETWORK_ERROR':
      // serverMsg 由 supabase.ts 拼好（含 target URL + 真实 fetch err + 耗时 + 离线提示），
      // 给用户暴露这些细节，方便定位是 GFW / 浏览器扩展 / DNS / 离线，而不是只丢一句"网络连接失败"。
      return serverMsg
        ? `网络连接失败：${serverMsg}\n\n排查建议：\n1) F12 → Network 看请求是否变红，记下 Status 与 Failed Reason\n2) 关闭浏览器扩展（尤其广告/隐私拦截、代理类）后重试\n3) 国内网络访问 *.supabase.co 偶有干扰，可尝试切换网络 / 开关 VPN`
        : '网络连接失败，请检查网络后重试'
    case 'ABORTED':
      return '已停止生成'
    default:
      return serverMsg || `AI 服务暂时不可用（${code || '未知错误'}）`
  }
}

/**
 * v11 摘要专用：调 Edge Function（fast 模式）请求 AI 把一段对话浓缩成 <=200 字的记忆。
 * 不流式，同步返回纯文本。失败时 throw，上层决定降级策略。
 */
async function requestMemorySummary(older: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  const session = await getValidSession()
  if (!session?.access_token) throw new Error('未登录')

  const condensedPrompt = `请用不超过 200 字，把以下对话浓缩成一段「记忆摘要」。要求：
1) 按时间顺序记录用户的核心诉求、关键决策、重要事实
2) 记录 AI 给出的结论和待办事项
3) 用简洁陈述句，不要客套话
4) 不要第一人称，用"用户"/"助手"指代双方
5) 仅输出摘要正文，不要标题、不要前后缀`

  const { data } = await invokeEdgeFunction<{ content?: string }>('assistant-chat', {
    assistant: 'spark',
    mode: 'fast',
    stream: false,
    messages: [
      ...older,
      { role: 'user', content: condensedPrompt },
    ],
  })
  const content = typeof data?.content === 'string' ? data.content : ''
  return content.trim()
}

export function useSparkAI() {
  const isStreaming = ref(false)
  const streamPhase = ref<StreamPhase>('idle')
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)
  const pendingActions = ref<SparkAction[]>([])
  const currentModel = ref<ModelMode>('default')
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const favorites = ref<FavoriteMessage[]>([])
  const reactions = ref<Record<string, MessageReaction>>({})
  /** v11: 记忆压缩中状态（UI 订阅展示"压缩中…"） */
  const summarizing = ref(false)

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
    conversations.value = sortConversations(conversations.value)
    saveConversations()
    return !!c.isPinned
  }

  /** 切换归档（v9：归档会话默认在侧边栏折叠显示） */
  function toggleArchiveConversation(id: string): boolean {
    const c = conversations.value.find((item) => item.id === id)
    if (!c) return false
    c.isArchived = !c.isArchived
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

  function isMessageFavorited(messageId: string): boolean {
    return favorites.value.some((f) => f.id === messageId)
  }

  function setMessageReaction(messageId: string, reaction: MessageReaction | null) {
    if (reaction === null) {
      delete reactions.value[messageId]
    } else {
      reactions.value[messageId] = reaction
    }
    saveReactions()
  }

  function getMessageReaction(messageId: string): MessageReaction | null {
    return reactions.value[messageId] || null
  }

  function jumpToFavorite(favorite: FavoriteMessage): boolean {
    const exists = conversations.value.some((c) => c.id === favorite.conversationId)
    if (!exists) return false
    currentConversationId.value = favorite.conversationId
    return true
  }

  /**
   * 导出会话（v8 闭环）
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

  /**
   * v11: 对指定会话做一次记忆压缩。
   * - 取 plain（非 system）消息中早期的一批（除去最近 SUMMARIZE_KEEP_RECENT 条）
   * - 让 AI 用 fast 模式浓缩成 ≤200 字的 system 摘要
   * - 替换掉原会话的早期消息，新 system 条目前置（老摘要合并）
   * @returns 是否真的做了压缩
   */
  async function summarizeConversation(conv: Conversation): Promise<boolean> {
    const plain = conv.messages.filter((m) => m.role !== 'system')
    if (plain.length <= SUMMARIZE_KEEP_RECENT + 5) return false
    const toCompress = plain.slice(0, -SUMMARIZE_KEEP_RECENT).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    if (toCompress.length === 0) return false

    summarizing.value = true
    try {
      const summary = await requestMemorySummary(toCompress)
      if (!summary) return false

      const recent = plain.slice(-SUMMARIZE_KEEP_RECENT)
      const oldSystems = conv.messages.filter((m) => m.role === 'system')
      const mergedSystemContent = [
        ...oldSystems.map((m) => m.content.trim()).filter(Boolean),
        `[记忆摘要 · ${new Date().toISOString().slice(0, 19).replace('T', ' ')}]\n${summary}`,
      ].join('\n\n---\n\n')

      conv.messages = [
        {
          id: genId('m_'),
          createdAt: new Date().toISOString(),
          role: 'system',
          content: mergedSystemContent,
        },
        ...recent,
      ]
      conv.updatedAt = new Date().toISOString()
      saveConversations()
      return true
    } catch (e) {
      console.warn('[SparkAI] 记忆压缩失败:', e)
      return false
    } finally {
      summarizing.value = false
    }
  }

  /**
   * v11: 主动压缩当前会话（UI 点击"记忆压缩中"徽章时调用）
   */
  async function summarizeCurrentConversation(): Promise<boolean> {
    const conv = getCurrentConversation()
    return summarizeConversation(conv)
  }

  /**
   * v11: 新开会话并继承记忆。
   * - 把当前会话摘要成一条 system 消息
   * - 创建新会话，把这条 system 作为新会话的首条消息（AI 回看历史）
   * - 自动切换到新会话
   */
  async function inheritMemoryToNewConversation(): Promise<Conversation | null> {
    const src = conversations.value.find((c) => c.id === currentConversationId.value)
    if (!src) return null
    const plain = src.messages.filter((m) => m.role !== 'system')
    if (plain.length === 0) return null

    summarizing.value = true
    try {
      const toCompress = plain.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      const summary = await requestMemorySummary(toCompress).catch(() => '')
      const now = new Date().toISOString()
      const newConv: Conversation = {
        id: genId('c_'),
        title: `${src.title} · 续聊`,
        createdAt: now,
        updatedAt: now,
        messages: [],
      }
      if (summary) {
        newConv.messages.push({
          id: genId('m_'),
          createdAt: now,
          role: 'system',
          content: `[来自上一次对话的记忆摘要]\n${summary}`,
        })
      }
      conversations.value.unshift(newConv)
      currentConversationId.value = newConv.id
      saveConversations()
      return newConv
    } finally {
      summarizing.value = false
    }
  }

  /**
   * 即时把用户消息推入当前会话并立刻持久化 ——
   * 给 Chat.vue 在发送前调用，保证用户敲完回车的瞬间消息就出现在气泡里，
   * 不被后续的 RAG 检索、缓存查询或网络请求阻塞。
   *
   * 返回新插入消息的 id，便于上层去重 / 后续更新（例如附加附件摘要）。
   */
  function pushUserMessageImmediately(content: string, attachments?: FileAttachment[]): string {
    const conversation = getCurrentConversation()
    const id = genId('m_')
    const now = new Date().toISOString()
    conversation.messages.push({
      id,
      createdAt: now,
      role: 'user',
      content,
      attachments,
    })
    autoTitle(conversation)
    conversation.updatedAt = now
    saveConversations()
    return id
  }

  async function sendMessage(
    userMessage: string,
    onChunk: (text: string) => void,
    onDone: (text: string, actions: SparkAction[], reasoning: string) => void,
    onError?: (err: string) => void,
    onThinking?: (text: string) => void,
    attachments?: FileAttachment[],
    extraContext?: string,
    /** Chat.vue 已预先将用户消息推入 conversation.messages 以实现即时显示 */
    skipPushUserMessage?: boolean,
  ) {
    const conversation = getCurrentConversation()

    if (hasSensitiveContent(userMessage)) {
      const safeReply = '这个话题不太合适哦，我们聊点别的吧！我可以帮你管理日程、辅导学习、规划目标 😊'
      const now = new Date().toISOString()
      if (!skipPushUserMessage) {
        conversation.messages.push({ id: genId('m_'), createdAt: now, role: 'user', content: userMessage, attachments })
      }
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

    if (!skipPushUserMessage) {
      const nowIso = new Date().toISOString()
      conversation.messages.push({ id: genId('m_'), createdAt: nowIso, role: 'user', content: composedUserMessage, attachments })
      autoTitle(conversation)
      conversation.updatedAt = nowIso
    } else {
      // 已预推入但可能缺少附件摘要文本，更新最后一条 user 消息
      const lastUserMsg = [...conversation.messages].reverse().find(m => m.role === 'user')
      if (lastUserMsg && composedUserMessage !== userMessage) {
        lastUserMsg.content = composedUserMessage
      }
      autoTitle(conversation)
    }
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.splice(0, conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION)
    }

    // v11: 切片最近 CONTEXT_WINDOW 条 + 把 system 消息（记忆摘要）作为 user 前缀注入，
    //      因为 Edge Function 只接受 role=user/assistant（会过滤掉 system）
    const recentSlice = conversation.messages.slice(-CONTEXT_WINDOW)
    const systemMemoryContents = recentSlice
      .filter((message) => message.role === 'system' && message.content.trim())
      .map((message) => message.content.trim())
    const contextMessages = recentSlice
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }))

    if (systemMemoryContents.length) {
      contextMessages.unshift({
        role: 'user',
        content: `[记忆摘要，仅供参考]\n\n${systemMemoryContents.join('\n\n---\n\n')}\n\n---\n\n请基于以上记忆和下方对话，自然地回复用户。不要主动复述摘要内容。`,
      })
    }

    // v7.3: RAG 检索结果
    if (extraContext && extraContext.trim()) {
      contextMessages.unshift({
        role: 'user',
        content: `[知识上下文]\n${extraContext}\n\n请基于以上知识上下文回答用户的问题。如上下文与问题无关，正常回答即可。`,
      })
    }

    isStreaming.value = true
    streamPhase.value = 'thinking'
    error.value = null
    errorCode.value = null
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
      error.value = '响应超时，请稍后重试或切换模式'
      errorCode.value = 'TIMEOUT'
      onError?.(error.value)
    }, 120000)

    /**
     * 调用云端 Edge Function → AI 模型。
     *
     * 路由策略：
     * - standard（标准）→ spark-ai-general（项目自有 Gemma4）
     * - default/thinking/fast → assistant-chat → NVIDIA NIM API
     *
     * invokeEdgeFunction 内部自动获取用户 JWT 并直接 fetch
     * （用 JWT 同时填 apikey + Authorization，绕开 sb_publishable_ 问题）。
     */
    async function callCloud(): Promise<Response> {
      const isStandard = currentModel.value === 'standard'
      const functionName = isStandard ? 'spark-ai-general' : 'assistant-chat'

      // spark-ai-general 的请求格式与 assistant-chat 不同
      const requestBody = isStandard
        ? {
            module: 'general',
            messages: contextMessages,
            temperature: 0.7,
            max_tokens: 4096,
          }
        : {
            assistant: 'spark',
            mode: currentModel.value,
            messages: contextMessages,
            stream: true,
          }

      try {
        const { data } = await invokeEdgeFunction<any>(
          functionName,
          requestBody,
          abortController.value!.signal,
        )

        // spark-ai-general 返回 JSON（非 SSE），包装成 Response 供下游统一处理
        if (isStandard) {
          const content = typeof data?.content === 'string' ? data.content : ''
          const jsonBody = JSON.stringify({
            choices: [{ message: { content, role: 'assistant' } }],
          })
          return new Response(jsonBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return data as Response
      } catch (e: any) {
        const code = e?.code as string | undefined

        // v11: 网络/边缘错误的详细诊断日志（DevTools 即可定位 GFW/扩展/DNS）
        if (code === 'NETWORK_ERROR') {
          console.error('[SparkAI] callCloud 网络层失败 ·', {
            functionName,
            mode: currentModel.value,
            target: e?.target,
            elapsedMs: e?.elapsedMs,
            online: typeof navigator !== 'undefined' ? navigator.onLine : 'n/a',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
            rawMessage: e?.message,
          })
        }

        if (code?.startsWith('HTTP_401') || code === 'NO_AUTH' || code === 'AUTH_FAILED') {
          try {
            await supabase.auth.refreshSession()
            const { data } = await invokeEdgeFunction<any>(
              functionName,
              requestBody,
              abortController.value!.signal,
            )
            if (isStandard) {
              const content = typeof data?.content === 'string' ? data.content : ''
              return new Response(JSON.stringify({
                choices: [{ message: { content, role: 'assistant' } }],
              }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            }
            return data as Response
          } catch { /* 重试也失败就抛原始错误 */ }
        }

        // 用 humanizeErrorCode 美化错误
        const reason = e?.message || ''
        const errCode = code || 'UNKNOWN'
        const err = Object.assign(
          new Error(humanizeErrorCode(errCode, reason)),
          { code: errCode },
        )
        throw err
      }
    }

    try {
      const res = await callCloud()
      console.log('[SparkAI] 云端调用 · model=' + (res.headers.get('X-Spark-Model') || '?') + ' · mode=' + (res.headers.get('X-Spark-Mode') || currentModel.value) + ' · attempts=' + (res.headers.get('X-Spark-Attempts') || '1'))

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

      // v11: 回复完成后，若消息数超阈值则后台摘要（不阻塞 UI）
      const plainCount = conversation.messages.filter((m) => m.role !== 'system').length
      if (plainCount >= AUTO_SUMMARIZE_THRESHOLD && !summarizing.value) {
        void summarizeConversation(conversation).catch(() => { /* 静默失败 */ })
      }
    } catch (err: unknown) {
      clearTimeout(timeout)
      flushSmooth()

      let message: string
      let code: string | null = null
      if (err instanceof Error) {
        code = (err as Error & { code?: string }).code ?? null
        if (err.name === 'AbortError') message = error.value || '已停止生成'
        else if (err instanceof TypeError && err.message.includes('fetch')) message = '网络连接失败，请检查网络后重试'
        else message = err.message
      } else {
        message = '未知错误，请重试'
      }
      console.error('[SparkAI] 错误:', message, 'code=', code, err)

      if (!error.value) error.value = message
      if (code && !errorCode.value) errorCode.value = code
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
  subscribePersist<FavoriteMessage[]>(FAVORITES_KEY, (v) => {
    if (Array.isArray(v)) favorites.value = v
  })
  subscribePersist<Record<string, MessageReaction>>(REACTIONS_KEY, (v) => {
    if (v && typeof v === 'object') reactions.value = v
  })

  return {
    isStreaming,
    streamPhase,
    error,
    errorCode,
    currentModel,
    conversations,
    currentConversationId,
    pendingActions,
    favorites,
    reactions,
    summarizing,
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
    summarizeCurrentConversation,
    inheritMemoryToNewConversation,
    sendMessage,
    pushUserMessageImmediately,
    stopGenerating,
  }
}
