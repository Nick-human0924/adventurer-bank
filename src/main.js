import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initDatabase } from './utils/supabase.js'

const app = createApp(App)

app.use(router)

// 初始化数据库
initDatabase().then(result => {
  console.log('数据库初始化结果:', result)
})

app.mount('#app')
