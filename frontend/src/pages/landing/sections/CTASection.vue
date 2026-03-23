<template>
  <section class="cta-section" ref="sectionRef">
    <div class="cta-container" :class="{ 'is-visible': isVisible }">
      <!-- 背景装饰 -->
      <div class="glow-bg"></div>
      <div class="grid-pattern"></div>
      
      <!-- 浮动装饰 -->
      <div class="float-shapes">
        <div class="shape s1"></div>
        <div class="shape s2"></div>
        <div class="shape s3"></div>
      </div>

      <div class="cta-content">
        <span class="cta-eyebrow">开始你的星火之旅</span>
        <h2>准备好颠覆你的<br/><span class="text-gradient">校园体验</span>了吗？</h2>
        <p>加入先行者的行列，一起共建最智能的星火校园社区。<br/>完全免费，即刻开始。</p>
        
        <!-- 信任标志 -->
        <div class="trust-badges">
          <div class="tb-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            数据安全加密
          </div>
          <div class="tb-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            学生永久免费
          </div>
          <div class="tb-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            30 秒快速注册
          </div>
        </div>

        <div class="action-btns">
          <router-link to="/register" class="btn-primary-large">
            极速启航，即刻加入
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </router-link>
          <router-link to="/community" class="btn-ghost-large">融入星火社区</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { threshold: 0.15 })
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onBeforeUnmount(() => { observer?.disconnect() })
</script>

<style scoped>
.cta-section {
  padding: 100px 40px;
  background-color: var(--color-bg-primary);
  display: flex;
  justify-content: center;
}

.cta-container {
  max-width: 1000px;
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  padding: 80px 48px;
  text-align: center;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.cta-container.is-visible { opacity: 1; transform: translateY(0); }

.glow-bg {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 100%; height: 100%;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

.grid-pattern {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

/* 浮动形状 */
.float-shapes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
  animation: floatShape 12s ease-in-out infinite;
}
.s1 { width: 200px; height: 200px; top: -60px; right: -40px; background: var(--color-brand-blue); }
.s2 { width: 150px; height: 150px; bottom: -40px; left: -30px; background: var(--color-brand-purple); animation-delay: 4s; }
.s3 { width: 80px; height: 80px; top: 30%; left: 10%; background: var(--color-brand-orange); animation-delay: 8s; }

@keyframes floatShape {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(10px, -15px) scale(1.05); }
  66% { transform: translate(-8px, 10px) scale(0.95); }
}

.cta-content {
  position: relative;
  z-index: 2;
}

.cta-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-brand-purple);
  margin-bottom: 20px;
}

h2 {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  color: white;
  margin-bottom: 20px;
  line-height: 1.2;
}

.text-gradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

p {
  font-size: 18px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  line-height: 1.6;
}

/* 信任标志 */
.trust-badges {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.tb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 按钮 */
.action-btns {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-primary-large {
  background: var(--gradient-brand);
  color: white;
  padding: 0 36px;
  height: 54px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
}
.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.5);
}

.btn-ghost-large {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 0 36px;
  height: 54px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-ghost-large:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.3);
}

@media (max-width: 768px) {
  .action-btns { flex-direction: column; align-items: center; }
  .trust-badges { gap: 12px; }
  .cta-container { padding: 60px 24px; }
}
</style>
