<template>
  <section class="testimonials-section">
    <div class="header text-center">
      <h2 class="title">听到他们的声音</h2>
      <p class="subtitle">超过千名国内顶尖高校学生的日常首选</p>
    </div>

    <!-- Infinite Marquee -->
    <div class="marquee-wrapper">
      <div class="marquee" :style="{ animationDuration: speed + 's' }">
        <div class="marquee-content">
          <div class="t-card" v-for="t in testimonials" :key="t.name">
            <div class="t-header">
              <div class="t-avatar" :style="{ background: t.color }"></div>
              <div>
                <h4>{{ t.name }}</h4>
                <span>{{ t.college }} / {{ t.major }}</span>
              </div>
            </div>
            <p>"{{ t.content }}"</p>
          </div>
        </div>
        <!-- Clone for seamless loop -->
        <div class="marquee-content" aria-hidden="true">
          <div class="t-card" v-for="t in testimonials" :key="t.name + '-clone'">
            <div class="t-header">
              <div class="t-avatar" :style="{ background: t.color }"></div>
              <div>
                <h4>{{ t.name }}</h4>
                <span>{{ t.college }} / {{ t.major }}</span>
              </div>
            </div>
            <p>"{{ t.content }}"</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const speed = ref(30) // Seconds for one loop

const testimonials = ref([
  { name: '李同学', college: '清华大学', major: '计算机科学', content: '它完美地融入了我的学习心流。本地部署的 DeepSeek 模型帮我解决了大量的算法作业问题。', color: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)' },
  { name: '王同学', college: '北京大学', major: '法学', content: '我非常喜欢深色护眼模式和极简的交互设计。阅读大量的法条资料时眼睛一点都不累。', color: 'linear-gradient(135deg, #f97316, #f43f5e)' },
  { name: '张同学', college: '复旦大学', major: '设计系', content: '玻璃拟态的 UI 简直是艺术品！细节处理得太棒了，鼠标跟随效果让人忍不住一直玩。', color: 'linear-gradient(135deg, #10b981, #3b82f6)' },
  { name: '赵同学', college: '浙江大学', major: '金融学', content: '动态墙真的帮我认识了很多不同专业的朋友，匿名和实名的结合做得很好，推荐算法也很懂我。', color: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { name: '刘同学', college: '上海交大', major: '电子信息', content: '日程管理的逻辑非常清晰，自从用了它，我的 DDL 就再也没有错过过。绝对的神仙软件！', color: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }
])
</script>

<style scoped>
.testimonials-section {
  padding: 120px 0;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}

.header {
  margin-bottom: 60px;
  padding: 0 40px;
}
.title { font-size: 36px; font-weight: 800; margin-bottom: 16px; color: white; }
.subtitle { color: var(--color-text-secondary); font-size: 18px; }
.text-center { text-align: center; }

/* Marquee */
.marquee-wrapper {
  position: relative;
  width: 100vw;
  max-width: 100vw;
  overflow: hidden;
  padding: 20px 0;
}

/* Gradient fade at edges */
.marquee-wrapper::before,
.marquee-wrapper::after {
  content: "";
  position: absolute;
  top: 0;
  width: 15vw;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}
.marquee-wrapper::before {
  left: 0;
  background: linear-gradient(to right, var(--color-bg-primary), transparent);
}
.marquee-wrapper::after {
  right: 0;
  background: linear-gradient(to left, var(--color-bg-primary), transparent);
}

.marquee {
  display: flex;
  width: fit-content;
  animation: scroll var(--speed, 30s) linear infinite;
}
.marquee:hover {
  animation-play-state: paused;
}

@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* Shift by exactly 50% since we cloned the content */
}

.marquee-content {
  display: flex;
  gap: 24px;
  padding: 0 12px;
}

/* Card */
.t-card {
  width: 380px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 32px;
  flex-shrink: 0;
  transition: transform 0.3s, background 0.3s;
}
.t-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-5px);
}

.t-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.t-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.t-header h4 {
  color: white;
  font-size: 16px;
  margin-bottom: 4px;
}

.t-header span {
  color: var(--color-text-muted);
  font-size: 13px;
}

.t-card p {
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 15px;
}
</style>
