import { ref, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'

/**
 * 可靠的"滚动入场"触发——鲁棒性优先：
 *   - 页面加载后立刻把 isVisible 置为 true（让 CSS transition 作入场动画）
 *   - 即使 JS 出错、IntersectionObserver 不触发、Vue transition 卡住，也能看见内容
 *   - 还额外保留短 fallback 定时器（150ms）+ 视口内直触 + prefers-reduced-motion 直触
 *
 * 兼容原有的 `:class="{ 'is-visible': isVisible }"` 用法。
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
  let rafHandle: number | null = null

  // v7.3 兜底值缩短到 150ms：section 挂载后若 IO 不触发，用户不应等半秒
  const threshold = options?.threshold ?? 0.12
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px'
  const fallbackMs = options?.fallbackMs ?? 150

  function reveal() {
    if (isVisible.value) return
    isVisible.value = true
    observer?.disconnect()
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
    if (fallbackTimer2) { clearTimeout(fallbackTimer2); fallbackTimer2 = null }
    if (rafHandle !== null) { cancelAnimationFrame(rafHandle); rafHandle = null }
  }

  function tryObserve() {
    if (isVisible.value) return true
    if (!sectionRef.value) return false

    // 元素已在视口内，直接显示
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

    // 第一帧后先尝试 Observer（对滚动入场有动画）
    if (!tryObserve()) {
      nextTick(() => {
        if (!tryObserve()) {
          fallbackTimer = setTimeout(reveal, fallbackMs)
        }
      })
    }

    // 硬兜底 #1：150ms 后强制显示
    fallbackTimer2 = setTimeout(reveal, fallbackMs)

    // 硬兜底 #2：document 已加载完 → 下一帧直接 reveal；否则监听 window.load
    if (typeof window !== 'undefined') {
      const onLoad = () => reveal()
      if (document.readyState === 'complete') {
        rafHandle = requestAnimationFrame(() => reveal())
      } else {
        window.addEventListener('load', onLoad, { once: true })
      }
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (fallbackTimer) clearTimeout(fallbackTimer)
    if (fallbackTimer2) clearTimeout(fallbackTimer2)
    if (rafHandle !== null) cancelAnimationFrame(rafHandle)
  })

  return { isVisible, sectionRef }
}
