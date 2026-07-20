<template>
  <div class="app-layout" :class="{ 'shell-collapsed': sidebarCollapsed }">
    <!-- 宇宙深空背景 — 受外观设置粒子开关控制 -->
    <CosmicBackground :enabled="particleEnabled" :intensity="bgIntensity" />

    <!-- TopBar — 精简工具栏，仅覆盖主内容区 -->
    <header class="topbar">
      <div class="topbar-left">
        <button
          ref="navToggleRef"
          class="sidebar-toggle"
          type="button"
          aria-label="切换导航"
          aria-controls="app-sidebar"
          :aria-expanded="mobileNavOpen || !sidebarCollapsed"
          @click="handleNavToggle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <router-link to="/" class="logo-link topbar-logo">
          <img src="/spark-logo.png" alt="Spark" class="logo-img" />
          <span class="logo-text">SparkAlliance</span>
        </router-link>
      </div>

      <!-- 全站搜索 -->
      <div class="topbar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索功能、内容或任务..."
          class="search-input"
          @keydown.enter="handleSearch"
        />
        <kbd class="search-kbd">⌘ K</kbd>
      </div>

      <div class="topbar-right">
        <!-- 通知铃铛 -->
        <div class="notif-wrap" ref="notifRef">
          <button class="topbar-icon-btn" @click.stop="toggleNotifPanel" title="通知">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span v-if="unreadCount > 0" class="notif-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>
          <!-- 通知面板 -->
          <Transition name="dd">
            <div v-if="showNotifPanel" class="notif-panel">
              <div class="notif-panel-header">
                <strong>通知中心</strong>
                <button class="notif-clear-btn" @click="clearNotifications" title="全部已读">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
              <div class="notif-list">
                <div v-if="notifications.length === 0" class="notif-empty">
                  <span class="notif-empty-icon">🔔</span>
                  <span>暂无新通知</span>
                </div>
                <div v-for="(n, i) in notifications" :key="i" class="notif-item" :class="{ unread: !n.read }" @click="handleNotifClick(n)">
                  <span class="notif-icon">{{ n.icon }}</span>
                  <div class="notif-body">
                    <span class="notif-title">{{ n.title }}</span>
                    <span class="notif-time">{{ n.time }}</span>
                  </div>
                </div>
              </div>
              <router-link to="/app/settings/notifications" class="notif-footer" @click="showNotifPanel = false">
                管理通知设置 →
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- 消息 -->
        <router-link to="/app/companion" class="topbar-icon-btn" title="消息">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </router-link>

        <!-- 校区选择器 -->
        <div class="campus-selector">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          <select v-model="selectedCampus" class="campus-select">
            <option value="default">星火大学（默认校区）</option>
            <option value="east">星火大学（东校区）</option>
            <option value="south">星火大学（南校区）</option>
          </select>
        </div>

        <!-- 用户头像 — click-outside 关闭 -->
        <div class="user-dropdown" ref="dropdownRef">
          <div class="u-avatar-wrap" @click.stop="showDropdown = !showDropdown">
            <SparkAvatar :avatar-url="userAvatarUrl" :name="userName" size="sm" />
            <span class="user-level-badge">Lv.12</span>
          </div>
          <Transition name="dd">
            <div class="dd-menu" v-if="showDropdown" @click.stop>
              <div class="dd-header">
                <strong>{{ userName }}</strong>
                <span>{{ userEmail }}</span>
              </div>
              <div class="dd-divider"></div>
              <router-link to="/app/profile" class="dd-item" @click="showDropdown = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                我的主页
              </router-link>
              <router-link to="/app/settings/appearance" class="dd-item" @click="showDropdown = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                外观设置
              </router-link>
              <router-link to="/app/settings" class="dd-item" @click="showDropdown = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                账号设置
              </router-link>
              <div class="dd-divider"></div>
              <div class="dd-item dd-logout" @click="handleLogout">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                退出登录
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- 移动端抽屉遮罩 -->
    <Transition name="backdrop">
      <div v-if="mobileNavOpen" class="mobile-nav-backdrop" aria-hidden="true" @click="closeMobileNav"></div>
    </Transition>

    <!-- 侧边栏 — 唯一导航源，可折叠；移动端为抽屉 -->
    <aside
      id="app-sidebar"
      ref="sidebarRef"
      class="sidebar"
      :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileNavOpen }"
      @click="handleSidebarNavClick"
    >
      <router-link to="/" class="logo-link sidebar-logo">
        <img src="/spark-logo.png" alt="Spark" class="logo-img" />
        <span class="logo-text">SparkAlliance</span>
      </router-link>

      <nav class="sidebar-nav">
        <!-- 核心功能（4项） -->
        <div class="nav-group">
          <span class="nav-group-label" v-show="!sidebarCollapsed || mobileNavOpen">核心功能</span>
          <router-link to="/app/home" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span class="nav-label">主控台</span>
            <span class="nav-tooltip">主控台</span>
          </router-link>
          <router-link to="/app/chat" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 3.7 2.3 6.9 5.5 8.2L7 22l3.5-1.5A9 9 0 1 0 12 2z"></path></svg>
            <span class="nav-label">星火助手</span>
            <span class="nav-tooltip">AI 智能对话</span>
          </router-link>
          <router-link to="/app/companion" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span class="nav-label">星火伴侣</span>
            <span class="nav-tooltip">好友 · 动态 · 广场</span>
          </router-link>
          <router-link to="/app/schedule" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span class="nav-label">智能日程</span>
            <span class="nav-tooltip">日历 · 规划 · 灵感</span>
          </router-link>
        </div>

        <!-- 校园生活（3项） -->
        <div class="nav-group">
          <span class="nav-group-label" v-show="!sidebarCollapsed || mobileNavOpen">校园生活</span>
          <router-link to="/app/wall" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="nav-label">星火墙</span>
            <span class="nav-tooltip">校园动态墙</span>
          </router-link>
          <router-link to="/app/shop" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span class="nav-label">星火购物</span>
            <span class="nav-tooltip">校园二手交易</span>
          </router-link>
          <router-link to="/app/health" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="nav-label">健康生活</span>
            <span class="nav-tooltip">运动健康追踪</span>
          </router-link>
        </div>

        <!-- 学习成长（5项） -->
        <div class="nav-group">
          <span class="nav-group-label" v-show="!sidebarCollapsed || mobileNavOpen">学习成长</span>
          <router-link to="/app/learn" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            <span class="nav-label">学习中心</span>
            <span class="nav-tooltip">自习室 · 学习资源</span>
          </router-link>
          <router-link to="/app/legacy" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span class="nav-label">星火传承</span>
            <span class="nav-tooltip">经验分享 · 寄语留言</span>
          </router-link>
          <router-link to="/app/talent" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a4 4 0 0 0-8 0v2"></path></svg>
            <span class="nav-label">星火人才</span>
            <span class="nav-tooltip">人才市场</span>
          </router-link>
          <router-link to="/app/news" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 10h2"></path><rect x="17" y="4" width="4" height="16" rx="1"></rect></svg>
            <span class="nav-label">星火资讯</span>
            <span class="nav-tooltip">校园资讯</span>
          </router-link>
          <router-link to="/app/cocreate" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            <span class="nav-label">星火共创</span>
            <span class="nav-tooltip">共创平台 · 开发者社区</span>
          </router-link>
        </div>
      </nav>

      <!-- 侧边栏底部工具区 — 可折叠 -->
      <div class="sidebar-tools" v-show="!sidebarCollapsed || mobileNavOpen">
        <button class="tools-toggle" @click="toolsExpanded = !toolsExpanded">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>一键专注</span>
          <svg class="tools-chevron" :class="{ expanded: toolsExpanded }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        <Transition name="tools-slide">
          <div v-if="toolsExpanded" class="tools-content">
            <p class="focus-desc">沉浸当下，提升专注力</p>
            <button class="focus-start-btn" type="button" @click="startFocusMode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              开始专注
            </button>
            <div class="focus-timer-select">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <select v-model="focusDuration" class="focus-select">
                <option :value="5">5 分钟</option>
                <option :value="15">15 分钟</option>
                <option :value="25">25 分钟</option>
                <option :value="45">45 分钟</option>
                <option :value="60">60 分钟</option>
              </select>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 今日能量值 — 常驻 -->
      <div class="energy-widget" v-show="!sidebarCollapsed || mobileNavOpen">
        <div class="energy-header">
          <span class="energy-label">今日能量值</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.2);cursor:help"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
        <div class="energy-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><defs><linearGradient id="eGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#eGrad)"></path></svg>
          <span class="energy-value">{{ energyValue }}</span>
          <span class="energy-max">/ 100</span>
        </div>
        <div class="energy-bar">
          <div class="energy-bar-fill" :style="{ width: energyValue + '%' }"></div>
        </div>
        <p class="energy-hint">{{ energyValue >= 80 ? '状态良好，继续保持！' : energyValue >= 50 ? '精力充沛，可以挑战更多！' : '适当休息，恢复能量' }}</p>
      </div>

      <!-- 侧边栏底部 -->
      <div class="sidebar-bottom">
        <router-link to="/app/settings" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="nav-label">设置</span>
          <span class="nav-tooltip">个人设置</span>
        </router-link>
        <router-link to="/app/feedback" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          <span class="nav-label">反馈</span>
          <span class="nav-tooltip">用户反馈</span>
        </router-link>
      </div>
    </aside>

    <!-- 主内容区 — 可自由滚动 -->
    <main class="main-content">
      <div class="view-container">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase'
import CosmicBackground from '../../components/CosmicBackground.vue'
import SparkAvatar from '../../components/SparkAvatar.vue'
import { useSettings } from '../../composables/useSettings'

const { appearance } = useSettings()
const particleEnabled = computed(() => appearance.value.particleEffect)

const router = useRouter()
const route = useRoute()

const fullBrightnessRoutes = ['AppCompanion']
const bgIntensity = computed(() =>
  fullBrightnessRoutes.includes(route.name as string) ? 1 : 0.65
)

const showDropdown = ref(false)
const showNotifPanel = ref(false)
const sidebarCollapsed = ref(false)
const searchQuery = ref('')
const focusDuration = ref(25)
const toolsExpanded = ref(true)
const selectedCampus = ref('default')
const { user } = useAuth()

// ====== 移动端抽屉导航 ======
const mobileNavOpen = ref(false)
const navToggleRef = ref<HTMLButtonElement | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)
const mobileMedia = window.matchMedia('(max-width: 767px)')

function handleNavToggle() {
  if (mobileMedia.matches) {
    mobileNavOpen.value = !mobileNavOpen.value
    if (mobileNavOpen.value) {
      requestAnimationFrame(() => {
        sidebarRef.value?.querySelector<HTMLElement>('a, button')?.focus()
      })
    }
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

function closeMobileNav() {
  if (!mobileNavOpen.value) return
  mobileNavOpen.value = false
  navToggleRef.value?.focus()
}

function handleSidebarNavClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a')) closeMobileNav()
}

function handleShellKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileNavOpen.value) closeMobileNav()
}

function handleMediaChange(e: MediaQueryListEvent) {
  if (!e.matches) mobileNavOpen.value = false
}

const energyValue = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 92
  if (hour >= 10 && hour < 14) return 78
  if (hour >= 14 && hour < 17) return 86
  if (hour >= 17 && hour < 21) return 65
  return 45
})

function startFocusMode() {
  router.push('/app/learn')
}

// 引用 — 用于 click-outside 检测
const dropdownRef = ref<HTMLElement | null>(null)
const notifRef = ref<HTMLElement | null>(null)

// ====== 通知数据（模拟，后续接 Supabase realtime） ======
interface NotifItem {
  icon: string
  title: string
  time: string
  read: boolean
  route?: string
}

const notifications = reactive<NotifItem[]>([
  { icon: '💬', title: '你收到了一条新私信', time: '5分钟前', read: false, route: '/app/messages' },
  { icon: '❤️', title: '有人对你的动态点了赞', time: '30分钟前', read: false, route: '/app/wall' },
  { icon: '📅', title: '「高数复习」日程即将开始', time: '1小时前', read: true, route: '/app/schedule' },
  { icon: '🛍️', title: '你的商品被人收藏了', time: '2小时前', read: true, route: '/app/shop' },
])

const unreadCount = computed(() => notifications.filter(n => !n.read).length)

function toggleNotifPanel() {
  showNotifPanel.value = !showNotifPanel.value
  showDropdown.value = false // 互斥
}

function clearNotifications() {
  notifications.forEach(n => n.read = true)
}

function handleNotifClick(n: NotifItem) {
  n.read = true
  showNotifPanel.value = false
  if (n.route) router.push(n.route)
}

// ====== Click-outside 关闭下拉/通知 ======
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    showDropdown.value = false
  }
  if (notifRef.value && !notifRef.value.contains(target)) {
    showNotifPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleShellKeydown)
  mobileMedia.addEventListener('change', handleMediaChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleShellKeydown)
  mobileMedia.removeEventListener('change', handleMediaChange)
})

// 搜索功能 — 匹配模块名跳转
const searchMap: Record<string, string> = {
  'ai': '/app/chat', '助手': '/app/chat', 'chat': '/app/chat', '对话': '/app/chat',
  '日程': '/app/schedule', '日历': '/app/schedule', 'schedule': '/app/schedule',
  '墙': '/app/wall', '动态': '/app/wall', '校园': '/app/wall',
  '购物': '/app/shop', '交易': '/app/shop', '二手': '/app/shop',
  '规划': '/app/planner', '目标': '/app/planner',
  '人才': '/app/talent', '求职': '/app/talent', '简历': '/app/talent',
  '资讯': '/app/news', '新闻': '/app/news',
  '共创': '/app/cocreate', '项目': '/app/cocreate', '协作': '/app/cocreate',
  '资源': '/app/resources', '学习': '/app/resources',
  '学长': '/app/mentors', '分享': '/app/mentors',
  '伴侣': '/app/companion', '好友': '/app/companion', '社交': '/app/companion',
  '健康': '/app/health', '打卡': '/app/health', '运动': '/app/health',
  '卡罗牌': '/app/tarot', '选择': '/app/tarot',
  '自习': '/app/study-room', '番茄': '/app/study-room',
  '设置': '/app/settings', '个人': '/app/settings',
  '反馈': '/app/feedback', '建议': '/app/feedback',
  '主页': '/app/home', '首页': '/app/home',
  '通知': '/app/settings/notifications',
}

const handleSearch = () => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return
  for (const [keyword, path] of Object.entries(searchMap)) {
    if (q.includes(keyword)) {
      router.push(path)
      searchQuery.value = ''
      return
    }
  }
  router.push('/app/chat')
  searchQuery.value = ''
}

// 用户显示名称
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

const userEmail = computed(() => user.value?.email || '')

const avatarInitial = computed(() => {
  const name = userName.value
  return name ? name.charAt(0).toUpperCase() : '?'
})
void avatarInitial

// 用户头像URL — 从 user_metadata 读取，全局唯一头像源
const userAvatarUrl = computed(() => {
  return user.value?.user_metadata?.avatar_url || ''
})

// 退出登录
const handleLogout = async () => {
  await supabase.auth.signOut()
  showDropdown.value = false
  router.push('/login')
}
</script>

<style scoped>
/* ====== 布局容器 ======
   参考壳层：sidebar 占满整列高度，topbar 只覆盖主内容区。 */
.app-layout {
  --shell-sidebar-w: 200px;
  --shell-topbar-h: 56px;
  display: grid;
  grid-template-columns: var(--shell-sidebar-w) minmax(0, 1fr);
  grid-template-rows: var(--shell-topbar-h) minmax(0, 1fr);
  grid-template-areas:
    'sidebar topbar'
    'sidebar main';
  height: 100dvh;
  width: 100%;
  position: relative;
  z-index: 1; /* 确保在CosmicBackground(z-index:0)之上 */
  background: transparent;
  color: var(--color-text-primary);
  overflow: hidden;
  transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.app-layout.shell-collapsed { --shell-sidebar-w: 64px; }

/* ====== TopBar ====== */
.topbar {
  grid-area: topbar;
  height: var(--shell-topbar-h);
  background: rgba(8, 6, 18, 0.94);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-bottom: 1px solid rgba(139,92,246,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: relative;
  z-index: 200;
}

/* 桌面端 logo 移入 sidebar；topbar 内仅移动端显示 */
.topbar .topbar-logo { display: none; }

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-toggle {
  background: transparent; border: none;
  color: var(--color-text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  transition: all 0.2s;
}
.sidebar-toggle:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-primary);
}

/* LOGO */
.logo-link {
  display: flex; align-items: center; gap: 8px;
  text-decoration: none; color: var(--color-text-primary);
}
.logo-img {
  width: 28px; height: 28px;
  object-fit: contain;
  border-radius: 4px;
}
.logo-text {
  font-size: 17px; font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 搜索栏 */
.topbar-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0 14px;
  height: 36px;
  max-width: 400px; flex: 1;
  margin: 0 24px 0 8px;
  transition: border-color 0.2s;
  color: var(--color-text-muted);
}
.topbar-search:focus-within {
  border-color: rgba(139,92,246,0.5);
  box-shadow: 0 0 16px rgba(139,92,246,0.12), 0 0 0 1px rgba(139,92,246,0.2);
  background: rgba(255,255,255,0.04);
}
.search-input {
  background: transparent; border: none; outline: none;
  color: var(--color-text-primary); font-size: 13px; width: 100%;
  font-family: inherit;
}
.search-input::placeholder { color: var(--color-text-muted); }

/* 右侧图标 */
.topbar-right {
  display: flex; align-items: center; gap: 12px;
  min-width: 120px; justify-content: flex-end;
}
.topbar-icon-btn {
  position: relative;
  background: transparent; border: none;
  color: var(--color-text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  transition: all 0.2s;
}
.topbar-icon-btn:hover {
  background: rgba(139,92,246,0.1);
  color: var(--color-text-primary);
  box-shadow: 0 0 8px rgba(139,92,246,0.1);
}

/* 通知红点/计数 */
.notif-dot {
  position: absolute; top: 4px; right: 4px;
  min-width: 16px; height: 16px;
  background: #f43f5e; border-radius: 10px;
  font-size: 10px; font-weight: 700; color: white;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px;
  box-shadow: 0 0 8px rgba(244,63,94,0.6);
}

/* ====== 通知面板 ====== */
.notif-wrap { position: relative; }
.notif-panel {
  position: absolute; top: 44px; right: 0;
  width: 320px;
  background: var(--color-bg-secondary);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  box-shadow: var(--shadow-elevated);
  z-index: 201; overflow: hidden;
}
.notif-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}
.notif-panel-header strong {
  font-size: 14px; color: var(--color-text-primary);
}
.notif-clear-btn {
  background: none; border: none;
  color: var(--color-text-muted); cursor: pointer;
  padding: 4px; border-radius: 6px;
  transition: all 0.15s;
}
.notif-clear-btn:hover { color: #10b981; background: rgba(16,185,129,0.1); }

.notif-list { max-height: 300px; overflow-y: auto; }
.notif-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; color: var(--color-text-muted); font-size: 13px;
}
.notif-empty-icon { font-size: 32px; opacity: 0.3; }

.notif-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--color-border);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--color-bg-card-hover); }
.notif-item.unread { background: rgba(79,142,247,0.04); }
.notif-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.notif-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.notif-title { font-size: 13px; color: var(--color-text-primary); line-height: 1.4; }
.notif-time { font-size: 11px; color: var(--color-text-muted); }

.notif-footer {
  display: block; text-align: center;
  padding: 10px; font-size: 12px;
  color: var(--theme-color, #4f8ef7);
  text-decoration: none;
  border-top: 1px solid var(--color-border);
  transition: background 0.15s;
}
.notif-footer:hover { background: var(--color-bg-card-hover); }

/* 搜索快捷键提示 */
.search-kbd {
  font-size: 11px;
  color: var(--color-text-muted);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px;
  padding: 1px 6px;
  font-family: inherit;
  flex-shrink: 0;
}

/* 校区选择器 */
.campus-selector {
  display: flex; align-items: center; gap: 6px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 10px;
  height: 32px;
  color: var(--color-text-muted);
}
.campus-select {
  background: transparent; border: none; outline: none;
  color: var(--color-text-secondary);
  font-size: 12px; font-family: inherit;
  cursor: pointer;
}
.campus-select option { background: #1a1625; color: #ccc; }

/* ====== 头像下拉 ====== */
.user-dropdown { position: relative; cursor: pointer; }
.u-avatar-wrap {
  display: flex; align-items: center; gap: 6px;
  cursor: pointer;
  transition: box-shadow 0.2s;
  border-radius: 8px;
  padding: 2px 4px;
}
.u-avatar-wrap:hover { box-shadow: 0 0 0 2px var(--theme-color, rgba(79,142,247,0.3)); }

.user-level-badge {
  font-size: 10px;
  font-weight: 700;
  color: #c4b5fd;
  background: rgba(139,92,246,0.12);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.dd-menu {
  position: absolute; top: 44px; right: 0;
  width: 220px;
  background: var(--color-bg-secondary);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  box-shadow: var(--shadow-elevated);
  z-index: 201; overflow: hidden;
}
.dd-enter-active, .dd-leave-active { transition: all 0.15s ease; }
.dd-enter-from, .dd-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }
.dd-header { padding: 14px 16px; }
.dd-header strong { display: block; font-size: 14px; margin-bottom: 2px; color: var(--color-text-primary); }
.dd-header span { font-size: 12px; color: var(--color-text-muted); }
.dd-divider { height: 1px; background: var(--color-border); }
.dd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; font-size: 13px;
  color: var(--color-text-secondary); transition: all 0.15s;
  cursor: pointer; text-decoration: none;
}
.dd-item:hover { background: var(--color-bg-card-hover); color: var(--color-text-primary); }
.dd-logout:hover { color: #f43f5e; }

/* ====== 侧边栏 ====== */
.sidebar {
  grid-area: sidebar;
  min-height: 0;
  background: rgba(8, 6, 18, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 50;
}

/* sidebar 顶部品牌区 — 与 topbar 同高对齐 */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--shell-topbar-h);
  flex-shrink: 0;
  padding: 0 16px;
  border-bottom: 1px solid rgba(139,92,246,0.08);
  white-space: nowrap;
  overflow: hidden;
}
.collapsed .sidebar-logo { justify-content: center; padding: 0; }
.collapsed .sidebar-logo .logo-text { display: none; }

.sidebar-nav {
  flex: 1;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav::-webkit-scrollbar { width: 3px; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-bg-card-hover); border-radius: 3px;
}

/* 导航分组 */
.nav-group { margin-bottom: 16px; }
.nav-group-label {
  display: block;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--color-text-muted);
  padding: 8px 12px 6px;
  white-space: nowrap;
  overflow: hidden;
}

/* 导航链接 */
.nav-link {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  font-size: 13px; font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  overflow: hidden;
  text-decoration: none;
}
.nav-link:hover {
  background: rgba(255,255,255,0.05);
  color: var(--color-text-primary);
  border-color: rgba(255,255,255,0.08);
}
.nav-link:active {
  transform: scale(0.97);
  transition: transform 0.08s ease-out;
}
.nav-link.router-link-active {
  background: linear-gradient(135deg, rgba(79,142,247,0.15), rgba(139,92,246,0.18));
  border: 1px solid rgba(139,92,246,0.25);
  color: #e0d4ff;
  box-shadow: 0 0 12px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
}
.nav-link.router-link-active svg {
  stroke: #a78bfa;
  filter: drop-shadow(0 0 4px rgba(167,139,250,0.4));
}
.nav-link.router-link-active .nav-label {
  color: #e0d4ff;
  text-shadow: 0 0 8px rgba(167,139,250,0.3);
}
.nav-link svg { flex-shrink: 0; transition: stroke 0.2s, filter 0.2s; }
.nav-label {
  opacity: 1; transition: opacity 0.2s;
}
.collapsed .nav-label { opacity: 0; width: 0; }
.collapsed .nav-group-label { opacity: 0; height: 0; padding: 0; margin: 0; }

/* 收起时 tooltip */
.nav-tooltip {
  position: absolute; left: 60px; top: 50%;
  transform: translateY(-50%) translateX(-8px);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  color: var(--color-text-primary); padding: 6px 12px;
  border-radius: 8px; font-size: 12px; font-weight: 500;
  white-space: nowrap; pointer-events: none;
  opacity: 0; visibility: hidden;
  transition: all 0.15s ease;
  z-index: 100;
  box-shadow: var(--shadow-card);
}
.collapsed .nav-link:hover .nav-tooltip {
  opacity: 1; visibility: visible;
  transform: translateY(-50%) translateX(0);
}

/* 侧边栏工具区 */
.sidebar-tools {
  margin: 6px 10px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.03));
  border: 1px solid rgba(139,92,246,0.08);
  overflow: hidden;
}
.tools-toggle {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px;
  background: none; border: none;
  color: var(--color-text-primary);
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.tools-toggle:hover { background: rgba(139,92,246,0.06); }
.tools-toggle svg:first-child { color: #8b5cf6; flex-shrink: 0; }
.tools-toggle span { flex: 1; text-align: left; }
.tools-chevron {
  color: rgba(255,255,255,0.25);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.tools-chevron.expanded { transform: rotate(180deg); }

.tools-content {
  padding: 0 14px 14px;
}
.focus-desc {
  font-size: 11px; color: var(--color-text-muted); margin: 0 0 10px;
}
.focus-start-btn {
  width: 100%; height: 34px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: white; border: none; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(139,92,246,0.25);
}
.focus-start-btn:hover {
  box-shadow: 0 4px 20px rgba(139,92,246,0.4);
  transform: translateY(-1px);
}
.focus-timer-select {
  display: flex; align-items: center; gap: 6px;
  margin-top: 8px;
  color: var(--color-text-muted);
}
.focus-select {
  background: transparent; border: none; outline: none;
  color: var(--color-text-muted); font-size: 12px;
  font-family: inherit; cursor: pointer;
  flex: 1;
}
.focus-select option { background: #1a1625; color: #ccc; }

/* 工具区展开/收起动画 */
.tools-slide-enter-active { transition: all 0.25s ease; }
.tools-slide-leave-active { transition: all 0.2s ease; }
.tools-slide-enter-from,
.tools-slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; overflow: hidden; }
.tools-slide-enter-to,
.tools-slide-leave-from { opacity: 1; max-height: 200px; }

/* 今日能量值 */
.energy-widget {
  margin: 6px 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(12,10,24,0.5);
  border: 1px solid rgba(255,255,255,0.04);
}
.energy-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.energy-label {
  font-size: 11px; font-weight: 600; color: var(--color-text-muted);
}
.energy-row {
  display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px;
}
.energy-value {
  font-size: 28px; font-weight: 800; color: var(--color-text-primary);
  line-height: 1;
}
.energy-max {
  font-size: 13px; color: var(--color-text-muted); font-weight: 500;
}
.energy-bar {
  height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px;
  overflow: hidden; margin-bottom: 6px;
}
.energy-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  border-radius: 3px;
  transition: width 0.6s ease;
  box-shadow: 0 0 8px rgba(16,185,129,0.3);
}
.energy-hint {
  font-size: 10px; color: var(--color-text-muted); margin: 0;
  opacity: 0.6;
}

/* 侧边栏底部 */
.sidebar-bottom {
  padding: 8px 10px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ====== 主内容区 ====== */
.main-content {
  grid-area: main;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.view-container {
  min-height: 100%;
  position: relative;
}

.main-content::-webkit-scrollbar { width: 6px; }
.main-content::-webkit-scrollbar-thumb {
  background: var(--color-bg-card-hover);
  border-radius: 3px;
}
.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

/* ====== 移动端抽屉遮罩 ====== */
.mobile-nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 290;
  background: rgba(3, 2, 12, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.2s ease; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

/* ====== 响应式 ====== */
@media (max-width: 1023px) and (min-width: 768px) {
  .app-layout { --shell-sidebar-w: 64px; }
  .app-layout .nav-label { opacity: 0; width: 0; }
  .app-layout .nav-group-label { display: none; }
  .app-layout .sidebar-logo { justify-content: center; padding: 0; }
  .app-layout .sidebar-logo .logo-text { display: none; }
  .app-layout .sidebar-tools,
  .app-layout .energy-widget { display: none; }
}

@media (max-width: 767px) {
  /* 单列布局：sidebar 退出文档流成为抽屉 */
  .app-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'topbar'
      'main';
  }

  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(280px, 84vw);
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: 1px solid rgba(139,92,246,0.18);
    box-shadow: none;
    z-index: 300;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 24px 0 64px rgba(0, 0, 0, 0.5);
  }

  /* 抽屉内永远展示完整导航（忽略桌面折叠态） */
  .sidebar .nav-label { opacity: 1; width: auto; }
  .sidebar .nav-group-label { display: block; opacity: 1; height: auto; padding: 8px 12px 6px; }
  .sidebar .sidebar-logo { justify-content: flex-start; padding: 0 16px; }
  .sidebar .sidebar-logo .logo-text { display: inline; }
  .sidebar .nav-tooltip { display: none; }

  /* 移动端 topbar：品牌回到顶栏 */
  .topbar { padding: 0 12px; }
  .topbar .topbar-logo { display: flex; }
  .topbar-left { min-width: 0; }
  .topbar-search { display: none; }
  .campus-selector { display: none; }
  .notif-panel { width: min(300px, calc(100vw - 24px)); right: -80px; }
  .topbar-right { gap: 6px; min-width: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .app-layout { transition: none; }
  .sidebar { transition: none; }
}
</style>
