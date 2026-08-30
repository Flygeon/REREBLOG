---
title: 邪道,让你的个人站点也能显示博客的文章
published: 2026-07-26
description: 本文主要讲述了神人站长为了给自己的个人页集成博客的功能，但又不想迁移原有的 Astro 博客，而发动鬼脑想出了邪道手法——让个人页显示博客文章的摘要
image: https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/blogpost.webp
tags:
  - 博客
  - 个人主页
category: 折腾记录
draft: false
updated: 2026-07-26
pinned: false
---
## 起因

由于这个神人站长昨天灵机一动，将原有的 Svelte 框架的个人主页迁移成了 Next.js 框架，又灵机一动，不如把原有的博客功能迁移到个人主页上吧，做成一个 all in one 的个人页，但这就导致了一个问题，原有的博客已经具有SEO收录了，SEO 也有了一些积累。这时候如果强行把博客内容全部迁走，原来的收录就全白费了。再者说，Fuwari 的 UI 确实长在我的审美上，我暂时也不会去进行迁移。

那干脆折中一下，直接在个人页上加一个博客板块，显示我原博客的文章信息，点击就可以跳转到原文吧。

![blogpost.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/blogpost.webp)

## 改造

这时候有人就想了，博客不是有一个RSS的东西吗？能不能通过这个东西实现我的目的呢？只需要让个人页读取到RSS的文章信息，然后实时渲染就行了。

理论上这样确实可以，但 RSS 的内容含有很多干扰，信息不是很简洁，对于文章的原数据支持也不是特别好，所以我的想法是手动造一个更”高级”的RSS——造一个**比 RSS 更适合我需求的 JSON 数据接口**

### 生成文章摘要的 JSON 文件

我们可以使用 Astro 的 API 端点（`src/pages/posts.json.ts`）在构建时生成文章摘要的 JSON 文件，类似于下图

![post-json.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/post-json.webp)

这样子就可以涵盖标签分类以及封面图了

这样子问题就变成了如何让个人页去解析这个Json文件。

### 两个方案

这时候实际上有两种选择：

1. 用户访问个人页的博客板块时，浏览器直接去请求 `flygeon.top/posts.json`，拿到数据后再渲染
2. 个人页在构建的时候就去抓取 `posts.json`，生成对应的静态 HTML 文件。这样用户访问的时候直接就是现成的页面，同时，这也是搜索引擎爬虫希望看到的，更有利于SEO优化~~~（虽然对于个人页SEO没什么影响就是了）~~~

如果选择**选项一**，好处是可以实时更新，只需要文章发布后，用户访问个人页的文章界面，就能实时呈现

但缺点就是需要解决CORS跨域问题，由于我的网站、博客和个人页使用的是两个不同的域名：个人页使用的是 re.zh.kg 这个短域，而博客使用的是 flygeon.top 这个域名，因此不能直接进行抓取，同时，这种方案在文章多的情况下，解析需要增加耗时

那如果选择**选项二**呢，那就要考虑如何让个人业知道我的博客进行更新了

考虑了一下，我选择了方案二，通过跨仓库触发**repository_dispatch**来实现

说白了解决这个问题的核心就是**跨仓库通信**——博客仓库需要向个人页仓库发送一个"我更新了"的信号。

GitHub Actions 提供了一个叫 `repository_dispatch` 的事件，完美解决了这个问题。它的工作流程很简单：

> 外部系统（或另一个仓库的 Action）调用 GitHub API → 向目标仓库发送 `repository_dispatch` 事件 → 目标仓库中监听该事件的 workflow 被触发

简单来讲就是一种"广播-监听"模型。我在博客仓库里广播一个"astro-updated"事件，个人页仓库监听到这个事件后就开始重新构建。

既然方案敲定了，那就动手开始改造吧

## 修改个人页及workflow工作流

个人页修改没什么好说的，只需要让其能获取并解析到这个 Json 文件，并渲染成静态文件就行，直接丢给AI解决

主要的改造还是workflow工作流方面，`repository_dispatch` 可以实现信号的传递，只需要增添一个PAT密钥即可

在`.github/workflows`目录下新建一个`trigger-profiles-on-push.yml`，填上下面的内容：

```yaml
# .github/workflows/trigger-profiles-on-push.yml
name: Trigger Profiles on Push
on:
  push:
    branches:
      - main
    paths:
      - 'src/content/posts/**'

jobs:
  trigger-profiles:
    runs-on: ubuntu-latest
    steps:
      - name: Send trigger to profiles repository
        run: |
          echo "🚀 开始触发 profiles 仓库部署..."
          
          # 关键：明确指定目标仓库的完整路径
          REPO_OWNER="Flygeon"   # 例如：flygeon
          REPO_NAME="Profile-page"                   # 你的 profiles 仓库名
          
          curl -X POST \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: token ${{ secrets.PROFILES_REPO_PAT }}" \
            "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches" \
            -d '{"event_type":"astro-updated"}'
          
          echo "✅ 触发信号已发送"
```

同时在你的GitHub设置里设置一个pat密钥，这样就可以实行跨仓库的广播
再在你的另一个仓库下建一个workflow侦测这个信号：

```ymal
name: Deploy on Astro Update
on:
  repository_dispatch:
    types: [astro-updated]

# ========== 关键修改：授予写入权限 ==========
permissions:
  contents: write  # 允许推送到代码仓库

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # ========== 新增：等待 180 秒，确保博客构建完成 ==========
      - name: Wait for blog build to complete
        run: |
          echo "⏳ 检测到 Astro 更新，等待 180 秒确保博客构建完成..."
          sleep 180
          echo "✅ 等待完成，开始构建个人站"

      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.14.4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Debug build output
        run: |
          echo "当前目录内容："
          ls -la
          echo "检查 out 目录："
          if [ -d "./out" ]; then
            echo "✅ out 目录存在，内容如下："
            ls -la ./out
          else
            echo "❌ 错误：out 目录不存在！"
            echo "尝试查找可能的输出目录："
            find . -maxdepth 2 -type d -name "build" -o -name "public" -o -name "dist" 2>/dev/null
            exit 1
          fi

      - name: Push to build branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
          publish_branch: build
          force_orphan: true
          commit_message: "Deploy from Astro update ${{ github.sha }}"

      - name: Deploy to Cloudflare Pages
        run: |
          if [ -d "./out" ]; then
            echo "🚀 开始部署到 Cloudflare Pages..."
            npx wrangler pages deploy ./out --project-name=profiles
            echo "✅ Cloudflare Pages 部署完成"
          else
            echo "❌ out 目录不存在，跳过 Pages 部署"
            exit 1
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

同时在 GitHub 仓库 `Settings → Secrets and variables → Actions` 里加两个 secret，不加的话 workflow 会直接报错退出。


| Secret | 说明 | 获取方式 |
| ----------------------- | ------ | ------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | API 令牌 | Cloudflare Dashboard → My Profile → API Tokens → Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | 账户 ID | Cloudflare Dashboard 右侧栏 |


这样就完成了，值得注意的是，我在这个工作流里添加了一个等待3分钟的部分。主要原因是触发的工作流和博客构建的工作流是同时进行的。如果博客没有构建好，个人站优先触发构建，就会导致post.json并没有进行更新，也就抓取不到最新的文章信息，也算是一种曲线救国方案了，虽然说这种方案比较暴力，但确实有效，毕竟我也不追求那一两分钟时间差，也就只是需要多等一点和不够优雅了

## 带来的好处

这样子，个人页和博客就算建立起一个连接了，不仅不会降低 SEO 的权重，反而还有利于 SEO，如果直接把博客全文复制到个人主页，两个站点出现完全相同的文章，就会触发搜索引擎的**重复内容（Duplicate Content）**问题——搜索引擎无法判断哪个版本是原创，导致权重分散，两边的排名都可能受到负面影响。

规范标签（`rel="canonical"`）可以解决这个问题，但它会让个人主页上的文章版本无法获得任何搜索排名。既然个人主页本身不需要靠文章页来获取流量，更优的选择是：**只展示摘要，链接指向原文。**

这个策略既能规避重复内容风险，又能为博客传递权重，个人主页只展示文章的标题、摘要和标签，不包含正文。搜索引擎会将其理解为“索引页”而非“内容页”，不会与博客原文产生重复内容竞争。同时，列表页上的链接为博客传递了权重，是一种双向增益的关系。

到此为止，改造也算是彻底结束了，其实改造过程中还是踩了很多坑的，文章并没有过多提及，也算是给大伙提供一个参考了，这也是我能想到的一个比较优的方案了，现在只需要更新文章，博客的仓库就会自动触发构建和发送信号给个人页两个工作流~~（其实还有点小bug，有点历史遗留问题，会重复触发构建，晚点再修了）~~，个人页侦测到信号时，触发构建工作流，先等待 3 分钟，待博客构建完成之后，个人页再进行构建，构建完成后，把构建产物推送到 Cloudflare Pages。

ALL，以上



&nbsp;