<template>
  <div class="post container">
    <!-- 阅读进度条：仅文章页显示（顶部细条，随滚动线性填充） -->
    <ScrollProgress />

    <template v-if="post">
      <!-- 双栏布局：主内容 + 右侧 TOC -->
      <div class="post-layout">
        <div class="post__main">
          <!-- 文章头 -->
          <header class="post__header">
            <div class="eyebrow">{{ post.data.category || "未分类" }}</div>
            <h1 class="post__title">{{ post.data.title }}</h1>
            <div class="post__meta">
              <span class="post__date">
                {{ formatDate(post.data.published) }}
              </span>
              <template v-if="post.data.category">
                <span class="post__sep">·</span>
                <a
                  class="post__category"
                  :href="getCategoryUrl(post.data.category)"
                >
                  {{ post.data.category }}
                </a>
              </template>
              <template v-if="post.data.tags && post.data.tags.length">
                <span class="post__sep">·</span>
                <span class="post__tags">
                  <a
                    v-for="tag in post.data.tags"
                    :key="tag"
                    class="post__tag"
                    :href="getTagUrl(tag)"
                  >#{{ tag.trim() }}</a>
                </span>
              </template>
            </div>
          </header>

          <!-- 正文 -->
          <article class="post__content markdown-body" v-html="html"></article>

          <!-- 上下篇 -->
          <nav
            v-if="post.data.prevSlug || post.data.nextSlug"
            class="post__pager"
          >
            <RouterLink
              v-if="post.data.nextSlug"
              class="post__pager-link"
              :to="toLink(`/posts/${post.data.nextSlug}/`)"
            >
              <span class="post__pager-label">下一篇</span>
              <span class="post__pager-title">{{ post.data.nextTitle }}</span>
            </RouterLink>
            <RouterLink
              v-if="post.data.prevSlug"
              class="post__pager-link post__pager-link--next"
              :to="toLink(`/posts/${post.data.prevSlug}/`)"
            >
              <span class="post__pager-label">上一篇</span>
              <span class="post__pager-title">{{ post.data.prevTitle }}</span>
            </RouterLink>
          </nav>

          <!-- 文章推荐（相关 + 随机） -->
          <section
            v-if="recommended.length || randomPosts.length"
            class="post__related"
            aria-label="文章推荐"
          >
            <div class="post__related-head">
              <h2 class="post__related-title">继续阅读</h2>
              <AppIcon
                class="post__related-title-icon"
                name="auto_stories"
                :size="20"
              />
            </div>

            <div class="post__related-grid">
              <RouterLink
                v-for="p in recommended"
                :key="`rel-${p.slug}`"
                class="rec-card"
                :to="toLink(`/posts/${p.slug}/`)"
                :aria-label="`阅读文章：${p.data.title}`"
              >
                <div class="rec-card__cover">
                  <img
                    v-if="p.data.image"
                    :src="resolveImage(p.data.image)"
                    :alt="p.data.title"
                    loading="lazy"
                  />
                  <AppIcon v-else name="article" :size="30" />
                  <span class="rec-card__badge">相关</span>
                </div>
                <div class="rec-card__body">
                  <div class="rec-card__title">{{ p.data.title }}</div>
                  <p class="rec-card__desc">
                    {{ p.data.description || "继续阅读这篇文章" }}
                  </p>
                  <div class="rec-card__meta">
                    <span class="rec-card__cat">
                      {{ p.data.category || "未分类" }}
                    </span>
                    <span class="rec-card__date">
                      {{ formatDate(p.data.published) }}
                    </span>
                    <AppIcon class="rec-card__arrow" name="arrow_forward" :size="18" />
                  </div>
                </div>
              </RouterLink>

              <RouterLink
                v-for="p in randomPosts"
                :key="`rand-${p.slug}`"
                class="rec-card"
                :to="toLink(`/posts/${p.slug}/`)"
                :aria-label="`阅读文章：${p.data.title}`"
              >
                <div class="rec-card__cover">
                  <img
                    v-if="p.data.image"
                    :src="resolveImage(p.data.image)"
                    :alt="p.data.title"
                    loading="lazy"
                  />
                  <AppIcon v-else name="shuffle" :size="30" />
                  <span class="rec-card__badge rec-card__badge--rand">随机</span>
                </div>
                <div class="rec-card__body">
                  <div class="rec-card__title">{{ p.data.title }}</div>
                  <p class="rec-card__desc">
                    {{ p.data.description || "发现另一篇文章" }}
                  </p>
                  <div class="rec-card__meta">
                    <span class="rec-card__cat">
                      {{ p.data.category || "未分类" }}
                    </span>
                    <span class="rec-card__date">
                      {{ formatDate(p.data.published) }}
                    </span>
                    <AppIcon class="rec-card__arrow" name="arrow_forward" :size="18" />
                  </div>
                </div>
              </RouterLink>
            </div>
          </section>

          <!-- 评论（giscus / GitHub Discussions，主题跟随站点亮暗切换） -->
          <section class="post__comments">
            <Giscus />
          </section>
        </div>

        <!-- 右侧 TOC 侧边栏（sticky；窄屏隐藏） -->
        <aside v-if="headings.length" class="post__aside">
          <Toc :headings="headings" />
        </aside>
      </div>
    </template>

    <div v-else class="placeholder">
      <h1>文章未找到</h1>
      <p>你访问的文章可能已被删除或不存在。</p>
      <RouterLink to="/">返回首页</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "@components/AppIcon.vue";
import Giscus from "@components/Giscus.vue";
import Toc, { type TocHeading } from "@components/Toc.vue";
import ScrollProgress from "@components/ScrollProgress.vue";
import { allPosts, getPostBody, mdToText } from "@lib/posts";
import { renderMarkdown } from "@lib/markdown";
import { getCategoryUrl, getTagUrl, toRouterLink } from "@utils/url-utils";
import { getRecommendedPosts, getRandomPosts } from "@utils/content-utils";
import { setHead } from "@lib/head";

const route = useRoute();
const toLink = toRouterLink;
const html = ref("");
const headings = ref<TocHeading[]>([]);

/** 从渲染后的 HTML 提取标题（h2/h3/h4）生成目录 */
function extractHeadings(htmlStr: string): TocHeading[] {
  const out: TocHeading[] = [];
  const re = /<h([234])\s[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(htmlStr))) {
    const level = Number(m[1]);
    const id = m[2];
    const text = m[3]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (id && text) out.push({ id, text, level });
  }
  return out;
}

/** 封面图解析（同 PostCard） */
function resolveImage(src: string): string {
  if (!src) return "";
  if (src.startsWith("/")) return src;
  if (src.startsWith("assets/")) return `/${src}`;
  return src;
}

// 路由 `/posts/:slug(.*)` 的 `(.*)` 贪婪匹配会吞掉尾部斜杠，需去掉尾斜杠
const slug = computed(() =>
  String(route.params.slug ?? "").replace(/\/+$/, ""),
);
const post = computed(() => allPosts.find((p) => p.slug === slug.value));

const recommended = computed(() =>
  post.value ? getRecommendedPosts(post.value, allPosts, 3) : [],
);

// 随机文章（排除当前文章与相关文章，避免重复）
const randomPosts = computed(() =>
  post.value ? getRandomPosts(post.value, allPosts, recommended.value, 3) : [],
);

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 同步设置页面 head（SSG 注入 <title>/meta/JSON-LD） */
function setPostHead(p: typeof post.value) {
  if (!p) return;
  // 无 frontmatter description 时，从正文提取纯文本摘要兜底（SEO）
  const excerpt = mdToText(getPostBody(p.slug) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);
  setHead({
    title: p.data.title
      ? `${p.data.title} · ${import.meta.env.VITE_SITE_TITLE ?? "Flygeonの小站"}`
      : "Flygeonの小站",
    description: p.data.description || excerpt,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.data.title,
      datePublished: p.data.published.toISOString(),
      dateModified: p.data.updated ? p.data.updated.toISOString() : undefined,
      ...(p.data.category ? { articleSection: p.data.category } : {}),
    },
  });
}

async function render() {
  html.value = "";
  headings.value = [];
  if (!post.value) return;
  const body = getPostBody(post.value.slug);
  if (body) {
    const rendered = await renderMarkdown(body);
    html.value = rendered;
    headings.value = extractHeadings(rendered);
  }
  setPostHead(post.value);
}

// 客户端路由切换：slug 变化时重新渲染正文
watch(slug, () => {
  setPostHead(post.value);
  void render();
});

// SSR/首屏：同步设置 head + 顶层 await 渲染正文（renderToString 会等待，
// 确保预渲染 HTML 里包含完整文章正文）
setPostHead(post.value);
if (post.value) {
  const body = getPostBody(post.value.slug);
  if (body) {
    const rendered = await renderMarkdown(body);
    html.value = rendered;
    headings.value = extractHeadings(rendered);
  }
}
</script>

<style scoped>
.post-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: var(--ll-gap);
  align-items: start;
  padding-bottom: 40px;
}
.post__aside {
  position: sticky;
  top: calc(var(--md-layout-header-h) + 16px);
}
@media (max-width: 1080px) {
  .post-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .post__aside {
    display: none;
  }
}
</style>
