/**
 * head.ts —— 极简页面 head 管理（SSG 友好）。
 * 页面组件在 setup 中调用 setHead() 写入标题/描述/JSON-LD；
 * 客户端：直接反映到 document.title；
 * SSR：document 不存在，由 entry-server 在 renderToString 后读取并注入 HTML <head>。
 */
export interface HeadInfo {
	title?: string;
	description?: string;
	jsonLd?: object | object[];
	/** 分享缩略图：站内相对路径或完整 URL（SSG 会补成绝对地址） */
	image?: string;
	/** 页面规范地址（相对路径即可，SSG 补成绝对地址） */
	url?: string;
	/** og:type，文章页传 "article"，其余默认 "website" */
	type?: "website" | "article";
}

/*
  站点常量单一真源：根目录 site.meta.json。
  此前 SITE_URL / SITE_TITLE 在 head.ts、scripts/ssg.mjs、scripts/sitemap-rss.mjs
  各内联一份（注释还写着"保持一致"），改一处必漏两处。
  现在三处都读同一份清单，由 scripts/check-site-meta.mjs 断言一致。
*/
import siteMeta from "../../site.meta.json";

/** 站点绝对地址（sitemap / RSS / OG 共用） */
export const SITE_URL: string = siteMeta.siteUrl;

/** 全站标题后缀（各页面 title 以 | 拼接） */
export const SITE_TITLE: string = siteMeta.siteTitle;
/** 全站默认描述：页面未提供 description 时兜底（SEO 建议 60~160 字符） */
export const SITE_DESCRIPTION: string = siteMeta.siteDescription;

let current: HeadInfo = {};

export function setHead(info: HeadInfo): void {
	current = { ...current, ...info };
	if (typeof document !== "undefined" && info.title) {
		document.title = info.title;
	}
}

export function getHead(): HeadInfo {
	return current;
}

export function resetHead(): void {
	current = {};
}
