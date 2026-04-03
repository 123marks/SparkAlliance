<template>
  <div class="cp-layout">
    <!-- 动态粒子背景 -->
    <canvas ref="particleCanvas" class="cp-particles"></canvas>

    <!-- Toast -->
    <Transition name="toast"><div v-if="toast.show" class="cp-toast">{{ toast.msg }}</div></Transition>

    <!-- 确认对话框 -->
    <Transition name="fade">
      <div v-if="confirmDialog.show" class="cp-overlay" @click.self="confirmDialog.show=false">
        <div class="cp-modal small">
          <h3>{{ confirmDialog.title }}</h3>
          <p class="cp-confirm-text">{{ confirmDialog.text }}</p>
          <div class="cp-modal-btns">
            <button @click="confirmDialog.show=false">取消</button>
            <button class="danger" @click="confirmDialog.onConfirm?.();confirmDialog.show=false">{{ confirmDialog.btnText }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 用户资料查看弹窗 -->
    <Transition name="fade">
      <div v-if="viewProfile" class="cp-overlay" @click.self="viewProfile=null">
        <div class="cp-modal small">
          <div class="cp-view-profile">
            <span class="vp-avatar">{{ viewProfile.avatar }}</span>
            <h3>{{ viewProfile.nickname }}</h3>
            <p class="vp-id">ID: {{ viewProfile.spark_id }}</p>
            <p class="vp-bio">{{ viewProfile.bio || '这个人很懒' }}</p>
            <div v-if="viewProfile.university" class="vp-info">🏫 {{ viewProfile.university }} · {{ viewProfile.school_year }}</div>
          </div>
          <div class="cp-modal-btns">
            <button @click="viewProfile=null">关闭</button>
            <button class="primary" @click="openPrivateChat(viewProfile.spark_id);viewProfile=null">💬 发消息</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 左侧：会话列表 -->
    <aside class="cp-sidebar" :class="{ collapsed: chatOpen }">
      <div class="cp-sb-top">
        <h2 class="cp-logo">💬 伴侣</h2>
        <div class="cp-sb-actions">
          <button @click="showSearchModal=true" class="cp-sb-btn" title="搜索">🔍</button>
          <button @click="showAddMenu=!showAddMenu" class="cp-sb-btn" title="添加">➕</button>
        </div>
        <!-- 添加菜单下拉 -->
        <Transition name="fade">
          <div v-if="showAddMenu" class="cp-add-menu" @click.self="showAddMenu=false">
            <button @click="showAddFriendModal=true;showAddMenu=false">👤 添加好友</button>
            <button @click="showCreateModal=true;showAddMenu=false">👥 创建群聊</button>
            <button @click="showQRModal=true;showAddMenu=false">📱 扫描/名片</button>
          </div>
        </Transition>
      </div>
      <!-- Tab切换 -->
      <div class="cp-tabs">
        <button :class="{active:sideTab==='chat'}" @click="sideTab='chat'">💬 消息</button>
        <button :class="{active:sideTab==='contacts'}" @click="sideTab='contacts'">👥 通讯录</button>
        <button :class="{active:sideTab==='moments'}" @click="sideTab='moments'">📸 动态</button>
      </div>

      <!-- === 消息列表 === -->
      <div v-if="sideTab==='chat'" class="cp-conv-list">
        <div class="cp-conv-item" :class="{active:activeChat?.type==='ai'}" @click="openAIChat">
          <span class="cp-av">🌟</span>
          <div class="cp-conv-info"><span class="cp-conv-name">星火AI伙伴</span><span class="cp-conv-last">智能助手，随时待命</span></div>
        </div>
        <div v-for="g in groups" :key="g.id" class="cp-conv-item" :class="{active:activeChat?.id===g.id}" @click="openGroupChat(g.id)">
          <span class="cp-av">{{ g.avatar }}</span>
          <div class="cp-conv-info">
            <span class="cp-conv-name">{{ g.name }}<span class="cp-conv-count">({{ g.members.length }})</span></span>
            <span class="cp-conv-last">{{ g.messages[g.messages.length-1]?.content?.slice(0,20) || '暂无消息' }}</span>
          </div>
          <span v-if="g.unread" class="cp-badge">{{ g.unread }}</span>
        </div>
        <div v-for="f in sortedFriends" :key="f.id" class="cp-conv-item" :class="{active:activeChat?.id===f.spark_id&&activeChat?.type==='private'}" @click="openPrivateChat(f.spark_id)">
          <span class="cp-av">{{ f.avatar }}</span>
          <div class="cp-conv-info">
            <span class="cp-conv-name">{{ f.remark || f.nickname }}</span>
            <span class="cp-conv-last">{{ f.last_msg || f.bio?.slice(0,20) || '' }}</span>
          </div>
          <span v-if="f.unread" class="cp-badge">{{ f.unread }}</span>
        </div>
      </div>

      <!-- === 通讯录 === -->
      <div v-if="sideTab==='contacts'" class="cp-conv-list">
        <div class="cp-section-title">好友 ({{ friends.length }})</div>
        <div v-for="f in friends" :key="f.id" class="cp-contact-item">
          <span class="cp-av sm" @click="handleViewProfile(f)">{{ f.avatar }}</span>
          <div class="cp-contact-info" @click="openPrivateChat(f.spark_id)">
            <span class="cp-contact-name">{{ f.remark || f.nickname }}</span>
            <span class="cp-contact-id">{{ f.spark_id }}</span>
          </div>
          <button class="cp-contact-act" @click="openPrivateChat(f.spark_id)">💬</button>
          <button class="cp-contact-act del" @click.stop="handleRemoveFriend(f.spark_id)">✕</button>
        </div>
        <div class="cp-section-title">群聊 ({{ groups.length }})</div>
        <div v-for="g in groups" :key="g.id" class="cp-contact-item" @click="openGroupChat(g.id)">
          <span class="cp-av sm">{{ g.avatar }}</span>
          <div class="cp-contact-info">
            <span class="cp-contact-name">{{ g.name }}</span>
            <span class="cp-contact-id">{{ g.members.length }}人</span>
          </div>
          <button class="cp-contact-act" @click="openGroupChat(g.id)">💬</button>
        </div>
      </div>

      <!-- === 动态 === -->
      <div v-if="sideTab==='moments'" class="cp-conv-list moments-tab">
        <div class="cp-post-entry">
          <textarea v-model="postContent" class="cp-post-input" placeholder="分享你的想法..." rows="2" maxlength="500"></textarea>
          <div class="cp-post-actions">
            <select v-model="postVis" class="cp-post-vis">
              <option value="public">🌐 公开</option><option value="friends">👥 好友</option><option value="private">🔒 私密</option>
            </select>
            <button class="cp-post-btn" :disabled="!postContent.trim()" @click="handlePost">发布</button>
          </div>
        </div>
        <div v-for="m in moments" :key="m.id" class="cp-moment">
          <div class="cp-moment-head">
            <span class="cp-av sm">{{ m.author_avatar }}</span>
            <div><span class="cp-moment-name">{{ m.author_name }}</span><span class="cp-moment-time">{{ formatTimeAgo(m.created_at) }}</span></div>
            <button v-if="m.author_id===myProfile?.spark_id" class="cp-moment-del" @click="handleDeleteMoment(m.id)">✕</button>
          </div>
          <p class="cp-moment-text">{{ m.content }}</p>
          <div class="cp-moment-acts">
            <button :class="{liked:m.likes.includes(myProfile?.spark_id||'')}" @click="handleLike(m.id)">❤️ {{ m.likes.length || '' }}</button>
            <button @click="toggleCommentInput(m.id)">💬 {{ m.comments.length || '' }}</button>
            <button @click="handleFavMoment(m)">⭐</button>
          </div>
          <div v-if="expandedComments[m.id]" class="cp-comments">
            <div v-for="c in m.comments" :key="c.id" class="cp-comment"><span class="cp-comment-name">{{ c.author_name }}：</span>{{ c.content }}</div>
            <div class="cp-comment-input"><input v-model="commentInputs[m.id]" placeholder="写评论..." @keydown.enter="handleComment(m.id)"><button @click="handleComment(m.id)">发</button></div>
          </div>
        </div>
        <p v-if="moments.length===0" class="cp-empty">还没有动态 🌟</p>
      </div>
    </aside>

    <!-- 右侧：聊天面板 / 朋友圈 -->
    <main class="cp-main" v-if="chatOpen">
      <div class="cp-chat-header">
        <button class="cp-back" @click="chatOpen=false">←</button>
        <h3>{{ chatTitle }}</h3>
        <span v-if="activeChat?.type==='group'" class="cp-member-count">{{ activeGroup?.members.length }}人</span>
        <button v-if="activeChat?.type==='group'" class="cp-header-btn" @click="showGroupQR=true">📱</button>
        <button v-if="activeChat?.type==='private'" class="cp-header-btn" @click="handleViewChatFriend">👤</button>
      </div>
      <div class="cp-messages" ref="chatScrollRef">
        <div v-for="msg in chatMessages" :key="msg.id" class="cp-msg" :class="{mine:msg.sender_id===myProfile?.spark_id, ai:msg.sender_type==='ai', sys:msg.type==='system'}">
          <!-- 系统消息 -->
          <div v-if="msg.type==='system'" class="cp-sys-msg">{{ msg.content }}</div>
          <!-- 普通消息 -->
          <template v-else>
            <span v-if="msg.sender_id!==myProfile?.spark_id" class="cp-msg-av" @click="handleViewMsgSender(msg)">{{ msg.sender_avatar }}</span>
            <div class="cp-msg-body">
              <div class="cp-msg-meta" v-if="msg.sender_id!==myProfile?.spark_id">
                <span class="cp-msg-name">{{ msg.sender_name }}</span>
                <span class="cp-msg-time">{{ formatMsgTime(msg.created_at) }}</span>
              </div>
              <div class="cp-msg-meta right" v-else>
                <span class="cp-msg-time">{{ formatMsgTime(msg.created_at) }}</span>
                <span class="cp-msg-read">✓✓</span>
              </div>
              <div class="cp-msg-bubble">{{ msg.content }}</div>
            </div>
            <span v-if="msg.sender_id===myProfile?.spark_id" class="cp-msg-av my">{{ myProfile?.avatar }}</span>
          </template>
        </div>
        <!-- AI 输入中 -->
        <div v-if="isAiTyping" class="cp-msg ai">
          <span class="cp-msg-av">🌟</span>
          <div class="cp-msg-body">
            <div class="cp-msg-meta"><span class="cp-msg-name">星火AI</span></div>
            <div class="cp-msg-bubble"><span class="cp-typing-dots"><span></span><span></span><span></span></span></div>
          </div>
        </div>
      </div>
      <!-- 输入区 -->
      <div class="cp-input-area">
        <div class="cp-input-tools">
          <button title="表情">😊</button>
          <button title="图片">🖼️</button>
          <button title="文件">📎</button>
        </div>
        <div class="cp-input-row">
          <textarea v-model="chatInput" :placeholder="activeChat?.type==='group'?'@星火 唤AI · 输入消息...':'输入消息...'" rows="1" @keydown.enter.exact.prevent="handleChatSend" @input="autoResizeChat"></textarea>
          <button class="cp-send" :disabled="!chatInput.trim()||isAiTyping" @click="handleChatSend">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </main>
    <!-- 未选择聊天：展示朋友圈摘要 -->
    <main v-else class="cp-main cp-main-feed">
      <div class="cp-feed-header">
        <h2>⚡ 星火动态广场</h2>
        <p>好友们的最新分享</p>
      </div>
      <div class="cp-feed-list">
        <div v-for="m in moments" :key="m.id" class="cp-feed-card">
          <div class="cp-feed-head">
            <span class="cp-av sm">{{ m.author_avatar }}</span>
            <div><span class="cp-feed-name">{{ m.author_name }}</span><span class="cp-feed-time">{{ formatTimeAgo(m.created_at) }}</span></div>
          </div>
          <p class="cp-feed-text">{{ m.content }}</p>
          <div class="cp-feed-acts">
            <button :class="{liked:m.likes.includes(myProfile?.spark_id||'')}" @click="handleLike(m.id)">❤️ {{ m.likes.length }}</button>
            <button @click="sideTab='moments'">💬 {{ m.comments.length }}</button>
            <button @click="handleFavMoment(m)">⭐ 收藏</button>
          </div>
        </div>
        <div v-if="moments.length===0" class="cp-feed-empty">
          <div class="cp-feed-empty-icon">💬</div>
          <h3>星火伴侣</h3>
          <p>选择一个对话开始聊天</p>
          <div class="cp-feed-stats" v-if="myProfile">
            <div class="cp-stat"><span class="cp-stat-num">{{ friends.length }}</span>好友</div>
            <div class="cp-stat"><span class="cp-stat-num">{{ groups.length }}</span>群聊</div>
            <div class="cp-stat"><span class="cp-stat-num">{{ moments.length }}</span>动态</div>
          </div>
        </div>
      </div>
    </main>

    <!-- === 搜索弹窗 === -->
    <Transition name="fade">
      <div v-if="showSearchModal" class="cp-overlay" @click.self="showSearchModal=false">
        <div class="cp-modal">
          <h3>🔍 搜索</h3>
          <div class="cp-field"><input v-model="globalSearch" placeholder="搜索聊天记录、好友、群聊..." @input="handleGlobalSearch"></div>
          <div v-if="globalSearchResults.length" class="cp-search-results">
            <div v-for="r in globalSearchResults" :key="r.id" class="cp-search-item" @click="r.action();showSearchModal=false">
              <span class="cp-av sm">{{ r.avatar }}</span>
              <div class="cp-contact-info"><span class="cp-contact-name">{{ r.name }}</span><span class="cp-contact-id">{{ r.desc }}</span></div>
            </div>
          </div>
          <p v-else-if="globalSearch.trim()" class="cp-empty">无结果</p>
          <button class="cp-close-btn" @click="showSearchModal=false">关闭</button>
        </div>
      </div>
    </Transition>

    <!-- === 添加好友弹窗 === -->
    <Transition name="fade">
      <div v-if="showAddFriendModal" class="cp-overlay" @click.self="showAddFriendModal=false">
        <div class="cp-modal small">
          <h3>👤 添加好友</h3>
          <div class="cp-field"><label>星火ID 或昵称</label><input v-model="addFriendQuery" placeholder="输入好友的星火ID..." @keydown.enter="handleSearchFriend"></div>
          <button class="cp-save-btn" @click="handleSearchFriend">🔍 搜索</button>
          <p v-if="addFriendResult" class="cp-search-result">
            找到：{{ addFriendResult.nickname }}（{{ addFriendResult.spark_id }}）
            <button class="cp-add-btn" @click="handleAddFriendResult">✓ 添加</button>
          </p>
          <div class="cp-modal-btns"><button @click="showAddFriendModal=false">关闭</button></div>
        </div>
      </div>
    </Transition>

    <!-- === 二维码弹窗 === -->
    <Transition name="fade">
      <div v-if="showQRModal" class="cp-overlay" @click.self="showQRModal=false">
        <div class="cp-modal small">
          <h3>📱 星火名片 / 扫码</h3>
          <div class="cp-qr-card">
            <div class="cp-qr-top"><span class="cp-qr-av">{{ myProfile?.avatar }}</span><div><div class="cp-qr-name">{{ myProfile?.nickname }}</div><div class="cp-qr-id">{{ myProfile?.spark_id }}</div></div></div>
            <canvas ref="userQrCanvas" class="cp-qr-canvas"></canvas>
            <p class="cp-qr-tip">扫一扫添加我为星火好友</p>
          </div>
          <div class="cp-qr-paste">
            <p>📋 粘贴好友/群聊二维码</p>
            <div class="cp-id-row"><input v-model="qrPasteInput" class="cp-dark-input" placeholder="粘贴二维码数据..."><button @click="handleQRPaste">添加</button></div>
          </div>
          <div class="cp-modal-btns"><button @click="showQRModal=false">关闭</button><button class="primary" @click="copyQRData">📋 复制名片</button></div>
        </div>
      </div>
    </Transition>

    <!-- === 群二维码弹窗 === -->
    <Transition name="fade">
      <div v-if="showGroupQR" class="cp-overlay" @click.self="showGroupQR=false">
        <div class="cp-modal small">
          <h3>📱 群聊二维码</h3>
          <div class="cp-qr-card">
            <div class="cp-qr-top"><span class="cp-qr-av">{{ activeGroup?.avatar }}</span><div><div class="cp-qr-name">{{ activeGroup?.name }}</div><div class="cp-qr-id">{{ activeGroup?.members.length }}人</div></div></div>
            <canvas ref="groupQrCanvas" class="cp-qr-canvas"></canvas>
          </div>
          <div class="cp-modal-btns"><button @click="showGroupQR=false">关闭</button><button class="primary" @click="copyGroupQR">📋 复制</button></div>
        </div>
      </div>
    </Transition>

    <!-- === 创建群聊弹窗 === -->
    <Transition name="fade">
      <div v-if="showCreateModal" class="cp-overlay" @click.self="showCreateModal=false">
        <div class="cp-modal">
          <h3>👥 创建群聊</h3>
          <div class="cp-field"><label>群聊名称</label><input v-model="newGroupName" maxlength="30" placeholder="给群聊起个名字"></div>
          <label class="cp-check"><input type="checkbox" v-model="newGroupAI"> 🌟 星火AI参与群聊（@星火 触发）</label>
          <div class="cp-member-select" v-if="friends.length">
            <p class="cp-field-label">选择成员</p>
            <label v-for="f in friends" :key="f.id" class="cp-member-opt"><input type="checkbox" :value="f.spark_id" v-model="newGroupMembers"> {{ f.avatar }} {{ f.nickname }}</label>
          </div>
          <div class="cp-modal-btns"><button @click="showCreateModal=false">取消</button><button class="primary" :disabled="!newGroupName.trim()" @click="handleCreateGroup">🚀 创建</button></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue'
import { useCompanion, formatTimeAgo, type Friend, type SparkProfile, type ChatMsg } from '../../composables/useCompanion'
import QRCode from 'qrcode'

const {
  myProfile, friends, groups, moments, favorites, isAiTyping,
  updateProfile, getQRData, addFriend, addFriendByQR,
  removeFriend, getPrivateChat, sendPrivateMsg, createGroup, sendGroupMsg,
  postMoment, toggleLike, commentMoment, deleteMoment, addFavorite, removeFavorite,
  sendToAI, aiChatHistory, searchUser,
} = useCompanion()

// 状态
const sideTab = ref<'chat'|'contacts'|'moments'>('chat')
const chatOpen = ref(false)
const activeChat = ref<{id:string;type:'private'|'group'|'ai'}|null>(null)
const chatInput = ref('')
const chatScrollRef = ref<HTMLElement|null>(null)
const toast = reactive({ show: false, msg: '' })
const particleCanvas = ref<HTMLCanvasElement|null>(null)
let animFrameId = 0

// 弹窗
const showSearchModal = ref(false)
const showAddFriendModal = ref(false)
const showQRModal = ref(false)
const showGroupQR = ref(false)
const showCreateModal = ref(false)
const showAddMenu = ref(false)
const viewProfile = ref<SparkProfile|Friend|null>(null)

// 确认框
const confirmDialog = reactive<{show:boolean;title:string;text:string;btnText:string;onConfirm:(()=>void)|null}>({ show:false,title:'',text:'',btnText:'确认',onConfirm:null })

// 搜索
const globalSearch = ref('')
const globalSearchResults = ref<{id:string;name:string;avatar:string;desc:string;action:()=>void}[]>([])
const addFriendQuery = ref('')
const addFriendResult = ref<ReturnType<typeof searchUser>>(null)

// 群聊创建
const newGroupName = ref(''); const newGroupAI = ref(true); const newGroupMembers = ref<string[]>([])

// 动态
const postContent = ref(''); const postVis = ref<'public'|'friends'|'private'>('public')
const expandedComments = reactive<Record<string,boolean>>({})
const commentInputs = reactive<Record<string,string>>({})

// QR
const userQrCanvas = ref<HTMLCanvasElement|null>(null)
const groupQrCanvas = ref<HTMLCanvasElement|null>(null)
const qrPasteInput = ref('')

// 计算属性
const activeGroup = computed(() => activeChat.value?.type==='group' ? groups.value.find(g=>g.id===activeChat.value!.id) : null)
const chatTitle = computed(() => {
  if (!activeChat.value) return ''
  if (activeChat.value.type==='ai') return '🌟 星火AI伙伴'
  if (activeChat.value.type==='group') return activeGroup.value?.name || '群聊'
  const f = friends.value.find(f=>f.spark_id===activeChat.value!.id)
  return f?.remark || f?.nickname || '私聊'
})
const chatMessages = computed(() => {
  if (!activeChat.value) return []
  if (activeChat.value.type==='ai') return aiChatHistory.value
  if (activeChat.value.type==='group') return activeGroup.value?.messages || []
  return getPrivateChat(activeChat.value.id)
})
const sortedFriends = computed(() => {
  return [...friends.value].sort((a,b) => {
    // 有未读放前面
    if (a.unread && !b.unread) return -1
    if (!a.unread && b.unread) return 1
    // 按最后消息时间排序
    const ta = a.last_msg_time ? new Date(a.last_msg_time).getTime() : 0
    const tb = b.last_msg_time ? new Date(b.last_msg_time).getTime() : 0
    return tb - ta
  })
})

// 通知
function showToast(msg:string) { toast.msg=msg; toast.show=true; setTimeout(()=>{toast.show=false},2000) }

// 聊天操作
function openAIChat() { activeChat.value={id:'ai',type:'ai'}; chatOpen.value=true; scrollChat() }
function openGroupChat(id:string) {
  activeChat.value={id,type:'group'}; chatOpen.value=true
  // 清除未读
  const g = groups.value.find(g=>g.id===id)
  if (g) g.unread = 0
  scrollChat()
}
function openPrivateChat(sparkId:string) {
  activeChat.value={id:sparkId,type:'private'}; chatOpen.value=true
  // 清除未读
  const f = friends.value.find(f=>f.spark_id===sparkId)
  if (f && f.unread > 0) { f.unread = 0 }
  scrollChat()
}
function scrollChat() { nextTick(()=>{if(chatScrollRef.value) chatScrollRef.value.scrollTop=chatScrollRef.value.scrollHeight}) }

async function handleChatSend() {
  const text = chatInput.value.trim()
  if (!text || isAiTyping.value) return
  chatInput.value = ''
  if (activeChat.value?.type==='ai') { await sendToAI(text); scrollChat() }
  else if (activeChat.value?.type==='group') { sendGroupMsg(activeChat.value.id, text); scrollChat() }
  else if (activeChat.value?.type==='private') { sendPrivateMsg(activeChat.value.id, text); scrollChat() }
}

function formatMsgTime(dateStr:string):string {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

// 查看资料
function handleViewProfile(f:Friend) {
  viewProfile.value = { spark_id:f.spark_id, nickname:f.nickname, avatar:f.avatar, bio:f.bio, id:f.id, user_id:f.spark_id, gender:'', university:'', school_year:'', interests:[], show_in_plaza:true, id_changed:false, created_at:f.added_at }
}
function handleViewMsgSender(msg:ChatMsg) {
  if (msg.sender_type === 'ai') return
  const f = friends.value.find(f=>f.spark_id===msg.sender_id)
  if (f) handleViewProfile(f)
}
function handleViewChatFriend() {
  if (!activeChat.value || activeChat.value.type !== 'private') return
  const f = friends.value.find(f=>f.spark_id===activeChat.value!.id)
  if (f) handleViewProfile(f)
}

// 搜索
function handleGlobalSearch() {
  const q = globalSearch.value.trim().toLowerCase()
  if (!q) { globalSearchResults.value = []; return }
  const results: typeof globalSearchResults.value = []
  // 搜索好友
  friends.value.filter(f=>f.nickname.toLowerCase().includes(q)||f.spark_id.includes(q)).forEach(f=>{
    results.push({id:f.id,name:f.nickname,avatar:f.avatar,desc:f.spark_id,action:()=>openPrivateChat(f.spark_id)})
  })
  // 搜索群聊
  groups.value.filter(g=>g.name.toLowerCase().includes(q)).forEach(g=>{
    results.push({id:g.id,name:g.name,avatar:g.avatar,desc:`${g.members.length}人`,action:()=>openGroupChat(g.id)})
  })
  globalSearchResults.value = results.slice(0,10)
}

// 添加好友
function handleSearchFriend() {
  addFriendResult.value = addFriendQuery.value.trim() ? searchUser(addFriendQuery.value.trim()) : null
}
function handleAddFriendResult() {
  if (!addFriendResult.value) return
  const r = addFriend({ spark_id:addFriendResult.value.spark_id, nickname:addFriendResult.value.nickname, avatar:addFriendResult.value.avatar, bio:addFriendResult.value.bio })
  showToast(r.msg); addFriendResult.value=null; addFriendQuery.value=''; showAddFriendModal.value=false
}

// 删除好友 — 确认
function handleRemoveFriend(sparkId:string) {
  const f = friends.value.find(f=>f.spark_id===sparkId)
  confirmDialog.show = true
  confirmDialog.title = '⚠️ 删除好友'
  confirmDialog.text = `确定要删除「${f?.nickname || sparkId}」吗？删除后聊天记录将丢失。`
  confirmDialog.btnText = '确认删除'
  confirmDialog.onConfirm = () => { removeFriend(sparkId); showToast('已删除') }
}

function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  createGroup(newGroupName.value.trim(), newGroupMembers.value, newGroupAI.value)
  showToast('群聊已创建！'); showCreateModal.value=false; newGroupName.value=''; newGroupMembers.value=[]
}

// 动态
function handlePost() {
  if (!postContent.value.trim()) return
  postMoment(postContent.value.trim(),[],postVis.value); postContent.value=''; showToast('动态已发布')
}
function handleLike(id:string) { toggleLike(id) }
function handleDeleteMoment(id:string) { deleteMoment(id); showToast('已删除') }
function toggleCommentInput(id:string) { expandedComments[id]=!expandedComments[id] }
function handleComment(id:string) { const c=commentInputs[id]?.trim(); if(!c) return; commentMoment(id,c); commentInputs[id]='' }
function handleFavMoment(m:any) { addFavorite({type:'moment',title:m.content.slice(0,30),content:m.content,source:m.author_name}); showToast('已收藏') }

function autoResizeChat(e:Event) { const el=e.target as HTMLTextAreaElement; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px' }

// 二维码
async function renderQR(canvas:HTMLCanvasElement|null, data:string) {
  if (!canvas) return
  try { await QRCode.toCanvas(canvas, data, { width:160, margin:2, color:{dark:'#8b5cf6',light:'#0d0a1a'} }) } catch {}
}
function copyQRData() { navigator.clipboard.writeText(getQRData()); showToast('名片已复制') }
function copyGroupQR() { if(activeGroup.value) { navigator.clipboard.writeText(getQRData(undefined,'group',activeGroup.value.id)); showToast('群二维码已复制') } }
function handleQRPaste() { const r=addFriendByQR(qrPasteInput.value.trim()); showToast(r.msg); if(r.ok) qrPasteInput.value='' }

// 粒子背景
function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2 }
  resize(); window.addEventListener('resize', resize)

  const particles: { x:number; y:number; vx:number; vy:number; r:number; a:number }[] = []
  for (let i = 0; i < 60; i++) {
    particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, r:Math.random()*1.5+0.5, a:Math.random()*0.4+0.05 })
  }

  function draw() {
    ctx!.clearRect(0,0,canvas!.width,canvas!.height)
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = canvas!.width; if (p.x > canvas!.width) p.x = 0
      if (p.y < 0) p.y = canvas!.height; if (p.y > canvas!.height) p.y = 0
      ctx!.beginPath(); ctx!.arc(p.x,p.y,p.r,0,Math.PI*2)
      ctx!.fillStyle = `rgba(139,92,246,${p.a})`; ctx!.fill()
    }
    animFrameId = requestAnimationFrame(draw)
  }
  draw()
}

// 监听
watch(showQRModal, v=>{ if(v) nextTick(()=>renderQR(userQrCanvas.value, getQRData())) })
watch(showGroupQR, v=>{ if(v&&activeGroup.value) nextTick(()=>renderQR(groupQrCanvas.value, getQRData(undefined,'group',activeGroup.value!.id))) })
watch(()=>chatMessages.value.length, ()=>scrollChat())
watch(isAiTyping, ()=>scrollChat())

onMounted(()=>{ initParticles() })
onUnmounted(()=>{ cancelAnimationFrame(animFrameId) })

// 抑制lint
void updateProfile; void favorites; void removeFavorite
</script>

<style scoped>
/* ============ 布局 ============ */
.cp-layout{display:flex;height:calc(100vh - 72px);background:#0a0814;overflow:hidden;position:relative}
.cp-particles{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.6}
.cp-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:8px 24px;border-radius:12px;background:rgba(139,92,246,.15);backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,.12);color:rgba(139,92,246,.9);font-size:12px;font-weight:600;z-index:300;white-space:nowrap}
.toast-enter-active{transition:all .3s}.toast-leave-active{transition:all .25s}.toast-enter-from{opacity:0;transform:translateX(-50%) translateY(-14px)}.toast-leave-to{opacity:0}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}

/* 确认框 */
.cp-confirm-text{font-size:12px;color:rgba(255,255,255,.4);text-align:center;line-height:1.6;margin:0 0 10px}
.cp-modal-btns button.danger{background:rgba(239,68,68,.12);color:rgba(239,68,68,.8);border-color:rgba(239,68,68,.15)}

/* 查看资料 */
.cp-view-profile{text-align:center;padding:14px 0}
.vp-avatar{font-size:48px;display:block;margin-bottom:8px}
.vp-id{font-size:10px;color:rgba(139,92,246,.4);margin:2px 0 8px}
.vp-bio{font-size:12px;color:rgba(255,255,255,.3);margin:0 0 6px}
.vp-info{font-size:11px;color:rgba(255,255,255,.2)}

/* 左侧栏 */
.cp-sidebar{width:300px;border-right:1px solid rgba(255,255,255,.04);display:flex;flex-direction:column;flex-shrink:0;background:rgba(8,6,18,.92);backdrop-filter:blur(20px);z-index:2;position:relative}
.cp-sb-top{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.03);position:relative}
.cp-logo{font-size:14px;margin:0;color:white;font-weight:700}
.cp-sb-actions{display:flex;gap:2px}
.cp-sb-btn{width:30px;height:30px;border-radius:8px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.cp-sb-btn:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}

/* 添加下拉菜单 */
.cp-add-menu{position:absolute;top:100%;right:8px;background:rgba(14,11,28,.97);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:4px;z-index:20;box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:140px}
.cp-add-menu button{display:flex;width:100%;align-items:center;gap:6px;padding:8px 12px;border:none;background:none;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer;border-radius:7px;transition:all .12s}
.cp-add-menu button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}

.cp-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.03)}
.cp-tabs button{flex:1;padding:9px 0;border:none;background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;font-weight:500;transition:all .15s;border-bottom:2px solid transparent}
.cp-tabs button.active{color:rgba(139,92,246,.7);border-bottom-color:rgba(139,92,246,.3)}
.cp-conv-list{flex:1;overflow-y:auto;padding:4px}
.cp-conv-list::-webkit-scrollbar{width:2px}.cp-conv-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-conv-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s}
.cp-conv-item:hover{background:rgba(255,255,255,.02)}.cp-conv-item.active{background:rgba(139,92,246,.06)}
.cp-av{width:34px;height:34px;border-radius:9px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;cursor:pointer;transition:all .15s}
.cp-av:hover{background:rgba(139,92,246,.12)}
.cp-av.sm{width:28px;height:28px;font-size:13px;border-radius:7px}
.cp-conv-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.cp-conv-name{font-size:12px;color:rgba(255,255,255,.6);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-conv-count{font-size:10px;color:rgba(255,255,255,.15);margin-left:3px}
.cp-conv-last{font-size:10px;color:rgba(255,255,255,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-badge{min-width:16px;height:16px;border-radius:8px;background:rgba(239,68,68,.6);color:white;font-size:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:700;animation:pulse-badge 2s infinite}
@keyframes pulse-badge{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}

/* 通讯录 */
.cp-section-title{font-size:9px;color:rgba(255,255,255,.1);padding:10px 10px 3px;font-weight:700;letter-spacing:1px}
.cp-contact-item{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;transition:all .12s}
.cp-contact-item:hover{background:rgba(255,255,255,.015)}
.cp-contact-info{flex:1;min-width:0;display:flex;flex-direction:column;cursor:pointer}
.cp-contact-name{font-size:11px;color:rgba(255,255,255,.5)}.cp-contact-id{font-size:9px;color:rgba(255,255,255,.1)}
.cp-contact-act{width:26px;height:26px;border-radius:6px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
.cp-contact-act:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.5)}
.cp-contact-act.del:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}

/* 动态 */
.moments-tab{padding:8px}
.cp-post-entry{margin-bottom:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
.cp-post-input{width:100%;background:none;border:none;color:white;font-size:12px;resize:none;outline:none;font-family:inherit;line-height:1.5}
.cp-post-input::placeholder{color:rgba(255,255,255,.12)}
.cp-post-actions{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.cp-post-vis{padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;outline:none}
.cp-post-btn{padding:4px 14px;border-radius:7px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:10px;font-weight:600;cursor:pointer}
.cp-post-btn:disabled{opacity:.3;cursor:default}
.cp-moment{padding:10px;border-radius:10px;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.02);margin-bottom:6px}
.cp-moment-head{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.cp-moment-name{font-size:11px;color:rgba(255,255,255,.5);font-weight:600}.cp-moment-time{font-size:9px;color:rgba(255,255,255,.1);margin-left:4px}
.cp-moment-del{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.1);cursor:pointer;font-size:11px}
.cp-moment-text{font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;margin:0 0 6px;white-space:pre-wrap}
.cp-moment-acts{display:flex;gap:6px}
.cp-moment-acts button{padding:2px 8px;border-radius:5px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:10px;cursor:pointer;transition:all .15s}
.cp-moment-acts button:hover{background:rgba(139,92,246,.04);color:rgba(139,92,246,.5)}
.cp-moment-acts button.liked{color:rgba(239,68,68,.5)}
.cp-comments{margin-top:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,.01)}
.cp-comment{font-size:10px;color:rgba(255,255,255,.3);margin-bottom:3px}.cp-comment-name{color:rgba(139,92,246,.5);font-weight:600}
.cp-comment-input{display:flex;gap:4px;margin-top:4px}
.cp-comment-input input{flex:1;padding:4px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.03);background:rgba(255,255,255,.02);color:white;font-size:10px;outline:none}
.cp-comment-input button{padding:2px 8px;border-radius:5px;border:none;background:rgba(139,92,246,.08);color:rgba(139,92,246,.6);font-size:10px;cursor:pointer}
.cp-empty{text-align:center;padding:30px 0;color:rgba(255,255,255,.08);font-size:11px}

/* ============ 右侧聊天面板 ============ */
.cp-main{flex:1;display:flex;flex-direction:column;min-width:0;z-index:1;position:relative}
.cp-chat-header{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04);flex-shrink:0;background:rgba(8,6,18,.7);backdrop-filter:blur(20px)}
.cp-chat-header h3{margin:0;font-size:14px;color:white;font-weight:600;flex:1}
.cp-back{background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:4px;transition:all .12s}
.cp-back:hover{color:rgba(139,92,246,.6)}
.cp-member-count{font-size:10px;color:rgba(255,255,255,.15)}
.cp-header-btn{background:none;border:none;font-size:15px;cursor:pointer;transition:all .12s;padding:4px}
.cp-header-btn:hover{transform:scale(1.15)}

/* 消息列表 */
.cp-messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.cp-messages::-webkit-scrollbar{width:2px}.cp-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}

/* 系统消息 */
.cp-sys-msg{text-align:center;color:rgba(255,255,255,.1);font-size:10px;padding:4px 12px;background:rgba(255,255,255,.015);border-radius:20px;margin:0 auto;max-width:60%}

/* 消息气泡 — 微信/QQ风格 */
.cp-msg{display:flex;gap:8px;max-width:75%;align-items:flex-start}
.cp-msg.mine{margin-left:auto;flex-direction:row-reverse}
.cp-msg.sys{margin:0 auto;max-width:100%}
.cp-msg-av{width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;cursor:pointer;transition:all .15s;border:1px solid rgba(255,255,255,.03)}
.cp-msg-av:hover{border-color:rgba(139,92,246,.15);transform:scale(1.05)}
.cp-msg-av.my{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.06)}
.cp-msg-body{display:flex;flex-direction:column;gap:2px;min-width:0}
.cp-msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px}
.cp-msg-meta.right{justify-content:flex-end}
.cp-msg-name{font-size:9px;color:rgba(255,255,255,.15)}
.cp-msg-time{font-size:8px;color:rgba(255,255,255,.08)}
.cp-msg-read{font-size:9px;color:rgba(139,92,246,.3)}
.cp-msg-bubble{padding:8px 12px;border-radius:14px;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.75);word-break:break-word;white-space:pre-wrap;position:relative}

/* 别人的消息 — 左侧 */
.cp-msg:not(.mine):not(.sys) .cp-msg-bubble{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);border-top-left-radius:4px}
/* 自己的消息 — 右侧紫色 */
.cp-msg.mine .cp-msg-bubble{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.08);border-top-right-radius:4px;color:rgba(255,255,255,.85)}
/* AI 消息 */
.cp-msg.ai .cp-msg-bubble{background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);border-top-left-radius:4px}

.cp-typing-dots{display:flex;gap:4px;padding:4px 0}.cp-typing-dots span{width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,.3);animation:dot 1.4s infinite}.cp-typing-dots span:nth-child(2){animation-delay:.2s}.cp-typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}

/* 输入区 */
.cp-input-area{padding:8px 14px 12px;border-top:1px solid rgba(255,255,255,.03);flex-shrink:0;background:rgba(8,6,18,.6);backdrop-filter:blur(16px)}
.cp-input-tools{display:flex;gap:2px;margin-bottom:6px}
.cp-input-tools button{width:28px;height:28px;border-radius:7px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.25);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
.cp-input-tools button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.5)}
.cp-input-row{display:flex;gap:6px;align-items:flex-end}
.cp-input-row textarea{flex:1;padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:12px;resize:none;outline:none;font-family:inherit;line-height:1.5;min-height:22px;max-height:100px;transition:border-color .15s}
.cp-input-row textarea:focus{border-color:rgba(139,92,246,.15)}
.cp-input-row textarea::placeholder{color:rgba(255,255,255,.12)}
.cp-send{width:34px;height:34px;border-radius:9px;border:none;background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(109,40,217,.2));color:rgba(139,92,246,.6);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.cp-send:hover:not(:disabled){background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white}
.cp-send:disabled{opacity:.2;cursor:default}

/* ============ 右侧朋友圈广场 ============ */
.cp-main-feed{z-index:1;position:relative;overflow-y:auto}
.cp-feed-header{padding:24px 32px 8px;text-align:center}
.cp-feed-header h2{color:white;font-size:16px;font-weight:700;margin:0 0 4px}.cp-feed-header p{color:rgba(255,255,255,.15);font-size:11px;margin:0}
.cp-feed-list{padding:8px 20px;max-width:640px;margin:0 auto}
.cp-feed-card{padding:14px;border-radius:14px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:10px;transition:all .15s}
.cp-feed-card:hover{border-color:rgba(139,92,246,.06);background:rgba(255,255,255,.02)}
.cp-feed-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cp-feed-name{font-size:12px;color:rgba(255,255,255,.55);font-weight:600}.cp-feed-time{font-size:9px;color:rgba(255,255,255,.1);margin-left:6px}
.cp-feed-text{font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;margin:0 0 8px;white-space:pre-wrap}
.cp-feed-acts{display:flex;gap:8px}
.cp-feed-acts button{padding:4px 10px;border-radius:6px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:10px;cursor:pointer;transition:all .15s}
.cp-feed-acts button:hover{background:rgba(139,92,246,.04);color:rgba(139,92,246,.5)}
.cp-feed-acts button.liked{color:rgba(239,68,68,.5)}
.cp-feed-empty{text-align:center;padding:60px 0}
.cp-feed-empty-icon{font-size:40px;margin-bottom:8px}
.cp-feed-empty h3{color:white;font-size:16px;margin:0 0 4px;font-weight:700}.cp-feed-empty p{color:rgba(255,255,255,.15);font-size:11px;margin:0 0 16px}
.cp-feed-stats{display:flex;gap:24px;justify-content:center}
.cp-stat{display:flex;flex-direction:column;align-items:center;gap:1px;color:rgba(255,255,255,.2);font-size:10px}
.cp-stat-num{font-size:20px;font-weight:700;color:rgba(139,92,246,.5)}

/* ============ 弹窗 ============ */
.cp-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
.cp-modal{background:rgba(14,11,28,.97);border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:20px;width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 16px 64px rgba(0,0,0,.4)}
.cp-modal.small{width:340px}
.cp-modal::-webkit-scrollbar{width:2px}.cp-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-modal h3{margin:0 0 14px;font-size:14px;color:white;text-align:center;font-weight:700}
.cp-field{margin-bottom:8px}.cp-field label{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-bottom:3px;font-weight:600}
.cp-field input{width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:11px;outline:none;transition:border-color .12s;box-sizing:border-box}
.cp-field input:focus{border-color:rgba(139,92,246,.15)}
.cp-field-label{font-size:10px;color:rgba(255,255,255,.15);margin:6px 0 3px}
.cp-check{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.35);margin:8px 0;cursor:pointer}
.cp-member-select{margin:8px 0}
.cp-member-opt{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;color:rgba(255,255,255,.35);cursor:pointer}
.cp-modal-btns{display:flex;gap:6px;margin-top:12px}
.cp-modal-btns button{flex:1;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;font-weight:600;transition:all .12s}
.cp-modal-btns button:hover{background:rgba(255,255,255,.04)}
.cp-modal-btns button.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none}
.cp-modal-btns button.primary:disabled{opacity:.3}
.cp-close-btn{width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;margin-top:10px}
.cp-save-btn{width:100%;padding:9px 16px;border-radius:9px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:11px;font-weight:600;cursor:pointer;margin-top:6px}
.cp-search-result{padding:8px 10px;font-size:11px;color:rgba(139,92,246,.5);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cp-add-btn{padding:3px 10px;border-radius:6px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600}
.cp-search-results{max-height:300px;overflow-y:auto}
.cp-search-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .12s}
.cp-search-item:hover{background:rgba(139,92,246,.04)}

/* 二维码 */
.cp-qr-card{text-align:center;padding:14px;border-radius:14px;background:rgba(139,92,246,.02);border:1px solid rgba(139,92,246,.06);margin-bottom:10px}
.cp-qr-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;text-align:left}
.cp-qr-av{width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,.08);display:flex;align-items:center;justify-content:center;font-size:18px}
.cp-qr-name{font-size:12px;color:white;font-weight:600}.cp-qr-id{font-size:9px;color:rgba(139,92,246,.4)}
.cp-qr-canvas{display:block;margin:0 auto;border-radius:10px}
.cp-qr-tip{font-size:9px;color:rgba(255,255,255,.15);margin-top:6px}
.cp-qr-paste{margin-top:8px}.cp-qr-paste p{font-size:10px;color:rgba(255,255,255,.15);margin:0 0 4px}
.cp-id-row{display:flex;gap:4px}
.cp-id-row input{flex:1;padding:6px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.025);color:white;font-size:10px;outline:none}
.cp-id-row button{padding:4px 12px;border-radius:7px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap}

@media(max-width:768px){
  .cp-sidebar{width:100%;position:absolute;z-index:5}.cp-sidebar.collapsed{display:none}
  .cp-msg{max-width:90%}
}
</style>
