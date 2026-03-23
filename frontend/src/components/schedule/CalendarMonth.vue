<!--
  CalendarMonth.vue — 月视图日历网格
  6行 × 7列，周一起始，事件色块 + 中国节日 + 事件溢出滚动
-->
<template>
  <div class="cm-wrapper">
    <!-- 星期头 -->
    <div class="cm-header">
      <div class="cm-weekday" v-for="(day, i) in weekdays" :key="day"
           :class="{ 'cm-weekend': i >= 5 }">{{ day }}</div>
    </div>

    <!-- 日期网格 -->
    <div class="cm-grid">
      <template v-for="(row, ri) in grid" :key="ri">
        <div
          v-for="(date, di) in row"
          :key="`${ri}-${di}`"
          class="cm-cell"
          :class="{
            'cm-other': date.getMonth() !== month - 1,
            'cm-today': isToday(date),
            'cm-selected': selectedDate && isSameDay(date, selectedDate),
            'cm-weekend-col': di >= 5,
          }"
          @click="$emit('selectDate', date)"
        >
          <!-- 日期行：数字 + 节日 -->
          <div class="cm-date-row">
            <span class="cm-date" :class="{ 'cm-today-num': isToday(date) }">{{ date.getDate() }}</span>
            <span class="cm-holiday" v-if="getHoliday(date)">{{ getHoliday(date) }}</span>
          </div>

          <!-- 事件列表（可滚动） -->
          <div class="cm-events">
            <div
              v-for="evt in getEventsForDate(date)"
              :key="evt.id"
              class="cm-event-dot"
              :style="{ background: getEventColor(evt) + '25', borderLeft: '3px solid ' + getEventColor(evt) }"
              :title="evt.title"
              @click.stop="$emit('clickEvent', evt)"
            >
              <span class="cm-event-label" :style="{ color: getEventColor(evt) }">{{ evt.title }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduleEvent } from '../../composables/useSchedule'

const props = defineProps<{
  year: number
  month: number
  events: ScheduleEvent[]
  selectedDate?: Date | null
  grid: Date[][]
  holidays?: Record<string, string> // "MM-DD" → 节日名
}>()

defineEmits<{
  selectDate: [date: Date]
  clickEvent: [event: ScheduleEvent]
}>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const isToday = (date: Date) => {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const getEventsForDate = (date: Date): ScheduleEvent[] =>
  props.events.filter(e => isSameDay(new Date(e.start_time), date))

const colorMap: Record<string, string> = {
  course: '#4f8ef7', exam: '#ef4444', task: '#f97316',
  life: '#10b981', reminder: '#8b5cf6', holiday: '#fbbf24',
}
const getEventColor = (e: ScheduleEvent) => e.color || colorMap[e.event_type] || '#4f8ef7'

/** 获取节日名称 */
const getHoliday = (date: Date): string | null => {
  if (!props.holidays) return null
  const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return props.holidays[key] || null
}
</script>

<style scoped>
.cm-wrapper {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px; overflow: hidden;
  background: rgba(255, 255, 255, 0.015);
  backdrop-filter: blur(8px);
}

.cm-header {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}
.cm-weekday {
  padding: 14px 0; text-align: center;
  font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.3); text-transform: uppercase;
}
.cm-weekend { color: rgba(239, 68, 68, 0.35); }

.cm-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
}

.cm-cell {
  min-height: 100px; max-height: 120px;
  padding: 8px 6px 4px; position: relative;
  cursor: pointer; transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
  border-right: 1px solid rgba(255, 255, 255, 0.025);
}
.cm-cell:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.cm-other { opacity: 0.25; }
.cm-today {
  background: rgba(79, 142, 247, 0.05);
  box-shadow: inset 0 0 0 1px rgba(79, 142, 247, 0.12);
}
.cm-selected {
  background: rgba(79, 142, 247, 0.08) !important;
  box-shadow: inset 0 0 0 1px rgba(79, 142, 247, 0.2) !important;
}
.cm-weekend-col { background: rgba(139, 92, 246, 0.015); }

.cm-date-row {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 4px;
}
.cm-date {
  font-size: 13px; color: rgba(255, 255, 255, 0.55); font-weight: 500;
  width: 26px; height: 26px; line-height: 26px; text-align: center;
  border-radius: 50%; flex-shrink: 0; transition: all 0.15s;
}
.cm-cell:hover .cm-date { color: rgba(255, 255, 255, 0.8); }
.cm-today-num {
  background: var(--color-brand-blue); color: white !important; font-weight: 700;
  box-shadow: 0 2px 8px rgba(79, 142, 247, 0.35);
}
.cm-holiday {
  font-size: 10px; color: #fbbf24; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  opacity: 0.8;
}

.cm-events {
  display: flex; flex-direction: column; gap: 2px;
  max-height: 52px; overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cm-events::-webkit-scrollbar { display: none; }

.cm-event-dot {
  padding: 2px 6px; border-radius: 5px;
  font-size: 11px; overflow: hidden; cursor: pointer;
  transition: all 0.15s ease; flex-shrink: 0;
}
.cm-event-dot:hover {
  filter: brightness(1.3);
  transform: translateX(2px);
}
.cm-event-label {
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; display: block;
  font-weight: 500;
}
</style>
