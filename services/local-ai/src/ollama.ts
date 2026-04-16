import { config } from './config.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${config.ollama.host}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function checkModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${config.ollama.host}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const data = (await res.json()) as { models?: { name: string }[] }
    const models = data.models || []
    return models.some(
      (m) => m.name === config.ollama.model || m.name.startsWith(config.ollama.model.split(':')[0]),
    )
  } catch {
    return false
  }
}

export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const model = req.model || config.ollama.model
  const url = `${config.ollama.host}/v1/chat/completions`

  const body = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: Math.min(req.max_tokens ?? config.maxOutputTokens, config.maxOutputTokens),
    top_p: req.top_p ?? 0.9,
    stream: false,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama 返回 ${res.status}: ${errText.slice(0, 200)}`)
    }

    return (await res.json()) as ChatCompletionResponse
  } finally {
    clearTimeout(timeout)
  }
}

export async function streamChatCompletion(
  req: ChatCompletionRequest,
): Promise<ReadableStream<Uint8Array>> {
  const model = req.model || config.ollama.model
  const url = `${config.ollama.host}/v1/chat/completions`

  const body = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: Math.min(req.max_tokens ?? config.maxOutputTokens, config.maxOutputTokens),
    top_p: req.top_p ?? 0.9,
    stream: true,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })

  clearTimeout(timeout)

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama stream 失败 ${res.status}: ${errText.slice(0, 200)}`)
  }

  return res.body
}
