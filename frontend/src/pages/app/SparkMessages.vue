<template>
  <div class="messages-layout">
    <!-- 顶部 Banner -->
    <div class="hero-banner">
      <div class="hero-glow g1"></div>
      <div class="hero-glow g2"></div>
      <div class="hero-content">
        <div class="hero-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="1.5">
            <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#8b5cf6" /><stop offset="100%" style="stop-color:#4f8ef7" /></linearGradient></defs>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        <h1>星火寄语</h1>
        <p class="hero-desc">每一句话，都可能成为某个人的转折点。<br />在这里，跨越年龄与时空，传递温暖、勇气和智慧。</p>
        <div class="hero-stats">
          <span>💬 {{ messages.length }} 条寄语</span>
          <span>🔥 {{ hotMessages.length }} 条热门</span>
          <span>❤️ {{ totalLikes }} 次共鸣</span>
        </div>
      </div>
    </div>

    <div class="messages-body">
      <!-- 分类 Tab -->
      <div class="category-bar">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="cat-tab"
          :class="{ active: activeCategory === cat.value }"
          @click="activeCategory = cat.value"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <div class="content-grid">
        <!-- 左侧：寄语流 -->
        <main class="message-feed">
          <!-- 空状态 -->
          <div v-if="filteredMessages.length === 0" class="empty">
            <div class="empty-icon">✨</div>
            <h3>这里还很安静</h3>
            <p>成为第一个留下寄语的人吧</p>
            <button class="write-btn" @click="showComposer = true">写下第一条寄语</button>
          </div>

          <!-- 寄语卡片 -->
          <TransitionGroup name="card-list" tag="div" class="cards-grid">
            <div class="message-card" v-for="msg in filteredMessages" :key="msg.id" @click="openDetail(msg)">
              <!-- 媒体区域：图片+视频 -->
              <div class="card-media" v-if="msg.mediaUrls?.length">
                <video v-if="isVideoUrl(msg.mediaUrls[0])" :src="msg.mediaUrls[0]" class="card-media-el" muted playsinline preload="metadata" />
                <img v-else :src="msg.mediaUrls[0]" alt="" class="card-media-el" loading="lazy" @error="(e: Event) => (e.target as HTMLImageElement).style.display='none'" />
                <div class="media-count" v-if="msg.mediaUrls.length > 1">+{{ msg.mediaUrls.length - 1 }}</div>
              </div>

              <!-- 类别标签 -->
              <span class="card-category" :class="msg.category">{{ getCategoryLabel(msg.category) }}</span>

              <!-- 内容 -->
              <p class="card-content">{{ msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content }}</p>

              <!-- 作者和互动 -->
              <div class="card-footer">
                <div class="card-author">
                  <div class="author-avatar" :style="{ background: getAvatarBg(msg.authorName) }">
                    {{ msg.authorName.charAt(0) }}
                  </div>
                  <div class="author-info">
                    <span class="author-name">{{ msg.authorName }}</span>
                    <span class="card-time">{{ formatTime(msg.createdAt) }}</span>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="a-btn" :class="{ liked: msg.liked }" @click.stop="toggleLike(msg)">
                    <span>{{ msg.liked ? '❤️' : '🤍' }}</span>
                    {{ msg.likeCount }}
                  </button>
                  <button class="a-btn" @click.stop="openDetail(msg)">💬 {{ msg.commentCount }}</button>
                  <button class="a-btn" @click.stop="shareMessage(msg)">📤</button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </main>

        <!-- 右侧：热门排行 + 快捷操作 -->
        <aside class="sidebar">
          <!-- 发布按钮 -->
          <button class="compose-fab" @click="showComposer = true">
            ✍️ 写一条寄语
          </button>

          <!-- 热门排行 -->
          <div class="side-card">
            <h3 class="side-title">🔥 热门寄语</h3>
            <div class="hot-list">
              <div class="hot-item" v-for="(h, i) in hotMessages" :key="h.id" @click="openDetail(h)">
                <span class="hot-rank" :class="{ top3: i < 3 }">{{ i + 1 }}</span>
                <div class="hot-body">
                  <p>{{ h.content.length > 40 ? h.content.slice(0, 40) + '...' : h.content }}</p>
                  <span class="hot-meta">{{ h.likeCount }} 共鸣 · {{ h.commentCount }} 评论</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分类说明 -->
          <div class="side-card">
            <h3 class="side-title">💡 关于星火寄语</h3>
            <ul class="about-list">
              <li>🎯 <strong>成年人说</strong>：过来人的经验与忠告</li>
              <li>🌱 <strong>对自己说</strong>：给当下迷茫的自己一句话</li>
              <li>🔮 <strong>给未来</strong>：写给未来某天的自己</li>
              <li>💡 <strong>灵感感悟</strong>：生活中触动你的瞬间</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>

    <!-- 发布寄语 Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showComposer" class="overlay" @click.self="showComposer = false">
          <div class="composer-modal">
            <div class="modal-header">
              <h3>✍️ 写一条寄语</h3>
              <button class="close-btn" @click="showComposer = false">✕</button>
            </div>

            <!-- 选择类别 -->
            <div class="compose-cats">
              <button v-for="cat in categories.slice(1)" :key="cat.value" class="cc-btn" :class="{ active: composeCategory === cat.value }" @click="composeCategory = cat.value">
                {{ cat.icon }} {{ cat.label }}
              </button>
            </div>

            <!-- 内容 -->
            <div class="compose-textarea-area">
              <textarea v-model="composeContent" :placeholder="composePlaceholder" class="compose-textarea" rows="6" maxlength="2000"></textarea>
              <span class="char-count" :class="{ warn: composeContent.length > 1800 }">{{ composeContent.length }} / 2000</span>
            </div>

            <!-- 媒体上传预览 -->
            <div class="compose-media-preview" v-if="composePreviewUrls.length">
              <div class="preview-item" v-for="(url, i) in composePreviewUrls" :key="i">
                <video v-if="composeFiles[i]?.type.startsWith('video')" :src="url" class="preview-img" muted />
                <img v-else :src="url" class="preview-img" />
                <button class="remove-btn" @click="removeComposeFile(i)">✕</button>
              </div>
            </div>

            <!-- 工具栏 -->
            <div class="compose-toolbar">
              <div class="compose-tools">
                <button class="tool-btn" @click="composeImageInput?.click()">📷 图片</button>
                <button class="tool-btn" @click="composeVideoInput?.click()">🎬 视频</button>
                <label class="vis-toggle">
                  <input type="checkbox" v-model="composePrivate" />
                  <span>🔒 仅自己可见</span>
                </label>
              </div>
              <button class="compose-submit" :disabled="!composeContent.trim() || isSubmitting" @click="submitMessage">
                {{ isSubmitting ? '发布中...' : '🚀 发布寄语' }}
              </button>
            </div>
            <input ref="composeImageInput" type="file" accept="image/*" multiple hidden @change="onComposeMediaSelected" />
            <input ref="composeVideoInput" type="file" accept="video/mp4,video/webm" hidden @change="onComposeMediaSelected" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="activeMessage" class="overlay" @click.self="activeMessage = null">
          <div class="detail-modal">
            <div class="modal-header">
              <h3>寄语详情</h3>
              <button class="close-btn" @click="activeMessage = null">✕</button>
            </div>

            <div class="detail-body">
              <!-- 作者信息 -->
              <div class="detail-author">
                <div class="author-avatar lg" :style="{ background: getAvatarBg(activeMessage.authorName) }">
                  {{ activeMessage.authorName.charAt(0) }}
                </div>
                <div class="author-info">
                  <strong>{{ activeMessage.authorName }}</strong>
                  <span>{{ formatTime(activeMessage.createdAt) }} · {{ getCategoryLabel(activeMessage.category) }}</span>
                </div>
                <button class="dm-btn" @click="startDM(activeMessage)" title="私信">💌 私信</button>
              </div>

              <!-- 内容 -->
              <p class="detail-content">{{ activeMessage.content }}</p>

              <!-- 媒体：图片+视频 -->
              <div class="detail-media" v-if="activeMessage.mediaUrls?.length">
                <template v-for="(url, i) in activeMessage.mediaUrls" :key="i">
                  <video v-if="isVideoUrl(url)" :src="url" class="detail-img" controls playsinline preload="metadata" />
                  <img v-else :src="url" class="detail-img" loading="lazy" />
                </template>
              </div>

              <!-- 互动栏 -->
              <div class="detail-actions">
                <button class="a-btn large" :class="{ liked: activeMessage.liked }" @click="toggleLike(activeMessage)">
                  {{ activeMessage.liked ? '❤️' : '🤍' }} {{ activeMessage.likeCount }} 共鸣
                </button>
                <button class="a-btn large">💬 {{ activeMessage.commentCount }} 评论</button>
                <button class="a-btn large" @click="shareMessage(activeMessage)">📤 分享</button>
              </div>

              <!-- 评论区 -->
              <div class="comments-section">
                <h4>评论 ({{ detailComments.length }})</h4>
                <div class="comment-list">
                  <div class="comment-item" v-for="c in detailComments" :key="c.id">
                    <div class="c-avatar" :style="{ background: getAvatarBg(c.authorName) }">{{ c.authorName.charAt(0) }}</div>
                    <div class="c-body">
                      <div class="c-meta"><strong>{{ c.authorName }}</strong><span>{{ formatTime(c.createdAt) }}</span></div>
                      <p>{{ c.content }}</p>
                    </div>
                  </div>
                  <div v-if="detailComments.length === 0" class="comment-empty">还没有评论，说点什么吧~</div>
                </div>
                <div class="comment-input-row">
                  <input v-model="newComment" placeholder="写下你的评论..." class="comment-input" @keydown.enter="submitComment" />
                  <button class="comment-send" :disabled="!newComment.trim()" @click="submitComment">发送</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 私信弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDM" class="overlay" @click.self="showDM = false">
          <div class="dm-modal">
            <div class="modal-header">
              <h3>💌 私信给 {{ dmReceiverName }}</h3>
              <button class="close-btn" @click="showDM = false">✕</button>
            </div>
            <textarea v-model="dmContent" placeholder="写下你想说的..." class="compose-textarea" rows="4" maxlength="1000"></textarea>
            <div class="compose-toolbar" style="border:none;">
              <span class="char-count">{{ dmContent.length }} / 1000</span>
              <button class="compose-submit" :disabled="!dmContent.trim()" @click="sendDM">发送私信</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'

const { user } = useAuth()

// ============ 工具函数 ============
const isVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('video')

const shareMessage = async (msg: SparkMessage) => {
  const text = `【星火寄语】${msg.authorName}：${msg.content.slice(0, 80)}...`
  if (navigator.share) {
    try { await navigator.share({ title: '星火寄语', text, url: window.location.href }) } catch { /* 用户取消 */ }
  } else {
    await navigator.clipboard.writeText(text)
    alert('✅ 寄语已复制到剪贴板')
  }
}

// ============ 分类 ============
const categories = [
  { value: 'all', icon: '✨', label: '全部' },
  { value: 'to_youth', icon: '🎯', label: '成年人想说' },
  { value: 'to_self', icon: '🌱', label: '对自己说' },
  { value: 'to_future', icon: '🔮', label: '给未来的我' },
  { value: 'inspiration', icon: '💡', label: '灵感感悟' },
]

const activeCategory = ref('all')
const getCategoryLabel = (cat: string) => categories.find(c => c.value === cat)?.label || cat

// ============ 消息数据 ============
interface SparkMessage {
  id: string
  authorId: string
  authorName: string
  category: string
  content: string
  mediaUrls: string[]
  visibility: string
  likeCount: number
  commentCount: number
  liked: boolean
  createdAt: string
}

interface Comment {
  id: string
  authorName: string
  content: string
  createdAt: string
}

const messages = ref<SparkMessage[]>([
  { id: '1', authorId: 'a1', authorName: '张老师', category: 'to_youth', content: '年轻的时候不要害怕犯错，怕的是不敢尝试。每一次跌倒都是你认识自己的机会。三十年后你会感谢今天那个勇敢的自己。', mediaUrls: [], visibility: 'public', likeCount: 324, commentCount: 56, liked: false, createdAt: '2026-03-28T10:00:00Z' },
  { id: '2', authorId: 'a2', authorName: '星火少年', category: 'to_self', content: '嘿，二十岁的自己，现在的焦虑都会过去的。保持热爱，保持勇敢。你比你想象中要强大得多。记住，所有的弯路都不是白走的。', mediaUrls: [], visibility: 'public', likeCount: 256, commentCount: 42, liked: false, createdAt: '2026-03-28T12:30:00Z' },
  { id: '3', authorId: 'a3', authorName: '李工程师', category: 'to_youth', content: '代码写不出来没关系，工作做不好也没关系。人生不是一场竞赛，是一段旅程。找到让你发光的那件事，然后坚持下去。', mediaUrls: [], visibility: 'public', likeCount: 198, commentCount: 31, liked: false, createdAt: '2026-03-27T09:15:00Z' },
  { id: '4', authorId: 'a4', authorName: '未来的我', category: 'to_future', content: '致2030年的自己：希望你已经实现了自由职业的梦想，有一份热爱的工作，一群志同道合的朋友，和内心的平静。如果还没有，也没关系，继续走。', mediaUrls: [], visibility: 'public', likeCount: 412, commentCount: 89, liked: true, createdAt: '2026-03-27T14:00:00Z' },
  { id: '5', authorId: 'a5', authorName: '自由摄影师小何', category: 'inspiration', content: '今天在一个陌生城市的街角看到一位老奶奶在给流浪猫喂食，阳光刚好照在她满是皱纹的脸上。那一刻我突然觉得，温柔是这个世界上最强大的力量。', mediaUrls: [], visibility: 'public', likeCount: 567, commentCount: 103, liked: false, createdAt: '2026-03-26T16:45:00Z' },
  { id: '6', authorId: 'a6', authorName: '王同学', category: 'to_self', content: '别再熬夜了，真的。身体好才能走更远的路。现在觉得无所谓的事，十年后可能会后悔。爱惜自己，从今天开始。', mediaUrls: [], visibility: 'public', likeCount: 189, commentCount: 27, liked: false, createdAt: '2026-03-26T20:00:00Z' },
  { id: '7', authorId: 'a7', authorName: '创业者阿明', category: 'to_youth', content: '不要等到万事俱备才开始，因为那一天永远不会来。我26岁创业时什么都不懂，边做边学。最坏的结果不过是重头再来，而你会比任何人都强大。', mediaUrls: [], visibility: 'public', likeCount: 345, commentCount: 67, liked: false, createdAt: '2026-03-25T11:30:00Z' },
  { id: '8', authorId: 'a8', authorName: '匿名用户', category: 'to_self', content: '这段时间真的很累很迷茫，不知道自己到底在坚持什么。但每次想放弃的时候，就会想起最初为什么出发。加油吧，平凡的我。', mediaUrls: [], visibility: 'public', likeCount: 478, commentCount: 95, liked: true, createdAt: '2026-03-25T08:00:00Z' },
  { id: '9', authorId: 'a9', authorName: '赵医生', category: 'to_youth', content: '年轻人，请珍惜你的牙齿、你的眼睛和你的腰。这不是开玩笑。每天刷两次牙、少看手机、坐直身体，这些小事会影响你一辈子。', mediaUrls: [], visibility: 'public', likeCount: 623, commentCount: 142, liked: false, createdAt: '2026-03-24T15:00:00Z' },
  { id: '10', authorId: 'a10', authorName: '前端开发小陈', category: 'inspiration', content: '做了三年前端，最大的感悟是：技术只是工具，真正有价值的是你解决问题的能力和与人沟通的能力。别只低头写代码，多抬头看看这个世界。', mediaUrls: [], visibility: 'public', likeCount: 291, commentCount: 48, liked: false, createdAt: '2026-03-24T10:30:00Z' },
])

const filteredMessages = computed(() => {
  if (activeCategory.value === 'all') return messages.value
  return messages.value.filter(m => m.category === activeCategory.value)
})

const hotMessages = computed(() => {
  return [...messages.value].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5)
})

const totalLikes = computed(() => messages.value.reduce((sum, m) => sum + m.likeCount, 0))

// ============ 交互 ============
const toggleLike = (msg: SparkMessage) => {
  msg.liked = !msg.liked
  msg.likeCount += msg.liked ? 1 : -1
}

// ============ 时间格式化 ============
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

const getAvatarBg = (name: string) => {
  const colors = [
    'linear-gradient(135deg,#8b5cf6,#4f8ef7)',
    'linear-gradient(135deg,#f43f5e,#f97316)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
    'linear-gradient(135deg,#6366f1,#ec4899)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

// ============ 发布寄语（含 Supabase Storage 上传） ============
const showComposer = ref(false)
const composeCategory = ref('to_youth')
const composeContent = ref('')
const composePrivate = ref(false)
const composeFiles = ref<File[]>([])
const composePreviewUrls = ref<string[]>([])
const composeImageInput = ref<HTMLInputElement | null>(null)
const composeVideoInput = ref<HTMLInputElement | null>(null)
const isSubmitting = ref(false)

const composePlaceholder = computed(() => {
  const map: Record<string, string> = {
    to_youth: '作为过来人，你想对年轻人说什么？',
    to_self: '现在的你，想对自己说什么？',
    to_future: '写给未来某天的自己...',
    inspiration: '分享一个触动你的瞬间...',
  }
  return map[composeCategory.value] || '写下你的寄语...'
})

const onComposeMediaSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || []).filter(f => f.size < 50 * 1024 * 1024) // 50MB限制
  composeFiles.value.push(...files)
  composePreviewUrls.value.push(...files.map(f => URL.createObjectURL(f)))
  input.value = ''
}

const removeComposeFile = (i: number) => {
  URL.revokeObjectURL(composePreviewUrls.value[i])
  composeFiles.value.splice(i, 1)
  composePreviewUrls.value.splice(i, 1)
}

// 上传文件到 Supabase Storage
const uploadFiles = async (files: File[]): Promise<string[]> => {
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop()
    const path = `messages/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('spark-messages').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('spark-messages').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

const submitMessage = async () => {
  if (!composeContent.value.trim() || isSubmitting.value) return
  isSubmitting.value = true

  try {
    // 上传媒体文件（如果有）
    let mediaUrls: string[] = []
    if (composeFiles.value.length > 0) {
      mediaUrls = await uploadFiles(composeFiles.value)
    }

    const newMsg: SparkMessage = {
      id: Date.now().toString(),
      authorId: user.value?.id || 'self',
      authorName: user.value?.user_metadata?.nickname || '星火用户',
      category: composeCategory.value,
      content: composeContent.value,
      mediaUrls,
      visibility: composePrivate.value ? 'private' : 'public',
      likeCount: 0,
      commentCount: 0,
      liked: false,
      createdAt: new Date().toISOString(),
    }

    // 写入 Supabase 数据库（如果表存在则持久化）
    if (user.value) {
      await supabase.from('spark_messages').insert({
        author_id: user.value.id,
        author_name: newMsg.authorName,
        category: newMsg.category,
        content: newMsg.content,
        media_urls: newMsg.mediaUrls,
        visibility: newMsg.visibility,
      }).then(() => {})
    }

    messages.value.unshift(newMsg)
    composeContent.value = ''
    composeFiles.value = []
    composePreviewUrls.value = []
    showComposer.value = false
  } catch (err) {
    console.error('发布失败', err)
  } finally {
    isSubmitting.value = false
  }
}

// ============ 详情弹窗 ============
const activeMessage = ref<SparkMessage | null>(null)
const detailComments = ref<Comment[]>([])
const newComment = ref('')

const openDetail = (msg: SparkMessage) => {
  activeMessage.value = msg
  // 模拟加载评论
  detailComments.value = [
    { id: 'c1', authorName: '小李', content: '太有感触了，转发到星火域', createdAt: '2026-03-28T12:00:00Z' },
    { id: 'c2', authorName: '阿华', content: '句句说到心坎里', createdAt: '2026-03-28T13:00:00Z' },
    { id: 'c3', authorName: '星火少年', content: '保存了，给自己看', createdAt: '2026-03-28T14:30:00Z' },
  ]
}

const submitComment = () => {
  if (!newComment.value.trim() || !activeMessage.value) return
  detailComments.value.push({
    id: Date.now().toString(),
    authorName: user.value?.user_metadata?.nickname || '星火用户',
    content: newComment.value,
    createdAt: new Date().toISOString(),
  })
  activeMessage.value.commentCount++
  newComment.value = ''
}

// ============ 私信 ============
const showDM = ref(false)
const dmReceiverName = ref('')
const dmReceiverId = ref('')
const dmContent = ref('')

const startDM = (msg: SparkMessage) => {
  dmReceiverName.value = msg.authorName
  dmReceiverId.value = msg.authorId
  dmContent.value = ''
  showDM.value = true
}

const sendDM = () => {
  if (!dmContent.value.trim()) return
  // 后续对接 Supabase spark_direct_messages 表
  alert(`✅ 私信已发送给 ${dmReceiverName.value}`)
  showDM.value = false
  dmContent.value = ''
}
</script>

<style scoped>
/* ============ 布局 ============ */
.messages-layout { min-height: 100vh; }

/* Hero Banner */
.hero-banner { position: relative; padding: 48px 32px 36px; text-align: center; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.04); }
.hero-glow { position: absolute; border-radius: 50%; filter: blur(120px); }
.g1 { top: -50%; left: 20%; width: 500px; height: 500px; background: rgba(139,92,246,0.08); }
.g2 { bottom: -30%; right: 15%; width: 400px; height: 400px; background: rgba(79,142,247,0.06); }
.hero-content { position: relative; z-index: 2; }
.hero-icon { margin-bottom: 12px; }
.hero-banner h1 { font-size: 36px; font-weight: 800; margin-bottom: 8px; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-desc { color: var(--color-text-secondary); font-size: 15px; line-height: 1.7; max-width: 500px; margin: 0 auto 16px; }
.hero-stats { display: flex; justify-content: center; gap: 24px; font-size: 13px; color: var(--color-text-muted); }

/* 分类 Tab */
.category-bar { display: flex; gap: 6px; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); overflow-x: auto; }
.cat-tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06); background: transparent; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.cat-tab:hover { border-color: rgba(139,92,246,0.2); background: rgba(139,92,246,0.04); }
.cat-tab.active { border-color: rgba(139,92,246,0.4); background: rgba(139,92,246,0.1); color: white; }
.cat-icon { font-size: 16px; }

/* 内容区 */
.messages-body { padding: 0 24px 80px; }
.content-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; margin-top: 20px; }

/* 寄语流 */
.message-feed { min-width: 0; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

/* 寄语卡片 */
.message-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 18px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
.message-card:hover { border-color: rgba(139,92,246,0.2); background: rgba(139,92,246,0.03); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.card-media { margin: -18px -18px 14px; height: 160px; overflow: hidden; position: relative; }
.card-media img, .card-media video, .card-media-el { width: 100%; height: 100%; object-fit: cover; }
.media-count { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 10px; font-size: 12px; color: white; }
.card-category { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.card-category.to_youth { background: rgba(139,92,246,0.12); color: #c4b5fd; }
.card-category.to_self { background: rgba(16,185,129,0.12); color: #6ee7b7; }
.card-category.to_future { background: rgba(79,142,247,0.12); color: #93c5fd; }
.card-category.inspiration { background: rgba(249,115,22,0.12); color: #fdba74; }
.card-content { font-size: 14px; line-height: 1.65; color: var(--color-text-primary); margin-bottom: 14px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.card-author { display: flex; align-items: center; gap: 8px; }
.author-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; flex-shrink: 0; }
.author-avatar.lg { width: 40px; height: 40px; font-size: 16px; }
.author-info { display: flex; flex-direction: column; }
.author-name { font-size: 12px; font-weight: 600; }
.card-time { font-size: 11px; color: var(--color-text-muted); }
.card-actions { display: flex; gap: 8px; }
.a-btn { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: transparent; border: none; color: var(--color-text-muted); font-size: 12px; cursor: pointer; border-radius: 6px; transition: all 0.15s; }
.a-btn:hover { background: rgba(255,255,255,0.04); color: white; }
.a-btn.liked { color: #f43f5e; }
.a-btn.large { padding: 8px 16px; font-size: 14px; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }

/* 空状态 */
.empty { text-align: center; padding: 80px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty h3 { font-size: 20px; margin-bottom: 8px; }
.empty p { color: var(--color-text-muted); margin-bottom: 20px; }
.write-btn { padding: 10px 24px; background: var(--gradient-brand); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; }

/* 侧边栏 */
.sidebar { position: sticky; top: 20px; height: fit-content; }
.compose-fab { width: 100%; padding: 14px; background: var(--gradient-brand); border: none; border-radius: 14px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s; margin-bottom: 16px; }
.compose-fab:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,92,246,0.3); }
.side-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
.side-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }

/* 热门列表 */
.hot-list { display: flex; flex-direction: column; gap: 10px; }
.hot-item { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; padding: 6px; border-radius: 8px; transition: background 0.15s; }
.hot-item:hover { background: rgba(255,255,255,0.03); }
.hot-rank { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: rgba(255,255,255,0.04); color: var(--color-text-muted); flex-shrink: 0; }
.hot-rank.top3 { background: var(--gradient-brand); color: white; }
.hot-body p { font-size: 12px; line-height: 1.4; margin-bottom: 2px; }
.hot-meta { font-size: 10px; color: var(--color-text-muted); }

/* 关于列表 */
.about-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.about-list li { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; }

/* ============ Modal 共用 ============ */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 18px; font-weight: 700; }
.close-btn { background: rgba(255,255,255,0.05); border: none; color: var(--color-text-secondary); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.15s; }
.close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

/* 发布弹窗 */
.composer-modal { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 20px; padding: 28px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.compose-cats { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.cc-btn { padding: 6px 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.cc-btn.active { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.3); color: white; }
.compose-textarea-area { position: relative; margin-bottom: 12px; }
.compose-textarea { width: 100%; padding: 14px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; color: white; font-size: 15px; resize: vertical; outline: none; line-height: 1.6; font-family: inherit; }
.compose-textarea:focus { border-color: rgba(139,92,246,0.3); }
.char-count { font-size: 11px; color: var(--color-text-muted); }
.char-count.warn { color: #f43f5e; }

/* 媒体预览 */
.compose-media-preview { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.preview-item { position: relative; width: 80px; height: 80px; border-radius: 10px; overflow: hidden; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.remove-btn { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; color: white; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* 工具栏 */
.compose-toolbar { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04); }
.compose-tools { display: flex; align-items: center; gap: 12px; }
.tool-btn { padding: 6px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.tool-btn:hover { background: rgba(255,255,255,0.06); color: white; }
.vis-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-muted); cursor: pointer; }
.vis-toggle input { accent-color: var(--color-brand-blue); }
.compose-submit { padding: 10px 24px; background: var(--gradient-brand); border: none; border-radius: 10px; color: white; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.15s; }
.compose-submit:hover:not(:disabled) { transform: translateY(-1px); }
.compose-submit:disabled { opacity: 0.4; cursor: not-allowed; }

/* 详情弹窗 */
.detail-modal { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 20px; padding: 28px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; }
.detail-author { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.detail-author .author-info { flex: 1; }
.detail-author .author-info strong { font-size: 15px; display: block; }
.detail-author .author-info span { font-size: 12px; color: var(--color-text-muted); }
.dm-btn { padding: 8px 16px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: 10px; color: #c4b5fd; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.dm-btn:hover { background: rgba(139,92,246,0.2); }
.detail-content { font-size: 16px; line-height: 1.8; margin-bottom: 20px; white-space: pre-wrap; }
.detail-media { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.detail-img { max-width: 200px; border-radius: 12px; }
.detail-actions { display: flex; gap: 12px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.04); }

/* 评论区 */
.comments-section h4 { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
.comment-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; max-height: 300px; overflow-y: auto; }
.comment-item { display: flex; gap: 10px; }
.c-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
.c-body { flex: 1; }
.c-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 2px; }
.c-meta strong { font-size: 12px; }
.c-meta span { font-size: 11px; color: var(--color-text-muted); }
.c-body p { font-size: 13px; line-height: 1.5; color: var(--color-text-secondary); }
.comment-empty { text-align: center; padding: 24px; color: var(--color-text-muted); font-size: 13px; }
.comment-input-row { display: flex; gap: 8px; }
.comment-input { flex: 1; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: white; font-size: 14px; outline: none; }
.comment-input:focus { border-color: rgba(139,92,246,0.3); }
.comment-send { padding: 10px 20px; background: var(--gradient-brand); border: none; border-radius: 10px; color: white; font-weight: 600; font-size: 13px; cursor: pointer; }
.comment-send:disabled { opacity: 0.3; }

/* 私信弹窗 */
.dm-modal { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; }

/* 动画 */
.modal-enter-active, .modal-leave-active { transition: all 0.25s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .composer-modal, .modal-enter-from .detail-modal, .modal-enter-from .dm-modal { transform: scale(0.95) translateY(10px); }
.card-list-enter-active, .card-list-leave-active { transition: all 0.3s; }
.card-list-enter-from { opacity: 0; transform: translateY(12px); }

/* 响应式 */
@media (max-width: 900px) {
  .content-grid { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .cards-grid { grid-template-columns: 1fr; }
  .hero-banner h1 { font-size: 28px; }
}
</style>
