<template>
  <div class="table-wrap">
    <table class="dt">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :style="col.width ? { width: col.width } : undefined">
            {{ col.label }}
          </th>
        </tr>
      </thead>

      <tbody v-if="loading">
        <tr v-for="i in skeletonRows" :key="`sk-${i}`">
          <td v-for="col in columns" :key="col.key">
            <div class="skeleton sk-cell"></div>
          </td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr v-for="row in rows" :key="row.id">
          <td v-for="col in columns" :key="col.key">
            <slot :name="`cell-${col.key}`" :row="row">{{ (row as Record<string, unknown>)[col.key] ?? '—' }}</slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="!loading && rows.length === 0" class="state-box">
      <span class="state-icon" aria-hidden="true">🛰</span>
      <span>{{ emptyText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import type { TableColumn } from '../types'

withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: T[]
    loading?: boolean
    skeletonRows?: number
    emptyText?: string
  }>(),
  { loading: false, skeletonRows: 6, emptyText: '暂无数据' },
)

defineSlots<{ [slot: `cell-${string}`]: (props: { row: T }) => unknown }>()
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.dt th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  letter-spacing: 0.5px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.16);
  white-space: nowrap;
}
.dt td {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.045);
  vertical-align: middle;
  color: var(--text-1);
}
.dt tbody tr {
  transition: background 0.15s;
}
.dt tbody tr:hover {
  background: rgba(124, 58, 237, 0.05);
}
.sk-cell {
  height: 14px;
  width: 80%;
}
</style>
