<template>
  <div class="xiaoyu-wrap">
    <Transition name="xiaoyu-card">
      <div v-if="expanded" class="xiaoyu-card glass-card">
        <div class="xy-header">
          <h3 class="xy-title">星火小宇</h3>
          <div class="xy-header-actions">
            <button class="xy-collapse" @click="expanded = false" title="收起">—</button>
            <button class="xy-close" @click="expanded = false; hidden = true" title="关闭">×</button>
          </div>
        </div>

        <div class="xy-mascot-area">
          <div class="xy-mascot-glow"></div>
          <SparkMascot />
        </div>

        <div class="xy-greeting">
          <h4>👋 你好！我是星火小宇</h4>
          <p>你的专属学习助手，随时为你效劳～</p>
        </div>

        <div class="xy-mood-row" v-if="moodText">
          <span class="xy-mood-label">{{ moodIcon }}</span>
          <span class="xy-mood-text">{{ moodText }}</span>
        </div>

        <div class="xy-sections">
          <div class="xy-section">
            <span class="xy-section-title">快捷操作</span>
            <div class="xy-quick-grid">
              <button v-for="action in quickActions" :key="action.label" class="xy-quick-btn" @click="$emit('action', action.prompt)">
                <span class="xy-qb-icon">{{ action.icon }}</span>
                <span class="xy-qb-text">{{ action.label }}</span>
              </button>
            </div>
          </div>

          <div class="xy-section" v-if="recentItems?.length">
            <span class="xy-section-title">最近使用</span>
            <div class="xy-recent-list">
              <button v-for="item in recentItems.slice(0, 4)" :key="item.text" class="xy-recent-item" @click="$emit('action', item.text)">
                <span class="xy-ri-icon">{{ item.icon }}</span>
                <span class="xy-ri-text">{{ item.text }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="xy-input-area">
          <input v-model="inputText" class="xy-input" placeholder="问小宇，或输入你的问题..." @keydown.enter.prevent="sendInput" />
          <button class="xy-send" :disabled="!inputText.trim()" @click="sendInput">›</button>
        </div>
      </div>
    </Transition>

    <Transition name="xiaoyu-fab">
      <button v-if="!expanded && !hidden" class="xiaoyu-fab" @click="expanded = true" title="打开星火小宇">
        <div class="fab-glow"></div>
        <svg class="fab-bot" viewBox="0 0 40 48" fill="none">
          <rect x="8" y="10" width="24" height="20" rx="10" fill="url(#fabHead)"/>
          <ellipse cx="16" cy="19" rx="3" ry="3" fill="white"/>
          <ellipse cx="24" cy="19" rx="3" ry="3" fill="white"/>
          <circle cx="16" cy="19" r="1.5" fill="#1a1035"/>
          <circle cx="24" cy="19" r="1.5" fill="#1a1035"/>
          <rect x="12" y="32" width="16" height="10" rx="6" fill="url(#fabBody)"/>
          <circle cx="20" cy="36" r="2" fill="#a78bfa" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
          </circle>
          <defs>
            <linearGradient id="fabHead" x1="8" y1="10" x2="32" y2="30"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>
            <linearGradient id="fabBody" x1="12" y1="32" x2="28" y2="42"><stop stop-color="#6d28d9"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>
          </defs>
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SparkMascot from './SparkMascot.vue'

defineProps<{
  moodIcon?: string
  moodText?: string
  recentItems?: { icon: string; text: string }[]
}>()

const emit = defineEmits<{
  action: [prompt: string]
}>()

const expanded = ref(false)
const hidden = ref(false)
const inputText = ref('')

const quickActions = [
  { icon: '🎯', label: '开始专注', prompt: '帮我开始一个专注学习session' },
  { icon: '📝', label: '总结笔记', prompt: '帮我总结最近的学习笔记' },
  { icon: '📅', label: '整理日程', prompt: '帮我整理今天的日程安排' },
  { icon: '📖', label: '制定复习计划', prompt: '帮我制定一份复习计划' },
  { icon: '❓', label: '问我任何问题', prompt: '' },
]

function sendInput() {
  if (!inputText.value.trim()) return
  emit('action', inputText.value.trim())
  inputText.value = ''
  expanded.value = false
}
</script>

<style scoped>
.xiaoyu-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 100; }

.glass-card {
  background: linear-gradient(160deg, rgba(15, 12, 41, 0.92), rgba(10, 8, 28, 0.95));
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 20px;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(139, 92, 246, 0.05);
}

.xiaoyu-card {
  width: 340px; max-height: 80vh; overflow-y: auto;
  display: flex; flex-direction: column;
  transform-origin: bottom right;
}
.xiaoyu-card::-webkit-scrollbar { width: 0; }

.xy-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px 10px; }
.xy-title { font-size: 17px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #e0e7ff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.xy-header-actions { display: flex; gap: 6px; }
.xy-collapse, .xy-close {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4);
  font-size: 16px; cursor: pointer; width: 30px; height: 30px;
  border-radius: 10px; transition: all 0.2s;
}
.xy-collapse:hover, .xy-close:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255, 255, 255, 0.1); }

.xy-mascot-area { display: flex; justify-content: center; padding: 10px 0; position: relative; animation: xyFloat 3s ease-in-out infinite; }
@keyframes xyFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.xy-mascot-glow {
  position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 50px;
  background: radial-gradient(ellipse, rgba(139,92,246,0.35) 0%, transparent 70%);
  animation: xyGlowPulse 3s ease-in-out infinite;
}
@keyframes xyGlowPulse { 0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.1); } }

.xy-greeting { text-align: center; padding: 0 20px 14px; }
.xy-greeting h4 { font-size: 16px; font-weight: 700; color: white; margin: 0 0 5px; }
.xy-greeting p { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; }

.xy-mood-row {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px 18px 12px; font-size: 12px; color: rgba(255,255,255,0.5);
}
.xy-mood-label { font-size: 14px; }

.xy-sections { padding: 0 14px; }
.xy-section { margin-bottom: 14px; }
.xy-section-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; padding: 0 4px; display: block; margin-bottom: 8px; }

.xy-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.xy-quick-btn {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.03)); border: 1px solid rgba(139,92,246,0.1);
  border-radius: 12px; padding: 11px 14px;
  color: rgba(255,255,255,0.75); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.25s cubic-bezier(0.4,0,0.2,1); text-align: left;
}
.xy-quick-btn:hover { background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.08)); border-color: rgba(139,92,246,0.3); color: white; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(139,92,246,0.1); }
.xy-qb-icon { font-size: 17px; }

.xy-recent-list { display: flex; flex-direction: column; gap: 4px; }
.xy-recent-item {
  display: flex; align-items: center; gap: 8px;
  background: none; border: none; padding: 6px 8px; border-radius: 8px;
  color: rgba(255,255,255,0.55); font-size: 12px; cursor: pointer;
  text-align: left; transition: all 0.15s;
}
.xy-recent-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); }
.xy-ri-icon { font-size: 14px; }
.xy-ri-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.xy-input-area { display: flex; gap: 8px; padding: 14px 16px 16px; border-top: 1px solid rgba(139,92,246,0.06); }
.xy-input {
  flex: 1; background: rgba(20,16,48,0.5); border: 1px solid rgba(139,92,246,0.1);
  border-radius: 12px; padding: 9px 14px; color: rgba(255,255,255,0.9);
  font-size: 12px; outline: none; transition: all 0.25s;
}
.xy-input:focus { border-color: rgba(139,92,246,0.35); box-shadow: 0 0 0 3px rgba(139,92,246,0.06); }
.xy-input::placeholder { color: rgba(255,255,255,0.22); }
.xy-send {
  background: linear-gradient(135deg, #7c3aed, #3b82f6); border: none;
  color: white; width: 36px; height: 36px; border-radius: 12px;
  font-size: 18px; cursor: pointer; transition: all 0.25s;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(124,58,237,0.25);
}
.xy-send:disabled { opacity: 0.25; cursor: not-allowed; box-shadow: none; }
.xy-send:not(:disabled):hover { box-shadow: 0 4px 20px rgba(124,58,237,0.45); transform: scale(1.05); }

.xiaoyu-fab {
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #4c1d95);
  border: 2px solid rgba(139,92,246,0.35);
  cursor: pointer; position: relative;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 32px rgba(124,58,237,0.35);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fabFloat 3s ease-in-out infinite;
}
@keyframes fabFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.xiaoyu-fab:hover { transform: scale(1.1) translateY(-2px); box-shadow: 0 8px 40px rgba(124,58,237,0.55); animation-play-state: paused; }
.fab-glow {
  position: absolute; inset: -6px; border-radius: 50%;
  background: radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%);
  animation: fabPulse 3s ease-in-out infinite;
}
@keyframes fabPulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.9; } }
.fab-bot { width: 34px; height: 40px; z-index: 1; }

.xiaoyu-card-enter-active { animation: xyOpen 280ms cubic-bezier(0.16,1,0.3,1); }
.xiaoyu-card-leave-active { animation: xyOpen 200ms ease reverse; }
@keyframes xyOpen { from { opacity: 0; transform: scale(0.88) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.xiaoyu-fab-enter-active { animation: fabIn 240ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.xiaoyu-fab-leave-active { animation: fabIn 180ms ease reverse; }
@keyframes fabIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }

/* 快捷操作按钮 stagger 入场 */
.xy-quick-btn {
  animation: xyBtnIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
}
.xy-quick-btn:nth-child(1) { animation-delay: 80ms; }
.xy-quick-btn:nth-child(2) { animation-delay: 140ms; }
.xy-quick-btn:nth-child(3) { animation-delay: 200ms; }
.xy-quick-btn:nth-child(4) { animation-delay: 260ms; }
.xy-quick-btn:nth-child(5) { animation-delay: 320ms; }
@keyframes xyBtnIn {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 快捷按钮 active 按下效果 */
.xy-quick-btn:active {
  transform: scale(0.96) !important;
  transition-duration: 0.08s;
}

/* 输入区域聚焦时底部光线 */
.xy-input-area {
  position: relative;
}
.xy-input-area::before {
  content: '';
  position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0) 0%, rgba(139,92,246,0.4) 50%, rgba(139,92,246,0) 100%);
  opacity: 0; transition: opacity 0.3s;
}
.xy-input-area:focus-within::before { opacity: 1; }

/* FAB 呼吸光圈 */
.xiaoyu-fab::after {
  content: '';
  position: absolute; inset: -3px; border-radius: 50%;
  border: 1.5px solid rgba(139,92,246,0.3);
  animation: fabRingBreath 2.5s ease-in-out infinite;
}
@keyframes fabRingBreath {
  0%,100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 0; }
}

/* 最近使用列表项 stagger */
.xy-recent-item {
  animation: xyRecentIn 0.3s ease both;
}
.xy-recent-item:nth-child(1) { animation-delay: 180ms; }
.xy-recent-item:nth-child(2) { animation-delay: 240ms; }
.xy-recent-item:nth-child(3) { animation-delay: 300ms; }
.xy-recent-item:nth-child(4) { animation-delay: 360ms; }
@keyframes xyRecentIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 问候语淡入 */
.xy-greeting {
  animation: xyGreetIn 0.45s ease 120ms both;
}
@keyframes xyGreetIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .xy-mascot-area { animation: none; }
  .xy-mascot-glow { animation: none; }
  .xiaoyu-fab { animation: none; }
  .fab-glow { animation: none; }
  .xiaoyu-fab::after { animation: none; }
  .xiaoyu-card-enter-active, .xiaoyu-card-leave-active { animation-duration: 0.01ms; }
  .xiaoyu-fab-enter-active, .xiaoyu-fab-leave-active { animation-duration: 0.01ms; }
  .xy-quick-btn { animation: none !important; }
  .xy-recent-item { animation: none !important; }
  .xy-greeting { animation: none !important; }
}
</style>
