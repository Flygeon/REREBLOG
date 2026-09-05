<template>
  <!--
    Varlet StyleProvider：把站点 MD3 令牌注入 .var-* 组件（分页 / 标签页），
    使其与模板配色一致；模板自身的组件不受影响。
  -->
  <var-style-provider :style-vars="varletThemeVars">
    <div class="site">
      <!-- 模板玻璃顶栏 -->
      <AppBar />

      <main id="top" class="site-main">
        <!--
          Suspense 边界：文章页 <script setup> 含顶层 await（正文需等 shiki
          高亮器就绪），Vue 要求 async setup 组件必须嵌在 <Suspense> 内。
          SSR（renderToString）会等待 async 完成，预渲染 HTML 不受影响。
        -->
        <router-view v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <Suspense :timeout="400">
              <component :is="Component" :key="route.path" />
              <template #fallback>
                <div class="route-loading" aria-hidden="true">
                  <span class="route-loading__dot"></span>
                  <span class="route-loading__dot"></span>
                  <span class="route-loading__dot"></span>
                </div>
              </template>
            </Suspense>
          </Transition>
        </router-view>
      </main>

      <!-- 模板页脚 -->
      <Footer />

      <!-- 返回顶部（下滚一屏后浮现） -->
      <BackToTop />
    </div>
  </var-style-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppBar from "@components/layout/AppBar.vue";
import Footer from "@components/layout/Footer.vue";
import BackToTop from "@components/BackToTop.vue";
import Themes from "@varlet/ui/es/themes";
import { currentTheme } from "@lib/theme";

const route = useRoute();

/**
 * Varlet MD3 主题变量：暗色用 md3Dark，亮色用 md3Light。
 * Varlet 预设自带 Material baseline 紫，且 StyleProvider 注入的变量优先级
 * 高于 :root，故必须在这里用站点 MD3 令牌覆盖颜色项。
 */
const varletThemeVars = computed(() => {
  const base = currentTheme.value === "dark" ? Themes.md3Dark : Themes.md3Light;
  return {
    ...base,
    "--color-primary": "var(--md-sys-color-primary)",
    "--color-on-primary": "var(--md-sys-color-on-primary)",
    "--color-primary-container": "var(--md-sys-color-primary-container)",
    "--color-on-primary-container":
      "var(--md-sys-color-on-primary-container)",
    "--color-secondary": "var(--md-sys-color-secondary)",
    "--color-on-secondary": "var(--md-sys-color-on-secondary)",
    "--color-secondary-container": "var(--md-sys-color-secondary-container)",
    "--color-on-secondary-container":
      "var(--md-sys-color-on-secondary-container)",
    "--color-surface": "var(--md-sys-color-surface)",
    "--color-surface-container": "var(--md-sys-color-surface-container)",
    "--color-surface-container-low":
      "var(--md-sys-color-surface-container-low)",
    "--color-surface-container-high":
      "var(--md-sys-color-surface-container-high)",
    "--color-surface-container-highest":
      "var(--md-sys-color-surface-container-highest)",
    "--color-on-surface": "var(--md-sys-color-on-surface)",
    "--color-on-surface-variant": "var(--md-sys-color-on-surface-variant)",
    "--color-outline": "var(--md-sys-color-outline)",
    "--color-outline-variant": "var(--md-sys-color-outline-variant)",
    "--color-error": "var(--md-sys-color-error)",
    "--color-on-error": "var(--md-sys-color-on-error)",
    "--color-error-container": "var(--md-sys-color-error-container)",
    "--color-on-error-container":
      "var(--md-sys-color-on-error-container)",
  };
});
</script>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.site-main {
  flex: 1;
}
</style>
