import { watch } from "vue";
import { createApp } from "./app";
import { currentTheme, initTheme } from "@lib/theme";
import { initFontLoader } from "@lib/fontLoader";
import { hydrateMermaid, resetMermaid } from "@lib/mermaid-view";

/*
  正文自托管字体改为延迟加载：首屏不占用带宽，等 load 之后才开始拉取。
  首次访问会先用系统中文栈渲染，再到下一个会话换上本站字体；有缓存标记的
  访客会在 <head> 同步拿到 @font-face，首帧即用本站字体（无切换动作）。
  完整权衡见 src/lib/fontLoader.ts。
*/
initFontLoader();

const { app, router } = createApp(false);

// 主题：优先 localStorage，否则跟随系统（并监听系统切换）
initTheme();

/*
  Mermaid 的主题在 initialize() 时固定，而本站是运行时切换 html[data-theme]。
  主题一变就丢弃已渲染图表并还原源码，再用新主题重渲染，避免暗色页面里
  留着一张亮色图表。mermaid 是懒加载的，无图表的页面这里不会触发下载。
*/
watch(currentTheme, async () => {
	resetMermaid();
	await hydrateMermaid();
});

// 等待路由就绪再挂载，避免客户端首屏与预渲染 HTML 水合错位
router.isReady().then(() => {
	app.mount("#app");
});
