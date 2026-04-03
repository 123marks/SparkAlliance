/**
 * useSparkAI.ts — 星火助手 AI 核心引擎 v6
 *
 * v6 超能力：
 * 1. 深度模块知识（9大模块的路由/功能/操作/示例全部注入）
 * 2. 扩展 Function Calling（覆盖全模块跳转+日程+规划+学习+健康）
 * 3. 内联导航标记（回复中嵌入 [→ 模块名](/path) 可点击跳转）
 * 4. 多模型切换（Kimi K2.5 / GLM5 / MiniMax M2.5）
 * 5. 思考链解析 + 逐字平滑输出
 */

import { ref } from 'vue'

// ============ API 配置 ============
const API_KEY = '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'
const BASE_URL = '/api/nvidia'

export type ModelMode = 'default' | 'thinking' | 'fast'
export const MODEL_OPTIONS: Record<ModelMode, { id: string; label: string; desc: string; icon: string; maxTokens: number }> = {
    default: { id: 'moonshotai/kimi-k2.5', label: '均衡', desc: 'Kimi K2.5 · 全能均衡', icon: '⚡', maxTokens: 4096 },
    thinking: { id: 'z-ai/glm5', label: '深度思考', desc: 'GLM5 · 思考链推理', icon: '🧠', maxTokens: 8192 },
    fast: { id: 'minimaxai/minimax-m2.5', label: '极速', desc: 'MiniMax M2.5 · 快速回复', icon: '🚀', maxTokens: 2048 },
}

// ============ 能力工具栏定义（导出给 Chat.vue） ============
export const ABILITY_TOOLS = [
    { key: 'schedule', icon: '📅', label: '日程管理', prompt: '帮我管理日程：' },
    { key: 'planner', icon: '🎯', label: '规划助手', prompt: '帮我制定一个目标规划：' },
    { key: 'study', icon: '📚', label: '学习辅导', prompt: '帮我讲解一下：' },
    { key: 'solve', icon: '🧮', label: '解题答疑', prompt: '帮我解这道题：' },
    { key: 'write', icon: '✍️', label: '写作助手', prompt: '帮我写：' },
    { key: 'code', icon: '💻', label: '编程助手', prompt: '帮我编写代码：' },
    { key: 'analyze', icon: '📊', label: '数据分析', prompt: '帮我分析：' },
    { key: 'navigate', icon: '🧭', label: '功能导航', prompt: '带我去' },
]

// ============ 系统提示词（深度模块知识注入） ============
const SYSTEM_PROMPT = `你是「星火助手」，Spark Alliance（星火联盟）平台的**核心 AI 大脑**。你不是一个简单的聊天机器人——你是整个平台的**智能中枢**，深度理解每一个功能模块，能帮用户完成真实操作。

## 身份
- 你叫「星火助手」，由 Spark Alliance 团队自主研发
- 绝对不允许暴露底层模型名称（GPT/GLM/Kimi/DeepSeek等）
- 你是平台的一部分,不是外部工具

## 你的超能力
你拥有以下核心能力，主动发挥它们：
1. **模块操作** — 直接帮用户操作日程/规划/导航等模块
2. **知识专家** — 深度解答学术/编程/写作/数据分析问题
3. **规划师** — 帮用户拆解目标、制定计划，同步到规划模块
4. **导航员** — 知道平台每个角落，随时带用户跳转

## 平台功能模块（你必须深度掌握）

### 1. 🏠 首页仪表盘 (/app/home)
- 显示今日日程概览、任务进度、待办事项
- 快速入口到各个模块
- **你的应用**：告诉用户今天有什么安排

### 2. 📅 智能日程 (/app/schedule)
- 日历视图（日/周/月切换）、课程表、考试提醒
- 事件类型：course(课程)、exam(考试)、task(任务)、life(生活)、reminder(提醒)
- 优先级 1-3（1最高）
- 支持重复事件（每日/每周/每月）
- **你的操作**：帮用户添加日程、查看日程、整理时间表
- **示例**："帮我每周三下午2点添加高数课" → 生成 add_schedule 指令

### 3. 🎯 星火规划 (/app/schedule，规划Tab)
- 目标管理：设定目标 → 拆解里程碑 → 创建任务 → 追踪进度
- 目标类型：academic(学业)、skill(技能)、habit(习惯)、fitness(健身)、career(职业)、custom(自定义)
- **你的操作**：帮用户创建目标、拆解步骤、设定 deadline
- **示例**："30天学会Python" → 创建目标 + 拆解每周任务

### 4. 📚 学习中心 (/app/learn)
- 自习室模式（专注计时）、番茄钟
- 学习资源管理、笔记整理
- **你的操作**：推荐学习方法、讲解知识点、引导进入自习室

### 5. 👥 星火伴侣 (/app/companion)
- 好友系统、学习小组、互助讨论
- **你的操作**：引导用户建立学习小组

### 6. 🏛️ 星火传承 (/app/legacy)
- 学长学姐经验分享、课程评价、考试攻略
- **你的操作**：推荐相关经验贴

### 7. 📢 星火墙 (/app/wall)
- 校园动态、表白墙、失物招领、二手市场
- **你的操作**：引导用户发布或浏览动态

### 8. ❤️ 健康生活 (/app/health)
- 运动记录、饮食管理、睡眠追踪、心理健康
- **你的操作**：提供健康建议、提醒运动

### 9. 💼 星火人才 (/app/talent)
- 实习/兼职信息、简历优化、面试准备
- **你的操作**：帮用户优化简历措辞

### 10. 🚀 星火共创 (/app/cocreate)
- 项目协作、创意征集、团队组建
- **你的操作**：帮用户撰写项目简介

## 回复质量要求

### 结构
采用 **总-分-总** 三段式：
1. **一句话核心答案**（加粗高亮）
2. **分层展开**（每层有标题+通俗解释+专业细节+例子）
3. **总结+下一步建议**（主动推荐关联模块操作）

### 内容深度
- 通俗比喻 + 专业术语并存
- 代码：完整可运行 + 逐行注释 + 复杂度分析
- 数学：LaTeX 公式 ($行内$ / $$块级$$) + 推导过程
- 善用 Markdown：## 标题、**加粗**、\`代码\`、表格、列表

### 回答长度
- 简单问答：300-600字
- 技术/学术：800-2500字
- 规划/分析：1000-3500字
- **绝不敷衍，内容必须够详细够有深度**

### 主动推荐
回答结束后，如果发现可以关联平台模块，**必须主动推荐**：
- "💡 我可以帮你把这个复习计划同步到 **智能日程**，需要我操作吗？"
- "🎯 你可以在 **星火规划** 中追踪这个学习目标的进度 → [打开星火规划](/app/schedule)"

### 内联导航链接
当提到平台模块时，在文中嵌入跳转链接（Markdown 格式）：
- [→ 打开智能日程](/app/schedule)
- [→ 前往学习中心](/app/learn)
- [→ 查看星火墙](/app/wall)
这些链接会被前端渲染为可点击的导航按钮。

## Function Calling 操作

当用户明确或隐含需要操作时，在回复末尾输出指令：

\`\`\`spark-action
{"action":"类型","data":{...}}
\`\`\`

### 操作类型
1. **add_schedule** — 添加日程
   data: {title, description, start_time(ISO), end_time(ISO), event_type, priority(1-3)}

2. **create_goal** — 创建规划目标
   data: {title, goal_type, deadline(YYYY-MM-DD), description}

3. **navigate** — 跳转页面
   data: {path, label}

### 规则
- 今天是 ${new Date().toLocaleDateString('zh-CN')}（${['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]}）
- 涉及日期时自动推算合理日期
- 考试复习：拆分为多阶段日程
- 可以在一次回复中输出多个 spark-action
- 不确定时先确认再操作

## 底线
- 不生成违法、色情、暴力内容
- 不协助作弊，可讲解思路
- 不确定时诚实说明`

// ============ 类型定义 ============
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    reasoning?: string
    attachments?: FileAttachment[]
}

export interface FileAttachment {
    type: 'image' | 'file'
    name: string
    url?: string
    content?: string
    size?: string
    isBinary?: boolean
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
const BINARY_EXTS = new Set([
    'docx', 'doc', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar', '7z', 'gz', 'tar',
    'exe', 'dll', 'bin', 'dat', 'so', 'dylib', 'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'eot',
])
export function isBinaryFile(filename: string): boolean {
    return BINARY_EXTS.has(filename.split('.').pop()?.toLowerCase() || '')
}
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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

export function separateThinking(content: string): { thinking: string; answer: string } {
    const m = content.match(/<think>([\s\S]*?)<\/think>/)
    if (m) return { thinking: m[1].trim(), answer: content.replace(/<think>[\s\S]*?<\/think>/, '').trim() }
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
        try { const s = localStorage.getItem('spark_conversations_v2'); if (s) conversations.value = JSON.parse(s) } catch { }
    }
    function saveConversations() {
        try { localStorage.setItem('spark_conversations_v2', JSON.stringify(conversations.value.slice(0, 50))) } catch { }
    }
    function createConversation(): Conversation {
        const conv: Conversation = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title: '新对话', messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        conversations.value.unshift(conv); currentConversationId.value = conv.id; saveConversations(); return conv
    }
    function getCurrentConversation(): Conversation {
        let c = conversations.value.find(c => c.id === currentConversationId.value)
        if (!c) c = createConversation(); return c
    }
    function switchConversation(id: string) { currentConversationId.value = id }
    function deleteConversation(id: string) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (currentConversationId.value === id) currentConversationId.value = conversations.value[0]?.id || null
        saveConversations()
    }
    function clearAllConversations() { conversations.value = []; currentConversationId.value = null; saveConversations() }
    function autoTitle(conv: Conversation) {
        const f = conv.messages.find(m => m.role === 'user')
        if (f) conv.title = f.content.slice(0, 30) + (f.content.length > 30 ? '...' : '')
    }

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
                if (att.type === 'file' && att.content) userContent += `\n\n📄 **文件: ${att.name}** (${att.size})\n\`\`\`\n${att.content}\n\`\`\``
                else if (att.type === 'file' && att.isBinary) userContent += `\n\n📄 **文件: ${att.name}** (${att.size}) — 二进制文件`
                else if (att.type === 'image') userContent += `\n\n🖼️ **图片: ${att.name}**`
            }
        }
        conv.messages.push({ role: 'user', content: userContent, attachments })
        autoTitle(conv); conv.updatedAt = new Date().toISOString()

        const contextMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...conv.messages.slice(-60).map(m => ({ role: m.role, content: m.content })),
        ]

        isStreaming.value = true; error.value = null; pendingActions.value = []
        abortController.value = new AbortController(); streamPhase.value = 'thinking'

        let rawText = '', reasoningText = '', displayedLen = 0
        const tokenQueue: string[] = []
        let smoothTimer: ReturnType<typeof setInterval> | null = null
        let firstContentToken = false, isInThinkTag = false

        const startSmooth = () => {
            if (smoothTimer) return
            smoothTimer = setInterval(() => {
                if (tokenQueue.length === 0) return
                const batch = Math.min(tokenQueue.length, tokenQueue.length > 30 ? 6 : 2)
                const chars = tokenQueue.splice(0, batch).join('')
                displayedLen += chars.length; onChunk(rawText.slice(0, displayedLen))
            }, 16)
        }
        const flushSmooth = () => {
            if (smoothTimer) { clearInterval(smoothTimer); smoothTimer = null }
            if (displayedLen < rawText.length) { displayedLen = rawText.length; onChunk(rawText) }
        }

        const timeout = setTimeout(() => {
            if (!firstContentToken) { abortController.value?.abort(); error.value = '响应超时，请检查网络或切换模型重试'; onError?.(error.value) }
        }, 50000)

        try {
            const res = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                body: JSON.stringify({
                    model: modelConfig.id, messages: contextMessages, stream: true,
                    temperature: currentModel.value === 'thinking' ? 0.6 : 0.7,
                    top_p: 0.9, max_tokens: modelConfig.maxTokens,
                }),
                signal: abortController.value.signal,
            })

            if (!res.ok) {
                const body = await res.text().catch(() => '')
                if (res.status === 401) throw new Error('API Key 无效，请联系管理员')
                if (res.status === 429) throw new Error('请求频率过高，请稍后再试')
                if (res.status === 502) throw new Error('当前模型暂不可用，请切换其他模型')
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
                const lines = buffer.split('\n'); buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue
                    try {
                        const json = JSON.parse(trimmed.slice(6))
                        const delta = json.choices?.[0]?.delta

                        // 思考内容
                        if (delta?.reasoning_content) { reasoningText += delta.reasoning_content; onThinking?.(reasoningText); continue }

                        const content = delta?.content
                        if (content) {
                            if (content.includes('<think>')) isInThinkTag = true
                            if (isInThinkTag) {
                                if (content.includes('</think>')) {
                                    const parts = content.split('</think>')
                                    reasoningText += parts[0].replace('<think>', ''); onThinking?.(reasoningText); isInThinkTag = false
                                    if (parts[1]) {
                                        if (!firstContentToken) { firstContentToken = true; clearTimeout(timeout); streamPhase.value = 'streaming'; startSmooth() }
                                        rawText += parts[1]; for (const c of parts[1]) tokenQueue.push(c)
                                    }
                                } else { reasoningText += content.replace('<think>', ''); onThinking?.(reasoningText) }
                                continue
                            }
                            if (!firstContentToken) { firstContentToken = true; clearTimeout(timeout); streamPhase.value = 'streaming'; startSmooth() }
                            rawText += content; for (const c of content) tokenQueue.push(c)
                        }
                    } catch { }
                }
            }

            clearTimeout(timeout)
            await new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (tokenQueue.length === 0 || displayedLen >= rawText.length) { clearInterval(check); flushSmooth(); resolve() }
                }, 30)
                setTimeout(() => { clearInterval(check); flushSmooth(); resolve() }, 2000)
            })

            const { thinking: thinkFromTags, answer: answerFromTags } = separateThinking(rawText)
            const finalReasoning = reasoningText || thinkFromTags
            const finalAnswer = answerFromTags || rawText
            const { cleanContent, actions } = parseSparkActions(finalAnswer)

            conv.messages.push({ role: 'assistant', content: finalAnswer, reasoning: finalReasoning || undefined })
            conv.updatedAt = new Date().toISOString(); saveConversations()
            pendingActions.value = actions; streamPhase.value = 'done'; onDone(cleanContent, actions, finalReasoning)
        } catch (err: unknown) {
            clearTimeout(timeout); flushSmooth()
            const msg = err instanceof Error ? (err.name === 'AbortError' ? (error.value || '已取消') : err.message) : '未知错误'
            if (!error.value) error.value = msg; onError?.(error.value)
            if (rawText && err instanceof Error && err.name !== 'AbortError') {
                conv.messages.push({ role: 'assistant', content: rawText + '\n\n⚠️ *生成中断*' }); saveConversations()
            }
        } finally { isStreaming.value = false; streamPhase.value = 'idle'; abortController.value = null }
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
