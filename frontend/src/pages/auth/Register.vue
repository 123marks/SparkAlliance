<template>
  <div class="auth-layout">
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>
      
      <div class="brand-content">
        <h1 class="logo">✦ Spark Alliance</h1>
        <h2 class="slogan">建立信任与连接</h2>
        <p class="desc">注册账号即可获取 30 天无限制智能学术辅导模型额度，并加入星火专属社区。</p>
      </div>
    </div>

    <div class="form-panel">
      <div class="form-card" style="margin-top: 50px;">
        <div class="form-header">
          <h2>创建账号</h2>
          <p>只需几步，马上加入我们</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <input type="text" id="nickname" class="floating-input" placeholder=" " required />
            <label for="nickname" class="floating-label">昵称</label>
          </div>

          <div class="form-group">
            <input type="text" id="username" class="floating-input" placeholder=" " required />
            <label for="username" class="floating-label">学号 / 邮箱</label>
          </div>

          <div class="form-group">
            <input :type="showPwd ? 'text' : 'password'" id="password" class="floating-input" placeholder=" " required />
            <label for="password" class="floating-label">密码</label>
            <button type="button" class="eye-btn" @click="showPwd = !showPwd">
              <span class="eye-icon">{{ showPwd ? '👀' : '👁️' }}</span>
            </button>
          </div>

          <div class="form-group">
            <select id="college" class="floating-input select-styled" required>
              <option value="" disabled selected hidden></option>
              <option value="Tsinghua">清华大学</option>
              <option value="Peking">北京大学</option>
              <option value="Fudan">复旦大学</option>
              <!-- 更多选项 -->
            </select>
            <label for="college" class="floating-label select-label">选择院校</label>
            <span class="dropdown-icon">▼</span>
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" required />
              <span>我已阅读并同意 <a href="#" class="text-brand">服务条款</a> 与 <a href="#" class="text-brand">隐私政策</a></span>
            </label>
          </div>

          <button type="submit" class="submit-btn" :class="{ loading: isLoading }">
            <span v-if="!isLoading">立即注册</span>
            <span v-else class="spinner"></span>
          </button>
        </form>

        <div class="auth-footer" style="margin-top: 24px;">
          已有账号？ <router-link to="/login" class="text-brand">直接登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showPwd = ref(false)
const isLoading = ref(false)

const handleRegister = () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    router.push('/login')
  }, 1200)
}
</script>

<style scoped>
/* Reuse styles from Login.vue for consistency */
.auth-layout { display: flex; min-height: 100vh; width: 100%; }
.brand-panel { flex: 0 0 60%; position: relative; background: linear-gradient(135deg, #0a0a0f 0%, #1e1b4b 100%); display: flex; align-items: center; justify-content: center; padding: 60px; overflow: hidden; }
.floating-decorator { position: absolute; border-radius: 50%; filter: blur(80px); z-index: 1; animation: float 10s ease-in-out infinite; }
.decor-1 { top: -10%; left: 10%; width: 400px; height: 400px; background: rgba(249, 115, 22, 0.15); animation-delay: 0s; }
.decor-2 { bottom: -10%; right: 10%; width: 500px; height: 500px; background: rgba(139, 92, 246, 0.15); animation-delay: -5s; }
@keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-30px) scale(1.05); } }
.brand-content { position: relative; z-index: 2; color: white; max-width: 600px; }
.brand-content .logo { font-size: 24px; font-weight: 800; margin-bottom: 40px; color: var(--color-brand-purple); }
.brand-content .slogan { font-size: 48px; font-weight: 800; line-height: 1.2; margin-bottom: 24px; }
.brand-content .desc { font-size: 18px; color: var(--color-text-secondary); line-height: 1.6; }

.form-panel { flex: 0 0 40%; background: var(--color-bg-primary); display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
.form-card { width: 100%; max-width: 400px; background: var(--color-bg-card); border: 1px solid var(--color-border); padding: 48px 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
.form-header { text-align: center; margin-bottom: 32px; }
.form-header h2 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.form-header p { color: var(--color-text-secondary); font-size: 14px; }

.auth-form { display: flex; flex-direction: column; gap: 24px; }
.form-group { position: relative; }
.floating-input { width: 100%; padding: 16px; padding-top: 24px; padding-bottom: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); border-radius: 12px; color: white; font-size: 16px; transition: all 0.3s; outline: none; }
.floating-input:focus { border-color: var(--color-brand-purple); box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.05); }
.floating-label { position: absolute; top: 16px; left: 16px; color: var(--color-text-secondary); pointer-events: none; transition: all 0.2s ease-out; font-size: 16px; }

.floating-input:focus ~ .floating-label, .floating-input:not(:placeholder-shown) ~ .floating-label, .select-styled:valid ~ .select-label { opacity: 0.8; transform: translateY(-8px) scale(0.75); transform-origin: left top; color: var(--color-brand-purple); }

.select-styled { appearance: none; cursor: pointer; }
.select-styled option { background: var(--color-bg-secondary); color: white; }
.dropdown-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--color-text-secondary); pointer-events: none; }

.eye-btn { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--color-text-secondary); }
.form-options { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.remember-me { display: flex; align-items: flex-start; gap: 8px; color: var(--color-text-secondary); cursor: pointer; line-height: 1.4; }
.remember-me input { margin-top: 3px; }

.submit-btn { height: 48px; background: var(--gradient-brand); border: none; border-radius: 12px; color: white; font-weight: 600; font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); }
.submit-btn.loading { pointer-events: none; opacity: 0.8; }
.spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer { text-align: center; font-size: 14px; color: var(--color-text-secondary); }
.text-brand { color: var(--color-brand-purple); font-weight: 600; }

@media (max-width: 900px) { .brand-panel { display: none; } .form-panel { flex: 0 0 100%; } }
</style>
