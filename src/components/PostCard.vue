<template>
  <article
    class="post-card"
    :class="{ 'post-card--pinned': pinned }"
    v-reveal
  >
    <!-- 封面（如有） -->
    <RouterLink
      v-if="image"
      class="post-card__cover"
      :to="toLink(url)"
      :aria-label="title"
    >
      <img :src="resolveImage(image)" :alt="title" loading="lazy" />
      <span class="post-card__cover-overlay"></span>
      <AppIcon class="post-card__enter" name="arrow_forward" :size="26" />
    </RouterLink>

    <div class="post-card__body">
      <!-- 标题行 -->
      <div class="post-card__title-row">
        <AppIcon
          v-if="pinned"
          class="post-card__pin"
          name="push_pin"
          :size="16"
          title="置顶"
        />
        <RouterLink class="post-card__title" :to="toLink(url)">
          {{ title }}
        </RouterLink>
      </div>

      <!-- 元信息：日期 / 分类 -->
      <div class="post-card__meta">
        <span class="post-card__date">{{ formatDate(published) }}</span>
        <span v-if="category" class="post-card__sep">·</span>
        <RouterLink
          v-if="category"
          class="post-card__category"
          :to="toLink(categoryUrl)"
        >
          {{ category }}
        </RouterLink>
        <span v-if="updated && updated > published" class="post-card__updated">
          更新于 {{ formatDate(updated) }}
        </span>
      </div>

      <!-- 描述 -->
      <p v-if="description" class="post-card__desc">{{ description }}</p>

      <!-- 标签 -->
      <div v-if="tags && tags.length" class="post-card__tags">
        <RouterLink
          v-for="tag in tags"
          :key="tag"
          v-ripple
          class="post-card__tag"
          :to="toLink(tagUrl(tag))"
        >
          #{{ tag.trim() }}
        </RouterLink>
      </div>

      <!-- 底部统计 -->
      <div class="post-card__stats">
        <span>{{ wordCountLabel }}</span>
        <span class="post-card__sep">·</span>
        <span>{{ minuteLabel }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@components/AppIcon.vue";
import type { Post } from "@utils/content-utils";
import { getCategoryUrl, getTagUrl, toRouterLink } from "@utils/url-utils";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

const props = defineProps<{
  post: Post;
  url: string;
}>();

const { post, url } = props;
// 站内跳转统一走 RouterLink（SPA 过渡），to 去尾斜杠
const toLink = toRouterLink;
const title = post.data.title;
const published = post.data.published;
const updated = post.data.updated;
const tags = post.data.tags ?? [];
const category = post.data.category ?? null;
const image = post.data.image ?? "";
const description = post.data.description ?? "";
const pinned = post.data.pinned === true;

const words = post.stats?.words ?? 0;
const minutes = post.stats?.minutes ?? 0;

const wordCountLabel = computed(() =>
  `${words} ${i18n(words === 1 ? I18nKey.wordCount : I18nKey.wordsCount)}`,
);
const minuteLabel = computed(() =>
  `${minutes} ${i18n(minutes === 1 ? I18nKey.minuteCount : I18nKey.minutesCount)}`,
);
const categoryUrl = computed(() => getCategoryUrl(category));

function tagUrl(tag: string): string {
  return getTagUrl(tag);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 封面图解析：相对 /src/assets 或相对文章目录 → 生产 URL */
function resolveImage(src: string): string {
  if (!src) return "";
  if (src.startsWith("/")) return src;
  if (src.startsWith("assets/")) return `/${src}`;
  return src;
}
</script>
