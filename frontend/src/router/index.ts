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
import Chat from '../pages/app/Chat.vue'
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
      // 核心功能
      { path: 'home', name: 'AppHome', component: AppHome },
      { path: 'chat', name: 'AppChat', component: Chat },
      { path: 'companion', name: 'AppCompanion', component: () => import('../pages/app/Companion.vue') },
      // 生活服务
      { path: 'schedule', name: 'AppSchedule', component: () => import('../pages/app/Schedule.vue') },
      { path: 'planner', name: 'AppPlanner', component: () => import('../pages/app/Planner.vue') },
      { path: 'shop', name: 'AppShop', component: () => import('../pages/app/Shop.vue') },
      { path: 'health', name: 'AppHealth', component: () => import('../pages/app/Health.vue') },
      // 社区互动
      { path: 'wall', name: 'AppWall', component: CampusWall },
      { path: 'tarot', name: 'AppTarot', component: () => import('../pages/app/Tarot.vue') },
      { path: 'study-room', name: 'AppStudyRoom', component: () => import('../pages/app/StudyRoom.vue') },
      // 学习成长
      { path: 'mentors', name: 'AppMentors', component: () => import('../pages/app/Mentors.vue') },
      { path: 'resources', name: 'AppResources', component: () => import('../pages/app/Resources.vue') },
      { path: 'talent', name: 'AppTalent', component: () => import('../pages/app/Talent.vue') },
      { path: 'news', name: 'AppNews', component: () => import('../pages/app/News.vue') },
      { path: 'cocreate', name: 'AppCoCreate', component: () => import('../pages/app/CoCreate.vue') },
      // 个人
      { path: 'profile', name: 'AppProfile', component: Profile },
      { path: 'feedback', name: 'AppFeedback', component: () => import('../pages/app/Placeholder.vue') }
    ]
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { supabase } from '../supabase'

// 路由守卫拦截
router.beforeEach(async (to, _from, next) => {
  // Check if route requires auth
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // Get active session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = !!session;

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
