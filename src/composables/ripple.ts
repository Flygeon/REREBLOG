/**
 * v-ripple —— MD3 涟漪触摸反馈（参考 MDC-Web 的 mdc-ripple 实现思路）
 *
 * 用法：<button class="lm-btn" v-ripple>…</button>
 *
 * 行为：
 *  - 指针按下时在按压点生成一枚圆形墨渍，半径取到元素最远角的距离，
 *    保证扩散后能覆盖整个元素（与 MDC 的 ripple 几何一致）
 *  - 动画结束后自动移除节点，不留 DOM 残留
 *  - 尊重 prefers-reduced-motion：关闭动效时不做涟漪（直接跳过）
 *  - 元素需可定位：若原本是 static，指令会补 position: relative / overflow: hidden
 */
import type { Directive } from "vue";

type RippleEl = HTMLElement & { _rippleHandler?: (e: PointerEvent) => void };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function spawnRipple(el: HTMLElement, event: PointerEvent) {
  if (typeof window !== "undefined" && window.matchMedia?.(REDUCED_MOTION).matches) {
    return;
  }

  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  // 半径：按压点到最远角的距离，保证完全覆盖元素
  const farthestX = Math.max(event.clientX - rect.left, rect.right - event.clientX);
  const farthestY = Math.max(event.clientY - rect.top, rect.bottom - event.clientY);
  const radius = Math.hypot(farthestX, farthestY);
  const diameter = radius * 2;

  const ink = document.createElement("span");
  ink.className = "ripple-ink";
  ink.style.width = `${diameter}px`;
  ink.style.height = `${diameter}px`;
  ink.style.left = `${event.clientX - rect.left - radius}px`;
  ink.style.top = `${event.clientY - rect.top - radius}px`;
  el.appendChild(ink);

  const remove = () => ink.remove();
  ink.addEventListener("animationend", remove, { once: true });
  // 兜底：动画事件未触发时也要清理（如元素被提前卸载）
  window.setTimeout(remove, 700);
}

export const ripple: Directive<RippleEl> = {
  mounted(el) {
    el.classList.add("ripple-host");
    const handler = (event: PointerEvent) => spawnRipple(el, event);
    el.addEventListener("pointerdown", handler);
    el._rippleHandler = handler;
  },
  unmounted(el) {
    if (el._rippleHandler) {
      el.removeEventListener("pointerdown", el._rippleHandler);
      el._rippleHandler = undefined;
    }
  },
};
