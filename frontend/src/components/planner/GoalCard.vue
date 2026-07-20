<template>
  <!-- 目标卡片：任务管理 + 编辑/删除 + 推送 + 记录 -->
  <div class="goal-card" :class="{ expanded }">
    <div class="gc-top" @click="expanded = !expanded">
      <div class="gc-header">
        <span class="gc-type" :style="{ color: typeConfig.color }">{{ typeConfig.label }}</span>
        <span class="gc-days" :class="urgencyClass">{{ daysLeft }}天</span>
      </div>
      <h3 class="gc-title">{{ goal.title }}</h3>
      <div class="gc-progress">
        <div class="gc-bar" :style="{ width: `${goal.total_progress}%`, background: barColor }"></div>
      </div>
      <div class="gc-pct-row">
        <span class="gc-pct">{{ goal.total_progress.toFixed(0) }}%</span>
        <span class="gc-expand-hint">{{ expanded ? '收起 ▲' : '展开任务 ▼' }}</span>
      </div>
    </div>

    <!-- 展开：任务列表 -->
    <Transition name="slide">
      <div v-if="expanded" class="gc-detail">
        <div v-if="tasks.length === 0" class="gc-no-tasks">还没有任务</div>
        <div v-for="t in tasks" :key="t.id" class="gc-task" :class="{ done: t.is_completed }">
          <button class="gc-check" @click.stop="handleComplete(t)" :disabled="t.is_completed">
            {{ t.is_completed ? '✅' : '⭕' }}
          </button>
          <div class="gc-task-info">
            <span class="gc-task-name">{{ t.title }}</span>
            <div class="gc-task-meta">
              <span v-if="t.due_date" class="gc-task-date">{{ formatDate(t.due_date) }}</span>
              <span v-if="t.schedule_event_id" class="gc-task-synced">📅 已同步</span>
            </div>
          </div>
          <!-- 未完成任务的操作 -->
          <div class="gc-task-acts" v-if="!t.is_completed">
            <button class="gc-tact sync" title="同步到日程" v-if="t.due_date && !t.schedule_event_id" @click.stop="$emit('pushToSchedule', t)">📅</button>
            <button class="gc-tact unsync" title="取消同步日程" v-if="t.schedule_event_id" @click.stop="$emit('unsyncSchedule', t)">🔗</button>
            <button class="gc-tact jump" title="查看日程" v-if="t.schedule_event_id" @click.stop="$emit('jumpToSchedule', t)">↗️</button>
            <button class="gc-tact record" title="提交记录" @click.stop="$emit('recordTask', t)">📸</button>
            <button class="gc-tact edit" title="编辑" @click.stop="$emit('editTask', t)">✏️</button>
            <button class="gc-tact del" title="删除" @click.stop="handleDelete(t.id)">🗑️</button>
          </div>
        </div>

        <div class="gc-bottom">
          <button class="gc-act-btn add" @click.stop="$emit('addTask', goal.id)">＋ 添加任务</button>
          <button class="gc-act-btn arch" @click.stop="$emit('archive', goal.id)">📦 归档</button>
          <button class="gc-act-btn danger" @click.stop="$emit('deleteGoal', goal.id)">🗑️ 删除</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Goal, PlannerTask } from '../../composables/usePlanner'
import { usePlanner } from '../../composables/usePlanner'

const props = defineProps<{ goal: Goal }>()
const emit = defineEmits<{
  completeTask: [taskId: string]
  deleteTask: [taskId: string]
  editTask: [task: PlannerTask]
  addTask: [goalId: string]
  archive: [goalId: string]
  deleteGoal: [goalId: string]
  pushToSchedule: [task: PlannerTask]
  unsyncSchedule: [task: PlannerTask]
  jumpToSchedule: [task: PlannerTask]
  recordTask: [task: PlannerTask]
}>()

const { daysUntil, getGoalTypeConfig, fetchTasks } = usePlanner()
const expanded = ref(false)
const tasks = ref<PlannerTask[]>([])

const typeConfig = computed(() => getGoalTypeConfig(props.goal.goal_type))
const daysLeft = computed(() => daysUntil(props.goal.deadline))

const urgencyClass = computed(() => {
  const total = Math.ceil((new Date(props.goal.deadline).getTime() - new Date(props.goal.created_at).getTime()) / 86400000)
  const ratio = daysLeft.value / Math.max(total, 1)
  if (ratio > 0.5) return 'calm'
  if (ratio > 0.2) return 'warn'
  return 'urgent'
})

const barColor = computed(() => {
  const p = props.goal.total_progress
  if (p >= 80) return 'linear-gradient(90deg,#22c55e,#4ade80)'
  if (p >= 40) return 'linear-gradient(90deg,#8b5cf6,#a78bfa)'
  return 'linear-gradient(90deg,#6366f1,#818cf8)'
})

function formatDate(d: string): string {
  const today = new Date()
  const target = new Date(d + 'T00:00:00')
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return '📅 今天'
  if (diff === 1) return '📅 明天'
  if (diff < 0) return `⚠️ 逾期${Math.abs(diff)}天`
  return `📅 ${d.slice(5)}`
}

// 完成任务 - 先更新本地，再通知父组件
function handleComplete(task: PlannerTask) {
  if (task.is_completed) return
  // 乐观更新本地状态
  task.is_completed = true
  task.status = 'completed'
  // 通知父组件处理数据库更新
  emit('completeTask', task.id)
}

// 删除任务 - 先更新本地，再通知父组件
function handleDelete(taskId: string) {
  tasks.value = tasks.value.filter(t => t.id !== taskId)
  emit('deleteTask', taskId)
}

watch(expanded, async (v) => {
  if (v && tasks.value.length === 0) {
    tasks.value = await fetchTasks(props.goal.id)
  }
})
</script>

<style scoped>
.goal-card{background:rgba(15,12,30,.6);border:1px solid rgba(255,255,255,.05);border-radius:16px;transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.goal-card:hover{border-color:rgba(139,92,246,.08);box-shadow:0 4px 16px rgba(0,0,0,.15)}
.goal-card.expanded{border-color:rgba(139,92,246,.15);box-shadow:0 4px 20px rgba(139,92,246,.06)}
.gc-top{padding:14px;cursor:pointer}
.gc-top:hover{background:rgba(255,255,255,.01)}
.gc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.gc-type{font-size:11px;font-weight:600}
.gc-days{font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px}
.gc-days.calm{color:#22c55e;background:rgba(34,197,94,.08)}
.gc-days.warn{color:#f59e0b;background:rgba(245,158,11,.08)}
.gc-days.urgent{color:#ef4444;background:rgba(239,68,68,.08)}
.gc-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 8px}
.gc-progress{width:100%;height:3px;background:rgba(255,255,255,.04);border-radius:2px;overflow:hidden}
.gc-bar{height:100%;border-radius:2px;transition:width .6s cubic-bezier(.4,0,.2,1);box-shadow:0 0 6px rgba(139,92,246,.15)}
.gc-pct-row{display:flex;justify-content:space-between;margin-top:4px}
.gc-pct{font-size:10px;color:rgba(255,255,255,.25)}
.gc-expand-hint{font-size:10px;color:rgba(139,92,246,.3)}

.gc-detail{padding:0 14px 14px;border-top:1px solid rgba(255,255,255,.03)}
.gc-no-tasks{font-size:12px;color:rgba(255,255,255,.2);text-align:center;padding:12px}
.gc-task{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.02)}
.gc-task.done{opacity:.35}
.gc-check{background:none;border:none;font-size:14px;cursor:pointer;padding:0;flex-shrink:0}
.gc-check:disabled{cursor:default}
.gc-task-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.gc-task-name{font-size:12px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gc-task.done .gc-task-name{text-decoration:line-through}
.gc-task-meta{display:flex;gap:6px;align-items:center}
.gc-task-date{font-size:10px;color:rgba(255,255,255,.2)}
.gc-task-synced{font-size:9px;color:rgba(34,197,94,.4)}
.gc-task-acts{display:flex;gap:2px;flex-shrink:0}
.gc-tact{background:none;border:none;font-size:11px;cursor:pointer;opacity:.3;transition:opacity .2s;padding:3px}
.gc-tact:hover{opacity:.7}
.gc-tact.sync{color:rgba(59,130,246,.6)}
.gc-tact.unsync{color:rgba(245,158,11,.5)}
.gc-tact.unsync:hover{color:rgba(245,158,11,.8)}
.gc-tact.jump{color:rgba(34,197,94,.5);font-size:10px}
.gc-tact.jump:hover{color:rgba(34,197,94,.8)}
.gc-tact.record{font-size:12px}
.gc-tact.edit{color:rgba(255,255,255,.5)}
.gc-tact.del{color:rgba(239,68,68,.6)}
.gc-tact.del:hover{opacity:.9}

.gc-bottom{display:flex;gap:6px;margin-top:10px}
.gc-act-btn{flex:1;padding:7px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1)}
.gc-act-btn:hover{background:rgba(139,92,246,.06);color:rgba(255,255,255,.55)}
.gc-act-btn.add:hover{background:rgba(139,92,246,.08)}
.gc-act-btn.arch:hover{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.1)}
.gc-act-btn.danger{border-color:rgba(239,68,68,.06)}
.gc-act-btn.danger:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.6);border-color:rgba(239,68,68,.12)}

.slide-enter-active,.slide-leave-active{transition:all .25s ease}
.slide-enter-from,.slide-leave-to{opacity:0;max-height:0}
.slide-enter-to,.slide-leave-from{opacity:1;max-height:600px}
</style>
