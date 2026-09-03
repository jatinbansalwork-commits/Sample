/**
 * Vanilla web adapter for Klear360 Spark.
 * Reuses KlearGlassMount + FluidGradientMount — does not rebuild the shaders.
 */
import { KlearGlassMount } from "../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/KlearGlassMount.ts";
import { FluidGradientMount } from "../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearSenseGradient/FluidGradientMount.ts";
import {
  preloadKlearSenseAssets,
  getDefaultAssets,
  getPresetAssets,
  resolveConfig,
} from "../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/utils.ts";

const FADE_IN_MS = 200;
const CANVAS_SCALE = 1.4;
const DEFAULT_ASSETS_PATH = "./assets/spark";

const MASKS = {
  klear: {
    d: "M5 3H8V10.8L15 3H19L11 11.5L19.4 21H15.4L8 12.6V21H5V3Z",
    viewBox: "0 0 24 24",
    fillRule: "evenodd",
  },
  ray: {
    d: "M3 3H7.5H9.74999L12 12L14.25 3H16.5H21V7.5V9.75L12 12L21 14.25V16.5V21H16.5H14.25L12 12L9.74999 21H7.5H3V16.5V14.25L12 12L3 9.75V7.5V3Z",
    viewBox: "0 0 24 24",
  },
  check: {
    d: "M20.7071 5.29289C21.0976 5.68342 21.0976 6.31658 20.7071 6.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L3.29289 12.7071C2.90237 12.3166 2.90237 11.6834 3.29289 11.2929C3.68342 10.9024 4.31658 10.9024 4.70711 11.2929L9 15.5858L19.2929 5.29289C19.6834 4.90237 20.3166 4.90237 20.7071 5.29289Z",
    viewBox: "0 0 24 24",
  },
};

function cssSize(value, fallback) {
  if (value == null) return fallback;
  return typeof value === "number" ? `${value}px` : String(value);
}

function parseViewBoxSize(viewBox, dim) {
  const parts = String(viewBox || "0 0 24 24")
    .trim()
    .split(/[\s,]+/);
  const val = dim === "w" ? parseFloat(parts[2]) : parseFloat(parts[3]);
  return val > 0 ? val : 24;
}

async function preload(preset = "default", assetsPath = DEFAULT_ASSETS_PATH, colorScheme = "light") {
  return preloadKlearSenseAssets(preset, assetsPath, colorScheme);
}

async function mountKlearSense(parent, props = {}) {
  if (!parent) {
    throw new Error("KlearSense: parent element is required");
  }

  const {
    width = "100%",
    height = "100%",
    className = "",
    style = {},
    onLoad,
    onError,
    assetsPath = DEFAULT_ASSETS_PATH,
    gradientMapCanvas,
    ...rest
  } = props;

  const host = document.createElement("div");
  host.className = ["kn-klear-sense", className].filter(Boolean).join(" ");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    width: cssSize(width, "100%"),
    height: cssSize(height, "100%"),
    position: "relative",
    overflow: "hidden",
    backgroundColor: "transparent",
    opacity: "0",
    transition: `${FADE_IN_MS}ms opacity`,
    pointerEvents: "none",
    ...style,
  });
  parent.appendChild(host);

  const isDark = document.documentElement.dataset.colorScheme === "dark";
  const defaultAssets = getDefaultAssets(assetsPath);
  const presetAssets = getPresetAssets(rest.preset, assetsPath, isDark);
  const imageSrc = rest.imageSrc ?? presetAssets.imageSrc;
  const videoSrc = imageSrc ? undefined : presetAssets.videoSrc ?? defaultAssets.videoSrc;
  const gradientMapSrc = rest.gradientMapSrc ?? presetAssets.gradientMapSrc ?? defaultAssets.gradientMapSrc;
  const gradientMap2Src = rest.gradientMap2Src ?? presetAssets.gradientMap2Src ?? defaultAssets.gradientMap2Src;
  const centerGradientMapSrc = presetAssets.centerGradientMapSrc ?? defaultAssets.centerGradientMapSrc;
  const config = resolveConfig({ ...rest, assetsPath }, assetsPath, isDark);

  let disposed = false;
  let glass = null;

  const api = {
    el: host,
    pause() {
      glass?.pause();
    },
    play() {
      glass?.play();
    },
    setUniforms(next) {
      glass?.setUniforms(next);
    },
    dispose() {
      disposed = true;
      glass?.dispose();
      glass = null;
      host.remove();
    },
  };

  try {
    glass = new KlearGlassMount(
      host,
      {
        videoSrc,
        imageSrc,
        gradientMapSrc,
        gradientMap2Src,
        centerGradientMapSrc,
      },
      config,
    );
    await glass.loadAssets();
    if (disposed) {
      api.dispose();
      return api;
    }
    if (gradientMapCanvas) {
      glass.updateGradientMapTexture(gradientMapCanvas);
    }
    const userWantsPaused = config.paused ?? false;
    if (!userWantsPaused) {
      glass.pause();
    }
    host.style.opacity = "1";
    window.setTimeout(() => {
      if (disposed || !glass) return;
      if (!userWantsPaused) {
        glass.play();
      }
      onLoad?.();
    }, FADE_IN_MS);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    api.dispose();
    throw err;
  }

  return api;
}

function mountKlearSenseGradient(parent, options = {}) {
  if (!parent) {
    throw new Error("KlearSenseGradient: parent element is required");
  }

  const mask = typeof options.mask === "string" ? MASKS[options.mask] : options.mask;
  const path = options.path || mask?.d;
  if (!path) {
    throw new Error('KlearSenseGradient: pass mask="klear"|"ray"|"check" or a path with fill="white"');
  }

  const size = options.size ?? 56;
  const viewBox = options.viewBox || mask?.viewBox || "0 0 24 24";
  const origin = options.origin || [0.5, 0.5];
  const fillRule = options.fillRule || mask?.fillRule;
  const canvasSize = Math.round(size * CANVAS_SCALE);
  const offset = (canvasSize - size) / 2;
  const uid = `kn-fg-${Math.random().toString(36).slice(2, 9)}`;
  const maskId = `fg-mask-${uid}`;
  const vbW = parseViewBoxSize(viewBox, "w");
  const vbH = parseViewBoxSize(viewBox, "h");
  const ruleAttr = fillRule ? ` fill-rule="${fillRule}" clip-rule="${fillRule}"` : "";

  const host = document.createElement("div");
  host.className = ["kn-klear-sense-gradient", options.className || ""].filter(Boolean).join(" ");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "relative",
    width: `${size}px`,
    height: `${size}px`,
    display: "inline-block",
    overflow: "hidden",
    pointerEvents: "none",
    ...(options.style || {}),
  });
  host.innerHTML = `<svg aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden">
      <defs>
        <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${canvasSize}" height="${canvasSize}">
          <g transform="translate(${offset}, ${offset}) scale(${size / vbW}, ${size / vbH})">
            <path d="${path}" fill="white"${ruleAttr}></path>
          </g>
        </mask>
      </defs>
    </svg>
    <div data-fg-canvas style="position:absolute;top:-${offset}px;left:-${offset}px;-webkit-mask:url(#${maskId});mask:url(#${maskId})"></div>`;

  parent.appendChild(host);
  const canvasHost = host.querySelector("[data-fg-canvas]");
  const gradient = new FluidGradientMount(canvasHost, canvasSize, origin);

  return {
    el: host,
    setOrigin(next) {
      gradient.setOrigin(next);
    },
    dispose() {
      gradient.dispose();
      host.remove();
    },
  };
}

window.KNKlearSense = {
  preloadKlearSenseAssets: preload,
  mountKlearSense,
  mountKlearSenseGradient,
  MASKS,
  DEFAULT_ASSETS_PATH,
};
