# Flygeonの小站

**Material Design 3）+ Vue 3 + Vite 自建 SSG** 的个人博客。

本项目参考了https://github.com/MD2-9/Web部分逻辑和思路

---

## 🎨 视觉：沿用模板，不做改动

样式分三层，模板原始样式被**原样保留**为最底层，博客层只做补充：

| 层次 | 文件 | 说明 |
| :--- | :--- | :--- |
| 模板基座 | `src/styles/_template.scss` | 模板的 M3 设计令牌（色值/形状/字体/动效曲线）与组件基元（玻璃顶栏 `.app-bar.lm-glass`、`.lm-btn`、`.lm-icon-btn`、`.container`、`.section`、`.eyebrow/.section-title/.section-sub`、`.feature-card`、`.footer`、`.reveal`、`.scroll-progress`、Hero 光晕 `.hero-aura/.blob`） |
| 令牌补充 | `src/styles/_tokens-extra.scss` | 只补模板未定义的项：字体族、布局度量、状态层、elevation、Varlet 色板映射 |
| 功能层 | `src/styles/_markdown.scss`、`_blog.scss` | Markdown 正文排版（shiki 双主题 / admonition / GitHub 卡片）与博客组件（文章卡、侧栏、归档时间线、番剧网格、动态 …） |

主题色沿用模板：`#1A5C9E`（浅色）/ `#8BB9F0`（深色），亮暗由 `html[data-theme]` 切换。

---

## ✨ 功能

- **文章**：`src/content/posts/*.md`（`import.meta.glob` 构建期内联）+ 自研 frontmatter 解析（不依赖 Node Buffer，SSR/浏览器同构）
- **渲染**：markdown-it + shiki 双主题高亮、`:::tip` 等提示块、`::github{repo}` 仓库卡、`:spoiler[]` 剧透
- **页面**：首页（Hero + 文章流 + 侧栏 + 分页）、文章页（TOC / 上下篇 / 相关+随机推荐 / Giscus 评论）、归档、标签、分类、搜索（全文）、关于、友链、番剧（Bangumi API + 图源切换）、动态（Moments Worker）、404
- **工程**：Vite SSG 预渲染（`scripts/ssg.mjs`）、sitemap.xml / rss.xml（`scripts/sitemap-rss.mjs`）、i18n 多语言、亮暗主题（localStorage + 跟随系统）、Cloudflare Workers 部署

---

## 📁 目录结构

```
index.html                  # Vite 入口（含首屏主题初始化，避免暗色闪烁）
src/
  App.vue  app.ts  main.ts  router.ts  config.ts  entry-server.ts
  components/
    layout/{AppBar,Footer,Layout,Sidebar}.vue   # 模板 UI 的 Vue 化
    {PostCard,PostList,Pagination,Toc,Giscus,ScrollProgress,AppIcon}.vue
  composables/reveal.ts      # v-reveal 滚动入场指令（含 SSR props）
  pages/                     # Home/Post/Archive/Tag/Category/Search/About/Friends/Bangumi/Memos/NotFound
  lib/                       # posts / markdown / frontmatter / theme / head
  utils/ constants/ i18n/ types/
  content/posts/*.md         # 文章
  content/spec/*.md          # 关于、友链等独立页
  styles/                    # 见上表
scripts/{ssg,sitemap-rss}.mjs
worker/index.js              # Cloudflare Workers（静态资源 + SPA fallback）
_legacy/                     # 原 MDC-Web 组件库与模板静态站归档（不参与构建）
```

---

## 🚀 开发与部署

```bash
pnpm install
pnpm dev        # 本地开发
pnpm build      # SSG：客户端构建 → SSR 构建 → 预渲染 → sitemap/rss
pnpm deploy     # 构建并部署到 Cloudflare Workers
```
---

## 📄 许可证

内容沿用原项目协议；模板与组件库的许可见 `_legacy/LICENSE`。
