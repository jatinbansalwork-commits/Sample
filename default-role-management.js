(() => {
  const STORAGE_KEY = "kn-default-roles-v3";
  const ACTIONS = ["create", "update", "delete", "read"];
  const ACTION_LABEL = { create: "Create", update: "Update", delete: "Delete", read: "Read" };
  const APPLICABLE = [
    { id: "customer", label: "Customer" },
    { id: "sub-customer", label: "Sub-customer" },
    { id: "company", label: "Company" },
    { id: "parties", label: "Parties" }
  ];
  const SERVICES = [
    { id: "all", label: "ALL" },
    { id: "ai", label: "AI" },
    { id: "customs-broker", label: "Customs Clearance Broker Service" },
    { id: "customs-engine", label: "Customs Engine" },
    { id: "data-engine", label: "Data Engine" },
    { id: "drayage", label: "Drayage" },
    { id: "klear-360", label: "Klear 360" }
  ];
  const CATALOG = [
    {
      id: "administration",
      title: "Administration",
      modules: [
        { id: "user-management", title: "User Management" },
        { id: "role-management", title: "Role Management" },
        { id: "contract-management", title: "Contract Management" }
      ]
    },
    {
      id: "entity",
      title: "Entity Management",
      modules: [
        { id: "sub-customer-profile", title: "Sub-Customer Profile" },
        { id: "companies-profile", title: "Companies Profile" },
        { id: "customer-profile", title: "Customer profile" },
        { id: "party-profile", title: "Party profile" }
      ]
    },
    {
      id: "finance",
      title: "Finance Management",
      modules: [
        { id: "credit-tracking", title: "Credit Tracking" },
        { id: "credit-purchase", title: "Credit Purchase" }
      ]
    },
    {
      id: "visibility",
      title: "Visibility",
      modules: [
        { id: "visibility", title: "Visibility" },
        { id: "visibility-2", title: "Visibility 2.0" },
        { id: "visibility-sec", title: "Visibility SEC" },
        { id: "visibility-3", title: "Visibility 3.0" },
        { id: "container", title: "Container" }
      ]
    },
    {
      id: "analytics",
      title: "Analytics",
      modules: [
        { id: "custom-engine-reports", title: "Custom Engine Reports" },
        { id: "klearnow-dashboards", title: "Klearnow Dashboards" },
        { id: "klearnow-reports", title: "Klearnow Reports" },
        { id: "data-mapper-reports", title: "Data Mapper Reports" }
      ]
    },
    {
      id: "billing",
      title: "Billing Management",
      modules: [
        { id: "ar-invoices", title: "AR Invoices" },
        { id: "ar-charge-list", title: "AR Charge List" },
        { id: "ar-overview", title: "AR Overview" },
        { id: "ap-invoices", title: "AP Invoices" },
        { id: "ap-charge-list", title: "AP Charge List" },
        { id: "ap-overview", title: "AP Overview" },
        { id: "broker-invoice-us", title: "Broker Invoice US" },
        { id: "broker-invoice-ca", title: "Broker Invoice CA" },
        { id: "invoices-360", title: "360 Invoices" }
      ]
    },
    {
      id: "payment-uk",
      title: "Payment - UK",
      modules: [{ id: "statement-uk", title: "Statement" }]
    },
    {
      id: "payment-ca",
      title: "Payment - CA",
      modules: [{ id: "statement-ca", title: "Statement" }]
    },
    {
      id: "txn-uk",
      title: "Transaction Management - UK",
      modules: [
        { id: "import-uk", title: "Import" },
        { id: "export-uk", title: "Export" }
      ]
    },
    {
      id: "txn-us",
      title: "Transaction Management - US",
      modules: [
        { id: "isf-us", title: "ISF" },
        { id: "inbound-us", title: "Inbound" },
        { id: "entry-us", title: "Entry" },
        { id: "do-us", title: "DO" },
        { id: "psc-us", title: "PSC" },
        { id: "protest-us", title: "Protest" },
        { id: "drayage-us", title: "Drayage" },
        { id: "export-us", title: "Export" },
        { id: "shipments-us", title: "Shipments" }
      ]
    },
    {
      id: "txn-in",
      title: "Transaction Management - IN",
      modules: [
        { id: "import-in", title: "Import" },
        { id: "export-in", title: "Export" }
      ]
    },
    {
      id: "txn-ca",
      title: "Transaction Management - CA",
      modules: [
        { id: "entry-ca", title: "Entry" },
        { id: "isf-ca", title: "ISF" },
        { id: "lvs-ca", title: "LVS" }
      ]
    },
    {
      id: "einvoices",
      title: "E-Invoices & Documents",
      modules: [{ id: "einvoices-docs", title: "E-Invoices & Documents" }]
    },
    {
      id: "drm",
      title: "DRM Management",
      modules: [
        { id: "inwarding-pipeline", title: "Inwarding Pipeline" },
        { id: "drm-dashboard", title: "DRM Dashboard" },
        { id: "drm-ops-hub", title: "DRM Ops Hub Dashboard" },
        { id: "drm-manage-hub", title: "DRM Manage Hub Dashboard" },
        { id: "drm-tracking", title: "Tracking" }
      ]
    },
    {
      id: "notifications",
      title: "Notifications Management",
      modules: [{ id: "notifications-system", title: "Notifications Management (System Info)" }]
    },
    {
      id: "master-data",
      title: "Master Data Management",
      modules: [
        { id: "parts-library", title: "Parts Library" },
        { id: "customs-master", title: "Customs Master Tables" },
        { id: "customs-queries", title: "Customs Queries" }
      ]
    },
    {
      id: "drayage",
      title: "Drayage",
      modules: [{ id: "drayage-marketplace", title: "Drayage market place" }]
    },
    {
      id: "logistics",
      title: "Logistics",
      modules: [{ id: "logistics", title: "Logistics" }]
    }
  ];
  const ALL_KEYS = CATALOG.flatMap((group) => group.modules.flatMap((mod) => ACTIONS.map((action) => keyOf(mod.id, action))));

  const state = {
    sortKey: "name",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
    filters: { name: "", applicable: "", service: "", createdBy: "", status: "", coverage: "", chip: "all" },
    form: null,
    formSnapshot: null,
    dirty: false,
    drawerMode: "edit",
    detailsOpen: false,
    unusedOpen: false,
    permInputMode: "describe",
    seenUsedGroups: null,
    serviceMenuOpen: false,
    serviceQuery: "",
    selectOpen: "",
    modal: "",
    deleteId: "",
    deactivateId: "",
    pendingSaveSnap: null,
    permReduceMsg: "",
    leaveTo: "",
    restoreFocusId: "",
    openGroups: null,
    menuOpen: "",
    permQuery: "",
    permSelectedOnly: false,
    aiDescribe: "",
    aiLoading: false,
    aiNoMatch: false,
    aiSuggestions: {},
    aiApplicableSuggestions: [],
    aiServiceSuggestions: [],
    aiApplicableReasons: {},
    aiServiceReasons: {},
    aiFieldMeta: {},
    permAutoRead: {},
    permBlockedMsg: {},
    aiSeed: "new-drole"
  };

  // Shared AI Suggest & Draft engine (see ai-suggest.js).
  function deriveAiSuggestions(description) {
    if (!window.KNAiSuggest?.deriveDefaultRoleSuggestions) {
      return { suggestions: new Map(), groups: new Set(), applicables: [], services: [], noMatch: false };
    }
    return window.KNAiSuggest.deriveDefaultRoleSuggestions(description, { actions: ACTIONS, keyOf });
  }

  function applyAiDescription(description) {
    const root = document.getElementById("kn-default-role-root");
    const formEl = root?.querySelector("#kn-drole-form");
    if (!formEl || !state.form) {
      return;
    }
    state.aiDescribe = description;
    clearTimeout(state._aiDebounce);
    if (!description.trim()) {
      state.aiLoading = false;
      state.aiNoMatch = false;
      state.aiSuggestions = {};
      state.aiApplicableSuggestions = [];
      state.aiServiceSuggestions = [];
      persistForm(readForm(formEl));
      render();
      requestAnimationFrame(() => {
        document.getElementById("kn-default-role-root")?.querySelector("[data-ai-describe='drole']")?.focus();
      });
      return;
    }
    state.aiLoading = true;
    persistForm(readForm(formEl));
    render();
    requestAnimationFrame(() => {
      const input = document.getElementById("kn-default-role-root")?.querySelector("[data-ai-describe='drole']");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    });
    state._aiDebounce = setTimeout(() => {
      const liveRoot = document.getElementById("kn-default-role-root");
      if (!state.form || !liveRoot?.querySelector("#kn-drole-form")) {
        state.aiLoading = false;
        return;
      }
      const { suggestions, applicables, services, noMatch, edgeMessage, reasonsByField } = deriveAiSuggestions(description);
      const suggestionsObj = {};
      suggestions.forEach((reason, key) => {
        suggestionsObj[key] = reason;
      });
      persistForm(readForm(liveRoot.querySelector("#kn-drole-form")));
      const snap = readForm(liveRoot.querySelector("#kn-drole-form"));
      suggestions.forEach((reason, key) => {
        snap.permissions.add(key);
      });
      const ensured = window.KNAdminUX.ensureWriteImpliesRead(snap.permissions, ACTIONS);
      syncPermSet(snap.permissions, ensured.permissions);
      if (ensured.autoCheckedRead) {
        applyPermDepFeedback(ensured);
      }
      const applicableMerge = window.KNAiSuggest.mergeAiSelections(
        snap.applicable,
        applicables,
        state.aiApplicableSuggestions
      );
      const serviceMerge = window.KNAiSuggest.mergeAiSelections(
        snap.services,
        services,
        state.aiServiceSuggestions
      );
      snap.applicable = applicableMerge.next;
      snap.services = serviceMerge.next;
      state.aiSuggestions = suggestionsObj;
      state.aiApplicableSuggestions = applicableMerge.aiOnly;
      state.aiServiceSuggestions = serviceMerge.aiOnly;
      state.aiApplicableReasons = Object.fromEntries(
        applicableMerge.aiOnly.map((id) => [id, reasonsByField?.[`applicable:${id}`] || "Suggested from description"])
      );
      state.aiServiceReasons = Object.fromEntries(
        serviceMerge.aiOnly.map((id) => [id, reasonsByField?.[`service:${id}`] || "Suggested from description"])
      );
      state.aiLoading = false;
      state.aiNoMatch = noMatch;
      window.KNAiSuggest?.logAudit?.({
        action: "suggest-default-role",
        context: "default-role",
        field: "permissions,applicable,services",
        origin: "ai",
        value: Object.keys(suggestionsObj).join(","),
        meta: {
          applicables: applicableMerge.aiOnly,
          services: serviceMerge.aiOnly,
          noMatch,
          edgeMessage: edgeMessage || ""
        }
      });
      const affectedGroups = new Set();
      CATALOG.forEach((group) => {
        const groupHasSuggestion = groupKeys(group).some((key) => suggestionsObj[key]);
        if (groupHasSuggestion) {
          affectedGroups.add(group.id);
        }
      });
      state.openGroups = affectedGroups;
      state.seenUsedGroups = new Set(usedGroupIds(snap.permissions));
      state.unusedOpen = false;
      persistForm(snap);
      render();
      requestAnimationFrame(() => {
        const input = liveRoot.querySelector("[data-ai-describe='drole']");
        if (input) {
          input.focus();
          const end = input.value.length;
          input.setSelectionRange(end, end);
        }
        const liveEl = liveRoot.querySelector("[data-ai-live-drole]");
        if (liveEl) {
          if (noMatch) {
            liveEl.textContent = edgeMessage || window.KNAiSuggest?.MESSAGES?.noMatch || "No strong matches.";
          } else if (suggestions.size > 0) {
            const applicableTip = applicables.length
              ? ` Also suggested: ${applicables.map((a) => APPLICABLE.find((x) => x.id === a)?.label || a).join(", ")}.`
              : "";
            const serviceTip = services.length
              ? ` Services: ${services.map((s) => SERVICES.find((x) => x.id === s)?.label || s).join(", ")}.`
              : "";
            const tip = edgeMessage ? ` ${edgeMessage}` : "";
            liveEl.textContent = `${suggestions.size} permissions suggested.${applicableTip}${serviceTip} Review them below.${tip}`;
          }
        }
      });
    }, 600);
  }

  function keyOf(moduleId, action) {
    return `${moduleId}:${action}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function labelOf(list, id) {
    return list.find((item) => item.id === id)?.label || id;
  }

  const WORKSPACES = [
    "Bosch North America",
    "Unilever Supply Chain",
    "Siemens Logistics",
    "Expeditors",
    "Maersk Line",
    "Flexport",
    "Caterpillar Trade Services",
    "IKEA Supply AG",
    "Samsung SDS Americas",
    "Toyota Motor North America",
    "Nestlé USA",
    "Procter & Gamble",
    "HP Inc.",
    "Dell Technologies",
    "3M Company",
    "Honeywell International"
  ];

  function inheritNames(role) {
    return Array.isArray(role.customers) ? role.customers.filter(Boolean) : [];
  }

  function inheritCount(role) {
    return Number(role.inherited) || inheritNames(role).length;
  }

  function inheritTip(role) {
    const names = inheritNames(role);
    if (!names.length) {
      return "";
    }
    const extra = Math.max(0, inheritCount(role) - names.length);
    const text = extra ? `${names.join(", ")}, and ${extra} more` : names.join(", ");
    return ` data-tooltip="${escapeHtml(text)}" data-tooltip-title="Who inherits this"`;
  }

  function renderInheritors(role) {
    const names = inheritNames(role);
    const extra = Math.max(0, inheritCount(role) - names.length);
    if (!names.length && !extra) {
      return `<p class="type-body-sm">No workspaces inherit this template yet.</p>`;
    }
    return `${window.KNAdminUX.chipsOverflow(names, 8)}${
      extra ? `<p class="type-caption-sm">${extra} more workspace${extra === 1 ? "" : "s"}</p>` : ""
    }`;
  }

  function seedRoles() {
    const tanya = "Tanya Agrawal";
    const priya = "Priya Menon";
    const daniel = "Daniel Chen";
    const vis = ALL_KEYS.filter((key) => key.startsWith("visibility") || key.startsWith("container:"));
    const k360 = ALL_KEYS.filter((key) => /invoices-360|visibility-3|klearnow-dashboards/.test(key));
    const engine = ALL_KEYS.filter((key) => /data-mapper|customs-master|customs-queries|drayage/.test(key));
    const billing = ALL_KEYS.filter((key) => /ar-|ap-|broker-invoice|einvoices|statement/.test(key));
    const txnUs = ALL_KEYS.filter((key) => key.includes("-us:"));
    const slice = (start, count) => WORKSPACES.slice(start, start + count);
    return [
      { id: "def-visibility", name: "Visibility Customer Default", applicable: ["customer", "company", "sub-customer"], services: ["all"], createdBy: tanya, active: true, inherited: 48, customers: slice(0, 8), updatedAt: "2026-08-18T10:00:00", permissions: vis },
      { id: "def-k360", name: "Klear 360 Billing Default", applicable: ["parties"], services: ["klear-360"], createdBy: priya, active: true, inherited: 12, customers: slice(4, 12), updatedAt: "2026-08-16T14:20:00", permissions: k360 },
      { id: "def-data-engine", name: "Data Engine + Drayage Default", applicable: ["customer"], services: ["drayage", "data-engine"], createdBy: daniel, active: true, inherited: 21, customers: slice(2, 10), updatedAt: "2026-08-14T09:12:00", permissions: engine },
      { id: "def-customer-admin", name: "Customer Administrator", applicable: ["customer", "sub-customer"], services: ["all"], createdBy: tanya, active: true, inherited: 36, customers: slice(1, 9), updatedAt: "2026-08-19T08:40:00", permissions: ALL_KEYS.filter((key) => /user-management|role-management|customer-profile|sub-customer/.test(key)) },
      { id: "def-full-customer", name: "Full Customer Access", applicable: ["customer", "sub-customer", "company"], services: ["all"], createdBy: tanya, active: true, inherited: 22, customers: slice(0, 7), updatedAt: "2026-08-20T09:15:00", permissions: vis.concat(k360, engine) },
      { id: "def-finance", name: "Finance & Credits Default", applicable: ["customer", "company"], services: ["customs-engine"], createdBy: priya, active: false, inherited: 8, customers: slice(6, 14), updatedAt: "2026-07-30T11:00:00", permissions: billing.concat(ALL_KEYS.filter((key) => key.startsWith("credit-"))) },
      { id: "def-broker", name: "Licensed Broker Operations", applicable: ["parties", "company"], services: ["customs-broker"], createdBy: priya, active: true, inherited: 9, customers: ["Expeditors", "Maersk Line", "Flexport", "Bosch North America", "Siemens Logistics", "Honeywell International", "3M Company", "HP Inc.", "Dell Technologies"], updatedAt: "2026-08-12T16:05:00", permissions: ALL_KEYS.filter((key) => /broker-invoice|isf|entry|psc|protest/.test(key)) },
      { id: "def-drayage", name: "Drayage Marketplace Default", applicable: ["customer"], services: ["drayage"], createdBy: daniel, active: true, inherited: 17, customers: slice(8, 16), updatedAt: "2026-08-11T07:22:00", permissions: ALL_KEYS.filter((key) => /drayage/.test(key)) },
      { id: "def-ai", name: "Intelligent OPS Default", applicable: ["customer", "company"], services: ["ai"], createdBy: tanya, active: true, inherited: 6, customers: slice(10, 16), updatedAt: "2026-08-08T13:18:00", permissions: ALL_KEYS.filter((key) => /klearnow-dashboards|custom-engine|data-mapper/.test(key)) },
      { id: "def-txn-us", name: "US Transaction Default", applicable: ["customer", "sub-customer", "company"], services: ["all"], createdBy: priya, active: true, inherited: 29, customers: slice(3, 11), updatedAt: "2026-08-15T10:50:00", permissions: txnUs },
      { id: "def-drm", name: "DRM Operations Default", applicable: ["company"], services: ["data-engine"], createdBy: daniel, active: false, inherited: 4, customers: ["Bosch North America", "Siemens Logistics", "Caterpillar Trade Services", "Honeywell International"], updatedAt: "2026-07-21T09:30:00", permissions: ALL_KEYS.filter((key) => key.startsWith("drm") || key.startsWith("inwarding")) },
      { id: "def-notify", name: "Notification Subscriber", applicable: ["customer"], services: ["all"], createdBy: tanya, active: true, inherited: 52, customers: slice(0, 8), updatedAt: "2026-08-17T12:00:00", permissions: ALL_KEYS.filter((key) => key.startsWith("notifications")) },
      { id: "def-read", name: "Read-only Workspace", applicable: ["customer", "sub-customer", "company", "parties"], services: ["all"], createdBy: priya, active: true, inherited: 61, customers: slice(5, 13), updatedAt: "2026-08-13T15:45:00", permissions: ALL_KEYS.filter((key) => key.endsWith(":read")) }
    ];
  }

  function loadRoles() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      let roles;
      if (!raw) {
        roles = seedRoles();
      } else {
        const parsed = JSON.parse(raw);
        roles = Array.isArray(parsed) && parsed.length ? parsed : seedRoles();
      }
      const repaired = window.KNAdminUX?.repairNearEmptySeedRoles?.(roles, seedRoles());
      if (repaired?.repairs?.length) {
        saveRoles(repaired.roles);
        const summary = repaired.repairs.map((item) => `${item.name} (${item.from}→${item.to})`).join(", ");
        console.info(`[KNDefaultRoles] Restored near-empty seeded roles from catalog: ${summary}`);
        roles = repaired.roles;
      }
      const seed = seedRoles();
      const ids = new Set(roles.map((role) => role.id));
      const missing = seed.filter((item) => !ids.has(item.id));
      if (missing.length) {
        roles = roles.concat(missing);
        saveRoles(roles);
      }
      return roles;
    } catch (error) {
      return seedRoles();
    }
  }

  function saveRoles(roles) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  }

  function uid() {
    return `def-role-${Date.now().toString(36)}`;
  }

  function parseRoute(hash = location.hash) {
    const path = (hash || "#dashboard").split("?")[0];
    if (path === "#default-role-management/add") {
      return { view: "form", id: "", preferEdit: true };
    }
    const edit = path.match(/^#default-role-management\/edit\/([^/?#]+)/);
    if (edit) {
      return { view: "form", id: decodeURIComponent(edit[1]), preferEdit: true };
    }
    const detail = path.match(/^#default-role-management\/([^/?#]+)$/);
    if (detail && detail[1] !== "add") {
      return { view: "form", id: decodeURIComponent(detail[1]), preferEdit: false };
    }
    return { view: "list", id: "", preferEdit: false };
  }

  function findRole(id) {
    return loadRoles().find((role) => role.id === id);
  }

  function adminSelect(opts) {
    return window.KNAdminUX.select({
      open: state.selectOpen,
      ...opts
    });
  }

  function requestLeave(hash) {
    if (!isFormDataDirty(state.form)) {
      finishLeave(hash);
      return true;
    }
    state.leaveTo = hash;
    render();
    return false;
  }

  function finishLeave(hash = state.leaveTo) {
    const to = hash || "#default-role-management";
    if (state.form?.id && String(to).split("?")[0] === "#default-role-management") {
      state.restoreFocusId = state.form.id;
    }
    state.leaveTo = "";
    state.dirty = false;
    state.serviceMenuOpen = false;
    window.KNAdminUX.beginNavigation();
    goto(to);
  }

  function renderModals() {
    const role = state.modal === "delete" ? findRole(state.deleteId) : state.modal === "deactivate" ? findRole(state.deactivateId) : null;
    const inherited = role ? inheritCount(role) : 0;
    return `${window.KNAdminUX.discardModal({
      open: Boolean(state.leaveTo),
      title: "Discard changes",
      description: "Unsaved default role changes will be lost.",
      confirmLabel: "Discard"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "delete" && Boolean(role),
      title: "Delete Default Role?",
      description: `Are you sure you want to delete ${role?.name || "this template"}?${inherited ? ` ${inherited} ${inherited === 1 ? "workspace inherits" : "workspaces inherit"} it.` : " Customers who already inherited it keep their current access."}`,
      actionLabel: "Delete Default Role",
      actionAttr: "data-drole-delete-confirm"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "deactivate" && Boolean(role),
      title: "Deactivate template?",
      description: `${role?.name || "This template"} is still inherited by ${inherited} ${inherited === 1 ? "workspace" : "workspaces"}.`,
      actionLabel: "Deactivate",
      actionAttr: "data-drole-deactivate-confirm"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "perm-reduce" && Boolean(state.pendingSaveSnap),
      title: "Remove permissions?",
      description: state.permReduceMsg || "This will significantly reduce permissions on this template.",
      actionLabel: "Update Default Role",
      actionAttr: "data-drole-perm-reduce-confirm"
    })}`;
  }

  function goto(hash) {
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function toast(content, color = "positive") {
    if (typeof window.showBladeToast === "function") {
      window.showBladeToast({ content, color });
    }
  }

  function iconClose() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  }

  function filteredRoles() {
    const q = (value) => String(value || "").toLowerCase();
    const rows = loadRoles().filter((role) => {
      const nameOk = !state.filters.name || q(role.name).includes(q(state.filters.name));
      const createdOk = !state.filters.createdBy || q(role.createdBy).includes(q(state.filters.createdBy));
      const appOk = !state.filters.applicable || role.applicable.some((id) => labelOf(APPLICABLE, id).toLowerCase() === state.filters.applicable.toLowerCase());
      const serviceOk = !state.filters.service || role.services.some(id => id.toLowerCase() === state.filters.service.toLowerCase());
      const statusHay = role.active ? "Active" : "Inactive";
      const statusOk = !state.filters.status || statusHay === state.filters.status;
      const coverageHay = `${(role.permissions || []).length} ${Math.round(((role.permissions || []).length / Math.max(1, ALL_KEYS.length)) * 100)}`;
      const coverageOk = !state.filters.coverage || coverageHay.includes(q(state.filters.coverage));
      const chip = state.filters.chip;
      const chipOk =
        chip === "all" ||
        (chip === "active" && role.active) ||
        (chip === "inactive" && !role.active) ||
        (chip === "broker" && role.services.includes("customs-broker"));
      return nameOk && createdOk && appOk && serviceOk && statusOk && coverageOk && chipOk;
    });
    const dir = state.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av;
      let bv;
      if (state.sortKey === "status") {
        av = Number(a.active);
        bv = Number(b.active);
      } else if (state.sortKey === "applicable") {
        av = q(formatApplicable(a));
        bv = q(formatApplicable(b));
      } else if (state.sortKey === "services") {
        av = q(formatServices(a));
        bv = q(formatServices(b));
      } else if (state.sortKey === "coverage") {
        av = (a.permissions || []).length;
        bv = (b.permissions || []).length;
      } else {
        av = q(a[state.sortKey]);
        bv = q(b[state.sortKey]);
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function formatApplicable(role) {
    return role.applicable.map((id) => labelOf(APPLICABLE, id)).join(", ");
  }

  function formatServices(role) {
    return role.services.map((id) => labelOf(SERVICES, id)).join(", ");
  }

  function hasListFilters() {
    const filters = state.filters;
    return Boolean(
      filters.name || filters.applicable || filters.service || filters.createdBy || filters.status || filters.coverage || filters.chip !== "all"
    );
  }

  function clearFilters() {
    state.filters = { name: "", applicable: "", service: "", createdBy: "", status: "", coverage: "", chip: "all" };
    state.page = 1;
    render();
  }

  function sortHeader(key, label) {
    return window.KNAdminUX.sortHeader({
      key,
      label,
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      attr: "data-drole-sort"
    });
  }

  function renderList() {
    const route = parseRoute();
    const selectedId = route.view === "list" ? "" : route.id;
    const rows = filteredRoles();
    const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > pages) {
      state.page = pages;
    }
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);
    const body = pageRows.length
      ? pageRows
          .map((role) => `<tr data-drole-id="${escapeHtml(role.id)}" tabindex="0" class="${role.id === selectedId ? "is-selected" : ""}">
          <td>
            ${window.KNAdminUX.titleCell({
              title: role.name,
              subtitle: `${inheritCount(role) ? `${inheritCount(role)} ${inheritCount(role) === 1 ? "customer inherits" : "customers inherit"} this` : "No customers inherit this"} · Updated ${window.KNAdminUX.relativeTime(role.updatedAt)}`,
              href: `#default-role-management/${encodeURIComponent(role.id)}`,
              navAttr: `data-drole-nav="detail" data-drole-id="${escapeHtml(role.id)}"${inheritTip(role)}`,
              initials: window.KNAdminUX.initials(role.name)
            })}
          </td>
          <td class="admin-table-chips">${window.KNAdminUX.chipsOverflow(role.applicable.map((id) => labelOf(APPLICABLE, id)))}</td>
          <td class="admin-table-chips">${window.KNAdminUX.chipsOverflow(role.services.map((id) => labelOf(SERVICES, id)))}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(role.createdBy)}</td>
          <td>${window.KNAdminUX.coverage(role.permissions, ALL_KEYS.length)}</td>
          <td>${window.KNAdminUX.statusBadge(role.active)}</td>
          <td>
            <div class="user-row-actions">
              <button class="icon-btn" type="button" data-drole-edit="${escapeHtml(role.id)}" aria-label="Edit ${escapeHtml(role.name)}" data-tooltip="Edit default role">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/></svg>
              </button>
              ${window.KNAdminUX.moreMenu({
                id: role.id,
                open: state.menuOpen === role.id,
                items: [
                  { label: "Duplicate", attr: `data-drole-duplicate="${escapeHtml(role.id)}"` },
                  { label: "Delete", attr: `data-drole-delete="${escapeHtml(role.id)}"`, tone: "negative" }
                ]
              })}
            </div>
          </td>
        </tr>`)
          .join("")
      : `<tr class="role-empty-row"><td colspan="7">${window.KNAdminUX.emptyState({
          title: hasListFilters() ? "No default roles match this view" : "No templates yet",
          description: hasListFilters() ? "Clear filters to see every template, or add a new one." : "Add a template so customers and brokers inherit access.",
          primaryLabel: "Add Default Role",
          primaryHref: "#default-role-management/add",
          primaryAttr: 'data-drole-nav="add"',
          secondaryLabel: hasListFilters() ? "Clear filters" : "",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    const all = loadRoles();
    const ux = window.KNAdminUX;
    const chip = state.filters.chip;
    const inactive = all.filter((role) => !role.active);
    const inheritedInactive = inactive.filter((role) => inheritCount(role) > 0);

    return `<header class="role-page__head">
      <div>
        <h1 class="type-heading-h3 type-weight-semibold">Default Role Management</h1>
        <p class="type-body-sm">Templates customers and brokers inherit when they join KlearNow.</p>
      </div>
      <a class="btn btn--primary btn--md type-ui-md" href="#default-role-management/add" data-drole-nav="add">Add Default Role</a>
    </header>
    ${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: all.length, selected: chip === "all" },
        { id: "active", label: "Active", count: all.filter((role) => role.active).length, selected: chip === "active" },
        { id: "inactive", label: "Inactive", count: inactive.length, selected: chip === "inactive" },
        { id: "broker", label: "Broker services", count: all.filter((role) => role.services.includes("customs-broker")).length, selected: chip === "broker" }
      ],
      results: `${rows.length} ${rows.length === 1 ? "template" : "templates"}. Page ${state.page} of ${pages}. Sorted by ${state.sortKey}, ${state.sortDir === "desc" ? "descending" : "ascending"}.`,
      insight: null
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin" aria-label="Default roles">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("name", "Role Name")}
              ${sortHeader("applicable", "Applicable To")}
              ${sortHeader("services", "Services")}
              ${sortHeader("createdBy", "Owner")}
              ${sortHeader("coverage", "Coverage")}
              ${sortHeader("status", "Status")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-drole-filter", key: "name", value: state.filters.name, label: "role name", placeholder: "Search by role name" })}
              ${ux.colBladeSelect({ attr: "data-drole-filter", key: "applicable", value: state.filters.applicable, label: "applicable to", open: state.selectOpen, options: [
                { value: "Customer", label: "Customer" },
                { value: "Sub-customer", label: "Sub-customer" },
                { value: "Company", label: "Company" },
                { value: "Parties", label: "Parties" }
              ]})}
              ${ux.colBladeSelect({ attr: "data-drole-filter", key: "service", value: state.filters.service, label: "services", open: state.selectOpen, options: SERVICES.map(s => ({ value: s.id, label: s.label })) })}
              ${ux.colFilter({ attr: "data-drole-filter", key: "createdBy", value: state.filters.createdBy, label: "owner", placeholder: "Search by owner" })}
              ${ux.colFilter({ attr: "data-drole-filter", key: "coverage", value: state.filters.coverage, label: "coverage" })}
              ${ux.colBladeSelect({ attr: "data-drole-filter", key: "status", value: state.filters.status, label: "status", open: state.selectOpen, options: [
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Draft", label: "Draft" }
              ]})}
              ${ux.emptyColFilter()}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({
        page: state.page,
        pages,
        total: rows.length,
        pageSize: state.pageSize,
        pageAttr: "data-drole-page",
        label: "Default role pages",
        sizeSelect: adminSelect({
          id: "kn-drole-pagesize",
          name: "pageSize",
          value: String(state.pageSize),
          options: [
            { id: "10", label: "10" },
            { id: "20", label: "20" },
            { id: "50", label: "50" }
          ],
          placeholder: "Rows",
          openKey: "pageSize",
          compact: true,
          includeEmpty: false
        })
      })}
    </div>
    ${state.form ? renderFormDrawer() : ""}
    ${renderModals()}`;
  }

  function blankForm(role) {
    return {
      id: role?.id || "",
      name: role?.name || "",
      applicable: role?.applicable?.slice() || [],
      services: role?.services?.slice() || [],
      permissions: new Set(role?.permissions || []),
      error: "",
      serviceError: ""
    };
  }

  /** Prefill Add Default Role from panel draft — never submits. */
  function applyPendingAiDraft() {
    const draft = window.KNAiSuggest?.consumeDraft?.("default-role");
    if (!draft || !state.form) {
      return;
    }
    state.form.name = draft.name || state.form.name;
    if (Array.isArray(draft.applicable) && draft.applicable.length) {
      state.form.applicable = draft.applicable.slice();
      state.aiApplicableSuggestions = draft.applicable.slice();
      state.aiApplicableReasons = draft.applicableReasons || {};
    }
    if (Array.isArray(draft.services) && draft.services.length) {
      state.form.services = draft.services.slice();
      state.aiServiceSuggestions = draft.services.slice();
      state.aiServiceReasons = draft.serviceReasons || {};
    }
    const suggestionsObj = { ...(draft.permissions || {}) };
    Object.keys(suggestionsObj).forEach((key) => state.form.permissions.add(key));
    if (window.KNAdminUX?.ensureWriteImpliesRead) {
      const ensured = window.KNAdminUX.ensureWriteImpliesRead(state.form.permissions, ACTIONS);
      syncPermSet(state.form.permissions, ensured.permissions);
    }
    state.aiSuggestions = suggestionsObj;
    state.aiDescribe = draft.description || "";
    state.permInputMode = "describe";
    const affected = new Set();
    CATALOG.forEach((group) => {
      if (groupKeys(group).some((key) => suggestionsObj[key])) {
        affected.add(group.id);
      }
    });
    state.openGroups = affected;
    state.seenUsedGroups = new Set(usedGroupIds(state.form.permissions));
    state.unusedOpen = false;
    state.aiFieldMeta = { name: draft.nameReason || "Prefill from Klear Assistant draft" };
    state.formSnapshot = snapshotForm(state.form);
    state.dirty = isFormDataDirty(state.form);
    window.KNAiSuggest?.logAudit?.({
      action: "apply-draft-to-form",
      context: "default-role",
      field: "form",
      origin: "ai",
      value: state.form.name
    });
    toast("AI draft applied to the form — review and click Add Default Role to save.", "notice");
  }

  function snapshotForm(form) {
    return window.KNAdminUX.snapshotRoleForm(form);
  }

  function isFormDataDirty(formData) {
    return window.KNAdminUX.isRoleFormDirty(formData, state.formSnapshot);
  }

  function canSubmitRole(formData = state.form) {
    if (!formData) {
      return false;
    }
    if (formData.id) {
      return isFormDataDirty(formData);
    }
    return Boolean(String(formData.name || "").trim()) && (formData.permissions?.size || 0) > 0;
  }

  function syncSubmitBtn(root) {
    const btn = (root || document).querySelector("#kn-drole-submit-btn");
    if (!btn) {
      return;
    }
    const enabled = canSubmitRole();
    btn.disabled = !enabled;
    btn.setAttribute("aria-disabled", enabled ? "false" : "true");
    state.dirty = isFormDataDirty(state.form);
  }

  function usedGroupIds(permissions) {
    return CATALOG.filter((group) => groupKeys(group).some((key) => permissions.has(key))).map((group) => group.id);
  }

  function syncUsedGroupOpens(permissions) {
    const used = usedGroupIds(permissions);
    const next = new Set(state.openGroups || []);
    used.forEach((id) => {
      if (!state.seenUsedGroups?.has(id)) {
        next.add(id);
      }
    });
    state.openGroups = next;
    state.seenUsedGroups = new Set(used);
  }

  function permSearchQuery() {
    return state.permInputMode === "search" ? state.permQuery.trim().toLowerCase() : "";
  }

  function announceDrawerMode(root, editing) {
    const live = (root || document).querySelector("[data-admin-mode-live]");
    if (!live) {
      return;
    }
    live.textContent = "";
    requestAnimationFrame(() => {
      live.textContent = editing ? "Editing permissions" : "Viewing template summary";
    });
  }

  function restorePermSmartFocus(root, mode = state.permInputMode) {
    const selector = mode === "describe" ? "[data-ai-describe='drole']" : "[data-admin-perm-q]";
    const input = (root || document).querySelector(selector);
    if (!input) {
      return;
    }
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }

  function resetDrawerChrome(existing) {
    state.formSnapshot = snapshotForm(existing ? blankForm(existing) : blankForm());
    const heavy = existing && window.KNAdminUX?.isHeavyRole?.(state.form.permissions, ALL_KEYS.length);
    state.drawerMode = heavy ? "view" : "edit";
    state.detailsOpen = false;
    state.unusedOpen = false;
    state.permInputMode = "describe";
    state.openGroups = new Set(usedGroupIds(state.form.permissions));
    state.seenUsedGroups = new Set(state.openGroups);
    state.dirty = isFormDataDirty(state.form);
  }

  function check(name, value, checked, label, extras = {}) {
    const labelClass = extras.labelClass || "type-body-sm";
    const mark = extras.aiMark
      ? `<span class="ai-suggest-mark" aria-hidden="true">✦</span>`
      : "";
    const text = extras.hideLabel
      ? `<span class="visually-hidden">${escapeHtml(label)}</span>`
      : `<span class="${labelClass}">${escapeHtml(label)}${mark}</span>`;
    const titleAttr = extras.title ? ` title="${escapeHtml(extras.title)}"` : "";
    return `<label class="blade-check${extras.hideLabel ? " blade-check--bare" : ""}${extras.className ? ` ${extras.className}` : ""}"${extras.attr ? ` ${extras.attr}` : ""}${titleAttr}>
      <input type="checkbox"${name ? ` name="${escapeHtml(name)}" value="${escapeHtml(value)}"` : ""} ${checked ? "checked" : ""} ${extras.indeterminate && !checked ? "data-indeterminate" : ""} aria-label="${escapeHtml(extras.ariaLabel || label)}"${titleAttr} />
      <span class="blade-check__box" aria-hidden="true"></span>
      ${text}
    </label>`;
  }

  function syncPermSet(target, next) {
    return window.KNAdminUX.syncPermissionSet(target, next);
  }

  function applyPermDepFeedback(result, liveSelector = "[data-ai-live-drole]") {
    if (!result) {
      return;
    }
    if (result.autoCheckedKeys?.length) {
      const next = { ...(state.permAutoRead || {}) };
      const trigger = result.triggerAction || "create";
      result.autoCheckedKeys.forEach((key) => {
        next[key] = trigger;
      });
      state.permAutoRead = next;
      clearTimeout(state._permAutoReadTimer);
      state._permAutoReadTimer = setTimeout(() => {
        state.permAutoRead = {};
        if (state.form && document.getElementById("kn-drole-form")) {
          render();
        }
      }, 1200);
    }
    if (result.blockedUncheckRead && result.blockedModules?.length) {
      const next = { ...(state.permBlockedMsg || {}) };
      result.blockedModules.forEach((moduleId) => {
        next[moduleId] = window.KNAdminUX.PERM_BLOCKED_READ_MSG;
      });
      state.permBlockedMsg = next;
      clearTimeout(state._permBlockedTimer);
      state._permBlockedTimer = setTimeout(() => {
        state.permBlockedMsg = {};
        if (state.form && document.getElementById("kn-drole-form")) {
          render();
        }
      }, 2800);
    }
    const announcement = window.KNAdminUX.permDependencyMessage(result, ACTION_LABEL);
    if (announcement) {
      requestAnimationFrame(() => {
        const liveEl = document.querySelector(liveSelector);
        if (liveEl) {
          liveEl.textContent = announcement;
        }
      });
    }
  }

  function groupKeys(group) {
    return group.modules.flatMap((mod) => ACTIONS.map((action) => keyOf(mod.id, action)));
  }

  function allSelected(set, keys) {
    return window.KNAdminUX.allKeysSelected(set, keys);
  }

  function someSelected(set, keys) {
    return window.KNAdminUX.someKeysSelected(set, keys);
  }

  function toggleKeys(set, keys) {
    const result = window.KNAdminUX.applyPermDependencyToggle(set, keys, ACTIONS);
    syncPermSet(set, result.permissions);
    applyPermDepFeedback(result);
    return result;
  }

  function bindIndeterminate(root) {
    window.KNAdminUX.bindIndeterminate(root);
  }

  function visibleModules(group, permissions) {
    const q = permSearchQuery();
    return group.modules.filter((mod) => {
      const keys = ACTIONS.map((action) => keyOf(mod.id, action));
      const anySelected = keys.some((key) => permissions.has(key));
      if (state.permSelectedOnly && !anySelected) {
        return false;
      }
      if (q && !mod.title.toLowerCase().includes(q) && !group.title.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }

  function renderPermGroup(group, permissions) {
    const mods = visibleModules(group, permissions);
    if (!mods.length) {
      return "";
    }
    const keys = groupKeys(group);
    const selected = keys.filter((key) => permissions.has(key)).length;
    const q = permSearchQuery();
    const aiSuggestions = state.aiSuggestions || {};
    const aiGroupKeys = keys.filter((key) => aiSuggestions[key]);
    const hasAiInGroup = aiGroupKeys.length > 0;
    const open = Boolean(state.openGroups?.has(group.id));
    const countTone = window.KNAdminUX.permCategoryTone(selected, keys.length);
    const aiCountBadge = hasAiInGroup
      ? `<span class="badge badge--ai type-caption-sm type-weight-medium ai-suggest-count" aria-label="${aiGroupKeys.length} AI-suggested permissions in this category">✦ ${aiGroupKeys.length} suggested</span>`
      : "";
    return window.KNAdminUX.accordionItem({
      id: group.id,
      title: group.title,
      open,
      modules: group.modules,
      includesLabel: "Includes:",
      tone: countTone,
      trailing: `${aiCountBadge}<span class="badge badge--${countTone} type-caption-sm type-weight-medium">${selected}/${keys.length}</span>`,
      body: `
        <div class="role-perm__row role-perm__row--head">
          <span class="type-caption-sm blade-field__hint">Permission</span>
          <div class="role-perm__actions">
            ${ACTIONS.map((action) => {
              const colKeys = mods.map((mod) => keyOf(mod.id, action));
              return check("", "", allSelected(permissions, colKeys), ACTION_LABEL[action], {
                attr: `data-drole-select-col="${escapeHtml(group.id)}" data-action="${action}"`,
                indeterminate: someSelected(permissions, colKeys),
                labelClass: "type-caption-sm"
              });
            }).join("")}
          </div>
        </div>
        ${mods
          .map((mod) => {
            const rowKeys = ACTIONS.map((action) => keyOf(mod.id, action));
            const modAiKeys = rowKeys.filter((key) => aiSuggestions[key]);
            const isAiRow = modAiKeys.length > 0;
            const firstReason = isAiRow ? aiSuggestions[modAiKeys[0]] : "";
            const blockedMsg = state.permBlockedMsg?.[mod.id] || "";
            const autoReadTrigger = state.permAutoRead?.[keyOf(mod.id, "read")];
            return `<div class="role-perm__row${isAiRow ? " is-ai-suggested" : ""}${blockedMsg ? " has-perm-dep-msg" : ""}" data-perm-module="${escapeHtml(mod.id)}">
              <div class="role-perm__module-wrap"${isAiRow ? ` title="${escapeHtml(firstReason)}"` : ""}>
                ${check("", "", allSelected(permissions, rowKeys), mod.title, {
                  attr: `data-drole-select-row="${escapeHtml(mod.id)}"`,
                  indeterminate: someSelected(permissions, rowKeys),
                  className: "role-perm__module",
                  labelClass: "type-ui-sm type-weight-medium",
                  aiMark: isAiRow,
                  title: isAiRow ? firstReason : undefined,
                  ariaLabel: isAiRow
                    ? `${mod.title} (AI suggested: ${firstReason})`
                    : undefined
                })}
                ${blockedMsg ? `<p class="role-perm__dep-msg type-caption-sm" role="status">${escapeHtml(blockedMsg)}</p>` : ""}
              </div>
              <div class="role-perm__actions">
                ${ACTIONS.map((action) => {
                  const key = keyOf(mod.id, action);
                  const isAiPerm = Boolean(aiSuggestions[key]);
                  const isAutoRead = action === "read" && Boolean(autoReadTrigger);
                  const autoHint = isAutoRead
                    ? `Auto-selected because ${ACTION_LABEL[autoReadTrigger] || autoReadTrigger} requires Read`
                    : "";
                  const classNames = [
                    isAiPerm ? "is-ai-suggested-check" : "",
                    isAutoRead ? "blade-check--auto-read" : ""
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return check("perm", key, permissions.has(key), ACTION_LABEL[action], {
                    hideLabel: true,
                    ariaLabel: `${ACTION_LABEL[action]} ${mod.title}${isAiPerm ? " (AI suggested)" : ""}${isAutoRead ? ` (${autoHint})` : ""}`,
                    className: classNames,
                    title: autoHint
                  });
                }).join("")}
              </div>
            </div>`;
          })
          .join("")}`
    });
  }

  function renderPermBrowser(permissions) {
    syncUsedGroupOpens(permissions);
    const stats = window.KNAdminUX.permCategoryStats(permissions, CATALOG, ACTIONS);
    const searching = Boolean(permSearchQuery()) || state.permSelectedOnly;
    const groupUnused = !searching && stats.used.length > 0 && stats.unused.length > 0;
    const featured = groupUnused ? stats.used : stats.all;
    const featuredHtml = featured.map((item) => renderPermGroup(item.group, permissions)).filter(Boolean);
    if (!groupUnused) {
      return featuredHtml.length ? featuredHtml.join("") : `<p class="type-caption-sm">No permissions match this scan.</p>`;
    }
    const unusedHtml = stats.unused.map((item) => renderPermGroup(item.group, permissions)).filter(Boolean);
    return `${featuredHtml.join("")}${
      unusedHtml.length
        ? window.KNAdminUX.unusedCategoriesBlock({
            count: unusedHtml.length,
            open: Boolean(state.unusedOpen),
            body: unusedHtml.join(""),
            suffix: "drole",
            label: `Other categories (${unusedHtml.length})`
          })
        : ""
    }`;
  }

  function renderDetailsGrid(role, inherited) {
    return `<div class="role-details-strip">
              <div class="form-display-field">
                <span class="form-display-field__label">OWNER</span>
                <span class="form-display-field__value">${escapeHtml(role.createdBy)}</span>
              </div>
              <div class="form-display-field">
                <span class="form-display-field__label">UPDATED</span>
                <span class="form-display-field__value">${escapeHtml(window.KNAdminUX.relativeTime(role.updatedAt))}</span>
              </div>
              <div class="form-display-field">
                <span class="form-display-field__label">WHO INHERITS THIS</span>
                <span class="form-display-field__value">${
                  inherited
                    ? `<a class="blade-link type-body-sm" href="#kn-user-management?inherited=${encodeURIComponent(role.id)}">${inherited} ${inherited === 1 ? "workspace" : "workspaces"}</a>`
                    : `—`
                }</span>
              </div>
              <div class="form-display-field">
                <span class="form-display-field__label">COVERAGE</span>
                <span class="form-display-field__value">${window.KNAdminUX.coverage(role.permissions, ALL_KEYS.length)}</span>
              </div>
            </div>`;
  }

  function renderAccessReadonly(form) {
    const applicable = (form.applicable || []).map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ");
    const services = (form.services || []).map((id) => SERVICES.find((item) => item.id === id)?.label || id).join(", ");
    return `<div class="role-access-readonly" aria-label="Access">
      <div class="form-display-field">
        <span class="form-display-field__label">NAME</span>
        <span class="form-display-field__value">${escapeHtml(form.name || "Untitled template")}</span>
      </div>
      <div class="form-display-field">
        <span class="form-display-field__label">SERVICES</span>
        <span class="form-display-field__value">${escapeHtml(services || "—")}</span>
      </div>
      <div class="form-display-field">
        <span class="form-display-field__label">WHO IT APPLIES TO</span>
        <span class="form-display-field__value">${escapeHtml(applicable || "—")}</span>
      </div>
    </div>`;
  }

  function renderServiceSelect(form) {
    const query = state.serviceQuery.trim().toLowerCase();
    const options = SERVICES.filter((item) => !query || item.label.toLowerCase().includes(query));
    const selected = new Set(form.services);
    const aiServices = new Set(state.aiServiceSuggestions || []);
    return `${window.KNAdminUX.multiSelect({
      labelledBy: "kn-drole-service-label",
      triggerAttr: "data-drole-service-toggle",
      triggerLabel: "Select services",
      open: state.serviceMenuOpen,
      menuId: "kn-drole-service-menu",
      searchId: "kn-drole-service-search",
      searchValue: state.serviceQuery,
      searchPlaceholder: "Search services",
      searchLabel: "Search services",
      emptyLabel: "No services match.",
      chipsInTrigger: true,
      chips: (form.services || []).map((id) => ({
        label: `${aiServices.has(id) ? "✦ " : ""}${labelOf(SERVICES, id)}`,
        removeAttr: `data-drole-service-remove="${escapeHtml(id)}"`
      })),
      options: options.map((item) => ({
        label: `${aiServices.has(item.id) ? "✦ " : ""}${item.label}`,
        checked: selected.has(item.id),
        attr: `data-drole-service="${escapeHtml(item.id)}"${aiServices.has(item.id) ? ' data-ai-suggested="1"' : ""}`
      }))
    })}
    ${
      aiServices.size
        ? `<div class="ai-service-hints">${[...aiServices]
            .map((id) => {
              const reason = state.aiServiceReasons?.[id] || "Suggested from description";
              return `<span class="ai-service-hint">${escapeHtml(labelOf(SERVICES, id))} ${window.KNAiSuggest.reasonTag(reason, { inline: true })}</span>`;
            })
            .join("")}
          <p class="type-caption-sm ai-applicable-hint">✦ AI suggested services — review before saving.</p>
        </div>`
        : ""
    }`;
  }

  function formLeaveHash() {
    return "#default-role-management";
  }

  function renderFormDrawer() {
    const form = state.form;
    const isEdit = Boolean(form.id);
    const role = isEdit ? findRole(form.id) : null;
    const inherited = role ? inheritCount(role) : 0;
    const editing = !isEdit || state.drawerMode === "edit";
    const heavy = isEdit && window.KNAdminUX?.isHeavyRole?.(form.permissions, ALL_KEYS.length);
    const title = isEdit ? role?.name || form.name || "Edit Default Role" : "Add Default Role";
    const coveragePct = ALL_KEYS.length ? Math.round((form.permissions.size / ALL_KEYS.length) * 100) : 0;
    const summary = window.KNAdminUX.accessSummary(form.permissions, CATALOG, ACTIONS);
    const submitDisabled = !canSubmitRole(form);
    const accessFields = !editing
      ? ""
      : `<section class="role-form-zone role-form-zone--access" aria-labelledby="kn-drole-access-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-drole-access-title">Basics</h3>
            <div class="def-role-form-top">
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-drole-name">Name <span class="role-req" aria-hidden="true">*</span></label>
                <input class="blade-field__control type-body-sm${state.aiFieldMeta?.name ? " is-ai-suggested-field" : ""}" id="kn-drole-name" name="name" type="text" required maxlength="80" placeholder="e.g. Visibility customer default" value="${escapeHtml(form.name)}" autocomplete="off" />
                ${state.aiFieldMeta?.name ? window.KNAiSuggest.reasonTag(state.aiFieldMeta.name) : ""}
                ${form.error ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.error)}</p>` : ""}
              </div>
              <div class="blade-field">
                <span class="type-caption-sm type-weight-medium" id="kn-drole-service-label">Services <span class="role-req" aria-hidden="true">*</span></span>
                ${renderServiceSelect(form)}
                ${form.serviceError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.serviceError)}</p>` : ""}
              </div>
            </div>
            <div class="blade-field role-applicable" role="group" aria-labelledby="kn-drole-applicable-title">
              ${window.KNAdminUX.applicableHead({
                titleId: "kn-drole-applicable-title",
                title: "Who this applies to",
                allSelected: form.applicable.length === APPLICABLE.length,
                attr: "data-drole-select-applicable"
              })}
              <div class="role-applicable__row">
                ${APPLICABLE.map((item) => {
                  const isAiSuggested = (state.aiApplicableSuggestions || []).includes(item.id);
                  const reason = state.aiApplicableReasons?.[item.id] || "Suggested from description";
                  return `<div class="ai-applicable-wrap${isAiSuggested ? " is-ai-suggested" : ""}">
                    ${check("applicable", item.id, form.applicable.includes(item.id), item.label)}
                    ${isAiSuggested ? window.KNAiSuggest.reasonTag(reason, { inline: true }) : ""}
                  </div>`;
                }).join("")}
              </div>
              ${state.aiApplicableSuggestions?.length ? `<p class="type-caption-sm ai-applicable-hint">✦ AI suggested who this applies to — review before saving.</p>` : ""}
            </div>
          </section>`;
    const permFields = !editing
      ? ""
      : `<section class="role-form-zone role-form-zone--perms role-perm" aria-labelledby="kn-drole-perm-title">
            <header class="role-perm__head">
              <h3 class="type-heading-h5 type-weight-semibold" id="kn-drole-perm-title">What they can do</h3>
            </header>
            ${window.KNAdminUX.permissionAnomalyFlagHtml(form.name, form.permissions, { idPrefix: "perm-anomaly-drole" })}
            <p class="visually-hidden" aria-live="polite" aria-atomic="true" data-ai-live-drole></p>
            ${window.KNAdminUX.permFilters({
              query: state.permQuery,
              selectedOnly: state.permSelectedOnly,
              aiDescribe: state.aiDescribe,
              aiLoading: state.aiLoading,
              aiNoMatch: state.aiNoMatch,
              aiAttr: "drole",
              inputMode: state.permInputMode,
              selectedCount: form.permissions.size,
              totalCount: ALL_KEYS.length,
              ...window.KNAdminUX.aiRoleAssist({
                name: form.name,
                permissions: form.permissions,
                catalog: CATALOG,
                mode: "drole",
                seed: state.aiSeed
              })
            })}
            ${renderPermBrowser(form.permissions)}
          </section>`;
    return `<div class="blade-drawer-root ${isEdit ? "admin-profile-drawer" : "admin-form-drawer"} is-open" id="admin-drole-form-drawer">
      <div class="blade-drawer__overlay" data-drole-form-close tabindex="-1"></div>
      <aside class="blade-drawer" role="dialog" aria-modal="true" aria-labelledby="kn-drole-form-title">
        <header class="blade-drawer__header">
          <div class="blade-drawer__titles">
            <div class="admin-drawer-title-row">
              <h2 class="type-heading-h5 type-weight-semibold" id="kn-drole-form-title" tabindex="-1">${escapeHtml(title)}</h2>
              ${role ? window.KNAdminUX.statusBadge(role.active) : ""}
            </div>
            <p class="type-caption-sm">${isEdit ? "Changes apply to customers who inherit this template." : "New customers pick up this template when they join KlearNow."}</p>
          </div>
          ${
            role
              ? window.KNAdminUX.statusSwitch({
                  active: role.active,
                  toggleAttr: `data-drole-toggle="${escapeHtml(role.id)}"`,
                  labelId: "kn-drole-status-label"
                })
              : ""
          }
          <button class="icon-btn" type="button" data-drole-form-close aria-label="Close">${iconClose()}</button>
        </header>
        <form class="blade-drawer__body role-form def-role-form" id="kn-drole-form" novalidate>
          <p class="visually-hidden" aria-live="polite" data-admin-mode-live></p>
          ${
            role
              ? `<section class="role-form-zone role-form-zone--summary" aria-label="Template summary">
            ${window.KNAdminUX.roleMetaLine({
              owner: role.createdBy,
              updatedAt: role.updatedAt,
              count: inherited,
              countSingular: "workspace",
              countPlural: "workspaces",
              countHref: inherited ? `#kn-user-management?inherited=${encodeURIComponent(role.id)}` : "",
              coveragePct,
              detailsOpen: state.detailsOpen,
              detailsId: "kn-drole-meta-details",
              detailsHtml: renderDetailsGrid(role, inherited),
              toggleAttr: "data-admin-details-toggle"
            })}
            <p class="role-access-summary type-body-sm">${escapeHtml(summary)}</p>
            ${
              heavy
                ? window.KNAdminUX.roleViewEditToggle({
                    expanded: editing,
                    controlsId: "kn-drole-edit-panel",
                    attr: "data-admin-drawer-mode"
                  })
                : ""
            }
            ${editing ? "" : renderAccessReadonly(form)}
          </section>`
              : ""
          }
          <div id="kn-drole-edit-panel">
            ${accessFields}${permFields}
          </div>
        </form>
        <footer class="blade-drawer__footer">
          ${isEdit ? `<div class="drole-delete-action"><button class="btn btn--primary btn--color-negative btn--md type-ui-md" type="button" data-drole-delete="${escapeHtml(form.id)}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><path d="M3 4h10M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5.5 4l.5 8M10.5 4l-.5 8M7.5 4v8M8.5 4v8"/></svg>
            Delete Template
          </button></div>` : ""}
          <div class="blade-drawer__footer-actions">
            <button class="btn btn--tertiary btn--md type-ui-md" type="button" data-drole-form-close>Cancel</button>
            <button class="btn btn--primary btn--md type-ui-md" type="submit" form="kn-drole-form" id="kn-drole-submit-btn" ${window.KNAdminUX.submitButtonAttrs(submitDisabled)}>${isEdit ? "Update Default Role" : "Add Default Role"}</button>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function render() {
    const root = document.getElementById("kn-default-role-root");
    const page = document.getElementById("kn-default-role-page");
    if (!root || !page || page.hidden) {
      return;
    }
    const route = parseRoute();
    const scroller = document.querySelector(".content");
    const top = scroller?.scrollTop || 0;
    const drawerScroll = window.KNAdminUX.captureDrawerScroll(page);
    const drawerFocus = window.KNAdminUX.captureDrawerFocus(page);
    const filterFocus = window.KNAdminUX.captureColFilterFocus(page);
    if (route.view === "form") {
      if (!state.form || state.form.id !== route.id) {
        const existing = route.id ? loadRoles().find((role) => role.id === route.id) : null;
        if (route.id && !existing) {
          toast("That default role is no longer available.", "notice");
          goto("#default-role-management");
          return;
        }
        state.form = blankForm(existing);
        resetDrawerChrome(existing);
        if (route.preferEdit) {
          state.drawerMode = "edit";
        }
        state.serviceMenuOpen = false;
        state.serviceQuery = "";
        state.permQuery = "";
        state.permSelectedOnly = false;
        state.menuOpen = "";
        state.aiDescribe = "";
        state.aiLoading = false;
        state.aiNoMatch = false;
        state.aiSuggestions = {};
        state.aiApplicableSuggestions = [];
        state.aiServiceSuggestions = [];
        state.aiApplicableReasons = {};
        state.aiServiceReasons = {};
        state.aiFieldMeta = {};
        state.aiSeed = existing?.id || `new-drole-${Date.now()}`;
        if (!existing) {
          applyPendingAiDraft();
        }
      } else if (!route.id && window.KNAiSuggest?.peekDraft?.("default-role")) {
        applyPendingAiDraft();
      }
    } else {
      state.form = null;
      state.formSnapshot = null;
      state.dirty = false;
      state.serviceMenuOpen = false;
    }
    root.innerHTML = renderList();
    bindIndeterminate(root);
    if (scroller) {
      scroller.scrollTop = top;
    }
    window.KNAdminUX.restoreDrawerScroll(page, drawerScroll, { focusSelector: drawerFocus });
    window.KNAdminUX.restoreColFilterFocus(page, filterFocus);
    window.KNAdminUX.syncOverlayFocus(page);
    syncSubmitBtn(root);
    if (route.view === "form") {
      restoreServiceSearch();
    }
    if (state.restoreFocusId && !window.KNAdminUX.activeOverlay(page)) {
      const id = state.restoreFocusId;
      state.restoreFocusId = "";
      requestAnimationFrame(() => {
        document.querySelector(`#kn-default-role-root tr[data-drole-id="${CSS.escape(id)}"]`)?.focus();
      });
    }
  }

  function restoreServiceSearch() {
    if (!state.serviceMenuOpen) {
      return;
    }
    const search = document.getElementById("kn-drole-service-search");
    if (!search) {
      return;
    }
    search.focus();
    const end = search.value.length;
    search.setSelectionRange(end, end);
  }

  function readForm(formEl) {
    if (!formEl) {
      return {
        name: state.form?.name || "",
        applicable: [...(state.form?.applicable || [])],
        services: [...(state.form?.services || [])],
        permissions: new Set(state.form?.permissions || [])
      };
    }
    const nameInput = formEl.querySelector("#kn-drole-name");
    if (!nameInput && state.form) {
      return {
        name: state.form.name || "",
        applicable: [...(state.form.applicable || [])],
        services: [...(state.form.services || [])],
        permissions: new Set(state.form.permissions || [])
      };
    }
    const name = nameInput?.value.trim() || "";
    const applicable = [...formEl.querySelectorAll('input[name="applicable"]:checked')].map((input) => input.value);
    const serviceInputs = [...formEl.querySelectorAll("[data-drole-service]")];
    const services = window.KNAdminUX.mergeDomMultiSelect(
      state.form?.services,
      serviceInputs.filter((input) => input.checked).map((input) => input.getAttribute("data-drole-service")),
      serviceInputs.map((input) => input.getAttribute("data-drole-service"))
    );
    const permInputs = [...formEl.querySelectorAll('input[name="perm"]')];
    const permissions = window.KNAdminUX.mergePermissionSelections(
      state.form?.permissions,
      permInputs.filter((input) => input.checked).map((input) => input.value),
      permInputs.map((input) => input.value)
    );
    return { name, applicable, services, permissions };
  }

  function persistForm(next) {
    const permissions =
      next && next.permissions != null ? next.permissions : state.form?.permissions || new Set();
    state.form = { ...state.form, ...next, permissions: new Set(permissions) };
    state.dirty = isFormDataDirty(state.form);
  }

  function commitDefaultRoleSave(snap) {
    const roles = loadRoles();
    if (state.form.id) {
      const current = roles.find((role) => role.id === state.form.id);
      if (current) {
        current.name = snap.name;
        current.applicable = snap.applicable;
        current.services = snap.services;
        current.permissions = [...snap.permissions];
        current.updatedAt = new Date().toISOString();
      }
      saveRoles(roles);
      state.form = { ...state.form, ...snap, permissions: snap.permissions, error: "", serviceError: "" };
      state.formSnapshot = snapshotForm(state.form);
      state.dirty = false;
      state.drawerMode = window.KNAdminUX?.isHeavyRole?.(snap.permissions, ALL_KEYS.length) ? "view" : "edit";
      state.modal = "";
      state.pendingSaveSnap = null;
      state.permReduceMsg = "";
      toast(`${snap.name} saved.`);
      goto(`#default-role-management/${encodeURIComponent(state.form.id)}`);
      return;
    }
    const id = uid();
    roles.unshift({
      id,
      name: snap.name,
      applicable: snap.applicable,
      services: snap.services,
      createdBy: "Tanya Agrawal",
      active: true,
      inherited: 0,
      customers: [],
      updatedAt: new Date().toISOString(),
      permissions: [...snap.permissions]
    });
    saveRoles(roles);
    state.dirty = false;
    state.modal = "";
    state.pendingSaveSnap = null;
    state.permReduceMsg = "";
    toast(`${snap.name} added.`);
    goto(`#default-role-management/${encodeURIComponent(id)}`);
  }

  function bind(root) {
    root.addEventListener("click", (event) => {
      if (
        window.KNAdminUX.handleAccordionClick(event, {
          openGroups: state.openGroups,
          setOpen: (next) => {
            const formEl = root.querySelector("#kn-drole-form");
            if (formEl && state.form) {
              const snap = readForm(formEl);
              state.form = { ...state.form, ...snap, permissions: snap.permissions };
            }
            state.openGroups = next;
            render();
          }
        })
      ) {
        return;
      }
      if (event.target.closest("[data-ai-ops-dismiss]")) {
        event.preventDefault();
        window.KNAdminUX.dismissOpsFlag(event.target.closest("[data-ai-ops-dismiss]").getAttribute("data-ai-ops-dismiss"));
        render();
        return;
      }
      if (window.KNAdminUX.resolvePermHeaderControl(event, "[data-admin-unused-toggle]")) {
        event.preventDefault();
        const formEl = root.querySelector("#kn-drole-form");
        if (formEl && state.form) {
          const snap = readForm(formEl);
          state.form = { ...state.form, ...snap, permissions: snap.permissions };
        }
        state.unusedOpen = !state.unusedOpen;
        render();
        requestAnimationFrame(() => root.querySelector("[data-admin-unused-toggle]")?.focus());
        return;
      }
      if (event.target.closest("[data-admin-details-toggle]")) {
        event.preventDefault();
        state.detailsOpen = !state.detailsOpen;
        render();
        requestAnimationFrame(() => root.querySelector("[data-admin-details-toggle]")?.focus());
        return;
      }
      if (event.target.closest("[data-admin-drawer-mode]")) {
        event.preventDefault();
        const formEl = root.querySelector("#kn-drole-form");
        if (formEl && state.form && state.drawerMode === "edit") {
          const snap = readForm(formEl);
          state.form = { ...state.form, ...snap, permissions: snap.permissions };
          state.dirty = isFormDataDirty(state.form);
        }
        state.drawerMode = state.drawerMode === "edit" ? "view" : "edit";
        if (state.drawerMode === "edit") {
          state.unusedOpen = false;
          state.openGroups = new Set(usedGroupIds(state.form.permissions));
          state.seenUsedGroups = new Set(state.openGroups);
        }
        render();
        announceDrawerMode(root, state.drawerMode === "edit");
        requestAnimationFrame(() => {
          if (state.drawerMode === "edit") {
            const describe = document.getElementById("kn-default-role-root")?.querySelector("[data-ai-describe='drole']");
            (describe || document.getElementById("kn-drole-name"))?.focus();
          } else {
            root.querySelector("[data-admin-drawer-mode]")?.focus();
          }
        });
        return;
      }
      if (
        window.KNAdminUX.handlePermInputModeClick(event, {
          mode: state.permInputMode,
          setMode: (next) => {
            const formEl = root.querySelector("#kn-drole-form");
            if (formEl && state.form) {
              persistForm(readForm(formEl));
            }
            state.permInputMode = next;
            render();
            restorePermSmartFocus(root, next);
          }
        })
      ) {
        return;
      }
      if (event.target.closest("[data-drole-select-group], [data-drole-select-row], [data-drole-select-col], [data-drole-select-all], [data-drole-select-applicable], [data-drole-service-toggle]")) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.target.closest("[data-admin-perm-selected]")) {
        event.preventDefault();
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        state.permSelectedOnly = !state.permSelectedOnly;
        render();
        return;
      }
      if (event.target.closest("[data-admin-perm-clear-all]")) {
        event.preventDefault();
        if (state.form) {
          state.form.permissions = new Set();
          state.dirty = true;
        }
        render();
        return;
      }
      const moreHandled = window.KNAdminUX.handleMoreClick(event, {
        open: state.menuOpen,
        setOpen: (next) => {
          state.menuOpen = next;
          render();
        }
      });
      if (moreHandled) {
        return;
      }
      const removeService = event.target.closest("[data-drole-service-remove]");
      if (removeService) {
        event.preventDefault();
        event.stopPropagation();
        const id = removeService.getAttribute("data-drole-service-remove") || "";
        const snap = readForm(root.querySelector("#kn-drole-form"));
        state.aiServiceSuggestions = (state.aiServiceSuggestions || []).filter((item) => item !== id);
        if (state.aiServiceReasons?.[id]) {
          const nextReasons = { ...state.aiServiceReasons };
          delete nextReasons[id];
          state.aiServiceReasons = nextReasons;
        }
        persistForm({
          ...snap,
          services: (snap.services || []).filter((item) => item !== id),
          serviceError: ""
        });
        window.KNAiSuggest?.logAudit?.({
          action: "remove-service-chip",
          context: "default-role",
          field: "services",
          origin: "manual",
          value: id
        });
        render();
        if (!state.serviceMenuOpen) {
          requestAnimationFrame(() => {
            root.querySelector("[data-drole-service-toggle]")?.focus();
          });
        }
        return;
      }
      const serviceToggle = event.target.closest("[data-drole-service-toggle]");
      if (serviceToggle) {
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        state.serviceMenuOpen = !state.serviceMenuOpen;
        state.selectOpen = "";
        render();
        return;
      }
      const selectHandled = window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (next) => {
          state.selectOpen = next;
          state.serviceMenuOpen = false;
          render();
        },
        onChange: (key, value) => {
          if (key === "pageSize") {
            state.pageSize = Number(value) || 10;
            state.page = 1;
          } else {
            state.filters[key] = value;
            state.page = 1;
          }
          state.selectOpen = "";
          render();
        }
      });
      if (selectHandled) {
        return;
      }
      if (event.target.closest("[data-admin-leave-dismiss]")) {
        event.preventDefault();
        state.leaveTo = "";
        render();
        return;
      }
      if (event.target.closest("[data-admin-leave-confirm]")) {
        event.preventDefault();
        finishLeave();
        return;
      }
      if (event.target.closest("[data-admin-modal-dismiss]")) {
        event.preventDefault();
        state.modal = "";
        state.deleteId = "";
        state.deactivateId = "";
        state.pendingSaveSnap = null;
        state.permReduceMsg = "";
        render();
        return;
      }
      if (event.target.closest("[data-drole-perm-reduce-confirm]")) {
        event.preventDefault();
        const snap = state.pendingSaveSnap;
        if (snap) {
          commitDefaultRoleSave(snap);
        } else {
          state.modal = "";
          render();
        }
        return;
      }
      if (event.target.closest("[data-drole-profile-close], [data-drole-form-close]")) {
        event.preventDefault();
        requestLeave(formLeaveHash());
        return;
      }
      const inheritedLink = event.target.closest("[data-drole-inherited]");
      if (inheritedLink) {
        event.preventDefault();
        event.stopPropagation();
        requestLeave(`#kn-user-management?inherited=${encodeURIComponent(inheritedLink.getAttribute("data-drole-inherited") || "")}`);
        return;
      }
      const nav = event.target.closest("[data-drole-nav]");
      if (nav) {
        event.preventDefault();
        const to = nav.getAttribute("data-drole-nav");
        const id = nav.getAttribute("data-drole-id") || "";
        const hash =
          to === "add"
            ? "#default-role-management/add"
            : to === "edit" || to === "detail"
              ? `#default-role-management/${encodeURIComponent(id)}`
              : "#default-role-management";
        if (to === "detail" || to === "edit") {
          const route = parseRoute();
          if (route.view === "form" && route.id === id) {
            requestLeave("#default-role-management");
            return;
          }
          requestLeave(hash);
          return;
        }
        if (to === "list") {
          requestLeave(hash);
          return;
        }
        goto(hash);
        return;
      }
      const row = event.target.closest("tr[data-drole-id]");
      if (row && !event.target.closest("a, button, input, label, .blade-select, .user-row-actions, .admin-more")) {
        const id = row.getAttribute("data-drole-id");
        const route = parseRoute();
        if (route.view !== "list" && route.id === id) {
          requestLeave("#default-role-management");
          return;
        }
        goto(`#default-role-management/${encodeURIComponent(id)}`);
        return;
      }
      const sort = event.target.closest("[data-drole-sort]");
      if (sort) {
        const key = sort.getAttribute("data-drole-sort");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-drole-page]");
      if (pageBtn && !pageBtn.disabled) {
        state.page = Number(pageBtn.getAttribute("data-drole-page")) || 1;
        render();
        return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        state.filters.chip = chip.getAttribute("data-admin-chip") || "all";
        state.page = 1;
        render();
        return;
      }
      const edit = event.target.closest("[data-drole-edit]");
      if (edit) {
        goto(`#default-role-management/edit/${edit.getAttribute("data-drole-edit")}`);
        return;
      }
      const duplicate = event.target.closest("[data-drole-duplicate]");
      if (duplicate) {
        const source = loadRoles().find((role) => role.id === duplicate.getAttribute("data-drole-duplicate"));
        if (source) {
          state.menuOpen = "";
          state.form = blankForm({ ...source, id: "", name: `${source.name} copy` });
          state.formSnapshot = snapshotForm(blankForm());
          state.drawerMode = "edit";
          state.detailsOpen = false;
          state.unusedOpen = false;
          state.permInputMode = "describe";
          state.openGroups = new Set(usedGroupIds(state.form.permissions));
          state.seenUsedGroups = new Set(state.openGroups);
          state.dirty = isFormDataDirty(state.form);
          goto("#default-role-management/add");
        }
        return;
      }
      const deleteBtn = event.target.closest("[data-drole-delete]");
      if (deleteBtn) {
        state.menuOpen = "";
        state.deleteId = deleteBtn.getAttribute("data-drole-delete");
        state.modal = "delete";
        render();
        return;
      }
      if (event.target.closest("[data-drole-delete-confirm]")) {
        const removed = findRole(state.deleteId);
        saveRoles(loadRoles().filter((role) => role.id !== state.deleteId));
        state.modal = "";
        state.deleteId = "";
        toast(`${removed?.name || "Default role"} deleted.`, "notice");
        goto("#default-role-management");
        return;
      }
      if (event.target.closest("[data-drole-deactivate-confirm]")) {
        const roles = loadRoles();
        const role = roles.find((item) => item.id === state.deactivateId);
        if (role) {
          role.active = false;
          saveRoles(roles);
          toast(`${role.name} is inactive.`);
        }
        state.modal = "";
        state.deactivateId = "";
        render();
        return;
      }
      if (event.target.closest("[data-admin-clear-filters]")) {
        event.preventDefault();
        clearFilters();
        return;
      }
      const groupAll = event.target.closest("[data-drole-select-group]");
      if (groupAll) {
        const group = CATALOG.find((item) => item.id === groupAll.getAttribute("data-drole-select-group"));
        const snap = readForm(root.querySelector("#kn-drole-form"));
        toggleKeys(snap.permissions, groupKeys(group));
        persistForm(snap);
        render();
        return;
      }
      const colAll = event.target.closest("[data-drole-select-col]");
      if (colAll) {
        const group = CATALOG.find((item) => item.id === colAll.getAttribute("data-drole-select-col"));
        const action = colAll.getAttribute("data-action");
        if (!group || !ACTIONS.includes(action)) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-drole-form"));
        toggleKeys(
          snap.permissions,
          visibleModules(group, snap.permissions).map((mod) => keyOf(mod.id, action))
        );
        persistForm(snap);
        render();
        return;
      }
      const rowAll = event.target.closest("[data-drole-select-row]");
      if (rowAll) {
        const snap = readForm(root.querySelector("#kn-drole-form"));
        toggleKeys(
          snap.permissions,
          ACTIONS.map((action) => keyOf(rowAll.getAttribute("data-drole-select-row"), action))
        );
        persistForm(snap);
        render();
        return;
      }
      if (event.target.closest("[data-drole-select-all]")) {
        const snap = readForm(root.querySelector("#kn-drole-form"));
        toggleKeys(snap.permissions, ALL_KEYS);
        persistForm(snap);
        render();
        return;
      }
      if (event.target.closest("[data-drole-select-applicable]")) {
        const snap = readForm(root.querySelector("#kn-drole-form"));
        snap.applicable =
          snap.applicable.length === APPLICABLE.length ? [] : APPLICABLE.map((item) => item.id);
        persistForm(snap);
        render();
      }
    });

    root.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-drole-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-drole-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      const size = event.target.closest("[data-drole-pagesize]");
      if (size) {
        state.pageSize = Number(size.value) || 10;
        state.page = 1;
        render();
        return;
      }
      const toggle = event.target.closest("[data-drole-toggle]");
      if (toggle) {
        const roles = loadRoles();
        const role = roles.find((item) => item.id === toggle.getAttribute("data-drole-toggle"));
        if (!role) {
          return;
        }
        if (role.active && !toggle.checked && inheritCount(role) > 0) {
          state.modal = "deactivate";
          state.deactivateId = role.id;
          render();
          return;
        }
        role.active = toggle.checked;
        saveRoles(roles);
        toast(`${role.name} is ${role.active ? "active" : "inactive"}.`);
        render();
        return;
      }
      if (event.target.closest("[data-drole-select-row], [data-drole-select-col], [data-drole-select-group]")) {
        return;
      }
      const service = event.target.closest("[data-drole-service]");
      if (service) {
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        render();
        return;
      }
      if (event.target.closest("#kn-drole-form")) {
        const formEl = root.querySelector("#kn-drole-form");
        if (event.target.matches('input[name="perm"]')) {
          const key = event.target.value;
          const checked = event.target.checked;
          const result = window.KNAdminUX.applyPermissionToggle(state.form?.permissions, key, checked, ACTIONS);
          applyPermDepFeedback(result);
          const snap = readForm(formEl);
          snap.permissions = result.permissions;
          persistForm(snap);
          render();
          return;
        }
        persistForm(readForm(formEl));
        if (event.target.matches('input[name="applicable"]')) {
          render();
        } else {
          syncSubmitBtn(root);
        }
      }
    });

    root.addEventListener("input", (event) => {
      const filter = event.target.closest("[data-drole-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-drole-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      if (event.target.matches("[data-admin-perm-q]")) {
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        state.permQuery = event.target.value;
        const q = state.permQuery.trim().toLowerCase();
        if (q) {
          const next = new Set(state.openGroups || []);
          CATALOG.forEach((group) => {
            const hit = group.modules.some(
              (mod) =>
                mod.title.toLowerCase().includes(q) ||
                group.title.toLowerCase().includes(q) ||
                ACTIONS.some((action) => keyOf(mod.id, action).includes(q))
            );
            if (hit) {
              next.add(group.id);
            }
          });
          state.openGroups = next;
        }
        render();
        restorePermSmartFocus(root, "search");
        return;
      }
      if (event.target.matches("[data-ai-describe='drole']")) {
        applyAiDescription(event.target.value);
        return;
      }
      if (event.target.id === "kn-drole-service-search") {
        state.serviceQuery = event.target.value;
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        render();
        return;
      }
      if (event.target.id === "kn-drole-name") {
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        syncSubmitBtn(root);
      }
    });

    root.addEventListener("keydown", (event) => {
      if (
        window.KNAdminUX.handlePermInputModeKey(event, {
          mode: state.permInputMode,
          setMode: (next) => {
            const formEl = root.querySelector("#kn-drole-form");
            if (formEl && state.form) {
              persistForm(readForm(formEl));
            }
            state.permInputMode = next;
            render();
            requestAnimationFrame(() => {
              root.querySelector(`[data-perm-input-mode="${next}"]`)?.focus();
            });
          }
        })
      ) {
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      if (event.target.closest("[data-drole-service-remove]")) {
        return;
      }
      const toggle = event.target.closest("[data-drole-service-toggle]");
      if (!toggle || toggle.tagName === "BUTTON" || event.target !== toggle) {
        return;
      }
      event.preventDefault();
      persistForm(readForm(root.querySelector("#kn-drole-form")));
      state.selectOpen = "";
      state.serviceMenuOpen = !state.serviceMenuOpen;
      render();
    });

    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-ai-prompt='drole']")) {
        event.preventDefault();
        const chip = event.target.closest("[data-ai-prompt='drole']");
        applyAiDescription(chip.getAttribute("data-ai-prompt-text") || "");
        return;
      }
      if (event.target.closest("[data-ai-describe-clear='drole']")) {
        event.preventDefault();
        persistForm(readForm(root.querySelector("#kn-drole-form")));
        const snap = readForm(root.querySelector("#kn-drole-form"));
        Object.keys(state.aiSuggestions).forEach((key) => snap.permissions.delete(key));
        snap.applicable = window.KNAiSuggest.clearAiOnly(snap.applicable, state.aiApplicableSuggestions);
        snap.services = window.KNAiSuggest.clearAiOnly(snap.services, state.aiServiceSuggestions);
        state.aiDescribe = "";
        state.aiLoading = false;
        state.aiNoMatch = false;
        state.aiSuggestions = {};
        state.aiApplicableSuggestions = [];
        state.aiServiceSuggestions = [];
        state.aiApplicableReasons = {};
        state.aiServiceReasons = {};
        state.aiFieldMeta = {};
        window.KNAiSuggest?.logAudit?.({
          action: "clear-ai-suggestions",
          context: "default-role",
          field: "permissions,applicable,services",
          origin: "manual",
          value: ""
        });
        persistForm(snap);
        render();
        requestAnimationFrame(() => {
          root.querySelector("[data-ai-describe='drole']")?.focus();
        });
        return;
      }
    }, true);

    root.addEventListener("submit", (event) => {
      if (!event.target.matches("#kn-drole-form")) {
        return;
      }
      event.preventDefault();
      const snap = readForm(event.target);
      if (!canSubmitRole({ ...state.form, ...snap, permissions: snap.permissions })) {
        return;
      }
      if (!snap.name) {
        state.form = { ...state.form, ...snap, error: "Role name is required.", serviceError: "" };
        render();
        document.getElementById("kn-drole-name")?.focus();
        return;
      }
      if (!snap.services.length) {
        state.form = { ...state.form, ...snap, error: "", serviceError: "Select at least one service." };
        state.serviceMenuOpen = true;
        render();
        return;
      }
      if (!snap.applicable.length) {
        state.form = { ...state.form, ...snap, error: "Select who this role applies to.", serviceError: "" };
        render();
        return;
      }
      const roles = loadRoles();
      const duplicate = roles.some((role) => role.id !== state.form.id && role.name.toLowerCase() === snap.name.toLowerCase());
      if (duplicate) {
        state.form = { ...state.form, ...snap, error: "A default role with this name already exists.", serviceError: "" };
        render();
        document.getElementById("kn-drole-name")?.focus();
        return;
      }
      if (state.form.id) {
        const current = roles.find((role) => role.id === state.form.id);
        if (current) {
          const baseline = window.KNAdminUX.permissionBaselineForSave(
            current.permissions,
            state.formSnapshot
          );
          const risk = window.KNAdminUX.permissionReductionRisk(
            baseline,
            snap.permissions,
            inheritCount(current)
          );
          if (risk) {
            state.pendingSaveSnap = snap;
            state.permReduceMsg = window.KNAdminUX.formatPermissionReductionConfirm(risk, "customers");
            state.modal = "perm-reduce";
            render();
            return;
          }
        }
      }
      commitDefaultRoleSave(snap);
    });
  }

  function suspend() {
    clearTimeout(state._aiDebounce);
    state.form = null;
    state.formSnapshot = null;
    state.dirty = false;
    state.drawerMode = "edit";
    state.detailsOpen = false;
    state.unusedOpen = false;
    state.permInputMode = "describe";
    state.leaveTo = "";
    state.modal = "";
    state.deleteId = "";
    state.deactivateId = "";
    state.pendingSaveSnap = null;
    state.permReduceMsg = "";
    state.selectOpen = "";
    state.menuOpen = "";
    state.serviceMenuOpen = false;
    state.serviceQuery = "";
    state.permQuery = "";
    state.permSelectedOnly = false;
    state.aiDescribe = "";
    state.aiLoading = false;
    state.aiNoMatch = false;
    state.aiSuggestions = {};
    state.aiApplicableSuggestions = [];
    state.aiServiceSuggestions = [];
    state.aiApplicableReasons = {};
    state.aiServiceReasons = {};
    state.aiFieldMeta = {};
    document
      .getElementById("kn-default-role-root")
      ?.querySelectorAll(".blade-drawer-root, .blade-modal-root")
      .forEach((node) => node.remove());
  }

  function sync() {
    const page = document.getElementById("kn-default-role-page");
    if (!page || page.hidden) {
      return;
    }
    render();
  }

  function init() {
    const page = document.getElementById("kn-default-role-page");
    if (!page || page.dataset.bound) {
      return;
    }
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => {
      if (page.hidden || (!state.selectOpen && !state.menuOpen)) {
        return;
      }
      state.selectOpen = "";
      state.menuOpen = "";
      render();
    });
    document.addEventListener("click", (event) => {
      if (!state.serviceMenuOpen || page.hidden) {
        return;
      }
      if (event.target.closest(".blade-select, [data-drole-service-toggle]")) {
        return;
      }
      persistForm(readForm(page.querySelector("#kn-drole-form")));
      state.serviceMenuOpen = false;
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden) {
        return;
      }
      if (window.KNAdminUX.handleOverlayKeydown(page, event)) {
        return;
      }
      if (event.key !== "Escape") {
        return;
      }
      if (state.serviceMenuOpen) {
        persistForm(readForm(page.querySelector("#kn-drole-form")));
        state.serviceMenuOpen = false;
        render();
        return;
      }
      if (state.modal || state.leaveTo) {
        state.modal = "";
        state.deleteId = "";
        state.deactivateId = "";
        state.leaveTo = "";
        render();
        return;
      }
      if (parseRoute().view === "form") {
        requestLeave(formLeaveHash());
        return;
      }
    });
  }

  window.KNDefaultRoles = {
    sync,
    init,
    suspend,
    parseRoute,
    list() {
      return loadRoles();
    },
    permissionTotal() {
      return ALL_KEYS.length;
    },
    permissionCatalog() {
      return CATALOG;
    },
    isDirty() {
      return Boolean(state.dirty);
    },
    requestLeave,
    open(path) {
      goto(path === "add" ? "#default-role-management/add" : "#default-role-management");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
