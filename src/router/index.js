import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '../utils/supabase.js'
import Dashboard from '../views/Dashboard.vue'
import Children from '../views/Children.vue'
import Rules from '../views/Rules.vue'
import Tasks from '../views/Tasks.vue'
import Config from '../views/Config.vue'
import Auth from '../views/Auth.vue'
import Mall from '../views/Mall.vue'
import Badges from '../views/Badges.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Auth,
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '仪表盘', icon: '📊', requiresAuth: true }
  },
  {
    path: '/children',
    name: 'Children',
    component: Children,
    meta: { title: '孩子管理', icon: '👶', requiresAuth: true }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: Rules,
    meta: { title: '规则管理', icon: '📝', requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks,
    meta: { title: '任务闯关', icon: '🎯', requiresAuth: true }
  },
  {
    path: '/mall',
    name: 'Mall',
    component: Mall,
    meta: { title: '兑换商城', icon: '🎁', requiresAuth: true }
  },
  {
    path: '/badges',
    name: 'Badges',
    component: Badges,
    meta: { title: '徽章墙', icon: '🏆', requiresAuth: true }
  },
  {
    path: '/config',
    name: 'Config',
    component: Config,
    meta: { title: '系统配置', icon: '⚙️', requiresAuth: true, requiresPassword: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：检查登录状态
router.beforeEach(async (to, from, next) => {
  // 获取当前会话
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session
  
  // 如果已登录且访问登录页，跳转到首页
  if (isAuthenticated && to.path === '/login') {
    next('/')
    return
  }
  
  // 如果需要登录但未登录，跳转到登录页
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }
  
  next()
})

// 监听认证状态变化
let initialAuthCheck = true
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    router.push('/login')
  } else if (event === 'SIGNED_IN') {
    // 只在用户主动登录时跳转，页面加载恢复会话时不跳转
    if (!initialAuthCheck && router.currentRoute.value.path === '/login') {
      router.push('/')
    }
  }
  initialAuthCheck = false
})

export default router
