<template>
  <!-- 好友列表 V2 —— 星火ID搜索 + 二维码 + 好友申请 -->
  <div class="fl-container">
    <!-- 搜索加好友 -->
    <div class="fl-search">
      <input v-model="searchQuery" class="fl-search-input" placeholder="🔍 搜索星火ID或昵称..." @keydown.enter="handleSearch" />
      <button class="fl-search-btn" @click="handleSearch" :disabled="searching">搜索</button>
      <button class="fl-qr-btn" @click="$emit('showQR')" title="我的二维码">📱</button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length" class="fl-results">
      <div v-for="sp in searchResults" :key="sp.id" class="fl-result-card">
        <span class="fl-r-avatar">{{ sp.nickname[0] }}</span>
        <div class="fl-r-info">
          <span class="fl-r-name">{{ sp.nickname }}</span>
          <span class="fl-r-id">星火ID: {{ sp.spark_id }}</span>
          <span v-if="sp.university" class="fl-r-school">{{ sp.university }}</span>
        </div>
        <button class="fl-add-btn" @click="handleAdd(sp)" :disabled="adding === sp.user_id">
          {{ isFriend(sp.user_id) ? '✅ 已添加' : adding === sp.user_id ? '...' : '➕ 添加' }}
        </button>
      </div>
    </div>
    <p v-if="searched && searchResults.length === 0" class="fl-no-result">未找到匹配用户</p>

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
      <h3 class="fl-section-title">👥 我的好友 ({{ friendList.length }})</h3>
      <div v-if="friendList.length === 0" class="fl-empty">
        还没有好友，搜索星火ID或扫码添加 ✨
      </div>
      <div v-for="f in friendList" :key="f.id" class="fl-friend-card" @click="$emit('chat', f)">
        <span class="fl-friend-avatar">{{ getFriendName(f)[0] }}</span>
        <div class="fl-friend-info">
          <span class="fl-friend-name">{{ getFriendName(f) }}</span>
          <span class="fl-friend-id">{{ (f.profile as SparkProfile)?.spark_id || '' }}</span>
        </div>
        <button class="fl-friend-del" @click.stop="$emit('remove', f.friend_id || f.spark_id)" title="删除好友">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Friend, FriendRequest, SparkProfile } from '../../composables/useCompanion'
import { useCompanion } from '../../composables/useCompanion'

const props = defineProps<{
  friendList: Friend[]
  requests: FriendRequest[]
}>()
defineEmits<{
  accept: [id: string]
  reject: [id: string]
  remove: [friendId: string]
  chat: [friend: Friend]
  showQR: []
}>()

const { searchBySparkId, sendFriendRequest } = useCompanion()
const searchQuery = ref('')
const searchResults = ref<SparkProfile[]>([])
const searching = ref(false)
const searched = ref(false)
const adding = ref<string | null>(null)

const sourceLabels: Record<string, string> = {
  search: '🔍 搜索加好友',
  qrcode: '📱 扫码加好友',
  plaza: '🌍 好友广场',
  group: '👥 群聊',
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  searchResults.value = await searchBySparkId(searchQuery.value.trim())
  searched.value = true
  searching.value = false
}

async function handleAdd(sp: SparkProfile) {
  adding.value = sp.user_id
  await sendFriendRequest(sp.user_id, '', 'search')
  adding.value = null
}

function isFriend(userId: string): boolean {
  return props.friendList.some(f => f.friend_id === userId)
}

function getReqName(req: FriendRequest): string {
  return (req.from_profile as SparkProfile)?.nickname || '未知用户'
}

function getFriendName(f: Friend): string {
  return f.nickname || (f.profile as SparkProfile)?.nickname || '好友'
}
</script>

<style scoped>
.fl-container{padding:0}
.fl-search{display:flex;gap:6px;margin-bottom:12px}
.fl-search-input{flex:1;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.fl-search-input:focus{border-color:rgba(139,92,246,.2)}
.fl-search-input::placeholder{color:rgba(255,255,255,.2)}
.fl-search-btn{padding:10px 14px;border-radius:12px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.fl-search-btn:disabled{opacity:.3}
.fl-qr-btn{padding:10px;border-radius:12px;border:none;background:rgba(34,197,94,.08);color:rgba(34,197,94,.6);font-size:18px;cursor:pointer}

.fl-results{margin-bottom:14px}
.fl-result-card{display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:rgba(34,197,94,.03);border:1px solid rgba(34,197,94,.08);margin-bottom:6px}
.fl-r-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(59,130,246,.2));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0}
.fl-r-info{flex:1;min-width:0}
.fl-r-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}
.fl-r-id{display:block;font-size:10px;color:rgba(139,92,246,.5);font-family:monospace}
.fl-r-school{display:block;font-size:10px;color:rgba(255,255,255,.2)}
.fl-add-btn{padding:6px 12px;border-radius:10px;border:none;background:rgba(34,197,94,.12);color:rgba(34,197,94,.7);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.fl-add-btn:disabled{opacity:.3}
.fl-no-result{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:12px}

.fl-section-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}
.fl-requests{margin-bottom:16px}
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

.fl-empty{text-align:center;font-size:12px;color:rgba(255,255,255,.15);padding:30px}
.fl-friend-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:5px;cursor:pointer;transition:all .2s}
.fl-friend-card:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.08)}
.fl-friend-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(59,130,246,.15));display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:700;flex-shrink:0}
.fl-friend-info{flex:1;min-width:0}
.fl-friend-name{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}
.fl-friend-id{display:block;font-size:10px;color:rgba(139,92,246,.4);font-family:monospace}
.fl-friend-del{background:none;border:none;color:rgba(255,255,255,.15);font-size:14px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .2s}
.fl-friend-del:hover{color:rgba(239,68,68,.6);background:rgba(239,68,68,.06)}
</style>
