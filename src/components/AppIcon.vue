<template>
  <!-- Material Symbols 图标（硬性约束：不使用 emoji）
       用法：<AppIcon name="dark_mode" :size="20" /> -->
  <span
    class="material-symbols-rounded app-icon"
    :style="{
      fontSize: `${size}px`,
      ...(color ? { color } : {}),
    }"
    :aria-hidden="ariaHidden"
    :title="title"
  >{{ name }}</span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Material Symbols 图标名（ligature），如 dark_mode / light_mode / search */
    name: string;
    size?: number;
    color?: string;
    title?: string;
    ariaHidden?: boolean;
  }>(),
  {
    size: 20,
    color: "",
    title: "",
    ariaHidden: true,
  },
);
</script>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  user-select: none;
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}
</style>
