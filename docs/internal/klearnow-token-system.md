# KlearNow token system — Phase 1 ruleset

Internal agent/engineer artifact. Not linked from product docs. Source of truth for Phase 2 token application.

Do not apply any TARGET values in this phase. Do not cite a private reference by name in product files.

Units in CSS: spacing, type, radius, and border width are stored as rem (16px root) via `makeTypographySize` / `makeBorderSize`. Geometry below is listed in px so steps are comparable. JS mirror: `theme.js` + `token-utils.js`.

---

## 1. Global scales

Extracted from the reference token layer (`tokens/global`, `tokens/theme`) and converters (`makeSpace` → `Npx`, `makeSize` → `Npx`, `makeTypographySize` → `N/16 rem`, `makeBorderSize` → `Npx` or passthrough for `%`, `makeMotionTime` → `Nms`, `makeLetterSpacing` → `% of font-size in px`).

### 1.1 Spacing (0–11)

Padding, margin, gap. Not width/height of controls (that is Size).

| Step | px | rem |
| --- | ---: | ---: |
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

### 1.2 Radius

| Name | px / unit |
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

### 1.3 Border width

| Name | px |
| --- | ---: |
| none | 0 |
| thinner | 0.5 |
| thin | 1 |
| thick | 1.5 |
| thicker | 2 |

### 1.4 Motion — duration

| Name | ms |
| --- | ---: |
| 2xquick | 80 |
| xquick | 160 |
| quick | 200 |
| moderate | 280 |
| xmoderate | 360 |
| gentle | 480 |
| xgentle | 640 |
| 2xgentle | 960 |

### 1.5 Motion — delay

| Name | ms |
| --- | ---: |
| 2xquick | 80 |
| xquick | 160 |
| moderate | 280 |
| gentle | 480 |
| xgentle | 960 |
| long | 2000 |
| xlong | 3000 |
| 2xlong | 5000 |

**Scale feedback (do not add a step in this pass):** live usage keeps landing between existing delay tokens. Between **xlong (3000)** and **2xlong (5000)** the ChatInput ghost cycle is **4000ms**. Same class of gap elsewhere: thinking / rolling / copied-hold **1500–1600ms** (between xgentle 960 and long 2000); Carousel autoplay **6000ms** (past 2xlong). Evaluate as a scale-wide decision, not a per-component token.

### 1.6 Motion — easing

| Name | cubic-bezier | Typical use |
| --- | --- | --- |
| linear | `0, 0, 0, 0` | marquee, progress |
| entrance | `0, 0, 0.2, 1` | overlay enter |
| exit | `0.17, 0, 1, 1` | overlay exit |
| standard | `0.3, 0, 0.2, 1` | morph / chevron |
| emphasized | `0.5, 0, 0, 1` | hover / interactive |
| overshoot | `0.5, 0, 0.3, 1.5` | toast |
| shake | `1, 0.5, 0, 0.5` | error |

### 1.7 Typography — size / line-height / letter-spacing

Families stay KlearNow: Inter (text/heading), Roboto (sans), Roboto Mono (code). Display is `--theme-typography-fonts-family-display` in `tokens.css` only — consume `--kn-font-family-display`. Weights: regular 400, medium 500, semibold 600, bold 700.

**Font size**

| Step | Desktop px | Mobile px |
| --- | ---: | ---: |
| 25 | 10 | 10 |
| 50 | 11 | 11 |
| 75 | 12 | 12 |
| 100 | 14 | 14 |
| 200 | 16 | 16 |
| 300 | 18 | 16 |
| 400 | 20 | 18 |
| 500 | 24 | 20 |
| 600 | 32 | 24 |
| 700 | 40 | 32 |
| 800 | 48 | 34 |
| 900 | 56 | 36 |
| 1000 | 64 | 38 |
| 1100 | 72 | 40 |

**Line-height**

| Step | Desktop px | Mobile px |
| --- | ---: | ---: |
| 0 | 0 | 0 |
| 25 | 13 | 13 |
| 50 | 16 | 16 |
| 75 | 17 | 17 |
| 100 | 20 | 20 |
| 200 | 24 | 24 |
| 300 | 24 | 22 |
| 400 | 26 | 24 |
| 500 | 32 | 26 |
| 600 | 38 | 32 |
| 700 | 46 | 38 |
| 800 | 56 | 40 |
| 900 | 64 | 42 |
| 1000 | 70 | 46 |
| 1100 | 78 | 48 |

**Letter-spacing** (percent of font-size; CSS uses em)

| Step | % | em |
| --- | ---: | ---: |
| 25 | −3.3 | −0.033 |
| 50 | −1.3 | −0.013 |
| 100 | 0 | 0 |

Mobile applies below breakpoint `m` (max-width 767px).

### 1.8 Elevation — geometry + opacity (not source hexes)

Web light/dark share geometry on `lowRaised` / `highRaised`. `midRaised` differs by scheme. Opacity is a **constant per scheme**, not a per-level ramp.

| Level | Light geometry | Light opacity | Dark geometry | Dark opacity |
| --- | --- | ---: | --- | ---: |
| none | `none` | — | `none` | — |
| lowRaised | `0px 2px 4px 0px` | 6% | `0px 2px 4px 0px` | 32% |
| midRaised | `0px 16px 12px 0px` | 6% | `0px 2px 8px 0px` | 32% |
| highRaised | `0px 8px 24px -4px` | 6% | `0px 8px 24px -4px` | 32% |

6% = opacity step **50**. 32% = opacity step **500**. Shadow color is the scheme’s near-black (KlearNow: `--kn-primitive-surface-900` / static black). Do not copy reference hexes.

### 1.9 Opacity scale

| Step | value |
| --- | ---: |
| 0 | 0 |
| 1 | 0.01 |
| 50 | 0.06 |
| 100 | 0.09 |
| 200 | 0.12 |
| 300 | 0.18 |
| 400 | 0.24 |
| 500 | 0.32 |
| 600 | 0.48 |
| 700 | 0.56 |
| 800 | 0.64 |
| 900 | 0.72 |
| 1000 | 0.8 |
| 1100 | 0.88 |
| 1200 | 0.94 |
| 1300 | 1.0 |

### 1.10 Breakpoints

| Name | px | Role |
| --- | ---: | --- |
| base | 0 | no media query (mobile-first) |
| xs | 320 | small mobiles |
| s | 480 | mobiles / small tablets |
| m | 768 | tablets; desktop from here up |
| l | 1024 | desktop |
| xl | 1200 | HD desktop |

### 1.11 Size (control width/height; not a public spacing alias)

Internal 1px grid. `tokens.css` / `theme.js` now expose the **full** reference size set (including 3, 5, 7, 15, 30–34, 37–38, 42, 46, 50, 59, 62, 66, 78, 82–86, 90, 94, 100, 114, 122, 124, 132, 140, 172, 176, 192, 196, 198, 208, 245, 250, 314, 760, 1024, 1136). Use `--theme-size-*` for width/height; do not use spacing for those.

### 1.12 Backdrop blur

| Name | px | rem |
| --- | ---: | ---: |
| low | 4 | 0.25 |
| medium | 8 | 0.5 |
| high | 12 | 0.75 |

`--theme-blur-*` / `--kn-blur-*`. Consume as `blur(var(--kn-blur-low))`.

### 1.13 Z-index

**Not** part of the reference token layer. KlearNow defines its own overlay stack (see mapping). Component overlays in the reference use a separate z-index util, not global tokens.

### 1.14 Color shade step structure (no source hexes)

**Chromatic families** (11 solid steps + alpha):

- Solid: `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000`
- Alpha (on the 500/anchor hue): `a50, a100, a150, a200, a400` (some families also `a500, a600, a700`)

**Neutral / surface families:**

- Solid: `0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300` (14 steps including 0)
- Extra alpha keys exist on the reference neutrals; KlearNow only needs the ones we already encode (`--kn-primitive-alpha-*`, `--kn-primitive-indigo-a*`, `--kn-primitive-purple-a*`)

Semantic theme layer (not a second shade scale): `surface` / `interactive` / `feedback` / `overlay` / `popup` with emphasis keys `faint | subtle | moderate | intense | strong | normal | muted | disabled` and interactive states `default | highlighted | disabled | faded | fadedHighlighted | ghost`.

---

## 2. Mapping rule

For every source step: KlearNow token name **and** value. If `tokens.css` already matches, that is TARGET. If we diverge, CURRENT vs TARGET — recommend TARGET for Phase 2; do not apply here.

### 2.1 Spacing — MATCH

| Source | px | `--theme-*` | `--kn-*` |
| --- | ---: | --- | --- |
| spacing.0 | 0 | `--theme-spacing-0` | `--kn-spacing-00` |
| spacing.1 | 2 | `--theme-spacing-1` | `--kn-spacing-01` |
| spacing.2 | 4 | `--theme-spacing-2` | `--kn-spacing-02` |
| spacing.3 | 8 | `--theme-spacing-3` | `--kn-spacing-03` |
| spacing.4 | 12 | `--theme-spacing-4` | `--kn-spacing-04` |
| spacing.5 | 16 | `--theme-spacing-5` | `--kn-spacing-05` |
| spacing.6 | 20 | `--theme-spacing-6` | `--kn-spacing-06` |
| spacing.7 | 24 | `--theme-spacing-7` | `--kn-spacing-07` |
| spacing.8 | 32 | `--theme-spacing-8` | `--kn-spacing-08` |
| spacing.9 | 40 | `--theme-spacing-9` | `--kn-spacing-09` |
| spacing.10 | 48 | `--theme-spacing-10` | `--kn-spacing-10` |
| spacing.11 | 56 | `--theme-spacing-11` | `--kn-spacing-11` |

Off-scale px snaps to nearest step; ties round up (`closestSpacingStep` in `token-utils.js`).

### 2.2 Radius — MATCH

| Source | px | `--theme-*` | `--kn-*` | Role alias |
| --- | --- | --- | --- | --- |
| none | 0 | `--theme-border-radius-none` | `--kn-radius-none` | |
| 2xsmall | 2 | `--theme-border-radius-2xsmall` | `--kn-radius-2xsmall` | |
| xsmall | 4 | `--theme-border-radius-xsmall` | `--kn-radius-xsmall` | `--radius-input` |
| small | 8 | `--theme-border-radius-small` | `--kn-radius-small` | `--radius-nested`, `--radius-control` |
| medium | 12 | `--theme-border-radius-medium` | `--kn-radius-medium` | `--radius-surface`, `--radius-card` |
| large | 16 | `--theme-border-radius-large` | `--kn-radius-large` | `--radius-surface-large` |
| xlarge | 20 | `--theme-border-radius-xlarge` | `--kn-radius-xlarge` | |
| 2xlarge | 24 | `--theme-border-radius-2xlarge` | `--kn-radius-2xlarge` | |
| max | 9999 | `--theme-border-radius-max` | `--kn-radius-max` | `--radius-pill` |
| round | 50% | `--theme-border-radius-round` | `--kn-radius-round` | `--radius-round` |

### 2.3 Border width — MATCH

| Source | px | `--theme-*` | `--kn-*` |
| --- | ---: | --- | --- |
| none | 0 | `--theme-border-width-none` | `--kn-border-none` |
| thinner | 0.5 | `--theme-border-width-thinner` | `--kn-border-thinner` |
| thin | 1 | `--theme-border-width-thin` | `--kn-border-thin` |
| thick | 1.5 | `--theme-border-width-thick` | `--kn-border-thick` |
| thicker | 2 | `--theme-border-width-thicker` | `--kn-border-thicker` |

### 2.4 Motion — MATCH

Duration / delay / easing names and values in `tokens.css` already match §1.3–1.6.

| Source | `--theme-*` | `--kn-*` |
| --- | --- | --- |
| duration.{name} | `--theme-motion-duration-{name}` | `--kn-motion-duration-{name}` |
| delay.{name} | `--theme-motion-delay-{name}` | `--kn-motion-delay-{name}` |
| easing.{name} | `--theme-motion-easing-{name}` | `--kn-motion-easing-{name}` |

`prefers-reduced-motion` already zeroes all duration/delay tokens.

### 2.5 Typography — MATCH (scale + roles); keep KlearNow families and caption-sm

Desktop/mobile size and line-height tokens in `tokens.css` match §1.7. Letter-spacing is em-equivalent of the % scale. Role aliases follow Text / Heading / Display / Code.

| Role | Size step | Line-height step | Tracking | Notes |
| --- | --- | --- | --- | --- |
| display xl/lg/md/sm | 1100/1000/900/800 | matching | 100 (semibold); 50 if medium/regular | Heading family. Space Grotesk only on greeting / thread title. |
| heading 2xl/xl/lg/md/sm | 700/600/500/400/300 | matching | 100 | `.type-heading-sm`…`2xl` |
| heading h1–h3 | lg/md/sm | 500/400/**300** | 100 | Product HTML tags. h3 line is heading-sm. |
| heading h4–h6 | 200/100/100 | 200/100/100 | 100 | No Heading size this small in the reference. |
| body lg/md/sm/xxs | 200/100/75/25 | 200/100/75/25 | 25 / 50 / 50 / 50 | Text body large→xsmall |
| body xs | 75 | 50 | 50 | KN extra; reference has no body xs |
| caption md | **100** | 50 | 50 | Text caption medium (14 / 16) |
| caption sm | **75** | 50 | 50 | **Keep:** 12px, not size-50 (11px) |
| code md/sm | 75/25 | 75/25 | 100 | |
| UI lg/md/sm/label | 200/100/75/75 | 100/50/50/50 | 100 | Product control type; no Text UI variant |

`theme.js` mirrors desktop type on `knTheme.typography` and mobile on `knTheme.typographyOnMobile`. It still does **not** write type sizes or `--theme-typography-fonts-family-display` (CSS media query owns sizes).

**FLAG (do not force):** Amount non-subtle heading/display currency glyphs in the reference use hardcoded px (17, 19, 22, 30, 37, 45, 52, 60, 66) that are not type steps. Canonical Amount uses the matching type step (same as the integer when `--solid-affix`; one band down when subtle). Do not add a parallel px scale.

### 2.6 Elevation — CURRENT vs TARGET (biggest divergence)

Elevation was remapped onto **spacing tokens**. That is wrong: shadow offsets/blur are not spacing steps.

| Level | CURRENT (computed) | CURRENT opacity | TARGET geometry | TARGET opacity |
| --- | --- | ---: | --- | ---: |
| lowRaised | `0 2px 16px 0` (`spacing.1` / `spacing.5`) | 9% (`--kn-primitive-alpha-black-500`) | `0px 2px 4px 0px` | **6%** (opacity.50) |
| midRaised | `0 8px 24px 0` (`spacing.3` / `spacing.7`) | 12% | `0px 16px 12px 0px` (light) | **6%** |
| highRaised | `0 16px 48px -4px` (`spacing.5` / `spacing.10` / `-spacing.2`) | 18% | `0px 8px 24px -4px` | **6%** |

TARGET CSS (do not apply now). Color stays KlearNow surface-900, never a reference hex:

```css
--theme-colors-elevation-lowRaised: color-mix(in srgb, var(--kn-primitive-surface-900) 6%, transparent);
--theme-colors-elevation-midRaised: var(--theme-colors-elevation-lowRaised);
--theme-colors-elevation-highRaised: var(--theme-colors-elevation-lowRaised);

--theme-elevation-none: none;
--theme-elevation-lowRaised: 0px 2px 4px 0px var(--theme-colors-elevation-lowRaised);
--theme-elevation-midRaised: 0px 16px 12px 0px var(--theme-colors-elevation-midRaised);
--theme-elevation-highRaised: 0px 8px 24px -4px var(--theme-colors-elevation-highRaised);
```

Aliases `--kn-elevation-*` continue to point at `--theme-elevation-*`. Dark scheme (if added later): same geometry for low/high; midRaised `0px 2px 8px 0px` at 32% opacity.

Do **not** express elevation geometry as `var(--theme-spacing-*)`.

### 2.7 Opacity — scale MATCH; alias naming FLAG

`--theme-opacity-*` matches §1.9.

`--kn-opacity-00`…`12` is a **compressed alias**, not 1:1 with theme steps:

| `--kn-opacity-*` | maps to | value | Note |
| --- | --- | ---: | --- |
| 00 | opacity.0 | 0 | |
| 01 | opacity.**100** | 0.09 | not opacity.1 (0.01) |
| 02–11 | 200–1100 | 0.12–0.88 | |
| 12 | opacity.**1300** | 1 | skips 1200 (0.94) |

Phase 2: prefer `--theme-opacity-*` in new CSS. Do not silently retarget `--kn-opacity-01` to 0.01 (product already uses 0.09).

### 2.8 Breakpoints — MATCH

| Source | `--theme-*` | `--kn-*` |
| --- | --- | --- |
| base 0 | `--theme-breakpoints-base` | `--kn-breakpoint-base` |
| xs 320 | `--theme-breakpoints-xs` | `--kn-breakpoint-xs` |
| s 480 | `--theme-breakpoints-s` | `--kn-breakpoint-s` |
| m 768 | `--theme-breakpoints-m` | `--kn-breakpoint-m` |
| l 1024 | `--theme-breakpoints-l` | `--kn-breakpoint-l` |
| xl 1200 | `--theme-breakpoints-xl` | `--kn-breakpoint-xl` |

`@media` must keep raw px (`breakpoints.js` / CSS). Custom properties cannot drive `@media`.

### 2.9 Size — MATCH (full scale)

`tokens.css` and `theme.js` expose the full reference size set, including 176, 90, 100, 1136, and the rest of the 1px-grid steps. `applyKnThemeToDocument()` writes them as rem.

Missing source steps used by listed components (add only if we build that control): 30, 38, 50, 78, 94, 122 (CounterInput); 3, 5, 7, 14 already used as Badge heights via 14.

### 2.10 Backdrop blur — CURRENT none vs TARGET

| Source | TARGET |
| --- | --- |
| low 4 | `--theme-backdrop-blur-low: 4px` |
| medium 8 | `--theme-backdrop-blur-medium: 8px` |
| high 12 | `--theme-backdrop-blur-high: 12px` |

Add when a surface actually blurs. Do not invent blur on overlays that are solid. Theme does not publish these variables.

### 2.11 Z-index — keep KlearNow stack

| Token | value | Use |
| --- | ---: | --- |
| `--theme-zindex-base` | 0 | in-flow |
| `--theme-zindex-sticky` | 100 | top-nav / sticky chrome |
| `--theme-zindex-overlay` | 1000 | drawer / modal / sheet |

FAB CSS uses 99 (below sticky). Keep.

### 2.12 Color — KEEP every existing KlearNow hex; map 50–1000 around anchors

Never replace these hexes. Incomplete steps stay interpolated around them.

**Chromatic anchors (KEEP):**

| Family | Token | Hex | Step |
| --- | --- | --- | ---: |
| Indigo | `--kn-primitive-indigo-500` | `#003f5b` | 500 |
| Blue sapphire | `--kn-primitive-blue-sapphire-500` | `#005d7b` | 500 |
| Marigold | `--kn-primitive-marigold-500` | `#f69000` | 500 |
| Red | `--kn-primitive-red-50` | `#fff5f5` | 50 |
| Red | `--kn-primitive-red-200` | `#ffd0ce` | 200 |
| Red | `--kn-primitive-red-500` | `#ff3d32` | 500 |
| Red | `--kn-primitive-red-600` | `#d9342b` | 600 |
| Green | `--kn-primitive-green-500` | `#22c55e` | 500 |
| Green | `--kn-primitive-green-600` | `#1da750` | 600 |
| Gold | `--kn-primitive-gold-50` | `#fef4e6` | 50 |
| Gold | `--kn-primitive-gold-200` | `#fcddb0` | 200 |
| Gold | `--kn-primitive-gold-600` | `#e08300` | 600 |
| Purple | `--kn-primitive-purple-50` | `#f3f1fb` | 50 |
| Purple | `--kn-primitive-purple-100` | `#e4dff6` | 100 |
| Purple | `--kn-primitive-purple-200` | `#c9c0ed` | 200 |
| Purple | `--kn-primitive-purple-400` | `#8b7de0` | 400 |
| Purple | `--kn-primitive-purple-500` | `#6c5dd3` | 500 |
| Purple | `--kn-primitive-purple-600` | `#5648b8` | 600 |
| Bluegray | `--kn-primitive-bluegray-400` | `#33657c` | 400 |
| Bluegray | `--kn-primitive-bluegray-500` | `#556376` | 500 |
| Information | `--kn-primitive-information-100` | `#d0e1fd` | 100 |
| Sea | `--kn-primitive-sea-50` | `#e6ecef` | 50 |

Text/icon on light and subtle fills: positive uses **green-800**, notice uses **gold-700** (same hue as the KEEP 600 anchors; 600 fails 4.5:1 on the subtle pairing). Intense *fills* stay KEEP 600.

**Surface anchors (KEEP):**

| Token | Hex | Step |
| --- | --- | ---: |
| `--kn-primitive-surface-0` | `#ffffff` | 0 |
| `--kn-primitive-surface-50` | `#fafafa` | 50 |
| `--kn-primitive-surface-100` | `#f7f8f9` | 100 |
| `--kn-primitive-surface-200` | `#f5f5f5` | 200 |
| `--kn-primitive-surface-300` | `#eeeeee` | 300 |
| `--kn-primitive-surface-400` | `#dadee3` | 400 |
| `--kn-primitive-surface-500` | `#9e9e9e` | 500 |
| `--kn-primitive-surface-600` | `#64748b` | 600 |
| `--kn-primitive-surface-700` | `#556376` | 700 |
| `--kn-primitive-surface-800` | `#465161` | 800 |
| `--kn-primitive-surface-900` | `#282e38` | 900 |

`--kn-primitive-surface-1000` `#14171c` is interpolated (not marked KEEP). Leave it.

**Alpha KEEP:** `--kn-primitive-alpha-white-300` `rgba(255,255,255,0.18)`; `--kn-primitive-alpha-black-500` `rgba(40,46,56,0.09)`.

**Semantic mapping:** keep `--theme-colors-*` / `--kn-color-*` as they are except where a light-scheme token was pointed at a dark canvas. `--theme-colors-surface-background-gray-intense` is the **light canvas** (`surface-0` / `#ffffff`). `surface-900` stays on text, elevation, and `--on-dark` chrome. A dark scheme, if added later, would remap this step to `surface-900`. `--theme-colors-surface-background-primary-subtle` is `indigo-100` (`#d1dce1`) — the 100-step wash of brand indigo-500. Do not map it to `bluegray-400` (`#33657c`); that KEEP step is too dark for a light subtle fill and stays on `surface.border.primary.muted`.

**Interactive gray / icon state steps (resolved, one gap):** Accordion, ActionList, Alert, Dropdown/Menu, and Avatar each flagged a missing `interactive.background.gray.faded` / `.fadedHighlighted` or `interactive.icon.gray.{muted,subtle,disabled}` (and the matching `surface.icon` / `feedback.icon` slots). Those names now exist. Light gray `faded` = `default` (`surface-100`); `fadedHighlighted` = `highlighted` (`surface-200`) — chromatic faded stays a 9% mix, but this gray scale has no separate wash step. Icon emphasis matches `interactive.text.gray` (normal 600 / subtle 800 / muted 700 / disabled 500). Avatar “neutral” fill is `gray.faded` (no separate `interactive.neutral` family). `vis-chip` selected stays `gray.highlighted` (intentional). Do not re-FLAG these as per-component nearest-match holes.

**Interactive color state steps — closed:** primary / negative / notice / information / neutral / staticBlack now have the Klear360 `interactive.background|border|text|icon` state names, pointed at KN primitives (indigo, green, red, gold, sapphire, surface). Negative highlighted stays **red-600 KEEP**. Primary text `.subtle` is indigo-400 (lighter than brand 500 `.normal`). Neutral fill is **surface-800** (same charcoal as `feedback.neutral.intense` / FAB `--neutral`). Popup and data.categorical / data.sequential paths exist; Charts still use the 4-series KEEP (purple-500 fourth), not the nine-hue plot. Pink sequential aliases **purple** (no magenta palette). Do not import azure/emerald hexes.

**Static black `#000000`:** `--theme-colors-interactive-background-staticBlack-default` is `#000000`. FLAG if we ever want surface-1000 instead; do not change in this pass.

---

## 3. Per-component token patterns

Status key:

- **Live** — HTML/JS on a product surface
- **CSS/docs** — `components.css` + `docs/components.md` only; no product markup
- **None** — no equivalent (none in this list; all have CSS)

Token notes are from the reference component’s `types.ts`, `*tokens*`, web styles, and `_decisions` where present. Not invented.

### Accordion

Tokens: filled surface `surface.background.gray.intense` (light = white) + radius **medium**; transparent / filled item divider `border.thin` + `surface.border.gray.muted`; header padding **spacing.5** (size does not change padding); body paddingX/gap/paddingBottom **spacing.5**; leading max size 32 (large, default) / 24 (medium); hover bg `interactive.background.gray.faded`; chevron `interactive.icon.gray.muted` / hover `.subtle` / disabled `.disabled`; chevron rotate 0 → −180°, duration **moderate** / easing **standard**; header color/background **2xquick** / **standard**; focus ring radius **small**; contained maxWidth size 40 inset / 640 / 800; minWidth size 200 / 360.

KlearNow: **Live (canonical)** — `.kn-accordion` / `.kh-accordion` (KlearHub mode cards), role permission groups, ISF party rows. Grouped `<details>` siblings are exclusive. Permission / party rows stay **multi-open** via persisted `openGroups` (`readForm` on toggle) — exclusive single-open would drop hidden permission inputs. Intentional; not a FLAG. Medium padding FLAG is resolved (always spacing.5). Chevron no longer uses −90°. Reduced motion: header/chevron transitions none. Standalone disclosures use Collapsible (chevron **12**), not Accordion. Do not port elevated surface chrome (custom 6/32 shadow) onto filled Accordion — that is not a KlearNow elevation level; KH cards already use `.panel.card`.

### ActionList

Tokens: overlay border **thin** + `surface.border.gray.normal`, radius **medium**, elevation **midRaised**, bg `surface.background.gray.intense` (omitted when flush / in a sheet); list padding **spacing.3**; maxHeight **size 300**; item padding **spacing.2** mobile / **spacing.3** desktop; first-row height size 20 → item 28 / 36; item radius **small**; item marginY **spacing.1**; hover `interactive.background.gray.default`; selected `interactive.background.gray.fadedHighlighted`; negative hover `interactive.background.negative.faded`; keyboard `.is-active` is `--kn-focus-ring` only; focus `--kn-focus-ring`; section title muted + semibold + padding **spacing.3**; empty padding **spacing.5**.

KlearNow: **Live (canonical)** — `.kn-action-list` / `.action-list` / `.action-list-item` (quick actions, visibility filters, admin selects, date presets). Item recipe is shared with Menu. `--flush` only when parent overlay already has chrome. Do not flush all `.action-list`. Hover token is `gray.default` (same hex as `gray.faded` on light). Title stays `surface.text.gray.normal` (FLAG: item spec uses `interactive.text.gray.normal` / surface-600, which under-contrasts vs body 900 on the white overlay — especially 12px vis-menu items). Overlay empty (`.kn-action-list__empty`) is compact list copy — not EmptyState. Empty description is `gray.muted`.

### Alert

Tokens: padding **spacing.4**; radius **medium**; default max width size **584** (`--kn-layout-alert-max-width`) unless `--full`; leading icon size **16**; title size **100** semibold; description size **75**. Subtle fill `feedback.background.{color}.subtle` (primary: `surface.background.primary.subtle` / indigo-100). Intense fill `feedback.background.{color}.intense` (primary: `surface.primary.intense`). Subtle title/desc `surface.text.gray.normal` / `.subtle`; intense `staticWhite.normal` / `.subtle`. Subtle icon `feedback.icon.{color}.intense` (neutral: `feedback.icon.neutral.intense`; primary: `surface.icon.primary.normal`). Icon color scoped to `__icon` only. Dismiss is `.icon-btn` (see IconButton dismiss hit target). Dismiss motion **2xquick** / **standard**. Full-width from **768px** centers the row and inlines actions.

KlearNow: **Live (canonical)** — `.kn-alert` (admin insights, review drawer, Schema UI `ALERT`). Dashboard `.alert-card` composes the same color/icon tokens with product list chrome; titles stay gray.normal. `--kn-layout-alert-max-width`. Do not merge with `.kn-announcement`.

### Amount

Tokens: integer type steps body **25/75/100/200**, heading **300/400/500/600/700**, display **800/900/1000/1100** with matching line-heights. Subtle affix **opacity-800** and one band down (body medium affix **25**, heading medium affix **100**, display medium affix **700**). Currency inset **spacing.1**; minus sign **spacing.2**. Strikethrough `thin` / `thicker` + `currentColor`. Default text `surface.text.gray.normal`. Product currency **USD** (not INR).

KlearNow: **Live (canonical)** — `.kn-amount` (dashboard KPIs, recent/invoice amounts, Schema UI). Formatter: `formatKnAmountParts` / `knAmountHtml`. `.amount` is a leftover alias.

### AnimateInteractions

Tokens: wrapper has none. Child `.kn-move` offset **spacing.5**; idle opacity **0**; in-state opacity **1300**. Enter **xmoderate** / **entrance**; exit **quick** / **exit**. Default trigger **hover** only. Keyboard is `--kn-focus-ring` on `:focus-visible` (not the hover reveal). `focus` / `both` reveal on focus-visible. `tap` = `:active`. `.is-interacting` forces in-state. Live KPI chevron (size-12) uses **spacing.2** travel — 16px was disproportionate on that glyph; original 4px restored. Resolved.

KlearNow: **Live (canonical)** — `.kn-animate-interactions` on dashboard `.kpi-stat`; chevron is `.nav-chevron.kn-move`. Side-nav chevrons are not this pattern.

### AnnouncementBanner

Tokens: paddingY **spacing.3**, paddingX **spacing.5**, gap **spacing.2**; icon size **12**; message size **75** / weight **medium** / line **body-sm (17)**. Light: bg `surface.background.gray.subtle`, text `surface.text.gray.subtle`, icon `surface.icon.gray.subtle`. Chrome-on-dark (`--on-dark`): bg `interactive.background.staticWhite.fadedHighlighted`, text `staticWhite.subtle`, icon `icon.staticWhite.subtle`. FLAG: no `interactive.background.staticBlack.fadedHighlighted` (dark-scheme fill — not used; this app is light). Motion: none. a11y: `role="region"` / `aria-label="Announcement"`. No dismiss, no actions.

KlearNow: **Live (canonical)** — `.kn-announcement` (`#dash-welcome`, `--left`, first-visit hide via `kn-welcome-seen`, not a dismiss button). `.hero-copy p` muted color is overridden so `__message` keeps gray.subtle.

### AppBar

Tokens: height size **64**; paddingX `{base: spacing.5, m: spacing.6}`; paddingY **spacing.3**; back gap **spacing.4**; leading/actions gap **spacing.3**; variant **neutral** = transparent + `surface.text.gray.normal` (light page — not staticWhite); **subtle** = `surface.background.gray.intense`. Sticky default, z-index **sticky 100**. Scrolled: `border.thinner` + `gray.subtle` + **lowRaised**, motion **quick** / **standard**. Title body-lg / semibold. Back `.icon-btn` 32.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-appbar` (`hydrateKnAppBars`). No product instance yet; dashboard chrome is `.top-nav` (56, overlay 1000). Do not merge. Overlay headers stay `.kn-header`. FLAG: no trust mark; logo cap size 32; scrolled treatment not locked in spec.

### AutoComplete

Tokens: radius **input (xsmall)** / **medium** at `--large`; min-height **36** / **40**; padX **spacing.4**; gap **spacing.3**; overlay offset **spacing.2**. Light fill `surface.background.gray.intense` (not staticWhite); disabled `gray.moderate`; border `interactive.gray.default` / hover `highlighted` / focus `primary.default` + `border.thin` ring. Motion **xquick** / **standard**. Prefix/clear **size 16**. Distinct `inputValue` vs selected `value`. Overlay = ActionList. SearchInput alias: `--inside` / `--inside-input` / `--no-icon` / `__trailing` / label suffix+trailing; hydrate spinner on `.is-loading`. FLAG: no `interactive.border.negative.default`; maxRows single only; product filter is **includes**.

KlearNow: **Live (canonical)** — `.kn-autocomplete` / `.search-input` (`KNSearchInput.hydrate`). Combobox: `#quick-actions-search`. Filter fields: Visibility, admin, shipment docs/refs. `.kn-field__control` and `.perm-search-field` share the light field tokens.

### Avatar

Tokens: sizes **20 / 28 / 36 / 48 / 56**; circle radius **max**; square radius xsmall/xsmall/small/small/medium; bg `interactive.background.{color}.faded` (neutral → `interactive.background.gray.faded`); text `interactive.text.{color}.normal`; type xsmall/small **body-xxs**, medium **body-sm**, large/xlarge **body-md**, all **semibold**; light ring `border.thinner` + `surface.border.gray.subtle`; on-dark ring `border.thin` + `staticWhite.normal` at **opacity.500 (32%)**; interactive hover `border.thick` + `gray.muted` (**xquick / standard**); selected `border.thicker` + `primary.normal`; group overlap compact = half size, normal 16 (xsmall **size-14**), comfortable `spacing.3`; group separator `surface.gray.intense`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-avatar` / `.avatar` (`KNAvatar.initials`, `hydrateKnAvatars`). TopNav `--information --on-dark` (medium). Profile `--large` on light overlay (no `--on-dark`). Admin people `--xsmall` on light pages. `--on-dark` is TopNav-only. Do not use opacity.500 white rings or staticWhite initials on light pages. Do not merge with `.avatar-trigger` (Menu chrome) or `.agentic-thread-msg__avatar`.

### Badge

Tokens: heights **14 / 16 / 20 / 24**; paddingX **spacing.2** (large **spacing.3**); text margin / gap **spacing.1** (xsmall/small) / **spacing.2** (medium/large); radius **max**; type caption-sm (12px); subtle weight **medium**, intense **regular**; icon 12 (xsmall/small) / 16 (medium/large). Subtle fill `feedback.background.{color}.subtle` + text `feedback.text.{color}.intense` (neutral: `feedback.text.neutral.intense` = surface-900). Intense fill `feedback.background.{color}.intense` + `staticWhite`. Primary subtle: `surface.background.primary.subtle` (indigo-100) + `surface.text.primary.normal` / `surface.icon.primary.normal`. No hover/focus/open/loading motion. Text required; no icon-only.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-badge` / `.badge` / `.pill` (`KNBadge.className`, `hydrateKnBadges`). Default **medium / subtle / neutral**. Product `.badge--ai` is an Assistant overlay, not a color. `.kn-select__chip` is Tag (`.kn-tag`). Permission `n/n` (ratio, `min-width: size-40`) and ISF doc-rail counts (corner overlay **size-18**) stay Badge — they are not Counter’s 16/20/24 scale. Do not merge with Chip / vis-chip / ghost-badge / Counter.

### Header / Footer

Tokens: default padding `{base: spacing.5, m: spacing.6}` all sides; leading/back/suffix/trailing slot **28** large/xlarge (`--kn-layout-header-slot`) / **20** medium; back/trailing/copy-end **spacing.5**; leading **spacing.3**; title-suffix **spacing.3**; title optical offset **size-1**; close `.icon-btn` **32** / glyph **16**; title large **body-lg semibold**, xlarge **heading-sm**, medium **body-md**; subtitle **body-sm** + `gray.muted`; divider `border.thin` + `gray.muted`. Optional wash `feedback.background.{color}.subtle` radial. No chrome motion (IconButton / overlay own it). Title suffix is Counter. Footer padding matches Header.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-header` / `.kn-footer` aliased to `.kn-drawer__header` / `.kn-drawer__footer` (`KNHeader.hydrate`). Default **large**, no wash. Product leading plate **40** / `sea.subtle` (FLAG vs slot 28). Confirm Modal close-only row is not this primitive. Not AppBar.

### Menu

Tokens: overlay padding **spacing.3**; min-width **size 200** / **size 240** from `s`; radius **medium**; offset **size 8**; item padding spacing.2 mobile / spacing.3 desktop; item first-row size 20; item radius **small**; hover `interactive.background.gray.default`; selected `fadedHighlighted`; keyboard `.is-active` / `active-focus` = focus ring; title `interactive.text.gray.normal`; description `interactive.text.gray.muted`; header paddingX **spacing.3**, marginBottom **spacing.3**, then divider; footer padding `[spacing.3, spacing.3, 0, spacing.3]`; divider marginY **spacing.1**, bleed negative overlay padding X.

KlearNow: **Live (canonical)** — `.kn-menu` / `.menu-overlay` (`KNMenu.hydrate`). Overlay fill is `surface.background.gray.intense` + `border.thin` + **midRaised** (light canvas). FLAG: no `popup.background.gray.moderate`, no popup box-shadow, no backdrop-blur tokens — do not invent; a translucent popup would not fit the white page. Title color stays `surface.text.gray.normal` (FLAG vs interactive.gray.normal / surface-600). Open/close is `[hidden]` snap — FLAG: overlay enter/exit (offset 8 + duration **quick**) is not applied because `display: none` cannot transition. TopNav profile offset stays `100% - spacing.2` (FLAG vs size-8). Trigger is `.avatar-trigger` wrapping a presentation Avatar. Visibility `.vis-menu__list` is Dropdown overlay chrome around ActionList items (`KNMenu` keyboard on `[role="menu"]` overlays). Menu header is not overlay Header.

### Motion

Tokens: consumers pass `duration.*` / `easing.*` / `delay.*`. Engine classes: enter = xmoderate + entrance; exit = moderate + exit; standard = 2xquick + standard; emphasized = xquick + emphasized. Types `in` / `out` / `inout`. Triggers `mount` | `hover` | `focus` | `tap` | `in-view` (0.8 once). Delay is `--kn-motion-delay` (a delay.* token). No `delay.0`.

KlearNow: **Live (canonical)** — `.kn-motion--*` plus presets `.kn-move` / `.kn-fade` / `.kn-scale` / `.kn-slide` / `.kn-stagger` / `.kn-morph` / `.kn-elevate` / `.kn-animate-interactions`. `KNMotion.hydrate` for `in-view`. Fade is the opacity preset (**xquick** / entrance|exit). Dashboard `#dash-live.kn-stagger` uses product `kn-fade-in` (gentle + spacing.3) with this stagger interval. Do not merge that keyframe with `.kn-fade`. FLAG: scale 1.05/0.98; slide 100vh/100vw; in-view 0.8; type skip uses `0s` / `animation: none` (no duration.0). Fade type skip is `transition: none`. `easing.linear` is `cubic-bezier(0,0,0,0)` (hold), not CSS `linear`.

### Theme

Tokens: publishes the full theme (colors, spacing, motion, elevation, typography, border, breakpoints, backdrop blur) onto the tree. Color scheme `light` | `dark` | `system`. Platform `onMobile` below `m` / `onDesktop` from `m`. Tooltip delay group 300 / 300 (not a delay token). Overlay context reset so overlay buttons do not inherit ButtonGroup. Drawer / sheet stack providers.

KlearNow: **Live (canonical)** — Theme is `tokens.css` on `:root` + `applyKnThemeToDocument()` / `KNTheme` in `theme.js` + `breakpoints.js`. Light only. Pages set `data-theme="klearnow"` `data-color-scheme="light"` `data-kn-theme="enabled"`. JS writes rem spacing/size/radius/border-width/opacity/motion and non-display font families; CSS keeps colors, elevation, type sizes (media query), and the display family. `setColorScheme` always resolves to light. Tooltip delays are `delay.xquick` / `delay.2xquick`; gap `spacing.3`. FLAG: no dark / no OS `system` follow; no backdrop-blur tokens (do not invent); no delay step at 300ms; no overlay-context helper (menus/tooltips are fixed to `body`); no drawer/sheet stack provider (product z-index); do not generate a palette from a brand color; `interactive.background.staticBlack.default` stays `#000000` (not surface-900).

### BottomNav

Tokens: paddingX spacing.2; item paddingTop spacing.5 / paddingBottom spacing.4; gap spacing.1; icon **large 20**; label body **xsmall (10) / semibold**; rest `interactive.text.gray.subtle`; current `interactive.text.primary.subtle`; color transition **2xquick / standard**; z-index **100** (sticky; behind drawer); background `surface.background.gray.intense`; borderTop thin + `surface.border.gray.muted`; custom **upward** shadow `0px -8px 24px` (FLAG — not an elevation level). 2–5 items. `aria-current="page"`. More item may open SideNav.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-bottom-nav` / `KNBottomNav.hydrate`. Light fill `gray.intense` (not staticWhite). Current color is `interactive.text.primary.normal` (FLAG: no `.subtle`). Icon **size-20** (not 24). z-index **sticky**, not overlay. Height `--kn-layout-bottomnav-height` is the padding+icon+type+hairline calc, not size-56. Shadow uses elevation color at **size-8 / size-24** (FLAG vs 12% a-step). Product chrome stays `.top-nav-mobile` + `.side-nav`. FAB `--bottom*` offsets by this height + `--kn-fab-offset`. Do not convert `#ai-assistant-trigger`. FLAG: no safe-area token.

### BottomSheet

Tokens: top radius size **16** (large); grab handle **56×4**; handle fill `interactive.background.gray.faded`; handle radius 16 (large); paddingTop spacing.4 / marginBottom spacing.2; body padding **spacing.5** (or 0); ActionList inside uses spacing.3; overlay duration **moderate** + entrance/exit; surface duration **moderate**; fill `popup.background.gray.subtle`; reverse highRaised shadow; z-index **100**; snap [0.35, 0.5, 0.85] initial middle. Dismiss: backdrop, Escape, swipe.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-sheet-root` / `.kn-sheet` / `KNBottomSheet`. Light fill `surface.gray.intense` (FLAG: no popup tokens). Default snap **50%**. Handle faded + radius **large** (not pill / not gray.default). z-index **overlay 1000** (FLAG vs source 100; KN TopNav/Drawer already use this stack; drawers stay overlay+1). Shadow is reverse highRaised geometry with elevation color (FLAG 6% vs 18%). Motion **moderate** + entrance/exit (FLAG: no one-off bezier). Handle swipe threshold **size-56** (FLAG vs 60px buffer). Body composes Box; padding **spacing.5** is product. Product drawers stay edge-to-edge. CreationView uses this on small screens (form + optional second preview sheet). FLAG: snap percents; no rubberband; no sheet stack; no safe-area; Dropdown does not open as a sheet.

### Box

Tokens: layout primitive. Styled-props consume `spacing.*`, size, radius, display, gap, etc. No inherent padding. `backgroundColor` only `transparent` | `surface.background.*` | `overlay.*` | `feedback.background.*`. Elevation optional (prefer Card). `as` default `div`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-box` / `KNBox.hydrate`. Layout only: `min-width: 0`, no fill/padding/radius/elevation/motion. Direction `--flex/--row` | `--column` | reverse | `--center` | `--grid`; `--wrap` extra. `[hidden]` beats display modifiers. Light fills on product classes: `transparent` / `surface.background.*` / `feedback.background.*` — **not** overlay scrims (those are Drawer/Sheet dimmers), **not** interactive, **not** popup. Prefer **Card** for visual containers. Compose `.kn-elevate` for a lift on Box — do not wrap Card (Card idle is already lowRaised). Composition: `.kh-panel` (gap **spacing.5**), `.kn-drawer__body` (padding **spacing.6**), `.kn-sheet__body` (padding **spacing.5**). FLAG: no styled-props utility set; no backdrop-filter tokens; `--flex`/`--row`/`--center` unused in live HTML; `.kh-stat-card` staticWhite is Card, not Box.

### Breadcrumb

Tokens: list gap **spacing.2**; item gap **spacing.2**; separator `/`; size body sm/md/lg; current `surface.text.gray.normal` + medium; ancestors `interactive.text.{primary|gray|staticWhite}`; separator `surface.text.gray.muted` (white: `staticWhite.muted`); icon medium/large **16**, small **12**; motion **2xquick / standard**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-breadcrumb` / `KNBreadcrumb.hydrate`. Default **medium + primary**. Current is text, not a link — **gray.normal** (not subtle). `--white` is on-dark only. Last slash is CSS-hidden unless `--last-separator`. Hidden on Agentic Broker. FLAG: no `interactive.text.primary.subtle`; do not apply opacity 700 on light paper; home glyph stroke 1.75 has no token; no `--kn-color-text-surface-staticWhite-muted` alias (uses `--theme-colors-surface-text-staticWhite-muted`).

### Button

Tokens: min-height **28 / 32 / 36 / 48**; paddingX spacing.3/3/4/5; radius small/small/small/**medium** (large); type 75/75/100/200; 3D inset shadows (not elevation tokens); colors via `interactive.background|text|border.{color}.{state}`. Motion **xquick / standard**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-btn` / `.btn` / `KNButton.hydrate`. Default medium **36**, padding **spacing.4**, type **body-md medium**. Unstyled `.btn` is secondary-shaped (`surface.gray.intense`, not staticWhite). Tertiary is ghost (hover `gray.faded`, not primary.faded). Primary label `onPrimary.normal`. Icon-only square; toolbar chrome is `.icon-btn`. FAB composes large primary (radius **max**, icon **24**). `--white` hover is `staticWhite.highlighted`; `--white` disabled uses `--kn-color-background-interactive-staticWhite-disabled` (alias added, see §2.12 interactive-color state steps). FLAG: no 1.5px 3D shadow token (hairline instead); negative/positive fills are feedback.intense; destructive hover `--kn-primitive-red-600` KEEP hex; tertiary+negative is a product exception.

### ButtonGroup

Tokens: joined radius from Button size map (small / small / small / **medium**); seam **border.thin**; primary divider `surface.border.gray.subtle`; secondary/tertiary collapse inner borders with `calc(thin * -1)`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-btn-group` / `KNButtonGroup.hydrate`. Default **joined**, primary, medium. `--loose` is a product cluster (gap spacing.3; small/xsmall spacing.2) used by map Satellite/Map, date-picker footer, drawer footer, Confirmation actions — do not join those. No group fill, elevation, or motion (Button owns **xquick / standard** + `--kn-focus-ring`). FLAG: no 3D/radial glow to strip; primary `gray.subtle` divider on indigo may be faint; local `z-index: 1` is not a theme layer; overlay reset none (fixed to `body`).

### IconButton

Tokens: default medium **32** / glyph medium **16**; intense rest transparent; hover icon `.subtle`; motion **xquick / standard**. Highlighted box is 24 / 32 only.

KlearNow: **Live (canonical with Button)** — `.icon-btn`. Default 32 + faded hover wash on light paper (FLAG vs source transparent hover). `--on-dark` is inverted chrome (TopNav, coachmark, intense Alert). Not `.kn-btn--icon`. Not FAB (48 circle). **Dismiss hit target:** there is no compact 20px IconButton. Alert / Coachmark / ChatInput error / ref-chip each used to override `.icon-btn` to `--theme-size-20` independently (not a shared base). Those overrides are removed. Do not shrink `.icon-btn`. 24 is Badge height, not a control. Overlay Header / Toast already used 32.

### Card

Tokens: default padding **spacing.7**; radius medium via surface styles; selected hides border / uses primary hairline; secondary variant `surface.background.gray.moderate`, no shadow. Elevation prop is deprecated no-op in reference (custom surface). Ticket uses spacing.4 padding.

KlearNow: **Live** — `.kn-card` / `.panel.card` (dashboard, visibility, shipment sections). Prefer Card over Box when the surface is meant to be seen. Fill is `--kn-card-background` (currently `interactive.staticWhite` — leftover naming, same white as `surface.gray.intense` on this canvas). Donut hole consumes that custom property — retarget Card fill by changing `--kn-card-background`, not a one-off `background` on `.kn-card`. `.kh-stat-card` shares this Card fill, not Box. CreationView preview does **not** use this fill — it is `surface.gray.subtle` so it nests on overlay paper. Idle elevation is **lowRaised** — do not wrap Card in Elevate (that helper idles at **none**).

### Carousel

Tokens: autoplay interval **6000ms** (FLAG — between delay.xlong 3000 and 2xlong 5000; do not force); side overlap −17px (half of 34px control; FLAG). Visible slides 1/2/3; 2–3 collapse below `m`.

KlearNow: **CSS/docs** — `.kn-carousel`. No product instance.

### Charts

Tokens: categorical series `data.background.categorical.{blue,green,gold,purple,orange,pink,skyBlue,red,gray}` in that order; bar corner radius **2** (radius.2xsmall); bar gaps 2px (spacing.1 / size.2); donut label type 75/100/200 and 500/600/700; animation offset 200ms (duration.quick); hover other-series **20%**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-chart` / `KNChart.hydrate`. Live **bar** (stacked lanes) + **donut** (conic). Series `.chart-cat--{blue,green,gold,purple}` on **background** fills (primary / positive / notice intense / KEEP purple-500). `.chart-cat--sky` aliases purple. Hover **opacity.300** + **xquick/standard**. Donut default **large 160**, hole **96**. Hole fill is `var(--kn-card-background)` (Card-owned). Tooltips are Tooltip. Data categorical tokens exist (`data.background.categorical.*.strong`); Charts still use the 4-series KEEP, not the nine-hue plot. 4th series is KEEP purple because information.intense collides with primary; no line/area/sankey; pill track not 2xsmall; no 2px stack gap; no enter animation; no per-slice donut hover; 20% → opacity.300 (0.18).

### ChatInput

Tokens: radius **large** (live; token file listed medium — FLAG); file preview width size **200**; files gap spacing.3, paddingTop/X spacing.5; action bar padding spacing.5; error overlap spacing.4; elevation **highRaised** on the card; error slide **xmoderate** + **emphasized**; ghost crossfade **quick** + **standard**; hover/focus **xquick** + **standard**; suggestion cycle 4000ms (FLAG, between delay.xlong 3000 and 2xlong 5000). Submit **32 / radius small**. Caret on light paper is `surface.gray.normal`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-chat-input` / `KNChatInput.hydrate`. Aliases `.agentic-home__composer.agentic-home__composer--lg` (home + thread) and sidebar `#ai-assistant-chat-input`. Product AI overlay keeps `--ai-assistant-accent-*` for focus/send/attach hover (not `--kn-focus-ring`, not interactive.primary). Do not restyle `.agentic-home__disclaimer`. FLAG: card `staticWhite` (same as Card); z-index 0/1 not a theme layer; no `onSea` caret; no press scale. Ghost cycle 4000ms logged on delay scale §1.5 (no new token). Compact (non `--lg`) composer is not planned — compact row layout removed.

### ChatMessage

Tokens: self padding **spacing.4**; radius **large**; fill `surface.background.gray.intense`; border **thin** + `surface.border.gray.muted`; bubble shadow **`0px 0.5px 4px` at 6%** (FLAG — not lowRaised); leading **20**; thumbs **120**; traces compose Collapsible (**moderate / standard**, −180deg); completed/active `feedback.positive.intense`; pending **opacity.500**; loading rotate **gentle / emphasized**; enter **moderate / entrance**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-chat-msg` / `KNChatMessage.hydrate`. Aliases `.ai-msg` (sidebar history + agentic thread). Product AI overlay keeps `--ai-assistant-accent-*` on the self bubble, loading plate **32**, footer focus, and related-chip hover. Footer actions compose IconButton **32**. Related questions compose Chip small. Do not merge with ChatInput, Avatar, or `.agentic-home__disclaimer`. Agentic thread announcements use `#agentic-thread-live` (polite), matching `#ai-assistant-live`. FLAG: 88% max-width; agentic rolling CSS 1500ms vs sidebar rolling JS 1600ms are separate widgets (leave both); no 600ms auto-collapse; purple self vs gray.intense; shimmer is a staticWhite mix; `is-error` CSS unwired — leave until a retry flow is planned.

### Checkbox

Tokens: icon **12 / 16 / 20**; group gap spacing.2 small / spacing.3 medium+; control–label gap **spacing.3** (small **spacing.2**); box radius **xsmall**, border **thick** (large **thicker**), margin **spacing.1**; rest fill **transparent** + `interactive.border.gray.default`; checked/indeterminate `interactive.*.primary.default`; hover checked `primary.highlighted`; unchecked hover `gray.faded` + `gray.highlighted` border; motion **2xquick / standard**; focus `--kn-focus-ring`; disabled per-token (not opacity.500); invalid **feedback.negative.intense**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-checkbox` / `.kn-check`. `KNCheckbox.hydrate`. Product overlays: `--bare`, `--auto-read` (FLAG 1.2s), AI suggested color-mix, perm-head column. Checked-hover now uses `--kn-color-background-interactive-primary-highlighted` (alias added). FLAG: no `interactive.negative.default`; rest border is gray.**default** on the light canvas (gray.highlighted / surface-900 is a dark-surface leftover). Glyph is mask + `onPrimary.normal`, not `#fff`.

### Chip

Tokens: height **24 / 28 / 36 / 48**; paddingX spacing.3–5; radius small (large = medium); icon **12 / 16**; group gap spacing.3 / bottom spacing.4 at medium+; motion **xquick / standard**; rest `surface.background.gray.intense` (surface-0) + `border.gray.faded`; hover `interactive.background.gray.faded`; selected color-variant `interactive.background.{color}.faded`. Visibility `.vis-chip` selected is **`interactive.background.gray.highlighted`** (intentional — chosen, not a primary CTA). Disabled per-token, not opacity. Focus `--kn-focus-ring`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-chip` / `.vis-chip`. `KNChip.hydrate`. Default size **small 28**. Product overlays: `.agentic-home-pill` (padding, pill radius, size-18 icon, AI focus; FLAG rgba hairline + scale 0.98); related-chip AI accent; admin toolbar min-height **40**. FLAG: no `interactive.border.positive/negative.default`; no `*.fadedHighlighted` selected-hover; no press-scale token (source 0.92 skipped). Do not merge with Badge, Tag, or FilterChip.

### Collapsible

Tokens: body margin **spacing.4** when expanded (direction-aware); chevron size **12**, rotate 0 → −180°, duration **moderate** / easing **standard**; trigger color **2xquick** / **standard**; focus `--kn-focus-ring`; disabled per-token (not opacity.500). `--contained` maxWidth matches Accordion (size 40 inset / 640 / 800). FLAG: source `l` max is size **1136** (no token here). FLAG: no 0↔auto height animation; collapsed opacity **1000** unused with `[hidden]`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-collapsible`. `KNCollapsible.hydrate` / `toggle`. ChatMessage traces compose the chevron (same moderate/standard, −180deg). Product overlay: AI accent hover/focus, compact body spacing (gap **spacing.2**, not spacing.4). Do not keep a second traces motion. Accordion is the grouped card sibling (chevron **20**). Admin Details / unused-category stay product persist disclosures.

### Confirmation

Tokens: asset **48** / pad **spacing.4** / radius **medium** / glyph **24**; asset→copy **spacing.5**; copy gap **spacing.1**; copy→actions **spacing.6**; modal body pad **spacing.6**; width **size-400**; open **moderate / entrance**. Neutral icon `surface.icon.gray.subtle` on `feedback.background.neutral.subtle`. Actions = ButtonGroup `--loose` (**spacing.3**, FLAG vs pattern **spacing.5**).

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-confirm` inside `.kn-modal--confirm` (admin leave/delete/deactivate). `KNConfirmation.hydrate`. Close-only header is not overlay Header. Live stays Modal (not Sheet). FLAG: no image-asset 10px / 42×28; no exit motion; snap 0.35/0.5/0.85 unused until Sheet is wired. Not CreationView.

### Counter

Tokens: height/min-width **16 / 20 / 24**; pad X **0** (single digit) / **spacing.2** small `--wide` / **spacing.3** medium+ `--wide`; type body-xs / body-sm / body-md **medium**; radius **max**; max-width **size-100** (`< m`) / **size-120** (`m+`). Color recipe matches Badge (including `feedback.text.neutral.intense`). Intense text is `staticWhite` (shared gold/green contrast FLAG). No motion.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-counter` / `.counter` (`KNCounter.className` / `format` / `hydrate`). Default CSS size remains **small 16** for live nav/vis/admin counts (not medium 20). `--wide` when value > 9. `{max}+` via `data-max`. Nested in Chip / FilterChip / Header / Accordion title-suffix. Product: vis-chip selected keeps primary Counter fill; ISF tab uses intense negative. Permission `n/n` and ISF doc-rail **size-18** stay Badge.

### CounterInput

Tokens: height **28 / 36 / 48** (FLAG vs **30 / 38 / 50** — not in subset); icon **12 / 20 / 24**; pad **spacing.2 / .2 / .3**; container radius small / small / medium; button radius xsmall / xsmall / small; type body-sm/md/lg **semibold**; field width `digits × 1ch + spacing.2×2`. Fill `surface.gray.intense` (paper). Intense = primary **border** on the same paper, not a gray wash. Hover **xquick / standard**; step **quick / entrance**; loading **2xgentle / emphasized**. Focus `--kn-focus-ring`. FLAG: no control width 78/94/122; no `interactive.*.primary.subtle|disabled|highlighted` border/text/icon (intense uses `.normal` / `.default` / `gray.disabled`); no `primary.fadedHighlighted` (hover uses `primary.faded`); source 30% / ease-out / 300ms unused.

KlearNow: **Canonical CSS + hydrate** — `.kn-counter-input` (`KNCounterInput.hydrate` / `clamp`). No product instance. Not Counter. Not `.kn-field__control`. Label composes Form. Left large width **size-160** (FLAG vs 176).

### CreationView

Pattern: overlay Header + FormGroup + nested preview well + Footer; `--split` two columns from `m`. Host Modal `--large` (width **size-800**) or `--full`, or BottomSheet on small. Preview fill `surface.gray.subtle`, radius **medium**, pad **spacing.5**, min-height **size-200**. Overlay enter **moderate / entrance** (same as Confirmation). Footer = ButtonGroup `--loose`. Composes existing tokens; no unique scale.

KlearNow: **Canonical CSS + hydrate** — `.kn-creation` (`KNCreation.hydrate`). No product flow. Do not convert admin Drawers. FLAG: no size-1024 (large uses 800); no 80vh/100vh; no zoom Preview primitive; no StepGroup; source form pad **spacing.4** vs overlay body **spacing.5**; preview canvas 400/600 unused; ButtonGroup gap **spacing.3** vs pattern **spacing.5**.

### DatePicker

Reference includes a calendar grid (cells **40 / 48**, today dot, in-range wash). **KlearNow decision:** native `<input type="date">` + Menu overlay only — do not add a grid. Panel pad **spacing.6**; width **size-300**; gutter **spacing.5**; offset **size-8**. Footer = ButtonGroup `--loose`. FilterChip variant is `--chip` + `--no-footer`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-date-picker--range` (dashboard). `KNDatePicker.hydrate`. Inputs compose Form (`surface.gray.intense`, not table `staticWhite`). Overlay `[hidden]` like Menu. FLAG: no calendar cells; no BottomSheet host; no overlay `duration.quick`; footer buttons **small** vs source **medium**; invalid ring uses `0 0 0` + thinner (same FLAG as `kn-field__control` focus); calendar glyph stroke **1.75**; local trigger `z-index: 2`.

### DetailedView

Pattern: Drawer showing one record (Header, underline tabs, body, footer). No unique tokens. Overlay paper `surface.gray.intense`. Tabs hover **xquick / standard**; open/close is Drawer **moderate**. Key/value **size-160** + gap **spacing.3**. Body gap **spacing.6**.

KlearNow: **Live (canonical CSS + hydrate)** — `#kn-detail-drawer` / `.kn-detailed-view` / `KNDetailedView.hydrate`. Not CreationView (view vs create). FLAG: no StepGroup (journey stays product `kn-link`); Amount **2xlarge** hero unused; header status wash unused; footer `--loose` **spacing.3** vs source **spacing.5**; detail drawer z **overlay+2**; skeleton placeholder widths closest-step (no 148 / 192 / 88 / 84 / 144); loading delay **700 / 1100** (no matching delay token).

### Divider

Tokens: `border.width.{thinner|thin|thick|thicker}`; color `surface.border.gray.{muted|subtle|normal}`; orientation horizontal/vertical; style solid/dashed. Default **muted / thin / solid / horizontal**. No motion. No default margin.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-divider` / `.menu-divider` / `KNDivider.hydrate`. Menu / vis-menu bleed negative **spacing.3** + margin-block **spacing.1** and `flex-grow: 0`. FilterChip `__divider` is vertical + **subtle** (border, not a filled bar). FLAG: Menu bleed `spacing.1` vs source MenuDivider `marginY spacing.3`; overlay Header/Footer/Accordion/Tab hairlines share thin+muted tokens but are not Divider instances.

### Drawer

Tokens: overlay enter **gentle / entrance**, exit **xmoderate / exit**; panel enter **xmoderate / entrance**, exit **moderate / exit**; elevation **highRaised**; body padding **spacing.6**; width **size-800**; desktop inset **spacing.7**; radius **large** from `m`. Unmount wait **xmoderate**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-drawer-root` / `.kn-drawer` / `KNDrawer.hydrate`. Dashboard customize, hold list, shipment detail (DetailedView), admin role/user. Light fill `surface.gray.intense` (same overlay paper as BottomSheet / titled Modal; not staticWhite). Body composes Box; padding **spacing.6** is product. Close wait is **xmoderate** (`KNDrawer.closeMs`; shipment detail was **240ms**). Do not convert small-screen drawers into sheets. Do not invent a 2-drawer peek stack. FLAG: no popup fill token; width **800** vs source **375/420**; mobile **100%** vs **90%**; Header **large** vs **xlarge**; wash opt-in vs source default information; overlay/panel z **0/1**; DetailedView z **overlay+2**; hold drawer has no open trigger; admin drawers skip enter/exit; footer is flex not `position: sticky`; `translateX(100%)` / `opacity: 0|1` / `width: 100%` have no matching transform/opacity/width tokens (same as BottomSheet).

### Dropdown

Tokens: overlay radius **medium**; elevation **midRaised**; offset **size-8**; min-width **240** / max **300** (anchored). Nested ActionList / Menu hover `interactive.background.gray.default`; selected `fadedHighlighted`. Overlay chrome is the Menu overlay recipe. Open duration **quick** is spec-only.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-dropdown` / `.vis-menu` / `.quick-actions` / `KNDropdown.hydrate`. Overlay paper is Menu (`surface.gray.intense`, not popup, not staticWhite). Anchored placement **size-8** / `max(100%, 240)` / **300**. Portaled: quick actions **size-300** (`is-centered` **size-360**), DatePicker **size-300**. Open/close `[hidden]` (same as Menu). Select chevron **xquick / standard**. Profile is Menu, not Dropdown. FLAG: no overlay enter **quick** + `translateY(-8)`; no popup fill/blur; max **300** vs **400**; z **2** toolbar stack; Select overlay+3 / compact **8**; centered `20vh`; vis-menu chevrons do not rotate; listbox keyboard is focus-on-open.

### Elevate

Tokens: default lift **lowRaised**; duration **moderate** / easing **standard**. Product CSS also exposes mid/high modifiers.

KlearNow: **CSS/docs (canonical)** — `.kn-elevate`. Idle is **`elevation.none`**. `--hover` (`:hover` + `:focus-within`) / `.is-highlighted` lifts to **lowRaised**. Compose on Box when a lift is needed. Do not wrap Card (Card idle is already lowRaised). Do not wrap FAB (wrapper already has idle **midRaised**). AppBar `is-scrolled` stays product (**quick**). FLAG: no press trigger; no live HTML instance.

### EmptyState

Tokens: asset max **60 / 90 / 120 / 160**; section gap spacing.5/6/7/8; inner gap spacing.1; title heading sm/sm/md/xl; description body xs/sm/md/lg.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-empty` / `.empty-state` / `KNEmpty.hydrate` (visibility, map, admin via `KNAdminUX.emptyState`, shipment docs/refs/container, `#empty-page`). Default (no size) keeps **56** asset. Medium uses **size-90**. `--page` is not `--large`. Title `gray.normal` on light (not subtle). No motion. FLAG: live titles h5 not heading-sm; icon plate is product; actions gap **spacing.4**; map z **500** / `staticWhite`.

### Fade

Tokens: duration **xquick**; enter easing **entrance**; exit easing **exit**.

KlearNow: **CSS/docs (canonical)** — `.kn-fade`. Bare class is **inout**. Enter is keyframes; hide is an opacity transition (no exit flash on initially hidden). `--in` / `--out` skip with `transition: none` (not a `0s` duration). Delay is `--kn-motion-delay`; `--kn-fade-delay` remains an override. No `0ms`. Product still uses `@keyframes kn-fade-in` in `styles.css` at **gentle** + `spacing.3` (FLAG — different duration and a Move-like offset; do not merge). Dashboard / Visibility shell / map pills keep that keyframe. FLAG: no hover/focus/press; one delay channel; no live `.kn-fade` instance.

### FileUpload

Tokens: dropzone height **56 / 64**; motion **2xquick** / **standard**; dashed `interactive.border.gray.default`; hover `interactive.background.gray.default`; active `primary.faded`; item error `negative.faded`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-file-upload` / `.isf-add-doc__dropzone` (dropzone **slot**, not the root) / `KNFileUpload.hydrate`. Composer attach stays ChatInput (`__action`, height **32**). Light: dashed gray (not primary), radius **medium**, icon `interactive.icon.primary.normal`, copy `gray.subtle`. FLAG: no `primary.subtle` icon/text alias; no item `0.5px` shadow token; no `negative.fadedHighlighted`; inner gap 6px → **spacing.2**; ISF pad **spacing.6**; progress `0%` fallback; sample inert (no upload). Hidden input is `.visually-hidden` (clip FLAG lives there).

### FilterChip

Tokens: height size **28**; radius **small**; trigger gap spacing.2. Distinct from Chip. Multi-value composes Counter (`--wide` when count > 9).

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-filter-chip` / `.admin-applied__chip` / `KNFilterChip.hydrate`. Light: dashed `interactive.gray.faded` on `surface.gray.intense` (not staticWhite). Hover **xquick / standard** on trigger/clear. Chevron **12** muted, static. Live admin applied is dismiss-only (no chevron): click **anywhere** on the pill. Overlay FilterChip still splits trigger vs clear. Visibility quick filters stay Chip. DatePicker `--chip` composes this trigger (no live instance). `__divider` is Divider **vertical + subtle**. FLAG: no group pad **spacing.4/.1**; clear pad 6px → **spacing.3**; group Link is primary (no neutral); Caption-sm **12**.

### FloatingActionButton

Tokens: size large **48**; icon **24**; offset default **spacing.5** (`--kn-fab-offset`); elevation **midRaised** on wrapper; radius **max**; motion **xquick / standard**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-fab` / `KNFab.hydrate`. Composes Button large primary. Default **bottom-end** + **primary**. Light: primary / white pill + midRaised / charcoal `--neutral` (`feedback.neutral.intense`). Disabled per-token (not opacity-500) — primary/white disabled now use `--kn-color-background-interactive-primary-disabled` / `--kn-color-background-interactive-staticWhite-disabled` (aliases added); `--neutral` disabled text still workarounds through `--kn-color-text-surface-staticWhite-disabled` pending a real `onNeutral.disabled` token. Loading composes `.kn-spinner`. When `.kn-bottom-nav` is present, `--bottom*` uses `bottomnav-height + --kn-fab-offset`. z-index **99** (FLAG — no z-index token between base and sticky). No product instance. Do not convert `#ai-assistant-trigger`. Do not wrap in Elevate. FLAG: no `interactive.background.neutral.*` / `onNeutral` kn aliases (see §2.12 interactive-color state-step proposal); no entry/exit; no speed-dial. Icon is now **16** to match Button large (no documented product reason was found for the prior 24px override — fixed, not just flagged).

### Form

Tokens: label top **body-sm / medium**; left md–lg; label width **120 / 160** large (FLAG vs 176); gap **spacing.2** (large **spacing.3**); left marginRight **spacing.3–5**; necessity `*` or `(optional)`; control **36** / **40** large; textarea **120**. Motion **xquick / standard**.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-field` / `.kn-form-label` / `.kn-form-hint` / `.kn-field__control` / `KNForm.hydrate`. Light fill `surface.gray.intense` (not staticWhite). Focus is thin primary ring (not `--kn-focus-ring`). Invalid `feedback.negative.intense`. Success is hint-only. `.role-req` is necessity. No schema validation. CounterInput / FileUpload / DatePicker labels compose this. ChatInput is not a Form field.

### FormGroup

Pattern: heading + optional Alert + field sections + actions. Group gap **spacing.7**; fields **spacing.6**; actions **spacing.3** (ButtonGroup `--loose`). No built-in validation.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-form-group` / `KNForm.hydrate`. Product aliases `.user-form` / `.role-form` / `.role-form-zone` / `.user-form-grid` stay in product CSS (drawer pad, 2-col grid). CreationView `__form` composes this. Admin add-user / add-role stay Drawer FormGroup (no preview). Entry Summary Filing (`transaction-us-entry-filing.js`) is a fourth consumer — composes `.kn-field` per field, layering a product-only six-state review flag on top; verified 2026-09-02 (naming, light-theme tokens, motion, hardcoded values) as part of finalizing this component.

### GenUI

Gaps `spacing.1–7`; radius max/xsmall/medium; type 50/75/100. Off-scale: combined gap 10, maxWidth 660 → `--theme-size-640`. Caption-sm stays 12px (size-75).

KlearNow: **Live** — `.kn-genui` in assistant + agentic thread.

### Icons

Size boxes **8 / 12 / 16 / 20 / 24 / 32** (`--theme-size-*`). No layout spacing.

KlearNow: **Live** — SVG/img in buttons, nav, badges. Use size tokens for icon boxes, not spacing.

### Indicator

Label gap `spacing.2`. Dot sizes 6 / 8 / 10 / 12 / 16 / 20 / 24. Off-scale: **6, 10**.

KlearNow: **Live** — `.indicator` (dashboard/map). Current dot is 8px (`size-8`).

### InfoGroup

Gaps `spacing.1–4`; column gaps `spacing.6/10`; highlight pad `spacing.4`. Off-scale title H 14/18; key cols 120/140/176/200.

KlearNow: **Live** — `.info-group` / `.info-item` on dashboard health.

### Input

Pad `spacing.1–4`; radius input (xsmall) / medium large; heights **28 / 32 / 36 / 48**. Motion xquick/quick + standard/entrance/exit. Off-scale heights **28, 36**.

KlearNow: **Live** — `.kn-field` / `.kn-field__control`, `.search-input` / `.kn-autocomplete__field` (min-height 36 / 40 large), `.kn-phone` (PhoneNumberInput). Fill is `surface.gray.intense`, not staticWhite. Focus thin primary ring (**xquick / standard**). Quantity steppers are CounterInput.

### InputGroup

Shared outer `radius.small` on joined corners.

KlearNow: **None as a form primitive**. Do not use `.kn-btn-group` for text inputs — that is ButtonGroup. Joined text fields would need their own InputGroup when one exists. CounterInput is a single stepper, not an InputGroup.

### LightBox

Pad `spacing.6`; motion moderate + entrance/exit; backdrop blur high.

KlearNow: **None**.

### Link

Icon pad `spacing.2`; focus radius small/xsmall; motion 2xquick + standard.

KlearNow: **Live** — `.kn-link`. Hover underline; color **2xquick / standard**; `:focus-visible` is `--kn-focus-ring`. Breadcrumb ancestors and FileUpload `__link` share this recipe. FLAG: no `interactive.text.primary.subtle` — hover stays `.normal`.

### List

Indent `spacing.0/2/5/6`; item margin `spacing.3`. Off-scale bullet tops 5/6/7/10.

KlearNow: **None** as a primitive (ad-hoc lists in drawers).

### ListView

Filters pad `spacing.1–4`; gap `spacing.3`.

KlearNow: **Live (partial)** — Visibility toolbar + table; not a named ListView.

### LiveAnnouncer

Assertiveness only; no layout tokens.

KlearNow: **Live** — `#vis-live`, `#ai-assistant-live`, `#agentic-thread-live`, `aria-live` regions.

### Menu (overlay)

Pad `spacing.3`; radius **medium**; minW 200/240; offset size **8**.

KlearNow: **Live (canonical)** — `.kn-menu` / `.menu-overlay` / `.kn-dropdown__overlay` / `.vis-menu__list`. See **Menu**. Product radius is **medium** (quick-actions no longer uses surface-large).

### Modal

Body pad `spacing.6`; radius **large**; elevation **highRaised**; motion moderate + entrance/exit. MaxW 400 / 760 / 1024.

KlearNow: **Live** — `.kn-modal`. Light fill `surface.gray.intense` (same overlay paper as BottomSheet / Drawer). Radius **large** (`--radius-surface-large`). Width `min(size-400, 100%)`. `--large` is **size-800** (FLAG vs source **1024**). `--full` is 100% of the overlay (FLAG vs `100vh` / 8px inset). Confirmation compose (`.kn-modal--confirm`) owns close-only header + body pad **spacing.6** + enter motion. CreationView hosts reuse that enter. FLAG: no Modal enter on other titled shells; `z-index: 1` on the panel is a local stacking context, not a theme layer; overlay is `overlay + 3`; no `--medium` (source 760).

### Morph / Move / Scale / Slide / Stagger

Move offset `spacing.5`; Morph moderate+standard (radius + fill only); Scale 1.05/0.98 + moderate; Slide viewport `100vh`/`100vw`; Stagger interval 2xquick.

KlearNow: **Live (canonical with Motion)** — `.kn-move` / `.kn-scale` / `.kn-slide` / `.kn-stagger` / `.kn-morph`. KPI chevron uses **spacing.2**. `#dash-live` is `.kn-stagger`. FLAG: scale factors, viewport slide offset, Morph has no shared-id layout tween.

### OverlayContextReset

Context only; no layout tokens. Resets ButtonGroup inheritance inside overlays.

KlearNow: **None (FLAG)**. Menus, dropdowns, and tooltips are `position: fixed` on `body`, so they do not inherit `.kn-btn-group` joined borders. Do not invent a named reset helper unless a live overlay actually leaks group styles.

### Pagination

Pad `spacing.3`; page btn `spacing.2`; radius small; page btn **32×32**.

KlearNow: **Live** — `.vis-pagination`.

### Popover

Radius **large**; backdrop blur high; arrow 22×12; maxW 328/288.

KlearNow: **Live (partial)** — `.kn-tooltip` / menus, not a named Popover.

### PopupArrow

Radius 2xsmall; thin stroke; dims from parent.

KlearNow: **Live (partial)** — coachmark `::after` diamond (8×8), not 14×8 / 22×12.

### Preview

Pads `spacing.2–5`. Zoom label slot 40. Dotted grid 16 / 1. Zoom 0.1–8.

KlearNow: **None** as a zoom/pan primitive. CreationView `__preview` is a nested well (subtle fill, no zoom, no fullscreen). Do not invent drag/zoom tokens.

### ProgressBar

Label `spacing.2–3`; fill radius xsmall; motion 2xgentle + emphasized. Linear H **2 / 4**.

KlearNow: **Live** — `.progress-bar` (dashboard health, track **size-4**, positive intense) and `.kn-progress` (shipment, track **size-2**, primary). Radius **xsmall**. `.is-indeterminate` added for loading (CounterInput composes the oscillating variant). FLAG: 5% / -8% / 103% / scaleX 5 have no tokens. Not Charts.

### QuickFilters

Pad `spacing.3–4`; radius **small**; motion xquick + standard. Selected Visibility chips use `interactive.background.gray.highlighted` (intentional — chosen, not a primary CTA).

KlearNow: **Live** — composes Chip (`.vis-chip` / `.kn-chip--small`). Same selected override as Chip’s quick-filter recipe. Not FilterChip.

### Radio

Group gap spacing.2 small / spacing.3 medium / spacing.4 large. Icon 12/16/20. Same interactive rest/hover/checked/disabled/invalid tokens as Checkbox. Radius **round**. Inner dot 4/6/8. Motion **2xquick / standard**. Focus `--kn-focus-ring`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-radio` / `KNRadio.hydrate` (admin parties category). Do not treat as Checkbox.

### RollingText

Shimmer 2xgentle; slide xmoderate + emphasized.

KlearNow: **None**.

### SegmentedControl

Container H 32/36/48; item H 24/28/40; radius small/medium.

KlearNow: **None**. Map Satellite/Map is ButtonGroup `--loose`, not a joined segmented control. Do not treat `.map-basemap` as SegmentedControl.

### SelectableCard

Decisions-only; Card + Radio/Checkbox.

KlearNow: **None** as a named pattern (`.kn-card` exists).

### Settings

Stories only; no structure tokens.

KlearNow: **None**.

### Skeleton

Pulse xmoderate + 2xgentle + standard. Size from consumer.

KlearNow: **Live** — `.dash-skeleton` / `.vis-skeleton`.

### Spark

Visual effects; no layout token map. Empty Assist is plain (no `bottomWave`, no `KlearSenseGradient` / `mask: "klear"`). GenUI Thinking chrome is `.kn-genui__ring`, not ChatMessage skeleton.

KlearNow: **Live** on Agentic Assist (`agentic-spark.js`). Locked — see `DESIGN.md` Spark empty Assist.

### Spinner

Sizes 16/20/24; spin 2xgentle + overshoot.

KlearNow: **Live** — `.kn-spinner` (16). Track opacity 0.2 FLAG (scale has 0.18 / 0.24). Button and FAB loading compose this. FAB `--white` spinner is `icon.gray.muted` (not white-on-white); `--neutral` spinner is `staticWhite`.

### SpotlightPopoverTour

Pad `spacing.4`; delay gentle; mask radius large.

KlearNow: **None**.

### StepGroup

Marker 20/24; indent ~31/33; line 2.

KlearNow: **None** as a primitive (reasoning traces are Collapsible).

### Switch

Track W 28/36/44; radius max; motion **quick / standard**. Thumb `staticWhite`. Rest track `interactive.background.gray.default`.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-switch` / `KNSwitch.hydrate`. Live footprint is **44 × 24** (mobile medium); thumb **20**; travel `size-20`. No small instance. Dashboard widgets, admin Active/Inactive, shipment journey order. Not a Checkbox. Thumb disabled now uses `--kn-color-background-interactive-staticWhite-disabled` (alias added). FLAG: no small size in product.

### Table

Row minH 36/48/60; pad `spacing.4–5`; border thin.

KlearNow: **Live** — `.vis-table`.

### Tabs

Pad `spacing.0–4`; filled item radius small.

KlearNow: **Live** — two languages. Filled vis chips / `.kh-tabs` stay table/map toggles. Underline strip `.kn-tab` (DetailedView + ISF record panel) is the record-section recipe: min-height **size-48**, thicker primary underline, hover `surface.gray.subtle`, **xquick / standard**, `--kn-focus-ring`. Strip fill is `surface.gray.intense`. Do not merge the two.

### Tag

Pad `spacing.1–4`; radius **max**; dismiss xquick.

KlearNow: **Live (canonical CSS + hydrate)** — `.kn-tag` (`KNTag.hydrate`). Product compose `.kn-select__chip`. Fill `interactive.background.gray.default`; radius **max**; dismiss compact (not IconButton 32). Do not treat as Badge.

### TimePicker

Wheel item 34; panel ~198×196. Off-scale.

KlearNow: **None**.

### Toast

Pad `spacing.3–4`; radius medium; enter gentle+entrance; exit moderate+exit; maxW 360.

KlearNow: **Live** — `.kn-toast`. z-index 10000 FLAG vs overlay 1000.

### Tooltip

Radius medium; elevation lowRaised; arrow 14×8; maxW 200. Delay group 300 / 300 (not a delay token).

KlearNow: **Live (canonical with Theme)** — `.kn-tooltip`. Radius **medium**, elevation **lowRaised**, maxW **size-200**, z-index 1100 (FLAG vs overlay 1000). Show/hide delays **`delay.xquick` / `delay.2xquick`**; gap/edge **`spacing.3`**. Fill `staticBlack` on the light page (inverted chrome, not a dark scheme). Open/close is `[hidden]`. FLAG: no 300ms delay token. Coachmark close is `.icon-btn` (see IconButton dismiss hit target). Arrow is coachmark `::after` **size-8**, not 14×8.

### TopNav

Bar H **56**; pad `spacing.3–4`; item radius medium.

KlearNow: **Live** — `.top-nav` (`--kn-layout-topnav-height` = size 56, overlay z **1000**, staticWhite on primary.intense). Do not merge with AppBar 64 / sticky 100 / gray.normal on light.

### TreeView

Indent `spacing.3 + 24×(level−1)`; chevron quick+standard; row ~36.

KlearNow: **Live** — `.side-nav-tree`.

### TrustBadge

Gap/pad `spacing.2–3`; height 24.

KlearNow: **None**. FLAG: AppBar `__trust` slot exists but has no mark to render — omit the slot.

### Typography

Text 25–200; Heading 300–700; Display 800–1100.

KlearNow: **Live** — `.type-*` utilities. Caption-sm stays 12px (size-75).

### VisuallyHidden

1px clip box.

KlearNow: **Live** — `.visually-hidden` (`size-1`).

### SkipNav

Focused: position `spacing.5`, pad `spacing.2`.

KlearNow: **Live** — `.skip-nav`. Product inset is `spacing.3`; z-index **10** FLAG.

---

## 4. Gap list

Available reference if we build later. Not built in Phase 1 or 2 unless a later brief says so.

### CSS/docs exist, no product surface

| Component | Classes | Notes |
| --- | --- | --- |
| AppBar | `.kn-appbar` | 64px page header; `.top-nav` is 56px chrome |
| BottomNav | `.kn-bottom-nav` | Canonical CSS + hydrate; product still uses side-nav + top-nav-mobile |
| BottomSheet | `.kn-sheet-root`, `.kn-sheet` | Canonical CSS + hydrate; do not restyle drawers into sheets |
| Carousel | `.kn-carousel` | |
| CounterInput | `.kn-counter-input` | Heights 28/36/48 FLAG vs 30/38/50 |
| CreationView | `.kn-creation` | Canonical CSS + hydrate; no product flow |
| Elevate | `.kn-elevate` | CSS helper |
| Fade | `.kn-fade` | Product fade is `kn-fade-in` @ gentle |
| FloatingActionButton | `.kn-fab` | Canonical CSS + `KNFab.hydrate`; no product instance |
| Motion utilities | `.kn-motion--*` + presets | Canonical; `KNMotion.hydrate` |
| DatePicker as FilterChip | `.kn-date-picker--chip` | CSS + `--no-footer`; dashboard uses Button |

### No equivalent — available reference, not yet implemented

Do **not** build these until a product brief asks. Patterns are logged in §3.

| Component | Why logged |
| --- | --- |
| LightBox | No product surface |
| List (primitive) | Ad-hoc lists only |
| OverlayContextReset | Context-only |
| Preview | No zoom/pan primitive; CreationView preview well is the nested-surface stand-in |
| RollingText | No product surface |
| SelectableCard | Named pattern not used |
| Settings | No structure tokens in source |
| SpotlightPopoverTour | No product surface |
| StepGroup | Reasoning traces use Collapsible |
| TimePicker | No product surface |
| TrustBadge | No product surface |
| Morph / Scale / Slide / Stagger as wrappers | `.kn-morph` / `.kn-scale` / `.kn-slide` / `.kn-stagger` |

### Live but incomplete vs reference

| Component | Gap |
| --- | --- |
| AutoComplete | maxRows single only; tags-in-field and startsWith default not used |
| Charts | Bar + donut only; no line/area/sankey; no data categorical palette |
| Amount | Canonical: type-step affix, USD formatter, KPI + table + Schema UI |
| Chip | No xsmall/large product use; pills on agentic home are separate |
| Drawer header color washes | CSS exists (`--information` etc.); most drawers omit them |
| Menu radius | Canonical **medium** (matches ActionList overlay) |
| Modal width/radius | Product `32rem` / medium; reference 400/760/1024 / large |
| Tooltip | z-index 1100 vs overlay 1000; no 300ms delay token (uses xquick / 2xquick) |
| ProgressBar radius | Product **pill**; reference **xsmall** |
| SkipNav inset | Product `spacing.3`; reference `spacing.5` |
| Tooltip / Toast z-index | 1100 / 10000 vs overlay 1000 |

---

## 5. Phase 2 application rules

1. Replace hardcoded spacing / radius / font-size / line-height / motion / shadow with tokens from this ruleset (`--theme-*` or semantic `--kn-*` aliases).
2. Closest-step mapping. If no clean match, **FLAG** and leave the value. Do not stretch a token to a different geometry (especially elevation).
3. **No hex changes.** Anchors in §2.12 stay.
4. Work in batches. Show before/after. Wait for confirmation before the next batch.
5. Never cite the private reference by name in product files, comments, or user-facing docs.
6. Elevation TARGET is applied: `--theme-elevation-*` uses literal px + 6% `surface-900`. Do not express elevation as spacing vars.
7. Do not retarget `--kn-opacity-01` to 0.01.
8. Do not replace `styles.css` `kn-fade-in` (gentle) with `.kn-fade` (xquick) without an explicit ask.
9. Accordion header/body padding is always spacing.5 (canonical). Size only changes type.
10. Width/height of controls use `--theme-size-*`, not `--theme-spacing-*` (same px, different role).
11. Optional `--theme-backdrop-blur-*` only when a blur is real.

### Phase 2 log

| Batch | Scope | Status |
| --- | --- | --- |
| 1 | Elevation TARGET; Accordion → Avatar; size 584 in `theme.js` | Applied |
| 2 | Badge, Header/Footer, Menu, Motion, BottomNav, BottomSheet, Box, Button icons; plus live equivalents in GenUI→SkipNav (clear size maps only) | Applied |
| 3 | Card → Chip (Card, Carousel, Charts, ChatInput, ChatMessage, Checkbox, Chip) | Applied |
| 4 | Collapsible → FAB (Collapsible, Confirmation, Counter, CounterInput, CreationView, Divider, Drawer, Elevate, Fade, FAB) | Applied |
| 5 | DatePicker → FormGroup (DatePicker, DetailedView, Dropdown, EmptyState, FileUpload, FilterChip, Form, FormGroup) | Applied |
| 6 | GenUI → SkipNav leftover sweep (Icons, Indicator, InfoGroup, Input/Select, ListView, LiveAnnouncer, Modal leftovers, Pagination, ProgressBar, QuickFilters, SegmentedControl, Skeleton, Spinner, Table, Tabs, Tag, Toast, Tooltip, TopNav, TreeView, Typography, VisuallyHidden, SkipNav — plus remaining product icon boxes). Gap-list items not built. | Applied |
| 7 | Closest-step FLAG resolution (spacing, radius, opacity, motion, nearest size). Kept hex, z-index stack, fade helper vs `kn-fade-in`, rgba shadows/hairlines. | Applied |
| 8 | Interactive gray/icon state steps (`gray.faded` / `gray.fadedHighlighted` / `icon.gray.{subtle,muted,disabled}` + Alert `feedback.icon.neutral.intense` / `surface.icon.primary.normal` / `surface.icon.gray.subtle`). One systemic gap; Accordion–Avatar–Dropdown workarounds retargeted. | Applied |
| 9 | Badge canonical (sizes, padding, type, light-theme fills, hydrate). `feedback.text.neutral.intense` aliased to surface-900 (pair of icon.neutral.intense). Counter text retargeted. Tag/Chip left distinct. | Applied |
| 10 | Overlay Header/Footer canonical (padding 5/6, slot 28/20, type, hydrate). Drawer/Modal aliases; product leading plate 40 kept. Color washes opt-in. | Applied |

Batch 3 CLEAN maps (same px, spacing → size or leftover rem → token): dash-bars track `spacing-5` → `size-16`; value column `2rem` → `size-32`; card-header icon `spacing-8`/`spacing-5` → `size-32`/`size-16`; composer attach/send hit targets `spacing-8`/`spacing-4` → `size-32`/`size-12`; chat error-dismiss / ref-dismiss `spacing-6` → `size-20`; leading avatar `spacing-8` → `size-32`; spark `spacing-5` → `size-16`; action / ref min-height `spacing-7` → `size-24`; trace rail column `spacing-5` → `size-16`; connector min-height `spacing-4` → `size-12`; checkbox box `spacing-5` → `size-16`; check glyph `0.75rem` → `size-12`; admin vis-chip `spacing-9` → `size-40` (40px kept; not forced to Chip 36/48); `translateY(0.5rem)` → `spacing-3`; related-chip delay `0.16s` → `delay-xquick`; responding opacity `0.72` → `opacity-900`.

Batch 3 FLAGs (left as-is): Card padding `spacing.5` vs reference `spacing.7`; Carousel autoplay 6000ms and −17px overlap; dash-bars label `8rem` (128px); donut `9.5rem` / inset `22%`; ChatInput/home-pill `outline: spacing-2` (4px, not on border-width); `--agentic-ease` (entrance alias on interactive, not emphasized/standard); ghost `0.25s ease`; card shadow `0 1px 2px`; ghost opacity 0.55; control `max-height: 8.5rem`; unitless line-heights 1.45/1.55/1.4/1.35/1.3; focus fallback `0 0 0 3px`; submit opacity 0.4; z-index 0/1 error overlay; user bubble `0.9375em`, `min(88%, 22rem)`, shadow `0 0.5px 4px rgba(15,23,42,0.06)`; related `translateY(0.35rem)` / `-1px` / delays 0.04s/0.1s; chevron 0.75; pending 0.3; sparkle 1.4s / scale 0.94/1.06; skeleton 1.2s; caret 0.95s; actions `translateY(2px)`; pill hairline `0 0 0 1px rgba(0,0,0,0.06)`; `scale(0.97)` / `scale(0.92)`; checkbox flash 1.2s.

Batch 4 CLEAN maps (same px, spacing → size): collapsible chevron `spacing-4` → `size-12`; confirm asset `spacing-10` → `size-48`; confirm glyph `spacing-7` → `size-24`; drawer header-icon `spacing-9` → `size-40`; header-icon svg / close img `spacing-5` → `size-16`; admin-profile drawer header avatar `spacing-10` → `size-48`.

Batch 4 FLAGs (left as-is): Collapsible 0↔auto height + collapsed opacity **1000** unused (`[hidden]` kept); `--contained` uses Accordion **800** at `l` (source 1136 has no token); Counter mobile max-width uses **size-96** (source 100; no `--theme-size-100`; desktop **size-120** is applied); CounterInput heights 28/36/48 vs 30/38/50 (subset; do not add tokens); field width 36/48 vs 78/94/122; vis-menu divider `height: border-thin` on a `span` (not primitive `border-bottom`); Drawer body padding `spacing.5` vs `spacing.6`; header color washes exist, live drawers omit them; overlay/panel z-index 0/1 stacking-context locals; header-icon 40 vs overlay leading slot 28; Elevate default has no idle `lowRaised` (only hover/highlighted); Fade helper `xquick` vs product `kn-fade-in` gentle — do not merge; `--kn-fade-delay: 0ms` (no delay.0); FAB z-index 99 (keep, below sticky); FAB `--neutral` has no `interactive.background.neutral` kn alias (`feedback.neutral.intense`); FAB `--white` disabled has no kn alias for `staticWhite.disabled`; FAB icon **24** vs Button large **16**. Skipped this batch: DatePicker, DetailedView, Dropdown, EmptyState.

Batch 5 CLEAN maps (same px, spacing → size or leftover 0/rem → token): EmptyState default asset `spacing-11` → `size-56`; asset svg `spacing-8` → `size-32`; file input `opacity: 0` → `opacity-0`; dropdown header row `spacing-8` → `size-32`; leading icon `spacing-6` → `size-20`; detail link / footer / docs / journey marker glyphs `spacing-4` → `size-12`; pager / ribbon icon boxes `spacing-8` → `size-32`; tab min-height `spacing-10` → `size-48`; tab / ref-search radius `spacing-0` → `radius-none`; ribbon / doc glyphs `spacing-5` → `size-16`; progress track `spacing-1` → `size-2`; journey markers `spacing-8` → `size-32`; doc icon column `spacing-9` → `size-40`; rename / hint-slot / radio min `spacing-6` → `size-20`; radio control `spacing-5` → `size-16`; applied chip height `spacing-7` → `size-24` (24px kept); dropzone svg `spacing-6` → `size-20`; select trigger / perm chip / count badge `spacing-9` → `size-40`; select chevron `spacing-4` → `size-12`; phone select `7.5rem` → `size-120`; detail scrollbar `spacing-3` → `size-8`; role-form-zone padding `0` → `spacing-0`; perm group radius `0` → `radius-none`.

Batch 5 FLAGs (left as-is): DatePicker product panel `20rem` (320px, not in size subset); footer gap `spacing.3` / panel pad `spacing.5` vs reference footer gap `.5–.6` and `spacing.6` on `m`; open stacking z-index `2`; EmptyState default gap `spacing.3` vs section gaps `.5/.6/.7/.8`; medium asset `calc(size-80 + size-10)` = 90 (no `size-90`; do not add); `--page` keeps 56 asset; vis-menu radius **large** vs overlay **medium**; vis-menu divider height `border-thin`; no overlay `duration.quick`; detail search `18rem` (288px); textarea `8rem` (128px); dl key col `9.5rem` (152px); journey event col `11rem` (176px); progress `min-width: spacing-8 * 6` (192px); tab outline-offset `-spacing.1`; detail drawer z overlay+2; map-empty z 500; Form left-large label `calc(size-160 + size-16)` = 176 (no `size-176`); `--kn-admin-field-width` `spacing-8 * 14` = 448px; `kn-select--compact` / ref-search type `6.5rem` (104px); select `line-height: spacing-5`; underline-offset `0.2em`; `--theme-border-radius-md` / `--theme-border-width-md` / `--kn-color-bg-surface-info-subtle` fallbacks; radio `inset: 25%`; perm summary `0.12s ease`; perm info z-index 2. Catalogue has no Flex / FocusRing after EmptyState. FileUpload canonical pass resolved ISF nested-radius / primary-dashed (now gray + medium) and moved the input clip onto `.visually-hidden`. FilterChip canonical pass resolved applied-chip staticWhite / nested radius / muted border (now `surface.gray.intense` + **small** + dashed/solid `interactive.gray.faded`); group gap is **spacing.3**; `__divider` is border-left (not a filled bar).

Batch 6 CLEAN maps (same px, leftover `width`/`height`/`min-*` spacing → size across remaining live surfaces): 126 direct spacing-as-size replacements in `styles.css` (0→0, 1→2, 2→4, 3→8, 4→12, 5→16, 6→20, 7→24, 8→32, 9→40, 10→48). Surfaces include TopNav logo/trigger/profile chevron, TreeView/side-nav icons, Skeleton bars/icons, ProgressBar/dash-progress, Indicator (default already size-8; alert-hit 4px kept as size-4), KPI/KlearHub/vis card icons, map pills/markers, Table admin row/icon-btn heights, Pagination size-select min 72, Spinner already size-16, VisuallyHidden already size-1. Extra calc maps: sticky ID/actions `spacing-8*5` → `size-160`; ISF ship actions `spacing-8*2` → `size-64`; pagination select `spacing-9+spacing-8` → `size-72`; `--kn-admin-search-width` / `--kn-admin-name-col` `spacing-8*8` → `size-256`. Viewport gutters `100vw - spacing-8` left as spacing (inset role). Carousel `flex-basis` gap math left as spacing.

Batch 6 FLAGs (left as-is): Klear Assistant icon plate `spacing-6 + spacing-1` = 22px (not on size subset); `.kn-progress` min-width `spacing-8*6` = 192px; select menu `spacing-8*9` = 288 / `*7` = 224; `--kn-admin-search-max` / `--kn-admin-name-col-wide` = 288; `--kn-admin-perm-col` = 88; `--kn-admin-coverage-min` = 128; `--kn-admin-chips-col` = 224; `--kn-admin-field-width` = 448; leftover rem layout widths (8.5 / 9 / 9.5 / 11 / 13 / 17.5 / 18 / 20 / 22 / 28 / 36 / 46 / 48 / 92); SkipNav inset `spacing.3` vs `.5` and z-index 10; Spinner track 0.2; Toast/Tooltip z-index; Modal `32rem`; ProgressBar pill radius; Menu large vs medium; Indicator 6/10 unused; PopupArrow 8×8 vs 14×8; Fade helper vs `kn-fade-in`. Gap-list components still not built.

Batch 7 closest-step (geometry **does** change): Accordion medium padding `.4` → `.5`; ActionList empty `.4` → `.5`; Card padding `.5` → `.7`; Menu / vis-menu radius large → medium; Drawer body `.5` → `.6`; DatePicker panel pad `.6`, footer gap `.5`; EmptyState default gap `.3` → `.5`; medium asset 90 → `size-96`; Form left-large 176 → `size-160`; Collapsible duration moderate, collapsed rotate −180°; FilterChip product height 24 → 28, group gap `.2` → `.3`; Modal `32rem` → `size-400`, radius large; ProgressBar / kn-progress track radius pill → xsmall; SkipNav inset `.3` → `.5` (z-index 10 kept); Tooltip max 256 → 200, radius medium, elevation lowRaised (z 1100 kept); `--agentic-ease` → emphasized; composer/pill outline 4px → `border-thicker` (2px); scale 0.97/0.92 → 0.98; ghost 0.55 → opacity-700; spinner track 0.2 → opacity-300; submit 0.4 → opacity-600; thinking chevron 0.75 → opacity-900; ghost 0.25s ease → quick + standard; AIS pulse 6px → `size-8`; assistant icon plate 22 → `size-20`; dash-bars 8rem → `size-120`; donut/skeleton 9.5rem → `size-160`; chat max-height 8.5rem → `size-120`; DatePicker panel 20rem → `size-300`; detail search 18rem → `size-300`; textarea 8rem → `size-120`; dl/journey 9.5/11rem → `size-160`; progress min 192 → `size-200`; select menus 288/224 → 300/240; compact/filter 6.5rem → `size-96`; admin search-max/name-wide 288 → 300; field 448 → 400; perm 88 → 80; coverage 128 → 120; chips 224 → 240. Aliases: `--theme-border-radius-md` → `--radius-nested`; `--theme-border-width-md` → thick.

Batch 7 still FLAG: hex `#ffffff`; Toast 10000 / Tooltip 1100 / SkipNav 10 z-index (KlearNow stack); `kn-fade-in` gentle vs Fade helper xquick; rgba shadows and pill hairline; unitless line-heights; user-bubble `0.9375em` / `min(88%, 22rem)` / `0 0.5px 4px`; chat card `0 1px 2px`; focus `0 0 0 3px`; Amount affix; CounterInput 30/38/50 (not in subset; CSS already 28/36/48); Indicator 6/10 unused; PopupArrow 8×8 vs 14×8; Carousel 6000ms / −17px (no live autoplay); donut hole `22%`; table min-width 48rem / 92rem; leftover rem in `@container` / `@media` and some auto-fit columns; VisuallyHidden `clip: rect(0, 0, 0, 0)` (FileUpload input composes this); drawer header washes unused; thinking-panel body compact overlay (gap **spacing.2** + list padding-top **spacing.2**) vs Collapsible expanded **spacing.4** — do not retarget traces.

---

## Inventory counts

| Bucket | Count |
| ---: | ---: |
| Catalogued Accordion → FormGroup | **45** |
| Catalogued GenUI → SkipNav (this pass) | **48** |
| Live product equivalent (new pass) | Indicator, InfoGroup, Input, Link, Menu, Modal, Pagination, ProgressBar, QuickFilters, Skeleton, Spinner, Table, Tabs, Tag/Badge, Toast, Tooltip, TopNav, TreeView, Typography, VisuallyHidden, SkipNav, LiveAnnouncer, Theme, BottomNav, BottomSheet |
| CSS/docs only (Accordion–FormGroup) | **10** |
| Available reference, not implemented | LightBox, List primitive, OverlayContextReset, Preview, RollingText, SelectableCard, Settings, SpotlightPopoverTour, StepGroup, TimePicker, TrustBadge, Morph/Scale/Slide/Stagger wrappers |

Elevation TARGET is applied. Phase 2 live catalogue (Accordion → SkipNav) spacing-as-size is applied. Batch 7 resolved closest-step FLAGs. Batch 8 resolved the interactive gray/icon state-step gap (not several one-off FLAGs). Batch 9 locked Badge as the canonical pill (Counter color recipe aligned; Tag/Chip not merged). Batch 10 locked overlay Header/Footer (Drawer/Modal compose it; AppBar/Accordion/Dropdown header stay separate). Remaining FLAGs: hex `#ffffff`; Toast/Tooltip/SkipNav z-index; Fade helper vs `kn-fade-in`; rgba shadows/hairlines; unitless line-heights; user-bubble geometry; CounterInput 30/38/50; Indicator 6/10; PopupArrow 8×8; Carousel 6000ms/−17px; donut `22%`; table 48rem/92rem min-width; VisuallyHidden clip (FileUpload composes it); thinking-panel body `spacing.1`; Tag still Badge+`×`; white on `notice.intense` / `positive.intense` (gold-600 / green-600 fills) and white on `negative.intense` (red-500); product Header leading plate **40** vs slot **28**; confirm Modal close-only padding **spacing.4** vs **spacing.5**; Drawer default is large without an information wash (not xlarge+wash). Gap-list items remain unbuilt.
