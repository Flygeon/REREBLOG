import { type RouteRecordRaw } from "vue-router";

// 路由映射：复刻原 Astro 站的 URL 结构
// 原站 trailingSlash: 'always'，SSG 阶段会输出 dist/<path>/index.html，
// 由 Cloudflare Workers 以 /<path>/ 形式提供，保持产物地址不变。
// 注意：本文件只导出 routes 数组，路由实例由 app.ts 按运行环境（web/memory）创建，
// 避免在 Node 端 import 时触发 createWebHistory 访问 window 而报错。
const routes: RouteRecordRaw[] = [
  // 首页：门户占位页（暂时不开发）
  { path: "/", name: "home", component: () => import("@/pages/Home.vue") },
  // 博客列表（分页：/blog 为第 1 页，/blog/2、/blog/3/… 为后续页）
  { path: "/blog", name: "blog", component: () => import("@/pages/Blog.vue") },
  {
    path: "/blog/:page(\\d+)",
    name: "blog-paged",
    component: () => import("@/pages/Blog.vue"),
  },
  // 旧首页分页地址 /2/、/3/… 全量重定向到 /blog/N，保住搜索引擎里的旧链接
  {
    path: "/:page(\\d+)",
    redirect: (to) => ({ path: `/blog/${to.params.page}` }),
  },
  // 文章详情（slug 可能含 /，用 (.*) 全捕获）
  {
    path: "/posts/:slug(.*)",
    name: "post",
    component: () => import("@/pages/Post.vue"),
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
