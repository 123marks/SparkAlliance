<template>
  <div class="profile-page" v-if="!isLoading">
    <!-- ====== Banner 区 ====== -->
    <div class="profile-banner">
      <div class="banner-bg" :style="bannerStyle"></div>
      <div class="banner-fade"></div>

      <!-- 头像 + 基本信息 -->
      <div class="banner-content">
        <div class="avatar-area">
          <div class="avatar-ring">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" class="avatar-img" alt="头像" />
            <div v-else class="avatar-fallback">{{ avatarInitial }}</div>
          </div>
          <span class="level-pill">{{ profile.level || '萤火虫 Lv.1' }}</span>
        </div>

        <div class="info-area">
          <div class="name-row">
            <h1>{{ profile.nickname || '未设昵称' }}</h1>
            <span v-if="profile.verified" class="verified-tag">✓ 已认证</span>
            <span v-if="profile.student_verified" class="verified-tag student">🎓 学生</span>
          </div>
          <p class="spark-id">{{ profile.spark_id || '' }} · 加入 {{ daysSinceJoined }} 天</p>
          <div class="meta-tags" v-if="profile.college || profile.major">
            <span class="meta-chip" v-if="profile.college">{{ profile.college }}</span>
            <span class="meta-chip" v-if="profile.major">{{ profile.major }}</span>
            <span class="meta-chip" v-if="profile.grade">{{ profile.grade }}</span>
          </div>
          <p class="bio-text">{{ profile.bio || '这个人很懒，什么都没写...' }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="action-area">
          <template v-if="isMyProfile">
            <button class="btn-action primary" @click="goToSettings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              编辑资料
            </button>
            <button class="btn-action ghost" @click="shareProfile" title="分享主页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          </template>
          <template v-else>
            <button
              class="btn-action"
              :class="isFollowing ? 'following' : 'primary'"
              @click="toggleFollow"
            >
              {{ isFollowing ? '✓ 已关注' : '+ 关注' }}
            </button>
            <button class="btn-action ghost" @click="startChat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              私信
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- ====== 数据统计区 ====== -->
    <div class="stats-strip">
      <button class="stat-cell" @click="switchTab('posts')">
        <strong>{{ stats.posts_count }}</strong>
        <span>动态</span>
      </button>
      <button class="stat-cell" @click="switchTab('products')">
        <strong>{{ stats.products_count }}</strong>
        <span>商品</span>
      </button>
      <button class="stat-cell" @click="switchTab('followers')">
        <strong>{{ stats.followers_count }}</strong>
        <span>粉丝</span>
      </button>
      <button class="stat-cell" @click="switchTab('following')">
        <strong>{{ stats.following_count }}</strong>
        <span>关注</span>
      </button>
      <button class="stat-cell">
        <strong>{{ stats.likes_received }}</strong>
        <span>获赞</span>
      </button>
    </div>

    <!-- ====== Tab 导航区 ====== -->
    <nav class="tab-bar">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
      </button>
    </nav>

    <!-- ====== 内容展示区 ====== -->
    <div class="content-area">

      <!-- 动态 Tab -->
      <div v-if="currentTab === 'posts'" class="tab-content">
        <div v-if="postsLoading" class="loading-hint">加载中...</div>
        <div v-else-if="posts.length === 0" class="empty-hint">
          <span class="empty-emoji">📝</span>
          <p>{{ isMyProfile ? '你还没有发布过动态' : 'TA还没有发布过动态' }}</p>
          <router-link v-if="isMyProfile" to="/app/wall" class="empty-cta">去发布 →</router-link>
        </div>
        <div v-else class="posts-list">
          <div v-for="post in posts" :key="post.id" class="post-card" @click="viewPost(post.id)">
            <p class="post-text">{{ post.content }}</p>
            <div v-if="post.media_urls?.length" class="post-media">
              <img v-for="(url, i) in post.media_urls.slice(0, 3)" :key="i" :src="url" class="media-thumb" />
              <span v-if="post.media_urls.length > 3" class="media-more">+{{ post.media_urls.length - 3 }}</span>
            </div>
            <div class="post-bottom">
              <span class="post-stat">❤️ {{ post.likes_count || 0 }}</span>
              <span class="post-stat">💬 {{ post.comments_count || 0 }}</span>
              <span class="post-time">{{ formatTime(post.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品 Tab -->
      <div v-if="currentTab === 'products'" class="tab-content">
        <div v-if="products.length === 0" class="empty-hint">
          <span class="empty-emoji">🛒</span>
          <p>{{ isMyProfile ? '你还没有发布商品' : 'TA还没有发布商品' }}</p>
        </div>
        <div v-else class="products-grid">
          <div v-for="prod in products" :key="prod.id" class="product-card" @click="viewProduct(prod.id)">
            <div class="prod-img-wrap">
              <img v-if="prod.images?.[0]" :src="prod.images[0]" class="prod-img" />
              <div v-else class="prod-img-placeholder">📦</div>
              <span v-if="prod.status === 'sold'" class="sold-tag">已售</span>
            </div>
            <div class="prod-info">
              <h4>{{ prod.title }}</h4>
              <span class="prod-price">¥{{ prod.price }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 收藏 Tab（仅自己可见） -->
      <div v-if="currentTab === 'favorites'" class="tab-content">
        <div class="empty-hint">
          <span class="empty-emoji">⭐</span>
          <p>收藏功能即将上线</p>
        </div>
      </div>

      <!-- 粉丝 Tab -->
      <div v-if="currentTab === 'followers'" class="tab-content">
        <div v-if="followersList.length === 0" class="empty-hint">
          <span class="empty-emoji">👥</span>
          <p>{{ isMyProfile ? '还没有粉丝' : 'TA还没有粉丝' }}</p>
        </div>
        <div v-else class="user-list">
          <div v-for="u in followersList" :key="u.id" class="user-card" @click="viewUser(u.id)">
            <div class="uc-avatar">
              <img v-if="u.avatar_url" :src="u.avatar_url" />
              <span v-else>{{ u.nickname?.charAt(0) || '?' }}</span>
            </div>
            <div class="uc-info">
              <strong>{{ u.nickname }}</strong>
              <span>{{ u.bio || u.college || '暂无简介' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 关注 Tab -->
      <div v-if="currentTab === 'following'" class="tab-content">
        <div v-if="followingList.length === 0" class="empty-hint">
          <span class="empty-emoji">👤</span>
          <p>{{ isMyProfile ? '还没有关注任何人' : 'TA还没有关注任何人' }}</p>
        </div>
        <div v-else class="user-list">
          <div v-for="u in followingList" :key="u.id" class="user-card" @click="viewUser(u.id)">
            <div class="uc-avatar">
              <img v-if="u.avatar_url" :src="u.avatar_url" />
              <span v-else>{{ u.nickname?.charAt(0) || '?' }}</span>
            </div>
            <div class="uc-info">
              <strong>{{ u.nickname }}</strong>
              <span>{{ u.bio || u.college || '暂无简介' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 资料 Tab -->
      <div v-if="currentTab === 'info'" class="tab-content">
        <div class="info-card">
          <h3>基本信息</h3>
          <div class="info-grid">
            <div class="info-row"><span class="info-key">昵称</span><span class="info-val">{{ profile.nickname || '—' }}</span></div>
            <div class="info-row"><span class="info-key">SparkID</span><span class="info-val">{{ profile.spark_id || '—' }}</span></div>
            <div class="info-row"><span class="info-key">学校</span><span class="info-val">{{ profile.college || '—' }}</span></div>
            <div class="info-row"><span class="info-key">专业</span><span class="info-val">{{ profile.major || '—' }}</span></div>
            <div class="info-row"><span class="info-key">年级</span><span class="info-val">{{ profile.grade || '—' }}</span></div>
            <div class="info-row"><span class="info-key">个人简介</span><span class="info-val">{{ profile.bio || '—' }}</span></div>
            <div class="info-row"><span class="info-key">注册时间</span><span class="info-val">{{ profile.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '—' }}</span></div>
          </div>
          <button v-if="isMyProfile" class="btn-action primary" style="margin-top: 20px;" @click="goToSettings">
            编辑资料
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>

  <!-- 加载态 -->
  <div v-else class="profile-loading">
    <div class="spinner"></div>
    <span>加载中...</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'

// Props — 支持他人主页
const props = defineProps<{
  userId?: string
}>()

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

// ==================== 状态 ====================

const isLoading = ref(true)
const profile = ref<Record<string, any>>({})
const stats = ref({
  posts_count: 0,
  products_count: 0,
  followers_count: 0,
  following_count: 0,
  likes_received: 0,
})
const isFollowing = ref(false)
const currentTab = ref('posts')

// 内容数据
const posts = ref<any[]>([])
const postsLoading = ref(false)
const products = ref<any[]>([])
const followersList = ref<any[]>([])
const followingList = ref<any[]>([])

const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

// ==================== 计算属性 ====================

const profileId = computed(() => {
  // 从 route.params 或 props 获取
  const routeUserId = route.params.userId as string | undefined
  return routeUserId || props.userId || user.value?.id || ''
})

const isMyProfile = computed(() => {
  if (!user.value) return false
  return profileId.value === user.value.id
})

const avatarInitial = computed(() =>
  profile.value.nickname?.charAt(0)?.toUpperCase() || '?'
)

const daysSinceJoined = computed(() => {
  if (!profile.value.created_at) return 1
  const diff = Date.now() - new Date(profile.value.created_at).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const bannerStyle = computed(() => {
  if (profile.value.banner_url) {
    return { backgroundImage: `url(${profile.value.banner_url})` }
  }
  // 默认渐变 — 根据用户 ID 哈希生成不同色调
  const hue = (profileId.value || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return { background: `linear-gradient(135deg, hsl(${hue}, 45%, 28%), hsl(${(hue + 60) % 360}, 35%, 18%))` }
})

const visibleTabs = computed(() => {
  const tabs = [
    { key: 'posts', label: '动态', count: stats.value.posts_count },
    { key: 'products', label: '商品', count: stats.value.products_count },
  ]
  // 收藏仅自己可见
  if (isMyProfile.value) {
    tabs.push({ key: 'favorites', label: '收藏', count: 0 })
  }
  tabs.push(
    { key: 'followers', label: '粉丝', count: stats.value.followers_count },
    { key: 'following', label: '关注', count: stats.value.following_count },
    { key: 'info', label: '资料', count: 0 },
  )
  return tabs
})

// ==================== 数据加载 ====================

async function loadProfile() {
  if (!profileId.value) return
  isLoading.value = true

  try {
    // 获取用户资料
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId.value)
      .single()

    if (profileData) {
      profile.value = profileData
    }

    // 获取统计数据
    await loadStats()

    // 获取关注状态（非自己）
    if (!isMyProfile.value && user.value) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.value.id)
        .eq('following_id', profileId.value)
        .maybeSingle()
      isFollowing.value = !!followData
    }
  } catch (e) {
    console.error('[Profile] loadProfile:', e)
  } finally {
    isLoading.value = false
  }

  // 默认加载动态
  loadTabContent('posts')
}

async function loadStats() {
  const uid = profileId.value

  // 动态数
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', uid)
    .eq('is_anonymous', false)

  // 商品数 — 容错处理
  let productsCount = 0
  try {
    const { count } = await supabase
      .from('shop_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', uid)
    productsCount = count || 0
  } catch { /* 表可能不存在 */ }

  // 粉丝数
  let followersCount = 0
  try {
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', uid)
    followersCount = count || 0
  } catch { /* 表可能不存在 */ }

  // 关注数
  let followingCount = 0
  try {
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', uid)
    followingCount = count || 0
  } catch { /* 表可能不存在 */ }

  // 获赞数
  let totalLikes = 0
  try {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', uid)
    totalLikes = count || 0
  } catch { /* 表可能不存在 */ }

  stats.value = {
    posts_count: postsCount || 0,
    products_count: productsCount,
    followers_count: followersCount,
    following_count: followingCount,
    likes_received: totalLikes,
  }
}

// ==================== Tab 内容加载 ====================

async function loadTabContent(tab: string) {
  switch (tab) {
    case 'posts': return loadPosts()
    case 'products': return loadProducts()
    case 'followers': return loadFollowers()
    case 'following': return loadFollowing()
  }
}

async function loadPosts() {
  postsLoading.value = true
  try {
    const { data } = await supabase
      .from('posts')
      .select('id, content, media_urls, category, created_at')
      .eq('author_id', profileId.value)
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .limit(20)

    posts.value = (data || []).map(p => ({
      ...p,
      likes_count: 0,
      comments_count: 0,
    }))
  } catch (e) {
    console.error('[Profile] loadPosts:', e)
  } finally {
    postsLoading.value = false
  }
}

async function loadProducts() {
  try {
    const { data } = await supabase
      .from('shop_products')
      .select('id, title, price, images, status, created_at')
      .eq('seller_id', profileId.value)
      .order('created_at', { ascending: false })
      .limit(20)
    products.value = data || []
  } catch { products.value = [] }
}

async function loadFollowers() {
  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', profileId.value)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const ids = data.map(d => d.follower_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, bio, college')
        .in('id', ids)
      followersList.value = profiles || []
    } else {
      followersList.value = []
    }
  } catch { followersList.value = [] }
}

async function loadFollowing() {
  try {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileId.value)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const ids = data.map(d => d.following_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, bio, college')
        .in('id', ids)
      followingList.value = profiles || []
    } else {
      followingList.value = []
    }
  } catch { followingList.value = [] }
}

// ==================== 操作 ====================

function switchTab(tab: string) {
  currentTab.value = tab
  loadTabContent(tab)
}

async function toggleFollow() {
  if (!user.value || !profileId.value) return

  try {
    if (isFollowing.value) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.value.id)
        .eq('following_id', profileId.value)
      isFollowing.value = false
      stats.value.followers_count = Math.max(0, stats.value.followers_count - 1)
      showToast('已取消关注')
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.value.id,
          following_id: profileId.value,
        })
      isFollowing.value = true
      stats.value.followers_count += 1
      showToast('关注成功 🎉')
    }
  } catch (e) {
    console.error('[Profile] toggleFollow:', e)
    showToast('操作失败，请重试')
  }
}

function goToSettings() {
  router.push('/app/settings/profile')
}

function startChat() {
  router.push({ path: '/app/messages', query: { to: profileId.value } })
}

function shareProfile() {
  const url = `${window.location.origin}/app/profile/${profileId.value}`
  navigator.clipboard.writeText(url).then(() => {
    showToast('主页链接已复制 📋')
  })
}

function viewUser(userId: string) {
  router.push(`/app/profile/${userId}`)
}

function viewPost(postId: string) {
  router.push({ path: '/app/wall', query: { highlight: postId } })
}

function viewProduct(productId: string) {
  router.push({ path: '/app/shop', query: { product: productId } })
}

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

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

// ==================== 生命周期 ====================

onMounted(() => {
  loadProfile()
})

// 路由参数变化时重新加载
watch(() => route.params.userId, (newId) => {
  if (newId !== undefined) {
    currentTab.value = 'posts'
    loadProfile()
  }
})
</script>

<style scoped>
/* ====== 页面 ====== */
.profile-page {
  max-width: 960px;
  margin: 0 auto;
  padding-bottom: 60px;
}

/* ====== Banner ====== */
.profile-banner {
  position: relative;
  height: 240px;
  border-radius: 0 0 24px 24px;
  overflow: hidden;
}
.banner-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.banner-fade {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--color-bg-primary) 100%);
}
.banner-content {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: flex-end; gap: 20px;
  padding: 0 32px 24px;
}

/* ====== 头像 ====== */
.avatar-area {
  position: relative; flex-shrink: 0;
}
.avatar-ring {
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 3px solid var(--color-bg-primary);
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.avatar-img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; font-weight: 700;
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}
.level-pill {
  position: absolute; bottom: -4px; left: 50%;
  transform: translateX(-50%);
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 10px; font-weight: 700;
  background: var(--gradient-brand);
  color: white;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

/* ====== 信息区 ====== */
.info-area { flex: 1; min-width: 0; }
.name-row {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}
.name-row h1 {
  font-size: 22px; font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.verified-tag {
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 6px;
  background: rgba(16,185,129,0.12); color: #10b981;
}
.verified-tag.student {
  background: rgba(79,142,247,0.12); color: #4f8ef7;
}
.spark-id {
  font-size: 12px; color: var(--color-text-muted);
  margin: 4px 0 8px;
}
.meta-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.meta-chip {
  font-size: 11px; font-weight: 500;
  padding: 3px 10px; border-radius: 6px;
  background: var(--color-bg-card-hover);
  color: var(--color-text-secondary);
}
.bio-text {
  font-size: 13px; color: var(--color-text-secondary);
  margin: 0; line-height: 1.5;
  max-width: 480px;
}

/* ====== 操作按钮 ====== */
.action-area {
  display: flex; gap: 8px;
  flex-shrink: 0;
  align-self: flex-end;
}
.btn-action {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border: none; border-radius: 10px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.btn-action.primary {
  background: var(--gradient-brand); color: white;
}
.btn-action.ghost {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn-action.following {
  background: var(--color-bg-card);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

/* ====== 统计条 ====== */
.stats-strip {
  display: flex; justify-content: center;
  gap: 0;
  margin: 16px 32px 0;
  padding: 14px 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}
.stat-cell {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: 2px;
  background: none; border: none; cursor: pointer;
  transition: opacity 0.15s;
  padding: 4px 0;
}
.stat-cell:hover { opacity: 0.7; }
.stat-cell strong {
  font-size: 18px; font-weight: 700;
  color: var(--color-text-primary);
}
.stat-cell span {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* ====== Tab 导航 ====== */
.tab-bar {
  display: flex;
  gap: 0;
  margin: 16px 32px 0;
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
}
.tab-item {
  position: relative;
  padding: 12px 20px;
  background: none; border: none;
  font-size: 14px; font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s;
  white-space: nowrap;
}
.tab-item:hover { color: var(--color-text-primary); }
.tab-item.active {
  color: var(--color-text-primary); font-weight: 600;
}
.tab-item.active::after {
  content: '';
  position: absolute; bottom: -1px; left: 16px; right: 16px;
  height: 2px;
  background: var(--theme-color, #4f8ef7);
  border-radius: 1px;
}
.tab-count {
  margin-left: 4px;
  font-size: 11px; font-weight: 400;
  color: var(--color-text-muted);
}

/* ====== 内容区 ====== */
.content-area {
  padding: 20px 32px;
}

/* 加载 / 空状态 */
.loading-hint, .empty-hint {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 48px 20px;
  text-align: center;
}
.empty-emoji { font-size: 40px; opacity: 0.3; }
.empty-hint p { font-size: 14px; color: var(--color-text-muted); margin: 0; }
.empty-cta {
  font-size: 13px; font-weight: 600;
  color: var(--theme-color, #4f8ef7);
  text-decoration: none;
}

/* ====== 动态列表 ====== */
.posts-list { display: flex; flex-direction: column; gap: 12px; }
.post-card {
  padding: 18px 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.post-card:hover { border-color: var(--color-border-hover); }
.post-text {
  font-size: 14px; line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0 0 10px;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-media {
  display: flex; gap: 8px; margin-bottom: 10px;
}
.media-thumb {
  width: 80px; height: 80px;
  border-radius: 10px;
  object-fit: cover;
}
.media-more {
  display: flex; align-items: center; justify-content: center;
  width: 80px; height: 80px;
  border-radius: 10px;
  background: var(--color-bg-card-hover);
  color: var(--color-text-muted);
  font-size: 14px; font-weight: 600;
}
.post-bottom {
  display: flex; align-items: center; gap: 16px;
}
.post-stat { font-size: 12px; color: var(--color-text-muted); }
.post-time { margin-left: auto; font-size: 12px; color: var(--color-text-muted); }

/* ====== 商品网格 ====== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.product-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.product-card:hover { border-color: var(--color-border-hover); transform: translateY(-2px); }
.prod-img-wrap {
  position: relative;
  aspect-ratio: 1;
  background: var(--color-bg-card-hover);
}
.prod-img { width: 100%; height: 100%; object-fit: cover; }
.prod-img-placeholder {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; font-size: 32px;
}
.sold-tag {
  position: absolute; top: 8px; right: 8px;
  padding: 2px 8px; border-radius: 6px;
  background: rgba(0,0,0,0.6); color: white;
  font-size: 11px; font-weight: 600;
}
.prod-info {
  padding: 10px 12px;
}
.prod-info h4 {
  font-size: 13px; font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.prod-price {
  font-size: 15px; font-weight: 700;
  color: #f43f5e;
}

/* ====== 用户列表 ====== */
.user-list { display: flex; flex-direction: column; gap: 8px; }
.user-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.user-card:hover { border-color: var(--color-border-hover); }
.uc-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-card-hover);
}
.uc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.uc-avatar span {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  font-size: 18px; font-weight: 700;
  color: var(--color-text-secondary);
}
.uc-info { min-width: 0; }
.uc-info strong {
  display: block;
  font-size: 14px; color: var(--color-text-primary);
}
.uc-info span {
  font-size: 12px; color: var(--color-text-muted);
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ====== 资料卡片 ====== */
.info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
}
.info-card h3 {
  font-size: 16px; color: var(--color-text-primary);
  margin: 0 0 16px;
}
.info-grid { display: flex; flex-direction: column; gap: 12px; }
.info-row {
  display: flex; align-items: baseline; gap: 16px;
}
.info-key {
  min-width: 80px;
  font-size: 13px; color: var(--color-text-muted);
  flex-shrink: 0;
}
.info-val {
  font-size: 13px; color: var(--color-text-primary);
}

/* ====== Toast ====== */
.toast {
  position: fixed; left: 50%; bottom: 32px;
  transform: translateX(-50%);
  padding: 10px 22px; border-radius: 99px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-elevated);
  font-size: 14px; z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* ====== 加载页 ====== */
.profile-loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 120px 20px; text-align: center;
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--theme-color, #4f8ef7);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .profile-banner { height: 200px; }
  .banner-content { padding: 0 16px 20px; flex-wrap: wrap; }
  .avatar-ring { width: 72px; height: 72px; }
  .avatar-fallback { font-size: 28px; }
  .name-row h1 { font-size: 18px; }
  .action-area { width: 100%; justify-content: stretch; }
  .stats-strip { margin: 12px 16px 0; }
  .tab-bar { margin: 12px 16px 0; }
  .content-area { padding: 16px; }
  .products-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .banner-content { gap: 12px; }
  .info-area { width: 100%; }
}
</style>
