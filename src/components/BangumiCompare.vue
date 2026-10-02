<template>
  <section class="bgm-fold" aria-labelledby="bgm-fold-title">
    <header class="bgm-fold__head">
      <span class="bgm-fold__badge">
        <AppIcon name="compare_arrows" :size="22" />
      </span>
      <div class="bgm-fold__head-text">
        <h2 id="bgm-fold-title" class="bgm-fold__title">和 TA 的重合番剧</h2>
        <p class="bgm-fold__sub">
          填上别人博客的 Bangumi 页面地址（或 TA 的 Bangumi 主页 / 用户名 / UID），
          看看你们<strong>都看过</strong>哪些番，以及各自给了几分。
        </p>
      </div>
    </header>

    <!--
      用 form 是为了让回车能提交，但组件是客户端专属的（SSG 产物里只有静态标记）。
      水合完成前点按钮 / 按回车时 Vue 还没挂上 @submit.prevent，浏览器会按原生 GET
      提交整页刷新，地址栏变成 ?bgm-user=sai，用户刚填的内容直接丢掉。
      form 上挂原生 onsubmit="return false" 兜住水合前的提交（禁用 JS 时也生效）；
      method="dialog" 作为第二道保险，避免任何情况下触发原生 GET 导航。
      水合完成后 Vue 的 @submit.prevent 照常调用 submit()。
    -->
    <form
      class="bgm-fold__search"
      method="dialog"
      onsubmit="return false"
      @submit.prevent="submit"
    >
      <AppIcon class="bgm-fold__search-icon" name="person_search" :size="20" />
      <input
        v-model="keyword"
        class="bgm-fold__input"
        type="text"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        :placeholder="PLACEHOLDER"
        aria-label="对方的 Bangumi 用户名或主页地址"
        :disabled="loading"
        @input="onInput"
      />
      <button
        v-if="keyword"
        class="bgm-fold__clear"
        type="button"
        aria-label="清空输入"
        :disabled="loading"
        @click="clear"
      >
        <AppIcon name="close" :size="16" />
      </button>
      <button
        v-ripple
        class="lm-btn lm-btn--filled bgm-fold__submit"
        type="submit"
        :disabled="loading"
      >
        <AppIcon
          :name="loading ? 'progress_activity' : 'compare_arrows'"
          :size="18"
          :class="{ 'bgm-fold__spin': loading }"
        />
        {{ loading ? "对比中" : "开始对比" }}
      </button>
    </form>

    <!-- 示例：点一下直接跑，省得用户猜要填什么 -->
    <div class="bgm-fold__examples">
      <span class="bgm-fold__examples-label">试试：</span>
      <button
        v-for="example in EXAMPLES"
        :key="example"
        class="bgm-fold__example"
        type="button"
        :disabled="loading"
        @click="useExample(example)"
      >
        <AppIcon name="link" :size="14" />
        {{ example }}
      </button>
    </div>

    <!-- 状态区：role=status 让读屏在结果出来时得到提示 -->
    <p class="bgm-fold__status" role="status" aria-live="polite">
      <template v-if="loading">正在读取 {{ loadingUser }} 的收藏…</template>
      <template v-else-if="error">{{ error }}</template>
    </p>

    <!-- 加载骨架（与结果网格同尺寸，避免布局跳动） -->
    <div v-if="loading" class="bgm-fold__grid" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="bgm-fold__card bgm-fold__card--skeleton">
        <div class="bgm-fold__card-img bgm-fold__sk-img"></div>
        <div class="bgm-fold__card-info">
          <div class="bgm-fold__sk-line"></div>
          <div class="bgm-fold__sk-line bgm-fold__sk-line--pill"></div>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div v-else-if="result" class="bgm-fold__result">
      <div class="bgm-fold__stats">
        <span class="bgm-fold__stat bgm-fold__stat--primary">
          <AppIcon name="compare_arrows" :size="16" />
          {{ result.total }} 部都看过
        </span>
        <span class="bgm-fold__stat">重合度 {{ result.overlapPercent }}%</span>
        <span class="bgm-fold__stat">我看过 {{ result.myWatched }} 部</span>
        <span class="bgm-fold__stat">TA 看过 {{ result.theirWatched }} 部</span>
        <span v-if="result.bothRated" class="bgm-fold__stat">
          双方评分 {{ result.bothRated }} 部：我更高 {{ result.myHigher }} · TA 更高
          {{ result.theirHigher }} · 持平 {{ result.sameRate }}
        </span>
      </div>

      <p class="bgm-fold__caption">
        与「{{ result.userId }}」的重合番剧 ·
        <template v-if="result.bothRated">
          均分 我 {{ fmt(result.myAvg) }} / TA {{ fmt(result.theirAvg) }} ·
        </template>
        按双方评分排序
      </p>

      <div v-if="result.items.length" class="bgm-fold__toolbar">
        <button
          class="bgm-fold__toggle"
          type="button"
          :aria-pressed="showComments"
          @click="showComments = !showComments"
        >
          <AppIcon :name="showComments ? 'expand_less' : 'expand_more'" :size="16" />
          {{ showComments ? "收起短评" : "显示短评" }}
        </button>
      </div>

      <div v-if="result.items.length" class="bgm-fold__grid">
        <a
          v-for="item in visibleItems"
          :key="item.id"
          class="bgm-fold__card"
          :href="`https://bgm.tv/subject/${item.id}`"
          target="_blank"
          rel="noopener"
        >
          <div class="bgm-fold__card-img">
            <img
              v-if="item.cover"
              :src="item.cover"
              :alt="item.name_cn || item.name"
              loading="lazy"
            />
            <span v-if="item.score > 0" class="bangumi__card-score">
              {{ item.score.toFixed(1) }}
            </span>
          </div>
          <div class="bgm-fold__card-info">
            <div class="bgm-fold__card-title" :title="item.name_cn || item.name">
              {{ item.name_cn || item.name }}
            </div>
            <!-- 评分行：只渲染真实存在的分数。双方都没打分时整行不出现，
                 避免每张卡都挂一条「我 —」的噪声 -->
            <div v-if="item.myRate || item.theirRate" class="bgm-fold__rates">
              <span
                v-if="item.myRate"
                class="bgm-fold__rate bgm-fold__rate--mine"
                :title="`我的评分 ${item.myRate}`"
              >
                我 {{ item.myRate.toFixed(1) }}
              </span>
              <span
                v-if="item.theirRate"
                class="bgm-fold__rate bgm-fold__rate--theirs"
                :title="`TA 的评分 ${item.theirRate}`"
              >
                TA {{ item.theirRate.toFixed(1) }}
              </span>
              <span
                v-if="gapText(item)"
                class="bgm-fold__gap"
                :class="gapClass(item)"
              >
                {{ gapText(item) }}
              </span>
            </div>
            <div v-if="showComments" class="bgm-fold__comments">
              <p v-if="item.myComment" class="bgm-fold__comment">
                <span class="bgm-fold__comment-who">我</span>{{ item.myComment }}
              </p>
              <p v-if="item.theirComment" class="bgm-fold__comment">
                <span class="bgm-fold__comment-who">TA</span>{{ item.theirComment }}
              </p>
              <p v-if="!item.myComment && !item.theirComment" class="bgm-fold__comment bgm-fold__comment--none">
                双方都没有写短评
              </p>
            </div>
          </div>
        </a>
      </div>

      <!-- 空交集 -->
      <div v-else class="bgm-fold__empty">
        <AppIcon name="group" :size="36" />
        <p class="bgm-fold__empty-title">
          暂时没有和「{{ result.userId }}」都看过的番剧。
        </p>
        <p class="bgm-fold__empty-tip">
          （已比较 TA 标记为「看过」的 {{ result.theirWatched }} 部动画）
        </p>
      </div>

      <button
        v-if="hasMore"
        v-ripple
        class="lm-btn lm-btn--outlined bgm-fold__more"
        type="button"
        @click="shown += PAGE_SIZE"
      >
        再显示 {{ Math.min(PAGE_SIZE, result.items.length - shown) }} 部（还有
        {{ result.items.length - shown }} 部）
      </button>
    </div>

    <!-- 初始态 -->
    <div v-else-if="!error" class="bgm-fold__empty">
      <AppIcon name="group" :size="36" />
      <p class="bgm-fold__empty-title">还没开始对比</p>
      <p class="bgm-fold__empty-tip">
        对方也用 Bangumi 的话，把 TA 的 Bangumi 用户名 / UID 填进去就行；
        如果 TA 的博客有独立的番剧页，直接粘页面地址——我会尽量从里面认出 Bangumi 用户名。
      </p>
    </div>
  </section>
</template>

<script lang="ts">
/**
 * 模块作用域（故意放在 <script setup> 之外）。
 *
 * <script setup> 里的顶层代码会被编译进 setup()，而 setup 执行时
 * app.mount("#app") 已经清空了预渲染 DOM —— 那时再查输入框只会读到空值。
 *
 * 本文件是路由懒加载 chunk，其模块求值发生在 router.isReady() → mount 之前，
 * 所以只有写在这里、作为普通 <script> 顶层语句，才能抢在挂载前读到
 * 用户在慢网下提前敲进输入框的内容（本站是 SSG + createApp 非 hydrate，
 * 挂载会整体替换预渲染 DOM，不抢读就会被 v-model 的初始值冲掉）。
 */
export const preMountInput =
  typeof document === "undefined"
    ? ""
    : (document.querySelector<HTMLInputElement>(".bgm-fold__input")?.value ?? "");
</script>

<script setup lang="ts">
/**
 * BangumiCompare.vue —— 「和 TA 的重合番剧」
 *
 * 交互：输入框 → 解析出对方的 Bangumi 用户 → 抓「看过」的动画 →
 * 与自己的收藏取交集，按评分排序展示。
 *
 * 数据口径与网络策略都收在 @lib/bangumi-compare，本组件只管渲染与交互。
 * 关键取舍：
 *  - 我的收藏优先实时接口（能拿到自己的评分 / 短评），失败才回退构建期快照；
 *  - 结果用 ?bgm=<uid> 回写地址栏，链接可分享（别人打开就自动比对）；
 *  - 网格一次只渲染 24 张，避免几百条交集把首屏拖慢。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "@components/AppIcon.vue";
import {
  BangumiCompareError,
  SITE_BANGUMI_USERNAME,
  buildCompareResult,
  fetchUserCollections,
  parseBangumiUser,
  type CompareItem,
  type CompareResult,
} from "@lib/bangumi-compare";
import snapshot from "@/data/bangumi.json";

const PAGE_SIZE = 24;

const PLACEHOLDER = "https://friend.blog/bangumi 或 bgm.tv/user/xxx";
const EXAMPLES = ["https://bgm.tv/user/sai", "bgm.tv/user/1250652", "sai"];

const route = useRoute();
const router = useRouter();

const keyword = ref(preMountInput);
const loading = ref(false);
const loadingUser = ref("");
const error = ref("");
const result = ref<CompareResult | null>(null);
const showComments = ref(false);
const shown = ref(PAGE_SIZE);

/** 我的收藏原始数据：null 表示还没取过。接口失败时回退构建期快照 */
let mineRaw: any[] | null = null;
/** 已经跑过的用户标识，避免 URL 同步时重复请求 */
let lastRun = "";

const visibleItems = computed<CompareItem[]>(
  () => result.value?.items.slice(0, shown.value) ?? [],
);
const hasMore = computed(
  () => !!result.value && result.value.items.length > shown.value,
);

function fmt(value: number): string {
  return value > 0 ? value.toFixed(1) : "—";
}

/** 双方评分差（只有两边都打过分才有意义），没意义时返回 null */
function scoreGap(item: CompareItem): number | null {
  if (!item.myRate || !item.theirRate) return null;
  return Number((item.myRate - item.theirRate).toFixed(1));
}

/** 评分差文案：+1 / -2 / 0，无意义时返回空串（模板用它当 v-if 条件） */
function gapText(item: CompareItem): string {
  const gap = scoreGap(item);
  if (gap === null) return "";
  return `${gap > 0 ? "+" : ""}${gap}`;
}

/** 评分差配色：我更高用主色，TA 更高用 tertiary */
function gapClass(item: CompareItem): Record<string, boolean> {
  const gap = scoreGap(item);
  return {
    "bgm-fold__gap--mine": gap !== null && gap > 0,
    "bgm-fold__gap--theirs": gap !== null && gap < 0,
  };
}

/** 取我的收藏：优先实时接口（含我的评分 / 短评），失败回退构建期快照 */
async function loadMine(): Promise<any[]> {
  if (mineRaw) return mineRaw;
  try {
    mineRaw = await fetchUserCollections(SITE_BANGUMI_USERNAME);
  } catch {
    mineRaw = snapshot.items;
  }
  return mineRaw;
}

function onInput(): void {
  // 用户在改动输入时清掉上一次的错误提示，避免旧报错挂在新内容下面
  if (error.value) error.value = "";
}

async function runCompare(userId: string): Promise<void> {
  lastRun = userId;
  loading.value = true;
  loadingUser.value = userId;
  error.value = "";
  result.value = null;
  shown.value = PAGE_SIZE;
  try {
    const [mine, theirs] = await Promise.all([
      loadMine(),
      fetchUserCollections(userId),
    ]);
    result.value = buildCompareResult(userId, mine, theirs);
  } catch (e) {
    error.value =
      e instanceof BangumiCompareError
        ? e.message
        : "对比失败，请稍后重试（Bangumi 接口可能不稳定）";
  } finally {
    loading.value = false;
  }
}

/** 提交：解析输入 → 回写地址栏 → 比对 */
function submit(): void {
  let userId = "";
  try {
    userId = parseBangumiUser(keyword.value);
  } catch (e) {
    error.value = e instanceof BangumiCompareError ? e.message : "输入无法识别";
    result.value = null;
    return;
  }
  result.value = null;
  error.value = "";
  syncQuery(userId);
  void runCompare(userId);
}

/** 把解析出的用户标识写进地址栏（可分享，重复导航静默忽略） */
function syncQuery(userId: string): void {
  const current = typeof route.query.bgm === "string" ? route.query.bgm : "";
  if (current === userId) return;
  void router.replace({ path: "/bangumi", query: { ...route.query, bgm: userId } }).catch(() => {});
}

function useExample(example: string): void {
  keyword.value = example;
  submit();
}

function clear(): void {
  keyword.value = "";
  error.value = "";
  result.value = null;
  lastRun = "";
  shown.value = PAGE_SIZE;
  if (route.query.bgm) {
    const query = { ...route.query };
    delete query.bgm;
    void router.replace({ path: "/bangumi", query }).catch(() => {});
  }
}

// 带 ?bgm=<uid> 打开时自动跑一次（分享链接 / 刷新保持结果）
function readQuery(): string {
  const value = route.query.bgm;
  return typeof value === "string" ? value.trim() : "";
}

onMounted(() => {
  const userId = readQuery();
  if (userId) {
    keyword.value = userId;
    void runCompare(userId);
  }
});

watch(
  () => route.query.bgm,
  (value) => {
    const userId = typeof value === "string" ? value.trim() : "";
    if (!userId || userId === lastRun) return;
    keyword.value = userId;
    void runCompare(userId);
  },
);

</script>
