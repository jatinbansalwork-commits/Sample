(() => {
  const ROUTE = "#transaction-us-export";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 2);
    return d.toISOString();
  })();
  let refreshTimer = null;

  const emptyTxnFilters = () => ({
    chip: "all",
    transactionId: "",
    entryNumber: "",
    itn: "",
    transactionState: "",
    etd: "",
    eta: "",
    companyName: "",
    shipmentId: "",
    filingDate: "",
    mot: "",
    mbl: "",
    hbl: "",
    originState: "",
    destination: ""
  });
  const emptyShipFilters = () => ({
    chip: "allActive",
    shipmentId: "",
    companyName: "",
    shipmentState: "",
    mot: "",
    mbl: "",
    hbl: "",
    countryExport: "",
    countryImport: "",
    eta: ""
  });

  const state = {
    view: "transaction",
    menuOpen: "",
    selectOpen: "",
    ready: true,
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 100, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }

  function buildSeed() { return []; }
  function buildShipSeed() { return []; }

  function filteredTxnRows() { return []; }
  function filteredShipRows() { return []; }

  function txnChipCounts() {
    return { all: 0, active: 0, recent: 0, reject: 0, hold: 0, complete: 0 };
  }

  function shipChipCounts() {
    return { allActive: 0, notCreated: 0, inProgress: 0, completed: 0 };
  }

  function sortHeader(key, label, attr) {
    const view = state.view === "shipment" ? state.ship : state.txn;
    return window.KNAdminUX.sortHeader({ key, label, sortKey: view.sortKey, sortDir: view.sortDir, attr });
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function paginationMeta(rows, page, pageSize, pageRows, start) {
    const total = rows.length;
    if (!total) return "Showing 0 to 0 of 0 records";
    return `Showing ${start + 1} to ${start + pageRows.length} of ${total} records`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = ux.tmTableEmptyRow({ colspan: 16, mode: "inline" });

    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "active", label: "Active", count: counts.active, selected: chip === "active" },
        { id: "recent", label: "Recent", count: counts.recent, selected: chip === "recent" },
        { id: "reject", label: "Reject", count: counts.reject, selected: chip === "reject" },
        { id: "hold", label: "Hold", count: counts.hold, selected: chip === "hold" },
        { id: "complete", label: "Complete", count: counts.complete, selected: chip === "complete" }
      ],
      results: paginationMeta(rows, state.txn.page, state.txn.pageSize, pageRows, start)
    })}
    <div class="vis-table-wrap role-table-card export-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "export-table" })}" aria-label="US Export transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-export-sort")}
              ${sortHeader("entryNumber", "Entry Number", "data-export-sort")}
              ${sortHeader("itn", "ITN", "data-export-sort")}
              ${sortHeader("transactionState", "Transaction State", "data-export-sort")}
              ${sortHeader("etd", "ETD", "data-export-sort")}
              ${sortHeader("eta", "ETA", "data-export-sort")}
              ${sortHeader("companyName", "Company Name", "data-export-sort")}
              ${sortHeader("shipmentId", "Shipment Id", "data-export-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-export-sort")}
              ${sortHeader("mot", "MoT", "data-export-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PRO", "data-export-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-export-sort")}
              ${sortHeader("originState", "Origin State", "data-export-sort")}
              ${sortHeader("destination", "Destination", "data-export-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-export-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "itn", value: state.txn.filters.itn, label: "ITN" })}
              ${ux.colKnSelect({ attr: "data-export-filter", key: "transactionState", value: state.txn.filters.transactionState, label: "transaction state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "NEW", label: "NEW" }, { value: "IN PROCESS", label: "IN PROCESS" }, { value: "READY", label: "READY" }, { value: "FILED", label: "FILED" }] })}
              ${ux.colFilter({ attr: "data-export-filter", key: "etd", value: state.txn.filters.etd, label: "ETD" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "eta", value: state.txn.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "shipmentId", value: state.txn.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
              ${ux.colKnSelect({ attr: "data-export-filter", key: "mot", value: state.txn.filters.mot, label: "MoT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-export-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL/MAWB/PRO" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "originState", value: state.txn.filters.originState, label: "origin state" })}
              ${ux.colFilter({ attr: "data-export-filter", key: "destination", value: state.txn.filters.destination, label: "destination" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-export-page", label: "Export transaction pages", sizeSelect: adminSelect({ id: "kn-export-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = ux.tmTableEmptyRow({ colspan: 11, mode: "inline" });

    return `${ux.toolbar({
      chips: [
        { id: "allActive", label: "All Active", count: counts.allActive, selected: chip === "allActive" },
        { id: "notCreated", label: "Not Created", count: counts.notCreated, selected: chip === "notCreated" },
        { id: "inProgress", label: "In Progress", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "completed", label: "Completed", count: counts.completed, selected: chip === "completed" }
      ],
      results: paginationMeta(rows, state.ship.page, state.ship.pageSize, pageRows, start)
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "export-ship-table" })}" aria-label="US Export shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("shipmentId", "Shipment ID", "data-export-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-export-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-export-ship-sort")}
              ${sortHeader("mot", "MOT", "data-export-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-export-ship-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-export-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-export-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-export-ship-sort")}
              ${sortHeader("eta", "ETA", "data-export-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-export-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "New", label: "New" }, { value: "In Progress", label: "In Progress" }, { value: "Completed", label: "Completed" }] })}
              ${ux.colKnSelect({ attr: "data-export-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-export-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-export-ship-page", label: "Export shipment pages", sizeSelect: adminSelect({ id: "kn-export-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-export-page");
    const root = document.getElementById("kn-export-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => {
      const raw = window.KNAdminUX.relativeTime(lastUpdatedIso);
      const hours = raw.match(/^(\d+)h ago$/);
      return hours ? `${hours[1]} hours ago` : raw;
    })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Export list view">
        <button class="kn-btn btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-export-view="shipment">Shipment</button>
        <button class="kn-btn btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-export-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta">
        <span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
      </div>
    </div>
    ${state.view === "transaction" ? renderTxnTable() : renderShipTable()}`;
    window.KNAdminUX.restoreColFilterFocus(root, filterFocus);
  }

  function clearFilters() {
    if (state.view === "shipment") {
      state.ship.filters = emptyShipFilters();
      state.ship.page = 1;
    } else {
      state.txn.filters = emptyTxnFilters();
      state.txn.page = 1;
    }
    render();
  }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-export-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-export-view") || "transaction";
        state.menuOpen = "";
        state.selectOpen = "";
        render();
        return;
      }
      if (event.target.closest("[data-admin-clear-filters]")) {
        event.preventDefault();
        clearFilters();
        return;
      }
      const sort = event.target.closest("[data-export-sort], [data-export-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-export-sort") || sort.getAttribute("data-export-ship-sort");
        const view = sort.hasAttribute("data-export-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else { view.sortKey = key; view.sortDir = "asc"; }
        view.page = 1;
        render();
        return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        event.preventDefault();
        const view = state.view === "shipment" ? state.ship : state.txn;
        view.filters.chip = chip.getAttribute("data-admin-chip") || (state.view === "shipment" ? "allActive" : "all");
        view.page = 1;
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-export-page], [data-export-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-export-page") || pageBtn.getAttribute("data-export-ship-page"));
        const view = pageBtn.hasAttribute("data-export-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) {
          view.page = next;
          state.menuOpen = "";
          render();
        }
        return;
      }
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") {
            state.txn.pageSize = Number(value) || 100;
            state.txn.page = 1;
            render();
            return;
          }
          if (key === "shipPageSize") {
            state.ship.pageSize = Number(value) || 100;
            state.ship.page = 1;
            render();
            return;
          }
          const filters = state.view === "shipment" ? state.ship.filters : state.txn.filters;
          if (key in filters) {
            filters[key] = value;
            if (state.view === "shipment") state.ship.page = 1;
            else state.txn.page = 1;
            render();
          }
        }
      })) return;
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-export-filter], [data-export-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-export-ship-filter");
      const key = input.getAttribute(isShip ? "data-export-ship-filter" : "data-export-filter");
      const filters = isShip ? state.ship.filters : state.txn.filters;
      if (!key || !(key in filters)) return;
      filters[key] = input.value;
      if (isShip) state.ship.page = 1;
      else state.txn.page = 1;
      render();
    });
  }

  function stopAutorefresh() {
    if (refreshTimer != null) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function startAutorefresh() {
    stopAutorefresh();
    refreshTimer = window.setInterval(() => {
      const page = document.getElementById("kn-export-page");
      if (!page || page.hidden) {
        stopAutorefresh();
        return;
      }
      lastUpdatedIso = new Date().toISOString();
      state.menuOpen = "";
      state.selectOpen = "";
      render();
    }, AUTOREFRESH_MS);
  }

  function suspend() {
    state.menuOpen = "";
    state.selectOpen = "";
    stopAutorefresh();
  }

  function sync() {
    const page = document.getElementById("kn-export-page");
    if (!page || page.hidden) {
      stopAutorefresh();
      return;
    }
    render();
    startAutorefresh();
  }

  function init() {
    const page = document.getElementById("kn-export-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => {
      if (page.hidden || (!state.selectOpen && !state.menuOpen)) return;
      state.selectOpen = "";
      state.menuOpen = "";
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden || event.key !== "Escape") return;
      if (state.selectOpen || state.menuOpen) {
        state.selectOpen = "";
        state.menuOpen = "";
        render();
      }
    });
  }

  window.KNUsExport = {
    init,
    sync,
    suspend,
    route: ROUTE,
    list() { return buildSeed(); },
    listShipments() { return buildShipSeed(); }
  };
})();
