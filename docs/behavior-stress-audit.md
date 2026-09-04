# KlearNow behavior + stress audit — KlearNow.ai

**Date:** 2026-08-24  
**Trigger:** Sev-1 data-loss — one field/checkbox edit wiping unrelated form state, then saving with no warning (Role / Default Role / User drawers).  
**Companion:** Visual/token audit remains `docs/token-audit.md`. This document is **behavior only**.

**Coordination:** A parallel sev-1 agent landed the wipe fix and save safety nets in `admin-ux.js`, `role-management.js`, `default-role-management.js`, and `user-management.js`. This audit **does not revert** that work. Stress tests below lock the intended contract.

---

## How KlearNow was checked

In-repo KlearNow material is **visual and token**, not interaction:

| Source | What it specifies | Behavior? |
| --- | --- | --- |
| `tokens.css` | Color, type, spacing, radius, focus ring, `--kn-layout-drawer-width` | **No** — layout/chrome only |
| `docs/token-audit.md` | Token mapping, contrast, focus glow | **No** |
| Component CSS (`styles.css` `.kn-check`, `.kn-drawer`, `.kn-switch`, `.kn-select`, `.kn-modal`) | Look, indeterminate box, drawer width, switch thumb | **Partial** — CSS implies some states (checked / indeterminate / focus-visible) but not event contracts |
| JS comments in `admin-ux.js` | Read-implies-write, merge-when-DOM-partial, dirty snapshots | **KN implementation notes**, not KlearNow docs |

**For every component type below: KlearNow has no dedicated behavior spec in this repo.** Pass/fail is against (a) implied CSS/ARIA in our KlearNow-named components, and (b) non-negotiable data-integrity (editing one control must not wipe another).

---

## Part 1 — Behavioral audit vs KlearNow

### Summary counts

| Verdict | Count |
| --- | --- |
| **PASS** (current code after sev-1 merge helpers) | 12 |
| **FAIL** (behavior gap vs implied KlearNow / data-integrity) | 2 |
| **WARN** (works if helpers used; still a footgun) | 2 |
| KlearNow has **no in-repo behavior spec** | All 7 types |

| ID | Component | Verdict | Deviation / evidence |
| --- | --- | --- | --- |
| C1 | Checkbox matrix (Role / Default Role) | **PASS** (was FAIL) | Sev-1: `mergePermissionSelections` + `applyPermissionToggle`. Prior FAIL: `readForm` rebuilt the whole Set from `input[name=perm]:checked` while search/unused categories omitted rows from the DOM → sibling wipe. |
| C2 | Indeterminate (row / col / group) | **PASS** | `someSelected` / `allSelected` + `data-indeterminate` → `bindIndeterminate`. CSS `.kn-check input:indeterminate + .kn-check__box`. Independent of sibling leaf keys. |
| C3 | Applicable-to checkboxes | **PASS** | Always fully rendered; not filtered out of DOM. |
| F1 | Text fields (name, user phone, etc.) | **PASS** | User: `applyUserField` scoped patch. Role name: `persistForm(readForm())` now merges hidden perms. |
| F2 | Controlled input / blur validation | **WARN** | Values are HTML-attribute controlled on each `render()`. Validation is mostly submit-time, not blur. **KlearNow has no blur-validation spec in-repo.** |
| B1 | Disabled-until-changed (Edit) | **PASS** | `isRoleFormDirty` / `isFormDataDirty` + `submitButtonAttrs` / `syncUpdateBtn`. Revert → disabled. |
| B2 | Add (create) submit enablement | **WARN** | Add Role enables on non-empty name **and** ≥1 permission, not “dirty vs snapshot”. Intentional for create, not KlearNow-documented. |
| D1 | Drawer close without save | **PASS** | `requestLeave` → KlearNow `discardModal` when dirty; `finishLeave` drops `state.form`. Reopen hydrates from storage seed. |
| D2 | Cross-record leak | **PASS** | `render()` re-inits `blankForm` only when `state.form.id !== route.id`. |
| D3 | Destructive save UI | **PASS** (fixed 2026-08-24) | Risk math is shared (`permissionReductionRisk`). Role/Default Role now route through the KlearNow `confirmModal` (`perm-reduce`) — see `docs/form-integrity-incident.md`. `window.confirm` no longer appears anywhere in the repo (verified by grep). |
| T1 | Tables sort/filter/pagination | **PASS** | `filteredRoles()` filters a **copy** of `loadRoles()` then sorts the copy; `slice` for page. Does not write storage. |
| S1 | Dropdown outside click | **PASS** | Document click → `kn-close-selects`; pages clear `selectOpen` / `menuOpen`. |
| S2 | Dropdown keyboard / listbox | **FAIL** | `role="listbox"` but **no ArrowUp/ArrowDown/Home/End** in `admin-ux.js`. Toggle + click only. **KlearNow has no keyboard spec in-repo**; this still fails common listbox behavior. |
| S3 | Multi-select reopen persistence | **PASS** | Selection lives in `state.form`, not in a discarded menu. Search-hidden options: `mergeDomMultiSelect` (Default Role services, User roles). |
| G1 | Active/Inactive switch | **PASS** | Handler writes `role.active` / `user.active` only; confirm if last admin / assigned people. Does not touch permission Set or user name/email. |
| R1 | Shipment References (other editable form) | **PASS** | Per-key `data-kn-ref-value`; dirty via JSON compare of catalog vs saved. Not the sev-1 matrix. |

### C1 — Checkbox matrices (sev-1 class)

**KlearNow checked against:** none in-repo. CSS only documents checked / indeterminate / focus-visible (`.kn-check`).

**Root cause (duplicated, not a shared React hook):** both Role and Default Role `readForm` historically did:

```js
new Set([...formEl.querySelectorAll('input[name="perm"]:checked')].map((i) => i.value))
```

`visibleModules()` **omits** non-matching modules from HTML when search or “selected only” is on. Any later `persistForm(readForm())` (accordion, name input, mode switch, column toggle) replaced the full permission Set with the visible subset.

**Current fix (verify, do not revert):**

| File | Lines (approx) | Behavior |
| --- | --- | --- |
| `admin-ux.js` | `mergeDomMultiSelect`, `mergePermissionSelections`, `applyPermissionToggle` | Hidden keys kept; visible keys take DOM checked state; single-key toggle is a copied Set |
| `role-management.js` | `readForm` | Uses `mergePermissionSelections(state.form.permissions, checked, visible)` |
| `default-role-management.js` | `readForm` | Same + `mergeDomMultiSelect` for services |
| `user-management.js` | `readForm` | Same merge for roles; `applyUserField` for scalars |

**Still FAIL if a caller skips the helper** and assigns `permissions = new Set(domChecked)` (the buggy pattern is kept as a negative test).

### F1 — Form fields

**KlearNow checked against:** none. `.kn-field__control` is visual.

User drawer has no permission matrix. The analogous bug is “edit Phone → wipe Name/Email/Roles”. Current `applyUserField` copies the form and patches one key. Role/Default Role still do `{ ...state.form, ...next, permissions: next.permissions }` — **safe only because `next` comes from merged `readForm`**.

### B1 — Buttons / dirty

**KlearNow checked against:** none. Disabled styling is in the atomic audit (opacity vs disabled fills — flagged there, not here).

Edit submit tracks real snapshot diff (`snapshotRoleForm` / user `formComparable`). Add flows are “complete enough to create,” not dirty.

### D1–D3 — Drawers / modals

**KlearNow checked against:** `.kn-drawer` width token; `.kn-modal--confirm` markup in `confirmDialog`. No open/close/dirty spec.

- Discard unsaved: **PASS** (KlearNow confirm markup).
- Destructive permission drop: logic **PASS**, chrome **PASS** (fixed 2026-08-24 — routes through `confirmModal`, no `window.confirm` left in the repo).
- Overlay Escape / focus trap: `handleOverlayKeydown` / `trapFocus` — **PASS** vs our own overlay helpers; no KlearNow spec.

### T1 — Tables

**KlearNow checked against:** none.

`loadRoles().filter(...)` returns a new array; `rows.sort` mutates that copy only. Pagination is `slice`. Selection is row focus / `restoreFocusId`, not a stored multi-select that filter could desync.

### S1–S3 — Dropdowns

**KlearNow checked against:** none. Markup uses `aria-haspopup="listbox"`.

Outside click **PASS**. Keyboard listbox **FAIL**. Value persistence **PASS**. User Role `chipsInTrigger` is product-specific; other `multiSelect` call sites were left on count-label (standing instruction — do not silently unify).

### G1 — Toggles

**KlearNow checked against:** `.kn-switch` CSS only.

Drawer header switch updates stored `active` immediately (not part of the form snapshot). That is a side effect on **status**, not on permissions/fields. Deactivate-with-assignees uses KlearNow confirm. **PASS** for the wipe class.

---

## Part 2 — Stress scenarios

### Automated

```bash
node tests/kn-behavior-stress.test.cjs
```

Loads `admin-ux.js` in a Node vm (no browser). **Result (this run): 24 passed, 0 failed.**

| # | Scenario | Coverage | Result |
| --- | --- | --- | --- |
| 1 | Rapid sequential edits | Role toggles + User field patches | PASS |
| 2 | Edit-then-revert dirty/button | Role name; User phone | PASS |
| 3 | Partial abandonment | Session `abandon()` / `reopenFresh()` | PASS |
| 4 | Clear all then check 1–2 | Role + Read auto-select | PASS |
| 5 | Cross-record contamination | Separate sessions A vs B | PASS |
| 6 | Destructive-change detection | `permissionReductionRisk` + user required-field block | PASS |
| 7 | Expand/collapse vs toggle | `openGroups` independent of Set | PASS |
| 8 | Search/filter + hidden retain | `mergePermissionSelections` / `mergeDomMultiSelect` | PASS |
| — | Negative: DOM-only replace wipes | Documents pre-fix class | PASS (asserts wipe) |
| — | Read-dependency | Auto-Read; block uncheck Read | PASS |
| — | Seed repair | `repairNearEmptySeedRoles` | PASS |

### Manual (browser) — not automated

Documented in the test runner footer:

1. Role: search → toggle visible → clear search → hidden still checked.  
2. Default Role: service search → uncheck visible → clear search → hidden services intact.  
3. User: role menu search + chips-in-trigger × removes one role only.  
4. Dirty discard modal: edit → Cancel → Discard → reopen original.  
5. Destructive save on Customer Administrator (36 customers): native `confirm()` with count.  
6. Tables: sort/filter/paginate; localStorage unchanged.  
7. Active/Inactive does not clear matrix / user fields.  
8. Outside-click closes selects; Escape closes overlays.

---

## Part 3 — Systemic root-cause map

### There is no shared React hook

This is vanilla IIFEs. **Same bug was copied twice** (Role + Default Role `readForm`). User already merged hidden roles and is a third cousin, not the same matrix.

```
admin-ux.js  (shared helpers + chrome)
    ├── mergeDomMultiSelect / mergePermissionSelections     ← correct DOM sync
    ├── applyPermissionToggle / applyPermDependency         ← scoped perm update
    ├── applyUserField                                      ← scoped user field
    ├── snapshotRoleForm / isRoleFormDirty                  ← dirty
    ├── permissionReductionRisk / formatPermissionReductionConfirm
    ├── detectClearedRequiredUserFields
    ├── repairNearEmptySeedRoles
    ├── accordion / permFilters / select / confirmDialog
    │
    ├── role-management.js          consumers: matrix + applicable
    ├── default-role-management.js  consumers: matrix + applicable + services
    └── user-management.js          consumers: fields + role multi-select
```

**Other editable surfaces (not the sev-1 matrix):**

| Surface | State | Wipe risk |
| --- | --- | --- |
| Shipment References (`shipment-detail.js`) | Per-field catalog; JSON dirty | Low — key-scoped |
| Visibility / map filters | Page UI state | Out of scope |
| Klear Agent drafts | `KNAiSuggest.consumeDraft` | Medium if draft apply overwrote without merge — Role uses `.add` on keys, not replace |

### Full-object reinitialization vs scoped updates

| Pattern | Where | Risk |
| --- | --- | --- |
| `permissions = new Set(domChecked)` | **Removed** from Role/Default `readForm` | Sev-1 wipe |
| `{ ...state.form, ...snap, permissions: snap.permissions }` | Still used after accordion / persist | **WARN** — safe iff `snap` is merged |
| `applyPermissionToggle` → new Set | Perm click | **PASS** |
| `applyUserField` | User scalars | **PASS** |
| `state.form = blankForm(existing)` | Route id change / list | **PASS** (intentional reinit) |
| `innerHTML = renderList()` | Every `render()` | Reconstructs DOM from `state.form`; OK if state is intact |

### Consumers of the shared helpers (do not treat as isolated)

If `mergePermissionSelections` regresses, **both** Role and Default Role drawers wipe again. If `mergeDomMultiSelect` regresses, Default Role **services** and User **roles** wipe under search. If `permissionReductionRisk` regresses, **both** role drawers lose the save net.

### Open wipe risks (after sev-1)

1. **Any new `readForm` clone** that assigns permissions from checked DOM only.  
2. **`persistForm` with a partial `next`** missing `permissions` (would set `permissions: undefined` via `next.permissions`). Call sites today always pass a full snap.  
3. ~~`window.confirm` can be dismissed by overlay tools / automation without the KlearNow modal's explicit Discard/Confirm affordance.~~ **Closed 2026-08-24** — destructive save now goes through the KlearNow `confirmModal` (`perm-reduce`); `window.confirm` no longer appears anywhere in the repo.  
4. **Custom (non-seed) roles** with near-empty permissions are **not** auto-repaired (`repairNearEmptySeedRoles` only matches seed catalog).  
5. **Accordion `setOpen` still re-reads the whole form** — correct now, but a future filter that drops `name="perm"` inputs without going through merge would revive the bug.  
6. **Do not broadly refactor** Visibility, shipment refs, or AI chat onto a new form reducer without confirmation (standing instruction).

---

## Items needing user confirmation before broad apply

1. ~~Replace `window.confirm` destructive-save with KlearNow `confirmDialog` on all role drawers.~~ **Done 2026-08-24** — see D3 above.  
2. Unify dirty-until-changed for **Add** Role/User (today create is “complete,” not “changed”).  
3. Add Arrow-key listbox navigation to **all** `.kn-select` / `multiSelect` (not only User Role).  
4. Blur-time field validation vs submit-time (KlearNow has no spec — product call).  
5. Auto-repair **non-seed** roles/users that look wiped (dangerous without a backup).  
6. Extract a single `readAdminForm()` used by all three drawers (large refactor; flag, don’t do silently).  
7. Anything already listed in `docs/token-audit.md` (icon stroke, AI row tint, input focus width, Describe-first radius).

---

## Files changed (this audit agent)

| File | Why |
| --- | --- |
| `docs/behavior-stress-audit.md` | This report |
| `tests/load-admin-ux.cjs` | Node loader for `admin-ux.js` |
| `tests/kn-behavior-stress.test.cjs` | Part 2 stress + regression (24 cases) |

**Not modified:** `role-management.js`, `default-role-management.js`, `user-management.js`, `admin-ux.js` (owned by sev-1 wipe fix). Describe-first / Phase 2 / AI chat untouched.
