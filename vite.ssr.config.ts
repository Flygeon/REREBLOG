import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// SSR 专用构建配置（vite build --ssr src/entry-server.ts --config vite.ssr.config.ts）
// 与 vite.config.ts 的区别：
//  - 去掉 build.manualChunks / manifest：SSR 产物是 Node 模块，不应手动拆 chunk，
//    vue 等依赖在 SSR 下被 external，放进 manualChunks 会报错。
//  - 保留相同的 alias 与插件，保证与客户端路径解析一致。
export default defineConfig({
  // 与客户端构建保持同一 base（SSR 渲染出的 RouterLink href 依赖它）
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
    outDir: "dist-ssr",
    // 关闭内置清空：Rollup 会覆盖 entry-server.js，旧残留文件不影响功能。
    // 保留 false 可避免触发 WorkBuddy safe-delete shim（它劫持 fs.rmSync 导致删除失败）。
    emptyOutDir: false,
    manifest: false,
    ssr: "src/entry-server.ts",
    rollupOptions: {
      // SSR 产物保持 Node 格式（CommonJS 或 ESM 均可，默认由外部化策略决定）
    },
  },
});
