<template>
  <!-- 页面下滑线性进度条：沿用模板 .scroll-progress > i 结构 -->
  <div class="scroll-progress" aria-hidden="true">
    <i :style="{ transform: `scaleX(${progress.toFixed(4)})` }"></i>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const progress = ref(0);
let ticking = false;

function update() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY || window.pageYOffset || 0;
    const max =
      document.documentElement.scrollHeight - window.innerHeight;
    progress.value = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    ticking = false;
  });
}

onMounted(() => {
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
});
onUnmounted(() => {
  window.removeEventListener("scroll", update);
  window.removeEventListener("resize", update);
});
</script>
