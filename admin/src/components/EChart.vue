<template>
  <div ref="el" class="echart" :style="{ height }"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'

type EChartsInstance = ReturnType<(typeof import('echarts'))['init']>

const props = withDefaults(defineProps<{ option: EChartsOption; height?: string }>(), {
  height: '320px',
})

const el = ref<HTMLDivElement | null>(null)
let chart: EChartsInstance | null = null
let observer: ResizeObserver | null = null
let disposed = false

onMounted(async () => {
  // 动态导入把 ~1MB 的 echarts 拆出主包，登录页无需加载
  const echarts = await import('echarts')
  if (disposed || !el.value) return
  chart = echarts.init(el.value)
  chart.setOption(props.option)
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(el.value)
})

watch(
  () => props.option,
  (opt) => {
    // notMerge 保证数据整体替换，避免旧 series 残留
    chart?.setOption(opt, { notMerge: true })
  },
  { deep: true },
)

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.echart {
  width: 100%;
}
</style>
