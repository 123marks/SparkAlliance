<template>
  <!-- 自定义下拉组件 — 替代原生 select，完美适配暗色主题 -->
  <div class="spark-select" :class="{ open: isOpen, disabled }" ref="selectRef">
    <button class="spark-select-trigger" @click.stop="toggle" :disabled="disabled" type="button">
      <span class="spark-select-value">{{ currentLabel }}</span>
      <svg class="spark-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen" class="spark-select-dropdown">
        <div
          v-for="opt in options"
          :key="opt.value"
          class="spark-select-option"
          :class="{ active: opt.value === modelValue }"
          @click.stop="select(opt.value)"
        >
          {{ opt.label }}
          <svg v-if="opt.value === modelValue" class="check-icon" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * SparkSelect — 自定义下拉选择器
 * 完美适配暗色/浅色主题，无浏览器原生白色弹出层
 * 用法：<SparkSelect v-model="value" :options="[{value:'a',label:'A'}]" />
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: SelectOption[]
  disabled?: boolean
  placeholder?: string
}>(), { disabled: false, placeholder: '请选择' })

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)

const currentLabel = computed(() => {
  const found = props.options.find(o => String(o.value) === String(props.modelValue))
  return found ? found.label : props.placeholder
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function select(value: string | number) {
  emit('update:modelValue', value)
  isOpen.value = false
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.spark-select {
  position: relative;
  display: inline-flex;
  min-width: 120px;
}

.spark-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, rgba(255,255,255,0.03));
  border: 1px solid var(--color-border, rgba(255,255,255,0.06));
  color: var(--color-text-primary, #fff);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.spark-select-trigger:hover {
  border-color: var(--color-border-hover, rgba(255,255,255,0.15));
}

.spark-select.open .spark-select-trigger {
  border-color: var(--theme-color, #4f8ef7);
  box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.1);
}

.spark-select.disabled .spark-select-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.spark-select-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spark-select-arrow {
  flex-shrink: 0;
  color: var(--color-text-muted, rgba(255,255,255,0.3));
  transition: transform 0.2s;
}
.spark-select.open .spark-select-arrow {
  transform: rotate(180deg);
}

/* 下拉菜单 */
.spark-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 100%;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-secondary, #0d0d18);
  border: 1px solid var(--color-border-hover, rgba(255,255,255,0.15));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 100;
  backdrop-filter: blur(20px);
}

.spark-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-secondary, rgba(255,255,255,0.6));
  cursor: pointer;
  transition: all 0.15s;
}

.spark-select-option:hover {
  background: var(--color-bg-card-hover, rgba(255,255,255,0.06));
  color: var(--color-text-primary, #fff);
}

.spark-select-option.active {
  background: rgba(79, 142, 247, 0.08);
  color: var(--theme-color, #4f8ef7);
  font-weight: 600;
}

.check-icon {
  flex-shrink: 0;
  color: var(--theme-color, #4f8ef7);
}

/* 下拉动画 */
.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.9) translateY(-4px);
}

/* 滚动条 */
.spark-select-dropdown::-webkit-scrollbar { width: 4px; }
.spark-select-dropdown::-webkit-scrollbar-track { background: transparent; }
.spark-select-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
</style>
