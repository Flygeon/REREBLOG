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
}

/** 全站标题后缀（各页面 title 以 | 拼接） */
export const SITE_TITLE = "Flygeonの小站";
/** 全站默认描述：页面未提供 description 时兜底（SEO 建议 60~160 字符） */
export const SITE_DESCRIPTION =
	"Flygeon の个人博客：分享 Web 开发与自建项目（Vue 3 自建 SSG 博客、Cloudflare Workers 动态服务），也记录 Bangumi 追番、设计与日常碎碎念。";

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
