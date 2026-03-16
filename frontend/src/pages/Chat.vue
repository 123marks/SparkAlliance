<template>
  <div class="chat-container">
    <GlassCard class="chat-card" padding="0">
      <div class="chat-layout">
        <!-- Sidebar -->
        <aside class="chat-sidebar">
          <div class="sidebar-header">
            <h3>历史记录</h3>
            <button class="new-chat-btn">+</button>
          </div>
          <div class="history-list">
            <div class="history-item active">当前对话: 校园规划</div>
            <div class="history-item">DeepSeek模型测试</div>
            <div class="history-item">作业辅导助手</div>
          </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="chat-main">
          <div class="chat-header">
            <div class="model-selector">
              <span class="status-dot"></span>
              <h2>DeepSeek-R1 (本地授权)</h2>
            </div>
          </div>

          <div class="message-area">
            <div class="message system">
              <div class="bubble">欢迎使用星火助手！我已经获得了本地大模型授权，可以为您提供无缝的AI辅助服务。</div>
            </div>
            <div class="message user">
              <div class="bubble">帮我安排一下下周的学习计划。</div>
            </div>
            <div class="message assistant">
              <div class="bubble">没问题！请告诉我你的专业以及下周主要需要完成哪些任务，我会为你制定一份科学的时间表。</div>
            </div>
          </div>

          <div class="input-area">
            <div class="input-wrapper">
              <input type="text" placeholder="给星火助手发送消息..." />
              <button class="send-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import GlassCard from '../components/GlassCard.vue'
</script>

<style scoped>
.chat-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  height: calc(100vh - 80px);
  padding-top: 5rem;
}

.chat-card {
  height: 100%;
  overflow: hidden;
  display: flex;
}

.chat-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.chat-sidebar {
  width: 250px;
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
}

.new-chat-btn {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.history-list {
  padding: 1rem;
  overflow-y: auto;
}

.history-item {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item:hover, .history-item.active {
  background: var(--glass-bg);
  color: var(--text-primary);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--glass-border);
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  background-color: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 10px #10b981;
}

.chat-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
}

.message-area {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message {
  display: flex;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
}

.bubble {
  padding: 1rem 1.25rem;
  border-radius: 16px;
  line-height: 1.5;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.user .bubble {
  background: var(--theme-color);
  border-bottom-right-radius: 4px;
}

.assistant .bubble, .system .bubble {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-bottom-left-radius: 4px;
}

.input-area {
  padding: 1.5rem;
  border-top: 1px solid var(--glass-border);
}

.input-wrapper {
  display: flex;
  gap: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 0.5rem;
  padding-left: 1.5rem;
}

input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 1rem;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--theme-color);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.send-btn:hover {
  transform: scale(1.05);
}
</style>
