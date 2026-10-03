/**
 * preview.mjs —— 以静态文件方式托管构建产物（dist/），供 Playwright / 手工验收使用。
 *
 * 为什么不用 vite preview：本站是自建 SSG，产物是 dist/<path>/index.html 的目录式结构，
 * 需要 trailingSlash 语义（/blog/ 命中 dist/blog/index.html）。这里用 Node 内置 http
 * 提供等价行为，零额外依赖，且能在 CI 里裸跑。
 *
 * 用法：node scripts/preview.mjs [port]   （默认 8099）
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const port = Number(process.argv[2] || process.env.PORT || 8099);

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".xml": "application/xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
};

if (!fs.existsSync(distDir)) {
	console.error("❌ 未找到 dist/，请先执行 pnpm build");
	process.exit(1);
}

/** URL 路径 -> 磁盘文件（目录式 index.html，复刻线上 trailingSlash 行为） */
function resolveFile(urlPath) {
	const clean = decodeURIComponent(urlPath.split("?")[0]);
	const candidates = [
		path.join(distDir, clean, "index.html"),
		path.join(distDir, clean),
	];
	for (const c of candidates) {
		// 防目录穿越：解析后必须仍在 dist 内
		const resolved = path.resolve(c);
		if (!resolved.startsWith(distDir)) continue;
		if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
	}
	return null;
}

const server = http.createServer((req, res) => {
	const file = resolveFile(req.url || "/");
	if (!file) {
		// SPA/404 兜底：返回站点的 404 页，状态码保持 404 便于断言
		const notFound = path.join(distDir, "404.html");
		if (fs.existsSync(notFound)) {
			res.writeHead(404, { "Content-Type": MIME[".html"] });
			res.end(fs.readFileSync(notFound));
			return;
		}
		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Not Found");
		return;
	}
	const ext = path.extname(file).toLowerCase();
	res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
	res.end(fs.readFileSync(file));
});

server.listen(port, "127.0.0.1", () => {
	console.log(`preview: http://127.0.0.1:${port}/  (dist/)`);
});
