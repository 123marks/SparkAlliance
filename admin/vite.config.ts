import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // 固定 5181，被占用直接报错，避免悄悄换端口
    port: 5181,
    strictPort: true,
    host: true,
  },
})
