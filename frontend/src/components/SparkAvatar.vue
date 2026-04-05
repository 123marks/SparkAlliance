<template>
  <!-- 通用头像组件：avatar_url > emoji > 首字母fallback -->
  <div
    class="spark-avatar"
    :class="[sizeClass, { clickable }]"
    :style="avatarStyle"
    :title="name"
    @click="handleClick"
  >
    <!-- 有图片URL -->
    <img v-if="resolvedUrl" :src="resolvedUrl" :alt="name" class="sa-img" @error="imgError = true" />
    <!-- emoji头像(非单个首字母) -->
    <span v-else-if="isEmoji" class="sa-emoji">{{ avatar }}</span>
    <!-- 首字母fallback -->
    <span v-else class="sa-letter">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  avatar?: string        // emoji字符 或 base64
  avatarUrl?: string     // 完整图片URL
  name?: string          // 昵称(用于生成首字母)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  clickable?: boolean
}>(), {
  avatar: '',
  avatarUrl: '',
  name: '',
  size: 'md',
  clickable: false,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const imgError = ref(false)

// 判断是否是emoji(非ASCII且长度<=2)
const isEmoji = computed(() => {
  if (!props.avatar) return false
  // 如果是base64或URL，不算emoji
  if (props.avatar.startsWith('data:') || props.avatar.startsWith('http')) return false
  // emoji通常是非ASCII字符
  const code = props.avatar.codePointAt(0) || 0
  return code > 127
})

// 最终使用的图片URL(avatar_url优先，或base64 avatar)
const resolvedUrl = computed(() => {
  if (imgError.value) return ''
  if (props.avatarUrl) return props.avatarUrl
  if (props.avatar?.startsWith('data:') || props.avatar?.startsWith('http')) return props.avatar
  return ''
})

// 首字母
const initial = computed(() => {
  const n = props.name?.trim()
  if (!n) return '?'
  // 中文取第一个字
  const first = n[0]
  return first.toUpperCase()
})

// 生成随机但稳定的背景色(基于名字hash)
const bgColor = computed(() => {
  const colors = [
    '#8b5cf6', '#6d28d9', '#7c3aed', '#4f46e5', '#3b82f6',
    '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#f59e0b',
    '#ef4444', '#ec4899', '#f43f5e', '#8b5cf6',
  ]
  const name = props.name || props.avatar || ''
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
})

const avatarStyle = computed(() => {
  if (resolvedUrl.value || isEmoji.value) return {}
  // 渐变色背景 + 白色字体，更清晰可读
  const c = bgColor.value
  return {
    background: `linear-gradient(135deg, ${c}cc, ${c}88)`,
    color: '#ffffff',
    border: `1px solid ${c}40`,
  }
})

const sizeClass = computed(() => `sa-${props.size}`)

function handleClick() {
  if (props.clickable) emit('click')
}
</script>

<style scoped>
.spark-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(139, 92, 246, .06);
  border: 1px solid rgba(255, 255, 255, .04);
  user-select: none;
  transition: transform .15s, box-shadow .15s;
}
.spark-avatar.clickable { cursor: pointer; }
.spark-avatar.clickable:hover { transform: scale(1.06); box-shadow: 0 4px 16px rgba(139, 92, 246, .12); }

/* 尺寸 */
.sa-xs { width: 24px; height: 24px; border-radius: 6px; }
.sa-sm { width: 32px; height: 32px; border-radius: 7px; }
.sa-md { width: 40px; height: 40px; border-radius: 9px; }
.sa-lg { width: 56px; height: 56px; border-radius: 12px; }
.sa-xl { width: 80px; height: 80px; border-radius: 16px; }

.sa-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sa-emoji {
  font-size: inherit;
  line-height: 1;
}
.sa-xs .sa-emoji { font-size: 12px; }
.sa-sm .sa-emoji { font-size: 15px; }
.sa-md .sa-emoji { font-size: 18px; }
.sa-lg .sa-emoji { font-size: 26px; }
.sa-xl .sa-emoji { font-size: 36px; }

.sa-letter {
  font-weight: 700;
  font-family: 'Inter', system-ui, sans-serif;
}
.sa-xs .sa-letter { font-size: 11px; }
.sa-sm .sa-letter { font-size: 13px; }
.sa-md .sa-letter { font-size: 16px; }
.sa-lg .sa-letter { font-size: 22px; }
.sa-xl .sa-letter { font-size: 32px; }
</style>
