<template>
  <div class="auth-layout">
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>
      
      <div class="brand-content">
        <h1 class="logo">✦ Spark Alliance</h1>
        <h2 class="slogan">点亮你的校园时光</h2>
        <p class="desc">加入全网最具创新性的校园连接平台，开启你的智能化 AI 伴随式学习与社交生活。</p>
      </div>
    </div>

    <div class="form-panel">
      <div class="form-card">
        <div class="form-header">
          <h2>欢迎回来</h2>
          <p>登录以继续你的校园旅程</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <input type="text" id="username" v-model="email" class="floating-input" placeholder=" " required />
            <label for="username" class="floating-label">邮箱</label>
          </div>

          <div class="form-group">
            <input :type="showPwd ? 'text' : 'password'" id="password" v-model="password" class="floating-input" placeholder=" " required />
            <label for="password" class="floating-label">密码</label>
            <button type="button" class="eye-btn" @click="showPwd = !showPwd">
              <!-- SVG Eye icon omitted for brevity -->
              <span class="eye-icon">{{ showPwd ? '👀' : '👁️' }}</span>
            </button>
          </div>
          
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" />
              <span>记住我</span>
            </label>
            <a href="#" class="forgot-link">忘记密码？</a>
          </div>

          <button type="submit" class="submit-btn" :class="{ loading: isLoading }">
            <span v-if="!isLoading">立即登录</span>
            <span v-else class="spinner"></span>
          </button>
        </form>

        <div class="divider">
          <span>或者</span>
        </div>

        <div class="auth-footer">
          没有账号？ <router-link to="/register" class="text-brand">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'

const router = useRouter()
const showPwd = ref(false)
const isLoading = ref(false)
const email = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) return
  
  isLoading.value = true
  errorMsg.value = ''
  
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  isLoading.value = false

  if (error) {
    errorMsg.value = '登录失败: ' + error.message
  } else {
    router.push('/app/home')
  }
}
</script>

<style scoped>
.auth-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* Left Brand Panel */
.brand-panel {
  flex: 0 0 60%;
  position: relative;
  background: linear-gradient(135deg, #0a0a0f 0%, #1e1b4b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  overflow: hidden;
}

.floating-decorator {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 1;
  animation: float 10s ease-in-out infinite;
}

.decor-1 {
  top: 10%; left: 20%;
  width: 400px; height: 400px;
  background: rgba(139, 92, 246, 0.15);
  animation-delay: 0s;
}

.decor-2 {
  bottom: 10%; right: 20%;
  width: 500px; height: 500px;
  background: rgba(79, 142, 247, 0.15);
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

.brand-content {
  position: relative;
  z-index: 2;
  color: white;
  max-width: 600px;
}

.brand-content .logo {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 40px;
  color: var(--color-brand-blue);
}

.brand-content .slogan {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 24px;
}

.brand-content .desc {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Right Form Panel */
.form-panel {
  flex: 0 0 40%;
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 48px 40px;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.form-header p {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  position: relative;
}

.floating-input {
  width: 100%;
  padding: 16px;
  padding-top: 24px;
  padding-bottom: 8px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  transition: all 0.3s;
  outline: none;
}

.floating-input:focus {
  border-color: var(--color-brand-blue);
  box-shadow: 0 0 0 2px rgba(79, 142, 247, 0.2);
  background: rgba(79, 142, 247, 0.05);
}

.floating-label {
  position: absolute;
  top: 16px;
  left: 16px;
  color: var(--color-text-secondary);
  pointer-events: none;
  transition: all 0.2s ease-out;
  font-size: 16px;
}

/* Floating animation trick */
.floating-input:focus ~ .floating-label,
.floating-input:not(:placeholder-shown) ~ .floating-label {
  opacity: 0.8;
  transform: translateY(-8px) scale(0.75);
  transform-origin: left top;
  color: var(--color-brand-blue);
}

.eye-btn {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  margin-top: 8px;
}

.error-msg {
  color: #ef4444;
  font-size: 14px;
  margin-top: -8px;
  margin-bottom: 8px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.forgot-link {
  color: var(--color-text-secondary);
  transition: color 0.2s;
}
.forgot-link:hover { color: var(--color-brand-blue); }

.submit-btn {
  height: 48px;
  background: var(--gradient-brand);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.submit-btn.loading {
  pointer-events: none;
  opacity: 0.8;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.divider {
  margin: 24px 0;
  text-align: center;
  position: relative;
}
.divider::before {
  content: '';
  position: absolute;
  top: 50%; left: 0; right: 0;
  height: 1px;
  background: var(--color-border);
}
.divider span {
  position: relative;
  background: var(--color-bg-card);
  padding: 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.text-brand {
  color: var(--color-brand-blue);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 900px) {
  .brand-panel { display: none; }
  .form-panel { flex: 0 0 100%; }
}
</style>
