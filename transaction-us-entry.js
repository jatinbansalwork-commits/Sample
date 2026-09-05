(() => {
  const ROUTE = "#transaction-us-entry";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setSeconds(d.getSeconds() - 13); return d.toISOString(); })();
  let refreshTimer = null;

  const TXN_SEED_TOTAL = 1355;

  const US_COMPANIES = ["US COMPANY 1", "US COMPANY 2", "US COMPANY 3"];
  const COMPANIES = [
    "TEST COMPANY 1",
    ...US_COMPANIES,
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS",
    "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
    "ACUITY BRANDS"
  ];
  const USERS = ["TANYA AGRAWAL", "SURAJ SHINDE", "US THIRD PARTY", "KAMAL SINGH", "MARIA LOPEZ", "PRIYA SHARMA", "JAMES CHEN", "ANITA DESAI", "DAVID PARK", "SOPHIE MARTIN", ""];
  const VESSELS_QAT = ["EGLV", "COLV", "EVER SUPERB", "WAN HAI 512", "MSC OSCAR", "MAERSK ESSEX"];
  const SHIP_VESSELS_QAT = ["QA VESSEL 111111", "CMA CGM S. WASHINGTON", "EVER ELITE", "WAN HAI 512", "MSC OSCAR", "ONE HAMBURG"];
  const SHIP_COMPANIES = ["TEST COMPANY 1", "ILLUMINATE USA, LLC", "US COMPANY 1", "US COMPANY 2", "GLOBAL-PAK", "PACIFIC RIM TRADING CO"];
  const SHIP_NOT_CREATED_COUNT = 43;
  const SHIP_IN_PROGRESS_COUNT = 12;
  const SHIP_COMPLETED_COUNT = 17;
  const ENTRY_TYPES = [
    "01 - CONSUMPTION",
    "21 - WAREHOUSE",
    "07 - CONSUMPTION: ANTIDUMPING/COUNTERVAILING DUTY AND QUOTA/VISA COMBINATION",
    "11 - INFORMAL",
    "31 - WAREHOUSE WITHDRAWAL - CONSUMPTION",
    "02 - CONSUMPTION QUOTA"
  ];
  const VESSELS = [
    { name: "WAN HAI 512", id: "S497022" },
    { name: "EVER ELITE", id: "9783510" },
    { name: "HUMBER BRIDGE", id: "9450428" },
    { name: "MSC OSCAR", id: "9703318" },
    { name: "MAERSK ESSEX", id: "9632153" },
    { name: "ONE HAMBURG", id: "9741425" },
    { name: "CMA CGM GANGES", id: "9436367" },
    { name: "COSCO SHIPPING UNIVERSE", id: "9795600" }
  ];
  const MOTS = ["OCEAN", "OCEAN", "TRUCK", "OCEAN", "AIR"];
  const MBL_PREFIXES = ["CMDU", "MAEU", "ONEY", "EGLV", "HLCU", "MEDU", "HDMU", "COSU"];
  const HBL_PREFIXES = ["EGET", "MCLM", "SHAA", "TPEB", "BLR", "SGN", "DXB", "ITGN"];
  const COUNTRIES = [
    { code: "AS", name: "American Samoa" }, { code: "GE", name: "Georgia" }, { code: "DE", name: "Germany" },
    { code: "VN", name: "Vietnam" }, { code: "CN", name: "China" }, { code: "BE", name: "Belgium" },
    { code: "TW", name: "Taiwan" }, { code: "IN", name: "India" }, { code: "SG", name: "Singapore" },
    { code: "AE", name: "United Arab Emirates" }, { code: "KR", name: "Korea, Republic of" }, { code: "MX", name: "Mexico" }
  ];
  const PORTS = ["1704", "2811", "0101; 55, CA, CA", "5301 - HOUSTON, TX, US", "2704 - LOS ANGELES, CA, US", "1001 - NEW YORK, NY, US"];
  const FIRMS = ["AN9", "A007", "AA19", "ACCT", "V136", "X362", "H054"];
  const ID_MID = ["0177", "0178", "0179", "0180", "0181", "3809", "3769", "9809", "071Y", "07HC"];

  /** Minimal ISF rows for cross-table MBL/HBL joins when KNUsIsf has not booted. */
  const ISF_LINK_FALLBACK = [
    { id: "isf-1", transactionId: "ISF-021D-8", companyName: "GLOBAL-PAK", username: "KAMAL SINGH", statusChip: "submitted", etd: "Feb 11, 2025", etdSort: 0, filingDate: "May 18, 2025", shipments: "KR-OB0T-283", mbl: "CMDUHB0204786", hbl: "EGET20427328", country: "BE - Belgium" },
    { id: "isf-2", transactionId: "ISF-021D-9", companyName: "ILLUMINATE USA LLC", username: "MARIA LOPEZ", statusChip: "submitted", etd: "Feb 17, 2025", etdSort: 0, filingDate: "May 24, 2025", shipments: "VN-OB1K-441", mbl: "ONEYSGNFL9591500", hbl: "MCLMVSSAV2507004", country: "VN - Vietnam" },
    { id: "isf-3", transactionId: "ISF-021D-5", companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC", username: "PRIYA SHARMA", statusChip: "pending", etd: "May 03, 2025", etdSort: 0, filingDate: "", shipments: "CN-OB3M-118", mbl: "EGLV1975001234", hbl: "SHAA240518047", country: "CN - China" },
    { id: "isf-4", transactionId: "ISF-021D-4", companyName: "PACIFIC RIM TRADING CO", username: "JAMES CHEN", statusChip: "pending", etd: "May 04, 2025", etdSort: 0, filingDate: "", shipments: "TW-OB2F-512", mbl: "MEDUHB0284764", hbl: "TPEB240512901", country: "TW - Taiwan" },
    { id: "isf-5", transactionId: "ISF-021D-6", companyName: "NORTHSTAR LOGISTICS INC", username: "ANITA DESAI", statusChip: "pending", etd: "May 04, 2025", etdSort: 0, filingDate: "", shipments: "IN-OB7R-902", mbl: "MAEU9876543210", hbl: "BLR2405041182", country: "IN - India" },
    { id: "isf-6", transactionId: "ISF-021D-7", companyName: "SUMMIT IMPORT GROUP LLC", username: "DAVID PARK", statusChip: "pending", etd: "May 08, 2025", etdSort: 0, filingDate: "May 18, 2025", shipments: "SG-OB4N-331", mbl: "HLCUHB4782301", hbl: "SGN2405087720", country: "SG - Singapore" },
    { id: "isf-7", transactionId: "ISF-023F-1", companyName: "ATLANTIC CARGO PARTNERS", username: "SOPHIE MARTIN", statusChip: "pending", etd: "May 18, 2025", etdSort: 0, filingDate: "", shipments: "AE-OB9K-118", mbl: "CMDUAE7654321", hbl: "DXB2405180094", country: "AE - United Arab Emirates" }
  ];

  const INB_LINK_FALLBACK = [
    { id: "inb-2", transactionId: "INB-021D-8", mbl: "CMDUHB0204786" },
    { id: "inb-1", transactionId: "INB-M001-1", mbl: "HDMUHHKAB547930" },
    { id: "inb-3", transactionId: "INB-021D-5", mbl: "EGLV1975001234" },
    { id: "inb-4", transactionId: "INB-021D-4", mbl: "MEDUHB0284764" },
    { id: "inb-5", transactionId: "INB-021D-6", mbl: "MAEU9876543210" },
    { id: "inb-6", transactionId: "INB-021D-7", mbl: "HLCUHB4782301" },
    { id: "inb-7", transactionId: "INB-023F-1", mbl: "CMDUAE7654321" }
  ];

  const emptyTxnFilters = () => ({
    chip: "all", transactionId: "", companyName: "", entryNumber: "", entryType: "", username: "",
    entrySummary: "", cargoRelease: "", pgaStatus: "", firmsCode: "", eta: "", fspdDate: "", vesselName: "",
    filingDate: "", shipments: "", mot: "", mbl: "", hbl: "", countryExport: "", countryImport: "", portUnlading: "", lastUpdated: ""
  });
  const emptyShipFilters = () => ({
    chip: "allActive", shipmentId: "", companyName: "", shipmentState: "", eta: "", vesselName: "",
    mot: "", mbl: "", hbl: "", countryExport: "", countryImport: ""
  });

  const state = {
    view: "transaction", menuOpen: "", selectOpen: "", createModalOpen: false, createSelectOpen: "",
    createForm: {
      subCustomer: "",
      company: "",
      entryType: "",
      countryOrigin: "",
      countryDestination: "US - United States of America",
      mot: "",
      mbl: "",
      hbol: "",
      departDate: "",
      arriveDate: ""
    },
    booting: false, ready: false,
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 25, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function pad(n, w) { return String(n).padStart(w, "0"); }
  function formatDate(date) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date); }
  function toast(content, color = "positive") { if (typeof window.showKnToast === "function") window.showKnToast({ content, color }); }

  function pgaBadge(value) {
    const text = String(value || "NW").trim() || "NW";
    return `<span class="badge badge--information type-caption-sm kn-badge entry-pga-badge" title="PGA Status">${escapeHtml(text)}</span>`;
  }

  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function parseSortDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isfPeers() {
    try {
      const live = window.KNUsIsf?.list?.();
      if (live?.length) return live;
    } catch (_) { /* not loaded */ }
    return ISF_LINK_FALLBACK;
  }

  function inbPeers() {
    try {
      const live = window.KNUsInBond?.list?.();
      if (live?.length) return live;
    } catch (_) { /* not loaded */ }
    return INB_LINK_FALLBACK;
  }

  function findInbByMbl(mbl) {
    if (!mbl) return null;
    return inbPeers().find((row) => row.mbl === mbl) || null;
  }

  function chipForIndex(i) {
    const r = i % 12;
    if (r === 0) return "reject";
    if (r === 1) return "hold";
    if (r === 2) return "complete";
    if (r <= 6) return "recent";
    return "active";
  }

  function summaryCargoFor(i, submitted = false) {
    if (submitted) {
      return { entrySummary: "FILED", cargoRelease: "FILED", summaryTone: "positive" };
    }
    const r = i % 7;
    if (r === 0) return { entrySummary: "FILED", cargoRelease: "FILED", summaryTone: "positive" };
    if (r === 1) return { entrySummary: "READY", cargoRelease: "READY", summaryTone: "information" };
    if (r === 2) return { entrySummary: "NONE", cargoRelease: "NONE", summaryTone: "neutral" };
    return { entrySummary: "IN PROGRESS", cargoRelease: "IN PROGRESS", summaryTone: "notice" };
  }

  function summaryToneFor(label) {
    const text = String(label || "").toUpperCase();
    if (text === "FILED" || text === "ACCEPTED") return "positive";
    if (text === "READY") return "information";
    if (text === "NONE") return "neutral";
    return "notice";
  }

  function qatEntryBase(overrides = {}) {
    const eta = overrides.eta || "May 28, 2024";
    const etaSort = overrides.etaSort ?? parseSortDate(eta);
    const updated = overrides.lastUpdated || "Sep 02, 2025";
    return {
      companyName: "TEST COMPANY 1",
      entryType: "01 - CONSUMPTION",
      username: "TANYA AGRAWAL",
      entrySummary: "IN PROGRESS",
      cargoRelease: "IN PROGRESS",
      pgaStatus: "NW",
      firmsCode: "W555",
      eta,
      etaSort,
      fspdDate: "Jun 10, 2024",
      fspdSort: parseSortDate("Jun 10, 2024"),
      vesselName: "EGLV",
      filingDate: "",
      filingSort: 0,
      shipments: "NA",
      mot: "OCEAN",
      mbl: "",
      hbl: "",
      countryExport: "CN - China",
      countryImport: "US - United States of America",
      portUnlading: "5301 - HOUSTON, TX, US",
      lastUpdated: updated,
      lastUpdatedSort: parseSortDate(updated),
      statusChip: "active",
      ...overrides
    };
  }

  function entryFromIsf(isf, i, overrides = {}) {
    const vessel = VESSELS[i % VESSELS.length];
    const eta = isf.etd || formatDate(new Date());
    const etaSort = isf.etdSort || parseSortDate(eta);
    const etaDate = new Date(etaSort || Date.now());
    const fspd = new Date(etaDate.getTime() + 7 * 86400000);
    const updated = new Date(Date.UTC(2025, 8, 1 + (i % 28)));
    const inb = findInbByMbl(isf.mbl);
    const summary = summaryCargoFor(i, isf.statusChip === "submitted");
    return {
      id: overrides.id || `entry-${i + 1}`,
      transactionId: overrides.transactionId || `KN-${ID_MID[i % ID_MID.length]}-${2 + (i % 90)}`,
      companyName: overrides.companyName || isf.companyName,
      entryNumber: overrides.entryNumber || `217-${pad(1302376 + i, 8)}`,
      entryType: overrides.entryType || "01 - CONSUMPTION",
      username: overrides.username || isf.username || "US THIRD PARTY",
      ...summary,
      pgaStatus: overrides.pgaStatus || "NW",
      firmsCode: overrides.firmsCode || FIRMS[i % FIRMS.length],
      eta,
      etaSort,
      fspdDate: formatDate(fspd),
      fspdSort: fspd.getTime(),
      vesselName: overrides.vesselName || `${vessel.name},${vessel.id}`,
      filingDate: isf.filingDate || "",
      filingSort: isf.filingDate ? parseSortDate(isf.filingDate) : 0,
      shipments: overrides.shipments || isf.shipments,
      mot: overrides.mot || "OCEAN",
      mbl: isf.mbl,
      hbl: isf.hbl || "",
      countryExport: isf.country || `${COUNTRIES[i % COUNTRIES.length].code} - ${COUNTRIES[i % COUNTRIES.length].name}`,
      countryImport: "US - United States of America",
      portUnlading: PORTS[i % PORTS.length],
      lastUpdated: formatDate(updated),
      lastUpdatedSort: updated.getTime(),
      statusChip: overrides.statusChip || (isf.statusChip === "submitted" ? "active" : "recent"),
      isfLinkId: isf.id,
      isfTransactionId: isf.transactionId,
      inbLinkId: inb?.id || "",
      inbTransactionId: inb?.transactionId || ""
    };
  }

  function curatedEntryRows() {
    return [
      qatEntryBase({
        id: "entry-1",
        transactionId: "KN-CDML-39",
        entryNumber: "KH5-03038395",
        username: "TANYA AGRAWAL",
        firmsCode: "W555",
        eta: "May 28, 2024",
        etaSort: parseSortDate("May 28, 2024"),
        fspdDate: "Jun 10, 2024",
        fspdSort: parseSortDate("Jun 10, 2024"),
        vesselName: "EGLV",
        statusChip: "active"
      }),
      qatEntryBase({
        id: "entry-2",
        transactionId: "KN-CDML-43",
        entryNumber: "6WL-85800822",
        username: "SURAJ SHINDE",
        firmsCode: "A007",
        fspdDate: "Aug 21, 2025",
        fspdSort: parseSortDate("Aug 21, 2025"),
        vesselName: "COLV",
        statusChip: "recent"
      }),
      qatEntryBase({
        id: "entry-3",
        transactionId: "KN-CDML-44",
        entryNumber: "KH5-03038401",
        username: "TANYA AGRAWAL",
        entrySummary: "FILED",
        cargoRelease: "FILED",
        filingDate: "May 18, 2024",
        filingSort: parseSortDate("May 18, 2024"),
        vesselName: "EVER SUPERB",
        statusChip: "complete"
      }),
      qatEntryBase({
        id: "entry-4",
        transactionId: "KN-CDML-45",
        entryNumber: "6WL-85800830",
        username: "SURAJ SHINDE",
        entrySummary: "READY",
        cargoRelease: "READY",
        firmsCode: "AA19",
        vesselName: "COLV",
        statusChip: "active"
      }),
      qatEntryBase({
        id: "entry-5",
        transactionId: "KN-CDML-46",
        entryNumber: "KH5-03038418",
        username: "TANYA AGRAWAL",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        eta: "Jun 12, 2024",
        etaSort: parseSortDate("Jun 12, 2024"),
        vesselName: "EGLV",
        mbl: "33000628620",
        hbl: "8650121248",
        statusChip: "hold"
      })
    ];
  }

  function generatedEntryRow(i) {
    const summary = summaryCargoFor(i);
    const eta = new Date(Date.UTC(2024, 4 + (i % 6), 1 + (i % 27)));
    const filing = i % 4 === 0 ? new Date(eta.getTime() - ((i % 20) + 5) * 86400000) : null;
    const fspd = i % 3 === 0 ? new Date(eta.getTime() + ((i % 10) + 1) * 86400000) : new Date(eta.getTime() + 14 * 86400000);
    const updated = new Date(Date.UTC(2025, 8, 1 + (i % 28)));
    const entryNumPrefix = i % 2 === 0 ? "KH5-" : "6WL-";
    return qatEntryBase({
      id: `entry-${i + 1}`,
      transactionId: `KN-CDML-${39 + (i % 900)}`,
      companyName: i % 8 === 0 ? COMPANIES[i % COMPANIES.length] : "TEST COMPANY 1",
      entryNumber: `${entryNumPrefix}${pad(303895 + i, 8)}`,
      entryType: ENTRY_TYPES[i % ENTRY_TYPES.length],
      username: USERS[i % USERS.length] || "TANYA AGRAWAL",
      entrySummary: summary.entrySummary,
      cargoRelease: summary.cargoRelease,
      firmsCode: FIRMS[i % FIRMS.length],
      eta: formatDate(eta),
      etaSort: eta.getTime(),
      fspdDate: formatDate(fspd),
      fspdSort: fspd.getTime(),
      vesselName: VESSELS_QAT[i % VESSELS_QAT.length],
      filingDate: filing ? formatDate(filing) : "",
      filingSort: filing ? filing.getTime() : 0,
      shipments: i % 5 === 0 ? `KR-CDML-${10 + (i % 90)}` : "NA",
      mot: MOTS[i % MOTS.length],
      mbl: i % 3 === 0 ? String(33000628620 + i * 17) : "",
      hbl: i % 3 === 0 ? String(8650121248 + i * 13) : "",
      countryExport: `${COUNTRIES[i % COUNTRIES.length].code} - ${COUNTRIES[i % COUNTRIES.length].name}`,
      portUnlading: PORTS[i % PORTS.length],
      lastUpdated: formatDate(updated),
      lastUpdatedSort: updated.getTime(),
      statusChip: chipForIndex(i)
    });
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const isfRows = isfPeers();
    const rows = curatedEntryRows();
    for (let i = rows.length; i < TXN_SEED_TOTAL; i += 1) {
      const isf = isfRows[i];
      rows.push(isf ? entryFromIsf(isf, i) : generatedEntryRow(i));
    }
    seedCache = rows;
    return rows;
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = curatedShipRows();
    const counts = { notCreated: 0, inProgress: 0, completed: 0 };
    rows.forEach((row) => { if (counts[row.statusChip] != null) counts[row.statusChip] += 1; });
    let i = rows.length;
    while (counts.notCreated < SHIP_NOT_CREATED_COUNT) {
      rows.push(generatedShipRow(i, "notCreated", "New", "information"));
      counts.notCreated += 1;
      i += 1;
    }
    while (counts.inProgress < SHIP_IN_PROGRESS_COUNT) {
      rows.push(generatedShipRow(i, "inProgress", "In Progress", "notice"));
      counts.inProgress += 1;
      i += 1;
    }
    while (counts.completed < SHIP_COMPLETED_COUNT) {
      rows.push(generatedShipRow(i, "completed", "Completed", "positive"));
      counts.completed += 1;
      i += 1;
    }
    shipSeedCache = rows;
    return rows;
  }

  function qatShipBase(overrides = {}) {
    const eta = overrides.eta || "Jul 30, 2024";
    const etaSort = overrides.etaSort ?? parseSortDate(eta);
    return {
      companyName: "TEST COMPANY 1",
      shipmentState: "New",
      statusChip: "notCreated",
      stateTone: "information",
      eta,
      etaSort,
      vesselName: "QA VESSEL 111111",
      mot: "OCEAN",
      mbl: "MOC02457890",
      hbl: "H8650121248",
      countryExport: "US - United States of America",
      countryImport: "US - United States of America",
      ...overrides
    };
  }

  function curatedShipRows() {
    return [
      qatShipBase({
        id: "entry-ship-1",
        shipmentId: "KX-BCWL-9",
        companyName: "TEST COMPANY 1",
        shipmentState: "In Progress",
        statusChip: "inProgress",
        stateTone: "notice",
        eta: "Jul 30, 2024",
        etaSort: parseSortDate("Jul 30, 2024"),
        vesselName: "QA VESSEL 111111",
        mbl: "MOC02457890",
        hbl: "8650121248"
      }),
      qatShipBase({
        id: "entry-ship-2",
        shipmentId: "KX-BCWL-10",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "New",
        statusChip: "notCreated",
        eta: "Aug 14, 2024",
        etaSort: parseSortDate("Aug 14, 2024"),
        vesselName: "CMA CGM S. WASHINGTON",
        mot: "TRUCK",
        mbl: "TRK02457891",
        hbl: "H8650121250",
        countryExport: "CN - China"
      }),
      qatShipBase({
        id: "entry-ship-3",
        shipmentId: "KX-BCWL-11",
        companyName: "TEST COMPANY 1",
        shipmentState: "New",
        statusChip: "notCreated",
        eta: "Sep 02, 2024",
        etaSort: parseSortDate("Sep 02, 2024"),
        vesselName: "EVER ELITE",
        mot: "AIR",
        mbl: "AIR02457892",
        countryExport: "DE - Germany"
      }),
      qatShipBase({
        id: "entry-ship-4",
        shipmentId: "KX-BCWL-12",
        companyName: "TEST COMPANY 1",
        shipmentState: "In Progress",
        statusChip: "inProgress",
        stateTone: "notice",
        eta: "Oct 05, 2024",
        etaSort: parseSortDate("Oct 05, 2024"),
        vesselName: "WAN HAI 512",
        mbl: "40624604451",
        hbl: "H456789012"
      }),
      qatShipBase({
        id: "entry-ship-5",
        shipmentId: "KX-BCWL-13",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "Completed",
        statusChip: "completed",
        stateTone: "positive",
        eta: "Jun 18, 2024",
        etaSort: parseSortDate("Jun 18, 2024"),
        vesselName: "MSC OSCAR",
        mbl: "MSC02457893",
        hbl: "H8650121299"
      })
    ];
  }

  function generatedShipRow(i, statusChip, shipmentState, stateTone) {
    const eta = new Date(Date.UTC(2024, 6 + (i % 5), 1 + (i % 27)));
    const company = i % 6 === 0 ? SHIP_COMPANIES[i % SHIP_COMPANIES.length] : "TEST COMPANY 1";
    return qatShipBase({
      id: `entry-ship-${i + 1}`,
      shipmentId: `KX-BCWL-${9 + (i % 990)}`,
      companyName: company,
      shipmentState,
      statusChip,
      stateTone,
      eta: formatDate(eta),
      etaSort: eta.getTime(),
      vesselName: SHIP_VESSELS_QAT[i % SHIP_VESSELS_QAT.length],
      mot: MOTS[i % MOTS.length],
      mbl: i % 4 === 0 ? `MOC${pad(2457890 + i, 7)}` : String(40624604451 + i * 29),
      hbl: i % 5 === 0 ? "" : `H${pad((i * 4567) % 1e9, 9)}`,
      countryExport: i % 3 === 0 ? "CN - China" : `${COUNTRIES[i % COUNTRIES.length].code} - ${COUNTRIES[i % COUNTRIES.length].name}`
    });
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    const dateKeys = { eta: "etaSort", filingDate: "filingSort", fspdDate: "fspdSort", lastUpdated: "lastUpdatedSort" };
    rows.sort((a, b) => {
      let av; let bv;
      if (sortKey in dateKeys) { av = a[dateKeys[sortKey]] || 0; bv = b[dateKeys[sortKey]] || 0; }
      else { av = String(a[sortKey] || "").toLowerCase(); bv = String(b[sortKey] || "").toLowerCase(); }
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
        [f.transactionId, row.transactionId], [f.companyName, row.companyName], [f.entryNumber, row.entryNumber],
        [f.entryType, row.entryType], [f.username, row.username], [f.entrySummary, row.entrySummary],
        [f.cargoRelease, row.cargoRelease], [f.pgaStatus, row.pgaStatus], [f.firmsCode, row.firmsCode],
        [f.eta, row.eta], [f.fspdDate, row.fspdDate], [f.vesselName, row.vesselName], [f.filingDate, row.filingDate],
        [f.shipments, row.shipments], [f.mot, row.mot], [f.mbl, row.mbl], [f.hbl, row.hbl],
        [f.countryExport, row.countryExport], [f.countryImport, row.countryImport],
        [f.portUnlading, row.portUnlading], [f.lastUpdated, row.lastUpdated]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.txn.sortKey, state.txn.sortDir);
  }

  function filteredShipRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.ship.filters;
    const rows = buildShipSeed().filter((row) => {
      const chipOk = f.chip === "allActive"
        ? row.statusChip === "notCreated" || row.statusChip === "inProgress"
        : row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.shipmentId, row.shipmentId], [f.companyName, row.companyName], [f.shipmentState, row.shipmentState],
        [f.eta, row.eta], [f.vesselName, row.vesselName], [f.mot, row.mot], [f.mbl, row.mbl], [f.hbl, row.hbl],
        [f.countryExport, row.countryExport], [f.countryImport, row.countryImport]
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
    const notCreated = all.filter((r) => r.statusChip === "notCreated").length;
    const inProgress = all.filter((r) => r.statusChip === "inProgress").length;
    const completed = all.filter((r) => r.statusChip === "completed").length;
    return { allActive: notCreated + inProgress, notCreated, inProgress, completed };
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }
  function createSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.createSelectOpen }); }

  const CREATE_SUB_CUSTOMERS = [{ id: "sc-test", label: "TEST SUB CUSTOMER" }, { id: "sc-global", label: "GLOBAL SUB CUSTOMER" }];
  const CREATE_COMPANY_OPTIONS = [{ id: "TEST COMPANY 1", label: "TEST COMPANY 1" }, ...US_COMPANIES.map((c) => ({ id: c, label: c }))];
  const CREATE_ENTRY_TYPE_OPTIONS = ENTRY_TYPES.map((t) => ({ id: t, label: t }));
  const CREATE_MOT_OPTIONS = [{ id: "OCEAN", label: "OCEAN" }, { id: "AIR", label: "AIR" }, { id: "TRUCK", label: "TRUCK" }];
  const CREATE_COUNTRY_OPTIONS = [
    ...COUNTRIES.map((c) => ({ id: `${c.code} - ${c.name}`, label: `${c.code} - ${c.name}` })),
    { id: "US - United States of America", label: "US - United States of America" }
  ];

  function createField({ id, label, value, type = "text", required = false }) {
    return `<div class="kn-field">
      <label class="type-caption-sm type-weight-medium kn-form-label kn-field__label" for="${id}">${escapeHtml(label)}${required ? ` <span class="role-req kn-form-necessity" aria-hidden="true">*</span>` : ""}</label>
      <input class="kn-field__control type-body-sm" id="${id}" name="${id}" type="${type}" ${required ? "required" : ""} value="${escapeHtml(value)}" data-entry-create-field="${id.replace(/^kn-entry-create-/, "")}" />
    </div>`;
  }

  function createFormValid() {
    const f = state.createForm;
    return Boolean(f.subCustomer && f.company && f.entryType && f.countryOrigin && f.countryDestination && f.mot && f.mbl && f.departDate && f.arriveDate);
  }

  function openCreateModal() {
    state.createModalOpen = true;
    state.createSelectOpen = "";
    state.menuOpen = "";
    render();
  }

  function closeCreateModal() {
    state.createModalOpen = false;
    state.createSelectOpen = "";
    render();
  }

  function resetCreateForm() {
    state.createForm = {
      subCustomer: "",
      company: "",
      entryType: "",
      countryOrigin: "",
      countryDestination: "US - United States of America",
      mot: "",
      mbl: "",
      hbol: "",
      departDate: "",
      arriveDate: ""
    };
  }

  function createEntryFromPacket(files) {
    const now = new Date();
    const txnNum = 50 + Math.floor(Math.random() * 900);
    const newRow = qatEntryBase({
      id: `entry-upload-${Date.now()}`,
      transactionId: `KN-CDML-${txnNum}`,
      companyName: "ILLUMINATE USA LLC",
      entryNumber: `KH5-${pad(303900 + txnNum, 8)}`,
      username: "TANYA AGRAWAL",
      entrySummary: "IN PROGRESS",
      cargoRelease: "IN PROGRESS",
      statusChip: "recent",
      lastUpdated: formatDate(now),
      lastUpdatedSort: now.getTime()
    });
    seedCache = [newRow, ...buildSeed()];
    window.KNEntryFiling?.queueDocumentUpload?.(files);
    goto(`#transaction-us-entry/filing/${encodeURIComponent(newRow.id)}`);
    return newRow;
  }

  function submitCreateManual() {
    if (!createFormValid()) {
      toast("Fill all required fields before submitting.", "notice");
      return;
    }
    const f = state.createForm;
    const now = new Date();
    const txnNum = 47 + Math.floor(Math.random() * 900);
    const newRow = qatEntryBase({
      id: `entry-new-${Date.now()}`,
      transactionId: `KN-CDML-${txnNum}`,
      companyName: f.company,
      entryNumber: `KH5-${pad(303900 + txnNum, 8)}`,
      entryType: f.entryType,
      username: "TANYA AGRAWAL",
      entrySummary: "IN PROGRESS",
      cargoRelease: "IN PROGRESS",
      eta: f.arriveDate ? formatDate(new Date(f.arriveDate)) : formatDate(now),
      etaSort: f.arriveDate ? Date.parse(f.arriveDate) : now.getTime(),
      fspdDate: f.departDate ? formatDate(new Date(f.departDate)) : "",
      fspdSort: f.departDate ? Date.parse(f.departDate) : 0,
      vesselName: VESSELS_QAT[txnNum % VESSELS_QAT.length],
      mot: f.mot,
      mbl: f.mbl,
      hbl: f.hbol,
      countryExport: f.countryOrigin,
      countryImport: f.countryDestination,
      lastUpdated: formatDate(now),
      lastUpdatedSort: now.getTime(),
      statusChip: "active"
    });
    seedCache = [newRow, ...buildSeed()];
    closeCreateModal();
    resetCreateForm();
    state.txn.filters.chip = "all";
    state.txn.page = 1;
    toast(`Manual transaction ${newRow.transactionId} created.`, "positive");
    render();
  }

  function renderCreateManualModal() {
    const ux = window.KNAdminUX;
    if (!state.createModalOpen) return "";
    const f = state.createForm;
    const bodyHtml = `<div class="user-form-grid entry-create-form">
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-sub-label">Sub Customer <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-sub", name: "subCustomer", value: f.subCustomer, options: CREATE_SUB_CUSTOMERS, placeholder: "Select", labelledBy: "kn-entry-create-sub-label", openKey: "entry-create-sub", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-company-label">Company <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-company", name: "company", value: f.company, options: CREATE_COMPANY_OPTIONS, placeholder: "Select", labelledBy: "kn-entry-create-company-label", openKey: "entry-create-company", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-type-label">Entry Type <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-type", name: "entryType", value: f.entryType, options: CREATE_ENTRY_TYPE_OPTIONS, placeholder: "Select", labelledBy: "kn-entry-create-type-label", openKey: "entry-create-type", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-origin-label">Country of Origin <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-origin", name: "countryOrigin", value: f.countryOrigin, options: CREATE_COUNTRY_OPTIONS, placeholder: "Select", labelledBy: "kn-entry-create-origin-label", openKey: "entry-create-origin", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-dest-label">Country of Destination <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-dest", name: "countryDestination", value: f.countryDestination, options: CREATE_COUNTRY_OPTIONS, placeholder: "Select", labelledBy: "kn-entry-create-dest-label", openKey: "entry-create-dest", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      <div class="kn-field">
        <span class="type-caption-sm type-weight-medium kn-field__label" id="kn-entry-create-mot-label">Mode of Transport <span class="role-req" aria-hidden="true">*</span></span>
        ${createSelect({ id: "kn-entry-create-mot", name: "mot", value: f.mot, options: CREATE_MOT_OPTIONS, placeholder: "Select", labelledBy: "kn-entry-create-mot-label", openKey: "entry-create-mot", includeEmpty: true, emptyLabel: "Select" })}
      </div>
      ${createField({ id: "kn-entry-create-mbl", label: "Master Bill of Lading (MBOL)", value: f.mbl, required: true })}
      ${createField({ id: "kn-entry-create-hbol", label: "House Bill of Lading (HBOL)", value: f.hbol })}
      ${createField({ id: "kn-entry-create-depart", label: "Date of Departure", value: f.departDate, type: "date", required: true })}
      ${createField({ id: "kn-entry-create-arrive", label: "Date of Arrival", value: f.arriveDate, type: "date", required: true })}
    </div>`;
    const footerHtml = `<button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-create-submit ${createFormValid() ? "" : "disabled"}>Submit</button>`;
    return ux.modalShell({
      open: true,
      id: "kn-entry-create-modal",
      titleId: "kn-entry-create-title",
      title: "Create Manual Transaction",
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    });
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card kn-table-surface" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 5, extra: "entry-table" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 22, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-entry-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmEntryTxnRowActions({ id: row.id, label: row.transactionId })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-entry-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.entryType)}">${escapeHtml(row.entryType)}</td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td class="admin-table-nowrap">${statusBadge(row.entrySummary, summaryToneFor(row.entrySummary))}</td>
          <td class="admin-table-nowrap">${statusBadge(row.cargoRelease, summaryToneFor(row.cargoRelease))}</td>
          <td class="type-body-sm admin-table-nowrap">${pgaBadge(row.pgaStatus)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.firmsCode)}</span></td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.fspdDate))}</td>
          <td class="type-body-sm" title="${escapeHtml(row.vesselName)}">${escapeHtml(row.vesselName)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.filingDate))}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(ux.emptyDisplay(row.mbl))}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(ux.emptyDisplay(row.hbl))}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.portUnlading)}">${escapeHtml(row.portUnlading)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.lastUpdated)}</td>
        </tr>`).join("")
      : ux.tmTableEmptyRow({
          colspan: 22,
          title: "No Entry filings found matching your search",
          description: "Clear filters or switch status chips to see filings.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "active", label: "Active", count: counts.active, selected: chip === "active" },
        { id: "recent", label: "Recent", count: counts.recent, selected: chip === "recent" },
        { id: "reject", label: "Reject", count: counts.reject, selected: chip === "reject" },
        { id: "hold", label: "Hold", count: counts.hold, selected: chip === "hold" },
        { id: "complete", label: "Complete", count: counts.complete, selected: chip === "complete" }
      ],
      results: `Showing ${pageRows.length ? start + 1 : 0} to ${start + pageRows.length} of ${rows.length} records`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface entry-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 5, extra: "entry-table" })}" aria-label="US Entry transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-entry-sort")}
              ${sortHeader("companyName", "Company Name", "data-entry-sort")}
              ${sortHeader("entryNumber", "Entry Number", "data-entry-sort")}
              ${sortHeader("entryType", "Entry Type", "data-entry-sort")}
              ${sortHeader("username", "Underwriter", "data-entry-sort")}
              ${sortHeader("entrySummary", "Entry Summary", "data-entry-sort")}
              ${sortHeader("cargoRelease", "Cargo Release", "data-entry-sort")}
              ${sortHeader("pgaStatus", "PGA Status", "data-entry-sort")}
              ${sortHeader("firmsCode", "Firms Code", "data-entry-sort")}
              ${sortHeader("eta", "ETA", "data-entry-sort")}
              ${sortHeader("fspdDate", "RPFD Date", "data-entry-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier Name", "data-entry-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-entry-sort")}
              ${sortHeader("shipments", "Shipments", "data-entry-sort")}
              ${sortHeader("mot", "MOT", "data-entry-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PAPS", "data-entry-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-entry-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-entry-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-entry-sort")}
              ${sortHeader("portUnlading", "Port of Unlading", "data-entry-sort")}
              ${sortHeader("lastUpdated", "Last Updated Date", "data-entry-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-entry-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entryType", value: state.txn.filters.entryType, label: "entry type" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "username", value: state.txn.filters.username, label: "underwriter" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entrySummary", value: state.txn.filters.entrySummary, label: "entry summary" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "cargoRelease", value: state.txn.filters.cargoRelease, label: "cargo release" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "pgaStatus", value: state.txn.filters.pgaStatus, label: "PGA status" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "firmsCode", value: state.txn.filters.firmsCode, label: "firms code" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "eta", value: state.txn.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "fspdDate", value: state.txn.filters.fspdDate, label: "RPFD" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "vesselName", value: state.txn.filters.vesselName, label: "vessel" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments" })}
              ${ux.colKnSelect({ attr: "data-entry-filter", key: "mot", value: state.txn.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL/MAWB/PAPS" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "countryExport", value: state.txn.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "countryImport", value: state.txn.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "portUnlading", value: state.txn.filters.portUnlading, label: "port of unlading" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "lastUpdated", value: state.txn.filters.lastUpdated, label: "last updated" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-entry-page", label: "Entry transaction pages", sizeSelect: adminSelect({ id: "kn-entry-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card kn-table-surface" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-entry-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmEntryShipRowActions({ id: row.id, label: row.shipmentId })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-entry-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.vesselName)}">${escapeHtml(row.vesselName)}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
        </tr>`).join("")
      : ux.tmTableEmptyRow({
          colspan: 11,
          title: "No Entry shipments found matching your search",
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
      results: `Showing ${pageRows.length ? start + 1 : 0} to ${start + pageRows.length} of ${rows.length} records`
    })}
    <div class="vis-table-wrap role-table-card kn-table-surface">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "" })}" aria-label="US Entry shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("shipmentId", "Shipment ID", "data-entry-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-entry-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-entry-ship-sort")}
              ${sortHeader("eta", "ETA", "data-entry-ship-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier Name", "data-entry-ship-sort")}
              ${sortHeader("mot", "MOT", "data-entry-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-entry-ship-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-entry-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-entry-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-entry-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-entry-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "New", label: "New" }, { value: "In Progress", label: "In Progress" }, { value: "Completed", label: "Completed" }] })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "vesselName", value: state.ship.filters.vesselName, label: "vessel" })}
              ${ux.colKnSelect({ attr: "data-entry-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL/HAWB" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-entry-ship-page", label: "Entry shipment pages", sizeSelect: adminSelect({ id: "kn-entry-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function filingHelpers() {
    return { rerender: render, goto };
  }

  function render() {
    const page = document.getElementById("kn-entry-page");
    const root = document.getElementById("kn-entry-root");
    if (!page || !root || page.hidden) return;
    const filingId = filingRouteId();
    if (filingId) {
      const row = findTxnRow(filingId);
      if (!row) {
        toast("That entry filing is no longer available.", "notice");
        goto("#transaction-us-entry");
        return;
      }
      root.innerHTML = window.KNEntryFiling.render(row, {});
      window.KNEntryFiling.syncOverlay?.();
      window.KNEntryFiling.consumePendingUpload?.(row, filingHelpers());
      window.KNEntryFiling.syncQueueFromHash?.(row, filingHelpers());
      window.KNEntryFiling.syncStatementFromHash?.(row, filingHelpers());
      return;
    }
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Entry list view">
        <button class="kn-btn btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-entry-view="shipment">Shipment</button>
        <button class="kn-btn btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-entry-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta">
        <span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
        ${state.view === "transaction" && hasActiveTxnFilters() ? `<button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-reset-filters>Reset Filters</button>` : ""}
        <button class="btn btn--secondary btn--sm type-ui-sm kn-btn" type="button" data-entry-packet-upload-trigger><span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8M5.5 7 8 4.5 10.5 7"/><path d="M3 12.5h10"/></svg></span>Upload packet</button>
        <input class="visually-hidden" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.tif,.tiff" data-entry-packet-upload tabindex="-1" aria-hidden="true" />
        <button class="btn btn--secondary btn--sm type-ui-sm kn-btn" type="button" data-entry-create><span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></span>Create Manual Transaction</button>
      </div>
    </div>
    ${state.view === "transaction" ? renderTxnTable() : renderShipTable()}
    ${renderCreateManualModal()}`;
    window.KNAdminUX.restoreColFilterFocus(root, filterFocus);
    if (state.createModalOpen) window.KNAdminUX.syncOverlayFocus(root);
  }

  function hasActiveTxnFilters() {
    const f = state.txn.filters;
    if (f.chip !== "all") {
      return true;
    }
    return Object.keys(emptyTxnFilters()).some((key) => {
      if (key === "chip") {
        return false;
      }
      return String(f[key] || "").trim() !== "";
    });
  }

  function clearFilters() {
    if (state.view === "shipment") { state.ship.filters = emptyShipFilters(); state.ship.page = 1; }
    else { state.txn.filters = emptyTxnFilters(); state.txn.page = 1; }
    render();
  }

  function findTxnRow(id) { return buildSeed().find((r) => r.id === id); }
  function findShipRow(id) { return buildShipSeed().find((r) => r.id === id); }

  function goto(hash) {
    if (location.hash === hash) { render(); return; }
    location.hash = hash;
  }

  function filingRouteId() {
    const match = String(location.hash || "").match(/^#transaction-us-entry\/filing\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function bind(page) {
    page.addEventListener("change", (event) => {
      const filingId = filingRouteId();
      if (filingId) {
        const row = findTxnRow(filingId);
        if (row && window.KNEntryFiling.handleChange?.(event, row, filingHelpers())) {
          return;
        }
      }
      const packetInput = event.target.closest("[data-entry-packet-upload]");
      if (packetInput?.files?.length) {
        createEntryFromPacket(packetInput.files);
        packetInput.value = "";
        return;
      }
    });
    page.addEventListener("dragover", (event) => {
      if (event.target.closest(".entry-doc-upload__dropzone")) {
        event.preventDefault();
      }
    });
    page.addEventListener("drop", (event) => {
      const filingId = filingRouteId();
      const zone = event.target.closest(".entry-doc-upload__dropzone");
      if (!zone || !event.dataTransfer?.files?.length) {
        return;
      }
      event.preventDefault();
      if (filingId) {
        const row = findTxnRow(filingId);
        if (row) {
          window.KNEntryFiling.startDocumentUpload?.(event.dataTransfer.files, row, filingHelpers());
        }
        return;
      }
      createEntryFromPacket(event.dataTransfer.files);
    });
    page.addEventListener("focusin", (event) => {
      const filingId = filingRouteId();
      if (!filingId) {
        return;
      }
      const row = findTxnRow(filingId);
      if (row) {
        window.KNEntryFiling.handleFocus?.(event, row, filingHelpers());
      }
    }, true);
    page.addEventListener("focusout", (event) => {
      const filingId = filingRouteId();
      if (!filingId) {
        return;
      }
      const row = findTxnRow(filingId);
      if (row) {
        window.KNEntryFiling.handleBlur?.(event, row, filingHelpers());
      }
    }, true);
    page.addEventListener("submit", (event) => {
      const filingId = filingRouteId();
      if (!filingId) {
        return;
      }
      const row = findTxnRow(filingId);
      if (row && window.KNEntryFiling.handleSubmit?.(event, row, filingHelpers())) {
        event.preventDefault();
      }
    });
    page.addEventListener("click", (event) => {
      const filingId = filingRouteId();
      if (filingId) {
        const row = findTxnRow(filingId);
        if (row) {
          const handled = window.KNEntryFiling.handleClick(event, row, filingHelpers());
          if (handled) return;
        }
        return;
      }
      const viewBtn = event.target.closest("[data-entry-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-entry-view") || "transaction"; state.menuOpen = ""; state.selectOpen = ""; state.createSelectOpen = ""; render(); return; }
      if (event.target.closest("[data-entry-packet-upload-trigger]")) { event.preventDefault(); page.querySelector("[data-entry-packet-upload]")?.click(); return; }
      if (event.target.closest("[data-entry-create]")) { event.preventDefault(); openCreateModal(); return; }
      if (event.target.closest("[data-entry-reset-filters]")) { event.preventDefault(); clearFilters(); return; }
      if (event.target.closest("[data-admin-modal-dismiss]")) { event.preventDefault(); closeCreateModal(); return; }
      if (event.target.closest("[data-entry-create-submit]")) { event.preventDefault(); submitCreateManual(); return; }
      if (event.target.closest("[data-admin-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      const sort = event.target.closest("[data-entry-sort], [data-entry-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-entry-sort") || sort.getAttribute("data-entry-ship-sort");
        const view = sort.hasAttribute("data-entry-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else { view.sortKey = key; view.sortDir = "asc"; }
        view.page = 1; render(); return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        event.preventDefault();
        const view = state.view === "shipment" ? state.ship : state.txn;
        view.filters.chip = chip.getAttribute("data-admin-chip") || (state.view === "shipment" ? "allActive" : "all");
        view.page = 1; render(); return;
      }
      const pageBtn = event.target.closest("[data-entry-page], [data-entry-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-entry-page") || pageBtn.getAttribute("data-entry-ship-page"));
        const view = pageBtn.hasAttribute("data-entry-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) { view.page = next; state.menuOpen = ""; render(); }
        return;
      }
      if (window.KNAdminUX.handleMoreClick(event, { open: state.menuOpen, setOpen: (n) => { state.menuOpen = n; render(); } })) return;
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen, setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") { state.txn.pageSize = Number(value) || 100; state.txn.page = 1; render(); return; }
          if (key === "shipPageSize") { state.ship.pageSize = Number(value) || 100; state.ship.page = 1; render(); return; }
          const filters = state.view === "shipment" ? state.ship.filters : state.txn.filters;
          if (key in filters) { filters[key] = value; if (state.view === "shipment") state.ship.page = 1; else state.txn.page = 1; render(); }
        }
      })) return;
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.createSelectOpen, setOpen: (n) => { state.createSelectOpen = n; render(); },
        onChange: (key, value) => {
          const map = {
            "entry-create-sub": "subCustomer",
            "entry-create-company": "company",
            "entry-create-type": "entryType",
            "entry-create-origin": "countryOrigin",
            "entry-create-dest": "countryDestination",
            "entry-create-mot": "mot"
          };
          const field = map[key];
          if (field) { state.createForm[field] = value; render(); }
        }
      })) return;
      const changeStatus = event.target.closest("[data-entry-status]");
      if (changeStatus) {
        event.preventDefault();
        const row = findTxnRow(changeStatus.getAttribute("data-entry-status"));
        toast(`Change Status for ${row?.transactionId || "transaction"} opened in this sample.`, "notice");
        return;
      }
      const open = event.target.closest("[data-entry-open]");
      if (open) { event.preventDefault(); goto(`#transaction-us-entry/filing/${encodeURIComponent(open.getAttribute("data-entry-open"))}`); return; }
      const shipView = event.target.closest("[data-entry-ship-view]");
      if (shipView) {
        event.preventDefault();
        const row = findShipRow(shipView.getAttribute("data-entry-ship-view"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const shipInbox = event.target.closest("[data-entry-ship-inbox]");
      if (shipInbox) {
        event.preventDefault();
        const row = findShipRow(shipInbox.getAttribute("data-entry-ship-inbox"));
        toast(`${row?.shipmentId || "Shipment"} moved back to Inbox in this sample.`, "notice");
        return;
      }
      const shipOpen = event.target.closest("[data-entry-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-entry-ship-open")); if (row) { toast(`${row.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice"); } return; }
      const viewDo = event.target.closest("[data-entry-do], [data-entry-ship-do]");
      if (viewDo) {
        event.preventDefault();
        const isShip = viewDo.hasAttribute("data-entry-ship-do");
        const row = isShip ? findShipRow(viewDo.getAttribute("data-entry-ship-do")) : findTxnRow(viewDo.getAttribute("data-entry-do"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Delivery order for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
      const history = event.target.closest("[data-entry-history], [data-entry-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-entry-ship-history");
        if (!isShip) {
          const row = findTxnRow(history.getAttribute("data-entry-history"));
          if (row) goto(`#transaction-us-entry/filing/${encodeURIComponent(row.id)}`);
          return;
        }
        const row = findShipRow(history.getAttribute("data-entry-ship-history"));
        toast(`History for ${row?.shipmentId || "record"} is not available in this sample.`, "notice");
        return;
      }
      const doc = event.target.closest("[data-entry-document], [data-entry-ship-document]");
      if (doc) {
        event.preventDefault();
        const isShip = doc.hasAttribute("data-entry-ship-document");
        const row = isShip ? findShipRow(doc.getAttribute("data-entry-ship-document")) : findTxnRow(doc.getAttribute("data-entry-document"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Documents for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
    });
    page.addEventListener("input", (event) => {
      const filingId = filingRouteId();
      if (filingId) {
        const row = findTxnRow(filingId);
        if (row) window.KNEntryFiling.handleInput(event, row, filingHelpers());
        return;
      }
      const createField = event.target.closest("[data-entry-create-field]");
      if (createField) {
        const key = createField.getAttribute("data-entry-create-field");
        if (key && key in state.createForm) {
          state.createForm[key] = createField.value;
          render();
        }
        return;
      }
      const input = event.target.closest("[data-entry-filter], [data-entry-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-entry-ship-filter");
      const key = input.getAttribute(isShip ? "data-entry-ship-filter" : "data-entry-filter");
      const filters = isShip ? state.ship.filters : state.txn.filters;
      if (!key || !(key in filters)) return;
      filters[key] = input.value;
      if (isShip) state.ship.page = 1; else state.txn.page = 1;
      render();
    });
    page.addEventListener("mouseup", (event) => {
      const filingId = filingRouteId();
      if (!filingId) {
        return;
      }
      const row = findTxnRow(filingId);
      if (row) {
        window.KNEntryFiling.handleMouseUp?.(event, row, filingHelpers());
      }
    });
  }

  function stopAutorefresh() { if (refreshTimer != null) { window.clearInterval(refreshTimer); refreshTimer = null; } }
  function startAutorefresh() {
    stopAutorefresh();
    refreshTimer = window.setInterval(() => {
      const page = document.getElementById("kn-entry-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString(); state.menuOpen = ""; state.selectOpen = ""; render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; state.createSelectOpen = ""; state.createModalOpen = false; stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-entry-page");
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
    const page = document.getElementById("kn-entry-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true"; bind(page);
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen && !state.createSelectOpen)) return; state.selectOpen = ""; state.menuOpen = ""; state.createSelectOpen = ""; render(); });
    document.addEventListener("keydown", (event) => {
      if (page.hidden) return;
      const filingId = filingRouteId();
      if (filingId) {
        const row = findTxnRow(filingId);
        if (row) window.KNEntryFiling.handleKeydown(event, row, filingHelpers());
        return;
      }
      if (event.key !== "Escape") return;
      if (state.createModalOpen) { closeCreateModal(); return; }
      if (state.selectOpen || state.menuOpen || state.createSelectOpen) { state.selectOpen = ""; state.menuOpen = ""; state.createSelectOpen = ""; render(); }
    });
  }

  window.KNUsEntry = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); }, listShipments() { return buildShipSeed(); } };
})();
