/**
 * markdown.ts —— Markdown 渲染管线（Vue 版）
 *
 * 复刻原 Astro 站的 Markdown 能力（Expressive Code 高亮 + rehype admonition / github-card 指令）：
 *  1. 代码高亮：shiki（双主题，随 data-theme 切换明/暗）
 *  2. :::tip / :::note / :::important / :::caution / :::warning  —— 提示块（blockquote.admonition）
 *  3. ::github{repo="owner/repo"}  —— GitHub 仓库卡片（运行时 fetch api.github.com）
 *
 * 与 Astro 不同：markdown-it 是同步渲染，shiki 高亮器在首次调用前异步预热，
 * 之后 highlight 回调同步使用已加载的高亮器。
 */
import MarkdownIt from "markdown-it";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

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
}).use(directivePlugin);

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

/** 复刻 rehype-component-github-card：运行时向 api.github.com 拉取仓库信息 */
function renderGithubCard(repo: string): string {
	if (!repo.includes("/")) return "";
	const uuid = "GC" + Math.random().toString(36).slice(-6);
	return `
<a id="${uuid}-card" class="card-github fetch-waiting no-styling" href="https://github.com/${repo}" target="_blank" repo="${repo}">
  <div class="gc-titlebar">
    <div class="gc-titlebar-left">
      <div class="gc-owner"><div class="gc-avatar"></div><div class="gc-user">${repo.split("/")[0]}</div></div>
      <div class="gc-divider">/</div>
      <div class="gc-repo">${repo.split("/")[1]}</div>
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
  <script type="text/javascript" defer>
    fetch('https://api.github.com/repos/${repo}', { referrerPolicy: "no-referrer" })
      .then(r => r.json()).then(data => {
        document.getElementById('${uuid}-description').innerText = data.description?.replace(/:[a-zA-Z0-9_]+:/g, '') || "Description not set";
        document.getElementById('${uuid}-language').innerText = data.language;
        document.getElementById('${uuid}-forks').innerText = Intl.NumberFormat('en-us', { notation: "compact", maximumFractionDigits: 1 }).format(data.forks).replaceAll(" ", '');
        document.getElementById('${uuid}-stars').innerText = Intl.NumberFormat('en-us', { notation: "compact", maximumFractionDigits: 1 }).format(data.stargazers_count).replaceAll(" ", '');
        const avatarEl = document.getElementById('${uuid}-avatar');
        if (avatarEl) { avatarEl.style.backgroundImage = 'url(' + data.owner.avatar_url + ')'; avatarEl.style.backgroundColor = 'transparent'; }
        document.getElementById('${uuid}-license').innerText = data.license?.spdx_id || "no-license";
        document.getElementById('${uuid}-card').classList.remove("fetch-waiting");
      }).catch(() => { document.getElementById('${uuid}-card')?.classList.add("fetch-error"); });
  </script>
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
