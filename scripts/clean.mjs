/**
 * clean.mjs —— 构建前清理产物目录
 *
 * 背景：vite 的 emptyOutDir 被关掉（历史原因：safe-delete shim 在 Windows 下
 * 递归删除 dist 会超时），于是 dist/ 会累积历次构建的旧产物。实测累积到
 * 390 个 JS / 21MB，而 `wrangler deploy` 会把 dist 整个上传 —— 等于每次部署
 * 都在上传历次构建留下的垃圾文件。
 *
 * 本脚本在构建开始时清掉 dist 与 dist-ssr：先走 rmSync 快路径，失败则降级为
 * 逐层 unlink + rmdir（绕开对 fs.rmSync 的劫持）。仍失败则中止构建，避免
 * 半清理状态被部署出去。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = ["dist", "dist-ssr"];

function rmrf(dir) {
	// 快路径：递归删除
	try {
		fs.rmSync(dir, { recursive: true, force: true });
	} catch {
		/* 落到兜底逻辑 */
	}
	if (!fs.existsSync(dir)) return true;

	// 兜底：逐层 unlink + rmdir
	try {
		for (const name of fs.readdirSync(dir)) {
			const p = path.join(dir, name);
			const stat = fs.lstatSync(p);
			if (stat.isDirectory()) rmrf(p);
			else fs.unlinkSync(p);
		}
		fs.rmdirSync(dir);
	} catch (err) {
		console.warn(`⚠️ 删除失败 ${dir}:`, err?.message);
	}
	return !fs.existsSync(dir);
}

let failed = false;
for (const target of targets) {
	const dir = path.join(root, target);
	if (!fs.existsSync(dir)) continue;
	if (rmrf(dir)) {
		console.log(`🧹 已清理 ${target}/`);
	} else {
		console.error(
			`❌ ${target}/ 清理失败，请手动删除后重新构建（残留的旧产物会被一起部署）`,
		);
		failed = true;
	}
}

if (failed) process.exit(1);
