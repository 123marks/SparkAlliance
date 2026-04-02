<template>
  <div class="chat-layout">
    <!-- 左侧：会话历史侧边栏 -->
    <aside class="chat-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="sidebar-top">
        <button class="new-chat-btn" @click="handleNewChat">
          <span>+</span> 新对话
        </button>
      </div>

      <div class="history-list">
        <!-- 会话按日期分组 -->
        <div v-for="group in groupedConversations" :key="group.label" class="h-group">
          <div class="h-title">{{ group.label }}</div>
          <div
            v-for="conv in group.items" :key="conv.id"
            class="h-item" :class="{ active: conv.id === currentConversationId }"
            @click="handleSwitchConv(conv.id)"
          >
            <span class="h-text">{{ conv.title }}</span>
            <button class="h-delete" @click.stop="handleDeleteConv(conv.id)" title="删除">×</button>
          </div>
        </div>
        <div v-if="conversations.length === 0" class="h-empty">还没有对话记录</div>
      </div>
    </aside>

    <!-- 右侧：主聊天窗口 -->
    <main class="chat-main">
      <header class="chat-header">
        <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="header-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          <span class="brand-title">星火助手</span>
        </div>
        <div class="header-actions">
          <button v-if="isStreaming" class="stop-btn" @click="stopGenerating" title="停止生成">
            ■ 停止
          </button>
        </div>
      </header>

      <!-- 消息区域 -->
      <div class="chat-scrollarea" ref="scrollRef">
        <!-- 空状态引导 -->
        <div class="empty-state" v-if="displayMessages.length === 0">
          <div class="ai-avatar-large">⚡</div>
          <h2>我是星火助手</h2>
          <p>你的 AI 学习伙伴，有什么问题尽管问我</p>
          <div class="quick-actions">
            <button v-for="q in quickStarters" :key="q.text" class="quick-btn" @click="handleQuickStart(q.text)">
              <span class="quick-icon">{{ q.icon }}</span>
              <span class="quick-text">{{ q.text }}</span>
            </button>
          </div>
        </div>

        <!-- 消息流 -->
        <div v-for="(msg, index) in displayMessages" :key="index" class="message-row" :class="msg.role">
          <!-- AI 头像 -->
          <div class="avatar" v-if="msg.role === 'assistant'">
            <span class="avatar-icon">⚡</span>
          </div>
          <!-- 消息气泡 -->
          <div class="bubble">
            <!-- AI 消息：Markdown 渲染 -->
            <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
            <!-- 用户消息：纯文本 -->
            <div v-else class="user-text">{{ msg.content }}</div>
            <!-- 打字光标 -->
            <div v-if="msg.role === 'assistant' && isStreaming && index === displayMessages.length - 1" class="typing-cursor"></div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="aiError" class="error-bar">
          <span>⚠️ {{ aiError }}</span>
          <button @click="retryLastMessage">重试</button>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="input-box" :class="{ focused: inputFocused }">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="给星火助手发送消息…"
            rows="1"
            @keydown="handleKeydown"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
            @input="autoResize"
          ></textarea>
          <button
            class="send-btn"
            @click="handleSend"
            :disabled="!inputText.trim() || isStreaming"
            :title="isStreaming ? '正在生成中...' : '发送消息'"
          >
            <svg v-if="!isStreaming" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span v-else class="loading-dots">···</span>
          </button>
        </div>
        <div class="footer-tip">由星火认知引擎提供支持，内容仅供参考 · <span class="msg-count">{{ displayMessages.length }} 条消息</span></div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useSparkAI } from '../../composables/useSparkAI'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

// ============ 星火 AI 引擎 ============
const {
  isStreaming,
  error: aiError,
  conversations,
  currentConversationId,
  createConversation,
  getCurrentConversation,
  switchConversation,
  deleteConversation,
  sendMessage,
  stopGenerating,
} = useSparkAI()

// ============ UI 状态 ============
const sidebarOpen = ref(false)
const inputText = ref('')
const inputFocused = ref(false)
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// 流式生成中的临时内容
const streamingContent = ref('')

// ============ Markdown 渲染配置 ============
const renderer = new marked.Renderer()

// 自定义代码块渲染（加高亮 + 复制按钮）
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${language}</span>
      <button class="code-copy" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(text)}'));this.textContent='已复制 ✓';setTimeout(()=>this.textContent='复制',1500)">复制</button>
    </div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`
}

marked.setOptions({
  renderer,
  breaks: true,
})

// 渲染 Markdown 为安全 HTML
function renderMarkdown(content: string): string {
  if (!content) return ''
  try {
    const raw = marked.parse(content) as string
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ['button'],
      ADD_ATTR: ['onclick'],
    })
  } catch {
    return DOMPurify.sanitize(content.replace(/\n/g, '<br>'))
  }
}

// ============ 快捷启动问题 ============
const quickStarters = [
  { icon: '💻', text: '帮我写一段 Python 快速排序算法' },
  { icon: '📝', text: '帮我润色一篇学术论文摘要' },
  { icon: '🎓', text: '讲解操作系统中进程与线程的区别' },
  { icon: '🔍', text: '帮我做一份 Vue3 学习路线规划' },
]

// ============ 当前会话的显示消息 ============
const displayMessages = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  const msgs = conv?.messages.filter(m => m.role !== 'system') || []

  // 如果正在流式生成，追加临时消息
  if (isStreaming.value && streamingContent.value) {
    return [...msgs, { role: 'assistant' as const, content: streamingContent.value }]
  }
  return msgs
})

// ============ 会话分组（按天） ============
const groupedConversations = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const week = today - 7 * 86400000

  const groups: { label: string; items: typeof conversations.value }[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '近7天', items: [] },
    { label: '更早', items: [] },
  ]

  for (const c of conversations.value) {
    const t = new Date(c.updatedAt).getTime()
    if (t >= today) groups[0].items.push(c)
    else if (t >= yesterday) groups[1].items.push(c)
    else if (t >= week) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
})

// ============ 发送消息 ============
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  inputText.value = ''
  streamingContent.value = ''

  // 如果没有当前会话，自动创建
  if (!currentConversationId.value) {
    createConversation()
  }

  // 重置 textarea 高度
  if (inputRef.value) inputRef.value.style.height = 'auto'

  await nextTick()
  scrollToBottom()

  await sendMessage(
    text,
    // onChunk: 流式更新
    (fullText) => {
      streamingContent.value = fullText
      scrollToBottom()
    },
    // onDone: 完成
    () => {
      streamingContent.value = ''
      scrollToBottom()
    },
    // onError: 错误
    () => {
      streamingContent.value = ''
    },
  )
}

// 快捷启动
function handleQuickStart(text: string) {
  inputText.value = text
  handleSend()
}

// 重试最后一条消息
function retryLastMessage() {
  const conv = getCurrentConversation()
  const lastUser = [...conv.messages].reverse().find(m => m.role === 'user')
  if (lastUser) {
    // 移除失败的回复
    const lastIdx = conv.messages.length - 1
    if (conv.messages[lastIdx]?.role === 'assistant') {
      conv.messages.pop()
    }
    inputText.value = lastUser.content
    conv.messages.pop() // 移除用户消息（sendMessage会重新添加）
    handleSend()
  }
}

// ============ 会话操作 ============
function handleNewChat() {
  createConversation()
  sidebarOpen.value = false
  streamingContent.value = ''
}

function handleSwitchConv(id: string) {
  if (isStreaming.value) return // 生成中不允许切换
  switchConversation(id)
  streamingContent.value = ''
  sidebarOpen.value = false
  nextTick(() => scrollToBottom())
}

function handleDeleteConv(id: string) {
  if (!confirm('确定删除这个对话？')) return
  deleteConversation(id)
}

// ============ 键盘事件 ============
function handleKeydown(e: KeyboardEvent) {
  // Enter 发送（Shift+Enter 换行）
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// textarea 自适应高度
function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

// ============ 生命周期 ============
onMounted(() => {
  // 如果没有任何会话，不自动创建（显示空状态引导）
  if (conversations.value.length > 0 && !currentConversationId.value) {
    currentConversationId.value = conversations.value[0].id
  }
  nextTick(() => scrollToBottom())
})

// 监听会话切换，滚动到底部
watch(currentConversationId, () => {
  nextTick(() => scrollToBottom())
})
</script>

<style scoped>
.chat-layout { display: flex; height: calc(100vh - 72px); width: 100%; }

/* ===== 侧边栏 ===== */
.chat-sidebar {
  width: 280px; background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; transition: transform 0.3s ease;
}
.sidebar-top { padding: 16px; }
.new-chat-btn {
  width: 100%; height: 44px; background: rgba(139,92,246,0.08);
  border: 1px solid rgba(139,92,246,0.15); border-radius: 10px;
  color: rgba(139,92,246,0.85); font-weight: 600; font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
}
.new-chat-btn:hover { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); }

.history-list { flex: 1; overflow-y: auto; padding: 0 8px 16px; }
.h-group { margin-bottom: 16px; }
.h-title { font-size: 11px; color: rgba(255,255,255,0.25); padding: 4px 12px; font-weight: 600; text-transform: uppercase; }
.h-item {
  display: flex; align-items: center; padding: 10px 12px; border-radius: 8px;
  color: rgba(255,255,255,0.5); font-size: 13px; cursor: pointer;
  transition: all 0.15s; margin-bottom: 1px;
}
.h-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }
.h-item.active { background: rgba(139,92,246,0.1); color: rgba(139,92,246,0.85); font-weight: 500; }
.h-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-delete {
  opacity: 0; background: none; border: none; color: rgba(255,255,255,0.3);
  font-size: 16px; cursor: pointer; padding: 0 4px; transition: opacity 0.15s;
}
.h-item:hover .h-delete { opacity: 1; }
.h-delete:hover { color: rgba(239,68,68,0.7); }
.h-empty { text-align: center; font-size: 12px; color: rgba(255,255,255,0.15); padding: 30px 0; }

/* ===== 主聊天区 ===== */
.chat-main { flex: 1; display: flex; flex-direction: column; background: var(--color-bg-secondary); position: relative; min-width: 0; }

.chat-header {
  height: 56px; border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0;
}
.mobile-menu-btn { display: none; background: transparent; border: none; font-size: 22px; color: white; cursor: pointer; }
.header-brand { display: flex; align-items: center; gap: 8px; }
.brand-title { font-size: 15px; font-weight: 700; background: linear-gradient(135deg,#8b5cf6,#3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.brand-badge { font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(139,92,246,0.12); color: rgba(139,92,246,0.6); font-weight: 700; letter-spacing: 0.5px; }
.stop-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.08); color: rgba(239,68,68,0.8);
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.stop-btn:hover { background: rgba(239,68,68,0.15); }

/* ===== 消息区域 ===== */
.chat-scrollarea {
  flex: 1; overflow-y: auto; padding: 32px 18%;
  display: flex; flex-direction: column; gap: 24px; scroll-behavior: smooth;
}
@media (max-width: 1200px) { .chat-scrollarea { padding: 32px 8%; } }
@media (max-width: 768px) {
  .chat-scrollarea { padding: 20px 16px; }
  .chat-sidebar { position: absolute; left: 0; z-index: 10; height: 100%; transform: translateX(-100%); }
  .chat-sidebar.is-open { transform: translateX(0); box-shadow: 10px 0 30px rgba(0,0,0,0.5); }
  .mobile-menu-btn { display: block; margin-right: 12px; }
}

/* 空状态 */
.empty-state { text-align: center; margin: auto 0; }
.ai-avatar-large { width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1)); display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; border: 1px solid rgba(139,92,246,0.12); }
.empty-state h2 { color: white; margin: 0 0 6px; font-size: 20px; }
.empty-state p { color: rgba(255,255,255,0.4); font-size: 14px; margin: 0 0 24px; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 560px; margin: 0 auto; }
.quick-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.5);
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.quick-btn:hover { background: rgba(139,92,246,0.06); border-color: rgba(139,92,246,0.15); color: rgba(255,255,255,0.7); }
.quick-icon { font-size: 16px; }

/* 消息行 */
.message-row { display: flex; gap: 14px; max-width: 100%; }
.message-row.user { justify-content: flex-end; }
.message-row.assistant { justify-content: flex-start; }

.avatar {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1));
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(139,92,246,0.12);
}
.avatar-icon { font-size: 16px; }

.bubble { max-width: 85%; min-width: 0; }
.message-row.user .bubble {
  background: rgba(139,92,246,0.08); padding: 12px 16px; border-radius: 14px 14px 4px 14px;
  border: 1px solid rgba(139,92,246,0.12);
}
.user-text { color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

/* Markdown 渲染样式 */
.markdown-body { color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.8; word-break: break-word; }
.markdown-body :deep(h1) { font-size: 20px; font-weight: 700; margin: 16px 0 8px; color: white; }
.markdown-body :deep(h2) { font-size: 17px; font-weight: 700; margin: 14px 0 6px; color: white; }
.markdown-body :deep(h3) { font-size: 15px; font-weight: 600; margin: 12px 0 4px; color: rgba(255,255,255,0.9); }
.markdown-body :deep(p) { margin: 0 0 10px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 6px 0 10px; padding-left: 20px; }
.markdown-body :deep(li) { margin-bottom: 4px; }
.markdown-body :deep(strong) { color: white; font-weight: 600; }
.markdown-body :deep(em) { color: rgba(255,255,255,0.7); }
.markdown-body :deep(a) { color: rgba(139,92,246,0.8); text-decoration: none; }
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(blockquote) {
  margin: 8px 0; padding: 8px 14px; border-left: 3px solid rgba(139,92,246,0.3);
  background: rgba(139,92,246,0.04); border-radius: 0 8px 8px 0; color: rgba(255,255,255,0.6);
}
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
.markdown-body :deep(th) { background: rgba(255,255,255,0.04); padding: 8px 12px; border: 1px solid rgba(255,255,255,0.06); text-align: left; font-weight: 600; color: rgba(255,255,255,0.7); }
.markdown-body :deep(td) { padding: 8px 12px; border: 1px solid rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); }

/* 行内代码 */
.markdown-body :deep(code:not(.hljs)) {
  padding: 2px 6px; border-radius: 4px; background: rgba(139,92,246,0.1);
  color: rgba(139,92,246,0.85); font-size: 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* 代码块 */
.markdown-body :deep(.code-block) {
  margin: 10px 0; border-radius: 10px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.3);
}
.markdown-body :deep(.code-header) {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 14px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.04);
}
.markdown-body :deep(.code-lang) { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; }
.markdown-body :deep(.code-copy) {
  background: none; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px;
  padding: 2px 8px; font-size: 11px; color: rgba(255,255,255,0.35); cursor: pointer; transition: all 0.15s;
}
.markdown-body :deep(.code-copy:hover) { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.15); }
.markdown-body :deep(pre) { margin: 0; padding: 14px; overflow-x: auto; }
.markdown-body :deep(pre code) { font-size: 13px; line-height: 1.6; font-family: 'JetBrains Mono', 'Fira Code', monospace; }

/* 打字光标 */
.typing-cursor {
  display: inline-block; width: 2px; height: 16px;
  background: rgba(139,92,246,0.7); margin-left: 2px;
  animation: blink 0.8s step-end infinite; vertical-align: text-bottom;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* 错误提示 */
.error-bar {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 10px 16px; border-radius: 10px; background: rgba(239,68,68,0.06);
  border: 1px solid rgba(239,68,68,0.12); color: rgba(239,68,68,0.7); font-size: 13px;
}
.error-bar button {
  padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(239,68,68,0.2);
  background: rgba(239,68,68,0.06); color: rgba(239,68,68,0.7); font-size: 12px;
  cursor: pointer; font-weight: 600; transition: all 0.15s;
}
.error-bar button:hover { background: rgba(239,68,68,0.12); }

/* ===== 输入区域 ===== */
.chat-input-area { padding: 0 18% 20px; flex-shrink: 0; }
@media (max-width: 1200px) { .chat-input-area { padding: 0 8% 20px; } }
@media (max-width: 768px) { .chat-input-area { padding: 0 16px 16px; } }

.input-box {
  background: var(--color-bg-primary); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 8px 12px; display: flex; align-items: flex-end; gap: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.2); transition: all 0.25s;
}
.input-box.focused { border-color: rgba(139,92,246,0.25); box-shadow: 0 6px 30px rgba(139,92,246,0.08); }

.input-box textarea {
  flex: 1; background: transparent; border: none; color: white;
  font-family: inherit; font-size: 14px; resize: none; padding: 8px 4px;
  outline: none; max-height: 200px; line-height: 1.5; min-height: 24px;
}
.input-box textarea::placeholder { color: rgba(255,255,255,0.2); }

.send-btn {
  width: 36px; height: 36px; border-radius: 10px; border: none;
  background: linear-gradient(135deg,#8b5cf6,#6d28d9); color: white;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
.send-btn:disabled { opacity: 0.3; cursor: default; background: rgba(255,255,255,0.06); }
.loading-dots { font-size: 16px; letter-spacing: 2px; animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

.footer-tip { text-align: center; color: rgba(255,255,255,0.15); font-size: 11px; margin-top: 8px; }
.msg-count { color: rgba(139,92,246,0.3); }
</style>
