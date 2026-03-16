<template>
  <div class="app-home">
    <!-- Welcome Hero -->
    <div class="welcome-section">
      <div class="w-content">
        <h1>{{ greeting }}，{{ userName }} 👋</h1>
        <p class="subtitle">今天是你加入 Spark Alliance 的第 {{ daysSinceJoined }} 天，继续你的发现之旅吧！</p>
      </div>
      <div class="w-illustration">
        <div class="glow-sphere"></div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">⏱️</div>
        <div class="stat-info">
          <span class="label">今日专注学习</span>
          <span class="value">4h 20m</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">🔥</div>
        <div class="stat-info">
          <span class="label">连续打卡天数</span>
          <span class="value">12 天</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">📚</div>
        <div class="stat-info">
          <span class="label">本周待办任务</span>
          <span class="value">5 项</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/app/chat" class="action-card chat-action">
        <span class="action-icon">💬</span>
        <div class="action-info">
          <h4>AI 智能答疑</h4>
          <p>拍照识题 · 分步讲解 · 多学科覆盖</p>
        </div>
        <span class="action-arrow">→</span>
      </router-link>
      <router-link to="/app/wall" class="action-card wall-action">
        <span class="action-icon">📝</span>
        <div class="action-info">
          <h4>校园墙</h4>
          <p>吐槽 · 求助 · 表白 · 二手交易</p>
        </div>
        <span class="action-arrow">→</span>
      </router-link>
      <router-link to="/app/profile" class="action-card profile-action">
        <span class="action-icon">🎯</span>
        <div class="action-info">
          <h4>我的目标</h4>
          <p>日/周/月计划 · 星空领域激励</p>
        </div>
        <span class="action-arrow">→</span>
      </router-link>
    </div>

    <!-- Main Dashboard Areas -->
    <div class="dashboard-grid">
      <!-- Left Column -->
      <div class="d-col">
        <div class="card recent-chats">
          <div class="card-header">
            <h3>最近 AI 辅导</h3>
            <router-link to="/app/chat" class="btn-text">查看全部</router-link>
          </div>
          <div class="card-body">
            <div class="chat-item" v-for="chat in recentChats" :key="chat.title">
              <div class="c-icon">🧠</div>
              <div class="c-info">
                <h4>{{ chat.title }}</h4>
                <span>{{ chat.time }} &middot; {{ chat.msgCount }} 条对话</span>
              </div>
            </div>
            <router-link to="/app/chat" class="btn-outline w-full mt-4">+ 新建对话</router-link>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="d-col">
        <div class="card timeline-card">
          <div class="card-header">
            <h3>近期日程</h3>
            <button class="btn-text">添加</button>
          </div>
          <div class="card-body timeline">
            <div class="tl-item" v-for="event in upcomingEvents" :key="event.title">
              <div class="tl-dot" :class="event.status"></div>
              <div class="tl-content">
                <span class="time">{{ event.time }}</span>
                <h4>{{ event.title }}</h4>
                <span v-if="event.location" class="location">{{ event.location }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()

// 根据时间段动态生成问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 用户名优先取 Supabase user_metadata 中的 nickname
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

// 计算加入天数
const daysSinceJoined = computed(() => {
  if (!user.value?.created_at) return 1
  const createdAt = new Date(user.value.created_at)
  const now = new Date()
  return Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
})

// 模拟数据
const recentChats = [
  { title: '深入理解操作系统内存管理', time: '今天 10:30', msgCount: 12 },
  { title: '帮你润色学术论文摘要', time: '今天 09:15', msgCount: 8 },
  { title: 'Vue 3 组合式 API 最佳实践', time: '昨天 20:00', msgCount: 15 },
]

const upcomingEvents = [
  { time: '14:00 - 15:30', title: '微机原理与接口技术 实验课', location: '教四 402 机房', status: 'highlight' },
  { time: '18:00', title: '算法设计小组讨论', location: '图书馆 3B 研讨室', status: '' },
  { time: '22:00', title: '提交《软件工程》需求分析报告', location: '', status: 'empty' },
]
</script>

<style scoped>
.app-home {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Welcome */
.welcome-section {
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.1), rgba(139, 92, 246, 0.05));
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.w-content h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; color: white; }
.w-content .subtitle { color: var(--color-text-secondary); font-size: 16px; }

.w-illustration { position: absolute; right: 0; top: 0; width: 300px; height: 100%; pointer-events: none; }
.glow-sphere { position: absolute; top: -50%; right: -20%; width: 250px; height: 250px; border-radius: 50%; background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%); filter: blur(40px); animation: pulse 6s infinite alternate; }
@keyframes pulse { 0% { opacity: 0.5; transform: scale(1); } 100% { opacity: 1; transform: scale(1.2); } }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 24px;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
}
.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.chat-action:hover { border-color: rgba(79, 142, 247, 0.4); }
.wall-action:hover { border-color: rgba(139, 92, 246, 0.4); }
.profile-action:hover { border-color: rgba(249, 115, 22, 0.4); }
.action-icon { font-size: 28px; flex-shrink: 0; }
.action-info h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.action-info p { font-size: 12px; color: var(--color-text-muted); }
.action-arrow { margin-left: auto; font-size: 20px; color: var(--color-text-muted); transition: transform 0.2s; }
.action-card:hover .action-arrow { transform: translateX(4px); color: white; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr; }
  .quick-actions { grid-template-columns: 1fr; }
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.stat-icon {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.stat-icon.blue { background: rgba(79, 142, 247, 0.1); color: var(--color-brand-blue); }
.stat-icon.purple { background: rgba(139, 92, 246, 0.1); color: var(--color-brand-purple); }
.stat-icon.orange { background: rgba(249, 115, 22, 0.1); color: var(--color-brand-orange); }

.stat-info { display: flex; flex-direction: column; }
.stat-info .label { color: var(--color-text-secondary); font-size: 13px; margin-bottom: 4px; }
.stat-info .value { color: white; font-size: 24px; font-weight: 700; }

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-header h3 { font-size: 16px; font-weight: 600; }
.btn-text { background: transparent; border: none; color: var(--color-brand-blue); cursor: pointer; font-size: 13px; }

.card-body { padding: 24px; }

/* Recent Chats */
.chat-item {
  display: flex; align-items: center; gap: 16px;
  padding: 16px; border-radius: 12px;
  transition: background 0.2s;
  cursor: pointer;
}
.chat-item:hover { background: rgba(255,255,255,0.05); }
.c-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.c-info h4 { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
.c-info span { font-size: 12px; color: var(--color-text-muted); }

.btn-outline {
  background: transparent; border: 1px dashed var(--color-border);
  color: var(--color-text-secondary); height: 44px; border-radius: 12px; transition: all 0.2s;
}
.btn-outline:hover { background: rgba(255,255,255,0.05); border-style: solid; color: white; }
.w-full { width: 100%; } .mt-4 { margin-top: 16px; }

/* Timeline */
.timeline { display: flex; flex-direction: column; gap: 24px; position: relative; }
.timeline::before { content: ''; position: absolute; left: 5px; top: 10px; bottom: 10px; width: 2px; background: rgba(255,255,255,0.1); }
.tl-item { display: flex; gap: 16px; position: relative; z-index: 2; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-text-muted); margin-top: 4px; box-shadow: 0 0 0 4px var(--color-bg-card); }
.tl-dot.highlight { background: var(--color-brand-blue); box-shadow: 0 0 0 4px rgba(79, 142, 247, 0.2); }
.tl-dot.empty { background: transparent; border: 2px solid var(--color-text-muted); }

.tl-content .time { font-size: 12px; color: var(--color-brand-purple); font-weight: 600; display: block; margin-bottom: 4px; }
.tl-content h4 { font-size: 14px; font-weight: 500; margin-bottom: 4px; line-height: 1.4; }
.tl-content .location { font-size: 12px; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; display: inline-block; }
</style>
