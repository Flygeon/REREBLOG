<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Bangumi</div>
      <h1 class="section-title">番剧</h1>
      <p class="section-sub">
        我的 Bangumi 追番收藏，数据通过 Bangumi API 实时同步，支持国内反代与官方图源切换。
      </p>
    </header>

    <!-- 图源切换 + 均分（对齐原站：国内反代源 / 官方源） -->
    <div v-if="items.length" class="bangumi__source-row">
      <button
        v-ripple
        type="button"
        class="bangumi__source-card"
        :class="{ 'bangumi__source-card--active': imageSource === 'domestic' }"
        :aria-pressed="imageSource === 'domestic'"
        @click="imageSource = 'domestic'"
      >
        <span class="bangumi__source-icon">
          <AppIcon name="database" :size="22" />
        </span>
        <span>
          <span class="bangumi__source-label">图源</span>
          <span class="bangumi__source-name">国内源</span>
        </span>
      </button>
      <button
        v-ripple
        type="button"
        class="bangumi__source-card"
        :class="{ 'bangumi__source-card--active': imageSource === 'official' }"
        :aria-pressed="imageSource === 'official'"
        @click="imageSource = 'official'"
      >
        <span class="bangumi__source-icon">
          <AppIcon name="public" :size="22" />
        </span>
        <span>
          <span class="bangumi__source-label">图源</span>
          <span class="bangumi__source-name">官方源</span>
        </span>
      </button>
      <div class="bangumi__source-card bangumi__source-card--static">
        <span class="bangumi__source-icon">
          <AppIcon name="star" :size="22" />
        </span>
        <span>
          <span class="bangumi__source-label">Bangumi 均分</span>
          <span class="bangumi__source-name">
            {{ averageScore.toFixed(1) }}
          </span>
        </span>
      </div>
    </div>

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

    <!-- 加载骨架屏（复用卡片网格布局，避免加载完成前后跳动） -->
    <template v-if="loading">
      <section
        class="bangumi__grid"
        aria-busy="true"
        aria-label="番剧数据加载中"
      >
        <div v-for="n in 12" :key="n" class="bangumi__card-skeleton">
          <div class="bangumi__sk-img"></div>
          <div class="bangumi__sk-info">
            <div class="bangumi__sk-line"></div>
            <div class="bangumi__sk-line bangumi__sk-line--meta"></div>
          </div>
        </div>
      </section>
    </template>

    <!-- 错误 -->
    <div v-else-if="error" class="bangumi__state">
      番剧数据加载失败：{{ error }}
    </div>

    <!-- 卡片网格 -->
    <section v-else class="bangumi__grid" aria-label="番剧收藏">
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
            :src="coverUrl(item)"
            :alt="item.subject.name_cn || item.subject.name"
            loading="lazy"
          />
          <span v-if="item.subject.score > 0" class="bangumi__card-score">
            {{ item.subject.score }}
          </span>
        </div>
        <div class="bangumi__card-info">
          <div
            class="bangumi__card-title"
            :title="item.subject.name_cn || item.subject.name"
          >
            {{ item.subject.name_cn || item.subject.name }}
          </div>
          <div class="bangumi__card-meta">{{ statusLabel(item.type) }}</div>
        </div>
      </a>
    </section>

    <!-- 空 -->
    <div
      v-if="!loading && !error && items.length === 0"
      class="bangumi__state"
    >
      暂无番剧数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AppIcon from "@components/AppIcon.vue";
import { setHead } from "@lib/head";

setHead({
  title: "番剧收藏 - 我的 Bangumi 追番列表 | Flygeonの小站",
  description:
    "Flygeon 在 Bangumi 的番剧收藏簿：想看、在看、看过的动画与评分一览，数据通过 Bangumi API 实时同步，支持国内反代与官方图源切换。",
});

const BANGUMI_USERNAME = "1250652";
const API_BASE = "https://api.bgm.tv/v0";

interface BangumiItem {
  subject_id: number;
  type: number; // 1 wish 2 collect 3 doing 4 on_hold 5 dropped
  subject: {
    name: string;
    name_cn: string;
    score: number;
    images?: { common: string; large: string } | null;
  };
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

const items = ref<BangumiItem[]>([]);
const loading = ref(true);
const error = ref("");
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

/* ---- 图源切换：国内反代 lain.flygeon.top / 官方 lain.bgm.tv ---- */
const SOURCE_STORAGE_KEY = "bangumi-image-source";
const imageSource = ref<"domestic" | "official">(
  typeof localStorage !== "undefined" &&
    localStorage.getItem(SOURCE_STORAGE_KEY) === "official"
    ? "official"
    : "domestic",
);
watch(imageSource, (v) => {
  try {
    localStorage.setItem(SOURCE_STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
});

/** 按当前图源取封面：官方 URL 替换 host 得到反代地址 */
function coverUrl(item: BangumiItem): string {
  const official = item.subject.images?.common || "";
  if (!official || imageSource.value === "official") return official;
  return official.replace(
    "https://lain.bgm.tv/",
    "https://lain.flygeon.top/",
  );
}

/** 当前筛选下有评分条目的均分 */
const averageScore = computed(() => {
  const scored = filteredItems.value.filter((i) => i.subject.score > 0);
  if (!scored.length) return 0;
  return scored.reduce((sum, i) => sum + i.subject.score, 0) / scored.length;
});

function statusLabel(type: number): string {
  return STATUS_LABELS[type] ?? "未知";
}

async function fetchCollections(subjectType: number): Promise<BangumiItem[]> {
  const all: BangumiItem[] = [];
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

onMounted(async () => {
  try {
    // 番剧 2 + 动画 1（原站逻辑：subject_type 2 = 动画）
    const [anime, book] = await Promise.all([
      fetchCollections(2),
      fetchCollections(1).catch(() => []),
    ]);
    items.value = [...anime, ...book];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "网络错误";
  } finally {
    loading.value = false;
  }
});
</script>
