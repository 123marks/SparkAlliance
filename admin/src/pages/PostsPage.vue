<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">内容审核</h1>
        <p class="page-sub">星火墙帖子管理</p>
      </div>
      <form class="search-form" @submit.prevent="handleSearch">
        <input v-model.trim="searchInput" type="search" placeholder="搜索帖子内容…" />
        <button class="btn" type="submit">搜索</button>
      </form>
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
      <template v-else>
        <DataTable :columns="columns" :rows="posts" :loading="loading" empty-text="该状态下暂无帖子">
          <template #cell-content="{ row }">
            <span class="content-cell" :title="row.content">{{ truncate(row.content, 70) }}</span>
          </template>
          <template #cell-author="{ row }">
            <div class="author-cell">
              <span>{{ row.author_nickname || '—' }}</span>
              <span class="dim">{{ row.author_email || row.user_id.slice(0, 8) }}</span>
            </div>
          </template>
          <template #cell-metrics="{ row }">
            <span class="metric">❤ {{ row.likes_count }}</span>
            <span class="metric">💬 {{ row.comments_count }}</span>
          </template>
          <template #cell-status="{ row }">
            <span class="badge" :class="STATUS_BADGE[row.status]">{{ STATUS_LABEL[row.status] }}</span>
          </template>
          <template #cell-created_at="{ row }">
            <span class="dim">{{ formatDateTime(row.created_at) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <button
                v-if="row.status !== 'visible'"
                class="btn btn-sm"
                type="button"
                @click="askSetStatus(row, 'visible')"
              >
                恢复
              </button>
              <button
                v-if="row.status === 'visible'"
                class="btn btn-sm"
                type="button"
                @click="askSetStatus(row, 'hidden')"
              >
                隐藏
              </button>
              <button
                v-if="row.status !== 'deleted'"
                class="btn btn-sm btn-danger"
                type="button"
                @click="askSetStatus(row, 'deleted')"
              >
                删除
              </button>
            </div>
          </template>
        </DataTable>
        <Pagination :total="total" :page="page" :page-size="PAGE_SIZE" @change="goPage" />
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
import DataTable from '../components/DataTable.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ErrorState from '../components/ErrorState.vue'
import { fetchPosts, updatePostStatus } from '../api'
import { formatDateTime, truncate } from '../format'
import { toast } from '../toast'
import type { AdminPost, PostStatus, TableColumn } from '../types'

const PAGE_SIZE = 20

const TABS: Array<{ label: string; value: PostStatus }> = [
  { label: '可见', value: 'visible' },
  { label: '已隐藏', value: 'hidden' },
  { label: '已删除', value: 'deleted' },
]

const STATUS_LABEL: Record<PostStatus, string> = {
  visible: '可见',
  hidden: '已隐藏',
  deleted: '已删除',
}
const STATUS_BADGE: Record<PostStatus, string> = {
  visible: 'badge-green',
  hidden: 'badge-gold',
  deleted: 'badge-red',
}

const columns: TableColumn[] = [
  { key: 'content', label: '内容摘要' },
  { key: 'author', label: '作者', width: '180px' },
  { key: 'metrics', label: '互动', width: '110px' },
  { key: 'status', label: '状态', width: '86px' },
  { key: 'created_at', label: '发布时间', width: '150px' },
  { key: 'actions', label: '操作', width: '150px' },
]

const posts = ref<AdminPost[]>([])
const total = ref(0)
const page = ref(1)
const status = ref<PostStatus>('visible')
const loading = ref(true)
const error = ref('')
const searchInput = ref('')
const search = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchPosts({
      status: status.value,
      search: search.value || undefined,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    })
    posts.value = data.posts
    total.value = data.total
  } catch (err) {
    posts.value = []
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(next: PostStatus) {
  if (status.value === next) return
  status.value = next
  page.value = 1
  void load()
}

function handleSearch() {
  search.value = searchInput.value
  page.value = 1
  void load()
}

function goPage(p: number) {
  page.value = p
  void load()
}

onMounted(load)

// ---- 状态变更 ----

interface PendingAction {
  title: string
  message: string
  confirmText: string
  danger: boolean
  post: AdminPost
  next: PostStatus
}

const ACTION_TEXT: Record<PostStatus, { title: string; confirm: string; done: string }> = {
  visible: { title: '恢复帖子', confirm: '恢复', done: '帖子已恢复可见' },
  hidden: { title: '隐藏帖子', confirm: '隐藏', done: '帖子已隐藏' },
  deleted: { title: '删除帖子', confirm: '删除', done: '帖子已删除' },
}

const pending = ref<PendingAction | null>(null)
const acting = ref(false)

function askSetStatus(post: AdminPost, next: PostStatus) {
  const text = ACTION_TEXT[next]
  pending.value = {
    title: text.title,
    message: `确定${text.confirm}这条帖子吗？\n「${truncate(post.content, 50)}」`,
    confirmText: text.confirm,
    danger: next === 'deleted',
    post,
    next,
  }
}

async function doAction() {
  const action = pending.value
  if (!action || acting.value) return
  acting.value = true
  try {
    await updatePostStatus(action.post.id, action.next)
    // 当前列表按状态筛选，状态变了就从本列表移除
    posts.value = posts.value.filter((p) => p.id !== action.post.id)
    total.value = Math.max(0, total.value - 1)
    toast(ACTION_TEXT[action.next].done)
    pending.value = null
    if (posts.value.length === 0 && total.value > 0) {
      page.value = Math.max(1, page.value - 1)
      void load()
    }
  } catch (err) {
    toast(err instanceof Error ? err.message : '操作失败', 'error')
  } finally {
    acting.value = false
  }
}
</script>

<style scoped>
.search-form {
  display: flex;
  gap: 8px;
}
.search-form input {
  width: 240px;
}
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
  padding: 8px 16px 16px;
}
.content-cell {
  display: inline-block;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.author-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.metric {
  margin-right: 10px;
  font-size: 12.5px;
  color: var(--text-2);
}
.row-actions {
  display: flex;
  gap: 8px;
}
.dim {
  color: var(--text-3);
  font-size: 12px;
}
</style>
