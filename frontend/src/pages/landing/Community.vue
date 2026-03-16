<template>
  <div class="community-page">
    <!-- 顶部导航 -->
    <nav class="page-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-links">
        <router-link to="/docs">文档</router-link>
        <router-link to="/community" class="active">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <!-- Hero -->
    <section class="community-hero">
      <div class="hero-glow"></div>
      <h1>加入星火社区</h1>
      <p>与全国各地的学生开发者、创业者一起交流想法、分享成长。</p>
      <div class="hero-stats">
        <div class="stat">
          <div class="stat-num">2,400+</div>
          <div class="stat-label">社区成员</div>
        </div>
        <div class="stat">
          <div class="stat-num">500+</div>
          <div class="stat-label">话题讨论</div>
        </div>
        <div class="stat">
          <div class="stat-num">15+</div>
          <div class="stat-label">兴趣小组</div>
        </div>
      </div>
    </section>

    <!-- 社区入口 -->
    <section class="community-channels">
      <h2 class="section-heading">社区频道</h2>
      <div class="channel-grid">
        <div class="channel-card" v-for="ch in channels" :key="ch.name">
          <div class="channel-icon">{{ ch.icon }}</div>
          <div class="channel-info">
            <h3>{{ ch.name }}</h3>
            <p>{{ ch.desc }}</p>
          </div>
          <div class="channel-meta">
            <span class="member-count">{{ ch.members }} 成员</span>
            <span class="online-dot" v-if="ch.online"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门话题 -->
    <section class="hot-topics">
      <h2 class="section-heading">热门话题</h2>
      <div class="topic-list">
        <div class="topic-card" v-for="topic in topics" :key="topic.title">
          <div class="topic-header">
            <span class="topic-tag">{{ topic.tag }}</span>
            <span class="topic-time">{{ topic.time }}</span>
          </div>
          <h3 class="topic-title">{{ topic.title }}</h3>
          <p class="topic-preview">{{ topic.preview }}</p>
          <div class="topic-footer">
            <span>👤 {{ topic.author }}</span>
            <span>💬 {{ topic.replies }} 回复</span>
            <span>👍 {{ topic.likes }} 赞</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="community-cta">
      <h2>准备好加入了吗？</h2>
      <p>注册即可解锁全部社区功能，与志同道合的同学一起成长。</p>
      <router-link to="/register" class="cta-btn">立即加入社区 →</router-link>
    </section>
  </div>
</template>

<script setup lang="ts">
const channels = [
  { icon: '💡', name: '创意工坊', desc: '分享你的项目创意和脑洞', members: 856, online: true },
  { icon: '🎓', name: '学术交流', desc: '课程讨论、考试互助、学术写作', members: 1203, online: true },
  { icon: '💻', name: '技术开发', desc: '编程学习、代码分享、技术问答', members: 945, online: true },
  { icon: '🎨', name: '设计美学', desc: 'UI/UX、平面设计、作品展示', members: 412, online: false },
  { icon: '📈', name: '职业规划', desc: '实习求职、面试经验、行业分析', members: 678, online: true },
  { icon: '🎮', name: '休闲娱乐', desc: '游戏组队、影视推荐、音乐交流', members: 534, online: false },
]

const topics = [
  { tag: '技术', title: '2026 年最值得学的 5 个前端框架', preview: '从 Vue 3.5 到 Solid.js，盘点今年最有潜力的前端技术栈...', author: '晨曦', replies: 42, likes: 128, time: '2小时前' },
  { tag: '经验', title: '字节跳动春招面经分享（前端方向）', preview: '一共四轮面试，第一轮主要考察基础知识...', author: '匿名用户', replies: 89, likes: 256, time: '5小时前' },
  { tag: '学术', title: '高数期末复习攻略：从挂科边缘到90+', preview: '分享我从大一挂科到大二逆袭的学习方法...', author: '星火学长', replies: 156, likes: 423, time: '1天前' },
  { tag: '项目', title: '寻找队友：校园 AI 助手项目招人', preview: '我们正在开发一个基于大模型的校园 AI 应用...', author: 'SparkDev', replies: 23, likes: 67, time: '2天前' },
]
</script>

<style scoped>
.community-page { min-height: 100vh; background: var(--color-bg-primary); }

/* Nav */
.page-nav { height: 64px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.8); position: sticky; top: 0; z-index: 50; }
.nav-logo { font-weight: 800; font-size: 18px; color: var(--color-brand-blue); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--color-text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 8px 20px !important; border-radius: 8px; color: white !important; }

/* Hero */
.community-hero { text-align: center; padding: 80px 40px 60px; position: relative; overflow: hidden; }
.hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(79,142,247,0.15), transparent 70%); pointer-events: none; }
.community-hero h1 { font-size: 48px; font-weight: 800; margin-bottom: 16px; position: relative; }
.community-hero p { color: var(--color-text-secondary); font-size: 18px; max-width: 600px; margin: 0 auto 40px; position: relative; }

.hero-stats { display: flex; justify-content: center; gap: 60px; position: relative; }
.stat-num { font-size: 32px; font-weight: 800; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; color: transparent; }
.stat-label { font-size: 14px; color: var(--color-text-muted); margin-top: 4px; }

/* Channels */
.community-channels { padding: 60px 40px; max-width: 1000px; margin: 0 auto; }
.section-heading { font-size: 28px; font-weight: 700; margin-bottom: 32px; }

.channel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.channel-card {
  display: flex; align-items: center; gap: 16px;
  background: var(--color-bg-card); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 20px;
  transition: transform 0.2s, border-color 0.2s;
  cursor: pointer;
}
.channel-card:hover { transform: translateY(-2px); border-color: rgba(79,142,247,0.3); }
.channel-icon { font-size: 28px; width: 48px; height: 48px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.channel-info h3 { font-size: 16px; margin-bottom: 4px; }
.channel-info p { font-size: 13px; color: var(--color-text-secondary); }
.channel-meta { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.member-count { font-size: 12px; color: var(--color-text-muted); }
.online-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }

/* Topics */
.hot-topics { padding: 60px 40px; max-width: 1000px; margin: 0 auto; }
.topic-list { display: flex; flex-direction: column; gap: 16px; }
.topic-card {
  background: var(--color-bg-card); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 24px;
  transition: border-color 0.2s;
  cursor: pointer;
}
.topic-card:hover { border-color: rgba(79,142,247,0.3); }
.topic-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.topic-tag { background: rgba(139,92,246,0.15); color: #c4b5fd; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.topic-time { font-size: 12px; color: var(--color-text-muted); }
.topic-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.topic-preview { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
.topic-footer { display: flex; gap: 20px; font-size: 13px; color: var(--color-text-muted); }

/* CTA */
.community-cta { text-align: center; padding: 80px 40px; }
.community-cta h2 { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
.community-cta p { color: var(--color-text-secondary); font-size: 16px; margin-bottom: 32px; }
.cta-btn { display: inline-block; background: var(--gradient-brand); padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; }
.cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(79,142,247,0.3); }

@media (max-width: 768px) {
  .community-hero h1 { font-size: 32px; }
  .hero-stats { flex-direction: column; gap: 20px; }
  .channel-grid { grid-template-columns: 1fr; }
  .page-nav { padding: 0 20px; }
  .community-channels, .hot-topics { padding: 40px 20px; }
}
</style>
