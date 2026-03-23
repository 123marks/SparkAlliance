<template>
  <!-- 轻量鼠标跟随小圆点 - 仅在桌面端显示 -->
  <div
    v-if="isDesktop"
    class="mouse-dot"
    :style="{ transform: `translate(${x}px, ${y}px) scale(${isHovering ? 1.8 : 1})` }"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const x = ref(-100)
const y = ref(-100)
const isHovering = ref(false)
const isDesktop = ref(true)

let mouseX = -100
let mouseY = -100
let frameId: number

// 更高的跟随系数 = 更紧凑的跟随
const FOLLOW_SPEED = 0.45

const updatePosition = () => {
  const dx = mouseX - x.value
  const dy = mouseY - y.value

  x.value += dx * FOLLOW_SPEED
  y.value += dy * FOLLOW_SPEED

  frameId = requestAnimationFrame(updatePosition)
}

const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  // 在可交互元素上放大小圆点
  if (target.closest('a, button, [role="button"], input, textarea, select, .clickable')) {
    isHovering.value = true
  } else {
    isHovering.value = false
  }
}

const handleMouseLeave = () => {
  // 鼠标离开窗口时隐藏
  x.value = -100
  y.value = -100
}

const checkDesktop = () => {
  // 触屏设备不显示鼠标跟随
  isDesktop.value = !('ontouchstart' in window) && window.innerWidth > 768
}

onMounted(() => {
  checkDesktop()
  if (!isDesktop.value) return

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseover', handleMouseOver)
  window.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('resize', checkDesktop)
  frameId = requestAnimationFrame(updatePosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseover', handleMouseOver)
  window.removeEventListener('mouseleave', handleMouseLeave)
  window.removeEventListener('resize', checkDesktop)
  cancelAnimationFrame(frameId)
})
</script>

<style scoped>
.mouse-dot {
  position: fixed;
  top: -4px;  /* 居中偏移 = 尺寸的一半 */
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  pointer-events: none;
  z-index: 99999;
  transition: transform 0.15s ease-out, background 0.2s ease;
  will-change: transform;
  mix-blend-mode: difference;
}
</style>
