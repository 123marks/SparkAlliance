<template>
  <canvas ref="canvasRef" class="particle-background"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number;

// We use two kinds of particles: the "net" particles and the new "stars".
let particles: Particle[] = [];
let stars: Star[] = [];
let mouse = { x: -1000, y: -1000 };

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  density: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  phase: number;
  color: string;
}

const colors = [
  'rgba(59, 130, 246, 0.7)', // blue-500
  'rgba(139, 92, 246, 0.7)', // violet-500
  'rgba(236, 72, 153, 0.7)', // pink-500
  'rgba(20, 184, 166, 0.7)'  // teal-500
];

const starColors = [
  '#ffffff',
  '#fef08a', // yellow-200
  '#bae6fd', // sky-200
  '#fbcfe8'  // pink-200
];

const initParticles = (canvas: HTMLCanvasElement) => {
  particles = [];
  stars = [];
  
  const particleCount = Math.floor((canvas.width * canvas.height) / 45000);
  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 1.2 + 0.4;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const density = Math.random() * 30 + 1;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particles.push({
      x, y, baseX: x, baseY: y, size, density, color
    });
  }

  const starCount = Math.floor((canvas.width * canvas.height) / 25000);
  for (let i = 0; i < starCount; i++) {
    const size = Math.random() * 0.8 + 0.2;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const twinkleSpeed = Math.random() * 0.015 + 0.003;
    const phase = Math.random() * Math.PI * 2;
    const color = starColors[Math.floor(Math.random() * starColors.length)];

    stars.push({
      x, y, size, twinkleSpeed, phase, color
    });
  }
};

const animate = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update & Draw Stars first (background layer)
  for (let i = 0; i < stars.length; i++) {
    let s = stars[i];
    s.phase += s.twinkleSpeed;
    const alpha = Math.abs(Math.sin(s.phase)) * 0.35;
    const isGlowing = alpha > 0.28;
    
    s.y -= 0.06;
    if (s.y < 0) {
      s.y = canvas.height;
      s.x = Math.random() * canvas.width;
    }

    ctx.beginPath();
    ctx.arc(s.x, s.y, isGlowing ? s.size * 1.2 : s.size, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.globalAlpha = alpha;
    
    ctx.shadowBlur = isGlowing ? 4 : 1;
    ctx.shadowColor = s.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }

  // Update & Draw Network Particles
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    
    // Calculate distance to mouse
    let dx = mouse.x - p.x;
    let dy = mouse.y - p.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    // Force field mechanics
    let maxDistance = 150;
    
    // Repel from mouse smoothly
    if (distance < maxDistance) {
      let forceDirectionX = dx / distance;
      let forceDirectionY = dy / distance;
      let force = (maxDistance - distance) / maxDistance;
      let directionX = forceDirectionX * force * p.density * 0.8;
      let directionY = forceDirectionY * force * p.density * 0.8;
      
      p.x -= directionX;
      p.y -= directionY;
    } else {
      // Return to base position with spring effect
      if (p.x !== p.baseX) {
        let dx = p.x - p.baseX;
        p.x -= dx / 15;
      }
      if (p.y !== p.baseY) {
        let dy = p.y - p.baseY;
        p.y -= dy / 15;
      }
    }
    
    // Subtle continuous floating motion if not heavily interacting
    if (distance >= maxDistance * 0.8) {
        p.y += Math.sin(Date.now() / 1000 + p.density) * 0.3;
        p.x += Math.cos(Date.now() / 1500 + p.density) * 0.3;
    }
    
    // Draw particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = p.color;
    
    ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 3;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }
  
  // Draw connecting lines based on proximity
  connectParticles(ctx);
  
  animationFrameId = requestAnimationFrame(() => animate(ctx, canvas));
};

const connectParticles = (ctx: CanvasRenderingContext2D) => {
  let opacityValue = 1;
  const maxDistance = 120;
  
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      let dx = particles[a].x - particles[b].x;
      let dy = particles[a].y - particles[b].y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < maxDistance) {
        opacityValue = 1 - (distance / maxDistance);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
};

const handleResize = () => {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
    initParticles(canvasRef.value); // Re-init on resize to fill new areas
  }
};

const handleMouseMove = (e: MouseEvent) => {
  mouse.x = e.x;
  mouse.y = e.y;
};

const handleMouseLeave = () => {
  mouse.x = -1000;
  mouse.y = -1000;
};

onMounted(() => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  initParticles(canvas);
  animate(ctx, canvas);
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseleave', handleMouseLeave);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.particle-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
  background: transparent;
  /* Add subtle fade-in transition on load */
  animation: fadeIn 2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
