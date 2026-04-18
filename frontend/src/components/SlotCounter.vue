<template>
  <!--
    SlotCounter — 密码锁式数字翻滚组件 v2
    数字会像行李箱密码锁一样滚过多圈再落到目标数字。
    支持前缀后缀、每位错开延迟、奇偶位不同缓动。
  -->
  <span class="slot-counter" :style="{ fontSize: size, color: color }">
    <span v-if="prefix" class="slot-affix">{{ prefix }}</span>
    <span class="slot-digits">
      <span
        v-for="(digit, i) in targetDigits"
        :key="i"
        class="slot-digit"
      >
        <span class="slot-mask-top"></span>
        <span class="slot-mask-bottom"></span>
        <!-- 数字条：0-9 重复 CYCLES+1 圈，用于翻滚效果 -->
        <span
          class="slot-strip"
          :style="stripStyle(digit, i)"
        >
          <span v-for="n in TOTAL_NUMS" :key="n" class="slot-num">{{ (n - 1) % 10 }}</span>
        </span>
      </span>
    </span>
    <span v-if="suffix" class="slot-affix">{{ suffix }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** 额外滚动圈数 — 密码锁经过几圈才停下 */
const CYCLES = 2
/** 总数字格数 */
const TOTAL_NUMS = 10 * (CYCLES + 1) // 30

const props = withDefaults(defineProps<{
  value: number
  active?: boolean
  prefix?: string
  suffix?: string
  size?: string
  color?: string
}>(), {
  active: false,
  prefix: '',
  suffix: '',
  size: '56px',
  color: 'inherit',
})

const targetDigits = computed(() => String(props.value).split('').map(Number))

/**
 * 计算每个数字条的 transform 样式
 * 每位数字滚过 CYCLES 个完整圈再停在目标数字
 */
function stripStyle(digit: number, index: number) {
  if (!props.active) {
    return { transform: 'translateY(0)', transition: 'none' }
  }
  // 目标位置：滚过 CYCLES 个完整圈 + 目标数字
  const targetPos = CYCLES * 10 + digit
  const pct = -(targetPos / TOTAL_NUMS) * 100
  const delay = 0.15 + index * 0.18
  const dur = 1.6 + index * 0.25 // 后面的位数滚得更久
  // 奇偶位不同缓动 → 机械感
  const ease = index % 2 === 0
    ? 'cubic-bezier(0.12, 0.8, 0.20, 1.0)'
    : 'cubic-bezier(0.25, 0.75, 0.15, 1.0)'
  return {
    transform: `translateY(${pct}%)`,
    transition: `transform ${dur}s ${ease} ${delay}s`,
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
