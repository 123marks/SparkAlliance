export interface TimedEventLike {
  id: string
  start_time: string
  end_time?: string | null
}

export interface TimedEventLayout<T extends TimedEventLike = TimedEventLike> {
  event: T
  columnIndex: number
  columnCount: number
  startMinutes: number
  durationMinutes: number
}

function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function getEndDate<T extends TimedEventLike>(event: T, start: Date): Date {
  return event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 60 * 60 * 1000)
}

export function buildTimedEventLayouts<T extends TimedEventLike>(events: T[]): TimedEventLayout<T>[] {
  const sorted = [...events].sort((left, right) => {
    const leftStart = new Date(left.start_time).getTime()
    const rightStart = new Date(right.start_time).getTime()
    if (leftStart !== rightStart) return leftStart - rightStart

    const leftEnd = getEndDate(left, new Date(left.start_time)).getTime()
    const rightEnd = getEndDate(right, new Date(right.start_time)).getTime()
    return leftEnd - rightEnd
  })

  const results: TimedEventLayout<T>[] = []
  let active: Array<{ endTime: number; columnIndex: number }> = []
  let groupIndices: number[] = []
  let groupColumnCount = 0

  const finalizeGroup = () => {
    if (groupIndices.length === 0) return
    for (const index of groupIndices) {
      results[index].columnCount = Math.max(groupColumnCount, 1)
    }
    groupIndices = []
    groupColumnCount = 0
  }

  for (const event of sorted) {
    const start = new Date(event.start_time)
    const end = getEndDate(event, start)
    const startTime = start.getTime()
    const endTime = end.getTime()

    active = active.filter(item => item.endTime > startTime)
    if (active.length === 0) finalizeGroup()

    let columnIndex = 0
    const usedColumns = new Set(active.map(item => item.columnIndex))
    while (usedColumns.has(columnIndex)) columnIndex += 1

    const layout: TimedEventLayout<T> = {
      event,
      columnIndex,
      columnCount: 1,
      startMinutes: toMinutes(start),
      durationMinutes: Math.max((endTime - startTime) / 60000, 15),
    }

    results.push(layout)
    groupIndices.push(results.length - 1)
    groupColumnCount = Math.max(groupColumnCount, columnIndex + 1)
    active.push({ endTime, columnIndex })
  }

  finalizeGroup()
  return results
}
