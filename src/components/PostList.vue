<template>
  <div>
    <section class="post-list" :aria-label="i18n(I18nKey.postList)">
      <PostCard
        v-for="post in posts"
        :key="post.slug"
        :post="post"
        :url="`/posts/${post.slug}/`"
      />
    </section>
    <div v-if="posts.length === 0" class="post-list__empty">
      <p>{{ i18n(I18nKey.noPosts) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostCard from "@components/PostCard.vue";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { Post } from "@utils/content-utils";

defineProps<{
  posts: Post[];
}>();
</script>