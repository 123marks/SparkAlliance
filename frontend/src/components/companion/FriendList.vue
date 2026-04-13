<template>
  <div class="fl-container">
    <!-- 搜索框 -->
    <div class="fl-search">
      <div class="fl-search-box">
        <span class="fl-search-icon">🔍</span>
        <input v-model="searchQuery" class="fl-search-input" placeholder="搜索好友" @input="onSearchInput" />
        <button v-if="searchQuery" class="fl-search-clear" @click="searchQuery='';onSearchInput()">✕</button>
      </div>
      <button class="fl-qr-btn" @click="$emit('showQR')" title="我的二维码">📱</button>
    </div>

    <!-- 标签筛选栏 -->
    <div v-if="tags.length" class="fl-tag-bar">
      <button class="fl-tag-pill" :class="{active:!activeTagId}" @click="activeTagId=null">全部</button>
      <button v-for="tag in tags" :key="tag.id" class="fl-tag-pill" :class="{active:activeTagId===tag.id}" :style="activeTagId===tag.id?{background:tag.color+'22',borderColor:tag.color+'44',color:tag.color}:{}" @click="activeTagId=activeTagId===tag.id?null:tag.id">
        {{ tag.name }}
      </button>
      <button class="fl-tag-manage" @click="showTagManager=true" title="管理标签">⚙️</button>
    </div>
    <div v-else class="fl-tag-bar">
      <button class="fl-tag-manage" @click="showTagManager=true" title="创建标签">🏷️ 标签</button>
    </div>

    <!-- 搜索加好友区 -->
    <div v-if="showAddSearch" class="fl-add-section">
      <div class="fl-add-search">
        <input v-model="addQuery" class="fl-add-input" placeholder="🔍 搜索星火ID或昵称..." @keydown.enter="handleAddSearch" />
        <button class="fl-add-btn" @click="handleAddSearch" :disabled="addSearching">搜索</button>
      </div>
      <div v-if="addResults.length" class="fl-results">
        <div v-for="sp in addResults" :key="sp.id" class="fl-result-card">
          <span class="fl-r-avatar">{{ sp.nickname[0] }}</span>
          <div class="fl-r-info">
            <span class="fl-r-name">{{ sp.nickname }}</span>
            <span class="fl-r-id">星火ID: {{ sp.spark_id }}</span>
          </div>
          <button class="fl-add-friend-btn" @click="handleAdd(sp)" :disabled="addingId===sp.user_id">
            {{ isFriend(sp.user_id) ? '✅ 已添加' : addingId===sp.user_id ? '...' : '➕ 添加' }}
          </button>
        </div>
      </div>
      <p v-if="addSearched && addResults.length===0" class="fl-no-result">未找到匹配用户</p>
    </div>

    <!-- 好友申请 -->
    <div v-if="requests.length" class="fl-requests">
      <h3 class="fl-section-title">📬 好友申请 ({{ requests.length }})</h3>
      <div v-for="req in requests" :key="req.id" class="fl-req-card">
        <span class="fl-req-avatar">{{ getReqName(req)[0] }}</span>
        <div class="fl-req-info">
          <span class="fl-req-name">{{ getReqName(req) }}</span>
          <span class="fl-req-source">{{ sourceLabels[req.source] || '搜索' }}</span>
          <span v-if="req.message" class="fl-req-msg">{{ req.message }}</span>
        </div>
        <div class="fl-req-acts">
          <button class="fl-req-accept" @click="$emit('accept', req.id)">✅</button>
          <button class="fl-req-reject" @click="$emit('reject', req.id)">❌</button>
        </div>
      </div>
    </div>

    <!-- 好友列表 -->
    <div class="fl-list">
      <h3 class="fl-section-title">👥 我的好友 ({{ filteredFriends.length }})</h3>
      <div v-if="filteredFriends.length === 0" class="fl-empty">
        {{ searchQuery ? '没有匹配的好友' : '还没有好友，搜索星火ID或扫码添加 ✨' }}
      </div>

      <!-- 首字母分组列表 -->
      <template v-if="!searchQuery">
        <!-- 星标好友 -->
        <template v-if="starredFriends.length">
          <div class="fl-letter-header">⭐ 星标好友</div>
          <div v-for="f in starredFriends" :key="'s'+f.id" class="fl-friend-card" @click="$emit('chat', f)">
            <span class="fl-friend-avatar">{{ f.avatar || getFriendDisplayName(f)[0] }}</span>
            <div class="fl-friend-info">
              <div class="fl-friend-name-row">
                <span class="fl-star-icon active">⭐</span>
                <span class="fl-friend-name">{{ getFriendDisplayName(f) }}</span>
                <span v-if="f.remark" class="fl-friend-remark">（{{ f.remark }}）</span>
              </div>
              <span class="fl-friend-meta">{{ getFriendMeta(f) }}</span>
            </div>
            <div class="fl-friend-actions">
              <button class="fl-friend-more" @click.stop="toggleFriendMenu(f.spark_id)" title="更多">⋯</button>
            </div>
            <!-- 三点菜单 -->
            <Transition name="fade">
              <div v-if="friendMenuId===f.spark_id" class="fl-friend-menu" @click.stop>
                <button @click.stop="handleMenuAction('star', f)">{{ f.is_starred ? '☆ 取消星标' : '⭐ 设为星标' }}</button>
                <button @click.stop="handleMenuAction('remark', f)">✏️ 编辑备注</button>
                <button @click.stop="handleMenuAction('tag', f)">🏷️ 管理标签</button>
                <button @click.stop="handleMenuAction('permission', f)">🔒 好友权限</button>
                <button class="warn" @click.stop="handleMenuAction('block', f)">🚫 拉黑</button>
                <button class="del" @click.stop="handleMenuAction('delete', f)">🗑️ 删除好友</button>
              </div>
            </Transition>
          </div>
        </template>

        <!-- 按字母分组 -->
        <template v-for="group in letterGroups" :key="group.letter">
          <div :id="'fl-letter-'+group.letter" class="fl-letter-header">{{ group.letter }}</div>
          <div v-for="f in group.friends" :key="f.id" class="fl-friend-card" @click="$emit('chat', f)">
            <span class="fl-friend-avatar">{{ f.avatar || getFriendDisplayName(f)[0] }}</span>
            <div class="fl-friend-info">
              <div class="fl-friend-name-row">
                <span v-if="f.is_starred" class="fl-star-icon active" @click.stop="onToggleStar(f.spark_id)">⭐</span>
                <span class="fl-friend-name">{{ getFriendDisplayName(f) }}</span>
                <span v-if="f.remark" class="fl-friend-remark">（{{ f.remark }}）</span>
              </div>
              <span class="fl-friend-meta">{{ getFriendMeta(f) }}</span>
            </div>
            <div class="fl-friend-actions">
              <button class="fl-friend-more" @click.stop="toggleFriendMenu(f.spark_id)" title="更多">⋯</button>
            </div>
            <Transition name="fade">
              <div v-if="friendMenuId===f.spark_id" class="fl-friend-menu" @click.stop>
                <button @click.stop="handleMenuAction('star', f)">{{ f.is_starred ? '☆ 取消星标' : '⭐ 设为星标' }}</button>
                <button @click.stop="handleMenuAction('remark', f)">✏️ 编辑备注</button>
                <button @click.stop="handleMenuAction('tag', f)">🏷️ 管理标签</button>
                <button @click.stop="handleMenuAction('permission', f)">🔒 好友权限</button>
                <button class="warn" @click.stop="handleMenuAction('block', f)">🚫 拉黑</button>
                <button class="del" @click.stop="handleMenuAction('delete', f)">🗑️ 删除好友</button>
              </div>
            </Transition>
          </div>
        </template>
      </template>

      <!-- 搜索结果（高亮匹配） -->
      <template v-else>
        <div v-for="f in filteredFriends" :key="f.id" class="fl-friend-card" @click="$emit('chat', f)">
          <span class="fl-friend-avatar">{{ f.avatar || getFriendDisplayName(f)[0] }}</span>
          <div class="fl-friend-info">
            <div class="fl-friend-name-row">
              <span v-if="f.is_starred" class="fl-star-icon active">⭐</span>
              <span class="fl-friend-name" v-html="highlightMatch(getFriendDisplayName(f))"></span>
              <span v-if="f.remark" class="fl-friend-remark" v-html="'（' + highlightMatch(f.remark) + '）'"></span>
            </div>
            <span class="fl-friend-meta" v-html="highlightMatch(f.spark_id)"></span>
          </div>
          <button class="fl-friend-more" @click.stop="toggleFriendMenu(f.spark_id)">⋯</button>
        </div>
      </template>

      <!-- 右侧字母索引条 -->
      <div v-if="!searchQuery && letterGroups.length>3" class="fl-letter-index">
        <span v-if="starredFriends.length" class="fl-idx-item" @click="scrollToLetter('⭐')">★</span>
        <span v-for="g in letterGroups" :key="g.letter" class="fl-idx-item" @click="scrollToLetter(g.letter)">{{ g.letter }}</span>
      </div>
    </div>

    <!-- 编辑备注弹窗 -->
    <Transition name="fade">
      <div v-if="showRemarkModal" class="fl-overlay" @click.self="showRemarkModal=false">
        <div class="fl-modal">
          <h3>✏️ 编辑备注</h3>
          <input v-model="remarkInput" class="fl-modal-input" placeholder="输入好友备注..." @keydown.enter="confirmRemark" />
          <div class="fl-modal-btns">
            <button @click="showRemarkModal=false">取消</button>
            <button class="primary" @click="confirmRemark">确定</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 好友权限弹窗 -->
    <Transition name="fade">
      <div v-if="showPermModal" class="fl-overlay" @click.self="showPermModal=false">
        <div class="fl-modal">
          <h3>🔒 好友权限</h3>
          <p class="fl-modal-sub">{{ permTarget?.nickname }}</p>
          <div class="fl-perm-row">
            <span>允许对方查看我的星火域</span>
            <label class="fl-toggle"><input type="checkbox" v-model="permAllowView"><span class="fl-slider"></span></label>
          </div>
          <div class="fl-perm-row">
            <span>隐藏对方的星火域</span>
            <label class="fl-toggle"><input type="checkbox" v-model="permHideTheir"><span class="fl-slider"></span></label>
          </div>
          <div class="fl-modal-btns">
            <button @click="showPermModal=false">取消</button>
            <button class="primary" @click="confirmPerm">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 标签管理弹窗 -->
    <Transition name="fade">
      <div v-if="showTagManager" class="fl-overlay" @click.self="showTagManager=false">
        <div class="fl-modal lg">
          <h3>🏷️ 标签管理</h3>
          <!-- 创建新标签 -->
          <div class="fl-tag-create">
            <input v-model="newTagName" class="fl-modal-input sm" placeholder="新标签名称..." @keydown.enter="handleCreateTag" />
            <input v-model="newTagColor" type="color" class="fl-color-pick" />
            <button class="fl-tag-add-btn" @click="handleCreateTag" :disabled="!newTagName.trim()">创建</button>
          </div>
          <!-- 标签列表 -->
          <div v-for="tag in tags" :key="tag.id" class="fl-tag-item">
            <span class="fl-tag-dot" :style="{background:tag.color}"></span>
            <span v-if="editingTagId!==tag.id" class="fl-tag-name">{{ tag.name }}</span>
            <input v-else v-model="editingTagName" class="fl-tag-edit-input" @keydown.enter="confirmRenameTag(tag.id)" @blur="confirmRenameTag(tag.id)" />
            <span class="fl-tag-count">{{ tag.members.length }}人</span>
            <button class="fl-tag-edit" @click="startEditTag(tag)">✏️</button>
            <button class="fl-tag-del" @click="handleDeleteTag(tag.id)">✕</button>
          </div>
          <p v-if="!tags.length" class="fl-empty-sm">还没有标签</p>
          <div class="fl-modal-btns"><button @click="showTagManager=false">关闭</button></div>
        </div>
      </div>
    </Transition>

    <!-- 给好友添加/移除标签弹窗 -->
    <Transition name="fade">
      <div v-if="showFriendTagModal" class="fl-overlay" @click.self="showFriendTagModal=false">
        <div class="fl-modal">
          <h3>🏷️ 管理标签 - {{ tagTargetFriend?.nickname }}</h3>
          <div class="fl-ftag-search">
            <input v-model="friendTagSearch" class="fl-modal-input sm" placeholder="搜索标签..." />
          </div>
          <div v-for="tag in filteredTagsForModal" :key="tag.id" class="fl-ftag-row">
            <label class="fl-ftag-label">
              <input type="checkbox" :checked="tag.members.includes(tagTargetFriend?.spark_id||'')" @change="toggleFriendTag(tag.id, tagTargetFriend?.spark_id||'')" />
              <span class="fl-tag-dot sm" :style="{background:tag.color}"></span>
              <span>{{ tag.name }}</span>
            </label>
          </div>
          <p v-if="!tags.length" class="fl-empty-sm">还没有标签，请先创建</p>
          <div class="fl-modal-btns">
            <button @click="showFriendTagModal=false">完成</button>
            <button class="primary" @click="showTagManager=true;showFriendTagModal=false">管理标签</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 确认弹窗（删除/拉黑） -->
    <Transition name="fade">
      <div v-if="confirmModal.show" class="fl-overlay" @click.self="confirmModal.show=false">
        <div class="fl-modal sm">
          <h3>{{ confirmModal.title }}</h3>
          <p class="fl-confirm-text">{{ confirmModal.text }}</p>
          <div class="fl-modal-btns">
            <button @click="confirmModal.show=false">取消</button>
            <button class="danger" @click="confirmModal.onConfirm?.();confirmModal.show=false">{{ confirmModal.btnText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import type { Friend, FriendRequest, FriendTag, SparkProfile } from '../../composables/useCompanion'
import { useCompanion } from '../../composables/useCompanion'

const props = defineProps<{
  friendList: Friend[]
  requests: FriendRequest[]
  tags: FriendTag[]
  showAddSearch?: boolean
}>()
const emit = defineEmits<{
  accept: [id: string]
  reject: [id: string]
  remove: [friendId: string]
  chat: [friend: Friend]
  showQR: []
  starToggle: [friendId: string]
  remarkUpdate: [friendId: string, remark: string]
  block: [friendId: string]
  permUpdate: [friendId: string, perms: { allow_view_my_moments: boolean; hide_their_moments: boolean }]
}>()

const { searchBySparkId, sendFriendRequest, toggleStarFriend, updateFriendRemark,
  blockFriend, updateFriendPermissions, getFriendPermissions,
  createTag, renameTag, deleteTag, addMemberToTag, removeMemberFromTag, removeFriend } = useCompanion()

// Search
const searchQuery = ref('')
const activeTagId = ref<string | null>(null)
const friendMenuId = ref<string | null>(null)

// Add friend search
const addQuery = ref('')
const addResults = ref<SparkProfile[]>([])
const addSearching = ref(false)
const addSearched = ref(false)
const addingId = ref<string | null>(null)

// Remark modal
const showRemarkModal = ref(false)
const remarkInput = ref('')
const remarkTarget = ref<Friend | null>(null)

// Permission modal
const showPermModal = ref(false)
const permTarget = ref<Friend | null>(null)
const permAllowView = ref(true)
const permHideTheir = ref(false)

// Tag management
const showTagManager = ref(false)
const newTagName = ref('')
const newTagColor = ref('#a855f7')
const editingTagId = ref<string | null>(null)
const editingTagName = ref('')

// Friend-tag assignment
const showFriendTagModal = ref(false)
const tagTargetFriend = ref<Friend | null>(null)
const friendTagSearch = ref('')

// Confirm modal
const confirmModal = reactive<{ show: boolean; title: string; text: string; btnText: string; onConfirm: (() => void) | null }>({
  show: false, title: '', text: '', btnText: '确认', onConfirm: null
})

const sourceLabels: Record<string, string> = {
  search: '🔍 搜索加好友', qrcode: '📱 扫码加好友', plaza: '🌍 好友广场', group: '👥 群聊',
}

// Pinyin first letter helper
function getFirstLetter(str: string): string {
  if (!str) return '#'
  const c = str.charAt(0).toUpperCase()
  if (/[A-Z]/.test(c)) return c
  // Common Chinese character to pinyin initial mapping
  const code = str.charCodeAt(0)
  if (code >= 0x4e00 && code <= 0x9fff) {
    // Simplified pinyin initial lookup table for common ranges
    const pinyinMap: [number, string][] = [
      [0x5475, 'A'],[0x5765, 'B'],[0x5D14, 'C'],[0x6320, 'D'],[0x6B59, 'E'],
      [0x7085, 'F'],[0x7473, 'G'],[0x7BAD, 'H'],[0x5C3F, 'J'],[0x5F00, 'K'],
      [0x6D1E, 'L'],[0x7792, 'M'],[0x82E5, 'N'],[0x5662, 'O'],[0x5C81, 'P'],
      [0x79FB, 'Q'],[0x82E5, 'R'],[0x6563, 'S'],[0x5929, 'T'],[0x6C83, 'W'],
      [0x7A00, 'X'],[0x4E00, 'Y'],[0x5B57, 'Z'],
    ]
    for (const [threshold, letter] of pinyinMap) {
      if (code <= threshold) return letter
    }
    return 'Z'
  }
  return '#'
}

// Filter friends by search + tag
const filteredFriends = computed(() => {
  let list = [...props.friendList]
  // Tag filter
  if (activeTagId.value) {
    const tag = props.tags.find(t => t.id === activeTagId.value)
    if (tag) list = list.filter(f => tag.members.includes(f.spark_id))
  }
  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(f =>
      f.nickname.toLowerCase().includes(q) ||
      (f.remark || '').toLowerCase().includes(q) ||
      f.spark_id.toLowerCase().includes(q)
    )
  }
  return list
})

// Starred friends (non-search mode)
const starredFriends = computed(() => {
  if (activeTagId.value) {
    const tag = props.tags.find(t => t.id === activeTagId.value)
    if (tag) return props.friendList.filter(f => f.is_starred && tag.members.includes(f.spark_id))
  }
  return props.friendList.filter(f => f.is_starred)
})

// Non-starred friends grouped by first letter
const letterGroups = computed(() => {
  const nonStarred = filteredFriends.value.filter(f => !f.is_starred)
  const groups: Record<string, Friend[]> = {}
  for (const f of nonStarred) {
    const name = f.remark || f.nickname || ''
    const letter = getFirstLetter(name)
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(f)
  }
  const sorted = Object.keys(groups).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
  return sorted.map(letter => ({ letter, friends: groups[letter] }))
})

// Tags filtered for friend-tag modal
const filteredTagsForModal = computed(() => {
  if (!friendTagSearch.value.trim()) return props.tags
  const q = friendTagSearch.value.trim().toLowerCase()
  return props.tags.filter(t => t.name.toLowerCase().includes(q))
})

function onSearchInput() { /* reactive via computed */ }

function getFriendDisplayName(f: Friend): string {
  return f.nickname || (f.profile as SparkProfile)?.nickname || '好友'
}

function getFriendMeta(f: Friend): string {
  const p = f.profile as SparkProfile | undefined
  const parts: string[] = []
  if (p?.region) parts.push(p.region)
  if (p?.identity) parts.push(p.identity)
  else if (p?.university) parts.push(p.university)
  if (p?.major) parts.push(p.major)
  if (parts.length) return parts.join(' | ')
  return f.spark_id
}

function getReqName(req: FriendRequest): string {
  return (req.from_profile as SparkProfile)?.nickname || '未知用户'
}

function highlightMatch(text: string): string {
  if (!searchQuery.value.trim() || !text) return text
  const q = searchQuery.value.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="fl-highlight">$1</mark>')
}

function scrollToLetter(letter: string) {
  const id = letter === '⭐' ? 'fl-letter-⭐' : 'fl-letter-' + letter
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggleFriendMenu(sparkId: string) {
  friendMenuId.value = friendMenuId.value === sparkId ? null : sparkId
}

function onToggleStar(friendId: string) {
  toggleStarFriend(friendId)
}

// Three-dot menu actions
function handleMenuAction(action: string, f: Friend) {
  friendMenuId.value = null
  if (action === 'star') {
    toggleStarFriend(f.spark_id)
  } else if (action === 'remark') {
    remarkTarget.value = f
    remarkInput.value = f.remark || ''
    showRemarkModal.value = true
  } else if (action === 'tag') {
    tagTargetFriend.value = f
    friendTagSearch.value = ''
    showFriendTagModal.value = true
  } else if (action === 'permission') {
    permTarget.value = f
    const perms = getFriendPermissions(f.spark_id)
    permAllowView.value = perms.allow_view_my_moments
    permHideTheir.value = perms.hide_their_moments
    showPermModal.value = true
  } else if (action === 'block') {
    confirmModal.show = true
    confirmModal.title = '🚫 拉黑好友'
    confirmModal.text = `确定要拉黑「${f.nickname}」吗？拉黑后将不再接收其消息。`
    confirmModal.btnText = '拉黑'
    confirmModal.onConfirm = () => { blockFriend(f.spark_id); emit('block', f.spark_id) }
  } else if (action === 'delete') {
    confirmModal.show = true
    confirmModal.title = '⚠️ 删除好友'
    confirmModal.text = `确定要删除「${f.nickname}」吗？`
    confirmModal.btnText = '删除'
    confirmModal.onConfirm = () => { removeFriend(f.spark_id); emit('remove', f.spark_id) }
  }
}

function confirmRemark() {
  if (remarkTarget.value) {
    updateFriendRemark(remarkTarget.value.spark_id, remarkInput.value.trim())
    emit('remarkUpdate', remarkTarget.value.spark_id, remarkInput.value.trim())
  }
  showRemarkModal.value = false
}

function confirmPerm() {
  if (permTarget.value) {
    updateFriendPermissions(permTarget.value.spark_id, {
      allow_view_my_moments: permAllowView.value,
      hide_their_moments: permHideTheir.value,
    })
    emit('permUpdate', permTarget.value.spark_id, {
      allow_view_my_moments: permAllowView.value,
      hide_their_moments: permHideTheir.value,
    })
  }
  showPermModal.value = false
}

// Tag CRUD
function handleCreateTag() {
  if (!newTagName.value.trim()) return
  createTag(newTagName.value.trim(), newTagColor.value)
  newTagName.value = ''
}

function startEditTag(tag: FriendTag) {
  editingTagId.value = tag.id
  editingTagName.value = tag.name
}

function confirmRenameTag(tagId: string) {
  if (editingTagName.value.trim()) renameTag(tagId, editingTagName.value.trim())
  editingTagId.value = null
}

function handleDeleteTag(tagId: string) {
  deleteTag(tagId)
}

function toggleFriendTag(tagId: string, friendId: string) {
  const tag = props.tags.find(t => t.id === tagId)
  if (!tag) return
  if (tag.members.includes(friendId)) removeMemberFromTag(tagId, friendId)
  else addMemberToTag(tagId, friendId)
}

// Add friend search
async function handleAddSearch() {
  if (!addQuery.value.trim()) return
  addSearching.value = true
  addResults.value = await searchBySparkId(addQuery.value.trim())
  addSearched.value = true
  addSearching.value = false
}

async function handleAdd(sp: SparkProfile) {
  addingId.value = sp.user_id
  await sendFriendRequest(sp.user_id, '', 'search')
  addingId.value = null
}

function isFriend(userId: string): boolean {
  return props.friendList.some(f => f.friend_id === userId)
}

// Close menus on outside click
function closeMenus() { friendMenuId.value = null }
onMounted(() => { window.addEventListener('click', closeMenus) })
onUnmounted(() => { window.removeEventListener('click', closeMenus) })
</script>

<style scoped>
.fl-container{padding:0;position:relative}
.fl-search{display:flex;gap:6px;margin-bottom:8px}
.fl-search-box{flex:1;display:flex;align-items:center;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);gap:6px}
.fl-search-icon{font-size:12px;opacity:.3;flex-shrink:0}
.fl-search-input{flex:1;padding:10px 0;border:none;background:none;color:white;font-size:13px;outline:none}
.fl-search-input::placeholder{color:rgba(255,255,255,.2)}
.fl-search-clear{background:none;border:none;color:rgba(255,255,255,.2);cursor:pointer;font-size:12px;padding:2px}
.fl-qr-btn{padding:10px;border-radius:12px;border:none;background:rgba(34,197,94,.08);color:rgba(34,197,94,.6);font-size:18px;cursor:pointer;flex-shrink:0}

/* Tag filter bar */
.fl-tag-bar{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:4px;align-items:center}
.fl-tag-bar::-webkit-scrollbar{height:2px}.fl-tag-bar::-webkit-scrollbar-thumb{background:rgba(255,255,255,.03)}
.fl-tag-pill{padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;white-space:nowrap;transition:all .15s}
.fl-tag-pill.active{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2);color:rgba(168,85,247,.8)}
.fl-tag-pill:hover{border-color:rgba(168,85,247,.15)}
.fl-tag-manage{padding:4px 10px;border-radius:20px;border:1px dashed rgba(255,255,255,.08);background:none;color:rgba(255,255,255,.2);font-size:11px;cursor:pointer;white-space:nowrap;transition:all .15s}
.fl-tag-manage:hover{border-color:rgba(168,85,247,.2);color:rgba(168,85,247,.5)}

/* Add friend section */
.fl-add-section{margin-bottom:12px;padding:8px;border-radius:10px;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.03)}
.fl-add-search{display:flex;gap:6px}
.fl-add-input{flex:1;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;box-sizing:border-box}
.fl-add-input:focus{border-color:rgba(139,92,246,.2)}
.fl-add-btn{padding:8px 14px;border-radius:10px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.fl-results{margin-top:8px}
.fl-result-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(34,197,94,.03);border:1px solid rgba(34,197,94,.08);margin-bottom:4px}
.fl-r-avatar{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0;font-size:13px}
.fl-r-info{flex:1;min-width:0}
.fl-r-name{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.7)}
.fl-r-id{display:block;font-size:10px;color:rgba(139,92,246,.5);font-family:monospace}
.fl-add-friend-btn{padding:5px 10px;border-radius:8px;border:none;background:rgba(34,197,94,.12);color:rgba(34,197,94,.7);font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap}
.fl-no-result{text-align:center;font-size:11px;color:rgba(255,255,255,.15);padding:8px}

/* Requests */
.fl-section-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}
.fl-requests{margin-bottom:14px}
.fl-req-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:6px}
.fl-req-avatar{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(239,68,68,.15));display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0}
.fl-req-info{flex:1;min-width:0}
.fl-req-name{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.6)}
.fl-req-source{display:block;font-size:9px;color:rgba(139,92,246,.4)}
.fl-req-msg{display:block;font-size:10px;color:rgba(255,255,255,.25)}
.fl-req-acts{display:flex;gap:4px}
.fl-req-accept,.fl-req-reject{width:30px;height:30px;border-radius:8px;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.fl-req-accept{background:rgba(34,197,94,.1);color:rgba(34,197,94,.7)}
.fl-req-reject{background:rgba(239,68,68,.08);color:rgba(239,68,68,.5)}

/* Friend list */
.fl-list{position:relative}
.fl-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:30px}

/* Letter headers */
.fl-letter-header{font-size:11px;font-weight:700;color:rgba(168,85,247,.5);padding:6px 4px 4px;margin-top:4px;border-bottom:1px solid rgba(255,255,255,.03);position:sticky;top:0;background:rgba(8,6,18,.95);z-index:1}

/* Friend card */
.fl-friend-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:4px;cursor:pointer;transition:all .2s;position:relative}
.fl-friend-card:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.08)}
.fl-friend-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(59,130,246,.15));display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:700;flex-shrink:0}
.fl-friend-info{flex:1;min-width:0}
.fl-friend-name-row{display:flex;align-items:center;gap:3px;flex-wrap:nowrap;min-width:0}
.fl-friend-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-friend-remark{font-size:11px;color:rgba(255,255,255,.3);white-space:nowrap;flex-shrink:0}
.fl-friend-meta{display:block;font-size:10px;color:rgba(255,255,255,.2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.fl-star-icon{font-size:11px;flex-shrink:0;cursor:pointer}.fl-star-icon.active{color:#f59e0b}
.fl-friend-actions{flex-shrink:0}
.fl-friend-more{background:none;border:none;color:rgba(255,255,255,.2);font-size:16px;cursor:pointer;padding:4px 6px;border-radius:6px;transition:all .15s;line-height:1}
.fl-friend-more:hover{color:rgba(255,255,255,.5);background:rgba(255,255,255,.04)}

/* Friend dropdown menu */
.fl-friend-menu{position:absolute;top:100%;right:8px;z-index:20;background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:150px}
.fl-friend-menu button{display:flex;width:100%;align-items:center;gap:6px;padding:8px 14px;border:none;background:none;color:rgba(255,255,255,.6);font-size:12px;cursor:pointer;border-radius:7px;transition:all .12s}
.fl-friend-menu button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.fl-friend-menu button.warn{color:rgba(251,191,36,.6)}.fl-friend-menu button.warn:hover{background:rgba(251,191,36,.06);color:rgba(251,191,36,.8)}
.fl-friend-menu button.del{color:rgba(239,68,68,.6)}.fl-friend-menu button.del:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.8)}

/* Letter index */
.fl-letter-index{position:absolute;right:0;top:40px;display:flex;flex-direction:column;align-items:center;gap:1px;padding:2px;z-index:5}
.fl-idx-item{font-size:9px;color:rgba(168,85,247,.4);cursor:pointer;padding:1px 3px;border-radius:3px;transition:all .12s;line-height:1.2}
.fl-idx-item:hover{color:rgba(168,85,247,.8);background:rgba(168,85,247,.08)}

/* Highlight */
:deep(.fl-highlight){background:rgba(168,85,247,.25);color:rgba(168,85,247,.9);border-radius:2px;padding:0 1px}

/* Modals */
.fl-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
.fl-modal{background:rgba(14,11,28,.97);border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:20px;width:340px;max-height:80vh;overflow-y:auto;box-shadow:0 16px 64px rgba(0,0,0,.4)}
.fl-modal.lg{width:380px}.fl-modal.sm{width:300px}
.fl-modal h3{margin:0 0 14px;font-size:14px;color:white;text-align:center;font-weight:700}
.fl-modal-sub{text-align:center;font-size:11px;color:rgba(255,255,255,.3);margin:0 0 12px}
.fl-modal-input{width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none;box-sizing:border-box;margin-bottom:8px}
.fl-modal-input:focus{border-color:rgba(139,92,246,.2)}
.fl-modal-input.sm{margin-bottom:0}
.fl-modal-btns{display:flex;gap:6px;margin-top:12px}
.fl-modal-btns button{flex:1;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;font-weight:600;transition:all .12s}
.fl-modal-btns button:hover{background:rgba(255,255,255,.04)}
.fl-modal-btns button.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none}
.fl-modal-btns button.danger{background:rgba(239,68,68,.12);color:rgba(239,68,68,.8);border-color:rgba(239,68,68,.15)}
.fl-confirm-text{font-size:12px;color:rgba(255,255,255,.4);text-align:center;line-height:1.6;margin:0 0 10px}
.fl-empty-sm{text-align:center;font-size:11px;color:rgba(255,255,255,.12);padding:16px}

/* Permission rows */
.fl-perm-row{display:flex;align-items:center;justify-content:space-between;padding:10px 4px;font-size:12px;color:rgba(255,255,255,.45);border-bottom:1px solid rgba(255,255,255,.03)}
.fl-toggle{position:relative;width:36px;height:20px;display:inline-block;flex-shrink:0}.fl-toggle input{opacity:0;width:0;height:0}
.fl-slider{position:absolute;cursor:pointer;inset:0;background:rgba(255,255,255,.06);border-radius:20px;transition:.2s}.fl-slider::before{content:'';position:absolute;height:16px;width:16px;left:2px;bottom:2px;background:rgba(255,255,255,.3);border-radius:50%;transition:.2s}
.fl-toggle input:checked+.fl-slider{background:rgba(139,92,246,.3)}.fl-toggle input:checked+.fl-slider::before{transform:translateX(16px);background:rgba(139,92,246,.8)}

/* Tag management */
.fl-tag-create{display:flex;gap:6px;align-items:center;margin-bottom:12px}
.fl-color-pick{width:32px;height:32px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0;flex-shrink:0}
.fl-tag-add-btn{padding:6px 14px;border-radius:8px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.fl-tag-add-btn:disabled{opacity:.3}
.fl-tag-item{display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.03)}
.fl-tag-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.fl-tag-dot.sm{width:8px;height:8px}
.fl-tag-name{flex:1;font-size:12px;color:rgba(255,255,255,.5)}
.fl-tag-count{font-size:10px;color:rgba(255,255,255,.15)}
.fl-tag-edit-input{flex:1;padding:2px 6px;border-radius:4px;border:1px solid rgba(139,92,246,.2);background:rgba(255,255,255,.03);color:white;font-size:12px;outline:none}
.fl-tag-edit,.fl-tag-del{background:none;border:none;color:rgba(255,255,255,.2);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;transition:all .12s}
.fl-tag-edit:hover{color:rgba(139,92,246,.6)}.fl-tag-del:hover{color:rgba(239,68,68,.6)}

/* Friend-tag assignment */
.fl-ftag-search{margin-bottom:8px}
.fl-ftag-row{padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.03)}
.fl-ftag-label{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.45);cursor:pointer}
.fl-ftag-label input{accent-color:#a855f7}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}
</style>
