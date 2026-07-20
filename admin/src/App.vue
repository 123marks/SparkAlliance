<template>
  <div class="cosmic-bg" aria-hidden="true"></div>
  <router-view />
  <ToastHost />
</template>

<script setup lang="ts">
import ToastHost from './components/ToastHost.vue'
</script>
