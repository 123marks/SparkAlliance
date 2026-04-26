<template>
  <!-- 历史面板：已完成+已归档目标 + 评语/分享 -->
  <div class="history-panel">
    <div v-if="goals.length === 0" class="hp-empty">
      <p>🏆 这里将记录你完成的每一个目标</p>
      <p class="hp-sub">完成或归档目标后，会出现在这里</p>
    </div>

    <div v-for="g in goals" :key="g.id" class="hp-card">
      <div class="hp-header">
        <span class="hp-status" :class="g.status">{{ g.status === 'completed' ? '✅ 已完成' : '📦 已归档' }}</span>
        <span class="hp-date">{{ formatDate(g.updated_at) }}</span>
      </div>
      <h3 class="hp-title">{{ g.title }}</h3>
      <div class="hp-progress-bar">
        <div class="hp-bar" :style="{ width: `${g.total_progress}%` }"></div>
      </div>
      <span class="hp-pct">完成度 {{ g.total_progress.toFixed(0) }}%</span>

      <!-- 已有评语 -->
      <div v-if="g.review" class="hp-review">
        <div class="hp-review-stars">
          <span v-for="s in 5" :key="s" :class="{ dim: s > g.review.rating }">⭐</span>
        </div>
        <p class="hp-review-text">{{ g.review.content }}</p>
        <p v-if="g.review.improvements" class="hp-review-improve">💡 改进：{{ g.review.improvements }}</p>
      </div>

      <!-- 操作 -->
      <div class="hp-actions">
        <button v-if="!g.review" class="hp-btn" @click="$emit('review', g.id)">📝 写评语</button>
        <button class="hp-btn share" @click="$emit('share', g.id)">🚀 分享到广场</button>
        <button class="hp-btn friend" @click="$emit('shareFriend', g.id)">💬 分享给好友</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Goal, GoalReview } from '../../composables/usePlanner'

defineProps<{
  goals: (Goal & { review?: GoalReview })[]
}>()

defineEmits<{
  review: [goalId: string]
  share: [goalId: string]
  shareFriend: [goalId: string]
}>()

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}


</script>

<style scoped>
.history-panel{display:flex;flex-direction:column;gap:10px}
.hp-empty{text-align:center;padding:40px 20px}
.hp-empty p{font-size:14px;color:rgba(255,255,255,.25);margin:0}
.hp-sub{font-size:12px!important;color:rgba(255,255,255,.15)!important;margin-top:6px!important}

.hp-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px}
.hp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.hp-status{font-size:11px;font-weight:600}
.hp-status.completed{color:rgba(34,197,94,.6)}
.hp-status.archived{color:rgba(255,255,255,.3)}
.hp-date{font-size:11px;color:rgba(255,255,255,.2)}
.hp-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);margin:0 0 8px}
.hp-progress-bar{width:100%;height:3px;background:rgba(255,255,255,.04);border-radius:2px;overflow:hidden}
.hp-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,#22c55e,#4ade80)}
.hp-pct{font-size:10px;color:rgba(255,255,255,.2);display:block;text-align:right;margin-top:3px}

.hp-review{margin-top:10px;padding:10px;background:rgba(139,92,246,.04);border-radius:10px;border:1px solid rgba(139,92,246,.06)}
.hp-review-stars{margin-bottom:6px}
.hp-review-stars span{font-size:14px}
.hp-review-stars .dim{opacity:.15}
.hp-review-text{font-size:13px;color:rgba(255,255,255,.55);margin:0;line-height:1.5}
.hp-review-improve{font-size:12px;color:rgba(245,158,11,.4);margin:6px 0 0}

.hp-actions{display:flex;gap:8px;margin-top:10px}
.hp-btn{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:12px;cursor:pointer;transition:all .2s}
.hp-btn:hover{background:rgba(139,92,246,.06);color:rgba(255,255,255,.55)}
.hp-btn.share{border-color:rgba(34,197,94,.1)}
.hp-btn.share:hover{background:rgba(34,197,94,.06);color:rgba(34,197,94,.6)}
.hp-btn.friend{border-color:rgba(59,130,246,.1)}
.hp-btn.friend:hover{background:rgba(59,130,246,.06);color:rgba(59,130,246,.6)}
</style>
