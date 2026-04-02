<template>
  <canvas ref="canvasRef" class="cosmic-bg"></canvas>
</template>

<script setup lang="ts">
/**
 * CosmicBackground — 宇宙深空陨石背景
 * 流星划过 + 陨石缓慢漂移 + 星尘闪烁
 * 低透明度，不干扰前景内容
 * 支持 enabled prop 控制粒子是否渲染
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

// ====== 陨石坠落 —— 大型燃烧陨石拖着火焰尾迹坠落 ======
interface FallingMeteor {
  x: number; y: number
  size: number; speed: number; angle: number
  rotation: number; rotSpeed: number
  alpha: number; life: number; maxLife: number
  // 尾迹火焰粒子
  trail: { x: number; y: number; alpha: number; size: number; vx: number; vy: number }[]
}

// ====== 撞击闪光 ======
interface ImpactFlash {
  x: number; y: number; radius: number; alpha: number
  particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[]
}

let dusts: StarDust[] = []
let meteors: Meteor[] = []
let asteroids: Asteroid[] = []
let fallingMeteors: FallingMeteor[] = []
let impacts: ImpactFlash[] = []

const dustColors = ['#fff', '#bae6fd', '#fef08a', '#c4b5fd', '#fca5a5']
const meteorColors = ['#60a5fa', '#a78bfa', '#f87171', '#facc15']

// ====== 初始化 ======
function init() {
  dusts = []; meteors = []; asteroids = []; fallingMeteors = []; impacts = []

  // 星尘 — 一闪一亮，明显闪烁
  const dustCount = Math.floor((w * h) / 4000)
  for (let i = 0; i < dustCount; i++) {
    dusts.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.8 + 0.3,
      alpha: Math.random(), phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.04 + 0.01, // 更快闪烁
      color: dustColors[Math.floor(Math.random() * dustColors.length)]
    })
  }

  // 陋石 — 更多、大小更随机
  const astCount = Math.min(Math.floor((w * h) / 60000), 15)
  for (let i = 0; i < astCount; i++) {
    asteroids.push({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 32 + 4, // 4px ~ 36px 大小随机
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
      vx: (Math.random() - 0.3) * 0.2,
      vy: Math.random() * 0.18 + 0.04,
      alpha: Math.random() * 0.15 + 0.03,
      sides: Math.floor(Math.random() * 4) + 4 // 4-7 边不规则
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
    const r = a.size * (0.7 + Math.sin(i * 2.3) * 0.3) // 不规则半径
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  // 陨石填充 — 暗灰带微光
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, a.size)
  grad.addColorStop(0, 'rgba(80, 80, 100, 0.6)')
  grad.addColorStop(0.6, 'rgba(40, 40, 55, 0.4)')
  grad.addColorStop(1, 'rgba(20, 20, 30, 0.1)')
  ctx.fillStyle = grad
  ctx.fill()
  // 边缘微光
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)'
  ctx.lineWidth = 0.5
  ctx.stroke()
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
  ctx.globalAlpha = m.alpha * (m.life / m.maxLife)
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(m.x, m.y)
  ctx.strokeStyle = grad
  ctx.lineWidth = 1.5
  ctx.shadowBlur = 8
  ctx.shadowColor = m.color
  ctx.stroke()
  // 头部亮点
  ctx.beginPath()
  ctx.arc(m.x, m.y, 2, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.restore()
}

// ====== 动画帧 ======
function animate(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, w, h)

  // 1. 星尘闪烁
  for (const d of dusts) {
    d.phase += d.speed
    // 一闪一亮：大范围透明度变化 0.05 ~ 0.95
    const a = (Math.sin(d.phase) * 0.5 + 0.5) * 0.9 + 0.05
    // 超慢漂移
    d.y -= 0.05
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
    // 超出边界 → 重生
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

  // 3. 流星 — 更密更壮观
  if (Math.random() < 0.015) { // 平均每 ~1秒一颗
    const angle = Math.PI * 0.15 + Math.random() * 0.35 // 斜向下角度更随机
    meteors.push({
      x: Math.random() * w * 0.9,
      y: Math.random() * h * 0.35,
      length: Math.random() * 120 + 50, // 更长的尾巴
      speed: Math.random() * 8 + 4, // 速度更快
      angle, alpha: Math.random() * 0.6 + 0.3, // 更亮
      color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
      life: 0, maxLife: Math.random() * 50 + 30
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

  // 4. 陨石坠落 —— 大型燃烧陨石（每 ~5秒一颗）
  if (Math.random() < 0.003) {
    const angle = Math.PI * 0.25 + Math.random() * 0.25
    fallingMeteors.push({
      x: Math.random() * w * 0.7 + w * 0.1,
      y: -60,
      size: Math.random() * 30 + 20,
      speed: Math.random() * 3 + 2,
      angle,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      alpha: 0.6,
      life: 0,
      maxLife: Math.random() * 100 + 80,
      trail: []
    })
  }

  // 更新并绘制坠落陨石
  for (let i = fallingMeteors.length - 1; i >= 0; i--) {
    const fm = fallingMeteors[i]
    fm.x += Math.cos(fm.angle) * fm.speed
    fm.y += Math.sin(fm.angle) * fm.speed
    fm.rotation += fm.rotSpeed
    fm.life++
    const lifeRatio = fm.life / fm.maxLife

    // 生成火焰尾迹粒子
    for (let j = 0; j < 3; j++) {
      fm.trail.push({
        x: fm.x + (Math.random() - 0.5) * fm.size * 0.6,
        y: fm.y + (Math.random() - 0.5) * fm.size * 0.3,
        alpha: 0.8, size: Math.random() * 4 + 1,
        vx: (Math.random() - 0.5) * 1.5 - Math.cos(fm.angle) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - Math.sin(fm.angle) * 0.8
      })
    }

    // 更新尾迹粒子
    for (let j = fm.trail.length - 1; j >= 0; j--) {
      const p = fm.trail[j]
      p.x += p.vx; p.y += p.vy
      p.alpha -= 0.025; p.size *= 0.97
      if (p.alpha <= 0) fm.trail.splice(j, 1)
    }

    // 绘制尾迹火焰粒子
    for (const p of fm.trail) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      const heat = p.alpha > 0.5 ? '#fbbf24' : p.alpha > 0.3 ? '#f97316' : '#ef4444'
      ctx.fillStyle = heat
      ctx.globalAlpha = p.alpha * 0.5
      ctx.shadowBlur = 6
      ctx.shadowColor = heat
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    // 绘制陨石本体（带火焰光晕）
    ctx.save()
    ctx.translate(fm.x, fm.y)
    ctx.rotate(fm.rotation)
    ctx.globalAlpha = fm.alpha * (1 - lifeRatio * 0.5)
    // 火焰光晕
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, fm.size * 2)
    glow.addColorStop(0, 'rgba(251,191,36,0.15)')
    glow.addColorStop(0.4, 'rgba(249,115,22,0.08)')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(-fm.size * 2, -fm.size * 2, fm.size * 4, fm.size * 4)
    // 陨石本体
    ctx.beginPath()
    const sides = 6
    for (let s = 0; s < sides; s++) {
      const a = (Math.PI * 2 / sides) * s
      const r = fm.size * (0.65 + Math.sin(s * 3.1) * 0.35)
      if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fm.size)
    bodyGrad.addColorStop(0, 'rgba(200,120,50,0.7)')
    bodyGrad.addColorStop(0.5, 'rgba(100,60,30,0.5)')
    bodyGrad.addColorStop(1, 'rgba(50,30,15,0.3)')
    ctx.fillStyle = bodyGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(251,191,36,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // 到达底部或生命结束 → 撞击闪光
    if (fm.life >= fm.maxLife || fm.y > h + 30) {
      // 生成撞击效果
      const impactParticles: ImpactFlash['particles'] = []
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * Math.PI * 2
        const spd = Math.random() * 4 + 1
        impactParticles.push({
          x: fm.x, y: Math.min(fm.y, h - 10),
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2,
          alpha: 1, size: Math.random() * 3 + 1
        })
      }
      impacts.push({ x: fm.x, y: Math.min(fm.y, h - 10), radius: fm.size * 3, alpha: 0.6, particles: impactParticles })
      fallingMeteors.splice(i, 1)
    }
  }

  // 5. 撞击闪光 + 碎片扩散
  for (let i = impacts.length - 1; i >= 0; i--) {
    const imp = impacts[i]
    // 闪光圆
    if (imp.alpha > 0) {
      const flashGrad = ctx.createRadialGradient(imp.x, imp.y, 0, imp.x, imp.y, imp.radius)
      flashGrad.addColorStop(0, `rgba(251,191,36,${imp.alpha * 0.4})`)
      flashGrad.addColorStop(0.5, `rgba(249,115,22,${imp.alpha * 0.2})`)
      flashGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = flashGrad
      ctx.fillRect(imp.x - imp.radius, imp.y - imp.radius, imp.radius * 2, imp.radius * 2)
      imp.alpha -= 0.03; imp.radius += 1
    }
    // 碎片粒子
    let alive = false
    for (const p of imp.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08
      p.alpha -= 0.02; p.size *= 0.98
      if (p.alpha > 0) {
        alive = true
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.alpha > 0.5 ? '#fbbf24' : '#f97316'
        ctx.globalAlpha = p.alpha * 0.6
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    if (!alive && imp.alpha <= 0) impacts.splice(i, 1)
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

  // 仅在启用时启动动画
  if (props.enabled) {
    init()
    animate(ctx)
  }

  window.addEventListener('resize', handleResize)

  // 监听 enabled 变化，动态启停粒子
  watch(() => props.enabled, (enabled) => {
    if (enabled) {
      if (!canvasRef.value) return
      const c = canvasRef.value.getContext('2d')
      if (!c) return
      init()
      animate(c)
    } else {
      cancelAnimationFrame(animationId)
      // 清空画布
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
  opacity: 0.75; /* 提高透明度让流星/陨石坠落更明显 */
  animation: cosmicFadeIn 3s ease-out;
}

@keyframes cosmicFadeIn {
  from { opacity: 0; }
  to { opacity: 0.75; }
}
</style>
