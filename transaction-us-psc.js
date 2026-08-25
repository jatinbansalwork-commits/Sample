(() => {
  const ROUTE = "#transaction-us-psc";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setSeconds(d.getSeconds() - 16); return d.toISOString(); })();
  let refreshTimer = null;

  const COMPANIES = ["ICHOR SYSTEMS INC","UNITED MACHINING NORTH AMERICA LLC","SAFRAN CABIN INC - MARYSVILLE","CAMERON INTERNATIONAL CORPORATION (SUB QC)","JOBY AERO, INC","HURST JAWS OF LIFE INC - SMALL","ACUITY BRANDS","GLOBAL-PAK","PACIFIC RIM TRADING CO","ILLUMINATE USA LLC"];
  const USERS = ["ARUN KUMAR","HAYLEIGH MEISTER","NATHAN DEMELLO","JESSICA KNOWLES","MONIQUE HUGHES","KAMAL SINGH","RAJA KUMAR","",""];
  const CARRIERS = ["CMA CGM","ZIM","FEDEX, FX","ATLANTIC SEA","CATHAY PACIFIC AIRWAYS LTD., CX","DHL AIR LIMITED"];
  const COUNTRIES = [
    { code: "MY", name: "Malaysia" }, { code: "CN", name: "China" }, { code: "VN", name: "Vietnam" },
    { code: "DE", name: "Germany" }, { code: "JP", name: "Japan" }, { code: "KR", name: "Korea, Republic of" },
    { code: "CA", name: "Canada" }, { code: "MX", name: "Mexico" }, { code: "IN", name: "India" }, { code: "TW", name: "Taiwan" }
  ];
  const ID_MID = ["071Y","07HC","07BI","08KA","09LM","0ANP","0BQR","0CST","0DUV","0EWX"];

  const emptyTxnFilters = () => ({ chip: "all", transactionId: "", pscTransactionId: "", companyName: "", pscType: "", entryNumber: "", username: "", shipments: "", pscStatus: "", filingDate: "" });
  const emptyShipFilters = () => ({ chip: "allActive", shipmentId: "", companyName: "", shipmentState: "", eta: "", vesselName: "", mot: "", mbl: "", hbl: "", countryExport: "", countryImport: "" });

  const state = {
    view: "transaction",
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
  function toast(content, color = "positive") { if (typeof window.showBladeToast === "function") window.showBladeToast({ content, color }); }
  function iconCopy() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`; }
  function iconTrash() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>`; }

  function statusBadge(label, tone) {
    return window.KNAdminUX.tmStatusBadge(label, tone);
  }

  function pscTypeBadge(label) {
    const tone = /standalone/i.test(label) ? "information" : "notice";
    return statusBadge(label, tone);
  }

  function pscStatusBadge(label) {
    if (/accepted/i.test(label)) return statusBadge(label, "positive");
    if (/in process/i.test(label)) return statusBadge(label, "notice");
    if (/none/i.test(label)) return statusBadge(label, "neutral");
    if (/ready/i.test(label)) return statusBadge(label, "information");
    return statusBadge(label, "information");
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const statuses = ["NONE","IN PROCESS","ACCEPTED","READY","ACCEPTED","NONE","IN PROCESS","READY"];
    const types = ["Standalone PSC","PSC","Standalone PSC","PSC","PSC"];
    const rows = [];
    for (let i = 0; i < 1501; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const txnId = `KN-${mid}-${1 + (i % 90)}`;
      const multi = i % 7 === 4;
      const pscIds = multi
        ? [`${txnId}--2`, `${txnId}--3`, `${txnId}--4`]
        : (i % 5 === 0 ? [] : [`${txnId}--1`]);
      const filing = i % 4 === 0 ? null : new Date(Date.UTC(2025 + (i % 2), (i * 3) % 12, 1 + (i % 27)));
      rows.push({
        id: `psc-${i + 1}`,
        transactionId: txnId,
        pscTransactionIds: pscIds,
        companyName: COMPANIES[i % COMPANIES.length],
        pscType: types[i % types.length],
        entryNumber: i % 3 === 0 ? String(30003853 + i) : `AEK-${75128841 + i}`,
        username: USERS[i % USERS.length],
        shipments: `KX-${mid}-${70 + (i % 30)}`,
        pscStatus: statuses[i % statuses.length],
        filingDate: filing ? formatDate(filing) : "",
        filingSort: filing ? filing.getTime() : 0,
        statusChip: "all"
      });
    }
    Object.assign(rows[0], { transactionId: "KN-071Y-1", pscTransactionIds: [], companyName: "ICHOR SYSTEMS INC", pscType: "Standalone PSC", entryNumber: "30003853", username: "ARUN KUMAR", shipments: "KX-071Y-76", pscStatus: "NONE", filingDate: "" });
    Object.assign(rows[4], { transactionId: "KN-07HC-70", pscTransactionIds: ["KN-07HC-70--2","KN-07HC-70--3","KN-07HC-70--4"], companyName: "UNITED MACHINING NORTH AMERICA LLC", pscType: "PSC", entryNumber: "BII-15011521", username: "HAYLEIGH MEISTER", shipments: "KX-07HC-71", pscStatus: "ACCEPTED", filingDate: "May 27, 2025", filingSort: Date.parse("May 27, 2025") });
    seedCache = rows;
    return rows;
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = [];
    // 360 active-new + 40 notCreated + 0 inProgress + 40 completed = 440; allActive = 400
    for (let i = 0; i < 440; i += 1) {
      let statusChip; let shipmentState; let stateTone;
      if (i < 360) { statusChip = "active"; shipmentState = "New"; stateTone = "information"; }
      else if (i < 400) { statusChip = "notCreated"; shipmentState = "New"; stateTone = "information"; }
      else { statusChip = "completed"; shipmentState = "Completed"; stateTone = "positive"; }
      const mid = ID_MID[i % ID_MID.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      const eta = new Date(Date.UTC(2026, (i * 2) % 12, 1 + (i % 27)));
      const vessel = CARRIERS[i % CARRIERS.length];
      rows.push({
        id: `psc-ship-${i + 1}`,
        shipmentId: `KN-USCS-${mid}-${10 + (i % 90)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        shipmentState,
        statusChip,
        stateTone,
        eta: formatDate(eta),
        etaSort: eta.getTime(),
        vesselName: vessel,
        mot: i % 5 === 0 ? "OCEAN" : "AIR",
        mbl: String(40624604451 + i * 23),
        hbl: `HBL${pad((i * 7919) % 1e8, 8)}`.slice(0, 12),
        countryExport: `${country.code} - ${country.name}`,
        countryImport: "US - United States of America"
      });
    }
    Object.assign(rows[0], { shipmentId: "KN-USCS-071Y-12", companyName: "ICHOR SYSTEMS INC", vesselName: "CMA CGM" });
    shipSeedCache = rows;
    return rows;
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
        (f.chip === "inProcess" && row.pscStatus === "IN PROCESS") ||
        (f.chip === "accepted" && row.pscStatus === "ACCEPTED") ||
        (f.chip === "ready" && row.pscStatus === "READY");
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
        ? row.statusChip === "active" || row.statusChip === "notCreated" || row.statusChip === "inProgress"
        : f.chip === "inProgress"
          ? row.statusChip === "inProgress"
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
    const active = all.filter((r) => r.statusChip === "active").length;
    return { allActive: active + notCreated + inProgress, notCreated, inProgress, completed };
  }

  function txnChipCounts() {
    const all = buildSeed();
    return {
      all: all.length,
      none: all.filter((r) => r.pscStatus === "NONE").length,
      inProcess: all.filter((r) => r.pscStatus === "IN PROCESS").length,
      accepted: all.filter((r) => r.pscStatus === "ACCEPTED").length,
      ready: all.filter((r) => r.pscStatus === "READY").length
    };
  }

  function adminSelect(opts) { return window.KNAdminUX.select({ ...opts, open: state.selectOpen }); }

  function rowActions(id, label, prefix) {
    const ux = window.KNAdminUX;
    return `<div class="user-row-actions">
      <button class="icon-btn" type="button" data-${prefix}-copy="${escapeHtml(id)}" aria-label="Copy ${escapeHtml(label)}" data-tooltip="Copy">${iconCopy()}</button>
      <button class="icon-btn" type="button" data-${prefix}-delete="${escapeHtml(id)}" aria-label="Delete ${escapeHtml(label)}" data-tooltip="Delete">${iconTrash()}</button>
      ${ux.moreMenu({ id, open: state.menuOpen === id, items: [{ label: "View history", attr: `data-${prefix}-history="${escapeHtml(id)}"` }] })}
    </div>`;
  }

  function pscIdCell(row) {
    const ids = row.pscTransactionIds || [];
    if (!ids.length) return window.KNAdminUX.ellipsisCell("");
    const expanded = !!state.expandedPsc[row.id];
    const shown = expanded ? ids : ids.slice(0, 1);
    const joined = shown.join(" · ");
    const more = !expanded && ids.length > 1
      ? ` <button class="blade-link type-caption-sm" type="button" data-psc-more="${escapeHtml(row.id)}">+${ids.length - 1}</button>`
      : (expanded && ids.length > 1 ? ` <button class="blade-link type-caption-sm" type="button" data-psc-more="${escapeHtml(row.id)}">less</button>` : "");
    return `<span class="type-body-sm tm-ellipsis" title="${escapeHtml(ids.join(" · "))}">${escapeHtml(joined)}</span>${more}`;
  }

  function renderTxnTable() {
    const ux = window.KNAdminUX;
    if (state.booting) {
      return `${ux.toolbar({ chips: [{ id: "all", label: "All", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
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
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-psc-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td>${pscIdCell(row)}</td>
          <td class="admin-table-nowrap">${pscTypeBadge(row.pscType)}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.entryNumber)}">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td class="type-body-sm"><span class="code" title="${escapeHtml(row.shipments)}">${escapeHtml(row.shipments)}</span></td>
          <td class="admin-table-nowrap">${pscStatusBadge(row.pscStatus)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.filingDate))}</td>
          <td>${rowActions(row.id, row.transactionId, "psc")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="10">${ux.emptyState({ title: "No PSC filings found matching your search", description: "Clear filters or switch status chips to see filings.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "none", label: "None", count: counts.none, selected: chip === "none" },
        { id: "inProcess", label: "In Process", count: counts.inProcess, selected: chip === "inProcess" },
        { id: "accepted", label: "Accepted", count: counts.accepted, selected: chip === "accepted" },
        { id: "ready", label: "Ready", count: counts.ready, selected: chip === "ready" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US PSC transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-psc-sort")}
              ${sortHeader("companyName", "Company Name", "data-psc-sort")}
              ${sortHeader("pscTransactionId", "PSC Transaction ID", "data-psc-sort")}
              ${sortHeader("pscType", "PSC Type", "data-psc-sort")}
              ${sortHeader("entryNumber", "Entry number", "data-psc-sort")}
              ${sortHeader("username", "Username", "data-psc-sort")}
              ${sortHeader("shipments", "Shipments", "data-psc-sort")}
              ${sortHeader("pscStatus", "PSC Status", "data-psc-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-psc-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-psc-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "pscTransactionId", value: state.txn.filters.pscTransactionId, label: "PSC transaction ID" })}
              ${ux.colBladeSelect({ attr: "data-psc-filter", key: "pscType", value: state.txn.filters.pscType, label: "PSC type", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "Standalone PSC", label: "Standalone PSC" }, { value: "PSC", label: "PSC" }] })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "username", value: state.txn.filters.username, label: "username" })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments" })}
              ${ux.colBladeSelect({ attr: "data-psc-filter", key: "pscStatus", value: state.txn.filters.pscStatus, label: "PSC status", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "NONE", label: "NONE" }, { value: "IN PROCESS", label: "IN PROCESS" }, { value: "ACCEPTED", label: "ACCEPTED" }, { value: "READY", label: "READY" }] })}
              ${ux.colFilter({ attr: "data-psc-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
              ${ux.emptyColFilter()}
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
      return `${ux.toolbar({ chips: [{ id: "allActive", label: "All Active", count: "…", selected: true }], results: "Loading…" })}<div class="vis-table-wrap role-table-card" aria-busy="true"><div class="vis-table-scroll"><table class="vis-table vis-table--admin tm-table" aria-label="Loading"><tbody>${ux.tableSkeletonRows({ cols: 10, rows: 8 })}</tbody></table></div></div>`;
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
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-psc-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.vesselName)}">${escapeHtml(row.vesselName)}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td>${rowActions(row.id, row.shipmentId, "psc-ship")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="11">${ux.emptyState({ title: "No PSC shipments found matching your search", description: "Clear filters or switch status chips to see shipments.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "allActive", label: "All Active", count: counts.allActive, selected: chip === "allActive" },
        { id: "notCreated", label: "Not Created", count: counts.notCreated, selected: chip === "notCreated" },
        { id: "inProgress", label: "In Process", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "completed", label: "Completed", count: counts.completed, selected: chip === "completed" }
      ],
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US PSC shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-psc-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-psc-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-psc-ship-sort")}
              ${sortHeader("eta", "ETA", "data-psc-ship-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier", "data-psc-ship-sort")}
              ${sortHeader("mot", "MOT", "data-psc-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-psc-ship-sort")}
              ${sortHeader("hbl", "HBL/MAWB", "data-psc-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-psc-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-psc-ship-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colBladeSelect({ attr: "data-psc-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "New", label: "New" }, { value: "Completed", label: "Completed" }] })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "vesselName", value: state.ship.filters.vesselName, label: "vessel" })}
              ${ux.colBladeSelect({ attr: "data-psc-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "AIR", label: "AIR" }, { value: "OCEAN", label: "OCEAN" }] })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-psc-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
              ${ux.emptyColFilter()}
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
      const open = event.target.closest("[data-psc-open]");
      if (open) { event.preventDefault(); const row = findTxnRow(open.getAttribute("data-psc-open")); toast(`${row?.transactionId || "Filing"} opened as read-only in this sample.`, "notice"); return; }
      const shipOpen = event.target.closest("[data-psc-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-psc-ship-open")); toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice"); return; }
      const copy = event.target.closest("[data-psc-copy], [data-psc-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-psc-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-psc-ship-copy")) : findTxnRow(copy.getAttribute("data-psc-copy"));
        const text = isShip ? row?.shipmentId || "" : row?.transactionId || "";
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}.`), () => toast(`Copy ${text} from the table.`, "notice"));
        else toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        return;
      }
      const history = event.target.closest("[data-psc-history], [data-psc-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-psc-ship-history");
        const row = isShip ? findShipRow(history.getAttribute("data-psc-ship-history")) : findTxnRow(history.getAttribute("data-psc-history"));
        toast(`History for ${(isShip ? row?.shipmentId : row?.transactionId) || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-psc-delete], [data-psc-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-psc-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-psc-ship-delete")) : findTxnRow(del.getAttribute("data-psc-delete"));
        toast(`Delete is disabled in this sample (${(isShip ? row?.shipmentId : row?.transactionId) || "record"}).`, "notice");
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
