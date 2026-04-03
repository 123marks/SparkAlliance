import { supabase } from '../supabase'

export type AssistantKind = 'spark' | 'companion'
export type AssistantModelMode = 'default' | 'thinking' | 'fast'

export interface AssistantRequestMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantChatRequest {
  assistant: AssistantKind
  mode?: AssistantModelMode
  messages: AssistantRequestMessage[]
}

export interface AssistantChatResponse {
  content: string
  reasoning: string
  model: string
  assistant: AssistantKind
}

export async function requestAssistantChat(
  request: AssistantChatRequest,
  signal?: AbortSignal,
): Promise<AssistantChatResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) throw new Error('缺少 Supabase 配置，无法连接 AI 服务')

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('请先登录后再使用 AI 助手')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/assistant-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
    signal,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'AI 服务请求失败')
  }

  return {
    content: typeof data.content === 'string' ? data.content : '',
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
    model: typeof data.model === 'string' ? data.model : '',
    assistant: data.assistant === 'companion' ? 'companion' : 'spark',
  }
}
