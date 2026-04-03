<template>
  <div class="cp-layout">
    <!-- Toast -->
    <Transition name="toast"><div v-if="toast.show" class="cp-toast">{{ toast.msg }}</div></Transition>

    <!-- 左侧：会话列表 -->
    <aside class="cp-sidebar" :class="{ collapsed: chatOpen }">
      <div class="cp-sb-top">
        <h2 class="cp-logo">💬 伴侣</h2>
        <div class="cp-sb-actions">
          <button @click="showProfileModal=true" class="cp-sb-btn" title="我的档案">👤</button>
          <button @click="showQRModal=true" class="cp-sb-btn" title="我的名片">📱</button>
          <button @click="showCreateModal=true" class="cp-sb-btn" title="创建群聊">➕</button>
        </div>
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
        </div>
        <div v-for="f in friends" :key="f.id" class="cp-conv-item" :class="{active:activeChat?.id===f.spark_id&&activeChat?.type==='private'}" @click="openPrivateChat(f.spark_id)">
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
        <div class="cp-search-row">
          <input v-model="searchQuery" class="cp-search" placeholder="搜索星火ID或昵称..." @keydown.enter="handleSearch">
          <button class="cp-search-btn" @click="handleSearch">搜索</button>
        </div>
        <p v-if="searchResult" class="cp-search-result">
          找到：{{ searchResult.nickname }}（{{ searchResult.spark_id }}）
          <button class="cp-add-btn" @click="handleAddSearchResult">添加</button>
        </p>
        <div class="cp-section-title">好友 ({{ friends.length }})</div>
        <div v-for="f in friends" :key="f.id" class="cp-contact-item">
          <span class="cp-av sm">{{ f.avatar }}</span>
          <div class="cp-contact-info">
            <span class="cp-contact-name">{{ f.remark || f.nickname }}</span>
            <span class="cp-contact-id">{{ f.spark_id }}</span>
          </div>
          <button class="cp-contact-act" @click="openPrivateChat(f.spark_id)">💬</button>
          <button class="cp-contact-act del" @click="handleRemoveFriend(f.spark_id)">✕</button>
        </div>
        <div class="cp-section-title">群聊 ({{ groups.length }})</div>
        <div v-for="g in groups" :key="g.id" class="cp-contact-item">
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
          <textarea v-model="postContent" class="cp-post-input" placeholder="分享你的想法..." rows="3" maxlength="500"></textarea>
          <div class="cp-post-actions">
            <select v-model="postVis" class="cp-post-vis">
              <option value="public">🌐 公开</option><option value="friends">👥 好友可见</option><option value="private">🔒 仅自己</option>
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
            <button @click="handleFavMoment(m)">⭐ 收藏</button>
          </div>
          <!-- 评论 -->
          <div v-if="expandedComments[m.id]" class="cp-comments">
            <div v-for="c in m.comments" :key="c.id" class="cp-comment">
              <span class="cp-comment-name">{{ c.author_name }}：</span>{{ c.content }}
            </div>
            <div class="cp-comment-input">
              <input v-model="commentInputs[m.id]" placeholder="写评论..." @keydown.enter="handleComment(m.id)">
              <button @click="handleComment(m.id)">发送</button>
            </div>
          </div>
        </div>
        <p v-if="moments.length===0" class="cp-empty">还没有动态，发第一条吧 🌟</p>
      </div>
    </aside>

    <!-- 右侧：聊天面板 -->
    <main class="cp-main" v-if="chatOpen">
      <div class="cp-chat-header">
        <button class="cp-back" @click="chatOpen=false">←</button>
        <h3>{{ chatTitle }}</h3>
        <span v-if="activeChat?.type==='group'" class="cp-member-count">{{ activeGroup?.members.length }}人</span>
        <button v-if="activeChat?.type==='group'" class="cp-qr-btn" @click="showGroupQR=true" title="群二维码">📱</button>
      </div>
      <div class="cp-messages" ref="chatScrollRef">
        <div v-for="msg in chatMessages" :key="msg.id" class="cp-msg" :class="{mine:msg.sender_id===myProfile?.spark_id, ai:msg.sender_type==='ai', sys:msg.type==='system'}">
          <span v-if="msg.type!=='system'&&msg.sender_id!==myProfile?.spark_id" class="cp-msg-av">{{ msg.sender_avatar }}</span>
          <div class="cp-msg-body">
            <span v-if="msg.type!=='system'&&msg.sender_id!==myProfile?.spark_id" class="cp-msg-name">{{ msg.sender_name }}</span>
            <div class="cp-msg-bubble" :class="{system:msg.type==='system'}">
              <span v-if="msg.type==='share'" class="cp-share-card" @click="handleShareClick(msg)">📎 {{ msg.share_data?.title || '分享内容' }}</span>
              <span v-else>{{ msg.content }}</span>
            </div>
          </div>
        </div>
        <div v-if="isAiTyping" class="cp-msg ai"><span class="cp-msg-av">🌟</span><div class="cp-msg-body"><span class="cp-msg-name">星火AI</span><div class="cp-msg-bubble"><span class="cp-typing-dots"><span></span><span></span><span></span></span></div></div></div>
      </div>
      <div class="cp-input-area">
        <textarea v-model="chatInput" :placeholder="activeChat?.type==='group'?'发消息... (@星火 唤AI)':'发消息...'" rows="1" @keydown.enter.exact.prevent="handleChatSend" @input="autoResizeChat"></textarea>
        <button class="cp-send" :disabled="!chatInput.trim()||isAiTyping" @click="handleChatSend">{{ isAiTyping ? '⏳' : '⬆️' }}</button>
      </div>
    </main>
    <main v-else class="cp-main cp-main-empty">
      <div class="cp-empty-state">
        <div class="cp-empty-icon">💬</div>
        <h2>星火伴侣</h2>
        <p>选择一个对话开始聊天，或创建新的群聊</p>
        <div class="cp-empty-stats" v-if="myProfile">
          <div class="cp-stat"><span class="cp-stat-num">{{ friends.length }}</span>好友</div>
          <div class="cp-stat"><span class="cp-stat-num">{{ groups.length }}</span>群聊</div>
          <div class="cp-stat"><span class="cp-stat-num">{{ moments.length }}</span>动态</div>
        </div>
      </div>
    </main>

    <!-- === 档案弹窗 === -->
    <Transition name="fade">
      <div v-if="showProfileModal" class="cp-overlay" @click.self="showProfileModal=false">
        <div class="cp-modal wide">
          <h3>🌟 我的星火档案</h3>
          <div class="cp-profile" v-if="myProfile">
            <div class="cp-pf-top">
              <div class="cp-pf-avatar-wrap">
                <span class="cp-pf-avatar">{{ myProfile.avatar }}</span>
                <input v-model="editAvatar" class="cp-pf-avatar-input" maxlength="2" placeholder="emoji">
              </div>
              <div class="cp-pf-info">
                <div class="cp-pf-name">{{ myProfile.nickname }}</div>
                <div class="cp-pf-id">ID: {{ myProfile.spark_id }}</div>
                <div class="cp-pf-bio">{{ myProfile.bio }}</div>
              </div>
            </div>
            <div class="cp-pf-stats">
              <div class="cp-stat"><span class="cp-stat-num">{{ friends.length }}</span>好友</div>
              <div class="cp-stat"><span class="cp-stat-num">{{ groups.length }}</span>群聊</div>
              <div class="cp-stat"><span class="cp-stat-num">moments.filter(m=>m.author_id===myProfile.spark_id).length</span>动态</div>
              <div class="cp-stat"><span class="cp-stat-num">{{ favorites.length }}</span>收藏</div>
            </div>
            <div class="cp-pf-form">
              <div class="cp-field"><label>昵称</label><input v-model="editNick" maxlength="20"></div>
              <div class="cp-field"><label>个性签名</label><input v-model="editBio" maxlength="100"></div>
              <div class="cp-field-row">
                <div class="cp-field"><label>性别</label><select v-model="editGender"><option value="男">男</option><option value="女">女</option><option value="未知">保密</option></select></div>
                <div class="cp-field"><label>学校</label><input v-model="editUni"></div>
                <div class="cp-field"><label>年级</label><select v-model="editYear"><option v-for="y in ['大一','大二','大三','大四','研一','研二','研三']" :key="y" :value="y">{{ y }}</option></select></div>
              </div>
              <div class="cp-field"><label>兴趣标签</label><input v-model="editInterests" placeholder="用逗号分隔"></div>
              <div v-if="!myProfile.id_changed" class="cp-field">
                <label>修改星火ID <span class="cp-hint">(仅限一次)</span></label>
                <div class="cp-id-row"><input v-model="newSparkId" placeholder="4-16位字母数字" maxlength="16"><button @click="handleChangeId">确认</button></div>
              </div>
              <button class="cp-save-btn" @click="handleSaveProfile">💾 保存资料</button>
            </div>
            <!-- 收藏列表 -->
            <div v-if="favorites.length" class="cp-fav-section">
              <h4>⭐ 我的收藏 ({{ favorites.length }})</h4>
              <div v-for="fav in favorites" :key="fav.id" class="cp-fav-item">
                <span>{{ fav.title }}</span><span class="cp-fav-src">{{ fav.source }}</span>
                <button @click="removeFavorite(fav.id)">✕</button>
              </div>
            </div>
          </div>
          <button class="cp-close-btn" @click="showProfileModal=false">关闭</button>
        </div>
      </div>
    </Transition>

    <!-- === 二维码弹窗 === -->
    <Transition name="fade">
      <div v-if="showQRModal" class="cp-overlay" @click.self="showQRModal=false">
        <div class="cp-modal small">
          <h3>📱 我的星火名片</h3>
          <div class="cp-qr-card">
            <div class="cp-qr-top"><span class="cp-qr-av">{{ myProfile?.avatar }}</span><div><div class="cp-qr-name">{{ myProfile?.nickname }}</div><div class="cp-qr-id">{{ myProfile?.spark_id }}</div></div></div>
            <canvas ref="userQrCanvas" class="cp-qr-canvas"></canvas>
            <p class="cp-qr-tip">扫一扫添加我为星火好友</p>
          </div>
          <div class="cp-qr-paste">
            <p>📋 粘贴好友/群聊二维码数据</p>
            <div class="cp-id-row"><input v-model="qrPasteInput" placeholder="粘贴二维码数据..."><button @click="handleQRPaste">添加</button></div>
          </div>
          <div class="cp-modal-btns">
            <button @click="showQRModal=false">关闭</button>
            <button class="primary" @click="copyQRData">📋 复制名片数据</button>
          </div>
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
            <p class="cp-qr-tip">扫一扫加入群聊</p>
          </div>
          <div class="cp-modal-btns">
            <button @click="showGroupQR=false">关闭</button>
            <button class="primary" @click="copyGroupQR">📋 复制群二维码数据</button>
          </div>
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
            <label v-for="f in friends" :key="f.id" class="cp-member-opt">
              <input type="checkbox" :value="f.spark_id" v-model="newGroupMembers"> {{ f.avatar }} {{ f.nickname }}
            </label>
          </div>
          <div class="cp-modal-btns">
            <button @click="showCreateModal=false">取消</button>
            <button class="primary" :disabled="!newGroupName.trim()" @click="handleCreateGroup">🚀 创建</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanion, formatTimeAgo } from '../../composables/useCompanion'
import QRCode from 'qrcode'

const router = useRouter()
const {
  myProfile, friends, groups, moments, favorites, isAiTyping,
  updateProfile, changeSparkId, getQRData, searchUser, addFriend, addFriendByQR,
  removeFriend, getPrivateChat, sendPrivateMsg, createGroup, sendGroupMsg,
  postMoment, toggleLike, commentMoment, deleteMoment, addFavorite, removeFavorite,
  sendToAI, aiChatHistory,
} = useCompanion()

// 状态
const sideTab = ref<'chat'|'contacts'|'moments'>('chat')
const chatOpen = ref(false)
const activeChat = ref<{id:string;type:'private'|'group'|'ai'}|null>(null)
const chatInput = ref('')
const chatScrollRef = ref<HTMLElement|null>(null)
const searchQuery = ref('')
const searchResult = ref<ReturnType<typeof searchUser>>(null)
const toast = reactive({ show: false, msg: '' })

// 弹窗
const showProfileModal = ref(false)
const showQRModal = ref(false)
const showGroupQR = ref(false)
const showCreateModal = ref(false)

// 编辑字段
const editNick = ref(''); const editBio = ref(''); const editGender = ref(''); const editUni = ref('')
const editYear = ref(''); const editInterests = ref(''); const editAvatar = ref(''); const newSparkId = ref('')

// 群聊创建
const newGroupName = ref(''); const newGroupAI = ref(true); const newGroupMembers = ref<string[]>([])

// 动态发布
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

// 操作
function showToast(msg:string) { toast.msg=msg; toast.show=true; setTimeout(()=>{toast.show=false},2000) }
function openAIChat() { activeChat.value={id:'ai',type:'ai'}; chatOpen.value=true; scrollChat() }
function openGroupChat(id:string) { activeChat.value={id,type:'group'}; chatOpen.value=true; scrollChat() }
function openPrivateChat(sparkId:string) { activeChat.value={id:sparkId,type:'private'}; chatOpen.value=true; scrollChat() }
function scrollChat() { nextTick(()=>{if(chatScrollRef.value) chatScrollRef.value.scrollTop=chatScrollRef.value.scrollHeight}) }

async function handleChatSend() {
  const text=chatInput.value.trim(); if(!text||isAiTyping.value) return; chatInput.value=''
  if(activeChat.value?.type==='ai') { await sendToAI(text); scrollChat() }
  else if(activeChat.value?.type==='group') { sendGroupMsg(activeChat.value.id, text); scrollChat() }
  else if(activeChat.value?.type==='private') { sendPrivateMsg(activeChat.value.id, text); scrollChat() }
}

function handleSearch() { searchResult.value = searchQuery.value.trim() ? searchUser(searchQuery.value.trim()) : null }
function handleAddSearchResult() {
  if(!searchResult.value) return
  const r=addFriend({spark_id:searchResult.value.spark_id,nickname:searchResult.value.nickname,avatar:searchResult.value.avatar,bio:searchResult.value.bio})
  showToast(r.msg); searchResult.value=null; searchQuery.value=''
}
function handleRemoveFriend(id:string) { removeFriend(id); showToast('已删除好友') }
function handleCreateGroup() {
  if(!newGroupName.value.trim()) return
  createGroup(newGroupName.value.trim(), newGroupMembers.value, newGroupAI.value)
  showToast('群聊已创建！'); showCreateModal.value=false; newGroupName.value=''; newGroupMembers.value=[]
}
function handlePost() {
  if(!postContent.value.trim()) return
  postMoment(postContent.value.trim(),[],postVis.value)
  postContent.value=''; showToast('动态已发布')
}
function handleLike(id:string) { toggleLike(id) }
function handleDeleteMoment(id:string) { deleteMoment(id); showToast('已删除') }
function toggleCommentInput(id:string) { expandedComments[id]=!expandedComments[id] }
function handleComment(id:string) {
  const c=commentInputs[id]?.trim(); if(!c) return
  commentMoment(id,c); commentInputs[id]=''
}
function handleFavMoment(m:any) { addFavorite({type:'moment',title:m.content.slice(0,30),content:m.content,source:m.author_name}); showToast('已收藏') }

function handleShareClick(msg:any) { if(msg.share_data?.route) router.push(msg.share_data.route) }
function autoResizeChat(e:Event) { const el=e.target as HTMLTextAreaElement; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px' }

// 档案
function handleSaveProfile() {
  updateProfile({
    nickname: editNick.value||myProfile.value?.nickname, bio: editBio.value||myProfile.value?.bio,
    gender: editGender.value||myProfile.value?.gender, university: editUni.value||myProfile.value?.university,
    school_year: editYear.value||myProfile.value?.school_year, avatar: editAvatar.value||myProfile.value?.avatar,
    interests: editInterests.value ? editInterests.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean) : myProfile.value?.interests,
  })
  showToast('资料已保存'); showProfileModal.value=false
}
function handleChangeId() {
  const r=changeSparkId(newSparkId.value.trim()); showToast(r.msg); if(r.ok) newSparkId.value=''
}

// 二维码渲染
async function renderQR(canvas:HTMLCanvasElement|null, data:string) {
  if(!canvas) return
  try { await QRCode.toCanvas(canvas, data, { width:180, margin:2, color:{dark:'#8b5cf6',light:'#0f0b1e'} }) }
  catch { /* 渲染失败静默 */ }
}
function copyQRData() { navigator.clipboard.writeText(getQRData()); showToast('名片数据已复制') }
function copyGroupQR() { if(activeGroup.value) { navigator.clipboard.writeText(getQRData(undefined,'group',activeGroup.value.id)); showToast('群二维码已复制') } }
function handleQRPaste() { const r=addFriendByQR(qrPasteInput.value.trim()); showToast(r.msg); if(r.ok) qrPasteInput.value='' }

// 监听
watch(showQRModal, v=>{ if(v) nextTick(()=>renderQR(userQrCanvas.value, getQRData())) })
watch(showGroupQR, v=>{ if(v&&activeGroup.value) nextTick(()=>renderQR(groupQrCanvas.value, getQRData(undefined,'group',activeGroup.value!.id))) })
watch(()=>chatMessages.value.length, ()=>scrollChat())
watch(isAiTyping, ()=>scrollChat())

onMounted(()=>{
  if(myProfile.value) { editNick.value=myProfile.value.nickname; editBio.value=myProfile.value.bio; editGender.value=myProfile.value.gender; editUni.value=myProfile.value.university; editYear.value=myProfile.value.school_year; editAvatar.value=myProfile.value.avatar; editInterests.value=myProfile.value.interests.join(', ') }
})
</script>

<style scoped>
.cp-layout{display:flex;height:calc(100vh - 72px);background:#0a0814;overflow:hidden}
.cp-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:8px 20px;border-radius:10px;background:rgba(139,92,246,.15);backdrop-filter:blur(12px);border:1px solid rgba(139,92,246,.15);color:rgba(139,92,246,.9);font-size:12px;font-weight:600;z-index:200;white-space:nowrap}
.toast-enter-active{transition:all .3s}.toast-leave-active{transition:all .2s}.toast-enter-from{opacity:0;transform:translateX(-50%) translateY(-10px)}.toast-leave-to{opacity:0}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}

/* 左侧栏 */
.cp-sidebar{width:300px;border-right:1px solid rgba(255,255,255,.04);display:flex;flex-direction:column;flex-shrink:0;background:rgba(8,6,18,.98)}
.cp-sb-top{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.03)}
.cp-logo{font-size:14px;margin:0;color:white;font-weight:700}
.cp-sb-actions{display:flex;gap:2px}
.cp-sb-btn{width:28px;height:28px;border-radius:7px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.cp-sb-btn:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}
.cp-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.03)}
.cp-tabs button{flex:1;padding:8px 0;border:none;background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;font-weight:500;transition:all .15s;border-bottom:2px solid transparent}
.cp-tabs button.active{color:rgba(139,92,246,.7);border-bottom-color:rgba(139,92,246,.3)}
.cp-conv-list{flex:1;overflow-y:auto;padding:4px}
.cp-conv-list::-webkit-scrollbar{width:2px}.cp-conv-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-conv-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s}
.cp-conv-item:hover{background:rgba(255,255,255,.02)}.cp-conv-item.active{background:rgba(139,92,246,.06)}
.cp-av{width:34px;height:34px;border-radius:9px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.cp-av.sm{width:28px;height:28px;font-size:13px;border-radius:7px}
.cp-conv-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.cp-conv-name{font-size:12px;color:rgba(255,255,255,.6);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-conv-count{font-size:10px;color:rgba(255,255,255,.15);margin-left:3px}
.cp-conv-last{font-size:10px;color:rgba(255,255,255,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-badge{min-width:16px;height:16px;border-radius:8px;background:rgba(239,68,68,.6);color:white;font-size:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:700}

/* 通讯录 */
.cp-search-row{display:flex;gap:4px;padding:6px 6px 4px}
.cp-search{flex:1;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:white;font-size:11px;outline:none}
.cp-search-btn{padding:4px 10px;border-radius:7px;border:none;background:rgba(139,92,246,.08);color:rgba(139,92,246,.6);font-size:10px;cursor:pointer;font-weight:600}
.cp-search-result{padding:6px 10px;font-size:11px;color:rgba(139,92,246,.5);display:flex;align-items:center;gap:6px}
.cp-add-btn{padding:2px 8px;border-radius:5px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600}
.cp-section-title{font-size:9px;color:rgba(255,255,255,.1);padding:8px 10px 2px;font-weight:700;letter-spacing:1px}
.cp-contact-item{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px}
.cp-contact-info{flex:1;min-width:0;display:flex;flex-direction:column}
.cp-contact-name{font-size:11px;color:rgba(255,255,255,.5)}.cp-contact-id{font-size:9px;color:rgba(255,255,255,.1)}
.cp-contact-act{width:24px;height:24px;border-radius:5px;border:none;background:rgba(255,255,255,.02);color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cp-contact-act.del:hover{color:rgba(239,68,68,.5)}

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

/* 右侧聊天面板 */
.cp-main{flex:1;display:flex;flex-direction:column;min-width:0}
.cp-main-empty{align-items:center;justify-content:center}
.cp-empty-state{text-align:center}
.cp-empty-icon{font-size:36px;margin-bottom:8px}.cp-empty-state h2{color:white;font-size:16px;margin:0 0 4px;font-weight:700}.cp-empty-state p{color:rgba(255,255,255,.15);font-size:11px;margin:0 0 16px}
.cp-empty-stats{display:flex;gap:20px;justify-content:center}
.cp-stat{display:flex;flex-direction:column;align-items:center;gap:1px;color:rgba(255,255,255,.2);font-size:10px}
.cp-stat-num{font-size:18px;font-weight:700;color:rgba(139,92,246,.5)}
.cp-chat-header{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.03);flex-shrink:0}
.cp-chat-header h3{margin:0;font-size:13px;color:white;font-weight:600;flex:1}
.cp-back{background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;padding:4px}
.cp-member-count{font-size:10px;color:rgba(255,255,255,.15)}
.cp-qr-btn{background:none;border:none;font-size:14px;cursor:pointer}
.cp-messages{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.cp-messages::-webkit-scrollbar{width:2px}.cp-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-msg{display:flex;gap:6px;max-width:85%}
.cp-msg.mine{margin-left:auto;flex-direction:row-reverse}
.cp-msg.sys{margin:0 auto;max-width:100%}
.cp-msg-av{width:26px;height:26px;border-radius:7px;background:rgba(139,92,246,.06);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.cp-msg-body{display:flex;flex-direction:column;gap:1px;min-width:0}
.cp-msg-name{font-size:9px;color:rgba(255,255,255,.15);padding:0 4px}
.cp-msg-bubble{padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.7);word-break:break-word;white-space:pre-wrap}
.cp-msg.mine .cp-msg-bubble{background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.06)}
.cp-msg:not(.mine):not(.sys) .cp-msg-bubble{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.03)}
.cp-msg-bubble.system{background:none;border:none;text-align:center;color:rgba(255,255,255,.1);font-size:10px;padding:2px}
.cp-msg.ai .cp-msg-bubble{background:rgba(139,92,246,.03);border:1px solid rgba(139,92,246,.04)}
.cp-share-card{display:inline-flex;align-items:center;padding:4px 8px;border-radius:6px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.06);color:rgba(139,92,246,.6);font-size:11px;cursor:pointer}
.cp-typing-dots{display:flex;gap:3px;padding:4px 0}.cp-typing-dots span{width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,.3);animation:dot 1.4s infinite}.cp-typing-dots span:nth-child(2){animation-delay:.2s}.cp-typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}
.cp-input-area{padding:8px 14px;border-top:1px solid rgba(255,255,255,.03);display:flex;gap:6px;align-items:flex-end;flex-shrink:0}
.cp-input-area textarea{flex:1;padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:white;font-size:12px;resize:none;outline:none;font-family:inherit;line-height:1.5;min-height:20px}
.cp-input-area textarea::placeholder{color:rgba(255,255,255,.12)}
.cp-send{width:32px;height:32px;border-radius:9px;border:none;background:rgba(139,92,246,.12);color:rgba(139,92,246,.6);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cp-send:disabled{opacity:.2;cursor:default}

/* 弹窗 */
.cp-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}
.cp-modal{background:rgba(14,11,28,.98);border:1px solid rgba(255,255,255,.04);border-radius:16px;padding:20px;width:380px;max-height:80vh;overflow-y:auto}
.cp-modal.wide{width:460px}.cp-modal.small{width:340px}
.cp-modal::-webkit-scrollbar{width:2px}.cp-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.cp-modal h3{margin:0 0 14px;font-size:14px;color:white;text-align:center;font-weight:700}
.cp-field{margin-bottom:8px}.cp-field label{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-bottom:2px;font-weight:600}
.cp-field input,.cp-field select{width:100%;padding:6px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:white;font-size:11px;outline:none}
.cp-field-row{display:flex;gap:6px}.cp-field-row .cp-field{flex:1}
.cp-field-label{font-size:10px;color:rgba(255,255,255,.15);margin:6px 0 3px}
.cp-hint{font-size:9px;color:rgba(139,92,246,.3);margin-left:4px}
.cp-id-row{display:flex;gap:4px}.cp-id-row input{flex:1}.cp-id-row button{padding:4px 10px;border-radius:6px;border:none;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap}
.cp-check{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.35);margin:8px 0;cursor:pointer}
.cp-member-select{margin:8px 0}
.cp-member-opt{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;color:rgba(255,255,255,.35);cursor:pointer}
.cp-modal-btns{display:flex;gap:6px;margin-top:12px}
.cp-modal-btns button{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;font-weight:600}
.cp-modal-btns button.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none}
.cp-modal-btns button.primary:disabled{opacity:.3}
.cp-close-btn{width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;margin-top:10px}
.cp-save-btn{width:100%;padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;font-size:11px;font-weight:600;cursor:pointer;margin-top:6px}

/* 档案 */
.cp-profile{}.cp-pf-top{display:flex;gap:12px;margin-bottom:12px}
.cp-pf-avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:3px}
.cp-pf-avatar{width:52px;height:52px;border-radius:14px;background:rgba(139,92,246,.08);display:flex;align-items:center;justify-content:center;font-size:26px}
.cp-pf-avatar-input{width:52px;padding:2px;border-radius:5px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:white;font-size:11px;text-align:center;outline:none}
.cp-pf-info{flex:1}.cp-pf-name{font-size:15px;font-weight:700;color:white}.cp-pf-id{font-size:10px;color:rgba(139,92,246,.4);margin-top:1px}
.cp-pf-bio{font-size:11px;color:rgba(255,255,255,.25);margin-top:3px}
.cp-pf-stats{display:flex;gap:16px;justify-content:center;padding:10px;border-radius:10px;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.02);margin-bottom:12px}
.cp-pf-form{border-top:1px solid rgba(255,255,255,.03);padding-top:10px}

/* 二维码 */
.cp-qr-card{text-align:center;padding:14px;border-radius:12px;background:rgba(139,92,246,.02);border:1px solid rgba(139,92,246,.06);margin-bottom:10px}
.cp-qr-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;text-align:left}
.cp-qr-av{width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,.08);display:flex;align-items:center;justify-content:center;font-size:18px}
.cp-qr-name{font-size:12px;color:white;font-weight:600}.cp-qr-id{font-size:9px;color:rgba(139,92,246,.4)}
.cp-qr-canvas{display:block;margin:0 auto;border-radius:8px}
.cp-qr-tip{font-size:9px;color:rgba(255,255,255,.15);margin-top:6px}
.cp-qr-paste{margin-top:8px}.cp-qr-paste p{font-size:10px;color:rgba(255,255,255,.15);margin:0 0 4px}

/* 收藏 */
.cp-fav-section{border-top:1px solid rgba(255,255,255,.03);padding-top:10px;margin-top:10px}
.cp-fav-section h4{font-size:11px;color:rgba(255,255,255,.3);margin:0 0 6px}
.cp-fav-item{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;font-size:10px;color:rgba(255,255,255,.3)}
.cp-fav-src{color:rgba(255,255,255,.1);margin-left:auto;font-size:9px}
.cp-fav-item button{background:none;border:none;color:rgba(255,255,255,.1);cursor:pointer;font-size:10px}

@media(max-width:768px){.cp-sidebar{width:100%;position:absolute;z-index:5}.cp-sidebar.collapsed{display:none}}
</style>
