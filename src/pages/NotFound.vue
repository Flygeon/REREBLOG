<template>
  <div class="container">
    <section class="placeholder">
      <h1>{{ i18n(I18nKey.pageNotFound) }}</h1>
      <p>{{ i18n(I18nKey.pageNotFoundDesc) }}</p>
      <div class="hero__cta" style="justify-content: center">
        <RouterLink v-ripple class="lm-btn lm-btn--filled" to="/">
          {{ i18n(I18nKey.backToHome) }}
          <AppIcon name="arrow_forward" :size="18" />
        </RouterLink>
        <RouterLink v-ripple class="lm-btn lm-btn--tonal" to="/blog">
          {{ i18n(I18nKey.browseBlog) }}
          <AppIcon name="article" :size="18" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "@components/AppIcon.vue";
import { setHead } from "@lib/head";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

setHead({
  title: "页面未找到 | Flygeonの小站",
  description: "你访问的页面不存在，可前往首页或博客页继续浏览。",
});
</script>