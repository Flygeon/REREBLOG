/**
 * Cloudflare Workers 入口
 * - 静态资源（dist/）由 env.ASSETS 直接托管（SSG 预渲染产物）
 * - /pic/*：Bangumi 封面镜像。R2 命中直接返回；miss 时回源 lain.bgm.tv
 *   并写回 R2（cache-fill），国内访问无感（Worker 在 CF 边缘，境外可达）
 * - /api/bgm/*：Bangumi API 反代。转发 api.bgm.tv，Cache API 边缘缓存 30 分钟，
 *   国内外用户均可实时刷新收藏数据，且对 bgm.tv 只产生低频回源
 * - scheduled：按构建期生成的 bangumi-images.json 清单预热 R2 封面
 * - 非资源路由（无扩展名）fallback 到 index.html，兼容 SPA 调试阶段
 */

const BGM_API_ORIGIN = "https://api.bgm.tv";
const BGM_IMG_ORIGIN = "https://lain.bgm.tv";
const UA = "Flygeon/blog (https://flygeon.top)";
const IMG_CACHE_CONTROL = "public, max-age=31536000, immutable";
const API_CACHE_CONTROL = "public, max-age=1800, s-maxage=1800";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 旧 Astro 站的头像哈希地址：友链站仍在外链，301 到稳定的新地址
    if (url.pathname === "/_astro/avatar.CCT2o-B8_13KVJb.webp") {
      return Response.redirect(new URL("/avatar.png", url).toString(), 301);
    }

    // Bangumi API 反代：/api/bgm/<rest> → https://api.bgm.tv/<rest>
    if (url.pathname.startsWith("/api/bgm/")) {
      return proxyBangumiApi(request, url, ctx);
    }

    // Bangumi 封面镜像：/pic/* 与 /r/<size>/pic/*（API common 图带缩放前缀）
    // → R2，miss 回源 lain.bgm.tv 并写回
    if (isBangumiImagePath(url.pathname)) {
      return serveBangumiImage(url.pathname, env, ctx);
    }

    let res = await env.ASSETS.fetch(request);

    // SPA fallback：仅在尚未完成 SSG 预渲染时启用；SSG 完成后此分支基本不会触发
    if (res.status === 404 && !url.pathname.includes(".")) {
      res = await env.ASSETS.fetch(new URL("/index.html", request.url));
    }
    return res;
  },

  /**
   * 每日预热：读 dist/bangumi-images.json（构建期生成的封面清单），
   * 逐张走 serveBangumiImage —— R2 已有的秒过，miss 的回源并写回。
   * 只处理前 200 张以约束单次执行时长，剩余由用户访问时的 cache-fill 兜底。
   */
  async scheduled(_event, env, ctx) {
    const listUrl = new URL("/bangumi-images.json", "https://flygeon.top").toString();
    let images = [];
    try {
      const res = await env.ASSETS.fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        images = Array.isArray(data?.images) ? data.images : [];
      }
    } catch {
      return; // 清单缺失（如旧构建产物）直接跳过本次预热
    }
    const CONCURRENCY = 8;
    const MAX = 200;
    const queue = images.filter((p) => typeof p === "string" && isBangumiImagePath(p)).slice(0, MAX);
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      const batch = queue.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((p) => serveBangumiImage(p, env, ctx).catch(() => null)));
    }
  },
};

/** Bangumi 图片路径判定：/pic/* 或 /r/<size>/pic/*（缩放前缀形式） */
function isBangumiImagePath(pathname) {
  return pathname.startsWith("/pic/") || /^\/r\/\d+\/pic\//.test(pathname);
}

/** /pic/* 封面服务：R2 命中即回；miss 回源 lain.bgm.tv，写回 R2 后返回 */
async function serveBangumiImage(pathname, env, ctx) {
  const key = pathname.replace(/^\//, "");

  let obj = null;
  try {
    obj = await env.BANGUMI_IMG.get(key);
  } catch {
    // R2 异常不阻塞，直接走回源
  }
  if (obj) {
    return new Response(obj.body, {
      headers: {
        "content-type": obj.httpMetadata?.contentType || "image/jpeg",
        "cache-control": IMG_CACHE_CONTROL,
      },
    });
  }

  // 回源（Worker 在 CF 边缘，访问 lain.bgm.tv 不受国内网络限制）
  const upstream = await fetch(BGM_IMG_ORIGIN + pathname, {
    headers: { "user-agent": UA, referer: "https://bgm.tv/" },
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("Not Found", { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const buf = await upstream.arrayBuffer();

  // 写回 R2 供后续命中；失败不影响本次返回
  ctx.waitUntil(
    env.BANGUMI_IMG.put(key, buf, {
      httpMetadata: { contentType },
    }).catch(() => {}),
  );

  return new Response(buf, {
    headers: {
      "content-type": contentType,
      "cache-control": IMG_CACHE_CONTROL,
    },
  });
}

/** /api/bgm/* 反代：GET 转发 api.bgm.tv，边缘缓存 30 分钟；失败原样透传状态码 */
async function proxyBangumiApi(request, url, ctx) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const cache = caches.default;
  let res = await cache.match(request);
  if (res) return res;

  const targetPath = url.pathname.replace(/^\/api\/bgm/, "");
  const upstream = await fetch(BGM_API_ORIGIN + targetPath + url.search, {
    headers: { "user-agent": UA, accept: "application/json" },
  }).catch(() => null);

  if (!upstream) {
    return new Response(JSON.stringify({ error: "upstream_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const body = await upstream.arrayBuffer();
  res = new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      // 限流 / 出错不缓存，成功响应缓存半小时
      "cache-control": upstream.ok ? API_CACHE_CONTROL : "no-store",
    },
  });
  if (upstream.ok) {
    ctx.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  }
  return res;
}
