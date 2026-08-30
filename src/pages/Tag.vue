<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Tag</div>
      <h1 class="section-title">
        标签
        <span class="page__meta">#{{ decodedTag }}</span>
      </h1>
      <p class="section-sub">
        标签「{{ decodedTag }}」下共 {{ taggedPosts.length }} 篇文章。
      </p>
    </header>

    <PostList :posts="taggedPosts" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PostList from "@components/PostList.vue";
import { allPosts } from "@lib/posts";
import { setHead } from "@lib/head";

const route = useRoute();

// 路由参数可能是 URL 编码的（中文/空格 tag），需解码
const decodedTag = computed(() => {
  const raw = String(route.params.tag ?? "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
});

const taggedPosts = computed(() =>
  allPosts.filter((post) => post.data.tags.includes(decodedTag.value)),
);

setHead({
  title: `#${decodedTag.value} 标签下的全部文章 | Flygeonの小站`,
  description: `浏览 Flygeonの小站 中标签为「${decodedTag.value}」的文章，共 ${taggedPosts.value.length} 篇，涵盖该主题下的开发笔记与相关分享。`,
});
</script>
