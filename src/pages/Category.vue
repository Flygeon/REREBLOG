<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Category</div>
      <h1 class="section-title">
        分类
        <span class="page__meta">{{ decodedCategory }}</span>
      </h1>
      <p class="section-sub">
        分类「{{ decodedCategory }}」下共 {{ categorizedPosts.length }} 篇文章。
      </p>
    </header>

    <PostList :posts="categorizedPosts" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PostList from "@components/PostList.vue";
import { allPosts } from "@lib/posts";
import { setHead } from "@lib/head";

const route = useRoute();

// 路由参数可能是 URL 编码的（中文分类名），需解码
const decodedCategory = computed(() => {
  const raw = String(route.params.category ?? "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
});

// 分类过滤：空/undefined 分类在 getCategoryList 里被归为"未分类"
const categorizedPosts = computed(() =>
  allPosts.filter(
    (post) => (post.data.category ?? null) === decodedCategory.value,
  ),
);

setHead({
  title: `分类「${decodedCategory.value}」下的全部文章 | Flygeonの小站`,
  description: `浏览 Flygeonの小站 中分类为「${decodedCategory.value}」的文章，共 ${categorizedPosts.value.length} 篇，按分类快速查找同主题内容。`,
});
</script>
