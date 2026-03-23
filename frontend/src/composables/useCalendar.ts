/**
 * useCalendar.ts — 纯日历计算函数
 *
 * 终审要求：抽离为纯函数，方便测试闰年、跨月、周起始日等边界
 * 所有日期格式化使用本地时区，禁止 toISOString().split('T')[0]
 */

// ====== 日期网格 ======

/** 获取月视图网格（6 周 × 7 天，周一起始） */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1)
  // 周一起始：dayOfWeek 0(日) → 6, 1(一) → 0, ...
  const startOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startOffset)

  const grid: Date[][] = []
  const current = new Date(startDate)
  for (let week = 0; week < 6; week++) {
    const row: Date[] = []
    for (let day = 0; day < 7; day++) {
      row.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    grid.push(row)
  }
  return grid
}

/** 获取某周周一到周日的日期 */
export function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const dayOfWeek = (d.getDay() + 6) % 7 // 周一=0
  d.setDate(d.getDate() - dayOfWeek)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

// ====== 日期比较 ======

/** 判断两个日期是否同一天 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

/** 判断日期是否是今天 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// ====== 安全日期格式化（本地时区） ======

/**
 * 转换 Date 为本地日期字符串 YYYY-MM-DD
 * ⚠️ 禁止使用 toISOString().split('T')[0]，会导致 UTC 偏移
 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromLocalDateStr(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0)
}

/** 格式化时间 HH:mm（本地时区） */
export function formatTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 格式化日期 M月D日（本地时区） */
export function formatDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 格式化时间 HH:mm（从 Date 提取本地小时分钟） */
export function toLocalTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ====== 视图范围计算 ======

/** 获取月视图查询范围（当月前后各扩展 7 天） */
export function getMonthQueryRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 2, 24) // 前一月 24 日起
  const end = new Date(year, month, 8)         // 下月 8 日止
  return { start, end }
}

/** 获取周视图查询范围 */
export function getWeekQueryRange(date: Date): { start: Date; end: Date } {
  const days = getWeekDays(date)
  const start = new Date(days[0])
  start.setHours(0, 0, 0, 0)
  const end = new Date(days[6])
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** 获取日视图查询范围 */
export function getDayQueryRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export type CalendarView = 'month' | 'week' | 'day'

export function getActiveQueryRange(
  view: CalendarView,
  selectedDate: Date,
  currentYear: number,
  currentMonth: number,
): { start: Date; end: Date } {
  if (view === 'week') return getWeekQueryRange(selectedDate)
  if (view === 'day') return getDayQueryRange(selectedDate)
  return getMonthQueryRange(currentYear, currentMonth)
}
