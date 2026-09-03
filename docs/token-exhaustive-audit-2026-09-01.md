# KlearNow exhaustive visual + implementation audit — KlearNow.ai Agentic Broker

**Date:** 2026-09-01
**Method:** Findings are measured against the KlearNow token scale in `tokens.css` and `docs/tokens.md`. Where a target could not be confirmed from those files, the finding says so rather than inventing a value.
**Scope discipline:** findings already logged in `docs/token-audit.md` or `docs/behavior-stress-audit.md` are **not** repeated here.
**Total: 111 distinct findings.** Historical audit — later token work is in `docs/tokens.md`.

---

## Master list (1–111)

### Button

**1. Location:** Button size `.btn--sm` — styles.css:4984-4986
**What KlearNow defines:** `packages/kn/src/components/Button/BaseButton/buttonTokens.ts` (source: github) — `minHeight.small = 32px` (fixed), `buttonPadding.small = { left: 3, right: 3 }` (spacing index 3 = 8px horizontal, 0 vertical; height carried by `minHeight`, not padding).
**What this app does:** `padding: var(--kn-spacing-02) var(--kn-spacing-04)` = 4px vertical / 12px horizontal, with **no `min-height`** — rendered height floats with line-height+padding instead of being pinned to 32px.
**Category:** sizing **Severity:** subtle-but-real

**2. Location:** Button size `.btn--md` — styles.css:4979-4982
**What KlearNow defines:** `buttonTokens.ts` (source: github) — `minHeight.medium = 36px`, `buttonPadding.medium = { left: 4, right: 4 }` → 12px horizontal, 0 vertical.
**What this app does:** `min-height: 2.25rem` (36px, matches) but `padding: var(--theme-spacing-0) var(--kn-spacing-05)` = 16px horizontal, 4px more than the 12px.
**Category:** spacing **Severity:** subtle-but-real

**3. Location:** Button size coverage — styles.css:4979-4990, all `.btn` usages app-wide
**What KlearNow defines:** `size: 'xsmall' | 'small' | 'medium' | 'large'`, fixed heights 28/32/36/48px (source: kn-mcp docs + github `buttonTokens.ts`).
**What this app does:** Only `.btn--sm` and `.btn--md` exist anywhere (grep-confirmed). the `xsmall` (28px) and `large` (48px) have no equivalent — every button in the product is forced into one of two height bands.
**Category:** structure **Severity:** structural-only

**4. Location:** Active/pressed feedback — styles.css:1261-1264, 1643-1645, 1941-1944, 2142-2144 (`.side-nav-chat-new__btn`, `.agentic-home-pill`, `.agentic-home__send`/`__attach`, `.agentic-msg-action`, all `:active`)
**What KlearNow defines:** `StyledBaseButton.web.tsx` / `IconButton/StyledIconButton.web.tsx` (source: github) — `:active` swaps `backgroundColor`/`boxShadow`, never sets a `transform`.
**What this app does:** `transform: scale(0.92-0.98)` on `:active` across multiple controls — a motion pattern absent from the real Button/IconButton source at any size or variant.
**Category:** motion **Severity:** subtle-but-real

**5. Location:** Disabled-state recipe, secondary/tertiary — styles.css:5101-5104 (`.btn:disabled`), 5096-5099 (`.icon-btn:disabled`), contrast with 5106-5114 (primary-only override)
**What KlearNow defines:** `buttonTokens.ts` / `StyledIconButton.web.tsx` (source: github) — disabled is a **token color swap** (`interactive.text.gray.disabled` etc.) on every variant, never an opacity reduction.
**What this app does:** Only `.btn--primary:disabled` gets a token-based override. Every other disabled control (secondary/tertiary buttons, all icon-btns) falls through to a generic `opacity: var(--theme-opacity-500)` — a different mechanism than the confirmed per-variant disabled colors. (Residual gap beyond the existing audit's X4, which left this unconfirmed.)
**Category:** color **Severity:** subtle-but-real

### IconButton

**6. Location:** IconButton default hover/box model — styles.css:5062-5081 (`.icon-btn`, `.icon-btn:hover`)
**What KlearNow defines:** `IconButton/StyledIconButton.web.tsx` (source: github) — with default props, `hasContainer` is `false`: no fixed hit-box, hover stays fully transparent, only icon `color` shifts. A fixed box + hover fill only exist when `isHighlighted` is explicitly set.
**What this app does:** `.icon-btn` is unconditionally a fixed 32×32px box with a gray hover fill on every instance app-wide — always behaves like the `isHighlighted` variant, with no way to render the actual borderless default.
**Category:** interaction **Severity:** subtle-but-real

**7. Location:** IconButton size variants — styles.css:5062 (single rule, no modifiers)
**What KlearNow defines:** `size: 'small' | 'medium' | 'large'`; fixed-box variants (`isHighlighted`) are 24px (small) / 32px (medium) (source: kn-mcp + github `IconButton/tokens.ts`).
**What this app does:** Only one recipe (32px) exists anywhere — every icon button in the app renders at the same footprint regardless of context.
**Category:** sizing **Severity:** subtle-but-real

### Badge / Counter / Indicator / Chip / Tag

**8. Location:** Badge sizing — styles.css:6131-6140 (`.badge, .pill`)
**What KlearNow defines:** `Badge/badgeTokens.ts` (source: github) — fixed `badgeHeight` per size: xsmall=14, small=16, medium=20, large=24px; horizontal padding spacing.2 (4px) for xsmall–medium, spacing.3 (8px) for large.
**What this app does:** `padding: var(--theme-spacing-1) var(--theme-spacing-3)` = 2px/8px, **no explicit height**, and exactly one recipe (no size variant) — can't be pinned to any single KlearNow Badge size.
**Category:** sizing **Severity:** subtle-but-real

**9. Location:** Counter sizing — styles.css:5502-5513 (`.counter`)
**What KlearNow defines:** `Counter/counterTokens.ts` (source: github) — height/min-width: small=16, medium=20, large=24px; default size is `medium` (source: kn-mcp docs).
**What this app does:** Fixed 16px height/min-width (matches `small` exactly) used everywhere, including contexts where the own default is `medium` (20px) — no medium/large variant exists.
**Category:** sizing **Severity:** subtle-but-real

**10. Location:** Indicator emphasis/size — styles.css:5430-5435 (`.indicator`)
**What KlearNow defines:** `Indicator/indicatorTokens.ts` (source: github) — two distinct emphases: `subtle` (dot only, inner 6/8/10px) vs `intense` (dot **plus visible background circle**, outer 16/20/24px). Docs (source: kn-mcp) confirm intense "shows a background circle."
**What this app does:** A single fixed 8px dot, no emphasis/size variant. The live/AIS pulse (styles.css:5453-5471) bolts a `box-shadow` pulse onto the plain dot rather than using the actual outer-circle container for the intense treatment.
**Category:** structure **Severity:** subtle-but-real

**11. Location:** Chip/Tag/Badge conflation (merged from two independent findings) — admin-ux.js:1168-1170, styles.css:6131 (`.badge`), styles.css:12594-12649 (`.kn-select__chip*`)
**What KlearNow defines:** `Tag` (source: github, `Tag/Tag.tsx`) is structurally separate from `Badge` — its own color-token family (`interactive.background.gray.default/.disabled`, not Badge's `feedback.background.*.subtle`), `borderRadius="max"`, its own size-specific padding, and a real `IconButton`+`CloseIcon` dismiss control. the own `ChatInput`/`SelectInput` docs (source: kn-mcp) describe the multi-select-tag use case in these terms.
**What this app does:** The only dismissible-chip UI in the app is `class="badge type-caption-sm kn-select__chip${aiClass}"` (admin-ux.js:1168) — it inherits Badge's `feedback.*` subtle-tint recipe, not Tag's `interactive.background.gray` recipe, and its dismiss control (styles.css:12622-12643) is a bare `×` text glyph, not an icon-based control. There is no dedicated `.chip`/`.tag` class anywhere in the stylesheet (grep-confirmed) — Badge, Chip, and Tag are all approximated through Badge's pill recipe plus ad-hoc modifiers (`.kn-select__chip`, `.vis-chip`, `.ai-role-chip`, `.ai-prompt-chip`, `.agentic-home-pill`) that don't share the real per-component token families.
**Category:** structure **Severity:** visually-obvious

**12. Location:** Chip sizing — styles.css:7804-7811 (`.vis-chip`, closest analog to the selectable `Chip`)
**What KlearNow defines:** `Chip/chipTokens.ts` (source: github) — fixed heights: xsmall=24, small=28, medium=36, large=48px.
**What this app does:** `min-height: var(--theme-spacing-8)` = 32px — falls between the `small` (28px) and `medium` (36px), matching neither.
**Category:** sizing **Severity:** subtle-but-real

### SideNav

**13. Location:** SideNav active-item background — `.side-nav-link[aria-current="page"]` (styles.css:887-892)
**What KlearNow defines:** `SideNavLink.web.tsx` (source: github) — `'&[aria-current], &[aria-current]:hover': { backgroundColor: interactive.background.gray.fadedHighlighted }` — a lighter "faded highlighted" fill.
**What this app does:** `background: var(--kn-color-background-interactive-gray-highlighted)` — resolves to plain `highlighted`, not `fadedHighlighted`. A `--kn-color-background-interactive-gray-fadedHighlighted` alias doesn't exist anywhere in tokens.css (only `staticWhite-fadedHighlighted` is defined) — the token this state needs was never aliased.
**Category:** color **Severity:** subtle-but-real

**14. Location:** SideNavLink active/hover font-weight — styles.css:881-892
**What KlearNow defines:** Source: github — hover changes only `color`/`backgroundColor` (no weight change); title weight is `isActive ? 'semibold' : 'regular'` — regular on hover, semibold only when active.
**What this app does:** Both `:hover` and `[aria-current="page"]` set `font-weight: var(--kn-weight-medium)` — hover is bolded (KlearNow never bolds on hover) and active stops at `medium` instead of `semibold`.
**Category:** typography **Severity:** subtle-but-real

**15. Location:** SideNavLink transition property list — styles.css:875-878
**What KlearNow defines:** `getNavItemTransition()` (source: github, `SideNav/tokens.ts`) is `background-color` only.
**What this app does:** Also animates `color` and `font-weight` — `font-weight` isn't meaningfully tweenable on a static webfont, an untracked non-KlearNow transition target.
**Category:** motion **Severity:** structural-only

**16. Location:** SideNav L1-collapsed label visibility — `.hide-when-collapsed` (styles.css:817-819)
**What KlearNow defines:** `SideNav.web.tsx` (source: github) — fades labels via `opacity` transitions (`quick` duration + `easing.exit`/`entrance`), element stays present.
**What this app does:** Hard, untransitioned `display: none` toggle — labels snap instead of cross-fading.
**Category:** motion **Severity:** visually-obvious

**17. Location:** SideNavFooter — absent from `#app-sidebar` (index.html:98-656)
**What KlearNow defines:** `SideNavFooter.web.tsx` (source: github) — a dedicated pinned container: `border-top`, `background: surface.background.gray.moderate`, `elevation: lowRaised`, `padding: spacing.4`, separated from the scrollable body.
**What this app does:** No such element exists (grep-confirmed) — every L1 item, including settings-adjacent utility rows, lives in the same scrolling list with no pinned/elevated separation.
**Category:** structure **Severity:** structural-only

**18. Location:** SideNavSection — absent from `#app-sidebar` (index.html:102-647)
**What KlearNow defines:** `SideNavSection.web.tsx` (source: github) — optional grouping title (`Text size="xsmall" weight="medium"`) plus a `maxVisibleItems`/"+N more" collapse pattern.
**What this app does:** One flat `<ul class="side-nav-list">` with no section grouping or titles anywhere (grep-confirmed).
**Category:** structure **Severity:** structural-only

### TopNav / Avatar / Breadcrumb

**19. Location:** Avatar `--information` color recipe — `.avatar--information` (styles.css:490-493), the "JC" TopNav user avatar
**What KlearNow defines:** `avatarTokens.ts` (source: github) — `color="information"` maps to `background: interactive.background.information.faded` (light tint) + `text: interactive.text.information.normal` — same light-fill/colored-text recipe as every Avatar color.
**What this app does:** `background: var(--theme-colors-feedback-background-information-intense)` (saturated fill) + white text — a badge/toast recipe, not Avatar's. The correct unused tokens already exist: `--kn-color-background-interactive-information-faded`, `--kn-color-text-interactive-information-normal`.
**Category:** color **Severity:** visually-obvious

**20. Location:** Avatar size scale — `.avatar` (styles.css:471-483, 32px)
**What KlearNow defines:** `avatarTokens.ts` (source: github) — 5 fixed steps: xsmall 20, small 28, medium 36, large 48, xlarge 56px.
**What this app does:** Base `.avatar` (default TopNav avatar) is 32px — between `small` and `medium`, matching neither. (`.avatar--large` at 48px does correctly match the `large` — no issue there.)
**Category:** sizing **Severity:** subtle-but-real

**21. Location:** TopNav profile-menu chevron / hamburger icon stroke-width — index.html:72, 35
**What KlearNow defines:** N/A as a KlearNow value, but every SideNav chevron on the same page uses `stroke-width="1.75"` (app-internal consistency, e.g. index.html:110, 251, 499).
**What this app does:** These two icons use `stroke-width="2"` — a specific instance of the app-wide icon-stroke inconsistency (already flagged generically as I1 in the atomic audit), localized to the TopNav/Avatar chrome and not previously cited by file:line.
**Category:** icon **Severity:** subtle-but-real

**22. Location:** Breadcrumb current-page emphasis — `.breadcrumb-link.is-current` (styles.css:3995-3999)
**What KlearNow defines:** `BreadcrumbItem.web.tsx` (source: github) — the current item renders non-interactive `Text weight="medium" color="surface.text.gray.normal"` — the most prominent item in the trail.
**What this app does:** `color: var(--kn-color-text-surface-gray-subtle)`, no font-weight override — inherits base `font-weight: regular`. The current page ends up lighter/less prominent than prior links, the inverse of the intended hierarchy.
**Category:** typography **Severity:** subtle-but-real

### Card

**23. Location:** Card padding — `.panel.card` (styles.css:5141-5150)
**What KlearNow defines:** `Card.padding` accepts only `spacing.0/3/4/5/7`, default `spacing.7` (24px) (source: kn-mcp docs).
**What this app does:** `padding: var(--theme-spacing-5)` = 16px, not the documented default.
**Category:** spacing **Severity:** subtle-but-real

**24. Location:** Card background — `.panel.card` (styles.css:5143)
**What KlearNow defines:** `Card.backgroundColor` default is `surface.background.gray.intense` (source: kn-mcp docs; exact resolved hex not confirmable via available sources).
**What this app does:** `background: var(--kn-color-background-interactive-staticWhite-default)` — hardcoded white, a different token family than the documented default.
**Category:** color **Severity:** subtle-but-real

### Tabs

**25. Location:** Tabs structure — `.kh-tabs` (styles.css:7074-7095)
**What KlearNow defines:** `Tabs` requires `TabList`+`TabItem` composition; `variant` defaults to `'bordered'` (source: kn-mcp docs).
**What this app does:** A `<div role="tablist">` wrapping plain `.btn.btn--primary`/`.btn.btn--tertiary` elements with `role="tab"` bolted on — not the composition at all, visually closer to a filled toggle-group than the documented `bordered` default.
**Category:** structure **Severity:** visually-obvious

**26. Location:** Tabs — inconsistent visual language across `role="tab"` components: `.kh-tabs` (filled pill), `.kn-tab` (styles.css:9299-9322, underline), `.isf-doc-rail__item` (styles.css:13528-13567, filled circular icon buttons)
**What KlearNow defines:** One `Tabs` component, one configurable `variant` prop, for consistent styling (source: kn-mcp docs).
**What this app does:** Three structurally and visually distinct hand-built patterns all wearing `role="tab"`, none matching each other or the `TabList`/`TabItem`.
**Category:** structure **Severity:** subtle-but-real

**27. Location:** Tabs keyboard navigation — Shipment/Transaction view toggles (transaction-us-delivery-order.js:323-325, -ftz.js:583-585, -in-bond.js:718-720, -entry.js:418-420, -psc.js:396+, -shipments.js:212+)
**What KlearNow defines:** No in-repo behavior spec found (same caveat as the existing behavior audit's dropdown note), but standard ARIA `tablist` semantics imply arrow-key navigation.
**What this app does:** `role="tab"`/`role="tablist"` markup with only click handlers — no `ArrowLeft`/`ArrowRight`/`Home`/`End` handling (grep-confirmed absent), unlike `visibility.js:1224-1240` and `script.js:2262+` which do implement it for other `.kh-tabs` instances. Distinct from the existing audit's S2 (a different component).
**Category:** interaction **Severity:** subtle-but-real

### Pagination

**28. Location:** Pagination page sizes — `VIS_TABLE_PAGE_SIZES` (visibility.js:89)
**What KlearNow defines:** `Pagination.pageSize`/`defaultPageSize` is a literal union restricted to exactly `10 | 25 | 50` (source: kn-mcp docs).
**What this app does:** `[10, 25, 50, 100]` — includes `100`, outside the documented allowed set.
**Category:** sizing **Severity:** subtle-but-real

### Divider

**29. Location:** Divider — no dedicated component; ad hoc `border-top` repeated at 16+ sites (styles.css:3178, 4730, 4953, 5205, 5945, 6791, 8022, 8061, 8257, 8878, 10628, 11467, 11578, 12369, 14108, 14113, and more)
**What KlearNow defines:** `Divider` is a dedicated component with `orientation`, `dividerStyle`, `variant` (default `'muted'`), `thickness` (default `'thin'`) (source: kn-mcp docs).
**What this app does:** No `.divider`/`.kn-divider` class or `<hr>` exists anywhere — every divider is duplicated inline across unrelated rule blocks rather than one reusable primitive. (The color token chosen does directionally match the `'muted'` default — the gap is the missing shared abstraction, not the color.)
**Category:** structure **Severity:** structural-only

### Menu / Dropdown

**30. Location:** Menu chrome inconsistency — `.menu-overlay` bare (styles.css:504-514, profile menu) vs `.vis-menu__list` (styles.css:7714-7730, filter/sort/pagination dropdowns)
**What KlearNow defines:** A single `Menu`/`MenuOverlay` component implies one consistent overlay treatment; exact border/shadow values aren't documented (source: kn-mcp docs) — the internal inconsistency itself is the confirmable gap.
**What this app does:** Bare `.menu-overlay` has shadow only, no border. `.vis-menu__list` additionally has a border, despite both carrying the `menu-overlay` class — two overlay surfaces serving the same role render with different chrome.
**Category:** color **Severity:** subtle-but-real

**31. Location:** Dropdown — native `<select>` for MOT/Status filters (index.html:1923, 1925)
**What KlearNow defines:** `Dropdown` only accepts `SelectInput`/`SearchInput`/`DropdownButton`/etc. as children — no native-`<select>`-based variant exists in the API (source: kn-mcp docs).
**What this app does:** These two filters use a real browser `<select>` (CSS-skinned) rather than the custom-listbox pattern used elsewhere in the app (`.vis-menu__list` + `.action-list-item`). Because it's a native control, its open menu can never get the ActionList item padding/hover/selected-state/elevation — a structural incompatibility, additional to the already-fixed border issue (B1) on the same selector.
**Category:** structure **Severity:** structural-only

**32. Location:** SelectInput/Dropdown trigger chevron rotation — styles.css:12495-12504
**What KlearNow defines:** No explicit chevron-rotation spec documented (source: kn-mcp docs), but this app's own convention for open/close chevrons (`.kh-accordion__chevron`, styles.css:11371-11372) is to animate the rotation.
**What this app does:** `transform: rotate(180deg)` on `[aria-expanded="true"]` with **no transition property anywhere in the rule** — snaps instantly, inconsistent with the accordion chevron pattern used for the identical purpose elsewhere in the same file.
**Category:** motion **Severity:** subtle-but-real

### Popover

**33. Location:** Popover elevation — `.map-preview__card` (styles.css:6631-6637)
**What KlearNow defines:** Popover docs state "designed with a subtle appearance" (source: kn-mcp docs); no specific elevation token documented.
**What this app does:** `box-shadow: var(--theme-elevation-highRaised)` — the *heaviest* of the app's three tiers, directly contradicting the stated "subtle" intent even though the exact target tier can't be confirmed.
**Category:** elevation **Severity:** subtle-but-real

**34. Location:** Popover arrow/pointer — `.map-preview` (styles.css:6618-6624)
**What this app does:** No arrow element pointing back at the triggering element.
**What KlearNow defines:** Not confirmable — Popover's prop docs define no `arrow`-related prop (source: kn-mcp docs), but this wasn't cross-checked against Storybook/GitHub source for this specific detail.
**Category:** structure **Severity:** structural-only (unconfirmed — flagged for verification, not asserted as a defect)

### Table

**35. Location:** Table — no sort affordance on Klearhub shipments table (index.html:1901-1931)
**What KlearNow defines:** `Table` documents `onSortChange`/`sortFunctions` keyed per column, implying sortable interaction lives on `TableHeaderCell`s (source: kn-mcp docs).
**What this app does:** No `<th>` has any sort affordance (no `aria-sort`, icon, or handler — grep-confirmed). Sorting instead lives in a disconnected "Created date newest/oldest" dropdown not tied to any visible column.
**Category:** structure **Severity:** subtle-but-real

**36. Location:** Table sticky header — `.vis-table thead th` / `--klearhub thead th` (styles.css:8239-8248, 8309-8330)
**What KlearNow defines:** `isHeaderSticky` defaults to `false` (opt-in) (source: kn-mcp docs).
**What this app does:** `position: sticky` applied unconditionally to every table header app-wide, no opt-out — a deliberate product choice but a deviation from the default-off behavior.
**Category:** structure **Severity:** structural-only

**37. Location:** Table row density — all table instances
**What KlearNow defines:** `rowDensity: 'compact' | 'normal' | 'comfortable'`, default `'normal'` (source: kn-mcp docs).
**What this app does:** One fixed cell padding everywhere (tokens.css:567-568) — no density variant or toggle exists anywhere.
**Category:** sizing **Severity:** structural-only

### Modal

**38. Location:** Modal motion (merged from two independent findings) — `.kn-modal-root`/`.kn-modal` (styles.css:12707-12737); same gap on `.vis-menu__list` dropdown/kebab menu (styles.css:7714-7731)
**What KlearNow defines:** Real KlearNow `motion.ts` (source: github) explicitly documents `entrance`/`exit` easing as "for modal and drawer" — this app's own `.kn-drawer` correctly implements exactly that pattern (`transition: opacity var(--kn-motion-duration-xmoderate) var(--kn-motion-easing-exit)` etc., styles.css:8752-8757).
**What this app does:** `.kn-modal` has no `transition`/`animation` property anywhere — toggles via `[hidden]`, appears/disappears instantly. `.vis-menu__list`, the shared dropdown/kebab-menu overlay app-wide (which does correctly carry `box-shadow: var(--kn-elevation-midRaised)`), likewise has zero entrance/exit motion despite being exactly the overlay-reveal pattern the entrance/exit tokens target.
**Category:** motion **Severity:** visually-obvious

**39. Location:** Modal body/header/footer padding — `.kn-modal__header`/`__footer` (styles.css:12745-12752), `__body` (styles.css:12763-12768)
**What KlearNow defines:** `ModalBodyProps.padding` is contractually restricted to `spacing.0 | spacing.6` (20px), default `spacing.6` (source: kn-mcp docs).
**What this app does:** Uses `--theme-spacing-5` (16px) throughout — not one of the two legal ModalBody padding values.
**Category:** spacing **Severity:** subtle-but-real

**40. Location:** Modal initial-focus entry point — `confirmDialog()` (admin-ux.js:1047-1084), "Add Reporting User" modal (user-management.js:1321-1333)
**What KlearNow defines:** `initialFocusRef` is a documented, explicit prop for a deliberate per-dialog focus target (source: kn-mcp docs) — not "whichever element is first in the DOM."
**What this app does:** `confirmDialog`'s title lives in the body as a plain `<p>`, not an `<h2>` (so `syncOverlayFocus`'s `h2[tabindex='-1']` match fails); the "Add Reporting User" modal's `<h2>` has no `tabindex="-1"` either. Both fall back to focusing the first focusable element — the small corner close (×) icon-button — for every confirm/discard modal and the reporter modal.
**Category:** interaction **Severity:** subtle-but-real

### Drawer

**41. Location:** Drawer stacking — every admin module (role-management.js:1378, default-role-management.js:1582, user-management.js:777/1034/1231)
**What KlearNow defines:** Drawer docs state, verbatim: "Drawers support stacking functionality, allowing up to two drawers to be open at once with a neat UI treatment showing the previous drawer peeking from behind" (source: kn-mcp docs).
**What this app does:** `.kn-drawer` has a single fixed position with no stacked-offset variant; every drawer-opening path swaps a single drawer root rather than opening a second one alongside it. The app's drawer architecture is single-drawer-only by construction.
**Category:** structure **Severity:** structural-only

### EmptyState

**42. Location:** EmptyState icon omission — `window.KNAdminUX.emptyState()` (admin-ux.js:1497-1511) and `renderVisEmpty()` (visibility.js:329-336)
**What KlearNow defines:** `asset` is a first-class EmptyState prop, used in every documented example (source: kn-mcp docs).
**What this app does:** Both helpers emit heading+description+actions with no `.empty-state__asset` icon at all — unlike the app's own correct usage elsewhere (`.empty-state--page`, index.html:2053-2064; shipment-detail.js:360-365). Role, User, Default Role, and the Shipments table all render icon-less empty states.
**Category:** structure **Severity:** subtle-but-real

**43. Location:** Dashboard "Recent shipments" — `#dash-recent-body` (index.html:1233 / home.html:1203), script.js:4138-4150
**What KlearNow defines:** EmptyState is the standard treatment for zero-result table/list contexts (source: kn-mcp docs).
**What this app does:** An empty `summary.newest` simply produces `""` — a table with a header row and zero body rows, no message, no fallback at all. The only dashboard widget with no empty-state handling whatsoever.
**Category:** structure **Severity:** structural-only

**44. Location:** No error/failed-to-load EmptyState pattern anywhere in the app
**What KlearNow defines:** the own primary EmptyState example is literally named `ErrorEmptyState` ("Failed to load dashboard data... Try Again/Go Back/Contact Support") — a first-class use case (source: kn-mcp docs).
**What this app does:** Repo-wide search for "Failed to load"/"something went wrong"/"couldn't load" returns zero matches. The only non-"no results" fallback is `#empty-page` ("This workspace section is not available yet") for unbuilt routes — no treatment exists for a data fetch/load failure.
**Category:** structure **Severity:** structural-only

### Landing / page-level layout

**45. Location:** Landing page vertical rhythm — `.agentic-home__inner` (styles.css:1547-1559, `gap: var(--theme-spacing-3)` = 8px)
**What KlearNow defines:** Not confirmable for this specific layout via sources 1-3, but the app's own comparable top-level container (`.dashboard-inner`, styles.css:4035-4047) uses `gap: var(--theme-spacing-7)` (24px) to separate major sections.
**What this app does:** Uses 8px — 3× tighter than the equivalent major-section rhythm one page over — to separate three visually distinct large blocks (greeting+subtext, composer, suggestion pills). Flagged as an internal inconsistency needing verification against the own guidance, not a confirmed deviation.
**Category:** spacing **Severity:** subtle-but-real

### Alert

**46. Location:** Alert defined twice with conflicting rules — `.kn-alert` at styles.css:5348 and again at styles.css:7280
**What KlearNow defines:** A single canonical Alert anatomy — icon + optional title + description, optional actions, optional dismiss (source: kn-mcp docs).
**What this app does:** Two conflicting definitions of the same class: different padding (24px vs 20/16px), different icon size (24px vs 20px), different wrapper class (`.kn-alert__content` vs `.kn-alert__body`, neither ever used in markup), different negative-text color token. Real instances (admin-ux.js:105-111, user-management.js:791-796) put icon and description as bare flex children directly.
**Category:** structure **Severity:** subtle-but-real

**47. Location:** Alert missing title/dismiss/actions — live instances (admin-ux.js:97-112, user-management.js:791-796)
**What KlearNow defines:** `title`, `isDismissible` (default `true`), and structured `actions` are documented Alert features (source: kn-mcp docs).
**What this app does:** No live Alert renders a title, dismiss button, or KlearNow-style actions wrapper — a bare `.kn-link` text button is spliced in as a sibling instead. A `.kh-alert-dismiss` handler exists (script.js:2277-2281) but no element ever carries that class — dead code. Alert is effectively never dismissible despite KlearNow defaulting to dismissible.
**Category:** structure **Severity:** structural-only

### Toast

**48. Location:** Toast icon — `showKnToast()` (script.js:2926-2955)
**What KlearNow defines:** `iconMap` swaps the glyph per `color` — check-circle for positive, alert-octagon for negative, alert-triangle for notice, info for information/neutral (source: github, `Toast.web.tsx`).
**What this app does:** Every toast renders the identical check-circle SVG regardless of `color` — only the background swaps. A negative/error toast still shows a checkmark.
**Category:** icon **Severity:** visually-obvious

**49. Location:** Toast action button — `showKnToast()` (script.js:2926-2974)
**What KlearNow defines:** `ToastProps.action` renders a `Button` beside the dismiss control (source: kn-mcp docs + github `Toast.web.tsx`).
**What this app does:** No `action` parameter exists at all — only content and dismiss are ever rendered; no code path for an actionable toast anywhere.
**Category:** structure **Severity:** structural-only

**50. Location:** Toast enter/exit distance — `@keyframes kn-toast-in`/`-out` (styles.css:9156-9176)
**What KlearNow defines:** `slideIn`/`slideOut` translate `100%` ↔ `0` (full toast-height slide) (source: github, `Toast.web.tsx`); duration/easing tokens match this app's exactly.
**What this app does:** Duration/easing correct, but translate distance is only `var(--theme-spacing-4)` (16px) — a nudge rather than a full-height slide.
**Category:** motion **Severity:** subtle-but-real

**51. Location:** Toast removal timing — `remove()` (script.js:2957-2970)
**What KlearNow defines:** N/A — internal-consistency check: the app's own CSS declares the exit duration as `--kn-motion-duration-moderate` = 280ms.
**What this app does:** `setTimeout(..., 220)` deletes the DOM node 60ms before the 280ms exit animation it triggers actually finishes — truncates the exit motion on every dismissal.
**Category:** motion **Severity:** subtle-but-real

**52. Location:** Toast surface — `.kn-toast--*` (styles.css:9085-9119)
**What KlearNow defines:** A semi-transparent `popup.background.*.moderate` fill with an inset 1px border and `backdrop-filter: blur(...)` (source: github, `Toast.web.tsx`).
**What this app does:** Each color variant is a flat, fully opaque `*-intense` background, no border, no `backdrop-filter` anywhere — a solid card rather than the blurred/bordered popup surface.
**Category:** elevation **Severity:** subtle-but-real

### Spinner

**53. Location:** Spinner sizing — `.kn-spinner svg` (styles.css:3280-3284), `knSpinnerHtml()` (script.js:4665-4667)
**What KlearNow defines:** `size: 'medium'|'large'|'xlarge'` → 16/20/24px (source: kn-mcp docs + github `spinnerTokens.ts`).
**What this app does:** Hardcoded 16px, no size-variant classes anywhere — every spinner instance is the same fixed size.
**Category:** sizing **Severity:** subtle-but-real

**54. Location:** Spinner label — `knSpinnerHtml()` (script.js:4665-4667)
**What KlearNow defines:** `label`/`labelPosition` renders visible accompanying text next to the glyph, default `'right'` (source: kn-mcp docs).
**What this app does:** Only ever emits the SVG with `aria-label="Loading"` — no visible label text is ever rendered alongside a spinner.
**Category:** structure **Severity:** structural-only

### Skeleton

**55. Location:** Skeleton pulse — `@keyframes kn-skeleton-pulse` (styles.css:4194-4202)
**What KlearNow defines:** Real pulse animates `background-color` (crossfading gray.default → gray.highlighted) via a two-part fade-in + alternating color-crossfade animation (source: github, `Skeleton/PulseAnimation.web.tsx`); duration/easing tokens match.
**What this app does:** Animates `opacity` (1 → 0.55 → 1) instead of `background-color` — a dimming pulse rather than the color-tone shift.
**Category:** motion **Severity:** subtle-but-real

**56. Location:** AI message skeleton shimmer duration — `.ai-msg__skeleton span` (styles.css:3684-3696)
**What KlearNow defines:** N/A directly, but the app's own sanctioned duration scale (80/160/200/280/360/480/640/960ms) is the only legitimate set.
**What this app does:** `animation: ai-skeleton-shimmer 1.2s ...` — a raw, off-token duration not on the scale at all (closest token, 2xgentle, is 960ms).
**Category:** motion **Severity:** subtle-but-real

### ProgressBar

**57. Location:** ProgressBar — `.perm-progress`/`.perm-progress__bar` (styles.css:11944-11960)
**What this app does:** `grep -rn "perm-progress"` across every HTML/JS file returns zero matches outside styles.css and the atomic audit doc — fully orphaned CSS, no element in the live app ever carries this class. The existing audit's CB3 entry ("role=progressbar OK") describes ARIA wiring that can't be verified against any current markup.
**What KlearNow defines:** N/A — structural/orphan finding.
**Category:** structure **Severity:** structural-only

**58. Location:** ProgressBar (live) — dashboard health meter `.progress-bar__fill` (styles.css:4342-4347), script.js:4015-4019
**What KlearNow defines:** `ProgressBarFilled`'s fill always has `transitionProperty: 'width'` and a flat `backgroundColor` driven by the `color` prop (source: github, `ProgressBarFilled.web.tsx`).
**What this app does:** No `transition` declared — the fill snaps instantly on every health-score change; color is permanently green regardless of value — a 20% score renders identically to 95%, no value-driven color mapping.
**Category:** motion, color **Severity:** subtle-but-real

**59. Location:** ProgressBar fill color — `.perm-progress__bar` (styles.css:11952-11960)
**What KlearNow defines:** Fill is always a single flat `backgroundColor` — no gradient blending exists in the fill recipe (source: github, `ProgressBarFilled.web.tsx`).
**What this app does:** A two-stop `linear-gradient` primary→positive blend that has no equivalent in the real implementation.
**Category:** color **Severity:** subtle-but-real

### Tooltip

**60. Location:** Tooltip trigger association — `initKnTooltips()` (script.js:2603-2720)
**What KlearNow defines:** the own accessibility pattern explicitly calls out associating tooltip content with its trigger (source: kn-mcp docs, `TooltipInteractiveWrapper` example).
**What this app does:** `show()`/`hide()` never set/clear `aria-describedby` on the trigger pointing at `#kn-tooltip`'s id, despite the tooltip itself correctly carrying `role="tooltip"` — the programmatic trigger↔content association is entirely absent.
**Category:** interaction **Severity:** subtle-but-real

**61. Location:** Tooltip placement/collision — `place()` (script.js:2630-2648)
**What KlearNow defines:** `placement` accepts the full floating-ui set except `left/right-end/start` — implying real flip/collision logic on all four sides (source: kn-mcp docs).
**What this app does:** Only ever resolves `"top"`/`"bottom"`, with a single collision check against the viewport's top edge only — bottom-edge collision is never checked, and `left`/`right` placements don't exist in the implementation at all.
**Category:** interaction **Severity:** structural-only

**62. Location:** Coachmark variant — `.kn-tooltip--coachmark` (styles.css:5304-5340), `showCoachmark()` (script.js:4406-4432)
**What KlearNow defines:** the dedicated component for this is `SpotlightPopoverTour` — Popover-based, structurally distinct from `Tooltip` (source: kn-mcp docs).
**What this app does:** Implemented as a CSS modifier on `.kn-tooltip`; the DOM node never receives any ARIA `role` (unlike the plain tooltip, which gets `role="tooltip"`) despite containing an interactive dismiss button — an interactive popup styled as a Tooltip rather than built on the actual guided-tour component, with no ARIA role at all.
**Category:** structure **Severity:** structural-only

### Checkbox / Radio / Switch

**63. Location:** Radio — undefined CSS custom properties — `.kn-radio__control` (styles.css:11209-11235)
**What KlearNow defines:** Radio/RadioGroup are documented components (source: kn-mcp docs); this app's own convention (every sibling control) routes colors through defined `--kn-color-*` tokens, never raw/undefined fallbacks.
**What this app does:** Four properties referenced are **not defined anywhere** in tokens.css/styles.css — `--theme-border-width-md`, `--kn-color-bg-surface-raised`, `--kn-color-border-action-primary`, `--kn-color-bg-action-primary` — none follow the naming used by every sibling control. Same class of bug as the existing audit's M1 (23 sites fixed), but these four were missed.
**Category:** color **Severity:** subtle-but-real

**64. Location:** Radio focus-visible — styles.css:11232-11235
**What this app does:** `outline: 2px solid var(--kn-color-border-action-primary, currentColor); outline-offset: 2px` — both values are raw magic numbers referencing the same undefined token from #63, whereas Checkbox's equivalent rule (styles.css:11615-11618) tokenizes width/offset and uses a defined color.
**What KlearNow defines:** No specific pixel value confirmed, but this app's own established pattern (Checkbox) is the internal baseline being deviated from.
**Category:** spacing **Severity:** subtle-but-real

**65. Location:** Checkbox and Radio — no size variant — styles.css:11193-11235, 11582-11618
**What KlearNow defines:** Both expose `size: 'small'|'medium'|'large'`, default `medium` (source: kn-mcp docs, confirmed in both Checkbox/CheckboxGroup and Radio/RadioGroup prop blocks).
**What this app does:** Both hardcode a single 20×20px size with no `--sm`/`--lg` modifier class anywhere (grep-confirmed) — no infrastructure to render a small or large checkbox/radio.
**Category:** sizing **Severity:** structural-only

**66. Location:** Checkbox vs Radio control-to-label gap — `.kn-check` (8px) vs `.kn-radio` (12px)
**What KlearNow defines:** Not confirmed via sources 1-3 for this specific value.
**What this app does:** Two sibling controls use different gap values (8px vs 12px) for the same conceptual role in the same admin drawers — flagged as an internal inconsistency needing verification, since the exact target isn't recoverable.
**Category:** spacing **Severity:** subtle-but-real

**67. Location:** Checkbox and Radio — no disabled state — entire `.kn-check`/`.kn-radio` blocks
**What KlearNow defines:** Both document `isDisabled: boolean` (source: kn-mcp docs), implying a defined disabled treatment is part of the component contract — consistent with this app's own `.kn-field__control:disabled` (styles.css:10143-10151), which does set explicit disabled tokens.
**What this app does:** No `:disabled`/`.is-disabled` rule exists anywhere for either control (grep-confirmed) — falls back to unstyled native browser disabled rendering, unlike every other form control in the codebase.
**Category:** structure **Severity:** visually-obvious (whenever a disabled instance is actually rendered)

**68. Location:** Switch size variant — `.kn-switch` (styles.css:9013-9066)
**What KlearNow defines:** `size: 'small'|'medium'`, default `medium` (source: kn-mcp docs) — notably only two sizes, unlike Checkbox/Radio's three.
**What this app does:** A single fixed footprint hardcoded, no `--sm`/`--md` modifier class — no way to render a distinct small switch.
**Category:** sizing **Severity:** structural-only

**69. Location:** Radio control shape — styles.css:11212
**What this app does:** `border-radius: 50%` as a raw literal instead of `var(--radius-round)`, even though tokens.css:531/563 define exactly this token for this purpose — every other rounded-shape control in the file (`.kn-switch__ui`, `.kn-check__box`) routes through a token; Radio is the one outlier still using a literal.
**What KlearNow defines:** N/A — internal-consistency/token-discipline finding.
**Category:** radius **Severity:** subtle-but-real

### SelectInput / SearchInput / TextArea

**70. Location:** SelectInput multi-select chip — see finding #11 (merged; this is the same gap, cross-confirmed independently by a second research pass from the SelectInput angle).
**Category:** structure **Severity:** visually-obvious — *(listed once, at #11, to avoid duplication)*

**71. Location:** TextArea resize affordance — `.kn-detail-textarea` (styles.css:10133-10136), shipment-detail.js:1047
**What KlearNow defines:** TextArea's only documented row-sizing control is `numberOfLines: 1-5` — no `resize`/user-drag-resize behavior is documented (source: kn-mcp docs).
**What this app does:** `resize: vertical` on top of a fixed `rows="4"` — exposes the native browser resize-grip handle, a raw-`<textarea>` browser affordance with no equivalent in the `numberOfLines`-driven API.
**Category:** structure **Severity:** subtle-but-real

**72. Location:** SearchInput vs SelectInput leading-icon size — `.search-input__icon` (20px) vs `.kn-select__trigger .btn-icon-glyph` (16px)
**What KlearNow defines:** No icon-size token documented for either component (source: kn-mcp docs).
**What this app does:** Two sibling field-shell components in the same field family render their leading affordance icon at different sizes — flagged as an internal inconsistency needing a product decision, not a confirmed KlearNow deviation.
**Category:** icon **Severity:** subtle-but-real

### ChatInput (composer)

**73. Location:** Composer card radius — `.agentic-home__composer` (styles.css:1679), `--lg` variant (styles.css:1716)
**What KlearNow defines:** `chatInputBorderRadius = 'medium'` (source: github, `ChatInput/chatInputTokens.ts`) — 12px in this app's own scale.
**What this app does:** Base uses `--radius-surface-large` (16px); the `--lg` variant actually rendered by both composer instances overrides to a raw `1.25rem` (20px), with an adjoining comment admitting the figure was copied from claude.ai's own composer, not KlearNow.
**Category:** radius **Severity:** visually-obvious

**74. Location:** Send/attach icon buttons — `.agentic-home__send, .agentic-home__attach` (styles.css:1924-1929)
**What KlearNow defines:** ChatInput's submit/stop control is a `Button` icon-only at `size="small"` (source: github, `ChatInput/ChatInputActionBar.tsx`); `buttonTokens.ts` defines icon-only `small` as 32×32px, `borderRadius: "small"` (8px, rounded square — not a circle).
**What this app does:** 36×36px, fully circular.
**Category:** sizing **Severity:** subtle-but-real

**75. Location:** Attach control — index.html:2010-2012/2040-2042, agentic-broker.js:690-695
**What KlearNow defines:** `ChatInputActionBar.tsx` renders upload as a labeled `Link variant="button" icon={PlusIcon}` ("Upload file"), backed by real `fileList`/`onFileChange`/preview props (source: github + kn-mcp docs).
**What this app does:** Icon-only, no visible label; its click handler unconditionally fires a "Not available in this sample" toast — never opens a picker or accepts a file. A decorative stand-in, not a partial implementation.
**Category:** structure **Severity:** visually-obvious

**76. Location:** Ghost-suggestion badge font-weight — `.agentic-home__ghost-badge` (styles.css:1868)
**What this app does:** `font-weight: var(--theme-font-weight-medium, 500)` — `--theme-font-weight-medium` is never defined anywhere (grep-confirmed); the real token is `--theme-typography-fonts-weight-medium`/`--kn-weight-medium`. AB7 (already logged) fixed this rule's height/padding/gap but left this line untouched, silently riding the hardcoded `500` fallback.
**What KlearNow defines:** N/A — internal token-discipline bug.
**Category:** typography **Severity:** subtle-but-real

### ChatMessage

Canonical live reference is `docs/components.md` ## ChatMessage (`.kn-chat-msg` / `KNChatMessage.hydrate`). Items 77–85 below were pre-canonical findings (asymmetric padding, missing border/shadow, speech-bubble radius, gray rolling text, no word-break, footer nested in the body). They are resolved in the primitive + product overlay. Remaining FLAGs are listed in that doc (shadow 0.5px/4px/6%, 88% max-width, agentic rolling CSS 1500ms vs sidebar rolling JS 1600ms as separate widgets, purple self overlay, no 600ms auto-collapse, unwired `is-error`).

**77–85.** **Resolved** — see `docs/components.md` ## ChatMessage and `docs/internal/klearnow-token-system.md` ### ChatMessage. Do not treat this dated audit block as the token source.

### Cross-cutting: motion tokens

**86. Location:** `--agentic-ease` custom curve — styles.css:1523, used in ~12 transitions (e.g. 1254, 1337, 1370, 1436, 1465, 1682, 1789, 1939, 1974)
**What KlearNow defines:** 7 named easing tokens cover all motion — `linear`, `entrance`, `exit`, `standard`, `emphasized`, `overshoot`, `shake` (source: github, `motion.ts` — confirmed byte-identical to this app's own `--kn-motion-easing-*` definitions).
**What this app does:** `cubic-bezier(0.16, 1, 0.3, 1)` — a curve matching none of the 7 KlearNow tokens — used across the entire composer/pill/chip interaction set instead of `--kn-motion-easing-*`.
**Category:** motion **Severity:** subtle-but-real

**87. Location:** `--agentic-ease` fallback inconsistency — styles.css:1254 vs 1337 vs 13188/13249 vs 13293
**What this app does:** Four different fallback behaviors for the same custom property: `ease` keyword, no fallback at all, `--kn-motion-easing-standard`, `--kn-motion-easing-emphasized` — four different answers to "what if this breaks."
**What KlearNow defines:** N/A — internal-consistency finding.
**Category:** motion **Severity:** structural-only

**88. Location:** `agentic-home-enter`/`ai-related-chip-enter` duration fallback — styles.css:1558, 3213
**What KlearNow defines:** `--kn-motion-duration-moderate` = 280ms (source: github `motion.ts`, confirmed identical to tokens.css).
**What this app does:** Both hardcode a fallback of `0.32s` (320ms) — the wrong number for that token. The correct fallback (`0.28s`) is used for the *same token* at styles.css:2964 (`ai-msg-enter`), proving this is a copy/paste literal-value bug.
**Category:** motion **Severity:** subtle-but-real

**89. Location:** `agentic-home-enter` easing fallback — styles.css:1558
**What KlearNow defines:** `--kn-motion-easing-entrance` = `cubic-bezier(0, 0, 0.2, 1)` (source: github `motion.ts`).
**What this app does:** Fallback is the raw keyword `ease-out` (browser default ≈ `cubic-bezier(0, 0, 0.58, 1)`) — a visibly different, slower-tailed curve.
**Category:** motion **Severity:** subtle-but-real

**90. Location:** Transitions bypassing the token scale entirely — styles.css:1745, 1827, 8373, 11329, 11468, 11972, 13692
**What KlearNow defines:** Discrete duration tokens exist at exactly these magnitudes (quick=200ms, xquick=160ms, moderate=280ms) and are used correctly for equivalent-purpose transitions elsewhere in the same file (source: github `motion.ts`).
**What this app does:** Seven sites use raw seconds/ms with the raw CSS `ease` keyword, none referencing any `--kn-motion-*` token (composer validation-banner collapse, ghost-suggestion crossfade, and five others).
**Category:** motion **Severity:** subtle-but-real

**91. Location:** Non-KlearNow bezier — `.some-hover-scale` transform transition, styles.css:11372
**What KlearNow defines:** None of the 7 KlearNow easing tokens is `cubic-bezier(0.4, 0, 0.2, 1)` (source: github `motion.ts`) — that curve is Material Design's standard easing.
**What this app does:** Uses this Material-Design curve directly, an ad-hoc import distinct from both the raw-`ease` sites and the token-based sites.
**Category:** motion **Severity:** subtle-but-real

**92. Location:** `--kn-motion-easing-linear` defined but unused, and infinite loops using wrong-purpose easings — tokens.css:632/656 (definition); styles.css:3273 (`.kn-spinner`), 2574/12059/12612/13910 (`.ai-suggest-mark-rotate`), 2757 (`.ai-mark-twinkle`), 3670 (`.ai-sparkle-pulse`), 5455 (`.ais-live-pulse`), 282 (`.ai-assistant-badge-pulse`), 3491 (`.kn-leading-rotate`)
**What KlearNow defines:** Real `motion.ts` (source: github) documents `linear` specifically "for marquees and progress bars" (continuous/looping motion), while `standard`/`emphasized`/`overshoot` are documented for one-shot morphing/hover/toast motion.
**What this app does:** `grep` for `kn-motion-easing-linear` returns zero hits outside its own definition. Every infinite/looping animation in the app instead uses a discrete-purpose easing (`overshoot` on the spinner, `standard` on 6 pulse/rotate loops, `emphasized` on one rotate loop) — these curves decelerate into a fixed endpoint each cycle, so looping them infinitely produces a visible per-cycle hitch/snap rather than smooth continuous motion, exactly the artifact `linear` exists to avoid.
**Category:** motion **Severity:** visually-obvious

**93. Location:** Map-refresh spin easing — `.vis-map-refresh.is-spinning svg` (styles.css:8137)
**What KlearNow defines:** Same linear-for-continuous-motion convention as #92 (source: github `motion.ts`).
**What this app does:** Uses `--kn-motion-easing-standard` (ease-in-out-shaped) for a 0→360° refresh spin — slow-fast-slow rotation instead of the constant-speed spin a loading icon should have.
**Category:** motion **Severity:** subtle-but-real

**94. Location:** Loading-indicator motion strategies unified inconsistently — `.ai-thinking-bounce`/`.ai-dot-bounce`/`.ai-rolling-loading-cycle` (styles.css:2194, 12033, 2245)
**What this app does:** Three "AI is working" indicators in the same conversational surface use three different, un-unified motion approaches — two use raw CSS keywords with no token reference at all, while sibling "thinking" indicators elsewhere (`.ais-live-pulse`, `.ai-sparkle-pulse`) do reference `--kn-motion-easing-standard`. No stated rationale distinguishes tokenized vs non-tokenized loading affordances.
**What KlearNow defines:** N/A for the exact curve (not confirmed via available sources) — flagged as internal inconsistency only.
**Category:** motion **Severity:** structural-only

### Cross-cutting: elevation tokens

**95. Location:** Elevation scale definition — tokens.css:599-608 (`--theme-elevation-lowRaised/midRaised/highRaised`)
**What KlearNow defines:** Real light-mode `elevation.web.ts` (source: github): `lowRaised: 0px 2px 4px 0px hsla(200,10%,18%,0.06)`; `midRaised: 0px 16px 12px 0px hsla(200,10%,18%,0.06)`; `highRaised: 0px 8px 24px -4px hsla(200,10%,18%,0.06)` — opacity (6%) held **constant** across all three; only offset/blur escalate.
**What this app does:** `lowRaised` blur is 16px vs the 4px (4× larger). `midRaised` offset-y is 8px vs the 16px (half), blur 24px vs the 12px (2×). `highRaised` offset-y 16px vs the 8px (2×), blur 48px vs the 24px (2×). Opacity also **escalates per level** (9%→12%→18%) where real KlearNow keeps it flat at 6% — every one of the app's three shadow tokens is both differently proportioned and 1.5–3× more opaque than the real KlearNow equivalent.
**Category:** elevation **Severity:** visually-obvious

**96. Location:** Hand-rolled shadows bypassing the elevation scale — `.agentic-home__composer` rest/hover/focus (styles.css:1681, 1686, 1696), `.agentic-home-pill` (1626), `.kn-chat-input__card` (3358)
**What KlearNow defines:** The 3-level elevation scale is the sole sanctioned shadow vocabulary — used correctly at 50+ other call sites in the same file.
**What this app does:** These sites hand-roll raw `box-shadow` values instead (the composer's own comment admits it deliberately copies claude.ai's inspected shadow rather than the scale) — where visually-equivalent card surfaces elsewhere (`.panel.card`, `.vis-card`) do use `--kn-elevation-lowRaised`.
**Category:** elevation **Severity:** subtle-but-real

**97. Location:** AI assistant panel shadow — `.app-shell.ai-assistant-open .ai-assistant-panel` (styles.css:2382-2385)
**What this app does:** Reuses only the elevation *color* primitive but hand-derives new geometry from spacing tokens for a directional left-edge shadow — a third, distinct pattern (token color + hand geometry) alongside "full token" and "fully hand-authored" elsewhere in the file.
**What KlearNow defines:** Elevation tokens are meant to be applied as a single composite value, not decomposed and partially reused (source: github `elevation.web.ts` structure).
**Category:** elevation **Severity:** structural-only

**98. Location:** Sticky "raised over content" surfaces applying elevation inconsistently — `.vis-table thead th` (8240), `.role-form-footer` (11570), Klearhub sticky columns (10477-10511)
**What this app does:** The table header (sticky) and the sticky bottom form footer both have zero box-shadow — only a border. Meanwhile the Klearhub sticky-column table carries a full directional shadow for the identical "stuck over scroll" affordance — but its own neighboring `:first-child` sticky column in the same group explicitly sets `box-shadow: none`. One sticky column has elevation, the very next one in the same table deliberately doesn't.
**What KlearNow defines:** N/A for a specific rule — internal-consistency finding, checkable against the app's own working pattern.
**Category:** elevation **Severity:** subtle-but-real

**99. Location:** `--kn-elevation-*` vs `--theme-elevation-*` naming split — e.g. styles.css:516 vs 801; the entire map-pill family (6450-6837, all `--theme-elevation-*`) vs cards/drawers (5144, 7124, 7339, 7730, all `--kn-elevation-*`)
**What this app does:** Both aliases (defined as pure equivalents in tokens.css:606-608) are used interchangeably across 30+ call sites with no discernible rule — not a value bug, purely a token-naming discipline gap.
**What KlearNow defines:** N/A — internal-consistency finding.
**Category:** elevation **Severity:** structural-only

### Cross-cutting: typography scale

**100. Location:** `--kn-type-heading-h3-size`/`-line` — tokens.css:380-381
**What KlearNow defines:** Heading `size="small"` pairs `fontSize:300` (18px) with `lineHeight:300` (24px) — same-index pairing (source: github, `Heading.tsx` `getHeadingProps`).
**What this app does:** Pairs `fonts-size-300` (18px) with `line-heights-400` (26px) — a cross-step mismatch not present anywhere in the real scale.
**Category:** typography **Severity:** subtle-but-real

**101. Location:** `--kn-type-heading-h4/-h5/-h6-size/-line` — tokens.css:382-387
**What KlearNow defines:** the Heading component only defines 5 sizes, small (18px) through 2xlarge (40px) (source: github) — no KlearNow heading size exists at 16px or 14px.
**What this app does:** h4 uses 16px/24px, h5/h6 both use 14px/20px — sizes below the Heading floor, repurposing the Text/body-size steps as heading sizes.
**Category:** typography **Severity:** structural-only

**102. Location:** `--kn-type-ui-lg-size`/`-line` — tokens.css:407-408
**What KlearNow defines:** Step 200 (16px) always pairs with line-height step 200 (24px) (source: github, confirmed in both `typography.ts` and `Text.tsx`'s body/large mapping).
**What this app does:** Pairs `fonts-size-200` (16px) with `line-heights-100` (20px) — a step-mismatched pairing not found anywhere in the actual scale.
**Category:** typography **Severity:** subtle-but-real

**103. Location:** `--kn-type-ui-label-size`/`-line` — tokens.css:405-406
**What KlearNow defines:** Step 75 (12px) pairs with line-height step 75 (17px) — Text's `body/small` mapping (source: github `Text.tsx`).
**What this app does:** Pairs `fonts-size-75` (12px) with `line-heights-50` (16px, the pairing KlearNow uses for `caption/small`, not a 12px size).
**Category:** typography **Severity:** subtle-but-real

**104. Location:** `--kn-type-caption-md-size` — tokens.css:398
**What KlearNow defines:** `Text variant="caption" size="medium"` sets `fontSize:100` (14px) with `lineHeight:50` (16px) (source: github `getTextProps`).
**What this app does:** Uses `fonts-size-75` = 12px, one step short of the real caption-medium value (the line-height does correctly match). Distinct from the existing audit's Ad-hoc note, which never checked caption-md against the real Text component source.
**Category:** typography **Severity:** subtle-but-real

**105. Location:** Body/caption utility classes missing letter-spacing — `.type-body-lg/-md/-sm/-xs`, `.type-caption-md/-sm` (tokens.css:784-793, 815-823)
**What KlearNow defines:** `Text` always sets an explicit non-zero `letterSpacing` per size — body xsmall/small/medium and caption small/medium use step 50 (-1.3%), body large uses step 25 (-3.3%) (source: github `getTextProps`). (Headings correctly default to 0 — no gap there.)
**What this app does:** All six utility classes flatly apply `--kn-letter-spacing-normal` (0) — the existing `--kn-letter-spacing-tight` token is only used ad hoc at 5 unrelated sites, never on body/caption text.
**Category:** typography **Severity:** subtle-but-real

**106. Location:** `.agentic-home__greeting` — styles.css:1590-1593
**What KlearNow defines:** The font-size scale jumps directly from step 700 (40px) to step 800 (48px), no 44px step; letter-spacing is limited to -3.3%/-1.3%/0% (source: github `typography.ts`).
**What this app does:** `font-size: 2.75rem` (44px, off-scale), `font-weight: 500` (raw literal, not a token), `letter-spacing: -0.02em` (not one of the three values), `line-height: 1.15` (unitless, not tied to any line-height token).
**Category:** typography **Severity:** visually-obvious

**107. Location:** `.agentic-thread__title` — styles.css:2056-2058
**What KlearNow defines:** 18px is a real step; letter-spacing set is -3.3%/-1.3%/0% only (source: github).
**What this app does:** `font-size: 1.125rem` hardcoded rather than the token; `font-weight: 500` raw; `letter-spacing: -0.01em` — close to but not equal to the -1.3% step, an invented intermediate value.
**Category:** typography **Severity:** subtle-but-real

**108. Location:** ChatMessage typography — `.ai-msg__body` (2995-2998), `.ai-msg__heading` (3017), `.ai-msg--user .ai-msg__body` (3067-3075), `.ai-msg--assistant .ai-msg__body` (3093-3095), `.ai-msg__response-title` (3161-3164), `.ai-msg__trace-label` (3629-3632)
**What KlearNow defines:** Line-heights are always fixed rem-based scale steps, never unitless multipliers; letter-spacing is restricted to -3.3%/-1.3%/0% (source: github `typography.ts`).
**What this app does:** Unitless line-heights throughout (1.55, 1.45, 1.35, 1.4 — none traceable to a line-height step), plus three off-scale letter-spacing values (-0.005em, -0.015em, -0.02em). The user-bubble and assistant-bubble variants also duplicate the same 15px size inconsistently as `0.9375em` vs `0.9375rem`.
**Category:** typography **Severity:** subtle-but-real

**109. Location:** Overline/uppercase tracking — `.isf-parties__group-label` (styles.css:14075-14078), `.ai-draft-card__label` (styles.css:13109-13115)
**What KlearNow defines:** No KlearNow letter-spacing token supports overline/uppercase tracking (source: github `typography.ts`) — same known gap as the existing audit's T3/"KlearNow has no clear answer" item 7.
**What this app does:** Two previously-uncited call sites with their own arbitrary tracking values (0.06em and 0.02em respectively) — a third and fourth distinct invented value alongside the already-logged 0.06em (T3) and 0.04em (T6).
**Category:** typography **Severity:** subtle-but-real

### Cross-cutting: spacing scale

**110. Location:** SideNav chat-list spacing (untokenized/off-scale) — `.side-nav-chat-item` padding (styles.css:1454-1457, 10px 8px) and siblings `.side-nav-chat-new`/`-search`/`-scroll`/`-group__label`/`-group` (1235, 1300, 1402, 1413-1415)
**What KlearNow defines:** Spacing scale is 0,2,4,8,12,16,20,24,32,40,48,56px (source: github `spacing.ts`, confirmed identical to this app's own `--theme-spacing-*` primitives).
**What this app does:** `.side-nav-chat-item` padding is 10px — falls in the gap between spacing-3 (8px) and spacing-4 (12px), off the scale entirely. Sibling rules in the same untokenized SideNav-chat block are on-scale values but still hardcoded as raw rem instead of `--theme-spacing-*` vars.
**Category:** spacing **Severity:** subtle-but-real

**111. Location:** `.ai-thinking-dots` gap — styles.css:2183-2186
**What KlearNow defines:** the spacing scale is fixed-px/rem, not em-relative (source: github `spacing.ts`).
**What this app does:** `gap: 0.3em` — a relative unit that compounds with font-size rather than any spacing-scale step, untraceable to the scale and will drift if font-size changes.
**Category:** spacing **Severity:** subtle-but-real

---

## Grouped by component (index)

- **Button:** 1, 2, 3, 4, 5
- **IconButton:** 6, 7
- **Badge / Counter / Indicator / Chip / Tag:** 8, 9, 10, 11, 12
- **SideNav:** 13, 14, 15, 16, 17, 18
- **TopNav / Avatar / Breadcrumb:** 19, 20, 21, 22
- **Card:** 23, 24
- **Tabs:** 25, 26, 27
- **Pagination:** 28
- **Divider:** 29
- **Menu / Dropdown:** 30, 31, 32
- **Popover:** 33, 34
- **Table:** 35, 36, 37
- **Modal:** 38, 39, 40
- **Drawer:** 41
- **EmptyState:** 42, 43, 44
- **Landing / page-level layout:** 45
- **Alert:** 46, 47
- **Toast:** 48, 49, 50, 51, 52
- **Spinner:** 53, 54
- **Skeleton:** 55, 56
- **ProgressBar:** 57, 58, 59
- **Tooltip:** 60, 61, 62
- **Checkbox / Radio / Switch:** 63, 64, 65, 66, 67, 68, 69
- **SelectInput / SearchInput / TextArea:** 11 (shared with Badge/Chip group above), 71, 72
- **ChatInput (composer):** 73, 74, 75, 76
- **ChatMessage:** 77, 78, 79, 80, 81, 82, 83, 84, 85
- **Cross-cutting — Motion tokens:** 4, 15, 16, 32, 38, 50, 51, 55, 56, 86, 87, 88, 89, 90, 91, 92, 93, 94
- **Cross-cutting — Elevation tokens:** 33, 38, 52, 78, 95, 96, 97, 98, 99
- **Cross-cutting — Typography scale:** 14, 22, 82, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109
- **Cross-cutting — Spacing scale:** 1, 2, 23, 39, 45, 64, 66, 77, 110, 111

## Severity summary

- **Visually-obvious:** 11, 16, 19, 25, 38, 48, 67, 73, 75, 79, 81, 84, 92, 95, 106 (15)
- **Subtle-but-real:** the majority — 74 findings
- **Structural-only (no visible diff today):** 3, 15, 17, 18, 29, 31, 36, 37, 41, 43, 44, 49, 54, 57, 61, 62, 65, 68, 87, 94, 97, 99, 101 (22)

## Two duplicates found and merged during synthesis

1. **Modal missing entrance/exit motion** — reported independently by the "Overlays & page-level states" pass and the "Motion & elevation cross-cutting" pass. Merged into finding #38, which also folds in the cross-cutting pass's additional observation that the shared dropdown/kebab menu (`.vis-menu__list`) has the identical gap.
2. **Multi-select chip reusing Badge instead of a real Tag** — reported independently by the "Button family" pass (framed as Chip/Tag/Badge taxonomy confusion) and the "Form inputs" pass (framed as a SelectInput-specific gap). Merged into finding #11, keeping the more complete version (which also covers the dismiss-button glyph issue) and cross-referenced at #70.
