import { watch } from "vue";
import { createApp } from "./app";
import { currentTheme, initTheme } from "@lib/theme";
import { hydrateMermaid, resetMermaid } from "@lib/mermaid-view";

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
