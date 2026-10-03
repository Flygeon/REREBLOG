import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * a11y.spec.ts —— 真实构建产物的无障碍回归（axe-core，WCAG 2.1 AA + best-practice）。
 *
 * 这是本项目此前完全缺失的一层：改完样式/结构只靠截图肉眼看，
 * 而颜色对比度、标题层级、列表语义这类问题在截图里根本看不出来。
 *
 * 三个关键细节（照搬 Shirone 的 a11y.spec.ts 经验）：
 *  1. **明暗双跑** —— 同一页面在 light / dark 下分别扫描，
 *     对比度违规往往只在其中一个主题出现；
 *  2. **先断言主题真的生效** —— 否则"扫了浅色却以为扫了深色"会假通过；
 *  3. **等动画收敛再扫** —— 站点有 v-reveal 入场动画，动画中间态的
 *     透明度会让对比度检查得到假阳性/假阴性。
 *
 * 路由清单来自构建产物（dist 下每个 index.html），无需手工维护。
 */

const DIST = path.resolve(process.cwd(), "dist");

/**
 * 从构建产物里发现所有已预渲染的页面，避免测试清单与站点脱节。
 *
 * 若 dist 不存在，说明还没构建（或正被别的进程清理），
 * 这里给出明确指引，而不是抛一个看不懂的 ENOENT。
 */
function discoverRoutes() {
	if (!fs.existsSync(DIST)) {
		throw new Error(
			"未找到 dist/：请先执行 pnpm build（本测试跑的是构建产物，不是 dev server）",
		);
	}
	const routes = ["/"];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				// 跳过资源目录
				if (["assets", ".vite", "pagefind"].includes(entry.name)) continue;
				if (fs.existsSync(path.join(full, "index.html"))) {
					const rel = path.relative(DIST, full).split(path.sep).join("/");
					routes.push("/" + rel + "/");
				}
				walk(full);
			}
		}
	};
	walk(DIST);
	return routes.sort();
}

/** 只挑代表性的几条跑全量扫描，其余抽样，控制 CI 时长 */
const ALL = discoverRoutes();
const CORE = ["/", "/blog/", "/about/", "/friends/", "/search/", "/bangumi/", "/memos/"];
/*
  抽样文章，排除 markdown-test：那是刻意塞满边界用例的测试夹具
  （XSS 载荷 <img onerror>、空链接、无 title 的 iframe、空表头等），
  扫它只会得到一堆"故意的"违规，掩盖真实回归。
*/
const SAMPLE = ALL.filter(
	(r) => r.startsWith("/posts/") && r !== "/posts/markdown-test/",
).slice(0, 3);
const TAXONOMY = ALL.filter((r) => r.startsWith("/tags/") || r.startsWith("/categories/")).slice(0, 2);
const ROUTES = [...new Set([...CORE, ...SAMPLE, ...TAXONOMY])].filter((r) => ALL.includes(r));

/** 站点会请求第三方（Bangumi / GitHub / 天气），测试里一律阻断，保证确定性 */
async function blockExternal(page) {
	await page.route("**/*", (route) => {
		const url = route.request().url();
		if (url.startsWith("http://127.0.0.1") || url.startsWith("data:")) {
			return route.continue();
		}
		return route.abort();
	});
}

/** 等入场动画收敛：站点用 v-reveal 给区块加入场，动画中的 opacity 会干扰对比度判定 */
async function waitForSettled(page) {
	await page.waitForLoadState("load");
	await page.waitForTimeout(400);
	/*
	  把所有仍在做动画的元素推进到终态。
	  注意：无限循环动画（如骨架屏的 pulse）无法 finish()，会抛 InvalidStateError，
	  因此只对有限时长的动画收尾，无限动画直接取消——两者都不会干扰对比度判定。
	*/
	await page.evaluate(() => {
		for (const el of document.querySelectorAll("*")) {
			for (const a of el.getAnimations?.() ?? []) {
				try {
					if (a.effect?.getComputedTiming().iterations === Infinity) a.cancel();
					else a.finish();
				} catch {
					/* 动画可能已在收尾，忽略 */
				}
			}
		}
	});
	await page.waitForTimeout(150);
}

for (const theme of ["light", "dark"] as const) {
	test.describe(`无障碍 · ${theme}`, () => {
		for (const route of ROUTES) {
			test(`${route} 无 axe 违规`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: theme });
				await page.addInitScript((t) => {
					try {
						localStorage.setItem("theme", t);
					} catch {
						/* 忽略 */
					}
				}, theme);
				await blockExternal(page);
				await page.goto(route, { waitUntil: "load" });
				await waitForSettled(page);

				// 2. 断言主题真的生效，防"扫了浅色却以为扫了深色"的假通过
				const applied = await page.evaluate(() =>
					document.documentElement.getAttribute("data-theme"),
				);
				expect(applied, `${route} 期望 ${theme} 主题，实际 ${applied}`).toBe(theme);

				const results = await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
					.analyze();

				// 违规信息带上节点摘要，失败时不用再手工复现
				const summary = results.violations.map((v) => ({
					id: v.id,
					impact: v.impact,
					nodes: v.nodes.length,
					help: v.help,
					sample: v.nodes[0]?.html?.slice(0, 160),
				}));
				expect(summary, `${route} (${theme}) axe 违规`).toEqual([]);
			});
		}
	});
}