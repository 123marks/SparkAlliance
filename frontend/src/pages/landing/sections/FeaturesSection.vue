<template>
  <section id="features" class="features-section" ref="sectionRef">
    <div class="features-container">
      <!-- Section 头部 -->
      <div class="features-header" :class="{ 'is-visible': isVisible }">
        <span class="section-eyebrow">核心功能</span>
        <h2 class="section-title">一站式校园智能平台</h2>
        <p class="section-subtitle">覆盖你校园生活的方方面面，从学习到社交，从日程到求职</p>
      </div>

      <!-- 第一层：3 个核心功能大卡片 + 追光效果 -->
      <div class="main-grid">
        <router-link
          v-for="(feature, index) in coreFeatures"
          :key="feature.title"
          :to="feature.to"
          class="feature-card"
          :class="{ 'is-visible': isVisible }"
          :style="{ transitionDelay: `${0.1 + index * 0.1}s` }"
          @mousemove="handleSpotlight($event, index)"
          @mouseleave="resetSpotlight(index)"
        >
          <!-- 追光层 -->
          <div class="spotlight" :style="spotlightStyles[index]"></div>
          
          <div class="card-inner">
            <!-- 图标 -->
            <div class="feature-icon" :style="{ background: feature.iconBg }">
              <span v-html="feature.svg"></span>
            </div>
            
            <h3 class="feature-title">{{ feature.title }}</h3>
            
            <!-- 技术标签 -->
            <div class="tags">
              <span v-for="tag in feature.tags" :key="tag">{{ tag }}</span>
            </div>
            
            <p class="feature-desc">{{ feature.desc }}</p>
            
            <!-- 数据亮点 -->
            <div class="data-highlight" v-if="feature.dataHighlight">
              <span class="dh-value" :style="{ color: feature.accentColor }">{{ feature.dataHighlight.value }}</span>
              <span class="dh-label">{{ feature.dataHighlight.label }}</span>
            </div>
            
            <!-- 进入按钮 -->
            <div class="card-cta">
              <span class="cta-text">进入体验 →</span>
            </div>
          </div>
        </router-link>
      </div>

      <!-- 第二层：拓展功能中卡片 -->
      <div class="expand-grid">
        <router-link
          v-for="(feature, index) in expandFeatures"
          :key="feature.title"
          :to="feature.to"
          class="feature-card-sm"
          :class="{ 'is-visible': isVisible }"
          :style="{ transitionDelay: `${0.4 + index * 0.08}s` }"
        >
          <div class="sm-icon" :style="{ background: feature.iconBg }">
            <span v-html="feature.svg"></span>
          </div>
          <div class="sm-content">
            <h4 class="sm-title">{{ feature.title }}</h4>
            <p class="sm-desc">{{ feature.desc }}</p>
          </div>
          <span class="sm-badge" :class="feature.status">{{ feature.statusText }}</span>
        </router-link>
      </div>

      <!-- 第三层：未来规划时间线 -->
      <div class="future-grid">
        <router-link
          v-for="(feature, index) in futureFeatures"
          :key="feature.title"
          :to="feature.to"
          class="feature-card-xs"
          :class="{ 'is-visible': isVisible }"
          :style="{ transitionDelay: `${0.7 + index * 0.08}s` }"
        >
          <div class="xs-icon" :style="{ background: feature.iconBg }">
            <span v-html="feature.svg"></span>
          </div>
          <span class="xs-title">{{ feature.title }}</span>
          <span class="xs-badge" :class="feature.badgeClass || ''">{{ feature.statusText }}</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// 追光效果状态
const spotlightStyles = reactive<Record<number, Record<string, string>>>({})

const handleSpotlight = (e: MouseEvent, index: number) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  spotlightStyles[index] = {
    background: `radial-gradient(400px circle at ${x}px ${y}px, rgba(139, 92, 246, 0.08), transparent 60%)`,
    opacity: '1'
  }
}

const resetSpotlight = (index: number) => {
  spotlightStyles[index] = { opacity: '0' }
}

// 核心功能数据
const coreFeatures = [
  {
    title: 'AI 智能助手',
    tags: ['DeepSeek', '豆包', '千问', '多模型API'],
    desc: '接入顶级大模型 API，24h智能答疑、分步讲解、举一反三，免费用户每天 20 次，付费解锁无限',
    iconBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
    accentColor: '#4f8ef7',
    to: '/app/chat',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    dataHighlight: { value: '多模型', label: 'API 智能调度' }
  },
  {
    title: '校园动态墙',
    tags: ['半匿名', '实时', 'AI审核', '图文混排'],
    desc: '表白、寻物、拼车、吐槽……半匿名公开讨论，让每个校园故事被看见',
    iconBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
    accentColor: '#8b5cf6',
    to: '/app/wall',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    dataHighlight: { value: '实时', label: '动态零延迟' }
  },
  {
    title: '星火伴侣',
    tags: ['AI原生对话', '群组协作', '开放社交'],
    desc: '顺应 AI 时代的新型社交——AI 助手无缝融入群聊、智能匹配兴趣伙伴、人+AI 协作新范式',
    iconBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1))',
    accentColor: '#10b981',
    to: '/app/companion',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    dataHighlight: { value: '人+AI', label: '新型社交范式' }
  }
]

// 拓展功能（已开发的模块）
const expandFeatures = [
  { title: '智能日程', desc: '可视化日历、课表导入、AI 智能提醒', status: 'live', statusText: '已上线', to: '/app/schedule', iconBg: 'rgba(20,184,166,0.12)', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { title: '校园购物', desc: 'C2C 二手交易、基于IP优先推送近距离商品、支持快递', status: 'live', statusText: '已上线', to: '/app/shop', iconBg: 'rgba(249,115,22,0.12)', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' },
  { title: '星火规划', desc: 'AI 目标拆分、日/周/月计划、成就勋章激励', status: 'live', statusText: '已上线', to: '/app/planner', iconBg: 'rgba(236,72,153,0.12)', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>' },
  { title: '星火自习室', desc: '番茄钟专注、学习房间、排行榜互助', status: 'live', statusText: '已上线', to: '/app/study-room', iconBg: 'rgba(16,185,129,0.12)', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>' },
]

// 已完成/进行中功能
const futureFeatures = [
  { title: '星火人才', to: '/app/talent', statusText: '已上线', badgeClass: 'live', iconBg: 'rgba(244,63,94,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>' },
  { title: '星火资讯', to: '/app/news', statusText: '已上线', badgeClass: 'live', iconBg: 'rgba(59,130,246,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path></svg>' },
  { title: '星火共创', to: '/app/cocreate', statusText: '已上线', badgeClass: 'live', iconBg: 'rgba(139,92,246,0.12)', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>' },
]

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { threshold: 0.08 })

  if (sectionRef.value) observer.observe(sectionRef.value)
})

onBeforeUnmount(() => { observer?.disconnect() })
</script>

<style scoped>
.features-section {
  padding: 120px 40px;
  background-color: var(--color-bg-primary);
}

.features-container {
  max-width: 1200px;
  margin: 0 auto;
}

.features-header {
  text-align: center;
  margin-bottom: 72px;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.6s ease-out;
}
.features-header.is-visible { opacity: 1; transform: translateY(0); }

/* === 核心功能大卡片网格 === */
.main-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.feature-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.feature-card.is-visible { opacity: 1; transform: translateY(0); }
.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 48px rgba(0,0,0,0.4);
  border-color: rgba(139, 92, 246, 0.25);
}

/* 追光效果层 */
.spotlight {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

.card-inner {
  position: relative;
  z-index: 2;
  padding: 28px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.feature-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.feature-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;
  color: white;
}

.tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.tags span {
  font-size: 11px;
  padding: 3px 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 999px;
  color: var(--color-text-secondary);
}

.feature-desc {
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 16px;
  flex-grow: 1;
}

/* 数据亮点 */
.data-highlight {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.02);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.04);
}
.dh-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.dh-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 迷你预览框 */
.preview-box {
  height: 80px;
  background: rgba(0,0,0,0.25);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.04);
  padding: 12px 14px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.mini-chat { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.mini-bubble {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mini-bubble.ai { background: rgba(255,255,255,0.04); align-self: flex-start; color: var(--color-text-secondary); }
.mini-bubble.user { background: var(--color-brand-blue); color: white; align-self: flex-end; }

.mini-feed { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.mini-post {
  display: flex; gap: 8px; align-items: center;
}
.mini-post.faded { opacity: 0.3; }
.mini-avatar { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; }
.mini-lines { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.line { height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.mini-likes { font-size: 9px; color: var(--color-text-muted); flex-shrink: 0; }

.mini-social { width: 100%; display: flex; align-items: center; justify-content: space-between; }
.social-avatars { display: flex; align-items: center; }
.s-avatar { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-bg-primary); }
.s-avatar.overlap { margin-left: -10px; }
.s-more { font-size: 11px; color: var(--color-text-muted); margin-left: 8px; font-weight: 600; }
.social-text { font-size: 11px; color: var(--color-brand-green); }

/* === 拓展功能中卡片 === */
.expand-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.feature-card-sm {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.feature-card-sm.is-visible { opacity: 1; transform: translateY(0); }
.feature-card-sm:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.12);
}

.sm-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sm-content { flex: 1; min-width: 0; }
.sm-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; color: white; }
.sm-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-badge {
  font-size: 10px; padding: 3px 10px; border-radius: 999px; font-weight: 600; flex-shrink: 0;
}
.sm-badge.dev { background: rgba(59,130,246,0.12); color: #60a5fa; }
.sm-badge.plan { background: rgba(249,115,22,0.12); color: #fb923c; }

/* === 未来功能小卡片 === */
.future-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.feature-card-xs {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.feature-card-xs.is-visible { opacity: 1; transform: translateY(0); }
.feature-card-xs:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.25); }
.xs-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.xs-title { font-size: 13px; font-weight: 600; flex: 1; color: var(--color-text-secondary); }
.xs-badge { font-size: 9px; padding: 2px 8px; border-radius: 999px; background: rgba(139,92,246,0.12); color: #a78bfa; font-weight: 600; flex-shrink: 0; }
.xs-badge.live { background: rgba(16,185,129,0.12); color: #34d399; }

/* 可点击卡片 */
.feature-card, .feature-card-sm, .feature-card-xs { text-decoration: none; color: inherit; cursor: pointer; }
.card-cta { margin-top: auto; padding-top: 12px; }
.cta-text { font-size: 12px; color: rgba(139,92,246,0.5); font-weight: 600; transition: color 0.2s; }
.feature-card:hover .cta-text { color: rgba(139,92,246,0.9); }
.sm-badge.live { background: rgba(16,185,129,0.12); color: #34d399; }

/* === 响应式 === */
@media (max-width: 900px) {
  .main-grid { grid-template-columns: 1fr; }
  .expand-grid { grid-template-columns: 1fr; }
  .future-grid { grid-template-columns: 1fr; }
  .features-section { padding: 80px 20px; }
}
</style>
