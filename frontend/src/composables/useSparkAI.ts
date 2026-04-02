/**
 * useSparkAI.ts — 星火助手 AI 核心引擎 v2
 *
 * 架构升级：
 * 1. Function Calling 协议：AI 可通过 JSON 指令操作应用模块
 * 2. 项目上下文注入：AI 完全理解 Spark Alliance 的功能架构
 * 3. SSE 流式优化：批量渲染 + requestAnimationFrame 防抖
 * 4. 上下文窗口扩展至 60 条消息
 * 5. 会话持久化无上限（localStorage 50 个会话）
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'

// ============ API 配置 ============
const API_KEY = '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'
// 通过 Vite 代理转发，避免浏览器 CORS 限制
const BASE_URL = '/api/nvidia'
const MODEL = 'z-ai/glm5'

// ============ 系统提示词 — 星火助手品牌 + 项目上下文 + 操作能力 ============
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
- 操作前必须询问用户确认，不可未经同意直接操作
- 用户明确同意后，才输出操作指令块
- 操作指令块放在回复最末尾
- 可以同时输出多个操作指令块

## 交互模式
1. 理解用户意图后，给出**专业建议 + 可操作方案**
2. 例：用户说"我要备考四级" → 你应该：
   a. 分析用户现状（询问基础、考试时间等）
   b. 给出复习规划方案
   c. 询问"要不要我帮你添加到星火规划中？"
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
    // 附件信息
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

// ============ 解析操作指令 ============
export function parseSparkActions(content: string): { cleanContent: string; actions: SparkAction[] } {
    const actions: SparkAction[] = []
    // 匹配 ```spark-action ... ``` 块
    const regex = /```spark-action\s*\n([\s\S]*?)```/g
    let match
    while ((match = regex.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(match[1].trim())
            if (parsed.action && parsed.data) {
                actions.push(parsed as SparkAction)
            }
        } catch { /* 解析失败跳过 */ }
    }
    // 移除操作块，保留干净的回复正文
    const cleanContent = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
    return { cleanContent, actions }
}

// ============ Composable ============
export function useSparkAI() {
    const isStreaming = ref(false)
    const error = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)
    const pendingActions = ref<SparkAction[]>([])

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
        } catch { /* 首次使用或数据损坏 */ }
    }

    // 持久化（保留最近50个会话）
    function saveConversations() {
        try {
            const toSave = conversations.value.slice(0, 50)
            localStorage.setItem('spark_conversations', JSON.stringify(toSave))
        } catch { /* localStorage 满了 */ }
    }

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

    function getCurrentConversation(): Conversation {
        let conv = conversations.value.find(c => c.id === currentConversationId.value)
        if (!conv) conv = createConversation()
        return conv
    }

    function switchConversation(id: string) {
        currentConversationId.value = id
    }

    function deleteConversation(id: string) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (currentConversationId.value === id) {
            currentConversationId.value = conversations.value[0]?.id || null
        }
        saveConversations()
    }

    function autoTitle(conv: Conversation) {
        const firstUserMsg = conv.messages.find(m => m.role === 'user')
        if (firstUserMsg) {
            conv.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
        }
    }

    /**
     * 核心：发送消息，SSE 流式接收
     * 优化：requestAnimationFrame 批量渲染，减少 DOM 更新频率
     */
    async function sendMessage(
        userMessage: string,
        onChunk: (fullText: string) => void,
        onDone: (fullText: string, actions: SparkAction[]) => void,
        onError?: (err: string) => void,
        attachments?: ChatMessage['attachments'],
    ) {
        const conv = getCurrentConversation()

        // 构建用户消息内容（含附件）
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

        // 上下文窗口：系统提示词 + 最近60条消息
        const contextMessages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conv.messages.slice(-60).map(m => ({
                role: m.role,
                content: m.content,
            })),
        ]

        isStreaming.value = true
        error.value = null
        pendingActions.value = []
        abortController.value = new AbortController()

        let fullText = ''
        // RAF 批量渲染缓冲
        let pendingChunk = ''
        let rafId: number | null = null

        const flushChunk = () => {
            if (pendingChunk) {
                fullText += pendingChunk
                pendingChunk = ''
                onChunk(fullText)
            }
            rafId = null
        }

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
                            // 累积到缓冲区，用 RAF 批量渲染
                            pendingChunk += delta
                            if (!rafId) {
                                rafId = requestAnimationFrame(flushChunk)
                            }
                        }
                    } catch { /* 跳过 */ }
                }
            }

            // 确保最后的缓冲区内容被刷出
            if (pendingChunk) {
                fullText += pendingChunk
                pendingChunk = ''
            }
            if (rafId) cancelAnimationFrame(rafId)

            // 解析操作指令
            const { cleanContent, actions } = parseSparkActions(fullText)

            // 保存到会话（存干净内容）
            conv.messages.push({ role: 'assistant', content: fullText })
            conv.updatedAt = new Date().toISOString()
            saveConversations()

            pendingActions.value = actions
            onDone(cleanContent, actions)

        } catch (err: unknown) {
            if (pendingChunk) {
                fullText += pendingChunk
                pendingChunk = ''
            }
            if (rafId) cancelAnimationFrame(rafId)

            const errMsg = err instanceof Error
                ? (err.name === 'AbortError' ? '已取消生成' : err.message)
                : '未知错误'
            error.value = errMsg
            onError?.(errMsg)

            if (fullText && err instanceof Error && err.name !== 'AbortError') {
                conv.messages.push({ role: 'assistant', content: fullText + '\n\n⚠️ *生成中断*' })
                saveConversations()
            }
        } finally {
            isStreaming.value = false
            abortController.value = null
        }
    }

    function stopGenerating() {
        abortController.value?.abort()
    }

    // 初始化
    loadConversations()

    return {
        isStreaming,
        error,
        conversations,
        currentConversationId,
        pendingActions,
        createConversation,
        getCurrentConversation,
        switchConversation,
        deleteConversation,
        sendMessage,
        stopGenerating,
        parseSparkActions,
    }
}
