<template>
  <div class="section">
    <h2>账号安全</h2>
    <p class="section-desc">管理账号信息、密码与高风险操作。</p>

    <div class="card">
      <div class="card-title">账号信息</div>
      <div class="info-row">
        <span class="info-label">邮箱</span>
        <span class="info-value">{{ maskedEmail }}</span>
        <span class="badge verified">已验证</span>
      </div>
      <div class="info-row">
        <span class="info-label">注册时间</span>
        <span class="info-value">{{ createdAt }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">账号状态</span>
        <span class="badge normal">正常</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">修改密码</div>
      <div class="field">
        <label>当前密码</label>
        <input v-model="passwordForm.current" type="password" placeholder="输入当前密码" autocomplete="current-password" />
      </div>
      <div class="field">
        <label>新密码</label>
        <input v-model="passwordForm.newPwd" type="password" placeholder="至少 8 位，建议包含字母和数字" autocomplete="new-password" />
        <div v-if="passwordForm.newPwd" class="strength-bar">
          <div class="strength-fill" :class="passwordStrength.level" :style="{ width: passwordStrength.width }"></div>
        </div>
        <span v-if="passwordForm.newPwd" class="strength-text">密码强度：{{ passwordStrength.label }}</span>
      </div>
      <div class="field">
        <label>确认新密码</label>
        <input v-model="passwordForm.confirm" type="password" placeholder="再次输入新密码" autocomplete="new-password" />
        <span v-if="passwordForm.confirm && passwordForm.confirm !== passwordForm.newPwd" class="field-error">两次输入的密码不一致。</span>
      </div>
      <button class="btn-primary" type="button" :disabled="!canSubmitPassword || isChanging" @click="handleChangePassword">
        {{ isChanging ? '修改中...' : '确认修改' }}
      </button>
    </div>

    <div class="card danger-card">
      <div class="card-title">危险操作</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">删除账号</span>
          <span class="setting-hint">删除后所有数据都无法恢复，请谨慎操作。</span>
        </div>
        <button class="btn-danger" type="button" @click="handleDeleteAccount">删除账号</button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="toast" class="toast" :class="toast.type">{{ toast.message }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAuth } from '../../../composables/useAuth'
import { useSettings } from '../../../composables/useSettings'

const { user } = useAuth()
const { changePassword } = useSettings()

const isChanging = ref(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const passwordForm = reactive({ current: '', newPwd: '', confirm: '' })

const maskedEmail = computed(() => {
  const email = user.value?.email || ''
  const [name, domain] = email.split('@')
  if (!name || !domain) return email || '-'
  return `${name.charAt(0)}***@${domain}`
})

const createdAt = computed(() => {
  const value = user.value?.created_at
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
})

const passwordStrength = computed(() => {
  const password = passwordForm.newPwd
  if (password.length < 6) return { level: 'weak', label: '弱', width: '33%' }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const score = [password.length >= 8, hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  if (score >= 4) return { level: 'strong', label: '强', width: '100%' }
  if (score >= 2) return { level: 'medium', label: '中', width: '66%' }
  return { level: 'weak', label: '弱', width: '33%' }
})

const canSubmitPassword = computed(() => {
  return passwordForm.current.length > 0 && passwordForm.newPwd.length >= 8 && passwordForm.newPwd === passwordForm.confirm
})

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { type, message }
  window.setTimeout(() => {
    toast.value = null
  }, 3000)
}

async function handleChangePassword() {
  if (!canSubmitPassword.value) return

  isChanging.value = true
  const result = await changePassword(passwordForm.current, passwordForm.newPwd)
  isChanging.value = false

  if (result.success) {
    showToast('success', result.message)
    passwordForm.current = ''
    passwordForm.newPwd = ''
    passwordForm.confirm = ''
    return
  }

  showToast('error', result.message)
}

function handleDeleteAccount() {
  const confirmed = confirm('删除账号后所有数据都将永久丢失，当前版本暂不提供自动删除，请确认你已备份重要信息。')
  if (!confirmed) return
  alert('账号删除功能将在后续版本开放，如需立即处理请联系平台支持。')
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.danger-card { border-color: rgba(244, 63, 94, 0.15); }
.info-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.info-row:last-child { border-bottom: none; }
.info-label { width: 80px; flex-shrink: 0; font-size: 13px; color: var(--color-text-muted); }
.info-value { flex: 1; font-size: 14px; color: var(--color-text-primary); }
.badge { font-size: 11px; padding: 2px 10px; border-radius: 20px; font-weight: 600; }
.badge.verified { background: rgba(16, 185, 129, 0.12); color: #34d399; }
.badge.normal { background: rgba(79, 142, 247, 0.12); color: #60a5fa; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field label { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
.field input { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 14px; background: var(--color-bg-card); border: 1px solid var(--color-border); color: var(--color-text-primary); outline: none; }
.field input:focus { border-color: rgba(139, 92, 246, 0.3); }
.field-error { font-size: 12px; color: #f43f5e; }
.strength-bar { height: 4px; background: var(--color-border); border-radius: 2px; margin-top: 4px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 2px; transition: 0.3s ease; }
.strength-fill.weak { background: #f43f5e; }
.strength-fill.medium { background: #f97316; }
.strength-fill.strong { background: #10b981; }
.strength-text { font-size: 12px; color: rgba(255, 255, 255, 0.35); }
.setting-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.setting-info { display: flex; flex-direction: column; gap: 4px; }
.setting-label { font-size: 14px; color: var(--color-text-primary); font-weight: 500; }
.setting-hint { font-size: 12px; color: var(--color-text-muted); }
.btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 10px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #4f8ef7, #8b5cf6); color: var(--color-text-primary); border: none; cursor: pointer; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-danger { padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); color: #f43f5e; cursor: pointer; }
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 300; }
.toast.success { background: rgba(16, 185, 129, 0.9); color: var(--color-text-primary); }
.toast.error { background: rgba(244, 63, 94, 0.92); color: #fff; }
.fade-enter-active, .fade-leave-active { transition: 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
