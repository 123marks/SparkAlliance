<script setup lang="ts">
import { onMounted } from 'vue'
import MouseFollower from './components/MouseFollower.vue'
import ParticleBackground from './components/ParticleBackground.vue'
import { useAuth } from './composables/useAuth'

const { initAuth } = useAuth()

onMounted(() => {
  initAuth()
})
</script>

<template>
  <ParticleBackground />
  <MouseFollower />
  
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
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
