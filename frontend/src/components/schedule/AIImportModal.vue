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
            <button class="ai-close" @click="handleClose">×</button>
          </div>

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
                <button class="ai-file-remove" @click="removeFile(index)">×</button>
              </div>
            </div>

            <button
              v-if="selectedFiles.length"
              class="ai-start-btn"
              :disabled="isProcessing || quotaExceeded"
              @click="startRecognition"
            >
              <template v-if="quotaExceeded">
                今日次数已用完
              </template>
              <template v-else>
                开始识别（{{ selectedFiles.length }} 个文件）
              </template>
            </button>
          </div>

          <div v-else-if="step === 'processing'" class="ai-processing">
            <div class="ai-proc-spinner"></div>
            <p class="ai-proc-text">{{ processingText }}</p>
            <p class="ai-proc-hint">CSV/ICS 会优先走结构化解析，其他文件再走 AI 识别。</p>
          </div>

          <div v-else-if="step === 'confirm'" class="ai-confirm">
            <div class="ai-confirm-header">
              <span>识别到 {{ recognizedEvents.length }} 个事件</span>
              <label class="ai-select-all">
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                全选
              </label>
            </div>

            <div v-if="noticeMessage" class="ai-warning-note">{{ noticeMessage }}</div>

            <div class="ai-event-list">
              <div
                v-for="(evt, index) in recognizedEvents"
                :key="`${evt.title}-${evt.start_time}-${index}`"
                class="ai-event-card"
                :class="{ selected: evt.selected, 'low-confidence': evt.confidence < 0.7 }"
              >
                <div class="ai-event-check">
                  <input type="checkbox" v-model="evt.selected" />
                </div>
                <div class="ai-event-body">
                  <div class="ai-event-top">
                    <span
                      class="ai-event-type"
                      :style="{ background: `${getTypeColor(evt.event_type)}20`, color: getTypeColor(evt.event_type) }"
                    >
                      {{ getTypeIcon(evt.event_type) }} {{ getTypeLabel(evt.event_type) }}
                    </span>
                    <span class="ai-event-title">{{ evt.title }}</span>
                  </div>
                  <div class="ai-event-meta">
                    <span>🕒 {{ formatEventTime(evt) }}</span>
                    <span v-if="evt.location">📍 {{ evt.location }}</span>
                  </div>
                  <div class="ai-confidence">
                    <div class="ai-conf-bar">
                      <div
                        class="ai-conf-fill"
                        :style="{
                          width: `${evt.confidence * 100}%`,
                          background: evt.confidence >= 0.7 ? '#10b981' : '#f59e0b',
                        }"
                      ></div>
                    </div>
                    <span class="ai-conf-text" :style="{ color: evt.confidence >= 0.7 ? '#10b981' : '#f59e0b' }">
                      {{ Math.round(evt.confidence * 100) }}%
                    </span>
                    <span v-if="evt.confidence < 0.7" class="ai-conf-warn">需确认</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="ai-confirm-actions">
              <button class="ai-btn ai-btn-secondary" @click="step = 'upload'">返回重选</button>
              <button class="ai-btn ai-btn-primary" :disabled="selectedCount === 0" @click="confirmImport">
                确认导入 {{ selectedCount }} 项
              </button>
            </div>
          </div>

          <div v-else-if="step === 'done'" class="ai-done">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h4>导入成功</h4>
            <p>已导入 {{ importedCount }} 个事件到日历</p>
            <button class="ai-btn ai-btn-primary" @click="handleClose">完成</button>
          </div>

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
import { computed, ref, watch } from 'vue'
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
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

const step = ref<Step>('upload')
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const isDragover = ref(false)
const isProcessing = ref(false)
const processingText = ref('正在准备文件...')
const errorMessage = ref('')
const noticeMessage = ref('')
const quota = ref<number | null>(null)
const quotaLimit = ref(5)
const recognizedEvents = ref<RecognizedEvent[]>([])
const selectAll = ref(true)
const importedCount = ref(0)

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

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`)
  }

  const { data } = supabase.storage.from('ai-temp').getPublicUrl(filePath)
  if (!data?.publicUrl) {
    throw new Error('临时文件 URL 获取失败')
  }

  return {
    filePath,
    publicUrl: data.publicUrl,
  }
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
  }))

const normalizeEvents = (events: unknown[]): RecognizedEvent[] => {
  return events.map((event) => {
    const item = event as Record<string, unknown>
    return {
      title: (item.title as string) || '未命名事件',
      start_time: (item.start_time as string) || '',
      end_time: (item.end_time as string) || '',
      event_type: (item.event_type as string) || 'task',
      location: (item.location as string) || '',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      description: (item.description as string) || '',
      selected: true,
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

  const loadingTexts = [
    '正在准备文件...',
    'AI 正在分析内容...',
    '正在提取时间和地点...',
    '正在整理识别结果...',
    '即将完成...',
  ]

  let timer: ReturnType<typeof setInterval> | null = null

  try {
    let copyIndex = 0
    timer = setInterval(() => {
      copyIndex = Math.min(copyIndex + 1, loadingTexts.length - 1)
      processingText.value = loadingTexts[copyIndex]
    }, 3000)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('请先登录')

    const today = toLocalDateStr(new Date())
    const semesterStart = props.semesterStart || '2026-02-23'
    const allRecognized: RecognizedEvent[] = []
    const warnings: string[] = []

    for (const [index, file] of selectedFiles.value.entries()) {
      processingText.value = `正在处理 ${index + 1}/${selectedFiles.value.length}: ${file.name}`

      const kind = detectImportFileKind(file)
      let tempFilePath: string | null = null

      try {
        if (kind === 'text') {
          const fileText = await readImportFileText(file)
          const structuredEvents = await parseStructuredImportFile(file.name, fileText)
          if (structuredEvents.length > 0) {
            allRecognized.push(...normalizeStructuredEvents(structuredEvents))
            continue
          }

          const result = await invokeRecognition(token, {
            fileText,
            today,
            semesterStart,
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
          const extractedText = await extractDocumentText(file)
          if (extractedText.trim()) {
            const result = await invokeRecognition(token, {
              fileText: extractedText,
              today,
              semesterStart,
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

        const upload = await uploadTempFile(file)
        tempFilePath = upload.filePath

        const result = await invokeRecognition(token, {
          imageUrl: upload.publicUrl,
          today,
          semesterStart,
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

    if (allRecognized.length === 0) {
      throw new Error(warnings[0] || '未能识别出任何事件，请尝试更清晰的文件')
    }

    const dedupedEvents = dedupeImportedEvents(allRecognized)
    if (dedupedEvents.length < allRecognized.length) {
      warnings.push(`已自动合并 ${allRecognized.length - dedupedEvents.length} 条重复事件`)
    }

    recognizedEvents.value = dedupedEvents
    selectAll.value = true
    noticeMessage.value = warnings.join('；')
    step.value = 'confirm'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '识别过程出错'
    step.value = 'error'
  } finally {
    if (timer) clearInterval(timer)
    isProcessing.value = false
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
    recurrence_type: 'none',
    recurrence_days: [],
    recurrence_end: '',
    reminders: [],
    priority: 0,
  }))

  importedCount.value = formEvents.length
  emit('imported', formEvents)
  step.value = 'done'
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
  errorMessage.value = ''
  noticeMessage.value = ''
  importedCount.value = 0
  selectAll.value = true
  isDragover.value = false
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
  width: 560px; max-height: 85vh; overflow-y: auto;
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

.ai-start-btn {
  width: 100%; margin-top: 16px; padding: 12px;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple, #8b5cf6));
  border: none; border-radius: 12px;
  color: white; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.ai-start-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.ai-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ai-processing {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 60px 0;
}
.ai-proc-spinner {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--color-brand-blue);
  animation: ai-spin 0.8s linear infinite;
}
@keyframes ai-spin { to { transform: rotate(360deg); } }
.ai-proc-text { font-size: 15px; color: white; font-weight: 500; }
.ai-proc-hint { font-size: 12px; color: rgba(255,255,255,0.35); text-align: center; }

.ai-confirm-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; font-size: 14px; color: rgba(255,255,255,0.6);
}
.ai-select-all {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: rgba(255,255,255,0.5); cursor: pointer;
}
.ai-select-all input { accent-color: var(--color-brand-blue); }

.ai-warning-note {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  font-size: 12px;
}

.ai-event-list {
  max-height: 400px; overflow-y: auto;
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

.ai-done, .ai-error {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 40px 0; text-align: center;
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
