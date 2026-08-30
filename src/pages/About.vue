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
import { ref } from "vue";
import { getSpec } from "@lib/posts";
import { renderMarkdown } from "@lib/markdown";
import { setHead } from "@lib/head";

const html = ref("");

const spec = getSpec("about");

setHead({
  title: "关于 - Flygeon 与这个小站的故事 | Flygeonの小站",
  description:
    spec?.description ||
    "了解 Flygeon 和这个小站：站长的介绍、博客的技术构成（Vue 3 + Vite 自建 SSG）以及联系方式。",
});

if (spec) {
  html.value = await renderMarkdown(spec.body);
}
</script>
