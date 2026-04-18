import { supabase, invokeEdgeFunction } from '../supabase'

export type AssistantKind = 'spark' | 'companion'
export type AssistantModelMode = 'default' | 'thinking' | 'fast' | 'standard'

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
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('请先登录后再使用 AI 助手')
  }

  const { data } = await invokeEdgeFunction<{
    content?: string
    reasoning?: string
    model?: string
    assistant?: string
  }>('assistant-chat', request as unknown as Record<string, unknown>, signal)

  return {
    content: typeof data?.content === 'string' ? data.content : '',
    reasoning: typeof data?.reasoning === 'string' ? data.reasoning : '',
    model: typeof data?.model === 'string' ? data.model : '',
    assistant: data?.assistant === 'companion' ? 'companion' : 'spark',
  }
}
