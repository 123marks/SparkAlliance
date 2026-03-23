import { describe, expect, it } from 'vitest'
import { expandRecurringEvents } from './useRecurrence'

describe('expandRecurringEvents', () => {
  it('includes the last occurrence on recurrence_end day', () => {
    const events = expandRecurringEvents(
      [{
        id: 'evt-1',
        user_id: 'user-1',
        title: '线代',
        description: null,
        location: '教一-101',
        start_time: '2026-03-24T09:00:00',
        end_time: '2026-03-24T10:00:00',
        all_day: false,
        event_type: 'course',
        event_subtype: null,
        color: null,
        recurrence_type: 'weekly',
        recurrence_days: null,
        recurrence_end: '2026-03-31',
        reminders: [],
        status: 'active',
        priority: 0,
        created_at: '2026-03-01T00:00:00',
        updated_at: '2026-03-01T00:00:00',
      }],
      new Date('2026-03-01T00:00:00'),
      new Date('2026-04-10T23:59:59'),
    )

    expect(events.map(event => event.start_time.slice(0, 10))).toContain('2026-03-31')
  })
})
