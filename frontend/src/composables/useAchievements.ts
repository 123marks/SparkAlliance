import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// ====== 成就定义 ======

export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: 'task' | 'goal' | 'habit' | 'streak' | 'special'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  condition: AchievementCondition
  reward_xp: number
}

export interface AchievementCondition {
  type: 'task_count' | 'goal_count' | 'habit_streak' | 'daily_streak' | 'first_action' | 'special'
  threshold: number
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_key: string
  unlocked_at: string
  progress: number
}

export interface UserStats {
  total_tasks_completed: number
  total_goals_completed: number
  current_daily_streak: number
  longest_daily_streak: number
  longest_habit_streak: number
  total_xp: number
  level: number
}

// 预定义成就列表
export const ACHIEVEMENTS: Achievement[] = [
  // 任务类
  { id: '1', key: 'first_task', name: '初次行动', description: '完成你的第一个任务', icon: '🌱', category: 'task', tier: 'bronze', condition: { type: 'task_count', threshold: 1 }, reward_xp: 10 },
  { id: '2', key: 'task_10', name: '小有成效', description: '累计完成10个任务', icon: '📝', category: 'task', tier: 'bronze', condition: { type: 'task_count', threshold: 10 }, reward_xp: 50 },
  { id: '3', key: 'task_50', name: '效率先锋', description: '累计完成50个任务', icon: '⚡', category: 'task', tier: 'silver', condition: { type: 'task_count', threshold: 50 }, reward_xp: 150 },
  { id: '4', key: 'task_100', name: '百任达成', description: '累计完成100个任务', icon: '🎯', category: 'task', tier: 'gold', condition: { type: 'task_count', threshold: 100 }, reward_xp: 300 },
  { id: '5', key: 'task_500', name: '执行大师', description: '累计完成500个任务', icon: '👑', category: 'task', tier: 'platinum', condition: { type: 'task_count', threshold: 500 }, reward_xp: 1000 },

  // 目标类
  { id: '6', key: 'first_goal', name: '目标萌芽', description: '完成你的第一个目标', icon: '🎯', category: 'goal', tier: 'bronze', condition: { type: 'goal_count', threshold: 1 }, reward_xp: 30 },
  { id: '7', key: 'goal_5', name: '目标达人', description: '累计完成5个目标', icon: '🏆', category: 'goal', tier: 'silver', condition: { type: 'goal_count', threshold: 5 }, reward_xp: 200 },
  { id: '8', key: 'goal_10', name: '目标征服者', description: '累计完成10个目标', icon: '🌟', category: 'goal', tier: 'gold', condition: { type: 'goal_count', threshold: 10 }, reward_xp: 500 },

  // 连续打卡类
  { id: '9', key: 'streak_3', name: '三天坚持', description: '连续3天完成任务', icon: '🔥', category: 'streak', tier: 'bronze', condition: { type: 'daily_streak', threshold: 3 }, reward_xp: 20 },
  { id: '10', key: 'streak_7', name: '一周达人', description: '连续7天完成任务', icon: '📅', category: 'streak', tier: 'silver', condition: { type: 'daily_streak', threshold: 7 }, reward_xp: 70 },
  { id: '11', key: 'streak_30', name: '月度冠军', description: '连续30天完成任务', icon: '🌙', category: 'streak', tier: 'gold', condition: { type: 'daily_streak', threshold: 30 }, reward_xp: 300 },
  { id: '12', key: 'streak_100', name: '百日传奇', description: '连续100天完成任务', icon: '💎', category: 'streak', tier: 'platinum', condition: { type: 'daily_streak', threshold: 100 }, reward_xp: 1000 },

  // 习惯类
  { id: '13', key: 'habit_7', name: '习惯养成', description: '某个习惯连续打卡7天', icon: '🎯', category: 'habit', tier: 'bronze', condition: { type: 'habit_streak', threshold: 7 }, reward_xp: 50 },
  { id: '14', key: 'habit_21', name: '习惯大师', description: '某个习惯连续打卡21天', icon: '🧠', category: 'habit', tier: 'silver', condition: { type: 'habit_streak', threshold: 21 }, reward_xp: 150 },
  { id: '15', key: 'habit_66', name: '习惯刻进DNA', description: '某个习惯连续打卡66天', icon: '🧬', category: 'habit', tier: 'gold', condition: { type: 'habit_streak', threshold: 66 }, reward_xp: 500 },

  // 特殊成就
  { id: '16', key: 'early_bird', name: '早起鸟儿', description: '在早上6点前完成一个任务', icon: '🌅', category: 'special', tier: 'silver', condition: { type: 'special', threshold: 1 }, reward_xp: 50 },
  { id: '17', key: 'night_owl', name: '夜猫子', description: '在凌晨完成一个任务', icon: '🦉', category: 'special', tier: 'bronze', condition: { type: 'special', threshold: 1 }, reward_xp: 30 },
  { id: '18', key: 'weekend_warrior', name: '周末战士', description: '周末完成5个任务', icon: '⚔️', category: 'special', tier: 'silver', condition: { type: 'special', threshold: 1 }, reward_xp: 80 },
]

// 等级经验配置
const LEVEL_XP = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000, 21000]

// ====== 组合函数 ======

export function useAchievements() {
  const { user } = useAuth()

  const userAchievements = ref<UserAchievement[]>([])
  const userStats = ref<UserStats>({
    total_tasks_completed: 0,
    total_goals_completed: 0,
    current_daily_streak: 0,
    longest_daily_streak: 0,
    longest_habit_streak: 0,
    total_xp: 0,
    level: 1,
  })
  const newlyUnlocked = ref<Achievement | null>(null) // 用于触发解锁动画

  const unlockedAchievements = computed(() =>
    ACHIEVEMENTS.filter(a => userAchievements.value.some(ua => ua.achievement_key === a.key))
  )

  const lockedAchievements = computed(() =>
    ACHIEVEMENTS.filter(a => !userAchievements.value.some(ua => ua.achievement_key === a.key))
  )

  const nextLevelXp = computed(() => {
    const lvl = userStats.value.level
    return LEVEL_XP[Math.min(lvl, LEVEL_XP.length - 1)]
  })

  const currentLevelProgress = computed(() => {
    const lvl = userStats.value.level
    const prevXp = lvl > 1 ? LEVEL_XP[lvl - 1] : 0
    const nextXp = nextLevelXp.value
    const current = userStats.value.total_xp
    return Math.min(100, Math.max(0, ((current - prevXp) / (nextXp - prevXp)) * 100))
  })

  // 加载用户成就和统计
  async function fetchUserAchievements() {
    if (!user.value) return

    // 获取已解锁成就
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.value.id)
    userAchievements.value = achievements || []

    // 获取用户统计
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.value.id)
      .maybeSingle()
    
    if (stats) {
      userStats.value = stats
    } else {
      // 初始化用户统计
      await supabase.from('user_stats').insert({
        user_id: user.value.id,
        total_tasks_completed: 0,
        total_goals_completed: 0,
        current_daily_streak: 0,
        longest_daily_streak: 0,
        longest_habit_streak: 0,
        total_xp: 0,
        level: 1,
      })
    }
  }

  // 检查并解锁成就
  async function checkAndUnlockAchievements(_eventType: 'task_complete' | 'goal_complete' | 'habit_check') {
    if (!user.value) return

    // 先刷新统计数据
    await refreshStats()

    const toUnlock: Achievement[] = []
    const stats = userStats.value

    for (const achievement of ACHIEVEMENTS) {
      // 跳过已解锁的
      if (userAchievements.value.some(ua => ua.achievement_key === achievement.key)) continue

      const { type, threshold } = achievement.condition
      let shouldUnlock = false

      switch (type) {
        case 'task_count':
          shouldUnlock = stats.total_tasks_completed >= threshold
          break
        case 'goal_count':
          shouldUnlock = stats.total_goals_completed >= threshold
          break
        case 'daily_streak':
          shouldUnlock = stats.current_daily_streak >= threshold || stats.longest_daily_streak >= threshold
          break
        case 'habit_streak':
          shouldUnlock = stats.longest_habit_streak >= threshold
          break
        case 'special':
          shouldUnlock = await checkSpecialCondition(achievement.key)
          break
      }

      if (shouldUnlock) toUnlock.push(achievement)
    }

    // 批量解锁
    for (const achievement of toUnlock) {
      await unlockAchievement(achievement)
    }
  }

  // 解锁单个成就
  async function unlockAchievement(achievement: Achievement) {
    if (!user.value) return

    // 插入解锁记录
    const { error } = await supabase.from('user_achievements').insert({
      user_id: user.value.id,
      achievement_key: achievement.key,
      progress: 100,
    })

    if (error) {
      console.error('解锁成就失败:', error)
      return
    }

    // 增加经验
    await addXp(achievement.reward_xp)

    // 更新本地状态
    userAchievements.value.push({
      id: '',
      user_id: user.value.id,
      achievement_key: achievement.key,
      unlocked_at: new Date().toISOString(),
      progress: 100,
    })

    // 触发解锁动画
    newlyUnlocked.value = achievement
    setTimeout(() => { newlyUnlocked.value = null }, 5000)
  }

  // 增加经验值
  async function addXp(amount: number) {
    if (!user.value) return

    const newXp = userStats.value.total_xp + amount
    let newLevel = userStats.value.level

    // 检查是否升级
    while (newLevel < LEVEL_XP.length && newXp >= LEVEL_XP[newLevel]) {
      newLevel++
    }

    await supabase.from('user_stats').update({
      total_xp: newXp,
      level: newLevel,
    }).eq('user_id', user.value.id)

    userStats.value.total_xp = newXp
    userStats.value.level = newLevel
  }

  // 刷新统计数据
  async function refreshStats() {
    if (!user.value) return

    // 统计完成的任务数
    const { count: taskCount } = await supabase
      .from('planner_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.value.id)
      .eq('is_completed', true)

    // 统计完成的目标数
    const { count: goalCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.value.id)
      .eq('status', 'completed')

    // 计算每日连续天数
    const dailyStreak = await calculateDailyStreak()

    // 获取最长习惯连续天数
    const { data: habits } = await supabase
      .from('habits')
      .select('longest_streak')
      .eq('user_id', user.value.id)
      .order('longest_streak', { ascending: false })
      .limit(1)
    const longestHabitStreak = habits?.[0]?.longest_streak || 0

    // 更新数据库
    await supabase.from('user_stats').upsert({
      user_id: user.value.id,
      total_tasks_completed: taskCount || 0,
      total_goals_completed: goalCount || 0,
      current_daily_streak: dailyStreak.current,
      longest_daily_streak: Math.max(dailyStreak.current, userStats.value.longest_daily_streak),
      longest_habit_streak: longestHabitStreak,
    })

    // 更新本地状态
    userStats.value.total_tasks_completed = taskCount || 0
    userStats.value.total_goals_completed = goalCount || 0
    userStats.value.current_daily_streak = dailyStreak.current
    userStats.value.longest_daily_streak = Math.max(dailyStreak.current, userStats.value.longest_daily_streak)
    userStats.value.longest_habit_streak = longestHabitStreak
  }

  // 计算每日连续天数（基于任务完成日期）
  async function calculateDailyStreak(): Promise<{ current: number }> {
    if (!user.value) return { current: 0 }

    const { data: tasks } = await supabase
      .from('planner_tasks')
      .select('completed_at')
      .eq('user_id', user.value.id)
      .eq('is_completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(365)

    if (!tasks || tasks.length === 0) return { current: 0 }

    // 提取唯一日期
    const dates = [...new Set(tasks.map(t => t.completed_at.split('T')[0]))].sort().reverse()
    
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < dates.length && i < 365; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]

      if (dates.includes(expectedStr)) {
        streak++
      } else if (i === 0) {
        // 今天还没完成任务，检查昨天
        continue
      } else {
        break
      }
    }

    return { current: streak }
  }

  // 检查特殊成就条件
  async function checkSpecialCondition(achievementKey: string): Promise<boolean> {
    if (!user.value) return false
    
    const now = new Date()
    const day = now.getDay()

    switch (achievementKey) {
      case 'early_bird':
        // 6点前完成任务 - 检查今天的任务
        const { data: earlyTasks } = await supabase
          .from('planner_tasks')
          .select('completed_at')
          .eq('user_id', user.value.id)
          .eq('is_completed', true)
          .not('completed_at', 'is', null)
        return (earlyTasks || []).some(t => {
          const h = new Date(t.completed_at).getHours()
          return h < 6
        })

      case 'night_owl':
        // 凌晨完成任务（0-4点）
        const { data: nightTasks } = await supabase
          .from('planner_tasks')
          .select('completed_at')
          .eq('user_id', user.value.id)
          .eq('is_completed', true)
          .not('completed_at', 'is', null)
        return (nightTasks || []).some(t => {
          const h = new Date(t.completed_at).getHours()
          return h >= 0 && h < 4
        })

      case 'weekend_warrior':
        // 周末完成5个任务 - 检查本周末
        if (day !== 0 && day !== 6) return false
        const weekendStart = new Date()
        weekendStart.setDate(weekendStart.getDate() - (day === 0 ? 1 : 0))
        weekendStart.setHours(0, 0, 0, 0)
        const { count } = await supabase
          .from('planner_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.value.id)
          .eq('is_completed', true)
          .gte('completed_at', weekendStart.toISOString())
        return (count || 0) >= 5

      default:
        return false
    }
  }

  // 清除新解锁提示
  function clearNewlyUnlocked() {
    newlyUnlocked.value = null
  }

  // 获取成就进度百分比
  function getAchievementProgress(achievement: Achievement): number {
    const { type, threshold } = achievement.condition
    const stats = userStats.value

    switch (type) {
      case 'task_count':
        return Math.min(100, (stats.total_tasks_completed / threshold) * 100)
      case 'goal_count':
        return Math.min(100, (stats.total_goals_completed / threshold) * 100)
      case 'daily_streak':
        return Math.min(100, (Math.max(stats.current_daily_streak, stats.longest_daily_streak) / threshold) * 100)
      case 'habit_streak':
        return Math.min(100, (stats.longest_habit_streak / threshold) * 100)
      default:
        return 0
    }
  }

  // 获取等级称号
  function getLevelTitle(level: number): string {
    const titles = [
      '初学者', '学徒', '见习生', '实践者', '进取者',
      '探索者', '奋斗者', '专注者', '挑战者', '突破者',
      '精进者', '卓越者', '大师', '宗师', '传奇',
      '神话', '不朽', '永恒', '超越', '至尊', '星火使者'
    ]
    return titles[Math.min(level - 1, titles.length - 1)]
  }

  return {
    userAchievements,
    userStats,
    unlockedAchievements,
    lockedAchievements,
    newlyUnlocked,
    nextLevelXp,
    currentLevelProgress,
    ACHIEVEMENTS,
    fetchUserAchievements,
    checkAndUnlockAchievements,
    refreshStats,
    clearNewlyUnlocked,
    getAchievementProgress,
    getLevelTitle,
  }
}
