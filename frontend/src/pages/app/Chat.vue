<template>
  <div class="chat-layout">
    <!-- Chat History Sidebar -->
    <aside class="chat-sidebar">
      <div class="sidebar-top">
        <button class="new-chat-btn">
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
        <div class="model-selector">
          <span class="m-icon">⚡</span>
          <select class="m-select">
            <option>Spark Local (DeepSeek R1)</option>
            <option>Cloud Mode (Doubao)</option>
          </select>
          <span class="m-caret">▼</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn">⚙️</button>
        </div>
      </header>

      <div class="chat-scrollarea">
         <!-- Greeting Empty State (if no msgs)
         <div class="empty-state">
           <div class="ai-avatar-large">大脑</div>
           <h2>我是 Spark 智能助手</h2>
           <p>有什么学业或生活上的问题，尽管问我吧。</p>
         </div>
         -->

        <div class="message-row ai">
          <div class="avatar">🧠</div>
          <div class="bubble">
            <p>你好！我是星火校园智能助手。今天有什么我可以帮你的？你可以让我帮你：</p>
            <ul>
              <li>讲解复杂的专业课概念</li>
              <li>排查代码中的 Bug</li>
              <li>润色和翻译学术论文</li>
            </ul>
          </div>
        </div>

        <div class="message-row user">
          <div class="bubble">
            <p>我想深入复习一下操作系统的内存管理机制，特别是分页（Paging）和分段（Segmentation）的区别，你能通俗地给我讲讲吗？</p>
          </div>
        </div>

        <div class="message-row ai">
          <div class="avatar">🧠</div>
          <div class="bubble">
            <p>没问题！这是一个非常经典的考点。我们可以用一个**图书馆**的例子来通俗理解：</p>
            <p><strong>1. 分页（Paging）—— 像是一本被固定裁剪的杂志</strong><br>
            假设有一本完整的书，系统不管内容，直接用裁纸刀把它等分成固定大小的“纸片”（这就是<strong>页 Page</strong>）。这种方式物理上非常整齐，方便操作系统在内存中找空位塞进去，但这一刀可能刚好把一句话切成了两半（物理划分，对程序员不透明）。</p>

            <p><strong>2. 分段（Segmentation）—— 像是一本书按目录拆分</strong><br>
            这次系统按照书的逻辑结构（代码段、数据段、堆栈段）把书拆成不同厚度的“章节”（这就是<strong>段 Segment</strong>）。这种方式保持了逻辑的完整性，每一段都有具体的意义，程序员很容易能理解和保护特定的段（逻辑划分，对程序员透明）。</p>

            <div class="typing-cursor"></div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-box">
          <button class="utility-btn">➕</button>
          <textarea placeholder="给 Spark 发送消息..." rows="1"></textarea>
          <button class="send-btn">发送 ⬆</button>
        </div>
        <div class="footer-tip">由本地大模型提供支持，生成内容仅供参考。你的数据将被严格保存在本地。</div>
      </div>
    </main>
  </div>
</template>

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

.model-selector { position: relative; display: flex; align-items: center; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 6px 12px; border: 1px solid var(--color-border); }
.m-select { appearance: none; background: transparent; border: none; color: white; outline: none; padding-right: 16px; margin-left: 8px; font-weight: 500; cursor: pointer; }
.m-caret { position: absolute; right: 8px; font-size: 10px; color: var(--color-text-muted); pointer-events: none;}

.chat-scrollarea {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20%;
  display: flex; flex-direction: column; gap: 32px;
}

@media (max-width: 1200px) { .chat-scrollarea { padding: 40px 10%; } }
@media (max-width: 768px) { .chat-scrollarea { padding: 24px 20px; } }

.message-row { display: flex; gap: 20px; }
.message-row.user { justify-content: flex-end; }

.avatar { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }

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
.message-row.ai .bubble ul { margin-left: 20px; margin-bottom: 16px; color: var(--color-text-secondary); }
.message-row.ai .bubble strong { color: white; font-weight: 600; }

.typing-cursor { display: inline-block; width: 6px; height: 16px; background: var(--color-brand-blue); margin-left: 4px; animation: blink 1s step-end infinite; vertical-align: middle;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Input Area */
.chat-input-area {
  padding: 0 20% 24px;
}
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
.send-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(79, 142, 247, 0.4); }

.footer-tip { text-align: center; color: var(--color-text-muted); font-size: 12px; margin-top: 12px; }
</style>
