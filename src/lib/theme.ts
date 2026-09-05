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

/** 应用主题到 html[data-theme] */
function applyTheme(mode: ThemeMode) {
  currentTheme.value = mode;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", mode);
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

/** 切换主题并持久化 */
export function toggleTheme() {
  const next: ThemeMode = currentTheme.value === "dark" ? "light" : "dark";
  setTheme(next);
}

/**
 * 亮暗切换的配色过渡：只在切换那一刻给 <html> 挂 .theme-transition，
 * 过渡结束即移除。常驻 transition 会干扰滚动入场 / 路由动画，故不放在全局。
 */
const TRANSITION_CLASS = "theme-transition";
const TRANSITION_MS = 260;
let transitionTimer: ReturnType<typeof setTimeout> | undefined;

function withThemeTransition() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(TRANSITION_CLASS);
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    root.classList.remove(TRANSITION_CLASS);
  }, TRANSITION_MS);
}

/** 手动指定主题（持久化，之后不再跟随系统） */
export function setTheme(mode: ThemeMode) {
  withThemeTransition();
  applyTheme(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
