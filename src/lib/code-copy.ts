/**
 * code-copy.ts —— 代码块「一键复制」按钮的客户端增强。
 *
 * 与 github-card.ts / mermaid-view.ts 同一套 hydration 思路：
 * 正文经 v-html 注入，内联 <script> 在 SPA 路由切换后不会执行，
 * 所以统一在正文挂载后（flush: "post"）扫描 DOM 补挂交互。
 *
 * 几个刻意的取舍：
 *  - **不写进 SSG 产物**：按钮由客户端插入，预渲染 HTML 保持干净，
 *    无 JS 时读者照样能选中复制（渐进增强）；
 *  - **幂等**：正文可能因路由切换重复 hydrate，用 data 标记跳过已处理块；
 *  - **复制成功才提示**：navigator.clipboard 在非 HTTPS / 旧内核不可用，
 *    失败时回退到选中文本并提示手动复制，不假装成功；
 *  - 图标用 Material Symbols ligature（content_copy / check），与全站一致。
 */

/** 已处理标记 */
const DONE_ATTR = "data-copy-enhanced";
/** 成功后提示复位延时（ms） */
const RESET_DELAY = 1600;

/** 按钮 DOM 结构：图标 + 无障碍标签 */
function createButton(): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "code-copy";
	btn.setAttribute("aria-label", COPY_LABEL);
	btn.title = COPY_LABEL;

	const icon = document.createElement("span");
	icon.className = "material-symbols-rounded code-copy__icon";
	icon.setAttribute("aria-hidden", "true");
	icon.textContent = "content_copy";
	btn.appendChild(icon);
	return btn;
}

/** 可复制的纯文本：取 <code> 的 textContent（shiki 高亮只改 span，不改文本） */
function codeTextOf(pre: HTMLElement): string {
	const code = pre.querySelector("code");
	return (code ?? pre).textContent ?? "";
}

/** 复制到剪贴板，返回是否成功 */
async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		/* 继续走回退 */
	}
	// 回退：选中文本，由用户自行 Ctrl/Cmd+C
	try {
		const range = document.createRange();
		const selection = window.getSelection();
		const code = document.querySelector("code");
		if (!selection || !code) return false;
		range.selectNodeContents(code);
		selection.removeAllRanges();
		selection.addRange(range);
		return false;
	} catch {
		return false;
	}
}

/** 复制按钮的可见文案（由调用方按语言传入，避免这里再引一份 i18n 依赖） */
let COPY_LABEL = "Copy code";
let COPIED_LABEL = "Copied";
let FAILED_LABEL = "Press Ctrl+C to copy";

/** 允许 Post.vue 注入已翻译的文案 */
export function setCodeCopyLabels(labels: {
	copy: string;
	copied: string;
	failed: string;
}): void {
	COPY_LABEL = labels.copy;
	COPIED_LABEL = labels.copied;
	FAILED_LABEL = labels.failed;
}

function flash(btn: HTMLButtonElement, icon: string, label: string): void {
	const iconEl = btn.querySelector(".code-copy__icon");
	if (iconEl) iconEl.textContent = icon;
	btn.setAttribute("aria-label", label);
	btn.title = label;
	btn.classList.toggle("code-copy--done", icon === "check");
	setTimeout(() => {
		if (iconEl) iconEl.textContent = "content_copy";
		btn.setAttribute("aria-label", COPY_LABEL);
		btn.title = COPY_LABEL;
		btn.classList.remove("code-copy--done");
	}, RESET_DELAY);
}

/**
 * 给页面内所有代码块挂复制按钮（幂等）。
 * @param scope 限定范围，默认整个文档（Post 页正文容器更精确）
 */
export function hydrateCodeCopy(scope: ParentNode = document): void {
	const pres = scope.querySelectorAll<HTMLElement>("pre.shiki, .markdown-body > pre");
	for (const pre of pres) {
		// mermaid 的 <pre> 不是代码块，跳过
		if (pre.classList.contains("mermaid")) continue;
		if (pre.getAttribute(DONE_ATTR) === "1") continue;
		// 已有按钮（重复 hydrate）也跳过
		if (pre.querySelector(":scope > .code-copy")) continue;
		pre.setAttribute(DONE_ATTR, "1");

		const btn = createButton();
		btn.addEventListener("click", async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const ok = await copyText(codeTextOf(pre));
			if (ok) flash(btn, "check", COPIED_LABEL);
			else flash(btn, "content_copy", FAILED_LABEL);
		});
		pre.appendChild(btn);
	}
}
