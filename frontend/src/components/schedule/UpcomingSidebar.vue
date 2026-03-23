<!--
  UpcomingSidebar.vue — 右侧栏组件
  迷你日期卡 + 即将到来 + 类型筛选 + 本月概览
  终审要求：从 Schedule.vue 抽离，防止页面壳失控
-->
<template>
  <aside class="sidebar">
    <!-- 迷你日期卡 -->
    <div class="mini-date">
      <div class="mini-num">{{ todayDate }}</div>
      <div class="mini-info">
        <span>{{ todayYear }}年{{ todayMonth }}月</span>
        <span>{{ todayWeekday }}</span>
      </div>
    </div>

    <!-- 即将到来 -->
    <div class="section">
      <h4 class="section-title">即将到来</h4>
      <div v-if="upcomingEvents.length === 0" class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
        <span>暂无近期事件</span>
      </div>
      <div
        v-for="evt in upcomingEvents.slice(0, 6)" :key="evt.id"
        class="upcoming-item"
        @click="$emit('clickEvent', evt)"
      >
        <div class="upcoming-bar" :style="{ background: getEventColor(evt) }"></div>
        <div class="upcoming-info">
          <span class="upcoming-title">{{ evt.title }}</span>
          <span class="upcoming-time">
            {{ formatDate(new Date(evt.start_time)) }}
            {{ evt.all_day ? '全天' : formatTime(evt.start_time) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="section">
      <h4 class="section-title">类型筛选</h4>
      <div class="filter-grid">
        <label
          v-for="(cfg, key) in EVENT_TYPES" :key="key"
          class="filter-chip"
          :class="{ active: modelValue.includes(key as string) }"
          :style="modelValue.includes(key as string) ? { borderColor: cfg.color, background: cfg.color + '12' } : {}"
        >
          <input type="checkbox" :value="key"
            :checked="modelValue.includes(key as string)"
            @change="toggleType(key as string)" />
          <span>{{ cfg.icon }}</span>
          <span>{{ cfg.label }}</span>
        </label>
      </div>
    </div>

    <!-- 本月概览 -->
    <div class="section">
      <h4 class="section-title">本月概览</h4>
      <div class="stat-bar" v-for="(cfg, key) in EVENT_TYPES" :key="key">
        <div class="stat-left">
          <span>{{ cfg.icon }}</span>
          <span>{{ cfg.label }}</span>
        </div>
        <div class="stat-pill" :style="{ background: cfg.color + '20', color: cfg.color }">
          {{ getCount(key as string) }}
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { EVENT_TYPES, type ScheduleEvent } from '../../composables/useSchedule'
import { formatTime, formatDate } from '../../composables/useCalendar'
import { getHolidayCountForMonth } from '../../data/holidays'

const props = defineProps<{
  upcomingEvents: ScheduleEvent[]
  events: ScheduleEvent[]
  modelValue: string[]       // activeTypes
  currentYear: number
  currentMonth: number
}>()

const emit = defineEmits<{
  'update:modelValue': [types: string[]]
  clickEvent: [event: ScheduleEvent]
}>()

// 今日信息
const now = new Date()
const todayDate = now.getDate()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const todayWeekday = `星期${weekdays[now.getDay()]}`

/** 事件颜色 */
const getEventColor = (evt: ScheduleEvent) =>
  evt.color || EVENT_TYPES[evt.event_type]?.color || '#4f8ef7'

/** 类型筛选切换 */
const toggleType = (type: string) => {
  const current = [...props.modelValue]
  const idx = current.indexOf(type)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(type)
  emit('update:modelValue', current)
}

/** 本月统计（节日类型叠加日历节日） */
const getCount = (type: string) => {
  const dbCount = props.events.filter(e => {
    const d = new Date(e.start_time)
    return e.event_type === type &&
      d.getFullYear() === props.currentYear &&
      d.getMonth() === props.currentMonth - 1
  }).length

  if (type === 'holiday') {
    return dbCount + getHolidayCountForMonth(props.currentMonth)
  }
  return dbCount
}
</script>

<style scoped>
.sidebar {
  width: 260px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 20px;
  max-height: calc(100vh - 140px); overflow-y: auto;
  scrollbar-width: none;
}
.sidebar::-webkit-scrollbar { display: none; }

.mini-date {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 16px;
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(79, 142, 247, 0.12);
  border-radius: 14px;
  backdrop-filter: blur(8px);
}
.mini-num {
  font-size: 38px; font-weight: 800;
  background: linear-gradient(135deg, var(--color-brand-blue), #8b5cf6);
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}
.mini-info {
  display: flex; flex-direction: column; gap: 2px;
  font-size: 12px; color: rgba(255, 255, 255, 0.45);
}

.section-title {
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.4); text-transform: uppercase;
  letter-spacing: 1.5px; margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(255, 255, 255, 0.25); padding: 20px 0;
}

.upcoming-item {
  display: flex; gap: 10px; align-items: stretch;
  padding: 10px 10px; border-radius: 10px; cursor: pointer;
  transition: all 0.2s ease; margin-bottom: 2px;
}
.upcoming-item:hover {
  background: rgba(255, 255, 255, 0.04);
  transform: translateX(2px);
}
.upcoming-bar { width: 3px; border-radius: 3px; flex-shrink: 0; min-height: 32px; }
.upcoming-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.upcoming-title {
  font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.upcoming-time { font-size: 11px; color: rgba(255, 255, 255, 0.3); }

.filter-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.filter-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 20px; font-size: 12px;
  color: rgba(255, 255, 255, 0.6); cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}
.filter-chip input { display: none; }
.filter-chip.active { color: white; }
.filter-chip:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.stat-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6);
  border-radius: 8px; transition: background 0.15s;
}
.stat-bar:hover { background: rgba(255, 255, 255, 0.02); }
.stat-left { display: flex; gap: 6px; align-items: center; }
.stat-pill {
  padding: 2px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 600; min-width: 24px; text-align: center;
}

@media (max-width: 900px) {
  .sidebar { width: 100%; max-height: 260px; }
  .mini-date { display: none; }
}
</style>
