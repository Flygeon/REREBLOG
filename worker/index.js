/**
 * Cloudflare Workers 入口
 * - 静态资源（dist/）由 env.ASSETS 直接托管（SSG 预渲染产物）
 * - 非资源路由（无扩展名）fallback 到 index.html，兼容 SPA 调试阶段
 * - 后续 Phase 接入 Memos 代理：以 /memos 开头的请求转发到 env.MEMOS_TARGET
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 旧 Astro 站的头像哈希地址：友链站仍在外链，301 到稳定的新地址
    if (url.pathname === "/_astro/avatar.CCT2o-B8_13KVJb.webp") {
      return Response.redirect(new URL("/avatar.png", url).toString(), 301);
    }

    // TODO(后续 Phase): Memos 代理
    // if (url.pathname.startsWith("/memos") && env.MEMOS_TARGET) {
    //   const target = new URL(url.pathname + url.search, env.MEMOS_TARGET);
    //   return fetch(target.toString(), { headers: request.headers });
    // }

    let res = await env.ASSETS.fetch(request);

    // SPA fallback：仅在尚未完成 SSG 预渲染时启用；SSG 完成后此分支基本不会触发
    if (res.status === 404 && !url.pathname.includes(".")) {
      res = await env.ASSETS.fetch(new URL("/index.html", request.url));
    }
    return res;
  },
};
