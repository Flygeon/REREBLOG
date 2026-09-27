/**
 * theme.ts —— 亮/暗主题管理（MD3）
 *
 * 状态：
 *  - localStorage "theme"：'light' | 'dark' | null（null = 跟随系统）
 *  - html[data-theme] 由 index.html 内联脚本首屏预置，避免 FOUC
 *
 * API：
 *  - getTheme(): 'light' | 'dark' 当前生效主题
 *  - toggleTheme(): 切换 light/dark 并持久化
 *  - setTheme(mode): 手动指定
 */
import { ref, watchEffect } from "vue";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

/** 当前生效主题（响应式，供组件读取） */
export const currentTheme = ref<ThemeMode>(getSystemTheme());

/**
 * 主题切换动画请求：非 null 时由 ThemeReveal.vue 播放「拉绳灯泡」动画。
 * 组件会在光晕铺满屏幕的那一刻调用 commitTheme()，整页重绘被不透明覆盖层
 * 遮挡、肉眼不可见，因此不掉帧。id 用于连点时重新触发同一段动画。
 */
export const themeReveal = ref<{ mode: ThemeMode; id: number } | null>(null);
let revealSeq = 0;

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return null;
}

/** 应用主题到 html[data-theme]，并同步移动端地址栏 theme-color */
function applyTheme(mode: ThemeMode) {
  currentTheme.value = mode;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", mode === "dark" ? "#0F0F11" : "#1A5C9E");
    }
  }
}

/** 初始化：优先 localStorage，否则跟随系统；并监听系统变化 */
export function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
  } else {
    applyTheme(getSystemTheme());
    // 跟随系统变化（仅当用户未手动指定时）
    window
      .matchMedia?.("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!getStoredTheme()) applyTheme(e.matches ? "dark" : "light");
      });
  }
}

/** 切换主题并持久化（带「拉绳灯泡」动画） */
export function toggleTheme() {
  const next: ThemeMode = currentTheme.value === "dark" ? "light" : "dark";
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof window === "undefined") {
    applyTheme(next);
    persist(next);
    return;
  }
  revealSeq += 1;
  themeReveal.value = { mode: next, id: revealSeq };
}

/** 手动指定主题（持久化，瞬时切换，无动画） */
export function setTheme(mode: ThemeMode) {
  applyTheme(mode);
  persist(mode);
}

/**
 * 应用主题并持久化。由 ThemeReveal.vue 在光晕铺满屏幕的那一刻调用 ——
 * 此刻整页重绘被不透明覆盖层完全遮挡，肉眼不可见，所以不会掉帧。
 */
export function commitTheme(mode: ThemeMode) {
  applyTheme(mode);
  persist(mode);
}

function persist(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/*
  动画本身现在由 src/components/ThemeReveal.vue 用 motion-v 编排：
  灯泡弹簧出现 → 拉绳下拉 → 灯态翻转 → 光晕以灯泡为圆心铺满全屏 →
  铺满瞬间 commitTheme() → 淡出揭示新主题。

  为什么不用 View Transitions（四轮实测结论）：这个页面上三种 VT 方案
  （clip-path 圆形揭示 / 交叉淡入 / 首版）都卡，VT 的整页快照捕获才是主要开销；
  且 clip-path 是非合成器属性，长页面每帧重栅格化。现在的方案全程只动
  transform / opacity，都在合成器线程，零每帧重绘。
*/
