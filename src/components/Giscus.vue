<template>
  <div ref="container" class="giscus"></div>
</template>

<script setup lang="ts">
/**
 * Giscus 评论（GitHub Discussions）
 * - 客户端挂载：动态插入 giscus embed script（SSR 侧不渲染 iframe）
 * - 主题跟随：监听站点亮/暗主题，通过 postMessage 热切换 giscus 主题，
 *   不重建 iframe（评论输入状态不丢失）
 */
import { onMounted, ref, watch, onUnmounted } from "vue";
import { giscusConfig } from "@/config";
import { currentTheme } from "@lib/theme";

const container = ref<HTMLElement | null>(null);

function giscusTheme(): string {
  return currentTheme.value === "dark"
    ? giscusConfig.themes.dark
    : giscusConfig.themes.light;
}

/** 已挂载后向 giscus iframe 推送主题切换 */
function sendTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe.giscus-frame",
  );
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: giscusTheme() } } },
    "https://giscus.app",
  );
}

const unwatch = watch(currentTheme, () => sendTheme());

onMounted(() => {
  if (!container.value) return;
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-repo", giscusConfig.repo);
  s.setAttribute("data-repo-id", giscusConfig.repoId);
  s.setAttribute("data-category", giscusConfig.category);
  s.setAttribute("data-category-id", giscusConfig.categoryId);
  s.setAttribute("data-mapping", "pathname");
  s.setAttribute("data-strict", "1");
  s.setAttribute("data-reactions-enabled", "1");
  s.setAttribute("data-emit-metadata", "0");
  s.setAttribute("data-input-position", "top");
  s.setAttribute("data-theme", giscusTheme());
  s.setAttribute("data-lang", giscusConfig.lang);
  container.value.appendChild(s);
});

onUnmounted(() => unwatch());
</script>

<style scoped>
.giscus {
  margin-top: 0.5rem;
}
</style>
