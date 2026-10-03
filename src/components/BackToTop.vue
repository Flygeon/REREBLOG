<template>
  <!--
    返回顶部：长文下滚一段距离后浮现。
    SSR 阶段 visible 恒为 false，预渲染 HTML 不含按钮，不影响水合。
  -->
  <AnimatePresence>
    <motion.button
      v-if="visible"
      key="back-to-top"
      class="back-to-top"
      type="button"
      :aria-label="i18n(I18nKey.backToTop)"
      :title="i18n(I18nKey.backToTop)"
      :initial="{ opacity: 0, scale: 0.8, y: 12 }"
      :animate="{ opacity: 1, scale: 1, y: 0 }"
      :exit="{ opacity: 0, scale: 0.8, y: 12 }"
      :transition="{ type: 'spring', stiffness: 400, damping: 26 }"
      :whileHover="{ scale: 1.06 }"
      :whilePress="{ scale: 0.94 }"
      @click="scrollToTop"
    >
      <AppIcon name="arrow_upward" :size="24" />
    </motion.button>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { motion, AnimatePresence } from "motion-v";
import AppIcon from "@components/AppIcon.vue";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

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
  z-index: var(--z-fab);
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
  /* transform / opacity 由 motion-v 控制（spring），这里只留 box-shadow 过渡 */
  transition: box-shadow var(--md-sys-motion-duration-medium)
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
}
.back-to-top:hover::before {
  opacity: 0.08;
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
</style>