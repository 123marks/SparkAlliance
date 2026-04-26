<template>
  <div class="app-home">
    <section class="hero">
      <!-- 三层星云 -->
      <div class="hero-nebula-core"></div>
      <div class="hero-nebula-mid"></div>
      <div class="hero-nebula-outer"></div>
      <!-- 微粒 -->
      <div class="hero-particles">
        <span v-for="i in 18" :key="'hp'+i" class="h-particle" :style="{ left: `${5 + ((i * 5.3 + 7) % 90)}%`, top: `${8 + ((i * 11.7 + 3) % 80)}%`, animationDelay: `${i * 0.5}s`, animationDuration: `${2.5 + (i % 4) * 0.8}s`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, opacity: `${0.15 + (i % 5) * 0.1}` }"></span>
      </div>
      <!-- 内容 -->
      <div class="hero-left">
        <h1 class="hero-greeting">{{ greeting }}，SparkAlliance ✦</h1>
        <p class="hero-date">{{ currentDate }}</p>
        <p class="hero-insight">AI 洞察：{{ aiInsight }}</p>
      </div>
      <div class="hero-right">
        <button class="btn hero-ghost" type="button" @click="loadDashboard">🔄 刷新主控台</button>
        <router-link to="/app/schedule?module=planner" class="btn hero-primary">去完成规划 →</router-link>
      </div>
    </section>

    <!-- 第二行：统计卡片（6列） -->
    <section class="stats-strip">
      <div v-for="(stat, idx) in miniStats" :key="stat.label" class="stat-chip" :style="{ animationDelay: `${0.1 + idx * 0.05}s` }">
        <div class="stat-icon" :style="{ color: stat.color, background: stat.color + '18' }" v-html="stat.svg"></div>
        <div class="stat-text">
          <strong>{{ stat.value }}<sub v-if="stat.sub" class="stat-unit">{{ stat.sub }}</sub></strong>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-sub-info">{{ statSubInfo[idx] }}</span>
        </div>
      </div>
    </section>

    <!-- 第三行：闭环行动 + 今日日程 + 规划推进（三栏） -->
    <section class="row-3col">
      <div class="card">
        <div class="card-head">
          <h3>今日优先处理</h3>
          <router-link to="/app/schedule?module=planner" class="more-link">查看全部 →</router-link>
        </div>
        <router-link v-for="action in dashboardActions" :key="action.id" :to="action.to" class="action-card" :class="`tone-${action.emphasis}`">
          <span class="action-icon">{{ action.icon }}</span>
          <div class="action-copy">
            <strong>{{ action.title }}</strong>
            <span>{{ action.description }}</span>
          </div>
          <div class="action-right">
            <span class="priority-tag" :class="`p-${action.emphasis}`">{{ action.emphasis === 'high' ? '高优先级' : action.emphasis === 'medium' ? '中优先级' : '低优先级' }}</span>
            <span class="action-cta">去处理</span>
          </div>
        </router-link>
        <p v-if="dashboardActions.length === 0" class="empty">今天暂无紧急事项，专注你最重要的目标吧。</p>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>今日日程</h3>
          <router-link to="/app/schedule" class="more-link">管理日程 →</router-link>
        </div>
        <div class="list">
          <router-link v-for="(event, idx) in todaySchedule" :key="event.id" :to="`/app/schedule?view=day&date=${getLocalDate()}`" class="list-item list-item-link" :style="{ animationDelay: `${0.3 + idx * 0.05}s` }">
            <span class="dot" :class="event.kind"></span>
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.time }}</span>
            </div>
            <span v-if="idx === 0" class="status-tag active">进行中</span>
            <span v-else-if="idx === 1" class="status-tag upcoming">即将</span>
          </router-link>
          <p v-if="todaySchedule.length === 0" class="empty">今天还没有安排，去日程页规划一下吧。</p>
          <router-link v-if="todaySchedule.length > 0" to="/app/schedule" class="card-bottom-link">查看完整日程 →</router-link>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>规划推进</h3>
          <router-link to="/app/schedule?module=planner" class="more-link">查看全部 →</router-link>
        </div>
        <div class="list">
          <div v-for="task in todayPlannerTasks" :key="task.id" class="list-item">
            <span class="dot" :class="{ urgent: task.isOverdue }"></span>
            <div><strong>{{ task.title }}</strong><span>{{ task.meta }}</span></div>
          </div>
          <p v-if="todayPlannerTasks.length === 0" class="empty">今天没有待处理任务，适合开始一个新的目标。</p>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>购物动态</h3>
          <router-link to="/app/shop" class="more-link">去处理 →</router-link>
        </div>
        <div class="shop-stats">
          <div><strong>{{ dashboardSnapshot.activeListings }}</strong><span>在售商品</span></div>
          <div><strong>{{ dashboardSnapshot.pendingTransactions }}</strong><span>待处理交易</span></div>
          <div><strong>{{ dashboardSnapshot.unreadShopMessages }}</strong><span>未读消息</span></div>
        </div>
        <div class="signal-list">
          <div v-for="signal in shopSignals" :key="signal" class="signal">{{ signal }}</div>
        </div>
      </div>
    </section>

    <!-- 第四行：购物动态 + 快速笔记 + 本周执行率 + AI建议（四栏） -->
    <section class="row-4col">
      <div class="card note-card">
        <div class="card-head">
          <h3>快速笔记</h3>
          <span v-if="noteSaved" class="saved">已保存</span>
        </div>
        <textarea v-model="quickNote" class="note-textarea" rows="4" placeholder="随时记录你的想法、灵感与待办..." @input="saveNote"></textarea>
        <div class="note-actions">
          <span>{{ quickNote.length }} 字 · 已自动保存</span>
          <div class="note-buttons">
            <button class="btn ghost" type="button" @click="clearNote" :disabled="!quickNote.trim()">清空</button>
            <button class="btn primary" type="button" @click="convertNoteToTask" :disabled="!quickNote.trim() || convertingNote">{{ convertingNote ? '...' : '转为今日任务' }}</button>
          </div>
        </div>
      </div>
      <div class="card progress-card">
        <div class="card-head">
          <h3>本周执行率</h3>
          <strong class="progress-pct">{{ weeklyProgress.percent }}%</strong>
        </div>
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" class="ring">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b5cf6" />
                <stop offset="100%" stop-color="#3b82f6" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="50" />
            <circle class="ring-fg" cx="60" cy="60" r="50" :stroke-dashoffset="ringOffset" />
          </svg>
          <div class="ring-label">
            <strong>{{ dashboardSnapshot.streakDays }}</strong>
            <span>连续天数</span>
          </div>
        </div>
        <p class="progress-summary">{{ weeklyProgress.summary }}</p>
        <div class="progress-detail">
          <span>已完成 {{ dashboardSnapshot.weeklyCompletedTasks }}</span>
          <span>进行中 {{ dashboardSnapshot.todayTasks }}</span>
          <span v-if="dashboardSnapshot.overdueTasks > 0" class="overdue-tag">逾期 {{ dashboardSnapshot.overdueTasks }}</span>
        </div>
      </div>
      <!-- AI今日建议 -->
      <div class="card ai-card">
        <div class="card-head">
          <h3>AI 今日建议</h3>
          <button class="more-link plain-btn" type="button" @click="refreshQuote">换一批</button>
        </div>
        <div class="ai-tips">
          <div class="ai-tip"><span class="ai-bullet">•</span><span>建议在 16:00 - 17:30 安排专注学习，效率更高</span></div>
          <div class="ai-tip"><span class="ai-bullet">•</span><span>你有 {{ dashboardSnapshot.overdueTasks }} 个任务即将截止，建议优先处理</span></div>
          <div class="ai-tip"><span class="ai-bullet">•</span><span>本周专注时长提升明显，继续保持！</span></div>
        </div>
      </div>
    </section>

    <!-- 第五行：成长 + 徽章 + 灵感 + 热榜（四栏） -->
    <section class="row-4col">
      <!-- 成长进度 -->
      <div class="card growth-card">
        <div class="card-head"><h3>成长进度</h3></div>
        <div class="growth-level">
          <div class="gl-avatar"><span class="gl-icon">🔥</span></div>
          <div class="gl-info">
            <div class="gl-name">Lv.{{ userLevel }} <span class="gl-title">星火探索者</span></div>
            <div class="gl-xp">{{ userXP }} / {{ nextLevelXP }} XP</div>
            <div class="gl-bar"><div class="gl-bar-fill" :style="{ width: xpPercent + '%' }"></div></div>
          </div>
        </div>
        <div class="gl-stats">
          <div><strong>🔥 {{ dashboardSnapshot.streakDays }} 天</strong><span>连续天数</span></div>
          <div><strong>📅 14 天</strong><span>最长连续</span></div>
        </div>
      </div>
      <!-- 成就徽章 -->
      <div class="card badge-card">
        <div class="card-head"><h3>成就徽章</h3><router-link to="/app/profile" class="more-link">查看全部</router-link></div>
        <div class="badge-grid">
          <div class="badge-item earned"><span class="badge-icon">🏆</span><span class="badge-name">高效达人</span></div>
          <div class="badge-item earned"><span class="badge-icon">⭐</span><span class="badge-name">学习之星</span></div>
          <div class="badge-item earned"><span class="badge-icon">🤝</span><span class="badge-name">交流先锋</span></div>
          <div class="badge-item locked"><span class="badge-icon">🌟</span><span class="badge-name">探索之星</span></div>
        </div>
      </div>
      <div class="card quote-card">
        <div class="card-head">
          <h3>每日灵感</h3>
          <button class="more-link plain-btn" type="button" @click="refreshQuote">换一条</button>
        </div>
        <span class="quote-tag">{{ currentQuote.tag }}</span>
        <blockquote>{{ currentQuote.text }}</blockquote>
        <cite>— {{ currentQuote.author }}</cite>
      </div>
      <div class="card campus-card">
        <div class="card-head">
          <h3>校园热榜</h3>
          <router-link to="/app/wall" class="more-link">查看全部 →</router-link>
        </div>
        <div v-if="campusHighlights.length > 0" class="campus-list">
          <div v-for="(post, idx) in campusHighlights.slice(0, 3)" :key="post.id" class="campus-hot-item">
            <span class="hot-rank">{{ idx + 1 }}</span>
            <div class="hot-info"><strong>{{ post.preview.slice(0, 22) }}</strong><span>{{ post.heat }}</span></div>
          </div>
        </div>
        <p v-else class="empty">暂无热榜数据</p>
      </div>
    </section>

    <section class="shortcuts">
      <h2>探索更多</h2>
      <div class="shortcut-grid">
        <router-link v-for="feature in coreFeatures" :key="feature.title" :to="feature.to" class="shortcut-card">
          <div class="shortcut-icon" :style="{ background: feature.bg }" v-html="feature.svg"></div>
          <div>
            <strong>{{ feature.title }}</strong>
            <span>{{ feature.desc }}</span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 底部栏 — 版权/帮助/链接 -->
    <footer class="home-footer">
      <div class="footer-links">
        <router-link to="/app/settings/about">关于我们</router-link>
        <span>·</span>
        <router-link to="/app/feedback">帮助与反馈</router-link>
        <span>·</span>
        <router-link to="/terms">服务条款</router-link>
        <span>·</span>
        <router-link to="/privacy-policy">隐私政策</router-link>
      </div>
      <p class="footer-copy">© 2026 Spark Alliance 星火联盟 · 让每一个火花都能汇聚成照亮前路的星辰</p>
    </footer>

    <Transition name="fade">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { usePlanner } from '../../composables/usePlanner'
import { supabase } from '../../supabase'
import {
  buildDashboardActions,
  buildDashboardStats,
  createCoreFeatures,
  summarizeWeeklyProgress,
  type DashboardSnapshot,
} from '../../utils/appHomeDashboard'
import { buildCampusHotHighlights, type CampusHotHighlight } from '../../utils/campusWall'

interface PlannerPreview {
  id: string
  title: string
  meta: string
  isOverdue: boolean
}

interface PlannerTaskRow {
  id: string
  title: string
  due_date: string | null
  goals?: { title?: string | null } | Array<{ title?: string | null }> | null
}

interface SchedulePreview {
  id: string
  title: string
  time: string
  kind: 'normal' | 'urgent'
}

interface ScheduleEventRow {
  id: string
  title: string
  start_time: string
  end_time?: string | null
  priority?: number | null
}

interface ShopConversationRow {
  buyer_id: string
  seller_id: string
  buyer_unread: number | null
  seller_unread: number | null
}

interface CampusPostRow {
  id: string
  content: string
  author_id: string | null
  author_name: string | null
  anonymous_seed: string | null
  is_anonymous: boolean | null
  created_at: string
  likes?: Array<{ count: number }>
  comments?: Array<{ count: number }>
}

const { user } = useAuth()
const { createQuickTask } = usePlanner()

const emptySnapshot: DashboardSnapshot = {
  overdueTasks: 0,
  todayTasks: 0,
  activeGoals: 0,
  todayEvents: 0,
  streakDays: 0,
  weeklyCompletedTasks: 0,
  weeklyTotalTasks: 0,
  activeListings: 0,
  pendingTransactions: 0,
  unreadShopMessages: 0,
  quickNoteLength: 0,
}

const dashboardSnapshot = ref<DashboardSnapshot>({ ...emptySnapshot })
const todayPlannerTasks = ref<PlannerPreview[]>([])
const todaySchedule = ref<SchedulePreview[]>([])
const campusHighlights = ref<CampusHotHighlight[]>([])
const shopSignals = ref<string[]>(['主控台会自动同步你的交易、规划和日程状态。'])
const quickNote = ref(localStorage.getItem('spark_quick_note') || '')
const noteSaved = ref(false)
const convertingNote = ref(false)
const toastMessage = ref('')
const coreFeatures = createCoreFeatures()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

const currentDate = computed(() => {
  const now = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

const dashboardActions = computed(() =>
  buildDashboardActions({ ...dashboardSnapshot.value, quickNoteLength: quickNote.value.trim().length }),
)
const miniStats = computed(() => buildDashboardStats(dashboardSnapshot.value))
const weeklyProgress = computed(() =>
  summarizeWeeklyProgress(dashboardSnapshot.value.weeklyCompletedTasks, dashboardSnapshot.value.weeklyTotalTasks),
)
const ringOffset = computed(() => {
  const circumference = 2 * Math.PI * 50
  return circumference - (weeklyProgress.value.percent / 100) * circumference
})
const heroSubtitle = computed(() => {
  return dashboardActions.value[0]?.description || '主控台已经接入真实的规划、交易、日程和社区摘要。'
})

const aiInsight = computed(() => {
  const s = dashboardSnapshot.value
  if (s.overdueTasks > 0) return `你有 ${s.overdueTasks} 个任务已逾期，优先清理能直接提升执行闭环。`
  if (s.todayTasks > 3) return `今日待办较多（${s.todayTasks}项），建议先完成最重要的2件事。`
  if (s.streakDays >= 7) return `连续执行${s.streakDays}天，你的节奏很棒，继续保持高效节奏！`
  if (s.weeklyCompletedTasks > 0) return `本周已完成${s.weeklyCompletedTasks}项任务，${s.weeklyTotalTasks > 0 ? '较上周+' + Math.round((s.weeklyCompletedTasks / s.weeklyTotalTasks) * 100) + '%' : '继续加油'}。`
  return '主控台已同步最新状态，开始今天的高效旅程吧。'
})

const quotes = [
  { text: '学而不思则罔，思而不学则殆。', author: '孔子', tag: '专注' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原', tag: '行动' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs', tag: '创造' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', tag: '执行' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游', tag: '实践' },
]
const quoteIndex = ref(Math.floor(Math.random() * quotes.length))
const currentQuote = computed(() => quotes[quoteIndex.value])

const userLevel = computed(() => Math.floor(dashboardSnapshot.value.streakDays * 1.5 + dashboardSnapshot.value.weeklyCompletedTasks * 10) > 0 ? Math.min(99, Math.floor((dashboardSnapshot.value.streakDays * 15 + dashboardSnapshot.value.weeklyCompletedTasks * 50) / 100)) + 1 : 1)
const userXP = computed(() => (dashboardSnapshot.value.streakDays * 15 + dashboardSnapshot.value.weeklyCompletedTasks * 50) % 2000)
const nextLevelXP = 2000
const xpPercent = computed(() => Math.min(100, Math.round((userXP.value / nextLevelXP) * 100)))

const statSubInfo = computed(() => {
  const s = dashboardSnapshot.value
  return [
    `待完成 ${s.todayTasks} 项`,
    `进行中 ${s.activeGoals} 个`,
    `新增 ${Math.max(0, s.activeListings - 10)} 件`,
    `待回复 ${s.unreadShopMessages} 条`,
    `较上周 +2.3h`,
    `再接再厉！`,
  ]
})

let noteTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

function refreshQuote() {
  quoteIndex.value = (quoteIndex.value + Math.floor(Math.random() * (quotes.length - 1)) + 1) % quotes.length
}

function saveNote() {
  localStorage.setItem('spark_quick_note', quickNote.value)
  noteSaved.value = true
  if (noteTimer) clearTimeout(noteTimer)
  noteTimer = setTimeout(() => {
    noteSaved.value = false
  }, 1800)
}

function clearNote() {
  quickNote.value = ''
  localStorage.removeItem('spark_quick_note')
  noteSaved.value = false
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}

async function convertNoteToTask() {
  const content = quickNote.value.trim()
  if (!content || convertingNote.value) return

  convertingNote.value = true
  const task = await createQuickTask(content.slice(0, 100))
  convertingNote.value = false

  if (!task) {
    showToast('笔记转任务失败，请稍后重试。')
    return
  }

  clearNote()
  showToast('已把快速笔记加入今日任务。')
  await loadDashboard()
}

function getLocalDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekStart() {
  const date = new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function extractGoalTitle(goal: PlannerTaskRow['goals']) {
  if (Array.isArray(goal)) return goal[0]?.title || ''
  return goal?.title || ''
}

function formatScheduleTime(startTime: string, endTime?: string | null) {
  const start = new Date(startTime)
  const startLabel = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!endTime) return `${startLabel} 开始`
  const end = new Date(endTime)
  const endLabel = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${startLabel} - ${endLabel}`
}

function buildShopSignals(activeListings: number, pendingTransactions: number, unreadMessages: number) {
  const signals: string[] = []
  if (pendingTransactions > 0) signals.push(`你有 ${pendingTransactions} 笔交易需要确认节奏。`)
  if (unreadMessages > 0) signals.push(`购物模块里还有 ${unreadMessages} 条未读消息。`)
  if (activeListings === 0) signals.push('还没有在售商品，发布第一件闲置会显著提升购物模块活跃度。')
  if (signals.length === 0) signals.push('购物模块状态稳定，可以补一件新商品扩大曝光。')
  return signals
}

async function loadDashboard() {
  if (!user.value) {
    dashboardSnapshot.value = { ...emptySnapshot, quickNoteLength: quickNote.value.trim().length }
    todayPlannerTasks.value = []
    todaySchedule.value = []
    campusHighlights.value = []
    shopSignals.value = ['登录后即可同步你的规划、交易和校园动态。']
    return
  }

  const userId = user.value.id
  const today = getLocalDate()
  const weekStart = getWeekStart()
  const todayRange = getTodayRange()

  try {
    // 独立容错：每个查询失败不影响其他查询
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function safeQuery<T>(queryFn: () => PromiseLike<{ data: any; error: any; count?: number | null }>, fallback: T) {
      try {
        const result = await queryFn()
        if (result.error) {
          console.warn('[Dashboard] 查询降级:', result.error.message)
          return { data: fallback as T, count: 0 }
        }
        return { data: (result.data ?? fallback) as T, count: result.count ?? 0 }
      } catch (e) {
        console.warn('[Dashboard] 查询跳过:', e)
        return { data: fallback as T, count: 0 }
      }
    }

    const [
      plannerTasksResult,
      goalsCountResult,
      weekTasksResult,
      streakResult,
      scheduleResult,
      activeProductsResult,
      transactionResult,
      conversationsResult,
      hotPostsResult,
    ] = await Promise.all([
      safeQuery(() => supabase
        .from('planner_tasks')
        .select('id, title, due_date, goals(title)')
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .lte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(6), [] as PlannerTaskRow[]),
      safeQuery(() => supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['active', 'paused']), null),
      safeQuery(() => supabase
        .from('planner_tasks')
        .select('is_completed')
        .eq('user_id', userId)
        .gte('due_date', weekStart)
        .lte('due_date', today)
        .in('status', ['pending', 'in_progress', 'completed']), [] as Array<{ is_completed?: boolean | null }>),
      safeQuery(() => supabase.from('user_stats').select('current_daily_streak').eq('user_id', userId).maybeSingle(), null),
      safeQuery(() => supabase
        .from('schedule_events')
        .select('id, title, start_time, end_time, priority')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('start_time', todayRange.end)
        .gte('end_time', todayRange.start)
        .order('start_time', { ascending: true })
        .limit(6), [] as ScheduleEventRow[]),
      safeQuery(() => supabase.from('shop_products').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'active'), null),
      safeQuery(() => supabase
        .from('shop_transactions')
        .select('id, status')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in('status', ['pending', 'accepted', 'meeting']), []),
      safeQuery(() => supabase
        .from('shop_conversations')
        .select('buyer_id, seller_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`), [] as ShopConversationRow[]),
      safeQuery(() => supabase
        .from('posts')
        .select('id, content, author_id, author_name, anonymous_seed, is_anonymous, created_at, likes(count), comments(count)')
        .order('created_at', { ascending: false })
        .limit(24), [] as CampusPostRow[]),
    ])

    const plannerTasks = (plannerTasksResult.data || []) as PlannerTaskRow[]
    const overdueTasks = plannerTasks.filter(task => task.due_date && task.due_date < today).length
    const weeklyTasks = (weekTasksResult.data || []) as Array<{ is_completed?: boolean | null }>
    const pendingTransactions = (transactionResult.data || []).length
    const unreadMessages = ((conversationsResult.data || []) as ShopConversationRow[]).reduce((sum, conversation) => {
      if (conversation.buyer_id === userId) return sum + (conversation.buyer_unread || 0)
      if (conversation.seller_id === userId) return sum + (conversation.seller_unread || 0)
      return sum
    }, 0)
    const activeListings = activeProductsResult.count || 0

    dashboardSnapshot.value = {
      overdueTasks,
      todayTasks: plannerTasks.length,
      activeGoals: goalsCountResult.count || 0,
      todayEvents: (scheduleResult.data || []).length,
      streakDays: (streakResult.data as any)?.current_daily_streak || 0,
      weeklyCompletedTasks: weeklyTasks.filter(task => task.is_completed).length,
      weeklyTotalTasks: weeklyTasks.length,
      activeListings,
      pendingTransactions,
      unreadShopMessages: unreadMessages,
      quickNoteLength: quickNote.value.trim().length,
    }

    todayPlannerTasks.value = plannerTasks.map((task) => {
      const dueLabel = task.due_date ? (task.due_date < today ? '已逾期' : '今天到期') : '待安排'
      const goalTitle = extractGoalTitle(task.goals)
      return {
        id: task.id,
        title: task.title,
        meta: goalTitle ? `${goalTitle} · ${dueLabel}` : dueLabel,
        isOverdue: Boolean(task.due_date && task.due_date < today),
      }
    })

    todaySchedule.value = ((scheduleResult.data || []) as ScheduleEventRow[]).map((event) => ({
      id: event.id,
      title: event.title,
      time: formatScheduleTime(event.start_time, event.end_time),
      kind: (event.priority || 0) > 0 ? 'urgent' : 'normal',
    }))

    campusHighlights.value = buildCampusHotHighlights(
      ((hotPostsResult.data || []) as CampusPostRow[])
        .filter(post => Boolean(post.content?.trim()))
        .map(post => ({
          id: post.id,
          content: post.content,
          authorId: post.author_id,
          authorName: post.author_name,
          anonymousSeed: post.anonymous_seed,
          isAnonymous: post.is_anonymous,
          createdAt: post.created_at,
          likes: post.likes?.[0]?.count || 0,
          comments: post.comments?.[0]?.count || 0,
        })),
    )

    shopSignals.value = buildShopSignals(activeListings, pendingTransactions, unreadMessages)
  } catch (error) {
    console.error('loadDashboard failed:', error)
    showToast('主控台刷新失败，请稍后重试。')
  }
}

watch(
  () => user.value?.id,
  () => {
    loadDashboard()
  },
  { immediate: true },
)
</script>

<style scoped>
.app-home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 48px;
}

.hero,
.card,
.stat-chip,
.shortcut-card,
.action-card,
.signal {
  background: rgba(12, 10, 24, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.12);
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 32px 36px;
  margin-bottom: 20px;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 80% 15%, rgba(139,92,246,0.15) 0%, transparent 45%),
    radial-gradient(ellipse at 20% 85%, rgba(59,130,246,0.08) 0%, transparent 40%),
    rgba(12, 10, 24, 0.75);
  border: 1px solid rgba(139,92,246,0.06);
  box-shadow: 0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02);
  min-height: 120px;
}

.hero-nebula-core {
  position: absolute; top: -40%; right: 5%; width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.12) 35%, transparent 65%);
  filter: blur(30px); pointer-events: none;
  animation: nebulaCore 10s ease-in-out infinite alternate;
}
.hero-nebula-mid {
  position: absolute; top: -60%; right: -5%; width: 350px; height: 350px;
  background: radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%);
  filter: blur(45px); pointer-events: none;
  animation: nebulaMid 14s ease-in-out infinite alternate;
}
.hero-nebula-outer {
  position: absolute; top: -30%; right: -15%; width: 500px; height: 500px;
  background: radial-gradient(ellipse at 40% 40%, rgba(139,92,246,0.03) 0%, transparent 60%);
  filter: blur(60px); pointer-events: none;
}

@keyframes nebulaCore { from { transform: translate(0,0) scale(1); opacity: 0.7 } to { transform: translate(-8px,8px) scale(1.05); opacity: 1 } }
@keyframes nebulaMid { from { transform: translate(0,0) scale(1); opacity: 0.5 } to { transform: translate(-15px,10px) scale(1.08); opacity: 0.8 } }

.hero-particles { position: absolute; inset: 0; pointer-events: none; }
.h-particle { position: absolute; border-radius: 50%; background: white; animation: hpTwinkle ease-in-out infinite; }
@keyframes hpTwinkle { 0%,100% { opacity: 0.1; transform: scale(0.7) } 50% { opacity: 0.6; transform: scale(1.3) } }

.hero-left { position: relative; z-index: 1; flex: 1; }
.hero-greeting { margin: 0 0 6px; color: rgba(255,255,255,0.95); font-size: 28px; font-weight: 800; letter-spacing: 1.5px; line-height: 1.3; }
.hero-date { color: rgba(255,255,255,0.3); font-size: 13px; margin: 0 0 6px; }
.hero-insight { color: rgba(139,92,246,0.55); font-size: 13px; margin: 0; line-height: 1.6; max-width: 520px; }

.hero-right { position: relative; z-index: 1; display: flex; gap: 10px; flex-shrink: 0; }
.btn.hero-ghost { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.08); height: 40px; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn.hero-ghost:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
.btn.hero-primary { background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; height: 40px; padding: 0 20px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 2px 16px rgba(139,92,246,0.25); transition: all 0.2s; }
.btn.hero-primary:hover { box-shadow: 0 4px 24px rgba(139,92,246,0.4); transform: translateY(-1px); }

.note-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.btn.primary {
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff;
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.2);
}

.btn.primary:hover {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.35);
}

.btn.ghost {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.08);
}

.btn.ghost:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-unit {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.4);
  margin-left: 2px;
  vertical-align: baseline;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 18px;
  border-radius: 16px;
  min-height: 76px;
}

.stat-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(139,92,246,0.12);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.stat-chip strong {
  display: block;
  color: rgba(255,255,255,0.95);
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.shop-stats strong {
  display: block;
  color: rgba(255,255,255,0.95);
  font-size: 22px;
  font-weight: 800;
}

.stat-chip span {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,0.3);
  font-size: 11px;
}

.shop-stats span {
  display: block;
  margin-top: 2px;
  color: rgba(255,255,255,0.3);
  font-size: 11px;
}

.row-3col {
  display: grid;
  grid-template-columns: 5fr 4fr 3fr;
  gap: 16px;
  margin-bottom: 16px;
}

.row-4col {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  padding: 20px 22px;
  border-radius: 18px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-head h3 {
  margin: 0;
  color: rgba(255,255,255,0.9);
  font-size: 15px;
  font-weight: 700;
}

.card-head span,
.more-link {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
}

.more-link {
  text-decoration: none;
  color: rgba(196,181,253,0.6);
  transition: color 0.2s;
}

.more-link:hover {
  color: #c4b5fd;
}

.plain-btn {
  background: none;
  border: none;
  cursor: pointer;
}

.action-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 10px;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 14px;
}

.action-card:last-child {
  margin-bottom: 0;
}

.action-card:hover {
  transform: translateX(3px);
}

.action-card.tone-high {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(139, 92, 246, 0.03));
  border: 1px solid rgba(239, 68, 68, 0.12);
}

.action-card.tone-high:hover {
  border-color: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.06);
}

.action-card.tone-medium {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(139, 92, 246, 0.03));
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.action-card.tone-medium:hover {
  border-color: rgba(59, 130, 246, 0.18);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.05);
}

.action-card.tone-low {
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.04);
}

.action-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card-hover);
  font-size: 18px;
}

.action-copy strong,
.list-item strong,
.shortcut-card strong,
.campus-meta strong {
  display: block;
  color: var(--color-text-primary);
  font-size: 14px;
}

.action-copy span,
.list-item span,
.signal,
.progress-summary,
.empty,
.note-actions > span,
.shortcut-card span,
.quote-card cite,
.campus-meta span,
.campus-item p {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.action-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.priority-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.priority-tag.p-high {
  background: rgba(239,68,68,0.1);
  color: #f87171;
}

.priority-tag.p-medium {
  background: rgba(59,130,246,0.08);
  color: rgba(96,165,250,0.8);
}

.priority-tag.p-low {
  background: rgba(245,158,11,0.06);
  color: rgba(245,158,11,0.5);
}

.action-cta {
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.list-item-link {
  text-decoration: none;
  border-radius: 10px;
  padding: 10px 12px;
  margin: -4px -6px;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.list-item-link:hover {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.04);
}

.dot {
  width: 9px;
  height: 9px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--color-text-muted);
  flex-shrink: 0;
}

.dot.normal {
  background: #60a5fa;
}

.dot.urgent {
  background: #f87171;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
}

.shop-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.shop-stats > div {
  padding: 14px 12px;
  border-radius: 14px;
  text-align: center;
  background: rgba(12,10,24,0.5);
  border: 1px solid rgba(255,255,255,0.04);
  position: relative;
}

.shop-stats > div:nth-child(1) strong { color: #8b5cf6; }
.shop-stats > div:nth-child(2) strong { color: #10b981; }
.shop-stats > div:nth-child(3) strong { color: #f87171; }

.signal-list,
.campus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signal {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(249, 115, 22, 0.07);
  border-color: rgba(249, 115, 22, 0.1);
}

.note-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(16, 185, 129, 0.03)), rgba(12, 10, 24, 0.65);
}

.saved {
  color: #34d399 !important;
  font-weight: 600;
}

.note-textarea {
  width: 100%;
  resize: none;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  outline: none;
}

.note-textarea::placeholder {
  color: var(--color-text-muted);
}

.note-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.progress-card {
  text-align: center;
}

.progress-pct {
  color: #c4b5fd;
}

.progress-detail {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}

.overdue-tag {
  color: rgba(248,113,113,0.6);
}

.ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 10px auto 16px;
}

.ring {
  width: 100%;
  height: 100%;
}

.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,0.06);
  stroke-width: 8;
}

.ring-fg {
  fill: none;
  stroke: url(#ringGradient);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 314.16;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.8s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-label strong {
  font-size: 26px;
  color: var(--color-text-primary);
}

.ring-label span {
  font-size: 11px;
  color: var(--color-text-muted);
}

.hero-date { color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0; }
.hero-insight { color: rgba(139,92,246,0.6); font-size: 13px; margin: 6px 0 0; }

.card-sub { font-size: 12px; color: var(--color-text-muted); }

.status-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.status-tag.active {
  background: rgba(16,185,129,0.1);
  color: #34d399;
}

.status-tag.upcoming {
  background: rgba(245,158,11,0.08);
  color: rgba(245,158,11,0.6);
}

.card-bottom-link {
  display: block;
  text-align: center;
  padding: 8px 0 0;
  margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 12px;
  color: rgba(196,181,253,0.5);
  text-decoration: none;
  transition: color 0.2s;
}

.card-bottom-link:hover { color: #c4b5fd; }

/* AI 今日建议 */
.ai-card {
  background: linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04));
  border-color: rgba(59,130,246,0.08);
}
.ai-tips { display: flex; flex-direction: column; gap: 10px; }
.ai-tip { display: flex; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }
.ai-bullet { color: #3b82f6; font-weight: bold; flex-shrink: 0; }

/* 成长进度 */
.growth-card { background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.04)); }
.growth-level { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.gl-avatar { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #8b5cf6, #f59e0b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gl-icon { font-size: 22px; }
.gl-info { flex: 1; min-width: 0; }
.gl-name { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.gl-title { font-weight: 400; color: var(--color-text-muted); font-size: 12px; margin-left: 4px; }
.gl-xp { font-size: 11px; color: var(--color-text-muted); margin: 2px 0 6px; }
.gl-bar { height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
.gl-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #f59e0b); border-radius: 3px; transition: width 0.6s ease; }
.gl-stats { display: flex; gap: 16px; margin-bottom: 8px; }
.gl-stats > div { display: flex; flex-direction: column; }
.gl-stats strong { font-size: 13px; color: var(--color-text-primary); }
.gl-stats span { font-size: 10px; color: var(--color-text-muted); }
.gl-hint { font-size: 11px; color: rgba(245,158,11,0.5); margin: 0; }

/* 成就徽章 */
.badge-card { background: linear-gradient(135deg, rgba(236,72,153,0.05), rgba(139,92,246,0.04)); }
.badge-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.badge-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border-radius: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); transition: transform 0.2s; }
.badge-item.earned { border-color: rgba(245,197,94,0.15); }
.badge-item.locked { opacity: 0.35; }
.badge-item:hover { transform: translateY(-2px); }
.badge-icon { font-size: 24px; }
.badge-name { font-size: 10px; color: var(--color-text-muted); }

.quote-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(79, 142, 247, 0.03)), rgba(12, 10, 24, 0.65);
  border-color: rgba(139, 92, 246, 0.1);
}

.quote-tag {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.12);
  color: #ddd6fe;
  font-size: 11px;
  font-weight: 600;
}

.quote-card blockquote {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  font-size: 14px;
  font-style: italic;
}

.quote-card cite {
  display: block;
  margin-top: 14px;
  color: var(--color-text-muted);
  font-size: 12px;
}

/* 校园热榜 */
.campus-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(244, 63, 94, 0.04));
}

.campus-hot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}
.campus-hot-item:last-child { border-bottom: none; }

.hot-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--color-bg-card-hover);
  color: var(--color-text-muted);
}
.campus-hot-item:first-child .hot-rank { background: rgba(239,68,68,0.12); color: #f87171; }
.campus-hot-item:nth-child(2) .hot-rank { background: rgba(245,158,11,0.1); color: #f59e0b; }

.hot-info { flex: 1; min-width: 0; }
.hot-info strong { display: block; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-info span { font-size: 11px; color: var(--color-text-muted); }

.shortcuts h2 {
  margin: 0 0 20px;
  color: var(--color-text-primary);
  font-size: 18px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.shortcut-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  text-decoration: none;
  transition: 0.2s ease;
}

.shortcut-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139,92,246,0.12);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.shortcut-card:hover .shortcut-icon {
  transform: scale(1.08);
  transition: transform 0.2s;
}

.shortcut-icon,
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.08);
}

.stat-text { min-width: 0; }
.stat-label { display: block; margin-top: 3px; color: rgba(255,255,255,0.3); font-size: 11px; }
.stat-sub-info { display: block; margin-top: 1px; color: rgba(255,255,255,0.15); font-size: 10px; }

.shortcut-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex-shrink: 0;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  padding: 12px 16px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-elevated);
  z-index: 20;
}

/* ====== 入场动画 ====== */
.hero { animation: cardEnter 0.5s ease backwards; }
.stats-strip .stat-chip:nth-child(1) { animation: cardEnter 0.4s ease 0.1s backwards; }
.stats-strip .stat-chip:nth-child(2) { animation: cardEnter 0.4s ease 0.15s backwards; }
.stats-strip .stat-chip:nth-child(3) { animation: cardEnter 0.4s ease 0.2s backwards; }
.stats-strip .stat-chip:nth-child(4) { animation: cardEnter 0.4s ease 0.25s backwards; }
.row-3col .card, .row-4col .card { animation: cardEnter 0.4s ease 0.3s backwards; }

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 列表项入场 */
.list-item, .action-card, .campus-hot-item, .signal {
  animation: itemEnter 0.3s ease backwards;
}

@keyframes itemEnter {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 1024px) {
  .row-3col {
    grid-template-columns: 1fr;
  }

  .row-4col {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcut-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .stats-strip {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .app-home {
    padding: 20px 16px 40px;
  }

  .hero,
  .hero-actions,
  .note-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-strip {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcut-grid,
  .shop-stats {
    grid-template-columns: 1fr;
  }

  .row-3col, .row-4col {
    grid-template-columns: 1fr;
  }

  .action-card {
    grid-template-columns: auto 1fr;
  }

  .action-cta {
    grid-column: 2;
  }

  .campus-meta {
    flex-direction: column;
    gap: 4px;
  }
}

/* ====== 底部栏 ====== */
.home-footer {
  margin-top: 48px;
  padding: 28px 0 16px;
  border-top: 1px solid var(--color-border);
  text-align: center;
}
.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.footer-links a {
  font-size: 12px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.footer-links a:hover { color: var(--theme-color, #4f8ef7); }
.footer-links span { color: var(--color-text-muted); font-size: 11px; }
.footer-copy {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0;
  opacity: 0.6;
}
</style>
