<template>
  <!-- 空状态引导：模板一键创建 -->
  <div class="planner-empty">
    <div class="em-visual">
      <div class="em-orbit">
        <div class="em-ring r1"></div>
        <div class="em-ring r2"></div>
        <div class="em-core">✦</div>
      </div>
    </div>
    <div class="em-text">
      <p>"每一个伟大的征程，</p>
      <p>都始于第一颗被点亮的星"</p>
    </div>
    <button class="em-cta" @click="$emit('create')">
      🚀 创建自定义目标
    </button>
    <div class="em-tmpl">
      <p class="em-hint">💡 或一键启动热门计划</p>
      <div class="em-grid">
        <button v-for="t in templates" :key="t.title" class="em-chip" @click="$emit('template', t)">
          <span class="em-icon">{{ t.icon }}</span>
          <div class="em-chip-info">
            <span class="em-name">{{ t.title }}</span>
            <span class="em-desc">{{ t.days }}天 · {{ t.tasks.length }}个任务</span>
          </div>
          <span class="em-arrow">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GOAL_TEMPLATES } from '../../composables/usePlanner'

defineEmits<{
  create: []
  template: [tmpl: typeof GOAL_TEMPLATES[number]]
}>()

const templates = GOAL_TEMPLATES
</script>

<style scoped>
.planner-empty{display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:16px}
.em-visual{position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center}
.em-orbit{position:relative;width:100%;height:100%}
.em-ring{position:absolute;border-radius:50%;border:1px solid rgba(139,92,246,.07)}
.em-ring.r1{inset:0;animation:emR 12s linear infinite}
.em-ring.r2{inset:18px;border-style:dashed;border-color:rgba(245,197,94,.05);animation:emR 8s linear infinite reverse}
@keyframes emR{to{transform:rotate(360deg)}}
.em-core{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:rgba(139,92,246,.18);animation:emP 3s ease-in-out infinite}
@keyframes emP{0%,100%{opacity:.12;transform:translate(-50%,-50%) scale(.9)}50%{opacity:.3;transform:translate(-50%,-50%) scale(1.1)}}
.em-text{text-align:center}
.em-text p{font-size:13px;color:rgba(255,255,255,.25);font-weight:300;letter-spacing:1px;margin:0;line-height:1.8}
.em-cta{padding:10px 24px;border-radius:20px;border:1.5px solid rgba(139,92,246,.18);background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(245,197,94,.05));color:rgba(255,255,255,.75);font-size:13px;font-weight:600;cursor:pointer;transition:all .3s}
.em-cta:hover{background:linear-gradient(135deg,rgba(139,92,246,.18),rgba(245,197,94,.1));box-shadow:0 0 20px rgba(139,92,246,.12)}
.em-tmpl{width:100%}
.em-hint{font-size:11px;color:rgba(255,255,255,.18);text-align:center;margin:0 0 8px}
.em-grid{display:flex;flex-direction:column;gap:6px}
.em-chip{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);cursor:pointer;transition:all .2s;text-align:left;width:100%}
.em-chip:hover{background:rgba(139,92,246,.05);border-color:rgba(139,92,246,.1)}
.em-icon{font-size:20px;flex-shrink:0}
.em-chip-info{flex:1;display:flex;flex-direction:column;gap:1px}
.em-name{font-size:13px;color:rgba(255,255,255,.55);font-weight:500}
.em-desc{font-size:10px;color:rgba(255,255,255,.2)}
.em-arrow{font-size:14px;color:rgba(139,92,246,.3);flex-shrink:0}
</style>
