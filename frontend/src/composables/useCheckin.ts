/**
 * useCheckin —— 每日签到系统（v13.1：模块单例 + 跨组件共享状态）
 *
 * 绑定 `checkin_records` 表：每用户 × 每日一条。
 * 能力：
 *   - 今日是否已签到 / 当前连续天数（streak）
 *   - 签到提交（含可选心情 / 备忘）
 *   - 签到历史查询（近 N 天，用于日历格图）
 *   - **状态以模块级 ref 持有**——任何组件 useCheckin() 都拿到同一份引用
 *   - 自动暴露今日心情/streak 给 AI 和彩蛋系统使用
 */

import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

export interface CheckinRecord {
  id: string
  user_id: string
  checkin_date: string        // YYYY-MM-DD
  mood?: string               // 今日心情（happy/calm/excited/tired/sad/motivated）
  note?: string               // 今日备忘
  streak_days: number         // 签到时的连续天数
  created_at: string
}

export type Mood = 'happy' | 'calm' | 'excited' | 'tired' | 'sad' | 'motivated'

export const MOOD_META: Record<Mood, { label: string; icon: string; color: string }> = {
  happy:     { label: '开心',   icon: '😊', color: '#F59E0B' },
  calm:      { label: '平静',   icon: '😌', color: '#0EA5E9' },
  excited:   { label: '兴奋',   icon: '🤩', color: '#EC4899' },
  tired:     { label: '疲惫',   icon: '😫', color: '#6B7280' },
  sad:       { label: '低落',   icon: '🥺', color: '#8B5CF6' },
  motivated: { label: '斗志',   icon: '💪', color: '#EF4444' },
}

const TODAY_KEY = () => new Date().toISOString().slice(0, 10)

// ============ 模块级单例状态（跨组件共享） ============
const _todayRecord = ref<CheckinRecord | null>(null)
const _history = ref<CheckinRecord[]>([])
const _loading = ref(false)
const _submitting = ref(false)
let _fetchPromise: Promise<void> | null = null

// 公开的只读 getter（任何组件 / 工具都可使用）
export function getTodayMood(): Mood | null {
  const m = _todayRecord.value?.mood
  return m && (m in MOOD_META) ? (m as Mood) : null
}

export function getCurrentStreak(): number {
  return _todayRecord.value?.streak_days ?? 0
}

export function isCheckedInTodaySync(): boolean {
  return !!_todayRecord.value
}

export function getRecentCheckinsSync(): CheckinRecord[] {
  return _history.value.slice()
}

export function useCheckin() {
  const { user } = useAuth()

  const isCheckedInToday = computed(() => !!_todayRecord.value)
  const currentStreak = computed(() => _todayRecord.value?.streak_days ?? 0)

  /** 该月签到日期集合（YYYY-MM-DD），用于日历视图标记 */
  const checkedDatesThisMonth = computed(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return new Set(_history.value.filter(r => r.checkin_date.startsWith(ym)).map(r => r.checkin_date))
  })

  /** 加载今日和历史 30 天（同时多次调用会复用同一 Promise，避免重复请求） */
  async function fetchCheckinData(force = false) {
    if (!user.value) return
    if (_fetchPromise && !force) {
      await _fetchPromise
      return
    }
    _loading.value = true
    _fetchPromise = (async () => {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const since = thirtyDaysAgo.toISOString().slice(0, 10)

        const { data, error } = await supabase
          .from('checkin_records')
          .select('*')
          .eq('user_id', user.value!.id)
          .gte('checkin_date', since)
          .order('checkin_date', { ascending: false })
        if (error) {
          console.warn('[useCheckin] fetch error:', error.message)
          return
        }
        _history.value = (data || []) as CheckinRecord[]
        _todayRecord.value = _history.value.find(r => r.checkin_date === TODAY_KEY()) || null
      } finally {
        _loading.value = false
        _fetchPromise = null
      }
    })()
    await _fetchPromise
  }

  /** 根据历史记录推导到今天为止的连续天数 */
  function computeStreakFrom(records: CheckinRecord[]): number {
    if (!records.length) return 0
    const dates = new Set(records.map(r => r.checkin_date))
    let streak = 0
    const cur = new Date()
    cur.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().slice(0, 10)
      if (dates.has(key)) {
        streak++
        cur.setDate(cur.getDate() - 1)
      } else {
        // 今天还没签到时，允许昨天起算
        if (i === 0) {
          cur.setDate(cur.getDate() - 1)
          continue
        }
        break
      }
    }
    return streak
  }

  /**
   * 今日签到（可带心情和备忘）。返回本次记录；已签过则返回 null。
   */
  async function checkinToday(options: { mood?: Mood; note?: string } = {}): Promise<CheckinRecord | null> {
    if (!user.value || _submitting.value) return null
    if (isCheckedInToday.value) return _todayRecord.value

    _submitting.value = true
    try {
      // 算出本次签到后的连续天数
      const priorStreak = computeStreakFrom(_history.value.filter(r => r.checkin_date !== TODAY_KEY()))
      const newStreak = priorStreak + 1

      const payload = {
        user_id: user.value.id,
        checkin_date: TODAY_KEY(),
        mood: options.mood || null,
        note: options.note || null,
        streak_days: newStreak,
      }

      const { data, error } = await supabase
        .from('checkin_records')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        console.warn('[useCheckin] insert error:', error.message)
        return null
      }

      const record = data as CheckinRecord
      _todayRecord.value = record
      _history.value = [record, ..._history.value]
      return record
    } finally {
      _submitting.value = false
    }
  }

  /** 删除今日签到（极少用；仅作纠错入口，不公开暴露） */
  async function undoTodayCheckin(): Promise<boolean> {
    if (!user.value || !_todayRecord.value) return false
    const { error } = await supabase
      .from('checkin_records')
      .delete()
      .eq('user_id', user.value.id)
      .eq('checkin_date', TODAY_KEY())
    if (error) {
      console.warn('[useCheckin] delete error:', error.message)
      return false
    }
    _history.value = _history.value.filter(r => r.checkin_date !== TODAY_KEY())
    _todayRecord.value = null
    return true
  }

  /** 获取最近 N 天的每日签到状态数组（从今天往前） */
  function getRecentDays(n = 7): Array<{ date: string; record: CheckinRecord | null }> {
    const recordsByDate = new Map(_history.value.map(r => [r.checkin_date, r]))
    const result: Array<{ date: string; record: CheckinRecord | null }> = []
    const cur = new Date()
    cur.setHours(0, 0, 0, 0)
    for (let i = 0; i < n; i++) {
      const key = cur.toISOString().slice(0, 10)
      result.push({ date: key, record: recordsByDate.get(key) || null })
      cur.setDate(cur.getDate() - 1)
    }
    return result.reverse()
  }

  return {
    todayRecord: _todayRecord,
    history: _history,
    loading: _loading,
    submitting: _submitting,
    isCheckedInToday,
    currentStreak,
    checkedDatesThisMonth,
    fetchCheckinData,
    checkinToday,
    undoTodayCheckin,
    getRecentDays,
    MOOD_META,
  }
}
