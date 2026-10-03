# AGENTS.md

Vue 3.5 + vue-router 4 + Vite 6 的**自建 SSG 个人博客**（没有 Astro/Nuxt/VitePress）。
视觉沿用 LumiLuna (Material Design 3) 模板，功能靠其后追加的样式层覆盖。

深挖背景（读它们，不要重复推导）：`HANDOFF.md`（交接文档，最全）、`UI-REFACTOR-CHECKLIST.md`（32 条样式决策来龙去脉）、`README.md`。

## 命令

- 包管理只用 **pnpm**（`packageManager: pnpm@9.14.4`）；`npm install` 会破坏 `.pnpm` 软链布局。
- `pnpm install`
- `pnpm dev` — SPA 开发（markdown 运行时渲染，改 md 立即生效）
- `pnpm build` — = `build:ssg`，完整 6 步流水线（见下）
- `pnpm type-check` — `vue-tsc --noEmit`。**已清零**（此前 6 条存量报错：缺 `@types/markdown-it`、`markdown.ts` 隐式 any；已装类型并修复）。这是硬门禁，必须 0 error。
- `pnpm lint` — Biome（`biome lint .`）；`pnpm format` 是写盘版，**只在你确实要格式化时用**。当前 0 error、少量 warning。
- `pnpm check:all` — 三条一致性校验 + lint（见下「质量门禁」），秒级完成，改完务必先跑这个。
- `pnpm test:a11y` — Playwright + axe-core 无障碍回归（真实构建产物、明暗双主题）。**必须先 `pnpm build`**，它跑的是 `dist/`。
- `pnpm verify` — `check:all + type-check + test:a11y`，提交前的完整自检。

## 质量门禁（新增，改动后必跑）

| 命令 | 守什么约 | 为什么需要 |
|---|---|---|
| `pnpm check:site-meta` | `site.meta.json` 是站点常量唯一真源，`head.ts` / `ssg.mjs` / `sitemap-rss.mjs` / `constants.ts` 不得再内联域名、标题、`PAGE_SIZE` | 这四处曾各写一份，靠注释「保持一致」约束，改一处必漏三处 |
| `pnpm check:routes` | `router.ts` ↔ `src/pages/*.vue` ↔ `getPrerenderUrls()` 三份路由真相一致；无孤儿页面、无引用不存在的组件 | 漏预渲染 → 线上 404，且构建期不报错 |
| `pnpm check:i18n` | 10 个语种词典与 `I18nKey` 枚举完全对齐；`{placeholder}` 集合跨语种一致；统计有多少文件真的在用 i18n | 漏译 / 占位符写错只在运行时表现为界面显示 `{count}` |
| `pnpm lint` | 代码风格与常见缺陷 | 此前零 lint |

**新增/改动的规矩**：
- 加站点级常量 → 只往 `site.meta.json` 加，然后从消费方读，别内联。
- 加页面 → 同时在 `router.ts` 注册并在 `getPrerenderUrls()` 里列出静态地址，否则 `check:routes` 会红。
- 加用户可见文案 → 必须走 `I18nKey` + `i18n()` / `i18nFormat()`，**禁止在组件模板里硬编码**（含 `aria-label` / `title` / `placeholder` / `alt`）。10 个语种都要补，`check:i18n` 会拦。
  - 占位符写成 `{name}`，且**所有语种用同一套占位符名**；替换用 `i18nFormat(key, { name })`。
  - 语种覆盖策略：`zh_CN` / `zh_TW` / `en` / `ja` / `ko` 手写，其余五种回退英文（避免机翻引入错误文案）。
- 改 `router.ts` / 页面标题层级 → 跑 `pnpm test:a11y`：`heading-order`、`page-has-heading-one`、`color-contrast` 都是真实拦截项。
- 长代码块所在页面 → `<pre>` 必须是唯一横向滚动容器且带 `tabindex="0"`（`markdown.ts` 的 fence 渲染器已处理），`<code>` 上不要再加 `overflow-x`，否则 axe 判 `scrollable-region-focusable`。

## 提交前自检（按顺序）

1. `pnpm check:all` —— 常量/路由/词典/lint，秒级
2. `pnpm type-check` —— 必须 0 error
3. `pnpm build` —— 完整 6 步；产物须含 `dist/index.html`、`sitemap.xml`、`rss.xml`
4. `pnpm test:a11y` —— 12 路由 × 明暗双主题，0 违规
5. `git diff --check` —— 拦尾随空格等空白错误
6. **禁止 `git add -A` / `git add .`** —— 按路径显式添加。
   本仓库磁盘上有大量 gitignore 的模板遗留物（`docs/`、`packages/`、`_legacy/` …）
   与构建产物（`dist/`、`src/generated/`），`-A` 极易误吞。

## 构建流水线（顺序是硬约束）

`pnpm build` = `clean → bangumi → vite build(SSR) → render-content → vite build(client) → ssg + sitemap/rss`：

1. `render-content.mjs` **必须早于**客户端构建。客户端通过 `import.meta.glob("../generated/{posts,spec}/*.json")` 引用预渲染正文；`src/generated/` 被 gitignore、构建期才生成。
2. 单独跑 `pnpm build:client` 产物**没有文章正文**，是不完整的。
3. `clean.mjs` 因 WorkBuddy safe-delete shim 会劫持 `fs.rmSync`，改用逐层 unlink 规避；新增递归删除逻辑请沿用。`vite.config.ts` 因此设 `emptyOutDir: false`。

## 内容模型（易踩）

`src/lib/posts.ts` 的 `getPostHtml()` 有三态：DEV/SSR 走运行时 markdown-it + shiki；**生产客户端读 `generated/*.json`**，所以 markdown-it/shiki 不进客户端 bundle。改渲染管线要同时顾这三个环境。

`src/pages/Post.vue` 的 `<script setup>` 含顶层 await，必须留在 `Layout.vue` 的 `<Suspense>` 内。

## 硬性约束（多数是用户明确否决过的，不要擅自推翻）

- **`src/styles/_template.scss` 不允许修改**（模板原样拷贝）。改样式只能在后加载层（`_tokens-extra` / `main` / `_blog`）靠「同等特异性 + 源顺序」覆盖。`main.scss` 的 `@use` 顺序即 CSS 输出顺序，不可乱。
- 配色用**静态 MD3 token**；不要引入动态配色 / Monet 取色（整套已回滚）。
- 图标一律 **Material Symbols ligature**（`AppIcon.vue`），禁止 emoji / 字符箭头 / 手绘 SVG。品牌图标走 `BrandIcon.vue` + `src/data/brand-icons.ts`（**不要引入 Iconify 运行时包**）。新增图标名必须重新生成字体子集，步骤见 `src/styles/_icons.scss` 头部注释，否则显示为纯文本。
- 新卡片引用 `--site-card` / `--site-card-border` / `--site-elev-*`，不要各写背景色。hover 用 MD3 state layer（`::before` 叠 `on-surface` 8%），不写死背景色。卡内间距加在 `.post-card__body`（不是 `.post-card`）。
- 每处动效都要有 `prefers-reduced-motion` 降级。
- 动效策略：保留 `v-reveal` / CSS state layer / `v-ripple` 作基座，**只在退场与弹簧微交互处用 motion-v**，不要全量替换。主题切换动画 `ThemeReveal.vue` 已定型（View Transitions 三种方案都实测卡顿，不要再试）。

## 约定与陷阱

- 站内链接统一经 `toRouterLink`（去尾斜杠）喂 `RouterLink` 的 `to`。
- `config.ts` 的 `navBarConfig` / `LinkPreset` 是**死配置**；SideNav / Footer 各自硬编码导航。`navBarConfig` 改了不生效。`config.ts` 真正在用的是 `siteConfig` / `profileConfig` / `giscusConfig` / `licenseConfig`。`SideNav.vue` 的 `navLinks` 是唯一导航来源（桌面侧栏与移动抽屉共用一份）。
- 站点是**门户 + 博客**结构：`/` 是门户首页（Hero + 站点导航磁贴 + 数据一览/写作足迹 + 最新文章 + 高分收藏，数据全部取自构建期，见 `src/pages/Home.vue`），博客列表在 `/blog`（分页 `/blog/2`…）；`/archive` 已整站删除，`getTagUrl` / `getCategoryUrl` 生成 `/blog/?tag=` / `?category=` / `?uncategorized=true`（与路由 `/tags/:tag`、`/categories/:category` 并存）。旧的首页分页 `/:page(\d+)` 会 302 到 `/blog/<page>`。
- 站点常量（SITE_URL / 标题 / 描述 / lang / PAGE_SIZE）**只在根目录 `site.meta.json` 维护**，`head.ts` / `ssg.mjs` / `sitemap-rss.mjs` / `constants.ts` 都从它读；改完跑 `pnpm check:site-meta`。（此前四处各内联一份，已收敛。）
- tsconfig 与 vite alias **没有 `@data`**；品牌图标用 `@/data/brand-icons`。
- `docs/ docs-cn/ packages/ demos/ site/ test/ fonts/ icons/ _legacy/ 组件库参考/` 是磁盘上存在但 gitignore 的 MDC-Web 模板遗留物，**不参与构建**，别当成源码。`scripts/` 下只有 `clean/bangumi/render-content/ssg/sitemap-rss.mjs` 属于本站。
- `.gitignore` 的 `/fonts/` 只忽略根目录，**不能**写成 `fonts/`（会误伤 `src/assets/fonts/` 自托管子集，导致部署后图标 404）。
- `pnpm-lock.yaml` **必须入库**（CI 用 `--frozen-lockfile`）；`home_check.html`、根目录 `_tmp_*` 是未跟踪残留。

## 部署

- 线上：**push `main` → Cloudflare Workers Builds 自动构建**。另有 `.github/workflows/ci.yml`（checks / build / a11y 三个 job）在 GitHub 侧做质量门禁，两者独立。
- `pnpm deploy` = build + `wrangler deploy`；`wrangler.toml` 的 `[assets].directory = "dist"`。部署前 R2 桶 `flygeon-bangumi` 必须已存在。
- `worker/index.js` 四职责：静态托管 + SPA fallback、`/api/bgm/*` 反代（仅 GET）、`/pic/*` R2 封面镜像（miss 回源 `lain.bgm.tv`）、每日 cron 预热。

## 环境陷阱（会实际浪费时间）

- 真实项目是 `C:\blog\REREBLOG`。同级有**独立旧副本 `C:\blog\REBLOG`**，不要动。`REREBLOG/node_modules` 是指向 `C:\blog\REBLOG\node_modules` 的 **junction**（两项目共用依赖）。Vite 错误覆盖层常把路径误报成 `C:/blog/REBLOG/...`（丢了 RE），排查「模块找不到」以真实目录为准。
- 装依赖先确认在 `C:\blog\REREBLOG`，否则等于没装。
- 构建期抓 Bangumi（`scripts/bangumi.mjs`）国内需代理：Node 22 fetch 不读 `HTTP_PROXY`，需 **Node 24 + `NODE_USE_ENV_PROXY=1`**。抓取失败自动回退仓库内旧快照，不阻塞构建。
- `Sidebar.vue` 的「正在追」浏览器直连 `api.bgm.tv`（未走反代），国内大概率失败并隐藏卡片——已知缺陷。
