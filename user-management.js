(() => {
  const STORAGE_KEY = "kn-users-v3";
  const REPORTER_KEY = "kn-reporters-v2";
  const ROLE_STORAGE_KEY = "kn-roles-v2";
  /** Backend account entity shown in the Entity Name column. */
  const ENTITY_DISPLAY_NAME = "KlearNow Admin";
  const LEVELS = [
    { id: "CUSTOMER", label: "Customer", listLabel: "CUSTOMER" },
    { id: "SUB_CUSTOMER", label: "Sub-customer", listLabel: "SUB_CUSTOMER" },
    { id: "COMPANY", label: "Company", listLabel: "COMPANY" },
    { id: "PARTIES", label: "Parties", listLabel: "PARTIES" }
  ];
  const LEGACY_LEVEL_MAP = {
    KLEARNOW: "COMPANY",
    klearnow: "COMPANY",
    BROKER: "PARTIES",
    broker: "PARTIES"
  };
  const SUB_CUSTOMERS = [
    { id: "kn-us", label: "KlearNow US" },
    { id: "kn-ca", label: "KlearNow CA" }
  ];
  const PARTIES = [
    { id: "heritage", label: "Heritage Customs Services Inc.", hint: "Third-party Customs Broker - Q3E8" },
    { id: "american-river", label: "American River Brokerage Services Ltd.", hint: "Third-party Customs Broker - 07A3" },
    { id: "vantage", label: "Vantage Point Services", hint: "Third-party Customs Broker - 07A5" },
    { id: "john-james", label: "John S. James Co", hint: "Third-party Customs Broker - 08GP" },
    { id: "css-brokers", label: "CSS Brokers Inc.", hint: "Third-party Customs Broker - C9B2" },
    { id: "expeditors", label: "Expeditors", hint: "Third-party Customs Broker - EX01" }
  ];
  const CUSTOMER_ENTITIES = [
    { id: "kn-admin", label: "KlearNow Admin" },
    { id: "bosch", label: "Bosch North America" },
    { id: "unilever", label: "Unilever Supply Chain" },
    { id: "siemens", label: "Siemens Logistics" }
  ];
  const COUNTRIES = [
    { id: "US", label: "United States (+1)", hint: "US" },
    { id: "CA", label: "Canada (+1)", hint: "CA" },
    { id: "IN", label: "India (+91)", hint: "IN" },
    { id: "GB", label: "United Kingdom (+44)", hint: "GB" },
    { id: "DE", label: "Germany (+49)", hint: "DE" },
    { id: "SG", label: "Singapore (+65)", hint: "SG" },
    { id: "AE", label: "United Arab Emirates (+971)", hint: "AE" },
    { id: "NL", label: "Netherlands (+31)", hint: "NL" }
  ];
  const PAGE_SIZES = [
    { id: "10", label: "10" },
    { id: "20", label: "20" },
    { id: "50", label: "50" }
  ];
  const EXTRA_ROLES = [
    "KN Administrator",
    "Visibility 3.0 Operator",
    "Visibility Read Only",
    "ISF Filing Specialist",
    "Finance Credits Owner",
    "Customer Entity Admin",
    "E-Invoice Publisher",
    "Notification Owner",
    "Analytics Viewer",
    "OPS Hub Reviewer",
    "User Access Manager",
    "Broker Invoice Admin",
    "CANADA TRANSACTION MANAGER",
    "Klearhub Visibility",
    "Notification Admin",
    "KlearNow CS Subcustomer",
    "PSC Module",
    "Vis 2.0",
    "Company Admin",
    "HUB+ COMPANY ADMIN",
    "HUB+ COMPANY USER",
    "Party Broker/Forwarder Transaction Manager",
    "Party Broker/Forwarder Finance Admin",
    "Party Broker/Forwarder Analytics",
    "Party Broker/Forwarder Admin",
    "Parts"
  ];

  const state = {
    sortKey: "name",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
    filters: { name: "", email: "", level: "", entity: "", status: "", chip: "all", role: "", inherited: "" },
    form: null,
    formSnapshot: null,
    dirty: false,
    modal: "",
    reporterForm: { name: "", email: "", error: "" },
    deleteId: "",
    deactivateId: "",
    reviewId: "",
    roleMenuOpen: false,
    selectOpen: "",
    menuOpen: "",
    roleQuery: "",
    leaveTo: "",
    restoreFocusId: "",
    aiRoleOnly: [],
    aiFieldMeta: {}
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function levelLabel(id) {
    return LEVELS.find((item) => item.id === id)?.label || id || "Customer";
  }

  function levelListLabel(id) {
    return LEVELS.find((item) => item.id === id)?.listLabel || levelLabel(id);
  }

  function listUserLevel(user) {
    return levelListLabel(normalizeLevelId(user?.level));
  }

  function normalizeLevelId(level) {
    if (!level) {
      return "CUSTOMER";
    }
    if (LEGACY_LEVEL_MAP[level]) {
      return LEGACY_LEVEL_MAP[level];
    }
    if (LEVELS.some((item) => item.id === level)) {
      return level;
    }
    const upper = String(level).toUpperCase().replace(/[\s-]+/g, "_");
    if (LEGACY_LEVEL_MAP[upper]) {
      return LEGACY_LEVEL_MAP[upper];
    }
    return LEVELS.some((item) => item.id === upper) ? upper : "CUSTOMER";
  }

  function subCustomerLabel(id) {
    return SUB_CUSTOMERS.find((item) => item.id === id)?.label || id || "—";
  }

  function partyLabel(id) {
    return PARTIES.find((item) => item.id === id)?.label || id || "—";
  }

  function partyOptionLabel(item) {
    return item.hint ? `${item.label} (${item.hint})` : item.label;
  }

  function customerEntityLabel(id) {
    return CUSTOMER_ENTITIES.find((item) => item.id === id)?.label || id || "—";
  }

  function entityForUser(user) {
    return ENTITY_DISPLAY_NAME;
  }

  function normalizeStoredUser(user) {
    const level = normalizeLevelId(user?.level);
    const next = {
      ...user,
      level,
      entity: ENTITY_DISPLAY_NAME,
      entityName: ENTITY_DISPLAY_NAME
    };
    delete next.userLevelDisplay;
    return next;
  }

  function resolveEntity() {
    return ENTITY_DISPLAY_NAME;
  }

  function seedReporters() {
    return [
      { id: "rep-tanya", name: "Tanya Agrawal", email: "tanya.agrawal@klearnow.com" },
      { id: "rep-priya", name: "Priya Menon", email: "priya.menon@klearnow.com" },
      { id: "rep-daniel", name: "Daniel Chen", email: "daniel.chen@klearnow.com" },
      { id: "rep-vipul", name: "Vipul Pachauri", email: "vipul.pachauri@klearnow.com" }
    ];
  }

  function loadReporters() {
    try {
      const raw = window.localStorage.getItem(REPORTER_KEY);
      if (!raw) {
        return seedReporters();
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : seedReporters();
    } catch (error) {
      return seedReporters();
    }
  }

  function saveReporters(reporters) {
    window.localStorage.setItem(REPORTER_KEY, JSON.stringify(reporters));
  }

  function roleCatalog() {
    let stored = [];
    try {
      const raw = window.localStorage.getItem(ROLE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      stored = Array.isArray(parsed) ? parsed.map((role) => role.name).filter(Boolean) : [];
    } catch (error) {
      stored = [];
    }
    return [...new Set([...stored, ...EXTRA_ROLES])].sort((a, b) => a.localeCompare(b));
  }

  function seedUsers() {
    const partyRoles = [
      "Party Broker/Forwarder Transaction Manager",
      "Party Broker/Forwarder Finance Admin",
      "Party Broker/Forwarder Analytics",
      "PSC Module",
      "Vis 2.0",
      "Party Broker/Forwarder Admin",
      "Parts"
    ];
    return [
      {
        id: "zeeky-le",
        name: "Zeeky LE",
        email: "zeeky.le@heritagecustoms.ai",
        level: "PARTIES",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-us",
        party: "heritage",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "",
        reportsTo: "",
        phoneCountry: "US",
        phone: "8505205319",
        lastActive: "2026-08-24T14:10:00",
        roles: partyRoles.slice()
      },
      {
        id: "will-mcdonald",
        name: "Will McDonald",
        email: "will@cssbrokers.com",
        level: "PARTIES",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-us",
        party: "css-brokers",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "Broker Operations",
        reportsTo: "rep-tanya",
        phoneCountry: "US",
        phone: "3055550190",
        lastActive: "2026-08-23T11:20:00",
        roles: ["Party Broker/Forwarder Admin", "Vis 2.0"]
      },
      {
        id: "vanessa-gonzalez",
        name: "Vanessa Gonzalez",
        email: "vgonzalez@americanrivergroup.com",
        level: "PARTIES",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-us",
        party: "american-river",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "Customs Broker",
        reportsTo: "",
        phoneCountry: "US",
        phone: "9165550144",
        lastActive: "2026-08-22T09:05:00",
        roles: ["Party Broker/Forwarder Transaction Manager", "PSC Module"]
      },
      {
        id: "vipul-pachauri",
        name: "Vipul Pachauri",
        email: "vipul.pachauri@klearnow.com",
        level: "SUB_CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-ca",
        party: "",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "",
        reportsTo: "",
        phoneCountry: "US",
        phone: "",
        lastActive: "2026-08-24T16:40:00",
        roles: ["CANADA TRANSACTION MANAGER", "Klearhub Visibility", "Notification Admin"]
      },
      {
        id: "vivek-singh",
        name: "Vivek Singh",
        email: "vivek.singh@klearnow.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "kn-admin",
        restrictions: "no",
        active: true,
        title: "Customer Success",
        reportsTo: "rep-tanya",
        phoneCountry: "IN",
        phone: "9810012345",
        lastActive: "2026-08-21T08:30:00",
        roles: ["Customer Entity Admin", "Vis 2.0"]
      },
      {
        id: "tanya-agrawal",
        name: "Tanya Agrawal",
        email: "tanya.agrawal@klearnow.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "kn-admin",
        restrictions: "no",
        active: true,
        title: "Product Lead",
        reportsTo: "",
        phoneCountry: "IN",
        phone: "9876543210",
        lastActive: "2026-08-20T09:40:00",
        roles: ["KN Administrator", "User Access Manager"]
      },
      {
        id: "priya-menon",
        name: "Priya Menon",
        email: "priya.menon@klearnow.com",
        level: "COMPANY",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-us",
        party: "",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "Customs Operations Lead",
        reportsTo: "rep-tanya",
        phoneCountry: "US",
        phone: "4155550142",
        lastActive: "2026-08-20T08:12:00",
        roles: ["Company Admin", "HUB+ COMPANY ADMIN", "Vis 2.0"]
      },
      {
        id: "daniel-chen",
        name: "Daniel Chen",
        email: "daniel.chen@klearnow.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "kn-admin",
        restrictions: "no",
        active: true,
        title: "Visibility Engineer",
        reportsTo: "rep-tanya",
        phoneCountry: "SG",
        phone: "91234567",
        lastActive: "2026-08-20T07:05:00",
        roles: ["Visibility 3.0 Operator", "Analytics Viewer"]
      },
      {
        id: "elena-petrova",
        name: "Elena Petrova",
        email: "elena.petrova@bosch.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "bosch",
        restrictions: "no",
        active: true,
        title: "Global Trade Manager",
        reportsTo: "rep-priya",
        phoneCountry: "DE",
        phone: "1705550101",
        lastActive: "2026-08-19T16:02:00",
        roles: ["Visibility Read Only", "Customer Entity Admin"]
      },
      {
        id: "james-okonkwo",
        name: "James Okonkwo",
        email: "james.okonkwo@unilever.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "unilever",
        restrictions: "no",
        active: true,
        title: "Drayage Operations",
        reportsTo: "rep-tanya",
        phoneCountry: "GB",
        phone: "7400123456",
        lastActive: "2026-08-17T09:44:00",
        roles: ["OPS Hub Reviewer"]
      },
      {
        id: "natalie-brooks",
        name: "Natalie Brooks",
        email: "natalie.brooks@siemens.com",
        level: "CUSTOMER",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "",
        party: "",
        customerEntity: "siemens",
        restrictions: "no",
        active: false,
        title: "Trade Compliance",
        reportsTo: "rep-priya",
        phoneCountry: "US",
        phone: "6175550133",
        lastActive: "2026-07-22T13:00:00",
        roles: ["KN Administrator"]
      },
      {
        id: "wei-chen",
        name: "Wei Chen",
        email: "wei.chen@expeditors.com",
        level: "PARTIES",
        entity: ENTITY_DISPLAY_NAME,
        subCustomer: "kn-us",
        party: "expeditors",
        customerEntity: "",
        restrictions: "no",
        active: true,
        title: "Licensed Customs Broker",
        reportsTo: "rep-tanya",
        phoneCountry: "US",
        phone: "2065550188",
        lastActive: "2026-08-20T04:28:00",
        roles: ["Party Broker/Forwarder Admin", "ISF Filing Specialist"]
      }
    ].map(normalizeStoredUser);
  }

  function loadUsers() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      let users;
      if (!raw) {
        users = seedUsers();
      } else {
        const parsed = JSON.parse(raw);
        users = Array.isArray(parsed) && parsed.length ? parsed : seedUsers();
      }
      const migrated = users.map(normalizeStoredUser);
      const needsSave = migrated.some((user, index) => {
        const prev = users[index] || {};
        return (
          prev.level !== user.level ||
          prev.entity !== user.entity ||
          prev.entityName !== user.entityName ||
          prev.userLevelDisplay != null
        );
      });
      if (needsSave) {
        saveUsers(migrated);
      }
      return migrated;
    } catch (error) {
      return seedUsers();
    }
  }

  function saveUsers(users) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function slugify(name) {
    const slug = String(name || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9-]/g, "");
    return slug || `user-${Date.now().toString(36)}`;
  }

  function uniqueId(name, users) {
    const base = slugify(name);
    if (!users.some((user) => user.id === base)) {
      return base;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  function parseRoute(hash = location.hash) {
    const path = (hash || "#dashboard").split("?")[0];
    if (path === "#kn-user-management/add") {
      return { view: "form", id: "", preferEdit: true };
    }
    const edit = path.match(/^#kn-user-management\/([^/?#]+)\/edit$/);
    if (edit) {
      return { view: "form", id: decodeURIComponent(edit[1]), preferEdit: true };
    }
    const detail = path.match(/^#kn-user-management\/([^/?#]+)$/);
    if (detail && detail[1] !== "add") {
      return { view: "detail", id: decodeURIComponent(detail[1]), preferEdit: false };
    }
    return { view: "list", id: "", preferEdit: false };
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
    const to = hash || "#kn-user-management";
    if (state.form?.id && String(to).split("?")[0] === "#kn-user-management") {
      state.restoreFocusId = state.form.id;
    }
    state.leaveTo = "";
    state.dirty = false;
    closeFormMenus();
    window.KNAdminUX.beginNavigation();
    goto(to);
  }

  function privilegedInactive() {
    return loadUsers().filter((user) => !user.active && (user.roles || []).includes("KN Administrator"));
  }

  function findUser(id) {
    return loadUsers().find((user) => user.id === id);
  }

  function reporterName(id) {
    if (!id) {
      return "—";
    }
    return loadReporters().find((item) => item.id === id)?.name || "—";
  }

  function filteredUsers() {
    const q = (value) => String(value || "").toLowerCase();
    const rows = loadUsers().filter((user) => {
      const nameOk = !state.filters.name || q(user.name).includes(q(state.filters.name));
      const emailOk = !state.filters.email || q(user.email).includes(q(state.filters.email));
      const levelOk = !state.filters.level || q(user.level) === q(state.filters.level);
      const entityOk = !state.filters.entity || q(entityForUser(user)).includes(q(state.filters.entity));
      const statusHay = user.active ? "active" : "inactive";
      const statusOk = !state.filters.status || statusHay === q(state.filters.status);
      const chip = state.filters.chip;
      const chipOk =
        chip === "all" ||
        (chip === "active" && user.active) ||
        (chip === "inactive" && !user.active) ||
        (chip === "customer" && user.level === "CUSTOMER") ||
        (chip === "sub-customer" && user.level === "SUB_CUSTOMER") ||
        (chip === "company" && user.level === "COMPANY") ||
        (chip === "parties" && user.level === "PARTIES") ||
        (chip === "admin" && (user.roles || []).includes("KN Administrator"));
      const roleOk = !state.filters.role || (user.roles || []).includes(state.filters.role);
      const inheritedNames = inheritedEntities();
      const inheritedOk = !inheritedNames || inheritedNames.includes(entityForUser(user));
      return nameOk && emailOk && levelOk && entityOk && statusOk && chipOk && roleOk && inheritedOk;
    });
    const dir = state.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av;
      let bv;
      if (state.sortKey === "status") {
        av = Number(a.active);
        bv = Number(b.active);
      } else if (state.sortKey === "entity") {
        av = String(entityForUser(a) || "").toLowerCase();
        bv = String(entityForUser(b) || "").toLowerCase();
      } else if (state.sortKey === "level") {
        av = String(listUserLevel(a) || "").toLowerCase();
        bv = String(listUserLevel(b) || "").toLowerCase();
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

  function inheritedEntities() {
    if (!state.filters.inherited) {
      return null;
    }
    try {
      const rows = JSON.parse(window.localStorage.getItem("kn-default-roles-v3") || "[]");
      const role = Array.isArray(rows) ? rows.find((item) => item.id === state.filters.inherited) : null;
      return Array.isArray(role?.customers) ? role.customers : [];
    } catch (error) {
      return [];
    }
  }

  function hasListFilters() {
    const filters = state.filters;
    return Boolean(
      filters.name ||
        filters.email ||
        filters.level ||
        filters.entity ||
        filters.status ||
        filters.role ||
        filters.inherited ||
        filters.chip !== "all"
    );
  }

  function clearFilters() {
    state.filters = { name: "", email: "", level: "", entity: "", status: "", chip: "all", role: "", inherited: "" };
    state.page = 1;
    if ((location.hash || "").includes("?")) {
      window.KNAdminUX.beginNavigation();
      goto("#kn-user-management");
      return;
    }
    render();
  }

  function consumeListQuery() {
    const [path, query = ""] = (location.hash || "").split("?");
    if (path !== "#kn-user-management") {
      return;
    }
    if (!query) {
      return;
    }
    const params = new URLSearchParams(query);
    if (params.has("role")) {
      state.filters.role = params.get("role") || "";
      state.filters.chip = "all";
      state.page = 1;
    }
    if (params.has("inherited")) {
      state.filters.inherited = params.get("inherited") || "";
      state.filters.chip = "all";
      state.page = 1;
    }
    if (params.has("entity")) {
      state.filters.entity = params.get("entity") || "";
      state.page = 1;
    }
    if (params.has("level")) {
      const rawLevel = params.get("level") || "";
      state.filters.level = rawLevel && LEGACY_LEVEL_MAP[rawLevel] ? LEGACY_LEVEL_MAP[rawLevel] : rawLevel;
      if (state.filters.level === "KLEARNOW" || state.filters.level === "klearnow") {
        state.filters.level = "COMPANY";
      }
      state.page = 1;
    }
    if (params.has("chip")) {
      state.filters.chip = params.get("chip") || "all";
      state.page = 1;
    }
  }

  function appliedFilterItems() {
    const items = [];
    if (state.filters.role) {
      items.push({ id: "role", label: `Role: ${state.filters.role}` });
    }
    if (state.filters.inherited) {
      let name = "Inherited template";
      try {
        const rows = JSON.parse(window.localStorage.getItem("kn-default-roles-v3") || "[]");
        name = (Array.isArray(rows) ? rows.find((item) => item.id === state.filters.inherited)?.name : "") || name;
      } catch (error) {
        /* keep fallback */
      }
      items.push({ id: "inherited", label: `Inherits: ${name}` });
    }
    if (state.filters.entity) {
      items.push({ id: "entity", label: `Entity: ${state.filters.entity}` });
    }
    return items;
  }

  function dismissApplied(id) {
    if (id === "role") {
      state.filters.role = "";
    }
    if (id === "inherited") {
      state.filters.inherited = "";
    }
    if (id === "entity") {
      state.filters.entity = "";
    }
    state.page = 1;
    if ((location.hash || "").includes("?")) {
      window.KNAdminUX.beginNavigation();
      goto("#kn-user-management");
      return;
    }
    render();
  }

  function sortHeader(key, label) {
    return window.KNAdminUX.sortHeader({
      key,
      label,
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      attr: "data-user-sort"
    });
  }

  function iconPencil() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/></svg>`;
  }

  function iconBell() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>`;
  }

  function iconClose() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  }

  function levelRadio(name, value, checked, label, dataAttr = "data-user-level") {
    return `<label class="blade-radio">
      <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} ${dataAttr}="${escapeHtml(value)}" />
      <span class="blade-radio__control" aria-hidden="true"></span>
      <span class="type-body-sm">${escapeHtml(label)}</span>
    </label>`;
  }

  function renderReviewDrawer() {
    const queue = privilegedInactive();
    const user = state.reviewId ? findUser(state.reviewId) : null;
    const queueIndex = user ? queue.findIndex((item) => item.id === user.id) : -1;
    const inQueue = queueIndex >= 0;
    if (state.reviewId && !inQueue) {
      state.reviewId = "";
    }
    const open = inQueue;
    const activeUser = inQueue ? user : null;
    const roles = (activeUser?.roles || []).map((role) => `<span class="badge type-caption-sm">${escapeHtml(role)}</span>`).join("");
    return `<div class="blade-drawer-root admin-review-drawer${open ? " is-open" : ""}" id="admin-review-drawer" ${open ? "" : "hidden"}>
      <div class="blade-drawer__overlay" data-admin-review-close tabindex="-1"></div>
      <aside class="blade-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-review-title">
        <header class="blade-drawer__header">
          <span class="blade-drawer__header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.75" fill="currentColor"/></svg>
          </span>
          <div class="blade-drawer__titles">
            <h2 class="type-heading-h5 type-weight-semibold" id="admin-review-title" tabindex="-1">Review inactive access</h2>
            <p class="type-caption-sm">${activeUser ? `${queueIndex + 1} of ${queue.length} privileged inactive ${queue.length === 1 ? "account" : "accounts"}` : "Queue is clear"}</p>
          </div>
          <button class="icon-btn" type="button" data-admin-review-close aria-label="Close review">${iconClose()}</button>
        </header>
        <div class="blade-drawer__body admin-review">
          <aside class="blade-alert blade-alert--notice">
            <span class="blade-alert__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/><path d="M10.3 5.2 3.2 17.5A2 2 0 0 0 4.9 20.5h14.2a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0Z"/></svg>
            </span>
            <p class="type-body-sm blade-alert__desc">Inactive people should not keep KN Administrator. Remove the role or reactivate the account.</p>
          </aside>
          ${
            activeUser
              ? `<div class="admin-review__person">
            <span class="avatar avatar--information type-caption-sm type-weight-semibold" aria-hidden="true">${escapeHtml(window.KNAdminUX.initials(activeUser.name))}</span>
            <div>
              <p class="type-body-sm type-weight-semibold">${escapeHtml(activeUser.name)}</p>
              <p class="type-caption-sm">${escapeHtml(activeUser.title || "")} · ${escapeHtml(entityForUser(activeUser))}</p>
            </div>
          </div>
          <dl class="admin-review__grid">
            ${infoField("Email", escapeHtml(activeUser.email))}
            ${infoField("Last active", escapeHtml(window.KNAdminUX.relativeTime(activeUser.lastActive)))}
            ${infoField("Level", escapeHtml(levelLabel(activeUser.level)))}
            ${infoField("Entity", escapeHtml(entityForUser(activeUser)))}
            ${infoField("Status", "Inactive", "user-status-label--negative")}
          </dl>
          <div>
            <p class="type-caption-sm">Roles</p>
            <div class="user-chips">${roles}</div>
          </div>`
              : `<div class="empty-state"><h3 class="type-heading-h6 type-weight-semibold">Nothing left to review</h3><p class="type-body-sm">Privileged inactive access is cleared.</p></div>`
          }
        </div>
        ${
          activeUser
            ? `<footer class="blade-drawer__footer">
          ${queue.length > 1 ? `<button class="btn btn--tertiary btn--md type-ui-md" type="button" data-admin-review-next>Next person</button>` : `<span></span>`}
          <div class="blade-drawer__footer-actions">
            <a class="btn btn--tertiary btn--md type-ui-md" href="#kn-user-management/${encodeURIComponent(activeUser.id)}" data-user-nav="detail" data-user-id="${escapeHtml(activeUser.id)}">View user</a>
            <button class="btn btn--secondary btn--md type-ui-md" type="button" data-admin-review-activate="${escapeHtml(activeUser.id)}">Reactivate</button>
            <button class="btn btn--primary btn--color-negative btn--md type-ui-md" type="button" data-admin-review-revoke="${escapeHtml(activeUser.id)}">Remove KN Administrator</button>
          </div>
        </footer>`
            : `<footer class="blade-drawer__footer">
          <button class="btn btn--primary btn--md type-ui-md" type="button" data-admin-review-close>Done</button>
        </footer>`
        }
      </aside>
    </div>`;
  }

  function startReview() {
    state.filters.chip = "inactive";
    state.filters.status = "";
    state.page = 1;
    const queue = privilegedInactive();
    state.reviewId = queue[0]?.id || "";
    if (!state.reviewId) {
      toast("No inactive administrators to review.", "notice");
    }
    render();
    requestAnimationFrame(() => {
      document.querySelector("tr.is-review-target")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      document.getElementById("admin-review-title")?.focus();
    });
  }

  function closeReview() {
    state.reviewId = "";
    render();
  }

  function advanceReview(doneId) {
    const queue = privilegedInactive().filter((user) => user.id !== doneId);
    if (queue[0]) {
      state.reviewId = queue[0].id;
    } else {
      state.reviewId = "";
      toast("Privileged inactive access is cleared.");
    }
    render();
  }

  function renderList() {
    const route = parseRoute();
    const selectedId = route.view === "list" ? "" : route.id;
    const selectedUser = route.view === "detail" ? findUser(selectedId) : null;
    const rows = filteredUsers();
    const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > pages) {
      state.page = pages;
    }
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);
    const body = pageRows.length
      ? pageRows
          .map((user) => {
            const selected = user.id === selectedId;
            const reviewing = user.id === state.reviewId;
            return `<tr data-user-id="${escapeHtml(user.id)}" tabindex="0" class="${[reviewing ? "is-review-target" : "", selected ? "is-selected" : ""].filter(Boolean).join(" ")}">
          <td>
            <div class="admin-person-cell">
              ${window.KNAdminUX.personCell(user, `#kn-user-management/${encodeURIComponent(user.id)}`)}
            </div>
          </td>
          <td class="type-body-sm">${escapeHtml(user.email)}</td>
          <td><span class="badge type-caption-sm type-weight-medium">${escapeHtml(listUserLevel(user))}</span></td>
          <td class="type-body-sm">${escapeHtml(entityForUser(user))}</td>
          <td>${window.KNAdminUX.statusSwitch({
            active: user.active,
            toggleAttr: `data-user-toggle="${escapeHtml(user.id)}"`,
            labelId: `kn-user-row-status-${escapeHtml(user.id)}`
          })}</td>
          <td>
            <div class="user-row-actions">
              <button class="icon-btn" type="button" data-user-edit="${escapeHtml(user.id)}" aria-label="Edit ${escapeHtml(user.name)}" data-tooltip="Edit user">${iconPencil()}</button>
              <button class="icon-btn" type="button" data-user-notify="${escapeHtml(user.id)}" aria-label="Notifications for ${escapeHtml(user.name)}" data-tooltip="Notifications">${iconBell()}</button>
              <button class="icon-btn" type="button" data-user-delete="${escapeHtml(user.id)}" aria-label="Delete ${escapeHtml(user.name)}" data-tooltip="Delete user">${iconTrash()}</button>
            </div>
          </td>
        </tr>`;
          })
          .join("")
      : `<tr class="role-empty-row"><td colspan="6">${window.KNAdminUX.emptyState({
          title: hasListFilters() ? "No people match this view" : "No people yet",
          description: hasListFilters() ? "Clear filters to see everyone, or add a user." : "Add a user to start assigning access.",
          primaryLabel: "Add User",
          primaryHref: "#kn-user-management/add",
          primaryAttr: 'data-user-nav="add"',
          secondaryLabel: hasListFilters() ? "Clear filters" : "",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    const all = loadUsers();
    const ux = window.KNAdminUX;
    const chip = state.filters.chip;
    const inactiveAdmins = privilegedInactive();

    return `<header class="role-page__head">
      <div>
        <h1 class="type-heading-h3 type-weight-semibold">User Management</h1>
        <p class="type-body-sm">People across customers, sub-customers, companies, and parties.</p>
      </div>
      <a class="btn btn--primary btn--md type-ui-md" href="#kn-user-management/add" data-user-nav="add">Add User</a>
    </header>
    ${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: all.length, selected: chip === "all" },
        { id: "active", label: "Active", count: all.filter((user) => user.active).length, selected: chip === "active" },
        { id: "inactive", label: "Inactive", count: all.filter((user) => !user.active).length, selected: chip === "inactive" },
        { id: "customer", label: "Customers", count: all.filter((user) => user.level === "CUSTOMER").length, selected: chip === "customer" },
        { id: "sub-customer", label: "Sub-customers", count: all.filter((user) => user.level === "SUB_CUSTOMER").length, selected: chip === "sub-customer" },
        { id: "company", label: "Company", count: all.filter((user) => user.level === "COMPANY").length, selected: chip === "company" },
        { id: "parties", label: "Parties", count: all.filter((user) => user.level === "PARTIES").length, selected: chip === "parties" }
      ],
      applied: appliedFilterItems(),
      results: `${rows.length} ${rows.length === 1 ? "person" : "people"}. Page ${state.page} of ${pages}. Sorted by ${state.sortKey}, ${state.sortDir === "desc" ? "descending" : "ascending"}.`,
      insight: null
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin" aria-label="Users">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("name", "Full Name")}
              ${sortHeader("email", "Email Address")}
              ${sortHeader("level", "User Level")}
              ${sortHeader("entity", "Entity Name")}
              ${sortHeader("status", "Status")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-user-filter", key: "name", value: state.filters.name, label: "full name", placeholder: "Enter full name" })}
              ${ux.colFilter({ attr: "data-user-filter", key: "email", value: state.filters.email, label: "email address", placeholder: "Enter email address" })}
              ${ux.colBladeSelect({
                attr: "data-user-filter",
                key: "level",
                value: state.filters.level,
                label: "user level",
                open: state.selectOpen,
                placeholder: "Select user level",
                emptyLabel: "All",
                options: LEVELS.map((item) => ({ value: item.id, label: item.listLabel }))
              })}
              ${ux.colFilter({ attr: "data-user-filter", key: "entity", value: state.filters.entity, label: "entity name", placeholder: "Enter entity name" })}
              ${ux.colBladeSelect({ attr: "data-user-filter", key: "status", value: state.filters.status, label: "status", open: state.selectOpen, options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] })}
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
        pageAttr: "data-user-page",
        label: "User pages",
        sizeSelect: adminSelect({
          id: "kn-user-pagesize",
          name: "pageSize",
          value: String(state.pageSize),
          options: PAGE_SIZES,
          placeholder: "Rows",
          openKey: "pageSize",
          compact: true,
          includeEmpty: false
        })
      })}
    </div>
    ${renderReviewDrawer()}
    ${route.view === "form" ? renderFormDrawer() : selectedUser ? renderProfileDrawer(selectedUser) : ""}
    ${renderModals()}`;
  }

  function infoField(label, value, extraClass = "") {
    return `<div class="user-info-field">
      <dt class="type-caption-sm">${escapeHtml(label)}</dt>
      <dd class="type-body-sm type-weight-medium ${extraClass}">${value}</dd>
    </div>`;
  }

  function textField({ id, label, value, type = "text", required = false, disabled = false, error = "", placeholder = "", autocomplete = "off", maxlength = "80" }) {
    return `<div class="blade-field">
      <label class="type-caption-sm type-weight-medium" for="${id}">${escapeHtml(label)}${required && !disabled ? ` <span class="role-req" aria-hidden="true">*</span>` : ""}</label>
      <input class="blade-field__control type-body-sm" id="${id}" name="${id.replace(/^kn-user-/, "")}" type="${type}" ${required && !disabled ? "required" : ""} ${disabled ? "disabled" : ""} maxlength="${maxlength}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" autocomplete="${autocomplete}" />
      ${error ? `<p class="type-caption-sm role-form__error">${escapeHtml(error)}</p>` : ""}
    </div>`;
  }

  function renderProfileDrawer(user) {
    const roles = (user.roles || [])
      .map((role) => `<span class="badge type-caption-sm user-chip">${escapeHtml(role)}</span>`)
      .join("");
    const reportsLabel = reporterName(user.reportsTo);
    const dash = (value) => (value && value !== "—" ? escapeHtml(value) : "—");
    const conditionalFields = [];
    if (user.level === "PARTIES" || user.level === "SUB_CUSTOMER" || user.level === "COMPANY") {
      conditionalFields.push(infoField("Sub-customer", dash(subCustomerLabel(user.subCustomer))));
    }
    if (user.level === "PARTIES") {
      conditionalFields.push(infoField("Parties", dash(partyLabel(user.party))));
    }
    if (user.level === "CUSTOMER" || user.level === "SUB_CUSTOMER") {
      conditionalFields.push(infoField("Restrictions", user.restrictions === "yes" ? "Yes" : "No"));
    }
    return `<div class="blade-drawer-root admin-profile-drawer is-open" id="admin-profile-drawer">
      <div class="blade-drawer__overlay" data-user-profile-close tabindex="-1"></div>
      <aside class="blade-drawer" role="dialog" aria-modal="true" aria-labelledby="kn-user-profile-title">
        <header class="blade-drawer__header">
          <div class="blade-drawer__titles">
            <div class="admin-drawer-title-row">
              <h2 class="type-heading-h5 type-weight-semibold" id="kn-user-profile-title" tabindex="-1">${escapeHtml(user.name)}</h2>
              <span class="badge type-caption-sm type-weight-medium">${escapeHtml(levelLabel(user.level))}</span>
            </div>
          </div>
          ${window.KNAdminUX.statusSwitch({
            active: user.active,
            toggleAttr: `data-user-toggle="${escapeHtml(user.id)}"`,
            labelId: "kn-user-status-label"
          })}
          <button class="icon-btn" type="button" data-user-profile-close aria-label="Close user details">${iconClose()}</button>
        </header>
        <div class="blade-drawer__body admin-review user-form">
          <section class="user-form-section" aria-label="User details">
            <dl class="user-info-grid">
              ${infoField("Email Address", escapeHtml(user.email))}
              ${infoField("Title", dash(user.title))}
              ${infoField("Reports To", dash(reportsLabel))}
              ${infoField("Status", user.active ? "Active" : "Inactive", user.active ? "user-status-label" : "user-status-label--negative")}
              ${infoField("User Level", escapeHtml(levelLabel(user.level)))}
              ${conditionalFields.join("")}
            </dl>
          </section>
          <section class="user-form-section" aria-labelledby="kn-user-profile-roles-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-user-profile-roles-title">User Role</h3>
            <div class="user-chips">${roles || `<span class="type-body-sm">—</span>`}</div>
          </section>
        </div>
        <footer class="blade-drawer__footer">
          <button class="btn btn--primary btn--color-negative btn--md type-ui-md" type="button" data-user-delete="${escapeHtml(user.id)}">Delete User</button>
          <div class="blade-drawer__footer-actions">
            <a class="btn btn--primary btn--md type-ui-md" href="#kn-user-management/${encodeURIComponent(user.id)}/edit" data-user-nav="edit" data-user-id="${escapeHtml(user.id)}">Edit Details</a>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function blankForm(user) {
    return {
      id: user?.id || "",
      name: user?.name || "",
      email: user?.email || "",
      phoneCountry: user?.phoneCountry || "US",
      phone: user?.phone || "",
      title: user?.title || "",
      reportsTo: user?.reportsTo || "",
      level: normalizeLevelId(user?.level || "CUSTOMER"),
      entity: ENTITY_DISPLAY_NAME,
      subCustomer: user?.subCustomer || "",
      party: user?.party || "",
      customerEntity: user?.customerEntity || (user?.level === "CUSTOMER" ? "kn-admin" : ""),
      restrictions: user?.restrictions || "no",
      roles: user?.roles?.slice() || [],
      active: user ? user.active : true,
      error: "",
      emailError: "",
      levelError: "",
      subCustomerError: "",
      partyError: "",
      customerEntityError: "",
      rolesError: ""
    };
  }

  function resetAiUserState() {
    state.aiRoleOnly = [];
    state.aiFieldMeta = {};
  }

  /** Prefill Add User from panel draft — never submits. */
  function applyPendingAiDraft() {
    const draft = window.KNAiSuggest?.consumeDraft?.("user");
    if (!draft || !state.form) {
      return;
    }
    if (draft.title) {
      state.form.title = draft.title;
      state.aiFieldMeta = { title: draft.titleReason || "Prefill from Klear Assistant draft" };
    }
    const suggested = (draft.roles || []).map((r) => r.name).filter(Boolean);
    if (suggested.length && window.KNAiSuggest?.mergeAiSelections) {
      const merge = window.KNAiSuggest.mergeAiSelections(state.form.roles, suggested, []);
      state.form.roles = merge.next;
      state.aiRoleOnly = merge.aiOnly;
    } else if (suggested.length) {
      state.form.roles = [...new Set([...(state.form.roles || []), ...suggested])];
    }
    state.formSnapshot = snapshotForm(state.form);
    state.dirty = isFormDataDirty(state.form);
    window.KNAiSuggest?.logAudit?.({
      action: "apply-draft-to-form",
      context: "kn-user",
      field: "form",
      origin: "ai",
      value: suggested.join(",")
    });
    toast("AI draft applied to the form — review and click Add User to save.", "notice");
  }

  function closeFormMenus() {
    state.roleMenuOpen = false;
    state.selectOpen = "";
    state.menuOpen = "";
  }

  function renderRoleSelect(form) {
    const catalog = roleCatalog();
    const query = state.roleQuery.trim().toLowerCase();
    const options = catalog.filter((name) => !query || name.toLowerCase().includes(query));
    const selected = new Set(form.roles);
    return window.KNAdminUX.multiSelect({
      labelledBy: "kn-user-role-label",
      triggerAttr: 'id="kn-user-role-toggle" data-user-role-toggle',
      triggerLabel: "Select user role",
      open: state.roleMenuOpen,
      menuId: "kn-user-role-menu",
      searchId: "kn-user-role-search",
      searchValue: state.roleQuery,
      searchPlaceholder: "Search roles",
      searchLabel: "Search user roles",
      emptyLabel: "No roles match.",
      chipsInTrigger: true,
      chips: (form.roles || []).map((name) => ({
        label: name,
        removeAttr: `data-user-role-remove="${escapeHtml(name)}"`
      })),
      options: options.map((name) => ({
        label: name,
        checked: selected.has(name),
        attr: `data-user-role="${escapeHtml(name)}"`
      }))
    });
  }

  function formLeaveHash() {
    return state.form?.id ? `#kn-user-management/${encodeURIComponent(state.form.id)}` : "#kn-user-management";
  }

  function renderConditionalLevelFields(form) {
    const level = form.level;
    const fields = [];
    if (level === "PARTIES" || level === "SUB_CUSTOMER" || level === "COMPANY") {
      fields.push(`<div class="blade-field blade-field--full">
        <span class="type-caption-sm type-weight-medium" id="kn-user-subcustomer-label">Select Sub-customer <span class="role-req" aria-hidden="true">*</span></span>
        ${adminSelect({
          id: "kn-user-subcustomer",
          name: "subCustomer",
          value: form.subCustomer,
          options: SUB_CUSTOMERS,
          placeholder: "Select sub-customer",
          labelledBy: "kn-user-subcustomer-label",
          openKey: "subCustomer",
          includeEmpty: false
        })}
        ${form.subCustomerError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.subCustomerError)}</p>` : ""}
      </div>`);
    }
    if (level === "PARTIES") {
      fields.push(`<div class="blade-field blade-field--full">
        <span class="type-caption-sm type-weight-medium" id="kn-user-party-label">Select Party <span class="role-req" aria-hidden="true">*</span></span>
        ${adminSelect({
          id: "kn-user-party",
          name: "party",
          value: form.party,
          options: PARTIES.map((item) => ({ id: item.id, label: partyOptionLabel(item) })),
          placeholder: "Select party",
          labelledBy: "kn-user-party-label",
          openKey: "party",
          includeEmpty: false,
          searchable: true
        })}
        ${form.partyError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.partyError)}</p>` : ""}
      </div>`);
    }
    if (level === "CUSTOMER" || level === "SUB_CUSTOMER") {
      fields.push(`<div class="blade-field blade-field--full" role="radiogroup" aria-labelledby="kn-user-restrictions-label">
        <span class="type-caption-sm type-weight-medium" id="kn-user-restrictions-label">Are there any type of restriction applicable? <span class="role-req" aria-hidden="true">*</span></span>
        <div class="user-level-radios">
          ${levelRadio("restrictions", "yes", form.restrictions === "yes", "Yes", "data-user-restrictions")}
          ${levelRadio("restrictions", "no", form.restrictions !== "yes", "No", "data-user-restrictions")}
        </div>
      </div>`);
    }
    return fields.join("");
  }

  function renderFormDrawer() {
    const form = state.form;
    const isEdit = Boolean(form.id);
    const title = isEdit ? "Edit User" : "Add User";
    const reporters = loadReporters();
    return `<div class="blade-drawer-root admin-form-drawer is-open" id="admin-user-form-drawer">
      <div class="blade-drawer__overlay" data-user-form-close tabindex="-1"></div>
      <aside class="blade-drawer" role="dialog" aria-modal="true" aria-labelledby="kn-user-form-title">
        <header class="blade-drawer__header">
          <div class="blade-drawer__titles">
            <h2 class="type-heading-h5 type-weight-semibold" id="kn-user-form-title" tabindex="-1">${title}</h2>
          </div>
          <button class="icon-btn" type="button" data-user-form-close aria-label="Close">${iconClose()}</button>
        </header>
        <form class="blade-drawer__body user-form" id="kn-user-form" novalidate>
          <section class="user-form-section" aria-labelledby="kn-user-basic-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-user-basic-title">Basic Information</h3>
            <div class="user-form-grid">
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-user-name">Full Name <span class="role-req" aria-hidden="true">*</span></label>
                <input class="blade-field__control type-body-sm" id="kn-user-name" name="name" type="text" required maxlength="80" placeholder="Enter full name" value="${escapeHtml(form.name)}" autocomplete="name" />
                ${form.error ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.error)}</p>` : ""}
              </div>
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-user-email">Email <span class="role-req" aria-hidden="true">*</span></label>
                <input class="blade-field__control type-body-sm" id="kn-user-email" name="email" type="email" required maxlength="120" placeholder="Enter email address" value="${escapeHtml(form.email)}" autocomplete="email" ${isEdit ? "disabled" : ""} />
                ${form.emailError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.emailError)}</p>` : ""}
              </div>
              <div class="blade-field">
                <span class="type-caption-sm type-weight-medium" id="kn-user-phone-label">Phone Number</span>
                <div class="blade-phone">
                  ${adminSelect({
                    id: "kn-user-phone-country",
                    name: "phoneCountry",
                    value: form.phoneCountry,
                    options: COUNTRIES,
                    placeholder: "Select country code",
                    labelledBy: "kn-user-phone-label",
                    openKey: "country",
                    includeEmpty: false
                  })}
                  <input class="blade-field__control type-body-sm" id="kn-user-phone" name="phone" type="tel" inputmode="tel" placeholder="Enter phone number" value="${escapeHtml(form.phone)}" autocomplete="tel" />
                </div>
              </div>
              <div class="blade-field">
                <label class="type-caption-sm type-weight-medium" for="kn-user-title">Title</label>
                <input class="blade-field__control type-body-sm${state.aiFieldMeta?.title ? " is-ai-suggested-field" : ""}" id="kn-user-title" name="title" type="text" maxlength="80" placeholder="Enter title" value="${escapeHtml(form.title)}" />
                ${state.aiFieldMeta?.title ? window.KNAiSuggest.reasonTag(state.aiFieldMeta.title) : ""}
              </div>
              <div class="blade-field blade-field--full">
                <span class="type-caption-sm type-weight-medium" id="kn-user-reports-label">Reports To</span>
                <div class="blade-select-row">
                  ${adminSelect({
                    id: "kn-user-reports",
                    name: "reportsTo",
                    value: form.reportsTo,
                    options: reporters.map((item) => ({ id: item.id, label: item.name, hint: item.email })),
                    placeholder: "Select reports to",
                    labelledBy: "kn-user-reports-label",
                    openKey: "reports",
                    includeEmpty: false,
                    searchable: true
                  })}
                  <button class="blade-link type-ui-sm" type="button" data-user-add-reporter>+ Add Reporter</button>
                </div>
              </div>
              <div class="blade-field blade-field--full" role="radiogroup" aria-labelledby="kn-user-level-label">
                <span class="type-caption-sm type-weight-medium" id="kn-user-level-label">User Level <span class="role-req" aria-hidden="true">*</span></span>
                <div class="user-level-radios">
                  ${LEVELS.map((item) => levelRadio("level", item.id, form.level === item.id, item.label)).join("")}
                </div>
                ${form.levelError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.levelError)}</p>` : ""}
              </div>
              ${renderConditionalLevelFields(form)}
            </div>
          </section>
          <section class="user-form-section" aria-labelledby="kn-user-role-title">
            <h3 class="type-heading-h6 type-weight-semibold" id="kn-user-role-title">User Role</h3>
            <div class="blade-field">
              <span class="type-caption-sm type-weight-medium" id="kn-user-role-label">Select User Role <span class="role-req" aria-hidden="true">*</span></span>
              ${renderRoleSelect(form)}
              ${form.rolesError ? `<p class="type-caption-sm role-form__error">${escapeHtml(form.rolesError)}</p>` : ""}
            </div>
          </section>
        </form>
        <footer class="blade-drawer__footer">
          <div class="blade-drawer__footer-actions">
            <a class="btn btn--tertiary btn--md type-ui-md" href="${isEdit ? `#kn-user-management/${encodeURIComponent(form.id)}` : "#kn-user-management"}" data-user-nav="${isEdit ? "detail" : "list"}" data-user-id="${escapeHtml(form.id)}">Cancel</a>
            <button class="btn btn--primary btn--md type-ui-md" type="submit" form="kn-user-form">${isEdit ? "Update User" : "Add User"}</button>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function renderModals() {
    const reporterOpen = state.modal === "reporter";
    const deleteUser = state.modal === "delete" ? findUser(state.deleteId) : null;
    return `<div class="blade-modal-root" ${reporterOpen ? "" : "hidden"}>
      <div class="blade-modal__overlay" data-user-modal-dismiss tabindex="-1"></div>
      <div class="blade-modal" role="dialog" aria-modal="true" aria-labelledby="kn-user-reporter-title">
        <header class="blade-modal__header">
          <div>
            <h2 class="type-heading-h5 type-weight-semibold" id="kn-user-reporter-title">Add Reporting User</h2>
            <p class="type-caption-sm">Please enter the below information</p>
          </div>
          <button class="icon-btn" type="button" data-user-modal-dismiss aria-label="Close">${iconClose()}</button>
        </header>
        <form class="blade-modal__body" id="kn-user-reporter-form" novalidate>
          <div class="blade-field">
            <label class="type-caption-sm type-weight-medium" for="kn-reporter-name">Full Name <span class="role-req" aria-hidden="true">*</span></label>
            <input class="blade-field__control type-body-sm" id="kn-reporter-name" name="name" type="text" required maxlength="80" placeholder="Enter full name" value="${escapeHtml(state.reporterForm.name)}" />
          </div>
          <div class="blade-field">
            <label class="type-caption-sm type-weight-medium" for="kn-reporter-email">Email <span class="role-req" aria-hidden="true">*</span></label>
            <input class="blade-field__control type-body-sm" id="kn-reporter-email" name="email" type="email" required maxlength="120" placeholder="Enter email address" value="${escapeHtml(state.reporterForm.email)}" />
          </div>
          ${state.reporterForm.error ? `<p class="type-caption-sm role-form__error">${escapeHtml(state.reporterForm.error)}</p>` : ""}
          <div class="blade-modal__footer">
            <button class="btn btn--tertiary btn--md type-ui-md" type="button" data-user-modal-dismiss>Cancel</button>
            <button class="btn btn--primary btn--md type-ui-md" type="submit">Add</button>
          </div>
        </form>
      </div>
    </div>
    ${window.KNAdminUX.confirmModal({
      open: Boolean(deleteUser),
      title: "Delete User?",
      description: `Are you sure you want to delete the user ${deleteUser?.name || ""}?`,
      actionLabel: "Delete User",
      actionAttr: "data-user-delete-confirm"
    })}
    ${window.KNAdminUX.confirmModal({
      open: state.modal === "deactivate",
      title: "Deactivate last administrator?",
      description: `${findUser(state.deactivateId)?.name || "This user"} is the last active KN Administrator. Deactivating them leaves no active administrator.`,
      actionLabel: "Deactivate",
      actionAttr: "data-user-deactivate-confirm"
    })}
    ${window.KNAdminUX.discardModal({
      open: Boolean(state.leaveTo),
      title: "Discard changes",
      description: "Unsaved user changes will be lost.",
      confirmLabel: "Discard"
    })}`;
  }

  function render() {
    const root = document.getElementById("kn-user-root");
    const page = document.getElementById("kn-user-page");
    if (!root || !page || page.hidden) {
      return;
    }
    consumeListQuery();
    const route = parseRoute();
    const scroller = document.querySelector(".content");
    const top = scroller?.scrollTop || 0;
    const drawerScroll = window.KNAdminUX.captureDrawerScroll(page);
    const drawerFocus = window.KNAdminUX.captureDrawerFocus(page);
    const filterFocus = window.KNAdminUX.captureColFilterFocus(page);
    if (route.view === "form") {
      state.reviewId = "";
      if (!state.form || state.form.id !== route.id) {
        const existing = route.id ? findUser(route.id) : null;
        if (route.id && !existing) {
          toast("That user is no longer available.", "notice");
          goto("#kn-user-management");
          return;
        }
        state.form = blankForm(existing);
        state.formSnapshot = snapshotForm(existing || state.form);
        state.dirty = false;
        closeFormMenus();
        state.roleQuery = "";
        resetAiUserState();
        if (!existing) {
          applyPendingAiDraft();
        }
      } else if (!route.id && window.KNAiSuggest?.peekDraft?.("user")) {
        applyPendingAiDraft();
      }
    } else if (route.view === "detail") {
      const user = findUser(route.id);
      if (!user) {
        toast("That user is no longer available.", "notice");
        goto("#kn-user-management");
        return;
      }
      state.reviewId = "";
      if (!state.form || state.form.id !== route.id) {
        state.form = blankForm(user);
        state.formSnapshot = snapshotForm(user);
        state.dirty = false;
        closeFormMenus();
        state.roleQuery = "";
      }
    } else {
      state.form = null;
      state.formSnapshot = null;
      state.dirty = false;
      closeFormMenus();
    }
    root.innerHTML = renderList();
    restoreScroll(scroller, top);
    window.KNAdminUX.restoreDrawerScroll(page, drawerScroll, { focusSelector: drawerFocus });
    window.KNAdminUX.restoreColFilterFocus(page, filterFocus);
    if (route.view === "form" || route.view === "detail") {
      restoreRoleSearch();
    }
    window.KNAdminUX.syncOverlayFocus(page);
    syncUpdateBtn(root);
    if (state.restoreFocusId && !window.KNAdminUX.activeOverlay(page)) {
      const id = state.restoreFocusId;
      state.restoreFocusId = "";
      requestAnimationFrame(() => {
        document.querySelector(`#kn-user-root tr[data-user-id="${CSS.escape(id)}"]`)?.focus();
      });
    }
  }

  function restoreScroll(scroller, top) {
    if (scroller) {
      scroller.scrollTop = top;
    }
  }

  function restoreRoleSearch() {
    if (!state.roleMenuOpen) {
      return;
    }
    const search = document.getElementById("kn-user-role-search");
    if (!search) {
      return;
    }
    search.focus();
    const end = search.value.length;
    search.setSelectionRange(end, end);
  }

  function readForm(formEl) {
    if (!formEl) {
      return state.form;
    }
    const prior = state.form || {};
    const nameEl = formEl.querySelector("#kn-user-name");
    const emailEl = formEl.querySelector("#kn-user-email");
    const phoneCountryEl = formEl.querySelector("#kn-user-phone-country");
    const phoneEl = formEl.querySelector("#kn-user-phone");
    const titleEl = formEl.querySelector("#kn-user-title");
    const reportsEl = formEl.querySelector("#kn-user-reports");
    const subCustomerEl = formEl.querySelector("#kn-user-subcustomer");
    const partyEl = formEl.querySelector("#kn-user-party");
    const customerEntityEl = formEl.querySelector("#kn-user-customer-entity");
    const levelEl = formEl.querySelector('input[name="level"]:checked');
    const restrictionsEl = formEl.querySelector('input[name="restrictions"]:checked');
    const roleInputs = [...formEl.querySelectorAll("[data-user-role]")];
    const roles = window.KNAdminUX.mergeDomMultiSelect(
      prior.roles,
      roleInputs.filter((input) => input.checked).map((input) => input.getAttribute("data-user-role")),
      roleInputs.map((input) => input.getAttribute("data-user-role"))
    );
    const level = levelEl ? levelEl.value : prior.level || "CUSTOMER";
    return {
      name: nameEl ? nameEl.value.trim() : prior.name || "",
      email: emailEl && !emailEl.disabled ? emailEl.value.trim() : prior.email || "",
      phoneCountry: phoneCountryEl ? phoneCountryEl.value || "" : prior.phoneCountry || "",
      phone: phoneEl ? phoneEl.value.trim() : prior.phone || "",
      title: titleEl ? titleEl.value.trim() : prior.title || "",
      reportsTo: reportsEl ? reportsEl.value || "" : prior.reportsTo || "",
      level,
      subCustomer: subCustomerEl ? subCustomerEl.value || "" : prior.subCustomer || "",
      party: partyEl ? partyEl.value || "" : prior.party || "",
      customerEntity: customerEntityEl ? customerEntityEl.value || "" : prior.customerEntity || "",
      restrictions: restrictionsEl ? restrictionsEl.value : prior.restrictions || "no",
      roles
    };
  }

  function persistForm(next) {
    state.form = { ...state.form, ...next };
    state.dirty = isFormDataDirty(state.form);
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function closeModal() {
    state.modal = "";
    state.deleteId = "";
    state.deactivateId = "";
    state.reporterForm = { name: "", email: "", error: "" };
    render();
  }

  function toggleUser(id, active) {
    const users = loadUsers();
    const user = users.find((item) => item.id === id);
    if (!user) {
      return;
    }
    const otherAdmins = users.filter(
      (item) => item.id !== id && item.active && (item.roles || []).includes("KN Administrator")
    );
    if (user.active && !active && (user.roles || []).includes("KN Administrator") && !otherAdmins.length) {
      state.modal = "deactivate";
      state.deactivateId = id;
      render();
      return;
    }
    user.active = active;
    saveUsers(users);
    toast(`${user.name} is ${user.active ? "active" : "inactive"}.`);
    if (state.form?.id === id) {
      state.form.active = active;
    }
    if (state.reviewId === id && active) {
      advanceReview(id);
      return;
    }
    render();
  }

  function snapshotForm(form) {
    return {
      name: form.name || "",
      email: form.email || "",
      phoneCountry: form.phoneCountry || "",
      phone: form.phone || "",
      title: form.title || "",
      reportsTo: form.reportsTo || "",
      level: form.level || "",
      subCustomer: form.subCustomer || "",
      party: form.party || "",
      customerEntity: form.customerEntity || "",
      restrictions: form.restrictions || "no",
      roles: (form.roles || []).slice().sort().join("\0")
    };
  }

  function formComparable(form) {
    return {
      name: String(form?.name || "").trim(),
      email: String(form?.email || "").trim(),
      phoneCountry: String(form?.phoneCountry || ""),
      phone: String(form?.phone || "").trim(),
      title: String(form?.title || "").trim(),
      reportsTo: String(form?.reportsTo || ""),
      level: String(form?.level || ""),
      subCustomer: String(form?.subCustomer || ""),
      party: String(form?.party || ""),
      customerEntity: String(form?.customerEntity || ""),
      restrictions: String(form?.restrictions || "no"),
      roles: (form?.roles || []).slice().sort().join("\0")
    };
  }

  function isFormDataDirty(formData) {
    if (!state.formSnapshot) {
      return false;
    }
    const current = formComparable(formData);
    return (
      current.name !== state.formSnapshot.name ||
      current.email !== state.formSnapshot.email ||
      current.phoneCountry !== state.formSnapshot.phoneCountry ||
      current.phone !== state.formSnapshot.phone ||
      current.title !== state.formSnapshot.title ||
      current.reportsTo !== state.formSnapshot.reportsTo ||
      current.level !== state.formSnapshot.level ||
      current.subCustomer !== state.formSnapshot.subCustomer ||
      current.party !== state.formSnapshot.party ||
      current.customerEntity !== state.formSnapshot.customerEntity ||
      current.restrictions !== state.formSnapshot.restrictions ||
      current.roles !== state.formSnapshot.roles
    );
  }

  function isFormDirty(formEl) {
    return isFormDataDirty(readForm(formEl));
  }

  function syncUpdateBtn(root) {
    const drawer = root.querySelector("#admin-profile-drawer");
    if (!drawer) {
      return;
    }
    const btn = drawer.querySelector("#kn-update-user-btn");
    if (!btn) {
      return;
    }
    const formEl = root.querySelector("#kn-user-form");
    const dirty = isFormDirty(formEl);
    state.dirty = dirty;
    btn.disabled = !dirty;
  }

  function bind(root) {
    root.addEventListener("click", (event) => {
      const reviewStart = event.target.closest("[data-admin-review]");
      if (reviewStart) {
        event.preventDefault();
        startReview();
        return;
      }
      if (event.target.closest("[data-admin-review-close]")) {
        event.preventDefault();
        closeReview();
        return;
      }
      if (event.target.closest("[data-user-profile-close]")) {
        event.preventDefault();
        requestLeave("#kn-user-management");
        return;
      }
      if (event.target.closest("[data-user-form-close]")) {
        event.preventDefault();
        requestLeave(formLeaveHash());
        return;
      }
      const revoke = event.target.closest("[data-admin-review-revoke]");
      if (revoke) {
        const id = revoke.getAttribute("data-admin-review-revoke");
        const users = loadUsers();
        const user = users.find((item) => item.id === id);
        if (user) {
          user.roles = (user.roles || []).filter((role) => role !== "KN Administrator");
          saveUsers(users);
          toast(`KN Administrator removed from ${user.name}.`);
          advanceReview(id);
        }
        return;
      }
      const activateReview = event.target.closest("[data-admin-review-activate]");
      if (activateReview) {
        const id = activateReview.getAttribute("data-admin-review-activate");
        const users = loadUsers();
        const user = users.find((item) => item.id === id);
        if (user) {
          user.active = true;
          saveUsers(users);
          toast(`${user.name} is active again.`);
          advanceReview(id);
        }
        return;
      }
      if (event.target.closest("[data-admin-review-next]")) {
        const queue = privilegedInactive();
        const index = queue.findIndex((item) => item.id === state.reviewId);
        state.reviewId = queue[(index + 1) % Math.max(queue.length, 1)]?.id || state.reviewId;
        render();
        return;
      }
      const dismiss = event.target.closest("[data-user-modal-dismiss], [data-admin-modal-dismiss]");
      if (dismiss) {
        event.preventDefault();
        closeModal();
        return;
      }
      const addReporter = event.target.closest("[data-user-add-reporter]");
      if (addReporter) {
        event.preventDefault();
        persistForm(readForm(root.querySelector("#kn-user-form")));
        state.modal = "reporter";
        state.reporterForm = { name: "", email: "", error: "" };
        closeFormMenus();
        render();
        document.getElementById("kn-reporter-name")?.focus();
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
      const rowToggle = event.target.closest("[data-user-row-toggle]");
      if (rowToggle) {
        event.preventDefault();
        state.menuOpen = "";
        const id = rowToggle.getAttribute("data-user-row-toggle");
        const user = findUser(id);
        toggleUser(id, !user?.active);
        return;
      }
      const deleteBtn = event.target.closest("[data-user-delete]");
      if (deleteBtn) {
        state.deleteId = deleteBtn.getAttribute("data-user-delete");
        state.modal = "delete";
        state.menuOpen = "";
        render();
        return;
      }
      const deleteConfirm = event.target.closest("[data-user-delete-confirm]");
      if (deleteConfirm) {
        const users = loadUsers().filter((user) => user.id !== state.deleteId);
        const removed = findUser(state.deleteId);
        saveUsers(users);
        state.modal = "";
        state.deleteId = "";
        toast(`${removed?.name || "User"} deleted.`, "notice");
        goto("#kn-user-management");
        return;
      }
      if (event.target.closest("[data-user-deactivate-confirm]")) {
        const users = loadUsers();
        const user = users.find((item) => item.id === state.deactivateId);
        if (user) {
          user.active = false;
          saveUsers(users);
          toast(`${user.name} is inactive.`, "notice");
          if (state.form?.id === user.id) {
            state.form.active = false;
          }
        }
        state.modal = "";
        state.deactivateId = "";
        render();
        return;
      }
      const selectHandled = window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (next) => {
          state.selectOpen = next;
          state.roleMenuOpen = false;
          if (state.form) {
            persistForm(readForm(root.querySelector("#kn-user-form")));
          }
          render();
        },
        onChange: (key, value) => {
          if (key === "level" || key === "status") {
            state.filters[key] = value;
            state.page = 1;
            state.selectOpen = "";
            render();
            return;
          }
          if (key === "pageSize") {
            state.pageSize = Number(value) || 10;
            state.page = 1;
            state.selectOpen = "";
            render();
            return;
          }
          const current = readForm(root.querySelector("#kn-user-form"));
          const fieldMap = {
            country: "phoneCountry",
            reports: "reportsTo",
            subCustomer: "subCustomer",
            party: "party",
            customerEntity: "customerEntity"
          };
          const field = fieldMap[key];
          if (!field) {
            state.selectOpen = "";
            render();
            return;
          }
          if (current[field] === value) {
            state.selectOpen = "";
            render();
            return;
          }
          persistForm({
            ...current,
            [field]: value,
            ...(field === "subCustomer" ? { subCustomerError: "" } : {}),
            ...(field === "party" ? { partyError: "" } : {}),
            ...(field === "customerEntity" ? { customerEntityError: "" } : {})
          });
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
      const removeRole = event.target.closest("[data-user-role-remove]");
      if (removeRole) {
        event.preventDefault();
        event.stopPropagation();
        const name = removeRole.getAttribute("data-user-role-remove") || "";
        const snap = readForm(root.querySelector("#kn-user-form"));
        state.aiRoleOnly = (state.aiRoleOnly || []).filter((role) => role !== name);
        persistForm({
          ...snap,
          roles: (snap.roles || []).filter((role) => role !== name),
          rolesError: ""
        });
        window.KNAiSuggest?.logAudit?.({
          action: "remove-role-chip",
          context: "kn-user",
          field: "roles",
          origin: "manual",
          value: name
        });
        render();
        if (!state.roleMenuOpen) {
          requestAnimationFrame(() => {
            root.querySelector("[data-user-role-toggle]")?.focus();
          });
        }
        return;
      }
      if (event.target.closest("[data-ai-user-role-chip]")) {
        event.preventDefault();
        return;
      }
      if (event.target.closest("[data-ai-user-roles-clear], [data-ai-describe-clear='user']")) {
        event.preventDefault();
        return;
      }
      const roleToggle = event.target.closest("[data-user-role-toggle]");
      if (roleToggle) {
        event.preventDefault();
        event.stopPropagation();
        persistForm(readForm(root.querySelector("#kn-user-form")));
        state.selectOpen = "";
        state.roleMenuOpen = !state.roleMenuOpen;
        render();
        return;
      }
      const dismissFilter = event.target.closest("[data-admin-filter-dismiss]");
      if (dismissFilter) {
        event.preventDefault();
        dismissApplied(dismissFilter.getAttribute("data-admin-filter-dismiss") || "");
        return;
      }
      const nav = event.target.closest("[data-user-nav]");
      if (nav) {
        event.preventDefault();
        const to = nav.getAttribute("data-user-nav");
        const id = nav.getAttribute("data-user-id") || "";
        const hash =
          to === "add"
            ? "#kn-user-management/add"
            : to === "edit"
              ? `#kn-user-management/${encodeURIComponent(id)}/edit`
              : to === "detail"
                ? `#kn-user-management/${encodeURIComponent(id)}`
                : "#kn-user-management";
        if (to === "detail") {
          const route = parseRoute();
          if (route.view !== "list" && route.id === id) {
            requestLeave("#kn-user-management");
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
      const row = event.target.closest("tr[data-user-id]");
      if (row && !event.target.closest("a, button, input, label, .blade-select, .user-row-actions, .admin-more")) {
        const id = row.getAttribute("data-user-id");
        const route = parseRoute();
        if (route.view !== "list" && route.id === id) {
          requestLeave("#kn-user-management");
          return;
        }
        goto(`#kn-user-management/${encodeURIComponent(id)}`);
        return;
      }
      const sort = event.target.closest("[data-user-sort]");
      if (sort) {
        const key = sort.getAttribute("data-user-sort");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-user-page]");
      if (pageBtn && !pageBtn.disabled) {
        state.page = Number(pageBtn.getAttribute("data-user-page")) || 1;
        render();
        return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        const id = chip.getAttribute("data-admin-chip") || "all";
        state.filters.chip = id;
        if (id === "all") {
          state.filters.role = "";
          state.filters.inherited = "";
          state.filters.entity = "";
        }
        state.page = 1;
        if (state.reviewId && state.filters.chip !== "inactive") {
          state.reviewId = "";
        }
        if (id === "all" && (location.hash || "").includes("?")) {
          window.KNAdminUX.beginNavigation();
          goto("#kn-user-management");
          return;
        }
        render();
        return;
      }
      if (event.target.closest("[data-admin-clear-filters]")) {
        event.preventDefault();
        clearFilters();
        return;
      }
      const edit = event.target.closest("[data-user-edit]");
      if (edit) {
        goto(`#kn-user-management/${encodeURIComponent(edit.getAttribute("data-user-edit"))}/edit`);
        return;
      }
      const notify = event.target.closest("[data-user-notify]");
      if (notify) {
        event.preventDefault();
        const user = findUser(notify.getAttribute("data-user-notify") || "");
        toast(user ? `Notifications for ${user.name} are managed in Notification Management.` : "Notifications are managed separately.", "notice");
        return;
      }
    });

    root.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-user-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-user-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      const size = event.target.closest("[data-user-pagesize]");
      if (size) {
        state.pageSize = Number(size.value) || 10;
        state.page = 1;
        render();
        return;
      }
      const toggle = event.target.closest("[data-user-toggle]");
      if (toggle) {
        toggleUser(toggle.getAttribute("data-user-toggle"), toggle.checked);
        return;
      }
      const role = event.target.closest("[data-user-role]");
      if (role) {
        const name = role.getAttribute("data-user-role") || "";
        const checked = role.checked;
        if (!checked) {
          state.aiRoleOnly = (state.aiRoleOnly || []).filter((item) => item !== name);
        } else if (!(state.aiRoleOnly || []).includes(name)) {
          window.KNAiSuggest?.logAudit?.({
            action: "manual-role-check",
            context: "kn-user",
            field: "roles",
            origin: "manual",
            value: name
          });
        }
        persistForm({
          ...readForm(root.querySelector("#kn-user-form")),
          rolesError: ""
        });
        render();
        return;
      }
      const levelPick = event.target.closest("[data-user-level]");
      if (levelPick && event.target.matches("input[type='radio']")) {
        const nextLevel = levelPick.getAttribute("data-user-level") || "CUSTOMER";
        const current = readForm(root.querySelector("#kn-user-form"));
        persistForm({
          ...current,
          level: nextLevel,
          levelError: "",
          subCustomerError: "",
          partyError: "",
          customerEntityError: "",
          rolesError: "",
          subCustomer: nextLevel === "CUSTOMER" ? "" : current.subCustomer,
          party: nextLevel === "PARTIES" ? current.party : "",
          customerEntity: nextLevel === "CUSTOMER" ? current.customerEntity || "kn-admin" : "",
          restrictions:
            nextLevel === "CUSTOMER" || nextLevel === "SUB_CUSTOMER" ? current.restrictions || "no" : "no"
        });
        render();
        return;
      }
      const restrictionPick = event.target.closest("[data-user-restrictions]");
      if (restrictionPick && event.target.matches("input[type='radio']")) {
        persistForm({
          ...readForm(root.querySelector("#kn-user-form")),
          restrictions: restrictionPick.getAttribute("data-user-restrictions") || "no"
        });
        render();
        return;
      }
      if (event.target.closest("#kn-user-form")) {
        persistForm(readForm(root.querySelector("#kn-user-form")));
        syncUpdateBtn(root);
      }
    });

    root.addEventListener("input", (event) => {
      const filter = event.target.closest("[data-user-filter]");
      if (filter) {
        state.filters[filter.getAttribute("data-user-filter")] = filter.value;
        state.page = 1;
        render();
        return;
      }
      if (event.target.id === "kn-user-role-search") {
        state.roleQuery = event.target.value;
        persistForm(readForm(root.querySelector("#kn-user-form")));
        render();
        return;
      }
      if (event.target.matches("[data-ai-describe='user']")) {
        return;
      }
      if (event.target.id === "kn-user-title") {
        if (state.aiFieldMeta?.title) {
          state.aiFieldMeta = { ...state.aiFieldMeta, title: "" };
          window.KNAiSuggest?.logAudit?.({
            action: "manual-edit",
            context: "kn-user",
            field: "title",
            origin: "manual",
            value: event.target.value
          });
        }
        persistForm(window.KNAdminUX.applyUserField(readForm(root.querySelector("#kn-user-form")), "title", event.target.value.trim()));
        syncUpdateBtn(root);
        return;
      }
      if (event.target.closest("#kn-user-form")) {
        const field = event.target;
        const formEl = root.querySelector("#kn-user-form");
        const keyMap = {
          "kn-user-name": "name",
          "kn-user-email": "email",
          "kn-user-phone": "phone",
          "kn-user-phone-country": "phoneCountry",
          "kn-user-reports": "reportsTo"
        };
        const key = keyMap[field.id];
        if (key && state.form) {
          const value = key === "phoneCountry" || key === "reportsTo" ? field.value || "" : field.value.trim();
          persistForm(window.KNAdminUX.applyUserField(readForm(formEl), key, value));
        } else {
          persistForm(readForm(formEl));
        }
        syncUpdateBtn(root);
      }
    });

    root.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      if (event.target.closest("[data-user-role-remove]")) {
        return;
      }
      const toggle = event.target.closest("[data-user-role-toggle]");
      if (!toggle || toggle.tagName === "BUTTON" || event.target !== toggle) {
        return;
      }
      event.preventDefault();
      persistForm(readForm(root.querySelector("#kn-user-form")));
      state.selectOpen = "";
      state.roleMenuOpen = !state.roleMenuOpen;
      render();
    });

    root.addEventListener("submit", (event) => {
      if (event.target.id === "kn-user-reporter-form") {
        event.preventDefault();
        const name = event.target.querySelector("#kn-reporter-name")?.value.trim() || "";
        const email = event.target.querySelector("#kn-reporter-email")?.value.trim() || "";
        if (!name || !validEmail(email)) {
          state.reporterForm = { name, email, error: "Enter a full name and a valid email." };
          render();
          document.getElementById(name ? "kn-reporter-email" : "kn-reporter-name")?.focus();
          return;
        }
        const reporters = loadReporters();
        const id = `rep-${Date.now().toString(36)}`;
        reporters.unshift({ id, name, email });
        saveReporters(reporters);
        persistForm({ ...readForm(root.querySelector("#kn-user-form")), reportsTo: id });
        state.modal = "";
        state.reporterForm = { name: "", email: "", error: "" };
        toast(`${name} added as a reporting user.`);
        render();
        return;
      }
      if (!event.target.matches("#kn-user-form")) {
        return;
      }
      event.preventDefault();
      const snap = readForm(event.target);
      const baseline = state.formSnapshot
        ? {
            name: state.formSnapshot.name,
            email: state.formSnapshot.email,
            roles: String(state.formSnapshot.roles || "")
              .split("\0")
              .filter(Boolean)
          }
        : null;
      const cleared = window.KNAdminUX.detectClearedRequiredUserFields(baseline, {
        name: snap.name,
        email: snap.email,
        roles: snap.roles
      });
      if (cleared.length) {
        toast(
          `Save blocked: required field${cleared.length > 1 ? "s" : ""} ${cleared.join(", ")} would be cleared unexpectedly. Re-enter them before saving.`,
          "negative",
          event.submitter instanceof HTMLElement ? event.submitter : event.currentTarget
        );
        state.form = { ...state.form, ...snap, error: cleared.includes("name") ? "Full Name was cleared unexpectedly." : "", emailError: cleared.includes("email") ? "Email was cleared unexpectedly." : "" };
        render();
        return;
      }
      if (!snap.name) {
        state.form = { ...state.form, ...snap, error: "Enter a full name.", emailError: "" };
        render();
        document.getElementById("kn-user-name")?.focus();
        return;
      }
      if (!state.form.id && !validEmail(snap.email)) {
        state.form = { ...state.form, ...snap, error: "", emailError: "Enter a valid email address." };
        render();
        document.getElementById("kn-user-email")?.focus();
        return;
      }
      if (!snap.level || !LEVELS.some((item) => item.id === snap.level)) {
        state.form = { ...state.form, ...snap, levelError: "Select a user level." };
        render();
        return;
      }
      if ((snap.level === "PARTIES" || snap.level === "SUB_CUSTOMER" || snap.level === "COMPANY") && !snap.subCustomer) {
        state.form = {
          ...state.form,
          ...snap,
          subCustomerError: "Sub-customer is required",
          partyError: "",
          customerEntityError: "",
          rolesError: ""
        };
        render();
        document.getElementById("kn-user-subcustomer")?.focus();
        return;
      }
      if (snap.level === "PARTIES" && !snap.party) {
        state.form = { ...state.form, ...snap, partyError: "Party is required", subCustomerError: "", rolesError: "" };
        render();
        document.getElementById("kn-user-party")?.focus();
        return;
      }
      if (!snap.roles.length) {
        state.form = {
          ...state.form,
          ...snap,
          error: "",
          emailError: "",
          subCustomerError: "",
          partyError: "",
          rolesError: "User Role field must have at least 1 item"
        };
        state.roleMenuOpen = true;
        render();
        return;
      }
      const users = loadUsers();
      const emailValue = state.form.id ? state.form.email : snap.email;
      const duplicate = users.some((user) => user.id !== state.form.id && user.email.toLowerCase() === emailValue.toLowerCase());
      if (duplicate) {
        state.form = { ...state.form, ...snap, error: "", emailError: "A user with this email already exists." };
        render();
        document.getElementById("kn-user-email")?.focus();
        return;
      }
      const entity = resolveEntity();
      const normalized = {
        name: snap.name,
        email: emailValue,
        phoneCountry: snap.phoneCountry,
        phone: snap.phone,
        title: snap.title,
        reportsTo: snap.reportsTo,
        level: snap.level,
        entityName: ENTITY_DISPLAY_NAME,
        entity,
        subCustomer: snap.level === "CUSTOMER" ? "" : snap.subCustomer,
        party: snap.level === "PARTIES" ? snap.party : "",
        customerEntity: snap.level === "CUSTOMER" ? snap.customerEntity || "kn-admin" : "",
        restrictions:
          snap.level === "CUSTOMER" || snap.level === "SUB_CUSTOMER" ? snap.restrictions || "no" : "no",
        roles: snap.roles
      };
      if (state.form.id) {
        const current = users.find((user) => user.id === state.form.id);
        if (current) {
          Object.assign(current, normalized);
        }
        saveUsers(users);
        state.dirty = false;
        toast(`${snap.name} updated.`);
        goto(`#kn-user-management/${encodeURIComponent(state.form.id)}`);
        return;
      }
      const id = uniqueId(snap.name, users);
      users.unshift({
        id,
        ...normalized,
        active: true,
        lastActive: new Date().toISOString()
      });
      saveUsers(users);
      state.dirty = false;
      toast(`${snap.name} added.`);
      goto(`#kn-user-management/${encodeURIComponent(id)}`);
    });
  }

  function suspend() {
    resetAiUserState();
    state.form = null;
    state.formSnapshot = null;
    state.dirty = false;
    state.leaveTo = "";
    state.modal = "";
    state.deleteId = "";
    state.deactivateId = "";
    state.reviewId = "";
    state.reporterForm = { name: "", email: "", error: "" };
    closeFormMenus();
    document
      .getElementById("kn-user-root")
      ?.querySelectorAll(".blade-drawer-root, .blade-modal-root")
      .forEach((node) => node.remove());
  }

  function sync() {
    const page = document.getElementById("kn-user-page");
    if (!page || page.hidden) {
      return;
    }
    render();
  }

  function init() {
    const page = document.getElementById("kn-user-page");
    if (!page || page.dataset.bound) {
      return;
    }
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("click", (event) => {
      if ((!state.roleMenuOpen && !state.selectOpen && !state.menuOpen) || page.hidden) {
        return;
      }
      if (event.target.closest(".blade-select, .admin-more, [data-user-role-toggle], [data-admin-select-toggle], [data-admin-more-toggle]")) {
        return;
      }
      if (state.form) {
        persistForm(readForm(page.querySelector("#kn-user-form")));
      }
      closeFormMenus();
      render();
    });
    document.addEventListener("kn-close-selects", () => {
      if (!state.selectOpen || page.hidden) {
        return;
      }
      state.selectOpen = "";
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
      if (state.modal) {
        closeModal();
        return;
      }
      if (state.leaveTo) {
        state.leaveTo = "";
        render();
        return;
      }
      if (parseRoute().view === "form") {
        requestLeave(formLeaveHash());
        return;
      }
      if (parseRoute().view === "detail") {
        requestLeave("#kn-user-management");
        return;
      }
      if (state.reviewId) {
        closeReview();
        return;
      }
      if (state.roleMenuOpen || state.selectOpen || state.menuOpen) {
        closeFormMenus();
        render();
      }
    });
  }

  window.KNUsers = {
    sync,
    suspend,
    init,
    parseRoute,
    list() {
      return loadUsers();
    },
    isDirty() {
      return Boolean(state.dirty);
    },
    requestLeave,
    open(path) {
      goto(path === "add" ? "#kn-user-management/add" : "#kn-user-management");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
