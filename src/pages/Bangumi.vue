<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Bangumi</div>
      <h1 class="section-title">
        番剧
        <span v-if="items.length" class="page__meta">
          <AppIcon name="star" :size="16" />
          均分 {{ scoreLabel }}
        </span>
      </h1>
      <p class="section-sub">
        整理我在 Bangumi 上的追番收藏：想看、在看和看过的番剧，以及我的评分与短评。
      </p>
    </header>

    <!--
      随机一部：从收藏里随机挑一部展示封面与信息，让页面有「内容感」。
      随机数只能在客户端算（SSR 与客户端各算一次必然不同 → 水合不一致），
      因此 SSR 先渲染固定占位骨架，挂载后再随机挑选。
    -->
    <section v-if="items.length" class="bangumi__spot" aria-label="随机推荐">
      <template v-if="spotlight">
        <a
          class="bangumi__spot-cover"
          :href="`https://bgm.tv/subject/${spotlight.subject_id}`"
          target="_blank"
          rel="noopener"
        >
          <img
            v-if="spotlight.cover"
            :src="spotlight.cover"
            :alt="spotlight.name_cn || spotlight.name"
          />
          <span v-if="spotlight.score > 0" class="bangumi__spot-score">
            <AppIcon name="star" :size="13" />
            {{ spotlight.score }}
          </span>
        </a>

        <div class="bangumi__spot-info">
          <div class="bangumi__spot-eyebrow">随机一部 · 我的收藏</div>
          <h2 class="bangumi__spot-title">{{ spotlight.name_cn || spotlight.name }}</h2>
          <p class="bangumi__spot-meta">
            <span class="bangumi__spot-badge">{{ statusLabel(spotlight.type) }}</span>
            <span v-if="spotlight.name_cn && spotlight.name !== spotlight.name_cn">
              {{ spotlight.name }}
            </span>
          </p>
          <button
            v-ripple
            type="button"
            class="bangumi__spot-btn"
            @click="pickSpotlight"
          >
            <AppIcon name="shuffle" :size="16" />
            换一部
          </button>
        </div>
      </template>

      <!-- 挂载前（含 SSR）：骨架占位，避免布局跳动 -->
      <template v-else>
        <span
          class="bangumi__spot-cover bangumi__spot-cover--sk md-pulse"
          aria-hidden="true"
        ></span>
        <div class="bangumi__spot-info" aria-hidden="true">
          <span class="bangumi__spot-sk bangumi__spot-sk--lg md-pulse"></span>
          <span class="bangumi__spot-sk md-pulse"></span>
        </div>
      </template>
    </section>

    <!-- 和别人的番剧重合：输入对方的 Bangumi 页面地址即可比对（客户端专属，不参与 SSG） -->
    <BangumiCompare />

    <!-- 状态筛选（Varlet tabs） -->
    <div v-if="items.length" class="bangumi__tabs">
      <var-tabs
        v-model:active="activeFilter"
        elevation
        color="transparent"
        active-color="var(--md-sys-color-primary)"
        inactive-color="var(--md-sys-color-on-surface-variant)"
        indicator-color="var(--md-sys-color-primary)"
        item-direction="vertical"
      >
        <var-tab v-for="f in filters" :key="f.value" :name="f.value">
          {{ f.label }}
          <span class="bangumi__tab-count">{{ f.count }}</span>
        </var-tab>
      </var-tabs>
    </div>

    <!-- 卡片网格（SSG 预渲染即含数据，无需骨架屏） -->
    <section v-if="items.length" class="bangumi__grid" aria-label="番剧收藏">
      <a
        v-for="item in filteredItems"
        :key="item.subject_id"
        class="bangumi__card"
        :href="`https://bgm.tv/subject/${item.subject_id}`"
        target="_blank"
        rel="noopener"
      >
        <div class="bangumi__card-img">
          <img
            v-if="item.cover"
            :src="item.cover"
            :alt="item.name_cn || item.name"
            loading="lazy"
          />
          <span v-if="item.score > 0" class="bangumi__card-score">
            {{ item.score }}
          </span>
        </div>
        <div class="bangumi__card-info">
          <div
            class="bangumi__card-title"
            :title="item.name_cn || item.name"
          >
            {{ item.name_cn || item.name }}
          </div>
          <div class="bangumi__card-meta">{{ statusLabel(item.type) }}</div>
        </div>
      </a>
    </section>

    <!-- 空 -->
    <div v-else class="bangumi__state">暂无番剧数据</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import BangumiCompare from "@components/BangumiCompare.vue";
import { setHead } from "@lib/head";
import snapshot from "@/data/bangumi.json";

setHead({
  title: "番剧收藏 - 我的 Bangumi 追番列表 | Flygeonの小站",
  description:
    "Flygeon 在 Bangumi 的番剧收藏簿：想看、在看、看过的动画与评分一览。",
});

const BANGUMI_USERNAME = "1250652";
// 站内反代（Worker 转发 api.bgm.tv 并做边缘缓存，国内外均可访问）
const API_BASE = "/api/bgm/v0";

interface BangumiItem {
  subject_id: number;
  type: number; // 1 wish 2 collect 3 doing 4 on_hold 5 dropped
  name: string;
  name_cn: string;
  score: number;
  cover: string; // 站内相对路径（Worker R2 镜像同路径托管）
}

const STATUS_LABELS: Record<number, string> = {
  1: "想看",
  2: "看过",
  3: "在看",
  4: "搁置",
  5: "抛弃",
};

const statusMap: Record<string, number[]> = {
  all: [1, 2, 3, 4, 5],
  wish: [1],
  collect: [2],
  doing: [3],
  on_hold: [4],
  dropped: [5],
};

// 初始数据来自构建期快照（SSG 预渲染与客户端水合使用同一份，
// 首屏秒开且无水合不匹配；访问后由 SWR 静默刷新）
const items = ref<BangumiItem[]>(snapshot.items);
const activeFilter = ref("all");

const filters = computed(() => {
  const labels: Record<string, string> = {
    all: "全部",
    wish: "想看",
    collect: "看过",
    doing: "在看",
    on_hold: "搁置",
    dropped: "抛弃",
  };
  return Object.keys(statusMap).map((value) => ({
    value,
    label: labels[value],
    count: items.value.filter((i) => statusMap[value].includes(i.type)).length,
  }));
});

const filteredItems = computed(() =>
  items.value.filter((i) => statusMap[activeFilter.value]?.includes(i.type)),
);

/** 当前筛选下有评分条目的均分 */
const averageScore = computed(() => {
  const scored = filteredItems.value.filter((i) => i.score > 0);
  if (!scored.length) return 0;
  return scored.reduce((sum, i) => sum + i.score, 0) / scored.length;
});

/** 均分展示值：当前筛选下没有评分条目时显示占位符 */
const scoreLabel = computed(() =>
  averageScore.value > 0 ? averageScore.value.toFixed(1) : "—",
);

function statusLabel(type: number): string {
  return STATUS_LABELS[type] ?? "未知";
}

/** 官方封面 URL → 站内相对路径（Worker R2 镜像同路径托管，含 /r/<size> 缩放前缀） */
function toPicPath(official?: string | null): string {
  if (!official) return "";
  try {
    return new URL(official).pathname;
  } catch {
    return "";
  }
}

/** API 原始条目 → 页面条目（拍平 + 封面路径转换） */
function toItems(raw: any[]): BangumiItem[] {
  return raw.map((it) => ({
    subject_id: it.subject_id,
    type: it.type,
    name: it.subject?.name ?? "",
    name_cn: it.subject?.name_cn ?? "",
    score: it.subject?.score ?? 0,
    cover: toPicPath(it.subject?.images?.common),
  }));
}

async function fetchCollections(subjectType: number): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const url = `${API_BASE}/users/${BANGUMI_USERNAME}/collections?subject_type=${subjectType}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Flygeon/blog (https://flygeon.top)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) break;
    const data = await res.json();
    all.push(...(data.data ?? []));
    if (all.length >= (data.total ?? 0)) break;
    offset += pageSize;
  }
  return all;
}

/**
 * 随机展示一部：SSR 阶段为 null（渲染骨架），仅在客户端挑选。
 * 若在构建期就随机，预渲染 HTML 与客户端水合结果必然不同，
 * 会触发水合不匹配告警并让封面闪一下。
 */
const spotlight = ref<BangumiItem | null>(null);

function pickSpotlight() {
  const pool = items.value.filter((i) => i.cover);
  if (!pool.length) {
    spotlight.value = null;
    return;
  }
  spotlight.value = pool[Math.floor(Math.random() * pool.length)];
}

onMounted(async () => {
  pickSpotlight();

  // SWR：后台静默刷新，成功则无缝替换快照；失败（超时/代理异常）保留静态快照
  try {
    const [anime, book] = await Promise.all([
      fetchCollections(2),
      fetchCollections(1).catch(() => [] as any[]),
    ]);
    const fresh = toItems([...anime, ...book]);
    if (fresh.length) {
      items.value = fresh;
      // 数据被刷新后旧条目可能已不在收藏里，重新挑一部保证卡片始终有效
      if (!spotlight.value || !fresh.some((i) => i.subject_id === spotlight.value?.subject_id)) {
        pickSpotlight();
      }
    }
  } catch {
    /* 国内访问失败等场景：静默保留快照数据 */
  }
});
</script>