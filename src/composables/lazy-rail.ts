/**
 * useLazyRail —— 右侧栏（目录 / 侧边卡）的延迟挂载。

 * 右侧栏是次要内容：不参与首屏主内容的布局决策，却要付出真实成本 ——
 * 文章页目录会给 50+ 个标题挂 IntersectionObserver 并持续响应滚动高亮；
 * 首页侧栏会发起 Bangumi 外部请求。这些都发生在主内容渲染的关键路径上。

 * 策略：
 *  - SSR：直接挂载（ready=true），保证 SSG 产物仍含完整右侧栏，
 *    不牺牲 SEO，也不在预渲染 HTML 里留空洞。
 *  - 客户端：首帧渲染后、浏览器空闲时（requestIdleCallback）才挂载，
 *    把右侧栏移出关键路径；不支持时退回 setTimeout。
 *  - 可选 media：与 CSS 的 display:none 断点保持一致 —— 命中不了断点时
 *    根本不挂载（而不是挂载后被 CSS 藏起来），并在窗口缩放时实时跟随，
 *    避免「窄屏进入 → 拉宽后右侧栏空白」。
 */
import { onMounted, onUnmounted, ref, type Ref } from "vue";

export interface LazyRailOptions {
  /**
   * 仅在匹配该媒体查询时挂载。用于与 CSS 断点对齐，
   * 例如文章页侧栏在 <=1080px 是 display:none，此处传 "(min-width: 1081px)"。
   */
  media?: string;
}

export interface LazyRail {
  /** 是否已可挂载（SSR 恒为 true；客户端空闲后转 true） */
  ready: Ref<boolean>;
}

export function useLazyRail(options: LazyRailOptions = {}): LazyRail {
  const ready = ref(false);

  // SSR：立即挂载，保证预渲染 HTML 完整
  if (typeof window === "undefined") {
    ready.value = true;
    return { ready };
  }

  let mql: MediaQueryList | null = null;
  let idleHandle: number | null = null;
  let timeoutHandle: number | null = null;

  /** 媒体条件是否允许挂载（未配置 media 时始终允许） */
  const allowed = () => mql === null || mql.matches;

  const activate = () => {
    if (allowed()) ready.value = true;
  };

  const onMediaChange = () => {
    // 窄屏 → 卸载；拉宽 → 重新挂载
    if (!allowed()) {
      ready.value = false;
      return;
    }
    activate();
  };

  onMounted(() => {
    if (options.media) {
      mql = window.matchMedia(options.media);
      mql.addEventListener("change", onMediaChange);
    }

    // 首帧之后再挂载，避免与主内容竞争首次布局
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      idleHandle = ric.call(window, activate, { timeout: 1200 });
    } else {
      timeoutHandle = window.setTimeout(activate, 200);
    }
  });

  onUnmounted(() => {
    mql?.removeEventListener("change", onMediaChange);
    mql = null;
    if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleHandle);
    }
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
    idleHandle = null;
    timeoutHandle = null;
  });

  return { ready };
}
