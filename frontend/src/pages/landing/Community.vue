<template>
  <div class="community-page">
    <!-- 顶部导航 -->
    <nav class="page-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-center">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="searchQuery" placeholder="搜索话题、帖子..." @keyup.enter="filterTopics" />
        </div>
      </div>
      <div class="nav-links">
        <router-link to="/docs">文档</router-link>
        <router-link to="/community" class="active">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <div class="community-layout">
      <!-- 左侧导航栏 -->
      <aside class="community-sidebar">
        <!-- 主导航 -->
        <div class="sidebar-group">
          <div class="sidebar-item" :class="{ active: activeView === 'topics' }" @click="activeView = 'topics'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            主题
          </div>
          <div class="sidebar-item" :class="{ active: activeView === 'latest' }" @click="activeView = 'latest'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            最新
          </div>
          <div class="sidebar-item" :class="{ active: activeView === 'hot' }" @click="activeView = 'hot'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path></svg>
            🔥 热门
          </div>
        </div>

        <!-- 类别 -->
        <div class="sidebar-group">
          <div class="sidebar-label">类别</div>
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="sidebar-item category-item"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = activeCategory === cat.id ? '' : cat.id"
          >
            <span class="cat-dot" :style="{ background: cat.color }"></span>
            {{ cat.name }}
          </div>
        </div>

        <!-- 标签 -->
        <div class="sidebar-group">
          <div class="sidebar-label">标签</div>
          <div class="tag-cloud">
            <span
              v-for="tag in tags"
              :key="tag"
              class="tag-item"
              :class="{ active: activeTag === tag }"
              @click="activeTag = activeTag === tag ? '' : tag"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- 社区建议 -->
        <div class="sidebar-group">
          <div class="sidebar-label">社区建议</div>
          <div class="sidebar-item" @click="activeView = 'topics'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            提交反馈
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="community-main">
        <!-- 分类/排序栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="toolbar-filter" :class="{ active: sortBy === 'top' }" @click="sortBy = 'top'">置顶</span>
            <span class="toolbar-filter" :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新消息</span>
            <span class="toolbar-filter" :class="{ active: sortBy === 'category' }" @click="sortBy = 'category'">类别</span>
          </div>
        </div>

        <!-- 帖子列表 -->
        <div class="topic-table">
          <!-- 表头 -->
          <div class="topic-header-row">
            <div class="th-topic">主题</div>
            <div class="th-meta">回复</div>
            <div class="th-meta">浏览</div>
            <div class="th-meta">活动</div>
          </div>

          <!-- 帖子行 -->
          <div
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="topic-row"
            :class="{ pinned: topic.pinned }"
          >
            <div class="topic-main">
              <div class="topic-title-row">
                <span class="pin-icon" v-if="topic.pinned">📌</span>
                <h4>{{ topic.title }}</h4>
              </div>
              <div class="topic-tags">
                <span class="topic-cat" :style="{ background: getCategoryColor(topic.category) + '20', color: getCategoryColor(topic.category) }">{{ topic.category }}</span>
                <span v-for="t in topic.tags" :key="t" class="topic-tag-sm">{{ t }}</span>
              </div>
            </div>
            <div class="topic-avatars">
              <div v-for="(a, i) in topic.avatars.slice(0, 3)" :key="i" class="t-avatar-sm" :style="{ background: a }"></div>
            </div>
            <div class="topic-stat">{{ topic.replies }}</div>
            <div class="topic-stat">{{ topic.views }}</div>
            <div class="topic-stat time">{{ topic.lastActive }}</div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const activeView = ref('topics')
const activeCategory = ref('')
const activeTag = ref('')
const sortBy = ref('top')

// 分类数据（参考 Qoder/iFlow 论坛风格）
const categories = [
  { id: 'announce', name: '公告', color: '#f97316' },
  { id: 'feature', name: '功能请求', color: '#3b82f6' },
  { id: 'bug', name: '漏洞报告', color: '#f43f5e' },
  { id: 'help', name: '使用帮助', color: '#10b981' },
  { id: 'share', name: '经验分享', color: '#8b5cf6' },
  { id: 'other', name: '其他', color: '#6b7280' },
]

const tags = ['AI助手', '校园墙', '共创', '人才', '资讯', '学习', 'Bug', '建议', '新手入门']

const getCategoryColor = (catName: string) => {
  const cat = categories.find(c => c.name === catName)
  return cat ? cat.color : '#6b7280'
}

// 帖子数据
const topics = ref([
  { id: 1, title: '欢迎来到星火联盟社区，一起建设更好的平台！', category: '公告', tags: ['公告'], replies: 62, views: '15.6k', lastActive: '2月14日', pinned: true, avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)', 'linear-gradient(135deg,#f43f5e,#f97316)', 'linear-gradient(135deg,#10b981,#06b6d4)'] },
  { id: 2, title: 'AI 助手调用次数限制说明与付费方案讨论', category: '功能请求', tags: ['AI助手', '建议'], replies: 37, views: '4.9k', lastActive: '11月', pinned: false, avatars: ['linear-gradient(135deg,#3b82f6,#8b5cf6)', 'linear-gradient(135deg,#f97316,#f43f5e)'] },
  { id: 3, title: '我已经达到每天20次的上限了，接下来怎么办？', category: '使用帮助', tags: ['AI助手'], replies: 11, views: '5.7k', lastActive: '2月4日', pinned: false, avatars: ['linear-gradient(135deg,#10b981,#3b82f6)'] },
  { id: 4, title: '与星火联盟分享你的胜利 🎉', category: '公告', tags: ['经验分享'], replies: 59, views: '4.3k', lastActive: '2025年', pinned: false, avatars: ['linear-gradient(135deg,#f97316,#f43f5e)', 'linear-gradient(135deg,#8b5cf6,#06b6d4)', 'linear-gradient(135deg,#10b981,#3b82f6)'] },
  { id: 5, title: '校园墙发帖后无法删除，疑似是Bug', category: '漏洞报告', tags: ['校园墙', 'Bug'], replies: 8, views: '1.2k', lastActive: '3月', pinned: false, avatars: ['linear-gradient(135deg,#f43f5e,#f97316)'] },
  { id: 6, title: '星火共创项目协作申请流程体验反馈', category: '功能请求', tags: ['共创', '建议'], replies: 31, views: '2.5k', lastActive: '12月', pinned: false, avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)', 'linear-gradient(135deg,#10b981,#06b6d4)'] },
  { id: 7, title: '关于积分未使用完，上个月积分未使用完不结余到下个月', category: '功能请求', tags: ['建议'], replies: 65, views: '4.2k', lastActive: '二维', pinned: false, avatars: ['linear-gradient(135deg,#f97316,#ec4899)', 'linear-gradient(135deg,#3b82f6,#8b5cf6)', 'linear-gradient(135deg,#10b981,#14b8a6)'] },
  { id: 8, title: '新手入门：如何快速上手星火联盟的所有功能？', category: '使用帮助', tags: ['新手入门'], replies: 18, views: '1.2k', lastActive: '2025年8月', pinned: false, avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)'] },
  { id: 9, title: 'AI 助手怎么选择不同的模型？DeepSeek vs 豆包哪个好', category: '使用帮助', tags: ['AI助手'], replies: 13, views: '4.3k', lastActive: '3月13日', pinned: false, avatars: ['linear-gradient(135deg,#3b82f6,#06b6d4)'] },
  { id: 10, title: '⭐ 星火联盟 答疑专区', category: '使用帮助', tags: ['公告'], replies: 66, views: '2.7k', lastActive: '3小时', pinned: true, avatars: ['linear-gradient(135deg,#8b5cf6,#f43f5e)', 'linear-gradient(135deg,#f97316,#f43f5e)', 'linear-gradient(135deg,#10b981,#3b82f6)'] },
])

// 过滤逻辑
const filteredTopics = computed(() => {
  let result = [...topics.value]

  // 按分类过滤
  if (activeCategory.value) {
    const catName = categories.find(c => c.id === activeCategory.value)?.name
    if (catName) result = result.filter(t => t.category === catName)
  }

  // 按标签过滤
  if (activeTag.value) {
    result = result.filter(t => t.tags.includes(activeTag.value))
  }

  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(t => t.title.toLowerCase().includes(q))
  }

  // 排序：置顶优先
  result.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  return result
})

const filterTopics = () => { /* 搜索已通过 computed 实时过滤 */ }
</script>

<style scoped>
.community-page { min-height: 100vh; background: var(--color-bg-primary); display: flex; flex-direction: column; }

/* 导航 */
.page-nav { height: 56px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.9); position: sticky; top: 0; z-index: 50; gap: 20px; }
.nav-logo { font-weight: 800; font-size: 16px; color: var(--color-brand-blue); flex-shrink: 0; }
.nav-center { flex: 1; max-width: 420px; }
.search-box { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; color: var(--color-text-muted); }
.search-box input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 13px; }
.search-box input::placeholder { color: var(--color-text-muted); }
.nav-links { display: flex; gap: 20px; align-items: center; flex-shrink: 0; }
.nav-links a { color: var(--color-text-secondary); font-size: 13px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 6px 16px !important; border-radius: 8px; color: white !important; font-size: 12px !important; }

/* 三栏布局 */
.community-layout { display: flex; flex: 1; }

/* 左侧侧边栏 */
.community-sidebar { width: 220px; border-right: 1px solid var(--color-border); padding: 16px 12px; overflow-y: auto; flex-shrink: 0; position: sticky; top: 56px; height: calc(100vh - 56px); }
.sidebar-group { margin-bottom: 20px; }
.sidebar-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px 4px; }
.sidebar-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s; }
.sidebar-item:hover { background: rgba(255,255,255,0.04); color: white; }
.sidebar-item.active { background: rgba(139,92,246,0.12); color: white; }
.cat-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

/* 标签云 */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 8px; }
.tag-item { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,0.04); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.tag-item:hover { background: rgba(255,255,255,0.08); color: white; }
.tag-item.active { background: rgba(139,92,246,0.15); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }

/* 主内容 */
.community-main { flex: 1; padding: 0; overflow: hidden; }

/* 工具栏 */
.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--color-border); }
.toolbar-left { display: flex; gap: 16px; }
.toolbar-filter { font-size: 13px; color: var(--color-text-muted); cursor: pointer; padding: 4px 0; border-bottom: 2px solid transparent; transition: all 0.15s; }
.toolbar-filter:hover { color: var(--color-text-secondary); }
.toolbar-filter.active { color: white; border-bottom-color: var(--color-brand-blue); }

/* 帖子表 */
.topic-table { width: 100%; }
.topic-header-row { display: flex; align-items: center; padding: 10px 20px; font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--color-border); }
.th-topic { flex: 1; }
.th-meta { width: 70px; text-align: center; }

/* 帖子行 */
.topic-row { display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.15s; }
.topic-row:hover { background: rgba(255,255,255,0.02); }
.topic-row.pinned { background: rgba(139,92,246,0.03); }

.topic-main { flex: 1; min-width: 0; }
.topic-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.pin-icon { font-size: 12px; }
.topic-main h4 { font-size: 14px; font-weight: 500; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topic-row:hover h4 { color: var(--color-brand-blue); }

.topic-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.topic-cat { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.topic-tag-sm { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--color-text-muted); }

.topic-avatars { display: flex; margin-right: 16px; }
.t-avatar-sm { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--color-bg-primary); margin-left: -6px; }
.t-avatar-sm:first-child { margin-left: 0; }

.topic-stat { width: 70px; text-align: center; font-size: 13px; color: var(--color-text-secondary); font-weight: 500; }
.topic-stat.time { font-size: 12px; color: var(--color-text-muted); }

/* 响应式 */
@media (max-width: 768px) {
  .community-sidebar { display: none; }
  .nav-center { max-width: 200px; }
  .topic-avatars { display: none; }
  .th-meta:nth-child(3) { display: none; }
  .topic-stat:nth-child(4) { display: none; }
}
</style>
