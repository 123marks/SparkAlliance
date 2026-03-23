<template>
  <div class="app-home">
    <!-- Bento Grid 布局 -->
    <div class="bento-grid">
      <!-- 1. 欢迎问候 (跨2列) -->
      <div class="bento-item welcome-card">
        <div class="welcome-content">
          <h1 class="welcome-title">{{ greeting }}，{{ userName }}</h1>
          <p class="welcome-sub">今天是 {{ currentDate }}，{{ motivationalText }}</p>
        </div>
        <div class="welcome-actions">
          <router-link to="/app/chat" class="action-btn primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            AI 问一问
          </router-link>
          <router-link to="/app/wall" class="action-btn outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
            发帖
          </router-link>
        </div>
      </div>

      <!-- 2. 每日灵感 (1列) -->
      <div class="bento-item inspiration-card">
        <div class="insp-icon">💡</div>
        <blockquote class="insp-quote">{{ dailyQuote.text }}</blockquote>
        <cite class="insp-author">— {{ dailyQuote.author }}</cite>
      </div>

      <!-- 3. 数据统计 (4个小卡片横排) -->
      <div class="bento-item stats-row">
        <div class="mini-stat" v-for="stat in miniStats" :key="stat.label">
          <div class="mini-stat-icon" :style="{ color: stat.color }">
            <span v-html="stat.svg"></span>
          </div>
          <div class="mini-stat-info">
            <span class="mini-stat-value">{{ stat.value }}</span>
            <span class="mini-stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- 4. 最近 AI 辅导 (跨2行) -->
      <div class="bento-item recent-ai-card">
        <div class="card-header">
          <h3>最近 AI 辅导</h3>
          <router-link to="/app/chat" class="more-link">查看全部 →</router-link>
        </div>
        <div class="chat-list">
          <div class="chat-item" v-for="(chat, i) in recentChats" :key="i">
            <div class="chat-dot" :style="{ background: chat.color }"></div>
            <div class="chat-info">
              <div class="chat-title">{{ chat.title }}</div>
              <div class="chat-meta">{{ chat.time }} · {{ chat.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. 校园热榜 -->
      <div class="bento-item hotlist-card">
        <div class="card-header">
          <h3>🔥 校园热榜</h3>
        </div>
        <div class="hot-list">
          <div class="hot-item" v-for="(item, i) in hotPosts" :key="i">
            <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="hot-title">{{ item.title }}</span>
            <span class="hot-heat">{{ item.heat }}</span>
          </div>
        </div>
      </div>

      <!-- 6. 今日日程 -->
      <div class="bento-item schedule-card">
        <div class="card-header">
          <h3>今日日程</h3>
          <router-link to="/app/schedule" class="more-link">管理 →</router-link>
        </div>
        <div class="timeline-list">
          <div class="tl-item" v-for="(event, i) in upcomingEvents" :key="i">
            <div class="tl-dot" :class="event.type"></div>
            <div class="tl-content">
              <div class="tl-title">{{ event.title }}</div>
              <div class="tl-time">{{ event.time }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 7. 倒计时 -->
      <div class="bento-item countdown-card">
        <div class="cd-list">
          <div class="cd-item" v-for="cd in countdowns" :key="cd.label">
            <div class="cd-days" :style="{ color: cd.color }">{{ cd.days }}</div>
            <div class="cd-info">
              <span class="cd-label">{{ cd.label }}</span>
              <span class="cd-date">{{ cd.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 8. 核心功能快捷入口 -->
      <div class="bento-item features-card">
        <div class="card-header">
          <h3>核心功能</h3>
        </div>
        <div class="feature-grid">
          <router-link
            v-for="f in coreFeatures"
            :key="f.title"
            :to="f.to"
            class="feature-btn"
            :class="{ disabled: !f.active }"
            @click.prevent="!f.active && showComingSoon()"
          >
            <div class="fb-icon" :style="{ background: f.bg }">
              <span v-html="f.svg"></span>
            </div>
            <span class="fb-title">{{ f.title }}</span>
            <span v-if="!f.active" class="fb-badge">即将</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

const currentDate = computed(() => {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`
})

// 激励文案 —— 根据时段变化
const motivationalText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '早点休息，明天继续加油 🌙'
  if (hour < 12) return '新的一天，元气满满 ☀️'
  if (hour < 14) return '午餐后适当休息一下 🍱'
  if (hour < 18) return '下午也要保持专注哦 💪'
  return '今天辛苦了，整理一下收获 ✨'
})

// 每日灵感名言
const dailyQuotes = [
  { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '书山有路勤为径，学海无涯苦作舟。', author: '韩愈' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
  { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈' },
]

const dailyQuote = computed(() => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dailyQuotes[dayOfYear % dailyQuotes.length]
})

// 统计数据
const miniStats = [
  { value: '4h 20m', label: '今日专注', color: '#4f8ef7', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' },
  { value: '12天', label: '连续打卡', color: '#f97316', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c2.5 4.5 4 8 4 11s-2.5 8-4 8-4-5-4-8 1.5-6.5 4-11z"></path></svg>' },
  { value: '5项', label: '本周待办', color: '#10b981', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { value: '28次', label: '本月AI互动', color: '#8b5cf6', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' }
]

// AI 辅导记录
const recentChats = [
  { title: '深入理解操作系统内存管理', time: '10:30', desc: '分页（Paging）和分段...', color: '#4f8ef7' },
  { title: '帮忙润色学术论文摘要', time: '昨天', desc: '英文摘要语法修正', color: '#8b5cf6' },
  { title: '计算机网络 TCP 三次握手', time: '周一', desc: '如果只有两次握手会怎样？', color: '#10b981' },
  { title: '线性代数特征值计算方法', time: '上周', desc: '实对称矩阵的正交对角化', color: '#f97316' },
]

// 校园热榜
const hotPosts = [
  { title: '图书馆占座神器推荐', heat: '🔥 2.1k' },
  { title: '期中考复习资料分享群', heat: '🔥 1.8k' },
  { title: '食堂三楼新菜到底好不好吃', heat: '🔥 1.5k' },
  { title: '计科专业课挂科率统计', heat: '🔥 1.2k' },
  { title: '校篮球赛决赛观战召集', heat: '💬 980' },
]

// 今日日程
const upcomingEvents = [
  { time: '14:00 - 15:30', title: '微机原理实验课', type: 'urgent' },
  { time: '18:00 - 19:00', title: '算法组会讨论', type: 'normal' },
  { time: '22:00', title: '《软件工程》作业截止', type: 'warning' },
]

// 倒计时
const countdowns = computed(() => {
  const now = new Date()
  const getRemainDays = (month: number, day: number) => {
    const target = new Date(now.getFullYear(), month - 1, day)
    if (target < now) target.setFullYear(target.getFullYear() + 1)
    return Math.ceil((target.getTime() - now.getTime()) / 86400000)
  }
  return [
    { label: '四六级考试', date: '6月14日', days: getRemainDays(6, 14) + '天', color: '#4f8ef7' },
    { label: '期末考试周', date: '7月1日', days: getRemainDays(7, 1) + '天', color: '#f43f5e' },
    { label: '暑假开始', date: '7月15日', days: getRemainDays(7, 15) + '天', color: '#10b981' },
  ]
})

// 核心功能
const coreFeatures = [
  { title: 'AI 助手', to: '/app/chat', active: true, bg: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
  { title: '校园墙', to: '/app/wall', active: true, bg: 'linear-gradient(135deg, #8b5cf6, #f43f5e)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>' },
  { title: '个人中心', to: '/app/profile', active: true, bg: 'linear-gradient(135deg, #10b981, #06b6d4)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' },
  { title: '选课助手', to: '/app/courses', active: false, bg: 'rgba(59,130,246,0.15)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>' },
  { title: '智能日程', to: '/app/schedule', active: false, bg: 'rgba(20,184,166,0.15)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>' },
  { title: '校园购物', to: '/app/shop', active: false, bg: 'rgba(249,115,22,0.15)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' },
]

const showComingSoon = () => {
  alert('即将上线，敬请期待！')
}
</script>

<style scoped>
.app-home {
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* === Bento Grid 核心布局 === */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
  gap: 16px;
}

.bento-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px 24px;
  transition: border-color 0.3s ease, transform 0.3s ease;
}

.bento-item:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

/* === 1. 欢迎卡片 (跨2列) === */
.welcome-card {
  grid-column: span 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.05));
  border-color: rgba(79, 142, 247, 0.15);
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 6px 0;
}

.welcome-sub {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.welcome-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.action-btn {
  height: 36px;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  color: white;
  white-space: nowrap;
}

.action-btn.primary {
  background: var(--color-brand-blue);
}

.action-btn.primary:hover {
  background: #3b82f6;
  transform: translateY(-1px);
}

.action-btn.outline {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
}

.action-btn.outline:hover {
  background: rgba(255,255,255,0.05);
}

/* === 2. 每日灵感 === */
.inspiration-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.06), rgba(244, 63, 94, 0.04));
  border-color: rgba(249, 115, 22, 0.1);
  min-height: 100px;
}

.insp-icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.insp-quote {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 8px 0;
  font-style: italic;
}

.insp-author {
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: normal;
}

/* === 3. 数据统计横排 (跨3列) === */
.stats-row {
  grid-column: span 3;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  margin: 0 4px;
  transition: all 0.2s;
}

.mini-stat:first-child { margin-left: 0; }
.mini-stat:last-child { margin-right: 0; }

.mini-stat:hover {
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-2px);
}

.mini-stat-icon {
  display: flex;
  align-items: center;
  opacity: 0.8;
}

.mini-stat-info {
  display: flex;
  flex-direction: column;
}

.mini-stat-value {
  font-size: 22px;
  font-weight: 800;
  color: white;
  line-height: 1.1;
}

.mini-stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

/* === 通用卡片头 === */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.more-link {
  font-size: 12px;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.more-link:hover { color: white; }

/* === 4. AI 辅导列表 (跨2行) === */
.recent-ai-card {
  grid-row: span 2;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  transition: background 0.2s;
  cursor: pointer;
}

.chat-item:hover {
  background: rgba(255,255,255,0.04);
}

.chat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chat-info { flex: 1; min-width: 0; }

.chat-title {
  font-size: 14px;
  color: white;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* === 5. 校园热榜 === */
.hot-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.hot-item:hover { background: rgba(255,255,255,0.04); }

.hot-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.hot-rank.top {
  background: rgba(244, 63, 94, 0.15);
  color: #f43f5e;
}

.hot-title {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hot-heat {
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* === 6. 今日日程 === */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tl-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.tl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  background: transparent;
  margin-top: 5px;
  flex-shrink: 0;
}

.tl-dot.urgent { border-color: var(--color-brand-blue); background: var(--color-brand-blue); }
.tl-dot.warning { border-color: #f97316; }

.tl-content { flex: 1; }
.tl-title { font-size: 14px; font-weight: 500; color: white; margin-bottom: 2px; }
.tl-time { font-size: 12px; color: var(--color-text-muted); }

/* === 7. 倒计时 === */
.countdown-card {
  padding: 16px 20px;
}

.cd-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cd-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cd-days {
  font-size: 28px;
  font-weight: 800;
  min-width: 60px;
  line-height: 1;
}

.cd-info {
  display: flex;
  flex-direction: column;
}

.cd-label {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.cd-date {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* === 8. 核心功能网格 === */
.features-card {
  grid-column: span 2;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.feature-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  transition: all 0.2s;
  position: relative;
}

.feature-btn:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-2px);
}

.feature-btn.disabled {
  opacity: 0.5;
}

.fb-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fb-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.fb-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  color: var(--color-text-muted);
}

/* === 响应式 === */
@media (max-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-row { grid-column: span 2; grid-template-columns: repeat(2, 1fr); }
  .mini-stat { margin: 4px 0; }
  .features-card { grid-column: span 2; }
  .feature-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 640px) {
  .app-home { padding: 16px; }
  .bento-grid { grid-template-columns: 1fr; }
  .welcome-card {
    grid-column: span 1;
    flex-direction: column;
    align-items: flex-start;
  }
  .welcome-actions { margin-top: 12px; }
  .stats-row {
    grid-column: span 1;
    grid-template-columns: repeat(2, 1fr);
  }
  .features-card { grid-column: span 1; }
  .feature-grid { grid-template-columns: repeat(3, 1fr); }
  .recent-ai-card { grid-row: span 1; }
}
</style>
