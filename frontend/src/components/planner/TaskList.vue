<template>
  <!-- 任务列表：完成/编辑/删除/推送 -->
  <div class="task-list">
    <div v-if="tasks.length === 0" class="tl-empty">
      <p>✨ 暂无待办任务，添加一个试试</p>
    </div>
    <TransitionGroup name="task" tag="div" class="tl-grid">
      <div v-for="t in tasks" :key="t.id" class="tl-item" :class="{ completing: completingId === t.id }">
        <!-- 完成按钮 -->
        <button class="tl-check" @click="handleComplete(t)">
          <span class="tl-circle"></span>
        </button>
        <!-- 信息区 -->
        <div class="tl-info">
          <span class="tl-name">{{ t.title }}</span>
          <span class="tl-meta">
            <span v-if="t.goalTitle" class="tl-goal">{{ t.goalTitle }}</span>
            <span v-if="t.due_date" class="tl-date">{{ formatDate(t.due_date) }}</span>
            <span v-if="t.schedule_event_id" class="tl-synced">📅 已同步</span>
          </span>
        </div>
        <!-- 操作菜单 -->
        <div class="tl-actions">
          <button v-if="t.due_date && !t.schedule_event_id" class="tl-act sync" title="同步到日程" @click="$emit('push', t)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </button>
          <button class="tl-act record" title="提交记录" @click="$emit('record', t)">
            📸
          </button>
          <button class="tl-act edit" title="编辑" @click="$emit('edit', t)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="tl-act del" title="删除任务" @click="$emit('delete', t.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PlannerTask } from '../../composables/usePlanner'

defineProps<{ tasks: PlannerTask[] }>()
const emit = defineEmits<{
  complete: [taskId: string]
  delete: [taskId: string]
  edit: [task: PlannerTask]
  push: [task: PlannerTask]
  record: [task: PlannerTask]
}>()

const completingId = ref<string | null>(null)

function handleComplete(task: PlannerTask) {
  if (task.is_completed) return
  completingId.value = task.id
  setTimeout(() => {
    emit('complete', task.id)
    completingId.value = null
  }, 350)
}

function formatDate(d: string): string {
  const today = new Date()
  const target = new Date(d + 'T00:00:00')
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return '📅 今天'
  if (diff === 1) return '📅 明天'
  if (diff < 0) return `⚠️ 逾期${Math.abs(diff)}天`
  return `📅 ${d.slice(5)}`
}
</script>

<style scoped>
.task-list{display:flex;flex-direction:column}
.tl-grid{display:flex;flex-direction:column;gap:4px}
.tl-empty{text-align:center;padding:32px;color:rgba(255,255,255,.2);font-size:13px}
.tl-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);transition:all .3s}
.tl-item:hover{background:rgba(255,255,255,.04);border-color:rgba(139,92,246,.08)}
.tl-item.completing{background:rgba(34,197,94,.06);border-color:rgba(34,197,94,.15);transform:scale(.98)}
.tl-check{background:none;border:none;cursor:pointer;padding:0;flex-shrink:0}
.tl-circle{display:block;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(139,92,246,.25);transition:all .3s}
.tl-item.completing .tl-circle{background:rgba(34,197,94,.3);border-color:rgba(34,197,94,.5)}
.tl-info{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.tl-name{font-size:13px;color:rgba(255,255,255,.7);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tl-goal{font-size:10px;color:rgba(139,92,246,.5);background:rgba(139,92,246,.08);padding:1px 6px;border-radius:4px}
.tl-date{font-size:10px;color:rgba(255,255,255,.25)}
.tl-synced{font-size:9px;color:rgba(34,197,94,.4)}
.tl-actions{display:flex;gap:2px;flex-shrink:0;align-items:center}
.tl-act{background:none;border:none;cursor:pointer;opacity:.25;transition:all .2s;padding:4px;display:flex;align-items:center}
.tl-act:hover{opacity:.6}
.tl-act.sync{color:rgba(59,130,246,.7)}
.tl-act.sync:hover{opacity:.8}
.tl-act.edit{color:rgba(255,255,255,.5)}
.tl-act.record{font-size:12px}
.tl-act.record:hover{opacity:.8}
.tl-act.del{color:rgba(239,68,68,.5)}
.tl-act.del:hover{color:rgba(239,68,68,.8);opacity:1}

.task-enter-active,.task-leave-active{transition:all .35s ease}
.task-enter-from{opacity:0;transform:translateX(-16px)}
.task-leave-to{opacity:0;transform:translateX(16px)}
</style>
