/**
 * usePlanner.ts — 星火规划数据层
 *
 * 2026-07-21 迁移：数据源从 Supabase 切换到自建 Go 后端（BACKEND-CONTRACT.md §4.3 / §4.3b）。
 * - goals/tasks 走 v1 既有端点（/api/planner/goals(/:id)、/api/planner/tasks(/:id)）
 * - milestones/reviews 走 §4.3b v2 端点；v2 未上线（路由 404）时优雅降级并在控制台标注
 * - 属主过滤由后端 JWT 兜底，前端不再传 user_id
 * - 推送日程改走 POST /api/schedule/events + PATCH 任务写回 schedule_event_id
 * - AI 调用（plannerDecompose/plannerReview）保持走 utils/localAI，本轮不迁
 */
import { ref, computed } from 'vue'
import { apiFetch, apiUpload, getToken, ApiError } from '../api/client'
import { plannerDecompose, plannerReview } from '../utils/localAI'

// ====== 类型定义 ======

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  goal_type: 'academic' | 'skill' | 'habit' | 'fitness' | 'career' | 'reading' | 'social' | 'creativity' | 'emotional' | 'finance' | 'custom'
  deadline: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  total_progress: number
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  description?: string
  target_date: string
  weight: number
  status: 'pending' | 'completed' | 'missed'
  sort_order: number
}

export interface PlannerTask {
  id: string
  goal_id?: string        // 可空 = 快捷独立任务
  milestone_id?: string
  title: string
  description?: string
  estimated_minutes?: number
  difficulty: number
  due_date?: string
  is_completed: boolean
  completed_at?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completion_note?: string // 完成备注
  source: 'manual' | 'ai' | 'template'
  sort_order: number
  schedule_event_id?: string
  created_at?: string
  // 前端扩展字段
  goalTitle?: string
}

export interface GoalReview {
  id: string
  goal_id: string
  user_id: string
  rating: number
  content: string
  improvements?: string
  shared_to_wall: boolean
  created_at: string
}

// 任务完成记录/证据
export interface TaskEvidence {
  id: string
  task_id: string
  user_id: string
  evidence_type: 'image' | 'video' | 'text' | 'file'
  content?: string
  media_url?: string
  ai_feedback?: string
  ai_score?: number
  created_at: string
}

// AI 拆解结构
export interface AIPlan {
  milestones: { title: string; description?: string; target_date: string; weight?: number }[]
  tasks: { title: string; description?: string; estimated_minutes?: number; difficulty?: number; due_date?: string; milestone_title?: string }[]
}

// 目标类型配置
export const GOAL_TYPES = [
  { value: 'academic', label: '📚 学业', color: '#3b82f6' },
  { value: 'skill', label: '🎨 技能', color: '#8b5cf6' },
  { value: 'habit', label: '🎯 习惯', color: '#14b8a6' },
  { value: 'fitness', label: '💪 运动', color: '#ef4444' },
  { value: 'career', label: '💼 职业', color: '#f59e0b' },
  { value: 'reading', label: '📖 阅读', color: '#06b6d4' },
  { value: 'social', label: '🤝 社交', color: '#ec4899' },
  { value: 'creativity', label: '🎭 创作', color: '#f472b6' },
  { value: 'emotional', label: '🧘 心理', color: '#a855f7' },
  { value: 'finance', label: '💰 理财', color: '#84cc16' },
  { value: 'custom', label: '✨ 自定义', color: '#6366f1' },
] as const

// 预设模板：包含完整拆解方案
export const GOAL_TEMPLATES = [
  {
    title: '考研冲刺', type: 'academic', icon: '📚', days: 100,
    milestones: [
      { title: '基础巩固阶段', description: '梳理大纲知识点，建立基础框架', weight: 25 },
      { title: '强化训练阶段', description: '刷真题，总结错题规律', weight: 35 },
      { title: '冲刺模考阶段', description: '全真模拟，查漏补缺', weight: 40 },
    ],
    tasks: [
      { title: '制定各科复习计划', difficulty: 2, phase: 0 },
      { title: '整理核心知识点笔记', difficulty: 3, phase: 0 },
      { title: '完成基础章节练习', difficulty: 3, phase: 0 },
      { title: '刷近5年真题', difficulty: 4, phase: 1 },
      { title: '建立错题本并归纳', difficulty: 3, phase: 1 },
      { title: '薄弱环节专项突破', difficulty: 4, phase: 1 },
      { title: '全真模拟测试 x3', difficulty: 5, phase: 2 },
      { title: '回顾错题和高频考点', difficulty: 3, phase: 2 },
      { title: '调整作息进入考试状态', difficulty: 2, phase: 2 },
    ],
  },
  {
    title: '30天健身', type: 'fitness', icon: '💪', days: 30,
    milestones: [
      { title: '适应期', description: '建立运动习惯，从低强度开始', weight: 20 },
      { title: '提升期', description: '增加训练量和强度', weight: 40 },
      { title: '突破期', description: '挑战个人极限', weight: 40 },
    ],
    tasks: [
      { title: '体能测试记录基准数据', difficulty: 2, phase: 0 },
      { title: '每日30分钟有氧运动', difficulty: 2, phase: 0 },
      { title: '学习正确动作姿势', difficulty: 2, phase: 0 },
      { title: '加入力量训练（每周3次）', difficulty: 3, phase: 1 },
      { title: 'HIIT间歇训练', difficulty: 4, phase: 1 },
      { title: '饮食计划调整', difficulty: 3, phase: 1 },
      { title: '挑战个人最佳记录', difficulty: 5, phase: 2 },
      { title: '完成一次5公里跑', difficulty: 4, phase: 2 },
      { title: '对比前后体能数据', difficulty: 2, phase: 2 },
    ],
  },
  {
    title: '早起打卡', type: 'habit', icon: '🌅', days: 21,
    milestones: [
      { title: '调整期', description: '从晚10分钟闹钟开始', weight: 30 },
      { title: '巩固期', description: '稳定在目标起床时间', weight: 40 },
      { title: '自律期', description: '不用闹钟也能自然醒', weight: 30 },
    ],
    tasks: [
      { title: '设定目标起床时间', difficulty: 1, phase: 0 },
      { title: '晚上10点前放下手机', difficulty: 3, phase: 0 },
      { title: '前3天闹钟提前15分钟', difficulty: 2, phase: 0 },
      { title: '建立早起仪式（喝水/拉伸）', difficulty: 2, phase: 1 },
      { title: '连续7天准时起床', difficulty: 4, phase: 1 },
      { title: '利用早起时间学习30分钟', difficulty: 3, phase: 1 },
      { title: '尝试不设闹钟自然醒', difficulty: 4, phase: 2 },
      { title: '回顾21天睡眠数据', difficulty: 2, phase: 2 },
    ],
  },
  {
    title: 'Python入门', type: 'skill', icon: '🐍', days: 60,
    milestones: [
      { title: '语法入门', description: '掌握基础语法和数据结构', weight: 25 },
      { title: '实战练习', description: '完成小项目积累经验', weight: 40 },
      { title: '进阶应用', description: '学习框架并做完整项目', weight: 35 },
    ],
    tasks: [
      { title: '安装开发环境 + Hello World', difficulty: 1, phase: 0 },
      { title: '学习变量、条件、循环', difficulty: 2, phase: 0 },
      { title: '掌握函数和模块', difficulty: 3, phase: 0 },
      { title: '做一个计算器小程序', difficulty: 3, phase: 1 },
      { title: '爬虫抓取网页数据', difficulty: 4, phase: 1 },
      { title: '学习文件读写和异常处理', difficulty: 3, phase: 1 },
      { title: '学习 Flask/Django 基础', difficulty: 4, phase: 2 },
      { title: '完成个人博客项目', difficulty: 5, phase: 2 },
      { title: '整理学习笔记并分享', difficulty: 2, phase: 2 },
    ],
  },
] as const

// ====== 后端响应形状 ======

/** 后端 GET /api/planner/goals 返回 goal 附带 milestones 数组（契约 §4.3） */
type ApiGoal = Goal & { milestones?: Milestone[] }

/** v2 列表端点兼容「裸数组」与「{key: 数组}」两种包装 */
function unwrapList<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const v = (res as Record<string, unknown>)[key]
    if (Array.isArray(v)) return v as T[]
  }
  return []
}

/** 是否为「v2 端点尚未上线」的 404（路由不存在），区别于业务性 404 */
function isV2Unavailable(e: unknown): boolean {
  return e instanceof ApiError && e.httpStatus === 404
}

// ====== 组合函数 ======

export function usePlanner() {
  const goals = ref<Goal[]>([])
  const loading = ref(false)
  const aiGenerating = ref(false)
  const todayTasks = ref<PlannerTask[]>([])
  const historyGoals = ref<(Goal & { review?: GoalReview })[]>([])

  const activeGoals = computed(() =>
    goals.value.filter(g => g.status === 'active').sort((a, b) =>
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    )
  )

  // ====== 目标 CRUD ======

  async function fetchGoals() {
    if (!getToken()) return
    loading.value = true
    try {
      // 后端仅支持单一 status 过滤，一次取全量后本地过滤 active/paused（属主由 JWT 兜底）
      const data = await apiFetch<{ goals: ApiGoal[] }>('/api/planner/goals')
      goals.value = (data.goals || []).filter(g => g.status === 'active' || g.status === 'paused')
    } catch (e) {
      console.error('加载目标失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function createGoal(title: string, goalType: string, deadline: string, description?: string): Promise<Goal | null> {
    if (!getToken()) return null

    const today = getLocalDate()
    if (deadline <= today) {
      console.error('创建目标失败: 截止日期必须在未来')
      return null
    }

    const validTypes = GOAL_TYPES.map(t => t.value) as string[]
    const safeType = validTypes.includes(goalType) ? goalType : 'custom'

    try {
      const data = await apiFetch<Goal>('/api/planner/goals', {
        body: {
          title: title.slice(0, 200),
          goal_type: safeType,
          deadline,
          description: description?.slice(0, 500),
        },
      })
      goals.value.unshift(data)
      return data
    } catch (e) {
      console.error('创建目标失败:', e)
      return null
    }
  }

  async function updateGoal(goalId: string, updates: Partial<Goal>) {
    try {
      await apiFetch(`/api/planner/goals/${goalId}`, { method: 'PATCH', body: updates })
      const idx = goals.value.findIndex(g => g.id === goalId)
      if (idx >= 0) Object.assign(goals.value[idx], updates)
    } catch (e) {
      console.error('更新目标失败:', e)
    }
  }

  // 归档 → 移入历史
  async function archiveGoal(goalId: string) {
    await updateGoal(goalId, { status: 'archived' })
    goals.value = goals.value.filter(g => g.id !== goalId)
    await fetchTodayTasks() // 刷新今日列表
  }

  // 删除目标（同时清理子任务与关联日程事件；自建后端 goal 删除时任务是 SET NULL，需前端显式级联）
  async function deleteGoal(goalId: string) {
    try {
      // 1. 取该目标下所有任务（后端 tasks 列表无 goal_id 过滤，本地筛）
      const data = await apiFetch<{ tasks: PlannerTask[] }>('/api/planner/tasks')
      const goalTasks = (data.tasks || []).filter(t => t.goal_id === goalId)
      // 2. 逐个删除关联日程事件与任务本身
      for (const t of goalTasks) {
        if (t.schedule_event_id) {
          await apiFetch(`/api/schedule/events/${t.schedule_event_id}`, { method: 'DELETE' }).catch(() => {})
        }
        await apiFetch(`/api/planner/tasks/${t.id}`, { method: 'DELETE' }).catch(() => {})
      }
      // 3. 删除目标（milestones 由后端 ON DELETE CASCADE 清理）
      await apiFetch(`/api/planner/goals/${goalId}`, { method: 'DELETE' })
      // 4. 实时更新本地状态
      goals.value = goals.value.filter(g => g.id !== goalId)
      await fetchTodayTasks()
    } catch (e) {
      console.error('删除目标失败:', e)
    }
  }

  // ====== 历史（已完成+已归档） ======

  /** 拉某个目标的复盘列表（v2 端点；未上线返回 null 表示不可用） */
  async function fetchGoalReviews(goalId: string): Promise<GoalReview[] | null> {
    try {
      const res = await apiFetch<unknown>(`/api/planner/goals/${goalId}/reviews`)
      return unwrapList<GoalReview>(res, 'reviews')
    } catch (e) {
      if (isV2Unavailable(e)) return null
      console.error('加载复盘失败:', e)
      return []
    }
  }

  async function fetchHistory() {
    if (!getToken()) return
    try {
      const data = await apiFetch<{ goals: ApiGoal[] }>('/api/planner/goals')
      const history = (data.goals || [])
        .filter(g => g.status === 'completed' || g.status === 'archived')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 20)

      // 复盘走 v2 端点：先探测第一个，v2 未上线（404）则整批跳过，避免逐条打 404
      const reviewsByGoal = new Map<string, GoalReview | undefined>()
      if (history.length > 0) {
        const first = await fetchGoalReviews(history[0].id)
        if (first !== null) {
          reviewsByGoal.set(history[0].id, first[0])
          const rest = await Promise.all(
            history.slice(1).map(async g => [g.id, ((await fetchGoalReviews(g.id)) || [])[0]] as const)
          )
          for (const [id, review] of rest) reviewsByGoal.set(id, review)
        }
        // first === null → 待 v2 后端：历史目标不带复盘展示
      }

      historyGoals.value = history.map(g => ({ ...g, review: reviewsByGoal.get(g.id) }))
    } catch (e) {
      console.error('加载历史失败:', e)
    }
  }

  // 写评语/复盘（v2 端点：POST /api/planner/goals/:id/reviews）
  async function addReview(goalId: string, rating: number, content: string, improvements?: string) {
    if (!getToken()) return
    try {
      await apiFetch(`/api/planner/goals/${goalId}/reviews`, {
        body: { rating, content, improvements },
      })
      await fetchHistory()
    } catch (e) {
      if (isV2Unavailable(e)) {
        console.warn('添加评语失败：复盘端点待 v2 后端上线')
      } else {
        console.error('添加评语失败:', e)
      }
    }
  }

  // ====== 任务 CRUD（完整版） ======

  async function fetchTasks(goalId: string): Promise<PlannerTask[]> {
    try {
      // 后端 tasks 列表无 goal_id 过滤，取回后本地筛（已按 sort_order 升序）
      const data = await apiFetch<{ tasks: PlannerTask[] }>('/api/planner/tasks')
      return (data.tasks || []).filter(t => t.goal_id === goalId)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  // 今日任务：当日到期 + 目标标题（含独立快捷任务）
  async function fetchTodayTasks() {
    if (!getToken()) return
    const today = getLocalDate()
    try {
      // 后端仅支持单一 status 过滤：pending 与 in_progress 各查一次
      const [pending, inProgress] = await Promise.all([
        apiFetch<{ tasks: PlannerTask[] }>(`/api/planner/tasks?status=pending&due_before=${today}`),
        apiFetch<{ tasks: PlannerTask[] }>(`/api/planner/tasks?status=in_progress&due_before=${today}`),
      ])
      const all = [...(pending.tasks || []), ...(inProgress.tasks || [])]

      // 目标标题映射（goals 已由 fetchGoals 加载；未命中显示「未知目标」，与旧行为一致）
      const titleMap = new Map(goals.value.map(g => [g.id, g.title]))

      const goalTasks = all
        .filter(t => t.goal_id)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 20)
        .map(t => ({ ...t, goalTitle: titleMap.get(t.goal_id!) || '未知目标' }))

      const quickTasks = all
        .filter(t => !t.goal_id)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 20)
        .map(t => ({ ...t, goalTitle: '⚡ 快捷任务' }))

      todayTasks.value = [...quickTasks, ...goalTasks] // 快捷任务排前面
    } catch (e) {
      console.error('加载今日任务失败:', e)
    }
  }

  // 创建快捷独立任务（无需目标）
  async function createQuickTask(title: string, dueDate?: string): Promise<PlannerTask | null> {
    if (!getToken()) return null
    try {
      const data = await apiFetch<PlannerTask>('/api/planner/tasks', {
        body: {
          goal_id: null,  // 无目标
          title,
          due_date: dueDate || getLocalDate(),
          difficulty: 2,
          source: 'manual',
          status: 'pending',
        },
      })
      // 加入今日列表
      todayTasks.value.unshift({ ...data, goalTitle: '快捷任务' })
      return data
    } catch (e) {
      console.error('创建快捷任务失败:', e)
      return null
    }
  }

  // 创建目标下的任务
  async function createTask(goalId: string, task: Partial<PlannerTask>): Promise<PlannerTask | null> {
    if (!getToken()) return null
    try {
      const data = await apiFetch<PlannerTask>('/api/planner/tasks', {
        body: {
          goal_id: goalId,
          title: task.title || '未命名任务',
          description: task.description,
          estimated_minutes: task.estimated_minutes,
          difficulty: task.difficulty || 3,
          due_date: task.due_date,
          source: task.source || 'manual',
          sort_order: task.sort_order || 0,
          status: 'pending',
        },
      })
      return data
    } catch (e) {
      console.error('创建任务失败:', e)
      return null
    }
  }

  // 编辑任务（同步更新关联日程）
  async function editTask(taskId: string, updates: Partial<PlannerTask>) {
    try {
      // 剔除前端扩展字段，其余透传给后端 PATCH
      const { goalTitle: _goalTitle, ...patch } = updates
      void _goalTitle
      await apiFetch(`/api/planner/tasks/${taskId}`, { method: 'PATCH', body: patch })
      // 同步更新关联日程事件
      const task = todayTasks.value.find(t => t.id === taskId)
      if (task?.schedule_event_id) {
        const scheduleUpdates: Record<string, unknown> = {}
        if (updates.title) scheduleUpdates.title = `📋 ${updates.title}`
        if (updates.due_date) {
          const start = new Date(`${updates.due_date}T09:00:00`)
          const end = new Date(start.getTime() + (task.estimated_minutes || 60) * 60000)
          scheduleUpdates.start_time = start.toISOString()
          scheduleUpdates.end_time = end.toISOString()
        }
        if (Object.keys(scheduleUpdates).length > 0) {
          await apiFetch(`/api/schedule/events/${task.schedule_event_id}`, {
            method: 'PATCH', body: scheduleUpdates,
          })
        }
      }
      // 更新本地
      const t = todayTasks.value.find(t => t.id === taskId)
      if (t) Object.assign(t, updates)
    } catch (e) {
      console.error('编辑任务失败:', e)
    }
  }

  // 完成任务（含备注 + 同步更新日程状态）
  async function completeTask(taskId: string, note?: string) {
    const task = todayTasks.value.find(t => t.id === taskId)
    const oldStatus = task?.status

    // 乐观更新
    if (task) { task.status = 'completed'; task.is_completed = true }

    try {
      // completed_at 由后端在 is_completed=true 时写入 now()
      await apiFetch(`/api/planner/tasks/${taskId}`, {
        method: 'PATCH',
        body: {
          is_completed: true,
          status: 'completed',
          completion_note: note || '',
        },
      })
      // 同步更新关联日程事件状态
      if (task?.schedule_event_id) {
        await apiFetch(`/api/schedule/events/${task.schedule_event_id}`, {
          method: 'PATCH', body: { status: 'completed' },
        }).catch(() => {})
      }
      todayTasks.value = todayTasks.value.filter(t => t.id !== taskId)
      await fetchGoals() // 刷新目标进度
    } catch (e) {
      if (task) { task.status = oldStatus || 'pending'; task.is_completed = false }
      console.error('完成任务失败:', e)
    }
  }

  // 取消任务（同时清理关联日程）
  async function cancelTask(taskId: string) {
    try {
      const task = todayTasks.value.find(t => t.id === taskId)
      // 清理关联日程事件
      if (task?.schedule_event_id) {
        await apiFetch(`/api/schedule/events/${task.schedule_event_id}`, { method: 'DELETE' }).catch(() => {})
      }
      // schedule_event_id 传空串 = 后端置 NULL
      await apiFetch(`/api/planner/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: 'cancelled', schedule_event_id: '' },
      })
      todayTasks.value = todayTasks.value.filter(t => t.id !== taskId)
    } catch (e) {
      console.error('取消任务失败:', e)
    }
  }

  // 删除任务（同时清理关联日程）
  async function deleteTask(taskId: string) {
    try {
      const task = todayTasks.value.find(t => t.id === taskId)
      if (task?.schedule_event_id) {
        await apiFetch(`/api/schedule/events/${task.schedule_event_id}`, { method: 'DELETE' }).catch(() => {})
      }
      await apiFetch(`/api/planner/tasks/${taskId}`, { method: 'DELETE' })
      todayTasks.value = todayTasks.value.filter(t => t.id !== taskId)
      await fetchGoals() // 刷新目标进度
    } catch (e) {
      console.error('删除任务失败:', e)
    }
  }

  // ====== 推送到日程 ======

  async function pushTaskToSchedule(task: PlannerTask) {
    if (!getToken() || !task.due_date) return
    try {
      const startTime = new Date(`${task.due_date}T09:00:00`)
      const endTime = new Date(startTime.getTime() + (task.estimated_minutes || 60) * 60000)
      const event = await apiFetch<{ id: string }>('/api/schedule/events', {
        body: {
          title: `📋 ${task.title}`,
          description: task.description || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          event_type: 'task',
          status: 'active',
          priority: task.difficulty >= 4 ? 1 : 0,
        },
      })
      // 写回任务的 schedule_event_id
      await apiFetch(`/api/planner/tasks/${task.id}`, {
        method: 'PATCH', body: { schedule_event_id: event.id },
      })
      // 更新本地
      const t = todayTasks.value.find(t => t.id === task.id)
      if (t) t.schedule_event_id = event.id
    } catch (e) {
      console.error('推送到日程失败:', e)
    }
  }

  // 批量同步任务到日程（创建目标时自动调用）
  async function syncTasksToSchedule(tasks: PlannerTask[]) {
    for (const t of tasks) {
      if (t.due_date && !t.schedule_event_id) {
        await pushTaskToSchedule(t)
      }
    }
  }

  // ====== AI 目标拆解 ======

  async function aiDecomposeGoal(title: string, goalType: string, deadline: string): Promise<AIPlan | null> {
    aiGenerating.value = true
    try {
      const safeTitle = title.replace(/[<>"'`\\]/g, '').slice(0, 200)
      const safeType = goalType.replace(/[<>"'`\\]/g, '').slice(0, 50)
      const daysLeft = Math.max(1, Math.ceil(
        (new Date(deadline).getTime() - Date.now()) / 86400000
      ))
      const prompt = `你是学习与成长规划助手。根据用户目标拆解出可执行的里程碑和具体任务。

输入：
- 目标：${safeTitle}
- 类型：${safeType}
- 截止日期：${deadline}（剩余${daysLeft}天）

输出要求（必须返回 JSON，不要 markdown）：
{
  "milestones": [{ "title": "阶段名", "description": "该阶段要做什么", "target_date": "YYYY-MM-DD", "weight": 30 }],
  "tasks": [{ "title": "具体任务", "description": "详细说明", "estimated_minutes": 60, "difficulty": 3, "due_date": "YYYY-MM-DD", "milestone_title": "关联阶段名" }]
}

约束：
1. 每个阶段的任务必须不同，准备阶段偏调研收集，执行阶段偏实践产出，冲刺阶段偏测试冲刺
2. 任务必须具体可执行，如"刷近5年真题"而非"做练习"
3. 产出 3-5 个里程碑 + 8-15 条任务
4. 每条任务都要有 due_date（均匀分布在截止日前）和 estimated_minutes
5. 所有日期 <= ${deadline}，且 >= 今天 ${getLocalDate()}
6. difficulty 从 1-5，前期任务偏低，后期偏高`

      const text = await plannerDecompose(prompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 未返回有效 JSON')
      const plan = JSON.parse(jsonMatch[0]) as AIPlan
      return normalizePlan(plan, deadline)
    } catch (e) {
      console.warn('AI 拆解失败，使用本地 fallback:', e)
      return localFallbackPlan(title, goalType, deadline)
    } finally {
      aiGenerating.value = false
    }
  }

  function normalizePlan(raw: AIPlan, deadline: string): AIPlan {
    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
    const today = getLocalDate()
    return {
      milestones: (raw.milestones || []).map((m, i) => ({
        title: (m.title || `阶段 ${i + 1}`).slice(0, 200),
        description: (m.description || '').slice(0, 500),
        target_date: isValidDate(m.target_date) && m.target_date >= today ? m.target_date : deadline,
        weight: clamp(Number(m.weight || 1), 1, 100),
      })),
      tasks: (raw.tasks || []).map((t, i) => ({
        title: (t.title || `任务 ${i + 1}`).slice(0, 200),
        description: (t.description || '').slice(0, 500),
        estimated_minutes: clamp(Number(t.estimated_minutes || 45), 10, 240),
        difficulty: clamp(Number(t.difficulty || 3), 1, 5),
        due_date: t.due_date && isValidDate(t.due_date) && t.due_date >= today ? t.due_date : deadline,
        milestone_title: t.milestone_title?.slice(0, 200),
      })),
    }
  }

  // 本地 fallback：每阶段有不同的具体任务
  function localFallbackPlan(title: string, goalType: string, deadline: string): AIPlan {
    const daysLeft = Math.max(7, Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / 86400000
    ))
    const today = new Date()

    // 各类型的3个阶段差异化任务
    const phaseData: Record<string, { phases: string[]; tasks: string[][] }> = {
      academic: {
        phases: ['基础梳理', '强化训练', '冲刺模考'],
        tasks: [
          ['梳理考试大纲和知识点', '整理核心章节笔记', '完成基础例题练习'],
          ['刷近5年真题并计时', '建立错题本归纳规律', '薄弱环节专项突破'],
          ['全真模拟测试', '回顾高频考点', '查漏补缺最终冲刺'],
        ],
      },
      skill: {
        phases: ['入门准备', '实战演练', '进阶输出'],
        tasks: [
          ['搭建学习环境和工具', '学习核心概念和基础', '完成入门教程'],
          ['做一个小型练手项目', '阅读进阶文档和源码', '解决实际问题积累经验'],
          ['完整项目开发', '整理学习笔记', '输出作品或分享总结'],
        ],
      },
      habit: {
        phases: ['习惯建立', '稳定巩固', '自然内化'],
        tasks: [
          ['设定每日目标和提醒', '记录第一周执行情况', '调整适合自己的节奏'],
          ['连续7天不中断', '建立配套仪式感', '记录心得和感受'],
          ['尝试去掉外部提醒', '回顾整体数据', '总结收获和改变'],
        ],
      },
      fitness: {
        phases: ['适应启动', '强化提升', '突破挑战'],
        tasks: [
          ['体能基准测试', '学习正确动作', '每日30分钟低强度运动'],
          ['加入力量训练', '调整饮食计划', 'HIIT间歇训练'],
          ['挑战个人最佳', '完成一次长距离跑', '对比前后数据'],
        ],
      },
      career: {
        phases: ['调研准备', '能力打磨', '实战出击'],
        tasks: [
          ['研究目标岗位要求', '更新简历和作品集', '列出技能差距清单'],
          ['针对性学习补短板', '准备面试常见问题', '做模拟面试'],
          ['投递目标公司', '复盘面试表现', '优化策略再出击'],
        ],
      },
      reading: {
        phases: ['选书计划', '精读实践', '输出总结'],
        tasks: [
          ['确定阅读书单和优先级', '制定每日阅读时间', '准备笔记工具'],
          ['精读核心章节并做标注', '撰写读书笔记', '与他人讨论书中观点'],
          ['完成阅读清单', '写一篇读后感', '分享阅读收获'],
        ],
      },
      social: {
        phases: ['破冰启动', '深度交流', '巩固关系'],
        tasks: [
          ['列出想认识的人或群体', '主动参加一次活动', '练习自我介绍'],
          ['约一次深度聊天', '参与社群讨论', '帮助他人解决问题'],
          ['建立定期联系习惯', '组织一次小活动', '回顾社交收获'],
        ],
      },
      creativity: {
        phases: ['灵感收集', '创作实践', '展示分享'],
        tasks: [
          ['建立灵感素材库', '学习相关创作技巧', '确定创作主题'],
          ['完成初版作品', '征求反馈并迭代', '提升作品细节'],
          ['发布或展示作品', '复盘创作过程', '规划下一个项目'],
        ],
      },
      emotional: {
        phases: ['自我觉察', '调节练习', '内化巩固'],
        tasks: [
          ['记录情绪日记3天', '学习正念冥想基础', '识别情绪触发点'],
          ['每日10分钟冥想', '练习深呼吸放松', '尝试认知重构'],
          ['建立情绪管理工具箱', '回顾情绪变化', '与信任的人分享感悟'],
        ],
      },
      finance: {
        phases: ['记账分析', '计划制定', '执行优化'],
        tasks: [
          ['连续记账7天', '分析消费结构', '确定储蓄目标'],
          ['制定月度预算', '开设专用储蓄账户', '学习基础理财知识'],
          ['复盘月度财务', '调整支出结构', '设定下阶段目标'],
        ],
      },
      custom: {
        phases: ['规划准备', '核心执行', '收尾总结'],
        tasks: [
          ['明确目标和第一步', '收集需要的资料', '制定详细计划'],
          ['按计划推进执行', '记录进展和问题', '寻求反馈和调整'],
          ['完成最终交付', '总结经验', '分享成果'],
        ],
      },
    }

    const data = phaseData[goalType] || phaseData.custom

    // 3 个里程碑，时间均匀分配
    const milestones = data.phases.map((name, i) => {
      const offset = Math.floor(daysLeft / 3 * (i + 1))
      const d = new Date(today.getTime() + offset * 86400000)
      return {
        title: name,
        description: `${title} - ${name}阶段`,
        target_date: d.toISOString().split('T')[0],
        weight: i === 2 ? 40 : 30,
      }
    })

    // 每阶段的任务，due_date 均匀分配
    const tasks: AIPlan['tasks'] = []
    for (let p = 0; p < data.tasks.length; p++) {
      for (let t = 0; t < data.tasks[p].length; t++) {
        const phaseStart = Math.floor(daysLeft / 3 * p)
        const phaseLen = Math.floor(daysLeft / 3)
        const offset = phaseStart + Math.floor(phaseLen / data.tasks[p].length * (t + 1))
        const d = new Date(today.getTime() + offset * 86400000)
        tasks.push({
          title: data.tasks[p][t],
          estimated_minutes: 45 + t * 15,
          difficulty: p + 2,  // 阶段越后难度越高
          due_date: d.toISOString().split('T')[0],
          milestone_title: milestones[p]?.title,
        })
      }
    }

    return { milestones, tasks }
  }

  /** 创建里程碑（v2 端点；未上线返回 null，任务将以 milestone_id=null 落库） */
  async function createMilestone(goalId: string, m: {
    title: string; description?: string; target_date: string; weight?: number; sort_order?: number
  }): Promise<string | null> {
    try {
      const data = await apiFetch<{ id: string }>(`/api/planner/goals/${goalId}/milestones`, { body: m })
      return data.id || null
    } catch (e) {
      if (isV2Unavailable(e)) {
        console.warn('创建里程碑跳过：milestones 端点待 v2 后端上线')
      } else {
        console.error('创建里程碑失败:', e)
      }
      return null
    }
  }

  /** 拉某目标下有 due_date 的任务并批量同步到日程 */
  async function syncGoalTasksToSchedule(goalId: string) {
    try {
      const data = await apiFetch<{ tasks: PlannerTask[] }>('/api/planner/tasks')
      const goalTasks = (data.tasks || []).filter(t => t.goal_id === goalId && t.due_date)
      await syncTasksToSchedule(goalTasks)
    } catch (e) {
      console.error('同步任务到日程失败:', e)
    }
  }

  // 从模板一键创建目标+任务
  async function createFromTemplate(tmpl: typeof GOAL_TEMPLATES[number]): Promise<string | null> {
    if (!getToken()) return null
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + tmpl.days)
    const deadlineStr = deadline.toISOString().split('T')[0]

    const goal = await createGoal(tmpl.title, tmpl.type, deadlineStr)
    if (!goal) return null

    // 生成里程碑日期
    const today = new Date()
    const daysLeft = tmpl.days

    // 插入里程碑（v2 端点，未上线时 milestoneMap 为空）
    const milestoneMap: Record<string, string> = {}
    for (const [i, m] of tmpl.milestones.entries()) {
      const offset = Math.floor(daysLeft / tmpl.milestones.length * (i + 1))
      const d = new Date(today.getTime() + offset * 86400000)
      const id = await createMilestone(goal.id, {
        title: m.title,
        description: m.description,
        target_date: d.toISOString().split('T')[0],
        weight: m.weight,
        sort_order: i,
      })
      if (id) milestoneMap[m.title] = id
    }

    // 插入任务
    for (const [i, t] of tmpl.tasks.entries()) {
      const phaseIdx = t.phase
      const phaseMilestone = tmpl.milestones[phaseIdx]
      const phaseStart = Math.floor(daysLeft / tmpl.milestones.length * phaseIdx)
      const phaseLen = Math.floor(daysLeft / tmpl.milestones.length)
      const tasksInPhase = tmpl.tasks.filter(x => x.phase === phaseIdx)
      const taskIdx = tasksInPhase.indexOf(t)
      const offset = phaseStart + Math.floor(phaseLen / tasksInPhase.length * (taskIdx + 1))
      const d = new Date(today.getTime() + offset * 86400000)

      await apiFetch('/api/planner/tasks', {
        body: {
          goal_id: goal.id,
          milestone_id: phaseMilestone ? milestoneMap[phaseMilestone.title] || null : null,
          title: t.title,
          difficulty: t.difficulty,
          due_date: d.toISOString().split('T')[0],
          source: 'template',
          sort_order: i,
          status: 'pending',
        },
      }).catch(e => console.error('创建模板任务失败:', e))
    }

    // 自动同步所有有 due_date 的任务到日程
    await syncGoalTasksToSchedule(goal.id)

    return goal.id
  }

  // AI 拆解结果写入数据库
  async function savePlanToDB(goalId: string, plan: AIPlan) {
    if (!getToken()) return
    const milestoneMap: Record<string, string> = {}
    for (const [i, m] of plan.milestones.entries()) {
      const id = await createMilestone(goalId, {
        title: m.title, description: m.description,
        target_date: m.target_date, weight: m.weight || 1, sort_order: i,
      })
      if (id) milestoneMap[m.title] = id
    }
    for (const [i, t] of plan.tasks.entries()) {
      await apiFetch('/api/planner/tasks', {
        body: {
          goal_id: goalId,
          milestone_id: t.milestone_title ? milestoneMap[t.milestone_title] || null : null,
          title: t.title, description: t.description,
          estimated_minutes: t.estimated_minutes, difficulty: t.difficulty || 3,
          due_date: t.due_date, source: 'ai', sort_order: i, status: 'pending',
        },
      }).catch(e => console.error('创建 AI 任务失败:', e))
    }
    // 创建后自动批量同步到日程
    await syncGoalTasksToSchedule(goalId)
  }

  // ====== 分享到广场 ======

  async function shareGoalToWall(goal: Goal, reviewContent?: string): Promise<boolean> {
    if (!getToken()) return false
    try {
      const emoji = GOAL_TYPES.find(t => t.value === goal.goal_type)?.label.split(' ')[0] || '🎯'
      const statusText = goal.status === 'completed' ? '完成' : '归档'
      let content = `${emoji} 我${statusText}了目标「${goal.title}」！\n\n📊 完成度：${goal.total_progress.toFixed(0)}%\n⏱️ 用时：${Math.ceil((new Date(goal.updated_at).getTime() - new Date(goal.created_at).getTime()) / 86400000)}天`
      if (reviewContent) content += `\n\n💬 感悟：${reviewContent}`
      content += '\n\n#星火规划 #目标达成'

      // 作者身份由后端从 JWT 取，无需再传 author_id/author_name
      await apiFetch('/api/wall/posts', {
        body: {
          content,
          category: 'share',
          tags: ['星火规划', '目标达成'],
        },
      })
      // 注：旧版会回写 goal_reviews.shared_to_wall=true；契约 §4.3b 暂无复盘更新端点，待 v2 后端补充
      return true
    } catch (e) {
      console.error('分享到广场失败:', e)
      return false
    }
  }

  // ====== AI 任务评审（完成任务后AI给出反馈） ======

  async function aiReviewTask(taskTitle: string, goalTitle?: string): Promise<string> {
    try {
      const context = goalTitle ? `（属于目标「${goalTitle}」）` : ''
      const prompt = `用户刚完成了任务「${taskTitle}」${context}。请给出一句简短的鼓励或建议（20字以内），帮助用户保持动力。只返回纯文本。`
      const text = await plannerReview(prompt)
      return text.trim() || '🎉 做得好，继续加油！'
    } catch {
      const phrases = [
        '🎉 做得好，继续加油！', '⭐ 每一步都是进步！',
        '🔥 今天又近了一步！', '💪 坚持就是胜利！',
        '✨ 优秀！保持节奏！', '🚀 势如破竹！',
      ]
      return phrases[Math.floor(Math.random() * phrases.length)]
    }
  }

  // ====== 任务记录上传 ======

  async function uploadEvidence(
    taskId: string,
    evidenceType: 'image' | 'video' | 'text' | 'file',
    options: { content?: string; file?: File }
  ): Promise<TaskEvidence | null> {
    if (!getToken()) return null
    try {
      let mediaUrl: string | null = null
      // 上传文件到自建后端（POST /api/uploads，返回完整 URL）
      if (options.file) {
        mediaUrl = await apiUpload(options.file)
      }
      // 待后端：契约暂无 task_evidence 端点，记录仅在本地会话内构造（文件本体已持久化到 /uploads）
      const evidence: TaskEvidence = {
        id: (crypto.randomUUID ? crypto.randomUUID() : `ev-${Date.now()}`),
        task_id: taskId,
        user_id: '',
        evidence_type: evidenceType,
        content: options.content || undefined,
        media_url: mediaUrl || undefined,
        created_at: new Date().toISOString(),
      }
      return evidence
    } catch (e) {
      console.error('上传任务记录失败:', e)
      return null
    }
  }

  // AI 评审任务记录（分析图片/文本，给出评分和反馈）
  async function aiReviewEvidence(evidenceId: string, taskTitle: string, content?: string, mediaUrl?: string): Promise<{ feedback: string; score: number }> {
    // 待后端：契约暂无 task_evidence 端点，AI 评分不再回写数据库（evidenceId 保留签名）
    void evidenceId
    try {
      let desc = `任务「${taskTitle}」的完成记录`
      if (content) desc += `：${content}`
      if (mediaUrl) desc += `（附带了图片/视频证据）`

      const prompt = `用户提交了${desc}。请根据以下维度对完成质量进行评分（1-100分）并给出简短反馈（50字以内）：
1. 完成度：是否完整完成了任务
2. 质量：完成质量如何
3. 时效性：是否按时完成

返回JSON格式：{"score": 85, "feedback": "..."}`

      const text = await plannerReview(prompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('无效JSON')
      const parsed = JSON.parse(jsonMatch[0])
      const score = Math.min(100, Math.max(1, Number(parsed.score) || 75))
      const feedback = parsed.feedback || '完成不错，继续保持！'
      return { feedback, score }
    } catch {
      return { feedback: '✅ 记录已提交，继续加油！', score: 80 }
    }
  }

  // 获取任务的所有记录（待后端：契约暂无 task_evidence 端点，返回空列表）
  async function fetchTaskEvidence(taskId: string): Promise<TaskEvidence[]> {
    void taskId
    return []
  }

  // ====== 工具函数 ======

  function daysUntil(deadline: string): number {
    const now = new Date()
    const target = new Date(deadline + 'T23:59:59')
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000))
  }

  function getGoalTypeConfig(type: string) {
    return GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[5]
  }

  function getLocalDate(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function getTomorrowDate(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 6) return '🌙 星辰不负赶路人'
    if (h < 12) return '🌅 早安，今天的征途即将开始'
    if (h < 18) return '⚡ 下午好，保持节奏'
    return '✨ 今晚的成果，明日的基石'
  }

  return {
    goals, loading, aiGenerating, todayTasks, activeGoals, historyGoals,
    fetchGoals, createGoal, updateGoal, archiveGoal, deleteGoal,
    fetchHistory, addReview, shareGoalToWall,
    fetchTasks, fetchTodayTasks, fetchTaskEvidence,
    createQuickTask, createTask, editTask, completeTask, cancelTask, deleteTask,
    pushTaskToSchedule, syncTasksToSchedule,
    uploadEvidence, aiReviewEvidence,
    aiDecomposeGoal, aiReviewTask, savePlanToDB, createFromTemplate,
    daysUntil, getGoalTypeConfig, getGreeting, getLocalDate, getTomorrowDate,
    GOAL_TYPES, GOAL_TEMPLATES,
  }
}
