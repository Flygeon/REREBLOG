<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Archive</div>
      <h1 class="section-title">归档</h1>
      <p class="section-sub">
        共 {{ allPosts.length }} 篇文章，按发布时间倒序归档。
      </p>
    </header>

    <!-- 时间线分组 -->
    <section
      v-if="groups.length"
      class="archive__timeline"
      aria-label="文章归档"
    >
      <div v-for="group in groups" :key="group.year" class="archive__group">
        <div class="archive__year">{{ group.year }}</div>
        <div class="archive__items">
          <RouterLink
            v-for="post in group.posts"
            :key="post.slug"
            class="archive__item"
            :to="`/posts/${post.slug}`"
          >
            <span class="archive__item-date">
              {{ formatDate(post.data.published) }}
            </span>
            <span class="archive__item-title">{{ post.data.title }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <div v-else class="state-block">
      <p>没有符合条件的文章。</p>
      <RouterLink to="/archive">返回全部归档</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { allPosts } from "@lib/posts";
import { setHead } from "@lib/head";

const route = useRoute();

interface Group {
  year: number;
  posts: typeof allPosts;
}

function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}-${day}`;
}

// 查询参数过滤（tag / category / uncategorized）
const query = computed(() => route.query);

const groups = computed<Group[]>(() => {
  let filtered = allPosts;
  const q = query.value;

  if (q.tag) {
    const tags = Array.isArray(q.tag) ? q.tag : [q.tag];
    filtered = filtered.filter((post) =>
      post.data.tags.some((t) => tags.includes(t)),
    );
  }
  if (q.category) {
    const cats = Array.isArray(q.category) ? q.category : [q.category];
    filtered = filtered.filter(
      (post) => post.data.category && cats.includes(post.data.category),
    );
  }
  if (q.uncategorized) {
    filtered = filtered.filter((post) => !post.data.category);
  }

  const byYear: Record<number, typeof allPosts> = {};
  for (const post of filtered) {
    const year = post.data.published.getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(post);
  }
  return Object.keys(byYear)
    .map((y) => ({ year: Number(y), posts: byYear[Number(y)] }))
    .sort((a, b) => b.year - a.year);
});

setHead({
  title: "归档 - 全站文章时间线 | Flygeonの小站",
  description:
    "按时间线浏览 Flygeonの小站 的全部博文，依年份归档整理，方便快速回溯与跳转到感兴趣的文章。",
});
</script>
