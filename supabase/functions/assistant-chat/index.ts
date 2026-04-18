import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ModelMode = 'default' | 'thinking' | 'fast' | 'standard'

interface ModelConfig {
  id: string
  fallbacks: string[]
  temperature: number
  maxTokens: number
  label: string
}

/**
 * 4 模式 → 真实底层模型（NVIDIA NIM slug）。
 *
 * 用户指定的对应关系（可通过 Supabase Secrets 覆盖）：
 * - default（均衡）    → moonshotai/kimi-k2.5
 * - thinking（深度思考）→ z-ai/glm-5.1
 * - fast（极速）       → minimaxai/minimax-m2.5
 * - standard（标准·Gemma3）→ google/gemma-3-27b-it  （项目自带，稳定兜底）
 *
 * Fallback 链（逗号分隔）：任一模型返回 404 / 429 / 5xx 时自动降级，
 * 保证用户始终能拿到回答，而不是「AI 服务暂时不可用」。
 */
function parseFallbacks(env: string): string[] {
  return env.split(',').map((s) => s.trim()).filter(Boolean)
}

function resolveModelConfig(mode: ModelMode): ModelConfig {
  const env = (key: string, defaultValue: string) => Deno.env.get(key) || defaultValue

  switch (mode) {
    case 'thinking':
      return {
        id: env('SPARK_MODEL_THINKING', 'z-ai/glm-5.1'),
        fallbacks: parseFallbacks(env('SPARK_FALLBACK_THINKING', 'zai-org/glm-4.5-air,deepseek-ai/deepseek-r1,google/gemma-3-27b-it')),
        temperature: 0.6,
        maxTokens: 8192,
        label: '深度思考',
      }
    case 'fast':
      return {
        id: env('SPARK_MODEL_FAST', 'minimaxai/minimax-m2.5'),
        fallbacks: parseFallbacks(env('SPARK_FALLBACK_FAST', 'meta/llama-3.1-8b-instruct,google/gemma-3-27b-it')),
        temperature: 0.8,
        maxTokens: 2048,
        label: '极速',
      }
    case 'standard':
      return {
        id: env('SPARK_MODEL_STANDARD', 'google/gemma-3-27b-it'),
        fallbacks: parseFallbacks(env('SPARK_FALLBACK_STANDARD', 'moonshotai/kimi-k2.5,meta/llama-3.1-8b-instruct')),
        temperature: 0.7,
        maxTokens: 4096,
        label: '标准',
      }
    case 'default':
    default:
      return {
        id: env('SPARK_MODEL_DEFAULT', 'moonshotai/kimi-k2.5'),
        fallbacks: parseFallbacks(env('SPARK_FALLBACK_DEFAULT', 'moonshotai/kimi-k2-instruct,google/gemma-3-27b-it,meta/llama-3.1-8b-instruct')),
        temperature: 0.75,
        maxTokens: 4096,
        label: '均衡',
      }
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 结构化错误响应 —— 前端根据 code 做精确提示（不再只给一句「认证异常」糊弄用户）
 */
function errorResponse(code: string, reason: string, status: number, extra?: Record<string, unknown>) {
  return jsonResponse({ error: reason, code, ...(extra || {}) }, status)
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

/**
 * 响应过滤：强制隐藏底层模型身份。无论底层是 Kimi/GLM/MiniMax/DeepSeek/Gemma，
 * 对外一律叫「星火助手」。
 */
const MODEL_IDENTITY_FILTERS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /(?:我是.*?(?:GPT|Claude|Gemini|Gemma|LLaMA|DeepSeek|Llama|Mistral|Kimi|Moonshot|MiniMax|GLM|Qwen|大语言模型|大模型|AI模型|语言模型))/gi, replacement: '我是星火助手' },
  { pattern: /(?:作为(?:一个)?(?:AI|人工智能|语言模型|大模型|机器人))/gi, replacement: '作为星火助手' },
  { pattern: /(?:OpenAI|Anthropic|Google\s+AI|Meta\s+AI|NVIDIA|Moonshot\s*AI|月之暗面|智谱\s*(?:AI|清言)?|MiniMax|零一万物|Z\.AI|z-ai)/gi, replacement: '星火团队' },
  { pattern: /\bGemma\b/gi, replacement: '星火' },
  { pattern: /\bDeepSeek\b/gi, replacement: '星火' },
  { pattern: /\bKimi\b/gi, replacement: '星火' },
  { pattern: /\bGLM[\s-]?\d*(?:\.\d+)?\b/gi, replacement: '星火' },
  { pattern: /\bMiniMax[\s-]?\w*\b/gi, replacement: '星火' },
  { pattern: /(?:我的训练数据|我的知识截止)/gi, replacement: '我了解的信息' },
]

/**
 * v11 输出格式规范化 —— 修复模型常见输出 Bug：
 * 1) "** 内容 **"（星号紧邻空格）不被 marked 识别为粗体，前端会看到裸 **
 * 2) 行首/行尾孤儿 **（未闭合粗体）
 * 3) 奇数个星号导致整段被误判为斜体
 * 4) 中文和粗体之间没有空格时某些版本 marked 不识别（现代 marked 已修，
 *    但仍然做一次兜底保证兼容）
 */
function normalizeMarkdown(text: string): string {
  if (!text) return text
  let out = text
  out = out.replace(/\*\*\s+([^*\n][^*]*?)\s+\*\*/g, '**$1**')
  out = out.replace(/(?<!\*)\*\s+([^*\n][^*]*?)\s+\*(?!\*)/g, '*$1*')
  out = out.replace(/(^|\n)\s*\*\*\s*(?=\n|$)/g, '$1')
  out = out.replace(/([\u4e00-\u9fa5\uFF00-\uFFEF0-9A-Za-z])\*\*([^*\n]+?)\*\*(?=[\u4e00-\u9fa5\uFF00-\uFFEF0-9A-Za-z])/g, '$1 **$2** ')
  const starCount = (out.match(/(?<!\\)\*/g) || []).length
  if (starCount % 2 === 1) {
    out = out.replace(/\*([^*]*)$/, '$1')
  }
  return out
}

function sanitizeOutput(text: string): string {
  let result = normalizeMarkdown(text)
  for (const filter of MODEL_IDENTITY_FILTERS) {
    result = result.replace(filter.pattern, filter.replacement)
  }
  return result
}

/**
 * v11 记忆摘要专用 Prompt —— 让 AI 把长对话压缩成结构化摘要，
 * 供前端在新会话里作为 system context 注入，实现跨会话记忆继承。
 */
const SUMMARIZE_PROMPT = `你是「星火记忆引擎」。用户马上会给你一段对话历史，请把它压缩为一份结构化摘要，
用于后续新会话直接复用作为上下文。摘要必须包括：
1. 【核心话题】：本次对话主要围绕什么主题（一句话）
2. 【关键信息】：用户提到的事实、偏好、身份设定、约束条件（3-8 条要点）
3. 【已达成的结论/方案】：如果讨论出了结论，分条列出
4. 【待继续的问题】：尚未解决但用户很可能想接着聊的事项

要求：
- 输出纯 Markdown，不带前后寒暄
- 不要虚构对话中没说过的信息
- 长度控制在 400 字以内
- 严禁使用 "** 空格 **" 这种错误粗体，粗体必须写 **紧贴内容**`

function buildSparkPrompt(today: string): string {
  const weekDay = ['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()]
  return `你是「星火助手」，Spark Alliance 校园智能平台的核心 AI 伙伴。

## 人格设定
- 你是一位经验丰富、热情开朗的学长/学姐，真心关心每位同学的学习和生活
- 说话风格自然、亲和、有点俏皮，像朋友聊天一样，不要刻板、机械
- 善于倾听和共情，会先理解对方的需求和情绪，再给出有针对性的建议
- 遇到复杂问题会拆解成小步骤，循序渐进地引导
- 绝不暴露底层模型名称（如 GPT/Claude/DeepSeek/Kimi/GLM/MiniMax/Gemma 等），你就是「星火助手」
- 适当使用 emoji 增加亲和力，但不过度

## 回复策略
- **不要一问一答的机械模式**，要有连贯的对话感
- 回答先概括要点，再展开细节，必要时用 Markdown 排版
- 遇到模糊问题主动追问澄清，如"你是想了解…还是…？"
- 给建议时结合具体场景，避免空洞的鸡汤
- 代码回复完整可运行，附必要注释
- 适时推荐平台功能，格式：[→ 模块名](/app/path)

## 输出格式规范（极其重要，前端依赖这些规则）
- Markdown 加粗必须写成 \`**粗体内容**\`，星号紧贴内容，**严禁** 写 \`** 粗体 **\`（内侧带空格）、孤立 \`**\`、或奇数个星号
- 代码块必须用三个反引号 + 语言标签，例如 \`\`\`python ... \`\`\`
- 行内代码用单反引号 \`code\`
- 公式用 \`$...$\`（行内）或 \`$$...$$\`（块级）
- 列表用 \`- \` 或 \`1. \`，前面留一个空行
- 不要输出孤立星号、未闭合括号等破坏排版的符号

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

/**
 * 将上游 HTTP 状态映射为对用户有用的错误码 + 中文原因。
 * 前端根据 code 可以做差异化 UI（例如 UPSTREAM_AUTH_FAILED 时弹「管理员：请检查 NVIDIA Key」）。
 */
function classifyUpstreamError(status: number, body: string): { code: string; reason: string; httpStatus: number } {
  const snippet = body.slice(0, 200)
  if (status === 401 || status === 403) {
    return {
      code: 'UPSTREAM_AUTH_FAILED',
      reason: `AI 服务商拒绝请求（${status}），通常是 NVIDIA_API_KEY 无效或已过期，请联系管理员检查 Supabase Edge Function Secrets。`,
      httpStatus: 502,
    }
  }
  if (status === 404) {
    return {
      code: 'UPSTREAM_MODEL_NOT_FOUND',
      reason: `模型不存在或已下架（404）：${snippet}`,
      httpStatus: 502,
    }
  }
  if (status === 429) {
    return {
      code: 'UPSTREAM_RATE_LIMIT',
      reason: 'AI 服务商限流（429），请稍后再试或切换模式（极速 / 深度思考 消耗额度不同）。',
      httpStatus: 429,
    }
  }
  if (status >= 500 && status < 600) {
    return {
      code: 'UPSTREAM_SERVER_ERROR',
      reason: `AI 服务商 ${status} 错误：${snippet}`,
      httpStatus: 502,
    }
  }
  return {
    code: 'UPSTREAM_UNKNOWN',
    reason: `上游 ${status}：${snippet}`,
    httpStatus: 502,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('NO_AUTH', '请先登录后再使用 AI 助手', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('SERVER_MISCONFIGURED', 'Supabase 服务端配置缺失，请联系管理员（SUPABASE_URL / SERVICE_ROLE_KEY）', 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return errorResponse('NO_AUTH', '登录凭证为空，请重新登录', 401)
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return errorResponse(
        'AUTH_FAILED',
        `登录状态已失效，请刷新页面或重新登录${authError?.message ? `（${authError.message}）` : ''}`,
        401,
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return errorResponse('BAD_REQUEST', '请求体无效（JSON 解析失败）', 400)
    }

    const assistant = body.assistant === 'companion' ? 'companion' : 'spark'
    // v11: 支持 4 种模式 —— default(均衡)/thinking(深度思考)/fast(极速)/standard(标准·Gemma3)
    const mode: ModelMode = (['thinking', 'fast', 'standard', 'default'] as const).includes(body.mode)
      ? (body.mode as ModelMode)
      : 'default'
    // v11: action=summarize 触发记忆压缩 —— 用专门 prompt 把历史对话压成摘要
    const action: 'chat' | 'summarize' = body.action === 'summarize' ? 'summarize' : 'chat'
    const messages = body.messages

    if (!isMessageArray(messages) || messages.length === 0) {
      return errorResponse('BAD_REQUEST', 'messages 不能为空且必须是 { role, content }[] 数组', 400)
    }

    // v12: 长上下文 —— 保留 120 条消息（配合前端自动摘要可无限衔接）
    const sanitizedMessages = messages
      .slice(-120)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0)

    if (sanitizedMessages.length === 0) {
      return errorResponse('BAD_REQUEST', '消息内容不能为空', 400)
    }

    const lastUserMsg = [...sanitizedMessages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      const safety = checkInputSafety(lastUserMsg.content)
      if (safety.blocked) {
        return jsonResponse({ content: safety.content, model: 'spark-ai', assistant, _blocked: true })
      }
    }

    const providerApiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
    if (!providerApiKey) {
      return errorResponse(
        'SERVER_MISCONFIGURED',
        'AI 服务密钥未配置。管理员请在 Supabase Dashboard → Edge Function Secrets 设置 NVIDIA_API_KEY，或运行 scripts/setup-ai-secrets.ps1 一键推送。',
        500,
      )
    }

    const providerBaseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const modelConfig = resolveModelConfig(mode)
    const today = new Date().toISOString().slice(0, 10)
    // v11: action=summarize 用专门的记忆压缩 prompt
    const systemPrompt = action === 'summarize'
      ? SUMMARIZE_PROMPT
      : (assistant === 'companion' ? buildCompanionPrompt(today) : buildSparkPrompt(today))

    // summarize 不适合走 stream（前端需要完整结果一次性写入 system 消息）
    const wantStream = body.stream === true && action !== 'summarize'

    const modelsToTry = [modelConfig.id, ...modelConfig.fallbacks]
    let upstream: Response | null = null
    let lastError = ''
    let lastStatus = 0
    let usedModel = modelConfig.id
    const attempts: Array<{ model: string; status?: number; error?: string }> = []

    for (const modelId of modelsToTry) {
      try {
        const resp = await fetch(`${providerBaseUrl}/chat/completions`, {
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
        if (resp.ok) {
          upstream = resp
          usedModel = modelId
          attempts.push({ model: modelId, status: resp.status })
          break
        }
        lastStatus = resp.status
        lastError = await resp.text().catch(() => '')
        attempts.push({ model: modelId, status: resp.status, error: lastError.slice(0, 120) })
        // 401/403 是 Key 问题 —— 换模型也救不了，直接上抛
        if (resp.status === 401 || resp.status === 403) break
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
        attempts.push({ model: modelId, error: lastError.slice(0, 120) })
      }
    }

    if (!upstream || !upstream.ok) {
      const cls = classifyUpstreamError(lastStatus || 502, lastError || '')
      return errorResponse(cls.code, cls.reason, cls.httpStatus, { attempts, mode, label: modelConfig.label })
    }

    if (wantStream) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Spark-Model': usedModel,
          'X-Spark-Mode': mode,
          'X-Spark-Attempts': String(attempts.length),
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
      mode,
      label: modelConfig.label,
      assistant,
      attempts: attempts.length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return errorResponse('INTERNAL_ERROR', `服务端异常：${errorMessage}`, 500)
  }
})
