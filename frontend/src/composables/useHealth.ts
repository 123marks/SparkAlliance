import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// ====== 类型定义 ======

export interface HealthCheckin {
  id: string
  user_id: string
  date: string
  meals: MealsData
  sleep_start?: string
  sleep_end?: string
  sleep_quality?: number
  exercise_type?: string
  exercise_minutes: number
  exercise_intensity?: 'light' | 'moderate' | 'high'
  exercise_image_url?: string
  water_intake: number // 饮水量(ml)
  is_public: boolean
  share_text?: string
  share_tags?: string[]
  ai_comment?: string
  created_at: string
  updated_at: string
}

export interface MealsData {
  breakfast?: MealSlot
  lunch?: MealSlot
  dinner?: MealSlot
  [key: string]: MealSlot | undefined // snack_1, snack_2...
}

export interface MealSlot {
  done: boolean
  name?: string
  tags?: string[]
  note?: string
  image_url?: string
  video_url?: string
}

export interface HealthStreak {
  user_id: string
  current_streak: number
  longest_streak: number
  last_checkin_date: string
}

export interface HealthChallenge {
  id: string
  user_id: string
  challenge_type: 'sleep' | 'exercise' | 'water' | 'meal' | 'custom'
  title: string
  description: string
  target_value: number
  current_value: number
  target_days: number
  completed_days: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  reward_xp: number
  created_at: string
}

export interface WeeklyReport {
  week_start: string
  week_end: string
  avg_sleep_hours: number
  avg_meal_completion: number
  avg_exercise_minutes: number
  avg_water_intake: number
  total_checkin_days: number
  best_day: string
  worst_day: string
  improvement_tips: string[]
  grade: 'A' | 'B' | 'C' | 'D'
}

// ====== 常量 ======

export const FOOD_TAGS = ['水果', '主食', '蔬菜', '肉类', '奶制品', '零食', '奶茶', '外卖', '粗粮', '汤粥', '坚果', '饮料']
export const EXERCISE_TYPES = ['跑步', '骑行', '篮球', '足球', '游泳', '瑜伽', '健身', '羽毛球', '散步', '跳绳', '拉伸', '其他']
export const INTENSITY_LEVELS = [
  { value: 'light', label: '轻' },
  { value: 'moderate', label: '中' },
  { value: 'high', label: '高' },
] as const
export const SHARE_TAGS = ['早起打卡', '健身', '跑步', '减脂', '增肌', '早睡', '素食', '自律', '减压', '养生']

// 水杯配置
export const WATER_CUPS = [
  { ml: 200, icon: '🥛', label: '小杯' },
  { ml: 350, icon: '🍵', label: '中杯' },
  { ml: 500, icon: '🫗', label: '大杯' },
]

// 预设挑战
export const CHALLENGE_TEMPLATES = [
  { type: 'sleep' as const, title: '早睡7天', description: '连续7天在23:00前入睡', target_days: 7, reward_xp: 100 },
  { type: 'exercise' as const, title: '运动21天', description: '连续21天每天运动30分钟以上', target_days: 21, reward_xp: 300 },
  { type: 'water' as const, title: '8杯水计划', description: '连续14天每天喝够2000ml水', target_days: 14, reward_xp: 150 },
  { type: 'meal' as const, title: '三餐全勤', description: '连续7天三餐都按时吃', target_days: 7, reward_xp: 80 },
]

// 健康成就定义
export const HEALTH_ACHIEVEMENTS = [
  { key: 'first_checkin', name: '健康启航', description: '完成第一次健康打卡', icon: '🌱', tier: 'bronze', reward_xp: 10 },
  { key: 'streak_7', name: '一周坚持', description: '连续7天健康打卡', icon: '🔥', tier: 'bronze', reward_xp: 50 },
  { key: 'streak_30', name: '月度冠军', description: '连续30天健康打卡', icon: '🏆', tier: 'gold', reward_xp: 200 },
  { key: 'sleep_master', name: '睡眠大师', description: '连续14天睡眠时长达到7-9小时', icon: '😴', tier: 'silver', reward_xp: 100 },
  { key: 'fitness_star', name: '运动之星', description: '累计运动时长超过1000分钟', icon: '💪', tier: 'silver', reward_xp: 150 },
  { key: 'water_hero', name: '补水达人', description: '连续7天饮水量达到2000ml', icon: '💧', tier: 'bronze', reward_xp: 60 },
  { key: 'meal_regular', name: '规律饮食', description: '连续30天三餐全勤', icon: '🍱', tier: 'gold', reward_xp: 180 },
  { key: 'challenge_master', name: '挑战达人', description: '完成3个健康挑战', icon: '🎯', tier: 'silver', reward_xp: 120 },
  { key: 'perfect_day', name: '完美一天', description: '某天饮食、睡眠、运动、饮水全部达标', icon: '⭐', tier: 'bronze', reward_xp: 30 },
  { key: 'early_bird', name: '早起鸟儿', description: '连续7天在6:30前起床', icon: '🌅', tier: 'bronze', reward_xp: 70 },
]

// ====== Composable ======

export function useHealth() {
  const { user } = useAuth()

  // 状态
  const loading = ref(false)
  const saving = ref(false)
  const streak = ref(0)
  const todayCheckin = ref<HealthCheckin | null>(null)
  const challenges = ref<HealthChallenge[]>([])
  const weeklyReport = ref<WeeklyReport | null>(null)

  // ====== 评分计算 ======

  function calculateMealScore(meals: MealsData): number {
    const mainMeals = ['breakfast', 'lunch', 'dinner']
    const completed = mainMeals.filter(k => meals[k]?.done).length
    return Math.round((completed / 3) * 100)
  }

  function calculateSleepScore(sleepHours: number): number {
    if (sleepHours <= 0) return 0
    if (sleepHours >= 7 && sleepHours <= 9) return 100
    if (sleepHours > 9) return 80
    if (sleepHours >= 6) return 70
    if (sleepHours >= 5) return 40
    return 20
  }

  function calculateExerciseScore(minutes: number, intensity: string): number {
    const mult = intensity === 'high' ? 1.3 : intensity === 'moderate' ? 1.0 : 0.8
    return Math.min(100, Math.round((minutes * mult / 30) * 100))
  }

  function calculateWaterScore(ml: number): number {
    // 目标2000ml
    return Math.min(100, Math.round((ml / 2000) * 100))
  }

  function calculateTotalScore(meal: number, sleep: number, exercise: number, water: number): number {
    return Math.round(meal * 0.3 + sleep * 0.3 + exercise * 0.25 + water * 0.15)
  }

  function getGrade(score: number): { grade: string; desc: string; color: string } {
    if (score >= 85) return { grade: 'A', desc: '优秀', color: '#10b981' }
    if (score >= 70) return { grade: 'B', desc: '良好', color: '#3b82f6' }
    if (score >= 50) return { grade: 'C', desc: '一般', color: '#f59e0b' }
    return { grade: 'D', desc: '待改善', color: '#ef4444' }
  }

  // ====== AI 评语生成 ======

  function generateMealComment(meals: MealsData): string {
    const mainMeals = ['breakfast', 'lunch', 'dinner']
    const completed = mainMeals.filter(k => meals[k]?.done).length
    const snackCount = Object.keys(meals).filter(k => k.startsWith('snack') && meals[k]?.done).length

    if (completed === 0) return '还没有饮食记录，按时吃饭很重要 🍎'
    if (completed >= 3 && snackCount > 0) return `三餐全勤+${snackCount}次加餐，注意控制总量～`
    if (completed >= 3) return '三餐全勤！规律饮食是健康的基础 👍'
    return `吃了${completed}餐，建议保持三餐规律～`
  }

  function generateSleepComment(hours: number, quality: number): string {
    if (hours <= 0) return '还没有睡眠记录，充足睡眠 7-9h 是身心健康的关键 🌙'
    const h = hours.toFixed(1)
    if (hours >= 7 && hours <= 9) {
      if (quality >= 4) return `${h}h，睡眠充足质量优秀，精力满满 💪`
      return `${h}h，符合 NSF 推荐标准 💪`
    }
    if (hours > 9) return `${h}h 偏多，过度睡眠也影响精神状态～`
    if (hours >= 6) return `${h}h 稍短，试试提前30分钟入睡 🌙`
    return `只有${h}h，严重不足！成人每天需 7-9h 睡眠 ⚠️`
  }

  function generateExerciseComment(type: string, minutes: number): string {
    if (minutes <= 0) return 'WHO 建议每天至少30分钟中等强度运动，动起来吧 🏃'
    if (minutes >= 30) return `${type || '运动'}${minutes}min，达到 WHO 每日推荐量 🎉`
    return `${type || '运动'}${minutes}min，距离30min目标还差${30 - minutes}分钟～`
  }

  function generateWaterComment(ml: number): string {
    if (ml <= 0) return '记得多喝水，每天2000ml是基础目标 💧'
    if (ml >= 2000) return `今日饮水${ml}ml，补水充足！💧`
    if (ml >= 1500) return `已喝${ml}ml，再来${2000 - ml}ml就达标了～`
    if (ml >= 1000) return `已喝${ml}ml，加油，目标2000ml！`
    return `才喝了${ml}ml，记得多补水哦～`
  }

  // ====== 数据库操作 ======

  async function loadTodayCheckin(): Promise<HealthCheckin | null> {
    if (!user.value) return null
    const today = getLocalDate()

    const { data, error } = await supabase
      .from('health_checkins')
      .select('*')
      .eq('user_id', user.value.id)
      .eq('date', today)
      .maybeSingle()

    if (error) {
      console.error('加载今日打卡失败:', error)
      return null
    }

    if (data) {
      todayCheckin.value = data as HealthCheckin
    }

    // 加载连续打卡天数
    await loadStreak()

    return data as HealthCheckin | null
  }

  async function loadStreak(): Promise<number> {
    if (!user.value) return 0

    const { data } = await supabase
      .from('health_streaks')
      .select('current_streak')
      .eq('user_id', user.value.id)
      .maybeSingle()

    streak.value = data?.current_streak || 0
    return streak.value
  }

  async function saveCheckin(checkinData: Partial<HealthCheckin>): Promise<boolean> {
    if (!user.value) return false
    saving.value = true

    try {
      const today = getLocalDate()
      const existingId = todayCheckin.value?.id

      const record = {
        user_id: user.value.id,
        date: today,
        ...checkinData,
        updated_at: new Date().toISOString(),
      }

      if (existingId) {
        const { error } = await supabase
          .from('health_checkins')
          .update(record)
          .eq('id', existingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('health_checkins')
          .insert(record)
        if (error) throw error
      }

      // 更新连续打卡
      await updateStreak(today)

      // 重新加载今日数据
      await loadTodayCheckin()

      return true
    } catch (e) {
      console.error('保存打卡失败:', e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateStreak(today: string): Promise<void> {
    if (!user.value) return

    const { data } = await supabase
      .from('health_streaks')
      .select('*')
      .eq('user_id', user.value.id)
      .maybeSingle()

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    if (data) {
      let newStreak = data.current_streak
      if (data.last_checkin_date === yesterday) {
        newStreak++
      } else if (data.last_checkin_date !== today) {
        newStreak = 1
      }

      await supabase.from('health_streaks').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, data.longest_streak),
        last_checkin_date: today,
      }).eq('user_id', user.value.id)

      streak.value = newStreak
    } else {
      await supabase.from('health_streaks').insert({
        user_id: user.value.id,
        current_streak: 1,
        longest_streak: 1,
        last_checkin_date: today,
      })
      streak.value = 1
    }
  }

  // ====== 挑战功能 ======

  async function loadChallenges(): Promise<HealthChallenge[]> {
    if (!user.value) return []

    const { data, error } = await supabase
      .from('health_challenges')
      .select('*')
      .eq('user_id', user.value.id)
      .in('status', ['active'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('加载挑战失败:', error)
      return []
    }

    challenges.value = data || []
    return challenges.value
  }

  async function joinChallenge(template: typeof CHALLENGE_TEMPLATES[number]): Promise<HealthChallenge | null> {
    if (!user.value) return null

    const startDate = getLocalDate()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + template.target_days)

    const { data, error } = await supabase.from('health_challenges').insert({
      user_id: user.value.id,
      challenge_type: template.type,
      title: template.title,
      description: template.description,
      target_value: 0,
      current_value: 0,
      target_days: template.target_days,
      completed_days: 0,
      start_date: startDate,
      end_date: endDate.toISOString().slice(0, 10),
      status: 'active',
      reward_xp: template.reward_xp,
    }).select().single()

    if (error) {
      console.error('参加挑战失败:', error)
      return null
    }

    challenges.value.unshift(data)
    return data
  }

  async function updateChallengeProgress(challengeId: string, completedDays: number): Promise<void> {
    const challenge = challenges.value.find(c => c.id === challengeId)
    if (!challenge) return

    const newStatus = completedDays >= challenge.target_days ? 'completed' : 'active'

    await supabase.from('health_challenges').update({
      completed_days: completedDays,
      status: newStatus,
    }).eq('id', challengeId)

    // 更新本地状态
    challenge.completed_days = completedDays
    challenge.status = newStatus
  }

  // ====== 周报生成 ======

  async function generateWeeklyReport(): Promise<WeeklyReport | null> {
    if (!user.value) return null

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - 6)

    const { data: records } = await supabase
      .from('health_checkins')
      .select('*')
      .eq('user_id', user.value.id)
      .gte('date', weekStart.toISOString().slice(0, 10))
      .lte('date', today.toISOString().slice(0, 10))
      .order('date')

    if (!records || records.length === 0) return null

    // 计算各项平均值
    let totalSleep = 0, totalMeal = 0, totalExercise = 0, totalWater = 0
    let sleepDays = 0, mealDays = 0

    for (const r of records) {
      // 睡眠
      if (r.sleep_start && r.sleep_end) {
        let diff = (new Date(r.sleep_end).getTime() - new Date(r.sleep_start).getTime()) / 3600000
        if (diff < 0) diff += 24
        totalSleep += diff
        sleepDays++
      }
      // 饮食
      const meals = r.meals as MealsData
      const mealScore = calculateMealScore(meals)
      if (mealScore > 0) {
        totalMeal += mealScore
        mealDays++
      }
      // 运动
      totalExercise += r.exercise_minutes || 0
      // 饮水
      totalWater += r.water_intake || 0
    }

    const avgSleep = sleepDays > 0 ? totalSleep / sleepDays : 0
    const avgMeal = mealDays > 0 ? totalMeal / mealDays : 0
    const avgExercise = totalExercise / 7
    const avgWater = totalWater / 7

    // 找最佳和最差的一天
    let bestScore = 0, worstScore = 100, bestDay = '', worstDay = ''
    for (const r of records) {
      const meals = r.meals as MealsData
      let sleepH = 0
      if (r.sleep_start && r.sleep_end) {
        sleepH = (new Date(r.sleep_end).getTime() - new Date(r.sleep_start).getTime()) / 3600000
        if (sleepH < 0) sleepH += 24
      }
      const score = calculateTotalScore(
        calculateMealScore(meals),
        calculateSleepScore(sleepH),
        calculateExerciseScore(r.exercise_minutes || 0, r.exercise_intensity || 'light'),
        calculateWaterScore(r.water_intake || 0)
      )
      if (score > bestScore) { bestScore = score; bestDay = r.date }
      if (score < worstScore) { worstScore = score; worstDay = r.date }
    }

    // 生成改进建议
    const tips: string[] = []
    if (avgSleep < 7) tips.push('睡眠时间不足，建议每晚保证7-9小时睡眠')
    if (avgMeal < 80) tips.push('三餐规律性有待提高，按时吃饭很重要')
    if (avgExercise < 30) tips.push('运动量偏少，建议每天至少30分钟运动')
    if (avgWater < 1500) tips.push('饮水量不足，记得多喝水')
    if (tips.length === 0) tips.push('本周各项指标都很不错，继续保持！')

    const totalScore = calculateTotalScore(
      avgMeal, calculateSleepScore(avgSleep),
      calculateExerciseScore(avgExercise, 'moderate'),
      calculateWaterScore(avgWater)
    )

    const report: WeeklyReport = {
      week_start: weekStart.toISOString().slice(0, 10),
      week_end: today.toISOString().slice(0, 10),
      avg_sleep_hours: avgSleep,
      avg_meal_completion: avgMeal,
      avg_exercise_minutes: avgExercise,
      avg_water_intake: avgWater,
      total_checkin_days: records.length,
      best_day: bestDay,
      worst_day: worstDay,
      improvement_tips: tips,
      grade: getGrade(totalScore).grade as 'A' | 'B' | 'C' | 'D',
    }

    weeklyReport.value = report
    return report
  }

  // ====== 历史数据 ======

  async function loadWeekData(): Promise<{ sleep: number[]; meal: number[]; exercise: number[]; water: number[] }> {
    if (!user.value) return { sleep: [], meal: [], exercise: [], water: [] }

    const sArr: number[] = [], mArr: number[] = [], eArr: number[] = [], wArr: number[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      const { data } = await supabase
        .from('health_checkins')
        .select('meals,sleep_start,sleep_end,exercise_minutes,water_intake')
        .eq('user_id', user.value.id)
        .eq('date', d)
        .maybeSingle()

      if (data) {
        // 睡眠
        if (data.sleep_start && data.sleep_end) {
          let diff = (new Date(data.sleep_end).getTime() - new Date(data.sleep_start).getTime()) / 3600000
          if (diff < 0) diff += 24
          sArr.push(Math.round(diff * 10) / 10)
        } else {
          sArr.push(0)
        }
        // 饮食
        const meals = data.meals as MealsData
        mArr.push(calculateMealScore(meals))
        // 运动
        eArr.push(Math.min(100, Math.round(((data.exercise_minutes || 0) / 30) * 100)))
        // 饮水
        wArr.push(Math.min(100, Math.round(((data.water_intake || 0) / 2000) * 100)))
      } else {
        sArr.push(0)
        mArr.push(0)
        eArr.push(0)
        wArr.push(0)
      }
    }

    return { sleep: sArr, meal: mArr, exercise: eArr, water: wArr }
  }

  async function loadHistory(page: number = 0, pageSize: number = 10): Promise<HealthCheckin[]> {
    if (!user.value) return []

    const { data, error } = await supabase
      .from('health_checkins')
      .select('*')
      .eq('user_id', user.value.id)
      .order('date', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    if (error) {
      console.error('加载历史记录失败:', error)
      return []
    }

    return data || []
  }

  // ====== 文件上传 ======

  async function uploadHealthFile(file: File, folder: string): Promise<string | null> {
    if (!user.value) return null

    const path = `${user.value.id}/${folder}/${Date.now()}.${file.name.split('.').pop()}`

    try {
      // 尝试创建 bucket（如果不存在）
      try {
        await supabase.storage.createBucket('health-images', { public: false })
      } catch (_) {}

      const { error: uploadError } = await supabase.storage
        .from('health-images')
        .upload(path, file)

      if (uploadError) throw uploadError

      // 返回1小时有效的签名 URL
      const { data: signedData, error: signErr } = await supabase.storage
        .from('health-images')
        .createSignedUrl(path, 3600)

      if (signErr || !signedData?.signedUrl) {
        throw new Error('获取访问链接失败')
      }

      return signedData.signedUrl
    } catch (e) {
      console.error('文件上传失败:', e)
      return null
    }
  }

  // ====== 工具函数 ======

  function getLocalDate(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function calculateSleepHours(start: string, end: string): number {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let minutes = (eh * 60 + em) - (sh * 60 + sm)
    if (minutes < 0) minutes += 1440
    return minutes / 60
  }

  function formatRelativeTime(ts: string): string {
    const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000)
    if (h < 1) return '刚刚'
    if (h < 24) return `${h}小时前`
    return `${Math.floor(h / 24)}天前`
  }

  return {
    // 状态
    loading,
    saving,
    streak,
    todayCheckin,
    challenges,
    weeklyReport,

    // 常量
    FOOD_TAGS,
    EXERCISE_TYPES,
    INTENSITY_LEVELS,
    SHARE_TAGS,
    WATER_CUPS,
    CHALLENGE_TEMPLATES,
    HEALTH_ACHIEVEMENTS,

    // 评分
    calculateMealScore,
    calculateSleepScore,
    calculateExerciseScore,
    calculateWaterScore,
    calculateTotalScore,
    getGrade,

    // AI 评语
    generateMealComment,
    generateSleepComment,
    generateExerciseComment,
    generateWaterComment,

    // 数据库操作
    loadTodayCheckin,
    loadStreak,
    saveCheckin,
    loadWeekData,
    loadHistory,
    uploadHealthFile,

    // 挑战
    loadChallenges,
    joinChallenge,
    updateChallengeProgress,

    // 报告
    generateWeeklyReport,

    // 工具
    getLocalDate,
    calculateSleepHours,
    formatRelativeTime,
  }
}
