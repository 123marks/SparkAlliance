import { describe, expect, it } from 'vitest'
import {
  ACTIVE_GOAL_STATUSES,
  buildDashboardActions,
  buildDashboardStats,
  categorizeWeeklyTasks,
  createCoreFeatures,
  getLocalWeekDateRange,
  resolveScheduleStatus,
  summarizeWeeklyProgress,
  type DashboardSnapshot,
} from './appHomeDashboard'

function createSnapshot(overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    overdueTasks: 0,
    todayTasks: 0,
    activeGoals: 0,
    todayEvents: 0,
    streakDays: 0,
    weeklyCompletedTasks: 0,
    weeklyInProgressTasks: 0,
    weeklyNotStartedTasks: 0,
    weeklyTotalTasks: 0,
    weeklyFocusMinutes: null,
    activeListings: 0,
    pendingTransactions: 0,
    unreadShopMessages: 0,
    quickNoteLength: 0,
    metricStates: {},
    ...overrides,
  }
}

describe('createCoreFeatures', () => {
  it('returns the twelve live dashboard destinations', () => {
    const features = createCoreFeatures()
    expect(features).toHaveLength(12)
    expect(features.every((feature) => feature.active)).toBe(true)
    expect(features.some((feature) => feature.to === '/app/schedule')).toBe(true)
    expect(features.some((feature) => feature.to === '/app/shop')).toBe(true)
  })
})

describe('buildDashboardActions', () => {
  it('prioritizes overdue planner tasks over other actions', () => {
    const actions = buildDashboardActions(createSnapshot({
      overdueTasks: 3,
      todayTasks: 2,
      activeGoals: 1,
      pendingTransactions: 1,
      quickNoteLength: 20,
    }))
    expect(actions[0]?.to).toBe('/app/schedule?module=planner')
    expect(actions[0]?.emphasis).toBe('high')
    expect(actions[0]?.title).toContain('3')
  })

  it('falls back to creation paths when known counts are empty', () => {
    const actions = buildDashboardActions(createSnapshot())
    expect(actions.some((action) => action.id === 'create-goal')).toBe(true)
    expect(actions.some((action) => action.id === 'publish-listing')).toBe(true)
  })

  it('does not present failed or unavailable zeroes as empty real state', () => {
    const actions = buildDashboardActions(createSnapshot({
      metricStates: { activeGoals: 'error', activeListings: 'unavailable' },
    }))
    expect(actions.some((action) => action.id === 'create-goal')).toBe(false)
    expect(actions.some((action) => action.id === 'publish-listing')).toBe(false)
  })

  it('suggests converting a quick note into a task when note content exists', () => {
    const actions = buildDashboardActions(createSnapshot({
      activeGoals: 2,
      activeListings: 1,
      quickNoteLength: 42,
    }))
    expect(actions.some((action) => action.id === 'note-to-task')).toBe(true)
  })
})

describe('buildDashboardStats', () => {
  it('keeps the canonical six-stat order', () => {
    const stats = buildDashboardStats(createSnapshot({
      todayTasks: 4,
      activeGoals: 3,
      activeListings: 5,
      pendingTransactions: 2,
      unreadShopMessages: 3,
      streakDays: 7,
      weeklyFocusMinutes: 744,
    }))
    expect(stats.map((stat) => stat.label)).toEqual([
      '今日任务', '活跃目标', '在售商品', '待处理交流', '本周专注时长', '连续执行天数',
    ])
    expect(stats.map((stat) => stat.value)).toEqual(['4', '3', '5', '2', '12.4', '7'])
  })

  it('renders unavailable and failed metrics explicitly', () => {
    const stats = buildDashboardStats(createSnapshot({
      metricStates: { activeGoals: 'error', weeklyFocusMinutes: 'unavailable' },
    }))
    expect(stats[1]).toMatchObject({ value: '—', state: 'error', sub: '加载失败' })
    expect(stats[4]).toMatchObject({ value: '—', state: 'unavailable', sub: '暂无专注数据' })
  })
})

describe('categorizeWeeklyTasks', () => {
  it('uses task status for the three execution categories', () => {
    expect(categorizeWeeklyTasks([
      { is_completed: true, status: 'completed' },
      { is_completed: false, status: 'in_progress' },
      { is_completed: false, status: 'pending' },
      { is_completed: null, status: null },
    ])).toEqual({ completed: 1, inProgress: 1, notStarted: 2, total: 4 })
  })
})

describe('resolveScheduleStatus', () => {
  const now = new Date('2026-04-26T08:30:00.000Z')

  it('marks an event active only while the current time is inside its range', () => {
    expect(resolveScheduleStatus('2026-04-26T08:00:00.000Z', '2026-04-26T09:00:00.000Z', now)).toBe('active')
  })

  it('marks a future event upcoming only within the next hour', () => {
    expect(resolveScheduleStatus('2026-04-26T09:00:00.000Z', null, now)).toBe('upcoming')
    expect(resolveScheduleStatus('2026-04-26T12:00:00.000Z', null, now)).toBe('pending')
  })

  it('marks an event ended once its explicit end time is reached', () => {
    expect(resolveScheduleStatus('2026-04-26T07:00:00.000Z', '2026-04-26T08:30:00.000Z', now)).toBe('ended')
  })

  it('marks a point-in-time event ended once its start time has passed', () => {
    expect(resolveScheduleStatus('2026-04-26T08:00:00.000Z', null, now)).toBe('ended')
  })
})

describe('getLocalWeekDateRange', () => {
  it('returns the Monday-to-Sunday range when the reference date is Sunday', () => {
    expect(getLocalWeekDateRange(new Date(2026, 3, 26, 12))).toEqual({
      start: '2026-04-20',
      end: '2026-04-26',
    })
  })

  it('keeps both local boundaries correct when the week crosses a month', () => {
    expect(getLocalWeekDateRange(new Date(2026, 4, 1, 12))).toEqual({
      start: '2026-04-27',
      end: '2026-05-03',
    })
  })
})

describe('ACTIVE_GOAL_STATUSES', () => {
  it('counts only active goals', () => {
    expect(ACTIVE_GOAL_STATUSES).toEqual(['active'])
  })
})

describe('summarizeWeeklyProgress', () => {
  it('returns zero progress when there are no weekly tasks', () => {
    expect(summarizeWeeklyProgress(0, 0)).toEqual({
      percent: 0,
      summary: '本周还没有任务，先定一个小目标',
    })
  })

  it('returns rounded weekly progress when tasks exist', () => {
    expect(summarizeWeeklyProgress(7, 9)).toEqual({
      percent: 78,
      summary: '本周已完成 7 / 9 项任务',
    })
  })
})
