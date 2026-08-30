import { type RouteRecordRaw } from "vue-router";

// 路由映射：复刻原 Astro 站的 URL 结构
// 原站 trailingSlash: 'always'，SSG 阶段会输出 dist/<path>/index.html，
// 由 Cloudflare Workers 以 /<path>/ 形式提供，保持产物地址不变。
// 注意：本文件只导出 routes 数组，路由实例由 app.ts 按运行环境（web/memory）创建，
// 避免在 Node 端 import 时触发 createWebHistory 访问 window 而报错。
const routes: RouteRecordRaw[] = [
  // 首页（分页：/ 为第 1 页，/2/、/3/… 为后续页）
  { path: "/", name: "home", component: () => import("@/pages/Home.vue") },
  {
    path: "/:page(\\d+)",
    name: "home-paged",
    component: () => import("@/pages/Home.vue"),
  },
  // 文章详情（slug 可能含 /，用 (.*) 全捕获）
  {
    path: "/posts/:slug(.*)",
    name: "post",
    component: () => import("@/pages/Post.vue"),
  },
  {
    path: "/archive",
    name: "archive",
    component: () => import("@/pages/Archive.vue"),
  },
  {
    path: "/friends",
    name: "friends",
    component: () => import("@/pages/Friends.vue"),
  },
  { path: "/about", name: "about", component: () => import("@/pages/About.vue") },
  {
    path: "/bangumi",
    name: "bangumi",
    component: () => import("@/pages/Bangumi.vue"),
  },
  { path: "/memos", name: "memos", component: () => import("@/pages/Memos.vue") },
  { path: "/tags/:tag", name: "tag", component: () => import("@/pages/Tag.vue") },
  {
    path: "/categories/:category",
    name: "category",
    component: () => import("@/pages/Category.vue"),
  },
  { path: "/search", name: "search", component: () => import("@/pages/Search.vue") },
  // 兜底（404）
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/pages/NotFound.vue"),
  },
];

export { routes };
