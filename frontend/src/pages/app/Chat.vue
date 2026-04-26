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
                    <span class="mi-icon">📝</span><span>导出 Markdown</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'word')">
                    <span class="mi-icon">🅦</span><span>导出 Word (.doc)</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'pdf')">
                    <span class="mi-icon">🅿️</span><span>导出 PDF（直接下载）</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'html')">
                    <span class="mi-icon">🌐</span><span>导出 HTML</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'txt')">
                    <span class="mi-icon">📄</span><span>导出 TXT</span>
                  </button>
                  <button class="sb-menu-item" @click="triggerExport(c.id, 'json')">
                    <span class="mi-icon">🧾</span><span>导出 JSON</span>
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
          <!-- v11: 上下文窗口用量指示器（达到 80% 触发建议摘要；达到 100% 自动后台摘要） -->
          <div
            class="ctx-gauge"
            :class="{ warn: contextUsage.ratio > 0.8, full: contextUsage.ratio >= 1, summarizing }"
            :title="summarizing ? '星火正在压缩早期对话为记忆摘要…' : `记忆 ${contextUsage.used} / ${contextUsage.limit} 条${contextUsage.ratio > 0.8 ? '，点击可提前把早期对话压缩为摘要' : ''}`"
            v-if="contextUsage.used > 0"
            @click="handleSummarizeNow"
          >
            <span class="ctx-label">{{ summarizing ? '记忆压缩中' : '记忆' }}</span>
            <span class="ctx-bar"><span class="ctx-fill" :class="{ warn: contextUsage.ratio > 0.8 }" :style="{ width: (contextUsage.ratio * 100).toFixed(0) + '%' }"></span></span>
            <span class="ctx-num">{{ contextUsage.used }}/{{ contextUsage.limit }}</span>
          </div>
          <!-- v11: 新开对话并继承记忆（让 AI 还记得之前聊过什么） -->
          <button
            v-if="contextUsage.used >= 8"
            class="top-inherit"
            :disabled="summarizing"
            title="把当前会话压缩成记忆摘要，新开一个对话但继承上下文"
            @click="handleInheritMemory"
          >
            <span v-if="summarizing">压缩中…</span>
            <span v-else>🧠 续聊</span>
          </button>
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
        <div v-if="displayMsgs.length === 0 && !streamingInCurrentView" class="empty">
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
                <div v-for="(a, i) in msg.attachments" :key="i" class="file-card" :class="{ 'file-card-img': a.type === 'image' }" @click="openPreview(a)" :title="a.type === 'image' ? '点击查看大图' : '点击预览内容'">
                  <img v-if="a.type === 'image' && a.url" :src="a.url" class="fc-thumb" :alt="a.name">
                  <div v-else class="fc-icon">📄</div>
                  <div class="fc-info"><div class="fc-name">{{ a.name }}</div><div class="fc-size">{{ a.size }}</div></div>
                </div>
              </div>
              <div v-if="msg.role === 'user'" class="user-bubble"><div class="u-text">{{ msg.displayContent || msg.content }}</div></div>
              <div v-if="msg.role === 'user' && !streamingInCurrentView" class="msg-acts user-acts">
                <button @click="copyText(msg.content)" title="复制"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button @click="editMessage(idx)" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              </div>
              <!-- 思考过程 -->
              <div v-if="msg.role === 'assistant' && msg.reasoning" class="think-block">
                <button class="think-toggle" @click="collapsedThinking[idx] = !collapsedThinking[idx]">
                  <span class="think-status" :class="{ spinning: msg.pending && streamingInCurrentView && !(msg.content && msg.content.trim()) }">💭</span>
                  <span>{{ msg.pending && streamingInCurrentView && !(msg.content && msg.content.trim()) ? '正在思考...' : '思考过程' }}</span>
                  <svg class="think-chevron" :class="{ collapsed: collapsedThinking[idx] }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div v-show="!collapsedThinking[idx]" class="think-body md-body" v-html="renderMd(msg.reasoning)"></div>
              </div>
              <!-- v13 T9：pending 占位且无内容 → 显示"正在思考"加载态 -->
              <div v-if="msg.role === 'assistant' && msg.pending && streamingInCurrentView && !msg.content && !msg.reasoning" class="think-block think-block-loading">
                <div class="think-toggle"><span class="think-status spinning">💭</span><span>{{ thinkingHint }}</span></div>
                <div class="think-dots"><span></span><span></span><span></span></div>
                <div class="think-sub-hint">{{ thinkingSubHint }}</div>
              </div>
              <!-- v13 T9：其它会话正在生成，本视图看到 pending 占位消息时的静态提示 -->
              <div v-if="msg.role === 'assistant' && msg.pending && !streamingInCurrentView && !msg.content" class="bg-streaming-hint">
                <span class="bg-dot"></span>正在后台生成中（你切回来时会自动显示最新进度）
              </div>
              <!-- AI 回复（含导航链接渲染） -->
              <div v-if="msg.role === 'assistant' && msg.content" class="md-body" v-html="renderMd(msg.content)" @click="handleMdClick"></div>
              <!-- v9: 命中缓存徽章 -->
              <span v-if="msg.role === 'assistant' && msg.fromCache" class="cache-badge" title="此回复来自本地响应缓存，内容与最新请求一致">⚡ 来自缓存</span>
              <span v-if="msg.role === 'assistant' && msg.pending && streamingInCurrentView && !!(msg.content && msg.content.trim())" class="cursor"></span>
              <div v-if="msg.role === 'assistant' && !msg.pending && msg.content" class="msg-acts">
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
                <!-- v13: 单条导出菜单 -->
                <div class="msg-export">
                  <button class="msg-export-btn" :class="{ active: msgExportOpen === idx }" title="导出本条" aria-label="导出本条回复" @click.stop="msgExportOpen = msgExportOpen === idx ? -1 : idx">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <div v-if="msgExportOpen === idx" class="msg-export-menu" @click.stop>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'markdown'); msgExportOpen = -1">📝 Markdown (.md)</button>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'word'); msgExportOpen = -1">🅦 Word (.doc)</button>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'pdf'); msgExportOpen = -1">🅿️ PDF</button>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'html'); msgExportOpen = -1">🌐 HTML</button>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'txt'); msgExportOpen = -1">📄 TXT</button>
                    <button class="mx-item" @click="exportSingleMessage(idx, 'json'); msgExportOpen = -1">🧾 JSON</button>
                  </div>
                </div>
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
          <div v-for="(f, i) in pendingFiles" :key="i" class="pf-chip" :class="{ 'pf-chip-img': f.type === 'image' }" @click="openPreview(f)" :title="f.type === 'image' ? '点击查看大图' : '点击预览内容'">
            <img v-if="f.type === 'image' && f.url" :src="f.url" class="pf-thumb" :alt="f.name">
            <span v-else class="pf-ficon">📄</span>
            <span class="pf-name">{{ f.name }}</span>
            <span class="pf-size">{{ f.size }}</span>
            <button class="pf-x" aria-label="移除" @click.stop="pendingFiles.splice(i,1)">×</button>
          </div>
          <div class="pf-meta">已选 {{ pendingFiles.length }}/5 · 单文件 ≤ 5 MB · 文本内容 ≤ 10 KB 可读</div>
        </div>
        <!-- v13: 语音录制条 —— 左侧实时转写预览，右侧波形+计时，支持边说边看 -->
        <div v-if="isRec" class="voice-rec-bar">
          <button class="voice-cancel" @click="cancelVoice" title="取消录音">✕</button>
          <div class="voice-live">
            <div class="voice-live-label">
              <span class="voice-live-dot"></span>
              实时识别{{ voiceInterim ? '…' : '（开始说话）' }}
            </div>
            <div class="voice-live-text">
              <span class="voice-final">{{ voiceFinalized }}</span><span class="voice-interim">{{ voiceInterim }}</span>
            </div>
          </div>
          <div class="voice-wave-wrap" ref="waveWrapRef">
            <canvas ref="waveCanvas" class="voice-wave" height="32"></canvas>
            <span class="voice-dur">{{ recDuration }}s</span>
          </div>
          <button class="voice-done" @click="finishVoice" title="停止并预览（手动发送）">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
          </button>
        </div>

        <!-- v13: 语音识别结果预览条 —— 发送前可编辑 / 重录 / 取消 -->
        <div v-if="voicePreviewActive" class="voice-preview">
          <div class="vp-head">
            <span class="vp-icon">🎤</span>
            <span class="vp-title">语音识别结果 · 可编辑后发送</span>
            <span class="vp-meta" v-if="voicePreviewMeta">{{ voicePreviewMeta }}</span>
          </div>
          <textarea
            v-model="voicePreviewText"
            class="vp-text"
            rows="2"
            placeholder="识别为空，请重新录入"
            @input="onVoicePreviewInput"
            @keydown.ctrl.enter.prevent="confirmVoicePreview"
            @keydown.meta.enter.prevent="confirmVoicePreview"
          ></textarea>
          <div class="vp-acts">
            <button class="vp-btn" @click="voicePreviewActive = false" title="放弃这次识别">✕ 取消</button>
            <button class="vp-btn" @click="restartVoice" title="重新录入">↻ 重新录制</button>
            <button class="vp-btn" @click="polishVoicePreview" title="智能断句：按标点/停顿自动补标点" :disabled="!voicePreviewText.trim()">✨ 智能断句</button>
            <button class="vp-btn" @click="copyVoicePreview" title="复制文本" :disabled="!voicePreviewText.trim()">📋 复制</button>
            <button class="vp-btn vp-btn-primary" @click="confirmVoicePreview" :disabled="!voicePreviewText.trim()">
              发送 <span class="vp-kbd">Ctrl+Enter</span>
            </button>
          </div>
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
          <button v-if="streamingInCurrentView" class="send stop-mode" @click="stopGenerating" title="停止" aria-label="停止生成">
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
            <!-- v13: 当前激活的工作流徽章 -->
            <div v-if="activeWorkflow" class="ab-workflow-chip" :title="activeWorkflow.systemHint || activeWorkflow.hint">
              {{ activeWorkflow.icon }} {{ activeWorkflow.label }}
              <button class="ab-wf-clear" aria-label="清除激活的工作流" title="清除" @click.stop="activeWorkflow = null">×</button>
            </div>
            <button v-for="t in ABILITY_TOOLS" :key="t.key" class="ab-tool" :class="{ 'ab-tool-active': activeWorkflow?.suggestedAbilities?.includes(t.key) }" @click="activateAbility(t)">
              <span>{{ t.icon }}</span><span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- v9: 工作流面板 -->
        <Transition name="wf-pop">
          <div v-if="showWorkflow" class="workflow-panel">
            <div class="wf-head">
              <div class="wf-title">🚀 一键工作流 <span class="wf-hint">点击卡片查看详情，再次点击使用</span></div>
              <button class="wf-close" aria-label="关闭" @click="showWorkflow = false">×</button>
            </div>
            <div class="wf-grid">
              <button
                v-for="w in WORKFLOW_PRESETS" :key="w.key"
                class="wf-card"
                :class="['wf-kind-' + (w.kind || 'productivity'), { 'wf-card-expanded': expandedWorkflow === w.key, 'wf-card-active': activeWorkflow?.key === w.key }]"
                @click="handleWorkflowClick(w)"
              >
                <div class="wf-card-icon">{{ w.icon }}</div>
                <div class="wf-card-main">
                  <div class="wf-card-label">
                    {{ w.label }}
                    <span v-if="w.suggestedModel" class="wf-tag wf-tag-model">{{ MODEL_OPTIONS[w.suggestedModel].icon }} {{ MODEL_OPTIONS[w.suggestedModel].label }}</span>
                    <span v-if="w.acceptsFiles" class="wf-tag wf-tag-file">📎</span>
                    <span v-if="activeWorkflow?.key === w.key" class="wf-tag wf-tag-active">✓ 激活中</span>
                  </div>
                  <div v-if="w.hint" class="wf-card-hint">{{ w.hint }}</div>
                  <Transition name="wf-expand">
                    <div v-if="expandedWorkflow === w.key" class="wf-card-detail">
                      <div class="wf-detail-prompt">
                        <span class="wf-detail-label">模板预览</span>
                        <div class="wf-detail-text">{{ formatWorkflowPrompt(w.prompt) }}</div>
                      </div>
                      <div v-if="w.systemHint" class="wf-detail-sys">
                        <span class="wf-detail-label">AI 场景设定</span>
                        <div class="wf-detail-text wf-detail-sys-text">{{ w.systemHint.slice(0, 80) }}...</div>
                      </div>
                      <div class="wf-detail-abilities" v-if="w.suggestedAbilities?.length">
                        <span class="wf-detail-label">联动能力</span>
                        <div class="wf-detail-abilities-row">
                          <span v-for="ak in w.suggestedAbilities" :key="ak" class="wf-detail-ability">{{ ABILITY_TOOLS.find(a => a.key === ak)?.icon }} {{ ABILITY_TOOLS.find(a => a.key === ak)?.label }}</span>
                        </div>
                      </div>
                      <div class="wf-detail-action">
                        <button class="wf-use-btn" @click.stop="applyWorkflow(w)">🚀 使用此工作流</button>
                      </div>
                    </div>
                  </Transition>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <!-- v13: 附件预览 Lightbox（图片放大 / 文本预览） -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="previewAttachment" class="att-lightbox" @click.self="closePreview" @keydown.esc="closePreview">
          <button class="att-close" aria-label="关闭预览" @click="closePreview">×</button>
          <div class="att-body" @click.stop>
            <div class="att-head">
              <span class="att-title">
                <span class="att-icon">{{ previewAttachment.type === 'image' ? '🖼️' : '📄' }}</span>
                {{ previewAttachment.name }}
              </span>
              <span class="att-size" v-if="previewAttachment.size">{{ previewAttachment.size }}</span>
            </div>
            <div class="att-main">
              <img v-if="previewAttachment.type === 'image' && previewAttachment.url" :src="previewAttachment.url" class="att-img" :alt="previewAttachment.name">
              <pre v-else-if="previewAttachment.content" class="att-text"><code>{{ previewAttachment.content }}</code></pre>
              <div v-else class="att-empty">⚠️ 二进制文件，无法预览全部内容</div>
            </div>
            <div class="att-foot">
              <button v-if="previewAttachment.content" class="att-btn" @click="copyText(previewAttachment.content)">📋 复制全文</button>
              <button v-if="previewAttachment.url" class="att-btn" @click="downloadAttachment(previewAttachment)">⬇️ 下载原始文件</button>
              <button class="att-btn att-btn-primary" @click="closePreview">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- v13: 通用确认 Modal（替换原生 confirm） -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDialog" class="confirm-overlay" @click.self="cancelConfirm">
          <div class="confirm-box" :class="confirmDialog.kind || 'info'">
            <div class="confirm-icon">{{ confirmDialog.kind === 'danger' ? '⚠️' : '💡' }}</div>
            <div class="confirm-title">{{ confirmDialog.title }}</div>
            <div v-if="confirmDialog.desc" class="confirm-desc">{{ confirmDialog.desc }}</div>
            <div class="confirm-acts">
              <button class="cf-cancel" @click="cancelConfirm">{{ confirmDialog.cancelText || '取消' }}</button>
              <button class="cf-ok" :class="{ 'cf-ok-danger': confirmDialog.kind === 'danger' }" @click="resolveConfirm">
                {{ confirmDialog.okText || '确认' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 代码沙盒预览 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="sandboxOpen" class="sandbox-overlay" @click.self="closeSandbox" @keydown.esc="closeSandbox">
          <div class="sandbox-container" @click.stop>
            <div class="sandbox-header">
              <div class="sandbox-title">
                <span class="sandbox-icon">🧪</span>
                代码沙盒
                <span class="sandbox-lang-badge">{{ sandboxLang }}</span>
              </div>
              <div class="sandbox-actions">
                <button class="sandbox-btn" @click="rerunSandbox" title="重新运行">🔄 重新运行</button>
                <button class="sandbox-btn sandbox-btn-edit" @click="sandboxEditing = !sandboxEditing" title="编辑代码">✏️ {{ sandboxEditing ? '预览' : '编辑' }}</button>
                <button class="sandbox-close" @click="closeSandbox" aria-label="关闭">×</button>
              </div>
            </div>
            <div class="sandbox-body" :class="{ 'sandbox-split': sandboxEditing }">
              <div v-if="sandboxEditing" class="sandbox-editor">
                <textarea v-model="sandboxCode" class="sandbox-textarea" spellcheck="false"></textarea>
              </div>
              <div class="sandbox-preview" :class="{ 'sandbox-preview-full': !sandboxEditing }">
                <div v-if="sandboxRunning" class="sandbox-loading">
                  <span class="sandbox-spinner"></span>运行中...
                </div>
                <iframe ref="sandboxIframeRef" class="sandbox-iframe" sandbox="allow-scripts allow-modals allow-same-origin" title="代码运行结果"></iframe>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
  error: aiError, currentModel,
  conversations, currentConversationId, favorites, summarizingConvId,
  streamingConvIds,
  createConversation, getCurrentConversation, switchConversation, deleteConversation,
  renameConversation, togglePinConversation, toggleArchiveConversation,
  duplicateConversation, searchConversations, exportConversation,
  toggleFavoriteMessage, isMessageFavorited, setMessageReaction, getMessageReaction, jumpToFavorite,
  sendMessage, pushUserMessageImmediately, resetStreamingState, stopGenerating,
  summarizeCurrentConversation,
  inheritMemoryToNewConversation,
} = useSparkAI()

// v13 T9：当前会话是否正在生成 = 末条 assistant 为 pending 且该会话仍在全局流式列表中（避免误把幽灵 pending 当思考中）
const streamingInCurrentView = computed(() => {
  const id = currentConversationId.value
  if (!id) return false
  if (!streamingConvIds.value.includes(id)) return false
  const conv = conversations.value.find((c) => c.id === id)
  const last = conv?.messages[conv?.messages.length - 1]
  return !!(last?.role === 'assistant' && last.pending)
})
/** 当前会话是否正在执行记忆压缩摘要 */
const summarizing = computed(() => !!summarizingConvId.value && summarizingConvId.value === currentConversationId.value)
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
  '✨ 星火大脑推理中，复杂问题可能需要数秒',
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
watch(() => streamingInCurrentView.value, (v) => {
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

// 代码沙盒
const sandboxOpen = ref(false)
const sandboxLang = ref('')
const sandboxCode = ref('')
const sandboxOutput = ref('')
const sandboxRunning = ref(false)
const sandboxEditing = ref(false)
const sandboxIframeRef = ref<HTMLIFrameElement | null>(null)

function openSandbox(lang: string, code: string) {
  sandboxLang.value = lang
  sandboxCode.value = code
  sandboxOutput.value = ''
  sandboxRunning.value = true
  sandboxOpen.value = true
  nextTick(() => runInSandbox(lang, code))
}
function closeSandbox() { sandboxOpen.value = false; sandboxRunning.value = false }

function runInSandbox(lang: string, code: string) {
  const iframe = sandboxIframeRef.value
  if (!iframe) { sandboxRunning.value = false; return }

  if (['html'].includes(lang)) {
    iframe.srcdoc = code
    sandboxRunning.value = false
  } else if (['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(lang)) {
    const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;background:#0f0e1a;color:#e8e9ff;padding:16px;margin:0;font-size:14px;line-height:1.6;}pre{background:#1a1830;padding:12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;}.log{color:#9dffc3;}.error{color:#ff5c7c;}.warn{color:#ffb86c;}</style></head><body><pre id="out"></pre><script>
const _out=document.getElementById('out');
const _log=(cls,...a)=>{const d=document.createElement('div');d.className=cls;d.textContent=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ');_out.appendChild(d);};
console.log=(...a)=>_log('log',...a);
console.error=(...a)=>_log('error','❌ ',...a);
console.warn=(...a)=>_log('warn','⚠️ ',...a);
try{${code.replace(/<\/script>/gi, '<\\/script>')}}catch(e){console.error(e.message)}
<\/script></body></html>`
    iframe.srcdoc = wrappedHtml
    sandboxRunning.value = false
  } else if (['python', 'py'].includes(lang)) {
    runPythonSandbox(code, iframe)
  } else if (['css'].includes(lang)) {
    const cssPreview = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${code}</style></head><body>
<div style="padding:20px;font-family:system-ui,sans-serif;">
<h1>标题一</h1><h2>标题二</h2><h3>标题三</h3>
<p>这是一段<strong>示例文本</strong>，用于预览你的 CSS 样式。</p>
<button>按钮</button> <a href="#">链接</a>
<ul><li>列表项 1</li><li>列表项 2</li><li>列表项 3</li></ul>
<div class="card" style="border:1px solid #ccc;padding:16px;margin:12px 0;border-radius:8px;"><p>卡片内容</p></div>
<input type="text" placeholder="输入框"><br><br>
<table border="1" style="border-collapse:collapse"><tr><th>表头1</th><th>表头2</th></tr><tr><td>单元格1</td><td>单元格2</td></tr></table>
</div></body></html>`
    iframe.srcdoc = cssPreview
    sandboxRunning.value = false
  }
}

async function runPythonSandbox(code: string, iframe: HTMLIFrameElement) {
  const pyHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;background:#0f0e1a;color:#e8e9ff;padding:16px;margin:0;font-size:14px;line-height:1.6;}
pre{background:#1a1830;padding:12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;}
.loading{color:#c4b5fd;animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.error{color:#ff5c7c;}.output{color:#9dffc3;}</style></head><body>
<pre id="out"><span class="loading">⏳ 正在加载 Python 运行时 (Pyodide)...</span></pre>
<script src="https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js"><\/script>
<script>
const out=document.getElementById('out');
async function main(){
  try{
    const pyodide=await loadPyodide();
    out.innerHTML='';
    pyodide.setStdout({batched:(s)=>{const d=document.createElement('div');d.className='output';d.textContent=s;out.appendChild(d);}});
    pyodide.setStderr({batched:(s)=>{const d=document.createElement('div');d.className='error';d.textContent=s;out.appendChild(d);}});
    await pyodide.runPythonAsync(${JSON.stringify(code)});
    if(!out.children.length){const d=document.createElement('div');d.className='output';d.textContent='(程序执行完毕，无输出)';out.appendChild(d);}
  }catch(e){
    out.innerHTML='<div class="error">❌ '+e.message+'</div>';
  }
}
main();
<\/script></body></html>`
  iframe.srcdoc = pyHtml
  sandboxRunning.value = false
}

function rerunSandbox() {
  sandboxRunning.value = true
  nextTick(() => runInSandbox(sandboxLang.value, sandboxCode.value))
}

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

// v13: 单条导出菜单当前展开的消息索引（-1 表示关闭）
const msgExportOpen = ref(-1)

// v13: 附件预览 Lightbox
const previewAttachment = ref<FileAttachment | null>(null)
function openPreview(a: FileAttachment) {
  previewAttachment.value = a
}
function closePreview() { previewAttachment.value = null }
function downloadAttachment(a: FileAttachment) {
  try {
    if (a.content) {
      const blob = new Blob([a.content], { type: 'text/plain;charset=utf-8' })
      triggerBlobDownload(blob, a.name)
      return
    }
    if (a.url) {
      const el = document.createElement('a')
      el.href = a.url
      el.download = a.name
      document.body.appendChild(el)
      el.click()
      document.body.removeChild(el)
      return
    }
    toast('该附件无法下载')
  } catch (e) {
    console.warn('[Attachment] download failed:', e)
    toast('下载失败')
  }
}

// v13: 通用确认 Modal —— 替换原生 confirm，返回 Promise<boolean>
interface ConfirmDialogOpts { title: string; desc?: string; kind?: 'danger' | 'info'; okText?: string; cancelText?: string }
const confirmDialog = ref<ConfirmDialogOpts | null>(null)
let _confirmResolver: ((v: boolean) => void) | null = null
function askConfirm(opts: ConfirmDialogOpts): Promise<boolean> {
  confirmDialog.value = opts
  return new Promise((resolve) => { _confirmResolver = resolve })
}
function resolveConfirm() { _confirmResolver?.(true); _confirmResolver = null; confirmDialog.value = null }
function cancelConfirm() { _confirmResolver?.(false); _confirmResolver = null; confirmDialog.value = null }

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
// v10: 代码块加"星光 + 火苗"装饰层（CSS-only 动画，不影响选择/复制），
// 装饰元素都带 aria-hidden 和 pointer-events:none，不会干扰可访问性
const SANDBOX_LANGS = new Set(['html','javascript','js','jsx','typescript','ts','tsx','python','py','css'])
mdRenderer.code = function({ text, lang }: { text:string; lang?:string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const hi = hljs.highlight(text, { language }).value
  const encoded = encodeURIComponent(text)
  const decorationLayer = `<span class="cb-fx" aria-hidden="true">` +
    `<span class="cb-star s1"></span><span class="cb-star s2"></span><span class="cb-star s3"></span>` +
    `<span class="cb-star s4"></span><span class="cb-star s5"></span><span class="cb-star s6"></span>` +
    `<span class="cb-ember e1"></span><span class="cb-ember e2"></span><span class="cb-ember e3"></span>` +
    `<span class="cb-ember e4"></span>` +
  `</span>`
  const downloadBtn = `<button class="cb-dl" data-download-lang="${language}" data-download-text="${encoded}" title="下载为源码文件">⬇</button>`
  const runBtn = SANDBOX_LANGS.has(language) ? `<button class="cb-run" data-run-lang="${language}" data-run-text="${encoded}" title="在沙盒中运行">▶ 运行</button>` : ''
  return `<div class="codeblock">${decorationLayer}<div class="cb-head"><span class="cb-lang">${language}</span><span class="cb-actions">${runBtn}${downloadBtn}<button class="cb-copy" data-copy-text="${encoded}">复制</button></span></div><pre><code class="hljs language-${language}">${hi}</code></pre></div>`
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

/** v11: 规范化 Markdown —— 在送入 marked 前修复模型常见的格式错误 */
function normalizeMd(text: string): string {
  if (!text) return text
  let out = text
  // 1) `** abc **` → `**abc**`（去掉星号紧邻的内空格，避免 marked 不识别）
  out = out.replace(/\*\*\s+([^*\n][^*]*?)\s+\*\*/g, '**$1**')
  // 2) `* abc *` → `*abc*`（同上，斜体）
  out = out.replace(/(?<!\*)\*\s+([^*\n][^*]*?)\s+\*(?!\*)/g, '*$1*')
  // 3) 整行只有 `**`（孤立的开/闭标记）→ 删除
  out = out.replace(/(^|\n)\s*\*\*\s*(?=\n|$)/g, '$1')
  // 4) 行末游离 `**`：常见模型错误「- 标题文本 **\n答案文本」
  //    检测「文本 + 空格 + ** + 行尾」，且本行 `**` 数为奇数 → 删除该游离 `**`
  out = out.split('\n').map((line) => {
    const starPairs = (line.match(/\*\*/g) || []).length
    if (starPairs % 2 === 1) {
      // 优先删除行末紧贴空格的 `**`（最常见错误模式）
      const trailing = line.replace(/(\S) +\*\*\s*$/, '$1')
      if (trailing !== line) return trailing
      // 再删行首孤立的 `** `（前后无配对）
      const leading = line.replace(/^\*\*\s+/, '')
      if (leading !== line && (leading.match(/\*\*/g) || []).length % 2 === 0) return leading
    }
    return line
  }).join('\n')
  // 5) 中英文紧贴 ** 自动补空格（保持中文文本与西文加粗的视觉间距）
  out = out.replace(/([\u4e00-\u9fa5\uFF00-\uFFEF0-9A-Za-z])\*\*([^*\n]+?)\*\*(?=[\u4e00-\u9fa5\uFF00-\uFFEF0-9A-Za-z])/g, '$1 **$2** ')
  // 6) 全文 `**` 数量为奇数 → 移除最末一个游离 `**`，避免污染后续渲染
  const boldPairs = (out.match(/\*\*/g) || []).length
  if (boldPairs % 2 === 1) {
    out = out.replace(/\*\*([^*]*?)$/, '$1')
  }
  // 7) 全文 `*`（仅单星）数量为奇数 → 同上
  const singleStarCount = (out.replace(/\*\*/g, '').match(/(?<!\\)\*/g) || []).length
  if (singleStarCount % 2 === 1) out = out.replace(/\*([^*]*)$/, '$1')
  return out
}

/**
 * v12: Unicode 上下标自动 LaTeX 化 ——
 * 把模型输出的 `a²+b²=c²`、`x³-1=0` 这种纯 Unicode 数学表达式
 * 自动包成 `$$...$$` 让 KaTeX 接管，渲染出正经的数学公式。
 *
 * 安全策略：只对「整行包含 Unicode 上标/下标 + 等号或运算符」的行做包裹，
 * 普通文本里偶尔出现的「第n²次方」之类不会被误伤。
 */
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
  'ⁿ': 'n', 'ⁱ': 'i',
}
const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
}
const SUPER_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/
const SUB_RE = /[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/
function autoLatexify(text: string): string {
  if (!text) return text
  if (!SUPER_RE.test(text) && !SUB_RE.test(text)) return text
  const lines = text.split('\n')
  return lines.map((line) => {
    if (/\$.+?\$/.test(line)) return line
    if (/^\s*(?:>|#|-|\*|\d+\.|```)/.test(line)) {
      // 列表/标题/引用/代码块行：仅做内联上下标转换，不强制包 $$（避免破坏列表布局）
      return line.replace(/([a-zA-Z0-9\)\]\}])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)/g, (_, base, sup) => {
        const expr = (sup as string).split('').map((c) => SUPERSCRIPT_MAP[c] || c).join('')
        return `$${base}^{${expr}}$`
      }).replace(/([a-zA-Z\)\]\}])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (_, base, sub) => {
        const expr = (sub as string).split('').map((c) => SUBSCRIPT_MAP[c] || c).join('')
        return `$${base}_{${expr}}$`
      })
    }
    const hasMath = (SUPER_RE.test(line) || SUB_RE.test(line)) && /[=+\-×÷*/^]/.test(line)
    if (!hasMath) return line
    let expr = line.trim()
    expr = expr.replace(/([a-zA-Z0-9\)\]\}])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)/g, (_, base, sup) => {
      const e = (sup as string).split('').map((c) => SUPERSCRIPT_MAP[c] || c).join('')
      return `${base}^{${e}}`
    })
    expr = expr.replace(/([a-zA-Z\)\]\}])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (_, base, sub) => {
      const e = (sub as string).split('').map((c) => SUBSCRIPT_MAP[c] || c).join('')
      return `${base}_{${e}}`
    })
    expr = expr.replace(/×/g, '\\times ').replace(/÷/g, '\\div ')
    return `$$${expr}$$`
  }).join('\n')
}

function renderMd(content: string): string {
  if (!content) return ''
  let c = content.replace(/```spark-action\s*\n[\s\S]*?```/g, '').trim()
  if (!c) return ''
  try {
    const codeBlocks: string[] = []
    c = c.replace(/```[\s\S]*?```/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    c = c.replace(/`[^`]+`/g, match => { codeBlocks.push(match); return `__CODE_BLOCK_${codeBlocks.length - 1}__` })
    // v11: 先 normalize 粗体/斜体格式错误，
    // v12: 再把 Unicode 上下标的纯文本数学表达式自动包成 $$...$$ 让 KaTeX 接管，
    //      然后再走 LaTeX 渲染，最后还原代码块
    c = normalizeMd(c)
    c = autoLatexify(c)
    c = renderLatex(c)
    c = c.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)])
    const html = marked.parse(c) as string
    return DOMPurify.sanitize(html, { ADD_TAGS: ['button','span'], ADD_ATTR: ['class','style','data-path','data-copy-text','data-latex','title','aria-hidden'] })
  } catch { return DOMPurify.sanitize(content.replace(/\n/g, '<br>')) }
}

// v13: 代码语言 → 文件扩展名映射（主流语言全覆盖，非主流回落到 .txt）
const CODE_LANG_EXT: Record<string, string> = {
  python: 'py', py: 'py',
  javascript: 'js', js: 'js', jsx: 'jsx',
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  java: 'java', kotlin: 'kt', kt: 'kt', scala: 'scala',
  c: 'c', cpp: 'cpp', 'c++': 'cpp', cxx: 'cpp', objectivec: 'm', 'objective-c': 'm',
  csharp: 'cs', cs: 'cs',
  go: 'go', rust: 'rs', rs: 'rs',
  php: 'php', ruby: 'rb', rb: 'rb', perl: 'pl',
  swift: 'swift', dart: 'dart',
  html: 'html', xml: 'xml', svg: 'svg', yaml: 'yaml', yml: 'yml', toml: 'toml', ini: 'ini',
  css: 'css', scss: 'scss', less: 'less', stylus: 'styl',
  vue: 'vue', svelte: 'svelte',
  sql: 'sql', shell: 'sh', bash: 'sh', sh: 'sh', zsh: 'sh', ps1: 'ps1', powershell: 'ps1',
  json: 'json', markdown: 'md', md: 'md', tex: 'tex',
  dockerfile: 'Dockerfile', makefile: 'Makefile', cmake: 'cmake',
  r: 'R', matlab: 'm', julia: 'jl', lua: 'lua',
  'plaintext': 'txt', text: 'txt',
}
function langToExt(lang: string): string {
  const l = (lang || '').toLowerCase()
  return CODE_LANG_EXT[l] || 'txt'
}
function handleCodeDownload(lang: string, text: string) {
  const ext = langToExt(lang)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const base = ext === 'Dockerfile' || ext === 'Makefile' ? ext : `spark-snippet-${stamp}.${ext}`
  // 源码文件不加 BOM，避免污染可执行文件（Java/Python 编译器会报错）。
  // .md/.txt/.json 这类纯文本通过上面的 textBlobWithBom 单独处理，这里只管源码。
  triggerBlobDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), base)
  toast(`✓ 已下载 .${ext === 'Dockerfile' || ext === 'Makefile' ? ext : ext} 文件`)
}

// 点击导航链接
function handleMdClick(e: Event) {
  const element = e.target as HTMLElement
  // 代码沙盒运行按钮
  const runBtn = element.closest('.cb-run') as HTMLElement | null
  if (runBtn?.dataset?.runText) {
    e.preventDefault()
    const lang = runBtn.dataset.runLang || 'html'
    openSandbox(lang, decodeURIComponent(runBtn.dataset.runText))
    return
  }
  // v13: 代码块下载按钮
  const dlBtn = element.closest('.cb-dl') as HTMLElement | null
  if (dlBtn?.dataset?.downloadText) {
    e.preventDefault()
    const lang = dlBtn.dataset.downloadLang || 'plaintext'
    handleCodeDownload(lang, decodeURIComponent(dlBtn.dataset.downloadText))
    return
  }
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

// v13: 统一在这里把附件注释（<!--attachment ...-->）+ 紧随其后的文件信息段 + 文本代码块过滤掉，
// 让用户自己的气泡只显示"我说的话"，附件信息通过 file-cards 单独渲染。
function stripAttachmentBlocks(text: string): string {
  if (!text) return text
  return text
    // 1) 文本文件：<!--attachment--> + 说明行 + 代码块，整段删除
    .replace(/\n\n<!--attachment[^>]*-->[\s\S]*?```\s*\n?/g, '\n\n')
    // 2) 图片 / 二进制文件：<!--attachment--> + 说明行（到下一个空行或末尾），整段删除
    .replace(/\n\n<!--attachment[^>]*-->\s*\n.*?(?=\n\n|$)/g, '')
    // 3) 老版本消息兼容（回填前的旧格式 📎/🖼️/📄）
    .replace(/\n\n(📄|📎|🖼️)\s*(?:\*\*)?[^\n]+?(?:\*\*)?\n(?:[^\n]*\n)?(?:```[\s\S]*?```)?/g, '')
    .trim()
}

const displayMsgs = computed(() => {
  // v13 T9：occupying assistant 消息已由 sendMessage 直接 push 到 conversation.messages，
  //        不再需要在这里手动追加临时气泡，所有内容都从 conversation 里读。
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  return (conv?.messages.filter(m => m.role !== 'system') || []).map(m => ({
    ...m, displayContent: stripAttachmentBlocks(m.content) || m.content,
  }))
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

// 上下文窗口使用率（v13: 与 useSparkAI.CONTEXT_WINDOW=200 对齐；超过 120 触发后台摘要）
const contextUsage = computed(() => {
  const conv = conversations.value.find((c) => c.id === currentConversationId.value)
  if (!conv) return { used: 0, limit: 200, ratio: 0 }
  const used = conv.messages.filter((m) => m.role !== 'system').length
  const limit = 200
  return { used, limit, ratio: Math.min(1, used / limit) }
})

async function handleSend() {
  // v9: 离线守护
  if (!isOnline.value) { toast('当前无网络连接，请稍后重试'); return }

  // v9: emoji 短码扩展
  const raw = inputText.value.trim()
  const text = expandShortcodes(raw)
  // 仅当「当前会话」正在流式生成时禁止再发；其它会话可并行请求，互不中止
  if ((!text && !pendingFiles.value.length) || streamingInCurrentView.value) return

  // v9: 文件大小硬限制（单文件 5MB，附件总数 5 个）
  const OVERSIZE = pendingFiles.value.find((f) => f.size && /([0-9.]+)\s*MB/.test(f.size) && parseFloat(f.size) > 5)
  if (OVERSIZE) { toast('文件不能超过 5 MB：' + OVERSIZE.name); return }
  if (pendingFiles.value.length > 5) { toast('单次最多附带 5 个文件'); return }

  const atts = [...pendingFiles.value]; inputText.value=''; streamingContent.value=''; thinkingText.value=''; actionCards.value=[]; pendingFiles.value=[]
  showEmoji.value = false
  if (inputRef.value) inputRef.value.style.height='auto'
  if (!currentConversationId.value) createConversation()

  // ★ 立即把用户消息推入对话并落盘 —— 让 UI 第一时间显示气泡，
  //    不被后续 RAG 检索 / 缓存查询 / 网络请求阻塞。
  pushUserMessageImmediately(text, atts.length ? atts : undefined)
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
  // v13: 工作流 systemHint —— 一次性附加到本条消息的 extraContext 头部，不持久
  if (activeWorkflow.value?.systemHint) {
    const wfHint = `## 工作流上下文：${activeWorkflow.value.label}\n${activeWorkflow.value.systemHint}`
    extraContext = extraContext ? `${wfHint}\n\n${extraContext}` : wfHint
    // 发送后清空，避免下一轮继续带着这段 hint
    setTimeout(() => { activeWorkflow.value = null }, 50)
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
      cacheHitCount.value++
      // v13 T9：先 push 一条 pending assistant 占位，再用 replayCachedStream 流式更新它的 content
      const placeholderId = 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const placeholder = {
        id: placeholderId,
        createdAt: new Date().toISOString(),
        role: 'assistant' as const,
        content: '',
        reasoning: hit.reasoning,
        pending: true,
        fromCache: true,
      }
      conv.messages.push(placeholder)
      conv.updatedAt = placeholder.createdAt
      await replayCachedStream(hit, (chunk) => {
        placeholder.content = chunk
        scrollBot()
      }, { onThinking: (t) => { placeholder.reasoning = t } })
      placeholder.content = hit.content
      placeholder.pending = false
      conv.updatedAt = new Date().toISOString()
      // pushUserMessageImmediately 已置 isStreaming=true，缓存命中分支不会进入 sendMessage 的 finally，需手动清理
      resetStreamingState()
      toast(`✨ 命中缓存（已节省 ${cacheHitCount.value} 次 API 调用）`)
      return
    }
  }

  // 记录本次请求用于命中后写缓存
  let rawAnswerForCache = ''
  let rawReasoningForCache = ''
  const convAtSend = currentConversationId.value
  await sendMessage(text,
    (_t) => {
      // v13 T9：消息已直接写入 conversation.messages，无需用 streamingContent。
      // 只在用户仍停留在本会话时触发滚动，切走了就不要打扰。
      if (currentConversationId.value === convAtSend) scrollBot()
    },
    (ct, acts, reasoning) => {
      rawAnswerForCache = ct
      rawReasoningForCache = reasoning
      if (acts.length) actionCards.value = acts.map(a => ({ icon: a.action==='add_schedule'?'📅':a.action==='create_goal'?'🎯':'🔗', label: a.action==='add_schedule'?'同步日程':a.action==='create_goal'?'创建规划':'跳转', desc: String(a.data.title||a.data.label||a.data.path||''), action:a, done:false }))
      if (currentConversationId.value === convAtSend) scrollBot()
      if (canCache && rawAnswerForCache) {
        const conv = getCurrentConversation()
        const recent = conv.messages.slice(-7).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
        const fp = fingerprintContext(recent.slice(0, -1))
        writeCache({ prompt: text, mode: currentModel.value, content: rawAnswerForCache, reasoning: rawReasoningForCache, contextFingerprint: fp })
      }
    },
    () => { /* error 已通过 aiError 暴露 */ },
    (_t) => { if (currentConversationId.value === convAtSend) scrollBot() },
    atts.length ? atts : undefined,
    extraContext || undefined,
    true,
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
  if (streamingInCurrentView.value) return
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
  if (streamingInCurrentView.value) return
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
// v13: 录音期 "已最终化文本 + 当前临时转写" 分离展示
const voiceFinalized = ref('')
const voiceInterim = ref('')
// v13: 停止后的可编辑预览条
const voicePreviewActive = ref(false)
const voicePreviewText = ref('')
const voicePreviewMeta = ref('')
let recognition: any = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let mediaStream: MediaStream | null = null
let waveAnimId = 0
let recStartTime = 0
let recTimer: ReturnType<typeof setInterval> | null = null

/**
 * v13: 智能断句 / 标点补齐。
 * - 按停顿（连续相同音、语气词、长句截断）在合适位置插入中文逗号/句号。
 * - 对常见语气词（吧/吗/呢/啊/哈）后补问号或句号。
 * - 不引入任何 NLP 依赖，纯规则，性能与可控性优先。
 */
function polishTranscript(text: string): string {
  if (!text) return text
  let out = text.trim()
    // 统一空格
    .replace(/\s+/g, ' ')
    // 英文标点 → 中文
    .replace(/,/g, '，').replace(/;/g, '；').replace(/\?/g, '？').replace(/!/g, '！')
  // 去掉已有句末标点再统一加
  const tail = /[。？！,，！？]\s*$/
  // 常见语气词转问号
  out = out.replace(/(吗|呢|吧|哈)(?=[^？！。]*$)/g, '$1？')
  // 在 "然后/接着/另外/所以/但是/不过/因此/而且/还有" 前补中文逗号
  out = out.replace(/([^，。；！？\s])(然后|接着|另外|所以|但是|不过|因此|而且|还有|首先|其次|最后)/g, '$1，$2')
  // 长句（>25 中文字符无标点）每 ~20 字在语气顿点处补逗号
  out = out.replace(/([\u4e00-\u9fa5]{18,30})(的|是|了|吧|啊|呀)([\u4e00-\u9fa5])/g, '$1$2，$3')
  // 结尾加句号
  if (!tail.test(out)) {
    // 疑问词扫尾 → 问号
    if (/(什么|为什么|怎么|如何|哪|是否|吗|呢)[^。？！]*$/.test(out)) out += '？'
    else out += '。'
  }
  // 合并多余逗号
  out = out.replace(/，+/g, '，').replace(/，([。？！])/g, '$1')
  return out
}

function onVoicePreviewInput() {
  voicePreviewMeta.value = `字数 ${voicePreviewText.value.length}`
}
function copyVoicePreview() {
  if (!voicePreviewText.value.trim()) return
  navigator.clipboard.writeText(voicePreviewText.value)
  toast('已复制识别文本')
}
function polishVoicePreview() {
  voicePreviewText.value = polishTranscript(voicePreviewText.value)
  voicePreviewMeta.value = `字数 ${voicePreviewText.value.length} · 已智能断句`
}
function confirmVoicePreview() {
  const t = voicePreviewText.value.trim()
  voicePreviewActive.value = false
  if (!t) return
  inputText.value = t
  nextTick(() => handleSend())
}
async function restartVoice() {
  voicePreviewActive.value = false
  voicePreviewText.value = ''
  voicePreviewMeta.value = ''
  await nextTick()
  toggleVoice()
}

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

  voiceFinalized.value = ''
  voiceInterim.value = ''
  // 关闭预览条（如果存在），开启新一轮录音
  voicePreviewActive.value = false

  recognition.onresult = (e: any) => {
    // v13: 与 "voiceFinalized + voiceInterim" 分开维护，
    //      让 UI 同时展示已定稿文本 + 正在识别的灰色浮动段，
    //      用户能实时看到引擎的思考，不用等"完成"才揭晓。
    let finals = ''
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      const result = e.results[i]
      if (result.isFinal) finals += result[0].transcript
      else interim += result[0].transcript
    }
    // 累加 finals 到历史（引擎每 start 后 e.results 都是从 0 开始的，
    // continuous 模式下引擎内部会缓存，这里直接替换为当前累计即可）
    voiceFinalized.value = finals
    voiceInterim.value = interim
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
      // 如果用户还在录音，引擎自动关掉也要重启
      try { recognition.start() } catch { cleanupVoice() }
    }
  }

  try { recognition.start() } catch {
    toast('语音识别启动失败，请确保使用 Chrome/Edge 并允许麦克风')
    cleanupVoice()
    return
  }

  isRec.value = true
  recStartTime = Date.now()
  recDuration.value = '0.0'
  recTimer = setInterval(() => {
    recDuration.value = ((Date.now() - recStartTime) / 1000).toFixed(1)
  }, 100)

  nextTick(() => { drawWaveform() })
}

/**
 * v13: 语音录制结束
 * - 不再直接把识别结果丢给 handleSend
 * - 把最终文本 + interim 合并，智能断句后放进 voicePreviewText
 * - 弹出预览条，由用户确认后再发送
 */
function finishVoice() {
  if (!recognition) { cleanupVoice(); return }
  let handled = false
  const duration = recDuration.value
  const onFinalEnd = () => {
    if (handled) return
    handled = true
    const combined = (voiceFinalized.value + voiceInterim.value).trim()
    cleanupVoice()
    if (!combined) {
      toast('没识别到语音内容，请重试')
      return
    }
    voicePreviewText.value = polishTranscript(combined)
    voicePreviewMeta.value = `录音 ${duration}s · 字数 ${voicePreviewText.value.length} · 已智能断句`
    voicePreviewActive.value = true
    nextTick(() => {
      // 自动聚焦并把光标放到末尾，方便立刻修改
      const ta = document.querySelector<HTMLTextAreaElement>('.vp-text')
      ta?.focus()
      try { ta?.setSelectionRange(voicePreviewText.value.length, voicePreviewText.value.length) } catch { /* ignore */ }
    })
  }
  recognition.onend = onFinalEnd
  try { recognition.stop() } catch { /* ignore */ }
  setTimeout(onFinalEnd, 500)
}

/** v13: 完全取消录音 —— 不生成预览条，直接回到输入状态 */
function cancelVoice() {
  try { recognition?.stop() } catch { /* ignore */ }
  cleanupVoice()
  voiceFinalized.value = ''
  voiceInterim.value = ''
  voicePreviewActive.value = false
  voicePreviewText.value = ''
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
  // v13 T9：新建对话不再中断已有流式。原会话继续后台输出。
  createConversation()
  sidebarOpen.value = false
  actionCards.value = []
  nextTick(() => { inputRef.value?.focus() })
}
function handleSwitch(id: string) {
  // v13 T9：切换到其它会话时 **不再** 中断正在进行的流式输出。
  //   原正在生成的会话继续在后台写入 conversation.messages，用户切回时会看到最新内容。
  //   只有当用户切换到"正在流式的那个会话自身"时，才正常显示 pending 气泡的 UI 效果。
  switchConversation(id)
  actionCards.value = []
  sidebarOpen.value = false
  openMenuId.value = null
  nextTick(scrollBot)
}
async function handleDelete(id: string) {
  openMenuId.value = null
  const conv = conversations.value.find((c) => c.id === id)
  const ok = await askConfirm({
    title: '删除这条会话？',
    desc: conv ? `"${conv.title}" 将被永久移除，该会话中的 ${conv.messages.filter(m => m.role !== 'system').length} 条消息不可恢复。` : '该会话不可恢复。',
    kind: 'danger',
    okText: '删除',
    cancelText: '保留',
  })
  if (!ok) return
  deleteConversation(id)
  toast('✓ 已删除')
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
  if (msgExportOpen.value !== -1 && !el.closest('.msg-export-menu') && !el.closest('.msg-export-btn')) msgExportOpen.value = -1
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

/**
 * v13: 通用二进制文件下载辅助。
 * - 文本类型默认加 UTF-8 BOM（0xEF 0xBB 0xBF），修复 Windows 记事本 / Typora 早期版本
 *   打开中文 Markdown 乱码 + "导出文件损坏"错觉。
 * - 二进制类型（blob already typed）原样写入。
 */
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
/** 显式 UTF-8 字节 + BOM，避免部分环境把 Blob 字符串按系统默认编码写入导致中文乱码 */
function textBlobWithBom(text: string, mime: string): Blob {
  const enc = new TextEncoder()
  const body = enc.encode(text)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const out = new Uint8Array(bom.length + body.length)
  out.set(bom, 0)
  out.set(body, bom.length)
  return new Blob([out], { type: `${mime};charset=utf-8` })
}

type ExportFormat = 'markdown' | 'json' | 'html' | 'pdf' | 'word' | 'txt'

/** 导出用 HTML 标题转义，避免 & / < 破坏文档结构 */
function escapeHtmlAttr(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把纯 Markdown 转成自带样式的完整 HTML 文档（用于 html / word / pdf 导出） */
function mdToStandaloneHtml(title: string, md: string): string {
  let bodyHtml = ''
  try {
    // 不走 renderMd（它会引入 KaTeX/hljs DOM，离线打开样式就丢了），
    // 这里用 marked 直接把 md 渲染为 html，再内联最小样式。
    bodyHtml = marked.parse(md, { async: false, gfm: true, breaks: true }) as string
  } catch {
    bodyHtml = `<pre>${md.replace(/</g, '&lt;')}</pre>`
  }
  const now = new Date().toLocaleString('zh-CN')
  const safeTitle = escapeHtmlAttr(title)
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle}</title><style>
*{box-sizing:border-box;}
body{font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif,"Segoe UI Emoji";line-height:1.75;color:#222;background:#fff;max-width:900px;margin:30px auto;padding:0 24px;word-wrap:break-word;overflow-wrap:anywhere;}
p,li,blockquote,td,th{line-height:1.75;min-height:1.4em;}
h1,h2,h3{margin:1.2em 0 .5em;color:#111;} h1{border-bottom:2px solid #8b5cf6;padding-bottom:8px;}
code{background:#f3f0ff;color:#5b21b6;padding:1px 6px;border-radius:4px;font-size:.92em;}
pre{background:#1e1b3a;color:#e8e9ff;padding:14px 18px;border-radius:8px;overflow-x:auto;font-size:13px;white-space:pre-wrap;word-break:break-word;}
pre code{background:transparent;color:inherit;padding:0;white-space:pre-wrap;}
blockquote{border-left:4px solid #c4b5fd;background:#f8f6ff;margin:12px 0;padding:6px 14px;color:#4b3c82;}
table{border-collapse:collapse;width:100%;margin:12px 0;table-layout:fixed;} th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;word-break:break-word;} th{background:#f3f0ff;}
hr{border:none;border-top:1px dashed #c4b5fd;margin:18px 0;}
a{color:#7c3aed;}
details{display:block;margin:12px 0;padding:10px 14px;border:1px solid #e5e0ff;border-radius:8px;background:#faf9ff;}
summary{cursor:pointer;font-weight:600;margin-bottom:8px;}
.export-footer{margin-top:40px;font-size:11px;color:#888;text-align:center;clear:both;}
@media print{
body{margin:12pt;max-width:100%;padding:0 12pt;}
pre{page-break-inside:avoid;overflow:visible!important;}
h1,h2,h3{page-break-after:avoid;}
}
</style></head><body>${bodyHtml}<div class="export-footer">导出自 星火助手 · ${now}</div></body></html>`
}

async function exportPdfViaPrint(_title: string, html: string) {
  // 用 UTF-8 字节 + Blob URL 加载 iframe，避免 doc.write 在部分浏览器下错误解码中文 → 打印/PDF 乱码
  const blob = new Blob([new TextEncoder().encode(html)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  try {
    await new Promise<void>((resolve, reject) => {
      frame.addEventListener('load', () => resolve(), { once: true })
      frame.addEventListener('error', () => reject(new Error('iframe load')), { once: true })
      frame.src = url
    })
  } catch {
    toast('浏览器不支持 PDF 打印')
    URL.revokeObjectURL(url)
    try { document.body.removeChild(frame) } catch { /* ignore */ }
    return
  }
  await new Promise((r) => setTimeout(r, 280))
  try {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    toast('已唤起系统打印 → 选择"另存为 PDF"')
  } catch (e) {
    console.warn('[Export] PDF print failed:', e)
    toast('PDF 打印失败，请尝试 HTML / Word 格式')
  } finally {
    setTimeout(() => {
      try { document.body.removeChild(frame) } catch { /* ignore */ }
      URL.revokeObjectURL(url)
    }, 3000)
  }
}

/** 使用 html2pdf.js 直接下载 PDF（失败则回退到系统打印） */
async function exportPdfDownloadFile(html: string, filename: string) {
  const blob = new Blob([new TextEncoder().encode(html)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;min-height:200px;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const mod = await import('html2pdf.js')
  const html2pdf = mod.default ?? mod
  try {
    await new Promise<void>((resolve, reject) => {
      frame.addEventListener('load', () => resolve(), { once: true })
      frame.addEventListener('error', () => reject(new Error('iframe load')), { once: true })
      frame.src = url
    })
    const body = frame.contentDocument?.body
    if (!body) throw new Error('no body')
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(body)
      .save()
    toast('✓ 已下载 PDF')
  } catch (e) {
    console.warn('[Export] html2pdf failed, fallback print', e)
    toast('PDF 直出失败，改用打印对话框…')
    await exportPdfViaPrint('', html)
  } finally {
    try { document.body.removeChild(frame) } catch { /* ignore */ }
    URL.revokeObjectURL(url)
  }
}

// v13: 导出会话 → 触发浏览器下载，支持 markdown/json/html/pdf/word/txt
async function triggerExport(id: string, format: ExportFormat) {
  openMenuId.value = null
  if (format === 'markdown' || format === 'json') {
    const out = exportConversation(id, format)
    if (!out) { toast('导出失败'); return }
    const blob = format === 'markdown'
      ? textBlobWithBom(out.content, out.mime)
      : new Blob([new TextEncoder().encode(out.content)], { type: `${out.mime};charset=utf-8` })
    triggerBlobDownload(blob, out.filename)
    toast(`✓ 已导出 ${format === 'markdown' ? 'Markdown' : 'JSON'}`)
    return
  }

  const mdOut = exportConversation(id, 'markdown')
  if (!mdOut) { toast('导出失败'); return }
  const conv = conversations.value.find((c) => c.id === id)
  const safeTitle = (conv?.title || 'conversation').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
  const stamp = new Date().toISOString().slice(0, 10)

  if (format === 'txt') {
    triggerBlobDownload(textBlobWithBom(mdOut.content, 'text/plain'), `spark-${safeTitle}-${stamp}.txt`)
    toast('✓ 已导出 TXT')
    return
  }
  if (format === 'html') {
    const html = mdToStandaloneHtml(`星火助手 · ${safeTitle}`, mdOut.content)
    triggerBlobDownload(textBlobWithBom(html, 'text/html'), `spark-${safeTitle}-${stamp}.html`)
    toast('✓ 已导出 HTML')
    return
  }
  if (format === 'word') {
    // Word 兼容的 HTML 文档（保存为 .doc 后 Word / WPS / LibreOffice 可直接打开）
    const html = mdToStandaloneHtml(`星火助手 · ${safeTitle}`, mdOut.content)
    const wordWrap = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '')}</html>`
    triggerBlobDownload(textBlobWithBom(wordWrap, 'application/msword'), `spark-${safeTitle}-${stamp}.doc`)
    toast('✓ 已导出 Word（.doc）')
    return
  }
  if (format === 'pdf') {
    const html = mdToStandaloneHtml(`星火助手 · ${safeTitle}`, mdOut.content)
    await exportPdfDownloadFile(html, `spark-${safeTitle}-${stamp}.pdf`)
    return
  }
}

// v13: 单条消息导出（仅 assistant/user 可用）
async function exportSingleMessage(displayIdx: number, format: ExportFormat) {
  const conv = getCurrentConversation()
  const realIdx = mapDisplayIdxToReal(displayIdx)
  if (realIdx < 0) { toast('消息不存在'); return }
  const msg = conv.messages[realIdx]
  if (!msg) return
  const role = msg.role === 'user' ? '我' : '星火助手'
  const head = `# ${role}：${msg.content.slice(0, 24).replace(/\n/g, ' ')}\n\n> 导出自「${conv.title}」· ${new Date(msg.createdAt || conv.updatedAt).toLocaleString('zh-CN')}\n\n`
  const body = msg.reasoning
    ? `<details><summary>💭 思考过程</summary>\n\n${msg.reasoning}\n\n</details>\n\n${msg.content}`
    : msg.content
  const md = head + body
  const safeTitle = (msg.content.slice(0, 24) || 'message').replace(/[\\/:*?"<>|]/g, '_')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  if (format === 'markdown') {
    triggerBlobDownload(textBlobWithBom(md, 'text/markdown'), `spark-msg-${safeTitle}-${stamp}.md`)
    toast('✓ 已导出本条为 Markdown')
    return
  }
  if (format === 'txt') {
    triggerBlobDownload(textBlobWithBom(md, 'text/plain'), `spark-msg-${safeTitle}-${stamp}.txt`)
    toast('✓ 已导出本条为 TXT')
    return
  }
  if (format === 'json') {
    triggerBlobDownload(new Blob([new TextEncoder().encode(JSON.stringify(msg, null, 2))], { type: 'application/json;charset=utf-8' }), `spark-msg-${safeTitle}-${stamp}.json`)
    toast('✓ 已导出本条为 JSON')
    return
  }
  if (format === 'html' || format === 'word' || format === 'pdf') {
    const html = mdToStandaloneHtml(`${role} · ${safeTitle}`, md)
    if (format === 'pdf') { await exportPdfDownloadFile(html, `spark-msg-${safeTitle}-${stamp}.pdf`); return }
    const isWord = format === 'word'
    const mime = isWord ? 'application/msword' : 'text/html'
    const ext = isWord ? 'doc' : 'html'
    const wrap = isWord
      ? `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '')}</html>`
      : html
    triggerBlobDownload(textBlobWithBom(wrap, mime), `spark-msg-${safeTitle}-${stamp}.${ext}`)
    toast(`✓ 已导出本条为 ${isWord ? 'Word（.doc）' : 'HTML'}`)
  }
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

// 当前激活的工作流（影响下一次发送的 systemHint / 推荐模型 / 能力高亮）
const activeWorkflow = ref<(typeof WORKFLOW_PRESETS)[number] | null>(null)
const expandedWorkflow = ref<string | null>(null)

function formatWorkflowPrompt(prompt: string): string {
  return prompt.replace(/\{\{cursor\}\}/g, '\u2B1C 在此填写...')
}

function handleWorkflowClick(preset: (typeof WORKFLOW_PRESETS)[number]) {
  if (expandedWorkflow.value === preset.key) {
    applyWorkflow(preset)
  } else {
    expandedWorkflow.value = preset.key
  }
}

function applyWorkflow(preset: (typeof WORKFLOW_PRESETS)[number]) {
  // 1) 替换 {{cursor}} 占位符为空字符串，记录光标位置
  const rawTpl = preset.prompt
  const cursorMarker = '{{cursor}}'
  const cursorAt = rawTpl.indexOf(cursorMarker)
  const tpl = cursorAt >= 0 ? rawTpl.replace(cursorMarker, '') : rawTpl
  inputText.value = tpl
  expandedWorkflow.value = null
  showWorkflow.value = false

  // 2) 推荐模型自动切换（如与当前不同）
  if (preset.suggestedModel && currentModel.value !== preset.suggestedModel) {
    switchModel(preset.suggestedModel as ModelMode)
  }

  // 3) 记录激活的 workflow（发送时会把 systemHint 注入到 extraContext）
  activeWorkflow.value = preset
  const abilityHint = preset.suggestedAbilities?.length
    ? `已联动：${preset.suggestedAbilities.map(k => ABILITY_TOOLS.find(a => a.key === k)?.label || k).join(' · ')}`
    : ''
  toast(`🚀 ${preset.label} · 模式 ${MODEL_OPTIONS[currentModel.value].label}${abilityHint ? ' · ' + abilityHint : ''}`)
  if (preset.acceptsFiles) {
    // 提示性 toast 延迟触发，不遮挡主提示
    setTimeout(() => toast('📎 可直接把文件拖进输入框一起发送'), 1700)
  }

  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    el.focus()
    autoResize()
    const fallback = tpl.indexOf('\n\n')
    const pos = cursorAt >= 0 ? cursorAt : (fallback >= 0 ? fallback + 2 : tpl.length)
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

// v11: 主动触发一次记忆压缩（上下文快满时可点击）
async function handleSummarizeNow() {
  if (summarizing.value) { toast('正在压缩，请稍候…'); return }
  if (contextUsage.value.used < 20) { toast(`当前仅 ${contextUsage.value.used} 条消息，暂不需要压缩`); return }
  toast('⏳ 正在把早期对话压缩为记忆摘要…')
  const ok = await summarizeCurrentConversation()
  if (ok) toast('✓ 已压缩，只保留最近几条对话 + 历史摘要')
  else toast('⚠️ 压缩失败或暂不需要，稍后再试')
}

// v11: 新开对话并继承记忆（把当前会话摘要成 system 前缀，新会话"还记得之前"）
async function handleInheritMemory() {
  if (summarizing.value) { toast('正在处理，请稍候…'); return }
  if (streamingInCurrentView.value) { toast('请先等当前回复结束'); return }
  toast('🧠 正在把当前会话压缩成记忆摘要…')
  const newConv = await inheritMemoryToNewConversation()
  if (newConv) {
    streamingContent.value = ''
    thinkingText.value = ''
    actionCards.value = []
    sidebarOpen.value = false
    nextTick(() => { inputRef.value?.focus(); scrollBot() })
    toast('✓ 已开新对话，记忆已继承')
  } else {
    toast('继承失败，请重试')
  }
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
/* v12: 数学公式块 —— 居中显示、内敛背景、轻量边框 */
.md-body :deep(.katex-display) {
  margin:14px 0;
  padding:12px 18px;
  background:linear-gradient(135deg, rgba(139,92,246,.04) 0%, rgba(59,130,246,.02) 100%);
  border-radius:10px;
  border:1px solid rgba(139,92,246,.08);
  overflow-x:auto;
  text-align:center;
  display:flex;
  justify-content:center;
  align-items:center;
}
.md-body :deep(.katex-display > .katex) { display:inline-block; text-align:center; }
.md-body :deep(.katex) { font-size:1.08em; color:rgba(255,255,255,.92); }
.md-body :deep(.katex .mord),
.md-body :deep(.katex .mbin),
.md-body :deep(.katex .mrel) { color:rgba(255,255,255,.92); }
/* v12: 公式包装器（formula-wrap）—— 一键复制 LaTeX 源码按钮 */
.md-body :deep(.formula-block) { display:block; position:relative; margin:14px 0; }
.md-body :deep(.formula-block .formula-copy) {
  position:absolute; top:8px; right:8px;
  background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.18);
  color:rgba(196,181,253,.7); border-radius:6px;
  padding:2px 7px; font-size:11px; cursor:pointer;
  opacity:0; transition:opacity .2s ease, background .15s ease;
}
.md-body :deep(.formula-block:hover .formula-copy) { opacity:1; }
.md-body :deep(.formula-block .formula-copy:hover) { background:rgba(139,92,246,.22); color:#fff; }
.md-body :deep(.formula-inline) { display:inline-block; position:relative; }
.md-body :deep(.formula-inline .formula-copy) { display:none; }
/* ============ v10: 代码块「星火深空」主题 ============
 * 设计目标：
 *   - 深邃的宇宙星云背景（多层径向渐变，不是纯色）
 *   - 静态星光 + 闪烁星星 + 火苗升空动画（纯 CSS，零 JS 开销）
 *   - 装饰层 pointer-events:none，不干扰代码选择 / 滚动 / 复制
 *   - 代码高亮配色参考 Dracula / Tokyo Night，鲜明且护眼
 */
/* v12: 代码块背景调整 —— 动态但低调，背景更暗、装饰更内敛 */
.md-body :deep(.codeblock) {
  position:relative;
  margin:12px 0;
  border-radius:12px;
  overflow:hidden;
  border:1px solid rgba(139,92,246,.12);
  background:
    radial-gradient(ellipse at 18% 12%, rgba(139,92,246,.07) 0%, transparent 55%),
    radial-gradient(ellipse at 82% 88%, rgba(236,72,153,.04) 0%, transparent 60%),
    linear-gradient(180deg, #060312 0%, #08051a 48%, #07030f 100%);
  box-shadow:
    0 4px 18px rgba(0,0,0,.4),
    inset 0 0 24px rgba(139,92,246,.025),
    inset 0 1px 0 rgba(255,255,255,.025);
}
/* v12: 静态星光降亮（仍可见，但不抢戏） */
.md-body :deep(.codeblock)::before {
  content:'';
  position:absolute; inset:0;
  background-image:
    radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,.22), transparent 2px),
    radial-gradient(1px 1px at 72% 45%, rgba(196,181,253,.20), transparent 2px),
    radial-gradient(1px 1px at 35% 75%, rgba(255,255,255,.16), transparent 2px),
    radial-gradient(1px 1px at 88% 25%, rgba(139,92,246,.18), transparent 2px),
    radial-gradient(1px 1px at 8% 58%, rgba(196,181,253,.14), transparent 2px);
  background-size:100% 100%;
  pointer-events:none;
  opacity:.7;
  z-index:0;
}

/* ============ 装饰层：闪烁星星 + 升空火苗 ============
 * .cb-fx 是 inline span，但 position:absolute 让它脱离文字流
 */
.md-body :deep(.cb-fx) {
  position:absolute; inset:0;
  pointer-events:none;
  overflow:hidden;
  z-index:0;
  display:block;
}
/* 闪烁星星 —— 6 颗，各自不同位置/大小/动画延迟 */
.md-body :deep(.cb-star) {
  position:absolute;
  width:3px; height:3px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(196,181,253,.7) 40%, transparent 70%);
  box-shadow:0 0 6px rgba(255,255,255,.65), 0 0 12px rgba(139,92,246,.35);
  animation:cb-twinkle 2.8s ease-in-out infinite;
  opacity:0;
}
.md-body :deep(.cb-star.s1) { top:15%;  left:22%;  animation-delay:0s;    animation-duration:2.4s; }
.md-body :deep(.cb-star.s2) { top:42%;  left:78%;  animation-delay:.7s;   animation-duration:3.1s; width:2.5px; height:2.5px; }
.md-body :deep(.cb-star.s3) { top:68%;  left:12%;  animation-delay:1.3s;  animation-duration:2.7s; }
.md-body :deep(.cb-star.s4) { top:28%;  left:92%;  animation-delay:.4s;   animation-duration:2.9s; width:2px; height:2px; }
.md-body :deep(.cb-star.s5) { top:82%;  left:45%;  animation-delay:1.8s;  animation-duration:3.4s; }
.md-body :deep(.cb-star.s6) { top:55%;  left:63%;  animation-delay:1.1s;  animation-duration:2.5s; width:2px; height:2px; }
@keyframes cb-twinkle {
  0%, 100% { opacity:0;   transform:scale(.6); }
  50%      { opacity:1;   transform:scale(1.3); }
}

/* 升空火苗 —— 4 颗，从底部随机位置升起然后消散 */
.md-body :deep(.cb-ember) {
  position:absolute;
  bottom:-6px;
  width:4px; height:4px;
  border-radius:50%;
  background:radial-gradient(circle, #ffdb8b 0%, #ff8c42 45%, rgba(236,72,153,.4) 75%, transparent 100%);
  filter:blur(.3px);
  box-shadow:0 0 8px rgba(255,140,66,.8), 0 0 16px rgba(255,140,66,.3);
  animation:cb-ember-rise 5.8s ease-out infinite;
  opacity:0;
}
.md-body :deep(.cb-ember.e1) { left:18%; animation-delay:0s;    animation-duration:5.4s; }
.md-body :deep(.cb-ember.e2) { left:52%; animation-delay:1.6s;  animation-duration:6.2s; width:3px; height:3px; }
.md-body :deep(.cb-ember.e3) { left:78%; animation-delay:3.2s;  animation-duration:5.8s; }
.md-body :deep(.cb-ember.e4) { left:34%; animation-delay:4.5s;  animation-duration:6.6s; width:3px; height:3px; }
@keyframes cb-ember-rise {
  0%   { opacity:0;  transform:translateY(0)     translateX(0)    scale(.6); }
  15%  { opacity:.95;transform:translateY(-20%)  translateX(4px)  scale(1); }
  50%  { opacity:.65;transform:translateY(-60%)  translateX(-8px) scale(.9); }
  85%  { opacity:.25;transform:translateY(-95%)  translateX(6px)  scale(.55); }
  100% { opacity:0;  transform:translateY(-110%) translateX(0)    scale(.3); }
}

/* 代码块头部 */
.md-body :deep(.cb-head) {
  position:relative;
  z-index:2;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:9px 14px;
  background:linear-gradient(90deg, rgba(139,92,246,.12), rgba(59,130,246,.04));
  border-bottom:1px solid rgba(139,92,246,.18);
  backdrop-filter:blur(4px);
}
.md-body :deep(.cb-lang) {
  font-size:11px;
  color:rgba(196,181,253,.85);
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  display:inline-flex;
  align-items:center;
  gap:7px;
}
.md-body :deep(.cb-lang)::before {
  content:'';
  width:7px; height:7px; border-radius:50%;
  background:linear-gradient(135deg, #fbbf24, #f97316);
  box-shadow:0 0 8px rgba(251,191,36,.6), 0 0 4px rgba(249,115,22,.9);
  animation:cb-lang-pulse 2.4s ease-in-out infinite;
}
@keyframes cb-lang-pulse {
  0%, 100% { box-shadow:0 0 8px rgba(251,191,36,.6), 0 0 4px rgba(249,115,22,.9); transform:scale(1); }
  50%      { box-shadow:0 0 12px rgba(251,191,36,.9), 0 0 20px rgba(249,115,22,.5); transform:scale(1.15); }
}
.md-body :deep(.cb-copy) {
  background:rgba(139,92,246,.14);
  border:1px solid rgba(139,92,246,.3);
  border-radius:6px;
  padding:4px 12px;
  font-size:11px;
  color:rgba(196,181,253,.95);
  cursor:pointer;
  font-weight:600;
  transition:all .18s ease;
  letter-spacing:.3px;
}
.md-body :deep(.cb-copy:hover) {
  background:rgba(139,92,246,.28);
  color:#fff;
  border-color:rgba(139,92,246,.55);
  transform:translateY(-1px);
  box-shadow:0 3px 12px rgba(139,92,246,.4);
}

.md-body :deep(pre) {
  position:relative;
  z-index:2;
  margin:0;
  padding:16px 18px;
  overflow-x:auto;
  background:rgba(0,0,0,.18);
}
.md-body :deep(pre code) {
  font-size:12.5px;
  line-height:1.75;
  font-family:'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace;
  color:#e8e9ff;
  text-shadow:0 0 12px rgba(139,92,246,.08);
}
.md-body :deep(pre::-webkit-scrollbar) { height:6px; }
.md-body :deep(pre::-webkit-scrollbar-thumb) { background:rgba(139,92,246,.3); border-radius:4px; }
.md-body :deep(pre::-webkit-scrollbar-thumb:hover) { background:rgba(139,92,246,.55); }

/* ============ highlight.js 配色覆盖（Spark 主题） ============
 * 配色受 Dracula + Tokyo Night 启发，保证在深邃背景上高辨识度
 */
.md-body :deep(.hljs)                      { color:#e8e9ff; background:transparent; }
.md-body :deep(.hljs-comment),
.md-body :deep(.hljs-quote)                { color:#6b7394; font-style:italic; }
.md-body :deep(.hljs-keyword),
.md-body :deep(.hljs-selector-tag),
.md-body :deep(.hljs-literal),
.md-body :deep(.hljs-doctag)               { color:#ff79c6; font-weight:600; }
.md-body :deep(.hljs-built_in),
.md-body :deep(.hljs-type),
.md-body :deep(.hljs-class .hljs-title)    { color:#8be9fd; }
.md-body :deep(.hljs-string),
.md-body :deep(.hljs-template-tag),
.md-body :deep(.hljs-template-variable),
.md-body :deep(.hljs-regexp),
.md-body :deep(.hljs-link),
.md-body :deep(.hljs-symbol)               { color:#9dffc3; }
.md-body :deep(.hljs-number),
.md-body :deep(.hljs-variable.constant_),
.md-body :deep(.hljs-meta)                 { color:#ffb86c; }
.md-body :deep(.hljs-title),
.md-body :deep(.hljs-title.function_),
.md-body :deep(.hljs-function .hljs-title),
.md-body :deep(.hljs-title.class_)         { color:#ffd866; font-weight:600; }
.md-body :deep(.hljs-params),
.md-body :deep(.hljs-variable),
.md-body :deep(.hljs-attr)                 { color:#c4b5fd; }
.md-body :deep(.hljs-tag),
.md-body :deep(.hljs-name)                 { color:#ff92d0; }
.md-body :deep(.hljs-attribute)            { color:#82aaff; }
.md-body :deep(.hljs-section),
.md-body :deep(.hljs-bullet)               { color:#ff79c6; font-weight:700; }
.md-body :deep(.hljs-operator),
.md-body :deep(.hljs-punctuation)          { color:#d8d8f0; }
.md-body :deep(.hljs-deletion)             { color:#ff5c7c; background:rgba(255,92,124,.12); }
.md-body :deep(.hljs-addition)             { color:#9dffc3; background:rgba(157,255,195,.1); }
.md-body :deep(.hljs-emphasis)             { font-style:italic; }
.md-body :deep(.hljs-strong)               { font-weight:700; }

/* 允许用户在降低动效偏好时关闭装饰动画（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .md-body :deep(.cb-star),
  .md-body :deep(.cb-ember),
  .md-body :deep(.cb-lang)::before { animation:none; }
  .md-body :deep(.cb-star) { opacity:.7; }
  .md-body :deep(.cb-ember) { opacity:0; }
}

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
.ab-dot.default { background:rgba(59,130,246,.5); } .ab-dot.thinking { background:rgba(168,85,247,.5); } .ab-dot.fast { background:rgba(34,197,94,.5); } .ab-dot.standard { background:rgba(251,191,36,.55); }
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
.wf-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:6px; max-height:360px; overflow-y:auto; padding-right:4px; }
.wf-card { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border:1px solid rgba(255,255,255,.04); border-radius:10px; background:rgba(255,255,255,.015); text-align:left; cursor:pointer; transition:all .22s cubic-bezier(.2,.8,.2,1); }
.wf-card:hover { background:rgba(139,92,246,.05); border-color:rgba(139,92,246,.15); transform:translateY(-1px); }
.wf-card-expanded { background:rgba(139,92,246,.08) !important; border-color:rgba(139,92,246,.3) !important; transform:scale(1) !important; box-shadow:0 4px 20px rgba(139,92,246,.15); grid-column:span 2; }
.wf-card-active { border-color:rgba(34,197,94,.3) !important; background:rgba(34,197,94,.05) !important; }
.wf-card-icon { font-size:18px; flex-shrink:0; margin-top:2px; }
.wf-card-main { flex:1; min-width:0; }
.wf-card-label { font-size:12px; font-weight:700; color:rgba(255,255,255,.85); margin-bottom:2px; }
.wf-card-hint { font-size:10px; color:rgba(255,255,255,.3); line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wf-card-expanded .wf-card-hint { white-space:normal; overflow:visible; }
.wf-tag-active { background:rgba(34,197,94,.2); color:rgba(134,239,172,.95); border:1px solid rgba(34,197,94,.35); }
.wf-card-detail { margin-top:8px; padding-top:8px; border-top:1px solid rgba(139,92,246,.12); }
.wf-detail-label { display:block; font-size:9px; font-weight:700; color:rgba(139,92,246,.6); text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
.wf-detail-text { font-size:11px; color:rgba(255,255,255,.5); line-height:1.5; white-space:pre-wrap; word-break:break-word; margin-bottom:8px; }
.wf-detail-sys-text { font-style:italic; color:rgba(196,181,253,.4); }
.wf-detail-prompt { background:rgba(0,0,0,.2); border-radius:6px; padding:6px 8px; }
.wf-detail-abilities-row { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
.wf-detail-ability { display:inline-flex; align-items:center; gap:2px; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:600; background:rgba(139,92,246,.08); color:rgba(196,181,253,.8); border:1px solid rgba(139,92,246,.15); }
.wf-detail-action { display:flex; justify-content:flex-end; }
.wf-use-btn { padding:6px 16px; border-radius:8px; border:none; background:linear-gradient(135deg, rgba(139,92,246,.2), rgba(59,130,246,.15)); color:white; font-size:12px; font-weight:700; cursor:pointer; transition:all .18s; }
.wf-use-btn:hover { background:linear-gradient(135deg, rgba(139,92,246,.35), rgba(59,130,246,.25)); box-shadow:0 3px 12px rgba(139,92,246,.3); transform:translateY(-1px); }
.wf-expand-enter-active { transition:all .25s ease-out; }
.wf-expand-leave-active { transition:all .15s ease-in; }
.wf-expand-enter-from, .wf-expand-leave-to { opacity:0; max-height:0; margin-top:0; padding-top:0; }
.wf-expand-enter-to, .wf-expand-leave-from { opacity:1; max-height:300px; }
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

/* ============ v11: 新开对话继承记忆 按钮 ============ */
.top-inherit {
  display:inline-flex; align-items:center; gap:4px;
  padding:5px 11px; margin-left:2px;
  border-radius:10px;
  background:linear-gradient(135deg, rgba(139,92,246,.12), rgba(59,130,246,.08));
  border:1px solid rgba(139,92,246,.18);
  color:rgba(196,181,253,.9);
  font-size:11px; font-weight:600;
  cursor:pointer;
  transition:all .2s;
  white-space:nowrap;
}
.top-inherit:hover:not(:disabled) {
  background:linear-gradient(135deg, rgba(139,92,246,.2), rgba(59,130,246,.14));
  border-color:rgba(139,92,246,.35);
  color:white;
  transform:translateY(-1px);
  box-shadow:0 3px 10px rgba(139,92,246,.25);
}
.top-inherit:disabled { opacity:.5; cursor:wait; }

/* ============ v11: 上下文满格指示 / 摘要中状态 ============ */
.ctx-gauge { cursor:pointer; transition:all .15s; }
.ctx-gauge:hover { opacity:.85; }
.ctx-gauge.warn .ctx-fill { background:linear-gradient(90deg, rgba(234,179,8,.6), rgba(251,146,60,.7)); }
.ctx-gauge.full .ctx-fill { background:linear-gradient(90deg, rgba(239,68,68,.7), rgba(236,72,153,.8)); animation:ctxPulse 1.6s ease-in-out infinite; }
.ctx-gauge.summarizing .ctx-label { color:rgba(139,92,246,.85); }
.ctx-gauge.summarizing .ctx-fill { background:linear-gradient(90deg, rgba(139,92,246,.5), rgba(196,181,253,.7)); animation:ctxPulse 1.2s ease-in-out infinite; }
@keyframes ctxPulse { 0%,100%{opacity:.85;} 50%{opacity:1;} }

@media(max-width:768px) {
  .top-inherit { padding:4px 8px; font-size:10.5px; }
}

/* ============ v13: 附件卡片（可点击预览）+ pending 文件区 ============ */
.file-card { cursor:pointer; transition:all .15s; }
.file-card:hover { background:rgba(139,92,246,.06); border-color:rgba(139,92,246,.18); transform:translateY(-1px); }
.file-card-img { padding:3px; background:rgba(139,92,246,.04); }
.fc-thumb { width:54px; height:54px; object-fit:cover; border-radius:6px; flex-shrink:0; }
.file-card-img .fc-info { padding:0 6px 0 4px; }
.pf-chip { cursor:pointer; transition:all .15s; }
.pf-chip-img { padding:2px 6px 2px 2px; }
.pf-chip:hover { background:rgba(139,92,246,.06); border-color:rgba(139,92,246,.2); }
.pf-size { font-size:9px; color:rgba(255,255,255,.28); margin-left:2px; }
.pf-meta { width:100%; flex-basis:100%; font-size:10px; color:rgba(255,255,255,.32); padding:2px 0 0 2px; letter-spacing:.2px; }

/* ============ v13: 附件 Lightbox 预览 ============ */
.att-lightbox { position:fixed; inset:0; background:rgba(4,4,12,.86); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:1100; padding:24px; }
.att-close { position:absolute; top:18px; right:20px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); color:rgba(255,255,255,.85); width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer; transition:all .15s; }
.att-close:hover { background:rgba(239,68,68,.2); border-color:rgba(239,68,68,.4); transform:rotate(90deg); }
.att-body { width:100%; max-width:920px; max-height:90vh; display:flex; flex-direction:column; background:linear-gradient(180deg, rgba(18,14,32,.98), rgba(12,10,24,.98)); border:1px solid rgba(139,92,246,.25); border-radius:16px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,.6); }
.att-head { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1px solid rgba(139,92,246,.15); }
.att-title { display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:700; color:white; word-break:break-all; }
.att-icon { font-size:18px; }
.att-size { margin-left:auto; font-size:11px; color:rgba(255,255,255,.4); font-variant-numeric:tabular-nums; }
.att-main { flex:1; overflow:auto; display:flex; align-items:center; justify-content:center; padding:16px; background:radial-gradient(ellipse at center, rgba(139,92,246,.05), transparent 70%); }
.att-img { max-width:100%; max-height:72vh; object-fit:contain; border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,.5); }
.att-text { flex:1; width:100%; max-height:70vh; overflow:auto; padding:14px; background:rgba(0,0,0,.25); border-radius:10px; font-family:'JetBrains Mono','Fira Code',monospace; font-size:12.5px; line-height:1.7; color:#e8e9ff; white-space:pre-wrap; word-break:break-word; }
.att-empty { padding:40px; color:rgba(255,255,255,.45); font-size:13px; }
.att-foot { display:flex; justify-content:flex-end; gap:8px; padding:12px 20px; border-top:1px solid rgba(139,92,246,.12); background:rgba(0,0,0,.15); }
.att-btn { padding:7px 16px; border-radius:8px; border:1px solid rgba(139,92,246,.22); background:rgba(139,92,246,.08); color:rgba(196,181,253,.95); font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
.att-btn:hover { background:rgba(139,92,246,.18); border-color:rgba(139,92,246,.4); color:white; transform:translateY(-1px); }
.att-btn-primary { background:linear-gradient(135deg,#8b5cf6,#6d28d9); border-color:transparent; color:white; }
.att-btn-primary:hover { box-shadow:0 4px 14px rgba(139,92,246,.4); }

/* ============ v13: 自定义确认 Modal（替代原生 confirm） ============ */
.confirm-overlay { position:fixed; inset:0; background:rgba(4,4,12,.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:1200; padding:20px; }
.confirm-box { width:100%; max-width:400px; padding:24px; background:linear-gradient(180deg, rgba(22,16,38,.98), rgba(12,10,24,.98)); border:1px solid rgba(139,92,246,.25); border-radius:16px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,.5); animation:confirmIn .22s cubic-bezier(.2,.9,.2,1); }
.confirm-box.danger { border-color:rgba(239,68,68,.3); box-shadow:0 24px 60px rgba(239,68,68,.18); }
@keyframes confirmIn { from{opacity:0;transform:translateY(12px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.confirm-icon { font-size:32px; margin-bottom:10px; }
.confirm-title { font-size:16px; font-weight:700; color:white; margin-bottom:6px; }
.confirm-desc { font-size:12.5px; color:rgba(255,255,255,.6); line-height:1.6; margin-bottom:20px; }
.confirm-acts { display:flex; gap:10px; justify-content:center; }
.cf-cancel,.cf-ok { padding:9px 22px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .15s; min-width:90px; }
.cf-cancel { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.08); color:rgba(255,255,255,.7); }
.cf-cancel:hover { background:rgba(255,255,255,.08); color:white; }
.cf-ok { background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; }
.cf-ok:hover { box-shadow:0 6px 20px rgba(139,92,246,.4); transform:translateY(-1px); }
.cf-ok-danger { background:linear-gradient(135deg,#ef4444,#b91c1c); }
.cf-ok-danger:hover { box-shadow:0 6px 20px rgba(239,68,68,.45); }

/* ============ v13: 代码块右上角 "复制 / 下载" 按钮组 ============ */
.md-body :deep(.cb-actions) { display:inline-flex; gap:6px; align-items:center; }
.md-body :deep(.cb-dl) { background:rgba(59,130,246,.12); border:1px solid rgba(59,130,246,.28); color:rgba(147,197,253,.95); border-radius:6px; width:28px; height:26px; padding:0; font-size:14px; cursor:pointer; font-weight:700; line-height:1; transition:all .15s; display:inline-flex; align-items:center; justify-content:center; }
.md-body :deep(.cb-dl:hover) { background:rgba(59,130,246,.28); color:#fff; border-color:rgba(59,130,246,.55); transform:translateY(-1px); box-shadow:0 3px 10px rgba(59,130,246,.35); }

/* ============ v13: 公式块 —— 宇宙深空主题（与代码块呼应） ============ */
.md-body :deep(.katex-display) {
  position:relative;
  background:
    radial-gradient(ellipse at 18% 20%, rgba(139,92,246,.08) 0%, transparent 55%),
    radial-gradient(ellipse at 82% 80%, rgba(59,130,246,.05) 0%, transparent 55%),
    linear-gradient(180deg, rgba(8,6,20,.9), rgba(6,4,14,.9));
  border:1px solid rgba(139,92,246,.18);
  box-shadow:0 4px 16px rgba(0,0,0,.35), inset 0 0 20px rgba(139,92,246,.04);
  overflow:visible;
}
.md-body :deep(.katex-display)::before {
  content:'';
  position:absolute; inset:0;
  background-image:
    radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,.35), transparent 2px),
    radial-gradient(1px 1px at 78% 72%, rgba(196,181,253,.3), transparent 2px),
    radial-gradient(1px 1px at 45% 55%, rgba(255,255,255,.25), transparent 2px);
  pointer-events:none;
  border-radius:inherit;
  animation:katex-twinkle 3.5s ease-in-out infinite alternate;
}
@keyframes katex-twinkle { from { opacity:.45; } to { opacity:.85; } }

/* ============ v13: 单条消息导出菜单 ============ */
.msg-export { position:relative; }
.msg-export-btn { width:28px; height:28px; border-radius:6px; border:none; background:rgba(255,255,255,.015); color:rgba(255,255,255,.25); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.msg-export-btn:hover,.msg-export-btn.active { background:rgba(34,197,94,.08); color:rgba(134,239,172,.95); }
.msg-export-menu { position:absolute; top:calc(100% + 4px); right:0; min-width:180px; padding:4px; background:rgba(12,10,24,.98); backdrop-filter:blur(18px); border:1px solid rgba(139,92,246,.25); border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.45); z-index:50; }
.mx-item { width:100%; padding:7px 10px; border:none; border-radius:6px; background:none; color:rgba(255,255,255,.75); font-size:12px; text-align:left; cursor:pointer; display:block; transition:all .12s; }
.mx-item:hover { background:rgba(139,92,246,.14); color:white; }

/* ============ v13: 语音录制条 实时转写 ============ */
.voice-rec-bar { flex-wrap:wrap; }
.voice-live { flex:1 1 100%; padding:6px 10px; background:rgba(139,92,246,.035); border:1px solid rgba(139,92,246,.1); border-radius:10px; margin-bottom:4px; min-width:0; }
.voice-live-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; color:rgba(196,181,253,.85); margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px; }
.voice-live-dot { width:8px; height:8px; border-radius:50%; background:#ef4444; box-shadow:0 0 0 0 rgba(239,68,68,.5); animation:recDotPulse 1.3s ease-out infinite; }
@keyframes recDotPulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
.voice-live-text { font-size:13px; line-height:1.55; color:rgba(255,255,255,.85); word-break:break-word; min-height:18px; max-height:110px; overflow-y:auto; }
.voice-live-text .voice-final { color:rgba(255,255,255,.95); }
.voice-live-text .voice-interim { color:rgba(196,181,253,.6); font-style:italic; }

/* ============ v13: 语音预览条（停止后可编辑） ============ */
.voice-preview { margin-top:6px; padding:10px 12px; background:linear-gradient(135deg, rgba(139,92,246,.06), rgba(59,130,246,.04)); border:1px solid rgba(139,92,246,.2); border-radius:14px; animation:vpIn .22s cubic-bezier(.2,.8,.2,1); }
@keyframes vpIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.vp-head { display:flex; align-items:center; gap:8px; font-size:11.5px; font-weight:700; color:rgba(196,181,253,.9); margin-bottom:6px; }
.vp-icon { font-size:14px; }
.vp-title { flex:1; }
.vp-meta { font-size:10px; color:rgba(255,255,255,.35); font-weight:500; }
.vp-text { width:100%; min-height:52px; max-height:180px; padding:8px 10px; background:rgba(4,3,12,.5); border:1px solid rgba(139,92,246,.14); border-radius:10px; color:white; font-size:13px; line-height:1.65; resize:vertical; outline:none; font-family:inherit; }
.vp-text:focus { border-color:rgba(139,92,246,.45); box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.vp-acts { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.vp-btn { padding:6px 12px; border-radius:8px; border:1px solid rgba(139,92,246,.18); background:rgba(139,92,246,.05); color:rgba(196,181,253,.85); font-size:11.5px; font-weight:600; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; gap:4px; }
.vp-btn:hover:not(:disabled) { background:rgba(139,92,246,.15); color:white; border-color:rgba(139,92,246,.4); transform:translateY(-1px); }
.vp-btn:disabled { opacity:.35; cursor:not-allowed; }
.vp-btn-primary { background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; border-color:transparent; margin-left:auto; }
.vp-btn-primary:hover:not(:disabled) { box-shadow:0 4px 14px rgba(139,92,246,.4); }
.vp-kbd { margin-left:4px; font-size:9.5px; padding:1px 6px; border-radius:4px; background:rgba(0,0,0,.25); color:rgba(255,255,255,.55); font-family:monospace; }

/* ============ v13: emoji 面板升级 —— 分类栏/网格更大可滚动 ============ */
.emoji-panel { width:360px; max-width:92vw; }
.emoji-grid { max-height:260px; grid-template-columns:repeat(9, 1fr); }
@media(max-width:768px) { .emoji-panel { width:auto; } .emoji-grid { grid-template-columns:repeat(8, 1fr); max-height:44vh; } }

/* ============ v13 T9: 后台流式中提示（切到其它会话时，原会话占位消息的静态提示） ============ */
.bg-streaming-hint { display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:10px; background:linear-gradient(135deg, rgba(139,92,246,.06), rgba(59,130,246,.04)); border:1px dashed rgba(139,92,246,.22); color:rgba(196,181,253,.72); font-size:11.5px; }
.bg-dot { width:8px; height:8px; border-radius:50%; background:rgba(139,92,246,.85); box-shadow:0 0 0 0 rgba(139,92,246,.6); animation:bgDotPulse 1.6s ease-out infinite; }
@keyframes bgDotPulse { 0%{box-shadow:0 0 0 0 rgba(139,92,246,.6)} 70%{box-shadow:0 0 0 10px rgba(139,92,246,0)} 100%{box-shadow:0 0 0 0 rgba(139,92,246,0)} }

/* ============ v13: 工作流升级标签 + 激活态 ============ */
.wf-tag { display:inline-flex; align-items:center; gap:2px; margin-left:6px; padding:1px 6px; border-radius:10px; font-size:9.5px; font-weight:700; letter-spacing:.2px; vertical-align:middle; }
.wf-tag-model { background:rgba(139,92,246,.15); color:rgba(196,181,253,.95); border:1px solid rgba(139,92,246,.3); }
.wf-tag-file { background:rgba(59,130,246,.15); color:rgba(147,197,253,.95); border:1px solid rgba(59,130,246,.3); }
.wf-kind-coding { border-color:rgba(59,130,246,.2); }
.wf-kind-study { border-color:rgba(34,197,94,.18); }
.wf-kind-creative { border-color:rgba(236,72,153,.18); }
.wf-kind-productivity { border-color:rgba(251,191,36,.18); }
.wf-kind-analysis { border-color:rgba(20,184,166,.2); }

.ab-workflow-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:14px; background:linear-gradient(135deg, rgba(139,92,246,.15), rgba(59,130,246,.1)); border:1px solid rgba(139,92,246,.35); color:rgba(196,181,253,.95); font-size:11px; font-weight:700; animation:wfChipIn .22s ease-out; }
@keyframes wfChipIn { from{opacity:0;transform:translateY(3px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.ab-wf-clear { background:rgba(0,0,0,.2); border:none; color:rgba(255,255,255,.85); width:16px; height:16px; border-radius:50%; cursor:pointer; font-size:12px; line-height:1; padding:0; }
.ab-wf-clear:hover { background:rgba(239,68,68,.4); }
.ab-tool-active { background:rgba(139,92,246,.12) !important; color:rgba(196,181,253,.95) !important; border-color:rgba(139,92,246,.3) !important; box-shadow:0 0 0 1px rgba(139,92,246,.2) inset; }

/* ============ 代码沙盒 ============ */
.md-body :deep(.cb-run) {
  background:linear-gradient(135deg, rgba(34,197,94,.15), rgba(16,185,129,.1));
  border:1px solid rgba(34,197,94,.35);
  color:rgba(134,239,172,.95);
  border-radius:6px;
  padding:2px 10px;
  font-size:11px;
  font-weight:700;
  cursor:pointer;
  transition:all .18s;
  display:inline-flex;
  align-items:center;
  gap:3px;
}
.md-body :deep(.cb-run:hover) {
  background:linear-gradient(135deg, rgba(34,197,94,.3), rgba(16,185,129,.22));
  color:#fff;
  border-color:rgba(34,197,94,.6);
  transform:translateY(-1px);
  box-shadow:0 3px 12px rgba(34,197,94,.35);
}

.sandbox-overlay {
  position:fixed; inset:0; z-index:9999;
  background:rgba(0,0,0,.7);
  backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center;
  padding:24px;
}
.sandbox-container {
  width:min(1100px, 95vw);
  height:min(750px, 88vh);
  background:linear-gradient(180deg, #13112a 0%, #0d0b1e 100%);
  border:1px solid rgba(139,92,246,.2);
  border-radius:16px;
  display:flex; flex-direction:column;
  overflow:hidden;
  box-shadow:0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(139,92,246,.08);
  animation:sandboxIn .22s ease-out;
}
@keyframes sandboxIn { from{opacity:0;transform:scale(.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }

.sandbox-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 18px;
  border-bottom:1px solid rgba(139,92,246,.12);
  background:rgba(139,92,246,.03);
}
.sandbox-title {
  display:flex; align-items:center; gap:8px;
  font-size:14px; font-weight:700; color:white;
}
.sandbox-icon { font-size:18px; }
.sandbox-lang-badge {
  padding:2px 8px; border-radius:8px;
  background:rgba(139,92,246,.15); color:rgba(196,181,253,.95);
  font-size:10px; font-weight:700; text-transform:uppercase;
  border:1px solid rgba(139,92,246,.25);
}
.sandbox-actions { display:flex; align-items:center; gap:8px; }
.sandbox-btn {
  padding:5px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.04); color:rgba(255,255,255,.7);
  font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;
}
.sandbox-btn:hover { background:rgba(255,255,255,.1); color:white; border-color:rgba(255,255,255,.18); }
.sandbox-btn-edit { background:rgba(59,130,246,.08); border-color:rgba(59,130,246,.2); color:rgba(147,197,253,.85); }
.sandbox-btn-edit:hover { background:rgba(59,130,246,.18); color:white; }
.sandbox-close {
  width:32px; height:32px; border-radius:8px; border:none;
  background:rgba(255,255,255,.04); color:rgba(255,255,255,.5);
  font-size:20px; cursor:pointer; transition:all .15s;
  display:flex; align-items:center; justify-content:center;
}
.sandbox-close:hover { background:rgba(239,68,68,.15); color:rgba(239,68,68,.9); }

.sandbox-body { flex:1; display:flex; overflow:hidden; }
.sandbox-body.sandbox-split { }
.sandbox-editor { flex:0 0 45%; border-right:1px solid rgba(139,92,246,.12); display:flex; }
.sandbox-textarea {
  flex:1; resize:none; border:none; outline:none;
  background:#0d0b1e; color:#e8e9ff; padding:14px 16px;
  font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;
  font-size:13px; line-height:1.65; tab-size:2;
}
.sandbox-preview { flex:1; position:relative; }
.sandbox-preview-full { flex:1; }
.sandbox-iframe {
  width:100%; height:100%; border:none;
  background:#fff;
  border-radius:0 0 16px 0;
}
.sandbox-split .sandbox-iframe { border-radius:0 0 16px 0; }
.sandbox-preview-full .sandbox-iframe { border-radius:0 0 16px 16px; }
.sandbox-loading {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  display:flex; align-items:center; gap:8px;
  color:rgba(196,181,253,.7); font-size:13px; font-weight:600;
  z-index:2;
}
.sandbox-spinner {
  width:18px; height:18px; border:2px solid rgba(139,92,246,.2);
  border-top-color:rgba(139,92,246,.8); border-radius:50%;
  animation:spin .6s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }

@media(max-width:768px) {
  .sandbox-overlay { padding:8px; }
  .sandbox-container { width:100%; height:95vh; border-radius:12px; }
  .sandbox-body.sandbox-split { flex-direction:column; }
  .sandbox-editor { flex:0 0 40%; border-right:none; border-bottom:1px solid rgba(139,92,246,.12); }
}
</style>
