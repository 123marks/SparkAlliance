<template>
  <div class="chat-layout">
    <!-- Chat History Sidebar -->
    <aside class="chat-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="sidebar-top">
        <button class="new-chat-btn" @click="startNewChat">
          <span>+</span> 新对话
        </button>
      </div>

      <div class="history-list">
        <div class="h-group">
          <div class="h-title">今天</div>
          <div class="h-item active">深入理解操作系统内存管理</div>
          <div class="h-item">帮你润色学术论文摘要</div>
        </div>
        <div class="h-group">
          <div class="h-title">昨天</div>
          <div class="h-item">Vue 3 组合式 API 最佳实践</div>
          <div class="h-item">翻译文献：Transformer 架构</div>
          <div class="h-item">代码 debug：NullPointerException</div>
        </div>
      </div>
    </aside>

    <!-- Main Chat Window -->
    <main class="chat-main">
      <header class="chat-header">
        <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="header-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          <span class="brand-title">星火助手</span>
        </div>
        <div class="header-actions">
          <!-- 预留：未来接入RAG配置 -->
        </div>
      </header>

      <div class="chat-scrollarea" ref="scrollRef">
         <!-- Greeting Empty State (if no msgs) -->
         <div class="empty-state" v-if="messages.length === 0">
           <div class="ai-avatar-large">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"></path><path d="M19 8a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"></path><path d="M6 14a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"></path><path d="M17 16a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"></path><path d="M8 6a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"></path><path d="M9 10h6"></path><path d="M11 12v3"></path></svg>
           </div>
           <h2>我是星火助手</h2>
           <p>你的 AI 学习伙伴，有什么学业或生活上的问题，尽管问我吧。</p>
         </div>

        <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role">
          <div class="avatar" v-if="msg.role === 'ai'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
          </div>
          <div class="bubble">
            <p v-html="formatMessage(msg.content)"></p>
            <div v-if="msg.isTyping" class="typing-cursor"></div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-box">
          <button class="utility-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <textarea 
            v-model="inputText" 
            placeholder="给 Spark 发送消息..." 
            rows="1" 
            @keyup.enter.prevent="sendMessage"
          ></textarea>
          <button class="send-btn" @click="sendMessage" :disabled="isGenerating">发送 ⬆</button>
        </div>
        <div class="footer-tip">由星火 AI 引擎提供支持，生成内容仅供参考。</div>
      </div>
    </main>


  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const sidebarOpen = ref(false)

const inputText = ref('')
const isGenerating = ref(false)
const scrollRef = ref<HTMLElement | null>(null)

interface Message {
  role: 'user' | 'ai';
  content: string;
  isTyping?: boolean;
}

const messages = ref<Message[]>([
  {
    role: 'ai',
    content: '你好！我是星火校园智能助手。今天有什么我可以帮你的？你可以让我帮你：\n- 讲解复杂的专业课概念\n- 排查代码中的 Bug\n- 润色和翻译学术论文'
  },
  {
    role: 'user',
    content: '我想深入复习一下操作系统的内存管理机制，特别是分页（Paging）和分段（Segmentation）的区别，你能通俗地给我讲讲吗？'
  },
  {
    role: 'ai',
    content: '没问题！这是一个非常经典的考点。我们可以用一个**图书馆**的例子来通俗理解：\n\n**1. 分页（Paging）—— 像是一本被固定裁剪的杂志**\n假设有一本完整的书，系统不管内容，直接用裁纸刀把它等分成固定大小的“纸片”（这就是**页 Page**）。这种方式物理上非常整齐，方便操作系统在内存中找空位塞进去，但这一刀可能刚好把一句话切成了两半（物理划分，对程序员不透明）。\n\n**2. 分段（Segmentation）—— 像是一本书按目录拆分**\n这次系统按照书的逻辑结构（代码段、数据段、堆栈段）把书拆成不同厚度的“章节”（这就是**段 Segment**）。这种方式保持了逻辑的完整性，每一段都有具体的意义，程序员很容易能理解和保护特定的段（逻辑划分，对程序员透明）。'
  }
])

import DOMPurify from 'dompurify'



const formatMessage = (text: string) => {
  const html = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return DOMPurify.sanitize(html)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

const startNewChat = () => {
  messages.value = []
}

const sendMessage = async () => {
  if (!inputText.value.trim() || isGenerating.value) return
  
  const userMsg = inputText.value
  inputText.value = ''
  
  messages.value.push({
    role: 'user',
    content: userMsg
  })
  
  scrollToBottom()
  isGenerating.value = true
  
  // Fake mock streaming response
  const aiMsg: Message = {
    role: 'ai',
    content: '',
    isTyping: true
  }
  messages.value.push(aiMsg)
  scrollToBottom()
  
  const mockReply = `这是星火助手的模拟回复！\n你刚才说：${userMsg}\n接入 RAG 向量化引擎后，这里将展示基于项目知识库的智能回答。`
  
  let currentLength = 0
  const interval = setInterval(() => {
    if (currentLength < mockReply.length) {
      currentLength += 2
      aiMsg.content = mockReply.substring(0, currentLength)
      scrollToBottom()
    } else {
      clearInterval(interval)
      aiMsg.content = mockReply
      aiMsg.isTyping = false
      isGenerating.value = false
    }
  }, 50)
}
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: calc(100vh - 72px);
  width: 100%;
}

/* Sidebar History */
.chat-sidebar {
  width: 280px;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.sidebar-top { padding: 20px; }
.new-chat-btn {
  width: 100%;
  height: 48px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: white;
  font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.new-chat-btn:hover { background: rgba(79, 142, 247, 0.1); border-color: rgba(79, 142, 247, 0.3); color: var(--color-brand-blue); }

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 20px;
}

.h-group { margin-bottom: 24px; }
.h-title { font-size: 12px; color: var(--color-text-muted); padding: 0 12px; margin-bottom: 8px; font-weight: 600; }
.h-item {
  padding: 12px; border-radius: 8px; color: var(--color-text-secondary); font-size: 14px; margin-bottom: 2px;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: background 0.2s;
}
.h-item:hover { background: rgba(255,255,255,0.05); }
.h-item.active { background: rgba(79, 142, 247, 0.1); color: var(--color-brand-blue); font-weight: 500; }

/* Main Chat Window */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  position: relative;
}

.chat-header {
  height: 60px;
  border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
}

.mobile-menu-btn {
  display: none;
  background: transparent; border: none; font-size: 24px; color: white;
}

.header-brand { display: flex; align-items: center; gap: 8px; color: white; font-weight: 600; font-size: 15px; }
.brand-title { background: linear-gradient(135deg, #8b5cf6, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

.chat-scrollarea {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20%;
  display: flex; flex-direction: column; gap: 32px;
  scroll-behavior: smooth;
}

@media (max-width: 1200px) { .chat-scrollarea { padding: 40px 10%; } }
@media (max-width: 768px) { 
  .chat-scrollarea { padding: 24px 20px; } 
  .chat-sidebar { position: absolute; left: 0; z-index: 10; height: 100%; transform: translateX(-100%); }
  .chat-sidebar.is-open { transform: translateX(0); box-shadow: 10px 0 30px rgba(0,0,0,0.5); }
  .mobile-menu-btn { display: block; margin-right: 16px; }
}

.message-row { display: flex; gap: 20px; }
.message-row.user { justify-content: flex-end; }

.avatar { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
.ai-avatar-large { width: 80px; height: 80px; border-radius: 20px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; border: 1px solid rgba(255,255,255,0.1); }

.empty-state { text-align: center; margin: auto 0; color: var(--color-text-secondary); }
.empty-state h2 { color: white; margin-bottom: 12px; }

.bubble {
  max-width: 80%;
  line-height: 1.7;
  font-size: 15px;
}

.message-row.user .bubble {
  background: var(--color-bg-card);
  padding: 16px 20px; border-radius: 16px;
  border: 1px solid var(--color-border);
}

.message-row.ai .bubble { color: var(--color-text-primary); }
.message-row.ai .bubble p { margin-bottom: 16px; }

.typing-cursor { display: inline-block; width: 6px; height: 16px; background: var(--color-brand-blue); margin-left: 4px; animation: blink 1s step-end infinite; vertical-align: middle;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Input Area */
.chat-input-area { padding: 0 20% 24px; }
@media (max-width: 1200px) { .chat-input-area { padding: 0 10% 24px; } }
@media (max-width: 768px) { .chat-input-area { padding: 0 20px 24px; } }

.input-box {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex; align-items: flex-end; gap: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.input-box:focus-within { border-color: var(--color-brand-purple); box-shadow: 0 10px 40px rgba(139, 92, 246, 0.1); }

.utility-btn { background: transparent; border: none; font-size: 20px; padding: 8px; border-radius: 8px; color: var(--color-text-secondary); }
.utility-btn:hover { background: rgba(255,255,255,0.05); }

textarea {
  flex: 1; background: transparent; border: none; color: white;
  font-family: inherit; font-size: 15px; resize: none; padding: 12px 0;
  outline: none; max-height: 200px; line-height: 1.5;
}

.send-btn { background: var(--color-brand-blue); border: none; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin-bottom: 4px; transition: transform 0.2s; }
.send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(79, 142, 247, 0.4); }
.send-btn:disabled { opacity: 0.5; background: var(--color-border); }

.footer-tip { text-align: center; color: var(--color-text-muted); font-size: 12px; margin-top: 12px; }


</style>
