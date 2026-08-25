let visSummary =
  typeof window.knSummarizeShipments === "function"
    ? window.knSummarizeShipments(window.KNShipments)
    : { total: 0, shipments: 0, containers: 0, inTransit: 0, hold: 0, waiting: 0, arrived: 0, action: 0, delayed: 0, ontime: 0, demurrageExceeded: 0, demurrageRisk: 0, perDiemExceeded: 0, perDiemRisk: 0, notReleased: 0, readyPickup: 0, gateOut: 0, mot: {}, motPct: {}, origin: {}, holdRows: [], delayedRows: [], arrivals: [], newest: [], amounts: {}, earliestDelayEta: "", rows: [] };

let holdRows = visSummary.holdRows;

const kpis = [
  {
    key: "shipment",
    label: "Active Shipments",
    value: String(visSummary.shipments),
    trend: "From Visibility",
    trendClass: "positive",
    open: { record: "shipment" }
  },
  {
    key: "container",
    label: "Active Containers",
    value: String(visSummary.containers),
    trend: "From Visibility",
    trendClass: "positive",
    open: { record: "container" }
  },
  {
    key: "transit",
    label: "In Transit",
    value: String(visSummary.inTransit),
    trend: `${visSummary.ontime} on track`,
    trendClass: "positive",
    open: { risk: "transit" }
  },
  {
    key: "waiting",
    label: "Waiting to Depart",
    value: String(visSummary.waiting),
    trend: visSummary.delayed ? `${visSummary.delayed} delayed` : "On schedule",
    trendClass: visSummary.delayed ? "negative" : "positive",
    open: { risk: "waiting" }
  },
  {
    key: "arrived",
    label: "Drayage Pending",
    value: String(visSummary.arrived),
    trend: visSummary.arrived ? "At terminal" : "None waiting",
    trendClass: visSummary.arrived ? "notice" : "positive",
    hint: "Containers waiting for a short-haul truck move from the terminal to a warehouse or rail ramp.",
    open: { risk: "arrived" }
  }
];

const holdHints = {
  "Exam Hold": "U.S. Customs is inspecting this container before it can be released.",
  "Document Review": "Required paperwork is still being checked.",
  "Agriculture Inspection": "USDA is inspecting the cargo before release."
};

function holdItemHtml(row, index) {
  const holdHint = holdHints[row.reason];
  const tooltip = holdHint ? ` data-tooltip="${holdHint}"` : "";
  return `
    <button
      class="action-feed__item"
      type="button"
      data-hold-open="${row.id}"
      aria-label="Open ${row.id}, ${row.reason}"${tooltip}
    >
      <span class="action-feed__rank type-caption-sm type-weight-semibold">${index + 1}</span>
      <span class="action-feed__copy">
        <strong class="type-heading-h6 type-weight-semibold">${row.id}</strong>
        <span class="meta type-body-sm">${row.reason} • ${row.container} • ${row.location}</span>
      </span>
      <span class="badge type-caption-sm type-weight-medium">${row.release}</span>
    </button>
  `;
}

const ALERT_BODY_LIMIT = 3;

function previewAlertRows(rows) {
  return rows.slice(0, ALERT_BODY_LIMIT);
}

function attrTip(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function motPlaces(country, counts) {
  const namesByMot = { ocean: [], air: [], truck: [], rail: [] };
  ["ocean", "air", "truck", "rail"].forEach((mot) => {
    if (counts[mot]) {
      namesByMot[mot].push(country);
    }
  });
  return namesByMot;
}

function originLaneRows(origin, limit = 5) {
  const ranked = Object.entries(origin || {}).sort((a, b) => b[1].total - a[1].total);
  if (ranked.length <= limit) {
    return ranked.map(([country, counts]) => ({
      label: country,
      hint: country,
      counts,
      namesByMot: motPlaces(country, counts)
    }));
  }
  const head = ranked.slice(0, limit - 1);
  const rest = ranked.slice(limit - 1);
  const counts = { total: 0, ocean: 0, air: 0, truck: 0, rail: 0 };
  const namesByMot = { ocean: [], air: [], truck: [], rail: [] };
  const names = rest.map(([country, item]) => {
    counts.total += item.total;
    counts.ocean += item.ocean;
    counts.air += item.air;
    counts.truck += item.truck;
    counts.rail += item.rail;
    ["ocean", "air", "truck", "rail"].forEach((mot) => {
      if (item[mot]) {
        namesByMot[mot].push(country);
      }
    });
    return country;
  });
  return [
    ...head.map(([country, item]) => ({
      label: country,
      hint: country,
      counts: item,
      namesByMot: motPlaces(country, item)
    })),
    { label: "Other", hint: names.join(" · "), counts, namesByMot }
  ];
}

function laneSegHtml(tone, mot, value, max, places) {
  if (!value || !max) {
    return "";
  }
  const mode = typeof knMotLabel === "function" ? knMotLabel(mot) : mot;
  const where = (places || []).join(", ");
  const tip = where ? `${mode} · ${where}` : `${mode} · ${value}`;
  return `<span class="dash-bars__seg chart-cat--${tone}" style="width: ${Math.round((value / max) * 100)}%" data-tooltip="${attrTip(tip)}"></span>`;
}

function syncAlertViewAll(linkId, total) {
  const link = document.getElementById(linkId);
  if (link) {
    link.hidden = total <= ALERT_BODY_LIMIT;
  }
}

function alertHitHtml(id, reason, meta, stamp, tooltip, tone = "neutral", visOpen = { record: "all", risk: "hold" }) {
  const tip = tooltip ? ` data-tooltip="${tooltip}"` : "";
  const indicator = tone === "neutral" ? "" : `<span class="indicator indicator--${tone}" aria-hidden="true"></span>`;
  return `<li>
    <a class="alert-hit" href="#klearhub-visibility" data-vis-open='${JSON.stringify(visOpen)}' data-kn-open-id="${id}" aria-label="Open ${id}, ${reason}"${tip}>
      ${indicator}
      <span class="alert-hit__copy">
        <strong class="type-ui-sm type-weight-semibold">${reason}</strong>
        <span class="alert-hit__meta type-caption-sm"><code class="code">${id}</code><span>${meta}</span></span>
      </span>
      <span class="alert-hit__when type-caption-sm">${stamp}</span>
    </a>
  </li>`;
}

const holdDrawerList = document.getElementById("hold-drawer-list");
holdRows.forEach((row, index) => {
  const li = document.createElement("li");
  li.innerHTML = holdItemHtml(row, index);
  holdDrawerList?.appendChild(li);
});

function knParseStamp(value) {
  if (!value) {
    return null;
  }
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) {
    return new Date(iso);
  }
  const match = /(?:ETA|ETD)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(String(value));
  if (!match) {
    return null;
  }
  const parsed = Date.parse(`${match[2]} ${match[1]}, ${match[3]}`);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function knShipmentInRange(item, start, end) {
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  const points = [item.created, item.origin?.date, item.dest?.date].map(knParseStamp).filter(Boolean);
  if (!points.length) {
    return true;
  }
  return points.some((point) => point >= start && point <= endDay);
}

function applyDashSummary(rows) {
  if (typeof window.knSummarizeShipments !== "function") {
    return;
  }
  visSummary = window.knSummarizeShipments(rows);
  holdRows = visSummary.holdRows;
  if (holdDrawerList) {
    holdDrawerList.innerHTML = "";
    holdRows.forEach((row, index) => {
      const li = document.createElement("li");
      li.innerHTML = holdItemHtml(row, index);
      holdDrawerList.appendChild(li);
    });
  }
  hydrateDashFromVisibility();
  refreshDashAlerts();
  syncDashKpiCards(visSummary);
  const ids = new Set(rows.map((item) => item.id));
  if (typeof window.KNAis?.setFilter === "function" && shipmentMap) {
    window.KNAis.setFilter(shipmentMap, (vessel) => !vessel?.id || ids.has(vessel.id));
  }
}

function syncDashKpiCards(summary) {
  const values = {
    shipment: String(summary.shipments),
    container: String(summary.containers),
    transit: String(summary.inTransit),
    waiting: String(summary.waiting),
    arrived: String(summary.arrived)
  };
  document.querySelectorAll(".kpi-stat[data-map-filter]").forEach((card) => {
    const key = card.getAttribute("data-map-filter");
    const value = values[key];
    if (value == null) {
      return;
    }
    const node = card.querySelector(".kpi-stat__value");
    if (node) {
      node.textContent = value;
    }
    card.setAttribute("aria-label", `Show ${card.querySelector(".kpi-stat__label")?.textContent || key} on the map, ${value}`);
  });
}

function refreshDashAlerts() {
  const fmt = typeof window.knFormatEta === "function" ? window.knFormatEta : (value) => value;
  const demurrage = (visSummary.rows || []).filter((item) => /port of delivery|ready for pickup/i.test(item.status || ""));
  const demurrageHits = document.getElementById("alert-demurrage-hits");
  const demurrageEmpty = document.getElementById("alert-demurrage-empty");
  if (demurrageHits) {
    if (!demurrage.length) {
      demurrageHits.innerHTML = "";
      if (demurrageEmpty) {
        demurrageEmpty.hidden = false;
      }
    } else {
      if (demurrageEmpty) {
        demurrageEmpty.hidden = true;
      }
      demurrageHits.innerHTML = previewAlertRows(demurrage)
        .map((item) => {
          const statusLabel = /ready for pickup/i.test(item.status || "") ? "Ready for pickup" : "At port of delivery";
          return alertHitHtml(item.id, statusLabel, item.dest.city, fmt(item.dest.date), "", "negative", { record: "all", risk: "arrived" });
        })
        .join("");
    }
    syncAlertViewAll("alert-demurrage-viewall", demurrage.length);
  }

  const delayHits = document.getElementById("alert-delay-hits");
  const delayEmpty = document.getElementById("alert-delay-empty");
  const delayed = visSummary.delayedRows || [];
  if (delayHits) {
    if (!delayed.length) {
      delayHits.innerHTML = "";
      if (delayEmpty) {
        delayEmpty.hidden = false;
      }
    } else {
      if (delayEmpty) {
        delayEmpty.hidden = true;
      }
      delayHits.innerHTML = previewAlertRows(delayed)
        .map((item) => alertHitHtml(item.id, item.delay, item.dest.city, fmt(item.dest.date), "", "notice", { record: "all", risk: "delayed" }))
        .join("");
    }
    syncAlertViewAll("alert-delay-viewall", delayed.length);
  }

  const holdHits = document.getElementById("alert-hold-hits");
  const holdEmpty = document.getElementById("alert-hold-empty");
  if (holdHits) {
    if (!holdRows.length) {
      holdHits.innerHTML = "";
      if (holdEmpty) {
        holdEmpty.hidden = false;
      }
    } else {
      if (holdEmpty) {
        holdEmpty.hidden = true;
      }
      holdHits.innerHTML = previewAlertRows(holdRows)
        .map((row) => alertHitHtml(row.id, row.reason, `${row.container} · ${row.location}`, row.release, holdHints[row.reason], "information", { record: "all", risk: "hold" }))
        .join("");
    }
    syncAlertViewAll("alert-hold-viewall", holdRows.length);
  }
}

refreshDashAlerts();

const kpiGrid = document.getElementById("kpi-grid");
let shipmentMap = null;
let dashMapFilter = "";

const NAV_CHEVRON =
  '<svg class="nav-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

function dashShipmentsForFilter(key) {
  const rows = window.KNShipments || [];
  if (!key) {
    return rows;
  }
  if (key === "shipment") {
    return rows.filter((item) => item.record === "shipment");
  }
  if (key === "container") {
    return rows.filter((item) => item.record === "container");
  }
  if (key === "transit") {
    return rows.filter((item) => (typeof knIsInTransit === "function" ? knIsInTransit(item) : /enroute|in transit/i.test(item.status || "")));
  }
  if (key === "waiting") {
    return rows.filter((item) => /waiting to depart/i.test(item.status || ""));
  }
  if (key === "arrived") {
    return rows.filter((item) => /ready for pickup|port of delivery/i.test(item.status || ""));
  }
  return rows;
}

function badgeToneForKpi(trendClass) {
  if (trendClass === "negative") {
    return "negative";
  }
  if (trendClass === "notice") {
    return "notice";
  }
  return "positive";
}

kpis.forEach((kpi) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "kpi-stat";
  card.setAttribute("data-map-filter", kpi.key);
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", `Show ${kpi.label} on the map, ${kpi.value}`);
  if (kpi.hint) {
    card.setAttribute("data-tooltip", kpi.hint);
  }
  card.innerHTML = `
    <span class="kpi-stat__label type-caption-sm type-weight-medium">${kpi.label}</span>
    <span class="kpi-stat__metrics">
      <span class="kpi-stat__value type-heading-h4 type-weight-semibold">${kpi.value}</span>
      <span class="badge badge--${badgeToneForKpi(kpi.trendClass)} type-caption-sm type-weight-medium">${kpi.trend}</span>
    </span>
    ${NAV_CHEVRON}
  `;
  kpiGrid?.appendChild(card);
});

kpiGrid?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-map-filter]");
  if (!card) {
    return;
  }
  const key = card.getAttribute("data-map-filter") || "";
  dashMapFilter = dashMapFilter === key ? "" : key;
  applyDashMapFilter();
});

document.getElementById("map-panel")?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-map-filter-clear]")) {
    return;
  }
  dashMapFilter = "";
  applyDashMapFilter();
});

const shell = document.querySelector(".app-shell");
const menuToggle = document.querySelector(".menu-toggle");
const backdrop = document.querySelector(".sidebar-backdrop");
const sideNav = document.querySelector(".side-nav");
const sideNavL1 = document.querySelector("#side-nav-l1");
const sideNavL2 = document.querySelector("#side-nav-l2");
const sideNavL2Title = sideNavL2.querySelector(".side-nav-l2__title");
const sideNavL2Back = sideNavL2.querySelector(".side-nav-l2__back");

const HOVER_AGAIN_DELAY = 500;
const L1_EXIT_HOVER_DELAY = 150;
const TRANSITION_CLEANUP_DELAY = 300;

let activeL2Trigger = null;
let isL1Collapsed = false;
let isL1Hovered = false;
let isHoverAgainEnabled = true;
let isTransitioning = false;
let hoverTimeout;
let hoverAgainTimeout;
let transitionTimeout;

function isMediumOrHdDesktop() {
  const matched = document.documentElement.dataset.matchedBreakpoint;
  return matched === "l" || matched === "xl";
}

function setVisibleLevel(visibleLevel) {
  sideNav.dataset.visibleLevel = String(visibleLevel);
}

function startL1Transition() {
  isTransitioning = true;
  sideNav.classList.add("is-transitioning");
  window.clearTimeout(transitionTimeout);
  transitionTimeout = window.setTimeout(() => {
    isTransitioning = false;
    sideNav.classList.remove("is-transitioning");
  }, TRANSITION_CLEANUP_DELAY);
}

function endL1Transition() {
  isTransitioning = false;
  sideNav.classList.remove("is-transitioning");
  window.clearTimeout(transitionTimeout);
}

function syncL1Classes() {
  const desktop = isMediumOrHdDesktop();

  sideNav.classList.toggle("is-l1-collapsed", desktop && isL1Collapsed);
  sideNav.classList.toggle("is-l1-hovered", desktop && isL1Collapsed && isL1Hovered);
  sideNav.classList.toggle("is-mobile-l2-open", !desktop && isL1Collapsed);

  if (!desktop) {
    setVisibleLevel(shell.classList.contains("nav-open") ? (isL1Collapsed ? 2 : 1) : 0);
    return;
  }

  setVisibleLevel(isL1Collapsed && !isL1Hovered ? 2 : 1);
}

function getL2Level(trigger) {
  const id = trigger?.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
}

function getL2TriggerForLevel(level) {
  const id = level?.id;
  return id ? sideNav.querySelector(`[data-l2trigger][aria-controls="${id}"]`) : null;
}

function getActiveL2Trigger() {
  return (
    activeL2Trigger ||
    sideNav.querySelector('[data-l2trigger][aria-expanded="true"]') ||
    sideNav.querySelector('.side-nav-link[data-l2trigger][aria-current="page"]')
  );
}

function returnL2ToTrigger() {
  sideNav.querySelectorAll("[data-l2trigger]").forEach((trigger) => {
    const level = getL2Level(trigger);
    const item = trigger.closest("li");
    if (level && item && level.parentElement !== item) {
      item.appendChild(level);
    }
    if (level) {
      level.hidden = true;
    }
    trigger.setAttribute("aria-expanded", "false");
  });
  sideNavL2.hidden = true;
  activeL2Trigger = null;
}

function portalL2(trigger, title) {
  const level = getL2Level(trigger);
  if (!trigger || !level) {
    return;
  }
  sideNav.querySelectorAll("[data-l2trigger]").forEach((item) => {
    if (item !== trigger) {
      item.setAttribute("aria-expanded", "false");
      const otherLevel = getL2Level(item);
      const otherItem = item.closest("li");
      if (otherLevel && otherItem && otherLevel.parentElement !== otherItem) {
        otherItem.appendChild(otherLevel);
      }
      if (otherLevel) {
        otherLevel.hidden = true;
      }
    }
  });
  sideNavL2Title.textContent = title;
  sideNavL2.appendChild(level);
  level.hidden = false;
  sideNavL2.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  activeL2Trigger = trigger;
}

function collapseL1(title, trigger = getActiveL2Trigger()) {
  if (!isMediumOrHdDesktop()) {
    isL1Collapsed = true;
    portalL2(trigger, title);
    syncL1Classes();
    return;
  }

  if (!isL1Collapsed) {
    isL1Collapsed = true;
    setVisibleLevel(2);
  }
  portalL2(trigger, title);
  syncL1Classes();
}

function expandL1() {
  if (!isMediumOrHdDesktop()) {
    isL1Collapsed = false;
    isL1Hovered = false;
    returnL2ToTrigger();
    syncL1Classes();
    return;
  }

  if (isL1Collapsed) {
    isL1Collapsed = false;
    isL1Hovered = false;
    returnL2ToTrigger();
    startL1Transition();
    syncL1Classes();
  }
}

function onLinkActiveChange({ level, isActive, isL2Trigger, isFirstRender, title, trigger }) {
  if (level !== 1 || !isActive) {
    return;
  }

  if (isL2Trigger) {
    collapseL1(title, trigger || getActiveL2Trigger());
    if (!isFirstRender) {
      startL1Transition();
      isL1Hovered = false;
      isHoverAgainEnabled = false;
      syncL1Classes();
      window.clearTimeout(hoverAgainTimeout);
      hoverAgainTimeout = window.setTimeout(() => {
        isHoverAgainEnabled = true;
      }, HOVER_AGAIN_DELAY);
    }
    return;
  }

  expandL1();
}

function clearCurrent() {
  sideNav.querySelectorAll('.side-nav-link[aria-current="page"]').forEach((active) => {
    active.removeAttribute("aria-current");
  });
}

function setCurrent(link) {
  link.setAttribute("aria-current", "page");
}

const HOME_ICON_SVG = `
  <span class="breadcrumb-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  </span>
`;

const breadcrumbList = document.getElementById("breadcrumb-list");

function getNavTitle(link) {
  return link.querySelector(".side-nav-link__title")?.textContent?.trim() || "";
}

function getBreadcrumbTrail() {
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  const l1Current = sideNav.querySelector('.side-nav-link[data-level="1"][aria-current="page"]');
  const isDashboard =
    !l2Current && (!l1Current || l1Current.getAttribute("href") === "#dashboard");

  const items = [{ href: "#dashboard", label: "Home", iconOnly: true, isCurrentPage: isDashboard }];

  if (isDashboard) {
    return items;
  }

  if (l1Current && l1Current.getAttribute("href") !== "#dashboard") {
    items.push({
      href: l1Current.getAttribute("href"),
      label: getNavTitle(l1Current),
      isCurrentPage: !l2Current,
    });
  }

  if (l2Current) {
    items.push({
      href: l2Current.getAttribute("href"),
      label: getNavTitle(l2Current),
      isCurrentPage: true,
    });
  }

  return items;
}

function isDashboardRoute() {
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  const l1Current = sideNav.querySelector('.side-nav-link[data-level="1"][aria-current="page"]');
  return !l2Current && (!l1Current || l1Current.getAttribute("href") === "#dashboard");
}

function isRoleManagementRoute() {
  return getHashPath().startsWith("#kn-role-management");
}

function isUserManagementRoute() {
  return getHashPath().startsWith("#kn-user-management");
}

function isDefaultRoleManagementRoute() {
  return getHashPath().startsWith("#default-role-management");
}

function nestedAdminNavHash(path = getHashPath()) {
  if (path.startsWith("#kn-role-management")) {
    return "#kn-role-management";
  }
  if (path.startsWith("#kn-user-management")) {
    return "#kn-user-management";
  }
  if (path.startsWith("#default-role-management")) {
    return "#default-role-management";
  }
  return path;
}

function adminModuleApi(navHash) {
  if (navHash === "#kn-role-management") {
    return window.KNRoles;
  }
  if (navHash === "#kn-user-management") {
    return window.KNUsers;
  }
  if (navHash === "#default-role-management") {
    return window.KNDefaultRoles;
  }
  return null;
}

function adminStoredName(storageKey, id) {
  try {
    const rows = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return rows.find((row) => row.id === id)?.name || id;
  } catch (error) {
    return id;
  }
}

function getCurrentPageTitle() {
  const path = getHashPath();
  const roleDetail = path.match(/^#kn-role-management\/([^/]+)$/);
  if (roleDetail && roleDetail[1] !== "add") {
    return adminStoredName("kn-roles-v2", decodeURIComponent(roleDetail[1]));
  }
  const userDetail = path.match(/^#kn-user-management\/([^/]+)$/);
  if (userDetail && userDetail[1] !== "add") {
    return adminStoredName("kn-users-v2", decodeURIComponent(userDetail[1]));
  }
  const defDetail = path.match(/^#default-role-management\/([^/]+)$/);
  if (defDetail && defDetail[1] !== "add") {
    return adminStoredName("kn-default-roles-v3", decodeURIComponent(defDetail[1]));
  }
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  if (l2Current) {
    return getNavTitle(l2Current);
  }
  const l1Current = sideNav.querySelector('.side-nav-link[data-level="1"][aria-current="page"]');
  if (l1Current) {
    return getNavTitle(l1Current);
  }
  return "Dashboard";
}

function isKlearhubOverviewRoute() {
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  return l2Current?.getAttribute("href") === "#klearhub-overview";
}

function isKlearhubVisibilityRoute() {
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  return l2Current?.getAttribute("href") === "#klearhub-visibility";
}

function getHashPath(hash = location.hash) {
  return (hash || "#dashboard").split("?")[0];
}

function setRouteHash(href) {
  if (!href?.startsWith("#")) {
    return;
  }
  const nextPath = href.split("?")[0];
  if (nextPath === getHashPath()) {
    if (!href.includes("?") && !window.KNVisLoading && typeof window.closeKnShipmentDetail === "function" && visState?.detailId) {
      window.closeKnShipmentDetail();
    }
    return;
  }
  history.replaceState(null, "", nextPath);
  // replaceState does not fire hashchange — notify listeners (assistant grounding, etc.).
  window.dispatchEvent(new CustomEvent("kn-route-change", { detail: { hash: nextPath } }));
}

function setPageSectionVisibility(el, visible) {
  if (!el) {
    return;
  }
  el.hidden = !visible;
  if (visible) {
    el.removeAttribute("aria-hidden");
    el.inert = false;
  } else {
    el.setAttribute("aria-hidden", "true");
    el.inert = true;
  }
}

function syncPageView() {
  const dashboardInner = document.querySelector(".dashboard-inner");
  const overviewPage = document.getElementById("klearhub-overview-page");
  const visibilityPage = document.getElementById("klearhub-visibility-page");
  const rolePage = document.getElementById("kn-role-page");
  const userPage = document.getElementById("kn-user-page");
  const defaultRolePage = document.getElementById("kn-default-role-page");
  const emptyPage = document.getElementById("empty-page");
  const emptyTitle = document.getElementById("empty-page-title");
  const emptyDescription = document.getElementById("empty-page-description");
  const emptyCta = document.getElementById("empty-page-cta");
  const isDashboard = isDashboardRoute();
  const isOverview = isKlearhubOverviewRoute();
  const isVisibility = isKlearhubVisibilityRoute();
  const isRoles = isRoleManagementRoute();
  const isUsers = isUserManagementRoute();
  const isDefaultRoles = isDefaultRoleManagementRoute();
  const isAdminModule = isRoles || isUsers || isDefaultRoles;

  if (!isUsers) {
    window.KNUsers?.suspend?.();
  }
  if (!isRoles) {
    window.KNRoles?.suspend?.();
  }
  if (!isDefaultRoles) {
    window.KNDefaultRoles?.suspend?.();
  }
  if (!isVisibility) {
    window.suspendVisibility?.();
  }

  setPageSectionVisibility(dashboardInner, isDashboard);
  setPageSectionVisibility(overviewPage, isOverview);
  setPageSectionVisibility(visibilityPage, isVisibility);
  setPageSectionVisibility(rolePage, isRoles);
  setPageSectionVisibility(userPage, isUsers);
  setPageSectionVisibility(defaultRolePage, isDefaultRoles);
  if (isVisibility && typeof persistVisViewHash === "function") {
    persistVisViewHash(visState?.view || "cards");
  }
  if (isVisibility && typeof window.syncKnDetailFromHash === "function") {
    window.syncKnDetailFromHash();
  }
  if (!isVisibility && visState?.detailId && typeof window.closeKnShipmentDetail === "function") {
    window.closeKnShipmentDetail({ persistHash: false });
  }
  if (emptyPage) {
    setPageSectionVisibility(emptyPage, !(isDashboard || isOverview || isVisibility || isAdminModule));
  }
  if (isRoles) {
    window.KNRoles?.init?.();
    window.KNRoles?.sync?.();
  }
  if (isUsers) {
    window.KNUsers?.init?.();
    window.KNUsers?.sync?.();
  }
  if (isDefaultRoles) {
    window.KNDefaultRoles?.init?.();
    window.KNDefaultRoles?.sync?.();
  }
  if (!isDashboard && !isOverview && !isVisibility && !isAdminModule) {
    const title = getCurrentPageTitle();
    const toVisibility = /ops|notification|transaction|shipments/i.test(title);
    if (emptyTitle) {
      emptyTitle.textContent = title;
    }
    if (emptyDescription) {
      emptyDescription.textContent = `${title} is not available in this workspace yet. Open ${toVisibility ? "Visibility" : "Dashboard"} to keep working.`;
    }
    if (emptyCta) {
      emptyCta.setAttribute("href", toVisibility ? "#klearhub-visibility" : "#dashboard");
      emptyCta.textContent = toVisibility ? "Open Visibility" : "Back to Dashboard";
    }
  }
  refreshShipmentMap();
  if (typeof refreshVisibilityMap === "function") {
    refreshVisibilityMap();
  }
  if (isOverview) {
    countUpOverview();
  }
  syncDocumentTitle();
  window.KNAiOpsSurface?.sync?.();
}

function syncDocumentTitle() {
  const page = getCurrentPageTitle();
  document.title = page === "Dashboard" ? "KlearNow · Dashboard" : `KlearNow · ${page}`;
}

function isL2Context() {
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  const l2TriggerCurrent = Boolean(sideNav.querySelector('.side-nav-link[data-l2trigger][aria-current="page"]'));
  const l2PanelOpen = Boolean(sideNavL2 && !sideNavL2.hidden);
  return Boolean(l2Current || l2TriggerCurrent || l2PanelOpen);
}

function renderBreadcrumb() {
  const items = getBreadcrumbTrail();
  const breadcrumbBar = document.querySelector(".content-breadcrumb");
  const shouldShow = items.length > 1 && !isL2Context();

  if (breadcrumbBar) {
    breadcrumbBar.hidden = !shouldShow;
  }
  breadcrumbList.replaceChildren();

  const mobileTitle = document.getElementById("top-nav-mobile-title");
  if (mobileTitle) {
    const current = items.find((item) => item.isCurrentPage);
    mobileTitle.textContent = current && !current.iconOnly ? current.label : "Dashboard";
  }

  syncPageView();

  if (!shouldShow) {
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "breadcrumb-item";
    const isLast = index === items.length - 1;
    const isCurrent = Boolean(item.isCurrentPage);

    if (isCurrent) {
      li.setAttribute("aria-current", "page");
    }

    const content = document.createElement(isCurrent ? "span" : "a");
    content.className = isCurrent ? "breadcrumb-link is-current" : "breadcrumb-link";
    if (!isCurrent) {
      content.href = item.href;
    }
    if (item.iconOnly) {
      content.setAttribute("aria-label", item.label);
      content.innerHTML = `${HOME_ICON_SVG}<span class="visually-hidden">${item.label}</span>`;
    } else {
      content.textContent = item.label;
    }
    li.appendChild(content);

    if (!isLast) {
      const separator = document.createElement("span");
      separator.className = "breadcrumb-separator";
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = "/";
      li.appendChild(separator);
    }

    breadcrumbList.appendChild(li);
  });
}

breadcrumbList.addEventListener("click", (event) => {
  const link = event.target.closest("a.breadcrumb-link");
  if (!link || !breadcrumbList.contains(link)) {
    return;
  }
  event.preventDefault();
  const href = link.getAttribute("href");
  if (href?.startsWith("#") && !window.KNAdminUX?.tryNavigate(href)) {
    return;
  }
  const navLink = sideNav.querySelector(`.side-nav-link[href="${href}"]`);
  if (navLink) {
    navLink.click();
  }
});

function activateL2Trigger(trigger) {
  const activeTrigger = trigger || getActiveL2Trigger();
  if (!activeTrigger) {
    return;
  }
  const title = getNavTitle(activeTrigger);
  const level = getL2Level(activeTrigger);
  const firstChild = level?.querySelector('.side-nav-link[data-level="2"]');
  clearCurrent();
  setCurrent(activeTrigger);
  if (firstChild) {
    setCurrent(firstChild);
    const href = firstChild.getAttribute("href");
    if (href?.startsWith("#")) {
      setRouteHash(href);
    }
  }
  onLinkActiveChange({
    level: 1,
    isActive: true,
    isL2Trigger: true,
    isFirstRender: false,
    title,
    trigger: activeTrigger
  });
  renderBreadcrumb();
}

function setNavOpen(isOpen) {
  const desktop = isMediumOrHdDesktop();
  shell.classList.toggle("nav-open", isOpen && !desktop);
  menuToggle.setAttribute("aria-expanded", String(isOpen && !desktop));
  menuToggle.setAttribute("aria-label", isOpen && !desktop ? "Close navigation" : "Open navigation");
  backdrop.hidden = desktop || !isOpen;
  if (!isOpen && !desktop) {
    isL1Collapsed = false;
    isL1Hovered = false;
    returnL2ToTrigger();
  }
  syncL1Classes();
}

menuToggle.addEventListener("click", () => {
  setNavOpen(!shell.classList.contains("nav-open"));
});

backdrop.addEventListener("click", () => setNavOpen(false));

sideNavL2Back.addEventListener("click", () => {
  expandL1();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (!isMediumOrHdDesktop() && isL1Collapsed) {
    expandL1();
    return;
  }
  expandL1();
  setNavOpen(false);
});

const breakpointObserver = new MutationObserver(() => {
  if (isMediumOrHdDesktop()) {
    setNavOpen(false);
    const openTrigger = getActiveL2Trigger();
    if (openTrigger?.getAttribute("aria-current") === "page") {
      collapseL1(getNavTitle(openTrigger), openTrigger);
    } else {
      expandL1();
    }
  } else {
    expandL1();
  }
});

breakpointObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-matched-device-type", "data-matched-breakpoint"],
});

sideNav.addEventListener("click", (event) => {
  const link = event.target.closest(".side-nav-link");
  if (!link || !sideNav.contains(link)) {
    return;
  }
  const href = link.getAttribute("href");
  if (href?.startsWith("#") && !window.KNAdminUX?.tryNavigate(href)) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  if (href?.startsWith("#")) {
    setRouteHash(href);
  }

  const level = Number(link.dataset.level || "1");
  const isL2TriggerLink = link.dataset.l2trigger === "true";
  const title = link.querySelector(".side-nav-link__title")?.textContent?.trim() || "";

  if (isL2TriggerLink) {
    activateL2Trigger(link);
    return;
  }

  clearCurrent();
  setCurrent(link);

  if (level === 2) {
    const levelEl = link.closest(".side-nav-level");
    const trigger = getL2TriggerForLevel(levelEl) || getActiveL2Trigger();
    if (trigger) {
      setCurrent(trigger);
      const triggerTitle = getNavTitle(trigger);
      if (isL1Collapsed) {
        portalL2(trigger, triggerTitle);
      } else {
        onLinkActiveChange({
          level: 1,
          isActive: true,
          isL2Trigger: true,
          isFirstRender: false,
          title: triggerTitle,
          trigger
        });
      }
    }
    if (!isMediumOrHdDesktop()) {
      setNavOpen(false);
    }
    renderBreadcrumb();
    return;
  }

  onLinkActiveChange({
    level: 1,
    isActive: true,
    isL2Trigger: false,
    isFirstRender: false,
    title,
  });
  renderBreadcrumb();
});

sideNav.addEventListener("focusin", (event) => {
  const link = event.target.closest('.side-nav-link[data-level="1"]');
  if (!link || !sideNav.contains(link)) {
    return;
  }
  if (isL1Collapsed && isMediumOrHdDesktop() && link.matches(":focus-visible")) {
    expandL1();
  }
});

sideNavL1.addEventListener("transitionend", (event) => {
  if (event.target !== sideNavL1 || event.propertyName !== "width") {
    return;
  }
  endL1Transition();
});

sideNavL1.addEventListener("mouseover", () => {
  if (!isMediumOrHdDesktop()) {
    return;
  }
  window.clearTimeout(hoverTimeout);
  if (isL1Collapsed && isHoverAgainEnabled && !isL1Hovered) {
    isL1Hovered = true;
    syncL1Classes();
  }
});

sideNavL1.addEventListener("mouseleave", () => {
  if (!isMediumOrHdDesktop()) {
    return;
  }
  if (isL1Collapsed && isL1Hovered) {
    hoverTimeout = window.setTimeout(() => {
      isL1Hovered = false;
      startL1Transition();
      syncL1Classes();
    }, L1_EXIT_HOVER_DELAY);
    return;
  }
  if (isL1Collapsed && !isL1Hovered) {
    setVisibleLevel(2);
  }
});

sideNavL2.addEventListener("mouseover", (event) => {
  event.stopPropagation();
});

sideNavL2.addEventListener("mouseout", (event) => {
  event.stopPropagation();
});

syncL1Classes();
renderBreadcrumb();

if (getHashPath() && getHashPath() !== "#dashboard") {
  const hashPath = getHashPath();
  const navHash = nestedAdminNavHash(hashPath);
  const deepLink =
    sideNav.querySelector(`.side-nav-link[data-level="2"][href="${navHash}"]`) ||
    sideNav.querySelector(`.side-nav-link[data-level="1"][href="${navHash}"]`);
  deepLink?.click();
  if (navHash !== hashPath) {
    history.replaceState(null, "", hashPath);
    adminModuleApi(navHash)?.sync?.();
  }
}

window.addEventListener("hashchange", (event) => {
  window.clearBladeToasts?.();
  if (!window.KNAdminUX?.consumeNavigation()) {
    const oldHash = event.oldURL ? new URL(event.oldURL).hash || "#dashboard" : "#dashboard";
    const newHash = event.newURL ? new URL(event.newURL).hash || "#dashboard" : getHashPath();
    const oldApi = window.KNAdminUX.adminApiForHash(oldHash);
    if (oldApi?.isDirty?.()) {
      history.replaceState(null, "", oldHash);
      oldApi.requestLeave(newHash);
      oldApi.sync?.();
      return;
    }
  }
  const path = getHashPath();
  const navHash = nestedAdminNavHash(path);
  const api = adminModuleApi(navHash);
  if (api) {
    const link = sideNav.querySelector(`.side-nav-link[data-level="2"][href="${navHash}"]`);
    if (link && link.getAttribute("aria-current") !== "page") {
      const nested = path;
      window.KNAdminUX?.beginNavigation();
      link.click();
      if (nested !== navHash) {
        history.replaceState(null, "", nested);
      }
    } else {
      api.sync?.();
    }
  } else {
    const link =
      sideNav.querySelector(`.side-nav-link[data-level="2"][href="${navHash}"]`) ||
      sideNav.querySelector(`.side-nav-link[data-level="1"][href="${navHash}"]`);
    if (link && link.getAttribute("aria-current") !== "page") {
      window.KNAdminUX?.beginNavigation();
      link.click();
    }
  }
  renderBreadcrumb();
});

document.querySelector(".breadcrumb").addEventListener("click", (event) => {
  const link = event.target.closest("a.breadcrumb-link");
  if (!link) {
    return;
  }
  event.preventDefault();
  const href = link.getAttribute("href");
  if (href?.startsWith("#") && !window.KNAdminUX?.tryNavigate(href)) {
    return;
  }
  const navLink = sideNav.querySelector(`.side-nav-link[href="${href}"]`);
  if (navLink) {
    navLink.click();
  }
});

const profileMenu = document.getElementById("profile-menu");
const profileTriggers = document.querySelectorAll(".avatar-trigger");

function setProfileMenuOpen(isOpen) {
  profileMenu.hidden = !isOpen;
  profileTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
  });
}

profileTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    setProfileMenuOpen(profileMenu.hidden);
  });
});

document.getElementById("profile-logout")?.addEventListener("click", () => {
  setProfileMenuOpen(false);
  try {
    window.localStorage.removeItem("kn-dash-layout");
  } catch (error) {
    /* ignore */
  }
  location.hash = "#dashboard";
  location.reload();
});

const quickActionsTrigger = document.getElementById("quick-actions-trigger");
const quickActionsMenu = document.getElementById("quick-actions-menu");
if (quickActionsMenu && quickActionsMenu.parentElement !== document.body) {
  document.body.appendChild(quickActionsMenu);
}
const quickActionsSearch = document.getElementById("quick-actions-search");
const quickActionsClear = document.getElementById("quick-actions-clear");
const quickActionsEmpty = document.getElementById("quick-actions-empty");
const quickActionsClose = document.getElementById("quick-actions-close");
const quickActionsItems = Array.from(quickActionsMenu.querySelectorAll(".action-list-item"));
let quickActionsIndex = 0;

function visibleQuickActionItems() {
  return quickActionsItems.filter((item) => !item.hidden);
}

function syncQuickActionsActive() {
  const visible = visibleQuickActionItems();
  if (visible.length === 0) {
    quickActionsIndex = -1;
    quickActionsSearch.removeAttribute("aria-activedescendant");
    return;
  }
  if (quickActionsIndex < 0) {
    quickActionsIndex = 0;
  }
  if (quickActionsIndex >= visible.length) {
    quickActionsIndex = visible.length - 1;
  }
  visible.forEach((item, index) => {
    const isActive = index === quickActionsIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
    if (isActive) {
      item.scrollIntoView({ block: "nearest" });
      quickActionsSearch.setAttribute("aria-activedescendant", item.id);
    }
  });
}

function filterQuickActions(query) {
  const needle = query.trim().toLowerCase();
  quickActionsMenu.querySelectorAll(".action-list-section").forEach((section) => {
    const items = Array.from(section.querySelectorAll(".action-list-item"));
    let visibleCount = 0;
    items.forEach((item) => {
      const label = item.dataset.label || item.textContent;
      const matches = !needle || label.toLowerCase().includes(needle);
      item.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      }
    });
    section.hidden = visibleCount === 0;
  });
  const hasResults = visibleQuickActionItems().length > 0;
  quickActionsEmpty.hidden = hasResults;
  quickActionsIndex = hasResults ? 0 : -1;
  syncQuickActionsActive();
}

function positionQuickActionsMenu() {
  const gutter = 16;
  const width = Math.min(300, window.innerWidth - gutter * 2);
  const triggerRect = quickActionsTrigger?.getBoundingClientRect();
  const triggerVisible = Boolean(triggerRect && triggerRect.width && triggerRect.height);
  if (!triggerVisible) {
    quickActionsMenu.classList.add("is-centered");
    quickActionsMenu.style.width = `${Math.min(360, window.innerWidth - gutter * 2)}px`;
    quickActionsMenu.style.left = `${Math.round((window.innerWidth - Math.min(360, window.innerWidth - gutter * 2)) / 2)}px`;
    quickActionsMenu.style.top = "20vh";
    return;
  }
  quickActionsMenu.classList.remove("is-centered");
  let left = triggerRect.right - width;
  if (left < gutter) {
    left = gutter;
  }
  if (left + width > window.innerWidth - gutter) {
    left = window.innerWidth - width - gutter;
  }
  let top = triggerRect.bottom + 8;
  const menuHeight = quickActionsMenu.offsetHeight;
  if (menuHeight && top + menuHeight > window.innerHeight - gutter) {
    const above = triggerRect.top - menuHeight - 8;
    if (above >= gutter) {
      top = above;
    }
  }
  quickActionsMenu.style.width = `${width}px`;
  quickActionsMenu.style.left = `${left}px`;
  quickActionsMenu.style.top = `${top}px`;
}

function setQuickActionsOpen(isOpen) {
  if (isOpen) {
    setProfileMenuOpen(false);
    if (typeof setDashDatePickerOpen === "function") {
      setDashDatePickerOpen(false);
    }
  }
  quickActionsMenu.hidden = !isOpen;
  quickActionsTrigger.setAttribute("aria-expanded", String(isOpen));
  quickActionsSearch.setAttribute("aria-expanded", String(isOpen));
  if (!isOpen) {
    quickActionsSearch.removeAttribute("aria-activedescendant");
    return;
  }
  positionQuickActionsMenu();
  quickActionsSearch.value = "";
  quickActionsClear.hidden = true;
  filterQuickActions("");
  window.requestAnimationFrame(() => {
    quickActionsSearch.focus();
    positionQuickActionsMenu();
  });
}

function selectQuickAction(item) {
  if (!item) {
    return;
  }
  const href = item.getAttribute("data-href");
  const focusSel = item.getAttribute("data-focus");
  const scrollSel = item.getAttribute("data-scroll");
  let filters = {};
  try {
    filters = JSON.parse(item.getAttribute("data-vis-open") || "{}");
  } catch (error) {
    filters = {};
  }
  setQuickActionsOpen(false);
  if (Object.keys(filters).length && typeof applyVisibilityFilters === "function") {
    applyVisibilityFilters(filters);
  }
  if (href) {
    const navLink = sideNav.querySelector(`.side-nav-link[href="${href}"]`);
    if (navLink) {
      navLink.click();
    } else if (href === "#dashboard") {
      sideNav.querySelector('.side-nav-link[href="#dashboard"]')?.click();
    }
  }
  const rolePath = item.getAttribute("data-role-path");
  if (rolePath) {
    window.requestAnimationFrame(() => window.KNRoles?.open(rolePath));
  }
  const userPath = item.getAttribute("data-user-path");
  if (userPath) {
    window.requestAnimationFrame(() => window.KNUsers?.open(userPath));
  }
  window.requestAnimationFrame(() => {
    if (scrollSel) {
      const target = document.querySelector(scrollSel);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    if (focusSel) {
      document.querySelector(focusSel)?.focus();
    }
  });
}

quickActionsTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  setQuickActionsOpen(quickActionsMenu.hidden);
});

quickActionsClose.addEventListener("click", () => {
  setQuickActionsOpen(false);
  quickActionsTrigger.focus();
});

quickActionsSearch.addEventListener("input", () => {
  quickActionsClear.hidden = quickActionsSearch.value.length === 0;
  filterQuickActions(quickActionsSearch.value);
});

quickActionsClear.addEventListener("click", () => {
  quickActionsSearch.value = "";
  quickActionsClear.hidden = true;
  filterQuickActions("");
  quickActionsSearch.focus();
});

quickActionsItems.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    const visible = visibleQuickActionItems();
    quickActionsIndex = visible.indexOf(item);
    syncQuickActionsActive();
  });
  item.addEventListener("click", () => {
    selectQuickAction(item);
  });
});

window.addEventListener("resize", () => {
  if (!quickActionsMenu.hidden) {
    positionQuickActionsMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!profileMenu.hidden) {
    if (!profileMenu.contains(event.target) && !event.target.closest(".avatar-trigger")) {
      setProfileMenuOpen(false);
    }
  }
  if (!quickActionsMenu.hidden) {
    if (!quickActionsMenu.contains(event.target) && !quickActionsTrigger.contains(event.target)) {
      setQuickActionsOpen(false);
    }
  }
});

document.addEventListener("keydown", (event) => {
  const isToggleShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
  if (isToggleShortcut) {
    event.preventDefault();
    setQuickActionsOpen(quickActionsMenu.hidden);
    return;
  }

  if (event.key === "Escape") {
    if (!quickActionsMenu.hidden) {
      setQuickActionsOpen(false);
      quickActionsTrigger.focus();
      return;
    }
    if (!profileMenu.hidden) {
      setProfileMenuOpen(false);
    }
    return;
  }

  if (quickActionsMenu.hidden) {
    return;
  }

  const visible = visibleQuickActionItems();
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (visible.length === 0) {
      return;
    }
    quickActionsIndex = (quickActionsIndex + 1) % visible.length;
    syncQuickActionsActive();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (visible.length === 0) {
      return;
    }
    quickActionsIndex = (quickActionsIndex - 1 + visible.length) % visible.length;
    syncQuickActionsActive();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    selectQuickAction(visible[quickActionsIndex]);
  }
});

const KH_ICONS = {
  ocean:
    '<path d="M3 17h18l-2-6H8L3 17Z"/><path d="M8 11V7h8l2 4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/>',
  air: '<path d="M3 12h18L14 4v4L8 12l6 4v4L3 12Z"/>',
  truck:
    '<path d="M3 7h11v9H3V7Z"/><path d="M14 10h4l3 3v3h-7v-6Z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  rail: '<path d="M5 16V8h14v8"/><path d="M5 12h14"/><path d="M8 16l-2 3M16 16l2 3M7 19h10"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/>'
};

function countRows(rows, predicate) {
  return rows.filter(predicate).length;
}

function modeFreshness(rows) {
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const toStamp = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const todayStart = startOfDay(new Date());
  const todayStamp = toStamp(todayStart);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStamp = toStamp(weekStart);
  const monthStamp = toStamp(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
  const createdDay = (item) => (item.created || "").slice(0, 10);
  const today = countRows(rows, (item) => createdDay(item) === todayStamp);
  const week = countRows(rows, (item) => {
    const day = createdDay(item);
    return Boolean(day) && day >= weekStamp;
  });
  const month = countRows(rows, (item) => {
    const day = createdDay(item);
    return Boolean(day) && day >= monthStamp;
  });
  const pending = countRows(rows, (item) => /waiting to depart/i.test(item.status || ""));
  return { today, week, month, pending, ingested: Math.max(0, rows.length - pending) };
}

function buildKlearhubModes(rows) {
  const ocean = rows.filter((item) => item.mot === "ocean");
  const air = rows.filter((item) => item.mot === "air");
  const truck = rows.filter((item) => item.mot === "truck");
  const rail = rows.filter((item) => item.mot === "rail");
  const oceanFresh = modeFreshness(ocean);
  const airFresh = modeFreshness(air);
  const truckFresh = modeFreshness(truck);
  const railFresh = modeFreshness(rail);
  return [
  {
    id: "ocean",
    title: "Ocean Shipments",
    icon: "ocean",
    meta: [
      { label: "Active MBLs", value: "" },
      { label: "Active", value: String(ocean.length) },
      { label: "Completed", value: "0" }
    ],
    stages: [
      { title: "Port of Lading", rows: [{ label: "Waiting to Depart POL", value: `${countRows(ocean, (item) => /waiting to depart/i.test(item.status || ""))} MBLs` }] },
      { title: "At Transship port", rows: [{ label: "In Transit to the Transship port", value: "0 MBLs" }] },
      { title: "Port of Unloading", rows: [{ label: "In Transit to POU", value: `${countRows(ocean, (item) => /enroute to pou|in transit/i.test(item.status || ""))} MBLs` }] },
      {
        title: "Port of Delivery",
        rows: [
          { label: "Moving inland to POD", value: "0 MBLs" },
          { label: "At Port of Delivery", value: `${countRows(ocean, (item) => /port of delivery/i.test(item.status || ""))} MBLs` }
        ]
      }
    ],
    shipments: [
      { label: "New Shipments Today", value: String(oceanFresh.today) },
      { label: "New Shipments this Week", value: String(oceanFresh.week) },
      { label: "New Shipments this Month", value: String(oceanFresh.month) }
    ],
    ingestion: [
      { label: "Pending Shipments", value: String(oceanFresh.pending) },
      { label: "Ingested Shipments", value: String(oceanFresh.ingested) }
    ]
  },
  {
    id: "air",
    title: "Air Shipments",
    icon: "air",
    // Stages partition the active population — omit header total to avoid duplicating Destination when all are enroute.
    meta: [],
    stages: [
      { title: "Origin Airport", rows: [{ label: "Waiting to export Airport Of Origin", value: `${countRows(air, (item) => /waiting/i.test(item.status || ""))} MAWBs` }] },
      { title: "Destination Airport", rows: [{ label: "Enroute to POD", value: `${countRows(air, (item) => /enroute|in transit/i.test(item.status || ""))} MAWBs` }] }
    ],
    shipments: [
      { label: "New Shipments Today", value: String(airFresh.today) },
      { label: "New Shipments this Week", value: String(airFresh.week) },
      { label: "New Shipments this Month", value: String(airFresh.month) }
    ],
    ingestion: [
      { label: "Pending Shipments", value: String(airFresh.pending) },
      { label: "Ingested Shipments", value: String(airFresh.ingested) }
    ]
  },
  {
    id: "truck",
    title: "Truck Shipments",
    icon: "truck",
    meta: [{ label: "Active", value: String(truck.length) }],
    stages: [],
    shipments: [
      { label: "New Shipments Today", value: String(truckFresh.today) },
      { label: "New Shipments this Week", value: String(truckFresh.week) },
      { label: "New Shipments this Month", value: String(truckFresh.month) }
    ],
    ingestion: [
      { label: "Pending Shipments", value: String(truckFresh.pending) },
      { label: "Ingested Shipments", value: String(truckFresh.ingested) }
    ]
  },
  {
    id: "rail",
    title: "Rail Shipments",
    icon: "rail",
    meta: [{ label: "Active", value: String(rail.length) }],
    stages: [],
    shipments: [
      { label: "New Shipments Today", value: String(railFresh.today) },
      { label: "New Shipments this Week", value: String(railFresh.week) },
      { label: "New Shipments this Month", value: String(railFresh.month) }
    ],
    ingestion: [
      { label: "Pending Shipments", value: String(railFresh.pending) },
      { label: "Ingested Shipments", value: String(railFresh.ingested) }
    ]
  }
  ];
}

const klearhubModes = buildKlearhubModes(visSummary.rows || []);

function renderMetricList(items) {
  return items
    .map(
      (item) => `
        <li>
          <div class="metric-row">
            <span class="metric-label type-heading-h5 type-weight-medium">${item.label}</span>
            <strong class="type-heading-h5">${item.value}</strong>
          </div>
        </li>
      `
    )
    .join("");
}

function renderModeMeta(items) {
  return items
    .filter((item) => item.value)
    .map(
      (item) =>
        `<span class="badge type-caption-sm type-weight-medium">${item.label} ${item.value}</span>`
    )
    .join("");
}

function renderKlearhubModes() {
  const stack = document.getElementById("kh-mode-stack");
  if (!stack) {
    return;
  }

  stack.replaceChildren();
  klearhubModes.forEach((mode) => {
    const details = document.createElement("details");
    details.className = "kh-accordion panel card";
    details.open = true;
    const meta = renderModeMeta(mode.meta);
    const stages = mode.stages.length
      ? `<div class="kh-stage-grid" data-cols="${mode.stages.length}">${mode.stages
          .map(
            (stage) => `
              <article class="kpi-card">
                <div class="kpi-card__copy">
                  <h3 class="type-body-sm">${stage.title}</h3>
                  ${stage.rows
                    .map(
                      (row) => `
                        <p class="kpi-value type-heading-h4">${row.value}</p>
                        <p class="metric-caption type-caption-sm">${row.label}</p>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")}</div>`
      : "";

    details.innerHTML = `
      <summary class="kh-accordion__header">
        <span class="kh-accordion__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${KH_ICONS[mode.icon]}</svg>
        </span>
        <span class="kh-accordion__title type-heading-h5 type-weight-semibold">${mode.title}</span>
        <span class="kh-accordion__meta">${meta}</span>
        <svg class="kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div class="kh-accordion__body">
        ${stages}
        <div class="split-grid">
          <article class="subpanel">
            <h3 class="type-heading-h5 type-weight-semibold">Shipments Overview</h3>
            <ul class="metric-list">${renderMetricList(mode.shipments)}</ul>
          </article>
          <article class="subpanel">
            <h3 class="type-heading-h5 type-weight-semibold">Ingestion Overview</h3>
            <ul class="metric-list">${renderMetricList(mode.ingestion)}</ul>
          </article>
        </div>
      </div>
    `;
    stack.appendChild(details);
  });
}

renderKlearhubModes();

function getVisibleKhAccordions() {
  const panel = document.querySelector("#klearhub-overview-page .kh-panel:not([hidden])");
  return panel ? panel.querySelectorAll(".kh-accordion") : [];
}

function syncKhCollapseLabel() {
  const button = document.getElementById("kh-collapse-all");
  const sections = getVisibleKhAccordions();
  if (!button || sections.length === 0) {
    return;
  }
  const allOpen = Array.from(sections).every((section) => section.open);
  button.textContent = allOpen ? "Collapse All" : "Expand All";
}

document.getElementById("kh-collapse-all")?.addEventListener("click", () => {
  const sections = getVisibleKhAccordions();
  const shouldCollapse = Array.from(sections).some((section) => section.open);
  sections.forEach((section) => {
    section.open = !shouldCollapse;
  });
  syncKhCollapseLabel();
});

document.getElementById("klearhub-overview-page")?.addEventListener("toggle", syncKhCollapseLabel, true);

document.querySelectorAll("[data-kh-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const selected = tab.getAttribute("data-kh-tab");
    document.querySelectorAll("[data-kh-tab]").forEach((item) => {
      const isActive = item.getAttribute("data-kh-tab") === selected;
      item.setAttribute("aria-selected", String(isActive));
      item.classList.toggle("btn--primary", isActive);
      item.classList.toggle("btn--tertiary", !isActive);
    });
    document.getElementById("kh-panel-klearview").hidden = selected !== "klearview";
    document.getElementById("kh-panel-container").hidden = selected !== "container";
    syncKhCollapseLabel();
  });
});

document.querySelectorAll(".kh-alert-dismiss").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".blade-alert")?.remove();
  });
});

document.addEventListener("click", (event) => {
  const copyEl = event.target.closest("[data-copy]");
  if (copyEl) {
    event.preventDefault();
    event.stopPropagation();
    copyKnValue(copyEl.getAttribute("data-copy"), copyEl.getAttribute("data-copy-label") || "value", copyEl);
    return;
  }
  const emptyCta = event.target.closest("#empty-page-cta, a[data-kn-goto]");
  if (emptyCta) {
    event.preventDefault();
    const href = emptyCta.getAttribute("href");
    const navLink =
      sideNav.querySelector(`.side-nav-link[data-level="2"][href="${href}"]`) ||
      sideNav.querySelector(`.side-nav-link[href="${href}"]`);
    navLink?.click();
    return;
  }
  const link = event.target.closest("a[href='#klearhub-visibility']");
  if (!link || link.closest(".side-nav")) {
    return;
  }
  event.preventDefault();
  let filters = {};
  try {
    filters = JSON.parse(link.getAttribute("data-vis-open") || "{}");
  } catch (error) {
    filters = {};
  }
  if (typeof applyVisibilityFilters === "function") {
    applyVisibilityFilters(filters);
  }
  sideNav.querySelector('.side-nav-link[data-level="2"][href="#klearhub-visibility"]')?.click();
  const openId = link.getAttribute("data-kn-open-id");
  if (openId && typeof window.openKnShipmentDetail === "function") {
    window.openKnShipmentDetail(openId);
  }
});

const SHIP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18l-2-6H8L3 17Z"/><path d="M8 11V7h8l2 4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>';
const PORT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v8"/><circle cx="12" cy="7" r="2"/><path d="M6 12h12"/><path d="M7 16c1.2 2.4 3 4 5 5 2-1 3.8-2.6 5-5"/></svg>';

const shipmentMarkers = (window.KNShipments || []).map((item) => window.knToMapItem(item));

function shipmentMarkerIcon(item) {
  if (window.KNMapUx) {
    return window.KNMapUx.createPillIcon(item);
  }
  return L.divIcon({
    className: "",
    html: `<span class="shipment-marker shipment-marker--${item.emphasis}">${item.kind === "port" ? PORT_ICON : SHIP_ICON}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function dashMapFilterIds() {
  return new Set(dashShipmentsForFilter(dashMapFilter).map((item) => item.id));
}

function ensureDashMapFilterUi() {
  const leading = document.querySelector("#map-panel .map-header__leading");
  if (leading && !document.getElementById("map-filter-caption")) {
    const caption = document.createElement("span");
    caption.id = "map-filter-caption";
    caption.className = "type-caption-sm";
    caption.setAttribute("aria-live", "polite");
    leading.appendChild(caption);
  }
  const stage = document.querySelector("#map-panel .map-stage");
  if (stage && !document.getElementById("map-empty")) {
    const empty = document.createElement("div");
    empty.id = "map-empty";
    empty.className = "empty-state map-empty";
    empty.hidden = true;
    empty.innerHTML = `
      <div class="empty-state__asset" aria-hidden="true">${SHIP_ICON}</div>
      <h3 class="type-heading-h5 type-weight-semibold">No shipments in this view</h3>
      <p class="type-body-sm">Nothing matches this snapshot. Show all shipments on the map, or pick another KPI.</p>
      <button class="btn btn--secondary btn--sm type-ui-sm" type="button" data-map-filter-clear>Show all shipments</button>
    `;
    stage.appendChild(empty);
  }
}

function fitDashMap() {
  if (!shipmentMap) {
    return;
  }
  const livePoints = window.KNAis?.getFitPoints(shipmentMap) || [];
  const fallback = dashShipmentsForFilter(dashMapFilter).map((item) => [item.lat, item.lng]);
  const points = livePoints.length ? livePoints : fallback;
  if (points.length) {
    fitMapToPoints(shipmentMap, points);
  }
}

function applyDashMapFilter() {
  const kpi = kpis.find((item) => item.key === dashMapFilter);
  const rows = dashShipmentsForFilter(dashMapFilter);
  const ids = dashMapFilterIds();
  ensureDashMapFilterUi();
  kpiGrid?.querySelectorAll("[data-map-filter]").forEach((card) => {
    const selected = card.getAttribute("data-map-filter") === dashMapFilter && Boolean(dashMapFilter);
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  const caption = document.getElementById("map-filter-caption");
  if (caption) {
    caption.textContent = kpi ? `Showing ${rows.length} · ${kpi.label}` : "";
  }
  const empty = document.getElementById("map-empty");
  if (empty) {
    empty.hidden = rows.length > 0;
    empty.setAttribute("aria-hidden", String(rows.length > 0));
  }
  window.KNMapUx?.close?.();
  window.KNAis?.setFilter(shipmentMap, dashMapFilter ? (vessel) => ids.has(vessel.id) : null);
  if (rows.length) {
    fitDashMap();
  }
  refreshShipmentMap();
}

function openShipmentFromDashboard(id) {
  if (!id) {
    return;
  }
  window.KNMapUx?.close?.();
  const kpi = kpis.find((item) => item.key === dashMapFilter);
  if (typeof applyVisibilityFilters === "function") {
    applyVisibilityFilters(kpi?.open || {});
  }
  if (typeof window.startVisibilityLoading === "function") {
    window.startVisibilityLoading("page");
  }
  sideNav.querySelector('.side-nav-link[data-level="2"][href="#klearhub-visibility"]')?.click();
  if (typeof window.openKnShipmentDetail === "function") {
    window.openKnShipmentDetail(id);
  }
}

function refreshShipmentMap() {
  if (!shipmentMap) {
    return;
  }
  const dashboardInner = document.querySelector(".dashboard-inner");
  if (dashboardInner?.hidden) {
    return;
  }
  requestAnimationFrame(() => {
    shipmentMap.invalidateSize();
    applyMapZoomRules(shipmentMap);
  });
}

function initShipmentMap() {
  const el = document.getElementById("shipment-map");
  if (!el || typeof L === "undefined") {
    if (el) {
      el.classList.add("shipment-map--fallback");
      el.innerHTML = '<p class="type-body-sm">Live map could not be loaded.</p>';
    }
    return;
  }

  const mapLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    mapTileOptions({
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd"
    })
  );
  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    mapTileOptions({
      attribution: "Tiles &copy; Esri"
    })
  );

  shipmentMap = createConstrainedMap(el);
  mapLayer.addTo(shipmentMap);

  window.KNAis?.bindMap(shipmentMap, {
    fallbackShips: shipmentMarkers,
    icon: (vessel) =>
      window.KNMapUx ? window.KNMapUx.createPillIcon(vessel) : shipmentMarkerIcon(vessel),
    onClick: (data) => openShipmentFromDashboard(data.id)
  });
  window.KNMapUx?.bindList(document.getElementById("dash-live"));
  ensureDashMapFilterUi();
  applyDashMapFilter();

  document.querySelectorAll("#map-panel [data-map-basemap]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-map-basemap");
      document.querySelectorAll("#map-panel [data-map-basemap]").forEach((item) => {
        const isActive = item.getAttribute("data-map-basemap") === mode;
        item.setAttribute("aria-pressed", String(isActive));
        item.classList.toggle("btn--primary", isActive);
        item.classList.toggle("btn--tertiary", !isActive);
      });
      if (mode === "satellite") {
        shipmentMap.removeLayer(mapLayer);
        satelliteLayer.addTo(shipmentMap);
      } else {
        shipmentMap.removeLayer(satelliteLayer);
        mapLayer.addTo(shipmentMap);
      }
    });
  });

  document.getElementById("map-zoom-in")?.addEventListener("click", () => {
    if (shipmentMap.getZoom() < shipmentMap.getMaxZoom()) {
      shipmentMap.zoomIn();
    }
  });
  document.getElementById("map-zoom-out")?.addEventListener("click", () => {
    if (shipmentMap.getZoom() > shipmentMap.getMinZoom()) {
      shipmentMap.zoomOut();
    }
  });
  syncMapZoomButtons(
    shipmentMap,
    document.getElementById("map-zoom-in"),
    document.getElementById("map-zoom-out")
  );
  document.getElementById("map-recenter")?.addEventListener("click", () => {
    fitDashMap();
  });

  const mapPanel = document.getElementById("map-panel");
  const expandBtn = document.getElementById("map-expand");
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const requestFullscreen = (node) => {
    if (node.requestFullscreen) {
      return node.requestFullscreen();
    }
    if (node.webkitRequestFullscreen) {
      return node.webkitRequestFullscreen();
    }
    return Promise.resolve();
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    }
    if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    }
    return Promise.resolve();
  };

  expandBtn?.addEventListener("click", () => {
    if (!mapPanel) {
      return;
    }
    if (fullscreenElement() === mapPanel) {
      exitFullscreen();
      return;
    }
    requestFullscreen(mapPanel);
  });

  const syncExpandLabel = () => {
    if (expandBtn) {
      expandBtn.textContent = fullscreenElement() === mapPanel ? "Exit Map" : "Expand Map";
    }
    refreshShipmentMap();
  };
  document.addEventListener("fullscreenchange", syncExpandLabel);
  document.addEventListener("webkitfullscreenchange", syncExpandLabel);

  const stage = el.parentElement;
  if (stage && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => refreshShipmentMap()).observe(stage);
  }

  refreshShipmentMap();
  requestAnimationFrame(() => {
    fitDashMap();
  });
}

function revealDashboard() {
  const root = document.querySelector(".dashboard-inner");
  const skeleton = document.getElementById("dash-skeleton");
  const live = document.getElementById("dash-live");

  if (root) {
    root.dataset.loading = "false";
    root.removeAttribute("aria-busy");
    root.classList.add("is-ready");
  }
  if (skeleton) {
    skeleton.hidden = true;
  }
  if (live) {
    live.hidden = false;
  }
  requestAnimationFrame(() => {
    initShipmentMap();
  });
}

function initDashboardLoader() {
  const root = document.querySelector(".dashboard-inner");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onDashboard = typeof isDashboardRoute === "function" ? isDashboardRoute() : true;

  if (!root || reduceMotion || !onDashboard) {
    revealDashboard();
    return;
  }

  window.setTimeout(revealDashboard, 1400);
}

function initBladeTooltips() {
  if (document.getElementById("blade-tooltip")) {
    return;
  }

  const tip = document.createElement("div");
  tip.className = "blade-tooltip type-caption-sm";
  tip.id = "blade-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);

  let active = null;
  let pending = null;
  let showTimer = 0;
  let hideTimer = 0;

  const hide = () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    active = null;
    pending = null;
    tip.hidden = true;
    tip.textContent = "";
    tip.removeAttribute("data-placement");
  };

  const place = (el) => {
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const tipRect = tip.getBoundingClientRect();
    const placement = el.getAttribute("data-tooltip-placement") || "top";
    let top = rect.top - tipRect.height - gap;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (placement === "bottom" || top < 8) {
      top = rect.bottom + gap;
      tip.setAttribute("data-placement", "bottom");
    } else {
      tip.setAttribute("data-placement", "top");
    }

    left = Math.min(Math.max(8, left), window.innerWidth - tipRect.width - 8);
    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
  };

  const show = (el) => {
    const content = el.getAttribute("data-tooltip");
    const title = el.getAttribute("data-tooltip-title");
    if (!content || el.closest(".dash-skeleton") || el === pending) {
      return;
    }
    pending = el;
    window.clearTimeout(hideTimer);
    showTimer = window.setTimeout(() => {
      active = el;
      tip.innerHTML = title
        ? `<strong class="blade-tooltip__title">${title}</strong><span>${content}</span>`
        : content;
      tip.hidden = false;
      requestAnimationFrame(() => place(el));
    }, 160);
  };

  document.addEventListener("mouseover", (event) => {
    const el = event.target.closest("[data-tooltip]");
    if (!el || el === active) {
      return;
    }
    show(el);
  });

  document.addEventListener("mouseout", (event) => {
    const el = event.target.closest("[data-tooltip]");
    if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
      return;
    }
    window.clearTimeout(showTimer);
    hideTimer = window.setTimeout(hide, 80);
  });

  document.addEventListener("focusin", (event) => {
    const el = event.target.closest("[data-tooltip]");
    if (el) {
      show(el);
    }
  });

  document.addEventListener("focusout", (event) => {
    const el = event.target.closest("[data-tooltip]");
    if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
      return;
    }
    hide();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
    }
  });

  window.addEventListener("scroll", hide, true);
}

const DASH_LAYOUT_KEY = "kn-dashboard-layout";
const DASH_WIDGETS = [
  { id: "alerts", title: "Needs attention", description: "Demurrage, delays, and holds that need a decision" },
  { id: "overview", title: "Live snapshot", description: "Active volume, stages, and the shipment map" },
  { id: "feeds", title: "Arrivals and filings", description: "Upcoming arrivals and recent filings" },
  { id: "charts", title: "Lane and mode mix", description: "Shipments by lane and transport mode" },
  { id: "shipments", title: "Recent shipments", description: "Latest shipment table" },
  { id: "finance", title: "Duty and fees", description: "Duty, demurrage, invoices, and charges" },
  { id: "health", title: "Health and invoices", description: "Shipment health and outstanding invoices" }
];

function defaultDashboardLayout() {
  return {
    order: DASH_WIDGETS.map((item) => item.id),
    hidden: []
  };
}

function readDashboardLayout() {
  const fallback = defaultDashboardLayout();
  try {
    const raw = window.localStorage.getItem(DASH_LAYOUT_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const known = new Set(DASH_WIDGETS.map((item) => item.id));
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((id) => known.has(id))
      : [];
    known.forEach((id) => {
      if (!order.includes(id)) {
        order.push(id);
      }
    });
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((id) => known.has(id))
      : [];
    return { order, hidden };
  } catch (error) {
    return fallback;
  }
}

function writeDashboardLayout(layout) {
  try {
    window.localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout));
  } catch (error) {
    /* keep going so save still updates the page and toast */
  }
}

function layoutsMatch(a, b) {
  const hiddenA = [...(a?.hidden || [])].sort().join(",");
  const hiddenB = [...(b?.hidden || [])].sort().join(",");
  return (a?.order || []).join(",") === (b?.order || []).join(",") && hiddenA === hiddenB;
}

function applyDashboardLayout(layout, { flash = false } = {}) {
  const live = document.getElementById("dash-live");
  if (!live) {
    return;
  }
  const hero = live.querySelector(".hero");
  const next = layout || readDashboardLayout();
  const hidden = new Set(next.hidden);
  const previous = [...live.querySelectorAll("[data-widget]")].map((el) => el.getAttribute("data-widget"));
  if (hero) {
    live.appendChild(hero);
  }
  next.order.forEach((id) => {
    const widget = live.querySelector(`[data-widget="${id}"]`);
    if (!widget) {
      return;
    }
    widget.hidden = hidden.has(id);
    live.appendChild(widget);
  });
  if (flash) {
    next.order.forEach((id, index) => {
      const widget = live.querySelector(`[data-widget="${id}"]`);
      if (!widget || widget.hidden || previous[index] === id) {
        return;
      }
      widget.classList.remove("is-layout-updated");
      void widget.offsetWidth;
      widget.classList.add("is-layout-updated");
    });
  }
  if (shipmentMap && typeof shipmentMap.invalidateSize === "function") {
    window.requestAnimationFrame(() => shipmentMap.invalidateSize());
  }
}

function copyKnValue(value, label = "value", sourceEl) {
  const text = String(value || "").trim();
  if (!text) {
    return;
  }
  const announce = () => {
    showBladeToast({
      content: `Copied ${label} ${text}`,
      color: "positive",
      anchor: sourceEl instanceof HTMLElement ? sourceEl : null
    });
    markKnCopied(sourceEl);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(announce).catch(announce);
    return;
  }
  announce();
}

window.copyKnValue = copyKnValue;

const COPY_CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5"/></svg>';

function markKnCopied(sourceEl) {
  if (!sourceEl) {
    return;
  }
  const btn = sourceEl.closest("[data-copy], .vis-copy-cluster, .vis-id-cell") || sourceEl;
  const iconBtn = btn.matches?.(".vis-copy-btn, .icon-btn") ? btn : btn.querySelector?.(".vis-copy-btn");
  const target = iconBtn || btn;
  target.classList.add("is-copied");
  const svg = target.querySelector?.("svg");
  const previous = svg?.outerHTML;
  if (svg) {
    svg.outerHTML = COPY_CHECK_SVG;
  }
  window.setTimeout(() => {
    target.classList.remove("is-copied");
    const nextSvg = target.querySelector?.("svg");
    if (nextSvg && previous) {
      nextSvg.outerHTML = previous;
    }
  }, 1000);
}

let bladeToastTimer = 0;
const BLADE_TOAST_DURATION_MS = 2800;

function clearBladeToasts({ animate = false } = {}) {
  window.clearTimeout(bladeToastTimer);
  bladeToastTimer = 0;
  const container = document.getElementById("blade-toast-container");
  if (!container) {
    return;
  }
  container.querySelectorAll(".blade-toast").forEach((el) => {
    if (!animate) {
      el.remove();
      return;
    }
    if (el.classList.contains("is-leaving")) {
      return;
    }
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 220);
  });
  if (!animate) {
    resetBladeToastContainer(container);
  }
}

function resetBladeToastContainer(container) {
  container.classList.remove("blade-toast-container--anchored");
  container.style.left = "";
  container.style.top = "";
  container.style.right = "";
  container.style.bottom = "";
}

function positionAnchoredBladeToast(container, toast, anchor) {
  const gutter = 16;
  const gap = 8;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(container.offsetWidth || 360, window.innerWidth - gutter * 2);
  const height = toast.offsetHeight || 48;
  let left = rect.left;
  if (left + width > window.innerWidth - gutter) {
    left = window.innerWidth - width - gutter;
  }
  if (left < gutter) {
    left = gutter;
  }
  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - gutter) {
    const above = rect.top - height - gap;
    if (above >= gutter) {
      top = above;
    } else {
      top = Math.max(gutter, window.innerHeight - height - gutter);
    }
  }
  container.classList.add("blade-toast-container--anchored");
  container.style.left = `${Math.round(left)}px`;
  container.style.top = `${Math.round(top)}px`;
  container.style.right = "auto";
  container.style.bottom = "auto";
}

function showBladeToast({ content, color = "positive", duration = BLADE_TOAST_DURATION_MS, anchor = null } = {}) {
  const container = document.getElementById("blade-toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "blade-toast-container";
    el.id = "blade-toast-container";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  })();

  clearBladeToasts();
  resetBladeToastContainer(container);

  const toast = document.createElement("div");
  toast.className = `blade-toast blade-toast--${color}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <span class="blade-toast__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 10.5 15 16 9.5" />
      </svg>
    </span>
    <p class="blade-toast__content type-ui-sm">${content}</p>
    <button class="icon-btn" type="button" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  `;

  const remove = () => {
    window.clearTimeout(bladeToastTimer);
    bladeToastTimer = 0;
    if (toast.classList.contains("is-leaving")) {
      return;
    }
    toast.classList.add("is-leaving");
    window.setTimeout(() => {
      toast.remove();
      if (!container.querySelector(".blade-toast")) {
        resetBladeToastContainer(container);
      }
    }, 220);
  };

  toast.querySelector("button")?.addEventListener("click", remove);
  container.appendChild(toast);
  if (anchor instanceof HTMLElement) {
    positionAnchoredBladeToast(container, toast, anchor);
  }
  bladeToastTimer = window.setTimeout(remove, Math.max(1200, Number(duration) || BLADE_TOAST_DURATION_MS));
}

window.clearBladeToasts = clearBladeToasts;
window.showBladeToast = showBladeToast;

let setDashDatePickerOpen = () => {};

function initDashDatePicker() {
  const trigger = document.getElementById("dash-date-trigger");
  const menu = document.getElementById("dash-date-menu");
  const label = document.getElementById("dash-date-label");
  const startInput = document.getElementById("dash-date-start");
  const endInput = document.getElementById("dash-date-end");
  const error = document.getElementById("dash-date-error");
  const cancel = document.getElementById("dash-date-cancel");
  const apply = document.getElementById("dash-date-apply");
  if (!trigger || !menu || !label || !startInput || !endInput) {
    return;
  }

  if (menu.parentElement !== document.body) {
    document.body.appendChild(menu);
  }

  const toISODate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const fromISODate = (value) => {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const formatRange = (start, end) => {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startText = start.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      ...(sameYear ? {} : { year: "numeric" })
    });
    const endText = end.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return `${startText} – ${endText}`;
  };

  const presets = {
    7: (today) => {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return [start, today];
    },
    30: (today) => {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return [start, today];
    },
    month: (today) => [new Date(today.getFullYear(), today.getMonth(), 1), today],
    "last-month": (today) => {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return [start, end];
    }
  };

  const now = startOfDay(new Date());
  let applied = [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
  let draftPreset = "";

  const sameDay = (left, right) => toISODate(left) === toISODate(right);

  const matchPreset = (start, end) => {
    const today = startOfDay(new Date());
    return (
      Object.entries(presets).find(([, resolve]) => {
        const [from, to] = resolve(today).map(startOfDay);
        return sameDay(from, start) && sameDay(to, end);
      })?.[0] || ""
    );
  };

  const setPresetSelection = (id) => {
    draftPreset = id;
    menu.querySelectorAll("[data-dash-preset]").forEach((button) => {
      const selected = button.getAttribute("data-dash-preset") === id;
      button.setAttribute("aria-selected", String(selected));
      button.classList.toggle("is-active", selected);
    });
  };

  const clearDateError = () => {
    if (error) {
      error.hidden = true;
    }
    startInput.removeAttribute("aria-invalid");
    endInput.removeAttribute("aria-invalid");
  };

  const showDateError = (message, { startInvalid = false, endInvalid = true } = {}) => {
    if (error) {
      error.hidden = false;
      error.textContent = message;
      error.setAttribute("role", "alert");
      error.setAttribute("aria-live", "assertive");
    }
    startInput.setAttribute("aria-invalid", startInvalid ? "true" : "false");
    endInput.setAttribute("aria-invalid", endInvalid ? "true" : "false");
    positionMenu();
  };

  const fillInputs = (start, end) => {
    startInput.value = toISODate(start);
    endInput.value = toISODate(end);
    endInput.min = startInput.value;
    clearDateError();
    setPresetSelection(matchPreset(start, end));
  };

  const positionMenu = () => {
    const gutter = 16;
    const width = Math.min(320, window.innerWidth - gutter * 2);
    const triggerRect = trigger.getBoundingClientRect();
    menu.style.width = `${width}px`;
    menu.style.minWidth = `${width}px`;
    let left = triggerRect.right - width;
    if (left < gutter) {
      left = gutter;
    }
    if (left + width > window.innerWidth - gutter) {
      left = window.innerWidth - width - gutter;
    }
    let top = triggerRect.bottom + 8;
    const menuHeight = menu.offsetHeight;
    if (menuHeight && top + menuHeight > window.innerHeight - gutter) {
      const above = triggerRect.top - menuHeight - 8;
      if (above >= gutter) {
        top = above;
      }
    }
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.right = "auto";
  };

  const onReposition = () => {
    if (!menu.hidden) {
      positionMenu();
    }
  };

  const setOpen = (open) => {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    window.removeEventListener("resize", onReposition);
    document.removeEventListener("scroll", onReposition, true);
    if (!open) {
      return;
    }
    setProfileMenuOpen(false);
    if (typeof setQuickActionsOpen === "function") {
      setQuickActionsOpen(false);
    }
    fillInputs(applied[0], applied[1]);
    positionMenu();
    window.addEventListener("resize", onReposition);
    document.addEventListener("scroll", onReposition, true);
    window.requestAnimationFrame(() => {
      startInput.focus();
      positionMenu();
    });
  };

  setDashDatePickerOpen = setOpen;

  const applyRange = (start, end, { persist = true } = {}) => {
    applied = [startOfDay(start), startOfDay(end)];
    const text = formatRange(applied[0], applied[1]);
    label.textContent = text;
    trigger.setAttribute("aria-label", `Date range, ${text}`);
    setOpen(false);
    applyDashSummary((window.KNShipments || []).filter((item) => knShipmentInRange(item, applied[0], applied[1])));
    if (persist) {
      showBladeToast({ content: `Showing ${text}`, color: "information", anchor: trigger });
    }
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });
  cancel.addEventListener("click", () => {
    setOpen(false);
    trigger.focus();
  });
  apply.addEventListener("click", () => {
    const start = fromISODate(startInput.value);
    const end = fromISODate(endInput.value);
    if (!start || !end) {
      showDateError("Choose both a start date and an end date.", {
        startInvalid: !start,
        endInvalid: !end
      });
      (!start ? startInput : endInput).focus();
      return;
    }
    if (end < start) {
      showDateError("End date must be after start date", {
        startInvalid: false,
        endInvalid: true
      });
      endInput.focus();
      return;
    }
    clearDateError();
    applyRange(start, end);
  });
  menu.addEventListener("click", (event) => {
    const preset = event.target.closest("[data-dash-preset]");
    if (!preset) {
      return;
    }
    const id = preset.getAttribute("data-dash-preset");
    const [start, end] = presets[id](startOfDay(new Date()));
    fillInputs(start, end);
    setPresetSelection(id);
  });
  const onDraftChange = () => {
    endInput.min = startInput.value || "";
    clearDateError();
    const start = fromISODate(startInput.value);
    const end = fromISODate(endInput.value);
    setPresetSelection(start && end ? matchPreset(start, end) : "");
  };
  startInput.addEventListener("input", onDraftChange);
  endInput.addEventListener("input", onDraftChange);
  document.addEventListener("click", (event) => {
    if (menu.hidden) {
      return;
    }
    if (event.target.closest(".kn-date-picker") || event.target.closest("#dash-date-menu")) {
      return;
    }
    setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });

  fillInputs(applied[0], applied[1]);
  applyRange(applied[0], applied[1], { persist: false });
}

function initHoldDrawer() {
  const root = document.getElementById("hold-list-drawer");
  if (!root) {
    return;
  }

  let lastFocus = null;
  let closeTimer = 0;

  const closeDrawer = () => {
    root.classList.remove("is-open");
    window.clearBladeToasts?.();
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }, delay);
  };

  const openHoldShipment = (id) => {
    if (!id) {
      return;
    }
    closeDrawer();
    if (typeof applyVisibilityFilters === "function") {
      applyVisibilityFilters({ record: "all", risk: "hold" });
    }
    if (typeof window.startVisibilityLoading === "function") {
      window.startVisibilityLoading("page");
    }
    const navLink = sideNav.querySelector('.side-nav-link[data-level="2"][href="#klearhub-visibility"]');
    navLink?.click();
    if (typeof window.openKnShipmentDetail === "function") {
      window.openKnShipmentDetail(id);
    }
  };

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-hold-drawer-dismiss]")) {
      if (event.target.closest("a[href='#klearhub-visibility']")) {
        closeDrawer();
        return;
      }
      event.preventDefault();
      closeDrawer();
    }
  });
  document.addEventListener("click", (event) => {
    const holdBtn = event.target.closest("[data-hold-open]");
    if (!holdBtn) {
      return;
    }
    event.preventDefault();
    openHoldShipment(holdBtn.getAttribute("data-hold-open"));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !root.hidden) {
      event.preventDefault();
      closeDrawer();
    }
  });
}

function initDashboardLayout() {
  const trigger = document.getElementById("dashboard-settings");
  const root = document.getElementById("dash-layout-drawer");
  const list = document.getElementById("dash-widget-list");
  const closeBtn = document.getElementById("dash-layout-close");
  const resetBtn = document.getElementById("dash-layout-reset");
  if (!trigger || !root || !list) {
    return;
  }

  let draft = readDashboardLayout();
  let lastFocus = null;
  let closeTimer = 0;
  let persistOnClose = false;
  let sortSession = null;

  const widgetMeta = (id) => DASH_WIDGETS.find((item) => item.id === id);
  const scroller = root.querySelector(".blade-drawer__body");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sortItems = () => [...list.querySelectorAll(".widget-sort-item")];

  const readDraftFromDom = () => {
    const order = sortItems().map((item) => item.getAttribute("data-widget-id"));
    const hidden = sortItems().flatMap((item) => {
      const toggle = item.querySelector('input[type="checkbox"]');
      return toggle && !toggle.checked ? [item.getAttribute("data-widget-id")] : [];
    });
    return { order, hidden };
  };

  const previewDraft = (nextDraft, { flash = true } = {}) => {
    draft = nextDraft;
    applyDashboardLayout(draft, { flash });
    syncResetButton();
  };

  const syncResetButton = () => {
    if (!resetBtn) {
      return;
    }
    resetBtn.disabled = layoutsMatch(draft, defaultDashboardLayout());
  };

  const syncMoveButtons = () => {
    const items = sortItems();
    items.forEach((item, index) => {
      item.querySelector("[data-move='up']")?.toggleAttribute("disabled", index === 0);
      item.querySelector("[data-move='down']")?.toggleAttribute("disabled", index === items.length - 1);
    });
  };

  const playFlip = (elements, mutate) => {
    if (reduceMotion) {
      mutate();
      return;
    }
    const first = new Map(
      elements.map((el) => [el, el.getBoundingClientRect()])
    );
    mutate();
    elements.forEach((el) => {
      const prev = first.get(el);
      if (!prev) {
        return;
      }
      const next = el.getBoundingClientRect();
      const dy = prev.top - next.top;
      if (Math.abs(dy) < 0.5) {
        return;
      }
      el.classList.add("is-shifting");
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
      void el.offsetWidth;
      el.style.transition = "";
      el.style.transform = "";
      const clear = () => el.classList.remove("is-shifting");
      el.addEventListener("transitionend", clear, { once: true });
      window.setTimeout(clear, 400);
    });
  };

  const renderList = () => {
    const savedScroll = window.KNAdminUX?.captureDrawerScroll?.(root);
    const focusSelector = window.KNAdminUX?.captureDrawerFocus?.(root);
    list.innerHTML = draft.order
      .map((id, index) => {
        const meta = widgetMeta(id);
        if (!meta) {
          return "";
        }
        const visible = !draft.hidden.includes(id);
        const isFirst = index === 0;
        const isLast = index === draft.order.length - 1;
        return `
          <li class="widget-sort-item${visible ? "" : " is-off"}" data-widget-id="${id}">
            <button class="icon-btn widget-sort-item__handle" type="button" aria-label="Drag to reorder ${meta.title}">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="9" cy="6" r="1.4" />
                <circle cx="15" cy="6" r="1.4" />
                <circle cx="9" cy="12" r="1.4" />
                <circle cx="15" cy="12" r="1.4" />
                <circle cx="9" cy="18" r="1.4" />
                <circle cx="15" cy="18" r="1.4" />
              </svg>
            </button>
            <div class="widget-sort-item__copy">
              <p class="type-ui-md type-weight-semibold">${meta.title}</p>
              <p class="type-caption-sm">${meta.description}</p>
            </div>
            <div class="widget-sort-item__move">
              <button class="icon-btn" type="button" data-move="up" aria-label="Move ${meta.title} up" ${isFirst ? "disabled" : ""}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M4 10l4-4 4 4" />
                </svg>
              </button>
              <button class="icon-btn" type="button" data-move="down" aria-label="Move ${meta.title} down" ${isLast ? "disabled" : ""}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
            </div>
            <label class="blade-switch">
              <input type="checkbox" role="switch" ${visible ? "checked" : ""} aria-label="Show ${meta.title}" />
              <span class="blade-switch__ui"></span>
            </label>
          </li>
        `;
      })
      .join("");
    syncResetButton();
    window.KNAdminUX?.restoreDrawerScroll?.(root, savedScroll, { focusSelector });
  };

  const movePlaceholder = (placeholder, clientY, dragging) => {
    const others = sortItems().filter((item) => item !== dragging);
    let before = null;
    others.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2 && !before) {
        before = item;
      }
    });
    const alreadyBefore = before ? placeholder.nextSibling === before : placeholder === list.lastElementChild;
    if (alreadyBefore) {
      return false;
    }
    playFlip(others, () => {
      if (before) {
        list.insertBefore(placeholder, before);
      } else {
        list.appendChild(placeholder);
      }
    });
    return true;
  };

  const stopSort = (commit) => {
    const session = sortSession;
    if (!session) {
      return;
    }
    sortSession = null;
    window.cancelAnimationFrame(session.raf);
    list.classList.remove("is-sorting");
    document.body.classList.remove("is-widget-sorting");
    try {
      session.item.releasePointerCapture(session.pointerId);
    } catch (error) {
      /* already released */
    }

    const { item, placeholder, width } = session;
    if (!session.active || !placeholder) {
      item.classList.remove("is-pressing", "is-lifting", "is-settling");
      item.removeAttribute("style");
      return;
    }

    const dest = placeholder.getBoundingClientRect();
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      item.classList.remove("is-lifting", "is-settling", "is-pressing");
      item.removeAttribute("style");
      list.insertBefore(item, placeholder);
      placeholder.remove();
      syncMoveButtons();
      if (commit) {
        previewDraft(readDraftFromDom(), { flash: true });
      }
    };

    if (reduceMotion) {
      finish();
      return;
    }

    item.classList.add("is-settling");
    item.style.width = `${width}px`;
    item.style.transform = `translate3d(${dest.left}px, ${dest.top}px, 0) scale(1) rotate(0deg)`;
    item.style.boxShadow = "var(--theme-elevation-lowRaised)";
    item.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 360);
  };

  const startSort = (event, item) => {
    if (sortSession || event.button) {
      return;
    }
    const origin = item.getBoundingClientRect();
    const state = {
      item,
      placeholder: null,
      pointerId: event.pointerId,
      origin,
      grab: { x: event.clientX - origin.left, y: event.clientY - origin.top },
      pointer: { x: event.clientX, y: event.clientY },
      render: { x: origin.left, y: origin.top },
      scale: 1,
      tilt: 0,
      lastX: event.clientX,
      lastT: performance.now(),
      raf: 0,
      width: origin.width,
      height: origin.height,
      active: false
    };

    const tick = () => {
      if (!sortSession) {
        return;
      }
      state.raf = window.requestAnimationFrame(tick);
      const follow = reduceMotion ? 1 : 0.28;
      const targetX = state.pointer.x - state.grab.x;
      const targetY = state.pointer.y - state.grab.y;
      state.render.x += (targetX - state.render.x) * follow;
      state.render.y += (targetY - state.render.y) * follow;
      const now = performance.now();
      const dt = Math.max(now - state.lastT, 8);
      const velX = (state.pointer.x - state.lastX) / dt;
      state.lastX = state.pointer.x;
      state.lastT = now;
      const targetTilt = reduceMotion ? 0 : Math.max(-8, Math.min(8, velX * 120));
      state.tilt += (targetTilt - state.tilt) * 0.16;
      const targetScale = state.active ? 1.045 : 0.985;
      state.scale += (targetScale - state.scale) * (reduceMotion ? 1 : 0.2);

      if (state.active) {
        item.style.transform = `translate3d(${state.render.x}px, ${state.render.y}px, 0) scale(${state.scale}) rotate(${state.tilt}deg)`;
        if (state.placeholder) {
          movePlaceholder(state.placeholder, state.pointer.y, item);
        }
        if (scroller) {
          const bounds = scroller.getBoundingClientRect();
          const edge = 56;
          let delta = 0;
          if (state.pointer.y < bounds.top + edge) {
            delta = -Math.ceil((edge - (state.pointer.y - bounds.top)) / 5);
          } else if (state.pointer.y > bounds.bottom - edge) {
            delta = Math.ceil((edge - (bounds.bottom - state.pointer.y)) / 5);
          }
          if (delta) {
            scroller.scrollTop += delta;
          }
        }
      }
    };

    sortSession = state;
    item.classList.add("is-pressing");
    try {
      item.setPointerCapture(event.pointerId);
    } catch (error) {
      /* capture is optional */
    }
    state.raf = window.requestAnimationFrame(tick);
  };

  const onPointerMove = (event) => {
    if (!sortSession || event.pointerId !== sortSession.pointerId) {
      return;
    }
    sortSession.pointer.x = event.clientX;
    sortSession.pointer.y = event.clientY;
    const dx = event.clientX - sortSession.origin.left - sortSession.grab.x;
    const dy = event.clientY - sortSession.origin.top - sortSession.grab.y;
    if (!sortSession.active && Math.hypot(dx, dy) > 4) {
      event.preventDefault();
      startSortLift();
    }
    if (sortSession?.active) {
      event.preventDefault();
    }
  };

  const startSortLift = () => {
    if (!sortSession || sortSession.active) {
      return;
    }
    const placeholder = document.createElement("li");
    placeholder.className = "widget-sort-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.height = `${sortSession.height}px`;
    list.insertBefore(placeholder, sortSession.item.nextSibling);
    sortSession.placeholder = placeholder;
    sortSession.active = true;
    sortSession.item.classList.remove("is-pressing");
    sortSession.item.classList.add("is-lifting");
    list.classList.add("is-sorting");
    document.body.classList.add("is-widget-sorting");
    const item = sortSession.item;
    item.style.position = "fixed";
    item.style.left = "0";
    item.style.top = "0";
    item.style.width = `${sortSession.width}px`;
    item.style.zIndex = "10002";
    item.style.margin = "0";
    item.style.transform = `translate3d(${sortSession.render.x}px, ${sortSession.render.y}px, 0) scale(1.02) rotate(0deg)`;
    document.body.appendChild(item);
  };

  const moveWidget = (id, direction) => {
    const items = sortItems();
    const row = items.find((item) => item.getAttribute("data-widget-id") === id);
    const index = items.indexOf(row);
    const next = index + direction;
    if (!row || next < 0 || next >= items.length) {
      return;
    }
    const target = items[next];
    playFlip(items, () => {
      if (direction < 0) {
        list.insertBefore(row, target);
      } else {
        list.insertBefore(row, target.nextSibling);
      }
    });
    syncMoveButtons();
    previewDraft(readDraftFromDom());
    row.querySelector(`[data-move="${direction < 0 ? "up" : "down"}"]`)?.focus();
  };

  const openDrawer = () => {
    persistOnClose = false;
    draft = readDashboardLayout();
    renderList();
    window.clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    root.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      root.classList.add("is-open");
      closeBtn?.focus();
    });
  };

  const closeDrawer = () => {
    if (sortSession) {
      stopSort(false);
    }
    if (!persistOnClose) {
      applyDashboardLayout(readDashboardLayout());
    }
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    window.clearBladeToasts?.();
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      } else {
        trigger.focus();
      }
    }, delay);
  };

  const saveLayout = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    draft = readDraftFromDom();
    writeDashboardLayout(draft);
    applyDashboardLayout(draft, { flash: true });
    persistOnClose = true;
    closeDrawer();
    window.setTimeout(() => {
      showBladeToast({
        content: "Dashboard layout saved",
        color: "positive",
        anchor: trigger instanceof HTMLElement ? trigger : null
      });
    }, 80);
  };

  const resetLayout = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (sortSession) {
      stopSort(false);
    }
    draft = defaultDashboardLayout();
    renderList();
    previewDraft(draft, { flash: true });
  };

  const trapFocus = (event) => {
    if (event.key !== "Tab" || root.hidden) {
      return;
    }
    const focusable = [...root.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
    );
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  applyDashboardLayout();

  trigger.addEventListener("click", openDrawer);
  root.addEventListener("click", (event) => {
    if (event.target.closest("#dash-layout-save")) {
      saveLayout(event);
      return;
    }
    if (event.target.closest("#dash-layout-reset")) {
      resetLayout(event);
      return;
    }
    if (event.target.closest("[data-drawer-dismiss]")) {
      closeDrawer();
    }
  });

  list.addEventListener("click", (event) => {
    const moveBtn = event.target.closest("[data-move]");
    if (!moveBtn || moveBtn.hasAttribute("disabled")) {
      return;
    }
    const row = moveBtn.closest("[data-widget-id]");
    if (!row) {
      return;
    }
    moveWidget(row.getAttribute("data-widget-id"), moveBtn.getAttribute("data-move") === "up" ? -1 : 1);
  });

  list.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
      return;
    }
    const row = input.closest("[data-widget-id]");
    row?.classList.toggle("is-off", !input.checked);
    previewDraft(readDraftFromDom());
  });

  list.addEventListener("pointerdown", (event) => {
    if (event.button || event.target.closest("[data-move], .blade-switch, a, input")) {
      return;
    }
    const row = event.target.closest(".widget-sort-item");
    if (!row) {
      return;
    }
    if (event.target.closest(".widget-sort-item__handle")) {
      event.preventDefault();
    }
    startSort(event, row);
  });

  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", (event) => {
    if (!sortSession || event.pointerId !== sortSession.pointerId) {
      return;
    }
    stopSort(Boolean(sortSession.active));
  });
  document.addEventListener("pointercancel", (event) => {
    if (!sortSession || event.pointerId !== sortSession.pointerId) {
      return;
    }
    stopSort(false);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (sortSession) {
        stopSort(false);
        return;
      }
      closeDrawer();
      return;
    }
    trapFocus(event);
  });
}

function knPlural(count, noun, pluralNoun) {
  return `${count} ${count === 1 ? noun : pluralNoun || `${noun}s`}`;
}

function knMotLabel(mot) {
  return (window.KN_MOT_LABELS || { ocean: "Ocean", air: "Air", truck: "Truck", rail: "Rail" })[mot] || mot;
}

function knBadgeClass(tone) {
  return `badge badge--${tone || "neutral"} type-caption-sm type-weight-medium`;
}

function setKnText(key, value) {
  document.querySelectorAll(`[data-kn="${key}"]`).forEach((node) => {
    node.textContent = value;
  });
}

function setKnCount(key, value) {
  const next = String(value);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(`[data-kn="${key}"]`).forEach((node) => {
    if (node.textContent === next) {
      return;
    }
    node.textContent = next;
    if (reduceMotion) {
      return;
    }
    node.classList.remove("kn-count-tick");
    void node.offsetWidth;
    node.classList.add("kn-count-tick");
  });
}

function hydrateDashWelcome() {
  const el = document.getElementById("dash-welcome");
  if (!el) {
    return;
  }
  try {
    if (window.localStorage.getItem("kn-welcome-seen") === "1") {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    window.localStorage.setItem("kn-welcome-seen", "1");
  } catch (error) {
    el.hidden = false;
  }
}

function replayDashEnter() {
  const root = document.querySelector(".dashboard-inner");
  if (!root || root.hidden) {
    return;
  }
  root.classList.remove("is-ready");
  void root.offsetWidth;
  root.classList.add("is-ready");
}

let khCountsAnimated = false;

function countUpOverview() {
  const page = document.getElementById("klearhub-overview-page");
  if (!page || page.hidden || khCountsAnimated) {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    khCountsAnimated = true;
    return;
  }
  khCountsAnimated = true;
  page.querySelectorAll("[data-kn]").forEach((node) => {
    const raw = node.textContent.trim();
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const end = Number(raw);
    const start = performance.now();
    const duration = 520;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      node.textContent = String(Math.round(end * t));
      if (t < 1) {
        window.requestAnimationFrame(tick);
      } else {
        node.textContent = raw;
      }
    };
    node.textContent = "0";
    window.requestAnimationFrame(tick);
  });
}

function hydrateDashGreeting(summary) {
  const hour = new Date().getHours();
  const greeting = hour < 5 || hour >= 21 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const title = document.getElementById("dash-greeting");
  const risk = document.getElementById("dash-risk-line");
  if (title) {
    title.textContent = `${greeting}, Brooke`;
  }
  hydrateDashWelcome();
  if (!risk) {
    return;
  }
  if (summary.hold) {
    const place = [...new Set((summary.holdRows || []).map((row) => row.location).filter(Boolean))][0];
    risk.textContent = place
      ? `${knPlural(summary.hold, "container needs you", "containers need you")} before ${place} cutoff.`
      : `${knPlural(summary.hold, "container on hold", "containers on hold")}`;
    return;
  }
  const demurrage = (summary.demurrageExceeded || 0) + (summary.demurrageRisk || 0);
  if (demurrage) {
    risk.textContent = `${knPlural(demurrage, "container", "containers")} at demurrage today`;
    return;
  }
  if (summary.action) {
    risk.textContent = `${knPlural(summary.action, "shipment needs action", "shipments need action")}`;
    return;
  }
  risk.textContent = "All live shipments are on track.";
}

function hydrateDashFromVisibility() {
  const summary = visSummary;
  hydrateDashGreeting(summary);
  const usd = window.knFormatUsd || ((value) => `$${value}`);
  const health = summary.total ? Math.round((summary.ontime / summary.total) * 100) : 0;
  const duty = (summary.rows || []).reduce((sum, item) => sum + (summary.amounts[item.id] || 0), 0);
  const demurrageUsd = summary.demurrageExceeded * 4280 + summary.demurrageRisk * 960;
  const invoiceRows = (summary.newest || []).slice(0, 3);
  const demurrageRows = (summary.rows || []).filter((item) => /port of delivery|ready for pickup/i.test(item.status || ""));
  const collected = (summary.rows || [])
    .filter((item) => !window.knIsActionNeeded?.(item))
    .reduce((sum, item) => sum + Math.round((summary.amounts[item.id] || 0) * 0.35), 0);
  const service = summary.total * 540;
  const oceanStart = 0;
  const airStart = summary.motPct.ocean || 0;
  const truckStart = airStart + (summary.motPct.air || 0);
  const railStart = truckStart + (summary.motPct.truck || 0);

  setKnText("active-total", String(summary.total));
  setKnText("in-transit", String(summary.inTransit));
  setKnCount("on-hold", summary.hold);
  setKnText("arrived", String(summary.arrived));
  setKnText("waiting", String(summary.waiting));
  setKnText("action", String(summary.action));
  setKnText("delayed", String(summary.delayed));
  setKnText("ontime", String(summary.ontime));
  setKnText("health-pct", `${health}%`);
  setKnText(
    "demurrage-desc",
    demurrageRows.length
      ? `${knPlural(demurrageRows.length, "container", "containers")} at terminal.`
      : "No containers at demurrage risk."
  );
  setKnText("alert-demurrage-total", String(demurrageRows.length));
  setKnText("alert-delay-total", String(summary.delayed));
  setKnText("alert-delay-eta", summary.earliestDelayEta || "—");
  const delayEtaWrapEl = document.getElementById("alert-delay-eta-wrap");
  if (delayEtaWrapEl) delayEtaWrapEl.hidden = !summary.earliestDelayEta;
  setKnText("alert-hold-total", String(summary.hold));
  setKnText(
    "delay-desc",
    `${knPlural(summary.delayed, "shipment delayed", "shipments delayed")}${summary.earliestDelayEta ? `. Earliest ETA ${summary.earliestDelayEta}.` : "."}`
  );
  setKnText("duty", usd(duty));
  setKnText("demurrage-usd", usd(demurrageUsd));
  setKnText("demurrage-trend", knPlural(summary.demurrageExceeded, "container exceeded", "containers exceeded"));
  setKnText("collected", usd(collected));
  setKnText("collected-trend", `${summary.ontime} on-track shipments · estimate`);
  setKnText("service", usd(service));
  setKnText("health-copy", `${health}% of active shipments are on track this month.`);
  setKnText("kh-active", String(summary.total));
  setKnText("kh-waiting", String(summary.waiting));
  setKnText("kh-containers", String(summary.total));
  setKnText("kh-in-transit", String(summary.inTransit));
  setKnText("kh-drayage", String(summary.arrived));
  setKnText("kh-demurrage", String(summary.demurrageExceeded + summary.demurrageRisk));
  setKnText("kh-delay", String(summary.delayed));
  setKnText("kh-demurrage-hint", knPlural(summary.demurrageExceeded, "due today", "due today"));
  setKnText("kh-delay-hint", summary.earliestDelayEta ? `Earliest ${summary.earliestDelayEta}` : "No delayed ETAs");
  setKnText("kh-risk-demurrage-exceeded", String(summary.demurrageExceeded));
  setKnText("kh-risk-per-diem-exceeded", String(summary.perDiemExceeded));
  setKnText("kh-risk-demurrage", String(summary.demurrageRisk));
  setKnText("kh-risk-per-diem", String(summary.perDiemRisk));
  setKnText("kh-not-released", String(summary.notReleased));
  setKnCount("kh-hold", summary.hold);
  setKnText("kh-ready", String(summary.readyPickup));
  setKnText("kh-gate-out", String(summary.gateOut));
  setKnText("kh-gate-in", "0");
  setKnText("kh-pol-wait", String(summary.waiting));
  setKnText("kh-pol-etd", String(countRows(summary.rows || [], (item) => /etd change/i.test(item.delay || ""))));
  setKnText("kh-transship", "0");
  setKnText("kh-pou-eta", String(summary.delayed));
  setKnText("kh-pou-at", String(summary.atPod));

  const healthFill = document.getElementById("dash-health-fill");
  const healthMeter = document.getElementById("dash-health-meter");
  if (healthFill) {
    healthFill.style.width = `${health}%`;
  }
  if (healthMeter) {
    healthMeter.setAttribute("aria-valuenow", String(health));
  }

  const urgent = document.getElementById("dash-drayage-urgent");
  if (urgent) {
    urgent.hidden = summary.arrived === 0;
  }

  const donut = document.getElementById("dash-donut");
  if (donut) {
    donut.style.background = `conic-gradient(
      var(--kn-color-background-interactive-primary-default) ${oceanStart}% ${airStart}%,
      var(--kn-color-icon-feedback-positive-intense) ${airStart}% ${truckStart}%,
      var(--kn-color-icon-feedback-notice-intense) ${truckStart}% ${railStart}%,
      var(--kn-color-icon-feedback-information-intense) ${railStart}% 100%
    )`;
    donut.setAttribute(
      "aria-label",
      `${summary.motPct.ocean} percent ocean, ${summary.motPct.air} percent air, ${summary.motPct.truck} percent truck, ${summary.motPct.rail} percent rail`
    );
  }
  const motLegend = document.getElementById("dash-mot-legend");
  if (motLegend) {
    motLegend.innerHTML = `
      <li><span class="dash-legend__swatch chart-cat--blue"></span> Ocean ${summary.motPct.ocean}%</li>
      <li><span class="dash-legend__swatch chart-cat--green"></span> Air ${summary.motPct.air}%</li>
      <li><span class="dash-legend__swatch chart-cat--gold"></span> Truck ${summary.motPct.truck}%</li>
      <li><span class="dash-legend__swatch chart-cat--sky"></span> Rail ${summary.motPct.rail}%</li>
    `;
  }

  const arrivalsList = document.getElementById("dash-arrivals");
  if (arrivalsList) {
    arrivalsList.innerHTML = (summary.arrivals || [])
      .map((item) => {
        const tone = item.status === "On Hold" ? "negative" : item.statusTone;
        return `
          <li class="blade-list__item" data-map-id="${item.id}">
            <div>
              <p class="type-ui-md type-weight-semibold">${item.id}</p>
              <p class="type-caption-sm">${item.origin.city} → ${item.dest.city} • ${knMotLabel(item.mot)}</p>
            </div>
            <span class="${knBadgeClass(tone)}">${item.status}</span>
          </li>
        `;
      })
      .join("");
  }

  const waitingIsf = (summary.rows || []).find((item) => /waiting to depart/i.test(item.status || "") && item.mot === "ocean");
  const arrivalNotice = (summary.rows || []).find((item) => /port of delivery/i.test(item.status || ""));
  const invoiceItem = invoiceRows[0];
  const filings = document.getElementById("dash-filings");
  if (filings) {
    const isfTip =
      '<button type="button" class="info-tip" aria-label="About ISF" data-tooltip="Importer Security Filing. Required 24 hours before the vessel leaves the origin port."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg></button>';
    const items = [];
    if (waitingIsf) {
      items.push(`
        <li class="blade-list__item" data-map-id="${waitingIsf.id}">
          <div>
            <p class="type-ui-md type-weight-semibold">ISF · ${waitingIsf.container} ${isfTip}</p>
            <p class="type-caption-sm">${waitingIsf.company} · ${waitingIsf.origin.city}</p>
          </div>
          <span class="${knBadgeClass("positive")}">Filed</span>
        </li>
      `);
    }
    if (arrivalNotice) {
      items.push(`
        <li class="blade-list__item" data-map-id="${arrivalNotice.id}">
          <div>
            <p class="type-ui-md type-weight-semibold">Arrival notice · ${arrivalNotice.container}</p>
            <p class="type-caption-sm">${arrivalNotice.dest.city} · ${arrivalNotice.id}</p>
          </div>
          <span class="${knBadgeClass("notice")}">In review</span>
        </li>
      `);
    }
    if (invoiceItem) {
      items.push(`
        <li class="blade-list__item" data-map-id="${invoiceItem.id}">
          <div>
            <p class="type-ui-md type-weight-semibold">Charge · ${invoiceItem.po}</p>
            <p class="type-caption-sm">${invoiceItem.company} · ${usd(summary.amounts[invoiceItem.id])} est.</p>
          </div>
          <span class="${knBadgeClass("information")}">Pending</span>
        </li>
      `);
    }
    filings.innerHTML = items.join("");
  }

  const lanes = document.getElementById("dash-lanes");
  if (lanes) {
    const rows = originLaneRows(summary.origin);
    const max = rows[0]?.counts.total || 1;
    lanes.setAttribute("aria-label", "Shipments by origin country");
    lanes.innerHTML = rows
      .map((row) => {
        const rowTip = row.label === "Other" ? ` data-tooltip="${attrTip(row.hint)}" tabindex="0"` : "";
        return `
          <div class="dash-bars__row"${rowTip}>
            <span class="dash-bars__label type-caption-sm">${row.label}</span>
            <div class="dash-bars__track">
              ${laneSegHtml("blue", "ocean", row.counts.ocean, max, row.namesByMot?.ocean)}
              ${laneSegHtml("green", "air", row.counts.air, max, row.namesByMot?.air)}
              ${laneSegHtml("gold", "truck", row.counts.truck, max, row.namesByMot?.truck)}
              ${laneSegHtml("sky", "rail", row.counts.rail, max, row.namesByMot?.rail)}
            </div>
            <strong class="dash-bars__value type-caption-sm">${row.counts.total}</strong>
          </div>
        `;
      })
      .join("");
  }

  const recentBody = document.getElementById("dash-recent-body");
  if (recentBody) {
    recentBody.innerHTML = (summary.newest || [])
      .slice(0, 4)
      .map((item) => {
        const tone = item.status === "On Hold" ? "negative" : item.statusTone;
        return `
          <tr data-map-id="${item.id}">
            <th scope="row"><code class="code type-caption-sm" data-copy="${item.id}" data-copy-label="Shipment ID">${item.id}</code></th>
            <td>${item.origin.code} → ${item.dest.code}</td>
            <td>${item.company}</td>
            <td><span class="${knBadgeClass(tone)}">${item.status}</span></td>
            <td class="vis-table__num"><span class="amount">${usd(summary.amounts[item.id])}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  const notifCount = document.querySelector("[data-nav-count='notifications']");
  if (notifCount) {
    notifCount.textContent = String(summary.action);
    notifCount.setAttribute("aria-label", `${summary.action} shipments need action`);
  }

  const invoices = document.getElementById("dash-invoices");
  if (invoices) {
    invoices.innerHTML = invoiceRows
      .map((item) => `
        <li class="blade-list__item" data-map-id="${item.id}">
          <div>
            <p class="type-ui-md type-weight-semibold">${item.po}</p>
            <p class="type-caption-sm">${item.id} · estimate</p>
          </div>
          <span class="amount type-ui-sm type-weight-semibold">${usd(summary.amounts[item.id])}</span>
        </li>
      `)
      .join("");
  }

  const holdsWhy = document.getElementById("quick-action-holds-why");
  if (holdsWhy) {
    holdsWhy.textContent = knPlural(summary.hold, "container on hold", "containers on hold");
  }
  const visWhy = document.getElementById("quick-action-vis-why");
  if (visWhy) {
    visWhy.textContent = summary.action
      ? knPlural(summary.action, "shipment needs action", "shipments need action")
      : "Search live shipments";
  }
}

function initAiAssistant() {
  const triggers = [...document.querySelectorAll(".ai-assistant-trigger")];
  const panel = document.getElementById("ai-assistant-panel");
  const closeBtn = document.getElementById("ai-assistant-close");
  const form = document.getElementById("ai-assistant-form");
  const input = document.getElementById("ai-assistant-input");
  const sendBtn = document.getElementById("ai-assistant-send");
  const history = document.getElementById("ai-assistant-history");
  const liveRegion = document.getElementById("ai-assistant-live");
  const refChip = document.getElementById("ai-assistant-ref");
  const refChipText = document.getElementById("ai-assistant-ref-text");
  const refChipDismiss = document.getElementById("ai-assistant-ref-dismiss");
  const resizeHandle = document.getElementById("ai-assistant-resize");
  const helpBtn = document.getElementById("ai-assistant-help");
  const introEl = document.getElementById("ai-assistant-intro");
  const introHeading = document.getElementById("ai-assistant-intro-heading");
  const introGreeting = document.getElementById("ai-assistant-intro-greeting");
  const introPrompts = document.getElementById("ai-assistant-intro-prompts");
  const flagsSlot = document.getElementById("ai-assistant-flags");
  if (!shell || !panel || !form || !input || !history || !resizeHandle || !triggers.length) {
    return;
  }

  const WIDTH_MIN = 360;
  const WIDTH_MAX = 600;
  const WIDTH_DEFAULT = 430;
  const WIDTH_STEP = 20;
  const WIDTH_STORAGE_KEY = "kn-ai-assistant-width";
  const ACTION_INTENT = /\b(add|create|edit|update|delete|remove|assign|deactivate|activate|save|submit|change)\b/i;
  const COACHMARK_SEEN_KEY = "kn-ai-assistant-coachmark-seen";
  const INTRO_SEEN_KEY = "kn-ai-assistant-intro-seen";
  const COACHMARK_COPY = "New: Klear Assistant flags holds and coverage on this page. Suggests only.";
  const ELEVATED_ROLE = /administrator|access manager|user access/i;
  const MSG_ACTION_COPY =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M4.5 13V4.5A1.5 1.5 0 0 1 6 3h7"/></svg>';
  const MSG_ACTION_UP =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5h7.2a1.5 1.5 0 0 0 1.45-1.12l1.1-4.38A1.2 1.2 0 0 0 15.1 10.5H12V5.8A1.8 1.8 0 0 0 10.2 4L7.5 10.5H5.2A1.2 1.2 0 0 0 4 11.7v4.6A1.2 1.2 0 0 0 5.2 17.5H6.5Z"/></svg>';
  const MSG_ACTION_DOWN =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 2.5H6.3A1.5 1.5 0 0 0 4.85 3.62l-1.1 4.38A1.2 1.2 0 0 0 4.9 9.5H8v4.7A1.8 1.8 0 0 0 9.8 16l2.7-6.5h2.3A1.2 1.2 0 0 0 16 8.3V3.7A1.2 1.2 0 0 0 14.8 2.5H13.5Z"/></svg>';
  let isOpen = false;
  let preferredWidth = WIDTH_DEFAULT;
  let lastTrigger = null;
  let coachmarkEl = null;
  let ftueLive = null;
  let coachmarkVisible = false;
  let coachmarkListening = false;
  let pendingDraftPayload = null;
  let refChipDismissed = false;
  let generationId = 0;
  let isResponding = false;
  let streamTimer = null;

  function readStoredWidth() {
    try {
      const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
      if (raw == null) {
        return WIDTH_DEFAULT;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return WIDTH_DEFAULT;
      }
      /* Reset L1 experiment widths (240/264) below the restored min. */
      if (parsed < WIDTH_MIN) {
        window.localStorage.removeItem(WIDTH_STORAGE_KEY);
        return WIDTH_DEFAULT;
      }
      return parsed;
    } catch (_error) {
      return WIDTH_DEFAULT;
    }
  }

  function persistWidth(px) {
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(px));
    } catch (_error) {
      /* private mode / quota */
    }
  }

  function syncWidthBounds() {
    resizeHandle.setAttribute("aria-valuemin", String(WIDTH_MIN));
    resizeHandle.setAttribute("aria-valuemax", String(WIDTH_MAX));
  }

  syncWidthBounds();
  preferredWidth = readStoredWidth();

  function clampWidth(next) {
    const viewportMax = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.floor(window.innerWidth * 0.6)));
    return Math.max(WIDTH_MIN, Math.min(viewportMax, next));
  }

  function updateWidth(next, { persist = true } = {}) {
    preferredWidth = Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, next));
    const applied = clampWidth(preferredWidth);
    shell.style.setProperty("--ai-assistant-width", `${applied}px`);
    resizeHandle.setAttribute("aria-valuenow", String(applied));
    if (persist) {
      persistWidth(preferredWidth);
    }
  }

  function setExpandedState(expanded) {
    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", String(expanded));
      trigger.setAttribute("aria-pressed", String(expanded));
      trigger.setAttribute("aria-label", expanded ? "Close Klear Assistant" : "Open Klear Assistant");
    });
    panel.setAttribute("aria-hidden", String(!expanded));
    panel.inert = !expanded;
  }

  function hasSeenFlag(key) {
    try {
      return window.localStorage.getItem(key) === "1";
    } catch (_error) {
      return false;
    }
  }

  function markSeenFlag(key) {
    try {
      window.localStorage.setItem(key, "1");
    } catch (_error) {
      /* private mode / quota */
    }
  }

  function announceFtue(text) {
    if (!ftueLive) {
      ftueLive = document.createElement("div");
      ftueLive.className = "visually-hidden";
      ftueLive.id = "ai-assistant-ftue-live";
      ftueLive.setAttribute("role", "status");
      ftueLive.setAttribute("aria-live", "polite");
      document.body.appendChild(ftueLive);
    }
    ftueLive.textContent = "";
    window.requestAnimationFrame(() => {
      ftueLive.textContent = text;
    });
  }

  function getVisibleTrigger() {
    return (
      triggers.find((trigger) => {
        const style = window.getComputedStyle(trigger);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
        const rect = trigger.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || triggers[0]
    );
  }

  function setCoachmarkBadges(visible) {
    triggers.forEach((trigger) => {
      trigger.classList.toggle("has-ai-coachmark", visible);
    });
  }

  function placeCoachmark() {
    if (!coachmarkEl || !coachmarkVisible) {
      return;
    }
    const trigger = getVisibleTrigger();
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const tipRect = coachmarkEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.min(Math.max(8, left), window.innerWidth - tipRect.width - 8);
    const top = Math.min(rect.bottom + gap, window.innerHeight - tipRect.height - 8);
    coachmarkEl.style.top = `${Math.round(Math.max(8, top))}px`;
    coachmarkEl.style.left = `${Math.round(left)}px`;
    coachmarkEl.setAttribute("data-placement", "bottom");
    coachmarkEl.style.setProperty("--coach-arrow-left", `${Math.round(rect.left + rect.width / 2 - left)}px`);
  }

  function onCoachmarkDocumentClick(event) {
    if (!coachmarkVisible || !coachmarkEl) {
      return;
    }
    if (coachmarkEl.contains(event.target)) {
      return;
    }
    dismissCoachmark();
  }

  function dismissCoachmark() {
    coachmarkVisible = false;
    markSeenFlag(COACHMARK_SEEN_KEY);
    setCoachmarkBadges(false);
    if (coachmarkEl) {
      coachmarkEl.hidden = true;
    }
    if (coachmarkListening) {
      document.removeEventListener("click", onCoachmarkDocumentClick, true);
      coachmarkListening = false;
    }
  }

  function showCoachmark() {
    if (hasSeenFlag(COACHMARK_SEEN_KEY)) {
      setCoachmarkBadges(false);
      return;
    }
    setCoachmarkBadges(true);
    if (!coachmarkEl) {
      coachmarkEl = document.createElement("div");
      coachmarkEl.className = "blade-tooltip blade-tooltip--coachmark type-caption-sm";
      coachmarkEl.id = "ai-assistant-coachmark";
      coachmarkEl.innerHTML = `
        <p id="ai-assistant-coachmark-copy">${COACHMARK_COPY}</p>
        <button class="icon-btn icon-btn--on-dark" type="button" id="ai-assistant-coachmark-dismiss" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      `;
      coachmarkEl.hidden = true;
      document.body.appendChild(coachmarkEl);
      coachmarkEl.querySelector("#ai-assistant-coachmark-dismiss").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dismissCoachmark();
      });
    }
    coachmarkEl.hidden = false;
    coachmarkVisible = true;
    announceFtue(COACHMARK_COPY);
    if (!coachmarkListening) {
      document.addEventListener("click", onCoachmarkDocumentClick, true);
      coachmarkListening = true;
    }
    window.requestAnimationFrame(() => placeCoachmark());
  }

  function getSignedInFirstName() {
    const full =
      document.querySelector(".profile-text__name")?.textContent?.trim() ||
      document.querySelector("#profile-menu .type-ui-md.type-weight-semibold")?.textContent?.trim() ||
      "";
    if (full) {
      return full.split(/\s+/)[0];
    }
    const initials = document.querySelector(".avatar-trigger .avatar")?.textContent?.trim() || "";
    if (initials.length >= 1) {
      return initials.charAt(0).toUpperCase();
    }
    return "there";
  }

  function greetingCopy() {
    return `Hello, ${getSignedInFirstName()}`;
  }

  function introHeadline(context) {
    if (context?.headline) {
      return String(context.headline);
    }
    if (context?.kind === "role-detail" || context?.kind === "user-detail" || context?.kind === "default-detail" || context?.kind === "visibility-detail") {
      return `Ask me anything about ${context.title}`;
    }
    if (context?.area && context.area !== "this page") {
      return `Ask me anything on ${context.area}`;
    }
    return "Ask about holds, coverage, or this record";
  }

  const PROMPT_ICON_SVG = {
    chart:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 16.5V9.5M8.5 16.5V5.5M13.5 16.5v-4M18.5 16.5V7.5"/></svg>',
    compare:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5 3.5 7 6 9.5M14 10.5 16.5 13 14 15.5M4 7h8.5M7.5 13H16"/></svg>',
    flag:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 17V3.5M4.5 3.5h8.2l-1.4 3.2 1.4 3.2H4.5"/></svg>',
    tip:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5a5 5 0 0 1 3.2 8.8c-.5.4-.8 1-.8 1.6v.6H7.6v-.6c0-.6-.3-1.2-.8-1.6A5 5 0 0 1 10 3.5ZM8 16.5h4"/></svg>',
    nav:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10h11M11 5.5 15.5 10 11 14.5"/></svg>',
    ask:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17a7 7 0 1 0-6.7-9.1L3 13l5.1-.3A7 7 0 0 0 10 17Z"/></svg>'
  };

  function resolvePromptIcon(item) {
    const explicit = String(item?.icon || "").trim().toLowerCase();
    if (PROMPT_ICON_SVG[explicit]) {
      return explicit;
    }
    const text = `${item?.label || ""} ${item?.prompt || ""}`.toLowerCase();
    if (/coverage|chart|volume|count|snapshot|split|inherit|permission coverage/.test(text)) {
      return "chart";
    }
    if (/compare|vs |versus|differ|ocean vs|with the rest|with catalog/.test(text)) {
      return "compare";
    }
    if (/inactive|status|flag|hold|delay|action|elevated|owner and status/.test(text)) {
      return "flag";
    }
    if (/where|navigate|open|add a |go to|look first/.test(text)) {
      return "nav";
    }
    if (/before|miss|confirm|check|review|know|should i/.test(text)) {
      return "tip";
    }
    return "ask";
  }

  function fillPromptChips(container, context) {
    if (!container) {
      return;
    }
    container.replaceChildren();
    starterPrompts(context).forEach((item) => {
      const iconKey = resolvePromptIcon(item);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ai-prompt-chip type-body-sm";
      button.setAttribute("data-ai-prompt", item.prompt);
      const newSuffix = item.isNew ? ", new suggestion" : "";
      button.setAttribute("aria-label", `Ask: ${item.prompt}${newSuffix}`);
      button.innerHTML = `
        <span class="ai-prompt-chip__icon" aria-hidden="true">${PROMPT_ICON_SVG[iconKey] || PROMPT_ICON_SVG.ask}</span>
        <span class="ai-prompt-chip__body">
          <span class="ai-prompt-chip__label">${escapeHtml(item.label)}</span>
          ${
            item.isNew
              ? `<span class="ai-prompt-chip__new" aria-hidden="true">NEW</span><span class="visually-hidden">New suggestion</span>`
              : ""
          }
        </span>
      `;
      container.appendChild(button);
    });
  }

  function setGreetingAndHeadline(greetingEl, headingEl, context) {
    if (greetingEl) {
      greetingEl.textContent = greetingCopy();
    }
    if (headingEl) {
      headingEl.textContent = introHeadline(context);
    }
  }

  function fillIntro(context) {
    setGreetingAndHeadline(introGreeting, introHeading, context);
    fillPromptChips(introPrompts, context);
  }

  function showIntro() {
    if (!introEl) {
      hideIntro();
      renderEmptyState();
      window.requestAnimationFrame(() => input.focus());
      return;
    }
    fillIntro(getContext());
    introEl.hidden = false;
    history.hidden = true;
    form.hidden = false;
    helpBtn?.setAttribute("aria-expanded", "true");
    announceFtue("Klear Assistant. Answers use records on this page. Suggests only — it cannot change records.");
    window.requestAnimationFrame(() => input.focus());
  }

  function hideIntro() {
    if (introEl) {
      introEl.hidden = true;
    }
    history.hidden = false;
    form.hidden = false;
    helpBtn?.setAttribute("aria-expanded", "false");
  }

  function finishIntro() {
    markSeenFlag(INTRO_SEEN_KEY);
    hideIntro();
    if (!history.querySelector(".ai-msg--user")) {
      renderEmptyState();
    }
    window.requestAnimationFrame(() => input.focus());
  }

  function dismissIntroIfNeeded() {
    if (introEl && !introEl.hidden) {
      markSeenFlag(INTRO_SEEN_KEY);
      hideIntro();
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readRows(storageKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function readAdminRows(storageKey, lister) {
    const stored = readRows(storageKey);
    if (stored.length) {
      return stored;
    }
    try {
      const listed = typeof lister === "function" ? lister() : null;
      return Array.isArray(listed) ? listed : [];
    } catch (_error) {
      return [];
    }
  }

  function permCount(role) {
    return Array.isArray(role?.permissions) ? role.permissions.length : 0;
  }

  function inheritCount(role) {
    const named = Number(role?.inherited);
    if (Number.isFinite(named) && named > 0) {
      return named;
    }
    return Array.isArray(role?.customers) ? role.customers.length : 0;
  }

  const PARTY_LABELS = {
    customer: "Customer",
    "sub-customer": "Sub-customer",
    company: "Company",
    parties: "Parties",
    klearnow: "KlearNow"
  };

  const SERVICE_LABELS = {
    all: "ALL",
    ai: "AI",
    "customs-broker": "Customs Clearance Broker Service",
    "customs-engine": "Customs Engine",
    "data-engine": "Data Engine",
    drayage: "Drayage",
    "klear-360": "Klear 360"
  };

  const THINKING_CHEVRON =
    '<svg class="ai-msg__thinking-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg>';

  function partyLabel(id) {
    const key = String(id || "").toLowerCase();
    return PARTY_LABELS[key] || id || "";
  }

  function serviceLabel(id) {
    const key = String(id || "").toLowerCase();
    return SERVICE_LABELS[key] || id || "";
  }

  function formatPartyList(ids) {
    return formatList((ids || []).map(partyLabel).filter(Boolean));
  }

  function formatServiceList(ids) {
    return formatList((ids || []).map(serviceLabel).filter(Boolean));
  }

  function getSignedInPersona() {
    const role =
      document.querySelector(".profile-text__role")?.textContent?.trim() ||
      document.querySelector("#profile-menu .menu-profile__copy .type-caption-sm")?.textContent?.trim() ||
      "";
    return {
      firstName: getSignedInFirstName(),
      role
    };
  }

  function permissionApiFor(kind) {
    if (String(kind || "").startsWith("default")) {
      return {
        total: () => Number(window.KNDefaultRoles?.permissionTotal?.()) || 0,
        catalog: () => window.KNDefaultRoles?.permissionCatalog?.() || null
      };
    }
    if (String(kind || "").startsWith("role")) {
      return {
        total: () => Number(window.KNRoles?.permissionTotal?.()) || 0,
        catalog: () => window.KNRoles?.permissionCatalog?.() || null
      };
    }
    return { total: () => 0, catalog: () => null };
  }

  function coverageFacts(role, kind) {
    const count = permCount(role);
    const api = permissionApiFor(kind);
    const total = api.total();
    const catalog = api.catalog();
    const summary =
      catalog && window.KNAdminUX?.accessSummary
        ? window.KNAdminUX.accessSummary(role?.permissions || [], catalog, ["create", "update", "delete", "read"])
        : "";
    const ratio = total ? `${count}/${total}` : String(count);
    let mostly = "";
    if (summary) {
      const mostlyMatch = summary.match(/mostly in (.+)$/i);
      const mainlyMatch = summary.match(/mainly in (.+)$/i);
      const acrossMatch = summary.match(/across (.+)$/i);
      mostly = (mostlyMatch || mainlyMatch || acrossMatch)?.[1] || "";
    }
    return { count, total, ratio, summary, mostly };
  }

  function textAnswer({ title, thinking, text, followUps, sources, evidence }) {
    return {
      mode: "text",
      title: title || "",
      thinking: Array.isArray(thinking) ? thinking.filter(Boolean) : [],
      evidence: Array.isArray(evidence) ? evidence.filter(Boolean) : [],
      sources: Array.isArray(sources) ? sources.filter(Boolean) : [],
      text: text || "",
      followUps: Array.isArray(followUps) ? followUps.filter(Boolean) : []
    };
  }

  function followUpsFromContext(context, excludePrompt = "") {
    const skip = String(excludePrompt || "").toLowerCase();
    return starterPrompts(context)
      .filter((item) => item.prompt.toLowerCase() !== skip)
      .slice(0, 3);
  }

  function findNamedAccess(name) {
    const needle = String(name || "").trim().toLowerCase();
    if (!needle) {
      return null;
    }
    const defaults = readAdminRows("kn-default-roles-v3", () => window.KNDefaultRoles?.list?.());
    const roles = readAdminRows("kn-roles-v2", () => window.KNRoles?.list?.());
    const defHit = defaults.find((item) => String(item.name || "").toLowerCase() === needle);
    if (defHit) {
      return {
        role: defHit,
        kind: "default",
        catalog: window.KNDefaultRoles?.permissionCatalog?.() || [],
        href: `#default-role-management/${encodeURIComponent(defHit.id)}`,
        page: "Default Role Management",
        pageHref: "#default-role-management"
      };
    }
    const knHit = roles.find((item) => String(item.name || "").toLowerCase() === needle);
    if (knHit) {
      return {
        role: knHit,
        kind: "role",
        catalog: window.KNRoles?.permissionCatalog?.() || [],
        href: `#kn-role-management/${encodeURIComponent(knHit.id)}`,
        page: "KN Role Management",
        pageHref: "#kn-role-management"
      };
    }
    return null;
  }

  function parseCompareNames(question) {
    const q = String(question || "").trim();
    const between = q.match(/different between\s+(.+?)\s+and\s+(.+?)\??$/i);
    if (between) {
      return [between[1], between[2]].map((part) => part.replace(/^["']|["']$/g, "").trim());
    }
    const vs = q.match(/compare\s+(.+?)\s+(?:vs\.?|versus|and|with)\s+(.+?)\??$/i);
    if (vs) {
      return [vs[1], vs[2]].map((part) => part.replace(/^["']|["']$/g, "").trim());
    }
    if (/customer administrator/i.test(q) && /full customer access/i.test(q)) {
      return ["Customer Administrator", "Full Customer Access"];
    }
    return null;
  }

  function answerCategoryDiff(question) {
    const names = parseCompareNames(question);
    if (!names) {
      return null;
    }
    const left = findNamedAccess(names[0]);
    const right = findNamedAccess(names[1]);
    if (!left && !right) {
      return textAnswer({
        title: "Those templates are not in this session",
        thinking: ["Looked up both names in Default Role Management and KN Role Management"],
        evidence: ["Used catalogs: kn-default-roles-v3, kn-roles-v2"],
        text: `No records named **${names[0]}** or **${names[1]}** are stored in this session.\n\nOpen **Default Role Management** (templates) or **KN Role Management** (internal roles) and ask again.`,
        sources: [
          { label: "Default Role Management", href: "#default-role-management", type: "page", id: "defaults" },
          { label: "KN Role Management", href: "#kn-role-management", type: "page", id: "roles" }
        ]
      });
    }
    if (!left || !right) {
      const missing = left ? names[1] : names[0];
      const found = left || right;
      return textAnswer({
        title: `${missing} is not in this session`,
        thinking: [`Found ${found.role.name} on ${found.page}`, `Did not find ${missing} in stored catalogs`],
        evidence: [`Used record: ${found.role.name} (${found.page})`],
        text: `**${found.role.name}** is on **${found.page}**. **${missing}** is not in this session, so I cannot invent a side-by-side.\n\nOpen **Default Role Management** if that name is a customer template.`,
        sources: [
          { label: found.role.name, href: found.href, type: found.kind === "default" ? "default-role" : "role", id: found.role.id },
          { label: found.page, href: found.pageHref, type: "page", id: found.pageHref }
        ]
      });
    }
    const catalog = left.catalog?.length ? left.catalog : right.catalog;
    const diffs = window.KNAdminUX?.diffRoleCategories?.(left.role.permissions, right.role.permissions, catalog) || [];
    const leftCov = coverageFacts(left.role, left.kind === "default" ? "defaults" : "roles");
    const rightCov = coverageFacts(right.role, right.kind === "default" ? "defaults" : "roles");
    const lines = diffs.length
      ? diffs
          .slice(0, 8)
          .map((row) => `- **${row.title}**: **${left.role.name}** **${row.a}/${row.total}** · **${right.role.name}** **${row.b}/${row.total}**`)
          .join("\n")
      : "- Category counts match on the catalogs in this session.";
    return textAnswer({
      title: `${left.role.name} vs ${right.role.name}`,
      thinking: [
        `Opened ${left.role.name} on ${left.page}`,
        `Opened ${right.role.name} on ${right.page}`,
        "Diffed permission counts by category"
      ],
      evidence: [
        `Used record: ${left.role.name} (${leftCov.ratio})`,
        `Used record: ${right.role.name} (${rightCov.ratio})`
      ],
      text: `**${left.role.name}** has **${leftCov.ratio}** permissions. **${right.role.name}** has **${rightCov.ratio}**.\n\n${lines}\n\nOpen either name to review the drawer. I will not change permissions.`,
      sources: [
        { label: left.role.name, href: left.href, type: left.kind === "default" ? "default-role" : "role", id: left.role.id },
        { label: right.role.name, href: right.href, type: right.kind === "default" ? "default-role" : "role", id: right.role.id }
      ]
    });
  }

  function holdChainFromStats(stats) {
    const row =
      (stats?.holdRows || []).find((item) => item.document && item.broker) ||
      (stats?.holdRows || [])[0] ||
      null;
    if (!row) {
      return null;
    }
    const full = (stats?.rows || window.KNShipments || []).find((item) => item.id === row.id) || row;
    return {
      ...row,
      document: row.document || full.mbol || "",
      broker: row.broker || full.broker || "",
      brokerUserId: row.brokerUserId || full.brokerUserId || "",
      container: row.container || full.container || ""
    };
  }

  function answerHoldChain(stats, context) {
    const row = holdChainFromStats(stats);
    if (!row) {
      return textAnswer({
        title: "No hold rows on this view",
        thinking: [`Checked hold rows on ${context.area || "this page"}`],
        evidence: [`Used view: ${context.area || "this page"}`],
        text: `This view lists **${stats?.hold || 0}** holds, but no hold row with a linked bill and broker is in the current session.\n\nOpen **Visibility** and select a hold.`,
        sources: [{ label: "Visibility", href: "#klearhub-visibility", type: "page", id: "visibility" }]
      });
    }
    const amount = typeof knShipmentAmount === "function" ? knFormatUsd(knShipmentAmount(row.id)) : "";
    return textAnswer({
      title: `${row.id}: hold → document → broker`,
      thinking: [
        `Used shipment ${row.id}`,
        row.document ? `Used document ${row.document}` : "No master bill on this hold row",
        row.broker ? `Used responsible broker ${row.broker}` : "No broker on this hold row"
      ],
      evidence: [
        `Used record: ${row.id}`,
        row.document ? `Used document: ${row.document}` : "",
        row.broker ? `Used broker: ${row.broker}` : ""
      ],
      text: `**${row.id}** is on hold${row.container ? ` (**${row.container}**)` : ""}${row.reason ? ` — **${row.reason}**` : ""}.\n\n- Linked document: **${row.document || "not on this record"}**\n- Responsible broker: **${row.broker || "not on this record"}**${amount ? `\n- Estimated value on file: **${amount}**` : ""}\n\nI cannot release the hold from here.`,
      sources: [
        { label: row.id, href: "#klearhub-visibility", type: "shipment", id: row.id },
        row.brokerUserId
          ? { label: row.broker, href: `#kn-user-management/${encodeURIComponent(row.brokerUserId)}`, type: "user", id: row.brokerUserId }
          : null,
        { label: "Visibility", href: "#klearhub-visibility", type: "page", id: "visibility" }
      ].filter(Boolean)
    });
  }

  function pageHrefFor(context) {
    const kind = context?.kind || "";
    if (kind.startsWith("default")) {
      return "#default-role-management";
    }
    if (kind.startsWith("role")) {
      return "#kn-role-management";
    }
    if (kind.startsWith("user")) {
      return "#kn-user-management";
    }
    if (kind === "visibility" || kind === "visibility-detail") {
      return "#klearhub-visibility";
    }
    if (kind === "overview") {
      return "#klearhub-overview";
    }
    if (kind === "dashboard") {
      return "#dashboard";
    }
    return "";
  }

  function sortByPerm(roles, dir = "asc") {
    return [...roles].sort((a, b) => {
      const delta = permCount(a) - permCount(b);
      return dir === "asc" ? delta : -delta;
    });
  }

  function isElevatedRoleName(name) {
    return ELEVATED_ROLE.test(String(name || ""));
  }

  function formatList(names, max = 3) {
    const items = (names || []).filter(Boolean);
    if (!items.length) {
      return "none";
    }
    if (items.length === 1) {
      return items[0];
    }
    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }
    if (items.length <= max) {
      return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
    }
    return `${items.slice(0, max).join(", ")}, and ${items.length - max} more`;
  }

  function visStats() {
    const summary = visSummary || {};
    return {
      total: Number(summary.total) || 0,
      hold: Number(summary.hold) || 0,
      delayed: Number(summary.delayed) || 0,
      action: Number(summary.action) || 0,
      ontime: Number(summary.ontime) || 0,
      arrived: Number(summary.arrived) || 0,
      inTransit: Number(summary.inTransit) || 0,
      mot: summary.mot || {},
      motPct: summary.motPct || {},
      holdRows: summary.holdRows || [],
      delayedRows: summary.delayedRows || [],
      rows: summary.rows || []
    };
  }

  function topMode(stats) {
    const mot = stats?.motPct || stats?.mot || {};
    const entries = Object.entries(mot).filter(([, value]) => Number(value) > 0);
    if (!entries.length) {
      return null;
    }
    entries.sort((a, b) => Number(b[1]) - Number(a[1]));
    return { id: entries[0][0], value: Number(entries[0][1]) };
  }

  function emptyDestination(title) {
    const toVisibility = /ops|notification|transaction|shipments/i.test(title || "");
    return {
      name: toVisibility ? "Visibility" : "Dashboard",
      path: toVisibility ? "KlearHub -> Visibility" : "Dashboard"
    };
  }

  function levelLabel(level) {
    const key = String(level || "").toUpperCase();
    if (key === "KLEARNOW") {
      return "KlearNow";
    }
    if (key === "CUSTOMER") {
      return "customer";
    }
    if (key === "BROKER") {
      return "broker";
    }
    return level || "workspace";
  }

  function contextOf(partial) {
    return {
      kind: "generic",
      area: "this page",
      title: "this page",
      summary: "",
      hint: "I explain what is on screen. I do not create, edit, or delete records.",
      details: [],
      prompts: [],
      manualPath: "Use the left navigation to open the relevant module",
      facts: {},
      ...partial
    };
  }

  function rolesContext(hash) {
    const roles = readAdminRows("kn-roles-v2", () => window.KNRoles?.list?.());
    const lowest = sortByPerm(roles, "asc")[0] || null;
    const highest = sortByPerm(roles, "desc")[0] || null;
    const inactive = roles.filter((role) => role.active === false);
    const addForm = hash === "#kn-role-management/add";
    const editMatch = hash.match(/^#kn-role-management\/edit\/([^/]+)/);
    const detailMatch = hash.match(/^#kn-role-management\/([^/]+)$/);
    const recordId = editMatch
      ? decodeURIComponent(editMatch[1])
      : detailMatch && detailMatch[1] !== "add"
        ? decodeURIComponent(detailMatch[1])
        : "";
    const role = recordId ? roles.find((row) => row.id === recordId) : null;

    if (addForm) {
      return contextOf({
        kind: "role-add",
        area: "KN Role Management",
        title: "New role",
        summary: "You're on the new-role form, not the catalog. I can explain fields and permission groups; saving still happens with the actions on this page.",
        hint: "I will not create the role. Ask what is easy to miss before you save.",
        details: ["Permission groups map to KlearNow modules. Applicability is required before save."],
        prompts: [
          { label: "Before you save", prompt: "What should I know before saving a new KN role?" },
          { label: "Permission groups", prompt: "How do permission groups on this form map to KlearNow modules?" },
          { label: "Easy to miss", prompt: "What is easy to miss on this form?" }
        ],
        manualPath: "Administration -> KN Role Management -> Add Role -> Save",
        facts: { roles, lowest, highest }
      });
    }

    if (role) {
      return contextOf({
        kind: "role-detail",
        area: "KN Role Management",
        title: role.name,
        summary: `${role.name} is on the canvas with ${permCount(role)} permissions, ${role.active ? "and it is active" : "and it is currently inactive"}. I can walk through owner, applicability, and coverage without touching the record.`,
        hint: "Ask what this role actually grants. Editing still happens in the form.",
        details: [
          `Owner: ${role.createdBy || "Unknown"}`,
          `Status: ${role.active ? "Active" : "Inactive"}`,
          `Coverage: ${permCount(role)} permissions for ${(role.applicable || []).join(", ") || "KlearNow"}`
        ],
        prompts: [
          { label: "What this role grants", prompt: `What does ${role.name} actually grant?` },
          { label: "Owner and status", prompt: `Who owns this role, and is it active?` },
          {
            label: "Coverage vs others",
            prompt: lowest && lowest.id !== role.id
              ? `How does its coverage compare with ${lowest.name}?`
              : "How does its coverage compare with other KN roles?"
          }
        ],
        manualPath: "Administration -> KN Role Management -> open role -> Edit Role",
        facts: { roles, role, lowest, highest, inactive }
      });
    }

    if (!roles.length) {
      return contextOf({
        kind: "roles",
        area: "KN Role Management",
        title: "KN Role Management",
        summary: "KN Role Management is open, but this workspace does not have a saved role catalog yet. I can still explain how coverage and status work once roles appear.",
        hint: "There is no catalog to compare yet. Ask what coverage means, or where to add a role.",
        details: ["Roles persist in kn-roles-v2 after the catalog is saved."],
        prompts: [
          { label: "Lowest permission coverage", prompt: "Which role has the lowest permission coverage on this page?" },
          { label: "What coverage means", prompt: "What does permission coverage mean on this page?" },
          { label: "Where to add a role", prompt: "Where do I go to add a KN role once the catalog is ready?" }
        ],
        manualPath: "Administration -> KN Role Management",
        facts: { roles, lowest, highest, inactive }
      });
    }

    return contextOf({
      kind: "roles",
      area: "KN Role Management",
      title: "KN Role Management",
      summary: `You're in the KN Role catalog — ${roles.length} internal roles${inactive.length ? `, ${inactive.length} inactive` : ", all marked active"}. Coverage is uneven; ${lowest.name} currently carries the fewest permissions.`,
      hint: "Ask about coverage, owners, or status. I will not change who has which role.",
      details: [
        `${lowest.name} has ${permCount(lowest)} permissions.`,
        highest && highest.id !== lowest.id ? `${highest.name} has the broadest set, with ${permCount(highest)}.` : "",
        inactive.length ? `Inactive: ${formatList(inactive.map((item) => item.name))}.` : "No inactive roles on this page."
      ].filter(Boolean),
      prompts: [
        { label: "Lowest permission coverage", prompt: "Which role has the lowest permission coverage on this page?", icon: "chart", new: true },
        { label: "Roles needing review", prompt: "Which roles need review — inactive, stale, or low coverage?", icon: "flag", new: true },
        { label: "Draft a read-only role", prompt: "Draft a read-only analytics role for a new hire", icon: "tip", new: true }
      ],
      manualPath: "Administration -> KN Role Management",
      facts: { roles, lowest, highest, inactive }
    });
  }

  function usersContext(hash) {
    const users = readAdminRows("kn-users-v2", () => window.KNUsers?.list?.());
    const elevatedInactive = users.filter(
      (user) => !user.active && (user.roles || []).some((name) => isElevatedRoleName(name))
    );
    const split = {
      kn: users.filter((user) => String(user.level).toUpperCase() === "KLEARNOW").length,
      customer: users.filter((user) => String(user.level).toUpperCase() === "CUSTOMER").length,
      broker: users.filter((user) => String(user.level).toUpperCase() === "BROKER").length,
      inactive: users.filter((user) => !user.active).length
    };
    const addForm = hash === "#kn-user-management/add";
    const editMatch = hash.match(/^#kn-user-management\/([^/]+)\/edit$/);
    const detailMatch = hash.match(/^#kn-user-management\/([^/]+)$/);
    const recordId = editMatch
      ? decodeURIComponent(editMatch[1])
      : detailMatch && detailMatch[1] !== "add"
        ? decodeURIComponent(detailMatch[1])
        : "";
    const user = recordId ? users.find((row) => row.id === recordId) : null;

    if (addForm) {
      return contextOf({
        kind: "user-add",
        area: "KN User Management",
        title: "New user",
        summary: "This is the add-user form. I can explain level, entity, and role assignment; creating the person still happens with Save on this page.",
        hint: "I will not create the account. Ask what to check before you send the invite.",
        details: ["Level, entity, and at least one role are the usual gaps on this form."],
        prompts: [
          { label: "Before you save", prompt: "What should I confirm before saving a new user?" },
          { label: "Suggest roles from title", prompt: "Suggest roles for a Visibility Engineer who should track shipments" },
          { label: "Common role mistakes", prompt: "Which role mistakes are common when adding someone?" }
        ],
        manualPath: "Administration -> KN User Management -> Add User -> Save",
        facts: { users, elevatedInactive, split }
      });
    }

    if (user) {
      return contextOf({
        kind: "user-detail",
        area: "KN User Management",
        title: user.name,
        summary: `${user.name} is a ${levelLabel(user.level)} user in ${user.entity || "the selected entity"}, assigned to ${formatList(user.roles || [])}. ${user.active ? "The account is active." : "The account is inactive."}`,
        hint: "I can unpack access and status. I cannot edit the profile.",
        details: [
          `Email: ${user.email || "Unavailable"}`,
          `Title: ${user.title || "Not set"}`,
          `Status: ${user.active ? "Active" : "Inactive"}`
        ],
        prompts: [
          { label: "Current access", prompt: `What access does ${user.name} currently hold?` },
          { label: "Active status", prompt: `Is this account active, and when were they last seen?` },
          { label: "Roles to review", prompt: "Which roles would I review before changing anything?" }
        ],
        manualPath: "Administration -> KN User Management -> open user -> Edit User",
        facts: { users, user, elevatedInactive, split }
      });
    }

    if (!users.length) {
      return contextOf({
        kind: "users",
        area: "KN User Management",
        title: "KN User Management",
        summary: "KN User Management is open, but no people are stored in this workspace yet. I can still explain inactive access and how the list is grouped once users load.",
        hint: "There is no roster to inspect yet. Ask what elevated access means, or where to add someone.",
        details: ["Users persist in kn-users-v2 after the roster is saved."],
        prompts: [
          { label: "Inactive users with elevated access", prompt: "Which users are inactive but still hold elevated access?" },
          { label: "KlearNow vs customer vs broker", prompt: "How are KlearNow, customer, and broker users split on this list?" },
          { label: "Where to add a user", prompt: "Where do I add a user when the roster is ready?" }
        ],
        manualPath: "Administration -> KN User Management",
        facts: { users, elevatedInactive, split }
      });
    }

    return contextOf({
      kind: "users",
      area: "KN User Management",
      title: "KN User Management",
      summary: elevatedInactive.length
        ? `KN User Management is listing ${users.length} people across KlearNow, customers, and brokers. ${formatList(elevatedInactive.map((item) => item.name))} ${elevatedInactive.length === 1 ? "is" : "are"} inactive while still holding elevated access.`
        : `KN User Management is listing ${users.length} people — ${split.kn} KlearNow, ${split.customer} customer, ${split.broker} broker. No inactive accounts currently keep elevated roles.`,
      hint: "Ask about inactive access or how the roster is split. I will not change assignments.",
      details: [
        `${split.inactive} inactive on this page.`,
        elevatedInactive.length
          ? `Elevated while inactive: ${formatList(elevatedInactive.map((item) => `${item.name} (${formatList(item.roles || [])})`))}.`
          : "No inactive users with administrator-level roles."
      ],
      prompts: [
        { label: "Inactive users with elevated access", prompt: "Which users are inactive but still hold elevated access?" },
        {
          label: elevatedInactive[0] ? "Why elevated while inactive" : "Elevated while inactive?",
          prompt: elevatedInactive[0]
            ? `Why does ${elevatedInactive[0].name} still show ${formatList(elevatedInactive[0].roles || [])} while inactive?`
            : "Are any inactive users still holding elevated roles?"
        },
        { label: "KlearNow vs customer vs broker", prompt: "How are KlearNow, customer, and broker users split on this list?" }
      ],
      manualPath: "Administration -> KN User Management",
      facts: { users, elevatedInactive, split }
    });
  }

  function defaultsContext(hash) {
    const roles = readAdminRows("kn-default-roles-v3", () => window.KNDefaultRoles?.list?.());
    const ranked = [...roles].sort((a, b) => inheritCount(b) - inheritCount(a));
    const top = ranked[0] || null;
    const inactiveInherited = roles.filter((role) => role.active === false && inheritCount(role) > 0);
    const addForm = hash === "#default-role-management/add";
    const editMatch = hash.match(/^#default-role-management\/edit\/([^/]+)/);
    const detailMatch = hash.match(/^#default-role-management\/([^/]+)$/);
    const recordId = editMatch
      ? decodeURIComponent(editMatch[1])
      : detailMatch && detailMatch[1] !== "add"
        ? decodeURIComponent(detailMatch[1])
        : "";
    const role = recordId ? roles.find((row) => row.id === recordId) : null;

    if (addForm) {
      return contextOf({
        kind: "default-add",
        area: "Default Role Management",
        title: "New default role",
        summary: "You're drafting a customer/broker template, not an internal KN role. I can explain inheritance, services, and applicability; publishing still happens on this form.",
        hint: "I will not create the template. Ask what customers would inherit if you save it.",
        details: ["Inheritance starts after customers are attached to the published template."],
        prompts: [
          { label: "Before you publish", prompt: "What should I check before publishing a default role?" },
          { label: "Vs KN internal role", prompt: "How is this template different from a KN internal role?" },
          { label: "What inheritance means", prompt: "What does inheritance mean once customers join?" }
        ],
        manualPath: "Administration -> Default Role Management -> Add Default Role -> Save",
        facts: { roles, top, inactiveInherited }
      });
    }

    if (role) {
      const inherited = inheritCount(role);
      return contextOf({
        kind: "default-detail",
        area: "Default Role Management",
        title: role.name,
        summary: `${role.name} is a default template with ${permCount(role)} permissions. ${inherited} workspace${inherited === 1 ? "" : "s"} currently inherit it.`,
        hint: "I can explain who inherits this and which services it covers. I cannot change the template.",
        details: [
          `Applicable: ${(role.applicable || []).join(", ") || "Not set"}`,
          `Services: ${(role.services || []).join(", ") || "Not set"}`,
          `Coverage: ${permCount(role)} permissions`
        ],
        prompts: [
          { label: "Who inherits this", prompt: `How many customers inherit ${role.name}?` },
          { label: "Services and parties", prompt: "Which services and parties does this template apply to?" },
          { label: "Permission coverage", prompt: "What's the permission coverage on this template?" }
        ],
        manualPath: "Administration -> Default Role Management -> open template -> Edit Default Role",
        facts: { roles, role, top, inactiveInherited }
      });
    }

    if (!roles.length) {
      return contextOf({
        kind: "defaults",
        area: "Default Role Management",
        title: "Default Role Management",
        summary: "Default Role Management is open, but no templates are stored yet. I can still explain inheritance — how customers pick up access when they join — once templates load.",
        hint: "There is no inheritance table to rank yet. Ask what a default role is for.",
        details: ["Templates persist in kn-default-roles-v3 after they are saved."],
        prompts: [
          { label: "Most inherited template", prompt: "Which default role has the most customers inheriting it?" },
          { label: "What inheritance means", prompt: "What does inheritance mean on this page?" },
          { label: "Where to add a template", prompt: "Where do I add a default role when templates are ready?" }
        ],
        manualPath: "Administration -> Default Role Management",
        facts: { roles, top, inactiveInherited }
      });
    }

    return contextOf({
      kind: "defaults",
      area: "Default Role Management",
      title: "Default Role Management",
      summary: `This is the inheritance layer for customers and brokers — ${roles.length} default templates. ${top.name} currently leads with ${inheritCount(top)} workspaces inheriting it.`,
      hint: "Ask who inherits what. I will not attach or detach customers from a template.",
      details: [
        `${top.name}: ${inheritCount(top)} inheriting workspaces.`,
        inactiveInherited.length
          ? `Inactive yet still inherited: ${formatList(inactiveInherited.map((item) => item.name))}.`
          : "No inactive templates currently show inheritance."
      ],
      prompts: [
        { label: "Most inherited template", prompt: "Which default role has the most customers inheriting it?" },
        { label: "Admin vs full access", prompt: "What's different between Customer Administrator and Full Customer Access", icon: "compare", new: true },
        { label: "Who inherits the leader", prompt: `Who inherits ${top.name}, and is that expected?` }
      ],
      manualPath: "Administration -> Default Role Management",
      facts: { roles, top, inactiveInherited }
    });
  }

  function operationsContext(kind) {
    const stats = visStats();
    const mode = topMode(stats);
    const modeLabel = mode ? knMotLabel(mode.id) : "";
    const modeShare = mode ? (mode.value <= 1 ? Math.round(mode.value * 100) : Math.round(mode.value)) : 0;
    const holdSample = stats.holdRows.slice(0, 3).map((row) => row.id || row.container).filter(Boolean);
    const detailId = typeof visState !== "undefined" ? visState.detailId : "";

    if (kind === "dashboard") {
      return contextOf({
        kind: "dashboard",
        area: "Dashboard",
        title: "Dashboard",
        summary: `You're on the operations dashboard, not an admin table. ${stats.action} of ${stats.total} active shipments need attention${modeLabel ? `, and ${modeLabel} is the largest mode share` : ""}.`,
        hint: "I can unpack holds, delays, and where to drill in. I cannot clear exceptions from here.",
        details: [
          `${stats.hold} on hold, ${stats.delayed} delayed, ${stats.ontime} on track.`,
          modeLabel ? `${modeLabel} is about ${modeShare}% of the book.` : "Mode split is not available yet."
        ],
        prompts: [
          { label: "Shipments needing action", prompt: "How many shipments currently need action on this dashboard?" },
          { label: "Hold → document → broker", prompt: "For a shipment on hold, what is the linked document and responsible broker?", icon: "flag", new: true },
          { label: "Largest transport mode", prompt: "Which transport mode accounts for the largest share of active shipments?" }
        ],
        manualPath: "Dashboard tiles, or KlearHub -> Visibility for the live board",
        facts: { stats, mode, modeLabel, modeShare, holdSample }
      });
    }

    if (kind === "overview") {
      return contextOf({
        kind: "overview",
        area: "By mode",
        title: "By mode",
        summary: `KlearHub By mode splits the book across ocean, air, truck, and rail. ${stats.total} active shipments feed these counts — I can compare volume and delay risk from what is on this page.`,
        hint: "Ask for a mode comparison. I will not change filters on the overview.",
        details: [
          modeLabel ? `${modeLabel} currently leads volume.` : "Mode shares are not populated yet.",
          `${stats.delayed} delayed, ${stats.arrived} arrived pending drayage.`
        ],
        prompts: [
          { label: "Ocean vs air volume", prompt: "How does ocean volume compare with air on this page?" },
          { label: "Mode with most delay", prompt: "Which mode is carrying the most delay risk?" },
          { label: "Snapshot counts", prompt: "What do the KlearHub snapshot counts represent?" }
        ],
        manualPath: "KlearHub -> By mode, or open Visibility for shipment-level work",
        facts: { stats, mode, modeLabel, modeShare }
      });
    }

    if (detailId) {
      const row = stats.rows.find((item) => item.id === detailId || item.container === detailId);
      return contextOf({
        kind: "visibility-detail",
        area: "Visibility",
        title: detailId,
        summary: `You've opened ${detailId} in Visibility. I can explain the status on this record; I cannot clear holds or edit milestones.`,
        hint: "Ask about this shipment's status. Action still happens in Visibility.",
        details: [
          row ? `Status: ${row.status || "Not set"}` : "Shipment details are on the record panel.",
          `${stats.hold} holds and ${stats.delayed} delays in the current board.`
        ],
        prompts: [
          { label: "Current status", prompt: `What is the current status of ${detailId}?` },
          { label: "Why flagged", prompt: "Why would this shipment be flagged in this view?" },
          { label: "Where to take action", prompt: "Where do I go if I need to take action on it?" }
        ],
        manualPath: "KlearHub -> Visibility -> open shipment",
        facts: { stats, detailId, row, holdSample }
      });
    }

    return contextOf({
      kind: "visibility",
      area: "Visibility",
      title: "Visibility",
      summary: `Visibility is the live shipment board. ${stats.hold} on hold, ${stats.delayed} delayed, ${stats.ontime} on track. I can stay with this view and explain what the exceptions mean.`,
      hint: "Ask about holds, delays, or arrived containers. I cannot update a shipment.",
      details: [
        holdSample.length ? `Hold examples: ${formatList(holdSample)}.` : "No hold rows are listed in the current summary.",
        `${stats.inTransit} in transit, ${stats.arrived} arrived.`
      ],
      prompts: [
        { label: "Shipments on hold", prompt: "Which shipments are on hold in this Visibility view?" },
        { label: "Hold → document → broker", prompt: "For a shipment on hold, what is the linked document and responsible broker?", icon: "flag", new: true },
        { label: "Arrived containers first", prompt: "Where should I look first among containers that have arrived?" }
      ],
      manualPath: "KlearHub -> Visibility",
      facts: { stats, holdSample }
    });
  }

  function unavailableContext() {
    const title = getCurrentPageTitle();
    const dest = emptyDestination(title);
    return contextOf({
      kind: "unavailable",
      area: title,
      title,
      summary: `${title} is not available in this workspace yet — that empty state is intentional, not a loading error. I can explain what that means and point you toward ${dest.name}.`,
      hint: "There is no table to analyze here. Ask why it is unavailable, or where to continue.",
      details: [
        `This workspace has not enabled ${title}.`,
        `Continue in ${dest.name} (${dest.path}).`
      ],
      prompts: [
        { label: "Why unavailable", prompt: `Why isn't ${title} available in this workspace yet?` },
        { label: "Where to go instead", prompt: `Where should I go instead of ${title}?` },
        { label: "Access or workspace?", prompt: "Does this empty page mean I lack access, or that the module is not in this workspace?" }
      ],
      manualPath: `Left navigation -> ${dest.path}`,
      facts: { destination: dest }
    });
  }

  function getContext() {
    const hash = getHashPath();
    if (hash.startsWith("#kn-role-management")) {
      return rolesContext(hash);
    }
    if (hash.startsWith("#kn-user-management")) {
      return usersContext(hash);
    }
    if (hash.startsWith("#default-role-management")) {
      return defaultsContext(hash);
    }
    if (isDashboardRoute()) {
      return operationsContext("dashboard");
    }
    if (isKlearhubOverviewRoute() || hash.startsWith("#klearhub-overview")) {
      return operationsContext("overview");
    }
    if (isKlearhubVisibilityRoute() || hash.startsWith("#klearhub-visibility")) {
      return operationsContext("visibility");
    }
    return unavailableContext();
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, prefersReducedMotion() ? 0 : ms);
    });
  }

  function announceAssistant(text) {
    const target = liveRegion || ftueLive;
    if (!target) {
      announceFtue(text);
      return;
    }
    target.textContent = "";
    window.requestAnimationFrame(() => {
      target.textContent = text;
    });
  }

  function referencingCopy(context) {
    if (!context) {
      return "Referencing: this page";
    }
    const kind = context.kind || "";
    const facts = context.facts || {};
    if (kind === "role-detail" && facts.role?.name) {
      return `Referencing: ${facts.role.name} role`;
    }
    if (kind === "user-detail" && facts.user?.name) {
      return `Referencing: ${facts.user.name}`;
    }
    if (kind === "default-detail" && facts.role?.name) {
      return `Referencing: ${facts.role.name} template`;
    }
    if (kind === "visibility-detail" && (facts.detailId || context.title)) {
      return `Referencing: shipment ${facts.detailId || context.title}`;
    }
    if (kind === "roles" || kind === "role-add") {
      const count = Array.isArray(facts.roles) ? facts.roles.length : 0;
      return count
        ? `Referencing: KN Role Management — ${count} role${count === 1 ? "" : "s"} visible`
        : "Referencing: KN Role Management";
    }
    if (kind === "users" || kind === "user-add") {
      const count = Array.isArray(facts.users) ? facts.users.length : 0;
      return count
        ? `Referencing: KN User Management — ${count} user${count === 1 ? "" : "s"} visible`
        : "Referencing: KN User Management";
    }
    if (kind === "defaults" || kind === "default-add") {
      const count = Array.isArray(facts.roles) ? facts.roles.length : 0;
      return count
        ? `Referencing: Default Role Management — ${count} template${count === 1 ? "" : "s"} visible`
        : "Referencing: Default Role Management";
    }
    if (kind === "visibility" || kind === "dashboard" || kind === "overview") {
      const total = Number(facts.stats?.total) || 0;
      return total
        ? `Referencing: ${context.area} — ${total} shipment${total === 1 ? "" : "s"} in view`
        : `Referencing: ${context.area || context.title}`;
    }
    return `Referencing: ${context.area || context.title || "this page"}`;
  }

  function lookingCopy(context) {
    const kind = context?.kind || "";
    if ((kind === "role-detail" || kind === "default-detail" || kind === "user-detail") && context?.title) {
      return `Checking ${context.title}…`;
    }
    if (kind === "visibility-detail" && context?.title) {
      return `Looking at ${context.title}…`;
    }
    if (kind === "defaults" || kind === "default-add") {
      return "Looking at Default Role Management…";
    }
    if (kind === "roles" || kind === "role-add") {
      return "Looking at KN Role Management…";
    }
    if (kind === "users" || kind === "user-add") {
      return "Looking at KN User Management…";
    }
    if (kind === "visibility") {
      return "Looking at Visibility…";
    }
    if (kind === "dashboard") {
      return "Looking at Dashboard…";
    }
    if (kind === "overview") {
      return "Looking at By mode…";
    }
    const area = context?.area || context?.title || "this page";
    return `Looking at ${area}…`;
  }

  function buildThinkingSteps(question, context, result) {
    if (Array.isArray(result?.thinking) && result.thinking.length) {
      const extra = Array.isArray(result.evidence) ? result.evidence : [];
      return [...result.thinking, ...extra].filter(Boolean).slice(0, 6);
    }
    const lower = String(question || "").toLowerCase();
    const facts = context?.facts || {};
    const role = facts.role;
    const user = facts.user;
    const steps = [];
    const kind = context?.kind || "";

    if (kind === "default-detail" && role?.name) {
      steps.push(`Checking ${role.name}'s permission structure and inheritance settings`);
      if (/inherit|customer|workspace/.test(lower)) {
        steps.push(`Reading how many workspaces currently inherit ${role.name}`);
      }
      if (/permission|coverage|grant|access/.test(lower)) {
        steps.push(`Comparing selected permissions against the Default Role catalog total`);
      }
      if (/applicable|party|service/.test(lower)) {
        steps.push(`Reviewing Applicable to parties and services on this template`);
      }
    } else if (kind === "defaults" || kind === "default-add") {
      steps.push("Checking Default Role Management templates and inheritance counts");
      if (/inherit/.test(lower) && facts.top?.name) {
        steps.push(`Ranking templates by workspaces inheriting ${facts.top.name} and peers`);
      }
    } else if (kind === "role-detail" && role?.name) {
      steps.push(`Checking ${role.name}'s permission coverage and applicability`);
      if (/compare|lowest|coverage/.test(lower) && facts.lowest?.name) {
        steps.push(`Comparing coverage with ${facts.lowest.name} on this catalog`);
      }
    } else if (kind === "roles" || kind === "role-add") {
      steps.push("Checking KN Role Management catalog coverage and status");
    } else if (kind === "user-detail" && user?.name) {
      steps.push(`Checking ${user.name}'s level, entity, and assigned roles`);
    } else if (kind === "users" || kind === "user-add") {
      steps.push("Checking KN User Management roster status and elevated access");
    } else if (kind === "visibility" || kind === "visibility-detail" || kind === "dashboard" || kind === "overview") {
      steps.push(`Checking live shipment counts on ${context.area || "this page"}`);
    } else {
      steps.push(`Checking what is available on ${context?.area || "this page"}`);
    }
    const extra = Array.isArray(result?.evidence) ? [...result.evidence] : [];
    if (!extra.length && context?.title) {
      extra.push(`Used record: ${context.title} on ${context.area || "this page"}`);
    }
    return [...steps, ...extra].filter(Boolean).slice(0, 6);
  }

  function buildResponseTitle(question, context, result) {
    if (result?.title) {
      return result.title;
    }
    const lower = String(question || "").toLowerCase();
    const facts = context?.facts || {};
    const role = facts.role;
    const user = facts.user;

    if (role?.name) {
      if (/inherit/.test(lower)) {
        return `How ${role.name} Inherits Access`;
      }
      if (/permission|coverage|grant/.test(lower)) {
        return `${role.name} Permission Coverage`;
      }
      if (/applicable|party|service/.test(lower)) {
        return `Who ${role.name} Applies To`;
      }
      return `About ${role.name}`;
    }
    if (user?.name) {
      if (/access|role/.test(lower)) {
        return `Access held by ${user.name}`;
      }
      return `About ${user.name}`;
    }
    if (context?.kind === "defaults" && /inherit/.test(lower)) {
      return "Inheritance on Default Role Management";
    }
    if (context?.kind === "roles" && /coverage|lowest/.test(lower)) {
      return "Permission coverage on KN Role Management";
    }
    if (context?.area && context.area !== "this page") {
      return `On ${context.area}`;
    }
    return context?.title || "On this page";
  }

  function syncContextChip(context = getContext()) {
    if (!refChip || !refChipText) {
      return;
    }
    if (refChipDismissed) {
      refChip.hidden = true;
      return;
    }
    const copy = referencingCopy(context);
    refChipText.textContent = copy;
    refChip.hidden = false;
  }

  function buildEntityIndex(context) {
    const entities = [];
    const facts = context?.facts || {};
    const pushPage = (label, href) => {
      if (!label || !href) {
        return;
      }
      entities.push({ type: "page", id: href, label: String(label), href: String(href) });
    };
    const pushRole = (role, type = "role") => {
      if (!role?.id || !role?.name) {
        return;
      }
      entities.push({
        type,
        id: String(role.id),
        label: String(role.name),
        href:
          type === "default-role"
            ? `#default-role-management/${encodeURIComponent(role.id)}`
            : `#kn-role-management/${encodeURIComponent(role.id)}`
      });
    };
    const pushUser = (user) => {
      if (!user?.id || !user?.name) {
        return;
      }
      entities.push({
        type: "user",
        id: String(user.id),
        label: String(user.name),
        href: `#kn-user-management/${encodeURIComponent(user.id)}`
      });
    };
    const pushShipment = (id) => {
      if (!id) {
        return;
      }
      entities.push({
        type: "shipment",
        id: String(id),
        label: String(id),
        href: `#klearhub-visibility`
      });
    };

    const kind = context?.kind || "";
    if (kind.startsWith("default")) {
      pushPage("Default Role Management", "#default-role-management");
    } else if (kind.startsWith("role")) {
      pushPage("KN Role Management", "#kn-role-management");
    } else if (kind.startsWith("user")) {
      pushPage("KN User Management", "#kn-user-management");
    } else if (kind === "visibility" || kind === "visibility-detail") {
      pushPage("Visibility", "#klearhub-visibility");
    } else if (kind === "dashboard") {
      pushPage("Dashboard", "#dashboard");
    } else if (kind === "overview") {
      pushPage("By mode", "#klearhub-overview");
    }

    (facts.roles || []).forEach((role) =>
      pushRole(role, kind.startsWith("default") ? "default-role" : "role")
    );
    if (facts.role) {
      pushRole(facts.role, kind.startsWith("default") ? "default-role" : "role");
    }
    if (facts.lowest) {
      pushRole(facts.lowest, kind.startsWith("default") ? "default-role" : "role");
    }
    if (facts.highest) {
      pushRole(facts.highest, kind.startsWith("default") ? "default-role" : "role");
    }
    if (facts.top) {
      pushRole(facts.top, kind.startsWith("default") ? "default-role" : "role");
    }
    (facts.users || []).forEach(pushUser);
    if (facts.user) {
      pushUser(facts.user);
    }
    (facts.holdSample || []).forEach(pushShipment);
    if (facts.detailId) {
      pushShipment(facts.detailId);
    }
    (facts.stats?.holdRows || []).slice(0, 8).forEach((row) => pushShipment(row.id || row.container));
    entities.sort((a, b) => b.label.length - a.label.length);
    return entities;
  }

  function applyInlineMarkup(escaped, entities) {
    let html = escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="ai-msg__strong">$1</strong>');
    const used = new Set();
    entities.forEach((entity) => {
      const key = `${entity.type}:${entity.id}`;
      if (used.has(key)) {
        return;
      }
      const needle = escapeHtml(entity.label);
      if (!needle || !html.includes(needle)) {
        return;
      }
      used.add(key);
      const icon =
        entity.type === "page"
          ? '<span class="ai-entity-link__icon" aria-hidden="true">↗</span>'
          : '<span class="ai-entity-link__icon" aria-hidden="true">↗</span>';
      const link = `<a class="ai-entity-link" href="${escapeHtml(entity.href)}" data-ai-entity="${escapeHtml(entity.type)}" data-ai-entity-id="${escapeHtml(entity.id)}">${needle}${icon}</a>`;
      html = html.replace(needle, link);
    });
    return html;
  }

  function renderAssistantMarkdown(text, context) {
    const source = String(text || "").trim();
    if (!source) {
      return "<p></p>";
    }
    const entities = buildEntityIndex(context);
    const lines = source.split(/\n/);
    const blocks = [];
    let listType = null;
    let listItems = [];

    const flushList = () => {
      if (!listItems.length) {
        return;
      }
      const tag = listType === "ol" ? "ol" : "ul";
      blocks.push(
        `<${tag} class="ai-msg__list">${listItems
          .map((item) => `<li>${applyInlineMarkup(escapeHtml(item), entities)}</li>`)
          .join("")}</${tag}>`
      );
      listItems = [];
      listType = null;
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        flushList();
        const level = Math.min(3, (trimmed.match(/^#+/) || ["#"])[0].length);
        const tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
        blocks.push(
          `<${tag} class="ai-msg__heading type-ui-md type-weight-semibold">${applyInlineMarkup(
            escapeHtml(heading[1]),
            entities
          )}</${tag}>`
        );
        return;
      }
      const bullet = trimmed.match(/^[-•*]\s+(.+)$/);
      if (bullet) {
        if (listType && listType !== "ul") {
          flushList();
        }
        listType = "ul";
        listItems.push(bullet[1]);
        return;
      }
      const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        if (listType && listType !== "ol") {
          flushList();
        }
        listType = "ol";
        listItems.push(numbered[1]);
        return;
      }
      flushList();
      blocks.push(`<p>${applyInlineMarkup(escapeHtml(trimmed), entities)}</p>`);
    });
    flushList();
    return blocks.join("") || `<p>${applyInlineMarkup(escapeHtml(source), entities)}</p>`;
  }

  function plainTextFromHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || "").replace(/\s+\n/g, "\n").trim();
  }

  function messageActionsHtml() {
    return `<div class="ai-msg__actions" role="group" aria-label="Response actions">
      <button type="button" class="ai-msg__action" data-ai-msg-copy aria-label="Copy response">${MSG_ACTION_COPY}</button>
      <button type="button" class="ai-msg__action" data-ai-msg-feedback="up" aria-pressed="false" aria-label="Helpful response">${MSG_ACTION_UP}</button>
      <button type="button" class="ai-msg__action" data-ai-msg-feedback="down" aria-pressed="false" aria-label="Unhelpful response">${MSG_ACTION_DOWN}</button>
    </div>`;
  }

  function updateSendControl() {
    if (!sendBtn) {
      return;
    }
    if (isResponding) {
      sendBtn.disabled = false;
      sendBtn.type = "button";
      sendBtn.className = "btn btn--secondary btn--md type-ui-md ai-assistant-send--stop";
      sendBtn.textContent = "Stop";
      sendBtn.setAttribute("aria-label", "Stop generating");
      form.classList.add("is-responding");
      input.setAttribute("aria-disabled", "true");
      return;
    }
    sendBtn.type = "submit";
    sendBtn.className = "btn btn--primary btn--md type-ui-md";
    sendBtn.textContent = "Send";
    sendBtn.setAttribute("aria-label", "Send message");
    const hasText = Boolean(input.value.trim());
    sendBtn.disabled = !hasText;
    sendBtn.classList.toggle("is-muted", !hasText);
    form.classList.remove("is-responding");
    input.removeAttribute("aria-disabled");
  }

  function setResponding(next) {
    isResponding = next;
    updateSendControl();
  }

  function stopGeneration() {
    generationId += 1;
    if (streamTimer) {
      window.clearTimeout(streamTimer);
      streamTimer = null;
    }
    const status = history.querySelector(".ai-msg--status");
    status?.remove();
    const streaming = history.querySelector(".ai-msg--streaming");
    if (streaming) {
      streaming.classList.remove("ai-msg--streaming");
      const note = document.createElement("p");
      note.className = "ai-msg__stopped type-caption-sm";
      note.textContent = "Generation stopped.";
      streaming.querySelector(".ai-msg__body")?.appendChild(note);
      if (!streaming.querySelector(".ai-msg__actions")) {
        appendToAssistantStack(streaming, messageActionsHtml());
      }
    }
    setResponding(false);
    announceAssistant("Generation stopped.");
    window.requestAnimationFrame(() => input.focus());
  }

  function fadeOutEmptySurfaces() {
    const welcome = history.querySelector(".ai-assistant-welcome");
    const introVisible = introEl && !introEl.hidden;
    if (welcome) {
      welcome.classList.add("is-leaving");
      if (prefersReducedMotion()) {
        welcome.remove();
      } else {
        window.setTimeout(() => welcome.remove(), 180);
      }
    }
    if (introVisible) {
      introEl.classList.add("is-leaving");
      markSeenFlag(INTRO_SEEN_KEY);
      const finish = () => {
        introEl.hidden = true;
        introEl.classList.remove("is-leaving");
        history.hidden = false;
        helpBtn?.setAttribute("aria-expanded", "false");
      };
      if (prefersReducedMotion()) {
        finish();
      } else {
        window.setTimeout(finish, 180);
      }
    } else {
      history.hidden = false;
    }
  }

  function highlightEntity(type, id) {
    if (!id) {
      return false;
    }
    let selector = "";
    if (type === "role") {
      selector = `#kn-role-root tr[data-role-id="${CSS.escape(id)}"]`;
    } else if (type === "default-role") {
      selector = `#kn-default-role-root tr[data-drole-id="${CSS.escape(id)}"]`;
    } else if (type === "user") {
      selector = `#kn-user-root tr[data-user-id="${CSS.escape(id)}"]`;
    } else if (type === "shipment") {
      selector = `#vis-table-body tr[data-vis-id="${CSS.escape(id)}"], .vis-card[data-vis-id="${CSS.escape(id)}"]`;
    }
    const row = selector ? document.querySelector(selector) : null;
    if (row) {
      document.querySelectorAll(".is-ai-focus").forEach((node) => node.classList.remove("is-ai-focus"));
      row.classList.add("is-ai-focus", "is-selected");
      row.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      if (typeof row.focus === "function") {
        row.focus({ preventScroll: true });
      }
      return true;
    }
    return false;
  }

  function openEntityLink(type, id, href) {
    if (type === "page") {
      if (href) {
        const path = href.split("?")[0];
        const navLink =
          sideNav.querySelector(`.side-nav-link[data-level="2"][href="${path}"]`) ||
          sideNav.querySelector(`.side-nav-link[href="${path}"]`);
        if (navLink) {
          window.KNAdminUX?.beginNavigation?.();
          navLink.click();
        } else {
          setRouteHash(href);
          renderBreadcrumb();
        }
      }
      return;
    }
    if (type === "shipment") {
      if (isKlearhubVisibilityRoute() && highlightEntity("shipment", id)) {
        return;
      }
      openShipmentFromDashboard(id);
      window.setTimeout(() => highlightEntity("shipment", id), 400);
      return;
    }
    if (href) {
      setRouteHash(href);
      renderBreadcrumb();
    }
    window.setTimeout(() => highlightEntity(type, id), 280);
  }

  function sourcesHtml(sources) {
    const items = (sources || []).filter((item) => item?.label && item?.href);
    if (!items.length) {
      return "";
    }
    return `<div class="ai-msg__sources" aria-label="Sources">
      <span class="ai-msg__sources-label type-caption-sm">Sources</span>
      ${items
        .map(
          (item) =>
            `<a class="ai-entity-link ai-source-link type-caption-sm" href="${escapeHtml(item.href)}" data-ai-entity="${escapeHtml(item.type || "page")}" data-ai-entity-id="${escapeHtml(item.id || item.href)}">${escapeHtml(item.label)}<span class="ai-entity-link__icon" aria-hidden="true">↗</span></a>`
        )
        .join("")}
    </div>`;
  }

  function thinkingPanelHtml(steps, expanded = false) {
    const items = (steps || []).filter(Boolean);
    if (!items.length) {
      return "";
    }
    const traceId = `ai-thinking-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return `
      <div class="ai-msg__thinking-panel">
        <button
          type="button"
          class="ai-msg__thinking-toggle type-caption-sm"
          aria-expanded="${expanded ? "true" : "false"}"
          aria-controls="${traceId}"
        >
          ${THINKING_CHEVRON}
          <span class="ai-msg__thinking-toggle-label">${expanded ? "Hide thinking" : "Show thinking"}</span>
        </button>
        <div class="ai-msg__thinking-trace" id="${traceId}" ${expanded ? "" : "hidden"}>
          <ol class="ai-msg__thinking-list type-caption-sm">
            ${items.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
        </div>
      </div>
    `;
  }

  function followUpsHtml(items) {
    const prompts = (items || []).filter((item) => item?.label && item?.prompt).slice(0, 3);
    if (!prompts.length) {
      return "";
    }
    return `<div class="ai-msg__related" role="group" aria-label="Related questions">
      <p class="ai-msg__related-label type-caption-sm">Related</p>
      <div class="ai-msg__related-chips">
        ${prompts
          .map(
            (item) =>
              `<button type="button" class="ai-msg__related-chip type-caption-sm" data-ai-prompt="${escapeHtml(item.prompt)}" aria-label="Ask: ${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`
          )
          .join("")}
      </div>
    </div>`;
  }

  function addMessage(kind, text, { html = "", actions = false, streaming = false, title = "", thinking = [], followUps = [], sources = [] } = {}) {
    history.querySelector(".ai-assistant-welcome")?.remove();
    const node = document.createElement("article");
    node.className = `ai-msg ai-msg--${kind}${streaming ? " ai-msg--streaming" : ""}`;
    if (kind === "user") {
      node.innerHTML = `<div class="ai-msg__body type-body-sm">${html || `<p>${escapeHtml(text)}</p>`}</div>`;
    } else {
      const titleHtml = title
        ? `<h3 class="ai-msg__response-title type-ui-md type-weight-semibold">${escapeHtml(title)}</h3>`
        : "";
      node.innerHTML = `<div class="ai-msg__stack">
        ${thinkingPanelHtml(thinking)}
        ${titleHtml}
        <div class="ai-msg__body type-body-sm">${html || `<p>${escapeHtml(text)}</p>`}</div>
        ${sourcesHtml(sources)}
        ${followUpsHtml(followUps)}
        ${actions ? messageActionsHtml() : ""}
      </div>`;
    }
    history.appendChild(node);
    history.scrollTop = history.scrollHeight;
    return node;
  }

  function appendToAssistantStack(node, html) {
    if (!html || !node) {
      return;
    }
    const stack = node.querySelector(".ai-msg__stack");
    if (stack) {
      stack.insertAdjacentHTML("beforeend", html);
      return;
    }
    node.insertAdjacentHTML("beforeend", html);
  }

  function addDraftMessage(draft, leadIn, context, meta = {}) {
    pendingDraftPayload = window.KNAiSuggest.stageDraft(draft);
    const leadHtml = renderAssistantMarkdown(leadIn, context);
    const body = `${leadHtml}${window.KNAiSuggest.draftCardHtml(pendingDraftPayload)}`;
    return addMessage("assistant", leadIn, {
      html: body,
      actions: true,
      title: meta.title || "Draft ready for review",
      thinking: meta.thinking || ["Drafted from your request without saving anything"],
      followUps: meta.followUps || []
    });
  }

  function addReviewMessage(items, leadIn, context, meta = {}) {
    const leadHtml = renderAssistantMarkdown(leadIn, context);
    const body = `${leadHtml}${window.KNAiSuggest.reviewChecklistHtml(items)}`;
    return addMessage("assistant", leadIn, {
      html: body,
      actions: true,
      title: meta.title || "Roles to review",
      thinking: meta.thinking || ["Scanned the KN Role catalog for inactive, stale, or thin coverage"],
      followUps: meta.followUps || []
    });
  }

  function setThinking(isThinking, context) {
    const existing = history.querySelector(".ai-msg--status");
    if (!isThinking) {
      if (existing) {
        existing.classList.add("is-leaving");
        if (prefersReducedMotion()) {
          existing.remove();
        } else {
          window.setTimeout(() => existing.remove(), 160);
        }
      }
      return;
    }
    const labelText = lookingCopy(context);
    if (existing) {
      const label = existing.querySelector(".ai-msg__thinking-label");
      if (label) {
        label.textContent = labelText;
      }
      announceAssistant(labelText);
      return;
    }
    const status = document.createElement("article");
    status.className = "ai-msg ai-msg--assistant ai-msg--status";
    status.setAttribute("aria-hidden", "true");
    status.innerHTML = `
      <div class="ai-msg__thinking">
        <span class="ai-msg__spark" aria-hidden="true">✦</span>
        <p class="ai-msg__thinking-label type-caption-sm">${escapeHtml(labelText)}</p>
      </div>
      <div class="ai-msg__skeleton" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    `;
    history.appendChild(status);
    history.scrollTop = history.scrollHeight;
    announceAssistant(labelText);
  }

  function streamChunks(text) {
    const source = String(text || "");
    if (!source) {
      return [""];
    }
    const parts = [];
    let buffer = "";
    const tokens = source.split(/(\s+)/);
    tokens.forEach((token) => {
      buffer += token;
      if (buffer.length >= 18 || /\n$/.test(buffer)) {
        parts.push(buffer);
        buffer = "";
      }
    });
    if (buffer) {
      parts.push(buffer);
    }
    return parts.length ? parts : [source];
  }

  async function streamAssistantText(text, context, genId, meta = {}) {
    const title = meta.title || "";
    const thinking = meta.thinking || [];
    const followUps = meta.followUps || [];
    const sources = meta.sources || [];
    const node = addMessage("assistant", "", {
      html: "",
      streaming: true,
      title,
      thinking,
      followUps: [],
      sources: []
    });
    const body = node.querySelector(".ai-msg__body");
    const fullHtml = renderAssistantMarkdown(text, context);
    if (prefersReducedMotion()) {
      body.innerHTML = fullHtml;
      node.classList.remove("ai-msg--streaming");
      node.classList.add("ai-msg--settled");
      if (sources.length) {
        appendToAssistantStack(node, sourcesHtml(sources));
      }
      if (followUps.length) {
        appendToAssistantStack(node, followUpsHtml(followUps));
      }
      appendToAssistantStack(node, messageActionsHtml());
      announceAssistant([title, plainTextFromHtml(fullHtml)].filter(Boolean).join(". "));
      return node;
    }
    const chunks = streamChunks(text);
    let visible = "";
    for (let i = 0; i < chunks.length; i += 1) {
      if (genId !== generationId) {
        return node;
      }
      visible += chunks[i];
      body.innerHTML = renderAssistantMarkdown(visible, context);
      history.scrollTop = history.scrollHeight;
      await new Promise((resolve) => {
        streamTimer = window.setTimeout(resolve, 28 + (i % 3) * 8);
      });
      streamTimer = null;
    }
    if (genId !== generationId) {
      return node;
    }
    body.innerHTML = fullHtml;
    node.classList.remove("ai-msg--streaming");
    node.classList.add("ai-msg--settled");
    if (sources.length) {
      appendToAssistantStack(node, sourcesHtml(sources));
    }
    if (followUps.length) {
      appendToAssistantStack(node, followUpsHtml(followUps));
    }
    appendToAssistantStack(node, messageActionsHtml());
    announceAssistant([title, plainTextFromHtml(fullHtml)].filter(Boolean).join(". "));
    return node;
  }

  async function presentResult(result, context, genId, question = "") {
    const thinking = buildThinkingSteps(question, context, result);
    const title = buildResponseTitle(question, context, result);
    setThinking(false);
    await delay(prefersReducedMotion() ? 0 : 140);
    if (genId !== generationId) {
      return;
    }
    if (result?.mode === "draft") {
      const node = addDraftMessage(result.draft, result.leadIn, context, {
        title: title || "Draft ready for review",
        thinking,
        followUps: result.followUps || []
      });
      node.classList.add("ai-msg--settled");
      announceAssistant([title, result.leadIn].filter(Boolean).join(". "));
      return;
    }
    if (result?.mode === "review") {
      const node = addReviewMessage(result.items, result.leadIn, context, {
        title: title || "Roles to review",
        thinking,
        followUps: result.followUps || []
      });
      node.classList.add("ai-msg--settled");
      announceAssistant([title, result.leadIn].filter(Boolean).join(". "));
      return;
    }
    await streamAssistantText(result?.text || "I could not process that request right now. Please try again.", context, genId, {
      title,
      thinking,
      followUps: result?.followUps || followUpsFromContext(context, question),
      sources: result?.sources || []
    });
  }

  function starterPrompts(context) {
    return (context.prompts || [])
      .filter(Boolean)
      .slice(0, 3)
      .map((item) => {
        if (typeof item === "string") {
          return { label: item, prompt: item, icon: "", isNew: false };
        }
        const label = String(item.label || item.prompt || "").trim();
        const prompt = String(item.prompt || item.label || "").trim();
        return {
          label: label || prompt,
          prompt: prompt || label,
          icon: String(item.icon || "").trim(),
          isNew: Boolean(item.new)
        };
      })
      .filter((item) => item.label && item.prompt);
  }

  function renderEmptyState() {
    const context = getContext();
    history.innerHTML = "";
    const welcome = document.createElement("div");
    welcome.className = "ai-assistant-welcome";
    welcome.innerHTML = `
      <p class="ai-assistant-greeting type-heading-h6" data-ai-welcome-greeting></p>
      <h2 class="ai-assistant-headline type-heading-h5 type-weight-semibold" data-ai-welcome-heading></h2>
      <div class="ai-assistant-prompts" role="group" aria-label="Suggestions"></div>
    `;
    setGreetingAndHeadline(
      welcome.querySelector("[data-ai-welcome-greeting]"),
      welcome.querySelector("[data-ai-welcome-heading]"),
      context
    );
    fillPromptChips(welcome.querySelector(".ai-assistant-prompts"), context);
    history.appendChild(welcome);
  }

  function noWriteResponse(question, context) {
    return `I cannot make that change from here. Use ${context.manualPath}. I can explain impact only.`;
  }

  function answerDraftOrReview(question) {
    if (!window.KNAiSuggest?.detectIntent) {
      return null;
    }
    const intent = window.KNAiSuggest.detectIntent(question);
    if (intent.type === "review-roles") {
      const roles = readAdminRows("kn-roles-v2", () => window.KNRoles?.list?.());
      const items = window.KNAiSuggest.rolesNeedingReview(roles);
      window.KNAiSuggest.logAudit({
        action: "panel-review-checklist",
        context: "assistant",
        field: "roles",
        origin: "ai",
        value: items.map((item) => item.name).join(",")
      });
      return {
        mode: "review",
        leadIn:
          "KN roles that look inactive, stale, or thin. Opening one loads the form — nothing is saved.",
        items
      };
    }
    if (intent.type === "draft-role" || intent.type === "draft-default-role") {
      const draft = window.KNAiSuggest.deriveRoleDraft(question);
      if (intent.type === "draft-default-role") {
        draft.type = "default-role";
      }
      window.KNAiSuggest.logAudit({
        action: "panel-draft",
        context: "assistant",
        field: "draft",
        origin: "ai",
        value: draft.name
      });
      return {
        mode: "draft",
        leadIn:
          "Draft only. Apply prefills the drawer — it does not save. Use Add Role / Add Default Role to persist.",
        draft
      };
    }
    if (intent.type === "draft-user") {
      const draft = window.KNAiSuggest.deriveUserDraft(question);
      window.KNAiSuggest.logAudit({
        action: "panel-draft",
        context: "assistant",
        field: "draft",
        origin: "ai",
        value: (draft.roles || []).map((r) => r.name).join(",")
      });
      return {
        mode: "draft",
        leadIn:
          "Draft only. Apply prefills Add User — it does not create the account.",
        draft
      };
    }
    if (intent.type === "action-blocked") {
      return { mode: "text", text: null, blocked: true };
    }
    return null;
  }

  function answer(question, pageContext) {
    // Always re-read live hash grounding. Ignore stale captures from when the panel
    // was opened (sidenav replaceState does not fire hashchange by itself).
    const context = getContext();
    void pageContext;
    const q = String(question || "").trim();
    syncContextChip(context);
    const draftOrReview = answerDraftOrReview(q);
    if (draftOrReview?.mode === "draft" || draftOrReview?.mode === "review") {
      return draftOrReview;
    }
    if (draftOrReview?.blocked || (ACTION_INTENT.test(q) && !/\b(where|how do i|how to|what should i|before|draft|suggest)\b/i.test(q))) {
      return textAnswer({
        title: "I cannot change records here",
        thinking: [`Checked whether “${q}” requires a write on ${context.area || "this page"}`],
        text: noWriteResponse(q, context),
        followUps: followUpsFromContext(context, q)
      });
    }
    const lower = q.toLowerCase();
    const facts = context.facts || {};
    const persona = getSignedInPersona();
    const opsQuestion =
      /\b(shipment|shipments|container|containers|demurrage|hold|holds|delay|delayed|drayage|eta|in transit|on track|transport mode|ocean|air freight|visibility board)\b/i.test(
        q
      );
    const adminKind = /^(roles|role-detail|role-add|users|user-detail|user-add|defaults|default-detail|default-add)$/.test(
      context.kind || ""
    );
    const opsKind = /^(dashboard|visibility|visibility-detail|overview)$/.test(context.kind || "");
    // Refuse ops/shipment answers on admin pages before any other branch can leak Dashboard data.
    if (opsQuestion && (adminKind || (!opsKind && context.kind === "unavailable"))) {
      return textAnswer({
        title: "Not on this page",
        thinking: [
          `Checked the active page: ${context.area || context.title || "Administration"}`,
          "This question needs Dashboard or Visibility shipment data, which is not on the current page"
        ],
        text: `I am grounded on **${context.area || context.title || "this Administration page"}**, so I cannot answer shipment or container questions from here without inventing Dashboard data.\n\nNavigate to **Dashboard** or **KlearHub → Visibility**, then ask again.`,
        followUps: [
          { label: "Open Dashboard", prompt: "Where do I open the Dashboard?" },
          { label: "What can I ask here?", prompt: "What can you tell me about this page?" }
        ]
      });
    }
    const compared = answerCategoryDiff(q);
    if (compared) {
      return compared;
    }
    const genericEncyclopedia =
      /\b(what is (a |an )?(rbac|role[- ]based|permission system|access control)|explain (rbac|role inheritance) in general|encyclopedia|generally speaking)\b/i.test(
        q
      );

    if (genericEncyclopedia && !facts.role && !facts.roles?.length && context.kind === "unavailable") {
      return textAnswer({
        title: "Stay on a KlearNow page",
        thinking: ["Checked that this question needs product context, not a general definition"],
        text: "Klear Assistant is not a general knowledge tool. Open **Default Role Management** or **KN Role Management**, select a record, and ask about that template or role.",
        followUps: []
      });
    }

    if (context.kind === "unavailable") {
      if (/where|instead|go|navigate|open/.test(lower)) {
        return textAnswer({
          title: `Where to go instead of ${context.title}`,
          thinking: [`Checked that ${context.title} is unavailable in this workspace`],
          text: `**${context.title}** has no module in this workspace, so there is nothing to open here. Continue in **${facts.destination?.name || "Dashboard"}** (${context.manualPath}).`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/access|permission|lack/.test(lower)) {
        return textAnswer({
          title: "Workspace availability, not your permissions",
          thinking: [`Checked whether ${context.title} is missing because of access or workspace setup`],
          text: `This empty state is about the workspace, not your permissions${persona.role ? ` as **${persona.role}**` : ""}. **${context.title}** has not been enabled here. You still have **${facts.destination?.name || "Dashboard"}** and the Administration modules listed in the left navigation.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      return textAnswer({
        title: `${context.title} is unavailable`,
        thinking: [`Checked the empty state for ${context.title}`],
        text: `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (context.kind === "roles" || context.kind === "role-detail" || context.kind === "role-add") {
      const lowest = facts.lowest;
      const highest = facts.highest;
      const role = facts.role;
      const roles = facts.roles || [];
      const cov = role ? coverageFacts(role, context.kind) : null;

      if (genericEncyclopedia && !role) {
        return textAnswer({
          title: "Use a role on this page",
          thinking: ["Checked KN Role Management instead of answering with a generic definition"],
          text: `I do not keep encyclopedia-style definitions. On **KN Role Management**, open a role and ask about its coverage, owner, or status${lowest ? ` — for example **${lowest.name}** currently has the thinnest set` : ""}.`,
          followUps: followUpsFromContext(context, q)
        });
      }

      if (/list|which roles|all roles|catalog/.test(lower) && roles.length) {
        const lines = roles.slice(0, 8).map((item, index) => {
          const status = item.active === false ? "Inactive" : "Active";
          const itemCov = coverageFacts(item, "roles");
          return `${index + 1}. **${item.name}** — **${itemCov.ratio}** permissions · ${status}`;
        });
        const more = roles.length > 8 ? `\n\n…and **${roles.length - 8}** more on this page.` : "";
        return textAnswer({
          title: "Roles on KN Role Management",
          thinking: ["Listed roles visible on KN Role Management with permission counts"],
          text: `**${roles.length}** roles are visible in **KN Role Management**.\n\n${lines.join("\n")}${more}\n\nOpen a role name to jump to that row. I will not edit permissions from here.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/lowest|fewest|thin|coverage|compare/.test(lower) && lowest) {
        const lowestCov = coverageFacts(lowest, "roles");
        const extra =
          highest && highest.id !== lowest.id
            ? `\n- Broadest today: **${highest.name}** with **${coverageFacts(highest, "roles").ratio}** permissions`
            : "";
        if (role && /compare/.test(lower)) {
          return textAnswer({
            title: `${role.name} vs catalog coverage`,
            thinking: [
              `Checking ${role.name}'s permission coverage`,
              `Comparing with ${lowest.name} on KN Role Management`
            ],
            text: `**${role.name}** grants **${cov.ratio}** permissions${cov.mostly ? `, mostly in **${cov.mostly}**` : ""}.\n\n- Thinnest catalog entry: **${lowest.name}** (**${lowestCov.ratio}**)${extra}\n\nI can explain the gap; I cannot widen it from this panel.`,
            followUps: followUpsFromContext(context, q)
          });
        }
        return textAnswer({
          title: `Lowest coverage: ${lowest.name}`,
          thinking: ["Ranked KN Role Management by permission coverage"],
          text: `**${lowest.name}** has the lowest coverage on this page, with **${lowestCov.ratio}** permission${lowestCov.count === 1 ? "" : "s"}${lowestCov.mostly ? `, mostly in **${lowestCov.mostly}**` : ""}.\n\n- Status: **${lowest.active === false ? "Inactive" : "Active"}**${extra}\n\nI can explain the gap; I cannot widen it from this panel.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/inactive/.test(lower) && facts.inactive?.length) {
        const lines = facts.inactive.map((item) => {
          const itemCov = coverageFacts(item, "roles");
          return `- **${item.name}** — still lists **${itemCov.ratio}** permissions`;
        });
        return textAnswer({
          title: "Inactive roles on this page",
          thinking: ["Checked inactive roles in KN Role Management"],
          text: `**${facts.inactive.length}** inactive role${facts.inactive.length === 1 ? "" : "s"} on **KN Role Management**:\n\n${lines.join("\n")}\n\nStatus does not strip the permission set until someone edits the role.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (context.kind === "role-add") {
        return textAnswer({
          title: "Before you save a new KN role",
          thinking: ["Checked the new-role form fields on KN Role Management"],
          text: `${context.summary}\n\n- Applicability and a unique name are required\n- Permission groups follow KlearNow modules\n\n${context.manualPath}.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (role) {
        const applicable = formatPartyList(role.applicable);
        return textAnswer({
          title: /permission|coverage|grant/.test(lower)
            ? `${role.name} Permission Coverage`
            : `About ${role.name}`,
          thinking: [
            `Checking ${role.name}'s permission coverage and applicability`,
            `Reading coverage as ${cov.ratio} on KN Role Management`
          ],
          text: `**${role.name}** is **${role.active ? "active" : "inactive"}**, owned by **${role.createdBy || "an unknown owner"}**, and currently has **${cov.ratio}** permissions${cov.mostly ? `, mostly in **${cov.mostly}**` : ""}.\n\n- Applicable to: **${applicable || "KlearNow"}**\n- ${(context.details || []).join("\n- ")}\n\nOpen **${role.name}** to review the drawer. Editing still happens in **KN Role Management**.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      return textAnswer({
        title: "On KN Role Management",
        thinking: ["Checked the KN Role catalog on this page"],
        text: `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (context.kind === "users" || context.kind === "user-detail" || context.kind === "user-add") {
      const elevated = facts.elevatedInactive || [];
      const split = facts.split || {};
      const user = facts.user;
      if (/inactive|elevated/.test(lower)) {
        if (!elevated.length) {
          return textAnswer({
            title: "Elevated access check",
            thinking: ["Scanned KN User Management for inactive accounts with elevated roles"],
            text: `I do not see inactive users who still hold administrator-level roles on this page.\n\n- Inactive accounts total: **${split.inactive || 0}**`,
            followUps: followUpsFromContext(context, q)
          });
        }
        const lines = elevated.map(
          (item) => `- **${item.name}** — still assigned **${formatList(item.roles || [])}**`
        );
        return textAnswer({
          title: "Inactive with elevated access",
          thinking: ["Found inactive users who still hold elevated roles"],
          text: `**${elevated.length}** user${elevated.length === 1 ? "" : "s"} ${elevated.length === 1 ? "is" : "are"} inactive while still holding elevated roles:\n\n${lines.join("\n")}\n\nInactive status does not automatically strip elevated roles — that change still happens in the user record.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/split|klearnow|customer|broker/.test(lower) && split) {
        return textAnswer({
          title: "Roster split on KN User Management",
          thinking: ["Counted KlearNow, Customer, and Broker users on this list"],
          text: `On **KN User Management**:\n\n- **KlearNow**: **${split.kn || 0}**\n- **Customer**: **${split.customer || 0}**\n- **Broker**: **${split.broker || 0}**\n- **Inactive**: **${split.inactive || 0}**`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (context.kind === "user-add") {
        return textAnswer({
          title: "Before you save a new user",
          thinking: ["Checked the add-user form requirements"],
          text: `${context.summary}\n\n- Confirm level, entity, and roles before save\n\n${context.manualPath}.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (user) {
        return textAnswer({
          title: `Access held by ${user.name}`,
          thinking: [`Checking ${user.name}'s level, entity, and assigned roles`],
          text: `**${user.name}** (${user.email || "no email on file"}) is a **${levelLabel(user.level)}** user in **${user.entity || "the selected entity"}**.\n\n- Status: **${user.active ? "Active" : "Inactive"}**\n- Roles: **${formatList(user.roles || [])}**\n- Last active: **${user.lastActive || "not recorded"}**\n\n${persona.role ? `Signed in as **${persona.role}**, you can review this record in **KN User Management**; edits still happen on the form.` : "Open the user record to edit — I will not change assignments from here."}`,
          followUps: followUpsFromContext(context, q)
        });
      }
      return textAnswer({
        title: "On KN User Management",
        thinking: ["Checked the user roster on this page"],
        text: `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (context.kind === "defaults" || context.kind === "default-detail" || context.kind === "default-add") {
      const top = facts.top;
      const role = facts.role;
      const inactiveInherited = facts.inactiveInherited || [];
      const cov = role ? coverageFacts(role, context.kind) : null;

      if (genericEncyclopedia && !role) {
        return textAnswer({
          title: "Ask about a template on this page",
          thinking: ["Checked Default Role Management instead of a generic inheritance definition"],
          text: `I do not explain inheritance as a general concept. On **Default Role Management**, open a template${top ? ` such as **${top.name}**` : ""} and ask who inherits it, or what its coverage is.`,
          followUps: followUpsFromContext(context, q)
        });
      }

      if (role && (/inherit|who inherits|workspace|customer/.test(lower) || /permission|coverage|grant|access|applicable|service|party/.test(lower) || context.kind === "default-detail")) {
        const inherited = inheritCount(role);
        const names = Array.isArray(role.customers) ? role.customers.slice(0, 4) : [];
        const applicable = formatPartyList(role.applicable);
        const services = formatServiceList(role.services);
        const wantsInherit = /inherit|who inherits|workspace|customer/.test(lower);
        const wantsCoverage = /permission|coverage|grant|access/.test(lower);
        const title = wantsInherit
          ? `How ${role.name} Inherits Access`
          : wantsCoverage
            ? `${role.name} Permission Coverage`
            : /applicable|service|party/.test(lower)
              ? `Who ${role.name} Applies To`
              : `About ${role.name}`;

        const thinking = [
          `Checking ${role.name}'s permission structure and inheritance settings`,
          wantsInherit
            ? `Reading how many workspaces currently inherit ${role.name}`
            : `Comparing selected permissions against the Default Role catalog total`
        ];

        let body = `**${role.name}** currently has **${cov.ratio}** permissions${cov.mostly ? `, mostly in **${cov.mostly}**` : ""}, and is inherited by **${inherited}** workspace${inherited === 1 ? "" : "s"}.\n\n`;
        body += `- Applicable to: **${applicable || "unset parties"}**\n`;
        body += `- Services: **${services || "unset services"}**\n`;
        body += `- Status: **${role.active === false ? "Inactive" : "Active"}**\n`;
        if (names.length) {
          body += `- Named inheriting workspaces include: **${formatList(names)}**\n`;
        }
        body += `\nInheritance here means customer and broker workspaces pick up this template’s access when attached — it is not a general RBAC lecture. Open **${role.name}** on **Default Role Management** to review the drawer.`;
        if (persona.role) {
          body += ` As **${persona.role}**, you can inspect coverage and inheritance, but publishing changes still happens on the form.`;
        }

        return textAnswer({
          title,
          thinking,
          text: body.trim(),
          followUps: followUpsFromContext(context, q)
        });
      }

      if (/most|inherit|lead/.test(lower) && (role || top)) {
        const target = role || top;
        const targetCov = coverageFacts(target, "defaults");
        const names = Array.isArray(target.customers) ? target.customers.slice(0, 4) : [];
        return textAnswer({
          title: role ? `How ${target.name} Inherits Access` : `Most inherited: ${target.name}`,
          thinking: [
            "Checking Default Role Management templates and inheritance counts",
            `Reading workspaces inheriting ${target.name}`
          ],
          text: `**${target.name}** has the ${role ? "current" : "highest"} inheritance on **Default Role Management**, with **${inheritCount(target)}** workspace${inheritCount(target) === 1 ? "" : "s"}.\n\n- Coverage: **${targetCov.ratio}** permissions${targetCov.mostly ? `, mostly in **${targetCov.mostly}**` : ""}\n${names.length ? `- Named examples: **${formatList(names)}**\n` : ""}${target.active === false ? "- The template is **inactive**, but inheritance counts can still show.\n" : ""}\nOpen **${target.name}** to inspect the drawer. I will not attach or detach customers from here.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/inactive/.test(lower) && inactiveInherited.length) {
        const lines = inactiveInherited.map((item) => {
          const itemCov = coverageFacts(item, "defaults");
          return `- **${item.name}** — **${inheritCount(item)}** inheriting · **${itemCov.ratio}** permissions`;
        });
        return textAnswer({
          title: "Inactive yet still inherited",
          thinking: ["Checked inactive templates that still show inheritance"],
          text: `${lines.join("\n")}\n\nTurning a template off does not automatically detach customers. Review them in **Default Role Management**.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (context.kind === "default-add") {
        return textAnswer({
          title: "Before you publish a default role",
          thinking: ["Checked the new default-role form on Default Role Management"],
          text: `${context.summary}\n\n- Default roles are inherited by **Customer**, **Sub-customer**, **Company**, and **Parties** workspaces when attached\n- **KN Role Management** is for internal staff\n\n${context.manualPath}.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      return textAnswer({
        title: "On Default Role Management",
        thinking: ["Checked Default Role Management templates and inheritance counts"],
        text: `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (context.kind === "dashboard" || context.kind === "visibility" || context.kind === "visibility-detail" || context.kind === "overview") {
      const stats = facts.stats || visStats();
      const mode = facts.mode || topMode(stats);
      if (/action|need/.test(lower)) {
        return textAnswer({
          title: "Shipments needing action",
          thinking: [`Checked live shipment counts on ${context.area}`],
          text: `**${stats.action}** shipments need action out of **${stats.total}** active.\n\n- On hold: **${stats.hold}**\n- Delayed: **${stats.delayed}**\n\nOpen **Visibility** to work the exceptions; I cannot clear them here.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/hold/.test(lower) && /document|broker|responsible|linked|who owns|who is/.test(lower)) {
        return answerHoldChain(stats, context);
      }
      if (/demurrage|free time|detention/.test(lower)) {
        const chain = holdChainFromStats(stats);
        const amount = chain && typeof knShipmentAmount === "function" ? knFormatUsd(knShipmentAmount(chain.id)) : "";
        if (!chain) {
          return textAnswer({
            title: "No hold-to-demurrage row on this view",
            thinking: [`Checked ocean holds on ${context.area}`],
            evidence: [`Used view: ${context.area}`],
            text: `No on-hold ocean shipment with a linked bill is in this session.\n\nOpen **Dashboard** or **Visibility**.`,
            sources: [
              { label: "Dashboard", href: "#dashboard", type: "page", id: "dashboard" },
              { label: "Visibility", href: "#klearhub-visibility", type: "page", id: "visibility" }
            ]
          });
        }
        return textAnswer({
          title: `${chain.id} nearing demurrage`,
          thinking: [`Used shipment ${chain.id}`, "Used ocean hold + estimated value vs typical free-time exposure"],
          evidence: [`Used record: ${chain.id}`, chain.document ? `Used document: ${chain.document}` : ""],
          text: `**${chain.id}** is on hold${chain.container ? ` (**${chain.container}**)` : ""} at **${chain.location || "the terminal"}**.${amount ? ` Estimated value **${amount}**.` : ""}\n\n- Document: **${chain.document || "not on this record"}**\n- Broker: **${chain.broker || "not on this record"}**\n\nI cannot file a release from here.`,
          sources: [
            { label: chain.id, href: "#klearhub-visibility", type: "shipment", id: chain.id },
            { label: "Visibility", href: "#klearhub-visibility", type: "page", id: "visibility" }
          ]
        });
      }
      if (/hold/.test(lower)) {
        const names = (facts.holdSample || []).filter(Boolean);
        const list = names.length ? `\n\nExamples:\n${names.map((id) => `- **${id}**`).join("\n")}` : "";
        return textAnswer({
          title: "Holds on this view",
          thinking: [`Checked hold rows on ${context.area}`],
          text: `**${stats.hold}** shipments are on hold.${list}\n\n- Linked bills and brokers are on the hold record in **Visibility**\n- I cannot clear a hold from here`,
          sources: [
            { label: "Visibility", href: "#klearhub-visibility", type: "page", id: "visibility" },
            ...(facts.holdSample || []).slice(0, 2).map((id) => ({ label: id, href: "#klearhub-visibility", type: "shipment", id }))
          ],
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/delay|on track|versus|vs/.test(lower)) {
        return textAnswer({
          title: "Delayed vs on track",
          thinking: [`Compared delayed and on-track counts on ${context.area}`],
          text: `- Delayed: **${stats.delayed}**\n- On track: **${stats.ontime}**\n- In transit: **${stats.inTransit}**\n\nEarliest delay handling still happens in **Visibility**.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/mode|ocean|air|truck|rail|share|compare/.test(lower)) {
        const ocean = Number(stats.motPct?.ocean || stats.mot?.ocean || 0);
        const air = Number(stats.motPct?.air || stats.mot?.air || 0);
        const toPct = (value) => (value <= 1 ? Math.round(value * 100) : Math.round(value));
        if (mode) {
          return textAnswer({
            title: "Mode share on this page",
            thinking: [`Checked mode split on ${context.area}`],
            text: `**${knMotLabel(mode.id)}** currently accounts for the largest share (**${toPct(mode.value)}%**).\n\n- Ocean: **${toPct(ocean)}%**\n- Air: **${toPct(air)}%**`,
            followUps: followUpsFromContext(context, q)
          });
        }
        return textAnswer({
          title: "Mode share unavailable",
          thinking: [`Checked mode split on ${context.area}`],
          text: "Mode split is not available on this page yet.",
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/arrived|drayage|first/.test(lower)) {
        return textAnswer({
          title: "Arrived / pending drayage",
          thinking: [`Checked arrived and hold counts on ${context.area}`],
          text: `**${stats.arrived}** containers are arrived / pending drayage.\n\nStart with those plus the **${stats.hold}** holds if you are triaging exceptions.`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/snapshot|represent|count/.test(lower)) {
        return textAnswer({
          title: "Snapshot counts",
          thinking: ["Checked snapshot counts tied to the live Visibility set"],
          text: `Snapshot counts come from the same live shipment set as **Visibility**:\n\n- Active: **${stats.total}**\n- In transit: **${stats.inTransit}**\n- Arrived: **${stats.arrived}**\n- Delayed: **${stats.delayed}**`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (context.kind === "visibility-detail") {
        const row = facts.row;
        return textAnswer({
          title: `Shipment ${facts.detailId}`,
          thinking: [`Checking status for ${facts.detailId} on Visibility`],
          text: row
            ? `**${facts.detailId}** is showing status **${row.status || "not set"}**${row.location ? ` at **${row.location}**` : ""}.\n\n${context.hint}`
            : `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
          followUps: followUpsFromContext(context, q)
        });
      }
      if (/where|navigate|open|find|next/.test(lower)) {
        return textAnswer({
          title: "Where to go next",
          thinking: [`Checked navigation from ${context.area}`],
          text: `${context.manualPath}.\n\n${context.hint}`,
          followUps: followUpsFromContext(context, q)
        });
      }
      return textAnswer({
        title: `On ${context.area || context.title}`,
        thinking: [`Checked live data on ${context.area || context.title}`],
        text: `${context.summary}\n\n${(context.details || []).map((item) => `- ${item}`).join("\n")}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (/where|navigate|open|find|next/.test(lower)) {
      return textAnswer({
        title: "Where to go",
        thinking: [`Checked navigation from ${context.area || "this page"}`],
        text: `${context.manualPath}.\n\n${context.hint}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    if (genericEncyclopedia) {
      const hrefHint = pageHrefFor(context);
      return textAnswer({
        title: "Need a page-grounded question",
        thinking: ["Checked that only a general definition would answer this"],
        text: `I do not have a general encyclopedia answer for that. ${hrefHint ? `Stay on **${context.area || "this page"}** and ask about a specific record or count you can see.` : "Open Default Role Management or KN Role Management, select a record, and ask again."}`,
        followUps: followUpsFromContext(context, q)
      });
    }

    return textAnswer({
      title: context.title || "This page",
      thinking: [`Checked what is available on ${context.area || "this page"}`],
      text: `${context.summary} ${context.details?.[0] || ""}\n\nIf you need a specific record, open it in the table and ask again.`,
      followUps: followUpsFromContext(context, q)
    });
  }

  const DEMURRAGE_NEAR_USD = 12000;

  function demurrageFlagPayload() {
    const rows = visSummary?.rows || window.KNShipments || [];
    const hit = rows.find(
      (item) =>
        item.status === "On Hold" &&
        item.mot === "ocean" &&
        typeof knShipmentAmount === "function" &&
        knShipmentAmount(item.id) >= DEMURRAGE_NEAR_USD
    );
    if (!hit || !window.KNAdminUX?.opsFlagHtml) {
      return "";
    }
    const amount = knFormatUsd(knShipmentAmount(hit.id));
    return window.KNAdminUX.opsFlagHtml({
      id: `demurrage-hold-${hit.id}`,
      title: "Hold nearing demurrage",
      body: `<strong>${escapeHtml(hit.id)}</strong> (${escapeHtml(hit.container || "container")}) is on hold at <strong>${escapeHtml(hit.dest?.city || "terminal")}</strong>. Estimated value <strong>${escapeHtml(amount)}</strong> — free time is at risk.`,
      href: "#klearhub-visibility",
      hrefLabel: "Visibility"
    });
  }

  function syncOpsFlags() {
    const pageHtml =
      isDashboardRoute() || isKlearhubVisibilityRoute() ? demurrageFlagPayload() : "";
    document.querySelectorAll("[data-ai-ops-page-slot]").forEach((node) => node.remove());
    const mountAfter = isDashboardRoute()
      ? document.querySelector(".dashboard-inner > .hero")
      : isKlearhubVisibilityRoute()
        ? document.querySelector("#vis-list-shell > .hero")
        : null;
    if (mountAfter && pageHtml) {
      const wrap = document.createElement("div");
      wrap.setAttribute("data-ai-ops-page-slot", "1");
      wrap.innerHTML = pageHtml;
      mountAfter.insertAdjacentElement("afterend", wrap);
    }
    if (flagsSlot) {
      const panelHtml = pageHtml;
      flagsSlot.innerHTML = panelHtml;
      flagsSlot.hidden = !panelHtml;
    }
  }

  function openPanel(trigger) {
    lastTrigger = trigger || lastTrigger;
    dismissCoachmark();
    isOpen = true;
    shell.classList.add("ai-assistant-open");
    setExpandedState(true);
    updateWidth(preferredWidth);
    syncContextChip();
    syncOpsFlags();
    if (!hasSeenFlag(INTRO_SEEN_KEY)) {
      showIntro();
      return;
    }
    hideIntro();
    if (!history.querySelector(".ai-msg--user")) {
      renderEmptyState();
    }
    window.requestAnimationFrame(() => input.focus());
  }

  function closePanel() {
    isOpen = false;
    shell.classList.remove("ai-assistant-open");
    setExpandedState(false);
    if (hasSeenFlag(INTRO_SEEN_KEY)) {
      hideIntro();
    }
    lastTrigger?.focus();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (isOpen) {
        closePanel();
        return;
      }
      openPanel(trigger);
    });
  });

  closeBtn?.addEventListener("click", closePanel);

  helpBtn?.addEventListener("click", () => {
    if (!isOpen) {
      return;
    }
    showIntro();
  });

  function sendQuestion(raw) {
    const question = String(raw || "").trim();
    if (!question) {
      return;
    }
    dismissIntroIfNeeded();
    input.value = question;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  }

  panel.addEventListener("click", (event) => {
    const applyBtn = event.target.closest("[data-ai-draft-apply]");
    if (applyBtn && panel.contains(applyBtn)) {
      event.preventDefault();
      const type = applyBtn.getAttribute("data-ai-draft-apply");
      const draft =
        pendingDraftPayload && pendingDraftPayload.type === type
          ? pendingDraftPayload
          : window.KNAiSuggest?.peekDraft?.(type);
      if (!draft) {
        addMessage("assistant", "That draft is no longer available. Ask me to draft again.", { actions: true });
        return;
      }
      window.KNAiSuggest.applyDraftNavigation(draft);
      addMessage(
        "assistant",
        "Opened the form with the draft prefilled. Nothing is saved until you click the real Add / Update button on that form.",
        { actions: true }
      );
      return;
    }
    const dismissBtn = event.target.closest("[data-ai-draft-dismiss]");
    if (dismissBtn && panel.contains(dismissBtn)) {
      event.preventDefault();
      pendingDraftPayload = null;
      try {
        window.sessionStorage.removeItem(window.KNAiSuggest?.DRAFT_KEY || "kn-ai-draft-v1");
      } catch (_error) {
        /* ignore */
      }
      dismissBtn.closest(".ai-draft-card")?.remove();
      addMessage("assistant", "Draft dismissed. Nothing was saved.", { actions: true });
      return;
    }
    const reviewOpen = event.target.closest("[data-ai-review-open]");
    if (reviewOpen && panel.contains(reviewOpen)) {
      window.KNAiSuggest?.logAudit?.({
        action: "open-role-for-review",
        context: "assistant",
        field: "role",
        origin: "manual",
        value: reviewOpen.getAttribute("data-ai-review-open") || ""
      });
      return;
    }
    const entityLink = event.target.closest("[data-ai-entity]");
    if (entityLink && panel.contains(entityLink)) {
      event.preventDefault();
      openEntityLink(
        entityLink.getAttribute("data-ai-entity"),
        entityLink.getAttribute("data-ai-entity-id"),
        entityLink.getAttribute("href")
      );
      return;
    }
    const thinkingToggle = event.target.closest(".ai-msg__thinking-toggle");
    if (thinkingToggle && panel.contains(thinkingToggle)) {
      event.preventDefault();
      const panelEl = thinkingToggle.closest(".ai-msg__thinking-panel");
      const trace = panelEl?.querySelector(".ai-msg__thinking-trace");
      const label = thinkingToggle.querySelector(".ai-msg__thinking-toggle-label");
      const expanded = thinkingToggle.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      thinkingToggle.setAttribute("aria-expanded", String(next));
      if (trace) {
        trace.hidden = !next;
      }
      if (label) {
        label.textContent = next ? "Hide thinking" : "Show thinking";
      }
      return;
    }
    const copyBtn = event.target.closest("[data-ai-msg-copy]");
    if (copyBtn && panel.contains(copyBtn)) {
      event.preventDefault();
      const article = copyBtn.closest(".ai-msg");
      const title = article?.querySelector(".ai-msg__response-title")?.textContent?.trim() || "";
      const bodyText = plainTextFromHtml(article?.querySelector(".ai-msg__body")?.innerHTML || "");
      const text = [title, bodyText].filter(Boolean).join("\n\n");
      const done = () => {
        copyBtn.classList.add("is-copied");
        copyBtn.setAttribute("aria-label", "Copied");
        announceAssistant("Response copied.");
        window.setTimeout(() => {
          copyBtn.classList.remove("is-copied");
          copyBtn.setAttribute("aria-label", "Copy response");
        }, 1600);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => copyKnValue(text, "response", copyBtn));
      } else {
        copyKnValue(text, "response", copyBtn);
        done();
      }
      return;
    }
    const feedbackBtn = event.target.closest("[data-ai-msg-feedback]");
    if (feedbackBtn && panel.contains(feedbackBtn)) {
      event.preventDefault();
      const value = feedbackBtn.getAttribute("data-ai-msg-feedback");
      const group = feedbackBtn.closest(".ai-msg__actions");
      group?.querySelectorAll("[data-ai-msg-feedback]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn === feedbackBtn));
        btn.classList.toggle("is-selected", btn === feedbackBtn);
      });
      announceAssistant(value === "up" ? "Marked helpful. AI suggests — review before saving." : "Marked unhelpful. Thanks for the feedback.");
      return;
    }
    const chip = event.target.closest("[data-ai-prompt]");
    if (!chip || !panel.contains(chip)) {
      return;
    }
    event.preventDefault();
    sendQuestion(chip.getAttribute("data-ai-prompt") || chip.textContent);
  });

  refChipDismiss?.addEventListener("click", (event) => {
    event.preventDefault();
    refChipDismissed = true;
    if (refChip) {
      refChip.hidden = true;
    }
  });

  input.addEventListener("input", updateSendControl);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isResponding) {
        stopGeneration();
        return;
      }
      if (input.value.trim()) {
        form.requestSubmit();
      }
    }
  });

  sendBtn?.addEventListener("click", (event) => {
    if (!isResponding) {
      return;
    }
    event.preventDefault();
    stopGeneration();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isResponding) {
      stopGeneration();
      return;
    }
    const question = input.value.trim();
    if (!question) {
      return;
    }
    const genId = ++generationId;
    fadeOutEmptySurfaces();
    addMessage("user", question);
    input.value = "";
    updateSendControl();
    setResponding(true);
    // Resolve grounding AFTER the delay so chip + answer + presentResult share one fresh context.
    setThinking(true, getContext());
    try {
      await delay(160);
      if (genId !== generationId) {
        return;
      }
      const context = getContext();
      const result = answer(question, context);
      await presentResult(result, context, genId, question);
    } catch (_error) {
      if (genId === generationId) {
        setThinking(false);
        addMessage("assistant", "I could not process that request right now. Please try again.", { actions: true });
        announceAssistant("I could not process that request right now.");
      }
    } finally {
      if (genId === generationId) {
        setResponding(false);
        updateSendControl();
      }
    }
  });

  resizeHandle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? WIDTH_STEP : -WIDTH_STEP;
    updateWidth(preferredWidth + delta);
  });

  resizeHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = preferredWidth;
    const onMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      updateWidth(startWidth + delta);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  window.addEventListener("resize", () => {
    syncWidthBounds();
    updateWidth(preferredWidth, { persist: false });
    placeCoachmark();
  });

  function onAssistantRouteChange() {
    refChipDismissed = false;
    const context = getContext();
    syncContextChip(context);
    syncOpsFlags();
    if (!isOpen) {
      return;
    }
    if (introEl && !introEl.hidden) {
      fillIntro(context);
      return;
    }
    // Refresh empty-state / welcome prompts so Dashboard chips don't linger on admin pages.
    if (!history.querySelector(".ai-msg--user")) {
      renderEmptyState();
    }
  }

  window.addEventListener("hashchange", onAssistantRouteChange);
  // Sidenav uses history.replaceState via setRouteHash — no hashchange fires.
  window.addEventListener("kn-route-change", onAssistantRouteChange);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (coachmarkVisible) {
      event.preventDefault();
      event.stopPropagation();
      dismissCoachmark();
      return;
    }
    if (isResponding && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      stopGeneration();
      return;
    }
    if (!isOpen) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    closePanel();
  });

  document.addEventListener("click", (event) => {
    const dismiss = event.target.closest("[data-ai-ops-dismiss]");
    if (!dismiss) {
      return;
    }
    event.preventDefault();
    window.KNAdminUX?.dismissOpsFlag?.(dismiss.getAttribute("data-ai-ops-dismiss"));
    syncOpsFlags();
  });

  window.KNAiOpsSurface = { sync: syncOpsFlags };
  window.addEventListener("kn-ai-ops-flag-change", () => syncOpsFlags());

  updateWidth(preferredWidth);
  setExpandedState(false);
  updateSendControl();
  syncContextChip();
  syncOpsFlags();
  window.requestAnimationFrame(() => showCoachmark());
}

hydrateDashFromVisibility();
initBladeTooltips();
initDashboardLoader();
initDashboardLayout();
initHoldDrawer();
initDashDatePicker();
initAiAssistant();

document.querySelector(".top-nav-brand-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  sideNav.querySelector('.side-nav-link[href="#dashboard"]')?.click();
  window.requestAnimationFrame(() => replayDashEnter());
});
