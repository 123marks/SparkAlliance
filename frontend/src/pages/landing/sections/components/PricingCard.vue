<template>
  <div :class="['pricing-card', { featured }]">
    <div :class="['plan-badge', badgeType]">{{ badge }}</div>

    <h3 class="plan-name">{{ name }}</h3>

    <div class="plan-price">
      <span class="currency">¥</span>
      <span class="amount">{{ displayPrice }}</span>
      <span class="period">/{{ badgeType === 'annual' ? '年' : '月' }}</span>
    </div>

    <p v-if="savings" class="savings-text">相比月付 {{ savings }}</p>

    <p class="plan-desc">{{ description }}</p>

    <ul class="plan-features">
      <li
        v-for="(feature, i) in features"
        :key="i"
        :class="{
          included: feature.included,
          excluded: !feature.included,
          highlight: feature.highlight
        }"
      >
        <span class="check">{{ feature.included ? '✓' : '—' }}</span>
        {{ feature.text }}
      </li>
    </ul>

    <router-link
      :to="ctaLink"
      :class="['plan-btn', `${badgeType}-btn`]"
    >
      {{ cta }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Feature {
  text: string
  included: boolean
  highlight?: boolean
}

const props = withDefaults(defineProps<{
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  badge: string
  badgeType: 'free' | 'pro' | 'annual'
  features: Feature[]
  cta: string
  ctaLink: string
  isAnnual?: boolean
  featured?: boolean
  savings?: string | null
}>(), {
  isAnnual: false,
})

const displayPrice = computed(() => {
  if (props.badgeType === 'free') return '0'
  if (props.badgeType === 'annual') return '199'
  return props.monthlyPrice === 0 ? '0' : props.monthlyPrice.toFixed(props.monthlyPrice < 10 ? 1 : 0)
})
</script>

<style scoped>
.pricing-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.pricing-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
}

.pricing-card.featured {
  border-color: var(--color-brand-purple);
  background: linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 100%);
  box-shadow: 0 0 60px rgba(139,92,246,0.15);
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
.plan-badge.pro { background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3)); color: #c4b5fd; }
.plan-badge.annual { background: linear-gradient(135deg, rgba(249,115,22,0.3), rgba(244,63,94,0.3)); color: #fdba74; }

.plan-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.currency { font-size: 20px; color: var(--color-text-secondary); font-weight: 600; }
.amount { font-size: 48px; font-weight: 800; }
.period { font-size: 14px; color: var(--color-text-muted); }

.savings-text {
  font-size: 12px;
  color: var(--color-brand-orange);
  margin-bottom: 12px;
  font-weight: 500;
}

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
  padding: 10px 0;
  font-size: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  display: flex;
  align-items: center;
  gap: 10px;
}

.plan-features li .check {
  width: 20px;
  text-align: center;
  font-weight: 700;
  flex-shrink: 0;
}

.plan-features li.included {
  color: var(--color-text-secondary);
}

.plan-features li.included .check {
  color: #10b981;
}

.plan-features li.excluded {
  color: var(--color-text-muted);
}

.plan-features li.excluded .check {
  color: var(--color-text-muted);
}

.plan-features li.highlight {
  color: #fbbf24;
}

.plan-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-decoration: none;
  text-align: center;
  display: block;
}

.plan-btn:hover {
  transform: translateY(-2px);
}

.free-btn {
  background: rgba(255,255,255,0.08);
  color: white;
}
.free-btn:hover {
  background: rgba(255,255,255,0.15);
}

.pro-btn {
  background: var(--gradient-brand);
  color: white;
  box-shadow: 0 4px 15px rgba(139,92,246,0.4);
}
.pro-btn:hover {
  box-shadow: 0 8px 25px rgba(139,92,246,0.5);
}

.annual-btn {
  background: linear-gradient(135deg, rgba(249,115,22,0.2), rgba(244,63,94,0.2));
  color: #fb923c;
  border: 1px solid rgba(249,115,22,0.3);
}
.annual-btn:hover {
  background: linear-gradient(135deg, rgba(249,115,22,0.3), rgba(244,63,94,0.3));
}
</style>
