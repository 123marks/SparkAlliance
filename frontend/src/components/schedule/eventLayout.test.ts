import { describe, expect, it } from 'vitest'
import { buildTimedEventLayouts } from './eventLayout'

describe('buildTimedEventLayouts', () => {
  it('splits overlapping events into columns instead of full-width overlap', () => {
    const layouts = buildTimedEventLayouts([
      {
        id: 'a',
        start_time: '2026-03-24T09:00:00',
        end_time: '2026-03-24T10:00:00',
      },
      {
        id: 'b',
        start_time: '2026-03-24T09:30:00',
        end_time: '2026-03-24T10:30:00',
      },
    ])

    expect(layouts).toHaveLength(2)
    expect(layouts.every(layout => layout.columnCount === 2)).toBe(true)
    expect(layouts.map(layout => layout.columnIndex).sort()).toEqual([0, 1])
  })

  it('reuses width for non-overlapping events in separate groups', () => {
    const layouts = buildTimedEventLayouts([
      {
        id: 'a',
        start_time: '2026-03-24T09:00:00',
        end_time: '2026-03-24T10:00:00',
      },
      {
        id: 'b',
        start_time: '2026-03-24T10:00:00',
        end_time: '2026-03-24T11:00:00',
      },
    ])

    expect(layouts.every(layout => layout.columnCount === 1)).toBe(true)
    expect(layouts.every(layout => layout.columnIndex === 0)).toBe(true)
  })
})
