<template>
  <!-- 页脚：沿用模板 .footer 结构与栅格，内容替换为博客信息 -->
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <RouterLink class="brand" to="/">
            <span class="brand__name">{{ siteConfig.title }}</span>
          </RouterLink>
          <p>{{ footerIntro }}</p>
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
        <span>
          © {{ year }} {{ profileConfig.name }} · 基于 Vue 3 + Vite 自建 SSG 与
          Material Design 3 构建
        </span>
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

const year = new Date().getFullYear();

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/archive", label: "归档" },
  { to: "/search", label: "搜索" },
  { to: "/bangumi", label: "番剧" },
  { to: "/about", label: "关于" },
];

/** 站长社交链接（来自 profileConfig） */
const profileLinks = computed(() => profileConfig.links ?? []);

const footerIntro =
  "记录 Web 开发与自建项目的个人博客：Vue 3 自建 SSG、Cloudflare Workers 动态服务，也收录 Bangumi 追番与日常碎碎念。";
</script>

<style scoped>
.footer__brand .brand {
  margin: 0;
  text-decoration: none;
}
.footer__brand p {
  margin-top: 14px;
  max-width: 320px;
}
.badge-lic {
  text-decoration: none;
}
</style>
