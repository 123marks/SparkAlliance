<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="ai-overlay" @click.self="handleClose">
        <div class="ai-modal glass-pro">
          <div class="ai-header">
            <h3>智能导入</h3>
            <span class="ai-quota" v-if="quota !== null">
              今日剩余 {{ Math.max(0, quotaLimit - quota) }}/{{ quotaLimit }} 次
            </span>
            <button class="ai-close" @click="handleClose">&times;</button>
          </div>

          <!-- ======== Step 1: 上传 + 用户描述 ======== -->
          <div v-if="step === 'upload'" class="ai-upload-area">
            <div
              class="ai-dropzone"
              :class="{ dragover: isDragover }"
              @dragover.prevent="isDragover = true"
              @dragleave="isDragover = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p class="ai-drop-title">拖拽文件到此处或 <span>点击上传</span></p>
              <p class="ai-drop-hint">支持图片、PDF、Word、TXT、Markdown、CSV、ICS、HTML，单个不超过 10MB，最多 5 个</p>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              :accept="IMPORT_ACCEPT_ATTR"
              multiple
              hidden
              @change="handleFileSelect"
            />

            <div v-if="selectedFiles.length" class="ai-file-list">
              <div v-for="(file, index) in selectedFiles" :key="`${file.name}-${file.size}-${index}`" class="ai-file-item">
                <span class="ai-file-icon">{{ getFileIcon(file) }}</span>
                <span class="ai-file-name">{{ file.name }}</span>
                <span class="ai-file-size">{{ formatFileSize(file.size) }}</span>
                <button class="ai-file-remove" @click="removeFile(index)">&times;</button>
              </div>
            </div>

            <!-- 用户描述/提示词区域 -->
            <div v-if="selectedFiles.length" class="ai-prompt-section">
              <div class="ai-prompt-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                <span>AI 提示词</span>
                <span class="ai-prompt-optional">可选，帮助 AI 更精确</span>
              </div>
              <textarea
                v-model="userPrompt"
                class="ai-prompt-input"
                rows="3"
                placeholder="描述文件内容或补充信息，例如：&#10;• 这是大三下学期课表，周一到周五&#10;• 时间段是第1-2节 8:00-9:40，第3-4节 10:00-11:40&#10;• 地点在教学楼A"
              ></textarea>
            </div>

            <button
              v-if="selectedFiles.length"
              class="ai-start-btn"
              :disabled="isProcessing || quotaExceeded"
              @click="startRecognition"
            >
              <template v-if="quotaExceeded">今日次数已用完</template>
              <template v-else>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
                  <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
                </svg>
                开始智能识别（{{ selectedFiles.length }} 个文件）
              </template>
            </button>
          </div>

          <!-- ======== Step 2: 处理中 ======== -->
          <div v-else-if="step === 'processing'" class="ai-processing">
            <div class="ai-proc-ring">
              <svg viewBox="0 0 80 80">
                <circle class="ai-ring-bg" cx="40" cy="40" r="34" />
                <circle class="ai-ring-fg" cx="40" cy="40" r="34" :stroke-dashoffset="processRingOffset" />
              </svg>
              <span class="ai-ring-pct">{{ processPercent }}%</span>
            </div>
            <p class="ai-proc-text">{{ processingText }}</p>
            <p class="ai-proc-hint">CSV/ICS 优先走结构化解析，其余文件走 AI 识别</p>
          </div>

          <!-- ======== Step 3: 确认 + AI 对话精炼 ======== -->
          <div v-else-if="step === 'confirm'" class="ai-confirm">
            <div class="ai-confirm-header">
              <span>识别到 {{ recognizedEvents.length }} 个事件</span>
              <div class="ai-confirm-actions-top">
                <button class="ai-refine-toggle" :class="{ active: showRefineChat }" @click="showRefineChat = !showRefineChat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  AI 对话精炼
                </button>
                <label class="ai-select-all">
                  <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                  全选
                </label>
              </div>
            </div>

            <div v-if="noticeMessage" class="ai-warning-note">{{ noticeMessage }}</div>

            <!-- AI 对话精炼面板 -->
            <Transition name="refine-slide">
              <div v-if="showRefineChat" class="ai-refine-panel">
                <div class="ai-refine-messages" ref="refineMessagesRef">
                  <div class="ai-refine-msg ai-msg-system">
                    <p>我已识别出 {{ recognizedEvents.length }} 个事件。你可以告诉我：</p>
                    <ul>
                      <li>补充缺失的时间、地点</li>
                      <li>修改事件类型或标题</li>
                      <li>合并或拆分事件</li>
                      <li>添加遗漏的事件</li>
                    </ul>
                  </div>
                  <div
                    v-for="(msg, i) in refineMessages"
                    :key="i"
                    class="ai-refine-msg"
                    :class="msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant'"
                  >
                    <p>{{ msg.content }}</p>
                  </div>
                  <div v-if="isRefining" class="ai-refine-msg ai-msg-assistant ai-msg-typing">
                    <span class="ai-typing-dot"></span>
                    <span class="ai-typing-dot"></span>
                    <span class="ai-typing-dot"></span>
                  </div>
                </div>
                <div class="ai-refine-input-row">
                  <input
                    v-model="refineInput"
                    class="ai-refine-input"
                    placeholder="告诉 AI 如何完善这些事件..."
                    @keydown.enter.prevent="sendRefineMessage"
                    :disabled="isRefining"
                  />
                  <button class="ai-refine-send" @click="sendRefineMessage" :disabled="!refineInput.trim() || isRefining">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </Transition>

            <!-- 事件列表 -->
            <div class="ai-event-list">
              <template v-for="(group, dateKey) in groupedByDate" :key="dateKey">
                <div class="ai-date-header">{{ formatDateLabel(dateKey as string) }}（{{ group.length }} 项）</div>
                <div
                  v-for="evt in group"
                  :key="`${evt.title}-${evt.start_time}-${evt._gIdx}`"
                  class="ai-event-card"
                  :class="{ selected: evt.selected, 'low-confidence': evt.confidence < 0.7 }"
                >
                  <div class="ai-event-check">
                    <input type="checkbox" v-model="recognizedEvents[evt._gIdx].selected" />
                  </div>
                  <div class="ai-event-body">
                    <template v-if="editingIndex === evt._gIdx">
                      <div class="ai-inline-edit">
                        <input v-model="recognizedEvents[evt._gIdx].title" class="ai-edit-input" placeholder="标题" />
                        <div class="ai-edit-row">
                          <select v-model="recognizedEvents[evt._gIdx].event_type" class="ai-edit-select">
                            <option v-for="(cfg, key) in EVENT_TYPES" :key="key" :value="key">{{ cfg.icon }} {{ cfg.label }}</option>
                          </select>
                          <input v-model="recognizedEvents[evt._gIdx].location" class="ai-edit-input" placeholder="地点" />
                        </div>
                        <div class="ai-edit-row">
                          <input type="datetime-local" v-model="recognizedEvents[evt._gIdx].start_time" class="ai-edit-input" />
                          <span class="ai-edit-sep">&rarr;</span>
                          <input type="datetime-local" v-model="recognizedEvents[evt._gIdx].end_time" class="ai-edit-input" />
                        </div>
                        <button class="ai-edit-done" @click="editingIndex = -1">&check; 完成编辑</button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="ai-event-top">
                        <span class="ai-event-type" :style="{ background: `${getTypeColor(evt.event_type)}20`, color: getTypeColor(evt.event_type) }">
                          {{ getTypeIcon(evt.event_type) }} {{ getTypeLabel(evt.event_type) }}
                        </span>
                        <span class="ai-event-title">{{ evt.title }}</span>
                        <span v-if="evt.recurrence_type === 'weekly'" class="ai-recurrence-tag">🔁 每周</span>
                        <button class="ai-edit-btn" @click="editingIndex = evt._gIdx" title="编辑">&#9998;</button>
                      </div>
                      <div class="ai-event-meta">
                        <span>🕒 {{ formatEventTime(evt) }}</span>
                        <span v-if="evt.location">📍 {{ evt.location }}</span>
                      </div>
                      <div v-if="evt.confidence < 0.5 || !evt.start_time || !evt.end_time" class="ai-incomplete-warn">
                        ⚠️ 信息不完整，点击编辑补充或使用 AI 对话精炼
                      </div>
                      <div class="ai-confidence">
                        <div class="ai-conf-bar">
                          <div class="ai-conf-fill" :style="{ width: `${evt.confidence * 100}%`, background: evt.confidence >= 0.7 ? '#10b981' : '#f59e0b' }"></div>
                        </div>
                        <span class="ai-conf-text" :style="{ color: evt.confidence >= 0.7 ? '#10b981' : '#f59e0b' }">{{ Math.round(evt.confidence * 100) }}%</span>
                        <span v-if="evt.confidence < 0.7" class="ai-conf-warn">需确认</span>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>

            <div class="ai-confirm-actions">
              <button class="ai-btn ai-btn-secondary" @click="step = 'upload'">返回重选</button>
              <button class="ai-btn ai-btn-primary" :disabled="selectedCount === 0" @click="confirmImport">
                确认导入 {{ selectedCount }} 项
              </button>
            </div>
          </div>

          <!-- ======== Step 4: 完成 ======== -->
          <div v-else-if="step === 'done'" class="ai-done">
            <div class="ai-done-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h4>导入成功</h4>
            <p>已导入 {{ importedCount }} 个事件到日历，其他模块已同步更新</p>
            <button class="ai-btn ai-btn-primary" @click="handleClose">完成</button>
          </div>

          <!-- ======== Step 5: 错误 ======== -->
          <div v-else-if="step === 'error'" class="ai-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{{ errorMessage }}</p>
            <button class="ai-btn ai-btn-secondary" @click="step = 'upload'">重试</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { supabase } from '../../supabase'
import { EVENT_TYPES, type EventFormData } from '../../composables/useSchedule'
import { toLocalDateStr } from '../../composables/useCalendar'
import {
  detectImportFileKind,
  IMPORT_ACCEPT_ATTR,
  isSupportedImportFile,
  readImportFileText,
} from './aiImportUtils'
import { extractDocumentText } from './documentImport'
import { dedupeImportedEvents } from './importDedup'
import { parseStructuredImportFile, type StructuredImportEvent } from './structuredImport'
import { sanitizeImportedEvents } from '../../utils/contentSafety'

const props = defineProps<{
  visible: boolean
  semesterStart?: string
}>()

const emit = defineEmits<{
  close: []
  imported: [events: EventFormData[]]
}>()

type Step = 'upload' | 'processing' | 'confirm' | 'done' | 'error'

interface RecognizedEvent {
  title: string
  start_time: string
  end_time: string
  event_type: string
  location: string
  confidence: number
  description: string
  selected: boolean
  recurrence_type: string
  recurrence_days: number[]
  recurrence_end: string
}

interface RefineMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

const step = ref<Step>('upload')
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const isDragover = ref(false)
const isProcessing = ref(false)
const processingText = ref('正在准备文件...')
const processPercent = ref(0)
const errorMessage = ref('')
const noticeMessage = ref('')
const quota = ref<number | null>(null)
const quotaLimit = ref(5)
const recognizedEvents = ref<RecognizedEvent[]>([])
const selectAll = ref(true)
const importedCount = ref(0)
const editingIndex = ref(-1)
const userPrompt = ref('')

// AI 对话精炼相关
const showRefineChat = ref(false)
const refineMessages = ref<RefineMessage[]>([])
const refineInput = ref('')
const isRefining = ref(false)
const refineMessagesRef = ref<HTMLElement | null>(null)

const processRingOffset = computed(() => {
  const circumference = 2 * Math.PI * 34
  return circumference - (processPercent.value / 100) * circumference
})

interface GroupedEvent extends RecognizedEvent {
  _gIdx: number
}

const groupedByDate = computed(() => {
  const groups: Record<string, GroupedEvent[]> = {}
  recognizedEvents.value.forEach((evt, idx) => {
    const dateKey = evt.start_time ? evt.start_time.slice(0, 10) : '未定'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push({ ...evt, _gIdx: idx })
  })
  const sorted: Record<string, GroupedEvent[]> = {}
  Object.keys(groups).sort((a, b) => {
    if (a === '未定') return 1
    if (b === '未定') return -1
    return a.localeCompare(b)
  }).forEach(k => { sorted[k] = groups[k] })
  return sorted
})

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === '未定') return '📅 日期待定'
  const d = new Date(dateKey + 'T00:00:00')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `📅 ${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

const quotaExceeded = computed(() => quota.value !== null && quota.value >= quotaLimit.value)
const selectedCount = computed(() => recognizedEvents.value.filter(event => event.selected).length)

watch(recognizedEvents, () => {
  selectAll.value = recognizedEvents.value.length > 0 && recognizedEvents.value.every(event => event.selected)
}, { deep: true })

watch(() => props.visible, (visible) => {
  if (!visible) resetState()
})

const triggerFileInput = () => fileInputRef.value?.click()

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragover.value = false
  if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files))
}

const addFiles = (files: File[]) => {
  for (const file of files) {
    if (selectedFiles.value.length >= MAX_FILES) break
    if (file.size > MAX_FILE_SIZE) continue
    if (!isSupportedImportFile(file)) continue
    if (selectedFiles.value.some(existing => existing.name === file.name && existing.size === file.size)) continue
    selectedFiles.value.push(file)
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const getFileIcon = (file: File) => {
  const kind = detectImportFileKind(file)
  if (kind === 'image') return '🖼️'
  if (kind === 'pdf') return '📕'
  if (kind === 'document') return '📘'
  return '📄'
}

const uploadTempFile = async (file: File) => {
  const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`
  const { error } = await supabase.storage
    .from('ai-temp')
    .upload(filePath, file, { contentType: file.type || undefined })
  if (error) throw new Error(`文件上传失败: ${error.message}`)
  const { data } = supabase.storage.from('ai-temp').getPublicUrl(filePath)
  if (!data?.publicUrl) throw new Error('临时文件 URL 获取失败')
  return { filePath, publicUrl: data.publicUrl }
}

const removeTempFile = async (filePath: string | null) => {
  if (!filePath) return
  await supabase.storage.from('ai-temp').remove([filePath])
}

const invokeRecognition = async (
  token: string,
  payload: {
    imageUrl?: string
    fileText?: string
    today: string
    semesterStart: string
    userPrompt?: string
  },
) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-schedule-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 429) {
    const data = await response.json()
    quota.value = data.usage || quotaLimit.value
    quotaLimit.value = data.limit || quotaLimit.value
    throw new Error(`今日识别次数已用完（${data.usage}/${data.limit}）`)
  }

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || '识别失败')
  }

  return response.json()
}

const normalizeStructuredEvents = (events: StructuredImportEvent[]): RecognizedEvent[] =>
  events.map(event => ({
    ...event,
    selected: true,
    recurrence_type: 'none',
    recurrence_days: [],
    recurrence_end: '',
  }))

const normalizeEvents = (events: unknown[]): RecognizedEvent[] => {
  return events.map((event) => {
    const item = event as Record<string, unknown>
    const recurrence = (item.recurrence as string) || 'none'
    const recurrenceDays = Array.isArray(item.recurrence_days)
      ? (item.recurrence_days as number[])
      : []
    const recurrenceEnd = (item.recurrence_end as string) || ''
    return {
      title: (item.title as string) || '未命名事件',
      start_time: (item.start_time as string) || '',
      end_time: (item.end_time as string) || '',
      event_type: (item.event_type as string) || 'task',
      location: (item.location as string) || '',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      description: (item.description as string) || '',
      selected: true,
      recurrence_type: recurrence === 'weekly' ? 'weekly' : 'none',
      recurrence_days: recurrenceDays,
      recurrence_end: recurrenceEnd,
    }
  })
}

const startRecognition = async () => {
  if (selectedFiles.value.length === 0) return

  step.value = 'processing'
  isProcessing.value = true
  errorMessage.value = ''
  noticeMessage.value = ''
  recognizedEvents.value = []
  processPercent.value = 0

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('请先登录')

    const today = toLocalDateStr(new Date())
    const semesterStart = props.semesterStart || '2026-02-23'
    const allRecognized: RecognizedEvent[] = []
    const warnings: string[] = []
    const totalFiles = selectedFiles.value.length

    for (const [index, file] of selectedFiles.value.entries()) {
      const basePercent = (index / totalFiles) * 90
      processPercent.value = Math.round(basePercent)
      processingText.value = `正在处理 ${index + 1}/${totalFiles}: ${file.name}`

      const kind = detectImportFileKind(file)
      let tempFilePath: string | null = null

      try {
        if (kind === 'text') {
          processPercent.value = Math.round(basePercent + 10)
          const fileText = await readImportFileText(file)
          const structuredEvents = await parseStructuredImportFile(file.name, fileText)
          if (structuredEvents.length > 0) {
            allRecognized.push(...normalizeStructuredEvents(structuredEvents))
            processPercent.value = Math.round(basePercent + (90 / totalFiles))
            continue
          }

          processingText.value = `AI 正在分析: ${file.name}`
          processPercent.value = Math.round(basePercent + 30)
          const result = await invokeRecognition(token, {
            fileText,
            today,
            semesterStart,
            userPrompt: userPrompt.value.trim() || undefined,
          })

          quota.value = typeof result.usage === 'number' ? result.usage : quota.value
          quotaLimit.value = typeof result.limit === 'number' ? result.limit : quotaLimit.value

          const fileEvents = Array.isArray(result.events) ? normalizeEvents(result.events) : []
          if (fileEvents.length === 0) {
            warnings.push(`${file.name} 未识别出可导入事件`)
            continue
          }

          allRecognized.push(...fileEvents)
          continue
        }

        if (kind === 'document') {
          processingText.value = `正在提取文档内容: ${file.name}`
          processPercent.value = Math.round(basePercent + 15)
          const extractedText = await extractDocumentText(file)
          if (extractedText.trim()) {
            processingText.value = `AI 正在分析文档: ${file.name}`
            processPercent.value = Math.round(basePercent + 40)
            const result = await invokeRecognition(token, {
              fileText: extractedText,
              today,
              semesterStart,
              userPrompt: userPrompt.value.trim() || undefined,
            })

            quota.value = typeof result.usage === 'number' ? result.usage : quota.value
            quotaLimit.value = typeof result.limit === 'number' ? result.limit : quotaLimit.value

            const fileEvents = Array.isArray(result.events) ? normalizeEvents(result.events) : []
            if (fileEvents.length > 0) {
              allRecognized.push(...fileEvents)
              continue
            }
          }
        }

        processingText.value = `正在上传: ${file.name}`
        processPercent.value = Math.round(basePercent + 20)
        const upload = await uploadTempFile(file)
        tempFilePath = upload.filePath

        processingText.value = `AI 正在识别图像: ${file.name}`
        processPercent.value = Math.round(basePercent + 50)
        const result = await invokeRecognition(token, {
          imageUrl: upload.publicUrl,
          today,
          semesterStart,
          userPrompt: userPrompt.value.trim() || undefined,
        })

        quota.value = typeof result.usage === 'number' ? result.usage : quota.value
        quotaLimit.value = typeof result.limit === 'number' ? result.limit : quotaLimit.value

        const fileEvents = Array.isArray(result.events) ? normalizeEvents(result.events) : []
        if (fileEvents.length === 0) {
          warnings.push(`${file.name} 未识别出可导入事件`)
          continue
        }

        allRecognized.push(...fileEvents)
      } catch (fileError) {
        warnings.push(`${file.name}: ${fileError instanceof Error ? fileError.message : '识别失败'}`)
      } finally {
        await removeTempFile(tempFilePath)
      }
    }

    processPercent.value = 95
    processingText.value = '正在整理识别结果...'

    if (allRecognized.length === 0) {
      throw new Error(warnings[0] || '未能识别出任何事件，请尝试更清晰的文件')
    }

    const dedupedEvents = dedupeImportedEvents(allRecognized)
    if (dedupedEvents.length < allRecognized.length) {
      warnings.push(`已自动合并 ${allRecognized.length - dedupedEvents.length} 条重复事件`)
    }

    const { events: safeEvents, totalWarnings: safetyWarnings } = sanitizeImportedEvents(dedupedEvents)
    if (safetyWarnings.length > 0) {
      warnings.push(...safetyWarnings)
    }

    processPercent.value = 100
    recognizedEvents.value = safeEvents
    selectAll.value = true
    noticeMessage.value = warnings.join('；')

    // 如果有低置信度事件，自动展开 AI 对话精炼
    const hasLowConfidence = safeEvents.some(e => e.confidence < 0.7 || !e.start_time || !e.end_time)
    showRefineChat.value = hasLowConfidence
    refineMessages.value = []

    step.value = 'confirm'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '识别过程出错'
    step.value = 'error'
  } finally {
    isProcessing.value = false
  }
}

/** AI 对话精炼：用户发消息让 AI 修正识别结果 */
const sendRefineMessage = async () => {
  const msg = refineInput.value.trim()
  if (!msg || isRefining.value) return

  refineMessages.value.push({ role: 'user', content: msg })
  refineInput.value = ''
  isRefining.value = true

  await nextTick()
  scrollRefineToBottom()

  try {
    const eventsContext = recognizedEvents.value.map((e, i) => (
      `[${i + 1}] ${e.title} | 类型:${e.event_type} | 时间:${e.start_time || '未定'}~${e.end_time || '未定'} | 地点:${e.location || '未定'} | 置信度:${Math.round(e.confidence * 100)}%`
    )).join('\n')

    const systemContext = `你是智能日程助手。用户通过 AI 识别得到了以下事件列表：
${eventsContext}

用户现在要求你修改这些事件。请严格按 JSON 格式返回修改后的**完整事件列表**。
格式：{"events":[{"title":"...","start_time":"YYYY-MM-DDTHH:mm","end_time":"YYYY-MM-DDTHH:mm","event_type":"course|exam|task|life|reminder|holiday","location":"...","confidence":0.95,"description":"..."}],"reply":"你对用户说的话"}
只返回 JSON，不要返回其他内容。今天是 ${toLocalDateStr(new Date())}。`

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('请先登录后再使用 AI 精炼')

    const conversationHistory = refineMessages.value.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        assistant: 'spark',
        mode: 'default',
        messages: [
          { role: 'user', content: `[System Context]\n${systemContext}` },
          ...conversationHistory,
        ],
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(typeof errData.error === 'string' ? errData.error : `AI 服务响应异常 (${res.status})`)
    }

    const data = await res.json()
    const aiContent = typeof data.content === 'string' ? data.content : (data.choices?.[0]?.message?.content || '')

    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.events) && parsed.events.length > 0) {
          recognizedEvents.value = normalizeEvents(parsed.events)
          selectAll.value = true
        }
        const reply = parsed.reply || '已根据你的要求更新了事件列表。'
        refineMessages.value.push({ role: 'assistant', content: reply })
      } catch {
        refineMessages.value.push({ role: 'assistant', content: aiContent.slice(0, 500) })
      }
    } else {
      refineMessages.value.push({ role: 'assistant', content: aiContent.slice(0, 500) })
    }
  } catch (err) {
    refineMessages.value.push({
      role: 'assistant',
      content: `抱歉，精炼请求失败：${err instanceof Error ? err.message : '未知错误'}。你可以手动点击编辑按钮修改事件。`,
    })
  } finally {
    isRefining.value = false
    await nextTick()
    scrollRefineToBottom()
  }
}

const scrollRefineToBottom = () => {
  if (refineMessagesRef.value) {
    refineMessagesRef.value.scrollTop = refineMessagesRef.value.scrollHeight
  }
}

const toggleSelectAll = () => {
  recognizedEvents.value.forEach(event => { event.selected = selectAll.value })
}

const confirmImport = () => {
  const selected = recognizedEvents.value.filter(event => event.selected)
  const formEvents: EventFormData[] = selected.map(event => ({
    title: event.title,
    description: event.description,
    location: event.location,
    start_time: event.start_time,
    end_time: event.end_time,
    all_day: false,
    event_type: event.event_type as EventFormData['event_type'],
    event_subtype: '',
    color: '',
    recurrence_type: event.recurrence_type || 'none',
    recurrence_days: event.recurrence_days || [],
    recurrence_end: event.recurrence_end || '',
    reminders: [],
    priority: 0,
  }))

  importedCount.value = formEvents.length
  emit('imported', formEvents)
  step.value = 'done'

  // 广播导入完成事件，触发其他模块同步
  window.dispatchEvent(new CustomEvent('schedule-import-sync', {
    detail: { count: formEvents.length, events: formEvents },
  }))
}

const getTypeColor = (type: string) => EVENT_TYPES[type as keyof typeof EVENT_TYPES]?.color || '#4f8ef7'
const getTypeIcon = (type: string) => EVENT_TYPES[type as keyof typeof EVENT_TYPES]?.icon || '📌'
const getTypeLabel = (type: string) => EVENT_TYPES[type as keyof typeof EVENT_TYPES]?.label || type

const formatEventTime = (evt: RecognizedEvent) => {
  if (!evt.start_time) return '时间待定'
  const start = new Date(evt.start_time)
  const end = evt.end_time ? new Date(evt.end_time) : null
  const dateStr = `${start.getMonth() + 1}/${start.getDate()}`
  const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  if (!end) return `${dateStr} ${startStr}`
  const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  return `${dateStr} ${startStr}-${endStr}`
}

const resetState = () => {
  step.value = 'upload'
  selectedFiles.value = []
  recognizedEvents.value = []
  processingText.value = '正在准备文件...'
  processPercent.value = 0
  errorMessage.value = ''
  noticeMessage.value = ''
  importedCount.value = 0
  selectAll.value = true
  isDragover.value = false
  userPrompt.value = ''
  showRefineChat.value = false
  refineMessages.value = []
  refineInput.value = ''
  isRefining.value = false
}

const handleClose = () => {
  if (step.value === 'processing') return
  resetState()
  emit('close')
}
</script>

<style scoped>
.ai-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}

.ai-modal {
  width: 620px; max-height: 88vh; overflow-y: auto;
  background: rgba(20,20,30,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.ai-modal::-webkit-scrollbar { width: 4px; }
.ai-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.ai-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px; padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ai-header h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; flex: 1; }
.ai-quota {
  font-size: 12px; color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.04); padding: 4px 10px; border-radius: 12px;
}
.ai-close {
  background: transparent; border: none; color: rgba(255,255,255,0.5);
  font-size: 24px; cursor: pointer; padding: 0; line-height: 1;
}
.ai-close:hover { color: white; }

/* ===== Upload Area ===== */
.ai-dropzone {
  border: 2px dashed rgba(255,255,255,0.1);
  border-radius: 14px; padding: 40px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  cursor: pointer; transition: all 0.2s;
}
.ai-dropzone:hover, .ai-dropzone.dragover {
  border-color: var(--color-brand-blue);
  background: rgba(79,142,247,0.04);
}
.ai-drop-title { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; }
.ai-drop-title span { color: var(--color-brand-blue); font-weight: 500; }
.ai-drop-hint { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; text-align: center; }

.ai-file-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.ai-file-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(255,255,255,0.03); font-size: 13px;
}
.ai-file-icon { font-size: 16px; }
.ai-file-name { flex: 1; color: rgba(255,255,255,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-file-size { color: rgba(255,255,255,0.35); font-size: 12px; }
.ai-file-remove {
  background: transparent; border: none; color: rgba(255,255,255,0.3);
  font-size: 16px; cursor: pointer; padding: 0;
}
.ai-file-remove:hover { color: #f87171; }

/* ===== 用户提示词区域 ===== */
.ai-prompt-section {
  margin-top: 14px; padding: 14px;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,142,247,0.04));
  border: 1px solid rgba(139,92,246,0.12);
  border-radius: 12px;
}
.ai-prompt-header {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 8px; font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.7);
}
.ai-prompt-header svg { color: #a78bfa; }
.ai-prompt-optional { font-weight: 400; font-size: 11px; color: rgba(255,255,255,0.3); margin-left: auto; }
.ai-prompt-input {
  width: 100%; resize: none;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px;
  color: white; font-size: 13px; line-height: 1.5;
  font-family: inherit; outline: none;
}
.ai-prompt-input::placeholder { color: rgba(255,255,255,0.25); }
.ai-prompt-input:focus { border-color: rgba(139,92,246,0.3); }

.ai-start-btn {
  width: 100%; margin-top: 16px; padding: 12px;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple, #8b5cf6));
  border: none; border-radius: 12px;
  color: white; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ai-start-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.ai-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== Processing Ring ===== */
.ai-processing {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 40px 0;
}
.ai-proc-ring {
  position: relative; width: 80px; height: 80px;
}
.ai-proc-ring svg { width: 100%; height: 100%; }
.ai-ring-bg {
  fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 6;
}
.ai-ring-fg {
  fill: none; stroke: var(--color-brand-blue, #4f8ef7); stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 213.63;
  transform: rotate(-90deg); transform-origin: center;
  transition: stroke-dashoffset 0.4s ease;
}
.ai-ring-pct {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: white;
}
.ai-proc-text { font-size: 15px; color: white; font-weight: 500; }
.ai-proc-hint { font-size: 12px; color: rgba(255,255,255,0.35); text-align: center; }

/* ===== Confirm Area ===== */
.ai-confirm-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; font-size: 14px; color: rgba(255,255,255,0.6);
}
.ai-confirm-actions-top { display: flex; gap: 12px; align-items: center; }
.ai-select-all {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: rgba(255,255,255,0.5); cursor: pointer;
}
.ai-select-all input { accent-color: var(--color-brand-blue); }

.ai-refine-toggle {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 8px;
  background: rgba(139,92,246,0.08);
  border: 1px solid rgba(139,92,246,0.15);
  color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.ai-refine-toggle:hover, .ai-refine-toggle.active {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.3);
  color: #c4b5fd;
}

.ai-warning-note {
  margin-bottom: 12px; padding: 10px 12px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #fbbf24; font-size: 12px;
}

/* ===== AI 对话精炼面板 ===== */
.ai-refine-panel {
  margin-bottom: 14px; padding: 12px;
  background: rgba(139,92,246,0.04);
  border: 1px solid rgba(139,92,246,0.12);
  border-radius: 12px;
}
.ai-refine-messages {
  max-height: 200px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 10px; padding-right: 4px;
  scrollbar-width: thin;
}
.ai-refine-messages::-webkit-scrollbar { width: 3px; }
.ai-refine-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.ai-refine-msg {
  padding: 10px 12px; border-radius: 10px;
  font-size: 13px; line-height: 1.5;
}
.ai-refine-msg p { margin: 0; }
.ai-refine-msg ul { margin: 6px 0 0; padding-left: 18px; }
.ai-refine-msg li { margin-bottom: 2px; }
.ai-msg-system {
  background: rgba(139,92,246,0.08);
  color: rgba(255,255,255,0.65);
  border: 1px solid rgba(139,92,246,0.1);
}
.ai-msg-user {
  background: rgba(79,142,247,0.12);
  color: rgba(255,255,255,0.85);
  align-self: flex-end; max-width: 85%;
  border: 1px solid rgba(79,142,247,0.15);
}
.ai-msg-assistant {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.75);
  align-self: flex-start; max-width: 85%;
  border: 1px solid rgba(255,255,255,0.06);
}
.ai-msg-typing {
  display: flex; gap: 6px; padding: 14px 16px;
}
.ai-typing-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,0.35);
  animation: ai-dot-bounce 1.2s infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.ai-typing-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-dot-bounce {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}

.ai-refine-input-row {
  display: flex; gap: 8px;
}
.ai-refine-input {
  flex: 1; padding: 9px 12px; border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: white; font-size: 13px; outline: none;
  font-family: inherit;
}
.ai-refine-input::placeholder { color: rgba(255,255,255,0.25); }
.ai-refine-input:focus { border-color: rgba(139,92,246,0.3); }
.ai-refine-send {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(139,92,246,0.15); border: none;
  color: #c4b5fd; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.ai-refine-send:hover:not(:disabled) { background: rgba(139,92,246,0.25); color: white; }
.ai-refine-send:disabled { opacity: 0.3; cursor: not-allowed; }

.refine-slide-enter-active { transition: all 0.3s ease; }
.refine-slide-leave-active { transition: all 0.2s ease; }
.refine-slide-enter-from, .refine-slide-leave-to {
  opacity: 0; max-height: 0; margin-bottom: 0; padding: 0; overflow: hidden;
}

/* ===== Event List ===== */
.ai-event-list {
  max-height: 360px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px;
  scrollbar-width: thin;
}
.ai-event-list::-webkit-scrollbar { width: 4px; }
.ai-event-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.ai-event-card {
  display: flex; gap: 10px; padding: 12px;
  border-radius: 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.15s;
}
.ai-event-card.selected { background: rgba(79,142,247,0.04); border-color: rgba(79,142,247,0.1); }
.ai-event-card.low-confidence { border-color: rgba(245,158,11,0.2); }
.ai-event-check { display: flex; align-items: flex-start; padding-top: 2px; }
.ai-event-check input { accent-color: var(--color-brand-blue); }
.ai-event-body { flex: 1; min-width: 0; }
.ai-event-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ai-event-type {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;
  flex-shrink: 0;
}
.ai-event-title { font-size: 14px; font-weight: 500; color: white; }
.ai-event-meta {
  display: flex; gap: 12px; font-size: 12px; color: rgba(255,255,255,0.45);
  margin-bottom: 6px;
}

.ai-confidence { display: flex; align-items: center; gap: 8px; }
.ai-conf-bar {
  flex: 1; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.ai-conf-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.ai-conf-text { font-size: 11px; font-weight: 600; min-width: 32px; }
.ai-conf-warn { font-size: 11px; color: #f59e0b; }

.ai-confirm-actions { display: flex; gap: 12px; margin-top: 16px; }

.ai-date-header {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7);
  padding: 8px 4px 4px; margin-top: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ai-date-header:first-child { margin-top: 0; }

.ai-recurrence-tag {
  font-size: 11px; color: #a78bfa; background: rgba(139,92,246,0.15);
  padding: 2px 8px; border-radius: 10px; flex-shrink: 0;
}

.ai-edit-btn {
  background: transparent; border: none; cursor: pointer;
  font-size: 14px; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s;
  margin-left: auto; flex-shrink: 0;
}
.ai-edit-btn:hover { opacity: 1; }

.ai-inline-edit { display: flex; flex-direction: column; gap: 8px; }
.ai-edit-input {
  width: 100%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
  padding: 7px 10px; color: white; font-size: 13px;
  outline: none; font-family: inherit;
}
.ai-edit-input:focus { border-color: var(--color-brand-blue); }
.ai-edit-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; padding: 7px 10px; color: white; font-size: 13px;
  outline: none; min-width: 120px;
}
.ai-edit-row { display: flex; gap: 8px; align-items: center; }
.ai-edit-sep { color: rgba(255,255,255,0.3); font-size: 14px; flex-shrink: 0; }
.ai-edit-done {
  align-self: flex-end; background: rgba(16,185,129,0.15); color: #34d399;
  border: none; border-radius: 8px; padding: 5px 14px; font-size: 12px;
  cursor: pointer; font-weight: 500;
}
.ai-edit-done:hover { background: rgba(16,185,129,0.25); }

.ai-incomplete-warn {
  margin: 4px 0; padding: 6px 10px; border-radius: 8px;
  background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.15);
  color: #fbbf24; font-size: 11px;
}

/* ===== Done & Error ===== */
.ai-done, .ai-error {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 40px 0; text-align: center;
}
.ai-done-icon {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(16,185,129,0.08);
  display: flex; align-items: center; justify-content: center;
}
.ai-done h4 { font-size: 18px; color: #10b981; margin: 0; }
.ai-done p, .ai-error p { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0; }

.ai-btn {
  padding: 10px 20px; border-radius: 10px; font-size: 14px;
  font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
  flex: 1;
}
.ai-btn-primary { background: var(--color-brand-blue); color: white; }
.ai-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.ai-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.ai-btn-secondary {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
}
.ai-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .ai-modal { transform: translateY(20px) scale(0.97); }
.modal-fade-leave-to .ai-modal { transform: translateY(20px) scale(0.97); }
</style>
