<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-sub">账号状态与管理员权限</p>
      </div>
      <form class="search-form" @submit.prevent="handleSearch">
        <input v-model.trim="searchInput" type="search" placeholder="搜索邮箱 / 昵称…" />
        <button class="btn" type="submit">搜索</button>
      </form>
    </div>

    <div class="glass-card list-card">
      <ErrorState v-if="error" :message="error" @retry="load" />
      <template v-else>
        <DataTable :columns="columns" :rows="users" :loading="loading" empty-text="没有匹配的用户">
          <template #cell-email="{ row }">
            <span class="mono">{{ row.email }}</span>
          </template>
          <template #cell-nickname="{ row }">
            {{ row.nickname || '—' }}
          </template>
          <template #cell-role="{ row }">
            <span class="badge" :class="row.role === 'admin' ? 'badge-gold' : 'badge-blue'">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <span class="badge" :class="row.status === 'active' ? 'badge-green' : 'badge-red'">
              {{ row.status === 'active' ? '正常' : '已禁用' }}
            </span>
          </template>
          <template #cell-created_at="{ row }">
            <span class="dim">{{ formatDateTime(row.created_at) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <button
                class="btn btn-sm"
                :class="row.status === 'active' ? 'btn-danger' : ''"
                type="button"
                @click="askToggleStatus(row)"
              >
                {{ row.status === 'active' ? '禁用' : '启用' }}
              </button>
              <button class="btn btn-sm" type="button" @click="askToggleRole(row)">
                {{ row.role === 'admin' ? '撤销管理员' : '设为管理员' }}
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
import { fetchUsers, updateUser } from '../api'
import { formatDateTime } from '../format'
import { toast } from '../toast'
import type { AdminUser, TableColumn, UserRole, UserStatus } from '../types'

const PAGE_SIZE = 20

const columns: TableColumn[] = [
  { key: 'email', label: '邮箱' },
  { key: 'nickname', label: '昵称' },
  { key: 'role', label: '角色', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
  { key: 'posts_count', label: '发帖数', width: '80px' },
  { key: 'created_at', label: '注册时间', width: '150px' },
  { key: 'actions', label: '操作', width: '210px' },
]

const users = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const searchInput = ref('')
const search = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchUsers({
      search: search.value || undefined,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    })
    users.value = data.users
    total.value = data.total
  } catch (err) {
    users.value = []
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
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

// ---- 行操作（确认弹窗 → PATCH → 行内更新） ----

interface PendingAction {
  title: string
  message: string
  confirmText: string
  danger: boolean
  user: AdminUser
  patch: { status?: UserStatus; role?: UserRole }
  successText: string
}

const pending = ref<PendingAction | null>(null)
const acting = ref(false)

function askToggleStatus(user: AdminUser) {
  const disabling = user.status === 'active'
  pending.value = {
    title: disabling ? '禁用账号' : '启用账号',
    message: disabling
      ? `确定禁用 ${user.email} 吗？该用户将立即无法登录。`
      : `确定恢复 ${user.email} 的登录权限吗？`,
    confirmText: disabling ? '禁用' : '启用',
    danger: disabling,
    user,
    patch: { status: disabling ? 'disabled' : 'active' },
    successText: disabling ? '账号已禁用' : '账号已启用',
  }
}

function askToggleRole(user: AdminUser) {
  const promoting = user.role !== 'admin'
  pending.value = {
    title: promoting ? '设为管理员' : '撤销管理员',
    message: promoting
      ? `确定将 ${user.email} 提升为管理员吗？其将获得后台全部权限。`
      : `确定撤销 ${user.email} 的管理员权限吗？`,
    confirmText: promoting ? '设为管理员' : '撤销',
    danger: !promoting,
    user,
    patch: { role: promoting ? 'admin' : 'user' },
    successText: promoting ? '已设为管理员' : '已撤销管理员',
  }
}

async function doAction() {
  const action = pending.value
  if (!action || acting.value) return
  acting.value = true
  try {
    const updated = await updateUser(action.user.id, action.patch)
    const idx = users.value.findIndex((u) => u.id === action.user.id)
    if (idx >= 0) {
      // 后端返回体字段以 PATCH 结果为准，缺省时用本地补丁兜底
      users.value[idx] = { ...users.value[idx], ...action.patch, ...updated }
    }
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
.search-form {
  display: flex;
  gap: 8px;
}
.search-form input {
  width: 240px;
}
.list-card {
  padding: 8px 16px 16px;
}
.row-actions {
  display: flex;
  gap: 8px;
}
.mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
}
.dim {
  color: var(--text-2);
  font-size: 12.5px;
}
</style>
