import { describe, expect, it } from 'vitest'
import { fromLocalDateStr, getActiveQueryRange, toLocalDateStr } from './useCalendar'

describe('useCalendar local date helpers', () => {
  it('parses local date strings without timezone drift', () => {
    const parsed = fromLocalDateStr('2026-04-01')

    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(3)
    expect(parsed.getDate()).toBe(1)
    expect(toLocalDateStr(parsed)).toBe('2026-04-01')
  })
})

describe('useCalendar active query range', () => {
  it('uses the selected week range for week view instead of current month cache', () => {
    const { start, end } = getActiveQueryRange('week', new Date(2026, 4, 1), 2026, 4)

    expect(toLocalDateStr(start)).toBe('2026-04-27')
    expect(toLocalDateStr(end)).toBe('2026-05-03')
  })

  it('uses the selected day range for day view', () => {
    const { start, end } = getActiveQueryRange('day', new Date(2026, 4, 1), 2026, 4)

    expect(toLocalDateStr(start)).toBe('2026-05-01')
    expect(toLocalDateStr(end)).toBe('2026-05-01')
    expect(end.getHours()).toBe(23)
  })
})
