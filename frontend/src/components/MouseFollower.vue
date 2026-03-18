<template>
  <div class="cursor-container">
    <!-- Fast Core Dot -->
    <div 
      class="mouse-core" 
      :class="{ 'clicking': isClicking, 'hovering': isHovering }"
      :style="{ transform: `translate3d(${mouseX}px, ${mouseY}px, 0)` }"
    ></div>
    
    <!-- Slow Spring Trailing Ring -->
    <div 
      class="mouse-follower" 
      :class="{ 'clicking': isClicking, 'hovering': isHovering }"
      :style="{ 
        transform: `translate3d(${followerX}px, ${followerY}px, 0)`,
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Mouse exact position
const mouseX = ref(-100);
const mouseY = ref(-100);

// Follower trailing position
const followerX = ref(-100);
const followerY = ref(-100);

const isClicking = ref(false);
const isHovering = ref(false);

let animationFrameId: number;

// Spring physics variables
const spring = 0.15; // Damping
const friction = 0.75; // Friction
let vx = 0;
let vy = 0;

// Update exact mouse coordinates
const updateMousePosition = (e: MouseEvent) => {
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
  
  // Check for hover state on native interactive elements
  const target = e.target as HTMLElement;
  if (target && (
    target.tagName.toLowerCase() === 'button' || 
    target.tagName.toLowerCase() === 'a' ||
    target.closest('button') || 
    target.closest('a') ||
    target.classList.contains('cursor-pointer')
  )) {
    isHovering.value = true;
  } else {
    isHovering.value = false;
  }
};

const handleMouseDown = () => {
  isClicking.value = true;
};

const handleMouseUp = () => {
  isClicking.value = false;
};

const animate = () => {
  // Spring physics calculation for the trailing ring
  // Center is offset by ring size (40px) / 2 = 20px
  const dx = mouseX.value - followerX.value - 20;
  const dy = mouseY.value - followerY.value - 20;
  
  vx += dx * spring;
  vy += dy * spring;
  
  vx *= friction;
  vy *= friction;
  
  followerX.value += vx;
  followerY.value += vy;
  
  animationFrameId = requestAnimationFrame(animate);
};

onMounted(() => {
  // Hide default cursor globally
  document.body.style.cursor = 'none';
  
  window.addEventListener('mousemove', updateMousePosition);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  
  // Initial position to prevent jumping from 0,0
  followerX.value = window.innerWidth / 2;
  followerY.value = window.innerHeight / 2;
  
  animate();
});

onBeforeUnmount(() => {
  document.body.style.cursor = '';
  window.removeEventListener('mousemove', updateMousePosition);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
/* Ensure the cursor layer doesn't block interactions */
.cursor-container {
  pointer-events: none;
  z-index: 99999;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}

/* Fast Core Dot */
.mouse-core {
  position: absolute;
  top: -4px; /* Center exact dot (8px x 8px) */
  left: -4px;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  transition: transform 0s, background 0.3s ease, width 0.3s ease, height 0.3s ease;
  will-change: transform;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

/* Slow Trailing Ring */
.mouse-follower {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05); /* Slight glass fill */
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  will-change: transform;
  /* Using standard transitions for size/style changes, transform is driven by JS physics */
  transition: width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              background 0.3s ease,
              border-color 0.3s ease;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
}

/* Interaction States */
.mouse-core.hovering {
  background: transparent;
  box-shadow: none;
}

.mouse-follower.hovering {
  width: 60px;
  height: 60px;
  /* Adjust center offset for new size (60px) in JS it still tries to center at 40px, 
     so we use a negative margin offset shift dynamically on hover */
  margin-top: -10px; 
  margin-left: -10px;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.8);
}

.mouse-follower.clicking {
  width: 30px;
  height: 30px;
  margin-top: 5px;
  margin-left: 5px;
  background: var(--theme-color, rgba(59, 130, 246, 0.4));
  border-color: var(--theme-color, rgba(59, 130, 246, 0.8));
}
</style>
