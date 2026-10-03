<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Search</div>
      <h1 class="section-title">{{ i18n(I18nKey.search) }}</h1>
      <p class="section-sub">{{ i18n(I18nKey.searchSubtitle) }}</p>
    </header>

    <!-- 搜索输入 -->
    <div class="search__box">
      <AppIcon class="search__icon" name="search" :size="20" />
      <input
        v-model="query"
        class="search__input"
        type="search"
        :placeholder="i18n(I18nKey.searchPlaceholder)"
        :aria-label="i18n(I18nKey.searchArticle)"
        @input="onInput"
      />
      <button
        v-if="query"
        class="search__clear"
        type="button"
        :aria-label="i18n(I18nKey.clearSearch)"
        @click="clear"
      >
        <AppIcon name="close" :size="16" />
      </button>
    </div>

    <!-- 结果统计 -->
    <p v-if="query" class="search__stats" aria-live="polite">
      {{ i18nFormat(I18nKey.searchFound, { count: results.length }) }}
    </p>

    <!-- 结果列表 / 无结果：AnimatePresence 做 enter/exit，消除「消失瞬切」 -->
    <AnimatePresence mode="wait">
      <motion.div
        v-if="query && results.length"
        key="results"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: -8 }"
        :transition="{ type: 'spring', stiffness: 320, damping: 30 }"
      >
        <PostList :posts="results" />
      </motion.div>
      <motion.div
        v-else-if="query"
        key="empty"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: -8 }"
        :transition="{ type: 'spring', stiffness: 320, damping: 30 }"
      >
        <div class="search__empty">
          <AppIcon class="search__empty-icon" name="search" :size="40" />
          <p class="search__empty-title">{{ i18nFormat(I18nKey.searchNoResult, { query }) }}</p>
          <p class="search__empty-tip">{{ i18n(I18nKey.searchNoResultTip) }}</p>
        </div>
      </motion.div>
    </AnimatePresence>

    <!-- 空状态：未输入 -->
    <div v-if="!query" class="search__hint">
      <p>{{ i18n(I18nKey.searchStart) }}</p>
      <div class="search__hot">
        <span class="search__hot-label">{{ i18n(I18nKey.searchHotTags) }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { motion, AnimatePresence } from "motion-v";
import AppIcon from "@components/AppIcon.vue";
import PostList from "@components/PostList.vue";
import { allPosts, loadSearchCorpus } from "@lib/posts";
import { getTagList } from "@utils/content-utils";
import { setHead } from "@lib/head";
import I18nKey from "@i18n/i18nKey";
import { i18n, i18nFormat } from "@i18n/translation";

const query = ref("");

// 支持 /search?q=关键词 直达（WebSite JSON-LD SearchAction 的落地形式）
if (typeof window !== "undefined") {
  const initial = new URLSearchParams(window.location.search).get("q");
  if (initial) query.value = initial;
}

// 正文语料懒加载：进入搜索页后才拉取（标题/标签/分类即时可搜，正文随后补上）
const corpus = ref<Record<string, string> | null>(null);
onMounted(async () => {
  corpus.value = await loadSearchCorpus();
});

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
    const body = (corpus.value?.[post.slug] ?? "").toLowerCase();
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