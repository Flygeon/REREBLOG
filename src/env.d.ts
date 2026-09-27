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

// Varlet 只提供 .mjs 实现（无对应 .d.mts），补最小声明以通过类型检查
declare module "@varlet/ui/es/themes/md3-light/index.mjs" {
  const theme: Record<string, string>;
  export default theme;
}
declare module "@varlet/ui/es/themes/md3-dark/index.mjs" {
  const theme: Record<string, string>;
  export default theme;
}
