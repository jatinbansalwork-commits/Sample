# KlearNow component primitives

Canonical CSS lives in `components.css`. Use these `.kn-*` structures whenever you add UI that matches them. Tokens only — no raw px.

Product chrome (`.top-nav`, `.side-nav`) is not AppBar. AppBar is a page-level 64px header.

## Accordion

```
.kn-accordion.kn-accordion--{filled|transparent}.kn-accordion--{large|medium}[.kn-accordion--contained]
  .kn-accordion__item[open]
    .kn-accordion__header
      .kn-accordion__lead
        .kn-accordion__leading | .kn-accordion__index
        .kn-accordion__copy
          .kn-accordion__title-row
            .kn-accordion__title
            .kn-accordion__title-suffix
          .kn-accordion__subtitle
          .kn-accordion__description
      .kn-accordion__trailing
      .kn-accordion__chevron
    .kn-accordion__body
```

Canonical behavior:

- One expanded item at a time inside a grouped `.kn-accordion` (native `<details>` siblings). A single-item instance (the same node is both `.kn-accordion` and `.kn-accordion__item`) stays independently open — KlearHub mode cards use that.
- Permission / party rows (`KNAdminUX.accordionItem`) stay **multi-open**. Toggle writes a persisted `openGroups` Set (`handleAccordionClick` add/remove; search and AI suggest add hits; used groups restore on drawer reset). Exclusive single-open would close siblings before `readForm` persist and drop hidden permission inputs. Intentional — resolved, not an open FLAG. Do not wrap those rows in a grouped exclusive root.
- `filled` = `surface.background.gray.intense` (white on light) + radius medium. `transparent` = no fill; every item has a `border.thin` + `surface.border.gray.muted` divider (including the last). Filled groups divide items except the last.
- Header padding is always `spacing.5`. Size only changes type: large title = heading-h5, medium = ui-md; body large = body-md, medium = body-sm, color `surface.text.gray.subtle`.
- Idle header is transparent. Hover / focus-visible uses `interactive.background.gray.faded`. Open does not keep the hover fill.
- Open header shows a `border.thinner` divider; hover/focus hides it.
- Chevron: size 20, collapsed `0deg`, expanded `-180deg`, duration **moderate** / easing **standard**. Header color/background uses **2xquick** / **standard**. Idle chevron uses `interactive.icon.gray.muted`; hover/open uses `.subtle`; disabled uses `.disabled`. Reduced motion: header and chevron transitions none. ChatMessage traces compose Collapsible (size **12**, same rotate curve) — do not keep a second traces curve.
- Focus-visible: `--kn-focus-ring` + radius small.
- Disabled: `aria-disabled` / `[disabled]`, `not-allowed`, disabled text color. Trailing links/buttons inside the header do not toggle the item.
- `.kn-accordion--contained`: max-width `100vw − size.40` / size 640 (`m`) / size 1136 (`l`). Min-width size 200 / 360 from `m`.
- Number prefix: `.kn-accordion__index` (1-based, semibold). Do not combine with a leading icon. Title suffix may compose Counter (small).

Existing: `.kh-accordion` is a filled large single-item card (mode icon plate is product-only). Role permission groups and ISF party rows reuse the same item/chevron/body slots.

## ActionList

```
.kn-action-list[.kn-action-list--flush]
  .kn-action-list__section
    .kn-action-list__section-title
    .kn-action-list__item[.is-negative][.is-active][aria-selected][aria-disabled]
      .kn-action-list__leading
      .kn-action-list__copy
        .kn-action-list__title-row
          .kn-action-list__title
          .kn-action-list__title-suffix
        .kn-action-list__description
      .kn-action-list__trailing
  .kn-action-list__empty
    .kn-action-list__empty-icon
    .kn-action-list__empty-title
    .kn-action-list__empty-desc
```

Canonical overlay (not flush): `surface.background.gray.intense` (white on light), `border.thin` + `surface.border.gray.normal`, radius **medium**, elevation **midRaised**, padding **spacing.3**, max-height **size 300**. Same overlay chrome as Menu / Dropdown.

Items share the Menu item recipe:
- Padding **spacing.2** below `m`, **spacing.3** from `m`. Min-height 28 / 36. Radius **small**. Margin-block **spacing.1**. First-row slot **size 20**.
- Hover / `[aria-expanded="true"]` (not selected): `interactive.background.gray.default`. Motion **2xquick** / **standard**. (`gray.default` and `gray.faded` are the same paint on light — `surface-100`.)
- Selected `[aria-selected="true"]` / `.is-selected`: `interactive.background.gray.fadedHighlighted`.
- Focus-visible and `.is-active`: `--kn-focus-ring` only. `.is-active` is keyboard highlight, **not** a hover fill and **not** selected.
- `.is-negative` hover: `interactive.background.negative.faded`. Do not use negative items in a SelectInput / filter listbox.
- Disabled: `interactive.text.gray.disabled`, no pointer-events lock (tooltips still work). Clicks are ignored.
- Leading slot is size **20**. Description: `interactive.text.gray.muted` (same hex as `surface.text.gray.muted`). Alias: `.action-list-item__why`.
- Title color stays `surface.text.gray.normal` on the light overlay.

`.kn-action-list--flush` drops overlay chrome when the parent (Dropdown overlay, Menu, BottomSheet) already has it. Do not put `--flush` on `.action-list` by default.

Overlay empty (`.kn-action-list__empty`) is compact list copy — **not** EmptyState. Title `surface.text.gray.normal`; description `surface.text.gray.muted`. Do not replace it with `.kn-empty`.

Existing: `.action-list` / `.action-list-item` / `.action-list-section`. Quick actions (filtered by AutoComplete), Visibility filters, admin selects, date presets.

## Alert

```
.kn-alert.kn-alert--{color}.kn-alert--{subtle|intense}[.kn-alert--full]
  .kn-alert__icon
  .kn-alert__content
    .kn-alert__title
    .kn-alert__desc
    .kn-alert__actions   (primary .btn--secondary.btn--sm + optional .kn-link)
  .kn-alert__dismiss.icon-btn   (aria-label="Dismiss alert")
```

- Colors: `information` | `negative` | `notice` | `positive` | `neutral` (default) | `primary`.
- Emphasis: `subtle` (default, faded fill) | `intense` (solid fill + static-white title/desc/icon).
- Default max-width 584 (`--kn-layout-alert-max-width`). `--full` fills the container (no extra border). From 768px, `--full` centers the row and places actions beside copy. CreationView form-level success/fail uses `--full`.
- Padding **spacing.4**, radius **medium**, no extra border. Leading icon **size 16**. Title: size **100** / semibold / `surface.text.gray.normal`. Description: size **75** / `surface.text.gray.subtle`.
- Subtle icon: `feedback.icon.{color}.intense`. Neutral uses `feedback.icon.neutral.intense`. Primary uses `surface.icon.primary.normal`. Primary subtle fill is `surface.background.primary.subtle` (`indigo-100`, wash of brand `#003f5b`).
- Intense primary fill: `surface.background.primary.intense`. Intense close control: `.icon-btn.icon-btn--on-dark`.
- Primary action: small secondary button (primary color). Intense: `.kn-btn--primary.kn-btn--white`. Secondary action: `.kn-link` (neutral when a primary button is also present; white on intense).
- Dismissible by default on **new banner instances**. Click `.kn-alert__dismiss` fades opacity with **2xquick** / **standard**, then hides. That is Alert’s own dismiss tween — not Fade (**xquick** / **entrance|exit**). Dismiss is `.icon-btn` (see IconButton dismiss hit target). Dashboard `.alert-card` widgets, admin insights, and review-drawer copy are persistent — do not add dismiss there.
- a11y: `role="alert"` for negative/notice (notice also `aria-live="polite"`); `role="status"` otherwise. Dashboard cards stay `<article>`.
- Description-only (no title, no actions): vertically center the icon.
- Do not use Alert for a system-wide single-line promo/info strip — that is `.kn-announcement` (no title, actions, or dismiss). Do not use Alert for a missing-content placeholder — that is EmptyState.

Existing: dashboard `.alert-card`, `.admin-insight`, review drawer, Schema UI `ALERT`, `.kh-alert-stack`.

## Amount

```
.kn-amount.kn-amount--{body|heading|display}.kn-amount--{size}[.kn-amount--subtle-affix|.kn-amount--solid-affix][.kn-amount--weight-{regular|medium|semibold}][.kn-amount--{negative|positive|notice|information}][.kn-amount--strikethrough][.kn-amount--currency-end]
  .kn-amount__sign
  .kn-amount__currency
  .kn-amount__integer
  .kn-amount__decimal
  .kn-amount__compact
```

- Default: **body** / **medium** / **regular** / `surface.text.gray.normal`. Heading/display use `--kn-font-family-heading` (not display).
- Sizes: body `xsmall|small|medium|large` (25/75/100/200); heading `small|medium|large|xlarge|2xlarge` (300–700); display `small|medium|large|xlarge` (800–1100). Heading has no `weight-medium`.
- Suffix is **data**: `decimals` (default, 2 places), `none` (floor, no fraction), `humanize` (compact). CSS only styles slots. Product USD estimates use `none`.
- `currencyIndicator`: symbol (default) vs code in `__currency`. Prefix is default; `--currency-end` when the locale puts the code after the number.
- Subtle affix is the **default** (opacity-800 + one type step down). `--solid-affix` keeps currency/decimals at the integer size. `--subtle-affix` is explicit and equivalent to the default.
- Strikethrough is a `currentColor` rule at 50% (`thin` on body, `thicker` on heading/display).
- Color: optional `--negative|positive|notice|information` (`feedback.text.*.intense`). Do not use a `neutral` color class.
- Format via `formatKnAmountParts` / `knAmountHtml` (`shipments-data.js`). `aria-label` is `Total value in {code}: {label}`.
- No hover/focus motion — Amount is display-only.

Existing: dashboard KPI figures, recent-shipment/invoice amounts, Schema UI `AMOUNT`. Alias `.amount` / `.amount--negative` remains for leftover plain markup.

## AnimateInteractions

```
.kn-animate-interactions[data-motion-trigger="hover|focus|both|tap"][.is-interacting]
  …trigger surface…
  .kn-move
```

- Wrapper has no fill of its own. Default trigger is **hover** (omit the attribute or set `hover`) — hover only, not keyboard. Keyboard uses `:focus-visible` / `:has(:focus-visible)` with `--kn-focus-ring`; it does **not** inherit the hover reveal. `focus` reveals `.kn-move` on focus-visible only. `both` is hover + focus-visible. `tap` is `:active`. `.is-interacting` forces the in-state from JS.
- Child `.kn-move`: idle opacity **0** + `translateY(spacing.5)`; in-state opacity **1300** (1) + `translateY(0)`. Enter **xmoderate** / **entrance**; exit **quick** / **exit**. Hidden children are `pointer-events: none`.
- Dashboard `.kpi-stat` chevron is **size-12**. Move-token `spacing.5` (16px) is a 4× jump from the original 4px travel and longer than the glyph, so the live strip uses **`spacing.2` (4px)** — resolved, not an open FLAG. Do not restyle `.kpi-stat .nav-chevron` opacity; the primitive still owns hide/show.
- `prefers-reduced-motion`: no transition; `.kn-move` stays visible (do not hide-until-hover).
- Pair with `.kn-motion--*` only for other presets. Move’s exit is **quick**, not `.kn-motion--exit` (moderate). Standalone mount Move is `.kn-move[data-motion-trigger="mount"]` (same offset and durations).

Existing: dashboard `.kpi-stat` (chevron). Side-nav chevrons are product chrome, not `.kn-move`.

## AnnouncementBanner

```
.kn-announcement.kn-announcement--{center|left}[.kn-announcement--on-dark]
  .kn-announcement__icon          (optional, aria-hidden)
  .kn-announcement__message       (single line; inline .kn-link allowed)
```

Canonical behavior:

- Slim full-bleed region for a short system-wide promo or info line. **Not Alert:** no title/description hierarchy, no actions, no dismiss, no feedback color, no emphasis.
- Alignment default is **center** (also `--center`). `--left` is start-aligned. Width is always `100%`.
- Padding **spacing.3** / **spacing.5**, gap **spacing.2**. No radius, no border, no elevation.
- Light (the app scheme): fill `surface.background.gray.subtle`, text `surface.text.gray.subtle`. Icon uses `surface.icon.gray.subtle`.
- Message: size **75** (12px), weight **medium**, line-height **body-sm** (17px / `line-heights-75`). FLAG: spec line is 18px; we have no 18px line token — do not invent one. Truncates to one line (ellipsis).
- Optional leading icon is **size 12**. Omit the slot when there is no icon (`:empty` hides it). Icon is decorative (`aria-hidden`).
- a11y: `role="region"` with `aria-label` (default **"Announcement"**). Message text carries meaning.
- Motion: **none** on the region (no hover, focus, open/close, or loading). Inline `.kn-link` keeps Link hover/underline. Do not add enter/exit fades.
- `--on-dark` is **TopNav-like chrome only**, not a second theme and not for light pages. Fill `interactive.background.staticWhite.fadedHighlighted`; text `staticWhite.subtle`; icon `icon.staticWhite.subtle`; links `staticWhite.normal`. FLAG: no `interactive.background.staticBlack.fadedHighlighted` token (that would be a dark *scheme* fill, which this light app does not have).
- `[hidden]` forces `display: none` so the flex display cannot leak a hidden banner.

Existing: `#dash-welcome` (`--left`, no icon). Product first-visit hide via `localStorage kn-welcome-seen` is **not** a dismiss control — do not add a close button. `.hero-copy p` muted color must not override `__message` (message inherits the region color).

## AppBar

```
header.kn-appbar[.kn-appbar--neutral|.kn-appbar--subtle][.kn-appbar--sticky|.kn-appbar--static]
  .kn-appbar__back          (optional .icon-btn, aria-label required)
  .kn-appbar__leading
    .kn-appbar__logo        (optional)
    .kn-appbar__title
    .kn-appbar__trust       (optional; omit — no product trust mark yet)
  .kn-appbar__actions       (optional .icon-btn group)
```

Canonical behavior:

- Page-level **64** bar (`--kn-layout-appbar-height`) for compact or embedded screens. **Not** `.top-nav` (56, dark product chrome). **Not** overlay `.kn-header` (drawer/sheet).
- Default variant **neutral**: transparent fill. **subtle**: `surface.background.gray.intense` (white on this light canvas). Both use `surface.text.gray.normal` — do **not** use staticWhite; that is TopNav-on-dark, not a light page header.
- Sticky is the **default** (`z-index` sticky **100**). `--sticky` is an alias. `--static` is `position: relative` and skips scroll treatment. Product TopNav stays overlay **1000** — do not raise AppBar to that.
- Scrolled (`is-scrolled`, set by `hydrateKnAppBars`): bottom `border.thinner` + `surface.border.gray.subtle`, elevation **lowRaised**. Motion **quick** / **standard** (not Elevate **moderate**). FLAG: spec did not lock scrolled treatment; this is the light-theme reading (hairline + low raise, no dark fill). `--static` never shows it.
- Back sits at the start with **spacing.4** to leading. Omit the slot when there is no back control. Back is `.icon-btn` (32, default light — not `--on-dark`) with a required `aria-label` (e.g. "Go back").
- Leading gap **spacing.3**. Title: size **200** (body-lg), **semibold**, one-line ellipsis. Logo max-height **size 32** (FLAG: spec has no logo size).
- Actions gap **spacing.3**, trailing. Idle/hover/focus come from `.icon-btn` (**xquick** / **standard**). AppBar-scoped `:focus-visible` uses `--kn-focus-ring`.
- Padding **spacing.3** / **spacing.5**, **spacing.6** from 768px. a11y: `<header>` or `role="banner"`. Optional `aria-label` on the landmark.
- No trust badge in this system (FLAG). Empty `__trust` / `__logo` / `__back` / `__actions` hide.

No live product instance — dashboard chrome is `.top-nav`. Use this primitive for future compact page headers.

## AutoComplete

```
.kn-autocomplete[.is-invalid][.is-disabled][.is-loading][.kn-autocomplete--large|--left|--inside|--inside-input|--no-icon]
  .kn-autocomplete__label
    .kn-form-label__suffix
    .kn-form-label__trailing
  .kn-autocomplete__field          (alias .search-input)
    .kn-autocomplete__prefix       (alias .search-input__icon)
    .kn-autocomplete__label-prefix (inside-input only)
    input.kn-autocomplete__input   (alias .search-input__field)
    .kn-autocomplete__suffix
    .kn-autocomplete__spinner      (alias .search-input__spinner)
    .kn-autocomplete__clear        (alias .search-input__clear)
    .kn-autocomplete__trailing     (alias .search-input__trailing)
  .kn-autocomplete__help | .kn-autocomplete__error | .kn-autocomplete__success
  .kn-autocomplete__overlay
    .kn-action-list
      .kn-action-list__empty
```

Canonical behavior:

- Type-to-filter trigger. **inputValue** (typed string) is not the selected **value**. Default product filter is **includes** (case-insensitive) on item label — FLAG: spec default is startsWith; KN lists are phrases ("View Holds") so includes is the live rule. Do not switch quick actions to startsWith.
- Two compositions: (1) standalone `__overlay` + ActionList under the field; (2) field inside a Dropdown header that filters a flush ActionList in the same overlay (quick actions). Do not wrap that list in a second `__overlay`. Dropdown is the wrapper; AutoComplete is the field.
- `role="combobox"` + `aria-autocomplete="list"` + `aria-controls` + `aria-expanded` + `aria-activedescendant` only when a listbox exists. Filter-only fields (Visibility, admin, shipment docs/refs) are `type="search"` with `aria-label` — not comboboxes.
- Field is Input-family on the **light** canvas: fill `surface.background.gray.intense` (not staticWhite), border `interactive.gray.default`, hover `highlighted`, focus `primary.default` + `border.thin` primary ring. Motion **xquick** / **standard**. Do not use `--kn-focus-ring` (information) on this control.
- Disabled: fill `surface.background.gray.moderate`, border `interactive.gray.disabled`. Invalid: `feedback.border.negative.intense` (FLAG: no `interactive.border.negative.default`). Success only colors `__success` — border stays gray.
- Medium (default) height **36**, radius **input (xsmall)**. `--large` height **40**, radius **medium**. Prefix/suffix/clear **size 16**. Label `gray.subtle` (same as `.kn-form-label`). `--left` from 768px uses label width **size 120**. `--inside` visually hides the label; `aria-label` (or `aria-labelledby`) is required — `KNSearchInput.hydrate` copies the label text onto the input when missing. `--inside-input` moves the label into the field as `__label-prefix` (after the search icon). `--no-icon` / `.search-input--no-icon` hides the leading search icon. Label suffix/trailing compose `.kn-form-label__suffix` / `__trailing`. `__trailing` is a field-end slot (nested Dropdown).
- Overlay offset **spacing.2**, z-index overlay. List chrome is ActionList (flush when the Dropdown already has it). Empty copy is `.kn-action-list__empty`.
- Clear is an `.icon-btn` with `aria-label="Clear search"`. `[hidden]` until there is inputValue. `.is-loading` hides clear and shows `.kn-autocomplete__spinner` (compose `.kn-spinner` in `__suffix`; hydrate inserts it when missing).
- `KNSearchInput.hydrate` stamps `data-kn-component="search-input"` on the wrapper (`.kn-autocomplete`) or the field alias (`.search-input`). Does not bind filter or overlay.
- maxRows **single** only. FLAG: multiple/expandable (tags-in-field) is not built. Selected values outside the field are Tag (`.kn-tag`), not Chip.
- Keyboard (quick actions): ArrowUp/Down moves `.is-active` (focus ring, not a hover fill and not selected), Enter chooses, Escape closes the Dropdown. That matches ActionList / Menu.

Existing: `#quick-actions-search` (combobox in Dropdown), `#vis-search`, admin `data-admin-q`, shipment doc/ref search. `.search-input` is an alias — do not restyle it in `styles.css`. Perm-search and `.kn-field__control` share the Form Input-family tokens (light `gray.intense`, **xquick / standard**, thin primary ring — not `--kn-focus-ring`). Agentic `.side-nav-chat-search` keeps its accent ring.

## Avatar

```
.kn-avatar.kn-avatar--{size}.kn-avatar--{circle|square}.kn-avatar--{color}[.kn-avatar--on-dark][.is-interactive][.is-selected]
  .kn-avatar__icon
  .kn-avatar__top   /* Indicator only */
  .kn-avatar__bottom /* icon only */
.kn-avatar-group.kn-avatar-group--{compact|normal|comfortable}[.kn-avatar-group--{size}]
```

Alias: `.avatar` / `.avatar--*`. Default **circle**, **medium (36)**, **neutral**.

| Size | px | Type | Face icon | Bottom icon |
| --- | --- | --- | --- | --- |
| xsmall | 20 | body-xxs | 12 | 12 |
| small | 28 | body-xxs | 16 | 12 |
| medium | 36 | body-sm (12) | 16 | 16 |
| large | 48 | body-md (14) | 20 | 20 |
| xlarge | 56 | body-md (14) | 24 | 24 |

- Color recipe: faded interactive fill + matching interactive text. Neutral uses `interactive.background.gray.faded` / `interactive.text.gray.normal` (gray is the interactive stand-in for Avatar’s “neutral” color).
- Light ring: `border.thinner` + `surface.border.gray.subtle`. Do not use `--on-dark` on light pages.
- `--on-dark`: TopNav only. Replaces the light ring with `border.thin` + `staticWhite` × `opacity.500` (32%). Owned by the primitive — do not restyle `.top-nav .avatar`.
- Square radius: xsmall/small → xsmall; medium/large → control; xlarge → surface.
- Image `alt` is required (`data-kn-name` fills it via `hydrateKnAvatars` when `alt` is omitted). Initials: first + last letter; one word → first two. Empty name → icon slot (`.kn-avatar__icon`); admin tables fall back to `"KN"`.
- Interactive only when the Avatar itself is `a` / `button` / `.is-interactive`. Hover: `border.thick` + `gray.muted` outline, **xquick / standard**. Focus-visible: `--kn-focus-ring`. Selected: `border.thicker` + `surface.border.primary.normal`. TopNav uses `.avatar-trigger` as the Menu control — the inner Avatar stays `aria-hidden` presentation, not interactive.
- Group default density **compact** (half-size overlap). Normal: 16 (`size-14` on xsmall). Comfortable: `spacing.3` (8). Separator ring is `surface.gray.intense` (light paper), not staticWhite. Overflow chip: `.kn-avatar--overflow` (`+N`) via `data-kn-max-count` + `KNAvatar.hydrate`. `role="group"`.
- `topAddon` is Indicator (`.kn-indicator`). Product `.indicator` stays size-8. Square offset is **-10%** (FLAG: no token). No default user icon asset. No loading state. `.agentic-thread-msg__avatar` is not this primitive.

Existing: TopNav `--information --on-dark` (medium). Profile menu `--large` on the light overlay. Admin people tables `--xsmall` on the light canvas.

## Badge

```
.kn-badge.kn-badge--{color}.kn-badge--{subtle|intense}.kn-badge--{xsmall|small|medium|large}
  .kn-badge__icon
  .kn-badge__label
```

Canonical, non-interactive metadata pill. Aliases: `.badge`, `.pill`. `KNBadge.className(color, { emphasis, size })` + `KNBadge.hydrate()`.

| Size | Height | Pad X (with icon) | Gap | Icon |
| --- | --- | --- | --- | --- |
| xsmall | 14 | spacing.2 | spacing.1 | 12 |
| small | 16 | spacing.2 | spacing.1 | 12 |
| medium (default) | 20 | spacing.2 | spacing.2 | 16 |
| large | 24 | spacing.3 | spacing.2 | 16 |

Text-only inset is pad X plus the gap token (`calc` of those spacing steps). Radius is **max** (`--radius-pill`). Type is **caption-sm (12px)** on every size; subtle weight **medium**, intense **regular**. Line-height matches the size box so caption-sm’s 16px line does not overflow xsmall 14.

Colors: `positive` | `negative` | `notice` | `information` | `neutral` (default) | `primary`.

- Subtle: `feedback.background.{color}.subtle` + `feedback.text.{color}.intense` (neutral text is `feedback.text.neutral.intense` / surface-900). Primary: `surface.background.primary.subtle` (indigo-100) + `surface.text.primary.normal`; icon `surface.icon.primary.normal`.
- Intense: `feedback.background.{color}.intense` + `staticWhite` text/icon. Primary intense: `surface.background.primary.intense`.
- Text is required. No icon-only. Truncate one line; hydrate sets `title` when the label overflows.
- No hover, focus, open, or loading motion — Badge is not a control. Do not add transitions on the primitive.

Not Chip (selectable), not Tag (dismissible), not Counter (numeric). Do not put Badge classes on `.vis-chip` / `.agentic-home-pill`. `.agentic-home__ghost-badge` is a ChatInput keycap, not this primitive.

Existing: KPI trends, Visibility/shipment status, admin Active/Inactive, Schema UI status, file-type chips (`.kn-file__chip`). Product overlay `.badge--ai` (Assistant accent) is not a Badge color. Multi-select values are Tag (`.kn-tag` / `.kn-select__chip`) — do not put Badge classes on them.

## Header / Footer

Overlay chrome for Drawer, BottomSheet, and titled Modal. Not page chrome.

```
.kn-header.kn-header--{xlarge|large|medium}[.kn-header--no-divider][.kn-header--{information|positive|notice|negative|neutral}]
  .kn-header__back          (optional; stacked drawers)
  .kn-header__leading
  .kn-header__copy
    .kn-header__title-row
      .kn-header__title
      .kn-header__title-suffix   (Counter)
    .kn-header__subtitle
  .kn-header__trailing      (Badge, Text, Button, or Link — one)
  .kn-header__close         (.icon-btn 32, default on overlays)

.kn-footer[.kn-footer--no-divider]
  .kn-footer__actions.kn-btn-group.kn-btn-group--loose
```

Canonical (`KNHeader.hydrate()`):

- Default size **large**. Padding **spacing.5**; from **768px** **spacing.6** on all sides. The chrome hairline is `border.thin` + `surface.border.gray.muted` (header bottom, footer top) — same tokens as Divider default, not a Divider node. `--no-divider` removes it.
- Slot alignment **28** (`--kn-layout-header-slot`) for large/xlarge; **20** for medium. Back/trailing/close sit in that box. Close glyph is **16** inside `.icon-btn` **32**.
- Title: large = **body-lg / semibold**, xlarge = **heading-sm / semibold**, medium = **body-md / semibold**, color `surface.text.gray.normal`. Optical `margin-top` is **size-1**. Subtitle is **body-sm / regular** + `gray.muted`. Disabled uses `gray.disabled`. Title suffix composes Counter (small); the suffix slot is not itself interactive.
- Gaps: back → copy **spacing.5**; leading → copy **spacing.3**; copy pad-end **spacing.5**; trailing → close **spacing.5**. Title suffix gap **spacing.3**.
- Close is shown by default on overlays (`aria-label="Close"`). Back is opt-in for a stacked drawer (FLAG: KN is single-drawer; no live peek/stack). No hover/open motion on the chrome — IconButton and Drawer/Sheet/Modal own interaction motion.
- Optional feedback wash (`--information` etc.) is opt-in. Live drawers omit it so admin forms stay on the light canvas. DetailedView adds `--no-divider` when underline tabs follow so the Header and tab strip do not stack two hairlines.
- CreationView overlay chrome is this Header/Footer on the host Modal or Sheet — do not nest a second Header inside `.kn-creation`.
- Not AppBar. Overlay headers stay `.kn-header`; the page-level 64 bar is `.kn-appbar`. Not Dropdown header (different padding). Not Accordion header. Not confirm Modal’s close-only row.

Existing: `.kn-drawer__header` / `.kn-drawer__footer` (dashboard customize, hold, shipment detail, admin). Product leading plate `.kn-drawer__header-icon` is **40** on `surface.sea.subtle` — FLAG vs the 28 slot; do not shrink it. `.kn-detail-head` stays a grid around this chrome (DetailedView). Confirm dialogs keep `.kn-modal__header` as a close-only row (padding **spacing.4**, FLAG vs **spacing.5**).

## Menu

```
.kn-menu[.kn-menu--flush]          (alias .menu-overlay)
  .kn-menu__header                 (alias .menu-header)
  .kn-menu__divider                (alias .kn-divider / .menu-divider)
  .kn-menu__item[.is-selected][.is-negative][.is-active]
    .kn-menu__leading
    .kn-menu__copy
      .kn-menu__title-row
        .kn-menu__title
        .kn-menu__title-suffix
      .kn-menu__description
    .kn-menu__trailing
  .kn-menu__footer
```

Canonical overlay (this is the reference Dropdown / vis-menu / select overlay too):
- Fill `surface.background.gray.intense` (white on light). `border.thin` + `surface.border.gray.normal`, radius **medium**, elevation **midRaised**.
- Padding **spacing.3**. Min-width **size 200**, **size 240** from 480px (`s`). Max-height **size 300** on `.kn-menu` / `.vis-menu__list` (not on `#quick-actions-menu` — that overlay is wider and has a header). DatePicker’s `.kn-date-picker__panel` also skips the 300 cap and uses pad **spacing.6**.
- Default offset **size 8** (`top: 100% + size-8` on vis-menu — now the Dropdown anchored default). TopNav `#profile-menu` keeps `100% - spacing.2` overlap (product).
- Open/close is `[hidden] { display: none }` — no enter/exit motion (display cannot transition). Item hover/focus uses **2xquick** / **standard**.
- `--flush` inside a sheet that already has chrome.

Header is **not** overlay Header (no close, no slot 28). Title is **body-md semibold** on `surface.text.gray.normal`, margin-bottom **spacing.3**, then a Divider. Footer is Divider + padding **spacing.3** / **spacing.3** / **0**. Divider bleeds with negative margin **spacing.3** and margin-block **spacing.1**, and Menu sets `flex-grow: 0` so it does not stretch.

Items share ActionList (see ActionList). Menu items bake **body-md regular** and truncate one line. Roles: `menuitem` | `menuitemcheckbox` | `option`. `.is-active` is keyboard focus ring. `KNMenu.hydrate` maps aliases, sets `aria-disabled`, and binds Arrow/Home/End on `[role="menu"]` (including Visibility overflow / more Dropdown overlays). Listbox Dropdowns stay product-focus. Opening profile focuses the first enabled item; Escape returns focus to `.avatar-trigger`.

Do not use a translucent popup fill or backdrop blur on this overlay — those tokens do not exist, and they would not fit the light canvas.

Existing: `#profile-menu.kn-menu.menu-overlay`. Trigger is `.avatar-trigger` (TopNav chrome around a presentation Avatar — do not mark the inner Avatar interactive). Visibility / admin / kn-select keep `.vis-menu__list.kn-dropdown__overlay` wrapping `.action-list-item`. Quick actions keep `.dropdown-overlay` with padding-block **0** because it has its own header. That header is Dropdown Header (not overlay Header); the close control is product.

## Motion

Canonical enter/exit engine. No animation library. Use `--theme-motion-*` / `--kn-motion-*`. `prefers-reduced-motion` already zeroes duration and delay tokens.

```
.kn-motion.kn-motion--{in|out|inout}.kn-motion--{enter|exit|standard|emphasized}[data-motion-trigger][data-visible][.is-hidden][.is-in-view]
.kn-fade.kn-fade--{in|out|inout}[data-visible][.is-hidden][.is-in-view]
.kn-move[data-motion-trigger="mount"]
.kn-scale[.kn-scale--down][.kn-scale--hover][.is-highlighted]
.kn-slide.kn-slide--{top|bottom|left|right}
.kn-stagger > *
.kn-morph
.kn-elevate
```

| Preset | Duration | Easing | What it animates |
| --- | --- | --- | --- |
| `.kn-motion--enter` | xmoderate | entrance | generic enter |
| `.kn-motion--exit` | moderate | exit | generic exit — **not** Move (Move exit is **quick**) |
| `.kn-motion--standard` | 2xquick | standard | short interactive |
| `.kn-motion--emphasized` | xquick | emphasized | strong interactive |
| Fade | xquick | entrance / exit | opacity only |
| Move | xmoderate / **quick** | entrance / exit | opacity + `translateY(spacing.5)` |
| Scale | moderate | standard | `scale(1.05)` up / `0.98` down |
| Elevate | moderate | standard | box-shadow **none** → **lowRaised** (opt-in `--mid` / `--high`) |
| Slide vertical | 2xgentle / xgentle | emphasized | `100vh` |
| Slide horizontal | xmoderate / moderate | entrance / exit | `100vw` |
| Stagger | interval **2xquick** | — | child `animation-delay` |
| Morph | moderate | standard | border-radius + background-color |

Type `--in` skips the hide animation; `--out` skips mount; `--inout` is both. `[hidden]` unmounts. Delay is `--kn-motion-delay` set to a **delay.*** token. There is no `delay.0` — omit the property for 0.

Triggers: `mount` (default), `hover`, `focus`, `tap`, `in-view`. `in-view` uses `KNMotion.hydrate` (IntersectionObserver, **0.8** visible, once). FLAG: 0.8 is not a token.

Parent-hover children: `.kn-animate-interactions` + `.kn-move` (not a mount Move).

Do **not** merge product `@keyframes kn-fade-in` (dashboard, **gentle** + `spacing.3`) with `.kn-fade` (**xquick**, opacity only).

Existing: drawer overlay, accordion chevron, buttons, dashboard `#dash-live.kn-stagger`.

## Theme

Canonical document-level Theme (light only). Not a visual widget and not a React provider.

**Activation** (must match on every page):

- `data-theme="klearnow"`
- `data-color-scheme="light"`
- `data-kn-theme="enabled"`
- `color-scheme: light` on `:root` (`tokens.css`) and `html, body` (`styles.css`)

**What owns what**

| Layer | Owns |
| --- | --- |
| `tokens.css` `:root` | Colors (light canvas), type sizes + mobile step-down, elevation, letter-spacing. Display family. |
| `theme.js` `knTheme` | Unitless JS mirror of spacing, size, radius, border width, opacity, motion, breakpoints, type families/weights. |
| `applyKnThemeToDocument()` | Attributes above + rem sync of spacing / size / radius / border width / opacity / motion, and non-display font families. Breakpoints as px. |
| `breakpoints.js` | `data-matched-breakpoint` + `data-matched-device-type` (`mobile` below `m` / 768, `desktop` from `m`). Also `KNTheme.platform`. |
| `token-utils.js` | `makeTypographySize` (rem), `makeSize` (px for breakpoints / JS layout), `makeMotionTime`. |

**API:** `KNTheme.apply()`, `KNTheme.setColorScheme()`, `KNTheme.getColorScheme()`, `KNTheme.tokens` (`knTheme`). `setColorScheme("system")` still resolves to **light**.

**Does not write from JS:** colors, elevation, type sizes (inline would beat the 768px type media query), `--theme-typography-fonts-family-display`.

**Light surfaces:** page canvas is `surface.background.gray.intense` (white). `primary.intense` on `body` is TopNav chrome, not a dark scheme. `--on-dark` is TopNav-only. Tooltip / coachmark `staticBlack` fill is inverted chrome on the light page, not a second theme.

**Motion:** Theme itself has no hover/focus/open animation. Tooltip show/hide delays consume `delay.xquick` / `delay.2xquick`. Overlay open/close stays `[hidden]` (cannot transition).

**Not Theme:** overlay z-index stacks (Drawer / sheet / Menu already use `--theme-zindex-overlay`); ButtonGroup-in-overlay context reset (no React context — menus/tooltips are fixed to `body`). Do not generate palettes from a brand color.

Existing: `index.html` + `home.html` both load `token-utils.js` → `theme.js` → `breakpoints.js` deferred in `<head>`.

## Tooltip (Theme delay group)

```
.kn-tooltip.type-caption-sm[role="tooltip"]#kn-tooltip
  strong.kn-tooltip__title
```

`initKnTooltips()` — one live node, `data-tooltip` / `data-tooltip-title`. Show delay **`delay.xquick`**, hide **`delay.2xquick`**. Gap and viewport edge **`spacing.3`**. Fill `interactive.background.staticBlack.default`; type `staticWhite`; radius **medium**; elevation **lowRaised**; max-width **size-200**. Open/close is `[hidden]`. z-index **1100** (FLAG vs overlay 1000). Coachmark `.kn-tooltip--coachmark` reuses the same gap token; its close control is `.icon-btn.icon-btn--on-dark` (see IconButton dismiss hit target). Pair with icon-only FAB (`aria-label` on the control). FLAG: no `delay` step at 300ms.

## BottomNav

```
nav.kn-bottom-nav
  a.kn-bottom-nav__item[href="#…"][aria-current="page"]
    .kn-bottom-nav__icon
      svg
    .kn-bottom-nav__title
  button.kn-bottom-nav__item[type="button"]
```

Canonical mobile tab bar. **2–5** items (links or buttons). Icon **20** above label. Label is **body-xxs (10) / semibold**, not caption-sm (12). Rest color `interactive.text.gray.subtle`; current `aria-current="page"` uses `interactive.text.primary.normal` (FLAG: no `.subtle`). Fill is `surface.background.gray.intense` on the light canvas — not staticWhite. Top hairline `border.thin` + `surface.border.gray.muted`. z-index **sticky 100** (behind overlay drawers; above FAB 99). Height is `--kn-layout-bottomnav-height` (padding **spacing.5 / spacing.4** + icon 20 + gap **spacing.1** + body-xxs line + border thin). Upward shadow is composed (`size-8` / `size-24` / elevation color) — FLAG, not an elevation level. Color transition **2xquick / standard**; `:focus-visible` is `--kn-focus-ring`; no hover fill; no enter/exit of the bar. `KNBottomNav.hydrate` sets `role="navigation"`, `type="button"`, `rel` on `_blank`, and hash `aria-current`. A **More** item is a button that should open SideNav (drawer on mobile) — do not invent a second rail.

Product chrome today is `.top-nav-mobile` + `.side-nav`. Do not replace them with BottomNav and do not merge with AppBar (64) or TopNav (56, `primary.intense`). FAB `--bottom*` offsets by this height + `--kn-fab-offset` (default **spacing.5**) when a BottomNav is present. Do not convert `#ai-assistant-trigger` into a FAB.

FLAG: no `env(safe-area-inset-bottom)` token; no `interactive.text.primary.subtle`.

## BottomSheet

```
.kn-sheet-root.is-open[.kn-sheet-root--no-dismiss]
  .kn-sheet__overlay
  .kn-sheet.kn-sheet--{snap-low|snap-mid|snap-high|auto}[role="dialog"][aria-modal="true"]
    .kn-sheet__handle
    .kn-header.kn-header--no-divider
    .kn-sheet__body[.kn-sheet__body--flush|.kn-sheet__body--list]
    .kn-footer
```

Canonical mobile overlay from the bottom. Default rest is **50%** (`--snap-mid`). `--snap-low` 35% / `--snap-high` 85%. `--auto` sizes to content (max 85%). Fill is `surface.background.gray.intense` on the light canvas — not staticWhite, not a popup token. Top radius **large (16)**. Hairline `border.thin` + `surface.border.gray.subtle`. z-index **overlay 1000** (drawers stay overlay+1 so they cover a sheet).

Handle **56×4**, `interactive.gray.faded`, radius **large** (not pill). Padding-top **spacing.4**, margin-bottom **spacing.2**. Header has **no divider** (handle already separates). Body composes **Box**; padding is product **spacing.5** (not a Box default); `--flush` is 0; ActionList inside uses **spacing.3** (`:has(.kn-action-list)` or `--list`). Footer is the overlay primitive on the same fill.

Open/close: **moderate** + **entrance** / **exit** (overlay and panel). FLAG: source used a one-off bezier — we use motion tokens. `is-dragging` on the panel skips the transition. Reduced-motion: no transition. `KNBottomSheet.hydrate` / `open` / `close`: overlay tap, Escape, `.kn-header__close` / `[data-kn-sheet-dismiss]`, handle swipe-down (threshold **size-56**), focus close, body scroll lock. `--no-dismiss` keeps overlay/Escape/swipe from closing. Trigger: `[data-kn-sheet-open="#id"]`.

CreationView on small screens hosts the form here. `--preview-sheet` hides the in-body preview below **768px**; a Preview button (`[data-kn-creation-preview-open="#sheet-id"]`) opens a second sheet. Footer actions stack full-width (same as Confirmation in a sheet).

Do **not** restyle live drawers into sheets. Confirmation on small screens can compose this when first wired (`.kn-sheet .kn-confirm` stacks actions full-width). Live admin confirms stay Modal. FLAG: no popup fill; reverse-elevation shadow (6% not 18%); snap percents are not a spacing token; no rubberband/stack helpers; no `env(safe-area-inset-bottom)`; Dropdown does not glue into a sheet.

## Box

```
.kn-box.kn-box--{flex|row|column|row-reverse|column-reverse|center|grid}[.kn-box--wrap]
```

Canonical **layout primitive**. Default is a shrinkable root (`min-width: 0`). **No** fill, padding, radius, elevation, or motion. Gap, padding, and radius stay on the product class using `--theme-spacing-*` / `--theme-border-radius-*`. Do not add a spacing or color utility framework.

`--flex` is an alias of `--row`. `--center` sets `align-items` + `justify-content` center (combine with `--column` when the stack is vertical). `--wrap` only sets `flex-wrap` — pair it with a direction modifier. `[hidden]` is `display: none` and beats the display modifiers.

**Tag (`as`):** native HTML. Default `div`. Allowed landmarks: `section` | `header` | `footer` | `main` | `aside` | `nav`. Also `span` | `label`. Do not invent a JS `as` validator.

**Fill (product class only):** `transparent`, `surface.background.*`, or `feedback.background.*`. Never interactive fills, never popup, never overlay scrims (`overlay.background.*` are dimmers for Drawer/Sheet overlay, not Box paper). Prefer **Card** when the surface is meant to be seen (fill + padding + elevation). Compose `.kn-elevate` when a lift is needed — Box has no default shadow. Do not wrap Card in Elevate (Card idle is already **lowRaised**; Elevate idles at **none**).

**Motion:** none. No hover/focus/open/close/loading on Box. Elevate / Fade / overlay motion live on those helpers, not here. Do not use Box as a click or hover trigger (use Button).

`KNBox.hydrate` ensures `.kn-box` on layout roots and adds `--column` when `.kh-panel` / `.kn-drawer__body` / `.kn-sheet__body` have no display modifier.

Existing composition: `.kh-panel` (gap **spacing.5**), `.kn-drawer__body` (padding **spacing.6**), `.kn-sheet__body` (padding **spacing.5**). `.panel.card` is **Card**, not Box.

FLAG: no styled-props React API in this static app (classes + product CSS). `--flex` / `--row` / `--center` / reverse / wrap / grid are unused in live HTML today — kept as the layout API. No backdrop-filter tokens. No popup fill. `article` is not in the allowed tag list.

## Breadcrumb

```
nav.kn-breadcrumb.kn-breadcrumb--{small|medium|large}.kn-breadcrumb--{primary|neutral|white}[.kn-breadcrumb--last-separator]
  ol.kn-breadcrumb__list
    li.kn-breadcrumb__item[aria-current="page"]
      a.kn-breadcrumb__link | span.kn-breadcrumb__link.is-current
        [.kn-breadcrumb__icon]  (optional; icon-only needs aria-label)
      .kn-breadcrumb__separator   (/)
```

Canonical trail. Default **medium** + **primary** on the light canvas. `--white` is on-dark only (TopNav) — not a dark scheme and not for light pages.

- Current page is **text**, not a link (`span.is-current`). `aria-current="page"` on the **li**. Color `surface.text.gray.normal`, weight **medium**. Do not use `gray.subtle` for current (too faint on light paper).
- Ancestors are links and follow the **Link** recipe: no underline at rest; underline on hover / `:focus-visible`. Color **2xquick / standard**. Keyboard uses `--kn-focus-ring`.
- Separator `/` is `surface.text.gray.muted`, weight **medium**, `aria-hidden`. CSS hides the last slash; `--last-separator` keeps it (page-title pattern).
- Size is body **sm / md / lg** on the root (links, current, and `/` inherit). Icon **size-16**; small is **size-12**.
- Neutral ancestors use `interactive.text.gray.normal` / hover `.subtle` — not surface.subtle.
- `KNBreadcrumb.hydrate` sets `aria-label="Breadcrumb"` if missing and binds hash navigation once on the nav.

Existing: `.content-breadcrumb` (product padding **spacing.5**) + `.breadcrumb`. Hidden on Agentic Broker (the trail would only repeat the page title).

FLAG: no `interactive.text.primary.subtle` token — primary hover stays `.normal` + underline (same as `.kn-link`). Do not apply opacity **700** on non-primary items (too faint on light paper). Home glyph `stroke-width="1.75"` has no stroke token. List is its own flex wrap — not Box gap utilities. White separator uses `--theme-colors-surface-text-staticWhite-muted` (FLAG: no `--kn-color-*` alias for that slot).

## Button

```
button.kn-btn.kn-btn--{primary|secondary|tertiary}.kn-btn--{xsmall|small|medium|large}[.kn-btn--negative|.kn-btn--positive|.kn-btn--white][.kn-btn--icon][.kn-btn--icon-right][.kn-btn--full][.is-loading]
  .kn-btn__icon
  .kn-btn__label
```

Canonical action. Default size **medium 36**. Variant class is required for fill (`--primary` / `--secondary` / `--tertiary`); an unstyled `.btn` is secondary-shaped (gray.intense paper + gray hairline) so existing product buttons without `--primary` do not become CTAs.

| Size | Min-height | Padding X | Type | Radius | Icon (with text) |
| --- | --- | --- | --- | --- | --- |
| xsmall | 28 | spacing.3 | caption-sm | small | 12 |
| small | 32 (`.btn--sm`) | spacing.3 | caption-sm | small | 12 |
| medium | 36 (`.btn--md`, default) | spacing.4 | body-md | small | 16 |
| large | 48 | spacing.5 | body-lg | medium | 16 |

- Weight **medium**. Icon gap **spacing.2**. Icon-only (`.kn-btn--icon`) is a **square** of the size; glyph **16**. Toolbar / close / map chrome is **IconButton** (`.icon-btn`) — do not merge. FAB composes **large primary** with radius **max** and icon **24** — do not fold FAB into this table.
- Primary fill `interactive.background.primary.default`; label `interactive.text.onPrimary.normal`. Hover/focus uses `--kn-color-background-interactive-primary-highlighted` (alias added — no longer a FLAG).
- Secondary is gray.intense + `interactive.border.gray.*`. Hover keeps gray.normal text (not subtle) and does not wash a staticWhite highlight.
- Tertiary is **transparent/ghost** on the light canvas. Hover `interactive.gray.faded` (not primary.faded). Source tertiary tokens match secondary — we do not duplicate secondary. `--white` is on-dark only. White hover is `interactive.staticWhite.highlighted`. White disabled uses `--kn-color-background-interactive-staticWhite-disabled` (alias added) so it is not painted with primary-disabled.
- Negative/positive primary fills are `feedback.*.intense` (FLAG: no `interactive.background.negative.default`). Destructive hover keeps `--kn-primitive-red-600` (KEEP hex) in product CSS.
- Tertiary+negative is a live product exception (constraint is tertiary only with primary or white).
- Disabled uses disabled tokens — not a blanket opacity. Loading: `.is-loading` + optional child `.kn-spinner`; `aria-busy`. Motion **xquick / standard**. Keyboard `--kn-focus-ring`.
- `KNButton.hydrate` sets `type="button"` when missing, `rel` on `_blank` anchors, `aria-label` on icon-only from `data-tooltip`, and calls `KNButtonGroup.hydrate`.

FLAG: no 1.5px 3D inset shadow token — hairline `border.thin`. No spinner inside Button by default (compose `.kn-spinner`).

Existing: `.btn`.

## ButtonGroup

```
.kn-btn-group.kn-btn-group--{primary|secondary|tertiary}[.kn-btn-group--{xsmall|small|medium|large}][.kn-btn-group--{white|positive|negative}][.kn-btn-group--full][.kn-btn-group--disabled][.kn-btn-group--loose]
  .kn-btn | .kn-dropdown > .kn-btn
```

Canonical joined cluster. Default **joined**, variant **primary**, size **medium**, color **primary**. `role="group"`. Radius follows Button: **small** (xsmall / small / medium), **medium** (large). No group fill or elevation — paper comes from the child Buttons.

| Mode | Inner seam | Gap |
| --- | --- | --- |
| joined primary (default) | strip inner vertical hairlines + `surface.border.gray.subtle` divider (`border.thin`) | none |
| joined secondary / tertiary | overlap `calc(var(--kn-border-thin) * -1)` | none |
| `--loose` | none (each Button keeps its radius) | spacing.3 (xsmall/small: spacing.2) |

- `--full` is width 100% and flexes children (including a Dropdown trigger).
- `--disabled` / `aria-disabled="true"`: `pointer-events: none` on the group. Children use Button disabled tokens — no group opacity wash.
- `--white` is on-dark only (same as Button). Do not use it on the light canvas.
- Dropdown trigger may be a child (split button). Overlay is the **Menu** recipe and is `position: fixed` — it must not inherit joined radius or seams. There is no live split-button instance yet.
- Hover, focus, and loading stay on **Button** (`xquick` / `standard`, `--kn-focus-ring`). The group has no enter/exit or hover motion. Joined `:focus-within` sets `overflow: visible` so the focus ring is not clipped.
- `KNButtonGroup.hydrate` (also called from `KNButton.hydrate`): `role="group"` if missing; copies explicit group size / variant / color classes onto child Buttons that lack them (static stand-in for React context). Does **not** default-inherit primary — live `--loose` clusters mix tertiary + primary. Group `--disabled` sets `disabled` / `aria-disabled` on children.
- Not IconButton (`.icon-btn` is toolbar chrome — map zoom sits beside the basemap group). Not InputGroup (form layout). Not SegmentedControl — `--loose` map Satellite/Map is a spaced cluster, not a joined segmented control.

`--loose` is a KlearNow product mode (the reference joined recipe has no gap). Keep it for mixed Cancel/Apply and map view chips. Do not convert those live clusters into joined groups.

Existing: map Satellite/Map (`.map-basemap.kn-btn-group--loose.kn-btn-group--small`), date-picker footer, drawer footer actions, Confirmation actions, CreationView footer.

FLAG: no 1.5px 3D / radial glow token to strip from non-first primary buttons (Button has no gradient). Primary divider `gray.subtle` on filled indigo may be low contrast — do not invent an onPrimary divider. Joined `overflow: hidden` vs `--kn-focus-ring` is mitigated by `:focus-within` (corner clip may still flash). Local `z-index: 1` on hover/focus raises the active child — not a `--theme-zindex-*` layer. No named overlay-reset helper (overlays are fixed to `body`).

## IconButton

```
button.icon-btn[.icon-btn--on-dark]
```

Canonical icon-only chrome (not `.kn-btn--icon`, not FAB). Default **medium 32**, glyph **16**, transparent rest. Optional `--small` is **24** / glyph **12**. There is still no compact **20**. `--moderate` is a paper wash (`staticWhite.faded`). FAB icon-only is a **48** circle — do not convert it to `.icon-btn`. Hover: icon `gray.subtle` + `interactive.gray.faded` wash (FLAG: source intense hover is transparent; the wash keeps the 32px target readable on light paper). Motion **xquick / standard**. Keyboard `--kn-focus-ring`. `--on-dark` is inverted chrome (TopNav, coachmark, intense Alert close). `aria-label` required (`KNButton.hydrate` copies `data-tooltip` if missing). Do not merge with Button icon-only. ChatInput submit may also have `.icon-btn` (agentic send) but is **Button small** (32 / radius small / filled) — do not treat it as toolbar chrome. ChatMessage footer actions (`.ai-msg__action` / `.agentic-msg-action`) compose this **32** control; live AI surfaces overlay `--ai-assistant-accent-*` for hover/focus instead of `--kn-focus-ring`.

**Dismiss hit target (once):** `.icon-btn` is already **32**. There is no compact 20px IconButton in the library. Alert dismiss, Coachmark close, ChatInput error dismiss, and the assistant ref-chip dismiss each independently overrode that down to `--theme-size-20` (not a shared base). Banner/coachmark padding is not enough click-forgiveness to go below the ~24px touch minimum, and **24 is Badge height, not a control size**. Do not shrink `.icon-btn` with `width`/`height`. Glyph stays **16**. Overlay Header / Toast / drawer close already followed this. Tag dismiss (`.kn-tag__dismiss`) is a compact chip-end control, not IconButton.

## Card

```
.kn-card.kn-card--{primary|secondary}[.kn-card--metric][.is-selected][.is-disabled][.kn-card--interactive]
  .kn-card__header / .card-header
    .kn-card__leading / .card-header__leading
      icon + title + subtitle + counter
    .kn-card__trailing / .card-header__trailing
      badge | text | link | icon button
  .kn-card__body / .card-body
  .kn-card__footer / .card-footer
    .kn-card__footer-leading
    .kn-card__footer-trailing   (primary + secondary actions)
```

Visual container. Prefer **Card** over Box when you need fill, padding, and elevation. Box is layout-only — do not compose Card classes onto a Box to fake a card.

- Light fill is `--kn-card-background` (currently `interactive.staticWhite.default`). **Do not** set `background` on `.kn-card` / `.panel.card` to another token. The donut hole (`.kn-chart__center`) reads this same custom property so it tracks Card paper. A Card variant that needs a different fill overrides `--kn-card-background` on that variant.
- CreationView preview is **not** Card. That column is a nested `surface.gray.subtle` well on overlay paper (see CreationView). Do not paint `.kn-creation__preview` with `--kn-card-background`.
- `primary` is the full header/body/footer composition. `secondary` is body-only.
- Size `large` | `medium` is the header title scale — product cards stay large.
- Selected = primary hairline. Disabled takes precedence over selected.
- Header trailing is one visual. Footer trailing is two buttons, independently.
- Metric cards (`.kn-card--metric` / `.dash-stat-card`) tighten the gap.
- Idle elevation is **lowRaised**. Do not wrap every card in Elevate — that helper idles at **none** and would flatten Card paper. Extra hover lift is opt-in `.kn-elevate.kn-elevate--hover` (or `--mid` / `--high`) on a surface that starts flat.
- Info / ticket are sectioned (body + footer) for later; do not restyle every `.panel.card`.

Existing: `.panel.card` with `.card-header` / `.card-body` / `.card-footer`. Dashboard widgets and Visibility workspace.

## Carousel

```
.kn-carousel.kn-carousel--{1|2|3|autofit}[.kn-carousel--nav-side]
  .kn-carousel__track
    .kn-carousel__item
  .kn-carousel__nav
  .kn-carousel__indicators > .kn-carousel__dot[aria-current="true"]
```

- `1|2|3` are fluid slides; `2` and `3` collapse to one slide below 768px.
- `autofit` lets items size themselves (bleed via a fixed item width).
- Scroll-snap on the track. Nav `bottom` (default) or `--nav-side`.
- No product instance — CSS + docs only.

## Charts

```
.kn-chart.kn-chart--{bar|donut}[.kn-chart--{small|medium|large}]
  .kn-chart__plot[.dash-bars|.dash-donut]
    .kn-chart__row / .dash-bars__row
      .kn-chart__tick / .dash-bars__label
      .kn-chart__track / .dash-bars__track
        .kn-chart__seg.chart-cat--{blue|green|gold|purple}
      .kn-chart__value / .dash-bars__value
    .kn-chart__center / .dash-donut__center
  .kn-chart__legend[.kn-chart__legend--vertical]
    .kn-chart__item
      .kn-chart__swatch.chart-cat--{blue|green|gold|purple}
```

Canonical data plot. Live types are **bar** (horizontal stacked lanes) and **donut** (conic). `--line` / `--area` / `--sankey` are names only — do not invent cartesian SVG or a flow diagram. `KNChart.hydrate` sets `role="img"` on a plot that is missing it, and `aria-label="Chart legend"` on legend lists.

| Slot | Tokens |
| --- | --- |
| Root gap | spacing.4 (bar); donut row gap **spacing.7** |
| Bar row | tick **size-120**, track `1fr`, value **size-32**, gap **spacing.3** |
| Bar track | height **16**, radius **pill**, fill `surface.gray.subtle` |
| Swatch | **12 × 12**, radius **2xsmall** |
| Donut | default **large / 160** (small **80**, medium **120**). Hole **96 / 80 / 56** |
| Donut hole | `var(--kn-card-background)` — Card-owned; do not retarget independently |
| Legend | caption-sm; horizontal `gray.muted` + gap **spacing.5**; vertical / donut `gray.normal` + gap **spacing.3** |
| Series | `.chart-cat--blue` primary.default; `--green` feedback.positive.intense; `--gold` notice.intense; `--purple` KEEP purple-500 — **background** fills, not icon tokens. `.chart-cat--sky` aliases purple. |

- Hover: unmatched bar segments fade to **opacity.300** (`xquick` / `standard`). Closest to 20% (scale is 0.18 / 0.24). Legend hover on `--blue|green|gold|sky` dims the other series via `:has`. Donut slices are a single conic-gradient — no per-slice hover.
- Tooltips compose **Tooltip** (`data-tooltip` on a segment). There is no second chart tooltip.
- No series hide, no enter animation (dashboard re-renders the plot). Reduced motion: opacity/color transitions off.
- Not ProgressBar (`.progress-bar` / `.dash-progress` is a meter). Not Card (charts sit inside Card). Pie in Schema UI is rendered as donut.

Existing: dashboard `.dash-chart-grid` (lane bars + mode donut). Schema UI `CHART`. Aliases: `.dash-bars` / `.dash-donut` / `.dash-legend` / `.dash-donut-wrap`.

FLAG: no `data.background.categorical.*` palette (nine hues). Product is four MOT colors (blue / green / gold / purple). 4th series is KEEP purple-500 because `feedback.background.information.intense` (blue-sapphire) collides with primary (indigo) — Ocean vs Rail were indistinguishable. Bar track is **pill**, not 2xsmall (these are stacked 100% lanes, not cartesian columns). No 2px gap between stacked segments (would punch holes in the pill). Donut default is **large 160**, not medium 120. Hole **96** vs inner 100. Small hole **56** vs 52. Center type is heading-h5 + caption-sm, not the 75/100/200 + 500/600/700 pair. Card fill (and the hole, via `--kn-card-background`) is still `interactive.staticWhite` on this canvas.

## ChatInput

Canonical prompt field for AI chat. Primitive chrome lives in `components.css`. Product AI surfaces keep a purple accent overlay in `styles.css`.

```
.kn-chat-input / .agentic-home__composer.agentic-home__composer--lg
  .kn-chat-input__error / .agentic-home__error[.is-visible]
  .kn-chat-input__files-host[.is-open]
    .kn-chat-input__files > .kn-chat-input__file
  .kn-chat-input__card
  .kn-chat-input__field / .agentic-home__field
    textarea.kn-chat-input__control / .agentic-home__input
      .kn-chat-input__ghost / .agentic-home__ghost
        .kn-chat-input__ghost-text / .agentic-home__ghost-text
        .kn-badge.kn-badge--small.kn-badge--neutral.kn-chat-input__ghost-badge   (Tab)
  .kn-chat-input__actions / .agentic-home__composer-bar
    button.kn-link.kn-chat-input__attach / .agentic-home__attach
    .kn-chat-input__submit / .agentic-home__send
```

Canonical behavior:

- Card: radius **large**, elevation **highRaised**, fill `interactive.staticWhite` (same FLAG as Card). Field and action bar each pad **spacing.5** — no extra container gap. Root is `.kn-chat-input`; the card is a **sibling** of the error (`__card` / composer form), so the banner can sit behind the top edge.
- Enter submits; Shift+Enter newline; Tab accepts ghost; Escape clears ghost. Ghost replaces the placeholder (never stacked). Cycle **4000ms** (FLAG — between delay.xlong 3000 and 2xlong 5000). Crossfade **quick / standard**.
- Ghost copy is **Text medium** (`type-body-md`) + `surface.text.gray.muted`, truncated 1 line, with **Badge small neutral** “Tab” + arrow-right (same as Storybook `ChatInputGhostSuggestion`).
- `isGenerating` / `.is-stop` / `[data-generating="true"]` turns submit into stop (gray fill, aria-label **“Stop generation”**). Instant swap — no fade. Empty submit is disabled and hides the send glyph.
- Submit is **Button small 32 / radius small**, not a circle and not toolbar IconButton. Send/stop are **16** SVG (`currentColor`). Accessible name is **“Submit”**. Primitive fill is `interactive.primary`. Live AI surfaces overlay `--ai-assistant-accent-*` (FLAG — product purple, scoped to `.agentic-home` / `.ai-assistant-panel`, not a ChatInput color prop).
- Attach is **Link** `variant="button"` `color="neutral"` `size="small"` (`button.kn-link`) + PlusIcon **12** + “Upload file”. Not a bordered/filled chip. Sidebar uses **hideFileUpload** (no attach; actions `flex-end`).
- Files row: host height **0 → auto** (**quick / emphasized**), item width **size-200**, gap **spacing.3**, paddingTop/X **spacing.5**, horizontal scroll, `scrollTo({ behavior: 'smooth' })` on new files.
- Error is absolutely positioned **behind** the card (`z-index` 0 vs card 1 — FLAG, not a `--theme-zindex-*` layer), `bottom: calc(100% - spacing.4)`, top radii **medium**, fill `feedback.background.negative.subtle`. Copy is **Text small** (`type-body-sm`) + `feedback.text.negative.intense`, truncated **8 lines**, with InfoIcon small. Motion **xmoderate / emphasized**. Toggle is `.is-visible` (sidebar also uses `[hidden]` after the exit). Error dismiss is `.icon-btn`.
- Textarea: `resize: none`, starts at **2 lines**, max-height **size-200**, then internal scroll. Caret `surface.icon.onSea.onSubtle`. Type **body-md** on every ChatInput.
- Hover/focus/disabled motion **xquick / standard**. No press `scale(0.98)`.
- Disabled root: `pointer-events: none` + opacity **500**.
- `KNChatInput.hydrate`: `aria-multiline` on the textarea. Do not rebind Enter (product JS owns submit).
- Do not restyle `.agentic-home__disclaimer`. Do not merge with TextArea (`.kn-field`), ChatMessage (`.ai-msg`), or toolbar `.icon-btn`.

Existing: agentic home + thread composer; sidebar `#ai-assistant-chat-input`.

FLAG: token file listed radius **medium** — live + this canonical pass use **large** (16). Suggestion cycle 4000ms has no delay token (logged on delay scale §1.5 — do not invent a mid-step here). Ghost JS fade reads `duration.quick` (200ms). `--agentic-ease` remains on non-ChatInput home chrome. `field-sizing: content` is a CSS feature, not a token. Compact (non `--lg`) composer is not planned; compact row layout removed. Product sample caps files at **3 / 5MB** (not a ChatInput prop). Assistant `maxlength="500"` is a drawer product cap. `autoFocus` is wired on agentic **empty home** only (thread + drawer stay off so history can be read first).

## ChatMessage

Canonical chat row. Primitive chrome lives in `components.css`. Product AI surfaces keep a purple overlay in `styles.css`. `KNChatMessage.hydrate`.

```
.kn-chat-msg / .ai-msg
  .kn-chat-msg--self / .ai-msg--user
  .kn-chat-msg--other / .ai-msg--assistant
  [.is-loading][.ai-msg--loading][.ai-msg--streaming][.is-error]

  .kn-chat-msg__thumbs                         (CSS/docs only — no live attachments)
  .kn-chat-msg__row / .ai-msg__row             (loading: leading + copy)
    .kn-chat-msg__leading / .ai-msg__leading
    .ai-msg__loading-col
  .ai-msg__stack
    .kn-chat-msg__traces / .ai-msg__thinking-panel.kn-collapsible
    .ai-msg__response-title
    .kn-chat-msg__bubble / .ai-msg__body
    .ai-msg__sources
    .ai-msg__related
      .ai-msg__related-chip.kn-chip.kn-chip--small
    .kn-chat-msg__error
    .kn-chat-msg__actions / .ai-msg__footer
      .ai-msg__actions / .agentic-msg-actions
        .ai-msg__action.icon-btn / .agentic-msg-action.icon-btn
```

Canonical behavior:

- `self` is the user bubble. `other` is the assistant row. Loading, rolling text, leading icon, and reasoning traces are **other** only. Validation error (`is-error` + `__error` hint) is **self** only. Footer actions (copy / thumbs) are a **sibling of the body**, live on **other** in this product.
- Self bubble: radius **large**, padding **spacing.4**, fill `surface.background.gray.intense`, border **thin** + `surface.border.gray.muted`, `word-break: break-word`. Primitive type is **body-md**; the AI overlay uses **body-sm** on assistant copy.
- Live AI history and the agentic thread overlay the self bubble with `--ai-assistant-accent-*` (purple fill, onPrimary text). Do not force the primitive gray.intense onto those surfaces.
- Other bubble: no fill, no border, no shadow. Stack gap **spacing.3**. Grid loading row is `auto 1fr`, columnGap **spacing.4**.
- Leading slot is **20** with paddingX **spacing.1** / top **spacing.3** / bottom **spacing.2**. Rotate while loading: **gentle / emphasized**, delay **gentle**, 90deg snap-loop. Product overlay on the sidebar loading row is a **32** accent plate (not Avatar).
- Rolling array text is `feedback.text.positive.intense`. String / dots loading is `surface.text.gray.muted`. Dots are **size-6**, gap **spacing.1**, motion **gentle / standard**, delays **2xquick / xquick**.
- Traces compose **Collapsible**: chevron 0deg / −180deg, **moderate / standard**, size **12**. Complete steps and connectors use `icon.feedback.positive.intense`. Active label is `text.feedback.positive.intense` with a staticWhite shimmer (**2xgentle / standard**, delay **gentle**). Pending is **opacity.500**. Toggle hover on AI surfaces is `--ai-assistant-accent-text`; focus is the AI accent outline, not `--kn-focus-ring`. Live complete copy is “Show thinking” / “Hide thinking”; loading is “Exploring…”. Product overlay zeros Collapsible body **spacing.4** (tight chat: panel gap **spacing.2** + list padding-top **spacing.2**).
- Footer actions are **IconButton 32 / radius small**, always visible, **xquick / standard**. AI overlay hover/focus uses `--ai-assistant-accent-*`, not `--kn-focus-ring`. Related questions compose **Chip small** (enter uses `kn-chat-msg-enter`; stagger **2xquick** then **xquick**).
- Enter: **moderate / entrance**, translateY **spacing.3**. Spark and skeleton: **2xgentle / standard**. Streaming caret: **gentle / standard**, width **size-6**, height **size-16**. Reduced motion: no enter, rotate, shimmer, dots, spark, skeleton, or caret. Do not swap this enter for Fade (**xquick**, opacity only) or product `kn-fade-in` (**gentle**).
- `KNChatMessage.hydrate` stamps `data-kn-component="chat-message"`, sender classes, Chip classes on related prompts, `.icon-btn` on footer actions, and hydrates nested Collapsibles. `KNCollapsible.toggle` owns trace open/close (and the Show/Hide / Exploring… label). Do not rebind copy / thumbs in hydrate.
- Screen-reader announcements use a sibling polite live region, not `aria-live` on the scroller (innerHTML replace during fill would re-announce). Sidebar: `#ai-assistant-live`. Agentic thread: `#agentic-thread-live` (`role="status" aria-live="polite" aria-atomic="true"`), announced on thinking, completed answer, stop, and restored history.

Existing: Klear Assistant sidebar (`.ai-assistant-history .ai-msg`) and Agentic Broker thread (`.agentic-thread-msg .ai-msg`). Aliases: `.ai-msg`, `.ai-msg__body`, `.ai-msg__footer`, `.ai-msg__thinking-panel`.

Do not merge with ChatInput, Avatar (thread mark stays **26**, decorative), or toolbar chrome. Do not restyle `.agentic-home__disclaimer`. Thumbnails are CSS/docs only (`size-120`) — no live image stack.

FLAG: bubble shadow **`0 0.5px 4px` at 6%** is not lowRaised. Self max-width `min(88%, size-360)` — 88% has no token. Product purple self bubble vs primitive gray.intense. Leading 20 vs product loading plate 32. Thread avatar 26 vs Avatar floor 20. Agentic `.ai-rolling-loading` CSS cycle is **1500ms** (timed to the thinking delay). Sidebar `.ai-msg__rolling` JS swap interval is **1600ms**; its enter animation is xmoderate (360ms). Two widgets, not a 100ms desync on one clock — leave both. No delay token for either. Copied hold **1600ms**. Stream chunk wait **28ms** and post-thinking pause **140ms** have no duration token. Complete header default in the source spec is “Explored”; live uses Show/Hide thinking. Auto-collapse **600ms** after traces complete is not implemented (no delay token). `is-error` paints `feedback.background.negative.subtle` on the bubble; there is no live failed-send/retry flow (composer errors use ChatInput’s banner; agentic catch fills a normal assistant message). Leave the CSS; wiring an error-state retry is a product-roadmap call, not a silent delete. Shimmer is a staticWhite mix, not a named overlay token. Skeleton widths **82% / 64%**. Related-chip stagger has no 40ms/100ms token (uses 2xquick / xquick).

## Checkbox

```
.kn-checkbox.kn-checkbox--{small|medium|large}[.is-invalid][.is-disabled]
  input[type="checkbox"]
  .kn-checkbox__box / .kn-check__box
  .kn-checkbox__copy
    label + help | error

.kn-checkbox-group[.kn-checkbox-group--left][.kn-checkbox-group--small][.is-invalid][.is-disabled]
  .kn-checkbox-group__label
  .kn-checkbox-group__items
  help | error
```

Canonical light-theme selector. Alias `.kn-check` / `.kn-check__box`. `KNCheckbox.hydrate` stamps `data-kn-component="checkbox"`, syncs `disabled` / `aria-invalid` from `.is-disabled` / `.is-invalid` (and group), and sets `input.indeterminate` from `data-indeterminate`. Admin `bindIndeterminate` still owns permission-matrix mixed state and then calls hydrate.

| Size | Box | Glyph | Group item gap | Control–label gap |
| --- | --- | --- | --- | --- |
| small | 12 | 8 | spacing.2 | spacing.2 |
| medium (default) | 16 | 12 | spacing.3 | spacing.3 |
| large | 20, border **thicker** | 16 | spacing.3 | spacing.3 |

- Box: radius **xsmall**, border **thick**, margin **spacing.1**, fill **transparent** at rest (not staticWhite). Rest border `interactive.border.gray.default` (surface-600 on the light canvas — not gray.highlighted / surface-900).
- Checked / indeterminate: fill + border `interactive.*.primary.default`. Glyph is a **mask** + `interactive.icon.onPrimary.normal` (not a `#fff` data-URI).
- Hover (not disabled/invalid): unchecked `gray.faded` fill + `gray.highlighted` border; checked/indeterminate `--kn-color-background-interactive-primary-highlighted` (alias added). Motion **2xquick / standard**.
- Focus-visible: `--kn-focus-ring` (information). Disabled: per-token (`primary.disabled` when on; `gray.disabled` border when off) — not wholesale opacity. Invalid: **feedback.negative.intense** (FLAG: no `interactive.negative.default`).
- Group `isDisabled` / `is-invalid` apply to every child. Necessity is copy on the group label, not a second control.

Product overlays (keep in `styles.css`, do not absorb): `.kn-check--bare` (icon-only; box margin 0), `.kn-check--auto-read` (FLAG **1.2s** — no 1200ms duration token), `.is-ai-suggested-check` / `.ai-applicable-wrap.is-ai-suggested` (AI purple color-mix 22%/55%), `.role-perm__row--head` (column + gap **spacing.1**, box margin 0), `.kn-select__option` box margin 0.

Existing: role / user / default-role admin, `kn-select` multi options.

Related: Radio and Switch share this selector token set — keep them in sync.

## Radio

```
.kn-radio.kn-radio--{small|medium|large}[.is-invalid][.is-disabled]
  input[type="radio"]
  .kn-radio__control
  label

.kn-radio-group[.kn-radio-group--left][.kn-radio-group--small|--large][.is-invalid][.is-disabled]
  .kn-radio-group__items
```

Same interactive tokens, hover, focus, disabled, and invalid as Checkbox. Control is **round**; inner dot **4 / 6 / 8**. Group item gap small **spacing.2** / medium **spacing.3** / large **spacing.4**. `KNRadio.hydrate`. Single-select only — do not replace with Checkbox.

Existing: parties category in role / user / default-role admin.

## Switch

```
.kn-switch[.is-disabled]
  input[type="checkbox"][role="switch"]
  .kn-switch__ui
```

Binary **immediate** action (dashboard widget visibility, admin Active/Inactive, journey order). Not a Checkbox. Live size **44 × 24** (mobile medium); thumb **20**; travel `translateX(size-20)`. No small product instance.

- Track rest `interactive.background.gray.default`; checked `primary.default`; hover `gray.highlighted` / `primary.highlighted`; disabled off `gray.disabled`, on `primary.faded`. Thumb `staticWhite.default` (disabled uses `--kn-color-background-interactive-staticWhite-disabled` — alias added).
- Motion **quick / standard** (track + thumb). Focus `--kn-focus-ring`. `KNSwitch.hydrate` stamps `role="switch"` if missing.

Do not use Switch for multi-select or mixed/indeterminate state.

## Chip

```
.kn-chip-group.kn-chip-group--{xsmall|small|medium|large}[data-selection="single|multiple"][.is-invalid][.is-disabled]
  .kn-chip.kn-chip--{xsmall|small|medium|large}[.kn-chip--primary|--positive|--negative][.is-selected][.is-disabled]
    .kn-chip__icon | .kn-chip__leading
    .kn-chip__label
```

Canonical light-theme **toggle**. Alias `.vis-chip`. `KNChip.hydrate` stamps `data-kn-component="chip"`, `role="radio"` inside a radiogroup, `role="checkbox"` when `data-selection="multiple"`, syncs `aria-checked` / `.is-selected`, and hydrates nested Counters.

| Size | Height | Padding X | Radius | Icon |
| --- | --- | --- | --- | --- |
| xsmall | 24 | spacing.3 | small | 12 |
| small (default) | 28 | spacing.3 | small | 12 |
| medium | 36 | spacing.4 | small | 16 |
| large | 48 | spacing.5 | medium | 16 |

- Rest: `surface.background.gray.intense` (surface-0 / paper) + `interactive.border.gray.faded` + `interactive.text.gray.subtle`. That white outlined pill is the light-canvas rest — not a dark-surface leftover.
- Hover (not selected/disabled): `interactive.background.gray.faded`. Focus-visible: `--kn-focus-ring` (not a hover fill). Motion **xquick / standard**. No press scale (source 0.92 has no scale token — FLAG).
- Selected default is **primary** faded fill + primary border + primary text. `--positive` / `--negative` use matching faded fills + text. FLAG: no `interactive.border.{positive|negative}.default`; no `*.fadedHighlighted` selected-hover step.
- Disabled: per-token (`transparent` fill, `gray.disabled` border/text) — not wholesale opacity.
- Group `is-invalid` paints child borders `feedback.negative.intense`. Necessity is copy on the group label.

**Quick filters:** `.vis-chip` selected is **`interactive.background.gray.highlighted`** (chosen, not a CTA). Do not retarget to primary. Counters on a selected vis-chip keep the primary Counter fill so the number stays readable. Product overlay: admin toolbar `.vis-chip` min-height **size-40** (FLAG vs Chip small 28; closest Chip size is medium 36 — left as product).

**Not Chip:** Badge (metadata), Tag / `.kn-tag` (dismissible), FilterChip (dropdown trigger), `.ai-prompt-chip` / `.ai-role-chip` / `.ai-describe-chip` (AI suggestion cards). `.agentic-home-pill` composes Chip but keeps its own padding, pill radius, size-18 icon, AI focus, FLAG rgba hairline, FLAG scale 0.98. Related questions compose Chip small; product overlay keeps `--ai-assistant-accent-*` hover/focus.

Existing: Visibility / admin `.vis-chip` (small, single-select), `.agentic-home-pill` (action chips), ChatMessage related questions.

## Collapsible

```
.kn-collapsible[.kn-collapsible--top][.kn-collapsible--contained][.kn-collapsible--link][.is-disabled]
  button.kn-collapsible__trigger[.kn-collapsible__trigger--link][aria-expanded][aria-controls]
    label + .kn-collapsible__chevron
  .kn-collapsible__body[role="region"]
```

Canonical light-theme disclosure. Accordion is the grouped card variant of this pattern (exclusive inside a grouped root; see Accordion). Trigger is a Button or Link subset; the chevron always trails.

- Rest trigger: `interactive.text.gray.subtle` on a transparent fill. Hover / focus-visible: `interactive.text.gray.normal`. Chevron idle `interactive.icon.gray.muted`; hover / open `.subtle`; disabled `.disabled`. `--link` / `.kn-link` keeps Link primary color and underline-on-hover; chevron inherits.
- Focus-visible: `--kn-focus-ring` + radius **small**. ChatMessage traces keep the AI accent outline (product overlay) — excluded from the primitive ring.
- Chevron: size **12**, collapsed `0deg`, expanded `-180deg`, duration **moderate** / easing **standard**. Accordion headers keep size **20** (full-row slot) and the same rotate curve. FilterChip / side-nav chevrons are not this primitive.
- Expanded body margin **spacing.4** (top when direction is bottom; bottom when `--top`). Collapsed body stays in the DOM with `[hidden]` (`display: none`) so find-in-page can still hit it later. FLAG: no 0↔`auto` height animation (needs JS); collapsed opacity **1000** (0.8) is unused because `[hidden]` removes the box.
- Disabled: per-token text/icon, `not-allowed`, no wholesale **opacity.500**. Composing `.kn-link:disabled` still inherits Link’s opacity.500 (existing Link FLAG).
- `--contained` (opt-in): same max-width recipe as Accordion — `100vw − size.40` / size **640** (`m`) / size **800** (`l`), min-width size **200**. Do not put this on live ChatMessage traces. FLAG: the source max at `l` is size **1136** (token does not exist here); we match Accordion **800**.
- `KNCollapsible.hydrate` stamps `data-kn-component="collapsible"`, `type="button"`, `aria-controls`, `role="region"`, and syncs `hidden` from `aria-expanded`. `KNCollapsible.toggle` owns open/close. Does not steal Accordion `<details>`, permission/party rows, or admin Details / unused-category persist.

Existing: ChatMessage traces (`.ai-msg__thinking-panel.kn-collapsible`). Product overlay tints the toggle to `--ai-assistant-accent-text` / accent focus, zeros body **spacing.4** (panel gap **spacing.2** + list padding-top **spacing.2**), and swaps the chevron for a spinner while `data-reasoning-status="loading"`. Copy stays “Show thinking” / “Hide thinking” / “Exploring…”.

Not Collapsible: Accordion headers (grouped card), `.role-meta__details-btn` (CollapsibleLink-shaped `.kn-link`, persist via `detailsOpen` + re-render), `.role-perm__unused-toggle` (disclosure that persist-toggles unused groups), side-nav / tree chevrons, FilterChip chevron, ISF status-row expander, shipment journey “Show N more events” (product `kn-link` inside DetailedView — FLAG vs Collapsible + StepGroup).

## Confirmation

```
.kn-modal.kn-modal--confirm / .kn-sheet
  header.kn-modal__header            (close-only; not overlay Header)
    button.icon-btn[aria-label="Close"]
  .kn-confirm.kn-confirm--{neutral|negative|positive}
    .kn-confirm__asset
    .kn-confirm__copy
      .kn-confirm__title
      .kn-confirm__description
    .kn-confirm__actions.kn-btn-group.kn-btn-group--loose
      tertiary + primary (negative primary when --negative)
```

Canonical light-theme confirm. Desktop composes **Modal** (`role="alertdialog"`). Small screens stack actions full-width from **768px** down. BottomSheet compose is ready (`.kn-sheet .kn-confirm`); live admin stays Modal — do not silently convert.

- Asset **48**, padding **spacing.4**, radius **medium**, glyph **24**. Neutral wash `feedback.background.neutral.subtle` + `surface.icon.gray.subtle` (not muted — too faint on the light wash). Negative / positive use matching `feedback.*.subtle` fills and `feedback.icon.*.intense` glyphs.
- Copy gap **spacing.1**. Title **body-lg semibold** `surface.text.gray.normal`. Description **body-md regular** `surface.text.gray.subtle`.
- Column gap **spacing.5** (asset → copy). Copy → actions is **spacing.6**.
- Actions compose ButtonGroup `--loose` (gap **spacing.3**). FLAG vs pattern **spacing.5** — do not invent a Confirmation-only gap; `--loose` is the system cluster. Tertiary then primary; `--negative` uses `kn-btn--negative`. Either button may stand alone. Loading is Button `.is-loading` on the primary (`KNConfirmation.hydrate` copies `.kn-confirm.is-loading`).
- Close-only `.kn-modal__header` is **not** overlay Header (no title row, no divider). Padding **spacing.4** / bottom **0**. FLAG vs Header **spacing.5**. `KNHeader.hydrate` skips it. Close is IconButton **32** / glyph **16**.
- Modal body pad **spacing.6**. Width **size-400**. Fill / radius / elevation come from Modal (`surface.gray.intense`, **large**, **highRaised**).
- Open: overlay fade + panel `translateY(spacing.3)` , **moderate / entrance**. Unmount is instant (admin innerHTML). FLAG: no exit motion. Reduced motion: no enter.
- `KNConfirmation.hydrate` stamps `data-kn-component="confirmation"`, wires labelledby/describedby, hydrates the action group + close. Dismiss (overlay, close, secondary, Escape) stays product (`KNAdminUX.syncOverlayFocus` / page keydown). Do not steal `modalShell` form dialogs.

Existing: admin leave / delete / deactivate (`.kn-modal--confirm` via `KNAdminUX.confirmDialog`).

Not Confirmation: `KNAdminUX.modalShell` (title + form/footer), Drawer dirty prompts that are not this shape. Not CreationView (create + preview; titled Header). Do not merge destroy and create overlays.

## Counter

```
.kn-counter.kn-counter--{small|medium|large}.kn-counter--{color}[.kn-counter--intense][.kn-counter--wide]
```

Canonical, non-interactive numeric indicator. Alias `.counter`. `KNCounter.className(color, { emphasis, size, wide })` + `KNCounter.format(value, max)` + `KNCounter.hydrate()`.

| Size | Height / min-width | Type | Pad X when `--wide` |
| --- | --- | --- | --- |
| small (default) | 16 | body-xs (12) | spacing.2 |
| medium | 20 | body-sm (12) | spacing.3 |
| large | 24 | body-md (14) | spacing.3 |

Default CSS size is **small 16** to match live nav / vis / admin chip counts — not the source medium 20 default. Weight is **medium** on every size and both emphases (not Badge’s intense regular). Radius is **max** (`--radius-pill`). Line-height matches the size box. Truncate one line. Tabular nums.

`--wide` (value **> 9**, including `{max}+`) adds horizontal padding so multi-digit values are not flush to the pill. Single-digit 0–9 stay square. `max` is encoded in the text (`99+`), not CSS — set `data-max` / `data-value` and hydrate will format.

Max-width is **size-100** below `m`, **size-120** from 768px.

Colors: `positive` | `negative` | `notice` | `information` | `neutral` (default) | `primary`. Same light-theme recipe as Badge:

- Subtle: `feedback.background.{color}.subtle` + `feedback.text.{color}.intense` (neutral text is `feedback.text.neutral.intense`). Primary: `surface.background.primary.subtle` + `surface.text.primary.normal`.
- Intense: `feedback.background.{color}.intense` + `staticWhite` text. Primary intense: `surface.background.primary.intense`. FLAG: white on `notice.intense` / `positive.intense` (gold-600 / green-600) is the shared Badge contrast FLAG.

No hover, focus, open, or loading motion — Counter is not a control. Do not add transitions on the primitive. Chip / FilterChip / tab hosts own their interaction motion.

Not Badge (metadata text), not Chip (selectable), not Tag (dismissible), not CounterInput (stepper). Do not put Counter classes on `.vis-chip` itself.

Existing: nav `[data-nav-count]`, dashboard alert totals (intense), Visibility / admin Chip counts, ISF tab missing count (`.kn-tab__badge`). Overlay Header / Accordion **title-suffix** compose Counter. FilterChip multi-value collapses to Counter (CSS ready; no live instance).

Related left as Badge (not Counter): permission row `n/n` is a **ratio string** with product `min-width: size-40`; ISF doc-rail counts are a **size-18** corner overlay (not 16/20/24). Do not merge those into this primitive.

Product overlays (`styles.css`): selected vis-chip counts keep **primary** fill so the number stays readable on `gray.highlighted`; `.btn--primary .counter` uses `staticWhite.fadedHighlighted` + `onPrimary` (on-primary, not a dark leftover; no live instance).

## CounterInput

```
.kn-counter-input.kn-counter-input--{xsmall|medium|large}.kn-counter-input--{subtle|intense}[.kn-counter-input--left][.is-disabled][.is-loading]
  .kn-counter-input__label.kn-form-label
  .kn-counter-input__control[role="group"]
    button.kn-counter-input__dec
    .kn-counter-input__field-wrap[.is-up|.is-down]
      input.kn-counter-input__field[role="spinbutton"]
    button.kn-counter-input__inc
    .kn-counter-input__progress
      .kn-counter-input__progress-fill
```

Canonical quantity stepper. Integers only (typically 0–99). `KNCounterInput.hydrate` / `clamp`. Default **medium / subtle**. No product instance — CSS + hydrate ready.

| Size | Height | Icon | Button pad | Container radius | Button radius | Type | Min width |
| --- | --- | --- | --- | --- | --- | --- | --- |
| xsmall | 30 | 12 | spacing.2 | small | xsmall | body-sm semibold | 78 |
| medium (default) | 38 | 20 | spacing.2 | small | xsmall | body-md semibold | 94 |
| large | 50 | 24 | spacing.3 | medium | small | body-lg semibold | 122 |

Height and min-width match the source size steps. Width is still `fit-content` so the field can grow with `--kn-counter-input-digits` (`max(2, digit count)` × 1ch + spacing.2 × 2).

Light-theme fill is `surface.background.gray.intense` (paper) — not `interactive.staticWhite`. Disabled / loading fill is `surface.gray.subtle`. Do not fade the whole control with opacity.

- Subtle: border `interactive.gray.default`; value `surface.text.gray.subtle`; icons `interactive.icon.gray.subtle`. Hover buttons: `gray.fadedHighlighted` + `gray.normal`.
- Intense: same paper fill; border `interactive.primary.default` (FLAG: no `primary.highlighted` border token); value/icons `interactive.primary.normal` (FLAG: no `primary.subtle` / `primary.disabled` text-icon tokens — disabled uses `gray.disabled`). Hover buttons: `primary.faded` (FLAG: no `primary.fadedHighlighted`).
- Min (default **0**) disables decrement; max disables increment. Empty field commits to min. Step is **1**.
- Loading (`is-loading`): buttons disabled, field `readonly`, `aria-busy`, oscillating ProgressBar at the bottom (neutral fill; intense uses primary). Motion **2xgentle / emphasized**.
- Hover/focus motion **xquick / standard**. Keyboard `:focus-visible` uses `--kn-focus-ring`. Form `.kn-field__control` uses a thin primary ring (same as AutoComplete) — do not merge the two. Step animation **quick / entrance**, offset **spacing.3** (FLAG: source used 30% / `ease-out` / 300ms clear).
- `--left` from 768px: label width **size-120** (large **size-176**), gap **spacing.5**. Label composes `.kn-form-label`.
- a11y: `role="spinbutton"` + `aria-valuemin/max/now`; buttons `aria-label="Decrement value"` / `"Increment value"`; ArrowUp / ArrowDown step. Focus order decrement → field → increment.

Not Counter (non-interactive tally). Not `.kn-field__control` (single text field). Not InputGroup. Not IconButton (step buttons are not `.icon-btn` **32**).

## Modal

```
.kn-modal-root
  .kn-modal__overlay
  .kn-modal.kn-modal--{large|full}[role="dialog"][aria-modal="true"]
    .kn-header / .kn-modal__header
    .kn-modal__body
    .kn-footer / .kn-modal__footer
```

Canonical titled overlay. Default width `min(size-400, 100%)`. Fill `surface.gray.intense` (same overlay paper as Drawer / BottomSheet), radius **large**, elevation **highRaised**. Overlay Header/Footer compose it (not confirm’s close-only row). Centered, not a side panel — do not merge with Drawer.

- `--large`: width `min(size-1024, 100%)`. CreationView `--split` hosts hydrate this when the modal is still the default 400.
- `--full`: width and height **100%** of the overlay (overlay already pads **spacing.5**). FLAG: source full is `100vh` with **8px** inset (`size[8]` / **spacing.3**); no `80vh` / `100vh` tokens — do not invent them. Use `--full` for multi-step create, not for Confirmation.
- `--medium` (source 760) is not in this subset — do not add it.
- Confirmation compose stays `.kn-modal--confirm` (width **size-400**, close-only header, body pad **spacing.6**).
- CreationView hosts get the same open motion as Confirmation (**moderate / entrance**, overlay fade + `translateY(spacing.3)`). Other titled modals stay instant (`[hidden]`). FLAG: no exit motion (unmount). Reduced motion: no enter.
- Body pad **spacing.5**. FLAG vs source CreationView form pad **spacing.4**. Do not retarget every modal body.

Existing: user reporter (`#kn-user-reporter-form`) stays default **size-400** — not CreationView (no preview column). Confirm dialogs are Confirmation.

## CreationView

```
.kn-modal.kn-modal--large|--full  |  .kn-sheet
  .kn-header
  .kn-modal__body / .kn-sheet__body
    .kn-creation[.kn-creation--split][.kn-creation--preview-sheet][.kn-creation--steps]
      .kn-creation__steps            (optional; ProgressBar — not StepGroup)
      .kn-creation__body
        .kn-creation__form.kn-form-group
          .kn-alert.kn-alert--full   (form-level only)
          .kn-field …
        .kn-creation__preview
          .kn-creation__preview-head
            .kn-creation__preview-title
          .kn-creation__preview-body
          .kn-creation__preview-foot
      [data-kn-creation-preview-open]  (small screens + --preview-sheet)
  .kn-footer.kn-footer__actions.kn-btn-group.kn-btn-group--loose
```

Canonical **create** pattern: form + live preview. Not a layout primitive with its own color scale. Host is **Modal `--large`** (desktop split) or **`--full`** (multi-step), and **BottomSheet** on small screens. Overlay Header/Footer stay on the host. `KNCreation.hydrate`.

- `--split` (hydrate adds it when both `__form` and `__preview` exist): two columns from **768px**. Header / Footer / `__steps` span the row. Below `m` the body stacks. FLAG: do not grid Header beside the form — that was the old `--split` on the root.
- Form column composes **FormGroup** (section gap **spacing.7**, fields **spacing.6**). If `__form` is not a FormGroup, the fallback gap is **spacing.6**. Field errors stay Form hint; form-level success/fail is Alert **`--full`** + dismissible. No schema in this pattern.
- Preview column is a nested light well: fill `surface.gray.subtle`, hairline `surface.border.gray.muted`, radius **medium** (`--radius-surface`), pad **spacing.5**, min-height **size-200**. FLAG: source preview canvas was **400 / 600**; no matching height token — 200 is the floor so an empty well does not collapse. Not Card (`staticWhite` + **lowRaised**). Not the zoom Preview primitive (drag, zoom 0.1–8, fullscreen, dotted grid **16 / 1** — FLAG, do not invent).
- `--preview-sheet`: hide the in-body preview below **768px**. `[data-kn-creation-preview-open="#sheet-id"]` maps to `data-kn-sheet-open` and is hidden from `m` up. The second sheet uses `.kn-creation-preview-sheet` so the well shows inside it.
- `--steps`: optional row above the split. Compose ProgressBar. FLAG: StepGroup is not in this system.
- Footer: ButtonGroup **`--loose`** (Cancel tertiary + Create primary). FLAG gap **spacing.3** vs pattern **spacing.5** — same as Confirmation; do not invent a create-only gap. In a sheet, actions stack full-width.
- Motion: overlay owns open/close. CreationView Modal hosts reuse Confirmation enter (**moderate / entrance**). Sheet already **moderate** entrance/exit. No hover/focus on `.kn-creation`. Loading is Button `.is-loading` on the primary (`KNCreation.hydrate` copies `.kn-creation.is-loading`). Reduced motion: no overlay enter. Do not add Fade/Slide on the columns — those helpers exist; do not invent a second curve.
- Light theme: overlay paper is `surface.gray.intense` (host). Preview uses **subtle** so it reads as nested, not a second white card. Do not use `staticWhite` here.

When to use: creating an entity that needs a **live preview** (QR, document, layout). When **not**: admin add-user / add-role stay **Drawer + FormGroup** (no preview). Viewing one existing record is **DetailedView**. Destroy / leave is **Confirmation**. Small form without preview (user reporter) stays a default Modal.

No product flow yet — CSS + hydrate ready. Do not add a sample create screen.

Not CreationView: `#admin-user-form-drawer`, `#admin-drole-form-drawer`, `#kn-user-reporter-form`, `#kn-detail-drawer`.

## DatePicker

Native `<input type="date">` plus a Dropdown/Menu panel. **No calendar grid.** Open/close is `[hidden]` like Menu (no enter motion).

```
.kn-date-picker.kn-date-picker--{single|range}[.kn-date-picker--chip][.kn-date-picker--no-footer]
  button.kn-date-picker__trigger[aria-haspopup="dialog"]
    .kn-date-picker__icon
    .kn-date-picker__value
  .kn-date-picker__panel.kn-dropdown__overlay
    .kn-date-picker__title
    .kn-date-picker__caption
    .kn-date-picker__presets          (ActionList options)
    .kn-date-picker__fields
      .kn-field.kn-date-picker__field
        .kn-form-label
        input[type="date"].kn-field__control.kn-date-picker__input
    .kn-date-picker__error.kn-form-hint--error
    .kn-date-picker__footer.kn-btn-group.kn-btn-group--loose
```

Canonical (`KNDatePicker.hydrate`). Host is Dropdown. Overlay chrome is the **Menu** recipe (`surface.gray.intense`, `border.thin`, radius **medium**, **midRaised**). Panel pad **spacing.6**, gap **spacing.4**, width **size-300**. Viewport gutter **spacing.5**; offset below the trigger **size-8** (same as Dropdown anchored). Hydrate portals the panel to `body`. Open/close is `[hidden]` (same as Dropdown / Menu).

- `selectionType` `--single` | `--range` (dashboard is range). Range fields are **2 columns from 480px**, stacked below. `picker` day | month | year is the native `type="date"` / `month` encoding — do not add a grid calendar.
- Trigger is Button (dashboard secondary/medium) with calendar glyph **size-16**. `--chip` composes FilterChip as the trigger (CSS ready; no live instance). `--no-footer` applies on preset or input change (FilterChip default in the source pattern).
- Presets are ActionList options (`data-kn-date-preset`; `data-dash-preset` is an alias). Selected is `is-selected` / `aria-selected`. Built-in ids: `7`, `30`, `month`, `last-month`, `today`.
- Fields compose **Form** (`kn-field` + `kn-field__control`). Light fill is `surface.gray.intense` — not table-filter `staticWhite`. Hover/focus **xquick / standard** (field recipe). Invalid is `aria-invalid` + `feedback.negative.intense` border. Error is Form hint.
- Footer: Cancel tertiary + Apply primary, ButtonGroup `--loose` (gap **spacing.3**). FLAG vs source footer pad **spacing.6** on `m` and action gap **spacing.5** on small / **spacing.3** on desktop — `--loose` is the system cluster. Dashboard uses **small** buttons (FLAG vs source **medium**).
- Apply commits the draft and fires `kn-date-apply` `{ start, end, label, persist }`. Cancel / Escape / outside click discard the draft. Dashboard `initDashDatePicker` listens and filters widgets.
- Motion: overlay `[hidden]` — no enter/exit (same as Menu). Button / field / ActionList own hover and focus. Reduced motion already zeroes field/button tokens. Do not convert this overlay into a BottomSheet.
- Light theme: panel is overlay paper (`gray.intense`), not popup/staticWhite. Inputs match Form, not `.vis-th-filter`.

Existing: dashboard date filter (`.kn-date-picker--range`). Table column filters that happen to be `type="search"` dates stay `.vis-th-filter`.

Not DatePicker: TimePicker (not in this system). FilterChip without this panel is not a date picker.

## DetailedView

Pattern, not a layout root: a Drawer that shows **one existing record**. Compose Drawer + Header + underline tabs + Body + Footer. No unique size or color scale.

```
.kn-drawer-root.kn-detail-drawer.is-open
  .kn-drawer__overlay
  aside.kn-drawer.kn-detailed-view.kn-detail
    .kn-header.kn-detailed-view__head.kn-detail-head.kn-header--no-divider
    .kn-detailed-view__tabs.kn-detail-tabs[role="tablist"]
      button.kn-tab[role="tab"]
    .kn-drawer__body.kn-detailed-view__body.kn-detail-panel.kn-box.kn-box--column
      .kn-detailed-view__kv.kn-detail-dl          (label/value, 160 + 1fr)
      .kn-collapsible                             (optional timeline)
    .kn-footer.kn-detailed-view__footer.kn-detail-footer
      .kn-footer__actions.kn-btn-group.kn-btn-group--loose
```

Canonical (`KNDetailedView.hydrate`). Host is **Drawer** (open/close and overlay paper live on Drawer — overlay **gentle / entrance** in, **xmoderate / exit** out; panel **xmoderate / entrance** in, **moderate / exit** out; unmount waits **xmoderate**). Hydrate stamps `data-kn-component="detailed-view"`, adds `--no-divider` on the Header when tabs follow (tabs own the hairline), hydrates Header/Footer/Buttons/Badges/DatePicker/Switch, stamps the host Drawer, and binds Arrow/Home/End on the tablist (`.click()` so product tab handlers still run). Close, overlay dismiss, and pager stay on existing JS. Do not rewrite drawer open/close.

- Header is overlay Header. Live shipment uses ID + Badge, not an Amount hero. Optional `__hero` / `__highlights` (thicker vertical Divider + meta) are CSS-ready. Status color wash is opt-in (`.kn-header--positive|notice|negative`) — live shipment omits it.
- Tabs default is the **underline / bordered** strip (`.kn-tab`). Pad **spacing.3 / .4**, min-height **size-48**, thicker primary underline when selected. Hover fill `surface.gray.subtle`. Motion **xquick / standard**. Focus `--kn-focus-ring`. Light fill of the strip is overlay paper (`surface.gray.intense`) — not `staticWhite`. Opt-in: `--filled` (pill on `gray.subtle` track), `--borderless` (no list hairline), `--small` / `--large`, `--vertical` (start-edge bar). Do not convert live vis chips / `.kh-tabs` to filled.
- Body gap **spacing.6** (same as Drawer body pad). Key/value grid is **size-160 + 1fr**, gap **spacing.3**, label `gray.muted`.
- Footer composes overlay Footer (transparent on overlay paper). Actions are ButtonGroup `--loose` (gap **spacing.3**). FLAG vs source action gap **spacing.5** and full-width buttons — `--loose` is the system cluster. Live shipment uses pager + Copy/Next, not Cancel+primary.
- Motion: Drawer open/close. Tab hover/focus as above. Loading is product skeleton (`.is-skeleton`); close stays clickable. Reduced motion zeroes Drawer and tab transitions.
- Light theme: overlay paper `surface.gray.intense`. Nested wells (ribbon, summary) are `surface.gray.subtle`. Ribbon icon plate is `gray.intense` on that well. Do not paint tabs/footer `staticWhite`.

When to use: **one existing record**. Creating with a live preview is **CreationView**. Admin add-user / add-role stay **Drawer + FormGroup**. Destroy / leave is **Confirmation**. Do not host a create+preview split here.

Existing: shipment detail (`#kn-detail-drawer`). The underline tab strip is also used on the ISF record panel (`.kn-detail-tabs`) — same `.kn-tab` recipe; that panel is **not** a Drawer DetailedView.

Not DetailedView: `#admin-user-form-drawer`, `#admin-drole-form-drawer`, hold list, dashboard customize. Journey “Show N more events” stays a product `kn-link` (FLAG vs Collapsible + StepGroup — StepGroup is not in this system).

## Divider

Non-interactive hairline that separates content. Not a resize splitter and not overlay Header/Footer chrome (those reuse the same **thin + muted** tokens as a border on the chrome).

```
hr.kn-divider[.kn-divider--{horizontal|vertical}][.kn-divider--{solid|dashed}][.kn-divider--{muted|subtle|normal}][.kn-divider--{thinner|thin|thick|thicker}]
```

Aliases: `.menu-divider`, `.kn-menu__divider`. Canonical (`KNDivider.hydrate`). Default: **horizontal**, **solid**, **muted**, **thin**. `role="separator"`. Vertical sets `aria-orientation="vertical"`.

- Color is `surface.border.gray.{muted|subtle|normal}` on the light canvas (surface-200 / 300 / 400). Not `staticWhite`, not an on-dark leftover.
- Thickness is `border.width.{thinner|thin|thick|thicker}`. The line is a **border** on one side (`border-bottom` / `border-left`), height/width **0** — do not paint a filled `background` bar.
- Horizontal: `flex-grow: 1`, `width: 100%`. Vertical: `flex-grow: 0`, `align-self: stretch`. No default margin (source has none; `spacing.0` also resets `hr` UA margin). Examples that need inset pass margin on the host (Menu compose, stack gap).
- Motion: none. No hover, focus, open/close, or loading. Reduced motion does not apply.
- Hydrate stamps `data-kn-component="divider"` and `role="separator"`. Skips the Assistant panel resize handle (that `role="separator"` is a splitter, not this primitive).

Menu / vis-menu compose: bleed to the overlay edge (`margin-inline: calc(spacing.3 * -1)`, `margin-block: spacing.1`) and **`flex-grow: 0`** so a horizontal Divider does not eat leftover menu height. FLAG vs source MenuDivider `marginY spacing.3` — the bleed is the overlay recipe, not a second Divider scale.

FilterChip `__divider` composes **vertical + subtle** (not a filled `width: border-thin` bar).

When to use: a standalone rule between sections (card body, menu groups, GenUI `DIVIDER`). When **not**: overlay Header/Footer hairlines, Accordion/Table/Tab strip borders, ButtonGroup joined inner hairlines, Assistant resize.

Existing: profile `#profile-menu` (`<hr class="kn-menu__divider kn-divider">`), Visibility overflow/more menus (`.menu-divider.kn-divider`), GenUI `DIVIDER` node. FilterChip `__divider` is CSS-ready (no live chip). DetailedView `__highlight` is CSS-ready vertical + thicker.

## Drawer

```
.kn-drawer-root.is-open[.kn-drawer-root--no-overlay]
  .kn-drawer__overlay
  aside.kn-drawer[role="dialog"][aria-modal="true"]
    .kn-header.kn-drawer__header[.kn-drawer__header--{color}][.kn-drawer__header--no-divider]
    .kn-drawer__body.kn-box.kn-box--column[.kn-drawer__body--flush]
    .kn-footer.kn-drawer__footer[.kn-drawer__footer--no-divider]
```

Canonical right-side overlay. `KNDrawer.hydrate` stamps `data-kn-component="drawer"`, `role="dialog"` / `aria-modal="true"` on the panel, overlay `tabindex="-1"`, then hydrates Header / Footer / Box / Button / Divider. **Do not bind open/close, Escape, or overlay dismiss here** — those stay on existing product handlers (`initDashboardLayout`, `initHoldDrawer`, `shipment-detail.js`, admin modules).

**Tokens (light canvas)**

- Fill: `surface.background.gray.intense` (same overlay paper as BottomSheet / titled Modal). Not `interactive.staticWhite`. FLAG: no `popup.background.*` tokens in this theme — do not invent one.
- Elevation **highRaised**. Overlay scrim `overlay.background.subtle`.
- Width `--kn-layout-drawer-width` = **size-800**. From **768px** (`m`): inset **spacing.7**, radius **large**, width `min(size-800, 100vw - spacing.8)`. Mobile is edge-to-edge (no radius).
- Body composes **Box**. Padding is product **spacing.6** (not a Box default). `--flush` is **spacing.0**. `overscroll-behavior: contain`. Sheet bodies use **spacing.5** — overlay padding, not a Box token gap.
- Footer is flex-shrink 0 on the column (equivalent to sticky when the body scrolls). Hairline is overlay Footer.
- z-index **overlay + 1** (1001). Overlay/panel `z-index: 0` / `1` are local stacking-context values, not theme layers. DetailedView host uses **overlay + 2**.
- Header is overlay Header, default **large**, no wash. `--xlarge` and `--information` (and other washes) exist and stay opt-in. Product leading plate `.kn-drawer__header-icon` is **40** on `surface.sea.subtle`. Close is IconButton **32** / glyph **16**.

**Motion**

| Surface | Open | Close |
| --- | --- | --- |
| Overlay opacity | **gentle / entrance** | **xmoderate / exit** |
| Panel opacity + `translateX(100% → 0)` | **xmoderate / entrance** | **moderate / exit** |

Unmount wait is **xmoderate** (`KNDrawer.closeMs`) so the overlay fade finishes; panel transform is already done at **moderate**. Reduced motion zeroes transitions and the wait. Hover/focus live on IconButton / Button inside, not on the panel. No loading motion on the primitive (DetailedView skeleton is product).

**Behavior**

- Open: `hidden = false`, then `.is-open` on the next frame. Close: drop `.is-open`, wait `closeMs`, then `hidden = true` and restore focus.
- Overlay click and Escape stay on product JS. `showOverlay` false → `--no-overlay` (also skips outside click when the product handler checks that).
- Single drawer only. Admin swaps one root; do not invent a 2-drawer peek stack.
- `isLazy` / `onUnmount` are React-era names. KN keeps the tree in the DOM and uses `[hidden]` after the exit wait.

When to use: extra context from the **right** (customize, hold list, one record, admin form). When **not**: BottomSheet (mobile from the bottom; do not convert these drawers), titled Modal (centered), CreationView (create + preview), Menu/Dropdown (anchored overlay). Admin add-user / add-role stay **Drawer + FormGroup**.

Existing: `#dash-layout-drawer`, `#hold-list-drawer`, `#kn-detail-drawer` (DetailedView), `#admin-review-drawer`, `#admin-profile-drawer`, `#admin-user-form-drawer`, `#admin-drole-form-drawer`, `#admin-role-form-drawer`.

FLAG: live width **800** vs source **375 / 420**; mobile **100%** vs source **90%**; Header **large** vs source **xlarge**; wash unused vs source default information; no stack/peek (**16** mobile / **24** desktop in source); hold list has close/Escape but **no open trigger** (dashboard hold card goes to Visibility); admin drawers mount already `.is-open` (no enter animation) and unmount without an exit wait; hold drawer has no focus trap (dashboard customize does); overlay click-through on shipment detail is product, not the primitive.

## Dropdown

```
.kn-dropdown.kn-dropdown--{single|multiple}[.kn-dropdown--end]
  trigger (Button, Select, Chip, AutoComplete, IconButton)
  .kn-dropdown__overlay[.dropdown-overlay|.vis-menu__list]
    .kn-dropdown__header   (optional; not overlay Header)
    .kn-action-list | options
    .kn-dropdown__footer   (optional)
```

Canonical **wrapper**. It does not paint the overlay — chrome is the **Menu overlay** recipe (`surface.gray.intense`, `border.thin`, radius **medium**, **midRaised**). Nested ActionList is **flush** (no second paper). `KNDropdown.hydrate` stamps `--single` (default) or `--multiple` (`kn-select--multi` / `aria-multiselectable`), `aria-expanded` when missing, Header/Footer aliases, then hydrates Menu / Button / Divider. **Do not bind open/close, Escape, or outside click here** — those stay on Visibility, quick actions, DatePicker, and admin select.

**Placement**

- Anchored (`.vis-menu` / `.kn-select`): wrapper is `inline-flex` column (shrink-wraps to the trigger; `kn-select` still `width: 100%`). Overlay `position: absolute`, offset **size-8** below the trigger, `min-width: max(100%, size-240)`, `max-width: size-300`. `--end` aligns to the trigger’s end.
- Portaled (quick actions `.dropdown-overlay`, DatePicker panel): `position: fixed`, placed in JS. Quick actions uses **size-300** (centered fallback **size-360**). DatePicker panel pad **spacing.6**, width **size-300**.

**Motion**

Open/close is `[hidden]` — same as Menu (`display: none` cannot fade). Item hover/selected follow ActionList (**2xquick / standard**, `--kn-focus-ring` on `.is-active`). Select chevron **180deg** is **xquick / standard**. Reduced motion zeroes that rotate. Do not add overlay enter `duration.quick` + `translateY(-size-8)` while `[hidden]` is the system close.

**When to use:** a trigger that opens a list or panel **anchored to itself** (filters, select, ⌘K, date). **When not:** TopNav profile is **Menu**. Drawer / Modal / BottomSheet are page overlays. AutoComplete is the type-to-filter **field** (quick-actions header composes it). FilterChip is the chip trigger recipe — DatePicker `--chip` is CSS-ready, not live; admin applied chips are dismiss-only, not a Dropdown.

Existing: `.vis-menu` (Visibility MOT/view/sort/direction/overflow/more, pagination size, admin more/select), `.quick-actions` (⌘K), DatePicker range on the dashboard. No live ButtonGroup split-button.

FLAG: no popup fill / blur (Menu paper on light). Overlay z **overlay 1000** (not 1001); open toolbar stacking is local **z-index: 2**. Menu-type max **300** vs **400**. Select overlay **overlay+3**; compact table **z-index: 8**. Quick-actions header includes a close control (IconButton **32** / glyph **16**). Centered fallback `top: 20vh` has no viewport token. vis-menu chevrons do not rotate on expand (sort icon is not a chevron). Listbox arrow keys are product focus-on-open, not a full listbox widget. `kn-select` still uses `display: none` plus `[hidden]`. Do not convert Dropdown to a BottomSheet on small screens.

## Elevate

```
.kn-elevate.kn-elevate--{low|mid|high}[.kn-elevate--hover][.is-highlighted]
```

Canonical lift helper. Maps to `--kn-elevation-lowRaised` | `midRaised` | `highRaised`. Idle is **`elevation.none`** (`--theme-elevation-none` / `--kn-elevation-none`). Hover (`--hover` / `:hover` + `:focus-within`) or controlled `.is-highlighted` lifts to **lowRaised** by default. `--mid` / `--high` are optional extra lifts (default recipe is lowRaised only). Duration **moderate** / **standard**. `prefers-reduced-motion` zeroes the transition.

Compose on **Box** when a lift is needed — Box has no default elevation. **Do not wrap Card** (Card idle is already lowRaised; this helper would flatten it at rest). **Do not wrap FAB** (wrapper already has idle **midRaised**; Elevate idles at **none** and would drop the shadow). AppBar `is-scrolled` is product lift (**quick** / **standard**), not this helper. Scale `--hover` uses `:focus-visible` on the node itself; Elevate uses `:focus-within` so inner controls count.

CSS helper only — no hydrate, no press trigger, no in/out type skip (transition always runs both ways). No live HTML instance today.

## EmptyState

```
.kn-empty.kn-empty--{small|medium|large|xlarge|page}
  .kn-empty__asset
  .kn-empty__copy
    .kn-empty__title
    .kn-empty__desc
  .kn-empty__actions
```

Canonical missing-content placeholder. Not Alert, not FileUpload dropzone, not ActionList overlay empty.

| Size | Asset max | Section gap | Title | Description |
| --- | --- | --- | --- | --- |
| small | 60 | spacing.5 | heading-sm | body-xs |
| medium | 90 | spacing.6 | heading-sm | body-sm |
| large | 120 | spacing.7 | heading-md | body-md |
| xlarge | 160 | spacing.8 | heading-xl | body-lg |
| *(default, no size)* | 56 | spacing.5 | markup `type-*` | markup `type-*` |
| `--page` | 56 | spacing.5 | markup `type-heading-h3` | body-sm |

- Title `surface.text.gray.normal` **semibold** (light — not subtle). Description `surface.text.gray.muted`. Inner copy gap **spacing.1**. Root `max-width` **size-400**.
- Icon assets sit on a round `surface.gray.subtle` plate (product). Illustrations skip the plate. Asset is optional — Visibility / admin table empties omit it.
- No hover / open / loading motion. Actions compose **Button** (xquick / standard, `--kn-focus-ring`). `[hidden]` unmounts.
- `--page` is the full-page workspace placeholder (`#empty-page`) — **not** aliased to `--large` (large asset is 120).
- `KNEmpty.hydrate` stamps `data-kn-component="empty"`, moves loose buttons into `__actions`, hydrates nested Buttons. Does not invent copy or assets.

Existing: `#empty-page`, Visibility no-match, map empty, admin role/user/transaction empty (`KNAdminUX.emptyState`), shipment docs/refs/container empty.

FLAG: live titles are **h5 / size-100**, not heading-sm. Actions gap **spacing.4** vs ButtonGroup `--loose` **spacing.3**. Map overlay z **500** and `staticWhite` fill are product. Do not force assets onto Visibility/admin empties.

## Fade

Canonical opacity helper. No animation library. No fill, radius, type, or translate.

```
.kn-fade.kn-fade--{in|out|inout}[data-visible][.is-hidden]
```

- Duration **xquick**. Enter easing **entrance**; exit easing **exit** (opacity transition on hide). Bare `.kn-fade` is **inout** (same as `--inout`).
- `--in` skips the hide tween (`transition: none` + opacity 0). `--out` skips mount (instant opacity 1).
- Delay via `--kn-motion-delay` (a **delay.*** token). `--kn-fade-delay` still overrides. There is no `delay.0` — omit for 0. Do not set `0ms`.
- `[hidden]` unmounts. `data-motion-trigger="in-view"` waits for `KNMotion.hydrate` (`.is-in-view`). Initially hidden (`[data-visible="false"]` / `.is-hidden`) starts at opacity 0 — no exit flash.
- CSS helper only. Default trigger is **mount**. No hover/focus/press. `prefers-reduced-motion` zeroes the helper (tokens already 0; Fade also sets `animation/transition: none` without forcing visible).
- Product `@keyframes kn-fade-in` in `styles.css` stays (**gentle** + `spacing.3`). Dashboard `#dash-live`, Visibility list shell, and map pills use that keyframe — **not** this helper. Move is opacity + `translateY(spacing.5)` at **xmoderate** / **quick**. Alert dismiss is **2xquick** / **standard**. ChatMessage enter is **moderate** / **entrance**. Do not merge any of those into Fade.

No live HTML instance of `.kn-fade` today.

FLAG: one delay channel (enter). Exit has no separate delay. No hover/focus/press. in-view threshold **0.8** is not a token (owned by `KNMotion`).

## Morph

```
.kn-morph
```

Transitions `border-radius` and `background-color` at **moderate** / **standard**. FLAG: shared-id layout morph is not implemented (would need an animation library). Use this only for color/radius tween on one node.

## Scale

```
.kn-scale[.kn-scale--down][.kn-scale--hover][.is-highlighted]
```

Default is scale-up **1.05**. `--down` is **0.98**. Duration **moderate** / **standard**. Trigger is opt-in `--hover` or `.is-highlighted` (same as Elevate). FLAG: 1.05 / 0.98 are not tokens.

## Slide

```
.kn-slide.kn-slide--{top|bottom|left|right}[data-motion-trigger][data-visible][.is-hidden][.is-in-view]
```

Viewport travel, not Move (Move is `spacing.5` inside the view). Default **bottom**. Vertical: enter **2xgentle** / **emphasized**, exit **xgentle**. Horizontal: enter **xmoderate** / **entrance**, exit **moderate** / **exit**. FLAG: offset is `100vh` / `100vw` — no size token.

## Stagger

```
.kn-stagger
  > *
```

Children animate one after another. Interval is **delay 2xquick** (same name as duration 2xquick). First child has no delay (no `delay.0` token). Cap at 7 steps (`n + 8` stays on the 7th). Live: `#dash-live.kn-stagger` — child animation is product `kn-fade-in` (gentle + spacing.3), interval is this primitive. Do not swap those children to `.kn-fade` (**xquick**, opacity only).

## FileUpload

Canonical file picker. Primitive chrome lives in `components.css`. `KNFileUpload.hydrate`.

```
.kn-file-upload.kn-file-upload--{medium|large|variable}[data-upload-type="single|multiple"][.is-disabled][.is-active]
  .kn-form-label
  .kn-file-upload__dropzone / .isf-add-doc__dropzone
    .kn-file-upload__icon
    .kn-file-upload__copy
    a|button.kn-file-upload__link.kn-link    (“Upload”)
    input.kn-file-upload__input.visually-hidden[type="file"]
  .kn-form-hint | .kn-form-hint--error
  .kn-file-upload__items
    .kn-file-upload__item[data-status="uploading|success|error"]
      .kn-file-upload__item-body (icon + name + meta)
      .kn-file-upload__item-actions (preview | retry | remove — IconButton)
      .kn-file-upload__progress
        .kn-file-upload__progress-fill    (--kn-file-upload-progress)
```

| Size | Dropzone min-height |
| --- | --- |
| medium (default) | 56 |
| large | 64 |
| variable | 64+; custom copy via `__copy` / `__link` |

Canonical behavior:

- Dropzone: dashed `interactive.border.gray.default`, radius **medium**, transparent rest, type `gray.subtle`. Hover fill `interactive.gray.default`. Drag-over `.is-active` = `primary.faded`. Disabled: gray.disabled, no hover fill.
- Motion **2xquick / standard** on dropzone fill, item fill/border, progress width. Focus `--kn-focus-ring` (`:focus-visible` / `:focus-within`). Reduced-motion: `transition: none`.
- Icon **20** + `interactive.icon.primary.normal` (not a text-color leftover). `__link` composes Link (underline on hover, same duration).
- Hidden input composes `.visually-hidden`. Do not add a second clip recipe on `__input`.
- Single + one item: dropzone `[hidden]` (CSS `:has` also hides). Multiple keeps the dropzone.
- `--left` label from **768px** (same row as Form). Label + hint compose `.kn-form-label` / `.kn-form-hint`. `--large` uses Form large gap **spacing.3**.
- Item: `surface.gray.intense`, thin `gray.subtle` border, radius **medium**. Error: `interactive.negative.faded` + `feedback.border.negative.subtle`; meta `feedback.text.negative.intense`. Actions are IconButton **32**.
- Progress is a FileUpload-owned hairline (**size-4**, radius **xsmall**, primary fill). Do not compose `.kn-progress` here — that primitive has `min-width: size-200`. Width via `--kn-file-upload-progress`. Shown only when `data-status="uploading"`.
- `KNFileUpload.hydrate`: stamps `data-kn-component="file-upload"`, ensures the dropzone slot (moves a leftover `.isf-add-doc__dropzone` off the root), wraps a loose SVG in `__icon`, adds a hidden input unless the host is inert/disabled, drag `.is-active`, Enter/Space on an inert button-shaped dropzone. Does **not** upload or invent a progress simulation. Nested IconButtons / Links hydrate too. Compact `.kn-file-upload__action` is skipped (ChatInput owns it).

Existing: ISF Add Document (`.isf-add-doc__dropzone` on the **dropzone**, variable size, `data-isf-detail-inert` — click toasts, no file picker). Composer attach is ChatInput (`button.kn-link.kn-chat-input__attach`): Link button / small / neutral, not this dropzone. Sidebar ChatInput is **hideFileUpload**. Do not replace the dropzone with EmptyState.

FLAG: no kn alias for `interactive.icon.primary.subtle` / `interactive.text.primary.subtle` — keep **normal** on light. No `interactive.border.negative.faded` or `negative.fadedHighlighted` kn aliases — error hover stays on faded. Item shadow `0 0.5px 4px` has no elevation token (same leftover as ChatMessage self) — omitted. Dropzone inner gap source 6px → **spacing.2**. Progress fallback `0%` is a CSS width, not a token. ISF modal extra padding **spacing.6** vs primitive **spacing.3**. Sample does not upload.

## FilterChip

Canonical filter trigger. Primitive chrome lives in `components.css`. `KNFilterChip.hydrate`. Distinct from Chip (toggle) and Tag (select-value dismiss).

```
.kn-filter-chip-group / .admin-applied
  .kn-filter-chip[.is-selected][.has-clear][data-selection="single|multiple"]
    button|span.kn-filter-chip__trigger
      .kn-filter-chip__label
      .kn-filter-chip__value | .kn-counter
      .kn-filter-chip__chevron
    .kn-filter-chip__divider
    button.kn-filter-chip__clear
  a.kn-filter-chip-group__clear.kn-link | a.kn-filter-chip-group__reset.kn-link
```

| State | Border | Paper |
| --- | --- | --- |
| rest | dashed `interactive.gray.faded` | `surface.gray.intense` |
| selected | solid (same token) | same paper — not vis-chip `gray.highlighted` |
| disabled | `interactive.gray.disabled` | same paper |

Canonical behavior:

- Height **28**, radius **small**. Trigger pad **spacing.4** start / **spacing.3** end ( **spacing.2** end when `.has-clear`). Gap **spacing.2**.
- Hover `interactive.gray.faded` on **trigger and clear** for overlay FilterChip (not the whole chip fill). Dismiss-only applied chips hover the **whole pill**. Motion **xquick / standard**. Focus `--kn-focus-ring`. Reduced-motion: `transition: none`.
- Label `interactive.text.gray.subtle` **medium**; selected appends `:` (`::after`). Value `interactive.text.gray.normal` **medium**. Chevron **12** `interactive.icon.gray.muted` — **static** (not Collapsible −180deg).
- `__divider` composes Divider **vertical + subtle** (border-left, width **0**). Disabled divider is **muted**.
- Clear is a compact chip-end control (not IconButton **32**). Glyph **12**. `aria-label="Clear {label}"`. `showClearButton` false omits `__clear` / `.has-clear`.
- Multiple: one value shows the name; two or more collapse to Counter (`.kn-counter`, `--wide` when count > 9). Nested Counter margin is 0.
- Overlay is Dropdown / Menu / ActionList. Open/close is `[hidden]` on the overlay — FilterChip has no enter motion and does not rotate the chevron.
- Group Clear empties every chip (parent JS). Reset restores defaults (parent JS). Both compose Link. Hide the action when nothing is selected (parent).
- `KNFilterChip.hydrate`: stamps `data-kn-component="filter-chip"` / `filter-chip-group`, `.is-selected` / `.has-clear` / `data-selection`, nested Counter + Divider, `type="button"`, replaces a leftover `×` glyph with the close SVG. Does not bind open/close or invent filter values. Skips `.vis-chip`. Compact `.admin-applied__chip` is a **button** host (dismiss-only); `__trigger` and `__clear` stay spans so the pill is one control.

Existing: admin applied filters (`.admin-applied__chip`) — selected + clear, no chevron, no overlay. Visibility / admin quick filters stay Chip (`.vis-chip`). DatePicker `--chip` uses this trigger (CSS ready; dashboard stays a Button). Do not restyle `.vis-chip` into this. Do not merge with Tag (`.kn-tag`).

**Decision (final):** dismiss-only applied chips dismiss from a click **anywhere** on the pill (`data-admin-filter-dismiss` on the host button). There is no overlay to open, so the trigger has no other job. FilterChip **with** an overlay still splits trigger (open) vs clear (dismiss) — do not make those whole-pill dismiss.

FLAG: group padding source **spacing.4 / spacing.1** omitted on the live toolbar cluster (gap **spacing.3** matches). Clear pad source 6px (`spacing.2 + spacing.1`) → **spacing.3**. Group Link is **primary** (no kn alias for a neutral Link). Focus `outlineOffset spacing.1` unused — `--kn-focus-ring` already matches Chip. Caption-sm **12** on applied chips. No live Dropdown FilterChip or DatePicker `--chip` instance.

## FloatingActionButton

```
.kn-fab.kn-fab--{bottom-end|bottom-start|bottom}.kn-fab--{primary|white|neutral}[.kn-fab--icon][.is-loading][.is-disabled]
  button.kn-fab__button.kn-btn.kn-btn--large.kn-btn--primary[.kn-btn--white][.kn-btn--icon][.is-loading]
    .kn-fab__icon.kn-btn__icon
    .kn-fab__label.kn-btn__label
    .kn-spinner
```

Canonical viewport-anchored action. Not a Button replacement and not IconButton. One size: **large 48**. Icon required. Omit the label → `--icon` is a **48×48** circle. Pair icon-only with Tooltip.

- Wrapper is `position: fixed`. Default placement **bottom-end**. `--bottom-start` / `--bottom` (centered). Offset `--kn-fab-offset` (default **spacing.5**). Elevation **midRaised** on the wrapper — do not put it on the button and do not wrap in Elevate.
- z-index **99** (`--kn-fab-zindex`). FLAG: no theme z-index between base **0** and sticky **100**. Sits above page content, below BottomNav **100** and overlay **1000**.
- When `.kn-bottom-nav` is present, `--bottom*` uses `bottomnav-height + --kn-fab-offset`. KN product decision (auto-offset). FLAG: no `env(safe-area-inset-bottom)` token.
- Composes Button **large primary**: radius overridden to **max**; icon overridden to **24** (`size-24`). Type **body-lg medium**. Gap **spacing.2**. Hairline none on the FAB slot (Button’s `border.thin` is the same as fill when composed). Unlabeled (no `__label`) is a **48** circle even before hydrate stamps `--icon`.
- Colors: default **primary** (`interactive.primary.default` / `onPrimary.normal`). Hover/focus `--kn-color-background-interactive-primary-highlighted` (alias added — same as Button). `--white` is `staticWhite` + `surface.gray.normal` text; hover `staticWhite.highlighted`. On the light canvas this is a white pill + midRaised, not an on-dark leftover. `--neutral` uses `feedback.neutral.intense` + `staticWhite` type (FLAG: no `interactive.background.neutral.*` / `onNeutral` kn aliases — real gap, see interactive-color state-step proposal in `docs/internal/klearnow-token-system.md`). Charcoal on paper is a contrast fill, not a dark-surface wash.
- Disabled is per-token, not `opacity-500`. Primary → `primary.disabled`. White → `--kn-color-background-interactive-staticWhite-disabled` (alias added). Neutral keeps the charcoal fill and mutes type with `--kn-color-text-surface-staticWhite-disabled` (alias added, but this is still a workaround — FLAG: no real `onNeutral.disabled` token; see the interactive-color-state proposal in `docs/internal/klearnow-token-system.md`).
- Loading: `.is-loading` + child `.kn-spinner` (same as Button). Hides label/icon. Spinner: primary inherits `onPrimary`; `--white` uses `icon.gray.muted` (white-on-white is invisible); `--neutral` uses `staticWhite`. Spinner motion stays on `.kn-spinner` (**2xgentle / overshoot**).
- Hover/focus motion **xquick / standard** + `--kn-focus-ring`. Reduced-motion: `transition: none`. No entry/exit. No speed-dial. No collapse-on-scroll. No press scale.
- `KNFab.hydrate` (`KNFloatingActionButton`): stamps `data-kn-component="fab"`, default `--bottom-end` + `--primary`, `--icon` when there is no label, `kn-btn kn-btn--large kn-btn--primary` on the inner control, wraps a bare SVG in `__icon`, `type="button"`, `aria-label` on icon-only from `data-tooltip` / `title`, `aria-busy` when loading, nested `KNButton.hydrate`. Does not invent a spinner or a live product instance. Skips `#ai-assistant-trigger` / `.ai-assistant-trigger`.

No product instance — CSS + hydrate only. Do not convert TopNav Klear Assistant into this.

FLAG: no size/variant scale; no `interactive.neutral` tokens; centering `--bottom` uses `translateX(-50%)` (layout, not a motion token). Icon is now **16** to match Button large (no product reason found for the prior 24px override).

## Form

```
.kn-field.kn-field--{xsmall|small|medium|large}[.kn-field--left][.is-invalid][.is-disabled]
  .kn-form-label
    text + .kn-form-necessity[--optional] + .kn-form-label__suffix + .kn-form-label__trailing
      .kn-form-counter
  .kn-field__control
  .kn-form-hint[--error|--success]
    .kn-form-hint__icon
```

Canonical field chrome (label + necessity + hint + control). Not a schema/validation library. ChatInput’s textarea is not a Form field — do not compose `.kn-field` onto the composer. AutoComplete / search is its own field; it shares this Input-family recipe.

- Wrapper `.kn-field` (alias `.kn-detail-field`): column, gap **spacing.2** (large **spacing.3**). Width 100%.
- Label `top` (default) or `--left` from **768px**. Top type is **body-sm (12) / medium**. Color `surface.gray.subtle`; xsmall/small **muted**. Left medium is **body-md**; left large is **body-lg**. Max-height **size-36**. Weight **medium**.
- Left width **size-120** (xsmall/small margin-right **spacing.3**, medium **spacing.4**). Large width **size-176** + margin-right **spacing.5**.
- Necessity: `required` → `*` (`.kn-form-necessity` / `.role-req`, `feedback.negative.intense`); `optional` → `(optional)` (caption-sm muted); `none` omits it.
- Hint is help (`surface.gray.muted` caption-sm) until error or success. Error: `feedback.text.negative.intense` + Info icon **12** (large **16**). Success: `feedback.positive.intense` + check icon. Icon offset **spacing.1**. Help has no icon. `[hidden]` beats `display: flex` on the hint.
- Control is Input-family on the **light** canvas: fill `surface.gray.intense` (not staticWhite), border `interactive.gray.default`, hover `highlighted`, focus **primary** + `border.thin` ring (**xquick / standard**). Do not use `--kn-focus-ring`. Disabled: `gray.moderate` + `gray.disabled`. Invalid: `feedback.border.negative.intense` (FLAG: no `interactive.border.negative.default`). Success is hint-only — control border stays gray (same as AutoComplete). Medium **36** / radius **input (xsmall)**; `--large` **40** / radius **medium**. Textarea / `.kn-detail-textarea` min-height **size-120**. Placeholder muted.
- Character counter is `.kn-form-counter` in `__trailing` (`n/max`, caption muted). `KNForm.hydrate` updates it from `maxlength`; does not invent the slot.
- `KNForm.hydrate` (`KNFormGroup` is the same API for groups): stamps `data-kn-component="field"` / `form-group`, `.kn-form-label` / `.kn-form-necessity` / `.kn-form-hint`, `id`/`for`, `aria-invalid`, `aria-describedby`, hint icons on error/success. Does **not** validate or submit. Skips ChatInput, TopNav, `.kn-phone`. FileUpload / CounterInput labels are stamped only (those primitives own the control).
- Quantity steppers are CounterInput — do not put plus/minus on `.kn-field__control`. DatePicker range/start-end fields compose this (not `.vis-th-filter`). Checkbox / Radio **groups** use this label; the control is Checkbox/Radio.

Existing: `.kn-field` in admin user/role drawers, ISF, shipment refs, dashboard DatePicker.

FLAG: large hints stay caption-sm (12px); caption-md is now **14**. required `*` gap is **spacing.2** (source 0); no `env(safe-area)`; product `.role-form .kn-field` gap **spacing.3** overlay kept; `.kn-ref-search` still uses `staticWhite` (same white as intense on this canvas). `.kn-phone` is Input-family `gray.intense`.

## FormGroup

Pattern, not a validation library. Compose heading, optional Alert, fields, and actions. Field errors stay Form hint; form-level uses Alert **`--full`**.

```
form.kn-form-group
  .kn-form-group__header
  .kn-alert                    (form-level only)
  .kn-form-group__section
    .kn-form-group__fields
      .kn-field …
  .kn-form-group__actions      (ButtonGroup --loose)
```

- Group gap **spacing.7**. Header gap **spacing.2**. Section/fields gap **spacing.6**. Actions gap **spacing.3** (ButtonGroup `--loose`). `KNForm.hydrate` stamps `data-kn-component="form-group"` on `.kn-form-group` / `form.user-form` / `form.role-form` and hydrates nested fields. No schema.
- Product aliases `.user-form` / `.role-form` / `.user-form-section` / `.user-form-grid` / `.role-form-zone` stay in product CSS (drawer padding, 2-col grid, zone hairlines). Do not force those onto the primitive column stack.
- CreationView `__form` composes this. Admin add-user / add-role stay Drawer FormGroup — they have no preview column; do not convert them into `.kn-creation`.
- Entry Summary Filing's field grid (`.entry-field-grid`, `transaction-us-entry-filing.js`) composes `.kn-field` / `.kn-form-label` / `.kn-field__control` per-field (2026-09-02 finalization pass) — a fourth live consumer alongside role/user/default-role. It layers a six-state AI-review flag/popover on top of the standard control (no canonical equivalent; new UI, kept product-scoped as `.entry-field-flag*`) and adds one narrow override — extra `padding-right` on the control so the flag doesn't sit over typed text — rather than a parallel field recipe. `locked` / `error` states map onto the shell's own `.is-disabled` / `.is-invalid`, not hand-rolled styling. Grid gap matches `.user-form-grid` / `.role-access-readonly` (`spacing.6` / `spacing.8`), not a bespoke value.

FLAG: pattern example inner field gap **spacing.4** vs live grid **spacing.6 / 8**; section padding is product.

## PhoneNumberInput

```
.kn-phone[.kn-phone--large][.kn-phone--no-country][.kn-phone--no-dial][.is-disabled][.is-invalid]
  .kn-phone__country          (composes .kn-select)
  .kn-phone__dial             (optional leading dial text)
  input.kn-phone__input
  button.kn-phone__clear
```

International phone field. Primitive chrome lives in `components.css`. `KNPhone.hydrate`. Distinct from Form (generic text) and AutoComplete / SearchInput.

- Input-family on the **light** canvas: fill `surface.gray.intense` (not staticWhite), border `interactive.gray.default`, hover `highlighted`, focus **primary** + `border.thin` ring (**xquick / standard**). Medium **36** / radius **input**. `--large` **40** / **medium**.
- Country selector composes Dropdown / `.kn-select`. `--no-country` hides it. `--no-dial` hides `__dial`. Live country trigger labels already include the dial code (`United States (+1)`); `__dial` is opt-in leading text, not a second formatter.
- Clear is a compact field-end control (not IconButton **32**) with `aria-label="Clear Input Content"`. Hydrate inserts it and hides it when the value is empty. Does **not** live-format as the user types (placeholder may show a sample).
- Label / hint / left position stay on the wrapping `.kn-field`. `KNForm.hydrate` skips `.kn-phone`. Default accessibility copy is **Enter phone number** when no label is wired.
- `KNPhone.hydrate` stamps `data-kn-component="phone"`, `__country` / `__input`, `aria-labelledby` from the field label, disabled/invalid from the field, and the clear control.

Existing: admin add-user drawer (`#kn-user-phone`). Product overlay keeps the country column at **size-120** and the menu z-index inside the drawer.

FLAG: no flag assets; no i18n phone parser; country list is product data; no `--left` on the phone root (use Form `--left`).

## ProgressBar

```
.progress-bar[.is-indeterminate]
  .progress-bar__meta
  .progress-bar__track
    .progress-bar__fill
.kn-progress[.is-indeterminate]
  .kn-progress__track
    .kn-progress__fill
```

Linear meter. Track radius **xsmall**. Dashboard health `.progress-bar` track is **size-4** + `feedback.positive.intense` fill. Shipment `.kn-progress` track is **size-2** + `interactive.primary.default` fill.

`.is-indeterminate` runs **2xgentle / emphasized**. FLAG: fill width **5%** and travel **-8% → 103%** with **scaleX(5)** have no tokens — do not invent replacements. CounterInput loading uses the oscillating variant of this recipe (neutral fill; intense uses primary) with a transparent track.

FileUpload’s item bar is **not** this primitive (hairline **size-4** on the item, `--kn-file-upload-progress`). Do not compose `.kn-progress` there (`min-width: size-200` would blow the row).

Not Charts.

## Tag

Dismissible keyword pill. Not Badge (metadata, no dismiss), not Chip (selection), and not FilterChip (filter trigger — admin applied filters are FilterChip, not this).

```
.kn-tag.kn-tag--{xsmall|small|medium|large}[.is-disabled][.is-focused]
  .kn-tag__icon
  .kn-tag__label
  button.kn-tag__dismiss
```

Canonical primitive. `KNTag.hydrate`. Product multi-select values compose this as `.kn-select__chip` (aliases `__label` / `__dismiss` on `__chip-label` / `__chip-remove`).

- Fill `interactive.background.gray.default`. Disabled `gray.disabled`. Text `interactive.text.gray.subtle`. Icon `interactive.icon.gray.muted`. Radius **max**. Type caption-sm / body-sm (**12**). Default size **medium**.
- Sizes: **xsmall / small** tighter pad; **medium** pad `spacing.1 / 2 / 1 / 3`; **large** `spacing.2 / 3 / 2 / 4`. Icon **12** (large **16**).
- Dismiss is required. Compact chip-end control (not IconButton **32**); glyph **12**. `aria-label` is `Close {label} tag`. Hover fill `gray.highlighted` (**xquick / standard**). Focus `--kn-focus-ring`. `.is-focused` is virtual keyboard focus inside a select (1px outline + **size-4** primary faded ring).
- `KNTag.hydrate` stamps `data-kn-component="tag"`, default `--medium`, strips leftover Badge classes, wraps `__label`, replaces a leftover `×` glyph. Does not bind dismiss — parent JS owns removal.
- Do not put Badge or Chip classes on a Tag.

Existing: admin multi-select values (user roles, default-role services). Product keep: `.kn-select__chip` `height: auto` / `min-height: size-20` so the dismiss is not clipped; `.is-ai-suggested` is an Assistant overlay.

FLAG: xsmall/small are API sizes; source padding only distinguishes medium vs large. No 20px IconButton dismiss.

## Schema UI

Schema UI renders structured assistant answers from a JSON schema instead of markdown-only text. Product class prefix is `.kn-genui`. Public API is `window.KNGenUI`.

```
.kn-genui
  .kn-genui__item[.kn-genui__item--h3|--after-h3-block|--after-text-block|--after-block-action]
    TEXT | AMOUNT | BADGE | INDICATOR | DATE | LINK | BUTTON | ALERT | SPACER | DIVIDER
    INFO_GROUP | CHART | STACK | GRID | CARD | TABLE
```

CARD and TABLE wrap in `.kn-genui__ring` (traveling ring + mask reveal + shade). This is sanctioned GenUI streaming chrome (Thinking corner brackets), distinct from ChatMessage pulse skeleton — do not restyle it to match Table/chart loaders. Reduced motion and `animate: false` use `.kn-genui__ring--static` (no ring).

### Mount

```js
window.KNGenUI.mount(hostEl, { components: [...] }, { animate: true });
```

`html(schema, opts)` returns the same markup as a string.

### Emit from an answer

Return this shape from `KNAssistant.answer` (or any broker that calls `presentResult` / `resultBodyHtml`):

```js
{
  mode: "schema",
  title: "Today's Statements",
  thinking: ["…"],
  leadIn: "",
  schema: { components: [/* see types below */] },
  followUps: [{ label: "All items due today", prompt: "All items due today" }]
}
```

Klear Assistant (`presentResult`) and the agentic thread both mount into `[data-kn-genui]`.

### Component types

| Type | Fields |
| --- | --- |
| `TEXT` | `content` markdown (headings, lists, `**bold**`, `*italic*`, `` `code` ``, links) or `value` |
| `AMOUNT` | `value` (format as-is, do not scale), `currency` (default `USD`) |
| `BADGE` | `text` or `value`, `color` (`positive` \| `negative` \| `notice` \| `information` \| `neutral` \| `primary`) |
| `INDICATOR` | `value`, `color` |
| `DATE` | `value`, `dateFormat` |
| `LINK` / `BUTTON` | `text`, `action` |
| `ALERT` | `title`, `description`, `color` |
| `SPACER` | `size` `small` \| `medium` \| `large` |
| `DIVIDER` | none |
| `INFO_GROUP` | `items[]` with `key.children` and `value.children` |
| `CHART` | `chartType` `bar` \| `donut` \| `pie`, `xAxis`, `data`, `variant` |
| `STACK` | `direction` `vertical` \| `horizontal`, `gap`, `children` |
| `GRID` | `columns`, `gap`, `children` |
| `CARD` | `title`, `description`, `footer`, `children` — compact padding `spacing.5`, row gap `spacing.3` |
| `TABLE` | `headers[]`, `rows[][]` of cell nodes (`TEXT`, `AMOUNT`, `BADGE`, `INDICATOR`, `DATE`, `LINK`) |

### Spacing

Root max-width `--theme-size-640`. Item gaps follow the Schema UI contract:

- heading → text: `spacing.3`
- text → `h3`: `spacing.7`
- `h3` → CARD/TABLE: `spacing.3`
- text → CARD/TABLE: `spacing.7`
- CARD/TABLE → BUTTON/LINK: `spacing.7`
- list row-gap: `spacing.3 + spacing.1` (10px combined)

### Actions

BUTTON and LINK set `data-kn-genui-action` with the JSON `action` object. A click dispatches bubbling `kn-genui-action` (`detail` is the action). If `action.data.href` is set, the renderer also hash-navigates.

Prompt actions:

```js
{ type: "prompt", data: { prompt: "All items due today" } }
```

- Agentic thread: `askInline(prompt)`
- Klear Assistant (`#ai-assistant-panel`): `KNAssistant.ask(prompt)`

### Motion

Ring travel uses `--kn-motion-duration-2xgentle`. Mask reveal is `2xgentle * 2` with `xmoderate` delay. Shade is `xgentle + 2xgentle`. Word fade-in uses `xmoderate`. `@media (prefers-reduced-motion: reduce)` skips ring, shade, mask, and word animation.

Existing: agentic home “Today's Statements” / “All items due today”, and the same prompts in Klear Assistant.
