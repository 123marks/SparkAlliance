<template>
  <!-- 每日/每周统计卡片 -->
  <div class="stats-card">
    <div class="sc-header">
      <h3 class="sc-title">📊 今日进度</h3>
      <span class="sc-date">{{ todayStr }}</span>
    </div>

    <!-- 今日完成环形进度 -->
    <div class="sc-ring-row">
      <div class="sc-ring">
        <svg viewBox="0 0 36 36" class="sc-ring-svg">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
          </defs>
          <path class="sc-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path
            class="sc-ring-fill"
            :stroke-dasharray="`${todayProgress}, 100`"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div class="sc-ring-text">
          <span class="sc-ring-num">{{ todayCompleted }}</span>
          <span class="sc-ring-label">/ {{ todayTotal }}</span>
        </div>
      </div>
      <div class="sc-ring-info">
        <p class="sc-encourage">{{ encourageText }}</p>
        <div class="sc-streak" v-if="currentStreak > 0">
          <span class="sc-streak-fire">🔥</span>
          <span class="sc-streak-num">{{ currentStreak }}</span>
          <span class="sc-streak-label">天连续</span>
        </div>
      </div>
    </div>

    <!-- 本周概览 -->
    <div class="sc-week">
      <div class="sc-week-header">
        <span class="sc-week-title">本周概览</span>
        <span class="sc-week-count">{{ weekCompleted }} / {{ weekTotal }}</span>
      </div>
      <div class="sc-week-bars">
        <div v-for="(day, i) in weekData" :key="i" class="sc-bar-wrap">
          <div class="sc-bar" :class="{ today: day.isToday, future: day.isFuture }">
            <div class="sc-bar-fill" :style="{ height: `${day.progress}%` }"></div>
          </div>
          <span class="sc-bar-label">{{ day.label }}</span>
        </div>
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="sc-quick">
      <button class="sc-quick-btn" @click="$emit('addTask')">
        <span class="sc-qb-icon">+</span>
        <span>添加任务</span>
      </button>
      <button class="sc-quick-btn" @click="$emit('viewAchievements')">
        <span class="sc-qb-icon">🏆</span>
        <span>成就</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'

const emit = defineEmits<{
  addTask: []
  viewAchievements: []
}>()

const { user } = useAuth()

const todayCompleted = ref(0)
const todayTotal = ref(0)
const weekCompleted = ref(0)
const weekTotal = ref(0)
const currentStreak = ref(0)
const weekData = ref<{ label: string; progress: number; isToday: boolean; isFuture: boolean }[]>([])

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const todayProgress = computed(() => {
  if (todayTotal.value === 0) return 0
  return Math.round((todayCompleted.value / todayTotal.value) * 100)
})

const encourageText = computed(() => {
  const pct = todayProgress.value
  if (todayTotal.value === 0) return '添加任务开始今天的征程'
  if (pct === 100) return '太棒了！今日目标已完成 🎉'
  if (pct >= 75) return '马上就完成了，加油！'
  if (pct >= 50) return '过半了，继续保持 💪'
  if (pct >= 25) return '良好的开始！'
  return '一步一步来，你可以的'
})

async function fetchStats() {
  if (!user.value) return

  const today = getLocalDate()
  const weekStart = getWeekStart()

  // 今日任务统计
  const { data: todayTasks } = await supabase
    .from('planner_tasks')
    .select('is_completed')
    .eq('user_id', user.value.id)
    .eq('due_date', today)
    .in('status', ['pending', 'in_progress', 'completed'])

  todayCompleted.value = (todayTasks || []).filter(t => t.is_completed).length
  todayTotal.value = (todayTasks || []).length

  // 本周统计
  const { data: weekTasks } = await supabase
    .from('planner_tasks')
    .select('due_date, is_completed')
    .eq('user_id', user.value.id)
    .gte('due_date', weekStart)
    .lte('due_date', today)
    .in('status', ['pending', 'in_progress', 'completed'])

  weekCompleted.value = (weekTasks || []).filter(t => t.is_completed).length
  weekTotal.value = (weekTasks || []).length

  // 构建本周每日数据
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
  const todayDate = new Date()
  const dayOfWeek = (todayDate.getDay() + 6) % 7 // 周一=0

  weekData.value = weekLabels.map((label, i) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() - dayOfWeek + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayTasks = (weekTasks || []).filter(t => t.due_date === dateStr)
    const completed = dayTasks.filter(t => t.is_completed).length
    const total = dayTasks.length
    return {
      label,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      isToday: i === dayOfWeek,
      isFuture: i > dayOfWeek,
    }
  })

  // 连续天数（简单计算）
  await fetchStreak()
}

async function fetchStreak() {
  if (!user.value) return

  const { data: tasks } = await supabase
    .from('planner_tasks')
    .select('completed_at')
    .eq('user_id', user.value.id)
    .eq('is_completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(100)

  if (!tasks || tasks.length === 0) {
    currentStreak.value = 0
    return
  }

  const dates = [...new Set(tasks.map(t => t.completed_at.split('T')[0]))].sort().reverse()
  let streak = 0
  const today = new Date()

  for (let i = 0; i < dates.length && i < 100; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const expectedStr = expected.toISOString().split('T')[0]
    if (dates.includes(expectedStr)) {
      streak++
    } else if (i === 0) {
      continue // 今天还没完成，检查昨天
    } else {
      break
    }
  }

  currentStreak.value = streak
}

function getLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

onMounted(fetchStats)

// 暴露刷新方法
defineExpose({ refresh: fetchStats })
</script>

<style scoped>
.stats-card{background:linear-gradient(160deg,rgba(139,92,246,.08),rgba(245,197,94,.04));border:1px solid rgba(139,92,246,.12);border-radius:16px;padding:16px}
.sc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.sc-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);margin:0}
.sc-date{font-size:11px;color:rgba(255,255,255,.3)}

/* 环形进度 */
.sc-ring-row{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.sc-ring{position:relative;width:80px;height:80px;flex-shrink:0}
.sc-ring-svg{width:100%;height:100%;transform:rotate(-90deg)}
.sc-ring-bg{fill:none;stroke:rgba(255,255,255,.06);stroke-width:3}
.sc-ring-fill{fill:none;stroke:url(#ring-gradient);stroke-width:3;stroke-linecap:round;transition:stroke-dasharray .6s ease}
.sc-ring-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sc-ring-num{font-size:22px;font-weight:700;color:rgba(255,255,255,.85)}
.sc-ring-label{font-size:11px;color:rgba(255,255,255,.3)}
.sc-ring-info{flex:1}
.sc-encourage{font-size:13px;color:rgba(255,255,255,.5);margin:0 0 6px;line-height:1.4}
.sc-streak{display:flex;align-items:center;gap:4px}
.sc-streak-fire{font-size:16px}
.sc-streak-num{font-size:18px;font-weight:700;color:rgba(245,158,11,.8)}
.sc-streak-label{font-size:11px;color:rgba(255,255,255,.3)}

/* 本周柱状图 */
.sc-week{margin-bottom:14px}
.sc-week-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.sc-week-title{font-size:12px;color:rgba(255,255,255,.4)}
.sc-week-count{font-size:11px;color:rgba(139,92,246,.5)}
.sc-week-bars{display:flex;gap:4px;align-items:flex-end}
.sc-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.sc-bar{width:100%;height:40px;background:rgba(255,255,255,.04);border-radius:4px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
.sc-bar.today{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2)}
.sc-bar.future{opacity:.4}
.sc-bar-fill{width:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);border-radius:4px;transition:height .4s ease}
.sc-bar-label{font-size:10px;color:rgba(255,255,255,.25)}
.sc-bar.today .sc-bar-label{color:rgba(139,92,246,.6)}

/* 快速入口 */
.sc-quick{display:flex;gap:8px}
.sc-quick-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;transition:all .2s}
.sc-quick-btn:hover{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.15);color:rgba(255,255,255,.6)}
.sc-qb-icon{font-size:14px}
</style>
