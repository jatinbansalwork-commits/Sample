const visSummary =
  typeof window.knSummarizeShipments === "function"
    ? window.knSummarizeShipments(window.KNShipments)
    : { total: 0, shipments: 0, containers: 0, inTransit: 0, hold: 0, waiting: 0, arrived: 0, action: 0, delayed: 0, ontime: 0, demurrageExceeded: 0, demurrageRisk: 0, perDiemExceeded: 0, perDiemRisk: 0, notReleased: 0, readyPickup: 0, gateOut: 0, mot: {}, motPct: {}, origin: {}, holdRows: [], delayedRows: [], arrivals: [], newest: [], amounts: {}, earliestDelayEta: "", rows: [] };

const holdRows = visSummary.holdRows;

const kpis = [
  {
    label: "Active Shipments",
    value: String(visSummary.total),
    trend: "From Visibility",
    trendClass: "positive",
    open: { record: "shipment" }
  },
  {
    label: "Active Containers",
    value: String(visSummary.total),
    trend: "From Visibility",
    trendClass: "positive",
    open: { record: "container" }
  },
  {
    label: "In Transit",
    value: String(visSummary.inTransit),
    trend: `${visSummary.ontime} on track`,
    trendClass: "positive",
    open: { risk: "transit" }
  },
  {
    label: "Waiting to Depart",
    value: String(visSummary.waiting),
    trend: visSummary.delayed ? `${visSummary.delayed} delayed` : "On schedule",
    trendClass: visSummary.delayed ? "negative" : "positive",
    open: { risk: "waiting" }
  },
  {
    label: "Drayage Pending",
    value: String(visSummary.arrived),
    trend: visSummary.hold ? `${visSummary.hold} on hold` : "On track",
    trendClass: visSummary.hold ? "negative" : "positive",
    hint: "Containers waiting for a short-haul truck move from the terminal to a warehouse or rail ramp.",
    open: { risk: "arrived" }
  }
];

const risks = [
  { label: "Demurrage Exceeded", count: String(visSummary.demurrageExceeded), styleClass: visSummary.demurrageExceeded ? "danger" : "", hint: "Free time at the terminal has ended. Daily storage fees are accruing.", open: { risk: "hold" } },
  { label: "Per Diem Exceeded", count: String(visSummary.perDiemExceeded), styleClass: visSummary.perDiemExceeded ? "danger" : "", hint: "The container is still out past the allowed days. Daily rental fees are accruing.", open: { risk: "action" } },
  { label: "Demurrage Risk", count: String(visSummary.demurrageRisk), styleClass: visSummary.demurrageRisk ? "notice" : "", hint: "Free time ends soon. Request drayage to avoid extra fees.", open: { risk: "arrived" } },
  { label: "In Per Diem Risk", count: String(visSummary.perDiemRisk), styleClass: "", hint: "The container is approaching the last free day of use.", open: { risk: "action" } }
];

const events = [
  { label: "Container not Released", count: String(visSummary.notReleased), open: { risk: "hold" } },
  { label: "Container on Hold", count: String(visSummary.hold), open: { record: "container", risk: "hold" } },
  { label: "Ready for Pickup", count: String(visSummary.readyPickup), open: { risk: "arrived" } },
  { label: "Container Gate Out", count: String(visSummary.gateOut), hint: "The container has left the terminal.", open: { record: "container" } }
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

function clipAlertLists() {
  document.querySelectorAll("#alerts-body .alert-card__list-wrap").forEach((wrap) => {
    wrap.classList.toggle("is-clipped", wrap.querySelectorAll(".alert-hit").length > 2);
  });
}

const holdDrawerList = document.getElementById("hold-drawer-list");
holdRows.forEach((row, index) => {
  const li = document.createElement("li");
  li.innerHTML = holdItemHtml(row, index);
  holdDrawerList?.appendChild(li);
});

const holdViewAll = document.getElementById("alert-hold-viewall");
if (holdRows.length > 2 && holdViewAll) {
  holdViewAll.hidden = false;
  holdViewAll.textContent = `View all (${holdRows.length})`;
}

// ── Demurrage Risk ───────────────────────────────────────────────────────────
const demurrageRows = (visSummary.rows || visSummary.arrivals || []).filter((item) =>
  /port of delivery|ready for pickup/i.test(item.status || "")
);

const demurrageHits = document.getElementById("alert-demurrage-hits");
const demurrageEmpty = document.getElementById("alert-demurrage-empty");
const demurrageViewAll = document.getElementById("alert-demurrage-viewall");
if (demurrageHits) {
  if (demurrageRows.length === 0) {
    if (demurrageEmpty) demurrageEmpty.hidden = false;
  } else {
    const fmt = typeof window.knFormatEta === "function" ? window.knFormatEta : (d) => d;
    demurrageHits.innerHTML = demurrageRows
      .map((item) => {
        const statusLabel = /ready for pickup/i.test(item.status || "") ? "Ready for pickup" : "At port of delivery";
        return alertHitHtml(item.id, statusLabel, item.dest.city, fmt(item.dest.date), "", "negative", { record: "all", risk: "arrived" });
      })
      .join("");
    if (demurrageViewAll && demurrageRows.length > 2) {
      demurrageViewAll.hidden = false;
      demurrageViewAll.textContent = `View all (${demurrageRows.length})`;
    }
  }
}

// ── Shipment Delays ──────────────────────────────────────────────────────────
const delayHits = document.getElementById("alert-delay-hits");
const delayEmpty = document.getElementById("alert-delay-empty");
const delayViewAll = document.getElementById("alert-delay-viewall");
const delayedRows = visSummary.delayedRows || [];
if (delayHits) {
  if (delayedRows.length === 0) {
    if (delayEmpty) delayEmpty.hidden = false;
  } else {
    const fmt = typeof window.knFormatEta === "function" ? window.knFormatEta : (d) => d;
    delayHits.innerHTML = delayedRows
      .map((item) => alertHitHtml(item.id, item.delay, item.dest.city, fmt(item.dest.date), "", "notice", { record: "all", risk: "delayed" }))
      .join("");
    if (delayViewAll && delayedRows.length > 2) {
      delayViewAll.hidden = false;
      delayViewAll.textContent = `View all (${delayedRows.length})`;
    }
  }
}

// ── Containers on Hold ───────────────────────────────────────────────────────
const holdHits = document.getElementById("alert-hold-hits");
const holdEmpty = document.getElementById("alert-hold-empty");
if (holdHits) {
  if (holdRows.length === 0) {
    if (holdEmpty) holdEmpty.hidden = false;
  } else {
    holdHits.innerHTML = holdRows
      .map((row) => alertHitHtml(row.id, row.reason, `${row.container} · ${row.location}`, row.release, holdHints[row.reason], "information", { record: "all", risk: "hold" }))
      .join("");
  }
}

clipAlertLists();

const kpiGrid = document.getElementById("kpi-grid");
const riskList = document.getElementById("risk-list");
const eventsList = document.getElementById("events-list");
let shipmentMap = null;

const NAV_CHEVRON =
  '<svg class="nav-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

kpis.forEach((kpi) => {
  const card = document.createElement("a");
  card.className = "kpi-stat";
  card.href = "#klearhub-visibility";
  card.setAttribute("data-vis-open", JSON.stringify(kpi.open));
  card.setAttribute("aria-label", `Open Visibility for ${kpi.label}, ${kpi.value}`);
  if (kpi.hint) {
    card.setAttribute("data-tooltip", kpi.hint);
  }
  const trendTone = kpi.trendClass === "negative" ? "negative" : "positive";
  card.innerHTML = `
    <span class="kpi-stat__label type-caption-sm type-weight-medium">${kpi.label}</span>
    <span class="kpi-stat__metrics">
      <span class="kpi-stat__value type-heading-h4 type-weight-semibold">${kpi.value}</span>
      <span class="badge badge--${trendTone} type-caption-sm type-weight-medium">${kpi.trend}</span>
    </span>
    ${NAV_CHEVRON}
  `;
  kpiGrid.appendChild(card);
});

risks.forEach((risk) => {
  const li = document.createElement("li");
  li.innerHTML = `
    <a class="metric-row ${risk.styleClass}" href="#klearhub-visibility" data-vis-open='${JSON.stringify(risk.open)}' aria-label="Open Visibility for ${risk.label}"${risk.hint ? ` data-tooltip="${risk.hint}"` : ""}>
      <span class="metric-label type-ui-md type-weight-medium">${risk.label}</span>
      <span class="metric-row__end">
        <strong class="type-heading-h6 type-weight-semibold">${risk.count}</strong>
        ${NAV_CHEVRON}
      </span>
    </a>
  `;
  riskList.appendChild(li);
});

events.forEach((eventRow) => {
  const li = document.createElement("li");
  li.innerHTML = `
    <a class="metric-row" href="#klearhub-visibility" data-vis-open='${JSON.stringify(eventRow.open)}' aria-label="Open Visibility for ${eventRow.label}"${eventRow.hint ? ` data-tooltip="${eventRow.hint}"` : ""}>
      <span class="metric-label type-ui-md type-weight-medium">${eventRow.label}</span>
      <span class="metric-row__end">
        <span class="count type-ui-sm type-weight-medium">${eventRow.count}</span>
        ${NAV_CHEVRON}
      </span>
    </a>
  `;
  eventsList.appendChild(li);
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

function getCurrentPageTitle() {
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
}

function syncPageView() {
  const dashboardInner = document.querySelector(".dashboard-inner");
  const overviewPage = document.getElementById("klearhub-overview-page");
  const visibilityPage = document.getElementById("klearhub-visibility-page");
  const emptyPage = document.getElementById("empty-page");
  const emptyTitle = document.getElementById("empty-page-title");
  const emptyDescription = document.getElementById("empty-page-description");
  const emptyCta = document.getElementById("empty-page-cta");
  const isDashboard = isDashboardRoute();
  const isOverview = isKlearhubOverviewRoute();
  const isVisibility = isKlearhubVisibilityRoute();

  if (dashboardInner) {
    dashboardInner.hidden = !isDashboard;
  }
  if (overviewPage) {
    overviewPage.hidden = !isOverview;
  }
  if (visibilityPage) {
    visibilityPage.hidden = !isVisibility;
  }
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
    emptyPage.hidden = isDashboard || isOverview || isVisibility;
  }
  if (!isDashboard && !isOverview && isVisibility === false) {
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
  event.preventDefault();
  const href = link.getAttribute("href");
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
  const deepLink =
    sideNav.querySelector(`.side-nav-link[data-level="2"][href="${hashPath}"]`) ||
    sideNav.querySelector(`.side-nav-link[data-level="1"][href="${hashPath}"]`);
  deepLink?.click();
}

document.querySelector(".breadcrumb").addEventListener("click", (event) => {
  const link = event.target.closest("a.breadcrumb-link");
  if (!link) {
    return;
  }
  event.preventDefault();
  const href = link.getAttribute("href");
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
  const stamps = rows.map((item) => item.created || "").filter(Boolean).sort();
  const latestDay = (stamps[stamps.length - 1] || "").slice(0, 10);
  const latestDate = latestDay ? new Date(`${latestDay}T00:00:00Z`) : new Date();
  const weekStart = new Date(latestDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const weekStamp = weekStart.toISOString().slice(0, 10);
  const today = latestDay ? countRows(rows, (item) => (item.created || "").startsWith(latestDay)) : 0;
  const week = latestDay ? countRows(rows, (item) => (item.created || "") >= weekStamp) : 0;
  const pending = countRows(rows, (item) => /waiting to depart/i.test(item.status || ""));
  return { today, week, month: rows.length, pending, ingested: Math.max(0, rows.length - pending) };
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
    meta: [{ label: "Active MAWBs", value: String(air.length) }],
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
        <span class="kh-accordion__title type-heading-h6 type-weight-semibold">${mode.title}</span>
        <span class="kh-accordion__meta">${meta}</span>
        <svg class="kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div class="kh-accordion__body">
        ${stages}
        <div class="split-grid">
          <article class="subpanel">
            <h3 class="type-heading-h6 type-weight-semibold">Shipments Overview</h3>
            <ul class="metric-list">${renderMetricList(mode.shipments)}</ul>
          </article>
          <article class="subpanel">
            <h3 class="type-heading-h6 type-weight-semibold">Ingestion Overview</h3>
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
      window.KNMapUx ? window.KNMapUx.createPillIcon(vessel) : shipmentMarkerIcon(vessel)
  });
  window.KNMapUx?.bindList(document.getElementById("dash-live"));

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
    const livePoints = window.KNAis?.getFitPoints(shipmentMap) || [];
    const portPoints = shipmentMarkers
      .filter((item) => item.kind !== "ship")
      .map((item) => [item.lat, item.lng]);
    fitMapToPoints(shipmentMap, livePoints.length ? [...portPoints, ...livePoints] : shipmentMarkers.map((item) => [item.lat, item.lng]));
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
    const livePoints = window.KNAis?.getFitPoints(shipmentMap) || [];
    const portPoints = shipmentMarkers
      .filter((item) => item.kind !== "ship")
      .map((item) => [item.lat, item.lng]);
    fitMapToPoints(
      shipmentMap,
      livePoints.length ? [...portPoints, ...livePoints] : shipmentMarkers.map((item) => [item.lat, item.lng])
    );
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
  { id: "actions", title: "Quick actions", description: "Request Drayage, holds, documents, and visibility" },
  { id: "alerts", title: "Critical alerts", description: "Demurrage risk, delays, and containers on hold" },
  { id: "overview", title: "Live snapshot", description: "KPIs, risk, events, and the global shipment map" },
  { id: "stats", title: "Shipment snapshot", description: "Total, in transit, on hold, and delivered" },
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
    showBladeToast({ content: `Copied ${label} ${text}`, color: "positive" });
    markKnCopied(sourceEl);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(announce).catch(announce);
    return;
  }
  announce();
}

window.copyKnValue = copyKnValue;
window.showBladeToast = showBladeToast;

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

function showBladeToast({ content, color = "positive" }) {
  const container = document.getElementById("blade-toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "blade-toast-container";
    el.id = "blade-toast-container";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  })();

  container.querySelectorAll(".blade-toast").forEach((el) => el.remove());

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
    if (toast.classList.contains("is-leaving")) {
      return;
    }
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 220);
  };

  toast.querySelector("button")?.addEventListener("click", remove);
  container.appendChild(toast);
  window.setTimeout(remove, 4000);
}

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

  const fillInputs = (start, end) => {
    startInput.value = toISODate(start);
    endInput.value = toISODate(end);
    error.hidden = true;
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
    if (persist) {
      showBladeToast({ content: `Showing ${text}`, color: "information" });
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
    if (!start || !end || end < start) {
      error.hidden = false;
      (end && start && end < start ? endInput : startInput).focus();
      return;
    }
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
    error.hidden = true;
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
      showBladeToast({ content: "Dashboard layout saved", color: "positive" });
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
  setKnText("drayage-caption", knPlural(summary.arrived, "container at destination", "containers at destination"));
  setKnText("holds-caption", knPlural(summary.hold, "container on hold", "containers on hold"));
  setKnText("visibility-caption", knPlural(summary.total, "active shipment", "active shipments"));
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
  setKnText("collected-trend", `${summary.ontime} on track this week`);
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
            <p class="type-ui-md type-weight-semibold">E-invoice · ${invoiceItem.po}</p>
            <p class="type-caption-sm">${invoiceItem.company} · ${usd(summary.amounts[invoiceItem.id])}</p>
          </div>
          <span class="${knBadgeClass("information")}">Pending</span>
        </li>
      `);
    }
    filings.innerHTML = items.join("");
  }

  const lanes = document.getElementById("dash-lanes");
  if (lanes) {
    const countries = Object.entries(summary.origin || {}).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    const max = countries[0]?.[1].total || 1;
    lanes.setAttribute("aria-label", "Shipments by origin country");
    lanes.innerHTML = countries
      .map(([country, counts]) => {
        const pct = (value) => `${Math.round((value / max) * 100)}%`;
        return `
          <div class="dash-bars__row">
            <span class="type-caption-sm">${country}</span>
            <div class="dash-bars__track">
              <span class="dash-bars__seg chart-cat--blue" style="width: ${pct(counts.ocean)}"></span>
              <span class="dash-bars__seg chart-cat--green" style="width: ${pct(counts.air)}"></span>
              <span class="dash-bars__seg chart-cat--gold" style="width: ${pct(counts.truck)}"></span>
            </div>
            <strong class="type-caption-sm">${counts.total}</strong>
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
            <p class="type-caption-sm">${item.dest.date} · ${item.company}</p>
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

hydrateDashFromVisibility();
initBladeTooltips();
initDashboardLoader();
initDashboardLayout();
initHoldDrawer();
initDashDatePicker();

document.querySelector(".top-nav-brand-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  sideNav.querySelector('.side-nav-link[href="#dashboard"]')?.click();
  window.requestAnimationFrame(() => replayDashEnter());
});
