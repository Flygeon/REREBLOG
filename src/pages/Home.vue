<template>
  <div class="container home">
    <!--
      ============ 门户首页 ============
      板块（自上而下）：自我介绍 Hero → 站点导航 → 数据一览 + 写作足迹
                        → 最新文章 → 高分收藏
      全部数据构建期即可确定（allPosts / bangumi.json / config），
      因此预渲染 HTML 自带完整内容，首屏无需任何网络请求。
    -->

    <!-- ===== ① Hero：自我介绍 + 主行动点 ===== -->
    <section class="home-hero" aria-labelledby="home-hero-title">
      <div class="home-hero__body">
        <p class="home-hero__eyebrow">Personal Portal</p>
        <h1 id="home-hero-title" class="home-hero__title">
          你好，我是 {{ profile.name }}
        </h1>
        <p class="home-hero__bio">{{ profile.bio }}</p>

        <div class="home-hero__cta">
          <RouterLink v-ripple class="lm-btn lm-btn--filled" to="/blog">
            进入博客
            <AppIcon name="arrow_forward" :size="18" />
          </RouterLink>
          <RouterLink v-ripple class="lm-btn lm-btn--tonal" to="/about">
            关于我
            <AppIcon name="person" :size="18" />
          </RouterLink>
        </div>

        <div v-if="socialLinks.length" class="home-hero__social">
          <a
            v-for="link in socialLinks"
            :key="link.url"
            v-ripple
            class="home-hero__social-link"
            :href="link.url"
            target="_blank"
            rel="noopener"
            :title="link.name"
            :aria-label="link.name"
          >
            <BrandIcon :name="link.icon" :size="20" />
          </a>
        </div>
      </div>

      <div class="home-hero__avatar">
        <img :src="avatarUrl" :alt="profile.name" width="160" height="160" />
      </div>
    </section>

    <!-- ===== ② 站点导航：门户的核心，把各目的地摊开 ===== -->
    <section v-reveal class="home-section" aria-labelledby="home-nav-title">
      <h2 id="home-nav-title" class="home-section__title">站点导航</h2>

      <div class="portal-grid">
        <RouterLink
          v-for="tile in tiles"
          :key="tile.to"
          v-ripple
          class="portal-tile"
          :to="tile.to"
        >
          <span class="portal-tile__icon" aria-hidden="true">
            <AppIcon :name="tile.icon" :size="22" />
          </span>
          <span class="portal-tile__text">
            <span class="portal-tile__label">{{ tile.label }}</span>
            <span class="portal-tile__meta">{{ tile.meta }}</span>
          </span>
          <AppIcon class="portal-tile__arrow" name="arrow_forward" :size="18" />
        </RouterLink>

        <a
          v-ripple
          class="portal-tile"
          href="https://www.travellings.cn/go.html"
          target="_blank"
          rel="noopener"
        >
          <span class="portal-tile__icon" aria-hidden="true">
            <AppIcon name="travel_explore" :size="22" />
          </span>
          <span class="portal-tile__text">
            <span class="portal-tile__label">开往</span>
            <span class="portal-tile__meta">随机去别人家逛逛</span>
          </span>
          <AppIcon class="portal-tile__arrow" name="open_in_new" :size="18" />
        </a>
      </div>
    </section>

    <!-- ===== ③ 数据一览 + 写作足迹 ===== -->
    <section v-reveal class="home-section" aria-labelledby="home-stats-title">
      <h2 id="home-stats-title" class="home-section__title">数据一览</h2>

      <div class="home-panel">
        <div class="stat-grid">
          <div v-for="s in stats" :key="s.label" class="stat">
            <span class="stat__value">{{ s.value }}</span>
            <span class="stat__label">{{ s.label }}</span>
          </div>
        </div>

        <!--
          写作足迹：53 周 × 7 天的热力格。
          日期一律按 UTC 取值 —— 预渲染在构建机上算、客户端在访客时区算，
          若用本地时间，UTC 以西的访客会整体错一天，造成水合不一致。
        -->
        <div class="activity">
          <div class="activity__head">
            <span class="activity__title">写作足迹</span>
            <span class="activity__range">
              {{ activityRange }} · 共 {{ allPosts.length }} 篇
            </span>
          </div>

          <!-- 53 周在窄屏放不下：容器内横向滚动，不撑破页面 -->
          <div class="activity__scroll">
            <div
              class="activity__grid"
              role="img"
              :aria-label="'写作足迹热力图，' + activityRange + '，共 ' + allPosts.length + ' 篇文章'"
            >
              <div v-for="(week, wi) in weeks" :key="wi" class="activity__week">
                <span
                  v-for="day in week"
                  :key="day.key"
                  class="activity__day"
                  :class="'is-lv' + day.level"
                  :title="day.count ? day.key + '：' + day.count + ' 篇' : day.key"
                ></span>
              </div>
            </div>
          </div>

          <div class="activity__legend" aria-hidden="true">
            <span>少</span>
            <span class="activity__day is-lv0"></span>
            <span class="activity__day is-lv1"></span>
            <span class="activity__day is-lv2"></span>
            <span class="activity__day is-lv3"></span>
            <span class="activity__day is-lv4"></span>
            <span>多</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ④ 最新文章 ===== -->
    <section v-reveal class="home-section" aria-labelledby="home-posts-title">
      <div class="home-section__head">
        <h2 id="home-posts-title" class="home-section__title">最新文章</h2>
        <RouterLink class="home-section__more" to="/blog">
          全部 {{ allPosts.length }} 篇
          <AppIcon name="arrow_forward" :size="16" />
        </RouterLink>
      </div>

      <div class="post-list">
        <PostCard
          v-for="post in latestPosts"
          :key="post.slug"
          :post="post"
          :url="'/posts/' + post.slug + '/'"
        />
      </div>
    </section>

    <!-- ===== ⑤ 高分收藏（Bangumi 构建期快照） ===== -->
    <section
      v-if="topBangumi.length"
      v-reveal
      class="home-section"
      aria-labelledby="home-bgm-title"
    >
      <div class="home-section__head">
        <h2 id="home-bgm-title" class="home-section__title">高分收藏</h2>
        <RouterLink class="home-section__more" to="/bangumi">
          全部 {{ bangumiTotal }} 部
          <AppIcon name="arrow_forward" :size="16" />
        </RouterLink>
      </div>

      <div class="bgm-strip">
        <a
          v-for="item in topBangumi"
          :key="item.subject_id"
          class="bgm-strip__item"
          :href="'https://bgm.tv/subject/' + item.subject_id"
          target="_blank"
          rel="noopener"
          :title="item.name_cn || item.name"
        >
          <span class="bgm-strip__cover">
            <img
              :src="item.cover"
              :alt="item.name_cn || item.name"
              loading="lazy"
              decoding="async"
            />
            <span v-if="item.score > 0" class="bgm-strip__score">
              <AppIcon name="star" :size="12" />
              {{ item.score }}
            </span>
          </span>
          <span class="bgm-strip__name">{{ item.name_cn || item.name }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@components/AppIcon.vue";
import BrandIcon from "@components/BrandIcon.vue";
import PostCard from "@components/PostCard.vue";
import { profileConfig, siteConfig } from "@/config";
import { allPosts } from "@lib/posts";
import { getCategoryList, getTagList } from "@utils/content-utils";
import { setHead } from "@lib/head";
import avatarUrl from "@assets/images/avatar.png";
import bangumiSnapshot from "@/data/bangumi.json";
import { reveal } from "@composables/reveal";

// 模板滚动入场指令（局部注册，配合 v-reveal 使用）
const vReveal = reveal;

const profile = profileConfig;
const socialLinks = computed(() => profileConfig.links ?? []);

setHead({
  title: siteConfig.title + " - Flygeon 的个人博客与自建项目分享",
  description:
    "Flygeon の个人站点门户：汇集博客文章、Bangumi 番剧收藏、日常动态与自建项目，也记录 Web 开发与设计上的折腾。",
});

/* ---------------- 站点导航磁贴 ---------------- */

interface BangumiItem {
  subject_id: number;
  type: number;
  name: string;
  name_cn: string;
  score: number;
  cover: string;
}

const bangumiItems = (bangumiSnapshot as { items: BangumiItem[] }).items ?? [];
const bangumiTotal = bangumiItems.length;

const tiles = [
  { to: "/blog", icon: "article", label: "博客", meta: allPosts.length + " 篇文章" },
  { to: "/bangumi", icon: "smart_display", label: "番剧", meta: bangumiTotal + " 部收藏" },
  { to: "/memos", icon: "edit_note", label: "动态", meta: "碎碎念与日常" },
  { to: "/friends", icon: "group", label: "友链", meta: "朋友们的小站" },
  { to: "/about", icon: "person", label: "关于", meta: "我与这个小站" },
  { to: "/search", icon: "search", label: "搜索", meta: "站内全文检索" },
];

/* ---------------- 数据一览 ---------------- */

/**
 * 千分位格式化：刻意不用 toLocaleString —— 它的分组规则随运行环境 locale 变化，
 * 构建机与访客浏览器可能给出不同字符串，触发水合不一致。
 */
function withThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const totalWords = allPosts.reduce((sum, p) => sum + (p.stats?.words ?? 0), 0);

const stats = computed(() => [
  { label: "文章", value: withThousands(allPosts.length) },
  { label: "总字数", value: withThousands(totalWords) },
  { label: "分类", value: withThousands(getCategoryList(allPosts).length) },
  { label: "标签", value: withThousands(getTagList(allPosts).length) },
]);

/* ---------------- 写作足迹 ---------------- */

const DAY_MS = 86400000;
const WEEKS = 53;

/** 按 UTC 日期累计每天的文章数 */
const activityCount = computed(() => {
  const map = new Map<string, number>();
  for (const post of allPosts) {
    const key = post.data.published.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
});

/**
 * 锚点取「最后一篇文章的日期」，而不是「今天」：
 * 今天随构建时间与访客本地时间漂移，锚在内容上才能让预渲染 HTML 与客户端逐格一致。
 */
const activity = computed(() => {
  const times = allPosts.map((p) => p.data.published.getTime());
  if (!times.length) return { weeks: [], first: "", last: "" };

  const end = new Date(Math.max(...times));
  // 对齐到该日所在周的周日（UTC），再向前回退 52 周铺满 53 列
  const endWeekStart =
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
    end.getUTCDay() * DAY_MS;
  const gridStart = endWeekStart - (WEEKS - 1) * 7 * DAY_MS;

  const weeks: { key: string; count: number; level: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const days: { key: string; count: number; level: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(gridStart + (w * 7 + d) * DAY_MS);
      const key = cur.toISOString().slice(0, 10);
      const count = activityCount.value.get(key) ?? 0;
      // 本站发文密度低，强度分 4 档足够，再细分也分辨不出
      days.push({ key, count, level: count === 0 ? 0 : Math.min(4, count) });
    }
    weeks.push(days);
  }

  return {
    weeks,
    first: new Date(gridStart).toISOString().slice(0, 10),
    last: new Date(endWeekStart + 6 * DAY_MS).toISOString().slice(0, 10),
  };
});

const weeks = computed(() => activity.value.weeks);
const activityRange = computed(() =>
  activity.value.first
    ? activity.value.first + " 至 " + activity.value.last
    : "",
);

/* ---------------- 最新文章 ---------------- */

// allPosts 已按「置顶优先 + 日期倒序」排好，首页取前 3 篇
const latestPosts = computed(() => allPosts.slice(0, 3));

/* ---------------- 高分收藏 ---------------- */

const topBangumi = computed(() =>
  bangumiItems
    .filter((i) => i.score > 0 && i.cover)
    .slice()
    .sort((a, b) => b.score - a.score || a.subject_id - b.subject_id)
    .slice(0, 6),
);
</script>

<style scoped lang="scss">
/* ============================================================
   门户首页
   口径：卡片用 --site-card / --site-card-border / --site-elev-*；
   hover 用 MD3 state layer（::before 叠 on-surface 8%）；
   间距一律 --space-*；动效一律带 prefers-reduced-motion 降级。
   禁止裸 z-index（用 --z-below）。
   ============================================================ */

.home {
  padding: var(--space-14) 0 var(--space-16);
}

.home-section {
  margin-top: var(--space-16);
}

.home-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-6);
}

.home-section__title {
  font-size: var(--md-sys-typescale-title-medium-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.home-section__more {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--md-sys-color-primary);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 600;
  white-space: nowrap;
}

.home-section__more:hover {
  text-decoration: underline;
}

/* ---------- ① Hero ---------- */

.home-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-14);
  padding: var(--space-15) var(--space-16);
  border-radius: var(--ll-radius-card);
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
  overflow: hidden;
}

/*
  环境光晕：静态径向渐变，无动画（故无需 reduced-motion 分支）。
  先给静态 rgba 兜底 —— color-mix() 在旧内核里会让整条声明失效 —— 支持时再换回主题色。
*/
.home-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: var(--z-below);
  pointer-events: none;
  background-image: radial-gradient(
    circle at 12% 0%,
    rgba(26, 92, 158, 0.16),
    transparent 62%
  );
}

@supports (color: color-mix(in srgb, red, blue)) {
  .home-hero::before {
    background-image: radial-gradient(
      circle at 12% 0%,
      color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent),
      transparent 62%
    );
  }
}

.home-hero__body {
  position: relative;
  min-width: 0;
}

.home-hero__eyebrow {
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-primary);
}

.home-hero__title {
  margin-top: var(--space-5);
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.home-hero__bio {
  margin-top: var(--space-8);
  max-width: 46ch;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-large-size);
  line-height: 1.8;
  /* config 里的签名用 \n 分行，按原样换行 */
  white-space: pre-line;
}

.home-hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-top: var(--space-13);
}

.home-hero__social {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-11);
}

.home-hero__social-link {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--site-card-border);
  color: var(--md-sys-color-on-surface-variant);
  transition: color var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

.home-hero__social-link::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: var(--z-below);
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

.home-hero__social-link:hover {
  color: var(--md-sys-color-primary);
}

.home-hero__social-link:hover::before {
  opacity: 0.08;
}

.home-hero__avatar {
  position: relative;
}

.home-hero__avatar img {
  display: block;
  width: clamp(112px, 15vw, 160px);
  height: clamp(112px, 15vw, 160px);
  border-radius: 50%;
  object-fit: cover;
  /* 双环：内圈卡片色做留白，外圈细描边，亮暗主题下都能与卡片分开 */
  border: 4px solid var(--site-card);
  box-shadow:
    0 0 0 1px var(--site-card-border),
    var(--md-sys-elevation-2);
}

/* ---------- ② 站点导航 ---------- */

.portal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: var(--space-10);
  margin-top: var(--space-10);
}

.portal-tile {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-11);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
  transition:
    box-shadow var(--md-sys-motion-duration-short)
      var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-short)
      var(--md-sys-motion-easing-standard);
}

.portal-tile::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: var(--z-below);
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

.portal-tile:hover {
  box-shadow: var(--site-elev-2);
  transform: translateY(-2px);
}

.portal-tile:hover::before {
  opacity: 0.08;
}

.portal-tile__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.portal-tile__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.portal-tile__label {
  font-size: var(--md-sys-typescale-body-large-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.portal-tile__meta {
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.portal-tile__arrow {
  position: relative;
  color: var(--md-sys-color-on-surface-variant);
  transition: color var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

.portal-tile:hover .portal-tile__arrow {
  color: var(--md-sys-color-primary);
}

/* ---------- ③ 数据一览 ---------- */

.home-panel {
  margin-top: var(--space-10);
  padding: var(--space-12);
  border-radius: var(--ll-radius-card);
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: var(--space-10);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat__value {
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--md-sys-color-primary);
  /* 等宽数字：避免各列数值变化时宽度跳动 */
  font-variant-numeric: tabular-nums;
}

.stat__label {
  font-size: var(--md-sys-typescale-label-large-size);
  color: var(--md-sys-color-on-surface-variant);
}

/* ---------- 写作足迹 ---------- */

.activity {
  margin-top: var(--space-12);
  padding-top: var(--space-12);
  border-top: 1px solid var(--site-card-border);
}

.activity__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}

.activity__title {
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 600;
}

.activity__range {
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}

/* 53 周在窄屏放不下：容器内横向滚动，绝不撑破页面 */
.activity__scroll {
  margin-top: var(--space-8);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-2);
}

.activity__grid {
  display: flex;
  gap: 3px;
  width: max-content;
}

.activity__week {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  gap: 3px;
}

.activity__day {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: var(--md-sys-color-surface-container-high);
}

/* 强度四档：主色按透明度分层，亮暗自适应 */
.activity__day.is-lv1 {
  background: color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent);
}
.activity__day.is-lv2 {
  background: color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent);
}
.activity__day.is-lv3 {
  background: color-mix(in srgb, var(--md-sys-color-primary) 68%, transparent);
}
.activity__day.is-lv4 {
  background: var(--md-sys-color-primary);
}

/* 不支持 color-mix() 的旧内核：四档退化为半透明主色，仍能读出分布 */
@supports not (color: color-mix(in srgb, red, blue)) {
  .activity__day.is-lv1,
  .activity__day.is-lv2,
  .activity__day.is-lv3 {
    background: var(--md-sys-color-primary);
    opacity: 0.65;
  }
}

.activity__legend {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
  font-size: var(--md-sys-typescale-label-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

/* ---------- ⑤ 高分收藏 ---------- */

.bgm-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-8);
  margin-top: var(--space-10);
}

.bgm-strip__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.bgm-strip__cover {
  position: relative;
  display: block;
  aspect-ratio: 3 / 4;
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
  background: var(--md-sys-color-surface-container-highest);
  box-shadow: var(--site-elev-1);
}

.bgm-strip__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--md-sys-motion-duration-medium)
    var(--md-sys-motion-easing-standard);
}

.bgm-strip__item:hover .bgm-strip__cover img {
  transform: scale(1.05);
}

.bgm-strip__score {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-4);
  border-radius: var(--md-sys-shape-corner-full);
  /* 压在封面图上，需固定深色底 + 白字，不能跟随主题 */
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: var(--md-sys-typescale-label-small-size);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.bgm-strip__name {
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.5;
  /* 标题最多两行，保证栅格下沿齐平 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 响应式 ---------- */

@media (max-width: 1080px) {
  .bgm-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .home {
    padding-top: var(--space-12);
  }

  /* Hero 转单列：头像在上、文字居中，符合移动端阅读顺序 */
  .home-hero {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
    gap: var(--space-12);
    padding: var(--space-14) var(--space-12);
  }

  .home-hero__body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .home-hero__avatar {
    order: -1;
  }

  .home-hero__bio {
    max-width: 34ch;
  }

  .home-hero__cta,
  .home-hero__social {
    justify-content: center;
  }

  .bgm-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .portal-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* 减少动态效果：去掉位移动效，只保留颜色/阴影反馈 */
@media (prefers-reduced-motion: reduce) {
  .portal-tile:hover {
    transform: none;
  }

  .bgm-strip__item:hover .bgm-strip__cover img {
    transform: none;
  }
}
</style>
