/**
 * v-reveal —— 滚动入场指令（模板 .reveal / .reveal.is-visible 的 Vue 化）
 *
 * 用法：<section v-reveal>…</section>
 * 挂载时给元素加上 .reveal（初始 opacity:0 + 位移），进入视口后加
 * .is-visible 触发模板定义的过渡曲线；不支持 IntersectionObserver 时
 * 直接显示，避免内容不可见。
 */
import type { Directive } from "vue";

type RevealEl = HTMLElement & { _revealObserver?: IntersectionObserver };

export const reveal: Directive<RevealEl> = {
  /**
   * SSR：预渲染阶段同样输出 .reveal 初始类，
   * 保证首屏 HTML 与客户端挂载后一致（否则水合时会闪一下）。
   */
  getSSRProps() {
    return { class: "reveal" };
  },
  mounted(el) {
    el.classList.add("reveal");

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    el._revealObserver = io;
  },
  unmounted(el) {
    el._revealObserver?.disconnect();
    el._revealObserver = undefined;
  },
};
