<template>
  <div>
    <section class="post-list" aria-label="文章列表">
      <PostCard
        v-for="post in posts"
        :key="post.slug"
        :post="post"
        :url="`/posts/${post.slug}/`"
      />
    </section>
    <div v-if="posts.length === 0" class="post-list__empty">
      <p>没有符合条件的文章。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostCard from "@components/PostCard.vue";
import type { Post } from "@utils/content-utils";

defineProps<{
  posts: Post[];
}>();
</script>
