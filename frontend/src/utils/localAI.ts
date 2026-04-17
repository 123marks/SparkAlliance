/**
 * localAI.ts — 通用 AI 统一客户端
 *
 * 所有非星火助手的 AI 调用统一通过此模块路由。
 * 生产环境 → Supabase Edge Function (spark-ai-general) → NVIDIA API
 * 开发环境 → 本地 Ollama (localhost:3721) 作为 fallback
 */

import { supabase } from '../supabase'

export type AIModule = 'companion' | 'planner' | 'mentor' | 'schedule' | 'general'

const LOCAL_AI_BASE = import.meta.env.VITE_LOCAL_AI_URL || 'http://localhost:3721'

export interface LocalAIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LocalAIResponse {
  content: string
  model: string
  module?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

function getEdgeFunctionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return ''
  return `${base}/functions/v1/spark-ai-general`
}

async function callViaEdgeFunction(
  module: AIModule,
  messages: LocalAIMessage[],
  options?: {
    extraContext?: string
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  },
): Promise<LocalAIResponse> {
  const edgeUrl = getEdgeFunctionUrl()
  if (!edgeUrl) throw new Error('SUPABASE_URL 未配置')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('请先登录后再使用 AI 助手')

  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      module,
      messages: messages.slice(-20),
      extra_context: options?.extraContext,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    }),
    signal: options?.signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const reason = typeof err.error === 'string' ? err.error : ''
    // 透传真实错误原因给前端，便于诊断（API Key 未配 / 认证失败等）
    if (res.status === 401) throw new Error('认证失败，请重新登录')
    if (reason.includes('AI 服务密钥未配置')) throw new Error('后端未配置 AI 模型密钥，请联系管理员')
    if (reason.includes('AI 服务暂时不可用')) throw new Error(reason)
    throw new Error(reason || `Edge Function 错误 (${res.status})`)
  }

  const data = await res.json()
  return {
    content: data.content || '',
    model: data.model || 'spark-ai',
    module: data.module,
    usage: data.usage,
  }
}

async function callViaLocalOllama(
  module: AIModule,
  messages: LocalAIMessage[],
  options?: {
    extraContext?: string
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  },
): Promise<LocalAIResponse> {
  const res = await fetch(`${LOCAL_AI_BASE}/api/spark/${module}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-20),
      extra_context: options?.extraContext,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    }),
    signal: options?.signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.error === 'string' ? err.error : `本地 AI 错误 (${res.status})`)
  }

  const data = await res.json()
  return {
    content: data.content || '',
    model: data.model || 'gemma3:4b',
    module: data.module,
    usage: data.usage,
  }
}

async function callLocalAI(
  module: AIModule,
  messages: LocalAIMessage[],
  options?: {
    extraContext?: string
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
    timeoutMs?: number
  },
): Promise<LocalAIResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 60_000,
  )

  const combinedSignal = options?.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal

  const callOptions = { ...options, signal: combinedSignal }

  // 生产环境只走 Edge Function：localhost:3721 在部署后不存在，回退只会
  // 造成几秒钟的连接拒绝延迟再失败，反而让用户误以为"AI 彻底坏了"。
  // 通过 VITE_LOCAL_AI_URL 显式配置才启用本地 Ollama 回退（适合开发机）。
  const allowLocalFallback = !import.meta.env.PROD || !!import.meta.env.VITE_LOCAL_AI_URL

  try {
    try {
      return await callViaEdgeFunction(module, messages, callOptions)
    } catch (edgeErr) {
      if (edgeErr instanceof Error && edgeErr.name === 'AbortError') throw edgeErr
      if (!allowLocalFallback) throw edgeErr
      console.warn('[LocalAI] Edge Function 不可用，降级到本地 Ollama:', edgeErr instanceof Error ? edgeErr.message : edgeErr)
      return await callViaLocalOllama(module, messages, callOptions)
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 通用调用 - 自动注入模块 system prompt
 */
export async function sparkAI(
  module: AIModule,
  messages: LocalAIMessage[],
  options?: {
    extraContext?: string
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  },
): Promise<string> {
  const result = await callLocalAI(module, messages, options)
  return result.content
}

/**
 * 伴侣 AI 聊天
 */
export async function companionChat(
  messages: LocalAIMessage[],
  extraContext?: string,
): Promise<string> {
  return sparkAI('companion', messages, {
    extraContext,
    temperature: 0.8,
    maxTokens: 512,
  })
}

/**
 * 规划助手 - 目标拆解
 */
export async function plannerDecompose(prompt: string): Promise<string> {
  return sparkAI('planner', [{ role: 'user', content: prompt }], {
    temperature: 0.3,
    maxTokens: 4096,
  })
}

/**
 * 规划助手 - 任务评审/鼓励
 */
export async function plannerReview(prompt: string): Promise<string> {
  return sparkAI('planner', [{ role: 'user', content: prompt }], {
    temperature: 0.7,
    maxTokens: 200,
  })
}

/**
 * 学长模块 - 摘要/匹配/任务提炼
 */
export async function mentorAssist(prompt: string): Promise<string> {
  return sparkAI('mentor', [{ role: 'user', content: prompt }], {
    temperature: 0.3,
    maxTokens: 1024,
  })
}

/**
 * 日程识别
 */
export async function scheduleRecognize(
  prompt: string,
  extraContext?: string,
): Promise<string> {
  return sparkAI('schedule', [{ role: 'user', content: prompt }], {
    extraContext,
    temperature: 0.1,
    maxTokens: 4096,
  })
}

/**
 * 健康检查 — 优先检测 Edge Function，回退本地 Ollama
 */
export async function checkLocalAIHealth(): Promise<{
  status: string
  ollama: boolean
  model: boolean
  source: 'edge' | 'local' | 'unreachable'
}> {
  // 先检测 Edge Function
  const edgeUrl = getEdgeFunctionUrl()
  if (edgeUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            module: 'general',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) return { status: 'healthy', ollama: true, model: true, source: 'edge' }
      }
    } catch { /* Edge Function 不可用, 尝试本地 */ }
  }

  // 回退检测本地 Ollama
  try {
    const res = await fetch(`${LOCAL_AI_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { status: 'unreachable', ollama: false, model: false, source: 'unreachable' }
    const data = await res.json()
    return { ...data, source: 'local' }
  } catch {
    return { status: 'unreachable', ollama: false, model: false, source: 'unreachable' }
  }
}

/**
 * OpenAI 兼容接口 - 供需要流式输出或完全自定义的场景使用
 * 生产环境走 Edge Function，开发环境走本地 Ollama
 */
export async function openaiCompatible(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: {
    module?: AIModule
    temperature?: number
    maxTokens?: number
    stream?: boolean
  },
): Promise<Response> {
  const edgeUrl = getEdgeFunctionUrl()
  if (edgeUrl && !options?.stream) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const userMessages = messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        const systemMsg = messages.find(m => m.role === 'system')

        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            module: options?.module || 'general',
            messages: userMessages,
            extra_context: systemMsg?.content,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048,
          }),
        })
        if (res.ok) return res
      }
    } catch { /* fallback to local */ }
  }

  return fetch(`${LOCAL_AI_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      module: options?.module,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: options?.stream ?? false,
    }),
  })
}
