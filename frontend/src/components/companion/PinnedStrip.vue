<script setup lang="ts">
/**
 * PinnedStrip —— 朋友圈置顶动态横向滚动条
 *
 * 显示所有 is_pinned=true 的动态，按发布时间倒序，每张卡片显示：
 *   - 封面（图片 / 视频第一帧 / 智能封面）
 *   - 作者头像 + 昵称
 *   - 内容摘要（2 行）
 *
 * 交互：
 *   - 点击卡片 → emit('open', momentId) 打开详情
 *   - 右上角 "×" → emit('unpin', momentId) 取消置顶（仅作者可见）
 *   - 左右滑动 / 鼠标滚轮横向滚动
 */
import { computed } from 'vue'
import type { Moment } from '../../composables/useCompanion'
import MomentCover from './MomentCover.vue'
import { generateCoverStyle } from '../../utils/momentCover'

interface Props {
  moments: Moment[]
  /** 当前登录用户的 spark_id，用于决定是否显示"取消置顶"按钮 */
  myId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'open', momentId: string): void
  (e: 'unpin', momentId: string): void
}>()

/** 为每条动态计算一个小封面：有图用第一张图，无图用智能封面 */
const cards = computed(() => {
  return props.moments.map((m) => {
    const hasMedia = (m.media_urls?.length || 0) > 0 || (m.video_urls?.length || 0) > 0
    const coverImg = m.media_urls?.[0] || ''
    const coverStyle = hasMedia ? null : (m.cover_style || generateCoverStyle(m.content, false))
    const snippet = (m.content || '').replace(/[\r\n]+/g, ' ').slice(0, 40)
    return {
      id: m.id,
      author_name: m.author_name,
      author_avatar: m.author_avatar,
      author_id: m.author_id,
      hasMedia,
      coverImg,
      coverStyle,
      snippet,
      createdAt: m.created_at,
    }
  })
})

function onClickCard(id: string) {
  emit('open', id)
}

function onUnpin(e: MouseEvent, id: string) {
  e.stopPropagation()
  emit('unpin', id)
}
</script>

<template>
  <div v-if="cards.length" class="pinned-strip">
    <div class="ps-header">
      <span class="ps-icon">📌</span>
      <span class="ps-title">置顶动态</span>
      <span class="ps-count">{{ cards.length }}</span>
    </div>

    <div class="ps-scroll" role="list">
      <button
        v-for="card in cards"
        :key="card.id"
        class="ps-card"
        role="listitem"
        :aria-label="`打开动态 ${card.snippet}`"
        @click="onClickCard(card.id)"
      >
        <div class="ps-cover">
          <img
            v-if="card.hasMedia && card.coverImg"
            :src="card.coverImg"
            :alt="card.snippet"
            class="ps-cover-img"
            loading="lazy"
          />
          <MomentCover
            v-else-if="card.coverStyle"
            :style="card.coverStyle"
            size="full"
          />
          <span
            v-if="myId && card.author_id === myId"
            class="ps-unpin"
            role="button"
            aria-label="取消置顶"
            @click="onUnpin($event, card.id)"
          >×</span>
        </div>

        <div class="ps-body">
          <div class="ps-author">
            <span class="ps-avatar">{{ card.author_avatar }}</span>
            <span class="ps-name">{{ card.author_name }}</span>
          </div>
          <div class="ps-snippet">{{ card.snippet || '（无文字）' }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pinned-strip {
  padding: 12px 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.04), transparent);
}

.ps-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 8px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  font-weight: 600;
}

.ps-icon { font-size: 14px; }
.ps-count {
  margin-left: 4px;
  padding: 1px 8px;
  border-radius: 100px;
  background: rgba(139, 92, 246, 0.16);
  color: rgba(196, 181, 253, 0.95);
  font-size: 10.5px;
  font-weight: 700;
}

.ps-scroll {
  display: flex;
  gap: 10px;
  padding: 0 12px 6px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.25) transparent;
}

.ps-scroll::-webkit-scrollbar { height: 4px; }
.ps-scroll::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.25); border-radius: 4px; }

.ps-card {
  flex: 0 0 170px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  scroll-snap-align: start;
}

.ps-card:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.35);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.16);
}

.ps-card:focus-visible {
  outline: 2px solid rgba(139, 92, 246, 0.6);
  outline-offset: 2px;
}

.ps-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.ps-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ps-unpin {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: background 0.15s;
}
.ps-unpin:hover { background: rgba(239, 68, 68, 0.75); }

.ps-body {
  padding: 6px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.ps-author {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ps-avatar {
  font-size: 16px;
  line-height: 1;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.12);
  border-radius: 50%;
}
.ps-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.ps-snippet {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.75);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
