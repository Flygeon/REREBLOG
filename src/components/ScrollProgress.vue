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

/*
  可滚动高度（scrollHeight - innerHeight）缓存。

  关键：读 scrollHeight 是一次「布局读取」，会强制浏览器同步重排（forced reflow）。
  进度条滚动时每帧都会写 style（transform），若紧接着再读 scrollHeight，
  就构成 write → read 的强制同步重排 —— 实测每滚动一次触发一次
  （40 次滚动 = 41 次强制重排，是本站最密集的重排来源）。
  但滚动过程中文档高度并不会变，这个值只需在「尺寸真可能变化」时重测：
  挂载 / 窗口 resize / 内容高度变化（ResizeObserver）。
*/
let maxScroll = 0;
let resizeObserver: ResizeObserver | null = null;

/** 重测可滚动高度（唯一读布局的地方，仅在尺寸变化时调用） */
function measure() {
  maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  update();
}

function update() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    // 只读 scrollY（滚动偏移不触发布局计算），可滚动高度用缓存值
    const y = window.scrollY || window.pageYOffset || 0;
    progress.value = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;
    ticking = false;
  });
}

onMounted(() => {
  measure();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  // 内容高度变化（图片/字体加载、Mermaid 渲染、标签展开等）时重测
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
  }
});
onUnmounted(() => {
  window.removeEventListener("scroll", update);
  window.removeEventListener("resize", measure);
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>
