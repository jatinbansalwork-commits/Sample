let visibilityMap = null;
let visMarkerLayer = null;
let visMapUxIds = [];

const VIS_MOT_ICONS = {
  ocean:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18l-2-6H8L3 17Z"/><path d="M8 11V7h8l2 4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"/></svg>',
  truck:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3V7Z"/><path d="M14 10h4l3 3v3h-7v-6Z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
  rail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 16v3M16 16v3M6 21h12"/><path d="M8 8h8"/></svg>'
};

const visShipments = window.KNShipments;

function getHashPath(hash = location.hash) {
  return (hash || "#dashboard").split("?")[0];
}

function getHashParams(hash = location.hash) {
  return new URLSearchParams((hash || "").split("?")[1] || "");
}

const visState = {
  view: "cards",
  mot: "all",
  record: "all",
  direction: "all",
  risk: "all",
  riskByView: { cards: "all", table: "all" },
  sort: "newest",
  query: "",
  col: {
    id: "",
    container: "",
    masterBill: "",
    hbol: "",
    po: "",
    status: "",
    pol: "",
    etd: "",
    pou: "",
    eta: ""
  },
  page: 1,
  pageSize: 100,
  selectedId: visShipments[0].id,
  detailId: getHashParams().get("id") || "",
  detailTab: getHashParams().get("tab") || "information"
};

function getInitialVisView() {
  return getHashParams().get("view") === "table" ? "table" : "cards";
}

function persistVisViewHash(view) {
  if (getHashPath() !== "#klearhub-visibility") {
    return;
  }
  const params = getHashParams();
  if (view === "table") {
    params.set("view", "table");
  } else {
    params.delete("view");
  }
  if (visState.detailId) {
    params.set("id", visState.detailId);
  } else {
    params.delete("id");
  }
  if (visState.detailId && visState.detailTab && visState.detailTab !== "information") {
    params.set("tab", visState.detailTab);
  } else {
    params.delete("tab");
  }
  const query = params.toString();
  history.replaceState(null, "", query ? `#klearhub-visibility?${query}` : "#klearhub-visibility");
}

function setVisRisk(risk) {
  visState.risk = risk || "all";
  visState.riskByView[visState.view] = visState.risk;
}

const VIS_CARD_PAGE_SIZE = 4;
const VIS_TABLE_PAGE_SIZES = [10, 25, 50, 100];

function getVisPageSize() {
  return visState.view === "table" ? visState.pageSize : VIS_CARD_PAGE_SIZE;
}

const visMotLabels = { all: "All", ocean: "Ocean", air: "Air", truck: "Truck", rail: "Rail" };
const visRecordLabels = { all: "Consolidated", shipment: "Shipments", container: "Containers" };
const visSortLabels = {
  newest: "Created date (newest first)",
  oldest: "Created date (oldest first)"
};

function closeVisMenus(exceptId) {
  document.querySelectorAll("#klearhub-visibility-page .vis-menu__list").forEach((menu) => {
    if (menu.id === exceptId) {
      return;
    }
    menu.hidden = true;
    const trigger = document.querySelector(`[aria-controls="${menu.id}"]`);
    trigger?.setAttribute("aria-expanded", "false");
  });
}

function visMatchesQuery(item, query) {
  if (!query) {
    return true;
  }
  const haystack = [
    item.id,
    item.company,
    item.container,
    item.po,
    item.mbol,
    item.masterBill,
    item.hbol,
    item.status,
    item.statusSecondary,
    item.polLabel,
    item.pouLabel,
    item.etdLabel,
    item.etaLabel,
    item.origin.city,
    item.origin.code,
    item.dest.city,
    item.dest.code,
    item.destCountry
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function isActionNeeded(item) {
  if (typeof window.knIsActionNeeded === "function") {
    return window.knIsActionNeeded(item);
  }
  return item.statusTone === "negative" || item.delayTone === "negative" || item.status === "On Hold";
}

function knIsAtDestination(item) {
  return /port of delivery|ready for pickup/i.test(item.status || "");
}

function knIsWaitingToDepart(item) {
  return /waiting to depart/i.test(item.status || "");
}

function knMatchesInTransit(item) {
  return typeof knIsInTransit === "function" ? knIsInTransit(item) : /enroute|in transit/i.test(item.status || "");
}

function matchesVisRisk(item, risk) {
  if (risk === "all") {
    return true;
  }
  if (risk === "action") {
    return isActionNeeded(item);
  }
  if (risk === "arrived") {
    return knIsAtDestination(item);
  }
  if (risk === "hold") {
    return item.status === "On Hold";
  }
  if (risk === "delayed") {
    return item.delayTone === "negative";
  }
  if (risk === "waiting") {
    return knIsWaitingToDepart(item);
  }
  if (risk === "transit") {
    return knMatchesInTransit(item);
  }
  if (risk === "ontime") {
    return !isActionNeeded(item);
  }
  return true;
}

function visColValue(item, key) {
  const extra = {
    container: item.extraContainers ? `+${item.extraContainers}` : "",
    po: item.extraPo ? `+${item.extraPo}` : "",
    status: item.statusSecondary || ""
  };
  const values = {
    id: item.id,
    container: `${item.container} ${extra.container}`,
    masterBill: item.masterBill,
    hbol: item.hbol,
    po: `${item.po} ${extra.po}`,
    status: `${item.status} ${extra.status}`,
    pol: item.polLabel,
    etd: item.etdLabel,
    pou: item.pouLabel,
    eta: item.etaLabel
  };
  return String(values[key] || "").toLowerCase();
}

function visMatchesColFilters(item) {
  return Object.entries(visState.col).every(([key, value]) => {
    if (!value) {
      return true;
    }
    return visColValue(item, key).includes(value.trim().toLowerCase());
  });
}

function getVisBaseRows() {
  const query = visState.query.trim().toLowerCase();
  const rows = visShipments.filter((item) => {
    if (visState.mot !== "all" && item.mot !== visState.mot) {
      return false;
    }
    if (visState.record !== "all" && item.record !== visState.record) {
      return false;
    }
    if (visState.direction !== "all" && item.direction !== visState.direction) {
      return false;
    }
    return visMatchesQuery(item, query) && visMatchesColFilters(item);
  });
  rows.sort((a, b) => {
    const delta = new Date(a.created) - new Date(b.created);
    return visState.sort === "newest" ? delta * -1 : delta;
  });
  return rows;
}

function getFilteredVisShipments() {
  return getVisBaseRows().filter((item) => matchesVisRisk(item, visState.risk));
}

function getVisRiskCounts() {
  const rows = getVisBaseRows();
  return {
    all: rows.length,
    action: rows.filter((item) => isActionNeeded(item)).length,
    arrived: rows.filter((item) => knIsAtDestination(item)).length,
    hold: rows.filter((item) => item.status === "On Hold").length,
    delayed: rows.filter((item) => item.delayTone === "negative").length,
    transit: rows.filter((item) => knMatchesInTransit(item)).length,
    waiting: rows.filter((item) => knIsWaitingToDepart(item)).length,
    ontime: rows.filter((item) => !isActionNeeded(item)).length
  };
}

function getPagedVisShipments() {
  const rows = getFilteredVisShipments();
  const pageSize = getVisPageSize();
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (visState.page > totalPages) {
    visState.page = totalPages;
  }
  const start = (visState.page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    totalPages
  };
}

function getVisShipmentPage(id) {
  const index = getFilteredVisShipments().findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  return Math.floor(index / getVisPageSize()) + 1;
}

function revealVisShipmentInList(id) {
  const page = getVisShipmentPage(id);
  if (page == null) {
    return false;
  }
  visState.page = page;
  return true;
}

function scrollVisShipmentIntoView(id) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduceMotion ? "auto" : "smooth";
  if (visState.view === "table") {
    document.querySelector(`#vis-table-body tr[data-vis-id="${id}"]`)?.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "nearest"
    });
    return;
  }
  const list = document.getElementById("vis-card-list");
  const card = document.getElementById(`vis-card-${id}`);
  if (!list || !card) {
    return;
  }
  const listRect = list.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const visible = cardRect.top >= listRect.top && cardRect.bottom <= listRect.bottom;
  if (visible) {
    return;
  }
  const offset = card.offsetTop - Math.max(0, (list.clientHeight - card.offsetHeight) / 2);
  list.scrollTo({ top: Math.max(0, offset), behavior });
}

function badgeClass(tone) {
  const intense = tone === "negative" || tone === "notice" ? " badge--intense" : "";
  return `badge badge--${tone}${intense} type-caption-sm type-weight-medium`;
}

function renderVisEmpty() {
  return `
    <div class="empty-state vis-empty-state">
      <h2 class="type-heading-h5 type-weight-semibold">No shipments match</h2>
      <p class="type-body-sm">Try another MOT, direction, or search term — or reset filters to see the live list.</p>
      <button class="btn btn--secondary btn--sm type-ui-sm" type="button" data-vis-reset>Reset filters</button>
    </div>
  `;
}

function renderVisCard(item) {
  const selected = item.id === visState.selectedId;
  const action = isActionNeeded(item);
  const cardId = `vis-card-${item.id}`;
  return `
    <article
      class="vis-card${selected ? " is-selected" : ""}"
      id="${cardId}"
      role="option"
      data-vis-id="${item.id}"
      tabindex="${selected ? "0" : "-1"}"
      aria-selected="${selected}"
      aria-label="${item.id} ${item.direction}, ${item.company}"
    >
      <header class="vis-card__head">
        <span class="kpi-card__icon vis-card__icon" aria-hidden="true">${VIS_MOT_ICONS[item.mot]}</span>
        <div class="vis-card__copy">
          <p class="vis-card__id type-heading-h6 type-weight-semibold">
            ${action ? '<span class="indicator indicator--negative" aria-hidden="true"></span>' : ""}
            ${visCopyControl(item.id, "Shipment ID")}
            <span class="badge badge--information type-caption-sm type-weight-medium">${item.direction}</span>
          </p>
          <p class="vis-card__company type-body-sm">${item.company}</p>
        </div>
        <div class="vis-card__badges">
          <span class="${badgeClass(item.statusTone)}">${item.status}</span>
          <span class="${badgeClass(item.delayTone)}">${item.delay}</span>
        </div>
      </header>
      <div class="vis-card__route">
        <div class="vis-card__port">
          <strong class="type-ui-sm type-weight-semibold"><span aria-hidden="true">${item.origin.flag}</span> ${item.origin.city} (${item.origin.code})</strong>
          <span class="type-caption-sm">${item.origin.date}</span>
        </div>
        <svg class="vis-card__arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
          <path d="M3 12h18M15 6l6 6-6 6" />
        </svg>
        <div class="vis-card__port">
          <strong class="type-ui-sm type-weight-semibold"><span aria-hidden="true">${item.dest.flag}</span> ${item.dest.city} (${item.dest.code})</strong>
          <span class="type-caption-sm">${item.dest.date}</span>
        </div>
      </div>
      <hr class="vis-card__divider" />
      <dl class="vis-card__refs">
        <div>
          <dt class="type-caption-sm">Container</dt>
          <dd>${visCopyControl(item.container, "Container")}</dd>
        </div>
        <div>
          <dt class="type-caption-sm">PO</dt>
          <dd>${visCopyControl(item.po, "PO")}</dd>
        </div>
        <div>
          <dt class="type-caption-sm">MBOL</dt>
          <dd class="type-ui-sm type-weight-semibold">${item.mbol}</dd>
        </div>
      </dl>
    </article>
  `;
}

function visCopyControl(value, label) {
  return `<span class="vis-copy-cluster">
    <button class="vis-copy-value type-ui-sm type-weight-semibold" type="button" data-copy="${value}" data-copy-label="${label}">${value}</button>
    <button class="icon-btn vis-copy-btn" type="button" data-copy="${value}" data-copy-label="${label}" aria-label="Copy ${label}" data-tooltip="Copy ${label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
  </span>`;
}

function visCopyCode(value, label) {
  return `<span class="vis-copy-cluster">
    <button class="code vis-copy-value type-caption-sm" type="button" data-copy="${value}" data-copy-label="${label}">${value}</button>
    <button class="icon-btn vis-copy-btn" type="button" data-copy="${value}" data-copy-label="${label}" aria-label="Copy ${label}" data-tooltip="Copy ${label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
  </span>`;
}

function visPlusCount(count) {
  return count ? `<span class="vis-plus type-caption-sm type-weight-medium">+${count}</span>` : "";
}

function renderVisTable(rows) {
  const body = document.getElementById("vis-table-body");
  const table = document.getElementById("vis-table");
  if (!body || !table) {
    return;
  }
  const wrap = table.parentElement;
  if (rows.length === 0) {
    table.hidden = true;
    if (wrap && !wrap.querySelector(".vis-empty-state")) {
      wrap.insertAdjacentHTML("afterbegin", renderVisEmpty());
    }
    body.replaceChildren();
    return;
  }
  table.hidden = false;
  wrap?.querySelector(".vis-empty-state")?.remove();
  body.innerHTML = rows
    .map((item) => {
      const selected = item.id === visState.selectedId;
      const secondary = item.statusSecondary
        ? `<span class="badge badge--${item.statusSecondaryTone || "notice"} type-caption-sm type-weight-medium">${item.statusSecondary}</span>`
        : "";
      return `
        <tr class="${selected ? "is-selected" : ""}" data-vis-id="${item.id}" tabindex="0" aria-selected="${selected}">
          <th scope="row">
            <span class="vis-id-cell">
              ${isActionNeeded(item) ? '<span class="indicator indicator--negative" aria-hidden="true"></span>' : ""}
              <button class="blade-link vis-id-link type-ui-sm type-weight-medium" type="button">${item.id}</button>
              <button class="icon-btn vis-copy-btn" type="button" data-copy="${item.id}" data-copy-label="Shipment ID" aria-label="Copy shipment ID" data-tooltip="Copy shipment ID">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </span>
          </th>
          <td>${visCopyCode(item.container, "Container")} ${visPlusCount(item.extraContainers)}</td>
          <td><span class="code type-caption-sm">${item.masterBill}</span></td>
          <td><span class="code type-caption-sm">${item.hbol || "N/A"}</span></td>
          <td>
            <span class="vis-mot-cell" data-tooltip="${visMotLabels[item.mot] || item.mot}">
              ${VIS_MOT_ICONS[item.mot] || ""}
              <span class="visually-hidden">${visMotLabels[item.mot] || item.mot}</span>
            </span>
          </td>
          <td>${visCopyCode(item.po, "PO")} ${visPlusCount(item.extraPo)}</td>
          <td>
            <span class="vis-status-stack">
              <span class="badge badge--${item.statusTone} type-caption-sm type-weight-medium">${item.status}</span>
              ${secondary}
            </span>
          </td>
          <td class="type-body-sm">${item.polLabel}</td>
          <td class="type-body-sm vis-table__date">${item.etdLabel}</td>
          <td class="type-body-sm">${item.pouLabel}</td>
          <td class="type-body-sm vis-table__date">${item.etaLabel}</td>
          <td>
            <span class="vis-country type-body-sm"><span class="vis-country__flag" aria-hidden="true">${item.dest.flag}</span>${item.destCountry}</span>
          </td>
          <td class="type-body-sm">${item.company}</td>
        </tr>
      `;
    })
    .join("");
}

function renderVisPagination(target, total, totalPages) {
  if (!target) {
    return;
  }
  const pageSize = getVisPageSize();
  const start = total === 0 ? 0 : (visState.page - 1) * pageSize + 1;
  const end = Math.min(visState.page * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const showSizePicker = target.id === "vis-table-pagination";
  target.innerHTML = `
    <p class="type-caption-sm vis-pagination__label">Showing ${start} to ${end} of ${total} records</p>
    <div class="vis-pagination__pages">
      <button class="icon-btn" type="button" data-vis-page="first" aria-label="First page" data-tooltip="First page" ${visState.page === 1 ? "disabled" : ""}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M12 3 6 8l6 5M6 3v10"/></svg>
      </button>
      <button class="icon-btn" type="button" data-vis-page="prev" aria-label="Previous page" data-tooltip="Previous page" ${visState.page === 1 ? "disabled" : ""}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
      </button>
      ${pages
        .map(
          (page) =>
            `<button class="btn ${page === visState.page ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" data-vis-page="${page}" aria-current="${page === visState.page ? "page" : "false"}">${page}</button>`
        )
        .join("")}
      <button class="icon-btn" type="button" data-vis-page="next" aria-label="Next page" data-tooltip="Next page" ${visState.page === totalPages ? "disabled" : ""}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
      </button>
      <button class="icon-btn" type="button" data-vis-page="last" aria-label="Last page" data-tooltip="Last page" ${visState.page === totalPages ? "disabled" : ""}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 3l6 5-6 5M10 3v10"/></svg>
      </button>
    </div>
    ${
      showSizePicker
        ? `<div class="vis-pagination__size vis-menu vis-menu--end">
      <span class="type-caption-sm vis-pagination__label">Rows</span>
      <button class="btn btn--secondary btn--sm type-ui-sm" type="button" data-vis-size-trigger aria-haspopup="listbox" aria-expanded="false" aria-label="Rows per page">${visState.pageSize}</button>
      <div class="menu-overlay vis-menu__list" hidden role="listbox" aria-label="Rows per page">
        ${VIS_TABLE_PAGE_SIZES.map(
          (size) =>
            `<button class="action-list-item type-ui-sm" type="button" role="option" data-vis-page-size="${size}" aria-selected="${size === visState.pageSize}">${size}</button>`
        ).join("")}
      </div>
    </div>`
        : ""
    }
  `;
}

function visTriggerText(button) {
  return Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
}

function syncVisFilterLabels() {
  const motTrigger = document.getElementById("vis-mot-trigger");
  const recordTrigger = document.getElementById("vis-record-trigger");
  const sortTrigger = document.getElementById("vis-sort-trigger");
  const directionTrigger = document.getElementById("vis-direction-trigger");
  const motText = motTrigger ? visTriggerText(motTrigger) : null;
  const recordText = recordTrigger ? visTriggerText(recordTrigger) : null;
  const sortText = sortTrigger ? visTriggerText(sortTrigger) : null;
  const directionText = directionTrigger ? visTriggerText(directionTrigger) : null;
  if (motText) {
    motText.textContent = `MOT: ${visMotLabels[visState.mot]} `;
  }
  if (recordText) {
    recordText.textContent = `View: ${visRecordLabels[visState.record] || visState.record} `;
  }
  if (sortText) {
    sortText.textContent = ` ${visSortLabels[visState.sort]}`;
  }
  if (directionText) {
    directionText.textContent = `${visState.direction === "all" ? "All" : visState.direction} `;
  }
  document.querySelectorAll("[data-vis-mot]").forEach((item) => {
    item.setAttribute("aria-selected", String(item.getAttribute("data-vis-mot") === visState.mot));
  });
  document.querySelectorAll("[data-vis-record]").forEach((item) => {
    item.setAttribute("aria-selected", String(item.getAttribute("data-vis-record") === visState.record));
  });
  document.querySelectorAll("[data-vis-sort]").forEach((item) => {
    item.setAttribute("aria-selected", String(item.getAttribute("data-vis-sort") === visState.sort));
  });
  document.querySelectorAll("[data-vis-direction]").forEach((item) => {
    item.setAttribute("aria-selected", String(item.getAttribute("data-vis-direction") === visState.direction));
  });
}

function renderVisibilityMapMarkers(rows, { fit = false } = {}) {
  if (!visibilityMap || typeof L === "undefined") {
    return;
  }
  if (visMarkerLayer) {
    visMapUxIds.forEach((id) => window.KNMapUx?.detach(visibilityMap, id));
    visMapUxIds = [];
    visMarkerLayer.clearLayers();
  } else {
    visMarkerLayer = L.layerGroup().addTo(visibilityMap);
  }

  const clusters = new Map();
  rows.forEach((item) => {
    const key = `${item.mot}:${Math.round(item.lat / 8) * 8}:${Math.round(item.lng / 8) * 8}`;
    if (!clusters.has(key)) {
      clusters.set(key, { mot: item.mot, lat: 0, lng: 0, items: [] });
    }
    const cluster = clusters.get(key);
    cluster.items.push(item);
    cluster.lat += item.lat;
    cluster.lng += item.lng;
  });

  clusters.forEach((cluster) => {
    const count = cluster.items.length;
    const lat = cluster.lat / count;
    const lng = cluster.lng / count;
    const lead = cluster.items.find((item) => item.id === visState.selectedId) || cluster.items[0];
    const hoverLabel = `${lead.dest.city} · ${lead.dest.date}`;
    const selected = cluster.items.some((item) => item.id === visState.selectedId);
    const icon = window.KNMapUx
      ? window.KNMapUx.createPillIcon({
          id: lead.id,
          kind: cluster.mot === "ocean" ? "ship" : cluster.mot,
          mot: cluster.mot,
          count,
          status: lead.status,
          statusTone: lead.statusTone
        })
      : L.divIcon({
          className: "",
          html: `<span class="vis-marker${selected ? " vis-marker--selected" : ""}">${VIS_MOT_ICONS[cluster.mot]}<span class="vis-marker__count">${count}</span></span>`,
          iconSize: [40, 36],
          iconAnchor: [20, 18]
        });
    const marker = L.marker([lat, lng], {
      icon,
      riseOnHover: true,
      title: ""
    });
    const preview = {
      id: lead.id,
      kind: cluster.mot === "ocean" ? "ship" : cluster.mot,
      mot: cluster.mot,
      status: lead.status,
      statusTone: lead.statusTone,
      company: lead.company,
      container: lead.container,
      route: `${lead.origin.city} → ${lead.dest.city}`,
      hoverLabel,
      items: count > 1 ? cluster.items : undefined
    };
    window.KNMapUx?.attach(visibilityMap, marker, preview);
    visMapUxIds.push(preview.id);
    marker.on("click", () => {
      window.KNMapUx?.close?.();
      if (typeof window.openKnShipmentDetail === "function") {
        window.openKnShipmentDetail(lead.id);
        return;
      }
      selectVisShipment(lead.id, { fly: false });
    });
    visMarkerLayer.addLayer(marker);
    const el = marker.getElement();
    if (el && hoverLabel) {
      el.setAttribute("data-tooltip", hoverLabel);
    }
  });

  window.KNMapUx?.syncSelection(visState.selectedId);

  if (fit) {
    fitMapToPoints(
      visibilityMap,
      rows.map((item) => [item.lat, item.lng])
    );
  }
}

function panVisibilityMapTo(item) {
  if (!visibilityMap || !item) {
    return;
  }
  const targetZoom = Math.min(
    MAP_ZOOM.max,
    Math.max(visibilityMap.getMinZoom(), MAP_ZOOM.select)
  );
  visibilityMap.flyTo([item.lat, item.lng], targetZoom, { duration: 0.6 });
}

function syncVisRiskChips() {
  const counts = getVisRiskCounts();
  document.querySelectorAll("[data-vis-count]").forEach((node) => {
    const key = node.getAttribute("data-vis-count");
    node.textContent = String(counts[key] ?? 0);
  });
  document.querySelectorAll("[data-vis-risk]").forEach((chip) => {
    const selected = chip.getAttribute("data-vis-risk") === visState.risk;
    chip.classList.toggle("is-selected", selected);
    chip.setAttribute("aria-checked", String(selected));
  });
}

function announceVisResults(total, actionCount) {
  const noun = visState.record === "container" ? "containers" : visState.record === "all" ? "records" : "shipments";
  const live = document.getElementById("vis-live");
  const text =
    total === 0
      ? `No ${noun} match the current filters.`
      : `${total} ${noun}${actionCount ? ` · ${actionCount} need action` : ""}`;
  if (live) {
    live.textContent = `${text}. Page ${visState.page}.`;
  }
}

function renderVisibilityPage({ keepPage = false, fitMap = !keepPage, resetScroll = !keepPage } = {}) {
  if (!keepPage) {
    visState.page = 1;
  }
  const paged = getPagedVisShipments();
  if (paged.rows.length && !paged.rows.some((item) => item.id === visState.selectedId)) {
    visState.selectedId = paged.rows[0].id;
  }

  const list = document.getElementById("vis-card-list");
  if (list) {
    list.innerHTML = paged.rows.length === 0 ? renderVisEmpty() : paged.rows.map(renderVisCard).join("");
    list.setAttribute("aria-activedescendant", visState.selectedId ? `vis-card-${visState.selectedId}` : "");
    if (resetScroll) {
      list.scrollTop = 0;
    }
  }

  renderVisTable(paged.rows);
  renderVisPagination(document.getElementById("vis-pagination"), paged.total, paged.totalPages);
  renderVisPagination(document.getElementById("vis-table-pagination"), paged.total, paged.totalPages);
  syncVisRiskChips();
  announceVisResults(paged.total, getVisRiskCounts().action);
  renderVisibilityMapMarkers(getFilteredVisShipments(), { fit: fitMap });
}

function clearVisColFilters() {
  Object.keys(visState.col).forEach((key) => {
    visState.col[key] = "";
  });
  document.querySelectorAll("[data-vis-col]").forEach((input) => {
    input.value = "";
  });
}

function applyVisibilityFilters(filters = {}) {
  visState.mot = filters.mot ?? "all";
  visState.record = filters.record ?? "all";
  visState.direction = filters.direction ?? "all";
  const risk = filters.risk ?? "all";
  visState.risk = risk;
  visState.riskByView.cards = risk;
  visState.riskByView.table = risk;
  visState.query = filters.query ?? "";
  visState.page = 1;
  const input = document.getElementById("vis-search");
  const clear = document.getElementById("vis-search-clear");
  if (input) {
    input.value = visState.query;
  }
  if (clear) {
    clear.hidden = !visState.query;
  }
  closeVisMenus();
  syncVisFilterLabels();
  if (visState.view !== "cards") {
    setVisTab("cards");
    return;
  }
  persistVisViewHash("cards");
  renderVisibilityPage({ keepPage: true, fitMap: true, resetScroll: true });
}

function resetVisFilters() {
  visState.mot = "all";
  visState.record = "all";
  visState.direction = "all";
  visState.riskByView.cards = "all";
  visState.riskByView.table = "all";
  visState.risk = "all";
  visState.sort = "newest";
  visState.query = "";
  visState.page = 1;
  clearVisColFilters();
  const input = document.getElementById("vis-search");
  const clear = document.getElementById("vis-search-clear");
  if (input) {
    input.value = "";
  }
  if (clear) {
    clear.hidden = true;
  }
  closeVisMenus();
  syncVisFilterLabels();
  renderVisibilityPage();
}

function selectVisShipment(id, { fly = true, restoreFocus = false } = {}) {
  const match = visShipments.find((item) => item.id === id);
  if (!match) {
    return;
  }
  const previousPage = visState.page;
  visState.selectedId = id;
  revealVisShipmentInList(id);
  renderVisibilityPage({
    keepPage: true,
    fitMap: false,
    resetScroll: visState.page !== previousPage
  });
  window.requestAnimationFrame(() => {
    window.KNMapUx?.syncSelection(id, { pulse: true });
    scrollVisShipmentIntoView(id);
    if (restoreFocus) {
      document.getElementById(`vis-card-${id}`)?.focus();
      document.querySelector(`#vis-table-body tr[data-vis-id="${id}"]`)?.focus();
    }
  });
  if (fly) {
    panVisibilityMapTo(match);
  }
}

function setVisTab(view, { persist = true } = {}) {
  const nextView = view === "table" ? "table" : "cards";
  visState.riskByView[visState.view] = visState.risk;
  visState.view = nextView;
  visState.risk = visState.riskByView[nextView] || "all";
  visState.page = 1;
  document.querySelectorAll("[data-vis-tab]").forEach((tab) => {
    const isActive = tab.getAttribute("data-vis-tab") === nextView;
    tab.setAttribute("aria-selected", String(isActive));
    tab.classList.toggle("btn--primary", isActive);
    tab.classList.toggle("btn--tertiary", !isActive);
  });
  const cardsPanel = document.getElementById("vis-panel-cards");
  const tablePanel = document.getElementById("vis-panel-table");
  if (cardsPanel) {
    cardsPanel.hidden = nextView !== "cards";
  }
  if (tablePanel) {
    tablePanel.hidden = nextView !== "table";
  }
  const visRoot = document.getElementById("klearhub-visibility-page");
  visRoot?.classList.toggle("is-table-view", nextView === "table");
  if (persist) {
    persistVisViewHash(nextView);
  }
  renderVisibilityPage({ keepPage: true, fitMap: nextView === "cards", resetScroll: true });
  if (nextView === "cards") {
    refreshVisibilityMap();
  }
}

function initVisibilityMap() {
  const el = document.getElementById("visibility-map");
  if (!el || typeof L === "undefined") {
    if (el) {
      el.classList.add("shipment-map--fallback");
      el.innerHTML = '<p class="type-body-sm">Live map could not be loaded.</p>';
    }
    return;
  }
  if (visibilityMap) {
    requestAnimationFrame(() => {
      visibilityMap.invalidateSize();
      applyMapZoomRules(visibilityMap);
    });
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

  visibilityMap = createConstrainedMap(el);
  mapLayer.addTo(visibilityMap);
  visMarkerLayer = L.layerGroup().addTo(visibilityMap);
  renderVisibilityMapMarkers(getFilteredVisShipments(), { fit: true });
  window.KNAis?.bindMap(visibilityMap, {
    liveOnly: true,
    limit: 40,
    icon: (vessel) =>
      window.KNMapUx
        ? window.KNMapUx.createPillIcon(vessel)
        : L.divIcon({
            className: "",
            html: `<span class="shipment-marker shipment-marker--live">${VIS_MOT_ICONS.ocean}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
  });

  document.querySelectorAll("#vis-map-panel [data-vis-basemap]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-vis-basemap");
      document.querySelectorAll("#vis-map-panel [data-vis-basemap]").forEach((item) => {
        const isActive = item.getAttribute("data-vis-basemap") === mode;
        item.setAttribute("aria-pressed", String(isActive));
        item.classList.toggle("btn--primary", isActive);
        item.classList.toggle("btn--tertiary", !isActive);
      });
      if (mode === "satellite") {
        visibilityMap.removeLayer(mapLayer);
        satelliteLayer.addTo(visibilityMap);
      } else {
        visibilityMap.removeLayer(satelliteLayer);
        mapLayer.addTo(visibilityMap);
      }
    });
  });

  document.getElementById("vis-map-zoom-in")?.addEventListener("click", () => {
    if (visibilityMap.getZoom() < visibilityMap.getMaxZoom()) {
      visibilityMap.zoomIn();
    }
  });
  document.getElementById("vis-map-zoom-out")?.addEventListener("click", () => {
    if (visibilityMap.getZoom() > visibilityMap.getMinZoom()) {
      visibilityMap.zoomOut();
    }
  });
  document.getElementById("vis-map-refresh")?.addEventListener("click", () => {
    resetVisibilityMap();
  });
  syncMapZoomButtons(
    visibilityMap,
    document.getElementById("vis-map-zoom-in"),
    document.getElementById("vis-map-zoom-out")
  );

  const mapPanel = document.getElementById("vis-map-panel");
  const expandBtn = document.getElementById("vis-map-expand");
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

  const syncExpand = () => {
    refreshVisibilityMap();
  };
  document.addEventListener("fullscreenchange", syncExpand);
  document.addEventListener("webkitfullscreenchange", syncExpand);

  const stage = el.parentElement;
  if (stage && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => refreshVisibilityMap()).observe(stage);
  }

  requestAnimationFrame(() => {
    visibilityMap.invalidateSize();
    applyMapZoomRules(visibilityMap);
    renderVisibilityMapMarkers(getFilteredVisShipments(), { fit: true });
  });
}

function refreshVisibilityMap() {
  const page = document.getElementById("klearhub-visibility-page");
  if (!page || page.hidden) {
    return;
  }
  if (!visibilityMap) {
    initVisibilityMap();
    return;
  }
  requestAnimationFrame(() => {
    visibilityMap.invalidateSize();
    applyMapZoomRules(visibilityMap);
  });
}

function resetVisibilityMap() {
  if (!visibilityMap) {
    initVisibilityMap();
    return;
  }
  const btn = document.getElementById("vis-map-refresh");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  btn?.classList.add("is-spinning");
  visibilityMap.invalidateSize();
  applyMapZoomRules(visibilityMap);
  renderVisibilityMapMarkers(getFilteredVisShipments(), { fit: true });
  const pane = visibilityMap.getPane("markerPane");
  if (pane && !reduceMotion) {
    pane.classList.remove("map-pills-enter");
    void pane.offsetWidth;
    pane.classList.add("map-pills-enter");
    window.setTimeout(() => pane.classList.remove("map-pills-enter"), 700);
  }
  if (typeof window.showBladeToast === "function") {
    window.showBladeToast({ content: "Map reset to default view", color: "positive" });
  }
  window.setTimeout(() => btn?.classList.remove("is-spinning"), reduceMotion ? 0 : 650);
}

const visPage = document.getElementById("klearhub-visibility-page");

visPage?.addEventListener("click", (event) => {
  const copyEl = event.target.closest("[data-copy]");
  if (copyEl) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.copyKnValue === "function") {
      window.copyKnValue(copyEl.getAttribute("data-copy"), copyEl.getAttribute("data-copy-label") || "value", copyEl);
    }
    return;
  }

  const tab = event.target.closest("[data-vis-tab]");
  if (tab) {
    setVisTab(tab.getAttribute("data-vis-tab"));
    return;
  }

  const risk = event.target.closest("[data-vis-risk]");
  if (risk) {
    setVisRisk(risk.getAttribute("data-vis-risk"));
    renderVisibilityPage();
    return;
  }

  if (event.target.closest("[data-vis-reset], #vis-reset-filters")) {
    resetVisFilters();
    return;
  }

  const menuTrigger = event.target.closest("[aria-controls], [data-vis-size-trigger]");
  if (menuTrigger?.closest(".vis-menu")) {
    const menu = menuTrigger.nextElementSibling;
    if (menu?.classList.contains("vis-menu__list")) {
      const willOpen = menu.hidden;
      closeVisMenus(willOpen ? menu.id : "");
      menu.hidden = !willOpen;
      menuTrigger.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        menu.querySelector('[role="option"], [role="menuitem"]')?.focus();
      }
      event.stopPropagation();
      return;
    }
  }

  const mot = event.target.closest("[data-vis-mot]");
  if (mot) {
    visState.mot = mot.getAttribute("data-vis-mot");
    closeVisMenus();
    syncVisFilterLabels();
    renderVisibilityPage();
    return;
  }

  const record = event.target.closest("[data-vis-record]");
  if (record) {
    visState.record = record.getAttribute("data-vis-record");
    closeVisMenus();
    syncVisFilterLabels();
    renderVisibilityPage();
    return;
  }

  const sort = event.target.closest("[data-vis-sort]");
  if (sort) {
    visState.sort = sort.getAttribute("data-vis-sort");
    closeVisMenus();
    syncVisFilterLabels();
    renderVisibilityPage();
    return;
  }

  const direction = event.target.closest("[data-vis-direction]");
  if (direction) {
    visState.direction = direction.getAttribute("data-vis-direction");
    closeVisMenus();
    syncVisFilterLabels();
    renderVisibilityPage();
    return;
  }

  const pageSize = event.target.closest("[data-vis-page-size]");
  if (pageSize) {
    const nextSize = Number(pageSize.getAttribute("data-vis-page-size"));
    visState.pageSize = VIS_TABLE_PAGE_SIZES.includes(nextSize) ? nextSize : 10;
    visState.page = 1;
    closeVisMenus();
    renderVisibilityPage({ keepPage: true, resetScroll: true });
    return;
  }

  const pageBtn = event.target.closest("[data-vis-page]");
  if (pageBtn && !pageBtn.disabled) {
    const action = pageBtn.getAttribute("data-vis-page");
    const totalPages = getPagedVisShipments().totalPages;
    if (action === "first") {
      visState.page = 1;
    } else if (action === "prev") {
      visState.page = Math.max(1, visState.page - 1);
    } else if (action === "next") {
      visState.page = Math.min(totalPages, visState.page + 1);
    } else if (action === "last") {
      visState.page = totalPages;
    } else {
      visState.page = Number(action);
    }
    renderVisibilityPage({ keepPage: true, resetScroll: true });
    return;
  }

  const card = event.target.closest("[data-vis-id]");
  if (card) {
    const id = card.getAttribute("data-vis-id");
    if (typeof window.openKnShipmentDetail === "function") {
      window.openKnShipmentDetail(id);
      return;
    }
    selectVisShipment(id);
  }
});

visPage?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeVisMenus();
    return;
  }

  const tab = event.target.closest("[data-vis-tab]");
  if (tab && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    const tabs = Array.from(document.querySelectorAll("[data-vis-tab]"));
    const index = tabs.indexOf(tab);
    const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : tabs[(index - 1 + tabs.length) % tabs.length];
    next?.focus();
    setVisTab(next.getAttribute("data-vis-tab"));
    return;
  }

  const chip = event.target.closest("[data-vis-risk]");
  if (chip && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    const chips = Array.from(document.querySelectorAll("[data-vis-risk]"));
    const index = chips.indexOf(chip);
    const next = event.key === "ArrowRight" ? chips[(index + 1) % chips.length] : chips[(index - 1 + chips.length) % chips.length];
    next?.focus();
    setVisRisk(next.getAttribute("data-vis-risk"));
    renderVisibilityPage();
    return;
  }

  const menu = event.target.closest(".vis-menu__list");
  if (menu && !menu.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    event.preventDefault();
    const options = Array.from(menu.querySelectorAll('[role="option"], [role="menuitem"]')).filter(
      (el) => el.getAttribute("aria-disabled") !== "true" && !el.disabled
    );
    const index = options.indexOf(event.target.closest('[role="option"], [role="menuitem"]'));
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];
    next?.focus();
    return;
  }

  const card = event.target.closest(".vis-card[data-vis-id]");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    const id = card.getAttribute("data-vis-id");
    if (typeof window.openKnShipmentDetail === "function") {
      window.openKnShipmentDetail(id);
      return;
    }
    selectVisShipment(id);
    return;
  }
  if (card && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    event.preventDefault();
    const cards = Array.from(document.querySelectorAll(".vis-card[data-vis-id]"));
    const index = cards.indexOf(card);
    const next = event.key === "ArrowDown" ? cards[index + 1] : cards[index - 1];
    if (next) {
      selectVisShipment(next.getAttribute("data-vis-id"), { fly: false, restoreFocus: true });
    }
    return;
  }

  const row = event.target.closest("tr[data-vis-id]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    const id = row.getAttribute("data-vis-id");
    if (typeof window.openKnShipmentDetail === "function") {
      window.openKnShipmentDetail(id);
      return;
    }
    selectVisShipment(id);
  }
});

document.addEventListener("keydown", (event) => {
  const page = document.getElementById("klearhub-visibility-page");
  if (!page || page.hidden) {
    return;
  }
  const detail = document.getElementById("kn-detail-drawer");
  if (detail && !detail.hidden) {
    return;
  }
  if (window.KNVisLoading) {
    return;
  }
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key !== "j" && key !== "k" && key !== "c") {
    return;
  }
  const rows =
    visState.view === "table"
      ? Array.from(document.querySelectorAll("#vis-table-body tr[data-vis-id]"))
      : Array.from(document.querySelectorAll(".vis-card[data-vis-id]"));
  if (!rows.length) {
    return;
  }
  const current = rows.find((node) => node.getAttribute("data-vis-id") === visState.selectedId) || rows[0];
  const index = rows.indexOf(current);
  if (key === "c") {
    event.preventDefault();
    const id = visState.selectedId || current.getAttribute("data-vis-id");
    const source = current.querySelector("[data-copy]") || current;
    if (typeof window.copyKnValue === "function") {
      window.copyKnValue(id, "Shipment ID", source);
    }
    return;
  }
  event.preventDefault();
  const next = key === "j" ? rows[index + 1] : rows[index - 1];
  if (next) {
    selectVisShipment(next.getAttribute("data-vis-id"), { fly: false, restoreFocus: true });
  }
});

document.getElementById("vis-search")?.addEventListener("input", (event) => {
  visState.query = event.target.value;
  const clear = document.getElementById("vis-search-clear");
  if (clear) {
    clear.hidden = visState.query.length === 0;
  }
  renderVisibilityPage();
});

visPage?.addEventListener("input", (event) => {
  const col = event.target.closest("[data-vis-col]");
  if (!col) {
    return;
  }
  const key = col.getAttribute("data-vis-col");
  if (!Object.prototype.hasOwnProperty.call(visState.col, key)) {
    return;
  }
  visState.col[key] = col.value;
  visState.page = 1;
  renderVisibilityPage({ keepPage: true });
});

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function visExportStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}${month}${day}`;
}

function exportVisibilityData() {
  const rows = getFilteredVisShipments();
  closeVisMenus();
  if (!rows.length) {
    if (typeof window.showBladeToast === "function") {
      window.showBladeToast({ content: "Nothing in this view to export.", color: "information" });
    }
    return;
  }
  const headers = [
    "Shipment ID",
    "Container(s)",
    "Master Bill",
    "House Bill",
    "MOT",
    "PO Number",
    "Status",
    "Port of Lading",
    "Departure Date",
    "Port of Unlading",
    "Arrival Date",
    "Country",
    "Company"
  ];
  const data = rows.map((item) => [
    item.id,
    [item.container, item.extraContainers ? `+${item.extraContainers}` : ""].filter(Boolean).join(" "),
    item.masterBill || item.mbol || "",
    item.hbol || "",
    visMotLabels[item.mot] || item.mot,
    [item.po, item.extraPo ? `+${item.extraPo}` : ""].filter(Boolean).join(" "),
    [item.status, item.statusSecondary].filter(Boolean).join(" · "),
    item.polLabel || "",
    item.etdLabel || "",
    item.pouLabel || "",
    item.etaLabel || "",
    item.destCountry || "",
    item.company || ""
  ]);
  downloadCsv(`klearnow-visibility-${visExportStamp()}.csv`, headers, data);
  if (typeof window.showBladeToast === "function") {
    window.showBladeToast({
      content: `Exported ${rows.length} shipment${rows.length === 1 ? "" : "s"}.`,
      color: "positive"
    });
  }
}

document.getElementById("vis-search-clear")?.addEventListener("click", () => {
  const input = document.getElementById("vis-search");
  visState.query = "";
  if (input) {
    input.value = "";
    input.focus();
  }
  document.getElementById("vis-search-clear").hidden = true;
  renderVisibilityPage();
});

document.getElementById("vis-refresh")?.addEventListener("click", () => {
  closeVisMenus();
  renderVisibilityPage({ keepPage: true });
  refreshVisibilityMap();
});

document.getElementById("vis-export-data")?.addEventListener("click", exportVisibilityData);

document.getElementById("vis-export-docs")?.addEventListener("click", (event) => {
  event.preventDefault();
});

document.getElementById("vis-old-view")?.addEventListener("click", () => {
  const live = document.getElementById("vis-live");
  if (live) {
    live.textContent = "Legacy Visibility is not available in this workspace.";
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#klearhub-visibility-page .vis-menu")) {
    closeVisMenus();
  }
});

syncVisFilterLabels();
renderVisibilityPage({ keepPage: true });
setVisTab(getInitialVisView(), { persist: false });
