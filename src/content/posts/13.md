---
create: "13"
title: 哎我去这个Pages CMS真神了
published: 2026-07-04
description: 通过向你的静态博客仓库导入Pages CMS实现在浏览器里优雅地管理你的文章
image: https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/13-cover.webp
tags:
  - Pages CMS
  - 博客
category: 教程
draft: false
updated: 2026-07-04
pinned: false
---
如标题所言，我们在静态博客写文章时时，正常情况下都是通过本地建立md文章通过ide或者黑曜石等编写，然后push到仓库的，但现在Pages CMS帮我们代替了这个活，只需要简单配置就可以放空大脑了

## 原理

Pages CMS通过一个放置在仓库根目录的 `.pages.yml` 来声明式配置所有功能。包括你的图片、文章数据、命名格式

然后通过预定义的行为去读写Github，创建，编辑文件，创建Action等等，用人话来说就是把Github当数据库用

也就是说，通过Pages CMS这个媒介，我们完全可以摒弃传统派做法，将整个流程交给了网页~~（传统写文方式已经过时了，现在像我们走来的是维新派）~~

## 如何使用

访问[https://app.pagescms.org/](https://app.pagescms.org/) ，通过你的GitHub一键登录，授权一下，就能在pagescms里看到你的仓库地址了，选择你的博客仓库，初次使用的话还需要配置一下，在configuration选项卡里可以配置，我的建议是直接把docs网址丢给ai让它帮你写，这里贴一下我的提示词，仅供参考

```bash
[https://pagescms.org/docs/configuration/](https://pagescms.org/docs/configuration/) 阅读这篇文章，帮我写适用于astro博客fuwari主题的配置，我的图片存储在/image里，文章在src\content\posts里，文章结构示例：---  
title: 0成本将你的OneDrive部署至互联网,以及博客的一些小规划  
published: 2026-06-14  
description: 使用CVercel和OneDrive API，无需服务器和域名即可将OneDrive网盘部署到互联网，实现文件在线预览和下载  
image: "[https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/9-cover.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/9-cover.webp)"  
tags: [Vercel, OneDrive, 网盘, 教程]  
category: 教程  
draft: false  
---+文章正文
```

写好之后直接贴进配置里，你就可以优雅地在网页端写文章了，就和动态博客的编辑器一样，包括图片也是直接拖进窗口里就行，节省了非常多的时间