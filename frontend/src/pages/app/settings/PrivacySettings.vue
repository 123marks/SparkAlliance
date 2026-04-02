<template>
  <div class="section">
    <h2>隐私设置</h2>
    <p class="section-desc">控制谁能看到你的内容，以及平台如何使用你的数据。</p>

    <div class="card">
      <div class="card-title">可见性控制</div>
      <div v-for="item in visibilityItems" :key="item.key" class="setting-row">
        <div class="setting-info">
          <span class="setting-label">{{ item.label }}</span>
          <span class="setting-hint">{{ item.hint }}</span>
        </div>
        <SparkSelect
          v-if="item.type === 'select'"
          :model-value="String(privacy[item.key])"
          :options="visibilityOptions"
          @update:model-value="updateSelect(item.key, String($event) as PrivacyData['profileVisibility'])"
        />
        <label v-else class="toggle">
          <input
            type="checkbox"
            :checked="privacy[item.key]"
            @change="updateToggle(item.key, ($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">数据授权</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">AI 数据优化</span>
          <span class="setting-hint">允许使用匿名对话数据提升 AI 体验。</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="privacy.aiDataUsage" @change="save({ aiDataUsage: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">个性化推荐</span>
          <span class="setting-hint">基于你的行为推荐更相关的内容。</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="privacy.personalizedRecommendation" @change="save({ personalizedRecommendation: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">匿名分析</span>
          <span class="setting-hint">允许匿名使用数据改进产品体验。</span>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="privacy.anonymousAnalytics" @change="save({ anonymousAnalytics: ($event.target as HTMLInputElement).checked })" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import type { PrivacyData } from '../../../types/settings'
import SparkSelect from '../../../components/SparkSelect.vue'

const { privacy, updatePrivacy } = useSettings()

type PrivacySelectKey = 'profileVisibility' | 'postVisibility'
type PrivacyToggleKey = 'showOnlineStatus' | 'showLastActive' | 'showLocation' | 'showUniversity' | 'allowSearch'

const visibilityItems: Array<
  | { key: PrivacySelectKey; label: string; hint: string; type: 'select' }
  | { key: PrivacyToggleKey; label: string; hint: string; type: 'toggle' }
> = [
  { key: 'profileVisibility', label: '个人主页可见性', hint: '控制谁可以查看你的个人主页。', type: 'select' },
  { key: 'postVisibility', label: '动态可见性', hint: '控制谁可以看到你发布的动态。', type: 'select' },
  { key: 'showOnlineStatus', label: '显示在线状态', hint: '允许他人看到你是否在线。', type: 'toggle' },
  { key: 'showLastActive', label: '显示最近活跃时间', hint: '允许他人看到你最近一次活跃。', type: 'toggle' },
  { key: 'showLocation', label: '显示位置信息', hint: '是否在资料页展示你的地区信息。', type: 'toggle' },
  { key: 'showUniversity', label: '显示学校信息', hint: '是否公开你的学校信息。', type: 'toggle' },
  { key: 'allowSearch', label: '允许被搜索', hint: '允许他人通过昵称或资料搜索到你。', type: 'toggle' },
]

const visibilityOptions = [
  { value: 'public', label: '所有人' },
  { value: 'followers', label: '仅关注者' },
  { value: 'private', label: '仅自己' },
]

function save(data: Partial<PrivacyData>) {
  updatePrivacy(data)
}

function updateToggle(key: PrivacyToggleKey, value: boolean) {
  save({ [key]: value } as Partial<PrivacyData>)
}

function updateSelect(key: PrivacySelectKey, value: PrivacyData['profileVisibility']) {
  save({ [key]: value } as Partial<PrivacyData>)
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.setting-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.setting-row:last-child { border-bottom: none; }
.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: 14px; color: var(--color-text-primary); font-weight: 500; }
.setting-hint { font-size: 12px; color: var(--color-text-muted); }

.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle input { display: none; }
.toggle-slider { position: absolute; inset: 0; border-radius: 24px; background: var(--color-bg-card-hover); cursor: pointer; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; left: 3px; bottom: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.5); transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: rgba(139, 92, 246, 0.5); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); background: white; }
</style>
