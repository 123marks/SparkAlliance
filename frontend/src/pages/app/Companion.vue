<template>
  <div class="cp-layout">
    <CosmicBackground :enabled="true" />
    <Transition name="toast"><div v-if="toast.show" class="cp-toast">{{ toast.msg }}</div></Transition>

    <!-- 确认框 -->
    <Transition name="fade">
      <div v-if="confirmDialog.show" class="cp-overlay" @click.self="confirmDialog.show=false">
        <div class="cp-modal sm">
          <h3>{{ confirmDialog.title }}</h3>
          <p class="cp-confirm-text">{{ confirmDialog.text }}</p>
          <div class="cp-modal-btns">
            <button @click="confirmDialog.show=false">取消</button>
            <button class="danger" @click="confirmDialog.onConfirm?.();confirmDialog.show=false">{{ confirmDialog.btnText }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 会话右键菜单 -->
    <div v-if="ctxMenu.show" class="cp-ctx-menu" :style="{top:ctxMenu.y+'px',left:ctxMenu.x+'px'}" @click.self="ctxMenu.show=false">
      <button @click="ctxMenuAction('pin')">{{ getCtxPinLabel() }}</button>
      <button @click="ctxMenuAction('unread')">🔴 标为未读</button>
      <button @click="ctxMenuAction('mute')">{{ getCtxMuteLabel() }}</button>
      <button class="del" @click="ctxMenuAction('delete')">🗑️ 删除</button>
    </div>
    <!-- 消息右键菜单(仿微信) -->
    <div v-if="msgCtx.show" class="cp-ctx-menu msg-ctx" :style="{top:msgCtx.y+'px',left:msgCtx.x+'px'}">
      <button @click="msgCtxAction('copy')">📋 复制</button>
      <button @click="msgCtxAction('forward')">↗️ 转发...</button>
      <button @click="msgCtxAction('favorite')">⭐ 收藏</button>
      <button @click="msgCtxAction('quote')">💬 引用</button>
      <button @click="msgCtxAction('translate')">🌐 翻译</button>
      <button @click="msgCtxAction('select')">☑️ 多选</button>
      <button v-if="msgCtx.canRecall" @click="msgCtxAction('recall')" class="warn">← 撤回</button>
      <button class="del" @click="msgCtxAction('delete')">🗑️ 删除</button>
    </div>

    <!-- 左侧 -->
    <aside class="cp-sidebar" :class="{collapsed:rightPanel!=='none'&&isMobile}">
      <div class="cp-sb-top">
        <h2 class="cp-logo">💬 伴侣</h2>
        <div class="cp-sb-actions">
          <button @click="showSearchModal=true" class="cp-sb-btn" title="搜索">🔍</button>
          <button @click="showAddMenu=!showAddMenu" class="cp-sb-btn" title="添加">➕</button>
        </div>
        <Transition name="fade">
          <div v-if="showAddMenu" class="cp-add-menu">
            <button @click="showAddFriendModal=true;showAddMenu=false">👤 添加好友</button>
            <button @click="showCreateModal=true;showAddMenu=false">👥 创建群聊</button>
            <button @click="showQRModal=true;showAddMenu=false">📱 扫码/名片</button>
          </div>
        </Transition>
      </div>
      <div class="cp-tabs">
        <button :class="{active:sideTab==='chat'}" @click="switchTab('chat')">💬 消息</button>
        <button :class="{active:sideTab==='contacts'}" @click="switchTab('contacts')">👥 通讯录</button>
        <button :class="{active:sideTab==='moments'}" @click="switchTab('moments')">📸 动态</button>
      </div>

      <!-- 消息列表 -->
      <div v-if="sideTab==='chat'" class="cp-list">
        <div class="cp-conv" :class="{active:activeChat?.type==='ai'}" @click="openAIChat" @contextmenu.prevent="e=>showCtxMenu(e,'ai','ai')">
          <span class="cp-av">🌟</span>
          <div class="cp-conv-info"><span class="cp-conv-name">星火AI伙伴</span><span class="cp-conv-last">智能助手，随时待命</span></div>
        </div>
        <div v-for="g in sortedGroups" :key="g.id" class="cp-conv" :class="{active:activeChat?.id===g.id,'is-pinned':g.is_chat_pinned}" @click="openGroupChat(g.id)" @contextmenu.prevent="e=>showCtxMenu(e,'group',g.id)">
          <div class="cp-group-av" :class="getGridClass(g.members.length)">
            <span v-for="(emoji,gi) in getGroupAvatarGrid(g)" :key="gi" class="cp-gav-item">{{ emoji }}</span>
          </div>
          <div class="cp-conv-info">
            <span class="cp-conv-name">{{ g.name }}<small>({{ g.members.length }})</small></span>
            <span class="cp-conv-last">{{ g.messages[g.messages.length-1]?.content?.slice(0,20)||'暂无消息' }}</span>
          </div>
          <span v-if="g.unread" class="cp-badge">{{ g.unread }}</span>
        </div>
        <div v-for="f in sortedFriends" :key="f.id" class="cp-conv" :class="{active:activeChat?.id===f.spark_id&&activeChat?.type==='private','is-pinned':f.is_chat_pinned}" @click="openPrivateChat(f.spark_id)" @contextmenu.prevent="e=>showCtxMenu(e,'private',f.spark_id)">
          <SparkAvatar :avatar="f.avatar" :name="f.remark||f.nickname" size="sm" />
          <div class="cp-conv-info">
            <span class="cp-conv-name">{{ f.remark||f.nickname }}</span>
            <span class="cp-conv-last">{{ f.last_msg||f.bio?.slice(0,20)||'' }}</span>
          </div>
          <span v-if="f.unread" class="cp-badge">{{ f.unread }}</span>
        </div>
      </div>

      <!-- 通讯录(仿微信分组) -->
      <div v-if="sideTab==='contacts'" class="cp-list">
        <div class="cp-contact-group" @click="showAddFriendModal=true"><span class="cp-cg-icon nr">👤</span><span class="cp-cg-text">新的朋友</span><span class="cp-cg-arrow">›</span></div>
        <div class="cp-contact-group" @click="contactGroupExpand.groups=!contactGroupExpand.groups"><span class="cp-cg-icon grp">👥</span><span class="cp-cg-text">群聊</span><span class="cp-cg-count">{{ groups.length }}</span><span class="cp-cg-arrow" :class="{open:contactGroupExpand.groups}">›</span></div>
        <template v-if="contactGroupExpand.groups">
          <div v-for="g in groups" :key="g.id" class="cp-contact" @click="openGroupChat(g.id)">
            <SparkAvatar :avatar="g.avatar" :name="g.name" size="sm" />
            <div class="cp-contact-info"><span class="cp-contact-name">{{ g.name }}</span><span class="cp-contact-id">{{ g.members.length }}人</span></div>
          </div>
        </template>
        <div class="cp-contact-group" @click="contactGroupExpand.friends=!contactGroupExpand.friends"><span class="cp-cg-icon fri">📖</span><span class="cp-cg-text">联系人</span><span class="cp-cg-count">{{ friends.length }}</span><span class="cp-cg-arrow" :class="{open:contactGroupExpand.friends}">›</span></div>
        <template v-if="contactGroupExpand.friends">
          <div v-for="f in friends" :key="f.id" class="cp-contact" :class="{active:selectedContact?.spark_id===f.spark_id}" @click="selectContact(f)">
            <SparkAvatar :avatar="f.avatar" :name="f.nickname" size="sm" clickable @click.stop="showProfilePopup(f)" />
            <div class="cp-contact-info"><span class="cp-contact-name">{{ f.remark||f.nickname }}</span></div>
          </div>
        </template>
        <p v-if="!friends.length&&!groups.length" class="cp-empty">还没有联系人</p>
      </div>

      <!-- 动态tab：左侧只显示标签和快速发布，右侧显示完整feed -->
      <div v-if="sideTab==='moments'" class="cp-list moments-tab">
        <p class="cp-sb-hint">→ 右侧查看星火域</p>
        <button class="cp-sb-publish-btn" @click="showPublishModal=true">✨ 发布动态</button>
      </div>
    </aside>

    <!-- ======== 右侧面板 ======== -->

    <!-- 聊天面板 -->
    <main v-if="rightPanel==='chat'" class="cp-main" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
      <!-- 拖拽遮罩 -->
      <div v-if="isDragging" class="cp-drop-overlay"><div class="cp-drop-box">📁 释放以添加文件</div></div>
      <div class="cp-chat-hdr">
        <button class="cp-back" @click="closeRight">←</button>
        <h3>{{ chatTitle }}</h3>
        <span v-if="activeChat?.type==='group'" class="cp-hdr-sub">{{ activeGroup?.members.length }}人</span>
        <button v-if="activeChat?.type!=='ai'" class="cp-hdr-btn" @click="showChatHistorySearch=true" title="查找聊天记录">🔍</button>
        <button v-if="activeChat?.type==='private'||activeChat?.type==='group'" class="cp-hdr-btn cs-btn" :class="{active:showChatSettings}" @click="showChatSettings=!showChatSettings" title="聊天设置">☰</button>
      </div>
      <div class="cp-chat-body">
        <div class="cp-messages" ref="chatScrollRef">
          <template v-for="(msg, idx) in filteredChatMessages" :key="msg.id">
            <!-- 时间分隔线 -->
            <div v-if="shouldShowTimeSeparator(idx > 0 ? filteredChatMessages[idx-1] : null, msg)" class="cp-time-sep">{{ formatMsgTime(msg.created_at) }}</div>
            <!-- 被@提醒 -->
            <div v-if="isMentionedInMsg(msg) && msg.sender_id !== myProfile?.spark_id" class="cp-mention-alert">有人@了你</div>
            <div class="cp-msg" :data-msg-id="msg.id" :class="{mine:msg.sender_id===myProfile?.spark_id,ai:msg.sender_type==='ai',sys:msg.type==='system',poke:msg.type==='poke','multi-select':multiSelectMode}" @contextmenu.prevent="e=>showMsgCtxMenu(e,msg)" @click="multiSelectMode && toggleMsgSelect(msg.id)">
              <!-- 多选checkbox -->
              <div v-if="multiSelectMode" class="cp-msg-checkbox" :class="{checked:selectedMsgIds.includes(msg.id)}">
                <span v-if="selectedMsgIds.includes(msg.id)">✓</span>
              </div>
              <div v-if="msg.type==='system'" class="cp-sys-msg">{{ msg.content }}</div>
              <div v-else-if="msg.type==='poke'" class="cp-poke-msg">{{ msg.content }}</div>
              <template v-else>
                <SparkAvatar v-if="msg.sender_id!==myProfile?.spark_id" :avatar="msg.sender_avatar" :avatar-url="msg.sender_avatar_url" :name="msg.sender_name" size="sm" clickable @click="handleViewMsgSender(msg)" @contextmenu.prevent="($event: any)=>handlePokeAvatar($event,msg.sender_name,msg.sender_id)" />
                <div class="cp-msg-body">
                  <div v-if="msg.sender_id!==myProfile?.spark_id" class="cp-msg-meta">
                    <span v-if="activeChat?.type==='group' && getGroupMsgRole(msg)==='owner'" class="cp-role-tag owner">群主</span>
                    <span v-else-if="activeChat?.type==='group' && getGroupMsgRole(msg)==='admin'" class="cp-role-tag admin">管理员</span>
                    <span class="cp-msg-name">{{ msg.sender_name }}</span>
                  </div>
                  <!-- 引用消息（气泡内部） -->
                  <div v-if="msg.quote_msg" class="cp-quote-in-bubble">
                    <span class="cp-quote-in-name">{{ msg.quote_msg.sender_name }}</span>
                    <span class="cp-quote-in-text">{{ msg.quote_msg.content.slice(0,40) }}</span>
                  </div>
                  <!-- 语音消息：可播放气泡 -->
                  <div v-if="msg.type==='voice'" class="cp-voice-bubble" @click.stop="playVoice(msg)">
                    <span class="cp-voice-icon" :class="{playing:playingVoiceId===msg.id}">🔊</span>
                    <div class="cp-voice-bars">
                      <span v-for="i in Math.min(Math.max(msg.voice_duration||3,3),15)" :key="i" class="cp-vbar" :style="{height:(4+Math.random()*12)+'px'}"></span>
                    </div>
                    <span class="cp-voice-dur">{{ msg.voice_duration||0 }}″</span>
                  </div>
                  <!-- 普通文本消息 -->
                  <div v-else class="cp-bubble" v-html="renderMsgContent(msg.content)"></div>
                  <!-- 翻译结果（微信风格） -->
                  <div v-if="translatedMessages[msg.id]" class="cp-translate-result">
                    <p class="cp-translate-text">{{ translatedMessages[msg.id] }}</p>
                    <span class="cp-translate-from">由翻译提供支持</span>
                  </div>
                  <!-- 时间+已读状态 -->
                  <div class="cp-msg-footer" :class="{reverse:msg.sender_id===myProfile?.spark_id}">
                    <span class="cp-msg-time2">{{ formatMsgTime(msg.created_at) }}</span>
                    <span v-if="msg.sender_id===myProfile?.spark_id" class="cp-read-status" :class="{read:msg.is_read}">{{ msg.is_read?'✓✓':'✓' }}</span>
                  </div>
                </div>
                <SparkAvatar v-if="msg.sender_id===myProfile?.spark_id" :avatar="msg.sender_avatar||myProfile?.avatar||''" :avatar-url="msg.sender_avatar_url||myProfile?.avatar_url" :name="myProfile?.nickname||''" size="sm" clickable class="cp-msg-av-self" @click="showSelfProfile" />
              </template>
            </div>
          </template>
          <div v-if="isAiTyping" class="cp-msg ai"><span class="cp-msg-av">🌟</span><div class="cp-msg-body"><div class="cp-msg-meta"><span class="cp-msg-name">星火AI</span></div><div class="cp-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div></div>
        </div>
        <!-- 右侧聊天设置面板(仿微信) -->
        <Transition name="fade">
          <div v-if="showChatSettings" class="cp-chat-settings">
            <!-- 私聊设置面板(仿微信) -->
            <template v-if="activeChat?.type==='private' && chatFriend">
              <div class="cs-members">
                <div class="cs-member" @click="handleViewChatFriend"><SparkAvatar :avatar="chatFriend?.avatar||''" :name="chatFriend?.nickname||''" size="md" clickable /><span class="cs-mname">{{ chatFriend?.remark ? chatFriend.nickname + '（' + chatFriend.remark + '）' : chatFriend?.nickname }}</span></div>
                <div class="cs-member cs-add-btn" @click="showToast('邀请好友加入群聊')"><span class="cs-add-icon">＋</span><span class="cs-mname">添加</span></div>
              </div>
              <!-- 功能菜单区 -->
              <div class="cs-section">
                <div class="cs-row clickable" @click="handleSearchChatHistory"><span>查找聊天内容</span><span class="cs-arrow">›</span></div>
              </div>
              <div class="cs-section">
                <div class="cs-row"><span>消息免打扰</span><label class="cs-toggle"><input type="checkbox" :checked="chatFriend.is_muted" @change="toggleChatMute('private',chatFriend.spark_id)"><span class="cs-slider"></span></label></div>
                <div class="cs-row"><span>置顶聊天</span><label class="cs-toggle"><input type="checkbox" :checked="chatFriend.is_chat_pinned" @change="toggleChatPin('private',chatFriend.spark_id)"><span class="cs-slider"></span></label></div>
              </div>
              <div class="cs-section">
                <div class="cs-row clickable" @click="openChatFriendRemarkEdit"><span>✏️ 编辑备注</span><span class="cs-val">{{ chatFriend.remark || '未设置' }}</span><span class="cs-arrow">›</span></div>
                <div class="cs-row clickable" @click="handleChatStarToggle"><span>{{ chatFriend.is_starred ? '☆ 取消星标' : '⭐ 设为星标' }}</span><span class="cs-arrow">›</span></div>
                <div class="cs-row clickable" @click="openChatFriendPermissions"><span>🔒 好友权限</span><span class="cs-arrow">›</span></div>
              </div>
              <div class="cs-section">
                <button class="cs-clear" @click="handleClearChatHistory">清空聊天记录</button>
              </div>
              <div class="cs-section">
                <div class="cs-row clickable warn" @click="handleChatBlockFriend">🚫 拉黑</div>
                <div class="cs-row clickable danger" @click="handleChatDeleteFriend">🗑️ 删除好友</div>
              </div>
            </template>
            <!-- 群聊设置面板(仿微信) -->
            <template v-if="activeChat?.type==='group' && activeGroup">
              <div class="cs-members">
                <div v-for="m in activeGroup.members.slice(0,8)" :key="m.spark_id" class="cs-member">
                  <SparkAvatar :avatar="m.avatar" :name="m.nickname" size="md" />
                  <span class="cs-mname">{{ m.nickname }}</span>
                  <span v-if="m.role==='owner'" class="cp-role-tag owner sm">群主</span>
                  <span v-else-if="m.role==='admin'" class="cp-role-tag admin sm">管理员</span>
                </div>
                <div class="cs-member cs-add-btn" @click="showToast('邀请成员')"><span class="cs-add-icon">＋</span><span class="cs-mname">添加</span></div>
              </div>
              <!-- 功能菜单区 -->
              <div class="cs-section">
                <div class="cs-row clickable" @click="handleSearchChatHistory"><span>查找聊天内容</span><span class="cs-arrow">›</span></div>
              </div>
              <div class="cs-section">
                <div class="cs-row"><span>消息免打扰</span><label class="cs-toggle"><input type="checkbox" :checked="activeGroup.is_muted" @change="toggleChatMute('group',activeGroup.id)"><span class="cs-slider"></span></label></div>
                <div class="cs-row"><span>置顶聊天</span><label class="cs-toggle"><input type="checkbox" :checked="activeGroup.is_chat_pinned" @change="toggleChatPin('group',activeGroup.id)"><span class="cs-slider"></span></label></div>
              </div>
              <!-- 群公告 -->
              <div v-if="activeGroup.announcement" class="cs-section">
                <div class="cs-row"><span>📢 群公告</span></div>
                <p class="cs-announcement">{{ activeGroup.announcement }}</p>
              </div>
              <!-- 群管理入口 -->
              <div class="cs-section" v-if="myGroupRole==='owner'||myGroupRole==='admin'">
                <div class="cs-row clickable" @click="showGroupMgmt=!showGroupMgmt"><span>⚙️ 群管理</span><span class="cs-arrow">›</span></div>
              </div>
              <template v-if="showGroupMgmt">
                <!-- 修改群名 -->
                <div class="cs-section">
                  <div class="cs-row"><span>修改群名</span></div>
                  <div class="cs-mgmt-input"><input v-model="groupRenameInput" :placeholder="activeGroup.name" maxlength="30"><button @click="handleRenameGroup">确定</button></div>
                </div>
                <!-- 群公告 -->
                <div class="cs-section">
                  <div class="cs-row"><span>群公告</span></div>
                  <div class="cs-mgmt-input"><input v-model="groupAnnouncementInput" placeholder="输入群公告..."><button @click="handleSetAnnouncement">发布</button></div>
                </div>
                <!-- 成员管理 -->
                <div class="cs-section">
                  <div class="cs-row"><span>成员管理</span></div>
                  <div v-for="m in activeGroup.members" :key="m.spark_id" class="cs-member-row">
                    <SparkAvatar :avatar="m.avatar" :name="m.nickname" size="xs" />
                    <span class="cs-member-name">{{ m.nickname }}</span>
                    <span v-if="m.role==='owner'" class="cp-role-tag owner sm">群主</span>
                    <span v-else-if="m.role==='admin'" class="cp-role-tag admin sm">管理员</span>
                    <div v-if="m.spark_id!==myProfile?.spark_id && m.spark_id!==activeGroup.owner_id" class="cs-member-acts">
                      <button v-if="myGroupRole==='owner'" @click="handleSetAdmin(m.spark_id, m.role!=='admin')" class="cs-act-btn">{{ m.role==='admin'?'取消管理':'设为管理' }}</button>
                      <button v-if="myGroupRole==='owner'" @click="handleTransferOwner(m.spark_id)" class="cs-act-btn warn">转让群主</button>
                      <button v-if="myGroupRole==='owner'||(myGroupRole==='admin'&&m.role==='member')" @click="handleKickMember(m.spark_id)" class="cs-act-btn danger">移出</button>
                    </div>
                  </div>
                </div>
                <!-- 解散群聊 -->
                <div v-if="myGroupRole==='owner'" class="cs-section">
                  <button class="cs-clear" @click="handleDisbandGroup">🗑️ 解散群聊</button>
                </div>
              </template>
              <div class="cs-section">
                <button class="cs-clear" @click="handleClearChatHistory">清空聊天记录</button>
              </div>
            </template>
          </div>
        </Transition>
      </div>
      <div class="cp-input-area">
        <Transition name="fade"><div v-if="showEmoji" class="cp-emoji-panel"><button v-for="e in EMOJIS" :key="e" @click="chatInput+=e;showEmoji=false">{{ e }}</button></div></Transition>
        <!-- @提及选择器 -->
        <Transition name="fade">
          <div v-if="showMentionPicker && activeChat?.type==='group'" class="cp-mention-picker">
            <div class="cp-mention-header">选择提及成员</div>
            <div v-for="m in filteredMentionMembers" :key="m.spark_id" class="cp-mention-item" @click="selectMention(m)">
              <SparkAvatar :avatar="m.avatar" :name="m.nickname" size="xs" />
              <span class="cp-mention-name">{{ m.nickname }}</span>
              <span v-if="m.role==='owner'" class="cp-role-tag owner sm">群主</span>
              <span v-else-if="m.role==='admin'" class="cp-role-tag admin sm">管理员</span>
            </div>
            <p v-if="!filteredMentionMembers.length" class="cp-empty">无匹配成员</p>
          </div>
        </Transition>
        <!-- 待发送文件预览 -->
        <div v-if="pendingFiles.length" class="cp-pending-files">
          <div v-for="(f,i) in pendingFiles" :key="i" class="cp-pf-chip">
            <img v-if="f.type==='image'" :src="f.url" class="cp-pf-thumb">
            <span v-else>📄</span>
            <span class="cp-pf-name">{{ f.name }}</span>
            <button @click="clearPendingFile(i)">×</button>
          </div>
          <div class="cp-pf-actions">
            <button class="cp-pf-cancel" @click="clearAllPendingFiles">取消</button>
            <button class="cp-pf-send" @click="handleSendPendingFiles">发送</button>
          </div>
        </div>
        <!-- 引用消息预览 -->
        <div v-if="quoteMsg" class="cp-quote-preview">
          <div class="cp-quote-content">
            <span class="cp-quote-name">{{ quoteMsg.sender_name }}:</span>
            <span class="cp-quote-text">{{ quoteMsg.content.slice(0,60) }}</span>
          </div>
          <button @click="quoteMsg=null">×</button>
        </div>
        <!-- 语音录制面板 -->
        <Transition name="fade">
          <div v-if="isRecording||showVoicePanel" class="cp-voice-panel">
            <div v-if="isRecording" class="cp-voice-recording">
              <div class="cp-voice-wave">
                <span v-for="i in 12" :key="i" class="cp-wave-bar" :style="{animationDelay:i*0.08+'s'}"></span>
              </div>
              <span class="cp-voice-timer">{{ formatVoiceDuration(voiceDuration) }}</span>
            </div>
            <div class="cp-voice-actions">
              <button v-if="isRecording" class="cp-voice-cancel" @click="cancelRecording">✕ 取消</button>
              <button v-if="!isRecording" class="cp-voice-start" @mousedown="startRecording" @touchstart.prevent="startRecording">🎙️ 按住说话</button>
              <button v-if="isRecording" class="cp-voice-stop" @click="stopRecording">✓ 发送</button>
              <button v-if="isRecording" class="cp-voice-text" @click="stopAndConvertToText">文 转文字</button>
            </div>
          </div>
        </Transition>
        <!-- 多选操作栏 -->
        <div v-if="multiSelectMode" class="cp-multi-bar">
          <span>已选 {{ selectedMsgIds.length }} 条</span>
          <button @click="handleMultiForward">📤 转发</button>
          <button @click="handleMultiDelete" class="del">🗑️ 删除</button>
          <button @click="multiSelectMode=false;selectedMsgIds=[]">取消</button>
        </div>
        <div class="cp-tools">
          <button @click="showEmoji=!showEmoji" :class="{active:showEmoji}">😊</button>
          <button @click="fileInput?.click()">🖼️</button>
          <button @click="fileInput?.click()">📎</button>
          <button @click="toggleVoicePanel" :class="{active:showVoicePanel}">🎙️</button>
          <div class="cp-tools-r"><button @click="showToast('语音通话开发中')">📞</button><button @click="showToast('视频通话开发中')">📹</button></div>
        </div>
        <input ref="fileInput" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.zip" @change="onFileInput" style="display:none">
        <div class="cp-input-row">
          <textarea v-model="chatInput" :placeholder="activeChat?.type==='group'?'@星火 唤AI · 输入消息...':'输入消息...'" rows="1" @keydown.enter.exact.prevent="handleChatSend" @input="onChatInputForMention" @focus="showEmoji=false"></textarea>
          <button class="cp-send" :disabled="!chatInput.trim()||isAiTyping" @click="handleChatSend"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        </div>
      </div>
    </main>

    <!-- 通讯录资料卡(仿微信) -->
    <main v-else-if="rightPanel==='contact'" class="cp-main cp-profile-card">
      <div class="pf-header">
        <SparkAvatar :avatar="selectedContact?.avatar||''" :name="selectedContact?.nickname||''" size="lg" clickable @click="selectedContact&&showProfilePopup(selectedContact)" />
        <div class="pf-info">
          <h2>
            <span v-if="selectedContact?.is_starred" class="pf-star">⭐</span>
            {{ selectedContact?.remark ? selectedContact.nickname + '（' + selectedContact.remark + '）' : selectedContact?.nickname }}
          </h2>
          <p class="pf-sub">星火ID：{{ selectedContact?.spark_id }}</p>
          <p v-if="getContactMeta(selectedContact)" class="pf-sub pf-meta">{{ getContactMeta(selectedContact) }}</p>
        </div>
      </div>
      <div class="pf-section">
        <div class="pf-row clickable" @click="openContactRemarkEdit"><span class="pf-label">备注</span><span class="pf-val">{{ selectedContact?.remark||'未设置' }}</span><span class="pf-arrow">›</span></div>
      </div>
      <div class="pf-section">
        <div class="pf-row clickable" @click="handleContactStarToggle"><span class="pf-label">星标好友</span><span class="pf-val">{{ selectedContact?.is_starred ? '⭐ 已星标' : '☆ 未星标' }}</span><span class="pf-arrow">›</span></div>
      </div>
      <div class="pf-section">
        <div class="pf-row clickable" @click="showToast('查看星火域')"><span class="pf-label">星火域</span><div class="pf-moments-preview"><span v-for="m in contactMoments(selectedContact?.spark_id||'').slice(0,3)" :key="m.id" class="pf-moment-thumb">📝</span></div><span class="pf-arrow">›</span></div>
      </div>
      <div class="pf-section">
        <div class="pf-row"><span class="pf-label">来源</span><span class="pf-val">通过星火ID添加</span></div>
      </div>
      <div class="pf-section pf-danger-zone">
        <button class="pf-action-link warn" @click="handleContactBlock">🚫 拉黑</button>
        <button class="pf-action-link danger" @click="handleRemoveFriend(selectedContact!.spark_id)">🗑️ 删除联系人</button>
      </div>
      <div class="pf-actions">
        <button class="pf-btn primary" @click="openPrivateChat(selectedContact!.spark_id)"><span>💬</span>发消息</button>
        <button class="pf-btn" @click="showToast('语音通话开发中')"><span>📞</span>语音聊天</button>
        <button class="pf-btn" @click="showToast('视频通话开发中')"><span>📹</span>视频聊天</button>
      </div>
    </main>

    <!-- 动态星火域(双栏布局) / 默认欢迎页 -->
    <main v-else class="cp-main cp-main-feed">
      <div v-if="sideTab==='moments'" class="cp-moments-dual" :class="{'is-dragging':isDraggingDivider}">
        <!-- 左栏：我的专区 -->
        <div class="cp-ml" :style="{width: momentLeftWidth+'%', minWidth:'200px'}">
          <!-- 背景图/视频区域 -->
          <div class="cp-ml-bg" :class="{expanded:bgExpanded}" @click="bgExpanded=!bgExpanded">
            <div v-if="customBgUrl" class="cp-ml-bg-img" :style="{backgroundImage:'url('+customBgUrl+')'}"></div>
            <div v-else class="cp-ml-bg-default"></div>
            <button class="cp-ml-bg-upload" @click.stop="bgFileInput?.click()" title="更换背景">📷</button>
            <input ref="bgFileInput" type="file" accept="image/*" @change="onBgFileSelect" style="display:none">
          </div>
          <!-- 用户信息 -->
          <div class="cp-ml-profile">
            <SparkAvatar :avatar="myProfile?.avatar||''" :avatar-url="myProfile?.avatar_url" :name="myProfile?.nickname||''" size="lg" />
            <div class="cp-ml-pinfo">
              <b>{{ myProfile?.nickname }}</b>
              <p>{{ myProfile?.bio || '这个人很懒，什么都没留下' }}</p>
            </div>
            <button class="cp-ml-gear" @click.stop="showVisibilitySettings=!showVisibilitySettings" title="动态可见范围设置">⚙️</button>
          </div>
          <!-- 可见性设置面板 -->
          <Transition name="fade">
            <div v-if="showVisibilitySettings" class="cp-vis-panel">
              <h4>动态可见范围</h4>
              <div class="cp-vis-opts">
                <label v-for="opt in visibilityOptions" :key="opt.value" class="cp-vis-opt" :class="{active:momentVisibilitySettings.timeRange===opt.value}">
                  <input type="radio" name="vis-range" :value="opt.value" :checked="momentVisibilitySettings.timeRange===opt.value" @change="handleVisibilityChange(opt.value as any)">
                  <span>{{ opt.label }}</span>
                </label>
              </div>
              <div class="cp-vis-toggle">
                <span>允许陌生人查看</span>
                <label class="cs-toggle"><input type="checkbox" :checked="momentVisibilitySettings.allowStrangers" @change="updateMomentVisibility({allowStrangers:!momentVisibilitySettings.allowStrangers})"><span class="cs-slider"></span></label>
              </div>
            </div>
          </Transition>
          <!-- 发布动态按钮 -->
          <div class="cp-ml-publish">
            <button class="cp-publish-btn" @click="showPublishModal=true">✨ 发布动态</button>
          </div>
          <!-- 我的动态列表 -->
          <div class="cp-ml-list">
            <h4 class="cp-ml-title">我的动态</h4>
            <div v-for="m in myMoments" :key="m.id" class="cp-feed-card" :class="{'is-pinned':m.is_pinned}">
              <div class="cp-feed-head">
                <span v-if="m.is_pinned" class="cp-pin-badge">📌 置顶</span>
                <span v-if="isMomentLive(m)" class="cp-live-badge"><span class="cp-live-dot-sm"></span>LIVE</span>
                <small>{{ formatTimeAgo(m.created_at) }}</small>
                <div class="cp-feed-menu-wrap">
                  <button class="cp-feed-dots" @click.stop="toggleMomentMenu(m.id)">⋯</button>
                  <div v-if="momentMenuId===m.id" class="cp-feed-dropdown">
                    <button @click.stop="handleTogglePin(m.id)">{{ m.is_pinned ? '取消置顶' : '📌 置顶' }}</button>
                    <button class="del" @click.stop="handleDeleteMoment(m.id)">🗑️ 删除</button>
                  </div>
                </div>
              </div>
              <p class="cp-feed-text">{{ m.content }}</p>
              <div class="cp-feed-acts">
                <button :class="{liked:m.likes.includes(myProfile?.spark_id||'')}" @click="toggleLike(m.id)">❤️ {{ m.likes.length||'' }}</button>
                <button @click="expandedComments[m.id]=!expandedComments[m.id]">💬 {{ m.comments.length||'' }}</button>
              </div>
              <div v-if="expandedComments[m.id]" class="cp-comments">
                <div v-for="c in m.comments" :key="c.id" class="cp-cmt"><b>{{ c.author_name }}：</b>{{ c.content }}</div>
                <div class="cp-cmt-input"><input v-model="commentInputs[m.id]" placeholder="评论..." @keydown.enter="handleComment(m.id)"><button @click="handleComment(m.id)">发</button></div>
              </div>
            </div>
            <p v-if="!myMoments.length" class="cp-empty">你还没有发布动态 🌟</p>
          </div>
        </div>
        <!-- 拖拽分隔条 -->
        <div class="cp-divider" :class="{active:isDraggingDivider}" @mousedown="onDividerMouseDown"></div>
        <!-- 右栏：所有好友动态 -->
        <div class="cp-mr">
          <h3 class="cp-mr-title">星火域</h3>
          <div v-for="m in allMoments" :key="m.id" class="cp-feed-card">
            <div class="cp-feed-head">
              <SparkAvatar :avatar="m.author_avatar" :name="m.author_name" size="sm" />
              <div class="cp-feed-info"><b>{{ m.author_name }}</b><small>{{ formatTimeAgo(m.created_at) }}</small></div>
              <span v-if="isMomentLive(m)" class="cp-live-badge"><span class="cp-live-dot-sm"></span>LIVE</span>
              <div v-if="m.author_id===myProfile?.spark_id" class="cp-feed-menu-wrap">
                <button class="cp-feed-dots" @click.stop="toggleMomentMenu(m.id)">⋯</button>
                <div v-if="momentMenuId===m.id" class="cp-feed-dropdown">
                  <button @click.stop="handleTogglePin(m.id)">{{ m.is_pinned ? '取消置顶' : '📌 置顶' }}</button>
                  <button class="del" @click.stop="handleDeleteMoment(m.id)">🗑️ 删除</button>
                </div>
              </div>
            </div>
            <p class="cp-feed-text">{{ m.content }}</p>
            <div class="cp-feed-acts">
              <button :class="{liked:m.likes.includes(myProfile?.spark_id||'')}" @click="toggleLike(m.id)">❤️ {{ m.likes.length||'' }}</button>
              <button @click="expandedComments[m.id]=!expandedComments[m.id]">💬 {{ m.comments.length||'' }}</button>
              <button @click="showToast('分享功能开发中')">🚀 分享</button>
            </div>
            <div v-if="expandedComments[m.id]" class="cp-comments">
              <div v-for="c in m.comments" :key="c.id" class="cp-cmt"><b>{{ c.author_name }}：</b>{{ c.content }}</div>
              <div class="cp-cmt-input"><input v-model="commentInputs[m.id]" placeholder="评论..." @keydown.enter="handleComment(m.id)"><button @click="handleComment(m.id)">发</button></div>
            </div>
          </div>
          <p v-if="!allMoments.length" class="cp-empty">还没有动态，发一条吧 🌟</p>
        </div>
      </div>
      <div v-else class="cp-welcome">
        <div class="cp-welcome-icon">💬</div>
        <h3>星火伴侣</h3>
        <p>选择一个对话开始聊天</p>
        <div class="cp-stats" v-if="myProfile"><div class="cp-stat"><span>{{ friends.length }}</span>好友</div><div class="cp-stat"><span>{{ groups.length }}</span>群聊</div><div class="cp-stat"><span>{{ moments.length }}</span>动态</div></div>
      </div>
    </main>

    <!-- 弹窗们 -->

    <!-- ===== 转发Modal（微信风格：居中+搜索+多选） ===== -->
    <Transition name="fade">
      <div v-if="showForwardPicker" class="cp-overlay" @click.self="showForwardPicker=false">
        <div class="cp-modal cp-forward-modal">
          <h3>📤 选择转发对象</h3>
          <div class="cp-field"><input v-model="forwardSearch" placeholder="搜索好友或群聊..." /></div>
          <div class="cp-forward-tabs">
            <button :class="{active:forwardTab==='friends'}" @click="forwardTab='friends'">好友</button>
            <button :class="{active:forwardTab==='groups'}" @click="forwardTab='groups'">群聊</button>
          </div>
          <div class="cp-forward-list">
            <template v-if="forwardTab==='friends'">
              <div v-for="f in forwardFilteredFriends" :key="f.spark_id" class="cp-forward-item" @click="toggleForwardTarget('friend',f.spark_id,f.remark||f.nickname)">
                <div class="cp-msg-checkbox" :class="{checked:forwardTargets.some(t=>t.id===f.spark_id)}"><span v-if="forwardTargets.some(t=>t.id===f.spark_id)">✓</span></div>
                <SparkAvatar :avatar="f.avatar" :name="f.nickname" size="sm" />
                <span>{{ f.remark||f.nickname }}</span>
              </div>
            </template>
            <template v-if="forwardTab==='groups'">
              <div v-for="g in forwardFilteredGroups" :key="g.id" class="cp-forward-item" @click="toggleForwardTarget('group',g.id,g.name)">
                <div class="cp-msg-checkbox" :class="{checked:forwardTargets.some(t=>t.id===g.id)}"><span v-if="forwardTargets.some(t=>t.id===g.id)">✓</span></div>
                <SparkAvatar :avatar="g.avatar" :name="g.name" size="sm" />
                <span>{{ g.name }}</span>
              </div>
            </template>
            <p v-if="(forwardTab==='friends'?forwardFilteredFriends:forwardFilteredGroups).length===0" class="cp-empty">无匹配结果</p>
          </div>
          <!-- 已选列表 -->
          <div v-if="forwardTargets.length" class="cp-forward-selected">
            <span v-for="t in forwardTargets" :key="t.id" class="cp-forward-chip">{{ t.name }} <button @click="removeForwardTarget(t.id)">×</button></span>
          </div>
          <div class="cp-modal-btns">
            <button @click="showForwardPicker=false">取消</button>
            <button class="primary" :disabled="!forwardTargets.length" @click="executeForward">发送({{ forwardTargets.length }})</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 聊天记录搜索Modal（微信风格：分类Tab） ===== -->
    <Transition name="fade">
      <div v-if="showChatHistorySearch" class="cp-overlay" @click.self="showChatHistorySearch=false">
        <div class="cp-modal cp-history-modal">
          <h3>🔍 查找聊天记录</h3>
          <div class="cp-field"><input v-model="historySearchQuery" placeholder="搜索..." @input="performHistorySearch" /></div>
          <div class="cp-history-tabs">
            <button :class="{active:historyTab==='all'}" @click="historyTab='all';performHistorySearch()">全部</button>
            <button :class="{active:historyTab==='file'}" @click="historyTab='file';performHistorySearch()">文件</button>
            <button :class="{active:historyTab==='image'}" @click="historyTab='image';performHistorySearch()">图片与视频</button>
            <button :class="{active:historyTab==='link'}" @click="historyTab='link';performHistorySearch()">链接</button>
            <button :class="{active:historyTab==='date'}" @click="historyTab='date';performHistorySearch()">日期</button>
          </div>
          <!-- 日期选择 -->
          <div v-if="historyTab==='date'" class="cp-history-date">
            <input type="date" v-model="historyDateFilter" @change="performHistorySearch" />
          </div>
          <div class="cp-history-results">
            <div v-for="r in historySearchResults" :key="r.id" class="cp-history-item" @click="jumpToMessage(r.id)">
              <SparkAvatar :avatar="r.sender_avatar" :avatar-url="r.sender_avatar_url" :name="r.sender_name" size="xs" />
              <div class="cp-history-info">
                <div class="cp-history-name">{{ r.sender_name }} <span class="cp-history-time">{{ formatHistoryDate(r.created_at) }}</span></div>
                <div class="cp-history-content">{{ r.content.slice(0,80) }}</div>
              </div>
            </div>
            <p v-if="historySearchQuery.trim() && !historySearchResults.length" class="cp-empty">未找到相关聊天记录</p>
            <p v-if="!historySearchQuery.trim() && historyTab!=='date'" class="cp-empty cp-hint">输入关键词搜索聊天记录</p>
          </div>
          <div class="cp-modal-btns"><button @click="showChatHistorySearch=false">关闭</button></div>
        </div>
      </div>
    </Transition>

    <Transition name="fade"><div v-if="showSearchModal" class="cp-overlay" @click.self="showSearchModal=false"><div class="cp-modal"><h3>🔍 搜索</h3><div class="cp-field"><input v-model="globalSearch" placeholder="搜索好友、群聊..." @input="debouncedSearch"></div><div v-if="globalSearchResults.length" class="cp-search-results"><div v-for="r in globalSearchResults" :key="r.id" class="cp-search-item" @click="r.action();showSearchModal=false"><SparkAvatar :avatar="r.avatar" :name="r.name" size="sm" /><div class="cp-contact-info"><span class="cp-contact-name">{{ r.name }}</span><span class="cp-contact-id">{{ r.desc }}</span></div></div></div><p v-else-if="globalSearch.trim()" class="cp-empty">无结果</p><button class="cp-close-btn" @click="showSearchModal=false">关闭</button></div></div></Transition>
    <Transition name="fade"><div v-if="showAddFriendModal" class="cp-overlay" @click.self="showAddFriendModal=false"><div class="cp-modal sm"><h3>👤 添加好友</h3><div class="cp-field"><label>星火ID 或昵称</label><input v-model="addFriendQuery" placeholder="输入星火ID..." @keydown.enter="handleSearchFriend"></div><button class="cp-save-btn" @click="handleSearchFriend">🔍 搜索</button><p v-if="addFriendResult" class="cp-search-result">找到：{{ addFriendResult.nickname }}<button class="cp-add-btn" @click="handleAddFriendResult">✓ 添加</button></p><div class="cp-modal-btns"><button @click="showAddFriendModal=false">关闭</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showQRModal" class="cp-overlay" @click.self="showQRModal=false"><div class="cp-modal sm"><h3>📱 星火名片</h3><div class="cp-qr-card"><div class="cp-qr-top"><span class="cp-qr-av">{{ myProfile?.avatar }}</span><div><div class="cp-qr-name">{{ myProfile?.nickname }}</div><div class="cp-qr-id">{{ myProfile?.spark_id }}</div></div></div><canvas ref="userQrCanvas" class="cp-qr-canvas"></canvas></div><div class="cp-qr-paste"><p>📋 粘贴二维码数据</p><div class="cp-id-row"><input v-model="qrPasteInput" placeholder="粘贴..."><button @click="handleQRPaste">添加</button></div></div><div class="cp-modal-btns"><button @click="showQRModal=false">关闭</button><button class="primary" @click="copyQRData">📋 复制名片</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showGroupQR" class="cp-overlay" @click.self="showGroupQR=false"><div class="cp-modal sm"><h3>📱 群二维码</h3><div class="cp-qr-card"><div class="cp-qr-top"><span class="cp-qr-av">{{ activeGroup?.avatar }}</span><div><div class="cp-qr-name">{{ activeGroup?.name }}</div></div></div><canvas ref="groupQrCanvas" class="cp-qr-canvas"></canvas></div><div class="cp-modal-btns"><button @click="showGroupQR=false">关闭</button><button class="primary" @click="copyGroupQR">📋 复制</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showCreateModal" class="cp-overlay" @click.self="showCreateModal=false"><div class="cp-modal"><h3>👥 创建群聊</h3><div class="cp-field"><label>群聊名称</label><input v-model="newGroupName" maxlength="30" placeholder="名字"></div><label class="cp-check"><input type="checkbox" v-model="newGroupAI"> 🌟 星火AI参与群聊</label><div v-if="friends.length" class="cp-member-sel"><p class="cp-field-label">选择成员</p><label v-for="f in friends" :key="f.id" class="cp-member-opt"><input type="checkbox" :value="f.spark_id" v-model="newGroupMembers"> {{ f.avatar }} {{ f.nickname }}</label></div><div class="cp-modal-btns"><button @click="showCreateModal=false">取消</button><button class="primary" :disabled="!newGroupName.trim()" @click="handleCreateGroup">🚀 创建</button></div></div></div></Transition>

    <!-- 发布动态编辑器弹窗 -->
    <Transition name="fade">
      <div v-if="showPublishModal" class="cp-overlay" @click.self="showPublishModal=false">
        <div class="cp-modal cp-publish-modal">
          <h3>✨ 发布动态</h3>
          <textarea v-model="publishContent" placeholder="分享你的想法..." rows="4" maxlength="500" class="cp-pub-text"></textarea>
          <!-- 图片/视频预览网格 -->
          <div v-if="publishImages.length||publishVideos.length" class="cp-pub-grid">
            <div v-for="(img,i) in publishImages" :key="'pi'+i" class="cp-pub-item" draggable="true" @dragstart="dragIdx=i" @dragover.prevent @drop.prevent="onPublishDrop(i)">
              <img :src="img.url" class="cp-pub-thumb">
              <button class="cp-pub-remove" @click="removePublishImage(i)">×</button>
              <span class="cp-pub-idx">{{ i+1 }}</span>
            </div>
            <div v-for="(vid,i) in publishVideos" :key="'pv'+i" class="cp-pub-item video">
              <video :src="vid.url" class="cp-pub-thumb"></video>
              <span class="cp-pub-vid-tag">▶ 视频</span>
              <button class="cp-pub-remove" @click="removePublishVideo(i)">×</button>
            </div>
          </div>
          <div class="cp-pub-media-count" v-if="publishImages.length||publishVideos.length">
            图片 {{ publishImages.length }}/{{ maxImagesAllowed }} · 视频 {{ publishVideos.length }}/1
          </div>
          <!-- 文件附件预览 -->
          <div v-if="publishFiles.length" class="cp-pub-files">
            <div v-for="(f,i) in publishFiles" :key="'pf'+i" class="cp-pub-file-chip">
              <span>📄</span>
              <span class="cp-pub-file-name">{{ f.name }}</span>
              <span class="cp-pub-file-size">{{ formatPublishFileSize(f.size) }}</span>
              <button @click="publishFiles.splice(i,1)">×</button>
            </div>
          </div>
          <!-- 工具栏 -->
          <div class="cp-pub-tools">
            <button @click="publishFileInput?.click()" title="添加图片/视频">🖼️</button>
            <button @click="onPublishFileAttach" title="添加文件">📎</button>
            <label class="cp-pub-live-toggle" :class="{active:publishIsLive}">
              <input type="checkbox" v-model="publishIsLive">
              <span class="cp-pub-live-dot"></span>LIVE
            </label>
            <select v-model="publishVis" class="cp-pub-vis-sel">
              <option value="public">🌐 公开</option>
              <option value="friends">👥 好友</option>
              <option value="private">🔒 私密</option>
            </select>
          </div>
          <input ref="publishFileInput" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar,.ppt,.pptx,.xls,.xlsx" @change="onPublishFileSelect" style="display:none">
          <div class="cp-modal-btns">
            <button @click="showPublishModal=false">取消</button>
            <button class="primary" :disabled="!publishContent.trim()" @click="handlePublish">🚀 发布</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 个人名片弹窗 -->
    <ProfilePopup
      :visible="profilePopupVisible"
      :profile="profilePopupData"
      :moment-count="profilePopupMomentCount"
      position="center"
      @close="profilePopupVisible=false"
      @action="handleProfileAction"
      @update-remark="handleProfileRemarkUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useCompanion, formatTimeAgo, formatMsgTime as formatMsgTimeUtil, shouldShowTimeSeparator, type Friend, type ChatMsg, type GroupChat } from '../../composables/useCompanion'
import CosmicBackground from '../../components/CosmicBackground.vue'
import SparkAvatar from '../../components/SparkAvatar.vue'
import ProfilePopup from '../../components/ProfilePopup.vue'
import QRCode from 'qrcode'

const {
  myProfile, friends, groups, moments, isAiTyping, getQRData,
  addFriend, addFriendByQR, removeFriend, getPrivateChat, clearPrivateChat, sendPrivateMsg,
  markMessagesAsRead, createGroup, sendGroupMsg, sendGroupMsgWithMentions, postMoment, toggleLike,
  commentMoment, deleteMoment, togglePinMoment, addFavorite, sendToAI, aiChatHistory, searchUser,
  updateProfile, favorites, recallMessage, sendPokeMessage, setFriendRemark,
  getMemberRole, setGroupAdmin, kickGroupMember, disbandGroup, transferGroupOwner, setGroupAnnouncement, renameGroup,
  friendTags, toggleStarFriend, blockFriend, unblockFriend, updateFriendPermissions, getFriendPermissions,
  momentVisibilitySettings, updateMomentVisibility, filterMomentsByVisibility, isMomentLive,
} = useCompanion()

const EMOJIS = ['😀','😂','🤣','😊','😍','🥰','😘','😜','🤗','🤔','😏','😭','😡','🥺','😴','🤮','😷','🤯','🥳','😎','🤩','😤','🙄','😱','🤡','👍','👎','👏','🙏','💪','❤️','💔','🔥','⭐','🎉','🎊','💯','✅','🚀','🌟','💡','📚','🎯','🎵','🎮','🏆','🌈','☀️','🌙','⚡','🌸','🍀','🐱','🐶','🦊','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦋','🐝','🌹','🍎','🍕','🍔','🍦','☕','🎂','🎁','💎','🔑','💌','🎈','📱','💻']

const sideTab = ref<'chat'|'contacts'|'moments'>('chat')
const rightPanel = ref<'none'|'chat'|'contact'>('none')
const activeChat = ref<{id:string;type:'private'|'group'|'ai'}|null>(null)
const selectedContact = ref<Friend|null>(null)
const chatInput = ref('')
const chatScrollRef = ref<HTMLElement|null>(null)
const toast = reactive({ show: false, msg: '' })
const isMobile = ref(window.innerWidth < 768)
const showEmoji = ref(false)
const showChatSettings = ref(false)
const isDragging = ref(false)
const pendingFiles = ref<{type:string;name:string;url?:string}[]>([])
const fileInput = ref<HTMLInputElement|null>(null)
const viewProfile = ref<Friend|null>(null)
// 个人名片弹窗
const profilePopupVisible = ref(false)
const profilePopupData = ref<{spark_id:string;nickname:string;avatar:string;avatar_url?:string;remark?:string;bio?:string}>({ spark_id: '', nickname: '', avatar: '' })
const profilePopupMomentCount = ref(0)
const profilePopupIsSelf = ref(false)
// 消息右键菜单
const msgCtx = reactive<{show:boolean;x:number;y:number;msgId:string;canRecall:boolean}>({show:false,x:0,y:0,msgId:'',canRecall:false})
// 通讯录分组折叠
const contactGroupExpand = reactive({friends:true,groups:true})
const showSearchModal = ref(false)
const showAddFriendModal = ref(false)
const showQRModal = ref(false)
const showGroupQR = ref(false)
const showCreateModal = ref(false)
const showAddMenu = ref(false)
const confirmDialog = reactive<{show:boolean;title:string;text:string;btnText:string;onConfirm:(()=>void)|null}>({show:false,title:'',text:'',btnText:'确认',onConfirm:null})
const ctxMenu = reactive<{show:boolean;x:number;y:number;type:string;id:string}>({show:false,x:0,y:0,type:'',id:''})
const globalSearch = ref('')
const globalSearchResults = ref<{id:string;name:string;avatar:string;desc:string;action:()=>void}[]>([])
const addFriendQuery = ref('')
const addFriendResult = ref<ReturnType<typeof searchUser>>(null)
const newGroupName = ref(''); const newGroupAI = ref(true); const newGroupMembers = ref<string[]>([])
const postContent = ref(''); const postVis = ref<'public'|'friends'|'private'>('public')
// 星火域双栏状态
const momentLeftWidth = ref(32) // 左栏宽度百分比
const isDraggingDivider = ref(false)
const bgExpanded = ref(false) // 背景图放大状态
const customBgUrl = ref('') // 自定义背景图
const bgFileInput = ref<HTMLInputElement|null>(null)
const momentMenuId = ref<string|null>(null) // 当前显礼菜单的动态ID
const expandedComments = reactive<Record<string,boolean>>({})
const commentInputs = reactive<Record<string,string>>({})
const userQrCanvas = ref<HTMLCanvasElement|null>(null)
const groupQrCanvas = ref<HTMLCanvasElement|null>(null)
const qrPasteInput = ref('')
// @提及功能
const showMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionIds = ref<string[]>([])
// 群管理状态
const showGroupMgmt = ref(false)
const groupRenameInput = ref('')
const groupAnnouncementInput = ref('')
// 发布编辑器弹窗
const showPublishModal = ref(false)
const publishContent = ref('')
const publishVis = ref<'public'|'friends'|'private'>('public')
const publishIsLive = ref(false)
const publishImages = ref<{url:string;name:string;blob?:boolean}[]>([])
const publishVideos = ref<{url:string;name:string}[]>([])
const publishFiles = ref<{url:string;name:string;size:number}[]>([])
const publishFileInput = ref<HTMLInputElement|null>(null)
// 拖拽排序
const dragIdx = ref<number|null>(null)
// 可见性设置面板
const showVisibilitySettings = ref(false)
// ====== 语音消息 ======
const showVoicePanel = ref(false)
const isRecording = ref(false)
const voiceDuration = ref(0)
let voiceTimer: ReturnType<typeof setInterval> | null = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
// ====== 转发选择器 ======
const showForwardPicker = ref(false)
const forwardMsgId = ref('')
// ====== 引用消息 ======
const quoteMsg = ref<ChatMsg | null>(null)
// ====== 多选模式 ======
const multiSelectMode = ref(false)
const selectedMsgIds = ref<string[]>([])
// ====== 翻译缓存 ======
const translatedMessages = reactive<Record<string, string>>({})
// ====== 转发Modal（重做版） ======
const forwardSearch = ref('')
const forwardTab = ref<'friends'|'groups'>('friends')
const forwardTargets = ref<{type:string;id:string;name:string}[]>([])
const forwardFilteredFriends = computed(() => {
  const q = forwardSearch.value.toLowerCase()
  return friends.value.filter(f => !q || f.nickname.toLowerCase().includes(q) || (f.remark||'').toLowerCase().includes(q))
})
const forwardFilteredGroups = computed(() => {
  const q = forwardSearch.value.toLowerCase()
  return groups.value.filter(g => !q || g.name.toLowerCase().includes(q))
})
// ====== 聊天记录搜索 ======
const showChatHistorySearch = ref(false)
const historySearchQuery = ref('')
const historyTab = ref<'all'|'file'|'image'|'link'|'date'>('all')
const historyDateFilter = ref('')
const historySearchResults = ref<ChatMsg[]>([])
// ====== 语音播放 ======
const playingVoiceId = ref('')
let currentAudio: HTMLAudioElement | null = null
// ====== 过滤后的消息列表（排除已删除） ======
const deletedMsgIds = ref<string[]>([])
const filteredChatMessages = computed(() => {
  return chatMessages.value.filter(m => !deletedMsgIds.value.includes(m.id))
})

const activeGroup = computed(()=>activeChat.value?.type==='group'?groups.value.find(g=>g.id===activeChat.value!.id):null)
const chatTitle = computed(()=>{
  if(!activeChat.value)return''
  if(activeChat.value.type==='ai')return'🌟 星火AI伙伴'
  if(activeChat.value.type==='group')return activeGroup.value?.name||'群聊'
  const f=friends.value.find(f=>f.spark_id===activeChat.value!.id)
  return f?.remark||f?.nickname||'私聊'
})
const chatMessages = computed(()=>{
  if(!activeChat.value)return[]
  if(activeChat.value.type==='ai')return aiChatHistory.value
  if(activeChat.value.type==='group')return activeGroup.value?.messages||[]
  return getPrivateChat(activeChat.value.id)
})
const sortedFriends = computed(()=>[...friends.value].sort((a,b)=>{
  // 置顶优先
  if(a.is_chat_pinned&&!b.is_chat_pinned)return-1;if(!a.is_chat_pinned&&b.is_chat_pinned)return 1
  if(a.unread&&!b.unread)return-1;if(!a.unread&&b.unread)return 1
  const ta=a.last_msg_time?new Date(a.last_msg_time).getTime():0
  const tb=b.last_msg_time?new Date(b.last_msg_time).getTime():0
  return tb-ta
}))
// 群聊列表排序（置顶优先）
const sortedGroups = computed(()=>[...groups.value].sort((a,b)=>{
  if(a.is_chat_pinned&&!b.is_chat_pinned)return-1;if(!a.is_chat_pinned&&b.is_chat_pinned)return 1
  return 0
}))

function showToast(msg:string){toast.msg=msg;toast.show=true;setTimeout(()=>{toast.show=false},2000)}
function switchTab(tab:'chat'|'contacts'|'moments'){sideTab.value=tab;if(tab==='contacts'){rightPanel.value='none';selectedContact.value=null}else if(tab==='moments'){rightPanel.value='none'}}
function openAIChat(){activeChat.value={id:'ai',type:'ai'};rightPanel.value='chat';sideTab.value='chat';scrollChat()}
function openGroupChat(id:string){activeChat.value={id,type:'group'};rightPanel.value='chat';sideTab.value='chat';const g=groups.value.find(g=>g.id===id);if(g)g.unread=0;scrollChat()}
function openPrivateChat(sparkId:string){activeChat.value={id:sparkId,type:'private'};rightPanel.value='chat';sideTab.value='chat';markMessagesAsRead(sparkId);const f=friends.value.find(f=>f.spark_id===sparkId);if(f)f.unread=0;scrollChat()}
function closeRight(){rightPanel.value='none';activeChat.value=null;selectedContact.value=null}
function scrollChat(){nextTick(()=>{if(chatScrollRef.value)chatScrollRef.value.scrollTop=chatScrollRef.value.scrollHeight})}
function selectContact(f:Friend){selectedContact.value=f;rightPanel.value='contact'}
// 聊天中点击⋯→弹出侧面板，showChatFriendCard改为打开资料弹窗
function showChatFriendCard(){if(!activeChat.value||activeChat.value.type!=='private')return;const f=friends.value.find(f=>f.spark_id===activeChat.value!.id);if(f)showProfilePopup(f)}
function handleViewChatFriend(){if(!activeChat.value||activeChat.value.type!=='private')return;const f=friends.value.find(f=>f.spark_id===activeChat.value!.id);if(f)showProfilePopup(f)}
function handleViewMsgSender(msg:ChatMsg){if(msg.sender_type==='ai')return;if(msg.sender_id===myProfile.value?.spark_id){showSelfProfile();return};const f=friends.value.find(f=>f.spark_id===msg.sender_id);if(f)showProfilePopup(f)}
// 显示他人资料卡
function showProfilePopup(f:Friend){
  profilePopupData.value={spark_id:f.spark_id,nickname:f.nickname,avatar:f.avatar,avatar_url:f.profile?.avatar_url,remark:f.remark,bio:f.bio}
  profilePopupMomentCount.value=moments.value.filter(m=>m.author_id===f.spark_id).length
  profilePopupIsSelf.value=false
  profilePopupVisible.value=true
}
// 显示自己资料卡
function showSelfProfile(){
  if(!myProfile.value)return
  profilePopupData.value={spark_id:myProfile.value.spark_id,nickname:myProfile.value.nickname,avatar:myProfile.value.avatar,avatar_url:myProfile.value.avatar_url,remark:undefined,bio:myProfile.value.bio}
  profilePopupMomentCount.value=moments.value.filter(m=>m.author_id===myProfile.value?.spark_id).length
  profilePopupIsSelf.value=true
  profilePopupVisible.value=true
}
function handleProfileAction(action:string){
  profilePopupVisible.value=false
  if(action==='chat'){const sid=profilePopupData.value.spark_id;if(sid&&sid!==myProfile.value?.spark_id)openPrivateChat(sid)}
  else if(action==='moments'){switchTab('moments')}
  else showToast(`${action}功能开发中`)
}
function handleProfileRemarkUpdate(remark:string){
  const sid=profilePopupData.value.spark_id
  if(sid)setFriendRemark(sid,remark)
  profilePopupData.value={...profilePopupData.value,remark}
}
// 碰一碰（右键头像）
function handlePokeAvatar(e:MouseEvent,targetName:string,targetId:string){
  e.preventDefault()
  if(!activeChat.value)return
  if(targetId===myProfile.value?.spark_id)return // 不能碰自己
  sendPokeMessage(activeChat.value.id,targetName,activeChat.value.type==='group'?'group':'private')
  scrollChat()
}
const chatFriend = computed(()=>activeChat.value?.type==='private'?friends.value.find(f=>f.spark_id===activeChat.value!.id):null)
async function handleChatSend(){
  const text=chatInput.value.trim();if(!text||isAiTyping.value)return
  chatInput.value=''
  // 构建引用消息数据
  const quoteData = quoteMsg.value ? { sender_name: quoteMsg.value.sender_name, content: quoteMsg.value.content } : undefined
  quoteMsg.value = null
  if(activeChat.value?.type==='ai'){await sendToAI(text);scrollChat()}
  else if(activeChat.value?.type==='group'){
    if(mentionIds.value.length>0){sendGroupMsgWithMentions(activeChat.value.id,text,[...mentionIds.value]);mentionIds.value=[]}
    else{sendGroupMsg(activeChat.value.id,text)}
    // 如果有引用，给最后一条消息附加quote_msg
    if(quoteData){const msgs=activeGroup.value?.messages;if(msgs?.length)msgs[msgs.length-1].quote_msg=quoteData}
    scrollChat()
  }
  else if(activeChat.value?.type==='private'){
    const msg = sendPrivateMsg(activeChat.value.id,text)
    if(quoteData && msg) msg.quote_msg = quoteData
    scrollChat()
  }
}
function formatMsgTime(s:string){return formatMsgTimeUtil(s)}
function autoResize(e:Event){const el=e.target as HTMLTextAreaElement;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px'}
function showCtxMenu(e:MouseEvent,type:string,id:string){ctxMenu.show=true;ctxMenu.x=e.clientX;ctxMenu.y=e.clientY;ctxMenu.type=type;ctxMenu.id=id}
// 消息右键菜单(仿微信)：2分钟内可撤回
function showMsgCtxMenu(e:MouseEvent,msg:ChatMsg){if(msg.type==='system')return;const isMine=msg.sender_id===myProfile.value?.spark_id;const elapsed=Date.now()-new Date(msg.created_at).getTime();const canRecall=isMine&&elapsed<2*60*1000;if(msg.type==='poke'){if(!canRecall)return;msgCtx.show=true;msgCtx.x=e.clientX;msgCtx.y=e.clientY;msgCtx.msgId=msg.id;msgCtx.canRecall=true;return};msgCtx.show=true;msgCtx.x=e.clientX;msgCtx.y=e.clientY;msgCtx.msgId=msg.id;msgCtx.canRecall=canRecall}
// ===== 消息右键菜单全功能实装（v6.6） =====
function msgCtxAction(action:string){
  msgCtx.show=false
  const msg = chatMessages.value.find(m=>m.id===msgCtx.msgId)
  if(action==='copy'){
    if(msg) navigator.clipboard.writeText(msg.content)
    showToast('已复制')
  } else if(action==='recall'){
    if(!activeChat.value)return
    const chatType=activeChat.value.type==='group'?'group':activeChat.value.type==='ai'?'ai':'private'
    const ok=recallMessage(activeChat.value.id,msgCtx.msgId,chatType)
    showToast(ok ? '消息已撤回' : '撤回失败，可能已超过2分钟')
  } else if(action==='delete'){
    // 真正从视图中移除
    deletedMsgIds.value.push(msgCtx.msgId)
    showToast('已删除')
  } else if(action==='forward'){
    // 打开微信风格转发Modal（居中+搜索+多选）
    forwardMsgId.value = msgCtx.msgId
    forwardSearch.value = ''
    forwardTab.value = 'friends'
    forwardTargets.value = []
    showForwardPicker.value = true
  } else if(action==='favorite'){
    showToast('已收藏')
    if(msg) addFavorite({type:'message',title:'聊天消息',content:msg.content,source:`来自${msg.sender_name}`})
  } else if(action==='quote'){
    if(msg) {
      quoteMsg.value = msg
      showToast('已引用，请输入回复内容')
      nextTick(() => { (document.querySelector('.cp-input-row textarea') as HTMLElement)?.focus() })
    }
  } else if(action==='select'){
    multiSelectMode.value = true
    selectedMsgIds.value = msg ? [msg.id] : []
  } else if(action==='translate'){
    if(msg) translateMessage(msg)
  }
}

// ===== 多选操作 =====
function toggleMsgSelect(msgId: string) {
  const idx = selectedMsgIds.value.indexOf(msgId)
  if (idx >= 0) selectedMsgIds.value.splice(idx, 1)
  else selectedMsgIds.value.push(msgId)
}

// ===== 转发功能（v6.6微信风格：多选+搜索） =====
function toggleForwardTarget(type: string, id: string, name: string) {
  const idx = forwardTargets.value.findIndex(t => t.id === id)
  if (idx >= 0) forwardTargets.value.splice(idx, 1)
  else forwardTargets.value.push({ type, id, name })
}
function removeForwardTarget(id: string) {
  forwardTargets.value = forwardTargets.value.filter(t => t.id !== id)
}
function executeForward() {
  const msgIds = multiSelectMode.value && selectedMsgIds.value.length > 0
    ? selectedMsgIds.value : [forwardMsgId.value]
  const msgs = chatMessages.value.filter(m => msgIds.includes(m.id))
  if (!msgs.length) return
  for (const target of forwardTargets.value) {
    const content = msgs.length === 1
      ? `[转发] ${msgs[0].sender_name}：${msgs[0].content}`
      : `[合并转发] ${msgs.length}条消息\n${msgs.map(m=>`${m.sender_name}: ${m.content.slice(0,20)}`).join('\n')}`
    if (target.type === 'friend') sendPrivateMsg(target.id, content)
    else if (target.type === 'group') sendGroupMsg(target.id, content)
  }
  showToast(`已转发给 ${forwardTargets.value.map(t=>t.name).join('、')}`)
  showForwardPicker.value = false
  forwardTargets.value = []
  if (multiSelectMode.value) { multiSelectMode.value = false; selectedMsgIds.value = [] }
}
function handleMultiForward() {
  if (!selectedMsgIds.value.length) { showToast('请选择消息'); return }
  forwardSearch.value = ''
  forwardTab.value = 'friends'
  forwardTargets.value = []
  showForwardPicker.value = true
}
function handleMultiDelete() {
  deletedMsgIds.value.push(...selectedMsgIds.value)
  showToast(`已删除 ${selectedMsgIds.value.length} 条消息`)
  multiSelectMode.value = false
  selectedMsgIds.value = []
}

// ===== 翻译功能（v6.6 Google翻译） =====
async function translateMessage(msg: ChatMsg) {
  if (translatedMessages[msg.id]) {
    delete translatedMessages[msg.id]
    return
  }
  showToast('正在翻译...')
  try {
    const sourceLang = detectLanguage(msg.content)
    const targetLang = sourceLang === 'zh' ? 'en' : 'zh-CN'
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msg.content.slice(0,1000))}`)
    const data = await res.json()
    if (data?.[0]) {
      const translated = data[0].map((s: any) => s[0]).join('')
      translatedMessages[msg.id] = translated
    } else {
      showToast('翻译失败')
    }
  } catch {
    showToast('翻译服务暂不可用')
  }
}
function detectLanguage(text: string): string {
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  return zhCount > text.length * 0.3 ? 'zh' : 'en'
}

// ===== 语音消息功能（v6.6重做） =====
function toggleVoicePanel() {
  showVoicePanel.value = !showVoicePanel.value
  if (!showVoicePanel.value && isRecording.value) cancelRecording()
}
function formatVoiceDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2,'0')}`
}
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    mediaRecorder.ondataavailable = (e) => { audioChunks.push(e.data) }
    mediaRecorder.start()
    isRecording.value = true
    voiceDuration.value = 0
    voiceTimer = setInterval(() => { voiceDuration.value++ }, 1000)
  } catch {
    showToast('无法访问麦克风，请检查权限设置')
  }
}
function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach(t => t.stop())
  }
  isRecording.value = false
  if (voiceTimer) { clearInterval(voiceTimer); voiceTimer = null }
  audioChunks = []
  showToast('已取消录音')
}
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    const duration = voiceDuration.value
    const blobUrl = URL.createObjectURL(blob)
    // 发送voice类型消息（带可播放URL）
    if (activeChat.value) {
      const voiceMsg: ChatMsg = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
        sender_avatar: myProfile.value!.avatar, sender_avatar_url: myProfile.value!.avatar_url,
        sender_type: 'user', content: '[语音消息]', type: 'voice',
        voice_duration: duration, voice_blob_url: blobUrl,
        is_read: false, created_at: new Date().toISOString(),
      }
      if (activeChat.value.type === 'private') {
        const store = JSON.parse(localStorage.getItem('spark_private_chats') || '{}')
        if (!store[activeChat.value.id]) store[activeChat.value.id] = []
        store[activeChat.value.id].push(voiceMsg)
        localStorage.setItem('spark_private_chats', JSON.stringify(store))
      } else if (activeChat.value.type === 'group') {
        const g = groups.value.find(g => g.id === activeChat.value!.id)
        if (g) g.messages.push(voiceMsg)
      }
      scrollChat()
    }
    mediaRecorder!.stream.getTracks().forEach(t => t.stop())
    isRecording.value = false
    showVoicePanel.value = false
    if (voiceTimer) { clearInterval(voiceTimer); voiceTimer = null }
    showToast(`语音已发送 (${duration}秒)`)
  }
  mediaRecorder.stop()
}
function stopAndConvertToText() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.onstop = () => {
    mediaRecorder!.stream.getTracks().forEach(t => t.stop())
    isRecording.value = false
    showVoicePanel.value = false
    if (voiceTimer) { clearInterval(voiceTimer); voiceTimer = null }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      showToast('正在识别语音...')
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onresult = (event: any) => {
        chatInput.value += event.results[0][0].transcript
        showToast('语音已转为文字')
      }
      recognition.onerror = () => { showToast('语音识别失败') }
      recognition.start()
    } else {
      showToast('浏览器不支持语音识别')
    }
  }
  mediaRecorder.stop()
}
// 播放语音消息
function playVoice(msg: ChatMsg) {
  if (playingVoiceId.value === msg.id) {
    currentAudio?.pause()
    playingVoiceId.value = ''
    return
  }
  currentAudio?.pause()
  if (msg.voice_blob_url) {
    currentAudio = new Audio(msg.voice_blob_url)
    playingVoiceId.value = msg.id
    currentAudio.onended = () => { playingVoiceId.value = '' }
    currentAudio.play().catch(() => { showToast('播放失败'); playingVoiceId.value = '' })
  } else {
    showToast('语音文件不可用')
  }
}

// ===== 聊天记录搜索（微信风格分类Tab） =====
function performHistorySearch() {
  const query = historySearchQuery.value.trim().toLowerCase()
  const msgs = chatMessages.value
  let results: ChatMsg[] = []
  if (historyTab.value === 'date') {
    if (historyDateFilter.value) {
      results = msgs.filter(m => m.created_at.startsWith(historyDateFilter.value))
    } else {
      results = msgs.slice(-50)
    }
  } else if (historyTab.value === 'file') {
    results = msgs.filter(m => m.type === 'file' || m.content.includes('[文件]'))
    if (query) results = results.filter(m => m.content.toLowerCase().includes(query))
  } else if (historyTab.value === 'image') {
    results = msgs.filter(m => m.type === 'image' || m.type === 'video' || m.content.includes('[图片]') || m.content.includes('[视频]'))
    if (query) results = results.filter(m => m.content.toLowerCase().includes(query))
  } else if (historyTab.value === 'link') {
    results = msgs.filter(m => m.content.includes('http://') || m.content.includes('https://'))
    if (query) results = results.filter(m => m.content.toLowerCase().includes(query))
  } else {
    if (query) {
      results = msgs.filter(m => m.content.toLowerCase().includes(query) || m.sender_name.toLowerCase().includes(query))
    }
  }
  historySearchResults.value = results.slice(-100)
}
function formatHistoryDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}
function jumpToMessage(msgId: string) {
  showChatHistorySearch.value = false
  nextTick(() => {
    const el = chatScrollRef.value?.querySelector(`[data-msg-id="${msgId}"]`) as HTMLElement
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('cp-msg-highlight')
      setTimeout(() => el.classList.remove('cp-msg-highlight'), 2000)
    }
  })
}

// 查看联系人的星火域
function contactMoments(sparkId:string){return moments.value.filter(m=>m.author_id===sparkId)}
function ctxMenuAction(action:string){
  ctxMenu.show=false
  if(action==='delete'){
    confirmDialog.show=true;confirmDialog.title='删除聊天';confirmDialog.text='确定删除该聊天吗？';confirmDialog.btnText='删除'
    confirmDialog.onConfirm=()=>{showToast('已删除')}
  } else if(action==='pin'){
    toggleChatPin(ctxMenu.type as 'private'|'group', ctxMenu.id)
  } else if(action==='unread'){
    const f=friends.value.find(f=>f.spark_id===ctxMenu.id);if(f)f.unread=1;showToast('已标记未读')
  } else if(action==='mute'){
    toggleChatMute(ctxMenu.type as 'private'|'group', ctxMenu.id)
  }
}
// 会话置顶切换
function toggleChatPin(type:string, id:string){
  if(type==='private'){
    const f=friends.value.find(f=>f.spark_id===id)
    if(f){f.is_chat_pinned=!f.is_chat_pinned;showToast(f.is_chat_pinned?'已置顶':'已取消置顶')}
  } else if(type==='group'){
    const g=groups.value.find(g=>g.id===id)
    if(g){g.is_chat_pinned=!g.is_chat_pinned;showToast(g.is_chat_pinned?'已置顶':'已取消置顶')}
  }
}
// 免打扰切换
function toggleChatMute(type:string, id:string){
  if(type==='private'){
    const f=friends.value.find(f=>f.spark_id===id)
    if(f){f.is_muted=!f.is_muted;showToast(f.is_muted?'已开启免打扰':'已关闭免打扰')}
  } else if(type==='group'){
    const g=groups.value.find(g=>g.id===id)
    if(g){g.is_muted=!g.is_muted;showToast(g.is_muted?'已开启免打扰':'已关闭免打扰')}
  }
}
// 清空聊天记录
function handleClearChatHistory(){
  if(!activeChat.value)return
  confirmDialog.show=true;confirmDialog.title='清空聊天记录';confirmDialog.text='确定要清空所有聊天记录吗？此操作不可撤销。';confirmDialog.btnText='清空'
  confirmDialog.onConfirm=()=>{
    if(activeChat.value?.type==='group'){
      const g=groups.value.find(g=>g.id===activeChat.value!.id)
      if(g)g.messages=[]
    } else if(activeChat.value?.type==='private'){
      clearPrivateChat(activeChat.value.id)
    } else if(activeChat.value?.type==='ai'){
      aiChatHistory.value=[]
    }
    showToast('聊天记录已清空')
  }
}
// 查找聊天内容
function handleSearchChatHistory(){showToast('查找聊天内容功能开发中')}
// 右键菜单动态标签
function getCtxPinLabel():string{
  if(ctxMenu.type==='private'){const f=friends.value.find(f=>f.spark_id===ctxMenu.id);return f?.is_chat_pinned?'📌 取消置顶':'📌 置顶'}
  if(ctxMenu.type==='group'){const g=groups.value.find(g=>g.id===ctxMenu.id);return g?.is_chat_pinned?'📌 取消置顶':'📌 置顶'}
  return'📌 置顶'
}
function getCtxMuteLabel():string{
  if(ctxMenu.type==='private'){const f=friends.value.find(f=>f.spark_id===ctxMenu.id);return f?.is_muted?'🔔 取消免打扰':'🔕 消息免打扰'}
  if(ctxMenu.type==='group'){const g=groups.value.find(g=>g.id===ctxMenu.id);return g?.is_muted?'🔔 取消免打扰':'🔕 消息免打扰'}
  return'🔕 消息免打扰'
}
function handleRemoveFriend(sparkId:string){const f=friends.value.find(f=>f.spark_id===sparkId);confirmDialog.show=true;confirmDialog.title='⚠️ 删除联系人';confirmDialog.text=`确定要删除「${f?.nickname||sparkId}」吗？`;confirmDialog.btnText='删除';confirmDialog.onConfirm=()=>{removeFriend(sparkId);selectedContact.value=null;rightPanel.value='none';showToast('已删除')}}

// ====== 好友管理功能 ======
function getContactMeta(f: Friend | null): string {
  if (!f) return ''
  const p = f.profile as import('../../composables/useCompanion').SparkProfile | undefined
  const parts: string[] = []
  if (p?.region) parts.push(p.region)
  if (p?.identity) parts.push(p.identity)
  else if (p?.university) parts.push(p.university)
  if (p?.major) parts.push(p.major)
  return parts.join(' | ')
}
function openContactRemarkEdit() {
  if (!selectedContact.value) return
  const newRemark = prompt('输入备注：', selectedContact.value.remark || '')
  if (newRemark !== null) { setFriendRemark(selectedContact.value.spark_id, newRemark); showToast('备注已更新') }
}
function handleContactStarToggle() {
  if (!selectedContact.value) return
  toggleStarFriend(selectedContact.value.spark_id)
  showToast(selectedContact.value.is_starred ? '已设为星标' : '已取消星标')
}
function handleContactBlock() {
  if (!selectedContact.value) return
  const f = selectedContact.value
  confirmDialog.show = true; confirmDialog.title = '🚫 拉黑'; confirmDialog.text = `确定要拉黑「${f.nickname}」吗？`; confirmDialog.btnText = '拉黑'
  confirmDialog.onConfirm = () => { blockFriend(f.spark_id); showToast('已拉黑') }
}
// 聊天设置中的好友管理
function openChatFriendRemarkEdit() {
  if (!chatFriend.value) return
  const newRemark = prompt('输入备注：', chatFriend.value.remark || '')
  if (newRemark !== null) { setFriendRemark(chatFriend.value.spark_id, newRemark); showToast('备注已更新') }
}
function handleChatStarToggle() {
  if (!chatFriend.value) return
  toggleStarFriend(chatFriend.value.spark_id)
  showToast(chatFriend.value.is_starred ? '已设为星标' : '已取消星标')
}
function openChatFriendPermissions() {
  if (!chatFriend.value) return
  const perms = getFriendPermissions(chatFriend.value.spark_id)
  const choice = confirm(`当前权限：\n- 允许查看我的星火域: ${perms.allow_view_my_moments ? '是' : '否'}\n- 隐藏对方星火域: ${perms.hide_their_moments ? '是' : '否'}\n\n点击“确定”切换“允许查看我的星火域”设置`)
  if (choice) {
    updateFriendPermissions(chatFriend.value.spark_id, { allow_view_my_moments: !perms.allow_view_my_moments })
    showToast('权限已更新')
  }
}
function handleChatBlockFriend() {
  if (!chatFriend.value) return
  const f = chatFriend.value
  confirmDialog.show = true; confirmDialog.title = '🚫 拉黑'; confirmDialog.text = `确定要拉黑「${f.nickname}」吗？`; confirmDialog.btnText = '拉黑'
  confirmDialog.onConfirm = () => { blockFriend(f.spark_id); showChatSettings.value = false; showToast('已拉黑') }
}
function handleChatDeleteFriend() {
  if (!chatFriend.value) return
  const f = chatFriend.value
  confirmDialog.show = true; confirmDialog.title = '⚠️ 删除好友'; confirmDialog.text = `确定要删除「${f.nickname}」吗？`; confirmDialog.btnText = '删除'
  confirmDialog.onConfirm = () => { removeFriend(f.spark_id); activeChat.value = null; rightPanel.value = 'none'; showToast('已删除') }
}
function handleGlobalSearch(){const q=globalSearch.value.trim().toLowerCase();if(!q){globalSearchResults.value=[];return};const r:typeof globalSearchResults.value=[];friends.value.filter(f=>f.nickname.toLowerCase().includes(q)||f.spark_id.includes(q)).forEach(f=>r.push({id:f.id,name:f.nickname,avatar:f.avatar,desc:f.spark_id,action:()=>openPrivateChat(f.spark_id)}));groups.value.filter(g=>g.name.toLowerCase().includes(q)).forEach(g=>r.push({id:g.id,name:g.name,avatar:g.avatar,desc:`${g.members.length}人`,action:()=>openGroupChat(g.id)}));globalSearchResults.value=r.slice(0,10)}
let _searchTimer:ReturnType<typeof setTimeout>|null=null
function debouncedSearch(){if(_searchTimer)clearTimeout(_searchTimer);_searchTimer=setTimeout(handleGlobalSearch,300)}
function handleSearchFriend(){addFriendResult.value=addFriendQuery.value.trim()?searchUser(addFriendQuery.value.trim()):null}
function handleAddFriendResult(){if(!addFriendResult.value)return;const r=addFriend({spark_id:addFriendResult.value.spark_id,nickname:addFriendResult.value.nickname,avatar:addFriendResult.value.avatar,bio:addFriendResult.value.bio});showToast(r.msg);addFriendResult.value=null;addFriendQuery.value='';showAddFriendModal.value=false}
function handleCreateGroup(){if(!newGroupName.value.trim())return;createGroup(newGroupName.value.trim(),newGroupMembers.value,newGroupAI.value);showToast('群聊已创建！');showCreateModal.value=false;newGroupName.value='';newGroupMembers.value=[]}
function handlePost(){if(!postContent.value.trim())return;postMoment(postContent.value.trim(),[],postVis.value);postContent.value='';showToast('已发布')}
function handleComment(id:string){const c=commentInputs[id]?.trim();if(!c)return;commentMoment(id,c);commentInputs[id]=''}
async function renderQR(canvas:HTMLCanvasElement|null,data:string){if(!canvas)return;try{await QRCode.toCanvas(canvas,data,{width:160,margin:2,color:{dark:'#8b5cf6',light:'#0d0a1a'}})}catch{}}
function copyQRData(){navigator.clipboard.writeText(getQRData());showToast('名片已复制')}
function copyGroupQR(){if(activeGroup.value){navigator.clipboard.writeText(getQRData(undefined,'group',activeGroup.value.id));showToast('已复制')}}
function handleQRPaste(){const r=addFriendByQR(qrPasteInput.value.trim());showToast(r.msg);if(r.ok)qrPasteInput.value=''}
function closeMenus(){if(ctxMenu.show)ctxMenu.show=false;if(showAddMenu.value)showAddMenu.value=false;if(msgCtx.show)msgCtx.show=false}
// 拖拽上传
function onDragEnter(){isDragging.value=true}
function onDragLeave(){isDragging.value=false}
function onDrop(e:DragEvent){isDragging.value=false;const files=e.dataTransfer?.files;if(!files)return;processFiles(files)}
function onFileInput(e:Event){const el=e.target as HTMLInputElement;if(el.files)processFiles(el.files);el.value=''}
function processFiles(files:FileList){for(let i=0;i<files.length;i++){const f=files[i];const isImage=f.type.startsWith('image/');if(isImage){const url=URL.createObjectURL(f);pendingFiles.value.push({type:'image',name:f.name,url})}else{pendingFiles.value.push({type:'file',name:f.name})}}}
function clearPendingFile(idx:number){const f=pendingFiles.value[idx];if(f?.url?.startsWith('blob:'))URL.revokeObjectURL(f.url);pendingFiles.value.splice(idx,1)}
function clearAllPendingFiles(){pendingFiles.value.forEach(f=>{if(f.url?.startsWith('blob:'))URL.revokeObjectURL(f.url)});pendingFiles.value=[]}
function handleSendPendingFiles(){if(!activeChat.value||!pendingFiles.value.length)return;pendingFiles.value.forEach(f=>{const content=f.type==='image'?`[图片] ${f.name}`:`[文件] ${f.name}`;if(activeChat.value?.type==='group')sendGroupMsg(activeChat.value.id,content);else if(activeChat.value?.type==='private')sendPrivateMsg(activeChat.value.id,content)});clearAllPendingFiles();scrollChat()}
let _resizeHandler:null|(()=>void)=null
onMounted(()=>{window.addEventListener('click',closeMenus);_resizeHandler=()=>{isMobile.value=window.innerWidth<768};window.addEventListener('resize',_resizeHandler)})
onUnmounted(()=>{window.removeEventListener('click',closeMenus);if(_resizeHandler)window.removeEventListener('resize',_resizeHandler);clearAllPendingFiles();if(_searchTimer)clearTimeout(_searchTimer)})
watch(showQRModal,v=>{if(v)nextTick(()=>renderQR(userQrCanvas.value,getQRData()))})
watch(showGroupQR,v=>{if(v&&activeGroup.value)nextTick(()=>renderQR(groupQrCanvas.value,getQRData(undefined,'group',activeGroup.value!.id)))})
watch(()=>chatMessages.value.length,()=>scrollChat())
watch(isAiTyping,()=>scrollChat())
// 切换聊天时关闭设置面板
watch(activeChat,()=>{showChatSettings.value=false;showGroupMgmt.value=false;mentionIds.value=[]})

// @提及功能
function onChatInputForMention(e: Event) {
  autoResize(e)
  const el = e.target as HTMLTextAreaElement
  const val = el.value
  const pos = el.selectionStart || 0
  // 检查光标前是否刚输入@
  if (val[pos - 1] === '@' && activeChat.value?.type === 'group') {
    showMentionPicker.value = true
    mentionSearch.value = ''
  } else if (showMentionPicker.value) {
    // 提取@后的搜索关键字
    const lastAt = val.lastIndexOf('@', pos - 1)
    if (lastAt >= 0) {
      mentionSearch.value = val.slice(lastAt + 1, pos)
    } else {
      showMentionPicker.value = false
    }
  }
}
const filteredMentionMembers = computed(() => {
  if (!activeGroup.value) return []
  const q = mentionSearch.value.toLowerCase()
  return activeGroup.value.members
    .filter(m => m.spark_id !== myProfile.value?.spark_id)
    .filter(m => !q || m.nickname.toLowerCase().includes(q))
})
function selectMention(member: GroupChat['members'][0]) {
  const ta = document.querySelector('.cp-input-row textarea') as HTMLTextAreaElement | null
  if (!ta) return
  const val = ta.value
  const pos = ta.selectionStart || val.length
  const lastAt = val.lastIndexOf('@', pos - 1)
  if (lastAt >= 0) {
    const before = val.slice(0, lastAt)
    const after = val.slice(pos)
    chatInput.value = `${before}@${member.nickname} ${after}`
    mentionIds.value.push(member.spark_id)
  }
  showMentionPicker.value = false
}
// 获取群成员角色
function getGroupMsgRole(msg: ChatMsg): 'owner' | 'admin' | 'member' | null {
  if (!activeGroup.value) return null
  const m = activeGroup.value.members.find(m => m.spark_id === msg.sender_id)
  return m?.role || null
}
// 群头像九宫格
function getGroupAvatarGrid(g: GroupChat) {
  return g.members.slice(0, 9).map(m => m.avatar)
}
function getGridClass(count: number): string {
  if (count <= 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  return 'grid-9'
}
// 群管理操作
function handleRenameGroup() {
  if (!activeGroup.value || !groupRenameInput.value.trim()) return
  const r = renameGroup(activeGroup.value.id, groupRenameInput.value.trim())
  showToast(r.msg); groupRenameInput.value = ''
}
function handleSetAnnouncement() {
  if (!activeGroup.value || !groupAnnouncementInput.value.trim()) return
  const r = setGroupAnnouncement(activeGroup.value.id, groupAnnouncementInput.value.trim())
  showToast(r.msg); groupAnnouncementInput.value = ''
}
function handleSetAdmin(memberId: string, isAdmin: boolean) {
  if (!activeGroup.value) return
  const r = setGroupAdmin(activeGroup.value.id, memberId, isAdmin)
  showToast(r.msg)
}
function handleKickMember(memberId: string) {
  if (!activeGroup.value) return
  const member = activeGroup.value.members.find(m => m.spark_id === memberId)
  confirmDialog.show = true
  confirmDialog.title = '移出成员'
  confirmDialog.text = `确定要将「${member?.nickname || memberId}」移出群聊吗？`
  confirmDialog.btnText = '移出'
  confirmDialog.onConfirm = () => { const r = kickGroupMember(activeGroup.value!.id, memberId); showToast(r.msg) }
}
function handleDisbandGroup() {
  if (!activeGroup.value) return
  confirmDialog.show = true
  confirmDialog.title = '⚠️ 解散群聊'
  confirmDialog.text = `确定要解散「${activeGroup.value.name}」吗？此操作不可撤销。`
  confirmDialog.btnText = '解散'
  confirmDialog.onConfirm = () => { const r = disbandGroup(activeGroup.value!.id); showToast(r.msg); closeRight() }
}
function handleTransferOwner(memberId: string) {
  if (!activeGroup.value) return
  const member = activeGroup.value.members.find(m => m.spark_id === memberId)
  confirmDialog.show = true
  confirmDialog.title = '转让群主'
  confirmDialog.text = `确定要将群主转让给「${member?.nickname || memberId}」吗？`
  confirmDialog.btnText = '转让'
  confirmDialog.onConfirm = () => { const r = transferGroupOwner(activeGroup.value!.id, memberId); showToast(r.msg) }
}
const myGroupRole = computed(() => {
  if (!activeGroup.value || !myProfile.value) return null
  return getMemberRole(activeGroup.value.id, myProfile.value.spark_id)
})
// 检查消息是否包含@当前用户
function isMentionedInMsg(msg: ChatMsg): boolean {
  if (!myProfile.value) return false
  if (msg.mentions?.includes(myProfile.value.spark_id)) return true
  return msg.content.includes(`@${myProfile.value.nickname}`)
}
void updateProfile;void favorites;void addFavorite;void CosmicBackground;void formatTimeAgo;void showChatFriendCard;void viewProfile;void friendTags;void unblockFriend;void sendGroupMsg;void isMomentLive;void postContent;void postVis
// 渲染消息内容（@提及高亮）
function renderMsgContent(content: string): string {
  // 转义HTML
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 高亮 @提及
  return escaped.replace(/@([\w\u4e00-\u9fff\uff08\uff09\(\)]+)/g, '<span class="cp-mention-hl">@$1</span>')
}

// 星火域双栏: 我的动态(置顶优先)
const myMoments = computed(() => {
  if (!myProfile.value) return []
  const mine = moments.value.filter(m => m.author_id === myProfile.value!.spark_id)
  return [...mine].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})
// 星火域双栏: 所有动态(时间倒序+可见性过滤)
const allMoments = computed(() => {
  const filtered = filterMomentsByVisibility(
    [...moments.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  )
  return filtered
})

// 拖拽分隔条
function onDividerMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDraggingDivider.value = true
  const container = (e.target as HTMLElement).parentElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const onMove = (ev: MouseEvent) => {
    const x = ev.clientX - rect.left
    const pct = (x / rect.width) * 100
    momentLeftWidth.value = Math.max(20, Math.min(50, pct))
  }
  const onUp = () => {
    isDraggingDivider.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// 背景图上传
function onBgFileSelect(e: Event) {
  const el = e.target as HTMLInputElement
  if (!el.files?.[0]) return
  const file = el.files[0]
  if (!file.type.startsWith('image/')) return
  const url = URL.createObjectURL(file)
  customBgUrl.value = url
  el.value = ''
}

// 动态菜单切换
function toggleMomentMenu(momentId: string) {
  momentMenuId.value = momentMenuId.value === momentId ? null : momentId
}
function handleTogglePin(momentId: string) {
  togglePinMoment(momentId)
  momentMenuId.value = null
}
function handleDeleteMoment(momentId: string) {
  deleteMoment(momentId)
  momentMenuId.value = null
}

// ====== 发布编辑器功能 ======
const visibilityOptions = [
  { value: 'three_days', label: '最近三天' },
  { value: 'one_month', label: '最近一个月' },
  { value: 'half_year', label: '最近半年' },
  { value: 'forever', label: '全部' },
]
const visibilityLabels: Record<string, string> = {
  three_days: '最近三天', one_month: '最近一个月', half_year: '最近半年', forever: '全部'
}
function handleVisibilityChange(val: 'three_days' | 'one_month' | 'half_year' | 'forever') {
  updateMomentVisibility({ timeRange: val })
  showToast(`设置成功，你的动态将仅展示${visibilityLabels[val]}的内容`)
}

const maxImagesAllowed = computed(() => publishVideos.value.length > 0 ? 6 : 9)

function removePublishImage(idx: number) {
  const img = publishImages.value[idx]
  if (img.blob && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
  publishImages.value.splice(idx, 1)
}
function removePublishVideo(idx: number) {
  const vid = publishVideos.value[idx]
  if (vid.url.startsWith('blob:')) URL.revokeObjectURL(vid.url)
  publishVideos.value.splice(idx, 1)
}
function onPublishDrop(targetIdx: number) {
  if (dragIdx.value === null || dragIdx.value === targetIdx) return
  const arr = [...publishImages.value]
  const [moved] = arr.splice(dragIdx.value, 1)
  arr.splice(targetIdx, 0, moved)
  publishImages.value = arr
  dragIdx.value = null
}
function onPublishFileSelect(e: Event) {
  const el = e.target as HTMLInputElement
  if (!el.files) return
  for (let i = 0; i < el.files.length; i++) {
    const f = el.files[i]
    if (f.type.startsWith('image/')) {
      if (publishImages.value.length >= maxImagesAllowed.value) {
        showToast(`图片最多${maxImagesAllowed.value}张${publishVideos.value.length > 0 ? '（视频占用3个位置）' : ''}`)
        break
      }
      publishImages.value.push({ url: URL.createObjectURL(f), name: f.name, blob: true })
    } else if (f.type.startsWith('video/')) {
      if (publishVideos.value.length >= 1) { showToast('最多上传1个视频'); continue }
      publishVideos.value.push({ url: URL.createObjectURL(f), name: f.name })
      // 视频占位后检查图片是否超出
      while (publishImages.value.length > 6) {
        const removed = publishImages.value.pop()
        if (removed?.blob && removed.url.startsWith('blob:')) URL.revokeObjectURL(removed.url)
        showToast('有视频时图片最多6张，已移除多余图片')
      }
    } else {
      publishFiles.value.push({ url: URL.createObjectURL(f), name: f.name, size: f.size })
    }
  }
  el.value = ''
}
function onPublishFileAttach() {
  // 创建一个专门的文件选择器
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.multiple = true
  inp.accept = '.pdf,.doc,.docx,.zip,.rar,.ppt,.pptx,.xls,.xlsx,.txt'
  inp.onchange = () => {
    if (!inp.files) return
    for (let i = 0; i < inp.files.length; i++) {
      const f = inp.files[i]
      publishFiles.value.push({ url: URL.createObjectURL(f), name: f.name, size: f.size })
    }
  }
  inp.click()
}
function formatPublishFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
function handlePublish() {
  if (!publishContent.value.trim()) return
  postMoment(
    publishContent.value.trim(),
    publishImages.value.map(img => img.url),
    publishVis.value,
    true,
    {
      videoUrls: publishVideos.value.map(v => v.url),
      fileUrls: publishFiles.value.map(f => f.url),
      fileNames: publishFiles.value.map(f => f.name),
      fileSizes: publishFiles.value.map(f => f.size),
      isLive: publishIsLive.value,
    }
  )
  showToast('已发布')
  // 重置
  publishContent.value = ''
  publishImages.value = []
  publishVideos.value = []
  publishFiles.value = []
  publishIsLive.value = false
  publishVis.value = 'public'
  showPublishModal.value = false
}
</script>

<style scoped>
.cp-layout{display:flex;height:calc(100vh - 72px);background:#0a0814;overflow:hidden;position:relative}
.cp-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:8px 24px;border-radius:12px;background:rgba(139,92,246,.15);backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,.12);color:rgba(139,92,246,.9);font-size:12px;font-weight:600;z-index:300;white-space:nowrap}
.toast-enter-active{transition:all .3s}.toast-leave-active{transition:all .25s}.toast-enter-from{opacity:0;transform:translateX(-50%) translateY(-14px)}.toast-leave-to{opacity:0}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}
/* 右键菜单 */
.cp-ctx-menu{position:fixed;z-index:100;background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:150px}
.cp-ctx-menu button{display:flex;width:100%;align-items:center;gap:6px;padding:8px 14px;border:none;background:none;color:rgba(255,255,255,.6);font-size:12px;cursor:pointer;border-radius:7px;transition:all .12s}
.cp-ctx-menu button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.cp-ctx-menu button.del{color:rgba(239,68,68,.6)}.cp-ctx-menu button.del:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.8)}
.cp-ctx-menu button.warn{color:rgba(251,191,36,.7)}.cp-ctx-menu button.warn:hover{background:rgba(251,191,36,.06);color:rgba(251,191,36,.9)}
.cp-ctx-menu.msg-ctx{min-width:130px}
/* 确认框 */
.cp-confirm-text{font-size:12px;color:rgba(255,255,255,.4);text-align:center;line-height:1.6;margin:0 0 10px}
.cp-modal-btns button.danger{background:rgba(239,68,68,.12)!important;color:rgba(239,68,68,.8)!important;border-color:rgba(239,68,68,.15)!important}
/* 侧栏 */
.cp-sidebar{width:300px;border-right:1px solid rgba(255,255,255,.04);display:flex;flex-direction:column;flex-shrink:0;background:rgba(8,6,18,.92);backdrop-filter:blur(20px);z-index:2;position:relative}
.cp-sb-top{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.03);position:relative}
.cp-logo{font-size:14px;margin:0;color:white;font-weight:700}.cp-sb-actions{display:flex;gap:2px}
.cp-sb-btn{width:30px;height:30px;border-radius:8px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.cp-sb-btn:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}
.cp-add-menu{position:absolute;top:100%;right:8px;background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:4px;z-index:20;box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:140px}
.cp-add-menu button{display:flex;width:100%;gap:6px;padding:8px 12px;border:none;background:none;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer;border-radius:7px;transition:all .12s}
.cp-add-menu button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.cp-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.03)}.cp-tabs button{flex:1;padding:9px 0;border:none;background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;font-weight:500;transition:all .15s;border-bottom:2px solid transparent}.cp-tabs button.active{color:rgba(139,92,246,.7);border-bottom-color:rgba(139,92,246,.3)}
.cp-list{flex:1;overflow-y:auto;padding:4px}.cp-list::-webkit-scrollbar{width:2px}.cp-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-conv{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s}.cp-conv:hover{background:rgba(255,255,255,.02)}.cp-conv.active{background:rgba(139,92,246,.06)}
.cp-av{width:34px;height:34px;border-radius:9px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}.cp-av.sm{width:28px;height:28px;font-size:13px;border-radius:7px}
.cp-conv-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.cp-conv-name{font-size:12px;color:rgba(255,255,255,.6);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cp-conv-name small{color:rgba(255,255,255,.15);margin-left:3px;font-size:10px}.cp-conv-last{font-size:10px;color:rgba(255,255,255,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-badge{min-width:16px;height:16px;border-radius:8px;background:rgba(239,68,68,.6);color:white;font-size:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:700}
.cp-section-title{font-size:9px;color:rgba(255,255,255,.1);padding:10px 10px 3px;font-weight:700;letter-spacing:1px}
.cp-contact{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;cursor:pointer;transition:all .12s}.cp-contact:hover{background:rgba(255,255,255,.015)}.cp-contact.active{background:rgba(139,92,246,.06)}
.cp-contact-info{flex:1;min-width:0;display:flex;flex-direction:column}.cp-contact-name{font-size:11px;color:rgba(255,255,255,.5)}.cp-contact-id{font-size:9px;color:rgba(255,255,255,.1)}
/* 动态 */
.moments-tab{padding:8px}.cp-post-box{margin-bottom:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
.cp-post-box textarea{width:100%;background:none;border:none;color:white;font-size:12px;resize:none;outline:none;font-family:inherit;line-height:1.5}.cp-post-box textarea::placeholder{color:rgba(255,255,255,.12)}
.cp-post-acts{display:flex;justify-content:space-between;align-items:center;margin-top:6px}.cp-post-acts select{padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;outline:none}
.cp-post-acts button{padding:4px 14px;border-radius:7px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:10px;font-weight:600;cursor:pointer}.cp-post-acts button:disabled{opacity:.3}
.cp-moment{padding:10px;border-radius:10px;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.02);margin-bottom:6px}
.cp-moment-head{display:flex;align-items:center;gap:6px;margin-bottom:4px}.cp-moment-head b{font-size:11px;color:rgba(255,255,255,.5)}.cp-moment-head small{font-size:9px;color:rgba(255,255,255,.1);margin-left:4px}
.cp-x{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.1);cursor:pointer;font-size:11px}
.cp-moment-text{font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;margin:0 0 6px;white-space:pre-wrap}
.cp-moment-acts{display:flex;gap:6px}.cp-moment-acts button{padding:2px 8px;border-radius:5px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:10px;cursor:pointer;transition:all .15s}.cp-moment-acts button:hover{background:rgba(139,92,246,.04);color:rgba(139,92,246,.5)}.cp-moment-acts button.liked{color:rgba(239,68,68,.5)}
.cp-comments{margin-top:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,.01)}.cp-cmt{font-size:10px;color:rgba(255,255,255,.3);margin-bottom:3px}.cp-cmt b{color:rgba(139,92,246,.5)}
.cp-cmt-input{display:flex;gap:4px;margin-top:4px}.cp-cmt-input input{flex:1;padding:4px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.03);background:rgba(255,255,255,.02);color:white;font-size:10px;outline:none}.cp-cmt-input button{padding:2px 8px;border-radius:5px;border:none;background:rgba(139,92,246,.08);color:rgba(139,92,246,.6);font-size:10px;cursor:pointer}
.cp-empty{text-align:center;padding:30px 0;color:rgba(255,255,255,.08);font-size:11px}
/* 通讯录分组(仿微信) */
.cp-contact-group{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;transition:all .12s;border-bottom:1px solid rgba(255,255,255,.02)}.cp-contact-group:hover{background:rgba(255,255,255,.015)}
.cp-cg-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px}.cp-cg-icon.nr{background:rgba(251,191,36,.08)}.cp-cg-icon.grp{background:rgba(34,197,94,.08)}.cp-cg-icon.fri{background:rgba(59,130,246,.08)}
.cp-cg-text{flex:1;font-size:12px;color:rgba(255,255,255,.5);font-weight:500}
.cp-cg-count{font-size:10px;color:rgba(255,255,255,.12);margin-right:2px}
.cp-cg-arrow{font-size:14px;color:rgba(255,255,255,.12);transition:transform .2s;transform:rotate(90deg)}.cp-cg-arrow.open{transform:rotate(-90deg)}
/* 左侧提示 */
.cp-sb-hint{text-align:center;padding:16px 0;color:rgba(255,255,255,.1);font-size:10px}
/* lg头像 */
.cp-av.lg{width:48px;height:48px;font-size:22px;border-radius:12px}
/* 右侧主面板 */
.cp-main{flex:1;display:flex;flex-direction:column;min-width:0;z-index:1;position:relative}
.cp-chat-hdr{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04);flex-shrink:0;background:rgba(8,6,18,.7);backdrop-filter:blur(20px)}
.cp-chat-hdr h3{margin:0;font-size:14px;color:white;font-weight:600;flex:1}.cp-back{background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:4px}
.cp-hdr-sub{font-size:10px;color:rgba(255,255,255,.15)}.cp-hdr-btn{background:none;border:none;font-size:15px;cursor:pointer;padding:4px}
/* ☰设置按钮高亮 */
.cs-btn{font-size:16px;color:rgba(255,255,255,.25);border-radius:6px;transition:all .15s}.cs-btn:hover{color:rgba(255,255,255,.4);background:rgba(255,255,255,.02)}.cs-btn.active{color:rgba(139,92,246,.6);background:rgba(139,92,246,.06)}
.cp-messages{flex:1;overflow-y:auto;padding:16px 24px;display:flex;flex-direction:column;gap:12px}.cp-messages::-webkit-scrollbar{width:2px}
.cp-sys-msg{text-align:center;color:rgba(255,255,255,.1);font-size:10px;padding:4px 12px;background:rgba(255,255,255,.015);border-radius:20px;margin:0 auto}
/* 碰一碰消息 */
.cp-poke-msg{text-align:center;color:rgba(255,255,255,.2);font-size:10px;padding:4px 12px;background:rgba(255,255,255,.01);border-radius:20px;margin:0 auto;animation:poke-shake .4s ease}
.cp-msg.poke{margin:0 auto;max-width:100%}
@keyframes poke-shake{0%{transform:translateX(0)}15%{transform:translateX(-3px)}30%{transform:translateX(3px)}45%{transform:translateX(-2px)}60%{transform:translateX(2px)}75%{transform:translateX(-1px)}100%{transform:translateX(0)}}
.cp-msg{display:flex;gap:8px;max-width:72%;align-items:flex-start}.cp-msg.mine{margin-left:auto;flex-direction:row-reverse}.cp-msg.sys{margin:0 auto;max-width:100%}
.cp-msg-av{width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid rgba(255,255,255,.03);cursor:pointer;transition:transform .15s}.cp-msg-av.my{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.06)}
.cp-msg-av-self{flex-shrink:0}
.cp-msg-body{display:flex;flex-direction:column;gap:2px;min-width:0}.cp-msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px}.cp-msg-name{font-size:9px;color:rgba(255,255,255,.15)}
.cp-bubble-row{display:flex;align-items:flex-end;gap:4px}.cp-bubble-row.reverse{flex-direction:row-reverse}
.cp-bubble{padding:8px 12px;border-radius:14px;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.75);word-break:break-word;white-space:pre-wrap}
.cp-msg:not(.mine):not(.sys) .cp-bubble{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);border-top-left-radius:4px}
.cp-msg.mine .cp-bubble{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.08);border-top-right-radius:4px;color:rgba(255,255,255,.85)}
.cp-msg.ai .cp-bubble{background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);border-top-left-radius:4px}
.cp-msg-time{font-size:8px;color:rgba(255,255,255,.08);white-space:nowrap;flex-shrink:0}
/* 时间更醒目 */
.cp-msg-time2{font-size:9px;color:rgba(255,255,255,.25);white-space:nowrap;flex-shrink:0;align-self:flex-end}
/* 头像可点击 */
.cp-msg-av{cursor:pointer;transition:transform .15s}.cp-msg-av:hover{transform:scale(1.08)}
/* 图片气泡 */
.cp-bubble-img{max-width:200px;max-height:200px;border-radius:8px;display:block}
/* 消息footer：时间+已读在消息下方 */
.cp-msg-footer{display:flex;align-items:center;gap:4px;padding:1px 4px}.cp-msg.mine .cp-msg-footer{flex-direction:row-reverse;justify-content:flex-start}

/* 聊天区域布局(消息+设置面板并排) */
.cp-chat-body{flex:1;display:flex;overflow:hidden}
.cp-chat-body .cp-messages{flex:1;overflow-y:auto;padding:16px 24px;display:flex;flex-direction:column;gap:12px}
/* 聊天设置面板(仿微信) */
.cp-chat-settings{width:260px;flex-shrink:0;border-left:1px solid rgba(255,255,255,.04);background:rgba(8,6,18,.85);backdrop-filter:blur(16px);padding:16px;overflow-y:auto}
.cs-members{display:flex;flex-wrap:wrap;gap:10px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.03);margin-bottom:10px}
.cs-member{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px;border-radius:8px;transition:all .12s}.cs-member:hover{background:rgba(139,92,246,.04)}
.cs-av{width:42px;height:42px;border-radius:10px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:20px}
.cs-mname{font-size:10px;color:rgba(255,255,255,.35);max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.cs-section{border-bottom:1px solid rgba(255,255,255,.03);padding:4px 0}
.cs-row{display:flex;align-items:center;justify-content:space-between;padding:10px 4px;font-size:12px;color:rgba(255,255,255,.45)}.cs-row.clickable{cursor:pointer;border-radius:6px}.cs-row.clickable:hover{background:rgba(255,255,255,.015)}
.cs-arrow{color:rgba(255,255,255,.1);font-size:16px}
.cs-toggle{position:relative;width:36px;height:20px;display:inline-block}.cs-toggle input{opacity:0;width:0;height:0}
.cs-slider{position:absolute;cursor:pointer;inset:0;background:rgba(255,255,255,.06);border-radius:20px;transition:.2s}.cs-slider::before{content:'';position:absolute;height:16px;width:16px;left:2px;bottom:2px;background:rgba(255,255,255,.3);border-radius:50%;transition:.2s}
.cs-toggle input:checked+.cs-slider{background:rgba(139,92,246,.3)}.cs-toggle input:checked+.cs-slider::before{transform:translateX(16px);background:rgba(139,92,246,.8)}
.cs-clear{display:block;width:100%;text-align:center;padding:10px;border:none;background:none;color:rgba(239,68,68,.5);font-size:12px;cursor:pointer;margin-top:12px;border-radius:8px;transition:all .15s}.cs-clear:hover{background:rgba(239,68,68,.04);color:rgba(239,68,68,.7)}
/* 添加按钮(仿微信) */
.cs-add-btn{cursor:pointer}.cs-add-icon{width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:18px;color:rgba(255,255,255,.2);transition:all .15s}.cs-add-btn:hover .cs-add-icon{border-color:rgba(139,92,246,.3);color:rgba(139,92,246,.5);background:rgba(139,92,246,.04)}
/* 会话列表置顶标识 */
.cp-conv.is-pinned{background:rgba(139,92,246,.03)!important}
/* 拖拽遮罩 */
.cp-drop-overlay{position:absolute;inset:0;z-index:20;background:rgba(139,92,246,.04);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;border:2px dashed rgba(139,92,246,.2);border-radius:12px}
.cp-drop-box{padding:16px 32px;border-radius:12px;background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:14px;font-weight:600}
/* 文件预览 */
.cp-pending-files{display:flex;flex-wrap:wrap;gap:4px;padding:4px 0}
.cp-pf-chip{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);font-size:10px;color:rgba(255,255,255,.35)}
.cp-pf-thumb{width:28px;height:28px;border-radius:4px;object-fit:cover}.cp-pf-name{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-pf-chip button{background:none;border:none;color:rgba(255,255,255,.15);cursor:pointer;font-size:12px}
/* 文件预览发送/取消按钮 */
.cp-pf-actions{display:flex;gap:6px;margin-left:auto;align-items:center}
.cp-pf-cancel{padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.06);background:none;color:rgba(255,255,255,.25);font-size:10px;cursor:pointer;transition:all .12s}.cp-pf-cancel:hover{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.cp-pf-send{padding:3px 12px;border-radius:6px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:10px;font-weight:600;cursor:pointer;transition:all .12s}.cp-pf-send:hover{opacity:.85}
.typing-dots{display:flex;gap:4px;padding:4px 0}.typing-dots span{width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,.3);animation:dot 1.4s infinite}.typing-dots span:nth-child(2){animation-delay:.2s}.typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}
/* 输入区 */
.cp-input-area{padding:8px 14px 12px;border-top:1px solid rgba(255,255,255,.03);flex-shrink:0;background:rgba(8,6,18,.6);backdrop-filter:blur(16px);position:relative}
.cp-emoji-panel{position:absolute;bottom:100%;left:0;right:0;background:rgba(20,18,34,.98);border:1px solid rgba(255,255,255,.05);border-radius:12px 12px 0 0;padding:10px;display:flex;flex-wrap:wrap;gap:2px;max-height:160px;overflow-y:auto}
.cp-emoji-panel button{width:32px;height:32px;border:none;background:none;font-size:18px;cursor:pointer;border-radius:6px;transition:all .1s}.cp-emoji-panel button:hover{background:rgba(139,92,246,.08);transform:scale(1.2)}
.cp-tools{display:flex;gap:2px;margin-bottom:6px;align-items:center}.cp-tools button{width:28px;height:28px;border-radius:7px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.25);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}.cp-tools button:hover,.cp-tools button.active{background:rgba(139,92,246,.06);color:rgba(139,92,246,.5)}
.cp-tools-r{margin-left:auto;display:flex;gap:2px}
.cp-input-row{display:flex;gap:6px;align-items:flex-end}.cp-input-row textarea{flex:1;padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:12px;resize:none;outline:none;font-family:inherit;line-height:1.5;min-height:22px;max-height:100px}.cp-input-row textarea:focus{border-color:rgba(139,92,246,.15)}.cp-input-row textarea::placeholder{color:rgba(255,255,255,.12)}
.cp-send{width:34px;height:34px;border-radius:9px;border:none;background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(109,40,217,.2));color:rgba(139,92,246,.6);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}.cp-send:hover:not(:disabled){background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white}.cp-send:disabled{opacity:.2}
/* 资料卡(仿微信) */
.cp-profile-card{padding:32px 24px;overflow-y:auto}
.pf-header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.04)}
.pf-avatar{width:64px;height:64px;border-radius:14px;background:rgba(139,92,246,.08);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0}
.pf-info h2{margin:0;font-size:18px;color:white;font-weight:700}.pf-id{font-size:11px;color:rgba(255,255,255,.2);margin:4px 0 0}
.pf-section{border-bottom:1px solid rgba(255,255,255,.03);padding:12px 0}
.pf-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0}.pf-row.clickable{cursor:pointer;border-radius:6px;padding:8px 4px}.pf-row.clickable:hover{background:rgba(255,255,255,.015)}
.pf-label{font-size:12px;color:rgba(255,255,255,.3)}.pf-val{font-size:12px;color:rgba(255,255,255,.55)}.pf-arrow{color:rgba(255,255,255,.1);font-size:16px}
.pf-actions{display:flex;gap:12px;justify-content:center;margin-top:28px}
.pf-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:11px;cursor:pointer;transition:all .15s;min-width:80px}.pf-btn span{font-size:20px}.pf-btn:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.08);color:rgba(139,92,246,.6)}
.pf-btn.primary{background:rgba(139,92,246,.06);border-color:rgba(139,92,246,.1);color:rgba(139,92,246,.7)}
.pf-delete{display:block;margin:32px auto 0;padding:10px 24px;border-radius:10px;border:1px solid rgba(239,68,68,.1);background:none;color:rgba(239,68,68,.5);font-size:12px;cursor:pointer;transition:all .15s}.pf-delete:hover{background:rgba(239,68,68,.04);color:rgba(239,68,68,.7)}
.pf-star{font-size:16px;vertical-align:middle;margin-right:4px}
.pf-meta{color:rgba(168,85,247,.45)!important;font-size:10px!important}
.pf-danger-zone{display:flex;flex-direction:column;gap:4px;padding:8px 0}
.pf-action-link{display:block;width:100%;text-align:center;padding:8px;border-radius:8px;border:none;background:none;font-size:12px;cursor:pointer;transition:all .15s}
.pf-action-link.warn{color:rgba(251,191,36,.5)}.pf-action-link.warn:hover{background:rgba(251,191,36,.04);color:rgba(251,191,36,.7)}
.pf-action-link.danger{color:rgba(239,68,68,.5)}.pf-action-link.danger:hover{background:rgba(239,68,68,.04);color:rgba(239,68,68,.7)}
.cs-val{font-size:10px;color:rgba(255,255,255,.2);margin-left:auto;margin-right:4px}
.cs-row.warn{color:rgba(251,191,36,.5)!important}.cs-row.warn:hover{background:rgba(251,191,36,.04)!important}
.cs-row.danger{color:rgba(239,68,68,.5)!important}.cs-row.danger:hover{background:rgba(239,68,68,.04)!important}
/* 动态星火域/欢迎页 */
.cp-main-feed{overflow-y:auto}
/* 双栏布局 */
.cp-moments-dual{display:flex;height:100%;overflow:hidden;position:relative}
.cp-moments-dual.is-dragging{cursor:col-resize;user-select:none}
.cp-ml{display:flex;flex-direction:column;overflow-y:auto;border-right:none;padding:0}.cp-ml::-webkit-scrollbar{width:2px}.cp-ml::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
/* 背景图区域 */
.cp-ml-bg{position:relative;height:160px;overflow:hidden;cursor:pointer;flex-shrink:0;transition:height .4s cubic-bezier(.4,0,.2,1)}
.cp-ml-bg.expanded{height:320px}
.cp-ml-bg-img{width:100%;height:100%;background-size:cover;background-position:center;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.cp-ml-bg.expanded .cp-ml-bg-img{transform:scale(1.08)}
.cp-ml-bg-default{width:100%;height:100%;background:linear-gradient(135deg,rgba(139,92,246,.25) 0%,rgba(59,130,246,.15) 50%,rgba(168,85,247,.2) 100%)}
.cp-ml-bg-upload{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);border:none;border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;opacity:.6;transition:opacity .2s}.cp-ml-bg-upload:hover{opacity:1}
/* 用户信息 */
.cp-ml-profile{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.03)}
.cp-ml-pinfo{flex:1;min-width:0}.cp-ml-pinfo b{font-size:13px;color:rgba(255,255,255,.7);display:block}.cp-ml-pinfo p{font-size:10px;color:rgba(255,255,255,.2);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 我的动态列表 */
.cp-ml-list{flex:1;overflow-y:auto;padding:8px 10px}.cp-ml-list::-webkit-scrollbar{width:2px}.cp-ml-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-ml-title{font-size:11px;color:rgba(255,255,255,.15);margin:0 0 8px;font-weight:600;letter-spacing:.5px}
/* 拖拽分隔条 */
.cp-divider{width:4px;cursor:col-resize;background:rgba(255,255,255,.03);flex-shrink:0;transition:all .2s;position:relative}
.cp-divider:hover,.cp-divider.active{width:6px;background:rgba(139,92,246,.25)}
.cp-divider::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:2px;height:32px;border-radius:2px;background:rgba(255,255,255,.08);transition:background .2s}
.cp-divider:hover::after,.cp-divider.active::after{background:rgba(139,92,246,.5)}
/* 右栏 */
.cp-mr{flex:1;min-width:300px;overflow-y:auto;padding:16px 20px}.cp-mr::-webkit-scrollbar{width:2px}.cp-mr::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-mr-title{font-size:15px;color:rgba(255,255,255,.65);margin:0 0 16px;font-weight:700}
/* 置顶标识 */
.cp-pin-badge{font-size:9px;color:rgba(139,92,246,.6);background:rgba(139,92,246,.08);padding:1px 6px;border-radius:4px;margin-right:auto}
.cp-feed-card.is-pinned{border-color:rgba(139,92,246,.12);background:rgba(139,92,246,.03)}
/* 动态菜单 */
.cp-feed-menu-wrap{position:relative;margin-left:auto}
.cp-feed-dots{background:none;border:none;color:rgba(255,255,255,.2);font-size:16px;cursor:pointer;padding:2px 6px;border-radius:4px;transition:all .12s;line-height:1}.cp-feed-dots:hover{background:rgba(255,255,255,.04);color:rgba(255,255,255,.4)}
.cp-feed-dropdown{position:absolute;top:100%;right:0;background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:3px;z-index:10;min-width:110px;box-shadow:0 6px 24px rgba(0,0,0,.4)}
.cp-feed-dropdown button{display:block;width:100%;padding:6px 10px;border:none;background:none;color:rgba(255,255,255,.5);font-size:11px;cursor:pointer;border-radius:5px;text-align:left;transition:all .1s}
.cp-feed-dropdown button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.cp-feed-dropdown button.del{color:rgba(239,68,68,.5)}.cp-feed-dropdown button.del:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.7)}
/* 左栏post box */
.cp-ml .cp-post-box{margin:8px 10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
.cp-feed-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:10px}
.cp-feed-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.cp-feed-head b{font-size:12px;color:rgba(255,255,255,.55)}.cp-feed-head small{color:rgba(255,255,255,.1);margin-left:6px;font-size:9px}
.cp-feed-card p{font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;margin:0 0 8px;white-space:pre-wrap}
.cp-feed-acts{display:flex;gap:8px}.cp-feed-acts button{padding:4px 10px;border-radius:6px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:10px;cursor:pointer;transition:all .15s}.cp-feed-acts button:hover{background:rgba(139,92,246,.04);color:rgba(139,92,246,.5)}.cp-feed-acts button.liked{color:rgba(239,68,68,.5)}
.cp-welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center}
.cp-welcome-icon{font-size:48px;margin-bottom:12px}.cp-welcome h3{color:white;font-size:18px;margin:0 0 6px}.cp-welcome p{color:rgba(255,255,255,.15);font-size:12px;margin:0 0 20px}
.cp-stats{display:flex;gap:24px}.cp-stat{display:flex;flex-direction:column;align-items:center;gap:2px;color:rgba(255,255,255,.2);font-size:10px}.cp-stat span{font-size:22px;font-weight:700;color:rgba(139,92,246,.5)}
/* 弹窗 */
.cp-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
.cp-modal{background:rgba(14,11,28,.97);border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:20px;width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 16px 64px rgba(0,0,0,.4)}.cp-modal.sm{width:340px}
.cp-modal h3{margin:0 0 14px;font-size:14px;color:white;text-align:center;font-weight:700}
.cp-field{margin-bottom:8px}.cp-field label{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-bottom:3px;font-weight:600}.cp-field input{width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:11px;outline:none;box-sizing:border-box}.cp-field input:focus{border-color:rgba(139,92,246,.15)}
.cp-field-label{font-size:10px;color:rgba(255,255,255,.15);margin:6px 0 3px}
.cp-check{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.35);margin:8px 0;cursor:pointer}
.cp-member-sel{margin:8px 0}.cp-member-opt{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;color:rgba(255,255,255,.35);cursor:pointer}
.cp-modal-btns{display:flex;gap:6px;margin-top:12px}.cp-modal-btns button{flex:1;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;font-weight:600;transition:all .12s}.cp-modal-btns button:hover{background:rgba(255,255,255,.04)}.cp-modal-btns button.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none}
.cp-close-btn{width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;margin-top:10px}
.cp-save-btn{width:100%;padding:9px 16px;border-radius:9px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:11px;font-weight:600;cursor:pointer;margin-top:6px}
.cp-search-result{padding:8px;font-size:11px;color:rgba(139,92,246,.5);display:flex;align-items:center;gap:6px}
.cp-add-btn{padding:3px 10px;border-radius:6px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600}
.cp-search-results{max-height:300px;overflow-y:auto}.cp-search-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .12s}.cp-search-item:hover{background:rgba(139,92,246,.04)}
.cp-qr-card{text-align:center;padding:14px;border-radius:14px;background:rgba(139,92,246,.02);border:1px solid rgba(139,92,246,.06);margin-bottom:10px}
.cp-qr-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;text-align:left}.cp-qr-av{width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,.08);display:flex;align-items:center;justify-content:center;font-size:18px}.cp-qr-name{font-size:12px;color:white;font-weight:600}.cp-qr-id{font-size:9px;color:rgba(139,92,246,.4)}.cp-qr-canvas{display:block;margin:0 auto;border-radius:10px}
.cp-qr-paste{margin-top:8px}.cp-qr-paste p{font-size:10px;color:rgba(255,255,255,.15);margin:0 0 4px}
.cp-id-row{display:flex;gap:4px}.cp-id-row input{flex:1;padding:6px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:10px;outline:none}.cp-id-row button{padding:4px 12px;border-radius:7px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap}
@media(max-width:768px){.cp-sidebar{width:100%;position:absolute;z-index:5}.cp-sidebar.collapsed{display:none}.cp-msg{max-width:90%}}
/* 角色标签 */
.cp-role-tag{font-size:11px;padding:1px 6px;border-radius:3px;font-weight:bold;color:white;line-height:1.4}
.cp-role-tag.owner{background:#f59e0b}
.cp-role-tag.admin{background:#10b981}
.cp-role-tag.sm{font-size:9px;padding:0 4px}
/* 时间分隔线 */
.cp-time-sep{text-align:center;color:rgba(255,255,255,.18);font-size:10px;padding:8px 0;user-select:none;width:100%;align-self:center}
/* @提及高亮 */
.cp-mention-hl{color:#a855f7;font-weight:500}
/* 被@提醒 */
.cp-mention-alert{text-align:center;font-size:10px;color:#a855f7;padding:2px 10px;background:rgba(168,85,247,.06);border-radius:10px;margin:0 auto 4px;width:fit-content}
/* @提及选择器 */
.cp-mention-picker{position:absolute;bottom:100%;left:0;right:0;background:rgba(20,18,34,.98);border:1px solid rgba(255,255,255,.06);border-radius:12px 12px 0 0;padding:6px;max-height:200px;overflow-y:auto;z-index:10}
.cp-mention-header{font-size:10px;color:rgba(255,255,255,.2);padding:4px 8px;font-weight:600}
.cp-mention-item{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:all .12s}
.cp-mention-item:hover{background:rgba(139,92,246,.06)}
.cp-mention-name{font-size:11px;color:rgba(255,255,255,.5);flex:1}
/* 群头像九宫格 */
.cp-group-av{width:34px;height:34px;border-radius:9px;background:rgba(139,92,246,.06);display:grid;gap:1px;padding:2px;flex-shrink:0;overflow:hidden}
.cp-group-av.grid-2{grid-template-columns:1fr 1fr;align-items:center}
.cp-group-av.grid-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.cp-group-av.grid-9{grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr}
.cp-gav-item{display:flex;align-items:center;justify-content:center;font-size:10px;border-radius:2px;background:rgba(139,92,246,.04);overflow:hidden;line-height:1}
.cp-group-av.grid-2 .cp-gav-item{font-size:12px}
.cp-group-av.grid-4 .cp-gav-item{font-size:10px}
.cp-group-av.grid-9 .cp-gav-item{font-size:8px}
/* 已读状态优化 */
.cp-read-status{font-size:10px;color:#94a3b8;flex-shrink:0;line-height:1;letter-spacing:-1px}.cp-read-status.read{color:#a855f7}
/* 群管理样式 */
.cs-announcement{font-size:11px;color:rgba(255,255,255,.35);padding:4px 8px;margin:0;line-height:1.5;background:rgba(255,255,255,.015);border-radius:6px}
.cs-mgmt-input{display:flex;gap:4px;padding:4px 0}
.cs-mgmt-input input{flex:1;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:10px;outline:none}
.cs-mgmt-input input:focus{border-color:rgba(139,92,246,.15)}
.cs-mgmt-input button{padding:4px 10px;border-radius:6px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap}
.cs-member-row{display:flex;align-items:center;gap:6px;padding:5px 4px;border-radius:6px}
.cs-member-row:hover{background:rgba(255,255,255,.015)}
.cs-member-name{font-size:11px;color:rgba(255,255,255,.45);flex:1}
.cs-member-acts{display:flex;gap:3px;margin-left:auto}
.cs-act-btn{padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.06);background:none;color:rgba(255,255,255,.3);font-size:9px;cursor:pointer;transition:all .12s}
.cs-act-btn:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6);border-color:rgba(139,92,246,.1)}
.cs-act-btn.warn{color:rgba(251,191,36,.5);border-color:rgba(251,191,36,.1)}.cs-act-btn.warn:hover{background:rgba(251,191,36,.06);color:rgba(251,191,36,.7)}
.cs-act-btn.danger{color:rgba(239,68,68,.5);border-color:rgba(239,68,68,.1)}.cs-act-btn.danger:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.7)}
/* 发布按钮(侧栏) */
.cp-sb-publish-btn{display:block;width:calc(100% - 16px);margin:8px;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(109,40,217,.15));color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center}
.cp-sb-publish-btn:hover{background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(109,40,217,.25));color:rgba(139,92,246,.9)}
/* 左栏发布按钮 */
.cp-ml-publish{padding:8px 10px}
.cp-publish-btn{display:block;width:100%;padding:10px;border-radius:10px;border:1px dashed rgba(139,92,246,.2);background:rgba(139,92,246,.04);color:rgba(139,92,246,.6);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center}
.cp-publish-btn:hover{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.3);color:rgba(139,92,246,.8)}
/* 齿轮图标 */
.cp-ml-gear{width:28px;height:28px;border-radius:7px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.25);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.cp-ml-gear:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}
/* 可见性设置面板 */
.cp-vis-panel{padding:10px 12px;background:rgba(139,92,246,.02);border:1px solid rgba(139,92,246,.06);border-radius:10px;margin:0 10px 8px}
.cp-vis-panel h4{font-size:11px;color:rgba(255,255,255,.35);margin:0 0 8px;font-weight:600}
.cp-vis-opts{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.cp-vis-opt{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);cursor:pointer;font-size:10px;color:rgba(255,255,255,.3);transition:all .12s}
.cp-vis-opt.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.15);color:rgba(139,92,246,.7)}
.cp-vis-opt input{display:none}
.cp-vis-toggle{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.3)}
/* LIVE标识(动态卡片内) */
.cp-live-badge{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:6px;background:rgba(239,68,68,.12);color:white;font-size:9px;font-weight:700;letter-spacing:.5px}
.cp-live-dot-sm{width:5px;height:5px;border-radius:50%;background:#ef4444;animation:live-pulse-sm 1.5s infinite}
@keyframes live-pulse-sm{0%,100%{opacity:1}50%{opacity:.3}}
/* 发布弹窗 */
.cp-publish-modal{width:440px}
.cp-pub-text{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:13px;resize:none;outline:none;font-family:inherit;line-height:1.6;box-sizing:border-box;margin-bottom:8px}
.cp-pub-text:focus{border-color:rgba(139,92,246,.15)}
.cp-pub-text::placeholder{color:rgba(255,255,255,.12)}
.cp-pub-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px}
.cp-pub-item{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:grab;border:1px solid rgba(255,255,255,.04)}
.cp-pub-item.video{cursor:default}
.cp-pub-thumb{width:100%;height:100%;object-fit:cover;display:block}
.cp-pub-remove{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.cp-pub-idx{position:absolute;bottom:2px;left:2px;padding:0 4px;border-radius:3px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.5);font-size:9px}
.cp-pub-vid-tag{position:absolute;bottom:4px;left:4px;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.6);color:white;font-size:9px}
.cp-pub-media-count{font-size:10px;color:rgba(255,255,255,.2);margin-bottom:6px;text-align:right}
.cp-pub-files{display:flex;flex-direction:column;gap:3px;margin-bottom:6px}
.cp-pub-file-chip{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);font-size:10px;color:rgba(255,255,255,.35)}
.cp-pub-file-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-pub-file-size{color:rgba(255,255,255,.15);flex-shrink:0}
.cp-pub-file-chip button{background:none;border:none;color:rgba(255,255,255,.15);cursor:pointer;font-size:12px;flex-shrink:0}
.cp-pub-tools{display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:4px 0}
.cp-pub-tools button{width:30px;height:30px;border-radius:8px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
.cp-pub-tools button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.5)}
.cp-pub-live-toggle{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);cursor:pointer;font-size:10px;font-weight:700;color:rgba(255,255,255,.25);transition:all .12s;letter-spacing:.5px}
.cp-pub-live-toggle.active{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.15);color:white}
.cp-pub-live-toggle input{display:none}
.cp-pub-live-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.15)}
.cp-pub-live-toggle.active .cp-pub-live-dot{background:#ef4444;animation:live-pulse-sm 1.5s infinite}
.cp-pub-vis-sel{margin-left:auto;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;outline:none}

/* ====== 翻译结果样式 ====== */
.cp-translate-result{margin-top:4px;padding:6px 10px;border-radius:8px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.08)}
.cp-translate-label{font-size:9px;color:rgba(59,130,246,.5);font-weight:600;display:block;margin-bottom:2px}
.cp-translate-result p{margin:0;font-size:12px;color:rgba(255,255,255,.6);line-height:1.5}

/* ====== 引用消息预览 ====== */
.cp-quote-preview{display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(139,92,246,.04);border-left:3px solid rgba(139,92,246,.3);border-radius:0 8px 8px 0;margin:0 12px}
.cp-quote-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cp-quote-name{font-size:10px;color:rgba(139,92,246,.5);font-weight:600}
.cp-quote-text{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-quote-preview button{width:20px;height:20px;border-radius:50%;border:none;background:rgba(255,255,255,.04);color:rgba(255,255,255,.25);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cp-quote-preview button:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)}

/* ====== 语音录制面板 ====== */
.cp-voice-panel{padding:12px 16px;background:rgba(139,92,246,.04);border-top:1px solid rgba(139,92,246,.08);display:flex;flex-direction:column;align-items:center;gap:10px}
.cp-voice-recording{display:flex;align-items:center;gap:12px}
.cp-voice-wave{display:flex;align-items:center;gap:2px;height:30px}
.cp-wave-bar{width:3px;height:8px;border-radius:2px;background:rgba(139,92,246,.5);animation:voiceWave .6s ease-in-out infinite alternate}
@keyframes voiceWave{0%{height:4px;opacity:.3}100%{height:22px;opacity:1}}
.cp-voice-timer{font-size:16px;color:rgba(139,92,246,.7);font-weight:700;font-variant-numeric:tabular-nums}
.cp-voice-actions{display:flex;gap:8px;align-items:center}
.cp-voice-start{padding:8px 20px;border-radius:20px;border:none;background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(109,40,217,.2));color:rgba(139,92,246,.8);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
.cp-voice-start:hover{background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(109,40,217,.3))}
.cp-voice-start:active{transform:scale(.95)}
.cp-voice-cancel{padding:6px 14px;border-radius:16px;border:1px solid rgba(239,68,68,.15);background:rgba(239,68,68,.06);color:rgba(239,68,68,.6);font-size:11px;cursor:pointer;transition:all .12s}
.cp-voice-cancel:hover{background:rgba(239,68,68,.12);color:rgba(239,68,68,.8)}
.cp-voice-stop{padding:6px 14px;border-radius:16px;border:none;background:linear-gradient(135deg,rgba(34,197,94,.2),rgba(16,185,129,.2));color:rgba(34,197,94,.8);font-size:11px;font-weight:600;cursor:pointer;transition:all .12s}
.cp-voice-stop:hover{background:linear-gradient(135deg,rgba(34,197,94,.3),rgba(16,185,129,.3))}
.cp-voice-text{padding:6px 14px;border-radius:16px;border:1px solid rgba(59,130,246,.12);background:rgba(59,130,246,.06);color:rgba(59,130,246,.7);font-size:11px;cursor:pointer;transition:all .12s}
.cp-voice-text:hover{background:rgba(59,130,246,.12);color:rgba(59,130,246,.9)}

/* ====== 转发选择器 ====== */
/* ====== 转发Modal样式（居中弹窗） ====== */
.cp-forward-modal{max-width:460px;width:90vw}
.cp-forward-tabs{display:flex;gap:0;margin:0 -20px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.04)}
.cp-forward-tabs button{flex:1;padding:8px;background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
.cp-forward-tabs button.active{color:rgba(139,92,246,.8);border-bottom-color:rgba(139,92,246,.6)}
.cp-forward-list{max-height:260px;overflow-y:auto;padding:4px 0;margin:8px 0}
.cp-forward-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;transition:all .12s}
.cp-forward-item:hover{background:rgba(139,92,246,.06)}
.cp-forward-item span{font-size:12px;color:rgba(255,255,255,.5)}
.cp-forward-selected{display:flex;flex-wrap:wrap;gap:6px;padding:8px 0;border-top:1px solid rgba(255,255,255,.04)}
.cp-forward-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:11px}
.cp-forward-chip button{background:none;border:none;color:rgba(255,255,255,.3);font-size:14px;cursor:pointer;padding:0 2px}
.cp-modal-btns .primary{background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(109,40,217,.3));color:rgba(139,92,246,.9);border-color:rgba(139,92,246,.2)}
.cp-modal-btns .primary:disabled{opacity:.4;cursor:not-allowed}

/* ====== 多选checkbox ====== */
.cp-msg-checkbox{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:4px;transition:all .15s}
.cp-msg-checkbox.checked{background:rgba(139,92,246,.6);border-color:rgba(139,92,246,.8)}
.cp-msg-checkbox.checked span{color:#fff;font-size:12px;font-weight:700}
.cp-msg.multi-select{cursor:pointer}

/* ====== 多选操作栏 ====== */
.cp-multi-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(139,92,246,.04);border-top:1px solid rgba(139,92,246,.08)}
.cp-multi-bar span{font-size:11px;color:rgba(139,92,246,.6);font-weight:600;flex:1}
.cp-multi-bar button{padding:5px 12px;border-radius:6px;border:1px solid rgba(139,92,246,.12);background:rgba(139,92,246,.06);color:rgba(139,92,246,.6);font-size:10px;cursor:pointer;transition:all .12s}
.cp-multi-bar button:hover{background:rgba(139,92,246,.12);color:rgba(139,92,246,.8)}
.cp-multi-bar button.del{border-color:rgba(239,68,68,.12);background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}
.cp-multi-bar button.del:hover{background:rgba(239,68,68,.12);color:rgba(239,68,68,.7)}

/* ====== 语音消息气泡 ====== */
.cp-voice-bubble{display:flex;align-items:center;gap:8px;padding:8px 14px;min-width:100px;max-width:200px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.08);border-radius:16px;cursor:pointer;transition:all .15s}
.cp-voice-bubble:hover{background:rgba(139,92,246,.1)}
.cp-voice-icon{font-size:16px;transition:transform .3s}
.cp-voice-icon.playing{animation:voicePulse 0.6s ease-in-out infinite alternate}
@keyframes voicePulse{0%{transform:scale(1)}100%{transform:scale(1.2)}}
.cp-voice-bars{display:flex;align-items:center;gap:2px;flex:1}
.cp-vbar{width:3px;background:rgba(139,92,246,.5);border-radius:2px;transition:height .2s}
.mine .cp-voice-bubble{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.15)}
.cp-voice-dur{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap}

/* ====== 引用消息（气泡内部） ====== */
.cp-quote-in-bubble{padding:6px 10px;margin-bottom:4px;background:rgba(255,255,255,.03);border-left:3px solid rgba(139,92,246,.4);border-radius:4px;font-size:11px}
.cp-quote-in-name{color:rgba(139,92,246,.6);font-weight:600;margin-right:4px}
.cp-quote-in-text{color:rgba(255,255,255,.3)}

/* ====== 翻译结果（微信风格） ====== */
.cp-translate-result{margin-top:4px;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.04)}
.cp-translate-text{font-size:12px;color:rgba(255,255,255,.6);margin:0 0 4px;line-height:1.5}
.cp-translate-from{font-size:10px;color:rgba(255,255,255,.2);font-style:italic}

/* ====== 聊天记录搜索Modal ====== */
.cp-history-modal{max-width:520px;width:90vw;max-height:80vh;display:flex;flex-direction:column}
.cp-history-tabs{display:flex;gap:0;margin:0 -20px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.04);overflow-x:auto}
.cp-history-tabs button{padding:8px 12px;background:none;border:none;color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap}
.cp-history-tabs button.active{color:rgba(139,92,246,.8);border-bottom-color:rgba(139,92,246,.6)}
.cp-history-date{padding:8px 0}
.cp-history-date input[type="date"]{width:100%;padding:8px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;color:rgba(255,255,255,.7);font-size:12px}
.cp-history-results{flex:1;overflow-y:auto;padding:4px 0;max-height:320px}
.cp-history-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .12s}
.cp-history-item:hover{background:rgba(139,92,246,.04)}
.cp-history-info{flex:1;min-width:0}
.cp-history-name{font-size:12px;color:rgba(255,255,255,.6);font-weight:600;display:flex;align-items:center;gap:8px}
.cp-history-time{font-size:10px;color:rgba(255,255,255,.2);font-weight:400}
.cp-history-content{font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-hint{color:rgba(255,255,255,.15) !important;font-style:italic}

/* ====== 消息高亮（跳转定位） ====== */
.cp-msg-highlight{animation:msgHighlight 2s ease-out;border-radius:12px}
@keyframes msgHighlight{
  0%{background:rgba(139,92,246,.15);box-shadow:0 0 0 4px rgba(139,92,246,.1)}
  100%{background:transparent;box-shadow:none}
}
</style>
