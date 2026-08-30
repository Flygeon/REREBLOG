<template>
  <!--
    顶部应用栏：直接沿用模板 .app-bar.lm-glass 结构与交互
    （滚动描边 .is-scrolled / 胶囊导航 .nav a.is-active / 移动端 .nav.is-open）
  -->
  <header class="app-bar lm-glass" :class="{ 'is-scrolled': scrolled }">
    <div class="container app-bar__inner">
      <RouterLink class="brand app-bar__brand" to="/">
        <span class="brand__name">{{ siteConfig.title }}</span>
      </RouterLink>

      <nav class="nav" :class="{ 'is-open': menuOpen }" aria-label="主导航">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :class="{ 'is-active': isActive(link.to) }"
          @click="menuOpen = false"
        >
          {{ link.label }}
        </RouterLink>
        <a
          v-for="ext in extLinks"
          :key="ext.url"
          :href="ext.url"
          target="_blank"
          rel="noopener"
          @click="menuOpen = false"
        >
          {{ ext.label }}
        </a>
      </nav>

      <div class="app-bar__actions">
        <RouterLink
          v-ripple
          class="lm-icon-btn"
          to="/search"
          aria-label="站内搜索"
          title="站内搜索"
        >
          <AppIcon name="search" :size="22" />
        </RouterLink>

        <button
          id="theme-toggle"
          v-ripple
          type="button"
          class="lm-icon-btn theme-toggle"
          :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
          :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
          @click="toggleTheme()"
        >
          <AppIcon :name="isDark ? 'light_mode' : 'dark_mode'" :size="22" />
        </button>

        <button
          v-ripple
          type="button"
          class="lm-icon-btn nav-toggle"
          aria-label="打开导航菜单"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon :name="menuOpen ? 'close' : 'menu'" :size="22" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "@components/AppIcon.vue";
import { siteConfig } from "@/config";
import { currentTheme, toggleTheme } from "@lib/theme";

const route = useRoute();
const scrolled = ref(false);
const menuOpen = ref(false);

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/archive", label: "归档" },
  { to: "/about", label: "关于" },
  { to: "/friends", label: "友链" },
  { to: "/bangumi", label: "番剧" },
  { to: "/memos", label: "动态" },
];

const extLinks = [{ url: "https://www.travellings.cn/go.html", label: "开往" }];

const isDark = computed(() => currentTheme.value === "dark");

/** 当前路由是否命中导航项（首页精确匹配，其余前缀匹配） */
function isActive(to: string): boolean {
  if (to === "/") return route.path === "/";
  return route.path === to || route.path.startsWith(to + "/");
}

function onScroll() {
  scrolled.value = (window.scrollY || window.pageYOffset || 0) > 8;
}

// 路由切换后收起移动端菜单（点击链接已处理，这里覆盖浏览器后退等场景）
watch(() => route.fullPath, () => {
  menuOpen.value = false;
});

onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
});
onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
});
</script>

<style scoped>
.app-bar__brand {
  display: flex;
  align-items: center;
  margin-right: auto;
  text-decoration: none;
}
.brand__name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--md-sys-color-on-surface);
}
/* 顶栏图标按钮内的 Material Symbols 图标居中 */
.lm-icon-btn {
  text-decoration: none;
}
</style>
