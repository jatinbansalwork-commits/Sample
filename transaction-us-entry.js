(() => {
  const ROUTE = "#transaction-us-entry";
  const AUTOREFRESH_MS = 60_000;
  let lastUpdatedIso = (() => { const d = new Date(); d.setSeconds(d.getSeconds() - 13); return d.toISOString(); })();
  let refreshTimer = null;

  const COMPANIES = ["CAMERON INTERNATIONAL CORPORATION (SUB QC)","SAFRAN CABIN INC - MARYSVILLE","UNITED MACHINING NORTH AMERICA LLC","ICHOR SYSTEMS INC","JOBY AERO, INC","HURST JAWS OF LIFE INC - SMALL","ACUITY BRANDS","GLOBAL-PAK","ILLUMINATE USA LLC","PACIFIC RIM TRADING CO"];
  const USERS = ["NATHAN DEMELLO","JESSICA KNOWLES","MONIQUE HUGHES","ARUN KUMAR","HAYLEIGH MEISTER","KAMAL SINGH","",""];
  const ENTRY_TYPES = ["01 - CONSUMPTION","31 - WAREHOUSE WITHDRAWAL - CONSUMPTION","11 - INFORMAL","02 - CONSUMPTION QUOTA"];
  const SUMMARIES = ["IN PROGRESS","ACCEPTED","INTRANET ACCEPTED","READY","ACCEPTED","IN PROGRESS"];
  const CARGO = ["IN PROGRESS","INTRANET FILED","ACCEPTED","READY","Not Applicable","ACCEPTED"];
  const CARRIERS = ["CMA CGM","ZIM","FEDEX, FX","ATLANTIC SEA","CATHAY PACIFIC AIRWAYS LTD., CX","DHL AIR LIMITED"];
  const MOTS = ["OCEAN","AIR","TRUCK","OCEAN","AIR"];
  const COUNTRIES = [
    { code: "VN", name: "Vietnam" }, { code: "CN", name: "China" }, { code: "BE", name: "Belgium" },
    { code: "MY", name: "Malaysia" }, { code: "DE", name: "Germany" }, { code: "JP", name: "Japan" },
    { code: "KR", name: "Korea, Republic of" }, { code: "MX", name: "Mexico" }, { code: "CA", name: "Canada" }, { code: "IN", name: "India" }
  ];
  const PORTS = ["5301 - HOUSTON, TX, US","2704 - LOS ANGELES, CA, US","1001 - NEW YORK, NY, US","2809 - SEATTLE, WA, US","5301 - HOUSTON, TX, US"];
  const FIRMS = ["V136","X362","H054","A123","B456","C789"];
  const ID_MID = ["3809","3769","9809","071Y","07HC","08KA","09LM","0ANP","0BQR","0CST"];

  const emptyTxnFilters = () => ({
    chip: "recent", transactionId: "", companyName: "", entryNumber: "", entryType: "", username: "",
    entrySummary: "", cargoRelease: "", pgaStatus: "", firmsCode: "", eta: "", fspdDate: "", vesselName: "",
    filingDate: "", shipments: "", mot: "", mbl: "", hbl: "", countryExport: "", countryImport: "", portUnlading: "", lastUpdated: ""
  });
  const emptyShipFilters = () => ({
    chip: "allActive", shipmentId: "", companyName: "", shipmentState: "", eta: "", vesselName: "",
    mot: "", mbl: "", hbl: "", countryExport: "", countryImport: ""
  });

  const state = {
    view: "transaction", menuOpen: "", selectOpen: "",
    booting: false, ready: false,
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

  function chipForIndex(i) {
    const r = i % 12;
    if (r === 0) return "reject";
    if (r === 1) return "hold";
    if (r === 2) return "complete";
    if (r <= 6) return "recent";
    return "active";
  }

  function buildSeed() {
    if (seedCache) return seedCache;
    const rows = [];
    for (let i = 0; i < 91; i += 1) {
      const mid = ID_MID[i % ID_MID.length];
      const eta = new Date(Date.UTC(2025, (i * 2) % 12, 1 + (i % 27)));
      const filing = new Date(eta.getTime() - ((i % 20) + 5) * 86400000);
      const fspd = i % 3 === 0 ? null : new Date(eta.getTime() + ((i % 10) + 1) * 86400000);
      const updated = new Date(Date.UTC(2026, 7, 10 + (i % 15)));
      const country = COUNTRIES[i % COUNTRIES.length];
      const summary = SUMMARIES[i % SUMMARIES.length];
      const cargo = CARGO[i % CARGO.length];
      rows.push({
        id: `entry-${i + 1}`,
        transactionId: `KN-${mid}-${2 + (i % 90)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        entryNumber: `${["0AF","8IB","E8G","BII","AEK"][i % 5]}-${3000693 + i}`,
        entryType: ENTRY_TYPES[i % ENTRY_TYPES.length],
        username: USERS[i % USERS.length],
        entrySummary: summary,
        cargoRelease: cargo,
        pgaStatus: "N/A",
        firmsCode: FIRMS[i % FIRMS.length],
        eta: formatDate(eta),
        etaSort: eta.getTime(),
        fspdDate: fspd ? formatDate(fspd) : "",
        fspdSort: fspd ? fspd.getTime() : 0,
        vesselName: CARRIERS[i % CARRIERS.length],
        filingDate: formatDate(filing),
        filingSort: filing.getTime(),
        shipments: `KN-${mid}-${7 + (i % 40)}`,
        mot: MOTS[i % MOTS.length],
        mbl: `MBL${pad((i * 7919) % 1e10, 10)}`,
        hbl: `HBL${pad((i * 6287) % 1e10, 10)}`,
        countryExport: `${country.code} - ${country.name}`,
        countryImport: "US - United States of America",
        portUnlading: PORTS[i % PORTS.length],
        lastUpdated: formatDate(updated),
        lastUpdatedSort: updated.getTime(),
        statusChip: chipForIndex(i)
      });
    }
    Object.assign(rows[0], { transactionId: "KN-3809-2", companyName: "CAMERON INTERNATIONAL CORPORATION (SUB QC)", entryNumber: "0AF-3000693", entryType: "01 - CONSUMPTION", username: "NATHAN DEMELLO", entrySummary: "IN PROGRESS", cargoRelease: "IN PROGRESS", firmsCode: "V136", vesselName: "CMA CGM", mot: "OCEAN", statusChip: "recent" });
    seedCache = rows;
    return rows;
  }

  function buildShipSeed() {
    if (shipSeedCache) return shipSeedCache;
    const rows = [];
    // 19 active + 0 notCreated + 3 inProgress + 1489 completed; allActive = 22
    for (let i = 0; i < 1511; i += 1) {
      let statusChip; let shipmentState; let stateTone;
      if (i < 19) { statusChip = "active"; shipmentState = "New"; stateTone = "information"; }
      else if (i < 22) { statusChip = "inProgress"; shipmentState = "In Progress"; stateTone = "notice"; }
      else { statusChip = "completed"; shipmentState = "Completed"; stateTone = "positive"; }
      const mid = ID_MID[i % ID_MID.length];
      const country = COUNTRIES[i % COUNTRIES.length];
      const eta = new Date(Date.UTC(2025 + (i % 2), (i * 3) % 12, 1 + (i % 27)));
      rows.push({
        id: `entry-ship-${i + 1}`,
        shipmentId: `KN-${mid}-${10 + (i % 90)}`,
        companyName: COMPANIES[i % COMPANIES.length],
        shipmentState, statusChip, stateTone,
        eta: formatDate(eta), etaSort: eta.getTime(),
        vesselName: CARRIERS[i % CARRIERS.length],
        mot: MOTS[i % MOTS.length],
        mbl: String(40624604451 + i * 29),
        hbl: `H${pad((i * 4567) % 1e9, 9)}`,
        countryExport: `${country.code} - ${country.name}`,
        countryImport: "US - United States of America"
      });
    }
    Object.assign(rows[0], { shipmentId: "KN-3809-2", companyName: "CAMERON INTERNATIONAL CORPORATION (SUB QC)", vesselName: "CMA CGM", mot: "OCEAN" });
    shipSeedCache = rows;
    return rows;
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
        ? row.statusChip === "active" || row.statusChip === "notCreated" || row.statusChip === "inProgress"
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
    const active = all.filter((r) => r.statusChip === "active").length;
    return { allActive: active + notCreated + inProgress, notCreated, inProgress, completed };
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
      ? pageRows.map((row) => `<tr data-entry-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-entry-open="${escapeHtml(row.id)}" title="${escapeHtml(row.transactionId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.transactionId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.entryNumber)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.entryType)}">${escapeHtml(row.entryType)}</td>
          <td class="type-body-sm">${escapeHtml(ux.emptyDisplay(row.username))}</td>
          <td class="admin-table-nowrap">${statusBadge(row.entrySummary)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.cargoRelease)}</td>
          <td class="type-body-sm admin-table-nowrap"><span class="badge badge--information type-caption-sm">${escapeHtml(row.pgaStatus)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.firmsCode)}</span></td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(ux.emptyDisplay(row.fspdDate))}</td>
          <td class="type-body-sm" title="${escapeHtml(row.vesselName)}">${escapeHtml(row.vesselName)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.filingDate)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.shipments)}</span></td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.portUnlading)}">${escapeHtml(row.portUnlading)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.lastUpdated)}</td>
          <td>${rowActions(row.id, row.transactionId, "entry")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="22">${ux.emptyState({ title: "No Entry filings found matching your search", description: "Clear filters or switch status chips to see filings.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "all", label: "All", count: counts.all, selected: chip === "all" },
        { id: "active", label: "Active", count: counts.active, selected: chip === "active" },
        { id: "recent", label: "Recent", count: counts.recent, selected: chip === "recent" },
        { id: "reject", label: "Reject", count: counts.reject, selected: chip === "reject" },
        { id: "hold", label: "Hold", count: counts.hold, selected: chip === "hold" },
        { id: "complete", label: "Complete", count: counts.complete, selected: chip === "complete" }
      ],
      results: `${rows.length} transactions. Page ${state.txn.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US Entry transactions">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("transactionId", "Transaction ID", "data-entry-sort")}
              ${sortHeader("companyName", "Company Name", "data-entry-sort")}
              ${sortHeader("entryNumber", "Entry Number", "data-entry-sort")}
              ${sortHeader("entryType", "Entry Type", "data-entry-sort")}
              ${sortHeader("username", "Username", "data-entry-sort")}
              ${sortHeader("entrySummary", "Entry Summary", "data-entry-sort")}
              ${sortHeader("cargoRelease", "Cargo Release", "data-entry-sort")}
              ${sortHeader("pgaStatus", "PGA Status", "data-entry-sort")}
              ${sortHeader("firmsCode", "Firms Code", "data-entry-sort")}
              ${sortHeader("eta", "ETA", "data-entry-sort")}
              ${sortHeader("fspdDate", "PERD/FSPD Date", "data-entry-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier", "data-entry-sort")}
              ${sortHeader("filingDate", "Filing Date", "data-entry-sort")}
              ${sortHeader("shipments", "Shipments", "data-entry-sort")}
              ${sortHeader("mot", "MoT/Mode", "data-entry-sort")}
              ${sortHeader("mbl", "MBL/MAWB/PAPS", "data-entry-sort")}
              ${sortHeader("hbl", "HBL/HAWB", "data-entry-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-entry-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-entry-sort")}
              ${sortHeader("portUnlading", "Port of Unlading", "data-entry-sort")}
              ${sortHeader("lastUpdated", "Last Updated Date", "data-entry-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-entry-filter", key: "transactionId", value: state.txn.filters.transactionId, label: "transaction ID" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "companyName", value: state.txn.filters.companyName, label: "company name" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entryNumber", value: state.txn.filters.entryNumber, label: "entry number" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entryType", value: state.txn.filters.entryType, label: "entry type" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "username", value: state.txn.filters.username, label: "username" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "entrySummary", value: state.txn.filters.entrySummary, label: "entry summary" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "cargoRelease", value: state.txn.filters.cargoRelease, label: "cargo release" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "pgaStatus", value: state.txn.filters.pgaStatus, label: "PGA status" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "firmsCode", value: state.txn.filters.firmsCode, label: "firms code" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "eta", value: state.txn.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "fspdDate", value: state.txn.filters.fspdDate, label: "FSPD" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "vesselName", value: state.txn.filters.vesselName, label: "vessel" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "filingDate", value: state.txn.filters.filingDate, label: "filing date" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "shipments", value: state.txn.filters.shipments, label: "shipments" })}
              ${ux.colBladeSelect({ attr: "data-entry-filter", key: "mot", value: state.txn.filters.mot, label: "MoT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "mbl", value: state.txn.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "hbl", value: state.txn.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "countryExport", value: state.txn.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "countryImport", value: state.txn.filters.countryImport, label: "country of import" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "portUnlading", value: state.txn.filters.portUnlading, label: "port of unlading" })}
              ${ux.colFilter({ attr: "data-entry-filter", key: "lastUpdated", value: state.txn.filters.lastUpdated, label: "last updated" })}
              ${ux.emptyColFilter()}
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
      ? pageRows.map((row) => `<tr data-entry-ship-id="${escapeHtml(row.id)}" tabindex="0">
          <td class="admin-table-nowrap"><a class="blade-link admin-name-link" href="${ROUTE}" data-entry-ship-open="${escapeHtml(row.id)}" title="${escapeHtml(row.shipmentId)}"><span class="type-body-sm type-weight-medium">${escapeHtml(row.shipmentId)}</span></a></td>
          <td class="type-body-sm" title="${escapeHtml(row.companyName)}">${escapeHtml(row.companyName)}</td>
          <td class="admin-table-nowrap">${statusBadge(row.shipmentState, row.stateTone)}</td>
          <td class="type-body-sm vis-table__date admin-table-nowrap">${escapeHtml(row.eta)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.vesselName)}">${escapeHtml(row.vesselName)}</td>
          <td class="type-body-sm admin-table-nowrap">${escapeHtml(row.mot)}</td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.mbl)}</span></td>
          <td class="type-body-sm"><span class="code">${escapeHtml(row.hbl)}</span></td>
          <td class="type-body-sm" title="${escapeHtml(row.countryExport)}">${escapeHtml(row.countryExport)}</td>
          <td class="type-body-sm" title="${escapeHtml(row.countryImport)}">${escapeHtml(row.countryImport)}</td>
          <td>${rowActions(row.id, row.shipmentId, "entry-ship")}</td>
        </tr>`).join("")
      : `<tr class="role-empty-row"><td colspan="11">${ux.emptyState({ title: "No Entry shipments found matching your search", description: "Clear filters or switch status chips to see shipments.", secondaryLabel: "Clear filters", secondaryAttr: "data-admin-clear-filters" })}</td></tr>`;
    return `${ux.toolbar({
      chips: [
        { id: "allActive", label: "All Active", count: counts.allActive, selected: chip === "allActive" },
        { id: "notCreated", label: "Not Created", count: counts.notCreated, selected: chip === "notCreated" },
        { id: "inProgress", label: "In Progress", count: counts.inProgress, selected: chip === "inProgress" },
        { id: "completed", label: "Completed", count: counts.completed, selected: chip === "completed" }
      ],
      results: `${rows.length} shipments. Page ${state.ship.page} of ${pages}.`
    })}
    <div class="vis-table-wrap role-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin tm-table" aria-label="US Entry shipments">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("shipmentId", "Shipment ID", "data-entry-ship-sort")}
              ${sortHeader("companyName", "Company Name", "data-entry-ship-sort")}
              ${sortHeader("shipmentState", "Shipment State", "data-entry-ship-sort")}
              ${sortHeader("eta", "ETA", "data-entry-ship-sort")}
              ${sortHeader("vesselName", "Vessel/Carrier Name", "data-entry-ship-sort")}
              ${sortHeader("mot", "MOT", "data-entry-ship-sort")}
              ${sortHeader("mbl", "MBL", "data-entry-ship-sort")}
              ${sortHeader("hbl", "HBL/MAWB", "data-entry-ship-sort")}
              ${sortHeader("countryExport", "Country of Export", "data-entry-ship-sort")}
              ${sortHeader("countryImport", "Country of Import", "data-entry-ship-sort")}
              <th scope="col"><span class="type-caption-sm type-weight-medium">Actions</span></th>
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "shipmentId", value: state.ship.filters.shipmentId, label: "shipment ID" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "companyName", value: state.ship.filters.companyName, label: "company name" })}
              ${ux.colBladeSelect({ attr: "data-entry-ship-filter", key: "shipmentState", value: state.ship.filters.shipmentState, label: "shipment state", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "New", label: "New" }, { value: "In Progress", label: "In Progress" }, { value: "Completed", label: "Completed" }] })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "eta", value: state.ship.filters.eta, label: "ETA" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "vesselName", value: state.ship.filters.vesselName, label: "vessel" })}
              ${ux.colBladeSelect({ attr: "data-entry-ship-filter", key: "mot", value: state.ship.filters.mot, label: "MOT", open: state.selectOpen, placeholder: "Select", emptyLabel: "Select", options: [{ value: "OCEAN", label: "OCEAN" }, { value: "AIR", label: "AIR" }, { value: "TRUCK", label: "TRUCK" }] })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "mbl", value: state.ship.filters.mbl, label: "MBL" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "hbl", value: state.ship.filters.hbl, label: "HBL" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "countryExport", value: state.ship.filters.countryExport, label: "country of export" })}
              ${ux.colFilter({ attr: "data-entry-ship-filter", key: "countryImport", value: state.ship.filters.countryImport, label: "country of import" })}
              ${ux.emptyColFilter()}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({ page: state.ship.page, pages, total: rows.length, pageSize: state.ship.pageSize, pageAttr: "data-entry-ship-page", label: "Entry shipment pages", sizeSelect: adminSelect({ id: "kn-entry-ship-pagesize", name: "shipPageSize", value: String(state.ship.pageSize), options: [{ id: "25", label: "25" }, { id: "50", label: "50" }, { id: "100", label: "100" }], placeholder: "Rows", openKey: "shipPageSize", compact: true, includeEmpty: false }) })}
    </div>`;
  }

  function render() {
    const page = document.getElementById("kn-entry-page");
    const root = document.getElementById("kn-entry-root");
    if (!page || !root || page.hidden) return;
    const filterFocus = window.KNAdminUX.captureColFilterFocus(root);
    const updatedLabel = (() => { const raw = window.KNAdminUX.relativeTime(lastUpdatedIso); const hours = raw.match(/^(\d+)h ago$/); return hours ? `${hours[1]} hours ago` : raw; })();
    root.innerHTML = `<div class="tm-toolbar vis-toolbar">
      <div class="kh-tabs" role="tablist" aria-label="Entry list view">
        <button class="btn ${state.view === "shipment" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "shipment"}" data-entry-view="shipment">Shipment</button>
        <button class="btn ${state.view === "transaction" ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.view === "transaction"}" data-entry-view="transaction">Transaction</button>
      </div>
      <div class="tm-toolbar__meta">
        <span class="type-caption-sm tm-updated" title="${escapeHtml(lastUpdatedIso)}">Updated ${escapeHtml(updatedLabel)}</span>
        <button class="btn btn--primary btn--sm type-ui-sm" type="button" data-entry-create>Create Manual Transaction</button>
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
      const viewBtn = event.target.closest("[data-entry-view]");
      if (viewBtn) { event.preventDefault(); state.view = viewBtn.getAttribute("data-entry-view") || "transaction"; state.menuOpen = ""; state.selectOpen = ""; render(); return; }
      if (event.target.closest("[data-entry-create]")) { event.preventDefault(); toast("Create Manual Transaction is not available in this sample.", "notice"); return; }
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
      const open = event.target.closest("[data-entry-open]");
      if (open) { event.preventDefault(); const row = findTxnRow(open.getAttribute("data-entry-open")); toast(`${row?.transactionId || "Filing"} opened as read-only in this sample.`, "notice"); return; }
      const shipOpen = event.target.closest("[data-entry-ship-open]");
      if (shipOpen) { event.preventDefault(); const row = findShipRow(shipOpen.getAttribute("data-entry-ship-open")); toast(`${row?.shipmentId || "Shipment"} opened as read-only in this sample.`, "notice"); return; }
      const copy = event.target.closest("[data-entry-copy], [data-entry-ship-copy]");
      if (copy) {
        event.preventDefault();
        const isShip = copy.hasAttribute("data-entry-ship-copy");
        const row = isShip ? findShipRow(copy.getAttribute("data-entry-ship-copy")) : findTxnRow(copy.getAttribute("data-entry-copy"));
        const text = isShip ? row?.shipmentId || "" : row?.transactionId || "";
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}.`), () => toast(`Copy ${text} from the table.`, "notice"));
        else toast(text ? `ID ${text}` : "Nothing to copy.", "notice");
        return;
      }
      const history = event.target.closest("[data-entry-history], [data-entry-ship-history]");
      if (history) {
        event.preventDefault();
        const isShip = history.hasAttribute("data-entry-ship-history");
        const row = isShip ? findShipRow(history.getAttribute("data-entry-ship-history")) : findTxnRow(history.getAttribute("data-entry-history"));
        toast(`History for ${(isShip ? row?.shipmentId : row?.transactionId) || "record"} is not available in this sample.`, "notice");
        return;
      }
      const del = event.target.closest("[data-entry-delete], [data-entry-ship-delete]");
      if (del) {
        event.preventDefault();
        const isShip = del.hasAttribute("data-entry-ship-delete");
        const row = isShip ? findShipRow(del.getAttribute("data-entry-ship-delete")) : findTxnRow(del.getAttribute("data-entry-delete"));
        toast(`Delete is disabled in this sample (${(isShip ? row?.shipmentId : row?.transactionId) || "record"}).`, "notice");
      }
    });
    page.addEventListener("input", (event) => {
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
  function suspend() { state.menuOpen = ""; state.selectOpen = ""; stopAutorefresh(); }
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
    document.addEventListener("kn-close-selects", () => { if (page.hidden || (!state.selectOpen && !state.menuOpen)) return; state.selectOpen = ""; state.menuOpen = ""; render(); });
    document.addEventListener("keydown", (event) => { if (page.hidden || event.key !== "Escape") return; if (state.selectOpen || state.menuOpen) { state.selectOpen = ""; state.menuOpen = ""; render(); } });
  }

  window.KNUsEntry = { init, sync, suspend, route: ROUTE, list() { return buildSeed(); }, listShipments() { return buildShipSeed(); } };
})();
