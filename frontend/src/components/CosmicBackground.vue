<template>
  <canvas ref="canvasRef" class="cosmic-bg"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 宇宙深空背景 v10.0
 * 超高密度星尘(5层) + 十字星芒 + 星云光晕 + 高频流星 + 脉冲星 + 微粒漂浮
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  enabled?: boolean
}>(), { enabled: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
let w = 0, h = 0
let frameCount = 0

interface StarDust {
  x: number; y: number; size: number
  alpha: number; phase: number; speed: number
  color: string; layer: 'dust' | 'far' | 'mid' | 'near' | 'bright'
  twinkleSpeed: number
}

interface Meteor {
  x: number; y: number
  length: number; speed: number
  angle: number; alpha: number
  color: string; life: number; maxLife: number
  width: number
  particles: { x: number; y: number; alpha: number; size: number; vx: number; vy: number }[]
}

interface Nebula {
  x: number; y: number; radius: number
  color: string; alpha: number
  driftX: number; driftY: number
  pulsePhase: number; pulseSpeed: number
}

interface PulseStar {
  x: number; y: number; baseSize: number
  phase: number; speed: number; color: string
  maxRing: number
}

let dusts: StarDust[] = []
let meteors: Meteor[] = []
let nebulae: Nebula[] = []
let pulseStars: PulseStar[] = []

const dustColors = ['#ffffff', '#bae6fd', '#fef08a', '#c4b5fd', '#fbcfe8', '#a5f3fc', '#d4d4d8', '#e2e8f0', '#fde68a', '#ddd6fe']
const meteorColors = ['#60a5fa', '#a78bfa', '#f87171', '#fbbf24', '#34d399', '#f472b6', '#818cf8', '#fb923c']
const nebulaColors = [
  'rgba(139,92,246,0.035)', 'rgba(59,130,246,0.03)',
  'rgba(236,72,153,0.025)', 'rgba(20,184,166,0.02)',
  'rgba(251,191,36,0.018)', 'rgba(99,102,241,0.03)',
  'rgba(244,114,182,0.02)', 'rgba(52,211,153,0.018)'
]

function init() {
  dusts = []; meteors = []; nebulae = []; pulseStars = []
  const area = w * h

  const dustCount = Math.floor(area / 400)
  for (let i = 0; i < dustCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 0.8 + 0.3,
      alpha: Math.random() * 0.35 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.003 + 0.001,
      twinkleSpeed: Math.random() * 0.8 + 0.3,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'dust'
    })
  }

  const farCount = Math.floor(area / 600)
  for (let i = 0; i < farCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.4 + 0.6,
      alpha: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.004 + 0.0015,
      twinkleSpeed: Math.random() * 1.0 + 0.4,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'far'
    })
  }

  const midCount = Math.floor(area / 1800)
  for (let i = 0; i < midCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 2.0 + 1.0,
      alpha: Math.random() * 0.6 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.003,
      twinkleSpeed: Math.random() * 1.4 + 0.6,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'mid'
    })
  }

  const nearCount = Math.floor(area / 6000) + 35
  for (let i = 0; i < nearCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 2.5 + 1.6,
      alpha: Math.random() * 0.6 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.003,
      twinkleSpeed: Math.random() * 1.8 + 0.7,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      layer: 'near'
    })
  }

  const brightCount = Math.floor(area / 20000) + 25
  for (let i = 0; i < brightCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 3.2 + 2.2,
      alpha: Math.random() * 0.65 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.004,
      twinkleSpeed: Math.random() * 1.8 + 0.8,
      color: dustColors[Math.floor(Math.random() * 4)],
      layer: 'bright'
    })
  }

  const nebCount = Math.min(Math.floor(area / 50000) + 12, 24)
  for (let i = 0; i < nebCount; i++) {
    nebulae.push({
      x: Math.random() * w, y: Math.random() * h,
      radius: Math.random() * 600 + 250,
      color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
      alpha: Math.random() * 0.1 + 0.04,
      driftX: (Math.random() - 0.5) * 0.15,
      driftY: (Math.random() - 0.5) * 0.1,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.003 + 0.001
    })
  }

  const pulseCount = Math.floor(area / 100000) + 5
  for (let i = 0; i < pulseCount; i++) {
    pulseStars.push({
      x: Math.random() * w, y: Math.random() * h,
      baseSize: Math.random() * 2.5 + 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.008,
      color: dustColors[Math.floor(Math.random() * 4)],
      maxRing: Math.random() * 25 + 15
    })
  }

  for (let i = 0; i < 5; i++) spawnMeteor()
}

function drawCrossSpike(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string) {
  ctx.save()
  ctx.globalAlpha = alpha * 0.7
  ctx.strokeStyle = color
  ctx.lineWidth = 1.0
  const len = size * 6
  ctx.beginPath()
  ctx.moveTo(x - len, y); ctx.lineTo(x + len, y)
  ctx.moveTo(x, y - len); ctx.lineTo(x, y + len)
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.3
  ctx.lineWidth = 0.6
  const dLen = len * 0.65
  ctx.beginPath()
  ctx.moveTo(x - dLen, y - dLen); ctx.lineTo(x + dLen, y + dLen)
  ctx.moveTo(x + dLen, y - dLen); ctx.lineTo(x - dLen, y + dLen)
  ctx.stroke()
  ctx.restore()
}

function drawMeteor(ctx: CanvasRenderingContext2D, m: Meteor) {
  const tailX = m.x - Math.cos(m.angle) * m.length
  const tailY = m.y - Math.sin(m.angle) * m.length
  const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.5, m.color + '40')
  grad.addColorStop(0.8, m.color)
  grad.addColorStop(1, '#ffffff')
  ctx.save()
  const lifeRatio = 1 - Math.abs(m.life / m.maxLife - 0.5) * 2
  ctx.globalAlpha = m.alpha * lifeRatio * 0.9
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.strokeStyle = grad
  ctx.lineWidth = m.width
  ctx.shadowBlur = 15
  ctx.shadowColor = m.color
  ctx.stroke()

  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(m.x, m.y, m.width + 1, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = m.alpha * lifeRatio
  ctx.fill()

  ctx.shadowBlur = 0
  for (const p of m.particles) {
    p.alpha *= 0.92
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.98
    p.vy *= 0.98
    if (p.alpha > 0.02) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = m.color
      ctx.globalAlpha = p.alpha * lifeRatio
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawPulseStar(ctx: CanvasRenderingContext2D, ps: PulseStar) {
  ps.phase += ps.speed
  const pulse = Math.sin(ps.phase) * 0.5 + 0.5
  const coreAlpha = 0.6 + pulse * 0.4

  ctx.save()
  ctx.globalAlpha = coreAlpha
  ctx.fillStyle = ps.color
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ps.baseSize, 0, Math.PI * 2)
  ctx.fill()

  const ringRadius = ps.baseSize + pulse * ps.maxRing
  ctx.globalAlpha = (1 - pulse) * 0.15
  ctx.strokeStyle = ps.color
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ringRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = coreAlpha * 0.25
  ctx.fillStyle = ps.color
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ps.baseSize * 4, 0, Math.PI * 2)
  ctx.fill()

  drawCrossSpike(ctx, ps.x, ps.y, ps.baseSize * 0.8, coreAlpha * 0.6, ps.color)
  ctx.restore()
}

function spawnMeteor() {
  const angle = Math.PI * 0.1 + Math.random() * 0.5
  meteors.push({
    x: Math.random() * w * 1.1 - w * 0.05,
    y: Math.random() * h * 0.6 - h * 0.1,
    length: Math.random() * 220 + 100,
    speed: Math.random() * 11 + 5,
    angle, alpha: Math.random() * 0.7 + 0.5,
    color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
    life: 0, maxLife: Math.random() * 90 + 50,
    width: Math.random() * 2.5 + 1.5,
    particles: []
  })
}

function animate(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, w, h)
  frameCount++

  for (const n of nebulae) {
    n.x += n.driftX
    n.y += n.driftY
    n.pulsePhase += n.pulseSpeed
    if (n.x < -n.radius) n.x = w + n.radius
    if (n.x > w + n.radius) n.x = -n.radius
    if (n.y < -n.radius) n.y = h + n.radius
    if (n.y > h + n.radius) n.y = -n.radius
    const pulseFactor = Math.sin(n.pulsePhase) * 0.3 + 1
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * pulseFactor)
    grad.addColorStop(0, n.color)
    grad.addColorStop(0.7, n.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.3})`))
    grad.addColorStop(1, 'transparent')
    ctx.globalAlpha = n.alpha * (0.8 + Math.sin(n.pulsePhase) * 0.2)
    ctx.fillStyle = grad
    const r = n.radius * pulseFactor
    ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2)
    ctx.globalAlpha = 1
  }

  for (const d of dusts) {
    d.phase += d.speed
    const sineVal = Math.sin(d.phase * d.twinkleSpeed) * 0.5 + 0.5

    let a: number
    let driftSpeed: number
    switch (d.layer) {
      case 'dust':
        a = sineVal * 0.2 + 0.08
        driftSpeed = 0.015
        break
      case 'far':
        a = sineVal * 0.45 + 0.2
        driftSpeed = 0.04
        break
      case 'mid':
        a = sineVal * 0.55 + 0.3
        driftSpeed = 0.07
        break
      case 'near':
        a = sineVal * 0.6 + 0.4
        driftSpeed = 0.1
        break
      case 'bright':
        a = sineVal * 0.5 + 0.55
        driftSpeed = 0.04
        break
    }

    d.y -= driftSpeed
    d.x += Math.sin(d.phase * 0.4) * 0.03
    if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w }

    ctx.beginPath()
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fillStyle = d.color
    ctx.globalAlpha = a
    ctx.fill()

    if ((d.layer === 'mid' && sineVal > 0.4) || d.layer === 'near') {
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.size * 4, 0, Math.PI * 2)
      ctx.fillStyle = d.color
      ctx.globalAlpha = a * 0.2
      ctx.fill()
    }

    if (d.layer === 'bright') {
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.size * 6, 0, Math.PI * 2)
      ctx.fillStyle = d.color
      ctx.globalAlpha = a * 0.22
      ctx.fill()
      drawCrossSpike(ctx, d.x, d.y, d.size, a, d.color)
    }

    if (d.layer === 'near' && sineVal > 0.6) {
      drawCrossSpike(ctx, d.x, d.y, d.size * 0.7, a * 0.55, d.color)
    }

    ctx.globalAlpha = 1
  }

  for (const ps of pulseStars) {
    drawPulseStar(ctx, ps)
  }

  if (Math.random() < 0.05) spawnMeteor()
  if (Math.random() < 0.012) { spawnMeteor(); spawnMeteor() }
  if (Math.random() < 0.003) { spawnMeteor(); spawnMeteor(); spawnMeteor() }

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]
    m.x += Math.cos(m.angle) * m.speed
    m.y += Math.sin(m.angle) * m.speed
    m.life++
    if (m.life % 1 === 0) {
      const spread = Math.random() * 2 - 1
      m.particles.push({
        x: m.x - Math.cos(m.angle) * Math.random() * 15,
        y: m.y - Math.sin(m.angle) * Math.random() * 15,
        alpha: 0.5 + Math.random() * 0.4,
        size: Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 1.2 + spread * 0.3,
        vy: (Math.random() - 0.5) * 1.2
      })
    }
    m.particles = m.particles.filter(p => p.alpha > 0.02)
    if (m.life >= m.maxLife || m.x > w + 80 || m.y > h + 80) {
      meteors.splice(i, 1)
      continue
    }
    drawMeteor(ctx, m)
  }

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
  opacity: 1;
  animation: cosmicFadeIn 2s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
