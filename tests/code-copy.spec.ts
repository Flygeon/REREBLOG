import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * code-copy.spec.ts —— 代码块「复制」按钮的行为回归。
 *
 * 这是一个纯客户端增强（按钮由 src/lib/code-copy.ts 在挂载后插入），
 * 所以它不在 a11y 扫描的覆盖范围内 —— 没有这条测试，
 * "按钮没挂上 / 点了没反应 / 复制空内容" 只会在用户那里被发现。
 *
 * 依赖构建产物：先从 dist 里挑一个确实含代码块的文章，避免硬编码 slug 后
 * 文章被删/改名导致测试无意义地通过。
 */
const DIST = path.resolve(process.cwd(), "dist");

/** 找出第一个含 shiki 代码块的已预渲染文章 */
function findPostWithCode(): string | null {
	const postsDir = path.join(DIST, "posts");
	if (!fs.existsSync(postsDir)) return null;
	for (const name of fs.readdirSync(postsDir).sort()) {
		const file = path.join(postsDir, name, "index.html");
		if (!fs.existsSync(file)) continue;
		if (fs.readFileSync(file, "utf8").includes('class="shiki')) {
			return `/posts/${name}/`;
		}
	}
	return null;
}

test.describe("代码块复制", () => {
	test("按钮挂载、可复制、有状态反馈", async ({ page, context }) => {
		if (!fs.existsSync(DIST)) {
			throw new Error("未找到 dist/：请先执行 pnpm build");
		}
		const route = findPostWithCode();
		test.skip(route === null, "当前没有含代码块的文章，跳过");

		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.route("**/*", (r) => {
			const u = r.request().url();
			return u.startsWith("http://127.0.0.1") || u.startsWith("data:")
				? r.continue()
				: r.abort();
		});
		await page.goto(route!, { waitUntil: "load" });
		await page.waitForTimeout(1600);

		// 每个代码块都应有按钮（数量 1:1）
		const preCount = await page.locator(".markdown-body pre").count();
		await expect(page.locator(".code-copy")).toHaveCount(preCount);
		expect(preCount).toBeGreaterThan(0);

		const btn = page.locator(".code-copy").first();
		const pre = page.locator(".markdown-body pre").first();

		// 默认不遮挡内容：未 hover 时透明
		expect(await btn.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");

		// hover 后浮现
		await pre.hover();
		await page.waitForTimeout(300);
		expect(await btn.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");

		// 点击复制：图标切到 check，aria-label 变为"已复制"
		await btn.click();
		await page.waitForTimeout(250);
		await expect(btn.locator(".code-copy__icon")).toHaveText("check");

		// 剪贴板确实拿到了该代码块的文本
		const expected = await pre.locator("code").textContent();
		const clip = await page.evaluate(() => navigator.clipboard.readText());
		expect(clip.length).toBeGreaterThan(0);
		expect(clip).toBe(expected);

		// 反馈会复位
		await page.waitForTimeout(1800);
		await expect(btn.locator(".code-copy__icon")).toHaveText("content_copy");
	});

	test("键盘可聚焦并触发", async ({ page, context }) => {
		if (!fs.existsSync(DIST)) throw new Error("未找到 dist/：请先执行 pnpm build");
		const route = findPostWithCode();
		test.skip(route === null, "当前没有含代码块的文章，跳过");

		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.route("**/*", (r) => {
			const u = r.request().url();
			return u.startsWith("http://127.0.0.1") || u.startsWith("data:")
				? r.continue()
				: r.abort();
		});
		await page.goto(route!, { waitUntil: "load" });
		await page.waitForTimeout(1600);

		const btn = page.locator(".code-copy").first();
		await btn.focus();
		/*
		  等 opacity 过渡跑完再断言：opacity 有 200ms transition，
		  聚焦瞬间 getComputedStyle 拿到的是过渡中的中间值（实测 0）。
		  这里用 expect.poll 等待最终态，而不是写死一个 sleep。
		*/
		await expect
			.poll(() => btn.evaluate((el) => getComputedStyle(el).opacity), {
				message: "聚焦后按钮应可见（键盘用户要能看到焦点位置）",
			})
			.toBe("1");
		await page.keyboard.press("Enter");
		await page.waitForTimeout(250);
		await expect(btn.locator(".code-copy__icon")).toHaveText("check");
	});
});