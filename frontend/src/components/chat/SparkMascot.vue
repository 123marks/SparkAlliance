<template>
  <div class="mascot-wrap">
    <div class="mascot-body" @click="onMascotClick" title="点击互动">
      <div class="mascot-float">
        <svg class="mascot-svg" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 底部光晕 -->
          <ellipse cx="40" cy="92" rx="24" ry="4" fill="url(#glow)" opacity="0.4"/>
          <!-- 身体 -->
          <rect x="22" y="52" width="36" height="28" rx="14" fill="url(#bodyGrad)"/>
          <!-- 核心光点 -->
          <circle cx="40" cy="64" r="4" fill="url(#coreGrad)" opacity="0.8">
            <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          <!-- 头部 -->
          <rect x="14" y="12" width="52" height="44" rx="20" fill="url(#headGrad)"/>
          <!-- 头部高光 -->
          <ellipse cx="32" cy="22" rx="12" ry="6" fill="white" opacity="0.06"/>
          <!-- 左眼 -->
          <ellipse :cx="28" :cy="eyeY" rx="5" :ry="blinking ? 1 : 6" fill="white">
            <animate v-if="!blinking" attributeName="ry" values="6;5.8;6" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <circle cx="29" :cy="eyeY" r="2.5" fill="#1a1035"/>
          <circle cx="30" :cy="eyePupilY" r="1" fill="white" opacity="0.8"/>
          <!-- 右眼 -->
          <ellipse :cx="52" :cy="eyeY" rx="5" :ry="blinking ? 1 : 6" fill="white">
            <animate v-if="!blinking" attributeName="ry" values="6;5.8;6" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <circle cx="53" :cy="eyeY" r="2.5" fill="#1a1035"/>
          <circle cx="54" :cy="eyePupilY" r="1" fill="white" opacity="0.8"/>
          <!-- 腮红 -->
          <circle cx="20" cy="38" r="4" fill="#ec4899" opacity="0.15"/>
          <circle cx="60" cy="38" r="4" fill="#ec4899" opacity="0.15"/>
          <!-- 嘴巴 -->
          <path :d="mouthPath" stroke="#2d1b69" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <!-- 天线 -->
          <line x1="40" y1="12" x2="40" y2="4" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
          <circle cx="40" cy="3" r="3" fill="url(#antennaGrad)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <!-- 左手 -->
          <ellipse cx="18" cy="62" rx="5" ry="8" fill="url(#armGrad)" :transform="`rotate(-10 18 62)`"/>
          <!-- 右手（挥手动画） -->
          <ellipse cx="62" cy="62" rx="5" ry="8" fill="url(#armGrad)"
            :transform="waving ? undefined : 'rotate(10 62 62)'">
            <animateTransform v-if="waving" attributeName="transform" type="rotate"
              values="10 62 62;-20 62 56;10 62 62" dur="0.5s" repeatCount="3"/>
          </ellipse>
          <!-- 渐变定义 -->
          <defs>
            <linearGradient id="headGrad" x1="14" y1="12" x2="66" y2="56">
              <stop offset="0%" stop-color="#7c3aed"/>
              <stop offset="100%" stop-color="#4c1d95"/>
            </linearGradient>
            <linearGradient id="bodyGrad" x1="22" y1="52" x2="58" y2="80">
              <stop offset="0%" stop-color="#6d28d9"/>
              <stop offset="100%" stop-color="#4c1d95"/>
            </linearGradient>
            <linearGradient id="armGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7c3aed"/>
              <stop offset="100%" stop-color="#5b21b6"/>
            </linearGradient>
            <radialGradient id="coreGrad">
              <stop offset="0%" stop-color="#a78bfa"/>
              <stop offset="100%" stop-color="#6d28d9"/>
            </radialGradient>
            <radialGradient id="antennaGrad">
              <stop offset="0%" stop-color="#c084fc"/>
              <stop offset="100%" stop-color="#8b5cf6"/>
            </radialGradient>
            <radialGradient id="glow">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
    <Transition name="bubble">
      <div v-if="bubbleText" class="mascot-bubble">{{ bubbleText }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const blinking = ref(false)
const waving = ref(false)
const isHappy = ref(true)
const bubbleText = ref('')

const eyeY = computed(() => blinking.value ? 34 : 32)
const eyePupilY = computed(() => blinking.value ? 34 : 30)
const mouthPath = computed(() =>
  isHappy.value ? 'M 34 42 Q 40 48 46 42' : 'M 36 44 L 44 44'
)

const greetings = [
  '加油，你可以的！ 💪',
  '今天也要元气满满~',
  '记得休息一下眼睛 👀',
  '你已经很棒啦！ ✨',
  '星火陪你一起学习~',
  '要喝水啦 🥤',
  '坚持就是胜利！ 🔥',
]

let blinkTimer: ReturnType<typeof setInterval>
let waveTimer: ReturnType<typeof setInterval>

function startBlink() {
  blinkTimer = setInterval(() => {
    blinking.value = true
    setTimeout(() => { blinking.value = false }, 180)
  }, 3000 + Math.random() * 2000)
}

function startWave() {
  waveTimer = setInterval(() => {
    waving.value = true
    setTimeout(() => { waving.value = false }, 1800)
  }, 15000 + Math.random() * 10000)
}

function onMascotClick() {
  const msg = greetings[Math.floor(Math.random() * greetings.length)]
  bubbleText.value = msg
  isHappy.value = true
  waving.value = true
  setTimeout(() => { waving.value = false }, 1800)
  setTimeout(() => { bubbleText.value = '' }, 3500)
}

onMounted(() => {
  startBlink()
  startWave()
  setTimeout(() => {
    bubbleText.value = '嗨~ 有什么需要帮忙的吗？'
    setTimeout(() => { bubbleText.value = '' }, 4000)
  }, 2500)
})

onUnmounted(() => {
  clearInterval(blinkTimer)
  clearInterval(waveTimer)
})
</script>

<style scoped>
.mascot-wrap {
  position: fixed;
  bottom: 16px;
  right: 296px;
  z-index: 150;
}

.mascot-body {
  width: 64px;
  height: 80px;
  cursor: pointer;
  transition: transform 0.2s;
}

.mascot-body:hover { transform: scale(1.06); }
.mascot-body:active { transform: scale(0.96); }

.mascot-float { animation: mascotBob 4s ease-in-out infinite; }

@keyframes mascotBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.mascot-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 12px rgba(109, 40, 217, 0.35));
}

.mascot-bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  right: -10px;
  min-width: 120px;
  max-width: 180px;
  padding: 8px 12px;
  border-radius: 12px 12px 4px 12px;
  background: rgba(12, 10, 24, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: rgba(196, 181, 253, 0.9);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.bubble-enter-active { transition: all 0.25s ease-out; }
.bubble-leave-active { transition: all 0.15s ease-in; }
.bubble-enter-from { opacity: 0; transform: translateY(6px) scale(0.9); }
.bubble-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 1100px) {
  .mascot-wrap { display: none; }
}
</style>
