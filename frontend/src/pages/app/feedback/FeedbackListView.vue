<template>
  <div class="fb-list-view">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="searchQuery" type="text" placeholder="搜索反馈..." @input="debouncedSearch" />
        </div>
        <SparkSelect v-model="typeFilter" :options="typeFilterOptions" placeholder="类型" class="filter-select" />
        <SparkSelect v-model="statusFilter" :options="statusFilterOptions" placeholder="状态" class="filter-select" />
      </div>
      <div class="filter-right">
        <SparkSelect v-model="sortBy" :options="sortOptions" placeholder="排序" class="filter-select" />
      </div>
    </div>

    <!-- 统计条 -->
    <div class="stats-bar" v-if="!isLoading">
      <span>共 <strong>{{ totalCount }}</strong> 条反馈</span>
      <span v-if="mine" class="stats-hint">仅显示你提交的反馈</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="feedbacks.length === 0" class="empty-state">
      <span class="empty-icon">{{ mine ? '📋' : '🌍' }}</span>
      <h3>{{ mine ? '还没有提交过反馈' : '暂无公开反馈' }}</h3>
      <p>{{ mine ? '去提交你的第一条反馈吧！' : '成为第一个分享想法的人' }}</p>
    </div>

    <!-- 反馈列表 -->
    <div v-else class="fb-list">
      <div
        v-for="fb in feedbacks"
        :key="fb.id"
        class="fb-card"
      >
        <!-- 左侧投票 -->
        <div class="fb-vote" @click="handleVote(fb.id)">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            :class="{ voted: myVotedIds.has(fb.id) }"
          >
            <path d="M12 19V6M5 12l7-7 7 7"></path>
          </svg>
          <span :class="{ voted: myVotedIds.has(fb.id) }">{{ fb.vote_count }}</span>
        </div>

        <!-- 右侧内容 -->
        <div class="fb-body">
          <div class="fb-meta">
            <span class="fb-type-tag" :class="fb.type">{{ typeLabel(fb.type) }}</span>
            <span class="fb-status-tag" :class="fb.status">{{ statusLabel(fb.status) }}</span>
            <span class="fb-priority-tag" :class="fb.priority" v-if="fb.priority !== 'medium'">
              {{ priorityLabel(fb.priority) }}
            </span>
            <span v-if="fb.module" class="fb-module-tag">{{ moduleLabel(fb.module) }}</span>
          </div>

          <h4 class="fb-title">{{ fb.title }}</h4>
          <p class="fb-desc">{{ fb.description.slice(0, 120) }}{{ fb.description.length > 120 ? '...' : '' }}</p>

          <div class="fb-footer">
            <span class="fb-time">{{ formatTime(fb.created_at) }}</span>
            <span v-if="fb.admin_reply" class="fb-replied">✅ 已回复</span>
            <!-- 删除按钮（仅自己的 pending 反馈） -->
            <button
              v-if="mine && fb.status === 'pending'"
              class="fb-delete-btn"
              @click.stop="handleDelete(fb.id)"
              title="删除这条反馈"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">← 上一页</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import SparkSelect from '../../../components/SparkSelect.vue'
import {
  useFeedback,
  MODULE_LIST,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackSort,
} from '../../../composables/useFeedback'

const props = defineProps<{ mine: boolean }>()

const {
  feedbacks,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  filters,
  myVotedIds,
  loadFeedbacks,
  toggleVote,
  deleteFeedback,
} = useFeedback()

// 绑定筛选
const searchQuery = computed({
  get: () => filters.search || '',
  set: (v) => { filters.search = v },
})
const typeFilter = computed({
  get: () => filters.type || '',
  set: (v) => { filters.type = v as FeedbackType | '' },
})
const statusFilter = computed({
  get: () => filters.status || '',
  set: (v) => { filters.status = v as FeedbackStatus | '' },
})
const sortBy = computed({
  get: () => filters.sort || 'newest',
  set: (v) => { filters.sort = v as FeedbackSort },
})

// 筛选选项
const typeFilterOptions = [
  { value: '', label: '全部类型' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'feature', label: '💡 建议' },
  { value: 'experience', label: '🎨 体验' },
  { value: 'report', label: '🚨 举报' },
  { value: 'other', label: '💬 其他' },
]

const statusFilterOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'closed', label: '已关闭' },
]

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最早' },
  { value: 'most_voted', label: '最多投票' },
]

// 总页数
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

// 标签映射
function typeLabel(t: string) {
  const m: Record<string, string> = { bug: '🐛 Bug', feature: '💡 建议', experience: '🎨 体验', report: '🚨 举报', other: '💬 其他' }
  return m[t] || t
}
function statusLabel(s: string) {
  const m: Record<string, string> = { pending: '待处理', processing: '处理中', completed: '已完成', closed: '已关闭' }
  return m[s] || s
}
function priorityLabel(p: string) {
  const m: Record<string, string> = { critical: '🔴 严重', high: '🟠 高', low: '🟢 低' }
  return m[p] || ''
}
function moduleLabel(mod: string) {
  return MODULE_LIST.find(m => m.value === mod)?.label || mod
}

// 时间格式化
function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}小时前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}天前`
  return d.toLocaleDateString('zh-CN')
}

// 防抖搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadFeedbacks(1), 400)
}

// 投票
async function handleVote(id: string) {
  await toggleVote(id)
}

// 删除
async function handleDelete(id: string) {
  if (!confirm('确定删除这条反馈吗？')) return
  await deleteFeedback(id)
}

// 翻页
function goPage(page: number) {
  loadFeedbacks(page)
}

// 初始化加载
onMounted(() => {
  filters.mine = props.mine
  loadFeedbacks(1)
})

// 筛选变化时重新加载
watch([typeFilter, statusFilter, sortBy], () => {
  loadFeedbacks(1)
})
</script>

<style scoped>
/* ====== 筛选栏 ====== */
.filter-bar {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-left { display: flex; gap: 8px; flex: 1; align-items: center; }
.filter-right { display: flex; gap: 8px; }
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0 12px; height: 36px;
  flex: 1; max-width: 300px;
  color: var(--color-text-muted);
}
.search-box input {
  background: none; border: none; outline: none;
  color: var(--color-text-primary); font-size: 13px; width: 100%;
  font-family: inherit;
}
.search-box input::placeholder { color: var(--color-text-muted); }
.filter-select { min-width: 100px; }

/* ====== 统计条 ====== */
.stats-bar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px;
  font-size: 13px; color: var(--color-text-muted);
}
.stats-bar strong { color: var(--color-text-primary); }
.stats-hint { font-style: italic; }

/* ====== 加载 / 空状态 ====== */
.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 20px;
  text-align: center;
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--theme-color, #4f8ef7);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 48px; opacity: 0.3; }
.empty-state h3 { font-size: 16px; color: var(--color-text-primary); margin: 0; }
.empty-state p { font-size: 13px; color: var(--color-text-muted); margin: 0; }

/* ====== 反馈列表 ====== */
.fb-list { display: flex; flex-direction: column; gap: 10px; }

.fb-card {
  display: flex; gap: 16px;
  padding: 18px 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: border-color 0.15s;
}
.fb-card:hover { border-color: var(--color-border-hover); }

/* 左侧投票 */
.fb-vote {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 40px; cursor: pointer;
  padding: 4px 0;
}
.fb-vote svg { color: var(--color-text-muted); transition: all 0.15s; }
.fb-vote svg.voted { color: var(--theme-color, #4f8ef7); }
.fb-vote span {
  font-size: 14px; font-weight: 700;
  color: var(--color-text-muted); transition: color 0.15s;
}
.fb-vote span.voted { color: var(--theme-color, #4f8ef7); }
.fb-vote:hover svg { color: var(--theme-color, #4f8ef7); }

/* 右侧内容 */
.fb-body { flex: 1; min-width: 0; }
.fb-meta {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap; margin-bottom: 8px;
}
.fb-type-tag, .fb-status-tag, .fb-priority-tag, .fb-module-tag {
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 6px;
  white-space: nowrap;
}
.fb-type-tag.bug { background: rgba(239,68,68,0.1); color: #ef4444; }
.fb-type-tag.feature { background: rgba(79,142,247,0.1); color: #4f8ef7; }
.fb-type-tag.experience { background: rgba(139,92,246,0.1); color: #8b5cf6; }
.fb-type-tag.report { background: rgba(249,115,22,0.1); color: #f97316; }
.fb-type-tag.other { background: rgba(107,114,128,0.1); color: #6b7280; }

.fb-status-tag.pending { background: rgba(249,115,22,0.1); color: #f97316; }
.fb-status-tag.processing { background: rgba(79,142,247,0.1); color: #4f8ef7; }
.fb-status-tag.completed { background: rgba(16,185,129,0.1); color: #10b981; }
.fb-status-tag.closed { background: rgba(107,114,128,0.1); color: #6b7280; }

.fb-priority-tag.critical { background: rgba(239,68,68,0.1); color: #ef4444; }
.fb-priority-tag.high { background: rgba(249,115,22,0.1); color: #f97316; }
.fb-priority-tag.low { background: rgba(16,185,129,0.1); color: #10b981; }

.fb-module-tag { background: var(--color-bg-card-hover); color: var(--color-text-muted); }

.fb-title {
  font-size: 15px; font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px; line-height: 1.4;
}
.fb-desc {
  font-size: 13px; color: var(--color-text-muted);
  margin: 0 0 10px; line-height: 1.5;
}

.fb-footer {
  display: flex; align-items: center; gap: 12px;
}
.fb-time { font-size: 12px; color: var(--color-text-muted); }
.fb-replied { font-size: 12px; color: #10b981; }
.fb-delete-btn {
  margin-left: auto;
  background: none; border: none;
  color: var(--color-text-muted); cursor: pointer;
  padding: 4px; border-radius: 6px;
  transition: all 0.15s;
}
.fb-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

/* ====== 分页 ====== */
.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 16px; margin-top: 24px;
}
.pagination button {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 8px 16px; border-radius: 8px;
  font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.pagination button:hover:not(:disabled) { border-color: var(--theme-color, #4f8ef7); }
.pagination button:disabled { opacity: 0.35; cursor: not-allowed; }
.pagination span { font-size: 13px; color: var(--color-text-muted); }

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .filter-bar { flex-direction: column; }
  .filter-left { flex-wrap: wrap; }
  .search-box { max-width: none; }
  .fb-card { flex-direction: column; gap: 8px; }
  .fb-vote { flex-direction: row; gap: 8px; }
}
</style>
