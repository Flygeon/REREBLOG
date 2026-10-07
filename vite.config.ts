import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

/**
 * 把 esbuild 摘掉的 data URI 引号补回来。
 *
 * esbuild 的 CSS minifier 会把 url("...") 统一压成 url(...)。对普通路径无害，
 * 但 @varlet/ui 的 icon.css 里内联了一段 36KB 的 base64 图标字体：
 *   src: url("data:font/truetype;charset=utf-8;base64,....") format("truetype")
 * 去引号后它变成「单个超长且含分号的 url token」。旧内核解析这类 token 时可能
 * 出错并连累后续规则（Chromium 88 实测整份样式表失效、页面裸奔），而它位于
 * 产物 CSS 约 8% 处 —— 一旦解析中断，其后的 MD3 令牌与组件样式会全部丢失。
 * 这里在产物落盘前只给 data URI 补回引号，其余 url 保持压缩后的形态。
 */
function restoreDataUriQuotes() {
  return {
    name: "restore-data-uri-quotes",
    enforce: "post" as const,
    generateBundle(_options: unknown, bundle: Record<string, any>) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk?.type !== "asset" || !fileName.endsWith(".css")) continue;
        const css = String(chunk.source);
        const fixed = css.replace(
          /(?<![-\w])url\(\s*(data:[^)"']*)\s*\)/g,
          (_match, uri: string) => `url("${uri}")`,
        );
        if (fixed !== css) chunk.source = fixed;
      }
    },
  };
}

/**
 * 把首屏必需的字体提前写进 <head> 的 <link rel="preload">。
 *
 * 为什么需要：图标字体原本只在构建后的 CSS 里被 url() 引用，浏览器要先拿到
 * CSS（首屏 CSS 是 ~200KB，压缩后 ~50KB）才发现字体，再发起第二个请求 ——
 * 字体在关键路径上被串行延后了一整个 RTT，而它的 @font-face 用的是
 * font-display: block（刻意不改 swap，见 _icons.scss 注释），
 * 「发现得晚」会直接表现为首屏图标短暂空白。
 *
 * ⚠️ 只 preload 图标字体这一个首屏必需资源。两类字体刻意不 preload：
 *
 *  1. 正文可变字体 noto-sans-sc-subset（354KB，全站最大的单个资源）
 *     它的 font-display 是 optional（见 _fonts.scss 注释）：首访不参与首屏
 *     渲染，字体在后台下载并进缓存供后续命中。preload 会把它强行拉回关键
 *     路径、重新抢占首屏带宽 —— 与 optional 的设计意图直接冲突，故必须排除。
 *
 *  2. KaTeX / Varlet 的字体
 *     不在首屏关键路径上，加了只会白白占用首屏带宽、挤占真正关键资源的连接。
 *
 * Vite 会给字体加内容哈希，插件在 generateBundle 阶段拿到真实文件名，
 * 注入 <head>，并带上 crossorigin（字体请求必须 CORS，缺少会被丢弃并告警）。
 */
const PRELOAD_FONTS: Array<{ name: string; re: RegExp }> = [
  {
    name: "icon",
    re: /assets\/material-symbols-rounded-subset-.*\.woff2$/,
  },
];

function preloadCriticalFonts() {
  return {
    name: "preload-critical-fonts",
    enforce: "post" as const,
    transformIndexHtml(html: string, ctx: { bundle?: Record<string, any> }) {
      const files = Object.keys(ctx.bundle ?? {});
      // base 可能是 "/"（主站）或 "/REBLOG/"（GitHub Pages 分站），必须带上
      const base = process.env.VITE_BASE || "/";
      const prefix = base.endsWith("/") ? base : base + "/";

      const links: string[] = [];
      for (const { re } of PRELOAD_FONTS) {
        const font = files.find((f) => re.test(f));
        if (!font) continue;
        const href = prefix + font.replace(/^\//, "");
        links.push(
          `  <link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`,
        );
      }
      if (links.length === 0) return html;
      return html.replace("</head>", links.join("\n") + "\n  </head>");
    },
  };
}

// Vite + Vue 3 自建 SSG 工程配置
// - 开发期：vite dev 提供 SPA 调试
// - 生产期：先 `vite build` 产出客户端资源，再 scripts/ssg.mjs 预渲染各路由为静态 HTML
export default defineConfig({
  // 分站（GitHub Pages）部署在 /REBLOG/ 子路径下，由 VITE_BASE 注入；主站保持 /
  base: process.env.VITE_BASE || "/",
  plugins: [vue(), restoreDataUriQuotes(), preloadCriticalFonts()],
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
    // 显式声明目标浏览器（与 Vite 6 默认值一致，写出来避免默认值随版本漂移）。
    // 注意：target 只约束 JS/CSS 的「语法降级」，不做特性 polyfill ——
    // color-mix() / oklch() / :where() / aspect-ratio 的兼容由样式层的
    // @supports 兜底（见 _tokens-extra / _markdown / _blog / main）。
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
    cssTarget: ["chrome87", "edge88", "firefox78", "safari14"],
    // 关闭内置清空；由构建前 `rm -rf dist` 手动清理，
    // 以绕过 WorkBuddy safe-delete shim 在 Windows 下的超时
    emptyOutDir: false,
    // 生成 SSG 所需的 manifest（后续 scripts/ssg.mjs 会用到）
    manifest: true,
    // 全站共用一份样式：默认按异步路由拆出多份高度重复的 CSS（曾达 14×~328KB），
    // 关掉后合成单文件，跨路由可缓存、总体积更小
    cssCodeSplit: false,
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
    // 监听所有网卡（0.0.0.0），否则 Vite 默认只绑 localhost，
    // CNB 预览代理（来自 172.17.0.x 网段）会 connection refused。
    host: true,
    // 允许 CNB 预览环境的动态域名（如 n09m4iuxa2-5173.cnb.run）访问 dev server。
    // 必须写成白名单，不能写 `true` —— 后者在 Vite 里等价于关闭 Host/DNS-rebinding 校验，
    // 任意 Host 都能命中 dev 的 /api/bgm、/pic、/r 代理（等于开放跳板）。
    allowedHosts: [".cnb.run", "localhost"],
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

