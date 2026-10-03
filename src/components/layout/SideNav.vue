<template>
  <!--
    多根节点组件：
    ① nav.side-nav.lm-glass —— 桌面（≥861px）左侧可折叠侧边栏（图标 + 文本 + 纵向滑动胶囊）
    ② header.app-bar + nav.nav —— 移动端（≤860px）顶栏 + 汉堡抽屉（= 原 AppBar 结构）
    断点显示/隐藏与全部 .side-nav* 样式由 W2 的全局层 src/styles/_sidenav.scss 负责，
    本组件内不写 .side-nav* 的 scoped 规则（否则 scoped 属性会与全局规则打架）。
  -->

  <!-- ① 桌面侧边栏 -->
  <nav
    class="side-nav lm-glass"
    :class="{ 'is-collapsed': collapsed }"
    aria-label="主导航"
  >
    <div class="side-nav__head">
      <RouterLink class="side-nav__brand" to="/">
        <span class="side-nav__brand-text">{{ siteConfig.title }}</span>
        <!-- 收起态：文字换成首字方片（行宽 76px，放不下完整站名） -->
        <span class="side-nav__brand-mark" aria-hidden="true">{{
          siteConfig.title.slice(0, 1)
        }}</span>
      </RouterLink>

      <button
        v-ripple
        class="side-nav__toggle lm-icon-btn"
        type="button"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="collapsed = !collapsed"
      >
        <AppIcon
          :name="collapsed ? 'chevron_right' : 'chevron_left'"
          :size="22"
        />
      </button>
    </div>

    <div ref="listEl" class="side-nav__list">
      <!-- 滑动高亮胶囊：语义从横向 translateX 变为纵向 translateY（保留 transform 动画） -->
      <span
        class="side-nav__indicator"
        :class="{ 'is-ready': indicator.ready }"
        :style="{
          transform: 'translateY(' + indicator.y + 'px)',
          height: indicator.h + 'px',
        }"
        aria-hidden="true"
      ></span>

      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        class="side-nav__link"
        :class="{ 'is-active': isActive(link.to) }"
        :to="link.to"
        :title="collapsed ? link.label : undefined"
      >
        <span class="side-nav__icon"
          ><AppIcon :name="link.icon" :size="22"
        /></span>
        <span class="side-nav__label">{{ link.label }}</span>
      </RouterLink>

      <a
        v-for="ext in extLinks"
        :key="ext.url"
        class="side-nav__link"
        :href="ext.url"
        target="_blank"
        rel="noopener"
        :title="collapsed ? ext.label : undefined"
      >
        <span class="side-nav__icon"
          ><AppIcon :name="ext.icon" :size="22"
        /></span>
        <span class="side-nav__label"
          >{{ ext.label
          }}<AppIcon class="side-nav__ext" name="open_in_new" :size="14"
        /></span>
      </a>
    </div>

    <div class="side-nav__foot">
      <!-- 搜索 / 主题：与主链接同一套 .side-nav__link 结构（图标 + 文本） -->
      <RouterLink
        v-ripple
        class="side-nav__link"
        to="/search"
        aria-label="站内搜索"
        :title="collapsed ? '搜索' : undefined"
      >
        <span class="side-nav__icon"><AppIcon name="search" :size="22" /></span>
        <span class="side-nav__label">搜索</span>
      </RouterLink>

      <!-- id=theme-toggle：ThemeReveal.vue 靠它把灯泡动画锚到按钮位置。
           同一时刻全文档只保留一个该 id（见 script 中 isDesktop 说明）。 -->
      <button
        v-ripple
        type="button"
        class="side-nav__link theme-toggle"
        :id="isDesktop ? 'theme-toggle' : undefined"
        :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
        :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
        @click="toggleTheme()"
      >
        <span class="side-nav__icon"
          ><AppIcon :name="isDark ? 'light_mode' : 'dark_mode'" :size="22"
        /></span>
        <span class="side-nav__label">{{ isDark ? "浅色模式" : "深色模式" }}</span>
      </button>
    </div>
  </nav>

  <!-- ② 移动端顶栏 + 汉堡抽屉（≤860px；桌面由 W2 用 .site > .app-bar { display: none } 隐藏） -->
  <header class="app-bar lm-glass" :class="{ 'is-scrolled': scrolled }">
    <div class="container app-bar__inner">
      <RouterLink class="brand app-bar__brand" to="/">
        <!-- 品牌区只用文字站名（logo.png 是 480×127 横版图，不适合方形位） -->
        <span class="brand__name">{{ siteConfig.title }}</span>
      </RouterLink>

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
          v-ripple
          type="button"
          class="lm-icon-btn theme-toggle"
          :id="isDesktop ? undefined : 'theme-toggle'"
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
          :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon :name="menuOpen ? 'close' : 'menu'" :size="22" />
        </button>
      </div>
    </div>

    <nav class="nav" :class="{ 'is-open': menuOpen }" aria-label="主导航">
      <!-- 与侧栏共用同一份 navLinks / extLinks；链接同样用 .side-nav__link 结构，
           抽屉里复用同一套链接样式（W2 在 _sidenav.scss 用 .nav .side-nav__link 更高特异性接管） -->
      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        class="side-nav__link"
        :class="{ 'is-active': isActive(link.to) }"
        :to="link.to"
        @click="menuOpen = false"
      >
        <span class="side-nav__icon"
          ><AppIcon :name="link.icon" :size="22"
        /></span>
        <span class="side-nav__label">{{ link.label }}</span>
      </RouterLink>

      <a
        v-for="ext in extLinks"
        :key="ext.url"
        class="side-nav__link"
        :href="ext.url"
        target="_blank"
        rel="noopener"
        @click="menuOpen = false"
      >
        <span class="side-nav__icon"
          ><AppIcon :name="ext.icon" :size="22"
        /></span>
        <span class="side-nav__label"
          >{{ ext.label
          }}<AppIcon class="side-nav__ext" name="open_in_new" :size="14"
        /></span>
      </a>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "@components/AppIcon.vue";
import { siteConfig } from "@/config";
import { currentTheme, toggleTheme } from "@lib/theme";

const route = useRoute();

/* ---------------- 导航数据（桌面侧栏与移动抽屉共用同一份） ---------------- */
const navLinks = [
  { to: "/", label: "首页", icon: "home" },
  { to: "/blog", label: "博客", icon: "article" },
  { to: "/about", label: "关于", icon: "person" },
  { to: "/friends", label: "友链", icon: "group" },
  { to: "/bangumi", label: "番剧", icon: "smart_display" },
  { to: "/memos", label: "动态", icon: "edit_note" },
];

const extLinks = [
  {
    url: "https://www.travellings.cn/go.html",
    label: "开往",
    icon: "travel_explore",
  },
];

/** 当前路由是否命中导航项（首页精确匹配，其余前缀匹配 —— 沿用原 AppBar 实现） */
function isActive(to: string): boolean {
  if (to === "/") return route.path === "/";
  return route.path === to || route.path.startsWith(to + "/");
}

/* ---------------- 折叠状态（localStorage: sidenav-collapsed = "1"/"0"） ---------------- */
const COLLAPSE_KEY = "sidenav-collapsed";
/** 首屏默认展开；localStorage 在 onMounted 读取，避免 SSR 水合不一致 */
const collapsed = ref(false);
const menuOpen = ref(false);
const scrolled = ref(false);
const isDark = computed(() => currentTheme.value === "dark");

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/* ---------------- 主题按钮锚点：全文档只允许一个 #theme-toggle ----------------
   ThemeReveal.vue 用 getElementById("theme-toggle") 取灯泡落点，若桌面侧栏与移动顶栏
   各写一份 id，就永远是 DOM 中靠前那个（另一个 display:none，getBoundingClientRect 全 0），
   在另一种视口下动画会从左上角冒出。这里按视口把唯一 id 分配到可见的那个按钮上：
   初值 true 与 SSR/首帧客户端渲染一致（无水合 mismatch），挂载后再按 matchMedia 校正。 */
const isDesktop = ref(true);

/* ---------------- 滑动高亮胶囊（纵向 translateY） ---------------- */
const listEl = ref<HTMLElement | null>(null);
const indicator = ref({ y: 0, h: 0, ready: false });

/** 测量当前 is-active 链接的几何位置（相对 .side-nav__list，与胶囊同一坐标系） */
function measureIndicator() {
  const el = listEl.value?.querySelector<HTMLElement>(
    ".side-nav__link.is-active",
  );
  if (!el) {
    indicator.value.ready = false;
    return;
  }
  indicator.value.y = el.offsetTop;
  indicator.value.h = el.offsetHeight;
  indicator.value.ready = true;
}

/* ---------------- 滚动描边（移动端顶栏保留） ---------------- */
function onScroll() {
  scrolled.value = (window.scrollY || window.pageYOffset || 0) > 8;
}

/* ---------------- 视口切换：校正主题按钮 id ---------------- */
let desktopMq: MediaQueryList | null = null;
function onViewportChange(e: MediaQueryListEvent) {
  isDesktop.value = e.matches;
}

// 折叠 → 持久化 + 复测胶囊（宽度过渡期间图标位置连续变化，高度不变但仍复测更稳）
watch(collapsed, (v) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  nextTick(measureIndicator);
});

// 路由变化 → 胶囊跟随 +（移动端）收起抽屉
watch(
  () => route.path,
  () => nextTick(measureIndicator),
);
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);

onMounted(() => {
  collapsed.value = readCollapsed();

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("resize", measureIndicator);

  desktopMq = window.matchMedia("(min-width: 861px)");
  isDesktop.value = desktopMq.matches;
  desktopMq.addEventListener("change", onViewportChange);

  // 首帧测量 + 字体加载完成后复测（字宽变化会改变链接几何）
  nextTick(measureIndicator);
  document.fonts?.ready?.then(measureIndicator).catch(() => {});
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  window.removeEventListener("resize", measureIndicator);
  desktopMq?.removeEventListener("change", onViewportChange);
});
</script>

<style scoped>
/* 顶栏图标按钮内的文字链接去掉下划线（原有行为，唯一一条 scoped 规则） */
.app-bar__actions .lm-icon-btn {
  text-decoration: none;
}
</style>
