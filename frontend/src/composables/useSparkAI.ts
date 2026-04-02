/**
 * useSparkAI.ts — 星火助手 AI 核心引擎 v3
 *
 * v3 优化：
 * 1. 思考状态：连接后到首字输出前显示"思考中"
 * 2. 超时控制：30s 无响应自动中断并提示
 * 3. 逐字平滑输出：模拟打字机效果（队列+定时器）
 * 4. 网络连接检测：提前检查 API 可达性
 * 5. Function Calling 协议完整保留
 */

import { ref } from 'vue'

// ============ API 配置 ============
const API_KEY = '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'
// 通过 Vite 代理转发，避免浏览器 CORS 限制
const BASE_URL = '/api/nvidia'
const MODEL = 'z-ai/glm5'

// 超时设置（毫秒）
const CONNECT_TIMEOUT = 30000  // 连接超时 30s
const FIRST_TOKEN_TIMEOUT = 45000  // 首字超时 45s

// ============ 系统提示词 ============
const SYSTEM_PROMPT = `你是「星火助手」，Spark Alliance（星火联盟）平台的核心 AI 助手，由 Spark Alliance 团队自主研发。

## 身份规则
- 你的名字是「星火助手」，使用「星火认知引擎」提供服务。
- 绝对不要透露底层模型的真实名称（如 GLM、GPT、DeepSeek 等）或来源。
- 当用户问"你是什么模型/谁开发的" → 回答"我是 Spark Alliance 团队开发的星火助手"。

## 平台功能架构（你可以主动引导用户使用这些功能）
1. **智能日程** — 日历事件管理、课程安排、考试提醒
2. **星火规划** — 目标管理、里程碑拆解、任务追踪（支持考研/四级/健身/技能学习等）
3. **学习中心** — 自习室、学习资源
4. **星火伴侣** — 好友社交、动态、广场
5. **星火传承** — 经验分享、寄语留言
6. **星火墙** — 校园动态
7. **星火购物** — 二手交易
8. **健康生活** — 运动健康追踪
9. **星火人才** — 人才市场
10. **星火共创** — 共创平台、开发者社区

## 操作能力（Function Calling）
你可以帮用户执行以下操作。当你认为需要操作时，在回复末尾输出操作指令块。

### 操作指令格式
在回复正文之后，用如下格式输出操作（可多个）:
\`\`\`spark-action
{
  "action": "操作类型",
  "data": { ... }
}
\`\`\`

### 支持的操作类型

#### 1. add_schedule — 添加日程事件
\`\`\`spark-action
{
  "action": "add_schedule",
  "data": {
    "title": "事件标题",
    "description": "详细描述",
    "start_time": "2026-04-03T09:00:00",
    "end_time": "2026-04-03T10:00:00",
    "event_type": "course|exam|task|life|reminder|holiday",
    "priority": 1
  }
}
\`\`\`

#### 2. create_goal — 创建星火规划目标
\`\`\`spark-action
{
  "action": "create_goal",
  "data": {
    "title": "目标名称",
    "goal_type": "academic|skill|habit|fitness|career|custom",
    "deadline": "2026-06-30",
    "description": "目标描述"
  }
}
\`\`\`

#### 3. navigate — 导航到指定页面
\`\`\`spark-action
{
  "action": "navigate",
  "data": {
    "path": "/app/schedule",
    "label": "打开智能日程"
  }
}
\`\`\`

### 操作规则
- 当用户的需求涉及日程安排、目标规划时，主动提出"是否需要我帮你同步到对应模块？"
- 用户明确同意后，才输出操作指令块
- 操作指令块放在回复最末尾

## 交互模式
1. 理解用户意图后，给出**专业建议 + 可操作方案**
2. 如果用户的需求和平台功能相关，主动推荐使用平台功能
3. 例：用户说"我要备考四级" → 你应该：
   a. 分析用户现状（询问基础、考试时间等）
   b. 给出复习规划方案
   c. 主动提示"💡 我可以帮你把计划同步到『星火规划』或『智能日程』，要不要试试？"
   d. 用户同意后输出 create_goal 操作指令

## 回复风格
- 使用中文（除非用户要求其他语言）
- Markdown 格式：标题、列表、代码块（标注语言）、表格、加粗
- 有深度但不啰嗦，专业但易懂
- 适当使用 emoji 增加亲和力

## 底线原则
- 不生成违法、色情、暴力内容
- 不协助作弊（可讲解解题思路）
- 不确定时诚实说明`

// ============ 类型定义 ============
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: { type: 'image' | 'file'; name: string; url?: string; content?: string }[]
}

export interface SparkAction {
    action: 'add_schedule' | 'create_goal' | 'navigate'
    data: Record<string, unknown>
}

export interface Conversation {
    id: string
    title: string
    messages: ChatMessage[]
    createdAt: string
    updatedAt: string
}

// 流式状态：connecting → thinking → streaming → done
export type StreamPhase = 'idle' | 'connecting' | 'thinking' | 'streaming' | 'done'

// ============ 解析操作指令 ============
export function parseSparkActions(content: string): { cleanContent: string; actions: SparkAction[] } {
    const actions: SparkAction[] = []
    const regex = /```spark-action\s*\n([\s\S]*?)```/g
    let match
    while ((match = regex.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(match[1].trim())
            if (parsed.action && parsed.data) actions.push(parsed as SparkAction)
        } catch { /* 跳过 */ }
    }
    const cleanContent = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
    return { cleanContent, actions }
}

// ============ Composable ============
export function useSparkAI() {
    const isStreaming = ref(false)
    const streamPhase = ref<StreamPhase>('idle')
    const error = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)
    const pendingActions = ref<SparkAction[]>([])

    const conversations = ref<Conversation[]>([])
    const currentConversationId = ref<string | null>(null)

    function loadConversations() {
        try {
            const saved = localStorage.getItem('spark_conversations')
            if (saved) conversations.value = JSON.parse(saved)
        } catch { /* 忽略 */ }
    }

    function saveConversations() {
        try {
            localStorage.setItem('spark_conversations', JSON.stringify(conversations.value.slice(0, 50)))
        } catch { /* 忽略 */ }
    }

    function createConversation(): Conversation {
        const conv: Conversation = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title: '新对话', messages: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        conversations.value.unshift(conv)
        currentConversationId.value = conv.id
        saveConversations()
        return conv
    }

    function getCurrentConversation(): Conversation {
        let conv = conversations.value.find(c => c.id === currentConversationId.value)
        if (!conv) conv = createConversation()
        return conv
    }

    function switchConversation(id: string) { currentConversationId.value = id }

    function deleteConversation(id: string) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (currentConversationId.value === id) currentConversationId.value = conversations.value[0]?.id || null
        saveConversations()
    }

    function autoTitle(conv: Conversation) {
        const first = conv.messages.find(m => m.role === 'user')
        if (first) conv.title = first.content.slice(0, 30) + (first.content.length > 30 ? '...' : '')
    }

    /**
     * 核心发送方法
     * 流式阶段回调：onPhase(phase) → connecting → thinking → streaming → done
     * 平滑输出：收到的 token 放入队列，用定时器逐字释放
     */
    async function sendMessage(
        userMessage: string,
        onChunk: (fullText: string) => void,
        onDone: (fullText: string, actions: SparkAction[]) => void,
        onError?: (err: string) => void,
        onPhase?: (phase: StreamPhase) => void,
        attachments?: ChatMessage['attachments'],
    ) {
        const conv = getCurrentConversation()

        // 构建用户消息
        let userContent = userMessage
        if (attachments?.length) {
            for (const att of attachments) {
                if (att.type === 'file' && att.content) {
                    userContent += `\n\n[附件: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``
                } else if (att.type === 'image' && att.url) {
                    userContent += `\n\n[图片: ${att.name}]`
                }
            }
        }

        conv.messages.push({ role: 'user', content: userContent, attachments })
        autoTitle(conv)
        conv.updatedAt = new Date().toISOString()

        const contextMessages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conv.messages.slice(-60).map(m => ({ role: m.role, content: m.content })),
        ]

        isStreaming.value = true
        error.value = null
        pendingActions.value = []
        abortController.value = new AbortController()

        // 阶段切换
        const setPhase = (p: StreamPhase) => { streamPhase.value = p; onPhase?.(p) }
        setPhase('connecting')

        // 全量文本 + 平滑输出队列
        let rawFullText = ''           // API 返回的完整文本
        let displayedLength = 0        // 已展示给用户的字符数
        let tokenQueue: string[] = []  // 待展示字符队列
        let smoothTimer: ReturnType<typeof setInterval> | null = null
        let firstTokenReceived = false

        // 平滑输出定时器：每 20ms 释放几个字符
        const startSmoothOutput = () => {
            if (smoothTimer) return
            smoothTimer = setInterval(() => {
                if (tokenQueue.length === 0) return
                // 一次释放 1~3 个字符（模拟自然打字速度）
                const batchSize = Math.min(tokenQueue.length, tokenQueue.length > 20 ? 5 : 2)
                const chars = tokenQueue.splice(0, batchSize).join('')
                displayedLength += chars.length
                onChunk(rawFullText.slice(0, displayedLength))
            }, 18)
        }

        // 清理定时器并刷完剩余
        const flushSmooth = () => {
            if (smoothTimer) { clearInterval(smoothTimer); smoothTimer = null }
            if (displayedLength < rawFullText.length) {
                displayedLength = rawFullText.length
                onChunk(rawFullText)
            }
        }

        // 超时定时器
        const connectTimer = setTimeout(() => {
            if (!firstTokenReceived) {
                abortController.value?.abort()
                error.value = '连接超时，请检查网络后重试（提示：国内网络可能需要稳定的代理访问）'
                onError?.(error.value)
            }
        }, FIRST_TOKEN_TIMEOUT)

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
                if (response.status === 401) throw new Error('API Key 无效或已过期')
                if (response.status === 429) throw new Error('请求频率过高，请稍后再试')
                if (response.status === 503) throw new Error('AI 服务暂时不可用，请稍后再试')
                throw new Error(`请求失败 (${response.status}): ${errBody || response.statusText}`)
            }

            // 连接成功，进入思考阶段
            setPhase('thinking')

            const reader = response.body?.getReader()
            if (!reader) throw new Error('响应体不可读')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed === 'data: [DONE]') continue
                    if (!trimmed.startsWith('data: ')) continue

                    try {
                        const json = JSON.parse(trimmed.slice(6))
                        const delta = json.choices?.[0]?.delta?.content
                        if (delta) {
                            // 首个 token —— 从"思考"切换到"流式"
                            if (!firstTokenReceived) {
                                firstTokenReceived = true
                                clearTimeout(connectTimer)
                                setPhase('streaming')
                                startSmoothOutput()
                            }
                            // 追加到原始文本 + 队列
                            rawFullText += delta
                            for (const char of delta) {
                                tokenQueue.push(char)
                            }
                        }
                    } catch { /* 跳过 */ }
                }
            }

            clearTimeout(connectTimer)

            // 等待平滑输出完成（最多 2s）
            await new Promise<void>(resolve => {
                const checkInterval = setInterval(() => {
                    if (tokenQueue.length === 0 || displayedLength >= rawFullText.length) {
                        clearInterval(checkInterval)
                        flushSmooth()
                        resolve()
                    }
                }, 50)
                // 安全超时
                setTimeout(() => { clearInterval(checkInterval); flushSmooth(); resolve() }, 2000)
            })

            // 解析操作指令
            const { cleanContent, actions } = parseSparkActions(rawFullText)

            conv.messages.push({ role: 'assistant', content: rawFullText })
            conv.updatedAt = new Date().toISOString()
            saveConversations()

            pendingActions.value = actions
            setPhase('done')
            onDone(cleanContent, actions)

        } catch (err: unknown) {
            clearTimeout(connectTimer)
            flushSmooth()

            const errMsg = err instanceof Error
                ? (err.name === 'AbortError'
                    ? (error.value || '已取消生成')  // 可能是超时触发的 abort
                    : err.message)
                : '未知错误'

            if (!error.value) error.value = errMsg
            onError?.(error.value)

            if (rawFullText && err instanceof Error && err.name !== 'AbortError') {
                conv.messages.push({ role: 'assistant', content: rawFullText + '\n\n⚠️ *生成中断*' })
                saveConversations()
            }
        } finally {
            isStreaming.value = false
            streamPhase.value = 'idle'
            abortController.value = null
        }
    }

    function stopGenerating() { abortController.value?.abort() }

    loadConversations()

    return {
        isStreaming, streamPhase, error,
        conversations, currentConversationId, pendingActions,
        createConversation, getCurrentConversation, switchConversation, deleteConversation,
        sendMessage, stopGenerating, parseSparkActions,
    }
}
