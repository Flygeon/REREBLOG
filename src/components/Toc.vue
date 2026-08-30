<template>
  <nav v-if="headings.length" class="toc" aria-label="目录">
    <div class="toc__head">
      <AppIcon name="menu_book" :size="16" />
      <span>目录</span>
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

/** 平滑滚动到锚点（含 App Bar 高度偏移） */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top =
    el.getBoundingClientRect().top + window.scrollY - (64 + 24);
  window.scrollTo({ top, behavior: "smooth" });
  history.replaceState(null, "", `#${id}`);
}

onMounted(() => {
  // IntersectionObserver 监听各标题进入视口，高亮当前章节
  const els = props.headings
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null);
  if (!els.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = props.headings.findIndex(
            (h) => h.id === entry.target.id,
          );
          if (idx >= 0) activeIndex.value = idx;
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
  );
  els.forEach((el) => observer!.observe(el));
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.toc {
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--lm-hairline);
  border-radius: var(--ll-radius-card);
  padding: 18px 16px;
}
.toc__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--md-sys-color-primary);
  font-size: var(--md-sys-typescale-title-small-size);
  font-weight: var(--md-sys-typescale-title-small-weight);
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
  z-index: -1;
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
