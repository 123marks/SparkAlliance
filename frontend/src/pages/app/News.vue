<template>
  <!-- 星火资讯 — 打破信息茧房 -->
  <div class="nw-page">
    <div class="nw-header">
      <h1 class="nw-title">📰 星火资讯</h1>
      <p class="nw-subtitle">打破信息茧房，不脱离社会脉搏</p>
    </div>

    <!-- Tab -->
    <div class="nw-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="nw-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        <span class="nw-tab-icon">{{ tab.icon }}</span>
        <span class="nw-tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ===== 推荐 Tab ===== -->
    <div v-if="activeTab === 'feed'" class="nw-content">
      <!-- 搜索栏 -->
      <div class="nw-search-bar">
        <input v-model="searchKeyword" class="nw-search-input"
          placeholder="搜索资讯：关键词、话题、平台..." @keydown.enter="doSearch" />
        <button class="nw-search-btn" @click="doSearch">🔍</button>
      </div>

      <!-- 分类快选 -->
      <div class="nw-cat-row">
        <button class="nw-cat-chip" :class="{ active: !filterCategory }"
          @click="filterCategory = ''; doSearch()">🔥 全部</button>
        <button v-for="(cfg, key) in SOURCE_CATEGORIES" :key="key" class="nw-cat-chip"
          :class="{ active: filterCategory === key }"
          @click="filterCategory = filterCategory === key ? '' : key; doSearch()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
      </div>

      <!-- 地域切换 -->
      <div class="nw-region-row">
        <button class="nw-region-chip" :class="{ active: !filterRegion }"
          @click="filterRegion = ''; doSearch()">🌏 全球</button>
        <button v-for="(cfg, key) in REGION_MAP" :key="key" class="nw-region-chip"
          :class="{ active: filterRegion === key }"
          @click="filterRegion = filterRegion === key ? '' : key; doSearch()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
        <div class="nw-sort-toggle">
          <button :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'; doSearch()">🕐 最新</button>
          <button :class="{ active: sortBy === 'hot' }" @click="sortBy = 'hot'; doSearch()">🔥 最热</button>
        </div>
      </div>

      <!-- 文章列表 -->
      <div v-if="loading && articles.length === 0" class="nw-loading"><div class="nw-spinner"></div></div>
      <div v-else-if="articles.length === 0" class="nw-empty">暂无资讯</div>
      <div v-else class="nw-article-list">
        <div v-for="art in articles" :key="art.id" class="nw-article-card" :class="{ read: art.is_read }"
          @click="openArticle(art)">
          <!-- 顶部：源+时间 -->
          <div class="nw-ac-source">
            <span class="nw-ac-icon" :style="{ background: (art.source_color || '#4f8ef7') + '12' }">
              {{ art.source_icon || '📰' }}
            </span>
            <span class="nw-ac-source-name">{{ art.source_name || '未知源' }}</span>
            <span class="nw-ac-time">{{ formatTimeAgo(art.published_at || art.fetched_at) }}</span>
          </div>
          <!-- 内容 -->
          <div class="nw-ac-body">
            <div class="nw-ac-text">
              <h3 class="nw-ac-title">{{ art.title }}</h3>
              <p v-if="art.ai_summary" class="nw-ac-summary ai">✨ {{ art.ai_summary }}</p>
              <p v-else-if="art.summary" class="nw-ac-summary">{{ art.summary }}</p>
            </div>
            <img v-if="art.cover_image" :src="art.cover_image" class="nw-ac-cover" alt="" />
          </div>
          <!-- AI标签 -->
          <div v-if="art.ai_tags?.length" class="nw-ac-tags">
            <span v-for="tag in art.ai_tags.slice(0, 3)" :key="tag" class="nw-tag">{{ tag }}</span>
          </div>
          <!-- 底部 -->
          <div class="nw-ac-footer">
            <div class="nw-ac-stats">
              <span v-if="art.hot_score > 0">🔥 {{ art.hot_score }}</span>
              <span v-if="art.external_metrics?.comments">💬 {{ art.external_metrics.comments }}</span>
            </div>
            <div class="nw-ac-actions">
              <button class="nw-icon-btn" :class="{ on: art.is_liked }"
                @click.stop="handleLike(art.id)">{{ art.is_liked ? '❤️' : '🤍' }}</button>
              <button class="nw-icon-btn" :class="{ on: art.is_bookmarked }"
                @click.stop="handleBookmark(art.id)">{{ art.is_bookmarked ? '🔖' : '📑' }}</button>
              <button class="nw-icon-btn" @click.stop="shareArticle(art)">📤</button>
            </div>
          </div>
        </div>
        <!-- 加载更多 -->
        <button v-if="hasMore && !loading" class="nw-load-more" @click="loadMore">加载更多</button>
        <div v-if="loading && articles.length > 0" class="nw-loading mini"><div class="nw-spinner"></div></div>
      </div>
    </div>

    <!-- ===== 信息源 Tab ===== -->
    <div v-else-if="activeTab === 'sources'" class="nw-content">
      <h3 class="nw-section-title">🇨🇳 国内信息源 · {{ cnSources.length }}个</h3>
      <div class="nw-source-grid">
        <div v-for="src in cnSources" :key="src.id" class="nw-source-card"
          :class="{ subscribed: src.is_subscribed }" @click="handleToggleSub(src.id)">
          <span class="nw-src-icon" :style="{ background: src.color + '15' }">{{ src.icon }}</span>
          <span class="nw-src-name">{{ src.name }}</span>
          <span class="nw-src-sub">{{ src.is_subscribed ? '✅' : '➕' }}</span>
        </div>
      </div>

      <h3 class="nw-section-title" style="margin-top:20px">🌍 国际信息源 · {{ intlSources.length }}个</h3>
      <div class="nw-source-grid">
        <div v-for="src in intlSources" :key="src.id" class="nw-source-card"
          :class="{ subscribed: src.is_subscribed }" @click="handleToggleSub(src.id)">
          <span class="nw-src-icon" :style="{ background: src.color + '15' }">{{ src.icon }}</span>
          <span class="nw-src-name">{{ src.name }}</span>
          <span class="nw-src-sub">{{ src.is_subscribed ? '✅' : '➕' }}</span>
        </div>
      </div>

      <div class="nw-sub-count">已订阅 {{ subscribedCount }} 个信息源</div>
    </div>

    <!-- ===== 订阅 Tab ===== -->
    <div v-else-if="activeTab === 'mine'" class="nw-content">
      <!-- 关键词订阅 -->
      <div class="nw-kw-section">
        <h3 class="nw-section-title">🔑 关键词订阅</h3>
        <div class="nw-kw-input-row">
          <input v-model="newKeyword" class="nw-kw-input" placeholder="添加关键词（如：AI、量子计算）"
            @keydown.enter="handleAddKeyword" />
          <button class="nw-kw-add-btn" @click="handleAddKeyword">➕</button>
        </div>
        <div v-if="keywordSubscriptions.length" class="nw-kw-list">
          <span v-for="kw in keywordSubscriptions" :key="kw" class="nw-kw-tag">
            {{ kw }} <button @click="handleRemoveKeyword(kw)">✕</button>
          </span>
        </div>
        <div v-else class="nw-empty mini">添加关键词，获取订阅推送</div>
      </div>

      <!-- 收藏文章 -->
      <h3 class="nw-section-title" style="margin-top:20px">🔖 我的收藏 · {{ bookmarkedArticles.length }}篇</h3>
      <div v-if="bookmarkedArticles.length === 0" class="nw-empty mini">暂无收藏</div>
      <div v-for="art in bookmarkedArticles" :key="art.id" class="nw-bm-card" @click="openArticle(art)">
        <div class="nw-bm-top">
          <span class="nw-bm-icon">{{ art.source_icon || '📰' }}</span>
          <span class="nw-bm-title">{{ art.title }}</span>
        </div>
        <span class="nw-bm-time">{{ formatTimeAgo(art.published_at || art.fetched_at) }}</span>
      </div>
    </div>

    <!-- ===== 探索 Tab ===== -->
    <div v-else-if="activeTab === 'explore'" class="nw-content">
      <!-- 🚀 抓取控制面板（核心功能：用户点击即触发） -->
      <div class="nw-crawl-panel">
        <div class="nw-crawl-header">
          <div>
            <h3 class="nw-crawl-title">🕷️ 资讯抓取引擎</h3>
            <p class="nw-crawl-desc">从 {{ supportedPlatforms.length }} 个平台获取最新内容</p>
          </div>
          <button class="nw-crawl-btn" :class="{ crawling: isCrawling }" :disabled="isCrawling"
            @click="handleCrawl(false)">
            {{ isCrawling ? '⏳ 抓取中...' : '🚀 获取最新' }}
          </button>
        </div>
        <button v-if="!isCrawling" class="nw-crawl-force" @click="handleCrawl(true)">
          🔄 强制刷新（忽略增量缓存）
        </button>
        <!-- 进度 -->
        <div v-if="crawlProgressMsg" class="nw-crawl-progress">{{ crawlProgressMsg }}</div>
        <!-- 结果 -->
        <div v-if="crawlResultList.length" class="nw-crawl-results">
          <div v-for="r in crawlResultList" :key="r.platform" class="nw-cr-item">
            <span class="nw-cr-name">{{ r.platform }}</span>
            <span v-if="r.inserted > 0" class="nw-cr-new">+{{ r.inserted }} 新</span>
            <span v-else-if="r.fetched > 0" class="nw-cr-skip">已是最新</span>
            <span v-else class="nw-cr-skip">跳过</span>
          </div>
        </div>
      </div>

      <!-- 今日简报 -->
      <div class="nw-briefing-card" style="margin-top:12px">
        <h3>📋 今日简报</h3>
        <div v-if="todayBriefing" class="nw-briefing-content">{{ todayBriefing.content }}</div>
        <div v-else class="nw-briefing-empty">
          <span>📝</span>
          <p>AI正在整理今日简报...</p>
          <p class="nw-hint">基于你的订阅和阅读偏好自动生成</p>
        </div>
      </div>

      <!-- 热门话题 -->
      <h3 class="nw-section-title" style="margin-top:16px">💡 防茧房推荐</h3>
      <div class="nw-anti-bubble">
        <div class="nw-ab-card">
          <span class="nw-ab-icon">🧠</span>
          <div class="nw-ab-text">
            <h4>拓宽视野</h4>
            <p>星火资讯会主动推送你平时少接触的领域内容</p>
          </div>
        </div>
        <div class="nw-ab-card">
          <span class="nw-ab-icon">🔄</span>
          <div class="nw-ab-text">
            <h4>多角度解读</h4>
            <p>AI 提供同一事件的不同观点分析</p>
          </div>
        </div>
        <div class="nw-ab-card">
          <span class="nw-ab-icon">🌍</span>
          <div class="nw-ab-text">
            <h4>全球视角</h4>
            <p>聚合国内外 20+ 信息源，中英双语覆盖</p>
          </div>
        </div>
      </div>

      <!-- 平台覆盖 -->
      <h3 class="nw-section-title" style="margin-top:16px">📡 覆盖平台</h3>
      <div class="nw-platform-list">
        <div v-for="src in sources.slice(0, 12)" :key="src.id" class="nw-platform-chip"
          :style="{ '--pc': src.color }">
          <span>{{ src.icon }}</span> {{ src.name }}
        </div>
        <div class="nw-platform-chip more">+{{ Math.max(0, sources.length - 12) }} 更多</div>
      </div>
    </div>

    <!-- ===== 文章详情弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showDetail && selectedArticle" class="nw-modal-overlay" @click.self="showDetail = false">
        <div class="nw-modal detail-modal">
          <!-- 头部 -->
          <div class="nw-detail-header">
            <div class="nw-dh-source">
              <span class="nw-dh-icon" :style="{ background: (selectedArticle.source_color || '#4f8ef7') + '15' }">
                {{ selectedArticle.source_icon || '📰' }}
              </span>
              <span>{{ selectedArticle.source_name }}</span>
              <span class="nw-dh-time">{{ formatTimeAgo(selectedArticle.published_at || selectedArticle.fetched_at) }}</span>
            </div>
            <button class="nw-modal-close" @click="showDetail = false">✕</button>
          </div>

          <h2 class="nw-detail-title">{{ selectedArticle.title }}</h2>

          <!-- AI摘要 -->
          <div v-if="selectedArticle.ai_summary" class="nw-ai-box">
            <span class="nw-ai-label">✨ AI摘要</span>
            <p>{{ selectedArticle.ai_summary }}</p>
          </div>

          <!-- AI多角度 -->
          <div v-if="selectedArticle.ai_perspectives" class="nw-ai-box perspectives">
            <span class="nw-ai-label">🔄 多角度解读</span>
            <p>{{ selectedArticle.ai_perspectives }}</p>
          </div>

          <!-- 正文 -->
          <div v-if="selectedArticle.content" class="nw-detail-content">{{ selectedArticle.content }}</div>
          <div v-else-if="selectedArticle.summary" class="nw-detail-content">{{ selectedArticle.summary }}</div>

          <!-- 标签 -->
          <div v-if="selectedArticle.ai_tags?.length" class="nw-detail-tags">
            <span v-for="tag in selectedArticle.ai_tags" :key="tag" class="nw-tag">{{ tag }}</span>
          </div>

          <!-- 操作 -->
          <div class="nw-detail-actions">
            <button class="nw-btn" :class="{ on: selectedArticle.is_liked }" @click="handleLike(selectedArticle.id)">
              {{ selectedArticle.is_liked ? '❤️ 已赞' : '🤍 点赞' }}
            </button>
            <button class="nw-btn" :class="{ on: selectedArticle.is_bookmarked }" @click="handleBookmark(selectedArticle.id)">
              {{ selectedArticle.is_bookmarked ? '🔖 已收藏' : '📑 收藏' }}
            </button>
            <a :href="selectedArticle.original_url" target="_blank" class="nw-btn primary">🔗 查看原文</a>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toastMsg" class="nw-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useNews,
  SOURCE_CATEGORIES,
  REGION_MAP,
  type NewsArticle,
  type SourceCategory,
  type SourceRegion,
} from '../../composables/useNews'
import { useCrawler } from '../../composables/useCrawler'

const {
  sources,
  articles,
  bookmarkedArticles,
  keywordSubscriptions,
  todayBriefing,
  loading,
  hasMore,
  cnSources,
  intlSources,
  subscribedCount,
  fetchSources,
  toggleSubscription,
  searchArticles,
  markAsRead,
  toggleBookmark,
  toggleLike,
  fetchBookmarks,
  fetchKeywordSubscriptions,
  addKeyword,
  removeKeyword,
  fetchTodayBriefing,
  formatTimeAgo,
} = useNews()

// ====== 爬取引擎 ======
const {
  crawling: isCrawling,
  crawlProgress: crawlProgressMsg,
  crawlResults: crawlResultList,
  runCrawl,
  supportedPlatforms,
} = useCrawler()

// ====== Tab ======
type TabKey = 'feed' | 'sources' | 'mine' | 'explore'
const activeTab = ref<TabKey>('feed')
const tabs = [
  { key: 'feed' as TabKey, icon: '🔥', label: '推荐' },
  { key: 'sources' as TabKey, icon: '📡', label: '信息源' },
  { key: 'mine' as TabKey, icon: '🔖', label: '订阅' },
  { key: 'explore' as TabKey, icon: '💡', label: '探索' },
]

// ====== 搜索 ======
const searchKeyword = ref('')
const filterCategory = ref<SourceCategory | ''>('')
const filterRegion = ref<SourceRegion | ''>('')
const sortBy = ref<'latest' | 'hot'>('latest')
const currentPage = ref(1)

// ====== 弹窗 ======
const showDetail = ref(false)
const selectedArticle = ref<NewsArticle | null>(null)
const toastMsg = ref('')
const newKeyword = ref('')

// ====== Tab切换 ======
function switchTab(key: TabKey) {
  activeTab.value = key
  if (key === 'feed') doSearch()
  if (key === 'mine') { fetchBookmarks(); fetchKeywordSubscriptions() }
  if (key === 'explore') fetchTodayBriefing()
}

// ====== 搜索 ======
async function doSearch() {
  currentPage.value = 1
  await searchArticles({
    keyword: searchKeyword.value || undefined,
    category: filterCategory.value || undefined,
    region: filterRegion.value || undefined,
    sortBy: sortBy.value,
    page: 1,
  })
}

async function loadMore() {
  currentPage.value++
  await searchArticles({
    keyword: searchKeyword.value || undefined,
    category: filterCategory.value || undefined,
    region: filterRegion.value || undefined,
    sortBy: sortBy.value,
    page: currentPage.value,
  })
}

// ====== 文章详情 ======
function openArticle(art: NewsArticle) {
  selectedArticle.value = art
  showDetail.value = true
  markAsRead(art.id)
}

function shareArticle(art: NewsArticle) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(art.original_url)
    showToast('链接已复制 📋')
  }
}

// ====== 互动 ======
async function handleLike(articleId: string) {
  const r = await toggleLike(articleId)
  showToast(r ? '已点赞 ❤️' : '取消点赞')
}

async function handleBookmark(articleId: string) {
  const r = await toggleBookmark(articleId)
  showToast(r ? '已收藏 🔖' : '取消收藏')
}

// ====== 订阅 ======
async function handleToggleSub(sourceId: string) {
  const r = await toggleSubscription(sourceId)
  showToast(r ? '已订阅 ✅' : '取消订阅')
}

async function handleAddKeyword() {
  const kw = newKeyword.value.trim()
  if (!kw) return
  const ok = await addKeyword(kw)
  if (ok) { newKeyword.value = ''; showToast('关键词已添加 🔑') }
  else showToast('添加失败（可能已存在）')
}

async function handleRemoveKeyword(kw: string) {
  await removeKeyword(kw)
  showToast('关键词已移除')
}

// ====== 爬取 ======
async function handleCrawl(force: boolean) {
  await runCrawl(force)
  // 抓完后刷新文章列表
  await doSearch()
  showToast('📡 资讯已更新')
}

// ====== 工具 ======
function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

// ====== 生命周期 ======
onMounted(async () => {
  await fetchSources()
  await doSearch()
})
</script>

<style scoped>
/* 页面 */
.nw-page{max-width:600px;margin:0 auto;padding:20px 16px 80px;min-height:100vh}
.nw-header{text-align:center;margin-bottom:16px}
.nw-title{font-size:22px;font-weight:800;color:white;margin:0}
.nw-subtitle{font-size:12px;color:rgba(255,255,255,.3);margin:4px 0 0}

/* Tab */
.nw-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.02);border-radius:14px;border:1px solid rgba(255,255,255,.05);margin-bottom:16px}
.nw-tab{flex:1;padding:10px 4px;border-radius:10px;border:none;background:none;cursor:pointer;text-align:center;transition:all .2s}
.nw-tab.active{background:rgba(79,142,247,.1);box-shadow:0 2px 8px rgba(79,142,247,.15)}
.nw-tab-icon{display:block;font-size:16px;margin-bottom:2px}
.nw-tab-label{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:500}
.nw-tab.active .nw-tab-label{color:rgba(79,142,247,.8)}

/* 通用 */
.nw-content{animation:nwFadeIn .2s ease}
@keyframes nwFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.nw-empty{text-align:center;padding:40px 0;font-size:13px;color:rgba(255,255,255,.2)}
.nw-empty.mini{padding:16px 0;font-size:12px}
.nw-loading{text-align:center;padding:40px 0}
.nw-loading.mini{padding:16px 0}
.nw-spinner{width:28px;height:28px;border:2px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.nw-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}

/* 搜索 */
.nw-search-bar{display:flex;gap:6px;margin-bottom:10px}
.nw-search-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.nw-search-input::placeholder{color:rgba(255,255,255,.15)}
.nw-search-btn{padding:12px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white;font-size:14px;cursor:pointer}

/* 筛选 */
.nw-cat-row,.nw-region-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
.nw-cat-chip,.nw-region-chip{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.nw-cat-chip.active,.nw-region-chip.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}
.nw-sort-toggle{margin-left:auto;display:flex;gap:2px}
.nw-sort-toggle button{padding:4px 8px;border-radius:6px;border:none;background:none;color:rgba(255,255,255,.2);font-size:10px;cursor:pointer}
.nw-sort-toggle button.active{background:rgba(79,142,247,.06);color:rgba(79,142,247,.6)}

/* 文章卡片 */
.nw-article-list{display:flex;flex-direction:column;gap:8px}
.nw-article-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.nw-article-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:translateY(-1px)}
.nw-article-card.read{opacity:.6}
.nw-ac-source{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.nw-ac-icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.nw-ac-source-name{font-size:11px;font-weight:500;color:rgba(255,255,255,.35)}
.nw-ac-time{font-size:10px;color:rgba(255,255,255,.15);margin-left:auto}
.nw-ac-body{display:flex;gap:10px}
.nw-ac-text{flex:1;min-width:0}
.nw-ac-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);margin:0 0 4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nw-ac-summary{font-size:11px;color:rgba(255,255,255,.25);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0}
.nw-ac-summary.ai{color:rgba(139,92,246,.5)}
.nw-ac-cover{width:70px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0}
.nw-ac-tags{display:flex;gap:4px;margin-top:6px}
.nw-tag{padding:1px 6px;border-radius:4px;background:rgba(79,142,247,.05);color:rgba(79,142,247,.4);font-size:9px}
.nw-ac-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.nw-ac-stats{display:flex;gap:8px;font-size:10px;color:rgba(255,255,255,.2)}
.nw-ac-actions{display:flex;gap:2px}
.nw-icon-btn{background:none;border:none;font-size:14px;cursor:pointer;padding:2px 4px}
.nw-load-more{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:4px}

/* 信息源 */
.nw-source-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.nw-source-card{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.04);cursor:pointer;transition:all .2s}
.nw-source-card.subscribed{border-color:rgba(16,185,129,.15);background:rgba(16,185,129,.03)}
.nw-src-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.nw-src-name{font-size:12px;color:rgba(255,255,255,.5);flex:1}
.nw-src-sub{font-size:12px}
.nw-sub-count{text-align:center;margin-top:12px;font-size:11px;color:rgba(255,255,255,.2)}

/* 关键词 */
.nw-kw-section{margin-bottom:8px}
.nw-kw-input-row{display:flex;gap:6px;margin-bottom:8px}
.nw-kw-input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none}
.nw-kw-input::placeholder{color:rgba(255,255,255,.15)}
.nw-kw-add-btn{padding:10px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white;font-size:13px;cursor:pointer}
.nw-kw-list{display:flex;flex-wrap:wrap;gap:4px}
.nw-kw-tag{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:rgba(79,142,247,.06);color:rgba(79,142,247,.5);font-size:11px}
.nw-kw-tag button{background:none;border:none;color:rgba(255,255,255,.2);font-size:10px;cursor:pointer;padding:0 2px}

/* 收藏 */
.nw-bm-card{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.04);margin-bottom:4px;cursor:pointer;transition:all .2s}
.nw-bm-card:hover{background:rgba(79,142,247,.03)}
.nw-bm-top{display:flex;align-items:center;gap:6px}
.nw-bm-icon{font-size:14px;flex-shrink:0}
.nw-bm-title{font-size:12px;color:rgba(255,255,255,.5);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nw-bm-time{font-size:9px;color:rgba(255,255,255,.15);margin-top:4px;display:block}

/* 探索 */
.nw-briefing-card{padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(79,142,247,.06),rgba(139,92,246,.04));border:1px solid rgba(79,142,247,.1)}
.nw-briefing-card h3{font-size:16px;font-weight:700;color:rgba(255,255,255,.6);margin:0 0 10px}
.nw-briefing-content{font-size:13px;color:rgba(255,255,255,.4);line-height:1.7;white-space:pre-wrap}
.nw-briefing-empty{text-align:center;padding:20px 0}
.nw-briefing-empty span{font-size:32px;display:block;margin-bottom:8px}
.nw-briefing-empty p{font-size:12px;color:rgba(255,255,255,.25);margin:2px 0}
.nw-hint{font-size:10px!important;color:rgba(255,255,255,.12)!important}
.nw-anti-bubble{display:flex;flex-direction:column;gap:8px}
.nw-ab-card{display:flex;gap:12px;padding:14px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)}
.nw-ab-icon{font-size:24px;flex-shrink:0}
.nw-ab-text h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 3px}
.nw-ab-text p{font-size:11px;color:rgba(255,255,255,.25);margin:0;line-height:1.4}
.nw-platform-list{display:flex;flex-wrap:wrap;gap:4px}
.nw-platform-chip{display:flex;align-items:center;gap:3px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);font-size:10px;color:rgba(255,255,255,.3)}
.nw-platform-chip.more{background:rgba(79,142,247,.04);color:rgba(79,142,247,.4)}

/* 弹窗 */
.nw-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px);overflow-y:auto;padding:20px}
.nw-modal{background:rgba(22,18,50,.97);border:1px solid rgba(79,142,247,.12);border-radius:20px;padding:24px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto}
.nw-modal-close{background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px}
.nw-detail-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.nw-dh-source{display:flex;align-items:center;gap:6px}
.nw-dh-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px}
.nw-dh-source span{font-size:12px;color:rgba(255,255,255,.35)}
.nw-dh-time{font-size:10px;color:rgba(255,255,255,.15)}
.nw-detail-title{font-size:18px;font-weight:700;color:white;margin:0 0 12px;line-height:1.4}
.nw-ai-box{padding:12px 14px;border-radius:12px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.1);margin-bottom:12px}
.nw-ai-box.perspectives{background:rgba(6,182,212,.04);border-color:rgba(6,182,212,.1)}
.nw-ai-label{display:block;font-size:10px;font-weight:600;color:rgba(139,92,246,.5);margin-bottom:4px}
.nw-ai-box.perspectives .nw-ai-label{color:rgba(6,182,212,.5)}
.nw-ai-box p{font-size:12px;color:rgba(255,255,255,.4);line-height:1.5;margin:0}
.nw-detail-content{font-size:13px;color:rgba(255,255,255,.35);line-height:1.6;margin-bottom:12px;white-space:pre-wrap}
.nw-detail-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}
.nw-detail-actions{display:flex;gap:6px;flex-wrap:wrap}
.nw-btn{padding:8px 14px;border-radius:8px;border:none;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.03);color:rgba(255,255,255,.3);text-decoration:none;text-align:center}
.nw-btn.on{background:rgba(79,142,247,.06);color:rgba(79,142,247,.6)}
.nw-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}

/* 抓取面板 */
.nw-crawl-panel{padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(16,185,129,.06),rgba(6,182,212,.04));border:1px solid rgba(16,185,129,.12)}
.nw-crawl-header{display:flex;justify-content:space-between;align-items:center;gap:10px}
.nw-crawl-title{font-size:15px;font-weight:700;color:rgba(255,255,255,.6);margin:0}
.nw-crawl-desc{font-size:10px;color:rgba(255,255,255,.2);margin:2px 0 0}
.nw-crawl-btn{padding:10px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#10b981,#06b6d4);color:white;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.nw-crawl-btn:hover{transform:scale(1.02);box-shadow:0 4px 16px rgba(16,185,129,.3)}
.nw-crawl-btn.crawling{opacity:.6;cursor:not-allowed}
.nw-crawl-force{width:100%;margin-top:8px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.2);font-size:10px;cursor:pointer}
.nw-crawl-progress{margin-top:8px;font-size:11px;color:rgba(16,185,129,.6)}
.nw-crawl-results{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px}
.nw-cr-item{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.02);font-size:10px}
.nw-cr-name{color:rgba(255,255,255,.35)}
.nw-cr-new{color:rgba(16,185,129,.7);font-weight:600}
.nw-cr-skip{color:rgba(255,255,255,.15)}

/* Toast */
.nw-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(79,142,247,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:600;box-shadow:0 4px 20px rgba(79,142,247,.3);animation:nwFadeIn .2s ease}
</style>
