<template>
  <div class="smart-schedule">
    <!-- 页面顶部导航栏 — 清晰的段控制器 -->
    <div class="ss-header">
      <h1 class="ss-title">智能日程</h1>
      <div class="ss-segment">
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
    <div class="ss-content">
      <component :is="currentModule" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, type Component } from 'vue'

// 懒加载原有模块（保持完整功能）
const Schedule = defineAsyncComponent(() => import('./Schedule.vue'))
const Planner = defineAsyncComponent(() => import('./Planner.vue'))
const Tarot = defineAsyncComponent(() => import('./Tarot.vue'))

// 模块配置
const modules = [
  { key: 'calendar', icon: '📅', label: '日程日历' },
  { key: 'planner', icon: '⭐', label: '星火规划' },
  { key: 'tarot', icon: '🔮', label: '每日灵感' },
]

const activeModule = ref('calendar')

const moduleMap: Record<string, Component> = {
  calendar: markRaw(Schedule),
  planner: markRaw(Planner),
  tarot: markRaw(Tarot),
}

const currentModule = computed(() => moduleMap[activeModule.value])
</script>

<style scoped>
.smart-schedule {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  overflow: hidden;
}

/* 顶部导航栏 */
.ss-header {
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

.ss-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  white-space: nowrap;
}

/* 段控制器 — 清晰醒目 */
.ss-segment {
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
.ss-content {
  flex: 1;
  overflow: hidden;
}

/* 响应式 */
@media (max-width: 640px) {
  .ss-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 16px;
  }
  .ss-segment { width: 100%; }
  .seg-btn { flex: 1; justify-content: center; padding: 8px 10px; font-size: 12px; }
}
</style>
