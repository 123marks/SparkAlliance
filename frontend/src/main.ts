import { createApp } from 'vue'
import './style.css'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
