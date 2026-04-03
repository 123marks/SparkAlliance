import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AssistantKind = 'spark' | 'companion'
type ModelMode = 'default' | 'thinking' | 'fast'

const MODEL_MAP: Record<ModelMode, { id: string; temperature: number; maxTokens: number }> = {
  default: { id: 'moonshotai/kimi-k2.5', temperature: 0.7, maxTokens: 4096 },
  thinking: { id: 'z-ai/glm5', temperature: 0.6, maxTokens: 8192 },
  fast: { id: 'minimaxai/minimax-m2.5', temperature: 0.7, maxTokens: 2048 },
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isMessageArray(value: unknown): value is Array<{ role: 'user' | 'assistant'; content: string }> {
  return Array.isArray(value) && value.every((item) => {
    return item
      && typeof item === 'object'
      && (item as { role?: string }).role
      && ['user', 'assistant'].includes((item as { role: string }).role)
      && typeof (item as { content?: string }).content === 'string'
  })
}

function buildSparkPrompt(today: string): string {
  return [
    'You are the core in-app assistant for Spark Alliance.',
    'Answer in Chinese unless the user explicitly asks for another language.',
    'Do not reveal underlying model or provider details.',
    'Your job is to help users actually complete work inside the app, not just chat.',
    'When a concrete in-app action is clearly appropriate and the required parameters are complete, emit one or more fenced ```spark-action blocks after the natural-language answer.',
    'Allowed actions only:',
    '- add_schedule: { title, description?, start_time, end_time?, event_type?, priority? }',
    '- create_goal: { title, goal_type, deadline, description? }',
    '- navigate: { path, label?, query? }',
    'Use navigate only for internal /app routes.',
    'Useful deep-link examples:',
    '- /app/schedule?module=calendar&view=day&date=2026-04-03',
    '- /app/schedule?module=planner&tab=goals',
    '- /app/learn',
    '- /app/wall',
    'If the user asks for something that needs missing parameters, ask a concise follow-up instead of inventing them.',
    'Keep the answer structured, practical, and high-signal.',
    `Today is ${today}.`,
  ].join('\n')
}

function buildCompanionPrompt(today: string): string {
  return [
    'You are 星火, the companion assistant inside Spark Alliance.',
    'Answer in Chinese and keep the tone warm, clear, and grounded.',
    'Prefer actionable study, planning, and emotional-support guidance over vague encouragement.',
    'Do not fabricate app actions or emit spark-action blocks in companion mode.',
    'If helpful, you may recommend users go to other app modules by mentioning the route in markdown, for example [打开学习中心](/app/learn).',
    `Today is ${today}.`,
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: '未授权' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: '服务端 Supabase 配置缺失' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) return jsonResponse({ error: '认证失败' }, 401)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return jsonResponse({ error: '请求体无效' }, 400)

    const assistant = body.assistant === 'companion' ? 'companion' : 'spark'
    const mode = body.mode === 'thinking' || body.mode === 'fast' ? body.mode : 'default'
    const messages = body.messages

    if (!isMessageArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages 不能为空' }, 400)
    }

    const sanitizedMessages = messages
      .slice(-40)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0)

    if (sanitizedMessages.length === 0) {
      return jsonResponse({ error: '消息内容不能为空' }, 400)
    }

    const providerApiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
    if (!providerApiKey) {
      return jsonResponse({ error: 'AI 服务密钥未配置' }, 500)
    }

    const providerBaseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const modelConfig = MODEL_MAP[mode]
    const today = new Date().toISOString().slice(0, 10)
    const systemPrompt = assistant === 'companion'
      ? buildCompanionPrompt(today)
      : buildSparkPrompt(today)

    const upstream = await fetch(`${providerBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerApiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.id,
        stream: false,
        temperature: modelConfig.temperature,
        top_p: 0.9,
        max_tokens: modelConfig.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages,
        ],
      }),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => '')
      return jsonResponse({
        error: `上游 AI 服务失败 (${upstream.status})${errorText ? `: ${errorText.slice(0, 240)}` : ''}`,
      }, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502)
    }

    const data = await upstream.json()
    const message = data.choices?.[0]?.message || {}
    const content = typeof message.content === 'string' ? message.content : ''
    const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : ''

    return jsonResponse({
      content,
      reasoning,
      model: modelConfig.id,
      assistant,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return jsonResponse({ error: errorMessage }, 500)
  }
})
