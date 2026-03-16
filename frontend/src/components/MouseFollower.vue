<template>
  <div 
    class="mouse-follower" 
    :class="{ 'clicking': isClicking }"
    :style="{ 
      transform: `translate3d(${x}px, ${y}px, 0)`,
      width: `${size}px`,
      height: `${size}px`
    }"
  >
    <div class="mouse-core"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const x = ref(window.innerWidth / 2);
const y = ref(window.innerHeight / 2);
const size = ref(40);
const isClicking = ref(false);

let targetX = x.value;
let targetY = y.value;
let animationFrameId: number;

const spring = 0.15; // Spring damping factor
const friction = 0.8; // Friction factor
let vx = 0;
let vy = 0;

const updateMousePosition = (e: MouseEvent) => {
  targetX = e.clientX - size.value / 2;
  targetY = e.clientY - size.value / 2;
};

const handleMouseDown = () => {
  isClicking.value = true;
};

const handleMouseUp = () => {
  isClicking.value = false;
};

const animate = () => {
  // Spring physics calculation
  const dx = targetX - x.value;
  const dy = targetY - y.value;
  
  vx += dx * spring;
  vy += dy * spring;
  
  vx *= friction;
  vy *= friction;
  
  x.value += vx;
  y.value += vy;
  
  // Dynamic size based on velocity and click state
  if (isClicking.value) {
    size.value = 30; // Shrink on click
  } else {
    // Grow slightly based on speed
    const speed = Math.sqrt(vx * vx + vy * vy);
    size.value = 40 + Math.min(speed * 0.5, 15);
  }
  
  animationFrameId = requestAnimationFrame(animate);
};

onMounted(() => {
  window.addEventListener('mousemove', updateMousePosition);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  
  targetX = window.innerWidth / 2;
  targetY = window.innerHeight / 2;
  
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', updateMousePosition);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.mouse-follower {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform, width, height;
  transition: width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
}

.mouse-core {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.clicking .mouse-core {
  transform: scale(0.5);
  background: var(--theme-color);
  box-shadow: 0 0 15px var(--theme-color);
}
</style>
