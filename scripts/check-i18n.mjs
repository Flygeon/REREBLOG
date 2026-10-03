/**
 * check-i18n.mjs —— 校验 10 个语种词典与 Key 枚举完全对齐。
 *
 * 背景：translation.ts 用映射类型 Translation = { [K in I18nKey]: string }
 * 让"漏译"在 vue-tsc 阶段就报错——这是最好的一道网。但它盖不住两件事：
 *   1. 词典里多写了枚举中不存在的 key（TS 也会报，但报在语言文件里，容易被忽略）；
 *   2. 参数化文案（如 "找到 {count} 篇文章"）在不同语种里占位符集合不一致，
 *      运行时查表成功、替换却漏掉，表现为界面上直接显示 "{count}"。
 * 本脚本用纯文本解析把这两条也锁死，且不依赖 tsc，CI 里可单独跑。
 *
 * 用法：node scripts/check-i18n.mjs   （失败 exit 1）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i18nDir = path.join(root, "src/i18n");
const langDir = path.join(i18nDir, "languages");
const errors = [];

/* ---------- 1. Key 枚举 ---------- */
const keySrc = fs.readFileSync(path.join(i18nDir, "i18nKey.ts"), "utf8");
const enumKeys = [...keySrc.matchAll(/^\s*(\w+) = "\1",$/gm)].map((m) => m[1]);
if (enumKeys.length === 0) errors.push("未能从 i18nKey.ts 解析出任何 key");
const enumSet = new Set(enumKeys);
const dupInEnum = enumKeys.filter((k, i) => enumKeys.indexOf(k) !== i);
if (dupInEnum.length) errors.push("i18nKey.ts 存在重复 key：" + [...new Set(dupInEnum)].join(", "));

/* ---------- 2. 每个语种 ---------- */
const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".ts")).sort();
if (files.length === 0) errors.push("src/i18n/languages 下没有语种文件");

/** 从语种文件里抽出 [Key.xxx]: "..." 的 key 与值 */
function parseLocale(src) {
  const entries = [];
  const re = /\[Key\.(\w+)\]:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) entries.push({ key: m[1], value: m[2] });
  return entries;
}

/** 提取 {placeholder} 集合 */
const placeholders = (s) =>
  [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

// 以 en 为占位符基准（其余语种必须与之一致）
const byLocale = {};
for (const f of files) {
  const name = f.replace(/\.ts$/, "");
  const entries = parseLocale(fs.readFileSync(path.join(langDir, f), "utf8"));
  byLocale[name] = entries;
  const keys = entries.map((e) => e.key);
  const set = new Set(keys);

  const missing = [...enumSet].filter((k) => !set.has(k));
  const extra = keys.filter((k) => !enumSet.has(k));
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (missing.length)
    errors.push(name + " 缺少 " + missing.length + " 个 key：" + missing.slice(0, 12).join(", ") +
      (missing.length > 12 ? " …" : ""));
  if (extra.length) errors.push(name + " 含有枚举中不存在的 key：" + extra.join(", "));
  if (dups.length) errors.push(name + " 存在重复 key：" + [...new Set(dups)].join(", "));
}

/* ---------- 3. 占位符跨语种一致 ---------- */
const base = "en";
if (byLocale[base]) {
  const baseMap = new Map(byLocale[base].map((e) => [e.key, e.value]));
  for (const [name, entries] of Object.entries(byLocale)) {
    if (name === base) continue;
    for (const { key, value } of entries) {
      const expect = baseMap.get(key);
      if (expect === undefined) continue;
      const a = placeholders(expect).join(",");
      const b = placeholders(value).join(",");
      if (a !== b) {
        errors.push(
          name + "." + key + " 占位符不一致：期望 {" + a + "}，实际 {" + b + "}",
        );
      }
    }
  }
}

/* ---------- 4. 组件是否真的在用 i18n（防"加了词典没人用"） ---------- */
const srcDir = path.join(root, "src");
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(vue|ts)$/.test(e.name)) out.push(full);
  }
  return out;
}
const users = walk(srcDir)
  .filter((f) => !f.includes(path.join("src", "i18n")))
  .filter((f) => /from "@i18n\/translation"/.test(fs.readFileSync(f, "utf8")));

/* ---------- 结果 ---------- */
if (errors.length === 0) {
  console.log(
    "✅ i18n 校验通过：" + enumKeys.length + " 个 key × " + files.length +
    " 个语种，占位符一致；" + users.length + " 个文件消费 i18n",
  );
  process.exit(0);
}
console.error("❌ i18n 校验失败：");
for (const e of errors) console.error("   - " + e);
process.exit(1);
