import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Children from '../views/Children.vue'
import Rules from '../views/Rules.vue'
import Tasks from '../views/Tasks.vue'
import Config from '../views/Config.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '仪表盘', icon: '📊' }
  },
  {
    path: '/children',
    name: 'Children',
    component: Children,
    meta: { title: '孩子管理', icon: '👶' }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: Rules,
    meta: { title: '规则管理', icon: '📝' }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks,
    meta: { title: '任务闯关', icon: '🎯' }
  },
  {
    path: '/config',
    name: 'Config',
    component: Config,
    meta: { title: '系统配置', icon: '⚙️' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
