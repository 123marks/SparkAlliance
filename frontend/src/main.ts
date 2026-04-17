import { createApp } from 'vue'
import './style.css'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'
import App from './App.vue'
import router from './router'
import { initPersistSync } from './utils/persistSync'

const app = createApp(App)
app.use(router)
app.mount('#app')

// 启动后初始化本地↔Supabase 同步层（登录后会自动 full-sync）
initPersistSync()
