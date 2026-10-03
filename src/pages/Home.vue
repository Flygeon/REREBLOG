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
        <p class="home-hero__eyebrow">{{ i18n(I18nKey.portalEyebrow) }}</p>
        <h1 id="home-hero-title" class="home-hero__title">
          {{ i18nFormat(I18nKey.homeGreeting, { name: profile.name }) }}
        </h1>
        <p class="home-hero__bio">{{ profile.bio }}</p>

        <div class="home-hero__cta">
          <RouterLink v-ripple class="lm-btn lm-btn--filled" to="/blog">
            {{ i18n(I18nKey.enterBlog) }}
            <AppIcon name="arrow_forward" :size="18" />
          </RouterLink>
          <RouterLink v-ripple class="lm-btn lm-btn--tonal" to="/about">
            {{ i18n(I18nKey.aboutMe) }}
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

      <!-- 首屏 LCP 元素：45KB PNG 已换 7KB WebP，fetchpriority 提到 high，
           避免被 CSS/字体等关键资源挤到它们后面才发起请求 -->
      <div class="home-hero__avatar">
        <img
          :src="avatarUrl"
          :alt="profile.name"
          width="160"
          height="160"
          fetchpriority="high"
          decoding="async"
        />
      </div>
    </section>

    <!-- ===== ② 站点导航：门户的核心，瀑布流卡片摊开各目的地 =====
         卡片高度由内容量与 variant 决定（feature / stat / tag / list），
         用 CSS 多列瀑布流排布，形成高低错落的节奏而非等宽等高网格。 -->
    <section v-reveal class="home-section" aria-labelledby="home-nav-title">
      <h2 id="home-nav-title" class="home-section__title">{{ i18n(I18nKey.portalNav) }}</h2>

      <!--
        分三列渲染，列内卡片纵向堆叠、末张伸展 → 各列底边对齐。
        刻意不用 <component :is="RouterLink">：SSR 下动态组件包裹时 RouterLink
        的 to 不会被解析成 href（预渲染产物丢链接，中键新标签页与爬虫都会失效）。
      -->
      <div class="portal-flow">
        <!-- 分列结果构建期算好；列内末张卡片伸展补齐高度，使各列底边齐平 -->
        <div
          v-for="(column, ci) in portalColumns"
          :key="ci"
          class="portal-flow__col"
        >
          <template v-for="card in column" :key="card.key">
            <!-- 站内目的地 -->
            <RouterLink
              v-if="card.to"
              v-ripple
              class="portal-card"
              :class="'portal-card--' + card.variant"
              :to="card.to"
            >
              <PortalCardBody
                :card="card"
                @load="onCardLoad(card)"
                @photo-error="loadPhoto"
                @refresh-photo="loadPhoto"
              />
            </RouterLink>

            <!-- 站外目的地 -->
            <a
              v-else-if="card.href"
              v-ripple
              class="portal-card"
              :class="'portal-card--' + card.variant"
              :href="card.href"
              target="_blank"
              rel="noopener"
            >
              <PortalCardBody
                :card="card"
                @load="onCardLoad(card)"
                @photo-error="loadPhoto"
                @refresh-photo="loadPhoto"
              />
            </a>

            <!-- 纯展示卡片（天气 / 美图）：无目的地，不能用 <a>，
                 否则会渲染出 href="undefined" 的空链接，污染无障碍与爬虫 -->
            <div
              v-else
              class="portal-card"
              :class="'portal-card--' + card.variant"
            >
              <PortalCardBody
                :card="card"
                @load="onCardLoad(card)"
                @photo-error="loadPhoto"
                @refresh-photo="loadPhoto"
              />
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ===== ③ 数据一览 + 写作足迹 =====
         两张卡片并排：左边站点数据，右边写作足迹热力图。
         窄屏自动堆叠为单列。 -->
    <section v-reveal class="home-section" aria-labelledby="home-stats-title">
      <h2 id="home-stats-title" class="home-section__title">{{ i18n(I18nKey.statsTitle) }}</h2>

      <div class="stats-row">
        <!-- 统计卡 -->
        <div class="home-panel home-panel--stats">
          <div class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <span class="stat__row">
                <span class="stat__label">{{ s.label }}</span>
                <span class="stat__rule" aria-hidden="true"></span>
                <span class="stat__value">{{ s.value }}</span>
              </span>
            </div>
          </div>
        </div>

        <!--
          写作足迹卡：53 周 × 7 天的热力格。
          日期一律按 UTC 取值 —— 预渲染在构建机上算、客户端在访客时区算，
          若用本地时间，UTC 以西的访客会整体错一天，造成水合不一致。
        -->
        <div class="home-panel home-panel--activity">
          <div class="activity">
            <div class="activity__head">
              <span class="activity__title">{{ i18n(I18nKey.activityTitle) }}</span>
              <span class="activity__range">
                {{ activityRange }} · {{ i18nFormat(I18nKey.memoCount, { count: allPosts.length }) }}
              </span>
            </div>

            <!--
              53 周在窄屏放不下：容器内横向滚动，不撑破页面。
              overflow-x:auto 的容器必须可键盘聚焦（axe scrollable-region-focusable）：
              Firefox/Chromium 里只有可聚焦元素才能用方向键滚动。
              tabindex="0" + role="group" + aria-label 让键盘用户也能看到全部 53 周。
            -->
            <div
              class="activity__scroll"
              tabindex="0"
              role="group"
              :aria-label="i18nFormat(I18nKey.activityAria, { range: activityRange, count: allPosts.length })"
            >
              <div
                class="activity__grid"
                role="img"
                :aria-label="i18nFormat(I18nKey.activityAria, { range: activityRange, count: allPosts.length })"
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
              <span>{{ i18n(I18nKey.legendLess) }}</span>
              <span class="activity__day is-lv0"></span>
              <span class="activity__day is-lv1"></span>
              <span class="activity__day is-lv2"></span>
              <span class="activity__day is-lv3"></span>
              <span class="activity__day is-lv4"></span>
              <span>{{ i18n(I18nKey.legendMore) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ④ 最新文章 ===== -->
    <section v-reveal class="home-section" aria-labelledby="home-posts-title">
      <div class="home-section__head">
        <h2 id="home-posts-title" class="home-section__title">{{ i18n(I18nKey.latestPosts) }}</h2>
        <RouterLink class="home-section__more" to="/blog">
          {{ i18nFormat(I18nKey.allPostsLink, { count: allPosts.length }) }}
          <AppIcon name="arrow_forward" :size="16" />
        </RouterLink>
      </div>

      <!-- 瀑布流：卡片高度随标题/摘要/标签数自然不同，多列填充形成错落 -->
      <div class="masonry masonry--posts">
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
        <h2 id="home-bgm-title" class="home-section__title">{{ i18n(I18nKey.topRatedTitle) }}</h2>
        <RouterLink class="home-section__more" to="/bangumi">
          {{ i18nFormat(I18nKey.allAnimeLink, { count: bangumiTotal }) }}
          <AppIcon name="arrow_forward" :size="16" />
        </RouterLink>
      </div>

      <div class="masonry masonry--bgm">
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
              :src="stripCover(item.cover)"
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import BrandIcon from "@components/BrandIcon.vue";
import PostCard from "@components/PostCard.vue";
import PortalCardBody, {
  type PortalCardShape,
  type WeatherInfo,
} from "@components/PortalCardBody.vue";
import { profileConfig, siteConfig } from "@/config";
import { allPosts } from "@lib/posts";
import { getCategoryList, getTagList } from "@utils/content-utils";
import { setHead } from "@lib/head";
import I18nKey from "@i18n/i18nKey";
import { i18n, i18nFormat } from "@i18n/translation";
import avatarUrl from "@assets/images/avatar.webp";
import bangumiSnapshot from "@/data/bangumi.json";
import { reveal } from "@composables/reveal";

// 模板滚动入场指令（局部注册，配合 v-reveal 使用）
const vReveal = reveal;

const profile = profileConfig;
const socialLinks = computed(() => profileConfig.links ?? []);

setHead({
  // 全站标题统一用「 | 」分隔（与其余页面、head.ts 的 SITE_TITLE 约定一致）
  title: siteConfig.title + " | Flygeon 的个人博客与自建项目分享",
  description:
    "Flygeon の个人站点门户：汇集博客文章、Bangumi 番剧收藏、日常动态与自建项目，也记录 Web 开发与设计上的折腾。",
  url: "/",
  // WebSite 结构化数据：帮助搜索引擎理解站点并可能出 sitelinks 搜索框
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    alternateName: "Flygeon",
    url: "https://flygeon.top/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://flygeon.top/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
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

/* ---------------- 构建期格式化工具 ---------------- */

/**
 * 千分位格式化：刻意不用 toLocaleString —— 它的分组规则随运行环境 locale 变化，
 * 构建机与访客浏览器可能给出不同字符串，触发水合不一致。
 */
function withThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const totalWords = allPosts.reduce((sum, p) => sum + (p.stats?.words ?? 0), 0);

/* ---------------- 站点导航（瀑布流卡片） ----------------
   variant 决定卡片体量，从而在瀑布流里形成高低差：
   feature（大）→ stat → list → tag → link（小）。
   所有数字与名单都在构建期确定，SSG 直出、无水合漂移。 */

const tagList = getTagList(allPosts);

/** 站内高频标签前 8 个（按文章数降序，取热门当入口） */
const hotTags = tagList
  .slice()
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  .slice(0, 8);

/* 动态卡片数据源：SSR 恒为 null（渲染骨架），客户端进入视口后才拉取 */
const weather = ref<(WeatherInfo & { failed?: boolean }) | null>(null);
const photo = ref<string | null>(null);

const portalCards: PortalCardShape[] = [
  {
    key: "blog",
    variant: "feature",
    icon: "article",
    label: "博客",
    value: withThousands(allPosts.length) + " 篇",
    desc: "踩坑记录、自建项目与折腾笔记都在这里，按分类与标签归档。",
    to: "/blog",
  },
  {
    key: "bangumi",
    variant: "stat",
    icon: "smart_display",
    label: "番剧",
    value: withThousands(bangumiTotal) + " 部",
    desc: "Bangumi 追番收藏，含评分与封面。",
    to: "/bangumi",
  },
  {
    key: "weather",
    variant: "weather",
    icon: "wb_sunny",
    label: "今日天气",
    desc: "按访问位置自动定位的实时天气。",
    kind: "weather",
  },
  {
    key: "tags",
    variant: "tag",
    icon: "sell",
    label: "热门标签",
    desc: "写作主题的高频入口。",
    tags: hotTags,
    to: "/blog",
  },
  {
    key: "memos",
    variant: "link",
    icon: "edit_note",
    label: "动态",
    desc: "碎碎念与日常，随时更新。",
    to: "/memos",
  },
  {
    key: "friends",
    variant: "link",
    icon: "group",
    label: "友链",
    desc: "朋友们的小站，欢迎串门交换。",
    to: "/friends",
  },
  {
    key: "about",
    variant: "stat",
    icon: "person",
    label: "关于",
    value: withThousands(totalWords) + " 字",
    desc: "我与这个小站的故事。",
    to: "/about",
  },
  {
    key: "photo",
    variant: "photo",
    icon: "image",
    label: "今日美图",
    desc: "随机一张插画，来自 dmoe.cc。",
    kind: "photo",
  },
  {
    key: "search",
    variant: "link",
    icon: "search",
    label: "搜索",
    desc: "站内全文检索，支持标签与正文。",
    to: "/search",
  },
  {
    key: "travellings",
    variant: "link",
    icon: "travel_explore",
    label: "开往",
    desc: "随机去别人家逛逛。",
    href: "https://www.travellings.cn/go.html",
  },
];

/* ---------------- 分列：让各列底边对齐 ----------------
   卡片按近似高度贪心分配到固定列数（每次放进当前最矮的列），
   使各列总高尽量接近 —— 列内末张卡片只需伸展很小的差值就能补齐底边，
   不会出现某张卡片被拉得过高。构建期算好，SSR 直出、无水合漂移。 */

/**
 * 变体自然高度（px）—— 取自真实渲染测量，仅用于分列均衡。
 * 数值偏了会让某一列余量过大，底部对齐时把间距摊得过开；
 * 改动卡片内边距/字号后需同步复核（改完截图量一遍卡片高度即可）。
 */
const VARIANT_WEIGHT: Record<PortalCardShape["variant"], number> = {
  feature: 196,
  stat: 175,
  list: 260,
  tag: 190,
  link: 118,
  // 动态卡片按实测校正（含封面 3:4 / 图片 16:10 裁切后的实际占用）
  weather: 235,
  photo: 300,
};

/** 列数初值 3：与 SSR/首帧一致，挂载后再按视口校正（避免水合不一致） */
const columnCount = ref(3);

/** 列内卡片间距（px），与样式层 .portal-flow__col 的 gap 保持一致 */
const COLUMN_GAP = 20;

/**
 * 分列：穷举所有分配方案，取「最高列 − 最矮列」最小的一种。
 * 列高差越小，底部对齐时需要摊到间距里的余量越少，各列间距越接近均匀。
 * 10 张卡 × 3 列 = 59049 种组合，构建期一次算完，客户端零开销。
 * 卡片在各列内保持原有顺序（分配按下标枚举，不打乱阅读次序）。
 */
function splitIntoColumns(
  cards: PortalCardShape[],
  columnCount: number,
): PortalCardShape[][] {
  const n = cards.length;
  if (columnCount <= 1 || n === 0) return [cards.slice()];

  const weights = cards.map((c) => VARIANT_WEIGHT[c.variant]);
  const assign = new Array<number>(n).fill(0);
  const heights = new Array<number>(columnCount).fill(0);
  const counts = new Array<number>(columnCount).fill(0);

  let bestAssign: number[] | null = null;
  let bestSpan = Infinity;
  let bestMax = Infinity;

  const total = Math.pow(columnCount, n);
  for (let code = 0; code < total; code++) {
    heights.fill(0);
    counts.fill(0);

    let rest = code;
    for (let i = 0; i < n; i++) {
      const col = rest % columnCount;
      rest = (rest - col) / columnCount;
      assign[i] = col;
      counts[col]++;
      heights[col] += weights[i];
    }

    // 空列会让某一列没有卡片，直接跳过
    let hasEmpty = false;
    for (let c = 0; c < columnCount; c++) {
      if (counts[c] === 0) {
        hasEmpty = true;
        break;
      }
      heights[c] += COLUMN_GAP * (counts[c] - 1);
    }
    if (hasEmpty) continue;

    let max = 0;
    let min = Infinity;
    for (const h of heights) {
      if (h > max) max = h;
      if (h < min) min = h;
    }
    const span = max - min;

    // 排序准则（依次比较，保证结果确定）：
    // 1) 列高差最小 —— 底部对齐要摊掉的余量最少
    // 2) 列号序列字典序最小 —— 靠前的卡片优先落在左侧，保住「博客」等
    //    重要入口在前、阅读顺序自然的信息层级
    // 3) 最高列更矮 —— 整体更紧凑
    if (span > bestSpan + 0.001) continue;

    let better = false;
    if (span < bestSpan - 0.001) {
      better = true;
    } else if (bestAssign) {
      for (let i = 0; i < n; i++) {
        if (assign[i] !== bestAssign[i]) {
          better = assign[i] < bestAssign[i];
          break;
        }
      }
      if (!better) {
        // 列号序列完全相同，再比整体高度
        better = max < bestMax;
      }
    }

    if (better) {
      bestSpan = span;
      bestMax = max;
      bestAssign = assign.slice();
    }
  }

  const columns: PortalCardShape[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  (bestAssign ?? assign).forEach((col, i) => columns[col].push(cards[i]));
  return columns;
}

/** 把运行时拉取的数据合进静态卡片定义（SSR 阶段为空占位，挂载后填充） */
const cardsWithData = computed<PortalCardShape[]>(() =>
  portalCards.map((card) => {
    if (card.kind === "weather") {
      // null = 尚未进入视口/加载中 → 卡片渲染骨架；带 failed 标记 = 请求失败
      return { ...card, weather: weather.value };
    }
    if (card.kind === "photo") {
      return { ...card, photo: photo.value };
    }
    return card;
  }),
);

const portalColumns = computed(() =>
  splitIntoColumns(cardsWithData.value, columnCount.value),
);

/* 断点与样式层的 media query 严格对应（1100 / 680） */
let mqNarrow: MediaQueryList | null = null;
let mqMobile: MediaQueryList | null = null;

function syncColumnCount() {
  if (typeof window === "undefined") return;
  columnCount.value = window.matchMedia("(max-width: 680px)").matches
    ? 1
    : window.matchMedia("(max-width: 1100px)").matches
      ? 2
      : 3;
}

/* ---------------- 动态卡片：天气 + 随机美图 ----------------
   两张卡片的数据只能运行时取（天气按访客位置、美图每次随机），
   因此 SSR 先渲染占位，挂载后再拉取填充，避免水合不一致。 */

/** 气温/天气文案与 Material Symbols 图标名的对应（接口给的是气象编码） */
const WEATHER_ICONS: [string[], string][] = [
  [["100", "150"], "wb_sunny"], // 晴
  [["101", "102", "103", "151", "152", "153"], "cloud"], // 多云 / 阴
  [["302", "303"], "thunderstorm"], // 雷阵雨（须排在「雨」之前判定）
  [["300", "301", "304", "305", "306", "307", "308", "309", "310", "311",
    "312", "313", "314", "315", "316", "317", "318", "350", "351", "399"],
    "rainy"], // 雨
  [["400", "401", "402", "403", "404", "405", "406", "407", "408", "409",
    "410", "456", "457", "499"], "ac_unit"], // 雪
  [["500", "501", "502", "503", "504", "507", "508", "509", "510", "511",
    "512", "513", "514", "515"], "foggy"], // 雾霾
];

function weatherIcon(code: string): string {
  for (const [codes, icon] of WEATHER_ICONS) {
    if (codes.includes(code)) return icon;
  }
  return "wb_sunny";
}

/**
 * 天气：uapis.cn 按请求 IP 自动定位。
 * 失败时写入 failed 标记（卡片显示「天气暂时拿不到」），并由 useLazyLoad
 * 记录失败状态，骨架不会一直转下去。
 */
async function loadWeather() {
  try {
    const res = await fetch("https://uapis.cn/api/v1/misc/weather", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    weather.value = {
      city: d.city || d.province || "当前位置",
      weather: d.weather || "—",
      temperature: d.temperature,
      humidity: d.humidity,
      wind_direction: d.wind_direction || "",
      wind_power: d.wind_power || "",
      icon: weatherIcon(String(d.weather_icon ?? "")),
    };
  } catch (e) {
    weather.value = {
      city: "",
      weather: "",
      temperature: 0,
      humidity: 0,
      wind_direction: "",
      wind_power: "",
      icon: "wb_sunny",
      failed: true,
    };
    throw e;
  }
}

/**
 * 随机美图：dmoe.cc/random.php 直接返回图片。
 * 用带时间戳的 URL 避开浏览器与 CDN 缓存，保证每次都是新图；
 * 这里只设置地址，图片加载失败由子组件 emit 后再换一张。
 */
function loadPhoto() {
  photo.value = `https://www.dmoe.cc/random.php?t=${Date.now()}`;
}

/* ---------------- 第三方卡片的按需加载 ----------------
   两张卡片内部各有一块可见性检测（见 PortalCardBody 的 useLazyLoad），
   只有滚动到它们附近才会触发这里的取数，首屏不为第三方服务付等待。 */

/** 已触发过的标记：避免重复请求（换图是显式行为，单独走 loadPhoto） */
const weatherRequested = ref(false);

async function onWeatherLoad() {
  if (weatherRequested.value) return;
  weatherRequested.value = true;
  await loadWeather().catch(() => {
    /* 失败已在 loadWeather 内写入 failed 标记 */
  });
}

function onPhotoLoad() {
  if (!photo.value) loadPhoto();
}

/** 卡片进入视口后的取数分发（weather / photo 各自处理） */
function onCardLoad(card: PortalCardShape) {
  if (card.kind === "weather") return onWeatherLoad();
  return onPhotoLoad();
}

onMounted(() => {
  syncColumnCount();
  mqNarrow = window.matchMedia("(max-width: 1100px)");
  mqMobile = window.matchMedia("(max-width: 680px)");
  mqNarrow.addEventListener("change", syncColumnCount);
  mqMobile.addEventListener("change", syncColumnCount);

});

onUnmounted(() => {
  mqNarrow?.removeEventListener("change", syncColumnCount);
  mqMobile?.removeEventListener("change", syncColumnCount);
});

/* ---------------- 数据一览 ---------------- */

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

// 首页「最新文章」按字面语义取时间倒序；
// 「置顶优先」是 /blog 列表的排序语义，这里不沿用，避免置顶旧文压住最新内容。
// 取 4 篇：两列瀑布流下正好 2+2，不会出现某列空半截。
const latestPosts = computed(() =>
  allPosts
    .slice()
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime())
    .slice(0, 4),
);

/* ---------------- 高分收藏 ---------------- */

const topBangumi = computed(() =>
  bangumiItems
    .filter((i) => i.score > 0 && i.cover)
    .slice()
    .sort((a, b) => b.score - a.score || a.subject_id - b.subject_id)
    .slice(0, 10),
);

/**
 * 首页封面显示宽约 200px，构建期数据默认 /r/400/，
 * 请求缩小一档（/r/200/）省一半流量；Worker 镜像按原路径缓存，两种尺寸互不影响。
 */
function stripCover(cover: string): string {
  return cover.replace(/^\/r\/\d+\//, "/r/200/");
}

</script>

<style scoped lang="scss">
/* ============================================================
   门户首页
   口径：卡片用 --site-card / --site-card-border / --site-elev-*；
   hover 用 MD3 state layer（::before 叠 on-surface 8%）；
   间距一律 --space-*；动效一律带 prefers-reduced-motion 降级。
   禁止裸 z-index（用 --z-below）。
   ============================================================ */

/*
  只覆盖上下留白，左右必须留给 .container 的 padding: 0 var(--lm-content-pad)。
  这里若写 padding 简写（如 "40px 0 64px"），.home[data-v-*] 的特异性会盖掉
  模板 .container 的左右内边距 → 侧栏展开时正文卡片左边缘紧贴侧栏描边。
*/
.home {
  padding-top: var(--space-14);
  padding-bottom: var(--space-16);
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
  gap: var(--space-12);
  padding: var(--space-14) var(--space-15);
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
  max-width: 52ch;
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

/* ---------- ② 站点导航（瀑布流 · 底部对齐） ----------
   与 CSS 多列（column-count）不同，这里用 flex 显式分列：
   列数由 JS 按断点给出（3 / 2 / 1），列内末张卡片 flex:1 伸展补齐高度，
   于是各列底边严格齐平，同时保留卡片之间的高低错落。
   列内卡片用 gap 控制纵向间距，避免 margin 与 flex 伸展互相干扰。 */

.portal-flow {
  display: flex;
  align-items: stretch;
  gap: var(--space-10);
  margin-top: var(--space-10);
}

.portal-flow__col {
  display: flex;
  flex-direction: column;
  /* 列内间距固定，不随余量变化 —— 各列观感一致 */
  gap: var(--space-10);
  /* 三列等宽；min-width:0 允许卡片内容收缩不撑破列 */
  flex: 1 1 0;
  min-width: 0;
}

/*
  底部对齐：余量由列内卡片吸收，但按内容量加权 ——
  flex-grow 取卡片自身的变体高度，内容多的卡片多长、内容少的少长，
  避免「文案已结束、卡片底部还空一大块」。
  间距固定不参与分配，因此各列内部节奏一致。
*/
.portal-flow__col > .portal-card {
  flex: 1 1 auto;
}

/* 按变体高度设置伸展权重：feature 权重最大（几乎不额外长高），
   link 类小卡片权重最小（吸收更多余量，把底部空白消化在自己身上） */
.portal-flow__col > .portal-card--feature {
  flex-grow: 196;
}
.portal-flow__col > .portal-card--stat {
  flex-grow: 175;
}
.portal-flow__col > .portal-card--list {
  flex-grow: 260;
}
.portal-flow__col > .portal-card--tag {
  flex-grow: 190;
}
.portal-flow__col > .portal-card--link {
  flex-grow: 118;
}

.portal-card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  /* 内容靠上：卡片被伸展时文字不居中漂浮 */
  justify-content: flex-start;
  padding: var(--space-11);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow var(--md-sys-motion-duration-short)
      var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

/* MD3 state layer：hover 叠 on-surface 8%，不写死背景色 */
.portal-card::before {
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

.portal-card:hover {
  box-shadow: var(--site-elev-2);
  transform: translateY(-2px);
}

.portal-card:hover::before {
  opacity: 0.08;
}

.portal-card:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}

/* 卡片头：图标 + 标题 + 箭头 */
/* ---------- ③ 数据一览（统计卡 + 热力卡） ---------- */

/* 两卡并排：统计卡按内容自适应，热力卡占剩余宽度（热力图本身较宽） */
.stats-row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: var(--space-10);
  margin-top: var(--space-10);
}

.home-panel {
  padding: var(--space-12);
  /* 让内部 .stat-grid 的 height:100% 有意义（否则高度由内容决定，摊不开） */
  display: flex;
  flex-direction: column;
  border-radius: var(--ll-radius-card);
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
}

/* 窄屏：热力图放不下并排，改为上下堆叠 */
@media (max-width: 980px) {
  .stats-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-11) var(--space-10);
  /*
    改成"标签 … 数值"单行后，每项高度只有一行，四格两行会显得空。
    让卡片把内容纵向居中摊开，补齐与右侧热力卡的高度差。
  */
  height: 100%;
  align-content: space-evenly;
}

.stat {
  display: block;
}

/*
  标签与数值之间加点线引导（规格表口径）：label 与 value 同排，
  中间用点线吃掉剩余空间 —— 视觉上读成"标签 ……… 数值"一条记录。
  点线是对齐基线用的装饰（aria-hidden），不承载信息。
*/
.stat__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.stat__rule {
  flex: 1;
  /* 贴着基线画虚线；margin-bottom 微调让它与文字基线对齐 */
  align-self: flex-end;
  margin-bottom: 0.32em;
  border-bottom: 2px dotted var(--md-sys-color-outline-variant);
  /* 点线不应喧宾夺主：略降透明度 */
  opacity: 0.7;
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

/* 热力卡内部：不再需要与统计区之间的分隔线（已拆成独立卡片） */
.activity {
  min-width: 0;
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

/* 暗色下 surface-container-high 偏亮，整片空格反客为主；
   换成 on-surface 极低透明度，退为背景纹理，突出有写作的日子 */
[data-theme="dark"] .activity__day {
  background: rgba(226, 226, 229, 0.07);
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 7%, transparent);
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

/* ---------- 通用瀑布流（最新文章 / 高分收藏） ----------
   CSS 多列实现：卡片高度天然不同，列内自上而下填充即形成错落。
   与站点导航的瀑布流不同 —— 那里要求「各列底边严格对齐」，用 flex 分列
   + 余量吸收；这两个板块的卡片高度差本身就是设计意图，用原生多列最合适，
   SSR 直出即成型、无需 JS 参与。
   break-inside: avoid 必须写，否则卡片会被跨列截断。 */

.masonry {
  margin-top: var(--space-10);
  column-gap: var(--space-12);
}

.masonry > * {
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  /* 多列布局里 margin-bottom 即行距；末张也带，
     用容器负 margin 抵消，避免板块底部多出空白 */
  margin-bottom: var(--space-12);
}

/* 文章卡较宽，两列足够；
   番剧是窄封面，5 列让单张宽度接近改造前的 6 列网格，避免封面被放得过大 */
.masonry--posts {
  columns: 2;
}

.masonry--bgm {
  columns: 5;
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

/* 瀑布流：窄屏逐级降列，避免卡片被压得太窄 */
@media (max-width: 1080px) {
  .masonry--bgm {
    columns: 4;
  }
}

@media (max-width: 860px) {
  .masonry--posts {
    columns: 1;
  }

  .masonry--bgm {
    columns: 3;
  }
}

@media (max-width: 560px) {
  .masonry--bgm {
    columns: 2;
  }
}

/* 列数由脚本按同一断点切换（3 / 2 / 1）；列内末张伸展规则对 2 列同样适用 */

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

/* 单列：卡片各保持自身高度，底部天然对齐，不需要吸收余量 */
@media (max-width: 680px) {
  .portal-flow__col > .portal-card {
    flex: 0 0 auto;
  }
}

/* 减少动态效果：去掉位移动效，只保留颜色/阴影反馈 */
@media (prefers-reduced-motion: reduce) {
  .portal-card:hover {
    transform: none;
  }

  .bgm-strip__item:hover .bgm-strip__cover img {
    transform: none;
  }
}
</style>