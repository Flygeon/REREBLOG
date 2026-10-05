/**
 * ssg.mjs —— 基于 @vue/server-renderer 的静态预渲染。
 *
 * 流程：
 *  1. vite build 已产出 SPA 到 dist/（含 dist/index.html 模板 + assets）
 *  2. vite build --ssr 已产出 dist-ssr/entry-server.js
 *  3. 本脚本遍历 getPrerenderUrls() 的每个路由，renderToString 预渲染，
 *     套用 dist/index.html 模板（保留 head 资源 + 客户端脚本用于水合），
 *     输出 dist/<path>/index.html（trailingSlash：目录式 index.html，地址逐字节不变）
 *  4. 清理 dist-ssr
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const ssrEntry = path.join(root, "dist-ssr", "entry-server.js");

// 站点绝对地址：单一真源 site.meta.json（src/lib/head.ts、sitemap-rss.mjs 同源；
// 一致性由 scripts/check-site-meta.mjs 断言）
const siteMeta = JSON.parse(
	fs.readFileSync(path.join(root, "site.meta.json"), "utf8"),
);
const SITE_URL = siteMeta.siteUrl;
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon/favicon-light-192.png`;

function escapeAttr(s) {
	return escapeHtml(s).replace(/'/g, "&#39;");
}

/** 站内相对路径 / 图片路径 → 绝对 URL */
function absolute(u) {
	if (!u) return "";
	if (/^https?:\/\//.test(u)) return u;
	const p = u.startsWith("/") ? u : `/${u.replace(/^assets\//, "assets/")}`;
	return SITE_URL + p;
}

function normalizeImage(src) {
	if (!src) return "";
	if (/^https?:\/\//.test(src) || src.startsWith("/")) return src;
	return `/${src}`;
}

// 构建指纹（git 短 SHA）：注入每页 <meta name="build">，
// 供 CI 轮询线上页面判断 Workers 构建是否完成（如 IndexNow 推送前等待）
let buildId = "";
try {
	buildId = execSync("git rev-parse --short HEAD", { cwd: root })
		.toString()
		.trim();
} catch {
	// 无 git 环境（如某些 CI 浅克隆）则跳过指纹
}

/*
  首屏 LCP 图的 <link rel="preload">。

  背景：站点首屏的大图（Hero banner / 头像）都是 Vite 处理过的哈希资源，
  引用它们的却是 JS —— 浏览器必须先下载并执行 JS，才知道要取哪张图，
  于是图片被串行推迟了一整轮（首屏 LCP 直接吃这个亏）。

  这里在预渲染落盘前，按「页面 → 该页 LCP 图」的映射注入 preload，
  让 HTML 解析阶段就与 JS/CSS 并行发起图片请求。

  匹配方式：扫描 dist/assets 下带内容哈希的产物文件名。
  只给「该页真正的 LCP 元素」注入，不做全站无差别 preload ——
  否则会挤占首屏带宽、拖慢真正关键资源。
*/
function findHashedAsset(re) {
	let entries;
	try {
		entries = fs.readdirSync(path.join(distDir, "assets"));
	} catch {
		return "";
	}
	return entries.find((f) => re.test(f)) || "";
}

/** 页面 URL → 需要 preload 的图片资源（正则匹配带哈希产物名） */
function preloadImagesFor(routeUrl) {
	const rules = [];
	// 博客列表页：Hero banner 是 LCP 元素（fetchpriority="high"）
	if (routeUrl === "/blog" || /^\/blog\/\d+$/.test(routeUrl)) {
		rules.push(/^banner-.*\.webp$/);
	}
	// 门户首页：头像位于首屏折叠线内，且带 fetchpriority="high"
	if (routeUrl === "/") {
		rules.push(/^avatar-.*\.webp$/);
	}
	const links = [];
	for (const re of rules) {
		const file = findHashedAsset(re);
		if (!file) continue;
		const base = process.env.VITE_BASE || "/";
		const prefix = base.endsWith("/") ? base : base + "/";
		links.push(
			`<link rel="preload" as="image" href="${prefix}assets/${file}">`,
		);
	}
	// 去重：同一张图可能同时命中多条规则（当前规则集不会，但保持幂等更稳）
	return [...new Set(links)];
}

// Windows 下 ESM 动态 import 需要 file:// URL（ERR_UNSUPPORTED_ESM_URL_SCHEME）
const { render, getPrerenderUrls } = await import(pathToFileURL(ssrEntry).href);

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** URL → dist 内文件路径（目录式 index.html，保持 trailingSlash 语义） */
function outFilePath(url) {
	if (url === "/") return path.join(distDir, "index.html");
	const clean = decodeURIComponent(url.replace(/^\//, "")).replace(/\/+$/, "");
	return path.join(distDir, clean, "index.html");
}

function composeHtml(template, appHtml, head, routeUrl = "/") {
	let out = template;

	// 注入页面标题（替换模板已有的 <title>）
	if (head.title) {
		out = out.replace(
			/<title>[^<]*<\/title>/i,
			`<title>${escapeHtml(head.title)}</title>`,
		);
	}
	// 注入 meta + JSON-LD + Open Graph / Twitter Card
	const inject = [];
	if (head.description) {
		// 替换模板里已有的默认 description，避免出现重复 meta
		if (/<meta\s+name="description"[^>]*>/i.test(out)) {
			out = out.replace(
				/<meta\s+name="description"[^>]*>/i,
				`<meta name="description" content="${escapeHtml(head.description)}">`,
			);
		} else {
			inject.push(
				`<meta name="description" content="${escapeHtml(head.description)}">`,
			);
		}
	}

	// Open Graph / Twitter Card（分享预览）
	const ogTitle = head.title || "Flygeonの小站";
	const ogDesc = head.description || "";
	const ogUrl = absolute(head.url || routeUrl);
	const ogImage = absolute(normalizeImage(head.image)) || DEFAULT_OG_IMAGE;
	const ogType = head.type || "website";
	const ogTags = [
		`<meta property="og:type" content="${escapeAttr(ogType)}">`,
		`<meta property="og:site_name" content="Flygeonの小站">`,
		`<meta property="og:title" content="${escapeAttr(ogTitle)}">`,
		`<meta property="og:url" content="${escapeAttr(ogUrl)}">`,
		`<meta property="og:image" content="${escapeAttr(ogImage)}">`,
	];
	if (ogDesc) {
		ogTags.push(`<meta property="og:description" content="${escapeAttr(ogDesc)}">`);
	}
	ogTags.push(
		`<meta name="twitter:card" content="summary_large_image">`,
		`<meta name="twitter:title" content="${escapeAttr(ogTitle)}">`,
		`<meta name="twitter:image" content="${escapeAttr(ogImage)}">`,
	);
	if (ogDesc) {
		ogTags.push(`<meta name="twitter:description" content="${escapeAttr(ogDesc)}">`);
	}
	inject.push(...ogTags);

	// canonical 与 og:url 同源：所有页面都注入，消除重复内容歧义
	inject.push(
		`<link rel="canonical" href="${escapeAttr(absolute(head.url || routeUrl))}">`,
	);

	/*
	  RSS autodiscovery。
	  scripts/sitemap-rss.mjs 一直在产出 dist/rss.xml，但此前没有任何页面引用它，
	  浏览器/阅读器无法自动发现订阅源（robots.txt 里也只声明了 sitemap）。
	  这里给每一页注入 <link rel="alternate" type="application/rss+xml">，
	  订阅者从任意页面都能一键订阅。
	*/
	// RSS autodiscovery。
	inject.push(
		`<link rel="alternate" type="application/rss+xml" title="${escapeAttr(siteMeta.siteTitle)}" href="${escapeAttr(absolute("/rss.xml"))}">`,
	);

	// 首屏 LCP 图预加载（Hero banner / 头像）——与 JS/CSS 并行，缩短 LCP
	// 缩进与 Vite transformIndexHtml 注入的字体 preload 对齐，保持产物格式一致
	inject.push(...preloadImagesFor(routeUrl).map((l) => "  " + l));

	if (head.jsonLd) {
		inject.push(
			`<script type="application/ld+json">${JSON.stringify(head.jsonLd)}</script>`,
		);
	}
	if (inject.length) {
		out = out.replace("</head>", inject.join("\n") + "\n</head>");
	}
	// 构建指纹（版本追踪 / CI 部署完成检测）
	if (buildId) {
		out = out.replace(
			"</head>",
			`<meta name="build" content="${buildId}">\n</head>`,
		);
	}

	// 用预渲染内容替换 #app 内部
	out = out.replace(
		/<div id="app">[\s\S]*?<\/div>/,
		`<div id="app">${appHtml}</div>`,
	);
	return out;
}

async function main() {
	if (!fs.existsSync(ssrEntry)) {
		console.error("❌ 未找到 SSR 构建产物，请先执行 `vite build --ssr`");
		process.exit(1);
	}
	const template = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
	const urls = getPrerenderUrls();
	console.log(`🔄 预渲染 ${urls.length} 个路由...`);

	let ok = 0;
	for (const url of urls) {
		try {
			const { html, head } = await render(url);
			const file = outFilePath(url);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, composeHtml(template, html, head, url), "utf8");
			ok++;
		} catch (err) {
			console.error(`❌ 渲染失败 ${url}:`, err);
		}
	}
	console.log(`✅ 预渲染完成：${ok}/${urls.length}`);

	// 清理 SSR 临时产物（dist-ssr）
	// 注意：Node fs.rmSync 在 WorkBuddy 环境可能被 safe-delete shim 劫持而失败，
	// 残留 dist-ssr 无害（下次 SSR 构建会覆盖 entry-server.js），故失败仅警告不中断。
	try {
		fs.rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
	} catch (err) {
		console.warn("⚠️ 清理 dist-ssr 失败（可忽略）:", err?.message);
	}
}

main();