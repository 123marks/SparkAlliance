<template>
  <div class="pricing-comparison">
    <button class="comparison-toggle" @click="isExpanded = !isExpanded">
      <span>{{ isExpanded ? '收起' : '展开' }}详细功能对比</span>
      <svg
        :class="['toggle-arrow', { open: isExpanded }]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <Transition name="expand">
      <div v-show="isExpanded" class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th class="feature-col">功能</th>
              <th>基础版</th>
              <th class="highlight-col">高级版</th>
              <th>年度版</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feature in features" :key="feature.name">
              <td class="feature-col">
                <strong>{{ feature.name }}</strong>
                <span class="feature-desc">{{ feature.desc }}</span>
              </td>
              <td><span :class="getCellClass(feature.free)">{{ getCellText(feature.free) }}</span></td>
              <td class="highlight-col"><span :class="getCellClass(feature.pro)">{{ getCellText(feature.pro) }}</span></td>
              <td><span :class="getCellClass(feature.annual)">{{ getCellText(feature.annual) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isExpanded = ref(false)

const features = [
  { name: 'AI 助手调用', desc: '每日可用次数', free: '20次/天', pro: '无限', annual: '无限' },
  { name: '多模型切换', desc: 'DeepSeek/豆包/千问', free: false, pro: true, annual: true },
  { name: '校园墙发帖', desc: '发布动态内容', free: true, pro: true, annual: true },
  { name: '智能日程管理', desc: '课表/提醒/规划', free: true, pro: true, annual: true },
  { name: '星火自习室', desc: '在线学习空间', free: true, pro: true, annual: true },
  { name: '商品曝光加持', desc: '购物展示优先级', free: '普通', pro: '优先', annual: '置顶' },
  { name: '人才名片置顶', desc: '求职展示优先级', free: false, pro: true, annual: true },
  { name: '共创项目推荐', desc: '精选项目展示', free: false, pro: true, annual: true },
  { name: '资讯AI解读', desc: '深度内容分析', free: false, pro: true, annual: true },
  { name: '专属身份徽章', desc: '个性化标识', free: false, pro: true, annual: true },
  { name: '优先客服通道', desc: '快速响应支持', free: false, pro: false, annual: true },
  { name: '年度学习报告', desc: '数据分析报告', free: false, pro: false, annual: true },
  { name: 'AI简历诊断', desc: '简历优化建议', free: false, pro: false, annual: '3次' },
  { name: '新功能抢先体验', desc: 'Beta功能优先', free: false, pro: false, annual: true },
]

const getCellText = (val: boolean | string) => {
  if (val === true) return '✓'
  if (val === false) return '—'
  return val
}

const getCellClass = (val: boolean | string) => {
  if (val === true) return 'cell-check'
  if (val === false) return 'cell-dash'
  return 'cell-text'
}
</script>

<style scoped>
.pricing-comparison {
  max-width: 900px;
  width: 100%;
  margin-top: 60px;
}

.comparison-toggle {
  width: 100%;
  padding: 16px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.comparison-toggle:hover {
  background: rgba(255,255,255,0.04);
  color: white;
}

.toggle-arrow {
  width: 18px;
  height: 18px;
  transition: transform 0.3s;
}

.toggle-arrow.open {
  transform: rotate(180deg);
}

.comparison-table-wrapper {
  margin-top: 16px;
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

.comparison-table th,
.comparison-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  text-align: center;
  font-size: 14px;
}

.comparison-table th {
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 18px;
}

.feature-col {
  text-align: left !important;
  min-width: 200px;
}

.feature-col strong {
  display: block;
  color: white;
  font-size: 14px;
  margin-bottom: 2px;
}

.feature-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.highlight-col {
  background: rgba(139,92,246,0.04);
}

.cell-check {
  color: #10b981;
  font-weight: 700;
  font-size: 16px;
}

.cell-dash {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.cell-text {
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
