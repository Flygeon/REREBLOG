<template>
  <nav v-if="headings.length" class="toc" :aria-label="i18n(I18nKey.toc)">
    <div class="toc__head">
      <AppIcon name="menu_book" :size="16" />
      <span>{{ i18n(I18nKey.toc) }}</span>
    </div>
    <ul class="toc__list">
      <li
        v-for="(h, i) in headings"
        :key="h.id"
        class="toc__item"
        :class="{
          'toc__item--h3': h.level === 3,
          'toc__item--h4': h.level >= 4,
        }"
      >
        <a
          class="toc__link"
          :class="{ 'toc__link--active': activeIndex === i }"
          :href="`#${h.id}`"
          @click.prevent="scrollTo(h.id)"
        >{{ h.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const props = defineProps<{
  headings: TocHeading[];
}>();

const activeIndex = ref(-1);
let observer: IntersectionObserver | null = null;
/** 目录列表容器（.toc__list），用于把当前项滚进可视区 */
let listEl: HTMLElement | null = null;
/**
 * 点击目录后的"冻结"标记。
 * 点击会触发平滑滚动，滚动过程中 IntersectionObserver 仍会依次命中中间章节，
 * 导致高亮被一路带着跳（观感是"点一下、高亮乱窜"）。
 * 冻结期间忽略 IO 结果，直到用户自己滚动（wheel / touch / 方向键）才解除。
 */
let frozen = false;

/** 用户主动滚动即解除冻结 */
function releaseFreeze() {
  frozen = false;
}
function bindRelease() {
  window.addEventListener("wheel", releaseFreeze, { passive: true });
  window.addEventListener("touchstart", releaseFreeze, { passive: true });
  window.addEventListener("keydown", releaseFreeze);
}

/**
 * 把当前高亮项滚进目录可视区。
 *
 * 只在该项**真的超出可视区**时才滚（边缘阈值 8px 容错）——
 * 否则每次滚动文章都会让目录轻微抖动，反而更烦。
 */
function revealActive(index: number) {
  if (!listEl) return;
  const item = listEl.children[index] as HTMLElement | undefined;
  if (!item) return;
  const top = listEl.scrollTop;
  const bottom = top + listEl.clientHeight;
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  if (itemTop >= top + 8 && itemBottom <= bottom - 8) return;
  // 让当前项落在可视区约 1/3 处，留出上下文
  listEl.scrollTo({
    top: itemTop - listEl.clientHeight / 3,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/** 尊重 prefers-reduced-motion：不做平滑滚动 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** 平滑滚动到锚点（含 App Bar 高度偏移） */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  frozen = true;
  const top =
    el.getBoundingClientRect().top + window.scrollY - (64 + 24);
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  history.replaceState(null, "", `#${id}`);

  // 立即把点击项设为高亮并滚进可视区，不等 IO 回调
  const idx = props.headings.findIndex((h) => h.id === id);
  if (idx >= 0) {
    activeIndex.value = idx;
    revealActive(idx);
  }
}

onMounted(() => {
  listEl = document.querySelector(".toc__list");
  bindRelease();

  // IntersectionObserver 监听各标题进入视口，高亮当前章节
  const els = props.headings
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null);
  if (!els.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      if (frozen) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = props.headings.findIndex(
            (h) => h.id === entry.target.id,
          );
          if (idx >= 0 && idx !== activeIndex.value) {
            activeIndex.value = idx;
            revealActive(idx);
          }
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
  );
  els.forEach((el) => observer!.observe(el));
});

onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener("wheel", releaseFreeze);
  window.removeEventListener("touchstart", releaseFreeze);
  window.removeEventListener("keydown", releaseFreeze);
});
</script>

<style scoped>
.toc {
  background: var(--site-card);
  border: 1px solid var(--site-card-border);
  box-shadow: var(--site-elev-1);
  /* 外层卡片统一 16px（原为 --ll-radius-card = 28px，与全站卡片不一致） */
  border-radius: var(--md-sys-shape-corner-large);
  padding: 18px 16px;
}
.toc__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--md-sys-color-primary);
  /* 中文标题：不用 uppercase / letter-spacing */
  font-size: 13px;
  font-weight: 600;
}
.toc__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 60vh;
  overflow-y: auto;
}
.toc__item--h3 .toc__link {
  padding-left: 20px;
}
.toc__item--h4 .toc__link {
  padding-left: 30px;
  font-size: 12px;
}
.toc__link {
  /* MD3 state layer：hover 用 on-surface 8% 叠加 */
  position: relative;
  isolation: isolate;
  display: block;
  padding: 6px 10px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  font-size: 13px;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
  border-left: 2px solid transparent;
  transition: color var(--md-sys-motion-duration-short);
}
.toc__link::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: var(--z-below);
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short);
}
.toc__link:hover {
  color: var(--md-sys-color-on-surface);
}
.toc__link:hover::before {
  opacity: 0.08;
}
.toc__link--active {
  color: var(--md-sys-color-primary);
  font-weight: 600;
  border-left-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-secondary-container);
}
</style>