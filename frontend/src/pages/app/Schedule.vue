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

    <!-- 今日总览 hero（参考图：智能日程顶条） -->
    <section class="sch-hero" aria-label="今日日程总览">
      <div class="sch-hero-art" aria-hidden="true">
        <img src="/dashboard/vortex.png" alt="" loading="lazy" />
      </div>
      <div class="sch-hero-copy">
        <h3>今天，按更轻松但更高效的方式推进</h3>
        <p>愿你的每一小时，都在靠近重要的事。</p>
      </div>
      <div class="sch-hero-stats">
        <div class="sch-hs-item">
          <strong>{{ todayOverview.total }}</strong>
          <span>今日事项</span>
          <small>已完成 {{ todayOverview.completed }}</small>
        </div>
        <div class="sch-hs-item">
          <strong>{{ todayOverview.scheduledHours }}<i>h</i></strong>
          <span>排程时长</span>
          <small>今日已安排</small>
        </div>
        <div class="sch-hs-item">
          <strong>{{ todayOverview.freeHours }}<i>h</i></strong>
          <span>空闲时间</span>
          <small>8:00-22:00 可利用</small>
        </div>
        <div class="sch-hs-item" :class="{ 'sch-hs-warn': todayOverview.conflicts > 0 }">
          <strong>{{ todayOverview.conflicts }}</strong>
          <span>冲突预警</span>
          <small>{{ todayOverview.conflicts > 0 ? '待处理' : '一切顺畅' }}</small>
        </div>
      </div>
      <div class="sch-hero-ring" :title="`节奏分由排程覆盖、完成率与冲突数派生：${todayOverview.rhythm}/100`">
        <svg viewBox="0 0 100 100">
          <circle class="shr-bg" cx="50" cy="50" r="42" />
          <circle class="shr-fg" cx="50" cy="50" r="42" :stroke-dashoffset="rhythmOffset" />
        </svg>
        <div class="shr-center">
          <strong>{{ todayOverview.rhythm }}</strong>
          <span>节奏分</span>
        </div>
      </div>
      <div class="sch-hero-entries">
        <button class="sch-entry sch-entry-planner" type="button" @click="openPlannerPanel">
          <span class="sch-entry-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </span>
          <span class="sch-entry-copy"><strong>星火规划</strong><small>目标拆解与推进</small></span>
          <span class="sch-entry-arrow" aria-hidden="true">→</span>
        </button>
        <button class="sch-entry sch-entry-tarot" type="button" @click="openTarotView">
          <span class="sch-entry-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 8l1.5 2.6L16 11l-2 2 .5 2.9L12 14.5 9.5 15.9 10 13l-2-2 2.5-.4z"/></svg>
          </span>
          <span class="sch-entry-copy"><strong>星火卡罗牌</strong><small>今日心态指引</small></span>
          <span class="sch-entry-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>

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
            <span>当前视图还没有日程，点击 <button type="button" class="sch-empty-cta" @click="openCreate">新建事件</button> 开始规划</span>
          </div>
        </template>
      </div>

      <ScheduleInsights
        class="sch-insights"
        :backlog="backlogTasks"
        :backlog-state="backlogState"
        :conflict-pairs="conflictPairs"
        :reflow="reflowSuggestion"
        :focus-window="focusWindowLabel"
        @schedule-task="handleScheduleTask"
        @jump-event="jumpToEvent"
        @apply-reflow="applyReflow"
        @reload-backlog="loadBacklog"
      />

      <UpcomingSidebar
        :upcomingEvents="upcomingEvents"
        :events="events"
        v-model="activeTypes"
        :currentYear="currentYear"
        :currentMonth="currentMonth"
        @clickEvent="openView"
      />
    </div>

    <!-- 底部快捷行（参考图：复盘 / 习惯 / 学习资源 / 专注） -->
    <div class="sch-quick-row">
      <button class="sch-qcard" type="button" @click="openPlannerTab('history')">
        <span class="sch-qcard-icon sch-qi-review" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
        </span>
        <span class="sch-qcard-copy">
          <strong>今日复盘</strong>
          <small>{{ todayOverview.completed > 0 ? `已完成 ${todayOverview.completed} 项，值得记录` : '回顾今天，沉淀成长' }}</small>
        </span>
        <span class="sch-qcard-cta">开始复盘</span>
      </button>
      <button class="sch-qcard" type="button" @click="openPlannerTab('habits')">
        <span class="sch-qcard-icon sch-qi-habit" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </span>
        <span class="sch-qcard-copy">
          <strong>习惯打卡</strong>
          <small>坚持你的微习惯</small>
        </span>
        <span class="sch-qcard-cta">去打卡</span>
      </button>
      <router-link class="sch-qcard" to="/app/resources">
        <span class="sch-qcard-icon sch-qi-res" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </span>
        <span class="sch-qcard-copy">
          <strong>学习资源推荐</strong>
          <small>为你筛选优质内容</small>
        </span>
        <span class="sch-qcard-cta">去发现</span>
      </router-link>
      <router-link class="sch-qcard" to="/app/learn">
        <span class="sch-qcard-icon sch-qi-focus" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </span>
        <span class="sch-qcard-copy">
          <strong>专注模式</strong>
          <small>{{ focusWindowLabel ? `最佳窗口 ${focusWindowLabel}` : '沉浸开始，屏蔽干扰' }}</small>
        </span>
        <span class="sch-qcard-cta">立即开始</span>
      </router-link>
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
      @pushToPlanner="handlePushToPlanner"
      @shareToWall="handleShareToWall"
    />

    <AIImportModal
      :visible="aiModalVisible"
      :semesterStart="semesterStartStr"
      @close="aiModalVisible = false"
      @imported="handleAIImport"
    />

    <!-- v7.4: 自定义删除确认弹窗（替代原生 confirm） -->
    <Transition name="confirm-fade">
      <div v-if="deleteConfirm.show" class="sch-confirm-overlay" @click.self="deleteConfirm.show = false">
        <div class="sch-confirm-modal">
          <div class="sch-confirm-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="sch-confirm-title">删除这个事件？</h3>
          <p class="sch-confirm-desc">
            <strong>「{{ deleteConfirm.title }}」</strong>
            <span>将被永久删除，此操作无法撤销</span>
          </p>
          <div class="sch-confirm-actions">
            <button class="sch-confirm-btn sch-confirm-cancel" @click="deleteConfirm.show = false">
              取消
            </button>
            <button class="sch-confirm-btn sch-confirm-delete" @click="confirmDeleteExecute">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
import ScheduleInsights from '../../components/schedule/ScheduleInsights.vue'
import { usePlanner, type PlannerTask } from '../../composables/usePlanner'
import { supabase } from '../../supabase'
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

const props = withDefaults(defineProps<{
  /** 开发视觉 fixture：注入确定性事件，不请求 Supabase */
  visualFixture?: boolean
}>(), { visualFixture: false })

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

/** 今日总览：全部由当天真实事件派生（fixture 下为确定性数据） */
const todayOverview = computed(() => {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const todays = expandRecurringEvents(events.value, dayStart, dayEnd)
    .filter(e => e.status !== 'cancelled')
  const total = todays.length
  const completed = todays.filter(e => {
    const end = e.end_time ? new Date(e.end_time) : new Date(e.start_time)
    return end.getTime() < now.getTime()
  }).length

  const timed = todays
    .filter(e => !e.all_day && e.end_time)
    .map(e => ({ s: new Date(e.start_time).getTime(), e: new Date(e.end_time as string).getTime() }))
    .filter(t => t.e > t.s)
    .sort((a, b) => a.s - b.s)

  let scheduledMin = 0
  for (const t of timed) scheduledMin += (t.e - t.s) / 60000

  let conflicts = 0
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].s < timed[i].e && timed[j].e > timed[i].s) conflicts += 1
    }
  }

  // 8:00-22:00 窗口内合并忙碌区间后的剩余空闲
  const winStart = new Date(dayStart); winStart.setHours(8)
  const winEnd = new Date(dayStart); winEnd.setHours(22)
  let busyMs = 0
  let cursor = winStart.getTime()
  for (const t of timed) {
    const s = Math.max(t.s, winStart.getTime())
    const e = Math.min(t.e, winEnd.getTime())
    if (e <= s || e <= cursor) continue
    busyMs += e - Math.max(s, cursor)
    cursor = Math.max(cursor, e)
  }
  const freeMin = Math.max(0, 14 * 60 - busyMs / 60000)

  // 节奏分（派生指标）：50 基础 + 排程覆盖(≤8h 计 30) + 完成率(20) - 冲突罚分(12/个)
  const coverage = Math.min(1, scheduledMin / (8 * 60))
  const completionRatio = total > 0 ? completed / total : 0
  const rhythm = Math.max(5, Math.min(100, Math.round(50 + coverage * 30 + completionRatio * 20 - conflicts * 12)))

  return {
    total,
    completed,
    scheduledHours: (scheduledMin / 60).toFixed(1),
    freeHours: (freeMin / 60).toFixed(1),
    conflicts,
    rhythm,
  }
})

const rhythmOffset = computed(() => {
  const circumference = 2 * Math.PI * 42
  return circumference - (todayOverview.value.rhythm / 100) * circumference
})

function openPlannerPanel() {
  router.replace({ query: { ...route.query, module: 'planner' } })
}
function openPlannerTab(tab: string) {
  router.replace({ query: { ...route.query, module: 'planner', tab } })
}
function openTarotView() {
  router.replace({ query: { ...route.query, module: 'tarot' } })
}

// ====== 待安排事项 + AI 编排建议 ======
const { pushTaskToSchedule } = usePlanner()
const backlogTasks = ref<PlannerTask[]>([])
const backlogState = ref<'loading' | 'ready' | 'error'>('loading')

const loadBacklog = async () => {
  if (props.visualFixture) {
    backlogTasks.value = [
      { id: 'vfb1', title: '阅读《影响力》第 6 章', difficulty: 2, estimated_minutes: 30, due_date: localDateStr(0), is_completed: false, status: 'pending', source: 'manual', sort_order: 0, goalTitle: '学习' },
      { id: 'vfb2', title: '整理灵感笔记', difficulty: 1, estimated_minutes: 30, due_date: localDateStr(1), is_completed: false, status: 'pending', source: 'manual', sort_order: 1, goalTitle: '个人成长' },
      { id: 'vfb3', title: '完成竞赛报名表', difficulty: 3, estimated_minutes: 60, due_date: localDateStr(0), is_completed: false, status: 'in_progress', source: 'manual', sort_order: 2, goalTitle: '工作' },
      { id: 'vfb4', title: '联系合作伙伴确认方案', difficulty: 4, estimated_minutes: 30, due_date: localDateStr(-1), is_completed: false, status: 'pending', source: 'manual', sort_order: 3, goalTitle: '协作' },
      { id: 'vfb5', title: '准备周报材料', difficulty: 3, estimated_minutes: 45, due_date: localDateStr(2), is_completed: false, status: 'pending', source: 'manual', sort_order: 4, goalTitle: '工作' },
    ]
    backlogState.value = 'ready'
    return
  }
  backlogState.value = 'loading'
  try {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) {
      backlogTasks.value = []
      backlogState.value = 'ready'
      return
    }
    const { data, error: qError } = await supabase
      .from('planner_tasks')
      .select('*, goals(title)')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .is('schedule_event_id', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(7)
    if (qError) throw qError
    backlogTasks.value = (data || []).map((t: PlannerTask & { goals?: { title?: string } | null }) => ({
      ...t,
      goalTitle: t.goals?.title || '快捷任务',
    }))
    backlogState.value = 'ready'
  } catch (e) {
    console.warn('[Schedule] backlog load failed:', e)
    backlogState.value = 'error'
  }
}

function localDateStr(dayOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return toLocalDateStr(d)
}

/** 当天已排定（非全天）事件的时间段列表 */
const todayTimedEvents = computed(() => {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  return expandRecurringEvents(events.value, dayStart, dayEnd)
    .filter(e => e.status !== 'cancelled' && !e.all_day && e.end_time)
    .map(e => ({
      id: e.id,
      title: e.title,
      s: new Date(e.start_time).getTime(),
      e: new Date(e.end_time as string).getTime(),
    }))
    .filter(t => t.e > t.s)
    .sort((a, b) => a.s - b.s)
})

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

const conflictPairs = computed(() => {
  const timed = todayTimedEvents.value
  const pairs: { a: { id: string; title: string }; b: { id: string; title: string }; overlapLabel: string }[] = []
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const s = Math.max(timed[i].s, timed[j].s)
      const e = Math.min(timed[i].e, timed[j].e)
      if (e > s) {
        pairs.push({
          a: { id: timed[i].id, title: timed[i].title },
          b: { id: timed[j].id, title: timed[j].title },
          overlapLabel: `重叠 ${fmtTime(s)} - ${fmtTime(e)}`,
        })
      }
    }
  }
  return pairs
})

/** 在 8:00-22:00 窗口内找空闲区间（合并忙碌后） */
const freeSlots = computed(() => {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const winStart = new Date(dayStart); winStart.setHours(8)
  const winEnd = new Date(dayStart); winEnd.setHours(22)
  const slots: { s: number; e: number }[] = []
  let cursor = winStart.getTime()
  for (const t of todayTimedEvents.value) {
    const s = Math.max(t.s, winStart.getTime())
    const e = Math.min(t.e, winEnd.getTime())
    if (e <= s) continue
    if (s > cursor) slots.push({ s: cursor, e: s })
    cursor = Math.max(cursor, e)
  }
  if (cursor < winEnd.getTime()) slots.push({ s: cursor, e: winEnd.getTime() })
  return slots
})

const focusWindowLabel = computed(() => {
  const best = freeSlots.value.reduce<{ s: number; e: number } | null>(
    (acc, slot) => (!acc || slot.e - slot.s > acc.e - acc.s ? slot : acc),
    null,
  )
  if (!best || best.e - best.s < 30 * 60000) return ''
  const hours = ((best.e - best.s) / 3600000).toFixed(1)
  return `${fmtTime(best.s)} - ${fmtTime(best.e)}（${hours}h）`
})

/** 重排建议：把冲突对中较短的事件移到 now 之后第一个能容纳它的空闲槽；当天放不下则建议明早 9:00 */
const reflowSuggestion = computed(() => {
  const pair = conflictPairs.value[0]
  if (!pair) return null
  const timed = todayTimedEvents.value
  const a = timed.find(t => t.id === pair.a.id)
  const b = timed.find(t => t.id === pair.b.id)
  if (!a || !b) return null
  const mover = b.e - b.s <= a.e - a.s ? b : a
  const durMs = mover.e - mover.s
  const now = Date.now()
  const slot = freeSlots.value.find(sl => Math.max(sl.s, now) + durMs <= sl.e)
  if (slot) {
    const start = Math.max(slot.s, now)
    return {
      id: mover.id,
      title: mover.title,
      label: `今天 ${fmtTime(start)} - ${fmtTime(start + durMs)}`,
      startMs: start,
      endMs: start + durMs,
    }
  }
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return {
    id: mover.id,
    title: mover.title,
    label: `明天 ${fmtTime(tomorrow.getTime())} - ${fmtTime(tomorrow.getTime() + durMs)}`,
    startMs: tomorrow.getTime(),
    endMs: tomorrow.getTime() + durMs,
  }
})

async function applyReflow() {
  const plan = reflowSuggestion.value
  if (!plan) return
  if (props.visualFixture) {
    const target = events.value.find(e => e.id === plan.id)
    if (target) {
      target.start_time = new Date(plan.startMs).toISOString()
      target.end_time = new Date(plan.endMs).toISOString()
      events.value = [...events.value]
    }
    showToast(`已把「${plan.title}」移到 ${plan.label}`, 'success')
    return
  }
  const ok = await updateEvent(plan.id, {
    start_time: new Date(plan.startMs).toISOString(),
    end_time: new Date(plan.endMs).toISOString(),
  })
  if (ok) {
    showToast(`已把「${plan.title}」移到 ${plan.label}`, 'success')
    await refreshEvents()
  } else {
    showToast('重排失败，请重试', 'error')
  }
}

function jumpToEvent(id: string) {
  const target = events.value.find(e => e.id === id)
  if (!target) return
  selectedDate.value = new Date(target.start_time)
  currentView.value = 'day'
  openView(target)
}

async function handleScheduleTask(task: PlannerTask) {
  if (props.visualFixture) {
    const slot = freeSlots.value.find(sl => Math.max(sl.s, Date.now()) + (task.estimated_minutes || 45) * 60000 <= sl.e)
    const start = slot ? Math.max(slot.s, Date.now()) : Date.now() + 3600000
    events.value = [...events.value, {
      id: `vf_task_${task.id}`,
      user_id: 'visual-fixture',
      title: `📋 ${task.title}`,
      description: null,
      location: null,
      start_time: new Date(start).toISOString(),
      end_time: new Date(start + (task.estimated_minutes || 45) * 60000).toISOString(),
      all_day: false,
      event_type: 'task',
      event_subtype: null,
      color: null,
      recurrence_type: 'none',
      recurrence_days: null,
      recurrence_end: null,
      reminders: [],
      status: 'active',
      priority: task.difficulty >= 4 ? 3 : 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]
    backlogTasks.value = backlogTasks.value.filter(t => t.id !== task.id)
    showToast(`已把「${task.title}」排入日程`, 'success')
    return
  }
  await pushTaskToSchedule(task)
  backlogTasks.value = backlogTasks.value.filter(t => t.id !== task.id)
  showToast(`已把「${task.title}」排入日程`, 'success')
  await refreshEvents()
}

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
      ...route.query,
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

// v7.4: 自定义删除确认
const deleteConfirm = ref<{ show: boolean; event: ScheduleEvent | null; title: string }>({
  show: false,
  event: null,
  title: '',
})

const handleDelete = (event: ScheduleEvent) => {
  deleteConfirm.value = {
    show: true,
    event,
    title: event.title,
  }
}

const confirmDeleteExecute = async () => {
  const event = deleteConfirm.value.event
  if (!event) return
  deleteConfirm.value.show = false

  const ok = await deleteEvent(event.id)
  if (!ok) {
    showToast('删除失败', 'error')
    return
  }

  showToast('事件已删除', 'success')
  modalVisible.value = false
  await refreshEvents()
}

const handlePushToPlanner = async (event: ScheduleEvent) => {
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      showToast('请先登录', 'error')
      return
    }
    const { error: err } = await supabase.from('planner_tasks').insert({
      user_id: session.session.user.id,
      goal_id: null,
      title: event.title,
      description: event.description || `从日程同步: ${event.start_time}`,
      due_date: event.start_time.slice(0, 10),
      status: 'pending',
      is_completed: false,
      schedule_event_id: event.id || null,
    })
    if (err) throw err
    showToast(`「${event.title}」已推送到规划`, 'success')
  } catch {
    showToast('推送失败，请稍后重试', 'error')
  }
}

const handleShareToWall = async (event: ScheduleEvent) => {
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      showToast('请先登录', 'error')
      return
    }
    const content = `📅 ${event.title}\n🕒 ${event.start_time.replace('T', ' ').slice(0, 16)}${event.location ? `\n📍 ${event.location}` : ''}${event.description ? `\n${event.description}` : ''}`
    const { error: err } = await supabase.from('posts').insert({
      author_id: session.session.user.id,
      content,
      is_anonymous: false,
    })
    if (err) throw err
    showToast('已分享到校园墙', 'success')
  } catch {
    showToast('分享失败，请稍后重试', 'error')
  }
}

const refreshEvents = async () => {
  if (props.visualFixture) return
  const { start, end } = getActiveQueryRange(
    currentView.value,
    selectedDate.value,
    currentYear.value,
    currentMonth.value,
  )

  await fetchEvents(start, end)
  scheduleReminders(events.value)
}

/** 开发视觉 fixture：以“现在”为锚点注入确定性事件（纯内存，不写 Supabase） */
const seedVisualFixture = () => {
  const mk = (id: string, title: string, type: string, startOffsetMin: number, durMin: number, priority = 2): ScheduleEvent => {
    const start = new Date(Date.now() + startOffsetMin * 60000)
    const end = new Date(start.getTime() + durMin * 60000)
    return {
      id: `vf_${id}`,
      user_id: 'visual-fixture',
      title,
      description: null,
      location: null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      all_day: false,
      event_type: type as ScheduleEvent['event_type'],
      event_subtype: null,
      color: null,
      recurrence_type: 'none',
      recurrence_days: null,
      recurrence_end: null,
      reminders: [],
      status: 'active',
      priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  events.value = [
    mk('run', '晨间跑步 & 复盘', 'life', -6 * 60, 30),
    mk('math', '高等数学 · 微分方程', 'course', -4 * 60, 100, 3),
    mk('meeting', '团队例会 · 项目进展对齐', 'task', -2.5 * 60, 60, 3),
    mk('doc', '需求文档撰写', 'task', -45, 90, 3),
    mk('dl', '深度学习 · 数据分析与建模', 'course', 90, 90),
    mk('review', '高等数学复习', 'task', 3 * 60, 90, 3),
    mk('yoga', '瑜伽训练', 'life', 3.5 * 60, 60),
    mk('plan', '复盘 & 计划明日', 'task', 5 * 60, 30),
  ]
  loading.value = false
  error.value = null
}

watch([currentView, selectedDate], refreshEvents)
onMounted(() => {
  if (props.visualFixture) {
    currentView.value = 'day'
    seedVisualFixture()
    loadBacklog()
    return
  }
  refreshEvents()
  loadBacklog()
})

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
  position: relative;
}

.sch-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px;
  background: rgba(15, 12, 30, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.06);
  border-radius: 16px;
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.02);
}
.sch-nav-left { display: flex; align-items: center; gap: 6px; }
.sch-nav-right { display: flex; align-items: center; gap: 10px; }

/* ====== 今日总览 hero ====== */
.sch-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(200px, 1.15fr) auto 96px minmax(180px, 0.9fr);
  align-items: center;
  gap: 20px;
  padding: 16px 22px;
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  background:
    radial-gradient(circle at 4% 20%, rgba(99, 102, 241, 0.16), transparent 34%),
    radial-gradient(circle at 96% 90%, rgba(139, 92, 246, 0.12), transparent 30%),
    rgba(15, 12, 30, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.sch-hero-art {
  position: absolute;
  left: -34px;
  top: 50%;
  width: 190px;
  height: 190px;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: screen;
  border-radius: 50%;
  overflow: hidden;
  -webkit-mask-image: radial-gradient(circle, #000 52%, transparent 70%);
  mask-image: radial-gradient(circle, #000 52%, transparent 70%);
}
.sch-hero-art img { width: 100%; height: 100%; object-fit: contain; animation: schArtSpin 60s linear infinite; }
@keyframes schArtSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.sch-hero-copy { position: relative; padding-left: 96px; min-width: 0; }
.sch-hero-copy h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: #ede9fe;
  letter-spacing: 0.3px;
  text-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
}
.sch-hero-copy p { margin: 0; font-size: 11px; color: rgba(196, 181, 253, 0.5); }

.sch-hero-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(64px, auto));
  gap: 22px;
}
.sch-hs-item { text-align: left; position: relative; }
.sch-hs-item::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 30px;
  background: linear-gradient(180deg, transparent, rgba(139, 92, 246, 0.25), transparent);
}
.sch-hs-item strong {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.sch-hs-item strong i { font-style: normal; font-size: 12px; color: rgba(255, 255, 255, 0.45); margin-left: 1px; }
.sch-hs-item span { display: block; margin-top: 2px; font-size: 11px; color: rgba(255, 255, 255, 0.45); }
.sch-hs-item small { display: block; margin-top: 1px; font-size: 9px; color: rgba(255, 255, 255, 0.22); }
.sch-hs-warn strong { color: #fbbf24; text-shadow: 0 0 14px rgba(251, 191, 36, 0.35); }
.sch-hs-warn small { color: rgba(251, 191, 36, 0.55); }

.sch-hero-ring { position: relative; width: 84px; height: 84px; }
.sch-hero-ring svg { width: 100%; height: 100%; }
.shr-bg { fill: none; stroke: rgba(255, 255, 255, 0.06); stroke-width: 7; }
.shr-fg {
  fill: none;
  stroke: #a78bfa;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-dasharray: 263.9;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.55));
}
.shr-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.shr-center strong { font-size: 20px; font-weight: 800; color: #ede9fe; line-height: 1; }
.shr-center span { margin-top: 2px; font-size: 9px; color: rgba(255, 255, 255, 0.35); }

.sch-hero-entries { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.sch-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.16);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.04));
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
}
.sch-entry:hover { transform: translateX(3px); border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 4px 16px rgba(139, 92, 246, 0.16); }
.sch-entry-tarot {
  border-color: rgba(251, 191, 36, 0.16);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(249, 115, 22, 0.03));
}
.sch-entry-tarot:hover { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 4px 16px rgba(251, 191, 36, 0.14); }
.sch-entry-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  box-shadow: 0 2px 10px rgba(124, 58, 237, 0.35);
}
.sch-entry-tarot .sch-entry-icon { background: linear-gradient(135deg, #f59e0b, #ea580c); box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3); }
.sch-entry-copy { min-width: 0; flex: 1; }
.sch-entry-copy strong { display: block; font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.85); white-space: nowrap; }
.sch-entry-copy small { display: block; font-size: 9.5px; color: rgba(255, 255, 255, 0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sch-entry-arrow { color: rgba(255, 255, 255, 0.25); font-size: 13px; transition: transform 0.2s, color 0.2s; }
.sch-entry:hover .sch-entry-arrow { transform: translateX(3px); color: rgba(255, 255, 255, 0.7); }

/* ====== 底部快捷行 ====== */
.sch-quick-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  flex-shrink: 0;
}
.sch-qcard {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(139, 92, 246, 0.08);
  background: rgba(15, 12, 30, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  min-width: 0;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
.sch-qcard:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.28);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 16px rgba(139, 92, 246, 0.1);
}
.sch-qcard-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #fff;
}
.sch-qi-review { background: linear-gradient(135deg, #7c3aed, #4f46e5); box-shadow: 0 2px 10px rgba(124, 58, 237, 0.3); }
.sch-qi-habit { background: linear-gradient(135deg, #059669, #0891b2); box-shadow: 0 2px 10px rgba(5, 150, 105, 0.3); }
.sch-qi-res { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3); }
.sch-qi-focus { background: linear-gradient(135deg, #ea580c, #db2777); box-shadow: 0 2px 10px rgba(234, 88, 12, 0.3); }
.sch-qcard-copy { flex: 1; min-width: 0; }
.sch-qcard-copy strong { display: block; font-size: 12.5px; font-weight: 700; color: rgba(255, 255, 255, 0.85); white-space: nowrap; }
.sch-qcard-copy small { display: block; margin-top: 1px; font-size: 9.5px; color: rgba(255, 255, 255, 0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sch-qcard-cta {
  flex-shrink: 0;
  padding: 4px 11px;
  border-radius: 9px;
  border: 1px solid rgba(139, 92, 246, 0.22);
  background: rgba(139, 92, 246, 0.08);
  color: rgba(196, 181, 253, 0.75);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.18s;
}
.sch-qcard:hover .sch-qcard-cta { background: rgba(139, 92, 246, 0.22); color: #ede9fe; border-color: rgba(139, 92, 246, 0.4); }

@media (max-width: 1100px) {
  .sch-quick-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .sch-quick-row { grid-template-columns: 1fr; }
  .sch-qcard-cta { display: none; }
}

@media (max-width: 1280px) {
  .sch-hero { grid-template-columns: minmax(180px, 1fr) auto 90px; }
  .sch-hero-entries { display: none; }
}
@media (max-width: 900px) {
  .sch-hero { grid-template-columns: 1fr; gap: 14px; padding: 14px 16px; }
  .sch-hero-copy { padding-left: 0; }
  .sch-hero-art { display: none; }
  .sch-hero-stats { grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .sch-hs-item::before { display: none; }
  .sch-hero-ring { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .sch-hero-art img { animation: none; }
  .shr-fg { transition: none; }
}

.sch-nav-btn {
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35); width: 36px; height: 36px;
  border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sch-nav-btn:hover {
  background: rgba(59, 130, 246, 0.1); color: white;
  border-color: rgba(59, 130, 246, 0.2);
  transform: scale(1.05);
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.12);
}

.sch-today-btn {
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.06), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(79, 142, 247, 0.12);
  color: rgba(255, 255, 255, 0.7); padding: 6px 18px;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.25s ease;
}
.sch-today-btn:hover {
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.12), rgba(139, 92, 246, 0.12));
  color: #93c5fd;
  border-color: rgba(79, 142, 247, 0.25);
  box-shadow: 0 2px 12px rgba(79, 142, 247, 0.15);
}

.sch-title {
  font-size: 20px; font-weight: 700;
  background: linear-gradient(135deg, #e0e7ff, #93c5fd);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin: 0 0 0 14px; letter-spacing: -0.3px;
}

.sch-view-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px; padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}
.sch-view-tab {
  padding: 7px 20px; border-radius: 9px; border: none;
  background: transparent; color: rgba(255, 255, 255, 0.35);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; z-index: 1;
}
.sch-view-tab:hover { color: rgba(255, 255, 255, 0.65); }
.sch-view-tab.active {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.2);
  text-shadow: 0 0 8px rgba(147, 197, 253, 0.4);
}

.sch-ai-btn {
  display: flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(79, 142, 247, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: rgba(196, 181, 253, 0.8); padding: 8px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(79, 142, 247, 0.2));
  border-color: rgba(139, 92, 246, 0.3); color: #c4b5fd;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2), 0 0 12px rgba(139, 92, 246, 0.08);
}
.sch-ai-btn:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.sch-create-btn {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border: none;
  color: white; padding: 8px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
  position: relative; overflow: hidden;
}
.sch-create-btn::before {
  content: '';
  position: absolute; inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  animation: schShimmer 3s infinite;
}
@keyframes schShimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
.sch-create-btn:hover {
  filter: brightness(1.1); transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4), 0 0 12px rgba(99, 102, 241, 0.15);
}
.sch-create-btn:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.sch-main {
  display: flex; gap: 24px; flex: 1; min-height: 0;
}
.sch-calendar {
  flex: 1; min-width: 0; position: relative;
  background: rgba(15, 12, 30, 0.5);
  border: 1px solid rgba(139, 92, 246, 0.04);
  border-radius: 16px;
  padding: 2px;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.sch-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 100px 0;
  color: rgba(255, 255, 255, 0.35); font-size: 14px;
}
.sch-loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.06);
  border-top-color: #3b82f6;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.sch-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 100px 0;
  color: rgba(255, 255, 255, 0.45); font-size: 14px;
}
.sch-retry-btn {
  background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.15);
  color: #60a5fa; padding: 7px 22px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.sch-retry-btn:hover {
  background: rgba(59, 130, 246, 0.15);
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.15);
}

.sch-empty-hint {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 20px 0;
  font-size: 13px; color: rgba(255, 255, 255, 0.25);
}
.sch-empty-hint strong { color: #60a5fa; }
.sch-empty-cta {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  padding: 5px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all .25s;
  display: inline-flex;
  align-items: center;
}
.sch-empty-cta:hover {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.2);
}

/* v7.4 自定义删除确认弹窗 */
.sch-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(8px);
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.sch-confirm-modal {
  width: min(400px, 100%);
  background: linear-gradient(180deg, rgba(24,20,38,.98), rgba(16,14,28,.98));
  border: 1px solid rgba(244,63,94,.22);
  border-radius: 18px;
  padding: 28px 24px 22px;
  box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(244,63,94,.08);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.sch-confirm-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #f43f5e, transparent);
  animation: confirmTopGlow 2s ease-in-out infinite;
}
@keyframes confirmTopGlow {
  0%,100% { opacity: .3; } 50% { opacity: 1; }
}
.sch-confirm-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
  animation: confirmIconPulse 1.6s ease-in-out infinite;
}
@keyframes confirmIconPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.sch-confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px;
}
.sch-confirm-desc {
  font-size: 13px;
  color: rgba(255,255,255,.5);
  margin: 0 0 22px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sch-confirm-desc strong {
  color: rgba(251,113,133,.95);
  font-weight: 600;
}
.sch-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.sch-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s;
  border: 1px solid transparent;
}
.sch-confirm-cancel {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.08);
  color: rgba(255,255,255,.75);
}
.sch-confirm-cancel:hover {
  background: rgba(255,255,255,.08);
  color: white;
}
.sch-confirm-delete {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: white;
  box-shadow: 0 4px 16px rgba(244,63,94,.3);
}
.sch-confirm-delete:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(244,63,94,.45);
  filter: brightness(1.1);
}
.confirm-fade-enter-active,
.confirm-fade-leave-active { transition: opacity .2s; }
.confirm-fade-enter-active .sch-confirm-modal,
.confirm-fade-leave-active .sch-confirm-modal { transition: all .25s cubic-bezier(.4,1.4,.6,1); }
.confirm-fade-enter-from,
.confirm-fade-leave-to { opacity: 0; }
.confirm-fade-enter-from .sch-confirm-modal { transform: scale(.85) translateY(-10px); }
.confirm-fade-leave-to .sch-confirm-modal { transform: scale(.95); }

.sch-toast {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  padding: 12px 28px; border-radius: 14px;
  font-size: 13px; font-weight: 600; z-index: 5000;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}
.sch-toast.success {
  background: rgba(16, 185, 129, 0.08); color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.1);
}
.sch-toast.error {
  background: rgba(239, 68, 68, 0.08); color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.1);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translate(-50%, 20px); }

@media (prefers-reduced-motion: reduce) {
  .sch-nav-btn, .sch-today-btn, .sch-view-tab, .sch-ai-btn, .sch-create-btn,
  .sch-retry-btn, .sch-empty-cta, .sch-confirm-btn, .sch-toast,
  .sch-confirm-icon, .sch-confirm-modal::before {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 900px) {
  .sch-page { padding: 14px; }
  .sch-main { flex-direction: column; }
  .sch-topbar { flex-wrap: wrap; gap: 8px; padding: 10px 12px; border-radius: 12px; }
  .sch-nav-right { flex-wrap: wrap; gap: 6px; }
  .sch-title { font-size: 17px; margin-left: 8px; }
  .sch-view-tab { padding: 6px 14px; font-size: 12px; }
  .sch-ai-btn, .sch-create-btn { padding: 7px 12px; font-size: 12px; }
  .sch-calendar { border-radius: 12px; }
}
</style>
