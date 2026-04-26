<template>
  <div class="cw-container">
    <div class="cw-header">
      <div class="cw-time-gutter"></div>
      <div
        v-for="(day, index) in weekDays"
        :key="index"
        class="cw-day-header"
        :class="{ 'cw-today-header': isToday(day) }"
      >
        <span class="cw-day-name">{{ dayNames[index] }}</span>
        <span class="cw-day-num" :class="{ 'cw-today-num': isToday(day) }">{{ day.getDate() }}</span>
      </div>
    </div>

    <div class="cw-body" ref="bodyRef">
      <div class="cw-time-column">
        <div v-for="hour in 24" :key="hour" class="cw-hour-label">
          {{ String(hour - 1).padStart(2, '0') }}:00
        </div>
      </div>

      <div class="cw-days-grid">
        <div v-for="(day, dayIndex) in weekDays" :key="dayIndex" class="cw-day-column">
          <div
            v-for="hour in 24"
            :key="hour"
            class="cw-hour-cell"
            @click="$emit('createAt', day, hour - 1)"
          ></div>

          <div
            v-for="layout in getEventLayoutsForDay(day)"
            :key="layout.event.id"
            class="cw-event-block"
            :class="priorityClass(layout.event)"
            :style="eventBlockStyle(layout)"
            @click.stop="$emit('clickEvent', layout.event)"
          >
            <span class="cw-event-title">{{ priorityBadge(layout.event) }}{{ layout.event.title }}</span>
            <span class="cw-event-time">{{ formatTime(layout.event.start_time) }}</span>
          </div>
        </div>

        <div v-if="todayIndex >= 0" class="cw-now-line" :style="nowLineStyle"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getScheduleEventDisplayColor, type ScheduleEvent } from '../../composables/useSchedule'
import { buildTimedEventLayouts, type TimedEventLayout } from './eventLayout'

const props = defineProps<{
  weekDays: Date[]
  events: ScheduleEvent[]
  hourHeight?: number
}>()

defineEmits<{
  clickEvent: [event: ScheduleEvent]
  createAt: [date: Date, hour: number]
}>()

const HOUR_H = props.hourHeight || 60
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const bodyRef = ref<HTMLElement | null>(null)

const isToday = (date: Date) => {
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
void isSameDay

const getEventsForDay = (date: Date): ScheduleEvent[] => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayEnd = new Date(dayStart.getTime() + 86400000 - 1)
  return props.events.filter(event => {
    if (event.all_day) return false
    const s = new Date(event.start_time)
    const end = event.end_time ? new Date(event.end_time) : s
    return s <= dayEnd && end >= dayStart
  })
}

const getEventLayoutsForDay = (date: Date): TimedEventLayout<ScheduleEvent>[] =>
  buildTimedEventLayouts(getEventsForDay(date))

const formatTime = (iso: string) => {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const priorityBar = (e: ScheduleEvent) => {
  if (e.priority >= 2) return 5
  if (e.priority === 1) return 4
  return 3
}

const priorityClass = (e: ScheduleEvent): string => {
  if (e.priority >= 2) return 'cw-prio-urgent'
  if (e.priority === 1) return 'cw-prio-high'
  if (e.priority === -1) return 'cw-prio-low'
  return ''
}

const priorityBadge = (e: ScheduleEvent): string => {
  if (e.priority >= 2) return '🔥 '
  if (e.priority === 1) return '⬆️ '
  return ''
}

const eventBlockStyle = (layout: TimedEventLayout<ScheduleEvent>) => {
  const color = getScheduleEventDisplayColor(layout.event)
  const bw = priorityBar(layout.event)
  return {
    top: `${(layout.startMinutes / 60) * HOUR_H}px`,
    height: `${Math.max((layout.durationMinutes / 60) * HOUR_H, 20)}px`,
    left: `calc(${layout.columnIndex} * (100% / ${layout.columnCount}) + 2px)`,
    width: `calc((100% / ${layout.columnCount}) - 4px)`,
    background: color,
    borderLeft: `${bw}px solid rgba(255,255,255,0.92)`,
  }
}

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const todayIndex = computed(() => props.weekDays.findIndex(day => isToday(day)))

const nowLineStyle = computed(() => {
  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  const top = (minutes / 60) * HOUR_H
  const left = `calc(${(todayIndex.value / 7) * 100}%)`
  return { top: `${top}px`, left }
})

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 60000)
  if (bodyRef.value) {
    bodyRef.value.scrollTop = Math.max(0, (new Date().getHours() - 1) * HOUR_H)
  }
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.cw-container {
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; overflow: hidden;
  background: rgba(15,15,25,0.6);
}

.cw-header {
  display: flex; border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 2;
  background: rgba(20,20,30,0.95);
}
.cw-time-gutter { width: 60px; flex-shrink: 0; }
.cw-day-header {
  flex: 1; text-align: center; padding: 10px 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.cw-day-name { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }
.cw-day-num {
  font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.8);
  width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 50%;
}
.cw-today-num { background: var(--color-brand-blue); color: white; }

.cw-body {
  display: flex; max-height: 600px; overflow-y: auto;
  position: relative;
}
.cw-time-column { width: 60px; flex-shrink: 0; }
.cw-hour-label {
  height: v-bind('HOUR_H + "px"');
  font-size: 11px; color: rgba(255,255,255,0.3);
  text-align: right; padding-right: 8px; padding-top: 2px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.cw-days-grid {
  flex: 1; display: flex; position: relative;
}
.cw-day-column {
  flex: 1; position: relative;
  border-left: 1px solid rgba(255,255,255,0.04);
}
.cw-hour-cell {
  height: v-bind('HOUR_H + "px"');
  border-top: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.cw-hour-cell:hover { background: rgba(255,255,255,0.02); }

.cw-event-block {
  position: absolute;
  border-radius: 6px; padding: 4px 6px;
  overflow: hidden; cursor: pointer;
  opacity: 0.9; transition: opacity 0.15s;
  z-index: 1;
}
.cw-event-block:hover { opacity: 1; }
.cw-event-block.cw-prio-urgent {
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.45), 0 2px 8px rgba(239, 68, 68, 0.25);
}
.cw-event-block.cw-prio-high {
  box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.35);
}
.cw-event-block.cw-prio-low { opacity: 0.72; }
.cw-event-title {
  display: block; font-size: 11px; font-weight: 600;
  color: white; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.cw-event-time { font-size: 10px; color: rgba(255,255,255,0.7); }

.cw-now-line {
  position: absolute; right: 0; height: 2px;
  background: #ef4444; z-index: 3;
  width: calc(100% / 7);
}
.cw-now-line::before {
  content: ''; position: absolute; left: -4px; top: -3px;
  width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
}

.cw-body::-webkit-scrollbar { width: 4px; }
.cw-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
