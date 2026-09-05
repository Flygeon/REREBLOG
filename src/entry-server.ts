/**
 * entry-server.ts —— SSG 服务端入口。
 * 由 `vite build --ssr` 编译为 dist-ssr/entry-server.js，供 scripts/ssg.mjs 调用。
 */
import { renderToString } from "@vue/server-renderer";
import { createApp } from "./app";
import { getPrerenderUrls, allPosts, specPages } from "@lib/posts";
import { prewarmMarkdown, renderMarkdown } from "@lib/markdown";
import { resetHead, getHead } from "@lib/head";

export { getPrerenderUrls };

/**
 * 一次性渲染全部文章与 spec 页正文 HTML，
 * 供 scripts/render-content.mjs 落盘为 src/generated/*.json。
 * 生产客户端直接消费这些 JSON，不再携带 markdown-it + shiki。
 */
export async function renderContentBundle(): Promise<{
	posts: Record<string, string>;
	specs: Record<string, string>;
}> {
	await prewarmMarkdown();
	const posts: Record<string, string> = {};
	for (const post of allPosts) {
		posts[post.slug] = await renderMarkdown(post.body ?? "");
	}
	const specs: Record<string, string> = {};
	for (const [slug, spec] of Object.entries(specPages)) {
		specs[slug] = await renderMarkdown(spec.body);
	}
	return { posts, specs };
}

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
