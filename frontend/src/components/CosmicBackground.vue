<template>
  <canvas ref="canvasRef" class="cosmic-bg" :style="{ opacity: props.intensity }"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 深邃星空 v12
 * 自然深空：柔和星尘 + 缓慢闪烁 + 偶尔流星 + 远景行星 + 淡雅星云 + 陨石坠落 + 极光 + 星尘粒子
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  enabled?: boolean
  intensity?: number
}>(), { enabled: true, intensity: 1 })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
let w = 0, h = 0
const prefersReducedMotion = ref(false)

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

interface Bolide {
  x: number; y: number; size: number; speed: number
  angle: number; alpha: number; color: string
  life: number; maxLife: number
  fragments: { x: number; y: number; vx: number; vy: number; a: number; size: number }[]
  fragmentPhase: number
}

interface DustParticle {
  x: number; y: number; size: number; alpha: number
  vx: number; vy: number; color: string; life: number; maxLife: number
}

interface AuroraWave {
  y: number; amplitude: number; frequency: number
  speed: number; phase: number; color: string; alpha: number; width: number
}

interface PulseStar {
  x: number; y: number; size: number; color: string
  pulsePhase: number; pulseSpeed: number
  nextPulse: number; isPulsing: boolean
}

let stars: Star[] = []
let meteors: Meteor[] = []
let nebulae: Nebula[] = []
let planets: Planet[] = []
let bolides: Bolide[] = []
let dustParticles: DustParticle[] = []
let auroraWaves: AuroraWave[] = []
let pulseStars: PulseStar[] = []

const starColors = ['#ffffff', '#c8d6e5', '#dfe6e9', '#a5b8cc', '#e8d5b7', '#b8c5d6', '#ffecd2', '#d4e0ff']
const meteorColors = ['#8ab4f8', '#a78bfa', '#fbbf24', '#34d399', '#f472b6']
const auroraColors = [
  'rgba(100,60,200,', 'rgba(60,180,120,', 'rgba(80,120,220,',
  'rgba(140,60,180,', 'rgba(40,160,160,'
]

function init() {
  stars = []; meteors = []; nebulae = []; planets = []; bolides = []
  dustParticles = []; auroraWaves = []; pulseStars = []
  const area = w * h

  const dimCount = Math.floor(area / 2400)
  for (let i = 0; i < dimCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.0 + 0.4,
      baseAlpha: Math.random() * 0.25 + 0.1,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.4 + 0.15,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      layer: 'dim'
    })
  }

  const normalCount = Math.floor(area / 5000)
  for (let i = 0; i < normalCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.5 + 0.8,
      baseAlpha: Math.random() * 0.3 + 0.15,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.6 + 0.25,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      layer: 'normal'
    })
  }

  const brightCount = Math.floor(area / 15000) + 10
  for (let i = 0; i < brightCount; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 2.2 + 1.2,
      baseAlpha: Math.random() * 0.35 + 0.25,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.9 + 0.35,
      color: starColors[Math.floor(Math.random() * 3)],
      layer: 'bright'
    })
  }

  const nebCount = Math.min(Math.floor(area / 80000) + 4, 8)
  for (let i = 0; i < nebCount; i++) {
    nebulae.push({
      x: Math.random() * w, y: Math.random() * h,
      radius: Math.random() * 450 + 200,
      color: ['rgba(80,60,160,', 'rgba(40,70,140,', 'rgba(100,50,120,', 'rgba(30,80,100,', 'rgba(60,40,130,', 'rgba(70,30,90,'][Math.floor(Math.random() * 6)],
      alpha: Math.random() * 0.04 + 0.015,
      driftX: (Math.random() - 0.5) * 0.03,
      driftY: (Math.random() - 0.5) * 0.02
    })
  }

  const planetColors = [
    { color: '#4a3530', glow: 'rgba(180,100,60,0.08)' },
    { color: '#2a3a4a', glow: 'rgba(80,120,180,0.07)' },
    { color: '#3a2a3a', glow: 'rgba(140,80,160,0.06)' },
  ]
  const pCount = Math.floor(Math.random() * 2) + 2
  for (let i = 0; i < pCount; i++) {
    const pc = planetColors[Math.floor(Math.random() * planetColors.length)]
    const hasRing = Math.random() > 0.6
    planets.push({
      x: Math.random() * w * 0.8 + w * 0.1,
      y: Math.random() * h * 0.5 + h * 0.1,
      radius: Math.random() * 20 + 10,
      color: pc.color, glowColor: pc.glow,
      alpha: Math.random() * 0.22 + 0.12,
      ringRadius: hasRing ? Math.random() * 12 + 8 : undefined,
      ringAlpha: hasRing ? 0.04 : undefined,
    })
  }

  const auroraCount = Math.floor(Math.random() * 2) + 1
  for (let i = 0; i < auroraCount; i++) {
    auroraWaves.push({
      y: h * 0.15 + Math.random() * h * 0.35,
      amplitude: Math.random() * 30 + 15,
      frequency: Math.random() * 0.003 + 0.001,
      speed: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
      color: auroraColors[Math.floor(Math.random() * auroraColors.length)],
      alpha: Math.random() * 0.02 + 0.008,
      width: Math.random() * 50 + 25,
    })
  }

  const pulseCount = Math.floor(area / 60000) + 4
  for (let i = 0; i < pulseCount; i++) {
    pulseStars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.5 + 1.0,
      color: starColors[Math.floor(Math.random() * 3)],
      pulsePhase: 0, pulseSpeed: Math.random() * 0.02 + 0.01,
      nextPulse: Math.random() * 600 + 200, isPulsing: false
    })
  }
}

function drawStar(ctx: CanvasRenderingContext2D, s: Star, time: number) {
  const twinkle = Math.sin(s.phase + time * s.twinkleSpeed) * 0.5 + 0.5
  const a = s.baseAlpha * (0.45 + twinkle * 0.55)

  ctx.globalAlpha = a
  ctx.fillStyle = s.color
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
  ctx.fill()

  if (s.layer === 'bright' && twinkle > 0.55) {
    ctx.globalAlpha = a * 0.18
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = a * 0.4
    ctx.strokeStyle = s.color
    ctx.lineWidth = 0.5
    const len = s.size * 3.5
    ctx.beginPath()
    ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y)
    ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len)
    ctx.stroke()
  }

  if (s.layer === 'normal' && twinkle > 0.7) {
    ctx.globalAlpha = a * 0.12
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size * 2.8, 0, Math.PI * 2)
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
  ctx.shadowBlur = 8
  ctx.shadowColor = m.color
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.stroke()

  ctx.shadowBlur = 4
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
    angle, alpha: Math.random() * 0.45 + 0.35,
    color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
    life: 0, maxLife: Math.random() * 60 + 35,
    width: Math.random() * 1.2 + 0.6, trail: []
  })
}

function spawnBolide() {
  const angle = Math.PI * 0.2 + Math.random() * 0.3
  bolides.push({
    x: Math.random() * w * 0.7, y: Math.random() * h * 0.25,
    size: Math.random() * 3.5 + 2.5, speed: Math.random() * 2.5 + 1.5,
    angle, alpha: Math.random() * 0.55 + 0.4,
    color: ['#fbbf24', '#f97316', '#ef4444', '#fb923c', '#f59e0b'][Math.floor(Math.random() * 5)],
    life: 0, maxLife: Math.random() * 140 + 90,
    fragments: [], fragmentPhase: 0.55 + Math.random() * 0.2
  })
}

function spawnDust() {
  dustParticles.push({
    x: Math.random() * w, y: Math.random() * h,
    size: Math.random() * 0.8 + 0.3,
    alpha: Math.random() * 0.3 + 0.1,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.15,
    color: starColors[Math.floor(Math.random() * starColors.length)],
    life: 0, maxLife: Math.random() * 400 + 200
  })
}

function drawBolide(ctx: CanvasRenderingContext2D, b: Bolide) {
  const ratio = b.life / b.maxLife
  const fadeIn = Math.min(1, ratio * 5)
  const fadeOut = ratio > 0.8 ? 1 - (ratio - 0.8) * 5 : 1
  const a = b.alpha * fadeIn * fadeOut

  ctx.save()
  ctx.globalAlpha = a
  ctx.shadowBlur = 14
  ctx.shadowColor = b.color

  const tailLen = b.size * 20
  const tailX = b.x - Math.cos(b.angle) * tailLen
  const tailY = b.y - Math.sin(b.angle) * tailLen
  const grad = ctx.createLinearGradient(tailX, tailY, b.x, b.y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.5, b.color)
  grad.addColorStop(1, '#ffffff')
  ctx.strokeStyle = grad
  ctx.lineWidth = b.size * 0.8
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()

  ctx.globalAlpha = a * 1.3
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = a * 0.45
  ctx.fillStyle = b.color
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.size * 3.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
  for (const f of b.fragments) {
    f.x += f.vx; f.y += f.vy; f.vy += 0.04; f.a *= 0.955
    if (f.a > 0.02) {
      ctx.globalAlpha = f.a * a
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawAurora(ctx: CanvasRenderingContext2D, aurora: AuroraWave, time: number) {
  ctx.save()
  ctx.globalAlpha = aurora.alpha * (0.6 + Math.sin(time * 0.2 + aurora.phase) * 0.4)
  ctx.beginPath()
  for (let x = 0; x <= w; x += 3) {
    const y = aurora.y + Math.sin(x * aurora.frequency + time * aurora.speed + aurora.phase) * aurora.amplitude
      + Math.sin(x * aurora.frequency * 0.5 + time * aurora.speed * 0.7) * aurora.amplitude * 0.5
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  const grad = ctx.createLinearGradient(0, aurora.y - aurora.width, 0, aurora.y + aurora.width)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.3, aurora.color + aurora.alpha * 0.6 + ')')
  grad.addColorStop(0.5, aurora.color + aurora.alpha + ')')
  grad.addColorStop(0.7, aurora.color + aurora.alpha * 0.6 + ')')
  grad.addColorStop(1, 'transparent')
  ctx.strokeStyle = grad
  ctx.lineWidth = aurora.width
  try { ctx.filter = 'blur(8px)' } catch {}
  ctx.stroke()
  try { ctx.filter = 'none' } catch {}
  ctx.restore()
}

function drawPulseStar(ctx: CanvasRenderingContext2D, ps: PulseStar) {
  if (!ps.isPulsing) return
  const intensity = Math.sin(ps.pulsePhase) * 0.5 + 0.5
  const a = intensity * 0.7

  ctx.save()
  ctx.globalAlpha = a * 0.2
  ctx.fillStyle = ps.color
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ps.size * 8 * intensity, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = a * 0.5
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ps.size * 3 * intensity, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = a
  ctx.beginPath()
  ctx.arc(ps.x, ps.y, ps.size * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Cross flare
  if (intensity > 0.5) {
    ctx.globalAlpha = a * 0.35
    ctx.strokeStyle = ps.color
    ctx.lineWidth = 0.6
    const len = ps.size * 6 * intensity
    ctx.beginPath()
    ctx.moveTo(ps.x - len, ps.y); ctx.lineTo(ps.x + len, ps.y)
    ctx.moveTo(ps.x, ps.y - len); ctx.lineTo(ps.x, ps.y + len)
    ctx.stroke()
  }
  ctx.restore()
}

let time = 0
let frameCount = 0
function animate(ctx: CanvasRenderingContext2D) {
  time += 0.016
  frameCount++

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
  bgGrad.addColorStop(0, '#06050e')
  bgGrad.addColorStop(0.4, '#0a0818')
  bgGrad.addColorStop(0.7, '#0d0a1a')
  bgGrad.addColorStop(1, '#080612')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // Nebulae
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

  // Aurora
  for (const a of auroraWaves) {
    drawAurora(ctx, a, time)
  }

  for (const p of planets) drawPlanet(ctx, p)
  for (const s of stars) drawStar(ctx, s, time)

  // Pulse stars
  for (const ps of pulseStars) {
    if (!ps.isPulsing) {
      ps.nextPulse--
      if (ps.nextPulse <= 0) {
        ps.isPulsing = true
        ps.pulsePhase = 0
      }
    } else {
      ps.pulsePhase += ps.pulseSpeed
      if (ps.pulsePhase >= Math.PI) {
        ps.isPulsing = false
        ps.nextPulse = Math.random() * 800 + 300
      }
    }
    drawPulseStar(ctx, ps)
  }

  // Spawn effects
  if (Math.random() < 0.008) spawnMeteor()
  if (Math.random() < 0.004) spawnBolide()
  if (dustParticles.length < 30 && Math.random() < 0.03) spawnDust()

  // Meteors
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

  // Bolides
  for (let i = bolides.length - 1; i >= 0; i--) {
    const b = bolides[i]
    b.x += Math.cos(b.angle) * b.speed
    b.y += Math.sin(b.angle) * b.speed
    b.life++
    if (b.life / b.maxLife > b.fragmentPhase && b.life % 3 === 0) {
      b.fragments.push({
        x: b.x, y: b.y,
        vx: (Math.random() - 0.5) * 2.5 + Math.cos(b.angle) * b.speed * 0.3,
        vy: (Math.random() - 0.5) * 2.5 + Math.sin(b.angle) * b.speed * 0.3,
        a: 0.7, size: Math.random() * 1.4 + 0.5
      })
    }
    b.fragments = b.fragments.filter(f => f.a > 0.02)
    if (b.life >= b.maxLife || b.x > w + 100 || b.y > h + 100) {
      bolides.splice(i, 1); continue
    }
    drawBolide(ctx, b)
  }

  // Dust particles
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const d = dustParticles[i]
    d.x += d.vx; d.y += d.vy; d.life++
    const lifeRatio = d.life / d.maxLife
    const fadeAlpha = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1
    if (d.life >= d.maxLife || d.x < -10 || d.x > w + 10 || d.y < -10 || d.y > h + 10) {
      dustParticles.splice(i, 1); continue
    }
    ctx.globalAlpha = d.alpha * fadeAlpha
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fill()
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

function drawStaticFrame(ctx: CanvasRenderingContext2D) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
  bgGrad.addColorStop(0, "#06050e")
  bgGrad.addColorStop(0.4, "#0a0818")
  bgGrad.addColorStop(0.7, "#0d0a1a")
  bgGrad.addColorStop(1, "#080612")
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  for (const n of nebulae) {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius)
    grad.addColorStop(0, n.color + n.alpha + ")")
    grad.addColorStop(1, "transparent")
    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2)
  }

  for (const s of stars) {
    ctx.globalAlpha = s.baseAlpha
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

onMounted(() => {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  w = canvasRef.value.width = window.innerWidth
  h = canvasRef.value.height = window.innerHeight

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  prefersReducedMotion.value = mq.matches
  mq.addEventListener("change", (e) => {
    prefersReducedMotion.value = e.matches
    if (e.matches) {
      cancelAnimationFrame(animationId)
      init()
      drawStaticFrame(ctx)
    } else if (props.enabled) {
      init()
      animate(ctx)
    }
  })

  if (props.enabled) {
    init()
    if (prefersReducedMotion.value) {
      drawStaticFrame(ctx)
    } else {
      animate(ctx)
    }
  }
  window.addEventListener('resize', handleResize)
  watch(() => props.enabled, (enabled) => {
    if (enabled) {
      if (!canvasRef.value) return
      const c = canvasRef.value.getContext('2d')
      if (!c) return
      init()
      if (prefersReducedMotion.value) {
        drawStaticFrame(c)
      } else {
        animate(c)
      }
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
  transition: opacity 0.6s ease;
  animation: cosmicFadeIn 2.5s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
