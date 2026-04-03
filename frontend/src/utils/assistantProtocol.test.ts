import { describe, expect, it } from 'vitest'

import {
  parseSparkActions,
  resolveAssistantLocation,
  sanitizeSparkAction,
} from './assistantProtocol'

describe('assistantProtocol', () => {
  it('parses and sanitizes valid spark actions', () => {
    const source = [
      '先帮你处理这两个操作。',
      '```spark-action',
      '{"action":"create_goal","data":{"title":"30天学完 Python","goal_type":"skill","deadline":"2026-05-01","description":"每天练习"}}',
      '```',
      '```spark-action',
      '{"action":"navigate","data":{"path":"/app/schedule?module=planner&tab=goals&goalId=goal_1","label":"打开规划"}}',
      '```',
    ].join('\n')

    const { cleanContent, actions } = parseSparkActions(source)

    expect(cleanContent).toBe('先帮你处理这两个操作。')
    expect(actions).toHaveLength(2)
    expect(actions[0]).toMatchObject({
      action: 'create_goal',
      data: {
        title: '30天学完 Python',
        goal_type: 'skill',
        deadline: '2026-05-01',
      },
    })
    expect(actions[1]).toMatchObject({
      action: 'navigate',
      data: {
        path: '/app/schedule',
        query: {
          module: 'planner',
          tab: 'goals',
          goalId: 'goal_1',
        },
      },
    })
  })

  it('drops malformed or unsafe actions', () => {
    const source = [
      '```spark-action',
      '{"action":"navigate","data":{"path":"javascript:alert(1)"}}',
      '```',
      '```spark-action',
      '{"action":"create_goal","data":{"title":"缺参数"}}',
      '```',
      '```spark-action',
      '{"action":"unknown","data":{"path":"/app/home"}}',
      '```',
    ].join('\n')

    const { actions } = parseSparkActions(source)
    expect(actions).toEqual([])
  })

  it('normalizes schedule actions and clamps priority', () => {
    const action = sanitizeSparkAction({
      action: 'add_schedule',
      data: {
        title: '期末复习',
        start_time: '2026-04-05T10:00:00+08:00',
        end_time: '2026-04-05T12:00:00+08:00',
        event_type: 'task',
        priority: 99,
      },
    })

    expect(action).toMatchObject({
      action: 'add_schedule',
      data: {
        title: '期末复习',
        event_type: 'task',
        priority: 3,
      },
    })
  })

  it('rejects non-app and external hrefs', () => {
    expect(resolveAssistantLocation('https://example.com/app/home')).toBeNull()
    expect(resolveAssistantLocation('javascript:alert(1)')).toBeNull()
    expect(resolveAssistantLocation('/login')).toBeNull()
  })

  it('whitelists only supported schedule query keys', () => {
    const location = resolveAssistantLocation('/app/schedule?module=planner&tab=goals&goalId=goal_2&foo=bar')
    expect(location).toEqual({
      path: '/app/schedule',
      query: {
        module: 'planner',
        tab: 'goals',
        goalId: 'goal_2',
      },
    })
  })
})
