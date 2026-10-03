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

// 是否走运行时渲染（dev 实时生效 / SSR 预渲染同管线）。
// 注意：该值决定是否把全部 markdown 源码打进 bundle —— 生产客户端为 false，
// Rollup 会据此摇掉下面的 eager glob，改用构建期生成的元数据索引。
const RUNTIME_RENDER = import.meta.env.DEV || import.meta.env.SSR;

// eager 加载：dev / SSR 直接把全部 markdown 作为字符串内联，供 markdown-it 渲染
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

// 生产客户端：构建期 render-content.mjs 生成的元数据索引（无正文）。
// 生产构建时文件存在，dev 下匹配为空对象，回退到运行时解析。
const postMetaModules = import.meta.glob("../generated/posts-meta.json", {
	eager: true,
	import: "default",
}) as Record<string, Record<string, PostMeta>>;
const postMeta = postMetaModules["../generated/posts-meta.json"];

// 搜索语料：懒加载（仅进入搜索页后触发），避免正文随首屏下发
const lazyPostFiles = import.meta.glob("../content/posts/*.md", {
	query: "?raw",
	import: "default",
}) as Record<string, () => Promise<string>>;

/** 构建期生成的单篇元数据（dates 为 ISO 字符串，纯 JSON 可序列化） */
interface PostMeta {
	title: string;
	published: string;
	updated?: string;
	draft?: boolean;
	description: string;
	image?: string;
	tags: string[];
	category?: string | null;
	lang?: string;
	aigc?: Post["data"]["aigc"];
	pinned?: boolean;
	words: number;
	minutes: number;
}

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

/** 生产客户端：用构建期元数据还原 Post（无正文） */
function parsePostsFromMeta(meta: Record<string, PostMeta>): Post[] {
	const posts: Post[] = [];
	for (const [slug, m] of Object.entries(meta)) {
		posts.push({
			slug,
			body: "",
			data: {
				title: m.title ?? slug,
				published: new Date(m.published),
				updated: m.updated ? new Date(m.updated) : undefined,
				draft: m.draft ?? false,
				description: m.description ?? "",
				image: m.image,
				tags: Array.isArray(m.tags) ? m.tags : [],
				category: m.category ?? null,
				lang: m.lang,
				aigc: m.aigc,
				pinned: m.pinned ?? false,
			},
			stats: { words: m.words ?? 0, minutes: m.minutes ?? 0 },
		});
	}
	return posts;
}

if (!RUNTIME_RENDER && !postMeta) {
	console.error(
		"[posts] 缺少构建期元数据 src/generated/posts-meta.json（请完整执行 build:ssg）",
	);
}

/** 排序后的全量文章（dev/SSR 运行时解析；生产客户端读构建期元数据） */
export const allPosts: Post[] = getSortedPosts(
	RUNTIME_RENDER ? parsePosts(postFiles) : parsePostsFromMeta(postMeta ?? {}),
);

export function getPostBody(slug: string): string | undefined {
	return allPosts.find((p) => p.slug === slug)?.body;
}

/**
 * 懒加载全部文章正文（仅搜索页使用）。
 * 正文以独立 chunk 形式按需加载，不会随首屏下发。
 */
export async function loadSearchCorpus(): Promise<Record<string, string>> {
	const out: Record<string, string> = {};
	await Promise.all(
		Object.entries(lazyPostFiles).map(async ([path, loader]) => {
			out[slugFromPath(path)] = (await loader()) as string;
		}),
	);
	return out;
}

/* ---------------- 构建期预渲染的正文 HTML ---------------- */
// scripts/render-content.mjs 在 build:ssg 时把每篇文章 / spec 页渲染好的
// HTML 写入 src/generated/（gitignore 的中间产物）。生产客户端按需懒加载
// 这些 JSON，从而把 markdown-it + shiki 从客户端 bundle 中完全移除；
// dev 与 SSG 侧不存在这些文件，仍走运行时渲染（同一套管线，输出一致）。
const postHtmlLoaders = import.meta.glob("../generated/posts/*.json", {
	import: "default",
}) as Record<string, () => Promise<{ html: string }>>;
const specHtmlLoaders = import.meta.glob("../generated/spec/*.json", {
	import: "default",
}) as Record<string, () => Promise<{ html: string }>>;

/**
 * 取文章正文 HTML。
 * - dev / SSR：运行时用 markdown-it + shiki 渲染（构建期分支会被
 *   静态替换 + tree-shaking，不污染客户端产物）
 * - 生产客户端：加载构建期预渲染的 JSON（每个 slug 一个懒 chunk）
 */
export async function getPostHtml(slug: string): Promise<string | undefined> {
	if (RUNTIME_RENDER) {
		const { renderMarkdown } = await import("./markdown");
		const body = getPostBody(slug);
		return body ? await renderMarkdown(body) : undefined;
	}
	const loader = postHtmlLoaders[`../generated/posts/${slug}.json`];
	if (!loader) {
		console.error(`[posts] 缺少预渲染产物 posts/${slug}.json（请完整执行 build:ssg）`);
		return undefined;
	}
	return (await loader()).html;
}

/** 取 spec 页（about / friends）正文 HTML，策略同 getPostHtml */
export async function getSpecHtml(slug: string): Promise<string | undefined> {
	if (RUNTIME_RENDER) {
		const spec = getSpec(slug);
		if (!spec) return undefined;
		const { renderMarkdown } = await import("./markdown");
		return renderMarkdown(spec.body);
	}
	const loader = specHtmlLoaders[`../generated/spec/${slug}.json`];
	return loader ? (await loader()).html : undefined;
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
	const urls: string[] = ["/", "/blog", "/friends", "/about", "/bangumi", "/memos", "/search"];

	const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE));
	for (let p = 2; p <= totalPages; p++) urls.push(`/blog/${p}`);

	for (const post of allPosts) urls.push(`/posts/${post.slug}`);

	for (const tag of getTagList(allPosts)) {
		urls.push(`/tags/${encodeURIComponent(tag.name)}`);
	}
	for (const cat of getCategoryList(allPosts)) {
		urls.push(`/categories/${encodeURIComponent(cat.name)}`);
	}
	return urls;
}
