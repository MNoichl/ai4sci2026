import {
  ShaderMount,
  ShaderFitOptions,
  getShaderColorFromString,
  getShaderNoiseTexture,
  halftoneDotsFragmentShader,
  halftoneCmykFragmentShader,
  HalftoneDotsTypes,
  HalftoneDotsGrids,
  HalftoneCmykTypes,
} from "https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.71/dist/index.js";

const HALFTONE_SELECTOR = ".gp-halftone";

// Presets include:
// 1) Official Paper Shaders defaults/examples.
// 2) Extra Grid Protocol curated looks.
const HALFTONE_DOTS_PRESETS = Object.freeze({
  // Official presets
  default: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#f2f1e8",
    colorFront: "#2b2b2b",
    size: 0.5,
    radius: 1.25,
    contrast: 0.4,
    originalColors: false,
    inverted: false,
    grainMixer: 0.2,
    grainOverlay: 0.2,
    grainSize: 0.5,
    grid: "hex",
    type: "gooey",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  led: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#000000",
    colorFront: "#29ff7b",
    size: 0.5,
    radius: 1.5,
    contrast: 0.3,
    originalColors: false,
    inverted: false,
    grainMixer: 0,
    grainOverlay: 0,
    grainSize: 0.5,
    grid: "square",
    type: "soft",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  mosaic: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#000000",
    colorFront: "#b2aeae",
    size: 0.6,
    radius: 2,
    contrast: 0.01,
    originalColors: true,
    inverted: false,
    grainMixer: 0,
    grainOverlay: 0,
    grainSize: 0.5,
    grid: "hex",
    type: "classic",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  roundSquare: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#141414",
    colorFront: "#ff8000",
    size: 0.8,
    radius: 1,
    contrast: 1,
    originalColors: false,
    inverted: true,
    grainMixer: 0.05,
    grainOverlay: 0.3,
    grainSize: 0.5,
    grid: "square",
    type: "holes",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),

  // Grid Protocol custom presets
  blueprint: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#102131",
    colorFront: "#d6e8f6",
    size: 0.38,
    radius: 1.55,
    contrast: 0.62,
    originalColors: false,
    inverted: false,
    grainMixer: 0.08,
    grainOverlay: 0.06,
    grainSize: 0.35,
    grid: "square",
    type: "classic",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  xray: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#111820",
    colorFront: "#7ad3ff",
    size: 0.56,
    radius: 1.8,
    contrast: 0.45,
    originalColors: false,
    inverted: true,
    grainMixer: 0.12,
    grainOverlay: 0.28,
    grainSize: 0.55,
    grid: "hex",
    type: "soft",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  stencil: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#f4f1e8",
    colorFront: "#111111",
    size: 0.78,
    radius: 1.05,
    contrast: 1,
    originalColors: false,
    inverted: true,
    grainMixer: 0.03,
    grainOverlay: 0.18,
    grainSize: 0.45,
    grid: "square",
    type: "holes",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
});

const HALFTONE_CMYK_PRESETS = Object.freeze({
  // Official presets
  default: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#fbfaf5",
    colorC: "#00b4ff",
    colorM: "#fc519f",
    colorY: "#ffd800",
    colorK: "#231f20",
    size: 0.2,
    contrast: 1,
    softness: 1,
    grainSize: 0.5,
    grainMixer: 0,
    grainOverlay: 0,
    gridNoise: 0.2,
    floodC: 0.15,
    floodM: 0,
    floodY: 0,
    floodK: 0,
    gainC: 0.3,
    gainM: 0,
    gainY: 0.2,
    gainK: 0,
    type: "ink",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  drops: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#eeefd7",
    colorC: "#00b2ff",
    colorM: "#fc4f4f",
    colorY: "#ffd900",
    colorK: "#231f20",
    size: 0.88,
    contrast: 1.15,
    softness: 0,
    grainSize: 0.01,
    grainMixer: 0.05,
    grainOverlay: 0.25,
    gridNoise: 0.5,
    floodC: 0.15,
    floodM: 0,
    floodY: 0,
    floodK: 0,
    gainC: 1,
    gainM: 0.44,
    gainY: -1,
    gainK: 0,
    type: "ink",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  newspaper: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#f2f1e8",
    colorC: "#7a7a75",
    colorM: "#7a7a75",
    colorY: "#7a7a75",
    colorK: "#231f20",
    size: 0.01,
    contrast: 2,
    softness: 0.2,
    grainSize: 0,
    grainMixer: 0,
    grainOverlay: 0.2,
    gridNoise: 0.6,
    floodC: 0,
    floodM: 0,
    floodY: 0,
    floodK: 0.1,
    gainC: -0.17,
    gainM: -0.45,
    gainY: -0.45,
    gainK: 0,
    type: "dots",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  vintage: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#fffaf0",
    colorC: "#59afc5",
    colorM: "#d8697c",
    colorY: "#fad85c",
    colorK: "#2d2824",
    size: 0.2,
    contrast: 1.25,
    softness: 0.4,
    grainSize: 0.5,
    grainMixer: 0.15,
    grainOverlay: 0.1,
    gridNoise: 0.45,
    floodC: 0.15,
    floodM: 0,
    floodY: 0,
    floodK: 0,
    gainC: 0.3,
    gainM: 0,
    gainY: 0.2,
    gainK: 0,
    type: "sharp",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),

  // Grid Protocol custom presets
  risograph: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#f7f3e9",
    colorC: "#2f77ff",
    colorM: "#ff4f7a",
    colorY: "#ffcb35",
    colorK: "#1a1c22",
    size: 0.34,
    contrast: 1.12,
    softness: 0.55,
    grainSize: 0.4,
    grainMixer: 0.08,
    grainOverlay: 0.12,
    gridNoise: 0.32,
    floodC: 0.2,
    floodM: -0.05,
    floodY: 0.06,
    floodK: -0.02,
    gainC: 0.65,
    gainM: 0.2,
    gainY: 0.35,
    gainK: 0,
    type: "ink",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  noirPress: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#efede4",
    colorC: "#4d5862",
    colorM: "#4d5862",
    colorY: "#4d5862",
    colorK: "#111111",
    size: 0.08,
    contrast: 1.6,
    softness: 0.15,
    grainSize: 0.12,
    grainMixer: 0.1,
    grainOverlay: 0.22,
    gridNoise: 0.45,
    floodC: 0,
    floodM: 0,
    floodY: 0,
    floodK: 0.08,
    gainC: -0.3,
    gainM: -0.3,
    gainY: -0.3,
    gainK: 0.25,
    type: "dots",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
  toxicPop: Object.freeze({
    fit: "cover",
    speed: 0,
    frame: 0,
    colorBack: "#fff6d8",
    colorC: "#02d1ff",
    colorM: "#ff2db5",
    colorY: "#ffea00",
    colorK: "#201f1f",
    size: 0.46,
    contrast: 1.3,
    softness: 0.22,
    grainSize: 0.3,
    grainMixer: 0.12,
    grainOverlay: 0.18,
    gridNoise: 0.55,
    floodC: 0.22,
    floodM: 0.08,
    floodY: 0.05,
    floodK: -0.06,
    gainC: 0.8,
    gainM: 0.5,
    gainY: 0.35,
    gainK: -0.1,
    type: "sharp",
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  }),
});

const DOT_PRESET_ALIASES = Object.freeze({
  "": "default",
  default: "default",
  led: "led",
  net: "mosaic",
  mosaic: "mosaic",
  "round-and-square": "roundSquare",
  "round-and-squares": "roundSquare",
  roundsquare: "roundSquare",
  blueprint: "blueprint",
  "blue-print": "blueprint",
  xray: "xray",
  "x-ray": "xray",
  stencil: "stencil",
});

const CMYK_PRESET_ALIASES = Object.freeze({
  "": "default",
  default: "default",
  drops: "drops",
  newspaper: "newspaper",
  vintage: "vintage",
  risograph: "risograph",
  "riso-graph": "risograph",
  noir: "noirPress",
  noirpress: "noirPress",
  "noir-press": "noirPress",
  toxic: "toxicPop",
  toxicpop: "toxicPop",
  "toxic-pop": "toxicPop",
});

const LEGACY_PRESET_OVERRIDES = Object.freeze({
  fine: Object.freeze({ size: 0.4, radius: 1.2 }),
  coarse: Object.freeze({ size: 0.75, radius: 1.5, grainMixer: 0.1 }),
  lite: Object.freeze({ contrast: 0.24, grainOverlay: 0.08, grainMixer: 0.05 }),
  dense: Object.freeze({ contrast: 0.55, radius: 1.5, grainMixer: 0.25 }),
});

const halftoneState = new WeakMap();
let sharedNoiseTexture;

function parseNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function parseJson(jsonValue) {
  if (!jsonValue) return {};
  try {
    const parsed = JSON.parse(jsonValue);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // Invalid JSON should not break the deck.
  }
  return {};
}

function normalizeMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "cmyk" || normalized === "multi" || normalized === "halftone-cmyk") return "cmyk";
  return "dots";
}

function getLegacyMode(element) {
  if (element.classList.contains("gp-halftone--multi")) return "cmyk";
  return "dots";
}

function getLegacyOverrides(element) {
  const merged = {};
  if (element.classList.contains("gp-halftone--fine")) Object.assign(merged, LEGACY_PRESET_OVERRIDES.fine);
  if (element.classList.contains("gp-halftone--coarse")) Object.assign(merged, LEGACY_PRESET_OVERRIDES.coarse);
  if (element.classList.contains("gp-halftone--lite")) Object.assign(merged, LEGACY_PRESET_OVERRIDES.lite);
  if (element.classList.contains("gp-halftone--dense")) Object.assign(merged, LEGACY_PRESET_OVERRIDES.dense);
  return merged;
}

function normalizePreset(mode, presetRaw) {
  const normalized = String(presetRaw || "").trim().toLowerCase();
  if (mode === "cmyk") return CMYK_PRESET_ALIASES[normalized] || "default";
  return DOT_PRESET_ALIASES[normalized] || "default";
}

function getPreset(mode, presetName) {
  if (mode === "cmyk") return HALFTONE_CMYK_PRESETS[presetName] || HALFTONE_CMYK_PRESETS.default;
  return HALFTONE_DOTS_PRESETS[presetName] || HALFTONE_DOTS_PRESETS.default;
}

function findImageNode(element) {
  return element.querySelector("img[data-src], img");
}

function promoteLazyImageSource(imageNode) {
  if (!(imageNode instanceof HTMLImageElement)) return;
  const src = (imageNode.getAttribute("src") || "").trim();
  const lazy = (imageNode.dataset.src || "").trim();
  if (!src && lazy) {
    imageNode.setAttribute("src", lazy);
  }
}

async function waitForImage(imageNode) {
  if (!imageNode) return;
  promoteLazyImageSource(imageNode);
  if (imageNode.complete && imageNode.naturalWidth > 0) return;
  await new Promise((resolve, reject) => {
    const onLoad = () => {
      imageNode.removeEventListener("load", onLoad);
      imageNode.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      imageNode.removeEventListener("load", onLoad);
      imageNode.removeEventListener("error", onError);
      reject(new Error(`Failed to load image: ${imageNode.currentSrc || imageNode.src}`));
    };
    imageNode.addEventListener("load", onLoad, { once: true });
    imageNode.addEventListener("error", onError, { once: true });
  });
}

async function getNoiseTexture() {
  if (!sharedNoiseTexture) sharedNoiseTexture = getShaderNoiseTexture();
  if (sharedNoiseTexture) await waitForImage(sharedNoiseTexture);
  return sharedNoiseTexture;
}

function readConfig(element) {
  const mode = normalizeMode(element.dataset.gpHalftone || getLegacyMode(element));
  const presetName = normalizePreset(mode, element.dataset.gpPreset);
  const preset = getPreset(mode, presetName);
  const options = {
    ...preset,
    ...getLegacyOverrides(element),
    ...parseJson(element.dataset.gpOptions),
  };

  // Quick override for fit without editing JSON.
  if (element.dataset.gpFit) options.fit = element.dataset.gpFit;

  const speed = parseNumber(element.dataset.gpSpeed, parseNumber(options.speed, 0));
  const frame = parseNumber(element.dataset.gpFrame, parseNumber(options.frame, 0));
  const minPixelRatio = parseNumber(element.dataset.gpMinPixelRatio, Number.NaN);
  const maxPixelCount = parseNumber(element.dataset.gpMaxPixelCount, Number.NaN);

  return {
    mode,
    presetName,
    options,
    speed,
    frame,
    minPixelRatio: Number.isFinite(minPixelRatio) ? minPixelRatio : undefined,
    maxPixelCount: Number.isFinite(maxPixelCount) ? maxPixelCount : undefined,
  };
}

function getSafePixelBudgets(element, minPixelRatioRaw, maxPixelCountRaw) {
  if (Number.isFinite(minPixelRatioRaw) || Number.isFinite(maxPixelCountRaw)) {
    return {
      minPixelRatio: Number.isFinite(minPixelRatioRaw) ? minPixelRatioRaw : undefined,
      maxPixelCount: Number.isFinite(maxPixelCountRaw) ? maxPixelCountRaw : undefined,
    };
  }

  const rect = element.getBoundingClientRect();
  const cssPixels = Math.max(1, rect.width * rect.height);
  const dpr = clampNumber(window.devicePixelRatio || 1, 1, 2);
  const desired = cssPixels * dpr * dpr;
  const defaultMax = 1_300_000;
  const maxPixelCount = Math.max(400_000, Math.min(defaultMax, Math.floor(desired)));
  return { minPixelRatio: 1, maxPixelCount };
}

function getSizingUniforms(options) {
  const fitName = String(options.fit || "cover");
  return {
    u_fit: ShaderFitOptions[fitName] ?? ShaderFitOptions.cover,
    u_rotation: parseNumber(options.rotation, 0),
    u_scale: parseNumber(options.scale, 1),
    u_offsetX: parseNumber(options.offsetX, 0),
    u_offsetY: parseNumber(options.offsetY, 0),
    u_originX: parseNumber(options.originX, 0.5),
    u_originY: parseNumber(options.originY, 0.5),
    u_worldWidth: parseNumber(options.worldWidth, 0),
    u_worldHeight: parseNumber(options.worldHeight, 0),
  };
}

function getDotsUniforms(imageNode, options) {
  const typeName = String(options.type || "gooey");
  const gridName = String(options.grid || "hex");
  return {
    u_image: imageNode,
    u_colorFront: getShaderColorFromString(String(options.colorFront || "#2b2b2b")),
    u_colorBack: getShaderColorFromString(String(options.colorBack || "#f2f1e8")),
    u_size: parseNumber(options.size, 0.5),
    u_radius: parseNumber(options.radius, 1.25),
    u_contrast: parseNumber(options.contrast, 0.4),
    u_originalColors: parseBoolean(options.originalColors, false),
    u_inverted: parseBoolean(options.inverted, false),
    u_grainMixer: parseNumber(options.grainMixer, 0.2),
    u_grainOverlay: parseNumber(options.grainOverlay, 0.2),
    u_grainSize: parseNumber(options.grainSize, 0.5),
    u_grid: HalftoneDotsGrids[gridName] ?? HalftoneDotsGrids.hex,
    u_type: HalftoneDotsTypes[typeName] ?? HalftoneDotsTypes.gooey,
    ...getSizingUniforms(options),
  };
}

async function getCmykUniforms(imageNode, options) {
  const typeName = String(options.type || "ink");
  return {
    u_image: imageNode,
    u_noiseTexture: await getNoiseTexture(),
    u_colorBack: getShaderColorFromString(String(options.colorBack || "#fbfaf5")),
    u_colorC: getShaderColorFromString(String(options.colorC || "#00b4ff")),
    u_colorM: getShaderColorFromString(String(options.colorM || "#fc519f")),
    u_colorY: getShaderColorFromString(String(options.colorY || "#ffd800")),
    u_colorK: getShaderColorFromString(String(options.colorK || "#231f20")),
    u_size: parseNumber(options.size, 0.2),
    u_contrast: parseNumber(options.contrast, 1),
    u_softness: parseNumber(options.softness, 1),
    u_grainSize: parseNumber(options.grainSize, 0.5),
    u_grainMixer: parseNumber(options.grainMixer, 0),
    u_grainOverlay: parseNumber(options.grainOverlay, 0),
    u_gridNoise: parseNumber(options.gridNoise, 0.2),
    u_floodC: parseNumber(options.floodC, 0.15),
    u_floodM: parseNumber(options.floodM, 0),
    u_floodY: parseNumber(options.floodY, 0),
    u_floodK: parseNumber(options.floodK, 0),
    u_gainC: parseNumber(options.gainC, 0.3),
    u_gainM: parseNumber(options.gainM, 0),
    u_gainY: parseNumber(options.gainY, 0.2),
    u_gainK: parseNumber(options.gainK, 0),
    u_type: HalftoneCmykTypes[typeName] ?? HalftoneCmykTypes.ink,
    ...getSizingUniforms(options),
  };
}

function getFragmentShader(mode) {
  return mode === "cmyk" ? halftoneCmykFragmentShader : halftoneDotsFragmentShader;
}

function setFallbackImageFit(imageNode, fit) {
  const normalized = String(fit || "").toLowerCase();
  if (normalized === "contain" || normalized === "cover") {
    imageNode.style.objectFit = normalized;
  }
}

function restoreFallbackImageVisibility(imageNode) {
  if (!(imageNode instanceof HTMLImageElement)) return;
  imageNode.style.display = "block";
  imageNode.style.visibility = "visible";
  imageNode.style.opacity = "1";
}

function clearErrorState(element) {
  element.classList.remove("gp-halftone--error");
}

function setErrorState(element) {
  element.classList.add("gp-halftone--error");
  element.classList.remove("gp-halftone--ready");
}

function disposeState(element) {
  const imageNode = findImageNode(element);
  const current = halftoneState.get(element);
  if (current && current.mount) {
    current.mount.dispose();
  }
  restoreFallbackImageVisibility(imageNode);
  halftoneState.delete(element);
}

export function disposeHalftoneElement(element) {
  disposeState(element);
  if (element instanceof HTMLElement) element.classList.remove("gp-halftone--ready");
}

export async function mountHalftoneElement(element) {
  if (!(element instanceof HTMLElement)) return null;
  const imageNode = findImageNode(element);
  if (!(imageNode instanceof HTMLImageElement)) return null;

  clearErrorState(element);
  restoreFallbackImageVisibility(imageNode);
  setFallbackImageFit(imageNode, element.dataset.gpFit);

  try {
    await waitForImage(imageNode);
    const config = readConfig(element);
    setFallbackImageFit(imageNode, config.options.fit);

    const uniforms =
      config.mode === "cmyk" ? await getCmykUniforms(imageNode, config.options) : getDotsUniforms(imageNode, config.options);
    const safeBudgets = getSafePixelBudgets(element, config.minPixelRatio, config.maxPixelCount);

    // Rebuild mount each time to avoid stale zero-sized canvases after layout/view changes.
    disposeState(element);
    const mount = new ShaderMount(
      element,
      getFragmentShader(config.mode),
      uniforms,
      undefined,
      config.speed,
      config.frame,
      safeBudgets.minPixelRatio,
      safeBudgets.maxPixelCount,
    );
    halftoneState.set(element, { mode: config.mode, mount });
    element.classList.add("gp-halftone--ready");
    return mount;
  } catch (error) {
    console.error("Grid Protocol halftone mount failed:", error);
    setErrorState(element);
    restoreFallbackImageVisibility(imageNode);
    disposeState(element);
    return null;
  }
}

export async function mountAllHalftones(root = document) {
  if (!root) return [];
  const targets = Array.from(root.querySelectorAll(HALFTONE_SELECTOR));
  const mounted = await Promise.all(targets.map((target) => mountHalftoneElement(target)));
  return mounted.filter(Boolean);
}

export const gpHalftoneDotsPresets = HALFTONE_DOTS_PRESETS;
export const gpHalftoneCmykPresets = HALFTONE_CMYK_PRESETS;

if (typeof window !== "undefined") {
  const boot = () => {
    mountAllHalftones().catch((error) => {
      console.error("Grid Protocol halftone init failed:", error);
    });
  };

  let remountScheduled = false;
  let delayedBootTimerA;
  let delayedBootTimerB;
  const observedHalftones = new WeakSet();
  let halftoneResizeObserver = null;

  const scheduleBoot = () => {
    if (remountScheduled) return;
    remountScheduled = true;
    requestAnimationFrame(() => {
      remountScheduled = false;
      boot();
    });
  };

  const scheduleBootBurst = () => {
    scheduleBoot();
    window.clearTimeout(delayedBootTimerA);
    window.clearTimeout(delayedBootTimerB);
    delayedBootTimerA = window.setTimeout(scheduleBoot, 90);
    delayedBootTimerB = window.setTimeout(scheduleBoot, 260);
  };

  const ensureResizeObserver = () => {
    if (halftoneResizeObserver || typeof ResizeObserver === "undefined") return;
    halftoneResizeObserver = new ResizeObserver(() => {
      scheduleBoot();
    });
  };

  const observeHalftoneTargets = () => {
    ensureResizeObserver();
    if (!halftoneResizeObserver) return;
    const targets = Array.from(document.querySelectorAll(HALFTONE_SELECTOR));
    targets.forEach((target) => {
      if (observedHalftones.has(target)) return;
      observedHalftones.add(target);
      halftoneResizeObserver.observe(target);
    });
  };

  const mountCurrentRevealSlide = (event) => {
    observeHalftoneTargets();
    const reveal = window.Reveal;
    if (!reveal) {
      scheduleBootBurst();
      return;
    }
    const fromEvent = event && event.currentSlide instanceof HTMLElement ? event.currentSlide : null;
    const currentSlide = fromEvent || (typeof reveal.getCurrentSlide === "function" ? reveal.getCurrentSlide() : null);
    if (currentSlide instanceof HTMLElement) {
      mountAllHalftones(currentSlide).catch((error) => {
        console.error("Grid Protocol halftone remount failed:", error);
      });
      window.clearTimeout(delayedBootTimerA);
      delayedBootTimerA = window.setTimeout(() => {
        mountAllHalftones(currentSlide).catch((error) => {
          console.error("Grid Protocol delayed halftone remount failed:", error);
        });
      }, 120);
      return;
    }
    scheduleBootBurst();
  };

  const bindRevealHooks = () => {
    const reveal = window.Reveal;
    if (!reveal || typeof reveal.on !== "function") return false;
    reveal.on("ready", mountCurrentRevealSlide);
    reveal.on("slidechanged", mountCurrentRevealSlide);
    reveal.on("resize", mountCurrentRevealSlide);
    return true;
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", observeHalftoneTargets, { once: true });
    window.addEventListener("DOMContentLoaded", scheduleBootBurst, { once: true });
    window.addEventListener("DOMContentLoaded", bindRevealHooks, { once: true });
  } else {
    // Dynamic import may happen after DOMContentLoaded already fired.
    queueMicrotask(observeHalftoneTargets);
    queueMicrotask(scheduleBootBurst);
    queueMicrotask(bindRevealHooks);
  }

  // Keep canvases in sync for scroll mode and viewport changes.
  window.addEventListener("resize", scheduleBootBurst, { passive: true });
  window.addEventListener("load", scheduleBootBurst, { once: true });
}
