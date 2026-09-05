(() => {
  const ROUTE = "#transaction-us-delivery-order";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - 1); return d.toISOString(); })();
  let refreshTimer = null;

  const SHIP_SEED_TOTAL = 99;
  const TXN_SEED_TOTAL = 337;
  const DO_SHIP_COMPANIES = ["TEST US COMPANY 4", "ENGINE-KN-SHIP-NEILMA-JISWAL032", "SAFRAN CABIN CANADA CO", "ICHOR SYSTEMS INC", "GLOBAL-PAK"];
  const DO_TXN_COMPANIES = ["PSPD TESTING 9.3", "US COMPANY 1", "TEST US COMPANY 4", "ENGINE-KN-SHIP-NEILMA-JISWAL032", "SAFRAN CABIN CANADA CO", "ICHOR SYSTEMS INC", "GLOBAL-PAK", "ILLUMINATE USA LLC"];
  const DO_SHIP_STATES = [
    { chip: "new", label: "NEW", tone: "information" },
    { chip: "inProgress", label: "IN PROGRESS", tone: "notice" },
    { chip: "docGenerated", label: "DOC GENERATED", tone: "information" },
    { chip: "doPublished", label: "DO PUBLISHED", tone: "positive" }
  ];
  const OCEAN_CARRIERS = ["CHICAGO EXPRESS", "EVER ELITE", "MAERSK SEALAND", "COSCO SHIPPING", "CMA CGM"];
  const AIR_CARRIERS = ["CX", "FEDEX, FX", "CATHAY PACIFIC AIRWAYS LTD., CX", "DHL AIR LIMITED, DO", "UNITED PARCEL SERVICE"];
  const ID_MID = ["608M", "01TU", "058Y", "07BI", "07HA", "07KC", "08LM", "09NP", "0AQR", "0BST", "0CUV", "0DWX"];

  const emptyTxnFilters = () => ({ chip: "all", transactionId: "", entryNumber: "", companyName: "", shipments: "", mot: "", mbl: "", hbl: "", carrier: "" });
  const emptyShipFilters = () => ({ chip: "all", shipmentId: "", companyName: "", shipmentState: "", mbol: "", hbol: "", mot: "" });

  const state = {
    view: "shipment",
    menuOpen: "",
    selectOpen: "",
    booting: false,
    ready: false,
    expandedMore: "",
    txn: { page: 1, pageSize: 100, sortKey: "transactionId", sortDir: "asc", filters: emptyTxnFilters() },
    ship: { page: 1, pageSize: 100, sortKey: "shipmentId", sortDir: "asc", filters: emptyShipFilters() }
  };

  let seedCache = null;
  let shipSeedCache = null;

  function escapeHtml(v) { return window.KNAdminUX.escapeHtml(v); }
  function pad(n, w) { return String(n).padStart(w, "0"); }
  function toast(content, color = "positive") { if (typeof window.showKnToast === "function") window.showKnToast({ content, color }); }

  function chipForIndex(i) {
    const r = i % 11;
    if (r === 0) return "reject";
    if (r === 1) return "hold";
    if (r === 2) return "complete";
    if (r <= 5) return "recent";
    return "active";
  }

  function qatDoTxnBase(overrides = {}) {
    const mot = overrides.mot || "OCEAN";
    const isAir = mot === "AIR";
    return {
      companyName: "PSPD TESTING 9.3",
      shipments: "KX-608M-12",
      mot,
      mbl: isAir ? "18012345678" : "KAJAB123414",
      hbl: isAir ? "7845123456" : "H8650121248",
      carrier: isAir ? "CX" : "CHICAGO EXPRESS",
      statusChip: "recent",
      ...overrides
    };
  }

  function curatedTxnRows() {
    return [
      qatDoTxnBase({
        id: "do-txn-1",
        transactionId: "KN-608M-1",
        entryNumber: "217-01000788",
        companyName: "PSPD TESTING 9.3",
        shipments: "KX-608M-12",
        mot: "OCEAN",
        mbl: "KAJAB123414",
        hbl: "H8650121248",
        carrier: "CHICAGO EXPRESS",
        statusChip: "recent"
      }),
      qatDoTxnBase({
        id: "do-txn-2",
        transactionId: "KN-01TU-9",
        entryNumber: "217-01000789",
        companyName: "US COMPANY 1",
        shipments: "NA",
        mot: "AIR",
        mbl: "18098765432",
        hbl: "7845987654",
        carrier: "CX",
        statusChip: "active"
      }),
      qatDoTxnBase({
        id: "do-txn-3",
        transactionId: "KN-058Y-2",
        entryNumber: "217-01000790",
        companyName: "TEST US COMPANY 4",
        shipments: "KX-058Y-105",
        mot: "OCEAN",
        mbl: "KAJAB123415",
        hbl: "H8650121250",
        carrier: "EVER ELITE",
        statusChip: "active"
      }),
      qatDoTxnBase({
        id: "do-txn-4",
        transactionId: "KN-07BI-3",
        entryNumber: "217-01000791",
        companyName: "ENGINE-KN-SHIP-NEILMA-JISWAL032",
        shipments: "KX-07BI-44",
        mot: "OCEAN",
        carrier: "MAERSK SEALAND",
        statusChip: "complete"
      })
    ];
  }

  function generatedTxnRow(i, statusChip) {
    const mid = ID_MID[i % ID_MID.length];
    const mot = i % 5 === 0 ? "AIR" : "OCEAN";
    const isAir = mot === "AIR";
    const carriers = isAir ? AIR_CARRIERS : OCEAN_CARRIERS;
    return qatDoTxnBase({
      id: `do-txn-${i + 1}`,
      transactionId: `KN-${mid}-${1 + (i % 900)}`,
      entryNumber: `217-${pad(1000788 + i, 8)}`,
      companyName: DO_TXN_COMPANIES[i % DO_TXN_COMPANIES.length],
      shipments: i % 7 === 0 ? "NA" : `KX-${mid}-${12 + (i % 180)}`,
      mot,
      mbl: isAir ? String(18012345678 + i * 17) : `KAJAB${pad(123414 + i, 6)}`,
      hbl: i % 9 === 0 ? "" : (isAir ? String(7845123456 + i * 11) : `H${pad(8650121248 + i * 13, 10)}`),
      carrier: carriers[i % carriers.length],
      statusChip
    });
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = curatedTxnRows();
    const counts = { all: rows.length, active: 0, recent: 0, reject: 0, hold: 0, complete: 0 };
    rows.forEach((row) => { counts[row.statusChip] = (counts[row.statusChip] || 0) + 1; });
    let i = rows.length;
    while (rows.length < TXN_SEED_TOTAL) {
      const statusChip = chipForIndex(i);
      rows.push(generatedTxnRow(i, statusChip));
      counts[statusChip] = (counts[statusChip] || 0) + 1;
      i += 1;
    }
    seedCache = rows;
    return rows;
  }

  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function shipStateMeta(chip) {
    return DO_SHIP_STATES.find((item) => item.chip === chip) || DO_SHIP_STATES[0];
  }

  function shipChipForIndex(i) {
    if (i < 25) return "new";
    if (i < 50) return "inProgress";
    if (i < 75) return "docGenerated";
    return "doPublished";
  }

  function qatDoShipBase(overrides = {}) {
    const chip = overrides.statusChip || "new";
    const meta = shipStateMeta(chip);
    return {
      companyName: "TEST US COMPANY 4",
      shipmentState: meta.label,
      statusChip: chip,
      stateTone: meta.tone,
      mbol: "KAJAB123414",
      hbol: "8521B6J4MQB",
      mot: "OCEAN",
      ...overrides
    };
  }

  function curatedShipRows() {
    return [
      qatDoShipBase({
        id: "do-ship-1",
        shipmentId: "KN-058Y-105",
        companyName: "TEST US COMPANY 4",
        statusChip: "docGenerated",
        shipmentState: "DOC GENERATED",
        stateTone: "information",
        mbol: "KAJAB123414",
        hbol: "H8650121248"
      }),
      qatDoShipBase({
        id: "do-ship-2",
        shipmentId: "KN-058Y-104",
        companyName: "ENGINE-KN-SHIP-NEILMA-JISWAL032",
        statusChip: "new",
        shipmentState: "NEW",
        stateTone: "information",
        mbol: "KAJAB123415",
        hbol: "H8650121250"
      }),
      qatDoShipBase({
        id: "do-ship-3",
        shipmentId: "KN-058Y-103",
        companyName: "TEST US COMPANY 4",
        statusChip: "doPublished",
        shipmentState: "DO PUBLISHED",
        stateTone: "positive",
        mbol: "KAJAB123416"
      }),
      qatDoShipBase({
        id: "do-ship-4",
        shipmentId: "KN-058Y-102",
        companyName: "ENGINE-KN-SHIP-NEILMA-JISWAL032",
        statusChip: "inProgress",
        shipmentState: "IN PROGRESS",
        stateTone: "notice",
        mbol: "KAJAB123417"
      })
    ];
  }

  function generatedShipRow(i, statusChip) {
    const meta = shipStateMeta(statusChip);
    const company = i % 5 === 0 ? DO_SHIP_COMPANIES[i % DO_SHIP_COMPANIES.length] : "TEST US COMPANY 4";
    return qatDoShipBase({
      id: `do-ship-${i + 1}`,
      shipmentId: `KN-058Y-${105 - (i % 900)}`,
      companyName: company,
      statusChip,
      shipmentState: meta.label,
      stateTone: meta.tone,
      mbol: `KAJAB${pad(123414 + i, 6)}`,
      hbol: i % 4 === 0 ? "" : `H${pad(8650121248 + i * 13, 10)}`,
      mot: i % 6 === 0 ? "AIR" : "OCEAN"
    });
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = curatedShipRows();
    const counts = { new: 0, inProgress: 0, docGenerated: 0, doPublished: 0 };
    rows.forEach((row) => { counts[row.statusChip] += 1; });
    let i = rows.length;
    DO_SHIP_STATES.forEach(({ chip }) => {
      const target = chip === "new" ? 25 : chip === "inProgress" ? 25 : chip === "docGenerated" ? 25 : 24;
      while (counts[chip] < target) {
        rows.push(generatedShipRow(i, chip));
        counts[chip] += 1;
        i += 1;
      }
    });
    shipSeedCache = rows;
    return rows;
  }

  function sortRows(rows, sortKey, sortDir) {
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = String(a[sortKey] || "").toLowerCase();
      const bv = String(b[sortKey] || "").toLowerCase();
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
        [f.transactionId, row.transactionId],
        [f.entryNumber, row.entryNumber],
        [f.companyName, row.companyName],
        [f.shipments, row.shipments],
        [f.mot, row.mot],
        [f.mbl, row.mbl],
        [f.hbl, row.hbl],
        [f.carrier, row.carrier]
      ].every(([filter, hay]) => !filter || q(hay).includes(q(filter)));
    });
    return sortRows(rows, state.txn.sortKey, state.txn.sortDir);
  }

  function filteredShipRows() {
    const q = (v) => String(v || "").toLowerCase();
    const f = state.ship.filters;
    const rows = buildShipSeed().filter((row) => {
      const chipOk = f.chip === "all" || row.statusChip === f.chip;
      if (!chipOk) return false;
      return [
        [f.shipmentId, row.shipmentId],
        [f.companyName, row.companyName],
        [f.shipmentState, row.shipmentState],
        [f.mbol, row.mbol],
        [f.hbol, row.hbol],
        [f.mot, row.mot]
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
    return {
      all: all.length,
      new: all.filter((r) => r.statusChip === "new").length,
      inProgress: all.filter((r) => r.statusChip === "inProgress").length,
      docGenerated: all.filter((r) => r.statusChip === "docGenerated").length,
      doPublished: all.filter((r) => r.statusChip === "doPublished").length
    };
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ actionCount: 0, extra: "do-txn-table" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 8, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredTxnRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.txn.pageSize));
    if (state.txn.page > pages) state.txn.page = pages;
    const start = (state.txn.page - 1) * state.txn.pageSize;
    const pageRows = rows.slice(start, start + state.txn.pageSize);
    const counts = txnChipCounts();
    const chip = state.txn.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-do-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-do-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(ux.emptyDisplay(row.hbl))}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.carrier)}">${escapeHtml(row.carrier)}</td>
        </tr>`).join("")
      : ux.tmTableEmptyRow({
          colspan: 8,
          title: "No delivery orders found matching your search",
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
    <div class="vis-table-wrap role-table-card do-txn-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 0, extra: "do-txn-table" })}" aria-label="US Delivery Order transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-do-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-do-sort")}
              ${sortHeader("companyName", "Company Name", "data-do-sort")}
              ${sortHeader("shipments", "Shipment ID", "data-do-sort")}
              ${sortHeader("mot", "MOT", "data-do-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PRO#", "data-do-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-do-sort")}
              ${sortHeader("carrier", "Vessel/Carrier Name", "data-do-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-do-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipment ID" })}
              ${ux.colKnSelect({ attr: "data-do-filter", key: "mot", value: state.txn.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }] })}
              ${ux.colFilter({ attr: "data-do-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-do-filter", key: "carrier", value: state.txn.filters.carrier, label: "carrier" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.txn.page, pages, total: rows.length, pageSize: state.txn.pageSize, pageAttr: "data-do-page", label: "Delivery Order pages", sizeSelect: adminSelect({ id: "kn-do-pagesize", name: "pageSize", value: String(state.txn.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "pageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function renderShipTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "ALL", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="${ux.tmTableClasses({ actionCount: 0, extra: "do-ship-table" })}" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 6, rows: 8 })}</tbody></table></div></div>`;
    }
    const rows = filteredShipRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.ship.pageSize));
    if (state.ship.page > pages) state.ship.page = pages;
    const start = (state.ship.page - 1) * state.ship.pageSize;
    const pageRows = rows.slice(start, start + state.ship.pageSize);
    const counts = shipChipCounts();
    const chip = state.ship.filters.chip;
    const body = pageRows.length
      ? pageRows.map((row) => `<tr data-do-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="kn-link admin-name-link" href="${ROUTE}" data-do-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbol)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbol)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
        </tr>`).join("")
      : ux.tmTableEmptyRow({
          colspan: 6,
          title: "No delivery order shipments found matching your search",
          description: "Clear filters or switch status chips to see shipments.",
          secondaryLabel: "Clear filters",
          secondaryAttr: "data-admin-clear-filters"
        });
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "ALL", count: counts.all, selected: chip === "all" },
        { id: "new", label: "NEW", count: counts.new, selected: chip === "new" },
        { id: "inProgress", label: "IN PROGRESS", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "docGenerated", label: "DOC GENERATED", count: counts.docGenerated, selected: chip === "docGenerated" },
        { id: "doPublished", label: "DO PUBLISHED", count: counts.doPublished, selected: chip === "doPublished" }
      ],
      results: `Showing ${pageRows.length ? start + 1 : 0} to ${start + pageRows.length} of ${rows.length} records`
    })}
    <div class="vis-table-wrap role-table-card do-ship-table-card">
      <div class="vis-table-scroll">
        <table class="${ux.tmTableClasses({ actionCount: 0, extra: "do-ship-table" })}" aria-label="US Delivery Order shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-do-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-do-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-do-ship-sort")}
              ${sortHeader("mbol", "MBOL", "data-do-ship-sort")}
              ${sortHeader("hbol", "HBOL", "data-do-ship-sort")}
              ${sortHeader("mot", "MOT", "data-do-ship-sort")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colKnSelect({ attr: "data-do-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "NEW", label: "NEW" }, { value: "IN PROGRESS", label: "IN PROGRESS" }, { value: "DOC GENERATED", label: "DOC GENERATED" }, { value: "DO PUBLISHED", label: "DO PUBLISHED" }] })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "mbol", value: state.ship.filters.mbol, label: "MBOL" })}
              ${ux.colFilter({ attr: "data-do-ship-filter", key: "hbol", value: state.ship.filters.hbol, label: "HBOL" })}
              ${ux.colKnSelect({ attr: "data-do-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }] })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-do-ship-page", label: "Delivery Order shipment pages", sizeSelect: adminSelect({ id: "kn-do-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-do-page");
    const root = document.getElementById("kn-do-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-page-head">
      <h1 class="type-heading-h3 type-weight-semibold">Create DO</h1>
    </div>
    <div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Delivery Order list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-do-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-do-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta">
        <span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
      </div>
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
      const viewBtn = event.target.closest("[data-do-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-do-view") || "transaction"; state.menuOpen = ""; state.selectOpen = ""; render(); return; }
      if (event.target.closest("[data-admin-clear-filters]")) { event.preventDefault(); clearFilters(); return; }
      const sort = event.target.closest("[data-do-sort], [data-do-ship-sort]");
      if (sort) {
        event.preventDefault();
        const key = sort.getAttribute("data-do-sort") || sort.getAttribute("data-do-ship-sort");
        const view = sort.hasAttribute("data-do-ship-sort") ? state.ship : state.txn;
        if (view.sortKey === key) view.sortDir = view.sortDir === "asc" ? "desc" : "asc";
        else { view.sortKey = key; view.sortDir = "asc"; }
        view.page = 1; render(); return;
      }
      const chip = event.target.closest("[data-admin-chip]");
      if (chip) {
        event.preventDefault();
        const view = state.view === "shipment" ? state.ship : state.txn;
        view.filters.chip = chip.getAttribute("data-admin-chip") || "all";
        view.page = 1; render(); return;
      }
      const pageBtn = event.target.closest("[data-do-page], [data-do-ship-page]");
      if (pageBtn) {
        event.preventDefault();
        const next = Number(pageBtn.getAttribute("data-do-page") || pageBtn.getAttribute("data-do-ship-page"));
        const view = pageBtn.hasAttribute("data-do-ship-page") ? state.ship : state.txn;
        if (Number.isFinite(next) && next >= 1) { view.page = next; state.menuOpen = ""; render(); }
        return;
      }
      if (window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (n) => { state.selectOpen = n; render(); },
        onChange: (key, value) => {
          if (key === "pageSize") { state.txn.pageSize = Number(value) || 100; state.txn.page = 1; render(); return; }
          if (key === "shipPageSize") { state.ship.pageSize = Number(value) || 100; state.ship.page = 1; render(); return; }
          const filters = state.view === "shipment" ? state.ship.filters : state.txn.filters;
          if (key in filters) { filters[key] = value; if (state.view === "shipment") state.ship.page = 1; else state.txn.page = 1; render(); }
        }
      })) return;
      const open = event.target.closest("[data-do-open]");
      if (open) { event.preventDefault(); const row = findTxnRow(open.getAttribute("data-do-open")); if (row) { location.hash = `#transaction-us-delivery-order/history/${encodeURIComponent(row.id)}`; } return; }
      const shipOpen = event.target.closest("[data-do-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-do-ship-open")); if (row) { location.hash = `#transaction-us-delivery-order/history/${encodeURIComponent(row.id)}`; } return; }
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-do-filter], [data-do-ship-filter]");
      if (!input || input.tagName === "SELECT") return;
      const isShip = input.hasAttribute("data-do-ship-filter");
      const key = input.getAttribute(isShip ? "data-do-ship-filter" : "data-do-filter");
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
      const page = document.getElementById("kn-do-page");
      if (!page || page.hidden) { stopAutorefresh(); return; }
      lastUpdatedIso = new Date().toISOString(); state.menuOpen = ""; state.selectOpen = ""; render();
    }, AUTOREFRESH_MS);
  }
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; stopAutorefresh(); }
  function sync() {
    const page = document.getElementById("kn-do-page");
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
    const page = document.getElementById("kn-do-page");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen)) return; state.selectOpen = ""; state.menuOpen = ""; render(); });
    document.addEventListener("keydown", (event) => { if (page.hidden || event.key !== "Escape") return; if (state.selectOpen || state.menuOpen) { state.selectOpen = ""; state.menuOpen = ""; render(); } });
  }

  window.KNUsDeliveryOrder = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); }, listShipments() { return buildShipSeed(); } };
})();
