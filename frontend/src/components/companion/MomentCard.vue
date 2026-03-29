<template>
  <!-- 动态卡片 V2 —— 支持视频 + 有效期标签 -->
  <div class="mc-card">
    <div class="mc-header">
      <span class="mc-avatar">{{ (moment.author?.nickname || '?')[0] }}</span>
      <div class="mc-info">
        <span class="mc-name">{{ moment.author?.nickname || '匿名用户' }}</span>
        <span class="mc-time">{{ formatTimeAgo(moment.created_at) }}</span>
      </div>
      <span v-if="moment.expires_at" class="mc-expiry" title="有时效">⏳</span>
      <span v-if="moment.visibility === 'public'" class="mc-vis">🌍</span>
      <span v-else-if="moment.visibility === 'friends'" class="mc-vis">👥</span>
      <span v-else class="mc-vis">🔒</span>
    </div>

    <p class="mc-content">{{ moment.content }}</p>

    <!-- 图片 -->
    <div v-if="moment.media_urls?.length" class="mc-media">
      <img v-for="(url, i) in moment.media_urls.slice(0, 9)" :key="'img'+i" :src="url" class="mc-img" @click="$emit('preview', url)" />
    </div>

    <!-- 视频 -->
    <div v-if="moment.video_urls?.length" class="mc-videos">
      <video v-for="(url, i) in moment.video_urls.slice(0, 3)" :key="'vid'+i" :src="url" controls class="mc-video"></video>
    </div>

    <!-- 互动栏 -->
    <div class="mc-actions">
      <button class="mc-act" :class="{ liked: moment.is_liked }" @click="$emit('like', moment.id)">
        {{ moment.is_liked ? '❤️' : '🤍' }} {{ moment.like_count || '' }}
      </button>
      <button class="mc-act" @click="showComments = !showComments">💬 {{ moment.comment_count || '' }}</button>
      <button class="mc-act" @click="$emit('share', moment)">🚀 转发</button>
    </div>

    <!-- 评论区 -->
    <div v-if="showComments" class="mc-comments">
      <div v-for="c in localComments" :key="c.id" class="mc-comment">
        <span class="mc-comment-name">{{ (c.author?.nickname) || '匿名' }}</span>
        <span class="mc-comment-text">{{ c.content }}</span>
      </div>
      <div class="mc-comment-input">
        <input v-model="newComment" placeholder="说点什么..." maxlength="200" @keydown.enter="handleComment" />
        <button :disabled="!newComment.trim()" @click="handleComment">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Moment, MomentComment } from '../../composables/useCompanion'
import { useCompanion } from '../../composables/useCompanion'

const props = defineProps<{ moment: Moment }>()
defineEmits<{ like: [id: string]; share: [m: Moment]; preview: [url: string]; commented: [] }>()

const { fetchMomentComments, commentMoment, formatTimeAgo } = useCompanion()
const showComments = ref(false)
const localComments = ref<MomentComment[]>([])
const newComment = ref('')

watch(showComments, async (v) => { if (v) localComments.value = await fetchMomentComments(props.moment.id) })

async function handleComment() {
  if (!newComment.value.trim()) return
  await commentMoment(props.moment.id, newComment.value.trim())
  newComment.value = ''
  localComments.value = await fetchMomentComments(props.moment.id)
}
</script>

<style scoped>
.mc-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:8px}
.mc-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.mc-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(59,130,246,.15));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.mc-info{flex:1}.mc-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}.mc-time{display:block;font-size:10px;color:rgba(255,255,255,.2)}
.mc-vis{font-size:12px}.mc-expiry{font-size:12px;margin-right:2px}
.mc-content{font-size:14px;color:rgba(255,255,255,.6);line-height:1.6;margin:0 0 10px;white-space:pre-wrap;word-break:break-word}

.mc-media{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px}
.mc-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;transition:opacity .2s}
.mc-img:hover{opacity:.8}
.mc-videos{margin-bottom:10px}
.mc-video{width:100%;border-radius:10px;max-height:300px;background:#000}

.mc-actions{display:flex;gap:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,.03)}
.mc-act{flex:1;padding:6px;border-radius:8px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;transition:all .2s}
.mc-act:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}.mc-act.liked{color:rgba(239,68,68,.6)}

.mc-comments{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.03)}
.mc-comment{margin-bottom:6px}.mc-comment-name{font-size:11px;font-weight:600;color:rgba(139,92,246,.5);margin-right:6px}.mc-comment-text{font-size:12px;color:rgba(255,255,255,.4)}
.mc-comment-input{display:flex;gap:6px;margin-top:8px}
.mc-comment-input input{flex:1;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none}
.mc-comment-input input:focus{border-color:rgba(139,92,246,.2)}.mc-comment-input input::placeholder{color:rgba(255,255,255,.2)}
.mc-comment-input button{padding:6px 12px;border-radius:8px;border:none;background:rgba(139,92,246,.12);color:rgba(139,92,246,.7);font-size:11px;font-weight:600;cursor:pointer}
.mc-comment-input button:disabled{opacity:.3}
</style>
