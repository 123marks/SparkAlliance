<template>
  <!-- 进度里程碑庆祝动画 -->
  <Transition name="milestone">
    <div v-if="show" class="milestone-toast" :class="tierClass">
      <div class="mt-particles">
        <span v-for="i in 12" :key="i" class="mt-particle" :style="particleStyle(i)"></span>
      </div>
      <div class="mt-icon">{{ icon }}</div>
      <div class="mt-content">
        <span class="mt-title">{{ title }}</span>
        <span class="mt-desc">{{ description }}</span>
      </div>
      <div class="mt-progress-ring">
        <svg viewBox="0 0 36 36">
          <circle class="mt-ring-bg" cx="18" cy="18" r="15.9" />
          <circle
            class="mt-ring-fill"
            cx="18" cy="18" r="15.9"
            :stroke-dasharray="`${progress}, 100`"
          />
        </svg>
        <span class="mt-pct">{{ progress }}%</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  progress: number
  goalTitle?: string
}>()

defineEmits<{ close: [] }>()

const tierClass = computed(() => {
  if (props.progress >= 100) return 'complete'
  if (props.progress >= 75) return 'gold'
  if (props.progress >= 50) return 'silver'
  return 'bronze'
})

const icon = computed(() => {
  if (props.progress >= 100) return '🎉'
  if (props.progress >= 75) return '🌟'
  if (props.progress >= 50) return '⚡'
  return '🔥'
})

const title = computed(() => {
  if (props.progress >= 100) return '目标达成！'
  if (props.progress >= 75) return '冲刺阶段！'
  if (props.progress >= 50) return '过半了！'
  return '良好开端！'
})

const description = computed(() => {
  if (props.progress >= 100) return '太棒了，你完成了这个目标！'
  if (props.progress >= 75) return '胜利在望，继续加油！'
  if (props.progress >= 50) return '已完成一半，保持节奏！'
  return '四分之一进度，继续前进！'
})

function particleStyle(i: number) {
  const angle = (i / 12) * 360
  const delay = i * 0.05
  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`,
  }
}
</script>

<style scoped>
.milestone-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:16px;padding:20px 28px;border-radius:20px;background:linear-gradient(135deg,rgba(139,92,246,.95),rgba(109,40,217,.9));box-shadow:0 12px 48px rgba(139,92,246,.5);z-index:300;overflow:visible}
.milestone-toast.complete{background:linear-gradient(135deg,rgba(34,197,94,.95),rgba(22,163,74,.9));box-shadow:0 12px 48px rgba(34,197,94,.5)}
.milestone-toast.gold{background:linear-gradient(135deg,rgba(245,158,11,.95),rgba(217,119,6,.9));box-shadow:0 12px 48px rgba(245,158,11,.5)}
.milestone-toast.silver{background:linear-gradient(135deg,rgba(139,92,246,.95),rgba(109,40,217,.9))}
.milestone-toast.bronze{background:linear-gradient(135deg,rgba(59,130,246,.95),rgba(37,99,235,.9));box-shadow:0 12px 48px rgba(59,130,246,.5)}

/* 粒子动画 */
.mt-particles{position:absolute;inset:0;pointer-events:none}
.mt-particle{position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.8);transform:translate(-50%,-50%);animation:particle 1s ease-out var(--delay) forwards}
@keyframes particle{0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(0)}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-80px)}}

.mt-icon{font-size:40px;animation:bounce .6s ease infinite}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

.mt-content{display:flex;flex-direction:column;gap:4px}
.mt-title{font-size:18px;font-weight:700;color:white}
.mt-desc{font-size:13px;color:rgba(255,255,255,.8)}

.mt-progress-ring{position:relative;width:56px;height:56px;flex-shrink:0}
.mt-progress-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.mt-ring-bg{fill:none;stroke:rgba(255,255,255,.2);stroke-width:3}
.mt-ring-fill{fill:none;stroke:white;stroke-width:3;stroke-linecap:round;transition:stroke-dasharray .5s ease}
.mt-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white}

/* 动画 */
.milestone-enter-active{animation:milestoneIn .5s ease}
.milestone-leave-active{animation:milestoneOut .3s ease}
@keyframes milestoneIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}50%{transform:translate(-50%,-50%) scale(1.1)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes milestoneOut{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.8) translateY(-20px)}}
</style>
