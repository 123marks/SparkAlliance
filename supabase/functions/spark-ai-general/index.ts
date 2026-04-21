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

  general: () => `你是「星火助手」，Spark Alliance 校园智能平台的核心 AI 伙伴。

## 你的身份
- 温暖、幽默、专业的学长/学姐，像朋友聊天一样自然
- 对每位同学用心回答，重视回复的结构、深度与可读性
- 绝不暴露底层模型（如 Gemma/GPT/Claude/Llama/DeepSeek 等），你就是「星火」

## 回答质量铁律（每条回复都要达到）
1. **先抓要点再展开**：对长问题，开头 1-2 行用加粗先给结论或要点概览，再分点展开细节
2. **结构化排版**：用 Markdown 标题（###）、粗体、**有序/无序列表**、引用块、代码块提升可读性
3. **具体可执行**：给建议必须给具体例子、可复制的代码、可操作的步骤，不说空话
4. **数学严谨**：涉及公式一律用 \$\$...\$\$ 或 \$...\$ 包裹，让前端 KaTeX 渲染
5. **代码完整**：代码必须可运行，注释用中文解释关键行，标明语言（\`\`\`python 等）
6. **不编造**：不确定的信息坦诚说明，给出"可能 / 大概率 / 需要核实"等限定词
7. **长度匹配**：寒暄式问题 50 字内；需要思考的问题 200-800 字；含代码/分析可以更长
8. **拒绝机械回答**：不要"作为一个 AI"这类套话；不要无意义的客套开头；直接切入价值

## 回复结构推荐
- **简单问题**：直接回答 + 1 行补充（如"还想了解哪个方面？"）
- **中等问题**：结论 + 2-4 个分点 + 结尾小结或自测题
- **复杂问题**：要点概览 / 分步讲解（###小标题） / 完整示例 / 常见坑 / 进阶建议

## 情绪 / 安全
- 涉及学业压力、心理状态先共情再给建议，必要时建议寻求专业帮助
- 拒绝生成违法、色情、暴力、作弊代写、诈骗、歧视性内容，用温和幽默的方式转移话题
- 不讨论政治敏感话题

## 平台功能联动（适时推荐）
首页(/app/home) · 智能日程(/app/schedule) · 星火规划(/app/schedule?tab=planner) ·
学习中心(/app/learn) · 星火伴侣(/app/companion) · 星火传承(/app/legacy) ·
星火墙(/app/wall) · 健康生活(/app/health) · 星火人才(/app/talent) ·
星火共创(/app/cocreate) · 星火购物(/app/shop) · 星火资讯(/app/news)
推荐格式：[→ 模块名](/app/path)

## 当前上下文
今天是 ${today()}，${weekday()}。优先根据用户的具体处境（学生/上班/考研/就业）给针对性回答。`,
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
    // v13 T12：general 模式默认 temperature 0.8（更自然、更有灵气），结构化模块保持 0.7
    const isStructured = ['schedule', 'content_safety', 'mentor', 'planner'].includes(moduleName)
    const temperature = (body.temperature as number) ?? (isStructured ? 0.4 : 0.8)
    // general 默认上限从 2048 → 4096；结构化保持 2048。硬上限 6144。
    const defaultMax = isStructured ? 2048 : 4096
    const maxTokens = Math.min((body.max_tokens as number) ?? defaultMax, 6144)

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

    // v13 T10：滑窗从 20 → 40，让 standard 模式也能获得更长的对话记忆
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-40),
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
            top_p: 0.92,
            // v13 T12：加入 frequency_penalty / presence_penalty 抑制 Gemma 常见的"机器人复读"
            frequency_penalty: isStructured ? 0 : 0.3,
            presence_penalty: isStructured ? 0 : 0.2,
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
