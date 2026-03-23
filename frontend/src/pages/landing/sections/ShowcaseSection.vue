<template>
  <section class="showcase-section" ref="sectionRef">
    <div class="container">
      <div class="showcase-header text-center" :class="{ 'is-visible': isVisible }">
        <span class="eyebrow">无缝体验</span>
        <h2 class="title">为学生打造的完美设计</h2>
        <p class="subtitle">极致的毛玻璃美学与流畅的弹簧物理动效，为你带来最优雅的数字校园生活。</p>
      </div>

      <div class="showcase-content">
        <!-- Text Block -->
        <div class="text-block" :class="{ 'is-visible': isVisible }">
          <div class="feature-item">
            <div class="f-icon orange"><span class="icon">✨</span></div>
            <div>
              <h3>沉浸式心流</h3>
              <p>摒弃所有干扰，深色模式搭配自适应毛玻璃，让你在深夜赶 DDL 时同样专注。</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="f-icon blue"><span class="icon">🚀</span></div>
            <div>
              <h3>极速响应</h3>
              <p>采用 Vue 3 渲染引擎，极致轻量，无论是切换聊天还是刷新动态都快如闪电。</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="f-icon purple"><span class="icon">🛡️</span></div>
            <div>
              <h3>隐私绝对安全</h3>
              <p>你的学习数据、聊天记录全部属于你。本地大模型方案确保数据零泄露。</p>
            </div>
          </div>
        </div>

        <!-- Visual Block (Bento Box Concept) -->
        <div class="visual-bento" :class="{ 'is-visible': isVisible }">
          <div class="bento-card bento-1 spring-hover">
            <div class="b-header">
              <div class="dots"><span/><span/><span/></div>
              <div class="title-bar">AI 聊天界面</div>
            </div>
            <div class="b-body chat-mock">
               <div class="msg ai-msg">为你生成了期末复习大纲，共 5 个重点。</div>
               <div class="msg user-msg">太棒了，帮我把第一点展开讲讲。</div>
               <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
          
          <div class="bento-card bento-2 spring-hover">
            <div class="b-header">
              <div class="title-bar">数据统计</div>
            </div>
            <div class="b-body chart-mock">
               <div class="chart-bar" style="height: 40%"></div>
               <div class="chart-bar" style="height: 70%"></div>
               <div class="chart-bar" style="height: 50%"></div>
               <div class="chart-bar" style="height: 90%; background: var(--color-brand-blue)"></div>
               <div class="chart-bar" style="height: 60%"></div>
            </div>
          </div>
          
          <div class="bento-card bento-3 spring-hover">
             <div class="b-body float-profile">
               <div class="avatar-ring text-center">
                 <div class="p-avatar"></div>
               </div>
               <div class="p-info text-center mt-3">
                 <h4>今日效率</h4>
                 <div class="score text-gradient">98%</div>
               </div>
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
.showcase-section {
  padding: 120px 40px;
  background-color: var(--color-bg-secondary);
  position: relative;
  overflow: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.text-center { text-align: center; }
.mt-3 { margin-top: 12px; }

.showcase-header {
  margin-bottom: 80px;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.6s ease-out;
}

.showcase-header.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.eyebrow {
  color: var(--color-brand-orange);
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
  max-width: 600px;
  margin: 0 auto;
}

.showcase-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

@media (max-width: 900px) {
  .showcase-content {
    grid-template-columns: 1fr;
  }
}

/* Text Block */
.text-block {
  display: flex;
  flex-direction: column;
  gap: 40px;
  opacity: 0;
  transform: translateX(-40px);
  transition: all 0.6s ease-out 0.2s;
}
.text-block.is-visible {
  opacity: 1;
  transform: translateX(0);
}

.feature-item {
  display: flex;
  gap: 20px;
}
.f-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}
.f-icon.orange { background: rgba(249, 115, 22, 0.1); color: var(--color-brand-orange); }
.f-icon.blue { background: rgba(79, 142, 247, 0.1); color: var(--color-brand-blue); }
.f-icon.purple { background: rgba(139, 92, 246, 0.1); color: var(--color-brand-purple); }

.feature-item h3 {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}
.feature-item p {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Visual Bento Box */
.visual-bento {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 20px;
  height: 500px;
  opacity: 0;
  transform: translateX(40px);
  transition: all 0.6s ease-out 0.4s;
}
.visual-bento.is-visible {
  opacity: 1;
  transform: translateX(0);
}

.bento-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  transition: transform 0.3s;
}
.bento-card:hover {
  transform: translateY(-5px);
}

.bento-1 { grid-column: 1 / 3; grid-row: 1 / 2; }
.bento-2 { grid-column: 1 / 2; grid-row: 2 / 3; }
.bento-3 { grid-column: 2 / 3; grid-row: 2 / 3; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent); }

.b-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 12px;
}
.dots { display: flex; gap: 6px; }
.dots span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.dots span:nth-child(1) { background: #ff5f56; }
.dots span:nth-child(2) { background: #ffbd2e; }
.dots span:nth-child(3) { background: #27c93f; }
.title-bar { color: var(--color-text-muted); font-size: 12px; font-weight: 600; font-family: monospace; }

.b-body {
  padding: 20px;
  flex: 1;
}

/* Mocks */
.chat-mock { display: flex; flex-direction: column; gap: 12px; justify-content: flex-end; }
.msg { padding: 12px 16px; border-radius: 12px; font-size: 13px; max-width: 80%; }
.ai-msg { background: rgba(255,255,255,0.05); color: var(--color-text-secondary); align-self: flex-start; border-top-left-radius: 4px; }
.user-msg { background: var(--color-brand-blue); color: white; align-self: flex-end; border-top-right-radius: 4px; }
.typing-indicator { align-self: flex-start; display: flex; gap: 4px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 12px; border-top-left-radius: 4px; }
.typing-indicator span { width: 6px; height: 6px; background: var(--color-text-muted); border-radius: 50%; animation: blink 1.4s infinite both; }
.typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.6s; }
@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }

.chart-mock { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 100%; padding-top: 20px; }
.chart-bar { flex: 1; background: rgba(255,255,255,0.1); border-radius: 4px 4px 0 0; }

.float-profile { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.avatar-ring { padding: 4px; border-radius: 50%; background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-orange)); }
.p-avatar { width: 60px; height: 60px; border-radius: 50%; background: var(--color-bg-primary); border: 2px solid var(--color-bg-secondary); }
.p-info h4 { color: var(--color-text-secondary); font-size: 12px; margin-bottom: 4px; font-weight: 500;}
.score { font-size: 32px; font-weight: 800; }
.text-gradient { background: var(--gradient-brand); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
</style>
