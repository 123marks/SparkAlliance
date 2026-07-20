import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let seq = 0

export const toasts = reactive<ToastItem[]>([])

export function toast(message: string, type: ToastType = 'success'): void {
  const item: ToastItem = { id: ++seq, type, message }
  toasts.push(item)
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === item.id)
    if (idx >= 0) toasts.splice(idx, 1)
  }, 3200)
}
