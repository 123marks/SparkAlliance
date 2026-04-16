import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * 可靠的"滚动入场"触发：使用 IntersectionObserver 为主，
 * 并提供三重兜底确保内容一定显示：
 *   1) 元素挂载时若已在视口内，立即显示
 *   2) fallbackMs 内未触发则强制显示（防止 Observer 失效/root 异常）
 *   3) prefers-reduced-motion 用户直接显示
 */
export function useRevealOnScroll(options?: {
  threshold?: number
  rootMargin?: string
  fallbackMs?: number
}) {
  const isVisible = ref(false)
  const sectionRef: Ref<HTMLElement | null> = ref(null)
  let observer: IntersectionObserver | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  const threshold = options?.threshold ?? 0.12
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px'
  const fallbackMs = options?.fallbackMs ?? 900

  function reveal() {
    if (isVisible.value) return
    isVisible.value = true
    observer?.disconnect()
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
  }

  onMounted(() => {
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { reveal(); return }

    if (!sectionRef.value) {
      fallbackTimer = setTimeout(reveal, fallbackMs)
      return
    }

    // 初始检测：如果元素已在视口内（首屏 section），立即显示
    try {
      const rect = sectionRef.value.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh && rect.bottom > 0) {
        reveal()
        return
      }
    } catch { /* ignore */ }

    if (typeof IntersectionObserver === 'undefined') {
      reveal()
      return
    }

    observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) reveal()
    }, { threshold, rootMargin })

    observer.observe(sectionRef.value)

    fallbackTimer = setTimeout(reveal, fallbackMs)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (fallbackTimer) clearTimeout(fallbackTimer)
  })

  return { isVisible, sectionRef }
}
