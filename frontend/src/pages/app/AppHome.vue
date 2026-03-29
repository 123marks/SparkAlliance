<template>
  <div class="app-home">
    <!-- 顶部欢迎区 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">{{ greeting }}，{{ userName }}</h1>
        <p class="hero-sub">{{ currentDate }} · {{ motivationalText }}</p>
      </div>
      <div class="hero-actions">
        <router-link to="/app/chat" class="action-btn primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 3.7 2.3 6.9 5.5 8.2L7 22l3.5-1.5A9 9 0 1 0 12 2z"></path></svg>
          AI 问一问
        </router-link>
        <router-link to="/app/wall" class="action-btn ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
          去发帖
        </router-link>
      </div>
    </section>

    <!-- 统计概览 -->
    <section class="stats-strip">
      <div class="stat-chip" v-for="stat in miniStats" :key="stat.label">
        <div class="stat-icon" :style="{ color: stat.color }">
          <span v-html="stat.svg"></span>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <!-- Bento Grid 主区域 -->
    <section class="bento-grid">
      <!-- 今日日程 -->
      <div class="bento-card schedule-card">
        <div class="card-head">
          <h3>📅 今日日程</h3>
          <router-link to="/app/schedule" class="more-link">管理 →</router-link>
        </div>
        <div class="timeline-list">
          <div class="tl-item" v-for="(event, i) in upcomingEvents" :key="i">
            <div class="tl-dot" :class="event.type"></div>
            <div class="tl-body">
              <span class="tl-title">{{ event.title }}</span>
              <span class="tl-time">{{ event.time }}</span>
            </div>
          </div>
          <div class="tl-empty" v-if="upcomingEvents.length === 0">
            <span>今天暂无安排，享受自由时光 ☀️</span>
          </div>
        </div>
      </div>

      <!-- 最近 AI 对话 -->
      <div class="bento-card ai-card">
        <div class="card-head">
          <h3>🤖 AI 助手</h3>
          <router-link to="/app/chat" class="more-link">全部 →</router-link>
        </div>
        <div class="chat-list">
          <div class="chat-item" v-for="(chat, i) in recentChats" :key="i">
            <div class="chat-dot" :style="{ background: chat.color }"></div>
            <div class="chat-body">
              <span class="chat-title">{{ chat.title }}</span>
              <span class="chat-meta">{{ chat.time }} · {{ chat.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 每日灵感 -->
      <div class="bento-card quote-card">
        <div class="quote-mark">💡</div>
        <blockquote class="quote-text">{{ dailyQuote.text }}</blockquote>
        <cite class="quote-author">— {{ dailyQuote.author }}</cite>
      </div>

      <!-- 校园热榜 -->
      <div class="bento-card hot-card">
        <div class="card-head">
          <h3>🔥 热门动态</h3>
          <router-link to="/app/wall" class="more-link">更多 →</router-link>
        </div>
        <div class="hot-list">
          <div class="hot-item" v-for="(item, i) in hotPosts" :key="i">
            <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="hot-title">{{ item.title }}</span>
            <span class="hot-heat">{{ item.heat }}</span>
          </div>
        </div>
      </div>

      <!-- 倒计时 -->
      <div class="bento-card countdown-card">
        <div class="card-head"><h3>⏰ 倒计时</h3></div>
        <div class="cd-list">
          <div class="cd-item" v-for="cd in countdowns" :key="cd.label">
            <div class="cd-days" :style="{ color: cd.color }">{{ cd.days }}</div>
            <div class="cd-body">
              <span class="cd-label">{{ cd.label }}</span>
              <span class="cd-date">{{ cd.date }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="shortcuts-section">
      <h2 class="section-title">探索更多</h2>
      <div class="shortcut-grid">
        <router-link
          v-for="f in coreFeatures"
          :key="f.title"
          :to="f.to"
          class="shortcut-card"
          :class="{ coming: !f.active }"
          @click.prevent="!f.active && showComingSoon()"
        >
          <div class="sc-icon" :style="{ background: f.bg }">
            <span v-html="f.svg"></span>
          </div>
          <div class="sc-info">
            <span class="sc-title">{{ f.title }}</span>
            <span class="sc-desc">{{ f.desc }}</span>
          </div>
          <span v-if="!f.active" class="sc-badge">即将上线</span>
        </router-link>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="app-footer">
      <div class="footer-grid">
        <div class="footer-col brand-col">
          <div class="footer-logo"><img src="/spark-logo.png" alt="Spark" class="footer-logo-img" /><span>SparkAlliance</span></div>
          <p class="footer-slogan">点燃灵感，链接未来</p>
          <p class="footer-copyright">© 2026 Spark. All rights reserved.</p>
        </div>
        <div class="footer-col">
          <h4>产品</h4>
          <router-link to="/app/chat">AI 助手</router-link>
          <router-link to="/app/schedule">智能日程</router-link>
          <router-link to="/app/wall">星火墙</router-link>
          <router-link to="/app/planner">星火规划</router-link>
        </div>
        <div class="footer-col">
          <h4>服务</h4>
          <router-link to="/app/shop">星火购物</router-link>
          <router-link to="/app/talent">星火人才</router-link>
          <router-link to="/app/news">星火资讯</router-link>
          <router-link to="/app/resources">学习资源</router-link>
        </div>
        <div class="footer-col">
          <h4>联系我们</h4>
          <a href="mailto:spark@example.com">spark@example.com</a>
          <a href="#">GitHub</a>
          <router-link to="/app/feedback">意见反馈</router-link>
          <router-link to="/docs">帮助文档</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()

// ====== 问候语 ======
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
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

const motivationalText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '早点休息，明天继续加油 🌙'
  if (h < 12) return '新的一天，元气满满 ☀️'
  if (h < 14) return '午餐后适当休息一下 🍱'
  if (h < 18) return '下午也要保持专注哦 💪'
  return '今天辛苦了，整理一下收获 ✨'
})

// ====== 统计数据 ======
const miniStats = [
  { value: '4h 20m', label: '今日专注', color: '#4f8ef7', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' },
  { value: '12天', label: '连续打卡', color: '#f97316', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c2.5 4.5 4 8 4 11s-2.5 8-4 8-4-5-4-8 1.5-6.5 4-11z"></path></svg>' },
  { value: '5项', label: '本周待办', color: '#10b981', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { value: '28次', label: '本月AI互动', color: '#8b5cf6', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' }
]

// ====== 每日灵感 ======
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
  const d = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dailyQuotes[d % dailyQuotes.length]
})

// ====== AI 对话记录 ======
const recentChats = [
  { title: '深入理解操作系统内存管理', time: '10:30', desc: '分页与分段...', color: '#4f8ef7' },
  { title: '帮忙润色学术论文摘要', time: '昨天', desc: '英文语法修正', color: '#8b5cf6' },
  { title: 'TCP 三次握手详解', time: '周一', desc: '为什么不是两次？', color: '#10b981' },
]

// ====== 校园热榜 ======
const hotPosts = [
  { title: '图书馆占座神器推荐', heat: '🔥 2.1k' },
  { title: '期中考复习资料分享群', heat: '🔥 1.8k' },
  { title: '食堂三楼新菜到底好不好吃', heat: '🔥 1.5k' },
  { title: '计科专业课挂科率统计', heat: '💬 1.2k' },
  { title: '篮球赛决赛观战召集', heat: '💬 980' },
]

// ====== 今日日程 ======
const upcomingEvents = [
  { time: '14:00 - 15:30', title: '微机原理实验课', type: 'urgent' },
  { time: '18:00 - 19:00', title: '算法组会讨论', type: 'normal' },
  { time: '22:00', title: '《软件工程》作业截止', type: 'warning' },
]

// ====== 倒计时 ======
const countdowns = computed(() => {
  const now = new Date()
  const getRemain = (m: number, d: number) => {
    const t = new Date(now.getFullYear(), m - 1, d)
    if (t < now) t.setFullYear(t.getFullYear() + 1)
    return Math.ceil((t.getTime() - now.getTime()) / 86400000)
  }
  return [
    { label: '四六级考试', date: '6月14日', days: getRemain(6, 14) + '天', color: '#4f8ef7' },
    { label: '期末考试周', date: '7月1日', days: getRemain(7, 1) + '天', color: '#f43f5e' },
    { label: '暑假开始', date: '7月15日', days: getRemain(7, 15) + '天', color: '#10b981' },
  ]
})

// ====== 快捷入口 ======
const coreFeatures = [
  { title: 'AI 助手', desc: '多模型智能对话', to: '/app/chat', active: true, bg: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 3.7 2.3 6.9 5.5 8.2L7 22l3.5-1.5A9 9 0 1 0 12 2z"></path></svg>' },
  { title: '星火墙', desc: '分享校园日常', to: '/app/wall', active: true, bg: 'linear-gradient(135deg, #8b5cf6, #f43f5e)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
  { title: '智能日程', desc: '管理你的时间', to: '/app/schedule', active: true, bg: 'linear-gradient(135deg, #10b981, #06b6d4)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>' },
  { title: '星火伴侣', desc: '好友与社交', to: '/app/companion', active: false, bg: 'rgba(139,92,246,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>' },
  { title: '星火购物', desc: '二手交易平台', to: '/app/shop', active: false, bg: 'rgba(249,115,22,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' },
  { title: '星火规划', desc: 'AI目标拆分与激励', to: '/app/planner', active: false, bg: 'rgba(234,179,8,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
  { title: '选择卡罗牌', desc: '解决选择困难', to: '/app/tarot', active: false, bg: 'rgba(244,63,94,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>' },
  { title: '星火自习室', desc: '专注互助空间', to: '/app/study-room', active: true, bg: 'linear-gradient(135deg, #10b981, #06b6d4)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>' },
  { title: '学习资源', desc: '优质资料共享', to: '/app/resources', active: true, bg: 'linear-gradient(135deg, #f97316, #ef4444)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' },
  { title: '星火人才', desc: '双向寻访匹配', to: '/app/talent', active: true, bg: 'linear-gradient(135deg, #f43f5e, #8b5cf6)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
  { title: '星火资讯', desc: '全网热点聚合', to: '/app/news', active: true, bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><path d="M21 12h-6a2 2 0 0 0-2 2v6"></path><path d="M21 12l-6 6"></path><path d="M21 12v6"></path></svg>' },
]

// 即将上线提示
const showComingSoon = () => {
  // 后续替换为 toast
  alert('即将上线，敬请期待！')
}
</script>

<style scoped>
/* ====== 页面容器 ====== */
.app-home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 0;
  width: 100%;
}

/* ====== 顶部欢迎区 ====== */
.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 32px;
  background: linear-gradient(135deg, rgba(79,142,247,0.06), rgba(139,92,246,0.04));
  border: 1px solid rgba(79,142,247,0.1);
  border-radius: 20px;
  margin-bottom: 24px;
}
.hero-title {
  font-size: 26px; font-weight: 700; color: white;
  margin: 0 0 6px;
}
.hero-sub {
  font-size: 14px; color: rgba(255,255,255,0.45); margin: 0;
}
.hero-actions { display: flex; gap: 10px; flex-shrink: 0; }
.action-btn {
  height: 38px; border-radius: 10px; padding: 0 18px;
  font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;
  transition: all 0.2s; color: white; white-space: nowrap; border: none; cursor: pointer;
}
.action-btn.primary { background: var(--color-brand-blue); }
.action-btn.primary:hover { filter: brightness(1.15); }
.action-btn.ghost {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
}
.action-btn.ghost:hover { background: rgba(255,255,255,0.08); }

/* ====== 统计条 ====== */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.stat-chip {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; padding: 14px 18px;
  transition: border-color 0.2s;
}
.stat-chip:hover { border-color: rgba(255,255,255,0.1); }
.stat-icon { display: flex; align-items: center; }
.stat-value { font-size: 18px; font-weight: 700; color: white; display: block; }
.stat-label { font-size: 11px; color: rgba(255,255,255,0.35); display: block; margin-top: 2px; }

/* ====== Bento Grid ====== */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}
.bento-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px; padding: 20px 22px;
  transition: border-color 0.25s;
}
.bento-card:hover { border-color: rgba(255,255,255,0.1); }

.card-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.card-head h3 { font-size: 15px; font-weight: 600; margin: 0; color: white; }
.more-link {
  font-size: 12px; color: rgba(255,255,255,0.35);
  transition: color 0.2s;
}
.more-link:hover { color: var(--color-brand-blue); }

/* 日程卡 */
.schedule-card { grid-column: span 1; }
.timeline-list { display: flex; flex-direction: column; gap: 12px; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; }
.tl-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0;
  background: rgba(255,255,255,0.2);
}
.tl-dot.urgent { background: #f43f5e; box-shadow: 0 0 8px rgba(244,63,94,0.4); }
.tl-dot.warning { background: #f97316; }
.tl-dot.normal { background: #4f8ef7; }
.tl-body { display: flex; flex-direction: column; }
.tl-title { font-size: 13px; color: rgba(255,255,255,0.8); }
.tl-time { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }
.tl-empty { font-size: 13px; color: rgba(255,255,255,0.25); text-align: center; padding: 16px 0; }

/* AI 卡 */
.ai-card { grid-column: span 1; }
.chat-list { display: flex; flex-direction: column; gap: 12px; }
.chat-item { display: flex; align-items: flex-start; gap: 10px; }
.chat-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.chat-body { display: flex; flex-direction: column; }
.chat-title { font-size: 13px; color: rgba(255,255,255,0.8); }
.chat-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }

/* 灵感卡 */
.quote-card {
  display: flex; flex-direction: column; justify-content: center;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,142,247,0.04));
  border-color: rgba(139,92,246,0.1);
}
.quote-mark { font-size: 24px; margin-bottom: 10px; }
.quote-text {
  font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.75);
  line-height: 1.6; margin: 0; padding: 0; border: none;
  font-style: italic;
}
.quote-author { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 12px; font-style: normal; }

/* 热榜卡 */
.hot-card { grid-column: span 1; }
.hot-list { display: flex; flex-direction: column; gap: 10px; }
.hot-item { display: flex; align-items: center; gap: 10px; }
.hot-rank {
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.35);
}
.hot-rank.top { background: rgba(244,63,94,0.12); color: #f43f5e; }
.hot-title { flex: 1; font-size: 13px; color: rgba(255,255,255,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-heat { font-size: 11px; color: rgba(255,255,255,0.3); flex-shrink: 0; }

/* 倒计时卡 */
.countdown-card { grid-column: span 1; }
.cd-list { display: flex; flex-direction: column; gap: 14px; }
.cd-item { display: flex; align-items: center; gap: 14px; }
.cd-days { font-size: 24px; font-weight: 800; min-width: 56px; }
.cd-body { display: flex; flex-direction: column; }
.cd-label { font-size: 13px; color: rgba(255,255,255,0.7); }
.cd-date { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }

/* ====== 快捷入口 ====== */
.shortcuts-section { margin-bottom: 48px; }
.section-title {
  font-size: 18px; font-weight: 700; color: white;
  margin: 0 0 20px;
}
.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.shortcut-card {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s; cursor: pointer;
  text-decoration: none;
}
.shortcut-card:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  transform: translateY(-2px);
}
.shortcut-card.coming { opacity: 0.55; }
.shortcut-card.coming:hover { opacity: 0.7; transform: none; }
.sc-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sc-info { display: flex; flex-direction: column; min-width: 0; }
.sc-title { font-size: 13px; font-weight: 600; color: white; }
.sc-desc { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }
.sc-badge {
  position: absolute; top: 8px; right: 10px;
  font-size: 10px; background: rgba(139,92,246,0.15);
  color: #a78bfa; padding: 2px 8px; border-radius: 20px;
}

/* ====== 页脚 ====== */
.app-footer {
  border-top: 1px solid rgba(255,255,255,0.04);
  padding: 48px 0 32px;
  margin-top: 16px;
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 32px;
}
.footer-logo {
  font-size: 18px; font-weight: 800;
  margin-bottom: 8px;
}
.footer-logo-img {
  width: 22px; height: 22px;
  object-fit: contain;
  vertical-align: -4px;
  margin-right: 6px;
  border-radius: 3px;
}
.footer-logo span {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ef4444);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.footer-slogan { font-size: 13px; color: rgba(255,255,255,0.3); margin: 0 0 8px; }
.footer-copyright { font-size: 11px; color: rgba(255,255,255,0.15); margin: 0; }
.footer-col h4 {
  font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5);
  margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;
}
.footer-col a {
  display: block; font-size: 13px; color: rgba(255,255,255,0.3);
  margin-bottom: 8px; transition: color 0.15s; text-decoration: none;
}
.footer-col a:hover { color: white; }

/* ====== 响应式 ====== */
@media (max-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .shortcut-grid { grid-template-columns: repeat(3, 1fr); }
  .footer-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .app-home { padding: 20px 16px 0; }
  .hero-section { flex-direction: column; align-items: flex-start; gap: 16px; }
  .stats-strip { grid-template-columns: repeat(2, 1fr); }
  .bento-grid { grid-template-columns: 1fr; }
  .shortcut-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: 1fr; }
}
</style>
