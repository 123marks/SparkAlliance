<template>
  <div class="mentors-page">
    <!-- 顶栏 -->
    <div class="mt-topbar">
      <div class="mt-greeting">
        <h1 class="mt-title">🎓 学长分享</h1>
        <p class="mt-subtitle">经验传承 · 互助成长</p>
      </div>
      <div class="mt-top-actions">
        <button class="mt-apply-btn" @click="showApply = true">
          {{ myProfile ? '✏️ 编辑资料' : '🎓 成为学长' }}
        </button>
        <button v-if="myProfile" class="mt-write-btn" @click="showWrite = true">
          ✍️ 写文章
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="mt-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="mt-tab" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- ===== 推荐 Tab ===== -->
    <div v-if="activeTab === 'recommend'" class="mt-content">
      <!-- 热门标签 -->
      <div class="mt-tags-scroll">
        <button
          v-for="tag in HOT_TAGS.slice(0, 12)"
          :key="tag"
          class="mt-tag-chip"
          :class="{ active: selectedTag === tag }"
          @click="handleTagClick(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <!-- 金牌学长 -->
      <div v-if="topMentorsList.length" class="mt-section">
        <h2 class="mt-section-title">👑 金牌学长</h2>
        <div class="mt-mentors-scroll">
          <MentorCard v-for="m in topMentorsList" :key="m.id" :mentor="m" @click="handleMentorClick" />
        </div>
      </div>

      <!-- 推荐文章 -->
      <div class="mt-section">
        <h2 class="mt-section-title">📖 推荐阅读</h2>
        <div class="mt-articles-grid">
          <ArticleCard v-for="a in recommendedArticles" :key="a.id" :article="a" @click="openArticle" />
        </div>
        <p v-if="!loading && recommendedArticles.length === 0" class="mt-empty">暂无推荐文章，学长快来分享吧 ✨</p>
      </div>
    </div>

    <!-- ===== 经验库 Tab ===== -->
    <div v-else-if="activeTab === 'library'" class="mt-content">
      <!-- 搜索+分类 -->
      <div class="mt-filter-bar">
        <input v-model="searchQuery" class="mt-search" placeholder="🔍 搜索文章..." @keydown.enter="handleSearch" />
      </div>
      <div class="mt-cat-tabs">
        <button class="mt-cat-tab" :class="{ active: !filterCategory }" @click="filterCategory = ''">全部</button>
        <button
          v-for="cat in ARTICLE_CATEGORIES"
          :key="cat.value"
          class="mt-cat-tab"
          :class="{ active: filterCategory === cat.value }"
          @click="filterCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>
      <!-- 排序 -->
      <div class="mt-sort-row">
        <button v-for="s in sortOptions" :key="s.value" class="mt-sort-btn" :class="{ active: sortBy === s.value }" @click="sortBy = s.value">
          {{ s.label }}
        </button>
        <span class="mt-total">共 {{ totalCount }} 篇</span>
      </div>
      <!-- 文章列表 -->
      <div class="mt-articles-grid">
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" @click="openArticle" />
      </div>
      <p v-if="!loading && articles.length === 0" class="mt-empty">{{ searchQuery ? '没有找到相关文章' : '该分类暂无文章' }}</p>
      <!-- 加载更多 -->
      <button v-if="articles.length < totalCount" class="mt-load-more" @click="loadMore" :disabled="loading">
        {{ loading ? '加载中...' : '加载更多' }}
      </button>
    </div>

    <!-- ===== 我的咨询 Tab ===== -->
    <div v-else-if="activeTab === 'consult'" class="mt-content">
      <button class="mt-consult-create" @click="showConsult = true">
        💬 发起新咨询
      </button>
      <div v-if="consultations.length === 0 && !loading" class="mt-empty-card">
        <p>📭 暂无咨询记录</p>
        <p class="mt-hint">有问题？找学长一对一解答</p>
      </div>
      <div v-for="c in consultations" :key="c.id" class="mt-consult-card">
        <div class="mt-consult-head">
          <span class="mt-consult-cat">{{ getCategoryConfig(c.category).label }}</span>
          <span class="mt-consult-status" :class="c.status">{{ statusLabels[c.status] || c.status }}</span>
        </div>
        <h3 class="mt-consult-title">{{ c.title }}</h3>
        <p class="mt-consult-desc">{{ c.description.slice(0, 80) }}{{ c.description.length > 80 ? '...' : '' }}</p>
        <!-- 匹配信息 -->
        <div v-if="c.mentor" class="mt-consult-mentor">
          <span class="mt-consult-mentor-name">🎓 {{ (c.mentor as any).display_name }} {{ (c.mentor as any).certification_level ? getCertLevelConfig((c.mentor as any).certification_level).icon : '' }}</span>
          <span v-if="c.ai_match_score" class="mt-consult-score">AI匹配 {{ c.ai_match_score }}%</span>
        </div>
        <div v-if="c.ai_match_reason" class="mt-consult-reason">💡 {{ c.ai_match_reason }}</div>
        <!-- 操作按钮 -->
        <div class="mt-consult-acts">
          <button v-if="c.status === 'matched' && isMentor(c)" class="mt-consult-act accept" @click="handleAccept(c.id)">✅ 接单</button>
          <button v-if="c.status === 'accepted' || c.status === 'in_progress'" class="mt-consult-act complete" @click="handleComplete(c.id)">✔ 完成</button>
          <button v-if="c.status === 'completed' && isStudent(c)" class="mt-consult-act review" @click="openReview(c)">⭐ 评价</button>
        </div>
        <!-- 评价展示 -->
        <div v-if="c.rating" class="mt-consult-review">
          <span>{{ '⭐'.repeat(c.rating) }} {{ c.review_text }}</span>
        </div>
        <div class="mt-consult-time">{{ formatTimeAgo(c.created_at) }}</div>
      </div>
    </div>

    <!-- ===== 学长空间 Tab ===== -->
    <div v-else-if="activeTab === 'space'" class="mt-content">
      <div v-if="!myProfile" class="mt-empty-card">
        <p>🎓 你还未认证为学长</p>
        <p class="mt-hint">成为学长，分享经验，获得积分和认证</p>
        <button class="mt-become-btn" @click="showApply = true">立即申请</button>
      </div>
      <template v-else>
        <!-- 我的档案 -->
        <div class="mt-myprofile">
          <div class="mt-mp-header">
            <div class="mt-mp-avatar">{{ myProfile.display_name[0] }}</div>
            <div class="mt-mp-info">
              <h3 class="mt-mp-name">{{ myProfile.display_name }}
                <span class="mt-mp-cert" :style="{ color: getCertLevelConfig(myProfile.certification_level).color }">
                  {{ getCertLevelConfig(myProfile.certification_level).icon }} {{ getCertLevelConfig(myProfile.certification_level).label }}
                </span>
              </h3>
              <p class="mt-mp-meta">{{ myProfile.university }} · {{ myProfile.major }}</p>
            </div>
          </div>
          <div class="mt-mp-stats">
            <div class="mt-mp-stat">
              <span class="mt-mp-stat-num">{{ myProfile.article_count }}</span>
              <span class="mt-mp-stat-label">文章</span>
            </div>
            <div class="mt-mp-stat">
              <span class="mt-mp-stat-num">{{ myProfile.consultation_count }}</span>
              <span class="mt-mp-stat-label">咨询</span>
            </div>
            <div class="mt-mp-stat">
              <span class="mt-mp-stat-num">{{ myProfile.total_likes }}</span>
              <span class="mt-mp-stat-label">获赞</span>
            </div>
            <div class="mt-mp-stat">
              <span class="mt-mp-stat-num">{{ myProfile.contribution_points }}</span>
              <span class="mt-mp-stat-label">积分</span>
            </div>
          </div>
          <div class="mt-mp-tags">
            <span v-for="tag in myProfile.expertise_tags" :key="tag" class="mt-mp-tag">{{ tag }}</span>
          </div>
          <button class="mt-edit-btn" @click="showApply = true">✏️ 编辑资料</button>
        </div>

        <!-- 我的文章 -->
        <div class="mt-section">
          <h2 class="mt-section-title">📝 我的文章</h2>
          <div class="mt-articles-grid" v-if="myArticles.length">
            <ArticleCard v-for="a in myArticles" :key="a.id" :article="a" @click="openArticle" />
          </div>
          <p v-else class="mt-empty">还没发布文章，写一篇分享你的经验吧</p>
        </div>
      </template>
    </div>

    <!-- ===== 弹窗层 ===== -->

    <!-- 认证申请 -->
    <MentorApply :visible="showApply" @close="showApply = false" @applied="handleApplied" />

    <!-- 发起咨询 -->
    <ConsultSheet :visible="showConsult" @close="showConsult = false" @submitted="handleConsultSubmitted" />

    <!-- 文章详情 -->
    <ArticleDetail
      :article="detailArticle"
      :comments="detailComments"
      @close="detailArticle = null"
      @like="handleLike"
      @bookmark="handleBookmark"
      @share-wall="handleShareWall"
      @create-goal="handleCreateGoal"
      @comment="handleAddComment"
    />

    <!-- 写文章弹窗 -->
    <Transition name="fade">
      <div v-if="showWrite" class="mt-modal-overlay" @click.self="showWrite = false">
        <div class="mt-modal write-modal">
          <h3>✍️ 发布经验分享</h3>
          <!-- 分类 -->
          <div class="mt-write-cats">
            <button v-for="cat in ARTICLE_CATEGORIES" :key="cat.value" class="mt-wcat" :class="{ active: writeForm.category === cat.value }" @click="writeForm.category = cat.value">
              {{ cat.label }}
            </button>
          </div>
          <input v-model="writeForm.title" class="mt-winput" placeholder="文章标题" maxlength="100" />
          <textarea v-model="writeForm.content" class="mt-wtextarea" rows="8" placeholder="分享你的经验、技巧、心得...
支持 Markdown 格式" maxlength="5000"></textarea>
          <!-- 标签 -->
          <div class="mt-write-tags">
            <button v-for="tag in HOT_TAGS.slice(0, 12)" :key="tag" class="mt-wtag" :class="{ active: writeForm.tags.includes(tag) }" @click="toggleWriteTag(tag)">
              {{ tag }}
            </button>
          </div>
          <!-- 封面 -->
          <label class="mt-cover-upload">
            <input type="file" accept="image/*" @change="handleCoverSelect" style="display:none" />
            📸 {{ writeCoverFile ? writeCoverFile.name : '添加封面图（可选）' }}
          </label>
          <div class="mt-modal-actions">
            <button class="mt-modal-cancel" @click="showWrite = false">取消</button>
            <button class="mt-modal-confirm" :disabled="!writeForm.title.trim() || !writeForm.content.trim() || publishing" @click="handlePublish">
              {{ publishing ? '发布中...' : '🚀 发布' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 评价咨询弹窗 -->
    <Transition name="fade">
      <div v-if="reviewingConsult" class="mt-modal-overlay" @click.self="reviewingConsult = null">
        <div class="mt-modal">
          <h3>⭐ 评价咨询</h3>
          <div class="mt-rating">
            <button v-for="s in 5" :key="s" class="mt-star" :class="{ active: reviewRating >= s }" @click="reviewRating = s">⭐</button>
          </div>
          <textarea v-model="reviewText" class="mt-rtextarea" rows="3" placeholder="分享你的咨询体验..."></textarea>
          <div class="mt-modal-actions">
            <button class="mt-modal-cancel" @click="reviewingConsult = null">取消</button>
            <button class="mt-modal-confirm" :disabled="!reviewText.trim()" @click="submitReview">提交</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toastMsg" class="mt-toast">{{ toastMsg }}</div>
    </Transition>

    <!-- 加载 -->
    <div v-if="loading" class="mt-loading"><div class="mt-spinner"></div></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMentor, ARTICLE_CATEGORIES, HOT_TAGS } from '../../composables/useMentor'
import type { MentorArticle, MentorComment, MentorProfile, Consultation, ArticleCategory } from '../../composables/useMentor'
import MentorCard from '../../components/mentor/MentorCard.vue'
import ArticleCard from '../../components/mentor/ArticleCard.vue'
import ArticleDetail from '../../components/mentor/ArticleDetail.vue'
import ConsultSheet from '../../components/mentor/ConsultSheet.vue'
import MentorApply from '../../components/mentor/MentorApply.vue'

const {
  articles, loading, totalCount, myProfile, consultations,
  fetchMyProfile, fetchTopMentors: fetchTop, fetchArticles,
  fetchArticleDetail, fetchRecommendedArticles,
  likeArticle, toggleBookmark, fetchComments, addComment,
  shareArticleToWall, createGoalFromArticle,
  fetchMyConsultations, acceptConsultation, completeConsultation, reviewConsultation,
  getCategoryConfig, getCertLevelConfig, formatTimeAgo,
} = useMentor()

// 状态
const activeTab = ref<'recommend' | 'library' | 'consult' | 'space'>('recommend')
const showApply = ref(false)
const showConsult = ref(false)
const showWrite = ref(false)

// 推荐
const recommendedArticles = ref<MentorArticle[]>([])
const topMentorsList = ref<MentorProfile[]>([])
const selectedTag = ref('')

// 经验库
const searchQuery = ref('')
const filterCategory = ref<ArticleCategory | ''>('')
const sortBy = ref<'latest' | 'popular' | 'featured'>('latest')
const currentPage = ref(1)

// 我的文章
const myArticles = ref<MentorArticle[]>([])

// 文章详情
const detailArticle = ref<MentorArticle | null>(null)
const detailComments = ref<MentorComment[]>([])

// 写文章
const writeForm = ref({
  title: '',
  content: '',
  category: 'academic' as ArticleCategory,
  tags: [] as string[],
})
const writeCoverFile = ref<File | null>(null)
const publishing = ref(false)

// 咨询评价
const reviewingConsult = ref<Consultation | null>(null)
const reviewRating = ref(5)
const reviewText = ref('')

// Toast
const toastMsg = ref('')
function showToast(msg: string, duration = 2500) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, duration)
}

// 当前用户ID（简化获取）
let currentUserId = ''

const tabs = [
  { key: 'recommend' as const, label: '推荐', icon: '📚' },
  { key: 'library' as const, label: '经验库', icon: '📝' },
  { key: 'consult' as const, label: '我的咨询', icon: '💬' },
  { key: 'space' as const, label: '学长空间', icon: '👤' },
]

const sortOptions = [
  { value: 'latest' as const, label: '最新' },
  { value: 'popular' as const, label: '最热' },
  { value: 'featured' as const, label: '精选' },
]

const statusLabels: Record<string, string> = {
  pending: '🔄 待匹配',
  matched: '🎯 已匹配',
  accepted: '✅ 已接单',
  in_progress: '💬 进行中',
  completed: '✔ 已完成',
  reviewed: '⭐ 已评价',
  cancelled: '❌ 已取消',
}

function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'library') loadArticles()
  if (key === 'consult') fetchMyConsultations()
  if (key === 'space') {
    fetchMyProfile()
    loadMyArticles()
  }
}

// ===== 推荐页 =====
async function loadRecommend() {
  recommendedArticles.value = await fetchRecommendedArticles(12)
  topMentorsList.value = await fetchTop(6)
}

function handleTagClick(tag: string) {
  if (selectedTag.value === tag) {
    selectedTag.value = ''
    loadRecommend()
  } else {
    selectedTag.value = tag
    filterCategory.value = ''
    sortBy.value = 'latest'
    activeTab.value = 'library'
    loadArticles()
  }
}

function handleMentorClick(_mentor: MentorProfile) {
  // 未来可跳转到学长主页
}

// ===== 经验库 =====
async function loadArticles() {
  currentPage.value = 1
  await fetchArticles({
    category: filterCategory.value || undefined,
    tag: selectedTag.value || undefined,
    search: searchQuery.value || undefined,
    sort: sortBy.value,
    page: 1,
  })
}

async function loadMore() {
  currentPage.value++
  await fetchArticles({
    category: filterCategory.value || undefined,
    tag: selectedTag.value || undefined,
    search: searchQuery.value || undefined,
    sort: sortBy.value,
    page: currentPage.value,
  })
}

function handleSearch() {
  loadArticles()
}

watch([filterCategory, sortBy], () => {
  loadArticles()
})

// ===== 文章详情 =====
async function openArticle(article: MentorArticle) {
  detailArticle.value = await fetchArticleDetail(article.id)
  if (detailArticle.value) {
    detailComments.value = await fetchComments(article.id)
  }
}

async function handleLike() {
  if (!detailArticle.value) return
  await likeArticle(detailArticle.value.id)
  showToast('❤️ 已点赞')
}

async function handleBookmark() {
  if (!detailArticle.value) return
  await toggleBookmark(detailArticle.value.id)
  showToast(detailArticle.value.is_bookmarked ? '⭐ 已收藏' : '已取消收藏')
}

async function handleShareWall() {
  if (!detailArticle.value) return
  if (!confirm('确认将此文章转发到校园墙？')) return
  const ok = await shareArticleToWall(detailArticle.value)
  showToast(ok ? '🚀 已转发到校园墙' : '转发失败')
}

async function handleCreateGoal() {
  if (!detailArticle.value) return
  if (!confirm('根据此文章创建学习目标？将自动生成任务计划。')) return
  const ok = await createGoalFromArticle(detailArticle.value)
  showToast(ok ? '🎯 已创建学习目标，可在星火规划中查看' : '创建失败')
}

async function handleAddComment(content: string) {
  if (!detailArticle.value) return
  await addComment(detailArticle.value.id, content)
  detailComments.value = await fetchComments(detailArticle.value.id)
  showToast('💬 评论成功')
}

// ===== 写文章 =====
function toggleWriteTag(tag: string) {
  const idx = writeForm.value.tags.indexOf(tag)
  if (idx >= 0) writeForm.value.tags.splice(idx, 1)
  else if (writeForm.value.tags.length < 5) writeForm.value.tags.push(tag)
}

function handleCoverSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) writeCoverFile.value = input.files[0]
}

async function handlePublish() {
  if (publishing.value) return
  publishing.value = true
  const { createArticle } = useMentor()
  const id = await createArticle({
    title: writeForm.value.title.trim(),
    content: writeForm.value.content.trim(),
    category: writeForm.value.category,
    tags: writeForm.value.tags,
    coverFile: writeCoverFile.value || undefined,
    status: 'published',
  })
  publishing.value = false
  if (id) {
    showToast('🎉 文章发布成功！积分+5')
    showWrite.value = false
    writeForm.value = { title: '', content: '', category: 'academic', tags: [] }
    writeCoverFile.value = null
    loadRecommend()
  } else {
    showToast('发布失败，请重试')
  }
}

// ===== 我的文章 =====
async function loadMyArticles() {
  const { supabase: sb } = await import('../../supabase')
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  const { data } = await sb
    .from('mentor_articles')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
  myArticles.value = (data || []) as MentorArticle[]
}

// ===== 咨询操作 =====
function isMentor(c: Consultation): boolean { return c.mentor_id === currentUserId }
function isStudent(c: Consultation): boolean { return c.student_id === currentUserId }

async function handleAccept(id: string) {
  const ok = await acceptConsultation(id)
  if (ok) { showToast('✅ 已接单'); fetchMyConsultations() }
}

async function handleComplete(id: string) {
  const ok = await completeConsultation(id)
  if (ok) { showToast('✔ 咨询已完成，日程已同步'); fetchMyConsultations() }
}

function openReview(c: Consultation) {
  reviewingConsult.value = c
  reviewRating.value = 5
  reviewText.value = ''
}

async function submitReview() {
  if (!reviewingConsult.value) return
  const ok = await reviewConsultation(reviewingConsult.value.id, reviewRating.value, reviewText.value.trim())
  if (ok) {
    showToast('⭐ 评价已提交')
    reviewingConsult.value = null
    fetchMyConsultations()
  }
}

// ===== 认证完成 =====
function handleApplied() {
  showApply.value = false
  fetchMyProfile()
  showToast('🎓 认证申请已提交！')
}

function handleConsultSubmitted(_id: string) {
  showConsult.value = false
  showToast('💬 咨询已提交，AI正在匹配学长...')
  fetchMyConsultations()
  activeTab.value = 'consult'
}

// ===== 初始化 =====
onMounted(async () => {
  const { supabase } = await import('../../supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (user) currentUserId = user.id
  await fetchMyProfile()
  loadRecommend()
})
</script>

<style scoped>
.mentors-page{min-height:100vh;padding:0 16px 80px;max-width:640px;margin:0 auto;position:relative}

.mt-topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 0 10px}
.mt-greeting{flex:1}
.mt-title{font-size:20px;font-weight:700;color:rgba(255,255,255,.88);margin:0;letter-spacing:1px}
.mt-subtitle{font-size:11px;color:rgba(255,255,255,.25);margin:2px 0 0}
.mt-top-actions{display:flex;gap:6px}
.mt-apply-btn,.mt-write-btn{padding:6px 12px;border-radius:16px;border:1px solid rgba(139,92,246,.15);background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.mt-apply-btn:hover,.mt-write-btn:hover{background:rgba(139,92,246,.15);color:rgba(139,92,246,.9)}
.mt-write-btn{border-color:rgba(34,197,94,.15);background:rgba(34,197,94,.08);color:rgba(34,197,94,.7)}

/* Tab */
.mt-tabs{display:flex;gap:0;padding:3px;background:rgba(255,255,255,.025);border-radius:12px;border:1px solid rgba(255,255,255,.04);margin-bottom:14px}
.mt-tab{flex:1;padding:8px 0;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.3);font-size:12px;font-weight:500;cursor:pointer;transition:all .25s}
.mt-tab.active{background:rgba(139,92,246,.12);color:rgba(139,92,246,.85);font-weight:600}

/* 热门标签 */
.mt-tags-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:12px}
.mt-tag-chip{flex-shrink:0;padding:5px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s;white-space:nowrap}
.mt-tag-chip.active{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}

/* 区块 */
.mt-section{margin-bottom:20px}
.mt-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.6);margin:0 0 10px}

/* 学长滚动 */
.mt-mentors-scroll{display:flex;flex-direction:column;gap:6px}

/* 文章网格 */
.mt-articles-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:500px){.mt-articles-grid{grid-template-columns:1fr}}

.mt-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:30px}

/* 筛选 */
.mt-filter-bar{margin-bottom:10px}
.mt-search{width:100%;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.mt-search:focus{border-color:rgba(139,92,246,.2)}
.mt-search::placeholder{color:rgba(255,255,255,.2)}

.mt-cat-tabs{display:flex;gap:4px;margin-bottom:8px;overflow-x:auto}
.mt-cat-tab{flex-shrink:0;padding:5px 10px;border-radius:8px;border:none;background:rgba(255,255,255,.03);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.mt-cat-tab.active{background:rgba(139,92,246,.12);color:rgba(139,92,246,.8)}

.mt-sort-row{display:flex;gap:6px;align-items:center;margin-bottom:12px}
.mt-sort-btn{padding:3px 10px;border-radius:6px;border:none;background:transparent;color:rgba(255,255,255,.25);font-size:11px;cursor:pointer}
.mt-sort-btn.active{color:rgba(139,92,246,.7);font-weight:600}
.mt-total{margin-left:auto;font-size:10px;color:rgba(255,255,255,.15)}
.mt-load-more{display:block;width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:12px}

/* 咨询 */
.mt-consult-create{width:100%;padding:14px;border-radius:14px;border:2px dashed rgba(139,92,246,.12);background:rgba(139,92,246,.03);color:rgba(139,92,246,.6);font-size:14px;font-weight:600;cursor:pointer;margin-bottom:14px;transition:all .2s}
.mt-consult-create:hover{border-color:rgba(139,92,246,.25);background:rgba(139,92,246,.06)}

.mt-empty-card{text-align:center;padding:40px 20px;background:rgba(255,255,255,.02);border-radius:16px;border:1px solid rgba(255,255,255,.04)}
.mt-empty-card p{color:rgba(255,255,255,.3);font-size:14px;margin:4px 0}
.mt-hint{font-size:12px!important;color:rgba(255,255,255,.15)!important}
.mt-become-btn{margin-top:12px;padding:8px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font-size:13px;cursor:pointer}

.mt-consult-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:8px}
.mt-consult-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.mt-consult-cat{font-size:10px;color:rgba(139,92,246,.6)}
.mt-consult-status{font-size:10px;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.4)}
.mt-consult-status.matched,.mt-consult-status.accepted{color:rgba(34,197,94,.6);background:rgba(34,197,94,.06)}
.mt-consult-status.completed,.mt-consult-status.reviewed{color:rgba(59,130,246,.6);background:rgba(59,130,246,.06)}
.mt-consult-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);margin:0 0 4px}
.mt-consult-desc{font-size:12px;color:rgba(255,255,255,.3);margin:0 0 8px;line-height:1.4}
.mt-consult-mentor{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.mt-consult-mentor-name{font-size:12px;color:rgba(139,92,246,.6);font-weight:500}
.mt-consult-score{font-size:10px;color:rgba(245,158,11,.5);background:rgba(245,158,11,.06);padding:2px 6px;border-radius:4px}
.mt-consult-reason{font-size:11px;color:rgba(255,255,255,.2);margin-bottom:8px;font-style:italic}
.mt-consult-acts{display:flex;gap:6px;margin-bottom:4px}
.mt-consult-act{padding:5px 12px;border-radius:8px;border:none;font-size:11px;cursor:pointer;font-weight:600}
.mt-consult-act.accept{background:rgba(34,197,94,.1);color:rgba(34,197,94,.7)}
.mt-consult-act.complete{background:rgba(59,130,246,.1);color:rgba(59,130,246,.7)}
.mt-consult-act.review{background:rgba(245,158,11,.1);color:rgba(245,158,11,.7)}
.mt-consult-review{font-size:11px;color:rgba(255,255,255,.3);margin-top:4px}
.mt-consult-time{font-size:10px;color:rgba(255,255,255,.15);text-align:right;margin-top:4px}

/* 学长空间 */
.mt-myprofile{padding:16px;border-radius:16px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.08);margin-bottom:16px}
.mt-mp-header{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.mt-mp-avatar{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:700;flex-shrink:0}
.mt-mp-info{flex:1}
.mt-mp-name{font-size:16px;font-weight:700;color:rgba(255,255,255,.8);margin:0}
.mt-mp-cert{font-size:11px;font-weight:500;margin-left:6px}
.mt-mp-meta{font-size:11px;color:rgba(255,255,255,.3);margin:2px 0 0}
.mt-mp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.mt-mp-stat{text-align:center;padding:8px;border-radius:10px;background:rgba(255,255,255,.03)}
.mt-mp-stat-num{display:block;font-size:18px;font-weight:700;color:rgba(139,92,246,.7)}
.mt-mp-stat-label{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}
.mt-mp-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.mt-mp-tag{font-size:10px;padding:2px 7px;border-radius:4px;background:rgba(139,92,246,.08);color:rgba(139,92,246,.5)}
.mt-edit-btn{width:100%;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:rgba(255,255,255,.35);font-size:12px;cursor:pointer}

/* 写文章弹窗 */
.mt-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.mt-modal{width:100%;max-width:460px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:24px}
.mt-modal h3{font-size:16px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 14px;text-align:center}
.write-modal{max-width:540px}
.mt-write-cats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
.mt-wcat{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s}
.mt-wcat.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}
.mt-winput{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:8px;font-family:inherit}
.mt-winput:focus{border-color:rgba(139,92,246,.2)}
.mt-winput::placeholder{color:rgba(255,255,255,.2)}
.mt-wtextarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:8px;font-family:inherit;resize:none;line-height:1.6}
.mt-wtextarea:focus{border-color:rgba(139,92,246,.2)}
.mt-wtextarea::placeholder{color:rgba(255,255,255,.2)}
.mt-write-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.mt-wtag{padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer}
.mt-wtag.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.15);color:rgba(139,92,246,.7)}
.mt-cover-upload{display:flex;align-items:center;justify-content:center;padding:14px;border-radius:12px;border:2px dashed rgba(139,92,246,.1);background:rgba(139,92,246,.03);cursor:pointer;margin-bottom:12px;font-size:12px;color:rgba(255,255,255,.3)}

.mt-modal-actions{display:flex;gap:8px}
.mt-modal-cancel,.mt-modal-confirm{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.mt-modal-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.mt-modal-confirm{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.mt-modal-confirm:disabled{opacity:.3;cursor:default}
.mt-rating{display:flex;gap:4px;justify-content:center;margin-bottom:12px}
.mt-star{background:none;border:none;font-size:22px;cursor:pointer;opacity:.3;transition:opacity .2s}
.mt-star.active{opacity:1}
.mt-rtextarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;resize:none;font-family:inherit;margin-bottom:10px}

.mt-loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);z-index:50;backdrop-filter:blur(2px)}
.mt-spinner{width:28px;height:28px;border:2.5px solid rgba(139,92,246,.1);border-top-color:rgba(139,92,246,.6);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
.mt-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(139,92,246,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:300;box-shadow:0 4px 20px rgba(139,92,246,.3)}
</style>
