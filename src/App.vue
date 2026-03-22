<template>
  <div class="app" :class="{ 'mobile-menu-open': isMobileMenuOpen }">
    <!-- 数据库警告条 -->
    <div v-if="showDbWarning || connectionError" class="db-warning-banner">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">
        {{ connectionError ? '数据库连接失败，请检查网络或配置' : '数据库未初始化！请前往 Supabase 控制台运行 init_database.sql 脚本' }}
      </span>
      <a v-if="!connectionError" href="https://supabase.com/dashboard/project/agkemugaxhrsnbyiluw/sql/new" target="_blank" class="warning-link">
        打开 SQL Editor →
      </a>
    </div>
    
    <!-- 移动端顶部导航栏 -->
    <header v-if="isAuthenticated" class="mobile-header">
      <button class="menu-toggle" @click="toggleMobileMenu">
        <span class="hamburger">☰</span>
      </button>
      <div class="mobile-title">{{ currentRouteTitle }}</div>
      <div class="mobile-user">
        <button class="user-btn" @click="showUserMenu = !showUserMenu">
          👤
        </button>
        <!-- 用户菜单下拉 -->
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="user-email">{{ userEmail }}</div>
          <button class="logout-btn" @click="handleLogout">
            🚪 退出登录
          </button>
        </div>
      </div>
    </header>
    
    <!-- 侧边栏（桌面端固定，移动端抽屉）-->
    <nav v-if="isAuthenticated" class="sidebar" :class="{ 'mobile-drawer': isMobile }">
      <div class="sidebar-header">
        <div class="logo">
          <h1>🏦 儿童行为银行</h1>
        </div>
        <!-- 移动端关闭按钮 -->
        <button v-if="isMobile" class="close-drawer" @click="closeMobileMenu">
          ✕
        </button>
      </div>
      
      <ul class="nav-links">
        <li v-for="route in authRoutes" :key="route.path">
          <router-link 
            :to="route.path" 
            :class="{ active: $route.path === route.path }"
            @click="isMobile ? closeMobileMenu() : null"
          >
            <span class="icon">{{ route.meta.icon }}</span>
            <span class="title">{{ route.meta.title }}</span>
          </router-link>
        </li>
      </ul>
      
      <div class="sidebar-footer">
        <div class="connection-status" :class="{ connected: isConnected }">
          <span class="dot"></span>
          {{ isConnected ? '已连接' : '连接中...' }}
        </div>        
        
        <div class="user-info">
          <div class="user-email-truncate">{{ userEmail }}</div>
          <button class="logout-btn" @click="handleLogout">
            🚪 退出
          </button>
        </div>
        
        <div class="version-badge">
          <span class="version-label">版本</span>
          <span class="version-number">v{{ appVersion }}</span>
        </div>
      </div>
    </nav>
    
    <!-- 移动端遮罩层 -->
    <div 
      v-if="isMobile && isMobileMenuOpen" 
      class="drawer-overlay"
      @click="closeMobileMenu"
    ></div>
    
    <!-- 主内容区 -->
    <main class="main-content" :class="{ 'auth-page': !isAuthenticated }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase, initDatabase } from './utils/supabase.js'
import router from './router'

const isConnected = ref(false)
const connectionError = ref(false)
const isMobile = ref(false)
const isMobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const isAuthenticated = ref(false)
const userEmail = ref('')
const $route = useRoute()
const $router = useRouter()
const { proxy } = getCurrentInstance()

// 应用版本号
const appVersion = '3.0.5'

// 过滤需要认证的路由
const authRoutes = computed(() => {
  return router.getRoutes().filter(r => r.meta.requiresAuth)
})

// 当前路由标题
const currentRouteTitle = computed(() => {
  const route = authRoutes.value.find(r => r.path === $route.path)
  return route?.meta?.title || '儿童行为银行'
})

// 数据库警告状态
const showDbWarning = computed(() => {
  if (!proxy.$dbStatus) return connectionError.value
  const status = proxy.$dbStatus.value
  return !status.checking && !status.connected
})

// 检查移动端
function checkMobile() {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

// 切换移动端菜单
function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 关闭移动端菜单
function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

// 检查认证状态
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  isAuthenticated.value = !!session
  if (session?.user) {
    userEmail.value = session.user.email
  }
}

// 处理退出登录
async function handleLogout() {
  await supabase.auth.signOut()
  isAuthenticated.value = false
  userEmail.value = ''
  showUserMenu.value = false
  $router.push('/login')
}

onMounted(async () => {
  // 检查认证状态
  await checkAuth()
  
  // 监听认证状态变化
  supabase.auth.onAuthStateChange((event, session) => {
    isAuthenticated.value = !!session
    if (session?.user) {
      userEmail.value = session.user.email
    } else {
      userEmail.value = ''
    }
  })
  
  // 检查是否移动端
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 数据库连接检查
  const timeoutId = setTimeout(() => {
    if (!isConnected.value) {
      connectionError.value = true
      console.error('❌ 数据库连接超时')
    }
  }, 5000)
  
  try {
    const result = await initDatabase()
    clearTimeout(timeoutId)
    
    if (result.success) {
      isConnected.value = true
      connectionError.value = false
    } else {
      isConnected.value = false
      connectionError.value = true
    }
  } catch (error) {
    clearTimeout(timeoutId)
    connectionError.value = true
    console.error('数据库初始化失败:', error)
  }
})
</script>

<style>
/* 基础布局 */
.app {
  display: flex;
  min-height: 100vh;
}

/* 数据库警告条 */
.db-warning-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  color: #fff;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 9999;
  font-size: 0.95rem;
  box-shadow: 0 2px 10px rgba(255, 75, 43, 0.3);
}

.db-warning-banner .warning-icon {
  font-size: 1.3rem;
}

.db-warning-banner .warning-text {
  font-weight: 500;
}

.db-warning-banner .warning-link {
  color: #fff;
  text-decoration: underline;
  font-weight: 600;
  margin-left: 10px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  transition: background 0.3s;
}

.db-warning-banner .warning-link:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 移动端顶部导航栏 */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  align-items: center;
  padding: 0 16px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.menu-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.3s;
}

.menu-toggle:hover {
  background: rgba(255,255,255,0.2);
}

.mobile-title {
  flex: 1;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
}

.mobile-user {
  position: relative;
}

.user-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-dropdown {
  position: absolute;
  top: 48px;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  padding: 12px;
  min-width: 180px;
  z-index: 1001;
}

.user-email {
  padding: 8px;
  color: #495057;
  font-size: 0.85rem;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 8px;
  word-break: break-all;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 20px 0;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-drawer {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
}

.logo h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.nav-links {
  list-style: none;
  padding: 20px 0;
  flex: 1;
  overflow-y: auto;
}

.nav-links li {
  padding: 5px 15px;
}

.nav-links a {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.3s;
}

.nav-links a:hover,
.nav-links a.active {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.nav-links .icon {
  font-size: 1.3rem;
  margin-right: 12px;
}

.sidebar-footer {
  padding: 15px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.connection-status {
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.connection-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  margin-right: 8px;
}

.connection-status.connected .dot {
  background: #51cf66;
}

.user-info {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
}

.user-email-truncate {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.8);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  width: 100%;
  padding: 8px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.3);
}

.version-badge {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  padding: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
}

.version-label {
  color: rgba(255,255,255,0.7);
}

.version-number {
  color: #ffd43b;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

/* 主内容区 */
.main-content {
  flex: 1;
  margin-left: 260px;
  padding: 30px;
  min-height: 100vh;
}

.main-content.auth-page {
  margin-left: 0;
  padding: 0;
}

/* 全局版本号条 */
.global-version-bar {
  margin-top: 40px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  flex-wrap: wrap;
}

.version-tag {
  font-weight: 600;
}

.version-divider {
  opacity: 0.5;
}

.version-number {
  background: rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
}

.version-date {
  opacity: 0.8;
  font-size: 0.85rem;
}

.version-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.9rem;
}

.version-status.success {
  background: #51cf66;
  color: white;
}

/* 移动端遮罩层 */
.drawer-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 99;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }
  
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    width: 280px;
  }
  
  .sidebar.mobile-drawer {
    transform: translateX(-100%);
  }
  
  .app.mobile-menu-open .sidebar {
    transform: translateX(0);
  }
  
  .close-drawer {
    display: block;
  }
  
  .drawer-overlay {
    display: block;
  }
  
  .main-content {
    margin-left: 0;
    padding: 76px 16px 16px;
  }
  
  .main-content.auth-page {
    padding: 0;
  }
  
  .global-version-bar {
    flex-direction: column;
    gap: 12px;
    text-align: center;
    margin-top: 24px;
  }
  
  .version-info {
    justify-content: center;
  }
  
  .db-warning-banner {
    position: relative;
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }
}

/* 通用组件样式 */
.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
}

.btn-danger {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: #fff;
}

input, select, textarea {
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.3s;
  width: 100%;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}

.stat-icon.blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.stat-icon.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.purple { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-content h3 {
  font-size: 0.9rem;
  color: #868e96;
  margin-bottom: 5px;
}

.stat-content .number {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  font-weight: 600;
  color: #495057;
  background: #f8f9fa;
}

tr:hover {
  background: #f8f9fa;
}

.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge-success {
  background: #d3f9d8;
  color: #2b8a3e;
}

.badge-danger {
  background: #ffe3e3;
  color: #c92a2a;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #868e96;
}

/* 移动端触控优化 */
@media (max-width: 768px) {
  .btn {
    min-height: 44px;
    padding: 12px 20px;
  }
  
  .nav-links a {
    min-height: 48px;
  }
  
  input, select, textarea {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  .modal {
    padding: 20px;
    margin: 10px;
  }
  
  th, td {
    padding: 12px;
  }
}
</style>
