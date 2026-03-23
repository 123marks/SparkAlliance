## TypeScript 接口定义（完整代码）

```ts [frontend/src/types/schedule.ts]
export type UUID = string
export type ISODateTime = string

export type EventType = 'course' | 'exam' | 'task' | 'life' | 'reminder' | 'holiday'
export type EventSubtype =
  | 'lecture'
  | 'lab'
  | 'qa'
  | 'seminar'
  | 'final'
  | 'midterm'
  | 'quiz'
  | 'defense'
  | 'homework'
  | 'project'
  | 'report'
  | 'paper'
  | 'exercise'
  | 'dining'
  | 'date'
  | 'club'
  | 'parttime'
  | 'payment'
  | 'register'
  | 'enroll'
  | 'ticket'
  | 'meeting'
  | 'national'
  | 'school'
  | 'birthday'
  | 'anniversary'
  | 'custom'

export type EventStatus = 'active' | 'completed' | 'cancelled'
export type Visibility = 'private' | 'friends' | 'public'
export type ViewMode = 'month' | 'week' | 'day'
export type ReminderType = 'notification' | 'email' | 'sms' | 'wechat'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 周一=1，周日=7

export interface Reminder {
  id: string
  type: ReminderType
  offsetMinutes: number
  enabled: boolean
  snoozeMinutes?: 5 | 10 | 15 | 30
  channelMeta?: {
    email?: string
    phone?: string
    wechatOpenId?: string
  }
}

export type RecurrenceEndCondition =
  | { mode: 'never' }
  | { mode: 'until'; untilDate: string } // YYYY-MM-DD（事件时区）
  | { mode: 'count'; count: number }

export interface RecurrenceRule {
  type: RecurrenceType
  interval: number
  daysOfWeek?: WeekDay[] // weekly/biweekly/custom 常用
  dayOfMonth?: number // monthly/yearly 可用
  timezone: string // 建议 IANA，如 Asia/Shanghai
  end: RecurrenceEndCondition
}

export interface ScheduleEvent {
  id: UUID
  userId: UUID
  title: string
  description: string | null
  location: string | null
  startTime: ISODateTime
  endTime: ISODateTime | null
  allDay: boolean
  timezone: string
  eventType: EventType
  eventSubtype: EventSubtype | null
  color: string | null
  icon: string | null
  recurrence: RecurrenceRule
  reminders: Reminder[]
  parentEventId: UUID | null
  relatedCourseId: UUID | null
  relatedTaskId: UUID | null
  relatedUserId: UUID | null
  status: EventStatus
  isCompleted: boolean
  completedAt: ISODateTime | null
  priority: -1 | 0 | 1 | 2
  visibility: Visibility
  reminderSent: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type ScheduleEventDraft = Omit<
  ScheduleEvent,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'reminderSent' | 'parentEventId'
>

export interface Database {
  public: {
    Tables: {
      schedule_events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string | null
          all_day: boolean | null
          timezone: string | null
          event_type: EventType
          event_subtype: EventSubtype | null
          color: string | null
          icon: string | null
          recurrence_type: RecurrenceType | null
          recurrence_interval: number | null
          recurrence_days: number[] | null
          recurrence_end: string | null
          recurrence_count: number | null
          parent_event_id: string | null
          reminders: unknown[] | null
          related_course_id: string | null
          related_task_id: string | null
          related_user_id: string | null
          status: EventStatus | null
          is_completed: boolean | null
          completed_at: string | null
          priority: number | null
          visibility: Visibility | null
          reminder_sent: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['schedule_events']['Row']>
        Update: Partial<Database['public']['Tables']['schedule_events']['Row']>
      }
    }
  }
}

type ScheduleEventRow = Database['public']['Tables']['schedule_events']['Row']
type ScheduleEventInsert = Database['public']['Tables']['schedule_events']['Insert']

const normalizeRecurrence = (row: ScheduleEventRow): RecurrenceRule => ({
  type: row.recurrence_type ?? 'none',
  interval: row.recurrence_interval ?? 1,
  daysOfWeek: (row.recurrence_days?.filter((d): d is WeekDay => d >= 1 && d <= 7) ?? []) as WeekDay[],
  timezone: row.timezone ?? 'Asia/Shanghai',
  end: row.recurrence_count
    ? { mode: 'count', count: row.recurrence_count }
    : row.recurrence_end
      ? { mode: 'until', untilDate: row.recurrence_end }
      : { mode: 'never' },
})

export const mapScheduleEventRow = (row: ScheduleEventRow): ScheduleEvent => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  location: row.location,
  startTime: row.start_time,
  endTime: row.end_time,
  allDay: Boolean(row.all_day),
  timezone: row.timezone ?? 'Asia/Shanghai',
  eventType: row.event_type,
  eventSubtype: row.event_subtype,
  color: row.color,
  icon: row.icon,
  recurrence: normalizeRecurrence(row),
  reminders: ((row.reminders ?? []) as Reminder[]).map((r, i) => ({
    id: r.id ?? `r-${i}`,
    type: r.type,
    offsetMinutes: r.offsetMinutes ?? r.offset ?? 30,
    enabled: r.enabled ?? true,
    snoozeMinutes: r.snoozeMinutes,
    channelMeta: r.channelMeta,
  })),
  parentEventId: row.parent_event_id,
  relatedCourseId: row.related_course_id,
  relatedTaskId: row.related_task_id,
  relatedUserId: row.related_user_id,
  status: row.status ?? 'active',
  isCompleted: Boolean(row.is_completed),
  completedAt: row.completed_at,
  priority: (row.priority ?? 0) as -1 | 0 | 1 | 2,
  visibility: row.visibility ?? 'private',
  reminderSent: Boolean(row.reminder_sent),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const buildScheduleEventInsert = (draft: ScheduleEventDraft): ScheduleEventInsert => ({
  title: draft.title,
  description: draft.description,
  location: draft.location,
  start_time: draft.startTime,
  end_time: draft.endTime,
  all_day: draft.allDay,
  timezone: draft.timezone,
  event_type: draft.eventType,
  event_subtype: draft.eventSubtype,
  color: draft.color,
  icon: draft.icon,
  recurrence_type: draft.recurrence.type,
  recurrence_interval: draft.recurrence.interval,
  recurrence_days: draft.recurrence.daysOfWeek ?? null,
  recurrence_end: draft.recurrence.end.mode === 'until' ? draft.recurrence.end.untilDate : null,
  recurrence_count: draft.recurrence.end.mode === 'count' ? draft.recurrence.end.count : null,
  reminders: draft.reminders,
  related_course_id: draft.relatedCourseId,
  related_task_id: draft.relatedTaskId,
  related_user_id: draft.relatedUserId,
  status: draft.status,
  is_completed: draft.isCompleted,
  completed_at: draft.completedAt,
  priority: draft.priority,
  visibility: draft.visibility,
})
```

`EventType` 建议优先使用 union type（配合 `as const` 映射），因为在 Vue + TS 中推断更顺滑、序列化到 Supabase 更自然。`enum` 的优势是集中命名空间与可读性，但会引入额外运行时代码（非 const enum），并增加 API 边界转换成本。

Supabase 类型对齐建议使用“Row 映射器 + Insert 构造器”，而不是在业务里反复 `as any`。这样可以把 snake_case 与 camelCase、nullable 与默认值策略统一收敛在单点。

## Composable 接口签名

```ts [frontend/src/composables/useSchedule.ts]
import type { Ref, ComputedRef } from 'vue'
import type {
  ScheduleEvent,
  ScheduleEventDraft,
  ViewMode,
  UUID,
  EventType,
} from '../types/schedule'

export interface ScheduleRange {
  start: Date
  end: Date
}

export interface ScheduleFilters {
  keyword?: string
  eventTypes?: EventType[]
  includeCompleted?: boolean
}

export interface UseScheduleState {
  events: Ref<ScheduleEvent[]>
  selectedDate: Ref<Date>
  currentView: Ref<ViewMode>
  activeEvent: Ref<ScheduleEvent | null>
  isLoading: Ref<boolean>
  isSaving: Ref<boolean>
  loadError: Ref<string | null>
  saveError: Ref<string | null>
  eventsInView: ComputedRef<ScheduleEvent[]>
  upcomingEvents: ComputedRef<ScheduleEvent[]>
}

export interface UseScheduleActions {
  init: () => Promise<void>
  loadRange: (range: ScheduleRange, filters?: ScheduleFilters) => Promise<void>
  createEvent: (draft: ScheduleEventDraft) => Promise<ScheduleEvent>
  updateEvent: (id: UUID, patch: Partial<ScheduleEventDraft>) => Promise<ScheduleEvent>
  deleteEvent: (id: UUID, opts?: { scope?: 'single' | 'future' | 'all' }) => Promise<void>
  markCompleted: (id: UUID, completed?: boolean) => Promise<void>
  duplicateEvent: (id: UUID, targetDate: Date) => Promise<ScheduleEvent>
  setSelectedDate: (date: Date) => void
  setView: (view: ViewMode) => void
  clearErrors: () => void
}

export type UseScheduleReturn = UseScheduleState & UseScheduleActions
export declare function useSchedule(): UseScheduleReturn
```

```ts [frontend/src/composables/useCalendar.ts]
import type { ScheduleEvent, ViewMode } from '../types/schedule'

export interface CalendarCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: ScheduleEvent[]
}

export interface CalendarLayoutBlock {
  eventId: string
  top: number
  height: number
  lane: number
  laneCount: number
}

export function getMonthGrid(year: number, month: number, weekStartsOn?: 0 | 1): Date[][]
export function getWeekDays(anchor: Date, weekStartsOn?: 0 | 1): Date[]
export function getEventsInRange(events: ScheduleEvent[], start: Date, end: Date): ScheduleEvent[]
export function buildWeekLayout(
  dayEvents: ScheduleEvent[],
  hourHeight?: number,
  dayStartHour?: number,
): CalendarLayoutBlock[]
export function toViewRange(view: ViewMode, date: Date): { start: Date; end: Date }

export interface UseCalendarReturn {
  getMonthGrid: typeof getMonthGrid
  getWeekDays: typeof getWeekDays
  getEventsInRange: typeof getEventsInRange
  buildWeekLayout: typeof buildWeekLayout
  toViewRange: typeof toViewRange
}

export declare function useCalendar(): UseCalendarReturn
```

```ts [frontend/src/composables/useReminder.ts]
import { onBeforeUnmount } from 'vue'
import type { ScheduleEvent } from '../types/schedule'

export interface UseReminderReturn {
  requestPermission: () => Promise<boolean>
  scheduleForEvent: (event: ScheduleEvent) => void
  scheduleForEvents: (events: ScheduleEvent[]) => void
  cancelForEvent: (eventId: string) => void
  cancelAll: () => void
  snooze: (event: ScheduleEvent, minutes: number) => void
}

export function useReminder(): UseReminderReturn {
  const timerMap = new Map<string, ReturnType<typeof setTimeout>>()

  const cancelForEvent = (eventId: string) => {
    const timer = timerMap.get(eventId)
    if (!timer) return
    clearTimeout(timer)
    timerMap.delete(eventId)
  }

  const cancelAll = () => {
    for (const timer of timerMap.values()) clearTimeout(timer)
    timerMap.clear()
  }

  onBeforeUnmount(() => cancelAll())

  return {
    requestPermission: async () => Notification.permission === 'granted',
    scheduleForEvent: () => void 0,
    scheduleForEvents: () => void 0,
    cancelForEvent,
    cancelAll,
    snooze: () => void 0,
  }
}
```

`useCalendar` 中的 `getMonthGrid/getWeekDays` 必须保持纯函数（输入固定、无副作用），这样可直接用 Vitest 参数化测试覆盖闰年、跨月、周起始日切换。`useReminder` 则必须在 `onBeforeUnmount` 清理全部 timer，避免路由切换后残留提醒和内存泄漏。

## Store 设计

```ts [frontend/src/stores/scheduleStore.ts]
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSchedule } from '../composables/useSchedule'
import type { ScheduleEvent, ViewMode } from '../types/schedule'

type AsyncKey = 'load' | 'create' | 'update' | 'delete'

export const useScheduleStore = defineStore('schedule', () => {
  const schedule = useSchedule()
  const route = useRoute()
  const router = useRouter()

  const selectedDate = ref(new Date())
  const viewMode = ref<ViewMode>('month')
  const filters = ref<{ eventTypes: string[]; includeCompleted: boolean }>({
    eventTypes: [],
    includeCompleted: false,
  })

  const loading = ref<Record<AsyncKey, boolean>>({
    load: false,
    create: false,
    update: false,
    delete: false,
  })
  const errors = ref<Record<AsyncKey, string | null>>({
    load: null,
    create: null,
    update: null,
    delete: null,
  })

  const events = computed(() => schedule.events.value)
  const activeDateEvents = computed(() =>
    events.value.filter((e) => new Date(e.startTime).toDateString() === selectedDate.value.toDateString()),
  )
  const upcoming = computed(() =>
    [...events.value]
      .filter((e) => new Date(e.startTime).getTime() >= Date.now())
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .slice(0, 10),
  )

  const syncFromRoute = () => {
    const qDate = typeof route.query.date === 'string' ? route.query.date : ''
    const qView = typeof route.query.view === 'string' ? route.query.view : ''
    if (qDate) selectedDate.value = new Date(qDate)
    if (qView === 'month' || qView === 'week' || qView === 'day') viewMode.value = qView
  }

  const syncToRoute = async () => {
    const nextQuery = {
      ...route.query,
      date: selectedDate.value.toISOString().slice(0, 10),
      view: viewMode.value,
    }
    await router.replace({ query: nextQuery })
  }

  const setViewMode = async (next: ViewMode) => {
    viewMode.value = next
    await syncToRoute()
  }

  const setSelectedDate = async (next: Date) => {
    selectedDate.value = next
    await syncToRoute()
  }

  const setError = (key: AsyncKey, error: unknown) => {
    errors.value[key] = error instanceof Error ? error.message : '未知错误'
  }

  const clearError = (key?: AsyncKey) => {
    if (!key) {
      errors.value = { load: null, create: null, update: null, delete: null }
      return
    }
    errors.value[key] = null
  }

  return {
    selectedDate,
    viewMode,
    filters,
    loading,
    errors,
    events,
    activeDateEvents,
    upcoming,
    syncFromRoute,
    syncToRoute,
    setViewMode,
    setSelectedDate,
    setError,
    clearError,
    ...schedule,
  }
})
```

“当前选中日期”和“当前视图模式”建议采用**Store + URL Query 双向同步**。Store 负责组件间共享与响应式；URL 负责刷新不丢状态、可分享链接、浏览器前进后退可用。  

Loading/Error 建议按操作粒度拆分（`load/create/update/delete`），避免一个布尔值把整页状态混在一起，也更贴近 `CampusWall.vue` 的“显式 loading + 显式 toast 错误”风格。

## 关键算法 Bug 修复

```ts [frontend/src/utils/scheduleRecurrence.ts]
import type { ScheduleEvent, RecurrenceRule, WeekDay } from '../types/schedule'

const toWeekDay = (date: Date): WeekDay => {
  const day = date.getDay()
  return (day === 0 ? 7 : day) as WeekDay
}

const endOfDate = (yyyyMmDd: string) => {
  const d = new Date(`${yyyyMmDd}T23:59:59.999`)
  return d
}

const safeAdvance = (current: Date, rule: RecurrenceRule) => {
  const next = new Date(current)
  const interval = Math.max(rule.interval || 1, 1)

  switch (rule.type) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      return next
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      return next
    case 'biweekly':
      next.setDate(next.getDate() + 14 * interval)
      return next
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      return next
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      return next
    default:
      // custom/none 不在此函数展开，避免死循环
      return null
  }
}

export function expandRecurrence(event: ScheduleEvent, rangeStart: Date, rangeEnd: Date): ScheduleEvent[] {
  if (event.recurrence.type === 'none') return [event]

  const result: ScheduleEvent[] = []
  const durationMs =
    (event.endTime ? new Date(event.endTime).getTime() : new Date(event.startTime).getTime()) -
    new Date(event.startTime).getTime()

  const rule = event.recurrence
  const weekDays = new Set<WeekDay>(rule.daysOfWeek ?? [])
  const until = rule.end.mode === 'until' ? endOfDate(rule.end.untilDate) : null
  const maxCount = rule.end.mode === 'count' ? rule.end.count : Number.POSITIVE_INFINITY

  let seed = new Date(event.startTime)
  let emitted = 0

  while (seed < rangeEnd && emitted < maxCount) {
    if (until && seed > until) break

    const candidates: Date[] =
      (rule.type === 'weekly' || rule.type === 'biweekly') && weekDays.size > 0
        ? [...weekDays]
            .sort((a, b) => a - b)
            .map((wd) => {
              const c = new Date(seed)
              const delta = wd - toWeekDay(seed)
              c.setDate(c.getDate() + (delta < 0 ? delta + 7 : delta))
              return c
            })
        : [new Date(seed)]

    for (const start of candidates) {
      const end = new Date(start.getTime() + durationMs)
      if (start < rangeEnd && end >= rangeStart) {
        result.push({
          ...event,
          id: `${event.id}#${start.toISOString()}`,
          parentEventId: event.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
        emitted++
        if (emitted >= maxCount) break
      }
    }

    const nextSeed = safeAdvance(seed, rule)
    if (!nextSeed) break
    if (nextSeed.getTime() <= seed.getTime()) break // 二次保险，防止异常规则导致无限循环
    seed = nextSeed
  }

  return result
}
```

```ts [frontend/src/utils/conflict.ts]
import type { ScheduleEvent } from '../types/schedule'

export interface Conflict {
  event1: ScheduleEvent
  event2: ScheduleEvent
  type: 'overlap' | 'adjacent'
  severity: 'warning' | 'error'
}

interface TimelinePoint {
  time: number
  kind: 'start' | 'end'
  event: ScheduleEvent
}

// 全量冲突检测：O(n log n + m)，n为事件数，m为冲突数
export function detectConflictsFast(events: ScheduleEvent[], adjacentGapMs = 15 * 60 * 1000): Conflict[] {
  const points: TimelinePoint[] = []
  for (const e of events) {
    if (e.status !== 'active') continue
    const start = +new Date(e.startTime)
    const end = +new Date(e.endTime ?? e.startTime)
    points.push({ time: start, kind: 'start', event: e })
    points.push({ time: end, kind: 'end', event: e })
  }

  points.sort((a, b) => (a.time === b.time ? (a.kind === 'end' ? -1 : 1) : a.time - b.time))

  const active = new Set<ScheduleEvent>()
  const conflicts: Conflict[] = []

  for (const p of points) {
    if (p.kind === 'start') {
      for (const a of active) {
        conflicts.push({ event1: p.event, event2: a, type: 'overlap', severity: 'error' })
      }
      active.add(p.event)
    } else {
      active.delete(p.event)
    }
  }

  const sorted = [...events].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const prevEnd = +new Date(prev.endTime ?? prev.startTime)
    const currStart = +new Date(curr.startTime)
    if (currStart > prevEnd && currStart - prevEnd <= adjacentGapMs) {
      conflicts.push({ event1: curr, event2: prev, type: 'adjacent', severity: 'warning' })
    }
  }

  return conflicts
}
```

```ts [frontend/src/components/schedule/weekLayout.ts]
import type { ScheduleEvent } from '../../types/schedule'

export interface WeekBlockStyle {
  top: number
  height: number
}

// 周视图绝对定位公式：top/height 基于分钟差和 hourHeight
export function computeWeekBlockStyle(
  event: ScheduleEvent,
  dayStartHour = 0,
  hourHeight = 56,
  minHeight = 18,
): WeekBlockStyle {
  const start = new Date(event.startTime)
  const end = new Date(event.endTime ?? event.startTime)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const dayStartMinutes = dayStartHour * 60
  const pxPerMinute = hourHeight / 60

  const top = Math.max((startMinutes - dayStartMinutes) * pxPerMinute, 0)
  const height = Math.max((endMinutes - startMinutes) * pxPerMinute, minHeight)
  return { top, height }
}
```

关键问题与修复结论：

- `expandRecurrence` 原实现对 `custom` 无推进逻辑，存在死循环风险；`biweekly` 忽略 interval；`weekly + recurrence_days` 不能覆盖多日重复。上面的新实现统一修复。
- 原实现对 `recurrence_end` 以 `00:00` 比较，容易漏掉“结束日当天”实例。修复为 `23:59:59.999`。
- 原提醒代码 `setTimeout` 未做长延迟分段，超过约 24.8 天会溢出，建议分段调度。
- 文档中的 `sendNotification` 使用 `router.push` 但未注入 router，需在 composable 显式依赖注入。
- DST 风险：跨夏令时周重复事件若按毫秒硬加，可能发生“本地时间漂移”。建议按“本地日历字段”推进（或引入 `date-fns-tz`）。

另外，组件实现建议如下（与文档问题逐项对应）：

- `CalendarMonth.vue` 月份网格使用 CSS Grid（`grid-template-columns: repeat(7, minmax(0, 1fr))`）优于 Flexbox，行列语义更稳定，跨屏适配更简单。
- `EventModal.vue` 的 `mode: 'create' | 'edit' | 'view'` 推荐“配置对象 + 共享表单组件”模式，避免三套模板分叉。
- `useCalendar.ts` 纯函数建议单测：闰年 2 月、跨月 6x7 网格、周起始日切换、跨午夜事件覆盖。

## 实现风险点

- 时区与 DST：若用户/设备不在 `Asia/Shanghai`，重复事件与提醒时间可能漂移。
- `end_time` 在表结构中可空，算法若默认 `new Date(null)` 会出现错误语义。
- 重复事件展开规模失控：例如无 end 条件的 daily 事件，前端展开范围必须限窗（按 view range）。
- 提醒可靠性：纯前端 `setTimeout` 在标签页休眠、浏览器关闭时不可靠，V3 需迁移到 SW/后端任务。
- Store 与 URL 双向同步存在循环更新风险，需去抖和“值未变化不 replace”保护。
- 冲突检测若每次全量 O(n²) 会拖慢周/月切换，建议使用 sweep-line 或按日期桶索引。
- 与 `CampusWall` 风格对齐时，错误提示要保持“`console.error + toast + loading 收口`”一致，避免静默失败。

## 代码实现评分与建议

综合评分：**86 / 100**

- TypeScript 设计：18/20（建议统一 `Row -> Domain` 映射，减少散落断言）
- Composable 设计：17/20（职责清晰，但提醒调度与生命周期清理需严格）
- Store 设计：16/20（建议 URL 同步策略前置，避免后续重构）
- 算法可靠性：15/20（重复事件与冲突检测需先补强）
- 与现有代码一致性：20/20（可完全复用 `supabase.ts`、Toast、Loading 交互模式）

优先级建议（高 -> 低）：

1. 先落地类型层与 Supabase 映射层（否则后续全是类型债）。  
2. 实现 `useSchedule + scheduleStore`，同时完成 URL 同步策略。  
3. 实现 `CalendarMonth/Week/Day`，周视图先上绝对定位基础版。  
4. 修复并替换重复事件与冲突检测算法。  
5. 接入提醒（先页面内提醒，再规划 V3 的后台提醒架构）。  

