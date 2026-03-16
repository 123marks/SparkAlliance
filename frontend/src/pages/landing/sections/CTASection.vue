<template>
  <section class="cta-section">
    <div class="cta-container">
      <div class="glow-bg"></div>
      <div class="cta-content">
        <h2>准备好颠覆你的校园体验了吗？</h2>
        <p>加入数千名先行者的行列，一起共建最智能的星火校园社区。</p>
        <div class="action-btns">
          <router-link to="/register" class="btn-primary-large">立即免费注册</router-link>
          <router-link to="/community" class="btn-ghost-large">看看大家怎么说</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta-section {
  padding: 100px 40px;
  background-color: var(--color-bg-primary);
  display: flex;
  justify-content: center;
}

.cta-container {
  max-width: 1000px;
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 32px;
  padding: 80px 40px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}

.glow-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

.cta-content {
  position: relative;
  z-index: 2;
}

h2 {
  font-size: 48px;
  font-weight: 800;
  color: white;
  margin-bottom: 24px;
  line-height: 1.2;
}

p {
  font-size: 20px;
  color: var(--color-text-secondary);
  margin-bottom: 48px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.action-btns {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-primary-large {
  background: var(--gradient-brand);
  color: white;
  padding: 0 40px;
  height: 56px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
}

.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px rgba(139, 92, 246, 0.5);
}

.btn-ghost-large {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0 40px;
  height: 56px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-ghost-large:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 768px) {
  h2 { font-size: 32px; }
  .action-btns { flex-direction: column; }
}
</style>
