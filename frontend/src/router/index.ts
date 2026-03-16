import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Chat from '../pages/Chat.vue'
import CampusWall from '../pages/CampusWall.vue'
import Profile from '../pages/Profile.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/chat',
      name: 'chat',
      component: Chat
    },
    {
      path: '/campus-wall',
      name: 'campusWall',
      component: CampusWall
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile
    }
  ]
})

export default router
