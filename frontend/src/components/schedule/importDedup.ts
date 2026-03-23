export interface ImportEventLike {
  title: string
  start_time: string
  end_time: string
  event_type: string
  location: string
  confidence: number
  description: string
  selected: boolean
}

function mergePreferred(primary: ImportEventLike, secondary: ImportEventLike): ImportEventLike {
  return {
    ...primary,
    location: primary.location || secondary.location,
    description: [primary.description, secondary.description].filter(Boolean).join('；'),
    confidence: Math.max(primary.confidence, secondary.confidence),
    selected: primary.selected || secondary.selected,
  }
}

export function dedupeImportedEvents<T extends ImportEventLike>(events: T[]): T[] {
  const map = new Map<string, T>()

  for (const event of events) {
    const key = [
      event.title.trim().toLowerCase(),
      event.start_time,
      event.end_time,
      event.location.trim().toLowerCase(),
    ].join('|')

    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...event })
      continue
    }

    const preferred = existing.confidence >= event.confidence
      ? mergePreferred(existing, event)
      : mergePreferred(event, existing)

    map.set(key, preferred as T)
  }

  return Array.from(map.values())
}
