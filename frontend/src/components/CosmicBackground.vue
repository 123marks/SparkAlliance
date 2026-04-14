<template>
  <canvas ref="canvasRef" class="cosmic-bg"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 宇宙深空背景 v7.4
 * 柔和星尘 + 偶尔流星 + 低频陨石漂移
 * 星星稀疏、闪烁极慢、亮度柔和
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  enabled?: boolean
}>(), { enabled: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
let w = 0, h = 0

// ====== 星尘 ======
interface StarDust {
  x: number; y: number; size: number
  alpha: number; phase: number; speed: number
  color: string
}

// ====== 流星 ======
interface Meteor {
  x: number; y: number
  length: number; speed: number
  angle: number; alpha: number
  color: string; life: number; maxLife: number
}

// ====== 陨石 ======
interface Asteroid {
  x: number; y: number
  size: number; rotation: number; rotSpeed: number
  vx: number; vy: number
  alpha: number; sides: number
}

let dusts: StarDust[] = []
let meteors: Meteor[] = []
let asteroids: Asteroid[] = []

// 柔和的星尘颜色
const dustColors = ['#fff', '#bae6fd', '#fef08a', '#c4b5fd']
const meteorColors = ['#60a5fa', '#a78bfa', '#f87171']

// ====== 初始化 ======
function init() {
  dusts = []; meteors = []; asteroids = []

  // 星尘 — 极度稀疏，隐约可见
  const dustCount = Math.floor((w * h) / 55000) // 1920x1080 ≈ 38颗
  for (let i = 0; i < dustCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 0.8 + 0.2, // 极小 0.2~1.0px
      alpha: Math.random() * 0.08, phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0005 + 0.0002, // 几乎不闪
      color: dustColors[Math.floor(Math.random() * dustColors.length)]
    })
  }

  // 陨石 — 极少，几乎不可见
  const astCount = Math.min(Math.floor((w * h) / 500000), 3) // 最多3个
  for (let i = 0; i < astCount; i++) {
    asteroids.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 12 + 3, // 3px ~ 15px，比之前小很多
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.003, // 更慢旋转
      vx: (Math.random() - 0.3) * 0.1,
      vy: Math.random() * 0.08 + 0.02, // 更慢漂移
      alpha: Math.random() * 0.08 + 0.02, // 更透明
      sides: Math.floor(Math.random() * 4) + 4
    })
  }
}

// ====== 绘制不规则多边形（陨石） ======
function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.rotate(a.rotation)
  ctx.globalAlpha = a.alpha
  ctx.beginPath()
  for (let i = 0; i < a.sides; i++) {
    const angle = (Math.PI * 2 / a.sides) * i
    const r = a.size * (0.7 + Math.sin(i * 2.3) * 0.3)
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  // 陨石填充 — 暗灰带微光
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, a.size)
  grad.addColorStop(0, 'rgba(80, 80, 100, 0.5)')
  grad.addColorStop(0.6, 'rgba(40, 40, 55, 0.3)')
  grad.addColorStop(1, 'rgba(20, 20, 30, 0.05)')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()
}

// ====== 绘制流星 ======
function drawMeteor(ctx: CanvasRenderingContext2D, m: Meteor) {
  const tailX = m.x - Math.cos(m.angle) * m.length
  const tailY = m.y - Math.sin(m.angle) * m.length
  const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, m.color)
  ctx.save()
  ctx.globalAlpha = m.alpha * (m.life / m.maxLife) * 0.6 // 流星也更柔和
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.strokeStyle = grad
  ctx.lineWidth = 1
  ctx.shadowBlur = 4
  ctx.shadowColor = m.color
  ctx.stroke()
  // 头部亮点
  ctx.beginPath()
  ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.restore()
}

// ====== 动画帧 ======
function animate(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, w, h)

  // 1. 星尘 — 极柔和闪烁
  for (const d of dusts) {
    d.phase += d.speed
    // 透明度范围 0.03 ~ 0.12，非常柔和
    const a = (Math.sin(d.phase) * 0.5 + 0.5) * 0.09 + 0.03
    // 超慢漂移
    d.y -= 0.02
    if (d.y < -2) { d.y = h + 2; d.x = Math.random() * w }

    ctx.beginPath()
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fillStyle = d.color
    ctx.globalAlpha = a
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // 2. 陨石漂移 + 旋转
  for (const a of asteroids) {
    a.x += a.vx
    a.y += a.vy
    a.rotation += a.rotSpeed
    if (a.y > h + a.size * 2) {
      a.y = -a.size * 2
      a.x = Math.random() * w
    }
    if (a.x < -a.size * 2 || a.x > w + a.size * 2) {
      a.x = Math.random() * w
      a.y = -a.size * 2
    }
    drawAsteroid(ctx, a)
  }

  // 3. 流星 — 稀疏出现，每 ~6秒一颗
  if (Math.random() < 0.003) {
    const angle = Math.PI * 0.18 + Math.random() * 0.25
    meteors.push({
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.3,
      length: Math.random() * 80 + 30, // 更短的尾巴
      speed: Math.random() * 5 + 3,
      angle, alpha: Math.random() * 0.3 + 0.15, // 更低亮度
      color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
      life: 0, maxLife: Math.random() * 40 + 25
    })
  }

  // 更新并绘制流星
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
  opacity: 0.25; /* v7.5: 极柔和背景 */
  animation: cosmicFadeIn 3s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 0.25; }
}
</style>
