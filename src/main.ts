import { createApp } from "./app";
import { initTheme } from "@lib/theme";

const { app, router } = createApp(false);

// 主题：优先 localStorage，否则跟随系统（并监听系统切换）
initTheme();

// 等待路由就绪再挂载，避免客户端首屏与预渲染 HTML 水合错位
router.isReady().then(() => {
	app.mount("#app");
});
