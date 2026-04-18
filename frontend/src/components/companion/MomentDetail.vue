<script setup lang="ts">
/**
 * MomentDetail —— 单条动态详情页（仿微信朋友圈详情）
 *
 * 结构（自上而下）：
 *   - 顶栏：返回 + 分享 + 更多（置顶/编辑/删除）
 *   - 作者区：头像、昵称、时间、位置
 *   - 媒体：图片轮播 / 视频 / 智能封面
 *   - 正文：全文 + 标签
 *   - 转发链：曾经转发过这条的人
 *   - 互动：点赞 + 评论列表（作者/评论者可删）
 *   - 底部输入：写评论
 *
 * Props:
 *   moment    完整 Moment 对象（父组件通过 ID 查找后传入）
 *   myId      当前用户 spark_id（判断权限：能否删评论/转发/编辑）
 * Emits:
 *   close         关闭详情
 *   like          点赞/取消（父层调 toggleLike）
 *   comment       提交评论 { content, imageUrl? }
 *   delete-comment { commentId }
 *   delete        删除本条动态
 *   toggle-pin    置顶/取消置顶
 *   share         打开分享面板
 *   edit          进入编辑模式（暂未实现UI，交给父层）
 */
import { computed, ref, nextTick } from 'vue'
import type { Moment } from '../../composables/useCompanion'
import { formatTimeAgo } from '../../composables/useCompanion'
import { generateCoverStyle } from '../../utils/momentCover'
import MomentCover from './MomentCover.vue'

interface Props {
  moment: Moment
  myId?: string
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'like'): void
  (e: 'comment', payload: { content: string; imageUrl?: string }): void
  (e: 'delete-comment', payload: { commentId: string }): void
  (e: 'delete'): void
  (e: 'toggle-pin'): void
  (e: 'share'): void
  (e: 'edit'): void
}>()

const isAuthor = computed(() => props.myId && props.moment.author_id === props.myId)
const hasMedia = computed(() => (props.moment.media_urls?.length || 0) > 0 || (props.moment.video_urls?.length || 0) > 0)
const coverStyle = computed(() => {
  if (hasMedia.value) return null
  return props.moment.cover_style || generateCoverStyle(props.moment.content, false)
})

const imageList = computed(() => props.moment.media_urls || [])
const videoList = computed(() => props.moment.video_urls || [])
const hasShareChain = computed(() => (props.moment.share_chain?.length || 0) > 0)

/** 点赞状态（父组件传入的 Moment 是 reactive 的） */
const likedByMe = computed(() => {
  if (!props.myId) return false
  return props.moment.likes.includes(props.myId)
})

/** 图片轮播当前索引 */
const activeImageIdx = ref(0)

function showImage(idx: number) {
  activeImageIdx.value = idx
}

/** 评论输入 */
const commentText = ref('')
const commentInputRef = ref<HTMLTextAreaElement | null>(null)

async function focusComment() {
  await nextTick()
  commentInputRef.value?.focus()
}

function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  emit('comment', { content: text })
  commentText.value = ''
}

/** 更多菜单开关 */
const menuOpen = ref(false)
function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }

function onTogglePin() { closeMenu(); emit('toggle-pin') }
function onEdit() { closeMenu(); emit('edit') }
function onDelete() {
  closeMenu()
  if (confirm('确定要删除这条动态吗？删除后无法恢复。')) {
    emit('delete')
  }
}

/** 复制动态链接（内部短链） */
function copyLink() {
  const url = `${location.origin}/app/companion?moment=${props.moment.id}`
  try {
    navigator.clipboard.writeText(url)
    closeMenu()
    // eslint-disable-next-line no-alert
    alert('已复制链接')
  } catch {
    // eslint-disable-next-line no-alert
    prompt('复制链接：', url)
  }
}
</script>

<template>
  <div class="md-root" @click.self="emit('close')">
    <div class="md-panel" role="dialog" aria-modal="true" aria-label="动态详情">
      <!-- 顶栏 -->
      <header class="md-top">
        <button class="md-top-btn" aria-label="关闭" @click="emit('close')">‹ 返回</button>
        <div class="md-top-title">动态详情</div>
        <div class="md-top-actions">
          <button class="md-top-btn" aria-label="分享" @click="emit('share')">转发</button>
          <button class="md-top-btn md-more" aria-haspopup="true" aria-label="更多" @click="toggleMenu">⋯</button>
          <div v-if="menuOpen" class="md-menu" @click.stop>
            <button v-if="isAuthor" class="md-menu-item" @click="onTogglePin">
              {{ moment.is_pinned ? '📌 取消置顶' : '📌 置顶' }}
            </button>
            <button v-if="isAuthor" class="md-menu-item" @click="onEdit">✏️ 编辑</button>
            <button class="md-menu-item" @click="copyLink">🔗 复制链接</button>
            <button v-if="isAuthor" class="md-menu-item md-menu-danger" @click="onDelete">🗑️ 删除</button>
          </div>
        </div>
      </header>

      <!-- 内容区（可滚动） -->
      <main class="md-body">
        <!-- 作者 -->
        <div class="md-author">
          <div class="md-avatar">{{ moment.author_avatar }}</div>
          <div class="md-author-meta">
            <div class="md-name">{{ moment.author_name }}</div>
            <div class="md-sub">
              <span>{{ formatTimeAgo(moment.created_at) }}</span>
              <span v-if="moment.location?.name" class="md-loc">· 📍 {{ moment.location.name }}</span>
              <span v-if="moment.is_pinned" class="md-pin-tag">· 📌 已置顶</span>
            </div>
          </div>
        </div>

        <!-- 媒体 -->
        <section v-if="hasMedia" class="md-media">
          <template v-if="imageList.length === 1">
            <img :src="imageList[0]" :alt="moment.content" class="md-img md-img-single" loading="lazy" />
          </template>
          <template v-else-if="imageList.length > 1">
            <div class="md-carousel">
              <img :src="imageList[activeImageIdx]" :alt="moment.content" class="md-img md-img-carousel" loading="lazy" />
              <div class="md-thumbs">
                <button
                  v-for="(img, i) in imageList"
                  :key="i"
                  class="md-thumb"
                  :class="{ active: i === activeImageIdx }"
                  @click="showImage(i)"
                >
                  <img :src="img" :alt="`图 ${i + 1}`" loading="lazy" />
                </button>
              </div>
            </div>
          </template>
          <template v-if="videoList.length">
            <video
              v-for="(v, i) in videoList"
              :key="i"
              :src="v"
              controls
              class="md-video"
              preload="metadata"
            ></video>
          </template>
        </section>
        <section v-else-if="coverStyle" class="md-cover">
          <MomentCover :style="coverStyle" size="lg" />
        </section>

        <!-- 正文 -->
        <section v-if="moment.content" class="md-text">
          <p>{{ moment.content }}</p>
          <div v-if="moment.tags?.length" class="md-tags">
            <span v-for="t in moment.tags" :key="t" class="md-tag">#{{ t }}</span>
          </div>
        </section>

        <!-- 转发链 -->
        <section v-if="hasShareChain" class="md-chain">
          <div class="md-chain-title">🔁 最近转发</div>
          <ul>
            <li v-for="(s, idx) in moment.share_chain" :key="idx" class="md-chain-item">
              <span class="md-chain-name">{{ s.by_nickname }}</span>
              <span v-if="s.note" class="md-chain-note">"{{ s.note }}"</span>
              <span class="md-chain-time">· {{ formatTimeAgo(s.at) }}</span>
            </li>
          </ul>
        </section>

        <!-- 互动栏 -->
        <section class="md-interact">
          <button
            class="md-ia-btn"
            :class="{ active: likedByMe }"
            @click="emit('like')"
          >
            {{ likedByMe ? '❤️' : '🤍' }} {{ moment.likes.length || 0 }}
          </button>
          <button class="md-ia-btn" @click="focusComment">
            💬 {{ moment.comments.length || 0 }}
          </button>
          <button class="md-ia-btn" @click="emit('share')">
            🔁 {{ moment.shares || 0 }}
          </button>
        </section>

        <!-- 评论列表 -->
        <section class="md-comments">
          <div v-if="moment.likes.length" class="md-likes">
            <span class="md-likes-ico">👍</span>
            <span class="md-likes-names">{{ moment.likes.length }} 人点赞</span>
          </div>

          <div v-if="moment.comments.length === 0" class="md-empty">
            还没有评论，来第一个吧 💬
          </div>

          <ul v-else class="md-comment-list">
            <li v-for="c in moment.comments" :key="c.id" class="md-comment">
              <div class="md-ca">{{ c.author_avatar }}</div>
              <div class="md-cb">
                <div class="md-ch">
                  <span class="md-cn">{{ c.author_name }}</span>
                  <span class="md-ct">{{ formatTimeAgo(c.created_at) }}</span>
                </div>
                <div class="md-cc">{{ c.content }}</div>
                <img v-if="c.image_url" :src="c.image_url" class="md-c-img" alt="评论配图" />
              </div>
              <button
                v-if="myId && (isAuthor || c.author_id === myId)"
                class="md-c-del"
                aria-label="删除评论"
                @click="emit('delete-comment', { commentId: c.id })"
              >×</button>
            </li>
          </ul>
        </section>
      </main>

      <!-- 底部评论输入 -->
      <footer class="md-reply">
        <textarea
          ref="commentInputRef"
          v-model="commentText"
          placeholder="写评论…"
          rows="1"
          class="md-reply-input"
          @keydown.enter.exact.prevent="submitComment"
        ></textarea>
        <button
          class="md-reply-send"
          :disabled="!commentText.trim()"
          @click="submitComment"
        >发送</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.md-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(8, 6, 18, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
}

.md-panel {
  width: 100%;
  max-width: 640px;
  background: rgba(16, 14, 28, 0.96);
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

/* 顶栏 */
.md-top {
  height: 50px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  position: relative;
  flex-shrink: 0;
}
.md-top-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.md-top-btn:hover { background: rgba(255, 255, 255, 0.04); }
.md-top-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}
.md-top-actions { display: flex; align-items: center; gap: 4px; position: relative; }
.md-more { font-size: 18px; padding: 6px 12px; }

.md-menu {
  position: absolute;
  top: 38px;
  right: 0;
  background: rgba(24, 20, 40, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 4px;
  min-width: 160px;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.md-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  border-radius: 6px;
}
.md-menu-item:hover { background: rgba(139, 92, 246, 0.1); }
.md-menu-danger { color: rgba(239, 68, 68, 0.92); }
.md-menu-danger:hover { background: rgba(239, 68, 68, 0.1); }

/* 滚动内容 */
.md-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.2) transparent;
}

/* 作者 */
.md-author { display: flex; gap: 12px; margin-bottom: 14px; }
.md-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(139, 92, 246, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.md-author-meta { display: flex; flex-direction: column; gap: 2px; }
.md-name { font-size: 14px; font-weight: 700; color: rgba(255, 255, 255, 0.92); }
.md-sub { font-size: 11.5px; color: rgba(255, 255, 255, 0.45); display: flex; gap: 6px; flex-wrap: wrap; }
.md-loc { color: rgba(99, 179, 237, 0.75); }
.md-pin-tag { color: rgba(250, 204, 21, 0.9); }

/* 媒体 */
.md-media { margin-bottom: 14px; }
.md-img { width: 100%; border-radius: 12px; display: block; }
.md-img-single { max-height: 80vh; object-fit: contain; background: #000; }
.md-carousel { display: flex; flex-direction: column; gap: 8px; }
.md-img-carousel { max-height: 60vh; object-fit: contain; background: #000; border-radius: 12px; }
.md-thumbs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.md-thumb {
  flex: 0 0 60px; width: 60px; height: 60px; border-radius: 8px;
  overflow: hidden; border: 2px solid transparent;
  background: none; padding: 0; cursor: pointer;
}
.md-thumb.active { border-color: rgba(139, 92, 246, 0.8); }
.md-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.md-video { width: 100%; border-radius: 12px; margin-top: 10px; display: block; background: #000; }

.md-cover { margin-bottom: 14px; }

/* 正文 */
.md-text p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.88);
  white-space: pre-wrap;
  word-break: break-word;
}
.md-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.md-tag {
  padding: 2px 10px;
  font-size: 11px;
  color: rgba(196, 181, 253, 0.9);
  background: rgba(139, 92, 246, 0.1);
  border-radius: 100px;
}

/* 转发链 */
.md-chain {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(139, 92, 246, 0.04);
  border: 1px solid rgba(139, 92, 246, 0.08);
}
.md-chain-title { font-size: 12px; color: rgba(196, 181, 253, 0.75); font-weight: 700; margin-bottom: 4px; }
.md-chain-item { font-size: 12px; color: rgba(255, 255, 255, 0.7); padding: 3px 0; list-style: none; }
.md-chain-name { color: rgba(196, 181, 253, 0.85); font-weight: 600; margin-right: 4px; }
.md-chain-note { color: rgba(255, 255, 255, 0.5); font-style: italic; margin: 0 4px; }
.md-chain-time { color: rgba(255, 255, 255, 0.35); }

/* 互动 */
.md-interact {
  display: flex; gap: 8px;
  padding: 12px 0;
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.md-ia-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.md-ia-btn:hover { background: rgba(139, 92, 246, 0.08); color: rgba(196, 181, 253, 0.95); }
.md-ia-btn.active { background: rgba(239, 68, 68, 0.1); color: rgba(239, 68, 68, 0.95); border-color: rgba(239, 68, 68, 0.3); }

/* 评论 */
.md-comments { margin-top: 14px; }
.md-likes { font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-bottom: 10px; display: flex; gap: 5px; }
.md-empty { padding: 20px 10px; text-align: center; color: rgba(255, 255, 255, 0.25); font-size: 13px; }
.md-comment-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.md-comment { display: flex; gap: 10px; position: relative; }
.md-ca { width: 30px; height: 30px; font-size: 16px; display: flex; align-items: center; justify-content: center; background: rgba(139, 92, 246, 0.1); border-radius: 50%; flex-shrink: 0; }
.md-cb { flex: 1; min-width: 0; }
.md-ch { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.md-cn { font-size: 12px; font-weight: 700; color: rgba(196, 181, 253, 0.9); }
.md-ct { font-size: 10.5px; color: rgba(255, 255, 255, 0.35); }
.md-cc { font-size: 13.5px; color: rgba(255, 255, 255, 0.85); line-height: 1.5; word-break: break-word; }
.md-c-img { margin-top: 6px; max-width: 160px; border-radius: 8px; display: block; }
.md-c-del {
  background: none; border: none; color: rgba(239, 68, 68, 0.4);
  cursor: pointer; font-size: 16px; padding: 4px;
  opacity: 0; transition: opacity 0.15s;
}
.md-comment:hover .md-c-del { opacity: 1; }
.md-c-del:hover { color: rgba(239, 68, 68, 0.9); }

/* 输入 */
.md-reply {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  background: rgba(8, 6, 18, 0.85);
}
.md-reply-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.92);
  resize: none;
  min-height: 36px;
  max-height: 120px;
}
.md-reply-input:focus { outline: none; border-color: rgba(139, 92, 246, 0.4); }
.md-reply-send {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: rgba(139, 92, 246, 0.9);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.md-reply-send:disabled { background: rgba(139, 92, 246, 0.3); cursor: not-allowed; }
.md-reply-send:hover:not(:disabled) { background: rgba(139, 92, 246, 1); }

@media (max-width: 640px) {
  .md-panel { max-width: 100%; border: none; }
  .md-top { height: 44px; }
}
</style>
