<template>
  <!-- 卖家铺子公开页 -->
  <div class="ss-panel">
    <button class="ss-back" @click="$emit('close')">← 返回</button>

    <div v-if="shop" class="ss-content">
      <!-- 卖家头部信息 -->
      <div class="ss-header">
        <div class="ss-header-bg"></div>
        <div class="ss-header-body">
          <div class="ss-avatar-wrap">
            <img v-if="shop.avatar" :src="shop.avatar" class="ss-avatar-img" />
            <span v-else class="ss-avatar-text">{{ (shop.nickname || '?')[0] }}</span>
          </div>
          <div class="ss-user-info">
            <div class="ss-name-row">
              <span class="ss-name">{{ shop.nickname || '卖家' }}</span>
              <span class="ss-level" :class="levelInfo.cls">🏅 {{ levelInfo.name }}</span>
            </div>
            <span v-if="shop.university" class="ss-school">🏫 {{ shop.university }}</span>
            <span v-if="shop.sparkId" class="ss-id">ID: {{ shop.sparkId }}</span>
          </div>
        </div>

        <!-- 数据统计 -->
        <div class="ss-stats">
          <div class="ss-stat">
            <span class="ss-stat-n">{{ shop.avgRating }}</span>
            <span class="ss-stat-l">评分</span>
          </div>
          <div class="ss-stat">
            <span class="ss-stat-n">{{ shop.goodRate }}%</span>
            <span class="ss-stat-l">好评率</span>
          </div>
          <div class="ss-stat">
            <span class="ss-stat-n">{{ shop.completedTransactions }}</span>
            <span class="ss-stat-l">成交</span>
          </div>
          <div class="ss-stat">
            <span class="ss-stat-n">{{ shop.activeProducts }}</span>
            <span class="ss-stat-l">在售</span>
          </div>
        </div>

        <p v-if="shop.bio" class="ss-bio">« {{ shop.bio }} »</p>
      </div>

      <!-- Tab切换：商品/评价 -->
      <div class="ss-tabs">
        <button class="ss-tab" :class="{ active: shopTab === 'products' }" @click="shopTab = 'products'">
          📦 在售商品 ({{ shop.products.length }})
        </button>
        <button class="ss-tab" :class="{ active: shopTab === 'reviews' }" @click="shopTab = 'reviews'">
          ⭐ 买家评价 ({{ shop.reviews.length }})
        </button>
      </div>

      <!-- 在售商品列表 -->
      <div v-if="shopTab === 'products'" class="ss-products">
        <div v-if="shop.products.length === 0" class="ss-empty">暂无在售商品</div>
        <div v-for="p in shop.products" :key="p.id" class="ss-product-item" @click="$emit('viewProduct', p.id)">
          <img v-if="p.images?.length" :src="p.images[0]" class="ss-prod-img" />
          <div v-else class="ss-prod-img ss-prod-no-img">📦</div>
          <div class="ss-prod-info">
            <span class="ss-prod-title">{{ p.title }}</span>
            <div class="ss-prod-row">
              <span class="ss-prod-price">¥{{ formatPrice(p.price) }}</span>
              <span class="ss-prod-status" :class="p.status">{{ statusLabel(p.status) }}</span>
            </div>
            <span class="ss-prod-meta">{{ formatTimeAgo(p.created_at) }} · ❤️ {{ p.want_count || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 评价列表 -->
      <div v-if="shopTab === 'reviews'" class="ss-reviews">
        <!-- 评价标签汇总 -->
        <div v-if="tagSummary.length" class="ss-review-tags">
          <span v-for="ts in tagSummary" :key="ts.tag" class="ss-rtag">{{ ts.tag }} ({{ ts.count }})</span>
        </div>

        <div v-if="shop.reviews.length === 0" class="ss-empty">暂无评价</div>
        <div v-for="r in shop.reviews" :key="r.id" class="ss-review-item">
          <div class="ss-review-header">
            <img v-if="r.reviewer_avatar" :src="r.reviewer_avatar" class="ss-reviewer-avatar" />
            <span v-else class="ss-reviewer-avatar-text">{{ (r.reviewer_nickname || '?')[0] }}</span>
            <div class="ss-review-meta">
              <span class="ss-reviewer-name">{{ r.reviewer_nickname || '匿名' }}</span>
              <span class="ss-review-time">{{ formatTimeAgo(r.created_at) }}</span>
            </div>
            <div class="ss-review-stars">
              <span v-for="i in 5" :key="i" class="ss-star" :class="{ filled: i <= r.rating }">★</span>
            </div>
          </div>
          <!-- 评价标签 -->
          <div v-if="r.tags?.length" class="ss-review-tag-row">
            <span v-for="t in r.tags" :key="t" class="ss-rvtag">{{ t }}</span>
          </div>
          <p v-if="r.content" class="ss-review-text">{{ r.content }}</p>
          <!-- 评价图片 -->
          <div v-if="r.images?.length" class="ss-review-images">
            <img v-for="(img, i) in r.images" :key="i" :src="img" class="ss-review-img" />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="ss-loading">
      <div class="sp-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { SellerShop } from '../../composables/useShop'
import { useShop } from '../../composables/useShop'

const props = defineProps<{ sellerId: string }>()
defineEmits<{
  close: []
  viewProduct: [id: string]
}>()

const { getSellerShop, formatTimeAgo, formatPrice } = useShop()

const shop = ref<SellerShop | null>(null)
const shopTab = ref<'products' | 'reviews'>('products')

// 等级计算
const levelInfo = computed(() => {
  if (!shop.value) return { name: '新手卖家', cls: 'lv-new' }
  const tx = shop.value.completedTransactions
  if (tx >= 100) return { name: '金牌卖家', cls: 'lv-gold' }
  if (tx >= 30) return { name: '高级卖家', cls: 'lv-senior' }
  if (tx >= 10) return { name: '中级卖家', cls: 'lv-mid' }
  if (tx >= 3) return { name: '初级卖家', cls: 'lv-junior' }
  return { name: '新手卖家', cls: 'lv-new' }
})

// 评价标签汇总
const tagSummary = computed(() => {
  if (!shop.value?.reviews.length) return []
  const map = new Map<string, number>()
  shop.value.reviews.forEach(r => {
    (r.tags || []).forEach(t => map.set(t, (map.get(t) || 0) + 1))
  })
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

function statusLabel(s: string) {
  return { active: '在售', sold: '已售' }[s] || s
}

async function loadShop() {
  shop.value = await getSellerShop(props.sellerId)
}

onMounted(loadShop)
watch(() => props.sellerId, loadShop)
</script>

<style scoped>
.ss-panel{max-height:90vh;overflow-y:auto;position:relative;padding-bottom:20px}
.ss-back{position:sticky;top:0;z-index:5;background:rgba(13,11,30,.9);backdrop-filter:blur(8px);border:none;color:rgba(255,255,255,.5);font-size:14px;padding:10px 14px;cursor:pointer;width:100%;text-align:left}
.ss-back:hover{color:rgba(79,142,247,.7)}
.ss-loading{text-align:center;padding:60px 0}

/* 头部 */
.ss-header{position:relative;border-radius:16px;overflow:hidden;margin-bottom:14px}
.ss-header-bg{position:absolute;inset:0;background:linear-gradient(160deg,rgba(79,142,247,.15),rgba(139,92,246,.1),rgba(249,115,22,.06));z-index:0}
.ss-header-body{position:relative;z-index:1;padding:18px;display:flex;align-items:center;gap:14px}
.ss-avatar-wrap{width:56px;height:56px;border-radius:16px;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#4F8EF7,#f97316);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(79,142,247,.2)}
.ss-avatar-img{width:100%;height:100%;object-fit:cover}
.ss-avatar-text{color:white;font-size:24px;font-weight:700}
.ss-user-info{display:flex;flex-direction:column;gap:2px}
.ss-name-row{display:flex;align-items:center;gap:8px}
.ss-name{font-size:18px;font-weight:700;color:rgba(255,255,255,.9)}
.ss-level{padding:2px 8px;border-radius:8px;font-size:9px;font-weight:700}
.ss-level.lv-new{background:rgba(255,255,255,.05);color:rgba(255,255,255,.35)}
.ss-level.lv-junior{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6)}
.ss-level.lv-mid{background:rgba(79,142,247,.08);color:rgba(79,142,247,.7)}
.ss-level.lv-senior{background:rgba(139,92,246,.08);color:rgba(139,92,246,.7)}
.ss-level.lv-gold{background:rgba(249,115,22,.1);color:rgba(249,115,22,.7)}
.ss-school{font-size:11px;color:rgba(255,255,255,.3)}
.ss-id{font-size:10px;color:rgba(79,142,247,.5);font-family:monospace}

.ss-stats{position:relative;z-index:1;display:flex;text-align:center;padding:0 18px 14px}
.ss-stat{flex:1;display:flex;flex-direction:column;gap:1px;border-right:1px solid rgba(255,255,255,.04)}
.ss-stat:last-child{border-right:none}
.ss-stat-n{font-size:18px;font-weight:700;color:rgba(79,142,247,.8)}
.ss-stat-l{font-size:9px;color:rgba(255,255,255,.25)}
.ss-bio{position:relative;z-index:1;font-size:11px;color:rgba(255,255,255,.3);margin:0;padding:0 18px 14px;font-style:italic;line-height:1.5}

/* Tabs */
.ss-tabs{display:flex;gap:4px;margin-bottom:12px}
.ss-tab{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;text-align:center}
.ss-tab.active{background:rgba(79,142,247,.06);border-color:rgba(79,142,247,.12);color:rgba(79,142,247,.7)}

.ss-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.12);padding:30px 0}

/* 商品列表 */
.ss-product-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:6px;cursor:pointer;transition:all .2s}
.ss-product-item:hover{border-color:rgba(79,142,247,.1);background:rgba(79,142,247,.02)}
.ss-prod-img{width:54px;height:54px;border-radius:10px;object-fit:cover;flex-shrink:0}
.ss-prod-no-img{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.02);font-size:20px}
.ss-prod-info{flex:1;min-width:0}
.ss-prod-title{display:block;font-size:13px;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.ss-prod-row{display:flex;align-items:center;gap:8px}
.ss-prod-price{font-size:15px;font-weight:700;color:#f97316}
.ss-prod-status{padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600}
.ss-prod-status.active{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6)}
.ss-prod-status.sold{background:rgba(255,255,255,.05);color:rgba(255,255,255,.25)}
.ss-prod-meta{display:block;font-size:10px;color:rgba(255,255,255,.15);margin-top:2px}

/* 评价 */
.ss-review-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}
.ss-rtag{padding:4px 10px;border-radius:8px;background:rgba(79,142,247,.06);color:rgba(79,142,247,.5);font-size:10px;font-weight:500;border:1px solid rgba(79,142,247,.08)}
.ss-review-item{padding:12px;border-radius:12px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:6px}
.ss-review-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ss-reviewer-avatar{width:28px;height:28px;border-radius:8px;object-fit:cover;flex-shrink:0}
.ss-reviewer-avatar-text{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(79,142,247,.2),rgba(99,102,241,.15));display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;flex-shrink:0}
.ss-review-meta{flex:1;display:flex;flex-direction:column;gap:1px}
.ss-reviewer-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.5)}
.ss-review-time{font-size:9px;color:rgba(255,255,255,.12)}
.ss-review-stars{display:flex;gap:1px}
.ss-star{font-size:12px;color:rgba(255,255,255,.1)}
.ss-star.filled{color:rgba(249,115,22,.7)}
.ss-review-tag-row{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px}
.ss-rvtag{padding:1px 6px;border-radius:4px;background:rgba(34,197,94,.06);color:rgba(34,197,94,.5);font-size:9px}
.ss-review-text{font-size:12px;color:rgba(255,255,255,.45);line-height:1.5;margin:0}
.ss-review-images{display:flex;gap:4px;margin-top:6px}
.ss-review-img{width:60px;height:60px;border-radius:8px;object-fit:cover}
</style>
