import { ref, onMounted, onBeforeUnmount, nextTick, type Ref, type CSSProperties } from 'vue'

/* ================================================================
 * useRevealOnScroll — v11 双向滚动版
 *
 * 核心行为：
 * - 元素进入视口 → isVisible = true  → 内容从四周收拢到正常位置
 * - 元素离开视口 → isVisible = false → 内容向四周褪去、颜色变浅
 * - 再次滚回     → isVisible = true  → 再次收拢显现
 * ================================================================ */

/** 入场方向 */
export type RevealDir = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'

const DIR_MAP: Record<RevealDir, string> = {
  up:    'translateY(60px)',
  down:  'translateY(-60px)',
  left:  'translateX(-80px)',
  right: 'translateX(80px)',
  scale: 'scale(0.85)',
  fade:  'none',
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * 生成入场/退场动画 inline style
 * visible=true  → opacity:1, transform:none
 * visible=false → opacity:0, transform:偏移
 */
export function rs(
  visible: boolean,
  dir: RevealDir = 'up',
  delay = 0,
  dur = 0.7,
): CSSProperties {
  return {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'none' : DIR_MAP[dir],
    transition: `opacity ${dur}s ${EASE} ${delay}s, transform ${dur}s ${EASE} ${delay}s`,
    willChange: visible ? 'auto' : 'opacity, transform',
  }
}

export function useRevealOnScroll(options?: {
  threshold?: number
}) {
  const isVisible = ref(false)
  const sectionRef: Ref<HTMLElement | null> = ref(null)
  let observer: IntersectionObserver | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  let hasBeenVisible = false

  onMounted(async () => {
    await nextTick()

    // prefers-reduced-motion → 永远可见
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        isVisible.value = true
        return
      }
    } catch { /* ignore */ }

    const el = sectionRef.value
    if (!el) {
      isVisible.value = true
      return
    }

    // 3s 硬兜底：防止 IO 从不触发
    fallbackTimer = setTimeout(() => {
      if (!hasBeenVisible) {
        isVisible.value = true
        hasBeenVisible = true
      }
    }, 3000)

    try {
      if (typeof IntersectionObserver === 'undefined') {
        isVisible.value = true
        return
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              // 进入视口 → 立即显示
              isVisible.value = true
              hasBeenVisible = true
              if (fallbackTimer) {
                clearTimeout(fallbackTimer)
                fallbackTimer = null
              }
            } else if (hasBeenVisible) {
              // 离开视口 → 隐藏（向四周褪去）
              isVisible.value = false
            }
          }
        },
        {
          threshold: options?.threshold ?? 0.05,
          rootMargin: '80px 0px 80px 0px',
        }
      )
      observer.observe(el)
    } catch {
      isVisible.value = true
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (fallbackTimer) clearTimeout(fallbackTimer)
  })

  return { isVisible, sectionRef }
}
