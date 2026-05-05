<template>
  <div class="detail-layout">
    <!-- 面包屑 + 操作栏 -->
    <div class="detail-topbar">
      <div class="breadcrumb">
        <button class="bc-link" @click="$emit('back')" aria-label="返回星火墙列表">← 返回</button>
        <span class="bc-sep">/</span>
        <span class="bc-text">星火墙</span>
        <span class="bc-sep">/</span>
        <span class="bc-current">帖子详情</span>
      </div>
      <div class="detail-actions-top">
        <button class="da-btn" @click="$emit('share', post)" aria-label="分享帖子">↗ 分享</button>
        <button class="da-btn" @click="$emit('bookmark', post)" aria-label="收藏帖子">☆ 收藏</button>
        <button class="da-btn" @click="$emit('report', post)" aria-label="举报帖子">⚠ 举报</button>
        <button class="da-btn" aria-label="更多操作">•••</button>
      </div>
    </div>

    <div class="detail-body">
      <!-- 主帖区 + 评论区 -->
      <div class="detail-main">
        <!-- 主帖大卡 -->
        <div class="post-detail-card glass-card">
          <div class="pd-header">
            <div class="pd-avatar" :style="{ background: authorDisplay.avatarBg }">
              <span v-if="authorDisplay.isAnonymous">🔒</span>
              <span v-else>{{ authorDisplay.initial }}</span>
            </div>
            <div class="pd-info">
              <div class="pd-name-row">
                <span class="pd-name">{{ authorDisplay.name }}</span>
                <span v-if="post.school" class="pd-school-badge">{{ post.school }}</span>
                <span class="pd-tag" :class="post.categoryClass">{{ post.categoryLabel }}</span>
              </div>
              <span class="pd-time">{{ post.time }}</span>
            </div>
          </div>

          <div class="pd-content">
            <p>{{ post.content }}</p>
          </div>

          <div class="pd-tags" v-if="post.tags?.length">
            <span class="pd-tag-item" v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
          </div>

          <div class="pd-media" v-if="post.mediaUrls?.length">
            <div class="pd-media-grid" :class="`pd-grid-${Math.min(post.mediaUrls.length, 4)}`">
              <div v-for="(url, i) in post.mediaUrls.slice(0, 4)" :key="i" class="pd-media-cell" @click="$emit('lightbox', url)">
                <img :src="url" class="pd-media-img" loading="lazy" />
                <div class="pd-more-overlay" v-if="i === 3 && post.mediaUrls.length > 4">+{{ post.mediaUrls.length - 4 }}</div>
              </div>
            </div>
          </div>

          <div class="pd-actions">
            <button class="pd-act" :class="{ active: post.liked }" @click="$emit('like', post)">
              ❤ {{ post.likes }}
            </button>
            <button class="pd-act">💬 {{ post.comments }}</button>
            <button class="pd-act">☆ 收藏</button>
            <button class="pd-act">↗ 转发</button>
            <span class="pd-views">👁 {{ viewCount.toLocaleString() }}</span>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="comments-section glass-card">
          <div class="cs-header">
            <h3>全部评论 ({{ commentList.length }})</h3>
            <div class="cs-sort">
              <button class="cs-sort-btn" :class="{ active: commentSort === 'hot' }" @click="commentSort = 'hot'">最热</button>
              <button class="cs-sort-btn" :class="{ active: commentSort === 'new' }" @click="commentSort = 'new'">最新</button>
            </div>
          </div>

          <div v-if="commentLoading" class="cs-loading">
            <div class="skel-line" v-for="i in 3" :key="i"></div>
          </div>
          <div v-else-if="sortedComments.length === 0" class="cs-empty">
            <p>还没有评论，来说点什么吧</p>
          </div>
          <div v-else class="cs-list">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-card">
              <div class="cc-avatar" :style="{ background: getCommentAvatar(comment).avatarBg }">
                <span>{{ getCommentAvatar(comment).initial }}</span>
              </div>
              <div class="cc-body">
                <div class="cc-meta">
                  <span class="cc-name">{{ getCommentAvatar(comment).name }}</span>
                  <span class="cc-time">{{ comment.time }}</span>
                </div>
                <div v-if="comment.replyToName" class="cc-reply-tag">↩ 回复 @{{ comment.replyToName }}</div>
                <p class="cc-text">{{ comment.content }}</p>
                <div class="cc-actions">
                  <button class="cc-act" :class="{ liked: comment.liked }" @click="$emit('comment-like', comment)">
                    ❤ {{ comment.likeCount || '' }}
                  </button>
                  <button class="cc-act" @click="$emit('reply', comment)">回复</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 评论输入 -->
          <div class="cs-input">
            <textarea v-model="newComment" placeholder="写下你的评论..." class="cs-textarea" rows="2" :maxlength="300"></textarea>
            <button class="cs-send" :disabled="!newComment.trim()" @click="$emit('submit-comment', newComment); newComment = ''">发布</button>
          </div>
        </div>
      </div>

      <!-- 右侧信息栏 -->
      <aside class="detail-right">
        <!-- 相关话题 -->
        <div class="dr-section glass-card">
          <div class="dr-head">
            <h4>相关话题</h4>
            <button class="dr-more">查看更多 ></button>
          </div>
          <div class="dr-topics">
            <div v-for="topic in relatedTopics" :key="topic.tag" class="dr-topic-item">
              <span class="dr-topic-tag"># {{ topic.tag }}</span>
              <span class="dr-topic-count">{{ topic.count }} 讨论</span>
            </div>
          </div>
        </div>

        <!-- 相似动态 -->
        <div class="dr-section glass-card">
          <div class="dr-head">
            <h4>相似动态</h4>
            <button class="dr-more">查看更多 ></button>
          </div>
          <div class="dr-similar">
            <div v-for="s in similarPosts" :key="s.id" class="dr-similar-item" @click="$emit('switch-post', s.id)">
              <div class="dr-sim-info">
                <span class="dr-sim-title">{{ s.content.slice(0, 30) }}...</span>
                <span class="dr-sim-meta">{{ s.author }} · ❤ {{ s.likes }} · 💬 {{ s.comments }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- AI 总结 -->
        <div class="dr-section glass-card dr-ai">
          <div class="dr-head">
            <h4>🤖 AI 总结</h4>
            <button class="dr-ai-gen" @click="generateSummary">由星火AI生成</button>
          </div>
          <div v-if="aiSummaryLoading" class="dr-ai-loading">
            <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
          </div>
          <div v-else-if="aiSummary" class="dr-ai-content">
            <p>{{ aiSummary }}</p>
            <div class="dr-ai-chips">
              <span class="dr-chip" v-for="kw in aiKeywords" :key="kw">{{ kw }}</span>
            </div>
          </div>
          <div v-else class="dr-ai-empty">点击「由星火AI生成」获取智能摘要</div>
        </div>

        <!-- 分享与收藏 -->
        <div class="dr-section glass-card">
          <div class="dr-head">
            <h4>分享与收藏</h4>
          </div>
          <div class="dr-share-grid">
            <button class="dr-share-btn" @click="$emit('share', post)">👥 分享给好友</button>
            <button class="dr-share-btn">💬 分享到群聊</button>
            <button class="dr-share-btn" @click="$emit('bookmark', post)">⭐ 添加到收藏夹</button>
            <button class="dr-share-btn">🖼 生成海报分享</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Post {
  id: string
  author: string
  authorId: string
  anonymousSeed?: string
  authorInitial: string
  avatarBg: string
  isAnonymous: boolean
  categoryLabel: string
  categoryClass: string
  time: string
  content: string
  tags: string[]
  mediaUrls: string[]
  likes: number
  comments: number
  liked: boolean
  category: string
  mood?: string | null
  school?: string | null
}

interface Comment {
  id: string
  authorName: string
  authorId: string
  isAnonymous: boolean
  anonymousSeed?: string
  content: string
  time: string
  liked: boolean
  likeCount: number
  replyToName?: string
  isOwn?: boolean
  mediaUrls: string[]
  isHidden?: boolean
}

const props = defineProps<{
  post: Post
  commentList: Comment[]
  commentLoading: boolean
  authorDisplay: { name: string; initial: string; avatarBg: string; isAnonymous: boolean }
  getCommentAvatar: (c: Comment) => { name: string; initial: string; avatarBg: string; isAnonymous: boolean }
  relatedTopics: { tag: string; count: number }[]
  similarPosts: Post[]
}>()

defineEmits<{
  back: []
  like: [post: Post]
  share: [post: Post]
  bookmark: [post: Post]
  report: [post: Post]
  lightbox: [url: string]
  'comment-like': [comment: Comment]
  reply: [comment: Comment]
  'submit-comment': [text: string]
  'switch-post': [id: string]
}>()

const newComment = ref('')
const commentSort = ref<'hot' | 'new'>('hot')
const aiSummary = ref('')
const aiSummaryLoading = ref(false)
const aiKeywords = ref<string[]>([])

const viewCount = computed(() => props.post.likes * 3 + props.post.comments * 5 + 120)

const sortedComments = computed(() => {
  const list = [...props.commentList]
  if (commentSort.value === 'hot') {
    return list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
  }
  return list
})

function generateSummary() {
  aiSummaryLoading.value = true
  setTimeout(() => {
    const content = props.post.content
    aiSummary.value = `本帖讨论了「${props.post.tags?.[0] || '校园话题'}」相关内容。${content.slice(0, 60)}...共收到 ${props.post.comments} 条评论和 ${props.post.likes} 个点赞。`
    aiKeywords.value = props.post.tags?.slice(0, 4) || ['校园', '讨论']
    aiSummaryLoading.value = false
  }, 1500)
}
</script>

<style scoped>
.detail-layout { display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 72px); }

.detail-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0;
}
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.5); }
.bc-link { background: none; border: none; color: rgba(167,139,250,0.8); cursor: pointer; font-size: 13px; }
.bc-link:hover { color: #a78bfa; }
.bc-sep { color: rgba(255,255,255,0.2); }
.bc-current { color: rgba(255,255,255,0.8); }
.detail-actions-top { display: flex; gap: 8px; }
.da-btn {
  background: rgba(15,12,41,0.5); border: 1px solid rgba(139,92,246,0.15);
  color: rgba(255,255,255,0.6); padding: 6px 14px; border-radius: 8px;
  font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.da-btn:hover { border-color: rgba(139,92,246,0.35); color: white; }

.detail-body { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }

.glass-card {
  background: rgba(18,14,45,0.65);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
}

.post-detail-card { padding: 24px; margin-bottom: 16px; }
.pd-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.pd-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: white; flex-shrink: 0;
}
.pd-info { flex: 1; }
.pd-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pd-name { font-size: 16px; font-weight: 600; color: white; }
.pd-school-badge {
  background: rgba(59,130,246,0.15); color: #60a5fa;
  padding: 2px 8px; border-radius: 10px; font-size: 11px;
}
.pd-tag {
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500;
  background: rgba(124,58,237,0.15); color: #a78bfa;
}
.pd-time { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.pd-content { font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.9); margin-bottom: 16px; white-space: pre-wrap; }
.pd-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.pd-tag-item { color: rgba(167,139,250,0.8); font-size: 13px; cursor: pointer; }
.pd-tag-item:hover { color: #a78bfa; }

.pd-media { margin-bottom: 16px; }
.pd-media-grid { display: grid; gap: 8px; border-radius: 12px; overflow: hidden; }
.pd-grid-1 { grid-template-columns: 1fr; }
.pd-grid-2 { grid-template-columns: 1fr 1fr; }
.pd-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.pd-grid-4 { grid-template-columns: 1fr 1fr; }
.pd-media-cell { position: relative; aspect-ratio: 16/10; overflow: hidden; cursor: pointer; border-radius: 8px; }
.pd-media-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.pd-media-cell:hover .pd-media-img { transform: scale(1.03); }
.pd-more-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 24px; font-weight: 700;
}

.pd-actions { display: flex; gap: 24px; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.pd-act {
  background: none; border: none; color: rgba(255,255,255,0.5);
  font-size: 14px; cursor: pointer; transition: color 0.2s;
}
.pd-act:hover { color: white; }
.pd-act.active { color: #ec4899; }
.pd-views { margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.3); }

.comments-section { padding: 20px; }
.cs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.cs-header h3 { font-size: 15px; font-weight: 600; color: white; margin: 0; }
.cs-sort { display: flex; gap: 4px; }
.cs-sort-btn {
  background: none; border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); padding: 4px 12px; border-radius: 16px;
  font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.cs-sort-btn.active { background: rgba(124,58,237,0.2); border-color: rgba(139,92,246,0.3); color: #a78bfa; }
.cs-loading, .cs-empty { padding: 24px; text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; }
.skel-line { height: 14px; background: rgba(255,255,255,0.04); border-radius: 6px; margin-bottom: 10px; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }

.cs-list { display: flex; flex-direction: column; gap: 12px; }
.comment-card { display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.cc-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: white; flex-shrink: 0;
}
.cc-body { flex: 1; min-width: 0; }
.cc-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.cc-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); }
.cc-time { font-size: 11px; color: rgba(255,255,255,0.3); }
.cc-reply-tag { font-size: 11px; color: rgba(167,139,250,0.6); margin-bottom: 4px; }
.cc-text { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.75); margin: 0; }
.cc-actions { display: flex; gap: 12px; margin-top: 6px; }
.cc-act {
  background: none; border: none; color: rgba(255,255,255,0.4);
  font-size: 12px; cursor: pointer; transition: color 0.15s;
}
.cc-act:hover { color: white; }
.cc-act.liked { color: #ec4899; }

.cs-input { display: flex; gap: 8px; align-items: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.cs-textarea {
  flex: 1; background: rgba(20,16,48,0.5); border: 1px solid rgba(139,92,246,0.12);
  border-radius: 10px; padding: 10px 14px; color: rgba(255,255,255,0.9);
  font-size: 13px; resize: none; outline: none; transition: border-color 0.2s;
}
.cs-textarea:focus { border-color: rgba(139,92,246,0.4); }
.cs-textarea::placeholder { color: rgba(255,255,255,0.3); }
.cs-send {
  background: linear-gradient(135deg, #7c3aed, #3b82f6); border: none;
  color: white; padding: 10px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.cs-send:disabled { opacity: 0.4; cursor: not-allowed; }
.cs-send:not(:disabled):hover { box-shadow: 0 0 20px rgba(124,58,237,0.4); transform: translateY(-1px); }

.detail-right { display: flex; flex-direction: column; gap: 14px; }
.dr-section { padding: 16px; }
.dr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.dr-head h4 { font-size: 13px; font-weight: 600; color: white; margin: 0; }
.dr-more { background: none; border: none; color: rgba(167,139,250,0.6); font-size: 11px; cursor: pointer; }
.dr-more:hover { color: #a78bfa; }

.dr-topic-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.dr-topic-tag { font-size: 13px; color: rgba(167,139,250,0.8); }
.dr-topic-count { font-size: 11px; color: rgba(255,255,255,0.3); }

.dr-similar-item { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.15s; }
.dr-similar-item:hover { background: rgba(139,92,246,0.06); border-radius: 6px; }
.dr-sim-title { font-size: 13px; color: rgba(255,255,255,0.8); display: block; }
.dr-sim-meta { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; display: block; }

.dr-ai { border-color: rgba(59,130,246,0.2); }
.dr-ai-gen { background: none; border: 1px solid rgba(59,130,246,0.2); color: #60a5fa; padding: 4px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; }
.dr-ai-gen:hover { background: rgba(59,130,246,0.1); }
.dr-ai-loading { display: flex; gap: 4px; justify-content: center; padding: 16px; }
.typing-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #60a5fa;
  animation: dotBounce 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(2) { animation-delay: 0.16s; }
.typing-dot:nth-child(3) { animation-delay: 0.32s; }
@keyframes dotBounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
.dr-ai-content p { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.75); margin: 0 0 10px; }
.dr-ai-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.dr-chip { background: rgba(59,130,246,0.12); color: #60a5fa; padding: 3px 10px; border-radius: 12px; font-size: 11px; }
.dr-ai-empty { font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px; }

.dr-share-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dr-share-btn {
  background: rgba(15,12,41,0.5); border: 1px solid rgba(139,92,246,0.1);
  color: rgba(255,255,255,0.6); padding: 10px 8px; border-radius: 10px;
  font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: center;
}
.dr-share-btn:hover { border-color: rgba(139,92,246,0.3); color: white; background: rgba(139,92,246,0.08); }

@media (max-width: 1100px) {
  .detail-body { grid-template-columns: 1fr; }
  .detail-right { order: -1; }
}

@media (max-width: 768px) {
  .detail-topbar { flex-direction: column; gap: 8px; align-items: flex-start; }
  .pd-media-grid { grid-template-columns: 1fr 1fr !important; }
  .pd-actions { gap: 12px; flex-wrap: wrap; }
  .cs-input { flex-direction: column; }
  .cs-send { align-self: flex-end; }
  .dr-share-grid { grid-template-columns: 1fr; }
}
</style>
