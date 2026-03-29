<template>
  <section id="pricing" class="pricing-section" ref="sectionRef">
    <div class="pricing-header" :class="{ 'is-visible': isVisible }">
      <span class="eyebrow">会员计划</span>
      <h2 class="title">选择适合你的方案</h2>
      <p class="subtitle">基础功能永久免费，AI 调用需消耗额度，升级解锁无限 AI 与专属权益</p>
    </div>

    <!-- 月付/年付切换 -->
    <PricingToggle v-model="isAnnual" />

    <div class="pricing-grid">
      <!-- 免费版 -->
      <PricingCard
        v-bind="freePlan"
        :is-annual="isAnnual"
      />

      <!-- 高级版 (推荐) -->
      <PricingCard
        v-bind="proPlan"
        :is-annual="isAnnual"
        featured
      />

      <!-- 年度版 -->
      <PricingCard
        v-bind="annualPlan"
        :is-annual="isAnnual"
      />
    </div>

    <!-- 功能对比表格 -->
    <PricingComparison />

    <!-- FAQ -->
    <PricingFAQ />

    <!-- 信任徽章 -->
    <TrustBadges />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PricingToggle from './components/PricingToggle.vue'
import PricingCard from './components/PricingCard.vue'
import PricingComparison from './components/PricingComparison.vue'
import PricingFAQ from './components/PricingFAQ.vue'
import TrustBadges from './components/TrustBadges.vue'

const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const isAnnual = ref(true)
let observer: IntersectionObserver | null = null

// 定价数据
const freePlan = {
  name: '基础版',
  description: '适合刚注册的新用户，体验核心功能',
  monthlyPrice: 0,
  annualPrice: 0,
  badge: '入门',
  badgeType: 'free' as const,
  features: [
    { text: 'AI 智能助手 (20次/天)', included: true },
    { text: '校园墙浏览与发帖', included: true },
    { text: '智能日程管理', included: true },
    { text: '星火自习室', included: true },
    { text: '星火共创广场浏览', included: true },
    { text: '每日热榜资讯阅读', included: true },
    { text: 'AI 无限调用额度', included: false },
    { text: '人才招募置顶展示', included: false },
  ],
  cta: '免费注册',
  ctaLink: '/register'
}

const proPlan = computed(() => ({
  name: '高级版',
  description: '解锁全部功能，成为学习效率达人',
  monthlyPrice: 19.9,
  annualPrice: 16.6,
  badge: '推荐',
  badgeType: 'pro' as const,
  features: [
    { text: 'AI 无限调用额度', included: true },
    { text: '多模型切换 (DeepSeek/豆包/千问)', included: true },
    { text: '购物商品流量加持曝光', included: true },
    { text: '人才能力名片置顶', included: true },
    { text: '星火共创项目精选推荐', included: true },
    { text: '全部学习资源下载', included: true },
    { text: '资讯深度 AI 解读', included: true },
    { text: '专属身份标识徽章', included: true },
  ],
  cta: '立即升级',
  ctaLink: '/register?plan=pro',
  savings: isAnnual.value ? '省 ¥40' : null
}))

const annualPlan = {
  name: '年度版',
  description: '全年畅享，额外享受尊贵专属权益',
  monthlyPrice: 19.9,
  annualPrice: 199,
  badge: '省 ¥40',
  badgeType: 'annual' as const,
  features: [
    { text: '高级版全部功能', included: true },
    { text: '优先客服响应通道', included: true, highlight: true },
    { text: '年度学习报告生成', included: true, highlight: true },
    { text: '专属身份标识徽章', included: true },
    { text: '新功能抢先体验', included: true, highlight: true },
    { text: '购物商品最高曝光加持', included: true },
    { text: 'AI 简历诊断 (3次)', included: true, highlight: true },
    { text: '7天无理由退款保障', included: true, highlight: true },
  ],
  cta: '选择年度',
  ctaLink: '/register?plan=annual'
}

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
  margin-bottom: 48px;
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
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
  .pricing-section { padding: 80px 20px; }
}
</style>
