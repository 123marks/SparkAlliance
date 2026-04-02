<template>
  <div class="learn-hub">
    <!-- 页面顶部导航栏 — 清晰的段控制器 -->
    <div class="lh-header">
      <h1 class="lh-title">学习中心</h1>
      <div class="lh-segment">
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
    <div class="lh-content">
      <component :is="currentModule" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, type Component } from 'vue'

// 懒加载：自习室 + 学习资源（学长分享已合并到星火传承）
const StudyRoom = defineAsyncComponent(() => import('./StudyRoom.vue'))
const Resources = defineAsyncComponent(() => import('./Resources.vue'))

// 模块配置（只有2项：自习室 + 学习资源）
const modules = [
  { key: 'study', icon: '🏫', label: '星火自习室' },
  { key: 'resources', icon: '📚', label: '学习资源' },
]

const activeModule = ref('study')

const moduleMap: Record<string, Component> = {
  study: markRaw(StudyRoom),
  resources: markRaw(Resources),
}

const currentModule = computed(() => moduleMap[activeModule.value])
</script>

<style scoped>
.learn-hub {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  overflow: hidden;
}

/* 顶部导航栏 */
.lh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(10, 8, 20, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.lh-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  white-space: nowrap;
}

/* 段控制器 */
.lh-segment {
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
  padding: 8px 16px;
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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
}

.seg-icon { font-size: 16px; }

/* 内容区 */
.lh-content {
  flex: 1;
  overflow: hidden;
}

/* 响应式 */
@media (max-width: 640px) {
  .lh-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 16px;
  }
  .lh-segment { width: 100%; }
  .seg-btn { flex: 1; justify-content: center; padding: 8px 10px; font-size: 12px; }
}
</style>
