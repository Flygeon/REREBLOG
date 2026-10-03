/**
 * liquid-glass.ts —— 「液态玻璃」折射层（Apple WWDC 2025 Liquid Glass）的 WebGL 实现。
 *
 * 算法与着色器数学来自 rxing365/html-liquid-glass-effect-webgl：
 *   圆角矩形 SDF → 高度场（logistic 边缘）→ 对高度场求梯度得法线
 *   → 折射定律算出采样偏移 → 边缘高光 + 可选磨砂。
 * 这里按本站「嵌进既有页面」的需要做了四处改写：
 *
 *  1. 参考实现把 canvas 自身的 back buffer 当底图采样（framebuffer feedback
 *     loop，WebGL 规范里是未定义行为）。本实现改成把同一张底图直接上传为纹理，
 *     于是没有回读、单次 draw call，并且能和 CSS 的 object-fit: cover 精确对位
 *     （底图被 <img> 完整铺满玻璃区域，玻璃层只负责「折射」它）。
 *  2. 圆角边缘用 alpha 羽化输出，不再 discard，边缘没有锯齿；
 *     输出按预乘 alpha（与 canvas 默认 premultipliedAlpha 合成口径一致）。
 *  3. 静态时仍保留低频「液面」漂移，指针悬停再加一个局部凸起 —— 玻璃始终是活的，
 *     不是贴一张静态图。
 *  4. WebGL 不可用 / 底图加载失败 / 着色器编译失败一律静默降级：
 *     调用方下面那层原图原样可见，页面不会缺一块。
 *
 * 该模块是命令式的（不依赖 Vue），便于单测与复用；Vue 侧封装见
 * components/LiquidGlassCanvas.vue。
 */

/** 可调参数：默认值按 /blog 顶部 Hero（宽扁、圆角 16px）标定 */
export interface LiquidGlassParams {
  /** 圆角半径（CSS 像素），autoCornerRadius=false 时才用它 */
  cornerRadius: number;
  /**
   * 从 canvas 自身的 computed border-radius 取圆角（默认开）。
   * 玻璃层是「铺满某个盒子」的，盒子圆角变了（比如 Hero 图片内缩后
   * 卡片 16px / 图片 12px 两套圆角），写死数值必然对不上：
   * 要么高光被父级裁掉，要么圆角内多出一圈硬边。直接量元素自己最省心。
   */
  autoCornerRadius: boolean;
  /** 折射率，1.0 = 不折射 */
  ior: number;
  /** 玻璃厚度 / 折射强度（像素尺度）：越大边缘位移越远 */
  thickness: number;
  /** 法线强度：高度场梯度的放大倍数 */
  normalStrength: number;
  /** 位移总缩放 */
  displacementScale: number;
  /** 边缘过渡带宽度（像素）：越小边缘越锐、越大越「圆润」 */
  heightTransitionWidth: number;
  /** SDF 平滑（polynomial smin）因子，0 = 不圆滑 */
  sminSmoothing: number;
  /** 磨砂模糊半径（像素，0 = 关闭） */
  blurRadius: number;
  /** 边缘高光宽度（像素） */
  highlightWidth: number;
  /** 边缘补偿（0~1）：把折射压暗的边缘提亮回白色 */
  edgeLift: number;
  /**
   * 位移衰减（0~1）：把折射位移按玻璃厚度场(0..1)混合。
   * 0 = 边缘位移最大（参考实现的行为，会把轮廓外的画面内容拽到边缘上，
   * 底图角落偏暗时表现为一圈黑边）；1 = 边缘位移归零，
   * 最大位移挪到轮廓内侧的过渡带上，边缘回到「干净的高光」。
   */
  edgeFalloff: number;
  /** 白色乳白叠加强度（0~1） */
  overlayStrength: number;
  /** 指针局部凸起强度（像素，0 = 关闭） */
  pointerStrength: number;
  /** 液面流动幅度（像素，0 = 完全静止） */
  flow: number;
  /** 液面流动速度 */
  flowSpeed: number;
  /** 设备像素比上限：折射偏移按设备像素算，dpr 过高会白烧填充率 */
  maxDpr: number;

  /* ---- 以下仅 mode="holo"（无底图的全息玻璃，用在小按钮上）使用 ---- */

  /** 流场密度：越大花纹越碎 */
  fieldScale: number;
  /** 焦散对比：内部流动亮纹的强度 */
  causticStrength: number;
  /** 色散弧强度：边缘那道彩虹带 */
  rainbowStrength: number;
  /** 色散弧方向（弧度） */
  rainbowAngle: number;
  /** 色散弧宽度（CSS 像素）：只贴在外圈，不进中心 */
  arcWidth: number;
  /** 基础不透明度（0~1）：小按钮要能透出后面的侧栏底色，取 0.3 上下 */
  alpha: number;
  /** 边缘额外不透明度：玻璃边比中心实，做出「壁厚」 */
  rimAlpha: number;
  /** 是否暗色主题：决定玻璃底色是「乳白」还是「深色」 */
  dark: boolean;
}

export const DEFAULT_LIQUID_GLASS_PARAMS: LiquidGlassParams = {
  cornerRadius: 16,
  autoCornerRadius: true,
  ior: 1.12,
  thickness: 40,
  normalStrength: 6.4,
  displacementScale: 1,
  heightTransitionWidth: 26,
  sminSmoothing: 20,
  blurRadius: 1.2,
  highlightWidth: 3.5,
  edgeLift: 0.34,
  edgeFalloff: 1,
  overlayStrength: 0.15,
  pointerStrength: 5,
  flow: 2.4,
  flowSpeed: 0.22,
  maxDpr: 1.5,
  fieldScale: 3,
  causticStrength: 0.55,
  rainbowStrength: 0.6,
  rainbowAngle: 2.3,
  arcWidth: 2.5,
  alpha: 1,
  rimAlpha: 0,
  dark: false,
};

/**
 * 两种用法：
 *  - "image"：折射一张底图（Hero 横幅这类「玻璃罩在有图上」的场景）；
 *  - "holo" ：不改写背景，直接合成「全息玻璃」本身 —— 流动焦散 + 边缘色散弧 +
 *             镜面高光，底面按主题取乳白/深色。侧边栏图标按钮这类
 *             「背景动态、没有一个静态底图可折射」的场景走这条。
 */
export type LiquidGlassMode = "image" | "holo";

export interface LiquidGlassOptions {
  /** 承载玻璃的 canvas：CSS 尺寸即玻璃形状 */
  canvas: HTMLCanvasElement;
  /** 渲染模式，默认 image */
  mode?: LiquidGlassMode;
  /**
   * 底图：URL 或已解码的 img / video（同源资源不要设 crossOrigin，避免二次握手）。
   * mode="holo" 可以不传 —— 全息玻璃不改写背景，不需要纹理。
   */
  source?: string | HTMLImageElement | HTMLVideoElement;
  /** 覆盖默认参数 */
  params?: Partial<LiquidGlassParams>;
  /** 是否跟随指针（指针在玻璃内移动时产生局部凸起） */
  interactive?: boolean;
  /** 首帧渲染完成后回调 */
  onReady?: () => void;
  /** 降级回调：webgl-unavailable / shader-error / image-error */
  onError?: (reason: string) => void;
}

export interface LiquidGlassHandle {
  /** 停掉渲染循环并释放 GL 资源（调用后画布保持最后一帧） */
  destroy: () => void;
  /** 热更新参数（主题切换等），不需要重建 GL 上下文 */
  update: (patch: Partial<LiquidGlassParams>) => void;
}

/* ------------------------------------------------------------------ *
 * 着色器
 * ------------------------------------------------------------------ */

/*
 * 顶点着色器：一个铺满 canvas 的方片。
 * a_position 是 -0.5..0.5 的单位方片；screenPos 是「左上为原点、单位为设备像素」
 * 的画布坐标，v_shapeCoord 是相对玻璃中心的归一化坐标（-0.5..0.5），
 * v_imageCoord 是按底图 object-fit: cover 换算好的 UV。
 */
const VERTEX_SHADER = [
  "attribute vec2 a_position;",
  "uniform vec2 u_size;      // 画布设备像素尺寸（= 玻璃尺寸）",
  "uniform vec4 u_cover;     // 底图 cover 映射：(1/绘制宽, 1/绘制高, 裁切偏移x, 裁切偏移y)",
  "varying vec2 v_shapeCoord;",
  "varying vec2 v_imageCoord;",
  "void main() {",
  "  vec2 screenPos = (a_position + 0.5) * u_size;",
  "  vec2 clip = (screenPos / u_size) * 2.0 - 1.0;",
  "  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);",
  "  v_shapeCoord = a_position;",
  "  v_imageCoord = (screenPos + u_cover.zw) * u_cover.xy;",
  "}",
].join("\n");

/*
 * 片元着色器。
 * 高度场 h∈[0,1]：玻璃中心为 1、边界处快速降到 0；对 h 求梯度得到「表面倾斜」，
 * 当作法线用，再走两次折射（进玻璃 / 出玻璃）得到采样偏移。
 */
const FRAGMENT_SHADER = [
  "precision highp float;",
  "uniform sampler2D u_texture;",
  "uniform vec2 u_size;                 // 玻璃设备像素尺寸",
  "uniform float u_cornerRadius;        // 圆角半径（设备像素）",
  "uniform float u_ior;",
  "uniform float u_thickness;",
  "uniform float u_normalStrength;",
  "uniform float u_displacementScale;",
  "uniform float u_edgeWidth;           // 高度过渡带宽度（设备像素）",
  "uniform float u_smin;",
  "uniform float u_blurRadius;",
  "uniform float u_highlightWidth;",
  "uniform float u_edgeLift;",
  "uniform float u_edgeFalloff;",
  "uniform float u_overlay;",
  "uniform vec4 u_cover;                // 与顶点着色器一致：设备像素 → 底图 UV",
  "uniform vec2 u_pointer;              // 指针在玻璃内的归一化坐标（-0.5..0.5）",
  "uniform float u_pointerAmp;",
  "uniform float u_flow;                // 液面流动幅度（设备像素）",
  "uniform float u_time;",
  "uniform int u_mode;                  // 0 = 折射底图；1 = 全息玻璃（无底图）",
  "uniform float u_fieldScale;",
  "uniform float u_causticStrength;",
  "uniform float u_rainbowStrength;",
  "uniform float u_rainbowAngle;",
  "uniform float u_arcWidth;",
  "uniform float u_alpha;",
  "uniform float u_rimAlpha;",
  "uniform float u_dark;",
  "varying vec2 v_shapeCoord;",
  "varying vec2 v_imageCoord;",
  "",
  "// 多项式 smooth min / max（quartic），参考实现同款",
  "float smin(float a, float b, float k) {",
  "  if (k <= 0.0) return min(a, b);",
  "  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);",
  "  return mix(b, a, h) - k * h * (1.0 - h);",
  "}",
  "float smax(float a, float b, float k) {",
  "  if (k <= 0.0) return max(a, b);",
  "  float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);",
  "  return mix(b, a, h) + k * h * (1.0 - h);",
  "}",
  "",
  "// 圆角矩形 SDF；k>0 时对直边与圆角的接缝做平滑（参考实现的 sdRoundedBoxSmooth）",
  "float sdRoundedBox(vec2 p, vec2 b, float r, float k) {",
  "  vec2 q = abs(p) - b + r;",
  "  if (k <= 0.0) return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;",
  "  float termA = smax(q.x, q.y, k);",
  "  float termB = smin(termA, 0.0, k * 0.5);",
  "  vec2 qs = vec2(smax(q.x, 0.0, k), smax(q.y, 0.0, k));",
  "  return termB + length(qs) - r;",
  "}",
  "",
  "// SDF → 高度场：用 logistic 在边缘处快速跌落，得到「边缘薄、中间厚」的透镜",
  "float heightFromSdf(vec2 p, vec2 b, float r, float k, float w) {",
  "  float d = sdRoundedBox(p, b, r, k) / max(w, 0.001);",
  "  float h = 1.0 - 1.0 / (1.0 + exp(-d * 6.0));",
  "  return clamp(h, 0.0, 1.0);",
  "}",
  "",
  "float heightAt(vec2 shapeCoord, float r, float w) {",
  "  return heightFromSdf(shapeCoord * u_size, u_size * 0.5, r, u_smin, w);",
  "}",
  "",
  "// 流动加权噪声：三层错开相位的 value noise 叠加，输出 0..1 的连续场",
  "float hash(vec2 p) {",
  "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
  "}",
  "float vnoise(vec2 p) {",
  "  vec2 i = floor(p);",
  "  vec2 f = fract(p);",
  "  vec2 u = f * f * (3.0 - 2.0 * f);",
  "  float a = hash(i);",
  "  float b = hash(i + vec2(1.0, 0.0));",
  "  float c = hash(i + vec2(0.0, 1.0));",
  "  float d = hash(i + vec2(1.0, 1.0));",
  "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
  "}",
  "float fbm(vec2 p) {",
  "  float v = 0.0;",
  "  float amp = 0.55;",
  "  for (int i = 0; i < 3; i++) {",
  "    v += amp * vnoise(p);",
  "    p = p * 2.03 + vec2(11.3, 7.7);",
  "    amp *= 0.5;",
  "  }",
  "  return v;",
  "}",
  "",
  "// 全息玻璃本体：细密流动焦散 + 边缘色散弧 + 镜面高光，",
  "// 输出 rgb 与 alpha 分开 —— 中心要透（能看到后面的侧栏底色），边缘要实（壁厚）",
  "vec4 holoGlass(vec2 shapeCoord, vec2 grad, vec3 normal, float height, float dist, float rim) {",
  "  vec2 uv = shapeCoord * u_fieldScale + vec2(u_time * 0.06, u_time * -0.045);",
  "  // 取样点被折射拉开 = 肉眼看到的「流动」",
  "  uv += grad * 1.2;",
  "  float n1 = fbm(uv);",
  "  float n2 = fbm(uv * 2.1 + vec2(5.2, 1.3));",
  "  float flow01 = n1 * 0.62 + n2 * 0.38;",
  "",
  "  // 玻璃底色：亮色偏冷白、暗色偏深蓝灰",
  "  vec3 base = mix(vec3(1.0, 1.0, 1.0), vec3(0.42, 0.45, 0.52), u_dark);",
  "  // 焦散：细亮纹，围绕底色小幅起伏（幅度取小，避免糊成一块奶白）",
  "  base += (flow01 - 0.5) * u_causticStrength * height * mix(0.35, 0.5, u_dark);",
  "  // 厚度明暗：中间厚、边缘薄",
  "  base *= mix(0.97, 1.03, height);",
  "",
  "  // 镜面高光：法线指向左上时最亮（玻璃的「光斑」）",
  "  float spec = pow(max(dot(normal, normalize(vec3(-0.55, -0.75, 0.36))), 0.0), 3.0);",
  "  base += vec3(1.0) * spec * 0.3;",
  "",
  "  // 色散弧：只走在轮廓最外圈（abs(dist) < arcWidth），不脏中心",
  "  float band = smoothstep(u_arcWidth, 0.0, abs(dist));",
  "  vec2 dir = vec2(cos(u_rainbowAngle), sin(u_rainbowAngle));",
  "  float hue = dot(shapeCoord * u_size, dir) / (u_size.x + u_size.y) + 0.5;",
  "  vec3 rainbow = 0.5 + 0.5 * cos(6.2831853 * (hue + vec3(0.0, 0.33, 0.67)));",
  "  base += rainbow * band * u_rainbowStrength * mix(0.22, 0.34, u_dark);",
  "",
  "  // alpha：中心薄、边缘厚（rim 已含「贴边」权重）",
  "  float a = u_alpha + rim * u_rimAlpha;",
  "  return vec4(base, clamp(a, 0.0, 1.0));",
  "}",
  "",
  "void main() {",
  "  float radius = min(u_cornerRadius, min(u_size.x, u_size.y) * 0.5);",
  "  vec2 p = v_shapeCoord * u_size;",
  "",
  "  float dist = sdRoundedBox(p, u_size * 0.5, radius, u_smin);",
  "  // 边缘 1px 羽化：用 alpha 而不是 discard，圆角没有锯齿",
  "  float coverage = 1.0 - smoothstep(-0.5, 0.5, dist);",
  "  if (coverage <= 0.0) discard;",
  "",
  "  // 法线：对高度场做中心差分（步长 3 设备像素），得到表面梯度",
  "  vec2 px = 1.0 / u_size;",
  "  float hl = heightAt(v_shapeCoord - vec2(px.x * 1.5, 0.0), radius, u_edgeWidth);",
  "  float hr = heightAt(v_shapeCoord + vec2(px.x * 1.5, 0.0), radius, u_edgeWidth);",
  "  float hd = heightAt(v_shapeCoord - vec2(0.0, px.y * 1.5), radius, u_edgeWidth);",
  "  float hu = heightAt(v_shapeCoord + vec2(0.0, px.y * 1.5), radius, u_edgeWidth);",
  "  vec2 grad = vec2(hr - hl, hu - hd) / 3.0;",
  "  vec3 normal = normalize(vec3(-grad * u_normalStrength, 1.0));",
  "",
  "  // 折射：平行光沿 -z 入射，穿进玻璃再穿出，两段偏移合起来就是采样位移",
  "  vec3 incident = vec3(0.0, 0.0, -1.0);",
  "  vec3 inGlass = refract(incident, normal, 1.0 / u_ior);",
  "  vec3 outGlass = refract(inGlass, -normal, u_ior);",
  "  vec2 offsetPx = outGlass.xy * u_thickness * u_displacementScale;",
  "",
  "  // 液面：低频、沿形状坐标相位错开的缓慢漂移（静态时也保留形状感）",
  "  offsetPx += vec2(",
  "    sin(u_time + v_shapeCoord.y * 3.4),",
  "    cos(u_time * 0.83 + v_shapeCoord.x * 2.9)",
  "  ) * u_flow;",
  "",
  "  // 指针局部凸起：采样点向指针方向收拢 = 放大镜",
  "  vec2 d = v_shapeCoord - u_pointer;",
  "  float falloff = exp(-dot(d, d) * 22.0);",
  "  offsetPx += -normalize(d + vec2(1e-4)) * falloff * u_pointerAmp;",
  "",
  "  float height = heightAt(v_shapeCoord, radius, u_edgeWidth);",
  "  // 位移衰减：边缘处把位移收掉，避免把轮廓外的内容（底图暗角）拽成黑边",
  "  offsetPx *= mix(1.0, height, u_edgeFalloff);",
  "",
  "  // 边缘高光：贴着 SDF 等值线，按法线方向加权重（左上 / 右下更强）",
  "  float edgeDist = abs(dist);",
  "  float rim = 1.0 - smoothstep(0.0, max(u_highlightWidth, 0.001), edgeDist);",
  "  float directional = (normal.x * normal.y + 1.0) * 0.5;",
  "",
  "  // ---- 全息玻璃（无底图）：直接合成玻璃本体 ----",
  "  if (u_mode == 1) {",
  "    vec4 holo = holoGlass(v_shapeCoord, grad, normal, height, dist, rim);",
  "    // 边缘高光压在彩虹弧之上，做出「亮边」；同时把边上的 alpha 抬满",
  "    float rimLight = rim * directional;",
  "    holo.rgb = mix(holo.rgb, vec3(1.0), rimLight * 0.6);",
  "    holo.a = clamp(holo.a + rimLight * 0.45, 0.0, 1.0);",
  "    float a = holo.a * coverage;",
  "    gl_FragColor = vec4(holo.rgb * a, a);",
  "    return;",
  "  }",
  "",
  "  // ---- 折射底图 ----",
  "  vec2 uv = v_imageCoord + offsetPx * u_cover.xy;",
  "",
  "  vec3 color;",
  "  if (u_blurRadius > 0.001) {",
  "    // 磨砂：3x3 盒式模糊（参考实现的 unrolled 9 抽样）",
  "    vec2 t = u_cover.xy * u_blurRadius;",
  "    color = vec3(0.0);",
  "    color += texture2D(u_texture, uv + vec2(-t.x, -t.y)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(0.0, -t.y)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(t.x, -t.y)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(-t.x, 0.0)).rgb;",
  "    color += texture2D(u_texture, uv).rgb;",
  "    color += texture2D(u_texture, uv + vec2(t.x, 0.0)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(-t.x, t.y)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(0.0, t.y)).rgb;",
  "    color += texture2D(u_texture, uv + vec2(t.x, t.y)).rgb;",
  "    color /= 9.0;",
  "  } else {",
  "    color = texture2D(u_texture, uv).rgb;",
  "  }",
  "",
  "  // 乳白叠加：中心厚、边缘薄",
  "  color = mix(color, vec3(1.0), u_overlay * height);",
  "  // 边缘补偿：折射会把边缘压暗，往白色提一点，避免整块发灰",
  "  color = mix(color, vec3(1.0), u_edgeLift * (1.0 - height));",
  "  color = mix(color, vec3(1.0), rim * directional * 0.85);",
  "",
  "  // 预乘 alpha 输出（canvas 默认 premultipliedAlpha: true）",
  "  gl_FragColor = vec4(color * coverage, coverage);",
  "}",
].join("\n");

/* ------------------------------------------------------------------ *
 * 实现
 * ------------------------------------------------------------------ */

/** 同一张 canvas 上只允许存在一个实例（HMR / 重新挂载时先销毁旧的） */
const live = new WeakMap<HTMLCanvasElement, LiquidGlassHandle>();

/** 探测运行环境是否具备 WebGL（SSR 下恒为 false） */
export function isLiquidGlassSupported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 尊重系统「减少动态效果」：这类用户下玻璃保持静止（只留静态折射） */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createLiquidGlass(
  options: LiquidGlassOptions,
): LiquidGlassHandle | null {
  const { canvas, source } = options;
  const params: LiquidGlassParams = {
    ...DEFAULT_LIQUID_GLASS_PARAMS,
    ...(options.params ?? {}),
  };
  const reduced = prefersReducedMotion();
  const interactive = (options.interactive ?? true) && !reduced;
  if (reduced) params.flow = 0;

  live.get(canvas)?.destroy();

  const context = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    // 单次全屏 draw call，不需要 MSAA；边缘靠 alpha 羽化
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!context) {
    options.onError?.("webgl-unavailable");
    return null;
  }
  // 常量别名：闭包（frame / destroy）里 TS 无法保留 getContext 结果的非空收窄，
  // 这里用 const 绑定一次性钉死类型
  const gl: WebGLRenderingContext = context;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) {
    options.onError?.("shader-error");
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    options.onError?.("shader-error");
    return null;
  }
  gl.useProgram(program);

  const attribPosition = gl.getAttribLocation(program, "a_position");
  const uniform = (name: string) => gl.getUniformLocation(program, name);

  const uSize = uniform("u_size");
  const uCover = uniform("u_cover");
  const uTexture = uniform("u_texture");
  const uCornerRadius = uniform("u_cornerRadius");
  const uIor = uniform("u_ior");
  const uThickness = uniform("u_thickness");
  const uNormalStrength = uniform("u_normalStrength");
  const uDisplacementScale = uniform("u_displacementScale");
  const uEdgeWidth = uniform("u_edgeWidth");
  const uSmin = uniform("u_smin");
  const uBlurRadius = uniform("u_blurRadius");
  const uHighlightWidth = uniform("u_highlightWidth");
  const uEdgeLift = uniform("u_edgeLift");
  const uEdgeFalloff = uniform("u_edgeFalloff");
  const uOverlay = uniform("u_overlay");
  const uPointer = uniform("u_pointer");
  const uPointerAmp = uniform("u_pointerAmp");
  const uFlow = uniform("u_flow");
  const uTime = uniform("u_time");
  const uMode = uniform("u_mode");
  const uFieldScale = uniform("u_fieldScale");
  const uCausticStrength = uniform("u_causticStrength");
  const uRainbowStrength = uniform("u_rainbowStrength");
  const uRainbowAngle = uniform("u_rainbowAngle");
  const uArcWidth = uniform("u_arcWidth");
  const uAlpha = uniform("u_alpha");
  const uRimAlpha = uniform("u_rimAlpha");
  const uDark = uniform("u_dark");
  const mode: LiquidGlassMode = options.mode ?? "image";

  // 单位方片（两个三角形）
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(attribPosition);
  gl.vertexAttribPointer(attribPosition, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let alive = true;
  let ready = false;
  let raf = 0;
  let dirty = true;
  // 「这一帧必须重绘」：尺寸变化 / 底图上传 / 指针移动都会置位，
  // 否则在 flow=0 的静止分支里会被提前 return 掉，画面永远停在旧的一帧
  let needsDraw = true;
  let deviceW = 0;
  let deviceH = 0;
  let dpr = 1;
  let rectLeft = 0;
  let rectTop = 0;
  let textureW = 0;
  let textureH = 0;
  /** 实际使用的圆角（CSS 像素）：autoCornerRadius 下每帧从 computed style 量取 */
  let cornerRadius = params.cornerRadius;
  // 底图 object-fit: cover 的对位参数
  let coverX = 1;
  let coverY = 1;
  let coverOffX = 0;
  let coverOffY = 0;
  const pointer = { x: 0, y: 0, amp: 0 };
  const pointerTarget = { x: 0, y: 0, amp: 0 };

  function measure() {
    const rect = canvas.getBoundingClientRect();
    rectLeft = rect.left;
    rectTop = rect.top;
    if (params.autoCornerRadius) {
      // border-radius 可能是 "12px" / "999px" / "12px 12px 0px 0px"，
      // 只取第一个（左上）作代表；读不到就退回参数值
      const raw = getComputedStyle(canvas).borderTopLeftRadius;
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) cornerRadius = parsed;
    } else {
      cornerRadius = params.cornerRadius;
    }
    dpr = Math.min(window.devicePixelRatio || 1, params.maxDpr);
    deviceW = Math.max(1, Math.round(rect.width * dpr));
    deviceH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== deviceW || canvas.height !== deviceH) {
      canvas.width = deviceW;
      canvas.height = deviceH;
    }
    updateCover();
  }

  /** 复刻 CSS object-fit: cover 的映射（center 定位） */
  function updateCover() {
    if (!textureW || !textureH || !deviceW || !deviceH) return;
    const scale = Math.max(deviceW / textureW, deviceH / textureH);
    const drawnW = textureW * scale;
    const drawnH = textureH * scale;
    coverX = 1 / drawnW;
    coverY = 1 / drawnH;
    coverOffX = (drawnW - deviceW) / 2;
    coverOffY = (drawnH - deviceH) / 2;
  }

  function finish() {
    ready = true;
    dirty = true;
    needsDraw = true;
    markReady();
  }

  function upload(image: TexImageSource, width: number, height: number) {
    textureW = width;
    textureH = height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    updateCover();
    finish();
  }

  function fail(reason: string) {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    options.onError?.(reason);
  }

  const markReady = () => options.onReady?.();

  /* ---- 底图（holo 模式不需要，直接标记就绪） ---- */
  if (mode === "holo" || !source) {
    finish();
  } else if (typeof source === "string") {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      upload(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => fail("image-error");
    img.src = source;
  } else if (source instanceof HTMLVideoElement) {
    const uploadVideo = () => {
      if (!alive || !source.videoWidth) return;
      upload(source, source.videoWidth, source.videoHeight);
    };
    if (source.readyState >= 2) uploadVideo();
    else source.addEventListener("loadeddata", uploadVideo, { once: true });
  } else if (source.complete && source.naturalWidth) {
    upload(source, source.naturalWidth, source.naturalHeight);
  } else {
    source.addEventListener(
      "load",
      () => {
        if (alive && source.naturalWidth) {
          upload(source, source.naturalWidth, source.naturalHeight);
        }
      },
      { once: true },
    );
    source.addEventListener("error", () => fail("image-error"), { once: true });
  }

  /* ---- 尺寸/位置变化 ---- */
  const markDirty = () => {
    dirty = true;
    needsDraw = true;
  };
  const observer =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(markDirty);
  observer?.observe(canvas);
  /*
    滚出视口就停笔：玻璃只在首屏，往下读文章时没必要继续烧 GPU。
    用 IntersectionObserver 而不是 scroll 位置判断 —— 不产生额外布局读取。
  */
  let visible = true;
  const visibility =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          (entries) => {
            visible = entries.some((e) => e.isIntersecting);
            // 重新进入视口时补一帧（跳过期间尺寸可能已经变了）
            if (visible) {
              dirty = true;
              needsDraw = true;
            }
          },
          { rootMargin: "64px" },
        );
  visibility?.observe(canvas);
  window.addEventListener("resize", markDirty, { passive: true });
  // 滚动只影响指针坐标的换算基准，不改尺寸，但会让「脏」标记多走一次 measure
  window.addEventListener("scroll", markDirty, { passive: true });

  /* ---- 指针 ---- */
  const onPointerMove = (event: PointerEvent) => {
    if (!interactive || !deviceW || !deviceH) return;
    const x = (event.clientX - rectLeft) * dpr;
    const y = (event.clientY - rectTop) * dpr;
    // 玻璃外一律回落到「无指针」，尤其别让指针从侧栏经过时还拽着玻璃
    if (x < -40 || y < -40 || x > deviceW + 40 || y > deviceH + 40) {
      pointerTarget.amp = 0;
      return;
    }
    pointerTarget.x = x / deviceW - 0.5;
    pointerTarget.y = y / deviceH - 0.5;
    pointerTarget.amp = params.pointerStrength * dpr;
    needsDraw = true;
  };
  const onPointerLeave = () => {
    pointerTarget.amp = 0;
    needsDraw = true;
  };
  if (interactive) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });
  }

  /* ---- 渲染循环 ---- */
  const start = performance.now();
  function frame(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || !visible) return;

    if (dirty) {
      measure();
      dirty = false;
      needsDraw = true;
    }
    if (!ready || !deviceW || !deviceH) return;

    // 指针缓动：让凸起跟手但不抖
    pointer.x += (pointerTarget.x - pointer.x) * 0.18;
    pointer.y += (pointerTarget.y - pointer.y) * 0.18;
    pointer.amp += (pointerTarget.amp - pointer.amp) * 0.18;
    const settled =
      Math.abs(pointerTarget.amp - pointer.amp) < 0.05 &&
      Math.abs(pointerTarget.x - pointer.x) < 0.0005 &&
      Math.abs(pointerTarget.y - pointer.y) < 0.0005;
    // 静止（关闭流动 + 指针已停 + 无尺寸变化）时不必重绘，省电
    if (params.flow <= 0 && settled && pointer.amp < 0.05 && !needsDraw) return;
    needsDraw = false;

    gl.viewport(0, 0, deviceW, deviceH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(attribPosition);
    gl.vertexAttribPointer(attribPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexture, 0);
    gl.uniform2f(uSize, deviceW, deviceH);
    gl.uniform4f(uCover, coverX, coverY, coverOffX, coverOffY);
    gl.uniform1f(uCornerRadius, cornerRadius * dpr);
    gl.uniform1f(uIor, params.ior);
    gl.uniform1f(uThickness, params.thickness * dpr);
    gl.uniform1f(uNormalStrength, params.normalStrength);
    gl.uniform1f(uDisplacementScale, params.displacementScale);
    gl.uniform1f(uEdgeWidth, params.heightTransitionWidth * dpr);
    gl.uniform1f(uSmin, params.sminSmoothing);
    gl.uniform1f(uBlurRadius, params.blurRadius * dpr);
    gl.uniform1f(uHighlightWidth, params.highlightWidth * dpr);
    gl.uniform1f(uEdgeLift, params.edgeLift);
    gl.uniform1f(uEdgeFalloff, params.edgeFalloff);
    gl.uniform1f(uOverlay, params.overlayStrength);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uPointerAmp, pointer.amp);
    gl.uniform1f(uFlow, params.flow * dpr);
    // u_time 已经把 flowSpeed 折进去：着色器里就不再单独传速度，少一个 uniform
    gl.uniform1f(uTime, ((now - start) / 1000) * params.flowSpeed);
    gl.uniform1i(uMode, mode === "holo" ? 1 : 0);
    gl.uniform1f(uFieldScale, params.fieldScale);
    gl.uniform1f(uCausticStrength, params.causticStrength);
    gl.uniform1f(uRainbowStrength, params.rainbowStrength);
    gl.uniform1f(uRainbowAngle, params.rainbowAngle);
    gl.uniform1f(uArcWidth, params.arcWidth * dpr);
    gl.uniform1f(uAlpha, params.alpha);
    gl.uniform1f(uRimAlpha, params.rimAlpha);
    gl.uniform1f(uDark, params.dark ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  raf = requestAnimationFrame(frame);

  const handle: LiquidGlassHandle = {
    destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      visibility?.disconnect();
      window.removeEventListener("resize", markDirty);
      window.removeEventListener("scroll", markDirty);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      gl.deleteBuffer(quad);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (live.get(canvas) === handle) live.delete(canvas);
    },
    update(patch) {
      Object.assign(params, patch);
      dirty = true;
      needsDraw = true;
    },
  };
  live.set(canvas, handle);
  return handle;
}
