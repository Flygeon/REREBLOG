<template>
  <div class="container">
    <div class="blog-grid">
      <div>
        <!-- Hero 横幅卡片：banner 图 + scrim + 站名 logo + 打字机副标题 -->
        <section ref="heroRef" class="home__hero">
          <img
            class="home__hero-img"
            :src="bannerUrl"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            decoding="async"
          />
          <div class="home__hero-scrim" aria-hidden="true"></div>
          <!--
            液态玻璃折射层：与 <img> 同源同图，WebGL 把底图按圆角矩形折射重画一遍，
            叠在 scrim 之上、文案之下。WebGL 不可用时组件不显示，Hero 就是原来的样子。
          -->
          <LiquidGlass
            v-if="heroRef"
            class="home__hero-glass"
            :src="bannerUrl"
            :params="heroGlassParams"
            scene="blog-hero"
          />
          <div class="home__hero-text">
            <img class="home__logo" :src="logoUrl" :alt="siteConfig.title" />
            <p class="home__subtitle">
              {{ typedText || subtitleFull
              }}<span class="home__cursor" aria-hidden="true"></span>
            </p>
          </div>
        </section>

        <!--
          h1 视觉隐藏：博客列表页此前没有一级标题（axe page-has-heading-one 违规），
          但设计上首屏是 Hero 而非标题，不能把 h1 显示出来抢视觉。
          用 .visually-hidden 保留大纲语义、屏幕上不可见。
        -->
        <h1 class="visually-hidden">{{ i18n(I18nKey.blogListTitle) }}</h1>

        <!-- 文章列表标题行：无过滤时显示总数；有过滤时显示筛选条件 -->
        <div class="post-list__head">
          <h2 class="post-list__title">
            {{ hasFilter ? i18n(I18nKey.filterResult) : i18n(I18nKey.latestPosts) }}
          </h2>
          <span v-if="hasFilter" class="page__meta">{{ filterLabel }}</span>
          <span v-else class="post-list__count">{{ allPosts.length }} {{ i18n(I18nKey.postCount) }}</span>
        </div>

        <section class="post-list" :aria-label="i18n(I18nKey.postList)">
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
import LiquidGlass from "@components/LiquidGlass.vue";
import { registerGlassScene } from "@composables/liquid-glass-store";
import PostCard from "@components/PostCard.vue";
import Pagination from "@components/Pagination.vue";
import Sidebar from "@components/layout/Sidebar.vue";
import { allPosts } from "@lib/posts";
import { PAGE_SIZE } from "@constants/constants";
import { siteConfig } from "@/config";
import { setHead } from "@lib/head";
import I18nKey from "@i18n/i18nKey";
import { i18n, i18nFormat } from "@i18n/translation";
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

/*
  Hero 液态玻璃：圆角取自「与 Hero 的 border-radius 一致」这一硬约束 ——
  模板 --md-sys-shape-corner-large = 16px（Hero 自身用的就是它），
  这里显式写成 16 而不是读 CSS 变量：着色器要的是设备像素里的确定值，
  读计算值既拖慢首帧，也拿不到可靠回落。改圆角时两处一起改。
  厚度/过渡带宽按这块横幅的宽扁比例标定（813×270 上下），
  参考 demo 的 150×170 小方块尺寸不能直接照搬。
*/
const heroGlassParams = {
  cornerRadius: 16,
  ior: 1.12,
  thickness: 34,
  normalStrength: 5.6,
  displacementScale: 1,
  heightTransitionWidth: 26,
  sminSmoothing: 20,
  blurRadius: 1.2,
  highlightWidth: 3.2,
  edgeLift: 0.34,
  overlayStrength: 0.14,
  pointerStrength: 6,
  flow: 2.4,
  flowSpeed: 0.22,
  maxDpr: 1.5,
};

/*
  注册到隐藏管理面板：面板显示的初值就是上面这套常量，
  没被改动过时 resolve 出来的结果与它逐字段相同（面板对线上零影响）。
*/
registerGlassScene({
  id: "blog-hero",
  label: "博客 · Hero 横幅",
  mode: "image",
  defaults: heroGlassParams,
});

/* Hero 根节点引用：玻璃层只在 Hero 真的挂载后才创建（v-if 兜住空引用） */
const heroRef = ref<HTMLElement | null>(null);

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
    parts.push(i18nFormat(I18nKey.filterByTag, { value: tags.join(", ") }));
  }
  if (route.query.category) {
    const cats = Array.isArray(route.query.category)
      ? route.query.category
      : [route.query.category];
    parts.push(i18nFormat(I18nKey.filterByCategory, { value: cats.join(", ") }));
  }
  if (route.query.uncategorized) parts.push(i18n(I18nKey.uncategorized));
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
  /* 图片内缩量 / 图片圆角：默认 0（窄屏单栏，图片仍铺满整卡）。
     内容在双栏视口里「小一点」—— 卡片本身尺寸、圆角、阴影都不动，
     只有图（和跟着它走的液态玻璃层）往内收，于是卡片看起来像是
     一张带内衬的相框：外圈是 16px 圆角的卡片，里圈是 12px 圆角的图。
     用自定义属性统一给「图片 + 玻璃层 + scrim」三处取同一个盒子，
     避免三者的圆角/内缩各写一套而错位。 */
  --hero-art-inset: 0px;
  --hero-art-radius: 0px;
}
/* 双栏时让 Hero 顶部与 sticky aside 的 16px 偏移对齐，确保顶边、底边完全齐平 */
@media (min-width: 1081px) {
  .home__hero {
    margin-top: 16px;
    --hero-art-inset: 14px;
    --hero-art-radius: var(--md-sys-shape-corner-medium);
  }
}
.home__hero-img {
  position: absolute;
  top: var(--hero-art-inset);
  left: var(--hero-art-inset);
  /* 层序：底图 0 → 液态玻璃 1 → scrim 2 → 文案 3（同为定位元素，按 z-index 排列）
     底图垫在最下面，玻璃层从纹理里取同一张图做折射，scrim 压在玻璃之上 ——
     这样「暗色渐变托白字」的原设计与折光互不干扰：文案可读性不变，
     玻璃折射在 scrim 较弱的上半部分清晰可见。 */
  z-index: 0;
  /* 绝对定位的替换元素给死宽高，图片按内缩量整体变小（不用 transform，
     避免和玻璃层的设备像素换算打架） */
  width: calc(100% - var(--hero-art-inset) * 2);
  height: calc(100% - var(--hero-art-inset) * 2);
  border-radius: var(--hero-art-radius);
  object-fit: cover;
  object-position: center;
}
/* 暗色主题下压暗横幅图，避免亮图在暗色界面里刺眼（scoped 内用 :global 命中 html[data-theme]） */
:global([data-theme="dark"]) .home__hero-img {
  filter: brightness(0.82) saturate(1.04);
}
.home__hero-scrim {
  position: absolute;
  /* scrim 与图片同盒：否则内缩露出的那一圈会被渐变涂黑，卡片周围出现黑边 */
  top: var(--hero-art-inset);
  left: var(--hero-art-inset);
  width: calc(100% - var(--hero-art-inset) * 2);
  height: calc(100% - var(--hero-art-inset) * 2);
  border-radius: var(--hero-art-radius);
  z-index: 2;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.72) 0%,
    rgba(0, 0, 0, 0.25) 45%,
    transparent 70%
  );
}
/* 液态玻璃画布：与图片同盒同圆角（折射的是这张图，盒子错位就对不上） */
.home__hero-glass {
  z-index: 1;
  top: var(--hero-art-inset);
  left: var(--hero-art-inset);
  width: calc(100% - var(--hero-art-inset) * 2);
  height: calc(100% - var(--hero-art-inset) * 2);
  border-radius: var(--hero-art-radius);
}
.home__hero-text {
  position: absolute;
  z-index: 3;
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
