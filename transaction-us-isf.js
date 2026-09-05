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
  // Set right before a Prev/Next navigation so the detail view keeps the current
  // tab instead of resetting to Header — consumed once by the very next render().
  let keepDetailTabOnNextRender = false;
  let docViewerLoadedRowId = "";
  let detailLoadToken = 0;
  let detailLoadTimer = null;

  const COMPANIES = [
    "TEST US COMPANY 4",
    "ENGINE-KX-ISF-4-REAJITWARI100",
    "TEST COMPANY 1",
    "LEGEND VALVE US",
    "US LEGEND",
    "ILLUMINATE USA, LLC",
    "ILLUMINATE USA LLC",
    "COMPANY 1",
    "GLOBAL-PAK",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS",
    "HORIZON FREIGHT SERVICES",
    "MEKONG EXPORTS LTD",
    "CHENNAI MARINE SUPPLY",
    "SAIGON TRADE HOUSE",
    "SHENZHEN BRIGHT PACKAGING"
  ];

  const USERS = [
    "ARUN-OPS",
    "ILLUMINATECOMPANYADMIN",
    "KNSR-USER",
    "KNSFUSER",
    "TESTUSER",
    "ENTRY AUTOMATION QA",
    "ISF OPS",
    "KAMAL SINGH",
    "RAJA KUMAR",
    "PRIYA SHARMA",
    "MARIA LOPEZ",
    "JAMES CHEN",
    "",
    "",
    "SOPHIE MARTIN"
  ];

  const VESSELS = [
    { name: "COSCO MALAYSIA", id: "9448786" },
    { name: "CMA CGM G. WASHINGTON", id: "9462047" },
    { name: "THALASSA AXIA", id: "9438879" },
    { name: "EVER ENVOY", id: "9240500" },
    { name: "CMA CGM GANGES", id: "9436367" },
    { name: "MSC OSCAR", id: "9703318" },
    { name: "EVER GOLDEN", id: "9783510" },
    { name: "MAERSK ESSEX", id: "9632153" },
    { name: "ONE HAMBURG", id: "9741425" },
    { name: "HMM ALGECIRAS", id: "9863302" }
  ];

  const COUNTRIES = [
    { code: "VN", name: "Vietnam" },
    { code: "IN", name: "India" },
    { code: "CN", name: "China" },
    { code: "US", name: "United States of America" },
    { code: "QA", name: "Qatar" },
    { code: "GE", name: "Georgia" },
    { code: "CA", name: "Canada" },
    { code: "KR", name: "Korea, Republic of" },
    { code: "TW", name: "Taiwan" },
    { code: "TH", name: "Thailand" },
    { code: "MY", name: "Malaysia" },
    { code: "SG", name: "Singapore" },
    { code: "BE", name: "Belgium" },
    { code: "AE", name: "United Arab Emirates" }
  ];

  /** Realistic ISF transaction list size — matches QAT production snapshot (55 records). */
  const TXN_SEED_TOTAL = 55;

  const MBL_PREFIXES = ["CMDU", "MAEU", "ONEY", "EGLV", "HLCU", "MEDU", "COSU", "YMLU"];
  const HBL_PREFIXES = ["EGET", "MCLM", "SHAA", "TPEB", "BLR", "SGN", "DXB", "BKK"];

  const IMPORT_COUNTRY = { code: "US", name: "United States of America" };

  const MOTS = ["OCEAN", "OCEAN", "OCEAN", "AIR", "TRUCK"];

  const STATUSES = [
    { label: "FILED", chip: "submitted" },
    { label: "ACCEPTED", chip: "submitted" },
    { label: "SENT", chip: "submitted" },
    { label: "NEW", chip: "pending" },
    { label: "IN PROCESS", chip: "pending" },
    { label: "REJECTED", chip: "pending" },
    { label: "RETRANSMIT", chip: "pending" }
  ];

  // Options offered in the "Update Transaction Status" modal, each mapped to the chip
  // group (submitted/pending/finBill) it should file under once applied.
  const TXN_STATUS_OPTIONS = [
    { id: "NEW", label: "New", chip: "pending" },
    { id: "IN PROCESS", label: "In Process", chip: "pending" },
    { id: "READY", label: "Ready", chip: "pending" },
    { id: "PENDING SUBMISSION", label: "Pending Submission", chip: "pending" },
    { id: "RETRANSMIT", label: "Retransmit", chip: "pending" },
    { id: "REJECTED", label: "Rejected", chip: "pending" },
    { id: "FILED", label: "Filed", chip: "submitted" },
    { id: "ACCEPTED", label: "Accepted", chip: "submitted" },
    { id: "REPLACE ACCEPTED", label: "Replace Accepted", chip: "submitted" },
    { id: "FIN BILL MATCH", label: "Fin Bill Match", chip: "finBill" }
  ];

  const SHIP_STATES = [
    { label: "New", chip: "active", tone: "information" },
    { label: "NOT CREATED", chip: "notCreated", tone: "notice" },
    { label: "IN PROGRESS", chip: "inProgress", tone: "information" },
    { label: "COMPLETED", chip: "completed", tone: "positive" }
  ];

  /** QAT production snapshot — ISF Shipment tab list size. */
  const SHIP_SEED_TOTAL = 58;

  const ID_MID = ["SR7L", "397L", "M301", "2206", "3G36", "021D", "398T", "M400", "7K2A", "B19C", "Q88P", "H3N1", "R55W", "L2X9", "P0VT", "D44E"];

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
    statusModal: { id: "", value: "" },
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
  let lastIsfPath = "";
  const LIST_STATE_KEY = "kn-isf-list-state-v1";

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

  function noteRouteChange() {
    const current = isfRoutePath();
    const prev = lastIsfPath;
    if (prev && prev !== current) {
      const wasList = prev === ROUTE || prev === `${ROUTE}/`;
      const isSub = /^#transaction-us-isf\/(documents|history)\//.test(current);
      if (wasList && isSub) {
        captureListState();
      }
      const wasSub = /^#transaction-us-isf\/(documents|history)\//.test(prev);
      const isList = current === ROUTE || current === `${ROUTE}/`;
      if (wasSub && isList) {
        restoreListState();
      }
    }
    lastIsfPath = current;
  }

  function listReturnHash() {
    return ROUTE;
  }

  function documentBreadcrumbLabel(rowId) {
    const row = findTxnRow(rowId);
    if (!row) {
      return rowId;
    }
    if (window.KNIsfDetail?.viewerRecordId) {
      return window.KNIsfDetail.viewerRecordId(row);
    }
    return transactionLabel(rowId) || rowId;
  }

  function historyBreadcrumbLabel(rowId) {
    return transactionLabel(rowId) || rowId;
  }

  function escapeHtml(value) {
    return window.KNAdminUX.escapeHtml(value);
  }

  function pad(n, width) {
    return String(n).padStart(width, "0");
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function parseSortDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function curatedTxnRows() {
    return [
      {
        id: "isf-1",
        transactionId: "ISF-SR7L-5",
        companyName: "US LEGEND",
        cbpNumber: "",
        username: "ARUN-OPS",
        status: "FILED",
        statusChip: "submitted",
        etd: "Jan 04, 2024",
        etdSort: parseSortDate("Jan 04, 2024"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        filingDate: "Oct 12, 2023",
        filingSort: parseSortDate("Oct 12, 2023"),
        shipments: "KX-O47L-17",
        mbl: "COSU6151471624",
        hbl: "",
        country: "VN - Vietnam"
      },
      {
        id: "isf-2",
        transactionId: "ISF-SR7L-6",
        companyName: "US LEGEND",
        cbpNumber: "",
        username: "ARUN-OPS",
        status: "NEW",
        statusChip: "pending",
        etd: "Jan 04, 2024",
        etdSort: parseSortDate("Jan 04, 2024"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        filingDate: "",
        filingSort: 0,
        shipments: "KX-O47L-18",
        mbl: "COSU6151471625",
        hbl: "",
        country: "IN - India"
      },
      {
        id: "isf-3",
        transactionId: "ISF-M301-4",
        companyName: "ILLUMINATE USA, LLC",
        cbpNumber: "",
        username: "ILLUMINATECOMPANYADMIN",
        status: "ACCEPTED",
        statusChip: "submitted",
        etd: "Jan 04, 2024",
        etdSort: parseSortDate("Jan 04, 2024"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        filingDate: "Sep 04, 2024",
        filingSort: parseSortDate("Sep 04, 2024"),
        shipments: "KX-M301-27",
        mbl: "COSU6151471824",
        hbl: "HCI0414432",
        country: "VN - Vietnam"
      },
      {
        id: "isf-4",
        transactionId: "ISF-M301-3",
        companyName: "ILLUMINATE USA LLC",
        cbpNumber: "",
        username: "ILLUMINATECOMPANYADMIN",
        status: "ACCEPTED",
        statusChip: "submitted",
        etd: "Jan 04, 2024",
        etdSort: parseSortDate("Jan 04, 2024"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        filingDate: "Sep 04, 2024",
        filingSort: parseSortDate("Sep 04, 2024"),
        shipments: "KX-M301-26",
        mbl: "COSU6151471823",
        hbl: "",
        country: "VN - Vietnam"
      },
      {
        id: "isf-5",
        transactionId: "ISF-397L-5",
        companyName: "US LEGEND",
        cbpNumber: "",
        username: "ARUN-OPS",
        status: "FILED",
        statusChip: "submitted",
        etd: "Jan 04, 2024",
        etdSort: parseSortDate("Jan 04, 2024"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        filingDate: "Oct 12, 2023",
        filingSort: parseSortDate("Oct 12, 2023"),
        shipments: "KX-C87L-17",
        mbl: "COSU6151471824",
        hbl: "",
        country: "VN - Vietnam"
      },
      {
        id: "isf-6",
        transactionId: "ISF-2206-1",
        companyName: "COMPANY 1",
        cbpNumber: "",
        username: "KNSFUSER",
        status: "NEW",
        statusChip: "pending",
        etd: "Aug 27, 2024",
        etdSort: parseSortDate("Aug 27, 2024"),
        vesselName: "CMA CGM G. WASHINGTON",
        vesselId: "9462047",
        filingDate: "",
        filingSort: 0,
        shipments: "KX-2206-11",
        mbl: "CMDUHB2206001",
        hbl: "",
        country: "CN - China"
      },
      {
        id: "isf-7",
        transactionId: "ISF-3G36-3",
        companyName: "COMPANY 1",
        cbpNumber: "",
        username: "TESTUSER",
        status: "SENT",
        statusChip: "submitted",
        etd: "Apr 01, 2025",
        etdSort: parseSortDate("Apr 01, 2025"),
        vesselName: "THALASSA AXIA",
        vesselId: "9438879",
        filingDate: "Feb 01, 2024",
        filingSort: parseSortDate("Feb 01, 2024"),
        shipments: "KX-3G36-03",
        mbl: "HLCUHB0336033",
        hbl: "",
        country: "QA - Qatar"
      },
      {
        id: "isf-8",
        transactionId: "ISF-021D-8",
        companyName: "GLOBAL-PAK",
        cbpNumber: "ISF-18354115",
        username: "KAMAL SINGH",
        status: "ACCEPTED",
        statusChip: "submitted",
        etd: "Feb 11, 2025",
        etdSort: parseSortDate("Feb 11, 2025"),
        vesselName: "APL LE HAVRE",
        vesselId: "9350381",
        filingDate: "May 18, 2025",
        filingSort: parseSortDate("May 18, 2025"),
        shipments: "KR-OB0T-283",
        mbl: "CMDUHB0204786",
        hbl: "EGET20427328",
        country: "BE - Belgium"
      },
      {
        id: "isf-9",
        transactionId: "ISF-021D-9",
        companyName: "ILLUMINATE USA LLC",
        cbpNumber: "ISF-18354132",
        username: "MARIA LOPEZ",
        status: "SENT",
        statusChip: "submitted",
        etd: "Feb 17, 2025",
        etdSort: parseSortDate("Feb 17, 2025"),
        vesselName: "WAN HAI 512",
        vesselId: "9457822",
        filingDate: "May 24, 2025",
        filingSort: parseSortDate("May 24, 2025"),
        shipments: "VN-OB1K-441",
        mbl: "ONEYSGNFL9591500",
        hbl: "MCLMVSSAV2507004",
        country: "VN - Vietnam"
      },
      {
        id: "isf-10",
        transactionId: "ISF-021D-5",
        companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC",
        cbpNumber: "",
        username: "ENTRY AUTOMATION QA",
        status: "NEW",
        statusChip: "pending",
        etd: "May 03, 2025",
        etdSort: parseSortDate("May 3, 2025"),
        vesselName: "EVER LISSOME",
        vesselId: "9593878",
        filingDate: "",
        filingSort: 0,
        shipments: "CN-OB3M-118",
        mbl: "EGLV1975001234",
        hbl: "SHAA240518047",
        country: "CN - China"
      },
      {
        id: "isf-11",
        transactionId: "ISF-021D-4",
        companyName: "PACIFIC RIM TRADING CO",
        cbpNumber: "",
        username: "ISF OPS",
        status: "REJECTED",
        statusChip: "pending",
        etd: "May 04, 2025",
        etdSort: parseSortDate("May 4, 2025"),
        vesselName: "MSC OSCAR",
        vesselId: "9703318",
        filingDate: "",
        filingSort: 0,
        shipments: "TW-OB2F-512",
        mbl: "MEDUHB0284764",
        hbl: "TPEB240512901",
        country: "TW - Taiwan"
      },
      {
        id: "isf-12",
        transactionId: "ISF-021D-6",
        companyName: "NORTHSTAR LOGISTICS INC",
        cbpNumber: "",
        username: "KNSR-USER",
        status: "RETRANSMIT",
        statusChip: "pending",
        etd: "May 04, 2025",
        etdSort: parseSortDate("May 4, 2025"),
        vesselName: "MAERSK ESSEX",
        vesselId: "9632153",
        filingDate: "",
        filingSort: 0,
        shipments: "IN-OB7R-902",
        mbl: "MAEU9876543210",
        hbl: "BLR2405041182",
        country: "IN - India"
      }
    ];
  }

  function generatedTxnStatus(i) {
    if (i % 17 === 0) {
      return { label: "FIN BILL MATCH", chip: "finBill" };
    }
    if (i % 5 === 0) {
      return { label: "FILED", chip: "submitted" };
    }
    if (i % 4 === 0) {
      return { label: "REJECTED", chip: "pending" };
    }
    if (i % 3 === 0 || i % 3 === 1) {
      return i % 2 === 0 ? { label: "ACCEPTED", chip: "submitted" } : { label: "SENT", chip: "submitted" };
    }
    const pending = STATUSES.filter((s) => s.chip === "pending");
    return pending[i % pending.length];
  }

  function generatedTxnRow(i) {
    const mid = ID_MID[i % ID_MID.length];
    const company = COMPANIES[i % COMPANIES.length];
    const user = USERS[i % USERS.length];
    const vessel = VESSELS[i % VESSELS.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const status = generatedTxnStatus(i);
    const etd = new Date(Date.UTC(2024 + ((i * 3) % 2), (i * 5) % 12, 1 + (i % 27)));
    const filed = status.chip === "submitted" || (status.chip === "pending" && i % 4 === 0);
    const filing = filed ? new Date(etd.getTime() + ((i % 14) + 3) * 86400000) : null;
    const txnNum = 18354115 + i * 17;
    const mblPrefix = MBL_PREFIXES[i % MBL_PREFIXES.length];
    const hblPrefix = HBL_PREFIXES[i % HBL_PREFIXES.length];
    let cbpNumber = "";
    if (status.chip === "submitted") {
      cbpNumber = i % 11 === 0 ? `ISF-${txnNum}\nISF-${64000000000 + i * 91}` : `ISF-${txnNum}`;
    }
    const shipMid = ((i * 7) % 36).toString(36).toUpperCase();

    return {
      id: `isf-${i + 1}`,
      transactionId: `ISF-${mid}-${100 + (i % 900)}`,
      companyName: company,
      cbpNumber,
      username: user,
      status: status.label,
      statusChip: status.chip,
      etd: formatDate(etd),
      etdSort: etd.getTime(),
      vesselName: vessel.name,
      vesselId: vessel.id,
      filingDate: filing ? formatDate(filing) : "",
      filingSort: filing ? filing.getTime() : 0,
      shipments: i % 3 === 0 ? `KX-${shipMid}-${200 + (i % 800)}` : `${country.code}-OB${shipMid}-${200 + (i % 800)}`,
      mbl: `${mblPrefix}${pad((i * 7919) % 1e10, 10)}`,
      hbl: i % 6 === 0 ? "" : `${hblPrefix}${pad((i * 6287) % 1e8, 8)}`,
      country: `${country.code} - ${country.name}`
    };
  }

  function buildSeed() {
    if (seedCache) {
      return seedCache;
    }
    const rows = curatedTxnRows();
    for (let i = rows.length; i < TXN_SEED_TOTAL; i += 1) {
      rows.push(generatedTxnRow(i));
    }
    seedCache = rows;
    return seedCache;
  }

  function curatedShipRows() {
    const usImport = "US - United States of America";
    return [
      {
        id: "isf-ship-1",
        shipmentId: "KN-ISF-1-65",
        companyName: "TEST US COMPANY 4",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Aug 03, 2022",
        etdSort: parseSortDate("Aug 03, 2022"),
        vesselName: "WAN HAI 512",
        vesselId: "9223710",
        mbl: "EGLV143264634009",
        hbl: "RAJA667800",
        countryExport: "GE - Georgia",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-2",
        shipmentId: "KN-ISF-4",
        companyName: "ENGINE-KX-ISF-4-REAJITWARI100",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Jul 14, 2025",
        etdSort: parseSortDate("Jul 14, 2025"),
        vesselName: "MAERSK BROK",
        vesselId: "8408789",
        mbl: "M001099292",
        hbl: "DE3738101397",
        countryExport: "IN - India",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-3",
        shipmentId: "KN-ISF-13",
        companyName: "TEST US COMPANY 4",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Jul 18, 2025",
        etdSort: parseSortDate("Jul 18, 2025"),
        vesselName: "MAERSK BINTAN",
        vesselId: "9400758",
        mbl: "AEHU-LHI1017-2",
        hbl: "",
        countryExport: "VN - Vietnam",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-4",
        shipmentId: "KN-ISF-60",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Sep 25, 2025",
        etdSort: parseSortDate("Sep 25, 2025"),
        vesselName: "HUMBER BRIDGE",
        vesselId: "9293454",
        mbl: "MOLU3368282",
        hbl: "",
        countryExport: "CA - Canada",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-5",
        shipmentId: "KN-ISF-1-5",
        companyName: "LEGEND VALVE US",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Aug 21, 2025",
        etdSort: parseSortDate("Aug 21, 2025"),
        vesselName: "COSCO MALAYSIA",
        vesselId: "9448786",
        mbl: "COSU6151471824",
        hbl: "HCI0414432",
        countryExport: "CN - China",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-6",
        shipmentId: "KN-ISF-80",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Sep 05, 2025",
        etdSort: parseSortDate("Sep 05, 2025"),
        vesselName: "HUMBER BRIDGE",
        vesselId: "9302140",
        mbl: "MOLU3368282",
        hbl: "",
        countryExport: "CA - Canada",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-7",
        shipmentId: "KN-ISF-9",
        companyName: "TEST COMPANY 1",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "Sep 10, 2025",
        etdSort: parseSortDate("Sep 10, 2025"),
        vesselName: "UA VESSEL",
        vesselId: "1111111",
        mbl: "MOLU0067890",
        hbl: "HDEQ5557760",
        countryExport: "US - United States of America",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-8",
        shipmentId: "KR-OB0T-283",
        companyName: "GLOBAL-PAK",
        shipmentState: "IN PROGRESS",
        statusChip: "inProgress",
        stateTone: "information",
        etd: "Jul 23, 2028",
        etdSort: parseSortDate("Jul 23, 2028"),
        vesselName: "CMA CGM GANGES",
        vesselId: "9436367",
        mbl: "CMDUHB0204786",
        hbl: "EGET20427328",
        countryExport: "KR - Korea, Republic of",
        countryImport: usImport,
        mot: "OCEAN"
      },
      {
        id: "isf-ship-9",
        shipmentId: "VN-OB1K-441",
        companyName: "ILLUMINATE USA LLC",
        shipmentState: "New",
        statusChip: "active",
        stateTone: "information",
        etd: "May 29, 2026",
        etdSort: parseSortDate("May 29, 2026"),
        vesselName: "MSC OSCAR",
        vesselId: "9703318",
        mbl: "ONEYSGNFL9591500",
        hbl: "MCLMVSSAV2507004",
        countryExport: "VN - Vietnam",
        countryImport: usImport,
        mot: "OCEAN"
      }
    ];
  }

  function generatedShipRow(i) {
    const company = COMPANIES[i % COMPANIES.length];
    const vessel = VESSELS[i % VESSELS.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const shipState = SHIP_STATES[0];
    const etd = new Date(Date.UTC(2022 + ((i * 2) % 4), (i * 7) % 12, 1 + (i % 27)));
    return {
      id: `isf-ship-${i + 1}`,
      shipmentId: `KN-ISF-${i % 9 === 0 ? "1-" : ""}${100 + (i % 900)}`,
      companyName: company,
      shipmentState: shipState.label,
      statusChip: shipState.chip,
      stateTone: shipState.tone,
      etd: formatDate(etd),
      etdSort: etd.getTime(),
      vesselName: vessel.name,
      vesselId: vessel.id,
      mbl: `${MBL_PREFIXES[i % MBL_PREFIXES.length]}${pad((i * 7919) % 1e10, 10)}`,
      hbl: i % 4 === 0 ? "" : `${HBL_PREFIXES[i % HBL_PREFIXES.length]}${pad((i * 6287) % 1e8, 8)}`,
      countryExport: `${country.code} - ${country.name}`,
      countryImport: `${IMPORT_COUNTRY.code} - ${IMPORT_COUNTRY.name}`,
      mot: "OCEAN"
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

  function toast(content, color = "positive") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  function iconClose() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  }

  function iconCheck() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
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
    const joined = `${row.vesselName}, ${row.vesselId}`;
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
          ? row.statusChip !== "completed"
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

  function openStatusModal(row) {
    state.statusModal = { id: row.id, value: row.status || "" };
    state.selectOpen = "";
    render();
  }

  function closeStatusModal() {
    state.statusModal = { id: "", value: "" };
    state.selectOpen = "";
  }

  function renderStatusModal() {
    const ux = window.KNAdminUX;
    const row = state.statusModal.id ? findTxnRow(state.statusModal.id) : null;
    if (!row) {
      return "";
    }
    const bodyHtml = `
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label">Current Status</span>
        <div>${statusBadge(row.status)}</div>
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-isf-status-select-label">Transaction Status</span>
        ${ux.select({
          id: "kn-isf-status-select",
          name: "isfStatus",
          value: state.statusModal.value,
          options: TXN_STATUS_OPTIONS,
          placeholder: "Select a status",
          labelledBy: "kn-isf-status-select-label",
          openKey: "isf-status",
          open: state.selectOpen
        })}
      </div>`;
    const footerHtml = `
      <button class="btn btn--primary btn--md type-ui-md kn-btn isf-status-modal__cancel" type="button" data-admin-modal-dismiss>
        <span class="btn-icon" aria-hidden="true">${iconClose()}</span>
        Cancel
      </button>
      <button class="btn btn--secondary btn--md type-ui-md kn-btn isf-status-modal__reset" type="button" data-isf-status-confirm ${state.statusModal.value ? "" : "disabled"}>
        <span class="btn-icon" aria-hidden="true">${iconCheck()}</span>
        Reset Status
      </button>`;
    return ux.modalShell({
      open: true,
      id: "kn-isf-status-modal",
      titleId: "kn-isf-status-title",
      title: `Update Transaction Status (Transaction ID: ${row.transactionId})`,
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    });
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading ISF filings." })}
      <div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "isf-table" })}" aria-label="Loading US ISF transactions"><thead><tr class="vis-table__labels"><th scope="col">Actions</th><th scope="col">Transaction ID</th><th scope="col">Company Name</th><th scope="col">…</th></tr></thead><tbody>${ux.tableSkeletonRows({ cols: 13, rows: 8 })}</tbody></table></div></div>`;
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
          <td>${ux.tmTxnRowActions({ id: row.id, label: row.transactionId, prefix: "isf" })}</td>
          <td class="admin-table-nowrap" title="${escapeHtml(row.transactionId)}">
            <span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span>
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
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 13,
          title: "No ISF filings found matching your search",
          description: "Clear filters or switch status chips to see filings.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });

    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "submitted", label: "Submitted", count: counts.submitted, selected: chip === "submitted" },
        { id: "pending", label: "Pending Submission", count: counts.pending, selected: chip === "pending" },
        { id: "finBill", label: "No Bill Match", count: counts.finBill, selected: chip === "finBill" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}. Sorted by ${state.txn.sortKey}, ${state.txn.sortDir === "desc" ? "descending" : "ascending"}.`
    })}
    <div class="vis-table-wrap role-table-card isf-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "isf-table" })}" aria-label="US ISF transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-isf-sort")}
              ${sortHeader("companyName", "Company Name", "data-isf-sort")}
              ${sortHeader("cbpNumber", "CBP Transaction Number", "data-isf-sort")}
              ${sortHeader("username", "Username", "data-isf-sort")}
              ${sortHeader("status", "Transaction State", "data-isf-sort")}
              ${sortHeader("etd", "ETD", "data-isf-sort")}
              ${sortHeader("vesselName", "Vessel Name", "data-isf-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-isf-sort")}
              ${sortHeader("shipments", "Shipment #", "data-isf-sort")}
              ${sortHeader("mbl", "MBL", "data-isf-sort")}
              ${sortHeader("hbl", "HBL", "data-isf-sort")}
              ${sortHeader("country", "Country of Export", "data-isf-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
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
      <div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 4, extra: "isf-table isf-table--ship" })}" aria-label="Loading US ISF shipments"><thead><tr class="vis-table__labels"><th scope="col">Actions</th><th scope="col">Shipment ID</th><th scope="col">Company Name</th><th scope="col">…</th></tr></thead><tbody>${ux.tableSkeletonRows({ cols: 11, rows: 8 })}</tbody></table></div></div>`;
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
          <td>${ux.tmShipRowActions({ id: row.id, label: row.shipmentId, prefix: "isf-ship" })}</td>
          <td class="admin-table-nowrap">
            <a class="kn-link admin-name-link" href="#transaction-us-isf" data-isf-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}">
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
        </tr>`
          )
          .join("")
      : ux.tmTableEmptyRow({
          colspan: 11,
          title: "No ISF shipments found matching your search",
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
    <div class="vis-table-wrap role-table-card isf-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 4, extra: "isf-table isf-table--ship" })}" aria-label="US ISF shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
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
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-isf-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({
                attr: "data-isf-ship-filter",
                key: "shipmentState",
                value: state.ship.filters.shipmentState,
                label: "shipment state",
                open: state.selectOpen,
                placeholder: "Select",
                emptyLabel: "Select",
                options: [
                  { value: "New", label: "New" },
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
              ${ux.colKnSelect({
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

  function isfRoutePath() {
    return typeof window.getHashPath === "function" ? window.getHashPath() : String(location.hash || "");
  }

  function goto(hash) {
    if (isfRoutePath() === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function historyRouteId() {
    const match = isfRoutePath().match(/^#transaction-us-isf\/history\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function documentsRouteId() {
    const match = isfRoutePath().match(/^#transaction-us-isf\/documents\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function transactionLabel(id) {
    return findTxnRow(id)?.transactionId || "";
  }

  function render() {
    noteRouteChange();
    const page = document.getElementById("kn-isf-page");
    const root = document.getElementById("kn-isf-root");
    if (!page || !root || page.hidden) {
      return;
    }
    const documentsId = documentsRouteId();
    if (documentsId) {
      const row = findTxnRow(documentsId);
      if (!row) {
        toast("That ISF transaction is no longer available.", "notice");
        goto("#transaction-us-isf");
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
        root.innerHTML = window.KNIsfDocViewer.render(row, {
          hasPrev: Boolean(adjacentTxnId(row.id, -1)),
          hasNext: Boolean(adjacentTxnId(row.id, 1)),
          keepTab
        });
        window.KNIsfDocViewer.hydratePreview?.(root, { rerender: render });
        window.KNIsfDocViewer.hydrateSearch?.(root);
        window.KNFileUpload?.hydrate(root);
        window.KNSearchInput?.hydrate?.(root);
        if (searchFocus) {
          const el = root.querySelector(`[${searchFocus.attr}]`);
          if (el) {
            el.focus();
            el.setSelectionRange(searchFocus.start, searchFocus.end);
          }
        }
        window.KNIsfAssistant?.syncFromHash?.(row);
      };
      if (isNewRow && !prefersReducedMotion() && typeof window.KNIsfDocViewer?.renderSkeleton === "function") {
        const token = ++detailLoadToken;
        window.clearTimeout(detailLoadTimer);
        root.innerHTML = window.KNIsfDocViewer.renderSkeleton();
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
        toast("That ISF transaction is no longer available.", "notice");
        goto("#transaction-us-isf");
        return;
      }
      goto(`#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=edit`);
      return;
    }
    // Back on the list — clear the loaded-row marker so reopening the same
    // filing later shows a fresh skeleton instead of skipping it.
    window.clearTimeout(detailLoadTimer);
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
    ${state.view === "transaction" ? renderTxnTable() : renderShipTable()}
    ${renderStatusModal()}`;
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

  // Adjacent record in the *currently filtered/sorted* transaction list — lets a
  // broker step through their working set from the detail page without bouncing
  // back to the table each time (same pattern as shipment-detail.js's prev/next).
  function adjacentTxnId(id, direction) {
    const rows = filteredTxnRows();
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      return "";
    }
    const next = rows[index + direction];
    return next ? next.id : "";
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
          const handled = window.KNIsfDocViewer?.handleClick(event, row, {
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
          if (key === "isf-status") {
            state.statusModal.value = value;
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
      });
      if (selectHandled) {
        return;
      }
      if (event.target.closest("[data-admin-modal-dismiss]")) {
        event.preventDefault();
        closeStatusModal();
        render();
        return;
      }
      const statusConfirm = event.target.closest("[data-isf-status-confirm]");
      if (statusConfirm) {
        event.preventDefault();
        const row = findTxnRow(state.statusModal.id);
        const chosen = TXN_STATUS_OPTIONS.find((opt) => opt.id === state.statusModal.value);
        if (row && chosen) {
          row.status = chosen.id;
          row.statusChip = chosen.chip;
          closeStatusModal();
          toast(`${row.transactionId} status reset to ${chosen.label}.`, "positive");
          render();
        }
        return;
      }
      const shipView = event.target.closest("[data-isf-ship-view]");
      if (shipView) {
        event.preventDefault();
        const row = findShipRow(shipView.getAttribute("data-isf-ship-view"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const shipCreate = event.target.closest("[data-isf-ship-create]");
      if (shipCreate) {
        event.preventDefault();
        const row = findShipRow(shipCreate.getAttribute("data-isf-ship-create"));
        toast(`Create Transaction for ${row?.shipmentId || "shipment"} opened in this sample.`, "notice");
        return;
      }
      const shipIntake = event.target.closest("[data-isf-ship-intake]");
      if (shipIntake) {
        event.preventDefault();
        const row = findShipRow(shipIntake.getAttribute("data-isf-ship-intake"));
        toast(`${row?.shipmentId || "Shipment"} moved back to Intake in this sample.`, "notice");
        return;
      }
      const shipOpen = event.target.closest("[data-isf-ship-open]");
      if (shipOpen) {
        event.preventDefault();
        const row = findShipRow(shipOpen.getAttribute("data-isf-ship-open"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const history = event.target.closest("[data-isf-history], [data-isf-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-isf-ship-history");
        if (!isShip) {
          const row = findTxnRow(history.getAttribute("data-isf-history"));
          if (row) {
            goto(`#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=transaction`);
          }
          return;
        }
        const row = findShipRow(history.getAttribute("data-isf-ship-history"));
        toast(`History for ${row?.shipmentId || "record"} is not available in this sample.`, "notice");
        return;
      }
      const edit = event.target.closest("[data-isf-open]");
      if (edit) {
        event.preventDefault();
        const row = findTxnRow(edit.getAttribute("data-isf-open"));
        if (row) {
          goto(`#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=edit`);
        }
        return;
      }
      const doc = event.target.closest("[data-isf-document], [data-isf-ship-document]");
      if (doc) {
        event.preventDefault();
        const isShip = doc.hasAttribute("data-isf-ship-document");
        const row = isShip
          ? findShipRow(doc.getAttribute("data-isf-ship-document"))
          : findTxnRow(doc.getAttribute("data-isf-document"));
        if (row && !isShip) {
          goto(`#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0`);
          return;
        }
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Documents for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
      const refresh = event.target.closest("[data-isf-ship-refresh]");
      if (refresh) {
        event.preventDefault();
        const row = findShipRow(refresh.getAttribute("data-isf-ship-refresh"));
        toast(`Refresh for ${row?.shipmentId || "record"} is not available in this sample.`, "notice");
      }
    });

    page.addEventListener("input", (event) => {
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row) {
          window.KNIsfDocViewer?.handleInput(event, row, { rerender: render });
        }
        return;
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
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
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row && window.KNIsfDocViewer?.handleChange?.(event, row, { rerender: render })) {
          return;
        }
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
      }
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

    page.addEventListener("drop", (event) => {
      const documentsId = documentsRouteId();
      if (documentsId) {
        const row = findTxnRow(documentsId);
        if (row && window.KNIsfDocViewer?.handleDrop?.(event, row, { rerender: render })) {
          return;
        }
      }
      const historyId = historyRouteId();
      if (historyId) {
        return;
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
      if (page.hidden) {
        return;
      }
      if (documentsRouteId()) {
        if (window.KNIsfDocViewer?.closeSelects?.()) {
          render();
        }
        return;
      }
      if (!state.selectOpen && !state.menuOpen) {
        return;
      }
      state.selectOpen = "";
      state.menuOpen = "";
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
          if (window.KNIsfDocViewer?.closeOverlays?.()) {
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
    },
    transactionLabel,
    listReturnHash,
    documentBreadcrumbLabel,
    historyBreadcrumbLabel
  };
})();
