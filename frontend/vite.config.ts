import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 禁止浏览器缓存，确保每次加载最新代码
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    hmr: {
      overlay: true, // 错误弹窗
    },
    proxy: {
      // NVIDIA GLM5 API 代理（绕过 CORS）
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/nvidia/, '/v1'),
      },
      // 小米 MiMO API 代理
      '/api/mimo': {
        target: 'https://api.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/mimo/, '/v1'),
      },
    },
  },
})
