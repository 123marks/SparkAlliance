<template>
  <section class="roadmap-section" ref="sectionRef">
    <div class="roadmap-container">
      <div class="roadmap-header" :class="{ 'is-visible': isVisible }">
        <span class="section-eyebrow">产品路线图</span>
        <h2 class="section-title">持续进化，不止于此</h2>
        <p class="section-subtitle" style="margin: 0 auto;">每一步都在为你的校园生活创造更大可能</p>
      </div>

      <div class="timeline">
        <!-- 连接线 -->
        <div class="timeline-line"></div>
        
        <div
          v-for="(phase, index) in phases"
          :key="phase.title"
          class="timeline-item"
          :class="{ 'is-visible': isVisible, active: phase.active }"
          :style="{ transitionDelay: `${0.3 + index * 0.15}s` }"
        >
          <div class="timeline-dot" :class="{ active: phase.active }">
            <span v-if="phase.active" class="dot-pulse"></span>
          </div>
          <div class="timeline-card">
            <div class="phase-badge" :class="phase.status">{{ phase.statusText }}</div>
            <h3 class="phase-title">{{ phase.title }}</h3>
            <p class="phase-time">{{ phase.time }}</p>
            <ul class="phase-features">
              <li v-for="f in phase.features" :key="f">{{ f }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRevealOnScroll } from '../../../composables/useRevealOnScroll'

const { isVisible, sectionRef } = useRevealOnScroll({ threshold: 0.12 })
void sectionRef  // 用于模板 ref 绑定

const phases = [
  {
    title: 'MVP 核心',
    time: '第一阶段',
    active: true,
    status: 'current',
    statusText: '进行中',
    features: ['AI 学习助手', '校园动态墙', '用户认证系统', '个人中心']
  },
  {
    title: '核心功能',
    time: '第二阶段',
    active: false,
    status: 'next',
    statusText: '即将开启',
    features: ['学长导师系统', '星火资讯聚合', '智能日程', '健康打卡']
  },
  {
    title: '生态扩展',
    time: '第三阶段',
    active: false,
    status: 'planned',
    statusText: '规划中',
    features: ['星火人才匹配', '星火资讯聚合', '社交网络', '学习资源中心']
  },
  {
    title: '商业化',
    time: '第四阶段',
    active: false,
    status: 'future',
    statusText: '远景',
    features: ['会员体系', 'B端商家入驻', '校外青年版本', '国际化']
  }
]

</script>

<style scoped>
.roadmap-section {
  padding: 120px 40px;
  background-color: transparent;
}

.roadmap-container {
  max-width: 1000px;
  margin: 0 auto;
}

.roadmap-header {
  text-align: center;
  margin-bottom: 80px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.roadmap-header.is-visible { opacity: 1; transform: translateY(0); }

/* 时间线整体 */
.timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.timeline-line {
  position: absolute;
  top: 20px;
  left: 40px;
  right: 40px;
  height: 2px;
  background: linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-purple), rgba(255,255,255,0.1));
  z-index: 1;
}

/* 时间线节点 */
.timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.timeline-item.is-visible { opacity: 1; transform: translateY(0); }

.timeline-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  z-index: 2;
  margin-bottom: 24px;
  position: relative;
}

.timeline-dot.active {
  border-color: var(--color-brand-blue);
  background: var(--color-brand-blue);
  box-shadow: 0 0 12px rgba(79, 142, 247, 0.6);
}

.dot-pulse {
  position: absolute;
  top: -6px; left: -6px;
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-brand-blue);
  animation: dotPulse 2s infinite;
}

@keyframes dotPulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

/* 阶段卡片 */
.timeline-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 24px 20px;
  width: 100%;
  text-align: center;
  transition: all 0.3s ease;
}

.timeline-item.active .timeline-card {
  background: rgba(79, 142, 247, 0.05);
  border-color: rgba(79, 142, 247, 0.2);
}

.timeline-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.phase-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.phase-badge.current { background: rgba(79, 142, 247, 0.2); color: #60a5fa; }
.phase-badge.next { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
.phase-badge.planned { background: rgba(249, 115, 22, 0.15); color: #fb923c; }
.phase-badge.future { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }

.phase-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  color: white;
}

.phase-time {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.phase-features {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-features li {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  transition: background 0.2s;
}

.phase-features li:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* 响应式 */
@media (max-width: 900px) {
  .timeline {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
  .timeline-line { display: none; }
}

@media (max-width: 480px) {
  .timeline { grid-template-columns: 1fr; }
}
</style>
