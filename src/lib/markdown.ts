/**
 * markdown.ts —— Markdown 渲染管线（Vue 版）
 *
 * 复刻原 Astro 站的 Markdown 能力（Expressive Code 高亮 + rehype admonition / github-card 指令）：
 *  1. 代码高亮：shiki（双主题，随 data-theme 切换明/暗）
 *  2. :::tip / :::note / :::important / :::caution / :::warning  —— 提示块（blockquote.admonition）
 *  3. ::github{repo="owner/repo"}  —— GitHub 仓库卡片（运行时 fetch api.github.com）
 *  4. $...$ / $$...$$ / ```math —— KaTeX 数学公式（构建期/运行时同步渲染，无客户端依赖）
 *  5. ```mermaid —— Mermaid 图表（构建期仅输出 <pre class="mermaid"> 源码，
 *     由客户端 mermaid-view.ts 按需 import() mermaid 再渲染）
 *
 * 与 Astro 不同：markdown-it 是同步渲染，shiki 高亮器在首次调用前异步预热，
 * 之后 highlight 回调同步使用已加载的高亮器。
 */
import MarkdownIt from "markdown-it";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import texmath from "markdown-it-texmath";
import katex from "katex";

const MD_THEME_LIGHT = "github-light";
const MD_THEME_DARK = "github-dark";

// 按需加载语法：只用这些语言。
// 不用 `shiki` 全量入口（会把 600+ 语言全拉进依赖图，构建慢、预渲染内存高）；
// plaintext / txt / text / plain 由 core 内置处理，无需语法文件。
let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter(): Promise<HighlighterCore> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighterCore({
			themes: [
				import("shiki/themes/github-light.mjs"),
				import("shiki/themes/github-dark.mjs"),
			],
			langs: [
				import("shiki/langs/javascript.mjs"),
				import("shiki/langs/typescript.mjs"),
				import("shiki/langs/bash.mjs"),
				import("shiki/langs/json.mjs"),
				import("shiki/langs/html.mjs"),
				import("shiki/langs/css.mjs"),
				import("shiki/langs/scss.mjs"),
				import("shiki/langs/markdown.mjs"),
				import("shiki/langs/vue.mjs"),
				import("shiki/langs/python.mjs"),
				import("shiki/langs/xml.mjs"),
				import("shiki/langs/yaml.mjs"),
				import("shiki/langs/sql.mjs"),
			],
			engine: createOnigurumaEngine(import("shiki/wasm")),
		});
	}
	return highlighterPromise;
}

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	breaks: false,
})
	// KaTeX 数学：仅启用 dollars（$...$ / $$...$$）与 math 围栏。
	// 不启用 brackets(\(...\)) / beg_end，避免与正文里的普通括号、LaTeX 环境
	// 混排产生误匹配。throwOnError 置 false —— 公式写错时 KaTeX 会渲染成红字
	// 而不是抛异常中断整篇渲染。
	.use(texmath, {
		engine: katex,
		delimiters: "dollars",
		katexOptions: { throwOnError: false },
	})
	.use(directivePlugin);

/* --------------------- 围栏块：Mermaid / Math --------------------- */
// 默认 fence 规则（内部会读取 options.highlight，即上面的 shiki 回调）。
// 这里只在 info 命中 mermaid / math 时接管，其余语言原样交回，避免影响 shiki。
const defaultFence = md.renderer.rules.fence!;

md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
	const token = tokens[idx];
	const lang = (token.info || "").trim().split(/\s+/)[0].toLowerCase();

	// ```mermaid —— 构建期只输出源码骨架，由客户端 mermaid-view.ts 按需渲染。
	// 用 <pre> 保留源码中的换行/缩进，textContent 即完整的 mermaid 定义。
	if (lang === "mermaid") {
		return '<pre class="mermaid">' + escapeHtml(token.content) + "</pre>\n";
	}

	// ```math / ```latex / ```tex —— 围栏形式的块级公式，交给 KaTeX。
	if (lang === "math" || lang === "latex" || lang === "tex") {
		const html = katex.renderToString(token.content.trim(), {
			displayMode: true,
			throwOnError: false,
		});
		return '<div class="math-display">' + html + "</div>\n";
	}

	const html = defaultFence(tokens, idx, options, env, self);

	/*
	  代码块可访问性（axe scrollable-region-focusable）：
	  <pre> 是横向滚动容器（长行不换行），但可滚动区域必须能键盘聚焦 ——
	  Firefox/Chromium 只让可聚焦元素响应方向键。
	  原先 overflow-x 同时挂在 <code> 上，滚动条落在 <code> 里、焦点却无处可去；
	  这里统一让 <pre> 当唯一的滚动容器（见 _markdown.scss），并给它 tabindex/role/aria-label。
	*/
	return html.replace(
		/^<pre\b/,
		'<pre tabindex="0" role="group" aria-label="代码块，可横向滚动"',
	);
};

/* ------------------------- 标题 anchor 支持 ------------------------- */
// 为 h1-h4 生成 slug id（供阅读目录 TOC 锚点跳转）。
// 中文 slug：保留中文字符，去除标点空格；重复标题追加 -2/-3…
const headingIds = new Map<string, number>();

function slugify(text: string): string {
	const base = text
		.trim()
		.toLowerCase()
		// 中文/字母/数字/连字符保留，其余（标点空格等）转 -
		.replace(/[\s，。！？、：；（）《》「」“”‘’·,.!?;:'"()\[\]{}\/\\@#$%^&*+=_~`|<>]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		|| "section";
	// 重复处理
	const count = headingIds.get(base) ?? 0;
	headingIds.set(base, count + 1);
	return count > 0 ? `${base}-${count + 1}` : base;
}

md.renderer.rules.heading_open = (tokens, idx) => {
	const token = tokens[idx];
	const inline = tokens[idx + 1];
	// 提取标题纯文本（去掉行内标记）
	const text = inline && inline.children
		? inline.children.filter((c) => c.type === "text" || c.type === "code_inline").map((c) => c.content).join("")
		: "";
	const id = slugify(text || "section");
	const level = Number(token.tag.slice(1));
	const className = level >= 4 ? ` class="toc-heading toc-heading--h${level}"` : ` class="toc-heading"`;
	return `<h${level}${className} id="${id}">`;
};

/** shiki 高亮器就绪后挂到 markdown-it 的 highlight 回调（同步） */
async function ensureHighlight() {
	const highlighter = await getHighlighter();
	md.set({
		highlight: (code: string, lang: string) => {
			try {
				return highlighter.codeToHtml(code, {
					lang: lang || "plaintext",
					themes: { light: MD_THEME_LIGHT, dark: MD_THEME_DARK },
					defaultColor: false,
				});
			} catch {
				return "";
			}
		},
	});
}

/* ----------------------------- 指令插件 ----------------------------- */

/**
 * 复刻 Fuwari 的 containerDirective(:::) / leafDirective(::)：
 *  - :::type{name="X"} ... :::  → <blockquote class="admonition bdm-type"><span class="bdm-title">…</span>内容
 *  - ::github{repo="owner/repo"} → GitHub 卡片（含运行时 fetch 脚本）
 * 在预处理阶段把指令块转换为 HTML，内部正文递归用 md.render 渲染。
 */
function directivePlugin(parser: MarkdownIt) {
	const originalRender = parser.render.bind(parser);
	parser.render = (src: string, env?: any) => {
		// 每次渲染重置标题 id 计数器（避免跨文章累计）
		headingIds.clear();
		// 先展开块级指令（:::容器 / ::github 叶子），再展开行内文本指令
		// （:spoiler[~~text~~]），最后交给 markdown-it 渲染
		return originalRender(expandInlineDirectives(expandDirectives(src)), env);
	};
}

function parseAttrs(raw: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([\w-]+)\s*=\s*"([^"]*)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(raw))) out[m[1]] = m[2];
	return out;
}

function expandDirectives(src: string): string {
	const lines = src.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		// 容器指令 :::name{attrs}
		const open = line.match(/^:::([a-zA-Z]+)(?:\s*\{([^}]*)\})?\s*$/);
		if (open) {
			const name = open[1];
			const attrs = parseAttrs(open[2] ?? "");
			let j = i + 1;
			while (j < lines.length && !/^:::\s*$/.test(lines[j])) j++;
			const inner = lines.slice(i + 1, j).join("\n");
			const innerHtml = md.render(inner); // 递归渲染内部（已是同步）
			const title = attrs["name"] ? attrs["name"] : name.toUpperCase();
			out.push(
				`<blockquote class="admonition bdm-${name}">` +
					`<span class="bdm-title">${escapeHtml(title)}</span>` +
					innerHtml +
					`</blockquote>`,
			);
			i = j + 1;
			continue;
		}

		// 叶子指令 ::name{attrs}（非 ::: 三冒号）
		const leaf = line.match(/^::([a-zA-Z]+)(?:\s*\{([^}]*)\})?\s*$/);
		if (leaf && line.startsWith("::") && !line.startsWith(":::")) {
			const name = leaf[1];
			const attrs = parseAttrs(leaf[2] ?? "");
			if (name === "github" && attrs["repo"]) {
				out.push(renderGithubCard(attrs["repo"]));
			}
			i++;
			continue;
		}

		out.push(line);
		i++;
	}
	return out.join("\n");
}

/**
 * 行内文本指令 :name[content] → <name>content</name>
 * 复刻 remark-directive 的 textDirective（如 :spoiler[~~text~~]）。
 * 在 expandDirectives 输出的每一行上应用（容器内部的内容经 md.render 递归
 * 渲染，同样会经过这里）。
 */
function expandInlineDirectives(src: string): string {
	return src.replace(
		/:([a-zA-Z]+)\[([^\]]*)\]/g,
		(_m, name: string, content: string) => {
			const inner = md.renderInline(content); // ~~text~~ → <s>text</s>
			return `<${name}>${inner}</${name}>`;
		},
	);
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * 复刻 rehype-component-github-card：输出卡片骨架 + repo 属性，
 * 具体数据由客户端 `hydrateGithubCards()` 拉取填充。
 *
 * 注意：不再内联 <script>。正文经 v-html 注入，SPA 导航时注入的 script
 * 不会执行（原实现因此在站内跳转时永远卡在 Waiting）；统一交给 hydration。
 */
function renderGithubCard(repo: string): string {
	if (!repo.includes("/")) return "";
	const [owner, name] = repo.split("/");
	return `
<a class="card-github fetch-waiting no-styling" href="https://github.com/${repo}" target="_blank" rel="noopener" repo="${repo}">
  <div class="gc-titlebar">
    <div class="gc-titlebar-left">
      <div class="gc-owner"><div class="gc-avatar"></div><div class="gc-user">${escapeHtml(owner)}</div></div>
      <div class="gc-divider">/</div>
      <div class="gc-repo">${escapeHtml(name)}</div>
    </div>
    <div class="github-logo"></div>
  </div>
  <div class="gc-description">Waiting for api.github.com...</div>
  <div class="gc-infobar">
    <span class="gc-stars">00K</span>
    <span class="gc-forks">0K</span>
    <span class="gc-license">0K</span>
    <span class="gc-language">Waiting...</span>
  </div>
</a>`;
}

/* ----------------------------- 对外 API ----------------------------- */

/** 渲染整篇 markdown 为 HTML（异步：确保 shiki 高亮器就绪） */
export async function renderMarkdown(raw: string): Promise<string> {
	await ensureHighlight();
	return md.render(raw ?? "");
}

/** 仅渲染（同步，假设高亮器已就绪；dev 首屏前 ensureHighlight 已被调用过） */
export function renderMarkdownSync(raw: string): string {
	return md.render(raw ?? "");
}

/** SSG 启动时预热高亮器，避免首屏闪烁 */
export function prewarmMarkdown(): Promise<void> {
	return ensureHighlight().then(() => undefined);
}
