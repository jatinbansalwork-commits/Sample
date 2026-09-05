(() => {
  const ROUTE = "#transaction-us-in-bond";
  const AUTOREFRESH_MS = 60_000;

  let lastUpdatedIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 4);
    return d.toISOString();
  })();
  let refreshTimer = null;
  let keepDetailTabOnNextRender = false;
  let docViewerLoadedRowId = "";
  let detailLoadToken = 0;
  let detailLoadTimer = null;
  let lastInbPath = "";
  const LIST_STATE_KEY = "kn-inb-list-state-v1";

  const TXN_SEED_TOTAL = 247;
  /** QAT production snapshot — In-Bond Shipment tab list size. */
  const SHIP_SEED_TOTAL = 180;

  const COMPANIES = [
    "ILLUMINATE USA, LLC",
    "USA IOR",
    "TEST MIGRATION",
    "LEGEND VALVE US",
    "ENGINE-KK-35FD-NELLINNAJAI SWALO147",
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS",
    "HURST JAWS OF LIFE INC - SMALL",
    "JOBY AERO, INC",
    "SAFRAN CABIN INC. - GARDEN GROVE",
    "SOUTHERN CHAMPION TRAY",
    "ACUITY BRANDS"
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

  const COUNTRIES = [
    { code: "CN", name: "China" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "VN", name: "Vietnam" },
    { code: "UG", name: "United States of America" },
    { code: "CA", name: "Canada" },
    { code: "DE", name: "Germany" },
    { code: "BE", name: "Belgium" },
    { code: "VN", name: "Vietnam" },
    { code: "CN", name: "China" },
    { code: "TW", name: "Taiwan" },
    { code: "IN", name: "India" },
    { code: "SG", name: "Singapore" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "DE", name: "Germany" },
    { code: "KR", name: "Korea, Republic of" },
    { code: "MX", name: "Mexico" }
  ];

  const MBL_PREFIXES = ["CMDU", "MAEU", "ONEY", "EGLV", "HLCU", "MEDU", "HDMU", "COSU"];
  const HBL_PREFIXES = ["EGET", "MCLM", "SHAA", "TPEB", "BLR", "SGN", "DXB", "HHKA"];
  const MOTS = ["OCEAN", "OCEAN", "OCEAN", "AIR", "TRUCK"];

  const IMPORT_COUNTRY = { code: "US", name: "United States of America" };
  const ID_MID = ["M3C1", "07MJ", "0T6S", "07SG", "35FD", "M001", "021D", "09ZG", "09S3", "0A1K", "0B7M", "0C2P", "0D4R", "C2A5", "06X6"];

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
    bulkOpen: "",
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

  function stateBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function parseEta(label) {
    const t = Date.parse(label);
    return Number.isNaN(t) ? 0 : t;
  }

  /** Minimal ISF peer rows when KNUsIsf has not booted yet — keeps MBL/HBL join keys in sync. */
  const ISF_LINK_FALLBACK = [
    { id: "isf-1", transactionId: "ISF-021D-8", companyName: "GLOBAL-PAK", username: "KAMAL SINGH", status: "ACCEPTED", statusChip: "submitted", etd: "Feb 11, 2025", etdSort: 0, filingDate: "May 18, 2025", filingSort: 0, shipments: "KR-OB0T-283", mbl: "CMDUHB0204786", hbl: "EGET20427328", country: "BE - Belgium" },
    { id: "isf-2", transactionId: "ISF-021D-9", companyName: "ILLUMINATE USA LLC", username: "MARIA LOPEZ", status: "SENT", statusChip: "submitted", etd: "Feb 17, 2025", etdSort: 0, filingDate: "May 24, 2025", filingSort: 0, shipments: "VN-OB1K-441", mbl: "ONEYSGNFL9591500", hbl: "MCLMVSSAV2507004", country: "VN - Vietnam" },
    { id: "isf-3", transactionId: "ISF-021D-5", companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC", username: "PRIYA SHARMA", status: "NEW", statusChip: "pending", etd: "May 03, 2025", etdSort: 0, filingDate: "", filingSort: 0, shipments: "CN-OB3M-118", mbl: "EGLV1975001234", hbl: "SHAA240518047", country: "CN - China" },
    { id: "isf-4", transactionId: "ISF-021D-4", companyName: "PACIFIC RIM TRADING CO", username: "JAMES CHEN", status: "NEW", statusChip: "pending", etd: "May 04, 2025", etdSort: 0, filingDate: "", filingSort: 0, shipments: "TW-OB2F-512", mbl: "MEDUHB0284764", hbl: "TPEB240512901", country: "TW - Taiwan" },
    { id: "isf-5", transactionId: "ISF-021D-6", companyName: "NORTHSTAR LOGISTICS INC", username: "ANITA DESAI", status: "IN PROCESS", statusChip: "pending", etd: "May 04, 2025", etdSort: 0, filingDate: "", filingSort: 0, shipments: "IN-OB7R-902", mbl: "MAEU9876543210", hbl: "BLR2405041182", country: "IN - India" },
    { id: "isf-6", transactionId: "ISF-021D-7", companyName: "SUMMIT IMPORT GROUP LLC", username: "DAVID PARK", status: "NEW", statusChip: "pending", etd: "May 08, 2025", etdSort: 0, filingDate: "May 18, 2025", filingSort: 0, shipments: "SG-OB4N-331", mbl: "HLCUHB4782301", hbl: "SGN2405087720", country: "SG - Singapore" },
    { id: "isf-7", transactionId: "ISF-023F-1", companyName: "ATLANTIC CARGO PARTNERS", username: "SOPHIE MARTIN", status: "IN PROCESS", statusChip: "pending", etd: "May 18, 2025", etdSort: 0, filingDate: "", filingSort: 0, shipments: "AE-OB9K-118", mbl: "CMDUAE7654321", hbl: "DXB2405180094", country: "AE - United Arab Emirates" }
  ];

  function isfPeers() {
    try {
      const live = window.KNUsIsf?.list?.();
      if (live?.length) {
        return live;
      }
    } catch (_) {
      /* KNUsIsf may not be loaded yet */
    }
    return ISF_LINK_FALLBACK;
  }

  function knShipmentFromIsf(isf, i) {
    const ship = String(isf?.shipments || "");
    const match = ship.match(/^[A-Z]{2}-OB([A-Z0-9]+)-(\d+)$/);
    if (match) {
      return `KN-${match[1]}-${match[2]}`;
    }
    const mid = ID_MID[i % ID_MID.length];
    return `KN-${mid}-${96 + (i % 900)}`;
  }

  function inbStateFromIsf(isf) {
    if (isf.statusChip === "submitted") {
      return { transactionState: "READY", statusChip: "submitted" };
    }
    if (isf.statusChip === "finBill") {
      return { transactionState: "ERROR", statusChip: "error" };
    }
    const label = String(isf.status || "NEW").toUpperCase();
    if (label === "IN PROCESS") {
      return { transactionState: "IN PROCESS", statusChip: "pending" };
    }
    return { transactionState: "NEW", statusChip: "pending" };
  }

  function inbFromIsf(isf, i, overrides = {}) {
    const st = inbStateFromIsf(isf);
    const mid = ID_MID[i % ID_MID.length];
    const eta = isf.etd || formatDate(new Date());
    const filingDate = isf.filingDate || "";
    return {
      id: overrides.id || `inb-${i + 1}`,
      transactionId: overrides.transactionId || `INB-${mid}-${1 + (i % 20)}`,
      entryNumber: overrides.entryNumber || `Undefined-${pad(i + 1, 8)}`,
      transactionState: overrides.transactionState || st.transactionState,
      statusChip: overrides.statusChip || st.statusChip,
      eta,
      etaSort: isf.etdSort || parseEta(eta),
      companyName: isf.companyName,
      shipments: overrides.shipments || knShipmentFromIsf(isf, i),
      filingDate,
      filingSort: isf.filingSort || (filingDate ? parseEta(filingDate) : 0),
      mot: overrides.mot || "OCEAN",
      mbl: isf.mbl,
      hbl: isf.hbl || "",
      countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
      countryExport: isf.country || overrides.countryExport || `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
      username: isf.username || "",
      isfLinkId: isf.id,
      isfTransactionId: isf.transactionId
    };
  }

  function curatedInbHero() {
    const isf = isfPeers().find((row) => row.id === "isf-2") || ISF_LINK_FALLBACK[1];
    return {
      id: "inb-1",
      transactionId: "ISB-94301-1",
      entryNumber: "undefined-0002030091",
      transactionState: "NEW",
      statusChip: "pending",
      eta: "Nov 23, 2024",
      etaSort: parseEta("Nov 23, 2024"),
      companyName: "ILLUMINATE USA, LLC",
      shipments: "XX-MSCU-69",
      filingDate: "",
      filingSort: 0,
      mot: "OCEAN",
      mbl: "HDMUHHK43547833",
      hbl: "HMU43547833",
      countryImport: "US - United States of America",
      countryExport: "US - United States of America",
      username: "",
      isfLinkId: isf.id,
      isfTransactionId: isf.transactionId
    };
  }

  function curatedInbRows() {
    const peers = isfPeers();
    const byId = (id) => peers.find((row) => row.id === id) || ISF_LINK_FALLBACK.find((row) => row.id === id);
    return [
      curatedInbHero(),
      inbFromIsf(byId("isf-1"), 1, { transactionId: "INB-021D-8", entryNumber: "Undefined-00000002", shipments: "KN-OB0T-283" }),
      inbFromIsf(byId("isf-3"), 2, { transactionId: "INB-021D-5", entryNumber: "Undefined-00000003", shipments: "KN-OB3M-118" }),
      inbFromIsf(byId("isf-4"), 3, { transactionId: "INB-021D-4", entryNumber: "Undefined-00000004", shipments: "KN-OB2F-512" }),
      inbFromIsf(byId("isf-5"), 4, { transactionId: "INB-021D-6", entryNumber: "Undefined-00000005", shipments: "KN-OB7R-902", mot: "AIR" }),
      inbFromIsf(byId("isf-6"), 5, { transactionId: "INB-021D-7", entryNumber: "Undefined-00000006", shipments: "KN-OB4N-331" }),
      inbFromIsf(byId("isf-7"), 6, { transactionId: "INB-023F-1", entryNumber: "Undefined-00000007", shipments: "KN-OB9K-118" })
    ];
  }

  function generatedInbStatus(i) {
    if (i % 19 === 0) {
      return { transactionState: "ERROR", statusChip: "error" };
    }
    if (i % 3 === 0) {
      return { transactionState: "READY", statusChip: "submitted" };
    }
    const pending = ["NEW", "IN PROCESS"];
    return { transactionState: pending[i % 2], statusChip: "pending" };
  }

  function generatedInbRow(i) {
    const mid = ID_MID[i % ID_MID.length];
    const company = COMPANIES[i % COMPANIES.length];
    const user = USERS[i % USERS.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const status = generatedInbStatus(i);
    const eta = new Date(Date.UTC(2024 + ((i * 3) % 2), (i * 5) % 12, 1 + (i % 27)));
    const mot = MOTS[i % MOTS.length];
    const mblPrefix = MBL_PREFIXES[i % MBL_PREFIXES.length];
    const hblPrefix = HBL_PREFIXES[i % HBL_PREFIXES.length];
    const filed = status.statusChip === "submitted" || (i % 4 === 0);
    const filing = filed ? new Date(eta.getTime() + ((i % 14) + 3) * 86400000) : null;
    return {
      id: `inb-${i + 1}`,
      transactionId: `INB-${mid}-${1 + (i % 20)}`,
      entryNumber: `Undefined-${pad(i + 1, 8)}`,
      ...status,
      eta: formatDate(eta),
      etaSort: eta.getTime(),
      companyName: company,
      shipments: `KN-${((i * 7) % 36).toString(36).toUpperCase()}${mid.slice(-2)}-${100 + (i % 900)}`,
      filingDate: filing ? formatDate(filing) : "",
      filingSort: filing ? filing.getTime() : 0,
      mot,
      mbl: `${mblPrefix}${pad((i * 7919) % 1e10, 10)}`,
      hbl: i % 6 === 0 ? "" : `${hblPrefix}${pad((i * 6287) % 1e8, 8)}`,
      countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
      countryExport: `${country.code} - ${country.name}`,
      username: user
    };
  }

  function buildSeed() {
    if (seedCache) {
      return seedCache;
    }
    const rows = curatedInbRows();
    for (let i = rows.length; i < TXN_SEED_TOTAL; i += 1) {
      rows.push(generatedInbRow(i));
    }
    seedCache = rows;
    return seedCache;
  }

  function curatedShipRows() {
    const usImport = "US - United States of America";
    return [
      {
        id: "inb-ship-1",
        shipmentId: "KK-M3C1-111",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "TRUCK",
        mbl: "143003873337",
        hbl: "HDE13432",
        countryExport: "CN - China",
        countryImport: usImport,
        eta: "Sep 22, 2026",
        etaSort: parseEta("Sep 22, 2026")
      },
      {
        id: "inb-ship-2",
        shipmentId: "KK-07MJ-4",
        companyName: "USA IOR",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "OCEAN",
        mbl: "OOLU0676",
        hbl: "",
        countryExport: "AE - United Arab Emirates",
        countryImport: usImport,
        eta: "Aug 20, 2026",
        etaSort: parseEta("Aug 20, 2026")
      },
      {
        id: "inb-ship-3",
        shipmentId: "KK-0T6S-7",
        companyName: "TEST MIGRATION",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "AIR",
        mbl: "MDE21879",
        hbl: "MDE21432",
        countryExport: "VN - Vietnam",
        countryImport: usImport,
        eta: "Jul 25, 2026",
        etaSort: parseEta("Jul 25, 2026")
      },
      {
        id: "inb-ship-4",
        shipmentId: "KK-07SG-8",
        companyName: "LEGEND VALVE US",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "OCEAN",
        mbl: "12222754407",
        hbl: "",
        countryExport: "CN - China",
        countryImport: usImport,
        eta: "Jul 23, 2028",
        etaSort: parseEta("Jul 23, 2028")
      },
      {
        id: "inb-ship-5",
        shipmentId: "KK-35FD-12",
        companyName: "ENGINE-KK-35FD-NELLINNAJAI SWALO147",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "TRUCK",
        mbl: "143005871337",
        hbl: "",
        countryExport: "UG - United States of America",
        countryImport: usImport,
        eta: "Sep 22, 2024",
        etaSort: parseEta("Sep 22, 2024")
      },
      {
        id: "inb-ship-6",
        shipmentId: "KX-09ZG-12",
        companyName: "HURST JAWS OF LIFE INC - SMALL",
        shipmentState: "In Progress",
        statusChip: "inProgress",
        stateTone: "notice",
        mot: "AIR",
        mbl: "40624604451",
        hbl: "8521B6J4MQB",
        countryExport: "DE - Germany",
        countryImport: usImport,
        eta: "Aug 26, 2026",
        etaSort: parseEta("Aug 26, 2026")
      },
      {
        id: "inb-ship-7",
        shipmentId: "KX-09S3-64",
        companyName: "JOBY AERO, INC",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        mot: "OCEAN",
        mbl: "40624604452",
        hbl: "",
        countryExport: "CN - China",
        countryImport: usImport,
        eta: "Aug 20, 2028",
        etaSort: parseEta("Aug 20, 2028")
      }
    ];
  }

  function generatedShipRow(i) {
    const mid = ID_MID[i % ID_MID.length];
    const company = COMPANIES[i % COMPANIES.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const eta = new Date(Date.UTC(2024 + ((i * 2) % 5), (i * 7) % 12, 1 + (i % 27)));
    const mblNum = 143003873337 + i * 17;
    return {
      id: `inb-ship-${i + 1}`,
      shipmentId: `KK-${mid}-${10 + (i % 900)}`,
      companyName: company,
      shipmentState: "New",
      statusChip: "active",
      stateTone: "information",
      mot: MOTS[i % MOTS.length],
      mbl: String(mblNum),
      hbl: i % 5 === 0 ? "" : `HDE${pad((i * 6287) % 1e5, 5)}`,
      countryExport: `${country.code} - ${country.name}`,
      countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
      eta: formatDate(eta),
      etaSort: eta.getTime()
    };
  }

  function buildShipSeed() {
    if (shipSeedCache) {
      return shipSeedCache;
    }
    const rows = curatedShipRows();
    for (let i = rows.length; i < SHIP_SEED_TOTAL; i += 1) {
      rows.push(generatedShipRow(i));
    }
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
      } else if (sortKey === "filingDate") {
        av = a.filingSort || 0;
        bv = b.filingSort || 0;
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
          ? row.statusChip !== "completed"
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
      allActive: all.filter((row) => row.statusChip !== "completed").length,
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

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card kn-table-surface" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ actionCount: 3, extra: "inb-table" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 14, rows: 8 })}</tbody></table></div></div>`;
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
          <td>${ux.tmTxnRowActions({ id: row.id, label: row.transactionId, prefix: "inb" })}</td>
          <td class="admin-table-nowrap" title="${escapeHtml(row.transactionId)}">
            <span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span>
          </td>
          <td class="type-body-sm admin-table-nowrap"><span class="code">${escapeHtml(row.entryNumber)}</span></td>
          <td class="admin-table-nowrap">${stateBadge(row.transactionState)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.filingDate))}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(ux.emptyDisplay(row.hbl))}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 14,
          title: "No In-Bond transactions found matching your search",
          description: "Clear filters or switch status chips to see transactions.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });

    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "submitted", label: "Submitted", count: counts.submitted, selected: chip === "submitted" },
        { id: "pending", label: "Pending Submission", count: counts.pending, selected: chip === "pending" },
        { id: "error", label: "Error", count: counts.error, selected: chip === "error" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}. Sorted by ${state.txn.sortKey}, ${state.txn.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface inb-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 3, extra: "inb-table" })}" aria-label="US In-Bond transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-inb-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-inb-sort")}
              ${sortHeader("transactionState", "Transaction State", "data-inb-sort")}
              ${sortHeader("eta", "ETA", "data-inb-sort")}
              ${sortHeader("companyName", "Company Name", "data-inb-sort")}
              ${sortHeader("shipments", "Shipments", "data-inb-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-inb-sort")}
              ${sortHeader("mot", "MoT", "data-inb-sort")}
              ${sortHeader("mbl", "MBL/HBL/MAWB/HAWB", "data-inb-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-inb-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-inb-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-inb-sort")}
              ${sortHeader("username", "Username", "data-inb-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-inb-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
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
                  { value: "READY", label: "READY" },
                  { value: "ERROR", label: "ERROR" }
                ]
              })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "eta", value: state.txn.filters.eta, label: "ETA", placeholder: "Search by ETA" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name", placeholder: "Search by company name" })}
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
              ${ux.colFilter({ attr: "data-inb-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL/HBL/MAWB/HAWB" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "countryImport", value: state.txn.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "countryExport", value: state.txn.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-inb-filter", key: "username", value: state.txn.filters.username, label: "username" })}
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
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card kn-table-surface" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 4, extra: "inb-table inb-table--ship" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
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
          <td>${ux.tmShipRowActions({ id: row.id, label: row.shipmentId, prefix: "inb-ship" })}</td>
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
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 10,
          title: "No In-Bond shipments found matching your search",
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
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}. Sorted by ${state.ship.sortKey}, ${state.ship.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface inb-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 4, extra: "inb-table inb-table--ship" })}" aria-label="US In-Bond shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("shipmentId", "Shipment ID", "data-inb-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-inb-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-inb-ship-sort")}
              ${sortHeader("mot", "MoT", "data-inb-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-inb-ship-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-inb-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-inb-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-inb-ship-sort")}
              ${sortHeader("eta", "ETA", "data-inb-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
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

  const INB_BULK_ACTIONS = [
    { label: "Arrive", attr: 'data-inb-bulk-action="arrive"' },
    { label: "Export", attr: 'data-inb-bulk-action="export"' },
    { label: "Transfer Liability", attr: 'data-inb-bulk-action="transfer"' },
    { label: "Divert", attr: 'data-inb-bulk-action="divert"' }
  ];

  function captureListState() {
    try {
      sessionStorage.setItem(
        LIST_STATE_KEY,
        JSON.stringify({
          view: state.view,
          txn: {
            page: state.txn.page,
            pageSize: state.txn.pageSize,
            sortKey: state.txn.sortKey,
            sortDir: state.txn.sortDir,
            filters: { ...state.txn.filters }
          },
          ship: {
            page: state.ship.page,
            pageSize: state.ship.pageSize,
            sortKey: state.ship.sortKey,
            sortDir: state.ship.sortDir,
            filters: { ...state.ship.filters }
          }
        })
      );
    } catch (error) {
      /* ignore quota / privacy mode */
    }
  }

  function restoreListState() {
    try {
      const raw = sessionStorage.getItem(LIST_STATE_KEY);
      if (!raw) {
        return false;
      }
      const saved = JSON.parse(raw);
      if (saved.view === "shipment" || saved.view === "transaction") {
        state.view = saved.view;
      }
      if (saved.txn) {
        Object.assign(state.txn, saved.txn);
        state.txn.filters = { ...emptyTxnFilters(), ...(saved.txn.filters || {}) };
      }
      if (saved.ship) {
        Object.assign(state.ship, saved.ship);
        state.ship.filters = { ...emptyShipFilters(), ...(saved.ship.filters || {}) };
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function inbRoutePath() {
    return typeof window.getHashPath === "function" ? window.getHashPath() : String(location.hash || "");
  }

  function goto(hash) {
    if (inbRoutePath() === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function historyRouteId() {
    const match = inbRoutePath().match(/^#transaction-us-in-bond\/history\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function documentsRouteId() {
    const match = inbRoutePath().match(/^#transaction-us-in-bond\/documents\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function noteRouteChange() {
    const current = inbRoutePath();
    const prev = lastInbPath;
    if (prev && prev !== current) {
      const wasList = prev === ROUTE || prev === `${ROUTE}/`;
      const isSub = /^#transaction-us-in-bond\/(documents|history)\//.test(current);
      if (wasList && isSub) {
        captureListState();
      }
      const wasSub = /^#transaction-us-in-bond\/(documents|history)\//.test(prev);
      const isList = current === ROUTE || current === `${ROUTE}/`;
      if (wasSub && isList) {
        restoreListState();
      }
    }
    lastInbPath = current;
  }

  function transactionLabel(id) {
    return findTxnRow(id)?.transactionId || "";
  }

  function listReturnHash() {
    return ROUTE;
  }

  function documentBreadcrumbLabel(rowId) {
    const row = findTxnRow(rowId);
    if (!row) {
      return rowId;
    }
    if (window.KNInbDetail?.viewerRecordId) {
      return window.KNInbDetail.viewerRecordId(row);
    }
    return transactionLabel(rowId) || rowId;
  }

  function historyBreadcrumbLabel(rowId) {
    return transactionLabel(rowId) || rowId;
  }

  function adjacentTxnId(id, direction) {
    const rows = filteredTxnRows();
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      return "";
    }
    const next = rows[index + direction];
    return next ? next.id : "";
  }

  function renderBulkActions() {
    if (state.view !== "transaction") {
      return "";
    }
    return window.KNAdminUX.tmBulkActionsDropdown({
      id: "inb-bulk",
      label: "Bulk Actions",
      open: state.bulkOpen === "inb-bulk",
      items: INB_BULK_ACTIONS
    });
  }

  function render() {
    noteRouteChange();
    const page = document.getElementById("kn-inb-page");
    const root = document.getElementById("kn-inb-root");
    if (!page || !root || page.hidden) {
      return;
    }
    const documentsId = documentsRouteId();
    if (documentsId) {
      const row = findTxnRow(documentsId);
      if (!row) {
        toast("That In-Bond transaction is no longer available.", "notice");
        goto(ROUTE);
        return;
      }
      const isNewRow = row.id !== docViewerLoadedRowId;
      const keepTab = keepDetailTabOnNextRender;
      keepDetailTabOnNextRender = false;
      const revealViewer = () => {
        docViewerLoadedRowId = row.id;
        const active = document.activeElement;
        const activeAttr =
          active && root.contains(active) && active.hasAttribute("data-isf-add-doc-search")
            ? "data-isf-add-doc-search"
            : active && root.contains(active) && active.hasAttribute("data-isf-doc-preview-search")
              ? "data-isf-doc-preview-search"
              : "";
        const searchFocus = activeAttr
          ? { attr: activeAttr, start: active.selectionStart, end: active.selectionEnd }
          : null;
        root.innerHTML = window.KNInbDocViewer.render(row, {
          hasPrev: Boolean(adjacentTxnId(row.id, -1)),
          hasNext: Boolean(adjacentTxnId(row.id, 1)),
          keepTab
        });
        window.KNInbDocViewer.hydratePreview?.(root, { rerender: render });
        window.KNInbDocViewer.hydrateSearch?.(root);
        window.KNFileUpload?.hydrate(root);
        window.KNSearchInput?.hydrate?.(root);
        if (searchFocus) {
          const el = root.querySelector(`[${searchFocus.attr}]`);
          if (el) {
            el.focus();
            el.setSelectionRange(searchFocus.start, searchFocus.end);
          }
        }
      };
      if (isNewRow && !prefersReducedMotion() && typeof window.KNInbDocViewer?.renderSkeleton === "function") {
        const token = ++detailLoadToken;
        window.clearTimeout(detailLoadTimer);
        root.innerHTML = window.KNInbDocViewer.renderSkeleton();
        detailLoadTimer = window.setTimeout(() => {
          if (token !== detailLoadToken) {
            return;
          }
          revealViewer();
        }, 400);
        return;
      }
      revealViewer();
      return;
    }
    docViewerLoadedRowId = "";
    const historyId = historyRouteId();
    if (historyId) {
      const row = findTxnRow(historyId);
      if (!row) {
        toast("That In-Bond transaction is no longer available.", "notice");
        goto(ROUTE);
        return;
      }
      goto(`${ROUTE}/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=edit`);
      return;
    }
    window.clearTimeout(detailLoadTimer);
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
        ${renderBulkActions()}
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
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row) {
          const handled = window.KNInbDocViewer?.handleClick(event, row, {
            rerender: render,
            adjacentTxnId,
            goto,
            keepDetailTab: () => {
              keepDetailTabOnNextRender = true;
            }
          });
          if (handled) {
            return;
          }
        }
        return;
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
      const viewBtn = event.target.closest("[data-inb-view]");
      if (viewBtn) {
        event.preventDefault();
        state.view = viewBtn.getAttribute("data-inb-view") || "transaction";
        state.menuOpen = "";
        state.bulkOpen = "";
        state.selectOpen = "";
        render();
        return;
      }
      const bulkHandled = window.KNAdminUX.handleBulkActionsClick(event, {
        open: state.bulkOpen,
        setOpen: (next) => {
          state.bulkOpen = next;
          if (next) {
            state.menuOpen = "";
            state.selectOpen = "";
          }
          render();
        }
      });
      if (bulkHandled) {
        return;
      }
      const bulkAction = event.target.closest("[data-inb-bulk-action]");
      if (bulkAction) {
        event.preventDefault();
        const action = bulkAction.getAttribute("data-inb-bulk-action") || "";
        state.bulkOpen = "";
        const labels = { arrive: "Arrive", export: "Export", transfer: "Transfer Liability", divert: "Divert" };
        toast(`${labels[action] || action} bulk action is not available in this sample.`, "notice");
        render();
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
          if (next) {
            state.bulkOpen = "";
          }
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
          if (next) {
            state.bulkOpen = "";
          }
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
          goto(`${ROUTE}/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=edit`);
        }
        return;
      }
      const history = event.target.closest("[data-inb-history], [data-inb-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-inb-ship-history");
        if (!isShip) {
          const row = findTxnRow(history.getAttribute("data-inb-history"));
          if (row) {
            goto(`${ROUTE}/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=transaction`);
          }
          return;
        }
        const row = findShipRow(history.getAttribute("data-inb-ship-history"));
        toast(`History for ${row?.shipmentId || "record"} is not available in this sample.`, "notice");
        return;
      }
      const doc = event.target.closest("[data-inb-document], [data-inb-ship-document]");
      if (doc) {
        event.preventDefault();
        const isShip = doc.hasAttribute("data-inb-ship-document");
        const row = isShip
          ? findShipRow(doc.getAttribute("data-inb-ship-document"))
          : findTxnRow(doc.getAttribute("data-inb-document"));
        if (row && !isShip) {
          goto(`${ROUTE}/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0`);
          return;
        }
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Documents for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
      const shipView = event.target.closest("[data-inb-ship-view]");
      if (shipView) {
        event.preventDefault();
        const row = findShipRow(shipView.getAttribute("data-inb-ship-view"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const shipCreate = event.target.closest("[data-inb-ship-create]");
      if (shipCreate) {
        event.preventDefault();
        const row = findShipRow(shipCreate.getAttribute("data-inb-ship-create"));
        toast(`Create Transaction for ${row?.shipmentId || "shipment"} opened in this sample.`, "notice");
        return;
      }
      const shipIntake = event.target.closest("[data-inb-ship-intake]");
      if (shipIntake) {
        event.preventDefault();
        const row = findShipRow(shipIntake.getAttribute("data-inb-ship-intake"));
        toast(`${row?.shipmentId || "Shipment"} moved back to Intake in this sample.`, "notice");
        return;
      }
      const shipOpen = event.target.closest("[data-inb-ship-open]");
      if (shipOpen) {
        event.preventDefault();
        const row = findShipRow(shipOpen.getAttribute("data-inb-ship-open"));
        if (row) {
          toast(`${row.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        }
        return;
      }
    });

    page.addEventListener("input", (event) => {
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row) {
          window.KNInbDocViewer?.handleInput(event, row, { rerender: render });
        }
        return;
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
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

    page.addEventListener("change", (event) => {
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row && window.KNInbDocViewer?.handleChange?.(event, row, { rerender: render })) {
          return;
        }
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
      const select = event.target.closest("select[data-inb-ship-filter]");
      if (!select) {
        return;
      }
      const key = select.getAttribute("data-inb-ship-filter");
      if (!key || !(key in state.ship.filters)) {
        return;
      }
      state.ship.filters[key] = select.value;
      state.ship.page = 1;
      render();
    });

    page.addEventListener("drop", (event) => {
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row && window.KNInbDocViewer?.handleDrop?.(event, row, { rerender: render })) {
          return;
        }
      }
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
      state.bulkOpen = "";
      state.selectOpen = "";
      render();
    }, AUTOREFRESH_MS);
  }

  function suspend() {
    state.menuOpen = "";
    state.bulkOpen = "";
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
      if (page.hidden) {
        return;
      }
      if (documentsRouteId()) {
        if (window.KNInbDocViewer?.closeSelects?.()) {
          render();
        }
        return;
      }
      if (!state.selectOpen && !state.menuOpen && !state.bulkOpen) {
        return;
      }
      state.selectOpen = "";
      state.menuOpen = "";
      state.bulkOpen = "";
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden) {
        return;
      }
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row && event.key === "Escape") {
          if (window.KNInbDocViewer?.closeOverlays?.()) {
            render();
          }
        }
        return;
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
      if (event.key !== "Escape") {
        return;
      }
      if (state.selectOpen || state.menuOpen || state.bulkOpen) {
        state.selectOpen = "";
        state.menuOpen = "";
        state.bulkOpen = "";
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
    },
    transactionLabel,
    listReturnHash,
    documentBreadcrumbLabel,
    historyBreadcrumbLabel
  };
})();
