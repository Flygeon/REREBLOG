---
title: 对个人主页进行了重构并迁移了框架
published: 2026-07-25
description: 将原来的Svelte的个人主页重构为Next.js，大幅重构了页面，整体屎山得到优化
image: https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/profile1.webp
tags:
  - 个人导航
category: 有趣的项目
draft: false
updated: 2026-07-25
pinned: false
---
重构后

![profile1.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/profile1.webp)

也是对个人主页操刀重构了，原来那一版太石山了，再加上很多组件都是现搓的，导致后续维护和优化十分麻烦，于是改用了next.js

## next.js好处都有啥？

改用了 Next.js 之后，最大的感触就是有很多现成的组件可以直接引用，不用自己动手造轮子了，写起来非常舒服。而且得益于良好的首屏加载优化，实际的用户体验肯定是要比原来的那个站点更好的。

新站点仍然延续旧站的暗黑风格，同时将原来的圆角UI改成了方形(深受磁贴效果影响)，感觉整体来说还是比以前更耐看一点（）（）（）

## 调整

btw，这次还创新地新增了标题点阵风格，鼠标移动到点阵会有排斥崩坏的效果，这点也是非常的 amazing 了。背景动画也改用了斐波那契图案的排列，同时也是经由克劳德大人精心优化了页脚和设计，看起来也就更耐用了

同时也对页面滚动的元素加载动效做出了优化，现在会有淡出淡入的模糊效果，~~爱来自克劳德老师傅~~

值得一提的是重构之后的版本是目前GitHub仓库的main分支，而旧站点则迁移到了old分支，欢迎各位前来学习

## 小巧思

对站点做了点小巧思设计，最大化地利用了空间：

1. 长按右下角“返回顶部”的按钮，可以展开一个二级菜单，显示音乐播放器；
2. 双击“返回顶部”的按钮，则可以切换下一首歌曲。

以后也会把这个按钮做出更多新花样来。

同时还留下了一点小彩蛋，等待大家挖掘（）

## END

其余也没啥好说的了喵，大伙可以访问**[re.zh.kg](https://re.zh.kg)**来进行预览

也欢迎各位来给我点点star谢谢喵

**[https://github.com/Flygeon/Profile-page](https://github.com/Flygeon/Profile-page)**

 1