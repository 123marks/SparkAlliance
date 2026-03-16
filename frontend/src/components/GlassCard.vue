<template>
  <div class="glass-card" :class="{ 'hover-effect': hoverable }" :style="{ padding, borderRadius }">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  padding: {
    type: String,
    default: '24px'
  },
  borderRadius: {
    type: String,
    default: '16px'
  },
  hoverable: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  color: var(--text-primary);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              box-shadow 0.4s ease, 
              background 0.4s ease;
}

.hover-effect:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 15px 35px rgba(31, 38, 135, 0.5);
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
