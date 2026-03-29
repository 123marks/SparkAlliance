<template>
  <!-- 饮水追踪组件 -->
  <div class="water-tracker">
    <div class="wt-header">
      <h3 class="wt-title">💧 今日饮水</h3>
      <div class="wt-target">
        <span class="wt-current">{{ intake }}</span>
        <span class="wt-unit">/ {{ target }}ml</span>
      </div>
    </div>

    <!-- 水滴进度 -->
    <div class="wt-visual">
      <div class="wt-drop">
        <svg viewBox="0 0 100 120" class="wt-drop-svg">
          <defs>
            <clipPath id="drop-clip">
              <path d="M50 10 C20 50, 10 70, 10 85 A40 40 0 0 0 90 85 C90 70, 80 50, 50 10 Z" />
            </clipPath>
            <linearGradient id="water-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#60a5fa" />
            </linearGradient>
          </defs>
          <!-- 水滴轮廓 -->
          <path
            d="M50 10 C20 50, 10 70, 10 85 A40 40 0 0 0 90 85 C90 70, 80 50, 50 10 Z"
            fill="none"
            stroke="rgba(59,130,246,0.2)"
            stroke-width="2"
          />
          <!-- 水位填充 -->
          <g clip-path="url(#drop-clip)">
            <rect
              x="0"
              :y="120 - (progress * 1.1)"
              width="100"
              height="120"
              fill="url(#water-gradient)"
              class="wt-water-fill"
            />
            <!-- 波浪效果 -->
            <path
              :d="wavePath"
              fill="rgba(255,255,255,0.15)"
              class="wt-wave"
            />
          </g>
        </svg>
        <span class="wt-pct">{{ progress }}%</span>
      </div>
    </div>

    <!-- 快捷添加按钮 -->
    <div class="wt-cups">
      <button
        v-for="cup in WATER_CUPS"
        :key="cup.ml"
        class="wt-cup-btn"
        @click="addWater(cup.ml)"
        :disabled="disabled"
      >
        <span class="wt-cup-icon">{{ cup.icon }}</span>
        <span class="wt-cup-ml">+{{ cup.ml }}ml</span>
        <span class="wt-cup-label">{{ cup.label }}</span>
      </button>
    </div>

    <!-- 自定义输入 -->
    <div class="wt-custom">
      <input
        v-model.number="customMl"
        type="number"
        class="wt-custom-input"
        placeholder="自定义ml"
        min="50"
        max="1000"
        :disabled="disabled"
      />
      <button
        class="wt-custom-btn"
        @click="addCustomWater"
        :disabled="!customMl || customMl < 50 || disabled"
      >
        添加
      </button>
    </div>

    <!-- 今日记录 -->
    <div class="wt-history" v-if="logs.length > 0">
      <div class="wt-history-title">今日记录</div>
      <div class="wt-log" v-for="(log, i) in logs" :key="i">
        <span class="wt-log-time">{{ log.time }}</span>
        <span class="wt-log-ml">+{{ log.ml }}ml</span>
        <button class="wt-log-del" @click="removeLog(i)" :disabled="disabled">×</button>
      </div>
    </div>

    <!-- 提示语 -->
    <div class="wt-tip">{{ tip }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { WATER_CUPS } from '../../composables/useHealth'

const props = defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const target = 2000 // 目标2000ml
const customMl = ref<number | null>(null)
const logs = ref<{ time: string; ml: number }[]>([])

const intake = computed(() => props.modelValue || 0)
const progress = computed(() => Math.min(100, Math.round((intake.value / target) * 100)))

// 波浪路径
const wavePath = computed(() => {
  const y = 120 - (progress.value * 1.1)
  return `M0 ${y} Q25 ${y - 5} 50 ${y} T100 ${y} V120 H0 Z`
})

// 提示语
const tip = computed(() => {
  if (intake.value <= 0) return '记得多喝水，每天2000ml是基础目标 💧'
  if (intake.value >= target) return '今日饮水目标已达成！🎉'
  if (intake.value >= 1500) return `还差 ${target - intake.value}ml 就达标了，加油！`
  if (intake.value >= 1000) return '过半了，继续保持！'
  if (intake.value >= 500) return '良好的开始，记得持续补水～'
  return '喝得有点少哦，多喝水对身体好 💧'
})

function addWater(ml: number) {
  const newValue = intake.value + ml
  emit('update:modelValue', newValue)
  logs.value.push({
    time: new Date().toTimeString().slice(0, 5),
    ml,
  })
}

function addCustomWater() {
  if (!customMl.value || customMl.value < 50) return
  addWater(customMl.value)
  customMl.value = null
}

function removeLog(index: number) {
  const log = logs.value[index]
  if (log) {
    const newValue = Math.max(0, intake.value - log.ml)
    emit('update:modelValue', newValue)
    logs.value.splice(index, 1)
  }
}

// 同步 modelValue 变化时重建 logs（用于加载已有数据）
watch(() => props.modelValue, (newVal, oldVal) => {
  // 只在首次加载时处理（oldVal 为 0 或 undefined）
  if ((oldVal === 0 || oldVal === undefined) && newVal > 0 && logs.value.length === 0) {
    logs.value = [{ time: '--:--', ml: newVal }]
  }
}, { immediate: true })
</script>

<style scoped>
.water-tracker{background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(96,165,250,.04));border:1px solid rgba(59,130,246,.15);border-radius:16px;padding:20px}
.wt-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.wt-title{font-size:16px;font-weight:700;color:white;margin:0}
.wt-target{display:flex;align-items:baseline;gap:4px}
.wt-current{font-size:28px;font-weight:800;color:#60a5fa}
.wt-unit{font-size:14px;color:rgba(255,255,255,.4)}

/* 水滴视觉 */
.wt-visual{display:flex;justify-content:center;margin-bottom:20px}
.wt-drop{position:relative;width:100px;height:120px}
.wt-drop-svg{width:100%;height:100%}
.wt-water-fill{transition:y .5s ease}
.wt-wave{animation:wave 2s ease-in-out infinite}
@keyframes wave{0%,100%{transform:translateX(0)}50%{transform:translateX(-5px)}}
.wt-pct{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:700;color:white;text-shadow:0 1px 4px rgba(0,0,0,.3)}

/* 快捷杯子按钮 */
.wt-cups{display:flex;gap:10px;margin-bottom:14px}
.wt-cup-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:12px;border:1px solid rgba(59,130,246,.15);background:rgba(59,130,246,.05);cursor:pointer;transition:all .2s}
.wt-cup-btn:hover:not(:disabled){background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.25)}
.wt-cup-btn:disabled{opacity:.4;cursor:not-allowed}
.wt-cup-icon{font-size:24px}
.wt-cup-ml{font-size:13px;font-weight:600;color:#60a5fa}
.wt-cup-label{font-size:10px;color:rgba(255,255,255,.35)}

/* 自定义输入 */
.wt-custom{display:flex;gap:8px;margin-bottom:14px}
.wt-custom-input{flex:1;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:white;font-size:14px;outline:none}
.wt-custom-input:focus{border-color:rgba(59,130,246,.3)}
.wt-custom-input::placeholder{color:rgba(255,255,255,.25)}
.wt-custom-btn{padding:10px 18px;border-radius:10px;border:none;background:rgba(59,130,246,.2);color:#60a5fa;font-size:13px;font-weight:600;cursor:pointer}
.wt-custom-btn:disabled{opacity:.4;cursor:not-allowed}

/* 今日记录 */
.wt-history{margin-bottom:12px}
.wt-history-title{font-size:12px;color:rgba(255,255,255,.35);margin-bottom:6px}
.wt-log{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.wt-log-time{font-size:12px;color:rgba(255,255,255,.3);min-width:50px}
.wt-log-ml{flex:1;font-size:13px;color:rgba(59,130,246,.7)}
.wt-log-del{background:none;border:none;color:rgba(255,255,255,.2);font-size:14px;cursor:pointer;padding:2px 6px}
.wt-log-del:hover:not(:disabled){color:rgba(239,68,68,.6)}

/* 提示 */
.wt-tip{padding:10px 14px;border-radius:10px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.1);font-size:13px;color:rgba(255,255,255,.5);text-align:center}
</style>
