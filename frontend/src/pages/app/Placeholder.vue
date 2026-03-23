<template>
  <div class="coming-soon">
    <div class="icon">🚧</div>
    <h2>{{ routeName }}</h2>
    <p>正在全力开发中，敬请期待...</p>
    <span class="badge">即将上线</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const routeNameMap: Record<string, string> = {
  'AppNews': '星火资讯',
  'AppTalent': '星火人才',
  'AppSchedule': '智能日程',
  'AppCourses': 'AI选课助手',
  'AppShop': '校园购物',
  'AppHealth': '健康打卡',
  'AppResources': '学习资源',
  'AppMentors': '学长推荐'
}
const routeName = computed(() => routeNameMap[route.name as string] || '新功能')
</script>

<style scoped>
.coming-soon {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 60vh; gap: 16px;
  color: rgba(255,255,255,0.6);
}
.icon { font-size: 64px; }
h2 { font-size: 24px; color: white; font-weight: 700; margin: 0; }
p { font-size: 16px; margin: 0; }
.badge { 
  background: rgba(249,115,22,0.15); color: #f97316;
  border: 1px solid rgba(249,115,22,0.3);
  padding: 4px 16px; border-radius: 99px; font-size: 13px;
}
</style>
