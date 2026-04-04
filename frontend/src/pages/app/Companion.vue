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
      <button @click="ctxMenuAction('pin')">📌 置顶</button>
      <button @click="ctxMenuAction('unread')">🔴 标为未读</button>
      <button @click="ctxMenuAction('mute')">🔕 消息免打扰</button>
      <button class="del" @click="ctxMenuAction('delete')">🗑️ 删除</button>
    </div>
    <!-- 消息右键菜单(仿微信) -->
    <div v-if="msgCtx.show" class="cp-ctx-menu msg-ctx" :style="{top:msgCtx.y+'px',left:msgCtx.x+'px'}">
      <button @click="msgCtxAction('copy')">📋 复制</button>
      <button @click="msgCtxAction('forward')">↗️ 转发...</button>
      <button @click="msgCtxAction('favorite')">⭐ 收藏</button>
      <button @click="msgCtxAction('quote')">💬 引用</button>
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
        <div v-for="g in groups" :key="g.id" class="cp-conv" :class="{active:activeChat?.id===g.id}" @click="openGroupChat(g.id)" @contextmenu.prevent="e=>showCtxMenu(e,'group',g.id)">
          <span class="cp-av">{{ g.avatar }}</span>
          <div class="cp-conv-info">
            <span class="cp-conv-name">{{ g.name }}<small>({{ g.members.length }})</small></span>
            <span class="cp-conv-last">{{ g.messages[g.messages.length-1]?.content?.slice(0,20)||'暂无消息' }}</span>
          </div>
          <span v-if="g.unread" class="cp-badge">{{ g.unread }}</span>
        </div>
        <div v-for="f in sortedFriends" :key="f.id" class="cp-conv" :class="{active:activeChat?.id===f.spark_id&&activeChat?.type==='private'}" @click="openPrivateChat(f.spark_id)" @contextmenu.prevent="e=>showCtxMenu(e,'private',f.spark_id)">
          <span class="cp-av">{{ f.avatar }}</span>
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
            <span class="cp-av sm">{{ g.avatar }}</span>
            <div class="cp-contact-info"><span class="cp-contact-name">{{ g.name }}</span><span class="cp-contact-id">{{ g.members.length }}人</span></div>
          </div>
        </template>
        <div class="cp-contact-group" @click="contactGroupExpand.friends=!contactGroupExpand.friends"><span class="cp-cg-icon fri">📖</span><span class="cp-cg-text">联系人</span><span class="cp-cg-count">{{ friends.length }}</span><span class="cp-cg-arrow" :class="{open:contactGroupExpand.friends}">›</span></div>
        <template v-if="contactGroupExpand.friends">
          <div v-for="f in friends" :key="f.id" class="cp-contact" :class="{active:selectedContact?.spark_id===f.spark_id}" @click="selectContact(f)">
            <span class="cp-av sm">{{ f.avatar }}</span>
            <div class="cp-contact-info"><span class="cp-contact-name">{{ f.remark||f.nickname }}</span></div>
          </div>
        </template>
        <p v-if="!friends.length&&!groups.length" class="cp-empty">还没有联系人</p>
      </div>

      <!-- 动态tab：左侧只显示标签和快速发布，右侧显示完整feed -->
      <div v-if="sideTab==='moments'" class="cp-list moments-tab">
        <div class="cp-post-box">
          <textarea v-model="postContent" placeholder="分享你的想法..." rows="2" maxlength="500"></textarea>
          <div class="cp-post-acts"><select v-model="postVis"><option value="public">🌐 公开</option><option value="friends">👥 好友</option><option value="private">🔒 私密</option></select><button :disabled="!postContent.trim()" @click="handlePost">发布</button></div>
        </div>
        <p class="cp-sb-hint">→ 右侧查看完整朋友圈</p>
      </div>
    </aside>

    <!-- ======== 右侧面板 ======== -->

    <!-- 聊天面板 -->
    <main v-if="rightPanel==='chat'" class="cp-main" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
      <!-- 拖拽遮罩 -->
      <div v-if="isDragging" class="cp-drop-overlay"><div class="cp-drop-box">📁 松开发送文件/图片</div></div>
      <div class="cp-chat-hdr">
        <button class="cp-back" @click="closeRight">←</button>
        <h3>{{ chatTitle }}</h3>
        <span v-if="activeChat?.type==='group'" class="cp-hdr-sub">{{ activeGroup?.members.length }}人</span>
        <button v-if="activeChat?.type==='private'||activeChat?.type==='group'" class="cp-hdr-btn cs-btn" :class="{active:showChatSettings}" @click="showChatSettings=!showChatSettings" title="聊天设置">☰</button>
      </div>
      <div class="cp-chat-body">
        <div class="cp-messages" ref="chatScrollRef">
          <div v-for="msg in chatMessages" :key="msg.id" class="cp-msg" :class="{mine:msg.sender_id===myProfile?.spark_id,ai:msg.sender_type==='ai',sys:msg.type==='system'}" @contextmenu.prevent="e=>showMsgCtxMenu(e,msg)">
            <div v-if="msg.type==='system'" class="cp-sys-msg">{{ msg.content }}</div>
            <template v-else>
              <span v-if="msg.sender_id!==myProfile?.spark_id" class="cp-msg-av" @click="handleViewMsgSender(msg)">{{ msg.sender_avatar }}</span>
              <div class="cp-msg-body">
                <div v-if="msg.sender_id!==myProfile?.spark_id" class="cp-msg-meta"><span class="cp-msg-name">{{ msg.sender_name }}</span></div>
                <div class="cp-bubble">
                  <img v-if="msg.type==='image'&&msg.media_url" :src="msg.media_url" class="cp-bubble-img">
                  <template v-else>{{ msg.content }}</template>
                </div>
                <!-- 时间+已读状态放在消息下方 -->
                <div class="cp-msg-footer" :class="{reverse:msg.sender_id===myProfile?.spark_id}">
                  <span class="cp-msg-time2">{{ formatMsgTime(msg.created_at) }}</span>
                  <span v-if="msg.sender_id===myProfile?.spark_id" class="cp-read-status" :class="{read:msg.is_read}">{{ msg.is_read?'✓':'○' }}</span>
                </div>
              </div>
              <span v-if="msg.sender_id===myProfile?.spark_id" class="cp-msg-av my">{{ myProfile?.avatar }}</span>
            </template>
          </div>
          <div v-if="isAiTyping" class="cp-msg ai"><span class="cp-msg-av">🌟</span><div class="cp-msg-body"><div class="cp-msg-meta"><span class="cp-msg-name">星火AI</span></div><div class="cp-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div></div>
        </div>
        <!-- 右侧聊天设置面板(仿微信) -->
        <Transition name="fade">
          <div v-if="showChatSettings" class="cp-chat-settings">
            <div class="cs-members" v-if="activeChat?.type==='private'">
              <div class="cs-member" @click="handleViewChatFriend"><span class="cs-av">{{ chatFriend?.avatar }}</span><span class="cs-mname">{{ chatFriend?.remark||chatFriend?.nickname }}</span></div>
            </div>
            <div class="cs-section"><div class="cs-row clickable" @click="showToast('查找聊天内容开发中')"><span>查找聊天内容</span><span class="cs-arrow">›</span></div></div>
            <div class="cs-section">
              <div class="cs-row"><span>消息免打扰</span><label class="cs-toggle"><input type="checkbox"><span class="cs-slider"></span></label></div>
              <div class="cs-row"><span>置顶聊天</span><label class="cs-toggle"><input type="checkbox"><span class="cs-slider"></span></label></div>
            </div>
            <button class="cs-clear" @click="showToast('清空聊天记录开发中')">清空聊天记录</button>
          </div>
        </Transition>
      </div>
      <div class="cp-input-area">
        <Transition name="fade"><div v-if="showEmoji" class="cp-emoji-panel"><button v-for="e in EMOJIS" :key="e" @click="chatInput+=e;showEmoji=false">{{ e }}</button></div></Transition>
        <!-- 待发送文件预览 -->
        <div v-if="pendingFiles.length" class="cp-pending-files">
          <div v-for="(f,i) in pendingFiles" :key="i" class="cp-pf-chip">
            <img v-if="f.type==='image'" :src="f.url" class="cp-pf-thumb">
            <span v-else>📄</span>
            <span class="cp-pf-name">{{ f.name }}</span>
            <button @click="pendingFiles.splice(i,1)">×</button>
          </div>
        </div>
        <div class="cp-tools">
          <button @click="showEmoji=!showEmoji" :class="{active:showEmoji}">😊</button>
          <button @click="fileInput?.click()">🖼️</button>
          <button @click="fileInput?.click()">📎</button>
          <button @click="showToast('语音功能开发中')">🎙️</button>
          <div class="cp-tools-r"><button @click="showToast('语音通话开发中')">📞</button><button @click="showToast('视频通话开发中')">📹</button></div>
        </div>
        <input ref="fileInput" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.zip" @change="onFileInput" style="display:none">
        <div class="cp-input-row">
          <textarea v-model="chatInput" :placeholder="activeChat?.type==='group'?'@星火 唤AI · 输入消息...':'输入消息...'" rows="1" @keydown.enter.exact.prevent="handleChatSend" @input="autoResize" @focus="showEmoji=false"></textarea>
          <button class="cp-send" :disabled="!chatInput.trim()&&!pendingFiles.length||isAiTyping" @click="handleChatSend"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        </div>
      </div>
    </main>

    <!-- 通讯录资料卡(仿微信) -->
    <main v-else-if="rightPanel==='contact'" class="cp-main cp-profile-card">
      <div class="pf-header">
        <span class="pf-avatar">{{ selectedContact?.avatar }}</span>
        <div class="pf-info">
          <h2>{{ selectedContact?.remark||selectedContact?.nickname }}</h2>
          <p class="pf-sub">昵称：{{ selectedContact?.nickname }}</p>
          <p class="pf-sub">星火ID：{{ selectedContact?.spark_id }}</p>
        </div>
      </div>
      <div class="pf-section">
        <div class="pf-row"><span class="pf-label">备注</span><span class="pf-val">{{ selectedContact?.remark||selectedContact?.nickname }}</span></div>
      </div>
      <div class="pf-section">
        <div class="pf-row clickable" @click="showToast('查看朋友圈')"><span class="pf-label">朋友圈</span><div class="pf-moments-preview"><span v-for="m in contactMoments(selectedContact?.spark_id||'').slice(0,3)" :key="m.id" class="pf-moment-thumb">📝</span></div><span class="pf-arrow">›</span></div>
      </div>
      <div class="pf-section">
        <div class="pf-row"><span class="pf-label">来源</span><span class="pf-val">通过星火ID添加</span></div>
      </div>
      <div class="pf-section">
        <button class="pf-delete-link" @click="handleRemoveFriend(selectedContact!.spark_id)">删除联系人</button>
      </div>
      <div class="pf-actions">
        <button class="pf-btn primary" @click="openPrivateChat(selectedContact!.spark_id)"><span>💬</span>发消息</button>
        <button class="pf-btn" @click="showToast('语音通话开发中')"><span>📞</span>语音聊天</button>
        <button class="pf-btn" @click="showToast('视频通话开发中')"><span>📹</span>视频聊天</button>
      </div>
    </main>

    <!-- 动态朋友圈(完整feed) / 默认欢迎页 -->
    <main v-else class="cp-main cp-main-feed">
      <div v-if="sideTab==='moments'" class="cp-feed-full">
        <div class="cp-feed-header">
          <div class="cp-feed-cover"></div>
          <div class="cp-feed-me"><span class="cp-av lg">{{ myProfile?.avatar }}</span><span class="cp-feed-myname">{{ myProfile?.nickname }}</span></div>
        </div>
        <div class="cp-post-box feed-post">
          <textarea v-model="postContent" placeholder="这一刻的想法..." rows="2" maxlength="500"></textarea>
          <div class="cp-post-acts"><select v-model="postVis"><option value="public">🌐 公开</option><option value="friends">👥 好友</option><option value="private">🔒 私密</option></select><button :disabled="!postContent.trim()" @click="handlePost">发布</button></div>
        </div>
        <div v-for="m in moments" :key="m.id" class="cp-feed-card">
          <div class="cp-feed-head"><span class="cp-av sm">{{ m.author_avatar }}</span><div class="cp-feed-info"><b>{{ m.author_name }}</b><small>{{ formatTimeAgo(m.created_at) }}</small></div><button v-if="m.author_id===myProfile?.spark_id" class="cp-x" @click="deleteMoment(m.id)">✕</button></div>
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
        <p v-if="!moments.length" class="cp-empty">还没有动态，发一条吧 🌟</p>
      </div>
      <div v-else class="cp-welcome">
        <div class="cp-welcome-icon">💬</div>
        <h3>星火伴侣</h3>
        <p>选择一个对话开始聊天</p>
        <div class="cp-stats" v-if="myProfile"><div class="cp-stat"><span>{{ friends.length }}</span>好友</div><div class="cp-stat"><span>{{ groups.length }}</span>群聊</div><div class="cp-stat"><span>{{ moments.length }}</span>动态</div></div>
      </div>
    </main>

    <!-- 弹窗们 -->
    <Transition name="fade"><div v-if="showSearchModal" class="cp-overlay" @click.self="showSearchModal=false"><div class="cp-modal"><h3>🔍 搜索</h3><div class="cp-field"><input v-model="globalSearch" placeholder="搜索好友、群聊..." @input="handleGlobalSearch"></div><div v-if="globalSearchResults.length" class="cp-search-results"><div v-for="r in globalSearchResults" :key="r.id" class="cp-search-item" @click="r.action();showSearchModal=false"><span class="cp-av sm">{{ r.avatar }}</span><div class="cp-contact-info"><span class="cp-contact-name">{{ r.name }}</span><span class="cp-contact-id">{{ r.desc }}</span></div></div></div><p v-else-if="globalSearch.trim()" class="cp-empty">无结果</p><button class="cp-close-btn" @click="showSearchModal=false">关闭</button></div></div></Transition>
    <Transition name="fade"><div v-if="showAddFriendModal" class="cp-overlay" @click.self="showAddFriendModal=false"><div class="cp-modal sm"><h3>👤 添加好友</h3><div class="cp-field"><label>星火ID 或昵称</label><input v-model="addFriendQuery" placeholder="输入星火ID..." @keydown.enter="handleSearchFriend"></div><button class="cp-save-btn" @click="handleSearchFriend">🔍 搜索</button><p v-if="addFriendResult" class="cp-search-result">找到：{{ addFriendResult.nickname }}<button class="cp-add-btn" @click="handleAddFriendResult">✓ 添加</button></p><div class="cp-modal-btns"><button @click="showAddFriendModal=false">关闭</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showQRModal" class="cp-overlay" @click.self="showQRModal=false"><div class="cp-modal sm"><h3>📱 星火名片</h3><div class="cp-qr-card"><div class="cp-qr-top"><span class="cp-qr-av">{{ myProfile?.avatar }}</span><div><div class="cp-qr-name">{{ myProfile?.nickname }}</div><div class="cp-qr-id">{{ myProfile?.spark_id }}</div></div></div><canvas ref="userQrCanvas" class="cp-qr-canvas"></canvas></div><div class="cp-qr-paste"><p>📋 粘贴二维码数据</p><div class="cp-id-row"><input v-model="qrPasteInput" placeholder="粘贴..."><button @click="handleQRPaste">添加</button></div></div><div class="cp-modal-btns"><button @click="showQRModal=false">关闭</button><button class="primary" @click="copyQRData">📋 复制名片</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showGroupQR" class="cp-overlay" @click.self="showGroupQR=false"><div class="cp-modal sm"><h3>📱 群二维码</h3><div class="cp-qr-card"><div class="cp-qr-top"><span class="cp-qr-av">{{ activeGroup?.avatar }}</span><div><div class="cp-qr-name">{{ activeGroup?.name }}</div></div></div><canvas ref="groupQrCanvas" class="cp-qr-canvas"></canvas></div><div class="cp-modal-btns"><button @click="showGroupQR=false">关闭</button><button class="primary" @click="copyGroupQR">📋 复制</button></div></div></div></Transition>
    <Transition name="fade"><div v-if="showCreateModal" class="cp-overlay" @click.self="showCreateModal=false"><div class="cp-modal"><h3>👥 创建群聊</h3><div class="cp-field"><label>群聊名称</label><input v-model="newGroupName" maxlength="30" placeholder="名字"></div><label class="cp-check"><input type="checkbox" v-model="newGroupAI"> 🌟 星火AI参与群聊</label><div v-if="friends.length" class="cp-member-sel"><p class="cp-field-label">选择成员</p><label v-for="f in friends" :key="f.id" class="cp-member-opt"><input type="checkbox" :value="f.spark_id" v-model="newGroupMembers"> {{ f.avatar }} {{ f.nickname }}</label></div><div class="cp-modal-btns"><button @click="showCreateModal=false">取消</button><button class="primary" :disabled="!newGroupName.trim()" @click="handleCreateGroup">🚀 创建</button></div></div></div></Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useCompanion, formatTimeAgo, type Friend, type ChatMsg } from '../../composables/useCompanion'
import CosmicBackground from '../../components/CosmicBackground.vue'
import QRCode from 'qrcode'

const {
  myProfile, friends, groups, moments, isAiTyping, getQRData,
  addFriend, addFriendByQR, removeFriend, getPrivateChat, sendPrivateMsg,
  markMessagesAsRead, createGroup, sendGroupMsg, postMoment, toggleLike,
  commentMoment, deleteMoment, addFavorite, sendToAI, aiChatHistory, searchUser,
  updateProfile, favorites,
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
const expandedComments = reactive<Record<string,boolean>>({})
const commentInputs = reactive<Record<string,string>>({})
const userQrCanvas = ref<HTMLCanvasElement|null>(null)
const groupQrCanvas = ref<HTMLCanvasElement|null>(null)
const qrPasteInput = ref('')

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
  if(a.unread&&!b.unread)return-1;if(!a.unread&&b.unread)return 1
  const ta=a.last_msg_time?new Date(a.last_msg_time).getTime():0
  const tb=b.last_msg_time?new Date(b.last_msg_time).getTime():0
  return tb-ta
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
function showChatFriendCard(){if(!activeChat.value||activeChat.value.type!=='private')return;const f=friends.value.find(f=>f.spark_id===activeChat.value!.id);if(f)viewProfile.value=f}
function handleViewChatFriend(){if(!activeChat.value||activeChat.value.type!=='private')return;const f=friends.value.find(f=>f.spark_id===activeChat.value!.id);if(f)viewProfile.value=f}
function handleViewMsgSender(msg:ChatMsg){if(msg.sender_type==='ai')return;const f=friends.value.find(f=>f.spark_id===msg.sender_id);if(f)viewProfile.value=f}
const chatFriend = computed(()=>activeChat.value?.type==='private'?friends.value.find(f=>f.spark_id===activeChat.value!.id):null)
async function handleChatSend(){const text=chatInput.value.trim();if((!text&&!pendingFiles.value.length)||isAiTyping.value)return;chatInput.value='';pendingFiles.value=[];if(activeChat.value?.type==='ai'){await sendToAI(text);scrollChat()}else if(activeChat.value?.type==='group'){sendGroupMsg(activeChat.value.id,text);scrollChat()}else if(activeChat.value?.type==='private'){sendPrivateMsg(activeChat.value.id,text);scrollChat()}}
function formatMsgTime(s:string){const d=new Date(s);return`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`}
function autoResize(e:Event){const el=e.target as HTMLTextAreaElement;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px'}
function showCtxMenu(e:MouseEvent,type:string,id:string){ctxMenu.show=true;ctxMenu.x=e.clientX;ctxMenu.y=e.clientY;ctxMenu.type=type;ctxMenu.id=id}
// 消息右键菜单(仿微信)：2分钟内可撤回
function showMsgCtxMenu(e:MouseEvent,msg:ChatMsg){if(msg.type==='system')return;const isMine=msg.sender_id===myProfile.value?.spark_id;const elapsed=Date.now()-new Date(msg.created_at).getTime();msgCtx.show=true;msgCtx.x=e.clientX;msgCtx.y=e.clientY;msgCtx.msgId=msg.id;msgCtx.canRecall=isMine&&elapsed<2*60*1000}
function msgCtxAction(action:string){msgCtx.show=false;if(action==='copy'){const msg=chatMessages.value.find(m=>m.id===msgCtx.msgId);if(msg)navigator.clipboard.writeText(msg.content);showToast('已复制')}else if(action==='recall'){showToast('消息已撤回')}else if(action==='delete'){showToast('已删除(仅自己可见)')}else if(action==='forward'){showToast('转发功能开发中')}else if(action==='favorite'){showToast('已收藏');const msg=chatMessages.value.find(m=>m.id===msgCtx.msgId);if(msg)addFavorite({type:'message',title:'聊天消息',content:msg.content,source:`来自${msg.sender_name}`})}else if(action==='quote'){showToast('引用功能开发中')}else if(action==='select'){showToast('多选功能开发中')}}
// 查看联系人的朋友圈
function contactMoments(sparkId:string){return moments.value.filter(m=>m.author_id===sparkId)}
function ctxMenuAction(action:string){ctxMenu.show=false;if(action==='delete'){confirmDialog.show=true;confirmDialog.title='删除聊天';confirmDialog.text='确定删除该聊天吗？';confirmDialog.btnText='删除';confirmDialog.onConfirm=()=>{showToast('已删除')}}else if(action==='pin')showToast('已置顶');else if(action==='unread'){const f=friends.value.find(f=>f.spark_id===ctxMenu.id);if(f)f.unread=1;showToast('已标记未读')}else if(action==='mute')showToast('已设置免打扰')}
function handleRemoveFriend(sparkId:string){const f=friends.value.find(f=>f.spark_id===sparkId);confirmDialog.show=true;confirmDialog.title='⚠️ 删除联系人';confirmDialog.text=`确定要删除「${f?.nickname||sparkId}」吗？`;confirmDialog.btnText='删除';confirmDialog.onConfirm=()=>{removeFriend(sparkId);selectedContact.value=null;rightPanel.value='none';showToast('已删除')}}
function handleGlobalSearch(){const q=globalSearch.value.trim().toLowerCase();if(!q){globalSearchResults.value=[];return};const r:typeof globalSearchResults.value=[];friends.value.filter(f=>f.nickname.toLowerCase().includes(q)||f.spark_id.includes(q)).forEach(f=>r.push({id:f.id,name:f.nickname,avatar:f.avatar,desc:f.spark_id,action:()=>openPrivateChat(f.spark_id)}));groups.value.filter(g=>g.name.toLowerCase().includes(q)).forEach(g=>r.push({id:g.id,name:g.name,avatar:g.avatar,desc:`${g.members.length}人`,action:()=>openGroupChat(g.id)}));globalSearchResults.value=r.slice(0,10)}
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
function processFiles(files:FileList){for(let i=0;i<files.length;i++){const f=files[i];const isImage=f.type.startsWith('image/');if(isImage){const reader=new FileReader();reader.onload=()=>pendingFiles.value.push({type:'image',name:f.name,url:reader.result as string});reader.readAsDataURL(f)}else{pendingFiles.value.push({type:'file',name:f.name})}}}
onMounted(()=>{window.addEventListener('click',closeMenus);window.addEventListener('resize',()=>isMobile.value=window.innerWidth<768)})
onUnmounted(()=>{window.removeEventListener('click',closeMenus)})
watch(showQRModal,v=>{if(v)nextTick(()=>renderQR(userQrCanvas.value,getQRData()))})
watch(showGroupQR,v=>{if(v&&activeGroup.value)nextTick(()=>renderQR(groupQrCanvas.value,getQRData(undefined,'group',activeGroup.value!.id)))})
watch(()=>chatMessages.value.length,()=>scrollChat())
watch(isAiTyping,()=>scrollChat())
// 切换聊天时关闭设置面板
watch(activeChat,()=>{showChatSettings.value=false})
void updateProfile;void favorites;void addFavorite;void CosmicBackground;void formatTimeAgo;void showChatFriendCard;void viewProfile
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
.cp-messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}.cp-messages::-webkit-scrollbar{width:2px}
.cp-sys-msg{text-align:center;color:rgba(255,255,255,.1);font-size:10px;padding:4px 12px;background:rgba(255,255,255,.015);border-radius:20px;margin:0 auto}
.cp-msg{display:flex;gap:8px;max-width:75%;align-items:flex-start}.cp-msg.mine{margin-left:auto;flex-direction:row-reverse}.cp-msg.sys{margin:0 auto;max-width:100%}
.cp-msg-av{width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid rgba(255,255,255,.03)}.cp-msg-av.my{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.06)}
.cp-msg-body{display:flex;flex-direction:column;gap:2px;min-width:0}.cp-msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px}.cp-msg-name{font-size:9px;color:rgba(255,255,255,.15)}
.cp-bubble-row{display:flex;align-items:flex-end;gap:4px}.cp-bubble-row.reverse{flex-direction:row-reverse}
.cp-bubble{padding:8px 12px;border-radius:14px;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.75);word-break:break-word;white-space:pre-wrap}
.cp-msg:not(.mine):not(.sys) .cp-bubble{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);border-top-left-radius:4px}
.cp-msg.mine .cp-bubble{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.08);border-top-right-radius:4px;color:rgba(255,255,255,.85)}
.cp-msg.ai .cp-bubble{background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);border-top-left-radius:4px}
.cp-msg-time{font-size:8px;color:rgba(255,255,255,.08);white-space:nowrap;flex-shrink:0}
/* 已读状态 */
.cp-read-status{font-size:10px;color:rgba(255,255,255,.12);flex-shrink:0;line-height:1}.cp-read-status.read{color:rgba(139,92,246,.5)}
/* 时间更醒目 */
.cp-msg-time2{font-size:9px;color:rgba(255,255,255,.25);white-space:nowrap;flex-shrink:0;align-self:flex-end}
/* 头像可点击 */
.cp-msg-av{cursor:pointer;transition:transform .15s}.cp-msg-av:hover{transform:scale(1.08)}
/* 图片气泡 */
.cp-bubble-img{max-width:200px;max-height:200px;border-radius:8px;display:block}
/* 消息footer：时间+已读在消息下方 */
.cp-msg-footer{display:flex;align-items:center;gap:4px;padding:1px 4px}.cp-msg-footer.reverse{justify-content:flex-end}

/* 聊天区域布局(消息+设置面板并排) */
.cp-chat-body{flex:1;display:flex;overflow:hidden}
.cp-chat-body .cp-messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
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
/* 拖拽遮罩 */
.cp-drop-overlay{position:absolute;inset:0;z-index:20;background:rgba(139,92,246,.04);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;border:2px dashed rgba(139,92,246,.2);border-radius:12px}
.cp-drop-box{padding:16px 32px;border-radius:12px;background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:14px;font-weight:600}
/* 文件预览 */
.cp-pending-files{display:flex;flex-wrap:wrap;gap:4px;padding:4px 0}
.cp-pf-chip{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);font-size:10px;color:rgba(255,255,255,.35)}
.cp-pf-thumb{width:28px;height:28px;border-radius:4px;object-fit:cover}.cp-pf-name{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-pf-chip button{background:none;border:none;color:rgba(255,255,255,.15);cursor:pointer;font-size:12px}
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
/* 资料卡增强 */
.pf-sub{font-size:11px;color:rgba(255,255,255,.2);margin:2px 0 0}
.pf-moments-preview{display:flex;gap:4px;margin:0 8px}.pf-moment-thumb{font-size:14px}
.pf-delete-link{display:block;width:100%;text-align:center;padding:10px;border:none;background:none;color:rgba(239,68,68,.5);font-size:12px;cursor:pointer;border-radius:8px;transition:all .15s}.pf-delete-link:hover{background:rgba(239,68,68,.04);color:rgba(239,68,68,.7)}
/* 动态广场/朋友圈 */
.cp-main-feed{overflow-y:auto}
.cp-feed-full{padding:0;max-width:100%}
/* 朋友圈封面 */
.cp-feed-header{position:relative;height:180px;background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(59,130,246,.06));border-bottom:1px solid rgba(255,255,255,.03);margin-bottom:40px}
.cp-feed-cover{position:absolute;inset:0;background:linear-gradient(180deg,rgba(139,92,246,.03) 0%,rgba(8,6,18,.8) 100%)}
.cp-feed-me{position:absolute;bottom:-30px;right:24px;display:flex;align-items:flex-end;gap:10px}
.cp-feed-myname{font-size:14px;color:white;font-weight:700;margin-bottom:8px;text-shadow:0 2px 8px rgba(0,0,0,.4)}
/* feed发布框 */
.feed-post{margin:0 20px 16px;padding:12px;border-radius:12px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
/* feed卡片 */
.cp-feed-card{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.02)}
.cp-feed-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cp-feed-info{flex:1;display:flex;flex-direction:column}.cp-feed-info b{font-size:12px;color:rgba(255,255,255,.55)}.cp-feed-info small{color:rgba(255,255,255,.1);font-size:9px;margin-top:1px}
.cp-feed-text{font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;margin:0 0 8px;white-space:pre-wrap}
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
</style>
