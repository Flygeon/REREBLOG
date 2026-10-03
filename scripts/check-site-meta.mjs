/**
 * check-site-meta.mjs —— 断言站点常量只有一个真源。
 *
 * 背景：SITE_URL / SITE_TITLE / PAGE_SIZE 曾在三处各写一份
 * （src/lib/head.ts、scripts/ssg.mjs、scripts/sitemap-rss.mjs），
 * 靠注释"保持一致"约束；改一处必漏两处，且没有任何机制会发现。
 *
 * 本脚本做两件事：
 *  1. 断言 site.meta.json 结构完整、取值合法；
 *  2. 扫描上述三个消费方，确认它们都从 site.meta.json 读取，
 *     且不再出现硬编码的站点地址/标题/分页常量。
 *
 * 用法：node scripts/check-site-meta.mjs   （失败 exit 1）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = path.join(root, "site.meta.json");
const errors = [];

/* ---------- 1. 清单自身合法性 ---------- */
if (!fs.existsSync(metaPath)) {
	errors.push(`缺少 site.meta.json（站点常量单一真源）`);
} else {
	let meta;
	try {
		meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
	} catch (e) {
		errors.push(`site.meta.json 不是合法 JSON：${e.message}`);
	}
	if (meta) {
		const required = {
			siteUrl: "string",
			siteTitle: "string",
			siteSubtitle: "string",
			siteDescription: "string",
			lang: "string",
			pageSize: "number",
		};
		for (const [key, type] of Object.entries(required)) {
			if (typeof meta[key] !== type) {
				errors.push(`site.meta.json 字段 ${key} 缺失或类型不是 ${type}`);
			}
		}
		if (typeof meta.siteUrl === "string" && !/^https:\/\/[^/]+$/.test(meta.siteUrl)) {
			errors.push(`siteUrl 必须是形如 https://host 的绝对地址（不含结尾斜杠），当前：${meta.siteUrl}`);
		}
		if (typeof meta.pageSize === "number" && (!Number.isInteger(meta.pageSize) || meta.pageSize < 1)) {
			errors.push(`pageSize 必须是正整数，当前：${meta.pageSize}`);
		}
	}
}

/* ---------- 2. 消费方必须同源，且不得再硬编码 ---------- */
const consumers = [
	{
		file: "src/lib/head.ts",
		mustMatch: [/site\.meta\.json/, /siteMeta\.siteUrl/],
		// 硬编码站点地址即违规（渲染层不该再出现字面量域名）
		forbidden: [/["'`]https:\/\/flygeon\.top["'`]/],
	},
	{
		file: "scripts/ssg.mjs",
		mustMatch: [/site\.meta\.json/, /siteMeta\.siteUrl/],
		forbidden: [/["'`]https:\/\/flygeon\.top["'`]/],
	},
	{
		file: "scripts/sitemap-rss.mjs",
		mustMatch: [/site\.meta\.json/, /siteMeta\.siteUrl/, /siteMeta\.pageSize/],
		forbidden: [
			/["'`]https:\/\/flygeon\.top["'`]/,
			/^const PAGE_SIZE = \d+;/m,
		],
	},
	{
		file: "src/constants/constants.ts",
		mustMatch: [/site\.meta\.json/, /siteMeta\.pageSize/],
		forbidden: [/^export const PAGE_SIZE = \d+;/m],
	},
];

for (const { file, mustMatch, forbidden } of consumers) {
	const full = path.join(root, file);
	if (!fs.existsSync(full)) {
		errors.push(`消费方文件不存在：${file}`);
		continue;
	}
	const src = fs.readFileSync(full, "utf8");
	for (const re of mustMatch) {
		if (!re.test(src)) {
			errors.push(`${file} 未从 site.meta.json 读取（缺少匹配 ${re}）`);
		}
	}
	for (const re of forbidden) {
		const m = src.match(re);
		if (m) {
			errors.push(`${file} 仍存在硬编码站点常量：${m[0].trim()}`);
		}
	}
}

/* ---------- 3. 路由清单：router.ts 与预渲染列表必须覆盖同一组静态路由 ---------- */
if (errors.length === 0) {
	console.log("✅ 站点常量单一真源校验通过（site.meta.json）");
	process.exit(0);
}
console.error("❌ 站点常量校验失败：");
for (const e of errors) console.error("   - " + e);
process.exit(1);
