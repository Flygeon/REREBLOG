/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

// markdown-it-texmath 无类型声明（@types 亦无）。markdown-it 本身在本工程也未装
// @types/markdown-it（属既有报错），因此这里只做「让 TS 认识该模块」的最小声明，
// 参数用 unknown 保持与 markdown-it 一致的宽松口径。
declare module "markdown-it-texmath" {
  const texmath: (md: unknown, options?: unknown) => void;
  export default texmath;
}

// Varlet 只提供 .mjs 实现（无对应 .d.mts），补最小声明以通过类型检查
declare module "@varlet/ui/es/themes/md3-light/index.mjs" {
  const theme: Record<string, string>;
  export default theme;
}
declare module "@varlet/ui/es/themes/md3-dark/index.mjs" {
  const theme: Record<string, string>;
  export default theme;
}
