import { describe, expect, it } from 'vitest'
import {
  buildDashboardActions,
  buildDashboardStats,
  createCoreFeatures,
  summarizeWeeklyProgress,
  type DashboardSnapshot,
} from './appHomeDashboard'

describe('createCoreFeatures', () => {
  it('marks planner and shop as live features', () => {
    const features = createCoreFeatures()
    const planner = features.find((feature) => feature.title === '星火规划')
    const shop = features.find((feature) => feature.title === '星火购物')

    expect(planner?.active).toBe(true)
    expect(shop?.active).toBe(true)
  })
})

describe('buildDashboardActions', () => {
  it('prioritizes overdue planner tasks over other actions', () => {
    const snapshot: DashboardSnapshot = {
      overdueTasks: 3,
      todayTasks: 2,
      activeGoals: 1,
      todayEvents: 1,
      streakDays: 4,
      weeklyCompletedTasks: 5,
      weeklyTotalTasks: 8,
      activeListings: 2,
      pendingTransactions: 1,
      unreadShopMessages: 0,
      quickNoteLength: 20,
    }

    const actions = buildDashboardActions(snapshot)

    expect(actions[0]?.to).toBe('/app/planner')
    expect(actions[0]?.emphasis).toBe('high')
    expect(actions[0]?.title).toContain('3')
  })

  it('falls back to a creation path when user has no active goals or listings', () => {
    const snapshot: DashboardSnapshot = {
      overdueTasks: 0,
      todayTasks: 0,
      activeGoals: 0,
      todayEvents: 0,
      streakDays: 0,
      weeklyCompletedTasks: 0,
      weeklyTotalTasks: 0,
      activeListings: 0,
      pendingTransactions: 0,
      unreadShopMessages: 0,
      quickNoteLength: 0,
    }

    const actions = buildDashboardActions(snapshot)

    expect(actions.some((action) => action.to === '/app/planner')).toBe(true)
    expect(actions.some((action) => action.to === '/app/shop')).toBe(true)
    expect(actions.every((action) => !action.title.includes('即将上线'))).toBe(true)
  })

  it('suggests converting a quick note into a task when note content exists', () => {
    const snapshot: DashboardSnapshot = {
      overdueTasks: 0,
      todayTasks: 0,
      activeGoals: 2,
      todayEvents: 0,
      streakDays: 2,
      weeklyCompletedTasks: 1,
      weeklyTotalTasks: 4,
      activeListings: 1,
      pendingTransactions: 0,
      unreadShopMessages: 0,
      quickNoteLength: 42,
    }

    const actions = buildDashboardActions(snapshot)

    expect(actions.some((action) => action.id === 'note-to-task')).toBe(true)
  })
})

describe('buildDashboardStats', () => {
  it('builds readable stats from the dashboard snapshot', () => {
    const snapshot: DashboardSnapshot = {
      overdueTasks: 1,
      todayTasks: 4,
      activeGoals: 3,
      todayEvents: 2,
      streakDays: 7,
      weeklyCompletedTasks: 6,
      weeklyTotalTasks: 10,
      activeListings: 5,
      pendingTransactions: 2,
      unreadShopMessages: 3,
      quickNoteLength: 0,
    }

    const stats = buildDashboardStats(snapshot)

    expect(stats.map((stat) => stat.label)).toEqual([
      '今日任务',
      '活跃目标',
      '在售商品',
      '待处理交易',
    ])
    expect(stats[0]?.value).toBe('4')
    expect(stats[3]?.value).toBe('2')
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
