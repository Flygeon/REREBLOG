<!--
  LiquidGlassPanel.vue —— 隐藏的液态玻璃调参面板。

  触发方式：在博客页右侧头像卡片上**连续点击三次**（800ms 内）。
  刻意不做任何提示：不写 title / aria-label / 光标样式，
  也不会因为悬停有变化 —— 页面上看不出这里能点。

  面板只在客户端渲染（v-if="mounted" 且仅当被打开过才创建 DOM），
  因此 SSG 产物里完全不存在这个节点，爬虫与普通访客都看不到。

  无障碍：面板一旦打开就是**可见控件**，必须能被键盘操作 ——
  所以它不标 aria-hidden，输入框都有 label，Esc 可关闭。
  这与"不提示触发方式"并不矛盾：不提示的是入口，打开后的可用性照常保证。
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="lgp"
      role="dialog"
      aria-modal="false"
      aria-label="液态玻璃参数"
    >
      <header class="lgp__head">
        <strong class="lgp__title">Liquid Glass</strong>
        <select v-model="sceneId" class="lgp__scene" aria-label="调参目标">
          <option v-for="s in scenes" :key="s.id" :value="s.id">
            {{ s.label }}
          </option>
        </select>
        <button
          type="button"
          class="lgp__close"
          aria-label="关闭面板"
          @click="close()"
        >
          ×
        </button>
      </header>

      <div class="lgp__body">
        <div v-if="!scenes.length" class="lgp__empty">
          当前页面没有液态玻璃实例
        </div>

        <label v-for="knob in knobs" :key="knob.key" class="lgp__row">
          <span class="lgp__label" :class="{ 'is-dirty': dirty(knob.key) }">
            {{ knob.label }}
          </span>
          <input
            class="lgp__range"
            type="range"
            :min="knob.min"
            :max="knob.max"
            :step="knob.step"
            :value="knobValue(knob.key)"
            @input="onInput(knob.key, $event)"
          />
          <output class="lgp__value">{{ display(knob.key) }}</output>
        </label>
      </div>

      <footer class="lgp__foot">
        <button type="button" class="lgp__btn" @click="resetScene">
          还原本页
        </button>
        <button type="button" class="lgp__btn" @click="resetAll">
          还原全部
        </button>
        <button type="button" class="lgp__btn" @click="dump">复制参数</button>
      </footer>

      <p v-if="copied" class="lgp__toast" aria-live="polite">已复制到剪贴板</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  activeSceneId,
  getOverrides,
  isOverridden,
  knobsFor,
  listGlassScenes,
  listLiveScenes,
  liveScenesRev,
  panelOpen,
  resetAllGlassScenes,
  resetGlassScene,
  setGlassParam,
} from "@composables/liquid-glass-store";
import type { LiquidGlassParams } from "@composables/liquid-glass";

const copied = ref(false);

/*
  场景列表是动态的：面板打开时当前路由可能还没有玻璃实例
  （比如首页有、某篇文章没有），用 computed 每次读取最新注册表。
  scenes 用 ref 触发响应式 —— 注册表本身是 Map，Map 的改动不会驱动渲染。
*/
const scenesRev = ref(0);
/*
  只列「当前页面实际挂着玻璃」的场景：
  注册表是全量的（每个页面在模块加载时注册自己），在线集合由 LiquidGlass
  在挂载/卸载时维护。这样从 /blog 切到 / 之后，下拉框里不会还留着一个
  已经不存在的场景 —— 那种情况下拖滑块看着有反应、其实没人接收。
*/
const scenes = computed(() => {
  void scenesRev.value;
  // 依赖在线集合的版本号：Set 本身的增删不会触发重算
  void liveScenesRev.value;
  const live = listLiveScenes();
  return listGlassScenes().filter((s) => live.includes(s.id));
});

const sceneId = computed({
  get: () => activeSceneId.value,
  set: (v: string) => {
    activeSceneId.value = v;
  },
});

const open = computed(() => panelOpen.value);

/** 旋钮随所选场景的模式变化：holo 与 image 生效的参数不同 */
const knobs = computed(() => {
  const scene = currentScene();
  return scene ? knobsFor(scene.mode) : [];
});

/** 当前场景的覆盖值，改动后用于重算显示 */
const overridesRev = ref(0);

function currentScene() {
  return listGlassScenes().find((s) => s.id === activeSceneId.value);
}

function knobValue(key: keyof LiquidGlassParams): number {
  const scene = currentScene();
  if (!scene) return 0;
  const v = getOverrides(scene.id)[key];
  if (typeof v === "number") return v;
  const d = scene.defaults[key];
  return typeof d === "number" ? d : 0;
}

function display(key: keyof LiquidGlassParams): string {
  const v = knobValue(key);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function dirty(key: keyof LiquidGlassParams): boolean {
  const scene = currentScene();
  if (!scene) return false;
  void overridesRev.value;
  return isOverridden(scene.id, key);
}

function onInput(key: keyof LiquidGlassParams, e: Event) {
  const scene = currentScene();
  if (!scene) return;
  const v = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(v)) setGlassParam(scene.id, key, v);
  overridesRev.value++;
}

function resetScene() {
  const scene = currentScene();
  if (scene) resetGlassScene(scene.id);
  overridesRev.value++;
}

function resetAll() {
  resetAllGlassScenes();
  overridesRev.value++;
}

/** 把所有覆盖值导成可直接粘回源码的对象字面量 */
async function dump() {
  const scene = currentScene();
  if (!scene) return;
  const text = JSON.stringify(getOverrides(scene.id), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // 剪贴板不可用（非安全上下文 / 无权限）时退化成控制台输出
    console.info("[liquid-glass]", text);
  }
}

function close() {
  panelOpen.value = false;
}

/** Esc 关闭：面板是可见控件，给键盘用户一条退路 */
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && panelOpen.value) close();
}

/*
  打开面板期间把玻璃的"跟指针"打开：调 pointerStrength / flow 时要能立刻看到
  效果，否则鼠标在面板上、玻璃永远收不到 pointermove。
*/
watch(panelOpen, (v) => {
  document.documentElement.classList.toggle("lgp-open", v);
});

onMounted(() => {
  window.addEventListener("keydown", onKey);
  // 注册表可能在本组件挂载后才建立（首页挂载顺序），轮询几次刷新下拉框
  const t = window.setInterval(() => {
    scenesRev.value++;
    if (listGlassScenes().length) window.clearInterval(t);
  }, 300);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
});
</script>

<style scoped>
/*
  面板自身的样式不引用站点令牌：它是开发/调试工具，风格独立，
  避免将来站点令牌变动时把面板一起改坏。
*/
.lgp {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483000;
  width: 300px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(18, 18, 20, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #eee;
  font: 12px/1.5 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.lgp__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.lgp__title {
  font-size: 12px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.lgp__scene {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
}
.lgp__close {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.lgp__close:hover {
  background: rgba(255, 255, 255, 0.16);
}
.lgp__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
}
.lgp__empty {
  padding: 12px 0;
  opacity: 0.6;
  text-align: center;
}
.lgp__row {
  display: grid;
  grid-template-columns: 84px 1fr 42px;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.lgp__label {
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 改过的参数高亮一下，方便一眼看出哪些被调过 */
.lgp__label.is-dirty {
  opacity: 1;
  color: #7cc4ff;
}
.lgp__range {
  width: 100%;
  accent-color: #7cc4ff;
}
.lgp__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
.lgp__foot {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.lgp__btn {
  flex: 1;
  padding: 5px 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.lgp__btn:hover {
  background: rgba(255, 255, 255, 0.14);
}
.lgp__toast {
  padding: 0 12px 8px;
  color: #7cc4ff;
}
</style>
