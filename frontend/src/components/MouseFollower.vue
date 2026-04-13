<template>
  <div>
    <!-- Trail dots -->
    <div 
      v-for="(dot, index) in trail" 
      :key="'trail-' + index"
      class="mouse-trail"
      :style="{ 
        transform: `translate(${dot.x}px, ${dot.y}px) scale(${1 - index / trailLength})`,
        opacity: 1 - index / trailLength
      }"
    ></div>
    <!-- Main follower -->
    <div class="mouse-follower" :style="{ transform: `translate(${x}px, ${y}px)` }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const x = ref(window.innerWidth / 2)
const y = ref(window.innerHeight / 2)
let mouseX = window.innerWidth / 2
let mouseY = window.innerHeight / 2

// Array to hold previous positions for the trail
const trail = ref<{x: number, y: number}[]>([])
const trailLength = 20 // Length of the trail

let frameId: number

const updatePosition = () => {
  // Spring physics for smooth trailing of the main cursor
  const dx = mouseX - x.value
  const dy = mouseY - y.value
  
  x.value += dx * 0.25
  y.value += dy * 0.25
  
  // Update trail array
  trail.value.unshift({ x: x.value, y: y.value })
  if (trail.value.length > trailLength) {
    trail.value.pop()
  }
  
  frameId = requestAnimationFrame(updatePosition)
}

const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  frameId = requestAnimationFrame(updatePosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  cancelAnimationFrame(frameId)
})
</script>

<style scoped>
.mouse-follower {
  position: fixed;
  top: -12px; /* Center cursor */
  left: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  /* Gradient glowing border and bright center */
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(139, 92, 246, 0.4) 60%, transparent 100%);
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 10px rgba(255, 255, 255, 0.9);
  pointer-events: none;
  z-index: 99999;
}

.mouse-trail {
  position: fixed;
  top: -4px; /* Center trail dot */
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand-blue);
  box-shadow: 0 0 10px var(--color-brand-blue), 0 0 5px white;
  pointer-events: none;
  z-index: 99998;
  will-change: transform, opacity;
}
</style>
