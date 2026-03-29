<template>
  <div class="auth-layout">
    <!-- 左侧品牌面板 -->
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>

      <div class="brand-content">
        <router-link to="/" class="logo">✦ Spark Alliance</router-link>
        <h2 class="slogan">欢迎回来</h2>
        <p class="desc">登录你的账号，继续你的学习、协作与成长之旅。星火联盟 — 让每一个青年都能连接更大的世界。</p>

        <!-- 信任指标 -->
        <div class="trust-metrics">
          <div class="metric"><strong>20,000+</strong><span>注册用户</span></div>
          <div class="metric"><strong>99.9%</strong><span>服务可用性</span></div>
          <div class="metric"><strong>7×24</strong><span>AI 在线</span></div>
        </div>
      </div>
    </div>

    <!-- 右侧表单面板 -->
    <div class="form-panel">
      <div class="form-card">
        <div class="form-header">
          <h2>登录账号</h2>
          <p>使用你的邮箱或手机号登录</p>
        </div>

        <!-- 登录方式切换 -->
        <div class="login-tabs">
          <span :class="{ active: loginMethod === 'email' }" @click="loginMethod = 'email'">📧 邮箱登录</span>
          <span :class="{ active: loginMethod === 'phone' }" @click="loginMethod = 'phone'">📱 手机号登录</span>
        </div>

        <form @submit.prevent="handleLogin" class="auth-form">
          <!-- 邮箱登录 -->
          <div v-if="loginMethod === 'email'" class="form-group">
            <input type="email" id="login-email" v-model="email" class="floating-input" placeholder=" " required />
            <label for="login-email" class="floating-label">邮箱地址</label>
            <span class="field-hint error" v-if="email && !isEmailValid">邮箱格式不正确</span>
          </div>

          <!-- 手机号登录 -->
          <div v-if="loginMethod === 'phone'" class="form-group">
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+86</span>
              <input type="tel" id="login-phone" v-model="phone" class="floating-input phone-input" placeholder=" " maxlength="11" required />
              <label for="login-phone" class="floating-label phone-label">手机号码</label>
            </div>
            <span class="field-hint error" v-if="phone && !isPhoneValid">请输入有效的11位手机号</span>
          </div>

          <!-- 密码 -->
          <div class="form-group">
            <input :type="showPwd ? 'text' : 'password'" id="login-password" v-model="password" class="floating-input" placeholder=" " required />
            <label for="login-password" class="floating-label">密码</label>
            <button type="button" class="eye-btn" @click="showPwd = !showPwd">
              <span>{{ showPwd ? '👀' : '👁️' }}</span>
            </button>
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <!-- 记住我 + 忘记密码 -->
          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" v-model="rememberMe" />
              <span>记住我</span>
            </label>
            <router-link to="/forgot-password" class="forgot-link">忘记密码？</router-link>
          </div>

          <!-- 登录按钮 -->
          <button type="submit" class="submit-btn" :class="{ loading: isLoading }" :disabled="isLoading">
            <span v-if="!isLoading">立即登录</span>
            <span v-else class="spinner"></span>
          </button>
        </form>

        <div class="divider"><span>或者</span></div>

        <div class="auth-footer">
          没有账号？ <router-link to="/register" class="text-brand">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'

const router = useRouter()
const route = useRoute()

// 状态
const loginMethod = ref<'email' | 'phone'>('email')
const showPwd = ref(false)
const isLoading = ref(false)
const rememberMe = ref(false)
const email = ref('')
const phone = ref('')
const password = ref('')
const errorMsg = ref('')

// 校验
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value))

// 登录处理
const handleLogin = async () => {
  errorMsg.value = ''

  // 验证输入
  if (loginMethod.value === 'email') {
    if (!email.value || !password.value) { errorMsg.value = '请填写邮箱和密码'; return }
    if (!isEmailValid.value) { errorMsg.value = '邮箱格式不正确'; return }
  } else {
    if (!phone.value || !password.value) { errorMsg.value = '请填写手机号和密码'; return }
    if (!isPhoneValid.value) { errorMsg.value = '手机号格式不正确'; return }
  }

  isLoading.value = true

  try {
    // Supabase 目前主要支持邮箱登录
    // 手机号登录时，用 phone@sparkalliance.local 作为邮箱（后续对接按需调整）
    const loginEmail = loginMethod.value === 'email'
      ? email.value
      : `${phone.value}@phone.sparkalliance.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.value,
    })

    if (error) {
      // 友好化错误信息
      if (error.message.includes('Invalid login credentials')) {
        errorMsg.value = '邮箱或密码错误，请检查后重试'
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg.value = '邮箱尚未验证，请先查收验证邮件'
      } else {
        errorMsg.value = '登录失败: ' + error.message
      }
    } else {
      // 登录成功，跳转到 redirect 或首页
      const redirect = route.query.redirect as string
      router.push(redirect || '/app/home')
    }
  } catch (e: any) {
    errorMsg.value = '登录失败: ' + (e.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 整体布局 */
.auth-layout { display: flex; min-height: 100vh; width: 100%; }

/* 左侧品牌 */
.brand-panel { flex: 0 0 55%; position: relative; background: linear-gradient(135deg, #0a0a0f 0%, #1e1b4b 50%, #0f172a 100%); display: flex; align-items: center; justify-content: center; padding: 60px; overflow: hidden; }
.floating-decorator { position: absolute; border-radius: 50%; filter: blur(100px); z-index: 1; animation: float 12s ease-in-out infinite; }
.decor-1 { top: 10%; left: 20%; width: 400px; height: 400px; background: rgba(139, 92, 246, 0.12); }
.decor-2 { bottom: 10%; right: 15%; width: 450px; height: 450px; background: rgba(79, 142, 247, 0.12); animation-delay: -5s; }
@keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-25px) scale(1.04); } }

.brand-content { position: relative; z-index: 2; color: white; max-width: 520px; }
.logo { font-size: 20px; font-weight: 800; color: var(--color-brand-blue); display: block; margin-bottom: 40px; text-decoration: none; }
.slogan { font-size: 44px; font-weight: 800; line-height: 1.2; margin-bottom: 20px; }
.desc { font-size: 16px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 40px; }

.trust-metrics { display: flex; gap: 32px; }
.metric { display: flex; flex-direction: column; }
.metric strong { font-size: 22px; font-weight: 800; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.metric span { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

/* 右侧表单 */
.form-panel { flex: 0 0 45%; background: var(--color-bg-primary); display: flex; align-items: center; justify-content: center; padding: 40px; }
.form-card { width: 100%; max-width: 420px; background: var(--color-bg-card); border: 1px solid var(--color-border); padding: 44px 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }

.form-header { text-align: center; margin-bottom: 28px; }
.form-header h2 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
.form-header p { color: var(--color-text-secondary); font-size: 14px; }

/* 登录方式 Tab */
.login-tabs { display: flex; gap: 0; margin-bottom: 24px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); overflow: hidden; }
.login-tabs span { flex: 1; text-align: center; padding: 10px; font-size: 13px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; transition: all 0.2s; }
.login-tabs span.active { background: rgba(139,92,246,0.12); color: white; }
.login-tabs span:hover:not(.active) { background: rgba(255,255,255,0.03); }

/* 表单 */
.auth-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { position: relative; }

.floating-input { width: 100%; padding: 16px; padding-top: 24px; padding-bottom: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: white; font-size: 15px; transition: all 0.25s; outline: none; }
.floating-input:focus { border-color: var(--color-brand-blue); box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.12); background: rgba(79, 142, 247, 0.04); }
.floating-label { position: absolute; top: 16px; left: 16px; color: var(--color-text-secondary); pointer-events: none; transition: all 0.2s ease-out; font-size: 15px; }
.floating-input:focus ~ .floating-label, .floating-input:not(:placeholder-shown) ~ .floating-label { opacity: 0.85; transform: translateY(-8px) scale(0.75); transform-origin: left top; color: var(--color-brand-blue); }

.field-hint { font-size: 11px; margin-top: 4px; display: block; }
.field-hint.error { color: #f43f5e; }

/* 手机号 */
.phone-input-wrapper { position: relative; }
.phone-prefix { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--color-text-secondary); z-index: 2; font-weight: 600; }
.phone-input { padding-left: 52px !important; }
.phone-label { left: 52px !important; }

/* 密码查看 */
.eye-btn { position: absolute; right: 14px; top: 16px; background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; font-size: 16px; }

/* 选项 */
.form-options { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.remember-me { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); cursor: pointer; }
.remember-me input { accent-color: var(--color-brand-blue); }
.forgot-link { color: var(--color-text-secondary); transition: color 0.2s; font-size: 13px; }
.forgot-link:hover { color: var(--color-brand-blue); }

.error-msg { color: #ef4444; font-size: 13px; text-align: center; }

/* 按钮 */
.submit-btn { height: 50px; background: var(--gradient-brand); border: none; border-radius: 12px; color: white; font-weight: 700; font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35); }
.submit-btn.loading { pointer-events: none; opacity: 0.8; }
.spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 分隔线 */
.divider { margin: 24px 0; text-align: center; position: relative; }
.divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--color-border); }
.divider span { position: relative; background: var(--color-bg-card); padding: 0 16px; color: var(--color-text-muted); font-size: 13px; }

.auth-footer { text-align: center; font-size: 14px; color: var(--color-text-secondary); }
.text-brand { color: var(--color-brand-blue); font-weight: 600; }

/* 响应式 */
@media (max-width: 900px) {
  .brand-panel { display: none; }
  .form-panel { flex: 0 0 100%; }
}
</style>
