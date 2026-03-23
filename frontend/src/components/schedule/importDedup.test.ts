import { describe, expect, it } from 'vitest'
import { dedupeImportedEvents } from './importDedup'

describe('dedupeImportedEvents', () => {
  it('removes duplicate events with the same title and time window', () => {
    const events = dedupeImportedEvents([
      {
        title: 'Calculus',
        start_time: '2026-03-28T09:00:00',
        end_time: '2026-03-28T10:30:00',
        event_type: 'course',
        location: 'Room 401',
        confidence: 0.7,
        description: '',
        selected: true,
      },
      {
        title: 'Calculus',
        start_time: '2026-03-28T09:00:00',
        end_time: '2026-03-28T10:30:00',
        event_type: 'course',
        location: 'Room 401',
        confidence: 1,
        description: 'teacher notice',
        selected: true,
      },
    ])

    expect(events).toHaveLength(1)
    expect(events[0].confidence).toBe(1)
    expect(events[0].description).toContain('teacher notice')
  })
})
