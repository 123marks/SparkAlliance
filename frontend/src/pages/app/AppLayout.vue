<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <div class="sidebar-header">
        <div class="logo">✦ <span class="text-brand">Spark</span></div>
        <button class="toggle-btn" @click="isCollapsed = !isCollapsed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/app/home" class="nav-item" active-class="active">
          <div class="icon-wrap">🏠</div>
          <span class="nav-text">主控台</span>
        </router-link>
        <router-link to="/app/chat" class="nav-item" active-class="active">
          <div class="icon-wrap">💬</div>
          <span class="nav-text">AI 助手</span>
        </router-link>
        <router-link to="/app/wall" class="nav-item" active-class="active">
          <div class="icon-wrap">🌐</div>
          <span class="nav-text">校园动态</span>
        </router-link>
        <router-link to="/app/profile" class="nav-item" active-class="active">
          <div class="icon-wrap">👤</div>
          <span class="nav-text">个人中心</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini-card">
          <div class="u-avatar">{{ avatarInitial }}</div>
          <div class="u-info" v-if="!isCollapsed">
            <h5>{{ userName }}</h5>
            <span>{{ userEmail }}</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" v-if="!isCollapsed">退出登录</button>
        <button class="logout-btn-icon" @click="handleLogout" v-else>🚪</button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Top Header -->
      <header class="app-header">
        <div class="header-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>
        <div class="header-right">
          <div class="search-bar">
            <input type="text" placeholder="搜索..." />
          </div>
          <button class="icon-btn notif-btn">
            🔔 <span class="badge"></span>
          </button>
          <div class="user-dropdown" @click="showDropdown = !showDropdown">
            <div class="dd-avatar">{{ avatarInitial }}</div>
            <div class="dd-menu" v-if="showDropdown">
              <div class="dd-header">
                <strong>{{ userName }}</strong>
                <span>{{ userEmail }}</span>
              </div>
              <div class="dd-divider"></div>
              <router-link to="/app/profile" class="dd-item" @click="showDropdown = false">👤 个人中心</router-link>
              <div class="dd-item" @click="handleLogout">🚪 退出登录</div>
            </div>
          </div>
        </div>
      </header>
      
      <!-- View Content -->
      <div class="view-container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'

const router = useRouter()
const route = useRoute()
const isCollapsed = ref(false)
const showDropdown = ref(false)

const { user } = useAuth()

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

const currentPageTitle = computed(() => {
  switch (route.name) {
    case 'AppHome': return '💡 Welcome Back!'
    case 'AppChat': return '🧠 AI 学习伴侣'
    case 'AppWall': return '🌏 校园星火墙'
    case 'AppProfile': return '⚙️ 智能个人中心'
    default: return 'Spark Alliance'
  }
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  showDropdown.value = false
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background: var(--color-bg-primary);
  color: white;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;
}

.sidebar.collapsed {
  width: 80px;
}

.sidebar-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
}

.logo {
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}
.sidebar.collapsed .logo {
  display: none;
}
.text-brand { color: var(--color-brand-blue); }

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  border-radius: 8px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
}
.toggle-btn:hover { background: rgba(255,255,255,0.05); color: white; }

.sidebar-nav {
  flex: 1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .nav-item {
  padding: 0;
  justify-content: center;
}

.sidebar.collapsed .nav-text {
  display: none;
}

.icon-wrap {
  font-size: 20px;
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
}

.nav-item:hover {
  background: rgba(255,255,255,0.03);
  color: white;
}

.nav-item.active {
  background: rgba(79, 142, 247, 0.1);
  color: var(--color-brand-blue);
  font-weight: 600;
}

.sidebar-footer {
  padding: 24px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-mini-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar.collapsed .user-mini-card {
  justify-content: center;
}

.u-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-orange));
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; color: white;
}

.u-info {
  overflow: hidden;
}

.u-info h5 { font-size: 14px; margin-bottom: 2px; }
.u-info span { font-size: 12px; color: var(--color-text-muted); }

.logout-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s;
}
.logout-btn:hover { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border-color: rgba(244, 63, 94, 0.2); }

.logout-btn-icon {
  background: transparent; border: none; font-size: 20px;
  transition: transform 0.2s;
}
.logout-btn-icon:hover { transform: scale(1.1); }

/* User Dropdown */
.user-dropdown { position: relative; cursor: pointer; }
.dd-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple));
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: white;
  transition: box-shadow 0.2s;
}
.dd-avatar:hover { box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.3); }
.dd-menu {
  position: absolute;
  top: 48px; right: 0;
  width: 220px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  z-index: 100;
  overflow: hidden;
  animation: ddSlide 0.15s ease-out;
}
@keyframes ddSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.dd-header { padding: 16px; }
.dd-header strong { display: block; font-size: 14px; margin-bottom: 4px; }
.dd-header span { font-size: 12px; color: var(--color-text-muted); }
.dd-divider { height: 1px; background: var(--color-border); }
.dd-item {
  display: block;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: background 0.2s;
  cursor: pointer;
  text-decoration: none;
}
.dd-item:hover { background: rgba(255,255,255,0.05); color: white; }


/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Important for flex child truncation */
}

.app-header {
  height: 72px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(20px);
  z-index: 40;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.search-bar input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--color-border);
  padding: 8px 16px;
  border-radius: 99px;
  color: white;
  width: 240px;
  transition: all 0.3s;
}
.search-bar input:focus {
  outline: none;
  border-color: var(--color-brand-blue);
  background: rgba(79, 142, 247, 0.05);
  width: 300px;
}

.icon-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  position: relative;
  display: flex;
}
.badge {
  position: absolute;
  top: 0px; right: 0px;
  width: 8px; height: 8px;
  background: #f43f5e;
  border-radius: 50%;
  box-shadow: 0 0 10px #f43f5e;
}

.view-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background-color: var(--color-bg-primary);
}

/* Local Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from { opacity: 0; transform: translateY(10px); }
.fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
