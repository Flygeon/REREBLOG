/**
 * liquid-glass-store.ts —— 液态玻璃参数的运行时可调层（隐藏管理面板的后端）。
 *
 * 为什么要有这一层：
 *   玻璃参数原本是各页面写死的常量（Blog.vue 的 heroGlassParams、
 *   Home.vue 的 heroGlassParams …）。管理面板要能"边拖边看"，
 *   就不能只改常量 —— 必须有一条从面板到已挂载 WebGL 实例的通路。
 *
 * 这层做三件事：
 *   1. 保存每个「调参目标」（scene）的默认值与当前覆盖值；
 *   2. 维持一个全局单例 overlay 的开关；
 *   3. 把变更广播给所有订阅者（LiquidGlass 组件订阅后调用 handle.update()）。
 *
 * 关键约定：**默认 null 覆盖 = 完全不影响线上渲染**。
 * 面板没打开过、或没动过某个参数时，组件拿到的就是页面原本那套常量，
 * 逐字节等同于此功能不存在。覆盖值只存在内存里（不落 localStorage），
 * 刷新即回到默认 —— 避免"某天发现玻璃参数不知为何变了"这类幽灵问题。
 */
import { ref, type Ref } from "vue";
import {
  DEFAULT_LIQUID_GLASS_PARAMS,
  type LiquidGlassMode,
  type LiquidGlassParams,
} from "@composables/liquid-glass";

/** 调参目标：每个目标对应页面上一处玻璃，各有自己的默认值与可调字段 */
export interface GlassScene {
  /** 稳定 id，同时用于 DOM 上的 data 属性名（如 "blog-hero"） */
  id: string;
  /** 面板里显示的名字 */
  label: string;
  /** 该场景的默认参数（页面里原写死那套） */
  defaults: Partial<LiquidGlassParams>;
  /** 玻璃模式：决定面板显示哪一组旋钮（两套模式的可用参数不同） */
  mode: LiquidGlassMode;
}

/** 面板里每个旋钮的呈现元数据 */
export interface KnobSpec {
  key: keyof LiquidGlassParams;
  label: string;
  min: number;
  max: number;
  step: number;
  /** 数值型以外（布尔）单独处理 */
  kind?: "number" | "boolean";
}

/*
  注册表在模块加载时建立。每个场景的 defaults 由页面在挂载前注册进来的
  真实常量（见 registerGlassScene），因此面板显示的就是页面实际在用的值，
  不会出现"面板写 16、页面其实用 28"这种对不上的情况。
*/
const scenes = new Map<string, GlassScene>();
const overrides = new Map<string, Partial<LiquidGlassParams>>();

/** 当前被选中的场景 id（仅影响面板显示，不影响渲染） */
export const activeSceneId: Ref<string> = ref("");

/*
  「当前页面真的有这块玻璃」的集合，由 LiquidGlass 在挂载/卸载时维护。
  没有它的话，从 /blog 切到 / 之后面板仍指着 blog-hero ——
  那个场景已经不在了，拖滑块看着有反应、其实没有任何实例接收。
*/
const liveScenes = new Set<string>();

/*
  在线集合是普通 Set，Set 的增删不会触发 Vue 重渲染 ——
  面板的「场景下拉框」如果只依赖它，切路由后会一直显示旧列表。
  所以额外维护一个版本号，每次增删都 +1，面板 computed 依赖它。
*/
export const liveScenesRev: Ref<number> = ref(0);

/** 玻璃实例挂载时调用 */
export function markSceneLive(id: string): void {
  if (!id) return;
  liveScenes.add(id);
  liveScenesRev.value++;
  // 当前选中的场景已下线时，自动切到刚上线的这块
  if (!liveScenes.has(activeSceneId.value)) activeSceneId.value = id;
}

/** 玻璃实例卸载时调用 */
export function markSceneOffline(id: string): void {
  if (!id) return;
  liveScenes.delete(id);
  liveScenesRev.value++;
  if (activeSceneId.value === id) {
    const next = liveScenes.values().next();
    activeSceneId.value = next.done ? "" : next.value;
  }
}

/** 当前页面实际在线的场景 id */
export function listLiveScenes(): string[] {
  return [...liveScenes];
}

/** 订阅者：参数变化时被调用。返回取消订阅函数。 */
type Listener = (id: string, params: Partial<LiquidGlassParams>) => void;
const listeners = new Set<Listener>();

/** 面板开关 */
export const panelOpen = ref(false);
/** 面板是否在"接管指针"（打开时让玻璃跟指针，预览放大效果） */
export const panelInteractive = ref(false);

function notify(id: string) {
  const params = resolveGlassParams(id);
  for (const fn of listeners) fn(id, params);
}

/** 订阅某场景的参数变化；挂载时先立即回调一次当前值 */
export function subscribeGlassScene(id: string, fn: Listener): () => void {
  listeners.add(fn);
  fn(id, resolveGlassParams(id));
  return () => listeners.delete(fn);
}

/**
 * 注册场景。页面在自己的 <script setup> 顶层调用，传入写死的默认参数。
 * 重复注册（HMR / 路由重进）以最新一次为准。
 */
export function registerGlassScene(scene: GlassScene): void {
  scenes.set(scene.id, scene);
  if (!activeSceneId.value) activeSceneId.value = scene.id;
}

/** 全部已注册场景（面板用） */
export function listGlassScenes(): GlassScene[] {
  return [...scenes.values()];
}

/**
 * 取某场景的最终参数 = 默认值 → DEFAULT_* 兜底 → 用户覆盖。
 * 三层顺序不能反：覆盖值优先级最高，页面常量次之，库默认最低。
 */
export function resolveGlassParams(id: string): Partial<LiquidGlassParams> {
  return {
    ...DEFAULT_LIQUID_GLASS_PARAMS,
    ...(scenes.get(id)?.defaults ?? {}),
    ...(overrides.get(id) ?? {}),
  };
}

/** 取某场景当前的覆盖值（面板显示"是否被改过"用） */
export function getOverrides(id: string): Partial<LiquidGlassParams> {
  return { ...(overrides.get(id) ?? {}) };
}

/** 改一个参数（面板拖动时高频调用） */
export function setGlassParam(
  id: string,
  key: keyof LiquidGlassParams,
  value: number | boolean,
): void {
  const next = { ...(overrides.get(id) ?? {}) };
  // 与默认值相等就删掉覆盖，保持 overrides 干净（面板能正确显示"未改动"）
  if (sceneValue(id, key) === value) delete next[key];
  else (next as Record<string, unknown>)[key as string] = value;
  overrides.set(id, next);
  notify(id);
}

/** 某字段当前生效值 */
function sceneValue(
  id: string,
  key: keyof LiquidGlassParams,
): number | boolean | undefined {
  const defaults = (scenes.get(id)?.defaults ?? {}) as Record<string, unknown>;
  if (key in defaults) return defaults[key] as number | boolean;
  return (DEFAULT_LIQUID_GLASS_PARAMS as unknown as Record<string, unknown>)[
    key as string
  ] as number | boolean;
}

/** 把某场景还原成页面写死的默认参数 */
export function resetGlassScene(id: string): void {
  overrides.delete(id);
  notify(id);
}

/** 还原全部场景 */
export function resetAllGlassScenes(): void {
  overrides.clear();
  for (const id of scenes.keys()) notify(id);
}

/** 某个字段是否被改过（面板做高亮提示） */
export function isOverridden(id: string, key: keyof LiquidGlassParams): boolean {
  return key in (overrides.get(id) ?? {});
}

/* ------------------------------------------------------------------ *
 * 面板上暴露的旋钮清单
 * ------------------------------------------------------------------ */

/*
  刻意只暴露"能看出差别且不会把玻璃调坏"的参数：
    · 不暴露 sminSmoothing / maxDpr / dark —— 前者调大调小都是瑕疵，
      后者是内部实现，dark 由主题驱动；
    · 不暴露 heightTransitionWidth 以外的几何量，圆角由 autoCornerRadius 自量。
*/
/*
  两套旋钮清单按模式分开，避免"拖了半天没反应"：
    · image 模式才有意义的是折射相关项（ior / thickness / blur / overlay / edgeLift）；
    · holo 模式没有底图，折射项对它几乎无感，真正有效的是焦散 / 色散 / 透明度那一组。
  两组共有的（法线、过渡带、高光、衰减、指针、流动）只写一份。
*/
/** 两种模式共有的旋钮（法与位移/高光/流动这一组在两条分支里都生效） */
const KNOBS_SHARED: KnobSpec[] = [
  { key: "normalStrength", label: "法线强度", min: 0.1, max: 12, step: 0.1 },
  { key: "heightTransitionWidth", label: "边缘过渡带", min: 2, max: 60, step: 0.5 },
  { key: "highlightWidth", label: "高光宽度", min: 0, max: 6, step: 0.1 },
  { key: "edgeFalloff", label: "位移衰减", min: 0, max: 1, step: 0.02 },
  { key: "pointerStrength", label: "指针凸起", min: 0, max: 20, step: 0.5 },
  { key: "flow", label: "液面流动", min: 0, max: 12, step: 0.2 },
  { key: "flowSpeed", label: "流动速度", min: 0, max: 1.5, step: 0.01 },
  { key: "alpha", label: "整体不透明度", min: 0, max: 1, step: 0.01 },
  { key: "rimAlpha", label: "边缘不透明度", min: 0, max: 1, step: 0.01 },
];

/** 仅 image 模式生效：这些量都在着色器的「折射底图」分支里 */
const KNOBS_IMAGE_ONLY: KnobSpec[] = [
  { key: "ior", label: "折射率 IOR", min: 0.8, max: 1.6, step: 0.01 },
  { key: "thickness", label: "玻璃厚度", min: 0, max: 60, step: 0.5 },
  { key: "displacementScale", label: "位移倍率", min: 0.1, max: 4, step: 0.1 },
  { key: "blurRadius", label: "磨砂半径", min: 0, max: 5, step: 0.1 },
  { key: "edgeLift", label: "边缘提亮", min: 0, max: 1, step: 0.02 },
  { key: "overlayStrength", label: "乳白叠加", min: 0, max: 1, step: 0.02 },
];

/** 仅 holo 模式生效：全息玻璃合成的三个专属量 */
const KNOBS_HOLO_ONLY: KnobSpec[] = [
  { key: "fieldScale", label: "流场密度", min: 0.5, max: 12, step: 0.1 },
  { key: "causticStrength", label: "焦散强度", min: 0, max: 1.5, step: 0.02 },
  { key: "rainbowStrength", label: "色散弧强度", min: 0, max: 1.5, step: 0.02 },
  { key: "rainbowAngle", label: "色散弧角度", min: 0, max: 6.29, step: 0.01 },
  { key: "arcWidth", label: "色散弧宽度", min: 0.5, max: 12, step: 0.1 },
];

/** 按模式给出该场景真正生效的旋钮 */
export function knobsFor(mode: LiquidGlassMode): KnobSpec[] {
  return mode === "holo" ? [...KNOBS_SHARED, ...KNOBS_HOLO_ONLY] : [...KNOBS_SHARED, ...KNOBS_IMAGE_ONLY];
}
