import { describe, expect, it } from 'vitest'
import { parseStructuredImportFile } from './structuredImport'

describe('parseStructuredImportFile', () => {
  it('parses ics calendar content deterministically', async () => {
    const events = await parseStructuredImportFile(
      'class.ics',
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Linear Algebra\nDTSTART:20260324T090000\nDTEND:20260324T103000\nLOCATION:Room 101\nDESCRIPTION:Teacher Zhang\nEND:VEVENT\nEND:VCALENDAR',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Linear Algebra')
    expect(events[0].location).toBe('Room 101')
    expect(events[0].start_time).toBe('2026-03-24T09:00:00')
  })

  it('parses csv rows with title and time columns deterministically', async () => {
    const events = await parseStructuredImportFile(
      'schedule.csv',
      'title,start_time,end_time,location,event_type\nEnglish,2026-03-25T08:00:00,2026-03-25T09:30:00,Room 202,course',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('English')
    expect(events[0].event_type).toBe('course')
    expect(events[0].end_time).toBe('2026-03-25T09:30:00')
  })

  it('parses tsv rows with title and time columns deterministically', async () => {
    const events = await parseStructuredImportFile(
      'schedule.tsv',
      'title\tstart_time\tend_time\tlocation\tevent_type\nPhysics\t2026-03-26T10:00:00\t2026-03-26T11:30:00\tLab 1\tcourse',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Physics')
    expect(events[0].location).toBe('Lab 1')
  })

  it('parses markdown tables with event columns deterministically', async () => {
    const events = await parseStructuredImportFile(
      'notice.md',
      [
        '| title | start_time | end_time | location | event_type |',
        '| --- | --- | --- | --- | --- |',
        '| Chemistry | 2026-03-27 14:00 | 2026-03-27 15:30 | Lab 3 | course |',
      ].join('\n'),
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Chemistry')
    expect(events[0].start_time).toBe('2026-03-27T14:00:00')
  })

  it('parses plain text schedule lines with time ranges', async () => {
    const events = await parseStructuredImportFile(
      'notice.txt',
      '2026-03-28 09:00-10:30 Calculus @ Room 401',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Calculus')
    expect(events[0].location).toBe('Room 401')
    expect(events[0].end_time).toBe('2026-03-28T10:30:00')
  })

  it('parses bullet text lines with slash dates and Chinese dash separators', async () => {
    const events = await parseStructuredImportFile(
      'notice.txt',
      '- 2026/04/02 08:00～09:30 Physics @ Lab 2',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Physics')
    expect(events[0].start_time).toBe('2026-04-02T08:00:00')
  })

  it('parses html tables with event columns deterministically', async () => {
    const events = await parseStructuredImportFile(
      'notice.html',
      '<table><tr><th>title</th><th>start_time</th><th>end_time</th><th>location</th></tr><tr><td>Seminar</td><td>2026-03-29 16:00</td><td>2026-03-29 17:00</td><td>Hall A</td></tr></table>',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Seminar')
    expect(events[0].location).toBe('Hall A')
  })

  it('parses json arrays with event objects deterministically', async () => {
    const events = await parseStructuredImportFile(
      'notice.json',
      JSON.stringify([
        {
          title: 'Hackathon',
          start_time: '2026-03-30T18:00:00',
          end_time: '2026-03-30T21:00:00',
          location: 'Innovation Hub',
          event_type: 'task',
          description: 'team event',
        },
      ]),
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Hackathon')
    expect(events[0].location).toBe('Innovation Hub')
  })

  it('parses xml event lists deterministically', async () => {
    const events = await parseStructuredImportFile(
      'notice.xml',
      '<events><event><title>Workshop</title><start_time>2026-03-31 13:00</start_time><end_time>2026-03-31 15:00</end_time><location>Room 12</location><event_type>course</event_type></event></events>',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Workshop')
    expect(events[0].event_type).toBe('course')
  })

  it('parses rtf content through plain-text fallback', async () => {
    const events = await parseStructuredImportFile(
      'notice.rtf',
      '{\\rtf1\\ansi 2026-04-01 08:00-09:30 English @ Room 203}',
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('English')
  })
})
