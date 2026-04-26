<template>
  <div class="mascot-wrap" :class="{ 'mascot-hidden': hidden }">
    <div class="mascot-body" @click="onMascotClick">
      <div class="mascot-float">
        <!-- 机器人头部 -->
        <div class="mascot-head">
          <div class="mascot-antenna">
            <div class="antenna-ball"></div>
          </div>
          <div class="mascot-face">
            <div class="mascot-eye left" :class="{ blink: blinking }"></div>
            <div class="mascot-eye right" :class="{ blink: blinking }"></div>
            <div class="mascot-mouth" :class="{ happy: isHappy }"></div>
          </div>
          <div class="mascot-ear left-ear"></div>
          <div class="mascot-ear right-ear"></div>
        </div>
        <!-- 机器人身体 -->
        <div class="mascot-torso">
          <div class="mascot-core"></div>
          <div class="mascot-arm left-arm"></div>
          <div class="mascot-arm right-arm" :class="{ wave: waving }"></div>
        </div>
      </div>
      <!-- 光晕 -->
      <div class="mascot-glow"></div>
      <!-- 粒子 -->
      <div class="mascot-particles">
        <span v-for="i in 5" :key="i" class="m-particle" :style="{ '--i': i }"></span>
      </div>
    </div>
    <!-- 气泡 -->
    <Transition name="bubble">
      <div v-if="bubbleText" class="mascot-bubble">
        {{ bubbleText }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{ hidden?: boolean }>()

const blinking = ref(false)
const waving = ref(false)
const isHappy = ref(true)
const bubbleText = ref('')

const greetings = [
  '加油，你可以的！ 💪',
  '今天也要元气满满哦~',
  '记得休息一下眼睛 👀',
  '你已经很棒啦！',
  '星火陪你一起学习 ✨',
  '要喝水啦～',
  '坚持就是胜利！',
]

let blinkTimer: ReturnType<typeof setInterval>
let waveTimer: ReturnType<typeof setInterval>

function startBlink() {
  blinkTimer = setInterval(() => {
    blinking.value = true
    setTimeout(() => { blinking.value = false }, 200)
  }, 3000 + Math.random() * 2000)
}

function startWave() {
  waveTimer = setInterval(() => {
    waving.value = true
    setTimeout(() => { waving.value = false }, 1200)
  }, 12000 + Math.random() * 8000)
}

function onMascotClick() {
  const msg = greetings[Math.floor(Math.random() * greetings.length)]
  bubbleText.value = msg
  isHappy.value = true
  waving.value = true
  setTimeout(() => { waving.value = false }, 1200)
  setTimeout(() => { bubbleText.value = '' }, 3500)
}

onMounted(() => {
  startBlink()
  startWave()
  setTimeout(() => {
    bubbleText.value = '嗨~ 有什么需要帮忙的吗？'
    setTimeout(() => { bubbleText.value = '' }, 4000)
  }, 2000)
})

onUnmounted(() => {
  clearInterval(blinkTimer)
  clearInterval(waveTimer)
})
</script>

<style scoped>
.mascot-wrap {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 150;
  transition: all 0.3s ease;
}

.mascot-wrap.mascot-hidden {
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

.mascot-body {
  position: relative;
  width: 72px;
  height: 90px;
  cursor: pointer;
  transition: transform 0.2s;
}

.mascot-body:hover {
  transform: scale(1.08);
}

.mascot-body:active {
  transform: scale(0.95);
}

.mascot-float {
  animation: mascotFloat 4s ease-in-out infinite;
  position: relative;
}

@keyframes mascotFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 头部 */
.mascot-head {
  width: 52px;
  height: 48px;
  margin: 0 auto;
  position: relative;
}

.mascot-antenna {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 10px;
  background: linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(139, 92, 246, 0.2));
}

.antenna-ball {
  position: absolute;
  top: -5px;
  left: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #c084fc, #8b5cf6);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
  animation: antennaPulse 2s ease-in-out infinite;
}

@keyframes antennaPulse {
  0%, 100% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.4); }
  50% { box-shadow: 0 0 14px rgba(139, 92, 246, 0.7); }
}

.mascot-face {
  width: 52px;
  height: 48px;
  border-radius: 18px 18px 22px 22px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9 40%, #581c87);
  box-shadow:
    0 4px 16px rgba(109, 40, 217, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.1),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.mascot-face::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 8px;
  width: 16px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

/* 眼睛 */
.mascot-eye {
  position: absolute;
  top: 16px;
  width: 10px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #fff, #e0d4ff);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: height 0.1s;
}

.mascot-eye.left { left: 12px; }
.mascot-eye.right { right: 12px; }

.mascot-eye::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1e1145;
}

.mascot-eye.blink {
  height: 2px;
  top: 21px;
  border-radius: 4px;
}

/* 嘴巴 */
.mascot-mouth {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 5px;
  border-radius: 0 0 8px 8px;
  background: rgba(0, 0, 0, 0.25);
  transition: all 0.2s;
}

.mascot-mouth.happy {
  width: 14px;
  height: 7px;
  border-radius: 0 0 10px 10px;
}

/* 耳朵 */
.mascot-ear {
  position: absolute;
  top: 14px;
  width: 8px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.left-ear { left: -4px; }
.right-ear { right: -4px; }

/* 身体 */
.mascot-torso {
  width: 44px;
  height: 30px;
  margin: 2px auto 0;
  border-radius: 10px 10px 16px 16px;
  background: linear-gradient(180deg, #6d28d9, #581c87);
  box-shadow:
    0 4px 12px rgba(88, 28, 135, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  position: relative;
}

.mascot-core {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.8), rgba(59, 130, 246, 0.4));
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  animation: corePulse 2.5s ease-in-out infinite;
}

@keyframes corePulse {
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4); transform: translateX(-50%) scale(1); }
  50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.7); transform: translateX(-50%) scale(1.1); }
}

/* 手臂 */
.mascot-arm {
  position: absolute;
  width: 10px;
  height: 18px;
  border-radius: 5px;
  background: linear-gradient(180deg, #7c3aed, #6d28d9);
  top: 4px;
}

.left-arm { left: -8px; transform: rotate(-8deg); }
.right-arm { right: -8px; transform: rotate(8deg); transition: transform 0.3s ease; }
.right-arm.wave {
  animation: armWave 0.4s ease-in-out 3;
}

@keyframes armWave {
  0%, 100% { transform: rotate(8deg); }
  50% { transform: rotate(-25deg) translateY(-4px); }
}

/* 光晕 */
.mascot-glow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(139, 92, 246, 0.15), transparent 70%);
  filter: blur(4px);
}

/* 粒子 */
.mascot-particles {
  position: absolute;
  inset: -10px;
  pointer-events: none;
}

.m-particle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(196, 181, 253, 0.4);
  animation: particleDrift 5s ease-in-out infinite;
  animation-delay: calc(var(--i) * -1s);
}

.m-particle:nth-child(1) { top: 10%; left: 15%; }
.m-particle:nth-child(2) { top: 5%; right: 20%; }
.m-particle:nth-child(3) { bottom: 30%; left: 5%; }
.m-particle:nth-child(4) { bottom: 20%; right: 10%; }
.m-particle:nth-child(5) { top: 40%; left: 80%; }

@keyframes particleDrift {
  0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
  30% { opacity: 0.6; transform: translateY(-8px) scale(1); }
  70% { opacity: 0.3; transform: translateY(-14px) scale(0.8); }
}

/* 气泡 */
.mascot-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  max-width: 200px;
  padding: 8px 14px;
  border-radius: 14px 14px 4px 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.08));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: rgba(196, 181, 253, 0.9);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.bubble-enter-active { transition: all 0.25s ease-out; }
.bubble-leave-active { transition: all 0.15s ease-in; }
.bubble-enter-from { opacity: 0; transform: translateY(6px) scale(0.9); }
.bubble-leave-to { opacity: 0; transform: translateY(-4px) scale(0.95); }

@media (max-width: 1100px) {
  .mascot-wrap { display: none; }
}
</style>
