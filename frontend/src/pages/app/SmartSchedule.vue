<template>
  <div class="smart-schedule">
    <!-- 子模块内容区 -->
    <div class="ss-content">
      <component :is="currentModule" />
    </div>

    <!-- 辅助模块侧滑面板 -->
    <Transition name="panel-slide">
      <div v-if="showPanel" class="ss-panel-overlay" @click.self="showPanel = false">
        <div class="ss-panel" :class="panelSide">
          <div class="ss-panel-header">
            <h3 class="ss-panel-title">{{ panelTitle }}</h3>
            <button class="ss-panel-close" @click="showPanel = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="ss-panel-body">
            <component :is="panelModule" />
          </div>
        </div>
      </div>
    </Transition>

    <!-- 右侧浮动辅助入口 -->
    <div class="ss-aux-fab">
      <button
        class="ss-aux-btn planner-btn"
        :class="{ active: showPanel && panelKey === 'planner' }"
        title="星火规划"
        @click="togglePanel('planner')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span class="ss-aux-label">规划</span>
      </button>
      <button
        class="ss-aux-btn tarot-btn"
        :class="{ active: showPanel && panelKey === 'tarot' }"
        title="每日灵感"
        @click="togglePanel('tarot')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <span class="ss-aux-label">灵感</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 懒加载原有模块（保持完整功能）
const Schedule = defineAsyncComponent(() => import('./Schedule.vue'))
const Planner = defineAsyncComponent(() => import('./Planner.vue'))
const Tarot = defineAsyncComponent(() => import('./Tarot.vue'))

const route = useRoute()
const router = useRouter()

// 主视图始终是日程日历
const allowedModules = new Set(['calendar', 'planner', 'tarot'])
const routeModule = typeof route.query.module === 'string' ? route.query.module : ''
const activeModule = ref(allowedModules.has(routeModule) ? routeModule : 'calendar')

const moduleMap: Record<string, Component> = {
  calendar: markRaw(Schedule),
  planner: markRaw(Planner),
  tarot: markRaw(Tarot),
}

// 主视图始终为日程日历
const currentModule = computed(() => moduleMap['calendar'])

// 辅助面板状态
const showPanel = ref(false)
const panelKey = ref<'planner' | 'tarot'>('planner')
const panelSide = ref('right')

const panelTitle = computed(() => panelKey.value === 'planner' ? '⭐ 星火规划' : '🔮 每日灵感')
const panelModule = computed(() => panelKey.value === 'planner' ? markRaw(Planner) : markRaw(Tarot))

function togglePanel(key: 'planner' | 'tarot') {
  if (showPanel.value && panelKey.value === key) {
    showPanel.value = false
    activeModule.value = 'calendar'
  } else {
    panelKey.value = key
    showPanel.value = true
    activeModule.value = key
  }
}

// URL query 参数兼容
watch(() => route.query.module, (value) => {
  if (typeof value === 'string' && allowedModules.has(value) && value !== activeModule.value) {
    if (value === 'calendar') {
      showPanel.value = false
      activeModule.value = 'calendar'
    } else {
      togglePanel(value as 'planner' | 'tarot')
    }
  }
})

watch(activeModule, (value) => {
  if (route.query.module === value) return
  router.replace({
    query: {
      ...route.query,
      module: value,
    },
  })
})

// 如果 URL 指定了 planner/tarot，初始化时打开面板
if (routeModule === 'planner' || routeModule === 'tarot') {
  panelKey.value = routeModule as 'planner' | 'tarot'
  showPanel.value = true
}
</script>

<style scoped>
.smart-schedule {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  overflow: hidden;
  position: relative;
}

/* 内容区：主日程视图占满 */
.ss-content {
  flex: 1;
  overflow: hidden;
}

/* ===== 右侧浮动辅助入口 ===== */
.ss-aux-fab {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.ss-aux-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(15, 12, 30, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  min-width: 52px;
}

.ss-aux-btn:hover {
  transform: scale(1.06);
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.ss-aux-btn.planner-btn:hover,
.ss-aux-btn.planner-btn.active {
  border-color: rgba(139, 92, 246, 0.35);
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2);
}

.ss-aux-btn.tarot-btn:hover,
.ss-aux-btn.tarot-btn.active {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.15);
}

.ss-aux-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* ===== 侧滑面板 ===== */
.ss-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.ss-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 85vw);
  height: 100vh;
  background: rgba(12, 10, 24, 0.98);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.ss-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.ss-panel-title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.ss-panel-close {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.5);
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ss-panel-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.ss-panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 面板滑入动画 */
.panel-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-slide-enter-from .ss-panel,
.panel-slide-leave-to .ss-panel {
  transform: translateX(100%);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .ss-aux-fab {
    right: 10px;
    gap: 6px;
  }
  .ss-aux-btn {
    padding: 8px 6px;
    min-width: 44px;
  }
  .ss-aux-label { font-size: 9px; }
  .ss-panel { width: 100vw; }
}
</style>
