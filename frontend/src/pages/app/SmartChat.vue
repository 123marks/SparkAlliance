<template>
  <div class="smart-chat">
    <!-- 主功能全屏显示 -->
    <component :is="currentModule" />

    <!-- 次功能切换器（右上角浮动小胶囊） -->
    <div class="module-switcher">
      <button
        v-for="m in modules" :key="m.key"
        class="ms-pill" :class="{ active: activeModule === m.key }"
        @click="activeModule = m.key"
        :title="m.tooltip"
      >
        <span class="ms-icon">{{ m.icon }}</span>
        <span class="ms-label" v-show="activeModule === m.key">{{ m.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, type Component } from 'vue'

// 懒加载原有模块（保持完整功能）
const Chat = defineAsyncComponent(() => import('./Chat.vue'))
const Companion = defineAsyncComponent(() => import('./Companion.vue'))

// 模块配置（AI对话为主功能，社交伴侣为次功能）
const modules = [
  { key: 'chat', icon: '🤖', label: 'AI 对话', tooltip: '星火助手 · AI 智能对话（主功能）' },
  { key: 'companion', icon: '👥', label: '社交', tooltip: '星火伴侣 · 好友 & 动态' },
]

const activeModule = ref('chat')

// 动态组件映射
const moduleMap: Record<string, Component> = {
  chat: markRaw(Chat),
  companion: markRaw(Companion),
}

const currentModule = computed(() => moduleMap[activeModule.value])
</script>

<style scoped>
.smart-chat {
  position: relative;
  height: calc(100vh - 72px);
  overflow: hidden;
}

/* 次功能切换器 — 右上角浮动胶囊 */
.module-switcher {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 20;
  display: flex;
  gap: 4px;
  padding: 3px;
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.ms-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.ms-pill:hover {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
}

.ms-pill.active {
  color: white;
  background: rgba(124, 58, 237, 0.25);
}

.ms-icon { font-size: 14px; }
.ms-label { font-size: 11px; }
</style>
