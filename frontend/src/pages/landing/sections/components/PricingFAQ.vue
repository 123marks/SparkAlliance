<template>
  <div class="pricing-faq">
    <h3 class="faq-title">常见问题</h3>

    <div class="faq-list">
      <div
        v-for="(item, index) in faqs"
        :key="index"
        :class="['faq-item', { active: activeIndex === index }]"
      >
        <button class="faq-question" @click="toggle(index)">
          <span>{{ item.q }}</span>
          <svg
            class="arrow"
            :class="{ open: activeIndex === index }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <Transition name="faq">
          <div v-show="activeIndex === index" class="faq-answer">
            {{ item.a }}
          </div>
        </Transition>
      </div>
    </div>

    <div class="faq-contact">
      <p>还有其他问题？</p>
      <div class="contact-links">
        <a href="mailto:support@sparkalliance.cn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          发送邮件
        </a>
        <router-link to="/community">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          社区讨论
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeIndex = ref(-1)

const toggle = (i: number) => {
  activeIndex.value = activeIndex.value === i ? -1 : i
}

const faqs = [
  {
    q: '免费版有哪些限制？',
    a: '免费版每天可以使用AI助手20次，可以浏览和发布校园墙动态，使用智能日程等基础功能。如果需要更多AI调用次数和高级功能，建议升级到付费版。付费用户可享受无限AI调用、多模型切换、流量加持等特权。'
  },
  {
    q: '如何取消订阅？',
    a: '您可以随时在「个人中心 - 会员管理」中取消订阅。取消后，您仍可使用付费功能直到当前计费周期结束。我们不会收取任何额外费用。'
  },
  {
    q: '支持哪些支付方式？',
    a: '我们支持支付宝、微信支付、银行卡等多种支付方式。所有支付均通过加密通道处理，安全可靠。'
  },
  {
    q: '学生有额外优惠吗？',
    a: '是的！通过 .edu 邮箱认证的学生可以享受年度版额外9折优惠。认证后在会员页面领取优惠码即可。此外，我们还会不定期举办学生专属优惠活动。'
  },
  {
    q: '可以退款吗？',
    a: '购买后7天内，如果您对服务不满意，可以申请全额退款，无需说明理由。超过7天按比例退款。退款将在3-5个工作日内原路返回。'
  },
  {
    q: '企业/团队如何使用？',
    a: '我们提供企业版方案，支持团队管理、权限控制、统一账单、API接入等功能。请联系 business@sparkalliance.cn 获取定制报价，或预约产品演示。'
  }
]
</script>

<style scoped>
.pricing-faq {
  max-width: 800px;
  width: 100%;
  margin-top: 80px;
}

.faq-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 40px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.faq-item:hover {
  background: rgba(255,255,255,0.04);
}

.faq-item.active {
  background: rgba(255,255,255,0.04);
  border-color: rgba(139,92,246,0.2);
}

.faq-question {
  width: 100%;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}

.arrow {
  width: 20px;
  height: 20px;
  transition: transform 0.3s;
  flex-shrink: 0;
  margin-left: 16px;
}

.arrow.open {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 24px 20px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-size: 14px;
}

/* Transition */
.faq-enter-active,
.faq-leave-active {
  transition: all 0.3s ease;
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.faq-contact {
  margin-top: 40px;
  text-align: center;
  padding: 32px;
  background: linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05));
  border-radius: 16px;
  border: 1px solid rgba(139,92,246,0.1);
}

.faq-contact p {
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.contact-links {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.contact-links a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  color: white;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.contact-links a:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-1px);
}

.contact-links a svg {
  width: 16px;
  height: 16px;
}
</style>
