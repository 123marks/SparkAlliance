<template>
  <div class="section">
    <h2>功能设置</h2>
    <p class="section-desc">配置 AI 助手和日程模块的默认行为。</p>

    <div class="card">
      <div class="card-title">AI 助手</div>
      <div class="field-grid">
        <div class="field">
          <label>默认模型</label>
          <input :value="features.ai.defaultModel" type="text" placeholder="例如 gpt-4.1 / gpt-5-mini" @change="updateAi('defaultModel', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="field">
          <label>上下文长度</label>
          <SparkSelect
            :model-value="features.ai.contextLength"
            :options="contextLengthOptions"
            @update:model-value="updateAi('contextLength', String($event) as FeaturesData['ai']['contextLength'])"
          />
        </div>
        <div class="field">
          <label>创造性 (Temperature)</label>
          <input :value="features.ai.temperature" type="range" min="0" max="2" step="0.1" @input="updateAi('temperature', Number(($event.target as HTMLInputElement).value))" />
          <span class="field-hint">当前值 {{ features.ai.temperature.toFixed(1) }}（越高越有创意，越低越稳定）</span>
        </div>
        <div class="field switch-field">
          <label>流式输出</label>
          <label class="toggle">
            <input type="checkbox" :checked="features.ai.streamOutput" @change="updateAi('streamOutput', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">日程偏好</div>
      <div class="field-grid">
        <div class="field">
          <label>默认视图</label>
          <SparkSelect
            :model-value="features.schedule.defaultView"
            :options="viewOptions"
            @update:model-value="updateSchedule('defaultView', String($event) as FeaturesData['schedule']['defaultView'])"
          />
        </div>
        <div class="field">
          <label>时间格式</label>
          <SparkSelect
            :model-value="features.schedule.timeFormat"
            :options="timeFormatOptions"
            @update:model-value="updateSchedule('timeFormat', String($event) as FeaturesData['schedule']['timeFormat'])"
          />
        </div>
        <div class="field">
          <label>每周起始日</label>
          <SparkSelect
            :model-value="features.schedule.weekStart"
            :options="weekStartOptions"
            @update:model-value="updateSchedule('weekStart', Number($event) as 0 | 1)"
          />
        </div>
        <div class="field">
          <label>默认提醒</label>
          <SparkSelect
            :model-value="features.schedule.defaultReminder"
            :options="reminderOptions"
            @update:model-value="updateSchedule('defaultReminder', Number($event))"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import type { FeaturesData } from '../../../types/settings'
import SparkSelect from '../../../components/SparkSelect.vue'

const { features, updateFeatures } = useSettings()

const contextLengthOptions = [
  { value: 'short', label: '短（省 Token）' },
  { value: 'medium', label: '中（平衡）' },
  { value: 'long', label: '长（深度对话）' },
]

const viewOptions = [
  { value: 'day', label: '日视图' },
  { value: 'week', label: '周视图' },
  { value: 'month', label: '月视图' },
]

const timeFormatOptions = [
  { value: '24h', label: '24 小时制' },
  { value: '12h', label: '12 小时制' },
]

const weekStartOptions = [
  { value: 1, label: '周一' },
  { value: 0, label: '周日' },
]

const reminderOptions = [
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
]

function updateAi<K extends keyof FeaturesData['ai']>(key: K, value: FeaturesData['ai'][K]) {
  updateFeatures({ ai: { ...features.value.ai, [key]: value } })
}

function updateSchedule<K extends keyof FeaturesData['schedule']>(key: K, value: FeaturesData['schedule'][K]) {
  updateFeatures({ schedule: { ...features.value.schedule, [key]: value } })
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
.field input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-border); background: var(--color-bg-card); color: var(--color-text-primary); outline: none; font-size: 13px; }
.field input[type='range'] { padding: 0; }
.field-hint { font-size: 12px; color: var(--color-text-muted); }
.switch-field { flex-direction: row; align-items: center; justify-content: space-between; }
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle input { display: none; }
.toggle-slider { position: absolute; inset: 0; border-radius: 24px; background: var(--color-bg-card-hover); cursor: pointer; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; left: 3px; bottom: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.5); transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: rgba(139, 92, 246, 0.5); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); background: white; }
@media (max-width: 640px) { .field-grid { grid-template-columns: 1fr; } }
</style>
