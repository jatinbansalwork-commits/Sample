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
      <span class="badge type-caption-sm type-weight-medium kn-badge">${row.release}</span>
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

function mountDashCharts(summary) {
  if (!window.KNGenUI?.mount) {
    return;
  }
  const lanesHost = document.getElementById("dash-lanes-genui");
  if (lanesHost) {
    const rows = originLaneRows(summary.origin);
    window.KNGenUI.mount(
      lanesHost,
      {
        components: [
          {
            component: "CHART",
            chartType: "bar",
            variant: "compact",
            title: "Shipments by lane",
            xAxis: "lane",
            valueFormatter: { type: "number" },
            data: rows.map((row) => ({
              lane: row.label,
              ocean: row.counts.ocean,
              air: row.counts.air,
              truck: row.counts.truck,
              rail: row.counts.rail
            }))
          }
        ]
      },
      { animate: false }
    );
    hydrateKnCharts(lanesHost);
  }
  const donutHost = document.getElementById("dash-donut-genui");
  if (donutHost) {
    window.KNGenUI.mount(
      donutHost,
      {
        components: [
          {
            component: "CHART",
            chartType: "pie",
            variant: "compact",
            title: "Mode mix",
            xAxis: "mode",
            centerLabel: `${summary.total} active`,
            valueFormatter: { type: "percentage", suffix: "%" },
            data: [
              { mode: "Ocean", value: summary.motPct.ocean || 0 },
              { mode: "Air", value: summary.motPct.air || 0 },
              { mode: "Truck", value: summary.motPct.truck || 0 },
              { mode: "Rail", value: summary.motPct.rail || 0 }
            ]
          }
        ]
      },
      { animate: false }
    );
    hydrateKnCharts(donutHost);
  }
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
  '<svg class="nav-chevron kn-move" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

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
  card.className = "kpi-stat kn-animate-interactions";
  card.setAttribute("data-map-filter", kpi.key);
  card.setAttribute("data-motion-trigger", "hover");
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", `Show ${kpi.label} on the map, ${kpi.value}`);
  if (kpi.hint) {
    card.setAttribute("data-tooltip", kpi.hint);
  }
  card.innerHTML = `
    <span class="kpi-stat__label type-caption-sm type-weight-medium">${kpi.label}</span>
    <span class="kpi-stat__metrics">
      <span class="kpi-stat__value type-heading-h4 type-weight-semibold">${kpi.value}</span>
      <span class="badge badge--${badgeToneForKpi(kpi.trendClass)} type-caption-sm type-weight-medium kn-badge">${kpi.trend}</span>
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
// Guarded, not just an assumption: on every page that currently loads this
// script (index.html, home.html), #side-nav-l2 is static markup parsed
// well before this plain, non-deferred <script> tag, so sideNavL2 is never
// actually null today. Optional-chained anyway so a future page without
// that element (or a reordered script tag) degrades to a no-op here
// instead of throwing and aborting the rest of script.js.
const sideNavL2Title = sideNavL2?.querySelector(".side-nav-l2__title");
const sideNavL2Back = sideNavL2?.querySelector(".side-nav-l2__back");

const HOVER_AGAIN_DELAY = 500;
const L1_EXIT_HOVER_DELAY = 150;
const TRANSITION_CLEANUP_DELAY = 300;

let activeL2Trigger = null;
let isL1Collapsed = document.documentElement.dataset.knL1 === "collapsed";
let isL1Hovered = false;
let isHoverAgainEnabled = true;
let isTransitioning = false;
let hoverTimeout;
let hoverAgainTimeout;
let transitionTimeout;

function isMediumOrHdDesktop() {
  const matched = document.documentElement.dataset.matchedBreakpoint;
  if (matched) {
    return matched === "l" || matched === "xl";
  }
  return window.matchMedia("(min-width: 1024px)").matches;
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
  window.KNTooltips?.syncSideNavCollapsed?.();

  /* Keep data-kn-l1 for first-paint collapsed chrome, but drop it while L1 is
     hover-expanded — otherwise html[data-kn-l1=collapsed] .hide-when-collapsed
     in index.html/styles.css wins over .is-l1-hovered and titles stay blank. */
  if (desktop && isL1Collapsed && !isL1Hovered) {
    document.documentElement.dataset.knL1 = "collapsed";
  } else {
    delete document.documentElement.dataset.knL1;
  }

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

function getTreeGroup(trigger) {
  const id = trigger?.getAttribute("aria-controls");
  if (!id) {
    return null;
  }
  const el = document.getElementById(id);
  if (!el) {
    return null;
  }
  if (el.classList.contains("side-nav-tree__animator")) {
    return el;
  }
  if (el.classList.contains("side-nav-tree__group")) {
    return el.closest(".side-nav-tree__animator") || el;
  }
  return el;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function enhanceTreeGroups() {
  sideNav.querySelectorAll(".side-nav-tree__group").forEach((group) => {
    if (group.closest(".side-nav-tree__animator")) {
      return;
    }
    const wasHidden = group.hasAttribute("hidden");
    const animator = document.createElement("div");
    animator.className = "side-nav-tree__animator";
    if (group.id) {
      animator.id = group.id;
      group.removeAttribute("id");
    }
    const clip = document.createElement("div");
    clip.className = "side-nav-tree__clip";
    group.replaceWith(animator);
    group.hidden = false;
    clip.appendChild(group);
    animator.appendChild(clip);
    if (wasHidden) {
      animator.classList.remove("is-expanded", "is-animating");
    } else {
      animator.classList.add("is-expanded");
    }
  });
}

function setTreeExpanded(trigger, expanded) {
  if (!trigger) {
    return;
  }
  const animator = getTreeGroup(trigger);
  trigger.setAttribute("aria-expanded", String(expanded));
  if (!animator) {
    return;
  }

  const reduceMotion = prefersReducedMotion();
  const isOpen = animator.classList.contains("is-expanded");

  if (expanded) {
    animator.hidden = false;
    if (isOpen) {
      animator.classList.remove("is-animating");
      return;
    }
    animator.classList.add("is-animating");
    if (reduceMotion) {
      animator.classList.add("is-expanded");
      animator.classList.remove("is-animating");
      return;
    }
    // Ensure collapsed frame paints before expanding (KlearNow TreeView mount trick)
    animator.classList.remove("is-expanded");
    void animator.offsetHeight;
    requestAnimationFrame(() => {
      animator.classList.add("is-expanded");
    });
    return;
  }

  if (!isOpen) {
    animator.classList.remove("is-animating");
    return;
  }

  animator.classList.add("is-animating");
  animator.classList.remove("is-expanded");
  if (reduceMotion) {
    animator.classList.remove("is-animating");
  }
}

function onTreeAnimatorTransitionEnd(event) {
  const animator = event.target;
  if (
    !(animator instanceof HTMLElement) ||
    !animator.classList.contains("side-nav-tree__animator") ||
    event.propertyName !== "grid-template-rows"
  ) {
    return;
  }
  animator.classList.remove("is-animating");
}

function accordionTreeTriggers(trigger) {
  const list = trigger?.closest(".side-nav-level[data-level='2'], .side-nav-tree");
  if (!list) {
    return;
  }
  list.querySelectorAll(":scope > .side-nav-tree__item > [data-tree-trigger]").forEach((other) => {
    if (other !== trigger) {
      setTreeExpanded(other, false);
    }
  });
}

function expandTreeAncestors(leaf) {
  const item = leaf?.closest(".side-nav-tree__item[data-tree-level='1']") || leaf?.closest(".side-nav-tree__item");
  const trigger = item?.querySelector(":scope > [data-tree-trigger]");
  if (!trigger) {
    return;
  }
  accordionTreeTriggers(trigger);
  setTreeExpanded(trigger, true);
}

function firstNavigableInLevel(level) {
  if (!level) {
    return null;
  }
  for (const item of level.children) {
    const row = item.querySelector(":scope > .side-nav-link, :scope > [data-tree-trigger]");
    if (!row) {
      continue;
    }
    if (row.matches("[data-tree-trigger]")) {
      const group = getTreeGroup(row);
      const leaf = group?.querySelector('a.side-nav-link[data-level="3"]');
      if (leaf) {
        return leaf;
      }
      if (row.matches("a[href^='#']")) {
        return row;
      }
      continue;
    }
    if (row.matches('a.side-nav-link[data-level="2"]')) {
      return row;
    }
  }
  return (
    level.querySelector('a.side-nav-link[data-level="3"]') ||
    level.querySelector('a.side-nav-link[data-level="2"]')
  );
}

function getL2TriggerForLevel(level) {
  const id = level?.id;
  return id ? sideNav.querySelector(`[data-l2trigger][aria-controls="${id}"]`) : null;
}

function resolveL2TriggerForLink(link) {
  if (!link) {
    return null;
  }
  if (link.dataset.l2trigger === "true") {
    return link;
  }
  const levelEl = link.closest('.side-nav-level[data-level="2"]');
  return levelEl ? getL2TriggerForLevel(levelEl) : null;
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

function portalL2(trigger, title, { animate = true } = {}) {
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
  const wasHidden = sideNavL2.hidden;
  sideNavL2.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  activeL2Trigger = trigger;
  if (animate && wasHidden && !prefersReducedMotion()) {
    sideNavL2.classList.add("is-entering");
    void sideNavL2.offsetWidth;
    requestAnimationFrame(() => {
      sideNavL2.classList.remove("is-entering");
    });
  } else {
    sideNavL2.classList.remove("is-entering");
  }
}

function collapseL1(title, trigger = getActiveL2Trigger(), { animate = true } = {}) {
  if (!isMediumOrHdDesktop()) {
    isL1Collapsed = true;
    portalL2(trigger, title, { animate });
    syncL1Classes();
    return;
  }

  if (!isL1Collapsed) {
    isL1Collapsed = true;
    setVisibleLevel(2);
  }
  portalL2(trigger, title, { animate });
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
    collapseL1(title, trigger || getActiveL2Trigger(), { animate: !isFirstRender });
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
  <span class="kn-breadcrumb__icon breadcrumb-icon" aria-hidden="true">
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
  const l3Current = sideNav.querySelector('.side-nav-link[data-level="3"][aria-current="page"]');
  const l2Current = sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  const l1Current = sideNav.querySelector('.side-nav-link[data-level="1"][aria-current="page"]');
  const isDashboard = getHashPath() === "#dashboard";

  const items = [{ href: "#dashboard", label: "Home", iconOnly: true, isCurrentPage: isDashboard }];

  if (isDashboard) {
    return items;
  }

  if (l1Current && l1Current.getAttribute("href") !== "#dashboard") {
    items.push({
      href: l1Current.getAttribute("href"),
      label: getNavTitle(l1Current),
      isCurrentPage: !l2Current && !l3Current,
    });
  }

  if (l2Current && l2Current.dataset.treeTrigger !== "true") {
    items.push({
      href: l2Current.getAttribute("href"),
      label: getNavTitle(l2Current),
      isCurrentPage: !l3Current,
    });
  } else if (l3Current) {
    const branch =
      l3Current.closest(".side-nav-tree__item[data-tree-level='1']")?.querySelector("[data-tree-trigger]") ||
      l3Current.closest(".side-nav-tree__item")?.querySelector("[data-tree-trigger]");
    if (branch) {
      items.push({
        href: branch.getAttribute("href") || l3Current.getAttribute("href"),
        label: getNavTitle(branch),
        isCurrentPage: false,
      });
    }
  }

  if (l3Current) {
    const path = getHashPath();
    const isfDoc = path.match(/^#transaction-us-isf\/documents\/([^/?#]+)/);
    const isfHistory = path.match(/^#transaction-us-isf\/history\/([^/]+)$/);
    const isfSubRoute = Boolean(isfDoc || isfHistory);
    items.push({
      href: isfSubRoute ? window.KNUsIsf?.listReturnHash?.() || l3Current.getAttribute("href") : l3Current.getAttribute("href"),
      label: getNavTitle(l3Current),
      isCurrentPage: !isfSubRoute
    });
    if (isfDoc) {
      const rowId = decodeURIComponent(isfDoc[1]);
      items.push({
        href: withHashQuery(path),
        label: window.KNUsIsf?.documentBreadcrumbLabel?.(rowId) || rowId,
        isCurrentPage: true
      });
    } else if (isfHistory) {
      const rowId = decodeURIComponent(isfHistory[1]);
      items.push({
        href: path,
        label: window.KNUsIsf?.historyBreadcrumbLabel?.(rowId) || rowId,
        isCurrentPage: true
      });
    }
  }

  return items;
}

function isDashboardRoute() {
  return getHashPath() === "#dashboard";
}

function isAgenticBrokerRoute() {
  return getHashPath() === "#agentic-broker";
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

function isContractManagementRoute() {
  return getHashPath().startsWith("#contract-management");
}

function isUsIsfRoute() {
  return getHashPath().startsWith("#transaction-us-isf");
}

function isUsInBondRoute() {
  return getHashPath().startsWith("#transaction-us-in-bond");
}

function isUsEntryRoute() {
  return getHashPath().startsWith("#transaction-us-entry");
}

function isUsExportRoute() {
  return getHashPath().startsWith("#transaction-us-export");
}

function isUsFtzRoute() {
  return getHashPath().startsWith("#transaction-us-ftz");
}

function isUsPscRoute() {
  return getHashPath().startsWith("#transaction-us-psc");
}

function isUsDeliveryOrderRoute() {
  return getHashPath().startsWith("#transaction-us-delivery-order");
}

function isUsShipmentsRoute() {
  return getHashPath().startsWith("#transaction-us-shipments");
}

function isUsStatementsRoute() {
  return getHashPath().startsWith("#payment-us-statements");
}

function findNavLinkForHash(path = getHashPath()) {
  const navHash = nestedAdminNavHash(path);
  const link =
    sideNav.querySelector(`.side-nav-link[data-level="3"][href="${navHash}"]`) ||
    sideNav.querySelector(`.side-nav-link[data-level="2"][href="${navHash}"]`) ||
    sideNav.querySelector(`.side-nav-link[data-level="1"][href="${navHash}"]`);
  return { path, navHash, link };
}

function nestedAdminNavHash(path = getHashPath()) {
  if (window.KNAssistCore?.nestedListHash) {
    return window.KNAssistCore.nestedListHash(path);
  }
  if (path.startsWith("#kn-role-management")) {
    return "#kn-role-management";
  }
  if (path.startsWith("#kn-user-management")) {
    return "#kn-user-management";
  }
  if (path.startsWith("#default-role-management")) {
    return "#default-role-management";
  }
  if (path.startsWith("#contract-management")) {
    return "#contract-management";
  }
  if (path.startsWith("#transaction-us-isf")) {
    return "#transaction-us-isf";
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
  if (navHash === "#contract-management") {
    return window.KNContracts;
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
    return adminStoredName("kn-users-v3", decodeURIComponent(userDetail[1])) || adminStoredName("kn-users-v2", decodeURIComponent(userDetail[1]));
  }
  const defDetail = path.match(/^#default-role-management\/([^/]+)$/);
  if (defDetail && defDetail[1] !== "add") {
    return adminStoredName("kn-default-roles-v3", decodeURIComponent(defDetail[1]));
  }
  const isfDetail = path.match(/^#transaction-us-isf\/history\/([^/]+)$/);
  if (isfDetail) {
    const label = window.KNUsIsf?.transactionLabel?.(decodeURIComponent(isfDetail[1]));
    if (label) {
      return label;
    }
  }
  const isfDoc = path.match(/^#transaction-us-isf\/documents\/([^/?#]+)/);
  if (isfDoc) {
    const rowId = decodeURIComponent(isfDoc[1]);
    const route = window.KNIsfDocViewer?.parseRoute?.();
    const row = window.KNUsIsf?.list?.().find((item) => item.id === rowId);
    if (row && route) {
      const detail = window.KNIsfDetail?.buildDetail?.(row);
      const cat = route.cat || "EML";
      const index = route.index || 0;
      if (detail) {
        return window.KNIsfDetail.productionDocId(row, cat, index);
      }
    }
    const label = window.KNUsIsf?.transactionLabel?.(rowId);
    if (label) {
      return label;
    }
  }
  const stmtApproval = path.match(/^#payment-us-statements\/approval\/([^/]+)$/);
  if (stmtApproval) {
    return decodeURIComponent(stmtApproval[1]);
  }
  const l3Current = sideNav.querySelector('.side-nav-link[data-level="3"][aria-current="page"]');
  if (l3Current) {
    return getNavTitle(l3Current);
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
  // Exact hash — L3 "360" keeps #klearhub-visibility; Engine uses a distinct placeholder.
  if (getHashPath() === "#klearhub-visibility") {
    return true;
  }
  const current =
    sideNav.querySelector('.side-nav-link[data-level="3"][aria-current="page"]') ||
    sideNav.querySelector('.side-nav-link[data-level="2"][aria-current="page"]');
  return current?.getAttribute("href") === "#klearhub-visibility";
}

function isKnownRoute() {
  return (
    isDashboardRoute() ||
    isAgenticBrokerRoute() ||
    isKlearhubOverviewRoute() ||
    isKlearhubVisibilityRoute() ||
    isRoleManagementRoute() ||
    isUserManagementRoute() ||
    isDefaultRoleManagementRoute() ||
    isContractManagementRoute() ||
    isUsIsfRoute() ||
    isUsInBondRoute() ||
    isUsEntryRoute() ||
    isUsExportRoute() ||
    isUsFtzRoute() ||
    isUsPscRoute() ||
    isUsDeliveryOrderRoute() ||
    isUsShipmentsRoute() ||
    isUsStatementsRoute()
  );
}

function hashFromPathname(pathname = location.pathname) {
  const segments = String(pathname || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!segments.length) {
    return "";
  }
  const last = segments[segments.length - 1];
  if (/\.[a-z0-9]+$/i.test(last)) {
    return "";
  }
  if (segments.length === 1 && (last === "index.html" || last === "home.html")) {
    return "";
  }
  if (segments[0] === "index.html" || segments[0] === "home.html") {
    segments.shift();
  }
  if (!segments.length) {
    return "";
  }
  return `#${segments.map(decodeURIComponent).join("/")}`;
}

function normalizeHashPath(hash = location.hash) {
  const raw = (hash || "").split("?")[0];
  if (!raw || raw === "#") {
    const fromPath = hashFromPathname();
    if (fromPath) {
      return fromPath;
    }
    return "#agentic-broker";
  }
  return `#${raw.replace(/^#\/?/, "")}`;
}

function hashQuerySuffix(hash = location.hash) {
  const raw = String(hash || "");
  const idx = raw.indexOf("?");
  return idx >= 0 ? raw.slice(idx) : "";
}

function withHashQuery(path, hash = location.hash) {
  const query = hashQuerySuffix(hash);
  return query ? `${path}${query}` : path;
}

function getHashPath(hash = location.hash) {
  return normalizeHashPath(hash);
}

window.getHashPath = getHashPath;
window.hashFromPathname = hashFromPathname;
window.withHashQuery = withHashQuery;

function syncDocumentRoute() {
  if (!document.getElementById("agentic-broker-page")) {
    return;
  }
  document.documentElement.dataset.knRoute = getHashPath().replace(/^#/, "") || "agentic-broker";
}

function setRouteHash(href) {
  if (!href?.startsWith("#")) {
    return;
  }
  const nextPath = normalizeHashPath(href);
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

function bootActivePage({ page, root, kind = "admin-list", init, sync, cols, rows }) {
  init?.();
  window.KNPageReload?.run?.({ page, root, kind, cols, rows, refresh: sync }) || sync?.();
}

function syncPageView() {
  syncDocumentRoute();
  const dashboardInner = document.querySelector(".dashboard-inner");
  const agenticBrokerPage = document.getElementById("agentic-broker-page");
  const overviewPage = document.getElementById("klearhub-overview-page");
  const visibilityPage = document.getElementById("klearhub-visibility-page");
  const rolePage = document.getElementById("kn-role-page");
  const userPage = document.getElementById("kn-user-page");
  const defaultRolePage = document.getElementById("kn-default-role-page");
  const contractPage = document.getElementById("kn-contract-page");
  const isfPage = document.getElementById("kn-isf-page");
  const inbPage = document.getElementById("kn-inb-page");
  const entryPage = document.getElementById("kn-entry-page");
  const exportPage = document.getElementById("kn-export-page");
  const ftzPage = document.getElementById("kn-ftz-page");
  const pscPage = document.getElementById("kn-psc-page");
  const doPage = document.getElementById("kn-do-page");
  const tmshipPage = document.getElementById("kn-tmship-page");
  const statementPage = document.getElementById("kn-statement-page");
  const emptyPage = document.getElementById("empty-page");
  const emptyTitle = document.getElementById("empty-page-title");
  const emptyDescription = document.getElementById("empty-page-description");
  const emptyCta = document.getElementById("empty-page-cta");
  const isDashboard = isDashboardRoute();
  const isAgenticBroker = isAgenticBrokerRoute();
  const isOverview = isKlearhubOverviewRoute();
  const isVisibility = isKlearhubVisibilityRoute();
  const isRoles = isRoleManagementRoute();
  const isUsers = isUserManagementRoute();
  const isDefaultRoles = isDefaultRoleManagementRoute();
  const isContracts = isContractManagementRoute();
  const isUsIsf = isUsIsfRoute();
  const isUsInBond = isUsInBondRoute();
  const isUsEntry = isUsEntryRoute();
  const isUsExport = isUsExportRoute();
  const isUsFtz = isUsFtzRoute();
  const isUsPsc = isUsPscRoute();
  const isUsDeliveryOrder = isUsDeliveryOrderRoute();
  const isUsShipments = isUsShipmentsRoute();
  const isUsStatements = isUsStatementsRoute();
  const isAdminModule = isRoles || isUsers || isDefaultRoles || isContracts;
  const isTmUsPage = isUsIsf || isUsInBond || isUsEntry || isUsExport || isUsFtz || isUsPsc || isUsDeliveryOrder || isUsShipments || isUsStatements;
  const isKnownPage = isKnownRoute();

  if (!isAgenticBroker) {
    window.KNAgenticBroker?.suspend?.();
  }
  if (!isUsers) {
    window.KNUsers?.suspend?.();
  }
  if (!isRoles) {
    window.KNRoles?.suspend?.();
  }
  if (!isDefaultRoles) {
    window.KNDefaultRoles?.suspend?.();
  }
  if (!isContracts) {
    window.KNContracts?.suspend?.();
  }
  if (!isUsIsf) {
    window.KNUsIsf?.suspend?.();
  }
  if (!isUsInBond) {
    window.KNUsInBond?.suspend?.();
  }
  if (!isUsEntry) {
    window.KNUsEntry?.suspend?.();
  }
  if (!isUsExport) {
    window.KNUsExport?.suspend?.();
  }
  if (!isUsFtz) {
    window.KNUsFtz?.suspend?.();
  }
  if (!isUsPsc) {
    window.KNUsPsc?.suspend?.();
  }
  if (!isUsDeliveryOrder) {
    window.KNUsDeliveryOrder?.suspend?.();
  }
  if (!isUsShipments) {
    window.KNUsShipments?.suspend?.();
  }
  if (!isUsStatements) {
    window.KNPaymentUsStatements?.suspend?.();
  }
  if (!isVisibility) {
    window.suspendVisibility?.();
  }

  setPageSectionVisibility(dashboardInner, isDashboard);
  setPageSectionVisibility(agenticBrokerPage, isAgenticBroker);
  setPageSectionVisibility(overviewPage, isOverview);
  setPageSectionVisibility(visibilityPage, isVisibility);
  setPageSectionVisibility(rolePage, isRoles);
  setPageSectionVisibility(userPage, isUsers);
  setPageSectionVisibility(defaultRolePage, isDefaultRoles);
  setPageSectionVisibility(contractPage, isContracts);
  setPageSectionVisibility(isfPage, isUsIsf);
  setPageSectionVisibility(inbPage, isUsInBond);
  setPageSectionVisibility(entryPage, isUsEntry);
  setPageSectionVisibility(exportPage, isUsExport);
  setPageSectionVisibility(ftzPage, isUsFtz);
  setPageSectionVisibility(pscPage, isUsPsc);
  setPageSectionVisibility(doPage, isUsDeliveryOrder);
  setPageSectionVisibility(tmshipPage, isUsShipments);
  setPageSectionVisibility(statementPage, isUsStatements);
  if (isVisibility && typeof persistVisViewHash === "function") {
    persistVisViewHash(visState?.view || "cards");
  }
  if (!isVisibility && visState?.detailId && typeof window.closeKnShipmentDetail === "function") {
    window.closeKnShipmentDetail({ persistHash: false });
  }
  if (emptyPage) {
    setPageSectionVisibility(emptyPage, !isKnownPage);
  }
  if (isAgenticBroker) {
    bootActivePage({
      page: agenticBrokerPage,
      kind: "agentic",
      init: () => window.KNAgenticBroker?.init?.(),
      sync: () => window.KNAgenticBroker?.sync?.()
    });
  }
  if (isRoles) {
    bootActivePage({
      page: rolePage,
      root: document.getElementById("kn-role-root"),
      kind: "admin-list",
      cols: 6,
      init: () => window.KNRoles?.init?.(),
      sync: () => window.KNRoles?.sync?.()
    });
  }
  if (isUsers) {
    bootActivePage({
      page: userPage,
      root: document.getElementById("kn-user-root"),
      kind: "admin-list",
      cols: 7,
      init: () => window.KNUsers?.init?.(),
      sync: () => window.KNUsers?.sync?.()
    });
  }
  if (isDefaultRoles) {
    bootActivePage({
      page: defaultRolePage,
      root: document.getElementById("kn-default-role-root"),
      kind: "admin-list",
      cols: 6,
      init: () => window.KNDefaultRoles?.init?.(),
      sync: () => window.KNDefaultRoles?.sync?.()
    });
  }
  if (isContracts) {
    bootActivePage({
      page: contractPage,
      root: document.getElementById("kn-contract-root"),
      kind: "admin-list",
      cols: 5,
      init: () => window.KNContracts?.init?.(),
      sync: () => window.KNContracts?.sync?.()
    });
  }
  if (isUsIsf) {
    const isfPath = getHashPath();
    const isfSubRoute = /^#transaction-us-isf\/(documents|history)\//.test(isfPath);
    bootActivePage({
      page: isfPage,
      root: document.getElementById("kn-isf-root"),
      kind: isfSubRoute ? "module" : "tm-table",
      init: () => window.KNUsIsf?.init?.(),
      sync: () => window.KNUsIsf?.sync?.()
    });
  }
  if (isUsInBond) {
    bootActivePage({
      page: inbPage,
      root: document.getElementById("kn-inb-root"),
      kind: "tm-table",
      init: () => window.KNUsInBond?.init?.(),
      sync: () => window.KNUsInBond?.sync?.()
    });
  }
  if (isUsEntry) {
    bootActivePage({
      page: entryPage,
      root: document.getElementById("kn-entry-root"),
      kind: "tm-table",
      init: () => window.KNUsEntry?.init?.(),
      sync: () => window.KNUsEntry?.sync?.()
    });
  }
  if (isUsExport) {
    bootActivePage({
      page: exportPage,
      root: document.getElementById("kn-export-root"),
      kind: "tm-table",
      init: () => window.KNUsExport?.init?.(),
      sync: () => window.KNUsExport?.sync?.()
    });
  }
  if (isUsFtz) {
    bootActivePage({
      page: ftzPage,
      root: document.getElementById("kn-ftz-root"),
      kind: "tm-table",
      init: () => window.KNUsFtz?.init?.(),
      sync: () => window.KNUsFtz?.sync?.()
    });
  }
  if (isUsPsc) {
    bootActivePage({
      page: pscPage,
      root: document.getElementById("kn-psc-root"),
      kind: "tm-table",
      init: () => window.KNUsPsc?.init?.(),
      sync: () => window.KNUsPsc?.sync?.()
    });
  }
  if (isUsDeliveryOrder) {
    bootActivePage({
      page: doPage,
      root: document.getElementById("kn-do-root"),
      kind: "tm-table",
      init: () => window.KNUsDeliveryOrder?.init?.(),
      sync: () => window.KNUsDeliveryOrder?.sync?.()
    });
  }
  if (isUsShipments) {
    bootActivePage({
      page: tmshipPage,
      root: document.getElementById("kn-tmship-root"),
      kind: "tm-table",
      init: () => window.KNUsShipments?.init?.(),
      sync: () => window.KNUsShipments?.sync?.()
    });
  }
  if (isUsStatements) {
    bootActivePage({
      page: statementPage,
      root: document.getElementById("kn-statement-root"),
      kind: "tm-table",
      init: () => window.KNPaymentUsStatements?.init?.(),
      sync: () => window.KNPaymentUsStatements?.sync?.()
    });
  }
  if (isVisibility) {
    bootActivePage({
      page: visibilityPage,
      kind: "visibility",
      sync: () => {
        if (typeof setVisTab === "function") {
          setVisTab(getInitialVisView(), { persist: false });
        }
        if (typeof renderVisibilityPage === "function") {
          renderVisibilityPage({ keepPage: true, fitMap: false, resetScroll: false });
        }
        window.syncKnDetailFromHash?.();
        refreshVisibilityMap?.();
      }
    });
  }
  if (!isKnownPage) {
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
  if (typeof refreshVisibilityMap === "function" && !isVisibility) {
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

function renderBreadcrumb() {
  const items = getBreadcrumbTrail();
  const breadcrumbBar = document.querySelector(".content-breadcrumb");
  // #side-nav-l2 (the section sub-panel) and data-l2trigger links stay "open"/"current"
  // for the entire time a user is anywhere inside a nested section — that's the sidebar's
  // normal, permanent state in this two-part rail+panel design, not a transient hover
  // preview. Gating on them (the old isL2Context() check) suppressed the breadcrumb for
  // every non-Dashboard page; showing it whenever there's a real trail is the fix.
  // The generic "not available in this workspace yet" fallback (Agentic Broker, Drayage)
  // is a single flat page — Home / <title> only repeats what the heading and "Back to
  // Dashboard" button already say, so skip the breadcrumb there.
  const shouldShow = items.length > 1 && isKnownRoute();

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

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "kn-breadcrumb__item breadcrumb-item";
    const isCurrent = Boolean(item.isCurrentPage);

    if (isCurrent) {
      li.setAttribute("aria-current", "page");
    }

    const content = document.createElement(isCurrent ? "span" : "a");
    content.className = isCurrent ? "kn-breadcrumb__link breadcrumb-link is-current" : "kn-breadcrumb__link breadcrumb-link";
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

    const separator = document.createElement("span");
    separator.className = "kn-breadcrumb__separator breadcrumb-separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "/";
    li.appendChild(separator);

    breadcrumbList.appendChild(li);
  });
}

function knBreadcrumbNavigate(link) {
  const href = link.getAttribute("href");
  if (href?.startsWith("#") && !window.KNAdminUX?.tryNavigate(href)) {
    return;
  }
  const navLink = sideNav.querySelector(`.side-nav-link[href="${href}"]`);
  if (navLink) {
    navLink.click();
  }
}

function hydrateKnBreadcrumb(nav) {
  if (!nav) {
    return;
  }
  if (!nav.getAttribute("aria-label")) {
    nav.setAttribute("aria-label", "Breadcrumb");
  }
  if (nav.dataset.knCrumbReady === "1") {
    return;
  }
  nav.dataset.knCrumbReady = "1";
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a.kn-breadcrumb__link, a.breadcrumb-link");
    if (!link || !nav.contains(link) || link.classList.contains("is-current")) {
      return;
    }
    event.preventDefault();
    knBreadcrumbNavigate(link);
  });
}

function hydrateKnBreadcrumbs(scope = document) {
  scope.querySelectorAll("nav.kn-breadcrumb, nav.breadcrumb").forEach((nav) => hydrateKnBreadcrumb(nav));
}

window.KNBreadcrumb = Object.assign(window.KNBreadcrumb || {}, {
  hydrate: hydrateKnBreadcrumbs
});

function hydrateKnButton(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  const isAnchor = el.tagName === "A";
  if (!isAnchor && !el.getAttribute("type")) {
    el.setAttribute("type", "button");
  }
  if (isAnchor && el.getAttribute("target") === "_blank" && !el.getAttribute("rel")) {
    el.setAttribute("rel", "noopener noreferrer");
  }
  const iconOnly = el.classList.contains("kn-btn--icon") || el.classList.contains("btn--icon-only");
  if (iconOnly && !el.getAttribute("aria-label")) {
    const tip = el.getAttribute("data-tooltip") || el.getAttribute("title");
    if (tip) {
      el.setAttribute("aria-label", tip);
    }
  }
  if (el.classList.contains("is-loading")) {
    el.setAttribute("aria-busy", "true");
    el.setAttribute("aria-disabled", "true");
  }
}

function hydrateKnIconButton(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  if (!el.getAttribute("type")) {
    el.setAttribute("type", "button");
  }
  if (!el.getAttribute("aria-label")) {
    const tip = el.getAttribute("data-tooltip") || el.getAttribute("title");
    if (tip) {
      el.setAttribute("aria-label", tip);
    }
  }
}

const KN_BTN_GROUP_SIZE = {
  xsmall: ["kn-btn--xsmall"],
  small: ["kn-btn--small", "btn--sm"],
  medium: ["kn-btn--medium", "btn--md"],
  large: ["kn-btn--large"]
};

const KN_BTN_GROUP_VARIANT = {
  primary: ["kn-btn--primary", "btn--primary"],
  secondary: ["kn-btn--secondary", "btn--secondary"],
  tertiary: ["kn-btn--tertiary", "btn--tertiary"]
};

const KN_BTN_GROUP_COLOR = {
  white: ["kn-btn--white"],
  positive: ["kn-btn--positive"],
  negative: ["kn-btn--negative", "btn--color-negative"]
};

function knButtonHasSize(el) {
  return (
    el.classList.contains("kn-btn--xsmall") ||
    el.classList.contains("kn-btn--small") ||
    el.classList.contains("kn-btn--medium") ||
    el.classList.contains("kn-btn--large") ||
    el.classList.contains("btn--sm") ||
    el.classList.contains("btn--md")
  );
}

function knButtonHasVariant(el) {
  return (
    el.classList.contains("kn-btn--primary") ||
    el.classList.contains("kn-btn--secondary") ||
    el.classList.contains("kn-btn--tertiary") ||
    el.classList.contains("btn--primary") ||
    el.classList.contains("btn--secondary") ||
    el.classList.contains("btn--tertiary")
  );
}

function knButtonHasColor(el) {
  return (
    el.classList.contains("kn-btn--white") ||
    el.classList.contains("kn-btn--positive") ||
    el.classList.contains("kn-btn--negative") ||
    el.classList.contains("btn--color-negative") ||
    el.classList.contains("btn--color-positive")
  );
}

function knButtonGroupChildButtons(group) {
  const out = [];
  group.querySelectorAll(":scope > .kn-btn, :scope > .btn").forEach((el) => {
    out.push(el);
  });
  group.querySelectorAll(":scope > .kn-dropdown").forEach((dropdown) => {
    dropdown.querySelectorAll(":scope > .kn-btn, :scope > .btn").forEach((el) => {
      out.push(el);
    });
  });
  return out;
}

function knButtonGroupSize(group) {
  if (group.classList.contains("kn-btn-group--xsmall")) {
    return "xsmall";
  }
  if (group.classList.contains("kn-btn-group--small")) {
    return "small";
  }
  if (group.classList.contains("kn-btn-group--medium")) {
    return "medium";
  }
  if (group.classList.contains("kn-btn-group--large")) {
    return "large";
  }
  return null;
}

function knButtonGroupVariant(group) {
  if (group.classList.contains("kn-btn-group--secondary")) {
    return "secondary";
  }
  if (group.classList.contains("kn-btn-group--tertiary")) {
    return "tertiary";
  }
  if (group.classList.contains("kn-btn-group--primary")) {
    return "primary";
  }
  return null;
}

function knButtonGroupColor(group) {
  if (group.classList.contains("kn-btn-group--white")) {
    return "white";
  }
  if (group.classList.contains("kn-btn-group--positive")) {
    return "positive";
  }
  if (group.classList.contains("kn-btn-group--negative")) {
    return "negative";
  }
  return null;
}

function hydrateKnButtonGroup(group) {
  if (!group || group.nodeType !== 1) {
    return;
  }
  if (!group.getAttribute("role")) {
    group.setAttribute("role", "group");
  }
  const disabled =
    group.classList.contains("kn-btn-group--disabled") ||
    group.getAttribute("aria-disabled") === "true";
  if (disabled) {
    group.setAttribute("aria-disabled", "true");
  }
  const size = knButtonGroupSize(group);
  const variant = knButtonGroupVariant(group);
  const color = knButtonGroupColor(group);
  knButtonGroupChildButtons(group).forEach((el) => {
    if (size && !knButtonHasSize(el)) {
      KN_BTN_GROUP_SIZE[size].forEach((cls) => el.classList.add(cls));
    }
    if (variant && !knButtonHasVariant(el)) {
      KN_BTN_GROUP_VARIANT[variant].forEach((cls) => el.classList.add(cls));
    }
    if (color && !knButtonHasColor(el)) {
      KN_BTN_GROUP_COLOR[color].forEach((cls) => el.classList.add(cls));
    }
    if (disabled) {
      if (el.tagName === "BUTTON") {
        el.disabled = true;
      }
      el.setAttribute("aria-disabled", "true");
    }
  });
}

function hydrateKnButtonGroups(scope = document) {
  scope.querySelectorAll(".kn-btn-group").forEach((group) => hydrateKnButtonGroup(group));
}

function hydrateKnButtons(scope = document) {
  hydrateKnButtonGroups(scope);
  scope.querySelectorAll(".kn-btn, button.btn, a.btn").forEach((el) => hydrateKnButton(el));
  scope.querySelectorAll("button.icon-btn").forEach((el) => hydrateKnIconButton(el));
}

window.KNButtonGroup = Object.assign(window.KNButtonGroup || {}, {
  hydrate: hydrateKnButtonGroups
});

window.KNButton = Object.assign(window.KNButton || {}, {
  hydrate: hydrateKnButtons
});

function hydrateKnChart(chart) {
  if (!chart || chart.nodeType !== 1) {
    return;
  }
  const plot = chart.querySelector(":scope > .kn-chart__plot, :scope > .dash-bars, :scope > .dash-donut");
  if (plot && !plot.getAttribute("role")) {
    plot.setAttribute("role", "img");
  }
  chart.querySelectorAll(".kn-chart__legend, .dash-legend, .dash-donut__legend").forEach((legend) => {
    if (legend.tagName === "UL" && !legend.getAttribute("aria-label")) {
      legend.setAttribute("aria-label", "Chart legend");
    }
  });
}

function hydrateKnCharts(scope = document) {
  scope.querySelectorAll(".kn-chart").forEach((el) => hydrateKnChart(el));
}

window.KNChart = Object.assign(window.KNChart || {}, {
  hydrate: hydrateKnCharts
});

function hydrateKnCheckbox(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "checkbox");
  const input = root.querySelector('input[type="checkbox"]');
  if (!input) {
    return;
  }
  const groupDisabled = Boolean(root.closest(".kn-checkbox-group.is-disabled"));
  if (root.classList.contains("is-disabled") || groupDisabled || input.disabled) {
    input.disabled = true;
    root.classList.add("is-disabled");
  }
  const groupInvalid = Boolean(root.closest(".kn-checkbox-group.is-invalid"));
  if (root.classList.contains("is-invalid") || groupInvalid || input.getAttribute("aria-invalid") === "true") {
    input.setAttribute("aria-invalid", "true");
    root.classList.add("is-invalid");
  }
  input.indeterminate = input.hasAttribute("data-indeterminate");
}

function hydrateKnCheckboxes(scope = document) {
  scope.querySelectorAll(".kn-checkbox, .kn-check").forEach((el) => hydrateKnCheckbox(el));
}

window.KNCheckbox = Object.assign(window.KNCheckbox || {}, {
  hydrate: hydrateKnCheckboxes
});

function hydrateKnRadio(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "radio");
  const input = root.querySelector('input[type="radio"]');
  if (!input) {
    return;
  }
  const groupDisabled = Boolean(root.closest(".kn-radio-group.is-disabled"));
  if (root.classList.contains("is-disabled") || groupDisabled || input.disabled) {
    input.disabled = true;
    root.classList.add("is-disabled");
  }
  const groupInvalid = Boolean(root.closest(".kn-radio-group.is-invalid"));
  if (root.classList.contains("is-invalid") || groupInvalid || input.getAttribute("aria-invalid") === "true") {
    input.setAttribute("aria-invalid", "true");
    root.classList.add("is-invalid");
  }
}

function hydrateKnRadios(scope = document) {
  scope.querySelectorAll(".kn-radio").forEach((el) => hydrateKnRadio(el));
}

window.KNRadio = Object.assign(window.KNRadio || {}, {
  hydrate: hydrateKnRadios
});

function hydrateKnSwitch(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "switch");
  const input = root.querySelector('input[type="checkbox"]');
  if (!input) {
    return;
  }
  if (!input.getAttribute("role")) {
    input.setAttribute("role", "switch");
  }
  if (root.classList.contains("is-disabled") || input.disabled) {
    input.disabled = true;
    root.classList.add("is-disabled");
  }
}

function hydrateKnSwitches(scope = document) {
  scope.querySelectorAll(".kn-switch").forEach((el) => hydrateKnSwitch(el));
}

window.KNSwitch = Object.assign(window.KNSwitch || {}, {
  hydrate: hydrateKnSwitches
});

function hydrateKnChip(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  el.setAttribute("data-kn-component", "chip");
  if (!el.classList.contains("kn-chip")) {
    el.classList.add("kn-chip");
  }
  const group = el.closest(".kn-chip-group, .vis-chips, .vis-quickfilters, .admin-chips");
  const groupRole = group?.getAttribute("role");
  if (groupRole === "radiogroup" && !el.getAttribute("role")) {
    el.setAttribute("role", "radio");
  }
  if (group?.getAttribute("data-selection") === "multiple" && !el.getAttribute("role")) {
    el.setAttribute("role", "checkbox");
  }
  if (el.classList.contains("is-selected") && el.getAttribute("aria-checked") == null && (el.getAttribute("role") === "radio" || el.getAttribute("role") === "checkbox")) {
    el.setAttribute("aria-checked", "true");
  }
  if (el.getAttribute("aria-checked") === "true") {
    el.classList.add("is-selected");
  }
  if (el.classList.contains("is-disabled") && el.tagName === "BUTTON") {
    el.disabled = true;
  }
  el.querySelectorAll(".kn-counter, .counter").forEach((node) => hydrateKnCounter(node));
}

function hydrateKnChips(scope = document) {
  scope.querySelectorAll(".kn-chip, .vis-chip").forEach((el) => hydrateKnChip(el));
}

window.KNChip = Object.assign(window.KNChip || {}, {
  hydrate: hydrateKnChips
});

const KN_FILTER_CHIP_CLOSE_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

function knFilterChipIsChip(el) {
  return el.classList.contains("vis-chip") && !el.classList.contains("kn-filter-chip");
}

function hydrateKnFilterChip(root) {
  if (!root || root.nodeType !== 1 || knFilterChipIsChip(root)) {
    return;
  }
  const host = root.classList.contains("kn-filter-chip")
    ? root
    : root.classList.contains("admin-applied__chip")
      ? root
      : root.closest?.(".kn-filter-chip, .admin-applied__chip");
  if (!host) {
    return;
  }
  host.classList.add("kn-filter-chip");
  host.setAttribute("data-kn-component", "filter-chip");
  if (host.tagName === "BUTTON" && !host.getAttribute("type")) {
    host.setAttribute("type", "button");
  }
  if (host.classList.contains("kn-filter-chip--selected") || host.getAttribute("data-selected") === "true") {
    host.classList.add("is-selected");
  }
  if (host.querySelector(":scope > .kn-filter-chip__clear, :scope .kn-filter-chip__clear")) {
    host.classList.add("has-clear");
  }
  if (!host.getAttribute("data-selection")) {
    const groupType = host.closest(".kn-filter-chip-group, .admin-applied")?.getAttribute("data-selection");
    host.setAttribute("data-selection", groupType === "multiple" ? "multiple" : "single");
  }
  const trigger = host.querySelector(":scope > .kn-filter-chip__trigger");
  if (trigger && trigger.tagName === "BUTTON" && !trigger.getAttribute("type")) {
    trigger.setAttribute("type", "button");
  }
  const clear = host.querySelector(":scope > .kn-filter-chip__clear");
  if (clear) {
    if (clear.tagName === "BUTTON" && !clear.getAttribute("type")) {
      clear.setAttribute("type", "button");
    }
    if (!clear.querySelector("svg") && clear.textContent.trim() === "×") {
      clear.textContent = "";
      clear.insertAdjacentHTML("afterbegin", KN_FILTER_CHIP_CLOSE_SVG);
    }
  }
  if (typeof hydrateKnDivider === "function") {
    host.querySelectorAll(".kn-filter-chip__divider").forEach((node) => hydrateKnDivider(node));
  }
  if (typeof hydrateKnCounter === "function") {
    host.querySelectorAll(".kn-counter, .counter").forEach((node) => hydrateKnCounter(node));
  }
}

function hydrateKnFilterChipGroup(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.classList.add("kn-filter-chip-group");
  root.setAttribute("data-kn-component", "filter-chip-group");
  root.querySelectorAll(":scope > .kn-filter-chip-group__clear, :scope > .kn-filter-chip-group__reset").forEach((el) => {
    el.classList.add("kn-link");
  });
}

function hydrateKnFilterChips(scope = document) {
  const root = scope || document;
  const groupSelector = ".kn-filter-chip-group, .admin-applied";
  const groups =
    root.nodeType === 1 && root.matches?.(groupSelector)
      ? [root]
      : Array.from(root.querySelectorAll(groupSelector));
  groups.forEach((el) => hydrateKnFilterChipGroup(el));
  const chipSelector = ".kn-filter-chip, .admin-applied__chip";
  const nodes =
    root.nodeType === 1 && root.matches?.(chipSelector)
      ? [root]
      : Array.from(root.querySelectorAll(chipSelector));
  const seen = new Set();
  nodes.forEach((el) => {
    if (knFilterChipIsChip(el)) {
      return;
    }
    if (seen.has(el)) {
      return;
    }
    seen.add(el);
    hydrateKnFilterChip(el);
  });
}

window.KNFilterChip = Object.assign(window.KNFilterChip || {}, {
  hydrate: hydrateKnFilterChips
});

const KN_TAG_CLOSE_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const KN_TAG_SIZES = ["xsmall", "small", "medium", "large"];
const KN_TAG_BADGE_CLASSES = [
  "kn-badge",
  "badge",
  "pill",
  "kn-badge--subtle",
  "kn-badge--intense",
  "kn-badge--xsmall",
  "kn-badge--small",
  "kn-badge--medium",
  "kn-badge--large",
  "kn-badge--positive",
  "kn-badge--negative",
  "kn-badge--notice",
  "kn-badge--information",
  "kn-badge--neutral",
  "kn-badge--primary",
  "badge--subtle",
  "badge--intense",
  "badge--xsmall",
  "badge--small",
  "badge--medium",
  "badge--large",
  "badge--positive",
  "badge--negative",
  "badge--notice",
  "badge--information",
  "badge--neutral",
  "badge--primary",
  "badge--ai"
];

function knTagHasSize(el) {
  return KN_TAG_SIZES.some((size) => el.classList.contains(`kn-tag--${size}`));
}

function knTagLabelText(el) {
  const label = el.querySelector(".kn-tag__label, .kn-select__chip-label");
  return (label?.textContent || el.textContent || "").trim();
}

function hydrateKnTag(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  el.classList.add("kn-tag");
  el.setAttribute("data-kn-component", "tag");
  KN_TAG_BADGE_CLASSES.forEach((cls) => el.classList.remove(cls));
  if (!knTagHasSize(el)) {
    el.classList.add("kn-tag--medium");
  }
  if (el.classList.contains("is-disabled") || el.getAttribute("aria-disabled") === "true") {
    el.classList.add("is-disabled");
    el.setAttribute("aria-disabled", "true");
  }
  let label = el.querySelector(":scope > .kn-tag__label, :scope > .kn-select__chip-label");
  if (!label) {
    label = document.createElement("span");
    label.className = "kn-tag__label";
    const keep = [];
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === 1) {
        const cls = node.classList;
        if (
          cls.contains("kn-tag__icon") ||
          cls.contains("kn-tag__dismiss") ||
          cls.contains("kn-select__chip-remove") ||
          cls.contains("ai-suggest-mark") ||
          node.tagName === "BUTTON" ||
          node.tagName === "SVG"
        ) {
          keep.push(node);
          return;
        }
      }
      if (node.nodeType === 3 && !node.textContent.trim()) {
        return;
      }
      label.appendChild(node);
    });
    const dismiss = keep.find((node) => node.matches?.(".kn-tag__dismiss, .kn-select__chip-remove, button"));
    if (dismiss) {
      el.insertBefore(label, dismiss);
    } else {
      el.appendChild(label);
    }
  } else {
    label.classList.add("kn-tag__label");
  }
  let dismiss = el.querySelector(":scope > .kn-tag__dismiss, :scope > .kn-select__chip-remove");
  if (dismiss) {
    dismiss.classList.add("kn-tag__dismiss");
    if (dismiss.tagName === "BUTTON" && !dismiss.getAttribute("type")) {
      dismiss.setAttribute("type", "button");
    }
    const name = knTagLabelText(el);
    if (name && !dismiss.getAttribute("aria-label")) {
      dismiss.setAttribute("aria-label", `Close ${name} tag`);
    }
    if (!dismiss.querySelector("svg") && dismiss.textContent.trim() === "×") {
      dismiss.textContent = "";
      dismiss.insertAdjacentHTML("afterbegin", KN_TAG_CLOSE_SVG);
    }
    if (el.classList.contains("is-disabled")) {
      dismiss.disabled = true;
    }
  }
}

function hydrateKnTags(scope = document) {
  const root = scope || document;
  const selector = ".kn-tag, .kn-select__chip";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  const seen = new Set();
  nodes.forEach((el) => {
    if (seen.has(el)) {
      return;
    }
    seen.add(el);
    hydrateKnTag(el);
  });
}

window.KNTag = Object.assign(window.KNTag || {}, {
  hydrate: hydrateKnTags
});

function knFabIsProductChrome(el) {
  if (!el || el.nodeType !== 1) {
    return false;
  }
  return (
    el.id === "ai-assistant-trigger" ||
    el.id === "ai-assistant-trigger-mobile" ||
    el.classList.contains("ai-assistant-trigger")
  );
}

function knFabHasPlacement(host) {
  return (
    host.classList.contains("kn-fab--bottom-end") ||
    host.classList.contains("kn-fab--bottom-start") ||
    host.classList.contains("kn-fab--bottom")
  );
}

function knFabHasColor(host) {
  return (
    host.classList.contains("kn-fab--primary") ||
    host.classList.contains("kn-fab--white") ||
    host.classList.contains("kn-fab--neutral")
  );
}

function knFabHasLabel(button) {
  const slot = button.querySelector(".kn-fab__label, .kn-btn__label");
  if (slot) {
    return slot.textContent.trim().length > 0;
  }
  const clone = button.cloneNode(true);
  clone.querySelectorAll("svg, .kn-spinner, .kn-fab__icon, .kn-btn__icon").forEach((node) => node.remove());
  return clone.textContent.trim().length > 0;
}

function knFabEnsureIconSlot(button) {
  const existing = button.querySelector(".kn-fab__icon, .kn-btn__icon");
  if (existing) {
    existing.classList.add("kn-fab__icon", "kn-btn__icon");
    if (!existing.getAttribute("aria-hidden")) {
      existing.setAttribute("aria-hidden", "true");
    }
    return;
  }
  const svg = button.querySelector(":scope > svg");
  if (!svg || svg.closest(".kn-spinner")) {
    return;
  }
  const wrap = document.createElement("span");
  wrap.className = "kn-fab__icon kn-btn__icon";
  wrap.setAttribute("aria-hidden", "true");
  svg.replaceWith(wrap);
  wrap.appendChild(svg);
}

function hydrateKnFab(host) {
  if (!host || host.nodeType !== 1 || knFabIsProductChrome(host)) {
    return;
  }
  host.classList.add("kn-fab");
  host.setAttribute("data-kn-component", "fab");
  if (!knFabHasPlacement(host)) {
    host.classList.add("kn-fab--bottom-end");
  }
  if (!knFabHasColor(host)) {
    host.classList.add("kn-fab--primary");
  }
  const button =
    host.querySelector(":scope > .kn-fab__button") ||
    host.querySelector(":scope > button") ||
    host.querySelector(":scope > a");
  if (!button || knFabIsProductChrome(button)) {
    return;
  }
  button.classList.add("kn-fab__button", "kn-btn", "kn-btn--large", "kn-btn--primary");
  if (host.classList.contains("kn-fab--white")) {
    button.classList.add("kn-btn--white");
  }
  knFabEnsureIconSlot(button);
  host.querySelectorAll(".kn-fab__label").forEach((el) => el.classList.add("kn-btn__label"));
  if (!knFabHasLabel(button)) {
    host.classList.add("kn-fab--icon");
    button.classList.add("kn-btn--icon");
    if (!button.getAttribute("aria-label")) {
      const tip =
        button.getAttribute("data-tooltip") ||
        button.getAttribute("title") ||
        host.getAttribute("aria-label");
      if (tip) {
        button.setAttribute("aria-label", tip);
      }
    }
  }
  const loading = host.classList.contains("is-loading") || button.classList.contains("is-loading");
  if (loading) {
    host.classList.add("is-loading");
    button.classList.add("is-loading");
  }
  const disabled =
    host.classList.contains("is-disabled") ||
    button.disabled ||
    button.getAttribute("aria-disabled") === "true";
  if (disabled) {
    host.classList.add("is-disabled");
    if (button.tagName === "BUTTON") {
      button.disabled = true;
    }
    button.setAttribute("aria-disabled", "true");
  }
  if (typeof hydrateKnButton === "function") {
    hydrateKnButton(button);
  }
}

function hydrateKnFabs(scope = document) {
  const root = scope || document;
  const selector = ".kn-fab";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnFab(el));
}

window.KNFab = Object.assign(window.KNFab || {}, {
  hydrate: hydrateKnFabs
});
window.KNFloatingActionButton = window.KNFab;

const KN_COUNTER_COLORS = ["positive", "negative", "notice", "information", "neutral", "primary"];
const KN_COUNTER_SIZES = ["small", "medium", "large"];

function knCounterClass(color, extra = {}) {
  const tone = color || extra.color || "neutral";
  const emphasis = extra.emphasis || (extra.intense ? "intense" : "subtle");
  const size = extra.size || "small";
  const classes = ["kn-counter", "counter", `kn-counter--${tone}`, `counter--${tone}`];
  if (size !== "small") {
    classes.push(`kn-counter--${size}`, `counter--${size}`);
  }
  if (emphasis === "intense") {
    classes.push("kn-counter--intense", "counter--intense");
  }
  if (extra.wide) {
    classes.push("kn-counter--wide", "counter--wide");
  }
  return classes.join(" ");
}

function formatKnCounter(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? "").trim();
  }
  const cap = Number(max);
  if (max != null && max !== "" && Number.isFinite(cap) && cap !== 0 && n > cap) {
    return `${cap}+`;
  }
  return String(n);
}

function knCounterRawNumber(el) {
  if (el.hasAttribute("data-value")) {
    const n = Number(el.getAttribute("data-value"));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  const n = parseFloat(String(el.textContent || "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function hydrateKnCounter(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  if (el.classList.contains("kn-badge") || el.classList.contains("badge") || el.classList.contains("pill")) {
    return;
  }
  el.setAttribute("data-kn-component", "counter");
  el.classList.add("kn-counter");
  KN_COUNTER_COLORS.forEach((color) => {
    if (el.classList.contains(`counter--${color}`)) {
      el.classList.add(`kn-counter--${color}`);
    }
  });
  KN_COUNTER_SIZES.forEach((size) => {
    if (el.classList.contains(`counter--${size}`)) {
      el.classList.add(`kn-counter--${size}`);
    }
  });
  if (el.classList.contains("counter--intense")) {
    el.classList.add("kn-counter--intense");
  }
  if (el.classList.contains("counter--wide")) {
    el.classList.add("kn-counter--wide");
  }
  const hasColor = KN_COUNTER_COLORS.some(
    (color) => el.classList.contains(`kn-counter--${color}`) || el.classList.contains(`counter--${color}`)
  );
  if (!hasColor) {
    el.classList.add("kn-counter--neutral");
  }
  const maxAttr = el.getAttribute("data-max");
  if (el.hasAttribute("data-value") || (maxAttr != null && maxAttr !== "")) {
    const raw = el.hasAttribute("data-value") ? el.getAttribute("data-value") : el.textContent.trim().replace(/\+$/, "");
    el.textContent = formatKnCounter(raw, maxAttr);
  }
  const n = knCounterRawNumber(el);
  const wide = Number.isFinite(n) ? n > 9 : el.textContent.trim().replace(/\+$/, "").length > 1;
  el.classList.toggle("kn-counter--wide", wide);
  el.classList.toggle("counter--wide", wide);
}

function hydrateKnCounters(scope = document) {
  const root = scope || document;
  const nodes =
    root.nodeType === 1 && root.matches?.(".kn-counter, .counter")
      ? [root]
      : Array.from(root.querySelectorAll?.(".kn-counter, .counter") || []);
  nodes.forEach((el) => hydrateKnCounter(el));
}

window.KNCounter = Object.assign(window.KNCounter || {}, {
  className: knCounterClass,
  format: formatKnCounter,
  hydrate: hydrateKnCounters
});

const KN_COUNTER_INPUT_SIZES = ["xsmall", "medium", "large"];
let knCounterInputSeq = 0;
const KN_COUNTER_INPUT_MINUS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
const KN_COUNTER_INPUT_PLUS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

function parseKnCounterInputMin(root) {
  const n = Number(root.getAttribute("data-min"));
  return Number.isFinite(n) ? n : 0;
}

function parseKnCounterInputMax(root) {
  if (!root.hasAttribute("data-max") || root.getAttribute("data-max") === "") {
    return null;
  }
  const n = Number(root.getAttribute("data-max"));
  return Number.isFinite(n) ? n : null;
}

function parseKnCounterInputValue(raw, min) {
  if (raw === "" || raw == null) {
    return min;
  }
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : min;
}

function clampKnCounterInput(value, min, max) {
  let next = value;
  if (next < min) {
    next = min;
  }
  if (max != null && next > max) {
    next = max;
  }
  return next;
}

function knCounterInputDigitCount(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Math.max(2, String(Math.abs(n)).length) + (n < 0 ? 1 : 0);
}

function knCounterInputEnsureIcon(button, svg) {
  if (!button || button.querySelector("svg")) {
    return;
  }
  button.insertAdjacentHTML("afterbegin", svg);
}

function knCounterInputEnsureProgress(control) {
  let progress = control.querySelector(":scope > .kn-counter-input__progress");
  if (!progress) {
    progress = document.createElement("span");
    progress.className = "kn-counter-input__progress";
    progress.setAttribute("aria-hidden", "true");
    progress.innerHTML = '<span class="kn-counter-input__progress-fill"></span>';
    control.appendChild(progress);
  }
  return progress;
}

function knCounterInputEnsureWrap(field) {
  const parent = field.parentElement;
  if (parent?.classList.contains("kn-counter-input__field-wrap")) {
    return parent;
  }
  const wrap = document.createElement("span");
  wrap.className = "kn-counter-input__field-wrap";
  field.parentNode.insertBefore(wrap, field);
  wrap.appendChild(field);
  return wrap;
}

function syncKnCounterInput(root) {
  const field = root.querySelector(".kn-counter-input__field");
  const dec = root.querySelector(".kn-counter-input__dec");
  const inc = root.querySelector(".kn-counter-input__inc");
  if (!field) {
    return;
  }
  const min = parseKnCounterInputMin(root);
  const max = parseKnCounterInputMax(root);
  const loading = root.classList.contains("is-loading");
  const disabled = root.classList.contains("is-disabled") || field.disabled;
  const locked = disabled || loading;
  if (disabled) {
    root.classList.add("is-disabled");
  }
  const value = clampKnCounterInput(parseKnCounterInputValue(field.value, min), min, max);
  if (String(field.value) !== String(value)) {
    field.value = String(value);
  }
  field.setAttribute("aria-valuemin", String(min));
  if (max != null) {
    field.setAttribute("aria-valuemax", String(max));
  } else {
    field.removeAttribute("aria-valuemax");
  }
  field.setAttribute("aria-valuenow", String(value));
  root.style.setProperty("--kn-counter-input-digits", String(knCounterInputDigitCount(value)));
  if (dec) {
    dec.disabled = locked || value <= min;
  }
  if (inc) {
    inc.disabled = locked || (max != null && value >= max);
  }
  field.readOnly = loading;
  if (disabled) {
    field.disabled = true;
  }
  root.setAttribute("aria-busy", loading ? "true" : "false");
}

function hydrateKnCounterInput(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "counter-input");
  root.classList.add("kn-counter-input");
  const hasSize = KN_COUNTER_INPUT_SIZES.some((size) => root.classList.contains(`kn-counter-input--${size}`));
  if (!hasSize) {
    root.classList.add("kn-counter-input--medium");
  }
  if (!root.classList.contains("kn-counter-input--intense") && !root.classList.contains("kn-counter-input--subtle")) {
    root.classList.add("kn-counter-input--subtle");
  }
  const label = root.querySelector(".kn-counter-input__label, .kn-form-label");
  if (label && !label.classList.contains("kn-counter-input__label")) {
    label.classList.add("kn-counter-input__label");
  }
  if (label && !label.classList.contains("kn-form-label")) {
    label.classList.add("kn-form-label");
  }
  let control = root.querySelector(".kn-counter-input__control");
  if (!control) {
    control = document.createElement("div");
    control.className = "kn-counter-input__control";
    root.appendChild(control);
  }
  control.setAttribute("role", "group");
  let dec = root.querySelector(".kn-counter-input__dec");
  let field = root.querySelector(".kn-counter-input__field");
  let inc = root.querySelector(".kn-counter-input__inc");
  if (!dec) {
    dec = document.createElement("button");
    dec.type = "button";
    dec.className = "kn-counter-input__dec";
    control.insertBefore(dec, control.firstChild);
  }
  if (!field) {
    field = document.createElement("input");
    field.className = "kn-counter-input__field";
    control.appendChild(field);
  }
  if (!inc) {
    inc = document.createElement("button");
    inc.type = "button";
    inc.className = "kn-counter-input__inc";
    control.appendChild(inc);
  }
  if (dec.parentElement !== control) {
    control.insertBefore(dec, control.firstChild);
  }
  const wrap = knCounterInputEnsureWrap(field);
  if (wrap.parentElement !== control) {
    if (inc.parentElement === control) {
      control.insertBefore(wrap, inc);
    } else {
      control.appendChild(wrap);
    }
  }
  if (inc.parentElement !== control) {
    control.appendChild(inc);
  }
  knCounterInputEnsureIcon(dec, KN_COUNTER_INPUT_MINUS);
  knCounterInputEnsureIcon(inc, KN_COUNTER_INPUT_PLUS);
  knCounterInputEnsureProgress(control);
  if (!dec.getAttribute("aria-label")) {
    dec.setAttribute("aria-label", "Decrement value");
  }
  if (!inc.getAttribute("aria-label")) {
    inc.setAttribute("aria-label", "Increment value");
  }
  field.setAttribute("type", "number");
  field.setAttribute("role", "spinbutton");
  field.setAttribute("inputmode", "numeric");
  if (!field.id) {
    knCounterInputSeq += 1;
    field.id = `kn-counter-input-${knCounterInputSeq}`;
  }
  if (label && !label.getAttribute("for")) {
    label.setAttribute("for", field.id);
  }
  if (label?.id && !control.getAttribute("aria-labelledby")) {
    control.setAttribute("aria-labelledby", label.id);
  }
  const min = parseKnCounterInputMin(root);
  if (!field.hasAttribute("min")) {
    field.min = String(min);
  }
  const max = parseKnCounterInputMax(root);
  if (max != null && !field.hasAttribute("max")) {
    field.max = String(max);
  }
  if (root.dataset.knHydrated === "1") {
    syncKnCounterInput(root);
    return;
  }
  root.dataset.knHydrated = "1";

  const commit = (next, action) => {
    const minVal = parseKnCounterInputMin(root);
    const maxVal = parseKnCounterInputMax(root);
    const prev = parseKnCounterInputValue(field.value, minVal);
    const clamped = clampKnCounterInput(next, minVal, maxVal);
    field.value = String(clamped);
    if (action && clamped !== prev && !root.classList.contains("is-loading")) {
      wrap.classList.remove("is-up", "is-down");
      void wrap.offsetWidth;
      wrap.classList.add(action === "increment" ? "is-up" : "is-down");
      window.setTimeout(() => {
        wrap.classList.remove("is-up", "is-down");
      }, knMotionDurationMs("--theme-motion-duration-quick", 200));
    }
    syncKnCounterInput(root);
    if (clamped !== prev) {
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  dec.addEventListener("click", () => {
    if (dec.disabled) {
      return;
    }
    commit(parseKnCounterInputValue(field.value, parseKnCounterInputMin(root)) - 1, "decrement");
  });
  inc.addEventListener("click", () => {
    if (inc.disabled) {
      return;
    }
    commit(parseKnCounterInputValue(field.value, parseKnCounterInputMin(root)) + 1, "increment");
  });
  field.addEventListener("input", () => {
    const minVal = parseKnCounterInputMin(root);
    const next = parseKnCounterInputValue(field.value, minVal);
    const clamped = clampKnCounterInput(next, minVal, parseKnCounterInputMax(root));
    if (String(field.value) !== String(clamped) && field.value !== "") {
      field.value = String(clamped);
    }
    syncKnCounterInput(root);
  });
  field.addEventListener("blur", () => {
    commit(parseKnCounterInputValue(field.value, parseKnCounterInputMin(root)));
  });
  field.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!inc.disabled) {
        commit(parseKnCounterInputValue(field.value, parseKnCounterInputMin(root)) + 1, "increment");
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!dec.disabled) {
        commit(parseKnCounterInputValue(field.value, parseKnCounterInputMin(root)) - 1, "decrement");
      }
    }
  });
  syncKnCounterInput(root);
}

function hydrateKnCounterInputs(scope = document) {
  const root = scope || document;
  const nodes =
    root.nodeType === 1 && root.matches?.(".kn-counter-input")
      ? [root]
      : Array.from(root.querySelectorAll?.(".kn-counter-input") || []);
  nodes.forEach((el) => hydrateKnCounterInput(el));
}

window.KNCounterInput = Object.assign(window.KNCounterInput || {}, {
  hydrate: hydrateKnCounterInputs,
  clamp: clampKnCounterInput
});

function knCollapsibleBody(root, trigger) {
  const id = trigger?.getAttribute("aria-controls");
  if (id) {
    const byId = document.getElementById(id);
    if (byId) {
      return byId;
    }
  }
  return root?.querySelector(":scope > .kn-collapsible__body, .kn-collapsible__body") || null;
}

function knCollapsibleIsExternallyManaged(trigger) {
  if (!(trigger instanceof HTMLElement)) {
    return true;
  }
  if (trigger.closest(".kn-accordion, .kn-accordion__item, details.kn-accordion")) {
    return true;
  }
  return trigger.matches("[data-admin-details-toggle], [data-admin-unused-toggle]");
}

function syncKnCollapsibleThinkingLabel(trigger) {
  if (!trigger?.classList.contains("ai-msg__thinking-toggle")) {
    return;
  }
  const panelEl = trigger.closest(".ai-msg__thinking-panel, .kn-collapsible");
  const label = trigger.querySelector(".ai-msg__thinking-toggle-label");
  if (!label) {
    return;
  }
  const loading = panelEl?.getAttribute("data-reasoning-status") === "loading";
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  label.textContent = loading ? "Exploring…" : expanded ? "Hide thinking" : "Show thinking";
}

function setKnCollapsibleExpanded(trigger, expanded) {
  if (!(trigger instanceof HTMLElement)) {
    return false;
  }
  const root = trigger.closest(".kn-collapsible");
  const body = knCollapsibleBody(root, trigger);
  trigger.setAttribute("aria-expanded", String(expanded));
  if (body) {
    body.hidden = !expanded;
    if (!body.getAttribute("role")) {
      body.setAttribute("role", "region");
    }
  }
  syncKnCollapsibleThinkingLabel(trigger);
  return expanded;
}

function toggleKnCollapsible(trigger) {
  if (!(trigger instanceof HTMLElement) || trigger.disabled) {
    return false;
  }
  const root = trigger.closest(".kn-collapsible");
  if (root?.classList.contains("is-disabled") || trigger.getAttribute("aria-disabled") === "true") {
    return trigger.getAttribute("aria-expanded") === "true";
  }
  const next = trigger.getAttribute("aria-expanded") !== "true";
  return setKnCollapsibleExpanded(trigger, next);
}

function hydrateKnCollapsible(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "collapsible");
  const trigger = root.querySelector(".kn-collapsible__trigger");
  if (!trigger) {
    return;
  }
  if (trigger.tagName === "BUTTON" && !trigger.getAttribute("type")) {
    trigger.setAttribute("type", "button");
  }
  const body = knCollapsibleBody(root, trigger);
  if (body) {
    if (!trigger.getAttribute("aria-controls") && body.id) {
      trigger.setAttribute("aria-controls", body.id);
    }
    if (!body.getAttribute("role")) {
      body.setAttribute("role", "region");
    }
    if (trigger.getAttribute("aria-expanded") == null) {
      trigger.setAttribute("aria-expanded", body.hidden ? "false" : "true");
    }
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    body.hidden = !expanded;
  }
  if (root.classList.contains("is-disabled") && trigger.tagName === "BUTTON") {
    trigger.disabled = true;
  }
}

function hydrateKnCollapsibles(scope = document) {
  const roots =
    scope.nodeType === 1 && scope.matches?.(".kn-collapsible")
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-collapsible"));
  roots.forEach((el) => hydrateKnCollapsible(el));
  bindKnCollapsibleClicks();
}

let knCollapsibleClicksBound = false;

function bindKnCollapsibleClicks() {
  if (knCollapsibleClicksBound) {
    return;
  }
  knCollapsibleClicksBound = true;
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".kn-collapsible__trigger");
    if (!trigger) {
      return;
    }
    if (knCollapsibleIsExternallyManaged(trigger)) {
      return;
    }
    event.preventDefault();
    toggleKnCollapsible(trigger);
  });
}

window.KNCollapsible = Object.assign(window.KNCollapsible || {}, {
  hydrate: hydrateKnCollapsibles,
  toggle: toggleKnCollapsible
});

function hydrateKnConfirmation(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const confirm = root.classList.contains("kn-confirm")
    ? root
    : root.querySelector(".kn-confirm");
  if (!confirm) {
    return;
  }
  confirm.setAttribute("data-kn-component", "confirmation");
  const dialog = confirm.closest(".kn-modal--confirm, .kn-sheet, [role='alertdialog']") || confirm;
  if (dialog.getAttribute("role") !== "dialog" && dialog.getAttribute("role") !== "alertdialog") {
    dialog.setAttribute("role", "alertdialog");
  }
  if (!dialog.hasAttribute("aria-modal") && (dialog.classList.contains("kn-modal--confirm") || dialog.classList.contains("kn-sheet"))) {
    dialog.setAttribute("aria-modal", "true");
  }
  const title = confirm.querySelector(".kn-confirm__title, .kn-confirm__copy > :first-child");
  const description = confirm.querySelector(".kn-confirm__description, .kn-confirm__copy .type-body-md");
  if (title && !title.classList.contains("kn-confirm__title")) {
    title.classList.add("kn-confirm__title");
  }
  if (description && !description.classList.contains("kn-confirm__description")) {
    description.classList.add("kn-confirm__description");
  }
  if (title?.id && !dialog.getAttribute("aria-labelledby")) {
    dialog.setAttribute("aria-labelledby", title.id);
  }
  if (description?.id && !dialog.getAttribute("aria-describedby")) {
    dialog.setAttribute("aria-describedby", description.id);
  }
  const actions = confirm.querySelector(".kn-confirm__actions");
  if (actions) {
    if (!actions.classList.contains("kn-btn-group")) {
      actions.classList.add("kn-btn-group", "kn-btn-group--loose");
    }
    hydrateKnButtonGroup(actions);
    actions.querySelectorAll(".kn-btn, button.btn").forEach((el) => hydrateKnButton(el));
  }
  const close = dialog.querySelector(".kn-modal__header .icon-btn, .kn-header__close");
  if (close) {
    hydrateKnIconButton(close);
  }
  if (confirm.classList.contains("is-loading")) {
    const primary = actions?.querySelector(".btn--primary, .kn-btn--primary");
    if (primary) {
      primary.classList.add("is-loading");
      hydrateKnButton(primary);
    }
  }
}

function hydrateKnConfirmations(scope = document) {
  const nodes =
    scope.nodeType === 1 && scope.matches?.(".kn-confirm, .kn-modal--confirm")
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-confirm, .kn-modal--confirm"));
  const seen = new Set();
  nodes.forEach((el) => {
    const confirm = el.classList.contains("kn-confirm") ? el : el.querySelector(".kn-confirm") || el;
    if (seen.has(confirm)) {
      return;
    }
    seen.add(confirm);
    hydrateKnConfirmation(confirm);
  });
}

window.KNConfirmation = Object.assign(window.KNConfirmation || {}, {
  hydrate: hydrateKnConfirmations
});

function hydrateKnCreation(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const creation = root.classList.contains("kn-creation")
    ? root
    : root.querySelector(".kn-creation");
  if (!creation) {
    return;
  }
  creation.setAttribute("data-kn-component", "creation");
  const form = creation.querySelector(".kn-creation__form");
  const preview = creation.querySelector(".kn-creation__preview");
  if (form && preview) {
    creation.classList.add("kn-creation--split");
  }
  const modal = creation.closest(".kn-modal");
  if (
    modal &&
    creation.classList.contains("kn-creation--split") &&
    !modal.classList.contains("kn-modal--large") &&
    !modal.classList.contains("kn-modal--full") &&
    !modal.classList.contains("kn-modal--confirm")
  ) {
    modal.classList.add("kn-modal--large");
  }
  const overlay = creation.closest(".kn-modal, .kn-sheet") || creation;
  if (typeof hydrateKnHeaders === "function") {
    hydrateKnHeaders(overlay);
  }
  const footer =
    overlay.querySelector(":scope > .kn-footer, :scope > .kn-modal__footer, :scope > .kn-drawer__footer") ||
    overlay.querySelector(".kn-footer, .kn-modal__footer") ||
    creation.querySelector(".kn-footer");
  if (footer) {
    footer.classList.add("kn-footer");
    let actions = footer.querySelector(".kn-footer__actions, .kn-btn-group");
    if (!actions) {
      actions = footer;
    }
    if (!actions.classList.contains("kn-btn-group")) {
      actions.classList.add("kn-btn-group", "kn-btn-group--loose");
    }
    actions.classList.add("kn-footer__actions");
    hydrateKnButtonGroup(actions);
    actions.querySelectorAll(".kn-btn, button.btn").forEach((el) => hydrateKnButton(el));
  }
  creation.querySelectorAll(".kn-btn, button.btn").forEach((el) => {
    if (!el.closest(".kn-footer, .kn-modal__footer, .kn-footer__actions")) {
      hydrateKnButton(el);
    }
  });
  const previewOpen = creation.querySelector("[data-kn-creation-preview-open]");
  if (previewOpen) {
    hydrateKnButton(previewOpen);
    const previewTarget = previewOpen.getAttribute("data-kn-creation-preview-open");
    if (previewTarget?.startsWith("#") && !previewOpen.hasAttribute("data-kn-sheet-open")) {
      previewOpen.setAttribute("data-kn-sheet-open", previewTarget);
    }
  }
  if (creation.classList.contains("is-loading") && footer) {
    const primary = footer.querySelector(".btn--primary, .kn-btn--primary");
    if (primary) {
      primary.classList.add("is-loading");
      hydrateKnButton(primary);
    }
  }
}

function hydrateKnCreations(scope = document) {
  const nodes =
    scope.nodeType === 1 && scope.matches?.(".kn-creation")
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-creation"));
  nodes.forEach((el) => hydrateKnCreation(el));
}

window.KNCreation = Object.assign(window.KNCreation || {}, {
  hydrate: hydrateKnCreations
});

function knThemeSizePx(step, fallback) {
  const value = window.knTheme?.size?.[step];
  return typeof value === "number" ? value : fallback;
}

function knDateToIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function knDateFromIso(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function knDateStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function knDateSameDay(left, right) {
  return knDateToIso(left) === knDateToIso(right);
}

function knDateFormatRange(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = start.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const endText = end.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  return `${startText} – ${endText}`;
}

function knDateFormatSingle(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function knDatePresetResolvers(today) {
  return {
    7: () => {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return [start, today];
    },
    30: () => {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return [start, today];
    },
    month: () => [new Date(today.getFullYear(), today.getMonth(), 1), today],
    "last-month": () => {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return [start, end];
    },
    today: () => [today, today]
  };
}

function hydrateKnDatePicker(root) {
  if (!root || root.nodeType !== 1) {
    return null;
  }
  const picker = root.classList.contains("kn-date-picker")
    ? root
    : root.querySelector(".kn-date-picker");
  if (!picker) {
    return null;
  }
  if (picker._knDatePicker) {
    return picker._knDatePicker;
  }
  picker.setAttribute("data-kn-component", "datepicker");
  picker.classList.add("kn-dropdown");
  if (typeof hydrateKnDropdown === "function") {
    hydrateKnDropdown(picker);
  }
  const isRange = picker.classList.contains("kn-date-picker--range");
  const trigger =
    picker.querySelector(".kn-date-picker__trigger, [aria-haspopup='dialog']") ||
    picker.querySelector("button");
  const panel = picker.querySelector(".kn-date-picker__panel");
  const inputs = Array.from(picker.querySelectorAll(".kn-date-picker__input"));
  const startInput = inputs[0];
  const endInput = isRange ? inputs[1] : null;
  const error = picker.querySelector(".kn-date-picker__error");
  const title = picker.querySelector(".kn-date-picker__title, #dash-date-title");
  const caption = picker.querySelector(".kn-date-picker__caption");
  const label = picker.querySelector(".kn-date-picker__value, #dash-date-label");
  const footer = picker.querySelector(".kn-date-picker__footer");
  const cancel = picker.querySelector("[data-kn-date-cancel], #dash-date-cancel");
  const apply = picker.querySelector("[data-kn-date-apply], #dash-date-apply");
  if (!trigger || !panel || !startInput) {
    return null;
  }
  trigger.classList.add("kn-date-picker__trigger");
  const icon = trigger.querySelector("svg");
  if (icon) {
    icon.classList.add("kn-date-picker__icon");
  }
  if (title && !title.classList.contains("kn-date-picker__title")) {
    title.classList.add("kn-date-picker__title");
  }
  if (caption && !caption.classList.contains("kn-date-picker__caption")) {
    caption.classList.add("kn-date-picker__caption");
  }
  picker.querySelectorAll(".kn-date-picker__field, .kn-detail-field").forEach((field) => {
    field.classList.add("kn-field", "kn-date-picker__field");
  });
  inputs.forEach((input) => {
    input.classList.add("kn-field__control", "kn-date-picker__input");
    input.classList.remove("vis-th-filter");
  });
  picker.querySelectorAll(".kn-date-picker__field > span, .kn-date-picker__field .kn-form-label").forEach((el) => {
    el.classList.add("kn-form-label");
  });
  if (error) {
    error.classList.add("kn-form-hint", "kn-form-hint--error");
  }
  if (footer) {
    footer.classList.add("kn-btn-group", "kn-btn-group--loose");
    hydrateKnButtonGroup(footer);
    footer.querySelectorAll(".kn-btn, button.btn").forEach((el) => hydrateKnButton(el));
  }
  picker.querySelectorAll("[data-dash-preset]").forEach((el) => {
    if (!el.hasAttribute("data-kn-date-preset")) {
      el.setAttribute("data-kn-date-preset", el.getAttribute("data-dash-preset"));
    }
  });
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  if (!panel.getAttribute("role")) {
    panel.setAttribute("role", "dialog");
  }
  panel.setAttribute("aria-modal", "true");
  if (title?.id && !panel.getAttribute("aria-labelledby")) {
    panel.setAttribute("aria-labelledby", title.id);
  }

  let applied = isRange
    ? [knDateStartOfDay(new Date()), knDateStartOfDay(new Date())]
    : knDateStartOfDay(new Date());

  const presetButtons = () => panel.querySelectorAll("[data-kn-date-preset], [data-dash-preset]");

  const setPresetSelection = (id) => {
    presetButtons().forEach((button) => {
      const key = button.getAttribute("data-kn-date-preset") || button.getAttribute("data-dash-preset");
      const selected = Boolean(id) && key === id;
      button.setAttribute("aria-selected", String(selected));
      button.classList.toggle("is-selected", selected);
      button.classList.toggle("is-active", selected);
    });
  };

  const matchPreset = (start, end) => {
    const today = knDateStartOfDay(new Date());
    const resolvers = knDatePresetResolvers(today);
    return (
      Object.entries(resolvers).find(([, resolve]) => {
        const [from, to] = resolve().map(knDateStartOfDay);
        if (isRange) {
          return knDateSameDay(from, start) && knDateSameDay(to, end);
        }
        return knDateSameDay(from, start);
      })?.[0] || ""
    );
  };

  const clearDateError = () => {
    if (error) {
      error.hidden = true;
    }
    startInput.removeAttribute("aria-invalid");
    startInput.closest(".kn-date-picker__field")?.classList.remove("is-invalid");
    if (endInput) {
      endInput.removeAttribute("aria-invalid");
      endInput.closest(".kn-date-picker__field")?.classList.remove("is-invalid");
    }
  };

  const showDateError = (message, { startInvalid = false, endInvalid = true } = {}) => {
    if (error) {
      error.hidden = false;
      error.textContent = message;
      error.setAttribute("role", "alert");
      error.setAttribute("aria-live", "assertive");
    }
    startInput.setAttribute("aria-invalid", startInvalid ? "true" : "false");
    startInput.closest(".kn-date-picker__field")?.classList.toggle("is-invalid", startInvalid);
    if (endInput) {
      endInput.setAttribute("aria-invalid", endInvalid ? "true" : "false");
      endInput.closest(".kn-date-picker__field")?.classList.toggle("is-invalid", endInvalid);
    }
    positionPanel();
  };

  const fillInputs = (start, end) => {
    startInput.value = knDateToIso(start);
    if (endInput) {
      endInput.value = knDateToIso(end);
      endInput.min = startInput.value;
    }
    clearDateError();
    setPresetSelection(matchPreset(start, end || start));
  };

  const positionPanel = () => {
    const gutter = knThemeSpacePx(5) || knThemeSizePx(16, 16);
    const offset = knThemeSizePx(8, 8);
    const width = panel.offsetWidth || knThemeSizePx(300, 320);
    const triggerRect = trigger.getBoundingClientRect();
    let left = triggerRect.right - width;
    if (left < gutter) {
      left = gutter;
    }
    if (left + width > window.innerWidth - gutter) {
      left = window.innerWidth - width - gutter;
    }
    let top = triggerRect.bottom + offset;
    const panelHeight = panel.offsetHeight;
    if (panelHeight && top + panelHeight > window.innerHeight - gutter) {
      const above = triggerRect.top - panelHeight - offset;
      if (above >= gutter) {
        top = above;
      }
    }
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
  };

  const onReposition = () => {
    if (!panel.hidden) {
      positionPanel();
    }
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    window.removeEventListener("resize", onReposition);
    document.removeEventListener("scroll", onReposition, true);
    if (!open) {
      return;
    }
    if (typeof setProfileMenuOpen === "function") {
      setProfileMenuOpen(false);
    }
    if (typeof setQuickActionsOpen === "function") {
      setQuickActionsOpen(false);
    }
    if (isRange && Array.isArray(applied)) {
      fillInputs(applied[0], applied[1]);
    } else {
      fillInputs(applied, applied);
    }
    positionPanel();
    window.addEventListener("resize", onReposition);
    document.addEventListener("scroll", onReposition, true);
    window.requestAnimationFrame(() => {
      startInput.focus();
      positionPanel();
    });
  };

  const commitRange = (start, end, { persist = true } = {}) => {
    const nextStart = knDateStartOfDay(start);
    const nextEnd = knDateStartOfDay(end || start);
    applied = isRange ? [nextStart, nextEnd] : nextStart;
    const text = isRange ? knDateFormatRange(nextStart, nextEnd) : knDateFormatSingle(nextStart);
    if (label) {
      label.textContent = text;
    }
    trigger.setAttribute("aria-label", isRange ? `Date range, ${text}` : `Date, ${text}`);
    if (picker.classList.contains("kn-date-picker--chip")) {
      picker.classList.add("is-selected");
      picker.querySelector(".kn-filter-chip")?.classList.add("is-selected");
    }
    setOpen(false);
    picker.dispatchEvent(
      new CustomEvent("kn-date-apply", {
        bubbles: true,
        detail: { start: nextStart, end: nextEnd, label: text, persist, range: isRange }
      })
    );
  };

  const tryApply = ({ persist = true } = {}) => {
    const start = knDateFromIso(startInput.value);
    const end = endInput ? knDateFromIso(endInput.value) : start;
    if (!start || (isRange && !end)) {
      showDateError(
        isRange ? "Choose both a start date and an end date." : "Choose a date.",
        { startInvalid: !start, endInvalid: isRange && !end }
      );
      (!start ? startInput : endInput || startInput).focus();
      return false;
    }
    if (isRange && end < start) {
      showDateError("End date must be after start date", { startInvalid: false, endInvalid: true });
      endInput.focus();
      return false;
    }
    clearDateError();
    commitRange(start, end, { persist });
    return true;
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });
  cancel?.addEventListener("click", () => {
    setOpen(false);
    trigger.focus();
  });
  apply?.addEventListener("click", () => {
    tryApply({ persist: true });
  });
  panel.addEventListener("click", (event) => {
    const preset = event.target.closest("[data-kn-date-preset], [data-dash-preset]");
    if (!preset) {
      return;
    }
    const id = preset.getAttribute("data-kn-date-preset") || preset.getAttribute("data-dash-preset");
    const resolvers = knDatePresetResolvers(knDateStartOfDay(new Date()));
    const resolve = resolvers[id];
    if (!resolve) {
      return;
    }
    const [start, end] = resolve();
    fillInputs(start, end);
    setPresetSelection(id);
    if (picker.classList.contains("kn-date-picker--no-footer")) {
      commitRange(start, end, { persist: true });
    }
  });
  const onDraftChange = () => {
    if (endInput) {
      endInput.min = startInput.value || "";
    }
    clearDateError();
    const start = knDateFromIso(startInput.value);
    const end = endInput ? knDateFromIso(endInput.value) : start;
    setPresetSelection(start && (!isRange || end) ? matchPreset(start, end) : "");
    if (picker.classList.contains("kn-date-picker--no-footer") && start && (!isRange || (end && end >= start))) {
      commitRange(start, end, { persist: true });
    }
  };
  startInput.addEventListener("input", onDraftChange);
  endInput?.addEventListener("input", onDraftChange);
  document.addEventListener("click", (event) => {
    if (panel.hidden) {
      return;
    }
    if (event.target.closest(".kn-date-picker") === picker || event.target.closest(".kn-date-picker__panel") === panel) {
      return;
    }
    setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });

  const api = {
    setOpen,
    applyRange: commitRange,
    getRange: () => (isRange ? applied : [applied, applied])
  };
  picker._knDatePicker = api;
  return api;
}

function hydrateKnDatePickers(scope = document) {
  const nodes =
    scope.nodeType === 1 && scope.matches?.(".kn-date-picker")
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-date-picker"));
  nodes.forEach((el) => hydrateKnDatePicker(el));
}

window.KNDatePicker = Object.assign(window.KNDatePicker || {}, {
  hydrate: hydrateKnDatePickers
});

function knDetailTabSelected(tab) {
  return tab.getAttribute("aria-selected") === "true" || tab.classList.contains("is-active");
}

function knDetailTabsInList(list) {
  return Array.from(list.querySelectorAll('[role="tab"], .kn-tab')).filter((tab) => {
    return !tab.disabled && tab.getAttribute("aria-disabled") !== "true";
  });
}

function hydrateKnDetailTablist(list) {
  if (!list || list.nodeType !== 1) {
    return;
  }
  if (!list.getAttribute("role")) {
    list.setAttribute("role", "tablist");
  }
  const tabs = knDetailTabsInList(list);
  tabs.forEach((tab) => {
    tab.classList.add("kn-tab");
    tab.setAttribute("role", "tab");
    if (tab.tagName === "BUTTON" && !tab.getAttribute("type")) {
      tab.setAttribute("type", "button");
    }
    const selected = knDetailTabSelected(tab);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  if (list.dataset.knTabsBound === "true") {
    return;
  }
  list.dataset.knTabsBound = "true";
  list.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    const items = knDetailTabsInList(list);
    if (!items.length) {
      return;
    }
    const current = items.indexOf(event.target.closest('[role="tab"], .kn-tab'));
    if (current < 0) {
      return;
    }
    event.preventDefault();
    let next = current;
    if (event.key === "ArrowLeft") {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === "ArrowRight") {
      next = (current + 1) % items.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    }
    items[next].focus();
    items[next].click();
  });
}

function hydrateKnDetailedView(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const view = root.classList.contains("kn-detailed-view") || root.classList.contains("kn-detail")
    ? root
    : root.querySelector(".kn-detailed-view, .kn-detail");
  if (!view) {
    return;
  }
  view.classList.add("kn-detailed-view", "kn-detail");
  view.setAttribute("data-kn-component", "detailed-view");
  const head =
    view.querySelector(":scope > .kn-header, :scope > .kn-drawer__header, :scope > .kn-detail-head") ||
    view.querySelector(".kn-detail-head, .kn-drawer__header");
  const tabs =
    view.querySelector(":scope > .kn-detailed-view__tabs, :scope > .kn-detail-tabs") ||
    view.querySelector(".kn-detailed-view__tabs, .kn-detail-tabs");
  if (head) {
    head.classList.add("kn-header", "kn-detailed-view__head", "kn-detail-head");
    if (tabs) {
      head.classList.add("kn-header--no-divider", "kn-drawer__header--no-divider");
    }
  }
  if (tabs) {
    tabs.classList.add("kn-detailed-view__tabs", "kn-detail-tabs");
    hydrateKnDetailTablist(tabs);
  }
  const body =
    view.querySelector(":scope > .kn-drawer__body, :scope > .kn-detailed-view__body, :scope > .kn-detail-panel") ||
    view.querySelector(".kn-detail-panel");
  if (body) {
    body.classList.add("kn-detailed-view__body", "kn-detail-panel", "kn-box", "kn-box--column");
  }
  const footer =
    view.querySelector(":scope > .kn-footer, :scope > .kn-drawer__footer, :scope > .kn-detail-footer") ||
    view.querySelector(".kn-detail-footer, .kn-drawer__footer");
  if (footer) {
    footer.classList.add("kn-footer", "kn-detailed-view__footer", "kn-detail-footer");
    let actions = footer.querySelector(".kn-footer__actions, .kn-drawer__footer-actions, .kn-btn-group");
    if (!actions) {
      const buttons = footer.querySelectorAll(".kn-btn, button.btn, a.btn");
      if (buttons.length) {
        actions = footer;
      }
    }
    if (actions) {
      if (!actions.classList.contains("kn-btn-group")) {
        actions.classList.add("kn-btn-group", "kn-btn-group--loose");
      }
      actions.classList.add("kn-footer__actions");
      hydrateKnButtonGroup(actions);
      actions.querySelectorAll(".kn-btn, button.btn, a.btn").forEach((el) => hydrateKnButton(el));
    }
  }
  if (typeof hydrateKnHeaders === "function") {
    hydrateKnHeaders(view);
  }
  if (typeof hydrateKnBadges === "function") {
    hydrateKnBadges(view);
  }
  if (typeof hydrateKnTags === "function") {
    hydrateKnTags(view);
  }
  if (typeof hydrateKnSearchInputs === "function") {
    hydrateKnSearchInputs(view);
  }
  if (typeof hydrateKnPhones === "function") {
    hydrateKnPhones(view);
  }
  if (typeof hydrateKnForms === "function") {
    hydrateKnForms(view);
  }
  if (typeof hydrateKnDividers === "function") {
    hydrateKnDividers(view);
  }
  if (typeof hydrateKnCollapsibles === "function") {
    hydrateKnCollapsibles(view);
  }
  if (typeof hydrateKnDatePickers === "function") {
    hydrateKnDatePickers(view);
  }
  if (typeof hydrateKnSwitches === "function") {
    hydrateKnSwitches(view);
  }
  if (typeof hydrateKnButtons === "function") {
    view.querySelectorAll("button.icon-btn").forEach((el) => hydrateKnIconButton(el));
  }
  const drawerRoot = view.closest(".kn-drawer-root");
  if (drawerRoot && typeof hydrateKnDrawer === "function") {
    hydrateKnDrawer(drawerRoot);
  }
  if (view.classList.contains("is-loading") && footer) {
    const primary = footer.querySelector(".btn--primary, .kn-btn--primary");
    if (primary) {
      primary.classList.add("is-loading");
      hydrateKnButton(primary);
    }
  }
}

function hydrateKnDetailedViews(scope = document) {
  const nodes =
    scope.nodeType === 1 && scope.matches?.(".kn-detailed-view, .kn-detail")
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-detailed-view, .kn-detail"));
  nodes.forEach((el) => hydrateKnDetailedView(el));
}

window.KNDetailedView = Object.assign(window.KNDetailedView || {}, {
  hydrate: hydrateKnDetailedViews
});

function knDividerSkip(el) {
  return (
    el.classList.contains("ai-assistant-panel__resize") ||
    el.classList.contains("kn-accordion__item") ||
    Boolean(el.closest(".ai-assistant-panel__resize"))
  );
}

function hydrateKnDivider(el) {
  if (!el || el.nodeType !== 1 || knDividerSkip(el)) {
    return;
  }
  el.classList.add("kn-divider");
  if (el.classList.contains("menu-divider") || el.classList.contains("kn-menu__divider")) {
    el.classList.add("menu-divider");
  }
  if (el.classList.contains("kn-filter-chip__divider")) {
    el.classList.add("kn-divider--vertical", "kn-divider--subtle");
  }
  el.setAttribute("data-kn-component", "divider");
  if (!el.getAttribute("role")) {
    el.setAttribute("role", "separator");
  }
  if (el.classList.contains("kn-divider--vertical")) {
    el.setAttribute("aria-orientation", "vertical");
  } else if (!el.getAttribute("aria-orientation")) {
    el.setAttribute("aria-orientation", "horizontal");
  }
}

function hydrateKnDividers(scope = document) {
  const root = scope || document;
  const selector = ".kn-divider, .menu-divider, .kn-menu__divider, .kn-filter-chip__divider";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnDivider(el));
}

window.KNDivider = Object.assign(window.KNDivider || {}, {
  hydrate: hydrateKnDividers
});

function knDrawerCloseMs() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return knThemeDurationMs("xmoderate");
}

function hydrateKnDrawer(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const host = root.classList.contains("kn-drawer-root")
    ? root
    : root.closest?.(".kn-drawer-root");
  if (!host) {
    return;
  }
  host.setAttribute("data-kn-component", "drawer");
  const overlay = host.querySelector(":scope > .kn-drawer__overlay");
  if (overlay && !overlay.hasAttribute("tabindex")) {
    overlay.setAttribute("tabindex", "-1");
  }
  const panel = host.querySelector(":scope > .kn-drawer");
  if (panel) {
    if (!panel.getAttribute("role")) {
      panel.setAttribute("role", "dialog");
    }
    panel.setAttribute("aria-modal", "true");
  }
  if (typeof hydrateKnHeaders === "function") {
    hydrateKnHeaders(host);
  }
  if (typeof hydrateKnBoxes === "function") {
    hydrateKnBoxes(host);
  }
  if (typeof hydrateKnButtons === "function") {
    hydrateKnButtons(host);
  }
  if (typeof hydrateKnDividers === "function") {
    hydrateKnDividers(host);
  }
  if (typeof hydrateKnForms === "function") {
    hydrateKnForms(host);
  }
  if (typeof hydrateKnTags === "function") {
    hydrateKnTags(host);
  }
  if (typeof hydrateKnSearchInputs === "function") {
    hydrateKnSearchInputs(host);
  }
  if (typeof hydrateKnPhones === "function") {
    hydrateKnPhones(host);
  }
}

function hydrateKnDrawers(scope = document) {
  const root = scope || document;
  const selector = ".kn-drawer-root";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnDrawer(el));
}

window.KNDrawer = Object.assign(window.KNDrawer || {}, {
  hydrate: hydrateKnDrawers,
  closeMs: knDrawerCloseMs
});

function hydrateKnEmpty(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "empty");
  root.classList.add("kn-empty", "empty-state");
  const loose = Array.from(root.children).filter(
    (el) => el.matches("button, a.btn, .kn-btn") && !el.closest(".kn-empty__actions, .empty-state__actions")
  );
  if (loose.length) {
    let slot = root.querySelector(":scope > .kn-empty__actions, :scope > .empty-state__actions");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "kn-empty__actions empty-state__actions";
      root.appendChild(slot);
    }
    loose.forEach((el) => slot.appendChild(el));
  }
  if (typeof hydrateKnButtons === "function") {
    hydrateKnButtons(root);
  }
}

function hydrateKnEmpties(scope = document) {
  const root = scope || document;
  const selector = ".kn-empty, .empty-state";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnEmpty(el));
}

window.KNEmpty = Object.assign(window.KNEmpty || {}, {
  hydrate: hydrateKnEmpties
});

function knFileUploadIsActionOnly(el) {
  return el.classList.contains("kn-file-upload__action") && !el.classList.contains("kn-file-upload");
}

function knFileUploadEnsureDropzone(host) {
  let zone = host.querySelector(":scope > .kn-file-upload__dropzone");
  if (zone) {
    return zone;
  }
  const items = host.querySelector(":scope > .kn-file-upload__items");
  const hint = host.querySelector(":scope > .kn-form-hint");
  const label = host.querySelector(":scope > .kn-form-label");
  zone = document.createElement("div");
  zone.className = "kn-file-upload__dropzone";
  if (host.classList.contains("isf-add-doc__dropzone")) {
    zone.classList.add("isf-add-doc__dropzone");
    host.classList.remove("isf-add-doc__dropzone");
  }
  const keep = new Set([items, hint, label].filter(Boolean));
  Array.from(host.childNodes)
    .filter((node) => !(node.nodeType === 1 && keep.has(node)))
    .forEach((node) => zone.appendChild(node));
  if (items) {
    host.insertBefore(zone, items);
  } else if (hint) {
    host.insertBefore(zone, hint);
  } else {
    host.appendChild(zone);
  }
  return zone;
}

function hydrateKnFileUpload(root) {
  if (!root || root.nodeType !== 1 || knFileUploadIsActionOnly(root)) {
    return;
  }
  const host = root.classList.contains("kn-file-upload")
    ? root
    : root.closest?.(".kn-file-upload") || (root.classList.contains("isf-add-doc__dropzone") ? root : null);
  if (!host) {
    return;
  }
  if (!host.classList.contains("kn-file-upload")) {
    host.classList.add("kn-file-upload", "kn-file-upload--variable");
  }
  host.setAttribute("data-kn-component", "file-upload");
  if (!host.getAttribute("data-upload-type")) {
    host.setAttribute("data-upload-type", "single");
  }

  const zone = knFileUploadEnsureDropzone(host);
  const looseSvg = zone.querySelector(":scope > svg");
  if (looseSvg && !looseSvg.closest(".kn-file-upload__icon")) {
    const icon = document.createElement("span");
    icon.className = "kn-file-upload__icon";
    icon.setAttribute("aria-hidden", "true");
    zone.insertBefore(icon, looseSvg);
    icon.appendChild(looseSvg);
  }

  zone.querySelectorAll(".kn-file-upload__link").forEach((link) => {
    link.classList.add("kn-link");
  });

  const inert = host.hasAttribute("data-isf-detail-inert") || zone.hasAttribute("data-isf-detail-inert");
  const disabled =
    host.classList.contains("is-disabled") || zone.getAttribute("aria-disabled") === "true";
  let input = zone.querySelector(":scope input[type='file']");
  if (!inert && !disabled && !input) {
    input = document.createElement("input");
    input.type = "file";
    input.className = "kn-file-upload__input visually-hidden";
    input.id = `kn-file-upload-input-${++hydrateKnFileUpload.seq}`;
    if (host.getAttribute("data-upload-type") === "multiple") {
      input.multiple = true;
    }
    zone.appendChild(input);
  }
  if (input) {
    input.classList.add("kn-file-upload__input", "visually-hidden");
    input.setAttribute("tabindex", "-1");
  }

  const items = host.querySelectorAll(".kn-file-upload__item");
  if (host.getAttribute("data-upload-type") !== "multiple" && items.length >= 1) {
    zone.hidden = true;
  } else {
    zone.hidden = false;
  }

  if (inert && !input) {
    if (!zone.hasAttribute("tabindex")) {
      zone.setAttribute("tabindex", "0");
    }
    if (!zone.getAttribute("role")) {
      zone.setAttribute("role", "button");
    }
  }

  if (host.dataset.knFileUploadBound === "true") {
    if (typeof hydrateKnButtons === "function") {
      hydrateKnButtons(host);
    }
    return;
  }
  host.dataset.knFileUploadBound = "true";

  const setActive = (on) => {
    if (disabled) {
      return;
    }
    zone.classList.toggle("is-active", on);
    host.classList.toggle("is-active", on);
  };

  zone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    setActive(true);
  });
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    setActive(true);
  });
  zone.addEventListener("dragleave", (event) => {
    if (zone.contains(event.relatedTarget)) {
      return;
    }
    setActive(false);
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    setActive(false);
  });
  zone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (input || event.target !== zone) {
      return;
    }
    event.preventDefault();
    zone.click();
  });

  if (typeof hydrateKnButtons === "function") {
    hydrateKnButtons(host);
  }
}
hydrateKnFileUpload.seq = 0;

function hydrateKnFileUploads(scope = document) {
  const root = scope || document;
  const selector = ".kn-file-upload, .isf-add-doc__dropzone";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  const seen = new Set();
  nodes.forEach((el) => {
    if (knFileUploadIsActionOnly(el)) {
      return;
    }
    const host = el.classList.contains("kn-file-upload")
      ? el
      : el.closest(".kn-file-upload") || el;
    if (seen.has(host)) {
      return;
    }
    seen.add(host);
    hydrateKnFileUpload(host);
  });
}

window.KNFileUpload = Object.assign(window.KNFileUpload || {}, {
  hydrate: hydrateKnFileUploads
});

const KN_FORM_HINT_ERROR_SVG =
  '<svg class="kn-form-hint__glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.4" stroke="currentColor" stroke-width="1.25"/><path d="M6 3.75v2.7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><circle cx="6" cy="8.35" r="0.7" fill="currentColor"/></svg>';
const KN_FORM_HINT_SUCCESS_SVG =
  '<svg class="kn-form-hint__glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.6 6.2 5 8.6 9.4 3.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let knFormIdSeq = 0;

function knFormNextId(slot) {
  knFormIdSeq += 1;
  return `kn-form-${slot}-${knFormIdSeq}`;
}

function knFormIsSkipped(el) {
  return Boolean(
    el.closest?.(
      ".kn-chat-input, .agentic-home__composer, .side-nav-chat-search, .kn-phone, .top-nav"
    )
  );
}

function knFormDescribedBy(el) {
  return (el.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function knFormSetDescribedBy(el, hintId) {
  const ids = knFormDescribedBy(el);
  if (!ids.includes(hintId)) {
    ids.push(hintId);
    el.setAttribute("aria-describedby", ids.join(" "));
  }
}

function knFormEnsureHintIcon(hint) {
  const isError = hint.classList.contains("kn-form-hint--error") || hint.classList.contains("role-form__error");
  const isSuccess = hint.classList.contains("kn-form-hint--success");
  if (!isError && !isSuccess) {
    return;
  }
  if (hint.querySelector(".kn-form-hint__icon")) {
    return;
  }
  const icon = document.createElement("span");
  icon.className = "kn-form-hint__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = isError ? KN_FORM_HINT_ERROR_SVG : KN_FORM_HINT_SUCCESS_SVG;
  hint.insertBefore(icon, hint.firstChild);
}

function knFormUpdateCounter(counter, control) {
  if (!counter || !control) {
    return;
  }
  const maxRaw = control.getAttribute("maxlength") || counter.getAttribute("data-max");
  const max = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max <= 0) {
    return;
  }
  counter.setAttribute("data-max", String(max));
  counter.textContent = `${control.value.length}/${max}`;
}

function knFormBindCounter(field, control) {
  const counter = field.querySelector(".kn-form-counter");
  if (!counter || !control || control.dataset.knFormCounterBound === "true") {
    return;
  }
  knFormUpdateCounter(counter, control);
  control.dataset.knFormCounterBound = "true";
  control.addEventListener("input", () => knFormUpdateCounter(counter, control));
}

function knFormLabelNodes(field) {
  const nodes = [];
  field.querySelectorAll(":scope > .kn-form-label, :scope > .kn-field__label, :scope > label").forEach((el) => {
    nodes.push(el);
  });
  const labelled = field.querySelector(":scope > span[id$='-label']");
  if (labelled && !nodes.includes(labelled)) {
    nodes.push(labelled);
  }
  return nodes;
}

function knFormControl(field) {
  return (
    field.querySelector(":scope > .kn-field__control") ||
    field.querySelector(":scope > input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='file'])") ||
    field.querySelector(":scope > textarea") ||
    field.querySelector(":scope > select")
  );
}

function hydrateKnField(field) {
  if (!field || field.nodeType !== 1 || knFormIsSkipped(field)) {
    return;
  }
  if (field.classList.contains("kn-file-upload") || field.classList.contains("kn-counter-input")) {
    field.querySelectorAll(".kn-form-label, .kn-field__label, .kn-form-hint, .kn-field__hint").forEach((el) => {
      if (el.matches(".kn-form-label, .kn-field__label")) {
        el.classList.add("kn-form-label");
      }
      if (el.matches(".kn-form-hint, .kn-field__hint, .role-form__error")) {
        el.classList.add("kn-form-hint");
        knFormEnsureHintIcon(el);
      }
    });
    return;
  }
  field.classList.add("kn-field");
  field.setAttribute("data-kn-component", "field");
  knFormLabelNodes(field).forEach((label) => {
    label.classList.add("kn-form-label");
    label.querySelectorAll(".role-req, .kn-form-necessity").forEach((mark) => {
      mark.classList.add("kn-form-necessity");
      if (/\(\s*optional\s*\)/i.test(mark.textContent) || mark.classList.contains("kn-form-necessity--optional")) {
        mark.classList.add("kn-form-necessity--optional");
      }
    });
  });
  const control = knFormControl(field);
  const label = knFormLabelNodes(field)[0];
  if (control) {
    control.classList.add("kn-field__control");
    if (!control.id) {
      control.id = knFormNextId("input");
    }
    if (label && label.tagName === "LABEL" && !label.getAttribute("for")) {
      label.setAttribute("for", control.id);
    }
    const invalid =
      field.classList.contains("is-invalid") ||
      field.classList.contains("kn-field--invalid") ||
      control.getAttribute("aria-invalid") === "true";
    if (invalid) {
      field.classList.add("is-invalid");
      control.setAttribute("aria-invalid", "true");
    }
    if (control.disabled) {
      field.classList.add("is-disabled");
    }
    if (control.required) {
      field.setAttribute("data-required", "true");
    }
    knFormBindCounter(field, control);
  }
  field.querySelectorAll(":scope > .kn-form-hint, :scope > .kn-field__hint, :scope > .role-form__error").forEach((hint) => {
    hint.classList.add("kn-form-hint");
    if (hint.classList.contains("role-form__error") || hint.getAttribute("role") === "alert") {
      hint.classList.add("kn-form-hint--error");
    }
    if (!hint.id) {
      const slot = hint.classList.contains("kn-form-hint--error")
        ? "error"
        : hint.classList.contains("kn-form-hint--success")
          ? "success"
          : "help";
      hint.id = knFormNextId(slot);
    }
    knFormEnsureHintIcon(hint);
    if (control) {
      knFormSetDescribedBy(control, hint.id);
    }
  });
}

function hydrateKnFormGroup(root) {
  if (!root || root.nodeType !== 1 || knFormIsSkipped(root)) {
    return;
  }
  root.classList.add("kn-form-group");
  root.setAttribute("data-kn-component", "form-group");
  root.querySelectorAll(".kn-field, .kn-detail-field").forEach((field) => hydrateKnField(field));
}

function hydrateKnForms(scope = document) {
  const root = scope || document;
  const groupSelector = ".kn-form-group, form.user-form, form.role-form";
  const groups =
    root.nodeType === 1 && root.matches?.(groupSelector)
      ? [root]
      : Array.from(root.querySelectorAll(groupSelector));
  groups.forEach((el) => hydrateKnFormGroup(el));
  const fieldSelector = ".kn-field, .kn-detail-field";
  const fields =
    root.nodeType === 1 && root.matches?.(fieldSelector)
      ? [root]
      : Array.from(root.querySelectorAll(fieldSelector));
  const seen = new Set();
  fields.forEach((el) => {
    if (seen.has(el) || knFormIsSkipped(el)) {
      return;
    }
    seen.add(el);
    hydrateKnField(el);
  });
}

window.KNForm = Object.assign(window.KNForm || {}, {
  hydrate: hydrateKnForms
});
window.KNFormGroup = Object.assign(window.KNFormGroup || {}, {
  hydrate: hydrateKnForms
});

function knSearchInputIsWrapper(el) {
  return (
    el.classList.contains("kn-autocomplete") &&
    !el.classList.contains("search-input") &&
    !el.classList.contains("kn-autocomplete__field")
  );
}

function knSearchInputField(el) {
  if (knSearchInputIsWrapper(el)) {
    return el.querySelector(".kn-autocomplete__field, .search-input");
  }
  return el;
}

function knSearchInputEl(host) {
  const field = knSearchInputField(host);
  return (field || host).querySelector(".kn-autocomplete__input, .search-input__field, input[type='search'], input");
}

function hydrateKnSearchInput(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  el.setAttribute("data-kn-component", "search-input");
  const isWrapper = knSearchInputIsWrapper(el);
  const field = knSearchInputField(el);
  const input = knSearchInputEl(el);
  const inside = el.classList.contains("kn-autocomplete--inside") || el.classList.contains("search-input--inside");
  const insideInput =
    el.classList.contains("kn-autocomplete--inside-input") || el.classList.contains("search-input--inside-input");
  const label = isWrapper ? el.querySelector(":scope > .kn-autocomplete__label") : null;
  if ((inside || insideInput) && input && !input.getAttribute("aria-label") && !input.getAttribute("aria-labelledby")) {
    const text = (label?.textContent || el.getAttribute("aria-label") || "").trim();
    if (text) {
      input.setAttribute("aria-label", text);
    }
  }
  if (insideInput && label && field && label.parentElement === el) {
    label.classList.add("kn-autocomplete__label-prefix");
    const prefix = field.querySelector(".kn-autocomplete__prefix, .search-input__icon");
    if (prefix?.nextSibling) {
      field.insertBefore(label, prefix.nextSibling);
    } else {
      field.insertBefore(label, field.firstChild);
    }
  }
  const loadingHost = isWrapper ? el : el.classList.contains("is-loading") ? el : el.closest(".kn-autocomplete");
  if (loadingHost?.classList.contains("is-loading") && field) {
    let spinner = field.querySelector(".kn-autocomplete__spinner, .search-input__spinner");
    if (!spinner) {
      spinner = document.createElement("span");
      spinner.className = "kn-autocomplete__spinner search-input__spinner";
      spinner.innerHTML = typeof knSpinnerHtml === "function" ? knSpinnerHtml() : "";
      const clear = field.querySelector(".kn-autocomplete__clear, .search-input__clear");
      if (clear) {
        field.insertBefore(spinner, clear);
      } else {
        field.appendChild(spinner);
      }
    }
  }
}

function hydrateKnSearchInputs(scope = document) {
  const root = scope || document;
  const wrapperSelector = ".kn-autocomplete:not(.search-input):not(.kn-autocomplete__field)";
  const wrappers =
    root.nodeType === 1 && root.matches?.(wrapperSelector)
      ? [root]
      : Array.from(root.querySelectorAll(wrapperSelector));
  wrappers.forEach((el) => hydrateKnSearchInput(el));
  const fieldSelector = ".search-input, .kn-autocomplete__field";
  const fields =
    root.nodeType === 1 && root.matches?.(fieldSelector)
      ? [root]
      : Array.from(root.querySelectorAll(fieldSelector));
  fields.forEach((el) => {
    if (el.closest(".kn-autocomplete:not(.search-input):not(.kn-autocomplete__field)")) {
      return;
    }
    hydrateKnSearchInput(el);
  });
}

window.KNSearchInput = Object.assign(window.KNSearchInput || {}, {
  hydrate: hydrateKnSearchInputs
});

function hydrateKnPhone(el) {
  if (!el || el.nodeType !== 1) {
    return;
  }
  el.classList.add("kn-phone");
  el.setAttribute("data-kn-component", "phone");
  const select = el.querySelector(":scope > .kn-select");
  if (select) {
    select.classList.add("kn-phone__country");
  }
  const input = el.querySelector("input[type='tel'], .kn-phone__input, #kn-user-phone");
  if (input) {
    input.classList.add("kn-phone__input");
    const field = el.closest(".kn-field");
    if (!input.getAttribute("aria-label") && !input.getAttribute("aria-labelledby")) {
      const lab = field?.querySelector("label[id], .kn-form-label[id], [id$='-label']");
      if (lab?.id) {
        input.setAttribute("aria-labelledby", lab.id);
      } else {
        input.setAttribute("aria-label", "Enter phone number");
      }
    }
    if (input.disabled || field?.classList.contains("is-disabled")) {
      el.classList.add("is-disabled");
      input.disabled = true;
    }
    if (field?.classList.contains("is-invalid") || input.getAttribute("aria-invalid") === "true") {
      el.classList.add("is-invalid");
    }
  }
  let clear = el.querySelector(":scope > .kn-phone__clear");
  if (!clear) {
    clear = document.createElement("button");
    clear.type = "button";
    clear.className = "kn-phone__clear";
    clear.setAttribute("aria-label", "Clear Input Content");
    clear.innerHTML = KN_TAG_CLOSE_SVG;
    el.appendChild(clear);
  }
  if (clear.tagName === "BUTTON" && !clear.getAttribute("type")) {
    clear.setAttribute("type", "button");
  }
  const syncClear = () => {
    clear.hidden = !input || !String(input.value || "").length || el.classList.contains("is-disabled");
  };
  syncClear();
  if (clear.dataset.knPhoneClearBound !== "true") {
    clear.dataset.knPhoneClearBound = "true";
    clear.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!input || el.classList.contains("is-disabled")) {
        return;
      }
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
      syncClear();
    });
    input?.addEventListener("input", syncClear);
  }
}

function hydrateKnPhones(scope = document) {
  const root = scope || document;
  const selector = ".kn-phone";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnPhone(el));
}

window.KNPhone = Object.assign(window.KNPhone || {}, {
  hydrate: hydrateKnPhones
});

function knMotionDurationMs(tokenName, fallbackMs) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || !raw) {
    return fallbackMs;
  }
  if (raw.endsWith("s") && !raw.endsWith("ms")) {
    return n * 1000;
  }
  return n;
}

function hydrateKnChatInput(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const field = root.querySelector("textarea");
  if (field) {
    field.setAttribute("aria-multiline", "true");
  }
}

function hydrateKnChatInputs(scope = document) {
  scope.querySelectorAll('[data-kn-component="chat-input"]').forEach((el) => hydrateKnChatInput(el));
}

window.KNChatInput = Object.assign(window.KNChatInput || {}, {
  hydrate: hydrateKnChatInputs
});

function hydrateKnChatMessage(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  root.setAttribute("data-kn-component", "chat-message");
  const isSelf = root.classList.contains("ai-msg--user") || root.classList.contains("kn-chat-msg--self");
  root.classList.add("kn-chat-msg", isSelf ? "kn-chat-msg--self" : "kn-chat-msg--other");
  if (isSelf) {
    root.classList.add("ai-msg--user");
  } else if (root.classList.contains("ai-msg") || root.classList.contains("ai-msg--assistant") || root.classList.contains("ai-msg--status")) {
    root.classList.add("ai-msg--assistant");
  }
  root.querySelectorAll(".ai-msg__related-chip").forEach((chip) => {
    chip.classList.add("kn-chip", "kn-chip--small");
    hydrateKnChip(chip);
  });
  root.querySelectorAll(".kn-collapsible").forEach((el) => hydrateKnCollapsible(el));
  root.querySelectorAll(".ai-msg__action, .agentic-msg-action").forEach((btn) => {
    btn.classList.add("icon-btn");
  });
}

function hydrateKnChatMessages(scope = document) {
  const roots =
    scope.nodeType === 1 && (scope.matches?.(".kn-chat-msg, article.ai-msg") || scope.classList?.contains("kn-chat-msg"))
      ? [scope]
      : Array.from((scope || document).querySelectorAll(".kn-chat-msg, article.ai-msg"));
  roots.forEach((el) => hydrateKnChatMessage(el));
}

window.KNChatMessage = Object.assign(window.KNChatMessage || {}, {
  hydrate: hydrateKnChatMessages
});

function activateL2Trigger(trigger, { firstRender = false } = {}) {
  const activeTrigger = trigger || getActiveL2Trigger();
  if (!activeTrigger) {
    return;
  }
  const title = getNavTitle(activeTrigger);
  const level = getL2Level(activeTrigger);
  const firstChild = firstNavigableInLevel(level);
  clearCurrent();
  setCurrent(activeTrigger);
  if (firstChild) {
    setCurrent(firstChild);
    if (firstChild.matches("[data-tree-trigger]")) {
      accordionTreeTriggers(firstChild);
      setTreeExpanded(firstChild, true);
    } else {
      expandTreeAncestors(firstChild);
    }
    const href = firstChild.getAttribute("href");
    if (href?.startsWith("#") && !firstRender) {
      setRouteHash(href);
    }
  }
  onLinkActiveChange({
    level: 1,
    isActive: true,
    isL2Trigger: true,
    isFirstRender: firstRender,
    title,
    trigger: activeTrigger
  });
  renderBreadcrumb();
}

function activateNavLinkOnFirstLoad(link) {
  if (!link) {
    return;
  }

  const l2Trigger = resolveL2TriggerForLink(link);

  if (link.dataset.l2trigger === "true") {
    const activeTrigger = link;
    const level = getL2Level(activeTrigger);
    const path = getHashPath();
    const hashTarget =
      sideNav.querySelector(`.side-nav-link[data-level="3"][href="${path}"]`) ||
      sideNav.querySelector(`.side-nav-link[data-level="2"][href="${path}"]`);
    const target = hashTarget || firstNavigableInLevel(level);

    clearCurrent();
    setCurrent(activeTrigger);
    if (target && target !== activeTrigger) {
      setCurrent(target);
      if (target.matches("[data-tree-trigger]")) {
        accordionTreeTriggers(target);
        setTreeExpanded(target, true);
      } else {
        expandTreeAncestors(target);
      }
    }
  } else {
    clearCurrent();
    setCurrent(link);
    const level = Number(link.dataset.level || "1");
    if (level === 3) {
      expandTreeAncestors(link);
    }
  }

  /* Never expand L1 on first paint for L2-panel routes — that undoes the
     collapsed chrome and re-inlines portaled L2 (e.g. Klear Agent history). */
  if (l2Trigger) {
    onLinkActiveChange({
      level: 1,
      isActive: true,
      isL2Trigger: true,
      isFirstRender: true,
      title: getNavTitle(l2Trigger),
      trigger: l2Trigger,
    });
  } else {
    expandL1();
  }
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

let lastNavDesktop = isMediumOrHdDesktop();
const breakpointObserver = new MutationObserver(() => {
  const desktop = isMediumOrHdDesktop();
  if (desktop === lastNavDesktop) {
    return;
  }
  lastNavDesktop = desktop;
  if (desktop) {
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

function activateWithinL2Panel(link) {
  const levelEl = link.closest(".side-nav-level[data-level='2']");
  const trigger = getL2TriggerForLevel(levelEl) || getActiveL2Trigger();
  if (!trigger) {
    return;
  }
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
      trigger,
    });
  }
}

sideNav.addEventListener("click", (event) => {
  const chatNew = event.target.closest("[data-agentic-chat-new]");
  if (chatNew && sideNav.contains(chatNew)) {
    event.preventDefault();
    sideNav.querySelectorAll(".side-nav-chat-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });
    if (getHashPath() !== "#agentic-broker") {
      setRouteHash("#agentic-broker");
    }
    window.KNAgenticBroker?.newChat?.();
    return;
  }
  const chatClear = event.target.closest("[data-agentic-chat-clear]");
  if (chatClear && sideNav.contains(chatClear)) {
    event.preventDefault();
    const input = sideNav.querySelector("[data-agentic-chat-search]");
    if (input) {
      input.value = "";
      filterChatList("");
      input.focus();
    }
    return;
  }
  const chatItem = event.target.closest("[data-agentic-chat-item]");
  if (chatItem && sideNav.contains(chatItem)) {
    event.preventDefault();
    sideNav.querySelectorAll(".side-nav-chat-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });
    chatItem.classList.add("is-active");
    chatItem.setAttribute("aria-current", "true");
    const chatId = chatItem.closest("[data-chat-id]")?.getAttribute("data-chat-id") || "";
    window.KNAgenticBroker?.openHistoryChat?.(chatId);
    return;
  }
  const treeTrigger = event.target.closest("[data-tree-trigger]");
  if (treeTrigger && sideNav.contains(treeTrigger)) {
    event.preventDefault();
    const willExpand = treeTrigger.getAttribute("aria-expanded") !== "true";
    if (willExpand) {
      accordionTreeTriggers(treeTrigger);
    }
    setTreeExpanded(treeTrigger, willExpand);
    if (!willExpand) {
      return;
    }
    const group = getTreeGroup(treeTrigger)?.querySelector(".side-nav-tree__group") || getTreeGroup(treeTrigger);
    const firstLeaf = group?.querySelector('a.side-nav-link[data-level="3"]');
    const target = firstLeaf || (treeTrigger.matches("a[href^='#']") ? treeTrigger : null);
    if (!target) {
      return;
    }
    const href = target.getAttribute("href");
    if (href?.startsWith("#") && !window.KNAdminUX?.tryNavigate(href)) {
      return;
    }
    if (href?.startsWith("#")) {
      setRouteHash(href);
    }
    clearCurrent();
    setCurrent(target);
    if (firstLeaf) {
      expandTreeAncestors(firstLeaf);
    }
    activateWithinL2Panel(treeTrigger);
    if (!isMediumOrHdDesktop() && firstLeaf) {
      setNavOpen(false);
    }
    renderBreadcrumb();
    return;
  }

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
    if (link.matches(".side-nav-link--agentic-broker")) {
      window.KNAgenticBroker?.newChat?.();
    }
    return;
  }

  clearCurrent();
  setCurrent(link);

  if (level === 3) {
    expandTreeAncestors(link);
    activateWithinL2Panel(link);
    if (!isMediumOrHdDesktop()) {
      setNavOpen(false);
    }
    renderBreadcrumb();
    return;
  }

  if (level === 2) {
    activateWithinL2Panel(link);
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

function filterChatList(rawQuery) {
  const query = rawQuery.trim();
  const matchIds = window.KNShellSearchIndex?.chatIdsMatching?.(query);
  const groups = sideNav.querySelectorAll("[data-chat-group]");
  let visibleTotal = 0;
  groups.forEach((group) => {
    let visibleInGroup = 0;
    group.querySelectorAll(".side-nav-chat-row").forEach((row) => {
      const chatId = row.getAttribute("data-chat-id") || "";
      const label = row.querySelector(".side-nav-chat-item")?.textContent || "";
      const matches = matchIds ? matchIds.has(chatId) : !query || label.toLowerCase().includes(query.toLowerCase());
      row.hidden = !matches;
      if (matches) {
        visibleInGroup += 1;
      }
    });
    group.hidden = visibleInGroup === 0;
    visibleTotal += visibleInGroup;
  });
  const empty = sideNav.querySelector("[data-chat-empty]");
  if (empty) {
    empty.hidden = visibleTotal !== 0;
  }
  const clearBtn = sideNav.querySelector("[data-agentic-chat-clear]");
  if (clearBtn) {
    clearBtn.hidden = query.length === 0;
  }
}

window.KNAgenticNav = Object.assign(window.KNAgenticNav || {}, {
  refilterChatHistory() {
    filterChatList(sideNav.querySelector("[data-agentic-chat-search]")?.value || "");
  }
});

sideNav.addEventListener("input", (event) => {
  const search = event.target.closest("[data-agentic-chat-search]");
  if (!search) {
    return;
  }
  filterChatList(search.value);
});

sideNav.addEventListener("keydown", (event) => {
  const treeTrigger = event.target.closest("[data-tree-trigger]");
  if (!treeTrigger || !sideNav.contains(treeTrigger)) {
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    treeTrigger.click();
    return;
  }
  if (event.key === "ArrowRight") {
    if (treeTrigger.getAttribute("aria-expanded") !== "true") {
      event.preventDefault();
      accordionTreeTriggers(treeTrigger);
      setTreeExpanded(treeTrigger, true);
    }
    return;
  }
  if (event.key === "ArrowLeft") {
    if (treeTrigger.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      setTreeExpanded(treeTrigger, false);
    }
  }
});

sideNav.addEventListener("transitionend", onTreeAnimatorTransitionEnd);

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

function hydrateCollapsedSideNavTooltips() {
  if (!sideNav) {
    return;
  }
  sideNav.querySelectorAll('.side-nav-l1 .side-nav-link[data-level="1"]').forEach((link) => {
    if (link.hasAttribute("data-tooltip")) {
      return;
    }
    const title = getNavTitle(link);
    if (!title) {
      return;
    }
    link.setAttribute("data-tooltip", title);
    link.setAttribute("data-tooltip-placement", "right");
    link.setAttribute("data-tooltip-when", "sidenav-collapsed");
  });
}

syncL1Classes();
enhanceTreeGroups();
hydrateCollapsedSideNavTooltips();
window.setRouteHash = setRouteHash;
window.KNPersona?.bootstrap?.();

// HTML default aria-current is Agentic Broker (the landing page). Every hash —
// including #dashboard — must mark the matching nav item before renderBreadcrumb()
// runs. Skipping #dashboard left Agentic Broker selected while the dashboard
// page was showing (first-paint CSS unhides .dashboard-inner from data-kn-route).
{
  const path = getHashPath();
  const rawHashPath = (location.hash || "").split("?")[0];
  const pathnameRoute = hashFromPathname();
  const shouldCanonicalize =
    Boolean(pathnameRoute && (!rawHashPath || rawHashPath === "#")) ||
    Boolean(rawHashPath && normalizeHashPath(rawHashPath) !== path);
  if (shouldCanonicalize) {
    history.replaceState(null, "", `${withHashQuery(path)}${location.search || ""}`);
    window.dispatchEvent(new CustomEvent("kn-route-change", { detail: { hash: path } }));
  }
  const { navHash, link } = findNavLinkForHash(path);
  if (link) {
    activateNavLinkOnFirstLoad(link);
  } else {
    expandL1();
    renderBreadcrumb();
  }
  if (navHash !== path) {
    history.replaceState(null, "", withHashQuery(path));
    adminModuleApi(navHash)?.sync?.();
  }
}

window.addEventListener("hashchange", (event) => {
  window.clearKnToasts?.();
  if (!window.KNAdminUX?.consumeNavigation()) {
    const oldHash = event.oldURL ? getHashPath(new URL(event.oldURL).hash) : getHashPath();
    const newHash = event.newURL ? getHashPath(new URL(event.newURL).hash) : getHashPath();
    const oldApi = window.KNAdminUX.adminApiForHash(oldHash);
    if (oldApi?.isDirty?.()) {
      const oldFullHash = event.oldURL ? new URL(event.oldURL).hash : location.hash;
      history.replaceState(null, "", withHashQuery(oldHash, oldFullHash));
      oldApi.requestLeave(newHash);
      oldApi.sync?.();
      return;
    }
  }
  const { path, navHash, link } = findNavLinkForHash();
  const newFullHash = event.newURL ? new URL(event.newURL).hash : location.hash;
  const api = adminModuleApi(navHash);
  if (api) {
    const adminLink = sideNav.querySelector(`.side-nav-link[data-level="2"][href="${navHash}"]`) || link;
    if (adminLink && adminLink.getAttribute("aria-current") !== "page") {
      window.KNAdminUX?.beginNavigation();
      adminLink.click();
      if (path !== navHash) {
        history.replaceState(null, "", withHashQuery(path, newFullHash));
      }
    } else {
      api.sync?.();
    }
  } else if (link && link.getAttribute("aria-current") !== "page") {
    window.KNAdminUX?.beginNavigation();
    if (link.dataset.level === "3") {
      expandTreeAncestors(link);
    }
    link.click();
  }
  renderBreadcrumb();
});

const profileMenu = document.getElementById("profile-menu");
const profileTriggers = document.querySelectorAll(".avatar-trigger");

function setProfileMenuOpen(isOpen) {
  if (!profileMenu) {
    return;
  }
  profileMenu.hidden = !isOpen;
  profileTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
  });
  if (isOpen) {
    const items = knMenuEnabledItems(profileMenu);
    items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
      item.classList.toggle("is-active", index === 0);
    });
    window.requestAnimationFrame(() => items[0]?.focus());
    return;
  }
  profileMenu.querySelectorAll(".is-active").forEach((el) => {
    el.classList.remove("is-active");
  });
  const trigger = document.querySelector(".avatar-trigger");
  if (trigger && profileMenu.contains(document.activeElement)) {
    trigger.focus();
  }
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

/* ⌘K command palette — shell-command-palette.js (shared KNShellSearchIndex). */

document.addEventListener("click", (event) => {
  if (!profileMenu.hidden) {
    if (!profileMenu.contains(event.target) && !event.target.closest(".avatar-trigger")) {
      setProfileMenuOpen(false);
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileMenu.hidden) {
    const paletteOpen = document.getElementById("quick-actions-menu") && !document.getElementById("quick-actions-menu").hidden;
    if (paletteOpen) {
      return;
    }
    setProfileMenuOpen(false);
    document.querySelector(".avatar-trigger")?.focus();
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
        `<span class="badge type-caption-sm type-weight-medium kn-badge">${item.label} ${item.value}</span>`
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
    details.className = "kn-accordion kn-accordion--filled kn-accordion--large kn-accordion__item kh-accordion panel card";
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
      <summary class="kn-accordion__header kh-accordion__header">
        <span class="kn-accordion__lead">
          <span class="kn-accordion__leading kh-accordion__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${KH_ICONS[mode.icon]}</svg>
          </span>
          <span class="kn-accordion__title kh-accordion__title type-heading-h5 type-weight-semibold">${mode.title}</span>
        </span>
        <span class="kn-accordion__trailing kh-accordion__meta">${meta}</span>
        <svg class="kn-accordion__chevron kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div class="kn-accordion__body kh-accordion__body">
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

function isGroupedAccordionItem(item) {
  if (!(item instanceof HTMLElement)) {
    return false;
  }
  if (!item.classList.contains("kn-accordion__item")) {
    return false;
  }
  if (item.classList.contains("kn-accordion")) {
    return false;
  }
  const parent = item.parentElement;
  return Boolean(parent && parent.classList.contains("kn-accordion"));
}

function bindKnAccordion(root) {
  const scope = root || document;
  scope.addEventListener(
    "toggle",
    (event) => {
      const item = event.target;
      if (!(item instanceof HTMLDetailsElement) || !item.open) {
        return;
      }
      if (!isGroupedAccordionItem(item)) {
        return;
      }
      const group = item.parentElement;
      if (!group) {
        return;
      }
      group.querySelectorAll(":scope > .kn-accordion__item[open]").forEach((other) => {
        if (other !== item && other instanceof HTMLDetailsElement) {
          other.open = false;
        }
      });
    },
    true
  );

  scope.addEventListener(
    "click",
    (event) => {
      const header = event.target.closest(".kn-accordion__header");
      const item = header && header.closest(".kn-accordion__item, details.kn-accordion");
      if (item && item.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      if (header && header.hasAttribute("disabled")) {
        event.preventDefault();
        return;
      }
      const trailingControl = event.target.closest(
        ".kn-accordion__trailing a, .kn-accordion__trailing button, .kn-accordion__trailing input, .kn-accordion__trailing select"
      );
      if (trailingControl && trailingControl.closest(".kn-accordion__header")) {
        event.stopPropagation();
      }
    },
    true
  );
}

bindKnAccordion(document);

document.addEventListener(
  "click",
  (event) => {
    const item = event.target.closest(".kn-action-list__item, .action-list-item");
    if (item && item.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true
);

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

function dismissKnAlert(alert) {
  if (!alert || alert.hidden || alert.classList.contains("is-dismissing")) {
    return;
  }
  const finish = () => {
    alert.hidden = true;
    alert.classList.remove("is-dismissing");
  };
  const raw = getComputedStyle(alert).getPropertyValue("--kn-motion-duration-2xquick").trim();
  const ms = raw.endsWith("s") && !raw.endsWith("ms") ? parseFloat(raw) * 1000 : parseFloat(raw);
  if (!ms) {
    finish();
    return;
  }
  alert.classList.add("is-dismissing");
  const onEnd = (event) => {
    if (event.target !== alert || event.propertyName !== "opacity") {
      return;
    }
    alert.removeEventListener("transitionend", onEnd);
    finish();
  };
  alert.addEventListener("transitionend", onEnd);
  window.setTimeout(finish, ms);
}

document.addEventListener("click", (event) => {
  const alertDismiss = event.target.closest(".kn-alert__dismiss");
  if (alertDismiss) {
    event.preventDefault();
    dismissKnAlert(alertDismiss.closest(".kn-alert"));
    return;
  }
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
  sideNav.querySelector('.side-nav-link[data-level="3"][href="#klearhub-visibility"]')?.click();
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
    empty.className = "empty-state map-empty kn-empty";
    empty.hidden = true;
    empty.innerHTML = `
      <div class="empty-state__asset kn-empty__asset" aria-hidden="true">${SHIP_ICON}</div>
      <div class="kn-empty__copy">
      <h3 class="kn-empty__title type-heading-h5 type-weight-semibold">No shipments in this view</h3>
      <p class="kn-empty__desc type-body-sm">Nothing matches this snapshot. Show all shipments on the map, or pick another KPI.</p>
      </div>
      <div class="kn-empty__actions">
      <button class="btn btn--secondary btn--sm type-ui-sm kn-btn" type="button" data-map-filter-clear>Show all shipments</button>
      </div>
    `;
    stage.appendChild(empty);
    window.KNEmpty?.hydrate(empty);
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
  sideNav.querySelector('.side-nav-link[data-level="3"][href="#klearhub-visibility"]')?.click();
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
  const skeleton = document.getElementById("dash-skeleton");
  const live = document.getElementById("dash-live");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onDashboard = typeof isDashboardRoute === "function" ? isDashboardRoute() : true;
  const reloading = window.KNPageReload?.isReload?.() && onDashboard;

  if (!root || !onDashboard) {
    revealDashboard();
    return;
  }

  if (reloading && !reduceMotion) {
    root.dataset.loading = "true";
    root.setAttribute("aria-busy", "true");
    root.classList.remove("is-ready");
    if (skeleton) {
      skeleton.hidden = false;
    }
    if (live) {
      live.hidden = true;
    }
    const delay = window.KNPageReload?.loadingMs?.() ?? 1400;
    window.setTimeout(revealDashboard, delay);
    window.setTimeout(revealDashboard, 4000);
    return;
  }

  if (reduceMotion) {
    revealDashboard();
    return;
  }

  window.setTimeout(revealDashboard, 1400);
  // Failsafe: never leave the dashboard shimmer on screen if the first timer is skipped.
  window.setTimeout(revealDashboard, 4000);
}

function knThemeDelayMs(step) {
  const value = window.knTheme?.motion?.delay?.[step];
  return typeof value === "number" ? value : 0;
}

function knThemeDurationMs(step) {
  const value = window.knTheme?.motion?.duration?.[step];
  return typeof value === "number" ? value : 0;
}

function knThemeSpacePx(step) {
  const value = window.knTheme?.spacing?.[step];
  return typeof value === "number" ? value : 0;
}

function initKnTooltips() {
  if (document.getElementById("kn-tooltip")) {
    return;
  }

  const tip = document.createElement("div");
  tip.className = "kn-tooltip type-caption-sm";
  tip.id = "kn-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);

  let active = null;
  let pending = null;
  let showTimer = 0;
  let hideTimer = 0;
  const showDelay = knThemeDelayMs("xquick");
  const hideDelay = knThemeDelayMs("2xquick");
  const edge = knThemeSpacePx(3);

  const hide = () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    active = null;
    pending = null;
    tip.hidden = true;
    tip.textContent = "";
    tip.removeAttribute("data-placement");
  };

  const isSideNavCollapsedTooltipAllowed = (el) => {
    if (el?.getAttribute("data-tooltip-when") !== "sidenav-collapsed") {
      return true;
    }
    return Boolean(
      sideNav?.classList.contains("is-l1-collapsed") &&
        !sideNav.classList.contains("is-l1-hovered") &&
        isMediumOrHdDesktop()
    );
  };

  const place = (el) => {
    const rect = el.getBoundingClientRect();
    const gap = edge;
    const tipRect = tip.getBoundingClientRect();
    const placement = el.getAttribute("data-tooltip-placement") || "top";
    let top = rect.top - tipRect.height - gap;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (placement === "right" || placement === "left") {
      top = rect.top + (rect.height - tipRect.height) / 2;
      if (placement === "right") {
        left = rect.right + gap;
        if (left + tipRect.width > window.innerWidth - edge) {
          left = rect.left - tipRect.width - gap;
          tip.setAttribute("data-placement", "left");
        } else {
          tip.setAttribute("data-placement", "right");
        }
      } else {
        left = rect.left - tipRect.width - gap;
        if (left < edge) {
          left = rect.right + gap;
          tip.setAttribute("data-placement", "right");
        } else {
          tip.setAttribute("data-placement", "left");
        }
      }
      top = Math.min(Math.max(edge, top), window.innerHeight - tipRect.height - edge);
      left = Math.min(Math.max(edge, left), window.innerWidth - tipRect.width - edge);
      tip.style.top = `${Math.round(top)}px`;
      tip.style.left = `${Math.round(left)}px`;
      return;
    }

    if (placement === "bottom" || top < edge) {
      top = rect.bottom + gap;
      tip.setAttribute("data-placement", "bottom");
    } else {
      tip.setAttribute("data-placement", "top");
    }

    left = Math.min(Math.max(edge, left), window.innerWidth - tipRect.width - edge);
    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
  };

  const show = (el) => {
    const content = el.getAttribute("data-tooltip");
    const title = el.getAttribute("data-tooltip-title");
    if (!content || el.closest(".dash-skeleton") || el === pending) {
      return;
    }
    if (!isSideNavCollapsedTooltipAllowed(el)) {
      return;
    }
    pending = el;
    window.clearTimeout(hideTimer);
    showTimer = window.setTimeout(() => {
      if (!isSideNavCollapsedTooltipAllowed(el)) {
        pending = null;
        return;
      }
      active = el;
      tip.innerHTML = title
        ? `<strong class="kn-tooltip__title">${title}</strong><span>${content}</span>`
        : content;
      tip.hidden = false;
      requestAnimationFrame(() => place(el));
    }, showDelay);
  };

  // Capture phase: #side-nav-l2 has its own mouseover/mouseout listeners
  // that call stopPropagation() (to isolate the L1/L2 hover-expand logic),
  // which would otherwise silently swallow these events for every
  // data-tooltip element inside it — e.g. the Agentic Broker chat rows —
  // before they ever reach a bubble-phase listener on document.
  document.addEventListener(
    "mouseover",
    (event) => {
      const el = event.target.closest("[data-tooltip]");
      if (!el || el === active) {
        return;
      }
      show(el);
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const el = event.target.closest("[data-tooltip]");
      if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
        return;
      }
      window.clearTimeout(showTimer);
      hideTimer = window.setTimeout(hide, hideDelay);
    },
    true
  );

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

  window.KNTooltips = {
    syncSideNavCollapsed() {
      const trigger = active || pending;
      if (trigger && !isSideNavCollapsedTooltipAllowed(trigger)) {
        hide();
      }
    }
  };
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
    showKnToast({
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

let knToastTimer = 0;
const KN_TOAST_DURATION_MS = 2800;

function clearKnToasts({ animate = false } = {}) {
  window.clearTimeout(knToastTimer);
  knToastTimer = 0;
  const container = document.getElementById("kn-toast-container");
  if (!container) {
    return;
  }
  container.querySelectorAll(".kn-toast").forEach((el) => {
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
    resetKnToastContainer(container);
  }
}

function resetKnToastContainer(container) {
  container.classList.remove("kn-toast-container--anchored");
  container.style.left = "";
  container.style.top = "";
  container.style.right = "";
  container.style.bottom = "";
}

function positionAnchoredKnToast(container, toast, anchor) {
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
  container.classList.add("kn-toast-container--anchored");
  container.style.left = `${Math.round(left)}px`;
  container.style.top = `${Math.round(top)}px`;
  container.style.right = "auto";
  container.style.bottom = "auto";
}

function showKnToast({
  content,
  color = "positive",
  type = "informational",
  duration,
  action = null,
  anchor = null
} = {}) {
  const container = document.getElementById("kn-toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "kn-toast-container";
    el.id = "kn-toast-container";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  })();

  clearKnToasts();
  resetKnToastContainer(container);

  const toastType = type === "promotional" ? "promotional" : "informational";
  const toastColor = ["positive", "information", "notice", "negative", "neutral"].includes(color)
    ? color
    : "positive";
  const resolvedDuration =
    duration == null
      ? toastType === "promotional"
        ? 8000
        : KN_TOAST_DURATION_MS
      : duration;

  const toast = document.createElement("div");
  toast.className = `kn-toast kn-toast--${toastColor} kn-toast--${toastType}`;
  toast.setAttribute("role", "status");
  const actionHtml =
    action && action.text
      ? `<button class="kn-toast__action" type="button">${action.text}</button>`
      : "";
  toast.innerHTML = `
    <span class="kn-toast__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 10.5 15 16 9.5" />
      </svg>
    </span>
    <p class="kn-toast__content type-ui-sm">${content}</p>
    ${actionHtml}
    <button class="icon-btn" type="button" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  `;

  const remove = () => {
    window.clearTimeout(knToastTimer);
    knToastTimer = 0;
    if (toast.classList.contains("is-leaving")) {
      return;
    }
    toast.classList.add("is-leaving");
    window.setTimeout(() => {
      toast.remove();
      if (!container.querySelector(".kn-toast")) {
        resetKnToastContainer(container);
      }
    }, 220);
  };

  toast.querySelector(".kn-toast__action")?.addEventListener("click", (event) => {
    if (typeof action?.onClick === "function") {
      action.onClick({ event, toast });
    }
    remove();
  });
  toast.querySelector('[aria-label="Dismiss"]')?.addEventListener("click", remove);
  container.appendChild(toast);
  if (anchor instanceof HTMLElement) {
    positionAnchoredKnToast(container, toast, anchor);
  }
  knToastTimer = window.setTimeout(remove, Math.max(1200, Number(resolvedDuration) || KN_TOAST_DURATION_MS));
}

window.clearKnToasts = clearKnToasts;
window.showKnToast = showKnToast;

let setDashDatePickerOpen = () => {};

function initDashDatePicker() {
  const trigger = document.getElementById("dash-date-trigger");
  const root = trigger?.closest(".kn-date-picker");
  if (!root) {
    return;
  }
  const api = hydrateKnDatePicker(root);
  if (!api) {
    return;
  }
  setDashDatePickerOpen = api.setOpen;
  root.addEventListener("kn-date-apply", (event) => {
    const { start, end, label, persist } = event.detail || {};
    if (!start || !end) {
      return;
    }
    applyDashSummary((window.KNShipments || []).filter((item) => knShipmentInRange(item, start, end)));
    if (persist) {
      showKnToast({ content: `Showing ${label}`, color: "information", anchor: trigger });
    }
  });
  const now = knDateStartOfDay(new Date());
  api.applyRange(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0), {
    persist: false
  });
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
    window.clearKnToasts?.();
    const delay = knDrawerCloseMs();
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
    const navLink = sideNav.querySelector('.side-nav-link[data-level="3"][href="#klearhub-visibility"]');
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
  const scroller = root.querySelector(".kn-drawer__body");
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
            <label class="kn-switch">
              <input type="checkbox" role="switch" ${visible ? "checked" : ""} aria-label="Show ${meta.title}" />
              <span class="kn-switch__ui"></span>
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
    window.clearKnToasts?.();
    const delay = knDrawerCloseMs();
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
      showKnToast({
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
    if (event.button || event.target.closest("[data-move], .kn-switch, a, input")) {
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

function knBadgeClass(tone, extra = {}) {
  const color = extra.color || tone || "neutral";
  const emphasis = extra.emphasis || (extra.intense ? "intense" : "subtle");
  const size = extra.size || "medium";
  const classes = [
    "kn-badge",
    `kn-badge--${color}`,
    `kn-badge--${emphasis}`,
    `kn-badge--${size}`,
    "badge",
    `badge--${color}`
  ];
  if (emphasis === "intense") {
    classes.push("badge--intense");
  }
  return classes.join(" ");
}

const KN_BADGE_COLORS = ["positive", "negative", "notice", "information", "neutral", "primary"];
const KN_BADGE_SIZES = ["xsmall", "small", "medium", "large"];

function knBadgeSkipHydrate(el) {
  return (
    el.classList.contains("kn-tag") ||
    el.classList.contains("kn-select__chip") ||
    el.classList.contains("vis-chip") ||
    el.classList.contains("skeleton") ||
    el.classList.contains("skeleton--badge") ||
    el.classList.contains("map-pill")
  );
}

function knBadgeHasColor(el) {
  return KN_BADGE_COLORS.some(
    (color) => el.classList.contains(`kn-badge--${color}`) || el.classList.contains(`badge--${color}`)
  );
}

function knBadgeHasSize(el) {
  return KN_BADGE_SIZES.some(
    (size) => el.classList.contains(`kn-badge--${size}`) || el.classList.contains(`badge--${size}`)
  );
}

function knBadgeWrapLabel(el) {
  if (el.querySelector(":scope > .kn-badge__label")) {
    return;
  }
  const keep = [];
  const move = [];
  [...el.childNodes].forEach((node) => {
    if (node.nodeType === 1) {
      const cls = node.classList;
      if (
        cls.contains("kn-badge__icon") ||
        cls.contains("kn-badge__label") ||
        cls.contains("kn-select__chip-remove") ||
        cls.contains("kn-select__chip-label") ||
        node.tagName === "BUTTON"
      ) {
        keep.push(node);
        return;
      }
      if (node.tagName === "SVG") {
        keep.push(node);
        return;
      }
    }
    if (node.nodeType === 3 && !node.textContent.trim()) {
      return;
    }
    move.push(node);
  });
  if (!move.length) {
    return;
  }
  const label = document.createElement("span");
  label.className = "kn-badge__label";
  move.forEach((node) => label.appendChild(node));
  const text = label.textContent.trim();
  if (!text) {
    return;
  }
  el.appendChild(label);
}

function hydrateKnBadges(root = document) {
  root.querySelectorAll(".kn-badge, .badge, .pill").forEach((el) => {
    if (knBadgeSkipHydrate(el)) {
      return;
    }
    el.classList.add("kn-badge");
    KN_BADGE_COLORS.forEach((color) => {
      if (el.classList.contains(`badge--${color}`)) {
        el.classList.add(`kn-badge--${color}`);
      }
    });
    if (el.classList.contains("badge--intense")) {
      el.classList.add("kn-badge--intense");
    }
    if (el.classList.contains("badge--subtle")) {
      el.classList.add("kn-badge--subtle");
    }
    if (!knBadgeHasSize(el)) {
      el.classList.add("kn-badge--medium");
    }
    if (!el.classList.contains("kn-badge--intense") && !el.classList.contains("kn-badge--subtle")) {
      el.classList.add("kn-badge--subtle");
    }
    if (!knBadgeHasColor(el) && !el.classList.contains("badge--ai")) {
      el.classList.add("kn-badge--neutral");
    }
    knBadgeWrapLabel(el);
    const label = el.querySelector(".kn-badge__label") || el;
    const text = label.textContent.trim();
    if (text && !el.getAttribute("title") && label.scrollWidth > label.clientWidth) {
      el.setAttribute("title", text);
    }
  });
}

window.KNBadge = Object.assign(window.KNBadge || {}, {
  className: knBadgeClass,
  hydrate: hydrateKnBadges
});

function setKnText(key, value) {
  document.querySelectorAll(`[data-kn="${key}"]`).forEach((node) => {
    node.textContent = value;
    if (node.classList.contains("kn-counter") || node.classList.contains("counter")) {
      hydrateKnCounter(node);
    }
  });
}

function parseKnAmountText(formatted) {
  const text = String(formatted ?? "");
  const match = text.match(/^([^0-9]*)(-?)([\d,]+)(\.\d+)?(.*)$/);
  if (!match) {
    return { sign: "", currency: "", integer: text, decimal: "", compact: "", prefix: true, label: text, code: "USD" };
  }
  const leading = match[1];
  const trailing = match[5] || "";
  const prefix = Boolean(leading.trim());
  return {
    sign: match[2] || (leading.includes("−") || leading.includes("-") ? "−" : ""),
    currency: prefix ? leading.replace(/[-−]/g, "").trim() : trailing.trim(),
    integer: match[3],
    decimal: match[4] || "",
    compact: prefix ? trailing.trim() : "",
    prefix,
    label: text,
    code: "USD"
  };
}

function setKnAmount(key, formatted) {
  const parts =
    formatted && typeof formatted === "object" && "integer" in formatted
      ? formatted
      : parseKnAmountText(formatted);
  document.querySelectorAll(`[data-kn="${key}"]`).forEach((node) => {
    const integer = node.querySelector(".kn-amount__integer");
    if (!integer) {
      node.textContent = parts.label;
      return;
    }
    const sign = node.querySelector(".kn-amount__sign");
    const currency = node.querySelector(".kn-amount__currency");
    const decimal = node.querySelector(".kn-amount__decimal");
    const compact = node.querySelector(".kn-amount__compact");
    if (sign) {
      sign.textContent = parts.sign || "";
    }
    if (currency) {
      currency.textContent = parts.currency || "";
    }
    integer.textContent = parts.integer;
    if (decimal) {
      decimal.textContent = parts.decimal || "";
    }
    if (compact) {
      compact.textContent = parts.compact || "";
    }
    node.classList.toggle("kn-amount--currency-end", parts.prefix === false);
    if (parts.label && parts.code) {
      node.setAttribute("aria-label", `Total value in ${parts.code}: ${parts.label}`);
    }
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

function knClosestScrollPort(el) {
  let node = el.parentElement;
  while (node && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function knAvatarInitials(name) {
  const names = String(name || "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!names.length) {
    return "";
  }
  if (names.length === 1) {
    return names[0].slice(0, 2);
  }
  return (names[0][0] || "") + (names[names.length - 1][0] || "");
}

function knAvatarSizeToken(el) {
  return ["xsmall", "small", "medium", "large", "xlarge"].find(
    (size) =>
      el.classList.contains(`kn-avatar--${size}`) ||
      el.classList.contains(`avatar--${size}`) ||
      el.classList.contains(`kn-avatar-group--${size}`)
  );
}

function hydrateKnAvatars(root = document) {
  root.querySelectorAll(".kn-avatar img, .avatar img").forEach((img) => {
    if (img.hasAttribute("alt")) {
      return;
    }
    const name = img.closest("[data-kn-name]")?.getAttribute("data-kn-name");
    if (name) {
      img.setAttribute("alt", name);
    }
  });

  root.querySelectorAll(".kn-avatar[data-kn-name], .avatar[data-kn-name]").forEach((el) => {
    if (el.querySelector("img") || el.querySelector(".kn-avatar__icon")) {
      return;
    }
    if (el.textContent.trim()) {
      return;
    }
    const letters = knAvatarInitials(el.getAttribute("data-kn-name"));
    if (letters) {
      el.textContent = letters;
    }
  });

  root.querySelectorAll(".kn-avatar-group[data-kn-max-count]").forEach((group) => {
    if (group.dataset.knHydrated === "1") {
      return;
    }
    const max = Number.parseInt(group.getAttribute("data-kn-max-count"), 10);
    if (!Number.isFinite(max) || max < 0) {
      return;
    }
    const items = [...group.querySelectorAll(":scope > .kn-avatar, :scope > .avatar")];
    const extra = items.length - max;
    if (extra <= 0) {
      return;
    }
    items.forEach((item, index) => {
      if (index >= max) {
        item.hidden = true;
      }
    });
    const overflow = document.createElement("span");
    overflow.className = "kn-avatar avatar kn-avatar--overflow";
    overflow.setAttribute("aria-label", `${extra} more`);
    overflow.textContent = `+${extra}`;
    const size = knAvatarSizeToken(group) || knAvatarSizeToken(items[0] || group);
    if (size) {
      overflow.classList.add(`kn-avatar--${size}`, `avatar--${size}`);
    }
    group.appendChild(overflow);
    group.dataset.knHydrated = "1";
  });

  root.querySelectorAll(".kn-avatar-group").forEach((group) => {
    if (!group.getAttribute("role")) {
      group.setAttribute("role", "group");
    }
  });
}

window.KNAvatar = Object.assign(window.KNAvatar || {}, {
  initials: window.KNAvatar?.initials || knAvatarInitials,
  hydrate: hydrateKnAvatars
});

function hydrateKnAppBars() {
  document.querySelectorAll(".kn-appbar").forEach((bar) => {
    if (bar.dataset.knAppbarReady === "1") {
      return;
    }
    bar.dataset.knAppbarReady = "1";
    if (bar.classList.contains("kn-appbar--static")) {
      return;
    }
    const port = knClosestScrollPort(bar);
    const sync = () => {
      const top = port === window ? window.scrollY : port.scrollTop;
      bar.classList.toggle("is-scrolled", top > 0);
    };
    sync();
    port.addEventListener("scroll", sync, { passive: true });
  });
}

const KN_HEADER_SIZES = ["xlarge", "large", "medium"];

function knHeaderSkip(el) {
  return (
    el.classList.contains("kn-appbar") ||
    el.classList.contains("kn-dropdown__header") ||
    el.classList.contains("dropdown-header") ||
    el.classList.contains("kn-menu__header") ||
    el.classList.contains("menu-header") ||
    el.classList.contains("kn-accordion__header") ||
    el.closest(".kn-modal--confirm")
  );
}

function knHeaderHasSize(el) {
  return KN_HEADER_SIZES.some((size) => el.classList.contains(`kn-header--${size}`));
}

function hydrateKnHeaders(root = document) {
  root.querySelectorAll(".kn-header, .kn-drawer__header, .kn-modal__header").forEach((el) => {
    if (knHeaderSkip(el)) {
      return;
    }
    el.classList.add("kn-header");
    if (!knHeaderHasSize(el)) {
      el.classList.add("kn-header--large");
    }
    const leading = el.querySelector(":scope > .kn-drawer__header-icon, :scope > .kn-header__leading");
    if (leading) {
      leading.classList.add("kn-header__leading");
    }
    const copy = el.querySelector(":scope > .kn-drawer__titles, :scope > .kn-header__copy");
    if (copy) {
      copy.classList.add("kn-header__copy");
      const title = copy.querySelector("h1, h2, h3, .kn-header__title");
      if (title) {
        title.classList.add("kn-header__title");
      }
      const subtitle = copy.querySelector("p, .kn-header__subtitle");
      if (subtitle) {
        subtitle.classList.add("kn-header__subtitle");
      }
    }
    const trailing =
      el.querySelector(":scope > .kn-header__trailing") ||
      el.querySelector(":scope > .admin-drawer-status") ||
      el.querySelector(":scope > .kn-detail-head__actions");
    if (trailing) {
      trailing.classList.add("kn-header__trailing");
    }
    const close =
      el.querySelector(":scope > .kn-header__close") ||
      el.querySelector("[data-drawer-dismiss], [data-hold-drawer-dismiss], [data-kn-detail-close], [data-admin-review-close], [data-user-profile-close], [data-user-form-close], [data-drole-form-close], [data-drole-profile-close], [data-role-form-close], [data-role-profile-close]") ||
      el.querySelector(".icon-btn[aria-label^='Close']");
    if (close) {
      close.classList.add("kn-header__close");
      if (!close.getAttribute("aria-label")) {
        close.setAttribute("aria-label", "Close");
      }
    }
  });

  root.querySelectorAll(".kn-footer, .kn-drawer__footer, .kn-modal__footer").forEach((el) => {
    if (el.closest(".kn-modal--confirm")) {
      return;
    }
    el.classList.add("kn-footer");
    el.querySelectorAll(".kn-drawer__footer-actions").forEach((actions) => {
      actions.classList.add("kn-footer__actions");
    });
  });
  root.querySelectorAll(".kn-header__title-suffix .kn-counter, .kn-header__title-suffix .counter").forEach((node) => {
    hydrateKnCounter(node);
  });
}

window.KNHeader = Object.assign(window.KNHeader || {}, {
  hydrate: hydrateKnHeaders
});

function knMenuEnabledItems(menu) {
  return Array.from(menu.querySelectorAll('[role="menuitem"]')).filter((item) => {
    return !item.disabled && item.getAttribute("aria-disabled") !== "true" && !item.hidden;
  });
}

function knMenuFocusItem(menu, index) {
  const items = knMenuEnabledItems(menu);
  if (!items.length) {
    return;
  }
  const next = (index + items.length) % items.length;
  items.forEach((item, idx) => {
    item.tabIndex = idx === next ? 0 : -1;
    item.classList.toggle("is-active", idx === next);
  });
  items[next].focus();
}

function bindKnMenuKeyboard(menu) {
  if (menu.dataset.knMenuReady === "1") {
    return;
  }
  if (menu.getAttribute("role") !== "menu") {
    return;
  }
  menu.dataset.knMenuReady = "1";
  knMenuEnabledItems(menu).forEach((item, index) => {
    item.tabIndex = index === 0 ? 0 : -1;
  });
  menu.addEventListener("keydown", (event) => {
    const items = knMenuEnabledItems(menu);
    if (!items.length) {
      return;
    }
    const current = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      knMenuFocusItem(menu, current < 0 ? 0 : current + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      knMenuFocusItem(menu, current < 0 ? items.length - 1 : current - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      knMenuFocusItem(menu, 0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      knMenuFocusItem(menu, items.length - 1);
    }
  });
}

function hydrateKnMenus(root = document) {
  root.querySelectorAll(".menu-item").forEach((el) => {
    el.classList.add("kn-menu__item");
    if (el.classList.contains("menu-item--negative")) {
      el.classList.add("is-negative");
    }
    if (el.disabled) {
      el.setAttribute("aria-disabled", "true");
    }
  });
  root.querySelectorAll(".menu-header").forEach((el) => {
    el.classList.add("kn-menu__header");
  });
  root.querySelectorAll(".kn-menu, .menu-overlay").forEach((menu) => {
    const isDropdown =
      menu.classList.contains("kn-dropdown__overlay") ||
      menu.classList.contains("vis-menu__list") ||
      menu.classList.contains("dropdown-overlay");
    if (!isDropdown) {
      menu.classList.add("kn-menu");
    }
    menu.classList.add("menu-overlay");
    bindKnMenuKeyboard(menu);
    if (typeof hydrateKnDividers === "function") {
      hydrateKnDividers(menu);
    }
  });
}

window.KNMenu = Object.assign(window.KNMenu || {}, {
  hydrate: hydrateKnMenus
});

function hydrateKnDropdown(root) {
  if (!root || root.nodeType !== 1) {
    return;
  }
  const host =
    root.classList.contains("kn-dropdown") ||
    root.classList.contains("vis-menu") ||
    root.classList.contains("quick-actions")
      ? root
      : root.closest?.(".kn-dropdown, .vis-menu, .quick-actions");
  if (!host) {
    return;
  }
  if (host.classList.contains("kn-menu") && !host.classList.contains("kn-dropdown")) {
    return;
  }
  host.classList.add("kn-dropdown");
  if (!host.getAttribute("data-kn-component")) {
    host.setAttribute("data-kn-component", "dropdown");
  }
  const isMultiple =
    host.classList.contains("kn-dropdown--multiple") ||
    host.classList.contains("kn-select--multi") ||
    host.querySelector(":scope > .kn-dropdown__overlay[aria-multiselectable='true'], :scope > .vis-menu__list[aria-multiselectable='true']");
  if (isMultiple) {
    host.classList.add("kn-dropdown--multiple");
  } else if (!host.classList.contains("kn-dropdown--single")) {
    host.classList.add("kn-dropdown--single");
  }
  const overlay =
    host.querySelector(":scope > .kn-dropdown__overlay") ||
    host.querySelector(":scope > .vis-menu__list") ||
    host.querySelector(":scope > .dropdown-overlay") ||
    host.querySelector(":scope > .kn-date-picker__panel");
  if (overlay) {
    overlay.classList.add("kn-dropdown__overlay");
  }
  const trigger =
    host.querySelector(":scope > [aria-haspopup]") ||
    host.querySelector(":scope > .kn-select__trigger") ||
    host.querySelector(":scope > .kn-date-picker__trigger") ||
    host.querySelector("[aria-haspopup], [data-vis-size-trigger], .kn-select__trigger");
  if (trigger && !trigger.hasAttribute("aria-expanded")) {
    trigger.setAttribute("aria-expanded", overlay && !overlay.hidden ? "true" : "false");
  }
  const header = host.querySelector(".kn-dropdown__header, .dropdown-header");
  if (header) {
    header.classList.add("kn-dropdown__header");
  }
  const footer = overlay?.querySelector(".kn-dropdown__footer, .dropdown-footer") || host.querySelector(".kn-dropdown__footer, .dropdown-footer");
  if (footer) {
    footer.classList.add("kn-dropdown__footer");
  }
  if (typeof hydrateKnMenus === "function") {
    hydrateKnMenus(host);
  }
  if (typeof hydrateKnButtons === "function") {
    hydrateKnButtons(host);
  }
  if (typeof hydrateKnDividers === "function") {
    hydrateKnDividers(host);
  }
}

function hydrateKnDropdowns(scope = document) {
  const root = scope || document;
  const selector = ".kn-dropdown, .vis-menu, .quick-actions";
  const nodes =
    root.nodeType === 1 && root.matches?.(selector)
      ? [root]
      : Array.from(root.querySelectorAll(selector));
  nodes.forEach((el) => hydrateKnDropdown(el));
}

window.KNDropdown = Object.assign(window.KNDropdown || {}, {
  hydrate: hydrateKnDropdowns
});

function hydrateKnMotion(root = document) {
  const nodes = root.querySelectorAll('[data-motion-trigger="in-view"]');
  if (!nodes.length || typeof IntersectionObserver !== "function") {
    nodes.forEach((el) => el.classList.add("is-in-view"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio < 0.8) {
          return;
        }
        entry.target.classList.add("is-in-view");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.8 }
  );
  nodes.forEach((el) => observer.observe(el));
}

window.KNMotion = Object.assign(window.KNMotion || {}, {
  hydrate: hydrateKnMotion
});

function knBottomNavItems(nav) {
  return Array.from(nav.querySelectorAll(":scope > .kn-bottom-nav__item"));
}

function syncKnBottomNavCurrent(nav) {
  const hash = (location.hash || "#").split("?")[0] || "#";
  knBottomNavItems(nav).forEach((item) => {
    const href = item.getAttribute("href") || "";
    if (!href.startsWith("#")) {
      return;
    }
    const itemHash = href.split("?")[0];
    if (itemHash === hash) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function hydrateKnBottomNav(nav) {
  nav.setAttribute("role", "navigation");
  knBottomNavItems(nav).forEach((item) => {
    if (item.tagName === "BUTTON" && !item.getAttribute("type")) {
      item.setAttribute("type", "button");
    }
    if (item.tagName === "A" && item.getAttribute("target") === "_blank" && !item.getAttribute("rel")) {
      item.setAttribute("rel", "noreferrer noopener");
    }
    item.querySelector(".kn-bottom-nav__title")?.classList.add("type-weight-semibold");
  });
  syncKnBottomNavCurrent(nav);
}

let knBottomNavHashBound = false;

function hydrateKnBottomNavs(root = document) {
  root.querySelectorAll(".kn-bottom-nav").forEach((nav) => hydrateKnBottomNav(nav));
  if (!knBottomNavHashBound) {
    knBottomNavHashBound = true;
    window.addEventListener("hashchange", () => {
      document.querySelectorAll(".kn-bottom-nav").forEach((nav) => syncKnBottomNavCurrent(nav));
    });
  }
}

window.KNBottomNav = Object.assign(window.KNBottomNav || {}, {
  hydrate: hydrateKnBottomNavs
});

let knSheetOpenCount = 0;
const knSheetLastFocus = new WeakMap();

function knSheetMotionMs() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return knThemeDurationMs("moderate");
}

function knSheetLockBody(lock) {
  if (lock) {
    knSheetOpenCount += 1;
    if (knSheetOpenCount === 1) {
      document.body.style.overflow = "hidden";
    }
    return;
  }
  knSheetOpenCount = Math.max(0, knSheetOpenCount - 1);
  if (knSheetOpenCount === 0) {
    document.body.style.overflow = "";
  }
}

function knSheetIsDismissible(root) {
  return !root.classList.contains("kn-sheet-root--no-dismiss");
}

function knSheetFocusInitial(root) {
  const sheet = root.querySelector(".kn-sheet");
  const closeBtn = sheet?.querySelector(
    '.kn-header .icon-btn, .kn-drawer__header .icon-btn, [data-kn-sheet-dismiss]'
  );
  const target = closeBtn || sheet?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
  if (target && typeof target.focus === "function") {
    target.focus();
  }
}

function closeKnBottomSheet(root) {
  if (!root || root.hidden || !root.classList.contains("is-open")) {
    return;
  }
  root.classList.remove("is-open");
  const sheet = root.querySelector(".kn-sheet");
  sheet?.classList.remove("is-dragging");
  if (sheet) {
    sheet.style.transform = "";
  }
  knSheetLockBody(false);
  window.clearTimeout(root._knSheetCloseTimer);
  root._knSheetCloseTimer = window.setTimeout(() => {
    root.hidden = true;
    const last = knSheetLastFocus.get(root);
    if (last && typeof last.focus === "function") {
      last.focus();
    }
    knSheetLastFocus.delete(root);
  }, knSheetMotionMs());
}

function openKnBottomSheet(root) {
  if (!root) {
    return;
  }
  if (root.classList.contains("is-open") && !root.hidden) {
    return;
  }
  window.clearTimeout(root._knSheetCloseTimer);
  knSheetLastFocus.set(root, document.activeElement);
  root.hidden = false;
  knSheetLockBody(true);
  window.requestAnimationFrame(() => {
    root.classList.add("is-open");
    knSheetFocusInitial(root);
  });
}

function bindKnSheetHandle(root) {
  const handle = root.querySelector(".kn-sheet__handle");
  const sheet = root.querySelector(".kn-sheet");
  if (!handle || !sheet || handle.dataset.knSheetHandle === "1") {
    return;
  }
  handle.dataset.knSheetHandle = "1";
  let startY = 0;
  let dragging = false;
  const threshold = window.knTheme?.size?.[56] ?? 0;

  const onMove = (event) => {
    if (!dragging) {
      return;
    }
    const dy = Math.max(0, event.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  };

  const onUp = (event) => {
    if (!dragging) {
      return;
    }
    dragging = false;
    sheet.classList.remove("is-dragging");
    handle.releasePointerCapture?.(event.pointerId);
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    const dy = Math.max(0, event.clientY - startY);
    sheet.style.transform = "";
    if (knSheetIsDismissible(root) && dy >= threshold) {
      closeKnBottomSheet(root);
    }
  };

  handle.addEventListener("pointerdown", (event) => {
    if (!root.classList.contains("is-open") || !knSheetIsDismissible(root)) {
      return;
    }
    dragging = true;
    startY = event.clientY;
    sheet.classList.add("is-dragging");
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
}

function hydrateKnBottomSheet(root) {
  const sheet = root.querySelector(".kn-sheet");
  if (!sheet) {
    return;
  }
  if (!sheet.getAttribute("role")) {
    sheet.setAttribute("role", "dialog");
  }
  sheet.setAttribute("aria-modal", "true");
  const title = sheet.querySelector(".kn-header__title, .kn-header h2, .kn-drawer__titles h2");
  if (title && title.id) {
    sheet.setAttribute("aria-labelledby", title.id);
  }
  bindKnSheetHandle(root);
  hydrateKnBoxes(root);
  if (root.dataset.knSheetReady === "1") {
    return;
  }
  root.dataset.knSheetReady = "1";
  root.querySelector(".kn-sheet__overlay")?.addEventListener("click", () => {
    if (knSheetIsDismissible(root)) {
      closeKnBottomSheet(root);
    }
  });
  sheet.querySelectorAll("[data-kn-sheet-dismiss], .kn-header__close").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      closeKnBottomSheet(root);
    });
  });
}

let knSheetDocBound = false;

function hydrateKnBottomSheets(scope = document) {
  scope.querySelectorAll(".kn-sheet-root").forEach((root) => hydrateKnBottomSheet(root));
  if (knSheetDocBound) {
    return;
  }
  knSheetDocBound = true;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    const open = [...document.querySelectorAll(".kn-sheet-root.is-open")].at(-1);
    if (!open || !knSheetIsDismissible(open)) {
      return;
    }
    event.preventDefault();
    closeKnBottomSheet(open);
  });
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-kn-sheet-open]");
    if (!trigger) {
      return;
    }
    const sel = trigger.getAttribute("data-kn-sheet-open");
    const root = sel ? document.querySelector(sel) : null;
    if (!root) {
      return;
    }
    event.preventDefault();
    openKnBottomSheet(root);
  });
}

window.KNBottomSheet = Object.assign(window.KNBottomSheet || {}, {
  hydrate: hydrateKnBottomSheets,
  open: openKnBottomSheet,
  close: closeKnBottomSheet
});

const KN_BOX_DISPLAY = new Set([
  "kn-box--flex",
  "kn-box--row",
  "kn-box--column",
  "kn-box--row-reverse",
  "kn-box--column-reverse",
  "kn-box--center",
  "kn-box--grid"
]);

function knBoxHasDisplay(el) {
  return [...el.classList].some((name) => KN_BOX_DISPLAY.has(name));
}

function decorateKnBox(el, { columnIfBare = false } = {}) {
  if (!el || el.nodeType !== 1) {
    return el;
  }
  el.classList.add("kn-box");
  if (columnIfBare && !knBoxHasDisplay(el)) {
    el.classList.add("kn-box--column");
  }
  return el;
}

function hydrateKnBoxes(scope = document) {
  scope.querySelectorAll(".kn-box").forEach((el) => decorateKnBox(el));
  scope.querySelectorAll(".kh-panel, .kn-drawer__body, .kn-sheet__body").forEach((el) => {
    decorateKnBox(el, { columnIfBare: true });
  });
}

window.KNBox = Object.assign(window.KNBox || {}, {
  hydrate: hydrateKnBoxes
});

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
    title.textContent = `${greeting}, Jane`;
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
  setKnAmount("duty", formatKnAmountParts(duty, { suffix: "none" }));
  setKnAmount("demurrage-usd", formatKnAmountParts(demurrageUsd, { suffix: "none" }));
  setKnText("demurrage-trend", knPlural(summary.demurrageExceeded, "container exceeded", "containers exceeded"));
  setKnAmount("collected", formatKnAmountParts(collected, { suffix: "none" }));
  setKnText("collected-trend", `${summary.ontime} on-track shipments · estimate`);
  setKnAmount("service", formatKnAmountParts(service, { suffix: "none" }));
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

  mountDashCharts(summary);

  const arrivalsList = document.getElementById("dash-arrivals");
  if (arrivalsList) {
    arrivalsList.innerHTML = (summary.arrivals || [])
      .map((item) => {
        const tone = item.status === "On Hold" ? "negative" : item.statusTone;
        return `
          <li class="kn-list__item" data-map-id="${item.id}">
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
        <li class="kn-list__item" data-map-id="${waitingIsf.id}">
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
        <li class="kn-list__item" data-map-id="${arrivalNotice.id}">
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
        <li class="kn-list__item" data-map-id="${invoiceItem.id}">
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
            <td class="vis-table__num">${typeof knAmountHtml === "function" ? knAmountHtml(summary.amounts[item.id], "kn-amount kn-amount--body kn-amount--small kn-amount--subtle-affix kn-amount--weight-semibold", { suffix: "none" }) : `<span class="amount">${usd(summary.amounts[item.id])}</span>`}</td>
          </tr>
        `;
      })
      .join("");
  }

  const notifCount = document.querySelector("[data-nav-count='notifications']");
  if (notifCount) {
    notifCount.textContent = String(summary.action);
    notifCount.setAttribute("aria-label", `${summary.action} shipments need action`);
    hydrateKnCounter(notifCount);
  }

  const invoices = document.getElementById("dash-invoices");
  if (invoices) {
    invoices.innerHTML = invoiceRows
      .map((item) => `
        <li class="kn-list__item" data-map-id="${item.id}">
          <div>
            <p class="type-ui-md type-weight-semibold">${item.po}</p>
            <p class="type-caption-sm">${item.id} · estimate</p>
          </div>
          ${typeof knAmountHtml === "function" ? knAmountHtml(summary.amounts[item.id], "kn-amount kn-amount--body kn-amount--small kn-amount--subtle-affix kn-amount--weight-semibold", { suffix: "none" }) : `<span class="amount type-ui-sm type-weight-semibold">${usd(summary.amounts[item.id])}</span>`}
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

  const dashLive = document.getElementById("dash-live");
  if (dashLive) {
    hydrateKnCharts(dashLive);
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
  const refChipRestore = document.getElementById("ai-assistant-ref-restore");
  const resizeHandle = document.getElementById("ai-assistant-resize");
  const helpBtn = document.getElementById("ai-assistant-help");
  const introEl = document.getElementById("ai-assistant-intro");
  const introHeading = document.getElementById("ai-assistant-intro-heading");
  const introGreeting = document.getElementById("ai-assistant-intro-greeting");
  const introPrompts = document.getElementById("ai-assistant-intro-prompts");
  const flagsSlot = document.getElementById("ai-assistant-flags");
  const statusEl = document.getElementById("ai-assistant-status");
  const ghostEl = document.getElementById("ai-assistant-ghost");
  const inputErrorEl = document.getElementById("ai-assistant-input-error");
  const inputErrorText = document.getElementById("ai-assistant-input-error-text");
  const inputErrorDismiss = document.getElementById("ai-assistant-input-error-dismiss");
  const sendIcon = sendBtn?.querySelector(".kn-chat-input__icon--send");
  const stopIcon = sendBtn?.querySelector(".kn-chat-input__icon--stop");
  const DEFAULT_INPUT_PLACEHOLDER =
    window.KNKnowledgeExpert?.placeholder ||
    input?.getAttribute("data-placeholder") ||
    "Ask about HTS, tariffs, FTA, CBP regulations, or CATAIR codes…";
  if (!shell || !panel || !form || !input || !history || !resizeHandle || !triggers.length) {
    return;
  }

  const WIDTH_MIN = 360;
  const WIDTH_MAX = 600;
  const WIDTH_DEFAULT = 430;
  const WIDTH_STEP = 20;
  const WIDTH_STORAGE_KEY = "kn-ai-assistant-width";
  const ACTION_INTENT = /\b(add|create|edit|update|delete|remove|assign|deactivate|activate|save|submit|change)\b/i;
  const COACHMARK_SEEN_KEY = "kn-klear-assist-rename-seen";
  const INTRO_SEEN_KEY = "kn-ai-assistant-intro-seen";
  const COACHMARK_COPY =
    "Klear Agent is available on every page — open contextual help from the top nav, not just here.";
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
  let refChipDismissedForScope = "";
  let generationId = 0;
  let isResponding = false;
  let isRestoringTranscript = false;
  let panelScopeKey = "";
  let panelContext = null;
  let streamTimer = null;
  let genuiAbort = null;

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
    const label = window.KNAssistCore?.triggerLabel?.(expanded) || (expanded ? "Close Klear Agent" : "Klear Agent");
    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", String(expanded));
      trigger.setAttribute("aria-pressed", String(expanded));
      trigger.setAttribute("aria-label", label);
      const text = trigger.querySelector(".ai-assistant-trigger__label");
      if (text && !trigger.classList.contains("ai-assistant-trigger--mobile")) {
        text.textContent = label;
      }
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
    const assistTriggers = triggers.filter((trigger) => !trigger.hidden);
    const found = assistTriggers.find((trigger) => {
      const style = window.getComputedStyle(trigger);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      const rect = trigger.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (found) {
      return found;
    }
    return document.querySelector(".side-nav-link--agentic-broker");
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
    const gap = knThemeSpacePx(3);
    const tipRect = coachmarkEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.min(Math.max(gap, left), window.innerWidth - tipRect.width - gap);
    const top = Math.min(rect.bottom + gap, window.innerHeight - tipRect.height - gap);
    coachmarkEl.style.top = `${Math.round(Math.max(gap, top))}px`;
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
    const canShow = window.KNAssistCore?.isFullPageAssist?.();
    if (!canShow || hasSeenFlag(COACHMARK_SEEN_KEY)) {
      coachmarkVisible = false;
      setCoachmarkBadges(false);
      if (coachmarkEl) {
        coachmarkEl.hidden = true;
      }
      return;
    }
    setCoachmarkBadges(true);
    if (!coachmarkEl) {
      coachmarkEl = document.createElement("div");
      coachmarkEl.className = "kn-tooltip kn-tooltip--coachmark type-caption-sm";
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
    if (window.KNAssistCore?.lookingAtLine && context) {
      return window.KNAssistCore.lookingAtLine(context);
    }
    if (context?.kind === "role-detail" || context?.kind === "user-detail" || context?.kind === "default-detail" || context?.kind === "visibility-detail") {
      return `Looking at ${context.title}`;
    }
    if (context?.title) {
      return `Looking at ${context.title}`;
    }
    return "Looking at this record";
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
    if (/where|navigate|open|add |create |go to|look first|more filter|submit/.test(text)) {
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
      if (item.action) {
        button.setAttribute("data-ai-action", JSON.stringify(item.action));
      }
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
    const resolved = context || panelContextForUi();
    setGreetingAndHeadline(introGreeting, introHeading, resolved);
    fillPromptChips(introPrompts, resolved);
  }

  function showIntro() {
    if (!introEl) {
      hideIntro();
      renderEmptyState();
      window.requestAnimationFrame(() => input.focus());
      return;
    }
    fillIntro(panelContextForUi());
    introEl.hidden = false;
    history.hidden = true;
    form.hidden = false;
    helpBtn?.setAttribute("aria-expanded", "true");
    announceFtue("Klear Agent. Answers use the record on this page. Suggests only — it cannot change records.");
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
    if (!history.querySelector(".ai-msg")) {
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
    '<svg class="kn-collapsible__chevron ai-msg__thinking-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg>';

  const KN_SPINNER_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path class="kn-spinner__track" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z" fill="currentColor"/>
    <path d="M24 12C24 13.8937 23.5518 15.7606 22.6921 17.4479C21.8324 19.1352 20.5855 20.5951 19.0534 21.7082C17.5214 22.8213 15.7476 23.556 13.8772 23.8523C12.0068 24.1485 10.0928 23.9979 8.29181 23.4127L9.21886 20.5595C10.5696 20.9984 12.0051 21.1114 13.4079 20.8892C14.8107 20.667 16.141 20.116 17.2901 19.2812C18.4391 18.4463 19.3743 17.3514 20.0191 16.0859C20.6639 14.8204 21 13.4203 21 12H24Z" fill="currentColor"/>
    <path d="M-1.33514e-05 12C-1.33514e-05 10.1063 0.448176 8.23944 1.30791 6.55211C2.16764 4.86479 3.41451 3.4049 4.94656 2.2918C6.47862 1.17869 8.25236 0.443983 10.1228 0.147739C11.9932 -0.148504 13.9072 0.00212896 15.7082 0.587322L14.7811 3.44049C13.4304 3.0016 11.9949 2.88862 10.5921 3.11081C9.18927 3.33299 7.85896 3.88402 6.70992 4.71885C5.56088 5.55367 4.62573 6.64859 3.98093 7.91409C3.33613 9.17958 2.99999 10.5797 2.99999 12H-1.33514e-05Z" fill="currentColor"/>
  </svg>`;

  function knSpinnerHtml(extraClass = "") {
    return `<span class="kn-spinner${extraClass ? ` ${extraClass}` : ""}" role="progressbar" aria-label="Loading">${KN_SPINNER_SVG}</span>`;
  }

  const LOADING_TEXTS = [
    "Analyzing your request…",
    "Fetching relevant details…",
    "Preparing your response…",
    "Almost there…"
  ];

  let rollingTimer = null;
  let panelGhost = null;

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

  function schemaAnswer({ title, thinking, leadIn, schema, followUps, text }) {
    return {
      mode: "schema",
      title: title || "",
      thinking: Array.isArray(thinking) ? thinking.filter(Boolean) : [],
      leadIn: leadIn || "",
      text: text || leadIn || "",
      schema: schema || { components: [] },
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
        page: "Role Management",
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
        text: `No records named **${names[0]}** or **${names[1]}** are stored in this session.\n\nOpen **Role Management** (templates) or **KN Role Management** (internal roles) and ask again.`,
        sources: [
          { label: "Role Management", href: "#default-role-management", type: "page", id: "defaults" },
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
        text: `**${found.role.name}** is on **${found.page}**. **${missing}** is not in this session, so I cannot invent a side-by-side.\n\nOpen **Role Management** if that name is a customer template.`,
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
    const key = String(level || "").toUpperCase().replace(/[\s-]+/g, "_");
    if (key === "KLEARNOW") {
      return "KlearNow";
    }
    if (key === "CUSTOMER") {
      return "Customer";
    }
    if (key === "SUB_CUSTOMER") {
      return "Sub-customer";
    }
    if (key === "COMPANY") {
      return "Company";
    }
    if (key === "PARTIES" || key === "BROKER") {
      return "Parties";
    }
    return level || "workspace";
  }

  function contextOf(partial) {
    const hash = typeof getHashPath === "function" ? getHashPath() : "";
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
      scopeKey: hash || undefined,
      ...partial,
      scopeKey: partial.scopeKey || hash || undefined
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
    const users = readAdminRows("kn-users-v3", () => window.KNUsers?.list?.());
    const elevatedInactive = users.filter(
      (user) => !user.active && (user.roles || []).some((name) => isElevatedRoleName(name))
    );
    const split = {
      kn: users.filter((user) => String(user.level).toUpperCase() === "KLEARNOW").length,
      customer: users.filter((user) => String(user.level).toUpperCase() === "CUSTOMER").length,
      subCustomer: users.filter((user) => String(user.level).toUpperCase() === "SUB_CUSTOMER").length,
      company: users.filter((user) => String(user.level).toUpperCase() === "COMPANY").length,
      parties: users.filter((user) => {
        const level = String(user.level).toUpperCase();
        return level === "PARTIES" || level === "BROKER";
      }).length,
      broker: users.filter((user) => {
        const level = String(user.level).toUpperCase();
        return level === "PARTIES" || level === "BROKER";
      }).length,
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
        details: ["Users persist in kn-users-v3 after the roster is saved."],
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
        ? `User Management is listing ${users.length} people across customers, sub-customers, companies, and parties. ${formatList(elevatedInactive.map((item) => item.name))} ${elevatedInactive.length === 1 ? "is" : "are"} inactive while still holding elevated access.`
        : `User Management is listing ${users.length} people — ${split.customer} customer, ${split.subCustomer} sub-customer, ${split.company} company, ${split.parties} parties. No inactive accounts currently keep elevated roles.`,
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
        area: "Role Management",
        title: "New default role",
        summary: "You're drafting a customer/broker template, not an internal KN role. I can explain inheritance, services, and applicability; publishing still happens on this form.",
        hint: "I will not create the template. Ask what customers would inherit if you save it.",
        details: ["Inheritance starts after customers are attached to the published template."],
        prompts: [
          { label: "Before you publish", prompt: "What should I check before publishing a default role?" },
          { label: "Vs KN internal role", prompt: "How is this template different from a KN internal role?" },
          { label: "What inheritance means", prompt: "What does inheritance mean once customers join?" }
        ],
        manualPath: "Administration -> Role Management -> Add Role -> Save",
        facts: { roles, top, inactiveInherited }
      });
    }

    if (role) {
      const inherited = inheritCount(role);
      return contextOf({
        kind: "default-detail",
        area: "Role Management",
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
        manualPath: "Administration -> Role Management -> open template -> Edit Role",
        facts: { roles, role, top, inactiveInherited }
      });
    }

    if (!roles.length) {
      return contextOf({
        kind: "defaults",
        area: "Role Management",
        title: "Role Management",
        summary: "Role Management is open, but no templates are stored yet. I can still explain inheritance — how customers pick up access when they join — once templates load.",
        hint: "There is no inheritance table to rank yet. Ask what a default role is for.",
        details: ["Templates persist in kn-default-roles-v3 after they are saved."],
        prompts: [
          { label: "Most inherited template", prompt: "Which default role has the most customers inheriting it?" },
          { label: "What inheritance means", prompt: "What does inheritance mean on this page?" },
          { label: "Where to add a template", prompt: "Where do I add a default role when templates are ready?" }
        ],
        manualPath: "Administration -> Role Management",
        facts: { roles, top, inactiveInherited }
      });
    }

    return contextOf({
      kind: "defaults",
      area: "Role Management",
      title: "Role Management",
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
      manualPath: "Administration -> Role Management",
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

  function agenticBrokerContext() {
    return contextOf({
      kind: "agentic-broker",
      area: "Klear Agent",
      title: "Klear Agent",
      summary: "You're on Klear Agent. Ask about HTS, tariffs, FTA, CBP regulations, or CATAIR codes — no entry required. Or pull up entries, shipments, and compliance screens from the suggestions.",
      hint: "Knowledge Expert answers work without a record loaded. Try “CATAIR code 398” or “USMCA for auto parts from Mexico”.",
      details: ["HTS classification, duty estimates, and CATAIR codes are available on every screen.", "Past conversations are in the sidebar, grouped by Today, This week, This month, and so on."],
      prompts: [
        { label: "CATAIR code 398", prompt: "What does CATAIR code 398 mean and how do I fix it?", icon: "flag", new: true },
        { label: "HTS classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" },
        { label: "Today's Statements", prompt: "Today's Statements" }
      ],
      manualPath: "Klear Agent",
      facts: {}
    });
  }

  function paymentUsStatementsContext(hash) {
    const approvalMatch = hash.match(/^#payment-us-statements\/approval\/([^/]+)$/);
    const statementId = approvalMatch ? decodeURIComponent(approvalMatch[1]) : "";
    const stmt = statementId ? window.KNPaymentUsStatements?.find?.(statementId) : null;
    if (stmt) {
      return contextOf({
        kind: "statement-approval",
        area: "US Statements",
        title: stmt.id,
        headline: `Looking at Statement ${stmt.id}`,
        summary: `Statement ${stmt.id} for ${stmt.company} — ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stmt.totalDue)} due. Review entry lines and approve explicitly.`,
        hint: "Ask about ACH timing or duty breakdown. I cannot approve the statement for you.",
        details: [`Company: ${stmt.company}`, `ACH: ${stmt.achStatus}`, `${stmt.entries.length} entry summaries on this statement`],
        prompts: [
          { label: "ACH timing", prompt: `When does ACH debit hit for statement ${stmt.id}?` },
          { label: "CATAIR code 398", prompt: "What does CATAIR code 398 mean and how do I fix it?", icon: "flag", new: true },
          { label: "Duty breakdown", prompt: `Break down duty, MPF, and HMF on statement ${stmt.id}` }
        ],
        manualPath: "Payment → US → Statements → Statement Approval",
        facts: { statementId: stmt.id, company: stmt.company, totalDue: stmt.totalDue },
        scopeKey: `#payment-us-statements/approval/${encodeURIComponent(stmt.id)}`
      });
    }
    return contextOf({
      kind: "statements",
      area: "US Statements",
      title: "Statements",
      headline: "Looking at US Statements",
      summary: "Review pending periodic daily statements before ACH debit. Select a statement to approve or update entry lines.",
      hint: "Ask about ACH, unpaid lines, or customs expertise. I cannot approve a statement from chat.",
      details: ["Statement Approval lists pending periodic daily statements.", "Approve requires an explicit click — Klear Agent cannot approve for you."],
      prompts: [
        { label: "Today's statements", prompt: "Today's Statements" },
        { label: "CATAIR code 398", prompt: "What does CATAIR code 398 mean and how do I fix it?", icon: "flag", new: true },
        { label: "HTS classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" }
      ],
      manualPath: "Payment → US → Statements",
      facts: { listView: true, region: "us" },
      scopeKey: "#payment-us-statements"
    });
  }

  function getContext() {
    const record = window.KNAssistCore?.getContext?.();
    if (record) {
      return record;
    }
    const hash = getHashPath();
    let context = null;
    if (hash.startsWith("#kn-role-management")) {
      context = rolesContext(hash);
    } else if (hash.startsWith("#kn-user-management")) {
      context = usersContext(hash);
    } else if (hash.startsWith("#default-role-management")) {
      context = defaultsContext(hash);
    } else if (isDashboardRoute()) {
      context = operationsContext("dashboard");
    } else if (isAgenticBrokerRoute()) {
      context = agenticBrokerContext();
    } else if (isKlearhubOverviewRoute() || hash.startsWith("#klearhub-overview")) {
      context = operationsContext("overview");
    } else if (isKlearhubVisibilityRoute() || hash === "#klearhub-visibility") {
      context = operationsContext("visibility");
    } else if (hash.startsWith("#payment-us-statements")) {
      context = paymentUsStatementsContext(hash);
    } else {
      context = unavailableContext();
    }
    return window.KNAssistCore?.enrichContext?.(context) || context;
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
    if ((kind === "isf" || kind === "entry" || kind === "in-bond" || kind === "ftz" || kind === "psc" || kind === "delivery-order" || kind === "tm-shipment" || kind === "statement-detail" || kind === "statement-approval") && (facts.label || context.title)) {
      return `Referencing: ${facts.label || context.title}`;
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
        ? `Referencing: Role Management — ${count} template${count === 1 ? "" : "s"} visible`
        : "Referencing: Role Management";
    }
    if (kind === "visibility" || kind === "dashboard" || kind === "overview") {
      const total = Number(facts.stats?.total) || Number(facts.count) || 0;
      return total
        ? `Referencing: ${context.area} — ${total} shipment${total === 1 ? "" : "s"} in view`
        : `Referencing: ${context.area || context.title}`;
    }
    if (facts.listView && context.area) {
      const count = Number(facts.count) || 0;
      return count
        ? `Referencing: ${context.area} — ${count.toLocaleString()} record${count === 1 ? "" : "s"} in view`
        : `Referencing: ${context.area}`;
    }
    return `Referencing: ${context.area || context.title || "this page"}`;
  }

  function lookingCopy(context) {
    const kind = context?.kind || "";
    if ((kind === "role-detail" || kind === "default-detail" || kind === "user-detail") && context?.title) {
      return `Checking ${context.title}…`;
    }
    if (kind === "visibility-detail" && context?.title) {
      return `Looking at Shipment ${context.title}…`;
    }
    if ((kind === "isf" || kind === "entry" || kind === "in-bond" || kind === "ftz" || kind === "psc" || kind === "delivery-order" || kind === "tm-shipment" || kind === "statement-detail" || kind === "statement-approval") && context?.headline) {
      return `${context.headline}…`;
    }
    if (kind === "defaults" || kind === "default-add") {
      return "Looking at Role Management…";
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
    if (facts.listView && context?.area) {
      return `Looking at ${context.area}…`;
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

  function refChipScopeKey(context = panelContextForUi()) {
    return window.KNAssistCore?.sessionKey?.(context) || context?.scopeKey || "";
  }

  function syncRefChipDismissForScope(scopeKey) {
    if (!refChipDismissed) {
      return;
    }
    if (scopeKey && scopeKey !== refChipDismissedForScope) {
      refChipDismissed = false;
      refChipDismissedForScope = "";
    }
  }

  function syncContextChip(context = getContext()) {
    const scopeKey = refChipScopeKey(context);
    syncRefChipDismissForScope(scopeKey);
    if (refChipDismissed) {
      if (refChip) {
        refChip.hidden = true;
      }
      if (refChipRestore) {
        refChipRestore.hidden = false;
      }
      return;
    }
    if (refChipRestore) {
      refChipRestore.hidden = true;
    }
    if (!refChip || !refChipText) {
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
      pushPage("Role Management", "#default-role-management");
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
      <button type="button" class="ai-msg__action icon-btn" data-ai-msg-copy aria-label="Copy response">${MSG_ACTION_COPY}</button>
      <button type="button" class="ai-msg__action icon-btn" data-ai-msg-feedback="up" aria-pressed="false" aria-label="Helpful response">${MSG_ACTION_UP}</button>
      <button type="button" class="ai-msg__action icon-btn" data-ai-msg-feedback="down" aria-pressed="false" aria-label="Unhelpful response">${MSG_ACTION_DOWN}</button>
    </div>`;
  }

  function updateSendControl() {
    if (!sendBtn) {
      return;
    }
    if (isResponding) {
      sendBtn.disabled = false;
      sendBtn.type = "button";
      sendBtn.classList.add("is-stop");
      sendBtn.classList.remove("is-muted");
      sendBtn.setAttribute("aria-label", "Stop generation");
      sendIcon?.setAttribute("hidden", "");
      stopIcon?.removeAttribute("hidden");
      form.classList.add("is-responding");
      input.setAttribute("aria-disabled", "true");
      if (statusEl) {
        statusEl.textContent = "Typing…";
        statusEl.classList.add("is-typing");
      }
      return;
    }
    sendBtn.type = "submit";
    sendBtn.classList.remove("is-stop");
      sendBtn.setAttribute("aria-label", "Submit");
    sendIcon?.removeAttribute("hidden");
    stopIcon?.setAttribute("hidden", "");
    const hasText = Boolean(input.value.trim());
    sendBtn.disabled = !hasText;
    sendBtn.classList.toggle("is-muted", !hasText);
    form.classList.remove("is-responding");
    input.removeAttribute("aria-disabled");
    if (statusEl) {
      statusEl.textContent = "Ask about this record";
      statusEl.classList.remove("is-typing");
    }
    syncGhostSuggestion();
  }

  function setResponding(next) {
    isResponding = next;
    updateSendControl();
  }

  function clearInputError() {
    if (inputErrorEl) {
      inputErrorEl.classList.remove("is-visible");
      const hideMs = prefersReducedMotion() ? 0 : knMotionDurationMs("--theme-motion-duration-xmoderate", 360);
      window.setTimeout(() => {
        if (!inputErrorEl.classList.contains("is-visible")) {
          inputErrorEl.hidden = true;
        }
      }, hideMs);
    }
    if (inputErrorText) {
      inputErrorText.textContent = "";
    }
    if (input) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function showInputError(message) {
    if (!inputErrorEl || !inputErrorText) {
      return;
    }
    inputErrorText.textContent = String(message || "").trim();
    if (!inputErrorText.textContent) {
      clearInputError();
      return;
    }
    inputErrorEl.hidden = false;
    window.requestAnimationFrame(() => {
      inputErrorEl.classList.add("is-visible");
    });
    input.setAttribute("aria-invalid", "true");
    if (inputErrorText.id) {
      input.setAttribute("aria-describedby", inputErrorText.id);
    }
  }

  function stopRollingText() {
    if (rollingTimer) {
      window.clearInterval(rollingTimer);
      rollingTimer = null;
    }
  }

  function startRollingText(labelEl, texts) {
    stopRollingText();
    const list = (texts || []).filter(Boolean);
    if (!labelEl || !list.length) {
      return;
    }
    let index = 0;
    labelEl.textContent = list[0];
    if (list.length < 2 || prefersReducedMotion()) {
      return;
    }
    rollingTimer = window.setInterval(() => {
      index = (index + 1) % list.length;
      labelEl.classList.remove("is-swap");
      void labelEl.offsetWidth;
      labelEl.textContent = list[index];
      labelEl.classList.add("is-swap");
      // FLAG: 1600ms sidebar rolling-text swap interval — no delay token.
      // Independent of the agentic thread CSS cycle (1500ms, timed to thinking delay).
      // Enter animation is xmoderate (360ms); 1600ms is the hold between swaps.
    }, 1600);
  }

  function loadingTextsFor(context) {
    const look = lookingCopy(context);
    return [look, ...LOADING_TEXTS.filter((t) => t !== look)].slice(0, 5);
  }

  function panelPromptPhrases() {
    const context = panelContextForUi();
    const page = starterPrompts(context).map((item) => item.prompt).filter(Boolean);
    const expert = (window.KNKnowledgeExpert?.getPrompts?.(3) || []).map((item) => item.prompt);
    const merged = [...page];
    expert.forEach((prompt) => {
      if (!merged.includes(prompt)) {
        merged.push(prompt);
      }
    });
    return merged;
  }

  function initPanelGhost() {
    if (!input || !ghostEl || !window.KNAgentGhost?.bind) {
      return;
    }
    panelGhost = window.KNAgentGhost.bind(input, {
      ghostEl,
      getPromptPhrases: panelPromptPhrases,
      isPaused: () => isResponding,
      restorePlaceholder: (field) => {
        if (!field.value.trim()) {
          field.placeholder = field.getAttribute("data-placeholder") || DEFAULT_INPUT_PLACEHOLDER;
        }
      }
    });
  }

  function syncGhostSuggestion() {
    panelGhost?.sync?.();
  }

  function refreshGhostSuggestions(_context = getContext()) {
    panelGhost?.refresh?.();
    if (!input?.value.trim() && !isResponding) {
      panelGhost?.startIdleCycle?.();
    }
  }

  function stopGhostCycle() {
    panelGhost?.stopIdleCycle?.();
  }

  function stopGeneration() {
    generationId += 1;
    genuiAbort?.abort();
    genuiAbort = null;
    if (streamTimer) {
      window.clearTimeout(streamTimer);
      streamTimer = null;
    }
    stopRollingText();
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
      persistDrawerAssistant(
        { text: plainTextFromHtml(streaming.querySelector(".ai-msg__body")?.innerHTML || "") || "Generation stopped." },
        { id: streaming.getAttribute("data-message-id") || undefined, title: "", thinking: [] },
        "stopped"
      );
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

  function thinkingPanelHtml(steps, expanded = false, { status = "complete" } = {}) {
    const items = (steps || []).filter(Boolean);
    if (!items.length) {
      return "";
    }
    const traceId = `ai-thinking-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const isLoading = status === "loading";
    const title = isLoading ? "Exploring…" : "Explored";
    const rows = items
      .map((step, index) => {
        const isLast = index === items.length - 1;
        const stepStatus = isLoading
          ? index < items.length - 1
            ? "complete"
            : "active"
          : "complete";
        const railInner =
          stepStatus === "active"
            ? `<span class="ai-msg__trace-active-icon">${knSpinnerHtml("kn-spinner--accent")}</span>`
            : `<span class="ai-msg__trace-dot" aria-hidden="true"></span>`;
        return `<li class="is-${stepStatus}">
          <span class="ai-msg__trace-rail" aria-hidden="true">
            ${railInner}
            ${isLast ? "" : '<span class="ai-msg__trace-connector"></span>'}
          </span>
          <p class="ai-msg__trace-label type-caption-sm">${escapeHtml(step)}</p>
        </li>`;
      })
      .join("");
    return `
      <div class="ai-msg__thinking-panel kn-collapsible kn-chat-msg__traces" data-reasoning-status="${status}">
        <button
          type="button"
          class="ai-msg__thinking-toggle kn-collapsible__trigger type-caption-sm"
          aria-expanded="${expanded || isLoading ? "true" : "false"}"
          aria-controls="${traceId}"
        >
          ${isLoading ? knSpinnerHtml("kn-spinner--accent") : THINKING_CHEVRON}
          <span class="ai-msg__thinking-toggle-label">${isLoading ? title : expanded ? "Hide thinking" : "Show thinking"}</span>
        </button>
        <div class="ai-msg__thinking-trace kn-collapsible__body" id="${traceId}" ${expanded || isLoading ? "" : "hidden"}>
          <ol class="ai-msg__thinking-list type-caption-sm">${rows}</ol>
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
              `<button type="button" class="ai-msg__related-chip kn-chip kn-chip--small type-caption-sm" data-ai-prompt="${escapeHtml(item.prompt)}" aria-label="Ask: ${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`
          )
          .join("")}
      </div>
    </div>`;
  }

  function addMessage(kind, text, { html = "", actions = false, streaming = false, title = "", thinking = [], followUps = [], sources = [], id = "" } = {}) {
    history.querySelector(".ai-assistant-welcome")?.remove();
    const node = document.createElement("article");
    node.className = `ai-msg ai-msg--${kind} kn-chat-msg kn-chat-msg--${kind === "user" ? "self" : "other"}${streaming ? " ai-msg--streaming" : ""}`;
    node.setAttribute("data-kn-component", "chat-message");
    if (id) {
      node.setAttribute("data-message-id", id);
    }
    if (kind === "user") {
      node.innerHTML = `<div class="ai-msg__body type-body-sm kn-chat-msg__bubble">${html || `<p>${escapeHtml(text)}</p>`}</div>`;
    } else {
      const titleHtml = title
        ? `<h3 class="ai-msg__response-title type-ui-md type-weight-semibold">${escapeHtml(title)}</h3>`
        : "";
      node.innerHTML = `<div class="ai-msg__stack">
        ${thinkingPanelHtml(thinking)}
        ${titleHtml}
        <div class="ai-msg__body type-body-sm kn-chat-msg__bubble">${html || `<p>${escapeHtml(text)}</p>`}</div>
        ${sourcesHtml(sources)}
        ${followUpsHtml(followUps)}
        ${actions ? `<div class="ai-msg__footer kn-chat-msg__actions">${messageActionsHtml()}</div>` : ""}
      </div>`;
    }
    history.appendChild(node);
    hydrateKnChatMessage(node);
    history.scrollTop = history.scrollHeight;
    return node;
  }

  function drawerSchemaFromResult(result) {
    if (result?.schema?.components?.length) {
      return result.schema;
    }
    return window.KNGenUI?.schemaFromResult?.(result) || null;
  }

  function persistDrawerMessage(message) {
    if (isRestoringTranscript || !window.KNThreadStore?.appendMessage) {
      return null;
    }
    try {
      if (panelScopeKey && window.KNThreadStore.ensureScopedThread) {
        window.KNThreadStore.ensureScopedThread({
          title: panelContext?.headline || panelContext?.title || "Conversation",
          scopeKey: panelScopeKey,
          surface: "panel"
        });
      }
      return window.KNThreadStore.appendMessage(message);
    } catch (_error) {
      return null;
    }
  }

  function persistDrawerUser(id, text) {
    persistDrawerMessage({
      id,
      senderType: "self",
      text,
      timestamp: Date.now(),
      status: "sent"
    });
  }

  function persistDrawerAssistant(result, meta = {}, status = "sent") {
    persistDrawerMessage({
      id: meta.id || `msg-assistant-${Date.now()}`,
      senderType: "other",
      text: result?.leadIn || result?.text || meta.text || "",
      schema: drawerSchemaFromResult(result),
      thinking: meta.thinking || result?.thinking || [],
      followUps: result?.followUps || meta.followUps || [],
      sources: result?.sources || meta.sources || [],
      title: meta.title || "",
      timestamp: Date.now(),
      status
    });
  }

  function restoreDrawerMessage(msg) {
    if (!msg) {
      return;
    }
    if (msg.senderType === "self") {
      addMessage("user", msg.text || "", { id: msg.id || "" });
      return;
    }
    const schema =
      msg.schema ||
      (msg.text && window.KNGenUI?.schemaFromResult ? window.KNGenUI.schemaFromResult({ mode: "text", text: msg.text }) : null);
    const html = schema?.components?.length
      ? `${msg.text ? renderAssistantMarkdown(msg.text, getContext()) : ""}<div class="kn-genui" data-kn-genui></div>`
      : "";
    const node = addMessage("assistant", msg.text || "", {
      html,
      actions: true,
      title: msg.title || "",
      thinking: msg.thinking || [],
      followUps: msg.followUps || [],
      sources: msg.sources || [],
      id: msg.id || ""
    });
    if (schema?.components?.length) {
      window.KNGenUI?.mount(node.querySelector("[data-kn-genui]"), schema, { animate: false });
    }
  }

  function restoreDrawerTranscript() {
    const scope = window.KNAssistCore?.sessionKey?.(panelContext) || panelScopeKey;
    const thread =
      (scope && window.KNThreadStore?.findByScopeKey?.(scope)) ||
      window.KNThreadStore?.getActiveLiveThread?.();
    if (!thread?.messages?.length || !scope || thread.scopeKey !== scope) {
      return false;
    }
    isRestoringTranscript = true;
    hideIntro();
    markSeenFlag(INTRO_SEEN_KEY);
    history.innerHTML = "";
    history.hidden = false;
    thread.messages.forEach(restoreDrawerMessage);
    isRestoringTranscript = false;
    history.scrollTop = history.scrollHeight;
    return true;
  }

  function appendToAssistantStack(node, html) {
    if (!html || !node) {
      return;
    }
    const stack = node.querySelector(".ai-msg__stack") || node;
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html).trim();
    const actions = tmp.querySelector(".ai-msg__actions");
    if (actions) {
      let footer = stack.querySelector(":scope > .ai-msg__footer, :scope > .kn-chat-msg__actions");
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "ai-msg__footer kn-chat-msg__actions";
        stack.appendChild(footer);
      }
      footer.replaceChildren(actions);
      hydrateKnChatMessage(node);
      return;
    }
    const footer = stack.querySelector(":scope > .ai-msg__footer, :scope > .kn-chat-msg__actions");
    const fragment = document.createDocumentFragment();
    while (tmp.firstChild) {
      fragment.appendChild(tmp.firstChild);
    }
    if (footer) {
      stack.insertBefore(fragment, footer);
    } else {
      stack.appendChild(fragment);
    }
    hydrateKnChatMessage(node);
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

  function addShipmentsMessage(items, leadIn, context, meta = {}) {
    const leadHtml = renderAssistantMarkdown(leadIn, context);
    const body = `${leadHtml}${window.KNAiSuggest.shipmentCardsHtml(items)}`;
    return addMessage("assistant", leadIn, {
      html: body,
      actions: true,
      title: meta.title || "Recently added to my queue",
      thinking: meta.thinking || ["Searched entries in your queue"],
      followUps: meta.followUps || []
    });
  }

  function addFindingsMessage(findings, leadIn, context, meta = {}) {
    const leadHtml = renderAssistantMarkdown(leadIn, context);
    const body = `${leadHtml}${window.KNAiSuggest.findingsListHtml(findings)}`;
    return addMessage("assistant", leadIn, {
      html: body,
      actions: true,
      title: meta.title || "Validation findings",
      thinking: meta.thinking || ["Inspected required fields and agent-drafted values on the loaded entry"],
      followUps: meta.followUps || []
    });
  }

  function setThinking(isThinking, context) {
    const existing = history.querySelector(".ai-msg--status");
    if (!isThinking) {
      stopRollingText();
      if (existing) {
        existing.classList.add("is-leaving");
        if (prefersReducedMotion()) {
          existing.remove();
        } else {
          window.setTimeout(() => existing.remove(), knMotionDurationMs("--theme-motion-duration-xquick", 80));
        }
      }
      return;
    }
    const texts = loadingTextsFor(context);
    const labelText = texts[0] || lookingCopy(context);
    if (existing) {
      const label = existing.querySelector("[data-ai-rolling]");
      if (label) {
        startRollingText(label, texts);
      }
      announceAssistant(labelText);
      return;
    }
    const status = document.createElement("article");
    status.className = "ai-msg ai-msg--assistant ai-msg--status ai-msg--loading kn-chat-msg kn-chat-msg--other";
    status.setAttribute("aria-live", "polite");
    status.innerHTML = `
      <div class="ai-msg__row">
        <span class="ai-msg__leading is-rotating" aria-hidden="true">
          <svg class="klear-assistant-mark klear-assistant-mark--spin" viewBox="0 0 24 24" width="20" height="20" focusable="false" aria-hidden="true"><use href="#klear-assist-ray" /></svg>
        </span>
        <div class="ai-msg__loading-col">
          <div class="ai-msg__loading-line">
            ${knSpinnerHtml("kn-spinner--accent")}
            <p class="ai-msg__rolling type-body-sm" data-ai-rolling>${escapeHtml(labelText)}</p>
          </div>
        </div>
      </div>
    `;
    history.appendChild(status);
    hydrateKnChatMessage(status);
    history.scrollTop = history.scrollHeight;
    startRollingText(status.querySelector("[data-ai-rolling]"), texts);
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

  async function streamStructuredResult(result, context, genId, meta = {}) {
    const schema = window.KNGenUI?.schemaFromResult
      ? window.KNGenUI.schemaFromResult(result)
      : result?.schema || { components: [] };
    if (result?.mode === "draft" && result.draft && window.KNAiSuggest?.stageDraft) {
      pendingDraftPayload = window.KNAiSuggest.stageDraft(result.draft);
    }
    const node = addMessage("assistant", result?.leadIn || "", {
      html: `<div class="kn-genui" data-kn-genui></div>`,
      streaming: true,
      actions: true,
      title: meta.title || "",
      thinking: meta.thinking || [],
      followUps: result?.followUps || []
    });
    const host = node.querySelector("[data-kn-genui]");
    genuiAbort?.abort();
    genuiAbort = new AbortController();
    try {
      if (window.KNGenUI?.stream && !prefersReducedMotion()) {
        await window.KNGenUI.stream(host, schema, { animate: true, signal: genuiAbort.signal });
      } else {
        window.KNGenUI?.mount(host, schema, { animate: !prefersReducedMotion() });
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return node;
      }
      window.KNGenUI?.mount(host, schema, { animate: false });
    }
    if (genId !== generationId) {
      return node;
    }
    genuiAbort = null;
    node.classList.remove("ai-msg--streaming");
    node.classList.add("ai-msg--settled");
    announceAssistant([meta.title, result?.leadIn || result?.text].filter(Boolean).join(". "));
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
    if (window.KNGenUI?.isStructuredResult?.(result) || window.KNGenUI?.schemaFromResult) {
      const schema = window.KNGenUI.schemaFromResult(result);
      if (schema?.components?.length) {
        await streamStructuredResult(result, context, genId, { title, thinking });
        if (genId === generationId) {
          persistDrawerAssistant(result, { title, thinking });
        }
        return;
      }
    }
    await streamAssistantText(result?.text || "I could not process that request right now. Please try again.", context, genId, {
      title,
      thinking,
      followUps: result?.followUps || followUpsFromContext(context, question),
      sources: result?.sources || []
    });
    if (genId === generationId) {
      persistDrawerAssistant(
        {
          text: result?.text || "I could not process that request right now. Please try again.",
          followUps: result?.followUps || followUpsFromContext(context, question),
          sources: result?.sources || []
        },
        { title, thinking }
      );
    }
  }

  function starterPrompts(context) {
    const pageItems = (context.prompts || [])
      .filter(Boolean)
      .slice(0, 2)
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
          isNew: Boolean(item.new),
          action: item.action || null
        };
      })
      .filter((item) => item.label && item.prompt);

    const expertItems = (window.KNKnowledgeExpert?.getPrompts?.(3) || []).map((item) => ({
      label: item.label,
      prompt: item.prompt,
      icon: item.icon || "ask",
      isNew: Boolean(item.new),
      action: null
    }));

    const merged = [...pageItems];
    expertItems.forEach((item) => {
      if (merged.length >= 3) {
        return;
      }
      const key = `${item.label}|${item.prompt}`.toLowerCase();
      if (!merged.some((entry) => `${entry.label}|${entry.prompt}`.toLowerCase() === key)) {
        merged.push(item);
      }
    });

    return merged.slice(0, 3).filter((item) => item.label && item.prompt);
  }

  function panelContextForUi() {
    return isOpen && panelContext ? panelContext : getContext();
  }

  function renderEmptyState() {
    const context = panelContextForUi();
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
    refreshGhostSuggestions(context);
  }

  function noWriteResponse(question, context) {
    return `I cannot make that change from here. Use ${context.manualPath}. I can explain impact only.`;
  }

  function brokerTodayLong() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }

  function brokerHomeFollowUps(exclude) {
    const skip = String(exclude || "").toLowerCase();
    return [
      { label: "Personal dashboard", prompt: "Show my personal dashboard" },
      { label: "Recent entries in my queue", prompt: "Recent entries in my queue" },
      { label: "Today's Statements", prompt: "Today's Statements" },
      { label: "Recent shipments", prompt: "Recent shipments in operations" },
      { label: "Due today", prompt: "All items due today" },
      { label: "Post Summary Corrections", prompt: "Post Summary Corrections" },
      { label: "ISF Dashboard", prompt: "ISF Dashboard" }
    ]
      .filter((item) => item.prompt.toLowerCase() !== skip)
      .slice(0, 3);
  }

  function genuiNav(text, href) {
    return { component: "BUTTON", text, action: { type: "navigate", data: { href } } };
  }

  function genuiPrompt(text, prompt) {
    return { component: "BUTTON", text, action: { type: "prompt", data: { prompt } } };
  }

  function genuiLink(text, href) {
    return { component: "LINK", text, action: { type: "navigate", data: { href } } };
  }

  function janeQueue() {
    const isf = window.KNUsIsf?.list?.() || [];
    const entries = window.KNUsEntry?.list?.() || [];
    const pendingIsf = isf.filter((row) => row.statusChip === "pending");
    const acceptedIsf = isf.filter((row) => row.statusChip === "submitted");
    const entry = entries[0];
    const hold = (visSummary.holdRows || [])[0];
    const psc = (window.KNUsPsc?.list?.() || [])[0];
    return {
      pendingIsf,
      acceptedIsf,
      entry,
      hold,
      psc,
      isf: isf[0],
      shipment: (window.KNUsShipments?.list?.() || [])[0]
    };
  }

  const PERSONAL_DASHBOARD_INTENT = /\b(show\s+my\s+(personal\s+)?dashboard|personal\s+dashboard)\b/i;
  const WORKING_QUEUE_INTENT =
    /\b(recent(ly)?\s*(added\s*)?entries?(\s+in|\s+to)?\s+my\s+queue|recently\s+added\s+to\s+my\s+queue|my\s+(working\s*)?queue|working\s*list|find\s*entry|entry\s*number|bol\s*number|entries?\s+for\b|cbp\s*reject|entries?\s+on\s+hold|completed\s+entries)\b/i;
  const TODAYS_STATEMENTS_INTENT = /today.?s?\s*statements?/i;
  const OPS_SHIPMENTS_INTENT = /recent\s+shipments\s+in\s+operations|shipments\s+in\s+operations/i;
  const DUE_TODAY_INTENT = /\ball\s*items?\s*due\s*today|items?\s*due\s*today\b/i;
  const POST_SUMMARY_CORRECTIONS_INTENT = /post\s*summary\s*correction/i;
  const ISF_DASHBOARD_INTENT = /\bisf\s+dashboard\b|\bopen\s+(the\s+)?isf\b/i;

  function queueFilterFromQuestion(question) {
    const q = String(question || "");
    if (/cbp\s*reject/i.test(q)) return "rejected";
    if (/entries?\s+on\s+hold/i.test(q)) {
      return "hold";
    }
    if (/completed\s+entries/i.test(q)) return "completed";
    if (/working\s*list/i.test(q)) return "working";
    if (/recently\s+added/i.test(q)) return "recent";
    if (WORKING_QUEUE_INTENT.test(q)) return "all";
    return null;
  }

  function answerPersonalDashboard(question) {
    if (!PERSONAL_DASHBOARD_INTENT.test(question)) {
      return null;
    }
    const stats = visSummary || {};
    const hold = (stats.holdRows || [])[0];
    const newest = (stats.newest || stats.rows || []).slice(0, 3);
    const jane = janeQueue();
    const duty = Number(stats.amounts?.[newest[0]?.id]) || 44337;
    return schemaAnswer({
      title: "Personal dashboard",
      thinking: [
        "Loaded Jane Cooper's live Visibility snapshot",
        "Ranked holds, delays, and filings due today",
        "Matched statement ACH status against today's debit cycle"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# Your dashboard" },
          {
            component: "TEXT",
            content: `Good morning briefing for **${brokerTodayLong()}**. **${stats.shipments || 0}** active shipments, **${stats.hold || 0}** on hold, **${stats.delayed || 0}** delayed vs original ETA.`
          },
          {
            component: "GRID",
            columns: 3,
            gap: "small",
            children: [
              {
                component: "CARD",
                title: "Needs attention",
                description: hold ? `${hold.id} · ${hold.reason}` : "No holds",
                children: [
                  { component: "BADGE", text: hold ? "Exam hold" : "Clear", color: hold ? "notice" : "positive" },
                  { component: "TEXT", content: hold ? `${hold.container} at ${hold.location}. Release window ${hold.release}.` : "No containers on hold." }
                ]
              },
              {
                component: "CARD",
                title: "Duty & fees this month",
                description: "From live shipment values",
                children: [
                  { component: "AMOUNT", value: duty, currency: "USD" },
                  { component: "BADGE", text: "Estimate", color: "information" }
                ]
              },
              {
                component: "CARD",
                title: "Due today",
                description: "ISF + statement + PSC",
                children: [
                  { component: "BADGE", text: "4 items", color: "notice" },
                  { component: "TEXT", content: jane.pendingIsf[0] ? `File **${jane.pendingIsf[0].transactionId}** (${jane.pendingIsf[0].companyName}) before vessel cutoff.` : "No ISF filings due." }
                ]
              }
            ]
          },
          { component: "TEXT", content: "### Latest movements" },
          {
            component: "TABLE",
            headers: ["Shipment", "Importer", "Lane", "Status"],
            rows: newest.map((row) => [
              genuiLink(row.id, "#klearhub-visibility"),
              { component: "TEXT", value: row.company },
              { component: "TEXT", value: `${row.origin?.city || "—"} → ${row.dest?.city || "—"}` },
              { component: "BADGE", text: row.status, color: row.statusTone === "negative" ? "negative" : row.statusTone === "notice" ? "notice" : "positive" }
            ])
          },
          {
            component: "ALERT",
            color: "notice",
            title: hold ? `${hold.id} is still on hold` : "Queue is current",
            description: hold
              ? `Start with the ${hold.reason.toLowerCase()} on ${hold.container}, then file today's ISF and the ILLUMINATE USA ACH authorization.`
              : "No holds. File today's pending ISF and clear the ILLUMINATE USA statement ACH."
          },
          genuiNav("Open Dashboard", "#dashboard"),
          genuiPrompt("All items due today", "All items due today")
        ]
      },
      followUps: brokerHomeFollowUps("Show my personal dashboard")
    });
  }

  function answerWorkingQueue(question) {
    const filter = queueFilterFromQuestion(question);
    if (!filter) {
      return null;
    }
    const jane = janeQueue();
    const hold = jane.hold;
    const rows = [
      jane.entry && {
        bucket: "working",
        added: "Today 07:14",
        type: "Entry",
        id: jane.entry.transactionId,
        company: jane.entry.companyName,
        detail: jane.entry.entryNumber,
        status: jane.entry.entrySummary || "IN PROGRESS",
        color: "notice",
        href: `#transaction-us-entry/filing/${encodeURIComponent(jane.entry.id)}`
      },
      jane.pendingIsf[0] && {
        bucket: "working",
        added: "Today 08:02",
        type: "ISF",
        id: jane.pendingIsf[0].transactionId,
        company: jane.pendingIsf[0].companyName,
        detail: jane.pendingIsf[0].mbl,
        status: "PENDING SUBMISSION",
        color: "notice",
        href: `#transaction-us-isf/history/${jane.pendingIsf[0].id}`
      },
      jane.pendingIsf[1] && {
        bucket: "recent",
        added: "Today 08:41",
        type: "ISF",
        id: jane.pendingIsf[1].transactionId,
        company: jane.pendingIsf[1].companyName,
        detail: jane.pendingIsf[1].mbl,
        status: "PENDING SUBMISSION",
        color: "notice",
        href: `#transaction-us-isf/history/${jane.pendingIsf[1].id}`
      },
      hold && {
        bucket: "hold",
        added: "Yesterday",
        type: "Visibility",
        id: hold.id,
        company: (visSummary.rows || []).find((row) => row.id === hold.id)?.company || "Importer",
        detail: hold.container,
        status: hold.reason,
        color: "negative",
        href: "#klearhub-visibility"
      },
      jane.acceptedIsf[1] && {
        bucket: "rejected",
        added: "Yesterday 16:20",
        type: "ISF",
        id: jane.acceptedIsf[1].transactionId,
        company: jane.acceptedIsf[1].companyName,
        detail: jane.acceptedIsf[1].cbpNumber.split("\n")[0],
        status: "CBP rejected — stuffing location",
        color: "negative",
        href: `#transaction-us-isf/history/${jane.acceptedIsf[1].id}`
      },
      jane.isf && {
        bucket: "completed",
        added: "Wed 14:11",
        type: "ISF",
        id: jane.isf.transactionId,
        company: jane.isf.companyName,
        detail: jane.isf.mbl,
        status: jane.isf.status,
        color: "positive",
        href: `#transaction-us-isf/history/${jane.isf.id}`
      }
    ].filter(Boolean);
    const filtered =
      filter === "all" || filter === "recent"
        ? filter === "recent"
          ? rows.filter((row) => row.bucket === "recent" || row.bucket === "working")
          : rows
        : rows.filter((row) => row.bucket === filter);
    const titles = {
      all: "Recent entries in your queue",
      recent: "Added to your queue today",
      working: "Working list",
      rejected: "CBP rejected",
      hold: "Entries on hold",
      completed: "Completed entries"
    };
    window.KNAiSuggest?.logAudit?.({
      action: "working-queue-search",
      context: "assistant",
      field: "queue",
      origin: "ai",
      value: `${filter}:${question}`
    });
    return schemaAnswer({
      title: titles[filter] || "Queue",
      thinking: [
        "Opened Jane Cooper's working queue",
        "Mixed US Entry, ISF, and Visibility holds",
        filter === "all" ? "Showing the full active set" : `Filtered to ${titles[filter]}`
      ],
      schema: {
        components: [
          { component: "TEXT", content: `# ${titles[filter]}` },
          {
            component: "TEXT",
            content:
              filter === "all"
                ? `**${filtered.length}** records are in play this morning — consumption entry **${jane.entry?.transactionId || "KN-3809-2"}**, pending ISF filings, and ${hold ? `**${hold.id}** on hold` : "no Visibility holds"}.`
                : `**${filtered.length}** matching record${filtered.length === 1 ? "" : "s"} in this slice of your queue.`
          },
          {
            component: "TABLE",
            headers: ["Record", "Importer", "Reference", "Status"],
            rows: filtered.map((row) => [
              genuiLink(row.id, row.href),
              { component: "TEXT", value: row.company },
              { component: "TEXT", value: row.detail },
              { component: "BADGE", text: row.status, color: row.color }
            ])
          },
          {
            component: "ALERT",
            color: filter === "rejected" || filter === "hold" ? "notice" : "information",
            title: filter === "rejected" ? "ACE reject is still open" : filter === "hold" ? "Hold is with CBP, not the broker desk" : "Open a row to continue the filing",
            description:
              filter === "rejected"
                ? "CBP bounced the ISF for a missing container stuffing location. Replace-file before the vessel’s 24-hour cutoff."
                : "Links open the live Transaction Manager or Visibility record. Nothing is filed from this chat."
          },
          genuiNav("Open US Entry", "#transaction-us-entry"),
          genuiPrompt("All items due today", "All items due today")
        ]
      },
      followUps: [
        { label: "Recently added to my queue", prompt: "Recently added to my queue" },
        { label: "My Working List", prompt: "My Working List" },
        { label: "CBP Rejected", prompt: "CBP Rejected entries" },
        { label: "On hold", prompt: "Entries on hold" },
        { label: "Completed", prompt: "Completed entries" }
      ]
    });
  }

  function answerTodaysStatements(question) {
    if (!TODAYS_STATEMENTS_INTENT.test(question)) {
      return null;
    }
    const day = brokerTodayLong();
    return schemaAnswer({
      title: "Today's Statements",
      thinking: [
        `Pulled the ${day} periodic daily statement cycle`,
        "Matched each importer against ACH authorization on file",
        "Flagged ILLUMINATE USA — no ACH debit authorization"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# Today's statements" },
          {
            component: "TEXT",
            content: `You have **3 periodic daily statements** posted for **${day}**. ACH debit hits tomorrow morning unless a statement is unpaid.`
          },
          {
            component: "GRID",
            columns: 3,
            gap: "small",
            children: [
              {
                component: "CARD",
                title: "Statement 26-0903-A",
                description: "GLOBAL-PAK",
                children: [
                  { component: "AMOUNT", value: 18240, currency: "USD" },
                  { component: "BADGE", text: "ACH scheduled", color: "positive" },
                  { component: "TEXT", content: "Filer 0AF · 4 entry summaries. Debit 4 Sep 2026." }
                ]
              },
              {
                component: "CARD",
                title: "Statement 26-0903-B",
                description: "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
                children: [
                  { component: "AMOUNT", value: 6120, currency: "USD" },
                  { component: "BADGE", text: "ACH scheduled", color: "positive" },
                  { component: "TEXT", content: "Includes entry 0AF-3000693 still in progress." }
                ]
              },
              {
                component: "CARD",
                title: "Statement 26-0903-C",
                description: "ILLUMINATE USA LLC",
                children: [
                  { component: "AMOUNT", value: 42900, currency: "USD" },
                  { component: "BADGE", text: "No ACH on file", color: "negative" },
                  { component: "TEXT", content: "CBP will still debit. A failed pull becomes a bond claim." }
                ]
              }
            ]
          },
          { component: "TEXT", content: "### ACH recap" },
          {
            component: "TABLE",
            headers: ["Statement", "Importer", "Amount", "ACH"],
            rows: [
              [
                { component: "TEXT", value: "26-0903-A" },
                { component: "TEXT", value: "GLOBAL-PAK" },
                { component: "AMOUNT", value: 18240, currency: "USD" },
                { component: "BADGE", text: "Scheduled", color: "positive" }
              ],
              [
                { component: "TEXT", value: "26-0903-B" },
                { component: "TEXT", value: "CAMERON INTERNATIONAL" },
                { component: "AMOUNT", value: 6120, currency: "USD" },
                { component: "BADGE", text: "Scheduled", color: "positive" }
              ],
              [
                { component: "TEXT", value: "26-0903-C" },
                { component: "TEXT", value: "ILLUMINATE USA LLC" },
                { component: "AMOUNT", value: 42900, currency: "USD" },
                { component: "BADGE", text: "Missing", color: "negative" }
              ]
            ]
          },
          {
            component: "ALERT",
            color: "notice",
            title: "ILLUMINATE USA ACH missing",
            description:
              "Get the ACH authorization from ILLUMINATE USA before close of business. CBP debits the statement whether or not the importer authorized the pull."
          },
          genuiNav("Open US Statements", "#payment-us-statements"),
          genuiPrompt("All items due today", "All items due today")
        ]
      },
      followUps: brokerHomeFollowUps("Today's Statements")
    });
  }

  function answerRecentOpsShipments(question) {
    if (!OPS_SHIPMENTS_INTENT.test(question)) {
      return null;
    }
    const tm = (window.KNUsShipments?.list?.() || []).slice(0, 5);
    const vis = (visSummary.newest || visSummary.rows || []).slice(0, 4);
    if (!tm.length && !vis.length) {
      return null;
    }
    return schemaAnswer({
      title: "Recent shipments in operations",
      thinking: [
        "Pulled Transaction Manager US Shipments",
        "Cross-checked live Visibility positions",
        "Flagged anything on hold or still NEW"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# Operations shipments" },
          {
            component: "TEXT",
            content: `**${tm.length || vis.length}** recent TM shipments plus **${vis.length}** live Visibility moves. Ocean is still the bulk of Jane's board.`
          },
          {
            component: "TABLE",
            headers: ["Shipment", "Importer", "MOT", "Status"],
            rows: (tm.length ? tm : vis).map((row) => [
              genuiLink(row.shipmentId || row.id, row.shipmentId ? "#transaction-us-shipments" : "#klearhub-visibility"),
              { component: "TEXT", value: row.companyName || row.company },
              { component: "TEXT", value: row.mot === "ocean" || row.mot === "OCEAN" ? "Ocean" : row.mot === "air" || row.mot === "AIR" ? "Air" : String(row.mot || "—") },
              { component: "BADGE", text: row.status || row.statusChip || "NEW", color: /hold|reject/i.test(row.status || "") ? "negative" : /progress|new|ready/i.test(row.status || row.statusChip || "") ? "notice" : "positive" }
            ])
          },
          vis.length
            ? {
                component: "TEXT",
                content: "### Visibility positions"
              }
            : { component: "SPACER" },
          vis.length
            ? {
                component: "TABLE",
                headers: ["ID", "Lane", "Container", "Status"],
                rows: vis.map((row) => [
                  genuiLink(row.id, "#klearhub-visibility"),
                  { component: "TEXT", value: `${row.origin?.city || "—"} → ${row.dest?.city || "—"}` },
                  { component: "TEXT", value: row.container || "—" },
                  { component: "BADGE", text: row.status, color: row.status === "On Hold" ? "negative" : "information" }
                ])
              }
            : { component: "SPACER" },
          {
            component: "ALERT",
            color: "information",
            title: "TM list vs Visibility board",
            description:
              "Transaction Manager is the filing queue. Visibility is the live milestone board. Open either record — this chat will not update a shipment."
          },
          genuiNav("Open US Shipments", "#transaction-us-shipments"),
          genuiNav("Open Visibility", "#klearhub-visibility")
        ]
      },
      followUps: brokerHomeFollowUps("Recent shipments in operations")
    });
  }

  function answerDueToday(question) {
    if (!DUE_TODAY_INTENT.test(question)) {
      return null;
    }
    const jane = janeQueue();
    const isfA = jane.pendingIsf[0];
    const isfB = jane.pendingIsf[1];
    const psc = jane.psc;
    return schemaAnswer({
      title: "All items due today",
      thinking: [
        "Scanned ISF filing deadlines closing today",
        "Cross-referenced today's statement payments",
        "Checked PSC windows closing today"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# Due today" },
          {
            component: "TEXT",
            content: `Here's what's due **${brokerTodayLong()}**: **2 ISF filings**, **1 statement payment**, and **1 PSC deadline**.`
          },
          {
            component: "GRID",
            columns: 2,
            gap: "small",
            children: [
              {
                component: "CARD",
                title: isfA ? isfA.transactionId : "ISF filing",
                description: isfA ? isfA.companyName : "Pending ISF",
                children: [
                  { component: "BADGE", text: "Due today", color: "notice" },
                  { component: "TEXT", content: isfA ? `Vessel **${isfA.vesselName}**. File before the 24-hour ISF cutoff.` : "No pending ISF." }
                ]
              },
              {
                component: "CARD",
                title: isfB ? isfB.transactionId : "ISF filing",
                description: isfB ? isfB.companyName : "Pending ISF",
                children: [
                  { component: "BADGE", text: "Due today", color: "notice" },
                  { component: "TEXT", content: isfB ? `MBL **${isfB.mbl}**. Still PENDING SUBMISSION.` : "Second ISF already filed." }
                ]
              },
              {
                component: "CARD",
                title: "Statement 26-0903-C",
                description: "ILLUMINATE USA LLC",
                children: [
                  { component: "AMOUNT", value: 42900, currency: "USD" },
                  { component: "BADGE", text: "ACH not authorized", color: "negative" },
                  { component: "TEXT", content: "Periodic daily statement posts today. Debit hits tomorrow." }
                ]
              },
              {
                component: "CARD",
                title: psc ? psc.transactionId : "PSC",
                description: psc ? `Entry ${psc.entryNumber}` : "PSC window",
                children: [
                  { component: "BADGE", text: "Window closes today", color: "negative" },
                  { component: "TEXT", content: psc ? `**${psc.companyName}** · ${psc.pscType}. 314-day window cannot be extended.` : "No PSC due." }
                ]
              }
            ]
          },
          { component: "TEXT", content: "### Queue" },
          {
            component: "TABLE",
            headers: ["Item", "Party", "Detail", "Status"],
            rows: [
              [
                isfA ? genuiLink("ISF filing", `#transaction-us-isf/history/${isfA.id}`) : { component: "TEXT", value: "ISF filing" },
                { component: "TEXT", value: isfA?.companyName || "—" },
                { component: "TEXT", value: isfA?.vesselName || "—" },
                { component: "BADGE", text: "Due today", color: "notice" }
              ],
              [
                isfB ? genuiLink("ISF filing", `#transaction-us-isf/history/${isfB.id}`) : { component: "TEXT", value: "ISF filing" },
                { component: "TEXT", value: isfB?.companyName || "—" },
                { component: "TEXT", value: isfB?.mbl || "—" },
                { component: "BADGE", text: "Due today", color: "notice" }
              ],
              [
                { component: "TEXT", value: "Statement" },
                { component: "TEXT", value: "ILLUMINATE USA LLC" },
                { component: "AMOUNT", value: 42900, currency: "USD" },
                { component: "BADGE", text: "No ACH", color: "negative" }
              ],
              [
                psc ? genuiLink("PSC", "#transaction-us-psc") : { component: "TEXT", value: "PSC" },
                { component: "TEXT", value: psc?.companyName || "—" },
                { component: "TEXT", value: psc?.entryNumber || "—" },
                { component: "BADGE", text: "Closes today", color: "negative" }
              ]
            ]
          },
          {
            component: "ALERT",
            color: "notice",
            title: "Start with the PSC",
            description: psc
              ? `${psc.transactionId} (${psc.entryNumber}) cannot be extended. After today the correction has to go through formal protest.`
              : "File the pending ISF records before vessel cutoff."
          },
          genuiPrompt("Post Summary Corrections", "Post Summary Corrections"),
          genuiNav("Open ISF", "#transaction-us-isf")
        ]
      },
      followUps: brokerHomeFollowUps("All items due today")
    });
  }

  function answerPostSummaryCorrections(question) {
    if (!POST_SUMMARY_CORRECTIONS_INTENT.test(question)) {
      return null;
    }
    const pscs = (window.KNUsPsc?.list?.() || []).slice(0, 8);
    const due = pscs[0];
    const valueAdj = pscs.find((row) => /in process/i.test(row.pscStatus || "")) || pscs[1];
    const usmca = pscs.find((row) => /ready/i.test(row.pscStatus || "")) || pscs[2];
    const origin = pscs.find((row) => /none/i.test(row.pscStatus || "") && row !== due) || pscs[3];
    const cards = [
      due && {
        component: "CARD",
        title: due.transactionId,
        description: `${due.companyName} · ${due.entryNumber}`,
        children: [
          { component: "BADGE", text: "Closes today", color: "negative" },
          { component: "TEXT", content: "HTS reclassification. 314-day window ends today — protest after that." }
        ]
      },
      valueAdj && {
        component: "CARD",
        title: valueAdj.transactionId,
        description: `${valueAdj.companyName} · ${valueAdj.entryNumber}`,
        children: [
          { component: "BADGE", text: valueAdj.pscStatus, color: "notice" },
          { component: "TEXT", content: "Value adjustment (transfer-pricing true-up). 12 days left." }
        ]
      },
      usmca && {
        component: "CARD",
        title: usmca.transactionId,
        description: `${usmca.companyName} · ${usmca.entryNumber}`,
        children: [
          { component: "BADGE", text: usmca.pscStatus, color: "information" },
          { component: "TEXT", content: "USMCA preference now qualifies. 45 days left." }
        ]
      },
      origin && {
        component: "CARD",
        title: origin.transactionId,
        description: `${origin.companyName} · ${origin.entryNumber}`,
        children: [
          { component: "BADGE", text: origin.pscStatus || "OPEN", color: "neutral" },
          { component: "TEXT", content: "Country of origin correction. 61 days left." }
        ]
      }
    ].filter(Boolean);
    return schemaAnswer({
      title: "Post Summary Corrections",
      thinking: [
        "Checked US PSC transactions still inside the 314-day window",
        "Sorted by how soon each window closes",
        "Mapped each row to a live Transaction Manager record"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# Post Summary Corrections" },
          {
            component: "TEXT",
            content: `**${cards.length} entries** are inside their PSC window with a pending reason. **${due?.transactionId || "The first row"}** has to file today.`
          },
          { component: "GRID", columns: 2, gap: "small", children: cards },
          {
            component: "TABLE",
            headers: ["Transaction", "Entry", "Importer", "Window"],
            rows: [
              due && [
                genuiLink(due.transactionId, "#transaction-us-psc"),
                { component: "TEXT", value: due.entryNumber },
                { component: "TEXT", value: due.companyName },
                { component: "BADGE", text: "Today", color: "negative" }
              ],
              valueAdj && [
                genuiLink(valueAdj.transactionId, "#transaction-us-psc"),
                { component: "TEXT", value: valueAdj.entryNumber },
                { component: "TEXT", value: valueAdj.companyName },
                { component: "BADGE", text: "12 days", color: "notice" }
              ],
              usmca && [
                genuiLink(usmca.transactionId, "#transaction-us-psc"),
                { component: "TEXT", value: usmca.entryNumber },
                { component: "TEXT", value: usmca.companyName },
                { component: "BADGE", text: "45 days", color: "information" }
              ],
              origin && [
                genuiLink(origin.transactionId, "#transaction-us-psc"),
                { component: "TEXT", value: origin.entryNumber },
                { component: "TEXT", value: origin.companyName },
                { component: "BADGE", text: "61 days", color: "neutral" }
              ]
            ].filter(Boolean)
          },
          {
            component: "ALERT",
            color: "notice",
            title: "File the HTS reclass first",
            description: due
              ? `${due.entryNumber} on ${due.companyName} cannot be extended. After today this becomes a 19 USC 1514 protest.`
              : "Open US PSC to continue the filing."
          },
          genuiNav("Open US PSC", "#transaction-us-psc"),
          genuiPrompt("All items due today", "All items due today")
        ]
      },
      followUps: brokerHomeFollowUps("Post Summary Corrections")
    });
  }

  function answerIsfDashboard(question) {
    if (!ISF_DASHBOARD_INTENT.test(question)) {
      return null;
    }
    const isf = window.KNUsIsf?.list?.() || [];
    const pending = isf.filter((row) => row.statusChip === "pending");
    const accepted = isf.filter((row) => row.statusChip === "submitted");
    const fin = isf.filter((row) => row.statusChip === "finBill");
    const sample = pending.slice(0, 4);
    return schemaAnswer({
      title: "ISF Dashboard",
      thinking: [
        `Counted ${isf.length.toLocaleString()} ISF transactions on file`,
        "Separated pending submission, accepted, and Fin Bill Match",
        "Listed the filings still short of the 24-hour vessel rule"
      ],
      schema: {
        components: [
          { component: "TEXT", content: "# ISF Dashboard" },
          {
            component: "TEXT",
            content: `**${isf.length.toLocaleString()}** ISF-10 records. **${pending.length.toLocaleString()}** pending submission, **${accepted.length.toLocaleString()}** accepted / replace-accepted, **${fin.length.toLocaleString()}** Fin Bill Match.`
          },
          {
            component: "GRID",
            columns: 3,
            gap: "small",
            children: [
              {
                component: "CARD",
                title: "Pending submission",
                description: "Still on Jane's desk",
                children: [
                  { component: "TEXT", content: `**${pending.length.toLocaleString()}**` },
                  { component: "BADGE", text: "Action", color: "notice" }
                ]
              },
              {
                component: "CARD",
                title: "Accepted",
                description: "ACE accepted / replaced",
                children: [
                  { component: "TEXT", content: `**${accepted.length.toLocaleString()}**` },
                  { component: "BADGE", text: "Clear", color: "positive" }
                ]
              },
              {
                component: "CARD",
                title: "Fin Bill Match",
                description: "Waiting on bill match",
                children: [
                  { component: "TEXT", content: `**${fin.length.toLocaleString()}**` },
                  { component: "BADGE", text: "Watch", color: "information" }
                ]
              }
            ]
          },
          { component: "TEXT", content: "### File these first" },
          {
            component: "TABLE",
            headers: ["ISF", "Importer", "Vessel / ETD", "Status"],
            rows: sample.map((row) => [
              genuiLink(row.transactionId, `#transaction-us-isf/history/${row.id}`),
              { component: "TEXT", value: row.companyName },
              { component: "TEXT", value: `${row.vesselName} · ${row.etd}` },
              { component: "BADGE", text: row.status, color: "notice" }
            ])
          },
          {
            component: "ALERT",
            color: "notice",
            title: "24-hour rule",
            description:
              "ISF-10 must be on file 24 hours before vessel departure. Pending submission rows are the only ones Jane can still complete from Transaction Manager today."
          },
          genuiNav("Open ISF Transaction Manager", "#transaction-us-isf"),
          genuiPrompt("Recent entries in my queue", "Recent entries in my queue")
        ]
      },
      followUps: brokerHomeFollowUps("ISF Dashboard")
    });
  }

  function answerBrokerHome(question) {
    return (
      answerPersonalDashboard(question) ||
      answerTodaysStatements(question) ||
      answerRecentOpsShipments(question) ||
      answerDueToday(question) ||
      answerPostSummaryCorrections(question) ||
      answerIsfDashboard(question) ||
      answerWorkingQueue(question)
    );
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

  function answerBrokerExpertise(question) {
    const expert = window.KNKnowledgeExpert?.answer?.(question);
    if (expert) {
      return expert;
    }
    const q = String(question || "").trim();
    if (/\b(hts|hs code|harmonized|classif(?:y|ication))\b/i.test(q)) {
      return {
        mode: "classification",
        title: "Classification result",
        thinking: [
          "Read the product description against GRI 1–3",
          "Checked heading 8708 versus 7326",
          "Cross-referenced ACE entry practice for this heading"
        ],
        leadIn:
          "Stamped steel auto body brackets from Mexico classify as motor-vehicle body parts, not generic articles of steel.",
        hts: "8708.29.5060",
        description: "Parts and accessories of bodies (including cabs): Other: Other",
        dutyRate: "2.5%",
        origin: "MX",
        preference: "USMCA if regional value content is documented",
        confidence: "high",
        action: { type: "apply-hts", label: "Apply this HS code", data: { hts: "8708.29.5060" } },
        followUps: [
          { label: "Duty estimate", prompt: "Estimate duty for this classification" },
          { label: "ACE status", prompt: "What is the ACE status for today's entries?" }
        ]
      };
    }
    if (/\b(duty|duties|landed cost)\b/i.test(q)) {
      return {
        mode: "duty",
        title: "Duty estimate",
        thinking: [
          "Applied the classified heading and rate",
          "Checked MPF and HMF on the entered value",
          "Left preference unverified until RVC support is on file"
        ],
        leadIn: "Estimate only — not an ACE liquidation. Confirm entered value and any USMCA claim before you file.",
        currency: "USD",
        total: 1840,
        lines: [
          { label: "Merchandise duty (2.5%)", amount: 1250 },
          { label: "MPF", amount: 485 },
          { label: "HMF", amount: 105 }
        ],
        followUps: [
          { label: "Classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" },
          { label: "ACE status", prompt: "What is the ACE status for today's entries?" }
        ]
      };
    }
    if (/\b(ace|entry status|clear to file|entry filing)\b/i.test(q) && !PERSONAL_DASHBOARD_INTENT.test(q)) {
      return {
        mode: "entry-status",
        title: "ACE entry status",
        thinking: [
          "Pulled today's broker queue against ACE status",
          "Flagged holds that still block filing",
          "Listed entries that are clear to file"
        ],
        leadIn: "ACE snapshot for this workspace — file only after you confirm documents on the entry.",
        headers: ["Entry", "Importer", "ACE status", "Action"],
        rows: [
          ["KX-M3Q8-21", "Acme Corp", { component: "BADGE", text: "Clear to file", color: "positive" }, "Ready"],
          ["74-8823019", "ILLUMINATE USA", { component: "BADGE", text: "PGA hold", color: "notice" }, "FDA referral"],
          ["ISF-4412", "Northline", { component: "BADGE", text: "ISF late", color: "negative" }, "Document delay"]
        ],
        followUps: [
          { label: "Personal dashboard", prompt: "Show my personal dashboard" },
          { label: "Classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" }
        ]
      };
    }
    return null;
  }

  function answer(question, pageContext) {
    const context = isOpen && panelContext ? panelContext : pageContext || getContext();
    const q = String(question || "").trim();
    syncContextChip(context);
    const brokerHome = answerBrokerHome(q);
    if (brokerHome) {
      return brokerHome;
    }
    const brokerExpertise = answerBrokerExpertise(q);
    if (brokerExpertise) {
      return brokerExpertise;
    }
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
    const opsKind = /^(dashboard|visibility|visibility-detail|overview|isf|entry|in-bond|ftz|psc|delivery-order|tm-shipment|export|statement-detail|statements|statement-approval)$/.test(
      context.kind || ""
    );
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
        text: "Klear Agent is not a general knowledge tool. Open a record — a shipment, ISF, or entry — and ask about that filing.",
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
          text: `On **User Management**:\n\n- **Customer**: **${split.customer || 0}**\n- **Sub-customer**: **${split.subCustomer || 0}**\n- **Company**: **${split.company || 0}**\n- **Parties**: **${split.parties || 0}**\n- **Inactive**: **${split.inactive || 0}**`,
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
          text: `I do not explain inheritance as a general concept. On **Role Management**, open a template${top ? ` such as **${top.name}**` : ""} and ask who inherits it, or what its coverage is.`,
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
        body += `\nInheritance here means customer and broker workspaces pick up this template’s access when attached — it is not a general RBAC lecture. Open **${role.name}** on **Role Management** to review the drawer.`;
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
          text: `**${target.name}** has the ${role ? "current" : "highest"} inheritance on **Role Management**, with **${inheritCount(target)}** workspace${inheritCount(target) === 1 ? "" : "s"}.\n\n- Coverage: **${targetCov.ratio}** permissions${targetCov.mostly ? `, mostly in **${targetCov.mostly}**` : ""}\n${names.length ? `- Named examples: **${formatList(names)}**\n` : ""}${target.active === false ? "- The template is **inactive**, but inheritance counts can still show.\n" : ""}\nOpen **${target.name}** to inspect the drawer. I will not attach or detach customers from here.`,
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
          text: `${lines.join("\n")}\n\nTurning a template off does not automatically detach customers. Review them in **Role Management**.`,
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
        return schemaAnswer({
          title: "Shipments needing action",
          thinking: [`Checked live shipment counts on ${context.area}`],
          schema: {
            components: [
              {
                component: "GRID",
                columns: 3,
                gap: "small",
                children: [
                  {
                    component: "CARD",
                    title: "Need action",
                    children: [{ component: "TEXT", content: `**${stats.action}** of **${stats.total}** active shipments` }]
                  },
                  {
                    component: "CARD",
                    title: "On hold",
                    children: [{ component: "BADGE", text: String(stats.hold), color: stats.hold ? "notice" : "positive" }]
                  },
                  {
                    component: "CARD",
                    title: "Delayed",
                    children: [{ component: "BADGE", text: String(stats.delayed), color: stats.delayed ? "negative" : "positive" }]
                  }
                ]
              },
              {
                component: "TEXT",
                content: "Open **Visibility** to work the exceptions; I cannot clear them here."
              },
              genuiNav("Open Visibility", "#klearhub-visibility")
            ]
          },
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
        text: `I do not have a general encyclopedia answer for that. ${hrefHint ? `Stay on **${context.area || "this page"}** and ask about a specific record or count you can see.` : "Open Role Management or KN Role Management, select a record, and ask again."}`,
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

  function beginPanelSession() {
    const context = window.KNAssistCore?.getContext?.() || getContext();
    panelContext = context;
    panelScopeKey = window.KNAssistCore?.sessionKey?.(context) || context?.scopeKey || "";
    if (panelScopeKey && window.KNThreadStore?.activateScope) {
      window.KNThreadStore.activateScope(panelScopeKey);
    } else if (panelScopeKey && window.KNThreadStore?.ensureScopedThread) {
      window.KNThreadStore.ensureScopedThread({
        title: context?.headline || context?.title || "Conversation",
        scopeKey: panelScopeKey,
        surface: "panel"
      });
    }
    return context;
  }

  function resetPanelSession() {
    panelScopeKey = "";
    panelContext = null;
    if (history) {
      history.innerHTML = "";
    }
  }

  function openPanel(trigger) {
    if (!window.KNAssistCore?.isPanelRoute?.()) {
      return;
    }
    lastTrigger = trigger || lastTrigger;
    dismissCoachmark();
    const context = beginPanelSession();
    isOpen = true;
    shell.classList.add("ai-assistant-open");
    setExpandedState(true);
    updateWidth(preferredWidth);
    syncContextChip(context);
    syncOpsFlags();
    refreshGhostSuggestions(context);
    const restored = restoreDrawerTranscript();
    if (!restored) {
      hideIntro();
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

  function expandPanelToFullPage() {
    if (!isOpen) {
      return;
    }
    const context = panelContext || window.KNAssistCore?.getContext?.() || getContext();
    const scopeKey = panelScopeKey || window.KNAssistCore?.sessionKey?.(context) || context?.scopeKey || "";
    const title = context?.headline || context?.title || "Conversation";
    if (window.KNThreadStore?.prepareFullPageHandoff) {
      window.KNThreadStore.prepareFullPageHandoff({
        scopeKey,
        title,
        context: window.KNAssistCore?.handoffContext?.(context, location.hash) || {
          title: context?.title || "",
          headline: context?.headline || "",
          area: context?.area || "",
          kind: context?.kind || "",
          route: location.hash
        }
      });
    } else if (scopeKey && window.KNThreadStore?.ensureScopedThread) {
      window.KNThreadStore.ensureScopedThread({
        title,
        scopeKey,
        surface: "panel"
      });
    }
    closePanel();
    navigateToFullPageAssist();
  }

  function navigateToFullPageAssist() {
    const link = document.querySelector('.side-nav-link[href="#agentic-broker"]');
    if (link) {
      link.click();
      return;
    }
    location.hash = "#agentic-broker";
  }

  function focusFullPageComposer() {
    const input = document.getElementById("agentic-thread-input");
    input?.focus();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (window.KNAssistCore?.isFullPageAssist?.()) {
        focusFullPageComposer();
        return;
      }
      if (window.KNAssistCore?.isPanelRoute?.()) {
        if (isOpen) {
          closePanel();
          return;
        }
        openPanel(trigger);
        return;
      }
      navigateToFullPageAssist();
    });
  });

  closeBtn?.addEventListener("click", closePanel);
  const expandBtn = document.getElementById("ai-assistant-expand");
  if (expandBtn && !document.querySelector('.side-nav-link[href="#agentic-broker"]')) {
    expandBtn.hidden = true;
  }
  expandBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    expandPanelToFullPage();
  });

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
    const shipmentOpen = event.target.closest("[data-ai-shipment-open]");
    if (shipmentOpen && panel.contains(shipmentOpen)) {
      window.KNAiSuggest?.logAudit?.({
        action: "open-shipment-from-queue",
        context: "assistant",
        field: "isf",
        origin: "manual",
        value: shipmentOpen.getAttribute("data-ai-shipment-open") || ""
      });
      return;
    }
    const findingOpen = event.target.closest("[data-ai-finding-open]");
    if (findingOpen && panel.contains(findingOpen)) {
      event.preventDefault();
      const fieldKey = findingOpen.getAttribute("data-ai-finding-open") || "";
      window.KNIsfDetail?.focusField?.(fieldKey);
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
          // FLAG: 1600ms copied hold — no delay token.
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
    const prompt = chip.getAttribute("data-ai-prompt") || chip.textContent;
    const actionRaw = chip.getAttribute("data-ai-action");
    if (actionRaw) {
      try {
        const action = JSON.parse(actionRaw);
        if (window.KNAssistCore?.runPageAction?.(action)) {
          sendQuestion(prompt);
          return;
        }
      } catch (_error) {
        /* ignore malformed action payload */
      }
    }
    sendQuestion(prompt);
  });

  refChipDismiss?.addEventListener("click", (event) => {
    event.preventDefault();
    refChipDismissed = true;
    refChipDismissedForScope = refChipScopeKey(panelContextForUi());
    syncContextChip(panelContextForUi());
  });

  refChipRestore?.addEventListener("click", (event) => {
    event.preventDefault();
    refChipDismissed = false;
    refChipDismissedForScope = "";
    syncContextChip(panelContextForUi());
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    const maxHeight = parseFloat(getComputedStyle(input).maxHeight) || Infinity;
    const next = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${next}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
    clearInputError();
    updateSendControl();
    syncGhostSuggestion();
  });
  input.addEventListener("keydown", (event) => {
    if (window.KNAgentGhost?.handleKeydown?.(event)) {
      return;
    }
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

  inputErrorDismiss?.addEventListener("click", (event) => {
    event.preventDefault();
    clearInputError();
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
      showInputError("Enter a question to ask Klear Agent.");
      return;
    }
    clearInputError();
    panelGhost?.recordSubmitted?.(question);
    const genId = ++generationId;
    fadeOutEmptySurfaces();
    const userId = `msg-user-${Date.now()}`;
    addMessage("user", question, { id: userId });
    persistDrawerUser(userId, question);
    input.value = "";
    syncGhostSuggestion();
    updateSendControl();
    setResponding(true);
    // Resolve grounding AFTER the delay so chip + answer + presentResult share one fresh context.
    setThinking(true, getContext());
    try {
      await delay(prefersReducedMotion() ? 120 : 1100);
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
        persistDrawerAssistant(
          { text: "I could not process that request right now. Please try again." },
          {},
          "error"
        );
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
    window.KNAssistCore?.syncTriggerVisibility?.(shell);
    const nextKey = window.KNAssistCore?.sessionKey?.() || "";
    const leftRecord = Boolean(isOpen && panelScopeKey && nextKey !== panelScopeKey);
    const onFullPage = Boolean(window.KNAssistCore?.isFullPageAssist?.());
    if (leftRecord || (isOpen && onFullPage)) {
      closePanel();
      resetPanelSession();
    }
    const context = isOpen && panelContext ? panelContext : getContext();
    syncContextChip(context);
    syncOpsFlags();
    refreshGhostSuggestions(context);
    showCoachmark();
    if (!isOpen) {
      return;
    }
    if (introEl && !introEl.hidden) {
      fillIntro(context);
      return;
    }
    if (!history.querySelector(".ai-msg")) {
      renderEmptyState();
    }
  }

  window.addEventListener("hashchange", onAssistantRouteChange);
  // Sidenav uses history.replaceState via setRouteHash — no hashchange fires.
  window.addEventListener("kn-route-change", onAssistantRouteChange);

  document.addEventListener("keydown", (event) => {
    if (window.KNAssistCore?.isAssistShortcut?.(event)) {
      event.preventDefault();
      event.stopPropagation();
      if (window.KNAssistCore?.isFullPageAssist?.()) {
        focusFullPageComposer();
        return;
      }
      if (window.KNAssistCore?.isPanelRoute?.()) {
        if (!isOpen) {
          openPanel(triggers[0]);
        } else {
          input.focus();
        }
        return;
      }
      navigateToFullPageAssist();
      return;
    }
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

  window.KNAssistant = {
    isOpen: () => isOpen,
    open: (trigger) => openPanel(trigger || lastTrigger || triggers[0]),
    ask: (text, opts = {}) => {
      openPanel(opts.trigger || lastTrigger || triggers[0]);
      window.requestAnimationFrame(() => sendQuestion(text));
    },
    answer: (text) => answer(text, getContext()),
    renderText: (text, context) => renderAssistantMarkdown(text, context || getContext()),
    thinkingPanel: (steps, expanded, opts) => thinkingPanelHtml(steps, expanded, opts)
  };

  document.addEventListener("kn-genui-action", (event) => {
    const hts = event.detail?.data?.hts;
    if ((event.detail?.type === "apply-hts" || hts) && event.target?.closest?.("#ai-assistant-panel")) {
      showKnToast?.({
        content: hts ? `HS ${hts} is noted. Filing still happens on the entry form.` : "Classification noted. Filing still happens on the entry form.",
        color: "positive"
      });
      return;
    }
    const prompt = event.detail?.data?.prompt;
    if (!prompt || !event.target?.closest?.("#ai-assistant-panel")) {
      return;
    }
    window.KNAssistant.ask(prompt);
  });

  updateWidth(preferredWidth);
  setExpandedState(false);
  initPanelGhost();
  updateSendControl();
  window.KNAssistCore?.syncTriggerVisibility?.(shell);
  syncContextChip();
  syncOpsFlags();
  window.requestAnimationFrame(() => showCoachmark());
}

hydrateKnAvatars();
hydrateKnAppBars();
hydrateKnBadges();
hydrateKnHeaders();
hydrateKnMenus();
hydrateKnMotion();
hydrateKnBottomNavs();
hydrateKnBottomSheets();
hydrateKnBoxes();
hydrateKnBreadcrumbs();
hydrateKnButtons();
hydrateKnFabs();
hydrateKnCharts();
hydrateKnCheckboxes();
hydrateKnRadios();
hydrateKnSwitches();
hydrateKnChips();
hydrateKnFilterChips();
hydrateKnTags();
hydrateKnCounters();
hydrateKnCounterInputs();
hydrateKnCollapsibles();
hydrateKnConfirmations();
hydrateKnCreations();
hydrateKnDatePickers();
hydrateKnDropdowns();
hydrateKnDetailedViews();
hydrateKnDividers();
hydrateKnDrawers();
hydrateKnEmpties();
hydrateKnFileUploads();
hydrateKnForms();
hydrateKnSearchInputs();
hydrateKnPhones();
hydrateKnChatInputs();
hydrateKnChatMessages();
hydrateDashFromVisibility();
initKnTooltips();
initDashboardLoader();
initDashboardLayout();
initHoldDrawer();
initDashDatePicker();
initAiAssistant();

document.querySelector(".top-nav-brand-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  const trigger =
    document.getElementById("ai-assistant-trigger") || document.getElementById("ai-assistant-trigger-mobile");
  trigger?.click();
});
