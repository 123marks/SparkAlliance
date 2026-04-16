/**
 * useShop — 星火购物核心逻辑
 * 商品CRUD / 搜索筛选 / 收藏 / 聊天 / 交易 / 评价 / AI定价 / 模块打通
 */
import { ref } from 'vue'
import { supabase } from '../supabase'

// ====== 类型 ======

/** 商品分类 */
export interface ShopCategory {
  id: number
  name: string
  parent_id: number | null
  icon: string
  sort_order: number
  is_active: boolean
  children?: ShopCategory[]
}

/** 商品成色 */
export const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  new: { label: '全新', color: '#22c55e' },
  like_new: { label: '几乎全新', color: '#3b82f6' },
  good: { label: '轻微使用', color: '#f59e0b' },
  fair: { label: '明显使用', color: '#ef4444' },
}

/** 交易方式选项 */
export const TRADE_METHODS = ['校内面交', '宿舍楼交易', '约定地点', '均可']

/** 商品标签快捷选项 */
export const QUICK_TAGS = ['急出', '可小刀', '不议价', '送赠品', '正品保证', '包装完好', '自用闲置', '毕业清仓']

/** 评价标签快选（交易后互评使用） */
export const REVIEW_TAGS_POSITIVE = ['物美价廉', '发货快', '描述相符', '态度好', '包装好', '沟通愉快']
export const REVIEW_TAGS_NEGATIVE = ['描述不符', '态度差', '拖延发货', '虚假商品']

/** 商品 */
export interface ShopProduct {
  id: string
  seller_id: string
  title: string
  description: string
  category_id: number | null
  condition: string
  price: number
  original_price: number | null
  images: string[]
  video_url: string | null
  trade_method: string
  trade_location: string | null
  is_negotiable: boolean
  tags: string[]
  status: string
  view_count: number
  want_count: number
  created_at: string
  updated_at: string
  sold_at: string | null
  // 联表/计算
  seller_profile?: Record<string, unknown>
  seller_nickname?: string
  seller_avatar?: string
  seller_university?: string
  is_favorited?: boolean
  category_name?: string
  discount?: number
}

/** 聊天会话 */
export interface ShopConversation {
  id: string
  product_id: string | null
  buyer_id: string
  seller_id: string
  last_message: string | null
  last_message_at: string
  buyer_unread: number
  seller_unread: number
  created_at: string
  // 联表
  product?: ShopProduct
  other_profile?: Record<string, unknown>
}

/** 聊天消息 */
export interface ShopMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'product' | 'system' | 'quick_reply' | 'offer' | 'offer_response'
  product_id: string | null
  is_read: boolean
  created_at: string
  product_card?: ShopProduct
}

/** 交易订单 */
export interface ShopTransaction {
  id: string
  product_id: string
  buyer_id: string
  seller_id: string
  status: 'pending' | 'accepted' | 'meeting' | 'completed' | 'cancelled'
  agreed_price: number | null
  trade_time: string | null
  trade_location: string | null
  buyer_confirmed: boolean
  seller_confirmed: boolean
  cancel_reason: string | null
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
  product?: ShopProduct
  product_info?: ShopProduct
}

/** 商品评论（非交易评价，任何人可评） */
export interface ProductComment {
  id: string
  product_id: string
  user_id: string
  content: string
  created_at: string
  user_nickname?: string
  user_avatar?: string
}

/** 卖家铺子信息 */
export interface SellerShop {
  userId: string
  nickname: string
  avatar?: string
  bio?: string
  sparkId?: string
  university?: string
  interests?: string[]
  createdAt?: string
  avgRating: number
  reviewCount: number
  goodRate: number
  activeProducts: number
  completedTransactions: number
  products: ShopProduct[]
  reviews: ShopReview[]
}

/** 评价 */
export interface ShopReview {
  id: string
  transaction_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  description_match: number
  attitude: number
  content: string | null
  images: string[]
  tags: string[]
  created_at: string
  reviewer_profile?: Record<string, unknown>
  reviewer_nickname?: string
  reviewer_avatar?: string
}

/** 搜索参数 */
export interface SearchParams {
  keyword?: string
  categoryId?: number
  priceMin?: number
  priceMax?: number
  condition?: string
  sortBy?: 'latest' | 'price_asc' | 'price_desc' | 'popular'
  postedWithin?: 'today' | '3days' | '7days' | '30days'
  page?: number
  pageSize?: number
}

/** 快捷回复选项 */
export const QUICK_REPLIES = [
  '还在吗？', '能便宜点吗？', '什么时候方便交易？',
  '可以看实物吗？', '有瑕疵吗？', '最低多少？',
  '我想要了', '成色怎么样？',
]


// ====== Composable ======

export function useShop() {
  const categories = ref<ShopCategory[]>([])
  const products = ref<ShopProduct[]>([])
  const conversations = ref<ShopConversation[]>([])
  const myProducts = ref<ShopProduct[]>([])
  const myFavorites = ref<ShopProduct[]>([])
  const myBuyOrders = ref<ShopTransaction[]>([])
  const mySellOrders = ref<ShopTransaction[]>([])
  const loading = ref(false)
  const totalCount = ref(0)

  // ====== 分类 ======

  /** 获取分类（构建树形） */
  async function fetchCategories(): Promise<ShopCategory[]> {
    const { data } = await supabase.from('shop_categories')
      .select('*').eq('is_active', true).order('sort_order')
    if (!data) return []

    // 构建树形结构
    const flat = data as ShopCategory[]
    const roots = flat.filter(c => !c.parent_id)
    roots.forEach(root => {
      root.children = flat.filter(c => c.parent_id === root.id)
    })
    categories.value = roots
    return roots
  }

  // ====== 商品 CRUD ======

  /** 发布商品 */
  async function publishProduct(productData: {
    title: string
    description: string
    category_id?: number
    condition: string
    price: number
    original_price?: number
    images: string[]
    video_url?: string
    trade_method: string
    trade_location?: string
    is_negotiable?: boolean
    tags?: string[]
    status?: string
  }): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 草稿保持 draft，否则直接上架（未来可接入真实 AI 审核 API 再启用 pending_review）
    const finalStatus = productData.status === 'draft' ? 'draft' : 'active'

    const { data, error } = await supabase.from('shop_products').insert({
      seller_id: user.id,
      ...productData,
      status: finalStatus,
    }).select().single()

    if (error) { console.error('发布商品失败:', error); return null }
    return data.id
  }

  /** 上传商品图片 */
  async function uploadProductImage(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('shop-images').upload(path, file, {
      contentType: file.type,
    })
    if (error) { console.error('上传失败:', error); return null }
    return supabase.storage.from('shop-images').getPublicUrl(path).data.publicUrl
  }

  /** 更新商品 */
  async function updateProduct(id: string, updates: Partial<ShopProduct>): Promise<boolean> {
    const { error } = await supabase.from('shop_products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error(error); return false }
    return true
  }

  /** 删除商品（软删除） */
  async function deleteProduct(id: string): Promise<boolean> {
    return updateProduct(id, { status: 'deleted', deleted_at: new Date().toISOString() } as Partial<ShopProduct>)
  }

  /** 下架/上架商品 */
  async function toggleProductStatus(id: string, newStatus: 'active' | 'offline'): Promise<boolean> {
    return updateProduct(id, { status: newStatus } as Partial<ShopProduct>)
  }

  // ====== 搜索/浏览 ======

  /** 搜索商品 */
  async function searchProducts(params: SearchParams = {}): Promise<ShopProduct[]> {
    loading.value = true
    try {
      const { keyword, categoryId, priceMin, priceMax, condition, sortBy = 'latest', page = 1, pageSize = 20 } = params
      const from = (page - 1) * pageSize

      let query = supabase.from('shop_products')
        .select('*', { count: 'exact' })
        .eq('status', 'active')

      // 关键词搜索
      if (keyword?.trim()) {
        query = query.or(`title.ilike.%${keyword.trim()}%,description.ilike.%${keyword.trim()}%`)
        // 保存搜索历史
        saveSearchHistory(keyword.trim())
      }

      // 分类筛选
      if (categoryId) {
        const sub = categories.value.find(c => c.id === categoryId)?.children?.map(c => c.id) || []
        const ids = [categoryId, ...sub]
        query = query.in('category_id', ids)
      }

      // 价格区间
      if (priceMin !== undefined) query = query.gte('price', priceMin)
      if (priceMax !== undefined) query = query.lte('price', priceMax)

      // 成色
      if (condition) query = query.eq('condition', condition)

      // 时间筛选
      const { postedWithin } = params
      if (postedWithin) {
        const daysMap = { today: 1, '3days': 3, '7days': 7, '30days': 30 }
        const days = daysMap[postedWithin] || 7
        const since = new Date(Date.now() - days * 86400000).toISOString()
        query = query.gte('created_at', since)
      }

      // 排序
      switch (sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break
        case 'price_desc': query = query.order('price', { ascending: false }); break
        case 'popular': query = query.order('want_count', { ascending: false }); break
        default: query = query.order('created_at', { ascending: false })
      }

      const { data, count, error } = await query.range(from, from + pageSize - 1)
      if (error) throw error

      // 计算折扣率
      const items = (data || []).map(p => ({
        ...p,
        discount: p.original_price && p.original_price > 0
          ? Math.round((p.price / p.original_price) * 100)
          : null,
      })) as ShopProduct[]

      // 批量查询卖家信息（昵称+头像）
      const sellerIds = [...new Set(items.map(p => p.seller_id))]
      if (sellerIds.length) {
        const { data: profiles } = await supabase.from('spark_profiles')
          .select('user_id, nickname, avatar_url, university')
          .in('user_id', sellerIds)
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]))
          items.forEach(p => {
            const sp = profileMap.get(p.seller_id)
            if (sp) {
              p.seller_nickname = sp.nickname || undefined
              p.seller_avatar = sp.avatar_url || undefined
              p.seller_university = sp.university || undefined
            }
          })
        }
      }

      // 标记收藏状态
      const { data: { user } } = await supabase.auth.getUser()
      if (user && items.length) {
        const ids = items.map(p => p.id)
        const { data: favs } = await supabase.from('shop_favorites')
          .select('product_id').eq('user_id', user.id).in('product_id', ids)
        const favSet = new Set(favs?.map(f => f.product_id) || [])
        items.forEach(p => { p.is_favorited = favSet.has(p.id) })
      }

      products.value = page === 1 ? items : [...products.value, ...items]
      totalCount.value = count || 0
      return items
    } finally { loading.value = false }
  }

  /** 获取商品详情（含浏览量自增+卖家信息） */
  async function getProductDetail(id: string): Promise<ShopProduct | null> {
    const { data, error } = await supabase.from('shop_products')
      .select('*').eq('id', id).single()
    if (error || !data) return null

    // 原子化浏览量+1
    supabase.rpc('shop_increment_view', { p_id: id }).then(() => { })

    // 检查是否收藏
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: fav } = await supabase.from('shop_favorites')
        .select('id').eq('user_id', user.id).eq('product_id', id).maybeSingle()
      data.is_favorited = !!fav
    }

    // 获取分类名称
    if (data.category_id) {
      const flat = categories.value.flatMap(c => [c, ...(c.children || [])])
      const cat = flat.find(c => c.id === data.category_id)
      if (cat) data.category_name = cat.name
    }

    // 获取卖家信息
    const { data: sellerProfile } = await supabase.from('spark_profiles')
      .select('nickname, avatar_url, university')
      .eq('user_id', data.seller_id).maybeSingle()
    if (sellerProfile) {
      data.seller_nickname = sellerProfile.nickname || undefined
      data.seller_avatar = sellerProfile.avatar_url || undefined
      data.seller_university = sellerProfile.university || undefined
    }

    return data as ShopProduct
  }

  /** 获取卖家信用信息 */
  async function getSellerCredit(sellerId: string) {
    // 历史评价均分
    const { data: reviews } = await supabase.from('shop_reviews')
      .select('rating, description_match, attitude')
      .eq('reviewee_id', sellerId)
    const reviewCount = reviews?.length || 0
    let avgRating = 5
    if (reviewCount > 0) {
      const sumR = reviews!.reduce((s, r) => s + r.rating, 0)
      avgRating = Math.round((sumR / reviewCount) * 10) / 10
    }

    // 在售商品数
    const { count: activeCount } = await supabase.from('shop_products')
      .select('id', { count: 'exact' })
      .eq('seller_id', sellerId).eq('status', 'active')

    // 已完成交易数
    const { count: completedCount } = await supabase.from('shop_transactions')
      .select('id', { count: 'exact' })
      .eq('seller_id', sellerId).eq('status', 'completed')

    return {
      avgRating,
      reviewCount,
      activeProducts: activeCount || 0,
      completedTransactions: completedCount || 0,
      goodRate: reviewCount > 0
        ? Math.round((reviews!.filter(r => r.rating >= 4).length / reviewCount) * 100)
        : 100,
    }
  }

  // ====== 收藏 ======

  async function toggleFavorite(productId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: ex } = await supabase.from('shop_favorites')
      .select('id').eq('user_id', user.id).eq('product_id', productId).maybeSingle()
    if (ex) {
      await supabase.from('shop_favorites').delete().eq('id', ex.id)
    } else {
      await supabase.from('shop_favorites').insert({ user_id: user.id, product_id: productId })
    }

    // 更新本地状态
    const p = products.value.find(p => p.id === productId)
    if (p) {
      p.is_favorited = !ex
      p.want_count += ex ? -1 : 1
    }
    return true
  }

  async function fetchMyFavorites(): Promise<ShopProduct[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: favs } = await supabase.from('shop_favorites')
      .select('product_id').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!favs?.length) { myFavorites.value = []; return [] }
    const ids = favs.map(f => f.product_id)
    const { data } = await supabase.from('shop_products')
      .select('*').in('id', ids)
    myFavorites.value = (data || []) as ShopProduct[]
    return myFavorites.value
  }

  // ====== 聊天会话 ======

  /** 创建或获取聊天会话 */
  async function getOrCreateConversation(productId: string, sellerId: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 检查已有会话
    const { data: existing } = await supabase.from('shop_conversations')
      .select('id').eq('product_id', productId).eq('buyer_id', user.id).eq('seller_id', sellerId).maybeSingle()
    if (existing) return existing.id

    // 创建新会话
    const { data, error } = await supabase.from('shop_conversations').insert({
      product_id: productId, buyer_id: user.id, seller_id: sellerId,
    }).select().single()
    if (error) { console.error(error); return null }
    return data.id
  }

  /** 获取我的聊天列表 */
  async function fetchConversations(): Promise<ShopConversation[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.from('shop_conversations')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    if (error) { console.error(error); return [] }
    conversations.value = (data || []) as ShopConversation[]
    return conversations.value
  }

  /** 获取会话消息 */
  async function fetchMessages(convId: string, limit = 50): Promise<ShopMessage[]> {
    const { data } = await supabase.from('shop_messages')
      .select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: true }).limit(limit)
    return (data || []) as ShopMessage[]
  }

  /** 发送消息 */
  async function sendMessage(
    convId: string,
    content: string,
    type: ShopMessage['message_type'] = 'text',
    productId?: string,
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('shop_messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content,
      message_type: type,
      product_id: productId || null,
    })
    if (error) { console.error(error); return false }
    return true
  }

  /** 标记会话已读 */
  async function markConversationRead(convId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: conv } = await supabase.from('shop_conversations')
      .select('buyer_id').eq('id', convId).single()
    if (!conv) return
    const field = conv.buyer_id === user.id ? 'buyer_unread' : 'seller_unread'
    await supabase.from('shop_conversations').update({ [field]: 0 }).eq('id', convId)
    // 标记消息已读
    await supabase.from('shop_messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', user.id)
      .eq('is_read', false)
  }

  // ====== 交易管理 ======

  /** 发起交易 — buyerId 可选，默认为当前登录用户；卖家发起时须显式传入买家ID */
  async function createTransaction(
    productId: string,
    sellerId: string,
    agreedPrice?: number,
    tradeTime?: string,
    tradeLocation?: string,
    buyerId?: string,
  ): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const actualBuyerId = buyerId || user.id
    if (actualBuyerId === sellerId) {
      console.error('buyer_id 与 seller_id 不能相同')
      return null
    }
    const { data, error } = await supabase.from('shop_transactions').insert({
      product_id: productId,
      buyer_id: actualBuyerId,
      seller_id: sellerId,
      agreed_price: agreedPrice,
      trade_time: tradeTime,
      trade_location: tradeLocation,
    }).select().single()
    if (error) { console.error(error); return null }
    return data.id
  }

  /** 更新交易状态 */
  async function updateTransaction(id: string, updates: Partial<ShopTransaction>): Promise<boolean> {
    const { error } = await supabase.from('shop_transactions').update(updates).eq('id', id)
    return !error
  }

  /** 卖家接受交易 → accepted */
  async function acceptTransaction(transactionId: string): Promise<boolean> {
    return updateTransaction(transactionId, { status: 'accepted', seller_confirmed: true })
  }

  /** 约定见面 → meeting */
  async function setMeeting(transactionId: string, time: string, location: string): Promise<boolean> {
    return updateTransaction(transactionId, {
      status: 'meeting',
      trade_time: time,
      trade_location: location,
    })
  }

  /** 买家确认收货 — 仅设 buyer_confirmed，双方都确认后由触发器自动完成 */
  async function confirmReceive(transactionId: string): Promise<boolean> {
    return updateTransaction(transactionId, { buyer_confirmed: true })
  }

  /** 卖家确认发货/交付 — 仅设 seller_confirmed */
  async function confirmDelivery(transactionId: string): Promise<boolean> {
    return updateTransaction(transactionId, { seller_confirmed: true })
  }

  /** 取消交易 */
  async function cancelTransaction(transactionId: string, reason: string): Promise<boolean> {
    return updateTransaction(transactionId, {
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
  }

  /** 获取我的买入订单（含关联商品信息） */
  async function fetchMyBuyOrders(): Promise<ShopTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('shop_transactions')
      .select('*').eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
    const orders = (data || []) as ShopTransaction[]
    // 联表查询商品信息
    await attachProductInfo(orders)
    myBuyOrders.value = orders
    return myBuyOrders.value
  }

  /** 获取我的售出订单（含关联商品信息） */
  async function fetchMySellOrders(): Promise<ShopTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('shop_transactions')
      .select('*').eq('seller_id', user.id)
      .order('created_at', { ascending: false })
    const orders = (data || []) as ShopTransaction[]
    await attachProductInfo(orders)
    mySellOrders.value = orders
    return mySellOrders.value
  }

  /** 批量为订单附加商品信息 */
  async function attachProductInfo(orders: ShopTransaction[]): Promise<void> {
    if (!orders.length) return
    const productIds = [...new Set(orders.map(o => o.product_id))]
    const { data: prods } = await supabase.from('shop_products')
      .select('id, title, price, images')
      .in('id', productIds)
    if (prods) {
      const prodMap = new Map(prods.map(p => [p.id, p]))
      orders.forEach(o => {
        const p = prodMap.get(o.product_id)
        if (p) o.product_info = p as ShopProduct
      })
    }
  }

  /** 获取我发布的商品 */
  async function fetchMyProducts(): Promise<ShopProduct[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('shop_products')
      .select('*').eq('seller_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
    myProducts.value = (data || []) as ShopProduct[]
    return myProducts.value
  }

  // ====== 评价 ======

  async function submitReview(
    transactionId: string,
    revieweeId: string,
    rating: number,
    descriptionMatch: number,
    attitude: number,
    content?: string,
    images?: string[],
    tags?: string[],
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    // 前端校验：确认当前用户参与了该已完成交易
    const { data: tx } = await supabase.from('shop_transactions')
      .select('buyer_id, seller_id, status')
      .eq('id', transactionId).single()
    if (!tx || tx.status !== 'completed'
      || (tx.buyer_id !== user.id && tx.seller_id !== user.id)) {
      console.error('无权评价：未参与该已完成交易')
      return false
    }
    const { error } = await supabase.from('shop_reviews').insert({
      transaction_id: transactionId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating, description_match: descriptionMatch, attitude,
      content: content || null,
      images: images || [],
      tags: tags || [],
    })
    if (error) { console.error(error); return false }
    return true
  }

  async function fetchUserReviews(userId: string): Promise<ShopReview[]> {
    const { data } = await supabase.from('shop_reviews')
      .select('*').eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
    if (!data?.length) return []

    // 联表评价者信息
    const reviewerIds = [...new Set(data.map(r => r.reviewer_id))]
    const { data: profiles } = await supabase.from('spark_profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', reviewerIds)
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    return data.map(r => ({
      ...r,
      tags: r.tags || [],
      reviewer_nickname: profileMap.get(r.reviewer_id)?.nickname || '匿名',
      reviewer_avatar: profileMap.get(r.reviewer_id)?.avatar_url || '',
    })) as ShopReview[]
  }

  // ====== 商品评论（非交易，任何人可评） ======

  async function addProductComment(productId: string, content: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('shop_product_comments').insert({
      product_id: productId, user_id: user.id, content,
    })
    return !error
  }

  async function fetchProductComments(productId: string): Promise<ProductComment[]> {
    const { data } = await supabase.from('shop_product_comments')
      .select('*').eq('product_id', productId)
      .order('created_at', { ascending: false }).limit(50)
    if (!data?.length) return []

    // 批量查询评论者信息
    const userIds = [...new Set(data.map(c => c.user_id))]
    const { data: profiles } = await supabase.from('spark_profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', userIds)
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    return data.map(c => ({
      ...c,
      user_nickname: profileMap.get(c.user_id)?.nickname || '匿名',
      user_avatar: profileMap.get(c.user_id)?.avatar_url || '',
    })) as ProductComment[]
  }

  // ====== 卖家铺子 ======

  async function getSellerShop(sellerId: string): Promise<SellerShop | null> {
    // 获取 spark_profiles 信息
    const { data: profile } = await supabase.from('spark_profiles')
      .select('*').eq('user_id', sellerId).maybeSingle()
    if (!profile) return null

    const credit = await getSellerCredit(sellerId)
    const { data: prods } = await supabase.from('shop_products')
      .select('*').eq('seller_id', sellerId)
      .in('status', ['active', 'sold'])
      .order('created_at', { ascending: false })
    const reviews = await fetchUserReviews(sellerId)

    return {
      userId: sellerId,
      nickname: profile.nickname,
      avatar: profile.avatar_url,
      bio: profile.bio,
      sparkId: profile.spark_id,
      university: profile.university,
      interests: profile.interests || [],
      createdAt: profile.created_at,
      ...credit,
      products: (prods || []) as ShopProduct[],
      reviews,
    }
  }

  // ====== 推荐算法 ======

  /** 基于浏览/收藏热度+最新 的推荐排序 */
  async function getRecommendedProducts(limit = 20): Promise<ShopProduct[]> {
    const { data } = await supabase.from('shop_products')
      .select('*').eq('status', 'active')
      .order('want_count', { ascending: false })
      .order('view_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data || []) as ShopProduct[]
  }

  // ====== 举报 ======

  async function reportItem(
    type: 'product' | 'user' | 'message',
    targetId: string,
    reason: string,
    description?: string,
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('shop_reports').insert({
      reporter_id: user.id, report_type: type, target_id: targetId, reason, description,
    })
    return !error
  }

  // ====== 搜索历史 ======

  async function saveSearchHistory(keyword: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('shop_search_history').insert({ user_id: user.id, keyword })
  }

  async function fetchSearchHistory(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('shop_search_history')
      .select('keyword').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(10)
    // 去重
    return [...new Set((data || []).map(d => d.keyword))]
  }

  async function clearSearchHistory(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    await supabase.from('shop_search_history').delete().eq('user_id', user.id)
    return true
  }

  // ====== AI 智能定价 ======

  /** 根据分类和成色给出定价建议 */
  async function getAIPriceSuggestion(
    categoryId: number,
    condition: string,
    _title: string,
  ): Promise<{ avgPrice: number; minPrice: number; maxPrice: number; suggestion: string } | null> {
    try {
      // 查询同分类同成色的活跃商品
      const sub = categories.value.find(c => c.id === categoryId)?.children?.map(c => c.id) || []
      const ids = [categoryId, ...sub]
      const { data } = await supabase.from('shop_products')
        .select('price').in('category_id', ids)
        .eq('condition', condition).eq('status', 'active')
        .limit(50)

      if (!data?.length) return null

      const prices = data.map(d => Number(d.price)).sort((a, b) => a - b)
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
      const min = prices[0]
      const max = prices[prices.length - 1]

      const condLabel = CONDITION_MAP[condition]?.label || condition
      return {
        avgPrice: avg,
        minPrice: min,
        maxPrice: max,
        suggestion: `同类「${condLabel}」商品均价 ¥${avg}，建议定价 ¥${Math.round(avg * 0.85)}-¥${Math.round(avg * 1.15)}`,
      }
    } catch { return null }
  }

  // ====== 模块打通（弱耦合：try-catch 包裹，目标表不存在不影响核心功能） ======

  /** 分享商品到校园墙（弱依赖 posts 表） */
  async function shareProductToWall(product: ShopProduct): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    try {
      const { data: profile } = await supabase.from('spark_profiles')
        .select('nickname').eq('user_id', user.id).maybeSingle()
      const authorName = profile?.nickname || user.email?.split('@')[0] || '同学'

      const { error } = await supabase.from('posts').insert({
        content: `🛒 我在星火购物发布了「${product.title}」\n💰 ¥${product.price} ${product.is_negotiable ? '(可议价)' : ''}\n\n${product.description.slice(0, 100)}\n\n#星火购物 #${CONDITION_MAP[product.condition]?.label || '二手'}`,
        author_id: user.id,
        author_name: authorName,
        category: 'shop',
        media_urls: product.images.slice(0, 3),
        tags: ['星火购物', '二手交易'],
      })
      if (error) {
        console.warn('分享到校园墙失败（posts 表可能未就绪）:', error.message)
        return false
      }
      return true
    } catch (e) {
      console.warn('分享到校园墙异常:', e)
      return false
    }
  }

  /** 分享商品到星火域（弱依赖 companion_moments 表） */
  async function shareProductToMoment(product: ShopProduct): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const { error } = await supabase.from('companion_moments').insert({
        user_id: user.id,
        content: `🛒 出售「${product.title}」¥${product.price}\n${product.description.slice(0, 80)}`,
        media_urls: product.images.slice(0, 3),
        visibility: 'friends',
      })
      if (error) {
        console.warn('分享到星火域失败（companion_moments 表可能未就绪）:', error.message)
        return false
      }
      return true
    } catch (e) {
      console.warn('分享到星火域异常:', e)
      return false
    }
  }

  // ====== 工具 ======

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return dateStr.slice(0, 10)
  }

  function formatPrice(price: number): string {
    return price % 1 === 0 ? price.toString() : price.toFixed(2)
  }

  return {
    categories, products, conversations, myProducts, myFavorites,
    myBuyOrders, mySellOrders, loading, totalCount,
    fetchCategories,
    publishProduct, uploadProductImage, updateProduct, deleteProduct, toggleProductStatus,
    searchProducts, getProductDetail, getSellerCredit,
    toggleFavorite, fetchMyFavorites,
    getOrCreateConversation, fetchConversations, fetchMessages, sendMessage, markConversationRead,
    createTransaction, updateTransaction, acceptTransaction, setMeeting, confirmReceive, confirmDelivery, cancelTransaction,
    fetchMyBuyOrders, fetchMySellOrders, fetchMyProducts,
    submitReview, fetchUserReviews,
    addProductComment, fetchProductComments,
    getSellerShop, getRecommendedProducts,
    reportItem,
    fetchSearchHistory, clearSearchHistory,
    getAIPriceSuggestion,
    shareProductToWall, shareProductToMoment,
    formatTimeAgo, formatPrice,
    CONDITION_MAP, TRADE_METHODS, QUICK_TAGS, QUICK_REPLIES,
    REVIEW_TAGS_POSITIVE, REVIEW_TAGS_NEGATIVE,
  }
}
