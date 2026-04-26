<template>
  <div class="app-home">
    <section class="hero">
      <div>
        <h1>{{ greeting }}，{{ userName }} ✦</h1>
        <p class="hero-date">{{ currentDate }}</p>
        <p class="hero-insight">AI 洞察：{{ heroSubtitle }}</p>
      </div>
      <div class="hero-actions">
        <button class="btn ghost" type="button" @click="loadDashboard">🔄 刷新主控台</button>
        <router-link to="/app/schedule?module=planner" class="btn primary">去完成规划 →</router-link>
      </div>
    </section>

    <section class="stats-strip">
      <div v-for="stat in miniStats" :key="stat.label" class="stat-chip">
        <div class="stat-icon" :style="{ color: stat.color }" v-html="stat.svg"></div>
        <div>
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="card command-card">
        <div class="card-head">
          <h3>闭环行动</h3>
          <span>把主控台变成下一步行动入口</span>
        </div>
        <router-link
          v-for="action in dashboardActions"
          :key="action.id"
          :to="action.to"
          class="action-card"
          :class="`tone-${action.emphasis}`"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <div class="action-copy">
            <strong>{{ action.title }}</strong>
            <span>{{ action.description }}</span>
          </div>
          <span class="action-cta">{{ action.cta }}</span>
        </router-link>
      </div>

      <div class="card span-5">
        <div class="card-head">
          <h3>今日日程</h3>
          <router-link to="/app/schedule" class="more-link">管理 →</router-link>
        </div>
        <div class="list">
          <router-link
            v-for="event in todaySchedule"
            :key="event.id"
            :to="`/app/schedule?view=day&date=${getLocalDate()}`"
            class="list-item list-item-link"
          >
            <span class="dot" :class="event.kind"></span>
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.time }}</span>
            </div>
          </router-link>
          <p v-if="todaySchedule.length === 0" class="empty">今天还没有安排，去日程页规划一下吧。</p>
        </div>
      </div>

      <div class="card span-5">
        <div class="card-head">
          <h3>规划推进</h3>
          <router-link to="/app/planner" class="more-link">查看全部 →</router-link>
        </div>
        <div class="list">
          <div v-for="task in todayPlannerTasks" :key="task.id" class="list-item">
            <span class="dot" :class="{ urgent: task.isOverdue }"></span>
            <div>
              <strong>{{ task.title }}</strong>
              <span>{{ task.meta }}</span>
            </div>
          </div>
          <p v-if="todayPlannerTasks.length === 0" class="empty">今天没有待处理任务，适合开始一个新的目标。</p>
        </div>
      </div>

      <div class="card span-4">
        <div class="card-head">
          <h3>购物动态</h3>
          <router-link to="/app/shop" class="more-link">去处理 →</router-link>
        </div>
        <div class="shop-stats">
          <div>
            <strong>{{ dashboardSnapshot.activeListings }}</strong>
            <span>在售商品</span>
          </div>
          <div>
            <strong>{{ dashboardSnapshot.pendingTransactions }}</strong>
            <span>待处理交易</span>
          </div>
          <div>
            <strong>{{ dashboardSnapshot.unreadShopMessages }}</strong>
            <span>未读消息</span>
          </div>
        </div>
        <div class="signal-list">
          <div v-for="signal in shopSignals" :key="signal" class="signal">{{ signal }}</div>
        </div>
      </div>

      <div class="card note-card span-8">
        <div class="card-head">
          <h3>快速笔记</h3>
          <span v-if="noteSaved" class="saved">已保存</span>
        </div>
        <textarea
          v-model="quickNote"
          class="note-textarea"
          rows="5"
          placeholder="把想法先记下来，再决定是否转成今日任务。"
          @input="saveNote"
        ></textarea>
        <div class="note-actions">
          <span>{{ quickNote.length }} 字 · 自动保存到本地</span>
          <div class="note-buttons">
            <button class="btn ghost" type="button" @click="clearNote" :disabled="!quickNote.trim()">清空</button>
            <button class="btn primary" type="button" @click="convertNoteToTask" :disabled="!quickNote.trim() || convertingNote">
              {{ convertingNote ? '转换中...' : '转为今日任务' }}
            </button>
          </div>
        </div>
      </div>

      <div class="card progress-card span-4">
        <div class="card-head">
          <h3>本周执行率</h3>
          <strong class="progress-pct">{{ weeklyProgress.percent }}%</strong>
        </div>
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" class="ring">
            <circle class="ring-bg" cx="60" cy="60" r="50" />
            <circle class="ring-fg" cx="60" cy="60" r="50" :stroke-dashoffset="ringOffset" />
          </svg>
          <div class="ring-label">
            <strong>{{ dashboardSnapshot.streakDays }}</strong>
            <span>连续天数</span>
          </div>
        </div>
        <p class="progress-summary">{{ weeklyProgress.summary }}</p>
      </div>

      <div class="card ai-card span-4">
        <div class="card-head">
          <h3>AI 今日建议</h3>
          <button class="more-link plain-btn" type="button" @click="refreshQuote">换一批</button>
        </div>
        <div class="ai-tips">
          <div class="ai-tip">
            <span class="ai-bullet">•</span>
            <span>建议在 16:00 - 17:30 安排专注学习，效率更高</span>
          </div>
          <div class="ai-tip">
            <span class="ai-bullet">•</span>
            <span>你有 {{ dashboardSnapshot.overdueTasks }} 个任务即将截止，建议优先处理</span>
          </div>
          <div class="ai-tip">
            <span class="ai-bullet">•</span>
            <span>本周专注时长提升明显，继续保持！</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== 第四层：成长 / 徽章 / 灵感 / 热榜 ====== -->
    <section class="grid">
      <div class="card growth-card span-3">
        <div class="card-head">
          <h3>成长进度</h3>
        </div>
        <div class="growth-level">
          <div class="gl-avatar">
            <span class="gl-icon">🔥</span>
          </div>
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
        <p class="gl-hint">再获得 {{ nextLevelXP - userXP }} XP 升级！</p>
      </div>

      <div class="card badge-card span-3">
        <div class="card-head">
          <h3>成就徽章</h3>
          <router-link to="/app/profile" class="more-link">查看全部</router-link>
        </div>
        <div class="badge-grid">
          <div class="badge-item earned">
            <span class="badge-icon">🏆</span>
            <span class="badge-name">高效达人</span>
          </div>
          <div class="badge-item earned">
            <span class="badge-icon">⭐</span>
            <span class="badge-name">学习之星</span>
          </div>
          <div class="badge-item earned">
            <span class="badge-icon">🤝</span>
            <span class="badge-name">交流先锋</span>
          </div>
          <div class="badge-item locked">
            <span class="badge-icon">🌟</span>
            <span class="badge-name">学习之星</span>
          </div>
        </div>
      </div>

      <div class="card quote-card span-3">
        <div class="card-head">
          <h3>每日灵感</h3>
          <button class="more-link plain-btn" type="button" @click="refreshQuote">换一条</button>
        </div>
        <blockquote>{{ currentQuote.text }}</blockquote>
        <cite>— {{ currentQuote.author }}</cite>
      </div>

      <div class="card campus-card span-3">
        <div class="card-head">
          <h3>校园热榜</h3>
          <router-link to="/app/wall" class="more-link">查看全部</router-link>
        </div>
        <div v-if="campusHighlights.length > 0" class="campus-list">
          <div v-for="(post, idx) in campusHighlights.slice(0, 3)" :key="post.id" class="campus-hot-item">
            <span class="hot-rank">{{ idx + 1 }}</span>
            <div class="hot-info">
              <strong>{{ post.preview.slice(0, 20) }}</strong>
              <span>{{ post.heat }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty">暂无热榜</p>
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
.signal,
.campus-item {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 28px 32px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 28%),
    linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.04));
}

.hero-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-bg-card-hover);
  color: var(--color-text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0 0 6px;
  color: var(--color-text-primary);
  font-size: 28px;
}

.hero p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.6;
  max-width: 620px;
}

.hero-actions,
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
  background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
  color: #fff;
}

.btn.ghost {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
}

.stat-chip strong,
.shop-stats strong {
  display: block;
  color: var(--color-text-primary);
  font-size: 20px;
}

.stat-chip span,
.shop-stats span {
  display: block;
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.card {
  grid-column: span 4;
  padding: 20px 22px;
}

.command-card {
  grid-column: span 7;
}

.span-4 {
  grid-column: span 4;
}

.span-5 {
  grid-column: span 5;
}

.span-8 {
  grid-column: span 8;
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
  color: var(--color-text-primary);
  font-size: 16px;
}

.card-head span,
.more-link {
  color: var(--color-text-muted);
  font-size: 12px;
}

.more-link {
  text-decoration: none;
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
  margin-bottom: 12px;
  text-decoration: none;
  transition: 0.2s ease;
}

.action-card:last-child {
  margin-bottom: 0;
}

.action-card.tone-high {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(139, 92, 246, 0.05));
  border-color: rgba(239, 68, 68, 0.14);
}

.action-card.tone-medium {
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.04));
  border-color: rgba(79, 142, 247, 0.12);
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
  padding: 8px 10px;
  margin: -8px -10px;
  transition: background 0.15s;
}
.list-item-link:hover {
  background: var(--color-bg-card-hover);
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
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}

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
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.06), rgba(16, 185, 129, 0.04));
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
  stroke: var(--color-border);
  stroke-width: 8;
}

.ring-fg {
  fill: none;
  stroke: #8b5cf6;
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

.span-3 { grid-column: span 3; }

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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(79, 142, 247, 0.04));
  border-color: rgba(139, 92, 246, 0.1);
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
  grid-template-columns: repeat(4, 1fr);
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
  transform: translateY(-2px);
  background: var(--color-bg-card-hover);
}

.shortcut-icon,
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

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
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .command-card,
  .span-3,
  .span-4,
  .span-5,
  .span-8,
  .card {
    grid-column: span 1;
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
  .shop-stats,
  .grid {
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
