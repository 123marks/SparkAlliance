<template>
  <!-- 学习资源中心 -->
  <div class="res-page">
    <!-- 顶部 -->
    <div class="res-header">
      <h1 class="res-title">📚 学习资源中心</h1>
      <p class="res-subtitle">优质资料，共享学习</p>
    </div>

    <!-- 搜索栏 -->
    <div class="res-search-bar">
      <input v-model="searchKeyword" class="res-search-input" placeholder="搜索课程、资料、笔记..."
        @keydown.enter="doSearch" />
      <button class="res-search-btn" @click="doSearch">🔍</button>
    </div>

    <!-- Tab -->
    <div class="res-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="res-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        <span class="res-tab-icon">{{ tab.icon }}</span>
        <span class="res-tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ===== 推荐 Tab ===== -->
    <div v-if="activeTab === 'discover'" class="res-content">
      <!-- 分类快选 -->
      <div class="res-cat-row">
        <button class="res-cat-chip" :class="{ active: !filterCategoryId }"
          @click="filterCategoryId = ''; doSearch()">全部</button>
        <button v-for="cat in categories" :key="cat.id" class="res-cat-chip"
          :class="{ active: filterCategoryId === cat.id }"
          @click="filterCategoryId = cat.id; doSearch()">
          {{ cat.icon }} {{ cat.name }}
        </button>
      </div>

      <!-- 排序 -->
      <div class="res-sort-row">
        <button v-for="s in sortOptions" :key="s.value" class="res-sort-btn"
          :class="{ active: sortBy === s.value }"
          @click="sortBy = s.value; doSearch()">{{ s.label }}</button>
        <button class="res-upload-fab" @click="showUploadModal = true">➕ 上传资源</button>
      </div>

      <!-- 资源列表 -->
      <div v-if="loading && resources.length === 0" class="res-loading"><div class="res-spinner"></div></div>
      <div v-else-if="resources.length === 0" class="res-empty">暂无资源，成为第一个分享者 ✨</div>
      <div v-else class="res-list">
        <div v-for="r in resources" :key="r.id" class="res-card" @click="openDetail(r)">
          <div class="res-card-top">
            <span class="res-card-icon">{{ getFileIcon(r.file_type) }}</span>
            <div class="res-card-info">
              <span class="res-card-title">{{ r.title }}</span>
              <span class="res-card-meta">
                {{ getCategoryName(r.category_id) }}
                <template v-if="r.course_name"> · {{ r.course_name }}</template>
              </span>
            </div>
            <button class="res-fav-btn" :class="{ on: r.is_favorited }" @click.stop="handleFav(r.id)">
              {{ r.is_favorited ? '❤️' : '🤍' }}
            </button>
          </div>
          <p v-if="r.description" class="res-card-desc">{{ r.description }}</p>
          <!-- 标签 -->
          <div v-if="r.tags && r.tags.length" class="res-card-tags">
            <span v-for="t in r.tags.slice(0, 4)" :key="t" class="res-tag">{{ t }}</span>
          </div>
          <!-- 底部统计 -->
          <div class="res-card-stats">
            <span>👁 {{ r.view_count }}</span>
            <span>⬇ {{ r.download_count }}</span>
            <span>⭐ {{ r.avg_rating > 0 ? r.avg_rating.toFixed(1) : '-' }}</span>
            <span class="res-card-time">{{ formatTimeAgo(r.created_at) }}</span>
          </div>
          <div v-if="r.uploader_nickname" class="res-card-uploader">
            <span class="res-card-avatar">{{ r.uploader_nickname[0] }}</span>
            {{ r.uploader_nickname }}
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && resources.length > 0" class="res-load-more">
        <button class="res-more-btn" :disabled="loading" @click="loadMore">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <!-- ===== 分类 Tab ===== -->
    <div v-else-if="activeTab === 'categories'" class="res-content">
      <div class="res-cat-grid">
        <div v-for="cat in categories" :key="cat.id" class="res-cat-card"
          @click="filterCategoryId = cat.id; activeTab = 'discover'; doSearch()">
          <span class="res-cat-card-icon" :style="{ background: cat.color + '15', color: cat.color }">
            {{ cat.icon }}
          </span>
          <span class="res-cat-card-name">{{ cat.name }}</span>
        </div>
      </div>

      <!-- 学科快选 -->
      <h3 class="res-section-title">📖 按学科浏览</h3>
      <div class="res-subject-grid">
        <button v-for="s in SUBJECTS" :key="s" class="res-subject-btn"
          @click="searchKeyword = s; activeTab = 'discover'; doSearch()">{{ s }}</button>
      </div>

      <!-- 热门标签 -->
      <h3 class="res-section-title">🔥 热门标签</h3>
      <div class="res-tag-cloud">
        <button v-for="t in POPULAR_TAGS" :key="t" class="res-tag-btn"
          @click="searchKeyword = t; activeTab = 'discover'; doSearch()">{{ t }}</button>
      </div>
    </div>

    <!-- ===== 我的 Tab ===== -->
    <div v-else-if="activeTab === 'mine'" class="res-content">
      <!-- 我的数据 -->
      <div class="res-my-stats">
        <div class="res-my-stat"><span class="res-my-val">{{ myUploads.length }}</span><span class="res-my-lab">我的上传</span></div>
        <div class="res-my-stat"><span class="res-my-val">{{ myFavorites.length }}</span><span class="res-my-lab">我的收藏</span></div>
      </div>

      <!-- 操作 -->
      <button class="res-action-btn primary full" @click="showUploadModal = true">➕ 上传新资源</button>

      <!-- 我的上传 -->
      <h3 class="res-section-title">📤 我的上传</h3>
      <div v-if="myUploads.length === 0" class="res-empty mini">暂无上传</div>
      <div v-for="r in myUploads" :key="r.id" class="res-mini-card" @click="openDetail(r)">
        <span class="res-mini-icon">{{ getFileIcon(r.file_type) }}</span>
        <div class="res-mini-info">
          <span class="res-mini-title">{{ r.title }}</span>
          <span class="res-mini-meta">👁{{ r.view_count }} · ⬇{{ r.download_count }} · ⭐{{ r.avg_rating > 0 ? r.avg_rating.toFixed(1) : '-' }}</span>
        </div>
        <button class="res-delete-btn" @click.stop="handleDelete(r.id)">🗑</button>
      </div>

      <!-- 我的收藏 -->
      <h3 class="res-section-title" style="margin-top:20px">❤️ 我的收藏</h3>
      <div v-if="myFavorites.length === 0" class="res-empty mini">暂无收藏</div>
      <div v-for="r in myFavorites" :key="r.id" class="res-mini-card" @click="openDetail(r)">
        <span class="res-mini-icon">{{ getFileIcon(r.file_type) }}</span>
        <div class="res-mini-info">
          <span class="res-mini-title">{{ r.title }}</span>
          <span class="res-mini-meta">by {{ r.uploader_nickname || '用户' }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 资源详情弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showDetailModal && currentResource" class="res-modal-overlay" @click.self="showDetailModal = false">
        <div class="res-modal detail-modal">
          <div class="res-detail-header">
            <span class="res-detail-icon">{{ getFileIcon(currentResource.file_type) }}</span>
            <div class="res-detail-title-wrap">
              <h3 class="res-detail-title">{{ currentResource.title }}</h3>
              <span class="res-detail-cat">{{ getCategoryName(currentResource.category_id) }}
                <template v-if="currentResource.course_name"> · {{ currentResource.course_name }}</template>
              </span>
            </div>
            <button class="res-modal-close" @click="showDetailModal = false">✕</button>
          </div>

          <!-- 描述 -->
          <p v-if="currentResource.description" class="res-detail-desc">{{ currentResource.description }}</p>

          <!-- 标签 -->
          <div v-if="currentResource.tags?.length" class="res-detail-tags">
            <span v-for="t in currentResource.tags" :key="t" class="res-tag">{{ t }}</span>
          </div>

          <!-- 信息行 -->
          <div class="res-detail-info-grid">
            <div v-if="currentResource.subject" class="res-info-item"><span class="res-info-label">学科</span><span>{{ currentResource.subject }}</span></div>
            <div v-if="currentResource.teacher_name" class="res-info-item"><span class="res-info-label">教师</span><span>{{ currentResource.teacher_name }}</span></div>
            <div v-if="currentResource.file_size" class="res-info-item"><span class="res-info-label">大小</span><span>{{ formatFileSize(currentResource.file_size) }}</span></div>
            <div class="res-info-item"><span class="res-info-label">上传者</span><span>{{ currentResource.uploader_nickname || '用户' }}</span></div>
          </div>

          <!-- 统计条 -->
          <div class="res-detail-stats">
            <span>👁 {{ currentResource.view_count }} 浏览</span>
            <span>⬇ {{ currentResource.download_count }} 下载</span>
            <span>❤️ {{ currentResource.favorite_count }} 收藏</span>
            <span>⭐ {{ currentResource.avg_rating > 0 ? currentResource.avg_rating.toFixed(1) : '-' }} ({{ currentResource.rating_count }}人评分)</span>
          </div>

          <!-- 操作 -->
          <div class="res-detail-actions">
            <button class="res-btn primary" @click="handleDownload">
              {{ currentResource.resource_type === 'link' ? '🔗 打开链接' : '⬇ 下载资源' }}
            </button>
            <button class="res-btn ghost" :class="{ on: currentResource.is_favorited }" @click="handleFav(currentResource.id)">
              {{ currentResource.is_favorited ? '❤️ 已收藏' : '🤍 收藏' }}
            </button>
          </div>

          <!-- 纯文本内容 -->
          <div v-if="currentResource.content" class="res-detail-content">
            <h4>📝 内容预览</h4>
            <pre class="res-content-pre">{{ currentResource.content }}</pre>
          </div>

          <!-- 评分区 -->
          <div class="res-rating-section">
            <h4 class="res-section-title">⭐ 评分与评价</h4>
            <div class="res-my-rating">
              <span class="res-rating-label">我的评分：</span>
              <div class="res-stars">
                <button v-for="s in 5" :key="s" class="res-star"
                  :class="{ on: s <= myRatingValue }"
                  @click="myRatingValue = s">★</button>
              </div>
              <input v-model="myRatingComment" class="res-rating-input" placeholder="写几句评价（可选）" />
              <button class="res-btn primary small" :disabled="myRatingValue === 0"
                @click="handleSubmitRating">提交评分</button>
            </div>

            <!-- 评价列表 -->
            <div v-for="rv in resourceRatings" :key="rv.id" class="res-review-item">
              <div class="res-review-header">
                <span class="res-review-avatar">{{ rv.nickname?.[0] || '?' }}</span>
                <span class="res-review-name">{{ rv.nickname || '用户' }}</span>
                <span class="res-review-stars">{{ '★'.repeat(rv.rating) }}{{ '☆'.repeat(5 - rv.rating) }}</span>
              </div>
              <p v-if="rv.comment" class="res-review-text">{{ rv.comment }}</p>
            </div>
            <div v-if="resourceRatings.length === 0" class="res-empty mini">暂无评价</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 上传资源弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="res-modal-overlay" @click.self="showUploadModal = false">
        <div class="res-modal upload-modal">
          <h3 class="res-modal-title">➕ 上传资源</h3>

          <div class="res-form-group">
            <label>资源标题 *</label>
            <input v-model="uploadForm.title" class="res-input" placeholder="如：操作系统期末真题2025" maxlength="200" />
          </div>

          <div class="res-form-group">
            <label>资源描述</label>
            <textarea v-model="uploadForm.description" class="res-textarea" rows="3" placeholder="简单描述资源内容"></textarea>
          </div>

          <div class="res-form-row">
            <div class="res-form-group half">
              <label>分类</label>
              <select v-model="uploadForm.categoryId" class="res-select">
                <option value="">选择分类</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>
            <div class="res-form-group half">
              <label>资源类型</label>
              <select v-model="uploadForm.resourceType" class="res-select">
                <option value="file">📁 文件上传</option>
                <option value="link">🔗 外部链接</option>
                <option value="text">📝 纯文本笔记</option>
              </select>
            </div>
          </div>

          <div class="res-form-row">
            <div class="res-form-group half">
              <label>学科</label>
              <select v-model="uploadForm.subject" class="res-select">
                <option value="">选择学科</option>
                <option v-for="s in SUBJECTS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="res-form-group half">
              <label>课程名</label>
              <input v-model="uploadForm.courseName" class="res-input" placeholder="如：高等数学" />
            </div>
          </div>

          <div class="res-form-group">
            <label>教师</label>
            <input v-model="uploadForm.teacherName" class="res-input" placeholder="授课教师（可选）" />
          </div>

          <!-- 标签 -->
          <div class="res-form-group">
            <label>标签（点击添加）</label>
            <div class="res-tag-picker">
              <button v-for="t in POPULAR_TAGS" :key="t" class="res-tag-opt"
                :class="{ active: uploadForm.tags.includes(t) }"
                @click="toggleTag(t)">{{ t }}</button>
            </div>
          </div>

          <!-- 文件上传区 -->
          <div v-if="uploadForm.resourceType === 'file'" class="res-form-group">
            <label>选择文件</label>
            <div class="res-file-drop" @click="triggerFileInput">
              <input ref="fileInputRef" type="file" class="res-file-input" @change="onFileSelected" />
              <p v-if="!selectedFile">📁 点击选择文件</p>
              <p v-else>✅ {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</p>
            </div>
          </div>

          <!-- 外部链接 -->
          <div v-if="uploadForm.resourceType === 'link'" class="res-form-group">
            <label>外部链接</label>
            <input v-model="uploadForm.externalUrl" class="res-input" placeholder="https://..." />
          </div>

          <!-- 纯文本内容 -->
          <div v-if="uploadForm.resourceType === 'text'" class="res-form-group">
            <label>笔记内容</label>
            <textarea v-model="uploadForm.content" class="res-textarea" rows="6" placeholder="在此输入笔记内容..."></textarea>
          </div>

          <div class="res-modal-actions">
            <button class="res-btn cancel" @click="showUploadModal = false">取消</button>
            <button class="res-btn primary" :disabled="!canUpload || uploading" @click="handleUpload">
              {{ uploading ? '上传中...' : '🚀 发布资源' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toastMsg" class="res-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useResources,
  SUBJECTS,
  POPULAR_TAGS,
  type SortBy,
  type ResourceUploadForm,
  type LearningResource,
} from '../../composables/useResources'

const {
  categories,
  resources,
  currentResource,
  resourceRatings,
  myFavorites,
  myUploads,
  loading,
  hasMore,

  fetchCategories,
  searchResources,
  getResourceDetail,
  createResource,
  uploadFileResource,
  deleteResource,
  toggleFavorite,
  fetchMyFavorites,
  submitRating,
  recordDownload,
  fetchMyUploads,
  formatFileSize,
  formatTimeAgo,
  getFileIcon,
  getCategoryName,
} = useResources()

// ====== Tab ======
const activeTab = ref<'discover' | 'categories' | 'mine'>('discover')
const tabs = [
  { key: 'discover' as const, icon: '🌟', label: '推荐' },
  { key: 'categories' as const, icon: '📂', label: '分类' },
  { key: 'mine' as const, icon: '👤', label: '我的' },
]

// ====== 搜索状态 ======
const searchKeyword = ref('')
const filterCategoryId = ref('')
const sortBy = ref<SortBy>('newest')
const currentPage = ref(1)
const sortOptions = [
  { value: 'newest' as SortBy, label: '最新' },
  { value: 'popular' as SortBy, label: '最热' },
  { value: 'rating' as SortBy, label: '好评' },
  { value: 'downloads' as SortBy, label: '下载' },
]

// ====== 弹窗 ======
const showDetailModal = ref(false)
const showUploadModal = ref(false)
const toastMsg = ref('')

// 详情
const myRatingValue = ref(0)
const myRatingComment = ref('')

// 上传
const uploadForm = ref<ResourceUploadForm>({
  title: '',
  description: '',
  categoryId: '',
  tags: [],
  resourceType: 'file',
  subject: '',
  courseName: '',
  teacherName: '',
  externalUrl: '',
  content: '',
})
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

// 上传校验
const canUpload = computed(() => {
  const f = uploadForm.value
  if (!f.title.trim()) return false
  if (f.resourceType === 'file' && !selectedFile.value) return false
  if (f.resourceType === 'link' && !f.externalUrl.trim()) return false
  if (f.resourceType === 'text' && !f.content.trim()) return false
  return true
})

// ====== Tab切换 ======
function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'mine') loadMineData()
}

// ====== 搜索 ======
async function doSearch() {
  currentPage.value = 1
  await searchResources({
    keyword: searchKeyword.value,
    categoryId: filterCategoryId.value || undefined,
    sortBy: sortBy.value,
    page: 1,
  })
}

async function loadMore() {
  currentPage.value++
  await searchResources({
    keyword: searchKeyword.value,
    categoryId: filterCategoryId.value || undefined,
    sortBy: sortBy.value,
    page: currentPage.value,
  })
}

// ====== 详情 ======
async function openDetail(r: LearningResource) {
  await getResourceDetail(r.id)
  myRatingValue.value = 0
  myRatingComment.value = ''
  showDetailModal.value = true
}

// ====== 收藏 ======
async function handleFav(resourceId: string) {
  const result = await toggleFavorite(resourceId)
  showToast(result ? '已收藏 ❤️' : '已取消收藏')
}

// ====== 下载 ======
async function handleDownload() {
  if (!currentResource.value) return
  const r = currentResource.value

  await recordDownload(r.id)

  if (r.resource_type === 'link' && r.external_url) {
    window.open(r.external_url, '_blank')
  } else if (r.file_url) {
    window.open(r.file_url, '_blank')
  } else if (r.content) {
    // 文本类资源，复制到剪贴板
    navigator.clipboard.writeText(r.content).then(() => showToast('已复制到剪贴板'))
  }
}

// ====== 评分 ======
async function handleSubmitRating() {
  if (!currentResource.value || myRatingValue.value === 0) return
  await submitRating(currentResource.value.id, myRatingValue.value, myRatingComment.value)
  showToast('评分已提交 ⭐')
  myRatingComment.value = ''
}

// ====== 上传 ======
function toggleTag(t: string) {
  const idx = uploadForm.value.tags.indexOf(t)
  if (idx >= 0) uploadForm.value.tags.splice(idx, 1)
  else uploadForm.value.tags.push(t)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

async function handleUpload() {
  if (!canUpload.value || uploading.value) return
  uploading.value = true

  try {
    let result: string | null = null
    if (uploadForm.value.resourceType === 'file' && selectedFile.value) {
      result = await uploadFileResource(uploadForm.value, selectedFile.value)
    } else {
      result = await createResource(uploadForm.value)
    }

    if (result) {
      showUploadModal.value = false
      showToast('资源发布成功 🎉')
      // 重置表单
      uploadForm.value = { title: '', description: '', categoryId: '', tags: [], resourceType: 'file', subject: '', courseName: '', teacherName: '', externalUrl: '', content: '' }
      selectedFile.value = null
      // 刷新列表
      await doSearch()
    } else {
      showToast('发布失败，请重试')
    }
  } finally {
    uploading.value = false
  }
}

// ====== 删除 ======
async function handleDelete(id: string) {
  const ok = confirm('确定删除此资源吗？')
  if (!ok) return
  const success = await deleteResource(id)
  if (success) {
    showToast('已删除')
    await fetchMyUploads()
  }
}

// ====== 我的 ======
async function loadMineData() {
  await fetchMyUploads()
  await fetchMyFavorites()
}

// ====== 工具 ======
function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

// ====== 生命周期 ======
onMounted(async () => {
  await fetchCategories()
  await doSearch()
})
</script>

<style scoped>
/* 页面 */
.res-page{max-width:600px;margin:0 auto;padding:20px 16px 80px;min-height:100vh}
.res-header{text-align:center;margin-bottom:16px}
.res-title{font-size:22px;font-weight:800;color:white;margin:0}
.res-subtitle{font-size:12px;color:rgba(255,255,255,.3);margin:4px 0 0}

/* 搜索栏 */
.res-search-bar{display:flex;gap:6px;margin-bottom:14px}
.res-search-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.res-search-input::placeholder{color:rgba(255,255,255,.15)}
.res-search-btn{padding:12px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white;font-size:14px;cursor:pointer}

/* Tab */
.res-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.02);border-radius:14px;border:1px solid rgba(255,255,255,.05);margin-bottom:16px}
.res-tab{flex:1;padding:10px 4px;border-radius:10px;border:none;background:none;cursor:pointer;text-align:center;transition:all .2s}
.res-tab.active{background:rgba(79,142,247,.1);box-shadow:0 2px 8px rgba(79,142,247,.15)}
.res-tab-icon{display:block;font-size:16px;margin-bottom:2px}
.res-tab-label{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:500}
.res-tab.active .res-tab-label{color:rgba(79,142,247,.8)}

/* 通用 */
.res-content{animation:resFadeIn .2s ease}
@keyframes resFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.res-empty{text-align:center;padding:40px 0;font-size:13px;color:rgba(255,255,255,.2)}
.res-empty.mini{padding:16px 0;font-size:12px}
.res-loading{text-align:center;padding:40px 0}
.res-spinner{width:28px;height:28px;border:2px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.res-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.5);margin:16px 0 10px}

/* 分类快选 */
.res-cat-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.res-cat-chip{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.res-cat-chip.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}

/* 排序行 */
.res-sort-row{display:flex;gap:4px;align-items:center;margin-bottom:14px}
.res-sort-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:none;color:rgba(255,255,255,.25);font-size:11px;cursor:pointer;transition:all .2s}
.res-sort-btn.active{background:rgba(79,142,247,.08);color:rgba(79,142,247,.6);border-color:rgba(79,142,247,.12)}
.res-upload-fab{margin-left:auto;padding:6px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,#10b981,#06b6d4);color:white;font-size:11px;font-weight:600;cursor:pointer}

/* 资源卡片 */
.res-list{display:flex;flex-direction:column;gap:8px}
.res-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.res-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:translateY(-1px)}
.res-card-top{display:flex;align-items:flex-start;gap:10px}
.res-card-icon{font-size:24px;flex-shrink:0;margin-top:2px}
.res-card-info{flex:1;min-width:0}
.res-card-title{display:block;font-size:14px;font-weight:600;color:rgba(255,255,255,.7);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.res-card-meta{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}
.res-fav-btn{background:none;border:none;font-size:16px;cursor:pointer;padding:2px;flex-shrink:0}
.res-card-desc{font-size:11px;color:rgba(255,255,255,.2);margin:6px 0 0;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.res-card-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.res-tag{padding:2px 6px;border-radius:4px;background:rgba(79,142,247,.06);color:rgba(79,142,247,.5);font-size:9px}
.res-card-stats{display:flex;gap:10px;margin-top:8px;font-size:10px;color:rgba(255,255,255,.2)}
.res-card-time{margin-left:auto}
.res-card-uploader{display:flex;align-items:center;gap:4px;margin-top:6px;font-size:10px;color:rgba(255,255,255,.15)}
.res-card-avatar{width:16px;height:16px;border-radius:4px;background:rgba(79,142,247,.15);display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:rgba(79,142,247,.6);font-weight:700}

/* 加载更多 */
.res-load-more{text-align:center;padding:16px 0}
.res-more-btn{padding:10px 24px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer}

/* 分类网格 */
.res-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.res-cat-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 10px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);cursor:pointer;transition:all .2s}
.res-cat-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:scale(1.02)}
.res-cat-card-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px}
.res-cat-card-name{font-size:12px;color:rgba(255,255,255,.5);font-weight:500}

/* 学科/标签网格 */
.res-subject-grid{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px}
.res-subject-btn{padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.res-subject-btn:hover{background:rgba(79,142,247,.06);color:rgba(79,142,247,.5)}
.res-tag-cloud{display:flex;flex-wrap:wrap;gap:4px}
.res-tag-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(249,115,22,.08);background:rgba(249,115,22,.04);color:rgba(249,115,22,.5);font-size:11px;cursor:pointer}

/* 我的 */
.res-my-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.res-my-stat{text-align:center;padding:16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)}
.res-my-val{display:block;font-size:24px;font-weight:800;color:rgba(79,142,247,.7)}
.res-my-lab{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}
.res-action-btn{padding:14px;border-radius:14px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.res-action-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.res-action-btn.full{width:100%;margin-bottom:16px}

/* 迷你卡片（我的上传/收藏） */
.res-mini-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:4px;cursor:pointer}
.res-mini-icon{font-size:20px;flex-shrink:0}
.res-mini-info{flex:1;min-width:0}
.res-mini-title{display:block;font-size:13px;font-weight:500;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.res-mini-meta{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-top:1px}
.res-delete-btn{background:none;border:none;font-size:14px;cursor:pointer;opacity:.3;transition:opacity .2s}
.res-delete-btn:hover{opacity:.7}

/* 弹窗 */
.res-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px);overflow-y:auto;padding:20px}
.res-modal{background:rgba(22,18,50,.97);border:1px solid rgba(79,142,247,.12);border-radius:20px;padding:24px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto}
.res-modal-title{font-size:16px;font-weight:700;color:rgba(255,255,255,.7);margin:0 0 16px}
.res-modal-close{background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px}
.res-modal-close:hover{background:rgba(255,255,255,.05);color:white}

/* 详情弹窗 */
.res-detail-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.res-detail-icon{font-size:32px;flex-shrink:0}
.res-detail-title-wrap{flex:1}
.res-detail-title{font-size:16px;font-weight:700;color:white;margin:0;line-height:1.3}
.res-detail-cat{font-size:11px;color:rgba(255,255,255,.25);margin-top:2px;display:block}
.res-detail-desc{font-size:12px;color:rgba(255,255,255,.3);line-height:1.5;margin:0 0 10px}
.res-detail-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
.res-detail-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:12px}
.res-info-item{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.02);font-size:11px;color:rgba(255,255,255,.4)}
.res-info-label{display:block;font-size:9px;color:rgba(255,255,255,.2);margin-bottom:2px}
.res-detail-stats{display:flex;gap:10px;font-size:10px;color:rgba(255,255,255,.25);margin-bottom:14px;flex-wrap:wrap}
.res-detail-actions{display:flex;gap:8px;margin-bottom:16px}
.res-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.res-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.res-btn.ghost{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3);border:1px solid rgba(255,255,255,.06)}
.res-btn.ghost.on{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.1);color:rgba(239,68,68,.5)}
.res-btn.small{flex:none;padding:6px 14px;font-size:12px}
.res-btn:disabled{opacity:.3;cursor:default}
.res-detail-content{margin-top:14px}
.res-detail-content h4{font-size:12px;color:rgba(255,255,255,.4);margin:0 0 8px}
.res-content-pre{padding:12px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);color:rgba(255,255,255,.4);font-size:12px;white-space:pre-wrap;word-wrap:break-word;max-height:200px;overflow-y:auto;font-family:inherit}

/* 评分区 */
.res-rating-section{margin-top:16px;border-top:1px solid rgba(255,255,255,.04);padding-top:14px}
.res-my-rating{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px}
.res-rating-label{font-size:12px;color:rgba(255,255,255,.3)}
.res-stars{display:flex;gap:2px}
.res-star{background:none;border:none;font-size:20px;cursor:pointer;color:rgba(255,255,255,.1);transition:color .15s}
.res-star.on{color:#f97316}
.res-rating-input{flex:1;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:white;font-size:11px;outline:none}
.res-rating-input::placeholder{color:rgba(255,255,255,.12)}
.res-review-item{padding:10px;border-radius:10px;background:rgba(255,255,255,.015);margin-bottom:4px}
.res-review-header{display:flex;align-items:center;gap:6px}
.res-review-avatar{width:22px;height:22px;border-radius:6px;background:rgba(79,142,247,.15);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(79,142,247,.6);font-weight:700}
.res-review-name{font-size:11px;color:rgba(255,255,255,.4);flex:1}
.res-review-stars{font-size:12px;color:#f97316}
.res-review-text{font-size:11px;color:rgba(255,255,255,.25);margin:4px 0 0;line-height:1.4}

/* 上传弹窗 */
.res-form-group{margin-bottom:12px}
.res-form-group label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,.3);margin-bottom:4px}
.res-form-group.half{flex:1}
.res-form-row{display:flex;gap:10px}
.res-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.res-input::placeholder{color:rgba(255,255,255,.15)}
.res-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit}
.res-textarea::placeholder{color:rgba(255,255,255,.15)}
.res-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;appearance:none}
.res-select option{background:#1a1530;color:white}
.res-tag-picker{display:flex;flex-wrap:wrap;gap:4px}
.res-tag-opt{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;transition:all .2s}
.res-tag-opt.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}
.res-file-drop{padding:24px;border-radius:12px;border:2px dashed rgba(255,255,255,.06);text-align:center;cursor:pointer;color:rgba(255,255,255,.2);font-size:13px;transition:border-color .2s}
.res-file-drop:hover{border-color:rgba(79,142,247,.2)}
.res-file-input{display:none}
.res-modal-actions{display:flex;gap:8px;margin-top:16px}
.res-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}

/* Toast */
.res-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(79,142,247,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:600;box-shadow:0 4px 20px rgba(79,142,247,.3);animation:resFadeIn .2s ease}
</style>
