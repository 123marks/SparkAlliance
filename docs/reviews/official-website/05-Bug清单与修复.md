# 官网Bug清单与修复指南

**最后更新**: 2026-03-29  
**优先级**: P0 (立即修复) / P1 (本周修复) / P2 (计划修复)

---

## 一、高优先级Bug (P0)

### 1.1 定价页面缺少月付/年付切换

**影响**: 严重 - 直接影响付费转化率  
**位置**: `src/pages/landing/sections/PricingSection.vue`

**问题描述**:
- 用户无法切换月付/年付
- 年付优惠无法展示
- 缺少价格对比

**修复方案**:
参考 `04-实施代码示例.md` 中的 `PricingToggle.vue` 组件

**预期效果**: 付费转化率提升 20-30%

---

### 1.2 Hero区域缺少社交证明

**影响**: 严重 - 新用户信任度低  
**位置**: `src/pages/landing/sections/HeroSection.vue`

**问题描述**:
- 没有用户数量展示
- 没有客户Logo
- 没有评分展示

**快速修复** (30分钟):
```vue
<!-- 在 HeroSection.vue 的 cta-group 后添加 -->
<div class="hero-proof">
  <div class="avatars">
    <img v-for="i in 5" :key="i" :src="`/avatars/u${i}.jpg`" />
    <span class="more">+10k</span>
  </div>
  <p><strong>10,000+</strong> 大学生正在使用</p>
  <div class="stars">⭐⭐⭐⭐⭐ <span>4.9/5</span></div>
</div>

<style>
.hero-proof {
  margin-top: 32px;
  text-align: center;
}
.avatars {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.avatars img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
  margin-left: -8px;
}
.avatars .more {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-left: -8px;
  border: 2px solid var(--color-bg-primary);
}
</style>
```

---

### 1.3 社区页面数据为静态假数据

**影响**: 严重 - 显得产品不活跃  
**位置**: `src/pages/landing/Community.vue`

**问题描述**:
- 在线人数固定为128
- 帖子数据写死
- 没有实时感

**修复方案**:

```typescript
// composables/useCommunityStats.ts
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'

export function useCommunityStats() {
  const stats = ref({
    online: 0,
    todayPosts: 0,
    totalUsers: 0,
    topUser: ''
  })
  
  onMounted(async () => {
    // 获取统计数据
    const { data } = await supabase
      .from('community_stats')
      .select('*')
      .single()
    
    if (data) {
      stats.value = data
    }
    
    // 订阅实时更新
    supabase
      .channel('community_stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'community_stats' },
        (payload) => {
          stats.value = payload.new
        }
      )
      .subscribe()
  })
  
  return stats
}
```

```sql
-- 创建统计表
CREATE TABLE community_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  online INTEGER DEFAULT 0,
  today_posts INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  top_user TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入初始数据
INSERT INTO community_stats (id, online, today_posts, total_users, top_user)
VALUES (1, 128, 23, 5832, '学霸小明');

-- 创建函数自动更新在线人数
CREATE OR REPLACE FUNCTION update_online_count()
RETURNS void AS $$
BEGIN
  UPDATE community_stats 
  SET online = (SELECT COUNT(*) FROM auth.sessions WHERE created_at > NOW() - INTERVAL '5 minutes'),
      updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- 每分钟执行一次 (在Supabase Cron中设置)
SELECT cron.schedule('update-stats', '* * * * *', 'SELECT update_online_count()');
```

---

## 二、中优先级Bug (P1)

### 2.1 移动端导航菜单动画缺失

**影响**: 中 - 影响移动端用户体验  
**位置**: `src/pages/landing/LandingNavbar.vue`

**当前问题**:
```vue
<!-- 当前代码 - 菜单突然出现 -->
<Transition name="menu-fade">
  <div class="mobile-menu" v-if="isMobileMenuOpen">
    <!-- 内容 -->
  </div>
</Transition>
```

**修复方案**:
```vue
<!-- 改进版 - 添加滑入动画 -->
<Transition name="slide-down">
  <div class="mobile-menu" v-if="isMobileMenuOpen">
    <!-- 内容 -->
  </div>
</Transition>

<style>
.slide-down-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-leave-active {
  transition: all 0.2s ease-in;
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 菜单项依次出现 */
.mobile-menu a {
  opacity: 0;
  transform: translateX(-20px);
  animation: slideIn 0.3s forwards;
}
.mobile-menu a:nth-child(1) { animation-delay: 0.05s; }
.mobile-menu a:nth-child(2) { animation-delay: 0.1s; }
.mobile-menu a:nth-child(3) { animation-delay: 0.15s; }
.mobile-menu a:nth-child(4) { animation-delay: 0.2s; }
.mobile-menu a:nth-child(5) { animation-delay: 0.25s; }

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
```

---

### 2.2 评价区头像使用占位符

**影响**: 中 - 降低可信度  
**位置**: `src/pages/landing/sections/TestimonialsSection.vue`

**当前代码**:
```vue
<div class="t-avatar" :style="{ background: t.color }">{{ t.initial }}</div>
```

**修复方案**:
```vue
<!-- 使用真实头像或更精致的占位符 -->
<div class="t-avatar">
  <img v-if="t.avatarUrl" :src="t.avatarUrl" :alt="t.name" />
  <div v-else class="avatar-placeholder" :style="{ background: t.color }">
    {{ t.initial }}
  </div>
</div>

<style>
.t-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
}

.t-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: white;
}
</style>
```

**建议**: 收集真实用户头像授权，或使用更精致的插画头像

---

### 2.3 页面无骨架屏加载

**影响**: 中 - 首屏体验不佳  
**位置**: 全局

**修复方案**:
```vue
<!-- components/SkeletonLoader.vue -->
<template>
  <div class="skeleton" :style="{ width, height }">
    <div class="shimmer"></div>
  </div>
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '20px' }
})
</script>

<style scoped>
.skeleton {
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.05) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
```

---

## 三、低优先级Bug (P2)

### 3.1 滚动时导航栏变化突兀

**当前问题**: 导航栏背景从透明到半透明没有过渡

**修复**:
```css
.landing-navbar {
  transition: all 0.3s ease;
  background: transparent;
}

.landing-navbar.scrolled {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
```

---

### 3.2 功能卡片hover效果不够明显

**改进**:
```css
.feature-card {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 48px rgba(0,0,0,0.4);
  border-color: rgba(139, 92, 246, 0.3);
}

/* 添加发光效果 */
.feature-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, rgba(139,92,246,0.2), transparent);
  border-radius: inherit;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover::after {
  opacity: 1;
}
```

---

## 四、性能优化建议

### 4.1 图片懒加载

```vue
<!-- 使用原生懒加载 -->
<img 
  src="/hero-image.jpg" 
  loading="lazy"
  alt="Hero"
/>

<!-- 或自定义指令 -->
<img v-lazy="imageUrl" alt="Description" />
```

### 4.2 组件异步加载

```typescript
// router/index.ts
const LandingPage = () => import('@/pages/landing/LandingPage.vue')
const Community = () => import('@/pages/landing/Community.vue')

const routes = [
  { path: '/', component: LandingPage },
  { path: '/community', component: Community }
]
```

### 4.3 动画性能优化

```css
/* 使用 will-change 提示浏览器 */
.feature-card {
  will-change: transform;
}

/* 使用 transform 代替 top/left */
.element {
  transform: translateX(100px);
  /* 而不是 */
  /* left: 100px; */
}

/* 避免在动画中触发重排 */
.animated-element {
  contain: layout style paint;
}
```

---

## 五、待验证问题

以下问题需要进一步确认:

| 问题 | 验证方式 | 备注 |
|------|---------|------|
| 移动端触控区域是否足够大 | 在真机上测试 | 按钮至少44x44px |
| 深色模式对比度是否足够 | 使用对比度检查工具 | WCAG AA标准 |
| 页面加载时间 | Lighthouse测试 | 目标 < 3秒 |
| SEO元标签 | 查看页面源码 | 确保有description |

---

## 六、修复时间表

```
第1天 (P0 Bug)
├── 上午: 添加Hero社交证明 (30分钟)
├── 上午: 修复社区统计数据 (2小时)
├── 下午: 添加定价月付/年付切换 (3小时)
└── 晚上: 测试并部署

第2-3天 (P1 Bug)
├── 移动端导航动画
├── 评价区头像改进
└── 骨架屏加载

第4-5天 (P2 + 优化)
├── 导航栏过渡优化
├── 性能优化
└── 全面测试
```

---

**建议**: 优先修复P0级别的Bug，这些问题直接影响用户体验和转化率。P1和P2可以排期在接下来的一周内逐步修复。
