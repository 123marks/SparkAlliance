<template>
  <section id="pricing" class="pricing-section" ref="sectionRef">
    <div class="pricing-header" :class="{ 'is-visible': isVisible }">
      <span class="eyebrow">会员计划</span>
      <h2 class="title">选择适合你的方案</h2>
      <p class="subtitle">从免费开始，随时升级解锁更多强大功能</p>
    </div>

    <div class="pricing-grid">
      <!-- 免费版 -->
      <div class="pricing-card" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.1s">
        <div class="plan-badge free">入门</div>
        <h3 class="plan-name">基础版</h3>
        <div class="plan-price">
          <span class="currency">¥</span>
          <span class="amount">0</span>
          <span class="period">/永久</span>
        </div>
        <p class="plan-desc">适合刚注册的新用户，体验核心功能</p>
        <ul class="plan-features">
          <li>✅ AI 基础答疑 (20次/天)</li>
          <li>✅ 校园墙浏览与发帖</li>
          <li>✅ 基础课程评价查看</li>
          <li>✅ 学长经验文章浏览</li>
          <li>✅ 每日热榜资讯阅读</li>
          <li>❌ AI 智能选课推荐</li>
          <li>❌ 一对一学长咨询</li>
          <li>❌ 高级学习资源下载</li>
        </ul>
        <button class="plan-btn free-btn">免费注册</button>
      </div>

      <!-- 高级版 (推荐) -->
      <div class="pricing-card featured" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.2s">
        <div class="plan-badge pro">🔥 推荐</div>
        <h3 class="plan-name">高级版</h3>
        <div class="plan-price">
          <span class="currency">¥</span>
          <span class="amount">19.9</span>
          <span class="period">/月</span>
        </div>
        <p class="plan-desc">解锁全部功能，成为学习效率达人</p>
        <ul class="plan-features">
          <li>✅ AI 基础问答额度</li>
          <li>✅ AI 智能选课推荐</li>
          <li>✅ 一对一学长咨询</li>
          <li>✅ 专属学习计划制定</li>
          <li>✅ 全部学习资源下载</li>
          <li>✅ 模拟考试系统</li>
          <li>✅ 星火人才能力名片</li>
          <li>✅ 资讯深度 AI 解读</li>
        </ul>
        <button class="plan-btn pro-btn">立即升级</button>
      </div>

      <!-- 年度版 -->
      <div class="pricing-card" :class="{ 'is-visible': isVisible }" style="transition-delay: 0.3s">
        <div class="plan-badge annual">省 ¥40</div>
        <h3 class="plan-name">年度版</h3>
        <div class="plan-price">
          <span class="currency">¥</span>
          <span class="amount">199</span>
          <span class="period">/年</span>
        </div>
        <p class="plan-desc">全年畅享，额外享受尊贵专属权益</p>
        <ul class="plan-features">
          <li>✅ 高级版全部功能</li>
          <li>✅ 优先客服响应通道</li>
          <li>✅ 年度学习报告生成</li>
          <li>✅ 专属身份标识徽章</li>
          <li>✅ 新功能抢先体验</li>
          <li>✅ 星火人才置顶展示</li>
          <li>✅ AI 简历诊断 (3次)</li>
          <li>✅ 年省 ¥40+</li>
        </ul>
        <button class="plan-btn annual-btn">选择年度</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { threshold: 0.15 })

  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.pricing-section {
  padding: 120px 40px;
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pricing-header {
  text-align: center;
  margin-bottom: 64px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.pricing-header.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.eyebrow {
  color: var(--color-brand-orange);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
  display: block;
}
.title {
  font-size: 40px;
  font-weight: 800;
  margin-bottom: 16px;
}
.subtitle {
  color: var(--color-text-secondary);
  font-size: 18px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1100px;
  width: 100%;
  align-items: stretch;
}

.pricing-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pricing-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.pricing-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
}

/* 推荐卡片高亮 */
.pricing-card.featured {
  border-color: var(--color-brand-purple);
  background: rgba(139, 92, 246, 0.08);
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.15);
  position: relative;
}
.pricing-card.featured::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 20%;
  right: 20%;
  height: 3px;
  background: var(--gradient-brand);
  border-radius: 4px;
}

.plan-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 20px;
  letter-spacing: 1px;
}
.plan-badge.free { background: rgba(255,255,255,0.08); color: var(--color-text-secondary); }
.plan-badge.pro { background: rgba(139,92,246,0.2); color: #a78bfa; }
.plan-badge.annual { background: rgba(249,115,22,0.2); color: #fb923c; }

.plan-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 12px;
}
.currency { font-size: 20px; color: var(--color-text-secondary); font-weight: 600; }
.amount { font-size: 48px; font-weight: 800; }
.period { font-size: 14px; color: var(--color-text-muted); }

.plan-desc {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.plan-features {
  list-style: none;
  text-align: left;
  width: 100%;
  margin-bottom: 32px;
  flex-grow: 1;
}
.plan-features li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.plan-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.plan-btn:hover {
  transform: translateY(-2px);
}
.free-btn { background: rgba(255,255,255,0.08); color: white; }
.free-btn:hover { background: rgba(255,255,255,0.15); }
.pro-btn { background: var(--gradient-brand); color: white; box-shadow: 0 4px 15px rgba(139,92,246,0.4); }
.pro-btn:hover { box-shadow: 0 8px 25px rgba(139,92,246,0.5); }
.annual-btn { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
.annual-btn:hover { background: rgba(249,115,22,0.25); }

@media (max-width: 900px) {
  .pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
}
</style>
