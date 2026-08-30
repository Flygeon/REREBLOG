<template>
  <div class="container">
    <header class="page__header">
      <div class="eyebrow">Moments</div>
      <h1 class="section-title">动态</h1>
      <p class="section-sub">随手发布的想法、生活琐事与图片。</p>
      <a class="page__ext" href="/moments/" target="_blank" rel="noopener">
        管理动态
        <AppIcon name="open_in_new" :size="14" />
      </a>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="memos__state">动态加载中…</div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="memos__state">
      动态加载失败：{{ error }}
      <p class="memos__hint">稍后再试，或前往管理页检查：flygeon.top/moments/</p>
    </div>

    <!-- 动态列表 -->
    <section v-else class="memos__list" aria-label="动态列表">
      <article v-for="memo in memos" :key="memo.id" class="memo-card">
        <div class="memo-card__avatar">
          <img :src="avatarSrc" alt="头像" />
        </div>
        <div class="memo-card__body">
          <div class="memo-card__content" v-html="renderMemo(memo.content)"></div>
          <a
            v-if="memo.image"
            class="memo-card__image-link"
            :href="`/moments/media/${memo.image}`"
            target="_blank"
            rel="noopener"
          >
            <img
              class="memo-card__image"
              :src="`/moments/media/${memo.image}`"
              alt="动态图片"
              loading="lazy"
            />
          </a>
          <div class="memo-card__meta">{{ formatTime(memo.created_at) }}</div>
        </div>
      </article>
    </section>

    <!-- 空 -->
    <div v-if="!loading && !error && memos.length === 0" class="memos__state">
      暂无动态
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import avatarSrc from "@assets/images/avatar.png";
import { setHead } from "@lib/head";

setHead({
  title: "动态 - Flygeon 的最新动态与碎碎念 | Flygeonの小站",
  description:
    "Flygeon の动态时间线：随时发布想法、生活琐事与图片，基于自建的 Cloudflare Workers 服务实时更新。",
});

interface Moment {
  id: number;
  content: string;
  image?: string | null; // R2 key，展示地址 /moments/media/<key>
  created_at: number; // unix 秒
}

const memos = ref<Moment[]>([]);
const loading = ref(true);
const error = ref("");

/** 渲染动态内容：把换行转 <br>，简单转义 */
function renderMemo(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function formatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  try {
    // 数据源：Moments Worker（同域 flygeon.top/moments/api/*）
    const res = await fetch("/moments/api/list?limit=50", {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    memos.value = Array.isArray(data.moments) ? data.moments : [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "网络错误";
  } finally {
    loading.value = false;
  }
});
</script>
