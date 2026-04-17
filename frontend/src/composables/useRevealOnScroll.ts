import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * 滚动入场 composable — v8 终极可靠版
 *
 * 核心原则：内容 **必须** 可见。
 *   - 视口内元素：onMounted 立即 reveal（0 延迟）
 *   - 视口外元素：IntersectionObserver 触发 reveal
 *   - 硬兜底：6 秒后无条件 reveal
 *   - prefers-reduced-motion / 无 IO 支持：立即 reveal
 *
 * 用法不变：`:class="{ 'is-visible': isVisible }"`
 */
export function useRevealOnScroll(options?: {
  threshold?: number
  rootMargin?: string
}) {
  const isVisible = ref(false)
  const sectionRef: Ref<HTMLElement | null> = ref(null)
  let observer: IntersectionObserver | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function reveal() {
    if (isVisible.value) return
    isVisible.value = true
    observer?.disconnect()
    observer = null
    if (timer) { clearTimeout(timer); timer = null }
  }

  onMounted(() => {
    // 1. prefers-reduced-motion → 直接显示
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      reveal(); return
    }

    // 2. 无 IntersectionObserver 支持 → 直接显示
    if (typeof IntersectionObserver === 'undefined') {
      reveal(); return
    }

    // 3. ref 未绑定 → 直接显示
    const el = sectionRef.value
    if (!el) { reveal(); return }

    // 4. 元素已在视口内或接近视口 → 立即显示
    try {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh + 100) {
        reveal(); return
      }
    } catch {
      reveal(); return
    }

    // 5. 元素在视口下方 → IntersectionObserver 触发
    observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) reveal()
    }, {
      threshold: options?.threshold ?? 0.08,
      rootMargin: options?.rootMargin ?? '0px 0px -40px 0px'
    })
    observer.observe(el)

    // 6. 绝对硬兜底：6 秒后无条件显示
    timer = setTimeout(reveal, 6000)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (timer) clearTimeout(timer)
  })

  return { isVisible, sectionRef }
}
