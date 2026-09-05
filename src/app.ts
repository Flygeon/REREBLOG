import { createApp as createVueApp, type App as VueApp } from "vue";
import App from "./App.vue";
import { createRouter, createWebHistory, createMemoryHistory } from "vue-router";
import { routes } from "./router";
import Varlet from "@varlet/ui";
import "@varlet/ui/es/varlet.css";
// 图标字体走 styles/_icons.scss 的自托管子集（Material Symbols，不使用 emoji / 字符箭头）
import "./styles/main.scss";
import { reveal } from "@composables/reveal";
import { ripple } from "@composables/ripple";

/**
 * 应用工厂（同时供客户端与 SSR 使用）。
 * 客户端用 createWebHistory；SSG 预渲染用 createMemoryHistory。
 */
export function createApp(ssr = false) {
	const app: VueApp = createVueApp(App);
	const router = createRouter({
		// base 跟随构建配置（GitHub Pages 分站为 /REBLOG/），RouterLink 的绝对
		// to 值会自动拼接该前缀
		history: ssr
			? createMemoryHistory(import.meta.env.BASE_URL)
			: createWebHistory(import.meta.env.BASE_URL),
		routes,
		scrollBehavior(_to, _from, savedPosition) {
			if (savedPosition) return savedPosition;
			return { top: 0 };
		},
	});
	app.use(router);
	// Varlet UI 组件库（分页 / 标签页），色板由 StyleProvider 映射到站点令牌
	app.use(Varlet);
	// 模板滚动入场指令 v-reveal
	app.directive("reveal", reveal);
	// MD3 涟漪触摸反馈 v-ripple
	app.directive("ripple", ripple);
	return { app, router };
}
