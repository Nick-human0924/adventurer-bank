import { createApp, ref, onMounted } from 'vue'
import App from './App.vue'
import router from './router'
import { initDatabase, getDbStatus } from './utils/supabase.js'

const app = createApp(App)

app.use(router)

// 全局数据库状态
app.config.globalProperties.$dbStatus = ref({
  connected: false,
  checking: true,
  error: null,
  tablesExist: {}
})

// 初始化数据库
initDatabase().then(result => {
  const status = getDbStatus()
  app.config.globalProperties.$dbStatus.value = {
    connected: status.connected,
    checking: false,
    error: status.error,
    tablesExist: status.tablesExist
  }
  
  if (!status.connected) {
    console.error('⚠️ 数据库未初始化！请运行 SQL 脚本创建表格')
  }
})

app.mount('#app')
