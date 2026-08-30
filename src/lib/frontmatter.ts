/**
 * frontmatter.ts —— 轻量 frontmatter 解析器（替代 gray-matter）
 *
 * 为什么不用 gray-matter：
 *   gray-matter 内部调用 Node 的 Buffer（gray-matter/lib/utils.js 的
 *   Buffer.from / Buffer.isBuffer），浏览器端没有 Buffer，导致
 *   `import.meta.glob eager` 打进客户端 bundle 后一执行就抛
 *   `ReferenceError: Buffer is not defined`，整个应用挂载失败。
 *
 * 本解析器只覆盖本站文章的 frontmatter 实际形态（经全量抽查）：
 *   - 标量：title / published / updated / description / category / draft /
 *           pinned / image / aigc / create
 *   - 行内数组：tags: [a, b, c]
 *   - 多行数组：tags:\n  - "a"\n  - b
 *   - 引号包裹的值（双引号/单引号，含转义）
 *   - 布尔 / 数字 / 日期字符串
 * 不依赖任何 Node API，SSR 与浏览器行为一致。
 */

export interface FrontmatterData {
	[key: string]: unknown;
}

export interface ParsedFrontmatter {
	data: FrontmatterData;
	content: string;
}

const DELIMITER = /^---$/;

/** 去掉引号包裹（含转义还原） */
function unquote(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.length >= 2) {
		const first = trimmed[0];
		const last = trimmed[trimmed.length - 1];
		if (
			(first === '"' && last === '"') ||
			(first === "'" && last === "'")
		) {
			const body = trimmed.slice(1, -1);
			if (first === '"') {
				return body
					.replace(/\\"/g, '"')
					.replace(/\\\\/g, "\\")
					.replace(/\\n/g, "\n")
					.replace(/\\t/g, "\t");
			}
			return body.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
		}
	}
	return trimmed;
}

/** 解析行内数组 [a, b, "c d"] */
function parseInlineArray(raw: string): string[] {
	const inner = raw.trim().replace(/^\[/, "").replace(/\]\s*$/, "");
	if (!inner.trim()) return [];
	const items: string[] = [];
	let current = "";
	let inQuote: '"' | "'" | null = null;
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (inQuote) {
			if (ch === "\\") {
				current += ch + (inner[i + 1] ?? "");
				i++;
			} else if (ch === inQuote) {
				inQuote = null;
			} else {
				current += ch;
			}
		} else if (ch === '"' || ch === "'") {
			inQuote = ch;
		} else if (ch === ",") {
			const item = unquote(current);
			if (item) items.push(item);
			current = "";
		} else {
			current += ch;
		}
	}
	const last = unquote(current);
	if (last) items.push(last);
	return items;
}

/** 解析标量值（布尔 / 数字 / null / 字符串） */
function parseScalar(raw: string): unknown {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (trimmed === "null" || trimmed === "~") return null;
	if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
	if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
	// 去掉尾部注释（YAML 内联注释，如 `key: value # comment`）
	const noComment = trimmed.replace(/\s+#.*$/, "");
	return unquote(noComment || trimmed);
}

/** 解析 frontmatter YAML 子集 */
function parseYaml(block: string): FrontmatterData {
	const data: FrontmatterData = {};
	// 兼容 CRLF（\r\n）文件：先统一去掉行尾 \r，避免 $ 锚点与 .* 匹配异常
	const lines = block.replace(/\r/g, "").split("\n");
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim() || line.trim().startsWith("#")) {
			i++;
			continue;
		}
		// 顶层键（不允许行首空格，除非是多行数组项——已在缩进块处理）
		const topMatch = line.match(/^([A-Za-z_][\w-]*)\s*:(.*)$/);
		if (!topMatch) {
			i++;
			continue;
		}
		const key = topMatch[1];
		const rest = topMatch[2];

		// 多行数组：`tags:` 后跟缩进的 `- item` 行
		if (rest.trim() === "" || rest.trim().startsWith("#")) {
			// 预判下一行是否数组项
			const next = lines[i + 1];
			if (next && /^\s+-\s/.test(next)) {
				const arr: string[] = [];
				let j = i + 1;
				while (j < lines.length && /^\s+-\s/.test(lines[j])) {
					arr.push(unquote(lines[j].replace(/^\s+-\s*/, "")));
					j++;
				}
				data[key] = arr;
				i = j;
				continue;
			}
			// 空值（如 `aigc:` 后无值）
			data[key] = null;
			i++;
			continue;
		}

		// 行内数组
		if (rest.trim().startsWith("[")) {
			data[key] = parseInlineArray(rest);
			i++;
			continue;
		}

		// 标量
		data[key] = parseScalar(rest);
		i++;
	}
	return data;
}

/**
 * 解析 markdown frontmatter。
 * - 有 `---` 包裹块：解析 data，剩余部分为 content
 * - 无 frontmatter：data 为空对象，全文为 content
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
	const normalized = raw.replace(/^\uFEFF/, ""); // 去 BOM
	const lines = normalized.split("\n");
	// 首行必须是 ---
	if (lines[0]?.trim() !== "---") {
		return { data: {}, content: normalized };
	}
	// 找闭合的 ---（从第二行开始）
	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (DELIMITER.test(lines[i].trim())) {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) {
		// 没有闭合分隔符：视为无 frontmatter
		return { data: {}, content: normalized };
	}
	const yamlBlock = lines.slice(1, endIndex).join("\n");
	const content = lines.slice(endIndex + 1).join("\n");
	return { data: parseYaml(yamlBlock), content };
}
