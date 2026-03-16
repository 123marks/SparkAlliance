<template>
  <section class="features-section" ref="sectionRef">
    <div class="features-header" :class="{ 'is-visible': isVisible }">
      <span class="eyebrow">核心功能</span>
      <h2 class="title">一站式校园智能平台</h2>
      <p class="subtitle">三大模块，覆盖你校园生活的方方面面</p>
    </div>

    <div class="features-grid">
      <!-- Card 1 -->
      <div class="feature-card" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.1s">
        <div class="feature-icon blue-glow">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3 class="feature-title">AI 学习伴侣</h3>
        <div class="tags">
          <span>DeepSeek</span><span>豆包</span><span>本地部署</span>
        </div>
        <p class="feature-desc">接入本地大模型授权，智能解答学业问题，随时随地的 AI 同学</p>
        <div class="preview-box">
          <div class="mini-chat">
            <div class="mini-bubble ai">你好，我是星火助手，遇到难题了吗？</div>
            <div class="mini-bubble user">帮我解释一下偏导数。</div>
          </div>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="feature-card" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.2s">
        <div class="feature-icon purple-glow">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22A12 12 0 0 1 16 10h6"/><path d="M18 14l4-4-4-4"/><path d="M4 14A12 12 0 0 0 16 26h6"/><path d="M18 18l4 4-4 4"/></svg>
        </div>
        <h3 class="feature-title">校园动态墙</h3>
        <div class="tags">
          <span>半匿名</span><span>实时</span><span>智能推荐</span>
        </div>
        <p class="feature-desc">记录与分享校园新鲜事，半匿名公开讨论，让校园故事被看见</p>
        <div class="preview-box">
          <div class="mini-feed">
            <div class="mini-post">
              <div class="mini-avatar"></div>
              <div class="mini-lines"><div class="line w-70"></div><div class="line w-50"></div></div>
            </div>
            <div class="mini-post blurred">
              <div class="mini-avatar"></div>
              <div class="mini-lines"><div class="line w-80"></div><div class="line w-40"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="feature-card" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.3s">
        <div class="feature-icon green-glow">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h3 class="feature-title">智能个人中心</h3>
        <div class="tags">
          <span>智能日程</span><span>目标追踪</span><span>数据洞察</span>
        </div>
        <p class="feature-desc">管理个人信息、智能日程规划和学习目标，让每天都有迹可循</p>
        <div class="preview-box">
          <div class="mini-profile">
            <div class="progress-ring"></div>
            <div class="schedule-lines">
              <div class="s-line"></div>
              <div class="s-line"></div>
            </div>
          </div>
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
.features-section {
  padding: 120px 40px;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

.features-header {
  text-align: center;
  margin-bottom: 80px;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.6s ease-out;
}

.features-header.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.eyebrow {
  color: var(--color-brand-purple);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
  display: block;
}

.title {
  font-size: 40px;
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 18px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1200px;
  width: 100%;
}

.feature-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(40px);
}

.feature-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}
.feature-card:nth-child(1):hover { border-color: rgba(79, 142, 247, 0.4); box-shadow: 0 20px 60px rgba(79, 142, 247, 0.15); }
.feature-card:nth-child(2):hover { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 20px 60px rgba(139, 92, 246, 0.15); }
.feature-card:nth-child(3):hover { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 20px 60px rgba(16, 185, 129, 0.15); }

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s;
}
.blue-glow { color: var(--color-brand-blue); box-shadow: inset 0 0 20px rgba(79, 142, 247, 0.1); }
.purple-glow { color: var(--color-brand-purple); box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.1); }
.green-glow { color: #10b981; box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.1); }

.feature-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tags span {
  font-size: 12px;
  padding: 4px 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 999px;
  color: var(--color-text-secondary);
}

.feature-desc {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
  flex-grow: 1;
}

/* Previews */
.preview-box {
  height: 120px;
  background: rgba(0,0,0,0.3);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  padding: 16px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  position: relative;
}

.mini-chat { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.mini-bubble { padding: 8px 12px; border-radius: 8px; font-size: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.mini-bubble.ai { background: rgba(255,255,255,0.05); align-self: flex-start; }
.mini-bubble.user { background: var(--color-brand-blue); align-self: flex-end; }

.mini-feed { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.mini-post { display: flex; gap: 12px; }
.mini-post.blurred { opacity: 0.3; filter: blur(1px); }
.mini-avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, var(--color-brand-purple), #f43f5e); }
.mini-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.line { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.w-80 { width: 80%; } .w-70 { width: 70%; } .w-50 { width: 50%; } .w-40 { width: 40%; }

.mini-profile { width: 100%; display: flex; align-items: center; gap: 20px; }
.progress-ring { width: 48px; height: 48px; border-radius: 50%; border: 4px solid rgba(16,185,129,0.2); border-top-color: #10b981; }
.schedule-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.s-line { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; }
</style>
