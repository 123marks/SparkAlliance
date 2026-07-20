<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">举报处理</h1>
        <p class="page-sub">社区举报审查与处置</p>
      </div>
      <button class="btn btn-sm" type="button" :disabled="loading" @click="load">⟳ 刷新</button>
    </div>

    <div class="tabs">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="tab"
        :class="{ active: status === tab.value }"
        type="button"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="glass-card list-card">
      <ErrorState v-if="error" :message="error" @retry="load" />

      <template v-else-if="loading">
        <div v-for="i in 4" :key="`rp-sk-${i}`" class="report-item">
          <div class="skeleton sk-line" style="width: 40%"></div>
          <div class="skeleton sk-line" style="width: 85%"></div>
          <div class="skeleton sk-line" style="width: 25%"></div>
        </div>
      </template>

      <div v-else-if="reports.length === 0" class="state-box">
        <span class="state-icon" aria-hidden="true">🛰</span>
        <span>{{ EMPTY_TEXT[status] }}</span>
      </div>

      <template v-else>
        <article v-for="report in reports" :key="report.id" class="report-item">
          <div class="report-head">
            <span class="badge" :class="report.comment_id ? 'badge-blue' : 'badge-purple'">
              {{ report.comment_id ? '评论' : '帖子' }}
            </span>
            <span class="report-reason">{{ report.reason }}</span>
            <span class="report-time">{{ formatDateTime(report.created_at) }}</span>
          </div>

          <blockquote class="report-target">{{ targetSummary(report) }}</blockquote>

          <div class="report-foot">
            <span class="dim">
              举报人：{{ report.reporter_nickname || report.reporter_email || report.reporter_id?.slice(0, 8) || '匿名' }}
            </span>

            <div v-if="report.status === 'pending'" class="row-actions">
              <button class="btn btn-sm" type="button" @click="askDismiss(report)">忽略</button>
              <button class="btn btn-sm btn-danger" type="button" @click="askResolve(report)">
                处理并隐藏内容
              </button>
            </div>
            <span v-else class="badge" :class="report.status === 'resolved' ? 'badge-green' : 'badge-gray'">
              {{ report.status === 'resolved' ? '已处理' : '已忽略' }}
              <template v-if="report.resolved_at"> · {{ formatDateTime(report.resolved_at) }}</template>
            </span>
          </div>
        </article>
      </template>
    </div>

    <ConfirmDialog
      :visible="!!pending"
      :title="pending?.title ?? ''"
      :message="pending?.message ?? ''"
      :confirm-text="pending?.confirmText"
      :danger="pending?.danger"
      :loading="acting"
      @confirm="doAction"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ErrorState from '../components/ErrorState.vue'
import { fetchReports, updateReport } from '../api'
import { formatDateTime, truncate } from '../format'
import { toast } from '../toast'
import type { AdminReport, ReportStatus } from '../types'

const TABS: Array<{ label: string; value: ReportStatus }> = [
  { label: '待处理', value: 'pending' },
  { label: '已处理', value: 'resolved' },
  { label: '已忽略', value: 'dismissed' },
]

const EMPTY_TEXT: Record<ReportStatus, string> = {
  pending: '暂无待处理举报，社区风平浪静',
  resolved: '暂无已处理记录',
  dismissed: '暂无已忽略记录',
}

const reports = ref<AdminReport[]>([])
const status = ref<ReportStatus>('pending')
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    reports.value = await fetchReports(status.value)
  } catch (err) {
    reports.value = []
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(next: ReportStatus) {
  if (status.value === next) return
  status.value = next
  void load()
}

onMounted(load)

/** 被举报内容摘要：契约未锁定字段名，按常见命名依次取 */
function targetSummary(report: AdminReport): string {
  const content =
    report.target_summary ??
    report.target_content ??
    report.comment_content ??
    report.post_content
  if (content) return truncate(content, 120)
  const id = report.comment_id ?? report.post_id
  return id ? `内容 #${id.slice(0, 8)}（原文不可用，可能已删除）` : '关联内容不可用'
}

// ---- 处置 ----

interface PendingAction {
  title: string
  message: string
  confirmText: string
  danger: boolean
  report: AdminReport
  patch: { status: 'resolved' | 'dismissed'; hide_target?: boolean }
  successText: string
}

const pending = ref<PendingAction | null>(null)
const acting = ref(false)

function askDismiss(report: AdminReport) {
  pending.value = {
    title: '忽略举报',
    message: '确定忽略这条举报吗？被举报内容将保持原样。',
    confirmText: '忽略',
    danger: false,
    report,
    patch: { status: 'dismissed' },
    successText: '已忽略该举报',
  }
}

function askResolve(report: AdminReport) {
  pending.value = {
    title: '处理举报',
    message: `确定处理并隐藏被举报${report.comment_id ? '评论' : '帖子'}吗？内容将立即对用户不可见。`,
    confirmText: '处理并隐藏',
    danger: true,
    report,
    patch: { status: 'resolved', hide_target: true },
    successText: '已处理，内容已隐藏',
  }
}

async function doAction() {
  const action = pending.value
  if (!action || acting.value) return
  acting.value = true
  try {
    await updateReport(action.report.id, action.patch)
    // 当前 tab 按状态筛选，处理完即从列表移除
    reports.value = reports.value.filter((r) => r.id !== action.report.id)
    toast(action.successText)
    pending.value = null
  } catch (err) {
    toast(err instanceof Error ? err.message : '操作失败', 'error')
  } finally {
    acting.value = false
  }
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.tab {
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s;
}
.tab:hover {
  color: var(--text-1);
  border-color: rgba(255, 255, 255, 0.2);
}
.tab.active {
  color: #e0d4ff;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(124, 58, 237, 0.22));
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.18);
}
.list-card {
  padding: 6px 20px;
}
.report-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.report-item:last-child {
  border-bottom: none;
}
.report-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.report-reason {
  font-weight: 600;
  font-size: 13.5px;
}
.report-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.report-target {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid rgba(139, 92, 246, 0.5);
  border-radius: 0 10px 10px 0;
  background: rgba(124, 58, 237, 0.06);
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-word;
}
.report-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.row-actions {
  display: flex;
  gap: 8px;
}
.dim {
  color: var(--text-3);
  font-size: 12px;
}
.sk-line {
  height: 13px;
}
</style>
