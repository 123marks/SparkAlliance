<template>
  <!-- 文章详情弹窗 -->
  <Transition name="fade">
    <div v-if="article" class="ad-overlay" @click.self="$emit('close')">
      <div class="ad-panel">
        <!-- 头部 -->
        <div class="ad-header">
          <button class="ad-back" @click="$emit('close')">← 返回</button>
          <div class="ad-actions">
            <button class="ad-act" :class="{ active: article.is_bookmarked }" @click="$emit('bookmark')">
              {{ article.is_bookmarked ? '⭐' : '☆' }} 收藏
            </button>
            <button class="ad-act" @click="$emit('like')">❤️ {{ article.like_count }}</button>
            <button class="ad-act share" @click="$emit('shareWall')">🚀 转发墙</button>
            <button class="ad-act goal" @click="$emit('createGoal')">🎯 生成目标</button>
          </div>
        </div>

        <!-- 封面 -->
        <div v-if="article.cover_url" class="ad-cover" :style="{ backgroundImage: `url(${article.cover_url})` }"></div>

        <!-- 分类+标签 -->
        <div class="ad-meta">
          <span class="ad-cat">{{ catLabel }}</span>
          <span v-for="tag in article.tags" :key="tag" class="ad-tag">{{ tag }}</span>
        </div>

        <!-- 标题 -->
        <h1 class="ad-title">{{ article.title }}</h1>

        <!-- 作者信息 -->
        <div class="ad-author" v-if="article.author">
          <div class="ad-author-avatar">{{ (article.author as any).display_name?.[0] || '?' }}</div>
          <div class="ad-author-info">
            <span class="ad-author-name">{{ (article.author as any).display_name }}</span>
            <span class="ad-author-meta">{{ (article.author as any).university }} · {{ (article.author as any).major }}</span>
          </div>
          <span class="ad-time">{{ formatTime(article.created_at) }}</span>
        </div>

        <!-- 正文 -->
        <div class="ad-content" v-html="renderContent(article.content)"></div>

        <!-- 附件图片 -->
        <div v-if="article.media_urls?.length" class="ad-media">
          <img v-for="(url, i) in article.media_urls" :key="i" :src="url" class="ad-media-img" />
        </div>

        <!-- 统计 -->
        <div class="ad-stats">
          <span>👁 {{ article.view_count }} 阅读</span>
          <span>❤️ {{ article.like_count }} 赞</span>
          <span>💬 {{ comments.length }} 评论</span>
          <span>⭐ {{ article.bookmark_count }} 收藏</span>
        </div>

        <!-- 评论区 -->
        <div class="ad-comments">
          <h3 class="ad-section-title">💬 评论 ({{ comments.length }})</h3>
          <div class="ad-comment-input">
            <input v-model="newComment" placeholder="说点什么..." maxlength="500" @keydown.enter="submitComment" />
            <button :disabled="!newComment.trim()" @click="submitComment">发送</button>
          </div>
          <div v-for="c in comments" :key="c.id" class="ad-comment">
            <div class="ad-comment-head">
              <span class="ad-comment-user">{{ c.user_name || '匿名用户' }}</span>
              <span class="ad-comment-time">{{ formatTime(c.created_at) }}</span>
            </div>
            <p class="ad-comment-text">{{ c.content }}</p>
          </div>
          <p v-if="comments.length === 0" class="ad-comment-empty">暂无评论，来抢沙发吧 ✨</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MentorArticle, MentorComment } from '../../composables/useMentor'
import { useMentor, ARTICLE_CATEGORIES } from '../../composables/useMentor'

const props = defineProps<{
  article: MentorArticle | null
  comments: MentorComment[]
}>()
const emit = defineEmits<{
  close: []
  like: []
  bookmark: []
  shareWall: []
  createGoal: []
  comment: [content: string]
}>()

const { formatTimeAgo } = useMentor()
const newComment = ref('')

const catLabel = computed(() => {
  if (!props.article) return ''
  return ARTICLE_CATEGORIES.find(c => c.value === props.article!.category)?.label || ''
})

function formatTime(dateStr: string): string {
  return formatTimeAgo(dateStr)
}

// 简单 Markdown 渲染（标题/加粗/列表/换行）
function renderContent(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>')
}

function submitComment() {
  if (!newComment.value.trim()) return
  emit('comment', newComment.value.trim())
  newComment.value = ''
}
</script>

<style scoped>
.ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:200;display:flex;justify-content:center;overflow-y:auto;padding:20px}
.ad-panel{width:100%;max-width:640px;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.1);border-radius:20px;padding:0;margin:auto;max-height:90vh;overflow-y:auto}
.ad-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04);position:sticky;top:0;background:rgba(13,11,30,.95);backdrop-filter:blur(8px);z-index:5;border-radius:20px 20px 0 0}
.ad-back{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:13px}
.ad-actions{display:flex;gap:6px}
.ad-act{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:4px 10px;font-size:11px;color:rgba(255,255,255,.4);cursor:pointer;transition:all .2s}
.ad-act:hover{background:rgba(139,92,246,.08);color:rgba(139,92,246,.7)}
.ad-act.active{color:#f59e0b;border-color:rgba(245,158,11,.2)}
.ad-act.share{color:rgba(34,197,94,.5)}
.ad-act.share:hover{color:rgba(34,197,94,.8)}
.ad-act.goal{color:rgba(59,130,246,.5)}
.ad-act.goal:hover{color:rgba(59,130,246,.8)}

.ad-cover{height:200px;background-size:cover;background-position:center}
.ad-meta{display:flex;gap:6px;padding:16px 18px 0;flex-wrap:wrap}
.ad-cat{font-size:11px;font-weight:600;color:rgba(139,92,246,.7)}
.ad-tag{font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.3)}
.ad-title{font-size:20px;font-weight:700;color:rgba(255,255,255,.88);margin:10px 18px 12px;line-height:1.4}

.ad-author{display:flex;align-items:center;gap:10px;padding:0 18px 16px;border-bottom:1px solid rgba(255,255,255,.04)}
.ad-author-avatar{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(59,130,246,.15));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);font-size:14px;font-weight:600;flex-shrink:0}
.ad-author-info{flex:1}
.ad-author-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}
.ad-author-meta{display:block;font-size:10px;color:rgba(255,255,255,.25)}
.ad-time{font-size:10px;color:rgba(255,255,255,.2)}

.ad-content{padding:16px 18px;font-size:14px;color:rgba(255,255,255,.6);line-height:1.8}
.ad-content :deep(h1),.ad-content :deep(h2),.ad-content :deep(h3){color:rgba(255,255,255,.75);margin:16px 0 8px}
.ad-content :deep(strong){color:rgba(255,255,255,.8)}
.ad-content :deep(li){margin-left:16px}

.ad-media{display:flex;gap:8px;padding:0 18px 16px;overflow-x:auto}
.ad-media-img{border-radius:10px;max-height:200px;object-fit:cover}

.ad-stats{display:flex;gap:16px;padding:12px 18px;border-top:1px solid rgba(255,255,255,.04);font-size:11px;color:rgba(255,255,255,.25)}

.ad-comments{padding:16px 18px 24px}
.ad-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.6);margin:0 0 12px}
.ad-comment-input{display:flex;gap:8px;margin-bottom:16px}
.ad-comment-input input{flex:1;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.ad-comment-input input:focus{border-color:rgba(139,92,246,.2)}
.ad-comment-input button{padding:8px 16px;border-radius:10px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer}
.ad-comment-input button:disabled{opacity:.3}

.ad-comment{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.ad-comment-head{display:flex;justify-content:space-between;margin-bottom:4px}
.ad-comment-user{font-size:12px;font-weight:600;color:rgba(255,255,255,.5)}
.ad-comment-time{font-size:10px;color:rgba(255,255,255,.2)}
.ad-comment-text{font-size:13px;color:rgba(255,255,255,.45);margin:0;line-height:1.5}
.ad-comment-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:20px}

.fade-enter-active,.fade-leave-active{transition:opacity .25s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
