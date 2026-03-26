import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 版本号：每次部署必须更新
const VERSION = 'v4.0.1'

export default defineConfig({
  plugins: [vue()],
  base: './',  // 使用相对路径
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${VERSION}.js`,
        chunkFileNames: `assets/[name]-[hash]-${VERSION}.js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          return `assets/[name]-[hash]-${VERSION}[extname]`
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
