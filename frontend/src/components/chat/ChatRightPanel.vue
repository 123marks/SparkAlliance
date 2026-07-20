<template>
  <aside class="chat-right-panel" :class="{ collapsed: collapsed }">
    <button class="rp-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline :points="collapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6'" />
      </svg>
    </button>

    <SparkMascot v-show="!collapsed" />
    <div class="rp-scroll" v-show="!collapsed">
      <!-- 今日状态 -->
      <section class="rp-card rp-status">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> 今日状态</h4>
          <span class="rp-time">更新于 {{ updateTime }}</span>
        </div>
        <div class="rp-energy-ring">
          <svg viewBox="0 0 100 100" class="energy-svg">
            <circle class="ring-bg" cx="50" cy="50" r="40" />
            <circle class="ring-fg" cx="50" cy="50" r="40"
              :stroke-dashoffset="energyOffset"
              :style="{ stroke: energyColor }" />
          </svg>
          <div class="energy-center">
            <strong>{{ energyValue }}%</strong>
            <span>{{ energyValue >= 70 ? '状态良好' : energyValue >= 40 ? '电量偏低' : '需要休息' }}</span>
          </div>
        </div>
        <div class="rp-status-tips">
          <p>{{ energyTip }}</p>
          <div class="rp-status-tags">
            <div class="rp-mood-row" v-if="todayMood">
              <span class="rp-mood-icon">{{ moodMeta?.icon }}</span>
              <span>心情：{{ moodMeta?.label }}</span>
            </div>
            <div class="rp-mood-row" v-else>
              <span class="rp-mood-icon">💚</span>
              <span>心情：{{ energyValue >= 70 ? '精力充沛' : '平静' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 今日节奏 -->
      <section class="rp-card rp-schedule">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 今日节奏</h4>
          <router-link to="/app/schedule" class="rp-link">日程视图</router-link>
        </div>
        <div class="rp-timeline">
          <div v-for="(event, idx) in todayEvents" :key="idx" class="rp-event"
            :class="{ active: event.isNow, upcoming: event.isUpcoming }">
            <span class="rp-event-time">{{ event.timeLabel }}</span>
            <span class="rp-event-title">{{ event.title }}</span>
            <span v-if="event.isNow" class="rp-event-badge rp-badge-now">进行中</span>
            <span v-else-if="event.isUpcoming" class="rp-event-badge rp-badge-upcoming">即将开始</span>
            <span v-else class="rp-event-badge rp-badge-default">{{ event.statusLabel }}</span>
          </div>
          <p v-if="todayEvents.length === 0" class="rp-empty">今天暂无日程安排</p>
        </div>
        <div class="rp-schedule-footer">
          <router-link v-if="todayEvents.length > 0" to="/app/schedule" class="rp-view-all">
            查看完整日程 →
          </router-link>
          <span class="rp-add-event" @click="$emit('send-message', '帮我添加一个今天的日程安排')">+ 添加事项</span>
        </div>
      </section>

      <!-- 记忆胶囊 -->
      <section class="rp-card rp-memory">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/><path d="M12 6v6l4 2"/></svg> 记忆胶囊</h4>
          <span class="rp-link rp-link-btn" @click="refreshMemory">刷新</span>
        </div>
        <div class="rp-memory-list">
          <!-- 固定功能胶囊（参考图：知识点总结 / 错题回顾 / 收藏模块） -->
          <button
            v-for="cap in fixedCapsules"
            :key="cap.label"
            class="rp-mem-item"
            :class="`rp-mem-${cap.tone}`"
            type="button"
            @click="cap.action()"
          >
            <span class="rp-mem-icon">{{ cap.icon }}</span>
            <div class="rp-mem-text">
              <span>{{ cap.label }}</span>
              <span class="rp-mem-time">{{ cap.desc }}</span>
            </div>
            <svg class="rp-mem-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <!-- 真实待办记忆（有数据时追加） -->
          <div v-for="(mem, idx) in memoryCapsules" :key="'m' + idx" class="rp-mem-item rp-mem-task">
            <span class="rp-mem-icon">{{ mem.icon }}</span>
            <div class="rp-mem-text">
              <span>{{ mem.text }}</span>
              <span class="rp-mem-time">{{ mem.time }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 成长进度 -->
      <section class="rp-card rp-growth">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> 成长进度</h4>
        </div>
        <div class="rp-level-row">
          <div class="rp-level-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#fireGrad)"/><defs><linearGradient id="fireGrad" x1="3" y1="2" x2="22" y2="22"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs></svg>
          </div>
          <div class="rp-level-info">
            <div class="rp-level-name">Lv.{{ userLevel }} <span class="rp-level-title">{{ levelTitle }}</span> <span class="rp-level-xp-inline">进度 {{ userXP }} XP</span></div>
            <div class="rp-level-xp">{{ userXP }} / {{ nextLevelXP }} XP</div>
            <div class="rp-xp-bar"><div class="rp-xp-fill" :style="{ width: xpPercent + '%' }"></div></div>
          </div>
        </div>
        <div class="rp-growth-stats">
          <div class="rp-gs-item rp-gs-amber">
            <strong>🔥 {{ streakDays }} 天</strong>
            <span>连续陪伴</span>
          </div>
          <div class="rp-gs-item rp-gs-violet">
            <strong>📅 {{ weeklyActiveDays }} 天</strong>
            <span>本周活跃</span>
          </div>
        </div>
        <div class="rp-badge-row">
          <div class="rp-badge" title="早起达人">
            <svg class="rp-badge-svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="url(#bg1)"/><text x="16" y="20" text-anchor="middle" font-size="14">🌅</text><defs><linearGradient id="bg1"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0.05"/></linearGradient></defs></svg>
            <span>早起</span>
          </div>
          <div class="rp-badge" title="专注达人">
            <svg class="rp-badge-svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="url(#bg2)"/><text x="16" y="20" text-anchor="middle" font-size="14">🎯</text><defs><linearGradient id="bg2"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.15"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.05"/></linearGradient></defs></svg>
            <span>专注</span>
          </div>
          <div class="rp-badge" title="学习任务">
            <svg class="rp-badge-svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="url(#bg3)"/><text x="16" y="20" text-anchor="middle" font-size="14">📚</text><defs><linearGradient id="bg3"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05"/></linearGradient></defs></svg>
            <span>学习</span>
          </div>
          <div class="rp-badge" title="计数大师">
            <svg class="rp-badge-svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="url(#bg4)"/><text x="16" y="20" text-anchor="middle" font-size="14">💬</text><defs><linearGradient id="bg4"><stop offset="0%" stop-color="#10b981" stop-opacity="0.15"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.05"/></linearGradient></defs></svg>
            <span>对话</span>
          </div>
          <router-link to="/app/profile" class="rp-badge rp-badge-more" title="更多成就">
            <span class="rp-badge-plus">+</span>
            <span>更多</span>
          </router-link>
        </div>
      </section>

      <!-- 一键开始 -->
      <section class="rp-card rp-actions">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> 一键开始</h4>
        </div>
        <div class="rp-action-list">
          <button class="rp-action-btn rp-action-focus" @click="startFocus">
            <span class="rp-action-icon">🎯</span>
            <div class="rp-action-text">
              <strong>开始专注</strong>
              <span>{{ focusDuration }} 分钟专注模式</span>
            </div>
          </button>
          <button class="rp-action-btn" @click="createReviewPlan">
            <span class="rp-action-icon">📝</span>
            <div class="rp-action-text">
              <strong>制定复习计划</strong>
              <span>AI 智能规划</span>
            </div>
          </button>
          <button class="rp-action-btn" @click="writeDailySummary">
            <span class="rp-action-icon">📊</span>
            <div class="rp-action-text">
              <strong>写今日总结</strong>
              <span>复盘今天的收获</span>
            </div>
          </button>
        </div>
        <!-- 签到入口 -->
        <button v-if="!isCheckedIn" class="rp-checkin-btn" @click="$emit('checkin')">
          <span>✨</span> 今日签到
        </button>
        <div v-else class="rp-checkin-done">
          <span>✅</span> 已签到 · 连续 {{ streakDays }} 天
        </div>
      </section>

      <!-- 一键开始按钮 -->
      <div class="rp-one-start">
        <button class="one-start-btn" @click="$emit('send-message', '帮我开始今天的学习计划，进入专注模式')">
          <span class="os-icon">🚀</span>
          <span class="os-text">一键开始</span>
          <span class="os-arrow">→</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SparkMascot from './SparkMascot.vue'
import { useCheckin, MOOD_META, type Mood } from '../../composables/useCheckin'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'

const props = withDefaults(defineProps<{
  /** 开发视觉 fixture：使用确定性数据，不请求 Supabase */
  visualFixture?: boolean
}>(), { visualFixture: false })

const emit = defineEmits<{
  (e: 'checkin'): void
  (e: 'send-message', msg: string): void
  (e: 'open-favorites'): void
}>()

const router = useRouter()
const { user } = useAuth()
const {
  isCheckedInToday,
  currentStreak,
  todayRecord,
  fetchCheckinData,
} = useCheckin()

const collapsed = ref(false)
const focusDuration = ref(25)

const isCheckedIn = computed(() => isCheckedInToday.value)
const streakDays = computed(() => currentStreak.value)
const todayMood = computed(() => todayRecord.value?.mood as Mood | undefined)
const moodMeta = computed(() => todayMood.value ? MOOD_META[todayMood.value] : null)

const updateTime = computed(() => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
})

const energyValue = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 92
  if (hour >= 10 && hour < 14) return 78
  if (hour >= 14 && hour < 17) return 65
  if (hour >= 17 && hour < 21) return 45
  return 32
})

const energyOffset = computed(() => {
  const circumference = 2 * Math.PI * 40
  return circumference - (energyValue.value / 100) * circumference
})

const energyColor = computed(() => {
  if (energyValue.value >= 70) return '#10b981'
  if (energyValue.value >= 40) return '#f59e0b'
  return '#ef4444'
})

const energyTip = computed(() => {
  if (energyValue.value >= 70) return '建议充分利用高效时段，专注核心任务'
  if (energyValue.value >= 40) return '建议轻量安排，注意休息，适当补充能量'
  return '状态偏低，建议先休息恢复，避免高强度学习'
})

interface ScheduleEvent {
  timeLabel: string
  title: string
  isNow: boolean
  isUpcoming: boolean
  statusLabel: string
}

const todayEvents = ref<ScheduleEvent[]>([])

interface MemoryCapsule {
  icon: string
  text: string
  time: string
}

const memoryCapsules = ref<MemoryCapsule[]>([])

/** 参考图固定功能胶囊：知识点总结 / 错题回顾 / 收藏模块 */
const fixedCapsules = [
  {
    icon: '📖',
    label: '知识点总结',
    desc: '提取当前会话核心知识',
    tone: 'amber',
    action: () => emit('send-message', '请把当前会话涉及的核心知识点整理成一份结构化总结'),
  },
  {
    icon: '📝',
    label: '错题回顾',
    desc: '进入学习中心复盘',
    tone: 'purple',
    action: () => router.push('/app/learn'),
  },
  {
    icon: '⭐',
    label: '收藏模块',
    desc: '查看收藏的回答',
    tone: 'cyan',
    action: () => emit('open-favorites'),
  },
]

const userLevel = computed(() => {
  const base = streakDays.value * 15 + weeklyActiveDays.value * 50
  return Math.max(1, Math.min(99, Math.floor(base / 100) + 1))
})

const userXP = computed(() => (streakDays.value * 15 + weeklyActiveDays.value * 50) % 2500)
const nextLevelXP = 2500
const xpPercent = computed(() => Math.min(100, Math.round((userXP.value / nextLevelXP) * 100)))

const levelTitle = computed(() => {
  if (userLevel.value >= 50) return '星火传说'
  if (userLevel.value >= 30) return '星火大师'
  if (userLevel.value >= 20) return '星火先锋'
  if (userLevel.value >= 10) return '星火探索者'
  return '星火新星'
})

const weeklyActiveDays = ref(5)

async function loadSchedule() {
  if (!user.value) return
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  try {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('id, title, start_time, end_time, priority')
      .eq('user_id', user.value.id)
      .eq('status', 'active')
      .lt('start_time', todayEnd.toISOString())
      .gte('end_time', todayStart.toISOString())
      .order('start_time', { ascending: true })
      .limit(5)

    if (error) {
      console.warn('[ChatRightPanel] schedule error:', error.message)
      return
    }

    todayEvents.value = (data || []).map((event: { start_time: string; end_time?: string | null; title: string }) => {
      const start = new Date(event.start_time)
      const end = event.end_time ? new Date(event.end_time) : null
      const isNow = now >= start && (!end || now <= end)
      const isUpcoming = !isNow && start > now && start.getTime() - now.getTime() < 3600000
      const startLabel = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
      const endLabel = end ? end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

      return {
        timeLabel: endLabel ? `${startLabel} - ${endLabel}` : `${startLabel} 开始`,
        title: event.title,
        isNow,
        isUpcoming,
        statusLabel: isNow ? '进行中' : isUpcoming ? '即将开始' : '待开始',
      }
    })
  } catch (e) {
    console.warn('[ChatRightPanel] schedule load failed:', e)
  }
}

async function loadMemory() {
  if (!user.value) return
  try {
    const { data } = await supabase
      .from('planner_tasks')
      .select('title, due_date, created_at')
      .eq('user_id', user.value.id)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(4)

    memoryCapsules.value = (data || []).map((task: { title: string; due_date: string | null; created_at: string }) => {
      const created = new Date(task.created_at)
      const daysDiff = Math.floor((Date.now() - created.getTime()) / 86400000)
      return {
        icon: task.due_date && task.due_date < new Date().toISOString().slice(0, 10) ? '⚠️' : '📌',
        text: task.title,
        time: daysDiff === 0 ? '今天' : daysDiff === 1 ? '昨天' : `${daysDiff}天前`,
      }
    })
  } catch (e) {
    console.warn('[ChatRightPanel] memory load failed:', e)
  }
}

function refreshMemory() {
  loadMemory()
}

function startFocus() {
  router.push('/app/learn')
}

function createReviewPlan() {
  emit('send-message', '请帮我制定一份今天的复习计划，根据我当前的日程和任务优先级来安排')
}

function writeDailySummary() {
  emit('send-message', '请帮我写一份今日总结，回顾今天完成的任务和学习收获')
}

/** fixture：参考图 1.png 的今日节奏（10:00 高数课程 / 14:00 算法作业 / 16:30 实验报告截止） */
function loadVisualFixtureData() {
  todayEvents.value = [
    { timeLabel: '10:00 - 11:40', title: '高数课程', isNow: true, isUpcoming: false, statusLabel: '进行中' },
    { timeLabel: '14:00 - 15:30', title: '算法设计作业', isNow: false, isUpcoming: true, statusLabel: '即将开始' },
    { timeLabel: '16:30 截止', title: '实验报告提交', isNow: false, isUpcoming: false, statusLabel: '待开始' },
  ]
  memoryCapsules.value = [
    { icon: '📌', text: '完成《AI 项目提案》并提交评审', time: '今天' },
    { icon: '⚠️', text: '读书计划 · 每日阅读打卡', time: '3天前' },
  ]
  weeklyActiveDays.value = 5
}

onMounted(async () => {
  if (props.visualFixture) {
    loadVisualFixtureData()
    return
  }
  await fetchCheckinData()
  await Promise.all([loadSchedule(), loadMemory()])
})
</script>

<style scoped>
.chat-right-panel {
  width: 320px;
  background: linear-gradient(180deg, rgba(10, 8, 22, 0.95), rgba(6, 4, 16, 0.98));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid rgba(139, 92, 246, 0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.25);
}

.chat-right-panel.collapsed {
  width: 36px;
}

.rp-toggle {
  position: absolute;
  top: 14px;
  left: -15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.08);
  background: rgba(12, 10, 24, 0.96);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  transition: all 0.25s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rp-toggle:hover {
  background: rgba(139, 92, 246, 0.15);
  color: rgba(196, 181, 253, 0.9);
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.15);
}

.rp-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rp-scroll::-webkit-scrollbar { width: 3px; }
.rp-scroll::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.08); border-radius: 3px; }

.rp-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(12, 10, 24, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.rp-card:hover {
  border-color: rgba(139, 92, 246, 0.12);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.rp-status {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(12, 10, 24, 0.5));
  border-color: rgba(16, 185, 129, 0.08);
}

.rp-schedule {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(12, 10, 24, 0.5));
  border-color: rgba(139, 92, 246, 0.08);
}

.rp-memory {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(12, 10, 24, 0.5));
  border-color: rgba(245, 158, 11, 0.06);
}

.rp-growth {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.04), rgba(12, 10, 24, 0.5));
  border-color: rgba(236, 72, 153, 0.06);
}

.rp-actions {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(12, 10, 24, 0.5));
  border-color: rgba(59, 130, 246, 0.06);
}

.rp-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rp-card-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 6px;
}

.rp-h-icon { flex-shrink: 0; }

.rp-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
}

.rp-link {
  font-size: 11px;
  color: rgba(196, 181, 253, 0.5);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s;
}

.rp-link:hover { color: #c4b5fd; }
.rp-link-btn { background: none; border: none; }

/* 今日状态 - 能量环 */
.rp-energy-ring {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto 12px;
}

.energy-svg { width: 100%; height: 100%; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.1)); }

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 7;
}

.ring-fg {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-dasharray: 251.33;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s;
  filter: drop-shadow(0 0 6px currentColor);
}

.energy-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.energy-center strong {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #e0e7ff, #c4b5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.energy-center span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 500;
}

.rp-status-tips {
  text-align: center;
}

.rp-status-tips p {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 6px;
  line-height: 1.5;
}

.rp-mood-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(139, 92, 246, 0.06);
}

.rp-mood-icon { font-size: 14px; }

/* 今日节奏 */
.rp-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rp-event {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.rp-event:hover {
  background: rgba(139, 92, 246, 0.04);
  transform: translateX(2px);
}

.rp-event.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04));
  border-color: rgba(139, 92, 246, 0.18);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
}

.rp-event.upcoming {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(249, 115, 22, 0.03));
  border-color: rgba(245, 158, 11, 0.12);
}

.rp-event-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.rp-event-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rp-event-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.rp-badge-now {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.rp-badge-upcoming {
  background: rgba(245, 158, 11, 0.1);
  color: rgba(245, 158, 11, 0.7);
}

.rp-badge-default {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.2);
}

.rp-schedule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.rp-view-all {
  font-size: 11px;
  color: rgba(196, 181, 253, 0.4);
  text-decoration: none;
  transition: color 0.15s;
}

.rp-view-all:hover { color: #c4b5fd; }

.rp-add-event {
  font-size: 10px;
  color: rgba(139, 92, 246, 0.4);
  cursor: pointer;
  transition: color 0.15s;
}

.rp-add-event:hover { color: rgba(139, 92, 246, 0.7); }

/* 记忆胶囊 */
.rp-memory-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rp-mem-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 11px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

/* 参考图琥珀/紫色系小卡质感 */
.rp-mem-amber {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.09), rgba(249, 115, 22, 0.03));
  border-color: rgba(245, 158, 11, 0.16);
}
.rp-mem-purple {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.09), rgba(99, 102, 241, 0.03));
  border-color: rgba(139, 92, 246, 0.16);
}
.rp-mem-cyan {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(59, 130, 246, 0.03));
  border-color: rgba(6, 182, 212, 0.14);
}
.rp-mem-pink {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(139, 92, 246, 0.03));
  border-color: rgba(236, 72, 153, 0.14);
}

.rp-mem-icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.rp-mem-arrow {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.18);
  transition: transform 0.2s, color 0.2s;
}
.rp-mem-item:hover .rp-mem-arrow {
  color: rgba(255, 255, 255, 0.5);
  transform: translateX(2px);
}

.rp-mem-task {
  cursor: default;
  background: rgba(255, 255, 255, 0.015);
  border-color: rgba(255, 255, 255, 0.04);
}

/* 功能胶囊是按钮：重置原生样式并统一字体 */
button.rp-mem-item {
  width: 100%;
  font: inherit;
  text-align: left;
  color: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
button.rp-mem-item:hover {
  transform: translateX(3px);
  box-shadow: 0 2px 12px rgba(245, 158, 11, 0.08);
}

.rp-mem-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rp-mem-text > span:first-child {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.rp-mem-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.15);
}

/* 成长进度 */
.rp-level-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.rp-level-badge {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6, #f59e0b);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
  position: relative;
  overflow: hidden;
}
.rp-level-badge::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
  animation: rpBadgeShimmer 3s infinite;
}
@keyframes rpBadgeShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

.rp-level-icon { font-size: 18px; }

.rp-level-info { flex: 1; min-width: 0; }

.rp-level-name {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.rp-level-title {
  font-weight: 400;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 4px;
}

.rp-level-xp-inline {
  font-size: 9px;
  font-weight: 500;
  color: rgba(245, 158, 11, 0.5);
  margin-left: 4px;
}

.rp-level-xp {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  margin: 2px 0 6px;
}

.rp-xp-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.rp-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #f59e0b);
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  position: relative;
}
.rp-xp-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 12px;
  height: 100%;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  filter: blur(2px);
}

.rp-growth-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rp-gs-item {
  text-align: center;
  padding: 10px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}
.rp-gs-item:hover { transform: translateY(-2px); }

/* 参考图双统计块：琥珀 / 紫罗兰 */
.rp-gs-amber {
  background: linear-gradient(160deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.03));
  border-color: rgba(245, 158, 11, 0.18);
}
.rp-gs-amber:hover { box-shadow: 0 4px 14px rgba(245, 158, 11, 0.12); }
.rp-gs-violet {
  background: linear-gradient(160deg, rgba(139, 92, 246, 0.12), rgba(99, 102, 241, 0.04));
  border-color: rgba(139, 92, 246, 0.2);
}
.rp-gs-violet:hover { box-shadow: 0 4px 14px rgba(139, 92, 246, 0.14); }

.rp-gs-item strong {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.88);
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
}

.rp-gs-item span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.32);
}

.rp-badge-row {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  justify-content: center;
}

.rp-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: default;
  transition: transform 0.15s;
}

.rp-badge:hover { transform: translateY(-2px); }

.rp-badge-svg { width: 32px; height: 32px; }

.rp-badge span {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.rp-badge-more {
  text-decoration: none;
  cursor: pointer;
}

.rp-badge-plus {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px dashed rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px !important;
  color: rgba(139, 92, 246, 0.3) !important;
  transition: all 0.15s;
}

.rp-badge-more:hover .rp-badge-plus {
  border-color: rgba(139, 92, 246, 0.4);
  color: rgba(139, 92, 246, 0.6) !important;
  background: rgba(139, 92, 246, 0.04);
}

/* 一键开始 */
.rp-action-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.rp-action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.015);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
}

.rp-action-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04));
  border-color: rgba(139, 92, 246, 0.15);
  transform: translateX(3px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
}

.rp-action-focus {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.05));
  border-color: rgba(139, 92, 246, 0.12);
}

.rp-action-icon {
  font-size: 18px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  flex-shrink: 0;
}

.rp-action-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rp-action-text strong {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.rp-action-text span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
}

/* 签到 */
.rp-checkin-btn {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.06));
  color: rgba(196, 181, 253, 0.85);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.rp-checkin-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.12));
  border-color: rgba(139, 92, 246, 0.35);
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.15);
  transform: translateY(-1px);
}

.rp-checkin-done {
  text-align: center;
  font-size: 12px;
  color: rgba(52, 211, 153, 0.6);
  padding: 8px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.08);
}

.rp-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.15);
  text-align: center;
  padding: 12px 0;
  margin: 0;
}

.rp-one-start { padding: 14px; }
.one-start-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  background: linear-gradient(135deg, #7c3aed, #3b82f6); border: none;
  color: white; padding: 16px 24px; border-radius: 16px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all 0.25s; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.35);
  position: relative; overflow: hidden; letter-spacing: 0.5px;
}
.one-start-btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  animation: rpStartShimmer 3s infinite;
}
@keyframes rpStartShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.one-start-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(124, 58, 237, 0.5); }
.one-start-btn:active { transform: scale(0.98); }
.os-icon { font-size: 20px; }
.os-arrow { opacity: 0.7; transition: transform 0.2s; }
.one-start-btn:hover .os-arrow { transform: translateX(6px); opacity: 1; }

/* 中等屏幕先收窄右侧面板，进一步变窄则整块隐藏，避免挤压中间对话区导致重叠 */
@media (max-width: 1500px) {
  .chat-right-panel { width: 280px; }
}
@media (max-width: 1320px) {
  .chat-right-panel { display: none; }
}

/* 能量环呼吸光晕 */
.energy-svg {
  animation: rpRingGlow 3s ease-in-out infinite;
}
@keyframes rpRingGlow {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(139,92,246,0.08)); }
  50% { filter: drop-shadow(0 0 14px rgba(139,92,246,0.2)); }
}

/* 卡片 stagger 入场 */
.rp-card {
  animation: rpCardIn 0.4s ease both;
}
.rp-card:nth-child(1) { animation-delay: 60ms; }
.rp-card:nth-child(2) { animation-delay: 140ms; }
.rp-card:nth-child(3) { animation-delay: 220ms; }
.rp-card:nth-child(4) { animation-delay: 300ms; }
.rp-card:nth-child(5) { animation-delay: 380ms; }
@keyframes rpCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 时间线事件 active 脉冲 */
.rp-event.active {
  animation: rpEventPulse 2.5s ease-in-out infinite;
}
@keyframes rpEventPulse {
  0%,100% { box-shadow: 0 2px 8px rgba(139,92,246,0.08); }
  50% { box-shadow: 0 2px 16px rgba(139,92,246,0.18); }
}

/* 记忆胶囊 hover 左侧线 */
.rp-mem-item {
  position: relative;
  transition: all 0.2s;
}
.rp-mem-item::before {
  content: '';
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 0; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #f59e0b, #f97316);
  transition: height 0.25s cubic-bezier(0.4,0,0.2,1);
}
.rp-mem-item:hover::before { height: 60%; }
.rp-mem-item:hover {
  background: rgba(245,158,11,0.03);
  transform: translateX(3px);
}

/* 成就徽章 hover 缩放弹簧 */
.rp-badge:hover {
  transform: translateY(-3px) scale(1.08);
}
.rp-badge:active {
  transform: scale(0.95);
}

/* 经验条增长扫光 */
.rp-xp-fill::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
  animation: rpXpSweep 2.5s ease infinite;
}
@keyframes rpXpSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* 一键开始按钮 hover 光环 */
.one-start-btn::after {
  content: '';
  position: absolute; inset: -4px; border-radius: 20px;
  border: 1.5px solid rgba(139,92,246,0.2);
  opacity: 0;
  transition: opacity 0.3s;
}
.one-start-btn:hover::after {
  opacity: 1;
  animation: rpStartRing 1.5s ease-out infinite;
}
@keyframes rpStartRing {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.06); opacity: 0; }
}

/* 签到按钮 sparkle 效果 */
.rp-checkin-btn {
  position: relative;
  overflow: hidden;
}
.rp-checkin-btn::before {
  content: '';
  position: absolute; inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
  animation: rpCheckinShimmer 3s infinite;
}
@keyframes rpCheckinShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

@media (prefers-reduced-motion: reduce) {
  .rp-xp-fill { transition: none; }
  .ring-fg { transition: none; }
  .rp-level-badge::before { animation: none; }
  .one-start-btn::before { animation: none; }
  .energy-svg { animation: none; }
  .rp-card { animation: none !important; }
  .rp-event.active { animation: none; }
  .rp-xp-fill::before { animation: none; }
  .rp-checkin-btn::before { animation: none; }
  .one-start-btn::after { animation: none; }
}
</style>
