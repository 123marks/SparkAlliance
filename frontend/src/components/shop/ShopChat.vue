<template>
  <!-- 买卖聊天界面 — 含议价+发起交易 -->
  <div class="sc-wrap">
    <!-- 会话列表 -->
    <div v-if="!activeConv" class="sc-list">
      <h3 class="sc-title">💬 消息</h3>
      <div v-if="convList.length === 0" class="sc-empty">暂无聊天消息</div>
      <div v-for="conv in convList" :key="conv.id" class="sc-conv-item" @click="openConversation(conv)">
        <span class="sc-conv-avatar">{{ conv.other_name?.[0] || '?' }}</span>
        <div class="sc-conv-info">
          <div class="sc-conv-top">
            <span class="sc-conv-name">{{ conv.other_name || '用户' }}</span>
            <span class="sc-conv-time">{{ formatTime(conv.last_message_at) }}</span>
          </div>
          <p class="sc-conv-last">{{ conv.last_message || '开始聊天吧...' }}</p>
        </div>
        <span v-if="conv.unread > 0" class="sc-conv-badge">{{ conv.unread }}</span>
      </div>
    </div>

    <!-- 聊天面板 -->
    <div v-else class="sc-chat">
      <div class="sc-chat-header">
        <button class="sc-back" @click="activeConv = null">←</button>
        <span class="sc-chat-name">{{ activeConv.other_name }}</span>
        <!-- 发起交易按钮（仅卖家可用） -->
        <button v-if="isSeller" class="sc-deal-btn" @click="handleCreateDeal">📋 发起交易</button>
      </div>

      <!-- 关联商品 -->
      <div v-if="activeConv.productInfo" class="sc-product-card" @click="$emit('viewProduct', activeConv.productInfo.id)">
        <img v-if="activeConv.productInfo.images?.length" :src="activeConv.productInfo.images[0]" class="sc-product-img" />
        <div class="sc-product-info">
          <span class="sc-product-title">{{ activeConv.productInfo.title }}</span>
          <span class="sc-product-price">¥{{ activeConv.productInfo.price }}</span>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="sc-messages" ref="messagesRef">
        <div v-for="msg in messages" :key="msg.id" class="sc-msg" :class="{ mine: msg.sender_id === userId }">
          <!-- 普通文本/图片 -->
          <div v-if="msg.message_type === 'text' || msg.message_type === 'quick_reply'" class="sc-msg-bubble">
            <p>{{ msg.content }}</p>
          </div>
          <div v-else-if="msg.message_type === 'image'" class="sc-msg-bubble">
            <img :src="msg.content" class="sc-msg-image" />
          </div>
          <div v-else-if="msg.message_type === 'system'" class="sc-msg-system">{{ msg.content }}</div>
          <!-- 议价消息（特殊卡片） -->
          <div v-else-if="msg.message_type === 'offer'" class="sc-offer-card">
            <div class="sc-offer-head">💰 出价</div>
            <div class="sc-offer-price">¥{{ msg.content }}</div>
            <div v-if="!isSeller" class="sc-offer-hint">等待卖家回应...</div>
            <div v-else class="sc-offer-actions">
              <button class="sc-offer-accept" @click="handleAcceptOffer(msg)">接受</button>
              <button class="sc-offer-reject" @click="handleRejectOffer(msg)">拒绝</button>
            </div>
          </div>
          <!-- 议价回应 -->
          <div v-else-if="msg.message_type === 'offer_response'" class="sc-msg-bubble offer-resp">
            <p>{{ msg.content }}</p>
          </div>
          <span class="sc-msg-time">{{ formatTime(msg.created_at) }}</span>
        </div>
      </div>

      <!-- 快捷回复 -->
      <div class="sc-quick">
        <button v-for="qr in quickReplies" :key="qr" class="sc-qr-btn" @click="handleQuickReply(qr)">{{ qr }}</button>
      </div>

      <!-- 议价栏（买家端显示） -->
      <div v-if="!isSeller && activeConv.productInfo" class="sc-offer-bar">
        <div class="sc-offer-input-wrap">
          <span class="sc-offer-symbol">¥</span>
          <input v-model.number="offerPrice" type="number" class="sc-offer-input" placeholder="出价"
            :min="0" step="0.01" @keydown.enter="handleSendOffer" />
        </div>
        <button class="sc-offer-send" :disabled="!offerPrice || offerPrice <= 0" @click="handleSendOffer">
          💰 出价
        </button>
      </div>

      <!-- 输入框 -->
      <div class="sc-input-area">
        <textarea v-model="inputText" class="sc-input" rows="1" placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleSend"></textarea>
        <button class="sc-send-btn" @click="handleSend" :disabled="!inputText.trim()">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import type { ShopConversation, ShopMessage, ShopProduct } from '../../composables/useShop'
import { QUICK_REPLIES, useShop } from '../../composables/useShop'

defineEmits<{ viewProduct: [id: string] }>()

const {
  fetchConversations, fetchMessages, sendMessage, markConversationRead,
  createTransaction,
} = useShop()

const quickReplies = QUICK_REPLIES

interface ConvItem {
  id: string
  other_name: string
  last_message: string | null
  last_message_at: string
  unread: number
  productInfo?: ShopProduct
  raw: ShopConversation
}

const convList = ref<ConvItem[]>([])
const activeConv = ref<ConvItem | null>(null)
const messages = ref<ShopMessage[]>([])
const inputText = ref('')
const messagesRef = ref<HTMLElement | null>(null)
const userId = ref('')
const offerPrice = ref<number | null>(null)

// 判断当前用户是否是卖家
const isSeller = computed(() => {
  if (!activeConv.value || !userId.value) return false
  return activeConv.value.raw.seller_id === userId.value
})

async function loadConversations() {
  const { supabase } = await import('../../supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  userId.value = user.id

  const convs = await fetchConversations()
  // 构建展示列表
  const items: ConvItem[] = []
  for (const c of convs) {
    const isBuyer = c.buyer_id === user.id
    const otherId = isBuyer ? c.seller_id : c.buyer_id
    // 获取对方昵称
    const { data: profile } = await supabase.from('spark_profiles')
      .select('nickname').eq('user_id', otherId).maybeSingle()

    // 获取关联商品
    let productInfo: ShopProduct | undefined
    if (c.product_id) {
      const { data: prod } = await supabase.from('shop_products')
        .select('id,title,price,images,seller_id').eq('id', c.product_id).maybeSingle()
      if (prod) productInfo = prod as ShopProduct
    }

    items.push({
      id: c.id,
      other_name: profile?.nickname || '用户',
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      unread: isBuyer ? c.buyer_unread : c.seller_unread,
      productInfo,
      raw: c,
    })
  }
  convList.value = items
}

async function openConversation(conv: ConvItem) {
  activeConv.value = conv
  messages.value = await fetchMessages(conv.id)
  await markConversationRead(conv.id)
  conv.unread = 0
  nextTick(() => scrollToBottom())
}

async function handleSend() {
  if (!inputText.value.trim() || !activeConv.value) return
  const text = inputText.value.trim()
  inputText.value = ''
  // 本地追加
  messages.value.push({
    id: Date.now().toString(),
    conversation_id: activeConv.value.id,
    sender_id: userId.value,
    content: text,
    message_type: 'text',
    product_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  nextTick(() => scrollToBottom())
  await sendMessage(activeConv.value.id, text)
}

async function handleQuickReply(text: string) {
  inputText.value = text
  await handleSend()
}

// ====== 议价 ======

/** 买家发送出价 */
async function handleSendOffer() {
  if (!offerPrice.value || offerPrice.value <= 0 || !activeConv.value) return
  const price = offerPrice.value
  offerPrice.value = null
  // 本地追加
  messages.value.push({
    id: Date.now().toString(),
    conversation_id: activeConv.value.id,
    sender_id: userId.value,
    content: String(price),
    message_type: 'offer',
    product_id: activeConv.value.productInfo?.id || null,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  nextTick(() => scrollToBottom())
  await sendMessage(activeConv.value.id, String(price), 'offer', activeConv.value.productInfo?.id)
}

/** 卖家接受出价 → 自动创建交易 */
async function handleAcceptOffer(msg: ShopMessage) {
  if (!activeConv.value) return
  const price = parseFloat(msg.content)
  // 发送接受消息
  const acceptMsg = `✅ 已接受出价 ¥${price}`
  messages.value.push({
    id: Date.now().toString(),
    conversation_id: activeConv.value.id,
    sender_id: userId.value,
    content: acceptMsg,
    message_type: 'offer_response',
    product_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  await sendMessage(activeConv.value.id, acceptMsg, 'offer_response')
  // 自动创建交易 — 卖家接受出价，买家由 createTransaction 内部从 auth 取
  if (activeConv.value.productInfo) {
    await createTransaction(
      activeConv.value.productInfo.id,
      activeConv.value.raw.seller_id,
      price,
    )
    // 系统提示
    messages.value.push({
      id: (Date.now() + 1).toString(),
      conversation_id: activeConv.value.id,
      sender_id: 'system',
      content: `📋 交易已创建，协商价格 ¥${price}`,
      message_type: 'system',
      product_id: null,
      is_read: true,
      created_at: new Date().toISOString(),
    })
  }
  nextTick(() => scrollToBottom())
}

/** 卖家拒绝出价 */
async function handleRejectOffer(msg: ShopMessage) {
  if (!activeConv.value) return
  const rejectMsg = `❌ 已拒绝出价 ¥${msg.content}`
  messages.value.push({
    id: Date.now().toString(),
    conversation_id: activeConv.value.id,
    sender_id: userId.value,
    content: rejectMsg,
    message_type: 'offer_response',
    product_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  await sendMessage(activeConv.value.id, rejectMsg, 'offer_response')
  nextTick(() => scrollToBottom())
}

/** 卖家发起交易 */
async function handleCreateDeal() {
  if (!activeConv.value?.productInfo) return
  const priceInput = prompt('请输入交易价格：', String(activeConv.value.productInfo.price))
  if (!priceInput) return
  const price = parseFloat(priceInput)
  if (isNaN(price) || price <= 0) return

  const txId = await createTransaction(
    activeConv.value.productInfo.id,
    activeConv.value.raw.seller_id,
    price,
  )
  if (txId) {
    const sysMsg = `📋 卖家发起了交易，价格 ¥${price}`
    messages.value.push({
      id: Date.now().toString(),
      conversation_id: activeConv.value.id,
      sender_id: 'system',
      content: sysMsg,
      message_type: 'system',
      product_id: null,
      is_read: true,
      created_at: new Date().toISOString(),
    })
    await sendMessage(activeConv.value.id, sysMsg, 'system')
    nextTick(() => scrollToBottom())
  }
}

function scrollToBottom() {
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

function formatTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

onMounted(loadConversations)

// 暴露给父组件
defineExpose({ loadConversations })
</script>

<style scoped>
.sc-wrap{height:100%;display:flex;flex-direction:column}
.sc-title{font-size:15px;font-weight:600;color:rgba(255,255,255,.6);margin:0 0 12px}
.sc-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:40px 0}

/* 会话列表 */
.sc-conv-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:all .2s;border:1px solid transparent}
.sc-conv-item:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.06)}
.sc-conv-avatar{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,rgba(79,142,247,.25),rgba(99,102,241,.15));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.sc-conv-info{flex:1;min-width:0}
.sc-conv-top{display:flex;justify-content:space-between;align-items:center}
.sc-conv-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.65)}
.sc-conv-time{font-size:10px;color:rgba(255,255,255,.15)}
.sc-conv-last{font-size:11px;color:rgba(255,255,255,.25);margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sc-conv-badge{padding:2px 6px;border-radius:10px;background:rgba(239,68,68,.8);color:white;font-size:10px;font-weight:700}

/* 聊天面板 */
.sc-chat{display:flex;flex-direction:column;height:100%}
.sc-chat-header{display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.04)}
.sc-back{background:none;border:none;color:rgba(255,255,255,.4);font-size:16px;cursor:pointer;padding:4px 8px}
.sc-chat-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.6);flex:1}
.sc-deal-btn{padding:4px 10px;border-radius:8px;border:1px solid rgba(34,197,94,.15);background:rgba(34,197,94,.06);color:rgba(34,197,94,.6);font-size:10px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.sc-deal-btn:hover{background:rgba(34,197,94,.1)}

.sc-product-card{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(79,142,247,.04);border:1px solid rgba(79,142,247,.08);margin:8px 0;cursor:pointer;transition:all .2s}
.sc-product-card:hover{background:rgba(79,142,247,.06)}
.sc-product-img{width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0}
.sc-product-info{flex:1;min-width:0}
.sc-product-title{display:block;font-size:12px;color:rgba(255,255,255,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sc-product-price{display:block;font-size:13px;font-weight:700;color:#f97316}

/* 消息 */
.sc-messages{flex:1;overflow-y:auto;padding:10px 0;scroll-behavior:smooth}
.sc-msg{margin-bottom:8px;max-width:80%}
.sc-msg.mine{margin-left:auto}
.sc-msg-bubble{padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04)}
.sc-msg.mine .sc-msg-bubble{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.1)}
.sc-msg-bubble p{margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,.6);word-break:break-word}
.sc-msg.mine .sc-msg-bubble p{color:rgba(255,255,255,.75)}
.sc-msg-bubble.offer-resp{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.12)}
.sc-msg-image{max-width:200px;border-radius:8px}
.sc-msg-system{text-align:center;font-size:10px;color:rgba(255,255,255,.2);padding:4px 12px;background:rgba(255,255,255,.02);border-radius:8px;margin:4px auto;display:block;max-width:80%}
.sc-msg-time{display:block;font-size:9px;color:rgba(255,255,255,.1);margin-top:2px}
.sc-msg.mine .sc-msg-time{text-align:right}

/* 议价消息卡片 */
.sc-offer-card{padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(249,115,22,.06),rgba(245,158,11,.04));border:1px solid rgba(249,115,22,.15);text-align:center}
.sc-offer-head{font-size:11px;color:rgba(249,115,22,.5);margin-bottom:4px}
.sc-offer-price{font-size:22px;font-weight:800;color:#f97316;margin-bottom:6px}
.sc-offer-hint{font-size:10px;color:rgba(255,255,255,.2)}
.sc-offer-actions{display:flex;gap:8px;justify-content:center}
.sc-offer-accept{padding:6px 18px;border-radius:8px;border:none;background:rgba(34,197,94,.15);color:rgba(34,197,94,.8);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.sc-offer-accept:hover{background:rgba(34,197,94,.25)}
.sc-offer-reject{padding:6px 18px;border-radius:8px;border:none;background:rgba(239,68,68,.08);color:rgba(239,68,68,.6);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.sc-offer-reject:hover{background:rgba(239,68,68,.15)}

/* 快捷回复 */
.sc-quick{display:flex;gap:3px;flex-wrap:wrap;padding:6px 0}
.sc-qr-btn{padding:3px 8px;border-radius:6px;border:1px solid rgba(79,142,247,.08);background:rgba(79,142,247,.03);color:rgba(79,142,247,.5);font-size:10px;cursor:pointer;transition:all .2s}
.sc-qr-btn:hover{background:rgba(79,142,247,.08)}

/* 议价栏 */
.sc-offer-bar{display:flex;gap:6px;align-items:center;padding:6px 0;border-top:1px solid rgba(249,115,22,.05)}
.sc-offer-input-wrap{display:flex;align-items:center;flex:1;gap:2px;background:rgba(249,115,22,.04);border:1px solid rgba(249,115,22,.1);border-radius:8px;padding:4px 8px}
.sc-offer-symbol{font-size:14px;font-weight:700;color:rgba(249,115,22,.6)}
.sc-offer-input{flex:1;background:none;border:none;outline:none;color:#f97316;font-size:14px;font-weight:600;width:60px}
.sc-offer-input::placeholder{color:rgba(249,115,22,.3);font-weight:400;font-size:12px}
.sc-offer-send{padding:6px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#f97316,#f59e0b);color:white;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.sc-offer-send:disabled{opacity:.3;cursor:default}

/* 输入 */
.sc-input-area{display:flex;gap:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,.04)}
.sc-input{flex:1;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;resize:none;font-family:inherit}
.sc-input::placeholder{color:rgba(255,255,255,.15)}
.sc-send-btn{padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white;font-size:12px;font-weight:600;cursor:pointer}
.sc-send-btn:disabled{opacity:.3}
</style>
