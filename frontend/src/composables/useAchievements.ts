/**
 * useAchievements —— 成就 / 等级 / XP 系统（v13.1：模块单例 + 伴侣类成就 + gameEvent API）
 *
 * 设计：
 *   - 成就分两层：通用类（task/goal/streak/habit/special）+ 伴侣类（companion）
 *   - `checkAndUnlockAchievements(eventType)` 由 Planner / Companion 在关键动作后调用
 *   - 所有 ref 模块级持有；多组件 useAchievements() 共享同一份状态
 *   - newlyUnlocked 改为队列，支持同时解锁多枚徽章依次飘入
 */
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
  category: 'task' | 'goal' | 'habit' | 'streak' | 'special' | 'companion'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  condition: AchievementCondition
  reward_xp: number
}

export interface AchievementCondition {
  type:
    | 'task_count'
    | 'goal_count'
    | 'habit_streak'
    | 'daily_streak'
    | 'first_action'
    | 'special'
    | 'friend_count'
    | 'group_count'
    | 'moment_count'
    | 'ai_chat_count'
    | 'share_count'
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

export type GameEventType =
  | 'task_complete'
  | 'goal_complete'
  | 'habit_check'
  | 'checkin'
  | 'companion_friend_added'
  | 'companion_group_created'
  | 'companion_moment_posted'
  | 'companion_moment_shared'
  | 'companion_ai_chat'

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
  { id: '9', key: 'streak_3', name: '三天坚持', description: '连续3天完成任务或签到', icon: '🔥', category: 'streak', tier: 'bronze', condition: { type: 'daily_streak', threshold: 3 }, reward_xp: 20 },
  { id: '10', key: 'streak_7', name: '一周达人', description: '连续7天完成任务或签到', icon: '📅', category: 'streak', tier: 'silver', condition: { type: 'daily_streak', threshold: 7 }, reward_xp: 70 },
  { id: '11', key: 'streak_30', name: '月度冠军', description: '连续30天完成任务或签到', icon: '🌙', category: 'streak', tier: 'gold', condition: { type: 'daily_streak', threshold: 30 }, reward_xp: 300 },
  { id: '12', key: 'streak_100', name: '百日传奇', description: '连续100天完成任务或签到', icon: '💎', category: 'streak', tier: 'platinum', condition: { type: 'daily_streak', threshold: 100 }, reward_xp: 1000 },

  // 习惯类
  { id: '13', key: 'habit_7', name: '习惯养成', description: '某个习惯连续打卡7天', icon: '🎯', category: 'habit', tier: 'bronze', condition: { type: 'habit_streak', threshold: 7 }, reward_xp: 50 },
  { id: '14', key: 'habit_21', name: '习惯大师', description: '某个习惯连续打卡21天', icon: '🧠', category: 'habit', tier: 'silver', condition: { type: 'habit_streak', threshold: 21 }, reward_xp: 150 },
  { id: '15', key: 'habit_66', name: '习惯刻进DNA', description: '某个习惯连续打卡66天', icon: '🧬', category: 'habit', tier: 'gold', condition: { type: 'habit_streak', threshold: 66 }, reward_xp: 500 },

  // 特殊成就
  { id: '16', key: 'early_bird', name: '早起鸟儿', description: '在早上6点前完成一个任务', icon: '🌅', category: 'special', tier: 'silver', condition: { type: 'special', threshold: 1 }, reward_xp: 50 },
  { id: '17', key: 'night_owl', name: '夜猫子', description: '在凌晨完成一个任务', icon: '🦉', category: 'special', tier: 'bronze', condition: { type: 'special', threshold: 1 }, reward_xp: 30 },
  { id: '18', key: 'weekend_warrior', name: '周末战士', description: '周末完成5个任务', icon: '⚔️', category: 'special', tier: 'silver', condition: { type: 'special', threshold: 1 }, reward_xp: 80 },

  // ===== 伴侣类（v13.1 新增）=====
  { id: '19', key: 'companion_first_friend', name: '初识好友', description: '添加第一个星火好友', icon: '🤝', category: 'companion', tier: 'bronze', condition: { type: 'friend_count', threshold: 1 }, reward_xp: 20 },
  { id: '20', key: 'companion_friend_10', name: '人脉初成', description: '添加 10 位好友', icon: '👥', category: 'companion', tier: 'silver', condition: { type: 'friend_count', threshold: 10 }, reward_xp: 100 },
  { id: '21', key: 'companion_friend_50', name: '社交达人', description: '添加 50 位好友', icon: '🎊', category: 'companion', tier: 'gold', condition: { type: 'friend_count', threshold: 50 }, reward_xp: 400 },

  { id: '22', key: 'companion_first_group', name: '群聚一堂', description: '创建第一个群聊', icon: '👨‍👩‍👧', category: 'companion', tier: 'bronze', condition: { type: 'group_count', threshold: 1 }, reward_xp: 30 },
  { id: '23', key: 'companion_group_5', name: '社群组织者', description: '创建 5 个群聊', icon: '🌐', category: 'companion', tier: 'silver', condition: { type: 'group_count', threshold: 5 }, reward_xp: 150 },

  { id: '24', key: 'companion_first_moment', name: '初次发声', description: '发布第一条动态', icon: '📝', category: 'companion', tier: 'bronze', condition: { type: 'moment_count', threshold: 1 }, reward_xp: 20 },
  { id: '25', key: 'companion_moment_10', name: '生活记录者', description: '发布 10 条动态', icon: '📸', category: 'companion', tier: 'silver', condition: { type: 'moment_count', threshold: 10 }, reward_xp: 120 },
  { id: '26', key: 'companion_moment_100', name: '星火域常客', description: '发布 100 条动态', icon: '🌌', category: 'companion', tier: 'gold', condition: { type: 'moment_count', threshold: 100 }, reward_xp: 600 },

  { id: '27', key: 'companion_first_ai', name: '与 AI 邂逅', description: '与星火 AI 第一次对话', icon: '✨', category: 'companion', tier: 'bronze', condition: { type: 'ai_chat_count', threshold: 1 }, reward_xp: 15 },
  { id: '28', key: 'companion_ai_50', name: 'AI 知己', description: '与星火 AI 累计对话 50 次', icon: '🤖', category: 'companion', tier: 'silver', condition: { type: 'ai_chat_count', threshold: 50 }, reward_xp: 200 },

  { id: '29', key: 'companion_first_share', name: '初次分享', description: '把第一条动态分享给朋友', icon: '↗️', category: 'companion', tier: 'bronze', condition: { type: 'share_count', threshold: 1 }, reward_xp: 25 },
  { id: '30', key: 'companion_share_10', name: '传播之星', description: '累计分享 10 次', icon: '🔁', category: 'companion', tier: 'silver', condition: { type: 'share_count', threshold: 10 }, reward_xp: 120 },
]

// 等级经验配置
const LEVEL_XP = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000, 21000]

// ============ 模块级单例状态 ============
const _userAchievements = ref<UserAchievement[]>([])
const _userStats = ref<UserStats>({
  total_tasks_completed: 0,
  total_goals_completed: 0,
  current_daily_streak: 0,
  longest_daily_streak: 0,
  longest_habit_streak: 0,
  total_xp: 0,
  level: 1,
})
// 解锁队列（v13.1 多徽章顺序飘入）
const _unlockQueue = ref<Achievement[]>([])
const _newlyUnlocked = ref<Achievement | null>(null)
let _toastTimer: ReturnType<typeof setTimeout> | null = null
// 伴侣行为本地累计计数（用于无后端计数表的快速判定，避免每次 refresh 全表扫描）
const _companionStats = ref({
  friend_count: 0,
  group_count: 0,
  moment_count: 0,
  ai_chat_count: 0,
  share_count: 0,
})
let _statsFetchPromise: Promise<void> | null = null

// ============ 公开同步 getter（供 AI Context / 彩蛋系统使用） ============
export function getCurrentLevelSync(): number {
  return _userStats.value.level
}

export function getRecentlyUnlockedSync(): Achievement[] {
  // 取最近 5 枚解锁
  return _userAchievements.value
    .slice()
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 5)
    .map((ua) => ACHIEVEMENTS.find((a) => a.key === ua.achievement_key))
    .filter((a): a is Achievement => !!a)
}

/** 顶层便捷入口（不需要实例化 composable 即可记录事件） */
export async function gameEvent(eventType: GameEventType, data?: Record<string, unknown>) {
  // 这里委托给 useAchievements()，保证逻辑唯一
  await useAchievements().gameEvent(eventType, data)
}

// ====== 组合函数 ======
export function useAchievements() {
  const { user } = useAuth()

  const unlockedAchievements = computed(() =>
    ACHIEVEMENTS.filter(a => _userAchievements.value.some(ua => ua.achievement_key === a.key))
  )

  const lockedAchievements = computed(() =>
    ACHIEVEMENTS.filter(a => !_userAchievements.value.some(ua => ua.achievement_key === a.key))
  )

  const nextLevelXp = computed(() => {
    const lvl = _userStats.value.level
    return LEVEL_XP[Math.min(lvl, LEVEL_XP.length - 1)]
  })

  const currentLevelProgress = computed(() => {
    const lvl = _userStats.value.level
    const prevXp = lvl > 1 ? LEVEL_XP[lvl - 1] : 0
    const nextXp = nextLevelXp.value
    const current = _userStats.value.total_xp
    return Math.min(100, Math.max(0, ((current - prevXp) / (nextXp - prevXp)) * 100))
  })

  // 加载用户成就和统计
  async function fetchUserAchievements() {
    if (!user.value) return
    if (_statsFetchPromise) {
      await _statsFetchPromise
      return
    }
    _statsFetchPromise = (async () => {
      try {
        // 获取已解锁成就
        const { data: achievements } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.value!.id)
        _userAchievements.value = achievements || []

        // 获取用户统计
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.value!.id)
          .maybeSingle()

        if (stats) {
          _userStats.value = stats
        } else {
          // 初始化用户统计
          await supabase.from('user_stats').insert({
            user_id: user.value!.id,
            total_tasks_completed: 0,
            total_goals_completed: 0,
            current_daily_streak: 0,
            longest_daily_streak: 0,
            longest_habit_streak: 0,
            total_xp: 0,
            level: 1,
          })
        }

        // 拉取伴侣行为统计（轻量计数）
        await refreshCompanionStats()
      } finally {
        _statsFetchPromise = null
      }
    })()
    await _statsFetchPromise
  }

  /** 拉取伴侣类计数。失败/表不存在静默降级（保持本地累计） */
  async function refreshCompanionStats() {
    if (!user.value) return
    const uid = user.value.id
    try {
      const [friendsRes, groupsRes, momentsRes] = await Promise.all([
        supabase.from('friend_chat_messages').select('receiver_id', { count: 'exact', head: true }).eq('sender_id', uid),
        supabase.from('chat_groups').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
        supabase.from('companion_moments').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      // 这些表名可能不存在；只在拉到值时覆盖，避免清零本地累计
      if (typeof groupsRes.count === 'number') _companionStats.value.group_count = Math.max(_companionStats.value.group_count, groupsRes.count)
      if (typeof momentsRes.count === 'number') _companionStats.value.moment_count = Math.max(_companionStats.value.moment_count, momentsRes.count)
      // friend_count 用 distinct receiver 计数（fallback 本地）
      void friendsRes
    } catch {
      /* 静默 */
    }
  }

  // 检查并解锁成就
  async function checkAndUnlockAchievements(_eventType: GameEventType) {
    if (!user.value) return

    // task/goal/habit/streak 类需要刷新数据库统计；纯伴侣类用本地累计
    if (
      _eventType === 'task_complete'
      || _eventType === 'goal_complete'
      || _eventType === 'habit_check'
      || _eventType === 'checkin'
    ) {
      await refreshStats()
    }

    const toUnlock: Achievement[] = []
    const stats = _userStats.value

    for (const achievement of ACHIEVEMENTS) {
      // 跳过已解锁的
      if (_userAchievements.value.some(ua => ua.achievement_key === achievement.key)) continue

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
        case 'friend_count':
          shouldUnlock = _companionStats.value.friend_count >= threshold
          break
        case 'group_count':
          shouldUnlock = _companionStats.value.group_count >= threshold
          break
        case 'moment_count':
          shouldUnlock = _companionStats.value.moment_count >= threshold
          break
        case 'ai_chat_count':
          shouldUnlock = _companionStats.value.ai_chat_count >= threshold
          break
        case 'share_count':
          shouldUnlock = _companionStats.value.share_count >= threshold
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

  /**
   * 通用游戏事件入口（v13.1 新）：任何模块（伴侣、Planner、Goal、Habit、Checkin）
   * 在做出关键动作后调用一次即可。会自动累加伴侣计数 + 触发成就检查。
   */
  async function gameEvent(eventType: GameEventType, data?: Record<string, unknown>) {
    void data
    switch (eventType) {
      case 'companion_friend_added':
        _companionStats.value.friend_count += 1
        break
      case 'companion_group_created':
        _companionStats.value.group_count += 1
        break
      case 'companion_moment_posted':
        _companionStats.value.moment_count += 1
        break
      case 'companion_moment_shared':
        _companionStats.value.share_count += 1
        break
      case 'companion_ai_chat':
        _companionStats.value.ai_chat_count += 1
        break
    }
    await checkAndUnlockAchievements(eventType)
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

    if (error && !String(error.code).startsWith('23')) {
      // 23xxx = 唯一约束冲突，幂等忽略；其他错误打印
      console.error('解锁成就失败:', error)
      return
    }

    // 增加经验
    await addXp(achievement.reward_xp)

    // 更新本地状态
    _userAchievements.value.push({
      id: '',
      user_id: user.value.id,
      achievement_key: achievement.key,
      unlocked_at: new Date().toISOString(),
      progress: 100,
    })

    // 入队列，依次飘入
    enqueueUnlock(achievement)
  }

  function enqueueUnlock(achievement: Achievement) {
    _unlockQueue.value.push(achievement)
    if (!_newlyUnlocked.value) {
      shiftUnlock()
    }
  }

  function shiftUnlock() {
    if (_toastTimer) {
      clearTimeout(_toastTimer)
      _toastTimer = null
    }
    const next = _unlockQueue.value.shift()
    if (!next) {
      _newlyUnlocked.value = null
      return
    }
    _newlyUnlocked.value = next
    _toastTimer = setTimeout(() => {
      _toastTimer = null
      shiftUnlock()
    }, 4500)
  }

  // 增加经验值
  async function addXp(amount: number) {
    if (!user.value) return

    const newXp = _userStats.value.total_xp + amount
    let newLevel = _userStats.value.level

    // 检查是否升级
    while (newLevel < LEVEL_XP.length && newXp >= LEVEL_XP[newLevel]) {
      newLevel++
    }

    await supabase.from('user_stats').update({
      total_xp: newXp,
      level: newLevel,
    }).eq('user_id', user.value.id)

    _userStats.value.total_xp = newXp
    _userStats.value.level = newLevel
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
      longest_daily_streak: Math.max(dailyStreak.current, _userStats.value.longest_daily_streak),
      longest_habit_streak: longestHabitStreak,
    })

    // 更新本地状态
    _userStats.value.total_tasks_completed = taskCount || 0
    _userStats.value.total_goals_completed = goalCount || 0
    _userStats.value.current_daily_streak = dailyStreak.current
    _userStats.value.longest_daily_streak = Math.max(dailyStreak.current, _userStats.value.longest_daily_streak)
    _userStats.value.longest_habit_streak = longestHabitStreak
  }

  // 计算每日连续天数（V13：合并 planner_tasks 完成日期 + checkin_records 签到日期）
  async function calculateDailyStreak(): Promise<{ current: number }> {
    if (!user.value) return { current: 0 }

    // 并行拉取两个数据源
    const [tasksRes, checkinsRes] = await Promise.all([
      supabase
        .from('planner_tasks')
        .select('completed_at')
        .eq('user_id', user.value.id)
        .eq('is_completed', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(365),
      supabase
        .from('checkin_records')
        .select('checkin_date')
        .eq('user_id', user.value.id)
        .order('checkin_date', { ascending: false })
        .limit(365),
    ])

    const tasks = tasksRes.data || []
    const checkins = checkinsRes.data || []
    if (tasks.length === 0 && checkins.length === 0) return { current: 0 }

    // 合并所有活跃日期
    const dateSet = new Set<string>([
      ...tasks.map((t: { completed_at: string }) => t.completed_at.split('T')[0]),
      ...checkins.map((c: { checkin_date: string }) => c.checkin_date),
    ])

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]

      if (dateSet.has(expectedStr)) {
        streak++
      } else if (i === 0) {
        // 今天还没做任何事，继续看昨天
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
      case 'early_bird': {
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
      }

      case 'night_owl': {
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
      }

      case 'weekend_warrior': {
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
      }

      default:
        return false
    }
  }

  // 清除新解锁提示（手动关闭，立即播下一枚）
  function clearNewlyUnlocked() {
    if (_toastTimer) {
      clearTimeout(_toastTimer)
      _toastTimer = null
    }
    shiftUnlock()
  }

  // 获取成就进度百分比
  function getAchievementProgress(achievement: Achievement): number {
    const { type, threshold } = achievement.condition
    const stats = _userStats.value
    const cs = _companionStats.value

    switch (type) {
      case 'task_count':
        return Math.min(100, (stats.total_tasks_completed / threshold) * 100)
      case 'goal_count':
        return Math.min(100, (stats.total_goals_completed / threshold) * 100)
      case 'daily_streak':
        return Math.min(100, (Math.max(stats.current_daily_streak, stats.longest_daily_streak) / threshold) * 100)
      case 'habit_streak':
        return Math.min(100, (stats.longest_habit_streak / threshold) * 100)
      case 'friend_count':
        return Math.min(100, (cs.friend_count / threshold) * 100)
      case 'group_count':
        return Math.min(100, (cs.group_count / threshold) * 100)
      case 'moment_count':
        return Math.min(100, (cs.moment_count / threshold) * 100)
      case 'ai_chat_count':
        return Math.min(100, (cs.ai_chat_count / threshold) * 100)
      case 'share_count':
        return Math.min(100, (cs.share_count / threshold) * 100)
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
    userAchievements: _userAchievements,
    userStats: _userStats,
    companionStats: _companionStats,
    unlockedAchievements,
    lockedAchievements,
    newlyUnlocked: _newlyUnlocked,
    nextLevelXp,
    currentLevelProgress,
    ACHIEVEMENTS,
    fetchUserAchievements,
    checkAndUnlockAchievements,
    gameEvent,
    refreshStats,
    refreshCompanionStats,
    clearNewlyUnlocked,
    getAchievementProgress,
    getLevelTitle,
  }
}
