<template>
  <div class="settings-page">
    <div class="settings-header">
      <div>
        <h1>设置中心</h1>
        <p>统一管理个人资料、隐私、通知和平台偏好。</p>
      </div>
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="text" placeholder="搜索设置项..." class="search-input" @input="onSearch" />
      </div>
    </div>

    <div v-if="searchResults.length > 0" class="search-results">
      <router-link v-for="item in searchResults" :key="item.id" :to="item.path" class="search-item" @click="clearSearch">
        <span class="search-section">{{ item.sectionLabel }}</span>
        <span class="search-label">{{ item.label }}</span>
      </router-link>
    </div>

    <div class="settings-body">
      <aside class="settings-nav">
        <router-link v-for="section in navSections" :key="section.key" :to="`/app/settings/${section.key}`" class="nav-item" active-class="active">
          <span class="nav-icon">{{ section.icon }}</span>
          <span class="nav-text">{{ section.label }}</span>
        </router-link>
      </aside>

      <main class="settings-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettings } from '../../../composables/useSettings'
import { searchSettings } from '../../../utils/settingsDefaults'
import type { SettingsSearchItem } from '../../../types/settings'

const { loadSettings, settingsLoaded } = useSettings()
const searchQuery = ref('')
const searchResults = ref<SettingsSearchItem[]>([])

const navSections = [
  { key: 'profile', label: '个人资料', icon: '👤' },
  { key: 'security', label: '账号安全', icon: '🔐' },
  { key: 'privacy', label: '隐私设置', icon: '🛡️' },
  { key: 'notifications', label: '通知设置', icon: '🔔' },
  { key: 'appearance', label: '外观主题', icon: '🎨' },
  { key: 'features', label: '功能设置', icon: '🧩' },
  { key: 'data', label: '数据存储', icon: '💾' },
  { key: 'about', label: '关于帮助', icon: 'ℹ️' },
]

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

function onSearch() {
  searchResults.value = searchSettings(searchQuery.value)
}

onMounted(async () => {
  if (!settingsLoaded.value) {
    await loadSettings()
  }
})
</script>

<style scoped>
.settings-page { position: relative; max-width: 1100px; margin: 0 auto; padding: 24px 32px 48px; }
.settings-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
.settings-header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; color: var(--color-text-primary); }
.settings-header p { margin: 0; font-size: 13px; color: var(--color-text-muted); }
.search-box { display: flex; align-items: center; gap: 8px; min-width: 260px; padding: 10px 14px; border-radius: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); }
.search-box svg { color: var(--color-text-muted); flex-shrink: 0; }
.search-input { width: 100%; background: none; border: none; outline: none; color: var(--color-text-primary); font-size: 13px; }
.search-input::placeholder { color: var(--color-text-muted); }
.search-results { position: absolute; right: 32px; top: 88px; width: 320px; padding: 8px; border-radius: 14px; background: rgba(20, 20, 30, 0.96); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); z-index: 10; }
.search-item { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border-radius: 10px; text-decoration: none; }
.search-item:hover { background: var(--color-bg-card-hover); }
.search-section { font-size: 11px; color: rgba(139, 92, 246, 0.8); font-weight: 600; }
.search-label { font-size: 14px; color: var(--color-text-primary); }
.settings-body { display: grid; grid-template-columns: 240px 1fr; gap: 24px; }
.settings-nav { display: flex; flex-direction: column; gap: 8px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; color: var(--color-text-secondary); text-decoration: none; background: var(--color-bg-card); border: 1px solid transparent; transition: 0.2s ease; }
.nav-item:hover, .nav-item.active { color: var(--color-text-primary); border-color: rgba(79, 142, 247, 0.18); background: rgba(79, 142, 247, 0.08); }
.nav-icon { width: 20px; text-align: center; }
.settings-content { min-width: 0; }
@media (max-width: 900px) { .settings-body { grid-template-columns: 1fr; } .settings-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .settings-page { padding: 20px 16px 40px; } .settings-header { flex-direction: column; } .search-box, .search-results { width: 100%; min-width: 0; right: 0; } .search-results { top: 120px; } .settings-nav { grid-template-columns: 1fr; } }
</style>
