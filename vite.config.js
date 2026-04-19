import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'

// 从 package.json 自动读取版本号
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
const VERSION = `v${pkg.version}`

export default defineConfig({
  plugins: [vue()],
  base: './',  // 使用相对路径
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${VERSION}.js`,
        chunkFileNames: `assets/[name]-[hash]-${VERSION}.js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          return `assets/[name]-[hash]-${VERSION}[extname]`
        },
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return

          if (id.includes('vue') || id.includes('vue-router')) {
            return 'vendor-framework'
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }
          if (id.includes('chart.js') || id.includes('@kurkle')) {
            return 'vendor-charts'
          }
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
