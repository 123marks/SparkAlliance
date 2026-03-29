<template>
  <div class="app-layout">
    <!-- 宇宙深空背景 -->
    <CosmicBackground />

    <!-- TopBar — 精简工具栏 -->
    <header class="topbar">
      <div class="topbar-left">
        <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed" title="切换导航">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <router-link to="/" class="logo-link">
          <img src="/spark-logo.png" alt="Spark" class="logo-img" />
          <span class="logo-text">SparkAlliance</span>
        </router-link>
      </div>

      <!-- 全站搜索 -->
      <div class="topbar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索功能、日程、好友..."
          class="search-input"
          @keydown.enter="handleSearch"
        />
      </div>

      <div class="topbar-right">
        <!-- 通知 -->
        <button class="topbar-icon-btn" title="通知">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span class="notif-dot"></span>
        </button>
        <!-- 用户头像 -->
        <div class="user-dropdown" @click="showDropdown = !showDropdown" @mouseleave="showDropdown = false">
          <div class="u-avatar">{{ avatarInitial }}</div>
          <Transition name="dd">
            <div class="dd-menu" v-if="showDropdown">
              <div class="dd-header">
                <strong>{{ userName }}</strong>
                <span>{{ userEmail }}</span>
              </div>
              <div class="dd-divider"></div>
              <router-link to="/app/profile" class="dd-item" @click="showDropdown = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                个人中心
              </router-link>
              <div class="dd-item" @click="handleLogout">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                退出登录
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧边栏 — 唯一导航源，可折叠 -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <nav class="sidebar-nav">
          <!-- 核心功能 -->
          <div class="nav-group">
            <span class="nav-group-label" v-show="!sidebarCollapsed">核心功能</span>
            <router-link to="/app/home" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span class="nav-label">主控台</span>
              <span class="nav-tooltip">主控台</span>
            </router-link>
            <router-link to="/app/chat" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 3.7 2.3 6.9 5.5 8.2L7 22l3.5-1.5A9 9 0 1 0 12 2z"></path></svg>
              <span class="nav-label">AI 助手</span>
              <span class="nav-tooltip">AI 助手</span>
            </router-link>
            <router-link to="/app/companion" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span class="nav-label">星火伴侣</span>
              <span class="nav-tooltip">星火伴侣</span>
            </router-link>
          </div>

          <!-- 校园生活 -->
          <div class="nav-group">
            <span class="nav-group-label" v-show="!sidebarCollapsed">生活服务</span>
            <router-link to="/app/schedule" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span class="nav-label">智能日程</span>
              <span class="nav-tooltip">智能日程</span>
            </router-link>
            <router-link to="/app/planner" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span class="nav-label">星火规划</span>
              <span class="nav-tooltip">星火规划</span>
            </router-link>
            <router-link to="/app/shop" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span class="nav-label">星火购物</span>
              <span class="nav-tooltip">星火购物</span>
            </router-link>
            <router-link to="/app/health" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              <span class="nav-label">健康生活</span>
              <span class="nav-tooltip">健康生活</span>
            </router-link>
          </div>

          <!-- 校园社区 -->
          <div class="nav-group">
            <span class="nav-group-label" v-show="!sidebarCollapsed">社区互动</span>
            <router-link to="/app/wall" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span class="nav-label">星火墙</span>
              <span class="nav-tooltip">星火墙</span>
            </router-link>
            <router-link to="/app/tarot" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
              <span class="nav-label">选择卡罗牌</span>
              <span class="nav-tooltip">选择卡罗牌</span>
            </router-link>
            <router-link to="/app/study-room" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span class="nav-label">星火自习室</span>
              <span class="nav-tooltip">星火自习室</span>
            </router-link>
            <router-link to="/app/messages" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span class="nav-label">星火寄语</span>
              <span class="nav-tooltip">星火寄语</span>
            </router-link>
          </div>

          <!-- 学习成长 -->
          <div class="nav-group">
            <span class="nav-group-label" v-show="!sidebarCollapsed">学习成长</span>
            <router-link to="/app/mentors" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              <span class="nav-label">学长分享</span>
              <span class="nav-tooltip">学长学姐分享</span>
            </router-link>
            <router-link to="/app/resources" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span class="nav-label">学习资源</span>
              <span class="nav-tooltip">学习资源中心</span>
            </router-link>
            <router-link to="/app/talent" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a4 4 0 0 0-8 0v2"></path></svg>
              <span class="nav-label">星火人才</span>
              <span class="nav-tooltip">星火人才</span>
            </router-link>
            <router-link to="/app/news" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 10h2"></path><rect x="17" y="4" width="4" height="16" rx="1"></rect></svg>
              <span class="nav-label">星火资讯</span>
              <span class="nav-tooltip">星火资讯</span>
            </router-link>
            <router-link to="/app/cocreate" class="nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
              <span class="nav-label">星火共创</span>
              <span class="nav-tooltip">星火共创</span>
            </router-link>
          </div>
        </nav>

        <!-- 侧边栏底部 -->
        <div class="sidebar-bottom">
          <router-link to="/app/profile" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span class="nav-label">设置</span>
            <span class="nav-tooltip">个人设置</span>
          </router-link>
          <router-link to="/app/feedback" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span class="nav-label">反馈</span>
            <span class="nav-tooltip">用户反馈</span>
          </router-link>
        </div>
      </aside>

      <!-- 主内容区 — 可自由滚动 -->
      <main class="main-content">
        <div class="view-container">
          <router-view v-slot="{ Component }">
            <component :is="Component" />
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'
import CosmicBackground from '../../components/CosmicBackground.vue'

const router = useRouter()
const showDropdown = ref(false)
const sidebarCollapsed = ref(false)
const searchQuery = ref('')
const { user } = useAuth()

// 搜索功能 — 匹配模块名跳转
const searchMap: Record<string, string> = {
  'ai': '/app/chat', '助手': '/app/chat', 'chat': '/app/chat', '对话': '/app/chat',
  '日程': '/app/schedule', '日历': '/app/schedule', 'schedule': '/app/schedule',
  '墙': '/app/wall', '动态': '/app/wall', '校园': '/app/wall',
  '购物': '/app/shop', '交易': '/app/shop', '二手': '/app/shop',
  '规划': '/app/planner', '目标': '/app/planner',
  '人才': '/app/talent', '求职': '/app/talent', '简历': '/app/talent',
  '资讯': '/app/news', '新闻': '/app/news',
  '共创': '/app/cocreate', '项目': '/app/cocreate', '协作': '/app/cocreate',
  '资源': '/app/resources', '学习': '/app/resources',
  '学长': '/app/mentors', '分享': '/app/mentors',
  '伴侣': '/app/companion', '好友': '/app/companion', '社交': '/app/companion',
  '健康': '/app/health', '打卡': '/app/health', '运动': '/app/health',
  '卡罗牌': '/app/tarot', '选择': '/app/tarot',
  '自习': '/app/study-room', '番茄': '/app/study-room',
  '设置': '/app/profile', '个人': '/app/profile',
  '反馈': '/app/feedback', '建议': '/app/feedback',
  '主页': '/app/home', '首页': '/app/home',
}

const handleSearch = () => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return
  // 匹配关键词
  for (const [keyword, path] of Object.entries(searchMap)) {
    if (q.includes(keyword)) {
      router.push(path)
      searchQuery.value = ''
      return
    }
  }
  // 无匹配 → 默认到 AI 助手
  router.push('/app/chat')
  searchQuery.value = ''
}

// 用户显示名称
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

const userEmail = computed(() => user.value?.email || '')

const avatarInitial = computed(() => {
  const name = userName.value
  return name ? name.charAt(0).toUpperCase() : '?'
})

// 退出登录
const handleLogout = async () => {
  await supabase.auth.signOut()
  showDropdown.value = false
  router.push('/login')
}
</script>

<style scoped>
/* ====== 布局容器 ====== */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: var(--color-bg-primary);
  color: white;
  overflow: hidden;
}

/* ====== TopBar — 精简工具栏 ====== */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(10, 10, 15, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 200;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
}

/* 汉堡菜单切换按钮 */
.sidebar-toggle {
  background: transparent; border: none;
  color: rgba(255,255,255,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  transition: all 0.2s;
}
.sidebar-toggle:hover {
  background: rgba(255,255,255,0.06);
  color: white;
}

/* LOGO */
.logo-link {
  display: flex; align-items: center; gap: 8px;
  text-decoration: none; color: white;
}
.logo-img {
  width: 28px; height: 28px;
  object-fit: contain;
  border-radius: 4px;
}
.logo-text {
  font-size: 17px; font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 搜索栏 */
.topbar-search {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 0 14px;
  height: 36px;
  max-width: 400px; flex: 1;
  margin: 0 24px;
  transition: border-color 0.2s;
  color: rgba(255,255,255,0.4);
}
.topbar-search:focus-within {
  border-color: rgba(79,142,247,0.4);
  background: rgba(255,255,255,0.06);
}
.search-input {
  background: transparent; border: none; outline: none;
  color: white; font-size: 13px; width: 100%;
  font-family: inherit;
}
.search-input::placeholder { color: rgba(255,255,255,0.3); }

/* 右侧图标按钮 */
.topbar-right {
  display: flex; align-items: center; gap: 12px;
  min-width: 120px; justify-content: flex-end;
}
.topbar-icon-btn {
  position: relative;
  background: transparent; border: none;
  color: rgba(255,255,255,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  transition: all 0.2s;
}
.topbar-icon-btn:hover {
  background: rgba(255,255,255,0.06); color: white;
}
.notif-dot {
  position: absolute; top: 6px; right: 6px;
  width: 7px; height: 7px;
  background: #f43f5e; border-radius: 50%;
  box-shadow: 0 0 8px rgba(244,63,94,0.6);
}

/* 头像下拉 */
.user-dropdown { position: relative; cursor: pointer; }
.u-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: white;
  transition: box-shadow 0.2s;
}
.u-avatar:hover { box-shadow: 0 0 0 2px rgba(79,142,247,0.3); }

.dd-menu {
  position: absolute; top: 44px; right: 0;
  width: 200px;
  background: rgba(20, 20, 28, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  z-index: 201; overflow: hidden;
}
.dd-enter-active, .dd-leave-active { transition: all 0.15s ease; }
.dd-enter-from, .dd-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }
.dd-header { padding: 14px 16px; }
.dd-header strong { display: block; font-size: 13px; margin-bottom: 2px; }
.dd-header span { font-size: 12px; color: rgba(255,255,255,0.4); }
.dd-divider { height: 1px; background: rgba(255,255,255,0.06); }
.dd-item {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; font-size: 13px;
  color: rgba(255,255,255,0.6); transition: all 0.15s;
  cursor: pointer;
}
.dd-item:hover { background: rgba(255,255,255,0.05); color: white; }

/* ====== 布局主体 ====== */
.layout-body {
  display: flex;
  flex: 1;
  margin-top: 56px;
  min-height: 0;
}

/* ====== 侧边栏 — 可折叠 ====== */
.sidebar {
  width: 220px;
  background: rgba(10, 10, 18, 0.7);
  border-right: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 50;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 64px; }

.sidebar-nav {
  flex: 1;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 侧边栏滚动条美化 */
.sidebar-nav::-webkit-scrollbar { width: 3px; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1); border-radius: 3px;
}

/* 导航分组 */
.nav-group { margin-bottom: 16px; }
.nav-group-label {
  display: block;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: rgba(255,255,255,0.2);
  padding: 8px 12px 6px;
  white-space: nowrap;
  overflow: hidden;
}

/* 导航链接 */
.nav-link {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: rgba(255,255,255,0.45);
  font-size: 13px; font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-decoration: none;
}
.nav-link:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.85);
}
.nav-link.router-link-active {
  background: rgba(79,142,247,0.1);
  color: #4f8ef7;
}
.nav-link.router-link-active svg { stroke: #4f8ef7; }
.nav-link svg { flex-shrink: 0; }
.nav-label {
  opacity: 1; transition: opacity 0.2s;
}
.collapsed .nav-label { opacity: 0; width: 0; }
.collapsed .nav-group-label { opacity: 0; height: 0; padding: 0; margin: 0; }

/* 收起时 tooltip */
.nav-tooltip {
  position: absolute; left: 60px; top: 50%;
  transform: translateY(-50%) translateX(-8px);
  background: rgba(30,30,40,0.96);
  border: 1px solid rgba(255,255,255,0.1);
  color: white; padding: 6px 12px;
  border-radius: 8px; font-size: 12px; font-weight: 500;
  white-space: nowrap; pointer-events: none;
  opacity: 0; visibility: hidden;
  transition: all 0.15s ease;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.collapsed .nav-link:hover .nav-tooltip {
  opacity: 1; visibility: visible;
  transform: translateY(-50%) translateX(0);
}

/* 侧边栏底部 */
.sidebar-bottom {
  padding: 12px 10px;
  border-top: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ====== 主内容区 — 可自由滚动 ====== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.view-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  /* 关键：允许子页面自由滚动，不锁死 100vh */
}

/* 美化滚动条 */
.view-container::-webkit-scrollbar { width: 6px; }
.view-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
}
.view-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.15);
}

/* ====== 过渡动画 ====== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .sidebar { width: 64px; }
  .sidebar .nav-label { opacity: 0; width: 0; }
  .sidebar .nav-group-label { display: none; }
  .topbar-search { display: none; }
}
</style>
