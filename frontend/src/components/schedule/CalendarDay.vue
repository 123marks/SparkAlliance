<template>
  <div class="cd-container">
    <div class="cd-title">
      <span class="cd-title-date">{{ date.getMonth() + 1 }} 月 {{ date.getDate() }} 日</span>
      <span class="cd-title-day">{{ weekdayName }}</span>
      <span v-if="isToday" class="cd-today-badge">今天</span>
    </div>

    <div v-if="allDayEvents.length" class="cd-allday">
      <div class="cd-allday-label">全天</div>
      <div
        v-for="event in allDayEvents"
        :key="event.id"
        class="cd-allday-item"
        :style="{ background: getColor(event) }"
        @click="$emit('clickEvent', event)"
      >
        {{ EVENT_TYPES[event.event_type]?.icon }} {{ event.title }}
      </div>
    </div>

    <div class="cd-timeline" ref="timelineRef">
      <div v-for="hour in 24" :key="hour" class="cd-hour-row">
        <div class="cd-hour-label">{{ String(hour - 1).padStart(2, '0') }}:00</div>
        <div class="cd-hour-area" @click="$emit('createAt', date, hour - 1)"></div>
      </div>

      <div
        v-for="layout in timedEventLayouts"
        :key="layout.event.id"
        class="cd-event-block"
        :class="priorityClass(layout.event)"
        :style="blockStyle(layout)"
        @click.stop="$emit('clickEvent', layout.event)"
      >
        <div class="cd-event-inner">
          <span class="cd-event-icon">{{ EVENT_TYPES[layout.event.event_type]?.icon }}</span>
          <div class="cd-event-info">
            <span class="cd-event-title">{{ priorityBadge(layout.event) }}{{ layout.event.title }}</span>
            <span class="cd-event-meta">
              {{ formatTime(layout.event.start_time) }} - {{ layout.event.end_time ? formatTime(layout.event.end_time) : '' }}
              <template v-if="layout.event.location"> · {{ layout.event.location }}</template>
            </span>
          </div>
        </div>
      </div>

      <div v-if="isToday" class="cd-now-line" :style="{ top: `${nowTop}px` }">
        <span class="cd-now-dot"></span>
        <span class="cd-now-time">{{ nowTimeStr }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { EVENT_TYPES, type ScheduleEvent } from '../../composables/useSchedule'
import { buildTimedEventLayouts, type TimedEventLayout } from './eventLayout'

const props = defineProps<{
  date: Date
  events: ScheduleEvent[]
  hourHeight?: number
}>()

defineEmits<{
  clickEvent: [event: ScheduleEvent]
  createAt: [date: Date, hour: number]
}>()

const HOUR_H = props.hourHeight || 60
const timelineRef = ref<HTMLElement | null>(null)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const weekdayName = computed(() => `星期${weekdays[props.date.getDay()]}`)
const isToday = computed(() => {
  const now = new Date()
  return props.date.getFullYear() === now.getFullYear()
    && props.date.getMonth() === now.getMonth()
    && props.date.getDate() === now.getDate()
})

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
void isSameDay

const dayStart = computed(() => new Date(props.date.getFullYear(), props.date.getMonth(), props.date.getDate()))
const dayEnd = computed(() => new Date(dayStart.value.getTime() + 86400000 - 1))

function eventOverlapsDay(event: ScheduleEvent): boolean {
  const s = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : s
  return s <= dayEnd.value && end >= dayStart.value
}

const allDayEvents = computed(() =>
  props.events.filter(event => event.all_day && eventOverlapsDay(event))
)
const timedEvents = computed(() =>
  props.events.filter(event => !event.all_day && eventOverlapsDay(event))
)
const timedEventLayouts = computed(() => buildTimedEventLayouts(timedEvents.value))

const formatTime = (iso: string) => {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const colorMap: Record<string, string> = {
  course: '#4f8ef7',
  exam: '#ef4444',
  task: '#f97316',
  life: '#10b981',
  reminder: '#8b5cf6',
  holiday: '#fbbf24',
}

const getColor = (event: ScheduleEvent) => event.color || colorMap[event.event_type] || '#4f8ef7'

const priorityBar = (e: ScheduleEvent) => {
  if (e.priority >= 2) return 5
  if (e.priority === 1) return 4
  return 3
}

const priorityClass = (e: ScheduleEvent): string => {
  if (e.priority >= 2) return 'cd-prio-urgent'
  if (e.priority === 1) return 'cd-prio-high'
  if (e.priority === -1) return 'cd-prio-low'
  return ''
}

const priorityBadge = (e: ScheduleEvent): string => {
  if (e.priority >= 2) return '🔥 '
  if (e.priority === 1) return '⬆️ '
  return ''
}

const blockStyle = (layout: TimedEventLayout<ScheduleEvent>) => {
  const color = getColor(layout.event)
  const bw = priorityBar(layout.event)
  return {
    top: `${(layout.startMinutes / 60) * HOUR_H}px`,
    height: `${Math.max((layout.durationMinutes / 60) * HOUR_H, 28)}px`,
    left: `calc(68px + ${layout.columnIndex} * ((100% - 80px) / ${layout.columnCount}) + 2px)`,
    width: `calc(((100% - 80px) / ${layout.columnCount}) - 4px)`,
    borderLeft: `${bw}px solid ${color}`,
    background: `${color}15`,
  }
}

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const nowTop = computed(() => {
  const current = now.value
  return ((current.getHours() * 60 + current.getMinutes()) / 60) * HOUR_H
})
const nowTimeStr = computed(() => formatTime(now.value.toISOString()))

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 60000)
  if (timelineRef.value && isToday.value) {
    timelineRef.value.scrollTop = Math.max(0, (new Date().getHours() - 1) * HOUR_H)
  }
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.cd-container {
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; overflow: hidden;
  background: rgba(15,15,25,0.6);
}

.cd-title {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(20,20,30,0.95);
}
.cd-title-date { font-size: 18px; font-weight: 700; color: white; }
.cd-title-day { font-size: 14px; color: rgba(255,255,255,0.5); }
.cd-today-badge {
  background: var(--color-brand-blue); color: white;
  padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
}

.cd-allday {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 20px; border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-wrap: wrap;
}
.cd-allday-label {
  font-size: 11px; color: rgba(255,255,255,0.3); width: 40px; flex-shrink: 0;
}
.cd-allday-item {
  padding: 4px 12px; border-radius: 6px;
  font-size: 12px; color: white; cursor: pointer;
  transition: filter 0.15s;
}
.cd-allday-item:hover { filter: brightness(1.2); }

.cd-timeline {
  position: relative; max-height: 600px; overflow-y: auto;
}
.cd-hour-row { display: flex; }
.cd-hour-label {
  width: 60px; flex-shrink: 0; text-align: right;
  padding: 2px 8px 0 0; font-size: 11px;
  color: rgba(255,255,255,0.25); height: v-bind('HOUR_H + "px"');
}
.cd-hour-area {
  flex: 1; height: v-bind('HOUR_H + "px"');
  border-top: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.cd-hour-area:hover { background: rgba(255,255,255,0.02); }

.cd-event-block {
  position: absolute;
  border-radius: 8px; cursor: pointer;
  overflow: hidden; z-index: 1;
  transition: filter 0.15s;
}
.cd-event-block:hover { filter: brightness(1.15); }
.cd-event-block.cd-prio-urgent {
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4), 0 2px 10px rgba(239, 68, 68, 0.2);
}
.cd-event-block.cd-prio-high {
  box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.3);
}
.cd-event-block.cd-prio-low { opacity: 0.72; }
.cd-event-inner {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 6px 10px; height: 100%;
}
.cd-event-icon { font-size: 16px; flex-shrink: 0; }
.cd-event-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cd-event-title {
  font-size: 13px; font-weight: 600; color: white;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cd-event-meta {
  font-size: 11px; color: rgba(255,255,255,0.6);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.cd-now-line {
  position: absolute; left: 50px; right: 0;
  height: 2px; background: #ef4444; z-index: 3;
  display: flex; align-items: center;
}
.cd-now-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444; margin-left: -4px; flex-shrink: 0;
}
.cd-now-time {
  font-size: 10px; color: #ef4444; font-weight: 700;
  margin-left: 4px; background: rgba(15,15,25,0.9);
  padding: 0 4px; border-radius: 3px;
}

.cd-timeline::-webkit-scrollbar { width: 4px; }
.cd-timeline::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
