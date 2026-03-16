<template>
  <div class="home-container">
    <header class="hero">
      <h1 class="title">星火校园 <span class="highlight">Spark Alliance</span></h1>
      <p class="subtitle">以AI为特色入口，深度融合社交与校园生活</p>
    </header>

    <div class="grid-container">
      <router-link to="/chat" class="card-wrapper">
        <GlassCard hoverable>
          <div class="card-content">
            <div class="icon-box ai-icon">
              <!-- SVG Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2>AI 伴侣</h2>
            <p>基于DeepSeek/豆包本地授权，智能解答与社交陪聊</p>
          </div>
        </GlassCard>
      </router-link>

      <router-link to="/campus-wall" class="card-wrapper">
        <GlassCard hoverable>
          <div class="card-content">
            <div class="icon-box wall-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22A12 12 0 0 1 16 10h6"/><path d="M18 14l4-4-4-4"/><path d="M4 14A12 12 0 0 0 16 26h6"/><path d="M18 18l4 4-4 4"/></svg>
            </div>
            <h2>校园墙</h2>
            <p>半匿名公共信息版，记录与分享校园新鲜事</p>
          </div>
        </GlassCard>
      </router-link>

      <router-link to="/profile" class="card-wrapper">
        <GlassCard hoverable>
          <div class="card-content">
            <div class="icon-box profile-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h2>个人中心</h2>
            <p>管理个人信息、日程规划和系统设置</p>
          </div>
        </GlassCard>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlassCard from '../components/GlassCard.vue'
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px); /* accounting for potential nav */
  padding: 2rem;
  padding-top: 5rem;
}

.hero {
  text-align: center;
  margin-bottom: 4rem;
  animation: fadeInDown 1s ease-out;
}

.title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.highlight {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  width: 100%;
  max-width: 1000px;
  animation: fadeInUp 1s ease-out 0.2s both;
}

.card-wrapper {
  display: block;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem;
}

.icon-box {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
}

.ai-icon { color: #8b5cf6; }
.wall-icon { color: #f43f5e; }
.profile-icon { color: #10b981; }

h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

p {
  color: var(--text-secondary);
  line-height: 1.6;
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
