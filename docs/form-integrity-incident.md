# Post-incident: permission / form state wipe (SEV-1)

## What happened (2026-08-24 re-break)

Editing permissions via a **row / column / category header checkbox** (or AI suggest’s `ensureWriteImpliesRead` + `syncPermSet`) could empty the entire in-memory permission `Set` in one click.

**Repro A (KN Role Management — Finance Credits Owner):** role had Finance Management **8/8**. Expanding KlearHub and clicking the **KN Visibility Data** row header checkbox dropped Finance to **0/8** (then only the newly toggled KlearHub keys remained after individual cell clicks).

**Repro B (Default Role Management — Customer Administrator):** restored to **16/228**, then zeroed again in-session; **Update Default Role** stayed enabled/savable. Native `window.confirm` for destructive save either did not appear as KlearNow chrome or was easy to miss.

Saving after the wipe persisted near-empty catalogs (roles used by people / inherited by workspaces).

---

## Actual root cause THIS time

Not `readForm` / DOM-visible merge.

`toggleKeys` (Role + Default Role) does:

1. `result = applyPermDependencyToggle(liveSet, keys)`
2. `syncPermSet(liveSet, result.permissions)` which was implemented as:

```js
target.clear();
next.forEach((key) => target.add(key));
```

`applyPermDependencyToggle` / `ensureWriteImpliesRead` used:

```js
const permissions = permissionsSet instanceof Set ? permissionsSet : new Set(...);
```

So when the caller passed a `Set`, helpers **mutated it in place and returned the same reference**. Then `syncPermSet` cleared that Set and re-added from the now-empty same object → **full cascade wipe**.

Single-cell `applyPermissionToggle` already copied first, so it looked “fixed” under merge-only tests while row/col/group + AI ensure still wiped.

Recording evidence: Finance was already **0/8** with KlearHub expanded before individual Create/Read clicks; the row-header path matches that sequence.

---

## Why the previous fix didn’t catch it

Previous claim: `readForm` only saw DOM-visible checkboxes → added `mergePermissionSelections`.

That was a **real** earlier bug class and remains necessary under search / selected-only / unused categories. It did **not** cover:

| Path | Uses merge? | Wiped? |
|------|-------------|--------|
| Single `input[name=perm]` change | Yes, then overwritten by `applyPermissionToggle` copy | No |
| Row / col / group header (`toggleKeys`) | No — `applyPermDependencyToggle` + `syncPermSet` | **Yes** |
| AI suggest `ensureWriteImpliesRead` + `syncPermSet` | No | **Yes** |

Existing tests only exercised merge + single-key toggle. They **passed while the bug was live**.

---

## Fix (2026-08-24)

1. **Immutable copies** in `applyPermDependency`, `applyPermDependencyToggle`, `ensureWriteImpliesRead` (`new Set(toKeyList(...))`).
2. **`syncPermissionSet`** in `admin-ux.js`: no-op when `target === next`; otherwise clear + copy keys. Role/Default Role `syncPermSet` delegates here.
3. **`persistForm`** refuses to assign `permissions: undefined`.
4. **Destructive save**: KlearNow `confirmModal` (`perm-reduce`) instead of `window.confirm`; baseline via `permissionBaselineForSave(stored, formSnapshot)` so a mid-session wipe still prompts against the richer open snapshot.
5. Seed **repair-on-load** (`repairNearEmptySeedRoles`) unchanged for already-corrupted localStorage.

---

## New regression test (prevents third regression)

```bash
node scripts/form-integrity-test.mjs
node tests/kn-behavior-stress.test.cjs
```

Must fail on the old path:

- Bulk toggle returns a **distinct** Set; caller’s prior Set unchanged.
- `syncPermissionSet` after toggling a KlearHub-analog row **keeps** Finance-analog keys.
- Stress: `toggleKeys(CAT_B)` with only `CAT_A` selected → both categories present; `buggyToggleKeysWipe` documents size `0`.

If those pass while a browser wipe still reproduces, treat as a new handler bypass — do not only re-tune merge.

---

## Storage keys / data restore

| Key | Module | Repair |
|-----|--------|--------|
| `kn-default-roles-v3` | Default Role Management | Near-empty seeded roles restored from `seedRoles()` on load |
| `kn-roles-v2` | KN Role Management | Same |
| `kn-users-v2` | User Management | No auto-rewrite |

### Verify locally

1. DevTools → Application → Local Storage.
2. `kn-roles-v2` → Finance Credits Owner (`role-finance`) → 8 finance keys (`kn-credits:*`, `kn-promo:*`).
3. `kn-default-roles-v3` → Customer Administrator → seed catalog size (not 0 / handful).
4. Reload Default Role page: `[KNDefaultRoles] Restored near-empty seeded roles…` if repair ran.

---

## Manual verify (required)

1. Open Finance Credits Owner → Finance **8/8** → expand Other categories / KlearHub → click **row header** on a Visibility module → Finance still **8/8**, KlearHub gains that row.
2. Open Customer Administrator → **16/228** → same row/col toggle in another category → count does not collapse to 0.
3. Strip many permissions on a role with people/workspaces → KlearNow **Remove permissions?** modal appears; Cancel leaves dirty form unsaved.
