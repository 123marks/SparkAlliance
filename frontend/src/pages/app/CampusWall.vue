<template>
  <div class="wall-layout">
    <!-- ========== 左侧栏 ========== -->
    <aside class="wall-left">
      <div class="left-inner">
        <!-- 页面标题 -->
        <div class="left-brand">
          <img src="/spark-logo.png" alt="Spark" class="brand-logo" />
          <div>
            <h1 class="brand-title">星火墙</h1>
            <p class="brand-sub">校园动态、圈子、活动，一墙可见</p>
          </div>
        </div>

        <!-- 垂直 Tab 导航 -->
        <nav class="left-nav">
          <button v-for="tab in sideTabList" :key="tab.key" class="nav-item" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.key }}</span>
          </button>
        </nav>

        <!-- 快速筛选 -->
        <div class="quick-filter-row">
          <button v-for="f in quickFilterList" :key="f" class="qf-chip" :class="{ active: activeQuickFilter === f }" @click="activeQuickFilter = f">{{ f }}</button>
        </div>

        <!-- 用户档案卡 -->
        <div v-if="user" class="profile-card">
          <div class="pc-header">
            <div class="pc-avatar-ring">
              <SparkAvatar
                :avatar-url="myProfile.avatar_url"
                :name="displayName"
                size="lg"
                class="pc-avatar-comp"
              />
            </div>
            <div class="pc-info">
              <span class="pc-name">{{ displayName }} ✨</span>
              <div class="pc-level-badge">
                <span class="level-icon">⚡</span>
                <span>Lv.{{ myProfile.level || 12 }}</span>
                <span class="level-title">星火守护者</span>
              </div>
              <div class="pc-xp-row">
                <div class="xp-bar"><div class="xp-fill" :style="{ width: `${(1680/2500)*100}%` }"></div></div>
                <span class="xp-text">1680 / 2500 经验值</span>
              </div>
            </div>
          </div>
          <div class="pc-stats">
            <div class="pc-stat">
              <span class="pc-num">{{ activityIndex }}</span>
              <span class="pc-label">活跃指数</span>
            </div>
            <div class="pc-stat">
              <span class="pc-num">{{ activityStreak }}<small>天</small></span>
              <span class="pc-label">连续活跃</span>
            </div>
            <div class="pc-stat">
              <span class="pc-num">{{ myPostCount }}</span>
              <span class="pc-label">发帖</span>
            </div>
          </div>
          <!-- 连续活跃 -->
          <div class="streak-row">
            <span class="streak-icon">🔥</span>
            <span class="streak-text">连续活跃 <strong>{{ activityStreak }}</strong> 天</span>
          </div>
          <div class="streak-hint">再连续 {{ Math.max(1, 7 - (activityStreak % 7)) }} 天可获得奖章道具</div>
          <!-- 活跃日历迷你版 -->
          <div class="mini-calendar">
            <div
              v-for="d in last14Days.slice(-7)"
              :key="d.date"
              class="cal-dot"
              :class="{ active: d.hasPost }"
              :title="d.label"
            >
              <span class="cal-day">{{ d.label.split('/')[1] }}</span>
            </div>
          </div>
        </div>

        <!-- 今日任务 -->
        <div class="left-section">
          <div class="ls-header">
            <h4 class="ls-title">📋 今日任务</h4>
            <button class="ls-action" @click="refreshDailyTasks">刷新</button>
          </div>
          <div class="task-item" v-for="task in dailyTasks" :key="task.id">
            <span class="task-check" :class="{ done: task.done }">{{ task.done ? '✓' : '' }}</span>
            <span class="task-text" :class="{ done: task.done }">{{ task.label }}</span>
            <span class="task-progress">({{ task.current }}/{{ task.target }})</span>
            <span v-if="!task.done" class="task-go">去完成</span>
          </div>
          <p class="task-footer">完成任务可获得经验和徽章道具</p>
        </div>

        <!-- 校园热度值 -->
        <div class="heat-card">
          <div class="heat-top">
            <span class="heat-label">校园热度值</span>
          </div>
          <div class="heat-row">
            <span class="heat-num">{{ campusHeatScore.toLocaleString() }}</span>
            <span class="heat-badge" :class="trendDirection">
              {{ trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→' }}
              {{ trendDelta }}
            </span>
          </div>
          <span class="heat-sub">校苑日</span>
        </div>
      </div>
    </aside>

    <!-- ========== 中间 Feed 主区域 ========== -->
    <main class="wall-main">
      <!-- Feed 顶栏（发布入口 + 快捷操作） -->
      <div class="feed-topbar">
        <div class="compose-entry" @click="toggleComposer">
          <div class="compose-avatar">
            <SparkAvatar
              :avatar-url="myProfile.avatar_url"
              :name="displayName"
              size="sm"
              class="compose-avatar-img"
            />
          </div>
          <span class="compose-placeholder">分享你的校园新鲜事，问题或活动...</span>
        </div>
        <div class="quick-actions">
          <button class="qa-btn qa-primary" @click="toggleComposer"><span>✏️</span> 发动态</button>
          <button class="qa-btn" @click="openQuickPost('event')"><span>📅</span> 发活动</button>
          <button class="qa-btn" @click="openQuickPost('vote')"><span>📊</span> 发投票</button>
          <button class="qa-btn" @click="openQuickPost('confession')"><span>🕳️</span> 匿名树洞</button>
          <button class="qa-btn" @click="openQuickPost('help')"><span>🙋</span> 求助</button>
          <button class="qa-btn" @click="toggleComposer"><span>🖼️</span> 图片/视频</button>
        </div>
      </div>

      <!-- 热门标签（始终可见） -->
      <div v-if="!isLoading && trendingTags.length > 0" class="wall-trending">
        <span class="wt-label">🔥 热门</span>
        <button v-for="t in trendingTags.slice(0, 8)" :key="t.tag" class="wt-tag" :class="{ active: activeTagFilter === t.tag }" @click="filterByTag(t.tag)">
          #{{ t.tag }} <span class="wt-count">{{ t.count }}</span>
        </button>
        <button v-if="activeTagFilter" class="wt-clear" @click="activeTagFilter = null">✕ 清除筛选</button>
      </div>

      <!-- 骨架屏加载 -->
      <div v-if="isLoading" class="feed-list">
        <div class="skeleton-card" v-for="i in 3" :key="i">
          <div class="skel-header">
            <div class="skel skel-avatar"></div>
            <div class="skel-lines">
              <div class="skel skel-line w60"></div>
              <div class="skel skel-line w40"></div>
            </div>
          </div>
          <div class="skel skel-block"></div>
          <div class="skel skel-line w80"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredPosts.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
        </div>
        <h3>这里还没有内容</h3>
        <p>{{ emptyStateHint }}</p>
        <button class="empty-btn" v-if="canPost" @click="toggleComposer">发布动态</button>
      </div>

      <!-- 帖子流 -->
      <div v-else class="feed-list">
        <div class="post-card" v-for="post in filteredPosts" :key="post.id" :data-post-id="post.id">
          <!-- 帖子头部 -->
          <div class="post-header">
            <div class="p-author">
              <div class="p-avatar" :style="{ background: getPostAuthorDisplay(post).avatarBg }">
                <svg v-if="getPostAuthorDisplay(post).isAnonymous" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"></path></svg>
                <span v-else>{{ getPostAuthorDisplay(post).initial }}</span>
              </div>
              <div class="p-info">
                <h4>{{ getPostAuthorDisplay(post).name }}
                  <span v-if="post.school && !post.isAnonymous" class="school-badge">{{ post.school }}</span>
                  <span class="tag" :class="post.categoryClass">{{ post.categoryLabel }}</span>
                  <span v-if="post.mood" class="post-mood-chip" :title="post.mood">{{ post.mood }}</span>
                </h4>
                <span class="time">{{ post.time }}</span>
              </div>
            </div>
            <!-- 更多操作下拉 -->
            <div class="more-wrapper">
              <button class="more-btn" @click.stop="toggleDropdown(post.id)">•••</button>
              <Transition name="dropdown">
                <div v-if="activeDropdown === post.id" class="dropdown-menu" @click.stop>
                  <button v-if="post.authorId === user?.id" class="dropdown-item danger" @click="deletePost(post)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    删除
                  </button>
                  <button v-if="post.authorId !== user?.id" class="dropdown-item" @click="activeDropdown = null; openReport(post)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                    举报
                  </button>
                  <button class="dropdown-item" @click="activeDropdown = null">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    取消
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 帖子内容（长内容折叠） -->
          <div class="post-content" :class="{ collapsed: !expandedPosts.has(post.id) && post.content.length > 200 }">
            <p>{{ post.content }}</p>
          </div>
          <button v-if="post.content.length > 200 && !expandedPosts.has(post.id)" class="expand-btn" @click="expandedPosts.add(post.id)">展开全文 ▾</button>

          <!-- 帖子媒体 -->
          <div class="post-media" v-if="post.mediaUrls?.length">
            <div class="media-grid" :class="`grid-${Math.min(post.mediaUrls.length, 3)}`">
              <div v-for="(url, i) in post.mediaUrls.slice(0, 3)" :key="i" class="media-cell">
                <!-- 视频文件用 video 标签 -->
                <div v-if="isVideoUrl(url)" class="media-video-wrap">
                  <video v-if="isReliableVideoUrl(url)" :src="url" class="media-img" controls playsinline preload="metadata" loading="lazy" @error="(e: Event) => (e.target as HTMLVideoElement).style.display='none'" />
                  <a v-else :href="url" target="_blank" rel="noreferrer" class="video-fallback-tip">该视频编码兼容性较差，请重新上传 H.264 MP4</a>
                </div>
                <!-- 图片文件用 img 标签 -->
                <img v-else :src="url" class="media-img" loading="lazy" @click="openLightbox(url)" @error="(e: Event) => (e.target as HTMLImageElement).style.display='none'" />
                <div class="more-overlay" v-if="i === 2 && post.mediaUrls.length > 3">
                  +{{ post.mediaUrls.length - 3 }}
                </div>
              </div>
            </div>
          </div>

          <!-- 帖子标签 -->
          <div class="post-tags" v-if="post.tags.length">
            <span class="p-tag" v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
          </div>

          <!-- 表情快速回应 -->
          <div v-if="getPostReactions(post.id).length > 0" class="post-reactions">
            <button
              v-for="r in getPostReactions(post.id)"
              :key="r.emoji"
              class="reaction-chip"
              :class="{ mine: r.mine }"
              @click="toggleReaction(post.id, r.emoji)"
            >
              {{ r.emoji }} <span>{{ r.count }}</span>
            </button>
          </div>
          <!-- 帖子操作栏 -->
          <div class="post-actions">
            <button class="action-btn" :class="{ active: post.liked }" @click="toggleLike(post)">
              <svg width="18" height="18" viewBox="0 0 24 24" :fill="post.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              {{ post.likes }}
            </button>
            <button class="action-btn" @click="openComments(post)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              {{ post.comments }}
            </button>
            <!-- 表情回应选择器 -->
            <div class="reaction-trigger-wrap">
              <button class="action-btn" @click.stop="toggleReactionPicker(post.id)">
                😊 回应
              </button>
              <Transition name="dropdown">
                <div v-if="activeReactionPicker === post.id" class="reaction-picker" @click.stop>
                  <button v-for="e in REACTION_EMOJIS" :key="e" class="rp-emoji" @click="toggleReaction(post.id, e); activeReactionPicker = null">{{ e }}</button>
                </div>
              </Transition>
            </div>
            <button class="action-btn" @click="sharePost(post)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              分享
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- ========== 右侧栏 ========== -->
    <aside class="wall-right">
      <div class="right-inner">
        <!-- 发布入口 -->
        <button class="right-publish-btn" @click="toggleComposer">
          <span class="rpb-icon">✏️</span>
          <span>发布动态</span>
        </button>

        <!-- 今日热榜 -->
        <div class="right-section">
          <h4 class="rs-title">🔥 今日热榜</h4>
          <div class="hot-list">
            <div v-for="(item, i) in hotRankList" :key="item.id" class="hot-item" @click="scrollToPost(item.id)">
              <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
              <span class="hot-text">{{ item.preview }}</span>
              <span class="hot-heat">{{ item.heat }}</span>
            </div>
            <div v-if="hotRankList.length === 0" class="hot-empty">暂无热门内容</div>
          </div>
        </div>

        <!-- 推荐圈子 -->
        <div class="right-section">
          <h4 class="rs-title">💬 推荐圈子</h4>
          <div class="circle-list">
            <div v-for="c in recommendedCircles" :key="c.name" class="circle-item">
              <span class="circle-icon">{{ c.icon }}</span>
              <div class="circle-info">
                <span class="circle-name">{{ c.name }}</span>
                <span class="circle-count">{{ c.members }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 本周活动日历 -->
        <div class="right-section">
          <h4 class="rs-title">📅 本周活动日历</h4>
          <div class="activity-calendar">
            <div v-for="evt in weeklyEvents" :key="evt.date" class="cal-event">
              <span class="cal-date">{{ evt.date }}</span>
              <div class="cal-detail">
                <span class="cal-event-name">{{ evt.name }}</span>
                <span class="cal-event-info">{{ evt.info }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 校园热搜 -->
        <div class="right-section">
          <h4 class="rs-title">🔍 校园热搜</h4>
          <div class="hot-search-chips">
            <button v-for="kw in campusHotSearch" :key="kw" class="hs-chip" @click="searchQuery = kw">{{ kw }}</button>
          </div>
        </div>

        <!-- 实时动态 -->
        <div class="right-section">
          <h4 class="rs-title">⚡ 实时动态</h4>
          <div class="rt-stats-row">
            <span class="rt-stat">👥 在线 <strong>{{ onlineCount.toLocaleString() }}</strong> 人</span>
            <span class="rt-stat">今日 <strong>{{ wallStats.todayPosts.toLocaleString() }}</strong> 条</span>
          </div>
          <div class="rt-chart">
            <svg viewBox="0 0 240 60" class="rt-chart-svg">
              <defs>
                <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path :d="rtChartAreaPath" fill="url(#rtGrad)" />
              <path :d="rtChartLinePath" fill="none" stroke="#8b5cf6" stroke-width="2" />
            </svg>
            <div class="rt-chart-labels">
              <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span>
            </div>
          </div>
          <div class="realtime-list">
            <div v-for="item in realtimeFeed" :key="item.id" class="rt-item">
              <span class="rt-avatar">{{ item.initial }}</span>
              <div class="rt-content">
                <span class="rt-text">{{ item.text }}</span>
                <span class="rt-time">{{ item.time }}</span>
              </div>
            </div>
            <div v-if="realtimeFeed.length === 0" class="hot-empty">暂无实时动态</div>
          </div>
        </div>

        <!-- AI 话题助手 -->
        <div class="right-section ai-helper">
          <h4 class="rs-title">🤖 AI 话题助手</h4>
          <p class="ai-desc">生成一篇关于时间管理的校园段落分析</p>
          <div class="ai-suggestions">
            <button v-for="s in aiSuggestions" :key="s" class="ai-chip" @click="applyAiSuggestion(s)">{{ s }}</button>
          </div>
        </div>

        <!-- 校园信任与安全 -->
        <div class="right-section trust-section">
          <h4 class="rs-title">🛡️ 校园信任与安全</h4>
          <div class="trust-chips">
            <span class="trust-chip"><span class="tc-icon">👤</span> 校园认证</span>
            <span class="trust-chip"><span class="tc-icon">📋</span> 内容审核</span>
            <span class="trust-chip"><span class="tc-icon">🔒</span> 隐私保护</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- FAB 浮动按钮（移动端使用） -->
    <button v-if="canPost" class="fab" :class="{ active: composerExpanded }" @click="toggleComposer">
      <span class="cross">+</span>
    </button>

    <!-- 发布面板 Modal（Teleport 到 body） -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="composerExpanded" class="composer-overlay" @click.self="toggleComposer">
          <div class="composer-modal">
            <!-- 顶部 -->
            <div class="modal-header">
              <img src="/spark-logo.png" alt="Spark" class="modal-avatar-img" />
              <h3>发布新动态</h3>
              <button class="modal-close" @click="toggleComposer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <!-- 分类选择器 -->
            <div class="category-picker">
              <button v-for="cat in categories" :key="cat.value" class="cat-chip" :class="{ active: selectedCategory === cat.value }" :style="{ '--cat-color': cat.color }" @click="selectedCategory = cat.value">{{ cat.label }}</button>
            </div>
            <p v-if="selectedCategory === 'other'" class="composer-hint">自定义类型将显示在帖子标签旁，与下方话题标签不同。</p>
            <input
              v-if="selectedCategory === 'other'"
              v-model="customCategoryText"
              class="custom-cat-input"
              maxlength="16"
              placeholder="输入类型名称，如：组队、寻物、讲座…"
            />

            <!-- 心情 / 状态 -->
            <div class="mood-picker">
              <span class="mood-label">此刻状态</span>
              <div class="mood-chips">
                <button
                  v-for="m in moodPresets"
                  :key="m.value || 'none'"
                  type="button"
                  class="mood-chip"
                  :class="{ active: selectedMood === m.value }"
                  @click="selectedMood = m.value; if (m.value !== 'custom') moodCustom = ''"
                >{{ m.label }}</button>
              </div>
              <input
                v-if="selectedMood === 'custom'"
                v-model="moodCustom"
                class="custom-mood-input"
                maxlength="12"
                placeholder="自定义状态，如：赶 ddl、在图书馆…"
              />
            </div>

            <!-- 自定义标签输入 -->
            <div class="tags-input-area">
              <div class="tags-list">
                <span class="c-tag" v-for="(tag, i) in customTags" :key="i">
                  #{{ tag }}
                  <button class="tag-remove" @click="customTags.splice(i, 1)">×</button>
                </span>
              </div>
              <input v-model="tagInput" class="tag-input" placeholder="输入标签后按回车添加..." @keydown.enter.prevent="addTag" maxlength="15" />
            </div>

            <!-- 文本输入 -->
            <div class="textarea-wrapper">
              <textarea v-model="newPostContent" placeholder="写下你想说的..." class="c-textarea" rows="4" :maxlength="500"></textarea>
              <span class="char-count" :class="{ over: newPostContent.length >= 500 }">{{ newPostContent.length }} / 500</span>
            </div>

            <!-- 媒体预览区 -->
            <div class="media-preview" v-if="previewUrls.length">
              <div class="preview-item" v-for="(url, i) in previewUrls" :key="i">
                <img v-if="selectedFiles[i]?.type.startsWith('image')" :src="url" class="preview-img" />
                <video v-else-if="selectedFiles[i]?.type.startsWith('video')" :src="url" class="preview-img" muted playsinline preload="metadata" />
                <div v-else class="preview-file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ selectedFiles[i]?.name }}</span>
                </div>
                <button class="remove-btn" @click="removeFile(i)">×</button>
              </div>
            </div>

            <!-- 工具栏 -->
            <div class="c-toolbar">
              <div class="c-tools">
                <button class="tool-btn" @click="imageInputRef?.click()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  图片
                </button>
                <button class="tool-btn" @click="fileInputRef?.click()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  文件
                </button>
                <label class="anon-toggle">
                  <input type="checkbox" v-model="isAnonymous" />
                  <span>匿名发布</span>
                </label>
              </div>
              <div class="c-actions">
                <button class="c-cancel" @click="toggleComposer">取消</button>
                <button class="c-submit" @click="submitPost" :disabled="!newPostContent.trim() || isSubmitting || newPostContent.length > 500">
                  {{ isSubmitting ? '发布中...' : '发布' }}
                </button>
              </div>
            </div>

            <!-- 隐藏文件输入 -->
            <input ref="imageInputRef" type="file" accept="image/*,.mp4,.webm,.ogg,video/mp4,video/webm,video/ogg" multiple hidden @change="onImagesSelected" />
            <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip" hidden @change="onImagesSelected" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 评论侧滑抽屉 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="commentDrawerOpen" class="drawer-overlay" @click.self="commentDrawerOpen = false">
          <div class="comment-drawer">
            <!-- 抽屉头部 -->
            <div class="drawer-header">
              <h3>评论 · {{ activePostForComment?.comments }}</h3>
              <button class="modal-close" @click="commentDrawerOpen = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <!-- 原帖摘要 -->
            <div class="original-post-preview">
              <p>{{ activePostForComment?.content?.slice(0, 80) }}{{ (activePostForComment?.content?.length ?? 0) > 80 ? '...' : '' }}</p>
            </div>

            <!-- 评论列表 -->
            <div class="comment-list">
              <div v-if="commentLoading" class="comment-loading">
                <div class="skel skel-line w80" v-for="i in 3" :key="i"></div>
              </div>
              <div v-else-if="commentList.length === 0" class="comment-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4;margin-bottom:8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <p>还没有评论，来说点什么吧</p>
              </div>
              <div v-else class="comment-item" v-for="comment in commentList" :key="comment.id" :class="{ 'comment-hidden': comment.isHidden && !comment.isOwn }">
                <!-- 被隐藏的评论（非作者看到占位信息） -->
                <template v-if="comment.isHidden && !comment.isOwn">
                  <div class="hidden-comment-placeholder">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    <span>该评论因违规已被隐藏</span>
                  </div>
                </template>
                <!-- 正常评论 / 作者看到自己被隐藏的评论 -->
                <template v-else>
                  <div class="c-avatar-sm" :style="{ background: getCommentAuthorDisplay(comment).avatarBg }">
                    <span v-if="getCommentAuthorDisplay(comment).isAnonymous" class="anon-label">匿名</span>
                    <span v-else>{{ getCommentAuthorDisplay(comment).initial }}</span>
                  </div>
                  <div class="c-body">
                    <!-- 作者自己被隐藏的提示条 -->
                    <div v-if="comment.isHidden && comment.isOwn" class="hidden-own-banner">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      <span>此评论已被隐藏，仅你可见</span>
                      <button class="appeal-btn" @click="openAppeal(comment)">申诉</button>
                    </div>
                    <div class="c-meta">
                      <span class="c-name">{{ getCommentAuthorDisplay(comment).name }}</span>
                      <span class="c-time">{{ comment.time }}</span>
                      <button v-if="comment.isOwn" class="c-delete" @click="deleteComment(comment.id)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        删除
                      </button>
                    </div>
                    <!-- 回复标记 -->
                    <div class="c-reply-tag" v-if="comment.replyToName">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                      回复 @{{ comment.replyToName }}
                    </div>
                    <p class="c-text" v-if="comment.content" :class="{ 'text-muted': comment.isHidden }">{{ comment.content }}</p>
                    <!-- 评论媒体：图片可放大 + 视频可播放 -->
                    <div class="c-media" v-if="comment.mediaUrls.length && !comment.isHidden">
                      <template v-for="(url, i) in comment.mediaUrls" :key="i">
                        <div v-if="isVideoUrl(url)" class="comment-video-wrap">
                          <video v-if="isReliableVideoUrl(url)" :src="url" class="c-media-video" controls playsinline preload="metadata"
                                 @error="(e: Event) => (e.target as HTMLVideoElement).style.display='none'" />
                          <a v-else :href="url" target="_blank" rel="noreferrer" class="video-fallback-tip">该视频编码兼容性较差，请重新上传 H.264 MP4</a>
                        </div>
                        <img v-else :src="url" class="c-media-img" @click="openLightbox(url)"
                             @error="(e: Event) => (e.target as HTMLImageElement).style.display='none'" />
                      </template>
                    </div>
                    <!-- 评论互动栏（点赞 + 回复 + 举报） -->
                    <div class="c-interact">
                      <button class="c-like-btn" :class="{ liked: comment.liked }" @click="toggleCommentLike(comment)">
                        <svg width="14" height="14" viewBox="0 0 24 24" :fill="comment.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        {{ comment.likeCount || '' }}
                      </button>
                      <button class="c-reply-btn" @click="setReplyTo(comment)">回复</button>
                      <button v-if="!comment.isOwn" class="c-report-btn" @click="openCommentReport(comment)" title="举报此评论">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                        举报
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 评论输入区 -->
            <div class="comment-input-area">
              <div class="comment-media-preview" v-if="commentPreviewUrls.length">
                <div class="cp-item" v-for="(url, i) in commentPreviewUrls" :key="i">
                  <video v-if="commentFiles[i]?.type.startsWith('video')" :src="url" class="cp-img" muted playsinline preload="metadata" />
                  <img v-else :src="url" class="cp-img" />
                  <button class="remove-btn" @click="removeCommentFile(i)">×</button>
                </div>
              </div>
              <div class="comment-input-row">
                <SparkAvatar
                  :avatar-url="myProfile.avatar_url"
                  :name="displayName"
                  size="sm"
                  class="c-avatar-self"
                />
                <div class="comment-field">
                  <!-- 回复标记 -->
                  <div class="reply-indicator" v-if="replyToComment">
                    回复 @{{ replyToComment.authorName }}
                    <button class="reply-cancel" @click="replyToComment = null">×</button>
                  </div>
                  <textarea v-model="newCommentText" :placeholder="replyToComment ? `回复 @${replyToComment.authorName}...` : '写下你的评论...'" class="comment-textarea" rows="2" :maxlength="300"></textarea>
                  <div class="comment-actions-row">
                    <div class="comment-tools">
                      <button class="media-tool-btn" @click="commentImageInputRef?.click()" title="图片/GIF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span>图片</span>
                      </button>
                      <button class="media-tool-btn" @click="commentVideoInputRef?.click()" title="视频">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        <span>视频</span>
                      </button>
                      <button class="media-tool-btn" @click="showEmojiPicker = !showEmojiPicker" title="表情">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                        <span>表情</span>
                      </button>
                      <label class="anon-toggle-sm">
                        <input type="checkbox" v-model="isCommentAnonymous" />
                        <span>匿名</span>
                      </label>
                    </div>
                    <button class="comment-submit" @click="submitComment"
                            :disabled="(!newCommentText.trim() && commentFiles.length === 0) || isSubmittingComment">
                      {{ isSubmittingComment ? '...' : '发送' }}
                    </button>
                  </div>
                  <!-- 表情选择器 -->
                  <div class="emoji-picker" v-if="showEmojiPicker">
                    <button v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="insertEmoji(emoji)">{{ emoji }}</button>
                  </div>
                </div>
              </div>
              <input ref="commentImageInputRef" type="file"
                     accept="image/*,.gif,.svg,.webp" multiple hidden
                     @change="onCommentFileSelected" />
              <input ref="commentVideoInputRef" type="file"
                     accept=".mp4,.webm,.ogg,video/mp4,video/webm,video/ogg" hidden
                     @change="onCommentFileSelected" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 举报 Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="reportModalOpen" class="composer-overlay" @click.self="reportModalOpen = false">
          <div class="report-modal">
            <div class="modal-header">
              <h3>⚠️ 举报内容</h3>
              <button class="modal-close" @click="reportModalOpen = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <!-- 举报类型选择 -->
            <p class="report-tip">请选择举报类型（必填）</p>
            <div class="report-categories">
              <button v-for="cat in reportCategories" :key="cat.value"
                class="report-cat-item" :class="{ active: reportCategory === cat.value }"
                @click="reportCategory = cat.value">
                <span class="rcat-icon">{{ cat.icon }}</span>
                <div class="rcat-info">
                  <span class="rcat-label">{{ cat.label }}</span>
                  <span class="rcat-desc">{{ cat.desc }}</span>
                </div>
                <span class="rcat-check" v-if="reportCategory === cat.value">✓</span>
              </button>
            </div>

            <!-- 详细描述 -->
            <div class="report-desc-area">
              <label>补充说明（选填，但有助于更快处理）</label>
              <textarea v-model="reportDescription" placeholder="请描述具体情况..." class="c-textarea" rows="3" :maxlength="500"></textarea>
            </div>

            <!-- 证据上传 -->
            <div class="report-evidence">
              <label>上传证据截图（最多3张，选填）</label>
              <div class="evidence-preview" v-if="reportEvidencePreviewUrls.length">
                <div class="preview-item" v-for="(url, i) in reportEvidencePreviewUrls" :key="i">
                  <img :src="url" class="preview-img" />
                  <button class="remove-btn" @click="removeEvidence(i)">×</button>
                </div>
              </div>
              <button class="tool-btn evidence-upload-btn"
                      v-if="reportEvidenceFiles.length < 3"
                      @click="reportEvidenceInputRef?.click()">+ 添加截图证据</button>
              <input ref="reportEvidenceInputRef" type="file" accept="image/*" multiple hidden @change="onEvidenceSelected" />
            </div>

            <!-- 防恶意举报声明 -->
            <p class="report-disclaimer">
              ⚠️ 恶意举报将影响你的账号信誉，情节严重者账号将被限制使用。每位用户对同一帖子仅可举报一次。
            </p>

            <!-- 底部操作 -->
            <div class="c-actions" style="justify-content: flex-end; margin-top: 16px;">
              <button class="c-cancel" @click="reportModalOpen = false">取消</button>
              <button class="c-submit" @click="submitReport" :disabled="!reportCategory || isSubmittingReport">
                {{ isSubmittingReport ? '提交中...' : '提交举报' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- 申诉 Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="appealModalOpen" class="composer-overlay" @click.self="appealModalOpen = false">
          <div class="report-modal" style="max-width: 420px;">
            <div class="modal-header">
              <h3>📋 申诉评论隐藏</h3>
              <button class="modal-close" @click="appealModalOpen = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <p class="report-tip">你的评论因被多次举报已被系统自动隐藏。如果你认为这是误判，请说明理由：</p>

            <div class="report-desc-area">
              <label>申诉理由（必填）</label>
              <textarea v-model="appealReason" placeholder="请说明为什么认为该评论不应被隐藏..." class="c-textarea" rows="4" :maxlength="500"></textarea>
            </div>

            <p class="report-disclaimer">
              ⚠️ 每条评论仅可申诉一次。管理员将在 48 小时内审核。
            </p>

            <div class="c-actions" style="justify-content: flex-end; margin-top: 16px;">
              <button class="c-cancel" @click="appealModalOpen = false">取消</button>
              <button class="c-submit" @click="submitAppeal" :disabled="!appealReason.trim() || isSubmittingAppeal">
                {{ isSubmittingAppeal ? '提交中...' : '提交申诉' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 图片放大 Lightbox -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="lightboxUrl" class="lightbox-overlay" @click="lightboxUrl = ''">
          <img :src="lightboxUrl" class="lightbox-img" @click.stop />
          <button class="lightbox-close" @click="lightboxUrl = ''">×</button>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast" :class="toastType">
        <svg v-if="toastType === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'
import SparkAvatar from '../../components/SparkAvatar.vue'
import {
  ANONYMOUS_PLACEHOLDER_NAME,
  buildCampusWallUploadOptions,
  createAnonymousSeed,
  createStorageObjectPath,
  extractStoragePathFromPublicUrl,
  inferAnonymousState,
  isSupportedVideoFile,
  resolveAuthorDisplay,
} from '../../utils/campusWall'

const { user } = useAuth()

// ====== 用户信息 & 个人资料 ======
interface UserProfile {
  nickname: string
  avatar_url: string
  university: string
  bio: string
  level: number
  credit_score: number
}

const myProfile = ref<UserProfile>({
  nickname: '', avatar_url: '', university: '', bio: '', level: 1, credit_score: 80
})

const loadMyProfile = async () => {
  if (!user.value) return
  try {
    const { data } = await supabase
      .from('spark_profiles')
      .select('nickname, avatar_url, university, bio')
      .eq('user_id', user.value.id)
      .maybeSingle()
    if (data) {
      myProfile.value = {
        ...myProfile.value,
        nickname: data.nickname || '',
        avatar_url: data.avatar_url || '',
        university: data.university || '',
        bio: data.bio || '',
      }
    }
  } catch {
    // spark_profiles 表可能不存在
  }
}

const displayName = computed(() =>
  myProfile.value.nickname
  || user.value?.user_metadata?.nickname
  || user.value?.email?.split('@')[0]
  || '同学'
)

const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())

// ====== Tab 筛选 ======
const tabList = ['推荐', '最新', '本校', '同城', '关注', '热议表白']
const sideTabList = [
  { key: '推荐', icon: '🌟' },
  { key: '关注', icon: '👥' },
  { key: '同校', icon: '🏫' },
  { key: '热榜', icon: '🔥' },
  { key: '活动', icon: '📅' },
  { key: '求助', icon: '🙋' },
  { key: '树洞', icon: '🕳️' },
  { key: '圈子', icon: '💬' },
  { key: '失物招领', icon: '🔍' },
]
const quickFilterList = ['最新', '最热', '附近', 'AI总结']
const activeQuickFilter = ref('最新')
const activeTab = ref('推荐')
const searchQuery = ref('')
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const onSearchInput = () => {
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value)
  searchDebounceTimer.value = setTimeout(() => {}, 300)
}

// ====== 快捷操作 ======
const openQuickPost = (category: string) => {
  selectedCategory.value = category
  composerExpanded.value = true
}

/** 用于本校/同城与资料字段比对（去空白、大小写） */
function normalizeCampusMeta(s: string | undefined | null): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab !== '推荐') activeTagFilter.value = null
  // 切换 tab 时强制关闭发布面板并重置
  if (composerExpanded.value) {
    composerExpanded.value = false
    resetComposerState()
  }
}

// ====== 发布面板状态 ======
const composerExpanded = ref(false)
const newPostContent = ref('')
const isAnonymous = ref(false)
const isSubmitting = ref(false)
const selectedCategory = ref('general')
const customCategoryText = ref('')
const moodPresets = [
  { value: '', label: '不展示' },
  { value: '😊 开心', label: '😊 开心' },
  { value: '😮‍💨 疲惫', label: '😮‍💨 疲惫' },
  { value: '💪 奋斗', label: '💪 奋斗' },
  { value: '😶 放空', label: '😶 放空' },
  { value: '😰 焦虑', label: '😰 焦虑' },
  { value: '🤩 兴奋', label: '🤩 兴奋' },
  { value: '😴 无聊', label: '😴 无聊' },
  { value: '🥺 思念', label: '🥺 思念' },
  { value: '🎯 专注', label: '🎯 专注' },
  { value: '🌟 期待', label: '🌟 期待' },
  { value: '🍜 干饭中', label: '🍜 干饭中' },
  { value: '📚 赶ddl', label: '📚 赶ddl' },
  { value: '🏃 运动中', label: '🏃 运动中' },
  { value: 'custom', label: '✏️ 自定义' },
]
const selectedMood = ref<string>('')
const moodCustom = ref('')
const selectedFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
const imageInputRef = ref<HTMLInputElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024
const MAX_POST_MEDIA_COUNT = 9
const MAX_COMMENT_MEDIA_COUNT = 4

// 分类定义（预设 + 其他=用户自定义类型名写入 category 字段）
const categories = [
  { value: 'general', label: '动态', color: '#4f8ef7' },
  { value: 'confession', label: '表白', color: '#f43f5e' },
  { value: 'help', label: '求助', color: '#f97316' },
  { value: 'trade', label: '二手', color: '#10b981' },
  { value: 'lost', label: '失物', color: '#8b5cf6' },
  { value: 'event', label: '活动', color: '#06b6d4' },
  { value: 'team', label: '组队', color: '#eab308' },
  { value: 'housing', label: '租房', color: '#ec4899' },
  { value: 'carpool', label: '拼车', color: '#14b8a6' },
  { value: 'lecture', label: '讲座', color: '#6366f1' },
  { value: 'parttime', label: '兼职', color: '#f59e0b' },
  { value: 'food', label: '美食', color: '#ef4444' },
  { value: 'rant', label: '吐槽', color: '#a855f7' },
  { value: 'other', label: '其他', color: '#6b7280' },
]

// 分类到中文标签的映射（未知 category 文本回退为原样展示）
const categoryMap: Record<string, { label: string; cls: string }> = {
  general: { label: '动态', cls: 'cat-general' },
  confession: { label: '表白', cls: 'cat-confession' },
  help: { label: '求助', cls: 'cat-help' },
  trade: { label: '二手', cls: 'cat-trade' },
  lost: { label: '失物', cls: 'cat-lost' },
  event: { label: '活动', cls: 'cat-event' },
  team: { label: '组队', cls: 'cat-team' },
  housing: { label: '租房', cls: 'cat-housing' },
  carpool: { label: '拼车', cls: 'cat-carpool' },
  lecture: { label: '讲座', cls: 'cat-lecture' },
  parttime: { label: '兼职', cls: 'cat-parttime' },
  food: { label: '美食', cls: 'cat-food' },
  rant: { label: '吐槽', cls: 'cat-rant' },
  other: { label: '其他', cls: 'cat-other' },
}

function resolveCategoryDisplay(category: string | null | undefined): { label: string; cls: string } {
  const c = category || 'general'
  if (categoryMap[c]) return categoryMap[c]
  const label = c.trim().slice(0, 14) || '动态'
  return { label, cls: 'cat-custom' }
}

// 重置发布面板所有状态
const resetComposerState = () => {
  newPostContent.value = ''
  selectedFiles.value = []
  previewUrls.value.forEach(url => URL.revokeObjectURL(url))
  previewUrls.value = []
  isAnonymous.value = false
  selectedCategory.value = 'general'
  customCategoryText.value = ''
  selectedMood.value = ''
  moodCustom.value = ''
  isSubmitting.value = false
  customTags.value = []
  tagInput.value = ''
}

// Bug1修复：FAB 切换逻辑
const toggleComposer = () => {
  if (composerExpanded.value) {
    composerExpanded.value = false
    resetComposerState()
  } else {
    composerExpanded.value = true
  }
}

const resetObjectUrls = (urls: string[]) => {
  urls.forEach(url => URL.revokeObjectURL(url))
}

const applySelectedFiles = (
  targetFiles: { value: File[] },
  targetPreviewUrls: { value: string[] },
  files: File[],
) => {
  resetObjectUrls(targetPreviewUrls.value)
  targetFiles.value = files
  targetPreviewUrls.value = files.map(file => URL.createObjectURL(file))
}

const collectValidMediaFiles = (incomingFiles: File[], existingCount: number, maxCount: number) => {
  const remaining = Math.max(maxCount - existingCount, 0)
  const accepted: File[] = []
  const skippedLargeFiles: File[] = []
  const skippedVideoFiles: File[] = []
  let skippedOverflowCount = 0

  for (const file of incomingFiles) {
    if (file.size >= MAX_MEDIA_FILE_SIZE) {
      skippedLargeFiles.push(file)
      continue
    }

    if (file.type.startsWith('video') && !isSupportedVideoFile(file)) {
      skippedVideoFiles.push(file)
      continue
    }

    if (accepted.length >= remaining) {
      skippedOverflowCount += 1
      continue
    }

    accepted.push(file)
  }

  return {
    accepted,
    skippedLargeFiles,
    skippedVideoFiles,
    skippedOverflowCount,
  }
}

// ====== 媒体文件选择 ======
const onImagesSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const validation = collectValidMediaFiles(files, selectedFiles.value.length, MAX_POST_MEDIA_COUNT)
  const nextFiles = [...selectedFiles.value, ...validation.accepted]

  if (validation.skippedLargeFiles.length > 0) {
    showToast('Some files are larger than 50MB and were skipped.', 'error')
  } else if (validation.skippedVideoFiles.length > 0) {
    showToast('Videos must be MP4, WebM, or Ogg for reliable playback.', 'error')
  } else if (validation.skippedOverflowCount > 0) {
    showToast('You can upload up to 9 files per post.', 'error')
  }

  applySelectedFiles(selectedFiles, previewUrls, nextFiles)
  input.value = ''
}

const removeFile = (index: number) => {
  URL.revokeObjectURL(previewUrls.value[index])
  selectedFiles.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
}

// ====== Toast 提示 ======
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}

// ====== 敏感词过滤 ======
const sensitiveWords = ['SB', '垃圾', '作弊', '代考', '傻逼', '操']
const containsSensitiveWords = (text: string) => {
  return sensitiveWords.some(word => text.toLowerCase().includes(word.toLowerCase()))
}

// ====== 帖子数据 ======
interface Post {
  id: string
  author: string
  authorId: string
  anonymousSeed?: string
  authorInitial: string
  avatarBg: string
  isAnonymous: boolean
  categoryLabel: string
  categoryClass: string
  time: string
  createdAt: string
  content: string
  tags: string[]
  mediaUrls: string[]
  likes: number
  comments: number
  liked: boolean
  category: string
  mood?: string | null
  school?: string | null
  region?: string | null
}

const posts = ref<Post[]>([])
const isLoading = ref(true)
const getPostAuthorDisplay = (post: Pick<Post, 'id' | 'author' | 'authorId' | 'isAnonymous' | 'anonymousSeed'>) => {
  return resolveAuthorDisplay({
    anonymous: inferAnonymousState({ author_name: post.author, is_anonymous: post.isAnonymous }),
    authorId: post.isAnonymous ? undefined : post.authorId,
    authorName: post.author,
    anonymousSeed: post.anonymousSeed || post.id,
    fallbackSeed: post.id,
  })
}

const getCommentAuthorDisplay = (comment: Pick<Comment, 'id' | 'authorName' | 'authorId' | 'isAnonymous' | 'anonymousSeed'>) => {
  return resolveAuthorDisplay({
    anonymous: inferAnonymousState({ author_name: comment.authorName, is_anonymous: comment.isAnonymous }),
    authorId: comment.isAnonymous ? undefined : comment.authorId,
    authorName: comment.authorName,
    anonymousSeed: comment.anonymousSeed || comment.id,
    fallbackSeed: comment.id,
  })
}
const expandedPosts = reactive(new Set<string>())
const followingIds = ref(new Set<string>())
const activeTagFilter = ref<string | null>(null)

function effectivePostMood(): string | null {
  if (selectedMood.value === 'custom') {
    const t = moodCustom.value.trim().slice(0, 12)
    return t || null
  }
  return selectedMood.value ? selectedMood.value : null
}

function effectivePostCategory(): string {
  if (selectedCategory.value === 'other') {
    return customCategoryText.value.trim().slice(0, 16) || 'general'
  }
  return selectedCategory.value
}

// ====== 数据获取 ======
const fetchPosts = async () => {
  isLoading.value = true
  try {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*, likes(count), comments(count)')
      .neq('is_hidden', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (postsError) throw postsError

    if (postsData) {
      // 获取当前用户的点赞列表
      let likedPostIds = new Set<string>()
      if (user.value) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.value.id)
        likedPostIds = new Set(userLikes?.map(l => l.post_id) || [])
      }

      posts.value = postsData.map(p => {
        const isAnon = inferAnonymousState(p)
        const catInfo = resolveCategoryDisplay(p.category)
        return {
          id: p.id,
          author: p.author_name,
          authorId: p.author_id,
          anonymousSeed: p.anonymous_seed,
          authorInitial: isAnon ? '' : p.author_name.charAt(0).toUpperCase(),
          avatarBg: isAnon ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple))',
          isAnonymous: isAnon,
          categoryLabel: catInfo.label,
          categoryClass: catInfo.cls,
          mood: (p as { mood?: string }).mood || null,
          school: (p as { school?: string }).school ?? null,
          region: (p as { region?: string }).region ?? null,
          time: formatTime(p.created_at),
          createdAt: p.created_at,
          content: p.content,
          tags: p.tags || [],
          mediaUrls: (p.media_urls || []).filter((url: string) => url && url.startsWith('http')),
          likes: p.likes?.[0]?.count || 0,
          comments: p.comments?.[0]?.count ?? p.comment_count ?? p.comments_count ?? 0,
          liked: likedPostIds.has(p.id),
          category: p.category || 'general'
        }
      })
    }
  } catch (error) {
    console.error('获取帖子失败:', error)
  } finally {
    if (posts.value.length === 0) {
      posts.value = generateDemoPosts()
    }
    isLoading.value = false
  }
}

function generateDemoPosts(): Post[] {
  const now = Date.now()
  const h = (hours: number) => new Date(now - hours * 3600000).toISOString()
  return [
    {
      id: 'demo-1', author: '星火小助手', authorId: 'sys-1', authorInitial: '星',
      avatarBg: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)', isAnonymous: false,
      categoryLabel: '动态', categoryClass: 'cat-general', mood: '🌟 期待',
      school: '清华大学', region: '北京', time: '2 小时前', createdAt: h(2),
      content: '【校园资讯】星火联盟2026暑期学校开放报名！\n\n面向全国高校优秀本科生，涵盖AI交叉学科、量子计算、脑科学等前沿方向。\n\n📅 报名截止：6月15日\n📍 线上+线下混合模式\n\n名额有限，先到先得！快来报名吧~',
      tags: ['校园资讯', '暑期学校'], mediaUrls: [], likes: 256, comments: 48, liked: false, category: 'general'
    },
    {
      id: 'demo-2', author: '紫荆活动君', authorId: 'sys-2', authorInitial: '紫',
      avatarBg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', isAnonymous: false,
      categoryLabel: '活动', categoryClass: 'cat-event', mood: null,
      school: '清华大学', region: '北京', time: '3 小时前', createdAt: h(3),
      content: '【活动】星火读书会·《人类简史》共读计划 第3期 📖\n\n🗓️ 5月25日（周六）19:30-21:30\n📍 清华大学图书馆 老馆 204\n\n每期一本书，不在于读完全书的过程与年代，欢迎校内外好书分享来交流哟~\n\n👥 已有 86 人报名',
      tags: ['读书会', '活动'], mediaUrls: [], likes: 68, comments: 23, liked: false, category: 'event'
    },
    {
      id: 'demo-3', author: '数据科学小张', authorId: 'sys-3', authorInitial: '张',
      avatarBg: 'linear-gradient(135deg, #f59e0b, #ef4444)', isAnonymous: false,
      categoryLabel: '动态', categoryClass: 'cat-general', mood: '🤔 纠结',
      school: '北京大学', region: '北京', time: '5 小时前', createdAt: h(5),
      content: '周末想参加哪种类型的活动？帮我选选看！🗳️\n\nA. 户外活动（徒步 / 骑行 / 飞盘）\nB. 学术讲座 / 科技分享\nC. 音乐演出 / 艺术展演\nD. 其他（评论区告诉我~）\n\n目前已有 309 人参与投票～',
      tags: ['校园', '投票'], mediaUrls: [], likes: 46, comments: 37, liked: false, category: 'general'
    },
    {
      id: 'demo-4', author: '大三迷茫中', authorId: 'sys-4', authorInitial: '迷',
      avatarBg: 'linear-gradient(135deg, #f97316, #eab308)', isAnonymous: false,
      categoryLabel: '求助', categoryClass: 'cat-help', mood: '😰 焦虑',
      school: '浙江大学', region: '杭州', time: '1 小时前', createdAt: h(1),
      content: '求推荐大三暑期实习方向，计算机专业 🙏\n\n目前在学后端开发和算法，但不知道暑期实习应该投哪些方向。想去大厂试试但怕简历不够好。\n\n有没有学长学姐能分享一下经验和建议？感谢！',
      tags: ['实习', '计算机', '求助'], mediaUrls: [], likes: 31, comments: 24, liked: false, category: 'help'
    },
    {
      id: 'demo-5', author: '匿名同学', authorId: 'sys-5', anonymousSeed: 'anon-seed-1',
      authorInitial: '', avatarBg: 'rgba(255,255,255,0.08)', isAnonymous: true,
      categoryLabel: '动态', categoryClass: 'cat-general', mood: null,
      school: null, region: null, time: '1 天前', createdAt: h(24),
      content: '有时候真的会觉得很孤独讲真，想跟别人聊聊又不想多说话。\n希望所有努力的人都能被温柔以待。',
      tags: ['树洞'], mediaUrls: [], likes: 112, comments: 56, liked: false, category: 'general'
    },
    {
      id: 'demo-6', author: '美食小林', authorId: 'sys-6', authorInitial: '林',
      avatarBg: 'linear-gradient(135deg, #ef4444, #f97316)', isAnonymous: false,
      categoryLabel: '美食', categoryClass: 'cat-food', mood: '🍜 干饭中',
      school: '复旦大学', region: '上海', time: '4 小时前', createdAt: h(4),
      content: '发现学校南门新开了一家超赞的麻辣烫！！！🌶️🔥\n\n价格还很良心，人均15-20块就能吃超饱。强烈推荐他们的手打牛肉丸和宽粉！\n\n营业到晚上11点，考试周续命必备！',
      tags: ['美食', '推荐'], mediaUrls: [], likes: 89, comments: 34, liked: false, category: 'food'
    },
    {
      id: 'demo-7', author: '跑步达人', authorId: 'sys-7', authorInitial: '跑',
      avatarBg: 'linear-gradient(135deg, #10b981, #06b6d4)', isAnonymous: false,
      categoryLabel: '组队', categoryClass: 'cat-team', mood: '🏃 运动中',
      school: '清华大学', region: '北京', time: '6 小时前', createdAt: h(6),
      content: '有没有人一起晨跑！🏃‍♂️\n\n每天早上6:30-7:30，绕操场跑5公里。\n已经坚持了30天，希望找到跑友一起坚持！\n\n加入条件：只要你愿意早起就行哈哈',
      tags: ['运动', '组队', '晨跑'], mediaUrls: [], likes: 43, comments: 18, liked: false, category: 'team'
    },
    {
      id: 'demo-8', author: '租房小王', authorId: 'sys-8', authorInitial: '王',
      avatarBg: 'linear-gradient(135deg, #ec4899, #8b5cf6)', isAnonymous: false,
      categoryLabel: '租房', categoryClass: 'cat-housing', mood: null,
      school: '北京大学', region: '北京', time: '8 小时前', createdAt: h(8),
      content: '🏠 暑期转租 | 五道口地铁站步行5分钟\n\n7月-9月，主卧带独卫，朝南采光好\n月租2800，可议价\n\n室友都是研究生，生活习惯好。有意私聊~',
      tags: ['租房', '五道口'], mediaUrls: [], likes: 15, comments: 8, liked: false, category: 'housing'
    },
  ]
}

// 时间格式化
const formatTime = (dateStr: string): string => {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const fetchFollowingIds = async () => {
  if (!user.value) return
  try {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.value.id)
    if (data) {
      followingIds.value = new Set(data.map(d => d.following_id))
    }
  } catch {
    // follows 表可能尚未创建，静默忽略
  }
}

onMounted(() => {
  if (user.value) {
    fetchPosts()
    fetchFollowingIds()
    loadMyProfile()
  } else {
    setTimeout(() => { fetchPosts(); fetchFollowingIds(); loadMyProfile() }, 1000)
  }

  // 订阅评论实时更新
  commentsRealtimeChannel = supabase
    .channel('campus-wall-comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
      const changedPostId = (payload.new as { post_id?: string } | null)?.post_id
        || (payload.old as { post_id?: string } | null)?.post_id

      if (!changedPostId) return

      await refreshPostCommentCount(changedPostId)

      if (commentDrawerOpen.value && activePostForComment.value?.id === changedPostId) {
        await fetchComments(changedPostId)
      }
    })
    .subscribe()

  // 点击页面其他区域关闭下拉菜单
  document.addEventListener('click', closeDropdown)
})

// 清理资源
onBeforeUnmount(() => {
  // 清理 ObjectURL
  previewUrls.value.forEach(url => URL.revokeObjectURL(url))
  commentPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))

  // 清理 Realtime 订阅
  if (commentsRealtimeChannel) {
    supabase.removeChannel(commentsRealtimeChannel)
    commentsRealtimeChannel = null
  }

  // 移除事件监听
  document.removeEventListener('click', closeDropdown)
})

// ====== 发布权限 ======
const canPost = computed(() => ['推荐', '最新', '本校', '同城', '活动', '求助', '失物'].includes(activeTab.value))

// ====== 用户学校/地区信息（与发帖快照比对） ======
const mySchool = computed(() => {
  if (myProfile.value.university) return myProfile.value.university
  const meta = user.value?.user_metadata
  return meta?.university || meta?.school || ''
})
const myRegion = computed(() => {
  const meta = user.value?.user_metadata
  return meta?.region || meta?.city || ''
})

const emptyStateHint = computed(() => {
  if (activeTab.value === '关注') {
    return followingIds.value.size === 0
      ? '你还没有关注任何同学，去「推荐」看看有趣的人吧'
      : '你关注的同学还没有发过动态'
  }
  if (activeTab.value === '同校') {
    if (!normalizeCampusMeta(mySchool.value)) {
      return '请先在个人资料中填写学校信息，才能查看本校同学的动态'
    }
    return '暂无本校同学的动态；较早帖子可能未记录学校，可切换「推荐」查看全部'
  }
  if (activeTab.value === '热榜') {
    return '暂时没有热门内容，发一条动态来引爆话题吧'
  }
  if (activeTab.value === '活动') return '暂无活动信息，发布一个校园活动召集同学吧'
  if (activeTab.value === '求助') return '暂无求助帖，有问题尽管发出来，同学们会帮你的'
  if (activeTab.value === '树洞') return '暂无树洞帖，匿名倾诉你的心声吧'
  if (activeTab.value === '圈子') return '暂无圈子动态'
  if (activeTab.value === '失物招领') return '暂无失物招领信息'
  return '来，成为第一个发布的人！'
})

// ====== 热门标签统计 ======
const trendingTags = computed(() => {
  const tagCount: Record<string, number> = {}
  for (const p of posts.value) {
    for (const t of p.tags) {
      tagCount[t] = (tagCount[t] || 0) + 1
    }
  }
  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }))
})

// ====== 星火洞察面板 ======
const insightExpanded = ref(false)

const WORDCLOUD_COLORS = [
  'rgba(139,92,246,0.8)', 'rgba(99,102,241,0.7)', 'rgba(236,72,153,0.7)',
  'rgba(59,130,246,0.7)', 'rgba(168,85,247,0.8)', 'rgba(244,114,182,0.7)',
  'rgba(129,140,248,0.7)', 'rgba(192,132,252,0.8)',
]

const wordCloudTags = computed(() => {
  if (trendingTags.value.length === 0) return []
  const maxCount = trendingTags.value[0]?.count || 1
  return trendingTags.value.slice(0, 20).map((t, i) => {
    const ratio = t.count / maxCount
    return {
      tag: t.tag,
      count: t.count,
      size: Math.round(11 + ratio * 15),
      color: WORDCLOUD_COLORS[i % WORDCLOUD_COLORS.length],
      opacity: 0.5 + ratio * 0.5,
    }
  })
})

const weeklyTrend = computed(() => {
  const days: { label: string; count: number; pct: number }[] = []
  const now = new Date()
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六']
  const counts: number[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const count = posts.value.filter(p => new Date(p.createdAt).toDateString() === dateStr).length
    counts.push(count)
    days.push({ label: dayLabels[d.getDay()], count, pct: 0 })
  }

  const max = Math.max(...counts, 1)
  days.forEach(d => { d.pct = Math.round((d.count / max) * 100) })
  return days
})

const trendDirection = computed(() => {
  const t = weeklyTrend.value
  const thisWeek = t.slice(-3).reduce((s, d) => s + d.count, 0)
  const lastWeek = t.slice(0, 3).reduce((s, d) => s + d.count, 0)
  if (thisWeek > lastWeek) return 'up'
  if (thisWeek < lastWeek) return 'down'
  return 'flat'
})

const trendDelta = computed(() => {
  const t = weeklyTrend.value
  const thisWeek = t.slice(-3).reduce((s, d) => s + d.count, 0)
  const lastWeek = t.slice(0, 3).reduce((s, d) => s + d.count, 0)
  const diff = thisWeek - lastWeek
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `${diff}`
  return '0'
})

const hourlyActivity = computed(() => {
  const today = new Date().toDateString()
  const hours: { hour: number; count: number; intensity: number }[] = []
  const counts: number[] = Array(24).fill(0)

  for (const p of posts.value) {
    const d = new Date(p.createdAt)
    if (d.toDateString() === today) {
      counts[d.getHours()]++
    }
  }

  const max = Math.max(...counts, 1)
  for (let h = 6; h <= 23; h++) {
    hours.push({ hour: h, count: counts[h], intensity: 0.2 + (counts[h] / max) * 0.8 })
  }
  return hours
})

function filterByTag(tag: string) {
  activeTab.value = '推荐'
  activeTagFilter.value = activeTagFilter.value === tag ? null : tag
}

// ====== 表情回应系统 ======
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '🎉', '💡']
const postReactions = ref<Record<string, Record<string, Set<string>>>>({})
const activeReactionPicker = ref<string | null>(null)

function getPostReactions(postId: string): { emoji: string; count: number; mine: boolean }[] {
  const r = postReactions.value[postId]
  if (!r) return []
  return Object.entries(r)
    .filter(([, users]) => users.size > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.size,
      mine: users.has(user.value?.id || ''),
    }))
    .sort((a, b) => b.count - a.count)
}

function toggleReaction(postId: string, emoji: string) {
  if (!user.value) return
  if (!postReactions.value[postId]) postReactions.value[postId] = {}
  if (!postReactions.value[postId][emoji]) postReactions.value[postId][emoji] = new Set()

  const users = postReactions.value[postId][emoji]
  if (users.has(user.value.id)) {
    users.delete(user.value.id)
  } else {
    users.add(user.value.id)
  }
  postReactions.value = { ...postReactions.value }
}

function toggleReactionPicker(postId: string) {
  activeReactionPicker.value = activeReactionPicker.value === postId ? null : postId
}

// ====== 帖子统计 ======
const wallStats = computed(() => ({
  totalPosts: posts.value.length,
  todayPosts: posts.value.filter(p => {
    const d = new Date(p.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length,
  totalLikes: posts.value.reduce((s, p) => s + p.likes, 0),
  totalComments: posts.value.reduce((s, p) => s + p.comments, 0),
}))

// ====== 左侧栏：个人数据 ======
const myPostCount = computed(() =>
  user.value ? posts.value.filter(p => p.authorId === user.value!.id).length : 0
)

const activityStreak = computed(() => {
  if (!user.value) return 0
  const uid = user.value.id
  const myPosts = posts.value.filter(p => p.authorId === uid)
  let streak = 0
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = d.toDateString()
    if (myPosts.some(p => new Date(p.createdAt).toDateString() === dayStr)) {
      streak++
    } else {
      break
    }
  }
  return streak
})

const last14Days = computed(() => {
  const now = new Date()
  const uid = user.value?.id
  const days: { date: string; hasPost: boolean; label: string }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = d.toDateString()
    days.push({
      date: dayStr,
      hasPost: uid ? posts.value.some(p => p.authorId === uid && new Date(p.createdAt).toDateString() === dayStr) : false,
      label: `${d.getMonth() + 1}/${d.getDate()}`
    })
  }
  return days
})

const dailyTasks = computed(() => {
  const uid = user.value?.id
  const today = new Date().toDateString()
  const todayMyPosts = uid ? posts.value.filter(p => p.authorId === uid && new Date(p.createdAt).toDateString() === today).length : 0
  const todayMyComments = 0
  const todayMyLikes = uid ? posts.value.filter(p => p.liked && new Date(p.createdAt).toDateString() === today).length : 0
  return [
    { id: 'discuss', label: '参与 1 次讨论', current: Math.min(todayMyComments, 1), target: 1, done: todayMyComments >= 1 },
    { id: 'post', label: '发布 1 条动态', current: Math.min(todayMyPosts, 1), target: 1, done: todayMyPosts >= 1 },
    { id: 'like', label: '点赞 3 条动态', current: Math.min(todayMyLikes, 3), target: 3, done: todayMyLikes >= 3 },
  ]
})

function refreshDailyTasks() {
  fetchPosts()
}

const activityIndex = computed(() => {
  const streak = activityStreak.value
  const postCount = myPostCount.value
  const base = Math.min(streak * 5 + postCount * 2.3, 100)
  return base > 0 ? base.toFixed(1) : '87.6'
})

const campusHeatScore = computed(() => {
  return wallStats.value.totalLikes * 2 + wallStats.value.totalComments * 3 + wallStats.value.totalPosts * 5
})

// ====== 右侧栏数据 ======
const hotRankList = computed(() => {
  return [...posts.value]
    .sort((a, b) => (b.likes * 2 + b.comments * 3) - (a.likes * 2 + a.comments * 3))
    .slice(0, 6)
    .map(p => ({
      id: p.id,
      preview: p.content.length > 22 ? p.content.slice(0, 22) + '…' : p.content,
      heat: `${p.likes + p.comments}`,
    }))
})

const recommendedCircles = [
  { name: '清华读书会', icon: '📖', members: '1.2w 书香四溢' },
  { name: 'AI 学术交流', icon: '🤖', members: '8500 探索前沿' },
  { name: '摄影爱好者', icon: '📸', members: '3200' },
  { name: '校园跑团', icon: '🏃', members: '5178 一起出发' },
]

const weeklyEvents = [
  { date: '5/25 · 周六', name: '《人类简史》共读', info: '清华读书会 · 204人 · 86 人报名' },
  { date: '5/26 · 09:00', name: '紧凑星期计划', info: '42 人参加' },
  { date: '5/27 · 14:00', name: 'AI 前沿讲座：大模型与教育', info: '主楼C厅 · 120 人报名' },
]

const campusHotSearch = ['研究生', '保研经验', '实习推荐', '实习内推', '二手交易', '健身打卡']

const onlineCount = ref(2845)

const rtChartLinePath = computed(() => {
  const points = [0,8,15,22,18,25,40,55,48,42,35,30]
  const w = 240, h = 55
  const step = w / (points.length - 1)
  return points.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (v / 60) * h}`).join(' ')
})

const rtChartAreaPath = computed(() => {
  const points = [0,8,15,22,18,25,40,55,48,42,35,30]
  const w = 240, h = 55
  const step = w / (points.length - 1)
  const linePart = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (v / 60) * h}`).join(' ')
  return `${linePart} L${w},${h} L0,${h} Z`
})

const realtimeFeed = computed(() => {
  return [...posts.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      initial: p.isAnonymous ? '匿' : p.author.charAt(0),
      text: `${p.isAnonymous ? '匿名同学' : p.author} 发布了新${resolveCategoryDisplay(p.category).label}`,
      time: p.time,
    }))
})

const aiSuggestions = computed(() => {
  const tags = trendingTags.value.slice(0, 3).map(t => `#${t.tag}`)
  if (tags.length === 0) return ['分享校园生活', '表白墙', '期末加油']
  return tags
})

const applyAiSuggestion = (text: string) => {
  newPostContent.value = text.startsWith('#') ? `聊聊 ${text} 的那些事 ` : text
  composerExpanded.value = true
}

const scrollToPost = (postId: string) => {
  const el = document.querySelector(`[data-post-id="${postId}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ====== Tab 筛选逻辑 ======
const filteredPosts = computed(() => {
  const schoolMe = normalizeCampusMeta(mySchool.value)
  const regionMe = normalizeCampusMeta(myRegion.value)

  const byTime = (a: Post, b: Post) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

  const withTag = (list: Post[]) =>
    activeTagFilter.value
      ? list.filter(p => p.tags.includes(activeTagFilter.value!))
      : list

  const withSearch = (list: Post[]) => {
    if (!searchQuery.value.trim()) return list
    const q = searchQuery.value.trim().toLowerCase()
    return list.filter(p =>
      p.content.toLowerCase().includes(q)
      || p.tags.some(t => t.toLowerCase().includes(q))
      || p.author.toLowerCase().includes(q)
    )
  }

  const applyFilters = (list: Post[]) => withSearch(withTag(list))

  switch (activeTab.value) {
    case '最新':
      return [...applyFilters(posts.value)].sort(byTime)
    case '同校': {
      if (!schoolMe) return []
      const list = posts.value.filter(p => {
        const ps = normalizeCampusMeta(p.school || '')
        return ps && ps === schoolMe
      })
      return [...applyFilters(list)].sort(byTime)
    }
    case '热榜': {
      const heatThreshold = 3
      return applyFilters(posts.value)
        .filter(p =>
          (p.likes * 2 + p.comments * 3) >= heatThreshold
        )
        .sort((a, b) => {
          const heatA = a.likes * 2 + a.comments * 3
          const heatB = b.likes * 2 + b.comments * 3
          return heatB - heatA
        })
    }
    case '关注':
      if (followingIds.value.size === 0) return []
      return applyFilters(posts.value).filter(p => followingIds.value.has(p.authorId))
    case '活动':
      return [...applyFilters(posts.value.filter(p => p.category === 'event'))].sort(byTime)
    case '求助':
      return [...applyFilters(posts.value.filter(p => p.category === 'help'))].sort(byTime)
    case '树洞':
      return [...applyFilters(posts.value.filter(p => p.isAnonymous || p.category === 'confession'))].sort(byTime)
    case '圈子':
      return [...applyFilters(posts.value)].sort(byTime)
    case '失物招领':
      return [...applyFilters(posts.value.filter(p => p.category === 'lost'))].sort(byTime)
    case '推荐':
    default:
      return [...applyFilters(posts.value)].sort((a, b) => {
        const heatA = a.likes * 2 + a.comments * 3
        const heatB = b.likes * 2 + b.comments * 3
        if (heatB !== heatA) return heatB - heatA
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }
})

// ====== 互动操作 ======
const toggleLike = async (post: Post) => {
  if (!user.value) {
    showToast('请先登录！', 'error')
    return
  }

  const originalLiked = post.liked
  const originalLikes = post.likes

  // 乐观更新
  post.liked = !post.liked
  post.likes += post.liked ? 1 : -1

  try {
    const { error } = post.liked
      ? await supabase.from('likes').insert({ post_id: post.id, user_id: user.value.id })
      : await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.value.id)
    if (error) throw error
  } catch (error) {
    console.error('点赞失败:', error)
    post.liked = originalLiked
    post.likes = originalLikes
    showToast('操作失败，请重试', 'error')
  }
}

// ====== 评论系统 ======
interface Comment {
  id: string
  authorId: string
  authorName: string
  anonymousSeed?: string
  authorInitial: string
  avatarBg: string
  isAnonymous: boolean
  content: string
  mediaUrls: string[]
  time: string
  createdAt: string
  isOwn: boolean
  replyToName: string | null
  liked: boolean
  likeCount: number
  isHidden: boolean
  reportCount: number
}

const commentDrawerOpen = ref(false)
const activePostForComment = ref<Post | null>(null)
const commentList = ref<Comment[]>([])
const commentLoading = ref(false)
const newCommentText = ref('')
const commentFiles = ref<File[]>([])
const commentPreviewUrls = ref<string[]>([])
const commentImageInputRef = ref<HTMLInputElement | null>(null)
const commentVideoInputRef = ref<HTMLInputElement | null>(null)
const isCommentAnonymous = ref(false)
const isSubmittingComment = ref(false)
const replyToComment = ref<Comment | null>(null)
let commentsRealtimeChannel: ReturnType<typeof supabase.channel> | null = null

// 图片放大
const lightboxUrl = ref('')
const openLightbox = (url: string) => { lightboxUrl.value = url }

// 自定义标签
const customTags = ref<string[]>([])
const tagInput = ref('')
const addTag = () => {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (tag && !customTags.value.includes(tag) && customTags.value.length < 5) {
    customTags.value.push(tag)
    tagInput.value = ''
  }
}

// 表情包
const showEmojiPicker = ref(false)
const emojiList = [
  '😀', '😂', '🤣', '😍', '🥰', '😘', '😜', '🤔', '😳', '😱',
  '🙏', '👍', '👎', '❤️', '🔥', '🎉', '👏', '💪', '🌟', '🌈',
  '😢', '😡', '🥱', '✨', '💡', '🚀', '💩', '🤡', '👻', '🍀',
  '🌸', '☕', '🍔', '🌝', '🎵', '📸', '💤', '🌊', '🍂', '🎂',
]
const insertEmoji = (emoji: string) => {
  newCommentText.value += emoji
  showEmojiPicker.value = false
}

// 回复
const setReplyTo = (comment: Comment) => {
  replyToComment.value = comment
  // 聚焦到输入框
  const textarea = document.querySelector('.comment-textarea') as HTMLTextAreaElement
  textarea?.focus()
}

// 打开评论面板
const openComments = async (post: Post) => {
  activePostForComment.value = post
  commentDrawerOpen.value = true
  await fetchComments(post.id)
}

const refreshPostCommentCount = async (postId: string) => {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  if (error || typeof count !== 'number') return

  const targetPost = posts.value.find(post => post.id === postId)
  if (targetPost) targetPost.comments = count
  if (activePostForComment.value?.id === postId) {
    activePostForComment.value.comments = count
  }
}

// 获取评论列表
const fetchComments = async (postId: string) => {
  commentLoading.value = true
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (!error && data) {
      // 查询当前用户已点赞的评论
      let likedCommentIds = new Set<string>()
      if (user.value) {
        const { data: userCLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.value.id)
        likedCommentIds = new Set(userCLikes?.map(l => l.comment_id) || [])
      }
      // 构建回复名称映射
      const idNameMap: Record<string, string> = {}
      data.forEach(c => {
        idNameMap[c.id] = resolveAuthorDisplay({
          anonymous: inferAnonymousState(c),
          authorId: c.is_anonymous ? undefined : c.author_id,
          authorName: c.author_name,
          anonymousSeed: c.anonymous_seed || c.id,
          fallbackSeed: c.id,
        }).name
      })
      commentList.value = data.map(c => {
        const isAnon = inferAnonymousState(c)
        const display = resolveAuthorDisplay({
          anonymous: isAnon,
          authorId: isAnon ? undefined : c.author_id,
          authorName: c.author_name,
          anonymousSeed: c.anonymous_seed || c.id,
          fallbackSeed: c.id,
        })
        return {
        id: c.id,
        authorId: c.author_id,
        authorName: c.author_name,
        anonymousSeed: c.anonymous_seed,
        authorInitial: display.initial,
        avatarBg: display.avatarBg,
        isAnonymous: isAnon,
        content: c.content || '',
        mediaUrls: (c.media_urls || []).filter((url: string) => url && url.startsWith('http')),
        time: formatTime(c.created_at),
        createdAt: c.created_at,
        isOwn: user.value?.id === c.author_id,
        replyToName: c.reply_to ? (idNameMap[c.reply_to] || '某同学') : null,
        liked: likedCommentIds.has(c.id),
        likeCount: c.like_count || 0,
        isHidden: c.is_hidden || false,
        reportCount: c.report_count || 0
      }})
      const realCommentCount = data.length
      const targetPost = posts.value.find(post => post.id === postId)
      if (targetPost) targetPost.comments = realCommentCount
      if (activePostForComment.value?.id === postId) {
        activePostForComment.value.comments = realCommentCount
      }
    }
  } catch (err) {
    console.error('获取评论失败:', err)
  } finally {
    commentLoading.value = false
  }
}

// 提交评论
const submitComment = async () => {
  if (!newCommentText.value.trim() && commentFiles.value.length === 0) return
  if (!user.value) { showToast('请先登录', 'error'); return }
  if (!activePostForComment.value) return
  const { data: sanctions } = await supabase
    .from('user_sanctions')
    .select('*')
    .eq('user_id', user.value.id)
    .in('type', ['comment_ban', 'full_ban'])
    .gt('expires_at', new Date().toISOString())
    .limit(1)
  if (sanctions && sanctions.length > 0) {
    const expiresAt = new Date(sanctions[0].expires_at)
    const remainDays = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
    showToast(`评论权限已被限制，还剩 ${remainDays} 天恢复`, 'error')
    return
  }
  isSubmittingComment.value = true
  try {
    const uploadedUrls: string[] = []
    let commentUploadFails = 0
    for (const file of commentFiles.value) {
      const path = createStorageObjectPath('comments', user.value.id, file)
      const { data, error } = await supabase.storage.from('campus-wall').upload(path, file, buildCampusWallUploadOptions(file))
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      } else {
        commentUploadFails++
      }
    }
    if (commentUploadFails > 0) {
      showToast(`${commentUploadFails} 个附件上传失败`, 'error')
    }
    const authorName = isCommentAnonymous.value ? ANONYMOUS_PLACEHOLDER_NAME : displayName.value
    const anonymousSeed = isCommentAnonymous.value ? createAnonymousSeed() : null
    const commentPayload = {
      post_id: activePostForComment.value.id,
      author_id: user.value.id,
      author_name: authorName,
      content: newCommentText.value.trim(),
      media_urls: uploadedUrls,
      is_anonymous: isCommentAnonymous.value,
      anonymous_seed: anonymousSeed,
      reply_to: replyToComment.value?.id || null
    }
    let { error } = await supabase.from('comments').insert(commentPayload)
    if (error && /anonymous_seed|is_anonymous/i.test(error.message || '')) {
      const { anonymous_seed, is_anonymous, ...legacyCommentPayload } = commentPayload
      ;({ error } = await supabase.from('comments').insert(legacyCommentPayload))
    }
    if (error) throw error
    // 更新本地帖子评论数
    void activePostForComment.value
    // 重置输入
    newCommentText.value = ''
    commentFiles.value = []
    commentPreviewUrls.value.forEach(u => URL.revokeObjectURL(u))
    commentPreviewUrls.value = []
    isCommentAnonymous.value = false
    replyToComment.value = null
    showEmojiPicker.value = false
    await fetchComments(activePostForComment.value.id)
    showToast('评论成功', 'success')
  } catch {
    showToast('评论失败，请重试', 'error')
  } finally {
    isSubmittingComment.value = false
  }
}

// 删除评论
const deleteComment = async (commentId: string) => {
  if (!user.value || !activePostForComment.value) return
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', user.value.id)
    if (error) throw error
    // 更新本地评论数
    const post = posts.value.find(p => p.id === activePostForComment.value!.id)
    commentList.value = commentList.value.filter(c => c.id !== commentId)
    const realCommentCount = commentList.value.length
    if (post) post.comments = realCommentCount
    activePostForComment.value.comments = realCommentCount
    showToast('评论已删除', 'success')
  } catch {
    showToast('删除失败', 'error')
  }
}

// 评论文件选择
const onCommentFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const validation = collectValidMediaFiles(files, commentFiles.value.length, MAX_COMMENT_MEDIA_COUNT)
  const nextFiles = [...commentFiles.value, ...validation.accepted]

  if (validation.skippedLargeFiles.length > 0) {
    showToast('Some attachments are larger than 50MB and were skipped.', 'error')
  } else if (validation.skippedVideoFiles.length > 0) {
    showToast('Comment videos must be MP4, WebM, or Ogg.', 'error')
  } else if (validation.skippedOverflowCount > 0) {
    showToast('You can upload up to 4 attachments per comment.', 'error')
  }

  applySelectedFiles(commentFiles, commentPreviewUrls, nextFiles)
  input.value = ''
}
const removeCommentFile = (i: number) => {
  URL.revokeObjectURL(commentPreviewUrls.value[i])
  commentFiles.value.splice(i, 1)
  commentPreviewUrls.value.splice(i, 1)
}

// 评论点赞
const toggleCommentLike = async (comment: Comment) => {
  if (!user.value) { showToast('请先登录', 'error'); return }
  // 乐观更新
  const originalLiked = comment.liked
  const originalCount = comment.likeCount
  comment.liked = !comment.liked
  comment.likeCount += comment.liked ? 1 : -1
  try {
    const { error } = comment.liked
      ? await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: user.value.id })
      : await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.value.id)
    if (error) throw error
  } catch {
    comment.liked = originalLiked
    comment.likeCount = originalCount
    showToast('操作失败，请重试', 'error')
  }
}

// ====== 严格举报系统 ======
const reportCategories = [
  { value: 'spam', label: '垃圾广告', icon: '📢', desc: '无关推广、刷屏内容' },
  { value: 'porn', label: '色情低俗', icon: '🔞', desc: '不雅图片或文字' },
  { value: 'violence', label: '暴力威胁', icon: '⚠️', desc: '人身威胁或暴力内容' },
  { value: 'fraud', label: '欺诈诈骗', icon: '🎣', desc: '虚假交易或钓鱼链接' },
  { value: 'privacy', label: '侵犯隐私', icon: '🔒', desc: '泄露他人个人信息' },
  { value: 'political', label: '政治敏感', icon: '🚫', desc: '违规政治内容' },
  { value: 'harassment', label: '骚扰攻击', icon: '😤', desc: '针对特定人群的恶意攻击' },
  { value: 'other', label: '其他问题', icon: '❓', desc: '不符合以上分类的问题' },
]

const reportModalOpen = ref(false)
const activePostForReport = ref<Post | null>(null)
const reportCategory = ref('')
const reportDescription = ref('')
const reportEvidenceFiles = ref<File[]>([])
const reportEvidencePreviewUrls = ref<string[]>([])
const reportEvidenceInputRef = ref<HTMLInputElement | null>(null)
const isSubmittingReport = ref(false)
const reportedPostIds = ref(new Set<string>())


// 打开举报 Modal
// 当前举报的评论（如果是评论级举报）
const activeCommentForReport = ref<Comment | null>(null)

const openReport = (post: Post) => {
  if (!user.value) { showToast('请先登录', 'error'); return }
  if (post.authorId === user.value.id) { showToast('不能举报自己的帖子', 'error'); return }
  if (reportedPostIds.value.has(post.id)) {
    showToast('你已举报过该内容，正在处理中', 'error'); return
  }
  activePostForReport.value = post
  activeCommentForReport.value = null
  reportCategory.value = ''
  reportDescription.value = ''
  reportEvidenceFiles.value = []
  reportEvidencePreviewUrls.value = []
  reportModalOpen.value = true
}

// 评论级举报
const openCommentReport = (comment: Comment) => {
  if (!user.value) { showToast('请先登录', 'error'); return }
  if (comment.authorId === user.value.id) { showToast('不能举报自己的评论', 'error'); return }
  if (reportedPostIds.value.has(comment.id)) {
    showToast('你已举报过该评论，正在处理中', 'error'); return
  }
  activePostForReport.value = activePostForComment.value
  activeCommentForReport.value = comment
  reportCategory.value = ''
  reportDescription.value = ''
  reportEvidenceFiles.value = []
  reportEvidencePreviewUrls.value = []
  reportModalOpen.value = true
}

// 申诉相关
const appealModalOpen = ref(false)
const appealComment = ref<Comment | null>(null)
const appealReason = ref('')
const isSubmittingAppeal = ref(false)

const openAppeal = (comment: Comment) => {
  appealComment.value = comment
  appealReason.value = ''
  appealModalOpen.value = true
}

const submitAppeal = async () => {
  if (!user.value || !appealComment.value || !appealReason.value.trim()) return
  isSubmittingAppeal.value = true
  try {
    const { error } = await supabase.from('content_appeals').insert({
      user_id: user.value.id,
      comment_id: appealComment.value.id,
      reason: appealReason.value.trim()
    })
    if (error) {
      if (error.code === '23505') showToast('你已对此评论申诉过', 'error')
      else throw error
    } else {
      appealModalOpen.value = false
      showToast('申诉已提交，我们将尽快处理', 'success')
    }
  } catch {
    showToast('申诉提交失败', 'error')
  } finally {
    isSubmittingAppeal.value = false
  }
}

// 提交举报
const submitReport = async () => {
  if (!reportCategory.value) { showToast('请选择举报类型', 'error'); return }
  if (!user.value || !activePostForReport.value) return
  isSubmittingReport.value = true
  try {
    const evidenceUrls: string[] = []
    let evidenceUploadFails = 0
    for (const file of reportEvidenceFiles.value) {
      const path = createStorageObjectPath('reports', user.value.id, file)
      const { data, error } = await supabase.storage.from('campus-wall').upload(path, file, buildCampusWallUploadOptions(file))
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
        evidenceUrls.push(urlData.publicUrl)
      } else {
        evidenceUploadFails++
      }
    }
    if (evidenceUploadFails > 0) {
      showToast(`${evidenceUploadFails} 个证据文件上传失败`, 'error')
    }
    const reportPayload: Record<string, unknown> = {
      reporter_id: user.value.id,
      reason: reportCategory.value,
      reason_category: reportCategory.value,
      description: reportDescription.value.trim(),
      evidence_urls: evidenceUrls,
      status: 'pending'
    }
    // 区分帖子举报 vs 评论举报
    if (activeCommentForReport.value) {
      reportPayload.comment_id = activeCommentForReport.value.id
      reportPayload.post_id = activePostForReport.value.id
    } else {
      reportPayload.post_id = activePostForReport.value.id
    }
    const { error } = await supabase.from('reports').insert(reportPayload)
    if (error) {
      // UNIQUE 冲突 = 已举报过
      if (error.code === '23505') {
        const targetId = activeCommentForReport.value?.id || activePostForReport.value.id
        reportedPostIds.value.add(targetId)
        showToast('你已举报过该内容', 'error')
      } else throw error
    } else {
      const targetId = activeCommentForReport.value?.id || activePostForReport.value.id
      reportedPostIds.value.add(targetId)
      activeCommentForReport.value = null
      reportModalOpen.value = false
      showToast('举报已提交，我们将在 24 小时内处理', 'success')
    }
  } catch {
    showToast('提交失败，请重试', 'error')
  } finally {
    isSubmittingReport.value = false
  }
}

// 证据文件选择
const onEvidenceSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const remaining = 3 - reportEvidenceFiles.value.length
  const files = Array.from(input.files || []).slice(0, remaining)
  reportEvidenceFiles.value = [...reportEvidenceFiles.value, ...files]
  reportEvidencePreviewUrls.value = reportEvidenceFiles.value.map(f => URL.createObjectURL(f))
  input.value = ''
}
const removeEvidence = (i: number) => {
  URL.revokeObjectURL(reportEvidencePreviewUrls.value[i])
  reportEvidenceFiles.value.splice(i, 1)
  reportEvidencePreviewUrls.value.splice(i, 1)
}

const sharePost = async (post: Post) => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: '星火校园',
        text: post.content.slice(0, 100),
        url: location.href
      })
    } else {
      await navigator.clipboard.writeText(post.content)
      showToast('内容已复制到剪贴板', 'success')
    }
  } catch {
    // 用户取消分享，不报错
  }
}


// ====== 下拉菜单 ======

const activeDropdown = ref<string | null>(null)

const toggleDropdown = (postId: string) => {
  activeDropdown.value = activeDropdown.value === postId ? null : postId
}

// 点击页面其他区域关闭下拉
const closeDropdown = () => { activeDropdown.value = null }

// ====== 删除帖子 ======
const deletePost = async (post: Post) => {
  activeDropdown.value = null
  if (!user.value || post.authorId !== user.value.id) {
    showToast('无权删除该帖子', 'error')
    return
  }

  try {
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user.value.id)
    if (error) throw error
    posts.value = posts.value.filter(p => p.id !== post.id)
    showToast('帖子已删除', 'success')

    // DB 删除成功后再清理 Storage（失败不影响用户体验）
    if (post.mediaUrls.length > 0) {
      const paths = post.mediaUrls
        .map(url => extractStoragePathFromPublicUrl(url))
        .filter((p): p is string => !!p)
      if (paths.length > 0) {
        await supabase.storage.from('campus-wall').remove(paths).catch(() => {})
      }
    }
  } catch (error) {
    console.error('删除失败:', error)
    showToast('删除失败，请稍后重试', 'error')
  }
}

// ====== 判断是否为视频 URL ======
const isVideoUrl = (url: string): boolean => {
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
  const lower = url.toLowerCase().split('?')[0] // 去掉查询参数
  return videoExts.some(ext => lower.endsWith(ext))
}

// ====== 发布帖子 ======
const isReliableVideoUrl = (url: string): boolean => {
  const reliableExts = ['.mp4', '.webm', '.ogg']
  const lower = url.toLowerCase().split('?')[0]
  return reliableExts.some(ext => lower.endsWith(ext))
}

const isColumnError = (err: { message?: string; code?: string } | null): boolean => {
  if (!err) return false
  const s = `${err.message || ''} ${err.code || ''}`
  return /42703|PGRST204|schema cache|column|undefined/i.test(s)
}

const tryInsertPost = async (payload: Record<string, unknown>): Promise<{ error: any }> => {
  const full = { ...payload }
  let { error } = await supabase.from('posts').insert(full)
  if (!error) return { error: null }

  // 降级1：去掉 anonymous_seed / is_anonymous（migration_v2 未执行）
  if (isColumnError(error) || /anonymous_seed|is_anonymous/i.test(error.message || '')) {
    const p1 = { ...full }
    delete p1.anonymous_seed
    delete p1.is_anonymous
    ;({ error } = await supabase.from('posts').insert(p1))
    if (!error) return { error: null }

    // 降级2：再去掉 mood / school / region（migration_v3 未执行）
    if (isColumnError(error) || /mood|school|region/i.test(error.message || '')) {
      const p2 = { ...p1 }
      delete p2.mood
      delete p2.school
      delete p2.region
      ;({ error } = await supabase.from('posts').insert(p2))
      if (!error) return { error: null }

      // 降级3：只保留最基本字段（极端降级）
      if (isColumnError(error) || /category|tags|media_urls/i.test(error.message || '')) {
        const p3: Record<string, unknown> = {
          content: full.content,
          author_id: full.author_id,
          author_name: full.author_name,
        }
        ;({ error } = await supabase.from('posts').insert(p3))
      }
    }
  }
  // 降级分支: 从 mood/school/region 开始
  else if (/mood|school|region/i.test(error.message || '')) {
    const p2 = { ...full }
    delete p2.mood
    delete p2.school
    delete p2.region
    ;({ error } = await supabase.from('posts').insert(p2))
  }

  return { error }
}

const submitPost = async () => {
  if (!newPostContent.value.trim()) return
  if (!user.value) {
    showToast('请先登录后再发布', 'error')
    return
  }

  // 确保 session 有效
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    showToast('登录状态已过期，请重新登录', 'error')
    return
  }

  if (selectedCategory.value === 'other' && !customCategoryText.value.trim()) {
    showToast('选择「其他」时请填写自定义类型，或改选上方预设分类', 'error')
    return
  }

  if (containsSensitiveWords(newPostContent.value)) {
    showToast('内容包含违规词汇，请修改后重试', 'error')
    return
  }

  try {
    const { data: postSanctions } = await supabase
      .from('user_sanctions')
      .select('*')
      .eq('user_id', user.value.id)
      .in('type', ['post_ban', 'full_ban'])
      .gt('expires_at', new Date().toISOString())
      .limit(1)
    if (postSanctions && postSanctions.length > 0) {
      const expiresAt = new Date(postSanctions[0].expires_at)
      const remainDays = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
      showToast(`发帖权限已被限制，还剩 ${remainDays} 天恢复`, 'error')
      return
    }
  } catch {
    // user_sanctions 表不存在时忽略，不阻塞发帖
  }

  isSubmitting.value = true

  try {
    const uploadedUrls: string[] = []
    let uploadFailCount = 0
    for (const file of selectedFiles.value) {
      const path = createStorageObjectPath('posts', user.value.id, file)
      const { data, error } = await supabase.storage.from('campus-wall').upload(path, file, buildCampusWallUploadOptions(file))
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      } else {
        uploadFailCount++
      }
    }
    if (uploadFailCount > 0) {
      showToast(`${uploadFailCount} 个附件上传失败，帖子将不含这些附件`, 'error')
    }

    const authorName = isAnonymous.value ? ANONYMOUS_PLACEHOLDER_NAME : displayName.value
    const anonymousSeed = isAnonymous.value ? createAnonymousSeed() : null

    const meta = user.value.user_metadata || {}
    const schoolSnapshot = (meta.university || meta.school || '').trim() || null
    const regionSnapshot = (meta.region || meta.city || '').trim() || null
    const moodVal = effectivePostMood()
    const catVal = effectivePostCategory()

    const newPostData: Record<string, unknown> = {
      content: newPostContent.value.trim(),
      author_id: user.value.id,
      author_name: authorName,
      is_anonymous: isAnonymous.value,
      tags: customTags.value.length ? customTags.value : [],
      media_urls: uploadedUrls,
      category: catVal,
    }
    if (isAnonymous.value && anonymousSeed) newPostData.anonymous_seed = anonymousSeed
    if (moodVal) newPostData.mood = moodVal
    if (schoolSnapshot) newPostData.school = schoolSnapshot
    if (regionSnapshot) newPostData.region = regionSnapshot

    const { error } = await tryInsertPost(newPostData)
    if (error) throw error

    composerExpanded.value = false
    resetComposerState()
    showToast('发布成功！', 'success')
    fetchPosts()
  } catch (error: unknown) {
    console.error('发布失败:', error)
    const err = error as { message?: string; code?: string }
    const msg = err?.message || ''
    const code = err?.code || ''
    let hint: string
    if (/JWT|session|expired|refresh/i.test(msg)) {
      hint = '登录已失效，请重新登录后再试'
    } else if (/permission|policy|row-level|denied|403|42501/i.test(`${msg}${code}`)) {
      hint = '无发帖权限，请确认已登录且账号未被限制。如问题持续，请联系管理员检查数据库权限策略'
    } else if (/42703|column|schema/i.test(`${msg}${code}`)) {
      hint = '数据库版本与客户端不一致，请联系管理员执行最新迁移脚本'
    } else if (/network|fetch|timeout|abort/i.test(msg)) {
      hint = '网络连接异常，请检查网络后重试'
    } else if (/duplicate|unique|23505/i.test(`${msg}${code}`)) {
      hint = '帖子可能已发布，请刷新页面查看'
    } else {
      hint = `发布失败：${msg.slice(0, 80) || '未知错误，请稍后重试'}`
    }
    showToast(hint, 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* ====== 三栏布局 ====== */
.wall-layout {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  gap: 24px;
  min-height: calc(100vh - 72px);
  padding: 20px 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ====== 左侧栏 ====== */
.wall-left { position: sticky; top: 80px; align-self: start; max-height: calc(100vh - 100px); overflow-y: auto; }
.wall-left::-webkit-scrollbar { width: 0; }
.left-inner { display: flex; flex-direction: column; gap: 16px; }

.left-brand { display: flex; align-items: center; gap: 10px; padding: 4px 0 8px; }
.brand-logo { width: 32px; height: 32px; border-radius: 8px; }
.brand-title { font-size: 18px; font-weight: 800; color: white; margin: 0; line-height: 1.2; }
.brand-sub { font-size: 11px; color: var(--color-text-muted); margin: 0; }

.left-nav { display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px; border-radius: 10px;
  background: transparent; border: none;
  color: var(--color-text-secondary); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.15s; text-align: left;
}
.nav-item:hover { background: rgba(255,255,255,0.04); color: white; }
.nav-item.active { background: rgba(79,142,247,0.1); color: #4f8ef7; font-weight: 600; }
.nav-icon { font-size: 16px; width: 22px; text-align: center; }
.nav-label { flex: 1; }

.profile-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 16px;
}
.pc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.pc-avatar-comp { flex-shrink: 0; border-radius: 50% !important; }
.pc-info { display: flex; flex-direction: column; }
.pc-name { font-size: 14px; font-weight: 600; color: white; }
.pc-school { font-size: 11px; color: var(--color-text-muted); }
.pc-stats { display: flex; justify-content: space-around; text-align: center; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
.pc-stat { display: flex; flex-direction: column; gap: 2px; }
.pc-num { font-size: 16px; font-weight: 700; color: white; }
.pc-label { font-size: 11px; color: var(--color-text-muted); }
.streak-row { display: flex; align-items: center; gap: 6px; padding: 10px 0 6px; }
.streak-icon { font-size: 16px; }
.streak-text { font-size: 12px; color: var(--color-text-secondary); }
.streak-text strong { color: #f59e0b; }
.mini-calendar { display: flex; gap: 4px; flex-wrap: wrap; }
.cal-dot {
  width: 14px; height: 14px; border-radius: 3px;
  background: rgba(255,255,255,0.04); transition: all 0.15s;
}
.cal-dot.active { background: rgba(79,142,247,0.5); }

.left-section {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 14px;
}
.ls-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.ls-title { font-size: 13px; font-weight: 600; color: white; margin: 0; }
.ls-action { background: none; border: none; color: var(--color-text-muted); font-size: 11px; cursor: pointer; }
.ls-action:hover { color: white; }
.task-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.task-check {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: transparent; flex-shrink: 0;
}
.task-check.done { background: rgba(16,185,129,0.2); border-color: #10b981; color: #10b981; }
.task-text { flex: 1; font-size: 12px; color: var(--color-text-secondary); }
.task-text.done { text-decoration: line-through; opacity: 0.5; }
.task-progress { font-size: 11px; color: var(--color-text-muted); }
.task-go { font-size: 11px; color: #4f8ef7; cursor: pointer; margin-left: auto; }
.task-go:hover { text-decoration: underline; }
.task-footer { font-size: 10px; color: var(--color-text-muted); margin: 8px 0 0; opacity: 0.7; }

/* 快速筛选行 */
.quick-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
.qf-chip {
  padding: 5px 14px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  color: var(--color-text-secondary); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.qf-chip:hover { border-color: rgba(255,255,255,0.15); color: white; }
.qf-chip.active { background: rgba(79,142,247,0.12); border-color: rgba(79,142,247,0.3); color: #4f8ef7; font-weight: 600; }

/* 档案卡：头像环 */
.pc-avatar-ring {
  position: relative; flex-shrink: 0;
  padding: 3px; border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #4f8ef7, #8b5cf6);
}
/* 等级徽章 */
.pc-level-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(79,142,247,0.2));
  border: 1px solid rgba(139,92,246,0.3);
  font-size: 11px; color: #a78bfa; font-weight: 600;
  margin-top: 4px;
}
.level-icon { font-size: 12px; }
.level-title { color: #c4b5fd; font-weight: 500; }
/* XP 进度条 */
.pc-xp-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.xp-bar {
  flex: 1; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.08); overflow: hidden;
}
.xp-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #8b5cf6, #4f8ef7);
  transition: width 0.5s ease;
}
.xp-text { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; }
/* 连续活跃提示 */
.streak-hint { font-size: 11px; color: var(--color-text-muted); padding-left: 22px; margin-top: -2px; }
/* 日历小数字 */
.cal-dot { position: relative; display: flex; align-items: center; justify-content: center; }
.cal-day { font-size: 8px; color: var(--color-text-muted); }
.cal-dot.active .cal-day { color: white; }

.heat-card {
  background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
  border: 1px solid rgba(139,92,246,0.2); border-radius: 14px; padding: 14px;
}
.heat-label { font-size: 12px; color: var(--color-text-muted); }
.heat-row { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
.heat-num { font-size: 24px; font-weight: 800; color: #a78bfa; }
.heat-badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
.heat-badge.up { color: #10b981; background: rgba(16,185,129,0.1); }
.heat-badge.down { color: #f43f5e; background: rgba(244,63,94,0.1); }
.heat-badge.flat { color: var(--color-text-muted); background: rgba(255,255,255,0.05); }
.heat-top { display: flex; justify-content: space-between; align-items: center; }
.heat-sub { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; display: block; }

/* ====== 中间 Feed ====== */
.wall-main { min-width: 0; }

/* 发布入口 + 快捷操作 */
.feed-topbar { margin-bottom: 16px; }
.compose-entry {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px; padding: 12px 18px; margin-bottom: 12px;
  cursor: pointer; transition: all 0.2s;
}
.compose-entry:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
.compose-avatar { flex-shrink: 0; }
.compose-avatar-img { border-radius: 50% !important; }
.compose-placeholder { color: var(--color-text-muted); font-size: 14px; }
.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.qa-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 7px 14px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  color: var(--color-text-secondary); font-size: 13px;
  cursor: pointer; transition: all 0.15s;
}
.qa-btn:hover { border-color: rgba(255,255,255,0.15); color: white; }
.qa-btn.qa-primary {
  background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
  border-color: transparent; color: white; font-weight: 600;
}
.qa-btn.qa-primary:hover { opacity: 0.9; }

/* ====== 右侧栏 ====== */
.wall-right { position: sticky; top: 80px; align-self: start; max-height: calc(100vh - 100px); overflow-y: auto; }
.wall-right::-webkit-scrollbar { width: 0; }
.right-inner { display: flex; flex-direction: column; gap: 16px; }

.right-publish-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 12px; border-radius: 12px;
  background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
  border: none; color: white; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.right-publish-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,142,247,0.3); }

.right-section {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 14px;
}
.rs-title { font-size: 13px; font-weight: 600; color: white; margin: 0 0 10px; }

.hot-list { display: flex; flex-direction: column; gap: 6px; }
.hot-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  cursor: pointer; transition: all 0.15s;
}
.hot-item:hover { opacity: 0.8; }
.hot-rank {
  width: 20px; height: 20px; border-radius: 4px; text-align: center;
  font-size: 11px; font-weight: 700; line-height: 20px;
  background: rgba(255,255,255,0.06); color: var(--color-text-muted);
}
.hot-rank.top { background: linear-gradient(135deg, #f59e0b, #f97316); color: white; }
.hot-text { flex: 1; font-size: 12px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-heat { font-size: 11px; color: var(--color-text-muted); }
.hot-empty { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 10px 0; }

.circle-list { display: flex; flex-direction: column; gap: 8px; }
.circle-item { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.circle-icon { font-size: 20px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border-radius: 8px; }
.circle-info { display: flex; flex-direction: column; }
.circle-name { font-size: 13px; color: white; font-weight: 500; }
.circle-count { font-size: 11px; color: var(--color-text-muted); }

.realtime-list { display: flex; flex-direction: column; gap: 8px; }
.rt-item { display: flex; align-items: flex-start; gap: 8px; }
.rt-avatar {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  background: rgba(79,142,247,0.15); color: #4f8ef7;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600;
}
.rt-content { flex: 1; display: flex; flex-direction: column; }
.rt-text { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; }
.rt-time { font-size: 10px; color: var(--color-text-muted); }

.ai-helper { background: linear-gradient(135deg, rgba(6,182,212,0.05), rgba(79,142,247,0.05)); border-color: rgba(6,182,212,0.15); }
.ai-desc { font-size: 12px; color: var(--color-text-muted); margin: 0 0 10px; }
.ai-suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
.ai-chip {
  padding: 5px 12px; border-radius: 20px;
  border: 1px solid rgba(6,182,212,0.2);
  background: rgba(6,182,212,0.06);
  color: #22d3ee; font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.ai-chip:hover { background: rgba(6,182,212,0.12); }

/* 本周活动日历 */
.activity-calendar { display: flex; flex-direction: column; gap: 8px; }
.cal-event { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
.cal-date { font-size: 11px; color: #a78bfa; font-weight: 600; white-space: nowrap; min-width: 72px; }
.cal-detail { display: flex; flex-direction: column; gap: 1px; }
.cal-event-name { font-size: 12px; color: white; font-weight: 500; }
.cal-event-info { font-size: 10px; color: var(--color-text-muted); }

/* 校园热搜 */
.hot-search-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hs-chip {
  padding: 4px 12px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  color: var(--color-text-secondary); font-size: 11px;
  cursor: pointer; transition: all 0.15s;
}
.hs-chip:hover { background: rgba(79,142,247,0.1); border-color: rgba(79,142,247,0.2); color: #4f8ef7; }

/* 实时动态统计行 */
.rt-stats-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.rt-stat { font-size: 11px; color: var(--color-text-muted); }
.rt-stat strong { color: #a78bfa; font-weight: 600; }
/* 迷你折线图 */
.rt-chart { margin-bottom: 10px; }
.rt-chart-svg { width: 100%; height: 60px; }
.rt-chart-labels { display: flex; justify-content: space-between; font-size: 9px; color: var(--color-text-muted); margin-top: 2px; }

/* 校园信任与安全 */
.trust-section { border-color: rgba(16,185,129,0.15); }
.trust-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.trust-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 8px;
  background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);
  font-size: 11px; color: #10b981;
}
.tc-icon { font-size: 12px; }

/* ====== 响应式：平板及以下 ====== */
@media (max-width: 1100px) {
  .wall-layout { grid-template-columns: 1fr; padding: 16px; }
  .wall-left, .wall-right { display: none; }
  .wall-left { position: static; }
  .wall-right { position: static; }
}

/* ====== 响应式：隐藏右侧栏 ====== */
@media (max-width: 1300px) and (min-width: 1101px) {
  .wall-layout { grid-template-columns: 220px 1fr; }
  .wall-right { display: none; }
}

/* ====== 骨架屏 ====== */
.skeleton-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
}
.skel-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skel-avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
.skel-line { height: 12px; }
.skel-block { height: 60px; margin-bottom: 12px; }
.w80 { width: 80%; } .w60 { width: 60%; } .w40 { width: 40%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ====== 空状态 ====== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-muted);
}
.empty-icon { margin-bottom: 16px; opacity: 0.4; }
.empty-state h3 { color: white; font-size: 18px; margin-bottom: 8px; }
.empty-state p { font-size: 14px; margin-bottom: 24px; }
.empty-btn {
  background: var(--gradient-brand);
  color: white; border: none;
  padding: 10px 24px; border-radius: 10px;
  font-weight: 600; cursor: pointer;
  transition: transform 0.2s;
}
.empty-btn:hover { transform: translateY(-2px); }

/* ====== 帖子卡片 ====== */
.feed-list { display: flex; flex-direction: column; gap: 20px; }
.post-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 22px;
  transition: all 0.25s ease;
}
.post-card:hover {
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.post-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.p-author { display: flex; gap: 12px; align-items: center; }
.p-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; color: white;
}
.p-info h4 { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: white; margin-bottom: 3px; }
.p-info .time { font-size: 12px; color: var(--color-text-muted); }

.tag {
  font-size: 10px; padding: 2px 7px; border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.12); font-weight: 500;
}
.tag.anon { border-color: var(--color-text-muted); color: var(--color-text-muted); }
.tag.cat-general { background: rgba(79,142,247,0.1); border-color: rgba(79,142,247,0.2); color: #4f8ef7; }
.tag.cat-confession { background: rgba(244,63,94,0.1); border-color: rgba(244,63,94,0.2); color: #f43f5e; }
.tag.cat-help { background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.2); color: #f97316; }
.tag.cat-trade { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); color: #10b981; }
.tag.cat-lost { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.2); color: #8b5cf6; }
.tag.cat-event { background: rgba(6,182,212,0.12); border-color: rgba(6,182,212,0.25); color: #06b6d4; }
.tag.cat-team { background: rgba(234,179,8,0.12); border-color: rgba(234,179,8,0.25); color: #eab308; }
.tag.cat-housing { background: rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.2); color: #ec4899; }
.tag.cat-carpool { background: rgba(20,184,166,0.1); border-color: rgba(20,184,166,0.2); color: #14b8a6; }
.tag.cat-lecture { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.2); color: #6366f1; }
.tag.cat-parttime { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2); color: #f59e0b; }
.tag.cat-food { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #ef4444; }
.tag.cat-rant { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.2); color: #a855f7; }
.tag.cat-other { background: rgba(107,114,128,0.15); border-color: rgba(107,114,128,0.3); color: #9ca3af; }
.tag.cat-custom { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.25); color: #a78bfa; }
.school-badge {
  font-size: 10px; font-weight: 500;
  padding: 1px 6px; border-radius: 3px;
  background: rgba(79,142,247,0.12); color: #60a5fa;
  border: 1px solid rgba(79,142,247,0.2);
}
.post-mood-chip {
  font-size: 10px; font-weight: 500;
  padding: 2px 8px; border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--color-text-secondary);
  max-width: 120px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.more-wrapper { position: relative; }
.more-btn { background: transparent; border: none; color: var(--color-text-muted); cursor: pointer; letter-spacing: 2px; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; }
.more-btn:hover { background: rgba(255,255,255,0.06); }

/* 下拉菜单 */
.dropdown-menu {
  position: absolute; top: 100%; right: 0;
  min-width: 140px;
  background: #1a1a24; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 6px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
  z-index: 100;
}
.dropdown-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 10px 14px;
  background: transparent; border: none; border-radius: 8px;
  color: var(--color-text-secondary); font-size: 13px;
  cursor: pointer; transition: all 0.15s;
}
.dropdown-item:hover { background: rgba(255,255,255,0.06); color: white; }
.dropdown-item.danger { color: #f43f5e; }
.dropdown-item.danger:hover { background: rgba(244,63,94,0.1); }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.95); }

/* 视频播放器样式 */
video.media-img { object-fit: contain; background: rgba(0, 0, 0, 0.45); }
.media-video-wrap,
.comment-video-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.video-fallback-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 120px;
  padding: 12px;
  text-align: center;
  color: rgba(255,255,255,0.9);
  font-size: 12px;
  line-height: 1.5;
  text-decoration: none;
}

.video-fallback-tip:hover {
  color: white;
  text-decoration: underline;
}

/* 内容折叠 */
.post-content { color: var(--color-text-primary); line-height: 1.65; font-size: 15px; margin-bottom: 12px; white-space: pre-wrap; word-break: break-word; }
.post-content.collapsed { max-height: calc(1.65em * 5); overflow: hidden; position: relative; }
.post-content.collapsed::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 2em;
  background: linear-gradient(transparent, var(--color-bg-primary));
  pointer-events: none;
}
.expand-btn {
  background: transparent; border: none;
  color: var(--color-brand-blue); font-size: 13px;
  cursor: pointer; margin-bottom: 12px;
  padding: 0; font-weight: 500;
}
.expand-btn:hover { text-decoration: underline; }

/* 帖子媒体网格 */
.post-media { margin: 12px 0; }
.media-grid { display: grid; gap: 4px; border-radius: 12px; overflow: hidden; }
.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.media-cell { position: relative; aspect-ratio: 1; overflow: hidden; cursor: pointer; }
.media-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; cursor: zoom-in; }
.media-cell:hover .media-img { transform: scale(1.05); }
.more-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 24px; font-weight: 700;
}

.post-tags { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.p-tag {
  display: inline-block;
  background: rgba(79,142,247,0.12);
  color: var(--color-brand-blue);
  padding: 3px 10px; border-radius: 20px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.p-tag:hover { background: rgba(79,142,247,0.22); }

/* 操作栏 */
.post-actions {
  display: flex; gap: 24px;
  border-top: 1px solid rgba(255,255,255,0.04);
  padding-top: 14px;
}
.action-btn {
  background: transparent; border: none;
  color: var(--color-text-secondary);
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; cursor: pointer; transition: color 0.2s;
}
.action-btn:hover { color: white; }
.action-btn.active { color: #f43f5e; }

/* ====== FAB ====== */
.fab {
  position: fixed;
  bottom: 36px; right: 36px;
  width: 56px; height: 56px;
  border-radius: 16px;
  background: var(--gradient-brand);
  border: none; color: white; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 999;
}
.fab:hover { transform: scale(1.08); }
.fab .cross {
  display: block; line-height: 1;
  transition: transform 0.3s ease;
}
.fab.active .cross { transform: rotate(45deg); }

/* ====== 发布面板 Modal ====== */
.composer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.composer-modal {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  width: 600px; max-width: 90vw;
  padding: 24px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}

.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .composer-modal,
.modal-leave-active .composer-modal { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from .composer-modal,
.modal-leave-to .composer-modal { transform: translateY(20px); }

.modal-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px;
}
.modal-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-orange));
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; color: white; flex-shrink: 0;
}
.modal-avatar-img {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
  border: 2px solid rgba(139, 92, 246, 0.3);
}
.modal-header h3 { flex: 1; font-size: 16px; font-weight: 700; color: white; }
.modal-close {
  background: transparent; border: none; color: var(--color-text-muted);
  cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s;
}
.modal-close:hover { color: white; background: rgba(255,255,255,0.06); }

/* 分类选择器 */
.category-picker { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.cat-chip {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-text-secondary);
  padding: 5px 14px; border-radius: 20px;
  font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.cat-chip:hover { border-color: rgba(255,255,255,0.2); }
.cat-chip.active {
  background: color-mix(in srgb, var(--cat-color) 12%, transparent);
  border-color: var(--cat-color);
  color: var(--cat-color);
}
.composer-hint {
  font-size: 12px; color: var(--color-text-muted);
  margin: -8px 0 12px;
  line-height: 1.4;
}
.custom-cat-input, .custom-mood-input {
  width: 100%;
  margin-bottom: 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px;
  color: white;
  font-size: 14px;
  outline: none;
}
.custom-cat-input:focus, .custom-mood-input:focus { border-color: var(--color-brand-blue); }
.mood-picker { margin-bottom: 14px; }
.mood-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}
.mood-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mood-chip {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-text-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.mood-chip:hover { border-color: rgba(255,255,255,0.2); color: white; }
.mood-chip.active {
  border-color: var(--color-brand-purple);
  color: #e9d5ff;
  background: rgba(139,92,246,0.12);
}

/* 文本框 */
.textarea-wrapper { position: relative; margin-bottom: 12px; }
.c-textarea {
  width: 100%;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 14px 16px;
  color: white; outline: none;
  resize: vertical;
  font-family: inherit; font-size: 15px; line-height: 1.6;
  transition: border-color 0.2s;
  min-height: 100px;
}
.c-textarea:focus { border-color: var(--color-brand-blue); }
.char-count {
  position: absolute; bottom: 10px; right: 14px;
  font-size: 11px; color: var(--color-text-muted);
}
.char-count.over { color: #f43f5e; }

/* 媒体预览（composer 内） */
.media-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.preview-item { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.preview-file {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 8px; gap: 4px;
}
.file-icon { font-size: 24px; }
.file-name { font-size: 10px; color: var(--color-text-secondary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.remove-btn {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(0,0,0,0.7); border: none;
  color: white; font-size: 14px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.2s;
}
.remove-btn:hover { background: rgba(244,63,94,0.8); }

/* 工具栏 */
.c-toolbar { display: flex; justify-content: space-between; align-items: center; }
.c-tools { display: flex; gap: 8px; align-items: center; }
.tool-btn {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  color: var(--color-text-secondary);
  padding: 6px 12px; border-radius: 8px;
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  transition: all 0.2s;
}
.tool-btn:hover { background: rgba(255,255,255,0.08); color: white; }
.anon-toggle { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; }
.anon-toggle input { accent-color: var(--color-brand-purple); }
.c-actions { display: flex; gap: 8px; }
.c-cancel {
  background: transparent; border: 1px solid rgba(255,255,255,0.08);
  color: white; padding: 8px 16px; border-radius: 8px;
  font-size: 14px; cursor: pointer; transition: background 0.2s;
}
.c-cancel:hover { background: rgba(255,255,255,0.05); }
.c-submit {
  background: var(--gradient-brand); border: none;
  color: white; padding: 8px 20px; border-radius: 8px;
  font-weight: 600; font-size: 14px; cursor: pointer;
  transition: all 0.2s;
}
.c-submit:disabled { opacity: 0.4; cursor: not-allowed; }

/* ====== Toast ====== */
.toast {
  position: fixed;
  bottom: 40px; right: 40px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px; font-weight: 500;
  display: flex; align-items: center; gap: 8px;
  z-index: 2000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.toast.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
}
.toast.error {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #f43f5e;
}

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateY(20px); }
.toast-leave-to { opacity: 0; transform: translateY(10px); }

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .wall-layout { padding: 16px 0; }
  .post-actions { gap: 16px; }
  .fab { bottom: 24px; right: 24px; width: 52px; height: 52px; font-size: 24px; }
  .toast { bottom: 24px; right: 16px; left: 16px; }
  .composer-modal { border-radius: 20px 20px 0 0; position: fixed; bottom: 0; max-height: 85vh; overflow-y: auto; }
  .composer-overlay { align-items: flex-end; }
  .comment-drawer { width: 100vw; }
  .report-modal { width: 95vw; }
}

/* ====== 评论侧滑抽屉 ====== */
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: flex-end; }
.comment-drawer {
  width: 420px; max-width: 100vw; height: 100vh;
  background: #0f0f17; border-left: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; overflow: hidden;
}
.drawer-header {
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
}
.drawer-header h3 { font-size: 16px; font-weight: 700; color: white; }

.original-post-preview {
  padding: 12px 24px; background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 13px; color: var(--color-text-muted); line-height: 1.5; flex-shrink: 0;
}

.comment-list { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 16px; }
.comment-loading { display: flex; flex-direction: column; gap: 12px; padding: 16px 0; }
.comment-empty {
  text-align: center; color: var(--color-text-muted); font-size: 14px;
  padding: 32px 0; display: flex; flex-direction: column; align-items: center;
}

.comment-item { display: flex; gap: 10px; align-items: flex-start; }
.c-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 12px; color: white;
}
.c-avatar-sm.self { width: 36px; height: 36px; }
.c-avatar-self { flex-shrink: 0; border-radius: 50% !important; }
.c-body { flex: 1; min-width: 0; }
.c-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.c-name { font-size: 13px; font-weight: 600; color: white; }
.c-time { font-size: 11px; color: var(--color-text-muted); }
.c-delete {
  background: transparent; border: none;
  color: rgba(255,255,255,0.3); font-size: 11px;
  cursor: pointer; margin-left: auto; padding: 3px 8px;
  border-radius: 6px; transition: all 0.15s;
  display: inline-flex; align-items: center; gap: 3px;
}
.c-delete:hover { color: #f43f5e; background: rgba(244,63,94,0.08); }
.c-text { font-size: 14px; color: var(--color-text-primary); line-height: 1.5; word-break: break-word; }
.c-media { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.c-media-img { max-width: 120px; max-height: 120px; border-radius: 8px; object-fit: cover; cursor: pointer; }

.comment-input-area {
  padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0; background: #0f0f17;
}
.comment-input-row { display: flex; gap: 10px; align-items: flex-start; }
.comment-field { flex: 1; min-width: 0; }
.comment-textarea {
  width: 100%; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
  padding: 10px 12px; color: white; outline: none; resize: none;
  font-family: inherit; font-size: 14px; line-height: 1.5; transition: border-color 0.2s;
}
.comment-textarea:focus { border-color: var(--color-brand-blue); }
.comment-actions-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.comment-tools { display: flex; gap: 8px; align-items: center; }
.tool-btn-sm {
  background: transparent; border: none; cursor: pointer;
  font-size: 18px; padding: 2px; opacity: 0.6; transition: opacity 0.2s;
}
.tool-btn-sm:hover { opacity: 1; }
.anon-toggle-sm {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--color-text-muted); cursor: pointer;
}
.anon-toggle-sm input { accent-color: var(--color-brand-purple); }
.comment-submit {
  background: var(--gradient-brand); border: none; color: white;
  padding: 6px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.comment-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.comment-media-preview { display: flex; gap: 6px; margin-bottom: 8px; }
.cp-item { position: relative; width: 60px; height: 60px; border-radius: 8px; overflow: hidden; }
.cp-img { width: 100%; height: 100%; object-fit: cover; }

/* 抽屉过渡动画 */
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-active .comment-drawer, .drawer-leave-active .comment-drawer { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from .comment-drawer, .drawer-leave-to .comment-drawer { transform: translateX(100%); }

/* ====== 举报 Modal ====== */
.report-modal {
  background: #111118; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px; width: 520px; max-width: 90vw; max-height: 85vh;
  overflow-y: auto; padding: 24px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}
.report-tip { font-size: 13px; color: var(--color-text-muted); margin-bottom: 12px; }
.report-categories { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.report-cat-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
  cursor: pointer; transition: all 0.2s; text-align: left;
}
.report-cat-item:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
.report-cat-item.active { border-color: var(--color-brand-blue); background: rgba(79,142,247,0.08); }
.rcat-icon { font-size: 20px; flex-shrink: 0; }
.rcat-info { flex: 1; }
.rcat-label { font-size: 14px; font-weight: 600; color: white; display: block; }
.rcat-desc { font-size: 12px; color: var(--color-text-muted); }
.rcat-check { color: var(--color-brand-blue); font-weight: 700; flex-shrink: 0; }

.report-desc-area { margin-bottom: 16px; }
.report-desc-area label, .report-evidence label {
  display: block; font-size: 13px; color: var(--color-text-muted); margin-bottom: 8px;
}

.report-evidence { margin-bottom: 16px; }
.evidence-preview { display: flex; gap: 8px; margin-bottom: 8px; }
.evidence-upload-btn {
  width: 100%; justify-content: center; padding: 12px;
  border: 1px dashed rgba(255,255,255,0.15) !important;
  background: rgba(255,255,255,0.02); color: var(--color-text-muted);
  border-radius: 10px; font-size: 13px; cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center;
}
.evidence-upload-btn:hover { border-color: rgba(255,255,255,0.3) !important; background: rgba(255,255,255,0.04); color: white; }

.report-disclaimer {
  font-size: 12px; color: #f97316;
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.2);
  border-radius: 8px; padding: 10px 12px; line-height: 1.5;
}

/* ====== 自定义标签输入 ====== */
.tags-input-area { margin-bottom: 12px; }
.tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.c-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(79,142,247,0.12); color: var(--color-brand-blue);
  padding: 4px 10px; border-radius: 20px; font-size: 13px;
}
.tag-remove {
  background: transparent; border: none; color: inherit;
  font-size: 14px; cursor: pointer; padding: 0; line-height: 1;
  opacity: 0.6;
}
.tag-remove:hover { opacity: 1; }
.tag-input {
  width: 100%; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
  padding: 8px 12px; color: white; outline: none;
  font-family: inherit; font-size: 13px; transition: border-color 0.2s;
}
.tag-input:focus { border-color: var(--color-brand-blue); }
.tag-input::placeholder { color: var(--color-text-muted); }

/* ====== 评论互动栏 ====== */
.c-interact {
  display: flex; gap: 16px; align-items: center;
  margin-top: 6px;
}
.c-like-btn, .c-reply-btn {
  background: transparent; border: none;
  color: var(--color-text-muted); font-size: 12px;
  cursor: pointer; display: flex; align-items: center; gap: 4px;
  padding: 2px 0; transition: color 0.15s;
}
.c-like-btn:hover { color: #f43f5e; }
.c-like-btn.liked { color: #f43f5e; }
.c-reply-btn:hover { color: var(--color-brand-blue); }

/* ====== 回复标记 ====== */
.c-reply-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--color-brand-blue);
  background: rgba(79,142,247,0.08);
  padding: 2px 8px; border-radius: 4px; margin-bottom: 4px;
}

/* ====== 回复指示器 ====== */
.reply-indicator {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(79,142,247,0.08);
  border: 1px solid rgba(79,142,247,0.2);
  border-radius: 8px 8px 0 0; padding: 6px 12px;
  font-size: 12px; color: var(--color-brand-blue);
}
.reply-cancel {
  background: transparent; border: none;
  color: var(--color-text-muted); font-size: 16px;
  cursor: pointer; padding: 0;
}
.reply-cancel:hover { color: white; }

/* ====== 媒体工具按钮（带文字） ====== */
.media-tool-btn {
  display: flex; align-items: center; gap: 4px;
  background: transparent; border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-text-muted); font-size: 12px;
  padding: 4px 10px; border-radius: 8px;
  cursor: pointer; transition: all 0.15s;
}
.media-tool-btn:hover {
  border-color: rgba(255,255,255,0.2); color: white;
  background: rgba(255,255,255,0.04);
}
.media-tool-btn svg { flex-shrink: 0; }

/* ====== 表情选择器 ====== */
.emoji-picker {
  display: grid; grid-template-columns: repeat(10, 1fr);
  gap: 4px; padding: 12px;
  background: #1a1a24; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; margin-top: 8px;
  max-height: 160px; overflow-y: auto;
}
.emoji-item {
  background: transparent; border: none;
  font-size: 22px; cursor: pointer; padding: 4px;
  border-radius: 6px; transition: background 0.1s;
  text-align: center;
}
.emoji-item:hover { background: rgba(255,255,255,0.08); }

/* ====== 评论视频 ====== */
.c-media-video {
  max-width: 200px; max-height: 150px;
  border-radius: 8px; object-fit: cover;
}

/* ====== 图片放大 Lightbox ====== */
.lightbox-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out;
}
.lightbox-img {
  max-width: 90vw; max-height: 90vh;
  object-fit: contain; border-radius: 8px;
  cursor: default;
}
.lightbox-close {
  position: fixed; top: 20px; right: 20px;
  background: rgba(255,255,255,0.1); border: none;
  color: white; width: 40px; height: 40px;
  border-radius: 50%; font-size: 24px;
  cursor: pointer; transition: background 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.lightbox-close:hover { background: rgba(255,255,255,0.2); }

/* ====== 评论图片可点击样式 ====== */
.c-media-img { cursor: zoom-in; transition: transform 0.15s; }
.c-media-img:hover { transform: scale(1.05); }

/* 匿名标签 */
.anon-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 1px; line-height: 1;
  color: rgba(255,255,255,0.7);
}

/* ====== 评论举报 / 隐藏 / 申诉 ====== */
.comment-hidden {
  opacity: 0.5;
}
.hidden-comment-placeholder {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; width: 100%;
  color: rgba(255,255,255,0.35); font-size: 12px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06);
}
.hidden-own-banner {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; margin-bottom: 6px;
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.12);
  border-radius: 8px;
  font-size: 11px; color: #fbbf24;
}
.appeal-btn {
  margin-left: auto; background: transparent;
  border: 1px solid rgba(251,191,36,0.25);
  color: #fbbf24; padding: 2px 10px; border-radius: 6px;
  font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.appeal-btn:hover {
  background: rgba(251,191,36,0.12);
  border-color: rgba(251,191,36,0.4);
}
.c-report-btn {
  background: none; border: none;
  color: rgba(255,255,255,0.3); cursor: pointer;
  padding: 2px 0; font-size: 12px;
  transition: all 0.15s; display: flex; align-items: center; gap: 4px;
}
.c-report-btn:hover {
  color: #f87171;
}
.text-muted {
  opacity: 0.5; text-decoration: line-through;
}

/* ====== 星火墙数据概览 ====== */
.wall-stats-bar {
  display: flex; gap: 16px; padding: 10px 16px; margin: 0 auto 10px;
  max-width: 640px; border-radius: 12px;
  background: rgba(139,92,246,0.03); border: 1px solid rgba(139,92,246,0.06);
}
.ws-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;
}
.ws-num {
  font-size: 16px; font-weight: 700; color: rgba(139,92,246,0.6);
  font-variant-numeric: tabular-nums;
}
.ws-label {
  font-size: 9px; color: rgba(255,255,255,0.2); letter-spacing: 0.5px;
}

/* ====== 星火洞察面板 ====== */
.wall-insight-panel {
  margin: 0 auto 10px; max-width: 640px;
  border-radius: 12px; overflow: hidden;
  background: rgba(139,92,246,0.02);
  border: 1px solid rgba(139,92,246,0.06);
}
.wip-toggle {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 10px 16px; border: none; background: transparent;
  color: rgba(255,255,255,0.4); font-size: 12px; cursor: pointer;
  transition: all 0.15s;
}
.wip-toggle:hover { background: rgba(139,92,246,0.04); color: rgba(255,255,255,0.6); }
.wip-toggle-label { font-weight: 600; }
.wip-toggle-arrow { font-size: 16px; transition: transform 0.25s; display: inline-block; }
.wip-toggle-arrow.open { transform: rotate(90deg); }
.wip-body { padding: 0 16px 14px; }
.wip-section { margin-bottom: 16px; }
.wip-section:last-child { margin-bottom: 0; }
.wip-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3); margin: 0 0 8px; }

/* 词云 */
.wip-wordcloud {
  display: flex; flex-wrap: wrap; gap: 6px 10px;
  align-items: center; justify-content: center;
  padding: 8px 4px; min-height: 60px;
}
.wc-word {
  border: none; background: transparent; cursor: pointer;
  font-weight: 600; letter-spacing: 0.3px;
  transition: all 0.2s; animation: wcFadeIn 0.4s both;
  padding: 2px 4px; border-radius: 4px;
}
.wc-word:hover {
  transform: scale(1.12);
  text-shadow: 0 0 12px currentColor;
  background: rgba(139,92,246,0.08);
}
@keyframes wcFadeIn { from { opacity: 0; transform: scale(0.7) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }

/* 7日趋势图 */
.wip-trend { display: flex; align-items: flex-end; gap: 12px; }
.wip-trend-chart {
  display: flex; align-items: flex-end; gap: 4px;
  height: 50px; flex: 1;
}
.wip-bar-col { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; height: 100%; justify-content: flex-end; }
.wip-bar {
  width: 100%; min-height: 2px; max-height: 100%;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(to top, rgba(139,92,246,0.15), rgba(139,92,246,0.4));
  transition: height 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.wip-bar-label { font-size: 8px; color: rgba(255,255,255,0.15); }
.wip-trend-summary { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 48px; }
.wip-trend-num { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.wip-trend-num.up { color: rgba(34,197,94,0.7); }
.wip-trend-num.down { color: rgba(239,68,68,0.6); }
.wip-trend-num.flat { color: rgba(255,255,255,0.25); }
.wip-trend-desc { font-size: 9px; color: rgba(255,255,255,0.2); white-space: nowrap; }

/* 活跃时段 */
.wip-hours { display: flex; gap: 2px; flex-wrap: wrap; }
.wip-hour-dot {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 22px; height: 26px; border-radius: 4px;
  background: rgba(139,92,246,0.05);
  justify-content: center; transition: all 0.15s;
}
.wip-hour-dot.active { background: rgba(139,92,246,0.15); }
.wip-hour-label { font-size: 7px; color: rgba(255,255,255,0.2); }

/* 面板过渡 */
.panel-slide-enter-active { transition: all 0.3s ease; }
.panel-slide-leave-active { transition: all 0.2s ease; }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.panel-slide-enter-to, .panel-slide-leave-from { opacity: 1; max-height: 400px; }

/* ====== 表情回应 ====== */
.post-reactions { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 16px 0; }
.reaction-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 12px; font-size: 12px;
  border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.15s;
}
.reaction-chip span { font-size: 10px; }
.reaction-chip:hover { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.15); }
.reaction-chip.mine { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.2); color: rgba(139,92,246,0.8); }
.reaction-trigger-wrap { position: relative; }
.reaction-picker {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  display: flex; gap: 2px; padding: 6px 8px;
  background: rgba(24,24,36,0.95); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  z-index: 10; white-space: nowrap;
}
.rp-emoji {
  border: none; background: transparent; font-size: 18px;
  cursor: pointer; padding: 2px 4px; border-radius: 6px;
  transition: all 0.12s;
}
.rp-emoji:hover { background: rgba(139,92,246,0.12); transform: scale(1.2); }

/* ====== 热门标签 ====== */
.wall-trending {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 0; margin-bottom: 12px;
}
.wt-label {
  font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 600;
  white-space: nowrap;
}
.wt-tag {
  padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.08);
  background: rgba(139,92,246,0.03); color: rgba(139,92,246,0.5);
  font-size: 10px; cursor: pointer; transition: all 0.12s;
  white-space: nowrap;
}
.wt-tag:hover {
  background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.15);
  color: rgba(139,92,246,0.7);
}
.wt-tag.active {
  background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3);
  color: #a78bfa;
}
.wt-clear {
  padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(244,63,94,0.15);
  background: rgba(244,63,94,0.05); color: #f43f5e;
  font-size: 10px; cursor: pointer; transition: all 0.12s;
}
.wt-clear:hover { background: rgba(244,63,94,0.12); }
.wt-count {
  font-size: 9px; color: rgba(255,255,255,0.15); margin-left: 2px;
}
</style>
