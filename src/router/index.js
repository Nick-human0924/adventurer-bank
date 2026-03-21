import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Rules from '../views/Rules.vue'
import Config from '../views/Config.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '仪表盘', icon: '📊' }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: Rules,
    meta: { title: '规则管理', icon: '📝' }
  },
  {
    path: '/config',
    name: 'Config',
    component: Config,
    meta: { title: '系统配置', icon: '⚙️' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
