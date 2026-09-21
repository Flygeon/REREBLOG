# REREBLOG UI 美化 / 改造清单

> 分析日期：2026-09-21
> 输入：首页截图（图1）、文章页截图（图2）、番剧页截图（图3）+ 全量源码走查
> 样式三层：`_template.scss`（模板层，**禁改**）→ `_tokens-extra.scss`（补充/修正）→ `_markdown.scss` / `_blog.scss`（博客功能层）
> 类型定义：**[样式]** = 只改 CSS / 属性，不动 DOM 与数据流；**[结构]** = 需要改模板结构、组件拆分或构建配置
> 优先级口径：高 = 成本低且视觉收益大，建议本轮就做；中 = 收益明确但需一次小重构；低 = 打磨项，可批量处理

---

## 0. 建议执行顺序（按当前投入产出比）

| 顺序 | 条目 | 一句话理由 | 类型 |
|---|---|---|---|
| 1 | A1 + A2 | 全站卡片"发平"的根因，改 3 处 token 就见效 | 样式 |
| 2 | A3 圆角统一 | TOC 28px 与全站 12/16px 混用，最扎眼的割裂感 | 样式 |
| 3 | A4 中文 uppercase/字距 | 5 处小标题的中文字距被撑开，观感"廉价" | 样式 |
| 4 | D1 分类重复渲染 | Post 页真实冗余（分类出现两次），顺手修 | 样式 |
| 5 | D2 正文列宽 + 段间距 | 中文长文可读性提升最大的一项 | 样式 |
| 6 | E1 番剧评分 badge 对比度 | 白底海报上评分直接看不见，1 条规则修好 | 样式 |
| 7 | C1 首页计数块 | 首页最像"半成品"的元素 | 结构（小） |
| 8 | C2 站长卡强制等高 | 首页右上大片空白来源 | 样式（1 行） |
| 9 | ~~B1 顶栏品牌 logo~~ **已关闭** | 实测 `logo.png` 是 480×127 横版图，不适合方形位；品牌区只用文字站名 | — |
| 10 | G1 字体来源 | 外部 CDN + 首选字体缺失，跨设备观感漂移 | 结构 |

---

## A. 全局视觉基底（跨页面，收益最高）

### A1. 卡片与页面底色明度差过小，整页"发平"
- **涉及**：`src/styles/_template.scss:27,32-35`（`surface #FCFCFC` / `surface-container-low #F6F7F9`）、`src/styles/_blog.scss:100`（`.post-card`）、`:515`（`.post__pager-link`）、`:579`（`.rec-card`）、`:855`（`.friend-card`）、`:991`（`.bangumi__card`）、`:1095`（`.memo-card`）
- **当前问题**：图1 首页文章卡与页面底色差仅 6/255，几乎同色，卡片只能靠一根发丝线辨认；图3 番剧卡同样如此。整页失去"卡片浮在底板上"的层级，是当前最显性的"不够现代"来源。
- **建议**：把页面底板下沉一档 —— `body` / `--md-sys-color-background` 用 `#F6F7F9`（= surface-container-low），卡片统一用 `--md-sys-color-surface-container-lowest`（`#FFFFFF`）；或在 `_tokens-extra.scss` 里新增站点级别名 `--site-bg` / `--site-card` 后统一引用。暗色主题同步检查（`container-lowest #0A0A0C` 已比 `background #0F0F11` 更深，方向一致）。
- **✅ 已实施（2026-09-21，09-22 调色）**：`_tokens-extra.scss` 新增 `--site-surface` / `--site-card` / `--site-card-border` / `--site-elev-1|2`，
  8 处卡片统一引用；`main.scss` 里 `body { background: var(--site-surface) }`。
  **底板最终取值由用户指定为 `#EAEFF5`（RGB 234/239/245）**，卡片纯白 `#FFFFFF`，暗色仍为 `background #0F0F11` / `container #1A1C1E`。
- **优先级**：高　**[样式]**

### A2. 边框 hairline 过淡 + 卡片无阴影，边界不可靠
- **涉及**：`_template.scss:99`（`--lm-hairline: rgba(0,0,0,.08)`）；6 处卡片统一 `border: 1px solid var(--lm-hairline)`
- **当前问题**：图1/图3 卡片轮廓几乎不可见，hover 之外没有任何立体表达。
- **建议**：卡片改用 `border: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 55%, transparent)`，并追加一层 M3 风格柔和阴影 `box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)`；`--lm-hairline` 保留给分割线（`.section + .section`、`.footer` 顶部）使用，职责分开。
- **优先级**：高　**[样式]**

### A3. 卡片圆角尺度混乱（12 / 16 / 28px 三套并存）
- **涉及**：
  - 12px：`.post-card`（`_blog.scss:103`）、`.rec-card`（`:582`）
  - 16px：`.side-card`（`:267`）、`.friend-card`（`:857`）、`.memo-card`（`:1097`）、`.bangumi__card`（`:989`）、`.post__pager-link`（`:513`）、`.search__box`（`:755`）
  - **28px**：`.toc`（`src/components/Toc.vue:87`，用的是 `--ll-radius-card` = `corner-extra-large`）
- **当前问题**：图2 右侧目录卡圆角明显大于页面里任何其他卡片，看起来像来自另一套设计系统。
- **建议**：立一条硬规则并写进注释 —— 外层卡片 **16px**、卡内嵌套块 **12px**、chip / pill **全圆**。具体改：`.toc` 28→16px、`.post-card` 与 `.rec-card` 12→16px。`--ll-radius-card`(28px) 只留给模板落地页的 hero 类大面板，博客层不再引用。
- **优先级**：高　**[样式]**

### A4. 中文元素套用 uppercase + letter-spacing
- **涉及**：`.side-card__title`（`_blog.scss:277-278`）、`.toc__head`（`Toc.vue:98-99`）、`.eyebrow`（`_template.scss:245`）、`.footer h5`（`_template.scss:447`）
- **当前问题**：`text-transform: uppercase` 对中文完全无效；`letter-spacing: .06em/.08em` 把"分类""标签""目录"的字距硬撑开，配合主色蓝，在小标题上显得松散廉价（图1 侧栏"分类 / 标签"、图2 目录卡标题）。
- **建议**：中文小标题去掉 `uppercase` 与 `letter-spacing`，统一为 `13px / 600 / var(--md-sys-color-primary)`；英文 eyebrow（Archive / Friends / Search / Bangumi）**保留** uppercase + 字距 —— 也就是说按内容语言分流，而不是一刀切。`_blog.scss` 与 `Toc.vue` 可直改，`.eyebrow` 在模板层禁改，但博客页的 eyebrow 都来自页面组件，可用更具体的选择器在 `_blog.scss` 覆盖。
- **优先级**：高　**[样式]**

### A5. 图标尺寸档位混乱（16/20/22/24/26/30/40 七档）
- **涉及**：`AppIcon` 全部调用点 —— 16（侧栏标题、TOC 头）、20（搜索框、友链箭头）、22（顶栏两枚图标按钮）、24（返回顶部）、26（文章卡进入箭头）、30（相关文章无图占位）、40（搜索空态）
- **当前问题**：同一屏内出现 22 与 24 两种"按钮级"图标，视觉上大小不齐。
- **建议**：收敛为三档并写进项目约定 —— **16**（小标题 / 内联）、**20**（普通按钮 / 正文内）、**24**（独立操作按钮 / 空态主图形）；26→24、22→20、30→28（无图占位可单独放宽至 32）。
- **优先级**：中　**[样式]**

### A6. 缺少统一的卡片基类（A1–A3 的根治手段）
- **涉及**：`.post-card` / `.rec-card` / `.friend-card` / `.memo-card` / `.side-card` / `.bangumi__card` 各自重复 "背景 + 边框 + 圆角 + `::before` state layer + transition" 约 40 行，共 6 份
- **建议**：抽 `.card` 基类（surface / border / radius / state layer / hover 过渡）+ 少量修饰类（`--elevated`、`--interactive`、`--flush`），A1–A3 一次性收敛到一处。
- **优先级**：中　**[结构]**（但一次改动解锁 A1–A3，后续加卡片不再跑偏）

---

## B. 顶栏 / 页脚（全站骨架）

### B1. 顶栏缺品牌 logo —— ❌ 已关闭（2026-09-22）
- **涉及**：`src/components/layout/AppBar.vue:8-10`（只有 `<span class="brand__name">`）；模板已定义 `.brand__logo`（32px / 9px 圆角，`_template.scss:272`）；图片资源 `src/assets/images/logo.png`
- **当前问题**：图1/2/3 左上角只有一行 20px 文字，顶栏左侧偏空，与右侧 6 个导航项 + 2 个按钮不平衡。
- **原建议**：`.brand` 内加 `<img class="brand__logo" ...>`，页脚同步加。
- **关闭原因（实测）**：`src/assets/images/logo.png` 是 **480×127 的横版图**（左侧白色 "Flygeon" + 右侧橙色"の小站"块），**不是方形图标**。按 32×32 渲染会整图压变形，顶栏只剩一个橙色小方块。改用 `public/favicon/*-128.png` 方形版试验后，**用户决定品牌区只用文字站名、不放任何图标**，顶栏与页脚均已回退。该横版 logo 继续只用于首页 Hero 中央（`Home.vue` 的 `.home__logo`，`height: 5.5rem; width: auto`，用法正确）。
- **结论**：本项关闭，不再实施。

### B2. 顶栏导航 hover 用固定色而非 state layer
- **涉及**：`_template.scss:284`（`.nav a:hover { background: var(--md-sys-color-surface-container-high) }`）
- **当前问题**：与项目已确立的"hover 一律走 MD3 state layer"约定不符；且在暗色下 `#24262A` 与顶栏玻璃底叠加会偏色。
- **建议**：模板层禁改，但有现成先例 —— `_blog.scss:85-91`（`.post-list > .reveal` 覆盖模板）就是这么做的。在 `_blog.scss` 追加 `.nav a:hover { background: var(--md-sys-state-hover); }`，同等特异性、加载在后即可覆盖。`.nav a.is-active` 的 `primary-container` 保留。
- **优先级**：中　**[样式]**

### B3. 中屏区间（721–1080px）导航拥挤
- **涉及**：`_template.scss:576-589` —— 仅 ≤720px 才隐藏 `.nav`
- **当前问题**：721–1080px 之间，6 个站内项 + "开往"外链 + 搜索 + 主题 + 汉堡按钮全挤在 1200px 容器内，还要给 20px 品牌名留位。
- **建议**：把导航折叠断点从 720px 提到 900px；或在 721–1080px 区间把 `.nav a` 的 padding 由 `8px 14px` 收到 `8px 10px`、字号 14→13px。
- **优先级**：中　**[样式]**

### B4. 页脚信息密度与排版
- **涉及**：`src/components/layout/Footer.vue`
- **当前问题**：`footer__grid` 为 1.6fr / 1fr / 1fr，右两列各只有 4–5 条链接，下半部分空；`h5` 用 "导航 Navigation" 中英混排 + uppercase + 0.06em 字距（同 A4）。
- **建议**：`h5` 去掉 uppercase、中英之间加空格或只留中文；品牌列可加一行"最近更新 xx"或 RSS 入口；`footer__bottom` 左侧版权、右侧加"Powered by Vue 3 SSG"。
- **优先级**：低　**[样式]**

---

## C. 首页

### C1. "27 篇文章"计数块孤立，且被 `aria-hidden` 屏蔽
- **涉及**：`src/pages/Home.vue:24-27` + `_blog.scss:199-215`
- **当前问题**：图1 中部，Hero 与文章列表之间孤零零一行居中小字，上下都是大留白，既不属于 Hero 也不属于列表；`aria-hidden="true"` 还让屏幕阅读器直接跳过这个信息。
- **建议**：二选一 ——
  ① **推荐**：改成文章列表的 section 头（左对齐 `最新文章` + 右侧 `共 27 篇` 灰字），`<section>` 上补 `aria-label`，删掉 `aria-hidden`；
  ② 并入侧栏分类卡顶部或 Hero 右下角角标。
- **优先级**：高　**[结构]**（小）

### C2. 站长卡强制与 Hero 等高，内容留白过大
- **涉及**：`src/components/layout/Sidebar.vue:4` + `_blog.scss:288-305`（`.side-card--hero { height: var(--home-hero-h) }`，即 240–360px）
- **当前问题**：图1 右上 —— 72px 头像 + 名字 + 两行简介 + 3 个 chip，撑在约 300px 高的卡里，上下各留 ~60px 空白，卡片显得空荡。
- **建议**：① **最省事**：把 `height` 改为 `min-height: 0`（删掉这一行即可），卡片贴合内容，Hero 高度不受影响（左列高度由 Hero + 列表决定）；② 若坚持等高，就往卡里补内容：最近更新 2 篇 / 文章总数 / 访问统计，把留白填成信息。
- **优先级**：高　**[样式]**（①）／**[结构]**（②）

### C3. Hero 横幅是"老式 banner"范式
- **涉及**：`src/pages/Home.vue:6-21`（结构）+ `:116-196`（样式）
- **当前问题**：图1 顶部 —— 动漫底图 + 居中 logo 图片 + 白字副标题。① logo 图片本身含"Flygeonの小站"文字，与顶栏 brand 完全重复；② "图片 + 居中堆叠"是 2015 年代博客横幅范式，与页面其余部分的现代卡片语言脱节；③ 16px 白字压在复杂画面上，可读性完全依赖底部 scrim。
- **建议**：① 改为**左对齐文字块**：主标题 28–32px / 副标题 14px / 下方一到两个 chip 入口，scrim 改成 `to right` 的左侧渐变（现为 `to top`，`Home.vue:146-151`）；② 或保图降高：`clamp(240px,36vh,360px)` → `clamp(180px,26vh,240px)`，去掉 logo 图片层，直接用文字标题。方案 ① 视觉提升更大。
- **优先级**：中　**[结构]**

### C4. 文章卡片信息层级偏碎（5 行）
- **涉及**：`src/components/PostCard.vue:34-71` + `_blog.scss:135-211`
- **当前问题**：图1 "博客更新日志"卡自上而下是 标题 → 日期·分类 → 描述 → #更新 → "178 字 · 1 分钟" 共 5 行，其中 `stats` 与 `tags` 分属两行，底部显得零碎。
- **建议**：把字数 / 时长合并进 `post-card__meta` 行（`日期 · 分类 · 178 字 · 1 分钟`），卡片减至 4 行；或保留 `stats` 但与 `tags` 同一行、右对齐。配合 A1/A2 后卡片密度会明显更舒服。
- **优先级**：中　**[结构]**（小）

### C5. 无封面文章在列表里视觉单调
- **涉及**：`PostCard.vue:9`（`v-if="image"` 才渲染 `.post-card__cover`）
- **当前问题**：本站仅少数文章有 `image`，首页实际是纯文字列表，缺少视觉锚点。
- **建议**：可选方案 —— 为无封面文章生成"分类色 + 首个字符 / 分类图标"的渐变封面占位（成本中，收益在列表辨识度）；不做也不算缺陷，优先完成 A1–A3。
- **优先级**：低　**[结构]**

---

## D. 文章页

### D1. 分类信息被渲染两次（真实冗余）
- **涉及**：`src/pages/Post.vue:12`（`.eyebrow` 输出 `post.data.category`）与 `:18-26`（`.post__meta` 里再次输出 category）
- **当前问题**：图2 文章标题上方一行分类小字，标题下方"2026-08-28 · 有趣的项目 · #博客"里又有同一个分类，重复且相互抢注意力。
- **建议**：**eyebrow 保留分类**（承担栏目定位），`post__meta` 移除 category 分支，meta 行只承载时间类信息：`日期 · 字数 · 阅读时长`；标签单独一行 chip 放在 meta 下方。这样文章头的阅读顺序变成：栏目 → 标题 → 时间信息 → 标签，层级干净。
- **优先级**：高　**[样式 / 小结构]**

### D2. 正文列宽过宽 + 段落间距偏紧（中文长文可读性）
- **涉及**：`src/pages/Post.vue:296`（`grid-template-columns: minmax(0, 1fr) 260px`）、`_tokens-extra.scss:23`（`--md-layout-content-max: 880px`）、`src/styles/_markdown.scss:56-58`（`p { margin: 0.9em 0 }`）
- **当前问题**：图2 正文一行约 45–50 个汉字；更关键的是**行高间距（24px×1.75 ≈ 42px）远大于段间距（0.9em ≈ 14px）**，段与段的边界几乎看不出来，长文读起来是"一片"。
- **建议**：
  ① 正文列宽收到 **700–740px**：把 grid 改成 `minmax(0, 740px) 1fr`，TOC 列 260→220px；
  ② 段间距提到 `1.15em–1.25em`（或 `p + p { margin-top: 1.25em }`），让段间距明显大于行间距；
  ③ 顺带把 `line-height: 1.75` 保持（中文合适）。
- **优先级**：高　**[样式]**（改动 3 行，收益最直观）

### D3. h2 下边框偏"学术文档风"
- **涉及**：`_markdown.scss:38-43`（`h2 { border-bottom: 1px solid var(--md-sys-color-outline-variant) }`，h1 同样）
- **当前问题**：图2 的 "Fuwari足够美观优秀，为什么要重构？""归档 & 立项" 在卡片化、圆角化的现代界面里挂了一条老派分隔线，风格冲突；且 h1(30px/700) 与 h2(24px/700) 只靠字号区分，层级偏弱。
- **建议**：去掉 h2 下边框，改为**标题左侧 3px 主色圆角竖条**（`::before` 实现，视觉更"M3"）；字重分层 —— h1 700 / h2 600 / h3 600，h2 字号 24→22px。
- **优先级**：中　**[样式]**

### D4. 目录（TOC）卡四处待打磨
- **涉及**：`src/components/Toc.vue:84-151`
- **当前问题**：图2 右侧目录卡 —— ① 圆角 28px 与全站不一致（见 A3）；② 当前项用"secondary-container 底 + 2px 左竖条 + 600 字重"三重强调，偏重；③ `max-height: 60vh; overflow-y: auto` 但没给滚动条样式，长目录溢出时出现系统默认粗滚动条；④ `.toc__head` 中文用了 uppercase + 字距（见 A4）；⑤ h3/h4 只靠 20/30px 缩进区分，无层级引导线。
- **建议**：圆角改 16px；当前项去掉加粗（保留左竖条 + 主色文字即可）、或去掉背景只留竖条；滚动区加 `scrollbar-width: thin; scrollbar-color: var(--md-sys-color-outline-variant) transparent`；`.toc__list` 左侧加 1px `outline-variant` 贯穿细线，标题缩进挂在线上。
- **优先级**：中　**[样式]**

### D5. 文章页缺少面包屑 / 返回入口
- **涉及**：`Post.vue:11-39`
- **当前问题**：图2 从列表进入文章后，除顶栏外没有任何"我在哪、怎么回去"的线索。
- **建议**：在 eyebrow 位置合并为面包屑 `首页 / {分类} / {当前文章}`（分类可点），与 D1 一起改，不额外增加视觉行数。
- **优先级**：中　**[结构]**

### D6. "继续阅读"卡片无封面时占位空洞
- **涉及**：`Post.vue:90-99, 124-133` + `_blog.scss:606-614`
- **当前问题**：`.rec-card__cover` 是固定 16:9 区域，无图时只填一个 30px 图标 + 纯色底，占了大块面积却没有信息量。
- **建议**：① 无图时改用品牌渐变底 `linear-gradient(135deg, var(--md-sys-color-primary-container), var(--md-sys-color-tertiary-container))`；② 或把无图卡片整体改为**横向紧凑卡**（不渲染封面区，图标放左侧），避免空块。
- **优先级**：中　**[样式]**（①）／**[结构]**（②）

### D7. 上下篇卡片的左右语义
- **涉及**：`Post.vue:49-64`
- **当前问题**：第一格左对齐显示"下一篇"，第二格右对齐显示"上一篇"。视觉上符合左/右布局，但与读者"上一篇在左、下一篇在右"的常规预期相反，且卡片没有方向图标。
- **建议**：确认 `prevSlug / nextSlug` 的时间语义后调整为 **左=上一篇（更早）、右=下一篇（更新）**，并在 label 前加 `arrow_back` / `arrow_forward` 图标。
- **优先级**：中　**[结构]**（小）

---

## E. 番剧页

### E1. 评分 badge 在浅色封面上不可见（对比度缺陷）
- **涉及**：`_blog.scss:1025-1036`（`.bangumi__card-score`：`background: var(--lm-scrim-surface)` = `rgba(252,252,252,.72)`，`color: var(--md-sys-color-primary)` = `#1A5C9E`）
- **当前问题**：图3 中 "四月是你的谎言" 这类**白色/浅色海报**，右上角评分 `8` 几乎完全看不见；深色海报上则正常。属于真实可复现的可用性缺陷。
- **建议**：改为**实心主色底 + 白字**：`background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary);`（暗色主题下 `primary #8BB9F0` + `on-primary #001C3B` 同样成立）；如需保留毛玻璃感，则改深色 scrim `rgba(0,0,0,.55)` + 白字 + `backdrop-filter: blur(8px)`。
- **优先级**：高　**[样式]**（1 条规则）

### E2. "Bangumi 均分"卡片孤立在整行左侧
- **涉及**：`src/pages/Bangumi.vue:11-23` + `_blog.scss:911-967`
- **当前问题**：图3 header 下方，一个约 180×62px 的小卡靠左显示"7.3"，右侧整行空白，视觉重心失衡，看起来像漏做了内容。
- **建议**：① **推荐**：改成一行**统计条** —— 均分 / 收藏总数 / 已看数 三项并排，每项"图标 + 数值 + 标签"，占满整行；② 或直接把均分塞进 `page__header` 的 `.page__meta` 胶囊里（注意：`_blog.scss:24-36` 已定义 `.page__meta` 样式但**全站尚未被任何页面使用**，正好复用）。
- **优先级**：高　**[结构]**（①）／**[样式]**（②）

### E3. 卡片网格列宽偏窄，标题强制单行省略
- **涉及**：`_blog.scss:978-983`（`repeat(auto-fill, minmax(150px, 1fr))` + `gap: var(--ll-gap)` 24px）、`:1040-1047`（标题 `white-space: nowrap` + ellipsis）
- **当前问题**：1200px 容器内主区 1152px → 6 列，每列仅约 172px，封面 172×229；标题 13px 单行截断，长标题如"在超市后门吸烟的二人"接近溢出（图3）。
- **建议**：`minmax(150px → 168px)`、`gap 24px → 20px`（每列 ≈190px）；标题改两行截断 `-webkit-line-clamp: 2`，`white-space: normal`。
- **优先级**：中　**[样式]**

### E4. 状态标签（想看 / 在看 / 看过）无视觉区分
- **涉及**：`_blog.scss:1048-1052`（`.bangumi__card-meta` 统一 12px 灰字）
- **当前问题**：图3 每张卡底部"想看 / 在看 / 看过"完全同色同形，扫视时无法快速归类。
- **建议**：改为小号状态 pill，按状态配色 —— 在看 = 主色、看过 = `secondary-container`、想看 = `surface-container-high` + `on-surface-variant`、搁置 / 抛弃 = 低饱和灰；整体 11px / 中等字重。
- **优先级**：中　**[样式]**

### E5. Varlet tabs 与下方网格是两套层级语言
- **涉及**：`Bangumi.vue:27-40` + `_blog.scss:968-977`
- **当前问题**：图3 的 tabs 因为 `elevation` 属性变成一块悬浮白卡，与下方卡片网格的"描边卡"语言不一致；`bangumi__tab-count` 的 `surface-container-highest` 在 tabs 底色上对比偏弱。
- **建议**：tabs 去掉 `elevation`，改为**通栏下划线 tab 条**（底边 1px `--lm-hairline` + 主色指示条 + 无背景），与页面头部自然衔接；计数 pill 底色改 `surface-container-high` 并加深文字色。
- **优先级**：中　**[样式]**（可能需微调 Varlet 属性）

---

## F. 其他页面

### F1. eyebrow 中英文不统一
- **涉及**：`Archive.vue:4`（`Archive`）、`Friends.vue:4`（`Friends`）、`Search.vue:4`（`Search`）、`Bangumi.vue:4`（`Bangumi`）用英文单词；`Post.vue:12` 用中文分类名
- **当前问题**：同为"栏目定位"的 eyebrow，一半英文一半中文，且中文那半还叠加了 uppercase/字距问题。
- **建议**：统一策略 —— 栏目页用英文 eyebrow（视觉统一、有设计感），文章页把 eyebrow 换成**固定栏目名"文章"**，分类信息下沉到 meta 行；或反向全部中文化。二选一后写进约定。
- **优先级**：中　**[样式]**

### F2. 归档页年份列 sticky 会互相重叠
- **涉及**：`_blog.scss:681-700`（`.archive__group` grid 92px + `.archive__year` `position: sticky; top: calc(header + 16px)`）
- **当前问题**：每个年份组各自 sticky 在同一个 `top` 位置，滚动时**上一年份尚未离开、下一年份已经粘上来**，视觉上两个年份数字叠在一起；且 22px/700 主色年份右侧是整列留白，没有时间轴引导线。
- **建议**：① 去掉 sticky，年份只出现在每组顶部；② 或保留 sticky 但给 `.archive__year` 加背景色遮挡 + "粘住即替换"的交错动画；③ 给 `.archive__items` 左侧加 1px `outline-variant` 竖线 + 每条 item 前 6px 圆点，强化"时间线"语义。
- **优先级**：中　**[样式]**

### F3. 搜索框形态
- **涉及**：`_blog.scss:749-762`（`height: 52px` / `border-radius: var(--md-sys-shape-corner-large)` = 16px）
- **建议**：M3 search bar 规范推荐全圆或 28px；改为 `corner-full`（`999px`）或 `corner-extra-large`（28px），`focus-within` 时描边宽度 1→2px 并加 `box-shadow: 0 0 0 3px var(--md-sys-state-focus)`。
- **优先级**：低　**[样式]**

### F4. 五种空 / 异常状态各写一套
- **涉及**：`.post-list__empty`、`.state-block`（`_blog.scss:251-256`）、`.search__empty`（`:799-818`）、`.bangumi__state`、`.memos__state`
- **建议**：抽统一的 `.empty-state`（图标 40px + 标题 + 说明 + 可选操作按钮），统一 `padding: 64px 0` 与居中；顺带把 404 页（`src/pages/NotFound.vue` + `.placeholder`）纳入。
- **优先级**：低　**[结构]**

---

## G. 字体 / 构建（影响跨设备视觉一致性）

### G1. 正文字体实际来自 Google Fonts CDN，首选字体访客端不存在
- **涉及**：`index.html:29-34`（Noto Sans SC webfont）、`_tokens-extra.scss:14`（`--ll-font` 首选 `"SarasaGothicSC-Regular"` —— 本地字体，访客不装就跳过）
- **当前问题**：实际渲染结果取决于网络 —— 加载成功用 Noto Sans SC，失败回落微软雅黑 / 苹方，**同一篇文章在不同设备上字形、字重、行宽都不同**；国内访问 Google Fonts 失败概率高，还会带来 FOUT / 布局抖动。
- **建议**：① **推荐**：把 Noto Sans SC 按常用字集子集化后自托管到 `src/assets/fonts/`（与图标字体同一思路，`_icons.scss` 已有成熟先例），彻底去掉外部依赖；② 或改系统字体栈优先 `system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC"`，零成本但放弃字形一致性。
- **优先级**：高（跨设备一致性）　**[结构 / 构建]**

### G2. 图标字体 `font-display: block`
- **涉及**：`src/styles/_icons.scss:29`
- **说明**：26KB 本地子集，`block` 造成的不可见期极短，且能避免"先显示图标名文本再跳变"。**建议保持现状**，仅在实测发现首屏图标延迟时改 `swap`。
- **优先级**：低（无需改动）

### G3. 暗色主题本轮未验证
- **涉及**：`_tokens-extra.scss:120-142`（只覆盖了 state layer）
- **说明**：A1（底板下沉）、A2（阴影）在暗色下需要用反相值；`--lm-hairline` 暗色下是 `rgba(255,255,255,.09)`，与卡片新底色叠加后对比需要复测。
- **建议**：本轮先做浅色，暗色随 A1/A2 一起改完后截一次暗色图复验。
- **优先级**：中（跟随 A1/A2）　**[样式]**

---

## 附：汇总统计

| 维度 | 高 | 中 | 低 | 小计 |
|---|---|---|---|---|
| A 全局基底 | 4 | 2 | 0 | 6 |
| B 顶栏 / 页脚 | 1 | 2 | 1 | 4 |
| C 首页 | 2 | 1 | 1 | 4 |
| D 文章页 | 2 | 4 | 0 | 6 |
| E 番剧页 | 2 | 3 | 0 | 5 |
| F 其他页面 | 0 | 2 | 2 | 4 |
| G 字体 / 构建 | 1 | 1 | 1 | 3 |
| **合计** | **12** | **15** | **5** | **32** |

**类型分布**：纯样式优化 22 项 / 需要结构调整 10 项。

**如果只做三件事**：A1+A2（卡片层级）、D2（正文列宽与段间距）、E1（评分对比度）—— 三处共约 8 行 CSS，覆盖三张截图里最显性的问题。
