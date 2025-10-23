import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Activities from '@/views/Activities.vue'
import MyTickets from '@/views/MyTickets.vue'
import Admin from '@/views/Admin.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/activities',
    name: 'Activities',
    component: Activities
  },
  {
    path: '/my-tickets',
    name: 'MyTickets',
    component: MyTickets
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
