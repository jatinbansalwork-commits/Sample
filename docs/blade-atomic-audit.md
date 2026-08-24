# Blade atomic token audit — KlearNow.ai

**Date:** 2026-08-24  
**Source of truth:** `tokens.css` (Blade ThemeTokens paths, KlearNow palettes). `--theme-*` is Blade; `--kn-*` aliases it. Primitives (`--kn-primitive-*`) must not be used in component CSS.

Palette values were **not** changed. This audit corrects **which existing token** is applied, and flags cases where Blade has no passing shade.

### Blade scale (what is defined)

| Domain | Defined | Notes |
| --- | --- | --- |
| Color | Surface / interactive / feedback / overlay / brand-purple (AI) | Shade roles: 50–100 bg, 200–300 border/disabled, 400–500 primary, 600–700 hover, 800–900 text on light |
| Type | h1–h6, body lg/md/sm/xs, caption md/sm, ui label/lg/md/sm | Utilities in `tokens.css`. Family: Inter (KN override of Blade default) |
| Spacing | 0–11 → 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56 px | |
| Radius roles | surface, surface-large, nested, control, input, pill, round | KN `--kn-radius-large` is 6px (Blade large is 16px) — documented product override |
| Elevation | low / mid / high | |
| Borders | none / thinner / thin / thick / thicker | No `--theme-border-width-default` |
| Focus | `--kn-focus-ring` (2px information `#005d7b`) | Box-shadow value, not an `outline` shorthand |
| AI purple | 50/100/200/400/500/600 | Product decision: keep purple on Klear Assistant / AI-assist. `#6c5dd3` on white = **5.07:1** (AA pass) |

### Ad-hoc in tokens (not Blade)

- `--kn-type-body-sm-size` / `--kn-type-ui-sm-size`: `0.8125rem` (13px) — between Blade 12 and 14
- `--kn-weight-light` (300), `--kn-weight-black` (800) — unused, not loaded in Inter
- `--kn-letter-spacing-wide` / `wider` — rem values; Blade letter-spacing is em (`-0.033`, `-0.013`, `0`)
- `--blade-drawer-width: 50.4rem`, `--ai-assistant-width: 430px` — layout, not spacing scale

---

## Summary counts

| Action | Count |
| --- | --- |
| Fixed (clear token mismatch / undefined token / illegal fallback) | 38 |
| Flagged for confirmation before broad apply | 9 |
| Needs Blade clarification | 11 |

Contrast ratios below are relative-luminance estimates from hex in `tokens.css`.

---

## Typography

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| T1 | `.form-display-field__label` (User / Role / Default Role drawers) | `--theme-typography-caption-sm-size` **undefined**, fallback **10px**; weight token undefined | `--kn-type-ui-label-size` (12px) + `--kn-weight-medium`. KN caption floor is 12px | High | **Fixed** |
| T2 | `.form-display-field__value` | `--theme-typography-body-sm-size` undefined, fallback 13px | `--kn-type-body-sm-size` (KN 13px step) + `--kn-weight-regular` | Medium | **Fixed** |
| T3 | `.form-display-field__label` letter-spacing `0.06em` + uppercase | No Blade overline token (letter-spacing only −0.033 / −0.013 / 0) | Need Blade overline or accept `letter-spacing: 0` | Medium | **Needs Blade clarification** — left 0.06em |
| T4 | `.ai-draft-card__label` / `__reason` / `.ai-service-hint` | `--theme-typography-font-sizes-50` **typo** (real token is `fonts-size-50` = 11px); fallback 12px | `--kn-type-caption-md-size` | Medium | **Fixed** |
| T5 | `.ai-draft-card__mark` | `font-size: 0.85rem` (off-scale) | `--kn-type-body-sm-size` | Low | **Fixed** |
| T6 | `.ai-prompt-chip__new` | `0.625rem` / weight `700` / tracking `0.04em` | size-25 + `--kn-weight-bold`; tracking not in Blade | Low | **Fixed** size/weight; tracking flagged (T3) |
| T7 | `.ai-assistant-greeting` / `.ai-assistant-headline` | weight `500`; tracking `-0.01em` / `-0.02em`; unitless line-height | `--kn-weight-medium`; `--kn-letter-spacing-tight`; type line tokens | Low | **Fixed** weight + tracking (surgical; no layout redo) |
| T8 | `.vis-marker__count`, `.kn-steps__item.is-current .kn-steps__marker`, `.ai-draft-card__label`, `.ai-role-chip__label` | raw `font-weight: 600` / `700` | `--kn-weight-semibold` / `--kn-weight-bold` | Low | **Fixed** |
| T9 | `.vis-country__flag` | `font-size: 0.75rem` | `--kn-type-caption-md-size` | Low | **Fixed** |
| T10 | Body-sm 13px step in `tokens.css` | Extra step vs Blade 12/14 | Confirm KN ops floor vs Blade caption | Low | **Needs Blade clarification** |

---

## Spacing

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| S1 | `.perm-head-badge`, `.ai-suggest-tag` padding `2px` | raw px | `--theme-spacing-1` (2px) | Low | **Fixed** |
| S2 | `.ai-review-item`, `.ai-role-chip` `gap: 2px` | raw px | `--theme-spacing-1` | Low | **Fixed** |
| S3 | `.perm-progress` height `4px` | raw px | `--theme-spacing-2` | Low | **Fixed** |
| S4 | `.perm-selected-toggle__pip` 8×8 | raw px | `--theme-spacing-3` | Low | **Fixed** |
| S5 | `.ai-describe-field` / `.perm-search-field` icon inset `+ 20px` | raw px | `--theme-spacing-6` (20px) | Low | **Fixed** |
| S6 | `.ai-describe-loading` `gap: 3px`, dots `5px` | off-scale | Snap to 2 or 4px? Loading-dot size not in Blade | Low | **Needs Blade clarification** |
| S7 | `.btn--md` `min-height: 2.25rem` (36px) | between spacing-8 (32) and spacing-9 (40) | Blade Button size token (not in this file) | Low | **Needs Blade clarification** |
| S8 | `--ai-assistant-width: 430px` | raw px | No Blade panel-width token | Low | **Needs Blade clarification** — not changed |
| S9 | Klearhub sticky cell shadow `8px 0 12px` | raw px | spacing-3 / spacing-4 | Low | **Flagged for confirmation** (table chrome, not just tokens) |

---

## Radius & elevation

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| R1 | AI draft/review/chip, muted drawer section | `--theme-border-radius-md` **undefined**, fallback 8px | `--radius-nested` (Blade small / 8px) | Medium | **Fixed** |
| R2 | `.perm-head-badge`, `.perm-progress`, `.perm-selected-toggle` | `--theme-border-radius-full` **undefined** | `--radius-pill` | Medium | **Fixed** |
| R3 | Shipment-detail skeleton | `--radius-medium` **undefined** | `--radius-nested` | Low | **Fixed** (`shipment-detail.js`) |
| R4 | `.ai-describe-field` / `.perm-search-field` | `--theme-border-radius-small, 6px` — token is **8px**; fallback is KN control 6px | Inputs: `--radius-input` (4px). Controls: `--radius-control` (6px) | Medium | **Flagged for confirmation** — Describe-first fields; do not swap input radius without design OK |
| R5 | Cards vs nested tiles | Mostly `--radius-surface` / `--radius-nested` | Consistent | OK | No change |
| R6 | `.role-perm__group:hover` elevates low→mid | Valid elevation tokens | OK | OK | No change |

---

## Icons

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| I1 | Side nav, drawers, tables | Inline stroke SVG 24×24 @ 1.75; 16×16 @ 1.5; some `stroke-width="2"` (menu, profile) | One stroke + size scale | Medium | **Flagged for confirmation** before unifying stroke 2 → 1.75 globally |
| I2 | Quick actions | `assets/quick-actions/*.svg` **filled** raster-style assets vs stroke line-icons elsewhere | Mixed libraries | Medium | **Flagged for confirmation** |
| I3 | Visibility filter chevron | Data-URI stroke `#6b7280` (not in KN palette) | Palette gray `--kn-primitive-surface-600` `#64748b` | Medium | **Fixed** |
| I4 | Klear Assistant mark | PNG 18×18 vs SVG 16/20 elsewhere | Confirm AI mark size | Low | **Needs Blade clarification** |
| I5 | `.vis-mot-cell svg` | `1rem` raw | `--theme-spacing-5` | Low | **Fixed** |

---

## Borders

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| B1 | `select.vis-th-filter` | `--theme-border-width-default` **undefined**; surface-gray-subtle | `--kn-border-thin` + `--kn-color-border-interactive-gray-default` (same as text filters) | High | **Fixed** |
| B2 | `.perm-search-field` | `--kn-color-border-surface-gray-muted` (divider) | `--kn-color-border-interactive-gray-default` (input) | High | **Fixed** |
| B3 | `.perm-selected-toggle` | `--kn-color-border-surface-gray-default` **undefined** | `--kn-color-border-surface-gray-normal` | Medium | **Fixed** |
| B4 | `.perm-head-badge`, `.ai-describe-wrap`, `.badge--ai` | `border: 1px solid` | `--kn-border-thin` | Low | **Fixed** |
| B5 | AI / table / drawer dividers | `--kn-color-border-surface-gray-muted` | Correct for dividers | OK | No change |
| B6 | `--blade-ai-accent-border` (32% purple mix) | ~1.56:1 vs white | Decorative only; do not use as focus/border-only affordance | Medium | **Needs Blade clarification** (subtle AI chrome vs 3:1 UI border) |

---

## Interactive states

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| X1 | Buttons primary/secondary/tertiary | Hover uses highlighted / faded theme tokens | Matches Blade interactive states | OK | No change |
| X2 | `.btn--primary.btn--color-negative:hover` | `--kn-primitive-red-600` | No `--interactive-background-negative-highlighted` in theme | Medium | **Needs Blade clarification** — not changed (would invent a token) |
| X3 | Disabled primary | gray-500 text on 18% indigo (~1.92:1) | WCAG 1.4.3 incidental for disabled | Low | **Flagged** — acceptable as disabled; not restyled |
| X4 | `.btn:disabled` / `.icon-btn:disabled` | opacity-500 rather than 200–300 disabled fills | Secondary/tertiary disabled recipe not in file | Low | **Flagged for confirmation** before replacing opacity with disabled fills everywhere |
| X5 | Table row selected | `--kn-primitive-indigo-500` 9% mix | `--kn-color-background-interactive-primary-default` (same hex) | Medium | **Fixed** |
| X6 | Switch track off | `--kn-primitive-surface-400` | `--kn-color-border-interactive-gray-disabled` (same hex) | Medium | **Fixed** |
| X7 | Drawer / sort item / map AIS chip / switch thumb | `--kn-primitive-surface-0` | `--kn-color-background-interactive-staticWhite-default` | Medium | **Fixed** (shared white fills; see confirmation list for any remaining primitives) |
| X8 | `.role-perm__summary:hover` | `--kn-color-background-surface-gray-muted` **undefined** | `--kn-color-background-interactive-gray-highlighted` | Medium | **Fixed** |

---

## Component composition

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| C1 | Status badges | Light bg + intense text; `--badge--intense` uses **icon** token as fill | Background tokens for intense fills | Medium | **Flagged for confirmation** — swapping to `feedback-background-negative-intense` (red-500) would **worsen** white-text contrast |
| C2 | `.search-input` vs `.perm-search-field` vs `.blade-field__control` | Three field recipes; perm-search used divider border + Tailwind fallbacks | One input recipe (interactive border, `--radius-input`, Blade focus) | High | **Fixed** perm-search border/color tokens; radius left (R4) |
| C3 | AI Describe / perm search | Parallel one-off field CSS vs `.search-input` | Prefer shared `.search-input` / `.blade-field__control` | Medium | **Flagged for confirmation** — Describe-first structure not redone |
| C4 | Tabs, dropdowns, tooltips, tables | Shared classes; hover/focus generally tokenized | OK | OK | No change |
| C5 | `.perm-head-badge` vs `.badge--ai` | Duplicate AI pill recipes | One `.badge--ai` | Low | **Flagged for confirmation** |

---

## Contrast failures

Ratios vs white unless noted. Text AA = 4.5:1 (caption/body); UI/large = 3:1.

| # | Component / page | Pairing | Ratio | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `.badge--positive`, `.user-status-label` | green-600 `#1da750` on white / 12% green tint | 3.14 / **2.83** | 800–900 text on light — **no green-800 in palette** | High | **Needs Blade clarification** |
| A2 | `.badge--notice`, journey **current** marker | gold-600 `#e08300` on gold-50 / white | **2.60** / 2.83 | No gold-800 | High | **Needs Blade clarification** |
| A3 | `.badge--notice.badge--intense` | white on gold-600 | **2.83** | Fail both as solid fill and as tinted text | High | **Needs Blade clarification** |
| A4 | `.blade-toast--positive` | white on green-600 | 3.14 (body text needs 4.5) | No darker green fill | High | **Needs Blade clarification** |
| A5 | `.badge--negative` (subtle) | red-600 on red-50 | 4.39 (borderline &lt; 4.5 at 12px) | No red-800 | Medium | **Needs Blade clarification** |
| A6 | `.perm-clear-all` | `--kn-color-text-feedback-negative-default` undefined, fallback **`#ef4444` (3.76, not in palette)** | 3.76 | `--kn-color-text-feedback-negative-intense` `#d9342b` (4.69) | High | **Fixed** |
| A7 | Purple AI text `#6c5dd3` on white / purple-50 | 5.07 / 4.53 | AA pass | OK | Validated — **not** replaced with teal |
| A8 | `--blade-ai-accent-text` fallback `#5b4fc7` | Invented hex (not in purple scale) | n/a | `#6c5dd3` (purple-500) | Medium | **Fixed** in `tokens.css` fallback only (live value already purple-500) |
| A9 | White on purple-500 / indigo-500 | 5.07 / 11.28 | Pass | OK | No change |
| A10 | Secondary button gray-600 on white | 4.76 | Pass | OK | No change |
| A11 | Green-500 positive **border** on white (map pill) | **2.28** UI fail | Border token is green-500; green-600 is assigned to text/icon | Medium | **Needs Blade clarification** — not swapped to a text token |

---

## Semantic shade misuse

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| M1 | 23 CSS vars referenced but **not defined** (see appendix) | Tailwind-ish names (`gray-default`, `surface-default`, `notice-default`) + illegal hex fallbacks (`#3b82f6`, `#111827`, `#e5e7eb`, `#8A6400`, `#EDBA20`) | Existing `--kn-color-*` / `--theme-*` names | High | **Fixed** at call sites |
| M2 | `.badge--negative.badge--intense` | `--kn-color-icon-feedback-negative-intense` as **background** | Background token (red-500) — contrast regression if swapped | Medium | **Flagged for confirmation** |
| M3 | AI-suggested permission **rows** | Information (blue) tint + information checkbox glow | Purple AI tokens (product decision) | Medium | **Flagged for confirmation** — do not retint all `is-ai-suggested` rows without OK |
| M4 | `.ai-describe-no-match` | `notice-default` / invented golds | `notice-subtle` bg + `notice-intense` text + `notice-subtle` border | Medium | **Fixed** tokens (Describe-first **visual recipe not redesigned**) |
| M5 | Hover/active 600–700 | Primary button hover → sapphire-500 highlighted | OK | OK | No change |

---

## Color-blind safety

| # | Component / page | Current | Needed | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| CB1 | Status badges / Active–Inactive | Color **plus** text | OK | OK | No change |
| CB2 | `.admin-coverage` bar | Width + `aria-label` + adjacent `%` badge | OK (length, not hue, is the value) | OK | No change |
| CB3 | `.perm-progress` | `role="progressbar"` + valuetext | OK | OK | No change |
| CB4 | Map pills notice vs positive | Border hue + icon + label | OK | OK | No change |
| CB5 | Journey/steps current vs done | Gold vs primary **and** `is-current` / `is-done` + copy | Hue fails contrast (A2) but not color-only | Medium | Contrast flagged (A2); not color-only |
| CB6 | `.perm-selected-toggle__pip` | Filled vs hollow pip + label text | OK | OK | No change |
| CB7 | Category tags / MOT icons | Text or icon present in table cells | OK | OK | No change |

---

## Focus states

| # | Component / page | Current | Blade-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| F1 | Global `a` / `button` | 2px information + `--kn-focus-ring` | Pass 7.36:1 | OK | No change |
| F2 | `.blade-switch input:focus-visible` | `outline: var(--kn-focus-ring)` — **invalid** (ring is box-shadow) | `box-shadow: var(--kn-focus-ring)` + outline color | High | **Fixed** |
| F3 | `.ai-review-item:focus-visible` | `outline: none`; border-color only | Visible 3:1 focus | High | **Fixed** |
| F4 | `.ai-role-chip:focus-visible` | 2px **35% purple mix** (~1.63:1) | Solid purple-500 or Blade information ring | High | **Fixed** |
| F5 | `.ai-describe-field:focus` / `.perm-search-field:focus` | 3px **15% mix** (~1.22:1); `:focus` not `:focus-visible` | `:focus-visible` + 2px solid brand/information | High | **Fixed** |
| F6 | `.ai-describe-clear` / `.ai-describe-chip` / `.blade-select__chip-remove` | 1px box-shadow, `outline: none` | `--kn-focus-ring` | Medium | **Fixed** |
| F7 | `.search-input:focus-within`, `.blade-field__control:focus-visible` | 1px primary ring (not 2px `--kn-focus-ring`) | Blade focus is thicker | Medium | **Flagged for confirmation** before changing **all** inputs |
| F8 | `.vis-th-filter:focus-visible` | Same 1px primary ring as fields | Same as F7 | Medium | Bundled with F7 |

AI purple **15–35% glows fail 3:1**. Solid `#6c5dd3` as a 2px ring on white passes. Blade default focus remains information (sapphire) on non-AI controls.

---

## Describe-first (Role / Default Role) — flagged separately

Per standing instruction, Describe-first UX was **not** redesigned. Token issues in that CSS block were surgically remapped (undefined tokens, invented hex fallbacks, weak AI focus glows, input border token). **Not done:** merging fields into `.search-input`, changing 6px radius to `--radius-input`, retinting `is-ai-suggested` rows to purple.

---

## Items flagged for user confirmation (before broad apply)

1. **Unify icon stroke** 2.0 → 1.75 (and 16 vs 24 canvas) across nav + chrome.
2. **Replace quick-action filled SVGs** with the stroke set (or vice versa).
3. **Input focus width:** 1px primary inset vs Blade 2px `--kn-focus-ring` — all fields/tables/filters.
4. **Disabled buttons:** opacity vs explicit disabled fills (200–300 band) on secondary/tertiary/icon.
5. **Intense status badges:** keep icon-token fills (better contrast) vs semantic background tokens (worse contrast).
6. **AI-suggested rows** currently use **information blue**, not purple AI tokens — retint?
7. **Collapse** `.perm-head-badge` into `.badge--ai`.
8. **Describe-first fields:** move to shared `.search-input` / `--radius-input` (changes layout slightly).
9. **Klearhub sticky-column shadow** px → spacing tokens.

Sibling primitives: if any remaining `--kn-primitive-*` appear in JS/HTML inline styles after this pass, confirm before sweeping.

---

## Blade has no clear answer

1. **Positive text** (green-600) cannot meet 4.5:1 on white or on positive-subtle — no green-800/900.
2. **Notice text/fill** (gold-600) cannot meet 4.5:1 or 3:1 on gold-50 / white / as white-on-gold.
3. **Positive toast** white-on-green-600 fails body AA — no darker intense fill.
4. **Positive intense border** (green-500) fails 3:1 UI vs white.
5. **Negative subtle badge** 4.39:1 — just under 4.5 at caption size; no red-800.
6. **Destructive hover background** — no `interactive.background.negative.highlighted`.
7. **Overline / uppercase tracking** (0.04–0.06em) — not in Blade letter-spacing.
8. **13px body-sm** KN floor vs Blade 12/14.
9. **36px button height**, **430px AI panel**, **5px loading dots** — off spacing scale.
10. **`--blade-ai-accent-border` 32% mix** fails 3:1 as a UI border.
11. **AI mark size** (PNG 18px) vs icon scale 16/20/24.

---

## Appendix — undefined tokens mapped

| Used (invalid) | Mapped to |
| --- | --- |
| `--kn-color-background-surface-primary-lowest` | `--kn-color-background-interactive-staticWhite-default` |
| `--kn-color-background-surface-gray-muted` | `--kn-color-background-interactive-gray-highlighted` |
| `--kn-color-background-surface-default` | `--kn-color-background-interactive-staticWhite-default` |
| `--kn-color-text-surface-gray-default` | `--kn-color-text-surface-gray-normal` |
| `--kn-color-text-on-primary-normal` | `--kn-color-text-interactive-onPrimary-normal` |
| `--kn-color-text-feedback-negative-default` | `--kn-color-text-feedback-negative-intense` |
| `--kn-color-text-feedback-notice-default` | `--kn-color-text-feedback-notice-intense` |
| `--kn-color-border-feedback-notice-default` | `--kn-color-border-feedback-notice-subtle` |
| `--kn-color-border-surface-gray-default` | `--kn-color-border-surface-gray-normal` |
| `--kn-color-feedback-positive-default` | `--kn-color-icon-feedback-positive-intense` |
| `--kn-color-icon-interactive-primary-normal` | `--kn-color-text-interactive-primary-normal` |
| `--theme-border-width-default` | `--kn-border-thin` |
| `--theme-border-radius-full` | `--radius-pill` |
| `--theme-border-radius-md` | `--radius-nested` |
| `--theme-typography-caption-sm-size` | `--kn-type-ui-label-size` |
| `--theme-typography-body-sm-size` | `--kn-type-body-sm-size` |
| `--theme-typography-font-sizes-50` | `--kn-type-caption-md-size` |
| `--theme-typography-weight-medium` / `regular` | `--kn-weight-medium` / `--kn-weight-regular` |
| `--radius-medium` | `--radius-nested` |

`--coach-arrow-left`, `--map-preview-left`, `--map-preview-top` are **runtime positional** custom props, not Blade tokens.

---

## Files changed

- `docs/blade-atomic-audit.md` (this report)
- `tokens.css` — AI text fallback hex aligned to purple-500
- `styles.css` — token remaps, focus rings, primitive → semantic, type/spacing/border
- `shipment-detail.js` — undefined radius token
- `index.html` / `home.html` — cache query strings
