<template>
  <div class="si-col">
    <!-- 待安排事项 -->
    <section class="si-card">
      <div class="si-head">
        <h4>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          待安排事项 <em v-if="backlog.length">· {{ backlog.length }}</em>
        </h4>
        <router-link class="si-link" to="/app/schedule?module=planner&tab=today">管理任务</router-link>
      </div>

      <div v-if="backlogState === 'loading'" class="si-skeleton">
        <span v-for="i in 4" :key="i" class="si-skel-row" :style="{ animationDelay: `${i * 80}ms` }"></span>
      </div>
      <div v-else-if="backlogState === 'error'" class="si-empty si-error">
        待办同步失败
        <button class="si-mini-btn" type="button" @click="$emit('reload-backlog')">重试</button>
      </div>
      <div v-else-if="backlog.length === 0" class="si-empty">
        没有等待安排的任务
        <router-link class="si-mini-btn" to="/app/schedule?module=planner">去创建目标</router-link>
      </div>
      <ul v-else class="si-list">
        <li v-for="task in backlog" :key="task.id" class="si-task">
          <span class="si-task-dot" :class="`si-diff-${Math.min(5, Math.max(1, task.difficulty || 2))}`" aria-hidden="true"></span>
          <div class="si-task-body">
            <span class="si-task-title">{{ task.title }}</span>
            <span class="si-task-meta">
              <em v-if="task.goalTitle" class="si-task-tag">{{ task.goalTitle }}</em>
              <span>{{ task.estimated_minutes || 45 }}min</span>
              <span v-if="task.due_date">· {{ dueLabel(task.due_date) }}</span>
            </span>
          </div>
          <button class="si-task-add" type="button" :title="`把「${task.title}」排入日程`" @click="$emit('schedule-task', task)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </li>
      </ul>
    </section>

    <!-- AI 智能编排建议 -->
    <section class="si-card si-ai">
      <div class="si-head">
        <h4>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 2l1.9 5.7 5.7 1.9-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9z"/></svg>
          AI 智能编排建议
        </h4>
      </div>

      <div v-if="conflictPairs.length === 0" class="si-ai-ok">
        <span class="si-ai-ok-icon" aria-hidden="true">✓</span>
        <div>
          <strong>今天没有时间冲突</strong>
          <p v-if="focusWindow">最佳专注窗口：{{ focusWindow }}</p>
        </div>
      </div>
      <template v-else>
        <div v-if="reflow" class="si-reflow">
          <div class="si-reflow-copy">
            <strong>建议将「{{ reflow.title }}」移到 {{ reflow.label }}</strong>
            <span>检测到 {{ conflictPairs.length }} 处冲突，移动后可化解首个</span>
          </div>
          <button class="si-reflow-btn" type="button" @click="$emit('apply-reflow')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
            一键重排
          </button>
        </div>
        <div class="si-conflict" v-for="(pair, idx) in conflictPairs.slice(0, 3)" :key="idx">
          <span class="si-conflict-badge" aria-hidden="true">⚠</span>
          <div class="si-conflict-body">
            <strong>「{{ pair.a.title }}」与「{{ pair.b.title }}」重叠</strong>
            <span>{{ pair.overlapLabel }}</span>
          </div>
          <button class="si-mini-btn" type="button" @click="$emit('jump-event', pair.b.id)">查看</button>
        </div>
      </template>

      <p v-if="focusWindow && conflictPairs.length > 0" class="si-focus-note">最佳专注窗口：{{ focusWindow }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PlannerTask } from '../../composables/usePlanner'

export interface ConflictPair {
  a: { id: string; title: string }
  b: { id: string; title: string }
  overlapLabel: string
}

defineProps<{
  backlog: PlannerTask[]
  backlogState: 'loading' | 'ready' | 'error'
  conflictPairs: ConflictPair[]
  /** 建议移动方案（null = 无法给出） */
  reflow: { title: string; label: string } | null
  /** 最长空闲窗口文案 */
  focusWindow: string
}>()

defineEmits<{
  (e: 'schedule-task', task: PlannerTask): void
  (e: 'jump-event', id: string): void
  (e: 'apply-reflow'): void
  (e: 'reload-backlog'): void
}>()

function dueLabel(due: string): string {
  const today = new Date()
  const d = new Date(`${due}T00:00:00`)
  const diff = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000)
  if (diff < 0) return `逾期 ${-diff} 天`
  if (diff === 0) return '今天到期'
  if (diff === 1) return '明天到期'
  return `${diff} 天后`
}
</script>

<style scoped>
.si-col {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.si-col::-webkit-scrollbar { width: 3px; }
.si-col::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.1); border-radius: 3px; }

.si-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.08);
  background: rgba(15, 12, 30, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.si-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.si-head h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}
.si-head h4 em { font-style: normal; color: rgba(167, 139, 250, 0.7); font-size: 11px; }
.si-link { font-size: 10.5px; color: rgba(196, 181, 253, 0.5); text-decoration: none; transition: color 0.15s; }
.si-link:hover { color: #c4b5fd; }

.si-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.si-task {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.015);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.si-task:hover { border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.05); transform: translateX(2px); }

.si-task-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.si-diff-1, .si-diff-2 { background: #34d399; box-shadow: 0 0 6px rgba(52, 211, 153, 0.5); }
.si-diff-3 { background: #60a5fa; box-shadow: 0 0 6px rgba(96, 165, 250, 0.5); }
.si-diff-4 { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.5); }
.si-diff-5 { background: #f87171; box-shadow: 0 0 6px rgba(248, 113, 113, 0.5); }

.si-task-body { flex: 1; min-width: 0; }
.si-task-title {
  display: block;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.si-task-meta { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 9.5px; color: rgba(255, 255, 255, 0.26); }
.si-task-tag {
  font-style: normal;
  padding: 0 5px;
  border-radius: 4px;
  background: rgba(139, 92, 246, 0.12);
  color: rgba(196, 181, 253, 0.7);
  font-size: 8.5px;
  line-height: 1.6;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.si-task-add {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: rgba(139, 92, 246, 0.08);
  color: rgba(196, 181, 253, 0.7);
  cursor: pointer;
  transition: all 0.18s;
}
.si-task-add:hover { background: rgba(139, 92, 246, 0.25); color: #fff; box-shadow: 0 2px 10px rgba(139, 92, 246, 0.25); }

.si-empty {
  padding: 16px 0 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.24);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.si-error { color: rgba(248, 113, 113, 0.6); }
.si-mini-btn {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.24);
  background: rgba(139, 92, 246, 0.08);
  color: rgba(196, 181, 253, 0.75);
  font-size: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.18s;
  flex-shrink: 0;
}
.si-mini-btn:hover { background: rgba(139, 92, 246, 0.2); color: #ede9fe; }

.si-skeleton { display: flex; flex-direction: column; gap: 6px; }
.si-skel-row {
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(139,92,246,0.06) 50%, rgba(255,255,255,0.02) 75%);
  background-size: 200% 100%;
  animation: siShimmer 1.4s ease infinite;
}
@keyframes siShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* AI 卡 */
.si-ai {
  border-color: rgba(251, 191, 36, 0.1);
  background:
    radial-gradient(circle at 90% 8%, rgba(251, 191, 36, 0.06), transparent 40%),
    rgba(15, 12, 30, 0.6);
}

.si-ai-ok { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.si-ai-ok-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  font-weight: 800;
}
.si-ai-ok strong { display: block; font-size: 12px; color: rgba(255, 255, 255, 0.78); }
.si-ai-ok p { margin: 2px 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.3); }

.si-conflict {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 11px;
  border: 1px solid rgba(251, 191, 36, 0.16);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.07), rgba(249, 115, 22, 0.02));
}
.si-conflict-badge { color: #fbbf24; font-size: 13px; flex-shrink: 0; }
.si-conflict-body { flex: 1; min-width: 0; }
.si-conflict-body strong {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.si-conflict-body span { font-size: 9.5px; color: rgba(251, 191, 36, 0.55); }

.si-reflow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.22);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(79, 70, 229, 0.06));
}
.si-reflow-copy { flex: 1; min-width: 0; }
.si-reflow-copy strong { display: block; font-size: 11px; color: #ede9fe; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.si-reflow-copy span { font-size: 9.5px; color: rgba(196, 181, 253, 0.5); }
.si-reflow-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.35);
  transition: all 0.2s;
}
.si-reflow-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 18px rgba(124, 58, 237, 0.5); }

.si-focus-note { margin: 8px 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.28); }

@media (prefers-reduced-motion: reduce) {
  .si-skel-row { animation: none; }
}

/* 窄于 1440px 时隐藏洞察列，保证日历 + 右栏可读 */
@media (max-width: 1439px) {
  .si-col { display: none; }
}
</style>
