<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Friends</div>
      <h1 class="section-title">友链</h1>
      <p class="section-sub">朋友们的小站，欢迎留言交换友链、互相串门。</p>
    </header>

    <!-- 友链卡片网格 -->
    <section class="friends__grid" aria-label="友链列表">
      <a
        v-for="item in shuffled"
        :key="item.title"
        class="friend-card"
        :href="item.siteurl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div class="friend-card__avatar">
          <img :src="item.imgurl" :alt="`${item.title} 头像`" loading="lazy" />
        </div>
        <div class="friend-card__info">
          <div class="friend-card__title">{{ item.title }}</div>
          <div class="friend-card__desc">{{ item.desc }}</div>
        </div>
        <AppIcon class="friend-card__arrow" name="arrow_forward" :size="20" />
      </a>
    </section>

    <!-- friends.md 正文（申请格式说明） -->
    <article class="friends__content markdown-body" v-html="html"></article>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import { getSpec } from "@lib/posts";
import { renderMarkdown } from "@lib/markdown";
import { setHead } from "@lib/head";

const html = ref("");

const spec = getSpec("friends");
setHead({
  title: "友链 - 朋友们的小站 | Flygeonの小站",
  description:
    spec?.description ||
    "Flygeonの小站 的友情链接页面：收录朋友们的小站，欢迎留言交换友链，一起在互联网上互相串门。",
});

if (spec) {
  html.value = await renderMarkdown(spec.body);
}

// 友链数据（对齐原 friends.astro 的 items）
const items = [
  {
    title: "Flygeonの小站",
    imgurl: "https://flygeon.top/_astro/avatar.CCT2o-B8_13KVJb.webp",
    desc: "音无结弦之时，悦动天使之心； 立于浮华之世，奏响天籁之音。",
    siteurl: "https://flygeon.top",
  },
  {
    title: "二叉树树",
    imgurl: "https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0",
    desc: "Protect What You Love.",
    siteurl: "https://2x.nz",
  },
  {
    title: "二次元短文の小站",
    imgurl: "https://543902.xyz/_astro/avatar.Bm6ATQHp_Z1g7TFh.webp",
    desc: "世界は大きい、君は行かなければならない",
    siteurl: "https://543902.xyz",
  },
  {
    title: "年华",
    imgurl: "https://q1.qlogo.cn/g?b=qq&nk=1323860289&s=640",
    desc: "分享生活和技术。",
    siteurl: "https://blog.amamo.top",
  },
  {
    title: "Ankyu",
    imgurl: "https://blog.ankyu.top/assets/images/avatar.webp",
    desc: "欢迎来到安秋的博客Ankyu!",
    siteurl: "https://blog.ankyu.top",
  },
  {
    title: "Silvaire's Blog",
    imgurl:
      "https://wsrv.nl/?url=avatars.githubusercontent.com/u/184231508?s=400&u=0a370792ba6bbb95a04d309171b562bcd7283a0f&v=3",
    desc: "Per Aspera Ad Astra",
    siteurl: "https://silvaire.top/",
  },
];

// 客户端随机洗牌（原站 DOMContentLoaded 时打乱顺序）
const shuffled = shuffle(items);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
</script>
