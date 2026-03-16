<template>
  <section class="hero-section">
    <!-- Background Particle Canvas -->
    <ParticleBackground class="hero-bg" />
    
    <!-- Central Glow Overlay -->
    <div class="central-glow"></div>

    <div class="hero-content">
      <!-- Badge -->
      <div class="badge-wrapper stagger-1">
        <span class="badge"><span class="pulse"></span> ✦ 正在公测</span>
      </div>

      <!-- Typography -->
      <h1 class="main-title stagger-2">
        <span class="text-gradient">重新定义</span><br/>校园连接方式
      </h1>
      <p class="subtitle stagger-3">以 AI 为核心，让每一段校园时光都被记录与点亮</p>

      <!-- CTA Buttons -->
      <div class="cta-group stagger-4">
        <router-link to="/register" class="btn-primary-large">开始探索 &rarr;</router-link>
        <button class="btn-ghost-large">查看演示 &#9654;</button>
      </div>

      <!-- Stats -->
      <div class="hero-stats stagger-5">
        <div class="stat-item">
          <span class="stat-num">1,200+</span>
          <span class="stat-label">在校用户</span>
        </div>
        <div class="divider"></div>
        <div class="stat-item">
          <span class="stat-num">98%</span>
          <span class="stat-label">满意率</span>
        </div>
        <div class="divider"></div>
        <div class="stat-item">
          <span class="stat-num">3</span>
          <span class="stat-label">大核心功能</span>
        </div>
      </div>
    </div>

    <!-- Bottom scanning line -->
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.central-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60vw;
  height: 60vh;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(10, 10, 15, 0) 70%);
  z-index: 2;
  pointer-events: none;
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

/* Animations */
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-1 { animation: slideUpFade 0.6s ease-out 0.3s both; }
.stagger-2 { animation: slideUpFade 0.6s ease-out 0.5s both; }
.stagger-3 { animation: slideUpFade 0.6s ease-out 0.8s both; }
.stagger-4 { animation: slideUpFade 0.6s ease-out 1.0s both; }
.stagger-5 { animation: slideUpFade 0.6s ease-out 1.2s both; }

/* Badge */
.badge-wrapper {
  margin-bottom: 24px;
}
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
  width: 6px;
  height: 6px;
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

/* Typography */
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
  margin-bottom: 48px;
}

/* CTA */
.cta-group {
  display: flex;
  gap: 16px;
  margin-bottom: 64px;
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
.btn-primary-large:active {
  transform: scale(0.97);
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
.btn-ghost-large:active {
  transform: scale(0.97);
}

/* Stats */
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
.divider {
  width: 1px;
  height: 12px;
  background: var(--color-border);
}

/* Bottom line */
.scan-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent);
  animation: scan 8s linear infinite;
}
@keyframes scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
