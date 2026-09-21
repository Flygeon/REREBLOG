<template>
  <!--
    品牌图标（Bilibili / Steam / GitHub …）。
    矢量数据内联在 src/data/brand-icons.ts —— 不引入 Iconify 运行时包，
    理由见该文件头部注释（图标全量数据 1MB+，与已做完的字体子集化取向冲突）。
    兜底：config 里若新增了未收录的品牌，回退到 Material Symbols 的外链图标，
    不会渲染成空白。
  -->
  <AppIcon v-if="!icon" name="open_in_new" :size="size" />
  <svg
    v-else
    class="brand-icon"
    :width="size"
    :height="size"
    :viewBox="icon.viewBox"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in icon.paths" :key="i" :d="d" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@components/AppIcon.vue";
import { BRAND_ICONS } from "@/data/brand-icons";

const props = withDefaults(
  defineProps<{
    /** Iconify 图标名，与 config.ts 的 icon 字段保持一致，如 "fa6-brands:github" */
    name: string;
    /** 渲染边长（px）；非正方形 viewBox 由 SVG 的 preserveAspectRatio 自动居中留白 */
    size?: number;
  }>(),
  { size: 20 },
);

const icon = computed(() => BRAND_ICONS[props.name] ?? null);
</script>

<style scoped>
.brand-icon {
  display: block;
  flex: none;
}
</style>
