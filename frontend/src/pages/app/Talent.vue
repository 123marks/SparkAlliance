<template>
  <!-- 星火人才 — 双向寻访平台 -->
  <div class="tal-page">
    <div class="tal-header">
      <h1 class="tal-title">🤝 星火人才</h1>
      <p class="tal-subtitle">从「单向投递」到「双向寻访」</p>
    </div>

    <!-- Tab -->
    <div class="tal-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tal-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        <span class="tal-tab-icon">{{ tab.icon }}</span>
        <span class="tal-tab-label">{{ tab.label }}</span>
        <span v-if="tab.key === 'inbox' && unreadCount > 0" class="tal-badge">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- ===== 广场 Tab ===== -->
    <div v-if="activeTab === 'plaza'" class="tal-content">
      <!-- 搜索 -->
      <div class="tal-search-bar">
        <input v-model="searchKeyword" class="tal-search-input" placeholder="搜索人才：技能、学校、姓名..."
          @keydown.enter="doSearchTalent" />
        <button class="tal-search-btn" @click="doSearchTalent">🔍</button>
      </div>

      <!-- 技能筛选 -->
      <div class="tal-filter-row">
        <button v-for="(cfg, key) in SKILL_CATEGORIES" :key="key" class="tal-filter-chip"
          :class="{ active: filterSkillCategory === key }"
          @click="filterSkillCategory = filterSkillCategory === key ? '' : key; doSearchTalent()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
      </div>

      <!-- 人才列表 -->
      <div v-if="loading" class="tal-loading"><div class="tal-spinner"></div></div>
      <div v-else-if="talentProfiles.length === 0" class="tal-empty">暂无公开名片</div>
      <div v-else class="tal-talent-list">
        <div v-for="p in talentProfiles" :key="p.id" class="tal-talent-card" @click="openProfileDetail(p)">
          <div class="tal-tc-top">
            <div class="tal-tc-avatar" :class="{ verified: p.is_verified }">
              {{ p.display_name?.[0] || '?' }}
            </div>
            <div class="tal-tc-info">
              <div class="tal-tc-name-row">
                <span class="tal-tc-name">{{ p.display_name }}</span>
                <span v-if="p.is_featured" class="tal-tc-featured">⭐</span>
                <span class="tal-tc-status" :style="{ color: JOB_STATUS_MAP[p.job_status]?.color }">
                  {{ JOB_STATUS_MAP[p.job_status]?.label }}
                </span>
              </div>
              <span v-if="p.headline" class="tal-tc-headline">{{ p.headline }}</span>
              <span class="tal-tc-edu">{{ p.university || '' }} {{ p.major || '' }}</span>
            </div>
          </div>
          <!-- 技能 -->
          <div v-if="p.skill_names?.length" class="tal-tc-skills">
            <span v-for="s in p.skill_names.slice(0, 5)" :key="s" class="tal-skill-tag">{{ s }}</span>
            <span v-if="(p.skill_names?.length || 0) > 5" class="tal-skill-more">+{{ (p.skill_names?.length || 0) - 5 }}</span>
          </div>
          <div class="tal-tc-stats">
            <span>👁 {{ p.view_count }}</span>
            <span>💌 {{ p.invite_count }}次邀约</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 机会 Tab ===== -->
    <div v-else-if="activeTab === 'jobs'" class="tal-content">
      <!-- 类型筛选 -->
      <div class="tal-type-row">
        <button class="tal-type-chip" :class="{ active: !filterOppType }"
          @click="filterOppType = ''; doSearchOpps()">全部</button>
        <button v-for="(cfg, key) in OPPORTUNITY_TYPES" :key="key" class="tal-type-chip"
          :class="{ active: filterOppType === key }"
          :style="{ '--chip-color': cfg.color }"
          @click="filterOppType = key as OpportunityType; doSearchOpps()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
      </div>

      <!-- 机会列表 -->
      <div v-if="loading" class="tal-loading"><div class="tal-spinner"></div></div>
      <div v-else-if="opportunities.length === 0" class="tal-empty">暂无机会</div>
      <div v-else class="tal-opp-list">
        <div v-for="opp in opportunities" :key="opp.id" class="tal-opp-card" @click="openOppDetail(opp)">
          <div class="tal-opp-top">
            <div class="tal-opp-org-icon" :style="{ background: OPPORTUNITY_TYPES[opp.opportunity_type]?.color + '15' }">
              {{ OPPORTUNITY_TYPES[opp.opportunity_type]?.icon || '💼' }}
            </div>
            <div class="tal-opp-info">
              <span class="tal-opp-title">{{ opp.title }}</span>
              <span class="tal-opp-org">{{ opp.org_name || '个人项目' }}<template v-if="opp.location"> · {{ opp.location }}</template></span>
            </div>
            <button class="tal-fav-btn" :class="{ on: opp.is_favorited }" @click.stop="handleFavOpp(opp.id)">
              {{ opp.is_favorited ? '❤️' : '🤍' }}
            </button>
          </div>
          <!-- 薪资+标签 -->
          <div class="tal-opp-tags">
            <span v-if="opp.salary_range" class="tal-opp-salary">💰 {{ opp.salary_range }}</span>
            <span class="tal-opp-mode">{{ opp.work_mode === 'remote' ? '🏠远程' : opp.work_mode === 'hybrid' ? '🔄混合' : '🏢线下' }}</span>
            <span v-for="name in (opp.required_skill_names || []).slice(0, 3)" :key="name" class="tal-skill-tag small">{{ name }}</span>
          </div>
          <div class="tal-opp-bottom">
            <span>📋 {{ opp.current_applicants }}人申请</span>
            <span>{{ formatTimeAgo(opp.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- 发布按钮 -->
      <button class="tal-publish-fab" @click="showPublishModal = true">➕ 发布机会</button>
    </div>

    <!-- ===== 我的名片 Tab ===== -->
    <div v-else-if="activeTab === 'profile'" class="tal-content">
      <!-- 未创建名片 -->
      <div v-if="!hasProfile" class="tal-no-profile">
        <div class="tal-np-icon">🪪</div>
        <h3>创建你的能力名片</h3>
        <p>展示技能与作品，让机会主动找到你</p>
        <button class="tal-action-btn primary" @click="showEditProfile = true">✨ 创建名片</button>
      </div>

      <!-- 已有名片 -->
      <div v-else class="tal-my-profile">
        <div class="tal-mp-card">
          <div class="tal-mp-header">
            <div class="tal-mp-avatar" :class="{ verified: myProfile?.is_verified }">
              {{ myProfile?.display_name?.[0] || '?' }}
            </div>
            <div class="tal-mp-info">
              <span class="tal-mp-name">{{ myProfile?.display_name }}</span>
              <span v-if="myProfile?.headline" class="tal-mp-headline">{{ myProfile?.headline }}</span>
              <span class="tal-mp-status" :style="{ color: JOB_STATUS_MAP[myProfile?.job_status || 'open']?.color }">
                {{ JOB_STATUS_MAP[myProfile?.job_status || 'open']?.label }}
              </span>
            </div>
            <button class="tal-edit-btn" @click="showEditProfile = true">✏️</button>
          </div>

          <!-- 学校 -->
          <div v-if="myProfile?.university || myProfile?.major" class="tal-mp-edu">
            🎓 {{ myProfile?.university }} · {{ myProfile?.major }}
            <template v-if="myProfile?.graduation_year"> · {{ myProfile?.graduation_year }}届</template>
          </div>

          <!-- 简介 -->
          <p v-if="myProfile?.bio" class="tal-mp-bio">{{ myProfile?.bio }}</p>

          <!-- 技能 -->
          <div v-if="myProfile?.skill_names?.length" class="tal-mp-skills">
            <h4>💡 技能</h4>
            <div class="tal-skill-list">
              <span v-for="s in myProfile?.skill_names" :key="s" class="tal-skill-tag">{{ s }}</span>
            </div>
          </div>

          <!-- 期望 -->
          <div v-if="myProfile?.preferred_roles?.length" class="tal-mp-prefs">
            <h4>🎯 期望方向</h4>
            <div class="tal-pref-list">
              <span v-for="r in myProfile?.preferred_roles" :key="r" class="tal-pref-tag">{{ r }}</span>
            </div>
          </div>

          <!-- 联系方式 -->
          <div class="tal-mp-contact">
            <span v-if="myProfile?.github_url">🔗 GitHub</span>
            <span v-if="myProfile?.personal_site">🌐 个人网站</span>
            <span v-if="myProfile?.contact_email">📧 邮箱</span>
          </div>

          <!-- 统计 -->
          <div class="tal-mp-stats">
            <div class="tal-mp-stat"><span class="val">{{ myProfile?.view_count || 0 }}</span><span class="lab">被浏览</span></div>
            <div class="tal-mp-stat"><span class="val">{{ myProfile?.invite_count || 0 }}</span><span class="lab">收到邀约</span></div>
            <div class="tal-mp-stat"><span class="val">{{ myApplications.length }}</span><span class="lab">我的申请</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 消息 Tab ===== -->
    <div v-else-if="activeTab === 'inbox'" class="tal-content">
      <h3 class="tal-section-title">📨 我的申请</h3>
      <div v-if="myApplications.length === 0" class="tal-empty mini">暂无申请记录</div>
      <div v-for="app in myApplications" :key="app.id" class="tal-app-card">
        <div class="tal-app-top">
          <span class="tal-app-dir">📤</span>
          <div class="tal-app-info">
            <span class="tal-app-title">{{ app.opportunity_title || '未知职位' }}</span>
            <span class="tal-app-org">{{ app.org_name || '' }}</span>
          </div>
          <span class="tal-app-status" :class="app.status">{{ statusLabel(app.status) }}</span>
        </div>
        <div v-if="app.response_note" class="tal-app-note">回复：{{ app.response_note }}</div>
        <span class="tal-app-time">{{ formatTimeAgo(app.applied_at) }}</span>
      </div>

      <h3 class="tal-section-title" style="margin-top:20px">📥 收到的申请</h3>
      <div v-if="receivedApplications.length === 0" class="tal-empty mini">暂无收到的申请</div>
      <div v-for="app in receivedApplications" :key="app.id" class="tal-app-card">
        <div class="tal-app-top">
          <span class="tal-app-dir">📥</span>
          <div class="tal-app-info">
            <span class="tal-app-title">{{ app.applicant_name }} 申请了 {{ app.opportunity_title }}</span>
          </div>
          <span class="tal-app-status" :class="app.status">{{ statusLabel(app.status) }}</span>
        </div>
        <p v-if="app.cover_letter" class="tal-app-letter">{{ app.cover_letter }}</p>
        <div v-if="app.status === 'pending'" class="tal-app-actions">
          <button class="tal-btn accept" @click="handleRespond(app.id, 'accepted')">✅ 通过</button>
          <button class="tal-btn reject" @click="handleRespond(app.id, 'rejected')">❌ 拒绝</button>
        </div>
        <span class="tal-app-time">{{ formatTimeAgo(app.applied_at) }}</span>
      </div>
    </div>

    <!-- ===== 名片详情弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showProfileDetail && selectedProfile" class="tal-modal-overlay" @click.self="showProfileDetail = false">
        <div class="tal-modal profile-detail-modal">
          <div class="tal-pd-header">
            <div class="tal-pd-avatar" :class="{ verified: selectedProfile.is_verified }">
              {{ selectedProfile.display_name?.[0] || '?' }}
            </div>
            <div class="tal-pd-info">
              <h3>{{ selectedProfile.display_name }}</h3>
              <span v-if="selectedProfile.headline" class="tal-pd-headline">{{ selectedProfile.headline }}</span>
              <span class="tal-pd-edu">{{ selectedProfile.university }} · {{ selectedProfile.major }}</span>
            </div>
            <button class="tal-modal-close" @click="showProfileDetail = false">✕</button>
          </div>
          <p v-if="selectedProfile.bio" class="tal-pd-bio">{{ selectedProfile.bio }}</p>
          <div v-if="selectedProfile.skill_names?.length" class="tal-pd-skills">
            <span v-for="s in selectedProfile.skill_names" :key="s" class="tal-skill-tag">{{ s }}</span>
          </div>
          <div class="tal-pd-stats">
            <span>👁 {{ selectedProfile.view_count }} 浏览</span>
            <span>💌 {{ selectedProfile.invite_count }} 邀约</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 机会详情+申请弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showOppDetail && selectedOpp" class="tal-modal-overlay" @click.self="showOppDetail = false">
        <div class="tal-modal opp-detail-modal">
          <div class="tal-od-header">
            <span class="tal-od-type-icon">{{ OPPORTUNITY_TYPES[selectedOpp.opportunity_type]?.icon }}</span>
            <div class="tal-od-info">
              <h3>{{ selectedOpp.title }}</h3>
              <span>{{ selectedOpp.org_name || '个人项目' }}<template v-if="selectedOpp.location"> · {{ selectedOpp.location }}</template></span>
            </div>
            <button class="tal-modal-close" @click="showOppDetail = false">✕</button>
          </div>
          <p v-if="selectedOpp.description" class="tal-od-desc">{{ selectedOpp.description }}</p>
          <div class="tal-od-meta">
            <span v-if="selectedOpp.salary_range">💰 {{ selectedOpp.salary_range }}</span>
            <span>📋 {{ selectedOpp.current_applicants }} 人申请</span>
            <span v-if="selectedOpp.apply_deadline">⏰ 截止 {{ selectedOpp.apply_deadline?.slice(0, 10) }}</span>
          </div>
          <div v-if="selectedOpp.required_skill_names?.length" class="tal-od-skills">
            <h4>所需技能</h4>
            <div class="tal-skill-list">
              <span v-for="s in selectedOpp.required_skill_names" :key="s" class="tal-skill-tag">{{ s }}</span>
            </div>
          </div>
          <!-- 申请区 -->
          <div class="tal-od-apply">
            <textarea v-model="applyLetter" class="tal-textarea" rows="3" placeholder="写一句话介绍自己（可选）"></textarea>
            <button class="tal-btn primary full" @click="handleApply">🚀 立即申请</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 发布机会弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showPublishModal" class="tal-modal-overlay" @click.self="showPublishModal = false">
        <div class="tal-modal publish-modal">
          <h3 class="tal-modal-title">➕ 发布机会</h3>
          <div class="tal-form-group">
            <label>标题 *</label>
            <input v-model="publishForm.title" class="tal-input" placeholder="如：前端实习生 / 创业项目找技术合伙人" />
          </div>
          <div class="tal-form-group">
            <label>详细描述</label>
            <textarea v-model="publishForm.description" class="tal-textarea" rows="4" placeholder="岗位职责、要求、福利等"></textarea>
          </div>
          <div class="tal-form-row">
            <div class="tal-form-group half">
              <label>类型</label>
              <select v-model="publishForm.opportunity_type" class="tal-select">
                <option v-for="(cfg, key) in OPPORTUNITY_TYPES" :key="key" :value="key">{{ cfg.icon }} {{ cfg.label }}</option>
              </select>
            </div>
            <div class="tal-form-group half">
              <label>工作方式</label>
              <select v-model="publishForm.work_mode" class="tal-select">
                <option value="onsite">🏢 线下</option>
                <option value="remote">🏠 远程</option>
                <option value="hybrid">🔄 混合</option>
              </select>
            </div>
          </div>
          <div class="tal-form-row">
            <div class="tal-form-group half">
              <label>组织名称</label>
              <input v-model="publishForm.org_name" class="tal-input" placeholder="公司/团队名" />
            </div>
            <div class="tal-form-group half">
              <label>地点</label>
              <input v-model="publishForm.location" class="tal-input" placeholder="如：北京/远程" />
            </div>
          </div>
          <div class="tal-form-group">
            <label>薪资范围</label>
            <input v-model="publishForm.salary_range" class="tal-input" placeholder="如：8k-15k / 150元/天 / 面议" />
          </div>
          <div class="tal-modal-actions">
            <button class="tal-btn cancel" @click="showPublishModal = false">取消</button>
            <button class="tal-btn primary" :disabled="!publishForm.title?.trim()" @click="handlePublish">🚀 发布</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 编辑名片弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showEditProfile" class="tal-modal-overlay" @click.self="showEditProfile = false">
        <div class="tal-modal edit-profile-modal">
          <h3 class="tal-modal-title">🪪 {{ hasProfile ? '编辑' : '创建' }}能力名片</h3>
          <div class="tal-form-group">
            <label>展示名称 *</label>
            <input v-model="profileForm.display_name" class="tal-input" placeholder="你想被称呼的名字" />
          </div>
          <div class="tal-form-group">
            <label>一句话定位</label>
            <input v-model="profileForm.headline" class="tal-input" placeholder="如：全栈开发者 · 在创业中" />
          </div>
          <div class="tal-form-group">
            <label>自我介绍</label>
            <textarea v-model="profileForm.bio" class="tal-textarea" rows="3" placeholder="简短介绍你自己"></textarea>
          </div>
          <div class="tal-form-row">
            <div class="tal-form-group half">
              <label>学校</label>
              <input v-model="profileForm.university" class="tal-input" placeholder="如：北京大学" />
            </div>
            <div class="tal-form-group half">
              <label>专业</label>
              <input v-model="profileForm.major" class="tal-input" placeholder="如：计算机科学" />
            </div>
          </div>
          <div class="tal-form-row">
            <div class="tal-form-group half">
              <label>求职状态</label>
              <select v-model="profileForm.job_status" class="tal-select">
                <option v-for="(cfg, key) in JOB_STATUS_MAP" :key="key" :value="key">{{ cfg.label }}</option>
              </select>
            </div>
            <div class="tal-form-group half">
              <label>可见性</label>
              <select v-model="profileForm.visibility" class="tal-select">
                <option value="public">🌐 公开</option>
                <option value="recruiters_only">👔 仅企业</option>
                <option value="private">🔒 私密</option>
              </select>
            </div>
          </div>
          <!-- 技能选择 -->
          <div class="tal-form-group">
            <label>选择技能</label>
            <div class="tal-skill-picker">
              <button v-for="skill in allSkills.slice(0, 20)" :key="skill.id" class="tal-skill-opt"
                :class="{ active: profileForm.skill_ids.includes(skill.id) }"
                @click="toggleProfileSkill(skill.id)">{{ skill.name }}</button>
            </div>
          </div>
          <div class="tal-form-group">
            <label>GitHub</label>
            <input v-model="profileForm.github_url" class="tal-input" placeholder="https://github.com/..." />
          </div>
          <div class="tal-form-group">
            <label>联系邮箱</label>
            <input v-model="profileForm.contact_email" class="tal-input" placeholder="your@email.com" />
          </div>
          <div class="tal-modal-actions">
            <button class="tal-btn cancel" @click="showEditProfile = false">取消</button>
            <button class="tal-btn primary" :disabled="!profileForm.display_name?.trim()" @click="handleSaveProfile">
              💾 保存名片
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toastMsg" class="tal-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useTalent,
  SKILL_CATEGORIES,
  OPPORTUNITY_TYPES,
  JOB_STATUS_MAP,
  type OpportunityType,
  type JobStatus,
  type TalentProfile,
  type TalentOpportunity,
} from '../../composables/useTalent'

const {
  allSkills,
  myProfile,
  talentProfiles,
  opportunities,
  myApplications,
  receivedApplications,
  loading,
  hasProfile,
  fetchSkills,
  fetchMyProfile,
  saveProfile,
  fetchTalentList,
  viewProfile,
  createOpportunity,
  searchOpportunities,
  toggleOpportunityFavorite,
  applyToOpportunity,
  fetchMyApplications,
  fetchReceivedApplications,
  respondToApplication,
  formatTimeAgo,
} = useTalent()

// ====== Tab ======
const activeTab = ref<'plaza' | 'jobs' | 'profile' | 'inbox'>('plaza')
const tabs = [
  { key: 'plaza' as const, icon: '🌍', label: '广场' },
  { key: 'jobs' as const, icon: '💼', label: '机会' },
  { key: 'profile' as const, icon: '🪪', label: '名片' },
  { key: 'inbox' as const, icon: '📨', label: '消息' },
]

// ====== 搜索 ======
const searchKeyword = ref('')
const filterSkillCategory = ref('')
const filterOppType = ref<OpportunityType | ''>('')

// ====== 弹窗 ======
const showProfileDetail = ref(false)
const showOppDetail = ref(false)
const showPublishModal = ref(false)
const showEditProfile = ref(false)
const selectedProfile = ref<TalentProfile | null>(null)
const selectedOpp = ref<TalentOpportunity | null>(null)
const applyLetter = ref('')
const toastMsg = ref('')

// 发布表单
const publishForm = ref({
  title: '',
  description: '',
  opportunity_type: 'internship' as OpportunityType,
  org_name: '',
  location: '',
  work_mode: 'onsite',
  salary_range: '',
})

// 名片编辑表单
const profileForm = ref({
  display_name: '',
  headline: '',
  bio: '',
  university: '',
  major: '',
  job_status: 'open' as JobStatus,
  visibility: 'public',
  skill_ids: [] as string[],
  github_url: '',
  contact_email: '',
})

// 未读
const unreadCount = computed(() => {
  return receivedApplications.value.filter(a => a.status === 'pending').length
})

// ====== Tab ======
function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'plaza') doSearchTalent()
  if (key === 'jobs') doSearchOpps()
  if (key === 'profile') { fetchMyProfile(); fetchMyApplications() }
  if (key === 'inbox') { fetchMyApplications(); fetchReceivedApplications() }
}

// ====== 搜索 ======
async function doSearchTalent() {
  const skillFilter = filterSkillCategory.value
    ? allSkills.value.filter(s => s.category === filterSkillCategory.value).map(s => s.id)
    : undefined
  await fetchTalentList({
    keyword: searchKeyword.value || undefined,
    skillIds: skillFilter?.length ? skillFilter : undefined,
  })
}

async function doSearchOpps() {
  await searchOpportunities({
    type: filterOppType.value || undefined,
  })
}

// ====== 详情 ======
async function openProfileDetail(p: TalentProfile) {
  selectedProfile.value = await viewProfile(p.id) || p
  showProfileDetail.value = true
}

function openOppDetail(opp: TalentOpportunity) {
  selectedOpp.value = opp
  applyLetter.value = ''
  showOppDetail.value = true
}

// ====== 收藏 ======
async function handleFavOpp(oppId: string) {
  const r = await toggleOpportunityFavorite(oppId)
  showToast(r ? '已收藏 ❤️' : '已取消收藏')
}

// ====== 申请 ======
async function handleApply() {
  if (!selectedOpp.value) return
  const ok = await applyToOpportunity(selectedOpp.value.id, applyLetter.value)
  if (ok) {
    showOppDetail.value = false
    showToast('申请已发送 🚀')
  } else {
    showToast('申请失败（可能已申请过）')
  }
}

// ====== 回复 ======
async function handleRespond(appId: string, status: 'accepted' | 'rejected') {
  const ok = await respondToApplication(appId, status)
  if (ok) {
    showToast(status === 'accepted' ? '已通过 ✅' : '已拒绝')
    await fetchReceivedApplications()
  }
}

// ====== 发布 ======
async function handlePublish() {
  const f = publishForm.value
  if (!f.title.trim()) return
  const id = await createOpportunity({
    title: f.title,
    description: f.description || null,
    opportunity_type: f.opportunity_type,
    org_name: f.org_name || null,
    location: f.location || null,
    work_mode: f.work_mode,
    salary_range: f.salary_range || null,
  } as Partial<TalentOpportunity>)
  if (id) {
    showPublishModal.value = false
    showToast('机会已发布 🎉')
    publishForm.value = { title: '', description: '', opportunity_type: 'internship', org_name: '', location: '', work_mode: 'onsite', salary_range: '' }
    await doSearchOpps()
  }
}

// ====== 名片 ======
function toggleProfileSkill(id: string) {
  const idx = profileForm.value.skill_ids.indexOf(id)
  if (idx >= 0) profileForm.value.skill_ids.splice(idx, 1)
  else profileForm.value.skill_ids.push(id)
}

async function handleSaveProfile() {
  const f = profileForm.value
  if (!f.display_name.trim()) return
  const ok = await saveProfile({
    display_name: f.display_name,
    headline: f.headline || null,
    bio: f.bio || null,
    university: f.university || null,
    major: f.major || null,
    job_status: f.job_status,
    visibility: f.visibility,
    skill_ids: f.skill_ids,
    github_url: f.github_url || null,
    contact_email: f.contact_email || null,
  } as Partial<TalentProfile>)
  if (ok) {
    showEditProfile.value = false
    showToast('名片已保存 ✅')
  }
}

// ====== 工具 ======
function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { pending: '待处理', reviewing: '审核中', accepted: '已通过', rejected: '已拒绝', withdrawn: '已撤回' }
  return map[s] || s
}

// ====== 生命周期 ======
onMounted(async () => {
  await fetchSkills()
  await fetchMyProfile()
  // 初始化名片编辑表单
  if (myProfile.value) {
    const p = myProfile.value
    profileForm.value = {
      display_name: p.display_name,
      headline: p.headline || '',
      bio: p.bio || '',
      university: p.university || '',
      major: p.major || '',
      job_status: p.job_status,
      visibility: p.visibility,
      skill_ids: [...(p.skill_ids || [])],
      github_url: p.github_url || '',
      contact_email: p.contact_email || '',
    }
  }
  await doSearchTalent()
  await doSearchOpps()
})
</script>

<style scoped>
/* 页面 */
.tal-page{max-width:600px;margin:0 auto;padding:20px 16px 80px;min-height:100vh}
.tal-header{text-align:center;margin-bottom:16px}
.tal-title{font-size:22px;font-weight:800;color:white;margin:0}
.tal-subtitle{font-size:12px;color:rgba(255,255,255,.3);margin:4px 0 0}

/* Tab */
.tal-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.02);border-radius:14px;border:1px solid rgba(255,255,255,.05);margin-bottom:16px}
.tal-tab{flex:1;padding:10px 4px;border-radius:10px;border:none;background:none;cursor:pointer;text-align:center;transition:all .2s;position:relative}
.tal-tab.active{background:rgba(79,142,247,.1);box-shadow:0 2px 8px rgba(79,142,247,.15)}
.tal-tab-icon{display:block;font-size:16px;margin-bottom:2px}
.tal-tab-label{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:500}
.tal-tab.active .tal-tab-label{color:rgba(79,142,247,.8)}
.tal-badge{position:absolute;top:4px;right:10px;background:#ef4444;color:white;font-size:8px;font-weight:700;padding:1px 5px;border-radius:8px;min-width:14px;text-align:center}

/* 通用 */
.tal-content{animation:talFadeIn .2s ease}
@keyframes talFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.tal-empty{text-align:center;padding:40px 0;font-size:13px;color:rgba(255,255,255,.2)}
.tal-empty.mini{padding:16px 0;font-size:12px}
.tal-loading{text-align:center;padding:40px 0}
.tal-spinner{width:28px;height:28px;border:2px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.tal-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.5);margin:0 0 10px}

/* 搜索 */
.tal-search-bar{display:flex;gap:6px;margin-bottom:10px}
.tal-search-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none}
.tal-search-input::placeholder{color:rgba(255,255,255,.15)}
.tal-search-btn{padding:12px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white;font-size:14px;cursor:pointer}

/* 筛选 */
.tal-filter-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
.tal-filter-chip{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.tal-filter-chip.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}

/* 人才卡片 */
.tal-talent-list{display:flex;flex-direction:column;gap:8px}
.tal-talent-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.tal-talent-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:translateY(-1px)}
.tal-tc-top{display:flex;align-items:flex-start;gap:10px}
.tal-tc-avatar{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,rgba(79,142,247,.25),rgba(139,92,246,.2));display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:white;flex-shrink:0}
.tal-tc-avatar.verified{box-shadow:0 0 0 2px rgba(16,185,129,.5)}
.tal-tc-info{flex:1;min-width:0}
.tal-tc-name-row{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.tal-tc-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.7)}
.tal-tc-featured{font-size:12px}
.tal-tc-status{font-size:9px;margin-left:auto}
.tal-tc-headline{display:block;font-size:11px;color:rgba(255,255,255,.35);margin-top:2px}
.tal-tc-edu{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-top:1px}
.tal-tc-skills{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
.tal-skill-tag{padding:2px 7px;border-radius:5px;background:rgba(79,142,247,.06);color:rgba(79,142,247,.5);font-size:10px}
.tal-skill-tag.small{font-size:9px;padding:1px 5px}
.tal-skill-more{font-size:9px;color:rgba(255,255,255,.2)}
.tal-tc-stats{display:flex;gap:12px;margin-top:6px;font-size:10px;color:rgba(255,255,255,.2)}

/* 机会卡片 */
.tal-type-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
.tal-type-chip{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.tal-type-chip.active{background:color-mix(in srgb, var(--chip-color, #4f8ef7) 8%, transparent);border-color:color-mix(in srgb, var(--chip-color, #4f8ef7) 15%, transparent);color:var(--chip-color, #4f8ef7)}
.tal-opp-list{display:flex;flex-direction:column;gap:8px}
.tal-opp-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.tal-opp-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:translateY(-1px)}
.tal-opp-top{display:flex;align-items:flex-start;gap:10px}
.tal-opp-org-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.tal-opp-info{flex:1;min-width:0}
.tal-opp-title{display:block;font-size:14px;font-weight:600;color:rgba(255,255,255,.7)}
.tal-opp-org{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}
.tal-fav-btn{background:none;border:none;font-size:16px;cursor:pointer;flex-shrink:0}
.tal-opp-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;align-items:center}
.tal-opp-salary{font-size:11px;font-weight:600;color:rgba(249,115,22,.7);padding:2px 6px;border-radius:4px;background:rgba(249,115,22,.06)}
.tal-opp-mode{font-size:10px;color:rgba(255,255,255,.3)}
.tal-opp-bottom{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:rgba(255,255,255,.2)}
.tal-publish-fab{position:fixed;bottom:80px;right:max(calc(50% - 284px),20px);padding:12px 20px;border-radius:14px;border:none;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(79,142,247,.3);z-index:50}

/* 我的名片 */
.tal-no-profile{text-align:center;padding:60px 20px}
.tal-np-icon{font-size:48px;margin-bottom:12px}
.tal-no-profile h3{font-size:18px;color:white;margin:0 0 6px}
.tal-no-profile p{font-size:12px;color:rgba(255,255,255,.3);margin:0 0 20px}
.tal-action-btn{padding:14px 24px;border-radius:14px;border:none;font-size:14px;font-weight:600;cursor:pointer}
.tal-action-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.tal-mp-card{padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(79,142,247,.06),rgba(139,92,246,.04));border:1px solid rgba(79,142,247,.1)}
.tal-mp-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.tal-mp-avatar{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,rgba(79,142,247,.3),rgba(99,102,241,.2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white;flex-shrink:0}
.tal-mp-avatar.verified{box-shadow:0 0 0 2px rgba(16,185,129,.5)}
.tal-mp-info{flex:1}
.tal-mp-name{display:block;font-size:18px;font-weight:700;color:white}
.tal-mp-headline{display:block;font-size:12px;color:rgba(255,255,255,.35);margin-top:2px}
.tal-mp-status{display:block;font-size:10px;margin-top:3px}
.tal-edit-btn{background:none;border:none;font-size:16px;cursor:pointer}
.tal-mp-edu{font-size:12px;color:rgba(255,255,255,.3);margin-bottom:10px}
.tal-mp-bio{font-size:12px;color:rgba(255,255,255,.3);line-height:1.5;margin:0 0 10px}
.tal-mp-skills h4,.tal-mp-prefs h4{font-size:11px;color:rgba(255,255,255,.25);margin:0 0 6px}
.tal-skill-list,.tal-pref-list{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.tal-pref-tag{padding:2px 7px;border-radius:5px;background:rgba(16,185,129,.06);color:rgba(16,185,129,.5);font-size:10px}
.tal-mp-contact{display:flex;gap:8px;margin-bottom:12px;font-size:11px;color:rgba(79,142,247,.5)}
.tal-mp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tal-mp-stat{text-align:center;padding:10px;border-radius:10px;background:rgba(255,255,255,.03)}
.tal-mp-stat .val{display:block;font-size:18px;font-weight:800;color:rgba(79,142,247,.7)}
.tal-mp-stat .lab{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}

/* 消息/申请 */
.tal-app-card{padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:6px}
.tal-app-top{display:flex;align-items:flex-start;gap:8px}
.tal-app-dir{font-size:16px;flex-shrink:0}
.tal-app-info{flex:1}
.tal-app-title{display:block;font-size:13px;font-weight:500;color:rgba(255,255,255,.6)}
.tal-app-org{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-top:1px}
.tal-app-status{font-size:10px;font-weight:500;padding:2px 8px;border-radius:6px;flex-shrink:0}
.tal-app-status.pending{background:rgba(249,115,22,.06);color:rgba(249,115,22,.6)}
.tal-app-status.accepted{background:rgba(16,185,129,.06);color:rgba(16,185,129,.6)}
.tal-app-status.rejected{background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}
.tal-app-note{font-size:11px;color:rgba(255,255,255,.25);margin-top:6px}
.tal-app-letter{font-size:11px;color:rgba(255,255,255,.3);margin:6px 0;line-height:1.4}
.tal-app-actions{display:flex;gap:6px;margin-top:8px}
.tal-btn{padding:8px 14px;border-radius:8px;border:none;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
.tal-btn.accept{background:rgba(16,185,129,.08);color:rgba(16,185,129,.7)}
.tal-btn.reject{background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}
.tal-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.tal-btn.primary.full{width:100%}
.tal-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.tal-btn:disabled{opacity:.3;cursor:default}
.tal-app-time{font-size:9px;color:rgba(255,255,255,.15);display:block;margin-top:4px}

/* 弹窗 */
.tal-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px);overflow-y:auto;padding:20px}
.tal-modal{background:rgba(22,18,50,.97);border:1px solid rgba(79,142,247,.12);border-radius:20px;padding:24px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto}
.tal-modal-title{font-size:16px;font-weight:700;color:rgba(255,255,255,.7);margin:0 0 16px}
.tal-modal-close{background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px}
.tal-modal-actions{display:flex;gap:8px;margin-top:16px}

/* 名片详情弹窗 */
.tal-pd-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.tal-pd-avatar{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,rgba(79,142,247,.3),rgba(99,102,241,.2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white;flex-shrink:0}
.tal-pd-avatar.verified{box-shadow:0 0 0 2px rgba(16,185,129,.5)}
.tal-pd-info{flex:1}
.tal-pd-info h3{font-size:16px;font-weight:700;color:white;margin:0}
.tal-pd-headline{display:block;font-size:12px;color:rgba(255,255,255,.35);margin-top:2px}
.tal-pd-edu{display:block;font-size:11px;color:rgba(255,255,255,.2);margin-top:2px}
.tal-pd-bio{font-size:12px;color:rgba(255,255,255,.3);line-height:1.5;margin:0 0 10px}
.tal-pd-skills{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.tal-pd-stats{display:flex;gap:12px;font-size:10px;color:rgba(255,255,255,.2)}

/* 机会详情弹窗 */
.tal-od-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.tal-od-type-icon{font-size:28px;flex-shrink:0}
.tal-od-info{flex:1}
.tal-od-info h3{font-size:16px;font-weight:700;color:white;margin:0}
.tal-od-info span{font-size:11px;color:rgba(255,255,255,.25)}
.tal-od-desc{font-size:12px;color:rgba(255,255,255,.3);line-height:1.5;margin:0 0 12px}
.tal-od-meta{display:flex;gap:10px;font-size:11px;color:rgba(255,255,255,.25);margin-bottom:12px;flex-wrap:wrap}
.tal-od-skills h4{font-size:11px;color:rgba(255,255,255,.25);margin:0 0 6px}
.tal-od-apply{margin-top:16px;border-top:1px solid rgba(255,255,255,.04);padding-top:14px}

/* 表单 */
.tal-form-group{margin-bottom:12px}
.tal-form-group label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,.3);margin-bottom:4px}
.tal-form-group.half{flex:1}
.tal-form-row{display:flex;gap:10px}
.tal-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.tal-input::placeholder{color:rgba(255,255,255,.15)}
.tal-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit}
.tal-textarea::placeholder{color:rgba(255,255,255,.15)}
.tal-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;appearance:none}
.tal-select option{background:#1a1530;color:white}
.tal-skill-picker{display:flex;flex-wrap:wrap;gap:4px}
.tal-skill-opt{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;transition:all .2s}
.tal-skill-opt.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}

/* Toast */
.tal-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(79,142,247,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:600;box-shadow:0 4px 20px rgba(79,142,247,.3);animation:talFadeIn .2s ease}
</style>
