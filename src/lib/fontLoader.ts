// ============================================================
// Noto Sans SC 正文字体（自托管子集）—— 延迟加载器
//
// 为什么不用 CSS @font-face：
//   只要 @font-face 出现在样式表里，浏览器的 preload scanner 就会在解析 CSS 时
//   立刻发起字体请求 —— font-display 取 swap / optional / block 都一样（本地实测
//   三者均在 6-9ms 发起、传输 346KB）。font-display 只决定「下载好了怎么渲染」，
//   决定不了「要不要下载」。所以想让首屏真正零字体流量，唯一的办法是让 CSS 里
//   压根没有 @font-face，改由 JS 在 load 事件之后注入。
//
// 为什么选 ``load`` 而不是更早的时机：
//   load 代表首屏关键资源（HTML/CSS/JS/首屏图片）全部就绪。此刻再拉 354KB 字体
//   不会与它们抢带宽，也不会拖慢 LCP。
//
// 二次访问怎么做到无跳变：
//   首次加载成功后往 localStorage 写标记。下次打开页面时，本模块在 <head> 阶段
//   （模块被 import 时）同步插入一条 @font-face 规则 —— 此时字体已在 HTTP 缓存里，
//   浏览器会像正常的 CSS 声明一样在首帧就用上本站字体，没有 system → Noto 的切换。
//
//   注意：localStorage 只标记「曾经加载过」，不保证 HTTP 缓存仍然有效。若缓存已被
//   清理，浏览器会重新走网络 —— 由 @font-face 的 font-display: optional 兜底，
//   超过窗口就本次不替换，不会出现字形闪烁。
//
// 字体 URL 为什么用 ?url 导入而不是写死路径：
//   删除 CSS 引用后，构建图里再没别的东西指向这个 woff2，Vite 不会产出它。
//   用 `?url` 显式导入可以把资源重新拉回依赖图，同时拿到带内容哈希的正确文件名。
//
// 子集维护：新增正文若出现范围外的生僻字会回退到系统字体（不会显示成方框）。
//   重新生成步骤见 src/styles/_fonts.scss 头部注释。
// 许可：Noto Sans SC 由 Google 以 SIL Open Font License 1.1 发布
// https://fonts.google.com/noto/specimen/Noto+Sans+SC
// ============================================================

import fontUrl from "../assets/fonts/noto-sans-sc-subset.woff2?url";

const STORAGE_KEY = "rereblog:font-loaded";
const FONT_FAMILY = "Noto Sans SC";

/**
 * 命中标记的二次访问：同步插入 @font-face，让浏览器在首帧就用缓存里的本站字体。
 * 走 optional 兜底 —— 万一 HTTP 缓存已失效、网络跟不上，宁可本次继续用系统字体，
 * 也不要出现「先渲染再换字体」的闪烁。
 */
function injectCachedFace() {
	if (typeof document === "undefined") return;
	try {
		const css = [
			"@font-face{",
			`font-family:"${FONT_FAMILY}";`,
			"font-style:normal;",
			"font-weight:400 700;",
			"font-display:optional;",
			`src:url("${fontUrl}") format("woff2");`,
			"}",
		].join("");
		const style = document.createElement("style");
		style.dataset.fontLoader = "cached";
		style.textContent = css;
		document.head.appendChild(style);
	} catch {
		// localStorage 或 DOM 不可用时静默降级到系统字体
	}
}

/**
 * 首访（或缓存标记缺失）：等 load 之后再拉字体。
 * load 意味着首屏资源已全部落地，这时下载不会侵占关键路径带宽。
 */
function scheduleDelayedFace() {
	if (typeof window === "undefined") return;

	const start = (): void => {
		// FontFace API 不可用时直接放弃 —— 页面保持系统字体，不影响可用性
		if (typeof FontFace === "undefined") return;

		const face = new FontFace(FONT_FAMILY, `url("${fontUrl}") format("woff2")`, {
			weight: "400 700",
			display: "swap",
		});

		face
			.load()
			.then((loaded) => {
				document.fonts.add(loaded);
				try {
					localStorage.setItem(STORAGE_KEY, "1");
				} catch {
					// 隐私模式下写入会抛错，忽略即可：功能不依赖这个标记
				}
			})
			.catch(() => {
				// 网络失败：保持系统字体，下次再试
			});
	};

	if (document.readyState === "complete") {
		// 极端情况下 import 时 load 已触发（如 SPA 软导航到本模块），尽快起步
		start();
	} else {
		window.addEventListener("load", start, { once: true });
	}
}

/** 是否已有可用的缓存标记（用于决定是否同步注入） */
function hasCachedMark(): boolean {
	if (typeof localStorage === "undefined") return false;
	try {
		return localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export function initFontLoader(): void {
	if (hasCachedMark()) {
		injectCachedFace();
		return;
	}
	scheduleDelayedFace();
}
