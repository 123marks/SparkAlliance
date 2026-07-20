<template>
  <div class="login-wrap">
    <form class="login-card glass-card" @submit.prevent="handleSubmit">
      <div class="login-brand">
        <span class="login-mark" aria-hidden="true">✦</span>
        <h1 class="login-title">Spark Admin</h1>
        <p class="login-sub">星火联盟 · 管理控制台</p>
      </div>

      <label class="field">
        <span class="field-label">邮箱</span>
        <input
          v-model.trim="email"
          type="email"
          autocomplete="username"
          placeholder="admin@spark.local"
          required
        />
      </label>

      <label class="field">
        <span class="field-label">密码</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="请输入密码"
          required
          minlength="8"
        />
      </label>

      <p v-if="errorMsg" class="login-error" role="alert">{{ errorMsg }}</p>

      <button class="btn btn-primary login-btn" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登 录' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, login } from '../api'
import { setSession } from '../auth'
import { toast } from '../toast'

const router = useRouter()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    const { token, user } = await login(email.value, password.value)
    if (user.role !== 'admin') {
      errorMsg.value = '该账号无管理员权限，禁止访问后台'
      return
    }
    setSession(token, user.email)
    toast(`欢迎回来，${user.nickname || user.email}`)
    void router.push({ name: 'dashboard' })
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  width: 380px;
  max-width: 100%;
  padding: 36px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(15, 12, 30, 0.7);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(124, 58, 237, 0.1);
}
.login-brand {
  text-align: center;
  margin-bottom: 8px;
}
.login-mark {
  font-size: 26px;
  color: var(--gold);
  filter: drop-shadow(0 0 10px rgba(245, 197, 94, 0.7));
}
.login-title {
  margin-top: 8px;
  font-size: 24px;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #f5c55e);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.login-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-2);
  letter-spacing: 2px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  color: var(--text-2);
}
.field input {
  height: 40px;
}
.login-error {
  margin: 0;
  font-size: 12px;
  color: #fda4af;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
}
.login-btn {
  height: 42px;
  font-size: 14px;
  letter-spacing: 4px;
  margin-top: 4px;
}
</style>
