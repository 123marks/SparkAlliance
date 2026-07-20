<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">总览</h1>
        <p class="page-sub">星火联盟运营数据一览</p>
      </div>
      <button class="btn btn-sm" type="button" :disabled="anyLoading" @click="loadAll">
        ⟳ 刷新
      </button>
    </div>

    <!-- 8 张统计卡 -->
    <section class="stats-grid">
      <template v-if="overviewLoading">
        <div v-for="i in 8" :key="`ov-sk-${i}`" class="glass-card sk-card">
          <div class="skeleton sk-line-sm"></div>
          <div class="skeleton sk-line-lg"></div>
        </div>
      </template>
      <template v-else-if="overview">
        <StatCard v-for="card in statCards" :key="card.label" v-bind="card" />
      </template>
      <div v-else class="glass-card stats-error">
        <ErrorState :message="overviewError" @retry="loadOverview" />
      </div>
    </section>

    <!-- 30 天趋势 -->
    <section class="glass-card chart-card">
      <div class="chart-head">
        <h2 class="chart-title">30 天趋势</h2>
        <span class="chart-sub">新增用户 / 帖子 / 评论（按天）</span>
      </div>
      <div v-if="trendLoading" class="skeleton chart-skeleton"></div>
      <ErrorState v-else-if="trendError" :message="trendError" @retry="loadTrend" />
      <div v-else-if="trend.length === 0" class="state-box">
        <span class="state-icon" aria-hidden="true">🛰</span>
        <span>暂无趋势数据</span>
      </div>
      <EChart v-else :option="trendOption" height="320px" />
    </section>

    <!-- 模块数据量 -->
    <section class="glass-card chart-card">
      <div class="chart-head">
        <h2 class="chart-title">模块数据量</h2>
        <span class="chart-sub">各业务模块累计行数</span>
      </div>
      <div v-if="modulesLoading" class="skeleton chart-skeleton"></div>
      <ErrorState v-else-if="modulesError" :message="modulesError" @retry="loadModules" />
      <div v-else-if="modules.length === 0" class="state-box">
        <span class="state-icon" aria-hidden="true">🛰</span>
        <span>暂无模块数据</span>
      </div>
      <EChart v-else :option="modulesOption" :height="`${Math.max(modules.length * 44, 220)}px`" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import StatCard from '../components/StatCard.vue'
import ErrorState from '../components/ErrorState.vue'
import EChart from '../components/EChart.vue'
import { fetchModules, fetchOverview, fetchTrend } from '../api'
import type { ModuleStat, StatsOverview, TrendPoint } from '../types'

const overview = ref<StatsOverview | null>(null)
const overviewLoading = ref(true)
const overviewError = ref('')

const trend = ref<TrendPoint[]>([])
const trendLoading = ref(true)
const trendError = ref('')

const modules = ref<ModuleStat[]>([])
const modulesLoading = ref(true)
const modulesError = ref('')

const anyLoading = computed(
  () => overviewLoading.value || trendLoading.value || modulesLoading.value,
)

function errText(err: unknown): string {
  return err instanceof Error ? err.message : '加载失败'
}

async function loadOverview() {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    overview.value = await fetchOverview()
  } catch (err) {
    overview.value = null
    overviewError.value = errText(err)
  } finally {
    overviewLoading.value = false
  }
}

async function loadTrend() {
  trendLoading.value = true
  trendError.value = ''
  try {
    trend.value = await fetchTrend(30)
  } catch (err) {
    trend.value = []
    trendError.value = errText(err)
  } finally {
    trendLoading.value = false
  }
}

async function loadModules() {
  modulesLoading.value = true
  modulesError.value = ''
  try {
    modules.value = await fetchModules()
  } catch (err) {
    modules.value = []
    modulesError.value = errText(err)
  } finally {
    modulesLoading.value = false
  }
}

function loadAll() {
  void loadOverview()
  void loadTrend()
  void loadModules()
}

onMounted(loadAll)

const statCards = computed(() => {
  const o = overview.value
  if (!o) return []
  return [
    { label: '总用户', value: o.total_users, icon: '👥', accent: '#7c3aed' },
    { label: '今日新增用户', value: o.new_users_today, icon: '✨', accent: '#f5c55e' },
    { label: '总帖子', value: o.total_posts, icon: '📝', accent: '#3b82f6' },
    { label: '今日新增帖子', value: o.posts_today, icon: '🔥', accent: '#f5c55e' },
    { label: '总评论', value: o.total_comments, icon: '💬', accent: '#3b82f6' },
    { label: '日程事件', value: o.total_events, icon: '📅', accent: '#7c3aed' },
    { label: '规划任务', value: o.total_tasks, icon: '🎯', accent: '#7c3aed' },
    { label: '7 日活跃用户', value: o.active_users_7d, icon: '⚡', accent: '#10b981' },
  ]
})

const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
  axisLabel: { color: '#94a3b8', fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
}

const trendOption = computed<EChartsOption>(() => {
  const dates = trend.value.map((p) => p.date.slice(5))
  const mkLine = (name: string, key: keyof TrendPoint, color: string): object => ({
    name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 5,
    data: trend.value.map((p) => p[key]),
    lineStyle: { width: 2.5, color },
    itemStyle: { color },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: `${color}33` },
          { offset: 1, color: `${color}00` },
        ],
      },
    },
  })
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(18,14,34,0.95)',
      borderColor: 'rgba(139,92,246,0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 12 },
      itemWidth: 16,
      itemHeight: 8,
    },
    grid: { left: 44, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category', boundaryGap: false, data: dates, ...axisStyle },
    yAxis: { type: 'value', minInterval: 1, ...axisStyle },
    series: [
      mkLine('新增用户', 'new_users', '#a78bfa'),
      mkLine('新增帖子', 'new_posts', '#3b82f6'),
      mkLine('新增评论', 'new_comments', '#f5c55e'),
    ] as EChartsOption['series'],
  }
})

const MODULE_LABELS: Record<string, string> = {
  posts: '帖子',
  comments: '评论',
  events: '日程事件',
  goals: '目标',
  tasks: '任务',
  checkins: '健康打卡',
}

const modulesOption = computed<EChartsOption>(() => {
  const sorted = [...modules.value].sort((a, b) => a.rows - b.rows)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(18,14,34,0.95)',
      borderColor: 'rgba(139,92,246,0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: { left: 90, right: 40, top: 10, bottom: 28 },
    xAxis: { type: 'value', minInterval: 1, ...axisStyle },
    yAxis: {
      type: 'category',
      data: sorted.map((m) => MODULE_LABELS[m.module] ?? m.module),
      ...axisStyle,
      splitLine: { show: false },
    },
    series: [
      {
        name: '数据量',
        type: 'bar',
        barWidth: 16,
        data: sorted.map((m) => m.rows),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#7c3aed' },
            ],
          },
        },
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 11 },
      },
    ],
  }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.sk-card {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sk-line-sm {
  height: 12px;
  width: 55%;
}
.sk-line-lg {
  height: 26px;
  width: 70%;
}
.stats-error {
  grid-column: 1 / -1;
}
.chart-card {
  padding: 20px;
  margin-bottom: 20px;
}
.chart-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.chart-title {
  font-size: 15px;
}
.chart-sub {
  font-size: 12px;
  color: var(--text-3);
}
.chart-skeleton {
  height: 300px;
}
@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
