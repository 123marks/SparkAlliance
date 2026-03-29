import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// ====== 类型定义 ======

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  goal_type: 'academic' | 'skill' | 'habit' | 'fitness' | 'career' | 'custom'
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

// ====== 组合函数 ======

export function usePlanner() {
  const { user } = useAuth()

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
    if (!user.value) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.value.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false })
      if (error) throw error
      goals.value = data || []
    } catch (e) {
      console.error('加载目标失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function createGoal(title: string, goalType: string, deadline: string, description?: string): Promise<Goal | null> {
    if (!user.value) return null
    try {
      const { data, error } = await supabase.from('goals').insert({
        user_id: user.value.id,
        title, goal_type: goalType, deadline, description,
      }).select().single()
      if (error) throw error
      goals.value.unshift(data)
      return data
    } catch (e) {
      console.error('创建目标失败:', e)
      return null
    }
  }

  async function updateGoal(goalId: string, updates: Partial<Goal>) {
    try {
      const { error } = await supabase.from('goals').update(updates).eq('id', goalId)
      if (error) throw error
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

  // 删除目标（级联删除子任务+清理关联日程事件）
  async function deleteGoal(goalId: string) {
    try {
      // 1. 先获取该目标下所有任务的 schedule_event_id
      const { data: tasks } = await supabase
        .from('planner_tasks')
        .select('schedule_event_id')
        .eq('goal_id', goalId)
        .not('schedule_event_id', 'is', null)
      // 2. 批量删除关联的日程事件
      if (tasks && tasks.length > 0) {
        const eventIds = tasks.map(t => t.schedule_event_id).filter(Boolean)
        if (eventIds.length > 0) {
          await supabase.from('schedule_events').delete().in('id', eventIds)
        }
      }
      // 3. 删除目标（子表通过 ON DELETE CASCADE 自动清理）
      const { error } = await supabase.from('goals').delete().eq('id', goalId)
      if (error) throw error
      // 4. 实时更新本地状态
      goals.value = goals.value.filter(g => g.id !== goalId)
      await fetchTodayTasks()
    } catch (e) {
      console.error('删除目标失败:', e)
    }
  }

  // ====== 历史（已完成+已归档） ======

  async function fetchHistory() {
    if (!user.value) return
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*, goal_reviews(*)')
        .eq('user_id', user.value.id)
        .in('status', ['completed', 'archived'])
        .order('updated_at', { ascending: false })
        .limit(20)
      if (error) throw error
      historyGoals.value = (data || []).map((g: any) => ({
        ...g,
        review: g.goal_reviews?.[0] || undefined,
      }))
    } catch (e) {
      console.error('加载历史失败:', e)
    }
  }

  // 写评语/复盘
  async function addReview(goalId: string, rating: number, content: string, improvements?: string) {
    if (!user.value) return
    try {
      const { error } = await supabase.from('goal_reviews').insert({
        goal_id: goalId,
        user_id: user.value.id,
        rating, content, improvements,
      })
      if (error) throw error
      await fetchHistory()
    } catch (e) {
      console.error('添加评语失败:', e)
    }
  }

  // ====== 任务 CRUD（完整版） ======

  async function fetchTasks(goalId: string): Promise<PlannerTask[]> {
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('goal_id', goalId)
      .order('sort_order')
    if (error) { console.error(error); return [] }
    return data || []
  }

  // 今日任务：当日到期 + 目标标题（含独立快捷任务）
  async function fetchTodayTasks() {
    if (!user.value) return
    const today = getLocalDate()
    try {
      // 分两次查询：有目标的任务 + 无目标的独立任务
      const { data: goalTasks, error: e1 } = await supabase
        .from('planner_tasks')
        .select('*, goals!inner(title)')
        .eq('user_id', user.value.id)
        .in('status', ['pending', 'in_progress'])
        .lte('due_date', today)
        .not('goal_id', 'is', null)
        .order('due_date')
        .limit(20)
      if (e1) throw e1

      const { data: quickTasks, error: e2 } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.value.id)
        .in('status', ['pending', 'in_progress'])
        .lte('due_date', today)
        .is('goal_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      if (e2) throw e2

      const mapped1 = (goalTasks || []).map((t: any) => ({
        ...t, goalTitle: t.goals?.title || '未知目标',
      }))
      const mapped2 = (quickTasks || []).map((t: any) => ({
        ...t, goalTitle: '⚡ 快捷任务',
      }))
      todayTasks.value = [...mapped2, ...mapped1] // 快捷任务排前面
    } catch (e) {
      console.error('加载今日任务失败:', e)
    }
  }

  // 创建快捷独立任务（无需目标）
  async function createQuickTask(title: string, dueDate?: string): Promise<PlannerTask | null> {
    if (!user.value) return null
    try {
      const { data, error } = await supabase.from('planner_tasks').insert({
        user_id: user.value.id,
        goal_id: null,  // 无目标
        title,
        due_date: dueDate || getLocalDate(),
        difficulty: 2,
        source: 'manual',
        status: 'pending',
      }).select().single()
      if (error) throw error
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
    if (!user.value) return null
    try {
      const { data, error } = await supabase.from('planner_tasks').insert({
        goal_id: goalId,
        user_id: user.value.id,
        title: task.title || '未命名任务',
        description: task.description,
        estimated_minutes: task.estimated_minutes,
        difficulty: task.difficulty || 3,
        due_date: task.due_date,
        source: task.source || 'manual',
        sort_order: task.sort_order || 0,
        status: 'pending',
      }).select().single()
      if (error) throw error
      return data
    } catch (e) {
      console.error('创建任务失败:', e)
      return null
    }
  }

  // 编辑任务（同步更新关联日程）
  async function editTask(taskId: string, updates: Partial<PlannerTask>) {
    try {
      const { error } = await supabase.from('planner_tasks').update(updates).eq('id', taskId)
      if (error) throw error
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
          await supabase.from('schedule_events').update(scheduleUpdates).eq('id', task.schedule_event_id)
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
      const { error } = await supabase.from('planner_tasks').update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        status: 'completed',
        completion_note: note || null,
      }).eq('id', taskId)
      if (error) throw error
      // 同步更新关联日程事件状态
      if (task?.schedule_event_id) {
        await supabase.from('schedule_events').update({
          status: 'completed',
        }).eq('id', task.schedule_event_id)
      }
      todayTasks.value = todayTasks.value.filter(t => t.id !== taskId)
      await fetchGoals() // 触发器已更新进度
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
        await supabase.from('schedule_events').delete().eq('id', task.schedule_event_id)
      }
      const { error } = await supabase.from('planner_tasks').update({
        status: 'cancelled', schedule_event_id: null,
      }).eq('id', taskId)
      if (error) throw error
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
        await supabase.from('schedule_events').delete().eq('id', task.schedule_event_id)
      }
      const { error } = await supabase.from('planner_tasks').delete().eq('id', taskId)
      if (error) throw error
      todayTasks.value = todayTasks.value.filter(t => t.id !== taskId)
      await fetchGoals() // 刷新目标进度
    } catch (e) {
      console.error('删除任务失败:', e)
    }
  }

  // ====== 推送到日程 ======

  async function pushTaskToSchedule(task: PlannerTask) {
    if (!user.value || !task.due_date) return
    try {
      const startTime = new Date(`${task.due_date}T09:00:00`)
      const endTime = new Date(startTime.getTime() + (task.estimated_minutes || 60) * 60000)
      const { data, error } = await supabase.from('schedule_events').insert({
        user_id: user.value.id,
        title: `📋 ${task.title}`,
        description: task.description || '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: 'task',
        status: 'active',
        priority: task.difficulty >= 4 ? 1 : 0,
      }).select().single()
      if (error) throw error
      await supabase.from('planner_tasks').update({ schedule_event_id: data.id }).eq('id', task.id)
      // 更新本地
      const t = todayTasks.value.find(t => t.id === task.id)
      if (t) t.schedule_event_id = data.id
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
      const daysLeft = Math.max(1, Math.ceil(
        (new Date(deadline).getTime() - Date.now()) / 86400000
      ))
      const prompt = `你是学习与成长规划助手。根据用户目标拆解出可执行的里程碑和具体任务。

输入：
- 目标：${title}
- 类型：${goalType}
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

      const resp = await fetch('/api/mimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'MiMo-7B-RL',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      })
      if (!resp.ok) throw new Error(`AI API ${resp.status}`)
      const result = await resp.json()
      const text = result.choices?.[0]?.message?.content || ''
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

  // 从模板一键创建目标+任务
  async function createFromTemplate(tmpl: typeof GOAL_TEMPLATES[number]): Promise<string | null> {
    if (!user.value) return null
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + tmpl.days)
    const deadlineStr = deadline.toISOString().split('T')[0]

    const goal = await createGoal(tmpl.title, tmpl.type, deadlineStr)
    if (!goal) return null

    // 生成里程碑日期
    const today = new Date()
    const daysLeft = tmpl.days

    // 插入里程碑
    const milestoneMap: Record<string, string> = {}
    for (const [i, m] of tmpl.milestones.entries()) {
      const offset = Math.floor(daysLeft / tmpl.milestones.length * (i + 1))
      const d = new Date(today.getTime() + offset * 86400000)
      const { data } = await supabase.from('goal_milestones').insert({
        goal_id: goal.id,
        user_id: user.value.id,
        title: m.title,
        description: m.description,
        target_date: d.toISOString().split('T')[0],
        weight: m.weight,
        sort_order: i,
      }).select('id').single()
      if (data) milestoneMap[m.title] = data.id
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

      await supabase.from('planner_tasks').insert({
        goal_id: goal.id,
        user_id: user.value.id,
        milestone_id: phaseMilestone ? milestoneMap[phaseMilestone.title] || null : null,
        title: t.title,
        difficulty: t.difficulty,
        due_date: d.toISOString().split('T')[0],
        source: 'template',
        sort_order: i,
        status: 'pending',
      })
    }

    // 自动同步所有有 due_date 的任务到日程
    const { data: allTasks } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('goal_id', goal.id)
      .not('due_date', 'is', null)
    if (allTasks) await syncTasksToSchedule(allTasks as PlannerTask[])

    return goal.id
  }

  // AI 拆解结果写入数据库
  async function savePlanToDB(goalId: string, plan: AIPlan) {
    if (!user.value) return
    const milestoneMap: Record<string, string> = {}
    for (const [i, m] of plan.milestones.entries()) {
      const { data } = await supabase.from('goal_milestones').insert({
        goal_id: goalId, user_id: user.value.id,
        title: m.title, description: m.description,
        target_date: m.target_date, weight: m.weight || 1, sort_order: i,
      }).select('id').single()
      if (data) milestoneMap[m.title] = data.id
    }
    for (const [i, t] of plan.tasks.entries()) {
      await supabase.from('planner_tasks').insert({
        goal_id: goalId, user_id: user.value.id,
        milestone_id: t.milestone_title ? milestoneMap[t.milestone_title] || null : null,
        title: t.title, description: t.description,
        estimated_minutes: t.estimated_minutes, difficulty: t.difficulty || 3,
        due_date: t.due_date, source: 'ai', sort_order: i, status: 'pending',
      })
    }
    // 创建后自动批量同步到日程
    const { data: allTasks } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('goal_id', goalId)
      .not('due_date', 'is', null)
    if (allTasks) await syncTasksToSchedule(allTasks as PlannerTask[])
  }

  // ====== 分享到广场 ======

  async function shareGoalToWall(goal: Goal, reviewContent?: string): Promise<boolean> {
    if (!user.value) return false
    try {
      const emoji = GOAL_TYPES.find(t => t.value === goal.goal_type)?.label.split(' ')[0] || '🎯'
      const statusText = goal.status === 'completed' ? '完成' : '归档'
      let content = `${emoji} 我${statusText}了目标「${goal.title}」！\n\n📊 完成度：${goal.total_progress.toFixed(0)}%\n⏱️ 用时：${Math.ceil((new Date(goal.updated_at).getTime() - new Date(goal.created_at).getTime()) / 86400000)}天`
      if (reviewContent) content += `\n\n💬 感悟：${reviewContent}`
      content += '\n\n#星火规划 #目标达成'

      const authorName = user.value?.user_metadata?.nickname || user.value?.email?.split('@')[0] || '同学'
      const { error } = await supabase.from('posts').insert({
        content,
        author_id: user.value.id,
        author_name: authorName,
        category: 'planner',
        tags: ['星火规划', '目标达成'],
      })
      if (error) throw error
      // 标记已分享
      await supabase.from('goal_reviews').update({ shared_to_wall: true })
        .eq('goal_id', goal.id).eq('user_id', user.value.id)
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
      const prompt = `你是学习助手。用户刚完成了任务「${taskTitle}」${context}。请给出一句简短的鼓励或建议（20字以内），帮助用户保持动力。只返回纯文本。`
      const resp = await fetch('/api/mimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'MiMo-7B-RL',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7, max_tokens: 100,
        }),
      })
      if (!resp.ok) throw new Error('AI 不可用')
      const result = await resp.json()
      return result.choices?.[0]?.message?.content?.trim() || '🎉 做得好，继续加油！'
    } catch {
      // 本地 fallback 鼓励语
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
    if (!user.value) return null
    try {
      let mediaUrl: string | null = null
      // 上传文件到 storage
      if (options.file) {
        const ext = options.file.name.split('.').pop()
        const path = `planner/${user.value.id}/${taskId}/${Date.now()}.${ext}`
        const { data: upload, error: upErr } = await supabase.storage
          .from('campus-wall')
          .upload(path, options.file, { contentType: options.file.type })
        if (upErr) throw upErr
        if (upload) {
          const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
          mediaUrl = urlData.publicUrl
        }
      }
      // 写入 task_evidence 记录
      const { data, error } = await supabase.from('task_evidence').insert({
        task_id: taskId,
        user_id: user.value.id,
        evidence_type: evidenceType,
        content: options.content || null,
        media_url: mediaUrl,
      }).select().single()
      if (error) throw error
      return data as TaskEvidence
    } catch (e) {
      console.error('上传任务记录失败:', e)
      return null
    }
  }

  // AI 评审任务记录（分析图片/文本，给出评分和反馈）
  async function aiReviewEvidence(evidenceId: string, taskTitle: string, content?: string, mediaUrl?: string): Promise<{ feedback: string; score: number }> {
    try {
      let desc = `任务「${taskTitle}」的完成记录`
      if (content) desc += `：${content}`
      if (mediaUrl) desc += `（附带了图片/视频证据）`

      const prompt = `你是学习助手。用户提交了${desc}。请根据以下维度对完成质量进行评分（1-100分）并给出简短反馈（50字以内）：
1. 完成度：是否完整完成了任务
2. 质量：完成质量如何
3. 时效性：是否按时完成

返回JSON格式：{"score": 85, "feedback": "..."}`

      const resp = await fetch('/api/mimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'MiMo-7B-RL',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3, max_tokens: 200,
        }),
      })
      if (!resp.ok) throw new Error('AI 不可用')
      const result = await resp.json()
      const text = result.choices?.[0]?.message?.content || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('无效JSON')
      const parsed = JSON.parse(jsonMatch[0])
      const score = Math.min(100, Math.max(1, Number(parsed.score) || 75))
      const feedback = parsed.feedback || '完成不错，继续保持！'

      // 回写到 task_evidence
      await supabase.from('task_evidence').update({
        ai_feedback: feedback, ai_score: score,
      }).eq('id', evidenceId)

      return { feedback, score }
    } catch {
      const fallback = { feedback: '✅ 记录已提交，继续加油！', score: 80 }
      try {
        await supabase.from('task_evidence').update({
          ai_feedback: fallback.feedback, ai_score: fallback.score,
        }).eq('id', evidenceId)
      } catch { /* 静默失败 */ }
      return fallback
    }
  }

  // 获取任务的所有记录
  async function fetchTaskEvidence(taskId: string): Promise<TaskEvidence[]> {
    const { data, error } = await supabase
      .from('task_evidence')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data || []
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
