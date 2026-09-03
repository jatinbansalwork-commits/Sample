/**
 * KlearNow Theme — document activation
 *
 * tokens.css on :root is the runtime source of truth for colors, type sizes,
 * elevation, and the light canvas. This file is the JS mirror of the scale
 * (spacing, size, radius, motion, opacity, breakpoints, type families,
 * typographyOnMobile). applyKnThemeToDocument() writes matching CSS
 * variables except type sizes (CSS media query) and display family.
 *
 * There is no React provider. Do not generate a palette from a brand color;
 * brand hexes live in tokens.css.
 *
 * Display family is CSS-only. This file must never write
 * --theme-typography-fonts-family-display.
 */

const KN_THEME_NAME = "klearnow";
const KN_COLOR_SCHEME_LIGHT = "light";

const knTheme = {
  name: KN_THEME_NAME,
  breakpoints: {
    base: 0,
    xs: 320,
    s: 480,
    m: 768,
    l: 1024,
    xl: 1200,
  },
  spacing: {
    0: 0,
    1: 2,
    2: 4,
    3: 8,
    4: 12,
    5: 16,
    6: 20,
    7: 24,
    8: 32,
    9: 40,
    10: 48,
    11: 56,
  },
  size: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    10: 10,
    12: 12,
    14: 14,
    15: 15,
    16: 16,
    18: 18,
    20: 20,
    24: 24,
    26: 26,
    28: 28,
    30: 30,
    31: 31,
    32: 32,
    33: 33,
    34: 34,
    36: 36,
    37: 37,
    38: 38,
    40: 40,
    42: 42,
    44: 44,
    46: 46,
    48: 48,
    50: 50,
    52: 52,
    56: 56,
    59: 59,
    60: 60,
    62: 62,
    64: 64,
    66: 66,
    72: 72,
    78: 78,
    80: 80,
    82: 82,
    84: 84,
    86: 86,
    90: 90,
    94: 94,
    96: 96,
    100: 100,
    114: 114,
    120: 120,
    122: 122,
    124: 124,
    132: 132,
    140: 140,
    160: 160,
    172: 172,
    176: 176,
    192: 192,
    196: 196,
    198: 198,
    200: 200,
    208: 208,
    240: 240,
    245: 245,
    250: 250,
    256: 256,
    264: 264,
    300: 300,
    314: 314,
    360: 360,
    400: 400,
    584: 584,
    640: 640,
    760: 760,
    800: 800,
    1024: 1024,
    1136: 1136,
  },
  border: {
    width: {
      none: 0,
      thinner: 0.5,
      thin: 1,
      thick: 1.5,
      thicker: 2,
    },
    radius: {
      none: 0,
      "2xsmall": 2,
      xsmall: 4,
      small: 8,
      medium: 12,
      large: 16,
      xlarge: 20,
      "2xlarge": 24,
      max: 9999,
      round: "50%",
    },
  },
  opacity: {
    0: 0,
    1: 0.01,
    50: 0.06,
    100: 0.09,
    200: 0.12,
    300: 0.18,
    400: 0.24,
    500: 0.32,
    600: 0.48,
    700: 0.56,
    800: 0.64,
    900: 0.72,
    1000: 0.8,
    1100: 0.88,
    1200: 0.94,
    1300: 1,
  },
  blur: {
    low: 4,
    medium: 8,
    high: 12,
  },
  motion: {
    duration: {
      "2xquick": 80,
      xquick: 160,
      quick: 200,
      moderate: 280,
      xmoderate: 360,
      gentle: 480,
      xgentle: 640,
      "2xgentle": 960,
    },
    delay: {
      "2xquick": 80,
      xquick: 160,
      moderate: 280,
      gentle: 480,
      xgentle: 960,
      long: 2000,
      xlong: 3000,
      "2xlong": 5000,
    },
    easing: {
      linear: "cubic-bezier(0, 0, 0, 0)",
      entrance: "cubic-bezier(0, 0, 0.2, 1)",
      exit: "cubic-bezier(0.17, 0, 1, 1)",
      standard: "cubic-bezier(0.3, 0, 0.2, 1)",
      emphasized: "cubic-bezier(0.5, 0, 0, 1)",
      overshoot: "cubic-bezier(0.5, 0, 0.3, 1.5)",
      shake: "cubic-bezier(1, 0.5, 0, 0.5)",
    },
  },
  typography: {
    fonts: {
      family: {
        text: "Inter, Roboto, sans-serif",
        heading: "Inter, Roboto, sans-serif",
        sans: "Roboto, Inter, sans-serif",
        code: '"Roboto Mono", ui-monospace, monospace',
      },
      weight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      size: {
        25: 10,
        50: 11,
        75: 12,
        100: 14,
        200: 16,
        300: 18,
        400: 20,
        500: 24,
        600: 32,
        700: 40,
        800: 48,
        900: 56,
        1000: 64,
        1100: 72,
      },
    },
    lineHeights: {
      0: 0,
      25: 13,
      50: 16,
      75: 17,
      100: 20,
      200: 24,
      300: 24,
      400: 26,
      500: 32,
      600: 38,
      700: 46,
      800: 56,
      900: 64,
      1000: 70,
      1100: 78,
    },
    letterSpacings: {
      25: -3.3,
      50: -1.3,
      100: 0,
    },
  },
  /* CSS owns type sizes (mobile media query). JS mirror of onMobile only. */
  typographyOnMobile: {
    fonts: {
      size: {
        25: 10,
        50: 11,
        75: 12,
        100: 14,
        200: 16,
        300: 16,
        400: 18,
        500: 20,
        600: 24,
        700: 32,
        800: 34,
        900: 36,
        1000: 38,
        1100: 40,
      },
    },
    lineHeights: {
      0: 0,
      25: 13,
      50: 16,
      75: 17,
      100: 20,
      200: 24,
      300: 22,
      400: 24,
      500: 26,
      600: 32,
      700: 38,
      800: 40,
      900: 42,
      1000: 46,
      1100: 48,
    },
  },
};

window.knTheme = knTheme;

function knThemeCssLength(value, utils) {
  if (typeof value === "string") {
    return value;
  }
  if (value === 0) {
    return "0";
  }
  return utils.makeTypographySize(value);
}

function knThemeTokenUtils() {
  return (
    window.knTokenUtils || {
      makeTypographySize: (size) => `${size / 16}rem`,
      makeSize: (size) => (size === 0 ? "0" : `${size}px`),
      makeMotionTime: (time) => `${time}ms`,
    }
  );
}

/**
 * Color scheme is light only. `system` resolves to light. Dark is not shipped —
 * do not invent an on-dark palette or follow prefers-color-scheme.
 */
function setKnColorScheme(scheme, root = document.documentElement) {
  // FLAG: only light is shipped. `system` and any other value resolve to light —
  // do not follow prefers-color-scheme or invent an on-dark palette.
  void scheme;
  const resolved = KN_COLOR_SCHEME_LIGHT;

  root.dataset.theme = KN_THEME_NAME;
  root.dataset.colorScheme = resolved;
  root.dataset.knTheme = "enabled";
  root.style.colorScheme = resolved;
  if (window.KNTheme) {
    window.KNTheme.colorScheme = resolved;
  }
  return resolved;
}

function applyKnThemeToDocument(root = document.documentElement) {
  const utils = knThemeTokenUtils();

  setKnColorScheme(KN_COLOR_SCHEME_LIGHT, root);

  Object.entries(knTheme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--theme-spacing-${key}`, knThemeCssLength(value, utils));
  });

  Object.entries(knTheme.size).forEach(([key, value]) => {
    root.style.setProperty(`--theme-size-${key}`, knThemeCssLength(value, utils));
  });

  Object.entries(knTheme.breakpoints).forEach(([key, value]) => {
    root.style.setProperty(`--theme-breakpoints-${key}`, utils.makeSize(value));
  });

  Object.entries(knTheme.motion.duration).forEach(([key, value]) => {
    root.style.setProperty(`--theme-motion-duration-${key}`, utils.makeMotionTime(value));
  });

  Object.entries(knTheme.motion.delay).forEach(([key, value]) => {
    root.style.setProperty(`--theme-motion-delay-${key}`, utils.makeMotionTime(value));
  });

  Object.entries(knTheme.motion.easing).forEach(([key, value]) => {
    root.style.setProperty(`--theme-motion-easing-${key}`, value);
  });

  Object.entries(knTheme.border.width).forEach(([key, value]) => {
    root.style.setProperty(`--theme-border-width-${key}`, knThemeCssLength(value, utils));
  });

  Object.entries(knTheme.border.radius).forEach(([key, value]) => {
    root.style.setProperty(`--theme-border-radius-${key}`, knThemeCssLength(value, utils));
  });

  Object.entries(knTheme.opacity).forEach(([key, value]) => {
    root.style.setProperty(`--theme-opacity-${key}`, String(value));
  });

  Object.entries(knTheme.blur).forEach(([key, value]) => {
    root.style.setProperty(`--theme-blur-${key}`, knThemeCssLength(value, utils));
  });

  Object.entries(knTheme.typography.fonts.family).forEach(([key, value]) => {
    if (key === "display") {
      return;
    }
    root.style.setProperty(`--theme-typography-fonts-family-${key}`, value);
  });
}

window.applyKnThemeToDocument = applyKnThemeToDocument;

window.KNTheme = {
  name: KN_THEME_NAME,
  colorScheme: KN_COLOR_SCHEME_LIGHT,
  platform: "desktop",
  matchedBreakpoint: "base",
  tokens: knTheme,
  apply: applyKnThemeToDocument,
  setColorScheme: setKnColorScheme,
  getColorScheme: () => document.documentElement.dataset.colorScheme || KN_COLOR_SCHEME_LIGHT,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => applyKnThemeToDocument(), { once: true });
} else {
  applyKnThemeToDocument();
}
