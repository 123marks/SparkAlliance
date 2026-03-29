<template>
  <!-- 健康挑战组件 -->
  <div class="health-challenges">
    <div class="hc-header">
      <h3 class="hc-title">🎯 健康挑战</h3>
      <button class="hc-add-btn" @click="showTemplates = true">+ 参加挑战</button>
    </div>

    <!-- 进行中的挑战 -->
    <div v-if="challenges.length === 0" class="hc-empty">
      <p>还没有进行中的挑战</p>
      <p class="hc-hint">参加挑战可以获得额外经验值奖励</p>
    </div>

    <div v-else class="hc-list">
      <div v-for="c in challenges" :key="c.id" class="hc-card" :class="[c.challenge_type, c.status]">
        <div class="hc-card-header">
          <span class="hc-type-icon">{{ typeIcon(c.challenge_type) }}</span>
          <div class="hc-card-info">
            <span class="hc-card-title">{{ c.title }}</span>
            <span class="hc-card-desc">{{ c.description }}</span>
          </div>
          <div class="hc-card-xp">+{{ c.reward_xp }} XP</div>
        </div>

        <!-- 进度条 -->
        <div class="hc-progress">
          <div class="hc-bar">
            <div class="hc-fill" :style="{ width: `${progressPct(c)}%` }"></div>
          </div>
          <span class="hc-progress-text">{{ c.completed_days }} / {{ c.target_days }} 天</span>
        </div>

        <!-- 剩余时间 -->
        <div class="hc-footer">
          <span class="hc-remaining">{{ remainingDays(c) }}</span>
          <button v-if="c.status === 'active'" class="hc-abandon" @click="abandonChallenge(c)">放弃</button>
          <span v-else-if="c.status === 'completed'" class="hc-status completed">✅ 已完成</span>
        </div>
      </div>
    </div>

    <!-- 挑战模板选择弹窗 -->
    <Transition name="fade">
      <div v-if="showTemplates" class="hc-modal-overlay" @click.self="showTemplates = false">
        <div class="hc-modal">
          <h3 class="hc-modal-title">选择挑战</h3>
          <div class="hc-templates">
            <button
              v-for="t in CHALLENGE_TEMPLATES"
              :key="t.title"
              class="hc-template"
              :class="t.type"
              @click="joinChallenge(t)"
              :disabled="hasActiveChallenge(t.type)"
            >
              <span class="hc-tmpl-icon">{{ typeIcon(t.type) }}</span>
              <div class="hc-tmpl-info">
                <span class="hc-tmpl-title">{{ t.title }}</span>
                <span class="hc-tmpl-desc">{{ t.description }}</span>
                <span class="hc-tmpl-meta">{{ t.target_days }}天 · +{{ t.reward_xp }} XP</span>
              </div>
              <span class="hc-tmpl-arrow" v-if="!hasActiveChallenge(t.type)">→</span>
              <span class="hc-tmpl-active" v-else>进行中</span>
            </button>
          </div>
          <button class="hc-modal-close" @click="showTemplates = false">关闭</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHealth, CHALLENGE_TEMPLATES } from '../../composables/useHealth'
import type { HealthChallenge } from '../../composables/useHealth'

const emit = defineEmits<{
  joined: [challenge: HealthChallenge]
  abandoned: [challengeId: string]
}>()

const {
  challenges,
  loadChallenges,
  joinChallenge: doJoinChallenge,
} = useHealth()

const showTemplates = ref(false)

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    sleep: '😴',
    exercise: '💪',
    water: '💧',
    meal: '🍱',
    custom: '🎯',
  }
  return icons[type] || '🎯'
}

function progressPct(c: HealthChallenge): number {
  return Math.round((c.completed_days / c.target_days) * 100)
}

function remainingDays(c: HealthChallenge): string {
  const end = new Date(c.end_date)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000)
  if (diff <= 0) return '已结束'
  if (diff === 1) return '最后1天'
  return `剩余 ${diff} 天`
}

function hasActiveChallenge(type: string): boolean {
  return challenges.value.some(c => c.challenge_type === type && c.status === 'active')
}

async function joinChallenge(template: typeof CHALLENGE_TEMPLATES[number]) {
  if (hasActiveChallenge(template.type)) return
  const challenge = await doJoinChallenge(template)
  if (challenge) {
    showTemplates.value = false
    emit('joined', challenge)
  }
}

async function abandonChallenge(c: HealthChallenge) {
  if (!confirm(`确定要放弃「${c.title}」挑战吗？\n放弃后将无法获得经验值奖励。`)) return
  // 这里应该调用 API 更新状态为 abandoned
  emit('abandoned', c.id)
}

onMounted(loadChallenges)
</script>

<style scoped>
.health-challenges{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:20px}
.hc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.hc-title{font-size:16px;font-weight:700;color:white;margin:0}
.hc-add-btn{padding:6px 14px;border-radius:14px;border:1px dashed rgba(139,92,246,.2);background:transparent;color:rgba(139,92,246,.6);font-size:12px;cursor:pointer;transition:all .2s}
.hc-add-btn:hover{background:rgba(139,92,246,.08);border-style:solid}

.hc-empty{text-align:center;padding:24px}
.hc-empty p{font-size:14px;color:rgba(255,255,255,.3);margin:0}
.hc-hint{font-size:12px!important;color:rgba(255,255,255,.2)!important;margin-top:6px!important}

.hc-list{display:flex;flex-direction:column;gap:12px}
.hc-card{padding:16px;border-radius:14px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
.hc-card.sleep{border-color:rgba(139,92,246,.15);background:linear-gradient(135deg,rgba(139,92,246,.06),transparent)}
.hc-card.exercise{border-color:rgba(245,158,11,.15);background:linear-gradient(135deg,rgba(245,158,11,.06),transparent)}
.hc-card.water{border-color:rgba(59,130,246,.15);background:linear-gradient(135deg,rgba(59,130,246,.06),transparent)}
.hc-card.meal{border-color:rgba(16,185,129,.15);background:linear-gradient(135deg,rgba(16,185,129,.06),transparent)}
.hc-card.completed{opacity:.6}

.hc-card-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.hc-type-icon{font-size:28px;flex-shrink:0}
.hc-card-info{flex:1;display:flex;flex-direction:column;gap:2px}
.hc-card-title{font-size:14px;font-weight:600;color:white}
.hc-card-desc{font-size:12px;color:rgba(255,255,255,.4)}
.hc-card-xp{padding:4px 10px;border-radius:10px;background:rgba(245,158,11,.1);color:rgba(245,158,11,.7);font-size:11px;font-weight:600;flex-shrink:0}

.hc-progress{margin-bottom:10px}
.hc-bar{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;margin-bottom:4px}
.hc-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#f59e0b);border-radius:3px;transition:width .5s ease}
.hc-progress-text{font-size:11px;color:rgba(255,255,255,.3)}

.hc-footer{display:flex;justify-content:space-between;align-items:center}
.hc-remaining{font-size:12px;color:rgba(255,255,255,.35)}
.hc-abandon{background:none;border:none;color:rgba(239,68,68,.5);font-size:12px;cursor:pointer}
.hc-abandon:hover{color:rgba(239,68,68,.8)}
.hc-status.completed{font-size:12px;color:rgba(34,197,94,.6)}

/* 弹窗 */
.hc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}
.hc-modal{background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.15);border-radius:20px;padding:24px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto}
.hc-modal-title{font-size:18px;font-weight:700;color:white;margin:0 0 16px;text-align:center}
.hc-templates{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.hc-template{display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);cursor:pointer;transition:all .2s;text-align:left;width:100%}
.hc-template:hover:not(:disabled){background:rgba(139,92,246,.06);border-color:rgba(139,92,246,.15)}
.hc-template:disabled{opacity:.5;cursor:not-allowed}
.hc-template.sleep:hover:not(:disabled){border-color:rgba(139,92,246,.2)}
.hc-template.exercise:hover:not(:disabled){border-color:rgba(245,158,11,.2)}
.hc-template.water:hover:not(:disabled){border-color:rgba(59,130,246,.2)}
.hc-template.meal:hover:not(:disabled){border-color:rgba(16,185,129,.2)}
.hc-tmpl-icon{font-size:28px;flex-shrink:0}
.hc-tmpl-info{flex:1;display:flex;flex-direction:column;gap:2px}
.hc-tmpl-title{font-size:14px;font-weight:600;color:white}
.hc-tmpl-desc{font-size:11px;color:rgba(255,255,255,.4)}
.hc-tmpl-meta{font-size:11px;color:rgba(139,92,246,.5);margin-top:2px}
.hc-tmpl-arrow{font-size:16px;color:rgba(139,92,246,.4);flex-shrink:0}
.hc-tmpl-active{font-size:11px;color:rgba(245,158,11,.5);flex-shrink:0}
.hc-modal-close{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.4);font-size:13px;cursor:pointer}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
