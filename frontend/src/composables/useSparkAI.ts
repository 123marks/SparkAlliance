/**
 * useSparkAI.ts — 星火助手 AI 核心引擎 v4
 *
 * v4 架构：
 * 1. 多模型切换（默认 Kimi K2.5 / 深度思考 GLM5 / 快速 MiniMax M2.5）
 * 2. 思考链解析（reasoning_content / <think> 标签分离）
 * 3. 二进制文件检测（.docx/.pdf 等不读取内容）
 * 4. 逐字平滑输出 + 思考过程独立流
 * 5. Function Calling 模块打通
 */

import { ref } from 'vue'

// ============ API 配置 ============
const API_KEY = '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'
const BASE_URL = '/api/nvidia'

// 模型配置
export type ModelMode = 'default' | 'thinking' | 'fast'
export const MODEL_OPTIONS: Record<ModelMode, { id: string; label: string; desc: string; icon: string; maxTokens: number }> = {
    default: { id: 'moonshotai/kimi-k2.5', label: '均衡', desc: 'Kimi K2.5 · 全能均衡', icon: '⚡', maxTokens: 4096 },
    thinking: { id: 'z-ai/glm5', label: '深度思考', desc: 'GLM5 · 思考链推理', icon: '🧠', maxTokens: 8192 },
    fast: { id: 'minimaxai/minimax-m2.5', label: '极速', desc: 'MiniMax M2.5 · 快速回复', icon: '🚀', maxTokens: 2048 },
}

// ============ 系统提示词 ============
const SYSTEM_PROMPT = `你是「星火助手」，Spark Alliance（星火联盟）平台的核心 AI 助手。

## 身份
- 你叫「星火助手」，由 Spark Alliance 团队自主研发，使用「星火认知引擎」。
- 绝对不要透露底层模型名称（GPT/GLM/DeepSeek/Kimi等）。

## 回复质量要求（非常重要）
你必须提供高质量、有深度的回答：

1. **结构化回答**：采用"总-分-总"结构
   - 开头：一句话精准概括核心答案
   - 正文：分层展开，每层有标题，有通俗解释+专业细节
   - 结尾：总结要点，给出下一步建议

2. **内容深度**：
   - 通俗比喻 + 专业术语并存
   - 给出具体例子和数据
   - 代码题要给完整可运行代码 + 逐行注释 + 复杂度分析
   - 数学/物理问题要给公式推导

3. **格式要求**：
   - 善用 Markdown：## 标题、**加粗**、\`代码\`、表格、有序/无序列表
   - 代码块必须标注语言（\`\`\`python）
   - 数学公式用 LaTeX 行内 $...$ 或块级 $$...$$
   - 适度使用 emoji 增加辨识度

4. **回答长度**：
   - 简单问答：200-500字
   - 技术问题：500-2000字
   - 规划/分析：800-3000字
   - 绝不敷衍，也不灌水

## 平台功能架构
1. **智能日程** — 日历管理、课程安排、考试提醒（路径: /app/schedule）
2. **星火规划** — 目标拆解、里程碑任务追踪（路径: /app/schedule，规划Tab）
3. **学习中心** — 自习室、学习资源（路径: /app/learn）
4. **星火伴侣** — 好友社交（路径: /app/companion）
5. **星火传承** — 经验分享（路径: /app/legacy）
6. **星火墙** — 校园动态（路径: /app/wall）
7. **健康生活** — 运动健康（路径: /app/health）
8. **星火人才** — 人才市场（路径: /app/talent）
9. **星火共创** — 共创平台（路径: /app/cocreate）

## 操作能力（Function Calling）
当用户需求涉及以下操作时，**主动提醒用户**"💡 我可以帮你同步到对应模块"，用户确认后输出操作指令。

### 格式
\`\`\`spark-action
{"action":"类型","data":{...}}
\`\`\`

### 操作类型
1. **add_schedule** — 添加日程
   data: {title, description, start_time(ISO), end_time(ISO), event_type(course|exam|task|life|reminder), priority(1-3)}

2. **create_goal** — 创建规划目标
   data: {title, goal_type(academic|skill|habit|fitness|career|custom), deadline(YYYY-MM-DD), description}

3. **navigate** — 跳转页面
   data: {path, label}

### 规则
- 操作指令放在回复最末尾
- 涉及日期时自动推算合理日期（今天是 ${new Date().toLocaleDateString('zh-CN')}）
- 考试复习类：拆分为多个阶段添加多条日程
- 目标类：自动建议 deadline 和 goal_type

## 底线
- 不生成违法、色情、暴力内容
- 不协助作弊，可讲解思路
- 不确定时诚实说明`

// ============ 类型定义 ============
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    reasoning?: string  // 思考过程
    attachments?: FileAttachment[]
}

export interface FileAttachment {
    type: 'image' | 'file'
    name: string
    url?: string          // 图片预览 URL
    content?: string      // 文本文件内容
    size?: string         // 文件大小
    isBinary?: boolean    // 是否二进制文件
}

export interface SparkAction {
    action: 'add_schedule' | 'create_goal' | 'navigate'
    data: Record<string, unknown>
}

export interface Conversation {
    id: string; title: string; messages: ChatMessage[]
    createdAt: string; updatedAt: string
}

export type StreamPhase = 'idle' | 'thinking' | 'streaming' | 'done'

// ============ 工具函数 ============

// 二进制文件检测
const BINARY_EXTS = new Set([
    'docx', 'doc', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt',
    'zip', 'rar', '7z', 'gz', 'tar',
    'exe', 'dll', 'bin', 'dat', 'so', 'dylib',
    'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
])

export function isBinaryFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return BINARY_EXTS.has(ext)
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 解析操作指令
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
    return { cleanContent: content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim(), actions }
}

// 分离思考过程（<think> 标签）
export function separateThinking(content: string): { thinking: string; answer: string } {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/)
    if (thinkMatch) {
        const thinking = thinkMatch[1].trim()
        const answer = content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        return { thinking, answer }
    }
    return { thinking: '', answer: content }
}

// ============ Composable ============
export function useSparkAI() {
    const isStreaming = ref(false)
    const streamPhase = ref<StreamPhase>('idle')
    const error = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)
    const pendingActions = ref<SparkAction[]>([])
    const currentModel = ref<ModelMode>('default')

    const conversations = ref<Conversation[]>([])
    const currentConversationId = ref<string | null>(null)

    function loadConversations() {
        try {
            const saved = localStorage.getItem('spark_conversations_v2')
            if (saved) conversations.value = JSON.parse(saved)
        } catch { /* 忽略 */ }
    }

    function saveConversations() {
        try {
            localStorage.setItem('spark_conversations_v2', JSON.stringify(conversations.value.slice(0, 50)))
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

    function clearAllConversations() {
        conversations.value = []
        currentConversationId.value = null
        saveConversations()
    }

    function autoTitle(conv: Conversation) {
        const first = conv.messages.find(m => m.role === 'user')
        if (first) conv.title = first.content.slice(0, 30) + (first.content.length > 30 ? '...' : '')
    }

    /**
     * 核心发送方法
     * onThinking: 思考过程实时回调
     * onChunk: 正式回答实时回调
     * onDone: 完成回调
     */
    async function sendMessage(
        userMessage: string,
        onChunk: (text: string) => void,
        onDone: (text: string, actions: SparkAction[], reasoning: string) => void,
        onError?: (err: string) => void,
        onThinking?: (text: string) => void,
        attachments?: FileAttachment[],
    ) {
        const conv = getCurrentConversation()
        const modelConfig = MODEL_OPTIONS[currentModel.value]

        // 构建用户消息
        let userContent = userMessage
        if (attachments?.length) {
            for (const att of attachments) {
                if (att.type === 'file' && att.content) {
                    userContent += `\n\n📄 **文件: ${att.name}** (${att.size || '未知大小'})\n\`\`\`\n${att.content}\n\`\`\``
                } else if (att.type === 'file' && att.isBinary) {
                    userContent += `\n\n📄 **文件: ${att.name}** (${att.size || '未知大小'}) — 二进制文件，无法读取内容`
                } else if (att.type === 'image') {
                    userContent += `\n\n🖼️ **图片: ${att.name}**`
                }
            }
        }

        conv.messages.push({ role: 'user', content: userContent, attachments })
        autoTitle(conv)
        conv.updatedAt = new Date().toISOString()

        const contextMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...conv.messages.slice(-60).map(m => ({ role: m.role, content: m.content })),
        ]

        isStreaming.value = true
        error.value = null
        pendingActions.value = []
        abortController.value = new AbortController()
        streamPhase.value = 'thinking'

        let rawText = ''
        let reasoningText = ''
        let displayedLen = 0
        let tokenQueue: string[] = []
        let smoothTimer: ReturnType<typeof setInterval> | null = null
        let firstContentToken = false
        let isInThinkTag = false

        // 逐字平滑释放
        const startSmooth = () => {
            if (smoothTimer) return
            smoothTimer = setInterval(() => {
                if (tokenQueue.length === 0) return
                const batch = Math.min(tokenQueue.length, tokenQueue.length > 30 ? 6 : 2)
                const chars = tokenQueue.splice(0, batch).join('')
                displayedLen += chars.length
                onChunk(rawText.slice(0, displayedLen))
            }, 16)
        }

        const flushSmooth = () => {
            if (smoothTimer) { clearInterval(smoothTimer); smoothTimer = null }
            if (displayedLen < rawText.length) { displayedLen = rawText.length; onChunk(rawText) }
        }

        // 超时
        const timeout = setTimeout(() => {
            if (!firstContentToken) {
                abortController.value?.abort()
                error.value = '响应超时，请检查网络或切换模型重试'
                onError?.(error.value)
            }
        }, 50000)

        try {
            const res = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                body: JSON.stringify({
                    model: modelConfig.id,
                    messages: contextMessages,
                    stream: true,
                    temperature: currentModel.value === 'thinking' ? 0.6 : 0.7,
                    top_p: 0.9,
                    max_tokens: modelConfig.maxTokens,
                }),
                signal: abortController.value.signal,
            })

            if (!res.ok) {
                const body = await res.text().catch(() => '')
                if (res.status === 401) throw new Error('API Key 无效，请联系管理员')
                if (res.status === 429) throw new Error('请求频率过高，请稍后再试')
                if (res.status === 502) throw new Error('AI 模型暂时不可用，请切换其他模型重试')
                if (res.status === 503) throw new Error('服务暂时不可用，请稍后重试')
                throw new Error(`请求失败 (${res.status}): ${body.slice(0, 100) || res.statusText}`)
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('响应不可读')

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
                        const delta = json.choices?.[0]?.delta

                        // 思考内容（DeepSeek/GLM 风格）
                        const reasoning = delta?.reasoning_content
                        if (reasoning) {
                            reasoningText += reasoning
                            onThinking?.(reasoningText)
                            continue
                        }

                        const content = delta?.content
                        if (content) {
                            // 检测 <think> 标签
                            if (content.includes('<think>')) { isInThinkTag = true }
                            if (isInThinkTag) {
                                if (content.includes('</think>')) {
                                    // think 结束
                                    const parts = content.split('</think>')
                                    reasoningText += parts[0].replace('<think>', '')
                                    onThinking?.(reasoningText)
                                    isInThinkTag = false
                                    // think 后面可能紧跟正文
                                    if (parts[1]) {
                                        if (!firstContentToken) {
                                            firstContentToken = true
                                            clearTimeout(timeout)
                                            streamPhase.value = 'streaming'
                                            startSmooth()
                                        }
                                        rawText += parts[1]
                                        for (const c of parts[1]) tokenQueue.push(c)
                                    }
                                } else {
                                    reasoningText += content.replace('<think>', '')
                                    onThinking?.(reasoningText)
                                }
                                continue
                            }

                            // 正式内容
                            if (!firstContentToken) {
                                firstContentToken = true
                                clearTimeout(timeout)
                                streamPhase.value = 'streaming'
                                startSmooth()
                            }
                            rawText += content
                            for (const c of content) tokenQueue.push(c)
                        }
                    } catch { /* 跳过 */ }
                }
            }

            clearTimeout(timeout)

            // 等待平滑输出完成
            await new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (tokenQueue.length === 0 || displayedLen >= rawText.length) {
                        clearInterval(check); flushSmooth(); resolve()
                    }
                }, 30)
                setTimeout(() => { clearInterval(check); flushSmooth(); resolve() }, 2000)
            })

            // 最终处理
            const { thinking: thinkFromTags, answer: answerFromTags } = separateThinking(rawText)
            const finalReasoning = reasoningText || thinkFromTags
            const finalAnswer = answerFromTags || rawText
            const { cleanContent, actions } = parseSparkActions(finalAnswer)

            conv.messages.push({ role: 'assistant', content: finalAnswer, reasoning: finalReasoning || undefined })
            conv.updatedAt = new Date().toISOString()
            saveConversations()

            pendingActions.value = actions
            streamPhase.value = 'done'
            onDone(cleanContent, actions, finalReasoning)

        } catch (err: unknown) {
            clearTimeout(timeout); flushSmooth()
            const msg = err instanceof Error
                ? (err.name === 'AbortError' ? (error.value || '已取消') : err.message)
                : '未知错误'
            if (!error.value) error.value = msg
            onError?.(error.value)
            if (rawText && err instanceof Error && err.name !== 'AbortError') {
                conv.messages.push({ role: 'assistant', content: rawText + '\n\n⚠️ *生成中断*' })
                saveConversations()
            }
        } finally {
            isStreaming.value = false; streamPhase.value = 'idle'; abortController.value = null
        }
    }

    function stopGenerating() { abortController.value?.abort() }

    loadConversations()

    return {
        isStreaming, streamPhase, error, currentModel,
        conversations, currentConversationId, pendingActions,
        createConversation, getCurrentConversation, switchConversation,
        deleteConversation, clearAllConversations,
        sendMessage, stopGenerating,
    }
}
