<template>
  <section class="hero-section">
    <!-- 粒子背景 -->
    <ParticleBackground class="hero-bg" />
    
    <!-- 装饰网格线 -->
    <div class="grid-overlay"></div>
    
    <!-- 中心光晕 -->
    <div class="central-glow"></div>
    
    <!-- 浮动装饰元素 -->
    <div class="floating-elements">
      <div class="float-icon f1">🤖</div>
      <div class="float-icon f2">📚</div>
      <div class="float-icon f3">💡</div>
      <div class="float-icon f4">🎯</div>
      <div class="float-icon f5">🚀</div>
    </div>

    <div class="hero-content">
      <!-- 状态标签 -->
      <div class="badge-wrapper stagger-1">
        <span class="badge"><span class="pulse"></span> ✦ 正在公测</span>
      </div>

      <!-- 主标题 -->
      <h1 class="main-title stagger-2">
        <span class="text-gradient">星火联盟</span><br/>专属数字时空
      </h1>
      <p class="subtitle stagger-3">以本地化 AI 为驱动矩阵，一站式赋能大学生的学习、生活与社交</p>

      <!-- 功能亮点 -->
      <div class="highlight-tags stagger-4">
        <span class="hl-tag">🤖 AI 智能答疑</span>
        <span class="hl-tag">📝 校园动态墙</span>
        <span class="hl-tag">💼 人才匹配</span>
        <span class="hl-tag">📅 智能日程</span>
      </div>

      <!-- CTA 按钮 -->
      <div class="cta-group stagger-5">
        <router-link to="/register" class="btn-primary-large spring-hover">极速启航 &rarr;</router-link>
        <router-link to="/docs" class="btn-ghost-large spring-hover">探索特性 &#9654;</router-link>
      </div>

      <!-- 状态信息 -->
      <div class="hero-stats stagger-5">
        <div class="stat-item">
          <span class="stat-num">内测进行中</span>
          <span class="stat-label">即将开放注册</span>
        </div>
      </div>
    </div>

    <!-- 底部滚动引导 -->
    <div class="scroll-hint stagger-5">
      <span class="scroll-text">向下探索</span>
      <div class="scroll-arrow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>

    <!-- 底部扫描线 -->
    <div class="scan-line"></div>
  </section>
</template>

<script setup lang="ts">
import ParticleBackground from '../../../components/ParticleBackground.vue'
</script>

<style scoped>
.hero-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.hero-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}

/* 装饰网格线 - 增加科技纵深感 */
.grid-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image:
    linear-gradient(rgba(79, 142, 247, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 142, 247, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  z-index: 2;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 70%);
}

.central-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 60vw; height: 60vh;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(10, 10, 15, 0) 70%);
  z-index: 2;
  pointer-events: none;
}

/* 浮动装饰图标 */
.floating-elements {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 3;
  pointer-events: none;
}

.float-icon {
  position: absolute;
  font-size: 28px;
  opacity: 0.15;
  animation: gentleFloat 8s ease-in-out infinite;
}

.f1 { top: 15%; left: 10%; animation-delay: 0s; }
.f2 { top: 25%; right: 12%; animation-delay: 1.5s; }
.f3 { bottom: 30%; left: 8%; animation-delay: 3s; }
.f4 { top: 20%; right: 25%; animation-delay: 4.5s; }
.f5 { bottom: 20%; right: 10%; animation-delay: 6s; }

@keyframes gentleFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-15px) rotate(5deg); }
  66% { transform: translateY(10px) rotate(-3deg); }
}

.hero-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 800px;
  padding: 0 20px;
}

/* 动画序列 */
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.stagger-1 { animation: slideUpFade 0.6s ease-out 0.3s both; }
.stagger-2 { animation: slideUpFade 0.6s ease-out 0.5s both; }
.stagger-3 { animation: slideUpFade 0.6s ease-out 0.8s both; }
.stagger-4 { animation: slideUpFade 0.6s ease-out 1.0s both; }
.stagger-5 { animation: slideUpFade 0.6s ease-out 1.2s both; }

/* 状态标签 */
.badge-wrapper { margin-bottom: 24px; }
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 9999px;
  border: 1px solid rgba(79, 142, 247, 0.4);
  background: rgba(79, 142, 247, 0.1);
  color: var(--color-brand-blue);
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(79, 142, 247, 0.2);
}
.pulse {
  width: 6px; height: 6px;
  background-color: var(--color-brand-blue);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-brand-blue);
  animation: pulsing 2s infinite;
}
@keyframes pulsing {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 142, 247, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(79, 142, 247, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 142, 247, 0); }
}

/* 排版 */
.main-title {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}
.text-gradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  font-size: 20px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  max-width: 600px;
  line-height: 1.6;
}

/* 功能亮点标签 */
.highlight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.hl-tag {
  padding: 6px 16px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: all 0.3s ease;
}

.hl-tag:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

/* CTA 按钮 */
.cta-group {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}
.btn-primary-large, .btn-ghost-large {
  height: 52px;
  padding: 0 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-primary-large {
  background: var(--gradient-brand);
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}
.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 25px rgba(139, 92, 246, 0.6);
}
.btn-ghost-large {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.btn-ghost-large:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.4);
}

/* 统计 */
.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  color: var(--color-text-muted);
  font-size: 14px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-num {
  font-weight: 700;
  color: var(--color-text-secondary);
}

/* 底部滚动引导 */
.scroll-hint {
  position: absolute;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.scroll-text {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.scroll-arrow {
  color: var(--color-text-muted);
  animation: bounceDown 2s ease-in-out infinite;
}

@keyframes bounceDown {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

/* 底部扫描线 */
.scan-line {
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent);
  animation: scan 8s linear infinite;
}
@keyframes scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 响应式 */
@media (max-width: 768px) {
  .floating-elements { display: none; }
  .highlight-tags { gap: 6px; }
  .hl-tag { font-size: 11px; padding: 4px 12px; }
  .cta-group { flex-direction: column; align-items: center; }
}
</style>
