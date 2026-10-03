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
          <p v-if="tagline" class="footer__tagline">{{ tagline }}</p>
        </div>

        <div>
          <h2 class="footer__heading">{{ i18n(I18nKey.footerNav) }}</h2>
          <ul>
            <li v-for="link in navLinks" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 class="footer__heading">{{ i18n(I18nKey.footerLinks) }}</h2>
          <ul>
            <li v-for="link in profileLinks" :key="link.url">
              <a :href="link.url" target="_blank" rel="noopener">
                {{ link.name }}
              </a>
            </li>
            <li><RouterLink to="/friends">{{ i18n(I18nKey.friendLinks) }}</RouterLink></li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <p class="footer__copy">
          © {{ year }} {{ siteConfig.title }} · Built with Vue 3 + Vite
        </p>
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
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/blog", label: "博客" },
  { to: "/bangumi", label: "番剧" },
  { to: "/memos", label: "动态" },
  { to: "/about", label: "关于" },
];

/** 站长社交链接（来自 profileConfig） */
const profileLinks = computed(() => profileConfig.links ?? []);

/** 品牌区标语：优先用首页横幅副标题，退到站长签名 */
const tagline = siteConfig.banner?.subtitle?.text || profileConfig.bio || "";

const year = new Date().getFullYear();
</script>

<style scoped>
.footer__brand .brand {
  margin: 0;
  text-decoration: none;
}
.footer__tagline {
  margin-top: 12px;
  max-width: 34ch;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
  line-height: 1.7;
}
/* 底栏：左侧版权、右侧许可徽标（改写为两端对齐，避免左侧空一大片） */
.footer__bottom {
  align-items: center;
  justify-content: space-between;
}
.footer__copy {
  margin: 0;
}
.badge-lic {
  text-decoration: none;
}
</style>