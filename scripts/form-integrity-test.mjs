/**
 * Regression tests for drawer form state integrity (SEV-1 wipe fix).
 *
 * Run: /Users/jatinbansal/.nvm/versions/node/v24.19.0/bin/node scripts/form-integrity-test.mjs
 *   or: node scripts/form-integrity-test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const code = readFileSync(join(root, "admin-ux.js"), "utf8");

const sandbox = {
  console,
  CustomEvent: class CustomEvent {
    constructor(type) {
      this.type = type;
    }
  },
  document: {
    addEventListener() {},
    dispatchEvent() {}
  },
  window: {}
};
sandbox.window = sandbox;
vm.runInNewContext(code, sandbox, { filename: "admin-ux.js" });

const ux = sandbox.window.KNAdminUX;
if (!ux?.mergePermissionSelections || !ux?.applyPermissionToggle || !ux?.applyUserField) {
  console.error("FAIL: KNAdminUX helpers not exported");
  process.exit(1);
}
if (!ux?.syncPermissionSet || !ux?.applyPermDependencyToggle || !ux?.permissionBaselineForSave) {
  console.error("FAIL: KNAdminUX syncPermissionSet / baseline helpers not exported");
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function setEq(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size !== right.size) {
    return false;
  }
  for (const key of left) {
    if (!right.has(key)) {
      return false;
    }
  }
  return true;
}

// --- Role / Default Role: merge + toggle ---
{
  const prior = new Set([
    "cat-a:read",
    "cat-a:create",
    "cat-b:read",
    "cat-b:update",
    "cat-c:delete",
    "cat-c:read"
  ]);
  // Simulate search filter: only cat-a inputs are in the DOM
  const visible = ["cat-a:read", "cat-a:create", "cat-a:update", "cat-a:delete"];
  const checked = ["cat-a:read", "cat-a:create"];
  const merged = ux.mergePermissionSelections(prior, checked, visible);
  assert(
    "Role merge keeps non-visible category selections",
    setEq(merged, [
      "cat-a:read",
      "cat-a:create",
      "cat-b:read",
      "cat-b:update",
      "cat-c:delete",
      "cat-c:read"
    ]),
    `got ${[...merged].sort().join(",")}`
  );
}

{
  const prior = new Set([
    "mod-x:read",
    "mod-x:create",
    "mod-y:read",
    "mod-y:update",
    "mod-z:read",
    "mod-z:delete"
  ]);
  const toggled = ux.applyPermissionToggle(prior, "mod-y:create", true);
  assert(
    "Role toggle one checkbox leaves other categories untouched",
    setEq(toggled.permissions, [
      "mod-x:read",
      "mod-x:create",
      "mod-y:read",
      "mod-y:update",
      "mod-y:create",
      "mod-z:read",
      "mod-z:delete"
    ]),
    `got ${[...toggled.permissions].sort().join(",")}`
  );
  assert("Role toggle does not mutate prior Set", prior.has("mod-z:delete") && !prior.has("mod-y:create"));
}

{
  const prior = new Set(["a:read", "b:read", "c:read", "d:read", "e:read", "f:read", "g:read", "h:read"]);
  const next = new Set(["a:read"]);
  const risk = ux.permissionReductionRisk(prior, next, 36);
  assert("Save safety net flags large permission reduction", Boolean(risk && risk.removed === 7 && risk.inheritanceCount === 36));
  const msg = ux.formatPermissionReductionConfirm(risk, "customers");
  assert("Confirm copy mentions removed count and inheritance", msg.includes("~7") && msg.includes("36"));
}

// --- User: applyUserField ---
{
  const form = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
    phoneCountry: "+1",
    title: "Analyst",
    reportsTo: "rep-1",
    roles: ["KN Administrator", "OPS Hub Reviewer"]
  };
  const next = ux.applyUserField(form, "phone", "555-9999");
  assert(
    "User phone edit leaves other fields untouched",
    next.phone === "555-9999" &&
      next.name === form.name &&
      next.email === form.email &&
      next.phoneCountry === form.phoneCountry &&
      next.title === form.title &&
      next.reportsTo === form.reportsTo &&
      next.roles === form.roles
  );
  assert("User applyUserField does not mutate original", form.phone === "555-0100");
}

{
  const cleared = ux.detectClearedRequiredUserFields(
    { name: "Ada Lovelace", email: "ada@example.com", roles: ["KN Administrator"] },
    { name: "", email: "ada@example.com", roles: ["KN Administrator"] }
  );
  assert("User save blocks cleared Full Name", cleared.length === 1 && cleared[0] === "name");
}

{
  const roles = ux.mergeDomMultiSelect(
    ["Role A", "Role B", "Role C"],
    ["Role A"],
    ["Role A", "Role B"] // Role C filtered out of menu
  );
  assert(
    "User role merge keeps non-visible roles",
    roles.length === 2 && roles.includes("Role A") && roles.includes("Role C") && !roles.includes("Role B")
  );
}

{
  const seed = [{ id: "def-customer-admin", name: "Customer Administrator", permissions: Array.from({ length: 40 }, (_, i) => `p${i}`) }];
  const stored = [{ id: "def-customer-admin", name: "Customer Administrator", permissions: ["p0"] }];
  const { roles, repairs } = ux.repairNearEmptySeedRoles(stored, seed);
  assert("Post-incident repair restores near-empty seed role", repairs.length === 1 && roles[0].permissions.length === 40);
}

// --- SEV-1 regression (2026-08-24): row/col/group toggleKeys wipe ---
// Real handler: applyPermDependencyToggle(set, keys) then syncPermSet(set, result.permissions).
// Old helpers returned the SAME Set they mutated; syncPermSet cleared it then forEach'd the empty set.
{
  const finance = [
    "kn-credits:create",
    "kn-credits:update",
    "kn-credits:delete",
    "kn-credits:read",
    "kn-promo:create",
    "kn-promo:update",
    "kn-promo:delete",
    "kn-promo:read"
  ];
  const klearhubRow = [
    "visibility-data:create",
    "visibility-data:update",
    "visibility-data:delete",
    "visibility-data:read"
  ];
  const prior = new Set(finance);
  const result = ux.applyPermDependencyToggle(prior, klearhubRow, ux.DEFAULT_PERM_ACTIONS);
  assert(
    "Bulk toggle returns a distinct Set (no same-ref mutation)",
    result.permissions !== prior,
    "helpers must copy so syncPermSet cannot clear()+forEach the live catalog"
  );
  assert(
    "Bulk toggle does not mutate the caller's prior Set",
    setEq(prior, finance),
    `prior mutated to ${[...prior].sort().join(",")}`
  );
  // Emulate Role/Default Role toggleKeys → syncPermissionSet
  ux.syncPermissionSet(prior, result.permissions);
  assert(
    "toggleKeys sequence keeps Finance when toggling a KlearHub row",
    setEq(prior, [...finance, ...klearhubRow]),
    `got ${[...prior].sort().join(",")}`
  );
}

{
  const prior = new Set(["mod-a:create", "mod-a:read", "mod-b:read", "mod-c:update"]);
  const ensured = ux.ensureWriteImpliesRead(prior, ux.DEFAULT_PERM_ACTIONS);
  assert("ensureWriteImpliesRead returns a distinct Set", ensured.permissions !== prior);
  ux.syncPermissionSet(prior, ensured.permissions);
  assert(
    "AI ensureWriteImpliesRead sync does not cascade-wipe",
    prior.has("mod-a:create") && prior.has("mod-b:read") && prior.has("mod-c:update") && prior.has("mod-c:read"),
    `got ${[...prior].sort().join(",")}`
  );
}

{
  const stored = ["a:read"];
  const snap = { permissions: ["a:read", "b:read", "c:read", "d:read", "e:read", "f:read", "g:read", "h:read"].join("\0") };
  const baseline = ux.permissionBaselineForSave(stored, snap);
  assert(
    "Save baseline prefers richer drawer-open snapshot over corrupted storage",
    baseline.length === 8,
    `got ${baseline.length}`
  );
}

{
  const keys = ["mod:create", "mod:update", "mod:delete", "mod:read"];
  const empty = new Set();
  const partial = new Set(["mod:read", "mod:create"]);
  const full = new Set(keys);
  assert("Row indeterminate is false when zero of four are checked", ux.someKeysSelected(empty, keys) === false);
  assert("Row indeterminate is true when some of four are checked", ux.someKeysSelected(partial, keys) === true);
  assert("Row indeterminate is false when all four are checked", ux.someKeysSelected(full, keys) === false);
  assert("Row allSelected is false when zero checked", ux.allKeysSelected(empty, keys) === false);
  assert("Row allSelected is true when all four checked", ux.allKeysSelected(full, keys) === true);
  assert("someKeysSelected is false for empty key list", ux.someKeysSelected(partial, []) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
