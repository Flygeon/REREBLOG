import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { zh_CN } from "./languages/zh_CN";

export type Translation = {
	[K in I18nKey]: string;
};

/*
  词典的「构建期按需保留」。

  背景：站点是**单语种**部署 —— 语言由 siteConfig.lang 构建期固定（本站 zh_CN），
  运行时不会切换语言。此前这里静态 import 全部 10 个词典并塞进一个运行时 map，
  结果 10 种语言全部打进首屏主包；其余 9 种对本站读者是纯死代码。

  为什么不能只写 `const map = { en, zh_CN, ... }`：
  Rollup 的 tree-shaking 只看「模块是否被引用」，而对象字面量里出现的每个标识符
  都是引用 —— 整张 map 会被完整保留，瘦身效果为零（实测改造前后主包均为 449KB）。

  真正有效的做法：只静态 import 当前语言这一份词典。
  未 import 的词典模块不进入依赖图，Rollup 直接摇掉，产物里不含其任何字符串。

  ⚠️ 若将来要支持多语言 / 运行时切换，需把对应词典重新 import 进来，
  并改回「语言代码 → 词典」的查表（那时词典无法再靠本机制瘦身）。
*/
const activeTranslation: Translation = zh_CN as Translation;

export function getTranslation(_lang?: string): Translation {
	return activeTranslation;
}

export function i18n(key: I18nKey): string {
	return activeTranslation[key];
}

/**
 * 带占位符的翻译。
 *
 * 约定：占位符在**所有语种里保持同名同集合**（如 {count} / {query}），
 * 由 scripts/check-i18n.mjs 断言，替换在消费侧完成。
 * 缺失的占位符保留原样（而不是替换成 undefined），方便一眼看出漏配。
 *
 * @example i18nFormat(I18nKey.searchFound, { count: 12 })
 */
export function i18nFormat(
	key: I18nKey,
	params: Record<string, string | number>,
): string {
	return i18n(key).replace(/\{(\w+)\}/g, (raw, name: string) =>
		name in params ? String(params[name]) : raw,
	);
}
