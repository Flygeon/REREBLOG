import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// Vite + Vue 3 自建 SSG 工程配置
// - 开发期：vite dev 提供 SPA 调试
// - 生产期：先 `vite build` 产出客户端资源，再 scripts/ssg.mjs 预渲染各路由为静态 HTML
export default defineConfig({
  // 分站（GitHub Pages）部署在 /REBLOG/ 子路径下，由 VITE_BASE 注入；主站保持 /
  base: process.env.VITE_BASE || "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@constants": fileURLToPath(new URL("./src/constants", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
      "@lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@composables": fileURLToPath(new URL("./src/composables", import.meta.url)),
      "@stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    // 关闭内置清空；由构建前 `rm -rf dist` 手动清理，
    // 以绕过 WorkBuddy safe-delete shim 在 Windows 下的超时
    emptyOutDir: false,
    // 生成 SSG 所需的 manifest（后续 scripts/ssg.mjs 会用到）
    manifest: true,
    rollupOptions: {
      output: {
        // 拆分 vendor，便于 Cloudflare Workers 静态托管与缓存
        manualChunks: {
          vue: ["vue", "vue-router"],
        },
      },
    },
  },
  server: {
    proxy: {
      // dev 环境将 Bangumi API 与封面镜像代理到线上 Worker（同一路由协议）
      "/api/bgm": {
        target: "https://flygeon.top",
        changeOrigin: true,
      },
      "/pic": {
        target: "https://flygeon.top",
        changeOrigin: true,
      },
      "/r": {
        target: "https://flygeon.top",
        changeOrigin: true,
      },
    },
  },
});

