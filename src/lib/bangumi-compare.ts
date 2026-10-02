/**
 * bangumi-compare.ts —— 「番剧重合」数据层
 *
 * 放在组件之外的纯函数模块：网络细节、解析规则、统计口径都在这里，
 * 组件只负责渲染与交互，后续要加单测也只需盯着这一个文件。
 *
 * 输入：任意形式的「别人博客的 bangumi 界面」地址或标识 ——
 *   https://flygeon.top/bangumi/#/                 （hash 路由站点）
 *   https://someblog.com/bangumi?user=xxx          （查询串带用户名）
 *   https://bgm.tv/user/sai
 *   https://bangumi.tv/user/1250652/collections
 *   bgm.tv/user/sai
 *   sai / 1250652                                  （直接给用户名 / UID）
 *
 * 输出：双方「看过」（collection type=2）的动画交集，按评分排序。
 *
 * 关键约束（踩过的坑，别改回去）：
 *  1. 请求一律走站内反代 /api/bgm/v0（Worker 边缘缓存 + 国内外可达），
 *     绝不直连 api.bgm.tv —— 与 src/pages/Bangumi.vue 的既有策略一致。
 *  2. 我的收藏优先用接口实时数据（能拿到自己的评分与短评）；接口失败时
 *     回退构建期快照 src/data/bangumi.json，此时评分列显示为空。
 *  3. 对方集合必须带 subject_type=2&type=2，否则书籍 / 游戏会把交集污染成
 *     「番剧以外的重合」，页面上会出现幽灵条目。
 *  4. 交集的字段全部来自对方那条响应 + 我自己的响应，不做跨站拼接。
 */

/** 站点自己的快照条目（src/data/bangumi.json 的 items[]） */
export type BangumiSnapshotItem = {
  subject_id: number;
  /** 1 想看 / 2 看过 / 3 在看 / 4 搁置 / 5 抛弃 */
  type: number;
  name: string;
  name_cn: string;
  score: number;
  cover: string;
};

/** 归一化后的单条收藏（我方 / 对方通用） */
export type CollectionRow = {
  id: number;
  /** 1 想看 / 2 看过 / 3 在看 / 4 搁置 / 5 抛弃 */
  type: number;
  name: string;
  name_cn: string;
  cover: string;
  /** Bangumi 全站均分 */
  score: number;
  /** 该用户的评分（未评为 0） */
  rate: number;
  /** 该用户的短评 */
  comment: string;
};

/** 重合结果里的单条番剧：我方 + 对方两份数据并排 */
export type CompareItem = {
  id: number;
  name: string;
  name_cn: string;
  cover: string;
  score: number;
  myRate: number;
  theirRate: number;
  myComment: string;
  theirComment: string;
};

export type CompareResult = {
  /** 解析出的 Bangumi 用户标识（用户名或 UID） */
  userId: string;
  /** 我的「看过」动画数 */
  myWatched: number;
  /** 对方的「看过」动画数 */
  theirWatched: number;
  /** 双方都看过的动画数 */
  total: number;
  /** 重合度：对方看过的动画中与我的重合比例（0-100 整数） */
  overlapPercent: number;
  /** 双方都给了分的条目数 */
  bothRated: number;
  /** 双方都评分时：我给分更高的条目数 */
  myHigher: number;
  /** 双方都评分时：对方给分更高的条目数 */
  theirHigher: number;
  /** 双方都评分时：分数相同的条目数 */
  sameRate: number;
  /** 我的平均分（仅计交集里有评分的） */
  myAvg: number;
  /** 对方的平均分（口径同上） */
  theirAvg: number;
  items: CompareItem[];
};

/** 输入不合法 / 解析不出用户标识时抛出，message 直接面向用户展示 */
export class BangumiCompareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BangumiCompareError";
  }
}

/** 与 Bangumi.vue 保持同一个用户名（这里是站点主人） */
export const SITE_BANGUMI_USERNAME = "1250652";

const API_BASE = "/api/bgm/v0";
const PAGE_SIZE = 100;
/** 单次对比最多翻多少页（1000 条），避免超大收藏把浏览器拖死 */
const MAX_PAGES = 10;
const TIMEOUT_MS = 12000;
const UA = "Flygeon/blog (https://flygeon.top)";

/** Bangumi 用户名 / UID 允许的字符（站点允许中文等非 ASCII 用户名） */
const USERNAME_CORE = "[A-Za-z0-9_\\-.%\\u4e00-\\u9fff]+";
const USERNAME_RE = new RegExp(`^${USERNAME_CORE}$`);
const USER_SEGMENT_RE = new RegExp(`/user/(${USERNAME_CORE})`, "i");

/** 解析 URL 时按优先级尝试的参数名（博客把用户标识放在查询串里的情况） */
const QUERY_KEYS = ["user", "uid", "id", "username", "bangumi", "bgm"];

/**
 * 把用户粘贴的内容解析成 Bangumi 用户标识。
 * 依次尝试：URL 的 hash / 查询串 / pathname → 无协议域名 → 裸用户名。
 */
export function parseBangumiUser(input: string): string {
  let raw = (input ?? "").trim();
  if (!raw) throw new BangumiCompareError("请输入对方的 Bangumi 用户名或主页地址");
  if (raw.startsWith("@")) raw = raw.slice(1).trim();

  // 裸用户名 / UID：既没有协议，也不像「域名/路径」
  if (!looksLikeUrl(raw)) {
    if (USERNAME_RE.test(raw)) return raw;
    throw bangumiUserNotFound();
  }

  const candidate = raw.startsWith("//")
    ? `https:${raw}`
    : /^https?:/i.test(raw)
      ? raw
      : `https://${raw}`;

  let id = "";
  try {
    const url = new URL(candidate);
    // hash 里的 /user/<id>（很多博客是 /bangumi#/user/xxx）
    id = USER_SEGMENT_RE.exec(safeDecode(url.hash))?.[1] ?? "";
    // 查询串里的用户名（?user= / ?uid= / ?username= …）
    if (!id) {
      for (const key of QUERY_KEYS) {
        const value = (url.searchParams.get(key) ?? "").trim();
        if (value && USERNAME_RE.test(value)) {
          id = safeDecode(value);
          break;
        }
      }
    }
    // 路径里的 /user/<id>
    if (!id) id = USER_SEGMENT_RE.exec(safeDecode(url.pathname))?.[1] ?? "";
    // 形如 /bangumi/1250652、/collections/1250652 的数字尾段
    if (!id) {
      const segments = url.pathname.split("/").filter(Boolean);
      const tail = safeDecode(segments[segments.length - 1] ?? "");
      if (/^\d+$/.test(tail)) id = tail;
    }
    // hash 形如 #1250652 的纯数字
    if (!id) {
      const hash = safeDecode(url.hash).replace(/^#\/?/, "").split(/[?/]/)[0];
      if (/^\d{2,}$/.test(hash)) id = hash;
    }
  } catch {
    /* 交给下面的统一报错 */
  }

  id = id.trim();
  if (!id || !USERNAME_RE.test(id)) throw bangumiUserNotFound();
  return id;
}

/** 是否像一个 URL（而非裸用户名） */
function looksLikeUrl(value: string): boolean {
  if (/^(https?:)?\/\//i.test(value)) return true;
  // 无协议域名：xxx.yy/ 或 xxx.yy（bgm.tv）
  return /^(www\.)?[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
}

function bangumiUserNotFound(): BangumiCompareError {
  return new BangumiCompareError(
    "没认出这是哪个 Bangumi 用户。可以填 https://bgm.tv/user/用户名、带用户名的 /bangumi 页面地址（如 ?user=xxx），或直接填用户名 / UID。",
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 官方封面 URL → 站内相对路径（Worker R2 镜像同路径托管，与 Bangumi.vue 同口径） */
export function toPicPath(official?: string | null): string {
  if (!official) return "";
  try {
    return new URL(official).pathname;
  } catch {
    return "";
  }
}

/** 姓名展示优先级：中文名 → 原名 → 占位 */
export function displayName(nameCn: string | undefined, name: string | undefined): string {
  return nameCn || name || "未知条目";
}

/** /collections 原始条目 → 归一化行；非「看过」或结构异常的条目返回 null */
export function normalizeCollectionRow(row: any): CollectionRow | null {
  const id = Number(row?.subject_id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const type = Number(row?.type);
  if (type !== 2) return null; // 只认真「看过」
  const subject = row?.subject ?? {};
  const name = typeof subject.name === "string" ? subject.name : "";
  const name_cn = typeof subject.name_cn === "string" ? subject.name_cn : "";
  return {
    id,
    type,
    name,
    name_cn: displayName(name_cn, name),
    cover: toPicPath(subject.images?.common),
    score: Number(subject.score) || 0,
    rate: Number(row?.rate) || 0,
    comment: typeof row?.comment === "string" ? row.comment : "",
  };
}

/** 构建期快照条目 → 归一化行（快照只有 score，没有我的评分 / 短评） */
export function snapshotToRow(item: BangumiSnapshotItem): CollectionRow | null {
  if (!item || item.type !== 2) return null;
  const id = Number(item.subject_id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    type: item.type,
    name: item.name ?? "",
    name_cn: displayName(item.name_cn, item.name),
    cover: item.cover ?? "",
    score: Number(item.score) || 0,
    rate: 0,
    comment: "",
  };
}

/** 归一化成一族行（自动识别原始 API 响应 / 构建期快照两种输入） */
export function toCollectionRows(raw: any[]): CollectionRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: CollectionRow[] = [];
  for (const entry of raw) {
    const isSnapshot =
      entry && typeof entry === "object" && !("subject" in entry) && "subject_id" in entry;
    const row = isSnapshot
      ? snapshotToRow(entry as BangumiSnapshotItem)
      : normalizeCollectionRow(entry);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * 抓取某个用户的「看过」动画收藏。
 * 翻页直到 total 覆盖完 / 空页 / 达到页数上限。
 */
export async function fetchUserCollections(
  userId: string,
  fetchImpl: typeof fetch = fetch,
  apiBase: string = API_BASE,
): Promise<any[]> {
  const all: any[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    // subject_type=2 只要动画，type=2 只要「看过」（见文件头注释第 3 条）
    const url = `${apiBase}/users/${encodeURIComponent(userId)}/collections?subject_type=2&type=2&limit=${PAGE_SIZE}&offset=${offset}`;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { "user-agent": UA, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new BangumiCompareError("请求对方收藏失败，请检查网络后重试");
    }
    if (res.status === 404) {
      throw new BangumiCompareError(`Bangumi 上找不到用户「${userId}」`);
    }
    if (!res.ok) {
      throw new BangumiCompareError(`Bangumi 接口返回 ${res.status}，稍后再试`);
    }
    const data = await res.json().catch(() => null);
    const rows: any[] = Array.isArray(data?.data) ? data.data : [];
    all.push(...rows);
    if (!rows.length) break;
    if (all.length >= (data?.total ?? 0)) break;
  }
  return all;
}

/** 平均分，无评分时返回 0（页面用「—」占位） */
function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 计算「我」与对方的重合部分。
 *
 * @param userId   对方标识（展示用）
 * @param mineRaw  我的收藏：接口原始响应数组，或快照 items[]（接口失败时兜底）
 * @param theirsRaw 对方的 /collections 原始响应数组
 */
export function buildCompareResult(
  userId: string,
  mineRaw: any[],
  theirsRaw: any[],
): CompareResult {
  const mine = toCollectionRows(mineRaw);
  const theirs = toCollectionRows(theirsRaw);

  const mineById = new Map<number, CollectionRow>();
  for (const row of mine) mineById.set(row.id, row);

  const seen = new Set<number>();
  const items: CompareItem[] = [];
  for (const row of theirs) {
    if (seen.has(row.id)) continue;
    if (!mineById.has(row.id)) continue; // 我没看过 → 不算重合
    seen.add(row.id);
    const own = mineById.get(row.id)!;
    items.push({
      id: row.id,
      name: row.name || own.name,
      name_cn: row.name_cn || own.name_cn,
      cover: own.cover || row.cover,
      score: own.score || row.score,
      myRate: own.rate,
      theirRate: row.rate,
      myComment: own.comment,
      theirComment: row.comment,
    });
  }

  // 排序：双方都给过分的优先 → 我的评分高→低 → Bangumi 均分 → 标题
  items.sort((a, b) => {
    const bothA = a.myRate > 0 && a.theirRate > 0 ? 1 : 0;
    const bothB = b.myRate > 0 && b.theirRate > 0 ? 1 : 0;
    if (bothA !== bothB) return bothB - bothA;
    if (b.myRate !== a.myRate) return b.myRate - a.myRate;
    if (b.score !== a.score) return b.score - a.score;
    return a.name_cn.localeCompare(b.name_cn, "zh-Hans-CN");
  });

  const bothRated = items.filter((i) => i.myRate > 0 && i.theirRate > 0);
  const myRated = items.filter((i) => i.myRate > 0);
  const theirRated = items.filter((i) => i.theirRate > 0);

  return {
    userId,
    myWatched: mine.length,
    theirWatched: theirs.length,
    total: items.length,
    overlapPercent: theirs.length ? Math.round((items.length / theirs.length) * 100) : 0,
    bothRated: bothRated.length,
    myHigher: bothRated.filter((i) => i.myRate > i.theirRate).length,
    theirHigher: bothRated.filter((i) => i.theirRate > i.myRate).length,
    sameRate: bothRated.filter((i) => i.myRate === i.theirRate).length,
    myAvg: average(myRated.map((i) => i.myRate)),
    theirAvg: average(theirRated.map((i) => i.theirRate)),
    items,
  };
}
