<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.type}`">
        <span class="toast-dot"></span>
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { toasts } from '../toast'
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  max-width: 360px;
  padding: 11px 16px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-1);
  background: rgba(20, 16, 38, 0.92);
  border: 1px solid var(--card-border-hover);
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}
.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.toast-success .toast-dot {
  background: var(--green);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
}
.toast-error .toast-dot {
  background: var(--red);
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.8);
}
.toast-info .toast-dot {
  background: var(--blue);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
