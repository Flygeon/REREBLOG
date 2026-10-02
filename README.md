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

### 设计令牌速查

全部样式**只通过令牌取值**，业务代码里不写裸色值 / 间距 / z-index。令牌来源与含义：

| 类别 | 前缀 | 数量 | 说明 |
| :--- | :--- | ---: | :--- |
| 颜色 | `--md-sys-color-*` | 68 | M3 语义色，亮暗各一套（`_template.scss`）。**禁止动态取色 / Monet**（已回滚） |
| 排版 | `--md-sys-typescale-*` | display / headline / title / body / label | 每级含 `size` / `weight` / `line-height`；headline-large/medium 为本站补入 |
| 形状 | `--md-sys-shape-corner-*` | 7 | none → extra-small → small → medium → large → extra-large → full |
| 动效 | `--md-sys-motion-*` | 8 | duration 3 档（short/medium/long）+ easing 5 条（standard/emphasized/spring 等） |
| 状态层 | `--md-sys-state-*` | 4 | hover / focus / pressed / dragged 的不透明度档位（由主色 `color-mix` 推导） |
| 层级 | `--md-sys-elevation-*` | 5 | 模板阴影口径 |
| 布局 | `--md-layout-*` | 5 | 内容列宽 / 外壳宽 / 侧栏宽 / 栏距 / 顶栏高 |
| 间距 | `--space-*` | 16 | **间距标尺**，4px 栅格 + 2px 半档（`--space-1`=2px … `--space-16`=64px） |
| 层叠 | `--z-*` | 9 | **层叠标尺**，`below`(-1) / `base`(0) / `raised` / `decor` / `badge` / `header`(50) / `fab` / `progress` / `overlay` |
| 站点 | `--site-*` | 5 | 博客层卡片口径：`surface` / `card` / `card-border` / `elev-1` / `elev-2` |
| 模板 | `--ll-*` `--lm-*` | 13 | 模板原始度量（容器宽 `1200px`、栏距 `24px`、圆角档、发丝线等） |

**层级与单元约定**

- 卡片：外层卡 `corner-large`(16px) / 卡内嵌套块 `corner-medium`(12px) / chip·pill `corner-full`。
- 卡片视觉一律引用 `--site-card` + `--site-card-border` + `--site-elev-*`，不各写背景色。
- hover 用 MD3 state layer（`::before` 叠 `on-surface` 8%），不写死背景色。
- 间距写 `var(--space-*)`；正文排版用 `em`（需随字号缩放），见 `_markdown.scss`。
- 图标：Material Symbols ligature（`AppIcon.vue`），**禁止 emoji / 字符箭头 / 手绘 SVG**；尺寸收敛为 16 / 20 / 24 三档（外加空态 40）。
- 每处动效都要有 `prefers-reduced-motion` 降级。

> 改造项的完整来龙去脉（32 条，含已实施/已关闭的状态与决策原因）见 `UI-REFACTOR-CHECKLIST.md`。

---

## ✨ 功能

- **文章**：`src/content/posts/*.md`（`import.meta.glob` 构建期内联）+ 自研 frontmatter 解析（不依赖 Node Buffer，SSR/浏览器同构）
- **渲染**：markdown-it + shiki 双主题高亮、`:::tip` 等提示块、`::github{repo}` 仓库卡、`:spoiler[]` 剧透
- **页面**：首页（Hero + 文章流 + 侧栏 + 分页）、文章页（TOC / 上下篇 / 相关+随机推荐 / Giscus 评论）、归档、标签、分类、搜索（全文）、关于、友链、番剧（Bangumi API + **与别人的番剧重合对比**）、动态（Moments Worker）、404
- **番剧重合**：`/bangumi` 顶部输入对方的 Bangumi 主页 / 用户名 / UID（或带用户名的 /bangumi 页面地址），
  拉取 TA 标记为「看过」的动画，与本站主人在 Bangumi 上「看过」的条目取交集，按双方评分排序展示；
  结果用 `?bgm=<uid>` 回写地址栏，链接可直接分享（标识解析与统计口径见 `src/lib/bangumi-compare.ts`）
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
    BangumiCompare.vue          # /bangumi 的「和 TA 的重合番剧」输入框 + 结果网格
  composables/reveal.ts      # v-reveal 滚动入场指令（含 SSR props）
  pages/                     # Home/Post/Archive/Tag/Category/Search/About/Friends/Bangumi/Memos/NotFound
  lib/                       # posts / markdown / frontmatter / theme / head / bangumi-compare（重合比对）
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
