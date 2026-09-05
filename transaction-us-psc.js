(() => {
  const ROUTE = "#transaction-us-psc";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setSeconds(d.getSeconds() - 16); return d.toISOString(); })();
  let refreshTimer = null;

  const TXN_SEED_TOTAL = 118;

  const PSC_COMPANIES = ["CREDITS YES NO 1", "TEST COMPANY 1", "GLOBAL ORGANICS LTD", "FORD TESTING 9.2", "ILLUMINATE USA LLC"];
  const PSC_USERS = ["SURAJ SHINDE", "TEST BROKER STEVE", "US THIRD PARTY", "ABHISHEK PAL SINGH", "KAMAL SINGH"];
  const PSC_STATUSES = ["NONE", "READY", "RESPONSE", "ACCEPTED", "FILED", "ACCEPTED WITH WARNINGS", "IN PROCESS"];

  const US_COMPANIES = ["US COMPANY 1", "US COMPANY 2", "US COMPANY 3", "FORD TESTING 9.2", "TEST COMPANY 05/21"];
  const COMPANIES = [
    ...US_COMPANIES,
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS"
  ];
  const USERS = ["US THIRD PARTY", "ABHISHEK PAL SINGH", "KAMAL SINGH", "MARIA LOPEZ", "PRIYA SHARMA", "JAMES CHEN", "ANITA DESAI", "DAVID PARK", "SOPHIE MARTIN", ""];
  const COUNTRIES = [
    { code: "MY", name: "Malaysia" }, { code: "CN", name: "China" }, { code: "VN", name: "Vietnam" },
    { code: "DE", name: "Germany" }, { code: "JP", name: "Japan" }, { code: "KR", name: "Korea, Republic of" },
    { code: "CA", name: "Canada" }, { code: "MX", name: "Mexico" }, { code: "IN", name: "India" }, { code: "TW", name: "Taiwan" }
  ];
  const ID_MID = ["909M", "0177", "0178", "0179", "0180", "0181", "071Y", "07HC", "07BI", "08KA", "MG21"];
  const SHIP_NOT_CREATED_COUNT = 7;
  const SHIP_IN_PROGRESS_COUNT = 1;
  const SHIP_COMPLETED_COUNT = 0;
  const SHIP_COMPANIES = ["ILLUMINATE USA, LLC", "SLB-CAMERON QC", "FORD TESTING 9.2", "TEST COMPANY 05/21", "US COMPANY 1"];
  const SHIP_VESSELS = ["GASCHEM HUNTE", "WAN HAI 512", "EVER ELITE", "CMA CGM S. WASHINGTON"];

  /** Entry rows for PSC ↔ Entry joins when KNUsEntry has not booted. */
  const ENTRY_LINK_FALLBACK = [
    { id: "entry-1", transactionId: "KN-0177-216", entryNumber: "217-01302376", companyName: "US COMPANY 3", shipments: "NA", mbl: "", hbl: "" },
    { id: "entry-2", transactionId: "KN-0177-6", entryNumber: "217-01308333", companyName: "US COMPANY 1", shipments: "KR-0177-18", mbl: "33000628620", hbl: "8650121248" },
    { id: "entry-4", transactionId: "KN-0178-1", entryNumber: "217-01302401", companyName: "GLOBAL-PAK", shipments: "KR-OB0T-283", mbl: "CMDUHB0204786", hbl: "EGET20427328", isfLinkId: "isf-1", isfTransactionId: "ISF-021D-8", inbLinkId: "inb-2", inbTransactionId: "INB-021D-8" },
    { id: "entry-5", transactionId: "KN-0178-2", entryNumber: "217-01302402", companyName: "ILLUMINATE USA LLC", shipments: "VN-OB1K-441", mbl: "ONEYSGNFL9591500", hbl: "MCLMVSSAV2507004", isfLinkId: "isf-2", isfTransactionId: "ISF-021D-9" },
    { id: "entry-6", transactionId: "KN-0180-3", entryNumber: "217-01302403", companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC", shipments: "CN-OB3M-118", mbl: "EGLV1975001234", hbl: "SHAA240518047", isfLinkId: "isf-3", isfTransactionId: "ISF-021D-5", inbLinkId: "inb-3", inbTransactionId: "INB-021D-5" },
    { id: "entry-7", transactionId: "KN-0180-4", entryNumber: "217-01302404", companyName: "PACIFIC RIM TRADING CO", shipments: "TW-OB2F-512", mbl: "MEDUHB0284764", hbl: "TPEB240512901", isfLinkId: "isf-4", isfTransactionId: "ISF-021D-4" },
    { id: "entry-8", transactionId: "KN-0181-5", entryNumber: "217-01302405", companyName: "NORTHSTAR LOGISTICS INC", shipments: "IN-OB7R-902", mbl: "MAEU9876543210", hbl: "BLR2405041182", isfLinkId: "isf-5", isfTransactionId: "ISF-021D-6" }
  ];

  const ISF_LINK_FALLBACK = [
    { id: "isf-1", transactionId: "ISF-021D-8", mbl: "CMDUHB0204786", hbl: "EGET20427328", shipments: "KR-OB0T-283" },
    { id: "isf-2", transactionId: "ISF-021D-9", mbl: "ONEYSGNFL9591500", hbl: "MCLMVSSAV2507004", shipments: "VN-OB1K-441" },
    { id: "isf-3", transactionId: "ISF-021D-5", mbl: "EGLV1975001234", hbl: "SHAA240518047", shipments: "CN-OB3M-118" }
  ];

  const emptyTxnFilters = () => ({ chip: "all", transactionId: "", pscTransactionId: "", companyName: "", pscType: "", entryNumber: "", username: "", shipments: "", pscStatus: "", filingDate: "" });
  const emptyShipFilters = () => ({ chip: "allActive", shipmentId: "", companyName: "", shipmentState: "", eta: "", vesselName: "", mot: "", mbl: "", hbl: "", countryExport: "", countryImport: "" });

  const state = {
    view: "shipment",
    menuOpen: "",
    selectOpen: "",
    booting: false,
    ready: false,
    expandedPsc: {},
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 100, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function pad(n, w) { return String(n).padStart(w, "0"); }
  function formatDate(date) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date); }
  function toast(content, color = "positive") { if (typeof window.showKnToast === "function") window.showKnToast({ content, color }); }

  function parseSortDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function entryPeers() {
    try {
      const live = window.KNUsEntry?.list?.();
      if (live?.length) return live;
    } catch (_) { /* not loaded */ }
    return ENTRY_LINK_FALLBACK;
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
    return [];
  }

  function findEntryByNumber(entryNumber) {
    return entryPeers().find((row) => row.entryNumber === entryNumber) || null;
  }

  function findIsfByMbl(mbl) {
    if (!mbl) return null;
    return isfPeers().find((row) => row.mbl === mbl) || null;
  }

  function findInbByMbl(mbl) {
    if (!mbl) return null;
    return inbPeers().find((row) => row.mbl === mbl) || null;
  }

  function pscFromEntry(entry, i, overrides = {}) {
    const txnId = overrides.transactionId || entry.transactionId || `KN-${ID_MID[i % ID_MID.length]}-${2 + (i % 90)}`;
    const pscSuffix = overrides.pscTransactionIds || [`KN-0127-${53 + (i % 40)}-1`];
    const isf = entry.isfLinkId ? isfPeers().find((r) => r.id === entry.isfLinkId) : findIsfByMbl(entry.mbl);
    const inb = entry.inbLinkId ? inbPeers().find((r) => r.id === entry.inbLinkId) : findInbByMbl(entry.mbl);
    const filing = overrides.filingDate ?? (entry.filingDate || "");
    return {
      id: overrides.id || `psc-${i + 1}`,
      transactionId: txnId,
      pscTransactionIds: pscSuffix,
      companyName: overrides.companyName || entry.companyName,
      pscType: overrides.pscType || (i % 9 === 0 ? "Standalone PSC" : "PSC"),
      entryNumber: overrides.entryNumber || entry.entryNumber,
      username: overrides.username || entry.username || "US THIRD PARTY",
      shipments: overrides.shipments || entry.shipments || "NA",
      pscStatus: overrides.pscStatus || (entry.entrySummary === "ACCEPTED" ? "ACCEPTED" : "IN PROCESS"),
      filingDate: filing,
      filingSort: filing ? parseSortDate(filing) : 0,
      mbl: entry.mbl || "",
      hbl: entry.hbl || "",
      entryLinkId: entry.id,
      entryTransactionId: entry.transactionId,
      isfLinkId: isf?.id || entry.isfLinkId || "",
      isfTransactionId: isf?.transactionId || entry.isfTransactionId || "",
      inbLinkId: inb?.id || entry.inbLinkId || "",
      inbTransactionId: inb?.transactionId || entry.inbTransactionId || ""
    };
  }

  function qatPscBase(overrides = {}) {
    return {
      transactionId: "KN-OGW-24",
      pscTransactionIds: ["KN-DGWI-93-1"],
      companyName: "TEST COMPANY 1",
      pscType: "PSC",
      entryNumber: "10030871",
      username: "SURAJ SHINDE",
      shipments: "KN-OGW-10",
      pscStatus: "NONE",
      filingDate: "",
      filingSort: 0,
      mbl: "",
      hbl: "",
      entryLinkId: "",
      entryTransactionId: "",
      isfLinkId: "",
      isfTransactionId: "",
      inbLinkId: "",
      inbTransactionId: "",
      ...overrides
    };
  }

  function curatedPscRows() {
    return [
      qatPscBase({
        id: "psc-1",
        transactionId: "KN-OGW-24",
        pscTransactionIds: ["KN-DGWI-93-1", "KN-DGWI-93-2"],
        companyName: "CREDITS YES NO 1",
        pscType: "Standalone PSC",
        entryNumber: "10030871",
        username: "SURAJ SHINDE",
        shipments: "KN-OGW-10",
        pscStatus: "NONE"
      }),
      qatPscBase({
        id: "psc-2",
        transactionId: "KN-OGW-25",
        pscTransactionIds: ["KN-DGWI-94-1"],
        companyName: "TEST COMPANY 1",
        entryNumber: "CW-45148785",
        username: "TEST BROKER STEVE",
        shipments: "NA",
        pscStatus: "READY",
        filingDate: "Aug 20, 2021",
        filingSort: parseSortDate("Aug 20, 2021")
      }),
      qatPscBase({
        id: "psc-3",
        transactionId: "KN-OGW-26",
        pscTransactionIds: ["KN-DGWI-95-1"],
        companyName: "GLOBAL ORGANICS LTD",
        pscType: "Standalone PSC",
        entryNumber: "10030872",
        username: "SURAJ SHINDE",
        shipments: "KN-OGW-11",
        pscStatus: "RESPONSE",
        filingDate: "Oct 27, 2021",
        filingSort: parseSortDate("Oct 27, 2021")
      }),
      qatPscBase({
        id: "psc-4",
        transactionId: "KN-OGW-27",
        pscTransactionIds: ["KN-DGWI-96-1"],
        companyName: "TEST COMPANY 1",
        pscStatus: "ACCEPTED",
        filingDate: "Sep 14, 2021",
        filingSort: parseSortDate("Sep 14, 2021")
      }),
      qatPscBase({
        id: "psc-5",
        transactionId: "KN-OGW-28",
        pscTransactionIds: ["KN-DGWI-97-1"],
        companyName: "GLOBAL ORGANICS LTD",
        pscStatus: "FILED",
        filingDate: "Nov 03, 2021",
        filingSort: parseSortDate("Nov 03, 2021")
      }),
      qatPscBase({
        id: "psc-6",
        transactionId: "KN-OGW-29",
        pscTransactionIds: ["KN-DGWI-98-1"],
        companyName: "CREDITS YES NO 1",
        pscType: "Standalone PSC",
        username: "TEST BROKER STEVE",
        pscStatus: "ACCEPTED WITH WARNINGS",
        filingDate: "Dec 08, 2021",
        filingSort: parseSortDate("Dec 08, 2021")
      })
    ];
  }

  function generatedPscRow(i) {
    const filing = i % 3 === 0 ? null : new Date(Date.UTC(2021, 7 + (i % 4), 1 + (i % 27)));
    const txnNum = 30 + (i % 900);
    const pscNum = 99 + (i % 900);
    return qatPscBase({
      id: `psc-${i + 1}`,
      transactionId: `KN-OGW-${txnNum}`,
      pscTransactionIds: i % 8 === 0 ? [`KN-DGWI-${pscNum}-1`, `KN-DGWI-${pscNum}-2`] : [`KN-DGWI-${pscNum}-1`],
      companyName: i % 5 === 0 ? PSC_COMPANIES[i % PSC_COMPANIES.length] : "TEST COMPANY 1",
      pscType: i % 4 === 0 ? "Standalone PSC" : "PSC",
      entryNumber: i % 2 === 0 ? String(10030871 + i) : `CW-${pad(45148785 + i, 8)}`,
      username: PSC_USERS[i % PSC_USERS.length],
      shipments: i % 6 === 0 ? "NA" : `KN-OGW-${10 + (i % 90)}`,
      pscStatus: PSC_STATUSES[i % PSC_STATUSES.length],
      filingDate: filing ? formatDate(filing) : "",
      filingSort: filing ? filing.getTime() : 0
    });
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = curatedPscRows();
    for (let i = rows.length; i < TXN_SEED_TOTAL; i += 1) {
      rows.push(generatedPscRow(i));
    }
    seedCache = rows;
    return rows;
  }

  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function pscTypeBadge(label) {
    const tone = /standalone/i.test(label) ? "information" : "notice";
    return statusBadge(label, tone);
  }

  function pscStatusBadge(label) {
    const text = String(label || "");
    if (/accepted with warnings/i.test(text)) return statusBadge(label, "positive");
    if (/^accepted$|^filed$/i.test(text)) return statusBadge(label, "positive");
    if (/in process|response/i.test(text)) return statusBadge(label, "notice");
    if (/^ready$|^sent$/i.test(text)) return statusBadge(label, "information");
    if (/none/i.test(text)) return statusBadge(label, "neutral");
    return statusBadge(label, "information");
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
    const eta = overrides.eta || "Oct 17, 2023";
    const etaSort = overrides.etaSort ?? parseSortDate(eta);
    return {
      companyName: "ILLUMINATE USA, LLC",
      shipmentState: "New",
      statusChip: "notCreated",
      stateTone: "information",
      eta,
      etaSort,
      vesselName: "GASCHEM HUNTE",
      mot: "OCEAN",
      mbl: "HDE7253422",
      hbl: "8650121248",
      countryExport: "US - United States of America",
      countryImport: "US - United States of America",
      ...overrides
    };
  }

  function curatedShipRows() {
    return [
      qatShipBase({
        id: "psc-ship-1",
        shipmentId: "KN-MG21-137",
        companyName: "ILLUMINATE USA, LLC",
        shipmentState: "In Progress",
        statusChip: "inProgress",
        stateTone: "notice",
        eta: "Oct 17, 2023",
        etaSort: parseSortDate("Oct 17, 2023"),
        vesselName: "GASCHEM HUNTE",
        mot: "OCEAN",
        mbl: "HDE7253422",
        hbl: "8650121248"
      }),
      qatShipBase({
        id: "psc-ship-2",
        shipmentId: "KN-MG21-138",
        companyName: "SLB-CAMERON QC",
        eta: "Oct 18, 2023",
        etaSort: parseSortDate("Oct 18, 2023"),
        mot: "AIR",
        mbl: "HDE7253423",
        hbl: "8650121250",
        countryExport: "CN - China"
      }),
      qatShipBase({
        id: "psc-ship-3",
        shipmentId: "KN-MG21-139",
        companyName: "ILLUMINATE USA, LLC",
        eta: "Nov 02, 2023",
        etaSort: parseSortDate("Nov 02, 2023"),
        vesselName: "WAN HAI 512",
        mbl: "HDE7253424"
      })
    ];
  }

  function generatedShipRow(i, statusChip, shipmentState, stateTone) {
    const eta = new Date(Date.UTC(2023, 9 + (i % 3), 1 + (i % 27)));
    const company = i % 4 === 0 ? SHIP_COMPANIES[i % SHIP_COMPANIES.length] : "ILLUMINATE USA, LLC";
    return qatShipBase({
      id: `psc-ship-${i + 1}`,
      shipmentId: `KN-MG21-${137 + (i % 900)}`,
      companyName: company,
      shipmentState,
      statusChip,
      stateTone,
      eta: formatDate(eta),
      etaSort: eta.getTime(),
      vesselName: SHIP_VESSELS[i % SHIP_VESSELS.length],
      mot: i % 3 === 0 ? "AIR" : "OCEAN",
      mbl: `HDE${pad(7253422 + i, 7)}`,
      hbl: i % 5 === 0 ? "" : String(8650121248 + i * 13),
      countryExport: i % 2 === 0 ? "US - United States of America" : `${COUNTRIES[i % COUNTRIES.length].code} - ${COUNTRIES[i % COUNTRIES.length].name}`
    });
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av; let bv;
      if (sortKey === "filingDate") { av = a.filingSort || 0; bv = b.filingSort || 0; }
      else if (sortKey === "eta") { av = a.etaSort || 0; bv = b.etaSort || 0; }
      else if (sortKey === "pscTransactionId") { av = (a.pscTransactionIds || []).join(" ").toLowerCase(); bv = (b.pscTransactionIds || []).join(" ").toLowerCase(); }
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
      const chipOk =
        f.chip === "all" ||
        (f.chip === "none" && row.pscStatus === "NONE") ||
        (f.chip === "inProcess" && (row.pscStatus === "IN PROCESS" || row.pscStatus === "RESPONSE")) ||
        (f.chip === "accepted" && (/^ACCEPTED$/i.test(row.pscStatus) || row.pscStatus === "ACCEPTED WITH WARNINGS" || row.pscStatus === "FILED")) ||
        (f.chip === "ready" && (row.pscStatus === "READY" || row.pscStatus === "SENT"));
      if (!chipOk) return false;
      const pscHay = (row.pscTransactionIds || []).join(" ");
      return [
        [f.transactionId, row.transactionId],
        [f.pscTransactionId, pscHay],
        [f.companyName, row.companyName],
        [f.pscType, row.pscType],
        [f.entryNumber, row.entryNumber],
        [f.username, row.username],
        [f.shipments, row.shipments],
        [f.pscStatus, row.pscStatus],
        [f.filingDate, row.filingDate]
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
        [f.shipmentId, row.shipmentId],
        [f.companyName, row.companyName],
        [f.shipmentState, row.shipmentState],
        [f.eta, row.eta],
        [f.vesselName, row.vesselName],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.countryExport, row.countryExport],
        [f.countryImport, row.countryImport]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.ship.sortKey, state.ship.sortDir);
  }

  function sortHeader(key, label, attr) {
    const view = state.view === "shipment" ? state.ship : state.txn;
    return window.KNAdminUX.sortHeader({ key, label, sortKey: view.sortKey, sortDir: view.sortDir, attr });
  }

  function shipChipCounts() {
    const all = buildShipSeed();
    const notCreated = all.filter((r) => r.statusChip === "notCreated").length;
    const inProgress = all.filter((r) => r.statusChip === "inProgress").length;
    const completed = all.filter((r) => r.statusChip === "completed").length;
    return { allActive: notCreated + inProgress, notCreated, inProgress, completed };
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      none: all.filter((r) => r.pscStatus === "NONE").length,
      inProcess: all.filter((r) => r.pscStatus === "IN PROCESS" || r.pscStatus === "RESPONSE").length,
      accepted: all.filter((r) => /^ACCEPTED$/i.test(r.pscStatus) || r.pscStatus === "ACCEPTED WITH WARNINGS" || r.pscStatus === "FILED").length,
      ready: all.filter((r) => r.pscStatus === "READY" || r.pscStatus === "SENT").length
    };
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function pscIdCell(row) {
    const ids = row.pscTransactionIds || [];
    if (!ids.length) return window.KNAdminUX.ellipsisCell("");
    const expanded = !!state.expandedPsc[row.id];
    const shown = expanded ? ids : ids.slice(0, 1);
    const joined = shown.join(" · ");
    const more = !expanded && ids.length > 1
      ? ` <button class="kn-link type-caption-sm" type="button" data-psc-more="${escapeHtml(row.id)}">more...</button>`
      : (expanded && ids.length > 1 ? ` <button class="kn-link type-caption-sm" type="button" data-psc-more="${escapeHtml(row.id)}">less</button>` : "");
    return `<span class="type-body-sm tm-ellipsis" title="${escapeHtml(ids.join(" · "))}">${escapeHtml(joined)}</span>${more}`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ actionCount: 5, extra: "psc-table" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-psc-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmEntryTxnRowActions({ id: row.id, label: row.transactionId, prefix: "psc" })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-psc-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm">${pscIdCell(row)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${pscTypeBadge(row.pscType)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.entryNumber)}">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.shipments)}">${escapeHtml(row.shipments)}</span></td>
          <td class="admin-table-nowrap">${pscStatusBadge(row.pscStatus)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.filingDate))}</td>
        </tr>`).join("")
      : ux.tmTableEmptyRow({
          colspan: 10,
          title: "No PSC filings found matching your search",
          description: "Clear filters or switch status chips to see filings.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "none", label: "None", count: counts.none, selected: chip === "none" },
        { id: "inProcess", label: "In Process", count: counts.inProcess, selected: chip === "inProcess" },
        { id: "accepted", label: "Accepted", count: counts.accepted, selected: chip === "accepted" },
        { id: "ready", label: "Ready", count: counts.ready, selected: chip === "ready" }
      ],
      results: `Showing ${pageRows.length ? start + 1 : 0} to ${start + pageRows.length} of ${rows.length} records`
    })}
    <div class="vis-table-wrap role-table-card psc-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 5, extra: "psc-table" })}" aria-label="US PSC transactions">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("transactionId", "Transaction ID", "data-psc-sort")}
              ${sortHeader("pscTransactionId", "PSC Transaction ID", "data-psc-sort")}
              ${sortHeader("companyName", "Company Name", "data-psc-sort")}
              ${sortHeader("pscType", "PSC Type", "data-psc-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-psc-sort")}
              ${sortHeader("username", "Username", "data-psc-sort")}
              ${sortHeader("shipments", "Shipment ID", "data-psc-sort")}
              ${sortHeader("pscStatus", "PSC Status", "data-psc-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-psc-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-psc-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "pscTransactionId", value: state.txn.filters.pscTransactionId, label: "PSC transaction ID" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-psc-filter", key: "pscType", value: state.txn.filters.pscType, label: "PSC type", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "Standalone PSC", label: "Standalone PSC" }, { value: "PSC", label: "PSC" }] })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "username", value: state.txn.filters.username, label: "username" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipment ID" })}
              ${ux.colKnSelect({ attr: "data-psc-filter", key: "pscStatus", value: state.txn.filters.pscStatus, label: "PSC status", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "NONE", label: "NONE" }, { value: "READY", label: "READY" }, { value: "RESPONSE", label: "RESPONSE" }, { value: "IN PROCESS", label: "IN PROCESS" }, { value: "ACCEPTED", label: "ACCEPTED" }, { value: "ACCEPTED WITH WARNINGS", label: "ACCEPTED WITH WARNINGS" }, { value: "FILED", label: "FILED" }, { value: "SENT", label: "SENT" }] })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-psc-page", label: "PSC transaction pages", sizeSelect: adminSelect({ id: "kn-psc-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 11, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-psc-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td>${ux.tmPscShipRowActions({ id: row.id, label: row.shipmentId })}</td>
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-psc-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
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
          title: "No PSC shipments found matching your search",
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
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ stickyCompany: true, actionCount: 3, extra: "" })}" aria-label="US PSC shipments">
          <thead>
            <tr class="vis-table__labels">
              ${ux.actionsColHeader()}
              ${sortHeader("shipmentId", "Shipment ID", "data-psc-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-psc-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-psc-ship-sort")}
              ${sortHeader("eta", "ETA", "data-psc-ship-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier Name", "data-psc-ship-sort")}
              ${sortHeader("mot", "MOT", "data-psc-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-psc-ship-sort")}
              ${sortHeader("hbl", "HBL/AWB", "data-psc-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-psc-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-psc-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.emptyColFilter()}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-psc-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "New", label: "New" }, { value: "In Progress", label: "In Progress" }, { value: "Completed", label: "Completed" }] })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "vesselName", value: state.ship.filters.vesselName, label: "vessel" })}
              ${ux.colKnSelect({ attr: "data-psc-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "AIR", label: "AIR" }, { value: "OCEAN", label: "OCEAN" }] })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL/AWB" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-psc-ship-page", label: "PSC shipment pages", sizeSelect: adminSelect({ id: "kn-psc-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-psc-page");
    const root = document.getElementById("kn-psc-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="PSC list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-psc-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-psc-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta"><span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span></div>
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
      const viewBtn = event.target.closest("[data-psc-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-psc-view") || "transaction"; state.menuOpen = ""; state.selectOpen = ""; render(); return; }
      const morePsc = event.target.closest("[data-psc-more]");
      if (morePsc) { event.preventDefault(); const id = morePsc.getAttribute("data-psc-more"); state.expandedPsc[id] = !state.expandedPsc[id]; render(); return; }
      if (event.target.closest("[data-admin-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      const sort = event.target.closest("[data-psc-sort], [data-psc-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-psc-sort") || sort.getAttribute("data-psc-ship-sort");
        const view = sort.hasAttribute("data-psc-ship-sort") ? state.ship : state.txn;
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
      const pageBtn = event.target.closest("[data-psc-page], [data-psc-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-psc-page") || pageBtn.getAttribute("data-psc-ship-page"));
        const view = pageBtn.hasAttribute("data-psc-ship-page") ? state.ship : state.txn;
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
      const changeStatus = event.target.closest("[data-psc-status]");
      if (changeStatus) {
        event.preventDefault();
        const row = findTxnRow(changeStatus.getAttribute("data-psc-status"));
        toast(`Change Status for ${row?.transactionId || "transaction"} opened in this sample.`, "notice");
        return;
      }
      const open = event.target.closest("[data-psc-open]");
      if (open) { event.preventDefault(); const row = findTxnRow(open.getAttribute("data-psc-open")); if (row) { location.hash = `#transaction-us-psc/history/${encodeURIComponent(row.id)}`; } return; }
      const shipView = event.target.closest("[data-psc-ship-view]");
      if (shipView) {
        event.preventDefault();
        const row = findShipRow(shipView.getAttribute("data-psc-ship-view"));
        toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice");
        return;
      }
      const shipCreate = event.target.closest("[data-psc-ship-create]");
      if (shipCreate) {
        event.preventDefault();
        const row = findShipRow(shipCreate.getAttribute("data-psc-ship-create"));
        toast(`Create Transaction for ${row?.shipmentId || "shipment"} opened in this sample.`, "notice");
        return;
      }
      const shipOpen = event.target.closest("[data-psc-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-psc-ship-open")); if (row) { toast(`${row.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice"); } return; }
      const viewDo = event.target.closest("[data-psc-do], [data-psc-ship-do]");
      if (viewDo) {
        event.preventDefault();
        const isShip = viewDo.hasAttribute("data-psc-ship-do");
        const row = isShip ? findShipRow(viewDo.getAttribute("data-psc-ship-do")) : findTxnRow(viewDo.getAttribute("data-psc-do"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Delivery order for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
      const history = event.target.closest("[data-psc-history], [data-psc-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-psc-ship-history");
        if (!isShip) {
          const row = findTxnRow(history.getAttribute("data-psc-history"));
          if (row) location.hash = `#transaction-us-psc/history/${encodeURIComponent(row.id)}`;
          return;
        }
        const row = findShipRow(history.getAttribute("data-psc-ship-history"));
        toast(`History for ${row?.shipmentId || "record"} is not available in this sample.`, "notice");
        return;
      }
      const doc = event.target.closest("[data-psc-document], [data-psc-ship-document]");
      if (doc) {
        event.preventDefault();
        const isShip = doc.hasAttribute("data-psc-ship-document");
        const row = isShip ? findShipRow(doc.getAttribute("data-psc-ship-document")) : findTxnRow(doc.getAttribute("data-psc-document"));
        const label = isShip ? row?.shipmentId : row?.transactionId;
        toast(`Documents for ${label || "record"} opened in this sample.`, "notice");
        return;
      }
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-psc-filter], [data-psc-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-psc-ship-filter");
      const key = input.getAttribute(isShip ? "data-psc-ship-filter" : "data-psc-filter");
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
      const page = document.getElementById("kn-psc-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString(); state.menuOpen = ""; state.selectOpen = ""; render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-psc-page");
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
    const page = document.getElementById("kn-psc-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true"; bind(page);
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen)) return; state.selectOpen = ""; state.menuOpen = ""; render(); });
    document.addEventListener("keydown", (event) => { if (page.hidden || event.key !== "Escape") return; if (state.selectOpen || state.menuOpen) { state.selectOpen = ""; state.menuOpen = ""; render(); } });
  }

  window.KNUsPsc = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); }, listShipments() { return buildShipSeed(); } };
})();
