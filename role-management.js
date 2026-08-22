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
    filters: { name: "", applicable: "", createdBy: "", status: "", q: "", chip: "all" },
    form: null,
    dirty: false,
    selectOpen: "",
    modal: "",
    deleteId: "",
    deactivateId: "",
    leaveTo: "",
    restoreFocusId: "",
    openGroups: null,
    menuOpen: "",
    permQuery: "",
    permSelectedOnly: false
  };

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
      if (!raw) {
        return seedRoles();
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : seedRoles();
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
      return { view: "form", id: "" };
    }
    const edit = path.match(/^#kn-role-management\/edit\/([^/?#]+)/);
    if (edit) {
      return { view: "form", id: decodeURIComponent(edit[1]) };
    }
    const detail = path.match(/^#kn-role-management\/([^/?#]+)$/);
    if (detail && detail[1] !== "add") {
      return { view: "form", id: decodeURIComponent(detail[1]) };
    }
    return { view: "list", id: "" };
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
    if (!state.dirty) {
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
    const search = q(state.filters.q);
    const rows = loadRoles().filter((role) => {
      const nameOk = !state.filters.name || q(role.name).includes(q(state.filters.name));
      const createdOk = !state.filters.createdBy || q(role.createdBy).includes(q(state.filters.createdBy));
      const appOk = !state.filters.applicable || role.applicable.includes(state.filters.applicable);
      const statusOk =
        !state.filters.status ||
        (state.filters.status === "active" ? role.active : !role.active);
      const searchOk =
        !search ||
        q(role.name).includes(search) ||
        q(role.createdBy).includes(search);
      const unused = !(role.permissions || []).length;
      const chipOk =
        state.filters.chip === "all" ||
        (state.filters.chip === "active" && role.active) ||
        (state.filters.chip === "inactive" && !role.active) ||
        (state.filters.chip === "unused" && unused);
      return nameOk && createdOk && appOk && statusOk && searchOk && chipOk;
    });
    const dir = state.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = state.sortKey === "status" ? Number(a.active) : String(a[state.sortKey] || "").toLowerCase();
      const bv = state.sortKey === "status" ? Number(b.active) : String(b[state.sortKey] || "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function hasListFilters() {
    const filters = state.filters;
    return Boolean(filters.q || filters.chip !== "all");
  }

  function clearFilters() {
    state.filters = { name: "", applicable: "", createdBy: "", status: "", q: "", chip: "all" };
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
            <a class="blade-link admin-name-link" href="#kn-role-management/${encodeURIComponent(role.id)}" data-role-nav="detail" data-role-id="${escapeHtml(role.id)}">
              <span class="type-body-sm type-weight-medium">${escapeHtml(role.name)}</span>
              <span class="type-caption-sm">${people ? `<span data-role-people="${escapeHtml(role.name)}">${people} ${people === 1 ? "person" : "people"} assigned</span>` : "Not assigned yet"} · Updated ${escapeHtml(ux.relativeTime(role.updatedAt))}</span>
            </a>
          </td>
          <td class="type-body-sm">${escapeHtml(role.applicable.map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", "))}</td>
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
      search: { value: state.filters.q, placeholder: "Search roles or owners", label: "Search KN roles" },
      chips: [
        { id: "all", label: "All", count: all.length, selected: chip === "all" },
        { id: "active", label: "Active", count: all.filter((role) => role.active).length, selected: chip === "active" },
        { id: "inactive", label: "Inactive", count: inactive.length, selected: chip === "inactive" },
        { id: "unused", label: "No permissions", count: unused, selected: chip === "unused" }
      ],
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
              <th scope="col"><span class="type-caption-sm type-weight-medium">Coverage</span></th>
              ${sortHeader("status", "Status")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
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

  function check(name, value, checked, label, extras = {}) {
    const labelClass = extras.labelClass || "type-body-sm";
    const text = extras.hideLabel
      ? `<span class="visually-hidden">${escapeHtml(label)}</span>`
      : `<span class="${labelClass}">${escapeHtml(label)}</span>`;
    return `<label class="blade-check${extras.hideLabel ? " blade-check--bare" : ""}${extras.className ? ` ${extras.className}` : ""}"${extras.attr ? ` ${extras.attr}` : ""}>
      <input type="checkbox"${name ? ` name="${escapeHtml(name)}" value="${escapeHtml(value)}"` : ""} ${checked ? "checked" : ""} ${extras.indeterminate ? "data-indeterminate" : ""} aria-label="${escapeHtml(extras.ariaLabel || label)}" />
      <span class="blade-check__box" aria-hidden="true"></span>
      ${text}
    </label>`;
  }

  function groupKeys(group) {
    return group.modules.flatMap((mod) => ACTIONS.map((action) => keyOf(mod.id, action)));
  }

  function allSelected(set, keys) {
    return Boolean(keys.length) && keys.every((key) => set.has(key));
  }

  function someSelected(set, keys) {
    return keys.some((key) => set.has(key)) && !allSelected(set, keys);
  }

  function toggleKeys(set, keys) {
    if (allSelected(set, keys)) {
      keys.forEach((key) => set.delete(key));
      return;
    }
    keys.forEach((key) => set.add(key));
  }

  function bindIndeterminate(root) {
    root.querySelectorAll("input[data-indeterminate]").forEach((input) => {
      input.indeterminate = true;
    });
  }

  function visibleModules(group, permissions) {
    const q = state.permQuery.trim().toLowerCase();
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
    const q = state.permQuery.trim();
    const open = Boolean(state.openGroups?.has(group.id)) || Boolean(q);
    const countTone = selected === keys.length ? "positive" : selected ? "information" : "neutral";
    return window.KNAdminUX.accordionItem({
      id: group.id,
      title: group.title,
      open,
      trailing: `<span class="badge badge--${countTone} type-caption-sm type-weight-medium">${selected}/${keys.length}</span>`,
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
            return `<div class="role-perm__row">
              ${check("", "", allSelected(permissions, rowKeys), mod.title, {
                attr: `data-role-select-row="${escapeHtml(mod.id)}"`,
                indeterminate: someSelected(permissions, rowKeys),
                className: "role-perm__module",
                labelClass: "type-ui-sm type-weight-medium"
              })}
              <div class="role-perm__actions">
                ${ACTIONS.map((action) =>
                  check("perm", keyOf(mod.id, action), permissions.has(keyOf(mod.id, action)), ACTION_LABEL[action], {
                    hideLabel: true,
                    ariaLabel: `${ACTION_LABEL[action]} ${mod.title}`
                  })
                ).join("")}
              </div>
            </div>`;
          })
          .join("")}`
    });
  }

  function formLeaveHash() {
    return "#kn-role-management";
  }

  function renderFormDrawer() {
    const form = state.form;
    const isEdit = Boolean(form.id);
    const role = isEdit ? findRole(form.id) : null;
    const people = role ? assignedCount(role.name) : 0;
    const title = isEdit ? role?.name || form.name || "Edit Role" : "Add Role";
    const applicable = (role?.applicable || form.applicable || []).map((id) => APPLICABLE.find((item) => item.id === id)?.label || id).join(", ");
    const permGroups = CATALOG.map((group) => renderPermGroup(group, form.permissions)).filter(Boolean);
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
          ${
            role
              ? `<section class="user-form-section admin-drawer-section--muted" aria-labelledby="kn-role-details-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-role-details-title">Details</h3>
            <div class="user-form-grid">
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-role-owner">Owner</label>
                <input class="blade-field__control type-body-sm" id="kn-role-owner" type="text" disabled value="${escapeHtml(role.createdBy)}" />
              </div>
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-role-updated">Updated</label>
                <input class="blade-field__control type-body-sm" id="kn-role-updated" type="text" disabled value="${escapeHtml(window.KNAdminUX.relativeTime(role.updatedAt))}" />
              </div>
              <div class="blade-field">
                <span class="type-caption-sm type-weight-medium">People assigned</span>
                ${
                  people
                    ? `<a class="blade-link type-body-sm" href="#kn-user-management?role=${encodeURIComponent(role.name)}">${people} ${people === 1 ? "person" : "people"}</a>`
                    : `<p class="type-body-sm">None yet</p>`
                }
              </div>
              <div class="blade-field">
                <span class="type-caption-sm type-weight-medium">Coverage</span>
                ${window.KNAdminUX.coverage(role.permissions, ALL_KEYS.length)}
              </div>
            </div>
          </section>`
              : ""
          }
          <section class="user-form-section" aria-labelledby="kn-role-access-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-role-access-title">Access</h3>
            <div class="blade-field">
              <label class="type-caption-sm type-weight-medium" for="kn-role-name">Role Name <span class="role-req" aria-hidden="true">*</span></label>
              <input class="blade-field__control type-body-sm" id="kn-role-name" name="name" type="text" required maxlength="80" placeholder="Enter role name" value="${escapeHtml(form.name)}" autocomplete="off" />
              <p class="type-caption-sm blade-field__hint">Shown to KlearNow operators when assigning access.</p>
              ${form.error ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.error)}</p>` : ""}
            </div>
            <div class="blade-field role-applicable" role="group" aria-labelledby="kn-role-applicable-title">
              ${window.KNAdminUX.applicableHead({
                titleId: "kn-role-applicable-title",
                title: "Applicable to",
                allSelected: form.applicable.length === APPLICABLE.length,
                attr: "data-role-select-applicable"
              })}
              <div class="role-applicable__row">
                ${APPLICABLE.map((item) => check("applicable", item.id, form.applicable.includes(item.id), item.label)).join("")}
              </div>
            </div>
            <section class="role-perm" aria-labelledby="kn-role-perm-title">
              <header class="role-perm__head">
                <h3 class="type-heading-h6 type-weight-semibold" id="kn-role-perm-title">Permissions</h3>
                <p class="type-caption-sm blade-field__hint">${form.permissions.size} of ${ALL_KEYS.length} selected</p>
              </header>
              ${window.KNAdminUX.permFilters({ query: state.permQuery, selectedOnly: state.permSelectedOnly })}
              ${permGroups.length ? permGroups.join("") : `<p class="type-caption-sm">No permissions match this scan.</p>`}
            </section>
          </section>
        </form>
        <footer class="blade-drawer__footer">
          ${isEdit ? `<button class="btn btn--tertiary btn--color-negative btn--md type-ui-md" type="button" data-role-delete="${escapeHtml(form.id)}">Delete Role</button>` : ""}
          <div class="blade-drawer__footer-actions">
            <button class="btn btn--tertiary btn--md type-ui-md" type="button" data-role-form-close>Cancel</button>
            <button class="btn btn--primary btn--md type-ui-md" type="submit" form="kn-role-form">${isEdit ? "Update Role" : "Add Role"}</button>
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
    if (route.view === "form") {
      if (!state.form || state.form.id !== route.id) {
        const existing = route.id ? loadRoles().find((role) => role.id === route.id) : null;
        if (route.id && !existing) {
          toast("That role is no longer available.", "notice");
          goto("#kn-role-management");
          return;
        }
        state.form = blankForm(existing);
        state.dirty = false;
        state.openGroups = new Set();
        state.permQuery = "";
        state.permSelectedOnly = false;
        state.menuOpen = "";
      }
    } else {
      state.form = null;
      state.dirty = false;
    }
    root.innerHTML = renderList();
    bindIndeterminate(root);
    if (scroller) {
      scroller.scrollTop = top;
    }
    window.KNAdminUX.syncOverlayFocus(page);
    if (state.restoreFocusId && !window.KNAdminUX.activeOverlay(page)) {
      const id = state.restoreFocusId;
      state.restoreFocusId = "";
      requestAnimationFrame(() => {
        document.querySelector(`#kn-role-root tr[data-role-id="${CSS.escape(id)}"]`)?.focus();
      });
    }
  }

  function readForm(formEl) {
    const name = formEl.querySelector("#kn-role-name")?.value.trim() || "";
    const applicable = [...formEl.querySelectorAll('input[name="applicable"]:checked')].map((input) => input.value);
    const permissions = new Set([...formEl.querySelectorAll('input[name="perm"]:checked')].map((input) => input.value));
    return { name, applicable, permissions };
  }

  function persistForm(next) {
    state.form = { ...state.form, ...next, permissions: next.permissions };
    state.dirty = true;
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
        render();
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
        goto(`#kn-role-management/${edit.getAttribute("data-role-edit")}`);
        return;
      }
      const duplicate = event.target.closest("[data-role-duplicate]");
      if (duplicate) {
        const source = loadRoles().find((role) => role.id === duplicate.getAttribute("data-role-duplicate"));
        if (source) {
          state.menuOpen = "";
          state.form = blankForm({ ...source, id: "", name: `${source.name} copy` });
          state.dirty = true;
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
      if (event.target.closest("[data-admin-q-clear]")) {
        state.filters.q = "";
        state.page = 1;
        render();
        return;
      }
      const groupAll = event.target.closest("[data-role-select-group]");
      if (groupAll) {
        event.preventDefault();
        const group = CATALOG.find((item) => item.id === groupAll.getAttribute("data-role-select-group"));
        const snap = readForm(root.querySelector("#kn-role-form"));
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
        if (!group || !ACTIONS.includes(action)) {
          return;
        }
        const snap = readForm(root.querySelector("#kn-role-form"));
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
        const snap = readForm(root.querySelector("#kn-role-form"));
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
        const snap = readForm(root.querySelector("#kn-role-form"));
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
        persistForm(readForm(root.querySelector("#kn-role-form")));
      }
    });

    root.addEventListener("input", (event) => {
      if (event.target.matches("[data-admin-q]")) {
        state.filters.q = event.target.value;
        state.page = 1;
        render();
        const search = root.querySelector("[data-admin-q]");
        if (search) {
          search.focus();
          const end = search.value.length;
          search.setSelectionRange(end, end);
        }
        return;
      }
      if (event.target.matches("[data-admin-perm-q]")) {
        persistForm(readForm(root.querySelector("#kn-role-form")));
        state.permQuery = event.target.value;
        render();
        const search = root.querySelector("[data-admin-perm-q]");
        if (search) {
          search.focus();
          const end = search.value.length;
          search.setSelectionRange(end, end);
        }
        return;
      }
      if (event.target.id === "kn-role-name") {
        persistForm(readForm(root.querySelector("#kn-role-form")));
      }
    });

    root.addEventListener("submit", (event) => {
      if (!event.target.matches("#kn-role-form")) {
        return;
      }
      event.preventDefault();
      const snap = readForm(event.target);
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
          current.name = snap.name;
          current.applicable = snap.applicable;
          current.permissions = [...snap.permissions];
          current.updatedAt = new Date().toISOString();
        }
        saveRoles(roles);
        state.dirty = false;
        toast(`${snap.name} saved.`);
        goto(`#kn-role-management/${encodeURIComponent(state.form.id)}`);
      } else {
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
        toast(`${snap.name} added.`);
        goto(`#kn-role-management/${encodeURIComponent(id)}`);
      }
    });
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
    parseRoute,
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
