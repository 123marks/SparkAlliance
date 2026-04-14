<template>
  <footer class="app-footer">
    <div class="footer-container">
      <!-- 顶部装饰线 -->
      <div class="footer-line"></div>

      <div class="footer-grid">
        <!-- 品牌列 -->
        <div class="brand-col">
          <h3 class="logo"><img src="/spark-logo.png" alt="Spark" style="width:24px;height:24px;object-fit:contain;vertical-align:-4px;margin-right:6px;border-radius:3px" /> SparkAlliance</h3>
          <p class="desc">点亮校园时光，连接你我他。用 AI 赋能新时代的大学生生活体验。</p>
          <div class="social-links">
            <a href="javascript:void(0)" class="social-icon wechat-icon" title="微信公众号：星火校园 SparkAlliance">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2C4.329 2 .726 4.943.726 8.596c0 2.064 1.112 3.904 2.855 5.13l-.716 2.138 2.49-1.254c.858.234 1.762.36 2.7.36h.298c-.075-.332-.116-.674-.116-1.024 0-3.515 3.32-6.364 7.417-6.364.217 0 .43.012.643.03C15.83 4.304 12.558 2 8.69 2zm-2.77 3.743a.923.923 0 110 1.846.923.923 0 010-1.846zM11 5.743a.923.923 0 110 1.846.923.923 0 010-1.846zM15.654 8.3c-3.643 0-6.6 2.508-6.6 5.603 0 3.095 2.957 5.603 6.6 5.603.74 0 1.453-.108 2.12-.306l1.954.982-.561-1.675c1.487-1.069 2.443-2.694 2.443-4.504 0-3.195-2.957-5.703-6.6-5.703h.044zm-2.335 3.185a.77.77 0 110 1.54.77.77 0 010-1.54zm4.67 0a.77.77 0 110 1.54.77.77 0 010-1.54z"/></svg>
            </a>
            <a href="https://github.com/sparkalliance" target="_blank" rel="noopener" class="social-icon" title="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://weibo.com/sparkalliance" target="_blank" rel="noopener" class="social-icon" title="微博">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.525 11.378c-.248-.067-.42-.113-.295-.41.272-.643.3-1.197.005-1.591-.553-.741-2.065-.7-3.81-.02 0 0-.547.24-.407-.195.27-.858.23-1.577-.19-1.993-.954-.949-3.5.036-5.686 2.2C5.16 11.355 4 13.552 4 15.497 4 19.136 8.466 21 12.81 21c5.697 0 9.49-3.317 9.49-5.95 0-1.59-1.339-2.493-2.775-2.672zm-5.025 8.054c-3.36.355-6.258-1.192-6.47-3.455-.212-2.263 2.335-4.375 5.694-4.73 3.36-.354 6.258 1.193 6.47 3.456.213 2.263-2.334 4.374-5.694 4.73zM19.34 5.38c-1.71-1.897-4.23-2.628-6.576-2.146l.005.02c-.258.054-.427.301-.377.55.05.25.301.417.555.367 1.965-.404 4.076.21 5.51 1.8 1.434 1.59 1.856 3.766 1.236 5.66-.075.246.068.507.319.582.251.076.516-.064.592-.31.74-2.255.244-4.854-1.264-6.522z"/></svg>
            </a>
            <a href="https://space.bilibili.com/sparkalliance" target="_blank" rel="noopener" class="social-icon" title="Bilibili">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.124.929.373.249.249.373.551.373.907s-.124.657-.373.906l-1.156 1.147zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg>
            </a>
          </div>
        </div>

        <div class="links-col">
          <h4>产品</h4>
          <router-link to="/#features">核心功能</router-link>
          <router-link to="/community">社区动态</router-link>
          <router-link to="/docs">用户手册</router-link>
          <router-link to="/changelog">更新日志</router-link>
        </div>

        <div class="links-col">
          <h4>资源</h4>
          <router-link to="/docs#api">开放 API</router-link>
          <a href="https://github.com/sparkalliance" target="_blank" rel="noopener">开源仓库</a>
          <router-link to="/docs">设计规范</router-link>
          <router-link to="/changelog">系统状态</router-link>
        </div>

        <div class="links-col">
          <h4>关于</h4>
          <router-link to="/about">团队介绍</router-link>
          <router-link to="/terms">服务条款</router-link>
          <router-link to="/privacy">隐私政策</router-link>
          <router-link to="/about#contact">加入我们</router-link>
        </div>

        <div class="links-col">
          <h4>帮助与支持</h4>
          <router-link to="/docs">帮助中心</router-link>
          <router-link to="/community">社区讨论</router-link>
          <a href="mailto:support@sparkalliance.cn">联系客服</a>
          <a href="mailto:business@sparkalliance.cn">商务合作</a>
        </div>
      </div>

      <!-- 邮件订阅 -->
      <div class="newsletter-bar">
        <div class="nl-content">
          <div class="nl-text">
            <h4>订阅星火动态</h4>
            <p>每周获取产品更新、学习技巧和独家优惠</p>
          </div>
          <form class="nl-form" @submit.prevent="handleSubscribe">
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              aria-label="邮箱地址"
              required
              :disabled="nlLoading"
            />
            <button type="submit" :disabled="nlLoading || !email">
              {{ nlLoading ? '...' : '订阅' }}
            </button>
          </form>
        </div>
        <div role="status" aria-live="polite">
          <Transition name="nl-msg">
            <p v-if="nlSuccess" class="nl-success">订阅成功！感谢关注星火联盟</p>
            <p v-else-if="nlError" class="nl-error">{{ nlError }}</p>
          </Transition>
        </div>
        <p class="nl-hint">随时可取消订阅 · 绝无垃圾邮件</p>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2026 Spark Alliance. All rights reserved.</p>
        <p class="powered-by">
          Powered by
          <span class="tech-tag">Vue 3</span>
          <span class="tech-tag">DeepSeek</span>
          <span class="tech-tag">Supabase</span>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const email = ref('')
const nlLoading = ref(false)
const nlSuccess = ref(false)
const nlError = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const clearSuccessTimer = () => {
  if (successTimer) {
    clearTimeout(successTimer)
    successTimer = null
  }
}

const handleSubscribe = async () => {
  if (!email.value) return
  nlLoading.value = true
  nlError.value = ''
  try {
    // 模拟提交 - 实际接入后替换为 supabase 调用
    await new Promise(resolve => setTimeout(resolve, 800))
    nlSuccess.value = true
    email.value = ''
    clearSuccessTimer()
    successTimer = setTimeout(() => { nlSuccess.value = false }, 4000)
  } catch {
    nlError.value = '订阅失败，请稍后重试'
  } finally {
    nlLoading.value = false
  }
}

onBeforeUnmount(() => {
  clearSuccessTimer()
})
</script>

<style scoped>
.app-footer {
  background-color: rgba(5, 5, 10, 0.6);
  padding: 0 40px 40px;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 顶部渐变装饰线 */
.footer-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), rgba(79, 142, 247, 0.4), transparent);
  margin-bottom: 64px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 48px;
  margin-bottom: 64px;
}

/* 品牌列 */
.brand-col .logo {
  font-size: 18px;
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
}

.brand-col .desc {
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-size: 14px;
  margin-bottom: 24px;
  max-width: 280px;
}

.social-links {
  display: flex;
  gap: 10px;
}

.social-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.social-icon:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  color: white;
  transform: translateY(-2px);
}

/* 链接列 */
.links-col h4 {
  color: white;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
}

.links-col a {
  display: block;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  font-size: 14px;
  transition: color 0.2s, transform 0.2s;
}

.links-col a:hover {
  color: white;
  transform: translateX(4px);
}

/* 邮件订阅 */
.newsletter-bar {
  margin-bottom: 48px;
  padding: 32px;
  background: linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05));
  border: 1px solid rgba(139,92,246,0.1);
  border-radius: 16px;
}

.nl-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.nl-text h4 {
  color: white;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.nl-text p {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.nl-form {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.nl-form input {
  padding: 10px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  outline: none;
  width: 220px;
  transition: all 0.2s;
}

.nl-form input:focus {
  border-color: rgba(139,92,246,0.4);
  background: rgba(255,255,255,0.08);
}

.nl-form input::placeholder {
  color: var(--color-text-muted);
}

.nl-form button {
  padding: 10px 20px;
  background: var(--gradient-brand);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.nl-form button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139,92,246,0.4);
}

.nl-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nl-hint {
  margin-top: 12px;
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}

.nl-success {
  margin-top: 12px;
  font-size: 13px;
  color: #34d399;
  text-align: center;
  font-weight: 500;
}

.nl-error {
  margin-top: 12px;
  font-size: 13px;
  color: #f87171;
  text-align: center;
  font-weight: 500;
}

.nl-msg-enter-active,
.nl-msg-leave-active {
  transition: all 0.3s ease;
}
.nl-msg-enter-from,
.nl-msg-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 底部版权 */
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.04);
  padding-top: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.powered-by {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tech-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.04);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* 响应式 */
@media (max-width: 900px) {
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
  .nl-content { flex-direction: column; text-align: center; }
  .nl-form { width: 100%; }
  .nl-form input { flex: 1; width: auto; }
}

@media (max-width: 600px) {
  .footer-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
}
</style>
