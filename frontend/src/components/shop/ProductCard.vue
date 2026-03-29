<template>
  <!-- 商品瀑布流卡片 — 含卖家信息 -->
  <div class="pc-card" @click="$emit('click', product)">
    <!-- 商品图片 -->
    <div class="pc-image-wrap">
      <img v-if="product.images?.length" :src="product.images[0]" class="pc-image" loading="lazy" />
      <div v-else class="pc-image pc-no-img">📦</div>
      <!-- 成色标签 -->
      <span class="pc-condition" :style="{ background: conditionInfo.color + '22', color: conditionInfo.color }">
        {{ conditionInfo.label }}
      </span>
      <!-- 折扣 -->
      <span v-if="product.discount && product.discount < 80" class="pc-discount">{{ product.discount }}折</span>
      <!-- 多图标记 -->
      <span v-if="(product.images?.length || 0) > 1" class="pc-img-count">📷 {{ product.images.length }}</span>
    </div>

    <!-- 商品信息 -->
    <div class="pc-info">
      <p class="pc-title">{{ product.title }}</p>
      <div class="pc-price-row">
        <span class="pc-price">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.original_price" class="pc-original">¥{{ formatPrice(product.original_price) }}</span>
        <span v-if="product.is_negotiable" class="pc-negotiable-tag">可议价</span>
      </div>
      <div class="pc-tags" v-if="product.tags?.length">
        <span v-for="tag in product.tags.slice(0, 3)" :key="tag" class="pc-tag">{{ tag }}</span>
      </div>

      <!-- 卖家信息行 -->
      <div class="pc-seller-row">
        <div class="pc-seller-left">
          <img v-if="product.seller_avatar" :src="product.seller_avatar" class="pc-seller-avatar" />
          <span v-else class="pc-seller-avatar-text">{{ (product.seller_nickname || '?')[0] }}</span>
          <span class="pc-seller-name">{{ product.seller_nickname || '卖家' }}</span>
        </div>
        <div class="pc-meta-right">
          <span class="pc-time">{{ formatTimeAgo(product.created_at) }}</span>
          <span class="pc-want">❤️ {{ product.want_count || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShopProduct } from '../../composables/useShop'
import { CONDITION_MAP } from '../../composables/useShop'
import { computed } from 'vue'

const props = defineProps<{ product: ShopProduct }>()
defineEmits<{ click: [product: ShopProduct] }>()

const conditionInfo = computed(() => CONDITION_MAP[props.product.condition] || { label: '二手', color: '#888' })

function formatTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

function formatPrice(p: number) { return p % 1 === 0 ? p.toString() : p.toFixed(2) }
</script>

<style scoped>
.pc-card{border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);overflow:hidden;cursor:pointer;transition:all .25s;break-inside:avoid;margin-bottom:8px}
.pc-card:hover{border-color:rgba(79,142,247,.15);transform:translateY(-2px);box-shadow:0 4px 20px rgba(79,142,247,.08)}
.pc-image-wrap{position:relative;overflow:hidden}
.pc-image{width:100%;aspect-ratio:1;object-fit:cover;display:block;transition:transform .3s}
.pc-card:hover .pc-image{transform:scale(1.03)}
.pc-no-img{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.02);font-size:32px}
.pc-condition{position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;backdrop-filter:blur(4px)}
.pc-discount{position:absolute;top:8px;right:8px;padding:2px 6px;border-radius:6px;background:rgba(239,68,68,.15);color:#ef4444;font-size:10px;font-weight:700}
.pc-img-count{position:absolute;bottom:6px;right:6px;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.7);font-size:9px;backdrop-filter:blur(4px)}
.pc-info{padding:10px 12px 12px}
.pc-title{font-size:13px;font-weight:500;color:rgba(255,255,255,.7);margin:0 0 6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}
.pc-price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
.pc-price{font-size:16px;font-weight:700;color:#f97316}
.pc-original{font-size:11px;color:rgba(255,255,255,.2);text-decoration:line-through}
.pc-negotiable-tag{padding:1px 4px;border-radius:3px;background:rgba(34,197,94,.08);color:rgba(34,197,94,.5);font-size:8px}
.pc-tags{display:flex;gap:3px;margin-bottom:4px;flex-wrap:wrap}
.pc-tag{padding:1px 5px;border-radius:4px;background:rgba(79,142,247,.08);color:rgba(79,142,247,.6);font-size:9px}

/* 卖家信息行 */
.pc-seller-row{display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.03)}
.pc-seller-left{display:flex;align-items:center;gap:5px;min-width:0}
.pc-seller-avatar{width:18px;height:18px;border-radius:6px;object-fit:cover;flex-shrink:0}
.pc-seller-avatar-text{width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,rgba(79,142,247,.3),rgba(99,102,241,.2));display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;flex-shrink:0}
.pc-seller-name{font-size:10px;color:rgba(255,255,255,.25);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-meta-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.pc-time{font-size:10px;color:rgba(255,255,255,.15)}
.pc-want{font-size:10px;color:rgba(255,255,255,.2)}
</style>
