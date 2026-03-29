<template>
  <div class="hero-social-proof">
    <!-- 头像堆叠 + 评分 -->
    <div class="proof-row">
      <div class="avatars-stack">
        <div
          v-for="(avatar, i) in avatars"
          :key="i"
          class="avatar-circle"
          :style="{ background: avatar.color, zIndex: avatars.length - i }"
        >
          {{ avatar.initial }}
        </div>
        <div class="more-circle">+2k</div>
      </div>

      <div class="proof-text">
        <div class="stars-row">
          <span v-for="i in 5" :key="i" class="star">★</span>
          <span class="rating-text">4.9/5</span>
        </div>
        <p class="user-count"><strong>10,000+</strong> 名大学生正在使用</p>
      </div>
    </div>

    <!-- 高校展示 -->
    <div class="schools-row">
      <span class="from-label">来自</span>
      <span class="school-name" v-for="school in schools" :key="school">{{ school }}</span>
      <span class="more-text">等 500+ 所高校</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const avatars = [
  { initial: '李', color: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)' },
  { initial: '王', color: 'linear-gradient(135deg, #f97316, #f43f5e)' },
  { initial: '张', color: 'linear-gradient(135deg, #10b981, #3b82f6)' },
  { initial: '赵', color: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { initial: '刘', color: 'linear-gradient(135deg, #14b8a6, #10b981)' },
]

const schools = ['清华大学', '北京大学', '复旦大学', '浙江大学']
</script>

<style scoped>
.hero-social-proof {
  margin-top: 40px;
  padding: 20px 28px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.proof-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatars-stack {
  display: flex;
  align-items: center;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  border: 2px solid var(--color-bg-primary);
  margin-left: -10px;
  position: relative;
}

.avatar-circle:first-child {
  margin-left: 0;
}

.more-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
  margin-left: -10px;
  border: 2px solid var(--color-bg-primary);
}

.proof-text {
  text-align: left;
}

.stars-row {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-bottom: 4px;
}

.star {
  color: #fbbf24;
  font-size: 13px;
}

.rating-text {
  margin-left: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.user-count {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.user-count strong {
  color: white;
  font-weight: 700;
}

.schools-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.from-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.school-name {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 2px 8px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
}

.more-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
  .proof-row {
    flex-direction: column;
    gap: 12px;
  }
  .proof-text {
    text-align: center;
  }
  .stars-row {
    justify-content: center;
  }
}
</style>
