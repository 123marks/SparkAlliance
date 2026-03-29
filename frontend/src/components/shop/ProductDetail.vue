<template>
  <!-- 商品详情面板 — 含卖家信息+评论区 -->
  <div class="pd-panel">
    <!-- 返回 -->
    <button class="pd-back" @click="$emit('close')">← 返回</button>

    <!-- 图片轮播 -->
    <div class="pd-gallery">
      <div class="pd-gallery-inner" :style="{ transform: `translateX(-${imgIndex * 100}%)` }">
        <img v-for="(img, i) in product.images" :key="i" :src="img" class="pd-gallery-img" />
      </div>
      <div class="pd-gallery-dots" v-if="product.images.length > 1">
        <span v-for="(_, i) in product.images" :key="i" class="pd-dot" :class="{ active: imgIndex === i }" @click="imgIndex = i"></span>
      </div>
      <button v-if="imgIndex > 0" class="pd-arrow left" @click="imgIndex--">‹</button>
      <button v-if="imgIndex < product.images.length - 1" class="pd-arrow right" @click="imgIndex++">›</button>
      <span class="pd-img-counter">{{ imgIndex + 1 }}/{{ product.images.length }}</span>
    </div>

    <!-- 视频 -->
    <video v-if="product.video_url" :src="product.video_url" controls class="pd-video"></video>

    <!-- 基本信息 -->
    <div class="pd-main">
      <div class="pd-price-row">
        <span class="pd-price">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.original_price" class="pd-original">原价 ¥{{ formatPrice(product.original_price) }}</span>
        <span v-if="product.is_negotiable" class="pd-negotiable">可议价</span>
      </div>
      <h2 class="pd-title">{{ product.title }}</h2>

      <!-- 标签 -->
      <div class="pd-tags" v-if="product.tags?.length">
        <span v-for="tag in product.tags" :key="tag" class="pd-tag">{{ tag }}</span>
      </div>

      <!-- 属性 -->
      <div class="pd-attrs">
        <div class="pd-attr">
          <span class="pd-attr-label">成色</span>
          <span class="pd-attr-value" :style="{ color: conditionInfo.color }">{{ conditionInfo.label }}</span>
        </div>
        <div class="pd-attr">
          <span class="pd-attr-label">交易方式</span>
          <span class="pd-attr-value">{{ product.trade_method }}</span>
        </div>
        <div v-if="product.trade_location" class="pd-attr">
          <span class="pd-attr-label">交易地点</span>
          <span class="pd-attr-value">{{ product.trade_location }}</span>
        </div>
        <div class="pd-attr">
          <span class="pd-attr-label">浏览</span>
          <span class="pd-attr-value">{{ product.view_count }} 次</span>
        </div>
        <div class="pd-attr">
          <span class="pd-attr-label">想要</span>
          <span class="pd-attr-value">{{ product.want_count }} 人</span>
        </div>
        <div class="pd-attr">
          <span class="pd-attr-label">发布</span>
          <span class="pd-attr-value">{{ formatTimeAgo(product.created_at) }}</span>
        </div>
      </div>

      <!-- 描述 -->
      <div class="pd-desc">
        <h4>商品描述</h4>
        <p>{{ product.description }}</p>
      </div>

      <!-- ====== 卖家信息区 ====== -->
      <div class="pd-seller" @click="$emit('viewSeller', product.seller_id)">
        <div class="pd-seller-left">
          <img v-if="product.seller_avatar" :src="product.seller_avatar" class="pd-seller-avatar" />
          <span v-else class="pd-seller-avatar-text">{{ (product.seller_nickname || '?')[0] }}</span>
          <div class="pd-seller-info">
            <span class="pd-seller-name">{{ product.seller_nickname || '卖家' }}</span>
            <span v-if="product.seller_university" class="pd-seller-school">🏫 {{ product.seller_university }}</span>
          </div>
        </div>
        <span class="pd-seller-go">进入铺子 ›</span>
      </div>

      <!-- ====== 评论区 ====== -->
      <div class="pd-comments">
        <h4>💬 留言讨论 <span class="pd-comment-count">({{ comments.length }})</span></h4>
        <!-- 发表评论 -->
        <div class="pd-comment-input">
          <input v-model="commentText" class="pd-ci-input" placeholder="问问卖家..." maxlength="200" @keydown.enter="submitComment" />
          <button class="pd-ci-btn" :disabled="!commentText.trim()" @click="submitComment">发送</button>
        </div>
        <!-- 评论列表 -->
        <div v-if="comments.length === 0" class="pd-comment-empty">暂无评论，来问问卖家吧~</div>
        <div v-for="c in comments" :key="c.id" class="pd-comment-item">
          <div class="pd-comment-avatar">
            <img v-if="c.user_avatar" :src="c.user_avatar" class="pd-ca-img" />
            <span v-else class="pd-ca-text">{{ (c.user_nickname || '?')[0] }}</span>
          </div>
          <div class="pd-comment-body">
            <div class="pd-comment-top">
              <span class="pd-comment-name">{{ c.user_nickname || '匿名' }}</span>
              <span class="pd-comment-time">{{ formatTimeAgo(c.created_at) }}</span>
            </div>
            <p class="pd-comment-text">{{ c.content }}</p>
          </div>
        </div>
      </div>

      <!-- 安全提示 -->
      <div class="pd-safety">
        ⚠️ 贵重物品建议当面验货，交易时注意保留凭证
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="pd-actions">
      <button class="pd-act fav" :class="{ active: product.is_favorited }" @click="$emit('favorite', product.id)">
        {{ product.is_favorited ? '❤️' : '🤍' }} 想要
      </button>
      <button class="pd-act chat" @click="$emit('chat', product)">💬 聊一聊</button>
      <button v-if="product.is_negotiable" class="pd-act offer" @click="$emit('offer', product)">💰 出价</button>
      <button class="pd-act share" @click="$emit('share', product)">🚀</button>
      <button class="pd-act report" @click="$emit('report', product.id)">⚠️</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ShopProduct, ProductComment } from '../../composables/useShop'
import { CONDITION_MAP, useShop } from '../../composables/useShop'

const props = defineProps<{ product: ShopProduct }>()
defineEmits<{
  close: []
  favorite: [id: string]
  chat: [product: ShopProduct]
  share: [product: ShopProduct]
  report: [id: string]
  offer: [product: ShopProduct]
  viewSeller: [sellerId: string]
}>()

const { fetchProductComments, addProductComment } = useShop()

const imgIndex = ref(0)
const conditionInfo = computed(() => CONDITION_MAP[props.product.condition] || { label: '二手', color: '#888' })
const comments = ref<ProductComment[]>([])
const commentText = ref('')

// 加载评论
async function loadComments() {
  comments.value = await fetchProductComments(props.product.id)
}

// 发表评论
async function submitComment() {
  if (!commentText.value.trim()) return
  const ok = await addProductComment(props.product.id, commentText.value.trim())
  if (ok) {
    commentText.value = ''
    await loadComments() // 刷新
  }
}

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

onMounted(loadComments)
// 当商品切换时重新加载评论
watch(() => props.product.id, loadComments)
</script>

<style scoped>
.pd-panel{max-height:90vh;overflow-y:auto;padding-bottom:60px;position:relative}
.pd-back{position:sticky;top:0;z-index:5;background:rgba(13,11,30,.9);backdrop-filter:blur(8px);border:none;color:rgba(255,255,255,.5);font-size:14px;padding:10px 14px;cursor:pointer;width:100%;text-align:left}
.pd-back:hover{color:rgba(79,142,247,.7)}

.pd-gallery{position:relative;overflow:hidden;border-radius:0 0 16px 16px}
.pd-gallery-inner{display:flex;transition:transform .35s ease}
.pd-gallery-img{width:100%;aspect-ratio:1;object-fit:cover;flex-shrink:0}
.pd-gallery-dots{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px}
.pd-dot{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.3);cursor:pointer;transition:all .2s}
.pd-dot.active{width:16px;background:rgba(79,142,247,.8)}
.pd-arrow{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);border:none;color:white;font-size:22px;padding:8px 10px;border-radius:50%;cursor:pointer;backdrop-filter:blur(4px)}
.pd-arrow.left{left:8px}.pd-arrow.right{right:8px}
.pd-img-counter{position:absolute;bottom:10px;right:10px;padding:2px 8px;border-radius:6px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.7);font-size:10px;backdrop-filter:blur(4px)}

.pd-video{width:100%;border-radius:12px;margin:12px 0;max-height:250px;background:#000}

.pd-main{padding:14px}
.pd-price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.pd-price{font-size:24px;font-weight:800;color:#f97316}
.pd-original{font-size:12px;color:rgba(255,255,255,.2);text-decoration:line-through}
.pd-negotiable{padding:2px 8px;border-radius:6px;background:rgba(34,197,94,.08);color:rgba(34,197,94,.6);font-size:10px}
.pd-title{font-size:16px;font-weight:600;color:rgba(255,255,255,.85);margin:0 0 8px;line-height:1.5}
.pd-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.pd-tag{padding:2px 8px;border-radius:6px;background:rgba(79,142,247,.08);color:rgba(79,142,247,.6);font-size:11px}

.pd-attrs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
.pd-attr{display:flex;flex-direction:column;gap:2px}
.pd-attr-label{font-size:10px;color:rgba(255,255,255,.2)}
.pd-attr-value{font-size:12px;color:rgba(255,255,255,.6);font-weight:500}

.pd-desc{margin-bottom:12px}
.pd-desc h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 6px}
.pd-desc p{font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;white-space:pre-wrap;word-break:break-word;margin:0}

/* ====== 卖家信息区 ====== */
.pd-seller{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:12px;cursor:pointer;transition:all .25s}
.pd-seller:hover{border-color:rgba(79,142,247,.12);background:rgba(79,142,247,.03)}
.pd-seller-left{display:flex;align-items:center;gap:10px}
.pd-seller-avatar{width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0}
.pd-seller-avatar-text{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#4F8EF7,#f97316);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;flex-shrink:0}
.pd-seller-info{display:flex;flex-direction:column;gap:2px}
.pd-seller-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.7)}
.pd-seller-school{font-size:10px;color:rgba(255,255,255,.25)}
.pd-seller-go{font-size:11px;color:rgba(79,142,247,.5);white-space:nowrap}

/* ====== 评论区 ====== */
.pd-comments{margin-bottom:12px}
.pd-comments h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}
.pd-comment-count{font-weight:400;color:rgba(255,255,255,.2)}
.pd-comment-input{display:flex;gap:6px;margin-bottom:10px}
.pd-ci-input{flex:1;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none}
.pd-ci-input:focus{border-color:rgba(79,142,247,.2)}
.pd-ci-input::placeholder{color:rgba(255,255,255,.15)}
.pd-ci-btn{padding:8px 14px;border-radius:10px;border:none;background:rgba(79,142,247,.1);color:rgba(79,142,247,.6);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.pd-ci-btn:disabled{opacity:.3;cursor:default}
.pd-ci-btn:hover:not(:disabled){background:rgba(79,142,247,.15)}
.pd-comment-empty{text-align:center;font-size:11px;color:rgba(255,255,255,.12);padding:20px 0}
.pd-comment-item{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.02)}
.pd-comment-item:last-child{border-bottom:none}
.pd-comment-avatar{flex-shrink:0}
.pd-ca-img{width:28px;height:28px;border-radius:8px;object-fit:cover}
.pd-ca-text{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(79,142,247,.2),rgba(99,102,241,.15));display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700}
.pd-comment-body{flex:1;min-width:0}
.pd-comment-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
.pd-comment-name{font-size:11px;font-weight:600;color:rgba(255,255,255,.4)}
.pd-comment-time{font-size:9px;color:rgba(255,255,255,.12)}
.pd-comment-text{font-size:12px;color:rgba(255,255,255,.5);line-height:1.5;margin:0;word-break:break-word}

.pd-safety{padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.1);font-size:11px;color:rgba(245,158,11,.6)}

.pd-actions{position:sticky;bottom:0;display:flex;gap:6px;padding:10px 14px;background:rgba(13,11,30,.95);backdrop-filter:blur(8px);border-top:1px solid rgba(255,255,255,.04)}
.pd-act{flex:1;padding:10px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.pd-act.fav{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}.pd-act.fav.active{background:rgba(239,68,68,.08);color:rgba(239,68,68,.6)}
.pd-act.chat{background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white;flex:1.5}
.pd-act.offer{background:rgba(249,115,22,.1);color:rgba(249,115,22,.7);flex:1.2}
.pd-act.share{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6);flex:0.6}
.pd-act.report{background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);flex:0.4;font-size:14px}
</style>
