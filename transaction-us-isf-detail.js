(() => {
  function ux() {
    return window.KNAdminUX;
  }

  function escapeHtml(value) {
    return ux().escapeHtml(value);
  }

  function toast(content, color = "notice") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  function statusBadge(label, tone) {
    return ux().tmStatusBadge(label, tone);
  }

  // ---------------------------------------------------------------------
  // Deterministic per-row synthetic data — same seeded-by-id approach as
  // transaction-us-isf.js's buildSeed() (no Math.random, stable across renders).
  // ---------------------------------------------------------------------

  function seedFor(row) {
    const n = parseInt(String(row.id).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function pick(list, n, offset = 0) {
    return list[(n + offset) % list.length];
  }

  function pad(n, width) {
    return String(Math.abs(Math.trunc(n))).padStart(width, "0");
  }

  const SUBMISSION_TYPES = ["1 - IMPORTER SECURITY FILING", "2 - AMENDMENT", "3 - REPLACEMENT"];
  const SHIPMENT_TYPE_CODES = ["01 - STANDARD OR FCL", "02 - FTZ", "03 - IE/TE"];
  const ACTION_REASON_CODES = ["CT - COMPLETE TRANSACTION", "CU - UPDATE", "CD - DELETE"];
  const MOTS = ["11 - OCEAN VESSEL", "40 - AIR", "30 - TRUCK"];
  const BOND_ACTIVITY_CODES = ["01 - IMPORTER OR BROKER", "02 - CUSTOMS BROKER"];
  const BOND_TYPES = ["8 - CONTINUOUS", "9 - SINGLE"];
  const SHIPMENT_SUB_TYPES = ["CONSOLIDATED", "DIRECT", "SPLIT"];
  const PORTS = [
    { code: "VNHPH", label: "HAIPHONG, VN" },
    { code: "CNSHA", label: "SHANGHAI, CN" },
    { code: "CNNGB", label: "NINGBO, CN" },
    { code: "CNYTN", label: "YANTIAN, CN" },
    { code: "INNSA", label: "NHAVA SHEVA, IN" },
    { code: "THLCH", label: "LAEM CHABANG, TH" }
  ];
  const SCACS = ["COSU", "MAEU", "MSCU", "EGLV", "HDMU", "ONEY"];
  const HTS_CODES = ["3920100000", "5407619930", "6110202079", "3926909990", "8544429090"];
  const GOODS = ["EVA FILM", "FILM & POE FILM", "KNIT APPAREL", "PLASTIC HOUSEWARES", "CABLE ASSEMBLIES"];
  const ID_TYPES = ["EI - EMPLOYER IDENTIFICATION NUMBER", "SS - SOCIAL SECURITY NUMBER", "CB - CBP ASSIGNED NUMBER"];
  const STATES = ["OH", "CA", "IL", "TX", "GA", "NJ"];
  // Order and labels match the production Parties accordion exactly.
  const PARTY_ROLES = [
    { id: "importer", label: "Importer", group: "primary" },
    { id: "consignee", label: "Consignee", group: "primary" },
    { id: "buyer", label: "Buyer", group: "primary" },
    { id: "seller", label: "Seller", group: "primary" },
    { id: "shipTo", label: "Ship To", group: "logistics" },
    { id: "manufacturers", label: "Manufacturers", group: "logistics" },
    { id: "containerStuffing", label: "Container Stuffing Location", group: "logistics" },
    { id: "consolidator", label: "Consolidator", group: "logistics" }
  ];
  const PARTY_GROUPS = [
    { id: "primary", label: "Primary Parties" },
    { id: "logistics", label: "Logistics Parties" }
  ];
  const CITIES = ["Ho Chi Minh City", "Shenzhen", "Ningbo", "Columbus", "Los Angeles", "Chicago", "Dallas", "Pataskala"];

  const detailCache = new Map();

  function buildIsfDetail(row) {
    if (detailCache.has(row.id)) {
      return detailCache.get(row.id);
    }
    const n = seedFor(row);
    const port = pick(PORTS, n, 1);
    const hasSubType = n % 7 !== 0; // ~1 in 7 rows left unselected, like the reference screenshot
    const estimatedValue = hasSubType ? ((n * 137) % 480000) / 10 : 0;
    const header = {
      submissionType: pick(SUBMISSION_TYPES, n),
      shipmentTypeCode: pick(SHIPMENT_TYPE_CODES, n, 1),
      actionReasonCode: pick(ACTION_REASON_CODES, n, 2),
      voyage: `${100 + ((n * 3) % 900)}${pick(["N", "E", "S", "W"], n)}`,
      originCountry: row.country,
      originPort: port,
      estimatedValue,
      estimatedQuantity: 50 + ((n * 13) % 900),
      totalGrossWeight: (((n * 271) % 200000000) / 1000).toFixed(3),
      mot: pick(MOTS, n, 1),
      scac: pick(SCACS, n),
      bondHolder: `9${pad((n * 97) % 100000000, 8)}`,
      bondActivityCode: pick(BOND_ACTIVITY_CODES, n),
      bondType: pick(BOND_TYPES, n, 1),
      shipmentSubType: hasSubType ? pick(SHIPMENT_SUB_TYPES, n) : ""
    };
    const billOnFile = n % 3 !== 0; // ~2 in 3 rows have a matched bill, like the reference recording
    // 1-3 BOL rows, each independently matched/unmatched — stress-tests the table
    // with multiple rows instead of always exactly one.
    const bol = Array.from({ length: 1 + (n % 3) }, (_, i) => ({
      shipmentId: i === 0 ? row.shipments : `${row.shipments}-${i + 1}`,
      type: pick(["OCEAN", "AIR", "TRUCK"], n, i),
      billOfLading: i === 0 ? row.mbl : `${row.mbl}${i}`,
      status: (n + i) % 3 !== 0 ? "ACCEPTED" : "NO BILL MATCH (NOT ON FILE)"
    }));
    const manufacturerName = `${pick(["Betterial", "Retrieval", "Summit", "Heritage", "Atlas"], n, 2)} ${row.country.split(" - ")[0] || ""} Film Technology Company`.trim();
    const partyNames = {
      importer: row.companyName,
      manufacturers: manufacturerName,
      consignee: row.companyName,
      shipTo: row.companyName,
      seller: manufacturerName,
      buyer: row.companyName,
      containerStuffing: manufacturerName,
      consolidator: manufacturerName
    };
    const parties = PARTY_ROLES.map((role, i) => {
      // ~1 in 5 parties is missing a required field — surfaced as a completeness
      // badge on the collapsed row, same "flag what needs attention" idea as the
      // Header tab's amber Estimated Value / Shipment Sub-Type indicators.
      const missingField = (n + i) % 5 === 0 ? pick(["idNumber", "zip"], n, i) : "";
      return {
        id: role.id,
        group: role.group,
        role: role.label,
        name: partyNames[role.id],
        fullName: partyNames[role.id],
        idType: pick(ID_TYPES, n, i),
        idNumber: missingField === "idNumber" ? "" : `9${pad((n * (i + 97)) % 100000000, 8)}`,
        city: pick(CITIES, n, i),
        state: pick(STATES, n, i),
        zip: missingField === "zip" ? "" : String(10000 + ((n * (i + 31)) % 89999)),
        country: "US - United States of America",
        complete: !missingField
      };
    });
    // 1-4 merchandise lines and 0-3 containers — wider spread than a single row,
    // to stress-test table rendering (including the genuinely-empty case).
    const merchandise = Array.from({ length: 1 + (n % 4) }, (_, i) => ({
      hts: pick(HTS_CODES, n, i),
      co: row.country,
      mfr: manufacturerName,
      description: pick(GOODS, n, i)
    }));
    const containerCount = n % 4; // 0, 1, 2, or 3
    const container = Array.from({ length: containerCount }, (_, i) => ({
      containerNumber: `${pick(SCACS, n, i)}U${pad((n * 41 + i * 777) % 10000000, 7)}`,
      sealNumber: `SL${pad((n * 59 + i * 331) % 1000000, 6)}`,
      sizeType: pick(["40HC", "40GP", "20GP", "45HC"], n, i),
      grossWeight: `${(Number(header.totalGrossWeight) / Math.max(containerCount, 1)).toFixed(3)} KG`
    }));
    const hasReferences = n % 5 === 0;
    const references = hasReferences
      ? [{ entryNumber: `E${pad((n * 29) % 100000000, 8)}`, type: "ENTRY", relatedTo: row.transactionId }]
      : [];
    // Variable-length history (3-6 rows) to stress-test the scrollable status
    // panel; rows read most-recent-first, like the reference recording. Every
    // row — not just NO BILL MATCH ones — carries a Bol Status detail row in
    // the real app, so every entry here gets a `desc` and expands the same way.
    const NO_BILL_MATCH = "NO BILL MATCH (NOT ON FILE)";
    const historyTemplates = billOnFile
      ? [
          { type: "01", status: "SENT", tone: "neutral", desc: "ISF filing transmitted to CBP for processing." },
          { type: "02", status: "ACCEPTED", tone: "positive", desc: "ISF filing accepted by CBP; no further action required." },
          { type: "S1", status: "BILL ON FILE", tone: "positive", desc: "Bill of lading matched and confirmed on file with CBP." }
        ]
      : [
          { type: "01", status: "SENT", tone: "neutral", desc: "ISF filing transmitted to CBP for processing." },
          { type: "S2", status: NO_BILL_MATCH, tone: "negative", desc: `${NO_BILL_MATCH}: Generated when the ISF bill is NOT on file in AMS immediately after filing.` },
          { type: "S4", status: NO_BILL_MATCH, tone: "negative", desc: `${NO_BILL_MATCH}: Generated when the ISF bill is NOT on file in AMS 20 days after filing.` },
          { type: "S5", status: NO_BILL_MATCH, tone: "negative", desc: `${NO_BILL_MATCH}: Generated when the ISF bill is NOT on file in AMS 30 days after filing.` }
        ];
    const historyCount = Math.min(historyTemplates.length + (n % 3), 6);
    const statusHistory = Array.from({ length: historyCount }, (_, i) => {
      const tpl = historyTemplates[Math.min(i, historyTemplates.length - 1)];
      return {
        fileId: row.transactionId,
        type: tpl.type,
        status: tpl.status,
        tone: tpl.tone,
        bolDetail: { bolNumber: row.mbl, dispositionCode: tpl.type, description: tpl.desc },
        offsetMin: i
      };
    }).reverse();
    // BL/CI/PL/ISF are the categories KlearNow brokers actually need on file to
    // support a filing (see DOC_CATEGORIES' `required` flag) — each gets a rare,
    // distinct-modulus zero case so different rows demonstrate a missing required
    // document without every required category going missing on the same row.
    const docCounts = {
      EML: 1 + (n % 4),
      BL: n % 7 === 0 ? 0 : 1 + ((n + 1) % 3),
      AN: 1 + ((n + 2) % 3),
      CR: 1 + ((n + 3) % 3),
      ES: 1 + ((n + 4) % 3),
      CI: n % 11 === 0 ? 0 : 1 + ((n + 5) % 2),
      ISF: n % 17 === 0 ? 0 : 1 + ((n + 6) % 2),
      PL: n % 13 === 0 ? 0 : 1 + ((n + 7) % 2),
      MISC: 1 + ((n + 8) % 3)
    };
    const cbpTransactionNo = `S1F-${pad((n * 83) % 100000000, 8)}`;
    const detail = { header, bol, parties, merchandise, container, references, statusHistory, docCounts, cbpTransactionNo };
    detailCache.set(row.id, detail);
    return detail;
  }

  // ---------------------------------------------------------------------
  // View state (tab / doc category / zoom / select-open) — module-level,
  // reset whenever the viewed row changes, same convention as every other
  // page module in this app.
  // ---------------------------------------------------------------------

  const TABS = [
    { id: "header", label: "Header" },
    { id: "bol", label: "BOL" },
    { id: "parties", label: "Parties" },
    { id: "merchandise", label: "Merchandise" },
    { id: "container", label: "Container" },
    { id: "references", label: "References" }
  ];

  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 10;

  // `required: true` marks the categories a KlearNow broker actually needs on
  // file to support and defend a filing (bill of lading, commercial invoice,
  // packing list, and the ISF filing confirmation itself) — everything else
  // (emails, arrival notice, cargo release, misc) is supplementary and fine
  // to have zero of. Only required categories get a "missing" rail treatment.
  const DOC_CATEGORIES = [
    { id: "EML", label: "Emails", singular: "Email", icon: () => iconCatEmail() },
    { id: "BL", label: "Bill of Lading", singular: "Bill Of Lading", required: true, icon: () => iconCatVessel() },
    { id: "AN", label: "Arrival Notice", singular: "Arrival Notice", icon: () => iconCatArrival() },
    { id: "CR", label: "Cargo Release", singular: "Cargo Release", icon: () => iconCatRelease() },
    { id: "ES", label: "Entry Summary", singular: "Entry Summary", icon: () => iconCatSummary() },
    { id: "CI", label: "Commercial Invoice", singular: "Commercial Invoice", required: true, icon: () => iconCatInvoice() },
    { id: "ISF", label: "ISF Filing", singular: "ISF Document", required: true, icon: () => iconCatShield() },
    { id: "PL", label: "Packing List", singular: "Packing List", required: true, icon: () => iconCatPacking() },
    { id: "MISC", label: "Miscellaneous", singular: "MISC", icon: () => iconDocCat() }
  ];

  // Placeholder document-type catalog for the "Add More Documents" modal —
  // same loose "index - CODE - Description" shape as the reference app's
  // list, not the full real CBP master data.
  const DOC_TYPE_OPTIONS = [
    { id: "7533", label: "123 - 7533 - 7533" },
    { id: "ABI", label: "32 - ABI - ABI Notes" },
    { id: "ACR", label: "126 - ACR - ACR" },
    { id: "ADCVD", label: "88 - ADCVD - ADCVD" },
    { id: "AGR", label: "140 - AGR - American Goods Returned" },
    { id: "BOL", label: "12 - BOL - Bill of Lading" },
    { id: "CI", label: "45 - CI - Commercial Invoice" },
    { id: "COO", label: "77 - COO - Certificate of Origin" },
    { id: "PKL", label: "58 - PKL - Packing List" },
    { id: "PWR", label: "19 - PWR - Power of Attorney" }
  ];

  const state = {
    rowId: "",
    tab: "header",
    docCategory: "ISF",
    // Which rail folder is visually opened to show its individual documents —
    // usually mirrors docCategory, but can be independently collapsed without
    // losing the active preview (re-clicking its own header toggles this off).
    docRailOpen: "ISF",
    docIndex: 0,
    zoom: 100,
    selectOpen: "",
    statusOpen: false,
    statusRowExpanded: new Set(),
    partiesExpanded: new Set(),
    // "" | "print" | "add" | "obsolete" — which document-toolbar modal is open.
    docModal: "",
    printSelected: new Set(),
    addDocType: "",
    addDocQuery: "",
    obsoleteChoice: "obsolete",
    // KlearAgent field review — the actual "agentic" mechanic (Section 4.1 of
    // the Agentic Broker doc): the agent proposes, the broker decides. Keyed
    // by a stable per-field id; "accepted" upgrades a draft to final,
    // "rejected" flags it back to the broker for manual entry. aiPanelOpen
    // holds the key of whichever field's review popover is currently open.
    aiFieldOverrides: {},
    aiPanelOpen: ""
  };

  function resetIfNewRow(row, keepTab) {
    if (state.rowId !== row.id) {
      state.rowId = row.id;
      // Prev/Next keeps the tab the broker was already reading (matches
      // shipment-detail.js's prev/next); everything else is per-record.
      if (!keepTab) {
        state.tab = "header";
      }
      state.docCategory = "ISF";
      state.docRailOpen = "ISF";
      state.docIndex = 0;
      state.zoom = 100;
      state.selectOpen = "";
      state.statusOpen = false;
      state.statusRowExpanded = new Set();
      state.partiesExpanded = new Set();
      state.docModal = "";
      state.printSelected = new Set();
      state.addDocType = "";
      state.addDocQuery = "";
      state.obsoleteChoice = "obsolete";
      state.aiFieldOverrides = {};
      state.aiPanelOpen = "";
    }
  }

  // Text shown inside the KlearAgent review popover, per effective AI state.
  const AI_RATIONALE = {
    final: "KlearAgent extracted this value from the source documents with high confidence.",
    draft: "KlearAgent extracted this value from the source documents but confidence was below the auto-accept threshold. Please review before filing.",
    accepted: "You confirmed this value. KlearAgent's original suggestion is unchanged.",
    rejected: "You rejected KlearAgent's suggested value. This field needs manual entry before filing."
  };

  // Renders as a real (disabled) KlearNow input box — matching the reference app's own
  // "prefilled, non-editable" field chrome — rather than plain label/value text.
  // Reuses .kn-field__control's existing :disabled styling as-is; only status-
  // bearing icons (warning/info/date) are kept, since anything implying an action
  // (search, clear, choose) would be misleading on a field that can't be acted on.
  //
  // opts.ai: "final" | "draft" — base KlearAgent field-fill state (Agentic
  // Broker doc §6.4). opts.aiKey: a stable id for this field, required to
  // make the flag interactive. The agent's whole point per §4.1 is that it
  // *proposes* and the broker *decides* — so unlike the other flags, the AI
  // one is a real button: click it to open a small KlearAgent review
  // popover with the fill rationale and Accept/Reject actions. Accepting a
  // draft promotes it; rejecting flags it back for manual entry. Both are
  // reopenable, so the broker can revisit or reverse a decision.
  function field(label, value, opts = {}) {
    const empty = value === "" || value == null;
    const aiEffective = opts.ai && !empty ? state.aiFieldOverrides[opts.aiKey] || opts.ai : "";
    let flag = "";
    if (opts.warn && empty) {
      flag = `<span class="isf-field-flag isf-field-flag--warn" aria-hidden="true">${iconFieldWarn()}</span>`;
    } else if (opts.info) {
      flag = `<span class="isf-field-flag isf-field-flag--info" aria-hidden="true">${iconFieldInfo()}</span>`;
    } else if (aiEffective) {
      const isOpen = state.aiPanelOpen === opts.aiKey;
      const iconByState = { final: iconFieldAiFinal(), accepted: iconFieldAiFinal(), draft: iconFieldAiDraft(), rejected: iconFieldWarn() };
      const labelByState = { final: "KlearAgent filled this — high confidence", accepted: "You confirmed KlearAgent's suggestion", draft: "KlearAgent filled this — click to review", rejected: "Rejected — needs manual entry" };
      const popover = isOpen
        ? `<div class="isf-ai-panel" role="dialog" aria-label="KlearAgent field review">
            <div class="isf-ai-panel__head">
              <span class="isf-ai-panel__badge">KlearAgent</span>
              <button class="icon-btn" type="button" data-isf-ai-close aria-label="Close">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
              </button>
            </div>
            <p class="type-caption-sm isf-ai-panel__msg">${escapeHtml(AI_RATIONALE[aiEffective])}</p>
            <div class="isf-ai-panel__actions">
              <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-isf-ai-reject="${escapeHtml(opts.aiKey)}"${aiEffective === "rejected" ? " disabled" : ""}>Reject</button>
              <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-isf-ai-accept="${escapeHtml(opts.aiKey)}"${aiEffective === "final" || aiEffective === "accepted" ? " disabled" : ""}>Accept</button>
            </div>
          </div>`
        : "";
      flag = `<span class="isf-field-flag-wrap">
        <button class="isf-field-flag isf-field-flag--ai-${aiEffective}" type="button" data-isf-ai-toggle="${escapeHtml(opts.aiKey)}" aria-haspopup="dialog" aria-expanded="${isOpen}" aria-label="${escapeHtml(labelByState[aiEffective])}" data-tooltip="${escapeHtml(labelByState[aiEffective])}">${iconByState[aiEffective]}</button>
        ${popover}
      </span>`;
    }
    const displayValue = empty ? "" : String(value);
    const placeholder = opts.date ? "DD-MM-YYYY" : opts.placeholder || "—";
    const trailingIcon = opts.date
      ? '<span class="isf-input-field__icon" aria-hidden="true">' + iconCalendar() + "</span>"
      : "";
    return `<div class="form-display-field">
      <span class="form-display-field__label">${escapeHtml(label)}${flag}</span>
      <div class="isf-input-field">
        <input class="kn-field__control isf-input-field__control" type="text" value="${escapeHtml(displayValue)}" placeholder="${escapeHtml(placeholder)}" disabled aria-label="${escapeHtml(label)}" />
        ${trailingIcon}
      </div>
    </div>`;
  }

  function renderHeaderTab(row, detail) {
    const h = detail.header;
    // Deterministic per-row/per-field AI fill state — most fields land as
    // "final" (KlearAgent extracted with high confidence), roughly 1 in 5 as
    // "draft" (extracted but flagged for broker review), seeded so it's
    // stable across renders but varies by row like the rest of this file's
    // synthetic data. Each field gets a stable key so accept/reject
    // decisions (stored in state.aiFieldOverrides) survive re-renders.
    const n = seedFor(row);
    let aiIndex = 0;
    const ai = (name) => ({ ai: (n + aiIndex++) % 5 === 0 ? "draft" : "final", aiKey: `header:${row.id}:${name}` });
    return `<div class="isf-detail-grid">
      ${field("ISF Submission Type", h.submissionType, ai("submissionType"))}
      ${field("Shipment Type Code", h.shipmentTypeCode, ai("shipmentTypeCode"))}
      ${field("Action Reason Code", h.actionReasonCode, ai("actionReasonCode"))}
      ${field("Vessel", `${row.vesselName}, ${row.vesselId}`, ai("vessel"))}
      ${field("Voyage", h.voyage, ai("voyage"))}
      ${field("Origin Country", h.originCountry, ai("originCountry"))}
      ${field("Origin Port", h.originPort.label, { info: true })}
      ${field("Estimated Value", h.estimatedValue.toFixed(1), { warn: true })}
      ${field("Estimated Quantity", h.estimatedQuantity, ai("estimatedQuantity"))}
      ${field("Units", "PKG - PACKAGE")}
      ${field("Total Gross Weight", h.totalGrossWeight, ai("totalGrossWeight"))}
      ${field("Units", "KILOS")}
      ${field("Mode of Transportation", h.mot, ai("mot"))}
      ${field("SCAC Identifier", h.scac, ai("scac"))}
      ${field("Bond Holder", h.bondHolder, ai("bondHolder"))}
      ${field("Bond Activity Code", h.bondActivityCode, ai("bondActivityCode"))}
      ${field("Bond Type", h.bondType, ai("bondType"))}
      ${field("Shipment Sub-Type", h.shipmentSubType, { warn: true, placeholder: "Select" })}
      ${field("ETD", row.etd, { date: true, ...ai("etd") })}
      ${field("Filed Date", row.filingDate, { date: true, ...ai("filedDate") })}
    </div>`;
  }

  // A plain data table with an "+ Add" affordance below — the shape BOL,
  // Merchandise, and Container all share in the reference recording.
  function editableTable(columns, rows, opts = {}) {
    const body = rows.length
      ? rows
          .map(
            (row) => `<tr>
          ${columns.map((col) => `<td class="type-body-sm">${col.render ? col.render(row) : escapeHtml(row[col.key] ?? "")}</td>`).join("")}
          <td class="isf-row-delete"><button class="icon-btn" type="button" data-isf-detail-inert="Removing a row is not available in this sample." aria-label="Remove row">${iconTrash()}</button></td>
        </tr>`
          )
          .join("")
      : "";
    return `<div class="isf-editable-table">
      ${rows.length
        ? `<div class="vis-table-wrap role-table-card">
        <div class="vis-table-scroll">
          <table class="vis-table vis-table--admin">
            <thead>
              <tr class="vis-table__labels">
                ${columns.map((col) => `<th scope="col">${escapeHtml(col.label)}${col.info ? " ⓘ" : ""}</th>`).join("")}
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>`
        : ""}
      <div class="isf-editable-table__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-isf-detail-inert="Adding a row is not available in this sample.">${iconAdd()} Add</button>
        ${opts.extraAction || ""}
      </div>
    </div>`;
  }

  function renderBolTab(row, detail) {
    return editableTable(
      [
        { key: "shipmentId", label: "Shipment ID" },
        { key: "type", label: "Type" },
        { key: "billOfLading", label: "Bill of Lading", info: true },
        {
          key: "status",
          label: "Status",
          render: (r) => `<strong>${escapeHtml(r.status)}</strong>`
        },
        { key: "doc", label: "Doc", render: () => `<span class="isf-table-icon">${iconDocCat()}</span>` }
      ],
      detail.bol,
      {
        extraAction: `<button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-isf-detail-inert="Searching bills of lading is not available in this sample.">${iconSearch()} Search BOLs</button>`
      }
    );
  }

  // Parties tab reuses the app's real accordion primitive (window.KNAdminUX.accordionItem
  // / handleAccordionClick — the same component that drives the permission-category
  // accordion in Role Management) instead of bespoke markup, so it inherits the house
  // chevron-rotate treatment, hover/open states, and spacing for free.
  function renderPartiesTab(row, detail) {
    const completeCount = detail.parties.filter((p) => p.complete).length;
    const allExpanded = detail.parties.every((p) => state.partiesExpanded.has(p.id));
    return `<div class="isf-parties">
      <div class="kn-field__head isf-parties__head">
        <span class="type-caption-sm type-weight-medium kn-field__label kn-form-label">${completeCount} of ${detail.parties.length} parties complete</span>
        <button class="kn-link type-caption-sm" type="button" data-isf-parties-expand-all>${allExpanded ? "Collapse All" : "Expand All"}</button>
      </div>
      ${PARTY_GROUPS.map((group) => {
        const groupParties = detail.parties.filter((p) => p.group === group.id);
        return `<div class="isf-parties__group">
          <h3 class="type-caption-sm type-weight-semibold isf-parties__group-label">${escapeHtml(group.label)}</h3>
          <div class="role-perm">
            ${groupParties.map((p) => renderPartyAccordionItem(p)).join("")}
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderPartyAccordionItem(p) {
    const open = state.partiesExpanded.has(p.id);
    const badge = p.complete
      ? `<span class="badge badge--positive type-caption-sm type-weight-medium kn-badge">Complete</span>`
      : `<span class="badge badge--notice type-caption-sm type-weight-medium kn-badge">Needs info</span>`;
    const n = seedFor(p);
    let aiIndex = 0;
    const ai = (name) => ({ ai: (n + aiIndex++) % 5 === 0 ? "draft" : "final", aiKey: `party:${p.id}:${name}` });
    const body = `<div class="isf-detail-grid isf-detail-grid--party">
      ${field("Full Name", p.fullName, ai("fullName"))}
      ${field("Identification Type", p.idType, ai("idType"))}
      ${field("Identification Number", p.idNumber, { warn: true, placeholder: "Missing" })}
      ${field("City", p.city, ai("city"))}
      ${field("State / Province", p.state, ai("state"))}
      ${field("Zip / Postal Code", p.zip, { warn: true, placeholder: "Missing" })}
      ${field("Country", p.country, ai("country"))}
    </div>`;
    return ux().accordionItem({
      id: p.id,
      title: p.role,
      leadingExtra: `<span class="type-ui-sm isf-parties__company">${escapeHtml(p.name)}</span>`,
      trailing: badge,
      open,
      body
    });
  }

  function renderMerchandiseTab(row, detail) {
    return editableTable(
      [
        { key: "hts", label: "HTS", render: (r) => `<span class="code">${escapeHtml(r.hts)}</span>` },
        { key: "co", label: "C/O" },
        { key: "mfr", label: "MFR" },
        { key: "description", label: "Description" }
      ],
      detail.merchandise
    );
  }

  function renderContainerTab(row, detail) {
    return editableTable(
      [
        { key: "containerNumber", label: "Container Number" },
        { key: "sealNumber", label: "Seal Number" },
        { key: "sizeType", label: "Size / Type" },
        { key: "grossWeight", label: "Gross Weight" }
      ],
      detail.container
    );
  }

  function renderReferencesTab(row, detail) {
    return editableTable(
      [
        { key: "entryNumber", label: "Entry Number" },
        { key: "type", label: "Type" },
        { key: "relatedTo", label: "Related To" }
      ],
      detail.references
    );
  }

  function iconStatusTone(tone) {
    if (tone === "negative") {
      return '<span class="isf-status-icon isf-status-icon--negative" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.75" fill="currentColor"/></svg></span>';
    }
    if (tone === "positive") {
      return '<span class="isf-status-icon isf-status-icon--positive" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span>';
    }
    return '<span class="isf-status-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg></span>';
  }

  // A connected vertical timeline (marker + line + title/meta), matching
  // StepGroup pattern for exactly this shape of data — a sequential
  // status history — instead of a flat list of unrelated-looking rows.
  function renderStatusPanel(row, detail) {
    if (!state.statusOpen) {
      return "";
    }
    const base = new Date(Date.UTC(2024, 11, 17, 1, 30, 0));
    const entries = detail.statusHistory;
    return `<div class="isf-status-panel">
      <div class="isf-status-timeline">
        ${entries
          .map((entry, i) => {
            const rowId = `${entry.fileId}-${entry.type}-${i}`;
            const ts = new Date(base.getTime() + entry.offsetMin * 60000);
            const stamp = `${ts.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${ts.toISOString().slice(11, 19)} UTC`;
            const expandable = Boolean(entry.bolDetail);
            const open = expandable && state.statusRowExpanded.has(rowId);
            const isLast = i === entries.length - 1;
            const chevron = expandable
              ? `<button class="icon-btn" type="button" data-isf-status-row-toggle="${escapeHtml(rowId)}" aria-expanded="${open}" aria-label="Expand BOL status"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" style="transform: rotate(${open ? "180deg" : "0deg"})"><path d="M4 6l4 4 4-4"/></svg></button>`
              : "";
            return `<div class="isf-status-step isf-status-step--${entry.tone}${isLast ? " isf-status-step--last" : ""}">
              <div class="isf-status-step__rail" aria-hidden="true">
                <span class="isf-status-step__marker">${iconStatusTone(entry.tone)}</span>
              </div>
              <div class="isf-status-step__content">
                <div class="isf-status-step__row">
                  <div class="isf-status-step__main">
                    <span class="type-body-sm type-weight-semibold isf-status-step__title isf-status-step__title--${entry.tone}">${escapeHtml(entry.status)}</span>
                    <span class="type-caption-sm isf-status-step__meta">${escapeHtml(entry.fileId)} · ${escapeHtml(entry.type)} · ${escapeHtml(stamp)}</span>
                  </div>
                  <div class="isf-status-step__trailing">
                    <button class="kn-link type-caption-sm" type="button" data-isf-detail-inert="Raw EDI is not available in this sample.">Raw EDI</button>
                    ${chevron}
                  </div>
                </div>
                ${
                  open
                    ? `<div class="vis-table-wrap role-table-card isf-bol-status">
                  <div class="vis-table-scroll">
                    <table class="vis-table vis-table--admin">
                      <thead>
                        <tr class="vis-table__labels">
                          <th scope="col">Bol Number</th>
                          <th scope="col">Disposition Code</th>
                          <th scope="col">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="type-body-sm">${escapeHtml(entry.bolDetail.bolNumber)}</td>
                          <td class="type-body-sm">${escapeHtml(entry.bolDetail.dispositionCode)}</td>
                          <td class="type-body-sm">${escapeHtml(entry.bolDetail.description)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>`
                    : ""
                }
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  function renderTabBody(row, detail) {
    switch (state.tab) {
      case "bol":
        return renderBolTab(row, detail);
      case "parties":
        return renderPartiesTab(row, detail);
      case "merchandise":
        return renderMerchandiseTab(row, detail);
      case "container":
        return renderContainerTab(row, detail);
      case "references":
        return renderReferencesTab(row, detail);
      default:
        return renderHeaderTab(row, detail);
    }
  }

  function iconZoomIn() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>`;
  }
  function iconZoomOut() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>`;
  }
  function iconPrint() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/></svg>`;
  }
  function iconAdd() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
  }
  function iconSearch() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  }
  function iconExternal() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>`;
  }
  function iconDownload() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`;
  }
  function iconCalendar() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
  }
  function iconDocCat() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>`;
  }
  // Distinct per-category rail icons — same 24x24/stroke-1.75 language as
  // iconDocCat(), but semantically matched (envelope, ship, invoice, shield…)
  // so the rail is scannable by shape, not just by reading the 3-letter code.
  function iconCatEmail() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>`;
  }
  function iconCatVessel() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16h16l-2 4H6l-2-4Z"/><path d="M12 4v9"/><path d="M12 5c3 0 5 2 5 5h-5V5Z"/></svg>`;
  }
  function iconCatArrival() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.25"/></svg>`;
  }
  function iconCatRelease() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>`;
  }
  function iconCatSummary() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`;
  }
  function iconCatInvoice() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>`;
  }
  function iconCatShield() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 19 6v5.5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6l7-2.5Z"/><path d="m9 12 2 2 4-4.5"/></svg>`;
  }
  function iconCatPacking() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>`;
  }
  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>`;
  }
  // Same icon language as shipment-detail.js's MOT_ICONS (back/next/copy) for
  // visual consistency between the two detail pages.
  function iconBack() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`;
  }
  function iconNext() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
  }
  function iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }
  function iconFlag() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>`;
  }
  // Field-flag icons — same stroke language as the rest of the icon set, unlike the
  // raw ⚠/ⓘ glyphs they replace, which render as inconsistent, mismatched-weight
  // emoji on some platforms.
  function iconFieldWarn() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none"/></svg>`;
  }
  function iconFieldInfo() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none"/></svg>`;
  }
  function iconFieldAiFinal() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`;
  }
  // The app's own established "AI suggested this" mark (Role Management,
  // Default Role Management, admin-ux.js all use this exact glyph+class) —
  // reused verbatim instead of a custom-drawn sparkle icon, so a KlearAgent
  // draft field looks like every other AI-suggested thing in this app.
  function iconFieldAiDraft() {
    return `<span class="ai-suggest-mark" aria-hidden="true">✦</span>`;
  }

  function docReceivedDate(row, catId, index) {
    // Deterministic per-document date — each document in a category was
    // "received" a little earlier than the next, most recent first.
    const n = seedFor(row);
    const base = new Date(Date.UTC(2024, 11, 16, 12, 0, 0));
    const catOffset = catId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const daysBack = (n + catOffset + index * 3) % 45;
    const date = new Date(base.getTime() - daysBack * 86400000);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  }

  // Deterministic doc-package code, shipment-constant middle segment (e.g. "M4C0")
  // plus a per-category/index suffix — same shape as the reference app's
  // "KX-M4C0-45" IDs, in place of this sample's earlier row-shipment-ID label.
  const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function docMidCode(row) {
    const n = seedFor(row);
    const l1 = CODE_LETTERS[n % CODE_LETTERS.length];
    const d1 = (n * 7) % 10;
    const l2 = CODE_LETTERS[Math.floor(n / 7) % CODE_LETTERS.length];
    const d2 = (n * 3) % 10;
    return `${l1}${d1}${l2}${d2}`;
  }
  function docCode(row, catId, index) {
    const n = seedFor(row);
    const suffix = pad((n * 17 + index * 43) % 100, 2);
    return `${catId}-${docMidCode(row)}-${suffix}`;
  }

  function renderDocPanel(row, detail) {
    const activeCat = state.docCategory;
    const docList = Array.from({ length: detail.docCounts[activeCat] ?? 1 }, (_, i) => ({
      id: `${activeCat}-${i + 1}`,
      label: docCode(row, activeCat, i),
      date: docReceivedDate(row, activeCat, i)
    }));
    const selected = docList[Math.min(state.docIndex, docList.length - 1)] || docList[0];
    const requiredCats = DOC_CATEGORIES.filter((cat) => cat.required);
    const requiredMissing = requiredCats.filter((cat) => (detail.docCounts[cat.id] || 0) === 0);
    const requiredTotal = requiredCats.length;
    return `<div class="isf-doc-panel">
      <div class="isf-doc-toolbar">
        <button class="icon-btn" type="button" data-isf-print-open aria-label="Print" data-tooltip="Print">${iconPrint()}</button>
        ${ux().select({
          id: "kn-isf-detail-doc-select",
          name: "isfDetailDoc",
          value: selected ? selected.id : "",
          options: docList,
          placeholder: "Select a document",
          openKey: "isf-detail-doc",
          open: state.selectOpen,
          compact: true
        })}
        <button class="icon-btn" type="button" data-isf-add-doc-open aria-label="Add document" data-tooltip="Add">${iconAdd()}</button>
        <button class="icon-btn" type="button" data-isf-detail-inert="Search is not available in this sample." aria-label="Search document" data-tooltip="Search">${iconSearch()}</button>
        <button class="icon-btn" type="button" data-isf-obsolete-open aria-label="Mark obsolete" data-tooltip="Mark Obsolete">${iconFlag()}</button>
        <button class="icon-btn" type="button" data-isf-detail-inert="Opening in a new window is not available in this sample." aria-label="Show image in new window" data-tooltip="Open in new window">${iconExternal()}</button>
        <button class="icon-btn" type="button" data-isf-detail-inert="Download is not available in this sample." aria-label="Download" data-tooltip="Download">${iconDownload()}</button>
      </div>
      <div class="isf-doc-meta">
        <span class="type-caption-sm isf-doc-date">${escapeHtml(selected ? selected.date : "")}</span>
        <span class="type-caption-sm isf-doc-required${requiredMissing.length === requiredTotal ? " isf-doc-required--negative" : requiredMissing.length ? " isf-doc-required--warn" : ""}">
          ${requiredMissing.length ? iconFieldWarn() : ""} ${requiredTotal - requiredMissing.length} of ${requiredTotal} required documents received
        </span>
      </div>
      <div class="isf-doc-body">
        <div class="isf-doc-rail-scroll">
        <div class="isf-doc-rail" role="tablist" aria-label="Document categories">
          ${DOC_CATEGORIES.map((cat) => {
            const count = detail.docCounts[cat.id] || 0;
            const missing = Boolean(cat.required) && count === 0;
            const isOpen = state.docRailOpen === cat.id;
            const tooltip = missing ? `${cat.label} — required, not yet received` : cat.label;
            const badge = missing
              ? `<span class="isf-doc-rail__count isf-doc-rail__count--missing" aria-hidden="true">${iconFieldWarn()}</span>`
              : `<span class="badge badge--information isf-doc-rail__count kn-badge">${count}</span>`;
            const header = `<button class="isf-doc-rail__item${cat.id === activeCat ? " is-active" : ""}${isOpen ? " is-open" : ""}${missing ? " isf-doc-rail__item--missing" : ""}" type="button" role="tab" aria-selected="${cat.id === activeCat}" aria-expanded="${isOpen}" tabindex="${cat.id === activeCat ? "0" : "-1"}" data-isf-doc-cat="${cat.id}" data-tooltip="${escapeHtml(tooltip)}">
              ${cat.icon()}
              <span class="isf-doc-rail__code">${escapeHtml(cat.id)}</span>
              ${badge}
            </button>`;
            // Cap how many document circles render before the list scrolls within
            // itself (rather than pushing every category below it far down the
            // page) — real backend data isn't bounded to the 1-4 docs/category
            // this sample generates. An empty optional category (count 0, not
            // `required`) gets a plain-language empty state instead of an inert
            // blank box.
            const DOC_RAIL_VISIBLE_CAP = 8;
            const docs = isOpen
              ? count === 0
                ? `<div class="isf-doc-rail__docs isf-doc-rail__docs--empty type-caption-sm" data-tooltip="No documents in this category">None</div>`
                : `<div class="isf-doc-rail__docs${count > DOC_RAIL_VISIBLE_CAP ? " isf-doc-rail__docs--scroll" : ""}">
                  ${Array.from(
                    { length: count },
                    (_, i) => `<button class="isf-doc-rail__doc${state.docIndex === i ? " is-active" : ""}" type="button" data-isf-doc-index="${i}" data-tooltip="${escapeHtml(cat.label)} ${i + 1}">${i + 1}</button>`
                  ).join("")}
                </div>`
              : "";
            return header + docs;
          }).join("")}
        </div>
        </div>
        <div class="isf-doc-preview" style="--isf-doc-zoom: ${state.zoom}%">
          <div class="isf-doc-preview__placeholder">
            ${iconDocCat()}
            <p class="type-body-sm type-weight-medium">${escapeHtml(selected ? selected.label : "No document")}</p>
            <p class="type-caption-sm">Preview not available in this sample.</p>
          </div>
        </div>
      </div>
      <div class="isf-doc-zoom">
        <button class="icon-btn" type="button" data-isf-zoom-out aria-label="Zoom out"${state.zoom <= ZOOM_MIN ? " disabled" : ""}>${iconZoomOut()}</button>
        <span class="type-caption-sm isf-doc-zoom__value">${state.zoom}%</span>
        <button class="icon-btn" type="button" data-isf-zoom-in aria-label="Zoom in"${state.zoom >= ZOOM_MAX ? " disabled" : ""}>${iconZoomIn()}</button>
      </div>
    </div>`;
  }

  function renderRecordPanel(row, detail, meta) {
    return `<div class="isf-record-panel">
      <header class="isf-record-panel__header">
        <div class="isf-record-panel__top">
          <div class="isf-record-panel__title">
            ${iconDocCat()}
            <h2 class="type-heading-h6 type-weight-semibold">Importer Security Filing</h2>
          </div>
          <div class="isf-record-panel__nav">
            <button class="icon-btn" type="button" data-isf-detail-prev aria-label="Previous transaction" data-tooltip="Previous"${meta.hasPrev ? "" : " disabled"}>${iconBack()}</button>
            <button class="icon-btn" type="button" data-isf-detail-next aria-label="Next transaction" data-tooltip="Next"${meta.hasNext ? "" : " disabled"}>${iconNext()}</button>
          </div>
        </div>
        <div class="isf-record-panel__ids">
          <span class="type-caption-sm"><strong>CBP Transaction No:</strong> ${escapeHtml(detail.cbpTransactionNo)} <button class="isf-copy-btn" type="button" data-isf-copy="${escapeHtml(detail.cbpTransactionNo)}" aria-label="Copy CBP transaction number" data-tooltip="Copy">${iconCopy()}</button></span>
          <span class="type-caption-sm"><strong>Transaction ID:</strong> ${escapeHtml(row.transactionId)} <button class="isf-copy-btn" type="button" data-isf-copy="${escapeHtml(row.transactionId)}" aria-label="Copy transaction ID" data-tooltip="Copy">${iconCopy()}</button></span>
        </div>
      </header>
      <div class="isf-record-panel__status">
        <span class="type-caption-sm isf-record-panel__status-item"><strong>Transaction Status:</strong> ${statusBadge(row.status)}</span>
        <span class="type-caption-sm isf-record-panel__status-item"><strong>Customs Status:</strong> ${statusBadge("Custom None", "notice")}</span>
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-isf-status-toggle>${state.statusOpen ? "Hide Status" : "Show Status"}</button>
      </div>
      ${renderStatusPanel(row, detail)}
      <div class="kn-detail-tabs kn-detailed-view__tabs" role="tablist" aria-label="ISF sections">
        ${TABS.map((t) => {
          const missing = t.id === "parties" ? detail.parties.filter((p) => !p.complete).length : 0;
          const badge = missing
            ? `<span class="counter counter--negative counter--intense kn-tab__badge kn-counter${missing > 9 ? " kn-counter--wide counter--wide" : ""}" aria-hidden="true">${missing}</span>`
            : "";
          const srMissing = missing ? `<span class="visually-hidden">, ${missing} missing information</span>` : "";
          return `<button class="kn-tab type-ui-sm ${t.id === state.tab ? "is-active type-weight-semibold" : "type-weight-medium"}" type="button" role="tab" id="kn-isf-detail-tab-${t.id}" aria-selected="${t.id === state.tab}" aria-controls="kn-isf-detail-panel" tabindex="${t.id === state.tab ? "0" : "-1"}" data-isf-detail-tab="${t.id}">${escapeHtml(t.label)}${srMissing}${badge}</button>`;
        }).join("")}
      </div>
      <div class="isf-record-panel__body" id="kn-isf-detail-panel" role="tabpanel" tabindex="-1" aria-labelledby="kn-isf-detail-tab-${state.tab}">
        ${renderTabBody(row, detail)}
      </div>
    </div>`;
  }

  function renderPrintModal(row, detail) {
    if (state.docModal !== "print") {
      return "";
    }
    const items = DOC_CATEGORIES.flatMap((cat) => {
      const count = detail.docCounts[cat.id] || 0;
      return Array.from({ length: count }, (_, i) => ({ key: `${cat.id}-${i + 1}`, label: `${cat.singular} ${i + 1}` }));
    });
    const allSelected = items.length > 0 && items.every((it) => state.printSelected.has(it.key));
    const bodyHtml = `<div class="isf-parties__head kn-field__head">
      <span class="type-caption-sm type-weight-semibold isf-parties__group-label">Documents</span>
      <button class="kn-link type-caption-sm" type="button" data-isf-print-select-all${items.length ? "" : " disabled"}>${allSelected ? "Clear All" : "Select All"}</button>
    </div>
    <fieldset class="isf-print-modal">
      <legend class="visually-hidden">Documents</legend>
      <div class="isf-print-modal__list">
        ${items
          .map(
            (it) => `<label class="isf-print-modal__item type-body-sm">
          <input type="checkbox" data-isf-print-doc="${escapeHtml(it.key)}"${state.printSelected.has(it.key) ? " checked" : ""} />
          ${escapeHtml(it.label)}
        </label>`
          )
          .join("")}
      </div>
    </fieldset>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-print-confirm${state.printSelected.size ? "" : " disabled"}>Print</button>`;
    return ux().modalShell({
      open: true,
      id: "kn-isf-print-modal",
      titleId: "kn-isf-print-title",
      title: "Print",
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    });
  }

  function renderAddDocModal() {
    if (state.docModal !== "add") {
      return "";
    }
    // A real backend document-type catalog runs far longer than this sample's
    // 10 placeholders — a flat dropdown stops scaling well well before that,
    // so filter it by a search box the same way the app's other long lists do.
    const query = state.addDocQuery.trim().toLowerCase();
    const filteredTypes = query ? DOC_TYPE_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(query)) : DOC_TYPE_OPTIONS;
    const bodyHtml = `
      <p class="type-caption-sm isf-add-doc__sub">For this shipment</p>
      <div class="kn-file-upload kn-file-upload--variable" data-upload-type="single" data-isf-detail-inert="Uploading a file is not available in this sample.">
        <div class="kn-file-upload__dropzone isf-add-doc__dropzone">
          <span class="kn-file-upload__icon" aria-hidden="true">${iconDocCat()}</span>
          <p class="type-body-sm kn-file-upload__copy">Drag &amp; drop or click to upload a file</p>
        </div>
      </div>
      <div class="isf-add-doc__search">
        <input class="kn-field__control" type="search" placeholder="Search document types" value="${escapeHtml(state.addDocQuery)}" data-isf-add-doc-search aria-label="Search document types" autocomplete="off" />
      </div>
      <div class="kn-field">
        ${
          filteredTypes.length
            ? ux().select({
                id: "kn-isf-add-doc-type",
                name: "isfAddDocType",
                value: state.addDocType,
                options: filteredTypes,
                placeholder: "Please select",
                openKey: "isf-add-doc-type",
                open: state.selectOpen
              })
            : `<p class="type-caption-sm isf-add-doc__no-match">No document types match "${escapeHtml(state.addDocQuery)}".</p>`
        }
      </div>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-add-doc-confirm${state.addDocType ? "" : " disabled"}>Add</button>`;
    return ux().modalShell({
      open: true,
      id: "kn-isf-add-doc-modal",
      titleId: "kn-isf-add-doc-title",
      title: "Add More Documents",
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    });
  }

  function renderObsoleteModal(row) {
    if (state.docModal !== "obsolete") {
      return "";
    }
    const bodyHtml = `<fieldset class="isf-obsolete-modal">
      <legend class="visually-hidden">Mark ${escapeHtml(row.transactionId)} obsolete</legend>
      <label class="isf-obsolete-modal__choice type-body-sm">
        <input type="radio" name="isfObsoleteChoice" data-isf-obsolete-choice="obsolete"${state.obsoleteChoice === "obsolete" ? " checked" : ""} /> Obsolete
      </label>
      <label class="isf-obsolete-modal__choice type-body-sm">
        <input type="radio" name="isfObsoleteChoice" data-isf-obsolete-choice="not-obsolete"${state.obsoleteChoice === "not-obsolete" ? " checked" : ""} /> Not Obsolete
      </label>
    </fieldset>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-obsolete-confirm>Submit</button>`;
    return ux().modalShell({
      open: true,
      id: "kn-isf-obsolete-modal",
      titleId: "kn-isf-obsolete-title",
      title: "Mark Obsolete",
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    });
  }

  function render(row, meta = {}) {
    resetIfNewRow(row, meta.keepTab);
    const detail = buildIsfDetail(row);
    return `<div class="isf-detail-layout">
      ${renderDocPanel(row, detail)}
      ${renderRecordPanel(row, detail, meta)}
    </div>
    ${renderPrintModal(row, detail)}
    ${renderAddDocModal()}
    ${renderObsoleteModal(row)}`;
  }

  function handleClick(event, row, helpers) {
    const tabBtn = event.target.closest("[data-isf-detail-tab]");
    if (tabBtn) {
      event.preventDefault();
      state.tab = tabBtn.getAttribute("data-isf-detail-tab") || "header";
      helpers.rerender();
      return true;
    }
    const catBtn = event.target.closest("[data-isf-doc-cat]");
    if (catBtn) {
      event.preventDefault();
      const cat = catBtn.getAttribute("data-isf-doc-cat") || "ISF";
      if (cat === state.docCategory) {
        // Re-clicking the active folder's own header just toggles its
        // document list open/closed — the preview selection is untouched.
        state.docRailOpen = state.docRailOpen === cat ? "" : cat;
      } else {
        state.docCategory = cat;
        state.docRailOpen = cat;
        state.docIndex = 0;
      }
      helpers.rerender();
      return true;
    }
    const docIdxBtn = event.target.closest("[data-isf-doc-index]");
    if (docIdxBtn) {
      event.preventDefault();
      state.docIndex = Number(docIdxBtn.getAttribute("data-isf-doc-index")) || 0;
      helpers.rerender();
      return true;
    }
    const zoomIn = event.target.closest("[data-isf-zoom-in]:not(:disabled)");
    if (zoomIn) {
      event.preventDefault();
      state.zoom = Math.min(ZOOM_MAX, state.zoom + ZOOM_STEP);
      helpers.rerender();
      return true;
    }
    const zoomOut = event.target.closest("[data-isf-zoom-out]:not(:disabled)");
    if (zoomOut) {
      event.preventDefault();
      state.zoom = Math.max(ZOOM_MIN, state.zoom - ZOOM_STEP);
      helpers.rerender();
      return true;
    }
    const statusToggle = event.target.closest("[data-isf-status-toggle]");
    if (statusToggle) {
      event.preventDefault();
      state.statusOpen = !state.statusOpen;
      helpers.rerender();
      return true;
    }
    const statusRowToggle = event.target.closest("[data-isf-status-row-toggle]");
    if (statusRowToggle) {
      event.preventDefault();
      const rowId = statusRowToggle.getAttribute("data-isf-status-row-toggle") || "";
      if (state.statusRowExpanded.has(rowId)) {
        state.statusRowExpanded.delete(rowId);
      } else {
        state.statusRowExpanded.add(rowId);
      }
      helpers.rerender();
      return true;
    }
    const aiToggle = event.target.closest("[data-isf-ai-toggle]");
    if (aiToggle) {
      event.preventDefault();
      const key = aiToggle.getAttribute("data-isf-ai-toggle") || "";
      state.aiPanelOpen = state.aiPanelOpen === key ? "" : key;
      helpers.rerender();
      return true;
    }
    const aiClose = event.target.closest("[data-isf-ai-close]");
    if (aiClose) {
      event.preventDefault();
      state.aiPanelOpen = "";
      helpers.rerender();
      return true;
    }
    const aiAccept = event.target.closest("[data-isf-ai-accept]:not(:disabled)");
    if (aiAccept) {
      event.preventDefault();
      const key = aiAccept.getAttribute("data-isf-ai-accept") || "";
      state.aiFieldOverrides[key] = "accepted";
      state.aiPanelOpen = "";
      toast("Field confirmed.", "positive");
      helpers.rerender();
      return true;
    }
    const aiReject = event.target.closest("[data-isf-ai-reject]:not(:disabled)");
    if (aiReject) {
      event.preventDefault();
      const key = aiReject.getAttribute("data-isf-ai-reject") || "";
      state.aiFieldOverrides[key] = "rejected";
      state.aiPanelOpen = "";
      toast("Flagged for manual entry.", "notice");
      helpers.rerender();
      return true;
    }
    const printOpen = event.target.closest("[data-isf-print-open]");
    if (printOpen) {
      event.preventDefault();
      state.docModal = "print";
      state.printSelected = new Set();
      helpers.rerender();
      return true;
    }
    const addDocOpen = event.target.closest("[data-isf-add-doc-open]");
    if (addDocOpen) {
      event.preventDefault();
      state.docModal = "add";
      state.addDocType = "";
      state.addDocQuery = "";
      helpers.rerender();
      return true;
    }
    const obsoleteOpen = event.target.closest("[data-isf-obsolete-open]");
    if (obsoleteOpen) {
      event.preventDefault();
      state.docModal = "obsolete";
      state.obsoleteChoice = "obsolete";
      helpers.rerender();
      return true;
    }
    const modalDismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (modalDismiss) {
      event.preventDefault();
      state.docModal = "";
      state.selectOpen = "";
      helpers.rerender();
      return true;
    }
    const printSelectAll = event.target.closest("[data-isf-print-select-all]:not(:disabled)");
    if (printSelectAll) {
      event.preventDefault();
      const detail = buildIsfDetail(row);
      const items = DOC_CATEGORIES.flatMap((cat) => {
        const count = detail.docCounts[cat.id] || 0;
        return Array.from({ length: count }, (_, i) => `${cat.id}-${i + 1}`);
      });
      const allSelected = items.length > 0 && items.every((key) => state.printSelected.has(key));
      state.printSelected = allSelected ? new Set() : new Set(items);
      helpers.rerender();
      return true;
    }
    const printDoc = event.target.closest("[data-isf-print-doc]");
    if (printDoc) {
      const key = printDoc.getAttribute("data-isf-print-doc") || "";
      if (printDoc.checked) {
        state.printSelected.add(key);
      } else {
        state.printSelected.delete(key);
      }
      helpers.rerender();
      return true;
    }
    const printConfirm = event.target.closest("[data-isf-print-confirm]:not(:disabled)");
    if (printConfirm) {
      event.preventDefault();
      toast(`Printing ${state.printSelected.size} document${state.printSelected.size === 1 ? "" : "s"} is not available in this sample.`, "notice");
      state.docModal = "";
      helpers.rerender();
      return true;
    }
    const addDocConfirm = event.target.closest("[data-isf-add-doc-confirm]:not(:disabled)");
    if (addDocConfirm) {
      event.preventDefault();
      toast("Adding a document is not available in this sample.", "notice");
      state.docModal = "";
      helpers.rerender();
      return true;
    }
    const obsoleteChoice = event.target.closest("[data-isf-obsolete-choice]");
    if (obsoleteChoice) {
      state.obsoleteChoice = obsoleteChoice.getAttribute("data-isf-obsolete-choice") || "obsolete";
      helpers.rerender();
      return true;
    }
    const obsoleteConfirm = event.target.closest("[data-isf-obsolete-confirm]");
    if (obsoleteConfirm) {
      event.preventDefault();
      toast(`Marking ${row.transactionId} as ${state.obsoleteChoice === "obsolete" ? "obsolete" : "not obsolete"} is not available in this sample.`, "notice");
      state.docModal = "";
      helpers.rerender();
      return true;
    }
    const expandAll = event.target.closest("[data-isf-parties-expand-all]");
    if (expandAll) {
      event.preventDefault();
      const detail = buildIsfDetail(row);
      const allExpanded = detail.parties.every((p) => state.partiesExpanded.has(p.id));
      state.partiesExpanded = allExpanded ? new Set() : new Set(detail.parties.map((p) => p.id));
      helpers.rerender();
      return true;
    }
    const accordionHandled = ux().handleAccordionClick(event, {
      openGroups: state.partiesExpanded,
      setOpen: (next) => {
        state.partiesExpanded = next;
        helpers.rerender();
      }
    });
    if (accordionHandled) {
      return true;
    }
    const selectHandled = ux().handleSelectClick(event, {
      open: state.selectOpen,
      setOpen: (next) => {
        state.selectOpen = next;
        helpers.rerender();
      },
      onChange: (key, value) => {
        if (key === "isf-add-doc-type") {
          state.addDocType = value;
          helpers.rerender();
          return;
        }
        if (key !== "isf-detail-doc") {
          return;
        }
        const detail = buildIsfDetail(row);
        const docList = Array.from({ length: detail.docCounts[state.docCategory] ?? 1 }, (_, i) => `${state.docCategory}-${i + 1}`);
        const index = docList.indexOf(value);
        state.docIndex = index >= 0 ? index : 0;
        helpers.rerender();
      }
    });
    if (selectHandled) {
      return true;
    }
    const copyBtn = event.target.closest("[data-isf-copy]");
    if (copyBtn) {
      event.preventDefault();
      const value = copyBtn.getAttribute("data-isf-copy") || "";
      copyToClipboard(value);
      return true;
    }
    const inert = event.target.closest("[data-isf-detail-inert]");
    if (inert) {
      event.preventDefault();
      toast(inert.getAttribute("data-isf-detail-inert") || "Not available in this sample.", "notice");
      return true;
    }
    return false;
  }

  // Standard WAI-ARIA tablist keyboard behavior (roving tabindex): arrow keys
  // move focus and activate; Home/End jump to the first/last tab.
  function handleKeydown(event, row, helpers) {
    if (event.key === "Escape" && (state.docModal || state.selectOpen || state.aiPanelOpen)) {
      event.preventDefault();
      state.docModal = "";
      state.selectOpen = "";
      state.aiPanelOpen = "";
      helpers.rerender();
      return true;
    }
    const railTabBtn = event.target.closest('[role="tab"][data-isf-doc-cat]');
    if (railTabBtn && ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const ids = DOC_CATEGORIES.map((c) => c.id);
      const currentIndex = ids.indexOf(state.docCategory);
      let nextIndex = currentIndex;
      if (event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      } else if (event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % ids.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = ids.length - 1;
      }
      const nextCat = ids[nextIndex];
      state.docCategory = nextCat;
      state.docRailOpen = nextCat;
      state.docIndex = 0;
      helpers.rerender();
      document.querySelector(`[data-isf-doc-cat="${nextCat}"]`)?.focus();
      return true;
    }
    const tabBtn = event.target.closest('[role="tab"][data-isf-detail-tab]');
    if (!tabBtn || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return false;
    }
    event.preventDefault();
    const ids = TABS.map((t) => t.id);
    const currentIndex = ids.indexOf(state.tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    } else if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % ids.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ids.length - 1;
    }
    state.tab = ids[nextIndex];
    helpers.rerender();
    document.getElementById(`kn-isf-detail-tab-${state.tab}`)?.focus();
    return true;
  }

  function copyToClipboard(value) {
    const done = () => toast(`Copied ${value}.`, "positive");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done, done);
      return;
    }
    done();
  }

  function handleInput(event, row, helpers) {
    const search = event.target.closest("[data-isf-add-doc-search]");
    if (!search) {
      return false;
    }
    state.addDocQuery = search.value;
    helpers.rerender();
    return true;
  }

  // Shown briefly while a filing "loads" (this sample's data is synchronous,
  // but the real page's data all comes from the backend) — reuses the same
  // .skeleton / .skeleton-stack primitives shipment-detail.js's own detail
  // load already established, laid out inside the real panel shells so the
  // loaded content doesn't jump around once it swaps in.
  function renderSkeleton() {
    const railItems = Array.from(
      { length: DOC_CATEGORIES.length },
      () => `<span class="skeleton skeleton--icon" style="width: 3rem; height: 3.25rem; border-radius: var(--radius-nested)"></span>`
    ).join("");
    const fieldSkeletons = Array.from(
      { length: 12 },
      () => `<div class="skeleton-stack"><span class="skeleton skeleton--caption" style="width: 55%"></span><span class="skeleton skeleton--line" style="width: 85%"></span></div>`
    ).join("");
    return `<div class="isf-detail-layout" aria-busy="true">
      <div class="isf-doc-panel">
        <div class="isf-doc-toolbar">
          <span class="skeleton skeleton--icon" style="width: 1.5rem; height: 1.5rem"></span>
          <span class="skeleton skeleton--line" style="flex: 1 1 auto; height: 1.75rem"></span>
          <span class="skeleton skeleton--icon" style="width: 1.5rem; height: 1.5rem"></span>
          <span class="skeleton skeleton--icon" style="width: 1.5rem; height: 1.5rem"></span>
        </div>
        <div class="isf-doc-meta">
          <span class="skeleton skeleton--caption" style="width: 6rem"></span>
        </div>
        <div class="isf-doc-body">
          <div class="isf-doc-rail-scroll"><div class="isf-doc-rail">${railItems}</div></div>
          <span class="skeleton" style="flex: 1 1 auto; border-radius: var(--radius-nested)"></span>
        </div>
      </div>
      <div class="isf-record-panel">
        <header class="isf-record-panel__header">
          <div class="isf-record-panel__top">
            <div class="skeleton-stack" style="flex-direction: row; align-items: center; gap: var(--theme-spacing-3)">
              <span class="skeleton skeleton--icon" style="width: 1.5rem; height: 1.5rem"></span>
              <span class="skeleton skeleton--title" style="width: 14rem"></span>
            </div>
          </div>
          <div class="isf-record-panel__ids">
            <span class="skeleton skeleton--caption" style="width: 10rem"></span>
            <span class="skeleton skeleton--caption" style="width: 8rem"></span>
          </div>
        </header>
        <div class="isf-record-panel__status">
          <span class="skeleton skeleton--badge"></span>
          <span class="skeleton skeleton--badge"></span>
        </div>
        <div class="kn-detail-tabs" aria-hidden="true">
          ${TABS.map((t) => `<span class="skeleton skeleton--btn" style="width: ${4 + t.label.length * 0.4}rem"></span>`).join("")}
        </div>
        <div class="isf-record-panel__body">
          <div class="isf-detail-grid">${fieldSkeletons}</div>
        </div>
      </div>
    </div>`;
  }

  window.KNIsfDetail = { render, handleClick, handleKeydown, handleInput, renderSkeleton };
})();
