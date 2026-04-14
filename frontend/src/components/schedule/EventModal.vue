<!-- 
  EventModal.vue — 事件创建/编辑/查看三合一弹窗
  mode: 'create' | 'edit' | 'view'
-->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="ev-overlay" @click.self="$emit('close')">
        <div class="ev-modal glass-pro">
          <!-- 顶部 -->
          <div class="ev-header">
            <h3>{{ mode === 'create' ? '新建事件' : mode === 'edit' ? '编辑事件' : '事件详情' }}</h3>
            <button class="ev-close" @click="$emit('close')">×</button>
          </div>

          <!-- 查看模式 -->
          <div v-if="mode === 'view' && event" class="ev-view">
            <div class="ev-view-type" :style="{ background: typeConfig.gradient }">
              <span class="ev-view-icon">{{ typeConfig.icon }}</span>
              <span>{{ typeConfig.label }}</span>
            </div>
            <h2 class="ev-view-title">{{ event.title }}</h2>
            <div class="ev-view-row" v-if="!event.all_day">
              <span class="ev-view-label">🕐</span>
              <span>{{ formatTime(event.start_time) }} — {{ event.end_time ? formatTime(event.end_time) : '' }}</span>
            </div>
            <div class="ev-view-row" v-else>
              <span class="ev-view-label">📅</span>
              <span>全天事件</span>
            </div>
            <div class="ev-view-row" v-if="event.location">
              <span class="ev-view-label">📍</span>
              <span>{{ event.location }}</span>
            </div>
            <div class="ev-view-row" v-if="event.description">
              <span class="ev-view-label">📝</span>
              <span>{{ event.description }}</span>
            </div>
            <div class="ev-view-row" v-if="event.recurrence_type !== 'none'">
              <span class="ev-view-label">🔁</span>
              <span>{{ recurrenceLabel(event.recurrence_type) }}</span>
            </div>
            <div class="ev-view-actions">
              <button class="ev-btn ev-btn-edit" @click="$emit('edit', event)">✏️ 编辑</button>
              <button class="ev-btn ev-btn-danger" @click="$emit('delete', event)">🗑️ 删除</button>
            </div>
            <div class="ev-view-extras">
              <button class="ev-btn ev-btn-extra" @click="$emit('pushToPlanner', event)" title="将此事件同步为规划任务">
                🚀 推送到规划
              </button>
              <button
                v-if="event.event_type === 'life'"
                class="ev-btn ev-btn-extra"
                @click="$emit('shareToWall', event)"
                title="分享到校园墙"
              >
                📢 分享到校园墙
              </button>
            </div>
          </div>

          <!-- 创建/编辑表单 -->
          <div v-else class="ev-form">
            <!-- 标题 -->
            <div class="ev-field">
              <label>标题</label>
              <input v-model="form.title" type="text" placeholder="输入事件标题..." class="ev-input" />
            </div>

            <!-- 事件类型 -->
            <div class="ev-field">
              <label>类型</label>
              <div class="ev-type-grid">
                <button
                  v-for="(cfg, key) in EVENT_TYPES"
                  :key="key"
                  class="ev-type-btn"
                  :class="{ active: form.event_type === key }"
                  :style="form.event_type === key ? { background: cfg.gradient, borderColor: cfg.color } : {}"
                  @click="form.event_type = key as EventType"
                >
                  <span>{{ cfg.icon }}</span>
                  <span>{{ cfg.label }}</span>
                </button>
              </div>
            </div>

            <!-- 全天开关 -->
            <div class="ev-field ev-row">
              <label>全天事件</label>
              <label class="ev-switch">
                <input type="checkbox" v-model="form.all_day" />
                <span class="ev-slider"></span>
              </label>
            </div>

            <!-- 开始时间 -->
            <div class="ev-field">
              <label>开始时间</label>
              <div class="ev-time-row">
                <input v-model="form.startDate" type="date" class="ev-input" />
                <input v-if="!form.all_day" v-model="form.startTime" type="time" class="ev-input ev-time" />
              </div>
            </div>

            <!-- 结束时间 -->
            <div class="ev-field">
              <label>结束时间</label>
              <div class="ev-time-row">
                <input v-model="form.endDate" type="date" class="ev-input" />
                <input v-if="!form.all_day" v-model="form.endTime" type="time" class="ev-input ev-time" />
              </div>
            </div>

            <!-- 地点 -->
            <div class="ev-field">
              <label>地点</label>
              <input v-model="form.location" type="text" placeholder="输入地点..." class="ev-input" />
            </div>

            <!-- 重复 -->
            <div class="ev-field">
              <label>重复</label>
              <select v-model="form.recurrence_type" class="ev-input">
                <option v-for="opt in RECURRENCE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- 提醒 -->
            <div class="ev-field">
              <label>提醒</label>
              <select v-model="selectedReminder" class="ev-input" @change="addReminder">
                <option value="">+ 添加提醒</option>
                <option v-for="opt in REMINDER_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <div class="ev-reminders" v-if="form.reminders.length">
                <span class="ev-reminder-tag" v-for="(r, i) in form.reminders" :key="i">
                  提前 {{ r.value >= 60 ? `${r.value / 60}小时` : `${r.value}分钟` }}
                  <button @click="form.reminders.splice(i, 1)">×</button>
                </span>
              </div>
            </div>

            <!-- 优先级 -->
            <div class="ev-field">
              <label>优先级</label>
              <div class="ev-priority-grid">
                <button v-for="p in priorities" :key="p.value" class="ev-prio-btn"
                  :class="{ active: form.priority === p.value }"
                  :style="form.priority === p.value ? { borderColor: p.color, color: p.color } : {}"
                  @click="form.priority = p.value"
                >{{ p.label }}</button>
              </div>
            </div>

            <!-- 备注 -->
            <div class="ev-field">
              <label>备注</label>
              <textarea v-model="form.description" placeholder="添加备注..." class="ev-input ev-textarea"></textarea>
            </div>

            <!-- 冲突提示 -->
            <div v-if="conflicts.length" class="ev-conflict-warn">
              ⚠️ 时间冲突：
              <span v-for="(c, i) in conflicts" :key="i">
                「{{ c.event.title }}」{{ i < conflicts.length - 1 ? '、' : '' }}
              </span>
            </div>

            <!-- 操作按钮 -->
            <div class="ev-form-actions">
              <button class="ev-btn ev-btn-cancel" @click="$emit('close')">取消</button>
              <button class="ev-btn ev-btn-save" :disabled="!canSave" @click="handleSave">
                {{ mode === 'edit' ? '保存修改' : '创建事件' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  EVENT_TYPES, RECURRENCE_OPTIONS, REMINDER_OPTIONS,
  type EventType, type ScheduleEvent, type Conflict,
  type EventFormData
} from '../../composables/useSchedule'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit' | 'view'
  event?: ScheduleEvent | null
  defaultDate?: string
  defaultHour?: number
  conflicts?: Conflict[]
}>()

const emit = defineEmits<{
  close: []
  save: [data: EventFormData]
  edit: [event: ScheduleEvent]
  delete: [event: ScheduleEvent]
  pushToPlanner: [event: ScheduleEvent]
  shareToWall: [event: ScheduleEvent]
}>()

// 表单数据
const form = ref({
  title: '',
  event_type: 'task' as EventType,
  all_day: false,
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  location: '',
  description: '',
  recurrence_type: 'none',
  recurrence_days: [] as number[],
  recurrence_end: '',
  reminders: [] as { type: string; value: number }[],
  priority: 0,
})

const selectedReminder = ref('')

// 优先级选项
const priorities = [
  { label: '低', value: -1, color: '#60a5fa' },
  { label: '普通', value: 0, color: '#9ca3af' },
  { label: '高', value: 1, color: '#f97316' },
  { label: '紧急', value: 2, color: '#ef4444' },
]

// 冲突（来自父组件传入）
const conflicts = computed(() => props.conflicts || [])

// 添加提醒
const addReminder = () => {
  if (!selectedReminder.value) return
  const val = Number(selectedReminder.value)
  if (!form.value.reminders.find(r => r.value === val)) {
    form.value.reminders.push({ type: 'minute', value: val })
  }
  selectedReminder.value = ''
}

// 初始化表单
watch(() => [props.visible, props.mode, props.event], () => {
  if (!props.visible) return
  if (props.mode === 'edit' && props.event) {
    // 编辑模式填充数据
    const e = props.event
    const start = new Date(e.start_time)
    const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 3600000)
    form.value = {
      title: e.title,
      event_type: e.event_type,
      all_day: e.all_day,
      startDate: toDateStr(start),
      startTime: toTimeStr(start),
      endDate: toDateStr(end),
      endTime: toTimeStr(end),
      location: e.location || '',
      description: e.description || '',
      recurrence_type: e.recurrence_type,
      recurrence_days: e.recurrence_days || [],
      recurrence_end: e.recurrence_end || '',
      reminders: e.reminders || [],
      priority: e.priority,
    }
  } else if (props.mode === 'create') {
    // 创建模式默认值
    const today = props.defaultDate || toDateStr(new Date())
    const startHour = String(Math.max(0, Math.min(23, props.defaultHour ?? 9))).padStart(2, '0')
    const endHour = String(Math.max(0, Math.min(23, (props.defaultHour ?? 9) + 1))).padStart(2, '0')
    form.value = {
      title: '', event_type: 'task', all_day: false,
      startDate: today, startTime: `${startHour}:00`,
      endDate: today, endTime: `${endHour}:00`,
      location: '', description: '',
      recurrence_type: 'none', recurrence_days: [],
      recurrence_end: '', reminders: [], priority: 0,
    }
  }
}, { immediate: true })

// 工具函数（使用本地时区，避免 UTC 偏移）
const toDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const toTimeStr = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const recurrenceLabel = (type: string) => RECURRENCE_OPTIONS.find(o => o.value === type)?.label || type

const typeConfig = computed(() => {
  if (!props.event) return EVENT_TYPES.task
  return EVENT_TYPES[props.event.event_type] || EVENT_TYPES.task
})

// 验证
const canSave = computed(() => !!form.value.title.trim() && !!form.value.startDate)

// 保存
const handleSave = () => {
  const f = form.value
  const startIso = f.all_day
    ? `${f.startDate}T00:00:00`
    : `${f.startDate}T${f.startTime}:00`
  const endIso = f.all_day
    ? `${f.endDate || f.startDate}T23:59:59`
    : `${f.endDate || f.startDate}T${f.endTime}:00`

  emit('save', {
    title: f.title,
    description: f.description,
    location: f.location,
    start_time: startIso,
    end_time: endIso,
    all_day: f.all_day,
    event_type: f.event_type,
    event_subtype: '',
    color: '',
    recurrence_type: f.recurrence_type,
    recurrence_days: f.recurrence_days,
    recurrence_end: f.recurrence_end,
    reminders: f.reminders,
    priority: f.priority,
  })
}
</script>

<style scoped>
/* 遮罩 */
.ev-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}

/* 弹窗 */
.ev-modal {
  width: 520px; max-height: 85vh; overflow-y: auto;
  background: rgba(20,20,30,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

/* 头部 */
.ev-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ev-header h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; }
.ev-close {
  background: transparent; border: none; color: rgba(255,255,255,0.5);
  font-size: 24px; cursor: pointer; padding: 0; line-height: 1;
}
.ev-close:hover { color: white; }

/* 查看模式 */
.ev-view-type {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px; border-radius: 20px; font-size: 13px;
  color: white; font-weight: 500; margin-bottom: 12px;
}
.ev-view-icon { font-size: 16px; }
.ev-view-title { font-size: 22px; font-weight: 700; color: white; margin: 0 0 16px 0; }
.ev-view-row {
  display: flex; gap: 8px; align-items: center;
  font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 10px;
}
.ev-view-label { font-size: 16px; width: 24px; flex-shrink: 0; }
.ev-view-actions {
  display: flex; gap: 12px; margin-top: 20px; padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

/* 表单 */
.ev-field { margin-bottom: 16px; }
.ev-field > label {
  display: block; font-size: 13px; font-weight: 500;
  color: rgba(255,255,255,0.75); margin-bottom: 6px;
}
.ev-row { display: flex; align-items: center; justify-content: space-between; }
.ev-input {
  width: 100%; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  padding: 10px 14px; color: white; font-size: 14px;
  outline: none; font-family: inherit; transition: border-color 0.2s;
}
.ev-input:focus { border-color: var(--color-brand-blue); }
.ev-input::placeholder { color: rgba(255,255,255,0.3); }
.ev-textarea { min-height: 60px; resize: vertical; }
.ev-time { width: 160px; min-width: 160px; flex-shrink: 0; }
.ev-time-row { display: flex; gap: 10px; }

/* 类型选择器 6 格 */
.ev-type-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.ev-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; border-radius: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.ev-type-btn span:first-child { font-size: 20px; }
.ev-type-btn.active { color: white; border-width: 2px; }
.ev-type-btn:hover { background: rgba(255,255,255,0.06); }

/* 优先级 */
.ev-priority-grid { display: flex; gap: 8px; }
.ev-prio-btn {
  flex: 1; padding: 8px; border-radius: 8px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.ev-prio-btn.active { border-width: 2px; font-weight: 600; }

/* 开关 */
.ev-switch { position: relative; width: 44px; height: 24px; }
.ev-switch input { opacity: 0; width: 0; height: 0; }
.ev-slider {
  position: absolute; inset: 0; cursor: pointer;
  background: rgba(255,255,255,0.1); border-radius: 24px;
  transition: background 0.2s;
}
.ev-slider::before {
  content: ''; position: absolute; left: 3px; top: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: white; transition: transform 0.2s;
}
.ev-switch input:checked + .ev-slider { background: var(--color-brand-blue); }
.ev-switch input:checked + .ev-slider::before { transform: translateX(20px); }

/* 提醒标签 */
.ev-reminders { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ev-reminder-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(139,92,246,0.15); color: #a78bfa;
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
}
.ev-reminder-tag button {
  background: transparent; border: none; color: inherit;
  font-size: 14px; cursor: pointer; padding: 0;
}

/* 冲突警告 */
.ev-conflict-warn {
  background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.3);
  border-radius: 10px; padding: 10px 14px;
  font-size: 13px; color: #fb923c; margin-bottom: 16px;
}

/* 按钮 */
.ev-btn {
  padding: 10px 20px; border-radius: 10px; font-size: 14px;
  font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
}
.ev-btn-save {
  background: var(--color-brand-blue); color: white; flex: 1;
}
.ev-btn-save:hover { filter: brightness(1.1); }
.ev-btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.ev-btn-cancel {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
}
.ev-btn-cancel:hover { background: rgba(255,255,255,0.1); color: white; }
.ev-btn-edit {
  background: rgba(79,142,247,0.15); color: #60a5fa; flex: 1;
}
.ev-btn-danger {
  background: rgba(239,68,68,0.15); color: #f87171; flex: 1;
}

.ev-form-actions { display: flex; gap: 12px; margin-top: 8px; }

.ev-view-extras {
  display: flex; gap: 10px; margin-top: 10px;
}
.ev-btn-extra {
  background: rgba(79,142,247,0.08); color: rgba(255,255,255,0.65);
  font-size: 12px; padding: 8px 14px; flex: 1; text-align: center;
}
.ev-btn-extra:hover { background: rgba(79,142,247,0.15); color: white; }

/* 过渡动画 */
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .ev-modal { transform: translateY(20px) scale(0.97); }
.modal-fade-leave-to .ev-modal { transform: translateY(20px) scale(0.97); }

/* 滚动条 */
.ev-modal::-webkit-scrollbar { width: 4px; }
.ev-modal::-webkit-scrollbar-track { background: transparent; }
.ev-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
