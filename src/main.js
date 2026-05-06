import { createApp, ref } from 'vue'
import App from './App.vue'
import router from './router'

function installStartupOverlayGuard() {
  if (typeof window === 'undefined') return

  const style = document.createElement('style')
  style.textContent = `
    .initial-loading-overlay.startup-timeout {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: opacity 180ms ease;
    }
  `
  document.head.appendChild(style)

  const hideOverlay = () => {
    document.querySelectorAll('.initial-loading-overlay').forEach((el) => {
      el.classList.add('startup-timeout')
    })
  }

  window.setTimeout(hideOverlay, 1800)

  const observer = new MutationObserver(() => {
    window.setTimeout(hideOverlay, 1800)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

installStartupOverlayGuard()

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
