/**
 * check-routes.mjs —— 断言"路由三处真相"一致。
 *
 * 本站存在三份互相独立的路由声明，任何一处漏改都会静默出问题：
 *   1. src/router.ts          —— vue-router 路由表（页面可达性的唯一依据）
 *   2. src/lib/posts.ts 的 getPrerenderUrls() —— SSG 预渲染的 URL 列表
 *   3. 磁盘上的 src/pages/*.vue —— 路由实际引用的组件文件
 *
 * 纯文本解析，不引入 Vite / TS 运行时，可在 CI 里裸跑：
 *   1. 从 router.ts 抽出 path 与 import("@/pages/X.vue") 配对；
 *   2. 断言每个被引用的组件文件真实存在；
 *   3. 断言每个静态路由都出现在预渲染列表里（漏预渲染 → 线上 404）；
 *   4. 断言没有"孤儿页面"（pages/ 下有文件但没有任何路由引用）。
 *
 * 用法：node scripts/check-routes.mjs   （失败 exit 1）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/* ---------- 1. router.ts：逐行解析 path 与 component ---------- */
// 路由对象既有单行写法（{ path: "/", name: "home", component: () => import(...) }）
// 也有多行写法，所以按行扫描：遇到 path 就开一条新记录，
// 同一行或后续行里出现的 component import 归属该记录，直到下一个 path 为止。
const routerLines = read("src/router.ts").split(/\r?\n/);
const routes = [];
let current = null;
for (const line of routerLines) {
	const pathMatch = line.match(/path:\s*"([^"]+)"/);
	if (pathMatch) {
		current = { path: pathMatch[1], component: null, isRedirect: false };
		routes.push(current);
	}
	if (!current) continue;
	const compMatch = line.match(/import\("@\/pages\/([^"]+)\.vue"\)/);
	if (compMatch && !current.component) {
		current.component = "src/pages/" + compMatch[1] + ".vue";
	}
	if (/redirect:/.test(line)) current.isRedirect = true;
}

if (routes.length === 0) {
	errors.push("未能从 src/router.ts 解析出任何路由（解析规则可能已失效）");
}

/* ---------- 2. 组件文件必须存在 ---------- */
for (const r of routes) {
	if (!r.component) {
		if (!r.isRedirect) errors.push("路由 " + r.path + " 既没有 component 也不是 redirect");
		continue;
	}
	if (!fs.existsSync(path.join(root, r.component))) {
		errors.push("路由 " + r.path + " 引用的组件不存在：" + r.component);
	}
}

/* ---------- 3. 静态路由必须在预渲染列表里 ---------- */
const postsSrc = read("src/lib/posts.ts");
const prerenderLiteral = postsSrc.match(/const urls: string\[\] = \[([^\]]+)\]/);
if (!prerenderLiteral) {
	errors.push("未能在 src/lib/posts.ts 的 getPrerenderUrls() 中找到静态 URL 字面量数组");
} else {
	const prerendered = prerenderLiteral[1]
		.split(",")
		.map((s) => s.trim().replace(/^["'\`]|["'\`]$/g, ""))
		.filter(Boolean);

	const staticRoutes = routes.filter(
		(r) => !r.path.includes(":") && !r.path.includes("*") && !r.isRedirect,
	);
	for (const r of staticRoutes) {
		if (!prerendered.includes(r.path)) {
			errors.push(
				"静态路由 " + r.path + " 未出现在 getPrerenderUrls() 的预渲染列表中（线上会 404）",
			);
		}
	}

	// 反向：预渲染列表里不应有路由表覆盖不到的地址。
	// 动态段需要先把 vue-router 的 ":name(regex)" 归一成 ":name"，
	// 否则 /blog/:page(\d+) 这种写法无法匹配 /blog/2。
	const routerPaths = routes.map((r) => r.path);
	const toRegex = (p) =>
		new RegExp(
			"^" +
				p
					.replace(/:[A-Za-z_$][\w$]*\([^)]*\)/g, ":__PARAM__")
					.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
					.replace(/:__PARAM__/g, "[^/]+") +
				"$",
		);
	for (const url of prerendered) {
		const matched = routerPaths.some((p) => toRegex(p).test(url));
		if (!matched) {
			errors.push("getPrerenderUrls() 预渲染了路由表中不存在的地址：" + url);
		}
	}
}

/* ---------- 4. 孤儿页面 ---------- */
const pagesDir = path.join(root, "src/pages");
const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".vue")).sort();
const referenced = new Set(
	routes.map((r) => r.component).filter(Boolean).map((c) => path.basename(c)),
);
for (const file of pageFiles) {
	if (!referenced.has(file)) {
		errors.push("孤儿页面：src/pages/" + file + " 没有被 src/router.ts 的任何路由引用");
	}
}

/* ---------- 结果 ---------- */
if (errors.length === 0) {
	console.log(
		"✅ 路由校验通过：" + routes.length + " 条路由，" + pageFiles.length +
		" 个页面组件，预渲染列表一致",
	);
	process.exit(0);
}
console.error("❌ 路由校验失败：");
for (const e of errors) console.error("   - " + e);
process.exit(1);
