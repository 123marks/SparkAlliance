<template>
  <section class="testimonials-section" ref="sectionRef">
    <div class="header" :class="{ 'is-visible': isVisible }">
      <span class="section-eyebrow">用户好评</span>
      <h2 class="section-title">听到他们的声音</h2>
      <p class="section-subtitle" style="margin: 0 auto">来自全国各大高校学生的真实反馈</p>
    </div>

    <!-- 无限跑马灯 -->
    <div class="marquee-wrapper">
      <div class="marquee" :style="{ animationDuration: speed + 's' }">
        <div class="marquee-content">
          <div class="t-card" v-for="t in testimonials" :key="t.name">
            <div class="t-top">
              <div class="t-header">
                <div class="t-avatar" :style="{ background: t.color }">{{ t.initial }}</div>
                <div class="t-info">
                  <h4>{{ t.name }}</h4>
                  <span>{{ t.college }} · {{ t.major }}</span>
                </div>
              </div>
              <div class="t-stars">
                <svg v-for="n in 5" :key="n" width="14" height="14" viewBox="0 0 24 24" :fill="n <= t.rating ? '#f97316' : 'none'" :stroke="n <= t.rating ? '#f97316' : 'rgba(255,255,255,0.2)'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
            </div>
            <p class="t-content">"{{ t.content }}"</p>
            <div class="t-bottom">
              <div class="t-feature" v-if="t.feature">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {{ t.feature }}
              </div>
              <span class="t-duration" v-if="t.duration">{{ t.duration }}</span>
            </div>
          </div>
        </div>
        <!-- 克隆用于无缝循环 -->
        <div class="marquee-content" aria-hidden="true">
          <div class="t-card" v-for="t in testimonials" :key="t.name + '-clone'">
            <div class="t-top">
              <div class="t-header">
                <div class="t-avatar" :style="{ background: t.color }">{{ t.initial }}</div>
                <div class="t-info">
                  <h4>{{ t.name }}</h4>
                  <span>{{ t.college }} · {{ t.major }}</span>
                </div>
              </div>
              <div class="t-stars">
                <svg v-for="n in 5" :key="n" width="14" height="14" viewBox="0 0 24 24" :fill="n <= t.rating ? '#f97316' : 'none'" :stroke="n <= t.rating ? '#f97316' : 'rgba(255,255,255,0.2)'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
            </div>
            <p class="t-content">"{{ t.content }}"</p>
            <div class="t-bottom">
              <div class="t-feature" v-if="t.feature">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {{ t.feature }}
              </div>
              <span class="t-duration" v-if="t.duration">{{ t.duration }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const speed = ref(35)
const isVisible = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const testimonials = ref([
  {
    name: '李同学', initial: '李', college: '清华大学', major: '计算机科学', rating: 5,
    content: 'DeepSeek 模型本地部署，解算法题超级方便。分步讲解功能帮我搞定了操作系统的期末复习，直接从 B 提到了 A。',
    color: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)',
    feature: '最爱功能：AI 学习助手',
    duration: '使用 3 个月'
  },
  {
    name: '王同学', initial: '王', college: '北京大学', major: '法学', rating: 5,
    content: '深色护眼模式太棒了，晚上刷法条资料眼睛一点都不累。极简的界面设计让我能完全专注在学习上。',
    color: 'linear-gradient(135deg, #f97316, #f43f5e)',
    feature: '最爱功能：沉浸式阅读',
    duration: '使用 5 个月'
  },
  {
    name: '张同学', initial: '张', college: '复旦大学', major: '数字媒体', rating: 5,
    content: '玻璃拟态的 UI 简直是艺术品！动画过渡极其流畅，作为设计系学生，这个 App 的视觉品质让我心服口服。',
    color: 'linear-gradient(135deg, #10b981, #3b82f6)',
    feature: '最爱功能：UI 视觉体验',
    duration: '使用 2 个月'
  },
  {
    name: '赵同学', initial: '赵', college: '浙江大学', major: '金融学', rating: 4,
    content: '校园动态墙帮我认识了很多跨专业的朋友。半匿名的机制让大家更敢说真话，推荐算法也越来越懂我了。',
    color: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    feature: '最爱功能：校园动态墙',
    duration: '使用 4 个月'
  },
  {
    name: '刘同学', initial: '刘', college: '上海交大', major: '电子信息', rating: 5,
    content: '日程管理逻辑非常清晰，课表直接导入，AI 还会在 DDL 前提醒我。自从用了它就再也没错过截止日期！',
    color: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    feature: '最爱功能：智能日程',
    duration: '使用 6 个月'
  },
  {
    name: '陈同学', initial: '陈', college: '南京大学', major: '哲学', rating: 5,
    content: '学长推荐系统帮我找到了一位完美的考研学姐，从选校到复习计划全程指导，少走了太多弯路。',
    color: 'linear-gradient(135deg, #14b8a6, #10b981)',
    feature: '最爱功能：学长推荐',
    duration: '使用 3 个月'
  },
  {
    name: '孙同学', initial: '孙', college: '武汉大学', major: '新闻传播', rating: 5,
    content: '全网资讯聚合功能太实用了，不用再切换好几个APP看新闻。AI解读帮我快速get要点，写作业引用资料效率翻倍。',
    color: 'linear-gradient(135deg, #ef4444, #f97316)',
    feature: '最爱功能：资讯聚合',
    duration: '使用 2 个月'
  },
  {
    name: '周同学', initial: '周', college: '同济大学', major: '建筑学', rating: 5,
    content: '星火共创让我找到了志同道合的队友，我们一起做的建筑可视化项目拿了校级创新比赛一等奖！',
    color: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    feature: '最爱功能：星火共创',
    duration: '使用 4 个月'
  },
  {
    name: '吴同学', initial: '吴', college: '中山大学', major: '临床医学', rating: 5,
    content: '医学知识点太多了，AI助手帮我整理病理学笔记简直是神器。考前突击复习效率提升了至少50%。',
    color: 'linear-gradient(135deg, #ec4899, #a855f7)',
    feature: '最爱功能：AI 笔记整理',
    duration: '使用 5 个月'
  },
  {
    name: '郑同学', initial: '郑', college: '华中科大', major: '材料科学', rating: 4,
    content: '校园购物功能太方便了，在宿舍就能买到实验室隔壁楼同学的二手教材，省钱又环保。',
    color: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    feature: '最爱功能：校园购物',
    duration: '使用 1 个月'
  },
  {
    name: '黄同学', initial: '黄', college: '厦门大学', major: '国际经贸', rating: 5,
    content: '人才匹配帮我找到了一份很不错的实习，简历诊断功能指出了好几个我没注意的问题，面试通过率明显提高。',
    color: 'linear-gradient(135deg, #10b981, #06b6d4)',
    feature: '最爱功能：人才匹配',
    duration: '使用 3 个月'
  },
  {
    name: '林同学', initial: '林', college: '四川大学', major: '心理学', rating: 5,
    content: '星火自习室的番茄钟+环境白噪音组合绝了，帮我养成了每天固定自习的习惯，期末GPA创了新高。',
    color: 'linear-gradient(135deg, #a855f7, #3b82f6)',
    feature: '最爱功能：星火自习室',
    duration: '使用 6 个月'
  }
])

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { threshold: 0.1 })
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onBeforeUnmount(() => { observer?.disconnect() })
</script>

<style scoped>
.testimonials-section {
  padding: 120px 0;
  background-color: transparent;
  overflow: hidden;
}

.header {
  text-align: center;
  margin-bottom: 64px;
  padding: 0 40px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.header.is-visible { opacity: 1; transform: translateY(0); }

/* 跑马灯 */
.marquee-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  padding: 20px 0;
}

.marquee-wrapper::before,
.marquee-wrapper::after {
  content: '';
  position: absolute;
  top: 0; width: 120px; height: 100%;
  z-index: 10; pointer-events: none;
}
.marquee-wrapper::before { left: 0; background: linear-gradient(to right, var(--color-bg-primary), transparent); }
.marquee-wrapper::after { right: 0; background: linear-gradient(to left, var(--color-bg-primary), transparent); }

.marquee {
  display: flex;
  width: fit-content;
  animation: scrollMarquee linear infinite;
}
.marquee:hover { animation-play-state: paused; }

@keyframes scrollMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.marquee-content {
  display: flex;
  gap: 20px;
  padding: 0 10px;
}

/* 评论卡片 */
.t-card {
  width: 380px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 28px;
  flex-shrink: 0;
  transition: transform 0.3s ease, border-color 0.3s ease;
  display: flex;
  flex-direction: column;
}
.t-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.12);
}

.t-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.t-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.t-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: white;
}

.t-info h4 { color: white; font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.t-info span { color: var(--color-text-muted); font-size: 12px; }

.t-stars {
  display: flex; gap: 2px;
  flex-shrink: 0;
}

.t-content {
  color: var(--color-text-secondary);
  line-height: 1.65;
  font-size: 14px;
  flex-grow: 1;
  margin-bottom: 16px;
}

.t-feature {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-brand-green);
}

.t-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.t-duration {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 2px 8px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
}
</style>
