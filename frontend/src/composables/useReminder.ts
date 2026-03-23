/**
 * useReminder.ts — 前台提醒调度系统
 *
 * 终审裁决：
 * - MVP 只保留前台提醒（setTimeout），不建 event_reminders 表
 * - 明确限制：浏览器关闭/标签页休眠时不保证送达
 * - Notification 权限只在用户主动开启提醒时请求，不在进入页面时硬弹
 */
import { ref, onUnmounted } from 'vue'
import type { ScheduleEvent } from './useSchedule'

/** 提醒状态 */
interface ScheduledReminder {
  eventId: string
  eventTitle: string
  timerId: ReturnType<typeof setTimeout>
  triggerTime: Date
}

/** 通知权限状态 */
export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function useReminder() {
  const scheduledReminders = ref<ScheduledReminder[]>([])
  const permissionState = ref<PermissionState>(getPermissionState())

  /**
   * 获取当前通知权限状态
   */
  function getPermissionState(): PermissionState {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission as PermissionState
  }

  /**
   * 上下文式请求通知权限
   * 终审要求：只在用户主动设置提醒时调用
   * 
   * @returns 是否获得权限
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[Reminder] 当前浏览器不支持通知')
      return false
    }

    if (Notification.permission === 'granted') {
      permissionState.value = 'granted'
      return true
    }

    if (Notification.permission === 'denied') {
      permissionState.value = 'denied'
      return false
    }

    // 用户尚未决定，弹出请求
    const result = await Notification.requestPermission()
    permissionState.value = result as PermissionState
    return result === 'granted'
  }

  /**
   * 为事件调度提醒
   * 会自动根据事件的 reminders 配置设置 setTimeout
   */
  const scheduleReminders = (events: ScheduleEvent[]) => {
    // 清除旧的提醒
    clearAllReminders()

    const now = Date.now()

    for (const event of events) {
      if (!event.reminders || event.reminders.length === 0) continue
      if (event.status !== 'active') continue

      const eventStart = new Date(event.start_time).getTime()

      for (const reminder of event.reminders) {
        // 计算提醒触发时间（提前 N 分钟）
        const triggerTime = eventStart - reminder.value * 60000
        const delay = triggerTime - now

        // 只调度未来的提醒（且在 24 小时内，避免过远的 setTimeout）
        if (delay > 0 && delay < 86400000) {
          const timerId = setTimeout(() => {
            triggerNotification(event, reminder.value)
          }, delay)

          scheduledReminders.value.push({
            eventId: event.id,
            eventTitle: event.title,
            timerId,
            triggerTime: new Date(triggerTime),
          })
        }
      }
    }
  }

  /**
   * 触发通知
   */
  function triggerNotification(event: ScheduleEvent, minutesBefore: number): void {
    const timeDesc = minutesBefore >= 60
      ? `${minutesBefore / 60} 小时`
      : `${minutesBefore} 分钟`

    // 浏览器通知
    if (Notification.permission === 'granted') {
      try {
        new Notification(`📅 ${event.title}`, {
          body: `将在 ${timeDesc} 后开始${event.location ? ` · 📍 ${event.location}` : ''}`,
          icon: '/favicon.ico',
          tag: `schedule-${event.id}`,
        })
      } catch (e) {
        console.warn('[Reminder] 通知发送失败:', e)
      }
    }

    // 同时触发页面内提示（通过自定义事件）
    window.dispatchEvent(new CustomEvent('schedule-reminder', {
      detail: {
        event,
        minutesBefore,
        message: `「${event.title}」将在 ${timeDesc} 后开始`,
      },
    }))
  }

  /**
   * 清除所有已调度的提醒
   */
  const clearAllReminders = () => {
    for (const r of scheduledReminders.value) {
      clearTimeout(r.timerId)
    }
    scheduledReminders.value = []
  }

  /**
   * 清除特定事件的提醒
   */
  const clearEventReminders = (eventId: string) => {
    const remaining: ScheduledReminder[] = []
    for (const r of scheduledReminders.value) {
      if (r.eventId === eventId) {
        clearTimeout(r.timerId)
      } else {
        remaining.push(r)
      }
    }
    scheduledReminders.value = remaining
  }

  // 组件卸载时清理
  onUnmounted(clearAllReminders)

  return {
    scheduledReminders,
    permissionState,
    requestPermission,
    scheduleReminders,
    clearAllReminders,
    clearEventReminders,
  }
}
