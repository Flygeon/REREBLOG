<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">About</div>
      <h1 class="section-title">关于</h1>
      <p class="section-sub">关于站长、这个小站与它的技术构成。</p>
    </header>

    <article class="markdown-body" v-html="html"></article>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { getSpec, getSpecHtml } from "@lib/posts";
import { setHead } from "@lib/head";
import { hydrateGithubCards } from "@lib/github-card";
import { hydrateMermaid } from "@lib/mermaid-view";

const html = ref("");

const spec = getSpec("about");

setHead({
  title: "关于 - Flygeon 与这个小站的故事 | Flygeonの小站",
  description:
    spec?.description ||
    "了解 Flygeon 和这个小站：站长的介绍、博客的技术构成（Vue 3 + Vite 自建 SSG）以及联系方式。",
});

/*
  正文插入 DOM 后再做客户端增强。用 flush: "post" 而非 nextTick()：
  本组件是含顶层 await 的异步 setup，setup 期间的 nextTick 会在挂载前 resolve，
  正文还没进 DOM，卡片/图表会漏渲染。post 回调排在渲染之后。
*/
watch(
  html,
  () => {
    hydrateGithubCards();
    void hydrateMermaid();
  },
  { flush: "post" },
);

if (spec) {
  html.value = (await getSpecHtml("about")) ?? "";
}
</script>
