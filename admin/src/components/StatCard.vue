<template>
  <div class="stat-card glass-card" :style="{ '--accent': accent }">
    <div class="stat-top">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-icon" aria-hidden="true">{{ icon }}</span>
    </div>
    <div class="stat-value">{{ formatted }}</div>
    <div v-if="hint" class="stat-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    icon?: string
    hint?: string
    accent?: string
  }>(),
  { icon: '✦', hint: '', accent: '#7c3aed' },
)

const formatted = computed(() => props.value.toLocaleString('zh-CN'))
</script>

<style scoped>
.stat-card {
  padding: 16px 18px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.7;
}
.stat-card:hover {
  border-color: var(--card-border-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-2);
  letter-spacing: 0.4px;
}
.stat-icon {
  font-size: 14px;
  color: var(--accent);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
}
.stat-value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}
.stat-hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
}
</style>
