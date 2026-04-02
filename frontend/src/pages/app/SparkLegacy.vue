<template>
  <div class="spark-legacy">
    <!-- 页面顶部导航栏 — 清晰的段控制器 -->
    <div class="sl-header">
      <h1 class="sl-title">星火传承</h1>
      <p class="sl-subtitle">不论身份，任何人都可以分享经验、留下寄语</p>
      <div class="sl-segment">
        <button
          v-for="m in modules" :key="m.key"
          class="seg-btn" :class="{ active: activeModule === m.key }"
          @click="activeModule = m.key"
        >
          <span class="seg-icon">{{ m.icon }}</span>
          <span class="seg-label">{{ m.label }}</span>
        </button>
      </div>
    </div>

    <!-- 子模块内容区（全屏） -->
    <div class="sl-content">
      <component :is="currentModule" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, type Component } from 'vue'

// 懒加载：星火寄语 + 经验分享（原学长分享，现通用化）
const SparkMessages = defineAsyncComponent(() => import('./SparkMessages.vue'))
const Mentors = defineAsyncComponent(() => import('./Mentors.vue'))

// 模块配置
// 寄语：任何身份都可以写（学生/教师/职场人/博士...）
// 经验分享：原"学长分享"扩展为通用经验传递（不限身份）
const modules = [
  { key: 'messages', icon: '⭐', label: '星火寄语' },
  { key: 'experience', icon: '🎓', label: '经验分享' },
]

const activeModule = ref('messages')

const moduleMap: Record<string, Component> = {
  messages: markRaw(SparkMessages),
  experience: markRaw(Mentors),
}

const currentModule = computed(() => moduleMap[activeModule.value])
</script>

<style scoped>
.spark-legacy {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  overflow: hidden;
}

/* 顶部导航栏 */
.sl-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(10, 8, 20, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
  gap: 6px;
}

.sl-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  background: linear-gradient(135deg, #8b5cf6, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sl-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0 0 4px;
}

/* 段控制器 */
.sl-segment {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.seg-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.seg-btn:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.04);
}

.seg-btn.active {
  color: white;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(245, 158, 11, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
}

.seg-icon { font-size: 16px; }

/* 内容区 */
.sl-content {
  flex: 1;
  overflow: auto;
}

/* 响应式 */
@media (max-width: 640px) {
  .sl-header { padding: 14px 16px 10px; }
  .sl-segment { width: 100%; }
  .seg-btn { flex: 1; justify-content: center; padding: 8px 10px; font-size: 12px; }
}
</style>
