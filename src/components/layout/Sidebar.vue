<template>
  <div class="sidebar">
    <!-- 站长卡片 -->
    <section v-reveal class="side-card side-profile side-card--hero">
      <img
        class="side-profile__avatar"
        :src="avatarUrl"
        :alt="profile.name"
        width="96"
        height="96"
      />
      <div class="side-profile__name">{{ profile.name }}</div>
      <p class="side-profile__bio">{{ profile.bio }}</p>
      <div v-if="profile.links?.length" class="side-profile__links">
        <a
          v-for="link in profile.links"
          :key="link.url"
          v-ripple
          class="side-chip"
          :href="link.url"
          target="_blank"
          rel="noopener"
          :title="link.name"
        >
          {{ link.name }}
        </a>
      </div>
    </section>

    <!-- 分类 -->
    <section v-if="categories.length" v-reveal class="side-card">
      <h2 class="side-card__title">
        <AppIcon name="folder" :size="16" />
        分类
      </h2>
      <ul class="side-rows">
        <li v-for="cat in categories" :key="cat.name">
          <RouterLink class="side-rows__row" :to="toLink(cat.url)">
            <span>{{ cat.name }}</span>
            <span class="side-rows__count">{{ cat.count }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- 标签 -->
    <section v-if="tags.length" v-reveal class="side-card">
      <h2 class="side-card__title">
        <AppIcon name="sell" :size="16" />
        标签
      </h2>
      <div class="side-chips">
        <RouterLink
          v-for="tag in visibleTags"
          :key="tag.name"
          v-ripple
          class="side-chip"
          :to="toLink(getTagUrl(tag.name))"
        >
          #{{ tag.name }}
        </RouterLink>
      </div>
      <button
        v-if="tags.length > TAG_PREVIEW"
        v-ripple
        type="button"
        class="side-tags__toggle"
        @click="showAllTags = !showAllTags"
      >
        {{ showAllTags ? "收起" : `展开全部 ${tags.length} 个` }}
        <AppIcon :name="showAllTags ? 'expand_less' : 'expand_more'" :size="16" />
      </button>
    </section>

    <!-- 正在追（Bangumi「在看」） -->
    <section v-if="bangumiVisible" v-reveal class="side-card">
      <h2 class="side-card__title">
        <AppIcon name="smart_display" :size="16" />
        正在追
      </h2>
      <div v-if="bangumiLoading" class="side-bgm" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="side-bgm__skeleton"></div>
      </div>
      <div v-else class="side-bgm">
        <a
          v-for="item in bangumiDoing"
          :key="item.subject_id"
          class="side-bgm__item"
          :href="`https://bgm.tv/subject/${item.subject_id}`"
          target="_blank"
          rel="noopener"
          :title="item.subject.name_cn || item.subject.name"
        >
          <img
            :src="item.subject.images?.common || ''"
            :alt="item.subject.name_cn || item.subject.name"
            loading="lazy"
          />
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppIcon from "@components/AppIcon.vue";
import { profileConfig } from "@/config";
import { allPosts } from "@lib/posts";
import { getCategoryList, getTagList } from "@utils/content-utils";
import { getTagUrl } from "@utils/url-utils";
import { toRouterLink } from "@utils/url-utils";
import avatarUrl from "@assets/images/avatar.png";
import { reveal } from "@composables/reveal";

// 模板滚动入场指令（局部注册，配合 v-reveal 使用）
const vReveal = reveal;

const profile = profileConfig;

const categories = computed(() => getCategoryList(allPosts));
const tags = computed(() => getTagList(allPosts));

/* 标签折叠：预览前 12 个，点击展开全部 */
const TAG_PREVIEW = 12;
const showAllTags = ref(false);
const visibleTags = computed(() =>
  showAllTags.value ? tags.value : tags.value.slice(0, TAG_PREVIEW),
);

const toLink = toRouterLink;

/* ---- 正在追：subject_type=2(动画) 收藏里 type=3(doing) 的条目 ---- */
interface BgmItem {
  subject_id: number;
  type: number;
  subject: {
    name: string;
    name_cn: string;
    images?: { common: string } | null;
  };
}

const bangumiLoading = ref(true);
const bangumiDoing = ref<BgmItem[]>([]);
const bangumiVisible = ref(true);

onMounted(async () => {
  try {
    const res = await fetch(
      "https://api.bgm.tv/v0/users/1250652/collections?subject_type=2&limit=100",
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    bangumiDoing.value = ((data.data ?? []) as BgmItem[])
      .filter((i) => i.type === 3)
      .slice(0, 6);
    // 没有在看条目就不显示该卡
    if (bangumiDoing.value.length === 0) bangumiVisible.value = false;
  } catch {
    bangumiVisible.value = false;
  } finally {
    bangumiLoading.value = false;
  }
});
</script>
