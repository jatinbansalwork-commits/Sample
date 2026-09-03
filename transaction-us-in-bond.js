(() => {
  const ROUTE = "#transaction-us-in-bond";
  const AUTOREFRESH_MS = 60_000;

  let lastUpdatedIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 4);
    return d.toISOString();
  })();
  let refreshTimer = null;

  const COMPANIES = [
    "HURST JAWS OF LIFE INC - SMALL",
    "JOBY AERO, INC",
    "SAFRAN CABIN INC. - GARDEN GROVE",
    "SOUTHERN CHAMPION TRAY",
    "ACUITY BRANDS",
    "ICHOR SYSTEMS INC",
    "UNITED MACHINING NORTH AMERICA LLC",
    "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
    "SAFRAN CABIN CANADA CO",
    "PACIFIC RIM TRADING CO",
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC"
  ];

  const COUNTRIES = [
    { code: "DE", name: "Germany" },
    { code: "CN", name: "China" },
    { code: "CA", name: "Canada" },
    { code: "AT", name: "Austria" },
    { code: "FR", name: "France" },
    { code: "VN", name: "Vietnam" },
    { code: "MX", name: "Mexico" },
    { code: "JP", name: "Japan" },
    { code: "KR", name: "Korea, Republic of" },
    { code: "GB", name: "United Kingdom" }
  ];

  const IMPORT_COUNTRY = { code: "US", name: "United States of America" };
  const ID_MID = ["09ZG", "09S3", "0A1K", "0B7M", "0C2P", "0D4R", "0E8T", "0F3W", "C2A5", "06X6"];

  const emptyTxnFilters = () => ({
    chip: "all",
    transactionId: "",
    companyName: "",
    entryNumber: "",
    transactionState: "",
    eta: "",
    shipments: "",
    filingDate: "",
    mot: "",
    mbl: "",
    hbl: "",
    countryImport: "",
    countryExport: "",
    username: ""
  });

  const emptyShipFilters = () => ({
    chip: "notCreated",
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
    booting: false,
    ready: false,
    txn: {
      page: 1,
      pageSize: 100,
      sortKey: "transactionId",
      sortDir: "asc",
      filters: emptyTxnFilters()
    },
    ship: {
      page: 1,
      pageSize: 100,
      sortKey: "shipmentId",
      sortDir: "asc",
      filters: emptyShipFilters()
    }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(value) {
    return window.KNAdminUX.escapeHtml(value);
  }

  function pad(n, width) {
    return String(n).padStart(width, "0");
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function toast(content, color = "positive") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  function iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`;
  }

  function stateBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function parseEta(label) {
    const t = Date.parse(label);
    return Number.isNaN(t) ? 0 : t;
  }

  function buildSeed() {
    if (seedCache) {
      return seedCache;
    }
    seedCache = [
      {
        id: "inb-1",
        transactionId: "INB-C2A5-3",
        entryNumber: "undefined-0000000009",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "Aug 28, 2025",
        etaSort: parseEta("Aug 28, 2025"),
        companyName: "SOUTHERN CHAMPION TRAY",
        shipments: "KX-C2A5-93",
        filingDate: "",
        mot: "OCEAN",
        mbl: "ONEYSGNFL9591500",
        hbl: "MCLMVSSAV2507004",
        countryImport: "US - United States of America",
        countryExport: "VN - Vietnam",
        username: ""
      },
      {
        id: "inb-2",
        transactionId: "INB-C2A5-2",
        entryNumber: "undefined-0000000008",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "Aug 28, 2025",
        etaSort: parseEta("Aug 28, 2025"),
        companyName: "SOUTHERN CHAMPION TRAY",
        shipments: "KX-C2A5-92",
        filingDate: "",
        mot: "OCEAN",
        mbl: "ONEYSGNFL9484600",
        hbl: "MCLMVSSAV2507003",
        countryImport: "US - United States of America",
        countryExport: "VN - Vietnam",
        username: ""
      },
      {
        id: "inb-3",
        transactionId: "INB-C2A5-1",
        entryNumber: "undefined-0000000007",
        transactionState: "READY",
        statusChip: "submitted",
        eta: "Aug 21, 2025",
        etaSort: parseEta("Aug 21, 2025"),
        companyName: "SOUTHERN CHAMPION TRAY",
        shipments: "KX-C2A5-91",
        filingDate: "",
        mot: "OCEAN",
        mbl: "ONEYSGNFL9483500",
        hbl: "MCLMVSSAV2507005",
        countryImport: "US - United States of America",
        countryExport: "VN - Vietnam",
        username: ""
      },
      {
        id: "inb-4",
        transactionId: "INB-06X6-2",
        entryNumber: "undefined-0000000006",
        transactionState: "IN PROCESS",
        statusChip: "pending",
        eta: "May 10, 2025",
        etaSort: parseEta("May 10, 2025"),
        companyName: "ACUITY BRANDS",
        shipments: "KX-06X6-3",
        filingDate: "",
        mot: "TRUCK",
        mbl: "TRGN63707262679",
        hbl: "TRGN63707262679",
        countryImport: "US - United States of America",
        countryExport: "MX - Mexico",
        username: "MAREK TWAROWSKI"
      },
      {
        id: "inb-5",
        transactionId: "INB-06X6-1",
        entryNumber: "undefined-0000000005",
        transactionState: "IN PROCESS",
        statusChip: "error",
        eta: "May 10, 2025",
        etaSort: parseEta("May 10, 2025"),
        companyName: "ACUITY BRANDS",
        shipments: "KX-06X6-2",
        filingDate: "",
        mot: "TRUCK",
        mbl: "TRGN63707262570",
        hbl: "TRGN63707262570",
        countryImport: "US - United States of America",
        countryExport: "MX - Mexico",
        username: "MAREK TWAROWSKI"
      }
    ];
    return seedCache;
  }

  function buildShipSeed() {
    if (shipSeedCache) {
      return shipSeedCache;
    }
    const rows = [];
    const total = 5503;
    for (let i = 0; i < total; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const company = COMPANIES[i % COMPANIES.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      const eta = new Date(Date.UTC(2026, 7, 20 + (i % 10)));
      const mblNum = 40624604451 + i * 17;
      const hbl = `${pad((i * 6287) % 1e8, 4)}${String.fromCharCode(65 + (i % 26))}${((i * 11) % 36).toString(36).toUpperCase()}${pad(i % 1000, 3)}`;
      let statusChip; let shipmentState; let stateTone;
      if (i < 80) {
        statusChip = "notCreated";
        shipmentState = "New";
        stateTone = "information";
      } else if (i < 220) {
        statusChip = "inProgress";
        shipmentState = "In Progress";
        stateTone = "notice";
      } else {
        statusChip = "completed";
        shipmentState = "Completed";
        stateTone = "positive";
      }
      rows.push({
        id: `inb-ship-${i + 1}`,
        shipmentId: `KX-${mid}-${10 + (i % 90)}`,
        companyName: company,
        shipmentState,
        statusChip,
        stateTone,
        mot: "AIR",
        mbl: String(mblNum),
        hbl: hbl.slice(0, 11).toUpperCase(),
        countryExport: `${country.code} - ${country.name}`,
        countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
        eta: formatDate(eta),
        etaSort: eta.getTime()
      });
    }
    Object.assign(rows[0], {
      shipmentId: "KX-09ZG-12",
      companyName: "HURST JAWS OF LIFE INC - SMALL",
      mbl: "40624604451",
      hbl: "8521B6J4MQB",
      countryExport: "DE - Germany",
      eta: "Aug 26, 2026",
      etaSort: parseEta("Aug 26, 2026")
    });
    Object.assign(rows[1], {
      shipmentId: "KX-09S3-64",
      companyName: "JOBY AERO, INC",
      countryExport: "CN - China"
    });
    Object.assign(rows[2], {
      companyName: "SAFRAN CABIN INC. - GARDEN GROVE",
      countryExport: "CA - Canada"
    });
    shipSeedCache = rows;
    return rows;
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av;
      let bv;
      if (sortKey === "eta") {
        av = a.etaSort || 0;
        bv = b.etaSort || 0;
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
    const q = (value) => String(value || "").toLowerCase();
    const f = state.txn.filters;
    const rows = buildSeed().filter((row) => {
      const chipOk =
        f.chip === "all" ||
        (f.chip === "submitted" && row.statusChip === "submitted") ||
        (f.chip === "pending" && row.statusChip === "pending") ||
        (f.chip === "error" && row.statusChip === "error");
      if (!chipOk) return false;
      const checks = [
        [f.transactionId, row.transactionId],
        [f.companyName, row.companyName],
        [f.entryNumber, row.entryNumber],
        [f.transactionState, row.transactionState],
        [f.eta, row.eta],
        [f.shipments, row.shipments],
        [f.filingDate, row.filingDate],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryImport, row.countryImport],
        [f.countryExport, row.countryExport],
        [f.username, row.username]
      ];
      return checks.every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.txn.sortKey, state.txn.sortDir);
  }

  function filteredShipRows() {
    const q = (value) => String(value || "").toLowerCase();
    const f = state.ship.filters;
    const rows = buildShipSeed().filter((row) => {
      const chipOk =
        f.chip === "allActive"
          ? row.statusChip === "notCreated" || row.statusChip === "inProgress"
          : row.statusChip === f.chip;
      if (!chipOk) return false;
      const checks = [
        [f.shipmentId, row.shipmentId],
        [f.companyName, row.companyName],
        [f.shipmentState, row.shipmentState],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryExport, row.countryExport],
        [f.countryImport, row.countryImport],
        [f.eta, row.eta]
      ];
      return checks.every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.ship.sortKey, state.ship.sortDir);
  }

  function sortHeader(key, label, attr) {
    const view = state.view === "shipment" ? state.ship : state.txn;
    return window.KNAdminUX.sortHeader({
      key,
      label,
      sortKey: view.sortKey,
      sortDir: view.sortDir,
      attr: attr || (state.view === "shipment" ? "data-inb-ship-sort" : "data-inb-sort")
    });
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      submitted: all.filter((row) => row.statusChip === "submitted").length,
      pending: all.filter((row) => row.statusChip === "pending").length,
      error: all.filter((row) => row.statusChip === "error").length
    };
  }

  function shipChipCounts() {
    const all = buildShipSeed();
    const notCreated = all.filter((row) => row.statusChip === "notCreated").length;
    const inProgress = all.filter((row) => row.statusChip === "inProgress").length;
    const completed = all.filter((row) => row.statusChip === "completed").length;
    return {
      allActive: notCreated + inProgress,
      notCreated,
      inProgress,
      completed
    };
  }

  function adminSelect(opts) {
    return window.KNAdminUX.select({
      ...opts,
      open: state.selectOpen
    });
  }

  function rowActions(id, label, prefix) {
    const ux = window.KNAdminUX;
    return `<div class="user-row-actions">
      <button class="icon-btn" type="button" data-${prefix}-copy="${escapeHtml(id)}" aria-label="Copy ${escapeHtml(label)}" data-tooltip="Copy">${iconCopy()}</button>
      <button class="icon-btn" type="button" data-${prefix}-delete="${escapeHtml(id)}" aria-label="Delete ${escapeHtml(label)}" data-tooltip="Delete">${iconTrash()}</button>
      ${ux.moreMenu({
        id,
        open: state.menuOpen === id,
        items: [{ label: "View history", attr: `data-${prefix}-history="${escapeHtml(id)}"` }]
      })}
    </div>`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) {
      state.txn.page = pages;
    }
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;

    const body = pageRows.length
      ? pageRows
          .map(
            (row) => `<tr data-inb-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap">
            <a class="kn-link admin-name-link" href="#transaction-us-in-bond" data-inb-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}">
              <span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span>
            </a>
          </td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(ux.emptyDisplay(row.entryNumber))}</span></td>
          <td class="admin-table-nowrap">${stateBadge(row.transactionState)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.eta))}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.filingDate))}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td>${rowActions(row.id, row.transactionId, "inb")}</td>
        </tr>`
          )
          .join("")
      : `<tr class="role-empty-row"><td colspan="14">${ux.emptyState({
          title: "No In-Bond filings found matching your search", description: "Clear filters or switch status chips to see filings.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "submitted", label: "Submitted", count: counts.submitted, selected: chip === "submitted" },
        { id: "pending", label: "Pending Submission", count: counts.pending, selected: chip === "pending" },
        { id: "error", label: "Error", count: counts.error, selected: chip === "error" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}. Sorted by ${state.txn.sortKey}, ${state.txn.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card inb-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table inb-table" aria-label="US In-Bond transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-inb-sort")}
              ${sortHeader("companyName", "Company Name", "data-inb-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-inb-sort")}
              ${sortHeader("transactionState", "Transaction State", "data-inb-sort")}
              ${sortHeader("eta", "ETA", "data-inb-sort")}
              ${sortHeader("shipments", "Shipments", "data-inb-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-inb-sort")}
              ${sortHeader("mot", "MoT", "data-inb-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PAPS", "data-inb-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-inb-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-inb-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-inb-sort")}
              ${sortHeader("username", "Username", "data-inb-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-inb-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name", placeholder: "Search by company name" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number", placeholder: "Search by entry number" })}
              ${ux.colKnSelect({
                attr: "data-inb-filter",
                key: "transactionState",
                value: state.txn.filters.transactionState,
                label: "transaction state",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "NEW", label: "NEW" },
                  { value: "IN PROCESS", label: "IN PROCESS" },
                  { value: "READY", label: "READY" }
                ]
              })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "eta", value: state.txn.filters.eta, label: "ETA", placeholder: "Search by ETA" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments", placeholder: "Search by shipments" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date", placeholder: "Search by filing date" })}
              ${ux.colKnSelect({
                attr: "data-inb-filter",
                key: "mot",
                value: state.txn.filters.mot,
                label: "MoT",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "OCEAN", label: "OCEAN" },
                  { value: "TRUCK", label: "TRUCK" },
                  { value: "AIR", label: "AIR" }
                ]
              })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL/MAWB/PAPS" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "countryImport", value: state.txn.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "countryExport", value: state.txn.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "username", value: state.txn.filters.username, label: "username" })}
              ${ux.emptyColFilter()}
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
        pageAttr: "data-inb-page",
        label: "In-Bond transaction pages",
        sizeSelect: adminSelect({
          id: "kn-inb-pagesize",
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
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) {
      state.ship.page = pages;
    }
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;

    const body = pageRows.length
      ? pageRows
          .map(
            (row) => `<tr data-inb-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap">
            <a class="kn-link admin-name-link" href="#transaction-us-in-bond" data-inb-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}">
              <span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span>
            </a>
          </td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${stateBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td>${rowActions(row.id, row.shipmentId, "inb-ship")}</td>
        </tr>`
          )
          .join("")
      : `<tr class="role-empty-row"><td colspan="10">${ux.emptyState({
          title: "No In-Bond shipments found matching your search", description: "Clear filters or switch status chips to see shipments.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    return `${ux.toolbar({
      chips: [
        { id: "allActive", label: "All Active", count: counts.allActive, selected: chip === "allActive" },
        { id: "notCreated", label: "Not Created", count: counts.notCreated, selected: chip === "notCreated" },
        { id: "inProgress", label: "In Progress", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "completed", label: "Completed", count: counts.completed, selected: chip === "completed" }
      ],
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}. Sorted by ${state.ship.sortKey}, ${state.ship.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card inb-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table inb-table" aria-label="US In-Bond shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-inb-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-inb-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-inb-ship-sort")}
              ${sortHeader("mot", "MoT", "data-inb-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-inb-ship-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-inb-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-inb-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-inb-ship-sort")}
              ${sortHeader("eta", "ETA", "data-inb-ship-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({
                attr: "data-inb-ship-filter",
                key: "shipmentState",
                value: state.ship.filters.shipmentState,
                label: "shipment state",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "New", label: "New" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Completed", label: "Completed" }
                ]
              })}
              ${ux.colKnSelect({
                attr: "data-inb-ship-filter",
                key: "mot",
                value: state.ship.filters.mot,
                label: "MoT",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "AIR", label: "AIR" },
                  { value: "OCEAN", label: "OCEAN" },
                  { value: "TRUCK", label: "TRUCK" }
                ]
              })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-inb-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
              ${ux.emptyColFilter()}
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
        pageAttr: "data-inb-ship-page",
        label: "In-Bond shipment pages",
        sizeSelect: adminSelect({
          id: "kn-inb-ship-pagesize",
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
    const page = document.getElementById("kn-inb-page");
    const root = document.getElementById("kn-inb-root");
    if (!page || !root || page.hidden) {
      return;
    }
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => {
      const raw = window.KNAdminUX.relativeTime(lastUpdatedIso);
      const hours = raw.match(/^(\d+)h ago$/);
      return hours ? `${hours[1]} hours ago` : raw;
    })();
    root.innerHTML = `<div class="inb-toolbar tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="In-Bond list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-inb-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-inb-view="transaction">Transaction</button>
      </div>
      <div class="inb-toolbar__meta tm-toolbar__meta">
        <span class="type-caption-sm inb-updated tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
        <button class="btn btn--primary btn--sm type-ui-sm" type="button" data-inb-bulk>Bulk Actions</button>
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

  function findTxnRow(id) {
    return buildSeed().find((row) => row.id === id);
  }

  function findShipRow(id) {
    return buildShipSeed().find((row) => row.id === id);
  }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-inb-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-inb-view") || "transaction";
        state.menuOpen = "";
        state.selectOpen = "";
        render();
        return;
      }
      if (event.target.closest("[data-inb-bulk]")) {
        event.preventDefault();
        toast("Bulk actions are not available in this sample.", "notice");
        return;
      }
      if (event.target.closest("[data-admin-clear-filters]")) {
        event.preventDefault();
        clearFilters();
        return;
      }
      const sort = event.target.closest("[data-inb-sort], [data-inb-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-inb-sort") || sort.getAttribute("data-inb-ship-sort");
        const view = sort.hasAttribute("data-inb-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) {
          view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        } else {
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
      const pageBtn = event.target.closest("[data-inb-page], [data-inb-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-inb-page") || pageBtn.getAttribute("data-inb-ship-page"));
        const view = pageBtn.hasAttribute("data-inb-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) {
          view.page = next;
          state.menuOpen = "";
          render();
        }
        return;
      }
      const moreHandled = window.KNAdminUX.handleMoreClick(event, {
        open: state.menuOpen,
        setOpen: (next) => {
          state.menuOpen = next;
          render();
        }
      });
      if (moreHandled) {
        return;
      }
      const selectHandled = window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (next) => {
          state.selectOpen = next;
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
            if (state.view === "shipment") {
              state.ship.page = 1;
            } else {
              state.txn.page = 1;
            }
            render();
          }
        }
      });
      if (selectHandled) {
        return;
      }
      const open = event.target.closest("[data-inb-open]");
      if (open) {
        event.preventDefault();
        const row = findTxnRow(open.getAttribute("data-inb-open"));
        if (row) {
          location.hash = `#transaction-us-in-bond/history/${encodeURIComponent(row.id)}`;
        }
        return;
      }
      const shipOpen = event.target.closest("[data-inb-ship-open]");
      if (shipOpen) {
        event.preventDefault();
        const row = findShipRow(shipOpen.getAttribute("data-inb-ship-open"));
        if (row) {
          location.hash = `#transaction-us-in-bond/history/${encodeURIComponent(row.id)}`;
        }
        return;
      }
      const copy = event.target.closest("[data-inb-copy], [data-inb-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-inb-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-inb-ship-copy")) : findTxnRow(copy.getAttribute("data-inb-copy"));
        const text = isShip ? row?.shipmentId || "" : row?.transactionId || "";
        if (text && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(
            () => toast(`Copied ${text}.`),
            () => toast(`Copy ${text} from the table.`, "notice")
          );
        } else {
          toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        }
        return;
      }
      const history = event.target.closest("[data-inb-history], [data-inb-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-inb-ship-history");
        const row = isShip
          ? findShipRow(history.getAttribute("data-inb-ship-history"))
          : findTxnRow(history.getAttribute("data-inb-history"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`History for ${label || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-inb-delete], [data-inb-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-inb-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-inb-ship-delete")) : findTxnRow(del.getAttribute("data-inb-delete"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Delete is disabled in this sample (${label || "record"}).`, "notice");
      }
    });

    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-inb-filter], [data-inb-ship-filter]");
      if (!input || input.tagName === "SELECT") {
        return;
      }
      const isShip = input.hasAttribute("data-inb-ship-filter");
      const key = input.getAttribute(isShip ? "data-inb-ship-filter" : "data-inb-filter");
      const filters = isShip ? state.ship.filters : state.txn.filters;
      if (!key || !(key in filters)) {
        return;
      }
      filters[key] = input.value;
      if (isShip) {
        state.ship.page = 1;
      } else {
        state.txn.page = 1;
      }
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
      const page = document.getElementById("kn-inb-page");
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
    const page = document.getElementById("kn-inb-page");
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
    const page = document.getElementById("kn-inb-page");
    if (!page || page.dataset.bound) {
      return;
    }
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => {
      if (page.hidden || (!state.selectOpen && !state.menuOpen)) {
        return;
      }
      state.selectOpen = "";
      state.menuOpen = "";
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden || event.key !== "Escape") {
        return;
      }
      if (state.selectOpen || state.menuOpen) {
        state.selectOpen = "";
        state.menuOpen = "";
        render();
      }
    });
  }

  window.KNUsInBond = {
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
