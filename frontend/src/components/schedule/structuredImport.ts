import type { EventType } from '../../composables/useSchedule'
import { getFileExtension } from './aiImportUtils'

export interface StructuredImportEvent {
  title: string
  start_time: string
  end_time: string
  event_type: EventType
  location: string
  confidence: number
  description: string
}

function normalizeEventType(value: string): EventType {
  const normalized = value.trim().toLowerCase()
  if (['course', 'class', 'lesson', 'lecture', '课程'].includes(normalized)) return 'course'
  if (['exam', 'test', 'quiz', '考试'].includes(normalized)) return 'exam'
  if (['life', 'personal', '生活'].includes(normalized)) return 'life'
  if (['reminder', 'alarm', '提醒'].includes(normalized)) return 'reminder'
  if (['holiday', 'festival', '假期', '节日'].includes(normalized)) return 'holiday'
  return 'task'
}

function inferEventType(title: string, description: string): EventType {
  const content = `${title} ${description}`.toLowerCase()
  if (/(考试|测验|quiz|midterm|final|exam)/.test(content)) return 'exam'
  if (/(课程|上课|class|course|lecture|seminar|实验|lab|workshop)/.test(content)) return 'course'
  if (/(提醒|alarm|reminder)/.test(content)) return 'reminder'
  if (/(假期|放假|holiday|festival)/.test(content)) return 'holiday'
  if (/(生活|personal|birthday|聚会|meeting)/.test(content)) return 'life'
  return 'task'
}

function formatParts(year: string, month: string, day: string, hour = '00', minute = '00', second = '00') {
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

function normalizeDateTime(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (/^\d{8}T\d{6}Z?$/.test(trimmed)) {
    return formatParts(
      trimmed.slice(0, 4),
      trimmed.slice(4, 6),
      trimmed.slice(6, 8),
      trimmed.slice(9, 11),
      trimmed.slice(11, 13),
      trimmed.slice(13, 15),
    )
  }

  if (/^\d{8}$/.test(trimmed)) {
    return formatParts(trimmed.slice(0, 4), trimmed.slice(4, 6), trimmed.slice(6, 8))
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00`
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(' ', 'T') + ':00'
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(' ', 'T')
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ''

  return formatParts(
    String(parsed.getFullYear()),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
    String(parsed.getHours()).padStart(2, '0'),
    String(parsed.getMinutes()).padStart(2, '0'),
    String(parsed.getSeconds()).padStart(2, '0'),
  )
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === separator && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function mapObjectToEvent(item: Record<string, unknown>): StructuredImportEvent | null {
  const title = String(item.title || item.summary || item.name || item.subject || '').trim()
  const description = String(item.description || item.note || item.notes || '').trim()
  const location = String(item.location || item.room || item.place || '').trim()
  const start = normalizeDateTime(String(item.start_time || item.start || item.dtstart || ''))
  const end = normalizeDateTime(String(item.end_time || item.end || item.dtend || ''))
  const eventTypeRaw = String(item.event_type || item.type || item.category || '').trim()

  if (!title || !start) return null

  return {
    title,
    start_time: start,
    end_time: end || start,
    event_type: eventTypeRaw ? normalizeEventType(eventTypeRaw) : inferEventType(title, description),
    location,
    confidence: 1,
    description,
  }
}

function parseDelimited(text: string, separator: string): StructuredImportEvent[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseDelimitedLine(lines[0], separator).map(header => header.trim().toLowerCase())
  const getValue = (row: string[], aliases: string[]) => {
    const index = headers.findIndex(header => aliases.includes(header))
    return index >= 0 ? row[index] || '' : ''
  }

  return lines
    .slice(1)
    .map((line) => {
      const row = parseDelimitedLine(line, separator)
      return mapObjectToEvent({
        title: getValue(row, ['title', 'summary', 'name', 'subject']),
        start_time: getValue(row, ['start_time', 'start', 'start date', 'dtstart']),
        end_time: getValue(row, ['end_time', 'end', 'end date', 'dtend']),
        location: getValue(row, ['location', 'room', 'place']),
        event_type: getValue(row, ['event_type', 'type', 'category']),
        description: getValue(row, ['description', 'note', 'notes']),
      })
    })
    .filter((event): event is StructuredImportEvent => !!event)
}

function parseMarkdownTable(text: string): StructuredImportEvent[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('|') && line.endsWith('|'))

  if (lines.length < 3) return []
  if (!/^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1])) return []

  const toCells = (line: string) => line.slice(1, -1).split('|').map(cell => cell.trim())
  const headers = toCells(lines[0]).join(',')
  const rows = lines.slice(2).map(line => toCells(line).join(','))
  return parseDelimited([headers, ...rows].join('\n'), ',')
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-z]+-?\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHtmlTable(html: string): StructuredImportEvent[] {
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
  if (rows.length < 2) return []

  const extractCells = (rowHtml: string, tag: 'th' | 'td') =>
    Array.from(rowHtml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')))
      .map(match => stripHtml(match[1]))

  const headers = extractCells(rows[0][1], 'th')
  if (headers.length === 0) return []

  const bodyRows = rows
    .slice(1)
    .map(row => extractCells(row[1], 'td'))
    .filter(cells => cells.length > 0)

  return parseDelimited([headers.join(','), ...bodyRows.map(cells => cells.join(','))].join('\n'), ',')
}

function parseJson(text: string): StructuredImportEvent[] {
  const parsed = JSON.parse(text) as unknown
  const items = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { events?: unknown[] }).events)
      ? (parsed as { events: unknown[] }).events
      : [])

  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(mapObjectToEvent)
    .filter((event): event is StructuredImportEvent => !!event)
}

function parseXmlEventList(xml: string): StructuredImportEvent[] {
  const eventMatches = Array.from(xml.matchAll(/<event\b[^>]*>([\s\S]*?)<\/event>/gi))
  if (eventMatches.length === 0) return []

  const readTag = (content: string, tagName: string) => {
    const match = content.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
    return match ? stripHtml(match[1]) : ''
  }

  return eventMatches
    .map(match => mapObjectToEvent({
      title: readTag(match[1], 'title'),
      summary: readTag(match[1], 'summary'),
      start_time: readTag(match[1], 'start_time'),
      end_time: readTag(match[1], 'end_time'),
      location: readTag(match[1], 'location'),
      event_type: readTag(match[1], 'event_type'),
      description: readTag(match[1], 'description'),
    }))
    .filter((event): event is StructuredImportEvent => !!event)
}

function parsePlainTextLines(text: string): StructuredImportEvent[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const events: StructuredImportEvent[] = []

  for (const rawLine of lines) {
    const line = rawLine
      .replace(/^[\-*•]\s*/, '')
      .replace(/\//g, '-')
      .replace(/[～—–至]/g, '-')
      .replace(/[：]/g, ':')

    const match = line.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s+(.+?)(?:\s+[@＠]\s*(.+))?$/,
    )
    if (!match) continue

    const [, date, startTime, endTime, rawTitle, rawLocation] = match
    const title = rawTitle.trim()
    const location = (rawLocation || '').trim()
    events.push({
      title,
      start_time: `${date}T${startTime}:00`,
      end_time: `${date}T${endTime}:00`,
      event_type: inferEventType(title, ''),
      location,
      confidence: 1,
      description: '',
    })
  }

  return events
}

function unfoldIcsLines(text: string): string[] {
  return text
    .replace(/\r?\n[ \t]/g, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function parseIcs(text: string): StructuredImportEvent[] {
  const lines = unfoldIcsLines(text)
  const events: StructuredImportEvent[] = []
  let current: Record<string, string> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }

    if (line === 'END:VEVENT') {
      if (current) {
        const title = current.SUMMARY || 'Untitled Event'
        const start = normalizeDateTime(current.DTSTART || '')
        const end = normalizeDateTime(current.DTEND || current.DTSTART || '')

        if (start) {
          events.push({
            title,
            start_time: start,
            end_time: end || start,
            event_type: current.CATEGORIES
              ? normalizeEventType(current.CATEGORIES)
              : inferEventType(title, current.DESCRIPTION || ''),
            location: current.LOCATION || '',
            confidence: 1,
            description: current.DESCRIPTION || '',
          })
        }
      }

      current = null
      continue
    }

    if (!current) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).split(';')[0].toUpperCase()
    current[key] = line.slice(separator + 1).trim()
  }

  return events
}

export async function parseStructuredImportFile(name: string, text: string): Promise<StructuredImportEvent[]> {
  const ext = getFileExtension(name)

  if (ext === 'ics' || ext === 'ical') return parseIcs(text)
  if (ext === 'csv') return parseDelimited(text, ',')
  if (ext === 'tsv') return parseDelimited(text, '\t')
  if (ext === 'json') return parseJson(text)

  if (ext === 'xml') {
    const xmlEvents = parseXmlEventList(text)
    if (xmlEvents.length > 0) return xmlEvents
    return parsePlainTextLines(stripHtml(text))
  }

  if (ext === 'md' || ext === 'markdown') {
    const markdownTable = parseMarkdownTable(text)
    if (markdownTable.length > 0) return markdownTable
    return parsePlainTextLines(text)
  }

  if (ext === 'html' || ext === 'htm') {
    const htmlTable = parseHtmlTable(text)
    if (htmlTable.length > 0) return htmlTable
    return parsePlainTextLines(stripHtml(text))
  }

  if (ext === 'rtf') return parsePlainTextLines(stripRtf(text))
  if (ext === 'txt') return parsePlainTextLines(text)

  return []
}
