<template>
  <div class="wall-container">
    <div class="header">
      <h2>校园墙</h2>
      <button class="post-btn">+ 发布动态</button>
    </div>

    <div class="feed">
      <GlassCard class="post-card" v-for="i in 3" :key="i" hoverable>
        <div class="post-header">
          <div class="avatar"></div>
          <div class="post-info">
            <h4>匿名同学</h4>
            <span class="time">10分钟前</span>
          </div>
          <div class="tag">表白墙</div>
        </div>
        <div class="post-content">
          <p>今天在图书馆二楼靠窗位置看到一个穿白衬衫的男生，认真学习的样子太帅了！不知能不能认识一下？</p>
        </div>
        <div class="post-actions">
          <button class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span>24</span>
          </button>
          <button class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>12</span>
          </button>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlassCard from '../components/GlassCard.vue'
</script>

<style scoped>
.wall-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  padding-top: 5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h2 {
  font-size: 2rem;
  font-weight: 700;
}

.post-btn {
  background: var(--theme-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 20px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.post-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f43f5e, #a855f7);
}

.post-info h4 {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.tag {
  margin-left: auto;
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.post-content {
  line-height: 1.6;
  font-size: 1.05rem;
}

.post-actions {
  display: flex;
  gap: 1.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--glass-border);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s;
}

.action-btn:hover {
  color: #f43f5e;
}
</style>
