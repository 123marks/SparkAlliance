<template>
  <section class="stats-section" ref="sectionRef">
    <div class="stats-bg-glow"></div>
    <div class="stats-container">
      <div class="stats-header" :style="rs(isVisible, 'up')">
        <span class="section-eyebrow">平台数据</span>
        <h2 class="section-title">为校园而生的力量</h2>
      </div>

      <div class="stats-grid">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="stat-block"
          :style="rs(isVisible, 'scale', 0.2 + index * 0.12)"
        >
          <div class="stat-number" :style="{ color: stat.color }">
            <SlotCounter
              :value="stat.numericValue"
              :active="isVisible"
              :prefix="stat.prefix"
              :suffix="stat.suffix"
              :color="stat.color"
            />
          </div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-desc">{{ stat.desc }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRevealOnScroll, rs } from '../../../composables/useRevealOnScroll'
import SlotCounter from '../../../components/SlotCounter.vue'

const { isVisible, sectionRef } = useRevealOnScroll({ threshold: 0.15 })

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

// 无需旧的 animateCountUp 逻辑，SlotCounter 组件内部处理滚动动画

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
}

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
  transition: background 0.3s ease, border-color 0.3s ease;
}

.stat-block:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-4px) !important;
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
