<template>
  <div class="smart-schedule">
    <!-- 子模块内容区 -->
    <div class="ss-content">
      <Transition name="ss-module-fade" mode="out-in">
        <component :is="currentModule" :key="activeModule" :visual-fixture="visualFixture" @back-to-calendar="backToCalendar" />
      </Transition>
    </div>

    <!-- 辅助模块侧滑面板（仅规划使用） -->
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

    <!-- 底部浮动辅助入口 -->
    <Transition name="fab-fade">
      <div v-if="activeModule === 'calendar'" class="ss-aux-fab">
        <button
          class="ss-aux-btn planner-btn"
          :class="{ active: showPanel && panelKey === 'planner' }"
          title="星火规划"
          @click="togglePanel('planner')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span class="ss-aux-label">规划</span>
        </button>
        <button
          class="ss-aux-btn tarot-btn"
          title="星火卡罗牌"
          @click="switchToTarot"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <span class="ss-aux-label">卡罗牌</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, markRaw, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 懒加载原有模块（保持完整功能）
const Schedule = defineAsyncComponent(() => import('./Schedule.vue'))
const Planner = defineAsyncComponent(() => import('./Planner.vue'))
const Tarot = defineAsyncComponent(() => import('./Tarot.vue'))

withDefaults(defineProps<{
  /** 开发视觉 fixture：透传给日历模块 */
  visualFixture?: boolean
}>(), { visualFixture: false })

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

const currentModule = computed(() => moduleMap[activeModule.value] || moduleMap['calendar'])

const showPanel = ref(false)
const panelKey = ref<'planner'>('planner')
const panelSide = ref('right')

const panelTitle = computed(() => '⭐ 星火规划')
const panelModule = computed(() => markRaw(Planner))

function togglePanel(key: 'planner') {
  if (showPanel.value && panelKey.value === key) {
    showPanel.value = false
  } else {
    panelKey.value = key
    showPanel.value = true
  }
}

function switchToTarot() {
  showPanel.value = false
  activeModule.value = 'tarot'
}

function backToCalendar() {
  activeModule.value = 'calendar'
}

watch(() => route.query.module, (value) => {
  if (typeof value === 'string' && allowedModules.has(value) && value !== activeModule.value) {
    if (value === 'tarot') {
      switchToTarot()
    } else if (value === 'planner') {
      togglePanel('planner')
    } else {
      backToCalendar()
    }
  }
})

watch(activeModule, (value) => {
  if (route.query.module === value) return
  router.replace({
    query: { ...route.query, module: value },
  })
})

if (routeModule === 'tarot') {
  activeModule.value = 'tarot'
} else if (routeModule === 'planner') {
  panelKey.value = 'planner'
  showPanel.value = true
}

// 深层路由参数透传：tab/goalId 等由面板组件自行读取 route.query
// 例如 ?module=planner&tab=goals&goalId=xxx 会打开规划面板，面板内部按 tab/goalId 定位
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

/* ===== 底部浮动辅助入口 ===== */
.ss-aux-fab {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  gap: 6px;
  z-index: 100;
  padding: 5px;
  background: linear-gradient(135deg, rgba(15, 12, 30, 0.85), rgba(20, 16, 40, 0.85));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.08);
  border-radius: 18px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.ss-aux-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.ss-aux-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
}

.ss-aux-btn.planner-btn:hover,
.ss-aux-btn.planner-btn.active {
  border-color: rgba(139, 92, 246, 0.25);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(99, 102, 241, 0.08));
  color: #c4b5fd;
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.15);
}

.ss-aux-btn.tarot-btn:hover,
.ss-aux-btn.tarot-btn.active {
  border-color: rgba(251, 191, 36, 0.25);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 197, 94, 0.06));
  color: #fbbf24;
  box-shadow: 0 2px 12px rgba(251, 191, 36, 0.12);
}

.ss-aux-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ===== 侧滑面板 ===== */
.ss-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}

.ss-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 85vw);
  height: 100vh;
  background: linear-gradient(180deg, rgba(14, 11, 28, 0.99), rgba(10, 8, 20, 0.99));
  border-left: 1px solid rgba(139, 92, 246, 0.06);
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 48px rgba(0, 0, 0, 0.55), -2px 0 0 rgba(139, 92, 246, 0.04);
  overflow: hidden;
}

.ss-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.06);
  flex-shrink: 0;
  background: rgba(139, 92, 246, 0.02);
}

.ss-panel-title {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #c4b5fd, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.ss-panel-close {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.4);
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ss-panel-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
  border-color: rgba(255, 255, 255, 0.1);
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

/* fab 过渡 */
.fab-fade-enter-active, .fab-fade-leave-active { transition: all 0.3s ease }
.fab-fade-enter-from, .fab-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px) }

/* 模块切换淡入 */
.ss-module-fade-enter-active { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
.ss-module-fade-leave-active { transition: opacity 0.15s ease-in, transform 0.15s ease-in; }
.ss-module-fade-enter-from { opacity: 0; transform: translateY(8px); }
.ss-module-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* 桌面宽屏时日历 hero 已内置规划/卡罗牌入口，隐藏底部浮动入口避免重复 */
@media (min-width: 1281px) {
  .ss-aux-fab { display: none; }
}

/* 响应式 */
@media (max-width: 640px) {
  .ss-aux-fab {
    bottom: 16px;
    padding: 4px;
    gap: 4px;
  }
  .ss-aux-btn {
    padding: 7px 12px;
  }
  .ss-aux-label { font-size: 11px; }
  .ss-panel { width: 100vw; }
}
</style>
