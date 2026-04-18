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

    <!-- 即将到来（v7.4: 溢出折叠 + 展开看全部） -->
    <div class="section upcoming-section">
      <div class="upcoming-header">
        <h4 class="section-title">即将到来</h4>
        <span v-if="upcomingEvents.length > UPCOMING_INITIAL_COUNT" class="upcoming-count-badge">
          共 {{ upcomingEvents.length }} 个
        </span>
      </div>
      <div v-if="upcomingEvents.length === 0" class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
        <span>暂无近期事件</span>
      </div>
      <div class="upcoming-list" :class="{ 'is-expanded': upcomingExpanded }">
        <div
          v-for="evt in displayedUpcoming" :key="evt.id"
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
      <button
        v-if="upcomingEvents.length > UPCOMING_INITIAL_COUNT"
        class="upcoming-expand-btn"
        @click="upcomingExpanded = !upcomingExpanded"
      >
        <span>{{ upcomingExpanded ? '收起' : `展开查看剩余 ${upcomingEvents.length - UPCOMING_INITIAL_COUNT} 个` }}</span>
        <svg :class="['upcoming-chev', { up: upcomingExpanded }]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
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

    <!-- AI 智能建议（v7.4: 支持换一换 + 基于本周/本月多维度建议 + 表情包） -->
    <div class="section ai-suggest-section" v-if="aiSuggestion">
      <div class="ai-suggest-header">
        <h4 class="section-title">AI 建议</h4>
        <button class="ai-suggest-refresh" :class="{ spinning: refreshingSuggest }" @click="rerollSuggestion" title="换一换">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
      <div class="ai-suggest-card" :key="suggestCycle">
        <span class="ai-suggest-icon">{{ aiSuggestion.icon }}</span>
        <div class="ai-suggest-content">
          <p class="ai-suggest-text">{{ aiSuggestion.text }}</p>
          <span class="ai-suggest-scope">{{ aiSuggestion.scope }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { EVENT_TYPES, type ScheduleEvent } from '../../composables/useSchedule'
import { formatTime, formatDate } from '../../composables/useCalendar'
import { getHolidayCountForMonth } from '../../data/holidays'
import { expandRecurringEvents } from '../../composables/useRecurrence'

// v7.4: 溢出折叠
const UPCOMING_INITIAL_COUNT = 3
const upcomingExpanded = ref(false)

// v7.4: AI 建议换一换
const suggestCycle = ref(0)
const refreshingSuggest = ref(false)
function rerollSuggestion() {
  refreshingSuggest.value = true
  suggestCycle.value += 1
  setTimeout(() => { refreshingSuggest.value = false }, 600)
}

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

// ====== v9: 本月 / 本周 范围的展开事件（含 recurring 实例）====== 
// 修复之前的 bug：如果一个重复课程 start_time 是学期初某周一，本周分布就读不到，健康度也失真。
const thisMonthRange = computed(() => {
  const start = new Date(props.currentYear, props.currentMonth - 1, 1)
  const end = new Date(props.currentYear, props.currentMonth, 1)
  return { start, end }
})

const monthEventsExpanded = computed(() => {
  const { start, end } = thisMonthRange.value
  return expandRecurringEvents(props.events, start, end)
})

const thisWeekRange = computed(() => {
  const monday = new Date(now)
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)
  return { start: monday, end: sunday }
})

const weekEventsExpanded = computed(() => {
  const { start, end } = thisWeekRange.value
  return expandRecurringEvents(props.events, start, end)
})

const getCount = (type: string) => {
  // 使用展开后的本月事件，递归事件也能正确计数
  const dbCount = monthEventsExpanded.value.filter(e => e.event_type === type).length

  if (type === 'holiday') {
    return dbCount + getHolidayCountForMonth(props.currentMonth)
  }
  return dbCount
}

// ====== 本周时间分布（v9: 使用展开后的事件，正确反映 recurring 课程）======
const weekDistribution = computed(() => {
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1

  const { start: mondayDate } = thisWeekRange.value
  const weekEvts = weekEventsExpanded.value

  const counts = labels.map((_, i) => {
    const dayDate = new Date(mondayDate)
    dayDate.setDate(mondayDate.getDate() + i)
    return weekEvts.filter(e => {
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

// ====== 日程健康评分（v9: 基于展开后的本月事件）======
const monthEvents = computed(() => monthEventsExpanded.value)

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

// v7.4: 即将到来列表折叠
const displayedUpcoming = computed(() =>
  upcomingExpanded.value
    ? props.upcomingEvents
    : props.upcomingEvents.slice(0, UPCOMING_INITIAL_COUNT)
)

// ====== AI 智能建议（v7.4 扩展：多候选 + 换一换 + 作用域 + 表情包；v9 使用展开事件） ======
interface SmartSuggestion { icon: string; text: string; scope: string }

// 本周展开事件
const thisWeekEvents = computed(() => weekEventsExpanded.value)

const suggestionsPool = computed<SmartSuggestion[]>(() => {
  const pool: SmartSuggestion[] = []
  const mEvts = monthEvents.value
  const wEvts = thisWeekEvents.value

  if (mEvts.length === 0) {
    pool.push({ icon: '📝', text: '本月还没有日程安排，先从课表或考试导入开始吧！', scope: '本月视角' })
    pool.push({ icon: '🌱', text: '空白的日历像新土壤——种下一个小目标，21 天后回来看看惊喜 ✨', scope: '本月视角' })
    pool.push({ icon: '🎯', text: '建议先用「智能导入」把一学期课表丢进来，10 秒搞定 ⚡', scope: '本月视角' })
    return pool
  }

  // 按类型
  const courseCount = mEvts.filter(e => e.event_type === 'course').length
  const lifeCount = mEvts.filter(e => e.event_type === 'life').length
  const examCount = mEvts.filter(e => e.event_type === 'exam').length
  const taskCount = mEvts.filter(e => e.event_type === 'task').length
  const weekCount = wEvts.length

  if (examCount > 3) {
    pool.push({ icon: '📚', text: `本月有 ${examCount} 场考试，建议按「每周 1 门」节奏复习，留 3 天终极冲刺 💪`, scope: '本月考试' })
    pool.push({ icon: '🧠', text: `${examCount} 场考试！现在就用规划模块拆成每日小任务，避免临时抱佛脚 🙏`, scope: '本月考试' })
  }
  if (courseCount > 0 && lifeCount === 0) {
    pool.push({ icon: '🏃', text: '学习硬核派！补个篮球/散步日程，多巴胺 + 专注力双提升 🎯', scope: '平衡建议' })
    pool.push({ icon: '🧘', text: '纯学习模式启动中…给自己排一场运动或放空时间吧，大脑会感谢你 💆', scope: '平衡建议' })
  }
  if (taskCount > courseCount * 2 && taskCount > 5) {
    pool.push({ icon: '📌', text: `本月 ${taskCount} 个任务较密集，试试番茄钟（25+5），防止拖延 🍅`, scope: '任务管理' })
  }
  if (densityScore.value < 40) {
    pool.push({ icon: '⏰', text: '日程较空闲，趁机给自己设 1 个"21 天挑战"吧（英语/健身/读书都行）🎯', scope: '密度建议' })
    pool.push({ icon: '🎨', text: '空白日历也是一种奢侈——留点时间做真正喜欢的事 ☕', scope: '密度建议' })
  }
  if (densityScore.value > 85) {
    pool.push({ icon: '💆', text: '日程已满载！建议每天留 1 小时"什么都不做"的 buffer，防止过载 ⚡', scope: '密度建议' })
    pool.push({ icon: '😴', text: '忙碌模式 Max——别忘了睡眠和三餐，身体是革命本钱 🛏️', scope: '密度建议' })
  }
  if (weekCount === 0) {
    pool.push({ icon: '📅', text: '本周还没有安排！周计划比月计划更能落地，现在就加 3 个小目标吧 📍', scope: '本周视角' })
  } else if (weekCount >= 15) {
    pool.push({ icon: '🔥', text: `本周 ${weekCount} 件事！这节奏挺猛的，记得每 90 分钟站起来走两圈 🚶`, scope: '本周视角' })
  } else if (weekCount >= 5) {
    pool.push({ icon: '✨', text: `本周 ${weekCount} 件事安排得井井有条，继续保持 👍`, scope: '本周视角' })
  }
  if (healthScore.value >= 80) {
    pool.push({ icon: '🌟', text: '日程健康度优秀！学习、生活、运动都有占比，这是理想状态 🏆', scope: '健康总评' })
  }

  // 时段建议
  const morningEvts = mEvts.filter(e => {
    const h = new Date(e.start_time).getHours()
    return h >= 6 && h < 12
  }).length
  const eveningEvts = mEvts.filter(e => {
    const h = new Date(e.start_time).getHours()
    return h >= 20 || h < 6
  }).length
  if (morningEvts < mEvts.length * 0.2) {
    pool.push({ icon: '🌅', text: '早晨时段空荡荡的，其实 7-10 点是大脑黄金时间，放点硬核任务效率翻倍 ☀️', scope: '时段优化' })
  }
  if (eveningEvts > mEvts.length * 0.4) {
    pool.push({ icon: '🌙', text: '夜间日程较多，长期熬夜会降低认知力。试试把重要任务挪到白天 💡', scope: '时段优化' })
  }

  // 通用兜底
  if (pool.length < 3) {
    pool.push({ icon: '💡', text: '试试把相似类型的事件聚集到同一时段，减少上下文切换成本 🎯', scope: '通用建议' })
    pool.push({ icon: '🎁', text: '每完成 5 件事给自己一个小奖励（奶茶/剧集），坚持的秘诀 🍰', scope: '激励法' })
    pool.push({ icon: '📊', text: '试试规划模块设定月度目标，让日程为目标服务，而不是反过来 🎯', scope: '目标拆解' })
  }

  return pool
})

const aiSuggestion = computed<SmartSuggestion>(() => {
  const pool = suggestionsPool.value
  if (pool.length === 0) return { icon: '📝', text: '开启星火之旅，从一个小目标开始 🚀', scope: '默认' }
  // 使用 suggestCycle 决定当前显示项（换一换）
  return pool[suggestCycle.value % pool.length]
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

/* ===== Upcoming (v9: 含溢出折叠 + 展开按钮) ===== */
.upcoming-section { position: relative; }
.upcoming-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.upcoming-header .section-title {
  margin: 0; padding: 0; border: none;
}
.upcoming-count-badge {
  font-size: 10px; font-weight: 700;
  color: #fbbf24; background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.15);
  padding: 2px 8px; border-radius: 10px;
  letter-spacing: 0.3px;
}

.upcoming-list {
  max-height: 200px; overflow: hidden;
  transition: max-height 0.42s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.upcoming-list.is-expanded { max-height: 1200px; }
.upcoming-list:not(.is-expanded)::after {
  content: ''; position: absolute; inset: auto 0 0 0; height: 28px;
  background: linear-gradient(to bottom, transparent, rgba(12,10,24,.8));
  pointer-events: none;
}

.upcoming-expand-btn {
  width: 100%; margin-top: 8px; padding: 8px 12px;
  background: rgba(139,92,246,0.04);
  border: 1px dashed rgba(139,92,246,0.18);
  border-radius: 10px;
  color: rgba(167,139,250,0.75);
  font-size: 11.5px; font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.2s;
}
.upcoming-expand-btn:hover {
  background: rgba(139,92,246,0.1);
  border-color: rgba(139,92,246,0.35);
  color: #c4b5fd;
}
.upcoming-chev { transition: transform 0.25s; }
.upcoming-chev.up { transform: rotate(180deg); }

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

/* ===== AI 建议（v9 完整升级） ===== */
.ai-suggest-section {
  padding: 14px;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,142,247,0.04));
  border: 1px solid rgba(139,92,246,0.1);
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}
.ai-suggest-section::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,.4), transparent);
  animation: aiTopGlow 3s ease-in-out infinite;
}
@keyframes aiTopGlow { 0%,100% { opacity: .3; } 50% { opacity: 1; } }

.ai-suggest-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.ai-suggest-header .section-title { margin: 0; padding: 0; border: none; }
.ai-suggest-refresh {
  background: rgba(139,92,246,0.1);
  border: 1px solid rgba(139,92,246,0.2);
  color: #a78bfa;
  width: 26px; height: 26px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.ai-suggest-refresh:hover {
  background: rgba(139,92,246,0.18);
  transform: rotate(90deg);
}
.ai-suggest-refresh.spinning svg {
  animation: spinRefresh 0.6s linear;
}
@keyframes spinRefresh { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.ai-suggest-card {
  display: flex; gap: 10px; align-items: flex-start;
  animation: suggestFadeIn 0.4s ease-out;
}
@keyframes suggestFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ai-suggest-icon {
  font-size: 22px; flex-shrink: 0; margin-top: 2px;
  animation: iconBounce 1.2s ease-out;
}
@keyframes iconBounce {
  0% { transform: scale(0.6); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.ai-suggest-content {
  flex: 1;
  display: flex; flex-direction: column; gap: 4px;
}
.ai-suggest-text {
  margin: 0; font-size: 12px; line-height: 1.6;
  color: rgba(255,255,255,0.72);
}
.ai-suggest-scope {
  font-size: 9.5px;
  color: rgba(167,139,250,0.7);
  background: rgba(139,92,246,0.08);
  padding: 1px 8px;
  border-radius: 8px;
  letter-spacing: 0.5px;
  align-self: flex-start;
  font-weight: 600;
}

@media (max-width: 900px) {
  .sidebar { width: 100%; max-height: 300px; }
  .mini-date { display: none; }
  .week-chart { height: 60px; }
  .health-section { padding: 10px; }
}
</style>
