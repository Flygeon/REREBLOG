/**
 * sitemap-rss.mjs —— 生成 sitemap.xml 与 rss.xml（复刻原 Astro 站）。
 *
 * 依赖：由 scripts/ssg.mjs 预渲染完成后调用。
 * 数据源：直接扫描 src/content/posts/*.md（Node fs + gray-matter），
 *         不经过 Vite，保证脚本可独立运行。
 *
 * 输出（写入 dist/，地址与原站一致）：
 *  - /sitemap.xml
 *  - /rss.xml
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const postsDir = path.join(root, "src", "content", "posts");

// 与原 config.ts 保持一致（这里无法 import TS，故内联关键常量）
const SITE_URL = "https://flygeon.top"; // 部署域名
const PAGE_SIZE = 8; // 与原 constants.ts 保持一致
const SITE_TITLE = "Flygeonの小站";
const SITE_SUBTITLE = "Flygeonの小站";
const SITE_LANG = "zh_CN";

const staticPaths = ["/about/", "/archive/", "/bangumi/", "/friends/"];

const escapeXml = (value) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");

function stripInvalidXmlChars(str) {
	return str.replace(
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

function loadPosts() {
	if (!fs.existsSync(postsDir)) return [];
	const files = fs
		.readdirSync(postsDir)
		.filter((f) => f.endsWith(".md"))
		.sort();
	const posts = [];
	for (const file of files) {
		const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
		const { data, content } = matter(raw);
		const slug = file.replace(/\.md$/, "");
		if (data.draft) continue;
		posts.push({
			slug,
			body: content,
			title: data.title ?? slug,
			published: data.published ? new Date(data.published) : new Date(),
			updated: data.updated ? new Date(data.updated) : undefined,
			description: data.description ?? "",
		});
	}
	// 按 published 倒序
	posts.sort((a, b) => b.published.getTime() - a.published.getTime());
	return posts;
}

function ensureDist() {
	if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
}

function writeSitemap(posts) {
	const urls = staticPaths.map((pathname) => ({
		loc: SITE_URL + pathname,
	}));

	for (const post of posts) {
		urls.push({
			loc: `${SITE_URL}/posts/${post.slug}/`,
			lastmod: post.updated ?? post.published,
		});
	}

	for (let offset = 0; offset < posts.length; offset += PAGE_SIZE) {
		const pageNumber = offset / PAGE_SIZE + 1;
		const pagePosts = posts.slice(offset, offset + PAGE_SIZE);
		const lastmod = new Date(
			Math.max(
				...pagePosts.map((p) =>
					(p.updated ?? p.published).getTime(),
				),
			),
		);
		urls.push({
			loc: SITE_URL + (pageNumber === 1 ? "/" : `/${pageNumber}/`),
			lastmod,
		});
	}

	const entries = urls
		.map(
			({ loc, lastmod }) =>
				`<url><loc>${escapeXml(loc)}</loc>${
					lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""
				}</url>`,
		)
		.join("");

	const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
	fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf8");
	console.log(`✅ 已生成 sitemap.xml（${urls.length} 个 URL）`);
}

function writeRss(posts) {
	const parser = new MarkdownIt();
	const items = posts
		.map((post) => {
			const content = stripInvalidXmlChars(post.body || "");
			const description = post.description
				? `<description><![CDATA[${post.description}]]></description>`
				: "";
			const contentHtml = sanitizeHtml(parser.render(content), {
				allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
			});
			return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${SITE_URL}/posts/${post.slug}/</link>
  <guid isPermaLink="true">${SITE_URL}/posts/${post.slug}/</guid>
  <pubDate>${post.published.toUTCString()}</pubDate>
  ${description}
  <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
</item>`;
		})
		.join("\n  ");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_SUBTITLE || "No description")}</description>
    <language>${escapeXml(SITE_LANG)}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
	fs.writeFileSync(path.join(distDir, "rss.xml"), xml, "utf8");
	console.log(`✅ 已生成 rss.xml（${posts.length} 篇文章）`);
}

function main() {
	ensureDist();
	const posts = loadPosts();
	if (posts.length === 0) {
		console.warn("⚠️ 未扫描到文章（posts 目录为空或不存在）");
	}
	writeSitemap(posts);
	writeRss(posts);
}

main();
