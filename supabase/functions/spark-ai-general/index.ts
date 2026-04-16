/**
 * spark-ai-general — 通用 AI Edge Function
 *
 * 为伴侣/规划/导师/日程等非星火助手模块提供云端 AI 推理。
 * 替代本地 Ollama，使项目可安全上线。
 *
 * 路由：前端 localAI.ts → 此 Edge Function → NVIDIA API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PromptModule = 'companion' | 'planner' | 'mentor' | 'schedule' | 'content_safety' | 'general'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function weekday(): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()]
}

const SYSTEM_PROMPTS: Record<PromptModule, () => string> = {
  companion: () => `你是「星火」，Spark Alliance 校园平台的 AI 伙伴。
温暖、幽默、有见解，像一个懂你的学长/学姐。
说话自然随意，像跟朋友发微信。善于捕捉用户情绪变化。
回复控制在 50-200 字，简洁有力。适度使用 emoji。
绝不暴露底层模型名称，你就是「星火」。
拒绝生成违法、色情、暴力内容。今天是 ${today()}，${weekday()}。`,

  planner: () => `你是 Spark Alliance 的智能规划助手，专精目标拆解和任务管理。
将模糊目标拆解为可执行的里程碑和具体任务。
需要返回结构化数据时严格使用 JSON 格式。
日期格式 YYYY-MM-DD，difficulty 1-5，estimated_minutes 10-240。
任务必须具体可执行。所有日期不超过截止日期且不早于今天 (${today()})。
不回答与规划无关的话题。`,

  mentor: () => `你是 Spark Alliance 的学长经验助手。
用 50 字以内概括文章核心内容。从经验中提炼 3-5 个可执行任务。
输出严格 JSON 格式。不编造不确定的信息。`,

  schedule: () => `你是课表/日程识别助手。分析用户文本，提取事件信息。
严格返回 JSON 数组，每个事件含：title, start_time(ISO 8601), end_time, event_type(course|exam|task|life|reminder), location, confidence(0-1), description。
时间精确到分钟。只返回 JSON 数组。今天是 ${today()}。`,

  content_safety: () => `你是内容安全审核助手。判断文本是否安全合规。
返回 JSON: {"safe": true/false, "reason": "原因"}
不安全类别：违法犯罪、色情暴力、诈骗、仇恨歧视、自残引导、泄露隐私。
正常学习生活情感讨论判定安全。`,

  general: () => `你是 Spark Alliance 校园平台的智能助手「星火」。
用中文回复，简洁准确。适当使用 emoji。不暴露底层模型信息。
今天是 ${today()}，${weekday()}。`,
}

const SENSITIVE_PATTERNS = [
  /(?:赌博|gambling|casino)/i,
  /(?:色情|pornograph|xxx|nsfw|黄色|裸体)/i,
  /(?:毒品|drug\s+deal|narcotic|吸毒|贩毒)/i,
  /(?:恐怖袭击|terroris[mt]|bomb\s+threat)/i,
  /(?:枪支|炸弹|爆炸物|武器制造|制毒)/i,
  /(?:传销|非法集资|洗钱|高利贷)/i,
  /(?:自杀|自残|自我伤害|suicide|self[- ]harm|割腕|跳楼)/i,
  /(?:代写|代考|作弊|买答案|论文代做)/i,
]

const MODEL_IDENTITY_FILTERS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /(?:我是.*?(?:GPT|Claude|Gemini|Gemma|LLaMA|DeepSeek|Llama|Mistral|大语言模型|大模型|AI模型|语言模型))/gi, replacement: '我是星火助手' },
  { pattern: /(?:作为(?:一个)?(?:AI|人工智能|语言模型|大模型|机器人))/gi, replacement: '作为星火助手' },
  { pattern: /(?:OpenAI|Anthropic|Google\s+AI|Meta\s+AI|NVIDIA)/gi, replacement: '星火团队' },
  { pattern: /\bGemma\b/gi, replacement: '星火' },
]

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sanitizeOutput(text: string): string {
  let result = text
  for (const filter of MODEL_IDENTITY_FILTERS) {
    result = result.replace(filter.pattern, filter.replacement)
  }
  return result
}

function checkInputSafety(text: string): { blocked: boolean; content: string } {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, content: '这个话题不太合适哦，我们聊点别的吧！' }
    }
  }
  return { blocked: false, content: text }
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
      return jsonResponse({ error: '服务端配置缺失' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return jsonResponse({ error: '认证失败' }, 401)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return jsonResponse({ error: '请求体无效' }, 400)

    const moduleName = (body.module as PromptModule) || 'general'
    const messages = body.messages as { role: 'user' | 'assistant'; content: string }[]
    const extraContext = body.extra_context as string | undefined
    const temperature = (body.temperature as number) ?? 0.7
    const maxTokens = Math.min((body.max_tokens as number) ?? 2048, 4096)

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages 不能为空' }, 400)
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      const safety = checkInputSafety(lastUserMsg.content)
      if (safety.blocked) {
        return jsonResponse({ content: safety.content, model: 'spark-ai', module: moduleName, _blocked: true })
      }
    }

    const providerApiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
    if (!providerApiKey) {
      return jsonResponse({ error: 'AI 服务密钥未配置' }, 500)
    }

    const providerBaseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const primaryModel = Deno.env.get('SPARK_GENERAL_MODEL') || 'google/gemma-3-27b-it'
    const fallbackModel = Deno.env.get('SPARK_GENERAL_FALLBACK') || 'meta/llama-3.1-8b-instruct'

    let systemPrompt = (SYSTEM_PROMPTS[moduleName] || SYSTEM_PROMPTS.general)()
    if (extraContext) {
      systemPrompt += `\n\n## 额外上下文\n${extraContext}`
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20),
    ]

    const modelsToTry = [primaryModel, fallbackModel]
    let upstream: Response | null = null
    let lastError = ''
    let usedModel = primaryModel

    for (const modelId of modelsToTry) {
      try {
        upstream = await fetch(`${providerBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${providerApiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            stream: false,
            temperature,
            top_p: 0.9,
            max_tokens: maxTokens,
            messages: fullMessages,
          }),
        })
        if (upstream.ok) {
          usedModel = modelId
          break
        }
        lastError = await upstream.text().catch(() => `HTTP ${upstream!.status}`)
        upstream = null
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
        upstream = null
      }
    }

    if (!upstream || !upstream.ok) {
      return jsonResponse({
        error: `AI 服务暂时不可用${lastError ? `: ${lastError.slice(0, 200)}` : ''}`,
      }, 502)
    }

    const data = await upstream.json()
    const rawContent = data.choices?.[0]?.message?.content || ''
    const isStructured = ['schedule', 'content_safety', 'mentor', 'planner'].includes(moduleName)
    const content = isStructured ? rawContent : sanitizeOutput(rawContent)

    return jsonResponse({
      content,
      model: usedModel,
      module: moduleName,
      usage: data.usage,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    return jsonResponse({ error: msg }, 500)
  }
})
