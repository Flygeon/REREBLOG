<template>
  <div class="pagination">
    <!--
      show-size-changer=false：Varlet 的「每页条数」选择器会往 <ul> 里塞一个 <div>
      （menu-select 的挂载点），而 <ul> 只允许直接子元素为 <li>，axe 的 list 规则会判
      serious 违规。此前用 CSS display:none 隐藏，DOM 仍在，违规照报；这里从源头关掉，
      节点根本不渲染。
    -->
    <var-pagination
      :current="currentPage"
      :total="totalItems"
      :size="size"
      :max-pager-count="5"
      :simple="false"
      :show-size-changer="false"
      :elevation="false"
      @change="go"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    currentPage: number;
    lastPage: number;
    /** 分页基址：第 1 页即 base，后续页为 `${base}/${p}` */
    base?: string;
  }>(),
  { base: "/blog" },
);

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
  if (p === 1) return props.base;
  return `${props.base}/${p}`;
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}
/* 兜底：即使 show-size-changer 失效导致节点仍被渲染，也不让它显示（页码由路由控制） */
.pagination :deep(.var-pagination__size) {
  display: none;
}
</style>
