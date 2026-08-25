/**
 * Blade behavioral stress tests — form / drawer data-integrity.
 *
 * Run: node tests/blade-behavior-stress.test.cjs
 *
 * Covers Role, Default Role, User drawers via shared KNAdminUX pure helpers
 * (mergePermissionSelections, applyPermissionToggle, applyUserField,
 * permissionReductionRisk, detectClearedRequiredUserFields, isRoleFormDirty).
 * Browser-only interaction notes print at the end.
 */
"use strict";

const assert = require("assert");
const { loadAdminUx } = require("./load-admin-ux.cjs");

const UX = loadAdminUx();
const ACTIONS = UX.DEFAULT_PERM_ACTIONS;

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

function sorted(setOrArr) {
  return [...(setOrArr instanceof Set ? setOrArr : setOrArr || [])].map(String).sort();
}

/** vm-sandbox arrays fail deepStrictEqual across realms — copy into host Array. */
function hostArr(value) {
  return Array.from(value || []).map((item) => (typeof item === "string" ? String(item) : item));
}

function assertSamePerms(actual, expected, msg) {
  assert.deepStrictEqual(sorted(actual), sorted(expected), msg);
}

/** Simulate a Role/Default Role drawer session in memory (no DOM). */
function createRoleDrawerSession(seed) {
  const snapshot = UX.snapshotRoleForm(seed);
  return {
    form: {
      id: seed.id || "",
      name: seed.name || "",
      applicable: (seed.applicable || []).slice(),
      services: (seed.services || []).slice(),
      permissions: new Set(seed.permissions || [])
    },
    formSnapshot: snapshot,
    openGroups: new Set(seed.openGroups || []),
    permQuery: "",
    dirty() {
      return UX.isRoleFormDirty(this.form, this.formSnapshot);
    },
    canSubmitEdit() {
      return Boolean(this.form.id) && this.dirty();
    },
    togglePerm(key, checked) {
      const result = UX.applyPermissionToggle(this.form.permissions, key, checked, ACTIONS);
      this.form = { ...this.form, permissions: result.permissions };
      return result;
    },
    /**
     * Emulate Role/Default Role toggleKeys (row/col/group header checkbox):
     * applyPermDependencyToggle → syncPermissionSet into the live form Set.
     */
    toggleKeys(keys) {
      const live = this.form.permissions;
      const result = UX.applyPermDependencyToggle(live, keys, ACTIONS);
      UX.syncPermissionSet(live, result.permissions);
      this.form = { ...this.form, permissions: live };
      return result;
    },
    /** Historical bug: clear()+forEach when result.permissions === live Set. */
    buggyToggleKeysWipe(keys) {
      const live = this.form.permissions;
      const permissions = live instanceof Set ? live : new Set(live);
      const list = keys.filter(Boolean);
      const allOn = list.every((key) => permissions.has(key));
      if (!allOn) {
        list.forEach((key) => permissions.add(key));
      } else {
        list.forEach((key) => permissions.delete(key));
      }
      // buggy syncPermSet
      live.clear();
      permissions.forEach((key) => live.add(key));
      this.form = { ...this.form, permissions: live };
    },
    /** Emulate filtered DOM readForm: only visible keys present in DOM. */
    syncFromPartialDom(visibleKeys, checkedVisibleKeys) {
      this.form = {
        ...this.form,
        permissions: UX.mergePermissionSelections(this.form.permissions, checkedVisibleKeys, visibleKeys)
      };
    },
    /** Buggy pre-fix pattern — DO NOT use in production. Kept for regression. */
    buggyReplaceFromDomChecked(checkedVisibleKeys) {
      this.form = { ...this.form, permissions: new Set(checkedVisibleKeys) };
    },
    setName(name) {
      this.form = { ...this.form, name };
    },
    setApplicable(applicable) {
      this.form = { ...this.form, applicable: applicable.slice() };
    },
    clearAllPermissions() {
      this.form = { ...this.form, permissions: new Set() };
    },
    setOpenGroups(ids) {
      this.openGroups = new Set(ids);
    },
    abandon() {
      return {
        id: seed.id || "",
        name: seed.name || "",
        applicable: (seed.applicable || []).slice(),
        services: (seed.services || []).slice(),
        permissions: new Set(seed.permissions || [])
      };
    },
    reopenFresh() {
      return createRoleDrawerSession(seed);
    }
  };
}

function createUserDrawerSession(seed) {
  const snapshot = {
    name: seed.name || "",
    email: seed.email || "",
    phoneCountry: seed.phoneCountry || "",
    phone: seed.phone || "",
    title: seed.title || "",
    reportsTo: seed.reportsTo || "",
    roles: (seed.roles || []).slice().sort().join("\0")
  };
  return {
    form: {
      id: seed.id || "",
      name: seed.name || "",
      email: seed.email || "",
      phoneCountry: seed.phoneCountry || "",
      phone: seed.phone || "",
      title: seed.title || "",
      reportsTo: seed.reportsTo || "",
      roles: (seed.roles || []).slice()
    },
    formSnapshot: snapshot,
    dirty() {
      const roles = (this.form.roles || []).slice().sort().join("\0");
      return (
        this.form.name !== snapshot.name ||
        this.form.email !== snapshot.email ||
        this.form.phoneCountry !== snapshot.phoneCountry ||
        this.form.phone !== snapshot.phone ||
        this.form.title !== snapshot.title ||
        this.form.reportsTo !== snapshot.reportsTo ||
        roles !== snapshot.roles
      );
    },
    setField(key, value) {
      this.form = UX.applyUserField(this.form, key, value);
    },
    syncRolesFromPartialDom(visible, checked) {
      this.form = {
        ...this.form,
        roles: UX.mergeDomMultiSelect(this.form.roles, checked, visible)
      };
    },
    abandon() {
      return {
        id: seed.id || "",
        name: seed.name || "",
        email: seed.email || "",
        phoneCountry: seed.phoneCountry || "",
        phone: seed.phone || "",
        title: seed.title || "",
        reportsTo: seed.reportsTo || "",
        roles: (seed.roles || []).slice()
      };
    },
    reopenFresh() {
      return createUserDrawerSession(seed);
    }
  };
}

const CAT_A = ["mod-a:read", "mod-a:create", "mod-a:update", "mod-a:delete"];
const CAT_B = ["mod-b:read", "mod-b:create", "mod-b:update", "mod-b:delete"];
const CAT_C = ["mod-c:read", "mod-c:create", "mod-c:update", "mod-c:delete"];
const FULL_SEED = {
  id: "role-1",
  name: "Customer Administrator",
  applicable: ["customer", "sub-customer"],
  services: ["all"],
  permissions: [...CAT_A, ...CAT_B, ...CAT_C],
  openGroups: ["a", "b"]
};

console.log("\n=== Part 2 — Blade behavior stress tests ===\n");

console.log("\n1b) Row/col/group toggleKeys must not cascade-wipe (SEV-1 2026-08-24)");
test("role: toggling an unrelated category row keeps prior category selections", () => {
  const session = createRoleDrawerSession({
    id: "role-finance",
    name: "Finance Credits Owner",
    applicable: ["klearnow"],
    permissions: [...CAT_A] // Finance-analog: only category A selected
  });
  // Simulate KlearHub row header checkbox (select all actions for mod-b)
  session.toggleKeys(CAT_B);
  assertSamePerms(session.form.permissions, [...CAT_A, ...CAT_B]);
  assert.strictEqual(session.form.permissions.size, 8);
});

test("role: historical same-ref syncPermSet WOULD wipe (documents the bug)", () => {
  const session = createRoleDrawerSession({
    id: "role-finance",
    name: "Finance Credits Owner",
    applicable: ["klearnow"],
    permissions: [...CAT_A]
  });
  session.buggyToggleKeysWipe(CAT_B);
  // When result.permissions === live Set, clear()+forEach leaves nothing.
  assert.strictEqual(session.form.permissions.size, 0, "buggy path must empty the Set");
});

test("role: AI ensureWriteImpliesRead + syncPermissionSet keeps unrelated keys", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  const live = session.form.permissions;
  live.add("mod-x:create");
  const ensured = UX.ensureWriteImpliesRead(live, ACTIONS);
  UX.syncPermissionSet(live, ensured.permissions);
  assert.ok(live.has("mod-a:read"));
  assert.ok(live.has("mod-b:create"));
  assert.ok(live.has("mod-c:delete"));
  assert.ok(live.has("mod-x:create"));
  assert.ok(live.has("mod-x:read"));
});

console.log("1) Rapid sequential edits");
test("role: rapid toggles accumulate to exact sum of actions", () => {
  const session = createRoleDrawerSession({
    id: "r1",
    name: "Ops",
    applicable: ["klearnow"],
    permissions: ["mod-a:read", "mod-b:read"]
  });
  session.togglePerm("mod-a:create", true);
  session.togglePerm("mod-c:read", true);
  session.togglePerm("mod-b:read", false);
  session.togglePerm("mod-a:update", true);
  assertSamePerms(session.form.permissions, [
    "mod-a:read",
    "mod-a:create",
    "mod-a:update",
    "mod-c:read"
  ]);
});

test("user: rapid field edits leave unrelated fields intact", () => {
  const session = createUserDrawerSession({
    id: "u1",
    name: "Ada Lovelace",
    email: "ada@klearnow.ai",
    phone: "555-0100",
    phoneCountry: "US",
    title: "Engineer",
    reportsTo: "rep-1",
    roles: ["KN Administrator", "Billing reviewer"]
  });
  session.setField("phone", "555-0199");
  session.setField("title", "Principal Engineer");
  session.setField("phone", "555-0100");
  assert.strictEqual(session.form.name, "Ada Lovelace");
  assert.strictEqual(session.form.email, "ada@klearnow.ai");
  assert.strictEqual(session.form.reportsTo, "rep-1");
  assert.deepStrictEqual(hostArr(session.form.roles), ["KN Administrator", "Billing reviewer"]);
  assert.strictEqual(session.form.title, "Principal Engineer");
  assert.strictEqual(session.form.phone, "555-0100");
});

console.log("\n2) Edit-then-revert (dirty / submit sync)");
test("role: edit then revert returns dirty=false and submit disabled", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  assert.strictEqual(session.dirty(), false);
  assert.strictEqual(session.canSubmitEdit(), false);
  session.setName("Customer Administrator (temp)");
  assert.strictEqual(session.dirty(), true);
  assert.strictEqual(session.canSubmitEdit(), true);
  session.setName("Customer Administrator");
  assert.strictEqual(session.dirty(), false);
  assert.strictEqual(session.canSubmitEdit(), false);
  assertSamePerms(session.form.permissions, FULL_SEED.permissions);
});

test("user: edit phone then revert — dirty false; other fields untouched", () => {
  const session = createUserDrawerSession({
    id: "u2",
    name: "Grace Hopper",
    email: "grace@klearnow.ai",
    phone: "555-0200",
    roles: ["Read-only Workspace"]
  });
  session.setField("phone", "555-9999");
  assert.strictEqual(session.dirty(), true);
  session.setField("phone", "555-0200");
  assert.strictEqual(session.dirty(), false);
  assert.strictEqual(session.form.name, "Grace Hopper");
  assert.strictEqual(session.form.email, "grace@klearnow.ai");
});

console.log("\n3) Partial abandonment");
test("role: close without save; reopen restores original", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  session.togglePerm("mod-a:delete", true);
  session.setName("WIP wipe");
  const abandoned = session.abandon();
  assertSamePerms(abandoned.permissions, FULL_SEED.permissions);
  assert.strictEqual(abandoned.name, FULL_SEED.name);
  const again = session.reopenFresh();
  assertSamePerms(again.form.permissions, FULL_SEED.permissions);
  assert.strictEqual(again.dirty(), false);
});

test("user: abandon unsaved edits; reopen intact", () => {
  const seed = {
    id: "u3",
    name: "Alan Turing",
    email: "alan@klearnow.ai",
    phone: "555-0300",
    roles: ["KN Administrator"]
  };
  const session = createUserDrawerSession(seed);
  session.setField("name", "CORRUPTED");
  session.setField("roles", []);
  const abandoned = session.abandon();
  assert.strictEqual(abandoned.name, seed.name);
  assert.deepStrictEqual(hostArr(abandoned.roles), seed.roles);
});

console.log("\n4) Large-scale toggle (clear all → check 1–2)");
test("role: clear all then check two — only those remain (+ read deps)", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  session.clearAllPermissions();
  assert.strictEqual(session.form.permissions.size, 0);
  session.togglePerm("mod-b:create", true);
  session.togglePerm("mod-c:read", true);
  assertSamePerms(session.form.permissions, ["mod-b:read", "mod-b:create", "mod-c:read"]);
});

console.log("\n5) Cross-record contamination");
test("role: unsaved A then open B → B is clean seed", () => {
  const a = createRoleDrawerSession(FULL_SEED);
  a.togglePerm("mod-a:delete", true);
  a.setName("Dirty A");
  const bSeed = {
    id: "role-2",
    name: "Read-only Workspace",
    applicable: ["customer"],
    permissions: ["mod-c:read"]
  };
  const b = createRoleDrawerSession(bSeed);
  assert.strictEqual(b.form.name, "Read-only Workspace");
  assertSamePerms(b.form.permissions, ["mod-c:read"]);
  assert.strictEqual(b.dirty(), false);
  assert.notStrictEqual(a.form.name, b.form.name);
});

test("user: unsaved A then open B → B clean", () => {
  const a = createUserDrawerSession({
    id: "ua",
    name: "User A",
    email: "a@klearnow.ai",
    roles: ["KN Administrator"]
  });
  a.setField("email", "wiped@evil.test");
  const b = createUserDrawerSession({
    id: "ub",
    name: "User B",
    email: "b@klearnow.ai",
    roles: ["Billing reviewer"]
  });
  assert.strictEqual(b.form.email, "b@klearnow.ai");
  assert.deepStrictEqual(hostArr(b.form.roles), ["Billing reviewer"]);
});

console.log("\n6) Destructive-change detection");
test("role: large permission drop triggers risk confirm payload", () => {
  const risk = UX.permissionReductionRisk(FULL_SEED.permissions, ["mod-c:read"], 36);
  assert.ok(risk, "expected risk object");
  assert.ok(risk.removed >= 5);
  assert.strictEqual(risk.inheritanceCount, 36);
  const msg = UX.formatPermissionReductionConfirm(risk, "customers");
  assert.match(msg, /remove ~/);
  assert.match(msg, /36 customers/);
});

test("role: tiny drop below threshold is not destructive", () => {
  const next = FULL_SEED.permissions.slice(0, -1);
  const risk = UX.permissionReductionRisk(FULL_SEED.permissions, next, 2);
  assert.strictEqual(risk, null);
});

test("default-role: same shared risk helper (customers noun)", () => {
  const risk = UX.permissionReductionRisk(FULL_SEED.permissions, ["mod-a:read"], 36);
  assert.ok(risk);
  assert.match(UX.formatPermissionReductionConfirm(risk, "customers"), /customers/);
});

test("user: cleared required fields blocked by anomaly detector", () => {
  const cleared = UX.detectClearedRequiredUserFields(
    { name: "Ada", email: "ada@klearnow.ai", roles: ["KN Administrator"] },
    { name: "", email: "ada@klearnow.ai", roles: ["KN Administrator"] }
  );
  assert.deepStrictEqual(hostArr(cleared), ["name"]);
  const rolesCleared = UX.detectClearedRequiredUserFields(
    { name: "Ada", email: "ada@klearnow.ai", roles: ["KN Administrator"] },
    { name: "Ada", email: "ada@klearnow.ai", roles: [] }
  );
  assert.deepStrictEqual(hostArr(rolesCleared), ["roles"]);
  const safe = UX.detectClearedRequiredUserFields(
    { name: "Ada", email: "ada@klearnow.ai", roles: ["KN Administrator"] },
    { name: "Ada", email: "ada@klearnow.ai", roles: ["KN Administrator"], phone: "x" }
  );
  assert.deepStrictEqual(hostArr(safe), []);
});

console.log("\n7) Concurrent category expand/collapse while toggling");
test("role: openGroups changes do not mutate permissions", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  const before = sorted(session.form.permissions);
  session.setOpenGroups(["a"]);
  session.togglePerm("mod-b:delete", true);
  session.setOpenGroups(["a", "b", "c"]);
  session.setOpenGroups([]);
  assertSamePerms(session.form.permissions, [...new Set([...before, "mod-b:delete"])]);
});

console.log("\n8) Search/filter + selection (hidden rows retain state)");
test("role: merge keeps hidden selections when filter shows subset", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  const visible = CAT_A;
  const checked = CAT_A.filter((k) => k !== "mod-a:create");
  session.syncFromPartialDom(visible, checked);
  assertSamePerms(session.form.permissions, [...checked, ...CAT_B, ...CAT_C]);
});

test("role: buggy DOM-only replace WOULD wipe — documents sev-1 class", () => {
  const session = createRoleDrawerSession(FULL_SEED);
  session.buggyReplaceFromDomChecked(["mod-a:read"]);
  assert.strictEqual(session.form.permissions.size, 1, "buggy path collapses to visible only");
});

test("role: fixed merge + toggle one unrelated key leaves siblings", () => {
  const prior = new Set([...CAT_A, ...CAT_B, ...CAT_C]);
  const result = UX.applyPermissionToggle(prior, "mod-d:create", true, ACTIONS);
  assertSamePerms(result.permissions, [...CAT_A, ...CAT_B, ...CAT_C, "mod-d:create", "mod-d:read"]);
});

test("syncPermissionSet refuses to clear when next is null/undefined", () => {
  const live = new Set(["keep:read", "keep:create"]);
  UX.syncPermissionSet(live, null);
  assertSamePerms(live, ["keep:read", "keep:create"]);
  UX.syncPermissionSet(live, undefined);
  assertSamePerms(live, ["keep:read", "keep:create"]);
});

// Realistic seed shapes from role-management.js / default-role-management.js seedRoles()
const FINANCE_CREDITS_OWNER = [
  "kn-credits-management:create",
  "kn-credits-management:update",
  "kn-credits-management:delete",
  "kn-credits-management:read",
  "kn-promo-code-management:create",
  "kn-promo-code-management:update",
  "kn-promo-code-management:delete",
  "kn-promo-code-management:read"
];
const ANALYTICS_VIEWER = [
  "hevo-dashboard:create",
  "hevo-dashboard:update",
  "hevo-dashboard:delete",
  "hevo-dashboard:read"
];
const CUSTOMER_ADMINISTRATOR = [
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
const KLEARHUB_VIS_ROW = [
  "visibility-data:create",
  "visibility-data:update",
  "visibility-data:delete",
  "visibility-data:read"
];
const UNRELATED_COL = ["overview:create", "visibility-3:create", "kn-visibility:create"];

/** Emulate saveRoles → localStorage JSON → loadRoles for kn-roles-v2 / kn-default-roles-v3. */
function persistRoleCatalog(storageKey, roles) {
  const serialized = JSON.stringify(roles);
  const parsed = JSON.parse(serialized);
  return { storageKey, serialized, roles: parsed };
}

console.log("\n9) Seed-shaped roles — toggle must never wipe unrelated categories (+ storage)");
test("Finance Credits Owner: single checkbox toggle keeps finance catalog", () => {
  const session = createRoleDrawerSession({
    id: "role-finance",
    name: "Finance Credits Owner",
    applicable: ["klearnow"],
    permissions: FINANCE_CREDITS_OWNER
  });
  session.togglePerm("hevo-dashboard:read", true);
  FINANCE_CREDITS_OWNER.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  assert.ok(session.form.permissions.has("hevo-dashboard:read"));
  assert.strictEqual(session.form.permissions.size, FINANCE_CREDITS_OWNER.length + 1);
});

test("Finance Credits Owner: row header toggleKeys keeps finance; storage round-trip intact", () => {
  const session = createRoleDrawerSession({
    id: "role-finance",
    name: "Finance Credits Owner",
    applicable: ["klearnow"],
    permissions: FINANCE_CREDITS_OWNER
  });
  session.toggleKeys(KLEARHUB_VIS_ROW);
  FINANCE_CREDITS_OWNER.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  KLEARHUB_VIS_ROW.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  const stored = persistRoleCatalog("kn-roles-v2", [
    {
      id: "role-finance",
      name: "Finance Credits Owner",
      permissions: [...session.form.permissions]
    }
  ]);
  const finance = stored.roles.find((r) => r.id === "role-finance");
  assert.strictEqual(stored.storageKey, "kn-roles-v2");
  FINANCE_CREDITS_OWNER.forEach((key) => assert.ok(finance.permissions.includes(key), `storage missing ${key}`));
  assert.ok(finance.permissions.length >= FINANCE_CREDITS_OWNER.length + KLEARHUB_VIS_ROW.length);
});

test("Analytics Viewer: col-style toggleKeys keeps hevo-dashboard keys", () => {
  const session = createRoleDrawerSession({
    id: "role-analytics",
    name: "Analytics Viewer",
    applicable: ["klearnow"],
    permissions: ANALYTICS_VIEWER
  });
  session.toggleKeys(UNRELATED_COL);
  ANALYTICS_VIEWER.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  UNRELATED_COL.forEach((key) => {
    assert.ok(session.form.permissions.has(key), `missing ${key}`);
    // create implies read
    const mod = key.split(":")[0];
    assert.ok(session.form.permissions.has(`${mod}:read`), `missing auto-read for ${mod}`);
  });
  const stored = persistRoleCatalog("kn-roles-v2", [
    { id: "role-analytics", name: "Analytics Viewer", permissions: [...session.form.permissions] }
  ]);
  const row = stored.roles.find((r) => r.id === "role-analytics");
  ANALYTICS_VIEWER.forEach((key) => assert.ok(row.permissions.includes(key)));
});

test("Customer Administrator: group toggle + partial DOM merge never wipes admin keys", () => {
  const session = createRoleDrawerSession({
    id: "def-customer-admin",
    name: "Customer Administrator",
    applicable: ["customer", "sub-customer"],
    services: ["all"],
    permissions: CUSTOMER_ADMINISTRATOR
  });
  // Simulate search: only visibility-data cells in DOM, all unchecked → old buggy path would wipe
  session.syncFromPartialDom(KLEARHUB_VIS_ROW, []);
  assertSamePerms(session.form.permissions, CUSTOMER_ADMINISTRATOR);
  session.toggleKeys(KLEARHUB_VIS_ROW);
  CUSTOMER_ADMINISTRATOR.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  KLEARHUB_VIS_ROW.forEach((key) => assert.ok(session.form.permissions.has(key)));
  // Single unrelated checkbox
  session.togglePerm("credit-tracking:read", true);
  CUSTOMER_ADMINISTRATOR.forEach((key) => assert.ok(session.form.permissions.has(key), `missing ${key}`));
  const stored = persistRoleCatalog("kn-default-roles-v3", [
    {
      id: "def-customer-admin",
      name: "Customer Administrator",
      permissions: [...session.form.permissions]
    }
  ]);
  const row = stored.roles.find((r) => r.id === "def-customer-admin");
  assert.strictEqual(stored.storageKey, "kn-default-roles-v3");
  CUSTOMER_ADMINISTRATOR.forEach((key) => assert.ok(row.permissions.includes(key), `storage missing ${key}`));
  assert.ok(row.permissions.includes("visibility-data:read"));
  assert.ok(row.permissions.includes("credit-tracking:read"));
});

test("default-role services: mergeDomMultiSelect preserves hidden services", () => {
  const prior = ["all", "drayage", "ai"];
  const visible = ["drayage", "ai", "klear-360"];
  const checked = ["drayage", "klear-360"];
  const next = UX.mergeDomMultiSelect(prior, checked, visible);
  assert.deepStrictEqual(sorted(next), sorted(["all", "drayage", "klear-360"]));
});

test("user roles: mergeDomMultiSelect preserves hidden roles under search", () => {
  const prior = ["KN Administrator", "Billing reviewer", "Read-only Workspace"];
  const visible = ["Billing reviewer", "Customs broker"];
  const checked = ["Billing reviewer"];
  const next = UX.mergeDomMultiSelect(prior, checked, visible);
  assert.deepStrictEqual(
    sorted(next),
    sorted(["KN Administrator", "Billing reviewer", "Read-only Workspace"])
  );
});

console.log("\nShared helper unit checks");
test("applyUserField is scoped immutable", () => {
  const form = { name: "A", email: "a@x.com", phone: "1", roles: ["R"] };
  const next = UX.applyUserField(form, "phone", "2");
  assert.strictEqual(form.phone, "1");
  assert.strictEqual(next.phone, "2");
  assert.strictEqual(next.name, "A");
  assert.deepStrictEqual(hostArr(next.roles), ["R"]);
});

test("applyPermissionToggle auto-adds Read for write actions", () => {
  const result = UX.applyPermissionToggle(new Set(), "mod-z:create", true, ACTIONS);
  assertSamePerms(result.permissions, ["mod-z:create", "mod-z:read"]);
  assert.strictEqual(result.autoCheckedRead, true);
});

test("applyPermissionToggle blocks unchecking Read while write remains", () => {
  const result = UX.applyPermissionToggle(
    new Set(["mod-z:read", "mod-z:create"]),
    "mod-z:read",
    false,
    ACTIONS
  );
  assert.strictEqual(result.blockedUncheckRead, true);
  assert.ok(result.permissions.has("mod-z:read"));
});

test("isRoleFormDirty tracks permission-only change", () => {
  const form = {
    name: "X",
    applicable: ["customer"],
    permissions: new Set(["a:read", "b:read"])
  };
  const snap = UX.snapshotRoleForm(form);
  assert.strictEqual(UX.isRoleFormDirty(form, snap), false);
  form.permissions.add("c:read");
  assert.strictEqual(UX.isRoleFormDirty(form, snap), true);
});

test("repairNearEmptySeedRoles restores wiped seed catalog rows", () => {
  const seeds = [
    { id: "def-customer-admin", name: "Customer Administrator", permissions: FULL_SEED.permissions }
  ];
  const stored = [
    { id: "def-customer-admin", name: "Customer Administrator", permissions: ["mod-c:read"] }
  ];
  const result = UX.repairNearEmptySeedRoles(stored, seeds);
  assert.ok(result.repairs.length >= 1);
  assert.strictEqual(result.roles[0].permissions.length, FULL_SEED.permissions.length);
});

console.log("\n=== Results ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failures.length) {
  failures.forEach((f) => {
    console.log(`\n--- ${f.name} ---`);
    console.log(f.error.stack || f.error.message);
  });
  process.exitCode = 1;
} else {
  console.log("\nAll automated stress cases passed.");
}

console.log(`
Manual browser checks (not automated — DOM + focus + Blade chrome):
  M1. Role drawer: search permissions → toggle one visible → clear search → hidden still checked.
  M2. Default Role: service multi-select search → uncheck visible → clear search → hidden services intact.
  M3. User: role menu search → toggle → clear search → hidden roles intact; chips-in-trigger × removes one only.
  M4. Dirty discard modal: edit → Cancel/overlay → Discard → reopen original.
  M5. Destructive save: strip many perms on Customer Administrator → confirm() fires with count + inheritance.
  M6. Tables: sort/filter/paginate Role + User + Default Role lists — underlying localStorage unchanged.
  M7. Active/Inactive toggle on drawer header does not clear permission matrix / user fields.
  M8. Dropdown outside-click closes (kn-close-selects); Escape closes drawer overlays.
`);
