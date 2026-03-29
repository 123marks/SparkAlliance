<template>
  <!-- AI 伴侣对话界面 -->
  <div class="cc-container">
    <!-- 对话区 -->
    <div class="cc-messages" ref="scrollRef">
      <!-- 空状态 -->
      <div v-if="chatHistory.length === 0" class="cc-empty">
        <div class="cc-empty-icon">🌟</div>
        <h3>我是星火，你的 AI 伙伴</h3>
        <p>有什么学习或生活上的事情，尽管和我聊吧！</p>
        <div class="cc-suggestions">
          <button v-for="s in suggestions" :key="s" class="cc-sug-btn" @click="$emit('send', s)">{{ s }}</button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-for="(msg, i) in chatHistory" :key="i" class="cc-msg" :class="msg.role">
        <div v-if="msg.role === 'assistant'" class="cc-msg-avatar">🌟</div>
        <div class="cc-msg-bubble">
          <p v-html="formatMsg(msg.content)"></p>
          <div v-if="msg.role === 'assistant' && isTyping && i === chatHistory.length - 1" class="cc-typing"></div>
        </div>
      </div>

      <!-- AI正在输入 -->
      <div v-if="isTyping && chatHistory.length > 0 && chatHistory[chatHistory.length-1].role !== 'assistant'" class="cc-msg assistant">
        <div class="cc-msg-avatar">🌟</div>
        <div class="cc-msg-bubble">
          <div class="cc-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="cc-input-area">
      <div class="cc-input-box">
        <textarea
          v-model="inputText"
          placeholder="和星火说点什么..."
          rows="1"
          maxlength="2000"
          @keydown.enter.exact.prevent="handleSend"
        ></textarea>
        <button class="cc-send-btn" @click="handleSend" :disabled="!inputText.trim() || isTyping">
          {{ isTyping ? '⏳' : '⬆️' }}
        </button>
      </div>
      <div class="cc-hint">
        <button class="cc-clear" @click="$emit('clear')">🗑️ 清空对话</button>
        <span>AI 伴侣 · 理解你的情绪 · 陪伴你的成长</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import DOMPurify from 'dompurify'
import type { ChatMessage } from '../../composables/useCompanion'

const props = defineProps<{
  chatHistory: ChatMessage[]
  isTyping: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  clear: []
}>()

const inputText = ref('')
const scrollRef = ref<HTMLElement | null>(null)

const suggestions = [
  '📚 我今天学习效率很低，怎么办？',
  '😔 最近有点压力大...',
  '🎯 帮我梳理一下考研规划',
  '🌟 给我一些鼓励吧！',
]

function formatMsg(text: string): string {
  const html = text
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return DOMPurify.sanitize(html)
}

function handleSend() {
  if (!inputText.value.trim() || props.isTyping) return
  emit('send', inputText.value.trim())
  inputText.value = ''
}

// 自动滚动到底部
watch(() => props.chatHistory.length, () => {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
})
watch(() => props.isTyping, () => {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
})
</script>

<style scoped>
.cc-container{display:flex;flex-direction:column;height:calc(100vh - 160px);max-height:calc(100vh - 160px)}
.cc-messages{flex:1;overflow-y:auto;padding:16px 0;scroll-behavior:smooth}

.cc-empty{text-align:center;padding:40px 20px}
.cc-empty-icon{font-size:48px;margin-bottom:12px}
.cc-empty h3{font-size:16px;font-weight:700;color:rgba(255,255,255,.75);margin:0 0 6px}
.cc-empty p{font-size:12px;color:rgba(255,255,255,.3);margin:0 0 20px}
.cc-suggestions{display:flex;flex-direction:column;gap:6px;max-width:300px;margin:0 auto}
.cc-sug-btn{padding:10px 14px;border-radius:12px;border:1px solid rgba(139,92,246,.1);background:rgba(139,92,246,.04);color:rgba(139,92,246,.6);font-size:12px;cursor:pointer;text-align:left;transition:all .2s}
.cc-sug-btn:hover{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}

.cc-msg{display:flex;gap:8px;margin-bottom:12px;max-width:85%}
.cc-msg.user{margin-left:auto;flex-direction:row-reverse}
.cc-msg.assistant{margin-right:auto}
.cc-msg-avatar{width:28px;height:28px;border-radius:8px;background:rgba(139,92,246,.15);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.cc-msg-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.6}
.cc-msg.user .cc-msg-bubble{background:rgba(139,92,246,.12);color:rgba(255,255,255,.75)}
.cc-msg.assistant .cc-msg-bubble{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.6)}
.cc-msg-bubble :deep(strong){color:rgba(255,255,255,.8)}

.cc-typing{display:inline-block;width:6px;height:14px;background:rgba(139,92,246,.5);margin-left:4px;animation:blink 1s step-end infinite;vertical-align:middle}
.cc-typing-dots{display:flex;gap:4px;padding:4px 0}
.cc-typing-dots span{width:6px;height:6px;border-radius:50%;background:rgba(139,92,246,.3);animation:dot 1.4s infinite}
.cc-typing-dots span:nth-child(2){animation-delay:.2s}
.cc-typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.cc-input-area{padding:12px 0 0;border-top:1px solid rgba(255,255,255,.04)}
.cc-input-box{display:flex;gap:8px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);transition:border-color .2s}
.cc-input-box:focus-within{border-color:rgba(139,92,246,.15)}
.cc-input-box textarea{flex:1;background:transparent;border:none;color:white;font-size:13px;resize:none;outline:none;line-height:1.5;font-family:inherit;max-height:120px}
.cc-input-box textarea::placeholder{color:rgba(255,255,255,.2)}
.cc-send-btn{padding:6px 14px;border-radius:10px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.7);font-size:16px;cursor:pointer;flex-shrink:0;transition:all .2s}
.cc-send-btn:hover:not(:disabled){background:rgba(139,92,246,.25)}
.cc-send-btn:disabled{opacity:.3;cursor:default}

.cc-hint{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:10px;color:rgba(255,255,255,.15)}
.cc-clear{background:none;border:none;color:rgba(255,255,255,.15);font-size:10px;cursor:pointer;transition:color .2s}
.cc-clear:hover{color:rgba(239,68,68,.4)}
</style>
