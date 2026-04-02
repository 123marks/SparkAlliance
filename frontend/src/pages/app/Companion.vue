<template>
  <div class="companion-page">
    <!-- 顶栏 -->
    <div class="cp-topbar">
      <div class="cp-greeting">
        <h1 class="cp-title">💬 星火伴侣</h1>
        <p class="cp-subtitle" v-if="myProfile">
          星火ID: <span class="cp-spark-id">{{ myProfile.spark_id }}</span>
        </p>
      </div>
      <button class="cp-profile-btn" @click="showProfileModal = true" title="我的档案">
        <span class="cp-avatar-mini">{{ (myProfile?.nickname || '你')[0] }}</span>
      </button>
    </div>

    <!-- Tab（4个） -->
    <div class="cp-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="cp-tab" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- ===== 好友 Tab ===== -->
    <div v-if="activeTab === 'friends'" class="cp-content">
      <FriendList
        :friend-list="friends"
        :requests="friendRequests"
        @accept="handleAcceptReq"
        @reject="handleRejectReq"
        @remove="handleRemoveFriend"
        @chat="handleFriendChat"
        @showQR="showQRModal = true"
      />

      <!-- 群聊列表 -->
      <div class="cp-groups" v-if="groups.length">
        <h3 class="cp-section-title">💬 群聊 ({{ groups.length }})</h3>
        <div v-for="g in groups" :key="g.id" class="cp-group-card" @click="openGroupChat(g)">
          <span class="cp-group-icon">{{ g.ai_enabled ? '🤖' : '👥' }}</span>
          <div class="cp-group-info">
            <span class="cp-group-name">{{ g.name }}</span>
            <span class="cp-group-meta">{{ g.member_count }}人 {{ g.ai_enabled ? '· AI参与' : '' }}</span>
          </div>
        </div>
      </div>
      <button class="cp-create-group-btn" @click="showCreateGroupModal = true">➕ 创建群聊</button>
    </div>

    <!-- ===== 动态 Tab（好友朋友圈） ===== -->
    <div v-else-if="activeTab === 'moments'" class="cp-content">
      <!-- 发布入口（分开：📸图片 📹视频） -->
      <div class="cp-post-entry">
        <span class="cp-post-avatar">{{ (myProfile?.nickname || '你')[0] }}</span>
        <span class="cp-post-hint" @click="openPostModal('text')">分享你的想法...</span>
        <button class="cp-post-icon-btn" @click="openPostModal('image')" title="发图片动态">📸</button>
        <button class="cp-post-icon-btn" @click="openPostModal('video')" title="发视频动态">📹</button>
      </div>

      <MomentCard
        v-for="m in moments" :key="m.id" :moment="m"
        @like="handleLike" @share="handleShareToWall" @commented="refreshMoments"
      />
      <p v-if="!loading && moments.length === 0" class="cp-empty">还没有动态，发一条吧 ✨</p>
    </div>

    <!-- ===== 广场 Tab ===== -->
    <div v-else-if="activeTab === 'plaza'" class="cp-content">
      <div class="cp-plaza-header">
        <h3 class="cp-section-title">🌍 好友广场</h3>
        <p class="cp-plaza-desc">发现有趣的人和事</p>
      </div>
      <MomentCard
        v-for="m in plazaMoments" :key="m.id" :moment="m"
        @like="handleLike" @share="handleShareToWall" @commented="refreshPlaza"
      />
      <p v-if="!loading && plazaMoments.length === 0" class="cp-empty">广场还没有动态，你来当第一个？ 🌟</p>
    </div>

    <!-- ===== 发布动态弹窗 V2 ===== -->
    <Transition name="fade">
      <div v-if="showPostModal" class="cp-modal-overlay" @click.self="showPostModal = false">
        <div class="cp-modal">
          <h3>{{ postMode === 'video' ? '📹 发视频动态' : postMode === 'image' ? '📸 发图片动态' : '✏️ 发文字动态' }}</h3>
          <textarea v-model="postContent" class="cp-post-textarea" rows="4" placeholder="分享你的想法、心情或日常..." maxlength="1000"></textarea>

          <!-- 图片上传 -->
          <label v-if="postMode !== 'video'" class="cp-upload">
            <input type="file" accept="image/*" multiple @change="handleImgSelect" style="display:none" />
            📸 {{ postImgFiles.length ? `已选${postImgFiles.length}张图片` : '添加图片（最多9张）' }}
          </label>

          <!-- 视频上传 -->
          <label v-if="postMode !== 'image'" class="cp-upload video">
            <input type="file" accept="video/*" @change="handleVidSelect" style="display:none" />
            📹 {{ postVidFiles.length ? `已选${postVidFiles.length}个视频` : '添加视频（最多3个）' }}
          </label>

          <!-- 可见范围 -->
          <div class="cp-vis-row">
            <span class="cp-vis-label">可见范围</span>
            <div class="cp-vis-btns">
              <button v-for="v in visOptions" :key="v.value" class="cp-vis-btn" :class="{ active: postVis === v.value }" @click="postVis = v.value">
                {{ v.icon }} {{ v.label }}
              </button>
            </div>
          </div>

          <!-- 广场推送(仅公开时) -->
          <label v-if="postVis === 'public'" class="cp-plaza-toggle">
            <input type="checkbox" v-model="postShowInPlaza" /> 推送到好友广场
          </label>

          <!-- 有效期 -->
          <div class="cp-expiry-row">
            <span class="cp-vis-label">有效期</span>
            <div class="cp-vis-btns">
              <button v-for="e in MOMENT_EXPIRY_OPTIONS" :key="String(e.value)" class="cp-vis-btn" :class="{ active: postExpiry === e.value }" @click="postExpiry = e.value">
                {{ e.icon }} {{ e.label }}
              </button>
            </div>
          </div>

          <div class="cp-modal-actions">
            <button class="cp-modal-cancel" @click="showPostModal = false">取消</button>
            <button class="cp-modal-confirm" :disabled="!postContent.trim() || posting" @click="handlePost">
              {{ posting ? '发布中...' : '🚀 发布' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 我的星火档案弹窗（完整个人主页） ===== -->
    <Transition name="fade">
      <div v-if="showProfileModal" class="cp-modal-overlay" @click.self="showProfileModal = false">
        <div class="cp-modal profile-modal">
          <h3>🌟 我的星火档案</h3>
          <div class="cp-profile-full" v-if="myProfile">
            <!-- 头像+基本信息 -->
            <div class="pf-header">
              <label class="pf-avatar-wrap">
                <input type="file" accept="image/*" @change="handleAvatarUpload" style="display:none" />
                <img v-if="myProfile.avatar_url" :src="myProfile.avatar_url" class="pf-avatar-img" />
                <span v-else class="pf-avatar-text">{{ myProfile.nickname[0] }}</span>
                <span class="pf-avatar-edit">📷</span>
              </label>
              <div class="pf-meta">
                <span class="pf-name">{{ myProfile.nickname }}</span>
                <span class="pf-sparkid">星火ID: {{ myProfile.spark_id }}</span>
                <span class="pf-bio">{{ myProfile.bio || '这个人很懒，什么都没写~' }}</span>
              </div>
            </div>

            <!-- 数据统计 -->
            <div class="pf-stats">
              <div class="pf-stat"><span class="pf-stat-num">{{ friends.length }}</span><span class="pf-stat-label">好友</span></div>
              <div class="pf-stat"><span class="pf-stat-num">{{ myMomentsCount }}</span><span class="pf-stat-label">动态</span></div>
              <div class="pf-stat"><span class="pf-stat-num">{{ groups.length }}</span><span class="pf-stat-label">群聊</span></div>
            </div>

            <!-- 编辑资料区 -->
            <div class="pf-edit-section">
              <h4>✏️ 编辑资料</h4>
              <div class="pf-field">
                <label>昵称</label>
                <input v-model="editNickname" class="pf-input" maxlength="20" />
              </div>
              <div class="pf-field">
                <label>个性签名</label>
                <textarea v-model="editBio" class="pf-input" rows="2" maxlength="100" placeholder="一句话介绍自己..."></textarea>
              </div>
              <div class="pf-field-row">
                <div class="pf-field half">
                  <label>性别</label>
                  <select v-model="editGender" class="pf-input">
                    <option value="unknown">不公开</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>
                <div class="pf-field half">
                  <label>年级</label>
                  <select v-model="editYear" class="pf-input">
                    <option value="">未填写</option>
                    <option v-for="y in ['大一','大二','大三','大四','研一','研二','研三']" :key="y" :value="y">{{ y }}</option>
                  </select>
                </div>
              </div>
              <div class="pf-field">
                <label>学校</label>
                <input v-model="editUniversity" class="pf-input" placeholder="你的学校" />
              </div>
              <div class="pf-field">
                <label>兴趣标签</label>
                <div class="pf-tags">
                  <span v-for="(tag, i) in editInterests" :key="i" class="pf-tag">
                    {{ tag }} <button @click="editInterests.splice(i, 1)">✕</button>
                  </span>
                  <input v-model="newTag" class="pf-tag-input" placeholder="+添加" maxlength="10" @keydown.enter="addTag" />
                </div>
              </div>
              <button class="pf-save-btn" @click="handleSaveProfile" :disabled="savingProfile">
                {{ savingProfile ? '保存中...' : '💾 保存资料' }}
              </button>
            </div>

            <!-- 星火ID修改 -->
            <div v-if="!myProfile.id_changed" class="pf-edit-section">
              <h4>🆔 修改星火ID <span class="pf-hint">(仅限一次)</span></h4>
              <div class="cp-sparkid-change">
                <input v-model="newSparkId" class="cp-sparkid-input" placeholder="4-12位字母数字" maxlength="12" />
                <button class="cp-sparkid-btn" @click="handleChangeId" :disabled="!newSparkId.trim()">确认修改</button>
              </div>
            </div>

            <!-- 广场设置 -->
            <div class="pf-edit-section">
              <h4>⚙️ 隐私设置</h4>
              <label class="cp-plaza-toggle">
                <input type="checkbox" :checked="myProfile.show_in_plaza" @change="togglePlazaVisibility" /> 出现在好友广场
              </label>
            </div>

            <!-- 我的动态 -->
            <div class="pf-edit-section">
              <h4>📸 我的动态 ({{ myMomentsList.length }})</h4>
              <div v-if="myMomentsList.length === 0" class="cp-empty">还没有发布动态</div>
              <div v-for="m in myMomentsList" :key="m.id" class="pf-moment-mini">
                <span class="pf-moment-time">{{ formatTimeAgo(m.created_at) }}</span>
                <span class="pf-moment-content">{{ m.content.slice(0, 50) }}{{ m.content.length > 50 ? '...' : '' }}</span>
                <span class="pf-moment-stats">❤️{{ m.like_count }} 💬{{ m.comment_count }}</span>
              </div>
            </div>
          </div>

          <button class="cp-modal-cancel full" @click="showProfileModal = false">关闭</button>
        </div>
      </div>
    </Transition>

    <!-- ===== 真实二维码弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showQRModal" class="cp-modal-overlay" @click.self="showQRModal = false">
        <div class="cp-modal small">
          <h3>📱 我的星火名片</h3>
          <div class="cp-qr-display">
            <div class="cp-qr-card">
              <div class="cp-qr-card-header">
                <img v-if="myProfile?.avatar_url" :src="myProfile.avatar_url" class="cp-qr-card-avatar" />
                <span v-else class="cp-qr-card-avatar-text">{{ (myProfile?.nickname || '?')[0] }}</span>
                <div class="cp-qr-card-info">
                  <span class="cp-qr-card-name">{{ myProfile?.nickname }}</span>
                  <span class="cp-qr-card-id">{{ myProfile?.spark_id }}</span>
                </div>
              </div>
              <!-- 真实二维码 -->
              <canvas ref="qrCanvasRef" class="cp-qr-canvas"></canvas>
              <span class="cp-qr-tip">扫一扫上方二维码，加我为星火好友</span>
            </div>
          </div>

          <!-- 手动添加（扫码后粘贴内容） -->
          <div class="cp-qr-manual">
            <p class="cp-vis-label">📋 粘贴好友二维码内容</p>
            <div class="cp-qr-paste-row">
              <input v-model="qrPasteInput" class="pf-input" placeholder="粘贴好友的二维码数据..." />
              <button class="cp-sparkid-btn" @click="handleAddByQRPaste" :disabled="!qrPasteInput.trim()">添加</button>
            </div>
          </div>

          <div class="cp-modal-actions">
            <button class="cp-modal-cancel" @click="showQRModal = false">关闭</button>
            <button class="cp-modal-confirm" @click="copyQRData">📋 复制我的名片数据</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 创建群聊弹窗 ===== -->
    <Transition name="fade">
      <div v-if="showCreateGroupModal" class="cp-modal-overlay" @click.self="showCreateGroupModal = false">
        <div class="cp-modal">
          <h3>👥 创建群聊</h3>
          <input v-model="newGroupName" class="cp-post-textarea single" placeholder="群聊名称" maxlength="30" />
          <label class="cp-plaza-toggle">
            <input type="checkbox" v-model="newGroupAI" /> 🤖 AI「星火」参与群聊（@星火 触发）
          </label>
          <div class="cp-group-members-select">
            <p class="cp-vis-label">选择好友加入群聊</p>
            <label v-for="f in friends" :key="f.id" class="cp-member-option">
              <input type="checkbox" :value="f.friend_id" v-model="newGroupMembers" />
              {{ f.nickname || (f.profile as SparkProfile)?.nickname || '好友' }}
            </label>
          </div>
          <div class="cp-modal-actions">
            <button class="cp-modal-cancel" @click="showCreateGroupModal = false">取消</button>
            <button class="cp-modal-confirm" :disabled="!newGroupName.trim()" @click="handleCreateGroup">🚀 创建</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 群聊面板 ===== -->
    <Transition name="fade">
      <div v-if="showGroupPanel" class="cp-modal-overlay" @click.self="showGroupPanel = false">
        <div class="cp-modal tall">
          <div class="cp-group-header">
            <button @click="showGroupPanel = false">←</button>
            <h3>{{ currentGroup?.name }}</h3>
            <span class="cp-group-badge">{{ currentGroup?.member_count }}人</span>
          </div>
          <div class="cp-group-messages" ref="groupScrollRef">
            <div v-for="msg in groupMessages" :key="msg.id" class="cp-gmsg" :class="{ mine: msg.sender_id === myProfile?.user_id, ai: msg.sender_type === 'ai' }">
              <span v-if="msg.sender_type === 'ai'" class="cp-gmsg-avatar ai">🌟</span>
              <span v-else class="cp-gmsg-avatar">{{ (msg.sender_profile?.nickname || '?')[0] }}</span>
              <div class="cp-gmsg-bubble">{{ msg.content }}</div>
            </div>
          </div>
          <div class="cp-group-input">
            <textarea v-model="groupInput" placeholder="发消息... (@星火 唤AI)" rows="1" @keydown.enter.exact.prevent="handleGroupSend"></textarea>
            <button @click="handleGroupSend" :disabled="!groupInput.trim()">发送</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toastMsg" class="cp-toast">{{ toastMsg }}</div>
    </Transition>

    <div v-if="loading" class="cp-loading"><div class="cp-spinner"></div></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useCompanion, MOMENT_EXPIRY_OPTIONS } from '../../composables/useCompanion'
import type { Friend, Moment, GroupChat, GroupMessage, SparkProfile } from '../../composables/useCompanion'
import QRCode from 'qrcode'
import FriendList from '../../components/companion/FriendList.vue'
import MomentCard from '../../components/companion/MomentCard.vue'

const {
  myProfile, friends, friendRequests, moments, plazaMoments, groups, loading,
  fetchMyProfile, updateProfile, changeSparkId, getMyQRData, addFriendByQR,
  fetchFriends, fetchFriendRequests, acceptRequest, rejectRequest, removeFriend,
  fetchMoments, fetchPlazaMoments, postMoment, toggleMomentLike, shareMomentToWall,
  createGroup, fetchGroups, fetchGroupMessages, sendGroupMessage,
  formatTimeAgo,
} = useCompanion()

const activeTab = ref<'friends' | 'moments' | 'plaza'>('friends')

// 弹窗控制
const showPostModal = ref(false)
const showProfileModal = ref(false)
const showQRModal = ref(false)
const showCreateGroupModal = ref(false)
const showGroupPanel = ref(false)

// 发布动态
const postMode = ref<'text' | 'image' | 'video'>('text')
const postContent = ref('')
const postVis = ref<'public' | 'friends' | 'private'>('friends')
const postImgFiles = ref<File[]>([])
const postVidFiles = ref<File[]>([])
const postShowInPlaza = ref(false)
const postExpiry = ref<number | null>(null)
const posting = ref(false)

// 星火ID
const newSparkId = ref('')

// 群聊
const newGroupName = ref('')
const newGroupAI = ref(true)
const newGroupMembers = ref<string[]>([])
const currentGroup = ref<GroupChat | null>(null)
const groupMessages = ref<GroupMessage[]>([])
const groupInput = ref('')
const groupScrollRef = ref<HTMLElement | null>(null)

// Toast
const toastMsg = ref('')
function showToast(msg: string) { toastMsg.value = msg; setTimeout(() => { toastMsg.value = '' }, 2500) }

// ===== 星火档案编辑 =====
const editNickname = ref('')
const editBio = ref('')
const editGender = ref('unknown')
const editYear = ref('')
const editUniversity = ref('')
const editInterests = ref<string[]>([])
const newTag = ref('')
const savingProfile = ref(false)
const myMomentsCount = ref(0)
const myMomentsList = ref<Moment[]>([])

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !editInterests.value.includes(tag) && editInterests.value.length < 8) {
    editInterests.value.push(tag)
  }
  newTag.value = ''
}

async function handleSaveProfile() {
  savingProfile.value = true
  await updateProfile({
    nickname: editNickname.value || myProfile.value?.nickname,
    bio: editBio.value,
    gender: editGender.value,
    school_year: editYear.value,
    university: editUniversity.value,
    interests: editInterests.value,
  } as Record<string, unknown>)
  savingProfile.value = false
  showToast('💾 资料已保存')
}

async function handleAvatarUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !myProfile.value) return
  try {
    const ext = file.name.split('.').pop()
    const path = `companion/${myProfile.value.user_id}/avatar.${ext}`
    const { supabase } = await import('../../supabase')
    await supabase.storage.from('campus-wall').upload(path, file, { contentType: file.type, upsert: true })
    const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
    await updateProfile({ avatar_url: urlData.publicUrl } as Record<string, unknown>)
    showToast('📷 头像已更新')
  } catch (err) { console.error(err); showToast('上传失败') }
}

async function loadMyMoments() {
  const { supabase } = await import('../../supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data, count } = await supabase.from('companion_moments')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(10)
  myMomentsList.value = (data || []) as Moment[]
  myMomentsCount.value = count || 0
}

// 打开档案弹窗时同步编辑数据
watch(showProfileModal, async (val) => {
  if (val && myProfile.value) {
    editNickname.value = myProfile.value.nickname
    editBio.value = myProfile.value.bio || ''
    editGender.value = myProfile.value.gender || 'unknown'
    editYear.value = myProfile.value.school_year || ''
    editUniversity.value = myProfile.value.university || ''
    editInterests.value = [...(myProfile.value.interests || [])]
    await loadMyMoments()
  }
})

// ===== 真实二维码 =====
const qrCanvasRef = ref<HTMLCanvasElement | null>(null)
const qrPasteInput = ref('')

async function generateQRCode() {
  if (!qrCanvasRef.value || !myProfile.value) return
  const qrData = getMyQRData()
  try {
    await QRCode.toCanvas(qrCanvasRef.value, qrData, {
      width: 180,
      margin: 2,
      color: { dark: '#8b5cf6', light: '#0d0b1e' },
      errorCorrectionLevel: 'M',
    })
  } catch (e) { console.error('二维码生成失败:', e) }
}

function copyQRData() {
  const data = getMyQRData()
  navigator.clipboard.writeText(data).then(() => {
    showToast('📋 名片数据已复制，发给好友即可添加')
  }).catch(() => { showToast('复制失败') })
}

async function handleAddByQRPaste() {
  if (!qrPasteInput.value.trim()) return
  const { ok, msg } = await addFriendByQR(qrPasteInput.value.trim())
  showToast(msg)
  if (ok) qrPasteInput.value = ''
}

// 二维码弹窗打开时生成
watch(showQRModal, (val) => {
  if (val) nextTick(() => generateQRCode())
})

const tabs = [
  { key: 'friends' as const, label: '好友', icon: '👥' },
  { key: 'moments' as const, label: '动态', icon: '📸' },
  { key: 'plaza' as const, label: '广场', icon: '🌍' },
]

const visOptions = [
  { value: 'public' as const, icon: '🌍', label: '公开' },
  { value: 'friends' as const, icon: '👥', label: '好友' },
  { value: 'private' as const, icon: '🔒', label: '自己' },
]

function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'friends') { fetchFriends(); fetchFriendRequests(); fetchGroups() }
  if (key === 'moments') fetchMoments(1)
  if (key === 'plaza') fetchPlazaMoments(1)
}



// ===== 好友 =====
async function handleAcceptReq(id: string) { if (await acceptRequest(id)) showToast('✅ 已添加好友') }
async function handleRejectReq(id: string) { if (await rejectRequest(id)) showToast('已拒绝申请') }
async function handleRemoveFriend(fid: string) {
  if (!confirm('确定删除该好友？')) return
  if (await removeFriend(fid)) showToast('已删除好友')
}
function handleFriendChat(_f: Friend) { showToast('💬 私聊功能即将上线') }

// ===== 动态 =====
function openPostModal(mode: 'text' | 'image' | 'video') {
  postMode.value = mode
  postContent.value = ''
  postImgFiles.value = []
  postVidFiles.value = []
  postVis.value = 'friends'
  postShowInPlaza.value = false
  postExpiry.value = null
  showPostModal.value = true
}

function handleImgSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) postImgFiles.value = Array.from(input.files).slice(0, 9)
}
function handleVidSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) postVidFiles.value = Array.from(input.files).slice(0, 3)
}

async function handlePost() {
  if (!postContent.value.trim() || posting.value) return
  posting.value = true
  const ok = await postMoment(
    postContent.value.trim(),
    postImgFiles.value.length ? postImgFiles.value : undefined,
    postVidFiles.value.length ? postVidFiles.value : undefined,
    postVis.value,
    postShowInPlaza.value,
    postExpiry.value,
  )
  posting.value = false
  if (ok) {
    showToast('📸 动态发布成功！')
    showPostModal.value = false
    fetchMoments(1)
  } else { showToast('发布失败') }
}

async function handleLike(id: string) { await toggleMomentLike(id) }
async function handleShareToWall(m: Moment) {
  if (!confirm('确认转发到校园墙？')) return
  showToast((await shareMomentToWall(m)) ? '🚀 已转发到校园墙' : '转发失败')
}
function refreshMoments() { fetchMoments(1) }
function refreshPlaza() { fetchPlazaMoments(1) }

// ===== 星火ID =====
async function handleChangeId() {
  const { ok, msg } = await changeSparkId(newSparkId.value)
  showToast(msg)
  if (ok) { newSparkId.value = ''; showProfileModal.value = false }
}
async function togglePlazaVisibility() {
  if (!myProfile.value) return
  await updateProfile({ show_in_plaza: !myProfile.value.show_in_plaza })
}

// ===== 群聊 =====
async function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  const gid = await createGroup(newGroupName.value.trim(), newGroupMembers.value, newGroupAI.value)
  if (gid) {
    showToast('👥 群聊创建成功')
    showCreateGroupModal.value = false
    newGroupName.value = ''
    newGroupMembers.value = []
    fetchGroups()
  }
}

async function openGroupChat(g: GroupChat) {
  currentGroup.value = g
  groupMessages.value = await fetchGroupMessages(g.id)
  showGroupPanel.value = true
  nextTick(() => { if (groupScrollRef.value) groupScrollRef.value.scrollTop = groupScrollRef.value.scrollHeight })
}

async function handleGroupSend() {
  if (!groupInput.value.trim() || !currentGroup.value) return
  const content = groupInput.value.trim()
  groupInput.value = ''
  // 本地追加
  groupMessages.value.push({
    id: Date.now().toString(), group_id: currentGroup.value.id,
    sender_id: myProfile.value?.user_id || '', sender_type: 'user',
    content, created_at: new Date().toISOString(),
  })
  nextTick(() => { if (groupScrollRef.value) groupScrollRef.value.scrollTop = groupScrollRef.value.scrollHeight })
  await sendGroupMessage(currentGroup.value.id, content)
  // 刷新消息（获取AI回复）
  setTimeout(async () => {
    groupMessages.value = await fetchGroupMessages(currentGroup.value!.id)
    nextTick(() => { if (groupScrollRef.value) groupScrollRef.value.scrollTop = groupScrollRef.value.scrollHeight })
  }, 2000)
}

// ===== 初始化 =====
onMounted(async () => {
  await fetchMyProfile()
  await fetchFriends()
  await fetchFriendRequests()
  await fetchGroups()
})
</script>

<style scoped>
.companion-page{min-height:100vh;padding:0 16px 80px;max-width:640px;margin:0 auto;position:relative}

/* 顶栏 */
.cp-topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 0 10px}
.cp-greeting{flex:1}.cp-title{font-size:20px;font-weight:700;color:rgba(255,255,255,.88);margin:0}
.cp-subtitle{font-size:11px;color:rgba(255,255,255,.25);margin:2px 0 0}
.cp-spark-id{color:rgba(139,92,246,.6);font-family:monospace;font-weight:700}
.cp-profile-btn{background:none;border:none;cursor:pointer;padding:0}
.cp-avatar-mini{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-weight:700}

/* Tab */
.cp-tabs{display:flex;gap:0;padding:3px;background:rgba(255,255,255,.025);border-radius:12px;border:1px solid rgba(255,255,255,.04);margin-bottom:14px}
.cp-tab{flex:1;padding:8px 0;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.3);font-size:11px;font-weight:500;cursor:pointer;transition:all .25s}
.cp-tab.active{background:rgba(139,92,246,.12);color:rgba(139,92,246,.85);font-weight:600}

/* 发布入口 */
.cp-post-entry{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:12px}
.cp-post-avatar{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.cp-post-hint{flex:1;font-size:13px;color:rgba(255,255,255,.2);cursor:pointer}
.cp-post-icon-btn{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;font-size:16px;padding:6px 10px;cursor:pointer;transition:all .2s}
.cp-post-icon-btn:hover{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.15)}

.cp-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:30px}

/* Section */
.cp-section-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:16px 0 10px}
.cp-plaza-header{text-align:center;margin-bottom:14px}
.cp-plaza-desc{font-size:11px;color:rgba(255,255,255,.2);margin:2px 0 0}

/* 群聊 */
.cp-groups{margin-top:16px}
.cp-group-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:5px;cursor:pointer;transition:all .2s}
.cp-group-card:hover{background:rgba(139,92,246,.04)}
.cp-group-icon{font-size:20px;flex-shrink:0}
.cp-group-info{flex:1}.cp-group-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.6)}.cp-group-meta{display:block;font-size:10px;color:rgba(255,255,255,.2)}
.cp-create-group-btn{width:100%;padding:10px;border-radius:10px;border:1px dashed rgba(139,92,246,.15);background:rgba(139,92,246,.03);color:rgba(139,92,246,.5);font-size:12px;cursor:pointer;margin-top:10px;transition:all .2s}
.cp-create-group-btn:hover{background:rgba(139,92,246,.08)}

/* 弹窗 */
.cp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.cp-modal{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:24px}
.cp-modal.small{max-width:360px}
.cp-modal.tall{max-width:500px;height:80vh;display:flex;flex-direction:column}
.cp-modal h3{font-size:16px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 14px;text-align:center}
.cp-post-textarea{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit;resize:none;line-height:1.6;margin-bottom:10px}
.cp-post-textarea.single{resize:none;height:auto;margin-bottom:12px}
.cp-post-textarea:focus{border-color:rgba(139,92,246,.2)}
.cp-post-textarea::placeholder{color:rgba(255,255,255,.2)}

.cp-upload{display:flex;align-items:center;justify-content:center;padding:14px;border-radius:12px;border:2px dashed rgba(139,92,246,.1);background:rgba(139,92,246,.03);cursor:pointer;margin-bottom:8px;font-size:12px;color:rgba(255,255,255,.3)}
.cp-upload.video{border-color:rgba(239,68,68,.1);background:rgba(239,68,68,.02)}

.cp-vis-row,.cp-expiry-row{margin-bottom:10px}
.cp-vis-label{font-size:12px;color:rgba(255,255,255,.3);display:block;margin-bottom:6px}
.cp-vis-btns{display:flex;gap:4px;flex-wrap:wrap}
.cp-vis-btn{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;transition:all .2s}
.cp-vis-btn.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}

.cp-plaza-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.4);margin:6px 0 10px;cursor:pointer}
.cp-plaza-toggle input{accent-color:rgba(139,92,246,.6)}

.cp-modal-actions{display:flex;gap:8px;margin-top:10px}
.cp-modal-cancel,.cp-modal-confirm{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.cp-modal-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.cp-modal-cancel.full{width:100%;margin-top:12px}
.cp-modal-confirm{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.cp-modal-confirm:disabled{opacity:.3;cursor:default}

/* 星火档案完整版 */
.profile-modal{max-width:520px}
.cp-profile-full{max-height:65vh;overflow-y:auto;padding-right:4px}
.pf-header{display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;background:linear-gradient(160deg,rgba(139,92,246,.06),rgba(59,130,246,.03));border:1px solid rgba(139,92,246,.08);margin-bottom:14px}
.pf-avatar-wrap{position:relative;cursor:pointer;flex-shrink:0}
.pf-avatar-img{width:56px;height:56px;border-radius:16px;object-fit:cover}
.pf-avatar-text{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(139,92,246,.35),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:700}
.pf-avatar-edit{position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-radius:6px;background:rgba(139,92,246,.8);display:flex;align-items:center;justify-content:center;font-size:10px}
.pf-meta{flex:1;min-width:0}
.pf-name{display:block;font-size:16px;font-weight:700;color:rgba(255,255,255,.85)}
.pf-sparkid{display:block;font-size:11px;color:rgba(139,92,246,.6);font-family:monospace}
.pf-bio{display:block;font-size:11px;color:rgba(255,255,255,.3);margin-top:2px}

.pf-stats{display:flex;gap:0;text-align:center;margin-bottom:14px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);overflow:hidden}
.pf-stat{flex:1;padding:12px 0;border-right:1px solid rgba(255,255,255,.03)}
.pf-stat:last-child{border-right:none}
.pf-stat-num{display:block;font-size:18px;font-weight:700;color:rgba(139,92,246,.7)}
.pf-stat-label{display:block;font-size:10px;color:rgba(255,255,255,.25)}

.pf-edit-section{margin-bottom:14px;padding:12px;border-radius:12px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03)}
.pf-edit-section h4{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}
.pf-hint{font-size:10px;font-weight:400;color:rgba(245,158,11,.5)}
.pf-field{margin-bottom:8px}
.pf-field label{display:block;font-size:11px;color:rgba(255,255,255,.3);margin-bottom:3px}
.pf-field-row{display:flex;gap:8px}
.pf-field.half{flex:1}
.pf-input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;box-sizing:border-box;font-family:inherit;resize:none}
.pf-input:focus{border-color:rgba(139,92,246,.2)}
.pf-input::placeholder{color:rgba(255,255,255,.15)}
select.pf-input{appearance:auto;cursor:pointer}

.pf-tags{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pf-tag{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;background:rgba(139,92,246,.1);color:rgba(139,92,246,.7);font-size:11px}
.pf-tag button{background:none;border:none;color:rgba(139,92,246,.4);font-size:10px;cursor:pointer;padding:0}
.pf-tag-input{width:60px;padding:3px 6px;border-radius:6px;border:1px dashed rgba(139,92,246,.1);background:transparent;color:rgba(139,92,246,.5);font-size:11px;outline:none}
.pf-tag-input::placeholder{color:rgba(139,92,246,.25)}

.pf-save-btn{width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font-size:13px;font-weight:600;cursor:pointer;margin-top:6px}
.pf-save-btn:disabled{opacity:.3}

.pf-moment-mini{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.015);margin-bottom:4px}
.pf-moment-time{font-size:10px;color:rgba(255,255,255,.15);flex-shrink:0;width:48px}
.pf-moment-content{flex:1;font-size:11px;color:rgba(255,255,255,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-moment-stats{font-size:10px;color:rgba(255,255,255,.15);flex-shrink:0}

.cp-sparkid-change{display:flex;gap:6px;margin-bottom:10px}
.cp-sparkid-input{flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;font-family:monospace;text-transform:uppercase}
.cp-sparkid-btn{padding:8px 14px;border-radius:8px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.cp-sparkid-btn:disabled{opacity:.3}

/* 真实二维码卡片 */
.cp-qr-display{display:flex;justify-content:center;padding:8px 0}
.cp-qr-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 20px;border-radius:18px;background:linear-gradient(160deg,rgba(139,92,246,.08),rgba(59,130,246,.04));border:1px solid rgba(139,92,246,.12);width:240px}
.cp-qr-card-header{display:flex;align-items:center;gap:10px;width:100%;margin-bottom:6px}
.cp-qr-card-avatar{width:36px;height:36px;border-radius:10px;object-fit:cover}
.cp-qr-card-avatar-text{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.35),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.cp-qr-card-info{flex:1}
.cp-qr-card-name{display:block;font-size:14px;font-weight:700;color:rgba(255,255,255,.8)}
.cp-qr-card-id{display:block;font-size:10px;color:rgba(139,92,246,.6);font-family:monospace}
.cp-qr-canvas{border-radius:10px;margin:6px 0}
.cp-qr-tip{font-size:10px;color:rgba(255,255,255,.2);text-align:center}
.cp-qr-manual{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.04)}
.cp-qr-paste-row{display:flex;gap:6px}

/* 群聊面板 */
.cp-group-header{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.04)}
.cp-group-header button{background:none;border:none;color:rgba(255,255,255,.5);font-size:16px;cursor:pointer}
.cp-group-header h3{flex:1;margin:0;font-size:14px}
.cp-group-badge{font-size:10px;color:rgba(255,255,255,.2);background:rgba(255,255,255,.03);padding:2px 8px;border-radius:20px}
.cp-group-messages{flex:1;overflow-y:auto;padding:12px 0;scroll-behavior:smooth}
.cp-gmsg{display:flex;gap:8px;margin-bottom:10px;max-width:85%}
.cp-gmsg.mine{margin-left:auto;flex-direction:row-reverse}
.cp-gmsg.ai{margin-right:auto}
.cp-gmsg-avatar{width:24px;height:24px;border-radius:6px;background:rgba(139,92,246,.15);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;color:white;font-weight:700}
.cp-gmsg-avatar.ai{background:rgba(245,158,11,.15)}
.cp-gmsg-bubble{padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.5;background:rgba(255,255,255,.03);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.04)}
.cp-gmsg.mine .cp-gmsg-bubble{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.1);color:rgba(255,255,255,.7)}
.cp-gmsg.ai .cp-gmsg-bubble{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.1);color:rgba(255,255,255,.6)}
.cp-group-input{display:flex;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,.04)}
.cp-group-input textarea{flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;color:white;font-size:12px;padding:8px 10px;resize:none;outline:none;font-family:inherit}
.cp-group-input textarea::placeholder{color:rgba(255,255,255,.2)}
.cp-group-input button{padding:8px 14px;border-radius:10px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer}
.cp-group-input button:disabled{opacity:.3}

.cp-group-members-select{margin:8px 0}
.cp-member-option{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.4);padding:4px 0;cursor:pointer}
.cp-member-option input{accent-color:rgba(139,92,246,.6)}

/* 通用 */
.cp-loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);z-index:50;backdrop-filter:blur(2px)}
.cp-spinner{width:28px;height:28px;border:2.5px solid rgba(139,92,246,.1);border-top-color:rgba(139,92,246,.6);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}
.cp-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(139,92,246,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:300;box-shadow:0 4px 20px rgba(139,92,246,.3)}
</style>
