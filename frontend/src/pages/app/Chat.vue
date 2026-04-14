<template>
  <div class="chat-layout" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
    <!-- 宇宙深空动态背景 -->
    <!-- 拖拽遮罩 -->
    <Transition name="fade">
      <div v-if="isDragging" class="drop-overlay"><div class="drop-box"><div class="drop-icon">📎</div><div class="drop-text">松开即可上传</div><div class="drop-hint">支持文本、代码、图片等文件</div></div></div>
    </Transition>
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="showToast" class="toast">{{ toastMsg }}</div>
    </Transition>

    <!-- 侧边栏 -->
    <aside class="chat-sidebar" :class="{ open: sidebarOpen }">
      <div class="sb-top"><button class="new-btn" @click="handleNewChat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新对话</button></div>
      <div class="sb-list">
        <div v-for="g in groupedConvs" :key="g.label" class="sb-group">
          <div class="sb-label">{{ g.label }}</div>
          <div v-for="c in g.items" :key="c.id" class="sb-item" :class="{ active: c.id === currentConversationId }" @click="handleSwitch(c.id)">
            <span class="sb-text">{{ c.title }}</span><button class="sb-del" @click.stop="handleDelete(c.id)">×</button>
          </div>
        </div>
        <div v-if="conversations.length === 0" class="sb-empty">开始你的第一次对话</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <main class="chat-main">
      <header class="top-bar">
        <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="top-brand"><span class="top-icon pulse">⚡</span><span class="top-title">星火助手</span></div>
        <div class="top-right"></div>
      </header>

      <!-- 消息区 -->
      <div class="msgs" ref="scrollRef">
        <div v-if="displayMsgs.length === 0 && !isStreaming" class="empty">
          <div class="empty-icon">⚡</div>
          <h2>你好，我是星火助手</h2>
          <p>我深度理解 Spark Alliance 每个功能模块，能帮你管理日程、制定规划、辅导学习、解题答疑</p>
          <div class="quick-grid">
            <button v-for="q in starters" :key="q.t" class="qcard" @click="handleQuick(q.t)">
              <span class="qi">{{ q.i }}</span><span class="qt">{{ q.l }}</span><span class="qd">{{ q.t }}</span>
            </button>
          </div>
        </div>

        <template v-for="(msg, idx) in displayMsgs" :key="idx">
          <div class="msg-row" :class="msg.role">
            <div v-if="msg.role === 'assistant'" class="av">⚡</div>
            <div class="msg-content">
              <div v-if="msg.attachments?.length" class="file-cards">
                <div v-for="(a, i) in msg.attachments" :key="i" class="file-card"><div class="fc-icon">{{ a.type === 'image' ? '🖼️' : '📄' }}</div><div class="fc-info"><div class="fc-name">{{ a.name }}</div><div class="fc-size">{{ a.size }}</div></div></div>
              </div>
              <div v-if="msg.role === 'user'" class="user-bubble"><div class="u-text">{{ msg.displayContent || msg.content }}</div></div>
              <div v-if="msg.role === 'user' && !isStreaming" class="msg-acts user-acts">
                <button @click="copyText(msg.content)" title="复制"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button @click="editMessage(idx)" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              </div>
              <!-- 思考过程 -->
              <div v-if="msg.role === 'assistant' && (msg.reasoning || (isStreaming && idx === displayMsgs.length - 1 && thinkingText))" class="think-block">
                <button class="think-toggle" @click="collapsedThinking[idx] = !collapsedThinking[idx]">
                  <span class="think-status" :class="{ spinning: isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' }">💭</span>
                  <span>{{ isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' ? '正在思考...' : '思考过程' }}</span>
                  <svg class="think-chevron" :class="{ collapsed: collapsedThinking[idx] }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div v-show="!collapsedThinking[idx]" class="think-body">{{ msg.reasoning || thinkingText }}</div>
              </div>
              <div v-if="msg.role === 'assistant' && isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' && !msg.content && !msg.reasoning && !thinkingText" class="think-block">
                <div class="think-toggle"><span class="think-status spinning">💭</span><span>正在思考...</span></div>
                <div class="think-dots"><span></span><span></span><span></span></div>
              </div>
              <!-- AI 回复（含导航链接渲染） -->
              <div v-if="msg.role === 'assistant' && msg.content" class="md-body" v-html="renderMd(msg.content)" @click="handleMdClick"></div>
              <span v-if="msg.role === 'assistant' && isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'streaming'" class="cursor"></span>
              <div v-if="msg.role === 'assistant' && !isStreaming && msg.content" class="msg-acts">
                <button @click="copyText(msg.content)" title="复制"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button @click="retryFrom(idx)" title="重新回答"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>
              </div>
            </div>
          </div>
        </template>

        <!-- 操作卡片 -->
        <div v-if="actionCards.length" class="act-panel">
          <div class="act-title">🎯 可同步操作</div>
          <div v-for="(a, i) in actionCards" :key="i" class="act-card">
            <span class="act-icon">{{ a.icon }}</span>
            <div class="act-info"><div class="act-label">{{ a.label }}</div><div class="act-desc">{{ a.desc }}</div></div>
            <button class="act-btn" :disabled="a.done" @click="execAction(a.action)">{{ a.done ? '✓ 已同步' : '同步执行' }}</button>
            <button v-if="!a.done" class="act-skip" @click="actionCards.splice(i,1)">忽略</button>
          </div>
        </div>
        <div v-if="aiError" class="err-bar"><span>⚠️ {{ aiError }}</span><button @click="retryLast">重试</button></div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <div v-if="pendingFiles.length" class="pf-list">
          <div v-for="(f, i) in pendingFiles" :key="i" class="pf-chip">
            <img v-if="f.type === 'image' && f.url" :src="f.url" class="pf-thumb"><span v-else class="pf-ficon">📄</span>
            <span class="pf-name">{{ f.name }}</span><button class="pf-x" @click="pendingFiles.splice(i,1)">×</button>
          </div>
        </div>
        <div class="ibox" :class="{ focus: iFocus }">
          <div class="itools">
            <button class="itool" @click="fileInput?.click()" title="上传文件"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
            <button class="itool" :class="{ rec: isRec }" @click="toggleVoice" title="语音"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>
          </div>
          <input ref="fileInput" type="file" multiple accept="*/*" @change="onFileInput" style="display:none">
          <textarea ref="inputRef" v-model="inputText" :placeholder="isRec ? '🎙️ 正在听...' : '输入你的问题...'" rows="1" @keydown="onKey" @focus="iFocus=true" @blur="iFocus=false" @input="autoResize" @paste="onPaste"></textarea>
          <button v-if="isStreaming" class="send stop-mode" @click="stopGenerating" title="停止"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
          <button v-else class="send" :disabled="!inputText.trim() && !pendingFiles.length" @click="handleSend" title="发送"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </div>
        <!-- 能力工具栏 + 模型选择器（参考DeepSeek设计，在输入框下方） -->
        <div class="ability-bar">
          <div class="ab-left">
            <button v-for="(opt, key) in MODEL_OPTIONS" :key="key" class="ab-model" :class="{ active: currentModel === key }" @click="switchModel(key as ModelMode)">
              <span class="ab-dot" :class="key"></span>{{ opt.label }}
            </button>
          </div>
          <div class="ab-divider"></div>
          <div class="ab-tools">
            <button v-for="t in ABILITY_TOOLS" :key="t.key" class="ab-tool" @click="activateAbility(t)">
              <span>{{ t.icon }}</span><span>{{ t.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSparkAI, MODEL_OPTIONS, ABILITY_TOOLS, isBinaryFile, formatFileSize } from '../../composables/useSparkAI'
import type { SparkAction, FileAttachment, ModelMode } from '../../composables/useSparkAI'
import { useSchedule } from '../../composables/useSchedule'
import { usePlanner } from '../../composables/usePlanner'
import { resolveAssistantLocation } from '../../utils/assistantProtocol'
import { marked } from 'marked'
import hljs from 'highlight.js'
import katex from 'katex'
import DOMPurify from 'dompurify'

const router = useRouter()
const { isStreaming, streamPhase, error: aiError, currentModel, conversations, currentConversationId, createConversation, getCurrentConversation, switchConversation, deleteConversation, sendMessage, stopGenerating } = useSparkAI()
const { createEvent } = useSchedule()
const { createGoal } = usePlanner()

const sidebarOpen = ref(false)
const inputText = ref('')
const iFocus = ref(false)
const scrollRef = ref<HTMLElement|null>(null)
const inputRef = ref<HTMLTextAreaElement|null>(null)
const fileInput = ref<HTMLInputElement|null>(null)
const streamingContent = ref('')
const thinkingText = ref('')
const isRec = ref(false)
const isDragging = ref(false)
const showToast = ref(false)
const toastMsg = ref('')
const collapsedThinking = reactive<Record<number, boolean>>({})
const pendingFiles = ref<FileAttachment[]>([])
interface ACard { icon:string; label:string; desc:string; action:SparkAction; done:boolean }
const actionCards = ref<ACard[]>([])

// 模型切换
function switchModel(key: ModelMode) {
  if (currentModel.value === key) return
  currentModel.value = key; const opt = MODEL_OPTIONS[key]
  toastMsg.value = `已切换为 ${opt.icon} ${opt.label} 模式`; showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

// 能力工具栏点击
function activateAbility(t: (typeof ABILITY_TOOLS)[number]) {
  inputText.value = t.prompt
  nextTick(() => inputRef.value?.focus())
}

// 拖拽
let dragCount = 0
function onDragEnter(e: DragEvent) { e.preventDefault(); dragCount++; isDragging.value = true }
function onDragLeave() { dragCount--; if (dragCount <= 0) { isDragging.value = false; dragCount = 0 } }
function onDrop(e: DragEvent) { isDragging.value = false; dragCount = 0; if (e.dataTransfer?.files) processFiles(e.dataTransfer.files) }

// LaTeX 渲染
function renderLatex(text: string): string {
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_: string, expr: string) => {
    try { return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="latex-err">$$${expr}$$</span>` }
  })
  text = text.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$/g, (_: string, expr: string) => {
    try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }) }
    catch { return `<span class="latex-err">$${expr}$</span>` }
  })
  return text
}

// Markdown（含内联导航链接渲染）
const mdRenderer = new marked.Renderer()
mdRenderer.code = function({ text, lang }: { text:string; lang?:string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const hi = hljs.highlight(text, { language }).value
  const encoded = encodeURIComponent(text)
  return `<div class="codeblock"><div class="cb-head"><span class="cb-lang">${language}</span><button class="cb-copy" data-copy-text="${encoded}">复制</button></div><pre><code class="hljs language-${language}">${hi}</code></pre></div>`
}
// 导航链接渲染为可点击按钮
mdRenderer.link = function({ href, text }: { href: string; text: string }) {
  const safeLocation = resolveAssistantLocation(href)
  if (safeLocation) {
    const query = safeLocation.query ? `?${new URLSearchParams(safeLocation.query).toString()}` : ''
    return `<button class="nav-link" data-path="${safeLocation.path}${query}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${text}</button>`
  }
  return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`
}
marked.setOptions({ renderer: mdRenderer, breaks: true })

function renderMd(content: string): string {
  if (!content) return ''
  let c = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
  if (!c) return ''
  try {
    const codeBlocks: string[] = []
    c = c.replace(/```[\s\S]*?```/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    c = c.replace(/`[^`]+`/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    c = renderLatex(c)
    c = c.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)])
    const html = marked.parse(c) as string
    return DOMPurify.sanitize(html, { ADD_TAGS: ['button','span'], ADD_ATTR: ['class','style','data-path','data-copy-text'] })
  } catch { return DOMPurify.sanitize(content.replace(/\n/g, '<br>')) }
}

// 点击导航链接
function handleMdClick(e: Event) {
  const element = e.target as HTMLElement
  const copyButton = element.closest('.cb-copy') as HTMLElement | null
  if (copyButton?.dataset?.copyText) {
    navigator.clipboard.writeText(decodeURIComponent(copyButton.dataset.copyText))
    copyButton.textContent = '✓ 已复制'
    setTimeout(() => { copyButton.textContent = '复制' }, 1500)
    return
  }

  const target = element.closest('.nav-link') as HTMLElement | null
  if (!target?.dataset?.path) return

  const location = resolveAssistantLocation(target.dataset.path)
  if (!location) return

  router.push({ path: location.path, query: location.query })
  toast('正在跳转...')
}

function toast(msg: string) { toastMsg.value = msg; showToast.value = true; setTimeout(() => { showToast.value = false }, 1500) }

// 快捷启动
const starters = [
  { i:'📅', l:'日程管理', t:'帮我安排这周的学习计划，每天3-4个时间段' },
  { i:'🎯', l:'目标规划', t:'帮我拆解"30天学会Python"的学习计划并同步到规划' },
  { i:'📚', l:'学习辅导', t:'用通俗的语言解释马尔可夫链的核心原理' },
  { i:'💻', l:'编程助手', t:'用 Vue 3 + TypeScript 写一个完整的 Todo 应用' },
  { i:'🧭', l:'功能导航', t:'带我看看 Spark Alliance 都有哪些功能模块' },
  { i:'✍️', l:'写作助手', t:'帮我写一份实习申请自荐信' },
]

function getActionCardMeta(action: SparkAction): { icon: string; label: string; desc: string } {
  if (action.action === 'add_schedule') {
    return { icon: '📅', label: '同步日程', desc: action.data.title }
  }
  if (action.action === 'create_goal') {
    return { icon: '🎯', label: '创建规划', desc: action.data.title }
  }
  return { icon: '🔗', label: '跳转', desc: action.data.label || action.data.path }
}

void getActionCardMeta

const displayMsgs = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  const msgs = (conv?.messages.filter(m => m.role !== 'system') || []).map(m => ({
    ...m, displayContent: m.content.replace(/\n\n(📄|🖼️) \*\*.*?\*\*/g, '').replace(/```[\s\S]*?```/g, '').trim() || m.content,
  }))
  if (isStreaming.value && streamingContent.value) {
    return [...msgs, { role: 'assistant' as const, content: streamingContent.value, reasoning: thinkingText.value || undefined, attachments: undefined, displayContent: streamingContent.value }]
  }
  return msgs
})
const groupedConvs = computed(() => {
  const now = new Date(); const td = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yd = td - 86400000; const wk = td - 7 * 86400000
  const gs: { label:string; items:typeof conversations.value }[] = [{ label:'今天', items:[] },{ label:'昨天', items:[] },{ label:'近7天', items:[] },{ label:'更早', items:[] }]
  for (const c of conversations.value) { const t = new Date(c.updatedAt).getTime(); if (t>=td) gs[0].items.push(c); else if(t>=yd) gs[1].items.push(c); else if(t>=wk) gs[2].items.push(c); else gs[3].items.push(c) }
  return gs.filter(g => g.items.length > 0)
})

async function handleSend() {
  const text = inputText.value.trim()
  if ((!text && !pendingFiles.value.length) || isStreaming.value) return
  const atts = [...pendingFiles.value]; inputText.value=''; streamingContent.value=''; thinkingText.value=''; actionCards.value=[]; pendingFiles.value=[]
  if (inputRef.value) inputRef.value.style.height='auto'
  if (!currentConversationId.value) createConversation()
  await nextTick(); scrollBot()
  await sendMessage(text,
    (t) => { streamingContent.value=t; scrollBot() },
    (_ct, acts) => {
      streamingContent.value=''
      if (acts.length) actionCards.value = acts.map(a => ({ icon: a.action==='add_schedule'?'📅':a.action==='create_goal'?'🎯':'🔗', label: a.action==='add_schedule'?'同步日程':a.action==='create_goal'?'创建规划':'跳转', desc: String(a.data.title||a.data.label||a.data.path||''), action:a, done:false }))
      scrollBot()
    },
    () => { streamingContent.value='' },
    (t) => { thinkingText.value=t; scrollBot() },
    atts.length ? atts : undefined,
  )
}

async function execAction(a: SparkAction) {
  try {
    if (a.action === 'add_schedule') {
      const ok = await createEvent({
        title: a.data.title,
        description: a.data.description || '',
        location: '',
        start_time: a.data.start_time,
        end_time: a.data.end_time || '',
        all_day: false,
        event_type: a.data.event_type || 'task',
        event_subtype: '',
        color: '',
        recurrence_type: 'none',
        recurrence_days: [],
        recurrence_end: '',
        reminders: [],
        priority: a.data.priority || 1,
      })

      if (!ok) throw new Error('日程创建失败')
      toast('✓ 日程已同步')
    } else if (a.action === 'create_goal') {
      const goal = await createGoal(
        a.data.title,
        a.data.goal_type,
        a.data.deadline,
        a.data.description,
      )

      if (!goal) throw new Error('目标创建失败')

      router.push({
        path: '/app/schedule',
        query: {
          module: 'planner',
          tab: 'goals',
          goalId: goal.id,
        },
      })
      toast('✓ 目标已创建')
    } else if (a.action === 'navigate') {
      const location = resolveAssistantLocation({
        path: a.data.path,
        query: a.data.query,
      })

      if (!location) throw new Error('无效跳转目标')
      router.push({ path: location.path, query: location.query })
      toast('正在跳转...')
    }

    const card = actionCards.value.find(c => c.action === a)
    if (card) card.done = true
  } catch (e) {
    console.error(e)
    toast(e instanceof Error ? e.message : '执行失败')
  }
}

function copyText(t: string) { navigator.clipboard.writeText(t); toast('已复制到剪贴板') }
function retryFrom(idx: number) {
  const conv = getCurrentConversation()
  while (conv.messages.length > idx && conv.messages[conv.messages.length-1].role !== 'system') { const last = conv.messages[conv.messages.length-1]; if (last.role==='user'&&conv.messages.length<=idx+1) break; conv.messages.pop() }
  const lastUser = [...conv.messages].reverse().find((m:{role:string}) => m.role==='user')
  if (lastUser) { inputText.value=lastUser.content; conv.messages.pop(); handleSend() }
}
function editMessage(idx: number) { const msgs = getCurrentConversation().messages.filter(m => m.role !== 'system'); if (msgs[idx]) inputText.value = msgs[idx].content }
function retryLast() {
  const conv = getCurrentConversation(); const lu = [...conv.messages].reverse().find((m:{role:string}) => m.role==='user')
  if (lu) { if(conv.messages[conv.messages.length-1]?.role==='assistant') conv.messages.pop(); inputText.value=lu.content; conv.messages.pop(); handleSend() }
}

function processFiles(files: FileList) {
  for (const f of Array.from(files)) {
    const size = formatFileSize(f.size)
    if (f.type.startsWith('image/')) pendingFiles.value.push({ type:'image', name:f.name, url:URL.createObjectURL(f), size })
    else if (isBinaryFile(f.name)) pendingFiles.value.push({ type:'file', name:f.name, size, isBinary:true })
    else { const reader = new FileReader(); reader.onload = () => { const c=(reader.result as string).slice(0,10000); pendingFiles.value.push({ type:'file', name:f.name, size, content:c+(c.length>=10000?'\n...(已截断)':'') }) }; reader.readAsText(f) }
  }
}
function onFileInput(e:Event) { const f=(e.target as HTMLInputElement).files; if(f) processFiles(f); if(fileInput.value) fileInput.value.value='' }
function onPaste(e:ClipboardEvent) {
  const items=e.clipboardData?.items; if(!items) return
  for (const item of Array.from(items)) { if(item.type.startsWith('image/')){e.preventDefault(); const file=item.getAsFile(); if(file) pendingFiles.value.push({ type:'image', name:`粘贴图片_${Date.now()}.png`, url:URL.createObjectURL(file), size:formatFileSize(file.size) })} }
}

let recognition: any = null
function toggleVoice() {
  if (isRec.value) { recognition?.stop(); isRec.value=false; return }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { alert('请用 Chrome/Edge'); return }
  recognition = new SR(); recognition.lang='zh-CN'; recognition.continuous=true; recognition.interimResults=true
  recognition.onresult = (e:any) => { let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; inputText.value=t }
  recognition.onerror = () => { isRec.value=false }; recognition.onend = () => { isRec.value=false }
  recognition.start(); isRec.value=true
}

function handleQuick(t: string) { inputText.value=t; handleSend() }
function handleNewChat() { createConversation(); sidebarOpen.value=false; streamingContent.value=''; thinkingText.value=''; actionCards.value=[] }
function handleSwitch(id: string) { if(isStreaming.value) return; switchConversation(id); streamingContent.value=''; thinkingText.value=''; actionCards.value=[]; sidebarOpen.value=false; nextTick(scrollBot) }
function handleDelete(id: string) { deleteConversation(id) }
function onKey(e: KeyboardEvent) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }
function autoResize() { const el=inputRef.value; if(!el) return; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,180)+'px' }
function scrollBot() { nextTick(()=>{ if(scrollRef.value) scrollRef.value.scrollTop=scrollRef.value.scrollHeight }) }

onMounted(() => { if(conversations.value.length&&!currentConversationId.value) currentConversationId.value=conversations.value[0].id; nextTick(scrollBot) })
watch(currentConversationId, () => nextTick(scrollBot))
</script>

<style scoped>
.chat-layout { display:flex; height:calc(100vh - 72px); background:#0a0814; position:relative; overflow:hidden; }
.chat-layout > .cosmic-bg { position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; }
.fade-enter-active,.fade-leave-active { transition:opacity .2s; } .fade-enter-from,.fade-leave-to { opacity:0; }
.toast { position:fixed; top:80px; left:50%; transform:translateX(-50%); padding:8px 20px; border-radius:10px; background:rgba(139,92,246,.12); backdrop-filter:blur(12px); border:1px solid rgba(139,92,246,.15); color:rgba(139,92,246,.9); font-size:12px; font-weight:600; z-index:200; white-space:nowrap; }
.toast-enter-active { transition:all .3s; } .toast-leave-active { transition:all .2s; } .toast-enter-from { opacity:0; transform:translateX(-50%) translateY(-10px); } .toast-leave-to { opacity:0; transform:translateX(-50%) translateY(-6px); }
.drop-overlay { position:absolute; inset:0; z-index:100; background:rgba(139,92,246,.06); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; }
.drop-box { text-align:center; padding:40px 60px; border:2px dashed rgba(139,92,246,.25); border-radius:20px; } .drop-icon { font-size:36px; margin-bottom:8px; } .drop-text { font-size:15px; font-weight:700; color:rgba(139,92,246,.7); } .drop-hint { font-size:11px; color:rgba(255,255,255,.2); margin-top:4px; }

.chat-sidebar { width:250px; background:rgba(8,6,18,.98); border-right:1px solid rgba(255,255,255,.03); display:flex; flex-direction:column; flex-shrink:0; position:relative; z-index:1; }
.sb-top { padding:10px; } .new-btn { width:100%; height:36px; background:rgba(139,92,246,.04); border:1px solid rgba(139,92,246,.06); border-radius:8px; color:rgba(139,92,246,.5); font-weight:600; font-size:12px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer; } .new-btn:hover { background:rgba(139,92,246,.08); }
.sb-list { flex:1; overflow-y:auto; padding:0 4px 8px; } .sb-list::-webkit-scrollbar { width:2px; } .sb-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.03); }
.sb-group { margin-bottom:4px; } .sb-label { font-size:9px; color:rgba(255,255,255,.1); padding:5px 8px 1px; font-weight:700; letter-spacing:1px; }
.sb-item { display:flex; align-items:center; padding:6px 8px; border-radius:6px; color:rgba(255,255,255,.25); font-size:12px; cursor:pointer; transition:all .15s; } .sb-item:hover { background:rgba(255,255,255,.02); color:rgba(255,255,255,.4); } .sb-item.active { background:rgba(139,92,246,.05); color:rgba(139,92,246,.6); }
.sb-text { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .sb-del { opacity:0; background:none; border:none; color:rgba(255,255,255,.1); font-size:14px; cursor:pointer; } .sb-item:hover .sb-del { opacity:1; }
.sb-empty { text-align:center; padding:30px 0; color:rgba(255,255,255,.06); font-size:11px; }

.chat-main { flex:1; display:flex; flex-direction:column; min-width:0; position:relative; z-index:1; }
.top-bar { height:42px; border-bottom:1px solid rgba(255,255,255,.03); display:flex; align-items:center; padding:0 16px; flex-shrink:0; }
.menu-btn { display:none; background:none; border:none; font-size:18px; color:white; cursor:pointer; }
.top-brand { display:flex; align-items:center; gap:5px; } .top-icon { font-size:15px; } .top-icon.pulse { animation:iconPulse 3s ease-in-out infinite; } @keyframes iconPulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4) drop-shadow(0 0 4px rgba(139,92,246,.3))} } .top-title { font-size:13px; font-weight:700; color:white; }
.top-right { margin-left:auto; display:flex; align-items:center; }
.sync-badge { display:flex; align-items:center; gap:3px; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,.03); color:rgba(139,92,246,.3); font-size:10px; font-weight:500; }

.msgs { flex:1; overflow-y:auto; padding:20px 14%; display:flex; flex-direction:column; gap:18px; }
.msgs::-webkit-scrollbar { width:3px; } .msgs::-webkit-scrollbar-thumb { background:rgba(255,255,255,.03); }
@media(max-width:1200px) { .msgs { padding:16px 4%; } }
@media(max-width:768px) { .msgs { padding:12px; } .chat-sidebar { position:absolute; left:0; z-index:10; height:100%; transform:translateX(-100%); transition:transform .3s; } .chat-sidebar.open { transform:translateX(0); box-shadow:8px 0 24px rgba(0,0,0,.5); } .menu-btn { display:block; } }

.empty { margin:auto 0; text-align:center; } .empty-icon { font-size:32px; margin-bottom:8px; }
.empty h2 { color:white; font-size:17px; margin:0 0 4px; font-weight:700; } .empty p { color:rgba(255,255,255,.18); font-size:12px; margin:0 0 20px; max-width:380px; margin-left:auto; margin-right:auto; }
.quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; max-width:560px; margin:0 auto; }
.qcard { display:flex; flex-direction:column; gap:2px; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.03); background:rgba(255,255,255,.01); text-align:left; cursor:pointer; transition:all .2s; } .qcard:hover { background:rgba(139,92,246,.025); border-color:rgba(139,92,246,.05); }
.qi { font-size:15px; } .qt { font-size:11px; font-weight:600; color:rgba(255,255,255,.45); } .qd { font-size:10px; color:rgba(255,255,255,.13); }
@media(max-width:640px) { .quick-grid { grid-template-columns:repeat(2,1fr); } }

.msg-row { display:flex; gap:8px; max-width:100%; } .msg-row.user { justify-content:flex-end; }
.av { width:26px; height:26px; border-radius:7px; flex-shrink:0; background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(59,130,246,.04)); display:flex; align-items:center; justify-content:center; font-size:11px; margin-top:2px; }
.msg-content { max-width:82%; min-width:0; position:relative; }
.user-bubble { background:rgba(139,92,246,.035); padding:8px 12px; border-radius:12px 12px 3px 12px; border:1px solid rgba(139,92,246,.04); }
.u-text { color:rgba(255,255,255,.75); font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
.file-cards { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
.file-card { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; background:rgba(139,92,246,.025); border:1px solid rgba(139,92,246,.04); }
.fc-icon { font-size:16px; } .fc-name { font-size:11px; color:rgba(255,255,255,.45); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .fc-size { font-size:9px; color:rgba(255,255,255,.12); }

.msg-acts { display:flex; gap:3px; margin-top:6px; } .user-acts { justify-content:flex-end; }
.msg-acts button { width:28px; height:28px; border-radius:6px; border:none; background:rgba(255,255,255,.015); color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.msg-acts button:hover { background:rgba(139,92,246,.06); color:rgba(139,92,246,.6); }

.think-block { margin-bottom:8px; border-radius:10px; background:rgba(139,92,246,.012); border:1px solid rgba(139,92,246,.035); overflow:hidden; }
.think-toggle { display:flex; align-items:center; gap:5px; width:100%; padding:7px 10px; border:none; background:none; color:rgba(139,92,246,.35); font-size:11px; cursor:pointer; font-weight:500; text-align:left; } .think-toggle:hover { color:rgba(139,92,246,.5); }
.think-status { font-size:12px; } .think-status.spinning { animation:spin 1.5s linear infinite; }
@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
.think-chevron { margin-left:auto; transition:transform .2s; color:rgba(255,255,255,.1); } .think-chevron.collapsed { transform:rotate(-90deg); }
.think-body { padding:6px 10px 10px; font-size:12px; line-height:1.7; color:rgba(255,255,255,.18); white-space:pre-wrap; word-break:break-word; border-top:1px solid rgba(139,92,246,.025); }
.think-dots { display:flex; gap:3px; padding:6px 10px; } .think-dots span { width:5px; height:5px; border-radius:50%; background:rgba(139,92,246,.15); animation:tdot 1.4s infinite ease-in-out; } .think-dots span:nth-child(2){animation-delay:.2s} .think-dots span:nth-child(3){animation-delay:.4s}
@keyframes tdot { 0%,80%,100%{transform:scale(.5);opacity:.2} 40%{transform:scale(1);opacity:.5} }

/* Markdown */
.md-body { color:rgba(255,255,255,.78); font-size:13px; line-height:1.8; word-break:break-word; }
.md-body :deep(h1) { font-size:17px; font-weight:700; margin:12px 0 6px; color:white; }
.md-body :deep(h2) { font-size:15px; font-weight:700; margin:10px 0 5px; color:white; }
.md-body :deep(h3) { font-size:13px; font-weight:600; margin:8px 0 4px; color:rgba(255,255,255,.9); }
.md-body :deep(p) { margin:0 0 8px; } .md-body :deep(p:last-child) { margin-bottom:0; }
.md-body :deep(ul),.md-body :deep(ol) { margin:4px 0 8px; padding-left:18px; } .md-body :deep(li) { margin-bottom:3px; }
.md-body :deep(strong) { color:white; font-weight:600; }
.md-body :deep(a) { color:rgba(139,92,246,.6); text-decoration:none; }
.md-body :deep(blockquote) { margin:6px 0; padding:6px 12px; border-left:3px solid rgba(139,92,246,.1); background:rgba(139,92,246,.012); border-radius:0 6px 6px 0; color:rgba(255,255,255,.35); }
.md-body :deep(table) { width:100%; border-collapse:collapse; margin:6px 0; font-size:11px; }
.md-body :deep(th) { background:rgba(255,255,255,.02); padding:5px 8px; border:1px solid rgba(255,255,255,.03); text-align:left; font-weight:600; }
.md-body :deep(td) { padding:5px 8px; border:1px solid rgba(255,255,255,.02); }
.md-body :deep(code:not(.hljs)) { padding:1px 5px; border-radius:4px; background:rgba(139,92,246,.05); color:rgba(139,92,246,.65); font-size:11px; font-family:'JetBrains Mono','Fira Code',monospace; }
.md-body :deep(.katex-display) { margin:12px 0; padding:10px 16px; background:rgba(255,255,255,.012); border-radius:8px; border:1px solid rgba(255,255,255,.025); overflow-x:auto; }
.md-body :deep(.katex) { font-size:1.05em; color:rgba(255,255,255,.85); }
.md-body :deep(.codeblock) { margin:8px 0; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,.035); background:rgba(12,10,24,.9); }
.md-body :deep(.cb-head) { display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:rgba(255,255,255,.012); border-bottom:1px solid rgba(255,255,255,.025); }
.md-body :deep(.cb-lang) { font-size:10px; color:rgba(255,255,255,.13); font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
.md-body :deep(.cb-copy) { background:rgba(139,92,246,.035); border:1px solid rgba(139,92,246,.06); border-radius:5px; padding:3px 10px; font-size:10px; color:rgba(139,92,246,.45); cursor:pointer; font-weight:500; }
.md-body :deep(.cb-copy:hover) { background:rgba(139,92,246,.07); color:rgba(139,92,246,.65); }
.md-body :deep(pre) { margin:0; padding:14px; overflow-x:auto; } .md-body :deep(pre code) { font-size:12px; line-height:1.65; font-family:'JetBrains Mono','Fira Code',monospace; }
.md-body :deep(pre::-webkit-scrollbar) { height:4px; } .md-body :deep(pre::-webkit-scrollbar-thumb) { background:rgba(255,255,255,.05); border-radius:4px; }

/* 导航链接按钮（AI回复中的可点击跳转） */
.md-body :deep(.nav-link) { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:6px; border:1px solid rgba(139,92,246,.12); background:rgba(139,92,246,.04); color:rgba(139,92,246,.7); font-size:11px; font-weight:600; cursor:pointer; transition:all .2s; margin:2px 0; }
.md-body :deep(.nav-link:hover) { background:rgba(139,92,246,.08); color:rgba(139,92,246,.9); box-shadow:0 2px 8px rgba(139,92,246,.08); }

.cursor { display:inline-block; width:2px; height:13px; background:rgba(139,92,246,.45); margin-left:1px; animation:blink .8s step-end infinite; vertical-align:text-bottom; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.act-panel { margin-top:6px; } .act-title { font-size:10px; font-weight:700; color:rgba(139,92,246,.3); margin-bottom:4px; }
.act-card { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:rgba(139,92,246,.015); border:1px solid rgba(139,92,246,.04); margin-bottom:4px; }
.act-icon { font-size:18px; } .act-info { flex:1; } .act-label { font-size:11px; font-weight:600; color:rgba(255,255,255,.55); } .act-desc { font-size:9px; color:rgba(255,255,255,.18); }
.act-btn { padding:4px 12px; border-radius:6px; border:none; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; font-size:10px; font-weight:600; cursor:pointer; } .act-btn:disabled { opacity:.35; background:rgba(255,255,255,.04); cursor:default; }
.act-skip { padding:3px 6px; border-radius:5px; border:none; background:none; color:rgba(255,255,255,.12); font-size:10px; cursor:pointer; }

.err-bar { display:flex; align-items:center; justify-content:center; gap:8px; padding:6px 12px; border-radius:8px; background:rgba(239,68,68,.02); border:1px solid rgba(239,68,68,.04); color:rgba(239,68,68,.4); font-size:11px; }
.err-bar button { padding:2px 8px; border-radius:4px; border:1px solid rgba(239,68,68,.06); background:none; color:rgba(239,68,68,.35); font-size:10px; cursor:pointer; font-weight:600; }

/* 输入区 */
.input-area { padding:0 14% 8px; flex-shrink:0; }
@media(max-width:1200px) { .input-area { padding:0 4% 8px; } }
@media(max-width:768px) { .input-area { padding:0 8px 6px; } }
.pf-list { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; }
.pf-chip { display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,.025); border:1px solid rgba(139,92,246,.04); font-size:10px; color:rgba(255,255,255,.3); }
.pf-thumb { width:28px; height:28px; border-radius:4px; object-fit:cover; } .pf-ficon { font-size:13px; }
.pf-name { max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf-x { background:none; border:none; color:rgba(255,255,255,.12); cursor:pointer; font-size:12px; }
.ibox { background:rgba(12,10,24,.95); border:1px solid rgba(255,255,255,.04); border-radius:14px; padding:4px 6px; display:flex; align-items:flex-end; gap:3px; transition:all .2s; }
.ibox.focus { border-color:rgba(139,92,246,.1); box-shadow:0 0 0 2px rgba(139,92,246,.02); }
.itools { display:flex; gap:1px; padding-bottom:3px; }
.itool { width:30px; height:30px; border-radius:7px; border:none; background:none; color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; } .itool:hover { color:rgba(255,255,255,.35); background:rgba(255,255,255,.015); }
.itool.rec { color:rgba(239,68,68,.5); animation:prec 1.5s infinite; }
@keyframes prec { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} 50%{box-shadow:0 0 0 3px rgba(239,68,68,.04)} }
.ibox textarea { flex:1; background:none; border:none; color:white; font-family:inherit; font-size:13px; resize:none; padding:6px 3px; outline:none; max-height:180px; line-height:1.5; min-height:20px; }
.ibox textarea::placeholder { color:rgba(255,255,255,.1); }
.send { width:32px; height:32px; border-radius:9px; border:none; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; margin-bottom:1px; }
.send:hover:not(:disabled) { transform:scale(1.05); box-shadow:0 3px 10px rgba(139,92,246,.15); }
.send:disabled { opacity:.1; cursor:default; background:rgba(255,255,255,.015); }
.send.stop-mode { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.1); color:rgba(239,68,68,.5); }
.send.stop-mode:hover { background:rgba(239,68,68,.1); color:rgba(239,68,68,.7); }

/* 能力工具栏（参考DeepSeek/Kimi设计） */
.ability-bar { display:flex; align-items:center; gap:4px; margin-top:6px; padding:0 2px; flex-wrap:wrap; }
.ab-left { display:flex; gap:2px; flex-shrink:0; }
.ab-model { display:flex; align-items:center; gap:3px; padding:4px 10px; border-radius:7px; border:1px solid rgba(255,255,255,.03); background:none; color:rgba(255,255,255,.2); font-size:11px; font-weight:500; cursor:pointer; transition:all .2s; white-space:nowrap; }
.ab-model:hover { color:rgba(255,255,255,.35); background:rgba(255,255,255,.015); }
.ab-model.active { background:rgba(139,92,246,.06); color:rgba(139,92,246,.65); border-color:rgba(139,92,246,.08); font-weight:600; }
.ab-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.ab-dot.default { background:rgba(59,130,246,.5); } .ab-dot.thinking { background:rgba(168,85,247,.5); } .ab-dot.fast { background:rgba(34,197,94,.5); }
.ab-divider { width:1px; height:16px; background:rgba(255,255,255,.04); margin:0 4px; flex-shrink:0; }
.ab-tools { display:flex; gap:2px; flex-wrap:wrap; }
.ab-tool { display:flex; align-items:center; gap:3px; padding:4px 8px; border-radius:7px; border:none; background:none; color:rgba(255,255,255,.18); font-size:11px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.ab-tool:hover { color:rgba(139,92,246,.55); background:rgba(139,92,246,.03); }
</style>
