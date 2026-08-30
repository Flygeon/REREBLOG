import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils";

/**
 * 博客文章数据模型（Vue 版）。
 * 由内容加载器（见 src/lib/posts.ts）从 src/content/posts/*.md 读取后注入。
 * 该文件只包含与框架无关的纯逻辑（排序/推荐/统计），复刻原 Astro 版 content-utils.ts。
 */

export type Post = {
	slug: string;
	/** 文章正文（frontmatter 已剥离），由内容加载器回填，供 Markdown 渲染使用 */
	body?: string;
	data: {
		title: string;
		published: Date;
		updated?: Date;
		draft?: boolean;
		description: string;
		image?: string;
		tags: string[];
		category?: string | null;
		lang?: string;
		aigc?: "assisted" | "ai" | "human";
		pinned?: boolean;
		prevTitle?: string;
		prevSlug?: string;
		nextTitle?: string;
		nextSlug?: string;
	};
	/** 统计字段（由 remark 插件计算后回填） */
	stats?: { words?: number; minutes?: number };
};

/** 生产环境过滤草稿；开发环境保留 */
const shouldInclude = (post: Post): boolean =>
	import.meta.env.PROD ? post.data.draft !== true : true;

/** 排序：置顶优先，其次日期倒序 */
export function getSortedPosts(posts: Post[]): Post[] {
	const sorted = posts
		.filter(shouldInclude)
		.slice()
		.sort((a, b) => {
			const pinnedA = a.data.pinned === true;
			const pinnedB = b.data.pinned === true;
			if (pinnedA !== pinnedB) return pinnedA ? -1 : 1;
			const dateA = new Date(a.data.published);
			const dateB = new Date(b.data.published);
			return dateA > dateB ? -1 : 1;
		});

	// 填充上下篇
	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}

/** 相关文章推荐 */
export function getRecommendedPosts(
	currentPost: Post,
	posts: Post[],
	limit = 3,
): Post[] {
	const currentTags = new Set(
		currentPost.data.tags.map((tag) => tag.trim().toLowerCase()),
	);
	const currentCategory =
		currentPost.data.category?.trim().toLowerCase() ?? null;
	const now = Date.now();

	return posts
		.filter((post) => post.slug !== currentPost.slug && post.data.draft !== true)
		.map((post) => {
			const sharedTags = post.data.tags.filter((tag) =>
				currentTags.has(tag.trim().toLowerCase()),
			).length;
			const sameCategory =
				currentCategory !== null &&
				post.data.category?.trim().toLowerCase() === currentCategory;
			const ageInDays = Math.max(
				0,
				(now - new Date(post.data.published).getTime()) / 86400000,
			);
			const freshness = 30 * Math.exp((-Math.LN2 * ageInDays) / 180);
			const score = sharedTags * 24 + (sameCategory ? 12 : 0) + freshness;

			return { post, score, sharedTags };
		})
		.sort(
			(a, b) =>
				b.score - a.score ||
				new Date(b.post.data.published).getTime() -
					new Date(a.post.data.published).getTime(),
		)
		.sort((a, b) => Number(b.sharedTags > 0) - Number(a.sharedTags > 0))
		.slice(0, limit)
		.map(({ post }) => post);
}

/** 随机文章（基于 slug 的确定性种子） */
export function getRandomPosts(
	currentPost: Post,
	posts: Post[],
	excludedPosts: Post[] = [],
	limit = 5,
): Post[] {
	const excluded = new Set([
		currentPost.slug,
		...excludedPosts.map((post) => post.slug),
	]);
	let seed = Array.from(currentPost.slug).reduce(
		(value, character) => value * 31 + character.charCodeAt(0),
		7,
	);

	return posts
		.filter((post) => !excluded.has(post.slug) && post.data.draft !== true)
		.map((post) => {
			seed = (seed * 9301 + 49297) % 233280;
			return { post, order: seed / 233280 };
		})
		.sort((a, b) => a.order - b.order)
		.slice(0, limit)
		.map(({ post }) => post);
}

export type Tag = { name: string; count: number };

export function getTagList(posts: Post[]): Tag[] {
	const countMap: { [key: string]: number } = {};
	posts.filter(shouldInclude).forEach((post) => {
		post.data.tags.forEach((tag) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});
	const keys = Object.keys(countMap).sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase()),
	);
	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = { name: string; count: number; url: string };

export function getCategoryList(posts: Post[]): Category[] {
	const count: { [key: string]: number } = {};
	posts.filter(shouldInclude).forEach((post) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}
		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();
		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase()),
	);
	return lst.map((c) => ({ name: c, count: count[c], url: getCategoryUrl(c) }));
}

export type ActivityDay = { date: string; count: number; titles: string[] };

export type SiteStatistics = {
	postCount: number;
	categoryCount: number;
	tagCount: number;
	totalWords: number;
	firstPublishedAt: Date | null;
	lastActivityAt: Date | null;
	categoryDetails: Category[];
	tagDetails: Tag[];
	activity: ActivityDay[];
};

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function getSiteStatistics(posts: Post[]): SiteStatistics {
	const activityMap = new Map<string, ActivityDay>();
	let totalWords = 0;
	let firstPublishedAt: Date | null = null;
	let lastActivityAt: Date | null = null;

	for (const post of posts.filter(shouldInclude)) {
		totalWords += Number(post.stats?.words ?? 0);
		const publishedAt = new Date(post.data.published);
		const updatedAt = post.data.updated ? new Date(post.data.updated) : null;
		if (!firstPublishedAt || publishedAt < firstPublishedAt)
			firstPublishedAt = publishedAt;
		const activityDates = [publishedAt, ...(updatedAt ? [updatedAt] : [])];
		for (const date of activityDates) {
			const key = dateKey(date);
			const day = activityMap.get(key) ?? { date: key, count: 0, titles: [] };
			if (!day.titles.includes(post.data.title)) {
				day.count += 1;
				day.titles.push(post.data.title);
			}
			activityMap.set(key, day);
		}
		if (!lastActivityAt || publishedAt > lastActivityAt)
			lastActivityAt = publishedAt;
		if (updatedAt && updatedAt > lastActivityAt) lastActivityAt = updatedAt;
	}

	const categoryDetails = getCategoryList(posts);
	const tagDetails = getTagList(posts);
	const today = new Date();
	const start = new Date(today);
	start.setDate(today.getDate() - 364);
	const activity: ActivityDay[] = [];
	for (let date = new Date(start); date <= today; date.setDate(date.getDate() + 1)) {
		const key = dateKey(date);
		activity.push(activityMap.get(key) ?? { date: key, count: 0, titles: [] });
	}

	return {
		postCount: posts.filter(shouldInclude).length,
		categoryCount: categoryDetails.length,
		tagCount: tagDetails.length,
		totalWords,
		firstPublishedAt,
		lastActivityAt,
		categoryDetails,
		tagDetails,
		activity,
	};
}
