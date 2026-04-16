/**
 * ai-schedule-import Edge Function
 *
 * 接收前端传来的图片URL或文本，调用 AI 识别课表/日程
 * 支持 本地Gemma + Gemini + 通义千问VL 三通道
 *
 * 环境变量：
 * - AI_PROVIDER: local | gemini | qwen (默认 local)
 * - LOCAL_AI_URL: 本地 AI 服务地址（默认 http://localhost:3721）
 * - GEMINI_API_KEY: Google Gemini API Key
 * - QWEN_API_KEY: 通义千问 API Key
 * - AI_DAILY_LIMIT: 每日调用上限（默认 5）
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AI 识别 Prompt（动态注入日期和学期信息）
function buildPrompt(today: string, semesterStart: string): string {
  return `你是一个专业的课表/日程识别助手。请分析用户上传的图片，识别其中的课程表或日程安排。

当前日期：${today}
学期开始日期：${semesterStart}

请提取所有可识别的事件，以 JSON 数组格式返回。每个事件包含：
- title: 事件标题（课程名/活动名）
- start_time: 开始时间 ISO 8601 格式（YYYY-MM-DDTHH:mm:ss）
- end_time: 结束时间 ISO 8601 格式
- event_type: 事件类型（course=课程, exam=考试, task=任务, life=生活, reminder=提醒）
- location: 地点/教室（如有）
- confidence: 识别置信度 0-1（你对该识别结果的可信程度）
- description: 备注信息（如教师名等）

注意事项：
1. 如果是周课表，根据学期开始日期推算最近一周的具体日期
2. 时间格式必须精确到分钟
3. 如果无法确定具体时间，使用常见的上课时间段（如 08:00-09:40）
4. 置信度低于 0.7 的条目添加说明
5. 只返回 JSON 数组，不要其他文字

返回格式示例：
[
  {
    "title": "高等数学",
    "start_time": "2026-03-23T08:00:00",
    "end_time": "2026-03-23T09:40:00",
    "event_type": "course",
    "location": "教学楼A302",
    "confidence": 0.95,
    "description": "张教授"
  }
]`
}

// ====== 本地 Gemma AI 调用 ======
async function callLocalAI(baseUrl: string, _imageUrl: string | null, fileText: string | null, prompt: string) {
  let fullPrompt = prompt
  if (fileText) {
    fullPrompt += `\n\n以下是需要识别的文本内容：\n${fileText}`
  }

  const response = await fetch(`${baseUrl}/api/spark/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`本地 AI 服务错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return data.content || ''
}

// ====== Gemini API 调用 ======
async function callGemini(apiKey: string, imageUrl: string | null, fileText: string | null, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  // 构建内容部分
  const parts: Record<string, unknown>[] = [{ text: prompt }]

  if (imageUrl) {
    // 下载图片转 base64
    const imgResponse = await fetch(imageUrl)
    const imgBuffer = await imgResponse.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
    const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg'

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    })
  }

  if (fileText) {
    parts.push({ text: `\n\n以下是需要识别的文本内容：\n${fileText}` })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text
}

// ====== 通义千问VL API 调用 ======
async function callQwen(apiKey: string, imageUrl: string | null, fileText: string | null, prompt: string) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

  // 构建消息内容
  const content: Record<string, string>[] = [{ text: prompt }]

  if (imageUrl) {
    content.unshift({ image: imageUrl })
  }

  if (fileText) {
    content.push({ text: `\n\n以下是需要识别的文本内容：\n${fileText}` })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [
          { role: 'user', content },
        ],
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`通义千问 API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.output?.choices?.[0]?.message?.content?.[0]?.text || ''
  return text
}

// ====== 解析 AI 返回的 JSON ======
function parseAIResponse(text: string): Record<string, unknown>[] {
  // 尝试从返回文本中提取 JSON 数组
  let jsonStr = text.trim()

  // 去掉 markdown 代码块
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  // 查找 JSON 数组
  const match = jsonStr.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI 返回内容中未找到 JSON 数组')

  const events = JSON.parse(match[0])
  if (!Array.isArray(events)) throw new Error('解析结果不是数组')

  return events
}

// ====== 主处理函数 ======
Deno.serve(async (req) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // 获取认证信息
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 初始化 Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 获取用户
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '认证失败' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 解析请求体
    const body = await req.json()
    const { imageUrl, fileText, today, semesterStart, userPrompt } = body as {
      imageUrl?: string
      fileText?: string
      today?: string
      semesterStart?: string
      userPrompt?: string
    }

    if (!imageUrl && !fileText) {
      return new Response(JSON.stringify({ error: '请提供图片URL或文本内容' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ====== 配额检查 ======
    const dailyLimit = parseInt(Deno.env.get('AI_DAILY_LIMIT') || '5')
    const todayDate = new Date().toISOString().split('T')[0]

    const { data: usageData } = await supabase
      .from('api_usage_logs')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', todayDate)
      .single()

    const currentUsage = usageData?.usage_count || 0

    if (currentUsage >= dailyLimit) {
      return new Response(JSON.stringify({
        error: '今日识别次数已用完',
        usage: currentUsage,
        limit: dailyLimit,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ====== 调用 AI ======
    const provider = Deno.env.get('AI_PROVIDER') || 'local'
    let prompt = buildPrompt(
      today || new Date().toISOString().split('T')[0],
      semesterStart || '2026-02-23'
    )

    if (userPrompt && userPrompt.trim()) {
      prompt += `\n\n用户额外说明：${userPrompt.trim()}`
    }

    let rawText = ''
    if (provider === 'local') {
      const localUrl = Deno.env.get('LOCAL_AI_URL') || 'http://localhost:3721'
      rawText = await callLocalAI(localUrl, imageUrl || null, fileText || null, prompt)
    } else if (provider === 'qwen') {
      const qwenKey = Deno.env.get('QWEN_API_KEY')
      if (!qwenKey) throw new Error('QWEN_API_KEY 未配置')
      rawText = await callQwen(qwenKey, imageUrl || null, fileText || null, prompt)
    } else {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiKey) throw new Error('GEMINI_API_KEY 未配置')
      rawText = await callGemini(geminiKey, imageUrl || null, fileText || null, prompt)
    }

    // 解析结果
    const events = parseAIResponse(rawText)
    const processingTime = Date.now() - startTime

    // ====== 更新配额 ======
    await supabase.from('api_usage_logs').upsert({
      user_id: user.id,
      usage_date: todayDate,
      usage_count: currentUsage + 1,
      daily_limit: dailyLimit,
    }, {
      onConflict: 'user_id,usage_date',
    })

    // ====== 记录导入日志 ======
    await supabase.from('ai_import_logs').insert({
      user_id: user.id,
      file_count: imageUrl || fileText ? 1 : 0,
      event_count: events.length,
      provider,
      status: 'success',
      raw_response: { text: rawText, events },
      processing_time_ms: processingTime,
    })

    // 返回识别结果
    return new Response(JSON.stringify({
      events,
      usage: currentUsage + 1,
      limit: dailyLimit,
      provider,
      processing_time_ms: processingTime,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 记录失败日志（尽力而为）
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) {
          await supabase.from('ai_import_logs').insert({
            user_id: user.id,
            provider: Deno.env.get('AI_PROVIDER') || 'gemini',
            status: 'failed',
            error_message: errorMessage,
            processing_time_ms: processingTime,
          })
        }
      }
    } catch {
      // 日志记录失败不影响主流程
    }

    return new Response(JSON.stringify({
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
