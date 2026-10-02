/**
 * mermaid-view.ts —— Mermaid 图表的客户端按需渲染。
 *
 * 构建期 markdown.ts 只把 ```mermaid 围栏输出成
 * `<pre class="mermaid">源码</pre>`（不含已渲染 SVG），这里在正文挂载后
 * 动态 import("mermaid") 再原地渲染。这么做有两个原因：
 *  1. mermaid 运行时约 500KB+，只有页面确实含图表时才下载（无图表则不 import）；
 *  2. 与 github-card.ts 同一套 hydration 思路 —— 正文经 v-html 注入，
 *     内联 <script> 在 SPA 路由切换后不会执行，统一交给挂载后处理。
 *
 * 主题：mermaid 的主题在 initialize() 时固定，而本站用 html[data-theme]
 * 运行时切换。因此切换主题时先 resetMermaid() 丢弃已渲染图表，
 * 再用新主题重渲染（见 main.ts 的监听）。
 */

/** 已渲染标记：值记录渲染时所用主题 */
const RENDERED_ATTR = "data-mermaid-rendered";
/** 源码备份属性：mermaid 会把 <pre> 内容替换成 SVG，重渲染前需要还原 */
const SOURCE_ATTR = "data-mermaid-source";

type MermaidApi = (typeof import("mermaid"))["default"];
/** mermaid 内置主题名（与 MermaidConfig["theme"] 对齐，避免用宽 string） */
type MermaidTheme = "default" | "dark";

let mermaidPromise: Promise<MermaidApi> | null = null;
/** 当前已 initialize 的主题，变更时才重新 initialize */
let initializedTheme: MermaidTheme | null = null;

function currentThemeName(): MermaidTheme {
	if (typeof document === "undefined") return "default";
	return document.documentElement.getAttribute("data-theme") === "dark"
		? "dark"
		: "default";
}

async function getMermaid(theme: MermaidTheme): Promise<MermaidApi> {
	if (!mermaidPromise) {
		mermaidPromise = import("mermaid").then((m) => m.default);
	}
	const mermaid = await mermaidPromise;
	if (initializedTheme !== theme) {
		mermaid.initialize({
			startOnLoad: false,
			// 亮色用 default、暗色用 dark；图表配色跟随站点主题切换
			theme,
			// 图表定义按不可信内容处理：strict 会过滤标签内的 HTML/脚本，
			// 避免在图表里注入可执行代码
			securityLevel: "strict",
			fontFamily: "inherit",
		});
		initializedTheme = theme;
	}
	return mermaid;
}

/**
 * 渲染 root 内所有尚未渲染的 Mermaid 图表。
 * 无图表时直接返回，不会触发 mermaid 下载（幂等，可重复调用）。
 */
export async function hydrateMermaid(
	root: ParentNode | null = typeof document !== "undefined" ? document : null,
): Promise<void> {
	if (!root) return;
	const selector = "pre.mermaid:not([" + RENDERED_ATTR + "])";
	const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
	if (!nodes.length) return;

	const theme = currentThemeName();
	// 先备份源码：渲染成功后 <pre> 的内文会被替换成 SVG
	for (const node of nodes) {
		node.setAttribute(SOURCE_ATTR, node.textContent ?? "");
	}

	const mermaid = await getMermaid(theme);
	try {
		await mermaid.run({ nodes, suppressErrors: true });
	} catch {
		// suppressErrors 已尽量兜底；仍失败时下方会标记为 mermaid-error
	}

	for (const node of nodes) {
		if (node.querySelector("svg")) {
			node.setAttribute(RENDERED_ATTR, theme);
		} else {
			// 渲染失败：保留源码可读，加类名供样式给出提示（不让图表凭空消失）
			node.classList.add("mermaid-error");
			node.setAttribute(RENDERED_ATTR, theme);
		}
	}
}

/** 丢弃已渲染图表并还原源码，供主题切换后重渲染 */
export function resetMermaid(
	root: ParentNode | null = typeof document !== "undefined" ? document : null,
): void {
	if (!root) return;
	const selector = "pre.mermaid[" + RENDERED_ATTR + "]";
	root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
		node.textContent = node.getAttribute(SOURCE_ATTR) ?? "";
		node.removeAttribute(RENDERED_ATTR);
		node.classList.remove("mermaid-error");
		// mermaid 渲染后会打上 data-processed，重渲染前必须清掉
		node.removeAttribute("data-processed");
	});
	// mermaid 会在 <body> 追加临时测量容器/提示层，主题切换后一并清理
	if (typeof document !== "undefined") {
		document
			.querySelectorAll('[id^="dmermaid-"], .mermaidTooltip, #mermaid-tooltip')
			.forEach((el) => el.remove());
	}
}
