# KlearNow Engine — design system

KlearNow’s product UI is built from a single token set in `tokens.css`, mirrored for JavaScript in `theme.js` and `token-utils.js`. Component CSS uses semantic tokens (`--kn-color-*`, `--theme-spacing-*`, type utilities). Color primitives (`--kn-primitive-*`) are not for component styles.

Reusable component structure (Accordion through FormGroup, including DatePicker–EmptyState and Fade–FormGroup) lives in `components.css`. Slots, variants, and existing mappings: `docs/components.md`.

## Color

Brand hex values are unchanged. Each chromatic family is a 50–1000 shade scale. Existing hexes stay on their original steps; missing steps are interpolated around those anchors.

| Family | Anchor (kept) | Use |
| --- | --- | --- |
| Indigo | `#003f5b` (500) | Product chrome, primary actions |
| Blue sapphire | `#005d7b` (500) | Interactive borders, information |
| Marigold | `#f69000` (500) | Brand accent |
| Red | `#fff5f5` 50, `#ffd0ce` 200, `#ff3d32` 500, `#d9342b` 600 | Negative / danger |
| Green | `#22c55e` 500, `#1da750` 600 | Positive |
| Gold | `#fef4e6` 50, `#fcddb0` 200, `#e08300` 600 | Notice / warning |
| Purple | `#f3f1fb` 50 through `#5648b8` 600 | Klear Assistant |
| Bluegray | `#33657c` 400, `#556376` 500 | Muted primary borders / gray-blue chrome |
| Information | `#d0e1fd` 100 | Information washes |
| Sea | `#e6ecef` 50 | Sea / on-dark subtle text |
| Surface | `#ffffff` 0 through `#282e38` 900 | Neutrals |

Semantic color (`--theme-colors-*` / `--kn-color-*`) maps those primitives onto surface, interactive, feedback, overlay, and elevation roles.

## Typography

Families:

- **text / heading:** Inter, with Roboto as fallback
- **display:** `--kn-font-family-display` only (home greeting / thread title). Family name is declared in `tokens.css`.
- **sans:** Roboto, with Inter as fallback
- **code:** Roboto Mono

Weights: regular 400, medium 500, semibold 600, bold 700.

Font-size steps (desktop px): 25=10, 50=11, 75=12, 100=14, 200=16, 300=18, 400=20, 500=24, 600=32, 700=40, 800=48, 900=56, 1000=64, 1100=72. Below 768px, sizes 300+ step down.

Letter-spacing: 25 (−0.033em), 50 (−0.013em), 100 (0).

Roles:

| Role | Size step | Line-height step |
| --- | --- | --- |
| Display xl / lg / md / sm | 1100 / 1000 / 900 / 800 | matching |
| Heading 2xl / xl / lg / md / sm | 700 / 600 / 500 / 400 / 300 | matching |
| Heading h1–h3 | lg / md / sm | 500 / 400 / 400 |
| Heading h4–h6 | 200 / 100 / 100 | 200 / 100 / 100 |
| Body lg / md / sm / xs | 200 / 100 / 75 / 75 | 200 / 100 / 75 / 50 |
| Caption md / sm | 75 / 75 | 50 / 50 |
| Code md / sm | 75 / 25 | 75 / 25 |
| UI lg / md / sm / label | 200 / 100 / 75 / 75 | 100 / 50 / 50 / 50 |

Caption small uses size-75 (12px), not size-50 (11px): 12px is the smallest readable step for shipment IDs and port meta.

Utilities: `.type-display-*`, `.type-heading-h1`–`h6`, `.type-body-*`, `.type-caption-*`, `.type-code-*`, `.type-ui-*`, `.type-weight-*`.

## Spacing

Steps 0–11: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56 (px). CSS: `--theme-spacing-*` / `--kn-spacing-00`–`11`. Use for padding, margin, and gap.

## Size

Component width/height (icons, control heights, layout chrome): `--theme-size-*` in px, including 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 26, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96, 120, 160, 200, 240, 256, 264, 300, 360, 400, 640, 800.

Named layout:

| Token | Value |
| --- | --- |
| `--kn-layout-sidenav-collapsed` | size 56 |
| `--kn-layout-sidenav-expanded` | size 240 (264 at xl) |
| `--kn-layout-topnav-height` | size 56 |
| `--kn-layout-appbar-height` | size 64 |
| `--kn-layout-bottomnav-height` | padding 5+4 + icon 20 + gap 1 + body-xxs line + border thin (not size 56) |
| `--kn-layout-drawer-width` | size 800 |
| `--kn-layout-assistant-width` | 430px (named layout, not a spacing step) |

## Radius

none 0 · 2xsmall 2 · xsmall 4 · small 8 · medium 12 · large 16 · xlarge 20 · 2xlarge 24 · max 9999 · round 50%.

Component roles: surface = medium, surface-large = large, nested/control = small, input = xsmall, pill = max, round = round.

## Border width

none 0 · thinner 0.5 · thin 1 · thick 1.5 · thicker 2.

## Motion

Duration: 2xquick 80 · xquick 160 · quick 200 · moderate 280 · xmoderate 360 · gentle 480 · xgentle 640 · 2xgentle 960 (ms).

Easing: linear, entrance, exit, standard, emphasized, overshoot, shake.

## Breakpoints

base 0 · xs 320 · s 480 · m 768 · l 1024 · xl 1200. Mobile is below `m`; desktop is `m` and up. `breakpoints.js` sets `data-matched-breakpoint` and `data-matched-device-type` on `:root`.

## Files

- `tokens.css` — CSS custom properties and type utilities (KlearNow Theme on `:root`, light)
- `components.css` — Accordion through FormGroup (DatePicker–EmptyState and Fade–FormGroup included)
- `theme.js` — KlearNow Theme (`applyKnThemeToDocument` / `KNTheme`: attributes + rem scale sync; skips display family and type sizes)
- `token-utils.js` — `makeSpace`, `makeSize`, `makeTypographySize`, `makeBorderSize`, `makeMotionTime`, `makeLetterSpacing`, `getMediaQuery`
- `breakpoints.js` — Theme platform matching (`data-matched-breakpoint` / `data-matched-device-type`)

## Spark empty Assist (locked)

Closed product decisions. Do not reopen them as polish.

1. **No K / brand glyph on empty.** Empty Assist is plain — no bottomWave atmosphere and no `KlearSenseGradient` with `mask: "klear"` (not the tenant logo). Do not reinstate a bottom wave, a different glyph, a repositioned version, or any Spark-empty avatar without a specific design ask. Default chat flow no longer shows the success check-mask gradient after responses; preview mode may still exercise it.
2. **No empty-wave tint.** The former indigo multiply overlay on `bottomWave` is removed with the wave. Do not reintroduce a decorative band at the page foot on empty home.
3. **GenUI streaming ring stays.** `.kn-genui__ring` (mask-composite traveling border / corner brackets on Thinking) is sanctioned GenUI streaming chrome, distinct from ChatMessage pulse skeleton. No restyle.

## Tracked design-system gaps (do not invent values here)

**Spark `bottomWave` colorama vs Electric Blue (historical).** Empty Assist no longer mounts `bottomWave`. If the wave returns, tint should use `--kn-color-background-interactive-primary-default` (KEEP `--kn-primitive-indigo-500`). There is no Electric Blue / Deep Blue token in the KlearNow palette, and `bottomWave` colorama is a baked JPEG in Klear360 Spark assets. Product owners of Klear360 tokens / Spark should add a tokenized colorama (or a named Electric Blue step) — this app must not invent a hex or hand-roll a gradient map to close the gap.

## Known product limitations

**QA Spark state switcher.** The recipe strip lives in `agentic-spark-preview.js` and loads only when the URL includes `?preview=spark-states`. This repo has no bundler step that can strip the file at build time; query-param gating is the accepted limitation, not a silent gap.
