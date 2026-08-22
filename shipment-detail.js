(() => {
  const TABS = [
    { id: "information", label: "Info" },
    { id: "activities", label: "Activities" },
    { id: "journeys", label: "Journey" },
    { id: "container", label: "Container" },
    { id: "documents", label: "Documents" },
    { id: "references", label: "References" }
  ];

  const CITY_COORDS = {
    Charleston: [32.7765, -79.9311],
    Hamburg: [53.5511, 9.9937],
    Shanghai: [31.2304, 121.4737],
    Yantian: [22.5833, 114.2667],
    London: [51.47, -0.4543],
    Ningbo: [29.8683, 121.544],
    "Nhava Sheva": [18.95, 72.95],
    Singapore: [1.3521, 103.8198],
    Laredo: [27.5036, -99.5075],
    Dubai: [25.2532, 55.3657],
    Tokyo: [35.6762, 139.6503],
    "Los Angeles": [33.7406, -118.271],
    "Long Beach": [33.7701, -118.1937],
    "New York": [40.6413, -73.7781],
    Rotterdam: [51.9225, 4.47917],
    Houston: [29.7604, -95.3698],
    Frankfurt: [50.0379, 8.5622]
  };

  const CARRIERS = {
    ocean: "MAERSK LINE",
    air: "CATHAY PACIFIC AIRWAYS LTD.",
    truck: "SCHNEIDER NATIONAL",
    rail: "BNSF RAILWAY"
  };

  const MOT_ICONS = {
    ocean:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18l-2-6H8L3 17Z"/><path d="M8 11V7h8l2 4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>',
    air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3V7Z"/><path d="M14 10h4l3 3v3h-7v-6Z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
    rail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 16v3M16 16v3M6 21h12"/><path d="M8 8h8"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    chevron:
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    notice:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 4.3 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  };

  const MOT_LABELS = window.KN_MOT_LABELS || { ocean: "Ocean", air: "Air", truck: "Truck", rail: "Rail" };

  let detailMap = null;
  let detailMapLayer = null;
  let journeyExpanded = false;
  let journeyDescending = true;
  let bound = false;
  let closeTimer = 0;
  let loadTimer = 0;
  let loadToken = 0;
  let pendingLoadId = "";
  let lastFocus = null;
  let refsPointerFocus = false;
  let refsDraftTimer = 0;
  let refsDraftSaving = false;
  let refsUi = {
    shipmentId: "",
    scope: "shipment",
    type: "all",
    query: "",
    showUnused: false,
    catalog: null,
    saved: null,
    draftSavedAt: "",
    selectOpen: ""
  };
  const REFS_DRAFT_KEY = "kn-ref-drafts";

  const REF_SCOPES = [
    { id: "shipment", label: "Shipment" },
    { id: "invoice", label: "Invoice" },
    { id: "merchandise", label: "Merchandise" }
  ];
  const REF_TYPES = [
    { id: "all", label: "All" },
    { id: "text", label: "Text" },
    { id: "date", label: "Date" },
    { id: "number", label: "Number" }
  ];
  const cloneRefs = (value) => JSON.parse(JSON.stringify(value));
  const toInputDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const hashNum = (value) => {
    let hash = 0;
    String(value || "")
      .split("")
      .forEach((char) => {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
      });
    return hash;
  };

  const formatStamp = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(",", "");
  };

  const addHours = (iso, hours) => {
    const date = new Date(iso);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  };

  const parsePortDate = (value) => {
    const match = /(ETD|ETA)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(value || "");
    if (!match) {
      return null;
    }
    const date = new Date(`${match[3]} ${match[2]}, ${match[4]} 12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const transitDays = (item) => {
    const start = parsePortDate(item.origin?.date);
    const end = parsePortDate(item.dest?.date);
    if (!start || !end) {
      return item.mot === "air" ? 1 : item.mot === "truck" ? 2 : 16;
    }
    return Math.max(1, Math.round((end - start) / 86400000));
  };

  const badgeClass = (tone) => {
    const intense = tone === "negative" || tone === "notice" ? " badge--intense" : "";
    return `badge badge--${tone || "information"}${intense} type-caption-sm type-weight-medium`;
  };

  const titleCase = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\b[a-z]/g, (char) => char.toUpperCase());

  const codeChip = (value) =>
    value ? `<span class="code type-caption-sm">${escapeHtml(value)}</span>` : "—";

  const findShipment = (id) => (window.KNShipments || []).find((item) => item.id === id);

  const isOnVisibility = () => (location.hash || "").split("?")[0] === "#klearhub-visibility";

  const detailList = (id) => {
    const filtered = typeof getFilteredVisShipments === "function" ? getFilteredVisShipments() : [];
    if (id && filtered.some((item) => item.id === id)) {
      return filtered;
    }
    return window.KNShipments || [];
  };

  const shipmentIndex = (id) => detailList(id).findIndex((item) => item.id === id);

  const adjacentShipmentId = (id, dir) => {
    const list = detailList(id);
    if (!list.length) {
      return "";
    }
    const index = shipmentIndex(id);
    if (index < 0) {
      return list[0].id;
    }
    return list[(index + dir + list.length) % list.length].id;
  };

  const pagerCaption = (id) => {
    const list = detailList(id);
    const index = shipmentIndex(id);
    if (index < 0 || !list.length) {
      return "";
    }
    return `${index + 1} of ${list.length}`;
  };

  const disabledControl = (html, tooltip) =>
    `<span class="kn-disabled-tip" data-tooltip="${escapeHtml(tooltip)}">${html}</span>`;

  const refsAreDirty = () => Boolean(refsUi.catalog && refsUi.saved && JSON.stringify(refsUi.catalog) !== JSON.stringify(refsUi.saved));

  const isRefsCatalog = (value) =>
    Boolean(value && value.shipment && Array.isArray(value.invoices) && Array.isArray(value.merchandise));

  function readRefsDraftStore() {
    try {
      const raw = window.localStorage.getItem(REFS_DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeRefsDraftStore(store) {
    try {
      window.localStorage.setItem(REFS_DRAFT_KEY, JSON.stringify(store));
    } catch (error) {
      /* quota or private mode — keep the in-memory draft */
    }
  }

  function loadRefsDraft(shipmentId) {
    const entry = readRefsDraftStore()[shipmentId];
    if (!entry || !isRefsCatalog(entry.catalog)) {
      return null;
    }
    return { catalog: cloneRefs(entry.catalog), savedAt: entry.savedAt || "" };
  }

  function clearRefsDraft(shipmentId) {
    if (!shipmentId) {
      return;
    }
    const store = readRefsDraftStore();
    if (!store[shipmentId]) {
      return;
    }
    delete store[shipmentId];
    writeRefsDraftStore(store);
  }

  function persistRefsDraft({ immediate = false } = {}) {
    if (!refsUi.shipmentId || !refsUi.catalog) {
      return;
    }
    const write = () => {
      refsDraftSaving = false;
      refsDraftTimer = 0;
      if (!refsAreDirty()) {
        clearRefsDraft(refsUi.shipmentId);
        refsUi.draftSavedAt = "";
        syncRefsFooter();
        return;
      }
      refsUi.draftSavedAt = new Date().toISOString();
      const store = readRefsDraftStore();
      store[refsUi.shipmentId] = {
        catalog: cloneRefs(refsUi.catalog),
        savedAt: refsUi.draftSavedAt
      };
      writeRefsDraftStore(store);
      syncRefsFooter();
    };
    window.clearTimeout(refsDraftTimer);
    if (immediate) {
      write();
      return;
    }
    refsDraftSaving = true;
    syncRefsFooter();
    refsDraftTimer = window.setTimeout(write, 400);
  }

  function refsDraftLabel() {
    if (refsDraftSaving) {
      return "Saving draft…";
    }
    if (!refsAreDirty()) {
      return "No draft";
    }
    return "Draft saved";
  }

  const emptyState = (icon, title, description, action = "") =>
    `<div class="empty-state vis-empty-state kn-empty">
      <span class="empty-state__asset" aria-hidden="true">${icon}</span>
      <p class="type-heading-h5 type-weight-semibold">${escapeHtml(title)}</p>
      <p class="type-body-sm">${escapeHtml(description)}</p>
      ${action}
    </div>`;

  function applyDocSearch(scope) {
    const panel = scope?.closest?.(".kn-detail-docs") || document.querySelector("#kn-detail-panel .kn-detail-docs");
    if (!panel) {
      return;
    }
    const search = panel.querySelector("[data-kn-doc-search]");
    const query = search?.value.trim().toLowerCase() || "";
    const rows = [...panel.querySelectorAll("[data-kn-doc]")];
    let visible = 0;
    rows.forEach((row) => {
      const show = !query || (row.getAttribute("data-kn-doc") || "").includes(query);
      row.hidden = !show;
      if (show) {
        visible += 1;
      }
    });
    const list = panel.querySelector("[data-kn-doc-list]");
    const empty = panel.querySelector("[data-kn-doc-empty]");
    if (list) {
      list.hidden = visible === 0;
    }
    if (empty) {
      empty.hidden = visible > 0;
    }
    const count = panel.querySelector("[data-kn-doc-count]");
    if (count) {
      count.textContent = query
        ? `${visible} of ${rows.length} file${rows.length === 1 ? "" : "s"}`
        : `${rows.length} file${rows.length === 1 ? "" : "s"}`;
    }
  }

  const coordsFor = (place, fallback) => {
    const named = CITY_COORDS[place?.city];
    if (named) {
      return named;
    }
    return fallback || [22, 20];
  };

  const isArrived = (item) => /ready for pickup|port of delivery|on hold/i.test(item.status || "");
  const isDeparted = (item) => /enroute|in transit|port of delivery|ready for pickup|on hold/i.test(item.status || "");

  function buildActivities(item) {
    const created = item.created || "2026-08-18T09:12:00Z";
    const departed = isDeparted(item);
    const arrived = isArrived(item);
    const air = item.mot === "air";
    const departLabel = air ? "PLANE TOOK OFF" : item.mot === "truck" ? "TRUCK DEPARTED" : item.mot === "rail" ? "RAIL DEPARTED" : "VESSEL DEPARTED";
    const arriveLabel = air ? "PLANE LANDED" : item.mot === "truck" ? "TRUCK ARRIVED" : item.mot === "rail" ? "RAIL ARRIVED" : "VESSEL ARRIVED";
    const released = arrived && item.status !== "On Hold";
    const delivered = /ready for pickup/i.test(item.status || "");
    return [
      { title: "SHIPMENT CREATED", done: true, at: created },
      { title: "INTAKE COMPLETE", done: departed || arrived, at: departed || arrived ? addHours(created, air ? 4 : 12) : "" },
      { title: departLabel, done: departed, at: departed ? addHours(created, air ? 18 : 72) : "" },
      { title: "BROKER ASSIGNED", done: departed, at: departed ? addHours(created, air ? 20 : 80) : "" },
      { title: "ENTRY SUMMARY FILED", done: released, at: released ? addHours(created, air ? 26 : 220) : "" },
      { title: "CARGO RELEASE FILED", done: released, at: released ? addHours(created, air ? 28 : 230) : "" },
      { title: "PGA STATUS", done: released, at: released ? addHours(created, air ? 29 : 236) : "" },
      { title: arriveLabel, done: arrived, at: arrived ? addHours(created, air ? 30 : 240) : "" },
      { title: "SHIPMENT DELIVERED", done: delivered, at: delivered ? addHours(created, air ? 36 : 260) : "" }
    ].map((step) => ({
      ...step,
      stamp: step.done && step.at ? formatStamp(step.at) : ""
    }));
  }

  function buildJourneys(item) {
    const destStamp = parsePortDate(item.dest?.date);
    const originStamp = parsePortDate(item.origin?.date);
    const destIso = destStamp ? destStamp.toISOString() : item.created;
    const originIso = originStamp ? originStamp.toISOString() : item.created;
    const flight = `${item.mot === "air" ? "CX" : item.mot === "ocean" ? "MAEU" : "TRK"}${String(hashNum(item.id) % 9000 + 1000)}`;
    const transship =
      item.mot === "air"
        ? [
            {
              kind: "Transshipment Port",
              place: "ROISSY CHARLES DE GAULLE CEDEX, 95, FR (LFPG)",
              events: [
                { label: "Flight Number", value: flight },
                { label: "Actual Return To Shipper", value: formatStamp(addHours(originIso, 6)) },
                { label: "Actual Clearance In Progress", value: formatStamp(addHours(originIso, 8)) },
                { label: "Actual Clearance In Progress", value: formatStamp(addHours(originIso, 10)) },
                { label: "Actual Clearance In Progress", value: formatStamp(addHours(originIso, 12)) }
              ],
              extra: 15
            },
            {
              kind: "Transshipment Port",
              place: "LIEUSAINT, 77, FR (LFPO)",
              events: [
                { label: "Flight Number", value: flight },
                { label: "Actual Left Origin Facility", value: formatStamp(addHours(originIso, 4)) }
              ]
            }
          ]
        : item.mot === "ocean"
          ? [
              {
                kind: "Transshipment Port",
                place: "SINGAPORE, SG (SGSIN)",
                events: [
                  { label: "Vessel", value: `MAERSK ${item.id.slice(-2)}` },
                  { label: "Actual Arrival", value: formatStamp(addHours(originIso, 120)) },
                  { label: "Actual Departure", value: formatStamp(addHours(originIso, 132)) }
                ]
              }
            ]
          : [];
    return [
      {
        kind: "Destination",
        place: `${item.dest.city.toUpperCase()}, ${item.dest.region || item.destCountry || ""}, ${item.destCountry || ""} (${item.dest.code})`.replace(/, ,/g, ","),
        events: [
          { label: "Scheduled Arrival", value: formatStamp(destIso) },
          { label: "Estimated Arrival", value: formatStamp(destIso) }
        ]
      },
      ...transship,
      {
        kind: "Origin",
        place: `${item.origin.city.toUpperCase()}, ${item.origin.region || ""}, ${item.origin.countryCode || ""} (${item.origin.code})`.replace(/, ,/g, ","),
        highlight: true,
        events: [
          { label: item.mot === "air" ? "Flight Number" : "Voyage", value: flight },
          { label: "Actual Picked Up", value: formatStamp(originIso) },
          { label: "Actual Manifest Sent", value: formatStamp(addHours(originIso, 2)) }
        ]
      }
    ];
  }

  function buildDocuments(item) {
    return [
      { type: "EML", tone: "information", name: "EML EMAIL DOC", date: formatStamp(item.created).replace(/ \d{2}:\d{2}:\d{2}$/, "") },
      { type: "CERT", tone: "notice", name: "CERT CERT", date: formatStamp(addHours(item.created, 24)).replace(/ \d{2}:\d{2}:\d{2}$/, "") }
    ];
  }

  function toast(content, color = "information") {
    if (typeof window.showBladeToast === "function") {
      window.showBladeToast({ content, color });
    }
  }

  function persist(view) {
    if (typeof persistVisViewHash === "function") {
      persistVisViewHash(view || visState?.view || "cards");
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isVisPageVisible() {
    const page = document.getElementById("klearhub-visibility-page");
    return Boolean(page && !page.hidden);
  }

  function setVisibilityPageLoading(loading) {
    const page = document.getElementById("klearhub-visibility-page");
    const skeleton = document.getElementById("vis-skeleton");
    const list = document.getElementById("vis-list-shell");
    const pageWasLoading = Boolean(list && list.hidden);
    window.KNVisLoading = Boolean(loading);
    page?.classList.toggle("is-loading", loading);
    if (loading) {
      page?.setAttribute("aria-busy", "true");
      page?.classList.remove("is-ready");
      if (skeleton) {
        skeleton.hidden = false;
      }
      if (list) {
        list.hidden = true;
      }
      return;
    }
    page?.removeAttribute("aria-busy");
    if (skeleton) {
      skeleton.hidden = true;
    }
    if (list) {
      list.hidden = false;
    }
    if (pageWasLoading) {
      page?.classList.add("is-ready");
    }
  }

  function hideDetailDrawerInstant() {
    const root = document.getElementById("kn-detail-drawer");
    if (!root) {
      return;
    }
    window.clearTimeout(closeTimer);
    root.classList.remove("is-open");
    root.hidden = true;
  }

  function stopVisibilityLoading() {
    window.clearTimeout(loadTimer);
    loadToken += 1;
    pendingLoadId = "";
    window.KNVisLoading = false;
    setVisibilityPageLoading(false);
    document.getElementById("kn-detail-page")?.classList.remove("is-skeleton");
  }

  function startVisibilityLoading(mode = "page") {
    window.KNVisLoading = true;
    if (mode === "page") {
      setVisibilityPageLoading(true);
      hideDetailDrawerInstant();
    }
  }

  function renderDetailSkeleton() {
    const root = document.getElementById("kn-detail-page");
    if (!root) {
      return;
    }
    destroyDetailMap();
    root.classList.add("is-skeleton");
    root.setAttribute("aria-busy", "true");
    root.innerHTML = `
      <header class="blade-drawer__header kn-detail-head">
        <span class="skeleton skeleton--icon" style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-medium)"></span>
        <div class="blade-drawer__titles kn-detail-head__copy skeleton-stack">
          <span class="skeleton skeleton--title" style="width: 9.25rem"></span>
          <span class="skeleton skeleton--caption" style="width: 12rem"></span>
        </div>
        <div class="kn-detail-head__actions">
          <span class="skeleton skeleton--btn" style="width: 4.5rem"></span>
          <button class="icon-btn" type="button" id="kn-detail-close" data-kn-detail-close aria-label="Close shipment detail">
            <img src="./assets/quick-actions/close.svg" width="20" height="20" alt="" />
          </button>
        </div>
      </header>
      <div class="kn-detail-tabs kn-detail-skeleton-tabs" aria-hidden="true">
        <span class="skeleton skeleton--btn" style="width: 3.5rem"></span>
        <span class="skeleton skeleton--btn" style="width: 5.5rem"></span>
        <span class="skeleton skeleton--btn" style="width: 4.5rem"></span>
        <span class="skeleton skeleton--btn" style="width: 5.25rem"></span>
        <span class="skeleton skeleton--btn" style="width: 6rem"></span>
        <span class="skeleton skeleton--btn" style="width: 6rem"></span>
      </div>
      <div class="blade-drawer__body kn-detail-panel kn-detail-skeleton-body">
        <div class="skeleton-stack kn-detail-skeleton-body">
          <span class="skeleton skeleton--title" style="width: 8rem"></span>
          <span class="skeleton skeleton--line" style="width: 100%"></span>
          <span class="skeleton skeleton--line" style="width: 92%"></span>
          <span class="skeleton skeleton--line" style="width: 64%"></span>
          <span class="skeleton skeleton--map" style="height: 12rem"></span>
          <span class="skeleton skeleton--row"></span>
          <span class="skeleton skeleton--row"></span>
        </div>
      </div>
      <footer class="blade-drawer__footer kn-detail-footer" aria-hidden="true">
        <span class="skeleton skeleton--btn" style="width: 5rem"></span>
        <span class="skeleton skeleton--btn" style="width: 9rem"></span>
      </footer>
    `;
  }

  function isDetailDrawerOpen() {
    const root = document.getElementById("kn-detail-drawer");
    return Boolean(root && !root.hidden);
  }

  function setShells(open) {
    const root = document.getElementById("kn-detail-drawer");
    if (!root) {
      return;
    }
    window.clearTimeout(closeTimer);
    if (open) {
      const wasHidden = root.hidden;
      if (wasHidden) {
        lastFocus = document.activeElement;
        root.hidden = false;
      }
      window.requestAnimationFrame(() => {
        root.classList.add("is-open");
        if (wasHidden) {
          document.getElementById("kn-detail-close")?.focus();
        }
        detailMap?.invalidateSize();
      });
      return;
    }
    root.classList.remove("is-open");
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
      lastFocus = null;
    }, delay);
  }

  function copyControl(value, label) {
    return `<span class="vis-copy-cluster">
      <button class="icon-btn vis-copy-btn" type="button" data-copy="${escapeHtml(value)}" data-copy-label="${escapeHtml(label)}" aria-label="Copy ${escapeHtml(label)}" data-tooltip="Copy ${escapeHtml(label)}">${MOT_ICONS.copy}</button>
    </span>`;
  }

  function copyableCode(value, label) {
    if (!value) {
      return "";
    }
    return `<span class="vis-copy-cluster kn-journey-id">
      <span class="type-caption-sm kn-journey-id__key">${escapeHtml(label)}</span>
      <button class="code vis-copy-value type-caption-sm" type="button" data-copy="${escapeHtml(value)}" data-copy-label="${escapeHtml(label)}">${escapeHtml(value)}</button>
      ${copyControl(value, label)}
    </span>`;
  }

  function renderDl(rows) {
    return `<dl class="kn-detail-dl">${rows
      .map(
        ([key, value]) => `<div class="kn-detail-dl__row">
        <dt class="type-caption-sm">${escapeHtml(key)}</dt>
        <dd class="type-body-sm type-weight-medium">${value || "—"}</dd>
      </div>`
      )
      .join("")}</dl>`;
  }

  function renderProgress(done, total) {
    const max = Math.max(1, total || 0);
    const pct = Math.round((done / max) * 100);
    return `<div class="kn-progress" aria-label="${done} of ${max} complete">
      <span class="kn-progress__track" aria-hidden="true"><span class="kn-progress__fill" style="width: ${pct}%"></span></span>
      <span class="badge badge--${pct === 100 ? "positive" : pct ? "information" : "neutral"} type-caption-sm type-weight-medium">${pct}%</span>
    </div>`;
  }

  function renderSteps(steps) {
    const done = steps.filter((step) => step.done).length;
    const currentIndex = steps.findIndex((step) => !step.done);
    return `<div class="kn-steps-wrap">
      <div class="kn-steps-wrap__meta">
        <p class="type-caption-sm kn-section-meta">${done} of ${steps.length} complete</p>
        ${renderProgress(done, steps.length)}
      </div>
      <ol class="kn-steps">${steps
        .map((step, index) => {
          const current = index === currentIndex;
          const state = step.done ? "is-done" : current ? "is-current" : "is-pending";
          return `<li class="kn-steps__item ${state}">
        <span class="kn-steps__marker" aria-hidden="true">${step.done ? MOT_ICONS.check : current ? String(index + 1) : ""}</span>
        <div class="kn-steps__copy">
          <div class="kn-steps__title">
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(titleCase(step.title))}</p>
            ${current ? `<span class="badge badge--notice type-caption-sm type-weight-medium">In progress</span>` : ""}
          </div>
          <p class="type-caption-sm">${step.stamp ? escapeHtml(step.stamp) : current ? "Waiting on the next milestone" : "Pending"}</p>
        </div>
      </li>`;
        })
        .join("")}</ol>
    </div>`;
  }

  function journeyKindTone(kind) {
    if (kind === "Destination") {
      return "positive";
    }
    if (kind === "Origin") {
      return "information";
    }
    return "neutral";
  }

  function renderJourneyStops(item) {
    const stops = buildJourneys(item);
    const ordered = journeyDescending ? stops : [...stops].reverse();
    return `<ol class="kn-journey">${ordered
      .map((stop, index) => {
        const events = journeyExpanded || !stop.extra ? stop.events : stop.events.slice(0, 3);
        const more = stop.extra && !journeyExpanded ? `<button class="blade-link type-caption-sm" type="button" data-kn-detail-more>Show ${stop.extra} more events</button>` : "";
        return `<li class="kn-journey__item${stop.highlight ? " is-highlight" : ""}">
          <span class="kn-journey__marker" aria-hidden="true">${MOT_ICONS[item.mot] || MOT_ICONS.air}</span>
          <div class="kn-journey__body">
            <div class="kn-journey__topline">
              <span class="badge badge--${journeyKindTone(stop.kind)} type-caption-sm type-weight-medium">${escapeHtml(stop.kind)}</span>
              <span class="type-caption-sm kn-section-meta">Stop ${index + 1} of ${ordered.length}</span>
            </div>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(stop.place)}</p>
            <dl class="kn-journey__events">${events
              .map(
                (event) => `<div>
                <dt class="type-caption-sm">${escapeHtml(event.label)}</dt>
                <dd class="type-body-sm">${escapeHtml(event.value)}</dd>
              </div>`
              )
              .join("")}</dl>
            ${more}
          </div>
        </li>`;
      })
      .join("")}</ol>`;
  }

  function renderContainerTable(item) {
    if (item.mot === "air" || !item.container) {
      return emptyState(MOT_ICONS.ocean, "No container on this shipment", "Air and some truck moves do not carry an ocean container record.");
    }
    const loadType = item.record === "container" ? "Container" : "FCL";
    const equipment = hashNum(item.id) % 2 ? "40HC" : "20GP";
    const seal = `SEAL${String(hashNum(`${item.id}-seal`) % 900000 + 100000)}`;
    const terminal = item.pouLabel || item.dest.city;
    const lastFree = (item.etaLabel || "—").replace(/^ETA\s+/i, "");
    return `<div class="kn-container">
      <article class="panel card kn-section-card kn-container__hero">
        <header class="kn-section-card__head">
          <div class="kn-container__id">
            <p class="type-caption-sm kn-section-meta">Container number</p>
            ${copyableCode(item.container, "Container number")}
          </div>
          <div class="kn-container__tags">
            <span class="${badgeClass(item.statusTone)}">${escapeHtml(item.status)}</span>
            <span class="badge type-caption-sm type-weight-medium">${escapeHtml(loadType)}</span>
          </div>
        </header>
        <div class="kn-info kn-info--summary kn-info--three">
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Equipment</p>
            <p class="type-ui-sm type-weight-semibold">${equipment}</p>
            <p class="type-caption-sm">ISO dry van</p>
          </div>
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Last free date</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(lastFree)}</p>
            <p class="type-caption-sm">At ${escapeHtml(terminal)}</p>
          </div>
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Carrier</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(CARRIERS[item.mot] || "—")}</p>
            <p class="type-caption-sm">${escapeHtml(MOT_LABELS[item.mot] || item.mot)}</p>
          </div>
        </div>
      </article>
      <div class="kn-detail-grid kn-container__grid">
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head">
            <h3 class="type-heading-h6 type-weight-semibold">Equipment</h3>
          </header>
          ${renderDl([
            ["Container #", codeChip(item.container)],
            ["Load type", escapeHtml(loadType)],
            ["Equipment", equipment],
            ["Seal", codeChip(seal)],
            ["Hazmat", "No"]
          ])}
        </article>
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head">
            <h3 class="type-heading-h6 type-weight-semibold">Location and dates</h3>
          </header>
          ${renderDl([
            ["Delivery", escapeHtml(item.dest.city)],
            ["Terminal", escapeHtml(terminal)],
            ["Last free date", escapeHtml(lastFree)],
            ["Per diem date", "—"],
            ["Ocean carrier", escapeHtml(CARRIERS[item.mot] || "—")]
          ])}
        </article>
      </div>
    </div>`;
  }

  function renderDocuments(item) {
    const docs = buildDocuments(item);
    return `<div class="kn-detail-docs">
      <div class="kn-toolbar">
        <label class="search-input kn-detail-search">
          <span class="search-input__icon">${MOT_ICONS.search}</span>
          <input class="search-input__field type-body-sm" type="search" placeholder="Search files" aria-label="Search documents" data-kn-doc-search />
        </label>
        <p class="type-caption-sm kn-section-meta" data-kn-doc-count>${docs.length} file${docs.length === 1 ? "" : "s"}</p>
      </div>
      <ul class="kn-doc-list" data-kn-doc-list>
        ${docs
          .map(
            (doc) => `<li class="kn-doc" data-kn-doc="${escapeHtml(doc.name.toLowerCase())}">
            <span class="kn-doc__icon" aria-hidden="true">${MOT_ICONS.file}</span>
            <span class="kn-doc__copy">
              <span class="kn-file">
                <strong class="type-ui-sm type-weight-semibold">${escapeHtml(doc.name)}</strong>
                <span class="kn-file__chip badge badge--${doc.tone} type-caption-sm type-weight-medium">${escapeHtml(doc.type)}</span>
              </span>
              <span class="type-caption-sm">Ingested ${escapeHtml(doc.date)}</span>
            </span>
            <button class="icon-btn" type="button" aria-label="View ${escapeHtml(doc.name)}" data-tooltip="View" data-kn-detail-toast="Document preview opens when connected.">${MOT_ICONS.eye}</button>
          </li>`
          )
          .join("")}
      </ul>
      <div class="empty-state vis-empty-state kn-empty" data-kn-doc-empty hidden>
        <span class="empty-state__asset" aria-hidden="true">${MOT_ICONS.search}</span>
        <p class="type-heading-h5 type-weight-semibold">No matching files</p>
        <p class="type-body-sm">Nothing in this shipment matches that search.</p>
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" data-kn-doc-clear>Clear search</button>
      </div>
    </div>`;
  }

  function makeRefField(type, key, label, value = "", extra = {}) {
    return { type, key, label, value: value == null ? "" : String(value), ...extra };
  }

  function makeRefSeries(type, prefix, count, values = {}) {
    const names = { TEXT: "Text", DATE: "Date", NUM: "Number" };
    return Array.from({ length: count }, (_, index) => {
      const key = `${prefix}${index + 1}`;
      const label = `${names[prefix] || prefix} ${index + 1}`;
      return makeRefField(type, `${prefix.toLowerCase()}${index + 1}`, label, values[key] || values[label] || "");
    });
  }

  function invoiceNumber(item, suffix = "001") {
    return `INV-${item.id.replace(/[^A-Z0-9]/g, "").slice(-6)}-${suffix}`;
  }

  function buildRefsCatalog(item) {
    const invoice = invoiceNumber(item);
    const etaDays = String(transitDays(item));
    const etaDate = toInputDate(parsePortDate(item.dest?.date));
    const sku = item.container || `MSKU${String(hashNum(item.id) % 9000000 + 1000000)}`;
    const skuSpare = `SP-${String(hashNum(`${item.id}-sp`) % 900000 + 100000)}`;
    const description = item.mot === "air" ? "QA AUTOMATION" : "Oilfield equipment";
    const merchFields = (text2) => [
      makeRefField("text", "text2", "Description", text2),
      ...makeRefSeries("text", "TEXT", 7).slice(2),
      makeRefField("text", "text10", "Notes", "", { multiline: true }),
      ...makeRefSeries("date", "DATE", 7),
      ...makeRefSeries("number", "NUM", 7)
    ];
    return {
      shipment: {
        id: "shipment",
        fields: [
          makeRefField("text", "invoiceno", "Invoice No", invoice),
          makeRefField("text", "text2", "PO number", item.po || ""),
          makeRefField("text", "text3", "Text 3"),
          makeRefField("text", "text4", "Text 4"),
          makeRefField("text", "text5", "Text 5"),
          makeRefField("text", "phone", "Phone"),
          makeRefField("text", "text7", "Text 7"),
          makeRefField("text", "text8", "Text 8"),
          makeRefField("text", "test", "Test field"),
          makeRefField("text", "text10", "Notes", "", { multiline: true }),
          ...makeRefSeries("date", "DATE", 9, { DATE1: etaDate }),
          makeRefField("number", "num1", "Number 1"),
          makeRefField("number", "eta", "Transit days", etaDays),
          ...Array.from({ length: 7 }, (_, index) => makeRefField("number", `num${index + 3}`, `Number ${index + 3}`))
        ]
      },
      invoices: [
        {
          id: invoice,
          invoice,
          fields: [
            ...makeRefSeries("text", "TEXT", 8),
            makeRefField("text", "text10", "Notes", "", { multiline: true }),
            ...makeRefSeries("date", "DATE", 8, { DATE1: etaDate }),
            ...makeRefSeries("number", "NUM", 8)
          ]
        }
      ],
      merchandise: [
        {
          id: `J${String(hashNum(item.id) % 900000 + 100000)}`,
          sku,
          invoice,
          fields: merchFields(description)
        },
        {
          id: `J${String(hashNum(`${item.id}-b`) % 900000 + 100000)}`,
          sku: skuSpare,
          invoice,
          fields: merchFields("Spare parts")
        }
      ]
    };
  }

  function ensureRefsState(item) {
    if (refsUi.shipmentId === item.id && refsUi.catalog) {
      return;
    }
    if (refsUi.shipmentId && refsUi.shipmentId !== item.id) {
      persistRefsDraft({ immediate: true });
    }
    const published = buildRefsCatalog(item);
    const stored = loadRefsDraft(item.id);
    refsUi = {
      shipmentId: item.id,
      scope: "shipment",
      type: "all",
      query: "",
      showUnused: false,
      catalog: stored ? stored.catalog : cloneRefs(published),
      saved: published,
      draftSavedAt: stored?.savedAt || "",
      selectOpen: ""
    };
  }

  function resetRefsState() {
    window.clearTimeout(refsDraftTimer);
    refsDraftTimer = 0;
    refsDraftSaving = false;
    refsUi = {
      shipmentId: "",
      scope: "shipment",
      type: "all",
      query: "",
      showUnused: false,
      catalog: null,
      saved: null,
      draftSavedAt: "",
      selectOpen: ""
    };
  }

  function activeRefRecords() {
    if (refsUi.scope === "invoice") {
      return refsUi.catalog.invoices;
    }
    if (refsUi.scope === "merchandise") {
      return refsUi.catalog.merchandise;
    }
    return [refsUi.catalog.shipment];
  }

  function findRefField(recordId, key) {
    const record = [
      refsUi.catalog.shipment,
      ...refsUi.catalog.invoices,
      ...refsUi.catalog.merchandise
    ].find((row) => row.id === recordId);
    return record?.fields.find((field) => field.key === key);
  }

  function groupRefFields(fields) {
    return [
      { type: "text", title: "Text", items: fields.filter((field) => field.type === "text" && !field.multiline) },
      { type: "text", title: "Notes", items: fields.filter((field) => field.multiline) },
      { type: "date", title: "Date", items: fields.filter((field) => field.type === "date") },
      { type: "number", title: "Numeric", items: fields.filter((field) => field.type === "number") }
    ].filter((group) => group.items.length);
  }

  function renderRefField(field, recordId) {
    const id = `kn-ref-${recordId}-${field.key}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    const search = `${field.label} ${field.value}`.toLowerCase();
    const type = field.type === "date" ? "date" : field.key === "phone" ? "tel" : "text";
    const placeholder =
      field.type === "date" ? "" : field.type === "number" ? "0" : field.key === "phone" ? "Enter phone" : "Enter value";
    const inputMode = field.type === "number" ? ' inputmode="decimal"' : field.key === "phone" ? ' inputmode="tel"' : "";
    const control = field.multiline
      ? `<textarea class="blade-field__control kn-detail-textarea type-body-sm" id="${id}" rows="4" placeholder="Add a note" autocomplete="off" aria-labelledby="${id}-name" data-kn-ref-value data-kn-ref-key="${escapeHtml(field.key)}" data-kn-ref-record="${escapeHtml(recordId)}">${escapeHtml(field.value)}</textarea>`
      : `<input class="blade-field__control type-body-sm" id="${id}" type="${type}"${inputMode} placeholder="${placeholder}" value="${escapeHtml(field.value)}" autocomplete="off" spellcheck="false" aria-labelledby="${id}-name" data-kn-ref-value data-kn-ref-key="${escapeHtml(field.key)}" data-kn-ref-record="${escapeHtml(recordId)}" />`;
    return `<div class="blade-field${field.multiline ? " kn-detail-field--wide" : ""}" data-kn-ref-field data-kn-ref-type="${field.type}" data-kn-ref-vacant="${field.value ? "false" : "true"}" data-kn-ref-search="${escapeHtml(search)}">
      <div class="blade-field__head">
        <label class="blade-field__label type-caption-sm type-weight-medium" for="${id}-name">
          <input id="${id}-name" class="kn-ref-label__input type-caption-sm type-weight-medium" tabindex="-1" data-kn-ref-rename data-kn-ref-key="${escapeHtml(field.key)}" data-kn-ref-record="${escapeHtml(recordId)}" value="${escapeHtml(field.label)}" aria-label="Field name, ${escapeHtml(field.label)}. Click to rename." />
        </label>
        <button class="icon-btn kn-ref-rename-btn" type="button" data-kn-ref-rename-btn data-tooltip="Rename field" aria-label="Rename ${escapeHtml(field.label)}">${MOT_ICONS.edit}</button>
      </div>
      ${control}
    </div>`;
  }

  function renderRefGroups(fields, recordId) {
    const sections = groupRefFields(fields)
      .map(
        (group) => `<section class="kn-refs__block" data-kn-ref-section data-kn-ref-type="${group.type}">
        <h3 class="type-caption-sm type-weight-semibold">${escapeHtml(group.title)}</h3>
        <div class="kn-refs__grid${group.items.some((field) => field.multiline) ? " kn-refs__grid--notes" : ""}">
          ${group.items.map((field) => renderRefField(field, recordId)).join("")}
        </div>
      </section>`
      )
      .join("");
    return `<div class="kn-refs__stack">${sections}</div>`;
  }

  function renderRefCard(record) {
    const isMerch = Boolean(record.sku);
    const isInvoice = Boolean(record.invoice) && !isMerch;
    const title = isMerch ? record.sku : isInvoice ? record.invoice : refsUi.shipmentId;
    const subtitle = isMerch
      ? `${escapeHtml(record.id)} · ${escapeHtml(record.invoice)}`
      : isInvoice
        ? "Invoice references"
        : "Shipment references";
    const trailing = isMerch
      ? `<span class="badge badge--information type-caption-sm type-weight-medium">SKU</span>`
      : `<span class="code type-caption-sm">${escapeHtml(isInvoice ? record.invoice : refsUi.shipmentId)}</span>`;
    return `<article class="panel card kn-refs__card" data-kn-ref-card>
            <header class="kn-refs__card-head">
              <div>
                <p class="type-ui-sm type-weight-semibold">${escapeHtml(title)}</p>
                <p class="type-caption-sm">${subtitle}</p>
              </div>
              ${trailing}
            </header>
            ${renderRefGroups(record.fields, record.id)}
          </article>`;
  }

  function applyRefsFilter() {
    const root = document.getElementById("kn-refs");
    if (!root) {
      return;
    }
    const query = refsUi.query.trim().toLowerCase();
    const type = refsUi.type;
    const searching = Boolean(query);
    const filtered = Boolean(query || type !== "all");
    let visible = 0;
    let filled = 0;
    let unused = 0;
    root.querySelectorAll("[data-kn-ref-field]").forEach((el) => {
      const value = el.querySelector("[data-kn-ref-value]")?.value || "";
      const label = el.querySelector("[data-kn-ref-rename]")?.value || "";
      const vacant = !String(value).trim();
      const hay = `${label} ${value} ${el.getAttribute("data-kn-ref-search") || ""}`.toLowerCase();
      const matchType = type === "all" || el.getAttribute("data-kn-ref-type") === type;
      const matchQuery = !query || hay.includes(query);
      const matchFilled = refsUi.showUnused || !vacant || searching;
      const show = matchType && matchQuery && matchFilled;
      el.hidden = !show;
      if (vacant) {
        unused += 1;
      } else {
        filled += 1;
      }
      if (show) {
        visible += 1;
      }
    });
    root.querySelectorAll("[data-kn-ref-section]").forEach((section) => {
      section.hidden = ![...section.querySelectorAll("[data-kn-ref-field]")].some((el) => !el.hidden);
    });
    root.querySelectorAll("[data-kn-ref-card]").forEach((card) => {
      card.hidden = ![...card.querySelectorAll("[data-kn-ref-field]")].some((el) => !el.hidden);
    });
    const empty = root.querySelector("[data-kn-ref-empty-state]");
    const form = root.querySelector("[data-kn-ref-form]");
    if (empty) {
      empty.hidden = visible > 0;
      const title = empty.querySelector("[data-kn-ref-empty-title]");
      const copy = empty.querySelector("[data-kn-ref-empty-copy]");
      const clear = empty.querySelector("[data-kn-ref-clear-filters]");
      const reveal = empty.querySelector("[data-kn-ref-show-empty]");
      if (title) {
        title.textContent = filtered ? "No matching references" : "No filled fields";
      }
      if (copy) {
        copy.textContent = searching
          ? "Nothing in this set matches that search."
          : "Turn on Empty fields to add PO numbers, dates, and notes.";
      }
      if (clear) {
        clear.hidden = !searching;
      }
      if (reveal) {
        reveal.hidden = unused === 0 || refsUi.showUnused || searching;
      }
    }
    if (form) {
      form.hidden = visible === 0;
    }
    const count = root.querySelector("[data-kn-ref-count]");
    if (count) {
      count.textContent = filtered
        ? `${visible} matching`
        : `${filled} filled · ${unused} empty`;
    }
    const unusedSwitch = root.querySelector("[data-kn-ref-unused]");
    const unusedWrap = root.querySelector("[data-kn-ref-unused-wrap]");
    if (unusedSwitch) {
      unusedSwitch.checked = refsUi.showUnused;
      unusedSwitch.disabled = unused === 0;
    }
    if (unusedWrap) {
      unusedWrap.hidden = unused === 0;
    }
  }

  function refsRoot() {
    return document.getElementById("kn-refs");
  }

  function isRefsFieldShown(field) {
    return Boolean(
      field &&
        !field.hidden &&
        !field.closest("[data-kn-ref-section][hidden], [data-kn-ref-card][hidden], [data-kn-ref-form][hidden]")
    );
  }

  function refsValueControls(root = refsRoot()) {
    if (!root) {
      return [];
    }
    return [...root.querySelectorAll("[data-kn-ref-field]")]
      .filter(isRefsFieldShown)
      .map((field) => field.querySelector("[data-kn-ref-value]"))
      .filter(Boolean);
  }

  function refFieldOf(el) {
    return el?.closest?.("[data-kn-ref-field]");
  }

  function markActiveRefField(field) {
    refsRoot()
      ?.querySelectorAll("[data-kn-ref-field].is-active")
      .forEach((el) => el.classList.remove("is-active"));
    field?.classList.add("is-active");
  }

  function focusRefValue(control, { select = true, scroll = true } = {}) {
    if (!control) {
      return;
    }
    control.focus({ preventScroll: !scroll });
    if (scroll) {
      control.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    markActiveRefField(refFieldOf(control));
    if (select && control.select && control.type !== "date" && control.tagName !== "TEXTAREA") {
      control.select();
    }
  }

  function resetRefsPanelScroll() {
    const panel = document.getElementById("kn-detail-panel");
    if (!panel) {
      return;
    }
    panel.scrollTop = 0;
    requestAnimationFrame(() => {
      panel.scrollTop = 0;
    });
  }

  function findRefControl(record, key, part = "value") {
    const root = refsRoot();
    if (!root || !record || !key) {
      return null;
    }
    const attr = part === "label" ? "data-kn-ref-rename" : "data-kn-ref-value";
    return root.querySelector(`[${attr}][data-kn-ref-record="${CSS.escape(record)}"][data-kn-ref-key="${CSS.escape(key)}"]`);
  }

  function syncRefScopeTabs() {
    refsRoot()
      ?.querySelectorAll("[data-kn-ref-scope]")
      .forEach((tab) => {
        tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      });
  }

  function gridColumns(grid) {
    const spec = getComputedStyle(grid).gridTemplateColumns;
    return spec.split(" ").filter(Boolean).length || 1;
  }

  function shownGridFields(grid) {
    return [...grid.querySelectorAll(":scope > [data-kn-ref-field]")].filter(isRefsFieldShown);
  }

  function moveRefCell(control, direction) {
    const field = refFieldOf(control);
    const root = refsRoot();
    if (!field || !root) {
      return null;
    }
    const values = refsValueControls(root);
    const flatIndex = values.indexOf(control);
    if (direction === "next") {
      return values[flatIndex + 1] || null;
    }
    if (direction === "prev") {
      return values[flatIndex - 1] || null;
    }
    const grid = field.closest(".kn-refs__grid");
    const grids = [...root.querySelectorAll(".kn-refs__grid")].filter((entry) => !entry.closest("[hidden]"));
    const gridIndex = grids.indexOf(grid);
    const cells = shownGridFields(grid);
    const index = cells.indexOf(field);
    const cols = gridColumns(grid);
    const col = index % cols;
    if (direction === "left") {
      if (index > 0) {
        return cells[index - 1].querySelector("[data-kn-ref-value]");
      }
      const prevGrid = grids[gridIndex - 1];
      const prevCells = prevGrid ? shownGridFields(prevGrid) : [];
      return prevCells.at(-1)?.querySelector("[data-kn-ref-value]") || values[flatIndex - 1] || null;
    }
    if (direction === "right") {
      if (index < cells.length - 1) {
        return cells[index + 1].querySelector("[data-kn-ref-value]");
      }
      const nextGrid = grids[gridIndex + 1];
      const nextCells = nextGrid ? shownGridFields(nextGrid) : [];
      return nextCells[0]?.querySelector("[data-kn-ref-value]") || values[flatIndex + 1] || null;
    }
    const delta = direction === "up" ? -1 : 1;
    const nextIndex = index + delta * cols;
    if (nextIndex >= 0 && nextIndex < cells.length) {
      return cells[nextIndex].querySelector("[data-kn-ref-value]");
    }
    const neighbor = grids[gridIndex + delta];
    if (!neighbor) {
      return delta > 0 ? values[flatIndex + 1] : values[flatIndex - 1];
    }
    const neighborCells = shownGridFields(neighbor);
    const neighborCols = gridColumns(neighbor);
    const target =
      delta > 0
        ? neighborCells[Math.min(col, neighborCols - 1)]
        : neighborCells[Math.min(Math.floor((neighborCells.length - 1) / neighborCols) * neighborCols + col, neighborCells.length - 1)];
    return target?.querySelector("[data-kn-ref-value]") || null;
  }

  function caretAtEdge(el, edge) {
    if (!el || el.type === "date") {
      return false;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start !== end) {
      return false;
    }
    if (edge === "start") {
      return start === 0;
    }
    return end === String(el.value || "").length;
  }

  function revealUnusedThen(focus = "first-empty") {
    if (!refsUi.showUnused) {
      refsUi.showUnused = true;
      const unusedSwitch = refsRoot()?.querySelector("[data-kn-ref-unused]");
      if (unusedSwitch) {
        unusedSwitch.checked = true;
      }
      applyRefsFilter();
    }
    if (focus === "first-empty") {
      focusRefValue(refsValueControls().find((el) => !String(el.value || "").trim()) || refsValueControls()[0]);
    }
    return true;
  }

  function saveReferences() {
    persistRefsDraft({ immediate: true });
    if (refsAreDirty()) {
      toast("Draft saved.", "positive");
    }
  }

  function discardRefsDraft() {
    if (!refsUi.saved) {
      return;
    }
    window.clearTimeout(refsDraftTimer);
    refsDraftTimer = 0;
    refsDraftSaving = false;
    refsUi.catalog = cloneRefs(refsUi.saved);
    refsUi.draftSavedAt = "";
    clearRefsDraft(refsUi.shipmentId);
    refreshRefsView({ focus: "first" });
    toast("Draft discarded.");
  }

  function startRefRename(control) {
    const field = refFieldOf(control);
    const rename = field?.querySelector("[data-kn-ref-rename]");
    if (!rename) {
      return;
    }
    rename.tabIndex = 0;
    rename.dataset.original = rename.value;
    field.classList.add("is-renaming");
    rename.focus();
    rename.select();
    markActiveRefField(field);
  }

  function endRefRename(rename, { restore = false } = {}) {
    if (!rename) {
      return;
    }
    if (restore && rename.dataset.original != null) {
      rename.value = rename.dataset.original;
      const field = findRefField(rename.getAttribute("data-kn-ref-record"), rename.getAttribute("data-kn-ref-key"));
      if (field) {
        field.label = rename.value;
      }
      syncRefsFooter();
      persistRefsDraft({ immediate: true });
    }
    rename.tabIndex = -1;
    delete rename.dataset.original;
    rename.closest("[data-kn-ref-field]")?.classList.remove("is-renaming");
    const value = findRefControl(rename.getAttribute("data-kn-ref-record"), rename.getAttribute("data-kn-ref-key"), "value");
    focusRefValue(value, { select: false });
  }

  function refsSaveChord() {
    return /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘S" : "Ctrl+S";
  }

  function handleRefsKeydown(event) {
    const root = refsRoot();
    if (!root || visState.detailTab !== "references" || event.isComposing) {
      return;
    }
    const saveKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
    if (saveKey) {
      event.preventDefault();
      saveReferences();
      return;
    }
    const findKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
    if (findKey) {
      event.preventDefault();
      root.querySelector("[data-kn-ref-query]")?.focus();
      return;
    }
    if (event.altKey && ["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      refsUi.scope = REF_SCOPES[Number(event.key) - 1].id;
      refreshRefsView({ focus: "first" });
      return;
    }
    const scopeTab = event.target.closest("[data-kn-ref-scope]");
    if (scopeTab && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const index = REF_SCOPES.findIndex((scope) => scope.id === refsUi.scope);
      const next = event.key === "ArrowRight" ? Math.min(REF_SCOPES.length - 1, index + 1) : Math.max(0, index - 1);
      refsUi.scope = REF_SCOPES[next].id;
      refreshRefsView({ focus: "first" });
      return;
    }
    const rename = event.target.closest("[data-kn-ref-rename]");
    if (rename) {
      if (event.key === "Enter") {
        event.preventDefault();
        endRefRename(rename);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        endRefRename(rename, { restore: true });
      }
      return;
    }
    if (event.target.matches("[data-kn-ref-query]") && (event.key === "Enter" || event.key === "ArrowDown")) {
      event.preventDefault();
      focusRefValue(refsValueControls()[0]);
      return;
    }
    const value = event.target.closest("[data-kn-ref-value]");
    if (!value) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      value.blur();
      return;
    }
    const isTextArea = value.tagName === "TEXTAREA";
    if (event.key === "F2") {
      event.preventDefault();
      startRefRename(value);
      return;
    }
    if (event.key === "Enter" && !isTextArea) {
      event.preventDefault();
      const next = event.shiftKey ? moveRefCell(value, "up") : moveRefCell(value, "down");
      if (next) {
        focusRefValue(next);
        return;
      }
      if (!event.shiftKey) {
        revealUnusedThen("first-empty");
      }
      return;
    }
    if (event.key === "Enter" && isTextArea && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const next = moveRefCell(value, "down");
      if (next) {
        focusRefValue(next);
      } else {
        revealUnusedThen("first-empty");
      }
      return;
    }
    if (event.key === "Tab") {
      const next = moveRefCell(value, event.shiftKey ? "prev" : "next");
      if (next) {
        event.preventDefault();
        focusRefValue(next);
        return;
      }
      if (!event.shiftKey && !refsUi.showUnused) {
        event.preventDefault();
        revealUnusedThen("first-empty");
      }
      return;
    }
    if (event.key === "ArrowDown" && (!isTextArea || caretAtEdge(value, "end")) && value.type !== "date") {
      const next = moveRefCell(value, "down");
      if (next) {
        event.preventDefault();
        focusRefValue(next);
      } else if (!refsUi.showUnused) {
        event.preventDefault();
        revealUnusedThen("first-empty");
      }
      return;
    }
    if (event.key === "ArrowUp" && (!isTextArea || caretAtEdge(value, "start")) && value.type !== "date") {
      const next = moveRefCell(value, "up");
      if (next) {
        event.preventDefault();
        focusRefValue(next);
      }
      return;
    }
    if (event.key === "ArrowRight" && caretAtEdge(value, "end") && value.type !== "date") {
      const next = moveRefCell(value, "right");
      if (next) {
        event.preventDefault();
        focusRefValue(next);
      }
      return;
    }
    if (event.key === "ArrowLeft" && caretAtEdge(value, "start") && value.type !== "date") {
      const next = moveRefCell(value, "left");
      if (next) {
        event.preventDefault();
        focusRefValue(next);
      }
    }
  }

  function refreshRefsView(opts = {}) {
    const item = findShipment(refsUi.shipmentId);
    const panel = document.getElementById("kn-detail-panel");
    if (!item || !panel || visState.detailTab !== "references") {
      return;
    }
    panel.innerHTML = renderReferences(item);
    applyRefsFilter();
    syncRefsFooter();
    syncRefScopeTabs();
    resetRefsPanelScroll();
    if (opts.focus === "first-empty") {
      focusRefValue(refsValueControls().find((el) => !String(el.value || "").trim()) || refsValueControls()[0], { scroll: false });
      return;
    }
    if (opts.focus === "first") {
      focusRefValue(refsValueControls()[0], { scroll: false });
      return;
    }
    if (opts.record && opts.key) {
      focusRefValue(findRefControl(opts.record, opts.key, opts.part || "value"), { select: opts.select !== false });
    }
  }

  function syncRefsFooter() {
    const footer = document.querySelector("#kn-detail-page .kn-detail-footer");
    if (!footer || visState.detailTab !== "references") {
      return;
    }
    const dirty = refsAreDirty();
    const meta = footer.querySelector(".kn-detail-footer__meta");
    if (meta) {
      meta.textContent = refsDraftLabel();
    }
    footer.querySelector("[data-kn-ref-reset]")?.toggleAttribute("disabled", !dirty);
  }

  function renderRefTypeSelect() {
    return window.KNAdminUX.select({
      id: "kn-ref-type",
      name: "refType",
      value: refsUi.type,
      options: REF_TYPES,
      placeholder: "All",
      openKey: "refType",
      open: refsUi.selectOpen,
      compact: true,
      includeEmpty: false
    });
  }

  function patchRefTypeSelect() {
    const wrap = refsRoot()?.querySelector("[data-kn-ref-type-wrap]");
    if (wrap) {
      wrap.innerHTML = renderRefTypeSelect();
    }
  }

  function renderReferences(item) {
    ensureRefsState(item);
    const records = activeRefRecords();
    const scopeMeta =
      refsUi.scope === "invoice"
        ? `${refsUi.catalog.invoices.length} invoice`
        : refsUi.scope === "merchandise"
          ? `${refsUi.catalog.merchandise.length} SKUs`
          : "Shipment-level fields";
    const cards = `<div class="kn-refs__cards" data-kn-ref-form>${records.map(renderRefCard).join("")}</div>`;
    return `<div class="kn-refs" id="kn-refs" aria-describedby="kn-refs-hint">
      <div class="kn-refs__toolbar">
        <div class="kh-tabs kn-refs__scopes" role="tablist" aria-label="Reference set">
          ${REF_SCOPES.map(
            (scope) => `<button
              class="btn ${scope.id === refsUi.scope ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm"
              type="button"
              role="tab"
              aria-selected="${scope.id === refsUi.scope}"
              data-kn-ref-scope="${scope.id}"
            >${escapeHtml(scope.label)}</button>`
          ).join("")}
        </div>
        <div class="kn-refs__toolbar-end">
          <p class="type-caption-sm kn-refs__meta"><span data-kn-ref-count></span> · ${escapeHtml(scopeMeta)}</p>
          <label class="kn-order kn-refs__empty-toggle" data-kn-ref-unused-wrap>
            <span class="type-caption-sm">Empty fields</span>
            <span class="blade-switch">
              <input type="checkbox" role="switch" data-kn-ref-unused ${refsUi.showUnused ? "checked" : ""} aria-label="Show empty fields" />
              <span class="blade-switch__ui"></span>
            </span>
          </label>
        </div>
      </div>
      <div class="kn-ref-search">
        <label class="kn-ref-search__type" data-kn-ref-type-wrap>
          <span class="visually-hidden">Reference type</span>
          ${renderRefTypeSelect()}
        </label>
        <span class="kn-ref-search__rule" aria-hidden="true"></span>
        <label class="search-input kn-ref-search__input">
          <span class="search-input__icon">${MOT_ICONS.search}</span>
          <input class="search-input__field type-body-sm" type="search" placeholder="Search references..." aria-label="Search references" value="${escapeHtml(refsUi.query)}" data-kn-ref-query />
        </label>
      </div>
      <p class="visually-hidden" id="kn-refs-hint">Tab moves between values. Click a field name or the pencil to rename. Edits save as a draft. ${refsSaveChord()} saves the draft now.</p>
      ${cards}
      <div class="empty-state vis-empty-state" data-kn-ref-empty-state hidden>
        <span class="empty-state__asset" aria-hidden="true">${MOT_ICONS.search}</span>
        <p class="type-heading-h5 type-weight-semibold" data-kn-ref-empty-title>No matching references</p>
        <p class="type-body-sm" data-kn-ref-empty-copy>Nothing in this set matches that search.</p>
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" data-kn-ref-clear-filters>Clear search</button>
        <button class="btn btn--secondary btn--sm type-ui-sm" type="button" data-kn-ref-show-empty hidden>Show empty fields</button>
      </div>
    </div>`;
  }

  function renderFooter(item, tab) {
    if (tab === "references") {
      const dirty = refsAreDirty();
      const vis = isOnVisibility();
      const list = detailList(item.id);
      const canPage = list.length > 1;
      return `<footer class="blade-drawer__footer kn-detail-footer kn-refs-footer">
        <p class="type-caption-sm kn-detail-footer__meta" aria-live="polite">${refsDraftLabel()}</p>
        <div class="blade-drawer__footer-actions">
          <button class="btn btn--tertiary btn--md type-ui-md" type="button" data-kn-ref-reset ${dirty ? "" : "disabled"}>Discard draft</button>
          ${
            vis
              ? `<button class="btn btn--secondary btn--md type-ui-md" type="button" data-copy="${escapeHtml(item.id)}" data-copy-label="Shipment ID">Copy ID</button>
          <button class="btn btn--primary btn--md type-ui-md" type="button" data-kn-detail-next ${canPage ? "" : "disabled"}>Next</button>`
              : ""
          }
        </div>
      </footer>`;
    }
    if (tab === "documents") {
      return `<footer class="blade-drawer__footer kn-detail-footer">
        <div class="blade-drawer__footer-actions kn-detail-footer__split">
          ${disabledControl(`<button class="btn btn--tertiary btn--md type-ui-md" type="button" disabled>Download</button>`, "Download is not connected yet.")}
          ${disabledControl(`<button class="btn btn--primary btn--md type-ui-md" type="button" disabled>${MOT_ICONS.plus} Add documents</button>`, "Add documents is not connected yet.")}
        </div>
      </footer>`;
    }
    if (isOnVisibility()) {
      const list = detailList(item.id);
      const canPage = list.length > 1;
      return `<footer class="blade-drawer__footer kn-detail-footer">
        <p class="type-caption-sm kn-detail-footer__meta">${escapeHtml(item.id)}</p>
        <div class="blade-drawer__footer-actions">
          <button class="btn btn--secondary btn--md type-ui-md" type="button" data-copy="${escapeHtml(item.id)}" data-copy-label="Shipment ID">Copy ID</button>
          <button class="btn btn--primary btn--md type-ui-md" type="button" data-kn-detail-next ${canPage ? "" : "disabled"}>Next</button>
        </div>
      </footer>`;
    }
    return `<footer class="blade-drawer__footer kn-detail-footer">
      <div class="blade-drawer__footer-actions">
        <a class="btn btn--primary btn--md type-ui-md" href="#klearhub-visibility" data-vis-open='{}' data-kn-detail-keep>Open in Visibility</a>
      </div>
    </footer>`;
  }

  function renderPanel(item, tab) {
    const activities = buildActivities(item);
    const lastEvent = `Destination schedule arrival updated`;
    if (tab === "activities") {
      const current = activities.find((step) => !step.done);
      const latest = [...activities].reverse().find((step) => step.done);
      return `<div class="kn-activity">
        <div class="kn-info kn-info--summary kn-info--two">
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Latest completed</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(titleCase(latest?.title || lastEvent))}</p>
            <p class="type-caption-sm">${latest?.stamp ? escapeHtml(latest.stamp) : "No timestamp yet"}</p>
          </div>
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Next milestone</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(titleCase(current?.title || "Shipment complete"))}</p>
            <p class="type-caption-sm">${current ? "In progress" : "All milestones complete"}</p>
          </div>
        </div>
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head">
            <h3 class="type-heading-h6 type-weight-semibold">Shipment timeline</h3>
          </header>
          ${renderSteps(activities)}
        </article>
      </div>`;
    }
    if (tab === "journeys") {
      const bill = item.masterBill || item.mbol || "";
      const stops = buildJourneys(item);
      return `<div class="kn-journey-page">
        <div class="kn-info kn-info--summary kn-info--two">
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Origin</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(item.polLabel || item.origin.city)}</p>
            <p class="type-caption-sm">${escapeHtml((item.etdLabel || item.origin.date || "").replace(/^ETD\s+/i, "") || "—")}</p>
          </div>
          <div class="kn-info__item">
            <p class="type-caption-sm kn-info__key">Destination</p>
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(item.pouLabel || item.dest.city)}</p>
            <p class="type-caption-sm">${escapeHtml((item.etaLabel || item.dest.date || "").replace(/^ETA\s+/i, "") || "—")}</p>
          </div>
        </div>
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head kn-journey-head">
            <div class="kn-journey-head__lead">
              <div class="kn-journey-title">
                <h3 class="type-heading-h6 type-weight-semibold">Master journey</h3>
                ${copyableCode(bill, "Master bill")}
              </div>
              <p class="type-caption-sm kn-section-meta">${stops.length} stops · Last update ${escapeHtml(formatStamp(item.created).replace(/ \d{2}:\d{2}:\d{2}$/, ""))} · ${escapeHtml(lastEvent)}</p>
            </div>
            <label class="kn-order">
              <span class="type-caption-sm">Newest first</span>
              <span class="blade-switch">
                <input type="checkbox" role="switch" ${journeyDescending ? "checked" : ""} data-kn-journey-order aria-label="Order journeys newest first" />
                <span class="blade-switch__ui"></span>
              </span>
            </label>
          </header>
          ${renderJourneyStops(item)}
        </article>
      </div>`;
    }
    if (tab === "container") {
      return renderContainerTable(item);
    }
    if (tab === "documents") {
      return renderDocuments(item);
    }
    if (tab === "references") {
      return renderReferences(item);
    }

    const invoice = `INV-${item.id.replace(/[^A-Z0-9]/g, "").slice(-6)}-001`;
    const po = item.po || "—";
    const description = item.mot === "air" ? "Air cargo" : "Oilfield equipment";
    const originDate = (item.etdLabel || item.origin.date || "").replace(/^ETD\s+/i, "");
    const destDate = (item.etaLabel || item.dest.date || "").replace(/^ETA\s+/i, "");
    return `
      <div class="kn-info kn-info--summary">
        <div class="kn-info__item">
          <p class="type-caption-sm kn-info__key">Origin</p>
          <p class="type-ui-sm type-weight-semibold">${escapeHtml(item.polLabel || item.origin.city)}</p>
          <p class="type-caption-sm">ETD ${escapeHtml(originDate)}</p>
        </div>
        <div class="kn-info__item">
          <p class="type-caption-sm kn-info__key">Destination</p>
          <p class="type-ui-sm type-weight-semibold">${escapeHtml(item.pouLabel || item.dest.city)}</p>
          <p class="type-caption-sm">ETA ${escapeHtml(destDate)}</p>
        </div>
        <div class="kn-info__item">
          <p class="type-caption-sm kn-info__key">Mode</p>
          <p class="type-ui-sm type-weight-semibold">${escapeHtml(MOT_LABELS[item.mot] || item.mot)}</p>
          <p class="type-caption-sm">${escapeHtml(item.direction || "—")}</p>
        </div>
        <div class="kn-info__item">
          <p class="type-caption-sm kn-info__key">Country</p>
          <p class="type-ui-sm type-weight-semibold">${escapeHtml(item.destCountry || item.dest.countryCode || "—")}</p>
          <p class="type-caption-sm">${transitDays(item)} day transit</p>
        </div>
      </div>
      <div class="kn-detail-grid">
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head">
            <h2 class="type-heading-h5 type-weight-semibold">Shipment information</h2>
          </header>
          ${renderDl(
            [
              item.status === "On Hold" ? null : ["Entry number", codeChip(`ENT-${String(hashNum(item.id) % 9000000 + 1000000)}`)],
              ["Purchase order", escapeHtml(po)],
              ["Shipper", escapeHtml(item.company)],
              ["Importer", escapeHtml(item.company)],
              ["Description", escapeHtml(description)],
              ["Invoice", codeChip(invoice)],
              item.container ? ["Container", codeChip(item.container)] : null
            ].filter(Boolean)
          )}
        </article>
        <article class="panel card kn-section-card">
          <header class="kn-section-card__head">
            <h2 class="type-heading-h5 type-weight-semibold">Bills of lading</h2>
          </header>
          ${renderDl(
            [
              ["Master bill", codeChip(item.masterBill || item.mbol)],
              item.hbol ? ["House bill", codeChip(item.hbol)] : null,
              ["Transit time", `${transitDays(item)} days`],
              ["Carrier", escapeHtml(CARRIERS[item.mot] || "—")]
            ].filter(Boolean)
          )}
        </article>
        <article class="panel card kn-detail-map-card kn-section-card" id="kn-detail-map-panel">
          <header class="kn-section-card__head">
            <h2 class="type-heading-h5 type-weight-semibold">Route</h2>
            <button class="blade-link type-ui-sm" type="button" id="kn-detail-map-expand">Expand map</button>
          </header>
          <div class="kn-detail-map" id="kn-detail-map" role="img" aria-label="Shipment route map"></div>
        </article>
      </div>`;
  }

  function destroyDetailMap() {
    if (detailMap) {
      detailMap.remove();
      detailMap = null;
      detailMapLayer = null;
    }
  }

  function initDetailMap(item) {
    const el = document.getElementById("kn-detail-map");
    if (!el || typeof L === "undefined" || typeof createConstrainedMap !== "function") {
      return;
    }
    destroyDetailMap();
    const origin = coordsFor(item.origin);
    const dest = coordsFor(item.dest);
    const current = [item.lat, item.lng];
    detailMap = createConstrainedMap(el);
    detailMapLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", mapTileOptions({
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd"
    })).addTo(detailMap);
    const route = knMapRouteColor();
    const fill = knThemeColor("--kn-color-background-interactive-staticWhite-default", "#fff");
    const line = L.polyline([origin, current, dest], {
      color: route,
      weight: 2,
      opacity: 0.85
    }).addTo(detailMap);
    L.circleMarker(origin, { radius: 5, color: route, fillColor: fill, fillOpacity: 1, weight: 2 }).addTo(detailMap);
    L.circleMarker(dest, { radius: 5, color: route, fillColor: route, fillOpacity: 1, weight: 2 }).addTo(detailMap);
    if (window.KNMapUx) {
      const marker = L.marker(current, {
        icon: window.KNMapUx.createPillIcon({
          id: item.id,
          kind: item.mot === "ocean" ? "ship" : item.mot,
          mot: item.mot,
          status: item.status,
          statusTone: item.statusTone
        }),
        interactive: false
      });
      marker.addTo(detailMap);
    }
    requestAnimationFrame(() => {
      detailMap.invalidateSize();
      fitMapToPoints(detailMap, [origin, current, dest]);
      line.redraw();
    });

    const panel = document.getElementById("kn-detail-map-panel");
    const expand = document.getElementById("kn-detail-map-expand");
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    expand?.addEventListener("click", () => {
      if (!panel) {
        return;
      }
      if (fullscreenElement() === panel) {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        return;
      }
      panel.requestFullscreen?.() || panel.webkitRequestFullscreen?.();
    });
  }

  function renderDetail(item) {
    const root = document.getElementById("kn-detail-page");
    if (!root || !item) {
      return;
    }
    root.classList.remove("is-skeleton");
    root.removeAttribute("aria-busy");
    const tab = visState.detailTab || "information";
    const secondary = item.statusSecondary
      ? `<span class="${badgeClass(item.statusSecondaryTone || "notice")}">${escapeHtml(item.statusSecondary)}</span>`
      : item.delay
        ? `<span class="${badgeClass(item.delayTone)}">${escapeHtml(item.delay)}</span>`
        : "";
    root.innerHTML = `
      <header class="blade-drawer__header kn-detail-head">
        <span class="blade-drawer__header-icon" aria-hidden="true">${MOT_ICONS[item.mot] || MOT_ICONS.ocean}</span>
        <div class="blade-drawer__titles kn-detail-head__copy">
          <div class="kn-detail-id-row">
            <h2 class="type-heading-h5 type-weight-semibold" id="kn-detail-id">${escapeHtml(item.id)}</h2>
            ${copyControl(item.id, "Shipment ID")}
            <span class="${badgeClass(item.statusTone)}">${escapeHtml(item.status)}</span>
            ${secondary}
          </div>
          <p class="type-caption-sm">${escapeHtml(item.company)}${item.direction ? ` · ${escapeHtml(item.direction)}` : ""}</p>
        </div>
        <div class="kn-detail-head__actions">
          <div class="kn-pager" role="group" aria-label="Other shipments">
            <button class="icon-btn" type="button" data-kn-detail-prev aria-label="Previous shipment"${detailList(item.id).length > 1 ? "" : " disabled"}>${MOT_ICONS.back}</button>
            <span class="type-caption-sm kn-pager__caption" aria-live="polite">${escapeHtml(pagerCaption(item.id))}</span>
            <button class="icon-btn" type="button" data-kn-detail-next aria-label="Next shipment"${detailList(item.id).length > 1 ? "" : " disabled"}>${MOT_ICONS.next}</button>
          </div>
          ${disabledControl(`<button class="blade-link type-ui-sm" type="button" disabled>${MOT_ICONS.external} B/L Query</button>`, "B/L Query is not connected yet.")}
          <button class="icon-btn" type="button" id="kn-detail-close" data-kn-detail-close aria-label="Close shipment detail">
            <img src="./assets/quick-actions/close.svg" width="20" height="20" alt="" />
          </button>
        </div>
      </header>
      <div class="kn-detail-tabs" role="tablist" aria-label="Shipment sections">
        ${TABS.map(
          (entry) => `<button
            class="kn-tab type-ui-sm ${entry.id === tab ? "is-active type-weight-semibold" : "type-weight-medium"}"
            type="button"
            role="tab"
            id="kn-detail-tab-${entry.id}"
            aria-selected="${entry.id === tab}"
            aria-controls="kn-detail-panel"
            data-kn-detail-tab="${entry.id}"
          >${escapeHtml(entry.label)}</button>`
        ).join("")}
      </div>
      <div class="blade-drawer__body kn-detail-panel" id="kn-detail-panel" role="tabpanel" aria-labelledby="kn-detail-tab-${tab}">
        ${renderPanel(item, tab)}
      </div>
      ${renderFooter(item, tab)}
    `;
    if (tab === "information") {
      initDetailMap(item);
    } else {
      destroyDetailMap();
    }
    if (tab === "references") {
      applyRefsFilter();
      syncRefsFooter();
      syncRefScopeTabs();
      queueMicrotask(() => {
        resetRefsPanelScroll();
        focusRefValue(refsValueControls()[0], { select: !refsPointerFocus, scroll: false });
      });
    }
  }

  function revealShipmentDetail(item, { persistHash = true } = {}) {
    pendingLoadId = "";
    window.KNVisLoading = false;
    setVisibilityPageLoading(false);
    journeyExpanded = false;
    renderDetail(item);
    setShells(true);
    if (typeof selectVisShipment === "function") {
      selectVisShipment(item.id, { fly: true });
    }
    if (typeof refreshVisibilityMap === "function") {
      refreshVisibilityMap();
    }
    if (persistHash) {
      persist();
    }
  }

  function openKnShipmentDetail(id, { tab, persistHash = true, instant = false } = {}) {
    const item = findShipment(id);
    if (!item) {
      return;
    }
    const nextTab = TABS.some((entry) => entry.id === tab) ? tab : visState.detailTab || "information";
    if (window.KNVisLoading && pendingLoadId === item.id) {
      visState.selectedId = item.id;
      visState.detailId = item.id;
      visState.detailTab = nextTab;
      if (persistHash) {
        persist();
      }
      return;
    }
    const sameOpen = !window.KNVisLoading && isDetailDrawerOpen() && visState.detailId === item.id;
    visState.selectedId = item.id;
    visState.detailId = item.id;
    visState.detailTab = nextTab;
    if (instant || prefersReducedMotion() || sameOpen) {
      revealShipmentDetail(item, { persistHash });
      return;
    }
    const pageMode = window.KNVisLoading || !isVisPageVisible();
    const token = ++loadToken;
    pendingLoadId = item.id;
    window.clearTimeout(loadTimer);
    window.KNVisLoading = true;
    if (pageMode) {
      setVisibilityPageLoading(true);
      hideDetailDrawerInstant();
    } else {
      renderDetailSkeleton();
      setShells(true);
    }
    if (persistHash) {
      persist();
    }
    const delay = pageMode ? 1100 : 700;
    loadTimer = window.setTimeout(() => {
      if (token !== loadToken) {
        return;
      }
      revealShipmentDetail(item, { persistHash: false });
    }, delay);
  }

  function closeKnShipmentDetail({ persistHash = true } = {}) {
    persistRefsDraft({ immediate: true });
    stopVisibilityLoading();
    visState.detailId = "";
    visState.detailTab = "information";
    journeyExpanded = false;
    destroyDetailMap();
    resetRefsState();
    setShells(false);
    if (persistHash) {
      persist();
    }
    if (typeof refreshVisibilityMap === "function") {
      refreshVisibilityMap();
    }
  }

  function syncKnDetailFromHash() {
    if (window.KNVisLoading) {
      return;
    }
    const page = document.getElementById("klearhub-visibility-page");
    if (!page || page.hidden) {
      return;
    }
    const params = typeof getHashParams === "function" ? getHashParams() : new URLSearchParams();
    const id = params.get("id");
    const tab = params.get("tab") || visState.detailTab || "information";
    if (id) {
      if (id !== visState.detailId || !isDetailDrawerOpen()) {
        openKnShipmentDetail(id, { tab, persistHash: false });
      }
      return;
    }
    if (visState.detailId) {
      closeKnShipmentDetail({ persistHash: false });
    }
  }

  function bindDetailEvents() {
    if (bound) {
      return;
    }
    bound = true;
    const root = document.getElementById("kn-detail-drawer");
    document.addEventListener("kn-close-selects", () => {
      if (!refsUi.selectOpen) {
        return;
      }
      refsUi.selectOpen = "";
      patchRefTypeSelect();
    });
    root?.addEventListener("pointerdown", () => {
      refsPointerFocus = true;
    });
    root?.addEventListener("focusin", (event) => {
      const field = event.target.closest("#kn-refs [data-kn-ref-field]");
      markActiveRefField(field);
      const rename = event.target.closest("[data-kn-ref-rename]");
      if (rename && rename.dataset.original == null) {
        rename.dataset.original = rename.value;
        rename.tabIndex = 0;
        rename.closest("[data-kn-ref-field]")?.classList.add("is-renaming");
      }
      if (
        event.target.matches("[data-kn-ref-value]") &&
        !refsPointerFocus &&
        event.target.type !== "date" &&
        event.target.tagName !== "TEXTAREA"
      ) {
        event.target.select();
      }
      refsPointerFocus = false;
    });
    root?.addEventListener("keydown", handleRefsKeydown);
    root?.addEventListener("click", (event) => {
      const copyEl = event.target.closest("[data-copy]");
      if (copyEl) {
        event.preventDefault();
        if (typeof window.copyKnValue === "function") {
          window.copyKnValue(copyEl.getAttribute("data-copy"), copyEl.getAttribute("data-copy-label") || "value", copyEl);
        }
        return;
      }
      const overlay = event.target.closest(".blade-drawer__overlay");
      if (overlay) {
        event.preventDefault();
        overlay.style.pointerEvents = "none";
        const below = document.elementFromPoint(event.clientX, event.clientY);
        overlay.style.pointerEvents = "";
        const hit = below?.closest("[data-vis-id], [data-map-pill]");
        const nextId = hit?.getAttribute("data-vis-id") || hit?.getAttribute("data-map-pill");
        if (nextId) {
          openKnShipmentDetail(nextId, { tab: visState.detailTab });
          return;
        }
        closeKnShipmentDetail();
        return;
      }
      if (event.target.closest("[data-kn-detail-prev]")) {
        event.preventDefault();
        const prevId = adjacentShipmentId(visState.detailId, -1);
        if (prevId) {
          openKnShipmentDetail(prevId, { tab: visState.detailTab, instant: true });
        }
        return;
      }
      if (event.target.closest("[data-kn-detail-next]")) {
        event.preventDefault();
        const nextId = adjacentShipmentId(visState.detailId, 1);
        if (nextId) {
          openKnShipmentDetail(nextId, { tab: visState.detailTab, instant: true });
        }
        return;
      }
      if (event.target.closest("[data-kn-detail-close]")) {
        event.preventDefault();
        closeKnShipmentDetail();
        return;
      }
      if (event.target.closest(".kn-detail-footer a[data-vis-open]")) {
        closeKnShipmentDetail();
        return;
      }
      const toastBtn = event.target.closest("[data-kn-detail-toast]");
      if (toastBtn) {
        event.preventDefault();
        toast(toastBtn.getAttribute("data-kn-detail-toast"), toastBtn.getAttribute("data-kn-toast-color") || "information");
        return;
      }
      const refTypeHandled = window.KNAdminUX?.handleSelectClick(event, {
        open: refsUi.selectOpen,
        setOpen: (next) => {
          refsUi.selectOpen = next;
          patchRefTypeSelect();
        },
        onChange: (_key, value) => {
          refsUi.type = value || "all";
          refsUi.selectOpen = "";
          patchRefTypeSelect();
          applyRefsFilter();
        }
      });
      if (refTypeHandled) {
        return;
      }
      const refScope = event.target.closest("[data-kn-ref-scope]");
      if (refScope) {
        refsUi.scope = refScope.getAttribute("data-kn-ref-scope");
        refreshRefsView({ focus: "first" });
        return;
      }
      if (event.target.closest("[data-kn-ref-rename-btn]")) {
        event.preventDefault();
        startRefRename(event.target.closest("[data-kn-ref-field]"));
        return;
      }
      if (event.target.closest("[data-kn-ref-show-empty]")) {
        event.preventDefault();
        refsUi.showUnused = true;
        const unusedSwitch = refsRoot()?.querySelector("[data-kn-ref-unused]");
        if (unusedSwitch) {
          unusedSwitch.checked = true;
        }
        applyRefsFilter();
        focusRefValue(refsValueControls().find((el) => !String(el.value || "").trim()) || refsValueControls()[0]);
        return;
      }
      if (event.target.closest("[data-kn-ref-clear-filters]")) {
        refsUi.query = "";
        refsUi.type = "all";
        refreshRefsView({ focus: "first" });
        return;
      }
      if (event.target.closest("[data-kn-ref-reset]")) {
        event.preventDefault();
        discardRefsDraft();
        return;
      }
      if (event.target.closest("[data-kn-doc-clear]")) {
        const search = event.target.closest(".kn-detail-docs")?.querySelector("[data-kn-doc-search]");
        if (search) {
          search.value = "";
          applyDocSearch(search);
          search.focus();
        }
        return;
      }
      const tab = event.target.closest("[data-kn-detail-tab]");
      if (tab) {
        persistRefsDraft({ immediate: true });
        visState.detailTab = tab.getAttribute("data-kn-detail-tab");
        persist();
        const item = findShipment(visState.detailId);
        if (item) {
          renderDetail(item);
        }
        return;
      }
      if (event.target.closest("[data-kn-detail-more]")) {
        journeyExpanded = true;
        const item = findShipment(visState.detailId);
        if (item) {
          renderDetail(item);
        }
      }
    });
    root?.addEventListener("change", (event) => {
      if (event.target.matches("[data-kn-ref-unused]")) {
        refsUi.showUnused = event.target.checked;
        applyRefsFilter();
        if (refsUi.showUnused) {
          focusRefValue(refsValueControls().find((el) => !String(el.value || "").trim()) || refsValueControls()[0]);
        }
        return;
      }
      if (event.target.matches("[data-kn-journey-order]")) {
        journeyDescending = event.target.checked;
        const item = findShipment(visState.detailId);
        if (item) {
          renderDetail(item);
        }
      }
    });
    root?.addEventListener("input", (event) => {
      if (event.target.matches("[data-kn-ref-query]")) {
        refsUi.query = event.target.value;
        applyRefsFilter();
        return;
      }
      const rename = event.target.closest("[data-kn-ref-rename]");
      if (rename && refsUi.catalog) {
        const field = findRefField(rename.getAttribute("data-kn-ref-record"), rename.getAttribute("data-kn-ref-key"));
        if (field) {
          field.label = rename.value;
        }
        if (refsUi.query) {
          applyRefsFilter();
        }
        syncRefsFooter();
        persistRefsDraft();
        return;
      }
      if (event.target.matches("[data-kn-ref-value]") && refsUi.catalog) {
        const field = findRefField(event.target.getAttribute("data-kn-ref-record"), event.target.getAttribute("data-kn-ref-key"));
        if (field) {
          field.value = event.target.value;
          event.target.closest("[data-kn-ref-field]")?.setAttribute("data-kn-ref-search", `${field.label} ${field.value}`.toLowerCase());
          event.target.closest("[data-kn-ref-field]")?.setAttribute("data-kn-ref-vacant", field.value ? "false" : "true");
        }
        if (refsUi.query) {
          applyRefsFilter();
        }
        syncRefsFooter();
        persistRefsDraft();
        return;
      }
      const search = event.target.closest("[data-kn-doc-search]");
      if (!search) {
        return;
      }
      applyDocSearch(search);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (!isDetailDrawerOpen()) {
        return;
      }
      if (event.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      closeKnShipmentDetail();
    });
    document.addEventListener("fullscreenchange", () => {
      detailMap?.invalidateSize();
    });
    document.addEventListener("webkitfullscreenchange", () => {
      detailMap?.invalidateSize();
    });
    window.addEventListener("pagehide", () => {
      persistRefsDraft({ immediate: true });
    });
  }

  bindDetailEvents();

  window.openKnShipmentDetail = openKnShipmentDetail;
  window.closeKnShipmentDetail = closeKnShipmentDetail;
  window.syncKnDetailFromHash = syncKnDetailFromHash;
  window.startVisibilityLoading = startVisibilityLoading;
  window.stopVisibilityLoading = stopVisibilityLoading;

  if (typeof getHashPath === "function" && getHashPath() === "#klearhub-visibility" && visState.detailId) {
    openKnShipmentDetail(visState.detailId, { tab: visState.detailTab, persistHash: false });
  }
})();
