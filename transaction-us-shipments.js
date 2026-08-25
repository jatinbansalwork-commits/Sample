(() => {
  const ROUTE = "#transaction-us-shipments";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - 2); return d.toISOString(); })();
  let refreshTimer = null;

  const COMPANIES = ["SAFRAN CABIN CANADA CO","ICHOR SYSTEMS INC","JOBY AERO, INC","CAMERON INTERNATIONAL CORPORATION (SUB QC)","GLOBAL-PAK","ACUITY BRANDS"];
  const ID_MID = ["07BI","071Y","3809","09ZG","0A1K","0B7M"];

  const emptyTxnFilters = () => ({ chip: "all", transactionId: "", companyName: "", shipmentId: "", mot: "", mbl: "", status: "" });

  const state = {
    view: "group",
    menuOpen: "",
    selectOpen: "",
    booting: false,
    ready: false,
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() }
  };

  let seedCache = null;

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function toast(content, color = "positive") { if (typeof window.showBladeToast === "function") window.showBladeToast({ content, color }); }
  function iconCopy() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`; }
  function iconTrash() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`; }
  function iconRefresh() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>`; }
  function iconPencil() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`; }

  function statusBadge(label) {
    return window.KNAdminUX.tmStatusBadge(label);
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = [];
    const statuses = [
      { label: "NEW", chip: "new" },
      { label: "IN PROGRESS", chip: "inProgress" },
      { label: "ACCEPTED", chip: "accepted" },
      { label: "READY", chip: "ready" }
    ];
    for (let i = 0; i < 48; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const status = statuses[i % statuses.length];
      rows.push({
        id: `tm-ship-${i + 1}`,
        transactionId: `KN-${mid}-${100 + i}`,
        companyName: COMPANIES[i % COMPANIES.length],
        shipmentId: `KX-${mid}-${10 + (i % 80)}`,
        mot: i % 3 === 0 ? "AIR" : "OCEAN",
        mbl: String(40624604451 + i * 31),
        status: status.label,
        statusChip: status.chip
      });
    }
    seedCache = rows;
    return rows;
  }

  function filteredTxnRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.txn.filters;
    const rows = buildSeed().filter((row) => {
      const chipOk = f.chip === "all" || row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.transactionId, row.transactionId], [f.companyName, row.companyName], [f.shipmentId, row.shipmentId],
        [f.mot, row.mot], [f.mbl, row.mbl], [f.status, row.status]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    const dir = state.txn.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = String(a[state.txn.sortKey] || "").toLowerCase();
      const bv = String(b[state.txn.sortKey] || "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      new: all.filter((r) => r.statusChip === "new").length,
      inProgress: all.filter((r) => r.statusChip === "inProgress").length,
      accepted: all.filter((r) => r.statusChip === "accepted").length,
      ready: all.filter((r) => r.statusChip === "ready").length
    };
  }

  function sortHeader(key, label) {
    return window.KNAdminUX.sortHeader({ key, label, sortKey: state.txn.sortKey, sortDir: state.txn.sortDir, attr: "data-tmship-sort" });
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function rowActions(id, label) {
    const ux = window.KNAdminUX;
    return `<div class="user-row-actions">
      <button class="icon-btn" type="button" data-tmship-copy="${escapeHtml(id)}" aria-label="Copy ${escapeHtml(label)}" data-tooltip="Copy">${iconCopy()}</button>
      <button class="icon-btn" type="button" data-tmship-delete="${escapeHtml(id)}" aria-label="Delete ${escapeHtml(label)}" data-tooltip="Delete">${iconTrash()}</button>
      ${ux.moreMenu({ id, open: state.menuOpen === id, items: [{ label: "View history", attr: `data-tmship-history="${escapeHtml(id)}"` }] })}
    </div>`;
  }

  function renderGroupView() {
    return `<div class="tm-shipments-group">
      <div class="tm-shipments-group__toolbar">
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" data-tmship-clear-filters>Clear Filters</button>
        <button class="btn btn--secondary btn--sm type-ui-sm" type="button" data-tmship-more-filters>More Filters</button>
        <span class="badge badge--neutral type-caption-sm">Total Groups : 1</span>
        <span class="badge badge--neutral type-caption-sm">Total Transactions : 0</span>
      </div>
      <div class="tm-shipments-group__meta type-caption-sm">
        <span>Grouping Criteria:</span>
        <span>Mass Lock/Unlock</span>
      </div>
      <article class="tm-shipments-group__card">
        <div class="tm-shipments-group__card-main">
          <span class="type-body-sm type-weight-medium">0 Transaction(s)</span>
          <button class="icon-btn" type="button" data-tmship-group-refresh aria-label="Refresh group" data-tooltip="Refresh">${iconRefresh()}</button>
        </div>
        <div class="tm-shipments-group__card-actions">
          <button class="blade-link type-ui-sm" type="button" data-tmship-more-detail>More Detail</button>
          <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" data-tmship-modify>${iconPencil()} Modify</button>
        </div>
      </article>
    </div>`;
  }

  function renderTxnView() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading shipments." })}
      <div class="vis-table-wrap role-table-card" aria-busy="true">
        <div class="vis-table-scroll">
          <table class="vis-table vis-table--admin tm-table" aria-label="Loading US Shipments">
            <thead><tr class="vis-table__labels"><th scope="col">Transaction ID</th><th scope="col">Company Name</th><th scope="col">Shipment ID</th><th scope="col">MoT</th><th scope="col">MBL</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>${ux.tableSkeletonRows({ cols: 7, rows: 8 })}</tbody>
          </table>
        </div>
      </div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-tmship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-tmship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.shipmentId)}">${escapeHtml(row.shipmentId)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.mbl)}">${escapeHtml(row.mbl)}</span></td>
          <td class="admin-table-nowrap">${statusBadge(row.status)}</td>
          <td>${rowActions(row.id, row.transactionId)}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="7">${ux.emptyState({ title: "No shipments found matching your search", description: "Clear filters or switch status chips to see transactions.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "new", label: "New", count: counts.new, selected: chip === "new" },
        { id: "inProgress", label: "In Progress", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "accepted", label: "Accepted", count: counts.accepted, selected: chip === "accepted" },
        { id: "ready", label: "Ready", count: counts.ready, selected: chip === "ready" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US Shipments transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID")}
              ${sortHeader("companyName", "Company Name")}
              ${sortHeader("shipmentId", "Shipment ID")}
              ${sortHeader("mot", "MoT")}
              ${sortHeader("mbl", "MBL")}
              ${sortHeader("status", "Status")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-tmship-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "shipmentId", value: state.txn.filters.shipmentId, label: "shipment ID" })}
              ${ux.colBladeSelect({ attr: "data-tmship-filter", key: "mot", value: state.txn.filters.mot, label: "MoT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "AIR", label: "AIR" }, { value: "OCEAN", label: "OCEAN" }] })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "status", value: state.txn.filters.status, label: "status" })}
              ${ux.emptyColFilter()}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-tmship-page", label: "Shipments pages", sizeSelect: adminSelect({ id: "kn-tmship-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-tmship-page");
    const root = document.getElementById("kn-tmship-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Shipments list view">
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-tmship-view="transaction">Transaction View</button>
        <button class="btn ${state.view === "group" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "group"}" data-tmship-view="group">Group View</button>
      </div>
      <div class="tm-toolbar__meta"><span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span></div>
    </div>
    ${state.view === "group" ? renderGroupView() : renderTxnView()}`;
    window.KNAdminUX.restoreColFilterFocus(root, filterFocus);
  }

  function clearFilters() { state.txn.filters = emptyTxnFilters(); state.txn.page = 1; render(); }
  function findRow(id) { return buildSeed().find((r) => r.id === id); }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-tmship-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-tmship-view") || "group"; state.menuOpen = ""; state.selectOpen = ""; render(); return; }
      const chipBtn = event.target.closest("[data-admin-chip]");
      if (chipBtn) { event.preventDefault(); state.txn.filters.chip = chipBtn.getAttribute("data-admin-chip") || "all"; state.txn.page = 1; render(); return; }
      if (event.target.closest("[data-tmship-clear-filters], [data-admin-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      if (event.target.closest("[data-tmship-more-filters]")) { event.preventDefault(); toast("More filters are not available in this sample.", "notice"); return; }
      if (event.target.closest("[data-tmship-group-refresh]")) { event.preventDefault(); lastUpdatedIso = new Date().toISOString(); toast("Group refreshed.", "positive"); render(); return; }
      if (event.target.closest("[data-tmship-more-detail]")) { event.preventDefault(); toast("More Detail is not available in this sample.", "notice"); return; }
      if (event.target.closest("[data-tmship-modify]")) { event.preventDefault(); toast("Modify is not available in this sample.", "notice"); return; }
      const sort = event.target.closest("[data-tmship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-tmship-sort");
        if (state.txn.sortKey === key) state.txn.sortDir = state.txn.sortDir === "asc" ? "desc" : "asc";
        else { state.txn.sortKey = key; state.txn.sortDir = "asc"; }
        state.txn.page = 1; render(); return;
      }
      const pageBtn = event.target.closest("[data-tmship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-tmship-page"));
        if (Number.isFinite(next) && next >= 1) { state.txn.page = next; state.menuOpen = ""; render(); }
        return;
      }
      if (window.KNAdminUX.handleMoreClick(event, { open: state.menuOpen, setOpen: (n) => { state.menuOpen = n; render(); } })) return;
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen, setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") { state.txn.pageSize = Number(value) || 100; state.txn.page = 1; render(); return; }
          if (key in state.txn.filters) { state.txn.filters[key] = value; state.txn.page = 1; render(); }
        }
      })) return;
      const open = event.target.closest("[data-tmship-open]");
      if (open) { event.preventDefault(); const row = findRow(open.getAttribute("data-tmship-open")); toast(`${row?.transactionId || "Filing"} opened as read-only in this sample.`, "notice"); return; }
      const copy = event.target.closest("[data-tmship-copy]");
      if (copy) {
        event.preventDefault();
        const row = findRow(copy.getAttribute("data-tmship-copy"));
        const text = row?.transactionId || "";
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}.`), () => toast(`Copy ${text} from the table.`, "notice"));
        else toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        return;
      }
      const history = event.target.closest("[data-tmship-history]");
      if (history) { event.preventDefault(); const row = findRow(history.getAttribute("data-tmship-history")); toast(`History for ${row?.transactionId || "record"} is not available in this sample.`, "notice"); return; }
      const del = event.target.closest("[data-tmship-delete]");
      if (del) { event.preventDefault(); const row = findRow(del.getAttribute("data-tmship-delete")); toast(`Delete is disabled in this sample (${row?.transactionId || "record"}).`, "notice"); }
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-tmship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const key = input.getAttribute("data-tmship-filter");
      if (!key || !(key in state.txn.filters)) return;
      state.txn.filters[key] = input.value; state.txn.page = 1; render();
    });
  }

  function stopAutorefresh() { if (refreshTimer != null) { window.clearInterval(refreshTimer); refreshTimer = null; } }
  function startAutorefresh() {
    stopAutorefresh();
    refreshTimer = window.setInterval(() => {
      const page = document.getElementById("kn-tmship-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString(); state.menuOpen = ""; state.selectOpen = ""; render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-tmship-page");
    if (!page || page.hidden) { stopAutorefresh(); return; }
    if (!state.ready) {
      state.booting = true;
      render();
      window.requestAnimationFrame(() => {
        buildSeed();
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
    const page = document.getElementById("kn-tmship-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true"; bind(page);
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen)) return; state.selectOpen = ""; state.menuOpen = ""; render(); });
    document.addEventListener("keydown", (event) => { if (page.hidden || event.key !== "Escape") return; if (state.selectOpen || state.menuOpen) { state.selectOpen = ""; state.menuOpen = ""; render(); } });
  }

  window.KNUsShipments = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); } };
})();
