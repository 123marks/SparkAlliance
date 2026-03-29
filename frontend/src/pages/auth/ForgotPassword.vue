<template>
  <div class="auth-layout">
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>
      
      <div class="brand-content">
        <h1 class="logo">✦ Spark Alliance</h1>
        <h2 class="slogan">找回你的密码</h2>
        <p class="desc">输入注册邮箱，我们将发送密码重置链接到你的邮箱。</p>
      </div>
    </div>

    <div class="form-panel">
      <div class="form-card">
        <!-- 步骤一：输入邮箱 -->
        <template v-if="!emailSent">
          <div class="form-header">
            <h2>忘记密码</h2>
            <p>请输入你的注册邮箱</p>
          </div>
          
          <form @submit.prevent="handleReset" class="auth-form">
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
              <span v-if="!isLoading">发送重置链接</span>
              <span v-else class="spinner"></span>
            </button>
          </form>
        </template>

        <!-- 步骤二：邮件已发送 -->
        <template v-else>
          <div class="success-state">
            <div class="success-icon">📧</div>
            <h2>重置链接已发送</h2>
            <p>请查看你的邮箱 <strong>{{ email }}</strong>，点击邮件中的链接重置密码。</p>
            <p class="hint">没收到邮件？请检查垃圾邮件文件夹，或稍后再试。</p>
            <button @click="emailSent = false; errorMsg = ''" class="resend-btn">重新发送</button>
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
import { supabase } from '../../supabase'

const isLoading = ref(false)
const email = ref('')
const errorMsg = ref('')
const emailSent = ref(false)

const handleReset = async () => {
  if (!email.value) return
  
  isLoading.value = true
  errorMsg.value = ''
  
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  isLoading.value = false

  if (error) {
    errorMsg.value = '发送失败: ' + error.message
  } else {
    emailSent.value = true
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
