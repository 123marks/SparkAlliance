export type SparkActionType = 'add_schedule' | 'create_goal' | 'navigate'

type EventType = 'course' | 'exam' | 'task' | 'life' | 'reminder' | 'holiday'
type GoalType = 'academic' | 'skill' | 'habit' | 'fitness' | 'career' | 'custom'
type ScheduleModule = 'calendar' | 'planner' | 'tarot'
type PlannerTab = 'today' | 'goals' | 'history' | 'habits' | 'achievements'
type ScheduleView = 'month' | 'week' | 'day'

interface ActionDataBase {
  title?: string
  description?: string
  label?: string
  path?: string
  query?: Record<string, string>
}

export interface AddScheduleAction {
  action: 'add_schedule'
  data: ActionDataBase & {
    title: string
    description?: string
    start_time: string
    end_time?: string
    event_type?: EventType
    priority?: number
  }
}

export interface CreateGoalAction {
  action: 'create_goal'
  data: ActionDataBase & {
    title: string
    goal_type: GoalType
    deadline: string
    description?: string
  }
}

export interface NavigateAction {
  action: 'navigate'
  data: ActionDataBase & {
    path: string
    label?: string
    query?: Record<string, string>
  }
}

export type SparkAction = AddScheduleAction | CreateGoalAction | NavigateAction

export interface AssistantLocation {
  path: string
  query?: Record<string, string>
}

const ACTION_BLOCK_REGEX = /```spark-action\s*\n([\s\S]*?)```/g
const APP_PATH_PATTERN = /^\/app(?:\/[A-Za-z0-9_-]+)*$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const ALLOWED_EVENT_TYPES = new Set<EventType>(['course', 'exam', 'task', 'life', 'reminder', 'holiday'])
const ALLOWED_GOAL_TYPES = new Set<GoalType>(['academic', 'skill', 'habit', 'fitness', 'career', 'custom'])
const ALLOWED_SCHEDULE_MODULES = new Set<ScheduleModule>(['calendar', 'planner', 'tarot'])
const ALLOWED_PLANNER_TABS = new Set<PlannerTab>(['today', 'goals', 'history', 'habits', 'achievements'])
const ALLOWED_SCHEDULE_VIEWS = new Set<ScheduleView>(['month', 'week', 'day'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function asIsoDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function asDateOnly(value: unknown): string | undefined {
  const raw = asTrimmedString(value)
  if (!raw || !ISO_DATE_PATTERN.test(raw)) return undefined
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return raw
}

function clampPriority(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(3, Math.max(1, Math.round(value)))
}

function sanitizeQueryValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function sanitizeAssistantQuery(path: string, params: URLSearchParams): Record<string, string> | undefined {
  const query: Record<string, string> = {}

  if (path === '/app/schedule') {
    const moduleValue = sanitizeQueryValue(params.get('module') || '')
    const tabValue = sanitizeQueryValue(params.get('tab') || '')
    const viewValue = sanitizeQueryValue(params.get('view') || '')
    const dateValue = sanitizeQueryValue(params.get('date') || '')
    const goalIdValue = sanitizeQueryValue(params.get('goalId') || '')

    if (moduleValue && ALLOWED_SCHEDULE_MODULES.has(moduleValue as ScheduleModule)) query.module = moduleValue
    if (tabValue && ALLOWED_PLANNER_TABS.has(tabValue as PlannerTab)) query.tab = tabValue
    if (viewValue && ALLOWED_SCHEDULE_VIEWS.has(viewValue as ScheduleView)) query.view = viewValue
    if (dateValue && ISO_DATE_PATTERN.test(dateValue)) query.date = dateValue
    if (goalIdValue) query.goalId = goalIdValue
  }

  return Object.keys(query).length > 0 ? query : undefined
}

export function resolveAssistantLocation(input: string | NavigateAction['data']): AssistantLocation | null {
  const rawPath = typeof input === 'string' ? input : input.path
  const rawQuery = typeof input === 'string' ? undefined : input.query

  if (!rawPath || /^(?:https?:|javascript:|data:)/i.test(rawPath.trim())) return null

  const parsed = new URL(rawPath, 'https://spark.local')
  if (!APP_PATH_PATTERN.test(parsed.pathname)) return null

  const mergedParams = new URLSearchParams(parsed.search)
  if (rawQuery) {
    for (const [key, value] of Object.entries(rawQuery)) {
      const safeValue = sanitizeQueryValue(value)
      if (safeValue) mergedParams.set(key, safeValue)
    }
  }

  return {
    path: parsed.pathname,
    query: sanitizeAssistantQuery(parsed.pathname, mergedParams),
  }
}

export function sanitizeSparkAction(candidate: unknown): SparkAction | null {
  if (!isRecord(candidate) || typeof candidate.action !== 'string' || !isRecord(candidate.data)) return null

  if (candidate.action === 'add_schedule') {
    const title = asTrimmedString(candidate.data.title)
    const startTime = asIsoDateTime(candidate.data.start_time)
    if (!title || !startTime) return null

    const endTime = candidate.data.end_time ? asIsoDateTime(candidate.data.end_time) : undefined
    const eventType = asTrimmedString(candidate.data.event_type)
    const priority = clampPriority(candidate.data.priority)

    return {
      action: 'add_schedule',
      data: {
        title,
        description: asOptionalString(candidate.data.description),
        start_time: startTime,
        end_time: endTime,
        event_type: eventType && ALLOWED_EVENT_TYPES.has(eventType as EventType)
          ? eventType as EventType
          : 'task',
        priority,
      },
    }
  }

  if (candidate.action === 'create_goal') {
    const title = asTrimmedString(candidate.data.title)
    const goalType = asTrimmedString(candidate.data.goal_type)
    const deadline = asDateOnly(candidate.data.deadline)
    if (!title || !goalType || !deadline || !ALLOWED_GOAL_TYPES.has(goalType as GoalType)) return null

    return {
      action: 'create_goal',
      data: {
        title,
        goal_type: goalType as GoalType,
        deadline,
        description: asOptionalString(candidate.data.description),
      },
    }
  }

  if (candidate.action === 'navigate') {
    const label = asOptionalString(candidate.data.label)
    const location = resolveAssistantLocation({
      path: String(candidate.data.path || ''),
      query: isRecord(candidate.data.query)
        ? Object.fromEntries(
            Object.entries(candidate.data.query).filter(([, value]) => typeof value === 'string'),
          ) as Record<string, string>
        : undefined,
    })

    if (!location) return null

    return {
      action: 'navigate',
      data: {
        path: location.path,
        label,
        query: location.query,
      },
    }
  }

  return null
}

export function parseSparkActions(content: string): { cleanContent: string; actions: SparkAction[] } {
  const actions: SparkAction[] = []
  let match: RegExpExecArray | null

  while ((match = ACTION_BLOCK_REGEX.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const candidate of candidates) {
        const action = sanitizeSparkAction(candidate)
        if (action) actions.push(action)
      }
    } catch {
      // Ignore malformed blocks so the assistant can still respond.
    }
  }

  return {
    cleanContent: content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim(),
    actions,
  }
}
