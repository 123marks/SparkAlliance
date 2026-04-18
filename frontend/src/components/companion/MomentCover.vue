<script setup lang="ts">
/**
 * MomentCover —— 动态的智能封面（无图时显示）
 *
 * 当用户发布的动态没有图片/视频时，由 utils/momentCover.ts 根据内容智能生成
 * 「大 emoji + 16 色渐变背景」的封面，比纯文字卡片更有视觉吸引力。
 *
 * 使用场景：
 *   - 朋友圈列表缩略图（size='md'）
 *   - 详情页大封面（size='lg'）
 *   - 分享卡片小缩略图（size='sm'）
 *   - 置顶条 PinnedStrip（size='sm'）
 */
import { computed } from 'vue'
import type { CoverStyle } from '../../utils/momentCover'
import { coverStyleToCss } from '../../utils/momentCover'

interface Props {
  style: CoverStyle
  /** 尺寸预设 */
  size?: 'sm' | 'md' | 'lg' | 'full'
  /** 是否显示角落的 "智能封面" 小角标（调试时有用；上线建议 false） */
  showBadge?: boolean
  /** 可选覆盖文字，展示在封面下方 */
  caption?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showBadge: false,
  caption: '',
})

const bgStyle = computed(() => ({
  background: coverStyleToCss(props.style),
}))

const sizeClass = computed(() => `mc-${props.size}`)
</script>

<template>
  <div class="mc" :class="[sizeClass]" :style="bgStyle">
    <span class="mc-emoji" aria-hidden="true">{{ style.emoji }}</span>
    <span v-if="caption" class="mc-caption">{{ caption }}</span>
    <span v-if="showBadge" class="mc-badge">✨ 智能封面</span>
  </div>
</template>

<style scoped>
.mc {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  user-select: none;
}

/* 叠加柔和高光 + 微粒噪点，让渐变不显得太"平" */
.mc::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35) 0%, transparent 55%),
    radial-gradient(circle at 80% 90%, rgba(0, 0, 0, 0.18) 0%, transparent 60%);
  pointer-events: none;
}

.mc-emoji {
  font-size: 72px;
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
  transition: transform 0.25s ease;
  z-index: 1;
}

.mc:hover .mc-emoji {
  transform: scale(1.06) rotate(-3deg);
}

.mc-caption {
  position: absolute;
  bottom: 10px;
  left: 12px;
  right: 12px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  line-height: 1.3;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  z-index: 1;
}

.mc-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  z-index: 2;
}

/* 尺寸预设 */
.mc-sm { width: 64px; height: 64px; border-radius: 12px; }
.mc-sm .mc-emoji { font-size: 32px; }
.mc-sm .mc-caption { display: none; }

.mc-md { width: 100%; aspect-ratio: 1 / 1; }
.mc-md .mc-emoji { font-size: 56px; }

.mc-lg { width: 100%; aspect-ratio: 16 / 9; border-radius: 20px; }
.mc-lg .mc-emoji { font-size: 96px; }

.mc-full { width: 100%; height: 100%; border-radius: 0; }
.mc-full .mc-emoji { font-size: 120px; }
</style>
