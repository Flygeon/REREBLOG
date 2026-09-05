<template>
  <!--
    返回顶部：长文下滚一段距离后浮现。
    SSR 阶段 visible 恒为 false，预渲染 HTML 不含按钮，不影响水合。
  -->
  <Transition name="backtop">
    <button
      v-if="visible"
      class="back-to-top"
      type="button"
      aria-label="返回顶部"
      title="返回顶部"
      @click="scrollToTop"
    >
      <AppIcon name="arrow_upward" :size="24" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";

/** 露出阈值：滚动超过一屏多一点再显示，避免短页面误扰 */
const SHOW_AFTER = 600;

const visible = ref(false);
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    visible.value = window.scrollY > SHOW_AFTER;
    ticking = false;
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: var(--md-elevation-2);
  cursor: pointer;
  transition:
    box-shadow var(--md-sys-motion-duration-medium)
      var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-medium)
      var(--md-sys-motion-easing-standard);
}
/* MD3 state layer：hover 用 on-surface 8% 叠加，亮暗自适应 */
.back-to-top::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}
.back-to-top:hover {
  box-shadow: var(--md-elevation-3);
  transform: translateY(-2px);
}
.back-to-top:hover::before {
  opacity: 0.08;
}
.back-to-top:active {
  transform: translateY(0);
}
/* 移动端避开右下角，留出边距 */
@media (max-width: 600px) {
  .back-to-top {
    right: 16px;
    bottom: 16px;
    width: 48px;
    height: 48px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .back-to-top {
    transition: none;
  }
}

/* 进出场：淡入 + 轻微上浮 */
.backtop-enter-active,
.backtop-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium)
      var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-medium)
      var(--md-sys-motion-easing-standard);
}
.backtop-enter-from,
.backtop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
