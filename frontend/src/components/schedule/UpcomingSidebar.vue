<!--
  UpcomingSidebar.vue — 右侧栏组件（增强版）
  迷你日期卡 + 周时间分布 + 日程健康评分 + 即将到来 + 类型筛选 + 本月概览 + AI建议
-->
<template>
  <aside class="sidebar">
    <!-- 迷你日期卡 -->
    <div class="mini-date">
      <div class="mini-num">{{ todayDate }}</div>
      <div class="mini-info">
        <span>{{ todayYear }}年{{ todayMonth }}月</span>
        <span>{{ todayWeekday }}</span>
      </div>
    </div>

    <!-- 日程健康评分 -->
    <div class="section health-section">
      <div class="health-header">
        <h4 class="section-title">日程健康度</h4>
        <span class="health-score" :class="healthLevel">{{ healthScore }}分</span>
      </div>
      <div class="health-ring-row">
        <div class="health-ring-wrap">
          <svg viewBox="0 0 60 60" class="health-ring">
            <circle class="h-ring-bg" cx="30" cy="30" r="24" />
            <circle class="h-ring-fg" cx="30" cy="30" r="24" :stroke="healthColor" :stroke-dashoffset="healthRingOffset" />
          </svg>
          <span class="health-emoji">{{ healthEmoji }}</span>
        </div>
        <div class="health-details">
          <div class="health-metric">
            <span class="metric-dot" style="background:#10b981"></span>
            <span>时间均衡</span>
            <span class="metric-val">{{ balanceLabel }}</span>
          </div>
          <div class="health-metric">
            <span class="metric-dot" style="background:#4f8ef7"></span>
            <span>类型丰富</span>
            <span class="metric-val">{{ diversityLabel }}</span>
          </div>
          <div class="health-metric">
            <span class="metric-dot" style="background:#f59e0b"></span>
            <span>日程密度</span>
            <span class="metric-val">{{ densityLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 本周时间分布 -->
    <div class="section">
      <h4 class="section-title">本周分布</h4>
      <div class="week-chart">
        <div v-for="(day, i) in weekDistribution" :key="i" class="week-bar-col">
          <div class="week-bar-track">
            <div class="week-bar-fill" :style="{ height: day.percent + '%', background: day.isToday ? '#4f8ef7' : 'rgba(139,92,246,0.5)' }"></div>
          </div>
          <span class="week-bar-label" :class="{ today: day.isToday }">{{ day.label }}</span>
          <span class="week-bar-count" v-if="day.count > 0">{{ day.count }}</span>
        </div>
      </div>
    </div>

    <!-- 即将到来 -->
    <div class="section">
      <h4 class="section-title">即将到来</h4>
      <div v-if="upcomingEvents.length === 0" class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
        <span>暂无近期事件</span>
      </div>
      <div
        v-for="evt in upcomingEvents.slice(0, 5)" :key="evt.id"
        class="upcoming-item"
        @click="$emit('clickEvent', evt)"
      >
        <div class="upcoming-bar" :style="{ background: getEventColor(evt) }"></div>
        <div class="upcoming-info">
          <span class="upcoming-title">{{ evt.title }}</span>
          <span class="upcoming-time">
            {{ formatDate(new Date(evt.start_time)) }}
            {{ evt.all_day ? '全天' : formatTime(evt.start_time) }}
          </span>
        </div>
        <span class="upcoming-countdown" v-if="getCountdown(evt)">{{ getCountdown(evt) }}</span>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="section">
      <h4 class="section-title">类型筛选</h4>
      <div class="filter-grid">
        <label
          v-for="(cfg, key) in EVENT_TYPES" :key="key"
          class="filter-chip"
          :class="{ active: modelValue.includes(key as string) }"
          :style="modelValue.includes(key as string) ? { borderColor: cfg.color, background: cfg.color + '12' } : {}"
        >
          <input type="checkbox" :value="key"
            :checked="modelValue.includes(key as string)"
            @change="toggleType(key as string)" />
          <span>{{ cfg.icon }}</span>
          <span>{{ cfg.label }}</span>
          <span class="filter-count" :style="{ color: cfg.color }">{{ getCount(key as string) }}</span>
        </label>
      </div>
    </div>

    <!-- AI 智能建议 -->
    <div class="section ai-suggest-section" v-if="aiSuggestion">
      <h4 class="section-title">AI 建议</h4>
      <div class="ai-suggest-card">
        <span class="ai-suggest-icon">{{ aiSuggestion.icon }}</span>
        <p class="ai-suggest-text">{{ aiSuggestion.text }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EVENT_TYPES, type ScheduleEvent } from '../../composables/useSchedule'
import { formatTime, formatDate } from '../../composables/useCalendar'
import { getHolidayCountForMonth } from '../../data/holidays'

const props = defineProps<{
  upcomingEvents: ScheduleEvent[]
  events: ScheduleEvent[]
  modelValue: string[]
  currentYear: number
  currentMonth: number
}>()

const emit = defineEmits<{
  'update:modelValue': [types: string[]]
  clickEvent: [event: ScheduleEvent]
}>()

const now = new Date()
const todayDate = now.getDate()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const todayWeekday = `星期${weekdays[now.getDay()]}`

const getEventColor = (evt: ScheduleEvent) =>
  evt.color || EVENT_TYPES[evt.event_type]?.color || '#4f8ef7'

const toggleType = (type: string) => {
  const current = [...props.modelValue]
  const idx = current.indexOf(type)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(type)
  emit('update:modelValue', current)
}

const getCount = (type: string) => {
  const dbCount = props.events.filter(e => {
    const d = new Date(e.start_time)
    return e.event_type === type &&
      d.getFullYear() === props.currentYear &&
      d.getMonth() === props.currentMonth - 1
  }).length

  if (type === 'holiday') {
    return dbCount + getHolidayCountForMonth(props.currentMonth)
  }
  return dbCount
}

// ====== 本周时间分布 ======
const weekDistribution = computed(() => {
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1

  const mondayDate = new Date(now)
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
  mondayDate.setDate(now.getDate() + diff)
  mondayDate.setHours(0, 0, 0, 0)

  const counts = labels.map((_, i) => {
    const dayDate = new Date(mondayDate)
    dayDate.setDate(mondayDate.getDate() + i)
    return props.events.filter(e => {
      const eDate = new Date(e.start_time)
      return eDate.getFullYear() === dayDate.getFullYear() &&
        eDate.getMonth() === dayDate.getMonth() &&
        eDate.getDate() === dayDate.getDate()
    }).length
  })

  const max = Math.max(...counts, 1)
  return labels.map((label, i) => ({
    label,
    count: counts[i],
    percent: (counts[i] / max) * 100,
    isToday: i === todayIdx,
  }))
})

// ====== 日程健康评分 ======
const monthEvents = computed(() => props.events.filter(e => {
  const d = new Date(e.start_time)
  return d.getFullYear() === props.currentYear && d.getMonth() === props.currentMonth - 1
}))

const balanceScore = computed(() => {
  if (monthEvents.value.length < 2) return 50
  const dayMap = new Map<number, number>()
  monthEvents.value.forEach(e => {
    const day = new Date(e.start_time).getDate()
    dayMap.set(day, (dayMap.get(day) || 0) + 1)
  })
  const vals = [...dayMap.values()]
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length
  const cv = Math.sqrt(variance) / (avg || 1)
  return Math.round(Math.max(20, 100 - cv * 40))
})

const diversityScore = computed(() => {
  const types = new Set(monthEvents.value.map(e => e.event_type))
  const total = Object.keys(EVENT_TYPES).length
  return Math.round((types.size / total) * 100)
})

const densityScore = computed(() => {
  const daysInMonth = new Date(props.currentYear, props.currentMonth, 0).getDate()
  const daysPassed = Math.min(now.getDate(), daysInMonth)
  const avgPerDay = monthEvents.value.length / (daysPassed || 1)
  if (avgPerDay < 1) return 40
  if (avgPerDay > 8) return 30
  if (avgPerDay >= 2 && avgPerDay <= 5) return 100
  return Math.round(70 + (1 - Math.abs(avgPerDay - 3.5) / 3.5) * 30)
})

const healthScore = computed(() => Math.round(
  balanceScore.value * 0.35 + diversityScore.value * 0.3 + densityScore.value * 0.35
))

const healthLevel = computed(() => {
  if (healthScore.value >= 80) return 'excellent'
  if (healthScore.value >= 60) return 'good'
  if (healthScore.value >= 40) return 'fair'
  return 'low'
})

const healthColor = computed(() => {
  if (healthScore.value >= 80) return '#10b981'
  if (healthScore.value >= 60) return '#4f8ef7'
  if (healthScore.value >= 40) return '#f59e0b'
  return '#ef4444'
})

const healthEmoji = computed(() => {
  if (healthScore.value >= 80) return '🌟'
  if (healthScore.value >= 60) return '😊'
  if (healthScore.value >= 40) return '🤔'
  return '😴'
})

const healthRingOffset = computed(() => {
  const circumference = 2 * Math.PI * 24
  return circumference - (healthScore.value / 100) * circumference
})

const scoreLabel = (score: number) => {
  if (score >= 80) return '优秀'
  if (score >= 60) return '良好'
  if (score >= 40) return '一般'
  return '偏低'
}

const balanceLabel = computed(() => scoreLabel(balanceScore.value))
const diversityLabel = computed(() => scoreLabel(diversityScore.value))
const densityLabel = computed(() => scoreLabel(densityScore.value))

// ====== 倒计时 ======
const getCountdown = (evt: ScheduleEvent): string | null => {
  const start = new Date(evt.start_time).getTime()
  const diff = start - Date.now()
  if (diff < 0) return null
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.ceil(diff / 60000)}分`
  if (hours < 24) return `${hours}时`
  const days = Math.floor(hours / 24)
  return `${days}天`
}

// ====== AI 智能建议 ======
const aiSuggestion = computed(() => {
  const evts = monthEvents.value
  if (evts.length === 0) {
    return { icon: '📝', text: '本月还没有日程安排，从添加第一个事件开始吧！可以尝试导入课表快速填充。' }
  }

  const courseCount = evts.filter(e => e.event_type === 'course').length
  const lifeCount = evts.filter(e => e.event_type === 'life').length
  const examCount = evts.filter(e => e.event_type === 'exam').length

  if (courseCount > 0 && lifeCount === 0) {
    return { icon: '🏃', text: '学习很充实！建议穿插一些运动或休闲活动，劳逸结合效果更好。' }
  }
  if (examCount > 3) {
    return { icon: '📚', text: `本月有 ${examCount} 场考试，建议提前制定复习计划，合理分配每门课的备考时间。` }
  }
  if (densityScore.value < 40) {
    return { icon: '⏰', text: '日程较少，可以利用空闲时间为自己设定一些小目标或学习计划。' }
  }
  if (densityScore.value > 85) {
    return { icon: '💆', text: '日程较满，注意留出休息缓冲时间，避免过度疲劳影响效率。' }
  }
  if (healthScore.value >= 80) {
    return { icon: '✨', text: '日程安排非常健康！保持这种节奏，学习与生活平衡得很好。' }
  }
  return { icon: '💡', text: '试试调整事件分布，让每天的安排更均匀，有助于建立稳定的日常节奏。' }
})
</script>

<style scoped>
.sidebar {
  width: 260px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 18px;
  max-height: calc(100vh - 140px); overflow-y: auto;
  scrollbar-width: none;
}
.sidebar::-webkit-scrollbar { display: none; }

.mini-date {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 16px;
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(79, 142, 247, 0.12);
  border-radius: 14px;
  backdrop-filter: blur(8px);
}
.mini-num {
  font-size: 38px; font-weight: 800;
  background: linear-gradient(135deg, var(--color-brand-blue), #8b5cf6);
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}
.mini-info {
  display: flex; flex-direction: column; gap: 2px;
  font-size: 12px; color: rgba(255, 255, 255, 0.45);
}

.section-title {
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.4); text-transform: uppercase;
  letter-spacing: 1.5px; margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* ===== 日程健康评分 ===== */
.health-section {
  padding: 14px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
}
.health-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.health-header .section-title { margin: 0; padding: 0; border: none; }
.health-score {
  font-size: 14px; font-weight: 700; padding: 3px 10px;
  border-radius: 10px;
}
.health-score.excellent { color: #10b981; background: rgba(16,185,129,0.1); }
.health-score.good { color: #4f8ef7; background: rgba(79,142,247,0.1); }
.health-score.fair { color: #f59e0b; background: rgba(245,158,11,0.1); }
.health-score.low { color: #ef4444; background: rgba(239,68,68,0.1); }

.health-ring-row {
  display: flex; gap: 14px; align-items: center;
}
.health-ring-wrap {
  position: relative; width: 60px; height: 60px; flex-shrink: 0;
}
.health-ring { width: 100%; height: 100%; }
.h-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 5; }
.h-ring-fg {
  fill: none; stroke-width: 5; stroke-linecap: round;
  stroke-dasharray: 150.8;
  transform: rotate(-90deg); transform-origin: center;
  transition: stroke-dashoffset 0.6s ease;
}
.health-emoji {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.health-details { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.health-metric {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,0.5);
}
.metric-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.metric-val { margin-left: auto; font-weight: 600; color: rgba(255,255,255,0.7); }

/* ===== 本周分布 ===== */
.week-chart {
  display: flex; gap: 4px; align-items: flex-end; height: 80px;
  padding: 8px 0 0;
}
.week-bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 4px; position: relative;
}
.week-bar-track {
  width: 100%; height: 50px;
  background: rgba(255,255,255,0.03); border-radius: 4px;
  display: flex; flex-direction: column; justify-content: flex-end;
  overflow: hidden;
}
.week-bar-fill {
  width: 100%; border-radius: 4px 4px 0 0;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}
.week-bar-label {
  font-size: 10px; color: rgba(255,255,255,0.3); font-weight: 500;
}
.week-bar-label.today { color: #4f8ef7; font-weight: 700; }
.week-bar-count {
  position: absolute; top: -2px;
  font-size: 9px; font-weight: 700;
  color: rgba(255,255,255,0.6);
}

/* ===== Upcoming ===== */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(255, 255, 255, 0.25); padding: 20px 0;
}

.upcoming-item {
  display: flex; gap: 10px; align-items: center;
  padding: 10px 10px; border-radius: 10px; cursor: pointer;
  transition: all 0.2s ease; margin-bottom: 2px;
}
.upcoming-item:hover {
  background: rgba(255, 255, 255, 0.04);
  transform: translateX(2px);
}
.upcoming-bar { width: 3px; border-radius: 3px; flex-shrink: 0; min-height: 32px; align-self: stretch; }
.upcoming-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.upcoming-title {
  font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.upcoming-time { font-size: 11px; color: rgba(255, 255, 255, 0.3); }
.upcoming-countdown {
  font-size: 10px; font-weight: 600;
  color: #fbbf24; background: rgba(251,191,36,0.1);
  padding: 2px 8px; border-radius: 8px;
  white-space: nowrap; flex-shrink: 0;
}

/* ===== Filter ===== */
.filter-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.filter-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 20px; font-size: 12px;
  color: rgba(255, 255, 255, 0.6); cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}
.filter-chip input { display: none; }
.filter-chip.active { color: white; }
.filter-chip:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}
.filter-count {
  font-size: 10px; font-weight: 700;
  margin-left: 2px;
}

/* ===== AI 建议 ===== */
.ai-suggest-section {
  padding: 14px;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,142,247,0.04));
  border: 1px solid rgba(139,92,246,0.1);
  border-radius: 14px;
}
.ai-suggest-card {
  display: flex; gap: 10px; align-items: flex-start;
}
.ai-suggest-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.ai-suggest-text {
  margin: 0; font-size: 12px; line-height: 1.6;
  color: rgba(255,255,255,0.6);
}

@media (max-width: 900px) {
  .sidebar { width: 100%; max-height: 300px; }
  .mini-date { display: none; }
  .week-chart { height: 60px; }
  .health-section { padding: 10px; }
}
</style>
