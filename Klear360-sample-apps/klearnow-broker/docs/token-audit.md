# KlearNow atomic token audit — KlearNow.ai

**Current token reference:** `docs/tokens.md` and `tokens.css`. This file is a historical audit.

**Date:** 2026-08-24  
**Source of truth:** `tokens.css` (KlearNow ThemeTokens paths, KlearNow palettes). `--theme-*` is KlearNow; `--kn-*` aliases it. Primitives (`--kn-primitive-*`) must not be used in component CSS.

Palette values were **not** changed. This audit corrects **which existing token** is applied, and flags cases where KlearNow has no passing shade.

### KlearNow scale (what is defined)

| Domain | Defined | Notes |
| --- | --- | --- |
| Color | Surface / interactive / feedback / overlay / brand-purple (AI) | Shade roles: 50–100 bg, 200–300 border/disabled, 400–500 primary, 600–700 hover, 800–900 text on light |
| Type | h1–h6, body lg/md/sm/xs, caption md/sm, ui label/lg/md/sm | Utilities in `tokens.css`. Family: Inter (KN override of KlearNow default) |
| Spacing | 0–11 → 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56 px | |
| Radius roles | surface, surface-large, nested, control, input, pill, round | KN `--kn-radius-large` is 6px (KlearNow large is 16px) — documented product override |
| Elevation | low / mid / high | |
| Borders | none / thinner / thin / thick / thicker | No `--theme-border-width-default` |
| Focus | `--kn-focus-ring` (2px information `#005d7b`) | Box-shadow value, not an `outline` shorthand |
| AI purple | 50/100/200/400/500/600 | Product decision: keep purple on Klear Agent / AI-assist. `#6c5dd3` on white = **5.07:1** (AA pass) |

### Ad-hoc in tokens (not KlearNow)

- `--kn-type-body-sm-size` / `--kn-type-ui-sm-size`: `0.8125rem` (13px) — between KlearNow 12 and 14
- `--kn-weight-light` (300), `--kn-weight-black` (800) — unused, not loaded in Inter
- `--kn-letter-spacing-wide` / `wider` — rem values; KlearNow letter-spacing is em (`-0.033`, `-0.013`, `0`)
- `--kn-layout-drawer-width: 50.4rem`, `--ai-assistant-width: 430px` — layout, not spacing scale

---

## Summary counts

| Action | Count |
| --- | --- |
| Fixed (clear token mismatch / undefined token / illegal fallback) | 38 |
| Flagged for confirmation before broad apply | 9 |
| Needs KlearNow clarification | 11 |

Contrast ratios below are relative-luminance estimates from hex in `tokens.css`.

---

## Typography

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| T1 | `.form-display-field__label` (User / Role / Default Role drawers) | `--theme-typography-caption-sm-size` **undefined**, fallback **10px**; weight token undefined | `--kn-type-ui-label-size` (12px) + `--kn-weight-medium`. KN caption floor is 12px | High | **Fixed** |
| T2 | `.form-display-field__value` | `--theme-typography-body-sm-size` undefined, fallback 13px | `--kn-type-body-sm-size` (KN 13px step) + `--kn-weight-regular` | Medium | **Fixed** |
| T3 | `.form-display-field__label` letter-spacing `0.06em` + uppercase | No KlearNow overline token (letter-spacing only −0.033 / −0.013 / 0) | Need KlearNow overline or accept `letter-spacing: 0` | Medium | **Needs KlearNow clarification** — left 0.06em |
| T4 | `.ai-draft-card__label` / `__reason` / `.ai-service-hint` | `--theme-typography-font-sizes-50` **typo** (real token is `fonts-size-50` = 11px); fallback 12px | `--kn-type-caption-md-size` | Medium | **Fixed** |
| T5 | `.ai-draft-card__mark` | `font-size: 0.85rem` (off-scale) | `--kn-type-body-sm-size` | Low | **Fixed** |
| T6 | `.ai-prompt-chip__new` | `0.625rem` / weight `700` / tracking `0.04em` | size-25 + `--kn-weight-bold`; tracking not in KlearNow | Low | **Fixed** size/weight; tracking flagged (T3) |
| T7 | `.ai-assistant-greeting` / `.ai-assistant-headline` | weight `500`; tracking `-0.01em` / `-0.02em`; unitless line-height | `--kn-weight-medium`; `--kn-letter-spacing-tight`; type line tokens | Low | **Fixed** weight + tracking (surgical; no layout redo) |
| T8 | `.vis-marker__count`, `.kn-steps__item.is-current .kn-steps__marker`, `.ai-draft-card__label`, `.ai-role-chip__label` | raw `font-weight: 600` / `700` | `--kn-weight-semibold` / `--kn-weight-bold` | Low | **Fixed** |
| T9 | `.vis-country__flag` | `font-size: 0.75rem` | `--kn-type-caption-md-size` | Low | **Fixed** |
| T10 | Body-sm 13px step in `tokens.css` | Extra step vs KlearNow 12/14 | Confirm KN ops floor vs KlearNow caption | Low | **Needs KlearNow clarification** |

---

## Spacing

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| S1 | `.perm-head-badge`, `.ai-suggest-tag` padding `2px` | raw px | `--theme-spacing-1` (2px) | Low | **Fixed** |
| S2 | `.ai-review-item`, `.ai-role-chip` `gap: 2px` | raw px | `--theme-spacing-1` | Low | **Fixed** |
| S3 | `.perm-progress` height `4px` | raw px | `--theme-spacing-2` | Low | **Fixed** |
| S4 | `.perm-selected-toggle__pip` 8×8 | raw px | `--theme-spacing-3` | Low | **Fixed** |
| S5 | `.ai-describe-field` / `.perm-search-field` icon inset `+ 20px` | raw px | `--theme-spacing-6` (20px) | Low | **Fixed** |
| S6 | `.ai-describe-loading` `gap: 3px`, dots `5px` | off-scale | Snap to 2 or 4px? Loading-dot size not in KlearNow | Low | **Needs KlearNow clarification** |
| S7 | `.btn--md` `min-height: 2.25rem` (36px) | between spacing-8 (32) and spacing-9 (40) | KlearNow Button size token (not in this file) | Low | **Needs KlearNow clarification** |
| S8 | `--ai-assistant-width: 430px` | raw px | No KlearNow panel-width token | Low | **Needs KlearNow clarification** — not changed |
| S9 | Klearhub sticky cell shadow `8px 0 12px` | raw px | spacing-3 / spacing-4 | Low | **Flagged for confirmation** (table chrome, not just tokens) |

---

## Radius & elevation

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| R1 | AI draft/review/chip, muted drawer section | `--theme-border-radius-md` **undefined**, fallback 8px | `--radius-nested` (KlearNow small / 8px) | Medium | **Fixed** |
| R2 | `.perm-head-badge`, `.perm-progress`, `.perm-selected-toggle` | `--theme-border-radius-full` **undefined** | `--radius-pill` | Medium | **Fixed** |
| R3 | Shipment-detail skeleton | `--radius-medium` **undefined** | `--radius-nested` | Low | **Fixed** (`shipment-detail.js`) |
| R4 | `.ai-describe-field` / `.perm-search-field` | `--theme-border-radius-small, 6px` — token is **8px**; fallback is KN control 6px | Inputs: `--radius-input` (4px). Controls: `--radius-control` (6px) | Medium | **Flagged for confirmation** — Describe-first fields; do not swap input radius without design OK |
| R5 | Cards vs nested tiles | Mostly `--radius-surface` / `--radius-nested` | Consistent | OK | No change |
| R6 | `.role-perm__group:hover` elevates low→mid | Valid elevation tokens | OK | OK | No change |

---

## Icons

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| I1 | Side nav, drawers, tables | Inline stroke SVG 24×24 @ 1.75; 16×16 @ 1.5; some `stroke-width="2"` (menu, profile) | One stroke + size scale | Medium | **Flagged for confirmation** before unifying stroke 2 → 1.75 globally |
| I2 | Quick actions | `assets/quick-actions/*.svg` **filled** raster-style assets vs stroke line-icons elsewhere | Mixed libraries | Medium | **Flagged for confirmation** |
| I3 | Visibility filter chevron | Data-URI stroke `#6b7280` (not in KN palette) | Palette gray `--kn-primitive-surface-600` `#64748b` | Medium | **Fixed** |
| I4 | Klear Agent mark | PNG 18×18 vs SVG 16/20 elsewhere | Confirm AI mark size | Low | **Needs KlearNow clarification** |
| I5 | `.vis-mot-cell svg` | `1rem` raw | `--theme-spacing-5` | Low | **Fixed** |

---

## Borders

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| B1 | `select.vis-th-filter` | `--theme-border-width-default` **undefined**; surface-gray-subtle | `--kn-border-thin` + `--kn-color-border-interactive-gray-default` (same as text filters) | High | **Fixed** |
| B2 | `.perm-search-field` | `--kn-color-border-surface-gray-muted` (divider) | `--kn-color-border-interactive-gray-default` (input) | High | **Fixed** |
| B3 | `.perm-selected-toggle` | `--kn-color-border-surface-gray-default` **undefined** | `--kn-color-border-surface-gray-normal` | Medium | **Fixed** |
| B4 | `.perm-head-badge`, `.ai-describe-wrap`, `.badge--ai` | `border: 1px solid` | `--kn-border-thin` | Low | **Fixed** |
| B5 | AI / table / drawer dividers | `--kn-color-border-surface-gray-muted` | Correct for dividers | OK | No change |
| B6 | `--kn-color-ai-accent-border` (32% purple mix) | ~1.56:1 vs white | Decorative only; do not use as focus/border-only affordance | Medium | **Needs KlearNow clarification** (subtle AI chrome vs 3:1 UI border) |

---

## Interactive states

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| X1 | Buttons primary/secondary/tertiary | Hover uses highlighted / faded theme tokens | Matches KlearNow interactive states | OK | No change |
| X2 | `.btn--primary.btn--color-negative:hover` | `--kn-primitive-red-600` | No `--interactive-background-negative-highlighted` in theme | Medium | **Needs KlearNow clarification** — not changed (would invent a token) |
| X3 | Disabled primary | gray-500 text on 18% indigo (~1.92:1) | WCAG 1.4.3 incidental for disabled | Low | **Flagged** — acceptable as disabled; not restyled |
| X4 | `.btn:disabled` / `.icon-btn:disabled` | opacity-500 rather than 200–300 disabled fills | Secondary/tertiary disabled recipe not in file | Low | **Flagged for confirmation** before replacing opacity with disabled fills everywhere |
| X5 | Table row selected | `--kn-primitive-indigo-500` 9% mix | `--kn-color-background-interactive-primary-default` (same hex) | Medium | **Fixed** |
| X6 | Switch track off | `--kn-primitive-surface-400` | `--kn-color-border-interactive-gray-disabled` (same hex) | Medium | **Fixed** |
| X7 | Drawer / sort item / map AIS chip / switch thumb | `--kn-primitive-surface-0` | `--kn-color-background-interactive-staticWhite-default` | Medium | **Fixed** (shared white fills; see confirmation list for any remaining primitives) |
| X8 | `.role-perm__summary:hover` | `--kn-color-background-surface-gray-muted` **undefined** | `--kn-color-background-interactive-gray-highlighted` | Medium | **Fixed** |

---

## Component composition

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| C1 | Status badges | Light bg + intense text; `--badge--intense` uses **icon** token as fill | Background tokens for intense fills | Medium | **Flagged for confirmation** — swapping to `feedback-background-negative-intense` (red-500) would **worsen** white-text contrast |
| C2 | `.search-input` vs `.perm-search-field` vs `.kn-field__control` | Three field recipes; perm-search used divider border + Tailwind fallbacks | One input recipe (interactive border, `--radius-input`, KlearNow focus) | High | **Fixed** perm-search border/color tokens; radius left (R4) |
| C3 | AI Describe / perm search | Parallel one-off field CSS vs `.search-input` | Prefer shared `.search-input` / `.kn-field__control` | Medium | **Flagged for confirmation** — Describe-first structure not redone |
| C4 | Tabs, dropdowns, tooltips, tables | Shared classes; hover/focus generally tokenized | OK | OK | No change |
| C5 | `.perm-head-badge` vs `.badge--ai` | Duplicate AI pill recipes | One `.badge--ai` | Low | **Flagged for confirmation** |

---

## Contrast failures

Ratios vs white unless noted. Text AA = 4.5:1 (caption/body); UI/large = 3:1.

| # | Component / page | Pairing | Ratio | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `.badge--positive`, `.user-status-label` | green-800 `#136e35` on white / 12% green tint | 6.35 / **5.72** | Text/icon on subtle uses green-800 (700 still fails 4.5). KEEP 600 stays the intense fill. | High | **Fixed** |
| A2 | `.badge--notice`, journey **current** marker | gold-700 `#a15e00` on gold-50 / white | **4.69** / 5.10 | Lightest on-hue step that passes 4.5 on gold-50. Gold-800 also passes but is darker than needed. KEEP 600 stays the intense fill. | High | **Fixed** |
| A3 | `.badge--notice.badge--intense` | white on gold-600 | **2.83** | Fail both as solid fill and as tinted text | High | **Needs KlearNow clarification** |
| A4 | `.kn-toast--positive` | white on green-600 | 3.14 (body text needs 4.5) | No darker green fill | High | **Needs KlearNow clarification** |
| A5 | `.badge--negative` (subtle) | red-600 on red-50 | 4.39 (borderline &lt; 4.5 at 12px) | No red-800 | Medium | **Needs KlearNow clarification** |
| A6 | `.perm-clear-all` | `--kn-color-text-feedback-negative-default` undefined, fallback **`#ef4444` (3.76, not in palette)** | 3.76 | `--kn-color-text-feedback-negative-intense` `#d9342b` (4.69) | High | **Fixed** |
| A7 | Purple AI text `#6c5dd3` on white / purple-50 | 5.07 / 4.53 | AA pass | OK | Validated — **not** replaced with teal |
| A8 | `--kn-color-ai-accent-text` fallback `#5b4fc7` | Invented hex (not in purple scale) | n/a | `#6c5dd3` (purple-500) | Medium | **Fixed** in `tokens.css` fallback only (live value already purple-500) |
| A9 | White on purple-500 / indigo-500 | 5.07 / 11.28 | Pass | OK | No change |
| A10 | Secondary button gray-600 on white | 4.76 | Pass | OK | No change |
| A11 | Green-500 positive **border** on white (map pill) | **2.28** UI fail | Border token is green-500; green-600 is assigned to text/icon | Medium | **Needs KlearNow clarification** — not swapped to a text token |

---

## Semantic shade misuse

| # | Component / page | Current | KlearNow-expected | Severity | Action |
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

| # | Component / page | Current | KlearNow-expected | Severity | Action |
| --- | --- | --- | --- | --- | --- |
| F1 | Global `a` / `button` | 2px information + `--kn-focus-ring` | Pass 7.36:1 | OK | No change |
| F2 | `.kn-switch input:focus-visible` | `outline: var(--kn-focus-ring)` — **invalid** (ring is box-shadow) | `box-shadow: var(--kn-focus-ring)` + outline color | High | **Fixed** |
| F3 | `.ai-review-item:focus-visible` | `outline: none`; border-color only | Visible 3:1 focus | High | **Fixed** |
| F4 | `.ai-role-chip:focus-visible` | 2px **35% purple mix** (~1.63:1) | Solid purple-500 or KlearNow information ring | High | **Fixed** |
| F5 | `.ai-describe-field:focus` / `.perm-search-field:focus` | 3px **15% mix** (~1.22:1); `:focus` not `:focus-visible` | `:focus-visible` + 2px solid brand/information | High | **Fixed** |
| F6 | `.ai-describe-clear` / `.ai-describe-chip` / `.kn-select__chip-remove` | 1px box-shadow, `outline: none` | `--kn-focus-ring` | Medium | **Fixed** |
| F7 | `.search-input:focus-within`, `.kn-field__control:focus-visible` | 1px primary ring (not 2px `--kn-focus-ring`) | KlearNow focus is thicker | Medium | **Flagged for confirmation** before changing **all** inputs |
| F8 | `.vis-th-filter:focus-visible` | Same 1px primary ring as fields | Same as F7 | Medium | Bundled with F7 |

AI purple **15–35% glows fail 3:1**. Solid `#6c5dd3` as a 2px ring on white passes. KlearNow default focus remains information (sapphire) on non-AI controls.

---

## Agentic Broker composer — KlearNow parity pass (2026-09-01)

Scope: `.agentic-home__composer` (landing + thread follow-up, both render the `--lg` variant), its immediate siblings, and the thread message avatar. Explicitly **not** `.ai-assistant-composer` (separate sidebar AI-panel widget, `.kn-chat-input__card`-based) — a different component, not touched.

| # | Item | Action |
| --- | --- | --- |
| AB1 | `.agentic-home__composer:focus-within` box-shadow glow (`0 0 0 3px` purple 22%) | **Fixed** — converted to the outline mechanism: `outline: 4px solid var(--ai-assistant-accent-border); outline-offset: 1px`. Drop-shadow retained, glow ring removed. |
| AB2 | `.icon-btn.agentic-home__attach`, `.icon-btn.agentic-home__send`, `.agentic-home__error-dismiss`, `.agentic-home-pill`, `.agentic-msg-action` `:focus-visible` — 2px outline (`--kn-border-thicker`), inconsistent 0/1px/2px offsets | **Fixed** — normalized to `outline: 4px solid var(--ai-assistant-accent-border); outline-offset: 1px` on all five. |
| AB3 | `.agentic-home__composer--lg` / `.agentic-home__composer--lg .agentic-home__input` — toolbar clearance carved out of the textarea's own lopsided bottom padding (`4px`/`0`/`20px`) instead of the container `gap` | **Fixed** — textarea padding now uniform top/bottom (`4px`/`4px`); container `gap` (`4px`→`20px`) now carries the full field-to-toolbar spacing. Structural only — verified pixel-identical rendering via live inline-style A/B toggle (screenshots + `getBoundingClientRect`), both landing and thread composer instances. |
| AB4 | `.agentic-thread-msg__avatar img` (13px Klear Agent mark inside a 26px decorative circle) vs KlearNow `Avatar`'s 20px floor | **No change** — documented exempt: decorative glyph, no identity/sender-switching role, not the same semantic component as KlearNow `Avatar`. Comment added at the CSS rule. |
| AB5 | Ghost-suggestion cycle interval — `3200ms` | **Fixed** — `4000ms` (`agentic-broker.js`). |
| AB6 | `.agentic-home__input` `max-height: 10rem` (160px) | **Fixed** — `12.5rem` (200px). |
| AB7 | `.agentic-home__ghost-badge` ("Tab to accept" pill) — `1px/7px` padding, `3px` icon-gap, no explicit height | **Fixed** — rebuilt to KlearNow Badge tokens: `height: 16px`, `padding: 0 4px`, `gap: 2px`. |
| AB8 | Tooltip `max-width`/`padding` fix (`.kn-tooltip`, currently `max-width: 16rem`, `padding: 8px 12px`) | **Blocked, not shipped** — no target values given or independently recoverable. `token docs`'s component docs are React prop-level (no CSS token/pixel specs), so this couldn't be grounded without the missing target numbers. Needs the actual target `max-width`/`padding` before it can ship. |

**Spot-checks (2026-09-01):**

- **IconButton rest-state background:** confirmed. Base `.icon-btn` (styles.css:5061) is `background: var(--theme-colors-transparent)` at rest, tinted only on `:hover` — matches the ghost-button default. No change needed.
- **Tooltip show/hide delay:** canonical KlearNow Theme uses `delay.xquick` (160) show and `delay.2xquick` (80) hide via `knTheme.motion.delay`. There is no 300ms delay token; 300/300 is not applied.

**Categorization — SideNav active-item color:** not covered by the AB-follow-up "purple-outline family" sweep (item 10 below). That sweep is scoped to the `--ai-assistant-accent-border` `:focus-visible` **outline ring** pattern. `.side-nav-link[aria-current="page"]` (styles.css:887) uses a filled gray **background** (`--kn-color-background-interactive-gray-highlighted`) for its active state — a different mechanism, and not even the purple/AI token family. Logging as its own separate item (13, below).

**Deferred — not this pass:**

10. **Purple-outline family, full sweep:** the AB2 normalization (4px/1px) only covers the composer + its immediate siblings. ~12 more `:focus-visible` sites elsewhere in AI/chat surfaces use the same `--ai-assistant-accent-border` outline pattern with the old inconsistent widths/offsets (side-nav chat list/search, AI assistant side panel, prompt chips, entity links, thinking-toggle, related-chips, message actions). Normalize separately.
11. **Pre-existing blue/purple box-shadow mixing:** independent of the above — `.ai-assistant-panel__resize:focus-visible` (styles.css:2487) and `.ai-prompt-chip:focus-visible` (styles.css:2948) each combine the purple `outline` with a leftover blue `box-shadow: var(--kn-focus-ring)`. Inconsistent before this pass; flagging regardless of when it gets fixed.
12. **Loading-text animation gap:** neither rolling-loading-text implementation (`.ai-rolling-loading` — pure slide; `.ai-msg__rolling.is-swap` — opacity+slide) has blur or a shimmer sweep. Confirmed via real KlearNow `ChatInput` source (`ChatInputGhostSuggestion.tsx`, part 2 below) that this is **not** the ghost-suggestion component — its `RollingText` explicitly passes `showShimmer={false}`. The gap is in `ChatMessage`'s rolling loading text specifically. No agreed timing/blur-radius/gradient spec exists yet; needs its own design pass before implementation, not a token swap.
13. **SideNav active-item background color** (`.side-nav-link[aria-current="page"]`) — separate from the purple-outline sweep (see categorization note above); not otherwise assessed against KlearNow in this pass.
14. **Tooltip show/hide delay** — resolved as Theme canonical: `delay.xquick` / `delay.2xquick`. FLAG: no 300ms delay token.

**Files changed (this pass):** `styles.css` (AB1–AB4, AB6, AB7), `agentic-broker.js` (AB5), `index.html` / `home.html` (cache query strings), `docs/token-audit.md` (this section).

---

## Agentic Broker composer — real KlearNow source pass (2026-09-01, part 2)

Grounded directly in the real KlearNow `ChatInput` source (`ChatInput.web.tsx`, `.native.tsx`, `ChatInputActionBar.tsx`, `ChatInputGhostSuggestion.tsx`, `chatInputTokens.ts`, `types.ts`, `_decisions/decisions.md`), not indirect docs. This corrected two approximations from part 1 and resolved the one previously-open decision.

| # | Item | Action |
| --- | --- | --- |
| AB9 | **Correction to AB3.** Real source: `chatInputBorderRadius = 'medium'` in `chatInputTokens.ts` is a **dead export** — never imported by `ChatInput.web.tsx`/`.native.tsx`. Both platforms pass `borderRadius="large"` to `BaseInput` directly. the real "large" = 16px (`--theme-border-radius-large`/`--radius-surface-large`), not 20px (this app's claude.ai-copied value) and not "medium"/12px (AB1's own earlier guess, before this source was available). | **Fixed** — `.agentic-home__composer--lg` no longer overrides radius; inherits the base rule's `--radius-surface-large` (16px). |
| AB10 | **Correction to AB3's mechanism.** Real source has **no shared container `gap`** between the textarea and the action bar at all. `BaseInput`'s `padding={makeSpace(theme.spacing[5])}` (16px, uniform) covers the textarea itself; `ChatInputActionBar` independently sets its own `padding="spacing.5"` (16px, all four sides) as `bottomContent`. Two self-padded regions, not one padded-textarea + shared-gap-to-toolbar. | **Fixed** — textarea padding is now uniform 16px on all sides (was 4px/0 approximation from AB3); `.agentic-home__composer-bar` now has its own 16px padding (previously none); the `--lg` container's own gap/padding dropped to 0 (no longer needed — each region self-pads). |
| AB11 | Composer elevation — hand-rolled `box-shadow` (rest `0 0.25rem 1.25rem rgba(0,0,0,.035), 0 0 0 1px rgba(0,0,0,.15)`; hover escalated to `rgba(0,0,0,.3)`) | **Fixed** — `BaseInput` is given `elevation="highRaised"` directly; rest state now uses `var(--kn-elevation-highRaised)`. The hover-specific shadow escalation was dropped — the source shows no hover-state elevation change on the card. |
| AB12 | Send/stop button — `2.25rem` (36px), `border-radius: 50%` (circle) | **Fixed** — the real submit control is `Button` icon-only `size="small"`: 32px square, `buttonBorderRadius.small` = 8px (`--theme-border-radius-small`), not a circle (`ChatInputActionBar.tsx` + `buttonTokens.ts`). Needed a compound `.icon-btn.agentic-home__send` selector — `.icon-btn`'s own `border-radius` is defined later in the file and wins at equal specificity otherwise. |
| AB13 | Attach button — icon-only glyph, no visible label, fixed 36px circle | **Fixed** — the real upload control is a labeled `Link variant="button" color="neutral" size="small" icon={PlusIcon}` reading "Upload file" (`ChatInputActionBar.tsx`), not a bare icon button. Rebuilt as an auto-width pill: icon + `Upload file` text, 32px height, 8px radius, `--kn-type-ui-sm-size` label. Still routes through the existing `data-agentic-home-unavailable` "not available in this sample" stub — no real upload functionality added, this was a visual/anatomy fix only. `aria-label` updated from "Attach a document" to "Upload file" to match the documented a11y spec. |
| AB14 | Ghost-suggestion "Tab" badge icon (arrow SVG) | **Checked, no change** — real KlearNow uses `ArrowRightIcon` (`ChatInputGhostSuggestion.tsx`); this app's existing custom SVG (`M5 12h14M13 6l6 6-6 6`, a plain rightward arrow) is already the correct semantic glyph. |
| AB15 | Ghost-suggestion badge `font-weight: var(--theme-font-weight-medium, 500)` | **Fixed** — `--theme-font-weight-medium` is never defined anywhere in `tokens.css` (confirmed via grep); silently rode the `500` fallback. Corrected to the real token, `--kn-weight-medium`. (A second, unrelated instance of the same undefined-var bug exists at styles.css:11134 — out of this pass's chat-input scope, not touched.) |
| AB16 | **Resolves the part-1 "flagged conflict — validation-banner mechanic."** Real source, exactly: the error popup is `position: absolute; bottom: calc(100% - 12px); z-index: 0` (behind the input's `zIndex={1}`) inside a `position: relative` root — an absolutely-positioned popup that overlaps/tucks behind the card's top edge, not an in-flow flex child. Padding `paddingTop="spacing.3"` (8px) / `paddingX="spacing.4"` (12px) / `paddingBottom="spacing.6"` (20px, deliberately large to clear the 12px overlap zone); `borderTopLeftRadius`/`borderTopRightRadius="medium"` (12px), square bottom corners. Motion: `translateY(100%)` ↔ `translateY(0%)` + opacity, `duration: theme.motion.duration.xmoderate`, `easing: theme.motion.easing.emphasized` (`ChatInput.web.tsx`'s `errorSlideVariants`). Dismiss `IconButton` has `marginLeft="auto"`. | **Fixed** — `.agentic-home__error` rebuilt to this exact mechanic: `position: absolute; bottom: calc(100% - 0.75rem); z-index: 0`, `padding: var(--theme-spacing-3) var(--theme-spacing-4) var(--theme-spacing-6)`, top-corners-only `var(--theme-border-radius-medium)`, `opacity`/`transform: translateY()` transition on `var(--kn-motion-duration-xmoderate)` + `var(--kn-motion-easing-emphasized)`. `.agentic-home__composer` given `position: relative` to anchor it. `.agentic-home__error-dismiss` given `margin-left: auto`. Verified live: no longer reflows the textarea/action bar when triggered. |

**Verified via live browser check (both landing and thread composer instances):** composer radius (16px), elevation (`highRaised` token), textarea padding (16px uniform), action-bar padding (16px uniform), send button (32px, 8px radius), attach button (32px, 8px radius, "Upload file" label, 4px icon-gap), and the validation-banner popup mechanic (absolute position, no reflow, correct motion) all match computed-style assertions against the real source values above. No new console errors introduced (pre-existing unrelated network/script.js errors only).

**Files changed (this pass):** `styles.css` (AB9–AB16), `index.html` / `home.html` (cache query strings + attach-button markup for AB13), `docs/token-audit.md` (this section).

---

## ChatMessage — canonical (2026-09-01)

Superseded as the live reference by `docs/components.md` ## ChatMessage and `docs/internal/klearnow-token-system.md` ### ChatMessage. Primitive: `.kn-chat-msg` / `KNChatMessage.hydrate`. Product aliases: `.ai-msg` (sidebar + agentic thread).

Remaining FLAGs (do not invent tokens): bubble shadow `0.5px / 4px / 6%`; self max-width 88%; agentic rolling CSS 1500ms and sidebar rolling JS 1600ms are separate widgets (leave both); copied hold 1600ms; no 600ms auto-collapse; product purple self bubble vs primitive `gray.intense`; leading 20 vs loading plate 32; thread mark 26 vs Avatar floor 20; shimmer is a staticWhite mix; skeleton 82% / 64%; `is-error` CSS unwired (no retry flow — leave until product decides); no thumbnail stack.

---

## Describe-first (Role / Default Role) — flagged separately

Per standing instruction, Describe-first UX was **not** redesigned. Token issues in that CSS block were surgically remapped (undefined tokens, invented hex fallbacks, weak AI focus glows, input border token). **Not done:** merging fields into `.search-input`, changing 6px radius to `--radius-input`, retinting `is-ai-suggested` rows to purple.

---

## Items flagged for user confirmation (before broad apply)

1. **Unify icon stroke** 2.0 → 1.75 (and 16 vs 24 canvas) across nav + chrome.
2. **Replace quick-action filled SVGs** with the stroke set (or vice versa).
3. **Input focus width:** 1px primary inset vs KlearNow 2px `--kn-focus-ring` — all fields/tables/filters.
4. **Disabled buttons:** opacity vs explicit disabled fills (200–300 band) on secondary/tertiary/icon.
5. **Intense status badges:** keep icon-token fills (better contrast) vs semantic background tokens (worse contrast).
6. **AI-suggested rows** currently use **information blue**, not purple AI tokens — retint?
7. **Collapse** `.perm-head-badge` into `.badge--ai`.
8. **Describe-first fields:** move to shared `.search-input` / `--radius-input` (changes layout slightly).
9. **Klearhub sticky-column shadow** px → spacing tokens.

Sibling primitives: if any remaining `--kn-primitive-*` appear in JS/HTML inline styles after this pass, confirm before sweeping.

---

## KlearNow has no clear answer

1. **Positive text on subtle** — resolved: `feedback.text/icon.positive.intense` and `interactive.text.positive.normal` use **green-800** (`#136e35`). KEEP green-600 stays the intense fill.
2. **Notice text on subtle** — resolved: notice text/icon use **gold-700** (`#a15e00`) on gold-50 (4.69:1). Gold-800 exists but is darker than needed. KEEP gold-600 stays the intense fill.
3. **Positive toast** white-on-green-600 fails body AA — intense fill still 600.
4. **Positive intense border** (green-500) fails 3:1 UI vs white.
5. **Negative subtle badge** 4.39:1 — just under 4.5 at caption size; no red-800.
6. **Destructive hover background** — no `interactive.background.negative.highlighted`.
7. **Overline / uppercase tracking** (0.04–0.06em) — not in KlearNow letter-spacing.
8. **13px body-sm** KN floor vs KlearNow 12/14.
9. **36px button height**, **430px AI panel**, **5px loading dots** — off spacing scale.
10. **`--kn-color-ai-accent-border` 32% mix** fails 3:1 as a UI border.
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

`--coach-arrow-left`, `--map-preview-left`, `--map-preview-top` are **runtime positional** custom props, not KlearNow tokens.

---

## Files changed

- `docs/token-audit.md` (this report)
- `tokens.css` — AI text fallback hex aligned to purple-500
- `styles.css` — token remaps, focus rings, primitive → semantic, type/spacing/border
- `shipment-detail.js` — undefined radius token
- `index.html` / `home.html` — cache query strings
