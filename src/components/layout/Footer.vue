<template>
  <!-- 页脚：沿用模板 .footer 结构与栅格，内容替换为博客信息 -->
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <RouterLink class="brand" to="/">
            <!-- 与顶栏一致：品牌区只用文字站名，不放图标 -->
            <span class="brand__name">{{ siteConfig.title }}</span>
          </RouterLink>
        </div>

        <div>
          <h5>导航 Navigation</h5>
          <ul>
            <li v-for="link in navLinks" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h5>链接 Links</h5>
          <ul>
            <li v-for="link in profileLinks" :key="link.url">
              <a :href="link.url" target="_blank" rel="noopener">
                {{ link.name }}
              </a>
            </li>
            <li><RouterLink to="/friends">友情链接</RouterLink></li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <a
          v-if="licenseConfig.enable"
          class="badge-lic"
          :href="licenseConfig.url"
          target="_blank"
          rel="noopener"
        >
          {{ licenseConfig.name }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { licenseConfig, profileConfig, siteConfig } from "@/config";

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/archive", label: "归档" },
  { to: "/search", label: "搜索" },
  { to: "/bangumi", label: "番剧" },
  { to: "/about", label: "关于" },
];

/** 站长社交链接（来自 profileConfig） */
const profileLinks = computed(() => profileConfig.links ?? []);
</script>

<style scoped>
.footer__brand .brand {
  margin: 0;
  text-decoration: none;
}
/* 页脚底部只剩许可徽标：靠右对齐，避免 space-between 把它推到最左 */
.footer__bottom {
  justify-content: flex-end;
}
.badge-lic {
  text-decoration: none;
}
</style>
