import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 官网区
import LandingPage from '../pages/landing/LandingPage.vue'
import Login from '../pages/auth/Login.vue'
import Register from '../pages/auth/Register.vue'
import Docs from '../pages/landing/Docs.vue'
import Community from '../pages/landing/Community.vue'
import Changelog from '../pages/landing/Changelog.vue'

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

  // ================= 应用区 (需登录鉴权) =================
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true }, // 添加路由元信息用于拦截
    redirect: '/app/home',
    children: [
      {
        path: 'home',
        name: 'AppHome',
        component: AppHome
      },
      {
        path: 'chat',
        name: 'AppChat',
        component: Chat
      },
      {
        path: 'wall',
        name: 'AppWall',
        component: CampusWall
      },
      {
        path: 'profile',
        name: 'AppProfile',
        component: Profile
      }
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

// 路由守卫拦截
router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem('spark_auth_token') !== null;
  // TODO: 后续接入真实鉴权逻辑

  if (to.meta.requiresAuth && !isAuthenticated) {
    // 强制跳转登录
    // 在开发测试阶段可以暂时允许过去，但按照要求我们严格保护 /app
    // 这里我们可以临时写一个提示，如果没登录跳转登录，为了方便测试，我留了个后门(手动localStorage.setItem)
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated) {
    // 已登录不允许去登录页
    next({ name: 'AppHome' })
  } else {
    next()
  }
})

export default router
