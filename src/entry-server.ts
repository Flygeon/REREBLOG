/**
 * entry-server.ts —— SSG 服务端入口。
 * 由 `vite build --ssr` 编译为 dist-ssr/entry-server.js，供 scripts/ssg.mjs 调用。
 */
import { renderToString } from "@vue/server-renderer";
import { createApp } from "./app";
import { getPrerenderUrls } from "@lib/posts";
import { prewarmMarkdown } from "@lib/markdown";
import { resetHead, getHead } from "@lib/head";

export { getPrerenderUrls };

/** 预渲染单个 URL，返回 #app 内部 HTML 与页面 head 信息 */
export async function render(url: string): Promise<{
	html: string;
	head: ReturnType<typeof getHead>;
}> {
	await prewarmMarkdown();
	resetHead();
	const { app, router } = createApp(true);
	await router.push(url);
	await router.isReady();
	// 等待异步组件（动态 import 的页面）加载完成
	await router.isReady();
	const html = await renderToString(app);
	return { html, head: getHead() };
}
