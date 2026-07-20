/**
 * useSchedule.ts — 智能日程数据层
 *
 * 2026-07-20 迁移：数据源从 Supabase 切换到自建 Go 后端（BACKEND-CONTRACT.md §4.3）。
 * - 区间重叠查询由后端完成（from/to 参数）
 * - 属主校验由后端 JWT 完成，前端不再自查 user_id
 * - 状态仍为模块级单例，避免多实例不同步
 */
import { ref, computed } from 'vue'
import { apiFetch, getToken, ApiError } from '../api/client'
import { expandRecurringEvents } from './useRecurrence'

// 从 useCalendar 导入纯函数
export { getMonthGrid, getWeekDays, isSameDay, formatTime, formatDate, toLocalDateStr } from './useCalendar'

// ====== 类型定义 ======

export type EventType = 'course' | 'exam' | 'task' | 'life' | 'reminder' | 'holiday'

export interface ScheduleEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string | null
  all_day: boolean
  event_type: EventType
  event_subtype: string | null
  color: string | null
  recurrence_type: string
  recurrence_days: number[] | null
  recurrence_end: string | null
  reminders: { type: string; value: number }[]
  status: string
  priority: number
  created_at: string
  updated_at: string
}

export interface EventFormData {
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  all_day: boolean
  event_type: EventType
  event_subtype: string
  color: string
  recurrence_type: string
  recurrence_days: number[]
  recurrence_end: string
  reminders: { type: string; value: number }[]
  priority: number
}

export interface Conflict {
  event: ScheduleEvent
  type: 'overlap' | 'adjacent'
}

// ====== 常量 ======

export const EVENT_TYPES: Record<EventType, { label: string; icon: string; color: string; gradient: string }> = {
  course:   { label: '课程', icon: '📚', color: '#4f8ef7', gradient: 'linear-gradient(135deg, #4f8ef7, #60a5fa)' },
  exam:     { label: '考试', icon: '📝', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
  task:     { label: '任务', icon: '🎯', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #fb923c)' },
  life:     { label: '生活', icon: '🏃', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
  reminder: { label: '提醒', icon: '⏰', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  holiday:  { label: '节日', icon: '🎉', color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24, #fcd34d)' },
}

export const REMINDER_OPTIONS = [
  { label: '提前 5 分钟', value: 5 },
  { label: '提前 15 分钟', value: 15 },
  { label: '提前 30 分钟', value: 30 },
  { label: '提前 1 小时', value: 60 },
  { label: '提前 1 天', value: 1440 },
]

export const RECURRENCE_OPTIONS = [
  { label: '不重复', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每两周', value: 'biweekly' },
  { label: '每月', value: 'monthly' },
]

/** 将 #RRGGBB 与另一颜色按比例混合（用于优先级着色） */
function mixHex(base: string, r2: number, g2: number, b2: number, t: number): string {
  const h = base.replace('#', '')
  if (h.length !== 6) return base
  const r1 = parseInt(h.slice(0, 2), 16)
  const g1 = parseInt(h.slice(2, 4), 16)
  const b1 = parseInt(h.slice(4, 6), 16)
  if ([r1, g1, b1].some(n => Number.isNaN(n))) return base
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * 日历上显示用颜色：在类型色基础上按优先级偏移，紧急偏红、高优先级偏橙、较低饱和度灰调。
 */
export function getScheduleEventDisplayColor(event: ScheduleEvent): string {
  const base = event.color || EVENT_TYPES[event.event_type]?.color || '#4f8ef7'
  // 混合比例偏大，避免「同类型任务」在月视图上看起来一片同色
  if (event.priority >= 2) return mixHex(base, 220, 38, 38, 0.58)
  if (event.priority === 1) return mixHex(base, 234, 88, 12, 0.48)
  if (event.priority === -1) return mixHex(base, 100, 116, 139, 0.48)
  return base
}

// ====== 模块级单例状态（终审要求：避免多实例不同步） ======
const events = ref<ScheduleEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// ====== Composable ======

export function useSchedule() {
  // ====== CRUD ======

  /** 获取日期范围内的事件（区间重叠查询由后端完成） */
  const fetchEvents = async (startDate: Date, endDate: Date) => {
    loading.value = true
    error.value = null
    try {
      if (!getToken()) {
        error.value = '未登录'
        events.value = []
        return
      }
      const params = new URLSearchParams({
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      })
      const data = await apiFetch<{ events: ScheduleEvent[] }>(`/api/schedule/events?${params}`)
      events.value = data.events || []
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  /** 创建事件 */
  const createEvent = async (form: EventFormData): Promise<boolean> => {
    try {
      await apiFetch('/api/schedule/events', {
        body: {
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          start_time: form.start_time,
          end_time: form.end_time || null,
          all_day: form.all_day,
          event_type: form.event_type,
          event_subtype: form.event_subtype || null,
          color: form.color || null,
          recurrence_type: form.recurrence_type,
          recurrence_days: form.recurrence_days.length ? form.recurrence_days : null,
          recurrence_end: form.recurrence_end || null,
          reminders: form.reminders,
          priority: form.priority,
        },
      })
      return true
    } catch {
      return false
    }
  }

  /** 更新事件 */
  const updateEvent = async (id: string, form: Partial<EventFormData>): Promise<boolean> => {
    try {
      await apiFetch(`/api/schedule/events/${id}`, { method: 'PATCH', body: form })
      return true
    } catch {
      return false
    }
  }

  /** 删除事件 */
  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/schedule/events/${id}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  }

  // ====== 事件查询辅助 ======

  /** 获取某天的事件 */
  const getEventsForDate = (date: Date): ScheduleEvent[] => {
    return events.value.filter(e => {
      const start = new Date(e.start_time)
      return start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
    })
  }

  /** 获取事件颜色 */
  const getEventColor = (event: ScheduleEvent): string =>
    event.color || EVENT_TYPES[event.event_type]?.color || '#4f8ef7'

  // ====== 冲突检测 ======

  /** 检测新事件与已有事件的时间冲突（非阻断式，含重复事件展开实例） */
  const detectConflicts = (startTime: string, endTime: string, excludeId?: string): Conflict[] => {
    const newStart = new Date(startTime).getTime()
    const newEnd = new Date(endTime).getTime()
    const conflicts: Conflict[] = []

    // 展开重复事件：以新事件前后1天为窗口
    const rangeStart = new Date(newStart - 86400000)
    const rangeEnd = new Date(newEnd + 86400000)
    const expandedEvents = expandRecurringEvents(events.value, rangeStart, rangeEnd)

    for (const evt of expandedEvents) {
      if (evt.id === excludeId || (excludeId && evt.id.startsWith(excludeId + '_r_')) || evt.status !== 'active') continue
      const eStart = new Date(evt.start_time).getTime()
      const eEnd = evt.end_time ? new Date(evt.end_time).getTime() : eStart + 3600000

      if (newStart < eEnd && newEnd > eStart) {
        conflicts.push({ event: evt, type: 'overlap' })
      }
    }
    return conflicts
  }

  // ====== 即将到来（未来 7 天） ======

  const upcomingEvents = computed(() => {
    const now = new Date()
    const weekLater = new Date(now)
    weekLater.setDate(weekLater.getDate() + 7)
    return events.value
      .filter(e => {
        const start = new Date(e.start_time)
        return start >= now && start <= weekLater && e.status === 'active'
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  })

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventColor,
    detectConflicts,
    upcomingEvents,
    EVENT_TYPES,
  }
}
