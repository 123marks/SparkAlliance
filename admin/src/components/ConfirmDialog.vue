<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="visible" class="dlg-mask" @click.self="emit('cancel')">
        <div class="dlg glass-card" role="dialog" aria-modal="true">
          <h3 class="dlg-title">{{ title }}</h3>
          <p class="dlg-message">{{ message }}</p>
          <div class="dlg-actions">
            <button class="btn" type="button" @click="emit('cancel')">取消</button>
            <button
              class="btn"
              :class="danger ? 'btn-danger' : 'btn-primary'"
              type="button"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ loading ? '处理中…' : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title: string
    message: string
    confirmText?: string
    danger?: boolean
    loading?: boolean
  }>(),
  { confirmText: '确认', danger: false, loading: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<style scoped>
.dlg-mask {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 2, 12, 0.6);
  backdrop-filter: blur(3px);
  padding: 20px;
}
.dlg {
  width: 400px;
  max-width: 100%;
  padding: 24px;
  background: rgba(18, 14, 34, 0.95);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(124, 58, 237, 0.08);
}
.dlg-title {
  font-size: 16px;
  margin-bottom: 10px;
}
.dlg-message {
  margin: 0 0 22px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.7;
  word-break: break-word;
}
.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.dlg-enter-active,
.dlg-leave-active {
  transition: opacity 0.2s ease;
}
.dlg-enter-active .dlg,
.dlg-leave-active .dlg {
  transition: transform 0.2s ease;
}
.dlg-enter-from,
.dlg-leave-to {
  opacity: 0;
}
.dlg-enter-from .dlg,
.dlg-leave-to .dlg {
  transform: scale(0.94) translateY(8px);
}
</style>
