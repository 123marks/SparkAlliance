<template>
  <aside class="chat-right-panel" :class="{ collapsed: collapsed }">
    <button class="rp-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline :points="collapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6'" />
      </svg>
    </button>

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
          <div v-for="(mem, idx) in memoryCapsules" :key="idx" class="rp-mem-item">
            <span class="rp-mem-icon">{{ mem.icon }}</span>
            <div class="rp-mem-text">
              <span>{{ mem.text }}</span>
              <span class="rp-mem-time">{{ mem.time }}</span>
            </div>
          </div>
          <p v-if="memoryCapsules.length === 0" class="rp-empty">暂无记忆记录</p>
        </div>
      </section>

      <!-- 成长进度 -->
      <section class="rp-card rp-growth">
        <div class="rp-card-head">
          <h4><svg class="rp-h-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> 成长进度</h4>
        </div>
        <div class="rp-level-row">
          <div class="rp-level-badge">
            <span class="rp-level-icon">🔥</span>
          </div>
          <div class="rp-level-info">
            <div class="rp-level-name">Lv.{{ userLevel }} <span class="rp-level-title">{{ levelTitle }}</span></div>
            <div class="rp-level-xp">{{ userXP }} / {{ nextLevelXP }} XP</div>
            <div class="rp-xp-bar"><div class="rp-xp-fill" :style="{ width: xpPercent + '%' }"></div></div>
          </div>
        </div>
        <div class="rp-growth-stats">
          <div class="rp-gs-item">
            <strong>{{ streakDays }} 天</strong>
            <span>连续陪伴</span>
          </div>
          <div class="rp-gs-item">
            <strong>{{ weeklyActiveDays }} 天</strong>
            <span>本周活跃</span>
          </div>
        </div>
        <div class="rp-growth-tags">
          <span class="rp-gt">📚 专注达人</span>
          <span class="rp-gt">🎯 学习任务</span>
          <span class="rp-gt">💬 计数大师</span>
          <span class="rp-gt rp-gt-more">更多成就 →</span>
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
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCheckin, MOOD_META, type Mood } from '../../composables/useCheckin'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'

const emit = defineEmits<{
  (e: 'checkin'): void
  (e: 'send-message', msg: string): void
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

onMounted(async () => {
  await fetchCheckinData()
  await Promise.all([loadSchedule(), loadMemory()])
})
</script>

<style scoped>
.chat-right-panel {
  width: 280px;
  background: rgba(8, 6, 18, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-right-panel.collapsed {
  width: 36px;
}

.rp-toggle {
  position: absolute;
  top: 12px;
  left: -14px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(12, 10, 24, 0.95);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  transition: all 0.2s;
}

.rp-toggle:hover {
  background: rgba(139, 92, 246, 0.15);
  color: rgba(196, 181, 253, 0.9);
  border-color: rgba(139, 92, 246, 0.3);
}

.rp-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rp-scroll::-webkit-scrollbar { width: 3px; }
.rp-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.04); border-radius: 3px; }

.rp-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(12, 10, 24, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.2s;
}

.rp-card:hover {
  border-color: rgba(139, 92, 246, 0.1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.rp-status {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(12, 10, 24, 0.5));
  border-color: rgba(16, 185, 129, 0.06);
}

.rp-schedule {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.04), rgba(12, 10, 24, 0.5));
  border-color: rgba(139, 92, 246, 0.06);
}

.rp-memory {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.03), rgba(12, 10, 24, 0.5));
  border-color: rgba(245, 158, 11, 0.05);
}

.rp-growth {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.03), rgba(12, 10, 24, 0.5));
  border-color: rgba(236, 72, 153, 0.05);
}

.rp-actions {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(12, 10, 24, 0.5));
  border-color: rgba(59, 130, 246, 0.05);
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
  width: 100px;
  height: 100px;
  margin: 0 auto 10px;
}

.energy-svg { width: 100%; height: 100%; }

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.06);
  stroke-width: 6;
}

.ring-fg {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 251.33;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.8s ease, stroke 0.3s;
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
  font-size: 22px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}

.energy-center span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
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
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid transparent;
  transition: all 0.15s;
}

.rp-event.active {
  background: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.15);
}

.rp-event.upcoming {
  background: rgba(245, 158, 11, 0.04);
  border-color: rgba(245, 158, 11, 0.1);
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
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.rp-mem-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

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
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #f59e0b);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

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

.rp-level-xp {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  margin: 2px 0 6px;
}

.rp-xp-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.rp-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #f59e0b);
  border-radius: 3px;
  transition: width 0.6s ease;
}

.rp-growth-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rp-gs-item {
  text-align: center;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.rp-gs-item strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
}

.rp-gs-item span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
}

.rp-growth-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.rp-gt {
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}

.rp-gt-more {
  color: rgba(139, 92, 246, 0.4);
  cursor: pointer;
  border-color: rgba(139, 92, 246, 0.08);
}

.rp-gt-more:hover {
  color: rgba(139, 92, 246, 0.7);
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
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.015);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.rp-action-btn:hover {
  background: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.12);
  transform: translateX(2px);
}

.rp-action-focus {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04));
  border-color: rgba(139, 92, 246, 0.1);
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

@media (max-width: 1100px) {
  .chat-right-panel { display: none; }
}
</style>
