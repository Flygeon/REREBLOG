<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Search</div>
      <h1 class="section-title">搜索</h1>
      <p class="section-sub">按关键词检索文章标题、标签、分类与正文。</p>
    </header>

    <!-- 搜索输入 -->
    <div class="search__box">
      <AppIcon class="search__icon" name="search" :size="20" />
      <input
        v-model="query"
        class="search__input"
        type="search"
        placeholder="搜索文章标题、标签、正文…"
        aria-label="搜索文章"
        @input="onInput"
      />
      <button
        v-if="query"
        class="search__clear"
        type="button"
        aria-label="清空搜索"
        @click="clear"
      >
        <AppIcon name="close" :size="16" />
      </button>
    </div>

    <!-- 结果统计 -->
    <p v-if="query" class="search__stats" aria-live="polite">
      找到 {{ results.length }} 篇文章
    </p>

    <!-- 结果列表 -->
    <PostList v-if="query" :posts="results" />

    <!-- 空状态：未输入 -->
    <div v-if="!query" class="search__hint">
      <p>输入关键词开始搜索。</p>
      <div class="search__hot">
        <span class="search__hot-label">热门标签：</span>
        <a
          v-for="tag in hotTags"
          :key="tag.name"
          v-ripple
          class="search__hot-tag"
          :href="`/tags/${encodeURIComponent(tag.name)}/`"
          @click.prevent="query = tag.name"
        >
          #{{ tag.name }}
        </a>
      </div>
    </div>

    <!-- 空状态：无结果 -->
    <div v-if="query && results.length === 0" class="search__empty">
      <AppIcon class="search__empty-icon" name="search" :size="40" />
      <p class="search__empty-title">没有找到与「{{ query }}」相关的文章。</p>
      <p class="search__empty-tip">换个关键词，或看看下方的热门标签。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import PostList from "@components/PostList.vue";
import { allPosts, getPostBody } from "@lib/posts";
import { getTagList } from "@utils/content-utils";
import { setHead } from "@lib/head";

const query = ref("");

setHead({
  title: "站内搜索 - 全站文章检索 | Flygeonの小站",
  description:
    "在 Flygeonの小站 内按关键词搜索文章，快速定位开发笔记、项目分享与生活记录等已有内容。",
});

/** 热门标签（取出现最多的 8 个） */
const hotTags = computed(() =>
  getTagList(allPosts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8),
);

/** 全文搜索：标题/描述/标签/分类/正文 */
const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];

  return allPosts.filter((post) => {
    const body = getPostBody(post.slug) ?? "";
    const haystack = [
      post.data.title,
      post.data.description,
      post.data.category ?? "",
      post.data.tags.join(" "),
      body.toLowerCase(),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});

function onInput() {
  /* v-model 已处理 */
}

function clear() {
  query.value = "";
}
</script>
