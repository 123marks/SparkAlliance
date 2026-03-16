<template>
  <div class="profile-container">
    <div class="profile-header">
      <div class="avatar-large"></div>
      <div class="user-details">
        <h2>星火先锋</h2>
        <p class="role">学生 · 软件工程</p>
        <div class="stats">
          <div class="stat-item">
            <span class="num">12</span>
            <span class="label">动态</span>
          </div>
          <div class="stat-item">
            <span class="num">128</span>
            <span class="label">获赞</span>
          </div>
          <div class="stat-item">
            <span class="num">45</span>
            <span class="label">助手互动</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-grid">
      <GlassCard class="grid-item" hoverable>
        <h3>智能日程</h3>
        <p class="desc">今天还有 2 个待办任务和 1 节课程</p>
        <button class="view-btn">查看日历</button>
      </GlassCard>

      <GlassCard class="grid-item" hoverable>
        <h3>目标与任务</h3>
        <p class="desc">本周学习目标进度：60%</p>
        <div class="progress-bar">
          <div class="progress" style="width: 60%"></div>
        </div>
      </GlassCard>

      <GlassCard class="grid-item" hoverable>
        <h3>健康打卡</h3>
        <div class="badges">
          <span class="badge active">早睡早起 (连续5天)</span>
        </div>
        <p class="desc">今日未打卡睡眠</p>
      </GlassCard>

      <GlassCard class="grid-item" hoverable>
        <h3>系统设置</h3>
        <ul class="settings-list">
          <li>账号安全</li>
          <li>隐私设置</li>
          <li>关于我们</li>
        </ul>
      </GlassCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlassCard from '../components/GlassCard.vue'
</script>

<style scoped>
.profile-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  padding-top: 5rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  background: var(--glass-bg);
  padding: 2rem;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.avatar-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

.user-details h2 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.role {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .num {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-item .label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.grid-item h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.desc {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.view-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid var(--glass-border);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  transition: background 0.2s;
}

.view-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
}

.badges {
  margin-bottom: 1rem;
}

.badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.settings-list {
  list-style: none;
}

.settings-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.settings-list li:last-child {
  border-bottom: none;
}

.settings-list li:hover {
  color: var(--text-primary);
}
</style>
