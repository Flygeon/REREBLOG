<template>
  <div class="container">
    <section class="placeholder">
      <h1>页面未找到</h1>
      <p>你访问的地址不存在，可能已被移动或删除。</p>
      <div class="hero__cta" style="justify-content: center">
        <RouterLink v-ripple class="lm-btn lm-btn--filled" to="/">
          返回首页
          <AppIcon name="arrow_forward" :size="18" />
        </RouterLink>
        <RouterLink v-ripple class="lm-btn lm-btn--tonal" to="/archive">
          浏览归档
          <AppIcon name="inventory_2" :size="18" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "@components/AppIcon.vue";
import { setHead } from "@lib/head";

setHead({
  title: "页面未找到 | Flygeonの小站",
  description: "你访问的页面不存在，可前往首页或归档页继续浏览。",
});
</script>
