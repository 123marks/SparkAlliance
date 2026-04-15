<template>
  <canvas ref="canvasRef" class="cosmic-bg"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 深邃星空 v11
 * 自然深空：柔和星尘 + 缓慢闪烁 + 偶尔流星 + 远景行星 + 淡雅星云
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  enabled?: boolean
}>(), { enabled: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
let w = 0, h = 0

interface Star {
  x: number; y: number; size: number
  baseAlpha: number; phase: number
  twinkleSpeed: number; color: string
  layer: 'dim' | 'normal' | 'bright'
}

interface Meteor {
  x: number; y: number; length: number; speed: number
  angle: number; alpha: number; color: string
  life: number; maxLife: number; width: number
  trail: { x: number; y: number; a: number }[]
}

interface Nebula {
  x: number; y: number; radius: number
  color: string; alpha: number
  driftX: number; driftY: number
}

interface Planet {
  x: number; y: number; radius: number
  color: string; glowColor: string; alpha: number
  ringRadius?: number; ringAlpha?: number
}

let stars: Star[] = []
let meteors: Meteor[] = []
let nebulae: Nebula[] = []
let planets: Planet[] = []

const starColors = ['#ffffff', '#c8d6e5', '#dfe6e9', '#a5b8cc', '#e8d5b7', '#b8c5d6']
const meteorColors = ['#8ab4f8', '#a78bfa', '#fbbf24', '#34d399']

function init() {
  stars = []; meteors = []; nebulae = []; planets = []
  const area = w * h

  const dimCount = Math.floor(area / 2000)
  for (let i = 0; i < dimCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 0.6 + 0.2,
      baseAlpha: Math.random() * 0.12 + 0.04,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.3 + 0.1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      layer: 'dim'
    })
  }

  const normalCount = Math.floor(area / 5000)
  for (let i = 0; i < normalCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.0 + 0.5,
      baseAlpha: Math.random() * 0.2 + 0.1,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.5 + 0.2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      layer: 'normal'
    })
  }

  const brightCount = Math.floor(area / 30000) + 8
  for (let i = 0; i < brightCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.5 + 1.0,
      baseAlpha: Math.random() * 0.25 + 0.2,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.8 + 0.3,
      color: starColors[Math.floor(Math.random() * 3)],
      layer: 'bright'
    })
  }

  const nebCount = Math.min(Math.floor(area / 120000) + 3, 6)
  for (let i = 0; i < nebCount; i++) {
    nebulae.push({
      x: Math.random() * w, y: Math.random() * h,
      radius: Math.random() * 400 + 200,
      color: ['rgba(80,60,160,', 'rgba(40,70,140,', 'rgba(100,50,120,', 'rgba(30,80,100,'][Math.floor(Math.random() * 4)],
      alpha: Math.random() * 0.015 + 0.005,
      driftX: (Math.random() - 0.5) * 0.04,
      driftY: (Math.random() - 0.5) * 0.03
    })
  }

  const planetColors = [
    { color: '#3a2520', glow: 'rgba(180,100,60,0.06)' },
    { color: '#1a2a3a', glow: 'rgba(80,120,180,0.05)' },
    { color: '#2a1a2a', glow: 'rgba(140,80,160,0.04)' },
  ]
  const pCount = Math.floor(Math.random() * 2) + 1
  for (let i = 0; i < pCount; i++) {
    const pc = planetColors[Math.floor(Math.random() * planetColors.length)]
    const hasRing = Math.random() > 0.6
    planets.push({
      x: Math.random() * w * 0.8 + w * 0.1,
      y: Math.random() * h * 0.5 + h * 0.1,
      radius: Math.random() * 20 + 10,
      color: pc.color, glowColor: pc.glow,
      alpha: Math.random() * 0.12 + 0.06,
      ringRadius: hasRing ? Math.random() * 12 + 8 : undefined,
      ringAlpha: hasRing ? 0.04 : undefined,
    })
  }
}

function drawStar(ctx: CanvasRenderingContext2D, s: Star, time: number) {
  const twinkle = Math.sin(s.phase + time * s.twinkleSpeed) * 0.5 + 0.5
  const a = s.baseAlpha * (0.4 + twinkle * 0.6)

  ctx.globalAlpha = a
  ctx.fillStyle = s.color
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
  ctx.fill()

  if (s.layer === 'bright' && twinkle > 0.6) {
    ctx.globalAlpha = a * 0.15
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = a * 0.35
    ctx.strokeStyle = s.color
    ctx.lineWidth = 0.4
    const len = s.size * 3
    ctx.beginPath()
    ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y)
    ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len)
    ctx.stroke()
  }

  if (s.layer === 'normal' && twinkle > 0.75) {
    ctx.globalAlpha = a * 0.1
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMeteor(ctx: CanvasRenderingContext2D, m: Meteor) {
  const lifeRatio = 1 - Math.abs(m.life / m.maxLife - 0.4) * 2.5
  const effectiveAlpha = Math.max(0, m.alpha * Math.min(1, lifeRatio)) * 0.7

  const tailX = m.x - Math.cos(m.angle) * m.length
  const tailY = m.y - Math.sin(m.angle) * m.length
  const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.7, m.color)
  grad.addColorStop(1, '#ffffff')

  ctx.save()
  ctx.globalAlpha = effectiveAlpha
  ctx.strokeStyle = grad
  ctx.lineWidth = m.width
  ctx.shadowBlur = 6
  ctx.shadowColor = m.color
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.stroke()

  ctx.shadowBlur = 3
  ctx.globalAlpha = effectiveAlpha * 1.2
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(m.x, m.y, m.width * 0.8, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
  for (const t of m.trail) {
    t.a *= 0.93
    if (t.a > 0.01) {
      ctx.globalAlpha = t.a * effectiveAlpha * 0.5
      ctx.fillStyle = m.color
      ctx.beginPath()
      ctx.arc(t.x + (Math.random() - 0.5) * 0.5, t.y + (Math.random() - 0.5) * 0.5, 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet) {
  ctx.save()
  ctx.globalAlpha = p.alpha
  const grad = ctx.createRadialGradient(
    p.x - p.radius * 0.3, p.y - p.radius * 0.3, 0,
    p.x, p.y, p.radius
  )
  grad.addColorStop(0, p.color.replace(')', ',0.8)').replace('#', 'rgba(').replace(/rgba\(([0-9a-f]{6})/i, (_, hex) => {
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
    return `rgba(${r},${g},${b}`
  }))
  grad.addColorStop(1, 'transparent')

  ctx.fillStyle = p.glowColor
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = p.alpha * 1.5
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  ctx.fill()

  if (p.ringRadius && p.ringAlpha) {
    ctx.globalAlpha = p.ringAlpha
    ctx.strokeStyle = 'rgba(200,200,220,0.15)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(p.x, p.y, p.radius + p.ringRadius, (p.radius + p.ringRadius) * 0.35, Math.PI * 0.15, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function spawnMeteor() {
  const angle = Math.PI * 0.12 + Math.random() * 0.35
  meteors.push({
    x: Math.random() * w * 0.9, y: Math.random() * h * 0.4,
    length: Math.random() * 120 + 60, speed: Math.random() * 6 + 3,
    angle, alpha: Math.random() * 0.4 + 0.3,
    color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
    life: 0, maxLife: Math.random() * 60 + 35,
    width: Math.random() * 1.2 + 0.6, trail: []
  })
}

let time = 0
function animate(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, w, h)
  time += 0.016

  for (const n of nebulae) {
    n.x += n.driftX; n.y += n.driftY
    if (n.x < -n.radius) n.x = w + n.radius
    if (n.x > w + n.radius) n.x = -n.radius
    if (n.y < -n.radius) n.y = h + n.radius
    if (n.y > h + n.radius) n.y = -n.radius
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius)
    grad.addColorStop(0, n.color + n.alpha + ')')
    grad.addColorStop(1, 'transparent')
    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2)
  }

  for (const p of planets) drawPlanet(ctx, p)
  for (const s of stars) drawStar(ctx, s, time)

  if (Math.random() < 0.003) spawnMeteor()

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]
    m.x += Math.cos(m.angle) * m.speed
    m.y += Math.sin(m.angle) * m.speed
    m.life++
    if (m.life % 3 === 0) {
      m.trail.push({ x: m.x, y: m.y, a: 0.3 })
    }
    m.trail = m.trail.filter(t => t.a > 0.01)
    if (m.life >= m.maxLife || m.x > w + 50 || m.y > h + 50) {
      meteors.splice(i, 1); continue
    }
    drawMeteor(ctx, m)
  }

  ctx.globalAlpha = 1
  animationId = requestAnimationFrame(() => animate(ctx))
}

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
  if (props.enabled) { init(); animate(ctx) }
  window.addEventListener('resize', handleResize)
  watch(() => props.enabled, (enabled) => {
    if (enabled) {
      if (!canvasRef.value) return
      const c = canvasRef.value.getContext('2d')
      if (!c) return
      init(); animate(c)
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
  opacity: 1;
  animation: cosmicFadeIn 2.5s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
