<template>
  <section class="stats-section" ref="sectionRef">
    <div class="stats-bg-glow"></div>
    <div class="stats-container">
      <div class="stats-header" :class="{ 'is-visible': isVisible }">
        <span class="section-eyebrow">平台数据</span>
        <h2 class="section-title">为校园而生的力量</h2>
      </div>

      <div class="stats-grid">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="stat-block"
          :class="{ 'is-visible': isVisible }"
          :style="{ transitionDelay: `${0.2 + index * 0.1}s` }"
        >
          <div class="stat-number" :style="{ color: stat.color }">
            <span class="stat-prefix" v-if="stat.prefix">{{ stat.prefix }}</span>
            <span class="stat-value">{{ isVisible ? animatedValues[index] : '0' }}</span>
            <span class="stat-suffix">{{ stat.suffix }}</span>
          </div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-desc">{{ stat.desc }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// 平台亮点数据（目标数据/预期数据）
const stats = [
  {
    value: '10',
    numericValue: 10,
    suffix: '+',
    prefix: '',
    label: '核心功能模块',
    desc: 'AI答疑、校园墙、人才匹配等',
    color: '#4f8ef7'
  },
  {
    value: '24',
    numericValue: 24,
    suffix: 'h',
    prefix: '',
    label: '全天候 AI 服务',
    desc: '智能答疑不打烊',
    color: '#8b5cf6'
  },
  {
    value: '100',
    numericValue: 100,
    suffix: '%',
    prefix: '',
    label: '覆盖校园场景',
    desc: '学习·生活·社交·求职',
    color: '#10b981'
  },
  {
    value: '0',
    numericValue: 0,
    suffix: '',
    prefix: '¥',
    label: '学生完全免费',
    desc: '核心功能永不收费',
    color: '#f97316'
  }
]

// 动画数值
const animatedValues = reactive<string[]>(stats.map(() => '0'))

function animateCountUp(index: number, target: number, duration: number) {
  const startTime = performance.now()
  const tick = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
    const current = Math.round(eased * target)
    animatedValues[index] = String(current)
    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      // 确保最终值与原始 value 一致
      animatedValues[index] = stats[index].value
    }
  }
  requestAnimationFrame(tick)
}

watch(isVisible, (val) => {
  if (val) {
    stats.forEach((stat, i) => {
      setTimeout(() => {
        animateCountUp(i, stat.numericValue, 1500)
      }, i * 200)
    })
  }
})

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { threshold: 0.2 })

  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.stats-section {
  position: relative;
  padding: 120px 40px;
  overflow: hidden;
}

.stats-bg-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw; height: 80%;
  background: radial-gradient(ellipse, rgba(79, 142, 247, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.stats-container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  z-index: 1;
}

.stats-header {
  text-align: center;
  margin-bottom: 80px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.stats-header.is-visible { opacity: 1; transform: translateY(0); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
}

.stat-block {
  text-align: center;
  padding: 40px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stat-block.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.stat-block:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.stat-number {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 16px;
  letter-spacing: -2px;
}

.stat-suffix {
  font-size: 32px;
  font-weight: 600;
  opacity: 0.8;
}

.stat-prefix {
  font-size: 32px;
  font-weight: 600;
  opacity: 0.8;
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
}

.stat-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* 响应式 */
@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .stat-number { font-size: 40px; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
