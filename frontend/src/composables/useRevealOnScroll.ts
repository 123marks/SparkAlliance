import { ref, onMounted, onBeforeUnmount, type Ref, type CSSProperties } from 'vue'

/* ================================================================
 * useRevealOnScroll — v9 内联样式版（彻底杜绝 CSS 冲突）
 *
 * 核心变化：用 inline style 替代 CSS class 控制元素可见性。
 * inline style 具有最高 CSS 优先级，不会被任何全局/scoped CSS 覆盖。
 *
 * 用法：
 *   const { isVisible, sectionRef } = useRevealOnScroll()
 *   模板：<div ref="sectionRef"> ... </div>
 *   子元素入场：<div :style="rs(isVisible, 'left', 0.2)"> ... </div>
 * ================================================================ */

/** 入场方向 */
export type RevealDir = 'up' | 'down' | 'left' | 'right' | 'scale'

const TRANSFORMS: Record<RevealDir, string> = {
  up: 'translateY(50px)',
  down: 'translateY(-50px)',
  left: 'translateX(-60px)',
  right: 'translateX(60px)',
  scale: 'scale(0.88) translateY(20px)',
}

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * 生成入场动画 inline style
 * @param visible - 是否可见（通常绑定 isVisible ref）
 * @param dir     - 入场方向
 * @param delay   - 延迟秒数（用于 stagger）
 * @param dur     - 持续时间秒数
 */
export function rs(
  visible: boolean,
  dir: RevealDir = 'up',
  delay = 0,
  dur = 0.8,
): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : TRANSFORMS[dir],
    transition: `opacity ${dur}s ${EASE} ${delay}s, transform ${dur}s ${EASE} ${delay}s`,
  }
}

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

    // 4. 元素已在视口内或接近视口 → 下一帧显示（确保浏览器已绘制初始态）
    try {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh + 100) {
        requestAnimationFrame(() => reveal())
        // 仍然设置兜底以防 rAF 不执行
        timer = setTimeout(reveal, 3000)
        return
      }
    } catch {
      reveal(); return
    }

    // 5. 元素在视口下方 → IntersectionObserver 触发
    observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) reveal()
    }, {
      threshold: options?.threshold ?? 0.08,
      rootMargin: options?.rootMargin ?? '0px 0px -40px 0px',
    })
    observer.observe(el)

    // 6. 绝对硬兜底：3 秒后无条件显示
    timer = setTimeout(reveal, 3000)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (timer) clearTimeout(timer)
  })

  return { isVisible, sectionRef }
}
