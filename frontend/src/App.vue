<script setup lang="ts">
import ParticleBackground from './components/ParticleBackground.vue'
import MouseFollower from './components/MouseFollower.vue'
</script>

<template>
  <ParticleBackground />
  <MouseFollower />
  
  <nav class="top-nav">
    <div class="logo">星火校园</div>
    <div class="nav-links">
      <router-link to="/">首页</router-link>
      <router-link to="/chat">AI助手</router-link>
      <router-link to="/campus-wall">校园墙</router-link>
      <router-link to="/profile">我的</router-link>
    </div>
  </nav>

  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 100;
}

.logo {
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s, text-shadow 0.2s;
  position: relative;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--text-primary);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.nav-links a.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--theme-color);
  border-radius: 2px;
}

/* Page Transition Effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
