<template>
  <!-- 星火共创 — 让优秀项目被更多人看见 -->
  <div class="cc-page">
    <div class="cc-header">
      <h1 class="cc-title">🚀 星火共创</h1>
      <p class="cc-subtitle">发现好项目 · 组队共创 · 展示成果</p>
    </div>

    <!-- Tab -->
    <div class="cc-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="cc-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        <span class="cc-tab-icon">{{ tab.icon }}</span>
        <span class="cc-tab-label">{{ tab.label }}</span>
        <span v-if="tab.key === 'inbox' && receivedApplications.length" class="cc-tab-badge">
          {{ receivedApplications.length }}
        </span>
      </button>
    </div>

    <!-- ===== 广场 Tab ===== -->
    <div v-if="activeTab === 'plaza'" class="cc-content">
      <!-- 搜索+筛选 -->
      <div class="cc-search-bar">
        <input v-model="searchKeyword" class="cc-search-input"
          placeholder="搜索项目名称、技术栈..." @keydown.enter="doSearch" />
        <button class="cc-search-btn" @click="doSearch">🔍</button>
      </div>

      <div class="cc-filter-row">
        <button class="cc-chip" :class="{ active: !filterCat }"
          @click="filterCat = ''; doSearch()">✨ 全部</button>
        <button v-for="(cfg, key) in CATEGORIES" :key="key" class="cc-chip"
          :class="{ active: filterCat === key }"
          @click="filterCat = filterCat === key ? '' : key; doSearch()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
      </div>

      <div class="cc-filter-row">
        <button class="cc-chip sm" :class="{ active: !filterStatus }"
          @click="filterStatus = ''; doSearch()">全部状态</button>
        <button v-for="(cfg, key) in STATUS_MAP" :key="key" class="cc-chip sm"
          :class="{ active: filterStatus === key }"
          @click="filterStatus = filterStatus === key ? '' : key; doSearch()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
        <div class="cc-sort-toggle">
          <button :class="{ active: sortBy === 'latest' }" @click="sortBy='latest';doSearch()">🕐 最新</button>
          <button :class="{ active: sortBy === 'hot' }" @click="sortBy='hot';doSearch()">🔥 最热</button>
        </div>
      </div>

      <!-- 项目卡片列表 -->
      <div v-if="loading && projects.length===0" class="cc-loading"><div class="cc-spinner"></div></div>
      <div v-else-if="projects.length===0" class="cc-empty">暂无项目，点击右下角发布第一个 🚀</div>
      <div v-else class="cc-project-list">
        <div v-for="p in projects" :key="p.id" class="cc-project-card" @click="openProject(p)">
          <!-- 头部 -->
          <div class="cc-pc-top">
            <div class="cc-pc-status" :style="{color: STATUS_MAP[p.status]?.color || '#999'}">
              {{ STATUS_MAP[p.status]?.icon }} {{ STATUS_MAP[p.status]?.label }}
            </div>
            <span class="cc-pc-cat">{{ CATEGORIES[p.category]?.icon }} {{ CATEGORIES[p.category]?.label }}</span>
          </div>
          <!-- 主体 -->
          <h3 class="cc-pc-title">{{ p.title }}</h3>
          <p v-if="p.tagline" class="cc-pc-tagline">{{ p.tagline }}</p>
          <!-- 技术栈 -->
          <div v-if="p.tech_stack?.length" class="cc-pc-tags">
            <span v-for="t in p.tech_stack.slice(0,4)" :key="t" class="cc-tag">{{ t }}</span>
          </div>
          <!-- 招募角色 -->
          <div v-if="p.looking_for?.length && p.status==='recruiting'" class="cc-pc-looking">
            <span class="cc-looking-label">📢 招募：</span>
            <span v-for="r in p.looking_for" :key="r" class="cc-role-tag">{{ r }}</span>
          </div>
          <!-- 底部 -->
          <div class="cc-pc-footer">
            <div class="cc-pc-stats">
              <span>🔺 {{ p.upvotes }}</span>
              <span>💬 {{ p.comment_count }}</span>
              <span>👥 {{ p.member_count }}</span>
            </div>
            <span class="cc-pc-time">{{ formatTimeAgo(p.created_at) }}</span>
          </div>
        </div>
        <button v-if="hasMore && !loading" class="cc-load-more" @click="loadMore">加载更多</button>
      </div>
    </div>

    <!-- ===== 我的项目 Tab ===== -->
    <div v-else-if="activeTab === 'mine'" class="cc-content">
      <div v-if="myProjects.length===0" class="cc-empty">
        还没有项目，去发布一个吧 🚀
      </div>
      <div v-for="p in myProjects" :key="p.id" class="cc-project-card" @click="openProject(p)">
        <div class="cc-pc-top">
          <div class="cc-pc-status" :style="{color: STATUS_MAP[p.status]?.color}">
            {{ STATUS_MAP[p.status]?.icon }} {{ STATUS_MAP[p.status]?.label }}
          </div>
          <span class="cc-pc-cat">{{ CATEGORIES[p.category]?.icon }}</span>
        </div>
        <h3 class="cc-pc-title">{{ p.title }}</h3>
        <p v-if="p.tagline" class="cc-pc-tagline">{{ p.tagline }}</p>
        <div class="cc-pc-footer">
          <div class="cc-pc-stats">
            <span>🔺 {{ p.upvotes }}</span>
            <span>👥 {{ p.member_count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 申请 Tab ===== -->
    <div v-else-if="activeTab === 'inbox'" class="cc-content">
      <!-- 收到的申请 -->
      <h3 class="cc-section-title">📥 收到的申请 · {{ receivedApplications.length }}</h3>
      <div v-if="receivedApplications.length===0" class="cc-empty mini">暂无待处理的申请</div>
      <div v-for="app in receivedApplications" :key="app.id" class="cc-app-card">
        <div class="cc-app-info">
          <strong>{{ app.project_title }}</strong>
          <p>申请角色：{{ app.role }}</p>
          <p v-if="app.message" class="cc-app-msg">「{{ app.message }}」</p>
        </div>
        <div class="cc-app-actions">
          <button class="cc-btn accept" @click="handleApp(app.id, true)">✅ 通过</button>
          <button class="cc-btn reject" @click="handleApp(app.id, false)">❌ 拒绝</button>
        </div>
      </div>

      <!-- 我发出的申请 -->
      <h3 class="cc-section-title" style="margin-top:16px">📤 我发出的 · {{ myApplications.length }}</h3>
      <div v-if="myApplications.length===0" class="cc-empty mini">暂无申请记录</div>
      <div v-for="app in myApplications" :key="app.id" class="cc-app-card sent">
        <div class="cc-app-info">
          <strong>{{ app.project_title }}</strong>
          <p>角色：{{ app.role }} · {{ app.status === 'pending' ? '⏳ 待审核' : app.status === 'accepted' ? '✅ 已通过' : '❌ 已拒绝' }}</p>
        </div>
      </div>
    </div>

    <!-- ===== 发布 Tab ===== -->
    <div v-else-if="activeTab === 'publish'" class="cc-content">
      <div class="cc-form">
        <h3 class="cc-section-title">📝 发布新项目</h3>
        <input v-model="form.title" class="cc-input" placeholder="项目名称（必填）" />
        <input v-model="form.tagline" class="cc-input" placeholder="一句话介绍" />
        <textarea v-model="form.description" class="cc-textarea" rows="4" placeholder="详细描述（支持Markdown）"></textarea>

        <div class="cc-form-row">
          <select v-model="form.category" class="cc-select">
            <option v-for="(cfg, key) in CATEGORIES" :key="key" :value="key">{{ cfg.icon }} {{ cfg.label }}</option>
          </select>
          <select v-model="form.status" class="cc-select">
            <option v-for="(cfg, key) in STATUS_MAP" :key="key" :value="key">{{ cfg.icon }} {{ cfg.label }}</option>
          </select>
        </div>

        <input v-model="techInput" class="cc-input" placeholder="技术栈（回车添加，如：Vue3）"
          @keydown.enter.prevent="addTech" />
        <div v-if="form.tech_stack.length" class="cc-tag-list">
          <span v-for="t in form.tech_stack" :key="t" class="cc-tag removable">
            {{ t }} <button @click="removeTech(t)">✕</button>
          </span>
        </div>

        <div class="cc-form-label">📢 招募角色（多选）</div>
        <div class="cc-role-grid">
          <label v-for="r in ROLES" :key="r" class="cc-role-checkbox"
            :class="{ checked: form.looking_for.includes(r) }">
            <input type="checkbox" :value="r" v-model="form.looking_for" /> {{ r }}
          </label>
        </div>

        <input v-model="form.demo_url" class="cc-input" placeholder="🔗 演示地址（选填）" />
        <input v-model="form.repo_url" class="cc-input" placeholder="📦 仓库地址（选填）" />

        <button class="cc-submit-btn" :disabled="!form.title.trim()" @click="handlePublish">
          🚀 发布项目
        </button>
      </div>
    </div>

    <!-- ===== 项目详情弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showDetail && selectedProject" class="cc-modal-overlay" @click.self="showDetail=false">
        <div class="cc-modal">
          <div class="cc-detail-header">
            <div>
              <div class="cc-dh-status" :style="{color:STATUS_MAP[selectedProject.status]?.color}">
                {{ STATUS_MAP[selectedProject.status]?.icon }} {{ STATUS_MAP[selectedProject.status]?.label }}
                · {{ CATEGORIES[selectedProject.category]?.icon }} {{ CATEGORIES[selectedProject.category]?.label }}
              </div>
              <h2 class="cc-detail-title">{{ selectedProject.title }}</h2>
              <p v-if="selectedProject.tagline" class="cc-detail-tagline">{{ selectedProject.tagline }}</p>
            </div>
            <button class="cc-modal-close" @click="showDetail=false">✕</button>
          </div>

          <!-- 描述 -->
          <div v-if="selectedProject.description" class="cc-detail-desc">{{ selectedProject.description }}</div>

          <!-- 技术栈 -->
          <div v-if="selectedProject.tech_stack?.length" class="cc-detail-tags">
            <span v-for="t in selectedProject.tech_stack" :key="t" class="cc-tag">{{ t }}</span>
          </div>

          <!-- 招募 -->
          <div v-if="selectedProject.looking_for?.length && selectedProject.status==='recruiting'" class="cc-detail-looking">
            <span class="cc-looking-label">📢 正在招募：</span>
            <span v-for="r in selectedProject.looking_for" :key="r" class="cc-role-tag">{{ r }}</span>
          </div>

          <!-- 链接 -->
          <div class="cc-detail-links">
            <a v-if="selectedProject.demo_url" :href="selectedProject.demo_url" target="_blank" class="cc-link-btn">🔗 演示</a>
            <a v-if="selectedProject.repo_url" :href="selectedProject.repo_url" target="_blank" class="cc-link-btn">📦 仓库</a>
          </div>

          <!-- 统计 -->
          <div class="cc-detail-stats">
            <span>🔺 {{ selectedProject.upvotes }} 赞</span>
            <span>💬 {{ selectedProject.comment_count }} 评论</span>
            <span>👥 {{ selectedProject.member_count }} 成员</span>
            <span>👀 {{ selectedProject.views }} 浏览</span>
          </div>

          <!-- 操作 -->
          <div class="cc-detail-actions">
            <button class="cc-btn" :class="{on:selectedProject.is_upvoted}" @click="handleUpvote(selectedProject.id)">
              {{ selectedProject.is_upvoted ? '🔺 已点赞' : '△ 点赞' }}
            </button>
            <button v-if="selectedProject.status==='recruiting'" class="cc-btn primary" @click="showApplyModal=true">
              🤝 申请加入
            </button>
          </div>

          <!-- 评论区 -->
          <div class="cc-comments-section">
            <h4>💬 评论 · {{ comments.length }}</h4>
            <div class="cc-comment-input-row">
              <input v-model="commentText" class="cc-input sm" placeholder="说点什么..." @keydown.enter="handleComment" />
              <button class="cc-btn sm" @click="handleComment">发送</button>
            </div>
            <div v-for="c in comments" :key="c.id" class="cc-comment-item">
              <span class="cc-comment-user">{{ c.user_name || '匿名' }}</span>
              <span class="cc-comment-text">{{ c.content }}</span>
              <span class="cc-comment-time">{{ formatTimeAgo(c.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 申请加入弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showApplyModal && selectedProject" class="cc-modal-overlay" @click.self="showApplyModal=false">
        <div class="cc-modal sm">
          <h3>🤝 申请加入「{{ selectedProject.title }}」</h3>
          <select v-model="applyRole" class="cc-select">
            <option value="">选择角色</option>
            <option v-for="r in (selectedProject.looking_for?.length ? selectedProject.looking_for : ROLES)" :key="r" :value="r">{{ r }}</option>
          </select>
          <textarea v-model="applyMsg" class="cc-textarea" rows="3" placeholder="介绍一下你自己，为什么想加入？"></textarea>
          <div class="cc-modal-btns">
            <button class="cc-btn" @click="showApplyModal=false">取消</button>
            <button class="cc-btn primary" :disabled="!applyRole" @click="handleApply">提交申请</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toastMsg" class="cc-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useCoCreate,
  CATEGORIES,
  STATUS_MAP,
  ROLES,
  type CoProject,
  type ProjectCategory,
  type ProjectStatus,
} from '../../composables/useCoCreate'

const {
  projects, myProjects, myApplications, receivedApplications,
  loading, hasMore,
  searchProjects, fetchMyProjects,
  createProject, toggleUpvote,
  applyToProject, fetchMyApplications, fetchReceivedApplications, handleApplication,
  fetchComments, addComment,
  formatTimeAgo,
} = useCoCreate()

// ====== Tab ======
type TabKey = 'plaza' | 'mine' | 'inbox' | 'publish'
const activeTab = ref<TabKey>('plaza')
const tabs = [
  { key: 'plaza' as TabKey, icon: '🌐', label: '广场' },
  { key: 'mine' as TabKey, icon: '📂', label: '我的' },
  { key: 'inbox' as TabKey, icon: '📬', label: '申请' },
  { key: 'publish' as TabKey, icon: '✏️', label: '发布' },
]

// ====== 搜索 ======
const searchKeyword = ref('')
const filterCat = ref<ProjectCategory | ''>('')
const filterStatus = ref<ProjectStatus | ''>('')
const sortBy = ref<'latest' | 'hot' | 'trending'>('latest')
const currentPage = ref(1)

// ====== 弹窗 ======
const showDetail = ref(false)
const selectedProject = ref<CoProject | null>(null)
const showApplyModal = ref(false)
const applyRole = ref('')
const applyMsg = ref('')
const comments = ref<{ id: string; project_id: string; user_id: string; content: string; parent_id: string | null; created_at: string; user_name?: string }[]>([])
const commentText = ref('')
const toastMsg = ref('')

// ====== 发布表单 ======
const techInput = ref('')
const form = ref({
  title: '',
  tagline: '',
  description: '',
  category: 'web' as ProjectCategory,
  status: 'recruiting' as ProjectStatus,
  tech_stack: [] as string[],
  looking_for: [] as string[],
  demo_url: '',
  repo_url: '',
})

// ====== Tab切换 ======
function switchTab(key: TabKey) {
  activeTab.value = key
  if (key === 'plaza') doSearch()
  if (key === 'mine') fetchMyProjects()
  if (key === 'inbox') { fetchReceivedApplications(); fetchMyApplications() }
}

// ====== 搜索 ======
async function doSearch() {
  currentPage.value = 1
  await searchProjects({
    keyword: searchKeyword.value || undefined,
    category: filterCat.value || undefined,
    status: filterStatus.value || undefined,
    sortBy: sortBy.value, page: 1,
  })
}

async function loadMore() {
  currentPage.value++
  await searchProjects({
    keyword: searchKeyword.value || undefined,
    category: filterCat.value || undefined,
    status: filterStatus.value || undefined,
    sortBy: sortBy.value, page: currentPage.value,
  })
}

// ====== 项目详情 ======
async function openProject(p: CoProject) {
  selectedProject.value = p
  showDetail.value = true
  comments.value = await fetchComments(p.id)
}

// ====== 互动 ======
async function handleUpvote(id: string) {
  const r = await toggleUpvote(id)
  showToast(r ? '已点赞 🔺' : '取消点赞')
}

async function handleComment() {
  if (!commentText.value.trim() || !selectedProject.value) return
  const ok = await addComment(selectedProject.value.id, commentText.value.trim())
  if (ok) {
    commentText.value = ''
    comments.value = await fetchComments(selectedProject.value.id)
    showToast('评论成功 💬')
  }
}

// ====== 申请 ======
async function handleApply() {
  if (!selectedProject.value || !applyRole.value) return
  const ok = await applyToProject(selectedProject.value.id, applyRole.value, applyMsg.value)
  showApplyModal.value = false
  applyRole.value = ''; applyMsg.value = ''
  showToast(ok ? '申请已发送 🤝' : '申请失败（可能已申请过）')
}

async function handleApp(appId: string, accept: boolean) {
  await handleApplication(appId, accept)
  showToast(accept ? '已通过 ✅' : '已拒绝')
}

// ====== 发布 ======
async function handlePublish() {
  if (!form.value.title.trim()) return
  const result = await createProject({
    title: form.value.title, tagline: form.value.tagline, description: form.value.description,
    category: form.value.category, status: form.value.status,
    tech_stack: form.value.tech_stack, looking_for: form.value.looking_for,
    demo_url: form.value.demo_url || undefined, repo_url: form.value.repo_url || undefined,
  })
  if (result) {
    showToast('项目发布成功 🚀')
    form.value = { title:'', tagline:'', description:'', category:'web', status:'recruiting', tech_stack:[], looking_for:[], demo_url:'', repo_url:'' }
    activeTab.value = 'mine'; fetchMyProjects()
  } else {
    showToast('发布失败')
  }
}

function addTech() {
  const t = techInput.value.trim()
  if (t && !form.value.tech_stack.includes(t)) form.value.tech_stack.push(t)
  techInput.value = ''
}
function removeTech(t: string) { form.value.tech_stack = form.value.tech_stack.filter(x => x !== t) }

function showToast(msg: string) { toastMsg.value = msg; setTimeout(() => toastMsg.value = '', 2500) }

onMounted(async () => {
  await doSearch()
  fetchReceivedApplications()
})
</script>

<style scoped>
.cc-page{max-width:600px;margin:0 auto;padding:20px 16px 80px;min-height:100vh}
.cc-header{text-align:center;margin-bottom:16px}
.cc-title{font-size:22px;font-weight:800;color:white;margin:0}
.cc-subtitle{font-size:12px;color:rgba(255,255,255,.3);margin:4px 0 0}

/* Tab */
.cc-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.02);border-radius:14px;border:1px solid rgba(255,255,255,.05);margin-bottom:16px}
.cc-tab{flex:1;padding:10px 4px;border-radius:10px;border:none;background:none;cursor:pointer;text-align:center;transition:all .2s;position:relative}
.cc-tab.active{background:rgba(79,142,247,.1);box-shadow:0 2px 8px rgba(79,142,247,.15)}
.cc-tab-icon{display:block;font-size:16px;margin-bottom:2px}
.cc-tab-label{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:500}
.cc-tab.active .cc-tab-label{color:rgba(79,142,247,.8)}
.cc-tab-badge{position:absolute;top:4px;right:8px;width:16px;height:16px;border-radius:50%;background:#f43f5e;color:white;font-size:9px;display:flex;align-items:center;justify-content:center}

.cc-content{animation:ccFadeIn .2s ease}
@keyframes ccFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.cc-empty{text-align:center;padding:40px 0;font-size:13px;color:rgba(255,255,255,.2)}
.cc-empty.mini{padding:16px 0;font-size:12px}
.cc-loading{text-align:center;padding:40px 0}
.cc-spinner{width:28px;height:28px;border:2px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.cc-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}

/* 搜索+筛选 */
.cc-search-bar{display:flex;gap:6px;margin-bottom:10px}
.cc-search-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.cc-search-input::placeholder{color:rgba(255,255,255,.15)}
.cc-search-btn{padding:12px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;font-size:14px;cursor:pointer}
.cc-filter-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
.cc-chip{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.cc-chip.sm{font-size:10px;padding:3px 8px}
.cc-chip.active{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.15);color:rgba(139,92,246,.7)}
.cc-sort-toggle{margin-left:auto;display:flex;gap:2px}
.cc-sort-toggle button{padding:4px 8px;border-radius:6px;border:none;background:none;color:rgba(255,255,255,.2);font-size:10px;cursor:pointer}
.cc-sort-toggle button.active{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}

/* 项目卡片 */
.cc-project-list{display:flex;flex-direction:column;gap:8px}
.cc-project-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.cc-project-card:hover{background:rgba(139,92,246,.03);border-color:rgba(139,92,246,.1);transform:translateY(-1px)}
.cc-pc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.cc-pc-status{font-size:10px;font-weight:600}
.cc-pc-cat{font-size:10px;color:rgba(255,255,255,.25)}
.cc-pc-title{font-size:15px;font-weight:700;color:rgba(255,255,255,.75);margin:0 0 4px}
.cc-pc-tagline{font-size:11px;color:rgba(255,255,255,.3);margin:0 0 6px;line-height:1.4}
.cc-pc-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.cc-tag{padding:2px 8px;border-radius:4px;background:rgba(139,92,246,.06);color:rgba(139,92,246,.5);font-size:9px}
.cc-tag.removable{display:flex;align-items:center;gap:3px}
.cc-tag.removable button{background:none;border:none;color:rgba(255,255,255,.2);font-size:9px;cursor:pointer;padding:0}
.cc-pc-looking{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.cc-looking-label{font-size:10px;color:rgba(244,63,94,.5)}
.cc-role-tag{padding:1px 6px;border-radius:4px;background:rgba(244,63,94,.06);color:rgba(244,63,94,.5);font-size:9px}
.cc-pc-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.cc-pc-stats{display:flex;gap:10px;font-size:10px;color:rgba(255,255,255,.25)}
.cc-pc-time{font-size:9px;color:rgba(255,255,255,.12)}
.cc-load-more{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:4px}

/* 申请卡片 */
.cc-app-card{padding:12px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:10px}
.cc-app-card.sent{opacity:.7}
.cc-app-info strong{font-size:13px;color:rgba(255,255,255,.5);display:block;margin-bottom:2px}
.cc-app-info p{font-size:11px;color:rgba(255,255,255,.25);margin:0}
.cc-app-msg{font-style:italic;color:rgba(255,255,255,.2)!important;margin-top:2px!important}
.cc-app-actions{display:flex;gap:4px;flex-shrink:0}

/* 发布表单 */
.cc-form{display:flex;flex-direction:column;gap:8px}
.cc-input{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;width:100%;box-sizing:border-box}
.cc-input.sm{padding:8px 10px;font-size:11px}
.cc-input::placeholder{color:rgba(255,255,255,.15)}
.cc-textarea{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;resize:vertical;font-family:inherit;width:100%;box-sizing:border-box}
.cc-textarea::placeholder{color:rgba(255,255,255,.15)}
.cc-select{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;flex:1}
.cc-form-row{display:flex;gap:6px}
.cc-form-label{font-size:11px;color:rgba(255,255,255,.3);margin-top:4px}
.cc-tag-list{display:flex;flex-wrap:wrap;gap:4px}
.cc-role-grid{display:flex;flex-wrap:wrap;gap:4px}
.cc-role-checkbox{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;display:flex;align-items:center;gap:4px}
.cc-role-checkbox.checked{background:rgba(139,92,246,.06);border-color:rgba(139,92,246,.15);color:rgba(139,92,246,.6)}
.cc-role-checkbox input{display:none}
.cc-submit-btn{padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
.cc-submit-btn:disabled{opacity:.4;cursor:not-allowed}

/* 按钮 */
.cc-btn{padding:8px 14px;border-radius:8px;border:none;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.cc-btn.sm{padding:6px 10px;font-size:10px}
.cc-btn.on{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}
.cc-btn.primary{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white}
.cc-btn.accept{background:rgba(16,185,129,.08);color:rgba(16,185,129,.7)}
.cc-btn.reject{background:rgba(244,63,94,.06);color:rgba(244,63,94,.5)}

/* 弹窗 */
.cc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px);overflow-y:auto;padding:20px}
.cc-modal{background:rgba(22,18,50,.97);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:24px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto}
.cc-modal.sm{max-width:400px}
.cc-modal h3{font-size:16px;font-weight:700;color:rgba(255,255,255,.6);margin:0 0 12px}
.cc-modal-close{background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px}
.cc-modal-btns{display:flex;gap:6px;margin-top:10px;justify-content:flex-end}
.cc-detail-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.cc-dh-status{font-size:11px;font-weight:600;margin-bottom:4px}
.cc-detail-title{font-size:20px;font-weight:800;color:white;margin:0 0 4px}
.cc-detail-tagline{font-size:12px;color:rgba(255,255,255,.35);margin:0}
.cc-detail-desc{font-size:13px;color:rgba(255,255,255,.35);line-height:1.6;margin-bottom:12px;white-space:pre-wrap}
.cc-detail-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.cc-detail-looking{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.cc-detail-links{display:flex;gap:6px;margin-bottom:10px}
.cc-link-btn{padding:6px 12px;border-radius:8px;background:rgba(139,92,246,.06);color:rgba(139,92,246,.6);font-size:11px;text-decoration:none;font-weight:500}
.cc-detail-stats{display:flex;gap:14px;font-size:11px;color:rgba(255,255,255,.25);margin-bottom:12px}
.cc-detail-actions{display:flex;gap:6px;margin-bottom:16px}

/* 评论区 */
.cc-comments-section{border-top:1px solid rgba(255,255,255,.05);padding-top:12px}
.cc-comments-section h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.4);margin:0 0 8px}
.cc-comment-input-row{display:flex;gap:6px;margin-bottom:8px}
.cc-comment-item{padding:6px 0;border-bottom:1px solid rgba(255,255,255,.02)}
.cc-comment-user{font-size:10px;font-weight:600;color:rgba(139,92,246,.5);margin-right:6px}
.cc-comment-text{font-size:11px;color:rgba(255,255,255,.35)}
.cc-comment-time{font-size:9px;color:rgba(255,255,255,.12);margin-left:6px}

/* Toast */
.cc-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(139,92,246,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:600;box-shadow:0 4px 20px rgba(139,92,246,.3);animation:ccFadeIn .2s ease}
</style>

