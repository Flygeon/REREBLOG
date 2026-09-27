<template>
  <!--
    亮暗切换的「拉绳灯泡」动画。
    纯装饰层：aria-hidden + pointer-events:none，不响应鼠标、不进无障碍树。
    仅在用户点击切换后才挂载（active 由 themeReveal 驱动），故不参与 SSR 首屏，
    不存在水合错配风险。
  -->
  <div v-if="active" class="theme-reveal" aria-hidden="true">
    <!-- 锚点：定位到切换按钮下方，灯泡与光晕都以它为圆心 -->
    <div
      class="theme-reveal__stage"
      :style="{ left: `${originX}px`, top: `${originY}px` }"
    >
      <!--
        光晕：以锚点为同心圆 scale 铺满全屏（盖在灯泡之上，像光把灯泡吞掉）。
        铺满的那一刻才真正切换主题 —— 整页重绘被不透明覆盖层遮挡、肉眼不可见，
        所以不掉帧。全程只动 transform / opacity（合成器线程）。
      -->
      <motion.div
        class="theme-reveal__wash"
        :style="{
          width: `${washSize}px`,
          height: `${washSize}px`,
          marginLeft: `${-washSize / 2}px`,
          marginTop: `${-washSize / 2}px`,
          background: washBg,
        }"
        :initial="{ scale: 0, opacity: 1 }"
        :animate="{ scale: washing ? 1 : 0, opacity: fading ? 0 : 1 }"
        :transition="washTransition"
      />

      <!-- 灯泡：柔和淡入 → 拉绳下拉 → 灯态翻转 → 被扩散的光晕盖住 -->
      <motion.div
        class="theme-reveal__bulb"
        :initial="{ scale: 0.92, opacity: 0, y: 0 }"
        :animate="{
          scale: 1,
          opacity: bulbGone ? 0 : 1,
          y: pulling ? 14 : 0,
        }"
        :transition="bulbTransition"
      >
        <svg class="theme-reveal__svg" viewBox="0 0 64 104" role="presentation">
          <defs>
            <radialGradient id="theme-bulb-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFD88A" stop-opacity="0.95" />
              <stop offset="55%" stop-color="#FFD166" stop-opacity="0.32" />
              <stop offset="100%" stop-color="#FFD166" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- 光晕（亮时显现，灭时隐去） -->
          <circle
            class="bulb__glow"
            cx="32"
            cy="30"
            r="30"
            fill="url(#theme-bulb-glow)"
            :style="{ opacity: bulbLit ? 1 : 0 }"
          />

          <!-- 玻璃泡：亮态暖黄，灭态灰白 -->
          <circle
            class="bulb__glass"
            cx="32"
            cy="30"
            r="17"
            :style="{ fill: bulbLit ? '#FFD54F' : '#C9CFD8' }"
          />

          <!-- 灯丝 -->
          <path
            class="bulb__filament"
            d="M28 38 L28 33 L30 26 L32 33 L34 26 L36 33 L36 38"
            :style="{
              stroke: bulbLit ? '#F57C00' : '#9AA0A6',
              opacity: bulbLit ? 1 : 0.45,
            }"
          />

          <!-- 灯头 -->
          <rect class="bulb__base" x="25" y="47" width="14" height="9" rx="2.5" />

          <!-- 拉绳 + 拉绳头（下拉的那一段） -->
          <line class="bulb__cord" x1="32" y1="56" x2="32" y2="82" />
          <circle class="bulb__knob" cx="32" cy="86" r="3.5" />
        </svg>
      </motion.div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { motion } from "motion-v";
import {
  commitTheme,
  currentTheme,
  themeReveal,
  type ThemeMode,
} from "@lib/theme";

/* 时间轴（ms）：淡入 → 下拉 → 灯态翻转 → 停顿 → 光晕铺满 → 铺满瞬间切主题 → 淡出 */
const APPEAR_MS = 150;
const PULL_MS = 150;
// 灯态翻转完成后再停一会，让人看清灯泡，然后再触发光晕/换主题
const HOLD_MS = 320;
const WASH_MS = 220;
const FADE_MS = 130;

const BULB_W = 84;
const BULB_H = 136;

const active = ref(false);
const pulling = ref(false);
const flipped = ref(false);
const washing = ref(false);
const fading = ref(false);
const bulbGone = ref(false);
const target = ref<ThemeMode>("light");
const washSize = ref(0);
const originX = ref(0);
const originY = ref(0);

/* 灯泡明暗：翻转前跟随当前主题，翻转后跟随目标主题 */
const bulbLit = computed(() =>
  flipped.value ? target.value === "light" : currentTheme.value === "light"
);

/* 光晕底色 = 目标主题底板色，中心稍亮一点，像"光从灯泡扩散" */
const washBg = computed(() =>
  target.value === "dark"
    ? "radial-gradient(circle, #191B1F 0%, #0F0F11 58%)"
    : "radial-gradient(circle, #FFFFFF 0%, #EAEFF5 58%)"
);

/* 拉绳手感：位移用松一点阻尼的弹簧（有回弹），缩放用稳一点的弹簧 */
const bulbTransition = {
  scale: { type: "spring", stiffness: 360, damping: 30 },
  y: { type: "spring", stiffness: 340, damping: 16 },
  opacity: { duration: 0.22, ease: "easeOut" },
};
const washTransition = {
  scale: { duration: WASH_MS / 1000, ease: [0.32, 0.72, 0, 1] },
  opacity: { duration: FADE_MS / 1000, ease: "easeOut" },
};

let timers: number[] = [];
function clearTimers() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}
function after(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}

/**
 * 计算动画锚点：主题切换按钮正下方，让灯泡与光晕从"开关"处出现，
 * 而不是屏幕正中。washSize 按锚点到四角的最远距离取直径，保证任一
 * 角落都能被铺满（锚点偏右上时，只用屏幕对角线会盖不住左下角）。
 */
function computeGeometry() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const btn = document.getElementById("theme-toggle");

  let centerX = w - 96;
  let bulbTop = 16;
  if (btn) {
    const r = btn.getBoundingClientRect();
    centerX = r.left + r.width / 2;
    bulbTop = r.bottom + 4;
  }
  originX.value = centerX;
  originY.value = bulbTop + BULB_H / 2;

  const dx = Math.max(originX.value, w - originX.value);
  const dy = Math.max(originY.value, h - originY.value);
  washSize.value = Math.ceil(2 * Math.hypot(dx, dy)) + 40;
}

watch(themeReveal, (req) => {
  if (!req) return;
  clearTimers();

  target.value = req.mode;
  computeGeometry();
  active.value = true;
  pulling.value = false;
  flipped.value = false;
  washing.value = false;
  fading.value = false;
  bulbGone.value = false;

  // 0) 先让灯泡柔和淡入就位（避免「一出现就在下拉」的突兀感）
  // 1) 拉到底：灯态翻转（亮↔灭），同时松手回弹
  after(APPEAR_MS, () => {
    pulling.value = true;
  });
  after(APPEAR_MS + PULL_MS, () => {
    flipped.value = true;
    pulling.value = false;
  });

  // 2) 稍作停顿让人看清灯态变化，随后光晕以灯泡为圆心扩散并盖住灯泡
  after(APPEAR_MS + PULL_MS + HOLD_MS, () => {
    washing.value = true;
    bulbGone.value = true;
  });

  // 3) 光晕铺满：此刻切换主题，整页重绘被不透明覆盖层遮挡
  after(APPEAR_MS + PULL_MS + HOLD_MS + WASH_MS, () => {
    commitTheme(target.value);
    fading.value = true;
  });

  // 4) 淡出完毕，卸载覆盖层
  after(APPEAR_MS + PULL_MS + HOLD_MS + WASH_MS + FADE_MS, () => {
    active.value = false;
    themeReveal.value = null;
  });
});

onUnmounted(clearTimers);
</script>

<style scoped>
.theme-reveal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
}

/* 0×0 锚点：子元素用负 margin 居中到该点（不用 transform，避免与 motion 冲突） */
.theme-reveal__stage {
  position: absolute;
  width: 0;
  height: 0;
}

.theme-reveal__wash {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  /* 盖在灯泡之上：光扩散时把灯泡「吞掉」，不靠灯泡自己淡出 */
  z-index: 2;
  will-change: transform, opacity;
}

.theme-reveal__bulb {
  position: absolute;
  left: 0;
  top: 0;
  margin-left: -42px;
  margin-top: -68px;
  z-index: 1;
  will-change: transform, opacity;
}

.theme-reveal__svg {
  display: block;
  width: 84px;
  height: 136px;
  /* 旋转 180°：灯泡倒吊（灯头/拉绳在上，玻璃泡在下） */
  transform: rotate(180deg);
}

.bulb__glow {
  transition: opacity 160ms ease;
}

.bulb__glass {
  stroke: #8e949c;
  stroke-width: 2;
  transition: fill 160ms ease;
}

.bulb__filament {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    stroke 160ms ease,
    opacity 160ms ease;
}

.bulb__base,
.bulb__knob {
  fill: #9aa0a6;
}

.bulb__cord {
  stroke: #9aa0a6;
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
