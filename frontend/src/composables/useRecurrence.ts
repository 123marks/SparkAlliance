/**
 * useRecurrence.ts — 重复事件前端限窗展开
 *
 * 终审裁决：
 * - 课表导入 → 后端预生成具体事件（不在此处理）
 * - 普通重复事件 → 保存规则，按视图范围前端展开
 * - MVP 不支持单实例例外编辑/删除
 */
import type { ScheduleEvent } from './useSchedule'
import { isSameDay } from './useCalendar'

/**
 * 按视图时间窗口展开重复事件
 * 
 * @param events 原始事件列表（含 recurrence_type）
 * @param rangeStart 视图窗口开始
 * @param rangeEnd 视图窗口结束
 * @returns 展开后的所有事件实例（含原始 + 虚拟实例）
 */
export function expandRecurringEvents(
  events: ScheduleEvent[],
  rangeStart: Date,
  rangeEnd: Date
): ScheduleEvent[] {
  const result: ScheduleEvent[] = []

  for (const event of events) {
    // 非重复事件直接加入
    if (event.recurrence_type === 'none' || !event.recurrence_type) {
      result.push(event)
      continue
    }

    // 重复事件按窗口展开
    const instances = generateInstances(event, rangeStart, rangeEnd)
    result.push(...instances)
  }

  return result
}

/**
 * 为单个重复事件生成窗口内的所有实例
 */
function generateInstances(
  event: ScheduleEvent,
  rangeStart: Date,
  rangeEnd: Date
): ScheduleEvent[] {
  const instances: ScheduleEvent[] = []
  const originalStart = new Date(event.start_time)
  const duration = event.end_time
    ? new Date(event.end_time).getTime() - originalStart.getTime()
    : 3600000 // 默认 1 小时

  // 重复结束时间（无限制则用窗口结束）
  const recurrenceEnd = event.recurrence_end
    ? (() => {
        const d = new Date(`${event.recurrence_end}T23:59:59.999`)
        return Number.isNaN(d.getTime()) ? rangeEnd : d
      })()
    : rangeEnd

  // 限制最大展开数量，防止性能问题
  const MAX_INSTANCES = 100
  let count = 0

  // 从事件原始时间开始递推
  const cursor = new Date(originalStart)

  while (cursor <= recurrenceEnd && cursor <= rangeEnd && count < MAX_INSTANCES) {
    const previousTime = cursor.getTime()

    // 只保留窗口内的实例
    if (cursor >= rangeStart || 
        new Date(cursor.getTime() + duration) >= rangeStart) {
      
      // 检查是否是原始事件日期（避免重复添加）
      const isOriginal = isSameDay(cursor, originalStart) && 
        cursor.getHours() === originalStart.getHours()

      const instanceStart = new Date(cursor)
      const instanceEnd = new Date(cursor.getTime() + duration)

      instances.push({
        ...event,
        // 虚拟实例标记用 id 后缀区分
        id: isOriginal ? event.id : `${event.id}_r_${cursor.getTime()}`,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
      })
      count++
    }

    // 按重复类型推进日期
    advanceCursor(cursor, event.recurrence_type, event.recurrence_days)

    // 安全检查：如果 cursor 没有前进则跳出（防死循环）
    if (cursor.getTime() <= previousTime) break
  }

  return instances
}

/**
 * 按重复类型推进日期游标
 */
function advanceCursor(
  cursor: Date,
  type: string,
  recurrenceDays: number[] | null
): void {
  switch (type) {
    case 'daily':
      cursor.setDate(cursor.getDate() + 1)
      break

    case 'weekly':
      if (recurrenceDays && recurrenceDays.length > 0) {
        // 有自定义周几：找下一个匹配的周几
        advanceToNextWeekday(cursor, recurrenceDays)
      } else {
        cursor.setDate(cursor.getDate() + 7)
      }
      break

    case 'biweekly':
      cursor.setDate(cursor.getDate() + 14)
      break

    case 'monthly':
      cursor.setMonth(cursor.getMonth() + 1)
      break

    default:
      // 未知类型，直接跳到窗口外防死循环
      cursor.setFullYear(cursor.getFullYear() + 100)
  }
}

/**
 * 推进到下一个匹配的周几
 * recurrenceDays: [1,3,5] 表示周一、三、五
 */
function advanceToNextWeekday(cursor: Date, days: number[]): void {
  const sorted = [...days].sort((a, b) => a - b)
  const currentDay = cursor.getDay() // 0=日, 1=一, ..., 6=六

  // 找今天之后最近的匹配日
  for (const day of sorted) {
    if (day > currentDay) {
      cursor.setDate(cursor.getDate() + (day - currentDay))
      return
    }
  }

  // 本周没有了，跳到下周第一个匹配日
  const daysUntilNext = 7 - currentDay + sorted[0]
  cursor.setDate(cursor.getDate() + daysUntilNext)
}
