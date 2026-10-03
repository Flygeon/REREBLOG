<template>
  <div class="container">
    <div class="blog-grid">
      <div>
        <!-- Hero 横幅卡片：banner 图 + scrim + 站名 logo + 打字机副标题 -->
        <section class="home__hero">
          <img
            class="home__hero-img"
            :src="bannerUrl"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            decoding="async"
          />
          <div class="home__hero-scrim" aria-hidden="true"></div>
          <div class="home__hero-text">
            <img class="home__logo" :src="logoUrl" :alt="siteConfig.title" />
            <p class="home__subtitle">
              {{ typedText || subtitleFull
              }}<span class="home__cursor" aria-hidden="true"></span>
            </p>
          </div>
        </section>

        <!-- 文章列表标题行：无过滤时显示总数；有过滤时显示筛选条件 -->
        <div class="post-list__head">
          <h2 class="post-list__title">
            {{ hasFilter ? "筛选结果" : "最新文章" }}
          </h2>
          <span v-if="hasFilter" class="page__meta">{{ filterLabel }}</span>
          <span v-else class="post-list__count">共 {{ allPosts.length }} 篇</span>
        </div>

        <section class="post-list" aria-label="文章列表">
          <PostCard
            v-for="post in pagePosts"
            :key="post.slug"
            :post="post"
            :url="`/posts/${post.slug}/`"
          />
        </section>

        <!-- 有 query 过滤时展示全部匹配结果，不显示分页 -->
        <Pagination
          v-if="!hasFilter"
          :current-page="safePage"
          :last-page="totalPages"
          base="/blog"
        />
      </div>

      <!--
        右侧栏延迟挂载：内含 Bangumi 外部请求与分类/标签统计，
        不必占用首屏关键路径，等浏览器空闲再挂。
        该栏在窄屏是 position: static（仍显示在正文下方），所以不按媒体查询裁剪。
      -->
      <aside v-if="sidebarReady" class="blog-grid__aside">
        <Sidebar />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import PostCard from "@components/PostCard.vue";
import Pagination from "@components/Pagination.vue";
import Sidebar from "@components/layout/Sidebar.vue";
import { allPosts } from "@lib/posts";
import { PAGE_SIZE } from "@constants/constants";
import { siteConfig } from "@/config";
import { setHead } from "@lib/head";
import { useLazyRail } from "@composables/lazy-rail";
import bannerUrl from "@assets/images/banner.webp";
import logoUrl from "@assets/images/logo.png";

setHead({
  title: "博客 - 全部文章 | Flygeonの小站",
  description:
    "Flygeonの小站 的全部博文列表，按发布时间倒序排列，涵盖 Web 开发、自建项目与日常记录，可按标签或分类筛选浏览。",
});

const route = useRoute();

const { ready: sidebarReady } = useLazyRail();

// hero 副标题用原 banner 的副标题文案（"音无结弦之时，悦动天使之心"）
const subtitleFull = siteConfig.banner?.subtitle?.text || siteConfig.subtitle;
const typingEnabled =
  siteConfig.banner?.enable !== false &&
  siteConfig.banner?.subtitle?.typingEffect === true;

/* ---- 打字机效果（SSR 侧直接给全文，避免预渲染 HTML 缺文案） ---- */
const typedText = ref(import.meta.env.SSR ? subtitleFull : "");
let typeTimer: number | undefined;

onMounted(() => {
  if (!typingEnabled) {
    typedText.value = subtitleFull;
    return;
  }
  // reduced-motion 用户直接显示全文
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    typedText.value = subtitleFull;
    return;
  }
  let i = 0;
  window.setTimeout(function tick() {
    i += 1;
    typedText.value = subtitleFull.slice(0, i);
    if (i < subtitleFull.length) {
      typeTimer = window.setTimeout(tick, 120);
    }
  }, 400);
});
onUnmounted(() => {
  if (typeTimer) window.clearTimeout(typeTimer);
});

/* ---- query 过滤（原 Archive.vue 语义：tag / category / uncategorized） ---- */
const filteredPosts = computed(() => {
  let filtered = allPosts;
  const q = route.query;

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
  return filtered;
});

const hasFilter = computed(
  () =>
    Boolean(route.query.tag) ||
    Boolean(route.query.category) ||
    Boolean(route.query.uncategorized),
);

/** 列表头筛选条件小标题：标签：xxx / 分类：xxx / 未分类 */
const filterLabel = computed(() => {
  const parts: string[] = [];
  if (route.query.tag) {
    const tags = Array.isArray(route.query.tag)
      ? route.query.tag
      : [route.query.tag];
    parts.push(`标签：${tags.join(", ")}`);
  }
  if (route.query.category) {
    const cats = Array.isArray(route.query.category)
      ? route.query.category
      : [route.query.category];
    parts.push(`分类：${cats.join(", ")}`);
  }
  if (route.query.uncategorized) parts.push("未分类");
  return parts.join(" / ");
});

/* ---- 分页 ---- */
const page = computed(() => {
  const p = Number(route.params.page ?? 1);
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE)),
);
// 越界保护：超过总页数时回到最后一页
const safePage = computed(() => Math.min(page.value, totalPages.value));
const pagePosts = computed(() => {
  // 有过滤：展示全部匹配文章
  if (hasFilter.value) return filteredPosts.value;
  return allPosts.slice(
    (safePage.value - 1) * PAGE_SIZE,
    safePage.value * PAGE_SIZE,
  );
});
</script>

<style scoped>
/* ---- Hero 横幅卡片（沿用旧站样式，圆角与阴影改用模板令牌） ---- */
.home__hero {
  position: relative;
  height: var(--home-hero-h);
  border-radius: var(--md-sys-shape-corner-large);
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-2);
}
/* 双栏时让 Hero 顶部与 sticky aside 的 16px 偏移对齐，确保顶边、底边完全齐平 */
@media (min-width: 1081px) {
  .home__hero {
    margin-top: 16px;
  }
}
.home__hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
/* 暗色主题下压暗横幅图，避免亮图在暗色界面里刺眼（scoped 内用 :global 命中 html[data-theme]） */
:global([data-theme="dark"]) .home__hero-img {
  filter: brightness(0.82) saturate(1.04);
}
.home__hero-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.72) 0%,
    rgba(0, 0, 0, 0.25) 45%,
    transparent 70%
  );
}
.home__hero-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.5rem 1.75rem;
  text-align: center;
}
.home__logo {
  display: block;
  height: 5.5rem;
  width: auto;
  object-fit: contain;
  margin: 0 auto;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
}
.home__subtitle {
  margin: 0.4rem auto 0;
  max-width: 46ch;
  color: rgba(255, 255, 255, 0.92);
  font-size: var(--md-sys-typescale-body-large-size);
  line-height: 1.7;
  min-height: 1.7em;
}
/* 打字机光标 */
.home__cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: home-cursor-blink 1s steps(2, start) infinite;
}
@keyframes home-cursor-blink {
  to {
    visibility: hidden;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home__cursor {
    animation: none;
  }
}
</style>
