(() => {
  const ROUTE = "#transaction-us-ftz";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 3);
    return d.toISOString();
  })();
  let refreshTimer = null;

  const COMPANIES = [
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "PACIFIC RIM TRADING CO",
    "ACUITY BRANDS",
    "ICHOR SYSTEMS INC",
    "JOBY AERO, INC",
    "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
    "SAFRAN CABIN CANADA CO",
    "UNITED MACHINING NORTH AMERICA LLC",
    "HURST JAWS OF LIFE INC - SMALL"
  ];
  const ZONES = ["FTZ-25B", "FTZ-84A", "FTZ-122", "FTZ-9", "FTZ-49", "FTZ-202"];
  const COUNTRIES = [
    { code: "CN", name: "China" },
    { code: "VN", name: "Vietnam" },
    { code: "MX", name: "Mexico" },
    { code: "DE", name: "Germany" },
    { code: "KR", name: "Korea, Republic of" },
    { code: "JP", name: "Japan" }
  ];
  const ID_MID = ["FTZ1", "FTZ2", "084A", "09ZG", "0A1K", "0B7M"];

  const emptyTxnFilters = () => ({
    chip: "all",
    transactionId: "",
    companyName: "",
    zoneId: "",
    admissionNumber: "",
    ftzStatus: "",
    eta: "",
    shipments: "",
    mot: "",
    mbl: "",
    hbl: "",
    countryExport: "",
    filingDate: ""
  });
  const emptyShipFilters = () => ({
    chip: "allActive",
    shipmentId: "",
    companyName: "",
    shipmentState: "",
    zoneId: "",
    mot: "",
    mbl: "",
    hbl: "",
    countryExport: ""
  });

  const state = {
    view: "transaction",
    menuOpen: "",
    selectOpen: "",
    booting: false,
    ready: false,
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 100, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(v) {
    return window.KNAdminUX.escapeHtml(v);
  }
  function pad(n, w) {
    return String(n).padStart(w, "0");
  }
  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }
  function toast(content, color = "positive") {
    if (typeof window.showKnToast === "function") window.showKnToast({ content, color });
  }
  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function chipForIndex(i) {
    const r = i % 10;
    if (r === 0) return "closed";
    if (r <= 2) return "pending";
    if (r <= 5) return "admitted";
    return "active";
  }

  function statusForChip(chip) {
    if (chip === "pending") return { label: "PENDING ADMISSION", tone: "notice" };
    if (chip === "admitted") return { label: "ADMITTED", tone: "positive" };
    if (chip === "closed") return { label: "CLOSED", tone: "neutral" };
    return { label: "ACTIVE", tone: "information" };
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = [];
    for (let i = 0; i < 128; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const chip = chipForIndex(i);
      const status = statusForChip(chip);
      const country = COUNTRIES[i % COUNTRIES.length];
      const eta = new Date(Date.UTC(2025 + (i % 2), (i * 3) % 12, 1 + (i % 27)));
      const filing = new Date(eta.getTime() - ((i % 12) + 2) * 86400000);
      rows.push({
        id: `ftz-${i + 1}`,
        transactionId: `FTZ-${mid}-${100 + (i % 800)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        zoneId: ZONES[i % ZONES.length],
        admissionNumber: `ADM-${840000 + i * 17}`,
        ftzStatus: status.label,
        statusTone: status.tone,
        statusChip: chip,
        eta: formatDate(eta),
        etaSort: eta.getTime(),
        shipments: `KX-${mid}-${20 + (i % 70)}`,
        mot: i % 4 === 0 ? "AIR" : "OCEAN",
        mbl: `MBL${pad((i * 7919) % 1e10, 10)}`,
        hbl: `HBL${pad((i * 6287) % 1e10, 10)}`,
        countryExport: `${country.code} - ${country.name}`,
        filingDate: formatDate(filing),
        filingSort: filing.getTime()
      });
    }
    Object.assign(rows[0], {
      transactionId: "FTZ-FTZ1-100",
      companyName: "GLOBAL-PAK",
      zoneId: "FTZ-25B",
      admissionNumber: "ADM-840000",
      ftzStatus: "ACTIVE",
      statusTone: "information",
      statusChip: "active",
      mot: "OCEAN"
    });
    seedCache = rows;
    return rows;
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = [];
    for (let i = 0; i < 420; i += 1) {
      let statusChip;
      let shipmentState;
      let stateTone;
      if (i < 60) {
        statusChip = "notCreated";
        shipmentState = "Not Created";
        stateTone = "notice";
      } else if (i < 140) {
        statusChip = "inProgress";
        shipmentState = "In Progress";
        stateTone = "notice";
      } else {
        statusChip = "completed";
        shipmentState = "Completed";
        stateTone = "positive";
      }
      const mid = ID_MID[i % ID_MID.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      rows.push({
        id: `ftz-ship-${i + 1}`,
        shipmentId: `KX-${mid}-${10 + (i % 90)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        shipmentState,
        statusChip,
        stateTone,
        zoneId: ZONES[i % ZONES.length],
        mot: i % 5 === 0 ? "AIR" : "OCEAN",
        mbl: String(40624604451 + i * 41),
        hbl: `H${pad((i * 4567) % 1e9, 9)}`,
        countryExport: `${country.code} - ${country.name}`
      });
    }
    shipSeedCache = rows;
    return rows;
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    const dateKeys = { eta: "etaSort", filingDate: "filingSort" };
    rows.sort((a, b) => {
      let av;
      let bv;
      if (sortKey in dateKeys) {
        av = a[dateKeys[sortKey]] || 0;
        bv = b[dateKeys[sortKey]] || 0;
      } else {
        av = String(a[sortKey] || "").toLowerCase();
        bv = String(b[sortKey] || "").toLowerCase();
      }
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
      const chipOk = f.chip === "all" || row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.transactionId, row.transactionId],
        [f.companyName, row.companyName],
        [f.zoneId, row.zoneId],
        [f.admissionNumber, row.admissionNumber],
        [f.ftzStatus, row.ftzStatus],
        [f.eta, row.eta],
        [f.shipments, row.shipments],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryExport, row.countryExport],
        [f.filingDate, row.filingDate]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.txn.sortKey, state.txn.sortDir);
  }

  function filteredShipRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.ship.filters;
    const rows = buildShipSeed().filter((row) => {
      const chipOk =
        f.chip === "allActive"
          ? row.statusChip === "notCreated" || row.statusChip === "inProgress"
          : row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.shipmentId, row.shipmentId],
        [f.companyName, row.companyName],
        [f.shipmentState, row.shipmentState],
        [f.zoneId, row.zoneId],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryExport, row.countryExport]
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
      active: all.filter((r) => r.statusChip === "active").length,
      pending: all.filter((r) => r.statusChip === "pending").length,
      admitted: all.filter((r) => r.statusChip === "admitted").length,
      closed: all.filter((r) => r.statusChip === "closed").length
    };
  }

  function shipChipCounts() {
    const all = buildShipSeed();
    const notCreated = all.filter((r) => r.statusChip === "notCreated").length;
    const inProgress = all.filter((r) => r.statusChip === "inProgress").length;
    const completed = all.filter((r) => r.statusChip === "completed").length;
    return { allActive: notCreated + inProgress, notCreated, inProgress, completed };
  }

  function adminSelect(opts) {
    return window.KNAdminUX.select({ ...opts, open: state.selectOpen });
  }

  function skeletonTable(cols, label) {
    const ux = window.KNAdminUX;
    const heads = Array.from({ length: cols }, (_, i) => (i === 0 ? ux.actionsColHeader() : `<th scope="col">…</th>`)).join("");
    return `<div class="vis-table-wrap role-table-card kn-table-surface" aria-busy="true">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3 })}" aria-label="${escapeHtml(label)}">
          <thead><tr class="vis-table__labels">${heads}</tr></thead>
          <tbody>${ux.tableSkeletonRows({ cols, rows: 8 })}</tbody>
        </table>
      </div>
    </div>`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading FTZ filings." })}${skeletonTable(13, "Loading US FTZ transactions")}`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows
          .map(
            (row) => `<tr data-ftz-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmAdminRowActions({ id: row.id, label: row.transactionId, prefix: "ftz", menuOpen: state.menuOpen === row.id })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-ftz-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.zoneId)}">${escapeHtml(row.zoneId)}</span></td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.admissionNumber)}">${escapeHtml(row.admissionNumber)}</span></td>
          <td class="admin-table-nowrap">${statusBadge(row.ftzStatus, row.statusTone)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.shipments)}">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.mbl)}">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.hbl)}">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.filingDate)}</td>
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 13,
          title: "No FTZ filings found matching your search",
          description: "Clear filters or switch status chips to see zone admissions.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "active", label: "Active", count: counts.active, selected: chip === "active" },
        { id: "pending", label: "Pending Admission", count: counts.pending, selected: chip === "pending" },
        { id: "admitted", label: "Admitted", count: counts.admitted, selected: chip === "admitted" },
        { id: "closed", label: "Closed", count: counts.closed, selected: chip === "closed" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3 })}" aria-label="US FTZ transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-ftz-sort")}
              ${sortHeader("companyName", "Company Name", "data-ftz-sort")}
              ${sortHeader("zoneId", "Zone ID", "data-ftz-sort")}
              ${sortHeader("admissionNumber", "Admission Number", "data-ftz-sort")}
              ${sortHeader("ftzStatus", "FTZ Status", "data-ftz-sort")}
              ${sortHeader("eta", "ETA", "data-ftz-sort")}
              ${sortHeader("shipments", "Shipments", "data-ftz-sort")}
              ${sortHeader("mot", "MoT", "data-ftz-sort")}
              ${sortHeader("mbl", "MBL", "data-ftz-sort")}
              ${sortHeader("hbl", "HBL", "data-ftz-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-ftz-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-ftz-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "zoneId", value: state.txn.filters.zoneId, label: "zone ID" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "admissionNumber", value: state.txn.filters.admissionNumber, label: "admission number" })}
              ${ux.colKnSelect({
                attr: "data-ftz-filter",
                key: "ftzStatus",
                value: state.txn.filters.ftzStatus,
                label: "FTZ status",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "PENDING ADMISSION", label: "PENDING ADMISSION" },
                  { value: "ADMITTED", label: "ADMITTED" },
                  { value: "CLOSED", label: "CLOSED" }
                ]
              })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "eta", value: state.txn.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments" })}
              ${ux.colKnSelect({
                attr: "data-ftz-filter",
                key: "mot",
                value: state.txn.filters.mot,
                label: "MoT",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "OCEAN", label: "OCEAN" },
                  { value: "AIR", label: "AIR" }
                ]
              })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "countryExport", value: state.txn.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-ftz-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({
        page: state.txn.page,
        pages,
        total: rows.length,
        pageSize: state.txn.pageSize,
        pageAttr: "data-ftz-page",
        label: "FTZ transaction pages",
        sizeSelect: adminSelect({
          id: "kn-ftz-pagesize",
          name: "pageSize",
          value: String(state.txn.pageSize),
          options: [
            { id: "25", label: "25" },
            { id: "50", label: "50" },
            { id: "100", label: "100" }
          ],
          placeholder: "Rows",
          openKey: "pageSize",
          compact: true,
          includeEmpty: false
        })
      })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading FTZ shipments." })}${skeletonTable(9, "Loading US FTZ shipments")}`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = pageRows.length
      ? pageRows
          .map(
            (row) => `<tr data-ftz-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmAdminRowActions({ id: row.id, label: row.shipmentId, prefix: "ftz-ship", menuOpen: state.menuOpen === row.id })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-ftz-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.zoneId)}">${escapeHtml(row.zoneId)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.mbl)}">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.hbl)}">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 9,
          title: "No FTZ shipments found matching your search",
          description: "Clear filters or switch status chips to see shipments.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });
    return `${ux.toolbar({
      chips: [
        { id: "allActive", label: "All Active", count: counts.allActive, selected: chip === "allActive" },
        { id: "notCreated", label: "Not Created", count: counts.notCreated, selected: chip === "notCreated" },
        { id: "inProgress", label: "In Progress", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "completed", label: "Completed", count: counts.completed, selected: chip === "completed" }
      ],
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3 })}" aria-label="US FTZ shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("shipmentId", "Shipment ID", "data-ftz-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-ftz-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-ftz-ship-sort")}
              ${sortHeader("zoneId", "Zone ID", "data-ftz-ship-sort")}
              ${sortHeader("mot", "MoT", "data-ftz-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-ftz-ship-sort")}
              ${sortHeader("hbl", "HBL", "data-ftz-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-ftz-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({
                attr: "data-ftz-ship-filter",
                key: "shipmentState",
                value: state.ship.filters.shipmentState,
                label: "shipment state",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "Not Created", label: "Not Created" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Completed", label: "Completed" }
                ]
              })}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "zoneId", value: state.ship.filters.zoneId, label: "zone ID" })}
              ${ux.colKnSelect({
                attr: "data-ftz-ship-filter",
                key: "mot",
                value: state.ship.filters.mot,
                label: "MoT",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "OCEAN", label: "OCEAN" },
                  { value: "AIR", label: "AIR" }
                ]
              })}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-ftz-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({
        page: state.ship.page,
        pages,
        total: rows.length,
        pageSize: state.ship.pageSize,
        pageAttr: "data-ftz-ship-page",
        label: "FTZ shipment pages",
        sizeSelect: adminSelect({
          id: "kn-ftz-ship-pagesize",
          name: "shipPageSize",
          value: String(state.ship.pageSize),
          options: [
            { id: "25", label: "25" },
            { id: "50", label: "50" },
            { id: "100", label: "100" }
          ],
          placeholder: "Rows",
          openKey: "shipPageSize",
          compact: true,
          includeEmpty: false
        })
      })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-ftz-page");
    const root = document.getElementById("kn-ftz-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => {
      const raw = window.KNAdminUX.relativeTime(lastUpdatedIso);
      const hours = raw.match(/^(\d+)h ago$/);
      return hours ? `${hours[1]} hours ago` : raw;
    })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="FTZ list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-ftz-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-ftz-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta"><span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span></div>
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

  function findTxnRow(id) {
    return buildSeed().find((r) => r.id === id);
  }
  function findShipRow(id) {
    return buildShipSeed().find((r) => r.id === id);
  }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-ftz-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-ftz-view") || "transaction";
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
      const sort = event.target.closest("[data-ftz-sort], [data-ftz-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-ftz-sort") || sort.getAttribute("data-ftz-ship-sort");
        const view = sort.hasAttribute("data-ftz-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else {
          view.sortKey = key;
          view.sortDir = "asc";
        }
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
      const pageBtn = event.target.closest("[data-ftz-page], [data-ftz-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-ftz-page") || pageBtn.getAttribute("data-ftz-ship-page"));
        const view = pageBtn.hasAttribute("data-ftz-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) {
          view.page = next;
          state.menuOpen = "";
          render();
        }
        return;
      }
      if (window.KNAdminUX.handleMoreClick(event, { open: state.menuOpen, setOpen: (n) => { state.menuOpen = n; render(); } })) return;
      if (
        window.KNAdminUX.handleSelectClick(event, {
          open: state.selectOpen,
          setOpen: (n) => {
            state.selectOpen = n;
            render();
          },
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
        })
      )
        return;
      const open = event.target.closest("[data-ftz-open], [data-ftz-ship-open]");
      if (open) {
        event.preventDefault();
        const isShip = open.hasAttribute("data-ftz-ship-open");
        const row = isShip ? findShipRow(open.getAttribute("data-ftz-ship-open")) : findTxnRow(open.getAttribute("data-ftz-open"));
        const recId = row?.id;
        if (recId) {
          location.hash = `#transaction-us-ftz/history/${encodeURIComponent(recId)}`;
        }
        return;
      }
      const copy = event.target.closest("[data-ftz-copy], [data-ftz-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-ftz-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-ftz-ship-copy")) : findTxnRow(copy.getAttribute("data-ftz-copy"));
        const text = (isShip ? row?.shipmentId : row?.transactionId) || "";
        if (text && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(
            () => toast(`Copied ${text}.`),
            () => toast(`Copy ${text} from the table.`, "notice")
          );
        } else toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        return;
      }
      const history = event.target.closest("[data-ftz-history], [data-ftz-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-ftz-ship-history");
        const row = isShip ? findShipRow(history.getAttribute("data-ftz-ship-history")) : findTxnRow(history.getAttribute("data-ftz-history"));
        toast(`History for ${(isShip ? row?.shipmentId : row?.transactionId) || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-ftz-delete], [data-ftz-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-ftz-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-ftz-ship-delete")) : findTxnRow(del.getAttribute("data-ftz-delete"));
        toast(`Delete is disabled in this sample (${(isShip ? row?.shipmentId : row?.transactionId) || "record"}).`, "notice");
      }
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-ftz-filter], [data-ftz-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-ftz-ship-filter");
      const key = input.getAttribute(isShip ? "data-ftz-ship-filter" : "data-ftz-filter");
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
      const page = document.getElementById("kn-ftz-page");
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
    const page = document.getElementById("kn-ftz-page");
    if (!page || page.hidden) {
      stopAutorefresh();
      return;
    }
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
    const page = document.getElementById("kn-ftz-page");
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

  window.KNUsFtz = {
    init,
    sync,
    suspend,
    route: ROUTE,
    list() {
      return buildSeed();
    },
    listShipments() {
      return buildShipSeed();
    }
  };
})();
