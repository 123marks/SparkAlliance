import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 官网区
import LandingPage from '../pages/landing/LandingPage.vue'
import Login from '../pages/auth/Login.vue'
import Register from '../pages/auth/Register.vue'
import ForgotPassword from '../pages/auth/ForgotPassword.vue'
import Docs from '../pages/landing/Docs.vue'
import Community from '../pages/landing/Community.vue'
import Changelog from '../pages/landing/Changelog.vue'
import Terms from '../pages/landing/Terms.vue'
import Privacy from '../pages/landing/Privacy.vue'
import About from '../pages/landing/About.vue'

// 应用区
import AppLayout from '../pages/app/AppLayout.vue'
import AppHome from '../pages/app/AppHome.vue'

import CampusWall from '../pages/app/CampusWall.vue'
import Profile from '../pages/app/Profile.vue'

const routes: Array<RouteRecordRaw> = [
  // ================= 官网区 (无需登录) =================
  {
    path: '/',
    name: 'LandingPage',
    component: LandingPage
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword
  },
  {
    path: '/docs',
    name: 'Docs',
    component: Docs
  },
  {
    path: '/community',
    name: 'Community',
    component: Community
  },
  {
    path: '/changelog',
    name: 'Changelog',
    component: Changelog
  },
  {
    path: '/terms',
    name: 'Terms',
    component: Terms
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: Privacy
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },

  // ================= 应用区 (需登录鉴权) =================
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true }, // 添加路由元信息用于拦截
    redirect: '/app/home',
    children: [
      // ===== 核心功能 =====
      { path: 'home', name: 'AppHome', component: AppHome },
      { path: 'chat', name: 'AppChat', component: () => import('../pages/app/Chat.vue') },
      { path: 'companion', name: 'AppCompanion', component: () => import('../pages/app/Companion.vue') },
      { path: 'schedule', name: 'AppSchedule', component: () => import('../pages/app/SmartSchedule.vue') },
      // ===== 校园生活 =====
      { path: 'wall', name: 'AppWall', component: CampusWall },
      { path: 'shop', name: 'AppShop', component: () => import('../pages/app/Shop.vue') },
      { path: 'health', name: 'AppHealth', component: () => import('../pages/app/Health.vue') },
      // ===== 学习成长 =====
      { path: 'learn', name: 'AppLearn', component: () => import('../pages/app/LearnHub.vue') },
      { path: 'legacy', name: 'AppLegacy', component: () => import('../pages/app/SparkLegacy.vue') },
      { path: 'talent', name: 'AppTalent', component: () => import('../pages/app/Talent.vue') },
      { path: 'news', name: 'AppNews', component: () => import('../pages/app/News.vue') },
      { path: 'cocreate', name: 'AppCoCreate', component: () => import('../pages/app/CoCreate.vue') },
      // ===== 旧路由兼容重定向 =====
      { path: 'planner', redirect: '/app/schedule' },
      { path: 'tarot', redirect: '/app/schedule?module=tarot' },
      { path: 'study-room', redirect: '/app/learn' },
      { path: 'resources', redirect: '/app/learn' },
      { path: 'mentors', redirect: '/app/legacy' },
      { path: 'messages', redirect: '/app/legacy' },
      // 设置中心（完整路由树）
      {
        path: 'settings',
        component: () => import('../pages/app/settings/Settings.vue'),
        redirect: '/app/settings/profile',
        children: [
          { path: 'profile', name: 'SettingsProfile', component: () => import('../pages/app/settings/ProfileSettings.vue') },
          { path: 'security', name: 'SettingsSecurity', component: () => import('../pages/app/settings/SecuritySettings.vue') },
          { path: 'privacy', name: 'SettingsPrivacy', component: () => import('../pages/app/settings/PrivacySettings.vue') },
          { path: 'notifications', name: 'SettingsNotifications', component: () => import('../pages/app/settings/NotificationSettings.vue') },
          { path: 'appearance', name: 'SettingsAppearance', component: () => import('../pages/app/settings/AppearanceSettings.vue') },
          { path: 'features', name: 'SettingsFeatures', component: () => import('../pages/app/settings/FeatureSettings.vue') },
          { path: 'data', name: 'SettingsData', component: () => import('../pages/app/settings/DataSettings.vue') },
          { path: 'about', name: 'SettingsAbout', component: () => import('../pages/app/settings/AboutSettings.vue') },
        ]
      },
      // 个人主页
      { path: 'profile', name: 'AppProfile', component: Profile },
      { path: 'profile/:userId', name: 'AppUserProfile', component: Profile, props: true },
      { path: 'feedback', name: 'AppFeedback', component: () => import('../pages/app/FeedbackCenter.vue') }
    ]
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

if (import.meta.env.DEV) {
  routes.splice(routes.length - 1, 0, {
    path: '/__visual/dashboard',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'DashboardVisualFixture',
        component: AppHome,
        props: { visualFixture: true },
      },
    ],
  })
  routes.splice(routes.length - 1, 0, {
    path: '/__visual/chat',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'ChatVisualFixture',
        component: () => import('../pages/app/Chat.vue'),
      },
    ],
  })
  routes.splice(routes.length - 1, 0, {
    path: '/__visual/schedule',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'ScheduleVisualFixture',
        component: () => import('../pages/app/SmartSchedule.vue'),
        props: { visualFixture: true },
      },
    ],
  })
  routes.splice(routes.length - 1, 0, {
    path: '/__visual/wall',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'WallVisualFixture',
        component: () => import('../pages/app/CampusWall.vue'),
      },
    ],
  })
}

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { getToken } from '../api/client'

// 路由守卫拦截（自建后端：本地 token 存在即视为已登录，具体有效性由 API 401 兜底）
router.beforeEach(async (to, _from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isAuthenticated = !!getToken();

  if (requiresAuth && !isAuthenticated) {
    // Force to login
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated) {
    // Redirect away from auth pages if already logged in
    next({ name: 'AppHome' })
  } else {
    next()
  }
})

export default router
