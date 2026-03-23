/**
 * useSemester.ts — 学期设置（localStorage）
 *
 * 终审要求：增加"学期设置"最小能力
 * 学期开始日期、总周数、考试周范围，先用 localStorage
 */
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'spark-schedule-semester'

/** 学期配置接口 */
export interface SemesterConfig {
  /** 学期名称，如 "2025-2026 第二学期" */
  name: string
  /** 开学日期 YYYY-MM-DD */
  startDate: string
  /** 总周数 */
  totalWeeks: number
  /** 考试周（从第几周到第几周） */
  examWeekStart: number
  examWeekEnd: number
}

/** 默认配置 */
const DEFAULT_CONFIG: SemesterConfig = {
  name: '2025-2026 第二学期',
  startDate: '2026-02-23',
  totalWeeks: 18,
  examWeekStart: 17,
  examWeekEnd: 18,
}

/**
 * 从 localStorage 加载学期配置
 */
function loadConfig(): SemesterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch {
    // 解析失败用默认值
  }
  return { ...DEFAULT_CONFIG }
}

/**
 * 保存学期配置到 localStorage
 */
function saveConfig(config: SemesterConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function useSemester() {
  const config = ref<SemesterConfig>(loadConfig())

  // 自动持久化
  watch(config, (val) => saveConfig(val), { deep: true })

  /** 更新学期配置 */
  const updateConfig = (partial: Partial<SemesterConfig>) => {
    config.value = { ...config.value, ...partial }
  }

  /** 重置为默认 */
  const resetConfig = () => {
    config.value = { ...DEFAULT_CONFIG }
  }

  /** 学期开始日期对象 */
  const semesterStart = computed(() => new Date(config.value.startDate))

  /** 学期结束日期 */
  const semesterEnd = computed(() => {
    const d = new Date(config.value.startDate)
    d.setDate(d.getDate() + config.value.totalWeeks * 7)
    return d
  })

  /**
   * 获取指定日期是第几周
   * @returns 周次（1-based），不在学期内返回 null
   */
  const getWeekNumber = (date: Date): number | null => {
    const start = semesterStart.value
    const diffMs = date.getTime() - start.getTime()
    if (diffMs < 0) return null

    const diffDays = Math.floor(diffMs / 86400000)
    const week = Math.floor(diffDays / 7) + 1

    if (week > config.value.totalWeeks) return null
    return week
  }

  /**
   * 判断指定日期是否在考试周
   */
  const isExamWeek = (date: Date): boolean => {
    const week = getWeekNumber(date)
    if (week === null) return false
    return week >= config.value.examWeekStart && week <= config.value.examWeekEnd
  }

  /**
   * 获取指定周次的日期范围（周一到周日）
   */
  const getWeekDateRange = (weekNum: number): { start: Date; end: Date } | null => {
    if (weekNum < 1 || weekNum > config.value.totalWeeks) return null
    
    const start = new Date(config.value.startDate)
    start.setDate(start.getDate() + (weekNum - 1) * 7)
    
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    return { start, end }
  }

  return {
    config,
    updateConfig,
    resetConfig,
    semesterStart,
    semesterEnd,
    getWeekNumber,
    isExamWeek,
    getWeekDateRange,
  }
}
