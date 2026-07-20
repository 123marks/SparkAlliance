<template>
  <div class="auth-layout">
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>
      
      <div class="brand-content">
        <h1 class="logo">✦ Spark Alliance</h1>
        <h2 class="slogan">找回你的密码</h2>
        <p class="desc">输入注册邮箱获取验证码，验证后即可设置新密码。</p>
      </div>
    </div>

    <div class="form-panel">
      <div class="form-card">
        <!-- 步骤一：输入邮箱获取验证码 -->
        <template v-if="phase === 'request'">
          <div class="form-header">
            <h2>忘记密码</h2>
            <p>请输入你的注册邮箱</p>
          </div>

          <form @submit.prevent="handleSendCode" class="auth-form">
            <div class="form-group">
              <input
                type="email"
                id="email"
                v-model="email"
                class="floating-input"
                placeholder=" "
                required
              />
              <label for="email" class="floating-label">邮箱地址</label>
            </div>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

            <button type="submit" class="submit-btn" :class="{ loading: isLoading }">
              <span v-if="!isLoading">发送验证码</span>
              <span v-else class="spinner"></span>
            </button>
          </form>
        </template>

        <!-- 步骤二：验证码 + 新密码 -->
        <template v-else-if="phase === 'verify'">
          <div class="form-header">
            <h2>设置新密码</h2>
            <p>验证码已发送到 <strong>{{ email }}</strong></p>
          </div>

          <form @submit.prevent="handleVerifyReset" class="auth-form">
            <p v-if="devHint" class="dev-hint">{{ devHint }}</p>
            <div class="form-group code-row">
              <div class="form-group" style="flex:1; margin:0">
                <input id="code" v-model="code" class="floating-input" placeholder=" " maxlength="6" required />
                <label for="code" class="floating-label">6 位验证码</label>
              </div>
              <button type="button" class="resend-inline" :disabled="cooldown > 0" @click="handleSendCode">
                {{ cooldown > 0 ? `${cooldown}s` : '重发' }}
              </button>
            </div>
            <div class="form-group">
              <input type="password" id="newpwd" v-model="newPassword" class="floating-input" placeholder=" " minlength="8" maxlength="32" required />
              <label for="newpwd" class="floating-label">新密码（至少 8 位）</label>
            </div>
            <div class="form-group">
              <input type="password" id="newpwd2" v-model="confirmPassword" class="floating-input" placeholder=" " minlength="8" maxlength="32" required />
              <label for="newpwd2" class="floating-label">确认新密码</label>
            </div>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

            <button type="submit" class="submit-btn" :class="{ loading: isLoading }">
              <span v-if="!isLoading">重置密码</span>
              <span v-else class="spinner"></span>
            </button>
          </form>
        </template>

        <!-- 步骤三：完成 -->
        <template v-else>
          <div class="success-state">
            <div class="success-icon">✅</div>
            <h2>密码已重置</h2>
            <p>请使用新密码登录，你之前的登录状态已全部失效。</p>
            <router-link to="/login" class="resend-btn" style="display:inline-block; text-decoration:none">去登录</router-link>
          </div>
        </template>

        <div class="auth-footer">
          想起密码了？ <router-link to="/login" class="text-brand">返回登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { apiSendEmailCode, apiVerifyReset } from '../../api/auth'
import { ApiError } from '../../api/client'

const isLoading = ref(false)
const phase = ref<'request' | 'verify' | 'done'>('request')
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const devHint = ref('')
const cooldown = ref(0)

const handleSendCode = async () => {
  if (!email.value || isLoading.value || cooldown.value > 0) return
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await apiSendEmailCode(email.value, 'reset_password')
    phase.value = 'verify'
    cooldown.value = 60
    const t = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) clearInterval(t) }, 1000)
    if (res.dev_mode && res.code) {
      code.value = res.code
      devHint.value = '开发模式：验证码已自动填入（生产环境将发送到邮箱）'
    }
  } catch (e: unknown) {
    if (e instanceof ApiError && e.code === 'CODE_COOLDOWN') errorMsg.value = '发送太频繁，请 60 秒后再试'
    else errorMsg.value = '发送失败: ' + ((e as Error)?.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}

const handleVerifyReset = async () => {
  if (isLoading.value) return
  errorMsg.value = ''
  if (newPassword.value.length < 8) { errorMsg.value = '新密码至少 8 位'; return }
  if (newPassword.value !== confirmPassword.value) { errorMsg.value = '两次输入的密码不一致'; return }
  isLoading.value = true
  try {
    await apiVerifyReset(email.value, code.value.trim(), newPassword.value)
    phase.value = 'done'
  } catch (e: unknown) {
    if (e instanceof ApiError) errorMsg.value = e.message
    else errorMsg.value = '重置失败: ' + ((e as Error)?.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.brand-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.08), rgba(139, 92, 246, 0.08));
  position: relative;
  overflow: hidden;
}

.floating-decorator {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.decor-1 {
  width: 400px; height: 400px;
  background: rgba(79, 142, 247, 0.3);
  top: -100px; left: -100px;
}

.decor-2 {
  width: 350px; height: 350px;
  background: rgba(139, 92, 246, 0.3);
  bottom: -80px; right: -80px;
}

.brand-content {
  text-align: center;
  z-index: 2;
  padding: 40px;
}

.logo {
  font-size: 32px;
  font-weight: 800;
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 16px;
}

.slogan {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
}

.brand-content .desc {
  color: var(--color-text-secondary);
  font-size: 15px;
  max-width: 300px;
  margin: 0 auto;
  line-height: 1.6;
}

.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-card {
  width: 100%;
  max-width: 400px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 8px;
}

.form-header p {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  position: relative;
}

.floating-input {
  width: 100%;
  padding: 16px 16px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  transition: all 0.2s;
}

.floating-input:focus {
  outline: none;
  border-color: var(--color-brand-blue);
  background: rgba(255, 255, 255, 0.05);
}

.floating-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  font-size: 14px;
  pointer-events: none;
  transition: all 0.2s;
}

.floating-input:focus + .floating-label,
.floating-input:not(:placeholder-shown) + .floating-label {
  top: 8px;
  font-size: 11px;
  color: var(--color-brand-blue);
  transform: translateY(0);
}

.code-row { display: flex; gap: 10px; align-items: flex-start; }
.resend-inline {
  flex-shrink: 0;
  height: 52px;
  padding: 0 18px;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.24);
  border-radius: 12px;
  color: #c4b5fd;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.resend-inline:hover:not(:disabled) { background: rgba(139, 92, 246, 0.22); }
.resend-inline:disabled { opacity: 0.4; cursor: not-allowed; }

.dev-hint {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(245, 197, 94, 0.08);
  border: 1px solid rgba(245, 197, 94, 0.2);
  color: rgba(245, 197, 94, 0.85);
  font-size: 12px;
  text-align: center;
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: var(--gradient-brand);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
}

.submit-btn.loading {
  pointer-events: none;
  opacity: 0.8;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success State */
.success-state {
  text-align: center;
  padding: 20px 0 40px;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.success-state h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
}

.success-state p {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.success-state strong {
  color: white;
}

.hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 16px !important;
}

.resend-btn {
  margin-top: 24px;
  padding: 12px 28px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.resend-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.3);
}

.auth-footer {
  text-align: center;
  margin-top: 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.text-brand {
  color: var(--color-brand-blue);
  font-weight: 600;
}

.text-brand:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .brand-panel { display: none; }
  .form-panel { padding: 20px; }
}
</style>
