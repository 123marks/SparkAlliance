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
      <div v-if="bubbleText && !panelOpen" class="mascot-bubble">{{ bubbleText }}</div>
    </Transition>

    <!-- 星火小宇浮层面板 -->
    <Transition name="panel">
      <div v-if="panelOpen" class="xiaoyu-panel">
        <div class="xp-header">
          <h3 class="xp-title">星火小宇</h3>
          <button class="xp-close" @click="panelOpen = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="xp-welcome">
          <p class="xp-greeting">👋 你好！我是星火小宇</p>
          <p class="xp-desc">你的专属学习助手，随时为你效劳~</p>
        </div>

        <div class="xp-mood">
          <span class="xp-mood-tag">情绪</span>
          <span class="xp-mood-value">{{ currentMood }}</span>
        </div>

        <div class="xp-shortcuts">
          <h4 class="xp-section-title">快捷操作</h4>
          <div class="xp-shortcut-grid">
            <button v-for="s in shortcuts" :key="s.label" class="xp-shortcut-btn" @click="$emit('quick', s.prompt)">
              <span class="xp-s-icon">{{ s.icon }}</span>
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <div class="xp-recent">
          <h4 class="xp-section-title">最近使用</h4>
          <div class="xp-recent-list">
            <div class="xp-recent-item" v-for="r in recentItems" :key="r">
              <span class="xp-r-dot"></span>
              <span>{{ r }}</span>
            </div>
          </div>
        </div>

        <div class="xp-input-row">
          <input class="xp-input" placeholder="问小宇，输入你的问题..." v-model="panelInput" @keydown.enter="sendPanelInput" />
          <button class="xp-send" @click="sendPanelInput" :disabled="!panelInput.trim()">›</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const emit = defineEmits<{ quick: [prompt: string] }>()

const blinking = ref(false)
const waving = ref(false)
const isHappy = ref(true)
const bubbleText = ref('')
const panelOpen = ref(false)
const panelInput = ref('')

const currentMood = ref('积极 · 能量充沛 ⚡')

const shortcuts = [
  { icon: '🎯', label: '开始专注', prompt: '帮我开始一个专注学习计划' },
  { icon: '📝', label: '总结笔记', prompt: '帮我总结今天的学习笔记' },
  { icon: '📅', label: '整理日程', prompt: '帮我整理今天的日程安排' },
  { icon: '📖', label: '制定复习计划', prompt: '帮我制定一份复习计划' },
  { icon: '❓', label: '问我任何问题', prompt: '' },
]

const recentItems = ref([
  'C++ 代码分析',
  '复习计划制定',
  '操作系统笔记',
])

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
    // 挥手时随机说一句鼓励语（面板未打开时）
    if (!panelOpen.value && !bubbleText.value) {
      bubbleText.value = greetings[Math.floor(Math.random() * greetings.length)]
      setTimeout(() => { bubbleText.value = '' }, 4000)
    }
  }, 15000 + Math.random() * 10000)
}

function onMascotClick() {
  if (panelOpen.value) {
    panelOpen.value = false
    return
  }
  panelOpen.value = true
  isHappy.value = true
  waving.value = true
  setTimeout(() => { waving.value = false }, 1800)
}

function sendPanelInput() {
  if (!panelInput.value.trim()) return
  emit('quick', panelInput.value.trim())
  panelInput.value = ''
  panelOpen.value = false
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
  position: absolute;
  bottom: 16px;
  left: -40px;
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
  filter: drop-shadow(0 4px 12px rgba(109, 40, 217, 0.35)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.15));
}

.mascot-body::before {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%);
  filter: blur(8px);
  pointer-events: none;
  animation: glowPulse 3s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.mascot-body::after {
  content: '';
  position: absolute;
  top: -8px;
  left: 8px;
  width: 48px;
  height: 48px;
  background:
    radial-gradient(2px 2px at 10% 20%, rgba(196, 181, 253, 0.5), transparent 3px),
    radial-gradient(1.5px 1.5px at 80% 15%, rgba(196, 181, 253, 0.4), transparent 3px),
    radial-gradient(1px 1px at 45% 80%, rgba(196, 181, 253, 0.3), transparent 2px),
    radial-gradient(2px 2px at 70% 60%, rgba(196, 181, 253, 0.35), transparent 3px);
  pointer-events: none;
  animation: sparkle 4s ease-in-out infinite alternate;
}

@keyframes sparkle {
  0% { opacity: 0.3; transform: translateY(0) rotate(0); }
  100% { opacity: 0.7; transform: translateY(-3px) rotate(5deg); }
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

/* ====== 星火小宇浮层面板 ====== */
.xiaoyu-panel {
  position: absolute; bottom: 90px; right: -20px;
  width: 280px; max-height: 480px;
  background: rgba(12, 10, 30, 0.92);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 18px; padding: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.1);
  display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto; scrollbar-width: thin;
  transform-origin: bottom right;
}
.xp-header { display: flex; justify-content: space-between; align-items: center; }
.xp-title { font-size: 15px; font-weight: 700; color: white; margin: 0; }
.xp-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; }
.xp-close:hover { color: white; }

.xp-welcome { text-align: center; }
.xp-greeting { font-size: 14px; font-weight: 600; color: white; margin: 0 0 4px; }
.xp-desc { font-size: 11px; color: rgba(255,255,255,0.45); margin: 0; }

.xp-mood {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.12);
}
.xp-mood-tag { font-size: 10px; color: rgba(255,255,255,0.4); }
.xp-mood-value { font-size: 11px; color: #a78bfa; font-weight: 500; }

.xp-section-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); margin: 0 0 6px; }

.xp-shortcut-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.xp-shortcut-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 8px; border-radius: 8px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6); font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.xp-shortcut-btn:hover { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.2); color: white; }
.xp-s-icon { font-size: 13px; }

.xp-recent-list { display: flex; flex-direction: column; gap: 4px; }
.xp-recent-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,0.4);
  padding: 3px 0;
}
.xp-r-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(139,92,246,0.4); flex-shrink: 0; }

.xp-input-row { display: flex; gap: 6px; }
.xp-input {
  flex: 1; padding: 7px 10px; border-radius: 10px;
  background: rgba(20,16,48,0.5); border: 1px solid rgba(139,92,246,0.15);
  color: white; font-size: 11px; outline: none;
}
.xp-input::placeholder { color: rgba(255,255,255,0.25); }
.xp-input:focus { border-color: rgba(139,92,246,0.4); }
.xp-send {
  width: 28px; height: 28px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white;
  font-size: 16px; font-weight: 700; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: all 0.15s;
}
.xp-send:hover { box-shadow: 0 0 12px rgba(124,58,237,0.3); }
.xp-send:disabled { opacity: 0.3; cursor: not-allowed; }

.panel-enter-active { transition: all 0.26s cubic-bezier(0.16,1,0.3,1); }
.panel-leave-active { transition: all 0.18s ease-in; }
.panel-enter-from { opacity: 0; transform: scale(0.85) translateY(20px); }
.panel-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); }

@media (max-width: 1100px) {
  .mascot-wrap { display: none; }
}
</style>
