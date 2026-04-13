<template>
  <!-- 动态卡片 V3 —— 支持视频 + 有效期标签 + 置顶 + LIVE + 文件附件 -->
  <div class="mc-card" :class="{'mc-pinned': moment.is_pinned}">
    <div class="mc-header">
      <span class="mc-avatar">{{ (moment.author?.nickname || '?')[0] }}</span>
      <div class="mc-info">
        <span class="mc-name">{{ moment.author?.nickname || '匿名用户' }}</span>
        <span class="mc-time">{{ formatTimeAgo(moment.created_at) }}</span>
      </div>
      <!-- LIVE标识 -->
      <span v-if="isLive" class="mc-live-tag"><span class="mc-live-dot"></span>LIVE</span>
      <span v-if="moment.is_pinned" class="mc-pin-tag">📌</span>
      <span v-if="moment.expires_at" class="mc-expiry" title="有时效">⏳</span>
      <span v-if="moment.visibility === 'public'" class="mc-vis">🌍</span>
      <span v-else-if="moment.visibility === 'friends'" class="mc-vis">👥</span>
      <span v-else class="mc-vis">🔒</span>
      <div v-if="isMine" class="mc-menu-wrap">
        <button class="mc-menu-btn" @click.stop="showMenu=!showMenu">⋯</button>
        <div v-if="showMenu" class="mc-dropdown">
          <button @click.stop="$emit('toggle-pin', moment.id);showMenu=false">{{ moment.is_pinned ? '取消置顶' : '📌 置顶' }}</button>
          <button class="del" @click.stop="$emit('delete', moment.id);showMenu=false">🗑️ 删除</button>
        </div>
      </div>
    </div>

    <p class="mc-content">{{ moment.content }}</p>

    <!-- 图片 -->
    <div v-if="moment.media_urls?.length" class="mc-media" :class="mediaGridClass">
      <img v-for="(url, i) in moment.media_urls.slice(0, 9)" :key="'img'+i" :src="url" class="mc-img" @click="$emit('preview', url)" />
      <span v-if="moment.media_urls.length > 0" class="mc-media-count">{{ moment.media_urls.length }}/9</span>
    </div>

    <!-- 视频 -->
    <div v-if="moment.video_urls?.length" class="mc-videos">
      <video v-for="(url, i) in moment.video_urls.slice(0, 3)" :key="'vid'+i" :src="url" controls class="mc-video"></video>
    </div>

    <!-- 文件附件 -->
    <div v-if="moment.file_urls?.length" class="mc-files">
      <a v-for="(url, i) in moment.file_urls" :key="'file'+i" :href="url" target="_blank" class="mc-file-item" :download="moment.file_names?.[i] || 'file'">
        <span class="mc-file-icon">📄</span>
        <div class="mc-file-info">
          <span class="mc-file-name">{{ moment.file_names?.[i] || '未知文件' }}</span>
          <span class="mc-file-size">{{ formatFileSize(moment.file_sizes?.[i] || 0) }}</span>
        </div>
        <span class="mc-file-dl">⬇</span>
      </a>
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
import { ref, watch, computed } from 'vue'
import type { Moment, MomentComment } from '../../composables/useCompanion'
import { useCompanion } from '../../composables/useCompanion'

const props = defineProps<{ moment: Moment; isMine?: boolean }>()
defineEmits<{ like: [id: string]; share: [m: Moment]; preview: [url: string]; commented: []; 'toggle-pin': [id: string]; delete: [id: string] }>()

const { fetchMomentComments, commentMoment, formatTimeAgo, isMomentLive } = useCompanion()
const showComments = ref(false)
const localComments = ref<MomentComment[]>([])
const newComment = ref('')
const showMenu = ref(false)

const isLive = computed(() => isMomentLive(props.moment))

const mediaGridClass = computed(() => {
  const count = props.moment.media_urls?.length || 0
  if (count === 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  return 'grid-9'
})

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '未知大小'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

watch(showComments, async (v) => { if (v) localComments.value = await fetchMomentComments(props.moment.id) })

async function handleComment() {
  if (!newComment.value.trim()) return
  await commentMoment(props.moment.id, newComment.value.trim())
  newComment.value = ''
  localComments.value = await fetchMomentComments(props.moment.id)
}
</script>

<style scoped>
.mc-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:8px;transition:all .2s}
.mc-card.mc-pinned{border-color:rgba(139,92,246,.12);background:rgba(139,92,246,.03)}
.mc-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.mc-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(59,130,246,.15));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.mc-info{flex:1}.mc-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}.mc-time{display:block;font-size:10px;color:rgba(255,255,255,.2)}
.mc-vis{font-size:12px}.mc-expiry{font-size:12px;margin-right:2px}
.mc-pin-tag{font-size:11px;margin-right:2px}
/* LIVE标识 */
.mc-live-tag{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.12);color:white;font-size:10px;font-weight:700;letter-spacing:.5px;margin-right:4px}
.mc-live-dot{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:live-pulse 1.5s infinite}
@keyframes live-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
/* 菜单 */
.mc-menu-wrap{position:relative}
.mc-menu-btn{background:none;border:none;color:rgba(255,255,255,.2);font-size:16px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;transition:all .12s}.mc-menu-btn:hover{background:rgba(255,255,255,.04);color:rgba(255,255,255,.4)}
.mc-dropdown{position:absolute;top:100%;right:0;background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:3px;z-index:10;min-width:110px;box-shadow:0 6px 24px rgba(0,0,0,.4)}
.mc-dropdown button{display:block;width:100%;padding:6px 10px;border:none;background:none;color:rgba(255,255,255,.5);font-size:11px;cursor:pointer;border-radius:5px;text-align:left;transition:all .1s}
.mc-dropdown button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.mc-dropdown button.del{color:rgba(239,68,68,.5)}.mc-dropdown button.del:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.7)}
.mc-content{font-size:14px;color:rgba(255,255,255,.6);line-height:1.6;margin:0 0 10px;white-space:pre-wrap;word-break:break-word}

.mc-media{display:grid;gap:4px;margin-bottom:10px;position:relative}
.mc-media.grid-1{grid-template-columns:1fr;max-width:280px}
.mc-media.grid-2{grid-template-columns:1fr 1fr;max-width:320px}
.mc-media.grid-4{grid-template-columns:1fr 1fr;max-width:320px}
.mc-media.grid-9{grid-template-columns:repeat(3,1fr)}
.mc-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;transition:opacity .2s}
.mc-img:hover{opacity:.8}
.mc-media-count{position:absolute;bottom:6px;right:6px;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.5);font-size:10px}
.mc-videos{margin-bottom:10px}
.mc-video{width:100%;border-radius:10px;max-height:300px;background:#000}

/* 文件附件 */
.mc-files{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.mc-file-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);cursor:pointer;transition:all .15s;text-decoration:none;color:inherit}
.mc-file-item:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.08)}
.mc-file-icon{font-size:20px;flex-shrink:0}
.mc-file-info{flex:1;min-width:0;display:flex;flex-direction:column}
.mc-file-name{font-size:12px;color:rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mc-file-size{font-size:10px;color:rgba(255,255,255,.15)}
.mc-file-dl{font-size:14px;color:rgba(139,92,246,.4);flex-shrink:0}

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
