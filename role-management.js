(() => {
  const STORAGE_KEY = "kn-roles-v2";
  const ACTIONS = ["create", "update", "delete", "read"];
  const ACTION_LABEL = { create: "Create", update: "Update", delete: "Delete", read: "Read" };
  const APPLICABLE = [{ id: "klearnow", label: "KlearNow" }];
  const CATALOG = [
    {
      id: "administration",
      title: "Administration",
      modules: [
        { id: "kn-user-management", title: "KN User Management" },
        { id: "kn-role-management", title: "KN Role Management" },
        { id: "default-role-management", title: "Default Role Management" }
      ]
    },
    {
      id: "entity",
      title: "Entity Management",
      modules: [
        { id: "kn-customers", title: "KN Customers" },
        { id: "broker-association", title: "Broker Association" }
      ]
    },
    {
      id: "finance",
      title: "Finance Management",
      modules: [
        { id: "kn-credits-management", title: "KN Credits Management" },
        { id: "kn-promo-code-management", title: "KN Promo Code Management" }
      ]
    },
    {
      id: "klearhub",
      title: "KlearHub",
      modules: [
        { id: "kn-visibility-data", title: "KN Visibility Data" },
        { id: "kn-visibility-beta", title: "KN Visibility Beta" },
        { id: "visibility-3", title: "Visibility 3.0" },
        { id: "overview", title: "Overview" }
      ]
    },
    {
      id: "master-data",
      title: "Master Data Management",
      modules: [{ id: "kn-notification-table", title: "KN Notification Table" }]
    },
    {
      id: "content",
      title: "Content Management",
      modules: [
        { id: "release-notes", title: "Release Notes" },
        { id: "user-guides", title: "User Guides" },
        { id: "announcements", title: "Announcements" }
      ]
    },
    {
      id: "notifications",
      title: "Notification Management",
      modules: [
        { id: "default-notification", title: "Default Notification" },
        { id: "trigger-management", title: "Trigger Management" }
      ]
    },
    {
      id: "ops-hub",
      title: "Intelligent OPS Hub",
      modules: [{ id: "intelligent-ops-hub", title: "Intelligent OPS Hub" }]
    },
    {
      id: "transaction-us",
      title: "Transaction Management - US",
      modules: [{ id: "isf", title: "ISF" }]
    },
    {
      id: "analytics",
      title: "Analytics",
      modules: [{ id: "hevo-dashboard", title: "Hevo Dashboard" }]
    }
  ];
  const ALL_KEYS = CATALOG.flatMap((group) => group.modules.flatMap((mod) => ACTIONS.map((action) => keyOf(mod.id, action))));

  const state = {
    sortKey: "name",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
    filters: { name: "", applicable: "", createdBy: "", status: "", coverage: "", chip: "all" },
    form: null,
    formSnapshot: null,
    dirty: false,
    drawerMode: "edit",
    detailsOpen: false,
    unusedOpen: false,
    permInputMode: "describe",
    seenUsedGroups: null,
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
    aiFieldMeta: {},
    permAutoRead: {},
    permBlockedMsg: {},
    aiSeed: "new-role"
  };

  // Shared AI Suggest & Draft engine (see ai-suggest.js).
  function deriveAiSuggestions(description) {
    if (!window.KNAiSuggest?.deriveRolePermissions) {
      return { suggestions: new Map(), groups: new Set(), noMatch: false };
    }
    return window.KNAiSuggest.deriveRolePermissions(description, { actions: ACTIONS, keyOf });
  }

  function setAiLiveStatus(liveEl, message) {
    if (!liveEl) {
      return;
    }
    const text = String(message || "").trim();
    liveEl.textContent = text;
    liveEl.hidden = !text;
  }

  function applyAiDescription(description, opts = {}) {
    const root = document.getElementById("kn-role-root");
    const formEl = root?.querySelector("#kn-role-form");
    if (!formEl || !state.form) {
      return;
    }
    state.aiDescribe = description;
    clearTimeout(state._aiDebounce);
    if (!description.trim()) {
      clearAiPermissionLayer(formEl);
      return;
    }
    state.aiLoading = true;
    const snap = readForm(formEl);
    const nameHint = String(opts.nameHint || "").trim();
    if (nameHint && (!snap.name.trim() || state.aiFieldMeta?.name)) {
      snap.name = nameHint;
      state.aiFieldMeta = { ...state.aiFieldMeta, name: "Suggested from starter prompt" };
    }
    persistForm(snap);
    render();
    requestAnimationFrame(() => {
      const input = document.getElementById("kn-role-root")?.querySelector("[data-ai-describe='role']");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    });
    state._aiDebounce = setTimeout(() => {
      const liveRoot = document.getElementById("kn-role-root");
      if (!state.form || !liveRoot?.querySelector("#kn-role-form")) {
        state.aiLoading = false;
        return;
      }
      const { suggestions, noMatch, edgeMessage, lowConfidence, ambiguous, multiIntent } = deriveAiSuggestions(description);
      const reasonsByKey = {};
      suggestions.forEach((reason, key) => {
        reasonsByKey[key] = reason;
      });
      persistForm(readForm(liveRoot.querySelector("#kn-role-form")));
      const snap = readForm(liveRoot.querySelector("#kn-role-form"));
      const previousAiOnly = Object.keys(state.aiSuggestions || {});
      const layer = window.KNAiSuggest.applyAiPermissionLayer({
        current: snap.permissions,
        previousAiOnly,
        suggestedKeys: [...suggestions.keys()]
      });
      const ensured = window.KNAdminUX.ensureWriteImpliesRead(layer.permissions, ACTIONS);
      syncPermSet(snap.permissions, ensured.permissions);
      if (ensured.autoCheckedRead) {
        applyPermDepFeedback(ensured);
      }
      const owned = window.KNAiSuggest.finalizeAiPermissionOwnership({
        baseline: layer.baseline,
        permissions: snap.permissions,
        reasonsByKey
      });
      state.aiSuggestions = owned.aiSuggestions;
      state.aiLoading = false;
      state.aiNoMatch = noMatch;
      window.KNAiSuggest?.logAudit?.({
        action: "suggest-permissions",
        context: "kn-role",
        field: "permissions",
        origin: "ai",
        value: owned.aiOnly.join(","),
        meta: { noMatch, lowConfidence, ambiguous, multiIntent, edgeMessage: edgeMessage || "", aiOnlyCount: owned.aiOnly.length }
      });
      const affectedGroups = new Set();
      CATALOG.forEach((group) => {
        const groupHasSuggestion = groupKeys(group).some((key) => owned.aiSuggestions[key]);
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
        const input = liveRoot.querySelector("[data-ai-describe='role']");
        if (input) {
          input.focus();
          const end = input.value.length;
          input.setSelectionRange(end, end);
        }
        const liveEl = liveRoot.querySelector("[data-ai-live-role]");
        if (noMatch) {
          setAiLiveStatus(liveEl, edgeMessage || window.KNAiSuggest?.MESSAGES?.noMatch || "No strong matches.");
        } else if (owned.aiOnly.length > 0) {
          const tip = edgeMessage ? ` ${edgeMessage}` : "";
          setAiLiveStatus(liveEl, `${owned.aiOnly.length} permissions suggested. Review them below.${tip}`);
        } else if (suggestions.size > 0) {
          setAiLiveStatus(liveEl, "Matched permissions you already have — nothing new added.");
        } else {
          setAiLiveStatus(liveEl, "");
        }
      });
    }, 600);
  }

  function clearAiPermissionLayer(formEl) {
    const form = formEl || document.getElementById("kn-role-root")?.querySelector("#kn-role-form");
    if (!form || !state.form) {
      return;
    }
    const snap = readForm(form);
    snap.permissions = new Set(window.KNAiSuggest.clearAiOnly(snap.permissions, Object.keys(state.aiSuggestions || {})));
    if (state.aiFieldMeta?.name) {
      snap.name = "";
    }
    state.aiDescribe = "";
    state.aiLoading = false;
    state.aiNoMatch = false;
    state.aiSuggestions = {};
    state.aiFieldMeta = {};
    persistForm(snap);
    render();
    requestAnimationFrame(() => {
      document.getElementById("kn-role-root")?.querySelector("[data-ai-describe='role']")?.focus();
    });
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

  function seedRoles() {
    const tanya = "Tanya Agrawal";
    const priya = "Priya Menon";
    const daniel = "Daniel Chen";
    const hub = ALL_KEYS.filter((key) => key.startsWith("visibility-3:") || key.startsWith("overview:") || key.startsWith("kn-visibility"));
    const admin = ALL_KEYS.filter((key) => /kn-user-management|kn-role-management|default-role/.test(key));
    return [
      { id: "role-vis-3", name: "Visibility 3.0 Operator", applicable: ["klearnow"], createdBy: tanya, active: true, permissions: hub, updatedAt: "2026-08-18T11:20:00" },
      { id: "role-vis-ro", name: "Visibility Read Only", applicable: ["klearnow"], createdBy: daniel, active: true, permissions: hub.filter((key) => key.endsWith(":read")), updatedAt: "2026-08-12T09:10:00" },
      { id: "role-admin", name: "KN Administrator", applicable: ["klearnow"], createdBy: tanya, active: true, permissions: ALL_KEYS.slice(), updatedAt: "2026-08-19T16:40:00" },
      { id: "role-ops", name: "OPS Hub Reviewer", applicable: ["klearnow"], createdBy: priya, active: true, permissions: ALL_KEYS.filter((key) => key.endsWith(":read") || key.startsWith("intelligent-ops")), updatedAt: "2026-08-14T08:05:00" },
      { id: "role-finance", name: "Finance Credits Owner", applicable: ["klearnow"], createdBy: tanya, active: true, permissions: ALL_KEYS.filter((key) => key.startsWith("kn-credits") || key.startsWith("kn-promo")), updatedAt: "2026-08-07T13:22:00" },
      { id: "role-entity", name: "Customer Entity Admin", applicable: ["klearnow"], createdBy: priya, active: true, permissions: ALL_KEYS.filter((key) => key.startsWith("kn-customers") || key.startsWith("broker")), updatedAt: "2026-08-11T10:48:00" },
      { id: "role-content", name: "Content Publisher", applicable: ["klearnow"], createdBy: tanya, active: true, permissions: ALL_KEYS.filter((key) => /release-notes|user-guides|announcements/.test(key)), updatedAt: "2026-08-04T15:00:00" },
      { id: "role-notify", name: "Notification Owner", applicable: ["klearnow"], createdBy: daniel, active: true, permissions: ALL_KEYS.filter((key) => /default-notification|trigger-management|kn-notification-table/.test(key)), updatedAt: "2026-08-16T07:30:00" },
      { id: "role-isf", name: "ISF Filing Specialist", applicable: ["klearnow"], createdBy: priya, active: true, permissions: ALL_KEYS.filter((key) => key.startsWith("isf:")), updatedAt: "2026-08-15T12:12:00" },
      { id: "role-analytics", name: "Analytics Viewer", applicable: ["klearnow"], createdBy: daniel, active: true, permissions: ALL_KEYS.filter((key) => key.startsWith("hevo-dashboard")), updatedAt: "2026-08-09T18:44:00" },
      { id: "role-users", name: "User Access Manager", applicable: ["klearnow"], createdBy: tanya, active: true, permissions: admin, updatedAt: "2026-08-20T06:55:00" },
      { id: "role-broker", name: "Broker Association Admin", applicable: ["klearnow"], createdBy: priya, active: false, permissions: ALL_KEYS.filter((key) => key.startsWith("broker")), updatedAt: "2026-07-28T09:00:00" }
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
        console.info(`[KNRoles] Restored near-empty seeded roles from catalog: ${summary}`);
        return repaired.roles;
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
    return `role-${Date.now().toString(36)}`;
  }

  function parseRoute(hash = location.hash) {
    const path = (hash || "#dashboard").split("?")[0];
    if (path === "#kn-role-management/add") {
      return { view: "form", id: "", preferEdit: true };
    }
    const edit = path.match(/^#kn-role-management\/edit\/([^/?#]+)/);
    if (edit) {
      return { view: "form", id: decodeURIComponent(edit[1]), preferEdit: true };
    }
    const detail = path.match(/^#kn-role-management\/([^/?#]+)$/);
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
    const to = hash || "#kn-role-management";
    if (state.form?.id && String(to).split("?")[0] === "#kn-role-management") {
      state.restoreFocusId = state.form.id;
    }
    state.leaveTo = "";
    state.dirty = false;
    window.KNAdminUX.beginNavigation();
    goto(to);
  }

  function renderModals() {
    const role = state.modal === "delete" ? findRole(state.deleteId) : state.modal === "deactivate" ? findRole(state.deactivateId) : null;
    const people = role ? assignedCount(role.name) : 0;
    return `${window.KNAdminUX.discardModal({
      open: Boolean(state.leaveTo),
      title: "Discard changes",
      description: "Unsaved role changes will be lost.",
      confirmLabel: "Discard"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "delete" && Boolean(role),
      title: "Delete Role?",
      description: `Are you sure you want to delete ${role?.name || "this role"}?${people ? ` ${people} ${people === 1 ? "person is" : "people are"} assigned to it.` : " People assigned to it keep their other roles."}`,
      actionLabel: "Delete Role",
      actionAttr: "data-role-delete-confirm"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "deactivate" && Boolean(role),
      title: "Deactivate role?",
      description: `${role?.name || "This role"} is assigned to ${people} ${people === 1 ? "person" : "people"}. They keep the role until you remove it.`,
      actionLabel: "Deactivate",
      actionAttr: "data-role-deactivate-confirm"
    })}${window.KNAdminUX.confirmModal({
      open: state.modal === "perm-reduce" && Boolean(state.pendingSaveSnap),
      title: "Remove permissions?",
      description: state.permReduceMsg || "This will significantly reduce permissions on this role.",
      actionLabel: "Update Role",
      actionAttr: "data-role-perm-reduce-confirm"
    })}`;
  }

  function goto(hash) {
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function toast(content, color = "positive", anchor) {
    if (typeof window.showBladeToast === "function") {
      window.showBladeToast({ content, color, anchor });
    }
  }

  function iconClose() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  }

  function assignedCount(roleName) {
    try {
      const raw = window.localStorage.getItem("kn-users-v2");
      const users = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(users)) {
        return 0;
      }
      return users.filter((user) => (user.roles || []).includes(roleName)).length;
    } catch (error) {
      return 0;
    }
  }

  function filteredRoles() {
    const q = (value) => String(value || "").toLowerCase();
    const rows = loadRoles().filter((role) => {
      const nameOk = !state.filters.name || q(role.name).includes(q(state.filters.name));
      const createdOk = !state.filters.createdBy || q(role.createdBy).includes(q(state.filters.createdBy));
      const applicableLabel = role.applicable.map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ");
      const appOk =
        !state.filters.applicable ||
        role.applicable.some((id) => q(id) === q(state.filters.applicable));
      const statusHay = role.active ? "active" : "inactive";
      const statusOk = !state.filters.status || statusHay === q(state.filters.status);
      const coverageHay = `${(role.permissions || []).length} ${Math.round(((role.permissions || []).length / Math.max(1, ALL_KEYS.length)) * 100)}`;
      const coverageOk = !state.filters.coverage || coverageHay.includes(q(state.filters.coverage));
      const unused = !(role.permissions || []).length;
      const chipOk =
        state.filters.chip === "all" ||
        (state.filters.chip === "active" && role.active) ||
        (state.filters.chip === "inactive" && !role.active) ||
        (state.filters.chip === "unused" && unused);
      return nameOk && createdOk && appOk && statusOk && coverageOk && chipOk;
    });
    const dir = state.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av;
      let bv;
      if (state.sortKey === "status") {
        av = Number(a.active);
        bv = Number(b.active);
      } else if (state.sortKey === "coverage") {
        av = (a.permissions || []).length;
        bv = (b.permissions || []).length;
      } else if (state.sortKey === "applicable") {
        av = String(a.applicable.map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ")).toLowerCase();
        bv = String(b.applicable.map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ")).toLowerCase();
      } else {
        av = String(a[state.sortKey] || "").toLowerCase();
        bv = String(b[state.sortKey] || "").toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function hasListFilters() {
    const filters = state.filters;
    return Boolean(filters.name || filters.applicable || filters.createdBy || filters.status || filters.coverage || filters.chip !== "all");
  }

  function clearFilters() {
    state.filters = { name: "", applicable: "", createdBy: "", status: "", coverage: "", chip: "all" };
    state.page = 1;
    render();
  }

  function sortHeader(key, label) {
    return window.KNAdminUX.sortHeader({
      key,
      label,
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      attr: "data-role-sort"
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
          .map((role) => {
            const people = assignedCount(role.name);
            const ux = window.KNAdminUX;
            return `<tr data-role-id="${escapeHtml(role.id)}" tabindex="0" class="${role.id === selectedId ? "is-selected" : ""}">
          <td>
            ${ux.titleCell({
              title: role.name,
              subtitle: `${people ? `${people} ${people === 1 ? "person" : "people"} assigned` : "Not assigned yet"} · Updated ${ux.relativeTime(role.updatedAt)}`,
              href: `#kn-role-management/${encodeURIComponent(role.id)}`,
              navAttr: `data-role-nav="detail" data-role-id="${escapeHtml(role.id)}"`,
              initials: ux.initials(role.name)
            })}
          </td>
          <td class="admin-table-chips">${window.KNAdminUX.chipsOverflow(role.applicable.map((id) => APPLICABLE.find((item) => item.id === id)?.label || id))}</td>
          <td class="type-body-sm">${escapeHtml(role.createdBy)}</td>
          <td>${ux.coverage(role.permissions, ALL_KEYS.length)}</td>
          <td>${ux.statusBadge(role.active)}</td>
          <td>
            <div class="user-row-actions">
              <button class="icon-btn" type="button" data-role-edit="${escapeHtml(role.id)}" aria-label="Edit ${escapeHtml(role.name)}" data-tooltip="Edit role">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/></svg>
              </button>
              ${ux.moreMenu({
                id: role.id,
                open: state.menuOpen === role.id,
                items: [
                  { label: "Duplicate", attr: `data-role-duplicate="${escapeHtml(role.id)}"` },
                  { label: "Delete", attr: `data-role-delete="${escapeHtml(role.id)}"`, tone: "negative" }
                ]
              })}
            </div>
          </td>
        </tr>`;
          })
          .join("")
      : `<tr class="role-empty-row"><td colspan="6">${window.KNAdminUX.emptyState({
          title: hasListFilters() ? "No roles match this view" : "No roles yet",
          description: hasListFilters() ? "Clear filters to see every internal role, or add a new one." : "Add a role so people can be assigned access.",
          primaryLabel: "Add Role",
          primaryHref: "#kn-role-management/add",
          primaryAttr: 'data-role-nav="add"',
          secondaryLabel: hasListFilters() ? "Clear filters" : "",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    const all = loadRoles();
    const unused = all.filter((role) => !(role.permissions || []).length).length;
    const inactive = all.filter((role) => !role.active);
    const chip = state.filters.chip;
    const ux = window.KNAdminUX;

    return `<header class="role-page__head">
      <div>
        <h1 class="type-heading-h3 type-weight-semibold">KN Role Management</h1>
        <p class="type-body-sm">Internal KlearNow access for Visibility, ISF, finance, and administration.</p>
      </div>
      <a class="btn btn--primary btn--md type-ui-md" href="#kn-role-management/add" data-role-nav="add">Add Role</a>
    </header>
    ${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: all.length, selected: chip === "all" },
        { id: "active", label: "Active", count: all.filter((role) => role.active).length, selected: chip === "active" },
        { id: "inactive", label: "Inactive", count: inactive.length, selected: chip === "inactive" },
        { id: "unused", label: "No permissions", count: unused, selected: chip === "unused" }
      ],
      results: `${rows.length} ${rows.length === 1 ? "role" : "roles"}. Page ${state.page} of ${pages}. Sorted by ${state.sortKey}, ${state.sortDir === "desc" ? "descending" : "ascending"}.`,
      insight: unused
        ? { copy: "One or more roles have no permissions selected.", action: "Show empty roles", chip: "unused" }
        : null
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin" aria-label="KN roles">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("name", "Role Name")}
              ${sortHeader("applicable", "Applicable To")}
              ${sortHeader("createdBy", "Owner")}
              ${sortHeader("coverage", "Coverage")}
              ${sortHeader("status", "Status")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-role-filter", key: "name", value: state.filters.name, label: "role name", placeholder: "Search by role name" })}
              ${ux.colBladeSelect({ attr: "data-role-filter", key: "applicable", value: state.filters.applicable, label: "applicable to", open: state.selectOpen, options: APPLICABLE.map(item => ({ value: item.id, label: item.label })) })}
              ${ux.colFilter({ attr: "data-role-filter", key: "createdBy", value: state.filters.createdBy, label: "owner", placeholder: "Search by owner" })}
              ${ux.colFilter({ attr: "data-role-filter", key: "coverage", value: state.filters.coverage, label: "coverage" })}
              ${ux.colBladeSelect({ attr: "data-role-filter", key: "status", value: state.filters.status, label: "status", open: state.selectOpen, options: [
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Draft", label: "Draft" }
              ] })}
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
        pageAttr: "data-role-page",
        label: "Role pages",
        sizeSelect: adminSelect({
          id: "kn-role-pagesize",
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
      applicable: role?.applicable?.slice() || ["klearnow"],
      permissions: new Set(role?.permissions || []),
      error: ""
    };
  }

  /** Prefill Add Role from panel draft — never submits. */
  function applyPendingAiDraft() {
    const draft = window.KNAiSuggest?.consumeDraft?.("role");
    if (!draft || !state.form) {
      return;
    }
    state.form.name = draft.name || state.form.name;
    if (Array.isArray(draft.applicable) && draft.applicable.length) {
      state.form.applicable = draft.applicable.slice();
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
    state.aiFieldMeta = {
      name: draft.nameReason || "Prefill from Klear Assistant draft",
      applicable: draft.applicableReasons || {}
    };
    state.formSnapshot = snapshotForm(state.form);
    state.dirty = isFormDataDirty(state.form);
    window.KNAiSuggest?.logAudit?.({
      action: "apply-draft-to-form",
      context: "kn-role",
      field: "form",
      origin: "ai",
      value: state.form.name
    });
    toast("AI draft applied to the form — review and click Add Role to save.", "notice");
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
    const btn = (root || document).querySelector("#kn-role-submit-btn");
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
      live.textContent = editing ? "Editing permissions" : "Viewing role summary";
    });
  }

  function restorePermSmartFocus(root, mode = state.permInputMode) {
    const selector = mode === "describe" ? "[data-ai-describe='role']" : "[data-admin-perm-q]";
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
    state.drawerMode = "edit";
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

  function applyPermDepFeedback(result, liveSelector = "[data-ai-live-role]") {
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
        if (state.form && document.getElementById("kn-role-form")) {
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
        if (state.form && document.getElementById("kn-role-form")) {
          render();
        }
      }, 2800);
    }
    const announcement = window.KNAdminUX.permDependencyMessage(result, ACTION_LABEL);
    if (announcement) {
      requestAnimationFrame(() => {
        setAiLiveStatus(document.querySelector(liveSelector), announcement);
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
      ? `<span class="badge badge--ai type-caption-sm type-weight-medium ai-suggest-count" aria-label="${aiGroupKeys.length} AI-suggested permissions in this category"><span class="ai-suggest-mark" aria-hidden="true">✦</span> ${aiGroupKeys.length} suggested</span>`
      : "";
    return window.KNAdminUX.accordionItem({
      id: group.id,
      title: group.title,
      open,
      modules: group.modules,
      includesLabel: "Includes these KlearNow services:",
      // Coverage tone stays on the count badge only — not the whole row (avoids peach/notice chrome).
      leadingExtra: aiCountBadge,
      trailing: `<span class="badge badge--${countTone} type-caption-sm type-weight-medium role-perm__count">${selected}/${keys.length}</span>`,
      body: `
        <div class="role-perm__row role-perm__row--head">
          <span class="type-caption-sm blade-field__hint">Permission</span>
          <div class="role-perm__actions">
            ${ACTIONS.map((action) => {
              const colKeys = mods.map((mod) => keyOf(mod.id, action));
              return check("", "", allSelected(permissions, colKeys), ACTION_LABEL[action], {
                attr: `data-role-select-col="${escapeHtml(group.id)}" data-action="${action}"`,
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
                  attr: `data-role-select-row="${escapeHtml(mod.id)}"`,
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
            suffix: "role",
            label: `Other categories (${unusedHtml.length})`
          })
        : ""
    }`;
  }

  function renderDetailsGrid(role, people) {
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
                <span class="form-display-field__label">PEOPLE ASSIGNED</span>
                <span class="form-display-field__value">${
                  people
                    ? `<a class="blade-link type-body-sm" href="#kn-user-management?role=${encodeURIComponent(role.name)}">${people} ${people === 1 ? "person" : "people"}</a>`
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
    return `<div class="role-access-readonly" aria-label="Access">
      <div class="form-display-field">
        <span class="form-display-field__label">NAME</span>
        <span class="form-display-field__value">${escapeHtml(form.name || "Untitled role")}</span>
      </div>
      <div class="form-display-field">
        <span class="form-display-field__label">WHO IT APPLIES TO</span>
        <span class="form-display-field__value">${escapeHtml(applicable || "—")}</span>
      </div>
    </div>`;
  }

  function formLeaveHash() {
    return "#kn-role-management";
  }

  function renderFormDrawer() {
    const form = state.form;
    const isEdit = Boolean(form.id);
    const role = isEdit ? findRole(form.id) : null;
    const people = role ? assignedCount(role.name) : 0;
    const editing = !isEdit || state.drawerMode === "edit";
    const title = isEdit ? role?.name || form.name || "Edit Role" : "Add Role";
    const applicable = (role?.applicable || form.applicable || []).map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ");
    const coveragePct = ALL_KEYS.length ? Math.round((form.permissions.size / ALL_KEYS.length) * 100) : 0;
    const summary = window.KNAdminUX.accessSummary(form.permissions, CATALOG, ACTIONS);
    const submitDisabled = !canSubmitRole(form);
    const accessFields = !editing
      ? ""
      : `<section class="role-form-zone role-form-zone--access" aria-label="Basics">
            <div class="blade-field">
              <label class="type-caption-sm type-weight-medium" for="kn-role-name">Name <span class="role-req" aria-hidden="true">*</span></label>
              <input class="blade-field__control type-body-sm${state.aiFieldMeta?.name ? " is-ai-suggested-field" : ""}" id="kn-role-name" name="name" type="text" required maxlength="80" placeholder="e.g. Billing reviewer" value="${escapeHtml(form.name)}" autocomplete="off" />
              ${state.aiFieldMeta?.name ? window.KNAiSuggest.reasonTag(state.aiFieldMeta.name) : ""}
              ${form.error ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.error)}</p>` : ""}
            </div>
            <div class="blade-field role-applicable" role="group" aria-labelledby="kn-role-applicable-title">
              ${window.KNAdminUX.applicableHead({
                titleId: "kn-role-applicable-title",
                title: "Who this applies to",
                allSelected: form.applicable.length === APPLICABLE.length,
                attr: "data-role-select-applicable"
              })}
              <div class="role-applicable__row">
                ${APPLICABLE.map((item) => check("applicable", item.id, form.applicable.includes(item.id), item.label)).join("")}
              </div>
            </div>
          </section>`;
    const permFields = !editing
      ? ""
      : `<section class="role-form-zone role-form-zone--perms role-perm" aria-labelledby="kn-role-perm-title">
            <header class="role-perm__head">
              <h3 class="type-heading-h5 type-weight-semibold" id="kn-role-perm-title">What they can do</h3>
            </header>
            ${window.KNAdminUX.permissionAnomalyFlagHtml(form.name, form.permissions, { idPrefix: "perm-anomaly-role", catalog: CATALOG })}
            ${window.KNAdminUX.permFilters({
              query: state.permQuery,
              selectedOnly: state.permSelectedOnly,
              aiDescribe: state.aiDescribe,
              aiLoading: state.aiLoading,
              aiNoMatch: state.aiNoMatch,
              aiAttr: "role",
              inputMode: state.permInputMode,
              selectedCount: form.permissions.size,
              totalCount: ALL_KEYS.length,
              ...window.KNAdminUX.aiRoleAssist({
                name: form.name,
                permissions: form.permissions,
                catalog: CATALOG,
                mode: "role",
                seed: state.aiSeed
              })
            })}
            ${renderPermBrowser(form.permissions)}
          </section>`;
    return `<div class="blade-drawer-root ${isEdit ? "admin-profile-drawer" : "admin-form-drawer"} is-open" id="admin-role-form-drawer">
      <div class="blade-drawer__overlay" data-role-form-close tabindex="-1"></div>
      <aside class="blade-drawer" role="dialog" aria-modal="true" aria-labelledby="kn-role-form-title">
        <header class="blade-drawer__header">
          <div class="blade-drawer__titles">
            <div class="admin-drawer-title-row">
              <h2 class="type-heading-h5 type-weight-semibold" id="kn-role-form-title" tabindex="-1">${escapeHtml(title)}</h2>
              ${role ? window.KNAdminUX.statusBadge(role.active) : ""}
            </div>
            <p class="type-caption-sm">${isEdit ? escapeHtml(applicable || "KlearNow") : "Internal KlearNow access"}</p>
          </div>
          ${
            role
              ? window.KNAdminUX.statusSwitch({
                  active: role.active,
                  toggleAttr: `data-role-toggle="${escapeHtml(role.id)}"`,
                  labelId: "kn-role-status-label"
                })
              : ""
          }
          <button class="icon-btn" type="button" data-role-form-close aria-label="Close">${iconClose()}</button>
        </header>
        <form class="blade-drawer__body role-form" id="kn-role-form" novalidate>
          <p class="visually-hidden" aria-live="polite" data-admin-mode-live></p>
          ${
            role
              ? `<section class="role-form-zone role-form-zone--summary" aria-label="Role summary">
            ${window.KNAdminUX.roleMetaLine({
              owner: role.createdBy,
              updatedAt: role.updatedAt,
              count: people,
              countSingular: "person",
              countPlural: "people",
              countHref: people ? `#kn-user-management?role=${encodeURIComponent(role.name)}` : "",
              coveragePct,
              detailsOpen: state.detailsOpen,
              detailsId: "kn-role-meta-details",
              detailsHtml: renderDetailsGrid(role, people),
              toggleAttr: "data-admin-details-toggle"
            })}
            <p class="role-access-summary type-body-sm">${escapeHtml(summary)}</p>
            ${editing ? "" : renderAccessReadonly(form)}
          </section>`
              : ""
          }
          <div id="kn-role-edit-panel">
            ${accessFields}${permFields}
          </div>
        </form>
        <footer class="blade-drawer__footer">
          ${isEdit ? `<div class="role-delete-action"><button class="btn btn--primary btn--color-negative btn--md type-ui-md" type="button" data-role-delete="${escapeHtml(form.id)}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><path d="M3 4h10M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5.5 4l.5 8M10.5 4l-.5 8M7.5 4v8M8.5 4v8"/></svg>
            Delete Role
          </button></div>` : ""}
          <div class="blade-drawer__footer-actions">
            <button class="btn btn--tertiary btn--md type-ui-md" type="button" data-role-form-close>Cancel</button>
            <button class="btn btn--primary btn--md type-ui-md" type="submit" form="kn-role-form" id="kn-role-submit-btn" ${window.KNAdminUX.submitButtonAttrs(submitDisabled)}>${isEdit ? "Update Role" : "Add Role"}</button>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function render() {
    const root = document.getElementById("kn-role-root");
    const page = document.getElementById("kn-role-page");
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
          toast("That role is no longer available.", "notice");
          goto("#kn-role-management");
          return;
        }
        state.form = blankForm(existing);
        resetDrawerChrome(existing);
        if (route.preferEdit) {
          state.drawerMode = "edit";
        }
        state.permQuery = "";
        state.permSelectedOnly = false;
        state.menuOpen = "";
        state.aiDescribe = "";
        state.aiLoading = false;
        state.aiNoMatch = false;
        state.aiSuggestions = {};
        state.aiFieldMeta = {};
        state.aiSeed = existing?.id || `new-role-${Date.now()}`;
        if (!existing) {
          applyPendingAiDraft();
        }
      } else if (!route.id && window.KNAiSuggest?.peekDraft?.("role")) {
        applyPendingAiDraft();
      }
    } else {
      state.form = null;
      state.formSnapshot = null;
      state.dirty = false;
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
    if (state.restoreFocusId && !window.KNAdminUX.activeOverlay(page)) {
      const id = state.restoreFocusId;
      state.restoreFocusId = "";
      requestAnimationFrame(() => {
        document.querySelector(`#kn-role-root tr[data-role-id="${CSS.escape(id)}"]`)?.focus();
      });
    }
  }

  function readForm(formEl) {
    if (!formEl) {
      return {
        name: state.form?.name || "",
        applicable: [...(state.form?.applicable || [])],
        permissions: new Set(state.form?.permissions || [])
      };
    }
    const nameInput = formEl.querySelector("#kn-role-name");
    if (!nameInput && state.form) {
      return {
        name: state.form.name || "",
        applicable: [...(state.form.applicable || [])],
        permissions: new Set(state.form.permissions || [])
      };
    }
    const name = nameInput?.value.trim() || "";
    const applicable = [...formEl.querySelectorAll('input[name="applicable"]:checked')].map((input) => input.value);
    // Never rebuild the catalog from DOM checkboxes — search / selected-only / collapsed
    // categories omit rows, and a naive or stale merge can wipe unrelated keys.
    // Perm handlers update state.form.permissions via applyPermissionToggle / toggleKeys.
    const permissions = new Set(state.form?.permissions || []);
    return { name, applicable, permissions };
  }

  function persistForm(next) {
    const permissions =
      next && next.permissions != null ? next.permissions : state.form?.permissions || new Set();
    state.form = { ...state.form, ...next, permissions: new Set(permissions) };
    state.dirty = isFormDataDirty(state.form);
  }

  function commitRoleSave(snap) {
    const roles = loadRoles();
    if (state.form.id) {
      const current = roles.find((role) => role.id === state.form.id);
      if (current) {
        current.name = snap.name;
        current.applicable = snap.applicable;
        current.permissions = [...snap.permissions];
        current.updatedAt = new Date().toISOString();
      }
      saveRoles(roles);
      state.form = { ...state.form, ...snap, permissions: snap.permissions, error: "" };
      state.formSnapshot = snapshotForm(state.form);
      state.dirty = false;
      state.drawerMode = "edit";
      state.modal = "";
      state.pendingSaveSnap = null;
      state.permReduceMsg = "";
      toast(`${snap.name} saved.`);
      goto(`#kn-role-management/${encodeURIComponent(state.form.id)}`);
      return;
    }
    const id = uid();
    roles.unshift({
      id,
      name: snap.name,
      applicable: snap.applicable,
      createdBy: "Tanya Agrawal",
      active: true,
      updatedAt: new Date().toISOString(),
      permissions: [...snap.permissions]
    });
    saveRoles(roles);
    state.dirty = false;
    state.modal = "";
    state.pendingSaveSnap = null;
    state.permReduceMsg = "";
    toast(`${snap.name} added.`);
    goto(`#kn-role-management/${encodeURIComponent(id)}`);
  }

  function bind(root) {
    root.addEventListener("click", (event) => {
      if (
        window.KNAdminUX.handleAccordionClick(event, {
          openGroups: state.openGroups,
          setOpen: (next) => {
            const formEl = root.querySelector("#kn-role-form");
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
        const formEl = root.querySelector("#kn-role-form");
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
        const formEl = root.querySelector("#kn-role-form");
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
            const describe = document.getElementById("kn-role-root")?.querySelector("[data-ai-describe='role']");
            (describe || document.getElementById("kn-role-name"))?.focus();
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
            const formEl = root.querySelector("#kn-role-form");
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
      if (event.target.closest("[data-role-select-group], [data-role-select-row], [data-role-select-col], [data-role-select-all], [data-role-select-applicable]")) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.target.closest("[data-admin-perm-selected]")) {
        event.preventDefault();
        persistForm(readForm(root.querySelector("#kn-role-form")));
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
      const selectHandled = window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (next) => {
          state.selectOpen = next;
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
      if (event.target.closest("[data-role-perm-reduce-confirm]")) {
        event.preventDefault();
        const snap = state.pendingSaveSnap;
        if (snap) {
          commitRoleSave(snap);
        } else {
          state.modal = "";
          render();
        }
        return;
      }
      if (event.target.closest("[data-role-profile-close], [data-role-form-close]")) {
        event.preventDefault();
        requestLeave(formLeaveHash());
        return;
      }
      const peopleLink = event.target.closest("[data-role-people]");
      if (peopleLink) {
        event.preventDefault();
        event.stopPropagation();
        requestLeave(`#kn-user-management?role=${encodeURIComponent(peopleLink.getAttribute("data-role-people") || "")}`);
        return;
      }
      const nav = event.target.closest("[data-role-nav]");
      if (nav) {
        event.preventDefault();
        const to = nav.getAttribute("data-role-nav");
        const id = nav.getAttribute("data-role-id") || "";
        const hash =
          to === "add"
            ? "#kn-role-management/add"
            : to === "edit" || to === "detail"
              ? `#kn-role-management/${encodeURIComponent(id)}`
              : "#kn-role-management";
        if (to === "detail" || to === "edit") {
          const route = parseRoute();
          if (route.view === "form" && route.id === id) {
            requestLeave("#kn-role-management");
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
      const row = event.target.closest("tr[data-role-id]");
      if (row && !event.target.closest("a, button, input, label, .blade-select, .user-row-actions, .admin-more")) {
        const id = row.getAttribute("data-role-id");
        const route = parseRoute();
        if (route.view !== "list" && route.id === id) {
          requestLeave("#kn-role-management");
          return;
        }
        goto(`#kn-role-management/${encodeURIComponent(id)}`);
        return;
      }
      const sort = event.target.closest("[data-role-sort]");
      if (sort) {
        const key = sort.getAttribute("data-role-sort");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-role-page]");
      if (pageBtn && !pageBtn.disabled) {
        state.page = Number(pageBtn.getAttribute("data-role-page")) || 1;
        render();
        return;
      }
      const edit = event.target.closest("[data-role-edit]");
      if (edit) {
        goto(`#kn-role-management/edit/${edit.getAttribute("data-role-edit")}`);
        return;
      }
      const duplicate = event.target.closest("[data-role-duplicate]");
      if (duplicate) {
        const source = loadRoles().find((role) => role.id === duplicate.getAttribute("data-role-duplicate"));
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
          goto("#kn-role-management/add");
        }
        return;
      }
      const deleteBtn = event.target.closest("[data-role-delete]");
      if (deleteBtn) {
        state.menuOpen = "";
        state.deleteId = deleteBtn.getAttribute("data-role-delete");
        state.modal = "delete";
        render();
        return;
      }
      if (event.target.closest("[data-role-delete-confirm]")) {
        const removed = findRole(state.deleteId);
        saveRoles(loadRoles().filter((role) => role.id !== state.deleteId));
        state.modal = "";
        state.deleteId = "";
        toast(`${removed?.name || "Role"} deleted.`, "notice");
        goto("#kn-role-management");
        return;
      }
      if (event.target.closest("[data-role-deactivate-confirm]")) {
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
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        state.filters.chip = chip.getAttribute("data-admin-chip") || "all";
        state.page = 1;
        render();
        return;
      }
      const groupAll = event.target.closest("[data-role-select-group]");
      if (groupAll) {
        event.preventDefault();
        const group = CATALOG.find((item) => item.id === groupAll.getAttribute("data-role-select-group"));
        if (!group || !state.form) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-role-form"));
        snap.permissions = new Set(state.form.permissions || []);
        toggleKeys(snap.permissions, groupKeys(group));
        persistForm(snap);
        render();
        return;
      }
      const colAll = event.target.closest("[data-role-select-col]");
      if (colAll) {
        event.preventDefault();
        const group = CATALOG.find((item) => item.id === colAll.getAttribute("data-role-select-col"));
        const action = colAll.getAttribute("data-action");
        if (!group || !ACTIONS.includes(action) || !state.form) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-role-form"));
        snap.permissions = new Set(state.form.permissions || []);
        toggleKeys(
          snap.permissions,
          visibleModules(group, snap.permissions).map((mod) => keyOf(mod.id, action))
        );
        persistForm(snap);
        render();
        return;
      }
      const rowAll = event.target.closest("[data-role-select-row]");
      if (rowAll) {
        event.preventDefault();
        if (!state.form) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-role-form"));
        snap.permissions = new Set(state.form.permissions || []);
        toggleKeys(
          snap.permissions,
          ACTIONS.map((action) => keyOf(rowAll.getAttribute("data-role-select-row"), action))
        );
        persistForm(snap);
        render();
        return;
      }
      if (event.target.closest("[data-role-select-all]")) {
        event.preventDefault();
        if (!state.form) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-role-form"));
        snap.permissions = new Set(state.form.permissions || []);
        toggleKeys(snap.permissions, ALL_KEYS);
        persistForm(snap);
        render();
        return;
      }
      if (event.target.closest("[data-role-select-applicable]")) {
        event.preventDefault();
        const snap = readForm(root.querySelector("#kn-role-form"));
        snap.applicable =
          snap.applicable.length === APPLICABLE.length ? [] : APPLICABLE.map((item) => item.id);
        persistForm(snap);
        render();
      }
    });

    root.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-role-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-role-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      const size = event.target.closest("[data-role-pagesize]");
      if (size) {
        state.pageSize = Number(size.value) || 10;
        state.page = 1;
        render();
        return;
      }
      const toggle = event.target.closest("[data-role-toggle]");
      if (toggle) {
        const roles = loadRoles();
        const role = roles.find((item) => item.id === toggle.getAttribute("data-role-toggle"));
        if (!role) {
          return;
        }
        if (role.active && !toggle.checked && assignedCount(role.name) > 0) {
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
      if (event.target.closest("[data-role-select-row], [data-role-select-col], [data-role-select-group]")) {
        return;
      }
      if (event.target.closest("#kn-role-form")) {
        const formEl = root.querySelector("#kn-role-form");
        if (event.target.matches('input[name="perm"]')) {
          const key = event.target.value;
          const checked = event.target.checked;
          const result = window.KNAdminUX.applyPermissionToggle(state.form?.permissions, key, checked, ACTIONS);
          applyPermDepFeedback(result);
          const snap = readForm(formEl);
          // Apply toggle result only — never re-merge DOM (auto-Read is not in DOM yet).
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
      const filter = event.target.closest("[data-role-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-role-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      if (event.target.matches("[data-admin-perm-q]")) {
        persistForm(readForm(root.querySelector("#kn-role-form")));
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
      if (event.target.matches("[data-ai-describe='role']")) {
        applyAiDescription(event.target.value);
        return;
      }
      if (event.target.id === "kn-role-name") {
        if (state.aiFieldMeta?.name) {
          state.aiFieldMeta = { ...state.aiFieldMeta, name: "" };
          window.KNAiSuggest?.logAudit?.({
            action: "manual-edit",
            context: "kn-role",
            field: "name",
            origin: "manual",
            value: event.target.value
          });
        }
        persistForm(readForm(root.querySelector("#kn-role-form")));
        syncSubmitBtn(root);
      }
    });

    root.addEventListener("keydown", (event) => {
      if (
        window.KNAdminUX.handlePermInputModeKey(event, {
          mode: state.permInputMode,
          setMode: (next) => {
            const formEl = root.querySelector("#kn-role-form");
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
    });

    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-ai-prompt='role']")) {
        event.preventDefault();
        const chip = event.target.closest("[data-ai-prompt='role']");
        applyAiDescription(chip.getAttribute("data-ai-prompt-text") || "", {
          nameHint: chip.getAttribute("data-ai-name-hint") || ""
        });
        return;
      }
      if (event.target.closest("[data-ai-describe-clear='role']")) {
        event.preventDefault();
        window.KNAiSuggest?.logAudit?.({
          action: "clear-ai-suggestions",
          context: "kn-role",
          field: "permissions",
          origin: "manual",
          value: ""
        });
        clearAiPermissionLayer(root.querySelector("#kn-role-form"));
        return;
      }
    }, true);

    root.addEventListener("submit", (event) => {
      if (!event.target.matches("#kn-role-form")) {
        return;
      }
      event.preventDefault();
      const snap = readForm(event.target);
      if (!canSubmitRole({ ...state.form, ...snap, permissions: snap.permissions })) {
        return;
      }
      if (!snap.name) {
        state.form = { ...state.form, ...snap, error: "Enter a role name." };
        render();
        document.getElementById("kn-role-name")?.focus();
        return;
      }
      if (!snap.applicable.length) {
        state.form = { ...state.form, ...snap, error: "Select who this role applies to." };
        render();
        return;
      }
      const roles = loadRoles();
      const duplicate = roles.some((role) => role.id !== state.form.id && role.name.toLowerCase() === snap.name.toLowerCase());
      if (duplicate) {
        state.form = { ...state.form, ...snap, error: "A role with this name already exists." };
        render();
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
            assignedCount(current.name)
          );
          if (risk) {
            state.pendingSaveSnap = snap;
            state.permReduceMsg = window.KNAdminUX.formatPermissionReductionConfirm(risk, "people");
            state.modal = "perm-reduce";
            render();
            return;
          }
        }
      }
      commitRoleSave(snap);
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
    state.permQuery = "";
    state.permSelectedOnly = false;
    state.aiDescribe = "";
    state.aiLoading = false;
    state.aiNoMatch = false;
    state.aiSuggestions = {};
    state.aiFieldMeta = {};
    document
      .getElementById("kn-role-root")
      ?.querySelectorAll(".blade-drawer-root, .blade-modal-root")
      .forEach((node) => node.remove());
  }

  function sync() {
    const page = document.getElementById("kn-role-page");
    if (!page || page.hidden) {
      return;
    }
    render();
  }

  function init() {
    const page = document.getElementById("kn-role-page");
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
      if (state.selectOpen) {
        state.selectOpen = "";
        render();
      }
    });
  }

  window.KNRoles = {
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
      goto(path === "add" ? "#kn-role-management/add" : "#kn-role-management");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
