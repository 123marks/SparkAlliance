/**
 * tarot-reading Edge Function
 *
 * 星火卡罗牌 AI 解读服务
 * 鉴权 → 缓存检查 → 配额扣减 → 服务端抽牌 → AI 解读 → 入库
 *
 * 环境变量：
 * - NVIDIA_API_KEY: NVIDIA NIM API Key（优先，gamma4）
 * - NVIDIA_BASE_URL: NVIDIA API 基础 URL（可选）
 * - MIMO_API_KEY: 小米 MiMO API Key（降级）
 * - GEMINI_API_KEY: Google Gemini API Key（降级）
 * - AI_PROVIDER: nvidia | mimo | gemini（可选，默认按 key 自动选择）
 * - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 每日配额上限（开发阶段设为 999，上线改回 3）
const DAILY_LIMIT = 999
// 逆位概率
const REVERSED_PROBABILITY = 0.4

// ====== AI 解读 Prompt 模板（终审版） ======
function buildPrompt(
  readingMode: string,
  userQuestion: string | null,
  cardNameZh: string,
  isReversed: boolean,
  uprightMeaning: string,
  reversedMeaning: string,
  campusContext: string,
  keywords: string[]
): string {
  const orientation = isReversed ? '逆位（提醒能量）' : '正位（正向能量）'
  const baseMeaning = isReversed ? reversedMeaning : uprightMeaning

  return `你是"星火校园"里的卡罗牌解读搭子。你提供的是轻娱乐、心理支持和行动建议，不是预言、宗教裁决或医学法律意见。

【产品边界】
1. 禁止宿命论、恐吓式表达、绝对化判断。
2. 禁止鼓励伤害自己或他人，禁止违法、色情、赌博、极端、政治敏感内容。
3. 遇到明显的心理危机、伤害风险、医疗或法律问题时，不做塔罗式判断，只温和建议用户尽快寻求专业帮助。
4. 输出必须贴近大学生语境，但不要油腻、不要故作玄虚。

【输入】
- 模式：${readingMode === 'question' ? '问题解读' : '今日指引'}
- 用户问题：${userQuestion || '（无，请给出今日指引）'}
- 卡牌名：${cardNameZh}
- 朝向：${orientation}
- 基础牌义：${baseMeaning}
- 校园语境：${campusContext}
- 关键词：${keywords.join('、')}

【输出要求】
1. 只输出中文正文，不要标题，不要列表，不要 Markdown。
2. 总长度 140 到 220 字。
3. 结构上依次包含：
   - 先解释这张牌此刻代表什么；
   - 再结合用户问题或"今日指引"场景给出具体理解；
   - 最后给一个今天就能执行的小建议。
4. 语气温暖、具体、克制，允许有一点神秘感，但不能像神棍。
5. 避免使用"注定""一定会""命中注定""你必须"等表达。`
}

// ====== 调用 NVIDIA gamma4 (gemma-3-27b-it) ======
async function callNvidia(apiKey: string, prompt: string): Promise<string> {
  const baseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
  const model = Deno.env.get('SPARK_GENERAL_MODEL') || 'google/gemma-3-27b-it'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 512,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`NVIDIA API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  return text.trim()
}

// ====== 调用小米 MiMO（OpenAI 兼容格式） ======
async function callMiMO(apiKey: string, prompt: string): Promise<string> {
  const url = 'https://api.xiaomimimo.com/v1/chat/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiMo-7B-RL',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 512,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`MiMO API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  return text.trim()
}

// ====== 调用 Gemini Flash（降级通道） ======
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.trim()
}

// ====== 智能调用 AI（优先 NVIDIA gamma4，降级 MiMO/Gemini） ======
async function callAI(prompt: string): Promise<{ text: string; provider: string }> {
  const forceProvider = Deno.env.get('AI_PROVIDER') || ''
  const nvidiaKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NV_API_KEY')
  const mimoKey = Deno.env.get('MIMO_API_KEY')
  const geminiKey = Deno.env.get('GEMINI_API_KEY')

  // 优先使用指定的 provider
  if (forceProvider === 'nvidia' && nvidiaKey) {
    return { text: await callNvidia(nvidiaKey, prompt), provider: 'nvidia-gamma4' }
  }
  if (forceProvider === 'mimo' && mimoKey) {
    return { text: await callMiMO(mimoKey, prompt), provider: 'mimo' }
  }
  if (forceProvider === 'gemini' && geminiKey) {
    return { text: await callGemini(geminiKey, prompt), provider: 'gemini-1.5-flash' }
  }

  // 自动选择：NVIDIA gamma4 优先
  if (nvidiaKey) {
    try {
      return { text: await callNvidia(nvidiaKey, prompt), provider: 'nvidia-gamma4' }
    } catch (e) {
      console.warn('NVIDIA gamma4 调用失败，尝试降级:', e)
    }
  }

  // 降级到 MiMO
  if (mimoKey) {
    try {
      return { text: await callMiMO(mimoKey, prompt), provider: 'mimo' }
    } catch (e) {
      console.warn('MiMO 调用失败，尝试降级到 Gemini:', e)
    }
  }

  // 降级到 Gemini
  if (geminiKey) {
    return { text: await callGemini(geminiKey, prompt), provider: 'gemini-1.5-flash' }
  }

  throw new Error('未配置任何 AI API Key（NVIDIA_API_KEY、MIMO_API_KEY 或 GEMINI_API_KEY）')
}

// ====== JSON 响应 ======
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ====== 主处理函数 ======
Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 鉴权
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: '未授权' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: '认证失败' }, 401)
    }

    // 2. 校验请求体
    const body = await req.json()
    const { readingMode, userQuestion } = body as {
      readingMode?: string
      userQuestion?: string
    }

    if (!readingMode || !['question', 'daily'].includes(readingMode)) {
      return jsonResponse({ error: 'readingMode 必须为 question 或 daily' }, 400)
    }

    if (readingMode === 'question') {
      if (!userQuestion || userQuestion.trim().length < 1 || userQuestion.trim().length > 500) {
        return jsonResponse({ error: '问题长度需在 1-500 字之间' }, 400)
      }
    }

    // 3. question 模式先查缓存
    if (readingMode === 'question' && userQuestion) {
      const { data: cached } = await supabase.rpc('find_today_cached_tarot_reading', {
        p_user_id: user.id,
        p_question: userQuestion.trim(),
      })

      if (cached && cached.length > 0) {
        const hit = cached[0]
        // 查询卡牌信息
        const { data: card } = await supabase
          .from('tarot_cards')
          .select('*')
          .eq('id', hit.card_id)
          .single()

        return jsonResponse({
          readingId: hit.id,
          card: card ? {
            id: card.id,
            cardNo: card.card_no,
            nameZh: card.name_zh,
            nameEn: card.name_en,
            imageUrl: card.image_url,
            uprightMeaning: card.upright_meaning,
            reversedMeaning: card.reversed_meaning,
            campusContext: card.campus_context,
            keywords: card.keywords,
          } : null,
          isReversed: hit.is_reversed,
          reading: hit.ai_reading,
          cached: true,
          usage: -1,  // 缓存命中不计算配额
          limit: DAILY_LIMIT,
        })
      }
    }

    // 4. 原子扣减配额
    const { data: quotaResult } = await supabase.rpc('consume_feature_quota', {
      p_user_id: user.id,
      p_feature: 'tarot_reading',
      p_daily_limit: DAILY_LIMIT,
    })

    if (!quotaResult || quotaResult.length === 0 || !quotaResult[0].allowed) {
      const usage = quotaResult?.[0]?.usage_count || DAILY_LIMIT
      return jsonResponse({
        error: '今日解读额度已用完，明天再来抽一张 🌙',
        usage,
        limit: DAILY_LIMIT,
      }, 429)
    }

    const currentUsage = quotaResult[0].usage_count

    // 5. 服务端随机抽牌
    const { data: card, error: cardErr } = await supabase
      .from('tarot_cards')
      .select('*')
      .eq('is_active', true)
      .order('id')  // 先排序保证有结果
      .limit(100)   // 取全部

    if (cardErr || !card || card.length === 0) {
      throw new Error('无可用卡牌')
    }

    // 真正的随机选择
    const selectedCard = card[Math.floor(Math.random() * card.length)]
    const isReversed = Math.random() < REVERSED_PROBABILITY

    // 6. 构建 Prompt + 调用 AI（MiMO 优先，Gemini 降级）
    const prompt = buildPrompt(
      readingMode,
      readingMode === 'question' ? userQuestion!.trim() : null,
      selectedCard.name_zh,
      isReversed,
      selectedCard.upright_meaning,
      selectedCard.reversed_meaning,
      selectedCard.campus_context,
      selectedCard.keywords
    )

    const { text: aiReading, provider: aiProvider } = await callAI(prompt)

    // 7. 写入 tarot_readings
    const readingRecord: Record<string, unknown> = {
      user_id: user.id,
      card_id: selectedCard.id,
      reading_mode: readingMode,
      spread_type: 'single',
      is_reversed: isReversed,
      user_question: readingMode === 'question' ? userQuestion!.trim() : null,
      ai_reading: aiReading,
      ai_provider: aiProvider,
      cache_hit: false,
    }

    const { data: reading, error: insertErr } = await supabase
      .from('tarot_readings')
      .insert(readingRecord)
      .select('id')
      .single()

    if (insertErr) throw insertErr

    // 8. 返回结果
    return jsonResponse({
      readingId: reading.id,
      card: {
        id: selectedCard.id,
        cardNo: selectedCard.card_no,
        nameZh: selectedCard.name_zh,
        nameEn: selectedCard.name_en,
        imageUrl: selectedCard.image_url,
        uprightMeaning: selectedCard.upright_meaning,
        reversedMeaning: selectedCard.reversed_meaning,
        campusContext: selectedCard.campus_context,
        keywords: selectedCard.keywords,
      },
      isReversed,
      reading: aiReading,
      cached: false,
      usage: currentUsage,
      limit: DAILY_LIMIT,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error('tarot-reading error:', errorMessage)

    return jsonResponse({ error: errorMessage }, 500)
  }
})
