import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
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
