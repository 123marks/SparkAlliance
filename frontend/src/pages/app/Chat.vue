<template>
  <div class="chat-layout" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <!-- 拖拽遮罩 -->
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-box">
        <div class="drop-icon">📎</div>
        <div class="drop-text">松开鼠标上传文件</div>
        <div class="drop-hint">支持文本、代码、图片等文件</div>
      </div>
    </div>

    <!-- 左侧：会话历史 -->
    <aside class="chat-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="sidebar-top">
        <button class="new-chat-btn" @click="handleNewChat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新对话
        </button>
      </div>
      <div class="history-list">
        <div v-for="group in groupedConversations" :key="group.label" class="h-group">
          <div class="h-title">{{ group.label }}</div>
          <div v-for="conv in group.items" :key="conv.id"
            class="h-item" :class="{ active: conv.id === currentConversationId }"
            @click="handleSwitchConv(conv.id)">
            <span class="h-text">{{ conv.title }}</span>
            <button class="h-delete" @click.stop="handleDeleteConv(conv.id)">×</button>
          </div>
        </div>
        <div v-if="conversations.length === 0" class="h-empty">
          <span class="h-empty-icon">💬</span>
          <span>开始你的第一次对话</span>
        </div>
      </div>
    </aside>

    <!-- 右侧：主区域 -->
    <main class="chat-main">
      <!-- 顶栏 -->
      <header class="chat-header">
        <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="header-brand">
          <div class="brand-avatar">⚡</div>
          <div class="brand-info">
            <span class="brand-title">星火助手</span>
            <span class="brand-sub">Spark Alliance · AI</span>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="isStreaming" class="stop-btn" @click="stopGenerating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            停止
          </button>
        </div>
      </header>

      <!-- 模块同步提示横幅 -->
      <div class="sync-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span>我可以帮你将内容同步到 <strong>智能日程</strong>、<strong>星火规划</strong> 等模块 — 试着告诉我你的目标</span>
      </div>

      <!-- 消息区域 -->
      <div class="chat-scrollarea" ref="scrollRef">
        <!-- 空状态 -->
        <div class="empty-state" v-if="displayMessages.length === 0 && !isStreaming">
          <div class="empty-hero">
            <div class="empty-avatar">⚡</div>
            <h2>你好，我是星火助手</h2>
            <p>我能帮你规划学习、管理日程、分析文件，并直接同步到平台各模块</p>
          </div>
          <div class="quick-grid">
            <button v-for="q in quickStarters" :key="q.text" class="quick-card" @click="handleQuickStart(q.text)">
              <span class="qc-icon">{{ q.icon }}</span>
              <span class="qc-title">{{ q.title }}</span>
              <span class="qc-desc">{{ q.text }}</span>
            </button>
          </div>
          <div class="network-hint">
            <span>💡 提示：首次对话可能需要 5-15 秒建立连接</span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, index) in displayMessages" :key="index" class="message-row" :class="msg.role">
          <div class="avatar" v-if="msg.role === 'assistant'"><span>⚡</span></div>
          <div class="bubble">
            <!-- 附件预览 -->
            <div v-if="msg.attachments?.length" class="att-list">
              <div v-for="(att, i) in msg.attachments" :key="i" class="att-chip">
                <span class="att-icon">{{ att.type === 'image' ? '🖼️' : '📄' }}</span>
                <span class="att-name">{{ att.name }}</span>
              </div>
            </div>
            <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
            <div v-else class="user-text">{{ msg.content }}</div>
            <span v-if="msg.role === 'assistant' && isStreaming && index === displayMessages.length - 1" class="typing-cursor"></span>
          </div>
        </div>

        <!-- 思考状态指示器 -->
        <div v-if="isStreaming && (currentPhase === 'connecting' || currentPhase === 'thinking')" class="thinking-row">
          <div class="avatar"><span>⚡</span></div>
          <div class="thinking-bubble">
            <div class="thinking-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="thinking-text">
              {{ currentPhase === 'connecting' ? '正在连接服务器...' : '星火助手正在思考...' }}
            </span>
          </div>
        </div>

        <!-- 操作确认面板 -->
        <div v-if="actionCards.length > 0" class="action-panel">
          <div class="action-title">🎯 星火操作建议</div>
          <div v-for="(ac, i) in actionCards" :key="i" class="action-card">
            <div class="ac-icon">{{ ac.icon }}</div>
            <div class="ac-info">
              <div class="ac-label">{{ ac.label }}</div>
              <div class="ac-desc">{{ ac.desc }}</div>
            </div>
            <div class="ac-btns">
              <button class="ac-confirm" @click="executeAction(ac.action)" :disabled="ac.done">
                {{ ac.done ? '✓ 已同步' : '同步执行' }}
              </button>
              <button class="ac-dismiss" @click="dismissAction(i)" v-if="!ac.done">忽略</button>
            </div>
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
        <!-- 附件预览条 -->
        <div v-if="pendingFiles.length > 0" class="pending-files">
          <div v-for="(f, i) in pendingFiles" :key="i" class="pf-item">
            <span class="pf-icon">{{ f.type === 'image' ? '🖼️' : '📄' }}</span>
            <span class="pf-name">{{ f.name }}</span>
            <button class="pf-remove" @click="pendingFiles.splice(i, 1)">×</button>
          </div>
        </div>

        <div class="input-box" :class="{ focused: inputFocused }">
          <div class="input-tools">
            <button class="tool-btn" @click="fileInput?.click()" title="上传文件（也可拖拽）">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button class="tool-btn" :class="{ recording: isRecording }" @click="toggleVoice" title="语音输入">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
          </div>
          <input ref="fileInput" type="file" multiple accept=".txt,.md,.py,.js,.ts,.json,.csv,.html,.css,.vue,.java,.c,.cpp,.pdf,image/*" @change="handleFileUpload" style="display:none">
          <textarea
            ref="inputRef" v-model="inputText"
            :placeholder="isRecording ? '🎙️ 正在听你说...' : '描述你的需求，我来帮你执行...'"
            rows="1" @keydown="handleKeydown" @focus="inputFocused = true"
            @blur="inputFocused = false" @input="autoResize"
          ></textarea>
          <button class="send-btn" @click="handleSend" :disabled="(!inputText.trim() && !pendingFiles.length) || isStreaming">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="footer-tip">星火认知引擎 · 支持文件拖拽 / 语音输入 · 可同步日程与规划</div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSparkAI, parseSparkActions } from '../../composables/useSparkAI'
import type { SparkAction, ChatMessage, StreamPhase } from '../../composables/useSparkAI'
import { useSchedule } from '../../composables/useSchedule'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const router = useRouter()

// ============ AI 引擎 ============
const {
  isStreaming, streamPhase, error: aiError, conversations, currentConversationId,
  createConversation, getCurrentConversation, switchConversation,
  deleteConversation, sendMessage, stopGenerating,
} = useSparkAI()

const { createEvent } = useSchedule()

// ============ UI 状态 ============
const sidebarOpen = ref(false)
const inputText = ref('')
const inputFocused = ref(false)
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const streamingContent = ref('')
const isRecording = ref(false)
const isDragging = ref(false)
const currentPhase = ref<StreamPhase>('idle')
const pendingFiles = ref<{ name: string; type: 'image' | 'file'; content?: string; url?: string }[]>([])

interface ActionCard { icon: string; label: string; desc: string; action: SparkAction; done: boolean }
const actionCards = ref<ActionCard[]>([])

// ============ 拖拽上传 ============
let dragCounter = 0
function onDragOver() { isDragging.value = true }
function onDragLeave() { dragCounter--; if (dragCounter <= 0) { isDragging.value = false; dragCounter = 0 } }
function onDrop(e: DragEvent) {
  isDragging.value = false; dragCounter = 0
  const files = e.dataTransfer?.files
  if (files) processFiles(files)
}

// ============ Markdown 渲染 ============
const renderer = new marked.Renderer()
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<div class="code-block"><div class="code-header"><span class="code-lang">${language}</span><button class="code-copy" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(text)}'));this.textContent='已复制 ✓';setTimeout(()=>this.textContent='复制',1500)">复制</button></div><pre><code class="hljs language-${language}">${highlighted}</code></pre></div>`
}
marked.setOptions({ renderer, breaks: true })

function renderMarkdown(content: string): string {
  if (!content) return ''
  const cleaned = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
  if (!cleaned) return ''
  try {
    return DOMPurify.sanitize(marked.parse(cleaned) as string, { ADD_TAGS: ['button'], ADD_ATTR: ['onclick'] })
  } catch { return DOMPurify.sanitize(cleaned.replace(/\n/g, '<br>')) }
}

// ============ 快捷启动 ============
const quickStarters = [
  { icon: '📅', title: '备考规划', text: '帮我制定英语四级复习计划，并同步到星火规划' },
  { icon: '💻', title: '编程助手', text: '帮我写一个 Vue 3 的登录表单组件' },
  { icon: '📝', title: '文件分析', text: '分析我上传的文件内容并给出建议' },
  { icon: '🎯', title: '目标管理', text: '帮我拆解"30天学会Python"的学习计划' },
]

// ============ 显示消息 ============
const displayMessages = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  const msgs = conv?.messages.filter(m => m.role !== 'system') || []
  if (isStreaming.value && streamingContent.value) {
    return [...msgs, { role: 'assistant' as const, content: streamingContent.value }]
  }
  return msgs
})

const groupedConversations = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000; const week = today - 7 * 86400000
  const groups: { label: string; items: typeof conversations.value }[] = [
    { label: '今天', items: [] }, { label: '昨天', items: [] },
    { label: '近7天', items: [] }, { label: '更早', items: [] },
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
  if ((!text && !pendingFiles.value.length) || isStreaming.value) return

  const attachments: ChatMessage['attachments'] = pendingFiles.value.map(f => ({
    type: f.type, name: f.name, content: f.content, url: f.url,
  }))

  inputText.value = ''; streamingContent.value = ''; actionCards.value = []; pendingFiles.value = []
  if (inputRef.value) inputRef.value.style.height = 'auto'
  if (!currentConversationId.value) createConversation()

  await nextTick(); scrollToBottom()

  await sendMessage(
    text,
    (fullText) => { streamingContent.value = fullText; scrollToBottom() },
    (_cleanText, actions) => {
      streamingContent.value = ''
      if (actions.length > 0) {
        actionCards.value = actions.map(a => ({
          icon: a.action === 'add_schedule' ? '📅' : a.action === 'create_goal' ? '🎯' : '🔗',
          label: a.action === 'add_schedule' ? '同步到日程' : a.action === 'create_goal' ? '创建规划目标' : '跳转页面',
          desc: String(a.data.title || a.data.label || a.data.path || ''),
          action: a, done: false,
        }))
      }
      scrollToBottom()
    },
    () => { streamingContent.value = '' },
    (phase) => { currentPhase.value = phase; scrollToBottom() },
    attachments.length > 0 ? attachments : undefined,
  )
}

// ============ 执行操作 ============
async function executeAction(action: SparkAction) {
  try {
    switch (action.action) {
      case 'add_schedule':
        await createEvent({
          title: String(action.data.title || ''), description: String(action.data.description || ''),
          location: '', start_time: String(action.data.start_time || new Date().toISOString()),
          end_time: String(action.data.end_time || ''), all_day: false,
          event_type: (action.data.event_type as 'task') || 'task', event_subtype: '', color: '',
          recurrence_type: 'none', recurrence_days: [], recurrence_end: '', reminders: [],
          priority: Number(action.data.priority) || 1,
        })
        break
      case 'create_goal':
        router.push('/app/schedule')
        break
      case 'navigate':
        router.push(String(action.data.path || '/app/home'))
        break
    }
    const card = actionCards.value.find(c => c.action === action)
    if (card) card.done = true
  } catch (e) { console.error('操作执行失败:', e) }
}

function dismissAction(index: number) { actionCards.value.splice(index, 1) }

// ============ 文件处理 ============
function processFiles(files: FileList) {
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      pendingFiles.value.push({ name: file.name, type: 'image', url: URL.createObjectURL(file) })
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        pendingFiles.value.push({
          name: file.name, type: 'file',
          content: content.slice(0, 8000) + (content.length > 8000 ? '\n...(内容已截断)' : ''),
        })
      }
      reader.readAsText(file)
    }
  }
}
function handleFileUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) processFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

// ============ 语音输入 ============
let recognition: any = null
function toggleVoice() {
  if (isRecording.value) { recognition?.stop(); isRecording.value = false; return }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { alert('当前浏览器不支持语音输入，请使用 Chrome/Edge'); return }
  recognition = new SR(); recognition.lang = 'zh-CN'; recognition.continuous = true; recognition.interimResults = true
  recognition.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; inputText.value = t }
  recognition.onerror = () => { isRecording.value = false }
  recognition.onend = () => { isRecording.value = false }
  recognition.start(); isRecording.value = true
}

// ============ 辅助 ============
function handleQuickStart(text: string) { inputText.value = text; handleSend() }
function retryLastMessage() {
  const conv = getCurrentConversation(); const last = [...conv.messages].reverse().find(m => m.role === 'user')
  if (last) { const idx = conv.messages.length - 1; if (conv.messages[idx]?.role === 'assistant') conv.messages.pop(); inputText.value = last.content; conv.messages.pop(); handleSend() }
}
function handleNewChat() { createConversation(); sidebarOpen.value = false; streamingContent.value = ''; actionCards.value = [] }
function handleSwitchConv(id: string) { if (isStreaming.value) return; switchConversation(id); streamingContent.value = ''; actionCards.value = []; sidebarOpen.value = false; nextTick(() => scrollToBottom()) }
function handleDeleteConv(id: string) { if (!confirm('确定删除？')) return; deleteConversation(id) }
function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
function autoResize() { const el = inputRef.value; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' }
function scrollToBottom() { nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight }) }

onMounted(() => {
  if (conversations.value.length > 0 && !currentConversationId.value) currentConversationId.value = conversations.value[0].id
  nextTick(() => scrollToBottom())
})
watch(currentConversationId, () => nextTick(() => scrollToBottom()))
</script>

<style scoped>
.chat-layout { display: flex; height: calc(100vh - 72px); width: 100%; background: #0a0814; position: relative; }

/* 拖拽遮罩 */
.drop-overlay { position: absolute; inset: 0; z-index: 100; background: rgba(139,92,246,0.06); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
.drop-box { text-align: center; padding: 40px 60px; border: 2px dashed rgba(139,92,246,0.3); border-radius: 20px; background: rgba(139,92,246,0.03); }
.drop-icon { font-size: 48px; margin-bottom: 12px; }
.drop-text { font-size: 18px; font-weight: 700; color: rgba(139,92,246,0.8); }
.drop-hint { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 6px; }

/* 侧边栏 */
.chat-sidebar { width: 260px; background: rgba(8,6,18,0.98); border-right: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; flex-shrink: 0; transition: transform 0.3s ease; }
.sidebar-top { padding: 12px; }
.new-chat-btn { width: 100%; height: 40px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); border-radius: 10px; color: rgba(139,92,246,0.7); font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s; }
.new-chat-btn:hover { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.2); }
.history-list { flex: 1; overflow-y: auto; padding: 0 6px 12px; }
.history-list::-webkit-scrollbar { width: 2px; }
.history-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); }
.h-group { margin-bottom: 8px; }
.h-title { font-size: 10px; color: rgba(255,255,255,0.15); padding: 6px 10px 2px; font-weight: 700; letter-spacing: 1px; }
.h-item { display: flex; align-items: center; padding: 8px 10px; border-radius: 8px; color: rgba(255,255,255,0.35); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.h-item:hover { background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.5); }
.h-item.active { background: rgba(139,92,246,0.06); color: rgba(139,92,246,0.75); }
.h-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-delete { opacity: 0; background: none; border: none; color: rgba(255,255,255,0.15); font-size: 16px; cursor: pointer; padding: 0 4px; }
.h-item:hover .h-delete { opacity: 1; }
.h-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 0; color: rgba(255,255,255,0.1); font-size: 12px; }
.h-empty-icon { font-size: 24px; }

/* 主区域 */
.chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-header { height: 48px; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; flex-shrink: 0; }
.mobile-menu-btn { display: none; background: transparent; border: none; font-size: 20px; color: white; cursor: pointer; }
.header-brand { display: flex; align-items: center; gap: 10px; }
.brand-avatar { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.12)); display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1px solid rgba(139,92,246,0.08); }
.brand-info { display: flex; flex-direction: column; }
.brand-title { font-size: 14px; font-weight: 700; color: white; }
.brand-sub { font-size: 10px; color: rgba(255,255,255,0.18); }
.stop-btn { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.15); background: rgba(239,68,68,0.05); color: rgba(239,68,68,0.6); font-size: 12px; font-weight: 600; cursor: pointer; }

/* 模块同步提示横幅 */
.sync-banner { display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: linear-gradient(90deg, rgba(139,92,246,0.04), rgba(59,130,246,0.03)); border-bottom: 1px solid rgba(139,92,246,0.04); font-size: 11px; color: rgba(255,255,255,0.3); flex-shrink: 0; }
.sync-banner strong { color: rgba(139,92,246,0.5); }
.sync-banner svg { color: rgba(139,92,246,0.3); flex-shrink: 0; }

/* 消息区 */
.chat-scrollarea { flex: 1; overflow-y: auto; padding: 20px 16%; display: flex; flex-direction: column; gap: 18px; scroll-behavior: smooth; }
.chat-scrollarea::-webkit-scrollbar { width: 3px; }
.chat-scrollarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 3px; }
@media (max-width: 1200px) { .chat-scrollarea { padding: 20px 6%; } }
@media (max-width: 768px) {
  .chat-scrollarea { padding: 16px 12px; }
  .chat-sidebar { position: absolute; left: 0; z-index: 10; height: 100%; transform: translateX(-100%); }
  .chat-sidebar.is-open { transform: translateX(0); box-shadow: 10px 0 30px rgba(0,0,0,0.5); }
  .mobile-menu-btn { display: block; margin-right: 8px; }
}

/* 空状态 */
.empty-state { margin: auto 0; }
.empty-hero { text-align: center; margin-bottom: 24px; }
.empty-avatar { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.08)); display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 12px; border: 1px solid rgba(139,92,246,0.06); }
.empty-hero h2 { color: white; font-size: 18px; margin: 0 0 6px; font-weight: 700; }
.empty-hero p { color: rgba(255,255,255,0.25); font-size: 13px; line-height: 1.5; margin: 0; }
.quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-width: 480px; margin: 0 auto; }
.quick-card { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01); text-align: left; cursor: pointer; transition: all 0.2s; }
.quick-card:hover { background: rgba(139,92,246,0.03); border-color: rgba(139,92,246,0.08); }
.qc-icon { font-size: 18px; }
.qc-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); }
.qc-desc { font-size: 10px; color: rgba(255,255,255,0.2); line-height: 1.3; }
.network-hint { text-align: center; margin-top: 18px; font-size: 11px; color: rgba(255,255,255,0.12); }
@media (max-width: 560px) { .quick-grid { grid-template-columns: 1fr; } }

/* 消息行 */
.message-row { display: flex; gap: 10px; max-width: 100%; }
.message-row.user { justify-content: flex-end; }
.avatar { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.08)); display: flex; align-items: center; justify-content: center; font-size: 13px; border: 1px solid rgba(139,92,246,0.06); margin-top: 2px; }
.bubble { max-width: 82%; min-width: 0; }
.message-row.user .bubble { background: rgba(139,92,246,0.05); padding: 10px 14px; border-radius: 14px 14px 4px 14px; border: 1px solid rgba(139,92,246,0.06); }
.user-text { color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

/* 思考状态 */
.thinking-row { display: flex; gap: 10px; }
.thinking-bubble { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 12px; background: rgba(139,92,246,0.02); border: 1px solid rgba(139,92,246,0.04); }
.thinking-dots { display: flex; gap: 4px; }
.thinking-dots span { width: 6px; height: 6px; border-radius: 50%; background: rgba(139,92,246,0.3); animation: thinking-bounce 1.4s infinite ease-in-out; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes thinking-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 0.8; } }
.thinking-text { font-size: 12px; color: rgba(139,92,246,0.4); font-style: italic; }

/* 附件 */
.att-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.att-chip { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; background: rgba(139,92,246,0.04); border: 1px solid rgba(139,92,246,0.06); font-size: 10px; color: rgba(255,255,255,0.4); }
.att-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 操作面板 */
.action-panel { margin-top: 4px; }
.action-title { font-size: 11px; font-weight: 700; color: rgba(139,92,246,0.4); margin-bottom: 6px; }
.action-card { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: rgba(139,92,246,0.02); border: 1px solid rgba(139,92,246,0.06); margin-bottom: 6px; transition: all 0.2s; }
.action-card:hover { background: rgba(139,92,246,0.04); }
.ac-icon { font-size: 22px; }
.ac-info { flex: 1; }
.ac-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); }
.ac-desc { font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 1px; }
.ac-btns { display: flex; gap: 4px; }
.ac-confirm { padding: 4px 12px; border-radius: 6px; border: none; background: linear-gradient(135deg,#8b5cf6,#6d28d9); color: white; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.ac-confirm:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 3px 10px rgba(139,92,246,0.2); }
.ac-confirm:disabled { opacity: 0.5; background: rgba(255,255,255,0.05); cursor: default; }
.ac-dismiss { padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.04); background: none; color: rgba(255,255,255,0.2); font-size: 11px; cursor: pointer; }

/* Markdown */
.markdown-body { color: rgba(255,255,255,0.82); font-size: 14px; line-height: 1.75; word-break: break-word; }
.markdown-body :deep(h1) { font-size: 18px; font-weight: 700; margin: 12px 0 6px; color: white; }
.markdown-body :deep(h2) { font-size: 16px; font-weight: 700; margin: 10px 0 4px; color: white; }
.markdown-body :deep(h3) { font-size: 14px; font-weight: 600; margin: 8px 0 4px; color: rgba(255,255,255,0.9); }
.markdown-body :deep(p) { margin: 0 0 8px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 4px 0 8px; padding-left: 18px; }
.markdown-body :deep(li) { margin-bottom: 2px; }
.markdown-body :deep(strong) { color: white; font-weight: 600; }
.markdown-body :deep(a) { color: rgba(139,92,246,0.7); text-decoration: none; }
.markdown-body :deep(blockquote) { margin: 6px 0; padding: 6px 12px; border-left: 3px solid rgba(139,92,246,0.15); background: rgba(139,92,246,0.02); border-radius: 0 6px 6px 0; color: rgba(255,255,255,0.45); }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
.markdown-body :deep(th) { background: rgba(255,255,255,0.02); padding: 6px 10px; border: 1px solid rgba(255,255,255,0.03); text-align: left; font-weight: 600; }
.markdown-body :deep(td) { padding: 6px 10px; border: 1px solid rgba(255,255,255,0.02); }
.markdown-body :deep(code:not(.hljs)) { padding: 1px 5px; border-radius: 4px; background: rgba(139,92,246,0.06); color: rgba(139,92,246,0.75); font-size: 12px; font-family: 'JetBrains Mono','Fira Code',monospace; }
.markdown-body :deep(.code-block) { margin: 8px 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.03); background: rgba(0,0,0,0.25); }
.markdown-body :deep(.code-header) { display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; background: rgba(255,255,255,0.015); border-bottom: 1px solid rgba(255,255,255,0.02); }
.markdown-body :deep(.code-lang) { font-size: 10px; color: rgba(255,255,255,0.15); font-weight: 700; text-transform: uppercase; }
.markdown-body :deep(.code-copy) { background: none; border: 1px solid rgba(255,255,255,0.04); border-radius: 4px; padding: 1px 6px; font-size: 10px; color: rgba(255,255,255,0.2); cursor: pointer; }
.markdown-body :deep(pre) { margin: 0; padding: 10px; overflow-x: auto; }
.markdown-body :deep(pre code) { font-size: 12px; line-height: 1.6; font-family: 'JetBrains Mono','Fira Code',monospace; }

.typing-cursor { display: inline-block; width: 2px; height: 14px; background: rgba(139,92,246,0.5); margin-left: 2px; animation: blink 0.8s step-end infinite; vertical-align: text-bottom; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* 错误 */
.error-bar { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 14px; border-radius: 10px; background: rgba(239,68,68,0.03); border: 1px solid rgba(239,68,68,0.06); color: rgba(239,68,68,0.5); font-size: 12px; }
.error-bar button { padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(239,68,68,0.1); background: rgba(239,68,68,0.03); color: rgba(239,68,68,0.5); font-size: 11px; cursor: pointer; font-weight: 600; }

/* 输入区 */
.chat-input-area { padding: 0 16% 14px; flex-shrink: 0; }
@media (max-width: 1200px) { .chat-input-area { padding: 0 6% 14px; } }
@media (max-width: 768px) { .chat-input-area { padding: 0 12px 12px; } }
.pending-files { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.pf-item { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: rgba(139,92,246,0.04); border: 1px solid rgba(139,92,246,0.08); font-size: 11px; color: rgba(255,255,255,0.4); }
.pf-remove { background: none; border: none; color: rgba(255,255,255,0.2); cursor: pointer; font-size: 14px; padding: 0 2px; }
.input-box { background: rgba(12,10,24,0.95); border: 1px solid rgba(255,255,255,0.04); border-radius: 14px; padding: 6px 8px; display: flex; align-items: flex-end; gap: 4px; transition: all 0.25s; }
.input-box.focused { border-color: rgba(139,92,246,0.15); box-shadow: 0 0 0 3px rgba(139,92,246,0.03); }
.input-tools { display: flex; gap: 2px; padding-bottom: 4px; }
.tool-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.tool-btn:hover { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.4); }
.tool-btn.recording { color: rgba(239,68,68,0.7); background: rgba(239,68,68,0.06); animation: pulse-rec 1.5s infinite; }
@keyframes pulse-rec { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 0 3px rgba(239,68,68,0.08); } }
.input-box textarea { flex: 1; background: transparent; border: none; color: white; font-family: inherit; font-size: 14px; resize: none; padding: 8px 4px; outline: none; max-height: 200px; line-height: 1.5; min-height: 24px; }
.input-box textarea::placeholder { color: rgba(255,255,255,0.12); }
.send-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: linear-gradient(135deg,#8b5cf6,#6d28d9); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; margin-bottom: 2px; }
.send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(139,92,246,0.25); }
.send-btn:disabled { opacity: 0.15; cursor: default; background: rgba(255,255,255,0.03); }
.footer-tip { text-align: center; color: rgba(255,255,255,0.08); font-size: 10px; margin-top: 5px; }
</style>
