<template>
  <canvas ref="canvasRef" class="cosmic-bg"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 宇宙深空背景 v8.0
 * 适中密度星尘 + 大小分层 + 柔和闪烁 + 偶尔流星 + 星云光晕
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  enabled?: boolean
}>(), { enabled: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
let w = 0, h = 0

interface StarDust {
  x: number; y: number; size: number
  alpha: number; phase: number; speed: number
  color: string; layer: 'far' | 'mid' | 'near'
}

interface Meteor {
  x: number; y: number
  length: number; speed: number
  angle: number; alpha: number
  color: string; life: number; maxLife: number
}

interface Nebula {
  x: number; y: number; radius: number
  color: string; alpha: number
}

let dusts: StarDust[] = []
let meteors: Meteor[] = []
let nebulae: Nebula[] = []

const dustColors = ['#ffffff', '#bae6fd', '#fef08a', '#c4b5fd', '#fbcfe8', '#a5f3fc']
const meteorColors = ['#60a5fa', '#a78bfa', '#f87171', '#fbbf24']
const nebulaColors = ['rgba(139,92,246,0.015)', 'rgba(59,130,246,0.012)', 'rgba(236,72,153,0.01)', 'rgba(20,184,166,0.01)']

function init() {
  dusts = []; meteors = []; nebulae = []

  // 远景星 — 小而密，缓慢闪烁
  const farCount = Math.floor((w * h) / 18000)
  for (let i = 0; i < farCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 0.6 + 0.3,
      alpha: Math.random() * 0.15 + 0.05,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0008 + 0.0003,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'far'
    })
  }

  // 中景星 — 适中大小，明显闪烁
  const midCount = Math.floor((w * h) / 55000)
  for (let i = 0; i < midCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.0 + 0.6,
      alpha: Math.random() * 0.2 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0015 + 0.0005,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'mid'
    })
  }

  // 近景亮星 — 少量大而亮，带光晕
  const nearCount = Math.floor((w * h) / 250000)
  for (let i = 0; i < nearCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.2 + 1.0,
      alpha: Math.random() * 0.25 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.002 + 0.0008,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'near'
    })
  }

  // 星云光晕 — 极淡的彩色雾气
  const nebCount = Math.min(Math.floor((w * h) / 500000) + 1, 4)
  for (let i = 0; i < nebCount; i++) {
    nebulae.push({
      x: Math.random() * w, y: Math.random() * h,
      radius: Math.random() * 200 + 100,
      color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
      alpha: Math.random() * 0.02 + 0.005
    })
  }
}

function drawMeteor(ctx: CanvasRenderingContext2D, m: Meteor) {
  const tailX = m.x - Math.cos(m.angle) * m.length
  const tailY = m.y - Math.sin(m.angle) * m.length
  const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, m.color)
  ctx.save()
  const lifeRatio = 1 - Math.abs(m.life / m.maxLife - 0.5) * 2
  ctx.globalAlpha = m.alpha * lifeRatio * 0.7
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.strokeStyle = grad
  ctx.lineWidth = 1.5
  ctx.shadowBlur = 6
  ctx.shadowColor = m.color
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.restore()
}

function animate(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, w, h)

  // 1. 星云光晕（最底层）
  for (const n of nebulae) {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius)
    grad.addColorStop(0, n.color)
    grad.addColorStop(1, 'transparent')
    ctx.globalAlpha = n.alpha
    ctx.fillStyle = grad
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2)
    ctx.globalAlpha = 1
  }

  // 2. 星尘 — 分层渲染
  for (const d of dusts) {
    d.phase += d.speed
    const sineVal = Math.sin(d.phase) * 0.5 + 0.5

    let a: number
    let driftSpeed: number
    switch (d.layer) {
      case 'far':
        a = sineVal * 0.2 + 0.06
        driftSpeed = 0.015
        break
      case 'mid':
        a = sineVal * 0.3 + 0.12
        driftSpeed = 0.03
        break
      case 'near':
        a = sineVal * 0.35 + 0.2
        driftSpeed = 0.05
        break
    }

    d.y -= driftSpeed
    if (d.y < -2) { d.y = h + 2; d.x = Math.random() * w }

    ctx.beginPath()
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fillStyle = d.color
    ctx.globalAlpha = a
    ctx.fill()

    if (d.layer === 'near' && sineVal > 0.7) {
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = d.color
      ctx.globalAlpha = a * 0.08
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // 3. 流星 — 每 ~8秒一颗
  if (Math.random() < 0.0022) {
    const angle = Math.PI * 0.18 + Math.random() * 0.3
    meteors.push({
      x: Math.random() * w * 0.85,
      y: Math.random() * h * 0.35,
      length: Math.random() * 100 + 40,
      speed: Math.random() * 6 + 3,
      angle, alpha: Math.random() * 0.4 + 0.2,
      color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
      life: 0, maxLife: Math.random() * 50 + 30
    })
  }

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]
    m.x += Math.cos(m.angle) * m.speed
    m.y += Math.sin(m.angle) * m.speed
    m.life++
    if (m.life >= m.maxLife || m.x > w + 50 || m.y > h + 50) {
      meteors.splice(i, 1)
      continue
    }
    drawMeteor(ctx, m)
  }

  animationId = requestAnimationFrame(() => animate(ctx))
}

// ====== 生命周期 ======
function handleResize() {
  if (!canvasRef.value) return
  w = canvasRef.value.width = window.innerWidth
  h = canvasRef.value.height = window.innerHeight
  init()
}

onMounted(() => {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  w = canvasRef.value.width = window.innerWidth
  h = canvasRef.value.height = window.innerHeight

  if (props.enabled) {
    init()
    animate(ctx)
  }

  window.addEventListener('resize', handleResize)

  watch(() => props.enabled, (enabled) => {
    if (enabled) {
      if (!canvasRef.value) return
      const c = canvasRef.value.getContext('2d')
      if (!c) return
      init()
      animate(c)
    } else {
      cancelAnimationFrame(animationId)
      if (canvasRef.value) {
        const c = canvasRef.value.getContext('2d')
        if (c) c.clearRect(0, 0, w, h)
      }
    }
  })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.cosmic-bg {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.85;
  animation: cosmicFadeIn 2.5s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 0.85; }
}
</style>
