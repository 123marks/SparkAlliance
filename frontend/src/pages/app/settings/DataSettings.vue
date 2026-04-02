<template>
  <div class="section">
    <h2>数据与存储</h2>
    <p class="section-desc">管理缓存、导出数据，并了解设置的保存位置。</p>

    <div class="card">
      <div class="card-title">缓存管理</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">浏览器缓存</span>
          <span class="setting-hint">清理本地缓存数据，不影响外观偏好和快速笔记。</span>
        </div>
        <button class="btn-action" type="button" @click="handleClearCache">清理缓存</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">数据导出</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">导出个人数据</span>
          <span class="setting-hint">将资料、教育信息和设置导出为 JSON 文件。</span>
        </div>
        <button class="btn-action" type="button" :disabled="isExporting" @click="handleExport">
          {{ isExporting ? '导出中...' : '导出数据' }}
        </button>
      </div>
    </div>

    <div class="card info-card">
      <div class="card-title">存储说明</div>
      <div class="info-list">
        <div class="info-item">
          <span class="info-icon">☁️</span>
          <div>
            <strong>云端设置</strong>
            <span>隐私、通知、功能偏好同步存储在 Supabase，换设备也不会丢失。</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🖥️</span>
          <div>
            <strong>本地偏好</strong>
            <span>外观主题和快速笔记保存在当前设备，确保离线时也能即时生效。</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🔐</span>
          <div>
            <strong>账号资料</strong>
            <span>昵称、头像等资料通过 Auth 管理，并受账号密码保护。</span>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="toast" class="toast success">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../../../composables/useSettings'

const { clearCache, exportUserData } = useSettings()
const isExporting = ref(false)
const toast = ref('')

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    toast.value = ''
  }, 2500)
}

function handleClearCache() {
  const confirmed = confirm('确定要清理缓存吗？这不会影响你的外观偏好和快速笔记。')
  if (!confirmed) return
  clearCache()
  showToast('缓存已清理。')
}

async function handleExport() {
  isExporting.value = true

  try {
    const blob = await exportUserData()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spark-alliance-data-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast('数据已导出。')
  } catch {
    showToast('导出失败，请稍后重试。')
  }

  isExporting.value = false
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.setting-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; }
.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: 14px; color: var(--color-text-primary); font-weight: 500; }
.setting-hint { font-size: 12px; color: var(--color-text-muted); }
.btn-action { padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; background: rgba(79, 142, 247, 0.1); border: 1px solid rgba(79, 142, 247, 0.2); color: #60a5fa; cursor: pointer; transition: 0.2s ease; }
.btn-action:hover { background: rgba(79, 142, 247, 0.2); }
.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }
.info-card { background: linear-gradient(135deg, rgba(79, 142, 247, 0.04), rgba(139, 92, 246, 0.03)); border-color: rgba(79, 142, 247, 0.08); }
.info-list { display: flex; flex-direction: column; gap: 16px; }
.info-item { display: flex; gap: 14px; align-items: flex-start; }
.info-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.info-item strong { display: block; margin-bottom: 4px; font-size: 14px; color: var(--color-text-primary); }
.info-item span { font-size: 12px; color: var(--color-text-muted); line-height: 1.5; }
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 300; }
.toast.success { background: rgba(16, 185, 129, 0.9); color: var(--color-text-primary); }
.fade-enter-active, .fade-leave-active { transition: 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
