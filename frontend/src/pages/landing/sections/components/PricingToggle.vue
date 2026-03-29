<template>
  <div class="pricing-toggle">
    <span
      :class="['toggle-label', { active: !modelValue }]"
      @click="$emit('update:modelValue', false)"
    >
      月付
    </span>

    <label class="toggle-switch">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', !modelValue)"
      />
      <span class="slider">
        <span class="shine"></span>
      </span>
    </label>

    <span
      :class="['toggle-label', { active: modelValue }]"
      @click="$emit('update:modelValue', true)"
    >
      年付
      <span class="save-badge">省 ¥40</span>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.pricing-toggle {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.06);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 999px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.toggle-label:hover {
  color: var(--color-text-secondary);
}

.toggle-label.active {
  color: white;
  background: rgba(255,255,255,0.06);
}

.save-badge {
  background: linear-gradient(135deg, #f97316, #f43f5e);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(255,255,255,0.1);
  border-radius: 28px;
  transition: 0.3s;
  overflow: hidden;
}

.slider:before {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 2;
}

.shine {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  background: var(--color-brand-purple);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.4s ease;
}

input:checked + .slider {
  background: rgba(139, 92, 246, 0.3);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

input:checked + .slider .shine {
  width: 100%;
  height: 100%;
  opacity: 0.3;
}
</style>
