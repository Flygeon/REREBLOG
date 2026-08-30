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

function composeHtml(template, appHtml, head) {
	let out = template;

	// 注入页面标题（替换模板已有的 <title>）
	if (head.title) {
		out = out.replace(
			/<title>[^<]*<\/title>/i,
			`<title>${escapeHtml(head.title)}</title>`,
		);
	}
	// 注入 meta + JSON-LD
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
			fs.writeFileSync(file, composeHtml(template, html, head), "utf8");
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
