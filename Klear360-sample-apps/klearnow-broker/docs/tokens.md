# KlearNow token reference

Source of truth: `tokens.css`. JavaScript mirror: `theme.js` + `token-utils.js`.

Primitives (`--kn-primitive-*`) must not be used in component CSS. Use `--kn-color-*`, `--theme-spacing-*`, `--theme-size-*`, `--theme-border-radius-*`, and the `.type-*` utilities.

Semantic color paths match Klear360 `surface` / `feedback` / `interactive` / `overlay` / `popup` / `data`. Values stay KlearNow (indigo `#003f5b`, sapphire `#005d7b`, marigold `#f69000`). No azure/emerald palettes. Pink data tokens alias purple. Charts still use four series, not the nine-hue data plot.

## Scales

### Spacing (padding, margin, gap)

| Step | px | rem |
| --- | --- | --- |
| 0 | 0 | 0 |
| 1 | 2 | 0.125 |
| 2 | 4 | 0.25 |
| 3 | 8 | 0.5 |
| 4 | 12 | 0.75 |
| 5 | 16 | 1 |
| 6 | 20 | 1.25 |
| 7 | 24 | 1.5 |
| 8 | 32 | 2 |
| 9 | 40 | 2.5 |
| 10 | 48 | 3 |
| 11 | 56 | 3.5 |

Off-scale values snap to the nearest step; ties round up.

### Radius

| Name | px |
| --- | --- |
| none | 0 |
| 2xsmall | 2 |
| xsmall | 4 |
| small | 8 |
| medium | 12 |
| large | 16 |
| xlarge | 20 |
| 2xlarge | 24 |
| max | 9999 |
| round | 50% |

### Type size (desktop)

| Step | px |
| --- | --- |
| 25 | 10 |
| 50 | 11 |
| 75 | 12 |
| 100 | 14 |
| 200 | 16 |
| 300 | 18 |
| 400 | 20 |
| 500 | 24 |
| 600 | 32 |
| 700 | 40 |
| 800 | 48 |
| 900 | 56 |
| 1000 | 64 |
| 1100 | 72 |

### Size (width / height)

Full 1px-grid set is in `tokens.css` as `--theme-size-*` (including 90, 100, 176, 1136). Do not use spacing tokens for control width/height.

### Backdrop blur

| Name | px | Token |
| --- | ---: | --- |
| low | 4 | `--kn-blur-low` |
| medium | 8 | `--kn-blur-medium` |
| high | 12 | `--kn-blur-high` |

Use `blur(var(--kn-blur-low))`. Elevation idle is `--kn-elevation-none`.

Families: Inter (text, heading), Roboto (sans), Roboto Mono (code). Display (greeting / thread title) is `--kn-font-family-display` only — the family name lives in `tokens.css`. `.type-display-*` uses the heading family, matching Display.

Role aliases (desktop): display sm–xl = size 800–1100; heading sm–2xl = 300–700; body large/medium/small/xxs = 200/100/75/25; caption medium = 100 (14px); caption small = **75 (12px)**, not 50. Body/caption tracking is letter-spacing 50 except body-lg (25) and display semibold (100).

## Remapped values

Hardcoded px/rem in component CSS were replaced with the closest scale step. Notable remaps:

### Type

| Before | After | Token |
| --- | --- | --- |
| 13px / 0.8125rem (`--kn-type-body-sm`, `--kn-type-ui-sm`) | 12px | `--theme-typography-fonts-size-75` |
| 15px / 0.9375rem | 16px | `--theme-typography-fonts-size-200` |
| 44px / 2.75rem (greeting) | 48px | `--theme-typography-fonts-size-800` |
| 11px / 0.6875rem | 11px | `--theme-typography-fonts-size-50` |

### Radius

| Before | After | Token |
| --- | --- | --- |
| 1px (`--kn-radius-xsmall`) | 2px | `--theme-border-radius-2xsmall` |
| 6px (`--kn-radius-large`, `--radius-nested`, `--radius-control`) | 8px | `--theme-border-radius-small` |
| 14px / 0.875rem (composer card fallback) | 16px | `--theme-border-radius-large` |
| 999px / 9999px | max | `--theme-border-radius-max` |

`--kn-radius-*` now matches the scale 1:1 (small=8, medium=12, large=16). Nested and control roles use **small (8px)**, the closest step to the old 6px product radius.

### Spacing / size

| Before | After | Token |
| --- | --- | --- |
| 1px (offset, hairline gap) | 2px | `--theme-spacing-1` |
| 3px | 4px | `--theme-size-4` / `--theme-spacing-2` |
| 6px / 0.375rem | 8px or 6px size | `--theme-border-radius-small` or `--theme-size-6` |
| 10px / 0.625rem | 12px | `--theme-spacing-4` |
| 34px / 2.125rem | 36px | `--theme-size-36` |
| 36px / 2.25rem (buttons) | 36px | `--theme-size-36` |
| 54px / 3.375rem | 56px | `--theme-size-56` |
| 60px / 3.75rem | 60px | `--theme-size-60` |
| 1.6px / 0.1rem | 2px | `--theme-spacing-1` |
| 5.6px / 0.35rem | 4px | `--theme-spacing-2` |
| 806px / 50.4rem (drawer) | 800px | `--theme-size-800` |
| 430px (assistant panel) | 430px named | `--kn-layout-assistant-width` |

Layout widths that are unique page constants (table min-widths, dashboard containers) stay as rem where they are far from a size step. Media queries keep raw px because CSS variables cannot drive `@media`.

### Naming

Motion aliases use `--kn-motion-*` (same duration / easing values). Shared chrome classes use the `.kn-*` prefix (drawer, toast, field, select, chat-input, alert, tooltip, switch, radio, list, link, spinner). Toast API: `showKnToast`. Select helper: `colKnSelect`.
