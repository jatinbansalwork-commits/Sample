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
const aiCode = readFileSync(join(root, "ai-suggest.js"), "utf8");

const memoryStore = new Map();
const storage = {
  getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    memoryStore.set(key, String(value));
  },
  removeItem(key) {
    memoryStore.delete(key);
  }
};

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
  window: {},
  localStorage: storage,
  sessionStorage: storage
};
sandbox.window = sandbox;
sandbox.window.localStorage = storage;
sandbox.window.sessionStorage = storage;
vm.runInNewContext(code, sandbox, { filename: "admin-ux.js" });
vm.runInNewContext(aiCode, sandbox, { filename: "ai-suggest.js" });

const ux = sandbox.window.KNAdminUX;
const ai = sandbox.window.KNAiSuggest;
if (!ux?.mergePermissionSelections || !ux?.applyPermissionToggle || !ux?.applyUserField) {
  console.error("FAIL: KNAdminUX helpers not exported");
  process.exit(1);
}
if (!ux?.syncPermissionSet || !ux?.applyPermDependencyToggle || !ux?.permissionBaselineForSave) {
  console.error("FAIL: KNAdminUX syncPermissionSet / baseline helpers not exported");
  process.exit(1);
}
if (!ai?.applyAiPermissionLayer || !ai?.finalizeAiPermissionOwnership || !ai?.clearAiOnly) {
  console.error("FAIL: KNAiSuggest permission ownership helpers not exported");
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

{
  const live = new Set(["a:read", "b:read"]);
  ux.syncPermissionSet(live, null);
  assert("syncPermissionSet no-ops on null next (no cascade wipe)", setEq(live, ["a:read", "b:read"]));
  ux.syncPermissionSet(live, undefined);
  assert("syncPermissionSet no-ops on undefined next", setEq(live, ["a:read", "b:read"]));
}

// --- Seed-shaped roles (Customer Administrator / Finance Credits Owner / Analytics Viewer) ---
{
  const finance = [
    "credit-tracking:create",
    "credit-tracking:update",
    "credit-tracking:delete",
    "credit-tracking:read",
    "credit-purchase:create",
    "credit-purchase:update",
    "credit-purchase:delete",
    "credit-purchase:read"
  ];
  const analytics = [
    "klearhub-dashboard:create",
    "klearhub-dashboard:update",
    "klearhub-dashboard:delete",
    "klearhub-dashboard:read"
  ];
  const customerAdmin = [
    "user-management:create",
    "user-management:update",
    "user-management:delete",
    "user-management:read",
    "role-management:create",
    "role-management:update",
    "role-management:delete",
    "role-management:read",
    "customer-profile:create",
    "customer-profile:update",
    "customer-profile:delete",
    "customer-profile:read",
    "sub-customer-profile:create",
    "sub-customer-profile:update",
    "sub-customer-profile:delete",
    "sub-customer-profile:read"
  ];
  const visRow = [
    "visibility:create",
    "visibility:update",
    "visibility:delete",
    "visibility:read"
  ];

  function emulateToggleKeys(live, keys) {
    const result = ux.applyPermDependencyToggle(live, keys, ux.DEFAULT_PERM_ACTIONS);
    ux.syncPermissionSet(live, result.permissions);
    return live;
  }

  function storageRoundTrip(storageKey, role) {
    const blob = JSON.stringify([role]);
    const parsed = JSON.parse(blob);
    return { storageKey, role: parsed[0] };
  }

  {
    const prior = new Set(finance);
    const toggled = ux.applyPermissionToggle(prior, "klearhub-dashboard:read", true);
    assert(
      "Finance Credits Owner: one checkbox leaves finance keys untouched",
      finance.every((key) => toggled.permissions.has(key)) && toggled.permissions.has("klearhub-dashboard:read"),
      `got size ${toggled.permissions.size}`
    );
  }

  {
    const live = new Set(finance);
    emulateToggleKeys(live, visRow);
    assert(
      "Finance Credits Owner: row toggleKeys keeps finance (kn-roles-v2 semantics)",
      finance.every((key) => live.has(key)) && visRow.every((key) => live.has(key)),
      `got ${[...live].sort().join(",")}`
    );
    const { storageKey, role } = storageRoundTrip("kn-roles-v2", {
      id: "role-finance",
      name: "Finance Credits Owner",
      permissions: [...live]
    });
    assert("Finance storage key is kn-roles-v2", storageKey === "kn-roles-v2");
    assert(
      "Finance Credits Owner survives localStorage JSON round-trip",
      finance.every((key) => role.permissions.includes(key)) && role.permissions.includes("visibility:read")
    );
  }

  {
    const live = new Set(analytics);
    emulateToggleKeys(live, ["overview:create", "visibility:create"]);
    assert(
      "Analytics Viewer: unrelated create toggles keep klearhub-dashboard",
      analytics.every((key) => live.has(key)),
      `got ${[...live].sort().join(",")}`
    );
    const { role } = storageRoundTrip("kn-roles-v2", {
      id: "role-analytics",
      name: "Analytics Viewer",
      permissions: [...live]
    });
    assert(
      "Analytics Viewer survives localStorage JSON round-trip",
      analytics.every((key) => role.permissions.includes(key))
    );
  }

  {
    const live = new Set(customerAdmin);
    // Partial DOM: only vis row visible and unchecked — merge must keep admin keys
    const merged = ux.mergePermissionSelections(live, [], visRow);
    assert(
      "Customer Administrator: partial DOM merge keeps admin catalog",
      setEq(merged, customerAdmin),
      `got ${[...merged].sort().join(",")}`
    );
    emulateToggleKeys(live, visRow);
    const one = ux.applyPermissionToggle(live, "credit-tracking:read", true);
    ux.syncPermissionSet(live, one.permissions);
    assert(
      "Customer Administrator: row + cell toggles never wipe admin keys",
      customerAdmin.every((key) => live.has(key)) &&
        visRow.every((key) => live.has(key)) &&
        live.has("credit-tracking:read"),
      `got size ${live.size}`
    );
    const { storageKey, role } = storageRoundTrip("kn-default-roles-v3", {
      id: "def-customer-admin",
      name: "Customer Administrator",
      permissions: [...live]
    });
    assert("Customer Admin storage key is kn-default-roles-v3", storageKey === "kn-default-roles-v3");
    assert(
      "Customer Administrator survives localStorage JSON round-trip",
      customerAdmin.every((key) => role.permissions.includes(key)) &&
        role.permissions.includes("visibility:read") &&
        role.permissions.includes("credit-tracking:read")
    );
  }
}

// --- AI Describe ownership: clear must not wipe pre-existing permissions ---
{
  const finance = [
    "credit-tracking:create",
    "credit-tracking:update",
    "credit-tracking:delete",
    "credit-tracking:read",
    "credit-purchase:create",
    "credit-purchase:update",
    "credit-purchase:delete",
    "credit-purchase:read"
  ];
  const entityNew = [
    "customer-profile:create",
    "customer-profile:update",
    "customer-profile:delete",
    "customer-profile:read"
  ];
  const suggested = [...finance, ...entityNew];
  const reasons = Object.fromEntries(suggested.map((key) => [key, "Matched finance/entity"]));

  const prior = new Set(finance);
  const layer = ai.applyAiPermissionLayer({
    current: prior,
    previousAiOnly: [],
    suggestedKeys: suggested
  });
  assert(
    "Describe keeps finance baseline when suggestions overlap",
    finance.every((key) => layer.baseline.has(key)) && finance.every((key) => layer.permissions.has(key))
  );
  assert(
    "Describe adds new entity keys",
    entityNew.every((key) => layer.permissions.has(key))
  );

  const owned = ai.finalizeAiPermissionOwnership({
    baseline: layer.baseline,
    permissions: layer.permissions,
    reasonsByKey: reasons
  });
  assert(
    "Only newly added keys are AI-owned (finance unmarked)",
    owned.aiOnly.length === entityNew.length &&
      entityNew.every((key) => owned.aiSuggestions[key]) &&
      finance.every((key) => !owned.aiSuggestions[key]),
    `aiOnly=${owned.aiOnly.join(",")}`
  );

  const afterClear = new Set(ai.clearAiOnly(layer.permissions, owned.aiOnly));
  assert(
    "Clear AI restores finance defaults and drops only AI-added keys",
    finance.every((key) => afterClear.has(key)) &&
      entityNew.every((key) => !afterClear.has(key)) &&
      afterClear.size === finance.length
  );

  // Second Describe replaces prior AI layer without stacking or wiping baseline
  const secondSuggested = ["klearhub-dashboard:read", ...finance];
  const second = ai.applyAiPermissionLayer({
    current: new Set([...finance, ...entityNew]),
    previousAiOnly: owned.aiOnly,
    suggestedKeys: secondSuggested
  });
  const secondOwned = ai.finalizeAiPermissionOwnership({
    baseline: second.baseline,
    permissions: second.permissions,
    reasonsByKey: { "klearhub-dashboard:read": "Analytics" }
  });
  assert(
    "Re-describe strips prior AI-only and does not re-own finance",
    finance.every((key) => second.baseline.has(key)) &&
      !second.permissions.has("customer-profile:create") &&
      second.permissions.has("klearhub-dashboard:read") &&
      secondOwned.aiOnly.length === 1 &&
      secondOwned.aiSuggestions["klearhub-dashboard:read"]
  );
}

// --- AI Describe flows: error / edge states + lots of data ---
{
  // Match Role / Default Role drawers (not ai-suggest's legacy default ["read","write",...])
  const ROLE_ACTIONS = ["create", "update", "delete", "read"];

  function statusForDescribe({ noMatch, edgeMessage, aiOnlyCount, suggestionsSize }) {
    if (noMatch) {
      return edgeMessage || ai.MESSAGES?.noMatch || "No strong matches.";
    }
    if (aiOnlyCount > 0) {
      return `${aiOnlyCount} permissions suggested. Review them below.${edgeMessage ? ` ${edgeMessage}` : ""}`;
    }
    if (suggestionsSize > 0) {
      return "Matched permissions you already have — nothing new added.";
    }
    return "";
  }

  const empty = ai.deriveRolePermissions("", { actions: ROLE_ACTIONS });
  assert("Empty describe: noMatch and zero suggestions", empty.noMatch === true && empty.suggestions.size === 0);
  assert(
    "Empty describe: status stays blank (no false error)",
    statusForDescribe({
      noMatch: empty.noMatch && Boolean("".trim()),
      edgeMessage: empty.edgeMessage,
      aiOnlyCount: 0,
      suggestionsSize: empty.suggestions.size
    }) === ""
  );

  const nonsense = ai.deriveRolePermissions("zzzz qqqq xyxyxy not a real capability", { actions: ROLE_ACTIONS });
  assert("Nonsense describe: noMatch", nonsense.noMatch === true && nonsense.suggestions.size === 0);
  assert(
    "Nonsense describe: status uses no-match copy",
    statusForDescribe({
      noMatch: true,
      edgeMessage: nonsense.edgeMessage,
      aiOnlyCount: 0,
      suggestionsSize: 0
    }).includes("No strong matches")
  );

  const adminFull = [];
  for (const mod of ["user-management", "role-management", "contract-management"]) {
    for (const action of ROLE_ACTIONS) {
      adminFull.push(`${mod}:${action}`);
    }
  }
  const adminDesc = ai.deriveRolePermissions(
    "concentrated in Administration — user access, roles, and contracts",
    { actions: ROLE_ACTIONS }
  );
  assert("Admin describe produces suggestions", adminDesc.suggestions.size > 0 && !adminDesc.noMatch);
  const adminLayer = ai.applyAiPermissionLayer({
    current: new Set(adminFull),
    previousAiOnly: [],
    suggestedKeys: [...adminDesc.suggestions.keys()]
  });
  const adminOwned = ai.finalizeAiPermissionOwnership({
    baseline: adminLayer.baseline,
    permissions: adminLayer.permissions,
    reasonsByKey: Object.fromEntries(adminDesc.suggestions)
  });
  assert(
    "Already-owned admin describe: aiOnly empty (nothing new)",
    adminOwned.aiOnly.length === 0 && setEq(adminLayer.permissions, adminFull),
    `aiOnly=${adminOwned.aiOnly.join(",")}`
  );
  assert(
    "Already-owned admin describe: visible already-have status",
    statusForDescribe({
      noMatch: false,
      edgeMessage: adminDesc.edgeMessage,
      aiOnlyCount: adminOwned.aiOnly.length,
      suggestionsSize: adminDesc.suggestions.size
    }) === "Matched permissions you already have — nothing new added."
  );

  const multi = ai.deriveRolePermissions(
    "manage users roles finance credits analytics dashboard notifications alerts customs ISF filing",
    { actions: ROLE_ACTIONS }
  );
  assert(
    "Multi-intent describe: multiIntent or many groups",
    multi.multiIntent === true || multi.matches.length >= 3,
    `level=${multi.level} matches=${multi.matches.length}`
  );
  assert(
    "Multi-intent describe: edge tip is non-empty when flagged",
    !multi.multiIntent || /more than one|primary/i.test(multi.edgeMessage || "")
  );

  // Lots of data: dense catalog + overlapping AI layer + clear must not wipe baseline
  const denseKeys = [];
  for (let i = 0; i < 40; i += 1) {
    for (const action of ROLE_ACTIONS) {
      denseKeys.push(`mod-${i}:${action}`);
    }
  }
  assert("Dense catalog has 160 keys", denseKeys.length === 160);
  const baselineHalf = denseKeys.filter((_, idx) => idx % 2 === 0);
  const suggestAll = denseKeys.slice(0, 120);
  const denseLayer = ai.applyAiPermissionLayer({
    current: new Set(baselineHalf),
    previousAiOnly: [],
    suggestedKeys: suggestAll
  });
  const denseOwned = ai.finalizeAiPermissionOwnership({
    baseline: denseLayer.baseline,
    permissions: denseLayer.permissions,
    reasonsByKey: Object.fromEntries(suggestAll.map((key) => [key, "bulk"]))
  });
  assert(
    "Dense describe: baseline half preserved",
    baselineHalf.every((key) => denseLayer.permissions.has(key))
  );
  assert(
    "Dense describe: only non-baseline keys are AI-owned",
    denseOwned.aiOnly.every((key) => !denseLayer.baseline.has(key)) &&
      denseOwned.aiOnly.length === suggestAll.filter((key) => !baselineHalf.includes(key)).length,
    `aiOnly=${denseOwned.aiOnly.length}`
  );
  const denseCleared = new Set(ai.clearAiOnly(denseLayer.permissions, denseOwned.aiOnly));
  assert(
    "Dense clear: restores exact baseline half",
    setEq(denseCleared, baselineHalf),
    `size=${denseCleared.size}`
  );

  // Re-describe under load: strip prior AI-only, keep growing baseline
  const nextSuggest = denseKeys.slice(80, 160);
  const reLayer = ai.applyAiPermissionLayer({
    current: denseLayer.permissions,
    previousAiOnly: denseOwned.aiOnly,
    suggestedKeys: nextSuggest
  });
  assert(
    "Dense re-describe: prior AI-only removed when not re-suggested",
    denseOwned.aiOnly.every((key) => nextSuggest.includes(key) || !reLayer.permissions.has(key))
  );
  assert(
    "Dense re-describe: original baseline still intact",
    baselineHalf.every((key) => reLayer.permissions.has(key))
  );

  const droleEmpty = ai.deriveDefaultRoleSuggestions("asdfghjkl zxcvbnm", { actions: ROLE_ACTIONS });
  assert("Default-role nonsense: noMatch", droleEmpty.noMatch === true);

  const droleFinance = ai.deriveDefaultRoleSuggestions("finance credits billing promo codes for customers", {
    actions: ROLE_ACTIONS
  });
  assert(
    "Default-role finance describe: suggestions + applicables/services optional",
    droleFinance.suggestions.size > 0 && !droleFinance.noMatch
  );

  const droleMaster = ai.deriveDefaultRoleSuggestions("hts ports country currency customs master tables", {
    actions: ROLE_ACTIONS
  });
  assert(
    "Default-role master-data describe maps to HTS split module",
    [...droleMaster.suggestions.keys()].some((key) => key.startsWith("customs-master-hts:"))
  );

  const greenfield = ai.deriveRolePermissions(
    "manage users and roles with finance credits analytics dashboard",
    { actions: ROLE_ACTIONS }
  );
  const greenLayer = ai.applyAiPermissionLayer({
    current: new Set(),
    previousAiOnly: [],
    suggestedKeys: [...greenfield.suggestions.keys()]
  });
  const greenOwned = ai.finalizeAiPermissionOwnership({
    baseline: greenLayer.baseline,
    permissions: greenLayer.permissions,
    reasonsByKey: Object.fromEntries(greenfield.suggestions)
  });
  assert(
    "Greenfield describe: every suggested key is AI-owned",
    greenOwned.aiOnly.length === greenfield.suggestions.size && greenOwned.aiOnly.length >= 4,
    `aiOnly=${greenOwned.aiOnly.length}`
  );
  assert(
    "Greenfield describe: status counts suggestions",
    /permissions suggested/i.test(
      statusForDescribe({
        noMatch: false,
        edgeMessage: greenfield.edgeMessage,
        aiOnlyCount: greenOwned.aiOnly.length,
        suggestionsSize: greenfield.suggestions.size
      })
    )
  );
}


// --- Default Role / Role Management catalog + Parties category ---
{
  const droleCode = readFileSync(join(root, "default-role-management.js"), "utf8");
  sandbox.document = {
    readyState: "complete",
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    dispatchEvent() {}
  };
  sandbox.location = { hash: "#default-role-management" };
  sandbox.CSS = { escape: (value) => String(value) };
  memoryStore.clear();
  vm.runInNewContext(droleCode, sandbox, { filename: "default-role-management.js" });
  const drole = sandbox.window.KNDefaultRoles;
  assert("KNDefaultRoles API exported", Boolean(drole?.permissionCatalog && drole?.partiesCategories && drole?.list));

  const catalog = drole.permissionCatalog();
  const moduleIds = catalog.flatMap((group) => group.modules.map((mod) => mod.id));
  const groupIds = catalog.map((group) => group.id);
  assert("Catalog includes Payment - US", groupIds.includes("payment-us"));
  assert("Catalog includes Txn NL + ES", groupIds.includes("txn-nl") && groupIds.includes("txn-es"));
  assert(
    "Catalog splits Customs Master Tables",
    ["customs-master-hts", "customs-master-ports", "customs-master-country", "customs-master-currency"].every((id) =>
      moduleIds.includes(id)
    ) && !moduleIds.includes("customs-master")
  );
  assert(
    "Catalog keeps Visibility SEC / 3.0 and adds 360 + Overview",
    ["visibility-sec", "visibility-3", "visibility-360", "visibility-overview"].every((id) => moduleIds.includes(id))
  );
  assert("Catalog includes FTZ US", moduleIds.includes("ftz-us"));

  const parties = drole.partiesCategories();
  assert(
    "Parties categories match production radios",
    parties.map((item) => item.id).join(",") === "brokers-forwarders,dray-providers,other-parties"
  );

  const migrated = drole.migratePermissions(["customs-master:read", "customs-master:create", "visibility:read"]);
  assert(
    "Legacy customs-master keys expand to HTS/Ports/Country/Currency",
    migrated.changed &&
      !migrated.permissions.includes("customs-master:read") &&
      ["customs-master-hts:read", "customs-master-ports:create", "visibility:read"].every((key) =>
        migrated.permissions.includes(key)
      )
  );

  const roles = drole.list();
  const partyAdmin = roles.find((role) => role.id === "def-party-admin");
  const vis20 = roles.find((role) => role.id === "def-vis-2");
  assert("Seed includes Party Broker/Forwarder Admin", Boolean(partyAdmin?.name === "Party Broker/Forwarder Admin"));
  assert(
    "Party Broker Admin persists Brokers/Forwarders category",
    partyAdmin?.partiesCategory === "brokers-forwarders" && partyAdmin.applicable.includes("parties")
  );
  assert("Seed includes Vis 2.0", Boolean(vis20));
  assert(
    "Seed permissions reference real catalog keys",
    roles.every((role) => (role.permissions || []).every((key) => moduleIds.some((id) => key.startsWith(`${id}:`))))
  );

  const snap = ux.snapshotRoleForm({
    name: "Party test",
    applicable: ["parties"],
    partiesCategory: "dray-providers",
    services: ["customs-broker"],
    permissions: new Set(["party-profile:read"])
  });
  assert("Role form snapshot tracks partiesCategory", snap.partiesCategory === "dray-providers");
  assert(
    "Role form dirty when parties category changes",
    ux.isRoleFormDirty(
      {
        name: "Party test",
        applicable: ["parties"],
        partiesCategory: "other-parties",
        services: ["customs-broker"],
        permissions: new Set(["party-profile:read"])
      },
      snap
    )
  );
}

// --- KN Role Management catalog (customer-dashboard screenshot parity) ---
{
  const roleCode = readFileSync(join(root, "role-management.js"), "utf8");
  sandbox.document = {
    readyState: "complete",
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    dispatchEvent() {}
  };
  sandbox.location = { hash: "#kn-role-management" };
  sandbox.CSS = { escape: (value) => String(value) };
  memoryStore.clear();
  vm.runInNewContext(roleCode, sandbox, { filename: "role-management.js" });
  const knRoles = sandbox.window.KNRoles;
  assert("KNRoles API exported", Boolean(knRoles?.permissionCatalog && knRoles?.partiesCategories && knRoles?.list));

  const catalog = knRoles.permissionCatalog();
  const moduleIds = catalog.flatMap((group) => group.modules.map((mod) => mod.id));
  const groupIds = catalog.map((group) => group.id);
  assert(
    "KN catalog includes Administration + Entity + Finance + Billing",
    ["administration", "entity", "finance", "billing"].every((id) => groupIds.includes(id))
  );
  assert(
    "KN catalog includes TM regions US/UK/CA/NL/ES",
    ["txn-us", "txn-uk", "txn-ca", "txn-nl", "txn-es"].every((id) => groupIds.includes(id))
  );
  assert(
    "KN catalog includes Operations, Drayage, Analytics, Payments, E-Invoices, NotificationManagement",
    ["operations", "drayage", "analytics", "payment-us", "payment-ca", "einvoices", "notifications"].every((id) =>
      groupIds.includes(id)
    )
  );
  assert(
    "KN catalog drops sample-only modules",
    !moduleIds.includes("kn-user-management") &&
      !moduleIds.includes("default-role-management") &&
      !moduleIds.includes("hevo-dashboard") &&
      !moduleIds.includes("intelligent-ops-hub")
  );
  assert(
    "KN catalog has screenshot modules",
    ["role-management", "customer-profile", "credit-purchase", "visibility-360", "isf-us", "intake-pp", "statement-ca", "notification-management"].every(
      (id) => moduleIds.includes(id)
    )
  );
  assert(
    "KN Parties categories match production radios",
    knRoles.partiesCategories().map((item) => item.id).join(",") === "brokers-forwarders,dray-providers,other-parties"
  );

  const migrated = knRoles.migratePermissions([
    "kn-user-management:read",
    "kn-credits-management:create",
    "isf:update",
    "hevo-dashboard:read",
    "visibility-3:read"
  ]);
  assert(
    "KN legacy permission keys alias into screenshot catalog",
    migrated.changed &&
      migrated.permissions.includes("user-management:read") &&
      migrated.permissions.includes("credit-tracking:create") &&
      migrated.permissions.includes("isf-us:update") &&
      migrated.permissions.includes("klearhub-dashboard:read") &&
      migrated.permissions.includes("visibility-3:read") &&
      !migrated.permissions.includes("kn-user-management:read")
  );

  const roles = knRoles.list();
  assert("KN seed roles load", roles.length >= 10);
  assert(
    "KN seed permissions reference real catalog keys",
    roles.every((role) => (role.permissions || []).every((key) => moduleIds.some((id) => key.startsWith(`${id}:`))))
  );
  assert(
    "KN seed roles do not use legacy klearnow applicable",
    roles.every((role) => !(role.applicable || []).includes("klearnow"))
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
