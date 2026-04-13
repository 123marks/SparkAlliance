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
  if (props.avatar.startsWith('data:') || props.avatar.startsWith('http')) return false
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

// 拼音首字母映射表（模块级常量，避免每次调用重建）
const PINYIN_MAP: Record<string, string> = {
  '阿':'A','安':'A','爱':'A',
  '白':'B','包':'B','北':'B','本':'B','边':'B','不':'B','步':'B',
  '曹':'C','陈':'C','成':'C','程':'C','崔':'C','春':'C','创':'C','从':'C',
  '大':'D','丁':'D','段':'D','邓':'D','东':'D','董':'D','杜':'D','道':'D',
  '二':'E',
  '方':'F','范':'F','冯':'F','付':'F','风':'F','飞':'F','福':'F',
  '高':'G','葛':'G','郭':'G','顾':'G','关':'G','光':'G','国':'G','龚':'G',
  '何':'H','韩':'H','胡':'H','黄':'H','侯':'H','花':'H','华':'H','洪':'H','红':'H',
  '江':'J','蒋':'J','金':'J','贾':'J','姜':'J','季':'J','景':'J','静':'J',
  '孔':'K','柯':'K','康':'K',
  '李':'L','刘':'L','梁':'L','林':'L','吕':'L','罗':'L','陆':'L','龙':'L','蓝':'L','雷':'L',
  '马':'M','孟':'M','毛':'M','明':'M','莫':'M','穆':'M','梦':'M',
  '牛':'N','宁':'N','聂':'N','南':'N',
  '欧':'O',
  '潘':'P','彭':'P','庞':'P','裴':'P',
  '秦':'Q','钱':'Q','乔':'Q','邱':'Q','齐':'Q','青':'Q','清':'Q',
  '任':'R','容':'R','荣':'R','阮':'R',
  '沈':'S','宋':'S','苏':'S','孙':'S','石':'S','施':'S','司':'S','史':'S','邵':'S','尚':'S','星':'X','思':'S',
  '唐':'T','田':'T','陶':'T','谭':'T','天':'T',
  '万':'W','王':'W','魏':'W','文':'W','吴':'W','武':'W','韦':'W','温':'W',
  '夏':'X','徐':'X','许':'X','谢':'X','萧':'X','肖':'X','熊':'X','薛':'X','修':'X','学':'X','小':'X','新':'X',
  '杨':'Y','叶':'Y','于':'Y','余':'Y','袁':'Y','姚':'Y','严':'Y','颜':'Y','阎':'Y','易':'Y','尹':'Y','游':'Y',
  '张':'Z','赵':'Z','周':'Z','朱':'Z','郑':'Z','曾':'Z','钟':'Z','庄':'Z','邹':'Z','左':'Z','中':'Z',
}

// 首字母(支持中文拼音)
const initial = computed(() => {
  const n = props.name?.trim()
  if (!n) return '?'
  const first = n[0]
  const code = first.charCodeAt(0)
  if (code < 128) return first.toUpperCase()
  if (code >= 0x4e00 && code <= 0x9fff) return PINYIN_MAP[first] || first.toUpperCase()
  return first.toUpperCase()
})

// 背景色缓存（模块级，同一用户多处渲染不重复计算）
const BG_COLORS = [
  '#8b5cf6', '#6d28d9', '#7c3aed', '#4f46e5', '#3b82f6',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#f43f5e', '#8b5cf6',
]
const _bgColorCache = new Map<string, string>()

function hashColor(key: string): string {
  const cached = _bgColorCache.get(key)
  if (cached) return cached
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash)
  const color = BG_COLORS[Math.abs(hash) % BG_COLORS.length]
  _bgColorCache.set(key, color)
  return color
}

const bgColor = computed(() => hashColor(props.name || props.avatar || ''))

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
