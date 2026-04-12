import { createApp, ref } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// 全局数据库状态（由 App.vue 等非阻塞更新）
app.config.globalProperties.$dbStatus = ref({
  connected: false,
  checking: true,
  error: null,
  tablesExist: {}
})

app.mount('#app')
