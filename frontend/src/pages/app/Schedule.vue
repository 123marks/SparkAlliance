<template>
  <div class="sch-page">
    <div class="sch-topbar">
      <div class="sch-nav-left">
        <button class="sch-nav-btn" @click="navigate(-1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button class="sch-today-btn" @click="goToday">今天</button>
        <button class="sch-nav-btn" @click="navigate(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h2 class="sch-title">{{ titleText }}</h2>
      </div>

      <div class="sch-nav-right">
        <div class="sch-view-tabs">
          <button
            v-for="view in views"
            :key="view.value"
            class="sch-view-tab"
            :class="{ active: currentView === view.value }"
            @click="switchView(view.value)"
          >
            {{ view.label }}
          </button>
        </div>

        <button class="sch-ai-btn" title="AI 智能导入" @click="aiModalVisible = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          智能导入
        </button>
        <button class="sch-create-btn" @click="openCreate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建事件
        </button>
      </div>
    </div>

    <div class="sch-main">
      <div class="sch-calendar">
        <div v-if="loading" class="sch-loading">
          <div class="sch-loading-spinner"></div>
          <span>加载日程中...</span>
        </div>

        <div v-else-if="error" class="sch-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{{ error }}</span>
          <button class="sch-retry-btn" @click="refreshEvents">重试</button>
        </div>

        <template v-else>
          <CalendarMonth
            v-if="currentView === 'month'"
            :year="currentYear"
            :month="currentMonth"
            :events="filteredEvents"
            :grid="monthGrid"
            :selectedDate="selectedDate"
            :holidays="CHINESE_HOLIDAYS_2026"
            @selectDate="onSelectDate"
            @clickEvent="openView"
          />
          <CalendarWeek
            v-else-if="currentView === 'week'"
            :weekDays="weekDays"
            :events="filteredEvents"
            @clickEvent="openView"
            @createAt="onCreateAt"
          />
          <CalendarDay
            v-else
            :date="selectedDate"
            :events="filteredEvents"
            @clickEvent="openView"
            @createAt="onCreateAt"
          />

          <div v-if="filteredEvents.length === 0 && !loading" class="sch-empty-hint">
            <span>📮</span>
            <span>当前视图还没有日程，点击右上角 <strong>新建事件</strong> 开始规划</span>
          </div>
        </template>
      </div>

      <UpcomingSidebar
        :upcomingEvents="upcomingEvents"
        :events="events"
        v-model="activeTypes"
        :currentYear="currentYear"
        :currentMonth="currentMonth"
        @clickEvent="openView"
      />
    </div>

    <EventModal
      :visible="modalVisible"
      :mode="modalMode"
      :event="modalEvent"
      :defaultDate="defaultCreateDate"
      :defaultHour="defaultCreateHour"
      :conflicts="modalConflicts"
      @close="modalVisible = false"
      @save="handleSave"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <AIImportModal
      :visible="aiModalVisible"
      :semesterStart="semesterStartStr"
      @close="aiModalVisible = false"
      @imported="handleAIImport"
    />

    <Transition name="toast-fade">
      <div v-if="toast.show" class="sch-toast" :class="toast.type">
        {{ toast.msg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CalendarMonth from '../../components/schedule/CalendarMonth.vue'
import CalendarWeek from '../../components/schedule/CalendarWeek.vue'
import CalendarDay from '../../components/schedule/CalendarDay.vue'
import EventModal from '../../components/schedule/EventModal.vue'
import UpcomingSidebar from '../../components/schedule/UpcomingSidebar.vue'
import AIImportModal from '../../components/schedule/AIImportModal.vue'
import {
  useSchedule,
  EVENT_TYPES,
  type Conflict,
  type EventFormData,
  type ScheduleEvent,
} from '../../composables/useSchedule'
import {
  fromLocalDateStr,
  getActiveQueryRange,
  getMonthGrid,
  getWeekDays,
  toLocalDateStr,
} from '../../composables/useCalendar'
import { expandRecurringEvents } from '../../composables/useRecurrence'
import { useReminder } from '../../composables/useReminder'
import { useSemester } from '../../composables/useSemester'
import { CHINESE_HOLIDAYS_2026 } from '../../data/holidays'

type ViewType = 'month' | 'week' | 'day'

const route = useRoute()
const router = useRouter()

const {
  events,
  loading,
  error,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  detectConflicts,
  upcomingEvents,
} = useSchedule()

const { requestPermission, scheduleReminders } = useReminder()
const { config, getWeekNumber, isExamWeek } = useSemester()

const views = [
  { label: '月', value: 'month' as ViewType },
  { label: '周', value: 'week' as ViewType },
  { label: '日', value: 'day' as ViewType },
]

const initView = (route.query.view as ViewType) || 'month'
const initDateStr = route.query.date as string | undefined
const initDate = initDateStr ? fromLocalDateStr(initDateStr) : new Date()

const currentView = ref<ViewType>(initView)
const selectedDate = ref(initDate)
const currentYear = ref(initDate.getFullYear())
const currentMonth = ref(initDate.getMonth() + 1)
const activeTypes = ref<string[]>(Object.keys(EVENT_TYPES))

const modalVisible = ref(false)
const modalMode = ref<'create' | 'edit' | 'view'>('create')
const modalEvent = ref<ScheduleEvent | null>(null)
const modalConflicts = ref<Conflict[]>([])
const defaultCreateDate = ref('')
const defaultCreateHour = ref<number | undefined>(undefined)

const aiModalVisible = ref(false)
const toast = ref({ show: false, msg: '', type: 'success' })

const monthGrid = computed(() => getMonthGrid(currentYear.value, currentMonth.value))
const weekDays = computed(() => getWeekDays(selectedDate.value))
const semesterStartStr = computed(() => config.value.startDate)

const filteredEvents = computed(() => {
  const typedEvents = events.value.filter(event => activeTypes.value.includes(event.event_type))
  const { start, end } = getActiveQueryRange(
    currentView.value,
    selectedDate.value,
    currentYear.value,
    currentMonth.value,
  )

  return expandRecurringEvents(typedEvents, start, end)
})

const titleText = computed(() => {
  const weekNum = getWeekNumber(selectedDate.value)
  const weekSuffix = weekNum
    ? ` · 第 ${weekNum} 周${isExamWeek(selectedDate.value) ? ' · 考试周' : ''}`
    : ''

  if (currentView.value === 'month') {
    return `${currentYear.value} 年 ${currentMonth.value} 月${weekSuffix}`
  }

  if (currentView.value === 'week') {
    const [start, , , , , , end] = weekDays.value
    return `${start.getMonth() + 1} 月 ${start.getDate()} 日 - ${end.getMonth() + 1} 月 ${end.getDate()} 日${weekSuffix}`
  }

  return `${selectedDate.value.getFullYear()} 年 ${selectedDate.value.getMonth() + 1} 月 ${selectedDate.value.getDate()} 日${weekSuffix}`
})

const syncToUrl = () => {
  router.replace({
    query: {
      view: currentView.value,
      date: toLocalDateStr(selectedDate.value),
    },
  })
}

watch([currentView, selectedDate], syncToUrl)
watch(selectedDate, (date) => {
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth() + 1
})

const switchView = (view: ViewType) => {
  currentView.value = view
}

const navigate = (dir: number) => {
  if (currentView.value === 'month') {
    currentMonth.value += dir
    if (currentMonth.value > 12) {
      currentMonth.value = 1
      currentYear.value += 1
    }
    if (currentMonth.value < 1) {
      currentMonth.value = 12
      currentYear.value -= 1
    }
    selectedDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
    return
  }

  const nextDate = new Date(selectedDate.value)
  nextDate.setDate(nextDate.getDate() + (currentView.value === 'week' ? 7 * dir : dir))
  selectedDate.value = nextDate
}

const goToday = () => {
  selectedDate.value = new Date()
}

const onSelectDate = (date: Date) => {
  selectedDate.value = date
  currentView.value = 'day'
}

const openCreate = () => {
  modalMode.value = 'create'
  modalEvent.value = null
  defaultCreateDate.value = toLocalDateStr(selectedDate.value)
  defaultCreateHour.value = undefined
  modalConflicts.value = []
  modalVisible.value = true
}

const onCreateAt = (date: Date, hour: number) => {
  modalMode.value = 'create'
  modalEvent.value = null
  defaultCreateDate.value = toLocalDateStr(date)
  defaultCreateHour.value = hour
  modalConflicts.value = []
  modalVisible.value = true
}

const openView = (event: ScheduleEvent) => {
  modalMode.value = 'view'
  modalEvent.value = event
  modalVisible.value = true
}

const handleEdit = (event: ScheduleEvent) => {
  modalMode.value = 'edit'
  modalEvent.value = event
}

const handleSave = async (form: EventFormData) => {
  const conflicts = detectConflicts(form.start_time, form.end_time, modalEvent.value?.id)
  if (conflicts.length > 0) {
    modalConflicts.value = conflicts
  }

  if (form.reminders.length > 0) {
    const granted = await requestPermission()
    if (!granted) {
      showToast('浏览器通知未授权，将只保留页面内提醒', 'error')
    }
  }

  const ok = modalMode.value === 'edit' && modalEvent.value
    ? await updateEvent(modalEvent.value.id, form)
    : await createEvent(form)

  if (!ok) {
    showToast('操作失败，请重试', 'error')
    return
  }

  showToast(modalMode.value === 'edit' ? '事件已更新' : '事件已创建', 'success')
  modalVisible.value = false
  await refreshEvents()
}

const handleDelete = async (event: ScheduleEvent) => {
  if (!confirm(`确定删除「${event.title}」吗？`)) return

  const ok = await deleteEvent(event.id)
  if (!ok) {
    showToast('删除失败', 'error')
    return
  }

  showToast('事件已删除', 'success')
  modalVisible.value = false
  await refreshEvents()
}

const refreshEvents = async () => {
  const { start, end } = getActiveQueryRange(
    currentView.value,
    selectedDate.value,
    currentYear.value,
    currentMonth.value,
  )

  await fetchEvents(start, end)
  scheduleReminders(events.value)
}

watch([currentView, selectedDate], refreshEvents)
onMounted(refreshEvents)

const onReminderEvent = (event: Event) => {
  const detail = (event as CustomEvent).detail
  if (detail?.message) {
    showToast(detail.message, 'success')
  }
}

onMounted(() => window.addEventListener('schedule-reminder', onReminderEvent))
onUnmounted(() => window.removeEventListener('schedule-reminder', onReminderEvent))

const handleAIImport = async (importedForms: EventFormData[]) => {
  let successCount = 0
  for (const form of importedForms) {
    const ok = await createEvent(form)
    if (ok) successCount += 1
  }

  if (importedForms.length > 0) {
    const earliest = importedForms.reduce((left, right) =>
      new Date(left.start_time) < new Date(right.start_time) ? left : right,
    )
    selectedDate.value = new Date(earliest.start_time)
  }

  aiModalVisible.value = false
  showToast(`成功导入 ${successCount} 个事件`, 'success')
  await refreshEvents()
}

const showToast = (msg: string, type: string) => {
  toast.value = { show: true, msg, type }
  window.setTimeout(() => {
    toast.value.show = false
  }, 2500)
}
</script>

<style scoped>
.sch-page {
  display: flex; flex-direction: column; gap: 20px;
  padding: 24px 28px; height: 100%; min-height: 0;
}

.sch-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.sch-nav-left { display: flex; align-items: center; gap: 6px; }
.sch-nav-right { display: flex; align-items: center; gap: 12px; }

.sch-nav-btn {
  background: transparent; border: none;
  color: rgba(255, 255, 255, 0.35); width: 36px; height: 36px;
  border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.sch-nav-btn:hover {
  background: rgba(255, 255, 255, 0.06); color: white;
  transform: scale(1.05);
}

.sch-today-btn {
  background: transparent; border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.65); padding: 6px 18px;
  border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
}
.sch-today-btn:hover {
  background: rgba(79, 142, 247, 0.08); color: var(--color-brand-blue);
  border-color: rgba(79, 142, 247, 0.2);
}

.sch-title {
  font-size: 20px; font-weight: 700; color: white;
  margin: 0 0 0 14px; letter-spacing: -0.3px;
}

.sch-view-tabs {
  display: flex; background: rgba(255, 255, 255, 0.03);
  border-radius: 10px; padding: 3px; border: 1px solid rgba(255, 255, 255, 0.05);
}
.sch-view-tab {
  padding: 6px 18px; border-radius: 8px; border: none;
  background: transparent; color: rgba(255, 255, 255, 0.4);
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.2s ease;
}
.sch-view-tab:hover { color: rgba(255, 255, 255, 0.7); }
.sch-view-tab.active {
  background: var(--color-brand-blue); color: white;
  box-shadow: 0 2px 10px rgba(79, 142, 247, 0.3);
}

.sch-ai-btn {
  display: flex; align-items: center; gap: 4px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(79, 142, 247, 0.12));
  border: 1px solid rgba(139, 92, 246, 0.18);
  color: rgba(255, 255, 255, 0.75); padding: 8px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.25s ease;
  position: relative; overflow: hidden;
}
.sch-ai-btn::before {
  content: '';
  position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
  transition: left 0.6s ease;
}
.sch-ai-btn:hover::before { left: 120%; }
.sch-ai-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(79, 142, 247, 0.22));
  border-color: rgba(139, 92, 246, 0.35); color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.18);
}

.sch-create-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--color-brand-blue); border: none;
  color: white; padding: 8px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 12px rgba(79, 142, 247, 0.25);
}
.sch-create-btn:hover {
  filter: brightness(1.1); transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(79, 142, 247, 0.35);
}

.sch-main {
  display: flex; gap: 24px; flex: 1; min-height: 0;
}
.sch-calendar { flex: 1; min-width: 0; position: relative; }

.sch-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 100px 0;
  color: rgba(255, 255, 255, 0.35); font-size: 14px;
}
.sch-loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.06);
  border-top-color: var(--color-brand-blue);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.sch-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 100px 0;
  color: rgba(255, 255, 255, 0.45); font-size: 14px;
}
.sch-retry-btn {
  background: rgba(79, 142, 247, 0.1); border: 1px solid rgba(79, 142, 247, 0.18);
  color: var(--color-brand-blue); padding: 6px 22px; border-radius: 8px;
  font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.sch-retry-btn:hover { background: rgba(79, 142, 247, 0.18); }

.sch-empty-hint {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 20px 0;
  font-size: 13px; color: rgba(255, 255, 255, 0.25);
}
.sch-empty-hint strong { color: var(--color-brand-blue); }

.sch-toast {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  padding: 12px 28px; border-radius: 12px;
  font-size: 14px; font-weight: 500; z-index: 5000;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.sch-toast.success {
  background: rgba(16, 185, 129, 0.1); color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.12);
}
.sch-toast.error {
  background: rgba(239, 68, 68, 0.1); color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.12);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translate(-50%, 20px); }

@media (max-width: 900px) {
  .sch-page { padding: 16px; }
  .sch-main { flex-direction: column; }
  .sch-topbar { flex-wrap: wrap; gap: 8px; }
  .sch-nav-right { flex-wrap: wrap; }
}
</style>
