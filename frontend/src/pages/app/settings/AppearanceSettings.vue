<template>
  <div class="section">
    <h2>外观与主题</h2>
    <p class="section-desc">自定义你的视觉体验，所有更改即时生效。</p>

    <!-- 主题模式 -->
    <div class="card">
      <div class="card-title">主题模式</div>
      <div class="option-group">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          class="option-card"
          :class="{ active: appearance.theme === opt.value }"
          @click="setTheme(opt.value)"
          type="button"
        >
          <span class="option-icon">{{ opt.icon }}</span>
          <span class="option-label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- 主题色 -->
    <div class="card">
      <div class="card-title">主题色</div>
      <div class="color-grid">
        <button
          v-for="color in colorPresets"
          :key="color.value"
          class="color-swatch"
          :class="{ active: appearance.primaryColor === color.value }"
          :style="{ background: color.value }"
          :title="color.label"
          @click="updateAppearance({ primaryColor: color.value })"
          type="button"
        ></button>
        <label class="color-swatch custom" title="自定义颜色">
          <input type="color" :value="appearance.primaryColor" @input="updateAppearance({ primaryColor: ($event.target as HTMLInputElement).value })" hidden />
          🎨
        </label>
      </div>
      <div class="color-preview" :style="{ borderColor: appearance.primaryColor }">
        <div class="preview-dot" :style="{ background: appearance.primaryColor }"></div>
        <span class="preview-label">当前主题色：{{ appearance.primaryColor }}</span>
      </div>
    </div>

    <!-- 字体设置 -->
    <div class="card">
      <div class="card-title">字体设置</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">字体大小</span>
          <span class="setting-value">{{ appearance.fontSize }}px</span>
        </div>
        <input type="range" min="12" max="20" step="1" :value="appearance.fontSize"
          @input="updateAppearance({ fontSize: Number(($event.target as HTMLInputElement).value) })" class="slider" />
      </div>
      <div class="font-preview" :style="{ fontSize: appearance.fontSize + 'px' }">
        这是 {{ appearance.fontSize }}px 字体的预览效果
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">字体</span>
        </div>
        <SparkSelect
          :model-value="appearance.fontFamily"
          :options="fontOptions"
          @update:model-value="updateAppearance({ fontFamily: String($event) })"
        />
      </div>
    </div>

    <!-- 动效与粒子 -->
    <div class="card">
      <div class="card-title">动效与粒子</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">动画效果</span>
          <span class="setting-hint">关闭后所有过渡动画将被禁用</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="appearance.animationEnabled"
            @change="updateAppearance({ animationEnabled: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">粒子背景</span>
          <span class="setting-hint">宇宙星空动画背景（关闭可提升性能）</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="appearance.particleEffect"
            @change="updateAppearance({ particleEffect: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- 布局设置 -->
    <div class="card">
      <div class="card-title">布局设置</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">紧凑模式</span>
          <span class="setting-hint">减少间距，显示更多内容</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="appearance.compactMode"
            @change="updateAppearance({ compactMode: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info"><span class="setting-label">内容宽度</span></div>
        <SparkSelect
          :model-value="appearance.contentWidth"
          :options="contentWidthOptions"
          @update:model-value="updateAppearance({ contentWidth: String($event) as 'narrow' | 'medium' | 'wide' | 'auto' })"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info"><span class="setting-label">卡片样式</span></div>
        <SparkSelect
          :model-value="appearance.cardStyle"
          :options="cardStyleOptions"
          @update:model-value="updateAppearance({ cardStyle: String($event) as 'rounded' | 'sharp' })"
        />
      </div>
    </div>

    <!-- 重置 -->
    <button class="btn-reset" @click="resetAppearance" type="button">🔄 恢复默认外观设置</button>
  </div>
</template>

<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import SparkSelect from '../../../components/SparkSelect.vue'

const { appearance, updateAppearance, resetSection } = useSettings()

const themeOptions = [
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'auto', label: '跟随系统', icon: '💻' },
]

const colorPresets = [
  { value: '#4F8EF7', label: '星火蓝' },
  { value: '#8B5CF6', label: '星辰紫' },
  { value: '#10B981', label: '自然绿' },
  { value: '#F97316', label: '活力橙' },
  { value: '#F43F5E', label: '热情红' },
  { value: '#06B6D4', label: '天际青' },
  { value: '#EC4899', label: '浪漫粉' },
  { value: '#EAB308', label: '阳光黄' },
]

const fontOptions = [
  { value: 'system-ui', label: '系统默认' },
  { value: "'PingFang SC', sans-serif", label: '苹方' },
  { value: "'Source Han Sans', sans-serif", label: '思源黑体' },
  { value: 'Inter, sans-serif', label: 'Inter' },
]

const contentWidthOptions = [
  { value: 'narrow', label: '窄' },
  { value: 'medium', label: '中' },
  { value: 'wide', label: '宽' },
  { value: 'auto', label: '自适应' },
]

const cardStyleOptions = [
  { value: 'rounded', label: '圆角' },
  { value: 'sharp', label: '直角' },
]

/** 主题切换 — 使用增量更新，避免v-model引用同一对象导致无效 */
function setTheme(theme: string) {
  updateAppearance({ theme: theme as 'dark' | 'light' | 'auto' })
}

function resetAppearance() {
  if (confirm('确定要恢复默认外观设置吗？')) {
    resetSection('appearance')
  }
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { font-size: 20px; font-weight: 800; color: var(--color-text-primary); margin: 0; }
.section-desc { font-size: 13px; color: var(--color-text-muted); margin: -8px 0 4px; }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 20px; }

/* 主题选项卡 — 改用 button 替代 label+radio，避免 v-model 同引用问题 */
.option-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.option-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 12px; border-radius: var(--radius-md); background: var(--color-bg-card); border: 2px solid var(--color-border); cursor: pointer; transition: all 0.2s; }
.option-card:hover { border-color: var(--color-border-hover); }
.option-card.active { border-color: var(--theme-color); background: rgba(79,142,247,0.06); }
.option-icon { font-size: 24px; }
.option-label { font-size: 13px; color: var(--color-text-secondary); font-weight: 600; }

/* 颜色选择 */
.color-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.color-swatch { width: 40px; height: 40px; border-radius: 12px; border: 3px solid transparent; cursor: pointer; transition: all 0.2s; }
.color-swatch.active { border-color: var(--color-text-primary); transform: scale(1.15); box-shadow: 0 0 16px rgba(255,255,255,0.2); }
.color-swatch.custom { background: var(--color-bg-card-hover); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.color-preview { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid; margin-top: 4px; }
.preview-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.preview-label { font-size: 12px; color: var(--color-text-muted); font-family: monospace; }

/* 字体预览 */
.font-preview { padding: 12px 16px; border-radius: var(--radius-md); background: var(--color-bg-card-hover); color: var(--color-text-secondary); margin: 8px 0 12px; border: 1px solid var(--color-border); }

/* 设置行 */
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.setting-row:last-child { border-bottom: none; }
.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: 14px; color: var(--color-text-primary); font-weight: 500; }
.setting-value { font-size: 12px; color: var(--theme-color); font-weight: 700; }
.setting-hint { font-size: 12px; color: var(--color-text-muted); }

/* Toggle 开关 */
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle input { display: none; }
.toggle-slider { position: absolute; inset: 0; background: var(--color-bg-card-hover); border-radius: 24px; cursor: pointer; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: var(--color-text-muted); border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: var(--theme-color); opacity: 0.6; }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); background: white; }

.slider { width: 160px; accent-color: var(--theme-color); }

/* 重置按钮 */
.btn-reset { background: none; border: 1px solid var(--color-border); border-radius: 12px; padding: 10px 20px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; transition: all 0.2s; align-self: flex-start; }
.btn-reset:hover { border-color: rgba(244,63,94,0.3); color: #f43f5e; }
</style>
