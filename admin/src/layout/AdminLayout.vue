<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span class="brand-name">Spark Admin</span>
      </div>

      <nav class="nav">
        <router-link to="/" class="nav-link" exact-active-class="active">
          <span class="nav-ico" aria-hidden="true">◈</span> 总览
        </router-link>
        <router-link to="/users" class="nav-link" active-class="active">
          <span class="nav-ico" aria-hidden="true">👥</span> 用户
        </router-link>
        <router-link to="/posts" class="nav-link" active-class="active">
          <span class="nav-ico" aria-hidden="true">📝</span> 内容
        </router-link>
        <router-link to="/reports" class="nav-link" active-class="active">
          <span class="nav-ico" aria-hidden="true">🚩</span> 举报
        </router-link>
      </nav>

      <div class="sidebar-foot">星火联盟 · 管理端</div>
    </aside>

    <div class="body">
      <header class="topbar">
        <span class="topbar-title">管理控制台</span>
        <div class="topbar-right">
          <span class="admin-chip">
            <span class="admin-dot" aria-hidden="true"></span>
            {{ adminEmail || '管理员' }}
          </span>
          <button class="btn btn-sm" type="button" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <main class="main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { clearSession, getAdminEmail } from '../auth'
import { toast } from '../toast'

const router = useRouter()
const adminEmail = getAdminEmail()

function handleLogout() {
  clearSession()
  toast('已退出登录', 'info')
  void router.push({ name: 'login' })
}
</script>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  min-height: 100vh;
}

/* ===== 侧栏 ===== */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(8, 6, 18, 0.85);
  border-right: 1px solid var(--card-border);
  backdrop-filter: blur(20px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}
.brand-mark {
  color: var(--gold);
  font-size: 16px;
  filter: drop-shadow(0 0 6px rgba(245, 197, 94, 0.6));
}
.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #f5c55e);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nav {
  flex: 1;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.18s;
}
.nav-ico {
  width: 18px;
  text-align: center;
  font-size: 13px;
}
.nav-link:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.nav-link.active {
  color: #e0d4ff;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(124, 58, 237, 0.18));
  border-color: rgba(139, 92, 246, 0.28);
  box-shadow: 0 0 14px rgba(124, 58, 237, 0.16);
}
.sidebar-foot {
  padding: 14px 16px;
  font-size: 11px;
  color: var(--text-3);
  border-top: 1px solid var(--card-border);
}

/* ===== 主体 ===== */
.body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(8, 6, 18, 0.8);
  border-bottom: 1px solid var(--card-border);
  backdrop-filter: blur(20px);
}
.topbar-title {
  font-size: 13px;
  color: var(--text-2);
  letter-spacing: 1px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-1);
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
}
.admin-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.9);
}
.main {
  flex: 1;
  padding: 24px;
  min-width: 0;
}
</style>
