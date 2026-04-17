<template>
  <!--
    SlotCounter — 密码锁式数字翻滚组件
    数字竖直方向滚动，像行李箱密码锁一样翻转到目标数字。
    支持不同滚动方向（奇偶位交替上/下）和错开延迟。
  -->
  <span class="slot-counter" :style="{ fontSize: size, color: color }">
    <span v-if="prefix" class="slot-affix">{{ prefix }}</span>
    <span class="slot-digits">
      <span
        v-for="(digit, i) in targetDigits"
        :key="i"
        class="slot-digit"
      >
        <!-- 渐隐遮罩：顶部和底部 -->
        <span class="slot-mask-top"></span>
        <span class="slot-mask-bottom"></span>
        <!-- 数字条：0-9 竖直排列 -->
        <span
          class="slot-strip"
          :style="stripStyle(digit, i)"
        >
          <span v-for="n in 10" :key="n" class="slot-num">{{ n - 1 }}</span>
        </span>
      </span>
    </span>
    <span v-if="suffix" class="slot-affix">{{ suffix }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** 目标数值 */
  value: number
  /** 是否激活滚动（true 时滚动到目标值，false 显示 0） */
  active?: boolean
  /** 前缀（如 ¥） */
  prefix?: string
  /** 后缀（如 +、%、h） */
  suffix?: string
  /** 字号 */
  size?: string
  /** 颜色 */
  color?: string
}>(), {
  active: false,
  prefix: '',
  suffix: '',
  size: '56px',
  color: 'inherit',
})

/** 把数值拆成单个数字数组 */
const targetDigits = computed(() => {
  return String(props.value).split('').map(Number)
})

/**
 * 计算每个数字条的 transform 样式
 * 奇数位向上滚动，偶数位向下滚动（视觉差异化）
 */
function stripStyle(digit: number, index: number) {
  if (!props.active) {
    // 未激活：停在 0
    return {
      transform: 'translateY(0)',
      transition: 'none',
    }
  }
  const delay = 0.15 + index * 0.12 // 级联延迟
  const isOdd = index % 2 === 1
  // 奇数位先翻过所有数字再回来（下→上），偶数位直接上翻
  const direction = isOdd ? 'down' : 'up'
  const offset = direction === 'up'
    ? -digit * 10 // 直接滚到目标位（向上）
    : -(10 - digit) * 10 + 100 // 反向：先到底再翻回（模拟向下）

  // 统一使用向上翻转，但奇偶位交替用不同缓动模拟方向感
  return {
    transform: `translateY(${-digit * 10}%)`,
    transition: `transform 1.5s cubic-bezier(${isOdd ? '0.34, 1.56, 0.64, 1' : '0.16, 1, 0.3, 1'}) ${delay}s`,
  }
}
</script>

<style scoped>
.slot-counter {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -2px;
}

.slot-affix {
  font-size: 0.57em;
  font-weight: 600;
  opacity: 0.8;
}

.slot-digits {
  display: inline-flex;
}

.slot-digit {
  position: relative;
  height: 1em;
  width: 0.65em;
  overflow: hidden;
  display: inline-block;
}

/* 顶底渐隐遮罩 — 3D 圆柱感 */
.slot-mask-top,
.slot-mask-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 25%;
  z-index: 2;
  pointer-events: none;
}
.slot-mask-top {
  top: 0;
  background: linear-gradient(to bottom, currentColor 0%, transparent 100%);
  opacity: 0.08;
}
.slot-mask-bottom {
  bottom: 0;
  background: linear-gradient(to top, currentColor 0%, transparent 100%);
  opacity: 0.08;
}

.slot-strip {
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.slot-num {
  height: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
