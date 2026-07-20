import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from './auth'
import { setUnauthorizedHandler } from './api'
import AdminLayout from './layout/AdminLayout.vue'
import LoginPage from './pages/LoginPage.vue'
import DashboardPage from './pages/DashboardPage.vue'
import UsersPage from './pages/UsersPage.vue'
import PostsPage from './pages/PostsPage.vue'
import ReportsPage from './pages/ReportsPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', name: 'dashboard', component: DashboardPage },
        { path: 'users', name: 'users', component: UsersPage },
        { path: 'posts', name: 'posts', component: PostsPage },
        { path: 'reports', name: 'reports', component: ReportsPage },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const authed = !!getToken()
  if (!authed && to.name !== 'login') return { name: 'login' }
  if (authed && to.name === 'login') return { name: 'dashboard' }
  return true
})

// 任意接口 401 → 清 token 回登录（清理动作在 api.ts 内完成）
setUnauthorizedHandler(() => {
  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login' })
  }
})
