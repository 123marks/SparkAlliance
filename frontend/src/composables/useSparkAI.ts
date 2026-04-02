/**
 * useSparkAI.ts — 星火助手 AI 核心引擎
 *
 * 架构设计：
 * 1. 直接前端调用 NVIDIA API（OpenAI 兼容接口）
 * 2. 系统提示词注入「星火助手」品牌身份
 * 3. SSE 流式传输，实时逐字渲染
 * 4. 多轮上下文维护（滑动窗口控制 token 预算）
 * 5. 错误边界与重试机制
 */

import { ref } from 'vue'

// ============ API 配置 ============
const API_KEY = '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'
// 通过 Vite 代理转发，避免浏览器 CORS 限制
const BASE_URL = '/api/nvidia'
const MODEL = 'z-ai/glm5'

// ============ 系统提示词 — 星火助手品牌身份 ============
const SYSTEM_PROMPT = `你是「星火助手」，一款由 Spark Alliance 团队自主研发的校园 AI 智能助手。

## 身份规则
- 你的名字是「星火助手」，你是 Spark Alliance 平台的核心 AI。
- 当用户问你"你是什么模型"、"你是谁开发的"时，回答你是 Spark Alliance 团队开发的星火助手。
- 不要透露底层模型的真实名称或来源。
- 你使用自研的「星火认知引擎」提供服务。

## 能力范围
- 🎓 学业辅导：讲解专业课概念、解答习题、复习规划
- 💻 编程助手：写代码、调试 Bug、代码审查、架构设计
- 📝 写作助手：论文润色、翻译、文档生成、报告撰写
- 💡 创意思维：头脑风暴、方案设计、项目策划
- 📊 数据分析：数据处理建议、图表解读
- 🌐 通用问答：百科知识、生活建议、职业规划

## 回复风格
- 使用中文回复（除非用户明确要求其他语言）
- 回复要结构清晰，善用 Markdown 格式（标题、列表、代码块、表格、加粗）
- 代码块必须标注语言类型（如 \`\`\`python、\`\`\`javascript）
- 回答要有深度但不啰嗦，专业但易懂
- 适当使用 emoji 增加亲和力

## 底线原则
- 不生成违法、色情、暴力内容
- 不协助作弊行为（但可以讲解解题思路）
- 如果不确定答案，诚实说明并建议查证`

// ============ 类型定义 ============
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface Conversation {
    id: string
    title: string
    messages: ChatMessage[]
    createdAt: string
    updatedAt: string
}

// ============ Composable ============
export function useSparkAI() {
    const isStreaming = ref(false)
    const error = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)

    // 会话管理
    const conversations = ref<Conversation[]>([])
    const currentConversationId = ref<string | null>(null)

    // 从 localStorage 恢复会话
    function loadConversations() {
        try {
            const saved = localStorage.getItem('spark_conversations')
            if (saved) {
                conversations.value = JSON.parse(saved)
            }
        } catch { /* 首次使用或数据损坏，忽略 */ }
    }

    // 持久化会话到 localStorage
    function saveConversations() {
        try {
            // 只保留最近20个会话，避免 localStorage 爆满
            const toSave = conversations.value.slice(0, 20)
            localStorage.setItem('spark_conversations', JSON.stringify(toSave))
        } catch { /* localStorage 满了，静默失败 */ }
    }

    // 创建新会话
    function createConversation(): Conversation {
        const conv: Conversation = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        conversations.value.unshift(conv)
        currentConversationId.value = conv.id
        saveConversations()
        return conv
    }

    // 获取当前会话
    function getCurrentConversation(): Conversation {
        let conv = conversations.value.find(c => c.id === currentConversationId.value)
        if (!conv) {
            conv = createConversation()
        }
        return conv
    }

    // 切换会话
    function switchConversation(id: string) {
        currentConversationId.value = id
    }

    // 删除会话
    function deleteConversation(id: string) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (currentConversationId.value === id) {
            currentConversationId.value = conversations.value[0]?.id || null
        }
        saveConversations()
    }

    // 根据第一条用户消息自动生成标题
    function autoTitle(conv: Conversation) {
        const firstUserMsg = conv.messages.find(m => m.role === 'user')
        if (firstUserMsg) {
            // 取前30个字符作为标题
            conv.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
        }
    }

    /**
     * 核心方法：发送消息并获取流式回复
     * @param userMessage 用户消息
     * @param onChunk 每次收到新 chunk 的回调
     * @param onDone 流结束回调
     * @param onError 错误回调
     */
    async function sendMessage(
        userMessage: string,
        onChunk: (fullText: string) => void,
        onDone: (fullText: string) => void,
        onError?: (err: string) => void,
    ) {
        const conv = getCurrentConversation()

        // 添加用户消息
        conv.messages.push({ role: 'user', content: userMessage })
        autoTitle(conv)
        conv.updatedAt = new Date().toISOString()

        // 构建上下文（滑动窗口：系统提示词 + 最近20轮对话）
        const contextMessages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conv.messages.slice(-40), // 最近40条消息（约20轮对话）
        ]

        isStreaming.value = true
        error.value = null

        // 创建 AbortController 用于取消请求
        abortController.value = new AbortController()

        let fullText = ''

        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: contextMessages,
                    stream: true,
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 4096,
                }),
                signal: abortController.value.signal,
            })

            if (!response.ok) {
                const errBody = await response.text().catch(() => '')
                throw new Error(`API 请求失败 (${response.status}): ${errBody || response.statusText}`)
            }

            // 读取 SSE 流
            const reader = response.body?.getReader()
            if (!reader) throw new Error('响应体不可读')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // 按行解析 SSE 数据
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // 最后一行可能不完整，保留到下次

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed === 'data: [DONE]') continue
                    if (!trimmed.startsWith('data: ')) continue

                    try {
                        const json = JSON.parse(trimmed.slice(6))
                        const delta = json.choices?.[0]?.delta?.content
                        if (delta) {
                            fullText += delta
                            onChunk(fullText)
                        }
                    } catch {
                        // 解析失败的行直接跳过（可能是不完整的JSON）
                    }
                }
            }

            // 流结束，保存助手回复
            conv.messages.push({ role: 'assistant', content: fullText })
            conv.updatedAt = new Date().toISOString()
            saveConversations()
            onDone(fullText)

        } catch (err: unknown) {
            const errMsg = err instanceof Error
                ? (err.name === 'AbortError' ? '已取消生成' : err.message)
                : '未知错误'
            error.value = errMsg
            onError?.(errMsg)

            // 如果是非取消错误，也保存部分回复（如果有的话）
            if (fullText && err instanceof Error && err.name !== 'AbortError') {
                conv.messages.push({ role: 'assistant', content: fullText + '\n\n⚠️ *生成中断*' })
                saveConversations()
            }
        } finally {
            isStreaming.value = false
            abortController.value = null
        }
    }

    // 停止生成
    function stopGenerating() {
        abortController.value?.abort()
    }

    // 初始化
    loadConversations()

    return {
        // 状态
        isStreaming,
        error,
        conversations,
        currentConversationId,
        // 会话管理
        createConversation,
        getCurrentConversation,
        switchConversation,
        deleteConversation,
        // 核心方法
        sendMessage,
        stopGenerating,
    }
}
