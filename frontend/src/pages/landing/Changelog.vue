<template>
  <div class="changelog-page">
    <!-- 顶部导航 -->
    <nav class="page-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-links">
        <router-link to="/docs">文档</router-link>
        <router-link to="/community">社区</router-link>
        <router-link to="/changelog" class="active">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <!-- Hero -->
    <section class="changelog-hero">
      <h1>更新日志</h1>
      <p>记录星火校园每一次的成长与进化。</p>
    </section>

    <!-- Timeline -->
    <section class="changelog-timeline">
      <div class="timeline-item" v-for="(entry, i) in changelog" :key="i">
        <div class="timeline-dot" :class="entry.type"></div>
        <div class="timeline-card">
          <div class="card-header">
            <span class="version-badge" :class="entry.type">{{ entry.version }}</span>
            <span class="release-date">{{ entry.date }}</span>
          </div>
          <h3>{{ entry.title }}</h3>
          <ul>
            <li v-for="(item, j) in entry.changes" :key="j">
              <span class="change-tag" :class="item.type">{{ item.type === 'feat' ? '✨ 新增' : item.type === 'fix' ? '🐛 修复' : item.type === 'improve' ? '⚡ 优化' : '📦 其他' }}</span>
              {{ item.text }}
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const changelog = [
  {
    version: 'v0.4.0',
    date: '2026-03-16',
    title: 'Supabase 鉴权集成 & AI 对话交互',
    type: 'major',
    changes: [
      { type: 'feat', text: '接入 Supabase Auth，实现真实登录注册流程' },
      { type: 'feat', text: 'AI Chat 页面实现模拟流式打字机响应效果' },
      { type: 'feat', text: '新增本地模型授权设置弹窗（⚙️ 图标）' },
      { type: 'improve', text: 'Vue Router 路由守卫升级为 async Supabase Session 检查' },
      { type: 'feat', text: '生成完整数据库 Schema SQL（7 张核心表 + RLS 策略）' },
    ]
  },
  {
    version: 'v0.3.0',
    date: '2026-03-16',
    title: '应用主控台四大页面',
    type: 'major',
    changes: [
      { type: 'feat', text: '🏠 主控台 (AppHome)：欢迎横幅、统计看板、最近对话、日程时间线' },
      { type: 'feat', text: '💬 AI 助手 (Chat)：完整聊天界面，侧边栏历史、模型选择器' },
      { type: 'feat', text: '📝 校园墙 (CampusWall)：动态信息流、发帖器、互动面板' },
      { type: 'feat', text: '👤 个人中心 (Profile)：Banner + 热力图 + 目标追踪 + 雷达图' },
    ]
  },
  {
    version: 'v0.2.0',
    date: '2026-03-16',
    title: '官网二级区域 & 应用外壳',
    type: 'minor',
    changes: [
      { type: 'feat', text: 'Showcase 功能展示区（Bento Box 布局）' },
      { type: 'feat', text: 'Testimonials 用户评价无限轮播' },
      { type: 'feat', text: 'CTA 行动号召区域' },
      { type: 'feat', text: 'AppLayout 应用外壳（折叠侧边栏 + 顶部 Header）' },
    ]
  },
  {
    version: 'v0.1.0',
    date: '2026-03-15',
    title: '项目初始化 & 核心落地页',
    type: 'initial',
    changes: [
      { type: 'feat', text: '使用 Vite + Vue 3 + TypeScript 初始化项目' },
      { type: 'feat', text: 'Vue Router 路由架构（官网区 + 应用区分离）' },
      { type: 'feat', text: 'Hero 首屏 + Features 功能介绍区域' },
      { type: 'feat', text: '玻璃拟态 UI 组件 (GlassCard)' },
      { type: 'feat', text: '鼠标跟随动画 (MouseFollower)' },
      { type: 'feat', text: '粒子连线特效背景 (ParticleBackground)' },
      { type: 'feat', text: '高颜值 Login / Register 鉴权页面' },
    ]
  },
]
</script>

<style scoped>
.changelog-page { min-height: 100vh; background: var(--color-bg-primary); }

/* Nav */
.page-nav { height: 64px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.8); position: sticky; top: 0; z-index: 50; }
.nav-logo { font-weight: 800; font-size: 18px; color: var(--color-brand-blue); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--color-text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 8px 20px !important; border-radius: 8px; color: white !important; }

/* Hero */
.changelog-hero { text-align: center; padding: 80px 40px 60px; }
.changelog-hero h1 { font-size: 48px; font-weight: 800; margin-bottom: 12px; }
.changelog-hero p { color: var(--color-text-secondary); font-size: 18px; }

/* Timeline */
.changelog-timeline { max-width: 700px; margin: 0 auto; padding: 0 40px 80px; position: relative; }
.changelog-timeline::before {
  content: '';
  position: absolute;
  left: 56px;
  top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--color-brand-blue), var(--color-brand-purple), transparent);
}

.timeline-item { display: flex; gap: 24px; margin-bottom: 40px; position: relative; }
.timeline-dot {
  width: 16px; height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 24px;
  z-index: 2;
  border: 3px solid var(--color-bg-primary);
}
.timeline-dot.major { background: var(--color-brand-blue); box-shadow: 0 0 12px rgba(79,142,247,0.5); }
.timeline-dot.minor { background: var(--color-brand-purple); box-shadow: 0 0 12px rgba(139,92,246,0.5); }
.timeline-dot.initial { background: var(--color-brand-orange); box-shadow: 0 0 12px rgba(249,115,22,0.5); }

.timeline-card {
  flex: 1;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  transition: border-color 0.2s;
}
.timeline-card:hover { border-color: rgba(79,142,247,0.3); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.version-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700;
}
.version-badge.major { background: rgba(79,142,247,0.15); color: #93c5fd; }
.version-badge.minor { background: rgba(139,92,246,0.15); color: #c4b5fd; }
.version-badge.initial { background: rgba(249,115,22,0.15); color: #fdba74; }
.release-date { font-size: 13px; color: var(--color-text-muted); }

.timeline-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.timeline-card ul { list-style: none; padding: 0; }
.timeline-card li { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; border-bottom: 1px solid rgba(255,255,255,0.03); }
.timeline-card li:last-child { border-bottom: none; }

.change-tag { font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.change-tag.feat { color: #34d399; }
.change-tag.fix { color: #f87171; }
.change-tag.improve { color: #fbbf24; }

@media (max-width: 768px) {
  .changelog-hero h1 { font-size: 32px; }
  .changelog-timeline { padding: 0 20px 60px; }
  .changelog-timeline::before { left: 27px; }
  .page-nav { padding: 0 20px; }
}
</style>
