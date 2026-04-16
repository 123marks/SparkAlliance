import { ref, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'

/**
 * 可靠的"滚动入场"触发：使用 IntersectionObserver 为主，
 * 并提供四重兜底确保内容一定显示：
 *   1) 元素挂载时若已在视口内，立即显示
 *   2) nextTick 后再次检测 sectionRef（防止首次 onMounted 时 ref 未绑定）
 *   3) fallbackMs 内未触发则强制显示（防止 Observer 失效/root 异常）
 *   4) prefers-reduced-motion 用户直接显示
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
  let fallbackTimer2: ReturnType<typeof setTimeout> | null = null

  const threshold = options?.threshold ?? 0.12
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px'
  const fallbackMs = options?.fallbackMs ?? 500

  function reveal() {
    if (isVisible.value) return
    isVisible.value = true
    observer?.disconnect()
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
    if (fallbackTimer2) { clearTimeout(fallbackTimer2); fallbackTimer2 = null }
  }

  function tryObserve() {
    if (isVisible.value) return
    if (!sectionRef.value) return false

    // 初始检测：如果元素已在视口内（首屏 section），立即显示
    try {
      const rect = sectionRef.value.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh && rect.bottom > 0) {
        reveal()
        return true
      }
    } catch { /* ignore */ }

    if (typeof IntersectionObserver === 'undefined') {
      reveal()
      return true
    }

    observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) reveal()
    }, { threshold, rootMargin })

    observer.observe(sectionRef.value)
    return true
  }

  onMounted(() => {
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { reveal(); return }

    // 第一次尝试绑定 Observer
    if (!tryObserve()) {
      // sectionRef 可能在 nextTick 后才绑定（Vue 3 模板 ref 时序）
      nextTick(() => {
        if (!tryObserve()) {
          // 仍然没有 sectionRef，启动短 fallback
          fallbackTimer = setTimeout(reveal, fallbackMs)
        }
      })
    }

    // 绝对兜底：无论如何都在 fallbackMs 后显示
    fallbackTimer2 = setTimeout(reveal, fallbackMs)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (fallbackTimer) clearTimeout(fallbackTimer)
    if (fallbackTimer2) clearTimeout(fallbackTimer2)
  })

  return { isVisible, sectionRef }
}
