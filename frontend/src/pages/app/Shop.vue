<template>
  <div class="shop-page">
    <!-- 顶栏 -->
    <div class="sp-topbar">
      <h1 class="sp-logo">🛒 星火购物</h1>
      <div class="sp-topbar-actions">
        <button class="sp-icon-btn" @click="activeView = 'search'" title="搜索">🔍</button>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="sp-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="sp-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.icon }} {{ tab.label }}
        <span v-if="tab.key === 'messages' && unreadCount > 0" class="sp-tab-badge">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- ===== 首页 Tab（商品浏览） ===== -->
    <div v-if="activeTab === 'home'" class="sp-content">
      <!-- 搜索栏 -->
      <div class="sp-search-bar" @click="activeView = 'search'">
        <span class="sp-search-icon">🔍</span>
        <span class="sp-search-placeholder">搜索闲置宝贝...</span>
      </div>

      <!-- 分类导航 -->
      <div class="sp-categories">
        <button class="sp-cat-item" :class="{ active: !filterCatId }" @click="filterCatId = null; refreshProducts()">
          <span class="sp-cat-icon">🏠</span>
          <span class="sp-cat-name">全部</span>
        </button>
        <button v-for="cat in categories" :key="cat.id" class="sp-cat-item"
          :class="{ active: filterCatId === cat.id }" @click="filterCatId = cat.id; refreshProducts()">
          <span class="sp-cat-icon">{{ cat.icon }}</span>
          <span class="sp-cat-name">{{ cat.name }}</span>
        </button>
      </div>

      <!-- 排序栏 -->
      <div class="sp-sort-bar">
        <button v-for="s in sortOptions" :key="s.value" class="sp-sort-btn"
          :class="{ active: sortBy === s.value }" @click="sortBy = s.value; refreshProducts()">
          {{ s.label }}
        </button>
        <span class="sp-sort-divider">|</span>
        <button v-for="t in timeFilterOptions" :key="t.value" class="sp-sort-btn time"
          :class="{ active: timeFilter === t.value }" @click="timeFilter = t.value; refreshProducts()">
          {{ t.label }}
        </button>
      </div>

      <!-- 瀑布流商品列表 -->
      <div class="sp-waterfall" ref="waterfallRef">
        <div class="sp-waterfall-col">
          <ProductCard
            v-for="p in leftColumn" :key="p.id" :product="p"
            @click="openDetail(p)"
          />
        </div>
        <div class="sp-waterfall-col">
          <ProductCard
            v-for="p in rightColumn" :key="p.id" :product="p"
            @click="openDetail(p)"
          />
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="sp-loading"><div class="sp-spinner"></div></div>
      <p v-else-if="products.length === 0" class="sp-empty">暂无商品，发布第一件闲置吧 ✨</p>
      <button v-else-if="products.length < totalCount" class="sp-load-more" @click="loadMore">加载更多</button>
    </div>

    <!-- ===== 消息 Tab ===== -->
    <div v-else-if="activeTab === 'messages'" class="sp-content">
      <ShopChat ref="chatRef" @view-product="handleViewProduct" />
    </div>

    <!-- ===== 我的 Tab ===== -->
    <div v-else-if="activeTab === 'mine'" class="sp-content">
      <!-- 卖家铺子卡片 -->
      <div class="sp-shop-card">
        <div class="sp-shop-bg"></div>
        <div class="sp-shop-body">
          <div class="sp-shop-top">
            <div class="sp-shop-avatar-wrap" @click="openProfileEdit()">
              <img v-if="userAvatar" :src="userAvatar" class="sp-shop-avatar-img" />
              <span v-else class="sp-shop-avatar-text">{{ userName[0] }}</span>
              <span class="sp-shop-avatar-edit">✏️</span>
            </div>
            <div class="sp-shop-user">
              <div class="sp-shop-name-row">
                <span class="sp-shop-name">{{ userName }}</span>
                <span class="sp-shop-level" :class="sellerLevel.cls">🏅 {{ sellerLevel.name }}</span>
              </div>
              <span class="sp-shop-school" v-if="userSchool">🏫 {{ userSchool }}</span>
              <span class="sp-shop-id" v-if="userSparkId">ID: {{ userSparkId }}</span>
              <span class="sp-shop-joined" v-if="userJoined">📅 加入于 {{ userJoined }}</span>
            </div>
            <button class="sp-shop-edit-btn" @click="openProfileEdit()">编辑</button>
          </div>
          <!-- 等级进度条 -->
          <div class="sp-level-bar">
            <div class="sp-level-fill" :style="{ width: sellerLevel.progress + '%' }"></div>
            <span class="sp-level-text">距离 {{ sellerLevel.next }} 还需 {{ sellerLevel.remaining }} 笔交易</span>
          </div>
          <div class="sp-shop-stats">
            <div class="sp-stat"><span class="sp-stat-n">{{ creditInfo.avgRating }}</span><span class="sp-stat-l">评分</span></div>
            <div class="sp-stat"><span class="sp-stat-n">{{ creditInfo.goodRate }}%</span><span class="sp-stat-l">好评率</span></div>
            <div class="sp-stat"><span class="sp-stat-n">{{ creditInfo.completedTransactions }}</span><span class="sp-stat-l">成交</span></div>
            <div class="sp-stat"><span class="sp-stat-n">{{ creditInfo.activeProducts }}</span><span class="sp-stat-l">在售</span></div>
          </div>
          <p v-if="userBio" class="sp-shop-bio">« {{ userBio }} »</p>
          <p v-else class="sp-shop-bio sp-bio-empty" @click="openProfileEdit()">点击编辑个人简介，让买家更了解你 ✍️</p>
          <!-- 标签展示 -->
          <div v-if="userTags.length" class="sp-shop-tags">
            <span v-for="t in userTags" :key="t" class="sp-shop-tag">{{ t }}</span>
          </div>
        </div>
      </div>

      <!-- 我的入口 -->
      <div class="sp-mine-grid">
        <button class="sp-mine-entry" :class="{ active: mineSection === 'published' }" @click="mineSection = 'published'">
          <span class="sp-entry-icon">📦</span>
          <span class="sp-entry-num">{{ myProducts.length }}</span>
          <span class="sp-entry-label">我的商品</span>
        </button>
        <button class="sp-mine-entry" :class="{ active: mineSection === 'favorites' }" @click="mineSection = 'favorites'">
          <span class="sp-entry-icon">❤️</span>
          <span class="sp-entry-num">{{ myFavorites.length }}</span>
          <span class="sp-entry-label">收藏</span>
        </button>
        <button class="sp-mine-entry" :class="{ active: mineSection === 'buy_orders' }" @click="mineSection = 'buy_orders'">
          <span class="sp-entry-icon">🛍️</span>
          <span class="sp-entry-num">{{ myBuyOrders.length }}</span>
          <span class="sp-entry-label">买入</span>
        </button>
        <button class="sp-mine-entry" :class="{ active: mineSection === 'sell_orders' }" @click="mineSection = 'sell_orders'">
          <span class="sp-entry-icon">💰</span>
          <span class="sp-entry-num">{{ mySellOrders.length }}</span>
          <span class="sp-entry-label">售出</span>
        </button>
      </div>

      <!-- 我发布的 -->
      <div v-if="mineSection === 'published'" class="sp-mine-list">
        <div v-if="myProducts.length === 0" class="sp-empty">还没有发布商品，点击下方按钮发布第一件 ✨</div>
        <div v-for="p in myProducts" :key="p.id" class="sp-mine-item">
          <img v-if="p.images?.length" :src="p.images[0]" class="sp-mine-thumb" />
          <div class="sp-mine-item-info">
            <span class="sp-mine-item-title">{{ p.title }}</span>
            <div class="sp-mine-item-row">
              <span class="sp-mine-item-price">¥{{ p.price }}</span>
              <span class="sp-mine-item-status" :class="p.status">{{ statusLabel(p.status) }}</span>
            </div>
            <span class="sp-mine-item-meta">👁 {{ p.view_count || 0 }} · ❤️ {{ p.want_count || 0 }}</span>
          </div>
          <div class="sp-mine-item-actions">
            <button @click="handleEditProduct(p)" title="编辑">✏️</button>
            <button v-if="p.status === 'active'" @click="handleOffline(p.id)" title="下架">⏸️</button>
            <button v-if="p.status === 'offline' || p.status === 'draft'" @click="handleOnline(p.id)" title="上架">▶️</button>
            <button @click="handleDeleteProduct(p.id)" title="删除">🗑️</button>
          </div>
        </div>
      </div>

      <!-- 收藏的 -->
      <div v-if="mineSection === 'favorites'" class="sp-mine-list">
        <div v-if="myFavorites.length === 0" class="sp-empty">还没有收藏商品</div>
        <div v-for="p in myFavorites" :key="p.id" class="sp-mine-item" @click="openDetail(p)">
          <img v-if="p.images?.length" :src="p.images[0]" class="sp-mine-thumb" />
          <div class="sp-mine-item-info">
            <span class="sp-mine-item-title">{{ p.title }}</span>
            <span class="sp-mine-item-price">¥{{ p.price }}</span>
          </div>
        </div>
      </div>

      <!-- 买入订单 -->
      <div v-if="mineSection === 'buy_orders'" class="sp-mine-list">
        <div v-if="myBuyOrders.length === 0" class="sp-empty">暂无买入订单</div>
        <div v-for="o in myBuyOrders" :key="o.id" class="sp-order-card">
          <div class="sp-order-header">
            <span class="sp-order-status" :class="o.status">{{ orderStatusLabel(o.status) }}</span>
            <span class="sp-order-time">{{ formatTimeAgo(o.created_at) }}</span>
          </div>
          <!-- 关联商品信息 -->
          <div v-if="o.product_info" class="sp-order-product" @click="handleViewProductFromShop(o.product_info!.id)">
            <img v-if="o.product_info.images?.length" :src="o.product_info.images[0]" class="sp-op-img" />
            <div class="sp-op-info">
              <span class="sp-op-title">{{ o.product_info.title }}</span>
              <span class="sp-op-price">¥{{ o.product_info.price }}</span>
            </div>
          </div>
          <div class="sp-order-body">
            <span class="sp-order-price">成交价 ¥{{ o.agreed_price || '面议' }}</span>
            <span v-if="o.trade_location" class="sp-order-location">📍 {{ o.trade_location }}</span>
            <span v-if="o.trade_time" class="sp-order-location">🕐 {{ new Date(o.trade_time).toLocaleString('zh') }}</span>
          </div>
          <!-- 交易流转进度条 -->
          <div class="sp-order-progress">
            <div class="sp-progress-step done">📋 下单</div>
            <div class="sp-progress-line" :class="{ done: ['accepted','meeting','completed'].includes(o.status) }"></div>
            <div class="sp-progress-step" :class="{ done: ['accepted','meeting','completed'].includes(o.status) }">✅ 接受</div>
            <div class="sp-progress-line" :class="{ done: ['meeting','completed'].includes(o.status) }"></div>
            <div class="sp-progress-step" :class="{ done: ['meeting','completed'].includes(o.status) }">🤝 见面</div>
            <div class="sp-progress-line" :class="{ done: o.status==='completed' }"></div>
            <div class="sp-progress-step" :class="{ done: o.status==='completed' }">🎉 完成</div>
          </div>
          <div class="sp-order-actions" v-if="o.status === 'meeting'">
            <button class="sp-order-btn confirm" @click="handleConfirmReceive(o.id)">✅ 确认收货</button>
            <button class="sp-order-btn cancel" @click="handleCancelOrder(o.id)">取消</button>
          </div>
          <div class="sp-order-actions" v-if="o.status === 'completed'">
            <button class="sp-order-btn review" @click="openReviewModal(o)">📝 评价</button>
          </div>
          <div class="sp-order-actions" v-if="o.status === 'pending'">
            <span class="sp-order-hint">等待卖家确认中...</span>
            <button class="sp-order-btn cancel" @click="handleCancelOrder(o.id)">取消</button>
          </div>
        </div>
      </div>

      <!-- 售出订单 -->
      <div v-if="mineSection === 'sell_orders'" class="sp-mine-list">
        <div v-if="mySellOrders.length === 0" class="sp-empty">暂无售出订单</div>
        <div v-for="o in mySellOrders" :key="o.id" class="sp-order-card">
          <div class="sp-order-header">
            <span class="sp-order-status" :class="o.status">{{ orderStatusLabel(o.status) }}</span>
            <span class="sp-order-time">{{ formatTimeAgo(o.created_at) }}</span>
          </div>
          <!-- 关联商品信息 -->
          <div v-if="o.product_info" class="sp-order-product" @click="handleViewProductFromShop(o.product_info!.id)">
            <img v-if="o.product_info.images?.length" :src="o.product_info.images[0]" class="sp-op-img" />
            <div class="sp-op-info">
              <span class="sp-op-title">{{ o.product_info.title }}</span>
              <span class="sp-op-price">¥{{ o.product_info.price }}</span>
            </div>
          </div>
          <div class="sp-order-body">
            <span class="sp-order-price">成交价 ¥{{ o.agreed_price || '面议' }}</span>
          </div>
          <!-- 卖家操作 -->
          <div class="sp-order-actions" v-if="o.status === 'pending'">
            <button class="sp-order-btn confirm" @click="handleAcceptOrder(o.id)">✅ 接受交易</button>
            <button class="sp-order-btn cancel" @click="handleCancelOrder(o.id)">拒绝</button>
          </div>
          <div class="sp-order-actions" v-if="o.status === 'accepted'">
            <button class="sp-order-btn confirm" @click="handleSetMeeting(o.id)">🤝 约定见面</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 搜索面板（毛玻璃 + 分类快捷 + 筛选） ===== -->
    <Transition name="slide">
      <div v-if="activeView === 'search'" class="sp-search-panel">
        <div class="sp-search-glass"></div>
        <div class="sp-search-inner">
          <!-- 搜索栏 -->
          <div class="sp-search-top">
            <div class="sp-search-input-wrap">
              <span class="sp-si-icon">🔍</span>
              <input v-model="searchKeyword" class="sp-search-input" placeholder="搜索你想要的宝贝..." autofocus @keydown.enter="executeSearch" />
              <button v-if="searchKeyword" class="sp-si-clear" @click="searchKeyword = ''">✕</button>
            </div>
            <button class="sp-search-cancel" @click="activeView = null">取消</button>
          </div>

          <!-- 分类快捷入口 -->
          <div class="sp-search-cats">
            <button v-for="cat in categories" :key="cat.id" class="sp-scat"
              :class="{ active: searchCatId === cat.id }" @click="searchCatId = searchCatId === cat.id ? null : cat.id">
              <span class="sp-scat-icon">{{ cat.icon }}</span>
              <span class="sp-scat-name">{{ cat.name }}</span>
            </button>
          </div>

          <!-- 筛选条件 -->
          <div class="sp-search-filters">
            <div class="sp-sf-row">
              <span class="sp-sf-label">💰 价格</span>
              <div class="sp-sf-inputs">
                <input v-model.number="filterPriceMin" type="number" class="sp-sf-input" placeholder="最低" />
                <span class="sp-sf-dash">—</span>
                <input v-model.number="filterPriceMax" type="number" class="sp-sf-input" placeholder="最高" />
              </div>
            </div>
            <div class="sp-sf-row">
              <span class="sp-sf-label">📊 成色</span>
              <div class="sp-sf-chips">
                <button v-for="(info, key) in conditionMapObj" :key="key" class="sp-sf-chip"
                  :class="{ active: searchCondition === key }" @click="searchCondition = searchCondition === key ? '' : key as string">
                  {{ info.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 搜索按钮 -->
          <button class="sp-search-go" @click="executeSearch">🔍 搜索</button>

          <!-- 搜索历史 -->
          <div v-if="searchHistory.length" class="sp-search-section">
            <div class="sp-ss-header"><span>🕐 搜索历史</span><button @click="handleClearHistory">清除</button></div>
            <div class="sp-ss-tags">
              <button v-for="kw in searchHistory" :key="kw" class="sp-ss-tag" @click="searchKeyword = kw; executeSearch()">{{ kw }}</button>
            </div>
          </div>

          <!-- 热门搜索 -->
          <div class="sp-search-section">
            <div class="sp-ss-header"><span>🔥 热门搜索</span></div>
            <div class="sp-ss-tags">
              <button v-for="(kw, i) in hotKeywords" :key="kw" class="sp-ss-tag hot" @click="searchKeyword = kw; executeSearch()">
                <span class="sp-ss-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span> {{ kw }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 商品详情弹窗 ===== -->
    <Transition name="fade">
      <div v-if="detailProduct" class="sp-modal-overlay" @click.self="detailProduct = null">
        <div class="sp-modal detail-modal">
          <ProductDetail
            :product="detailProduct"
            @close="detailProduct = null"
            @favorite="handleFavorite"
            @chat="handleChat"
            @share="handleShare"
            @report="handleReport"
            @offer="handleOffer"
            @view-seller="handleViewSeller"
          />
        </div>
      </div>
    </Transition>

    <!-- ===== 发布/编辑弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showPublish" class="sp-modal-overlay" @click.self="showPublish = false">
        <div class="sp-modal publish-modal">
          <PublishForm
            :categories="categories"
            :publishing="publishingProduct"
            :edit-product="editingProduct"
            @cancel="showPublish = false; editingProduct = null"
            @submit="handlePublish"
          />
          <div v-if="!editingProduct" class="sp-publish-tip">
            ⚡ 发布后将自动进入审核，审核通过后上架
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 评价弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showReviewModal" class="sp-modal-overlay" @click.self="showReviewModal = false">
        <div class="sp-modal review-modal">
          <h3>📝 交易评价</h3>
          <div class="sp-review-form">
            <div class="sp-review-field">
              <label>交易体验</label>
              <div class="sp-stars">
                <button v-for="i in 5" :key="i" class="sp-star" :class="{ active: reviewRating >= i }"
                  @click="reviewRating = i">⭐</button>
              </div>
            </div>
            <div class="sp-review-field">
              <label>描述相符</label>
              <div class="sp-stars">
                <button v-for="i in 5" :key="i" class="sp-star" :class="{ active: reviewDescMatch >= i }"
                  @click="reviewDescMatch = i">⭐</button>
              </div>
            </div>
            <div class="sp-review-field">
              <label>沟通态度</label>
              <div class="sp-stars">
                <button v-for="i in 5" :key="i" class="sp-star" :class="{ active: reviewAttitude >= i }"
                  @click="reviewAttitude = i">⭐</button>
              </div>
            </div>
            <!-- 评价标签快选 -->
            <div class="sp-review-field">
              <label>快捷标签</label>
              <div class="sp-review-tags-wrap">
                <button v-for="tag in REVIEW_TAGS_POSITIVE" :key="tag" class="sp-rvtag positive"
                  :class="{ active: reviewTags.includes(tag) }" @click="toggleReviewTag(tag)">
                  👍 {{ tag }}
                </button>
                <button v-for="tag in REVIEW_TAGS_NEGATIVE" :key="tag" class="sp-rvtag negative"
                  :class="{ active: reviewTags.includes(tag) }" @click="toggleReviewTag(tag)">
                  👎 {{ tag }}
                </button>
              </div>
            </div>
            <textarea v-model="reviewContent" class="sp-review-textarea" placeholder="写点评价吧（选填）" rows="3" maxlength="200"></textarea>
            <div class="sp-review-actions">
              <button class="sp-review-btn cancel" @click="showReviewModal = false">取消</button>
              <button class="sp-review-btn submit" @click="handleSubmitReview" :disabled="reviewRating === 0">提交评价</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 分享弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showShareModal" class="sp-modal-overlay" @click.self="showShareModal = false">
        <div class="sp-modal small">
          <h3>🚀 分享到</h3>
          <div class="sp-share-grid">
            <button class="sp-share-btn" @click="handleShareToWall">🏫 校园墙</button>
            <button class="sp-share-btn" @click="handleShareToMoment">📸 朋友圈</button>
          </div>
          <button class="sp-share-close" @click="showShareModal = false">取消</button>
        </div>
      </div>
    </Transition>

    <!-- ===== 卖家铺子弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showSellerShopView" class="sp-modal-overlay" @click.self="showSellerShopView = false">
        <div class="sp-modal seller-shop-modal">
          <SellerShop
            :seller-id="viewingSellerId"
            @close="showSellerShopView = false"
            @view-product="handleViewProductFromShop"
          />
        </div>
      </div>
    </Transition>

    <!-- ===== 个人信息编辑弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showProfileEdit" class="sp-modal-overlay" @click.self="showProfileEdit = false">
        <div class="sp-modal profile-modal">
          <h3>✨ 编辑我的铺子</h3>
          <div class="sp-profile-form">
            <!-- 头像 -->
            <div class="sp-pf-avatar-section">
              <div class="sp-pf-avatar" @click="handleAvatarUpload">
                <img v-if="editAvatar" :src="editAvatar" class="sp-pf-avatar-img" />
                <span v-else class="sp-pf-avatar-text">{{ editNickname?.[0] || '用' }}</span>
                <span class="sp-pf-avatar-badge">📷</span>
              </div>
              <span class="sp-pf-avatar-hint">点击更换头像</span>
              <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarChange" />
            </div>
            <!-- 昵称 -->
            <div class="sp-pf-field">
              <label>昵称</label>
              <input v-model="editNickname" class="sp-pf-input" placeholder="你的昵称" maxlength="20" />
            </div>
            <!-- 简介 -->
            <div class="sp-pf-field">
              <label>简介</label>
              <textarea v-model="editBio" class="sp-pf-textarea" placeholder="介绍一下自己吧，让买家更了解你..." rows="2" maxlength="100"></textarea>
            </div>
            <!-- 学校 -->
            <div class="sp-pf-field">
              <label>学校</label>
              <input v-model="editSchool" class="sp-pf-input" placeholder="你的学校" maxlength="30" />
            </div>
            <!-- 标签 -->
            <div class="sp-pf-field">
              <label>个人标签</label>
              <div class="sp-pf-tags">
                <button v-for="t in profileTagOptions" :key="t" class="sp-pf-tag"
                  :class="{ active: editTags.includes(t) }" @click="toggleProfileTag(t)">
                  {{ t }}
                </button>
              </div>
            </div>
            <!-- 操作 -->
            <div class="sp-pf-actions">
              <button class="sp-pf-btn cancel" @click="showProfileEdit = false">取消</button>
              <button class="sp-pf-btn save" @click="handleSaveProfile" :disabled="savingProfile">
                {{ savingProfile ? '保存中...' : '✅ 保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 浮动发布按钮 -->
    <button class="sp-fab" @click="showPublish = true">
      <span class="sp-fab-icon">+</span>
      <span class="sp-fab-text">发布</span>
    </button>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toastMsg" class="sp-toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShop, CONDITION_MAP, REVIEW_TAGS_POSITIVE, REVIEW_TAGS_NEGATIVE } from '../../composables/useShop'
import type { ShopProduct, ShopTransaction, SearchParams } from '../../composables/useShop'
import ProductCard from '../../components/shop/ProductCard.vue'
import ProductDetail from '../../components/shop/ProductDetail.vue'
import PublishForm from '../../components/shop/PublishForm.vue'
import ShopChat from '../../components/shop/ShopChat.vue'
import SellerShop from '../../components/shop/SellerShop.vue'

const conditionMapObj = CONDITION_MAP

const {
  categories, products, myProducts, myFavorites, myBuyOrders, mySellOrders, loading, totalCount,
  fetchCategories, searchProducts, getProductDetail, getSellerCredit,
  publishProduct, updateProduct, toggleFavorite, fetchMyFavorites,
  getOrCreateConversation, sendMessage, getSellerShop,
  acceptTransaction, setMeeting, confirmReceive, cancelTransaction,
  fetchMyBuyOrders, fetchMySellOrders, fetchMyProducts,
  submitReview, reportItem,
  fetchSearchHistory, clearSearchHistory,
  shareProductToWall, shareProductToMoment,
  formatTimeAgo,
} = useShop()

// Tab
const activeTab = ref<'home' | 'messages' | 'mine'>('home')
const tabs = [
  { key: 'home' as const, label: '首页', icon: '🏠' },
  { key: 'messages' as const, label: '消息', icon: '💬' },
  { key: 'mine' as const, label: '我的', icon: '👤' },
]

// 筛选/排序
const filterCatId = ref<number | null>(null)
const sortBy = ref<SearchParams['sortBy']>('latest')
const sortOptions = [
  { value: 'latest' as const, label: '最新' },
  { value: 'price_asc' as const, label: '价格↑' },
  { value: 'price_desc' as const, label: '价格↓' },
  { value: 'popular' as const, label: '热门' },
]
const timeFilter = ref<SearchParams['postedWithin']>(undefined)
const timeFilterOptions = [
  { value: undefined as SearchParams['postedWithin'], label: '不限' },
  { value: 'today' as const, label: '今天' },
  { value: '3days' as const, label: '3天' },
  { value: '7days' as const, label: '7天' },
]
const currentPage = ref(1)

// 视图
const activeView = ref<'search' | null>(null)
const showPublish = ref(false)
const detailProduct = ref<ShopProduct | null>(null)
const publishingProduct = ref(false)

// 搜索
const searchKeyword = ref('')
const filterPriceMin = ref<number | undefined>(undefined)
const filterPriceMax = ref<number | undefined>(undefined)
const searchCatId = ref<number | null>(null)
const searchCondition = ref('')
const searchHistory = ref<string[]>([])
const hotKeywords = ['教材', '耳机', '电脑', '考研资料', '平板', '键盘', '自行车']

// 我的
const mineSection = ref<'published' | 'favorites' | 'buy_orders' | 'sell_orders'>('published')
const userName = ref('用户')
const userAvatar = ref('')
const userSchool = ref('')
const userBio = ref('')
const userSparkId = ref('')
const userJoined = ref('')
const userTags = ref<string[]>([])
const creditInfo = ref({ avgRating: 5, goodRate: 100, reviewCount: 0, activeProducts: 0, completedTransactions: 0 })

// 编辑商品
const editingProduct = ref<ShopProduct | null>(null)

// 个人信息编辑
const showProfileEdit = ref(false)
const editNickname = ref('')
const editBio = ref('')
const editSchool = ref('')
const editAvatar = ref('')
const editTags = ref<string[]>([])
const savingProfile = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const profileTagOptions = ['靠谱卖家', '秒回消息', '校园达人', '数码爱好者', '书虫', '运动健将', '生活家', '毕业清仓']

// 等级系统（根据成交量）
const sellerLevel = computed(() => {
  const tx = creditInfo.value.completedTransactions
  const levels = [
    { min: 0, name: '新手卖家', cls: 'lv-new', next: '初级卖家', need: 3 },
    { min: 3, name: '初级卖家', cls: 'lv-junior', next: '中级卖家', need: 10 },
    { min: 10, name: '中级卖家', cls: 'lv-mid', next: '高级卖家', need: 30 },
    { min: 30, name: '高级卖家', cls: 'lv-senior', next: '金牌卖家', need: 100 },
    { min: 100, name: '金牌卖家', cls: 'lv-gold', next: '已满级', need: 999 },
  ]
  const lv = [...levels].reverse().find(l => tx >= l.min) || levels[0]
  const nextLv = levels.find(l => l.min > tx) || levels[levels.length - 1]
  const rangeLow = lv.min
  const rangeHigh = nextLv.min
  const progress = rangeHigh > rangeLow ? Math.min(100, Math.round(((tx - rangeLow) / (rangeHigh - rangeLow)) * 100)) : 100
  return { name: lv.name, cls: lv.cls, next: nextLv.name, remaining: Math.max(0, rangeHigh - tx), progress }
})

// 消息未读
const unreadCount = ref(0)

// 评价
const showReviewModal = ref(false)
const reviewTransaction = ref<ShopTransaction | null>(null)
const reviewRating = ref(0)
const reviewDescMatch = ref(0)
const reviewAttitude = ref(0)
const reviewContent = ref('')
const reviewTags = ref<string[]>([])

function toggleReviewTag(tag: string) {
  const idx = reviewTags.value.indexOf(tag)
  if (idx >= 0) reviewTags.value.splice(idx, 1)
  else if (reviewTags.value.length < 5) reviewTags.value.push(tag)
}

// 分享
const showShareModal = ref(false)
const shareProduct = ref<ShopProduct | null>(null)

// Toast
const toastMsg = ref('')
function showToast(msg: string) { toastMsg.value = msg; setTimeout(() => { toastMsg.value = '' }, 2500) }

// 聊天组件引用
const chatRef = ref<InstanceType<typeof ShopChat> | null>(null)

// ===== 瀑布流双列 =====
const leftColumn = computed(() => products.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => products.value.filter((_, i) => i % 2 === 1))

// ===== Tab 切换 =====
function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'messages') chatRef.value?.loadConversations()
  if (key === 'mine') loadMineData()
}

// ===== 商品浏览 =====
async function refreshProducts() {
  currentPage.value = 1
  await searchProducts({
    keyword: searchKeyword.value || undefined,
    categoryId: filterCatId.value || undefined,
    sortBy: sortBy.value,
    postedWithin: timeFilter.value,
    priceMin: filterPriceMin.value,
    priceMax: filterPriceMax.value,
    page: 1,
  })
}

async function loadMore() {
  currentPage.value++
  await searchProducts({
    keyword: searchKeyword.value || undefined,
    categoryId: filterCatId.value || undefined,
    sortBy: sortBy.value,
    postedWithin: timeFilter.value,
    priceMin: filterPriceMin.value,
    priceMax: filterPriceMax.value,
    page: currentPage.value,
  })
}

// ===== 搜索 =====
async function executeSearch() {
  activeView.value = null
  filterCatId.value = searchCatId.value
  await searchProducts({
    keyword: searchKeyword.value || undefined,
    categoryId: searchCatId.value || undefined,
    condition: searchCondition.value || undefined,
    priceMin: filterPriceMin.value,
    priceMax: filterPriceMax.value,
    sortBy: sortBy.value,
    page: 1,
  })
}

async function handleClearHistory() {
  await clearSearchHistory()
  searchHistory.value = []
  showToast('搜索历史已清除')
}

// ===== 商品详情 =====
async function openDetail(p: ShopProduct) {
  const full = await getProductDetail(p.id)
  if (full) detailProduct.value = full
}

async function handleViewProduct(id: string) {
  const full = await getProductDetail(id)
  if (full) detailProduct.value = full
}

// ===== 收藏 =====
async function handleFavorite(id: string) {
  await toggleFavorite(id)
  if (detailProduct.value?.id === id) {
    detailProduct.value.is_favorited = !detailProduct.value.is_favorited
    detailProduct.value.want_count += detailProduct.value.is_favorited ? 1 : -1
  }
  showToast(detailProduct.value?.is_favorited ? '❤️ 已收藏' : '已取消收藏')
}

// ===== 聊天 =====
async function handleChat(product: ShopProduct) {
  const convId = await getOrCreateConversation(product.id, product.seller_id)
  if (convId) {
    detailProduct.value = null
    activeTab.value = 'messages'
    showToast('💬 已进入聊天')
  }
}

// ===== 发布/编辑 =====
async function handlePublish(data: Record<string, unknown>) {
  publishingProduct.value = true
  if (editingProduct.value) {
    // 编辑模式：更新商品
    const ok = await updateProduct(editingProduct.value.id, data as Partial<ShopProduct>)
    publishingProduct.value = false
    if (ok) {
      showToast('✅ 商品已更新')
      showPublish.value = false
      editingProduct.value = null
      fetchMyProducts()
      refreshProducts()
    } else { showToast('更新失败') }
  } else {
    // 新发布
    const id = await publishProduct(data as Parameters<typeof publishProduct>[0])
    publishingProduct.value = false
    if (id) {
      showToast(data.status === 'draft' ? '💾 草稿已保存' : '🎉 商品已提交审核，审核通过后自动上架！')
      showPublish.value = false
      // 乐观更新：立即添加到本地列表
      fetchMyProducts()
      setTimeout(() => refreshProducts(), 2500)
    } else { showToast('发布失败') }
  }
}

// 编辑商品
function handleEditProduct(p: ShopProduct) {
  editingProduct.value = p
  showPublish.value = true
}

// ===== 分享 =====
function handleShare(product: ShopProduct) {
  shareProduct.value = product
  showShareModal.value = true
}

async function handleShareToWall() {
  if (!shareProduct.value) return
  const ok = await shareProductToWall(shareProduct.value)
  showToast(ok ? '🏫 已分享到校园墙' : '分享失败')
  showShareModal.value = false
}

async function handleShareToMoment() {
  if (!shareProduct.value) return
  const ok = await shareProductToMoment(shareProduct.value)
  showToast(ok ? '📸 已分享到朋友圈' : '分享失败')
  showShareModal.value = false
}

// ===== 举报 =====
async function handleReport(id: string) {
  if (!confirm('确认举报该商品？')) return
  const ok = await reportItem('product', id, '虚假信息', '用户主动举报')
  showToast(ok ? '⚠️ 举报已提交' : '举报失败')
}

// ===== 出价（议价入口） =====
async function handleOffer(product: ShopProduct) {
  const input = prompt(`对「${product.title}」出价（当前 ¥${product.price}）：`, String(Math.round(product.price * 0.9)))
  if (!input) return
  const offerPrice = parseFloat(input)
  if (isNaN(offerPrice) || offerPrice <= 0) { showToast('请输入有效价格'); return }
  // 先进入聊天，再自动发送出价消息
  const convId = await getOrCreateConversation(product.id, product.seller_id)
  if (convId) {
    await sendMessage(convId, `💰 我想出价 ¥${offerPrice} 购买「${product.title}」`, 'text')
    detailProduct.value = null
    activeTab.value = 'messages'
    showToast(`💰 已向卖家出价 ¥${offerPrice}`)
  }
}

// ===== 查看卖家铺子 =====
const showSellerShopView = ref(false)
const viewingSellerId = ref('')

async function handleViewSeller(sellerId: string) {
  viewingSellerId.value = sellerId
  showSellerShopView.value = true
  detailProduct.value = null
}

// 从铺子页点击商品 → 打开详情
async function handleViewProductFromShop(productId: string) {
  showSellerShopView.value = false
  const product = await getProductDetail(productId)
  if (product) detailProduct.value = product
}

// ===== 我的 =====
async function loadMineData() {
  await Promise.all([fetchMyProducts(), fetchMyFavorites(), fetchMyBuyOrders(), fetchMySellOrders()])
  const { supabase } = await import('../../supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    creditInfo.value = await getSellerCredit(user.id)
    const { data: profile } = await supabase.from('spark_profiles')
      .select('nickname, avatar_url, bio, spark_id, university, tags, created_at')
      .eq('user_id', user.id).maybeSingle()
    if (profile) {
      if (profile.nickname) userName.value = profile.nickname
      if (profile.avatar_url) userAvatar.value = profile.avatar_url
      if (profile.bio) userBio.value = profile.bio
      if (profile.spark_id) userSparkId.value = profile.spark_id
      if (profile.university) userSchool.value = profile.university
      if (profile.tags) userTags.value = profile.tags as string[]
      if (profile.created_at) {
        const d = new Date(profile.created_at)
        userJoined.value = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
      }
    }
  }
}

// ===== 个人信息编辑 =====
function handleAvatarUpload() {
  avatarInput.value?.click()
}
function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  // 本地预览
  const reader = new FileReader()
  reader.onload = () => { editAvatar.value = reader.result as string }
  reader.readAsDataURL(file)
}
function toggleProfileTag(tag: string) {
  const idx = editTags.value.indexOf(tag)
  if (idx >= 0) editTags.value.splice(idx, 1)
  else if (editTags.value.length < 4) editTags.value.push(tag)
  else showToast('最多选择4个标签')
}
async function handleSaveProfile() {
  savingProfile.value = true
  const { supabase } = await import('../../supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { savingProfile.value = false; return }

  // 如果选择了新头像文件，先上传
  let avatarUrl = editAvatar.value
  if (editAvatar.value.startsWith('data:')) {
    // 将dataURL转为blob上传
    const res = await fetch(editAvatar.value)
    const blob = await res.blob()
    const ext = blob.type.split('/')[1] || 'png'
    const path = `avatars/${user.id}_shop_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('public-assets').upload(path, blob, { upsert: true })
    if (upErr) { showToast('头像上传失败'); savingProfile.value = false; return }
    const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(path)
    avatarUrl = publicUrl
  }

  // 更新profile
  const updates: Record<string, unknown> = {
    nickname: editNickname.value || undefined,
    bio: editBio.value || undefined,
    university: editSchool.value || undefined,
    avatar_url: avatarUrl || undefined,
    tags: editTags.value.length ? editTags.value : undefined,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('spark_profiles')
    .update(updates).eq('user_id', user.id)

  savingProfile.value = false
  if (error) { showToast('保存失败: ' + error.message); return }

  // 同步到本地显示
  if (editNickname.value) userName.value = editNickname.value
  if (editBio.value) userBio.value = editBio.value
  if (editSchool.value) userSchool.value = editSchool.value
  if (avatarUrl) userAvatar.value = avatarUrl
  if (editTags.value.length) userTags.value = [...editTags.value]

  showProfileEdit.value = false
  showToast('✅ 铺子信息已更新')
}

// 打开编辑弹窗时填充当前数据
function openProfileEdit() {
  editNickname.value = userName.value
  editBio.value = userBio.value
  editSchool.value = userSchool.value
  editAvatar.value = userAvatar.value
  editTags.value = [...userTags.value]
  showProfileEdit.value = true
}

// ===== 卖家操作 =====
async function handleAcceptOrder(id: string) {
  if (!confirm('确认接受该交易？')) return
  if (await acceptTransaction(id)) {
    showToast('✅ 已接受交易')
    fetchMySellOrders()
  }
}
async function handleSetMeeting(id: string) {
  const time = prompt('约定时间（如 3月30日 14:00）：')
  if (!time) return
  const loc = prompt('约定地点（如 图书馆门口）：')
  if (!loc) return
  if (await setMeeting(id, new Date(time).toISOString(), loc)) {
    showToast('🤝 已约定见面')
    fetchMySellOrders()
  }
}

async function handleOffline(id: string) {
  const { toggleProductStatus } = useShop()
  if (await toggleProductStatus(id, 'offline')) {
    showToast('⏸️ 已下架')
    fetchMyProducts()
  }
}
async function handleOnline(id: string) {
  const { toggleProductStatus } = useShop()
  if (await toggleProductStatus(id, 'active')) {
    showToast('▶️ 已上架')
    fetchMyProducts()
  }
}
async function handleDeleteProduct(id: string) {
  if (!confirm('确定删除该商品？')) return
  const { deleteProduct } = useShop()
  if (await deleteProduct(id)) {
    showToast('🗑️ 已删除')
    fetchMyProducts()
  }
}

// ===== 交易 =====
async function handleConfirmReceive(id: string) {
  if (!confirm('确认已收到商品？')) return
  if (await confirmReceive(id)) {
    showToast('✅ 已确认收货')
    fetchMyBuyOrders()
  }
}
async function handleCancelOrder(id: string) {
  const reason = prompt('取消原因：')
  if (!reason) return
  if (await cancelTransaction(id, reason)) {
    showToast('已取消交易')
    fetchMyBuyOrders()
  }
}

// ===== 评价 =====
function openReviewModal(order: ShopTransaction) {
  reviewTransaction.value = order
  reviewRating.value = 5
  reviewDescMatch.value = 5
  reviewAttitude.value = 5
  reviewContent.value = ''
  showReviewModal.value = true
}

async function handleSubmitReview() {
  if (!reviewTransaction.value || reviewRating.value === 0) return
  const ok = await submitReview(
    reviewTransaction.value.id,
    reviewTransaction.value.seller_id,
    reviewRating.value,
    reviewDescMatch.value,
    reviewAttitude.value,
    reviewContent.value || undefined,
    undefined,
    reviewTags.value.length ? [...reviewTags.value] : undefined,
  )
  if (ok) {
    showToast('📝 评价已提交')
    showReviewModal.value = false
    reviewTags.value = []
    fetchMyBuyOrders()
  }
}

function statusLabel(s: string) {
  return { draft: '草稿', pending_review: '审核中', active: '在售', sold: '已售', offline: '已下架', deleted: '已删除' }[s] || s
}
function orderStatusLabel(s: string) {
  return { pending: '待确认', accepted: '已接受', meeting: '约定见面', completed: '已完成', cancelled: '已取消' }[s] || s
}

// ===== 初始化 =====
onMounted(async () => {
  await fetchCategories()
  await refreshProducts()
  searchHistory.value = await fetchSearchHistory()
})
</script>

<style scoped>
.shop-page{min-height:100vh;padding:0 16px 100px;max-width:640px;margin:0 auto;position:relative}

/* 顶栏 */
.sp-topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 0 10px}
.sp-logo{font-size:20px;font-weight:700;color:rgba(255,255,255,.88);margin:0}
.sp-topbar-actions{display:flex;gap:6px}
.sp-icon-btn{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;font-size:16px;padding:6px 10px;cursor:pointer;transition:all .2s}
.sp-icon-btn:hover{background:rgba(79,142,247,.06)}

/* Tab */
.sp-tabs{display:flex;gap:0;padding:3px;background:rgba(255,255,255,.025);border-radius:12px;border:1px solid rgba(255,255,255,.04);margin-bottom:14px}
.sp-tab{flex:1;padding:8px 0;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.3);font-size:11px;font-weight:500;cursor:pointer;transition:all .25s;position:relative}
.sp-tab.active{background:rgba(79,142,247,.12);color:rgba(79,142,247,.85);font-weight:600}
.sp-tab-badge{position:absolute;top:2px;right:12px;padding:1px 4px;border-radius:8px;background:rgba(239,68,68,.8);color:white;font-size:9px;font-weight:700}

/* 搜索栏 */
.sp-search-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);cursor:pointer;margin-bottom:10px;transition:all .2s}
.sp-search-bar:hover{border-color:rgba(79,142,247,.1)}
.sp-search-icon{font-size:14px}
.sp-search-placeholder{font-size:13px;color:rgba(255,255,255,.2)}

/* 分类导航 */
.sp-categories{display:flex;gap:4px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px;scrollbar-width:none}
.sp-categories::-webkit-scrollbar{display:none}
.sp-cat-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.03);background:rgba(255,255,255,.015);cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
.sp-cat-item.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15)}
.sp-cat-icon{font-size:18px}
.sp-cat-name{font-size:9px;color:rgba(255,255,255,.3)}
.sp-cat-item.active .sp-cat-name{color:rgba(79,142,247,.7)}

/* 排序栏 */
.sp-sort-bar{display:flex;gap:4px;margin-bottom:10px}
.sp-sort-btn{padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.25);font-size:10px;cursor:pointer;transition:all .2s}
.sp-sort-btn.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.12);color:rgba(79,142,247,.7)}

/* 瀑布流 */
.sp-waterfall{display:flex;gap:8px}
.sp-waterfall-col{flex:1;display:flex;flex-direction:column;gap:0}

/* 加载 */
.sp-loading{text-align:center;padding:30px}
.sp-spinner{width:24px;height:24px;border:2.5px solid rgba(79,142,247,.1);border-top-color:rgba(79,142,247,.6);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.sp-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:30px}
.sp-load-more{display:block;width:100%;padding:10px;border-radius:10px;border:1px dashed rgba(79,142,247,.12);background:rgba(79,142,247,.02);color:rgba(79,142,247,.4);font-size:12px;cursor:pointer;margin-top:6px}

/* ============ 搜索面板（毛玻璃） ============ */
.sp-search-panel{position:fixed;inset:0;z-index:200;overflow-y:auto}
.sp-search-glass{position:absolute;inset:0;background:rgba(10,8,26,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.sp-search-inner{position:relative;z-index:1;padding:20px;max-width:640px;margin:0 auto}
.sp-search-top{display:flex;gap:8px;margin-bottom:16px}
.sp-search-input-wrap{flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(79,142,247,.15);transition:all .2s}
.sp-search-input-wrap:focus-within{border-color:rgba(79,142,247,.35);box-shadow:0 0 20px rgba(79,142,247,.08)}
.sp-si-icon{font-size:16px;opacity:.5}
.sp-search-input{flex:1;background:none;border:none;color:white;font-size:15px;outline:none}
.sp-search-input::placeholder{color:rgba(255,255,255,.25)}
.sp-si-clear{background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.4);font-size:12px;width:20px;height:20px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sp-search-cancel{background:none;border:none;color:rgba(79,142,247,.7);font-size:14px;cursor:pointer;white-space:nowrap;padding:0 4px;font-weight:500}

/* 搜索分类快捷 */
.sp-search-cats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.sp-scat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);cursor:pointer;transition:all .25s;min-width:60px}
.sp-scat.active{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);transform:scale(1.05)}
.sp-scat-icon{font-size:22px}
.sp-scat-name{font-size:10px;color:rgba(255,255,255,.35)}
.sp-scat.active .sp-scat-name{color:rgba(79,142,247,.8)}

/* 搜索筛选 */
.sp-search-filters{margin-bottom:14px}
.sp-sf-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.sp-sf-label{font-size:12px;color:rgba(255,255,255,.4);width:50px;flex-shrink:0}
.sp-sf-inputs{display:flex;align-items:center;gap:6px;flex:1}
.sp-sf-input{flex:1;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.sp-sf-input::placeholder{color:rgba(255,255,255,.15)}
.sp-sf-dash{color:rgba(255,255,255,.15);font-size:14px}
.sp-sf-chips{display:flex;gap:6px;flex:1;flex-wrap:wrap}
.sp-sf-chip{padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s}
.sp-sf-chip.active{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);color:rgba(79,142,247,.8)}

.sp-search-go{width:100%;padding:12px;border-radius:14px;border:none;background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:20px;transition:all .2s;letter-spacing:1px}
.sp-search-go:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(79,142,247,.3)}

.sp-search-section{margin-bottom:16px}
.sp-ss-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.sp-ss-header span{font-size:13px;color:rgba(255,255,255,.4);font-weight:500}
.sp-ss-header button{background:none;border:none;color:rgba(239,68,68,.4);font-size:11px;cursor:pointer}
.sp-ss-tags{display:flex;flex-wrap:wrap;gap:6px}
.sp-ss-tag{padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
.sp-ss-tag:hover{background:rgba(79,142,247,.05);border-color:rgba(79,142,247,.1)}
.sp-ss-tag.hot{border-color:rgba(249,115,22,.08)}
.sp-ss-rank{font-size:10px;font-weight:700;color:rgba(255,255,255,.2);width:16px;text-align:center}
.sp-ss-rank.top{color:rgba(249,115,22,.7)}

/* ============ 卖家铺子卡片 ============ */
.sp-shop-card{position:relative;border-radius:18px;overflow:hidden;margin-bottom:14px;border:1px solid rgba(79,142,247,.1)}
.sp-shop-bg{position:absolute;inset:0;background:linear-gradient(160deg,rgba(79,142,247,.12),rgba(139,92,246,.08),rgba(249,115,22,.05));z-index:0}
.sp-shop-body{position:relative;z-index:1;padding:18px}
.sp-shop-top{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.sp-shop-avatar-wrap{width:56px;height:56px;border-radius:16px;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#4F8EF7,#f97316);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(79,142,247,.2);position:relative;cursor:pointer}
.sp-shop-avatar-img{width:100%;height:100%;object-fit:cover}
.sp-shop-avatar-text{color:white;font-size:24px;font-weight:700}
.sp-shop-avatar-edit{position:absolute;bottom:-2px;right:-2px;font-size:10px;background:rgba(0,0,0,.6);border-radius:6px;padding:2px 4px}
.sp-shop-user{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.sp-shop-name-row{display:flex;align-items:center;gap:8px}
.sp-shop-name{font-size:18px;font-weight:700;color:rgba(255,255,255,.9)}
.sp-shop-level{padding:2px 8px;border-radius:8px;font-size:9px;font-weight:700;white-space:nowrap}
.sp-shop-level.lv-new{background:rgba(255,255,255,.05);color:rgba(255,255,255,.35)}
.sp-shop-level.lv-junior{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6)}
.sp-shop-level.lv-mid{background:rgba(79,142,247,.08);color:rgba(79,142,247,.7)}
.sp-shop-level.lv-senior{background:rgba(139,92,246,.08);color:rgba(139,92,246,.7)}
.sp-shop-level.lv-gold{background:rgba(249,115,22,.1);color:rgba(249,115,22,.7)}
.sp-shop-school{font-size:11px;color:rgba(255,255,255,.35)}
.sp-shop-id{font-size:10px;color:rgba(79,142,247,.5);font-family:monospace}
.sp-shop-joined{font-size:10px;color:rgba(255,255,255,.2)}
.sp-shop-edit-btn{background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.15);color:rgba(79,142,247,.7);border-radius:10px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;flex-shrink:0;align-self:flex-start}
.sp-shop-edit-btn:hover{background:rgba(79,142,247,.15)}

/* 等级进度条 */
.sp-level-bar{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.04);margin:10px 0;overflow:hidden}
.sp-level-fill{position:absolute;left:0;top:0;height:100%;border-radius:3px;background:linear-gradient(90deg,#4F8EF7,#f97316);transition:width .3s}
.sp-level-text{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:8px;color:rgba(255,255,255,.3);white-space:nowrap;line-height:1}

.sp-shop-stats{display:flex;gap:0;text-align:center}
.sp-stat{flex:1;display:flex;flex-direction:column;gap:1px;padding:8px 0;border-right:1px solid rgba(255,255,255,.04)}
.sp-stat:last-child{border-right:none}
.sp-stat-n{font-size:18px;font-weight:700;color:rgba(79,142,247,.8)}
.sp-stat-l{font-size:9px;color:rgba(255,255,255,.25)}
.sp-shop-bio{font-size:11px;color:rgba(255,255,255,.3);margin:10px 0 0;line-height:1.5;font-style:italic}
.sp-bio-empty{cursor:pointer;opacity:.4;transition:all .2s}
.sp-bio-empty:hover{opacity:.6;color:rgba(79,142,247,.5)}
.sp-shop-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.sp-shop-tag{padding:3px 10px;border-radius:8px;font-size:9px;font-weight:500;background:rgba(79,142,247,.06);color:rgba(79,142,247,.55);border:1px solid rgba(79,142,247,.1)}

/* ============ 个人信息编辑弹窗 ============ */
.profile-modal{max-width:420px}
.sp-profile-form{display:flex;flex-direction:column;gap:14px}
.sp-pf-avatar-section{display:flex;flex-direction:column;align-items:center;gap:6px}
.sp-pf-avatar{width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#4F8EF7,#f97316);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(79,142,247,.2)}
.sp-pf-avatar-img{width:100%;height:100%;object-fit:cover}
.sp-pf-avatar-text{color:white;font-size:28px;font-weight:700}
.sp-pf-avatar-badge{position:absolute;bottom:2px;right:2px;font-size:14px;background:rgba(0,0,0,.5);border-radius:8px;padding:2px 4px}
.sp-pf-avatar-hint{font-size:10px;color:rgba(255,255,255,.2)}
.sp-pf-field{display:flex;flex-direction:column;gap:4px}
.sp-pf-field label{font-size:12px;color:rgba(255,255,255,.4);font-weight:500}
.sp-pf-input{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:14px;outline:none;transition:all .2s}
.sp-pf-input:focus{border-color:rgba(79,142,247,.3);box-shadow:0 0 12px rgba(79,142,247,.06)}
.sp-pf-input::placeholder{color:rgba(255,255,255,.15)}
.sp-pf-textarea{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;resize:none;font-family:inherit;transition:all .2s}
.sp-pf-textarea:focus{border-color:rgba(79,142,247,.3)}
.sp-pf-textarea::placeholder{color:rgba(255,255,255,.15)}
.sp-pf-tags{display:flex;flex-wrap:wrap;gap:6px}
.sp-pf-tag{padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s}
.sp-pf-tag:hover{background:rgba(79,142,247,.04)}
.sp-pf-tag.active{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);color:rgba(79,142,247,.8)}
.sp-pf-actions{display:flex;gap:8px;margin-top:4px}
.sp-pf-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.sp-pf-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.sp-pf-btn.save{background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white}
.sp-pf-btn.save:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(79,142,247,.3)}
.sp-pf-btn:disabled{opacity:.3;cursor:not-allowed}

/* 我的入口 */
.sp-mine-grid{display:flex;gap:6px;margin-bottom:14px}
.sp-mine-entry{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);cursor:pointer;transition:all .2s}
.sp-mine-entry.active{background:rgba(79,142,247,.06);border-color:rgba(79,142,247,.12)}
.sp-mine-entry:hover{background:rgba(79,142,247,.04)}
.sp-entry-icon{font-size:18px}
.sp-entry-num{font-size:18px;font-weight:700;color:rgba(79,142,247,.7)}
.sp-entry-label{font-size:9px;color:rgba(255,255,255,.25)}

/* 我的列表 */
.sp-mine-list h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}
.sp-mine-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:6px;cursor:pointer;transition:all .2s}
.sp-mine-item:hover{border-color:rgba(79,142,247,.1);background:rgba(79,142,247,.02)}
.sp-mine-thumb{width:54px;height:54px;border-radius:10px;object-fit:cover;flex-shrink:0}
.sp-mine-item-info{flex:1;min-width:0}
.sp-mine-item-title{display:block;font-size:13px;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.sp-mine-item-row{display:flex;align-items:center;gap:8px}
.sp-mine-item-price{font-size:15px;font-weight:700;color:#f97316}
.sp-mine-item-meta{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-top:2px}
.sp-mine-item-status{display:inline-block;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:600}
.sp-mine-item-status.active{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6)}
.sp-mine-item-status.sold{background:rgba(79,142,247,.08);color:rgba(79,142,247,.6)}
.sp-mine-item-status.offline{background:rgba(255,255,255,.03);color:rgba(255,255,255,.2)}
.sp-mine-item-status.draft{background:rgba(245,158,11,.08);color:rgba(245,158,11,.5)}
.sp-mine-item-status.pending_review{background:rgba(139,92,246,.08);color:rgba(139,92,246,.6)}
.sp-mine-item-actions{display:flex;gap:4px}
.sp-mine-item-actions button{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:8px;font-size:14px;padding:5px 7px;cursor:pointer;transition:all .2s}
.sp-mine-item-actions button:hover{background:rgba(255,255,255,.06)}

/* 订单卡片 */
.sp-order-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:8px}
.sp-order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.sp-order-status{padding:3px 10px;border-radius:8px;font-size:10px;font-weight:600}
.sp-order-status.pending{background:rgba(245,158,11,.08);color:rgba(245,158,11,.6)}
.sp-order-status.accepted{background:rgba(79,142,247,.08);color:rgba(79,142,247,.6)}
.sp-order-status.meeting{background:rgba(139,92,246,.08);color:rgba(139,92,246,.6)}
.sp-order-status.completed{background:rgba(34,197,94,.08);color:rgba(34,197,94,.6)}
.sp-order-status.cancelled{background:rgba(239,68,68,.08);color:rgba(239,68,68,.5)}
.sp-order-time{font-size:10px;color:rgba(255,255,255,.15)}
.sp-order-body{margin-bottom:8px}
.sp-order-price{font-size:16px;font-weight:700;color:#f97316}
.sp-order-location{display:block;font-size:11px;color:rgba(255,255,255,.25);margin-top:3px}
.sp-order-hint{font-size:11px;color:rgba(245,158,11,.5);font-style:italic}

/* 交易进度条 */
.sp-order-progress{display:flex;align-items:center;gap:0;margin:10px 0;padding:8px 0}
.sp-progress-step{font-size:9px;color:rgba(255,255,255,.15);white-space:nowrap;font-weight:500}
.sp-progress-step.done{color:rgba(79,142,247,.7)}
.sp-progress-line{flex:1;height:2px;background:rgba(255,255,255,.04);margin:0 4px;border-radius:1px}
.sp-progress-line.done{background:linear-gradient(90deg,rgba(79,142,247,.5),rgba(79,142,247,.3))}

.sp-order-actions{display:flex;gap:6px;margin-top:6px}
.sp-order-btn{padding:8px 16px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.sp-order-btn.confirm{background:rgba(34,197,94,.1);color:rgba(34,197,94,.7)}
.sp-order-btn.confirm:hover{background:rgba(34,197,94,.15)}
.sp-order-btn.cancel{background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}
.sp-order-btn.review{background:rgba(79,142,247,.1);color:rgba(79,142,247,.7)}

/* 弹窗 */
.sp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.sp-modal{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(79,142,247,.12);border-radius:20px;padding:20px}
.sp-modal.small{max-width:320px}
.sp-modal.detail-modal{padding:0;max-width:500px}
.sp-modal.publish-modal{max-width:520px}
.sp-modal.review-modal{max-width:400px}
.sp-modal h3{font-size:16px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 14px;text-align:center}
.sp-publish-tip{text-align:center;font-size:11px;color:rgba(139,92,246,.5);margin-top:10px;padding:6px;border-radius:8px;background:rgba(139,92,246,.04)}

/* FAB */
.sp-fab{position:fixed;bottom:90px;right:20px;z-index:100;display:flex;align-items:center;gap:4px;padding:12px 18px;border-radius:50px;border:none;background:linear-gradient(135deg,#4F8EF7,#f97316);color:white;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 24px rgba(79,142,247,.3);transition:all .25s}
.sp-fab:hover{transform:scale(1.05);box-shadow:0 6px 30px rgba(79,142,247,.4)}
.sp-fab-icon{font-size:18px;font-weight:300}
.sp-fab-text{font-size:12px}

/* 评价弹窗 */
.sp-review-form{display:flex;flex-direction:column;gap:10px}
.sp-review-field{display:flex;align-items:center;gap:10px}
.sp-review-field label{font-size:12px;color:rgba(255,255,255,.4);width:60px;flex-shrink:0}
.sp-stars{display:flex;gap:2px}
.sp-star{background:none;border:none;font-size:18px;cursor:pointer;opacity:.3;transition:all .15s}
.sp-star.active{opacity:1}
.sp-review-textarea{padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;resize:none;font-family:inherit}
.sp-review-textarea::placeholder{color:rgba(255,255,255,.15)}
.sp-review-actions{display:flex;gap:6px}
.sp-review-btn{flex:1;padding:10px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer}
.sp-review-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.sp-review-btn.submit{background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white}
.sp-review-btn:disabled{opacity:.3}

/* 分享弹窗 */
.sp-share-grid{display:flex;gap:8px;margin-bottom:12px}
.sp-share-btn{flex:1;padding:16px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;text-align:center;transition:all .2s}
.sp-share-btn:hover{background:rgba(79,142,247,.05);border-color:rgba(79,142,247,.1)}
.sp-share-close{width:100%;padding:10px;border-radius:10px;border:none;background:rgba(255,255,255,.03);color:rgba(255,255,255,.3);font-size:12px;cursor:pointer}

/* 通用动画 */
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}
.slide-enter-active{transition:all .3s cubic-bezier(.4,0,.2,1)}.slide-leave-active{transition:all .25s ease-in}
.slide-enter-from{transform:translateY(20px);opacity:0}.slide-leave-to{transform:translateY(-10px);opacity:0}

.sp-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(79,142,247,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:300;box-shadow:0 4px 20px rgba(79,142,247,.3)}

/* 评价标签快选 */
.sp-review-tags-wrap{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.sp-rvtag{padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s}
.sp-rvtag.positive.active{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.2);color:rgba(34,197,94,.7)}
.sp-rvtag.negative.active{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);color:rgba(239,68,68,.6)}
.sp-rvtag:hover{border-color:rgba(255,255,255,.1)}

/* 卖家铺子弹窗 */
.seller-shop-modal{max-width:480px;width:92vw;max-height:92vh}

/* 订单关联商品 */
.sp-order-product{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(79,142,247,.03);border:1px solid rgba(79,142,247,.06);margin:6px 0;cursor:pointer;transition:all .2s}
.sp-order-product:hover{background:rgba(79,142,247,.06)}
.sp-op-img{width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0}
.sp-op-info{flex:1;min-width:0}
.sp-op-title{display:block;font-size:12px;color:rgba(255,255,255,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-op-price{display:block;font-size:13px;font-weight:700;color:rgba(249,115,22,.7)}

/* 排序分隔符 */
.sp-sort-divider{color:rgba(255,255,255,.08);font-size:12px;padding:0 2px;display:flex;align-items:center}
.sp-sort-btn.time.active{color:rgba(139,92,246,.7);border-color:rgba(139,92,246,.12)}
</style>
