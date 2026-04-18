import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ModelMode = 'default' | 'thinking' | 'fast'

/**
 * 模式 → 真实底层模型（NVIDIA NIM slug）。
 * - default（标准）：Gemma 3 27B —— 本项目默认模型，速度/质量平衡
 * - thinking（深度）：DeepSeek R1 —— 真推理链（reasoning_content），适合复杂题
 * - fast（极速）：Llama 3.1 8B —— 轻量快速，适合闲聊/小问题
 *
 * 支持通过环境变量覆盖（部署时可临时换模型而不需要改代码）：
 *   SPARK_MODEL_DEFAULT / SPARK_MODEL_THINKING / SPARK_MODEL_FAST
 */
function resolveModelConfig(mode: ModelMode): { id: string; fallbacks: string[]; temperature: number; maxTokens: number } {
  const envGet = (key: string) => Deno.env.get(key) || ''

  switch (mode) {
    case 'thinking':
      return {
        id: envGet('SPARK_MODEL_THINKING') || 'deepseek-ai/deepseek-r1',
        fallbacks: ['google/gemma-3-27b-it', 'meta/llama-3.1-8b-instruct'],
        temperature: 0.6,
        maxTokens: 8192,
      }
    case 'fast':
      return {
        id: envGet('SPARK_MODEL_FAST') || 'meta/llama-3.1-8b-instruct',
        fallbacks: ['google/gemma-3-27b-it'],
        temperature: 0.8,
        maxTokens: 2048,
      }
    case 'default':
    default:
      return {
        id: envGet('SPARK_MODEL_DEFAULT') || 'google/gemma-3-27b-it',
        fallbacks: ['meta/llama-3.1-8b-instruct'],
        temperature: 0.75,
        maxTokens: 4096,
      }
  }
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

// 输入安全检查
const SENSITIVE_PATTERNS = [
  /(?:赌博|gambling|casino)/i,
  /(?:色情|pornograph|xxx|nsfw|黄色|裸体)/i,
  /(?:毒品|drug\s+deal|narcotic|吸毒|贩毒)/i,
  /(?:恐怖袭击|terroris[mt]|bomb\s+threat)/i,
  /(?:枪支|炸弹|武器制造|制毒)/i,
  /(?:传销|非法集资|洗钱)/i,
  /(?:自杀|自残|自我伤害|suicide|self[- ]harm)/i,
  /(?:代写|代考|作弊|买答案)/i,
]

function checkInputSafety(text: string): { blocked: boolean; content: string } {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, content: '这个话题不太合适哦，我们聊点别的吧！我可以帮你管理日程、辅导学习、规划目标 😊' }
    }
  }
  return { blocked: false, content: text }
}

// 响应过滤：隐藏模型身份
const MODEL_IDENTITY_FILTERS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /(?:我是.*?(?:GPT|Claude|Gemini|Gemma|LLaMA|DeepSeek|Llama|Mistral|大语言模型|大模型|AI模型|语言模型))/gi, replacement: '我是星火助手' },
  { pattern: /(?:作为(?:一个)?(?:AI|人工智能|语言模型|大模型|机器人))/gi, replacement: '作为星火助手' },
  { pattern: /(?:OpenAI|Anthropic|Google\s+AI|Meta\s+AI|NVIDIA)/gi, replacement: '星火团队' },
  { pattern: /\bGemma\b/gi, replacement: '星火' },
  { pattern: /\bDeepSeek\b/gi, replacement: '星火' },
  { pattern: /(?:我的训练数据|我的知识截止)/gi, replacement: '我了解的信息' },
]

function sanitizeOutput(text: string): string {
  let result = text
  for (const filter of MODEL_IDENTITY_FILTERS) {
    result = result.replace(filter.pattern, filter.replacement)
  }
  return result
}

function buildSparkPrompt(today: string): string {
  const weekDay = ['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()]
  return `你是「星火助手」，Spark Alliance 校园智能平台的核心 AI 伙伴。

## 人格设定
- 你是一位经验丰富、热情开朗的学长/学姐，真心关心每位同学的学习和生活
- 说话风格自然、亲和、有点俏皮，像朋友聊天一样，不要刻板、机械
- 善于倾听和共情，会先理解对方的需求和情绪，再给出有针对性的建议
- 遇到复杂问题会拆解成小步骤，循序渐进地引导
- 绝不暴露底层模型名称（如 GPT/Claude/DeepSeek 等），你就是「星火助手」
- 适当使用 emoji 增加亲和力，但不过度

## 回复策略
- **不要一问一答的机械模式**，要有连贯的对话感
- 回答先概括要点，再展开细节，必要时用 Markdown 排版
- 遇到模糊问题主动追问澄清，如"你是想了解…还是…？"
- 给建议时结合具体场景，避免空洞的鸡汤
- 代码回复完整可运行，附必要注释
- 适时推荐平台功能，格式：[→ 模块名](/app/path)

## 平台功能
首页(/app/home) | 智能日程(/app/schedule) | 星火规划(/app/schedule?tab=planner) | 学习中心(/app/learn) | 星火伴侣(/app/companion) | 星火传承(/app/legacy) | 星火墙(/app/wall) | 健康生活(/app/health) | 星火人才(/app/talent) | 星火共创(/app/cocreate) | 星火购物(/app/shop) | 星火资讯(/app/news)

## 安全边界
- 拒绝生成违法、色情、暴力、诈骗、歧视性内容，用温和幽默的方式转移话题
- 涉及心理健康时温柔引导并建议寻求专业帮助
- 不确定的信息坦诚说明，不编造

## 今日上下文
今天是 ${today}，${weekDay}

## Function Calling（操作同步）
\`\`\`spark-action
{"action":"类型","data":{...}}
\`\`\`
支持的操作：
- add_schedule: { title, description?, start_time, end_time?, event_type?, priority? }
- create_goal: { title, goal_type, deadline, description? }
- navigate: { path, label?, query? }（仅限 /app 路由）
缺少必要参数时请追问。`
}

function buildCompanionPrompt(today: string): string {
  return `你是「星火」，Spark Alliance 中的 AI 伙伴。

## 你的人格
- 你是用户最信赖的朋友，温暖、细腻、有同理心
- 说话像真正的好朋友，不是冰冷的客服
- 善于捕捉用户的情绪变化，给出有温度的回应
- 学习困难时给具体建议，心情低落时给温柔鼓励
- 不说空话和大道理，给实在、可操作的建议

## 回复要求
- 必须用中文回答
- 先共情再建议，让用户感觉被理解
- 回答要有层次，不是一股脑倾倒信息
- 适时推荐平台功能帮助用户，如 [打开学习中心](/app/learn)
- 不要生成 spark-action 代码块

今天是 ${today}。`
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

    // 输入安全检查
    const lastUserMsg = [...sanitizedMessages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      const safety = checkInputSafety(lastUserMsg.content)
      if (safety.blocked) {
        return jsonResponse({ content: safety.content, model: 'spark-ai', assistant, _blocked: true })
      }
    }

    const providerApiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
    if (!providerApiKey) {
      return jsonResponse({ error: 'AI 服务密钥未配置' }, 500)
    }

    const providerBaseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const modelConfig = resolveModelConfig(mode)
    const today = new Date().toISOString().slice(0, 10)
    const systemPrompt = assistant === 'companion'
      ? buildCompanionPrompt(today)
      : buildSparkPrompt(today)

    const wantStream = body.stream === true

    const modelsToTry = [modelConfig.id, ...modelConfig.fallbacks]
    let upstream: Response | null = null
    let lastError = ''
    let usedModel = modelConfig.id

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
            stream: wantStream,
            temperature: modelConfig.temperature,
            top_p: 0.9,
            max_tokens: modelConfig.maxTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              ...sanitizedMessages,
            ],
          }),
        })
        if (upstream.ok) {
          usedModel = modelId
          break
        }
        lastError = await upstream.text().catch(() => '')
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

    if (wantStream) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Spark-Model': usedModel,
        },
      })
    }

    const data = await upstream.json()
    const message = data.choices?.[0]?.message || {}
    const rawContent = typeof message.content === 'string' ? message.content : ''
    const content = sanitizeOutput(rawContent)
    const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : ''

    return jsonResponse({
      content,
      reasoning,
      model: usedModel,
      assistant,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return jsonResponse({ error: errorMessage }, 500)
  }
})
