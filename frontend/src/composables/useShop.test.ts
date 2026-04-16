/**
 * useShop 测试骨架 — 标注购物模块测试缺失的关键区域
 *
 * 测试覆盖优先级：
 *   P0 — 涉及资金/身份/数据完整性
 *   P1 — 核心业务流程
 *   P2 — 辅助功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
void expect; void vi; void beforeEach

// TODO: mock supabase client
// vi.mock('../supabase', () => ({ supabase: createMockClient() }))

describe('useShop — 交易安全 (P0)', () => {
  it.todo('createTransaction: buyer_id !== seller_id 防自卖自买')
  it.todo('createTransaction: 卖家发起时需显式传入 buyerId')
  it.todo('RLS: 非交易参与者无法 INSERT shop_reviews')
  it.todo('RLS: 只有交易 buyer/seller 可 UPDATE shop_transactions')
  it.todo('confirmReceive: 仅设 buyer_confirmed 不直接完成订单')
  it.todo('confirmDelivery: 仅设 seller_confirmed 不直接完成订单')
  it.todo('双方确认后触发器自动完成交易并标记商品 sold')
})

describe('useShop — 商品 CRUD (P1)', () => {
  it.todo('publishProduct: 草稿保持 draft 状态')
  it.todo('publishProduct: 非草稿直接上架为 active')
  it.todo('updateProduct: 自动更新 updated_at')
  it.todo('deleteProduct: 软删除 — 设 status=deleted 而非物理删除')
  it.todo('toggleProductStatus: active ↔ offline 切换')
  it.todo('uploadProductImage: 上传到 shop-images bucket 而非 campus-wall')
})

describe('useShop — 搜索/浏览 (P1)', () => {
  it.todo('searchProducts: 关键词搜索匹配 title 和 description')
  it.todo('searchProducts: 分类筛选包含子分类')
  it.todo('searchProducts: 价格区间过滤')
  it.todo('searchProducts: 时间筛选 today/3days/7days/30days')
  it.todo('searchProducts: 排序 latest/price_asc/price_desc/popular')
  it.todo('searchProducts: 分页逻辑（page=1 覆盖, page>1 追加）')
  it.todo('getProductDetail: 调用 shop_increment_view RPC 原子更新浏览量')
  it.todo('getProductDetail: 批量查询卖家信息')
})

describe('useShop — 收藏 (P1)', () => {
  it.todo('toggleFavorite: 首次收藏 → INSERT + want_count +1')
  it.todo('toggleFavorite: 取消收藏 → DELETE + want_count -1')
  it.todo('fetchMyFavorites: 返回收藏商品列表')
})

describe('useShop — 聊天 (P1)', () => {
  it.todo('getOrCreateConversation: 已有会话返回现有 id')
  it.todo('getOrCreateConversation: 无会话则创建')
  it.todo('sendMessage: 支持 text/image/offer/offer_response 类型')
  it.todo('markConversationRead: 正确区分 buyer_unread/seller_unread')
})

describe('useShop — 评价 (P1)', () => {
  it.todo('submitReview: 前端校验 — 非已完成交易参与者被拒绝')
  it.todo('submitReview: 包含 rating/description_match/attitude/tags')
  it.todo('fetchUserReviews: 联表查询评价者昵称和头像')
})

describe('useShop — 卖家铺子 (P1)', () => {
  it.todo('getSellerShop: 返回 interests 和 createdAt 字段')
  it.todo('getSellerCredit: 计算 avgRating/goodRate/completedTransactions')
})

describe('useShop — AI 定价 (P2)', () => {
  it.todo('getAIPriceSuggestion: 同类同成色商品均价计算')
  it.todo('getAIPriceSuggestion: 无同类数据返回 null')
})

describe('useShop — 模块打通 (P2)', () => {
  it.todo('shareProductToWall: 插入 posts 表带 shop 分类')
  it.todo('shareProductToMoment: 插入 companion_moments 表')
})

describe('useShop — 工具函数 (P2)', () => {
  it('formatTimeAgo: 刚刚', () => {
    // 唯一可直接测试的纯函数示例
    // const { formatTimeAgo } = useShop()
    // expect(formatTimeAgo(new Date().toISOString())).toBe('刚刚')
  })
  it.todo('formatTimeAgo: 分钟/小时/天/日期格式')
  it.todo('formatPrice: 整数不带小数点，小数保留2位')
})
