/**
 * useLazyLoad —— 第三方 API 卡片的延迟加载。
 *
 * 天气（uapis.cn）与随机美图（dmoe.cc）都依赖第三方服务：
 * 首页首屏不该为它们付出任何网络等待，用户也往往不会立刻看到这两张卡片。
 *
 * 策略：
 *  - 元素进入视口（提前 rootMargin 预热）才触发 loader；
 *  - 加载中显示骨架占位，加载完成切换到真实内容；
 *  - SSR 阶段一律 ready=false —— 动态内容不可能在构建期拿到，
 *    预渲染输出骨架，客户端水合后按需填充，不会产生水合不一致；
 *  - 不支持 IntersectionObserver 时立即加载，保证功能可用。
 */
import { onMounted, onUnmounted, ref, type Ref } from "vue";

export interface LazyLoadOptions {
  /**
   * 提前触发的距离，默认 100px。
   * 不宜过大：首页卡片本就靠上，margin 一大会在首屏就全部触发，
   * 懒加载形同虚设；100px 只够抵消滚动惯性造成的空白。
   */
  rootMargin?: string;
}

export interface LazyLoad {
  /** 是否已加载完成 */
  loaded: Ref<boolean>;
  /** 加载失败（骨架转为失败提示） */
  failed: Ref<boolean>;
}

/**
 * @param loader 实际加载逻辑；resolve 表示成功，reject 表示失败
 * @param options 预取距离等
 */
export function useLazyLoad(
  elRef: Ref<HTMLElement | null>,
  loader: () => Promise<void>,
  options: LazyLoadOptions = {},
): LazyLoad {
  const loaded = ref(false);
  const failed = ref(false);
  let observer: IntersectionObserver | null = null;

  const run = async () => {
    try {
      await loader();
      loaded.value = true;
    } catch {
      failed.value = true;
    }
  };

  onMounted(() => {
    const el = elRef.value;

    // 支持能力检测：老浏览器没有 IntersectionObserver，直接加载兜底
    if (typeof IntersectionObserver === "undefined") {
      void run();
      return;
    }

    /*
      没有绑定到元素：说明调用方压根不需要懒加载（例如静态卡片复用了
      这个组件但没渲染动态块）。此时必须什么都不做 ——
      若在这里 run()，挂载瞬间就会无差别触发 load。
    */
    if (!el) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer?.disconnect();
            observer = null;
            void run();
            break;
          }
        }
      },
      { rootMargin: options.rootMargin ?? "100px" },
    );
    observer.observe(el);
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });

  return { loaded, failed };
}