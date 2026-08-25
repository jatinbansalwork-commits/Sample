(() => {
  const ROUTE = "#transaction-us-isf";
  /** Ops-dense list: refresh every 60s — fresh enough for filings without noisy re-renders. */
  const AUTOREFRESH_MS = 60_000;

  let lastUpdatedIso = (() => {
    const d = new Date();
    d.setHours(d.getHours() - 6);
    return d.toISOString();
  })();
  let refreshTimer = null;

  const COMPANIES = [
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS",
    "HORIZON FREIGHT SERVICES",
    "MEKONG EXPORTS LTD",
    "CHENNAI MARINE SUPPLY",
    "SAIGON TRADE HOUSE",
    "SHENZHEN BRIGHT PACKAGING",
    "MUMBAI TEXTILE EXPORTS",
    "BUSAN OCEAN LINKS",
    "VANCOUVER GATEWAY LLC"
  ];

  const USERS = [
    "KAMAL SINGH",
    "RAJA KUMAR",
    "PRIYA SHARMA",
    "ANITA DESAI",
    "JAMES CHEN",
    "MARIA LOPEZ",
    "DAVID PARK",
    "",
    "",
    "SOPHIE MARTIN"
  ];

  const VESSELS = [
    { name: "CMA CGM GANGES", id: "9436367" },
    { name: "MSC OSCAR", id: "9703318" },
    { name: "EVER GOLDEN", id: "9783510" },
    { name: "MAERSK ESSEX", id: "9632153" },
    { name: "ONE HAMBURG", id: "9741425" },
    { name: "HMM ALGECIRAS", id: "9863302" },
    { name: "COSCO SHIPPING UNIVERSE", id: "9795600" },
    { name: "YANG MING WELLINGTON", id: "9704623" },
    { name: "HAPAG LLOYD BERLIN", id: "9450428" },
    { name: "OOCL GERMANY", id: "9622575" }
  ];

  const COUNTRIES = [
    { code: "IN", name: "India" },
    { code: "VN", name: "Vietnam" },
    { code: "CN", name: "China" },
    { code: "KR", name: "Korea, Republic of" },
    { code: "TW", name: "Taiwan" },
    { code: "TH", name: "Thailand" },
    { code: "MY", name: "Malaysia" },
    { code: "ID", name: "Indonesia" },
    { code: "SG", name: "Singapore" },
    { code: "JP", name: "Japan" }
  ];

  const IMPORT_COUNTRY = { code: "US", name: "United States of America" };

  const MOTS = ["OCEAN", "OCEAN", "OCEAN", "AIR", "TRUCK"];

  const STATUSES = [
    { label: "ACCEPTED", chip: "submitted" },
    { label: "REPLACE ACCEPTED", chip: "submitted" },
    { label: "ACCEPTED", chip: "submitted" },
    { label: "PENDING SUBMISSION", chip: "pending" },
    { label: "ACCEPTED", chip: "submitted" },
    { label: "FIN BILL MATCH", chip: "finBill" },
    { label: "REPLACE ACCEPTED", chip: "submitted" },
    { label: "PENDING SUBMISSION", chip: "pending" }
  ];

  const SHIP_STATES = [
    { label: "NOT CREATED", chip: "notCreated", tone: "notice" },
    { label: "IN PROGRESS", chip: "inProgress", tone: "information" },
    { label: "COMPLETED", chip: "completed", tone: "positive" }
  ];

  const ID_MID = ["398T", "M400", "7K2A", "B19C", "Q88P", "H3N1", "R55W", "L2X9", "P0VT", "D44E"];

  const emptyTxnFilters = () => ({
    chip: "all",
    transactionId: "",
    companyName: "",
    cbpNumber: "",
    username: "",
    status: "",
    etd: "",
    vesselName: "",
    filingDate: "",
    shipments: "",
    mbl: "",
    hbl: "",
    country: ""
  });

  const emptyShipFilters = () => ({
    chip: "allActive",
    shipmentId: "",
    companyName: "",
    shipmentState: "",
    etd: "",
    vesselName: "",
    mbl: "",
    hbl: "",
    countryExport: "",
    countryImport: "",
    mot: ""
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

  function buildSeed() {
    if (seedCache) {
      return seedCache;
    }
    const rows = [];
    const total = 2470;
    for (let i = 0; i < total; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const company = COMPANIES[i % COMPANIES.length];
      const user = USERS[i % USERS.length];
      const vessel = VESSELS[i % VESSELS.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      const status = STATUSES[i % STATUSES.length];
      const etd = new Date(Date.UTC(2024 + ((i * 3) % 6), (i * 5) % 12, 1 + (i % 27)));
      const filing = new Date(etd.getTime() + ((i % 14) + 1) * 86400000);
      const txnNum = 18354115 + i * 17;
      const cbpExtra = i % 5 === 0 ? `\nISF-${64000000000 + i * 91}` : "";
      rows.push({
        id: `isf-${i + 1}`,
        transactionId: `ISF-${mid}-${100 + (i % 900)}`,
        companyName: company,
        cbpNumber: `ISF-${txnNum}${cbpExtra}`,
        username: user,
        status: status.label,
        statusChip: status.chip,
        etd: formatDate(etd),
        etdSort: etd.getTime(),
        vesselName: vessel.name,
        vesselId: vessel.id,
        filingDate: formatDate(filing),
        filingSort: filing.getTime(),
        shipments: `${country.code}-OB${((i * 7) % 36).toString(36).toUpperCase()}-${200 + (i % 800)}`,
        mbl: `MBL${pad((i * 7919) % 1e10, 10)}${String.fromCharCode(65 + (i % 26))}`,
        hbl: `HBL${pad((i * 6287) % 1e10, 10)}${String.fromCharCode(65 + ((i + 3) % 26))}`,
        country: `${country.code} - ${country.name}`
      });
    }
    Object.assign(rows[0], {
      transactionId: "ISF-398T-218",
      companyName: "GLOBAL-PAK",
      cbpNumber: "ISF-18354115",
      username: "",
      status: "ACCEPTED",
      statusChip: "submitted",
      etd: "Jul 23, 2028",
      vesselName: "CMA CGM GANGES",
      vesselId: "9436367",
      filingDate: "Jul 31, 2028",
      shipments: "KR-OB0T-283",
      country: "IN - India"
    });
    Object.assign(rows[1], {
      transactionId: "ISF-M400-90",
      companyName: "ILLUMINATE USA LLC",
      cbpNumber: "ISF-18354132\nISF-64682239695",
      username: "KAMAL SINGH",
      status: "REPLACE ACCEPTED",
      statusChip: "submitted",
      etd: "May 29, 2026",
      vesselName: "MSC OSCAR",
      vesselId: "9703318",
      filingDate: "Jun 2, 2026",
      shipments: "VN-OB1K-441",
      country: "VN - Vietnam"
    });
    Object.assign(rows[2], {
      transactionId: "ISF-7K2A-412",
      companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC",
      cbpNumber: "ISF-18354201",
      username: "RAJA KUMAR",
      status: "ACCEPTED",
      statusChip: "submitted",
      etd: "Aug 4, 2026",
      vesselName: "EVER GOLDEN",
      vesselId: "9783510",
      filingDate: "Aug 9, 2026",
      shipments: "CN-OB3M-118",
      country: "CN - China"
    });
    seedCache = rows;
    return rows;
  }

  function shipStateForIndex(i) {
    // ~3600 rows: 80 notCreated, 113 inProgress, 3407 completed (matches production Completed count).
    if (i < 80) {
      return SHIP_STATES[0];
    }
    if (i < 193) {
      return SHIP_STATES[1];
    }
    return SHIP_STATES[2];
  }

  function buildShipSeed() {
    if (shipSeedCache) {
      return shipSeedCache;
    }
    const rows = [];
    const total = 3600;
    for (let i = 0; i < total; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const company = COMPANIES[i % COMPANIES.length];
      const vessel = VESSELS[i % VESSELS.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      const shipState = shipStateForIndex(i);
      const mot = MOTS[i % MOTS.length];
      const etd = new Date(Date.UTC(2024 + ((i * 2) % 5), (i * 7) % 12, 1 + (i % 27)));
      rows.push({
        id: `isf-ship-${i + 1}`,
        shipmentId: `${country.code}-OB${((i * 11) % 36).toString(36).toUpperCase()}-${100 + (i % 900)}`,
        companyName: company,
        shipmentState: shipState.label,
        statusChip: shipState.chip,
        stateTone: shipState.tone,
        etd: formatDate(etd),
        etdSort: etd.getTime(),
        vesselName: vessel.name,
        vesselId: vessel.id,
        mbl: `MBL${pad((i * 7919) % 1e10, 10)}${String.fromCharCode(65 + (i % 26))}`,
        hbl: `HBL${pad((i * 6287) % 1e10, 10)}${String.fromCharCode(65 + ((i + 5) % 26))}`,
        countryExport: `${country.code} - ${country.name}`,
        countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
        mot
      });
    }
    Object.assign(rows[0], {
      shipmentId: "KR-OB0T-283",
      companyName: "GLOBAL-PAK",
      shipmentState: "IN PROGRESS",
      statusChip: "inProgress",
      stateTone: "information",
      etd: "Jul 23, 2028",
      vesselName: "CMA CGM GANGES",
      vesselId: "9436367",
      mbl: "ONEYSGNFL9591500",
      hbl: "MCLMVSSAV2507004",
      countryExport: "KR - Korea, Republic of",
      countryImport: "US - United States of America",
      mot: "OCEAN"
    });
    Object.assign(rows[1], {
      shipmentId: "VN-OB1K-441",
      companyName: "ILLUMINATE USA LLC",
      shipmentState: "NOT CREATED",
      statusChip: "notCreated",
      stateTone: "notice",
      etd: "May 29, 2026",
      vesselName: "MSC OSCAR",
      vesselId: "9703318",
      countryExport: "VN - Vietnam",
      countryImport: "US - United States of America",
      mot: "OCEAN"
    });
    Object.assign(rows[80], {
      shipmentId: `ISF-SHP-${ID_MID[0]}-1`,
      companyName: "PACIFIC RIM TRADING CO",
      shipmentState: "IN PROGRESS",
      statusChip: "inProgress",
      stateTone: "information"
    });
    shipSeedCache = rows;
    return rows;
  }

  function toast(content, color = "positive") {
    if (typeof window.showBladeToast === "function") {
      window.showBladeToast({ content, color });
    }
  }

  function iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`;
  }

  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function multilineCell(text) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return window.KNAdminUX.ellipsisCell("");
    }
    const joined = lines.join(" · ");
    return `<span class="type-body-sm tm-ellipsis" title="${escapeHtml(joined)}">${escapeHtml(joined)}</span>`;
  }

  function vesselCell(row) {
    const joined = `${row.vesselName} · ${row.vesselId}`;
    return `<span class="type-body-sm tm-ellipsis" title="${escapeHtml(joined)}">${escapeHtml(joined)}</span>`;
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    const key = sortKey;
    rows.sort((a, b) => {
      let av;
      let bv;
      if (key === "etd" || key === "filingDate") {
        av = a[`${key === "etd" ? "etd" : "filing"}Sort`] || a.etdSort || 0;
        bv = b[`${key === "etd" ? "etd" : "filing"}Sort`] || b.etdSort || 0;
        if (key === "filingDate") {
          av = a.filingSort || 0;
          bv = b.filingSort || 0;
        }
      } else if (key === "vesselName") {
        av = `${a.vesselName} ${a.vesselId}`.toLowerCase();
        bv = `${b.vesselName} ${b.vesselId}`.toLowerCase();
      } else {
        av = String(a[key] || "").toLowerCase();
        bv = String(b[key] || "").toLowerCase();
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
        (f.chip === "finBill" && row.statusChip === "finBill");
      if (!chipOk) return false;
      const checks = [
        [f.transactionId, row.transactionId],
        [f.companyName, row.companyName],
        [f.cbpNumber, row.cbpNumber],
        [f.username, row.username],
        [f.status, row.status],
        [f.etd, row.etd],
        [f.vesselName, `${row.vesselName} ${row.vesselId}`],
        [f.filingDate, row.filingDate],
        [f.shipments, row.shipments],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.country, row.country]
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
        [f.etd, row.etd],
        [f.vesselName, `${row.vesselName} ${row.vesselId}`],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryExport, row.countryExport],
        [f.countryImport, row.countryImport],
        [f.mot, row.mot]
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
      attr: attr || (state.view === "shipment" ? "data-isf-ship-sort" : "data-isf-sort")
    });
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      submitted: all.filter((row) => row.statusChip === "submitted").length,
      pending: all.filter((row) => row.statusChip === "pending").length,
      finBill: all.filter((row) => row.statusChip === "finBill").length
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
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading ISF filings." })}
      <div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table isf-table" aria-label="Loading US ISF transactions"><thead><tr class="vis-table__labels"><th scope="col">Transaction ID</th><th scope="col">Company Name</th><th scope="col">…</th><th scope="col">Actions</th></tr></thead><tbody>${ux.tableSkeletonRows({ cols: 13, rows: 8 })}</tbody></table></div></div>`;
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
            (row) => `<tr data-isf-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap">
            <a class="blade-link admin-name-link" href="#transaction-us-isf" data-isf-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}">
              <span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span>
            </a>
          </td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td>${multilineCell(row.cbpNumber)}</td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td class="admin-table-nowrap">${statusBadge(row.status)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.etd)}</td>
          <td>${vesselCell(row)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.filingDate)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm">${escapeHtml(row.country)}</td>
          <td>${rowActions(row.id, row.transactionId, "isf")}</td>
        </tr>`
          )
          .join("")
      : `<tr class="role-empty-row"><td colspan="13">${ux.emptyState({
          title: "No ISF filings found matching your search", description: "Clear filters or switch status chips to see filings.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        })}</td></tr>`;

    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "submitted", label: "Submitted", count: counts.submitted, selected: chip === "submitted" },
        { id: "pending", label: "Pending Submission", count: counts.pending, selected: chip === "pending" },
        { id: "finBill", label: "Fin Bill Match", count: counts.finBill, selected: chip === "finBill" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}. Sorted by ${state.txn.sortKey}, ${state.txn.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card isf-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table isf-table" aria-label="US ISF transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-isf-sort")}
              ${sortHeader("companyName", "Company Name", "data-isf-sort")}
              ${sortHeader("cbpNumber", "CBP Transaction Number", "data-isf-sort")}
              ${sortHeader("username", "Username", "data-isf-sort")}
              ${sortHeader("status", "Transaction Status", "data-isf-sort")}
              ${sortHeader("etd", "ETD", "data-isf-sort")}
              ${sortHeader("vesselName", "Vessel Name", "data-isf-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-isf-sort")}
              ${sortHeader("shipments", "Shipments", "data-isf-sort")}
              ${sortHeader("mbl", "MBL", "data-isf-sort")}
              ${sortHeader("hbl", "HBL", "data-isf-sort")}
              ${sortHeader("country", "Country of Export", "data-isf-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-isf-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name", placeholder: "Search by company name" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "cbpNumber", value: state.txn.filters.cbpNumber, label: "CBP transaction number", placeholder: "Search by CBP transaction number" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "username", value: state.txn.filters.username, label: "username", placeholder: "Search by username" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "status", value: state.txn.filters.status, label: "transaction status", placeholder: "Search by transaction status" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "etd", value: state.txn.filters.etd, label: "ETD", placeholder: "Search by ETD" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "vesselName", value: state.txn.filters.vesselName, label: "vessel name", placeholder: "Search by vessel name" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date", placeholder: "Search by filing date" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments", placeholder: "Search by shipments" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL", placeholder: "Search by MBL" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL", placeholder: "Search by HBL" })}
              ${ux.colFilter({ attr: "data-isf-filter", key: "country", value: state.txn.filters.country, label: "country of export", placeholder: "Search by country of export" })}
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
        pageAttr: "data-isf-page",
        label: "ISF transaction pages",
        sizeSelect: adminSelect({
          id: "kn-isf-pagesize",
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
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading ISF shipments." })}
      <div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table isf-table" aria-label="Loading US ISF shipments"><thead><tr class="vis-table__labels"><th scope="col">Shipment ID</th><th scope="col">Company Name</th><th scope="col">…</th><th scope="col">Actions</th></tr></thead><tbody>${ux.tableSkeletonRows({ cols: 11, rows: 8 })}</tbody></table></div></div>`;
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
            (row) => `<tr data-isf-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap">
            <a class="blade-link admin-name-link" href="#transaction-us-isf" data-isf-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}">
              <span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span>
            </a>
          </td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.etd)}</td>
          <td>${vesselCell(row)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td>${rowActions(row.id, row.shipmentId, "isf-ship")}</td>
        </tr>`
          )
          .join("")
      : `<tr class="role-empty-row"><td colspan="11">${ux.emptyState({
          title: "No ISF shipments found matching your search", description: "Clear filters or switch status chips to see shipments.",
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
    <div class="vis-table-wrap role-table-card isf-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table isf-table" aria-label="US ISF shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-isf-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-isf-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-isf-ship-sort")}
              ${sortHeader("etd", "ETD", "data-isf-ship-sort")}
              ${sortHeader("vesselName", "Vessel Name", "data-isf-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-isf-ship-sort")}
              ${sortHeader("hbl", "HBL", "data-isf-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-isf-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-isf-ship-sort")}
              ${sortHeader("mot", "MoT", "data-isf-ship-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colBladeSelect({
                attr: "data-isf-ship-filter",
                key: "shipmentState",
                value: state.ship.filters.shipmentState,
                label: "shipment state",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "NOT CREATED", label: "NOT CREATED" },
                  { value: "IN PROGRESS", label: "IN PROGRESS" },
                  { value: "COMPLETED", label: "COMPLETED" }
                ]
              })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "etd", value: state.ship.filters.etd, label: "ETD", placeholder: "Search by ETD" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "vesselName", value: state.ship.filters.vesselName, label: "vessel name" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
              ${ux.colBladeSelect({
                attr: "data-isf-ship-filter",
                key: "mot",
                value: state.ship.filters.mot,
                label: "MoT",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "OCEAN", label: "OCEAN" },
                  { value: "AIR", label: "AIR" },
                  { value: "TRUCK", label: "TRUCK" }
                ]
              })}
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
        pageAttr: "data-isf-ship-page",
        label: "ISF shipment pages",
        sizeSelect: adminSelect({
          id: "kn-isf-ship-pagesize",
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
    const page = document.getElementById("kn-isf-page");
    const root = document.getElementById("kn-isf-root");
    if (!page || !root || page.hidden) {
      return;
    }
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => {
      const raw = window.KNAdminUX.relativeTime(lastUpdatedIso);
      const hours = raw.match(/^(\d+)h ago$/);
      return hours ? `${hours[1]} hours ago` : raw;
    })();
    root.innerHTML = `<div class="isf-toolbar tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="ISF list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-isf-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-isf-view="transaction">Transaction</button>
      </div>
      <div class="isf-toolbar__meta tm-toolbar__meta">
        <span class="type-caption-sm isf-updated tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
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
      const viewBtn = event.target.closest("[data-isf-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-isf-view") || "transaction";
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
      const sort = event.target.closest("[data-isf-sort], [data-isf-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-isf-sort") || sort.getAttribute("data-isf-ship-sort");
        const view = sort.hasAttribute("data-isf-ship-sort") ? state.ship : state.txn;
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
      const pageBtn = event.target.closest("[data-isf-page], [data-isf-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-isf-page") || pageBtn.getAttribute("data-isf-ship-page"));
        const view = pageBtn.hasAttribute("data-isf-ship-page") ? state.ship : state.txn;
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
          if (state.view === "shipment" && key in state.ship.filters) {
            state.ship.filters[key] = value;
            state.ship.page = 1;
            render();
          }
        }
      });
      if (selectHandled) {
        return;
      }
      const open = event.target.closest("[data-isf-open]");
      if (open) {
        event.preventDefault();
        const row = findTxnRow(open.getAttribute("data-isf-open"));
        toast(`${row?.transactionId || "Filing"} opened as read-only in this sample.`, "notice");
        return;
      }
      const shipOpen = event.target.closest("[data-isf-ship-open]");
      if (shipOpen) {
        event.preventDefault();
        const row = findShipRow(shipOpen.getAttribute("data-isf-ship-open"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const copy = event.target.closest("[data-isf-copy], [data-isf-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-isf-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-isf-ship-copy")) : findTxnRow(copy.getAttribute("data-isf-copy"));
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
      const history = event.target.closest("[data-isf-history], [data-isf-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-isf-ship-history");
        const row = isShip
          ? findShipRow(history.getAttribute("data-isf-ship-history"))
          : findTxnRow(history.getAttribute("data-isf-history"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`History for ${label || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-isf-delete], [data-isf-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-isf-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-isf-ship-delete")) : findTxnRow(del.getAttribute("data-isf-delete"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Delete is disabled in this sample (${label || "record"}).`, "notice");
      }
    });

    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-isf-filter], [data-isf-ship-filter]");
      if (!input || input.tagName === "SELECT") {
        return;
      }
      const isShip = input.hasAttribute("data-isf-ship-filter");
      const key = input.getAttribute(isShip ? "data-isf-ship-filter" : "data-isf-filter");
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

    page.addEventListener("change", (event) => {
      const select = event.target.closest("select[data-isf-ship-filter]");
      if (!select) {
        return;
      }
      const key = select.getAttribute("data-isf-ship-filter");
      if (!key || !(key in state.ship.filters)) {
        return;
      }
      state.ship.filters[key] = select.value;
      state.ship.page = 1;
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
      const page = document.getElementById("kn-isf-page");
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
    const page = document.getElementById("kn-isf-page");
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
    const page = document.getElementById("kn-isf-page");
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

  window.KNUsIsf = {
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
