(() => {
  const ROUTE = "#transaction-us-delivery-order";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - 1); return d.toISOString(); })();
  let refreshTimer = null;

  const COMPANIES = ["SAFRAN CABIN CANADA CO","SAFRAN CABIN INC - MARYSVILLE","ICHOR SYSTEMS INC","JOBY AERO, INC","HURST JAWS OF LIFE INC - SMALL","UNITED MACHINING NORTH AMERICA LLC","CAMERON INTERNATIONAL CORPORATION (SUB QC)","ACUITY BRANDS","GLOBAL-PAK","ILLUMINATE USA LLC"];
  const CARRIERS = ["DHL AIR LIMITED, DO","CARGOJET AIRWAYS LTD.","FXFC","SWISS INTERNATIONAL AIR LINES LTD","STARLUX","FEDEX, FX","CATHAY PACIFIC AIRWAYS LTD., CX"];
  const ID_MID = ["07BI","07HA","07KC","08LM","09NP","0AQR","0BST","0CUV","0DWX","0EYZ"];

  const emptyTxnFilters = () => ({ chip: "recent", transactionId: "", entryNumber: "", companyName: "", shipments: "", mot: "", mbl: "", hbl: "", carrier: "" });
  const emptyShipFilters = () => ({ chip: "all", shipmentId: "", companyName: "", mbol: "", hbol: "", mot: "" });

  const state = {
    view: "transaction",
    menuOpen: "",
    selectOpen: "",
    booting: false,
    ready: false,
    expandedMore: "",
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 100, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function pad(n, w) { return String(n).padStart(w, "0"); }
  function toast(content, color = "positive") { if (typeof window.showBladeToast === "function") window.showBladeToast({ content, color }); }
  function iconCopy() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`; }
  function iconTrash() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`; }

  function chipForIndex(i) {
    const r = i % 11;
    if (r === 0) return "reject";
    if (r === 1) return "hold";
    if (r === 2) return "complete";
    if (r <= 5) return "recent";
    return "active";
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = [];
    for (let i = 0; i < 91; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const mot = i % 3 === 0 ? "TRUCK" : "AIR";
      rows.push({
        id: `do-${i + 1}`,
        transactionId: `KN-${mid}-${100 + (i % 900)}`,
        entryNumber: `BII-${15043235 + i}`,
        companyName: COMPANIES[i % COMPANIES.length],
        shipments: `KX-${mid}-${120 + (i % 80)}`,
        mot,
        mbl: String(48963004981 + i * 13),
        hbl: String(2549434635 + i * 7),
        carrier: CARRIERS[i % CARRIERS.length],
        statusChip: chipForIndex(i)
      });
    }
    Object.assign(rows[0], { transactionId: "KN-07BI-117", entryNumber: "BII-15043235", companyName: "SAFRAN CABIN CANADA CO", shipments: "KX-07BI-132", mot: "AIR", mbl: "48963004981", hbl: "2549434635", carrier: "DHL AIR LIMITED, DO", statusChip: "recent" });
    seedCache = rows;
    return rows;
  }

  function shipChipForIndex(i) {
    if (i < 80) return "new";
    if (i < 160) return "inProgress";
    if (i < 230) return "docGenerated";
    return "doPublished";
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = [];
    for (let i = 0; i < 303; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const chip = shipChipForIndex(i);
      rows.push({
        id: `do-ship-${i + 1}`,
        shipmentId: `KN-${mid}-${10 + (i % 90)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        mbol: String(40624604451 + i * 19),
        hbol: `${pad((i * 6287) % 1e8, 8)}${String.fromCharCode(65 + (i % 26))}`.slice(0, 11),
        mot: i % 4 === 0 ? "OCEAN" : "AIR",
        statusChip: chip
      });
    }
    Object.assign(rows[0], { shipmentId: "KN-07BI-12", companyName: "SAFRAN CABIN CANADA CO", mbol: "40624604451", hbol: "8521B6J4MQB", mot: "AIR", statusChip: "new" });
    shipSeedCache = rows;
    return rows;
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = String(a[sortKey] || "").toLowerCase();
      const bv = String(b[sortKey] || "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function filteredTxnRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.txn.filters;
    const rows = buildSeed().filter((row) => {
      const chipOk = f.chip === "all" || row.statusChip === f.chip || (f.chip === "active" && (row.statusChip === "active" || row.statusChip === "recent"));
      if (!chipOk) return false;
      return [
        [f.transactionId, row.transactionId],
        [f.entryNumber, row.entryNumber],
        [f.companyName, row.companyName],
        [f.shipments, row.shipments],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.carrier, row.carrier]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.txn.sortKey, state.txn.sortDir);
  }

  function filteredShipRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.ship.filters;
    const rows = buildShipSeed().filter((row) => {
      const chipOk = f.chip === "all" || row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.shipmentId, row.shipmentId],
        [f.companyName, row.companyName],
        [f.mbol, row.mbol],
        [f.hbol, row.hbol],
        [f.mot, row.mot]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.ship.sortKey, state.ship.sortDir);
  }

  function sortHeader(key, label, attr) {
    const view = state.view === "shipment" ? state.ship : state.txn;
    return window.KNAdminUX.sortHeader({ key, label, sortKey: view.sortKey, sortDir: view.sortDir, attr });
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      active: all.filter((r) => r.statusChip === "active" || r.statusChip === "recent").length,
      recent: all.filter((r) => r.statusChip === "recent").length,
      reject: all.filter((r) => r.statusChip === "reject").length,
      hold: all.filter((r) => r.statusChip === "hold").length,
      complete: all.filter((r) => r.statusChip === "complete").length
    };
  }

  function shipChipCounts() {
    const all = buildShipSeed();
    return {
      all: all.length,
      new: all.filter((r) => r.statusChip === "new").length,
      inProgress: all.filter((r) => r.statusChip === "inProgress").length,
      docGenerated: all.filter((r) => r.statusChip === "docGenerated").length,
      doPublished: all.filter((r) => r.statusChip === "doPublished").length
    };
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function rowActions(id, label, prefix) {
    const ux = window.KNAdminUX;
    return `<div class="user-row-actions">
      <button class="icon-btn" type="button" data-${prefix}-copy="${escapeHtml(id)}" aria-label="Copy ${escapeHtml(label)}" data-tooltip="Copy">${iconCopy()}</button>
      <button class="icon-btn" type="button" data-${prefix}-delete="${escapeHtml(id)}" aria-label="Delete ${escapeHtml(label)}" data-tooltip="Delete">${iconTrash()}</button>
      ${ux.moreMenu({ id, open: state.menuOpen === id, items: [{ label: "View history", attr: `data-${prefix}-history="${escapeHtml(id)}"` }] })}
    </div>`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-do-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-do-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.carrier)}">${escapeHtml(row.carrier)}</td>
          <td>${rowActions(row.id, row.transactionId, "do")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="9">${ux.emptyState({ title: "No delivery orders found matching your search", description: "Clear filters or switch status chips to see filings.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "active", label: "Active", count: counts.active, selected: chip === "active" },
        { id: "recent", label: "Recent", count: counts.recent, selected: chip === "recent" },
        { id: "reject", label: "Reject", count: counts.reject, selected: chip === "reject" },
        { id: "hold", label: "Hold", count: counts.hold, selected: chip === "hold" },
        { id: "complete", label: "Complete", count: counts.complete, selected: chip === "complete" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US Delivery Order transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-do-sort")}
              ${sortHeader("companyName", "Company Name", "data-do-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-do-sort")}
              ${sortHeader("shipments", "Shipments", "data-do-sort")}
              ${sortHeader("mot", "MoT", "data-do-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PAPS", "data-do-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-do-sort")}
              ${sortHeader("carrier", "Vessel/Carrier Name", "data-do-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-do-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments" })}
              ${ux.colBladeSelect({ attr: "data-do-filter", key: "mot", value: state.txn.filters.mot, label: "MoT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }, { value: "OCEAN", label: "OCEAN" }] })}
              ${ux.colFilter({ attr: "data-do-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "carrier", value: state.txn.filters.carrier, label: "carrier" })}
              ${ux.emptyColFilter()}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-do-page", label: "Delivery Order pages", sizeSelect: adminSelect({ id: "kn-do-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-do-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-do-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbol)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbol)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td>${rowActions(row.id, row.shipmentId, "do-ship")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="6">${ux.emptyState({ title: "No delivery order shipments found matching your search", description: "Clear filters or switch status chips to see shipments.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "ALL", count: counts.all, selected: chip === "all" },
        { id: "new", label: "NEW", count: counts.new, selected: chip === "new" },
        { id: "inProgress", label: "IN PROGRESS", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "docGenerated", label: "DOC GENERATED", count: counts.docGenerated, selected: chip === "docGenerated" },
        { id: "doPublished", label: "DO PUBLISHED", count: counts.doPublished, selected: chip === "doPublished" }
      ],
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US Delivery Order shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-do-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-do-ship-sort")}
              ${sortHeader("mbol", "MBOL", "data-do-ship-sort")}
              ${sortHeader("hbol", "HBOL", "data-do-ship-sort")}
              ${sortHeader("mot", "MOT", "data-do-ship-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "mbol", value: state.ship.filters.mbol, label: "MBOL" })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "hbol", value: state.ship.filters.hbol, label: "HBOL" })}
              ${ux.colBladeSelect({ attr: "data-do-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "AIR", label: "AIR" }, { value: "OCEAN", label: "OCEAN" }] })}
              ${ux.emptyColFilter()}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-do-ship-page", label: "Delivery Order shipment pages", sizeSelect: adminSelect({ id: "kn-do-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-do-page");
    const root = document.getElementById("kn-do-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-page-head">
      <h1 class="type-heading-h3 type-weight-semibold">Create DO</h1>
    </div>
    <div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Delivery Order list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-do-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-do-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta">
        <span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
      </div>
    </div>
    ${state.view === "transaction" ? renderTxnTable() : renderShipTable()}`;
    window.KNAdminUX.restoreColFilterFocus(root, filterFocus);
  }

  function clearFilters() {
    if (state.view === "shipment") { state.ship.filters = emptyShipFilters(); state.ship.page = 1; }
    else { state.txn.filters = emptyTxnFilters(); state.txn.page = 1; }
    render();
  }

  function findTxnRow(id) { return buildSeed().find((r) => r.id === id); }
  function findShipRow(id) { return buildShipSeed().find((r) => r.id === id); }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-do-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-do-view") || "transaction"; state.menuOpen = ""; state.selectOpen = ""; render(); return; }
      if (event.target.closest("[data-admin-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      const sort = event.target.closest("[data-do-sort], [data-do-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-do-sort") || sort.getAttribute("data-do-ship-sort");
        const view = sort.hasAttribute("data-do-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else { view.sortKey = key; view.sortDir = "asc"; }
        view.page = 1; render(); return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        event.preventDefault();
        const view = state.view === "shipment" ? state.ship : state.txn;
        view.filters.chip = chip.getAttribute("data-admin-chip") || "all";
        view.page = 1; render(); return;
      }
      const pageBtn = event.target.closest("[data-do-page], [data-do-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-do-page") || pageBtn.getAttribute("data-do-ship-page"));
        const view = pageBtn.hasAttribute("data-do-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) { view.page = next; state.menuOpen = ""; render(); }
        return;
      }
      if (window.KNAdminUX.handleMoreClick(event, { open: state.menuOpen, setOpen: (n) => { state.menuOpen = n; render(); } })) return;
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") { state.txn.pageSize = Number(value) || 100; state.txn.page = 1; render(); return; }
          if (key === "shipPageSize") { state.ship.pageSize = Number(value) || 100; state.ship.page = 1; render(); return; }
          const filters = state.view === "shipment" ? state.ship.filters : state.txn.filters;
          if (key in filters) { filters[key] = value; if (state.view === "shipment") state.ship.page = 1; else state.txn.page = 1; render(); }
        }
      })) return;
      const open = event.target.closest("[data-do-open]");
      if (open) { event.preventDefault(); const row = findTxnRow(open.getAttribute("data-do-open")); toast(`${row?.transactionId || "Filing"} opened as read-only in this sample.`, "notice"); return; }
      const shipOpen = event.target.closest("[data-do-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-do-ship-open")); toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice"); return; }
      const copy = event.target.closest("[data-do-copy], [data-do-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-do-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-do-ship-copy")) : findTxnRow(copy.getAttribute("data-do-copy"));
        const text = isShip ? row?.shipmentId || "" : row?.transactionId || "";
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}.`), () => toast(`Copy ${text} from the table.`, "notice"));
        else toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        return;
      }
      const history = event.target.closest("[data-do-history], [data-do-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-do-ship-history");
        const row = isShip ? findShipRow(history.getAttribute("data-do-ship-history")) : findTxnRow(history.getAttribute("data-do-history"));
        toast(`History for ${(isShip ? row?.shipmentId : row?.transactionId) || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-do-delete], [data-do-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-do-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-do-ship-delete")) : findTxnRow(del.getAttribute("data-do-delete"));
        toast(`Delete is disabled in this sample (${(isShip ? row?.shipmentId : row?.transactionId) || "record"}).`, "notice");
      }
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-do-filter], [data-do-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-do-ship-filter");
      const key = input.getAttribute(isShip ? "data-do-ship-filter" : "data-do-filter");
      const filters = isShip ? state.ship.filters : state.txn.filters;
      if (!key || !(key in filters)) return;
      filters[key] = input.value;
      if (isShip) state.ship.page = 1; else state.txn.page = 1;
      render();
    });
  }

  function stopAutorefresh() { if (refreshTimer != null) { window.clearInterval(refreshTimer); refreshTimer = null; } }
  function startAutorefresh() {
    stopAutorefresh();
    refreshTimer = window.setInterval(() => {
      const page = document.getElementById("kn-do-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString(); state.menuOpen = ""; state.selectOpen = ""; render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-do-page");
    if (!page || page.hidden) { stopAutorefresh(); return; }
    if (!state.ready) {
      state.booting = true;
      render();
      window.requestAnimationFrame(() => {
        buildSeed();
        buildShipSeed();
        state.booting = false;
        state.ready = true;
        render();
        startAutorefresh();
      });
      return;
    }
    render();
    startAutorefresh();
  }
  function init() {
    const page = document.getElementById("kn-do-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen)) return; state.selectOpen = ""; state.menuOpen = ""; render(); });
    document.addEventListener("keydown", (event) => { if (page.hidden || event.key !== "Escape") return; if (state.selectOpen || state.menuOpen) { state.selectOpen = ""; state.menuOpen = ""; render(); } });
  }

  window.KNUsDeliveryOrder = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); }, listShipments() { return buildShipSeed(); } };
})();
