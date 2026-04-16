import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import {
  chatCompletion,
  streamChatCompletion,
  checkOllamaHealth,
  checkModelAvailable,
  type ChatMessage,
} from './ollama.js'
import { type PromptModule, buildMessages } from './prompts.js'
import { checkInputSafety, sanitizeOutput, sanitizeJsonOutput } from './safety.js'

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '2mb' }))

// ====== 速率限制（内存实现，生产环境可换 Redis） ======

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  let bucket = rateBuckets.get(ip)
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60_000 }
    rateBuckets.set(ip, bucket)
  }
  bucket.count++
  return bucket.count <= config.rateLimit.perMinute
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(ip)
  }
}, 60_000)

// ====== 健康检查 ======

app.get('/health', async (_req, res) => {
  const ollamaOk = await checkOllamaHealth()
  const modelOk = ollamaOk ? await checkModelAvailable() : false
  res.json({
    status: ollamaOk && modelOk ? 'healthy' : 'degraded',
    ollama: ollamaOk,
    model: modelOk,
    modelName: config.ollama.model,
    timestamp: new Date().toISOString(),
  })
})

// ====== OpenAI 兼容 Chat Completions ======

app.post('/v1/chat/completions', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
  if (!rateLimit(clientIp)) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    return
  }

  try {
    const {
      messages,
      module: promptModule,
      extra_context: extraContext,
      temperature,
      max_tokens,
      stream,
    } = req.body as {
      messages?: { role: 'user' | 'assistant'; content: string }[]
      module?: PromptModule
      extra_context?: string
      temperature?: number
      max_tokens?: number
      stream?: boolean
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages 不能为空' })
      return
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      const safety = checkInputSafety(lastUserMsg.content)
      if (safety.blocked) {
        res.json({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: config.ollama.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: safety.content },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          _safety_blocked: true,
        })
        return
      }
    }

    const fullMessages: ChatMessage[] = promptModule
      ? buildMessages(promptModule, messages, extraContext)
      : [{ role: 'system', content: '你是星火助手，简洁准确地回答问题。' }, ...messages]

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Access-Control-Allow-Origin', '*')

      try {
        const body = await streamChatCompletion({
          messages: fullMessages,
          temperature,
          max_tokens,
          stream: true,
        })

        const reader = body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }

        res.write('data: [DONE]\n\n')
        res.end()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
        res.end()
      }
      return
    }

    const result = await chatCompletion({
      messages: fullMessages,
      temperature,
      max_tokens,
    })

    const rawContent = result.choices?.[0]?.message?.content || ''
    const isJsonMode = promptModule === 'schedule' || promptModule === 'content_safety'
    const content = isJsonMode ? sanitizeJsonOutput(rawContent) : sanitizeOutput(rawContent)

    result.choices[0].message.content = content
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    console.error('[LocalAI] 请求处理失败:', message)
    res.status(502).json({ error: `AI 服务错误: ${message.slice(0, 200)}` })
  }
})

// ====== 简化接口：按模块调用 ======

app.post('/api/spark/:module', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
  if (!rateLimit(clientIp)) {
    res.status(429).json({ error: '请求过于频繁' })
    return
  }

  const moduleName = req.params.module as PromptModule
  const { messages, extra_context, temperature, max_tokens } = req.body as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    extra_context?: string
    temperature?: number
    max_tokens?: number
  }

  if (!messages?.length) {
    res.status(400).json({ error: 'messages 不能为空' })
    return
  }

  try {
    const fullMessages = buildMessages(moduleName, messages, extra_context)

    const result = await chatCompletion({
      messages: fullMessages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? config.maxOutputTokens,
    })

    const rawContent = result.choices?.[0]?.message?.content || ''
    const isStructured = ['schedule', 'content_safety', 'mentor', 'planner'].includes(moduleName)
    const content = isStructured ? rawContent : sanitizeOutput(rawContent)

    res.json({
      content,
      model: config.ollama.model,
      module: moduleName,
      usage: result.usage,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    console.error(`[LocalAI] /api/spark/${moduleName} 失败:`, message)
    res.status(502).json({ error: `AI 服务错误: ${message.slice(0, 200)}` })
  }
})

// ====== 启动 ======

app.listen(config.port, async () => {
  console.log(`\n🌟 Spark Alliance Local AI Service`)
  console.log(`   端口: ${config.port}`)
  console.log(`   模型: ${config.ollama.model}`)
  console.log(`   Ollama: ${config.ollama.host}`)
  console.log()

  const ollamaOk = await checkOllamaHealth()
  if (ollamaOk) {
    console.log('✅ Ollama 连接正常')
    const modelOk = await checkModelAvailable()
    if (modelOk) {
      console.log(`✅ 模型 ${config.ollama.model} 已就绪`)
    } else {
      console.warn(`⚠️  模型 ${config.ollama.model} 未找到，请运行: ollama pull ${config.ollama.model}`)
    }
  } else {
    console.warn('⚠️  Ollama 未运行，请先启动 Ollama: ollama serve')
  }

  console.log(`\n📡 接口地址:`)
  console.log(`   健康检查: http://localhost:${config.port}/health`)
  console.log(`   OpenAI 兼容: POST http://localhost:${config.port}/v1/chat/completions`)
  console.log(`   模块接口: POST http://localhost:${config.port}/api/spark/{module}`)
  console.log(`   可用模块: companion | planner | mentor | schedule | general`)
  console.log()
})
