/**
 * useHealth.ts — 健康打卡数据层
 *
 * 2026-07-21 迁移：数据源从 Supabase 切换到自建 Go 后端（BACKEND-CONTRACT.md §4.3 / §4.3b）。
 * - checkins 走 GET/POST /api/health/checkins（POST 为按天 upsert）
 * - 后端 v1 仍用老字段（checkin_date/water_cups/sleep_hours），v2 换新字段（date/water_intake/sleep_start…）：
 *   请求体两套字段名都带、响应两套都认（见 buildCheckinBody / apiToCheckin），v2 上线无需再改
 * - streak / challenges 走 §4.3b v2 端点；v2 未上线时（404）streak 显示 0、挑战列表为空
 * - 文件上传改 apiUpload（POST /api/uploads），/uploads 为公开静态路径，签名 URL 不再需要
 */
import { ref } from 'vue'
import { apiFetch, apiUpload, getToken, ApiError, API_BASE } from '../api/client'

// ====== 类型定义 ======

export interface HealthCheckin {
  id: string
  user_id: string
  date: string
  meals: MealsData
  sleep_start?: string
  sleep_end?: string
  sleep_quality?: number
  /** v1 后端仅存睡眠时长（小时）；有 sleep_start/end 时以区间计算为准 */
  sleep_hours?: number
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

// ====== 后端行映射（v1/v2 双兼容） ======

/** 后端 checkin 行：v1 老字段（checkin_date/water_cups/sleep_hours）与 v2 新字段（date/water_intake/…）的并集 */
interface ApiCheckinRow {
  id: string
  user_id: string
  date?: string
  checkin_date?: string
  meals?: MealsData | null
  sleep_hours?: number | null
  sleep_start?: string | null
  sleep_end?: string | null
  sleep_quality?: number | null
  exercise_type?: string | null
  exercise_minutes?: number | null
  exercise_intensity?: string | null
  exercise_image_url?: string | null
  water_cups?: number | null
  water_intake?: number | null
  is_public?: boolean | null
  share_text?: string | null
  share_tags?: string[] | null
  ai_comment?: string | null
  created_at: string
  updated_at?: string
}

/** v1 后端以 water_cups(杯) 粗粒度存饮水，1 杯按 250ml 折算 */
const ML_PER_CUP = 250

function apiToCheckin(raw: ApiCheckinRow): HealthCheckin {
  const str = (v: string | null | undefined) => (v ? v : undefined)
  return {
    id: raw.id,
    user_id: raw.user_id,
    date: raw.date || raw.checkin_date || '',
    meals: raw.meals || {},
    sleep_start: str(raw.sleep_start),
    sleep_end: str(raw.sleep_end),
    sleep_quality: raw.sleep_quality ?? undefined,
    sleep_hours: raw.sleep_hours ?? undefined,
    exercise_type: str(raw.exercise_type),
    exercise_minutes: raw.exercise_minutes || 0,
    exercise_intensity: (str(raw.exercise_intensity) as HealthCheckin['exercise_intensity']) ?? undefined,
    exercise_image_url: str(raw.exercise_image_url),
    water_intake: raw.water_intake ?? (raw.water_cups ? raw.water_cups * ML_PER_CUP : 0),
    is_public: !!raw.is_public,
    share_text: str(raw.share_text),
    share_tags: raw.share_tags && raw.share_tags.length ? raw.share_tags : undefined,
    ai_comment: str(raw.ai_comment),
    created_at: raw.created_at,
    updated_at: raw.updated_at || raw.created_at,
  }
}

/** 组装 POST /api/health/checkins 请求体：v1 与 v2 字段名都带，两版后端均能解析入库 */
function buildCheckinBody(record: Partial<HealthCheckin>, date: string): Record<string, unknown> {
  // v1 只存 sleep_hours：从 sleep_start/end 推算，保证 v1 期间睡眠数据可回读
  let sleepHours = record.sleep_hours ?? null
  if (record.sleep_start && record.sleep_end) {
    let diff = (new Date(record.sleep_end).getTime() - new Date(record.sleep_start).getTime()) / 3600000
    if (Number.isFinite(diff)) {
      if (diff < 0) diff += 24
      sleepHours = Math.round(diff * 100) / 100
    }
  }
  const waterMl = record.water_intake ?? 0
  return {
    date,
    checkin_date: date,
    meals: record.meals ?? {},
    sleep_start: record.sleep_start ?? null,
    sleep_end: record.sleep_end ?? null,
    sleep_quality: record.sleep_quality ?? null,
    sleep_hours: sleepHours,
    exercise_type: record.exercise_type ?? null,
    exercise_minutes: record.exercise_minutes ?? 0,
    exercise_intensity: record.exercise_intensity ?? null,
    exercise_image_url: record.exercise_image_url ?? null,
    water_intake: waterMl,
    water_cups: Math.round(waterMl / ML_PER_CUP),
    is_public: record.is_public ?? false,
    share_text: record.share_text ?? null,
    share_tags: record.share_tags ?? null,
    ai_comment: record.ai_comment ?? null,
  }
}

// ====== Composable ======

export function useHealth() {
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
    if (!getToken()) return null
    const today = getLocalDate()

    let record: HealthCheckin | null = null
    try {
      const data = await apiFetch<{ checkins: ApiCheckinRow[] }>(
        `/api/health/checkins?from=${today}&to=${today}`
      )
      const row = (data.checkins || [])[0]
      if (row) {
        record = apiToCheckin(row)
        todayCheckin.value = record
      }
    } catch (e) {
      console.error('加载今日打卡失败:', e)
      return null
    }

    // 加载连续打卡天数
    await loadStreak()

    return record
  }

  /** 连续打卡：GET /api/health/streak（v2 由后端按天连续性计算；v2 未上线时显示 0） */
  async function loadStreak(): Promise<number> {
    if (!getToken()) return 0

    try {
      const data = await apiFetch<{ current_streak: number }>('/api/health/streak')
      streak.value = data.current_streak || 0
    } catch (e) {
      if (e instanceof ApiError && e.httpStatus === 404) {
        // 待 v2 后端：端点未实现，streak 显示 0
        streak.value = 0
      } else {
        console.error('加载连续打卡失败:', e)
        streak.value = 0
      }
    }
    return streak.value
  }

  async function saveCheckin(checkinData: Partial<HealthCheckin>): Promise<boolean> {
    if (!getToken()) return false
    saving.value = true

    try {
      const today = getLocalDate()
      // 与旧 upsert 语义一致：在已有今日记录基础上合并本次提交的字段
      const merged: Partial<HealthCheckin> = { ...(todayCheckin.value || {}), ...checkinData }
      await apiFetch('/api/health/checkins', { body: buildCheckinBody(merged, today) })

      // 连续打卡由后端 /api/health/streak 实时计算，前端只需刷新
      // 重新加载今日数据（内部会顺带刷新 streak）
      await loadTodayCheckin()

      return true
    } catch (e) {
      console.error('保存打卡失败:', e)
      return false
    } finally {
      saving.value = false
    }
  }

  // 旧版 updateStreak（本地读改写 health_streaks 表）已删除：连续打卡改由后端
  // GET /api/health/streak 根据 health_checkins 按天连续性实时计算（契约 §4.3b）

  // ====== 挑战功能（契约 §4.3b v2 端点；v2 未上线时列表为空、报名/更新静默失败） ======

  async function loadChallenges(): Promise<HealthChallenge[]> {
    if (!getToken()) return []

    try {
      const data = await apiFetch<{ challenges: HealthChallenge[] }>('/api/health/challenges?status=active')
      challenges.value = data.challenges || []
    } catch (e) {
      if (e instanceof ApiError && e.httpStatus === 404) {
        // 待 v2 后端：challenges 端点未实现
        challenges.value = []
      } else {
        console.error('加载挑战失败:', e)
      }
      return []
    }
    return challenges.value
  }

  async function joinChallenge(template: typeof CHALLENGE_TEMPLATES[number]): Promise<HealthChallenge | null> {
    if (!getToken()) return null

    try {
      // start_date=今天、end_date=+target_days 由后端计算（契约 §4.3b）
      const data = await apiFetch<HealthChallenge>('/api/health/challenges', {
        body: {
          challenge_type: template.type,
          title: template.title,
          description: template.description,
          target_days: template.target_days,
          reward_xp: template.reward_xp,
        },
      })
      challenges.value.unshift(data)
      return data
    } catch (e) {
      console.error('参加挑战失败:', e)
      return null
    }
  }

  async function updateChallengeProgress(challengeId: string, completedDays: number): Promise<void> {
    const challenge = challenges.value.find(c => c.id === challengeId)
    if (!challenge) return

    const newStatus = completedDays >= challenge.target_days ? 'completed' : 'active'

    try {
      await apiFetch(`/api/health/challenges/${challengeId}`, {
        method: 'PATCH',
        body: { completed_days: completedDays, status: newStatus },
      })
    } catch (e) {
      console.error('更新挑战进度失败:', e)
      return
    }

    // 更新本地状态
    challenge.completed_days = completedDays
    challenge.status = newStatus
  }

  // ====== 周报生成 ======

  /** 单条记录的睡眠时长（小时）：优先 sleep_start/end 区间，缺失时回退 v1 的 sleep_hours */
  function checkinSleepHours(r: HealthCheckin): number {
    if (r.sleep_start && r.sleep_end) {
      let diff = (new Date(r.sleep_end).getTime() - new Date(r.sleep_start).getTime()) / 3600000
      if (Number.isFinite(diff)) {
        if (diff < 0) diff += 24
        return diff
      }
    }
    return r.sleep_hours || 0
  }

  async function generateWeeklyReport(): Promise<WeeklyReport | null> {
    if (!getToken()) return null

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - 6)

    let records: HealthCheckin[] = []
    try {
      const data = await apiFetch<{ checkins: ApiCheckinRow[] }>(
        `/api/health/checkins?from=${weekStart.toISOString().slice(0, 10)}&to=${today.toISOString().slice(0, 10)}`
      )
      // 后端按日期倒序返回，周报按升序处理
      records = (data.checkins || []).map(apiToCheckin).sort((a, b) => a.date.localeCompare(b.date))
    } catch (e) {
      console.error('加载周报数据失败:', e)
      return null
    }

    if (records.length === 0) return null

    // 计算各项平均值
    let totalSleep = 0, totalMeal = 0, totalExercise = 0, totalWater = 0
    let sleepDays = 0, mealDays = 0

    for (const r of records) {
      // 睡眠
      const sleepH = checkinSleepHours(r)
      if (sleepH > 0) {
        totalSleep += sleepH
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
      const sleepH = checkinSleepHours(r)
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
    if (!getToken()) return { sleep: [], meal: [], exercise: [], water: [] }

    const weekStart = getLocalDate(-6)
    const today = getLocalDate()

    let records: HealthCheckin[] = []
    try {
      const data = await apiFetch<{ checkins: ApiCheckinRow[] }>(
        `/api/health/checkins?from=${weekStart}&to=${today}`
      )
      records = (data.checkins || []).map(apiToCheckin)
    } catch (e) {
      console.error('加载本周数据失败:', e)
    }

    const recordMap = new Map(records.map(r => [r.date, r]))
    const sArr: number[] = [], mArr: number[] = [], eArr: number[] = [], wArr: number[] = []

    for (let i = 6; i >= 0; i--) {
      const d = getLocalDate(-i)
      const data = recordMap.get(d)

      if (data) {
        const sleepH = checkinSleepHours(data)
        sArr.push(sleepH > 0 ? Math.round(sleepH * 10) / 10 : 0)
        const meals = data.meals as MealsData
        mArr.push(calculateMealScore(meals))
        eArr.push(Math.min(100, Math.round(((data.exercise_minutes || 0) / 30) * 100)))
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
    if (!getToken()) return []

    try {
      // 后端按 date 倒序返回全部记录，前端本地分页（后端 checkins 暂无 limit/offset 参数）
      const data = await apiFetch<{ checkins: ApiCheckinRow[] }>('/api/health/checkins')
      const all = (data.checkins || []).map(apiToCheckin)
      return all.slice(page * pageSize, page * pageSize + pageSize)
    } catch (e) {
      console.error('加载历史记录失败:', e)
      return []
    }
  }

  // ====== 文件上传 ======

  /** 上传到自建后端 POST /api/uploads，返回完整可访问 URL（folder 参数保留签名，自建后端统一存 /uploads） */
  async function uploadHealthFile(file: File, folder: string): Promise<string | null> {
    void folder
    if (!getToken()) return null

    try {
      return await apiUpload(file)
    } catch (e) {
      console.error('文件上传失败:', e)
      return null
    }
  }

  /** 自建后端 /uploads 为公开静态路径，无需签名：完整 URL 原样透传，相对路径拼 API_BASE */
  async function getSignedUrl(storagePath: string): Promise<string> {
    if (!storagePath || storagePath.startsWith('http')) return storagePath
    return storagePath.startsWith('/') ? `${API_BASE}${storagePath}` : `${API_BASE}/${storagePath}`
  }

  // ====== 工具函数 ======

  function getLocalDate(offset = 0): string {
    const d = new Date()
    if (offset) d.setDate(d.getDate() + offset)
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
    getSignedUrl,

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
