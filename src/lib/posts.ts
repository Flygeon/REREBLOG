/**
 * posts.ts —— 内容加载器（Vue 版，复刻原 Astro 内容集合）
 *
 * 原 Astro 用 `getCollection('posts')` 读 src/content/posts。
 * Vue 侧用 Vite 的 `import.meta.glob` 在构建期把全部 markdown 作为 raw 字符串
 * 打进 bundle（dev / SSG 均可用），再用自研 parseFrontmatter 解析 frontmatter
 * （不用 gray-matter：其内部依赖 Node Buffer，浏览器端会抛 ReferenceError）。
 */
import { parseFrontmatter } from "@lib/frontmatter";
import { Post, getSortedPosts, getTagList, getCategoryList } from "@utils/content-utils";
import { PAGE_SIZE } from "@constants/constants";

// eager 加载：构建期直接内联为字符串，避免运行时访问文件系统
const postFiles = import.meta.glob("../content/posts/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const specFiles = import.meta.glob("../content/spec/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

function slugFromPath(path: string): string {
	const file = path.split("/").pop() ?? "";
	return file.replace(/\.md$/, "");
}

/* ----------------------- 字数 / 阅读时间统计 ----------------------- */

/** 从 markdown 源剥离语法，提取纯文本（用于字数统计 / 摘要提取） */
export function mdToText(md: string): string {
	return md
		// 代码块：保留内容但去掉围栏标记（代码块也是可见内容，计入字数）
		.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, "$1")
		.replace(/`([^`]*)`/g, "$1") // 行内代码：保留内容
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接（保留文字）
		.replace(/^#{1,6}\s+/gm, "") // 标题标记
		.replace(/^\s*[-*+]\s+/gm, " ") // 无序列表
		.replace(/^\s*\d+\.\s+/gm, " ") // 有序列表
		.replace(/[*_~]/g, "") // 强调/删除线
		.replace(/<[^>]+>/g, " ") // HTML 标签
		.replace(/\|/g, " ") // 表格分隔
		.replace(/\s+/g, " ");
}

/**
 * 统计字数与阅读时间（中文感知）：
 *  - CJK 字符逐字计数，拉丁/数字按空白分词
 *  - 阅读时间按 200 字/分钟，最少 1 分钟
 */
function computeStats(body: string): { words: number; minutes: number } {
	const text = mdToText(body ?? "");
	const cjk =
		text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
	const latin = text
		.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	const words = cjk + latin;
	const minutes = Math.max(1, Math.round(words / 200));
	return { words, minutes };
}

function parsePosts(files: Record<string, string>): Post[] {
	const posts: Post[] = [];
	for (const [path, raw] of Object.entries(files)) {
		const { data, content } = parseFrontmatter(raw);
		posts.push({
			slug: slugFromPath(path),
			body: content,
			data: {
				title: (data.title as string) ?? slugFromPath(path),
				published: new Date((data.published as string) ?? Date.now()),
				updated: data.updated ? new Date(data.updated as string) : undefined,
				draft: (data.draft as boolean) ?? false,
				description: (data.description as string) ?? "",
				image: data.image as string | undefined,
				tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
				category: (data.category as string | null) ?? null,
				lang: data.lang as string | undefined,
				aigc: data.aigc as Post["data"]["aigc"],
				pinned: (data.pinned as boolean) ?? false,
			},
			stats: computeStats(content),
		});
	}
	return posts;
}

/** 排序后的全量文章（等价原 getCollection + getSortedPosts） */
export const allPosts: Post[] = getSortedPosts(parsePosts(postFiles));

export function getPostBody(slug: string): string | undefined {
	return allPosts.find((p) => p.slug === slug)?.body;
}

export interface SpecPage {
	slug: string;
	title: string;
	description: string;
	body: string;
}

function parseSpec(files: Record<string, string>): Record<string, SpecPage> {
	const map: Record<string, SpecPage> = {};
	for (const [path, raw] of Object.entries(files)) {
		const { data, content } = parseFrontmatter(raw);
		const slug = slugFromPath(path);
		map[slug] = {
			slug,
			title: (data.title as string) ?? slug,
			description: (data.description as string) ?? "",
			body: content,
		};
	}
	return map;
}

export const specPages: Record<string, SpecPage> = parseSpec(specFiles);

export function getSpec(slug: string): SpecPage | undefined {
	return specPages[slug];
}

/**
 * 生成全部需要预渲染的 URL（trailingSlash 由 SSG 脚本统一加 /index.html）。
 * 复刻原站静态路由：首页分页 / 文章 / 标签页 / 分类页 / 功能页。
 */
export function getPrerenderUrls(): string[] {
	const urls: string[] = ["/", "/archive", "/friends", "/about", "/bangumi", "/memos", "/search"];

	const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE));
	for (let p = 2; p <= totalPages; p++) urls.push(`/${p}`);

	for (const post of allPosts) urls.push(`/posts/${post.slug}`);

	for (const tag of getTagList(allPosts)) {
		urls.push(`/tags/${encodeURIComponent(tag.name)}`);
	}
	for (const cat of getCategoryList(allPosts)) {
		urls.push(`/categories/${encodeURIComponent(cat.name)}`);
	}
	return urls;
}
