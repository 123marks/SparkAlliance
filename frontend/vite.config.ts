import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // v9: 固定端口 5180，被占用时直接报错而非自动切换，确保用户能察觉
    port: 5180,
    strictPort: true,
    host: true,
    // 禁止浏览器缓存，确保每次加载最新代码
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    hmr: {
      overlay: true, // 错误弹窗
    },
    // 注意：AI 调用全部走 Supabase Edge Function（服务端 NVIDIA_API_KEY），
    // 前端不再需要代理到 NVIDIA NIM 或其他任何模型 API。
    // 以下 proxy 仅在极少数开发场景下才会用到；生产环境完全不依赖。
    proxy: {},
  },
})
