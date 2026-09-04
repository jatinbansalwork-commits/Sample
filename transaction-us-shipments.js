(() => {
  const ROUTE = "#transaction-us-shipments";
  const AUTOREFRESH_MS = 60_000;
  const TXN_COL_COUNT = 17;
  let lastUpdatedIso = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - 2); return d.toISOString(); })();
  let refreshTimer = null;
  let drawerLastFocus = null;

  const emptyTxnFilters = () => ({
    transactionId: "",
    transactionStatus: "",
    etd: "",
    companyName: "",
    mot: "",
    mbl: "",
    hbl: "",
    username: "",
    countryExport: "",
    countryImport: "",
    broker: "",
    poNumbers: "",
    portUnlading: "",
    vesselName: "",
    timeOfEntry: "",
    loadDate: ""
  });

  const emptyDrawerFilters = () => ({
    mbl: "",
    hbl: "",
    invoiceNumber: "",
    poNumber: "",
    hts: "",
    part: "",
    mid: "",
    drawerTransactionId: "",
    vesselName: "",
    portUnlading: "",
    arrivalDate: "",
    username: "",
    status: "",
    lock: "",
    poa: "",
    recon: "",
    timeOfEntry: "",
    countryExport: "",
    countryImport: "",
    spi: "",
    lockReason: "",
    updatedDate: "",
    arrivalDateRange: "",
    exportDateRange: "",
    loadDate: ""
  });

  const emptyGroupForm = () => ({
    transactionId: "",
    vesselName: "",
    portUnlading: "",
    arrivalDate: "",
    marginValue: false
  });

  const state = {
    view: "transaction",
    selectOpen: "",
    filterDrawerOpen: false,
    ready: true,
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    drawer: emptyDrawerFilters(),
    group: {
      modifying: false,
      expanded: false,
      sortKey: "transactionId",
      sortDir: "asc",
      form: emptyGroupForm()
    }
  };

  function iconChevron(expanded) {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${expanded ? "M4 6l4 4 4-4" : "M6 4l4 4-4 4"}"/></svg>`;
  }
  function iconPencil() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
  }
  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`;
  }

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function toast(content, color = "positive") { if (typeof window.showKnToast === "function") window.showKnToast({ content, color }); }
  function iconFilter() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`;
  }

  function buildSeed() { return []; }
  function filteredTxnRows() { return []; }

  function sortHeader(key, label, attr = "data-tmship-sort") {
    const sortKey = attr === "data-tmship-group-sort" ? state.group.sortKey : state.txn.sortKey;
    const sortDir = attr === "data-tmship-group-sort" ? state.group.sortDir : state.txn.sortDir;
    return window.KNAdminUX.sortHeader({ key, label, sortKey, sortDir, attr });
  }

  function renderViewToolbar() {
    return `<div class="tmship-txn-toolbar tmship-group-toolbar">
      <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-tmship-clear-filters>Clear Filters</button>
      <button class="btn btn--secondary btn--sm type-ui-sm kn-btn tmship-more-filters-btn" type="button" data-tmship-more-filters aria-expanded="${state.filterDrawerOpen ? "true" : "false"}" aria-controls="kn-tmship-filter-drawer">
        <span class="kn-btn__icon" aria-hidden="true">${iconFilter()}</span>
        More Filters
      </button>
    </div>`;
  }

  function groupCounts() {
    return {
      groups: state.group.modifying ? 1 : 0,
      transactions: 0
    };
  }

  function renderGroupSummaryBar() {
    const counts = groupCounts();
    return `<div class="tmship-group-summary-bar">
      <div class="tmship-group-meta">
        <span class="type-body-sm">Grouping Criteria:</span>
        ${state.group.modifying ? `<span class="type-body-sm tmship-group-meta__detail">Shows Group Details:</span>` : ""}
      </div>
      <div class="tmship-group-counts">
        <span class="badge badge--neutral type-caption-sm kn-badge">Total Groups : ${counts.groups}</span>
        <span class="badge badge--neutral type-caption-sm kn-badge">Total Transactions : ${counts.transactions}</span>
      </div>
    </div>`;
  }

  function renderGroupEmptyTable() {
    const ux = window.KNAdminUX;
    return `<div class="vis-table-wrap role-table-card kn-table-surface tmship-group-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 0, extra: "tmship-group-table" })}" aria-label="US Shipments group view">
          <thead>
            <tr class="vis-table__labels tmship-group-head">
              <th scope="col" class="tmship-group-col tmship-group-col--toggle" aria-hidden="true"></th>
              <th scope="col" class="tmship-group-col tmship-group-col--select" aria-hidden="true"></th>
              ${sortHeader("transactionId", "Transaction ID", "data-tmship-group-sort")}
              <th scope="col" class="tmship-group-col tmship-group-col--actions"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr class="tmship-group-row">
              <td class="tmship-group-col tmship-group-col--toggle">
                <button class="icon-btn icon-btn--on-surface tmship-group-expand" type="button" data-tmship-group-expand aria-expanded="${state.group.expanded ? "true" : "false"}" aria-label="${state.group.expanded ? "Collapse group" : "Expand group"}">${iconChevron(state.group.expanded)}</button>
              </td>
              <td class="tmship-group-col tmship-group-col--select">
                <label class="kn-checkbox kn-check kn-check--bare">
                  <input type="checkbox" data-tmship-group-select aria-label="Select group" />
                </label>
              </td>
              <td class="type-body-sm type-weight-medium">0 Transaction(s)</td>
              <td class="tmship-group-col tmship-group-col--actions">
                <div class="tmship-group-row-actions">
                  <button class="kn-link type-ui-sm" type="button" data-tmship-more-detail>More Detail</button>
                  <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn tmship-group-modify-btn" type="button" data-tmship-modify>${iconPencil()} Modify</button>
                </div>
              </td>
            </tr>
            <tr class="tmship-group-empty-row" aria-hidden="true">
              <td colspan="4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderGroupModifyTable() {
    const ux = window.KNAdminUX;
    const f = state.group.form;
    return `<div class="vis-table-wrap role-table-card kn-table-surface tmship-group-table-card tmship-group-table-card--modify">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 0, extra: "tmship-group-table" })}" aria-label="US Shipments group criteria">
          <thead>
            <tr class="vis-table__labels tmship-group-head">
              <th scope="col" class="tmship-group-col tmship-group-col--select" aria-hidden="true"></th>
              ${sortHeader("transactionId", "Transaction ID", "data-tmship-group-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Vessel Name</span></th>
              <th scope="col"><span class="type-caption-sm type-weight-medium">Port of Unlading</span></th>
              <th scope="col"><span class="type-caption-sm type-weight-medium">Arrival Date</span></th>
              <th scope="col"><span class="type-caption-sm type-weight-medium">Action Type</span></th>
              <th scope="col" class="tmship-group-col tmship-group-col--actions"><span class="visually-hidden">Row actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr class="tmship-group-modify-row">
              <td class="tmship-group-col tmship-group-col--select">
                <label class="kn-checkbox kn-check kn-check--bare">
                  <input type="checkbox" data-tmship-group-select aria-label="Select criteria row" />
                </label>
              </td>
              <td><input class="kn-field__control type-body-sm" type="text" value="${escapeHtml(f.transactionId)}" data-tmship-group-field="transactionId" aria-label="Transaction ID" /></td>
              <td><input class="kn-field__control type-body-sm" type="text" value="${escapeHtml(f.vesselName)}" data-tmship-group-field="vesselName" aria-label="Vessel Name" /></td>
              <td><input class="kn-field__control type-body-sm" type="text" value="${escapeHtml(f.portUnlading)}" data-tmship-group-field="portUnlading" aria-label="Port of Unlading" /></td>
              <td><input class="kn-field__control type-body-sm" type="date" value="${escapeHtml(f.arrivalDate)}" data-tmship-group-field="arrivalDate" aria-label="Arrival Date" /></td>
              <td>
                <div class="tmship-group-margin-type">
                  <span class="type-caption-sm type-weight-medium">Margin Type</span>
                  <label class="kn-checkbox kn-check type-body-sm">
                    <input type="checkbox" data-tmship-group-field="marginValue" ${f.marginValue ? "checked" : ""} aria-label="Value" />
                    Value
                  </label>
                </div>
              </td>
              <td class="tmship-group-col tmship-group-col--actions">
                <button class="icon-btn icon-btn--on-surface tmship-group-delete" type="button" data-tmship-group-delete aria-label="Delete criteria row">${iconTrash()}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tmship-group-modify-footer">
        <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-tmship-modify-cancel>Cancel</button>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-tmship-modify-save>Save</button>
      </div>
    </div>`;
  }

  function renderGroupView() {
    return `${renderViewToolbar()}
    ${renderGroupSummaryBar()}
    ${state.group.modifying ? renderGroupModifyTable() : renderGroupEmptyTable()}
    ${renderFilterDrawer()}`;
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function drawerField({ id, label, value, type = "text", openKey }) {
    if (type === "select") {
      return `<div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="${escapeHtml(id)}-label">${escapeHtml(label)}</span>
        ${adminSelect({ id, name: id, value, options: [{ id: "", label: "Select" }], placeholder: "Select", openKey, includeEmpty: true, emptyLabel: "Select", labelledBy: `${id}-label` })}
      </div>`;
    }
    const inputType = type === "date" ? "date" : "text";
    return `<div class="kn-field">
      <label class="type-caption-sm type-weight-medium kn-field__label" for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <input class="kn-field__control type-body-sm" id="${escapeHtml(id)}" type="${inputType}" value="${escapeHtml(value)}" data-tmship-drawer-field="${escapeHtml(id)}" placeholder="${type === "date" ? "" : "Search"}" />
    </div>`;
  }

  function renderFilterDrawer() {
    const d = state.drawer;
    const fields = [
      drawerField({ id: "tmship-drawer-mbl", label: "MBL", value: d.mbl, openKey: "drawer-mbl" }),
      drawerField({ id: "tmship-drawer-hbl", label: "HBL", value: d.hbl, openKey: "drawer-hbl" }),
      drawerField({ id: "tmship-drawer-invoice", label: "Invoice #", value: d.invoiceNumber, openKey: "drawer-invoice" }),
      drawerField({ id: "tmship-drawer-po", label: "PO #", value: d.poNumber, openKey: "drawer-po" }),
      drawerField({ id: "tmship-drawer-hts", label: "HTS", value: d.hts, openKey: "drawer-hts" }),
      drawerField({ id: "tmship-drawer-part", label: "Part", value: d.part, openKey: "drawer-part" }),
      drawerField({ id: "tmship-drawer-mid", label: "MID/Supp/Mfr (MID)", value: d.mid, openKey: "drawer-mid" }),
      drawerField({ id: "tmship-drawer-txn-id", label: "Transaction ID", value: d.drawerTransactionId, openKey: "drawer-txn-id" }),
      drawerField({ id: "tmship-drawer-vessel", label: "Vessel Name", value: d.vesselName, type: "select", openKey: "drawer-vessel" }),
      drawerField({ id: "tmship-drawer-port", label: "Port of Unlading", value: d.portUnlading, type: "select", openKey: "drawer-port" }),
      drawerField({ id: "tmship-drawer-arrival", label: "Arrival Date", value: d.arrivalDate, type: "date", openKey: "drawer-arrival" }),
      drawerField({ id: "tmship-drawer-username", label: "Username", value: d.username, type: "select", openKey: "drawer-username" }),
      drawerField({ id: "tmship-drawer-status", label: "Status", value: d.status, type: "select", openKey: "drawer-status" }),
      drawerField({ id: "tmship-drawer-lock", label: "Lock", value: d.lock, type: "select", openKey: "drawer-lock" }),
      drawerField({ id: "tmship-drawer-poa", label: "POA", value: d.poa, type: "select", openKey: "drawer-poa" }),
      drawerField({ id: "tmship-drawer-recon", label: "Recon", value: d.recon, type: "select", openKey: "drawer-recon" }),
      drawerField({ id: "tmship-drawer-entry-type", label: "Time of Entry", value: d.timeOfEntry, type: "select", openKey: "drawer-entry-type" }),
      drawerField({ id: "tmship-drawer-export-country", label: "Country of Export", value: d.countryExport, type: "select", openKey: "drawer-export-country" }),
      drawerField({ id: "tmship-drawer-import-country", label: "Country of Import", value: d.countryImport, type: "select", openKey: "drawer-import-country" }),
      drawerField({ id: "tmship-drawer-spi", label: "SPI", value: d.spi, type: "select", openKey: "drawer-spi" }),
      drawerField({ id: "tmship-drawer-lock-reason", label: "Lock Reason", value: d.lockReason, type: "select", openKey: "drawer-lock-reason" }),
      drawerField({ id: "tmship-drawer-updated", label: "Updated Date", value: d.updatedDate, type: "date", openKey: "drawer-updated" }),
      drawerField({ id: "tmship-drawer-arrival-range", label: "Arrival Date Range", value: d.arrivalDateRange, type: "date", openKey: "drawer-arrival-range" }),
      drawerField({ id: "tmship-drawer-export-range", label: "Export Date Range", value: d.exportDateRange, type: "date", openKey: "drawer-export-range" }),
      drawerField({ id: "tmship-drawer-load-date", label: "Load Date", value: d.loadDate, type: "date", openKey: "drawer-load-date" })
    ].join("");

    return `<div class="kn-drawer-root tmship-filter-drawer-root${state.filterDrawerOpen ? " is-open" : ""}" id="kn-tmship-filter-drawer"${state.filterDrawerOpen ? "" : " hidden"}>
      <div class="kn-drawer__overlay" data-tmship-drawer-dismiss tabindex="-1"></div>
      <aside class="kn-drawer" role="dialog" aria-modal="true" aria-labelledby="kn-tmship-filter-title">
        <header class="kn-header kn-header--large kn-drawer__header">
          <div class="kn-header__copy kn-drawer__titles">
            <h2 class="kn-header__title" id="kn-tmship-filter-title">More Filters</h2>
          </div>
          <button class="kn-header__close icon-btn" type="button" data-tmship-drawer-dismiss aria-label="Close">
            <img src="./assets/quick-actions/close.svg" width="16" height="16" alt="" />
          </button>
        </header>
        <div class="kn-drawer__body kn-box kn-box--column">
          <div class="user-form-grid tmship-filter-grid">${fields}</div>
        </div>
        <footer class="kn-footer kn-drawer__footer">
          <div class="kn-footer__actions kn-btn-group kn-btn-group--loose kn-drawer__footer-actions">
            <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-tmship-drawer-clear>Clear</button>
            <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-tmship-drawer-search>Search</button>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function renderTxnView() {
    const ux = window.KNAdminUX;
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const f = state.txn.filters;
    const body = ux.tmTableEmptyRow({ colspan: TXN_COL_COUNT, mode: "inline" });

    return `${renderViewToolbar()}
    <div class="vis-table-wrap role-table-card kn-table-surface tmship-txn-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 1, extra: "tmship-txn-table" })}" aria-label="US Shipments transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID")}
              ${sortHeader("transactionStatus", "Transaction Status")}
              ${sortHeader("etd", "ETD")}
              ${sortHeader("companyName", "Company Name")}
              ${sortHeader("mot", "MOT")}
              ${sortHeader("mbl", "MBL/MAWB/PAPS")}
              ${sortHeader("hbl", "HBL/HAWB")}
              ${sortHeader("username", "Username")}
              ${sortHeader("countryExport", "Country of Export")}
              ${sortHeader("countryImport", "Country of Import")}
              ${sortHeader("broker", "Broker")}
              ${sortHeader("poNumbers", "PO#s")}
              ${sortHeader("portUnlading", "Port of Unlading")}
              ${sortHeader("vesselName", "Vessel Name")}
              ${sortHeader("timeOfEntry", "Time of Entry")}
              ${sortHeader("loadDate", "Load date")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "transactionId", value: f.transactionId, label: "transaction ID" })}
              ${ux.colKnSelect({ attr: "data-tmship-filter", key: "transactionStatus", value: f.transactionStatus, label: "transaction status", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [] })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "etd", value: f.etd, label: "ETD" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "companyName", value: f.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-tmship-filter", key: "mot", value: f.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }] })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "mbl", value: f.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "hbl", value: f.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "username", value: f.username, label: "username" })}
              ${ux.emptyColFilter()}
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "broker", value: f.broker, label: "broker" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "poNumbers", value: f.poNumbers, label: "PO numbers" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "portUnlading", value: f.portUnlading, label: "port of unlading" })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "vesselName", value: f.vesselName, label: "vessel name" })}
              ${ux.colKnSelect({ attr: "data-tmship-filter", key: "timeOfEntry", value: f.timeOfEntry, label: "time of entry", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [] })}
              ${ux.colFilter({ attr: "data-tmship-filter", key: "loadDate", value: f.loadDate, label: "load date" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-tmship-page", label: "Shipments pages", sizeSelect: adminSelect({ id: "kn-tmship-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>
    ${renderFilterDrawer()}`;
  }

  function render() {
    const page = document.getElementById("kn-tmship-page");
    const root = document.getElementById("kn-tmship-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tmship-toolbar tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Shipments list view">
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-tmship-view="transaction">Transaction View</button>
        <button class="btn ${state.view === "group" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "group"}" data-tmship-view="group">Group View</button>
      </div>
      <div class="tm-toolbar__meta tmship-toolbar__meta"><span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span></div>
    </div>
    ${state.view === "transaction" ? renderTxnView() : renderGroupView()}`;
    window.KNAdminUX.restoreColFilterFocus(root, filterFocus);
    window.KNDrawer?.hydrate(root.querySelector("#kn-tmship-filter-drawer"));
    if (state.filterDrawerOpen) {
      window.requestAnimationFrame(() => {
        root.querySelector("[data-tmship-drawer-dismiss].kn-header__close")?.focus();
      });
    } else if (drawerLastFocus && typeof drawerLastFocus.focus === "function") {
      drawerLastFocus.focus();
      drawerLastFocus = null;
    }
  }

  function clearFilters() {
    state.txn.filters = emptyTxnFilters();
    state.drawer = emptyDrawerFilters();
    state.txn.page = 1;
    state.group.modifying = false;
    state.group.form = emptyGroupForm();
    render();
  }

  function openFilterDrawer() {
    drawerLastFocus = document.activeElement;
    state.filterDrawerOpen = true;
    state.selectOpen = "";
    render();
  }

  function closeFilterDrawer() {
    state.filterDrawerOpen = false;
    state.selectOpen = "";
    render();
  }

  function drawerFieldKey(id) {
    const map = {
      "tmship-drawer-mbl": "mbl",
      "tmship-drawer-hbl": "hbl",
      "tmship-drawer-invoice": "invoiceNumber",
      "tmship-drawer-po": "poNumber",
      "tmship-drawer-hts": "hts",
      "tmship-drawer-part": "part",
      "tmship-drawer-mid": "mid",
      "tmship-drawer-txn-id": "drawerTransactionId",
      "tmship-drawer-vessel": "vesselName",
      "tmship-drawer-port": "portUnlading",
      "tmship-drawer-arrival": "arrivalDate",
      "tmship-drawer-username": "username",
      "tmship-drawer-status": "status",
      "tmship-drawer-lock": "lock",
      "tmship-drawer-poa": "poa",
      "tmship-drawer-recon": "recon",
      "tmship-drawer-entry-type": "timeOfEntry",
      "tmship-drawer-export-country": "countryExport",
      "tmship-drawer-import-country": "countryImport",
      "tmship-drawer-spi": "spi",
      "tmship-drawer-lock-reason": "lockReason",
      "tmship-drawer-updated": "updatedDate",
      "tmship-drawer-arrival-range": "arrivalDateRange",
      "tmship-drawer-export-range": "exportDateRange",
      "tmship-drawer-load-date": "loadDate"
    };
    return map[id] || "";
  }

  const DRAWER_SELECT_KEYS = {
    "drawer-vessel": "vesselName",
    "drawer-port": "portUnlading",
    "drawer-username": "username",
    "drawer-status": "status",
    "drawer-lock": "lock",
    "drawer-poa": "poa",
    "drawer-recon": "recon",
    "drawer-entry-type": "timeOfEntry",
    "drawer-export-country": "countryExport",
    "drawer-import-country": "countryImport",
    "drawer-spi": "spi",
    "drawer-lock-reason": "lockReason"
  };

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-tmship-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-tmship-view") || "transaction";
        state.selectOpen = "";
        state.filterDrawerOpen = false;
        render();
        return;
      }
      if (event.target.closest("[data-tmship-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      if (event.target.closest("[data-tmship-more-filters]")) { event.preventDefault(); openFilterDrawer(); return; }
      if (event.target.closest("[data-tmship-drawer-dismiss]")) { event.preventDefault(); closeFilterDrawer(); return; }
      if (event.target.closest("[data-tmship-drawer-clear]")) {
        event.preventDefault();
        state.drawer = emptyDrawerFilters();
        render();
        return;
      }
      if (event.target.closest("[data-tmship-drawer-search]")) {
        event.preventDefault();
        closeFilterDrawer();
        toast("Filters applied. Group view remains empty in this sample.", "notice");
        return;
      }
      if (event.target.closest("[data-tmship-modify]")) {
        event.preventDefault();
        state.group.modifying = true;
        state.group.form = emptyGroupForm();
        render();
        return;
      }
      if (event.target.closest("[data-tmship-modify-cancel]")) {
        event.preventDefault();
        state.group.modifying = false;
        state.group.form = emptyGroupForm();
        render();
        return;
      }
      if (event.target.closest("[data-tmship-modify-save]")) {
        event.preventDefault();
        toast("Grouping criteria saved in this sample.", "positive");
        state.group.modifying = false;
        render();
        return;
      }
      if (event.target.closest("[data-tmship-group-delete]")) {
        event.preventDefault();
        state.group.modifying = false;
        state.group.form = emptyGroupForm();
        toast("Grouping criteria removed.", "notice");
        render();
        return;
      }
      if (event.target.closest("[data-tmship-more-detail]")) {
        event.preventDefault();
        toast("More Detail is not available in this sample.", "notice");
        return;
      }
      const groupExpand = event.target.closest("[data-tmship-group-expand]");
      if (groupExpand) {
        event.preventDefault();
        state.group.expanded = !state.group.expanded;
        render();
        return;
      }
      const sort = event.target.closest("[data-tmship-sort], [data-tmship-group-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-tmship-sort") || sort.getAttribute("data-tmship-group-sort");
        const isGroup = sort.hasAttribute("data-tmship-group-sort");
        const view = isGroup ? state.group : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else { view.sortKey = key; view.sortDir = "asc"; }
        if (!isGroup) state.txn.page = 1;
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-tmship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-tmship-page"));
        if (Number.isFinite(next) && next >= 1) { state.txn.page = next; render(); }
        return;
      }
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") { state.txn.pageSize = Number(value) || 100; state.txn.page = 1; render(); return; }
          if (DRAWER_SELECT_KEYS[key]) { state.drawer[DRAWER_SELECT_KEYS[key]] = value; render(); return; }
          if (key in state.txn.filters) { state.txn.filters[key] = value; state.txn.page = 1; render(); }
        }
      })) return;
    });
    page.addEventListener("input", (event) => {
      const groupInput = event.target.closest("[data-tmship-group-field]");
      if (groupInput) {
        const key = groupInput.getAttribute("data-tmship-group-field");
        if (key === "marginValue") state.group.form.marginValue = groupInput.checked;
        else if (key && key in state.group.form) state.group.form[key] = groupInput.value;
        return;
      }
      const drawerInput = event.target.closest("[data-tmship-drawer-field]");
      if (drawerInput) {
        const key = drawerFieldKey(drawerInput.getAttribute("data-tmship-drawer-field"));
        if (key && key in state.drawer) { state.drawer[key] = drawerInput.value; }
        return;
      }
      const input = event.target.closest("[data-tmship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const key = input.getAttribute("data-tmship-filter");
      if (!key || !(key in state.txn.filters)) return;
      state.txn.filters[key] = input.value;
      state.txn.page = 1;
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden || event.key !== "Escape" || !state.filterDrawerOpen) return;
      event.preventDefault();
      closeFilterDrawer();
    });
  }

  function stopAutorefresh() { if (refreshTimer != null) { window.clearInterval(refreshTimer); refreshTimer = null; } }
  function startAutorefresh() {
    stopAutorefresh();
    refreshTimer = window.setInterval(() => {
      const page = document.getElementById("kn-tmship-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString();
      state.selectOpen = "";
      render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.selectOpen = ""; if (state.filterDrawerOpen) closeFilterDrawer(); stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-tmship-page");
    if (!page || page.hidden) { stopAutorefresh(); return; }
    render();
    startAutorefresh();
  }
  function init() {
    const page = document.getElementById("kn-tmship-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => {
      if (page.hidden || !state.selectOpen) return;
      state.selectOpen = "";
      render();
    });
  }

  window.KNUsShipments = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); } };
})();
