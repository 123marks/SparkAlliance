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

            <!-- 事件类型（v9: 支持自定义类型） -->
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
                  type="button"
                >
                  <span>{{ cfg.icon }}</span>
                  <span>{{ cfg.label }}</span>
                </button>
                <!-- 自定义类型 -->
                <button
                  v-for="ct in customTypes"
                  :key="'ct-' + ct.key"
                  class="ev-type-btn ev-type-custom"
                  :class="{ active: form.event_type === ct.key }"
                  :style="form.event_type === ct.key ? { background: `linear-gradient(135deg, ${ct.color}, ${ct.color}dd)`, borderColor: ct.color } : {}"
                  @click="form.event_type = ct.key as EventType"
                  type="button"
                  :title="`自定义类型 · 长按可删除`"
                  @contextmenu.prevent="removeCustomType(ct.key)"
                >
                  <span>{{ ct.icon }}</span>
                  <span>{{ ct.label }}</span>
                </button>
                <!-- 添加自定义类型入口 -->
                <button
                  class="ev-type-btn ev-type-add"
                  @click="showAddCustomType = !showAddCustomType"
                  type="button"
                  title="添加自定义类型"
                >
                  <span>＋</span>
                  <span>自定义</span>
                </button>
              </div>
              <!-- 自定义类型创建表单 -->
              <Transition name="ev-slide">
                <div v-if="showAddCustomType" class="ev-custom-type-form">
                  <input v-model="customTypeDraft.label" placeholder="类型名（如 运动/社团）" maxlength="6" class="ev-input ev-custom-input-label" />
                  <div class="ev-custom-emoji-row">
                    <button v-for="e in CUSTOM_EMOJI_POOL" :key="e" type="button" class="ev-custom-emoji" :class="{ active: customTypeDraft.icon === e }" @click="customTypeDraft.icon = e">{{ e }}</button>
                  </div>
                  <div class="ev-custom-color-row">
                    <button v-for="c in CUSTOM_COLOR_POOL" :key="c" type="button" class="ev-custom-color" :class="{ active: customTypeDraft.color === c }" :style="{ background: c }" @click="customTypeDraft.color = c"></button>
                  </div>
                  <div class="ev-custom-actions">
                    <button type="button" class="ev-btn ev-btn-cancel" @click="showAddCustomType = false">取消</button>
                    <button type="button" class="ev-btn ev-btn-save" :disabled="!customTypeDraft.label.trim()" @click="addCustomType">保存类型</button>
                  </div>
                </div>
              </Transition>
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

            <!-- 重复（v9: 自定义下拉，代替原生 select 的空白区域） -->
            <div class="ev-field">
              <label>重复</label>
              <div class="ev-custom-select" :class="{ open: recurrenceDropdownOpen }" @click.stop="recurrenceDropdownOpen = !recurrenceDropdownOpen">
                <div class="ev-cs-display">
                  <span class="ev-cs-icon">🔁</span>
                  <span>{{ currentRecurrenceLabel }}</span>
                  <svg class="ev-cs-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <Transition name="ev-dropdown">
                  <div v-if="recurrenceDropdownOpen" class="ev-cs-menu" @click.stop>
                    <button
                      v-for="opt in RECURRENCE_OPTIONS"
                      :key="opt.value"
                      type="button"
                      class="ev-cs-option"
                      :class="{ active: form.recurrence_type === opt.value }"
                      @click="selectRecurrence(opt.value)"
                    >
                      <span class="ev-cs-opt-icon">{{ RECURRENCE_ICONS[opt.value] || '•' }}</span>
                      <span class="ev-cs-opt-label">{{ opt.label }}</span>
                      <span v-if="form.recurrence_type === opt.value" class="ev-cs-check">✓</span>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
            <!-- 重复日（周重复时选择星期几） -->
            <div v-if="form.recurrence_type === 'weekly' || form.recurrence_type === 'biweekly'" class="ev-field">
              <label>重复日</label>
              <div class="ev-weekday-picker">
                <button
                  v-for="d in WEEKDAY_OPTIONS"
                  :key="d.value"
                  type="button"
                  class="ev-weekday-btn"
                  :class="{ active: form.recurrence_days.includes(d.value) }"
                  @click="toggleWeekday(d.value)"
                >{{ d.label }}</button>
              </div>
            </div>
            <!-- 重复结束日期 -->
            <div v-if="form.recurrence_type !== 'none'" class="ev-field">
              <label>重复截止</label>
              <input v-model="form.recurrence_end" type="date" class="ev-input" placeholder="不填则永久重复" />
              <span v-if="!form.recurrence_end" class="ev-hint">不设截止日期将持续重复</span>
            </div>

            <!-- 提醒（v9: 自定义下拉 + 快速 chip 选择） -->
            <div class="ev-field">
              <label>提醒</label>
              <div class="ev-custom-select" :class="{ open: reminderDropdownOpen }" @click.stop="reminderDropdownOpen = !reminderDropdownOpen">
                <div class="ev-cs-display">
                  <span class="ev-cs-icon">🔔</span>
                  <span>{{ form.reminders.length ? `已添加 ${form.reminders.length} 条提醒` : '点击添加提醒' }}</span>
                  <svg class="ev-cs-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <Transition name="ev-dropdown">
                  <div v-if="reminderDropdownOpen" class="ev-cs-menu" @click.stop>
                    <button
                      v-for="opt in REMINDER_OPTIONS"
                      :key="opt.value"
                      type="button"
                      class="ev-cs-option"
                      :class="{ active: form.reminders.some(r => r.value === opt.value) }"
                      @click="toggleReminderValue(opt.value)"
                    >
                      <span class="ev-cs-opt-icon">⏰</span>
                      <span class="ev-cs-opt-label">{{ opt.label }}</span>
                      <span v-if="form.reminders.some(r => r.value === opt.value)" class="ev-cs-check">✓</span>
                    </button>
                  </div>
                </Transition>
              </div>
              <div class="ev-reminders" v-if="form.reminders.length">
                <span class="ev-reminder-tag" v-for="(r, i) in form.reminders" :key="i">
                  提前 {{ r.value >= 60 ? `${r.value / 60}小时` : `${r.value}分钟` }}
                  <button type="button" @click="form.reminders.splice(i, 1)">×</button>
                </span>
              </div>
            </div>

            <!-- 优先级（v9: 视觉强化 + hint） -->
            <div class="ev-field">
              <label>优先级</label>
              <div class="ev-priority-grid">
                <button v-for="p in priorities" :key="p.value" type="button" class="ev-prio-btn"
                  :class="{ active: form.priority === p.value }"
                  :style="form.priority === p.value ? { borderColor: p.color, color: p.color, background: p.color + '15' } : {}"
                  @click="form.priority = p.value"
                  :title="p.hint"
                >
                  <span class="ev-prio-icon">{{ p.icon }}</span>
                  <span class="ev-prio-label">{{ p.label }}</span>
                  <span class="ev-prio-hint">{{ p.hint }}</span>
                </button>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  EVENT_TYPES, RECURRENCE_OPTIONS, REMINDER_OPTIONS,
  type EventType, type ScheduleEvent, type Conflict,
  type EventFormData
} from '../../composables/useSchedule'
import { loadPersist, savePersist, subscribePersist } from '../../utils/persist'

// v9: 重复类型图标
const RECURRENCE_ICONS: Record<string, string> = {
  none: '⭕',
  daily: '📆',
  weekly: '📅',
  biweekly: '🗓️',
  monthly: '📇',
}

// v9: 自定义类型配置
const CUSTOM_TYPES_KEY = 'spark_schedule_custom_types_v1'
const CUSTOM_EMOJI_POOL = ['🏃','🎨','🎮','📷','🎵','🍔','🛒','🌳','✈️','🎬','🏀','⚽','🎯','💼','🎓','🧘','🛏️','☕','💡','🎉','🔬','🎭','🏝️','🧩']
const CUSTOM_COLOR_POOL = ['#f472b6','#a855f7','#3b82f6','#14b8a6','#22c55e','#eab308','#f97316','#ef4444','#64748b']

interface CustomEventType { key: string; label: string; icon: string; color: string }

const customTypes = ref<CustomEventType[]>(loadPersist<CustomEventType[]>(CUSTOM_TYPES_KEY, []))
subscribePersist<CustomEventType[]>(CUSTOM_TYPES_KEY, (v) => { if (Array.isArray(v)) customTypes.value = v })

const showAddCustomType = ref(false)
const customTypeDraft = ref<{ label: string; icon: string; color: string }>({ label: '', icon: CUSTOM_EMOJI_POOL[0], color: CUSTOM_COLOR_POOL[0] })

function addCustomType() {
  const label = customTypeDraft.value.label.trim()
  if (!label) return
  // key 生成：custom_ + 短哈希
  const key = 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const next: CustomEventType = { key, label, icon: customTypeDraft.value.icon, color: customTypeDraft.value.color }
  customTypes.value.push(next)
  savePersist(CUSTOM_TYPES_KEY, customTypes.value)
  form.value.event_type = key as EventType
  showAddCustomType.value = false
  customTypeDraft.value = { label: '', icon: CUSTOM_EMOJI_POOL[0], color: CUSTOM_COLOR_POOL[0] }
}

function removeCustomType(key: string) {
  if (!confirm('删除此自定义类型？已使用该类型的事件将回退到"任务"')) return
  const idx = customTypes.value.findIndex((t) => t.key === key)
  if (idx < 0) return
  customTypes.value.splice(idx, 1)
  savePersist(CUSTOM_TYPES_KEY, customTypes.value)
  if (form.value.event_type === key) form.value.event_type = 'task'
}

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

// 优先级选项（v9: 视觉更强的 icon + 说明）
const priorities = [
  { label: '低', value: -1, color: '#60a5fa', icon: '⬇️', hint: '可推迟' },
  { label: '普通', value: 0, color: '#9ca3af', icon: '•', hint: '日常' },
  { label: '高', value: 1, color: '#f97316', icon: '⬆️', hint: '本周要完成' },
  { label: '紧急', value: 2, color: '#ef4444', icon: '🔥', hint: '今日必做' },
]

// 冲突（来自父组件传入）
const conflicts = computed(() => props.conflicts || [])

// v9: 自定义下拉状态
const reminderDropdownOpen = ref(false)
const recurrenceDropdownOpen = ref(false)

const currentRecurrenceLabel = computed(() => {
  return RECURRENCE_OPTIONS.find((o) => o.value === form.value.recurrence_type)?.label || '不重复'
})

function selectRecurrence(val: string) {
  form.value.recurrence_type = val
  recurrenceDropdownOpen.value = false
}

function toggleReminderValue(val: number) {
  const idx = form.value.reminders.findIndex((r) => r.value === val)
  if (idx >= 0) form.value.reminders.splice(idx, 1)
  else form.value.reminders.push({ type: 'minute', value: val })
}

// 点击外部关闭下拉
function onDocClick(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (!el.closest('.ev-custom-select')) {
    reminderDropdownOpen.value = false
    recurrenceDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

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

const WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

function toggleWeekday(day: number) {
  const idx = form.value.recurrence_days.indexOf(day)
  if (idx >= 0) form.value.recurrence_days.splice(idx, 1)
  else form.value.recurrence_days.push(day)
}

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

/* ============ v9: 自定义类型按钮 + 添加入口 ============ */
.ev-type-btn { position: relative; transition: all 0.18s; }
.ev-type-custom { border-style: dashed; }
.ev-type-add {
  border: 1px dashed rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.015);
  color: rgba(255,255,255,0.4);
}
.ev-type-add:hover {
  border-color: rgba(139,92,246,0.35);
  color: #a78bfa;
  background: rgba(139,92,246,0.06);
  transform: translateY(-1px);
}
.ev-type-add span:first-child { font-size: 22px; line-height: 1; }

.ev-custom-type-form {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 10px;
  background: rgba(139,92,246,0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ev-custom-input-label {
  margin: 0 !important;
}
.ev-custom-emoji-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
}
.ev-custom-emoji {
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.12s;
}
.ev-custom-emoji:hover { background: rgba(255,255,255,0.08); transform: scale(1.12); }
.ev-custom-emoji.active {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.4);
}
.ev-custom-color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ev-custom-color {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.1);
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}
.ev-custom-color:hover { transform: scale(1.15); }
.ev-custom-color.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
}
.ev-custom-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.ev-slide-enter-active, .ev-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.ev-slide-enter-from, .ev-slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-6px);
}
.ev-slide-enter-to, .ev-slide-leave-from {
  opacity: 1;
  max-height: 320px;
}

/* ============ v9: 自定义下拉（提醒/重复） ============ */
.ev-custom-select {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  user-select: none;
}
.ev-custom-select:hover {
  border-color: rgba(139,92,246,0.25);
  background: rgba(139,92,246,0.03);
}
.ev-custom-select.open {
  border-color: rgba(139,92,246,0.4);
  background: rgba(139,92,246,0.06);
}
.ev-cs-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  color: rgba(255,255,255,0.85);
  font-size: 14px;
}
.ev-cs-icon { font-size: 16px; flex-shrink: 0; }
.ev-cs-chev {
  margin-left: auto;
  color: rgba(255,255,255,0.4);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}
.ev-custom-select.open .ev-cs-chev { transform: rotate(180deg); color: #a78bfa; }

.ev-cs-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  max-height: 260px;
  overflow-y: auto;
  background: rgba(18,14,32,0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139,92,246,0.2);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.5);
  padding: 4px;
  z-index: 20;
}
.ev-cs-menu::-webkit-scrollbar { width: 4px; }
.ev-cs-menu::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 4px; }

.ev-cs-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.ev-cs-option:hover {
  background: rgba(139,92,246,0.12);
  color: white;
}
.ev-cs-option.active {
  background: rgba(139,92,246,0.18);
  color: #c4b5fd;
  font-weight: 600;
}
.ev-cs-opt-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.ev-cs-opt-label { flex: 1; }
.ev-cs-check { color: #10b981; font-weight: 700; }

.ev-dropdown-enter-active, .ev-dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}
.ev-dropdown-enter-from, .ev-dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.9) translateY(-4px);
}

/* ============ v9: 优先级升级 ============ */
.ev-priority-grid { gap: 6px; }
.ev-prio-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  min-height: 64px;
}
.ev-prio-btn.active { border-width: 2px; font-weight: 700; box-shadow: 0 0 0 3px rgba(255,255,255,0.02) inset; }
.ev-prio-icon { font-size: 18px; line-height: 1; }
.ev-prio-label { font-size: 13px; font-weight: 600; }
.ev-prio-hint { font-size: 10px; opacity: 0.75; }

/* 重复日：周几选择（与表单其他控件视觉对齐） */
.ev-weekday-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
}
.ev-weekday-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s, transform 0.12s;
}
.ev-weekday-btn:hover {
  border-color: rgba(139,92,246,0.35);
  color: rgba(255,255,255,0.85);
  background: rgba(139,92,246,0.08);
  transform: translateY(-1px);
}
.ev-weekday-btn.active {
  border-color: rgba(79,142,247,0.65);
  color: white;
  background: linear-gradient(145deg, rgba(79,142,247,0.35), rgba(139,92,246,0.22));
  box-shadow:
    0 0 0 1px rgba(79,142,247,0.25),
    0 4px 14px rgba(79,142,247,0.18);
}
</style>
