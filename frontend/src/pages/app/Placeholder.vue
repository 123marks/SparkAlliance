<template>
  <div class="placeholder-page">
    <!-- 主视觉区 -->
    <div class="ph-visual">
      <div class="ph-glow"></div>
      <div class="ph-icon">{{ moduleIcon }}</div>
      <h1 class="ph-title">{{ routeName }}</h1>
      <p class="ph-desc">{{ moduleDesc }}</p>
      <div class="ph-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        即将上线
      </div>
    </div>

    <!-- 模块预告功能 -->
    <div class="ph-features" v-if="moduleFeatures.length">
      <h3 class="ph-section-title">✨ 规划中的功能</h3>
      <div class="ph-feature-grid">
        <div class="ph-feature" v-for="(feat, i) in moduleFeatures" :key="i">
          <span class="ph-feat-icon">{{ feat.icon }}</span>
          <div class="ph-feat-body">
            <span class="ph-feat-name">{{ feat.name }}</span>
            <span class="ph-feat-desc">{{ feat.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="ph-footer-hint">
      <p>有任何功能建议？</p>
      <router-link to="/app/feedback" class="ph-feedback-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        提交反馈
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 模块信息映射
interface ModuleInfo {
  name: string
  icon: string
  desc: string
  features: { icon: string; name: string; desc: string }[]
}

const moduleMap: Record<string, ModuleInfo> = {
  AppCompanion: {
    name: '星火伴侣', icon: '💬', desc: '人格化AI助手 + 好友社交 + 动态朋友圈',
    features: [
      { icon: '🤖', name: 'AI 星火助手', desc: '人格化对话伙伴' },
      { icon: '👥', name: '好友系统', desc: 'ID/二维码添加好友' },
      { icon: '💬', name: '混合群聊', desc: '真人+AI 多人互动' },
      { icon: '📸', name: '动态分享', desc: '类朋友圈动态发布' },
    ]
  },
  AppPlanner: {
    name: '星火规划', icon: '🎯', desc: 'AI目标拆分与游戏化成长激励',
    features: [
      { icon: '🧠', name: 'AI 目标规划', desc: '输入目标，AI帮你拆解' },
      { icon: '🌍', name: '3D 激励场景', desc: '完成目标点亮星辰' },
      { icon: '📊', name: '进度追踪', desc: '可视化查看目标进展' },
      { icon: '🤝', name: '好友激励', desc: '互相查看进度加油打气' },
    ]
  },
  AppShop: {
    name: '星火购物', icon: '🛒', desc: '基于位置的二手交易平台',
    features: [
      { icon: '📦', name: '二手交易', desc: '发布/搜索闲置物品' },
      { icon: '📍', name: '就近推荐', desc: 'IP + 标签智能排序' },
      { icon: '🚶', name: '灵活交付', desc: '自取或校园配送' },
      { icon: '🛡️', name: '交易保障', desc: '评价体系 + 纠纷处理' },
    ]
  },
  AppHealth: {
    name: '健康生活', icon: '❤️', desc: '吃饭·睡眠·运动 全方位健康管理',
    features: [
      { icon: '🍱', name: '饮食打卡', desc: '拍照AI识别 + 营养分析' },
      { icon: '😴', name: '睡眠记录', desc: '智能检测睡眠质量' },
      { icon: '🏃', name: '运动统计', desc: '每日步数与运动时长' },
      { icon: '📈', name: '健康报告', desc: '周/月综合分析与建议' },
    ]
  },
  AppTarot: {
    name: '选择卡罗牌', icon: '🎴', desc: '解决选择困难，AI辅助决策',
    features: [
      { icon: '✏️', name: '选项输入', desc: '描述困境，系统拆分选项' },
      { icon: '🃏', name: '卡牌游戏', desc: '洗牌·轮盘·揭牌 趣味互动' },
      { icon: '🤖', name: 'AI 分析', desc: '揭牌后深度分析并给建议' },
      { icon: '📋', name: '行动方案', desc: '根据选择生成执行计划' },
    ]
  },
  AppStudyRoom: {
    name: '星火自习室', icon: '📖', desc: '虚拟在线自习，陪伴式学习',
    features: [
      { icon: '🍅', name: '番茄钟', desc: '专注25分钟 + 休息5分钟' },
      { icon: '👥', name: '好友同桌', desc: '邀请好友进入同一自习室' },
      { icon: '🎵', name: '白噪音', desc: '雨声/咖啡厅/森林背景音' },
      { icon: '🏆', name: '学习排行', desc: '每日/每周时长排名' },
    ]
  },
  AppMentors: {
    name: '学长学姐分享', icon: '🎓', desc: '经验传承 · 学习心得 · 在线答疑',
    features: [
      { icon: '📝', name: '经验分享', desc: '学习/比赛/实习/考研' },
      { icon: '📚', name: '资料分享', desc: '笔记/真题/复习资料' },
      { icon: '💬', name: '在线答疑', desc: '提问互动 + 一对一咨询' },
      { icon: '⭐', name: '认证体系', desc: '优质学长标识与激励' },
    ]
  },
  AppResources: {
    name: '学习资源中心', icon: '📚', desc: '一站式优质学习资源整合',
    features: [
      { icon: '📁', name: '资源分类', desc: '课件/真题/工具/视频' },
      { icon: '🔍', name: '智能搜索', desc: '语义理解 + 模糊匹配' },
      { icon: '⬆️', name: '共建分享', desc: '上传资源获积分奖励' },
      { icon: '⭐', name: '质量评价', desc: '用户评分 + AI审核' },
    ]
  },
  AppTalent: {
    name: '星火人才', icon: '💼', desc: '能力名片 + AI双向匹配求职',
    features: [
      { icon: '🪪', name: '能力名片', desc: '技能标签 + 作品集展示' },
      { icon: '🤖', name: 'AI 匹配', desc: '语义向量精准匹配岗位' },
      { icon: '🏢', name: '企业入驻', desc: '认证企业主动寻人才' },
      { icon: '📊', name: '投递追踪', desc: '全流程看板式管理' },
    ]
  },
  AppNews: {
    name: '星火资讯', icon: '📰', desc: '全网热点聚合 + AI 摘要解读',
    features: [
      { icon: '🔥', name: '今日热榜', desc: '多源融合实时热度排序' },
      { icon: '🏷️', name: '分类频道', desc: '科技/财经/校园/社会' },
      { icon: '🤖', name: 'AI 解读', desc: '一键摘要 + 多角度分析' },
      { icon: '📬', name: '每日简报', desc: '定时推送精选内容' },
    ]
  },
  AppFeedback: {
    name: '用户反馈', icon: '💬', desc: '你的声音，驱动我们变得更好',
    features: [
      { icon: '🐛', name: 'Bug 报告', desc: '发现问题快速提交' },
      { icon: '💡', name: '功能建议', desc: '期望的新功能想法' },
      { icon: '📊', name: '进度追踪', desc: '实时查看处理状态' },
      { icon: '⭐', name: '满意度评价', desc: '解决后反馈体验' },
    ]
  },
}

const info = computed(() => moduleMap[route.name as string])
const routeName = computed(() => info.value?.name || '新功能')
const moduleIcon = computed(() => info.value?.icon || '🚀')
const moduleDesc = computed(() => info.value?.desc || '正在全力开发中，敬请期待...')
const moduleFeatures = computed(() => info.value?.features || [])
</script>

<style scoped>
/* 页面容器 */
.placeholder-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 32px 48px;
}

/* 主视觉区 */
.ph-visual {
  text-align: center;
  position: relative;
  padding: 40px 0;
}
.ph-glow {
  position: absolute; top: 50%; left: 50%;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.ph-icon { font-size: 56px; margin-bottom: 16px; }
.ph-title {
  font-size: 28px; font-weight: 700; color: white;
  margin: 0 0 8px;
}
.ph-desc {
  font-size: 14px; color: rgba(255,255,255,0.4);
  margin: 0 0 20px;
}
.ph-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.2);
  color: #f97316; padding: 6px 18px;
  border-radius: 99px; font-size: 13px; font-weight: 500;
}

/* 功能预告 */
.ph-features { margin-top: 48px; }
.ph-section-title {
  font-size: 16px; font-weight: 600; color: white;
  margin: 0 0 20px; text-align: center;
}
.ph-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.ph-feature {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  transition: border-color 0.2s;
}
.ph-feature:hover { border-color: rgba(255,255,255,0.08); }
.ph-feat-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
.ph-feat-body { display: flex; flex-direction: column; }
.ph-feat-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); }
.ph-feat-desc { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 3px; }

/* 底部反馈提示 */
.ph-footer-hint {
  margin-top: 48px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.ph-footer-hint p {
  font-size: 13px; color: rgba(255,255,255,0.25); margin: 0 0 10px;
}
.ph-feedback-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--color-brand-blue);
  transition: opacity 0.2s;
}
.ph-feedback-link:hover { opacity: 0.8; }

/* 响应式 */
@media (max-width: 640px) {
  .placeholder-page { padding: 40px 16px 32px; }
  .ph-feature-grid { grid-template-columns: 1fr; }
}
</style>
