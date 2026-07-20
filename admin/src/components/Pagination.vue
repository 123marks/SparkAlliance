<template>
  <div v-if="totalPages > 1" class="pager">
    <span class="pager-info">共 {{ total.toLocaleString('zh-CN') }} 条 · {{ page }}/{{ totalPages }} 页</span>
    <div class="pager-btns">
      <button class="btn btn-sm" type="button" :disabled="page <= 1" @click="emit('change', page - 1)">
        上一页
      </button>
      <button
        class="btn btn-sm"
        type="button"
        :disabled="page >= totalPages"
        @click="emit('change', page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  page: number
  pageSize: number
}>()

const emit = defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 4px 2px;
  flex-wrap: wrap;
}
.pager-info {
  font-size: 12px;
  color: var(--text-3);
}
.pager-btns {
  display: flex;
  gap: 8px;
}
</style>
