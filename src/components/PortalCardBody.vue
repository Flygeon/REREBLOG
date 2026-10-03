<template>
  <span class="portal-card__head">
    <span class="portal-card__icon" aria-hidden="true">
      <AppIcon :name="card.icon" :size="22" />
    </span>
    <span class="portal-card__label">{{ card.label }}</span>
    <!-- 纯展示卡片（天气 / 美图）没有目的地，不渲染箭头，避免误导可点击 -->
    <AppIcon
      v-if="card.to || card.href"
      class="portal-card__arrow"
      :name="card.href ? 'open_in_new' : 'arrow_forward'"
      :size="18"
    />
  </span>

  <span v-if="card.value" class="portal-card__value">{{ card.value }}</span>
  <span class="portal-card__desc">{{ card.desc }}</span>

  <!-- 标签型卡片：把站内高频标签摊成可点看的入口 -->
  <span v-if="card.tags?.length" class="portal-card__tags">
    <span
      v-for="tag in card.tags"
      :key="tag.name"
      class="portal-card__tag"
      :title="tag.name + ' · ' + tag.count + ' 篇'"
      >#{{ tag.name }}</span
    >
  </span>

  <!-- 列表型卡片：列出条目名与计数 -->
  <span v-if="card.list?.length" class="portal-card__list">
    <span v-for="item in card.list" :key="item.name" class="portal-card__row">
      <span class="portal-card__row-name">{{ item.name }}</span>
      <span class="portal-card__row-count">{{ item.count }}</span>
    </span>
  </span>

  <!-- 天气型卡片：懒加载中显示骨架，加载后填充 -->
  <span v-if="card.kind === 'weather'" ref="dynEl" class="portal-weather">
    <!-- 尚未加载：骨架占位（显式 aria-hidden，读屏不读装饰块） -->
    <span v-if="!card.weather" class="portal-skeleton" aria-hidden="true">
      <span class="portal-skeleton__row portal-skeleton__row--lg"></span>
      <span class="portal-skeleton__row portal-skeleton__row--sm"></span>
      <span class="portal-skeleton__row portal-skeleton__row--sm"></span>
    </span>
    <!-- 加载失败：给出可读的原因，而不是让骨架一直转 -->
    <span v-else-if="card.weather.failed" class="portal-weather__pending">
      天气暂时拿不到
    </span>
    <template v-else>
      <span class="portal-weather__main">
        <AppIcon
          class="portal-weather__icon"
          :name="card.weather.icon"
          :size="40"
        />
        <span class="portal-weather__temp">
          {{ card.weather.temperature }}<span class="portal-weather__unit">°C</span>
        </span>
        <span class="portal-weather__cond">{{ card.weather.weather }}</span>
      </span>
      <span class="portal-weather__place">
        <AppIcon name="location_on" :size="14" />
        {{ card.weather.city }}
      </span>
      <span class="portal-weather__facts">
        <span class="portal-weather__fact">
          <AppIcon name="water_drop" :size="14" />
          湿度 {{ card.weather.humidity }}%
        </span>
        <span class="portal-weather__fact">
          <AppIcon name="air" :size="14" />
          {{ card.weather.wind_direction }} {{ card.weather.wind_power }}
        </span>
      </span>
    </template>
  </span>

  <!-- 美图型卡片：骨架 → 图片，圆角裁切 -->
  <span v-if="card.kind === 'photo'" ref="dynEl" class="portal-photo">
    <!--
      骨架与图片同层叠放：骨架在下、图片在上。
      图片解码完成（@load）后隐藏骨架，因此不会出现「骨架等图片、
      图片等骨架」的死锁 —— 只要拿到地址就一定会去请求。
    -->
    <span class="portal-photo__frame">
      <span
        v-if="!card.photo || !imgReady"
        class="portal-photo__placeholder portal-skeleton"
        aria-hidden="true"
      ></span>
      <img
        v-if="card.photo"
        :src="card.photo"
        :class="{ 'is-ready': imgReady }"
        alt="随机美图"
        loading="lazy"
        decoding="async"
        @load="imgReady = true"
        @error="onImgError"
      />
    </span>
    <button
      v-if="card.photo"
      v-ripple
      type="button"
      class="portal-photo__refresh"
      aria-label="换一张美图"
      title="换一张"
      @click.stop.prevent="emit('refreshPhoto')"
    >
      <AppIcon name="refresh" :size="16" />
      换一张
    </button>
  </span>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import AppIcon from "@components/AppIcon.vue";
import { useLazyLoad } from "@composables/lazy-load";

/**
 * 站点导航卡片的内容部分（外壳由 Home.vue 二选一渲染 RouterLink / a）。
 * 单独成组件：渲染函数内联到 Home.vue 时拿不到 scoped 属性，样式会整体失效。
 */
/** 天气数据（客户端从 uapis.cn 拉取，结构与接口字段一一对应） */
export interface WeatherInfo {
  city: string;
  weather: string;
  temperature: number;
  humidity: number;
  wind_direction: string;
  wind_power: string;
  icon: string;
}

export interface PortalCardShape {
  key: string;
  variant:
    | "feature"
    | "stat"
    | "list"
    | "tag"
    | "link"
    | "weather"
    | "photo";
  icon: string;
  label: string;
  desc: string;
  to?: string;
  href?: string;
  value?: string;
  tags?: { name: string; count: number }[];
  list?: { name: string; count: number }[];
  /** 动态卡片类型：weather = 天气，photo = 随机美图 */
  kind?: "weather" | "photo";
  /** 天气数据（父组件注入；null = 尚未加载 → 骨架；failed = 请求失败） */
  weather?: (WeatherInfo & { failed?: boolean }) | null;
  /** 美图地址（父组件注入；null 表示尚未加载完成 → 渲染骨架） */
  photo?: string | null;
}

const props = defineProps<{ card: PortalCardShape }>();
const emit = defineEmits<{
  photoError: [];
  refreshPhoto: [];
  load: [];
}>();

/**
 * 动态卡片的可见性检测放在组件内部：
 * 卡片自己知道何时进入视口，父组件只负责「怎么取数据」。
 * 进入视口（含 200px 预取）才 emit('load')，第三方请求不占首屏。
 */
const dynEl = ref<HTMLElement | null>(null);
/*
  直接把模板 ref 交给 composable：若经 watchEffect 中转，
  onMounted 时 target 仍是 null，会走「无元素 → 立即加载」的兜底分支，
  懒加载形同虚设。
*/
/*
  只有动态卡片（weather / photo）渲染了 dynEl；静态卡片的 dynEl 为 null，
  composable 检测到空元素会直接跳过（而不是立即加载）。
*/
useLazyLoad(dynEl, async () => {
  emit("load");
});

/** 图片是否已完成解码 —— 骨架要一直显示到真正能画出像素为止 */
const imgReady = ref(false);

/** 换图/换源时骨架重新出现，避免上一张残留 */
watch(
  () => props.card.photo,
  () => {
    imgReady.value = false;
  },
);

function onImgError() {
  imgReady.value = false;
  // 交给父组件换一张；若持续失败，父组件可自行限流
  emit("photoError");
}
</script>

<style scoped lang="scss">
/* 卡片内容样式与 Home.vue 里的 .portal-card 外壳同属一套：
   外壳（背景/边框/hover/瀑布流分列）在 Home.vue，内容在这里。 */

.portal-card__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.portal-card__icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.portal-card__label {
  flex: 1;
  min-width: 0;
  font-size: var(--md-sys-typescale-body-large-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.portal-card__arrow {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  transition: color var(--md-sys-motion-duration-short)
    var(--md-sys-motion-easing-standard);
}

/* 大数字（feature / stat 变体） */
.portal-card__value {
  position: relative;
  display: block;
  margin-top: var(--space-9);
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 700;
  line-height: 1.15;
  color: var(--md-sys-color-primary);
  font-variant-numeric: tabular-nums;
}

.portal-card__desc {
  position: relative;
  display: block;
  margin-top: var(--space-4);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: 1.7;
  color: var(--md-sys-color-on-surface-variant);
}

/* 标签云：小胶囊平铺，数量多的自然把卡片撑高 */
.portal-card__tags {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-9);
}

.portal-card__tag {
  display: inline-block;
  padding: 3px var(--space-5);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  line-height: 1.6;
}

/* 列表：名称 + 计数，右对齐计数便于纵向扫读 */
.portal-card__list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-9);
}

.portal-card__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-6);
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.portal-card__row-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-card__row-count {
  flex: none;
  color: var(--md-sys-color-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---------- 懒加载骨架 ----------
   用 on-surface 低透明度块表示「内容即将出现」，避免第三方接口
   返回前卡片塌成空白。shimmer 动效在 reduced-motion 下关闭。 */

.portal-skeleton {
  position: relative;
  display: block;
  overflow: hidden;
}

.portal-skeleton__row {
  display: block;
  height: 14px;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-high);
}

.portal-skeleton__row--lg {
  width: 62%;
  height: 34px;
  margin-bottom: var(--space-5);
}

.portal-skeleton__row--sm {
  width: 45%;
}

.portal-skeleton__row + .portal-skeleton__row {
  margin-top: var(--space-4);
}

/* 掠过式高光：叠在骨架块上的一层线性渐变 */
.portal-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent),
    transparent
  );
  transform: translateX(-100%);
  animation: portal-skeleton-sweep 1.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes portal-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .portal-skeleton::after {
    animation: none;
    /* 不带高光时保留静态底块，语义仍是「加载中」 */
    opacity: 0;
  }
}

/* ---------- 天气卡片 ---------- */

.portal-weather {
  position: relative;
  display: block;
  margin-top: var(--space-9);
}

.portal-weather__main {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.portal-weather__icon {
  flex: none;
  color: var(--md-sys-color-primary);
}

.portal-weather__temp {
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 700;
  line-height: 1.1;
  color: var(--md-sys-color-primary);
  /* 等宽数字：温度变化时不跳动 */
  font-variant-numeric: tabular-nums;
}

.portal-weather__unit {
  font-size: 0.5em;
  font-weight: 600;
  margin-left: 2px;
}

.portal-weather__cond {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

.portal-weather__place {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
}

.portal-weather__facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  margin-top: var(--space-3);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
}

.portal-weather__fact {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.portal-weather__pending {
  display: block;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

/* ---------- 美图卡片 ---------- */

.portal-photo {
  position: relative;
  display: block;
  margin-top: var(--space-9);
}

/* 圆角裁切：图片本身比例不一，统一由容器裁出圆角 */
.portal-photo__frame {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
  background: var(--md-sys-color-surface-container-high);
}

/* 骨架铺满容器（与图片同层，图片盖上后即被遮住） */
.portal-photo__frame .portal-skeleton {
  position: absolute;
  inset: 0;
}

.portal-photo__frame img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 解码完成前先透明，避免半张图闪出；@load 后淡入 */
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-medium)
    var(--md-sys-motion-easing-standard);
}

.portal-photo__frame img.is-ready {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .portal-photo__frame img {
    transition: none;
  }
}

.portal-photo__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--md-sys-color-on-surface-variant);
}

/* 「换一张」：低干扰的小按钮，靠右下 */
.portal-photo__refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
  padding: 0 var(--space-6);
  height: 30px;
  border: 1px solid var(--site-card-border);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-family: inherit;
  font-size: var(--md-sys-typescale-label-small-size);
  cursor: pointer;
  transition:
    background var(--md-sys-motion-duration-short)
      var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short)
      var(--md-sys-motion-easing-standard);
}

.portal-photo__refresh:hover {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}
</style>