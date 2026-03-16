<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-grid">
        <div class="brand-col">
          <h3 class="logo">✦ Spark Alliance</h3>
          <p class="desc">点亮校园时光，连接你我他。用 AI 赋能新时代的大学生生活体验。</p>
          <div class="social-links">
            <a href="#" class="social-icon">W</a>
            <a href="#" class="social-icon">B</a>
            <a href="#" class="social-icon">G</a>
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
          <a href="#">开放 API</a>
          <a href="#">开源仓库</a>
          <a href="#">设计规范</a>
          <a href="#">系统状态</a>
        </div>
        
        <div class="links-col">
          <h4>关于</h4>
          <a href="#">团队介绍</a>
          <a href="#">服务条款</a>
          <a href="#">隐私政策</a>
          <a href="#">加入我们</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2026 Spark Alliance. All rights reserved.</p>
        <p class="powered-by">Powered by Vue 3 & DeepSeek & YOU</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background-color: var(--color-bg-secondary);
  padding: 80px 40px 40px;
  border-top: 1px solid var(--color-border);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 80px;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
}

@media (max-width: 600px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}

.brand-col .logo {
  font-size: 20px;
  font-weight: 800;
  color: white;
  margin-bottom: 20px;
}

.brand-col .desc {
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 24px;
  max-width: 300px;
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-family: monospace;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.social-icon:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.links-col h4 {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 24px;
}

.links-col a {
  display: block;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  font-size: 14px;
  transition: color 0.2s;
}

.links-col a:hover {
  color: var(--color-brand-blue);
}

.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding-top: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.powered-by {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 600px) {
  .footer-bottom {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
