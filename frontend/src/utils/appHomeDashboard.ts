export interface DashboardSnapshot {
  overdueTasks: number
  todayTasks: number
  activeGoals: number
  todayEvents: number
  streakDays: number
  weeklyCompletedTasks: number
  weeklyTotalTasks: number
  activeListings: number
  pendingTransactions: number
  unreadShopMessages: number
  quickNoteLength: number
}

export interface DashboardFeature {
  title: string
  desc: string
  to: string
  active: boolean
  bg: string
  svg: string
}

export interface DashboardAction {
  id: string
  title: string
  description: string
  to: string
  cta: string
  emphasis: 'high' | 'medium' | 'low'
  icon: string
}

export interface DashboardStat {
  value: string
  label: string
  color: string
  svg: string
}

const ICONS = {
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 3.7 2.3 6.9 5.5 8.2L7 22l3.5-1.5A9 9 0 1 0 12 2z"></path></svg>',
  wall: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  schedule: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>',
  messages: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  shop: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
  planner: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  study: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
  resources: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  talent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  news: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><path d="M21 12h-6a2 2 0 0 0-2 2v6"></path><path d="M21 12l-6 6"></path><path d="M21 12v6"></path></svg>',
  cocreate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
}

export function createCoreFeatures(): DashboardFeature[] {
  return [
    { title: 'AI 助手', desc: '多模型智能对话', to: '/app/chat', active: true, bg: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', svg: ICONS.chat },
    { title: '星火墙', desc: '分享校园日常', to: '/app/wall', active: true, bg: 'linear-gradient(135deg, #8b5cf6, #f43f5e)', svg: ICONS.wall },
    { title: '智能日程', desc: '管理你的时间', to: '/app/schedule', active: true, bg: 'linear-gradient(135deg, #10b981, #06b6d4)', svg: ICONS.schedule },
    { title: '星火寄语', desc: '跨代际寄语平台', to: '/app/messages', active: true, bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', svg: ICONS.messages },
    { title: '星火购物', desc: '二手交易平台', to: '/app/shop', active: true, bg: 'linear-gradient(135deg, #f97316, #fb7185)', svg: ICONS.shop },
    { title: '星火规划', desc: 'AI目标拆分与激励', to: '/app/planner', active: true, bg: 'linear-gradient(135deg, #f59e0b, #8b5cf6)', svg: ICONS.planner },
    { title: '星火自习室', desc: '专注互助空间', to: '/app/study-room', active: true, bg: 'linear-gradient(135deg, #10b981, #06b6d4)', svg: ICONS.study },
    { title: '学习资源', desc: '优质资料共享', to: '/app/resources', active: true, bg: 'linear-gradient(135deg, #f97316, #ef4444)', svg: ICONS.resources },
    { title: '星火人才', desc: '双向寻访匹配', to: '/app/talent', active: true, bg: 'linear-gradient(135deg, #f43f5e, #8b5cf6)', svg: ICONS.talent },
    { title: '星火资讯', desc: '全网热点聚合', to: '/app/news', active: true, bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', svg: ICONS.news },
    { title: '星火共创', desc: '项目展示与协作', to: '/app/cocreate', active: true, bg: 'linear-gradient(135deg, #8b5cf6, #f97316)', svg: ICONS.cocreate },
  ]
}

export function buildDashboardActions(snapshot: DashboardSnapshot): DashboardAction[] {
  const actions: DashboardAction[] = []

  if (snapshot.overdueTasks > 0) {
    actions.push({
      id: 'planner-overdue',
      title: `先处理 ${snapshot.overdueTasks} 项逾期任务`,
      description: '这些任务已经过期，优先清理能直接提升执行闭环。',
      to: '/app/planner',
      cta: '去规划页',
      emphasis: 'high',
      icon: '🔥',
    })
  }

  if (snapshot.pendingTransactions > 0) {
    actions.push({
      id: 'shop-pending',
      title: `处理 ${snapshot.pendingTransactions} 笔待推进交易`,
      description: '及时确认交易和见面信息，避免流失成交。',
      to: '/app/shop',
      cta: '去处理交易',
      emphasis: snapshot.pendingTransactions > 2 ? 'high' : 'medium',
      icon: '🛒',
    })
  }

  if (snapshot.todayTasks > 0) {
    actions.push({
      id: 'planner-today',
      title: `完成今日 ${snapshot.todayTasks} 项规划任务`,
      description: '把今天要做的事情收口，主控台才能真正有节奏感。',
      to: '/app/planner',
      cta: '查看今日任务',
      emphasis: 'medium',
      icon: '🎯',
    })
  }

  if (snapshot.quickNoteLength > 0) {
    actions.push({
      id: 'note-to-task',
      title: '把快速笔记转成今日任务',
      description: '别让灵感停在草稿里，直接推进到规划执行层。',
      to: '/app/planner',
      cta: '一键转任务',
      emphasis: 'medium',
      icon: '📝',
    })
  }

  if (snapshot.activeGoals === 0) {
    actions.push({
      id: 'create-goal',
      title: '创建第一个成长目标',
      description: '没有目标时，主控台很难形成复访理由。',
      to: '/app/planner',
      cta: '立即创建',
      emphasis: 'low',
      icon: '🌱',
    })
  }

  if (snapshot.activeListings === 0) {
    actions.push({
      id: 'publish-listing',
      title: '发布一件闲置，激活购物模块',
      description: '有在售商品后，消息、交易和信用体系才会运转起来。',
      to: '/app/shop',
      cta: '去发布',
      emphasis: 'low',
      icon: '📦',
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: 'default-ai',
      title: '今天状态不错，去 AI 助手继续推进',
      description: '没有堆积任务时，把主控台变成下一步行动的跳板。',
      to: '/app/chat',
      cta: '打开 AI',
      emphasis: 'low',
      icon: '🤖',
    })
  }

  return actions.slice(0, 4)
}

export function buildDashboardStats(snapshot: DashboardSnapshot): DashboardStat[] {
  return [
    {
      value: String(snapshot.todayTasks),
      label: '今日任务',
      color: '#8b5cf6',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
    },
    {
      value: String(snapshot.activeGoals),
      label: '活跃目标',
      color: '#f59e0b',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    },
    {
      value: String(snapshot.activeListings),
      label: '在售商品',
      color: '#f97316',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
    },
    {
      value: String(snapshot.pendingTransactions),
      label: '待处理交流',
      color: '#10b981',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"></path><path d="M8 21H3v-5"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>',
    },
    {
      value: '12.4',
      label: '本周专注时长',
      sub: 'h',
      color: '#3b82f6',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    },
    {
      value: String(snapshot.streakDays),
      label: '连续执行天数',
      color: '#ec4899',
      svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>',
    },
  ]
}

export function summarizeWeeklyProgress(completed: number, total: number) {
  if (total <= 0) {
    return {
      percent: 0,
      summary: '本周还没有任务，先定一个小目标',
    }
  }

  return {
    percent: Math.round((completed / total) * 100),
    summary: `本周已完成 ${completed} / ${total} 项任务`,
  }
}
