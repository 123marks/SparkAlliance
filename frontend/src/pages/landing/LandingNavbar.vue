<template>
  <nav class="landing-navbar">
    <div class="logo">✦ Spark Alliance</div>
    <div class="nav-links">
      <router-link to="/community">社区</router-link>
      <router-link to="/docs">文档</router-link>
      <router-link to="/changelog">更新日志</router-link>
      <a href="#">关于</a>
    </div>
    <div class="auth-buttons">
      <router-link to="/login" class="btn-ghost">登录</router-link>
      <router-link to="/register" class="btn-primary">立即注册</router-link>
    </div>
  </nav>
</template>
<style scoped>
.landing-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  z-index: 100;
  backdrop-filter: blur(20px);
  background: rgba(10, 10, 15, 0.8);
  font-size: 14px;
  letter-spacing: 0.5px;
  color: var(--color-text-primary);
}
.logo {
  font-weight: 800;
  font-size: 18px;
  color: #fff;
}
.nav-links {
  display: flex;
  gap: 32px;
}
.nav-links a {
  color: var(--color-text-secondary);
  transition: color 0.2s;
}
.nav-links a:hover {
  color: var(--color-text-primary);
}
.auth-buttons {
  display: flex;
  gap: 16px;
  align-items: center;
}
.btn-ghost {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}
.btn-primary {
  background: var(--gradient-brand);
  padding: 8px 16px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}
</style>
