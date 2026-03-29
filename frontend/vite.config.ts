import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 开发阶段：前端直接调用小米 MiMO API（绕过 CORS）
      '/api/mimo': {
        target: 'https://api.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/mimo/, '/v1'),
      },
    },
  },
})
