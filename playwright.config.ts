import { defineConfig, devices } from "@playwright/test";

/**
 * playwright.config.ts —— 只用 Chromium（无跨浏览器矩阵需求），复用已安装的浏览器。
 *
 * 与 Shirone 的做法一致的两点：
 *  - workers: 1 —— 站点有第三方请求（Bangumi / GitHub），并发会互相干扰并放大超时；
 *  - 由 webServer 自动拉起 preview，CI 与本地命令完全一致。
 *
 * 注意本仓库的浏览器缓存是共享的（/root/.cache/ms-playwright），
 * 容器内以 root 运行必须带 --no-sandbox。
 */
export default defineConfig({
	testDir: "./tests",
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	timeout: 30_000,
	expect: { timeout: 10_000 },

	use: {
		// 构建产物目录用 python http.server 提供，端口固定便于脚本复用
		baseURL: process.env.BASE_URL || "http://127.0.0.1:8099",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},

	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
			},
		},
	],

	/*
	  默认复用已经起好的静态服务（pnpm preview 或 python http.server）。
	  设 PW_NO_WEBSERVER=1 可跳过自动启动，便于在已手工起服务时对接。
	*/
	webServer: process.env.PW_NO_WEBSERVER
		? undefined
		: {
				command: "node scripts/preview.mjs",
				url: "http://127.0.0.1:8099/",
				reuseExistingServer: true,
				timeout: 60_000,
			},
});
