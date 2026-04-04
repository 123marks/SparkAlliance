<template>
  <!-- 宇宙深空动态背景 -->
  <CosmicBackground :enabled="true" />
  
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
            <button class="btn-action ghost" @click="showSparkCard=true" title="星火名片">
              📱
            </button>
            <button class="btn-action ghost" @click="showPostModal=true" title="发布动态">
              ✍️
            </button>
            <button class="btn-action ghost" @click="showPrivacyModal=true" title="隐私设置">
              🔒
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

  <!-- 星火名片弹窗 -->
  <Transition name="fade">
    <div v-if="showSparkCard" class="spark-card-overlay" @click.self="showSparkCard=false">
      <div class="spark-card-modal">
        <button class="close-btn" @click="showSparkCard=false">✕</button>
        <div class="spark-card-content">
          <!-- 用户信息 -->
          <div class="card-user-info">
            <div class="card-avatar">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="" />
              <span v-else class="avatar-text">{{ avatarInitial }}</span>
            </div>
            <h2 class="card-nickname">{{ profile.nickname || '星火用户' }}</h2>
            <p class="card-spark-id">{{ profile.spark_id }}</p>
            <p class="card-bio">{{ profile.bio || '这个人很懒' }}</p>
          </div>
          <!-- 二维码 -->
          <div class="card-qr-area">
            <canvas ref="sparkQrCanvas" class="card-qr-canvas"></canvas>
            <p class="card-qr-tip">扫一扫上面的二维码，添加我为好友</p>
          </div>
          <!-- 操作按钮 -->
          <div class="card-actions">
            <button class="card-btn primary" @click="copySparkLink">📋 复制名片链接</button>
            <button class="card-btn" @click="saveQRImage">💾 保存二维码</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 发布动态弹窗 -->
  <Transition name="fade">
    <div v-if="showPostModal" class="spark-card-overlay" @click.self="showPostModal=false">
      <div class="spark-card-modal post-modal">
        <div class="modal-header">
          <h3>发布动态</h3>
          <button class="close-btn" @click="showPostModal=false">✕</button>
        </div>
        <div class="post-form">
          <textarea v-model="postContent" placeholder="分享你的想法..." rows="5" maxlength="500"></textarea>
          <div class="post-toolbar">
            <div class="media-btns">
              <button title="添加图片" @click="showToast('图片上传即将上线')">🖼️</button>
              <button title="添加视频" @click="showToast('视频上传即将上线')">🎬</button>
              <button title="添加定位" @click="showToast('定位功能即将上线')">📍</button>
            </div>
            <select v-model="postVisibility" class="visibility-select">
              <option value="public">🌐 公开可见</option>
              <option value="friends">👥 仅好友可见</option>
              <option value="private">🔒 仅自己可见</option>
            </select>
          </div>
          <div class="post-actions">
            <button class="post-cancel" @click="showPostModal=false">取消</button>
            <button class="post-submit" :disabled="!postContent.trim()" @click="handlePostMoment">发布</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 隐私设置弹窗 -->
  <Transition name="fade">
    <div v-if="showPrivacyModal" class="spark-card-overlay" @click.self="showPrivacyModal=false">
      <div class="spark-card-modal privacy-modal">
        <div class="modal-header">
          <h3>🔒 隐私设置</h3>
          <button class="close-btn" @click="showPrivacyModal=false">✕</button>
        </div>
        <div class="privacy-content">
          <div class="privacy-item">
            <div class="privacy-label">
              <span class="privacy-icon">📅</span>
              <div>
                <h4>动态可见天数</h4>
                <p>设置动态对好友可见的时间范围</p>
              </div>
            </div>
            <select v-model="privacySettings.momentVisibleDays" class="privacy-select">
              <option value="0">全部可见</option>
              <option value="3">最近3天</option>
              <option value="7">最近7天</option>
              <option value="30">最近一个月</option>
              <option value="180">最近半年</option>
            </select>
          </div>
          <div class="privacy-item">
            <div class="privacy-label">
              <span class="privacy-icon">👁️</span>
              <div>
                <h4>允许陌生人查看</h4>
                <p>非好友是否可以查看你的动态</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="privacySettings.allowStrangerView" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="privacy-item">
            <div class="privacy-label">
              <span class="privacy-icon">🔔</span>
              <div>
                <h4>消息免打扰</h4>
                <p>开启后不会收到消息通知提醒</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="privacySettings.doNotDisturb" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="privacy-item">
            <div class="privacy-label">
              <span class="privacy-icon">📍</span>
              <div>
                <h4>显示在广场</h4>
                <p>是否在星火广场展示你的主页</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="privacySettings.showInPlaza" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="privacy-actions">
          <button class="privacy-save" @click="savePrivacySettings">💾 保存设置</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'
import CosmicBackground from '../../components/CosmicBackground.vue'
import QRCode from 'qrcode'

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

// 弹窗状态
const showSparkCard = ref(false)
const showPostModal = ref(false)
const showPrivacyModal = ref(false)
const sparkQrCanvas = ref<HTMLCanvasElement | null>(null)

// 发布动态
const postContent = ref('')
const postVisibility = ref<'public' | 'friends' | 'private'>('public')

// 隐私设置
const privacySettings = reactive({
  momentVisibleDays: 0,
  allowStrangerView: true,
  doNotDisturb: false,
  showInPlaza: true,
})

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

// ==================== 星火名片 ====================

function getSparkQRData() {
  return JSON.stringify({
    platform: 'SparkAlliance',
    type: 'user',
    id: profile.value.spark_id || profileId.value,
    name: profile.value.nickname || '星火用户',
    avatar: profile.value.avatar_url || '',
    ts: Date.now(),
  })
}

async function renderSparkQR() {
  if (!sparkQrCanvas.value) return
  try {
    await QRCode.toCanvas(sparkQrCanvas.value, getSparkQRData(), {
      width: 180,
      margin: 2,
      color: { dark: '#8b5cf6', light: '#0d0a1a' }
    })
  } catch (e) {
    console.error('[Profile] QR render error:', e)
  }
}

function copySparkLink() {
  const url = `${window.location.origin}/app/profile/${profileId.value}`
  navigator.clipboard.writeText(url).then(() => {
    showToast('名片链接已复制 📋')
  })
}

function saveQRImage() {
  if (!sparkQrCanvas.value) return
  const link = document.createElement('a')
  link.download = `spark-card-${profile.value.spark_id || 'user'}.png`
  link.href = sparkQrCanvas.value.toDataURL('image/png')
  link.click()
  showToast('二维码已保存 💾')
}

// ==================== 发布动态 ====================

async function handlePostMoment() {
  if (!postContent.value.trim()) return
  
  try {
    const { error } = await supabase.from('posts').insert({
      author_id: user.value?.id,
      content: postContent.value.trim(),
      media_urls: [],
      category: 'moment',
      visibility: postVisibility.value,
      is_anonymous: false,
    })
    
    if (error) throw error
    
    postContent.value = ''
    showPostModal.value = false
    showToast('动态发布成功 🎉')
    stats.value.posts_count += 1
    loadPosts()
  } catch (e) {
    console.error('[Profile] postMoment error:', e)
    showToast('发布失败，请重试')
  }
}

// ==================== 隐私设置 ====================

function loadPrivacySettings() {
  const saved = localStorage.getItem(`spark_privacy_${profileId.value}`)
  if (saved) {
    try {
      Object.assign(privacySettings, JSON.parse(saved))
    } catch {}
  }
}

function savePrivacySettings() {
  localStorage.setItem(`spark_privacy_${profileId.value}`, JSON.stringify(privacySettings))
  showPrivacyModal.value = false
  showToast('隐私设置已保存 ✓')
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
  loadPrivacySettings()
})

// 监听星火名片弹窗
watch(showSparkCard, (v) => {
  if (v) nextTick(() => renderSparkQR())
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

/* ====== 淡入淡出过渡 ====== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ====== 星火名片弹窗 ====== */
.spark-card-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spark-card-modal {
  position: relative;
  width: 360px;
  max-width: 90vw;
  background: linear-gradient(145deg, rgba(20, 16, 40, 0.98), rgba(10, 8, 20, 0.98));
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1);
}

.spark-card-modal .close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}
.spark-card-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.spark-card-content {
  text-align: center;
}

.card-user-info {
  margin-bottom: 20px;
}

.card-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 12px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.2));
  border: 3px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-avatar .avatar-text {
  font-size: 28px;
  font-weight: 700;
  color: rgba(139, 92, 246, 0.8);
}

.card-nickname {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px;
}

.card-spark-id {
  font-size: 12px;
  color: rgba(139, 92, 246, 0.6);
  margin: 0 0 8px;
}

.card-bio {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  line-height: 1.5;
}

.card-qr-area {
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  margin-bottom: 16px;
}

.card-qr-canvas {
  display: block;
  margin: 0 auto;
  border-radius: 12px;
}

.card-qr-tip {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  margin: 10px 0 0;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.card-btn {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.card-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}
.card-btn.primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: none;
  color: white;
}
.card-btn.primary:hover {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

/* ====== 发布动态弹窗 ====== */
.post-modal {
  width: 420px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.modal-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: white;
  margin: 0;
}
.modal-header .close-btn {
  position: static;
}

.post-form textarea {
  width: 100%;
  min-height: 120px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: white;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
}
.post-form textarea:focus {
  border-color: rgba(139, 92, 246, 0.3);
}
.post-form textarea::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.post-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0;
}

.media-btns {
  display: flex;
  gap: 4px;
}
.media-btns button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.media-btns button:hover {
  background: rgba(139, 92, 246, 0.1);
  transform: scale(1.05);
}

.visibility-select {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.post-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.post-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.post-cancel:hover {
  background: rgba(255, 255, 255, 0.03);
}

.post-submit {
  flex: 2;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.post-submit:hover {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}
.post-submit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ====== 隐私设置弹窗 ====== */
.privacy-modal {
  width: 400px;
}

.privacy-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.privacy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  transition: all 0.15s;
}
.privacy-item:hover {
  border-color: rgba(139, 92, 246, 0.1);
}

.privacy-label {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.privacy-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 10px;
}

.privacy-label h4 {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 2px;
}
.privacy-label p {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

.privacy-select {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  transition: all 0.2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transition: all 0.2s;
}
.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
  background: white;
}

.privacy-actions {
  margin-top: 16px;
}

.privacy-save {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.privacy-save:hover {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

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
