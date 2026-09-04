/**
 * bangumi.mjs —— 构建期 Bangumi 数据抓取（SSG 快照）。
 *
 * 在 `vite build` 之前运行：
 *  1. 抓取 api.bgm.tv 收藏（subject_type 2=动画 1=书籍，与前端原逻辑一致）
 *  2. 精简为 src/data/bangumi.json（封面路径已转为站内 /pic/* 相对路径，
 *     由 Worker 的 R2 镜像路由提供，SSG 产物与客户端水合使用同一份数据）
 *  3. 生成 public/bangumi-images.json 封面清单（随 dist 部署，
 *     Worker 每日 cron 按此清单预热 R2）
 *  4. 抓取失败时回退仓库中已有的旧快照，绝不阻塞构建
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SNAPSHOT_FILE = path.join(root, "src", "data", "bangumi.json");
const IMAGES_FILE = path.join(root, "public", "bangumi-images.json");

const BANGUMI_USERNAME = "1250652";
const API_BASE = "https://api.bgm.tv/v0";
const UA = "Flygeon/blog (https://flygeon.top)";

/** 官方封面 URL → 站内 /pic/* 相对路径（Worker R2 镜像同路径托管） */
function toPicPath(official) {
  if (!official) return "";
  try {
    return new URL(official).pathname;
  } catch {
    return "";
  }
}

async function fetchCollections(subjectType) {
  const all = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const url = `${API_BASE}/users/${BANGUMI_USERNAME}/collections?subject_type=${subjectType}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`api ${res.status} @ ${url}`);
    const data = await res.json();
    all.push(...(data.data ?? []));
    if (all.length >= (data.total ?? 0)) break;
    offset += pageSize;
  }
  return all;
}

function trimItems(rawItems) {
  return rawItems.map((it) => ({
    subject_id: it.subject_id,
    type: it.type,
    name: it.subject?.name ?? "",
    name_cn: it.subject?.name_cn ?? "",
    score: it.subject?.score ?? 0,
    cover: toPicPath(it.subject?.images?.common),
  }));
}

function fallback(reason) {
  if (fs.existsSync(SNAPSHOT_FILE)) {
    console.warn(`⚠️ Bangumi 抓取失败（${reason}），使用仓库已有快照兜底。`);
    // 同步刷新图片清单（旧快照里可能还没生成过清单）
    try {
      const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
      const images = [...new Set(snapshot.items.map((i) => i.cover).filter(Boolean))];
      fs.mkdirSync(path.dirname(IMAGES_FILE), { recursive: true });
      fs.writeFileSync(IMAGES_FILE, JSON.stringify({ updatedAt: snapshot.updatedAt, images }, null, 2), "utf8");
      console.log(`✅ 图片清单已按旧快照重建（${images.length} 张）`);
    } catch {
      /* ignore */
    }
    return;
  }
  console.warn(`⚠️ Bangumi 抓取失败（${reason}）且无旧快照，写入空数据。`);
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ updatedAt: null, items: [] }, null, 2), "utf8");
}

async function main() {
  try {
    const [anime, book] = await Promise.all([
      fetchCollections(2),
      fetchCollections(1).catch(() => []), // 书籍抓取失败不阻塞（番剧为主）
    ]);
    const items = trimItems([...anime, ...book]);
    const updatedAt = new Date().toISOString();
    const images = [...new Set(items.map((i) => i.cover).filter(Boolean))];

    fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ updatedAt, items }, null, 2), "utf8");
    fs.mkdirSync(path.dirname(IMAGES_FILE), { recursive: true });
    fs.writeFileSync(IMAGES_FILE, JSON.stringify({ updatedAt, images }, null, 2), "utf8");
    console.log(`✅ Bangumi 快照已生成：${items.length} 条 / ${images.length} 张封面（${updatedAt}）`);
  } catch (e) {
    fallback(e?.message ?? String(e));
  }
}

main();
