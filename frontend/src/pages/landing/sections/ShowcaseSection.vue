<template>
  <section class="showcase-section" ref="sectionRef">
    <div class="container">
      <!-- 头部 -->
      <div class="showcase-header" :class="{ 'is-visible': isVisible }">
        <span class="eyebrow">产品体验</span>
        <h2 class="title">看见真实的星火联盟</h2>
        <p class="subtitle">每一个模块都经过精心打磨，点击左侧功能切换，右侧实时预览</p>
      </div>

      <!-- 左右分栏主体 -->
      <div class="showcase-body" :class="{ 'is-visible': isVisible }">
        <!-- 左侧：功能选择器 -->
        <div class="feature-selector">
          <div
            v-for="(item, idx) in demos"
            :key="item.id"
            class="selector-item"
            :class="{ active: activeIdx === idx }"
            @click="selectDemo(idx)"
          >
            <div class="selector-icon" :style="{ background: item.iconBg }">
              <span v-html="item.icon"></span>
            </div>
            <div class="selector-info">
              <h4>{{ item.title }}</h4>
              <p>{{ item.desc }}</p>
            </div>
            <!-- 进度条（自动轮播进度） -->
            <div class="progress-bar" v-if="activeIdx === idx">
              <div class="progress-fill" :style="{ animationDuration: autoPlayDuration + 'ms' }"></div>
            </div>
          </div>
        </div>

        <!-- 右侧：模拟界面预览 -->
        <div class="demo-viewport">
          <!-- 浏览器窗口框 -->
          <div class="browser-frame">
            <div class="browser-bar">
              <div class="browser-dots"><span></span><span></span><span></span></div>
              <div class="browser-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                spark-alliance.app/{{ demos[activeIdx].route }}
              </div>
            </div>
            
            <!-- 动态内容区 -->
            <div class="browser-content">
              <Transition name="demo-fade" mode="out-in">
                <!-- AI 助手演示 -->
                <div v-if="activeIdx === 0" key="ai" class="demo-panel demo-ai">
                  <div class="demo-sidebar-mini">
                    <div class="mini-item active"><span>💬</span> 新对话</div>
                    <div class="mini-item"><span>📝</span> 期末复习大纲</div>
                    <div class="mini-item"><span>🔍</span> 代码调试</div>
                  </div>
                  <div class="demo-main">
                    <div class="chat-msg ai"><div class="msg-avatar">🤖</div><div class="msg-body">我已接入 DeepSeek / 豆包 / 千问等多模型 API，随时为你答疑。试试发送一道数学题？</div></div>
                    <div class="chat-msg user"><div class="msg-body">帮我解释一下偏导数的链式法则，并举一个实际例子</div></div>
                    <div class="chat-msg ai"><div class="msg-avatar">🤖</div><div class="msg-body">
                      <strong>链式法则</strong>：若 z = f(u, v)，u = g(x, y)，v = h(x, y)，则：<br/>
                      <code>∂z/∂x = (∂z/∂u)(∂u/∂x) + (∂z/∂v)(∂v/∂x)</code><br/>
                      <span class="typing-dots"><span></span><span></span><span></span></span>
                    </div></div>
                  </div>
                </div>

                <!-- 校园墙演示 -->
                <div v-else-if="activeIdx === 1" key="wall" class="demo-panel demo-wall">
                  <div class="wall-tabs">
                    <span class="active">全部</span><span>表白</span><span>求助</span><span>吐槽</span><span>拼车</span>
                  </div>
                  <div class="wall-post" v-for="p in wallPosts" :key="p.author">
                    <div class="post-avatar" :style="{ background: p.color }"></div>
                    <div class="post-body">
                      <div class="post-meta"><strong>{{ p.author }}</strong><span>{{ p.time }}</span></div>
                      <p>{{ p.content }}</p>
                      <div class="post-actions"><span>❤️ {{ p.likes }}</span><span>💬 {{ p.comments }}</span><span>🔗 分享</span></div>
                    </div>
                  </div>
                </div>

                <!-- 星火共创演示 -->
                <div v-else-if="activeIdx === 2" key="cocreate" class="demo-panel demo-cocreate">
                  <div class="cc-header-bar"><span class="cc-tab active">🔥 广场</span><span class="cc-tab">我的</span><span class="cc-tab">申请</span><span class="cc-tab">+ 发布</span></div>
                  <div class="cc-project" v-for="proj in ccProjects" :key="proj.name">
                    <div class="cc-proj-top">
                      <h5>{{ proj.name }}</h5>
                      <span class="cc-status" :class="proj.status">{{ proj.statusText }}</span>
                    </div>
                    <p>{{ proj.desc }}</p>
                    <div class="cc-proj-tags"><span v-for="t in proj.tags" :key="t">{{ t }}</span></div>
                    <div class="cc-proj-stats"><span>👤 {{ proj.members }}人</span><span>👍 {{ proj.likes }}</span><span>💬 {{ proj.comments }}</span></div>
                  </div>
                </div>

                <!-- 星火人才演示 -->
                <div v-else-if="activeIdx === 3" key="talent" class="demo-panel demo-talent">
                  <div class="talent-search"><input placeholder="搜索技能、职位、学校..." disabled /><span class="search-icon">🔍</span></div>
                  <div class="talent-cards">
                    <div class="talent-card" v-for="t in talents" :key="t.name">
                      <div class="t-avatar" :style="{ background: t.color }"></div>
                      <div class="t-info"><strong>{{ t.name }}</strong><span>{{ t.school }}</span></div>
                      <div class="t-skills"><span v-for="s in t.skills" :key="s">{{ s }}</span></div>
                      <div class="t-match">匹配度 <strong>{{ t.match }}%</strong></div>
                    </div>
                  </div>
                </div>

                <!-- 星火资讯演示 -->
                <div v-else-if="activeIdx === 4" key="news" class="demo-panel demo-news">
                  <div class="news-tabs"><span class="active">热榜</span><span>科技</span><span>教育</span><span>AI</span></div>
                  <div class="news-item" v-for="n in newsItems" :key="n.title">
                    <div class="news-rank" :class="n.hot ? 'hot' : ''">{{ n.rank }}</div>
                    <div class="news-body"><h5>{{ n.title }}</h5><div class="news-meta"><span>{{ n.source }}</span><span>{{ n.heat }} 热度</span></div></div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 右下角说明 -->
          <div class="demo-caption">
            <h3>{{ demos[activeIdx].caption }}</h3>
            <p>{{ demos[activeIdx].captionDesc }}</p>
            <router-link :to="demos[activeIdx].link" class="demo-link">立即体验 →</router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRevealOnScroll } from '../../../composables/useRevealOnScroll'

const { isVisible, sectionRef } = useRevealOnScroll({ threshold: 0.1 })
void sectionRef  // 用于模板 ref 绑定
const activeIdx = ref(0)
const autoPlayDuration = 6000
let autoTimer: ReturnType<typeof setInterval> | null = null

watch(isVisible, (v) => { if (v) startAutoPlay() })

// 选择演示
const selectDemo = (idx: number) => {
  activeIdx.value = idx
  resetAutoPlay()
}

// 自动轮播
const startAutoPlay = () => {
  autoTimer = setInterval(() => {
    activeIdx.value = (activeIdx.value + 1) % demos.length
  }, autoPlayDuration)
}

const resetAutoPlay = () => {
  if (autoTimer) clearInterval(autoTimer)
  startAutoPlay()
}

// 演示数据
const demos = [
  {
    id: 'ai', title: 'AI 智能助手', desc: '多模型API驱动，24h答疑解惑',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    iconBg: 'rgba(59,130,246,0.12)', route: 'chat',
    caption: '多模型智能调度', captionDesc: '接入 DeepSeek / 豆包 / 千问，免费用户每天20次，付费无限。', link: '/app/chat'
  },
  {
    id: 'wall', title: '校园动态墙', desc: '半匿名实时社区，校园故事集散地',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>',
    iconBg: 'rgba(139,92,246,0.12)', route: 'wall',
    caption: '实时校园动态', captionDesc: '表白、求助、拼车、吐槽，半匿名公开讨论零延迟。', link: '/app/wall'
  },
  {
    id: 'cocreate', title: '星火共创', desc: '项目展示与协作招募平台',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
    iconBg: 'rgba(16,185,129,0.12)', route: 'cocreate',
    caption: '发现好项目，组队共创', captionDesc: '发布项目、申请协作、点赞评论，让优秀创意被看见。', link: '/app/cocreate'
  },
  {
    id: 'talent', title: '星火人才', desc: '双向匹配，精准连接人才与机会',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a4 4 0 0 0-8 0v2"></path></svg>',
    iconBg: 'rgba(244,63,94,0.12)', route: 'talent',
    caption: '人才双向匹配', captionDesc: '创建能力名片，企业主动寻访，AI语义匹配推荐。', link: '/app/talent'
  },
  {
    id: 'news', title: '星火资讯', desc: '全网热榜聚合+AI摘要解读',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><rect x="17" y="4" width="4" height="16" rx="1"></rect></svg>',
    iconBg: 'rgba(249,115,22,0.12)', route: 'news',
    caption: '打破信息茧房', captionDesc: '聚合15+信息源，AI一键摘要+多角度解读。', link: '/app/news'
  },
]

// 模拟数据
const wallPosts = [
  { author: '匿名同学', time: '5分钟前', content: '图书馆三楼靠窗的位置也太舒服了吧！强烈推荐 📚', likes: 42, comments: 8, color: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { author: '星火学长', time: '20分钟前', content: '明天有人一起拼车去高铁站吗？下午3点出发，可以分摊油费 🚗', likes: 15, comments: 23, color: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
]

const ccProjects = [
  { name: '智能课表助手', desc: '基于AI的课程推荐和排课优化工具', tags: ['Vue3', 'AI', '教育'], members: 4, likes: 67, comments: 12, status: 'recruiting', statusText: '招募中' },
  { name: '校园跑腿平台', desc: '学生互助代取快递、代买餐食', tags: ['React', '小程序'], members: 6, likes: 89, comments: 24, status: 'dev', statusText: '开发中' },
]

const talents = [
  { name: '张三', school: '清华大学 · CS', skills: ['Vue', 'Python', 'AI'], match: 95, color: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' },
  { name: '李四', school: '北大 · 设计', skills: ['Figma', 'UI/UX'], match: 88, color: 'linear-gradient(135deg,#f43f5e,#f97316)' },
  { name: '王五', school: '浙大 · 数据', skills: ['Python', 'ML', 'SQL'], match: 82, color: 'linear-gradient(135deg,#10b981,#3b82f6)' },
]

const newsItems = [
  { rank: 1, title: 'DeepSeek-V3 发布：国产大模型再创新高', source: '36Kr', heat: '9.8w', hot: true },
  { rank: 2, title: '2026年春招薪资报告：AI岗位涨幅最大', source: '脉脉', heat: '7.2w', hot: true },
  { rank: 3, title: 'Vue 4.0 正式发布，全面拥抱 Signals', source: 'GitHub', heat: '5.1w', hot: true },
  { rank: 4, title: '教育部发布《大学生AI素养培养指南》', source: '人民网', heat: '3.4w', hot: false },
  { rank: 5, title: '全国大学生创新创业大赛报名开启', source: '教育部', heat: '2.8w', hot: false },
]

onBeforeUnmount(() => {
  if (autoTimer) clearInterval(autoTimer)
})
</script>

<style scoped>
.showcase-section { padding: 120px 40px; background-color: transparent; position: relative; }
.container { max-width: 1280px; margin: 0 auto; }

.showcase-header { text-align: center; margin-bottom: 64px; opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.showcase-header.is-visible { opacity: 1; transform: translateY(0); }
.eyebrow { color: var(--color-brand-orange); font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; display: block; }
.title { font-size: 40px; font-weight: 800; color: white; margin-bottom: 16px; }
.subtitle { color: var(--color-text-secondary); font-size: 18px; max-width: 600px; margin: 0 auto; }

/* 主体布局 */
.showcase-body { display: grid; grid-template-columns: 340px 1fr; gap: 32px; opacity: 0; transform: translateY(40px); transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s; }
.showcase-body.is-visible { opacity: 1; transform: translateY(0); }

/* 左侧选择器 */
.feature-selector { display: flex; flex-direction: column; gap: 8px; }
.selector-item { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 14px; cursor: pointer; border: 1px solid transparent; transition: all 0.25s; position: relative; overflow: hidden; }
.selector-item:hover { background: rgba(255,255,255,0.03); }
.selector-item.active { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.2); }

.selector-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.selector-info h4 { font-size: 15px; font-weight: 700; color: white; margin-bottom: 2px; }
.selector-info p { font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }

/* 进度条 */
.progress-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.05); }
.progress-fill { height: 100%; background: var(--gradient-brand); width: 0; animation: progressGrow linear forwards; }
@keyframes progressGrow { from { width: 0; } to { width: 100%; } }

/* 右侧视口 */
.demo-viewport { position: relative; }

/* 浏览器框 */
.browser-frame { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.browser-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
.browser-dots { display: flex; gap: 6px; }
.browser-dots span { width: 10px; height: 10px; border-radius: 50%; }
.browser-dots span:nth-child(1) { background: #ff5f56; }
.browser-dots span:nth-child(2) { background: #ffbd2e; }
.browser-dots span:nth-child(3) { background: #27c93f; }
.browser-url { flex: 1; font-size: 11px; color: var(--color-text-muted); font-family: monospace; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.03); padding: 4px 12px; border-radius: 6px; }

/* 内容面板 */
.browser-content { height: 420px; overflow: hidden; }

/* 过渡动画 */
.demo-fade-enter-active { transition: opacity 0.3s, transform 0.3s; }
.demo-fade-leave-active { transition: opacity 0.2s; }
.demo-fade-enter-from { opacity: 0; transform: translateY(10px); }
.demo-fade-leave-to { opacity: 0; }

.demo-panel { height: 100%; padding: 16px; overflow-y: auto; }

/* AI 演示 */
.demo-ai { display: flex; gap: 0; padding: 0; }
.demo-sidebar-mini { width: 160px; border-right: 1px solid rgba(255,255,255,0.05); padding: 12px 8px; flex-shrink: 0; }
.mini-item { padding: 8px 10px; border-radius: 8px; font-size: 11px; color: var(--color-text-muted); cursor: default; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.mini-item.active { background: rgba(79,142,247,0.12); color: white; }
.demo-main { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.chat-msg { display: flex; gap: 8px; align-items: flex-start; }
.chat-msg.user { justify-content: flex-end; }
.msg-avatar { width: 28px; height: 28px; border-radius: 8px; background: rgba(79,142,247,0.15); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.msg-body { padding: 10px 14px; border-radius: 12px; font-size: 12px; line-height: 1.6; max-width: 80%; }
.chat-msg.ai .msg-body { background: rgba(255,255,255,0.04); color: var(--color-text-secondary); border-top-left-radius: 4px; }
.chat-msg.user .msg-body { background: var(--color-brand-blue); color: white; border-top-right-radius: 4px; }
.msg-body code { display: block; margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.3); border-radius: 6px; font-family: monospace; font-size: 11px; color: #a78bfa; }
.typing-dots { display: inline-flex; gap: 3px; margin-top: 4px; }
.typing-dots span { width: 4px; height: 4px; border-radius: 50%; background: var(--color-text-muted); animation: blink 1.4s infinite both; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }

/* 校园墙 */
.wall-tabs { display: flex; gap: 12px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.wall-tabs span { font-size: 12px; color: var(--color-text-muted); cursor: default; padding: 4px 0; }
.wall-tabs span.active { color: white; border-bottom: 2px solid var(--color-brand-purple); }
.wall-post { display: flex; gap: 10px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.post-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.post-body { flex: 1; }
.post-meta { font-size: 12px; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; }
.post-meta strong { color: white; }
.post-meta span { color: var(--color-text-muted); font-size: 11px; }
.post-body p { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 8px; }
.post-actions { display: flex; gap: 16px; font-size: 11px; color: var(--color-text-muted); }

/* 共创 */
.cc-header-bar { display: flex; gap: 8px; margin-bottom: 14px; }
.cc-tab { font-size: 12px; padding: 5px 12px; border-radius: 8px; color: var(--color-text-muted); cursor: default; }
.cc-tab.active { background: rgba(139,92,246,0.12); color: #c4b5fd; }
.cc-project { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.cc-proj-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.cc-proj-top h5 { font-size: 14px; color: white; font-weight: 600; }
.cc-status { font-size: 10px; padding: 2px 8px; border-radius: 999px; }
.cc-status.recruiting { background: rgba(16,185,129,0.12); color: #34d399; }
.cc-status.dev { background: rgba(59,130,246,0.12); color: #60a5fa; }
.cc-project p { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
.cc-proj-tags { display: flex; gap: 4px; margin-bottom: 8px; }
.cc-proj-tags span { font-size: 10px; padding: 2px 8px; background: rgba(255,255,255,0.04); border-radius: 999px; color: var(--color-text-secondary); }
.cc-proj-stats { display: flex; gap: 12px; font-size: 11px; color: var(--color-text-muted); }

/* 人才 */
.talent-search { position: relative; margin-bottom: 14px; }
.talent-search input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: rgba(255,255,255,0.03); color: var(--color-text-muted); font-size: 12px; outline: none; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; }
.talent-cards { display: flex; flex-direction: column; gap: 10px; }
.talent-card { display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; }
.t-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.t-info { flex: 1; }
.t-info strong { font-size: 13px; color: white; display: block; }
.t-info span { font-size: 11px; color: var(--color-text-muted); }
.t-skills { display: flex; gap: 4px; }
.t-skills span { font-size: 10px; padding: 2px 6px; background: rgba(139,92,246,0.1); border-radius: 4px; color: #a78bfa; }
.t-match { font-size: 11px; color: var(--color-text-muted); flex-shrink: 0; }
.t-match strong { color: #10b981; }

/* 资讯 */
.news-tabs { display: flex; gap: 12px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.news-tabs span { font-size: 12px; color: var(--color-text-muted); cursor: default; padding: 4px 0; }
.news-tabs span.active { color: white; border-bottom: 2px solid var(--color-brand-orange); }
.news-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.news-rank { width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.05); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-text-muted); }
.news-rank.hot { background: rgba(244,63,94,0.15); color: #f43f5e; }
.news-body { flex: 1; }
.news-body h5 { font-size: 13px; color: white; font-weight: 500; margin-bottom: 2px; }
.news-meta { font-size: 11px; color: var(--color-text-muted); display: flex; gap: 8px; }

/* 标题说明 */
.demo-caption { margin-top: 24px; }
.demo-caption h3 { font-size: 20px; font-weight: 700; color: white; margin-bottom: 6px; }
.demo-caption p { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; }
.demo-link { font-size: 14px; color: var(--color-brand-blue); font-weight: 600; text-decoration: none; transition: color 0.2s; }
.demo-link:hover { color: white; }

/* 响应式 */
@media (max-width: 900px) {
  .showcase-body { grid-template-columns: 1fr; }
  .feature-selector { flex-direction: row; overflow-x: auto; gap: 4px; }
  .selector-item { min-width: 140px; flex-shrink: 0; }
  .demo-sidebar-mini { display: none; }
  .browser-content { height: 350px; }
  .showcase-section { padding: 80px 20px; }
}
</style>
