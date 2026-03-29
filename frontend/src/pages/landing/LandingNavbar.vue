<template>
  <nav class="landing-navbar" :class="{ scrolled: isScrolled }">
    <div class="nav-inner">
      <router-link to="/" class="logo">
        <img src="/spark-logo.png" alt="Spark" class="logo-img" />
        <span class="logo-text">SparkAlliance</span>
      </router-link>

      <!-- 桌面端导航 -->
      <div class="nav-links desktop-only">
        <a href="#features" @click.prevent="scrollTo('features')">功能</a>
        <a href="#pricing" @click.prevent="scrollTo('pricing')">定价</a>
        <router-link to="/community">社区</router-link>
        <router-link to="/docs">文档</router-link>
        <router-link to="/changelog">更新日志</router-link>
      </div>
      <div class="auth-buttons desktop-only">
        <router-link to="/login" class="btn-ghost">登录</router-link>
        <router-link to="/register" class="btn-primary">
          立即注册
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </router-link>
      </div>

      <!-- 移动端汉堡按钮 -->
      <button class="mobile-menu-btn" @click="isMobileMenuOpen = !isMobileMenuOpen" aria-label="菜单">
        <div class="hamburger" :class="{ open: isMobileMenuOpen }">
          <span></span><span></span><span></span>
        </div>
      </button>

      <!-- 移动端菜单 -->
      <Transition name="menu-fade">
        <div class="mobile-menu" v-if="isMobileMenuOpen">
          <div class="m-nav-links">
            <a href="#features" @click="isMobileMenuOpen = false; scrollTo('features')">功能</a>
            <a href="#pricing" @click="isMobileMenuOpen = false; scrollTo('pricing')">定价</a>
            <router-link to="/community" @click="isMobileMenuOpen = false">社区</router-link>
            <router-link to="/docs" @click="isMobileMenuOpen = false">文档</router-link>
            <router-link to="/changelog" @click="isMobileMenuOpen = false">更新日志</router-link>
          </div>
          <div class="m-auth-buttons">
            <router-link to="/login" class="btn-ghost m-btn" @click="isMobileMenuOpen = false">登录</router-link>
            <router-link to="/register" class="btn-primary m-btn" @click="isMobileMenuOpen = false">立即注册</router-link>
          </div>
        </div>
      </Transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isMobileMenuOpen = ref(false)
const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 32
}

// 平滑滚动到锚点
const scrollTo = (id: string) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.landing-navbar {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  height: 64px;
  z-index: 1000;
  transition: all 0.3s ease;
  background: transparent;
}

/* 滚动后增强背景 */
.landing-navbar.scrolled {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1001;
}
.logo-img {
  width: 28px; height: 28px;
  object-fit: contain;
  border-radius: 4px;
}
.logo-text {
  font-weight: 800;
  font-size: 17px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.3px;
}

/* 桌面端导航链接 */
.nav-links {
  display: flex;
  gap: 8px;
}
.nav-links a {
  padding: 8px 14px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.nav-links a:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}
.nav-links a.router-link-active {
  color: white;
}

/* 操作按钮 */
.auth-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-ghost {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 7px 16px;
  border-radius: 9px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.25);
  color: white;
}

.btn-primary {
  background: var(--gradient-brand);
  padding: 7px 18px;
  border-radius: 9px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.25);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
}

/* === 移动端汉堡按钮 === */
.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 1001;
  padding: 8px;
}

.hamburger {
  width: 20px; height: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: white;
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: center;
}
.hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* === 移动端菜单 === */
.mobile-menu {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100vh;
  background: rgba(10, 10, 15, 0.96);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px;
  z-index: 1000;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.m-nav-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
  margin-bottom: 40px;
}
.m-nav-links a {
  font-size: 20px;
  font-weight: 600;
  color: white;
  padding: 12px;
  border-radius: 12px;
  transition: background 0.2s;
}
.m-nav-links a:hover { background: rgba(255,255,255,0.05); }

.m-auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.m-btn {
  justify-content: center;
  text-align: center;
  height: 48px;
  font-size: 16px;
  border-radius: 12px;
}

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-menu-btn { display: flex; }
  .nav-inner { padding: 0 20px; }
}
</style>
