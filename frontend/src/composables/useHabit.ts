import { ref } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// ====== 类型定义 ======

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  frequency_type: 'daily' | 'weekly'
  target_days: number
  current_streak: number
  longest_streak: number
  status: 'active' | 'paused' | 'archived'
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  log_date: string
  note?: string
  created_at: string
}

// 热力图单日数据
export interface HeatmapDay {
  date: string // YYYY-MM-DD
  count: number // 该日打卡的习惯数量
  checked: boolean // 当前习惯是否已打卡
}

// ====== 组合函数 ======

export function useHabit() {
  const { user } = useAuth()

  const habits = ref<Habit[]>([])
  const loading = ref(false)

  // ====== 习惯 CRUD ======

  async function fetchHabits() {
    if (!user.value) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.value.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      habits.value = data || []
    } catch (e) {
      console.error('加载习惯失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function createHabit(name: string, icon = '🎯', frequencyType: 'daily' | 'weekly' = 'daily', targetDays = 7): Promise<Habit | null> {
    if (!user.value) return null
    try {
      const { data, error } = await supabase.from('habits').insert({
        user_id: user.value.id,
        name,
        icon,
        frequency_type: frequencyType,
        target_days: targetDays,
      }).select().single()
      if (error) throw error
      habits.value.unshift(data)
      return data
    } catch (e) {
      console.error('创建习惯失败:', e)
      return null
    }
  }

  async function archiveHabit(habitId: string) {
    try {
      const { error } = await supabase.from('habits')
        .update({ status: 'archived' })
        .eq('id', habitId)
      if (error) throw error
      habits.value = habits.value.filter(h => h.id !== habitId)
    } catch (e) {
      console.error('归档习惯失败:', e)
    }
  }

  // ====== 打卡 ======

  // 获取某习惯今日是否已打卡
  async function isTodayChecked(habitId: string): Promise<boolean> {
    const today = getLocalDate()
    const { data } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('log_date', today)
      .maybeSingle()
    return !!data
  }

  // 打卡（乐观更新）
  async function checkIn(habitId: string, note?: string): Promise<boolean> {
    if (!user.value) return false

    const today = getLocalDate()

    // 乐观更新：先更新本地 streak
    const habit = habits.value.find(h => h.id === habitId)
    const oldStreak = habit?.current_streak || 0
    if (habit) {
      habit.current_streak += 1
      if (habit.current_streak > habit.longest_streak) {
        habit.longest_streak = habit.current_streak
      }
    }

    try {
      // 插入打卡记录（UNIQUE 约束防重复）
      const { error } = await supabase.from('habit_logs').insert({
        habit_id: habitId,
        user_id: user.value.id,
        log_date: today,
        note,
      })
      if (error) {
        if (error.code === '23505') {
          // 已打卡，恢复 streak
          if (habit) habit.current_streak = oldStreak
          return false
        }
        throw error
      }

      // 更新 DB 里的 streak
      await updateStreak(habitId)
      return true
    } catch (e) {
      // 回滚乐观更新
      if (habit) habit.current_streak = oldStreak
      console.error('打卡失败:', e)
      return false
    }
  }

  // 重新计算连续天数并更新 DB
  async function updateStreak(habitId: string) {
    if (!user.value) return

    // 从最近的打卡记录往前数连续天数
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', habitId)
      .order('log_date', { ascending: false })
      .limit(365)

    if (!logs || logs.length === 0) {
      await supabase.from('habits').update({ current_streak: 0 }).eq('id', habitId)
      return
    }

    let streak = 0
    const today = new Date(getLocalDate())

    for (let i = 0; i < logs.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]

      if (logs[i].log_date === expectedStr) {
        streak++
      } else {
        break
      }
    }

    const habit = habits.value.find(h => h.id === habitId)
    const longestStreak = Math.max(streak, habit?.longest_streak || 0)

    await supabase.from('habits').update({
      current_streak: streak,
      longest_streak: longestStreak,
    }).eq('id', habitId)

    // 更新本地状态
    if (habit) {
      habit.current_streak = streak
      habit.longest_streak = longestStreak
    }
  }

  // ====== 热力图数据 ======

  // 获取某习惯某月的热力图数据
  async function getHeatmapData(habitId: string, year: number, month: number): Promise<HeatmapDay[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0) // 月末
    const endStr = endDate.toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', habitId)
      .gte('log_date', startDate)
      .lte('log_date', endStr)

    // 构建日期 → 是否打卡的 Map
    const logSet = new Set((logs || []).map(l => l.log_date))

    // 生成整月数据
    const days: HeatmapDay[] = []
    const daysInMonth = endDate.getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        date: dateStr,
        count: logSet.has(dateStr) ? 1 : 0,
        checked: logSet.has(dateStr),
      })
    }

    return days
  }

  // 获取用户所有习惯某月的汇总热力图
  async function getOverallHeatmap(year: number, month: number): Promise<HeatmapDay[]> {
    if (!user.value) return []

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0)
    const endStr = endDate.toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('user_id', user.value.id)
      .gte('log_date', startDate)
      .lte('log_date', endStr)

    // 统计每天打卡次数
    const countMap: Record<string, number> = {}
    for (const l of logs || []) {
      countMap[l.log_date] = (countMap[l.log_date] || 0) + 1
    }

    const days: HeatmapDay[] = []
    const daysInMonth = endDate.getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const count = countMap[dateStr] || 0
      days.push({ date: dateStr, count, checked: count > 0 })
    }

    return days
  }

  // ====== 工具函数 ======

  // 获取本地日期（YYYY-MM-DD），避免时区问题
  function getLocalDate(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 预设习惯图标
  const HABIT_ICONS = ['🎯', '📚', '💪', '🏃', '🧘', '✍️', '🎵', '🎨', '💤', '🍎', '💧', '📖']

  return {
    habits, loading,
    fetchHabits, createHabit, archiveHabit,
    isTodayChecked, checkIn,
    getHeatmapData, getOverallHeatmap,
    getLocalDate, HABIT_ICONS,
  }
}
