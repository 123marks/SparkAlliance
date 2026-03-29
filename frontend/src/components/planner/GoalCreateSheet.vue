<template>
  <!-- 创建目标：3步引导 + 模板自动填充 + 日期校验 -->
  <Transition name="sheet">
    <div v-if="visible" class="gcs-overlay" @click.self="$emit('close')">
      <div class="gcs-sheet">
        <button class="gcs-close" @click="$emit('close')">✕</button>
        <div class="gcs-steps">
          <div v-for="s in 3" :key="s" class="gcs-dot" :class="{ active: step >= s, current: step === s }"></div>
        </div>

        <!-- Step 1：输入目标 -->
        <div v-if="step === 1" class="gcs-body">
          <h2 class="gcs-title">🌟 你想达成什么？</h2>
          <textarea v-model="goalTitle" class="gcs-input" rows="2" placeholder="例：3个月背完考研英语5500词" maxlength="200"></textarea>
          <div class="gcs-types">
            <button v-for="t in GOAL_TYPES" :key="t.value" class="gcs-type-btn" :class="{ selected: goalType === t.value }" @click="goalType = t.value">
              {{ t.label }}
            </button>
          </div>
          <!-- 截止日期在 Step 1 就填，这样 AI 拆解能用 -->
          <div class="gcs-deadline-row">
            <label class="gcs-label">📅 目标截止日期</label>
            <input v-model="deadline" type="date" class="gcs-date-input" :min="minDate" />
            <p v-if="deadline" class="gcs-days-hint">⏳ 还有 <strong>{{ daysLeft }}</strong> 天</p>
          </div>
          <button class="gcs-next" :disabled="!goalTitle.trim() || !goalType || !deadline" @click="goStep2">
            🪄 AI 帮我拆解
          </button>
        </div>

        <!-- Step 2：AI 拆解确认 -->
        <div v-if="step === 2" class="gcs-body">
          <h2 class="gcs-title">📋 AI 拆解计划</h2>

          <div v-if="aiLoading" class="gcs-loading">
            <div class="gcs-spinner"></div>
            <p>正在规划航线...</p>
          </div>

          <div v-else-if="plan" class="gcs-plan">
            <div class="gcs-section">
              <h3 class="gcs-sh">🗓️ 里程碑 ({{ plan.milestones.length }})</h3>
              <div v-for="(m, i) in plan.milestones" :key="i" class="gcs-ms">
                <span class="gcs-ms-idx">{{ i + 1 }}</span>
                <div class="gcs-ms-info">
                  <span class="gcs-ms-title">{{ m.title }}</span>
                  <span class="gcs-ms-desc" v-if="m.description">{{ m.description }}</span>
                  <span class="gcs-ms-date">📅 {{ m.target_date }}</span>
                </div>
              </div>
            </div>

            <div class="gcs-section">
              <h3 class="gcs-sh">📝 任务 ({{ plan.tasks.length }})</h3>
              <div class="gcs-task-list">
                <div v-for="(t, i) in plan.tasks" :key="i" class="gcs-tp">
                  <span class="gcs-tp-dot" :style="{ opacity: 0.3 + t.difficulty! * 0.14 }">●</span>
                  <span class="gcs-tp-name">{{ t.title }}</span>
                  <span class="gcs-tp-date">{{ t.due_date?.slice(5) }}</span>
                </div>
              </div>
            </div>

            <p class="gcs-edit-hint">💡 创建后可在目标卡片中编辑、取消或添加任务</p>
          </div>

          <div class="gcs-nav">
            <button class="gcs-back" @click="step = 1">← 返回</button>
            <button class="gcs-regen" @click="regenerate">🔄 重新生成</button>
            <button class="gcs-next" :disabled="!plan || creating" @click="handleCreate">
              {{ creating ? '创建中...' : '🎉 确认创建' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlanner, GOAL_TYPES } from '../../composables/usePlanner'
import type { AIPlan } from '../../composables/usePlanner'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; created: [goalId: string] }>()

const { aiDecomposeGoal, createGoal, savePlanToDB, daysUntil, getTomorrowDate } = usePlanner()

const step = ref(1)
const goalTitle = ref('')
const goalType = ref('')
const deadline = ref('')
const plan = ref<AIPlan | null>(null)
const aiLoading = ref(false)
const creating = ref(false)

// 最早选择明天
const minDate = computed(() => getTomorrowDate())
const daysLeft = computed(() => deadline.value ? daysUntil(deadline.value) : 0)

// 重置表单（弹窗关闭时）
watch(() => props.visible, (v) => {
  if (!v) {
    step.value = 1
    goalTitle.value = ''
    goalType.value = ''
    deadline.value = ''
    plan.value = null
    aiLoading.value = false
    creating.value = false
  }
})

async function goStep2() {
  step.value = 2
  await regenerate()
}

async function regenerate() {
  aiLoading.value = true
  plan.value = null
  plan.value = await aiDecomposeGoal(goalTitle.value, goalType.value, deadline.value)
  aiLoading.value = false
}

// 合并 Step2 + Step3（日期已在 Step1 填了）
async function handleCreate() {
  if (!plan.value || creating.value) return
  creating.value = true
  const goal = await createGoal(goalTitle.value.trim(), goalType.value, deadline.value)
  if (goal && plan.value) {
    await savePlanToDB(goal.id, plan.value)
    emit('created', goal.id)
  }
  creating.value = false
}
</script>

<style scoped>
.gcs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(6px);padding:20px}
.gcs-sheet{width:100%;max-width:440px;max-height:85vh;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:24px;padding:24px;overflow-y:auto;position:relative}
.gcs-close{position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(255,255,255,.3);font-size:18px;cursor:pointer}
.gcs-steps{display:flex;gap:8px;justify-content:center;margin-bottom:18px}
.gcs-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.1);transition:all .3s}
.gcs-dot.active{background:rgba(139,92,246,.5)}
.gcs-dot.current{background:rgba(139,92,246,.8);transform:scale(1.3)}
.gcs-body{display:flex;flex-direction:column;gap:14px}
.gcs-title{font-size:17px;font-weight:600;color:rgba(255,255,255,.85);text-align:center;margin:0}
.gcs-input{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:14px;outline:none;resize:none;box-sizing:border-box;font-family:inherit}
.gcs-input:focus{border-color:rgba(139,92,246,.25)}
.gcs-types{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.gcs-type-btn{padding:6px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;transition:all .2s}
.gcs-type-btn.selected{border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.1);color:rgba(139,92,246,.8)}
.gcs-deadline-row{display:flex;flex-direction:column;gap:6px}
.gcs-label{font-size:12px;color:rgba(255,255,255,.3)}
.gcs-date-input{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:14px;outline:none;box-sizing:border-box}
.gcs-date-input::-webkit-calendar-picker-indicator{filter:invert(.5)}
.gcs-days-hint{font-size:12px;color:rgba(139,92,246,.5);margin:0}
.gcs-days-hint strong{color:rgba(139,92,246,.8)}
.gcs-next{padding:11px;border-radius:12px;border:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.gcs-next:disabled{opacity:.3;cursor:default}
.gcs-loading{text-align:center;padding:30px 0}
.gcs-spinner{width:36px;height:36px;margin:0 auto 14px;border:3px solid rgba(139,92,246,.12);border-top-color:rgba(139,92,246,.6);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.gcs-loading p{font-size:13px;color:rgba(255,255,255,.3)}
.gcs-plan{max-height:45vh;overflow-y:auto}
.gcs-section{margin-bottom:10px}
.gcs-sh{font-size:12px;color:rgba(255,255,255,.4);font-weight:600;margin:0 0 8px}
.gcs-ms{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.gcs-ms-idx{width:20px;height:20px;border-radius:50%;background:rgba(139,92,246,.1);color:rgba(139,92,246,.6);font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;margin-top:2px}
.gcs-ms-info{flex:1;display:flex;flex-direction:column;gap:2px}
.gcs-ms-title{font-size:12px;color:rgba(255,255,255,.6);font-weight:500}
.gcs-ms-desc{font-size:11px;color:rgba(255,255,255,.25)}
.gcs-ms-date{font-size:10px;color:rgba(255,255,255,.2)}
.gcs-task-list{max-height:180px;overflow-y:auto}
.gcs-tp{display:flex;gap:6px;align-items:center;padding:4px 0}
.gcs-tp-dot{color:rgba(139,92,246,.6);font-size:8px;flex-shrink:0}
.gcs-tp-name{flex:1;font-size:12px;color:rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gcs-tp-date{font-size:10px;color:rgba(255,255,255,.2);flex-shrink:0}
.gcs-edit-hint{font-size:11px;color:rgba(245,158,11,.3);text-align:center;margin:0}
.gcs-nav{display:flex;gap:6px}
.gcs-back,.gcs-regen{flex:1;padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:12px;cursor:pointer}

.sheet-enter-active,.sheet-leave-active{transition:all .25s ease}
.sheet-enter-from .gcs-sheet,.sheet-leave-to .gcs-sheet{transform:scale(.92);opacity:0}
.sheet-enter-from,.sheet-leave-to{opacity:0}
</style>
