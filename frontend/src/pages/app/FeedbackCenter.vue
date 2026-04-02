<template>
  <div class="feedback-center">
    <!-- 顶部标题 + 简介 -->
    <header class="fb-header">
      <div>
        <h1>反馈中心</h1>
        <p>你的声音，驱动我们变得更好</p>
      </div>
    </header>

    <!-- Tab 导航 -->
    <nav class="fb-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="fb-tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </nav>

    <!-- ====================== 提交反馈 ====================== -->
    <section v-if="activeTab === 'submit'" class="fb-section">
      <div class="form-card">
        <h2>提交新反馈</h2>

        <!-- 反馈类型选择 -->
        <div class="fb-type-grid">
          <button
            v-for="t in typeOptions"
            :key="t.value"
            class="type-btn"
            :class="{ active: form.type === t.value }"
            @click="form.type = t.value as FeedbackType"
          >
            <span class="type-icon">{{ t.icon }}</span>
            <span class="type-name">{{ t.label }}</span>
          </button>
        </div>

        <!-- 表单主体 -->
        <div class="fb-form">
          <div class="form-group">
            <label>标题 <span class="required">*</span></label>
            <input v-model="form.title" type="text" placeholder="简洁描述你的反馈（2-200字）" maxlength="200" />
            <span class="char-count">{{ form.title.length }}/200</span>
          </div>

          <div class="form-group">
            <label>详细描述 <span class="required">*</span></label>
            <textarea
              v-model="form.description"
              :placeholder="descPlaceholder"
              rows="6"
              maxlength="2000"
            ></textarea>
            <span class="char-count">{{ form.description.length }}/2000</span>
          </div>

          <!-- Bug 特有字段 -->
          <template v-if="form.type === 'bug'">
            <div class="form-row">
              <div class="form-group half">
                <label>问题类型</label>
                <SparkSelect v-model="form.bug_type" :options="bugTypeOptions" placeholder="选择问题类型" />
              </div>
              <div class="form-group half">
                <label>严重程度</label>
                <SparkSelect v-model="form.severity" :options="severityOptions" placeholder="选择严重程度" />
              </div>
            </div>
            <div class="form-group">
              <label>复现步骤 <span class="hint">(选填，每行一步)</span></label>
              <textarea v-model="form.stepsText" rows="4" placeholder="1. 打开某页面&#10;2. 点击某按钮&#10;3. 看到错误信息"></textarea>
            </div>
          </template>

          <!-- 建议特有字段 -->
          <template v-if="form.type === 'feature'">
            <div class="form-group">
              <label>重要性</label>
              <SparkSelect v-model="form.importance" :options="importanceOptions" placeholder="选择重要性" />
            </div>
            <div class="form-group">
              <label>使用场景 <span class="hint">(选填)</span></label>
              <textarea v-model="form.use_case" rows="3" placeholder="在什么场景下需要这个功能？"></textarea>
            </div>
          </template>

          <!-- 通用字段 -->
          <div class="form-row">
            <div class="form-group half">
              <label>关联模块</label>
              <SparkSelect v-model="form.module" :options="moduleOptions" placeholder="选择关联模块" />
            </div>
            <div class="form-group half">
              <label>联系邮箱 <span class="hint">(选填)</span></label>
              <input v-model="form.contact_email" type="email" placeholder="方便我们回复你" />
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.is_public" />
              公开到反馈广场（让其他用户也能看到并投票）
            </label>
          </div>

          <!-- 环境信息预览 -->
          <details class="env-details">
            <summary>📋 自动采集的环境信息</summary>
            <div class="env-grid">
              <div v-for="(val, key) in envInfo" :key="key" class="env-item">
                <span class="env-key">{{ key }}</span>
                <span class="env-val">{{ val }}</span>
              </div>
            </div>
          </details>

          <!-- 提交 -->
          <div class="form-actions">
            <button class="btn ghost" type="button" @click="resetForm">重置</button>
            <button
              class="btn primary"
              type="button"
              @click="handleSubmit"
              :disabled="!canSubmit || isSubmitting"
            >
              {{ isSubmitting ? '提交中...' : '提交反馈' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================== 我的反馈 ====================== -->
    <section v-if="activeTab === 'mine'" class="fb-section">
      <FeedbackListView :mine="true" />
    </section>

    <!-- ====================== 反馈广场 ====================== -->
    <section v-if="activeTab === 'square'" class="fb-section">
      <FeedbackListView :mine="false" />
    </section>

    <!-- ====================== 路线图 ====================== -->
    <section v-if="activeTab === 'roadmap'" class="fb-section">
      <div class="roadmap-card">
        <h2>产品路线图</h2>
        <p class="roadmap-desc">我们根据用户反馈和投票优先排列功能开发计划</p>

        <div v-for="phase in roadmapPhases" :key="phase.title" class="roadmap-phase">
          <div class="phase-header">
            <span class="phase-status" :class="phase.statusClass">{{ phase.statusLabel }}</span>
            <h3>{{ phase.title }}</h3>
          </div>
          <div class="phase-items">
            <div v-for="item in phase.items" :key="item" class="phase-item">
              <span class="phase-check">{{ phase.done ? '✅' : '⬜' }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================== 变更日志 ====================== -->
    <section v-if="activeTab === 'changelog'" class="fb-section">
      <div class="changelog-card">
        <h2>变更日志</h2>

        <div v-for="log in changelogs" :key="log.version" class="changelog-entry">
          <div class="cl-header">
            <span class="cl-version">{{ log.version }}</span>
            <span class="cl-date">{{ log.date }}</span>
          </div>
          <div class="cl-body">
            <div v-for="item in log.items" :key="item.text" class="cl-item">
              <span class="cl-tag" :class="item.type">{{ item.label }}</span>
              <span>{{ item.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import SparkSelect from '../../components/SparkSelect.vue'
import FeedbackListView from './feedback/FeedbackListView.vue'
import { useFeedback, MODULE_LIST, type FeedbackType } from '../../composables/useFeedback'

const {
  isSubmitting,
  submitFeedback,
  collectEnvironment,
} = useFeedback()

// ==================== Tab 导航 ====================

const activeTab = ref('submit')

const tabs = [
  { key: 'submit', icon: '✏️', label: '提交反馈' },
  { key: 'mine', icon: '📋', label: '我的反馈', badge: '' },
  { key: 'square', icon: '🌍', label: '反馈广场' },
  { key: 'roadmap', icon: '🗺️', label: '路线图' },
  { key: 'changelog', icon: '📝', label: '变更日志' },
]

function switchTab(key: string) {
  activeTab.value = key
}

// ==================== 表单数据 ====================

const form = reactive({
  type: 'bug' as FeedbackType,
  title: '',
  description: '',
  bug_type: '',
  severity: '',
  stepsText: '',
  importance: '',
  use_case: '',
  module: '',
  contact_email: '',
  is_public: true,
})

const envInfo = ref<Record<string, string>>({})

onMounted(() => {
  envInfo.value = collectEnvironment()
})

// 类型选项
const typeOptions = [
  { value: 'bug', icon: '🐛', label: 'Bug 报告' },
  { value: 'feature', icon: '💡', label: '功能建议' },
  { value: 'experience', icon: '🎨', label: '体验问题' },
  { value: 'report', icon: '🚨', label: '内容举报' },
  { value: 'other', icon: '💬', label: '其他反馈' },
]

const bugTypeOptions = [
  { value: 'functional', label: '功能异常' },
  { value: 'display', label: '显示问题' },
  { value: 'performance', label: '性能问题' },
  { value: 'data', label: '数据问题' },
  { value: 'security', label: '安全问题' },
]

const severityOptions = [
  { value: 'critical', label: '严重 — 无法使用核心功能' },
  { value: 'high', label: '高 — 影响正常使用' },
  { value: 'medium', label: '中 — 有一定影响' },
  { value: 'low', label: '低 — 小问题' },
]

const importanceOptions = [
  { value: 'critical', label: '非常重要 — 没有很影响使用' },
  { value: 'high', label: '重要 — 有这个功能会更好' },
  { value: 'medium', label: '一般 — 锦上添花' },
]

const moduleOptions = MODULE_LIST.map(m => ({ value: m.value, label: m.label }))

// 动态 placeholder
const descPlaceholder = computed(() => {
  switch (form.type) {
    case 'bug': return '请描述：\n1. 问题是什么？\n2. 如何复现？\n3. 期望结果是什么？\n4. 实际结果是什么？'
    case 'feature': return '请描述：\n1. 你希望有什么功能？\n2. 这个功能解决什么问题？\n3. 你期望的使用场景是什么？'
    case 'experience': return '请描述具体的体验问题，以及你期望的改进方向'
    case 'report': return '请描述举报内容、举报原因，并尽量附上相关截图'
    default: return '详细描述你的反馈内容...'
  }
})

const canSubmit = computed(() =>
  form.title.trim().length >= 2 && form.description.trim().length >= 10
)

// ==================== 提交 ====================

const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 3000)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  const steps = form.stepsText.trim()
    ? form.stepsText.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  const result = await submitFeedback({
    type: form.type,
    title: form.title,
    description: form.description,
    priority: (form.severity as 'critical' | 'high' | 'medium' | 'low') || 'medium',
    module: form.module || undefined,
    bug_type: form.bug_type || undefined,
    severity: form.severity || undefined,
    steps,
    importance: form.importance || undefined,
    use_case: form.use_case || undefined,
    contact_email: form.contact_email || undefined,
    is_public: form.is_public,
  })

  if (result) {
    showToast('🎉 反馈提交成功！感谢你的贡献')
    resetForm()
    // 切换到"我的反馈"查看
    setTimeout(() => { activeTab.value = 'mine' }, 1500)
  } else {
    showToast('❌ 提交失败，请稍后重试')
  }
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.bug_type = ''
  form.severity = ''
  form.stepsText = ''
  form.importance = ''
  form.use_case = ''
  form.module = ''
  form.contact_email = ''
  form.is_public = true
}

// ==================== 路线图数据 ====================

const roadmapPhases = [
  {
    title: 'Phase 1 · MVP（当前）',
    statusLabel: '已发布',
    statusClass: 'released',
    done: true,
    items: [
      '反馈表单（Bug/建议/体验/举报/其他）',
      '我的反馈列表 + 状态标签',
      '反馈广场 + 投票 + 搜索筛选',
      '环境信息自动采集',
      '路线图 + 变更日志',
    ],
  },
  {
    title: 'Phase 2 · 完善功能',
    statusLabel: '规划中',
    statusClass: 'planned',
    done: false,
    items: [
      '反馈详情页 + 评论讨论',
      '反馈分类标签 + 二级管理',
      '反馈分配 + 回复通知',
      '用户积分 + 徽章系统',
    ],
  },
  {
    title: 'Phase 3 · 高级功能',
    statusLabel: '远期',
    statusClass: 'future',
    done: false,
    items: [
      'AI 智能分类 + 情感分析',
      'AI 智能回复建议',
      '数据分析可视化看板',
      'SLA 服务等级协议',
    ],
  },
]

// ==================== 变更日志 ====================

const changelogs = [
  {
    version: 'v2.1.0',
    date: '2026-03-31',
    items: [
      { type: 'new', label: '新功能', text: '用户反馈系统 MVP 上线 — 支持 Bug/建议/体验/举报/其他 五种类型' },
      { type: 'new', label: '新功能', text: '反馈广场 — 公开反馈 + 投票 + 搜索 + 筛选' },
      { type: 'new', label: '新功能', text: '产品路线图 — 透明化研发计划' },
      { type: 'new', label: '新功能', text: '环境信息自动采集 — 减少用户描述成本' },
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-03-28',
    items: [
      { type: 'improve', label: '优化', text: '主题切换实时生效 — 12 个 CSS 变量动态覆盖' },
      { type: 'improve', label: '优化', text: 'SparkSelect 自定义下拉 — 替代原生 select' },
      { type: 'new', label: '新功能', text: 'SparkID 唯一标识系统 — 好友添加入口' },
      { type: 'fix', label: '修复', text: '头像下拉菜单无法点击 — click-outside 模式' },
      { type: 'fix', label: '修复', text: '铃铛通知按钮无功能 — 新增通知面板' },
    ],
  },
]
</script>

<style scoped>
/* ====== 页面容器 ====== */
.feedback-center {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 32px 64px;
}

/* ====== 顶部 ====== */
.fb-header {
  margin-bottom: 24px;
}
.fb-header h1 {
  font-size: 26px; font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}
.fb-header p {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

/* ====== Tab 导航 ====== */
.fb-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow-x: auto;
}
.fb-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  border: none; background: none;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fb-tab:hover { color: var(--color-text-primary); background: var(--color-bg-card-hover); }
.fb-tab.active {
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
  box-shadow: var(--shadow-card);
}
.tab-icon { font-size: 15px; }
.tab-badge {
  background: #f43f5e;
  color: white; font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;
}

/* ====== 表单卡片 ====== */
.form-card, .roadmap-card, .changelog-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 28px;
}
.form-card h2, .roadmap-card h2, .changelog-card h2 {
  font-size: 18px; color: var(--color-text-primary);
  margin: 0 0 20px;
}

/* ====== 反馈类型网格 ====== */
.fb-type-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}
.type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px;
  background: var(--color-bg-card-hover);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.type-btn:hover { border-color: var(--color-border-hover); }
.type-btn.active {
  border-color: var(--theme-color, #4f8ef7);
  background: rgba(79, 142, 247, 0.08);
}
.type-icon { font-size: 24px; }
.type-name { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }

/* ====== 表单 ====== */
.fb-form { display: flex; flex-direction: column; gap: 18px; }
.form-group {
  display: flex; flex-direction: column; gap: 6px;
  position: relative;
}
.form-group label {
  font-size: 13px; font-weight: 600; color: var(--color-text-secondary);
}
.required { color: #f43f5e; }
.hint { font-weight: 400; color: var(--color-text-muted); font-size: 12px; }

.form-group input[type="text"],
.form-group input[type="email"],
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-bg-card-hover);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font: inherit; font-size: 13px;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--theme-color, #4f8ef7);
}
.form-group textarea { resize: vertical; min-height: 80px; }
.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--color-text-muted);
}

.char-count {
  position: absolute; bottom: 8px; right: 10px;
  font-size: 11px; color: var(--color-text-muted);
  pointer-events: none;
}

.form-row { display: flex; gap: 16px; }
.form-group.half { flex: 1; }

.checkbox-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px !important; font-weight: 400 !important;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  accent-color: var(--theme-color, #4f8ef7);
  width: 16px; height: 16px;
}

/* ====== 环境信息 ====== */
.env-details {
  background: var(--color-bg-card-hover);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
}
.env-details summary {
  font-size: 13px; color: var(--color-text-muted);
  cursor: pointer; user-select: none;
}
.env-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 6px; margin-top: 12px;
}
.env-item { display: flex; gap: 8px; font-size: 12px; }
.env-key { color: var(--color-text-muted); min-width: 80px; }
.env-val { color: var(--color-text-secondary); word-break: break-all; }

/* ====== 提交按钮 ====== */
.form-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 8px;
}
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 40px; padding: 0 20px;
  border: none; border-radius: 10px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
  text-decoration: none;
}
.btn.primary {
  background: var(--gradient-brand);
  color: white;
}
.btn.primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.ghost {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

/* ====== 路线图 ====== */
.roadmap-desc {
  font-size: 13px; color: var(--color-text-muted);
  margin: -12px 0 24px;
}
.roadmap-phase {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--color-bg-card-hover);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}
.phase-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px;
}
.phase-header h3 {
  font-size: 15px; color: var(--color-text-primary); margin: 0;
}
.phase-status {
  font-size: 11px; font-weight: 600;
  padding: 3px 10px; border-radius: 99px;
}
.phase-status.released { background: rgba(16,185,129,0.12); color: #10b981; }
.phase-status.planned { background: rgba(79,142,247,0.12); color: #4f8ef7; }
.phase-status.future { background: rgba(139,92,246,0.12); color: #8b5cf6; }

.phase-items { display: flex; flex-direction: column; gap: 8px; }
.phase-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--color-text-secondary);
}
.phase-check { font-size: 14px; }

/* ====== 变更日志 ====== */
.changelog-entry {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}
.changelog-entry:last-child { border-bottom: none; margin-bottom: 0; }
.cl-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 12px;
}
.cl-version {
  font-size: 16px; font-weight: 700;
  color: var(--color-text-primary);
}
.cl-date {
  font-size: 12px; color: var(--color-text-muted);
}
.cl-body { display: flex; flex-direction: column; gap: 8px; }
.cl-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--color-text-secondary);
}
.cl-tag {
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 6px;
  flex-shrink: 0;
}
.cl-tag.new { background: rgba(16,185,129,0.12); color: #10b981; }
.cl-tag.improve { background: rgba(79,142,247,0.12); color: #4f8ef7; }
.cl-tag.fix { background: rgba(249,115,22,0.12); color: #f97316; }

/* ====== Toast ====== */
.toast {
  position: fixed; left: 50%; bottom: 32px;
  transform: translateX(-50%);
  padding: 12px 24px; border-radius: 99px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-elevated);
  font-size: 14px; z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .feedback-center { padding: 20px 16px 48px; }
  .fb-type-grid { grid-template-columns: repeat(3, 1fr); }
  .form-row { flex-direction: column; gap: 18px; }
  .form-group.half { flex: none; }
  .env-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .fb-type-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
