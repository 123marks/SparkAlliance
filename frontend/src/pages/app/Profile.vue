<template>
  <div class="profile-layout">
    <!-- Hero Banner -->
    <div class="profile-banner">
      <div class="banner-overlay"></div>
    </div>

    <div class="profile-container">
      <!-- 个人信息头部 -->
      <div class="profile-header glass-pro">
        <div class="p-avatar-wrapper spring-hover">
          <div class="p-avatar">{{ avatarInitial }}</div>
        </div>

        <div class="p-info">
          <h1>
            {{ userName }}
            <span class="spark-badge spring-hover" title="当前等级：萤火虫">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              萤火虫 Lv.1
            </span>
          </h1>
          <p class="user-status">{{ userEmail }} &middot; 加入星火 {{ daysSinceJoined }} 天</p>

          <div class="user-meta">
            <span class="meta-tag spring-hover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom;margin-right:4px;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>星火大学
            </span>
            <span class="meta-tag spring-hover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom;margin-right:4px;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>计算机科学与技术
            </span>
          </div>

          <div class="bio">"代码改变世界，探索从未停止。"</div>
        </div>

        <div class="header-actions">
          <button class="btn-primary spring-hover">编辑资料</button>
          <button class="btn-ghost icon-only spring-hover">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </div>

      <!-- 内容网格 -->
      <div class="content-grid">
        <!-- 左列 -->
        <div class="main-col">
          <!-- 活跃热力图 -->
          <div class="widget glass-pro spring-hover">
            <div class="widget-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f97316;"><path d="M12 2c2.5 4.5 4 8 4 11s-2.5 8-4 8-4-5-4-8 1.5-6.5 4-11z"></path></svg> 活跃热力图
              </h3>
            </div>
            <div class="widget-body">
              <div class="heatmap">
                <div class="h-col" v-for="w in 24" :key="w">
                  <div class="h-cell" v-for="d in 7" :key="d" :class="getRandomIntensity()"></div>
                </div>
              </div>
              <div class="heatmap-legend">
                <span>Less</span>
                <div class="h-cell lv-0"></div><div class="h-cell lv-1"></div><div class="h-cell lv-2"></div><div class="h-cell lv-3"></div><div class="h-cell lv-4"></div>
                <span>More</span>
              </div>
            </div>
          </div>

          <!-- 我的动态 -->
          <div class="widget glass-pro">
            <div class="widget-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #4f8ef7;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                我的动态
                <span class="count-badge">{{ myPosts.length }}</span>
              </h3>
            </div>
            <div class="widget-body">
              <!-- 加载态 -->
              <div v-if="isLoadingPosts" class="posts-loading">
                <div class="skel skel-line w80" v-for="i in 3" :key="i"></div>
              </div>
              <!-- 空态 -->
              <div v-else-if="myPosts.length === 0" class="posts-empty">
                <p>还没有发布过动态</p>
                <router-link to="/app/wall" class="go-post-btn">去发布 →</router-link>
              </div>
              <!-- 动态列表 -->
              <div v-else class="my-posts-list">
                <div class="my-post-item" v-for="post in myPosts.slice(0, 5)" :key="post.id">
                  <div class="mp-content">{{ post.content.slice(0, 80) }}{{ post.content.length > 80 ? '...' : '' }}</div>
                  <div class="mp-meta">
                    <span class="mp-cat" :class="'cat-' + post.category">{{ getCatLabel(post.category) }}</span>
                    <span class="mp-time">{{ formatTime(post.created_at) }}</span>
                    <span class="mp-likes">❤️ {{ post.likesCount }}</span>
                  </div>
                  <!-- 媒体缩略图 -->
                  <div class="mp-thumbs" v-if="post.media_urls?.length">
                    <img v-for="(url, i) in post.media_urls.slice(0, 3)" :key="i" :src="url" class="mp-thumb" @error="(e: Event) => (e.target as HTMLImageElement).style.display='none'" />
                  </div>
                </div>
                <router-link v-if="myPosts.length > 5" to="/app/wall" class="view-all-link">查看全部 {{ myPosts.length }} 条 →</router-link>
              </div>
            </div>
          </div>

          <!-- 学习目标进度 -->
          <div class="widget glass-pro spring-hover">
            <div class="widget-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> 学习目标进度
              </h3>
            </div>
            <div class="widget-body goal-list">
              <div class="goal-item">
                <div class="g-info"><span>完成《编译原理》视频课程</span><span class="pct">75%</span></div>
                <div class="progress-track"><div class="progress-bar" style="width: 75%; background: var(--color-brand-blue)"></div></div>
              </div>
              <div class="goal-item">
                <div class="g-info"><span>六级英语词汇背诵 (3000/4500)</span><span class="pct">66%</span></div>
                <div class="progress-track"><div class="progress-bar" style="width: 66%; background: var(--color-brand-purple)"></div></div>
              </div>
              <div class="goal-item">
                <div class="g-info"><span>每周算法刷题 (4/5)</span><span class="pct">80%</span></div>
                <div class="progress-track"><div class="progress-bar" style="width: 80%; background: var(--color-brand-orange)"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="side-col">
          <!-- 真实统计数据 -->
          <div class="widget glass-pro">
            <div class="widget-body grid-stats">
               <div class="s-brick spring-hover">
                 <span class="num">{{ stats.totalLikes }}</span>
                 <span class="lbl">获赞总数</span>
               </div>
               <div class="s-brick spring-hover">
                 <span class="num">{{ stats.totalPosts }}</span>
                 <span class="lbl">动态发布</span>
               </div>
               <div class="s-brick spring-hover">
                 <span class="num">{{ daysSinceJoined }}</span>
                 <span class="lbl">活跃天数</span>
               </div>
               <div class="s-brick spring-hover">
                 <span class="num">{{ stats.totalMedia }}</span>
                 <span class="lbl">媒体上传</span>
               </div>
            </div>
          </div>

          <!-- 偏好设置 -->
          <div class="widget glass-pro">
            <div class="widget-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> 偏好设置
              </h3>
            </div>
            <div class="settings-list">
              <div class="setting-item">
                 <span class="s-text" style="color: var(--color-text-muted);">设置功能将于后续版本开放</span>
              </div>
            </div>

            <div class="widget-footer">
              <button class="btn-danger spring-hover" @click="handleLogout" :disabled="isLoggingOut">
                <span class="btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </span>
                {{ isLoggingOut ? '登出中...' : '退出登录' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'

const router = useRouter()
const { user } = useAuth()
const isLoggingOut = ref(false)
const isLoadingPosts = ref(true)

// 用户信息
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '星火探险家'
})
const userEmail = computed(() => user.value?.email || '未绑定邮箱')
const avatarInitial = computed(() => userName.value ? userName.value.charAt(0).toUpperCase() : '?')
const daysSinceJoined = computed(() => {
  if (!user.value?.created_at) return 1
  const diff = new Date().getTime() - new Date(user.value.created_at).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// ====== 真实统计数据 ======
const stats = reactive({
  totalPosts: 0,
  totalLikes: 0,
  totalMedia: 0
})

// ====== 我的动态 ======
interface MyPost {
  id: string
  content: string
  category: string
  created_at: string
  media_urls: string[]
  likesCount: number
}

const myPosts = ref<MyPost[]>([])

const fetchMyData = async () => {
  if (!user.value) return
  isLoadingPosts.value = true

  try {
    // 获取我的帖子 + 点赞数
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, likes(count)')
      .eq('author_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (postsData) {
      myPosts.value = postsData.map(p => ({
        id: p.id,
        content: p.content,
        category: p.category || 'general',
        created_at: p.created_at,
        media_urls: p.media_urls || [],
        likesCount: p.likes?.[0]?.count || 0
      }))

      // 计算统计数据
      stats.totalPosts = myPosts.value.length
      stats.totalLikes = myPosts.value.reduce((sum, p) => sum + p.likesCount, 0)
      stats.totalMedia = myPosts.value.reduce((sum, p) => sum + (p.media_urls?.length || 0), 0)
    }
  } catch (error) {
    console.error('获取个人数据失败:', error)
  } finally {
    isLoadingPosts.value = false
  }
}

onMounted(() => {
  if (user.value) {
    fetchMyData()
  } else {
    setTimeout(fetchMyData, 1000)
  }
})

// 分类标签映射
const getCatLabel = (cat: string): string => {
  const map: Record<string, string> = {
    general: '动态', confession: '表白', help: '求助', trade: '二手', lost: '失物'
  }
  return map[cat] || '动态'
}

// 时间格式化
const formatTime = (dateStr: string): string => {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 退出登录
const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    await supabase.auth.signOut()
    router.push('/login')
  } catch (error) {
    console.error('登出失败:', error)
  } finally {
    isLoggingOut.value = false
  }
}

// 热力图随机强度（模拟数据）
const getRandomIntensity = () => {
  const rand = Math.random()
  if (rand < 0.6) return 'lv-0'
  if (rand < 0.8) return 'lv-1'
  if (rand < 0.9) return 'lv-2'
  if (rand < 0.95) return 'lv-3'
  return 'lv-4'
}
</script>

<style scoped>
.profile-layout {
  min-height: calc(100vh - 72px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 40px;
}

.profile-banner {
  height: 240px;
  width: 100%;
  background: url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1470&auto=format&fit=crop') center/cover;
  position: relative;
}
.banner-overlay {
  position: absolute; top:0;left:0;right:0;bottom:0;
  background: linear-gradient(to bottom, rgba(10,10,15,0) 0%, rgba(10,10,15,1) 100%);
}

.profile-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 40px;
  position: relative;
  margin-top: -80px;
}

/* Header */
.profile-header {
  display: flex;
  gap: 32px;
  align-items: center;
  margin-bottom: 40px;
  padding: 40px;
  border-radius: 24px;
}
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 32px 20px;
  }
}

.p-avatar-wrapper { position: relative; flex-shrink: 0; }
.p-avatar {
  width: 120px; height: 120px; border-radius: 50%;
  background: var(--gradient-brand);
  border: 4px solid var(--color-bg-primary);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  font-size: 48px; font-weight: 800; color: white;
}

.p-info { flex: 1; }
.p-info h1 {
  font-size: 32px; font-weight: 800;
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 8px; flex-wrap: wrap;
}

.spark-badge {
  font-size: 14px; font-weight: 600; padding: 4px 12px;
  background: rgba(249, 115, 22, 0.15);
  color: var(--color-brand-orange);
  border: 1px solid rgba(249, 115, 22, 0.3);
  border-radius: 20px;
  display: inline-flex; align-items: center; gap: 4px; cursor: default;
}

.user-status { color: var(--color-text-secondary); margin-bottom: 16px; font-size: 15px; }

.user-meta { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
@media (max-width: 768px) { .user-meta { justify-content: center; } }
.meta-tag {
  font-size: 13px; padding: 6px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: var(--color-text-regular); cursor: default;
}

.bio { font-size: 15px; font-style: italic; color: var(--color-text-muted); }

.header-actions { display: flex; gap: 12px; flex-shrink: 0; }
.btn-primary {
  background: var(--color-brand-blue); border: none;
  padding: 0 24px; min-height: 44px; border-radius: 12px;
  color: white; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-ghost {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  min-height: 44px; border-radius: 12px; color: white; cursor: pointer;
}
.btn-ghost:hover { background: rgba(255,255,255,0.1); }
.icon-only { width: 44px; display: flex; align-items: center; justify-content: center; }

/* Grid */
.content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
@media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }
.main-col { display: flex; flex-direction: column; gap: 24px; }
.side-col { display: flex; flex-direction: column; gap: 24px; }
.widget { border-radius: 20px; padding: 24px; }
.widget-header { margin-bottom: 24px; }
.widget-header h3 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }

/* 数量徽章 */
.count-badge {
  font-size: 12px; padding: 2px 8px;
  background: rgba(79, 142, 247, 0.15);
  color: #4f8ef7; border-radius: 10px;
  font-weight: 600;
}

/* Heatmap */
.heatmap { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 12px; }
.h-col { display: flex; flex-direction: column; gap: 4px; }
.h-cell { width: 14px; height: 14px; border-radius: 3px; background: rgba(255,255,255,0.05); }
.lv-0 { background: rgba(255,255,255,0.03); }
.lv-1 { background: rgba(16, 185, 129, 0.2); }
.lv-2 { background: rgba(16, 185, 129, 0.5); }
.lv-3 { background: rgba(16, 185, 129, 0.8); }
.lv-4 { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
.heatmap-legend { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-muted); justify-content: flex-end; }

/* 我的动态 */
.posts-loading { display: flex; flex-direction: column; gap: 12px; }
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  height: 14px;
}
.skel-line { height: 14px; }
.w80 { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.posts-empty {
  text-align: center; padding: 24px 0;
  color: var(--color-text-muted); font-size: 14px;
}
.go-post-btn {
  display: inline-block;
  margin-top: 12px; padding: 8px 20px;
  background: var(--gradient-brand);
  color: white; border-radius: 8px;
  font-weight: 600; font-size: 13px;
  transition: transform 0.2s;
}
.go-post-btn:hover { transform: translateY(-2px); }

.my-posts-list { display: flex; flex-direction: column; gap: 16px; }
.my-post-item {
  padding: 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  transition: all 0.2s;
}
.my-post-item:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }

.mp-content {
  font-size: 14px; line-height: 1.5;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}
.mp-meta {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--color-text-muted);
}
.mp-cat {
  padding: 2px 8px; border-radius: 4px;
  font-size: 10px; font-weight: 600;
}
.mp-cat.cat-general { background: rgba(79,142,247,0.1); color: #4f8ef7; }
.mp-cat.cat-confession { background: rgba(244,63,94,0.1); color: #f43f5e; }
.mp-cat.cat-help { background: rgba(249,115,22,0.1); color: #f97316; }
.mp-cat.cat-trade { background: rgba(16,185,129,0.1); color: #10b981; }
.mp-cat.cat-lost { background: rgba(139,92,246,0.1); color: #8b5cf6; }
.mp-likes { color: var(--color-text-muted); }

.mp-thumbs { display: flex; gap: 6px; margin-top: 10px; }
.mp-thumb {
  width: 48px; height: 48px; border-radius: 8px;
  object-fit: cover; border: 1px solid rgba(255,255,255,0.06);
}

.view-all-link {
  display: block; text-align: center;
  color: var(--color-brand-blue);
  font-size: 13px; font-weight: 500;
  padding-top: 8px;
}
.view-all-link:hover { text-decoration: underline; }

/* Goals */
.goal-list { display: flex; flex-direction: column; gap: 24px; }
.g-info { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 10px; font-weight: 500; }
.progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
.progress-bar { height: 100%; border-radius: 4px; box-shadow: 0 0 10px currentColor; }

/* Side Stats */
.grid-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.s-brick {
  background: rgba(255,255,255,0.03);
  border-radius: 16px; padding: 20px 16px;
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  border: 1px solid rgba(255,255,255,0.05); cursor: default;
}
.s-brick:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
.s-brick .num { font-size: 28px; font-weight: 800; color: white; margin-bottom: 6px; }
.s-brick .lbl { font-size: 13px; color: var(--color-text-secondary); }

/* Settings */
.settings-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.setting-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; background: rgba(255,255,255,0.03);
  border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;
}
.setting-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
.s-text { font-size: 15px; font-weight: 500; color: var(--color-text-regular); }

/* Footer */
.widget-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }
.btn-danger {
  width: 100%; min-height: 44px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444; border-radius: 12px;
  font-size: 15px; font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-danger:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
