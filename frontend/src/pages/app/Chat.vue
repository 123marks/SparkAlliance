<template>
  <div class="chat-layout" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
    <!-- 宇宙深空动态背景 -->
    <!-- 拖拽遮罩 -->
    <Transition name="fade">
      <div v-if="isDragging" class="drop-overlay"><div class="drop-box"><div class="drop-icon">📎</div><div class="drop-text">松开即可上传</div><div class="drop-hint">支持文本、代码、图片等文件</div></div></div>
    </Transition>
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="showToast" class="toast">{{ toastMsg }}</div>
    </Transition>

    <!-- 侧边栏 -->
    <aside class="chat-sidebar" :class="{ open: sidebarOpen }">
      <div class="sb-top">
        <button class="new-btn" aria-label="新建对话（Ctrl+N）" @click="handleNewChat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新对话
        </button>
      </div>
      <!-- v9: 搜索框 -->
      <div class="sb-search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="sb-search-input" v-model="sbSearchQuery" placeholder="搜索会话或消息（Ctrl+K）" class="sb-search-input" aria-label="搜索会话" />
        <button v-if="sbSearchQuery" class="sb-search-clear" aria-label="清空搜索" @click="sbSearchQuery = ''">×</button>
      </div>

      <div class="sb-list">
        <!-- 搜索态 -->
        <template v-if="sbSearchQuery.trim()">
          <div class="sb-label">🔎 搜索结果（{{ sbSearchResults.length }}）</div>
          <div v-for="r in sbSearchResults" :key="r.conversation.id" class="sb-item sb-item-search" :class="{ active: r.conversation.id === currentConversationId }" @click="handleSwitch(r.conversation.id)">
            <div class="sb-text-wrap">
              <div class="sb-text">
                <span v-if="r.conversation.isPinned" class="pin-dot">⭐</span>
                {{ r.conversation.title }}
              </div>
              <div v-if="r.hitSnippet" class="sb-hit">{{ r.hitSnippet }}</div>
            </div>
          </div>
          <div v-if="!sbSearchResults.length" class="sb-empty">无匹配</div>
        </template>

        <!-- 正常分组 -->
        <template v-else>
          <div v-for="g in groupedConvs" :key="g.label" class="sb-group" :class="{ 'sb-group-pinned': g.kind === 'pinned' }">
            <div class="sb-label">{{ g.label }}</div>
            <template v-for="c in g.items" :key="c.id">
              <!-- 重命名态：显示输入框 -->
              <div v-if="renamingId === c.id" class="sb-rename">
                <input
                  :id="'rn-input-' + c.id"
                  v-model="renameText"
                  class="sb-rename-input"
                  maxlength="40"
                  @click.stop
                  @keydown.enter="confirmRename"
                  @keydown.esc="cancelRename"
                  @blur="confirmRename"
                />
              </div>
              <!-- 正常态：会话项 -->
              <div v-else class="sb-item" :class="{ active: c.id === currentConversationId }" @click="handleSwitch(c.id)">
                <span v-if="c.isPinned" class="pin-dot" title="已置顶">⭐</span>
                <span class="sb-text">{{ c.title }}</span>
                <button class="sb-more" aria-label="会话操作菜单" @click.stop="toggleMenu(c.id)">⋯</button>
                <!-- v9: 浮层菜单 -->
                <div v-if="openMenuId === c.id" class="sb-menu" @click.stop>
                  <button class="sb-menu-item" @click="startRename(c)">
                    <span class="mi-icon">✏️</span><span>重命名</span>
                  </button>
                  <button class="sb-menu-item" @click="(openMenuId = null, togglePinConversation(c.id) && toast('⭐ 已置顶'))">
                    <span class="mi-icon">{{ c.isPinned ? '📍' : '⭐' }}</span><span>{{ c.isPinned ? '取消置顶' : '置顶' }}</span>
                  </button>
                  <button class="sb-menu-item" @click="(openMenuId = null, toggleArchiveConversation(c.id) && toast(c.isArchived ? '已归档' : '已取消归档'))">
                    <span class="mi-icon">📦</span><span>{{ c.isArchived ? '取消归档' : '归档' }}</span>
                  </button>
                  <button class="sb-menu-item" @click="openMenuId = null; duplicateConversation(c.id); toast('✓ 已克隆为新会话')">
                    <span class="mi-icon">📄</span><span>克隆会话</span>
                  </button>
                  <div class="sb-menu-div"></div>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'markdown')">
                    <span class="mi-icon">📥</span><span>导出 Markdown</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'json')">
                    <span class="mi-icon">📥</span><span>导出 JSON</span>
                  </button>
                  <div class="sb-menu-div"></div>
                  <button class="sb-menu-item sb-menu-item-danger" @click="openMenuId = null; handleDelete(c.id)">
                    <span class="mi-icon">🗑️</span><span>删除</span>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </template>

        <div v-if="conversations.length === 0" class="sb-empty">开始你的第一次对话</div>

        <!-- 归档折叠开关 -->
        <button v-if="archivedCount > 0 && !sbSearchQuery.trim()" class="sb-toggle-archived" @click="showArchived = !showArchived">
          {{ showArchived ? '▼' : '▶' }} 已归档（{{ archivedCount }}）
        </button>
      </div>
    </aside>

    <!-- 主区域 -->
    <main class="chat-main">
      <header class="top-bar">
        <button class="menu-btn" aria-label="切换侧边栏" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="top-brand"><span class="top-icon pulse">⚡</span><span class="top-title">星火助手</span></div>
        <div class="top-right">
          <!-- v9: 后端切换（云端 / 自动 / 本地 Gamma4） -->
          <div class="backend-switch" :class="{ 'has-local': localAvailable }">
            <button
              class="bk-btn"
              :class="{ active: currentBackend === 'auto' }"
              title="自动：云端优先，失败时降级本地 Gamma4"
              @click="handleBackendChange('auto')"
            >
              <span class="bk-icon">🌐</span>自动
            </button>
            <button
              class="bk-btn"
              :class="{ active: currentBackend === 'cloud' }"
              title="仅云端：Supabase Edge Function → NVIDIA NIM API"
              @click="handleBackendChange('cloud')"
            >
              <span class="bk-icon">☁️</span>云端
            </button>
            <button
              class="bk-btn"
              :class="{ active: currentBackend === 'local', disabled: localAvailable === false }"
              :title="localAvailable ? `仅本地 Gamma4 · ${localModelName || 'Ollama'}（离线可用）` : '本地 AI 服务未启动：在 services/local-ai 运行 npm run dev 并启动 Ollama'"
              @click="handleBackendChange('local')"
            >
              <span class="bk-icon">🏠</span>本地
              <span v-if="localAvailable" class="bk-dot-ok"></span>
              <span v-else-if="localAvailable === false" class="bk-dot-off"></span>
            </button>
          </div>

          <!-- 上下文窗口用量指示器 -->
          <div class="ctx-gauge" :title="`本轮已占用 ${contextUsage.used} / ${contextUsage.limit} 条对话记忆`" v-if="contextUsage.used > 0">
            <span class="ctx-label">记忆</span>
            <span class="ctx-bar"><span class="ctx-fill" :class="{ warn: contextUsage.ratio > 0.8 }" :style="{ width: (contextUsage.ratio * 100).toFixed(0) + '%' }"></span></span>
            <span class="ctx-num">{{ contextUsage.used }}/{{ contextUsage.limit }}</span>
          </div>
          <!-- 离线指示 -->
          <span v-if="!isOnline" class="offline-dot" title="离线">● 离线</span>
          <!-- 收藏夹入口 -->
          <button class="top-fav" aria-label="查看收藏消息" :title="`收藏夹（${favorites.length}）`" @click="showFavorites = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span v-if="favorites.length" class="top-fav-count">{{ favorites.length }}</span>
          </button>
        </div>
      </header>

      <!-- 消息区 -->
      <div class="msgs" ref="scrollRef" @click="handleMsgAreaClick">
        <div v-if="displayMsgs.length === 0 && !isStreaming" class="empty">
          <div class="empty-icon">⚡</div>
          <h2>你好，我是星火助手</h2>
          <p>我深度理解 Spark Alliance 每个功能模块，能帮你管理日程、制定规划、辅导学习、解题答疑</p>
          <div class="quick-grid">
            <button v-for="q in starters" :key="q.t" class="qcard" @click="handleQuick(q.t)">
              <span class="qi">{{ q.i }}</span><span class="qt">{{ q.l }}</span><span class="qd">{{ q.t }}</span>
            </button>
          </div>
          <div class="workflow-intro">
            <div class="wi-title">🚀 一键工作流</div>
            <div class="workflow-row">
              <button v-for="w in WORKFLOW_PRESETS" :key="w.key" class="wf-chip" @click="applyWorkflow(w)" :title="w.hint">
                <span class="wf-icon">{{ w.icon }}</span>{{ w.label }}
              </button>
            </div>
          </div>
        </div>

        <template v-for="(msg, idx) in displayMsgs" :key="idx">
          <div class="msg-row" :class="msg.role" :title="msg.createdAt ? new Date(msg.createdAt).toLocaleString('zh-CN') : ''">
            <div v-if="msg.role === 'assistant'" class="av">⚡</div>
            <div class="msg-content">
              <div v-if="msg.attachments?.length" class="file-cards">
                <div v-for="(a, i) in msg.attachments" :key="i" class="file-card"><div class="fc-icon">{{ a.type === 'image' ? '🖼️' : '📄' }}</div><div class="fc-info"><div class="fc-name">{{ a.name }}</div><div class="fc-size">{{ a.size }}</div></div></div>
              </div>
              <div v-if="msg.role === 'user'" class="user-bubble"><div class="u-text">{{ msg.displayContent || msg.content }}</div></div>
              <div v-if="msg.role === 'user' && !isStreaming" class="msg-acts user-acts">
                <button @click="copyText(msg.content)" title="复制"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button @click="editMessage(idx)" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              </div>
              <!-- 思考过程 -->
              <div v-if="msg.role === 'assistant' && (msg.reasoning || (isStreaming && idx === displayMsgs.length - 1 && thinkingText))" class="think-block">
                <button class="think-toggle" @click="collapsedThinking[idx] = !collapsedThinking[idx]">
                  <span class="think-status" :class="{ spinning: isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' }">💭</span>
                  <span>{{ isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' ? '正在思考...' : '思考过程' }}</span>
                  <svg class="think-chevron" :class="{ collapsed: collapsedThinking[idx] }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div v-show="!collapsedThinking[idx]" class="think-body">{{ msg.reasoning || thinkingText }}</div>
              </div>
              <div v-if="msg.role === 'assistant' && isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'thinking' && !msg.content && !msg.reasoning && !thinkingText" class="think-block think-block-loading">
                <div class="think-toggle"><span class="think-status spinning">💭</span><span>{{ thinkingHint }}</span></div>
                <div class="think-dots"><span></span><span></span><span></span></div>
                <div class="think-sub-hint">{{ thinkingSubHint }}</div>
              </div>
              <!-- AI 回复（含导航链接渲染） -->
              <div v-if="msg.role === 'assistant' && msg.content" class="md-body" v-html="renderMd(msg.content)" @click="handleMdClick"></div>
              <!-- v9: 命中缓存徽章 -->
              <span v-if="msg.role === 'assistant' && msg.fromCache" class="cache-badge" title="此回复来自本地响应缓存，内容与最新请求一致">⚡ 来自缓存</span>
              <span v-if="msg.role === 'assistant' && isStreaming && idx === displayMsgs.length - 1 && streamPhase === 'streaming'" class="cursor"></span>
              <div v-if="msg.role === 'assistant' && !isStreaming && msg.content" class="msg-acts">
                <button @click="copyText(msg.content)" title="复制" aria-label="复制回复">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                </button>
                <button @click="retryFrom(idx)" title="重新回答" aria-label="重新回答">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                </button>
                <button
                  :class="{ active: msg.id && isMessageFavorited(msg.id) }"
                  @click="handleToggleFavorite(idx)"
                  :title="msg.id && isMessageFavorited(msg.id) ? '取消收藏' : '收藏此回复'"
                  aria-label="收藏消息"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" :fill="msg.id && isMessageFavorited(msg.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button
                  :class="{ active: msg.id && getMessageReaction(msg.id) === 'like' }"
                  @click="handleReact(idx, 'like')"
                  title="回复质量好"
                  aria-label="点赞"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg>
                </button>
                <button
                  :class="{ active: msg.id && getMessageReaction(msg.id) === 'dislike' }"
                  @click="handleReact(idx, 'dislike')"
                  title="回复需改进"
                  aria-label="标记不佳"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 01-1.92-2.56l2.33-8A2 2 0 016.5 2H20a2 2 0 012 2v8a2 2 0 01-2 2h-2.76a2 2 0 00-1.79 1.11L12 22a3.13 3.13 0 01-3-3.88z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- 操作卡片 -->
        <div v-if="actionCards.length" class="act-panel">
          <div class="act-title">🎯 可同步操作</div>
          <div v-for="(a, i) in actionCards" :key="i" class="act-card">
            <span class="act-icon">{{ a.icon }}</span>
            <div class="act-info"><div class="act-label">{{ a.label }}</div><div class="act-desc">{{ a.desc }}</div></div>
            <button class="act-btn" :disabled="a.done" @click="execAction(a.action)">{{ a.done ? '✓ 已同步' : '同步执行' }}</button>
            <button v-if="!a.done" class="act-skip" @click="actionCards.splice(i,1)">忽略</button>
          </div>
        </div>
        <div v-if="aiError" class="err-bar"><span>⚠️ {{ aiError }}</span><button @click="retryLast">重试</button></div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <div v-if="pendingFiles.length" class="pf-list">
          <div v-for="(f, i) in pendingFiles" :key="i" class="pf-chip">
            <img v-if="f.type === 'image' && f.url" :src="f.url" class="pf-thumb"><span v-else class="pf-ficon">📄</span>
            <span class="pf-name">{{ f.name }}</span><button class="pf-x" @click="pendingFiles.splice(i,1)">×</button>
          </div>
        </div>
        <div v-if="isRec" class="voice-rec-bar">
          <button class="voice-cancel" @click="cancelVoice" title="取消">✕</button>
          <div class="voice-wave-wrap" ref="waveWrapRef">
            <canvas ref="waveCanvas" class="voice-wave" height="32"></canvas>
            <span class="voice-dur">{{ recDuration }}s</span>
          </div>
          <button class="voice-done" @click="finishVoice" title="完成">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div v-else class="ibox" :class="{ focus: iFocus }">
          <div class="itools">
            <button class="itool" @click="fileInput?.click()" title="上传文件" aria-label="上传文件">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button class="itool" @click="toggleVoice" title="语音" aria-label="语音输入">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
            </button>
            <button class="itool itool-emoji" :class="{ active: showEmoji }" @click="showEmoji = !showEmoji" title="表情" aria-label="表情选择">
              <span style="font-size:16px;">😊</span>
            </button>
          </div>
          <input ref="fileInput" type="file" multiple accept="*/*" @change="onFileInput" style="display:none">
          <textarea ref="inputRef" v-model="inputText" :placeholder="isOnline ? '输入你的问题...（Shift+Enter 换行 · Ctrl+/ 工作流 · Ctrl+K 搜索）' : '离线中，恢复网络后才能发送'" rows="1" @keydown="onKey" @focus="iFocus=true" @blur="iFocus=false" @input="autoResize" @paste="onPaste" :disabled="!isOnline"></textarea>
          <button v-if="isStreaming" class="send stop-mode" @click="stopGenerating" title="停止" aria-label="停止生成">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
          <button v-else class="send" :disabled="!isOnline || (!inputText.trim() && !pendingFiles.length)" @click="handleSend" title="发送（Enter）" aria-label="发送">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>

        <!-- v9: Emoji 选择器 -->
        <Transition name="emoji-pop">
          <div v-if="showEmoji" class="emoji-panel">
            <div class="emoji-cats">
              <button class="emoji-cat" :class="{ active: emojiCategory === 'recent' }" @click="emojiCategory = 'recent'">🕒</button>
              <button v-for="cat in EMOJI_CATEGORIES" :key="cat.key" class="emoji-cat" :class="{ active: emojiCategory === cat.key }" :title="cat.label" @click="emojiCategory = cat.key">{{ cat.icon }}</button>
            </div>
            <div class="emoji-grid">
              <template v-if="emojiCategory === 'recent'">
                <button v-for="e in emojiRecent" :key="'r-' + e" class="emoji-btn" @click="pickEmoji(e)">{{ e }}</button>
                <div v-if="!emojiRecent.length" class="emoji-empty">暂无最近使用，试着点几个下面的表情</div>
              </template>
              <template v-else>
                <button v-for="e in (EMOJI_CATEGORIES.find(c => c.key === emojiCategory)?.emojis || [])" :key="emojiCategory + '-' + e" class="emoji-btn" @click="pickEmoji(e)">{{ e }}</button>
              </template>
            </div>
          </div>
        </Transition>

        <!-- 能力工具栏 + 模型选择器（参考DeepSeek设计，在输入框下方） -->
        <div class="ability-bar">
          <div class="ab-left">
            <button v-for="(opt, key) in MODEL_OPTIONS" :key="key" class="ab-model" :class="{ active: currentModel === key }" @click="switchModel(key as ModelMode)" :title="opt.desc">
              <span class="ab-dot" :class="key"></span>{{ opt.label }}
            </button>
          </div>
          <div class="ab-divider"></div>
          <div class="ab-tools">
            <!-- v9: 工作流入口 -->
            <button class="ab-tool workflow-btn" :class="{ active: showWorkflow }" @click="showWorkflow = !showWorkflow" title="一键工作流（Ctrl+/）">
              <span>🚀</span><span>工作流</span>
            </button>
            <button v-for="t in ABILITY_TOOLS" :key="t.key" class="ab-tool" @click="activateAbility(t)">
              <span>{{ t.icon }}</span><span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- v9: 工作流面板 -->
        <Transition name="wf-pop">
          <div v-if="showWorkflow" class="workflow-panel">
            <div class="wf-head">
              <div class="wf-title">🚀 一键工作流 <span class="wf-hint">选中后自动填充模板，把 "{光标处}" 补齐即可发送</span></div>
              <button class="wf-close" aria-label="关闭" @click="showWorkflow = false">×</button>
            </div>
            <div class="wf-grid">
              <button v-for="w in WORKFLOW_PRESETS" :key="w.key" class="wf-card" @click="applyWorkflow(w)">
                <div class="wf-card-icon">{{ w.icon }}</div>
                <div class="wf-card-main">
                  <div class="wf-card-label">{{ w.label }}</div>
                  <div v-if="w.hint" class="wf-card-hint">{{ w.hint }}</div>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <!-- v9: 收藏夹面板 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showFavorites" class="fav-overlay" @click.self="showFavorites = false">
          <div class="fav-modal">
            <div class="fav-head">
              <h3>⭐ 收藏的消息（{{ favorites.length }}）</h3>
              <button class="fav-close" aria-label="关闭" @click="showFavorites = false">×</button>
            </div>
            <div v-if="!favorites.length" class="fav-empty">
              <div class="fav-empty-icon">✨</div>
              <p>还没有收藏。在 AI 回复下点 ⭐ 即可加入收藏夹。</p>
            </div>
            <div v-else class="fav-list">
              <div v-for="fav in favorites" :key="fav.id" class="fav-item">
                <div class="fav-meta">
                  <span class="fav-role" :class="fav.role">{{ fav.role === 'user' ? '🧑' : '⚡' }} {{ fav.role === 'user' ? '我' : '星火' }}</span>
                  <span class="fav-conv-title">{{ fav.conversationTitle }}</span>
                  <span class="fav-time">{{ new Date(fav.savedAt).toLocaleString('zh-CN') }}</span>
                </div>
                <div class="fav-content">{{ fav.content.length > 280 ? fav.content.slice(0, 280) + '…' : fav.content }}</div>
                <div class="fav-acts">
                  <button class="fav-act" @click="openFavorite(fav)">打开会话</button>
                  <button class="fav-act" @click="copyText(fav.content)">复制</button>
                  <button class="fav-act fav-act-danger" @click="toggleFavoriteMessage(fav.conversationId, fav.id); toast('已从收藏夹移除')">移除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSparkAI, MODEL_OPTIONS, ABILITY_TOOLS, WORKFLOW_PRESETS, isBinaryFile, formatFileSize } from '../../composables/useSparkAI'
import type { SparkAction, FileAttachment, ModelMode, Conversation } from '../../composables/useSparkAI'
import { useSchedule } from '../../composables/useSchedule'
import { usePlanner } from '../../composables/usePlanner'
import { resolveAssistantLocation } from '../../utils/assistantProtocol'
import { retrieveRelevantContext, formatContextForAI } from '../../utils/sparkKnowledge'
import { supabase as supabaseClient } from '../../supabase'
import { marked } from 'marked'
import hljs from 'highlight.js'
import katex from 'katex'
import DOMPurify from 'dompurify'
import { readCache, writeCache, makeCacheKey, fingerprintContext, replayCachedStream, getCacheStats } from '../../utils/sparkCache'
import { EMOJI_CATEGORIES, getRecentEmojis, pushRecentEmoji, expandShortcodes } from '../../utils/emojiPack'

const router = useRouter()
const {
  isStreaming, streamPhase, error: aiError, currentModel,
  currentBackend, localAvailable, localModelName,
  conversations, currentConversationId, favorites,
  createConversation, getCurrentConversation, switchConversation, deleteConversation,
  renameConversation, togglePinConversation, toggleArchiveConversation,
  duplicateConversation, searchConversations, exportConversation,
  toggleFavoriteMessage, isMessageFavorited, setMessageReaction, getMessageReaction, jumpToFavorite,
  setBackend, checkLocalHealth,
  sendMessage, stopGenerating,
} = useSparkAI()
const { createEvent } = useSchedule()
const { createGoal } = usePlanner()

const sidebarOpen = ref(false)
const inputText = ref('')
const iFocus = ref(false)
const scrollRef = ref<HTMLElement|null>(null)
const inputRef = ref<HTMLTextAreaElement|null>(null)
const fileInput = ref<HTMLInputElement|null>(null)
const streamingContent = ref('')
const thinkingText = ref('')

// v7.3: 思考阶段动态提示（让用户知道 AI 正在工作，不是卡死）
const thinkingHints = ['正在连接星火大脑…', '正在思考你的问题…', '正在梳理上下文…', '正在组织回复…', '马上就好…']
const thinkingSubHints = [
  '✨ Gemma 大模型推理中，复杂问题可能需要数秒',
  '🔮 正在从记忆和知识库中检索相关信息',
  '🧩 正在对多个候选答案进行权衡比较',
  '📝 正在润色语言，确保回复既准确又友好',
  '⚡ 即将开始输出，请稍等…',
]
const thinkingHint = ref(thinkingHints[0])
const thinkingSubHint = ref(thinkingSubHints[0])
let thinkingHintTimer: ReturnType<typeof setInterval> | null = null

function startThinkingHintRotation() {
  if (thinkingHintTimer) return
  let i = 0
  thinkingHint.value = thinkingHints[0]
  thinkingSubHint.value = thinkingSubHints[0]
  thinkingHintTimer = setInterval(() => {
    i = (i + 1) % thinkingHints.length
    thinkingHint.value = thinkingHints[i]
    thinkingSubHint.value = thinkingSubHints[i]
  }, 1800)
}
function stopThinkingHintRotation() {
  if (thinkingHintTimer) { clearInterval(thinkingHintTimer); thinkingHintTimer = null }
}
watch(() => isStreaming.value, (v) => {
  if (v) startThinkingHintRotation()
  else stopThinkingHintRotation()
})
const isRec = ref(false)
const isDragging = ref(false)
const showToast = ref(false)
const toastMsg = ref('')
const collapsedThinking = reactive<Record<number, boolean>>({})
const pendingFiles = ref<FileAttachment[]>([])
interface ACard { icon:string; label:string; desc:string; action:SparkAction; done:boolean }
const actionCards = ref<ACard[]>([])

// v9: 侧边栏搜索
const sbSearchQuery = ref('')
const sbSearchResults = computed(() => sbSearchQuery.value.trim() ? searchConversations(sbSearchQuery.value) : [])

// v9: 会话 ... 菜单
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) { openMenuId.value = openMenuId.value === id ? null : id }

// v9: 重命名态
const renamingId = ref<string | null>(null)
const renameText = ref('')
function startRename(c: Conversation) { renamingId.value = c.id; renameText.value = c.title; openMenuId.value = null; nextTick(() => { document.getElementById(`rn-input-${c.id}`)?.focus() }) }
function confirmRename() {
  if (!renamingId.value) return
  if (renameText.value.trim()) renameConversation(renamingId.value, renameText.value)
  renamingId.value = null
  renameText.value = ''
}
function cancelRename() { renamingId.value = null; renameText.value = '' }

// v9: 工作流面板
const showWorkflow = ref(false)

// v9: emoji 选择器
const showEmoji = ref(false)
const emojiCategory = ref('recent')
const emojiRecent = ref<string[]>(getRecentEmojis())
function pickEmoji(e: string) {
  const el = inputRef.value
  if (el) {
    const start = el.selectionStart ?? inputText.value.length
    const end = el.selectionEnd ?? inputText.value.length
    inputText.value = inputText.value.slice(0, start) + e + inputText.value.slice(end)
    nextTick(() => {
      const pos = start + e.length
      el.focus()
      el.setSelectionRange(pos, pos)
      autoResize()
    })
  } else {
    inputText.value += e
  }
  pushRecentEmoji(e)
  emojiRecent.value = getRecentEmojis()
}

// v9: 收藏夹面板
const showFavorites = ref(false)

// v9: 网络状态
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function handleOnline() { isOnline.value = true; toast('网络已恢复') }
function handleOffline() { isOnline.value = false; toast('已离线，发送功能已暂停') }

// v9: 响应缓存命中计数（UI 展示）
const cacheHitCount = ref(0)

// 模型切换
function switchModel(key: ModelMode) {
  if (currentModel.value === key) return
  currentModel.value = key; const opt = MODEL_OPTIONS[key]
  toastMsg.value = `已切换为 ${opt.icon} ${opt.label} 模式`; showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

// 能力工具栏点击
function activateAbility(t: (typeof ABILITY_TOOLS)[number]) {
  inputText.value = t.prompt
  nextTick(() => inputRef.value?.focus())
}

// 拖拽
let dragCount = 0
function onDragEnter(e: DragEvent) { e.preventDefault(); dragCount++; isDragging.value = true }
function onDragLeave() { dragCount--; if (dragCount <= 0) { isDragging.value = false; dragCount = 0 } }
function onDrop(e: DragEvent) { isDragging.value = false; dragCount = 0; if (e.dataTransfer?.files) processFiles(e.dataTransfer.files) }

// LaTeX 渲染（v7.3：包装一层 .formula-wrap 以支持一键复制 LaTeX 源）
function renderLatex(text: string): string {
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_: string, expr: string) => {
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })
      const enc = encodeURIComponent(expr.trim())
      return `<span class="formula-wrap formula-block" data-latex="${enc}"><button class="formula-copy" data-copy-text="${enc}" title="复制 LaTeX">⧉</button>${html}</span>`
    } catch { return `<span class="latex-err">$$${expr}$$</span>` }
  })
  text = text.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$/g, (_: string, expr: string) => {
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false })
      const enc = encodeURIComponent(expr.trim())
      return `<span class="formula-wrap formula-inline" data-latex="${enc}"><button class="formula-copy" data-copy-text="${enc}" title="复制 LaTeX">⧉</button>${html}</span>`
    } catch { return `<span class="latex-err">$${expr}$</span>` }
  })
  return text
}

// Markdown（含内联导航链接渲染）
const mdRenderer = new marked.Renderer()
mdRenderer.code = function({ text, lang }: { text:string; lang?:string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const hi = hljs.highlight(text, { language }).value
  const encoded = encodeURIComponent(text)
  return `<div class="codeblock"><div class="cb-head"><span class="cb-lang">${language}</span><button class="cb-copy" data-copy-text="${encoded}">复制</button></div><pre><code class="hljs language-${language}">${hi}</code></pre></div>`
}
// 导航链接渲染为可点击按钮
mdRenderer.link = function({ href, text }: { href: string; text: string }) {
  const safeLocation = resolveAssistantLocation(href)
  if (safeLocation) {
    const query = safeLocation.query ? `?${new URLSearchParams(safeLocation.query).toString()}` : ''
    return `<button class="nav-link" data-path="${safeLocation.path}${query}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${text}</button>`
  }
  return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`
}
marked.setOptions({ renderer: mdRenderer, breaks: true })

function renderMd(content: string): string {
  if (!content) return ''
  let c = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
  if (!c) return ''
  try {
    const codeBlocks: string[] = []
    c = c.replace(/```[\s\S]*?```/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    c = c.replace(/`[^`]+`/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    c = renderLatex(c)
    c = c.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)])
    const html = marked.parse(c) as string
    return DOMPurify.sanitize(html, { ADD_TAGS: ['button','span'], ADD_ATTR: ['class','style','data-path','data-copy-text','data-latex','title'] })
  } catch { return DOMPurify.sanitize(content.replace(/\n/g, '<br>')) }
}

// 点击导航链接
function handleMdClick(e: Event) {
  const element = e.target as HTMLElement
  const copyButton = element.closest('.cb-copy') as HTMLElement | null
  if (copyButton?.dataset?.copyText) {
    navigator.clipboard.writeText(decodeURIComponent(copyButton.dataset.copyText))
    copyButton.textContent = '✓ 已复制'
    setTimeout(() => { copyButton.textContent = '复制' }, 1500)
    return
  }

  // v7.3 公式 LaTeX 一键复制
  const formulaCopy = element.closest('.formula-copy') as HTMLElement | null
  if (formulaCopy?.dataset?.copyText) {
    e.preventDefault()
    navigator.clipboard.writeText(decodeURIComponent(formulaCopy.dataset.copyText))
    const origTitle = formulaCopy.title
    formulaCopy.textContent = '✓'
    formulaCopy.title = '已复制 LaTeX'
    setTimeout(() => { formulaCopy.textContent = '⧉'; formulaCopy.title = origTitle }, 1200)
    return
  }

  const target = element.closest('.nav-link') as HTMLElement | null
  if (!target?.dataset?.path) return

  const location = resolveAssistantLocation(target.dataset.path)
  if (!location) return

  router.push({ path: location.path, query: location.query })
  toast('正在跳转...')
}

function toast(msg: string) { toastMsg.value = msg; showToast.value = true; setTimeout(() => { showToast.value = false }, 1500) }

// 快捷启动
const starters = [
  { i:'📅', l:'日程管理', t:'帮我安排这周的学习计划，每天3-4个时间段' },
  { i:'🎯', l:'目标规划', t:'帮我拆解"30天学会Python"的学习计划并同步到规划' },
  { i:'📚', l:'学习辅导', t:'用通俗的语言解释马尔可夫链的核心原理' },
  { i:'💻', l:'编程助手', t:'用 Vue 3 + TypeScript 写一个完整的 Todo 应用' },
  { i:'🧭', l:'功能导航', t:'带我看看 Spark Alliance 都有哪些功能模块' },
  { i:'✍️', l:'写作助手', t:'帮我写一份实习申请自荐信' },
]

function getActionCardMeta(action: SparkAction): { icon: string; label: string; desc: string } {
  if (action.action === 'add_schedule') {
    return { icon: '📅', label: '同步日程', desc: action.data.title }
  }
  if (action.action === 'create_goal') {
    return { icon: '🎯', label: '创建规划', desc: action.data.title }
  }
  return { icon: '🔗', label: '跳转', desc: action.data.label || action.data.path }
}

void getActionCardMeta

const displayMsgs = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  const msgs = (conv?.messages.filter(m => m.role !== 'system') || []).map(m => ({
    ...m, displayContent: m.content.replace(/\n\n(📄|🖼️) \*\*.*?\*\*/g, '').replace(/```[\s\S]*?```/g, '').trim() || m.content,
  }))
  // v7.3: 在 streaming 阶段总是追加 assistant 占位气泡（即使 streamingContent 为空，也能显示"正在思考"）
  if (isStreaming.value) {
    return [...msgs, { role: 'assistant' as const, content: streamingContent.value, reasoning: thinkingText.value || undefined, attachments: undefined, displayContent: streamingContent.value }]
  }
  return msgs
})
const showArchived = ref(false)
const groupedConvs = computed(() => {
  const now = new Date(); const td = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yd = td - 86400000; const wk = td - 7 * 86400000
  const gs: { label:string; items:typeof conversations.value; kind?: string }[] = [
    { label:'⭐ 置顶', items:[], kind: 'pinned' },
    { label:'今天', items:[] },
    { label:'昨天', items:[] },
    { label:'近7天', items:[] },
    { label:'更早', items:[] },
    { label:'📦 已归档', items:[], kind: 'archived' },
  ]
  for (const c of conversations.value) {
    if (c.isArchived) { gs[5].items.push(c); continue }
    if (c.isPinned) { gs[0].items.push(c); continue }
    const t = new Date(c.updatedAt).getTime()
    if (t>=td) gs[1].items.push(c)
    else if(t>=yd) gs[2].items.push(c)
    else if(t>=wk) gs[3].items.push(c)
    else gs[4].items.push(c)
  }
  return gs.filter(g => {
    if (g.kind === 'archived') return g.items.length > 0 && showArchived.value
    return g.items.length > 0
  })
})

// 归档组里有内容但默认折叠时的计数（供顶部按钮显示）
const archivedCount = computed(() => conversations.value.filter((c) => c.isArchived).length)

// 上下文窗口使用率（基于 messages 数，粗略但足够 UI 提示）
const contextUsage = computed(() => {
  const conv = conversations.value.find((c) => c.id === currentConversationId.value)
  if (!conv) return { used: 0, limit: 60, ratio: 0 }
  const used = conv.messages.filter((m) => m.role !== 'system').length
  const limit = 60 // sendMessage 中 slice(-60)
  return { used, limit, ratio: Math.min(1, used / limit) }
})

async function handleSend() {
  // v9: 离线守护
  if (!isOnline.value) { toast('当前无网络连接，请稍后重试'); return }

  // v9: emoji 短码扩展
  const raw = inputText.value.trim()
  const text = expandShortcodes(raw)
  if ((!text && !pendingFiles.value.length) || isStreaming.value) return

  // v9: 文件大小硬限制（单文件 5MB，附件总数 5 个）
  const OVERSIZE = pendingFiles.value.find((f) => f.size && /([0-9.]+)\s*MB/.test(f.size) && parseFloat(f.size) > 5)
  if (OVERSIZE) { toast('文件不能超过 5 MB：' + OVERSIZE.name); return }
  if (pendingFiles.value.length > 5) { toast('单次最多附带 5 个文件'); return }

  const atts = [...pendingFiles.value]; inputText.value=''; streamingContent.value=''; thinkingText.value=''; actionCards.value=[]; pendingFiles.value=[]
  showEmoji.value = false
  if (inputRef.value) inputRef.value.style.height='auto'
  if (!currentConversationId.value) createConversation()
  await nextTick(); scrollBot()

  // v7.3: 发送前做一次"思域"RAG 检索（静态知识库 + 可选数据库全文索引）
  let extraContext = ''
  if (text && text.length >= 3) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      const chunks = await retrieveRelevantContext(text, { maxChunks: 4, includeDb: !!user, myUserId: user?.id })
      if (chunks.length) extraContext = formatContextForAI(chunks)
    } catch (err) {
      console.warn('[SparkKnowledge] 检索失败，继续无上下文回答:', err instanceof Error ? err.message : err)
    }
  }

  // v9: 响应缓存命中（仅对无附件、无 extraContext 的短提问生效）
  const canCache = !atts.length && !extraContext && text.length >= 4 && text.length <= 400
  if (canCache) {
    const conv = getCurrentConversation()
    const recent = conv.messages.slice(-5).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
    const fp = fingerprintContext(recent)
    const key = makeCacheKey(text, currentModel.value, fp)
    const hit = readCache(key)
    if (hit) {
      // 写入 user 消息（正常流程）
      conv.messages.push({
        id: 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
        role: 'user',
        content: text,
        attachments: atts.length ? atts : undefined,
      })
      conv.updatedAt = new Date().toISOString()

      cacheHitCount.value++
      // 用 replayCachedStream 让体感与流式一致
      await replayCachedStream(hit, (chunk) => { streamingContent.value = chunk; scrollBot() }, {
        onThinking: (t) => { thinkingText.value = t },
      })
      // 写入 assistant 消息并打 fromCache 标记
      conv.messages.push({
        id: 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
        role: 'assistant',
        content: hit.content,
        reasoning: hit.reasoning,
        fromCache: true,
      })
      conv.updatedAt = new Date().toISOString()
      streamingContent.value = ''
      toast(`✨ 命中缓存（已节省 ${cacheHitCount.value} 次 API 调用）`)
      return
    }
  }

  // 记录本次请求用于命中后写缓存
  let rawAnswerForCache = ''
  let rawReasoningForCache = ''
  await sendMessage(text,
    (t) => { streamingContent.value=t; scrollBot() },
    (ct, acts, reasoning) => {
      streamingContent.value=''
      rawAnswerForCache = ct
      rawReasoningForCache = reasoning
      if (acts.length) actionCards.value = acts.map(a => ({ icon: a.action==='add_schedule'?'📅':a.action==='create_goal'?'🎯':'🔗', label: a.action==='add_schedule'?'同步日程':a.action==='create_goal'?'创建规划':'跳转', desc: String(a.data.title||a.data.label||a.data.path||''), action:a, done:false }))
      scrollBot()
      // v9: 成功完成后写入响应缓存
      if (canCache && rawAnswerForCache) {
        const conv = getCurrentConversation()
        const recent = conv.messages.slice(-7).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
        const fp = fingerprintContext(recent.slice(0, -1)) // 写缓存时不包含最后这条 assistant
        writeCache({ prompt: text, mode: currentModel.value, content: rawAnswerForCache, reasoning: rawReasoningForCache, contextFingerprint: fp })
      }
    },
    () => { streamingContent.value='' },
    (t) => { thinkingText.value=t; scrollBot() },
    atts.length ? atts : undefined,
    extraContext || undefined,
  )
}

async function execAction(a: SparkAction) {
  try {
    if (a.action === 'add_schedule') {
      const ok = await createEvent({
        title: a.data.title,
        description: a.data.description || '',
        location: '',
        start_time: a.data.start_time,
        end_time: a.data.end_time || '',
        all_day: false,
        event_type: a.data.event_type || 'task',
        event_subtype: '',
        color: '',
        recurrence_type: 'none',
        recurrence_days: [],
        recurrence_end: '',
        reminders: [],
        priority: a.data.priority || 1,
      })

      if (!ok) throw new Error('日程创建失败')
      toast('✓ 日程已同步')
    } else if (a.action === 'create_goal') {
      const goal = await createGoal(
        a.data.title,
        a.data.goal_type,
        a.data.deadline,
        a.data.description,
      )

      if (!goal) throw new Error('目标创建失败')

      router.push({
        path: '/app/schedule',
        query: {
          module: 'planner',
          tab: 'goals',
          goalId: goal.id,
        },
      })
      toast('✓ 目标已创建')
    } else if (a.action === 'navigate') {
      const location = resolveAssistantLocation({
        path: a.data.path,
        query: a.data.query,
      })

      if (!location) throw new Error('无效跳转目标')
      router.push({ path: location.path, query: location.query })
      toast('正在跳转...')
    }

    const card = actionCards.value.find(c => c.action === a)
    if (card) card.done = true
  } catch (e) {
    console.error(e)
    toast(e instanceof Error ? e.message : '执行失败')
  }
}

function copyText(t: string) { navigator.clipboard.writeText(t); toast('已复制到剪贴板') }

/** 从 displayMsgs 的索引映射回 conversation.messages 的真实索引（displayMsgs 过滤了 system） */
function mapDisplayIdxToReal(displayIdx: number): number {
  const msgs = getCurrentConversation().messages
  let cursor = -1
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role !== 'system') {
      cursor++
      if (cursor === displayIdx) return i
    }
  }
  return -1
}

/** 重新回答：点某条 assistant 消息 → 删除其对应 user 到末尾的所有消息 → 用 user 内容重新发送 */
function retryFrom(displayIdx: number) {
  if (isStreaming.value) return
  const conv = getCurrentConversation()
  const realIdx = mapDisplayIdxToReal(displayIdx)
  if (realIdx < 0 || conv.messages[realIdx]?.role !== 'assistant') return
  let userIdx = -1
  for (let i = realIdx - 1; i >= 0; i--) {
    if (conv.messages[i].role === 'user') { userIdx = i; break }
  }
  if (userIdx < 0) return
  const lastUser = conv.messages[userIdx]
  conv.messages.splice(userIdx)
  inputText.value = lastUser.content
  handleSend()
}

/** 编辑用户消息：删除该消息及之后所有消息，把 user.content 放回输入框等待用户修改后发送 */
function editMessage(displayIdx: number) {
  if (isStreaming.value) return
  const conv = getCurrentConversation()
  const realIdx = mapDisplayIdxToReal(displayIdx)
  if (realIdx < 0 || conv.messages[realIdx]?.role !== 'user') return
  const target = conv.messages[realIdx]
  conv.messages.splice(realIdx)
  inputText.value = target.content
  nextTick(() => { inputRef.value?.focus(); autoResize() })
  toast('可编辑后按 Enter 重发')
}
function retryLast() {
  const conv = getCurrentConversation(); const lu = [...conv.messages].reverse().find((m:{role:string}) => m.role==='user')
  if (lu) { if(conv.messages[conv.messages.length-1]?.role==='assistant') conv.messages.pop(); inputText.value=lu.content; conv.messages.pop(); handleSend() }
}

function processFiles(files: FileList) {
  for (const f of Array.from(files)) {
    const size = formatFileSize(f.size)
    if (f.type.startsWith('image/')) pendingFiles.value.push({ type:'image', name:f.name, url:URL.createObjectURL(f), size })
    else if (isBinaryFile(f.name)) pendingFiles.value.push({ type:'file', name:f.name, size, isBinary:true })
    else { const reader = new FileReader(); reader.onload = () => { const c=(reader.result as string).slice(0,10000); pendingFiles.value.push({ type:'file', name:f.name, size, content:c+(c.length>=10000?'\n...(已截断)':'') }) }; reader.readAsText(f) }
  }
}
function onFileInput(e:Event) { const f=(e.target as HTMLInputElement).files; if(f) processFiles(f); if(fileInput.value) fileInput.value.value='' }
function onPaste(e:ClipboardEvent) {
  const items=e.clipboardData?.items; if(!items) return
  for (const item of Array.from(items)) { if(item.type.startsWith('image/')){e.preventDefault(); const file=item.getAsFile(); if(file) pendingFiles.value.push({ type:'image', name:`粘贴图片_${Date.now()}.png`, url:URL.createObjectURL(file), size:formatFileSize(file.size) })} }
}

const waveCanvas = ref<HTMLCanvasElement|null>(null)
const waveWrapRef = ref<HTMLElement|null>(null)
const recDuration = ref('0.0')
let recognition: any = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let mediaStream: MediaStream | null = null
let waveAnimId = 0
let recStartTime = 0
let recTimer: ReturnType<typeof setInterval> | null = null

function drawWaveform() {
  if (!analyser) return
  if (!waveCanvas.value) { waveAnimId = requestAnimationFrame(drawWaveform); return }
  const canvas = waveCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (waveWrapRef.value) {
    const wrapW = waveWrapRef.value.clientWidth - 60
    if (Math.abs(canvas.width - wrapW) > 2 && wrapW > 0) canvas.width = wrapW
  }

  const bufLen = analyser.frequencyBinCount
  const timeData = new Uint8Array(bufLen)
  analyser.getByteTimeDomainData(timeData)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let sumSq = 0
  for (let i = 0; i < bufLen; i++) {
    const v = (timeData[i] - 128) / 128
    sumSq += v * v
  }
  const rms = Math.sqrt(sumSq / bufLen)
  const isSpeaking = rms > 0.02

  const barCount = Math.floor(canvas.width / 5)
  const totalBarWidth = barCount * 3 + (barCount - 1) * 2
  const offsetX = (canvas.width - totalBarWidth) / 2
  const midY = canvas.height / 2

  for (let i = 0; i < barCount; i++) {
    const dataIdx = Math.floor(i * bufLen / barCount)
    const rawVal = Math.abs(timeData[dataIdx] - 128) / 128

    let barVal: number
    if (isSpeaking) {
      barVal = Math.max(0.08, rawVal * 1.5)
    } else {
      barVal = 0.04 + Math.sin(Date.now() / 300 + i * 0.3) * 0.03
    }

    const h = Math.max(2, barVal * canvas.height * 0.85)
    const x = offsetX + i * 5
    const alpha = isSpeaking ? 0.5 + barVal * 0.4 : 0.25
    ctx.fillStyle = `rgba(139,92,246,${alpha})`
    ctx.beginPath()
    ctx.roundRect(x, midY - h / 2, 3, h, 1.5)
    ctx.fill()
  }

  waveAnimId = requestAnimationFrame(drawWaveform)
}

let noiseFilter: BiquadFilterNode | null = null

async function toggleVoice() {
  if (isRec.value) { finishVoice(); return }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { toast('请使用 Chrome 或 Edge 浏览器以使用语音功能'); return }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      }
    })
  } catch {
    toast('无法获取麦克风权限，请在浏览器设置中允许'); return
  }

  audioCtx = new AudioContext()
  const source = audioCtx.createMediaStreamSource(mediaStream)

  // 高通滤波器去除低频噪音（100Hz以下）
  noiseFilter = audioCtx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 100
  noiseFilter.Q.value = 0.7

  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.75
  analyser.minDecibels = -70
  analyser.maxDecibels = -10

  source.connect(noiseFilter)
  noiseFilter.connect(analyser)

  recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 5

  let finalizedText = ''
  recognition.onresult = (e: any) => {
    let newFinal = ''
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      const result = e.results[i]
      if (result.isFinal) {
        newFinal += result[0].transcript
      } else {
        interim += result[0].transcript
      }
    }
    if (newFinal) finalizedText = newFinal
    inputText.value = (finalizedText + interim).trim()
  }

  recognition.onerror = (ev: any) => {
    const fatal = new Set(['audio-capture', 'not-allowed', 'service-not-allowed'])
    if (fatal.has(ev.error)) {
      toast(ev.error === 'audio-capture' ? '麦克风不可用，请检查设备连接' : '麦克风权限被拒绝，请在浏览器地址栏左侧允许')
      cleanupVoice()
    } else if (ev.error === 'network') {
      toast('语音识别需要网络连接，Chrome 会将音频发送到 Google 服务器处理')
      cleanupVoice()
    }
  }

  recognition.onend = () => {
    if (isRec.value) {
      try { recognition.start() } catch { cleanupVoice() }
    }
  }

  try { recognition.start() } catch {
    toast('语音识别启动失败，请确保使用 Chrome/Edge 并允许麦克风')
    cleanupVoice()
    return
  }

  isRec.value = true
  finalizedText = ''
  recStartTime = Date.now()
  recDuration.value = '0.0'
  recTimer = setInterval(() => {
    recDuration.value = ((Date.now() - recStartTime) / 1000).toFixed(1)
  }, 100)

  nextTick(() => { drawWaveform() })
}

function finishVoice() {
  if (!recognition) { cleanupVoice(); return }
  let handled = false
  const onFinalEnd = () => {
    if (handled) return
    handled = true
    cleanupVoice()
    if (inputText.value.trim()) handleSend()
  }
  recognition.onend = onFinalEnd
  recognition.stop()
  setTimeout(onFinalEnd, 500)
}

function cancelVoice() {
  recognition?.stop()
  cleanupVoice()
  inputText.value = ''
}

function cleanupVoice() {
  isRec.value = false
  cancelAnimationFrame(waveAnimId)
  if (recTimer) { clearInterval(recTimer); recTimer = null }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
  if (noiseFilter) { noiseFilter.disconnect(); noiseFilter = null }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null }
  analyser = null
}

function handleQuick(t: string) { inputText.value=t; handleSend() }
function handleNewChat() {
  if (isStreaming.value) stopGenerating()
  createConversation()
  sidebarOpen.value = false
  streamingContent.value = ''
  thinkingText.value = ''
  actionCards.value = []
  nextTick(() => { inputRef.value?.focus() })
}
function handleSwitch(id: string) {
  // v9: 正在生成时先终止，避免流式内容错乱到新会话
  if (isStreaming.value) stopGenerating()
  switchConversation(id)
  streamingContent.value = ''
  thinkingText.value = ''
  actionCards.value = []
  sidebarOpen.value = false
  openMenuId.value = null
  nextTick(scrollBot)
}
function handleDelete(id: string) {
  if (!confirm('确定删除这条会话？不可恢复')) return
  deleteConversation(id)
  openMenuId.value = null
}
function onKey(e: KeyboardEvent) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }
function autoResize() { const el=inputRef.value; if(!el) return; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,180)+'px' }
function scrollBot() { nextTick(()=>{ if(scrollRef.value) scrollRef.value.scrollTop=scrollRef.value.scrollHeight }) }

// v9: 全局键盘快捷键 + 点击外部关闭菜单
function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showEmoji.value) { showEmoji.value = false; return }
    if (showWorkflow.value) { showWorkflow.value = false; return }
    if (showFavorites.value) { showFavorites.value = false; return }
    if (openMenuId.value) { openMenuId.value = null; return }
    if (renamingId.value) { cancelRename(); return }
    if (sidebarOpen.value) { sidebarOpen.value = false; return }
  }
  const mod = e.ctrlKey || e.metaKey
  if (mod && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    sidebarOpen.value = true
    nextTick(() => { document.getElementById('sb-search-input')?.focus() })
    return
  }
  if (mod && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault()
    handleNewChat()
    return
  }
  if (mod && (e.key === '/' || e.key === '?')) {
    e.preventDefault()
    showWorkflow.value = !showWorkflow.value
  }
}
function onGlobalClick(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (openMenuId.value && !el.closest('.sb-menu') && !el.closest('.sb-more')) openMenuId.value = null
  if (showEmoji.value && !el.closest('.emoji-panel') && !el.closest('.itool-emoji')) showEmoji.value = false
  if (showWorkflow.value && !el.closest('.workflow-panel') && !el.closest('.workflow-btn')) showWorkflow.value = false
}

onMounted(() => {
  if(conversations.value.length&&!currentConversationId.value) currentConversationId.value=conversations.value[0].id
  nextTick(scrollBot)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('keydown', onGlobalKeyDown)
  document.addEventListener('click', onGlobalClick)
  // 读取缓存统计用于 UI 展示
  const stats = getCacheStats()
  if (stats.hits > 0) console.log(`[SparkCache] 历史累计命中 ${stats.hits} 次，缓存大小 ${stats.size}`)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('keydown', onGlobalKeyDown)
  document.removeEventListener('click', onGlobalClick)
})
watch(currentConversationId, () => nextTick(scrollBot))

// v9: 导出会话 → 触发浏览器下载
function triggerExport(id: string, format: 'markdown' | 'json') {
  const out = exportConversation(id, format)
  if (!out) { toast('导出失败'); return }
  const blob = new Blob([out.content], { type: out.mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = out.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast(`✓ 已导出 ${format.toUpperCase()}`)
  openMenuId.value = null
}

// v9: 收藏消息切换
function handleToggleFavorite(displayIdx: number) {
  const conv = getCurrentConversation()
  const realIdx = mapDisplayIdxToReal(displayIdx)
  if (realIdx < 0) return
  const msg = conv.messages[realIdx]
  if (!msg?.id) return
  const favored = toggleFavoriteMessage(conv.id, msg.id)
  toast(favored ? '⭐ 已加入收藏夹' : '已从收藏夹移除')
}

// v9: 消息反应（like/dislike 切换）
function handleReact(displayIdx: number, r: 'like' | 'dislike') {
  const conv = getCurrentConversation()
  const realIdx = mapDisplayIdxToReal(displayIdx)
  if (realIdx < 0) return
  const msg = conv.messages[realIdx]
  if (!msg?.id) return
  const current = getMessageReaction(msg.id)
  setMessageReaction(msg.id, current === r ? null : r)
}

// v9: 工作流点击 → 填充 prompt + 光标定位到 \n\n 位置（用户补充空白）
function applyWorkflow(preset: (typeof WORKFLOW_PRESETS)[number]) {
  const tpl = preset.prompt
  inputText.value = tpl
  showWorkflow.value = false
  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    el.focus()
    autoResize()
    // 光标放到第一个 \n\n 之后（即用户补充空白位置）
    const insertPos = tpl.indexOf('\n\n')
    const pos = insertPos >= 0 ? insertPos + 2 : tpl.length
    el.setSelectionRange(pos, pos)
    el.scrollTop = el.scrollHeight
  })
}

// v9: 对话区移动端点击自动关闭侧边栏
function handleMsgAreaClick() {
  if (sidebarOpen.value && window.innerWidth <= 768) sidebarOpen.value = false
}

// v9: 跳转到收藏的会话
function openFavorite(fav: (typeof favorites.value)[number]) {
  if (jumpToFavorite(fav)) {
    showFavorites.value = false
    toast('已跳转到所在会话')
  } else {
    toast('原会话已删除')
  }
}

// v9: 后端切换（本地不可用时强制重检一次）
async function handleBackendChange(b: 'cloud' | 'local' | 'auto') {
  if (b === 'local' && localAvailable.value !== true) {
    toast('正在检测本地 AI 服务...')
    const ok = await checkLocalHealth(true)
    if (!ok) {
      toast('❌ 本地 AI 未启动：请在 services/local-ai 运行 npm run dev 并启动 Ollama')
      return
    }
  }
  setBackend(b)
  const labels: Record<string, string> = { auto: '自动（云端优先 + 本地降级）', cloud: '☁️ 仅云端', local: `🏠 本地 Gamma4${localModelName.value ? ` · ${localModelName.value}` : ''}` }
  toast(`已切换后端：${labels[b]}`)
}
</script>

<style scoped>
.chat-layout { display:flex; height:calc(100vh - 72px); background:rgba(10,8,20,0.78); position:relative; overflow:hidden; }
.chat-layout > .cosmic-bg { position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; }
.fade-enter-active,.fade-leave-active { transition:opacity .2s; } .fade-enter-from,.fade-leave-to { opacity:0; }
.toast { position:fixed; top:80px; left:50%; transform:translateX(-50%); padding:8px 20px; border-radius:10px; background:rgba(139,92,246,.12); backdrop-filter:blur(12px); border:1px solid rgba(139,92,246,.15); color:rgba(139,92,246,.9); font-size:12px; font-weight:600; z-index:200; white-space:nowrap; }
.toast-enter-active { transition:all .3s; } .toast-leave-active { transition:all .2s; } .toast-enter-from { opacity:0; transform:translateX(-50%) translateY(-10px); } .toast-leave-to { opacity:0; transform:translateX(-50%) translateY(-6px); }
.drop-overlay { position:absolute; inset:0; z-index:100; background:rgba(139,92,246,.06); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; }
.drop-box { text-align:center; padding:40px 60px; border:2px dashed rgba(139,92,246,.25); border-radius:20px; } .drop-icon { font-size:36px; margin-bottom:8px; } .drop-text { font-size:15px; font-weight:700; color:rgba(139,92,246,.7); } .drop-hint { font-size:11px; color:rgba(255,255,255,.2); margin-top:4px; }

.chat-sidebar { width:250px; background:rgba(8,6,18,.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border-right:1px solid rgba(255,255,255,.03); display:flex; flex-direction:column; flex-shrink:0; position:relative; z-index:1; }
.sb-top { padding:10px; } .new-btn { width:100%; height:36px; background:rgba(139,92,246,.04); border:1px solid rgba(139,92,246,.06); border-radius:8px; color:rgba(139,92,246,.5); font-weight:600; font-size:12px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer; } .new-btn:hover { background:rgba(139,92,246,.08); }
.sb-list { flex:1; overflow-y:auto; padding:0 4px 8px; } .sb-list::-webkit-scrollbar { width:2px; } .sb-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.03); }
.sb-group { margin-bottom:4px; } .sb-label { font-size:9px; color:rgba(255,255,255,.1); padding:5px 8px 1px; font-weight:700; letter-spacing:1px; }
.sb-item { display:flex; align-items:center; padding:6px 8px; border-radius:6px; color:rgba(255,255,255,.25); font-size:12px; cursor:pointer; transition:all .15s; } .sb-item:hover { background:rgba(255,255,255,.02); color:rgba(255,255,255,.4); } .sb-item.active { background:rgba(139,92,246,.05); color:rgba(139,92,246,.6); }
.sb-text { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .sb-del { opacity:0; background:none; border:none; color:rgba(255,255,255,.1); font-size:14px; cursor:pointer; } .sb-item:hover .sb-del { opacity:1; }
.sb-empty { text-align:center; padding:30px 0; color:rgba(255,255,255,.06); font-size:11px; }

.chat-main { flex:1; display:flex; flex-direction:column; min-width:0; position:relative; z-index:1; }
.top-bar { height:42px; border-bottom:1px solid rgba(255,255,255,.03); display:flex; align-items:center; padding:0 16px; flex-shrink:0; }
.menu-btn { display:none; background:none; border:none; font-size:18px; color:white; cursor:pointer; }
.top-brand { display:flex; align-items:center; gap:5px; } .top-icon { font-size:15px; } .top-icon.pulse { animation:iconPulse 3s ease-in-out infinite; } @keyframes iconPulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4) drop-shadow(0 0 4px rgba(139,92,246,.3))} } .top-title { font-size:13px; font-weight:700; color:white; }
.top-right { margin-left:auto; display:flex; align-items:center; }
.sync-badge { display:flex; align-items:center; gap:3px; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,.03); color:rgba(139,92,246,.3); font-size:10px; font-weight:500; }

.msgs { flex:1; overflow-y:auto; padding:20px 14%; display:flex; flex-direction:column; gap:18px; }
.msgs::-webkit-scrollbar { width:3px; } .msgs::-webkit-scrollbar-thumb { background:rgba(255,255,255,.03); }
@media(max-width:1200px) { .msgs { padding:16px 4%; } }
@media(max-width:768px) { .msgs { padding:12px; } .chat-sidebar { position:absolute; left:0; z-index:10; height:100%; transform:translateX(-100%); transition:transform .3s; } .chat-sidebar.open { transform:translateX(0); box-shadow:8px 0 24px rgba(0,0,0,.5); } .menu-btn { display:block; } }

.empty { margin:auto 0; text-align:center; } .empty-icon { font-size:32px; margin-bottom:8px; }
.empty h2 { color:white; font-size:17px; margin:0 0 4px; font-weight:700; } .empty p { color:rgba(255,255,255,.18); font-size:12px; margin:0 0 20px; max-width:380px; margin-left:auto; margin-right:auto; }
.quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; max-width:560px; margin:0 auto; }
.qcard { display:flex; flex-direction:column; gap:2px; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.03); background:rgba(255,255,255,.01); text-align:left; cursor:pointer; transition:all .2s; } .qcard:hover { background:rgba(139,92,246,.025); border-color:rgba(139,92,246,.05); }
.qi { font-size:15px; } .qt { font-size:11px; font-weight:600; color:rgba(255,255,255,.45); } .qd { font-size:10px; color:rgba(255,255,255,.13); }
@media(max-width:640px) { .quick-grid { grid-template-columns:repeat(2,1fr); } }

.msg-row { display:flex; gap:8px; max-width:100%; } .msg-row.user { justify-content:flex-end; }
.av { width:26px; height:26px; border-radius:7px; flex-shrink:0; background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(59,130,246,.04)); display:flex; align-items:center; justify-content:center; font-size:11px; margin-top:2px; }
.msg-content { max-width:82%; min-width:0; position:relative; }
.user-bubble { background:rgba(139,92,246,.035); padding:8px 12px; border-radius:12px 12px 3px 12px; border:1px solid rgba(139,92,246,.04); }
.u-text { color:rgba(255,255,255,.75); font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
.file-cards { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
.file-card { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; background:rgba(139,92,246,.025); border:1px solid rgba(139,92,246,.04); }
.fc-icon { font-size:16px; } .fc-name { font-size:11px; color:rgba(255,255,255,.45); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .fc-size { font-size:9px; color:rgba(255,255,255,.12); }

.msg-acts { display:flex; gap:3px; margin-top:6px; } .user-acts { justify-content:flex-end; }
.msg-acts button { width:28px; height:28px; border-radius:6px; border:none; background:rgba(255,255,255,.015); color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.msg-acts button:hover { background:rgba(139,92,246,.06); color:rgba(139,92,246,.6); }

.think-block { margin-bottom:8px; border-radius:10px; background:rgba(139,92,246,.012); border:1px solid rgba(139,92,246,.035); overflow:hidden; }
.think-toggle { display:flex; align-items:center; gap:5px; width:100%; padding:7px 10px; border:none; background:none; color:rgba(139,92,246,.35); font-size:11px; cursor:pointer; font-weight:500; text-align:left; } .think-toggle:hover { color:rgba(139,92,246,.5); }
.think-status { font-size:12px; } .think-status.spinning { animation:spin 1.5s linear infinite; }
@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
.think-chevron { margin-left:auto; transition:transform .2s; color:rgba(255,255,255,.1); } .think-chevron.collapsed { transform:rotate(-90deg); }
.think-body { padding:6px 10px 10px; font-size:12px; line-height:1.7; color:rgba(255,255,255,.18); white-space:pre-wrap; word-break:break-word; border-top:1px solid rgba(139,92,246,.025); }
.think-dots { display:flex; gap:3px; padding:6px 10px; } .think-dots span { width:5px; height:5px; border-radius:50%; background:rgba(139,92,246,.35); animation:tdot 1.4s infinite ease-in-out; } .think-dots span:nth-child(2){animation-delay:.2s} .think-dots span:nth-child(3){animation-delay:.4s}
@keyframes tdot { 0%,80%,100%{transform:scale(.5);opacity:.2} 40%{transform:scale(1);opacity:.8} }

/* v7.3: 加载态强化 - 让思考中 UI 更醒目，配浅色 sub-hint */
.think-block.think-block-loading { background:linear-gradient(135deg, rgba(139,92,246,.05), rgba(59,130,246,.03)); border:1px solid rgba(139,92,246,.12); box-shadow:0 0 0 0 rgba(139,92,246,.3); animation:thinkingPulse 2s ease-in-out infinite; }
@keyframes thinkingPulse { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.15)} 50%{box-shadow:0 0 0 6px rgba(139,92,246,0)} }
.think-block.think-block-loading .think-toggle { color:rgba(196,181,253,.85); font-size:12px; font-weight:600; }
.think-sub-hint { padding:0 10px 10px; font-size:10.5px; color:rgba(255,255,255,.25); font-style:italic; animation:hintFade .5s ease-out; letter-spacing:.3px; }
@keyframes hintFade { from{opacity:0;transform:translateY(-2px)} to{opacity:1;transform:translateY(0)} }

/* Markdown */
.md-body { color:rgba(255,255,255,.78); font-size:13px; line-height:1.8; word-break:break-word; }
.md-body :deep(h1) { font-size:17px; font-weight:700; margin:12px 0 6px; color:white; }
.md-body :deep(h2) { font-size:15px; font-weight:700; margin:10px 0 5px; color:white; }
.md-body :deep(h3) { font-size:13px; font-weight:600; margin:8px 0 4px; color:rgba(255,255,255,.9); }
.md-body :deep(p) { margin:0 0 8px; } .md-body :deep(p:last-child) { margin-bottom:0; }
.md-body :deep(ul),.md-body :deep(ol) { margin:4px 0 8px; padding-left:18px; } .md-body :deep(li) { margin-bottom:3px; }
.md-body :deep(strong) { color:white; font-weight:600; }
.md-body :deep(a) { color:rgba(139,92,246,.6); text-decoration:none; }
.md-body :deep(blockquote) { margin:6px 0; padding:6px 12px; border-left:3px solid rgba(139,92,246,.1); background:rgba(139,92,246,.012); border-radius:0 6px 6px 0; color:rgba(255,255,255,.35); }
.md-body :deep(table) { width:100%; border-collapse:collapse; margin:6px 0; font-size:11px; }
.md-body :deep(th) { background:rgba(255,255,255,.02); padding:5px 8px; border:1px solid rgba(255,255,255,.03); text-align:left; font-weight:600; }
.md-body :deep(td) { padding:5px 8px; border:1px solid rgba(255,255,255,.02); }
.md-body :deep(code:not(.hljs)) { padding:1px 5px; border-radius:4px; background:rgba(139,92,246,.05); color:rgba(139,92,246,.65); font-size:11px; font-family:'JetBrains Mono','Fira Code',monospace; }
.md-body :deep(.katex-display) { margin:12px 0; padding:10px 16px; background:rgba(255,255,255,.012); border-radius:8px; border:1px solid rgba(255,255,255,.025); overflow-x:auto; }
.md-body :deep(.katex) { font-size:1.05em; color:rgba(255,255,255,.85); }
/* v7.3 代码块：星空背景 + 醒目复制按钮 + 语言标签 */
.md-body :deep(.codeblock) {
  margin:10px 0;
  border-radius:12px;
  overflow:hidden;
  border:1px solid rgba(139,92,246,.15);
  background:
    radial-gradient(ellipse at top right, rgba(139,92,246,.08), transparent 60%),
    radial-gradient(ellipse at bottom left, rgba(59,130,246,.05), transparent 55%),
    linear-gradient(180deg, rgba(8,6,20,.96) 0%, rgba(12,10,24,.98) 100%);
  box-shadow: 0 4px 20px rgba(0,0,0,.35), inset 0 0 20px rgba(139,92,246,.04);
  position:relative;
}
/* 代码块星光装饰 */
.md-body :deep(.codeblock)::before {
  content:'';
  position:absolute; inset:0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.35), transparent),
    radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,.25), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(139,92,246,.3), transparent),
    radial-gradient(1px 1px at 90% 20%, rgba(255,255,255,.2), transparent);
  background-size: 100% 100%;
  pointer-events:none;
  opacity:.7;
}
.md-body :deep(.cb-head) {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:8px 14px;
  background:linear-gradient(90deg, rgba(139,92,246,.08), rgba(139,92,246,.02));
  border-bottom:1px solid rgba(139,92,246,.12);
  position:relative;
  z-index:1;
}
.md-body :deep(.cb-lang) {
  font-size:11px;
  color:rgba(196,181,253,.7);
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.md-body :deep(.cb-lang)::before {
  content:'';
  width:6px; height:6px; border-radius:50%;
  background:linear-gradient(135deg, #8b5cf6, #3b82f6);
  box-shadow:0 0 6px rgba(139,92,246,.5);
}
.md-body :deep(.cb-copy) {
  background:rgba(139,92,246,.12);
  border:1px solid rgba(139,92,246,.25);
  border-radius:6px;
  padding:4px 12px;
  font-size:11px;
  color:rgba(196,181,253,.9);
  cursor:pointer;
  font-weight:600;
  transition:all .18s ease;
}
.md-body :deep(.cb-copy:hover) {
  background:rgba(139,92,246,.22);
  color:#fff;
  border-color:rgba(139,92,246,.45);
  transform:translateY(-1px);
  box-shadow:0 3px 10px rgba(139,92,246,.25);
}
.md-body :deep(pre) { margin:0; padding:16px; overflow-x:auto; position:relative; z-index:1; }
.md-body :deep(pre code) { font-size:12.5px; line-height:1.7; font-family:'JetBrains Mono','Fira Code','SF Mono',monospace; }
.md-body :deep(pre::-webkit-scrollbar) { height:6px; } .md-body :deep(pre::-webkit-scrollbar-thumb) { background:rgba(139,92,246,.25); border-radius:4px; }
.md-body :deep(pre::-webkit-scrollbar-thumb:hover) { background:rgba(139,92,246,.45); }

/* v7.3 公式包装 + LaTeX 复制按钮 */
.md-body :deep(.formula-wrap) {
  position:relative;
  display:inline-block;
  transition:background .2s;
}
.md-body :deep(.formula-wrap.formula-block) { display:block; margin:10px 0; padding:8px 12px; border-radius:8px; }
.md-body :deep(.formula-wrap:hover) { background:rgba(139,92,246,.04); }
.md-body :deep(.formula-wrap:hover .formula-copy) { opacity:.9; }
.md-body :deep(.formula-copy) {
  position:absolute;
  top:2px; right:2px;
  width:22px; height:22px;
  padding:0;
  border-radius:5px;
  background:rgba(139,92,246,.15);
  border:1px solid rgba(139,92,246,.25);
  color:rgba(196,181,253,.9);
  font-size:12px;
  cursor:pointer;
  opacity:0;
  transition:all .2s;
  line-height:1;
}
.md-body :deep(.formula-copy:hover) {
  background:rgba(139,92,246,.3);
  transform:scale(1.1);
}

/* 导航链接按钮（AI回复中的可点击跳转） */
.md-body :deep(.nav-link) { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:6px; border:1px solid rgba(139,92,246,.12); background:rgba(139,92,246,.04); color:rgba(139,92,246,.7); font-size:11px; font-weight:600; cursor:pointer; transition:all .2s; margin:2px 0; }
.md-body :deep(.nav-link:hover) { background:rgba(139,92,246,.08); color:rgba(139,92,246,.9); box-shadow:0 2px 8px rgba(139,92,246,.08); }

.cursor { display:inline-block; width:2px; height:13px; background:rgba(139,92,246,.45); margin-left:1px; animation:blink .8s step-end infinite; vertical-align:text-bottom; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.act-panel { margin-top:6px; } .act-title { font-size:10px; font-weight:700; color:rgba(139,92,246,.3); margin-bottom:4px; }
.act-card { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:rgba(139,92,246,.015); border:1px solid rgba(139,92,246,.04); margin-bottom:4px; }
.act-icon { font-size:18px; } .act-info { flex:1; } .act-label { font-size:11px; font-weight:600; color:rgba(255,255,255,.55); } .act-desc { font-size:9px; color:rgba(255,255,255,.18); }
.act-btn { padding:4px 12px; border-radius:6px; border:none; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; font-size:10px; font-weight:600; cursor:pointer; } .act-btn:disabled { opacity:.35; background:rgba(255,255,255,.04); cursor:default; }
.act-skip { padding:3px 6px; border-radius:5px; border:none; background:none; color:rgba(255,255,255,.12); font-size:10px; cursor:pointer; }

.err-bar { display:flex; align-items:center; justify-content:center; gap:8px; padding:6px 12px; border-radius:8px; background:rgba(239,68,68,.02); border:1px solid rgba(239,68,68,.04); color:rgba(239,68,68,.4); font-size:11px; }
.err-bar button { padding:2px 8px; border-radius:4px; border:1px solid rgba(239,68,68,.06); background:none; color:rgba(239,68,68,.35); font-size:10px; cursor:pointer; font-weight:600; }

/* 输入区 */
.input-area { padding:0 14% 8px; flex-shrink:0; }
@media(max-width:1200px) { .input-area { padding:0 4% 8px; } }
@media(max-width:768px) { .input-area { padding:0 8px 6px; } }
.pf-list { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; }
.pf-chip { display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,.025); border:1px solid rgba(139,92,246,.04); font-size:10px; color:rgba(255,255,255,.3); }
.pf-thumb { width:28px; height:28px; border-radius:4px; object-fit:cover; } .pf-ficon { font-size:13px; }
.pf-name { max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf-x { background:none; border:none; color:rgba(255,255,255,.12); cursor:pointer; font-size:12px; }
.ibox { background:rgba(12,10,24,.95); border:1px solid rgba(255,255,255,.04); border-radius:14px; padding:4px 6px; display:flex; align-items:flex-end; gap:3px; transition:all .2s; }
.ibox.focus { border-color:rgba(139,92,246,.1); box-shadow:0 0 0 2px rgba(139,92,246,.02); }
.itools { display:flex; gap:1px; padding-bottom:3px; }
.itool { width:30px; height:30px; border-radius:7px; border:none; background:none; color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; } .itool:hover { color:rgba(255,255,255,.35); background:rgba(255,255,255,.015); }
/* 录音波形条 */
.voice-rec-bar { display:flex; align-items:center; gap:8px; padding:8px 10px; background:rgba(239,68,68,.04); border:1px solid rgba(239,68,68,.12); border-radius:14px; animation:recPulse 2s infinite; }
@keyframes recPulse { 0%,100%{border-color:rgba(239,68,68,.12)} 50%{border-color:rgba(239,68,68,.25)} }
.voice-cancel { width:30px; height:30px; border-radius:50%; border:none; background:rgba(239,68,68,.08); color:rgba(239,68,68,.5); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.voice-cancel:hover { background:rgba(239,68,68,.15); color:rgba(239,68,68,.8); }
.voice-wave-wrap { flex:1; display:flex; align-items:center; gap:8px; min-width:0; }
.voice-wave { flex:1; height:32px; border-radius:6px; }
.voice-dur { font-size:11px; color:rgba(239,68,68,.5); font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.voice-done { width:32px; height:32px; border-radius:9px; border:none; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }
.voice-done:hover { transform:scale(1.05); box-shadow:0 3px 10px rgba(139,92,246,.15); }
.ibox textarea { flex:1; background:none; border:none; color:white; font-family:inherit; font-size:13px; resize:none; padding:6px 3px; outline:none; max-height:180px; line-height:1.5; min-height:20px; }
.ibox textarea::placeholder { color:rgba(255,255,255,.1); }
.send { width:32px; height:32px; border-radius:9px; border:none; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; margin-bottom:1px; }
.send:hover:not(:disabled) { transform:scale(1.05); box-shadow:0 3px 10px rgba(139,92,246,.15); }
.send:disabled { opacity:.1; cursor:default; background:rgba(255,255,255,.015); }
.send.stop-mode { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.1); color:rgba(239,68,68,.5); }
.send.stop-mode:hover { background:rgba(239,68,68,.1); color:rgba(239,68,68,.7); }

/* 能力工具栏（参考DeepSeek/Kimi设计） */
.ability-bar { display:flex; align-items:center; gap:4px; margin-top:6px; padding:0 2px; flex-wrap:wrap; }
.ab-left { display:flex; gap:2px; flex-shrink:0; }
.ab-model { display:flex; align-items:center; gap:3px; padding:4px 10px; border-radius:7px; border:1px solid rgba(255,255,255,.03); background:none; color:rgba(255,255,255,.2); font-size:11px; font-weight:500; cursor:pointer; transition:all .2s; white-space:nowrap; }
.ab-model:hover { color:rgba(255,255,255,.35); background:rgba(255,255,255,.015); }
.ab-model.active { background:rgba(139,92,246,.06); color:rgba(139,92,246,.65); border-color:rgba(139,92,246,.08); font-weight:600; }
.ab-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.ab-dot.default { background:rgba(59,130,246,.5); } .ab-dot.thinking { background:rgba(168,85,247,.5); } .ab-dot.fast { background:rgba(34,197,94,.5); }
.ab-divider { width:1px; height:16px; background:rgba(255,255,255,.04); margin:0 4px; flex-shrink:0; }
.ab-tools { display:flex; gap:2px; flex-wrap:wrap; }
.ab-tool { display:flex; align-items:center; gap:3px; padding:4px 8px; border-radius:7px; border:none; background:none; color:rgba(255,255,255,.18); font-size:11px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.ab-tool:hover { color:rgba(139,92,246,.55); background:rgba(139,92,246,.03); }

/* ============ v9: 侧边栏搜索 + 菜单 + 置顶 ============ */
.sb-search { display:flex; align-items:center; gap:6px; margin:2px 10px 6px; padding:6px 10px; border-radius:8px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.03); transition:all .15s; }
.sb-search:focus-within { border-color:rgba(139,92,246,.15); background:rgba(139,92,246,.025); }
.sb-search svg { color:rgba(255,255,255,.25); flex-shrink:0; }
.sb-search-input { flex:1; background:none; border:none; color:rgba(255,255,255,.65); font-size:12px; outline:none; min-width:0; }
.sb-search-input::placeholder { color:rgba(255,255,255,.18); }
.sb-search-clear { background:none; border:none; color:rgba(255,255,255,.25); cursor:pointer; font-size:14px; padding:0 2px; line-height:1; }
.sb-search-clear:hover { color:rgba(255,255,255,.5); }

.sb-item { position:relative; }
.pin-dot { font-size:10px; margin-right:4px; flex-shrink:0; }
.sb-more { opacity:0; background:none; border:none; color:rgba(255,255,255,.25); font-size:13px; cursor:pointer; padding:0 4px; border-radius:4px; }
.sb-item:hover .sb-more { opacity:1; }
.sb-item.active .sb-more { opacity:1; }
.sb-more:hover { color:rgba(139,92,246,.8); background:rgba(139,92,246,.08); }

.sb-group-pinned .sb-label { color:rgba(245,158,11,.7); }
.sb-group-pinned .sb-item { background:rgba(245,158,11,.015); }
.sb-group-pinned .sb-item.active { background:rgba(245,158,11,.05); color:rgba(245,158,11,.8); }

.sb-menu { position:absolute; right:8px; top:100%; margin-top:4px; z-index:20; background:rgba(18,14,32,.98); backdrop-filter:blur(20px); border:1px solid rgba(139,92,246,.15); border-radius:10px; padding:4px; box-shadow:0 8px 24px rgba(0,0,0,.4); min-width:160px; animation:menuFade .18s ease-out; }
@keyframes menuFade { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
.sb-menu-item { width:100%; display:flex; align-items:center; gap:8px; padding:6px 10px; border:none; background:none; color:rgba(255,255,255,.7); font-size:11.5px; cursor:pointer; border-radius:6px; text-align:left; transition:all .12s; }
.sb-menu-item:hover { background:rgba(139,92,246,.1); color:white; }
.sb-menu-item-danger { color:rgba(239,68,68,.7); }
.sb-menu-item-danger:hover { background:rgba(239,68,68,.1); color:rgba(239,68,68,.95); }
.mi-icon { font-size:13px; width:16px; text-align:center; }
.sb-menu-div { height:1px; background:rgba(255,255,255,.05); margin:3px 4px; }

.sb-rename { padding:6px 8px; }
.sb-rename-input { width:100%; background:rgba(139,92,246,.08); border:1px solid rgba(139,92,246,.2); border-radius:6px; padding:5px 8px; color:white; font-size:12px; outline:none; }

.sb-toggle-archived { width:100%; margin:8px 8px 4px; padding:5px 8px; background:none; border:1px dashed rgba(255,255,255,.04); border-radius:6px; color:rgba(255,255,255,.2); font-size:11px; cursor:pointer; text-align:left; }
.sb-toggle-archived:hover { color:rgba(255,255,255,.4); border-color:rgba(139,92,246,.1); }

.sb-item-search { flex-direction:column; align-items:flex-start; padding:6px 10px; gap:2px; }
.sb-text-wrap { flex:1; width:100%; overflow:hidden; }
.sb-hit { font-size:10px; color:rgba(255,255,255,.3); line-height:1.45; margin-top:2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }

/* ============ v9: 顶部指示器 ============ */
.top-right { margin-left:auto; display:flex; align-items:center; gap:10px; }
.ctx-gauge { display:flex; align-items:center; gap:6px; padding:3px 10px; border-radius:8px; background:rgba(139,92,246,.04); border:1px solid rgba(139,92,246,.06); }
.ctx-label { font-size:10px; color:rgba(255,255,255,.35); font-weight:600; }
.ctx-bar { width:42px; height:4px; border-radius:2px; background:rgba(255,255,255,.05); overflow:hidden; }
.ctx-fill { display:block; height:100%; background:linear-gradient(90deg, rgba(139,92,246,.7), rgba(59,130,246,.7)); transition:width .4s; }
.ctx-fill.warn { background:linear-gradient(90deg, rgba(245,158,11,.8), rgba(239,68,68,.8)); }
.ctx-num { font-size:10px; color:rgba(255,255,255,.35); font-variant-numeric:tabular-nums; }
.offline-dot { font-size:10px; color:rgba(239,68,68,.7); padding:2px 8px; border-radius:10px; background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.12); animation:offlinePulse 1.6s ease-in-out infinite; }
@keyframes offlinePulse { 0%,100%{opacity:.8} 50%{opacity:1} }
.top-fav { position:relative; background:none; border:1px solid rgba(255,255,255,.04); color:rgba(255,255,255,.35); width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
.top-fav:hover { color:rgba(245,158,11,.85); border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.06); }
.top-fav-count { position:absolute; top:-4px; right:-4px; background:linear-gradient(135deg,#f59e0b,#ef4444); color:white; font-size:9px; font-weight:700; padding:1px 4px; border-radius:8px; line-height:1.2; min-width:14px; text-align:center; }

/* ============ v9: 工作流面板 ============ */
.workflow-intro { margin-top:24px; }
.wi-title { font-size:11px; font-weight:700; color:rgba(255,255,255,.3); letter-spacing:1px; text-align:center; margin-bottom:10px; text-transform:uppercase; }
.workflow-row { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; max-width:560px; margin:0 auto; }
.wf-chip { display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:16px; border:1px solid rgba(139,92,246,.08); background:rgba(139,92,246,.03); color:rgba(139,92,246,.65); font-size:11px; font-weight:600; cursor:pointer; transition:all .2s; }
.wf-chip:hover { background:rgba(139,92,246,.08); border-color:rgba(139,92,246,.2); color:white; transform:translateY(-1px); box-shadow:0 3px 10px rgba(139,92,246,.12); }
.wf-icon { font-size:13px; }

.workflow-btn { background:rgba(139,92,246,.04) !important; color:rgba(139,92,246,.7) !important; border:1px solid rgba(139,92,246,.08) !important; }
.workflow-btn.active { background:rgba(139,92,246,.12) !important; color:rgba(139,92,246,.95) !important; border-color:rgba(139,92,246,.25) !important; }

.workflow-panel { position:absolute; bottom:calc(100% + 6px); left:14%; right:14%; background:rgba(12,10,24,.98); backdrop-filter:blur(22px); border:1px solid rgba(139,92,246,.2); border-radius:14px; padding:14px 16px; box-shadow:0 -8px 28px rgba(0,0,0,.4); z-index:15; }
@media(max-width:1200px) { .workflow-panel { left:4%; right:4%; } }
@media(max-width:768px) { .workflow-panel { left:8px; right:8px; } }
.wf-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
.wf-title { font-size:13px; font-weight:700; color:white; }
.wf-hint { font-size:10px; color:rgba(255,255,255,.35); font-weight:400; margin-left:8px; }
.wf-close { background:none; border:none; color:rgba(255,255,255,.3); font-size:16px; cursor:pointer; padding:0 4px; line-height:1; }
.wf-close:hover { color:white; }
.wf-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:6px; }
.wf-card { display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid rgba(255,255,255,.04); border-radius:10px; background:rgba(255,255,255,.015); text-align:left; cursor:pointer; transition:all .18s; }
.wf-card:hover { background:rgba(139,92,246,.05); border-color:rgba(139,92,246,.15); transform:translateY(-1px); }
.wf-card-icon { font-size:18px; flex-shrink:0; }
.wf-card-main { flex:1; min-width:0; }
.wf-card-label { font-size:12px; font-weight:700; color:rgba(255,255,255,.85); margin-bottom:2px; }
.wf-card-hint { font-size:10px; color:rgba(255,255,255,.3); line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wf-pop-enter-active, .wf-pop-leave-active { transition:all .22s cubic-bezier(.2,.8,.2,1); }
.wf-pop-enter-from, .wf-pop-leave-to { opacity:0; transform:translateY(10px); }

/* ============ v9: Emoji 选择器 ============ */
.emoji-panel { position:absolute; bottom:calc(100% + 6px); left:14%; background:rgba(12,10,24,.98); backdrop-filter:blur(22px); border:1px solid rgba(139,92,246,.2); border-radius:12px; padding:6px; box-shadow:0 -8px 28px rgba(0,0,0,.4); z-index:15; width:320px; max-width:90vw; }
@media(max-width:1200px) { .emoji-panel { left:4%; } }
@media(max-width:768px) { .emoji-panel { left:8px; right:8px; width:auto; } }
.emoji-cats { display:flex; gap:2px; border-bottom:1px solid rgba(255,255,255,.04); padding-bottom:4px; margin-bottom:4px; overflow-x:auto; }
.emoji-cat { background:none; border:none; padding:4px 8px; border-radius:6px; font-size:15px; cursor:pointer; opacity:.5; transition:all .15s; }
.emoji-cat:hover { opacity:.85; background:rgba(255,255,255,.03); }
.emoji-cat.active { opacity:1; background:rgba(139,92,246,.12); }
.emoji-grid { display:grid; grid-template-columns:repeat(10, 1fr); gap:2px; max-height:220px; overflow-y:auto; padding:2px; }
.emoji-btn { background:none; border:none; padding:4px; border-radius:4px; font-size:18px; cursor:pointer; transition:all .1s; line-height:1; }
.emoji-btn:hover { background:rgba(139,92,246,.1); transform:scale(1.15); }
.emoji-grid::-webkit-scrollbar { width:4px; } .emoji-grid::-webkit-scrollbar-thumb { background:rgba(139,92,246,.25); border-radius:4px; }
.emoji-empty { grid-column:1 / -1; padding:14px; text-align:center; color:rgba(255,255,255,.3); font-size:11px; }
.itool-emoji.active { color:rgba(139,92,246,.9); background:rgba(139,92,246,.08); }
.emoji-pop-enter-active, .emoji-pop-leave-active { transition:all .18s; }
.emoji-pop-enter-from, .emoji-pop-leave-to { opacity:0; transform:translateY(6px) scale(.96); }

/* ============ v9: 消息操作按钮激活态 + 缓存徽章 ============ */
.msg-acts button.active { background:rgba(139,92,246,.12); color:rgba(139,92,246,.9); }
.msg-acts button.active:hover { background:rgba(139,92,246,.18); }
.cache-badge { display:inline-flex; align-items:center; gap:3px; margin-top:6px; padding:2px 8px; border-radius:10px; background:linear-gradient(135deg, rgba(34,197,94,.12), rgba(59,130,246,.08)); border:1px solid rgba(34,197,94,.2); color:rgba(134,239,172,.85); font-size:10px; font-weight:600; }

/* ============ v9: 收藏夹 Modal ============ */
.fav-overlay { position:fixed; inset:0; background:rgba(4,4,12,.7); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
.fav-modal { width:100%; max-width:620px; max-height:85vh; display:flex; flex-direction:column; background:linear-gradient(180deg, rgba(18,14,32,.98), rgba(12,10,24,.98)); border:1px solid rgba(139,92,246,.2); border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,.5); }
.fav-head { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1px solid rgba(255,255,255,.04); }
.fav-head h3 { font-size:14px; font-weight:700; color:white; margin:0; }
.fav-close { background:rgba(255,255,255,.04); border:none; color:rgba(255,255,255,.5); width:28px; height:28px; border-radius:8px; cursor:pointer; font-size:14px; }
.fav-close:hover { background:rgba(239,68,68,.1); color:rgba(239,68,68,.85); }
.fav-empty { padding:50px 20px; text-align:center; color:rgba(255,255,255,.35); }
.fav-empty-icon { font-size:36px; margin-bottom:10px; }
.fav-empty p { font-size:12px; }
.fav-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:6px; }
.fav-list::-webkit-scrollbar { width:4px; } .fav-list::-webkit-scrollbar-thumb { background:rgba(139,92,246,.25); border-radius:4px; }
.fav-item { padding:12px 14px; border:1px solid rgba(255,255,255,.04); border-radius:10px; background:rgba(255,255,255,.01); transition:all .18s; }
.fav-item:hover { border-color:rgba(139,92,246,.15); background:rgba(139,92,246,.02); }
.fav-meta { display:flex; align-items:center; gap:8px; font-size:10px; color:rgba(255,255,255,.4); margin-bottom:6px; flex-wrap:wrap; }
.fav-role { padding:1px 6px; border-radius:4px; background:rgba(139,92,246,.08); color:rgba(196,181,253,.85); font-weight:600; }
.fav-role.user { background:rgba(59,130,246,.08); color:rgba(147,197,253,.85); }
.fav-conv-title { font-weight:600; color:rgba(255,255,255,.55); }
.fav-time { margin-left:auto; font-variant-numeric:tabular-nums; }
.fav-content { font-size:12px; line-height:1.6; color:rgba(255,255,255,.75); margin-bottom:8px; white-space:pre-wrap; word-break:break-word; }
.fav-acts { display:flex; gap:6px; }
.fav-act { padding:4px 10px; border:1px solid rgba(255,255,255,.06); border-radius:6px; background:rgba(255,255,255,.02); color:rgba(255,255,255,.55); font-size:10.5px; cursor:pointer; transition:all .15s; }
.fav-act:hover { background:rgba(139,92,246,.1); color:white; border-color:rgba(139,92,246,.2); }
.fav-act-danger:hover { background:rgba(239,68,68,.1); color:rgba(239,68,68,.9); border-color:rgba(239,68,68,.2); }

.input-area { position:relative; } /* 相对定位用于 workflow-panel / emoji-panel 绝对定位 */

/* ============ v9: 移动端细节优化 ============ */
@media(max-width:768px) {
  .sb-menu { right:4px; min-width:140px; max-width:calc(100vw - 20px); font-size:12px; }
  .emoji-grid { grid-template-columns:repeat(8, 1fr); max-height:40vh; }
  .wf-grid { grid-template-columns:1fr; }
  .ctx-gauge { display:none; } /* 移动端空间紧张，先藏起 */
  .top-right { gap:6px; }
  .ibox textarea { font-size:14px; } /* 防止 iOS 自动缩放 */
  .fav-modal { max-height:92vh; }
  .fav-meta { font-size:9.5px; }
}

/* textarea 禁用态样式（离线） */
.ibox textarea:disabled { cursor:not-allowed; color:rgba(255,255,255,.3); }
.ibox textarea:disabled::placeholder { color:rgba(239,68,68,.5); }

/* v9: 思考过程滚动适配 —— 长的 reasoning 折叠框支持滚动 */
.think-body { max-height:320px; overflow-y:auto; }
.think-body::-webkit-scrollbar { width:3px; }
.think-body::-webkit-scrollbar-thumb { background:rgba(139,92,246,.2); border-radius:4px; }

/* ============ v9: 后端切换按钮（云端 / 自动 / 本地 Gamma4） ============ */
.backend-switch { display:flex; gap:2px; padding:2px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.04); border-radius:8px; }
.bk-btn { display:inline-flex; align-items:center; gap:3px; padding:3px 8px; border-radius:6px; border:none; background:none; color:rgba(255,255,255,.3); font-size:10.5px; cursor:pointer; font-weight:600; transition:all .15s; position:relative; white-space:nowrap; }
.bk-btn:hover { color:rgba(255,255,255,.6); background:rgba(255,255,255,.025); }
.bk-btn.active { background:linear-gradient(135deg, rgba(139,92,246,.15), rgba(59,130,246,.1)); color:rgba(196,181,253,.95); box-shadow:0 1px 4px rgba(139,92,246,.15); }
.bk-btn.disabled { opacity:.35; cursor:not-allowed; }
.bk-btn.disabled:hover { background:none; color:rgba(255,255,255,.3); }
.bk-icon { font-size:12px; line-height:1; }
.bk-dot-ok { width:5px; height:5px; border-radius:50%; background:rgba(34,197,94,.85); box-shadow:0 0 4px rgba(34,197,94,.5); flex-shrink:0; }
.bk-dot-off { width:5px; height:5px; border-radius:50%; background:rgba(239,68,68,.7); flex-shrink:0; }
@media(max-width:900px) {
  .bk-btn { padding:3px 6px; font-size:10px; }
  .bk-btn:not(.active) span:not(.bk-icon):not(.bk-dot-ok):not(.bk-dot-off) { display:none; }
}
@media(max-width:768px) {
  .backend-switch { display:none; } /* 手机收起（留 top-fav/ctx-gauge 二者）*/
}
</style>
