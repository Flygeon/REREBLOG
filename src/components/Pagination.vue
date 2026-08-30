<template>
  <div class="pagination">
    <var-pagination
      :current="currentPage"
      :total="totalItems"
      :size="size"
      :max-pager-count="5"
      :simple="false"
      :elevation="false"
      @change="go"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const props = defineProps<{
  currentPage: number;
  lastPage: number;
}>();

const router = useRouter();

// Varlet pagination 需要 total（条目数）；size 固定为 1（每页 1 组）
// 使 total === lastPage，页码即页数
const size = 1;
const totalItems = props.lastPage;

function go(current: number | string) {
  const p = Number(current);
  if (p === props.currentPage || p < 1 || p > props.lastPage) return;
  router.push(pageUrl(p));
}

function pageUrl(p: number): string {
  if (p === 1) return "/";
  return `/${p}/`;
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}
/* 隐藏 Varlet 自带的每页条数选择器（"N条 / 页"），页码由路由控制 */
.pagination :deep(.var-pagination__size) {
  display: none;
}
</style>
