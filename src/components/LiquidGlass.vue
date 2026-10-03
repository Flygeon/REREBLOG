<!--
  LiquidGlass.vue —— 液态玻璃（Apple WWDC 2025 Liquid Glass）折射层。

  两种模式：
    ① mode="image"（默认，Hero 用）
       父元素 position: relative + overflow: hidden + border-radius，先铺一张同源底图，
       这块 canvas 把底图按液态玻璃折射后重画一遍（叠在底图之上）。
       底图没加载出来 / WebGL 不可用 / 着色器编译失败时 canvas 直接不显示，
       下层原图原样可见 —— 静默降级，不会缺一块。

    ② mode="holo"（图标按钮用）
       不改写背景，直接合成「全息玻璃」本体：流动焦散 + 边缘色散弧 + 镜面高光，
       底面按亮/暗主题取乳白或深色。用在背景本身是动态的（页面滚动、主题渐变）
       而没有一个静态底图可折射的地方 —— 侧边栏与抽屉里的图标按钮。

  canvas 的 z-index 由调用方在父级样式里安排（Hero 是 底图 → 玻璃 → scrim → 文案）。
-->
<template>
  <canvas
    ref="canvasEl"
    class="liquid-glass"
    :class="[`liquid-glass--${mode}`, { 'liquid-glass--ready': ready }]"
    aria-hidden="true"
  ></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  createLiquidGlass,
  type LiquidGlassHandle,
  type LiquidGlassMode,
  type LiquidGlassParams,
} from "@composables/liquid-glass";
import {
  markSceneLive,
  markSceneOffline,
  subscribeGlassScene,
} from "@composables/liquid-glass-store";
import { currentTheme } from "@lib/theme";

const props = withDefaults(
  defineProps<{
    /** 底图 URL（mode="image" 必填；必须与下层 <img> 同源同图，否则折射内容对不上） */
    src?: string;
    /** 渲染模式，默认 image */
    mode?: LiquidGlassMode;
    /** 覆盖默认参数（圆角、厚度、高光…） */
    params?: Partial<LiquidGlassParams>;
    /** 是否响应指针（玻璃内悬停产生局部凸起） */
    interactive?: boolean;
    /**
     * 调参目标 id（对应 registerGlassScene 注册的 id）。
     * 传了它，这层玻璃就会被隐藏管理面板实时接管：
     * 面板改参数 → store 广播 → 这里调 handle.update()，无需重挂载。
     * 不传则完全走 params 常量，面板影响不到它。
     */
    scene?: string;
  }>(),
  { src: "", mode: "image", params: () => ({}), interactive: true, scene: "" },
);

const emit = defineEmits<{ ready: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const ready = ref(false);
let handle: LiquidGlassHandle | null = null;
let unsubscribe: (() => void) | null = null;

/*
  面板覆盖值（没有就返回空对象）。
  放在 onMounted 之前声明：createLiquidGlass 初始化时要用它做初始参数，
  否则打开面板后重进页面会先闪一下默认值再跳成覆盖值。
*/
function sceneOverrides(): Partial<LiquidGlassParams> {
  return { ...sceneParams.value };
}
const sceneParams = ref<Partial<LiquidGlassParams>>({});

onMounted(() => {
  if (!canvasEl.value) return;
  handle = createLiquidGlass({
    canvas: canvasEl.value,
    mode: props.mode,
    source: props.src || undefined,
    params: {
      dark: currentTheme.value === "dark",
      ...props.params,
      ...sceneOverrides(),
    },
    interactive: props.interactive,
    onReady: () => {
      ready.value = true;
      emit("ready");
    },
  });

  /*
    订阅管理面板。store 会在订阅瞬间先回调一次当前值 —— 那时 handle 已存在，
    所以这次回调是幂等的（把刚初始化好的同一套值再写一遍）。
  */
  if (props.scene && handle) {
    const glass = handle;
    markSceneLive(props.scene);
    unsubscribe = subscribeGlassScene(props.scene, (id, params) => {
      if (props.scene !== id) return;
      sceneParams.value = params;
      // dark 由主题驱动，panel 不暴露该字段，但整体覆盖值里会带上它，
      // 这里以主题为准再覆盖一次，避免被面板的旧值顶掉
      glass.update({ ...params, dark: currentTheme.value === "dark" });
    });
  }
});

/*
  主题热更新：holo 模式下玻璃底色与焦散配色跟主题走。
  直接改 uniform 而不是重建上下文 —— 重建会丢纹理、还要重编译着色器。
*/
watch(currentTheme, (theme) => {
  handle?.update({ dark: theme === "dark" });
});

onBeforeUnmount(() => {
  unsubscribe?.();
  unsubscribe = null;
  if (props.scene) markSceneOffline(props.scene);
  handle?.destroy();
  handle = null;
});
</script>

<style scoped>
/*
  未就绪时 opacity: 0：既避开「渲染出第一帧前闪一下透明画布」，
  也让降级路径（WebGL 不可用）天然成立 —— 组件永远不会把父元素变空。
*/
.liquid-glass {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  /* 纯视觉层：不吃鼠标事件，父元素里的链接/按钮照常可点 */
  pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-medium, 300ms)
    var(--md-sys-motion-easing-standard, ease);
}
.liquid-glass--ready {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .liquid-glass {
    transition-duration: 0.01ms;
  }
}
</style>
