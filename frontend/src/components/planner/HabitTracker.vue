<template>
  <!-- 习惯打卡组件：热力图 + 连续天数 + 打卡按钮 -->
  <div class="habit-tracker">
    <!-- 习惯列表 -->
    <div v-if="habits.length === 0" class="ht-empty">
      <p>还没有习惯，点击下方创建一个 ✨</p>
    </div>

    <div v-for="h in habits" :key="h.id" class="ht-card">
      <div class="ht-header">
        <span class="ht-icon">{{ h.icon }}</span>
        <div class="ht-name-wrap">
          <span class="ht-name">{{ h.name }}</span>
          <span class="ht-streak" v-if="h.current_streak > 0">🔥 {{ h.current_streak }}天</span>
        </div>
        <button
          class="ht-check-btn"
          :class="{ checked: checkedMap[h.id] }"
          :disabled="checkedMap[h.id]"
          @click="handleCheckIn(h.id)"
        >
          {{ checkedMap[h.id] ? '✅ 已打卡' : '打卡' }}
        </button>
      </div>

      <!-- 本周简略视图 -->
      <div class="ht-week">
        <div
          v-for="(day, i) in weekDays"
          :key="i"
          class="ht-day"
          :class="{ active: weekLogsMap[h.id]?.has(day), today: day === today }"
        >
          {{ weekLabels[i] }}
        </div>
      </div>
    </div>

    <!-- 月度热力图（汇总） -->
    <div v-if="habits.length > 0" class="ht-heatmap">
      <div class="ht-hm-header">
        <button class="ht-hm-nav" @click="prevMonth">‹</button>
        <span class="ht-hm-title">{{ heatmapYear }}年{{ heatmapMonth }}月</span>
        <button class="ht-hm-nav" @click="nextMonth">›</button>
      </div>
      <div class="ht-hm-labels">
        <span v-for="l in ['日','一','二','三','四','五','六']" :key="l" class="ht-hm-wk">{{ l }}</span>
      </div>
      <div class="ht-hm-grid">
        <!-- 月初偏移 -->
        <div v-for="_ in firstDayOffset" :key="'off'+_" class="ht-hm-cell empty"></div>
        <div
          v-for="d in heatmapDays"
          :key="d.date"
          class="ht-hm-cell"
          :class="heatCellClass(d)"
          :title="`${d.date}：${d.count} 次打卡`"
        >
          {{ parseInt(d.date.split('-')[2]) }}
        </div>
      </div>
      <div class="ht-hm-legend">
        <span class="ht-hm-lg-label">少</span>
        <span class="ht-hm-lg c0"></span>
        <span class="ht-hm-lg c1"></span>
        <span class="ht-hm-lg c2"></span>
        <span class="ht-hm-lg c3"></span>
        <span class="ht-hm-lg-label">多</span>
      </div>
    </div>

    <!-- 创建习惯 -->
    <button class="ht-create" @click="showCreate = true">＋ 新习惯</button>

    <!-- 创建弹窗 -->
    <Transition name="fade">
      <div v-if="showCreate" class="ht-modal-overlay" @click.self="showCreate = false">
        <div class="ht-modal">
          <h3 class="ht-modal-title">创建新习惯</h3>
          <div class="ht-modal-row">
            <label>名称</label>
            <input v-model="newName" placeholder="例：每日阅读30分钟" maxlength="60" />
          </div>
          <div class="ht-modal-row">
            <label>图标</label>
            <div class="ht-icon-grid">
              <button
                v-for="ic in HABIT_ICONS"
                :key="ic"
                class="ht-icon-btn"
                :class="{ selected: newIcon === ic }"
                @click="newIcon = ic"
              >{{ ic }}</button>
            </div>
          </div>
          <div class="ht-modal-actions">
            <button class="ht-modal-cancel" @click="showCreate = false">取消</button>
            <button class="ht-modal-confirm" :disabled="!newName.trim()" @click="handleCreate">创建</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useHabit } from '../../composables/useHabit'
import { supabase } from '../../supabase'
import type { HeatmapDay } from '../../composables/useHabit'

const {
  habits, fetchHabits, createHabit,
  isTodayChecked, checkIn,
  getOverallHeatmap, getLocalDate,
  HABIT_ICONS,
} = useHabit()

// 状态
const checkedMap = ref<Record<string, boolean>>({})
const weekLogsMap = ref<Record<string, Set<string>>>({})
const showCreate = ref(false)
const newName = ref('')
const newIcon = ref('🎯')

// 热力图
const today = getLocalDate()
const now = new Date()
const heatmapYear = ref(now.getFullYear())
const heatmapMonth = ref(now.getMonth() + 1)
const heatmapDays = ref<HeatmapDay[]>([])

// 本周日期
const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
const weekDays = computed(() => {
  const d = new Date()
  const dayOfWeek = d.getDay()
  const result: string[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d)
    dd.setDate(dd.getDate() - dayOfWeek + i)
    result.push(dd.toISOString().split('T')[0])
  }
  return result
})

// 月初偏移（第一天是周几）
const firstDayOffset = computed(() => {
  const d = new Date(heatmapYear.value, heatmapMonth.value - 1, 1)
  return d.getDay()
})

// 热力图颜色等级
function heatCellClass(d: HeatmapDay) {
  if (d.count === 0) return 'c0'
  if (d.count <= 1) return 'c1'
  if (d.count <= 3) return 'c2'
  return 'c3'
}

function prevMonth() {
  if (heatmapMonth.value === 1) { heatmapMonth.value = 12; heatmapYear.value-- }
  else heatmapMonth.value--
}
function nextMonth() {
  if (heatmapMonth.value === 12) { heatmapMonth.value = 1; heatmapYear.value++ }
  else heatmapMonth.value++
}

// 打卡
async function handleCheckIn(habitId: string) {
  const ok = await checkIn(habitId)
  if (ok) {
    checkedMap.value[habitId] = true
    // 更新本周视图
    if (!weekLogsMap.value[habitId]) weekLogsMap.value[habitId] = new Set()
    weekLogsMap.value[habitId].add(today)
    await loadHeatmap()
  }
}

// 创建习惯
async function handleCreate() {
  if (!newName.value.trim()) return
  await createHabit(newName.value.trim(), newIcon.value)
  newName.value = ''
  newIcon.value = '🎯'
  showCreate.value = false
}

// 加载热力图
async function loadHeatmap() {
  heatmapDays.value = await getOverallHeatmap(heatmapYear.value, heatmapMonth.value)
}

// 加载本周打卡记录
async function loadWeekLogs() {
  if (!habits.value.length) return
  const startDate = weekDays.value[0]
  const endDate = weekDays.value[6]
  
  for (const h of habits.value) {
    const { data } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', h.id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
    weekLogsMap.value[h.id] = new Set((data || []).map(l => l.log_date))
  }
}

// 初始化
onMounted(async () => {
  await fetchHabits()
  // 检查每个习惯今日是否已打卡 + 本周数据
  for (const h of habits.value) {
    checkedMap.value[h.id] = await isTodayChecked(h.id)
  }
  await loadWeekLogs()
  await loadHeatmap()
})

watch([heatmapYear, heatmapMonth], loadHeatmap)
</script>

<style scoped>
.habit-tracker{display:flex;flex-direction:column;gap:12px}
.ht-empty{text-align:center;padding:24px;color:rgba(255,255,255,.25);font-size:13px}
.ht-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px}
.ht-header{display:flex;align-items:center;gap:10px}
.ht-icon{font-size:22px}
.ht-name-wrap{flex:1;display:flex;flex-direction:column;gap:2px}
.ht-name{font-size:14px;color:rgba(255,255,255,.75);font-weight:500}
.ht-streak{font-size:11px;color:rgba(245,158,11,.6)}
.ht-check-btn{padding:6px 14px;border-radius:16px;border:1px solid rgba(139,92,246,.2);background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.ht-check-btn:hover:not(:disabled){background:rgba(139,92,246,.15);color:rgba(139,92,246,.9)}
.ht-check-btn.checked{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.15);color:rgba(34,197,94,.6);cursor:default}
.ht-week{display:flex;gap:4px;margin-top:10px}
.ht-day{width:28px;height:28px;border-radius:6px;font-size:10px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04)}
.ht-day.active{background:rgba(139,92,246,.15);border-color:rgba(139,92,246,.25);color:rgba(139,92,246,.7)}
.ht-day.today{border-color:rgba(245,197,94,.25)}

/* 热力图 */
.ht-heatmap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px}
.ht-hm-header{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:10px}
.ht-hm-nav{background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0 4px}
.ht-hm-title{font-size:13px;color:rgba(255,255,255,.5);font-weight:500}
.ht-hm-labels{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px}
.ht-hm-wk{text-align:center;font-size:10px;color:rgba(255,255,255,.2);padding:2px 0}
.ht-hm-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.ht-hm-cell{aspect-ratio:1;border-radius:3px;font-size:9px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.2)}
.ht-hm-cell.empty{background:transparent}
.ht-hm-cell.c0{background:rgba(255,255,255,.03)}
.ht-hm-cell.c1{background:rgba(59,130,246,.2);color:rgba(255,255,255,.4)}
.ht-hm-cell.c2{background:rgba(139,92,246,.35);color:rgba(255,255,255,.6)}
.ht-hm-cell.c3{background:rgba(245,158,11,.5);color:rgba(255,255,255,.8)}
.ht-hm-legend{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:8px}
.ht-hm-lg-label{font-size:10px;color:rgba(255,255,255,.2)}
.ht-hm-lg{width:12px;height:12px;border-radius:2px}
.ht-hm-lg.c0{background:rgba(255,255,255,.03)}
.ht-hm-lg.c1{background:rgba(59,130,246,.2)}
.ht-hm-lg.c2{background:rgba(139,92,246,.35)}
.ht-hm-lg.c3{background:rgba(245,158,11,.5)}

.ht-create{padding:10px;border-radius:10px;border:1px dashed rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.3);font-size:13px;cursor:pointer;transition:all .2s}
.ht-create:hover{border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.5)}

/* 创建弹窗 */
.ht-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
.ht-modal{background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.15);border-radius:20px;padding:24px;width:90%;max-width:360px}
.ht-modal-title{font-size:16px;color:rgba(255,255,255,.8);font-weight:600;margin:0 0 16px;text-align:center}
.ht-modal-row{margin-bottom:14px}
.ht-modal-row label{display:block;font-size:12px;color:rgba(255,255,255,.35);margin-bottom:6px}
.ht-modal-row input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:14px;outline:none;box-sizing:border-box}
.ht-modal-row input:focus{border-color:rgba(139,92,246,.25)}
.ht-icon-grid{display:flex;gap:6px;flex-wrap:wrap}
.ht-icon-btn{width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);font-size:18px;cursor:pointer;transition:all .2s}
.ht-icon-btn.selected{border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.1)}
.ht-modal-actions{display:flex;gap:8px;margin-top:4px}
.ht-modal-cancel,.ht-modal-confirm{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.ht-modal-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.ht-modal-confirm{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.ht-modal-confirm:disabled{opacity:.3;cursor:default}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
