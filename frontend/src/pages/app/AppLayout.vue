<template>
  <div class="app-layout">
    <!-- TopBar -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="logo">✦ <span class="text-brand">Spark Alliance</span></div>
      </div>
      <nav class="topbar-nav">
        <router-link to="/app/home" class="nav-item">主控台</router-link>
        <router-link to="/app/chat" class="nav-item">AI 助手</router-link>
        <router-link to="/app/wall" class="nav-item">校园墙</router-link>
        <router-link to="/app/news" class="nav-item">星火资讯</router-link>
        <router-link to="/app/talent" class="nav-item">星火人才</router-link>
      </nav>
      <div class="topbar-right">
        <button class="icon-btn" title="搜索">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <button class="icon-btn notif-btn" title="通知">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span class="badge"></span>
        </button>
        <div class="user-dropdown" @click="showDropdown = !showDropdown" @mouseleave="showDropdown = false">
          <div class="u-avatar">{{ avatarInitial }}</div>
          <div class="dd-menu" v-if="showDropdown">
            <div class="dd-header">
              <strong>{{ userName }}</strong>
              <span>{{ userEmail }}</span>
            </div>
            <div class="dd-divider"></div>
            <router-link to="/app/profile" class="dd-item" @click="showDropdown = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>个人中心
            </router-link>
            <div class="dd-item" @click="handleLogout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>退出登录
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="layout-body">
      <!-- Thin Sidebar -->
      <aside class="compact-sidebar">
        <nav class="sidebar-nav">
          <router-link to="/app/schedule" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <div class="tooltip">智能日程</div>
          </router-link>
          <router-link to="/app/courses" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
            <div class="tooltip">选课助手</div>
          </router-link>
          <router-link to="/app/shop" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <div class="tooltip">校园购物</div>
          </router-link>
          <router-link to="/app/health" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <div class="tooltip">健康打卡</div>
          </router-link>
          <router-link to="/app/resources" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <div class="tooltip">学习资源</div>
          </router-link>
          <router-link to="/app/mentors" class="side-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <div class="tooltip">学长推荐</div>
          </router-link>
        </nav>
        <div class="sidebar-footer">
          <div class="mini-avatar" @click="router.push('/app/profile')">{{ avatarInitial }}</div>
          <button class="logout-icon-btn" @click="handleLogout" title="退出登录">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div class="view-container">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
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

const router = useRouter()
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

const handleLogout = async () => {
  await supabase.auth.signOut()
  showDropdown.value = false
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: var(--color-bg-primary);
  color: white;
}

/* --- TopBar --- */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  width: 200px; /* Fixed width to align with nav */
}

.logo {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.text-brand { color: var(--color-brand-blue); }

.topbar-nav {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-item {
  padding: 8px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  width: 200px;
}

.icon-btn {
  background: transparent; border: none;
  color: rgba(255, 255, 255, 0.6);
  display: flex; align-items: center; justify-content: center;
  transition: color 0.2s; cursor: pointer;
}
.icon-btn:hover { color: white; }

.notif-btn { position: relative; }
.badge {
  position: absolute; top: 0; right: 2px;
  width: 6px; height: 6px;
  background: #f43f5e; border-radius: 50%;
  box-shadow: 0 0 6px #f43f5e;
}

.user-dropdown { position: relative; cursor: pointer; display: flex; align-items: center; }
.u-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple));
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: white;
}

.dd-menu {
  position: absolute;
  top: 44px; right: 0;
  width: 200px;
  background: rgba(20, 20, 25, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 101;
  overflow: hidden;
  animation: ddSlide 0.15s ease-out;
}
@keyframes ddSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.dd-header { padding: 12px 16px; }
.dd-header strong { display: block; font-size: 13px; margin-bottom: 2px; }
.dd-header span { font-size: 12px; color: var(--color-text-muted); }
.dd-divider { height: 1px; background: var(--color-border); }
.dd-item {
  display: block; padding: 12px 16px; font-size: 13px;
  color: var(--color-text-secondary); transition: all 0.2s;
}
.dd-item:hover { background: rgba(255,255,255,0.05); color: white; }

/* --- Layout Body --- */
.layout-body {
  display: flex;
  flex: 1;
  margin-top: 56px; /* Space for TopBar */
  min-height: 0; /* 允许 flex 子元素正常收缩溢出 */
}

/* --- Compact Sidebar --- */
.compact-sidebar {
  width: 64px;
  background: rgba(10, 10, 15, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.sidebar-nav {
  flex: 1;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.side-item {
  position: relative;
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s;
}

.side-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.side-item.router-link-active {
  background: rgba(79, 142, 247, 0.15);
  color: var(--color-brand-blue);
}

.tooltip {
  position: absolute;
  left: 64px;
  background: white;
  color: black;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: all 0.2s;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
}
.side-item:hover .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.sidebar-footer {
  padding: 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.mini-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: white;
  cursor: pointer; transition: background 0.2s;
}
.mini-avatar:hover { background: rgba(255,255,255,0.2); }

.logout-icon-btn {
  background: transparent; border: none; color: rgba(255,255,255,0.4);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: color 0.2s;
}
.logout-icon-btn:hover { color: #f43f5e; }

/* --- Main Content --- */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.view-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  /* background-color: var(--color-bg-primary); */
}
</style>
