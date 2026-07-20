<template>
  <div class="state-box">
    <span class="state-icon" aria-hidden="true">⚠</span>
    <p class="err-msg">{{ message }}</p>
    <button class="btn btn-primary" type="button" @click="emit('retry')">重新加载</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped>
.err-msg {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 420px;
}
</style>
