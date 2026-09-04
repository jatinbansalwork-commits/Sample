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
    { id: "MISC", label: "Miscellaneous", singular: "MISC", icon: () => iconCatMisc() }
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
    addDocFiles: [],
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
      state.addDocFiles = [];
      state.obsoleteChoice = "obsolete";
      state.aiFieldOverrides = {};
      state.aiPanelOpen = "";
    }
  }

  const AI_RATIONALE = {
    final: "KlearAgent extracted this value from the source documents with high confidence.",
    draft: "KlearAgent extracted this value from the source documents but confidence was below the auto-accept threshold. Please review before filing.",
    accepted: "You confirmed this value. KlearAgent's original suggestion is unchanged.",
    rejected: "You rejected KlearAgent's suggested value. This field needs manual entry before filing."
  };

  function aiFieldMark({ suggest = false } = {}) {
    return (
      window.KNAssistCore?.aiMarkHtml?.({ size: 12, suggest }) ||
      `<svg class="klear-assistant-mark${suggest ? " ai-suggest-mark" : ""}" viewBox="0 0 24 24" width="12" height="12" focusable="false" aria-hidden="true"><use href="#klear-assist-ray" /></svg>`
    );
  }

  // Renders as a real (disabled) KlearNow input box — matching the reference app's own
  // "prefilled, non-editable" field chrome — rather than plain label/value text.
  function field(label, value, opts = {}) {
    const empty = value === "" || value == null;
    const aiEffective = opts.ai && !empty ? state.aiFieldOverrides[opts.aiKey] || opts.ai : "";
    let flag = "";
    if (aiEffective) {
      const isOpen = state.aiPanelOpen === opts.aiKey;
      const iconByState = {
        final: aiFieldMark(),
        accepted: aiFieldMark(),
        draft: aiFieldMark({ suggest: true }),
        rejected: iconFieldWarn()
      };
      const labelByState = {
        final: "KlearAgent filled this — high confidence",
        accepted: "You confirmed KlearAgent's suggestion",
        draft: "KlearAgent filled this — click to review",
        rejected: "Rejected — needs manual entry"
      };
      const markIcon = iconByState[aiEffective];
      const labelText = labelByState[aiEffective];
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
      const interactive = aiEffective === "draft" || aiEffective === "rejected";
      const markClass = `isf-field-flag isf-field-flag--ai-${aiEffective}`;
      const markInner = interactive
        ? `<button class="${markClass}" type="button" data-isf-ai-toggle="${escapeHtml(opts.aiKey)}" aria-haspopup="dialog" aria-expanded="${isOpen}" aria-label="${escapeHtml(labelText)}" data-tooltip="${escapeHtml(labelText)}">${markIcon}</button>`
        : `<span class="${markClass}" aria-hidden="true" data-tooltip="${escapeHtml(labelText)}">${markIcon}</span>`;
      flag = `<span class="isf-field-flag-wrap">${markInner}${interactive ? popover : ""}</span>`;
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

  // Prefilled disabled inputs — same chrome as the Header tab — for repeating
  // record sections (BOL lines, merchandise, containers) instead of tables.
  function renderRecordFields(row, tabId, rows, fieldDefs, { emptyHint = "No records on file.", sectionLabel = "Line" } = {}) {
    const n = seedFor(row);
    let aiIndex = 0;
    const ai = (name) => ({ ai: (n + aiIndex++) % 5 === 0 ? "draft" : "final", aiKey: `${tabId}:${row.id}:${name}` });
    if (!rows.length) {
      return `<div class="isf-detail-fields">
        <p class="type-caption-sm isf-detail-fields__empty">${escapeHtml(emptyHint)}</p>
        <div class="isf-detail-grid">
          ${fieldDefs.map((def) => field(def.label, "", { placeholder: "—" })).join("")}
        </div>
      </div>`;
    }
    return `<div class="isf-detail-fields">
      ${rows
        .map((item, index) => {
          const heading =
            rows.length > 1
              ? `<p class="type-caption-sm type-weight-semibold isf-detail-fields__section-label">${escapeHtml(sectionLabel)} ${index + 1}</p>`
              : "";
          return `<div class="isf-detail-fields__section">
            ${heading}
            <div class="isf-detail-grid">
              ${fieldDefs
                .map((def) => {
                  const raw = def.get ? def.get(item) : item[def.key];
                  const value = def.format ? def.format(raw, item) : raw;
                  return field(def.label, value ?? "", { ...def.opts, ...ai(`${def.key}-${index}`) });
                })
                .join("")}
            </div>
          </div>`;
        })
        .join("")}
    </div>`;
  }

  function renderBolTab(row, detail) {
    return renderRecordFields(
      row,
      "bol",
      detail.bol,
      [
        { key: "shipmentId", label: "Shipment ID" },
        { key: "type", label: "Type" },
        { key: "billOfLading", label: "Bill of Lading" },
        { key: "status", label: "Status" }
      ],
      { sectionLabel: "BOL" }
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
    return renderRecordFields(
      row,
      "merchandise",
      detail.merchandise,
      [
        { key: "hts", label: "HTS" },
        { key: "co", label: "C/O" },
        { key: "mfr", label: "MFR" },
        { key: "description", label: "Description" }
      ],
      { sectionLabel: "Line" }
    );
  }

  function renderContainerTab(row, detail) {
    return renderRecordFields(
      row,
      "container",
      detail.container,
      [
        { key: "containerNumber", label: "Container Number" },
        { key: "sealNumber", label: "Seal Number" },
        { key: "sizeType", label: "Size / Type" },
        { key: "grossWeight", label: "Gross Weight" }
      ],
      { emptyHint: "No containers on file.", sectionLabel: "Container" }
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
  function iconUpload() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>`;
  }
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(kb < 10 ? 2 : 0)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  // Distinct per-category rail icons — 24×24 with light fill + stroke so each
  // folder reads clearly at 20px in the doc-viewer rail.
  function iconCatEmail() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="currentColor" fill-opacity="0.14"/><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="m3 7.5 9 5.5 9-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function iconCatVessel() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 17.5h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4.5 17.5 7.5 9h9l3 8.5" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 9h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 4.5v4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 4.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 13.5h6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-opacity="0.55"/></svg>`;
  }
  function iconCatArrival() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.5-5.4 6.5-11A6.5 6.5 0 1 0 5.5 10c0 5.6 6.5 11 6.5 11Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.25" stroke="currentColor" stroke-width="1.5"/><path d="M12 12.25V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  function iconCatRelease() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5"/><path d="M8 11V7.5a4 4 0 0 1 7.5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="15.5" r="1.25" fill="currentColor"/></svg>`;
  }
  function iconCatSummary() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  function iconCatInvoice() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 14.5h2.5v2.5h-2.5z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>`;
  }
  function iconCatShield() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 19 6v5.5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6l7-2.5Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m9 12 2 2 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function iconCatPacking() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 7l8 4 8-4" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v10" stroke="currentColor" stroke-width="1.5"/><path d="M8 9.5v5.5M16 9.5v5.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-opacity="0.55"/></svg>`;
  }
  function iconCatMisc() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8l5 5v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 4v5h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="13.5" r="0.85" fill="currentColor"/><circle cx="13" cy="13.5" r="0.85" fill="currentColor"/><circle cx="16" cy="13.5" r="0.85" fill="currentColor"/></svg>`;
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

  // Production document IDs use a KX prefix with the transaction mid-segment —
  // e.g. filing ISF-021D-8 → document KX-021D-29 in the staging viewer.
  function productionDocId(row, catId, index) {
    const match = String(row.transactionId || "").match(/^ISF-([^-]+)-(\d+)$/);
    if (match && match[1] === "021D" && catId === "EML" && index === 0) {
      return "KX-021D-29";
    }
    const mid = match ? match[1] : docMidCode(row);
    const n = seedFor(row);
    const suffix = pad((n * 17 + index * 43 + catId.charCodeAt(0)) % 100, 2);
    return `KX-${mid}-${suffix}`;
  }

  // Stable viewer record id — the transaction's document bundle id does not
  // change when the broker switches category folders or document instances.
  function viewerRecordId(row) {
    return productionDocId(row, "EML", 0);
  }

  // Alternate ids for the same filing — document bundle (KX…) vs ISF transaction.
  function viewerRecordIdOptions(row) {
    const documentId = viewerRecordId(row);
    const filingId = String(row.transactionId || "").trim();
    const options = [];
    if (documentId) {
      options.push({ id: "document", label: documentId });
    }
    if (filingId && filingId !== documentId) {
      options.push({ id: "filing", label: filingId });
    }
    return options;
  }

  function isFeaturedEmailDoc(row, catId, index) {
    return catId === "EML" && index === 0;
  }

  function emlHighlight(text, tone = "yellow") {
    return `<span class="isf-eml-preview__hl isf-eml-preview__hl--${tone}">${escapeHtml(text)}</span>`;
  }

  function highlightSearchText(text, query) {
    const raw = text == null ? "" : String(text);
    const q = String(query || "").trim();
    if (!q) {
      return escapeHtml(raw);
    }
    const lower = raw.toLowerCase();
    const qLower = q.toLowerCase();
    let out = "";
    let i = 0;
    while (i < raw.length) {
      const idx = lower.indexOf(qLower, i);
      if (idx === -1) {
        out += escapeHtml(raw.slice(i));
        break;
      }
      out += escapeHtml(raw.slice(i, idx));
      out += `<mark class="isf-doc-search__mark">${escapeHtml(raw.slice(idx, idx + q.length))}</mark>`;
      i = idx + q.length;
    }
    return out;
  }

  function emlField(text, tone, searchQuery) {
    if (String(searchQuery || "").trim()) {
      return highlightSearchText(text, searchQuery);
    }
    return emlHighlight(text, tone);
  }

  function wrapDocArtifact(bodyHtml, format, meta = {}) {
    const styleParts = [];
    if (meta.width) {
      styleParts.push(`--isf-doc-artifact-width: ${Number(meta.width)}px`);
    }
    if (meta.height) {
      styleParts.push(`--isf-doc-artifact-height: ${Number(meta.height)}px`);
    }
    if (meta.aspect) {
      styleParts.push(`--isf-doc-artifact-aspect: ${meta.aspect}`);
    }
    const style = styleParts.length ? ` style="${styleParts.join("; ")}"` : "";
    const role = meta.role ? ` role="${meta.role}"` : ` role="document"`;
    const aria = meta.ariaLabel ? ` aria-label="${escapeHtml(meta.ariaLabel)}"` : "";
    return `<article class="isf-doc-artifact isf-doc-artifact--${format}" data-doc-format="${format}"${role}${aria}${style}>
      <div class="isf-doc-artifact__surface">
        ${bodyHtml}
      </div>
    </article>`;
  }

  function previewDocFormat(catId, index, count) {
    if (!count) {
      return "empty";
    }
    if (catId === "EML") {
      return "image";
    }
    if (catId === "AN" && index === 0) {
      return "pdf";
    }
    return "page";
  }

  function renderScanImagePreview(src, alt, meta = {}) {
    const width = meta.width || 850;
    const height = meta.height || 1100;
    return wrapDocArtifact(
      `<img class="isf-doc-artifact__image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" loading="lazy" />`,
      "image",
      { ariaLabel: alt, width, height }
    );
  }
  function renderEmailThreadPreview(row, index, searchQuery = "") {
    return renderScanImagePreview(SAMPLE_EML_IMAGE, "Email preview", {
      width: 723,
      height: 1024
    });
  }

  function renderDocumentPreview(row, catId, index, detail, opts = {}) {
    const searchQuery = opts.searchQuery || "";
    if (catId === "EML") {
      return renderEmailThreadPreview(row, index, searchQuery);
    }
    if (catId === "AN" && index === 0) {
      return renderPdfDocumentPreview(
        "./assets/documents/arrival-notice-cmduhbg2041766.pdf",
        "Arrival Notice — CMDUHBG2041766",
        searchQuery
      );
    }
    return renderDocumentPageMock(row, catId, index, detail, searchQuery);
  }

  function renderPdfDocumentPreview(src, title, searchQuery = "") {
    const q = String(searchQuery || "").trim();
    const searchNote = q
      ? `<p class="isf-doc-search__pdf-note type-caption-sm">Use <kbd>⌘F</kbd> to find “${escapeHtml(q)}” inside this PDF.</p>`
      : "";
    return wrapDocArtifact(
      `${searchNote}<iframe class="isf-doc-artifact__pdf" src="${escapeHtml(src)}#view=FitH" title="${escapeHtml(title)}" loading="lazy"></iframe>`,
      "pdf",
      { ariaLabel: title, aspect: "8.5 / 11" }
    );
  }

  const SAMPLE_PDF = "./assets/documents/arrival-notice-cmduhbg2041766.pdf";
  const SAMPLE_EML_IMAGE = "./assets/documents/email-illuminate-betterial.webp";

  function documentAssetUrl(row, catId, index, count) {
    if (!count) {
      return "";
    }
    const format = previewDocFormat(catId, index, count);
    if (format === "empty") {
      return "";
    }
    if (catId === "EML" && format === "image") {
      return SAMPLE_EML_IMAGE;
    }
    if (format === "pdf" || format === "page") {
      return SAMPLE_PDF;
    }
    return "";
  }

  function documentViewerHash(row, catId, index) {
    return `#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=${encodeURIComponent(catId)}&doc=${index}`;
  }

  function openDocumentInNewTab(row, catId, index) {
    const detail = buildIsfDetail(row);
    const count = detail.docCounts[catId] || 0;
    const asset = documentAssetUrl(row, catId, index, count);
    if (!asset) {
      if (!count) {
        toast("No document is available in this category.", "notice");
      } else {
        toast("No PDF or image file is available for this document.", "notice");
      }
      return;
    }
    let url = asset;
    try {
      url = new URL(asset, window.location.href).href;
    } catch (error) {
      /* keep relative target */
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      toast("Allow pop-ups to open this document in a new tab.", "notice");
    }
  }

  function createDocPanelState(overrides = {}) {
    return {
      docCategory: "ISF",
      docRailOpen: "ISF",
      docIndex: 0,
      instanceFolderOpen: false,
      docModal: "",
      printSelected: new Set(),
      addDocType: "",
      addDocQuery: "",
      addDocFiles: [],
      docSearchOpen: false,
      docSearchQuery: "",
      obsoleteChoice: "obsolete",
      zoom: 100,
      selectOpen: "",
      previewPanX: 0,
      previewPanY: 0,
      viewerIdMode: "document",
      viewerPageMode: "document",
      ...overrides
    };
  }

  function defaultDocPanelCategory(detail) {
    const first = DOC_CATEGORIES.find((cat) => (detail.docCounts[cat.id] || 0) > 0);
    return first?.id || "ISF";
  }

  function renderDocumentPageMock(row, catId, index, detail, searchQuery = "") {
    const code = docCode(row, catId, index);
    const date = docReceivedDate(row, catId, index);
    const cat = DOC_CATEGORIES.find((item) => item.id === catId);
    const title = cat?.singular || cat?.label || catId;
    const lines = [
      row.transactionId,
      row.companyName,
      `MBL ${row.mbl}`,
      `Shipment ${row.shipments}`,
      detail.header?.mot || "",
      `Received ${date}`
    ];
    const bodyLines = lines
      .map(
        (line, lineIndex) =>
          `<text x="36" y="${98 + lineIndex * 22}" font-family="system-ui, sans-serif" font-size="11" fill="#334155">${escapeHtml(line)}</text>`
      )
      .join("");
    const filler = Array.from(
      { length: 10 },
      (_, lineIndex) =>
        `<rect x="36" y="${210 + lineIndex * 18}" width="${240 - (lineIndex % 4) * 18}" height="6" rx="1.5" fill="#e2e8f0"/>`
    ).join("");
    const q = String(searchQuery || "").trim();
    const searchNote = q
      ? `<div class="isf-doc-search__mock-note type-caption-sm">Searching mock preview — try “${escapeHtml(row.transactionId)}” or “${escapeHtml(row.companyName)}”.</div>`
      : "";
    return wrapDocArtifact(
      `${searchNote}<div class="isf-doc-page-mock" role="img" aria-label="${escapeHtml(title)} ${escapeHtml(code)}"><svg viewBox="0 0 420 560" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="560" fill="#eef2f7"/>
        <rect x="22" y="20" width="376" height="520" fill="#fff" stroke="#cbd5e1" stroke-width="1.2" rx="2"/>
        <rect x="36" y="36" width="180" height="8" rx="2" fill="#003f5b" opacity="0.88"/>
        <text x="36" y="68" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#0f172a">${escapeHtml(code)}</text>
        <text x="36" y="84" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">${escapeHtml(title)}</text>
        ${bodyLines}
        ${filler}
        <rect x="36" y="420" width="120" height="64" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3" rx="2"/>
        <text x="96" y="456" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8">Signature</text>
        <text x="210" y="528" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8">Page 1 of 1 · Sample preview</text>
      </svg></div>`,
      "page",
      { ariaLabel: `${title} ${code}`, width: 420, role: "img" }
    );
  }

  function renderDocRail(row, detail, panelState = state) {
    const activeCat = panelState.docCategory;
    return `<div class="isf-doc-rail-scroll isf-doc-rail-scroll--hub">
      <div class="isf-doc-rail" role="tablist" aria-label="Document categories">
        ${DOC_CATEGORIES.map((cat) => {
          const count = detail.docCounts[cat.id] || 0;
          const missing = Boolean(cat.required) && count === 0;
          const isOpen = panelState.docRailOpen === cat.id;
          const tooltip = missing ? `${cat.label} — required, not yet received` : cat.label;
          const badge = missing
            ? `<span class="isf-doc-rail__count isf-doc-rail__count--missing" aria-hidden="true">${iconFieldWarn()}</span>`
            : `<span class="badge badge--information isf-doc-rail__count kn-badge">${count}</span>`;
          const header = `<button class="isf-doc-rail__item${cat.id === activeCat ? " is-active" : ""}${isOpen ? " is-open" : ""}${missing ? " isf-doc-rail__item--missing" : ""}" type="button" role="tab" aria-selected="${cat.id === activeCat}" aria-expanded="${isOpen}" tabindex="${cat.id === activeCat ? "0" : "-1"}" data-isf-doc-cat="${cat.id}" data-tooltip="${escapeHtml(tooltip)}">
            ${cat.icon()}
            <span class="isf-doc-rail__code">${escapeHtml(cat.id)}</span>
            ${badge}
          </button>`;
          const DOC_RAIL_VISIBLE_CAP = 8;
          const docs = isOpen
            ? count === 0
              ? `<div class="isf-doc-rail__docs isf-doc-rail__docs--empty type-caption-sm" data-tooltip="No documents in this category">None</div>`
              : `<div class="isf-doc-rail__docs${count > DOC_RAIL_VISIBLE_CAP ? " isf-doc-rail__docs--scroll" : ""}">
                ${Array.from(
                  { length: count },
                  (_, i) =>
                    `<button class="isf-doc-rail__doc${panelState.docIndex === i && cat.id === activeCat ? " is-active" : ""}" type="button" data-isf-doc-index="${i}" data-isf-doc-cat-ref="${cat.id}" data-tooltip="${escapeHtml(cat.label)} ${i + 1}">${i + 1}</button>`
                ).join("")}
              </div>`
            : "";
          return header + docs;
        }).join("")}
      </div>
    </div>`;
  }

  function renderDocPreviewArea(row, detail, panelState = state) {
    const activeCat = panelState.docCategory;
    const count = detail.docCounts[activeCat] || 0;
    const docList = Array.from({ length: Math.max(count, 1) }, (_, i) => ({
      id: `${activeCat}-${i + 1}`,
      label: count > 0 ? docCode(row, activeCat, i) : "No document",
      date: count > 0 ? docReceivedDate(row, activeCat, i) : ""
    }));
    const selected = count > 0 ? docList[Math.min(panelState.docIndex, docList.length - 1)] : null;
    const requiredCats = DOC_CATEGORIES.filter((cat) => cat.required);
    const requiredMissing = requiredCats.filter((cat) => (detail.docCounts[cat.id] || 0) === 0);
    const requiredTotal = requiredCats.length;
    const previewInner =
      count > 0 && selected
        ? renderDocumentPageMock(row, activeCat, panelState.docIndex, detail)
        : `<div class="isf-doc-preview__placeholder">
            ${iconDocCat()}
            <p class="type-body-sm type-weight-medium">${escapeHtml(DOC_CATEGORIES.find((cat) => cat.id === activeCat)?.label || activeCat)}</p>
            <p class="type-caption-sm">${requiredMissing.some((cat) => cat.id === activeCat) ? "Required document not yet received." : "No document in this category."}</p>
          </div>`;
    return `<div class="isf-doc-panel isf-doc-panel--hub">
      <div class="isf-doc-toolbar">
        <button class="icon-btn" type="button" data-isf-doc-hub-inert="Print is not available in this sample." aria-label="Print" data-tooltip="Print">${iconPrint()}</button>
        ${ux().select({
          id: "kn-isf-hub-doc-select",
          name: "isfHubDoc",
          value: selected ? selected.id : "",
          options: docList.filter((_, i) => i < count),
          placeholder: "Select a document",
          openKey: "isf-hub-doc",
          open: panelState.selectOpen,
          compact: true
        })}
        <button class="icon-btn" type="button" data-isf-doc-hub-inert="Download is not available in this sample." aria-label="Download" data-tooltip="Download">${iconDownload()}</button>
        <button class="icon-btn" type="button" data-isf-doc-hub-inert="Open in new window is not available in this sample." aria-label="Show image in new window" data-tooltip="Open in new window">${iconExternal()}</button>
      </div>
      <div class="isf-doc-meta">
        <span class="type-caption-sm isf-doc-date">${escapeHtml(selected ? selected.date : "")}</span>
        <span class="type-caption-sm isf-doc-required${requiredMissing.length === requiredTotal ? " isf-doc-required--negative" : requiredMissing.length ? " isf-doc-required--warn" : ""}">
          ${requiredMissing.length ? iconFieldWarn() : ""} ${requiredTotal - requiredMissing.length} of ${requiredTotal} required documents received
        </span>
      </div>
      <div class="isf-doc-body isf-doc-body--hub-preview">
        <div class="isf-doc-preview" style="--isf-doc-zoom: ${panelState.zoom}%">
          <div class="isf-doc-preview__placeholder${count > 0 && selected ? " isf-doc-preview__placeholder--page" : ""}">
            ${previewInner}
          </div>
        </div>
      </div>
      <div class="isf-doc-zoom">
        <button class="icon-btn" type="button" data-isf-zoom-out aria-label="Zoom out"${panelState.zoom <= ZOOM_MIN ? " disabled" : ""}>${iconZoomOut()}</button>
        <span class="type-caption-sm isf-doc-zoom__value">${panelState.zoom}%</span>
        <button class="icon-btn" type="button" data-isf-zoom-in aria-label="Zoom in"${panelState.zoom >= ZOOM_MAX ? " disabled" : ""}>${iconZoomIn()}</button>
      </div>
    </div>`;
  }

  function handleDocPanelClick(event, row, panelState, helpers) {
    const catBtn = event.target.closest("[data-isf-doc-cat]");
    if (catBtn) {
      event.preventDefault();
      const cat = catBtn.getAttribute("data-isf-doc-cat") || "ISF";
      if (cat === panelState.docCategory) {
        panelState.docRailOpen = panelState.docRailOpen === cat ? "" : cat;
      } else {
        panelState.docCategory = cat;
        panelState.docRailOpen = cat;
        panelState.docIndex = 0;
        panelState.instanceFolderOpen = false;
      }
      helpers.onCategoryChange?.(cat, panelState.docIndex);
      helpers.rerender();
      return true;
    }
    const docIdxBtn = event.target.closest("[data-isf-doc-index]");
    if (docIdxBtn) {
      event.preventDefault();
      const catRef = docIdxBtn.getAttribute("data-isf-doc-cat-ref");
      if (catRef) {
        panelState.docCategory = catRef;
        panelState.docRailOpen = catRef;
      }
      panelState.docIndex = Number(docIdxBtn.getAttribute("data-isf-doc-index")) || 0;
      helpers.onCategoryChange?.(panelState.docCategory, panelState.docIndex);
      helpers.rerender();
      return true;
    }
    const zoomIn = event.target.closest("[data-isf-zoom-in]:not(:disabled)");
    if (zoomIn) {
      event.preventDefault();
      panelState.zoom = Math.min(ZOOM_MAX, panelState.zoom + ZOOM_STEP);
      helpers.rerender();
      return true;
    }
    const zoomOut = event.target.closest("[data-isf-zoom-out]:not(:disabled)");
    if (zoomOut) {
      event.preventDefault();
      panelState.zoom = Math.max(ZOOM_MIN, panelState.zoom - ZOOM_STEP);
      helpers.rerender();
      return true;
    }
    const inert = event.target.closest("[data-isf-doc-hub-inert]");
    if (inert) {
      event.preventDefault();
      toast(inert.getAttribute("data-isf-doc-hub-inert") || "Not available in this sample.", "notice");
      return true;
    }
    const selectHandled = ux().handleSelectClick(event, {
      open: panelState.selectOpen,
      setOpen: (next) => {
        panelState.selectOpen = next;
        helpers.rerender();
      },
      onChange: (key, value) => {
        if (key !== "isf-hub-doc") {
          return;
        }
        const detail = buildIsfDetail(row);
        const docList = Array.from({ length: detail.docCounts[panelState.docCategory] ?? 0 }, (_, i) => `${panelState.docCategory}-${i + 1}`);
        const index = docList.indexOf(value);
        panelState.docIndex = index >= 0 ? index : 0;
        helpers.onCategoryChange?.(panelState.docCategory, panelState.docIndex);
        helpers.rerender();
      }
    });
    return Boolean(selectHandled);
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
                    (_, i) => `<button class="isf-doc-rail__doc${state.docIndex === i ? " is-active" : ""}" type="button" data-isf-doc-index="${i}" data-isf-doc-cat-ref="${cat.id}" data-tooltip="${escapeHtml(cat.label)} ${i + 1}">${i + 1}</button>`
                  ).join("")}
                </div>`
              : "";
            return header + docs;
          }).join("")}
        </div>
        </div>
        <div class="isf-doc-preview" style="--isf-doc-zoom: ${state.zoom}%">
          ${
            (detail.docCounts[activeCat] || 0) > 0
              ? `<div class="isf-doc-preview__placeholder isf-doc-preview__placeholder--page">${renderDocumentPageMock(row, activeCat, state.docIndex, detail)}</div>`
              : `<div class="isf-doc-preview__placeholder">
            ${iconDocCat()}
            <p class="type-body-sm type-weight-medium">${escapeHtml(selected ? selected.label : "No document")}</p>
            <p class="type-caption-sm">Preview not available in this sample.</p>
          </div>`
          }
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

  function renderTransactionSidePanel(row, detail, meta = {}) {
    const modeLabel = meta.panelMode === "edit" ? "Edit transaction" : "View transaction";
    return `<aside class="isf-doc-viewer__side panel card kn-card" aria-label="${escapeHtml(modeLabel)}">
      ${renderRecordPanel(row, detail, meta)}
    </aside>`;
  }

  function prepareTransactionSidePanel(row, meta = {}) {
    resetIfNewRow(row, meta.keepTab);
  }

  /** @deprecated Use renderTransactionSidePanel — kept for callers not yet migrated. */
  function renderTransactionDrawer(row, detail, meta = {}) {
    return renderTransactionSidePanel(row, detail, meta);
  }

  function prepareTransactionDrawer(row, meta = {}) {
    prepareTransactionSidePanel(row, meta);
  }

  function renderPrintModal(row, detail, panelState = state, categories = DOC_CATEGORIES) {
    if (panelState.docModal !== "print") {
      return "";
    }
    const items = categories.flatMap((cat) => {
      const count = detail.docCounts[cat.id] || 0;
      return Array.from({ length: count }, (_, i) => ({ key: `${cat.id}-${i + 1}`, label: `${cat.singular} ${i + 1}` }));
    });
    const allSelected = items.length > 0 && items.every((it) => panelState.printSelected.has(it.key));
    const bodyHtml = `<div class="isf-print-modal__panel">
      <div class="isf-print-modal__head">
        <span class="type-caption-sm type-weight-semibold isf-print-modal__label">Documents</span>
        <button class="kn-link type-caption-sm" type="button" data-isf-print-select-all${items.length ? "" : " disabled"}>${allSelected ? "Clear All" : "Select All"}</button>
      </div>
      <fieldset class="isf-print-modal">
        <legend class="visually-hidden">Documents</legend>
        <div class="isf-print-modal__list">
          ${items
            .map(
              (it) => `<label class="isf-print-modal__item type-body-sm">
            <input type="checkbox" data-isf-print-doc="${escapeHtml(it.key)}"${panelState.printSelected.has(it.key) ? " checked" : ""} />
            ${escapeHtml(it.label)}
          </label>`
            )
            .join("")}
        </div>
      </fieldset>
    </div>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-print-confirm${panelState.printSelected.size ? "" : " disabled"}>Print</button>`;
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

  function handlePrintModalClick(event, row, panelState, helpers, categories = DOC_CATEGORIES) {
    const printOpen = event.target.closest("[data-isf-print-open]");
    if (printOpen) {
      event.preventDefault();
      panelState.docModal = "print";
      panelState.printSelected = new Set();
      panelState.selectOpen = "";
      helpers.rerender();
      return true;
    }
    if (panelState.docModal !== "print") {
      return false;
    }
    const modalDismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (modalDismiss) {
      event.preventDefault();
      panelState.docModal = "";
      panelState.selectOpen = "";
      helpers.rerender();
      return true;
    }
    const printSelectAll = event.target.closest("[data-isf-print-select-all]:not(:disabled)");
    if (printSelectAll) {
      event.preventDefault();
      const detail = buildIsfDetail(row);
      const items = categories.flatMap((cat) => {
        const count = detail.docCounts[cat.id] || 0;
        return Array.from({ length: count }, (_, i) => `${cat.id}-${i + 1}`);
      });
      const allSelected = items.length > 0 && items.every((key) => panelState.printSelected.has(key));
      panelState.printSelected = allSelected ? new Set() : new Set(items);
      helpers.rerender();
      return true;
    }
    const printDoc = event.target.closest("[data-isf-print-doc]");
    if (printDoc) {
      const key = printDoc.getAttribute("data-isf-print-doc") || "";
      if (printDoc.checked) {
        panelState.printSelected.add(key);
      } else {
        panelState.printSelected.delete(key);
      }
      helpers.rerender();
      return true;
    }
    const printConfirm = event.target.closest("[data-isf-print-confirm]:not(:disabled)");
    if (printConfirm) {
      event.preventDefault();
      toast(`Printing ${panelState.printSelected.size} document${panelState.printSelected.size === 1 ? "" : "s"} is not available in this sample.`, "notice");
      panelState.docModal = "";
      helpers.rerender();
      return true;
    }
    return false;
  }

  function addAddDocFiles(fileList, panelState) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    panelState.addDocFiles = [
      {
        id: `add-doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type
      }
    ];
  }

  function renderAddDocFileItem(panelState) {
    const file = panelState.addDocFiles[0];
    if (!file) {
      return "";
    }
    return `<div class="kn-file-upload__item" data-status="success" data-file-id="${escapeHtml(file.id)}">
      <div class="kn-file-upload__item-body">
        <span class="kn-file-upload__item-icon" aria-hidden="true">${iconDocCat()}</span>
        <div class="kn-file-upload__item-copy">
          <p class="kn-file-upload__item-name type-ui-sm">${escapeHtml(file.name)}</p>
          <p class="kn-file-upload__item-meta type-caption-sm">${escapeHtml(formatBytes(file.size))}</p>
        </div>
        <div class="kn-file-upload__item-actions">
          <button type="button" class="icon-btn" data-isf-add-doc-file-remove="${escapeHtml(file.id)}" aria-label="Remove ${escapeHtml(file.name)}">${iconTrash()}</button>
        </div>
      </div>
    </div>`;
  }

  function renderAddDocModal(row, detail, panelState = state) {
    if (panelState.docModal !== "add") {
      return "";
    }
    // A real backend document-type catalog runs far longer than this sample's
    // 10 placeholders — a flat dropdown stops scaling well well before that,
    // so filter it by a search box the same way the app's other long lists do.
    const query = panelState.addDocQuery.trim().toLowerCase();
    const filteredTypes = query ? DOC_TYPE_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(query)) : DOC_TYPE_OPTIONS;
    const canAdd = panelState.addDocType && panelState.addDocFiles.length;
    const bodyHtml = `<div class="isf-add-doc__panel">
      <p class="type-caption-sm isf-add-doc__sub">For this shipment</p>
      <div class="kn-file-upload kn-file-upload--variable" data-upload-type="single" data-kn-component="file-upload">
        <div class="kn-file-upload__dropzone isf-add-doc__dropzone" data-isf-add-doc-dropzone tabindex="0" role="button" aria-label="Upload a document for this shipment">
          <span class="kn-file-upload__icon" aria-hidden="true">${iconUpload()}</span>
          <p class="type-body-sm kn-file-upload__copy">Drag and drop your files here</p>
          <button type="button" class="kn-link kn-file-upload__link isf-add-doc__browse">Upload</button>
          <input class="kn-file-upload__input visually-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.tif,.tiff" data-isf-add-doc-upload-input />
        </div>
        ${renderAddDocFileItem(panelState)}
      </div>
      <div class="isf-add-doc__search">
        <input class="kn-field__control" type="search" placeholder="Search document types" value="${escapeHtml(panelState.addDocQuery)}" data-isf-add-doc-search aria-label="Search document types" autocomplete="off" />
      </div>
      <div class="kn-field">
        ${
          filteredTypes.length
            ? ux().select({
                id: "kn-isf-add-doc-type",
                name: "isfAddDocType",
                value: panelState.addDocType,
                options: filteredTypes,
                placeholder: "Please select",
                openKey: "isf-add-doc-type",
                open: panelState.selectOpen
              })
            : `<p class="type-caption-sm isf-add-doc__no-match">No document types match "${escapeHtml(panelState.addDocQuery)}".</p>`
        }
      </div>
    </div>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-add-doc-confirm${canAdd ? "" : " disabled"}>Add</button>`;
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

  function handleAddDocModalClick(event, row, panelState, helpers) {
    const addDocOpen = event.target.closest("[data-isf-add-doc-open]");
    if (addDocOpen) {
      event.preventDefault();
      panelState.docModal = "add";
      panelState.addDocType = "";
      panelState.addDocQuery = "";
      panelState.addDocFiles = [];
      panelState.selectOpen = "";
      helpers.rerender();
      return true;
    }
    if (panelState.docModal !== "add") {
      return false;
    }
    const modalDismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (modalDismiss) {
      event.preventDefault();
      panelState.docModal = "";
      panelState.selectOpen = "";
      panelState.addDocFiles = [];
      helpers.rerender();
      return true;
    }
    const addDocConfirm = event.target.closest("[data-isf-add-doc-confirm]:not(:disabled)");
    if (addDocConfirm) {
      event.preventDefault();
      const typeLabel = DOC_TYPE_OPTIONS.find((opt) => opt.id === panelState.addDocType)?.label || panelState.addDocType;
      const fileName = panelState.addDocFiles[0]?.name || "document";
      toast(`Adding ${fileName} as ${typeLabel} is not persisted in this sample.`, "notice");
      panelState.docModal = "";
      panelState.addDocFiles = [];
      helpers.rerender();
      return true;
    }
    const removeFile = event.target.closest("[data-isf-add-doc-file-remove]");
    if (removeFile) {
      event.preventDefault();
      const id = removeFile.getAttribute("data-isf-add-doc-file-remove");
      panelState.addDocFiles = panelState.addDocFiles.filter((file) => file.id !== id);
      helpers.rerender();
      return true;
    }
    const browse = event.target.closest(".isf-add-doc__browse");
    if (browse) {
      event.preventDefault();
      event.stopPropagation();
      document.querySelector("[data-isf-add-doc-upload-input]")?.click();
      return true;
    }
    const dropzone = event.target.closest("[data-isf-add-doc-dropzone]");
    if (dropzone && !event.target.closest(".isf-add-doc__browse")) {
      event.preventDefault();
      document.querySelector("[data-isf-add-doc-upload-input]")?.click();
      return true;
    }
    return false;
  }

  function handleAddDocModalChange(event, panelState, helpers) {
    const input = event.target.closest("[data-isf-add-doc-upload-input]");
    if (!input?.files?.length || panelState.docModal !== "add") {
      return false;
    }
    addAddDocFiles(input.files, panelState);
    input.value = "";
    helpers.rerender();
    return true;
  }

  function handleAddDocModalDrop(event, panelState, helpers) {
    const dropzone = event.target.closest("[data-isf-add-doc-dropzone]");
    if (!dropzone || panelState.docModal !== "add") {
      return false;
    }
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) {
      addAddDocFiles(files, panelState);
      helpers.rerender();
    }
    return true;
  }

  function handleAddDocModalInput(event, panelState, helpers) {
    const search = event.target.closest("[data-isf-add-doc-search]");
    if (!search || panelState.docModal !== "add") {
      return false;
    }
    panelState.addDocQuery = search.value;
    helpers.rerender();
    return true;
  }

  function renderObsoleteModal(row, panelState = state, opts = {}) {
    if (panelState.docModal !== "obsolete") {
      return "";
    }
    const bodyHtml = `<fieldset class="isf-obsolete-modal">
      <legend class="visually-hidden">Mark ${escapeHtml(row.transactionId)} obsolete</legend>
      <label class="isf-obsolete-modal__choice type-body-sm">
        <input type="radio" name="isfObsoleteChoice" data-isf-obsolete-choice="obsolete"${panelState.obsoleteChoice === "obsolete" ? " checked" : ""} /> Obsolete
      </label>
      <label class="isf-obsolete-modal__choice type-body-sm">
        <input type="radio" name="isfObsoleteChoice" data-isf-obsolete-choice="not-obsolete"${panelState.obsoleteChoice === "not-obsolete" ? " checked" : ""} /> Not Obsolete
      </label>
    </fieldset>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-obsolete-confirm>Submit</button>`;
    if (opts.variant === "popover") {
      return `<div class="isf-doc-viewer__obsolete-popover" role="dialog" id="kn-isf-obsolete-popover" aria-labelledby="kn-isf-obsolete-title">
        <h2 class="isf-doc-viewer__obsolete-title type-ui-sm type-weight-semibold" id="kn-isf-obsolete-title">Mark Obsolete</h2>
        ${bodyHtml}
        <div class="isf-doc-viewer__obsolete-actions">
          <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
          <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-isf-obsolete-confirm>Submit</button>
        </div>
      </div>`;
    }
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

  function handleObsoleteModalClick(event, row, panelState, helpers) {
    const obsoleteOpen = event.target.closest("[data-isf-obsolete-open]");
    if (obsoleteOpen) {
      event.preventDefault();
      if (panelState.docModal === "obsolete") {
        panelState.docModal = "";
      } else {
        panelState.docModal = "obsolete";
        panelState.obsoleteChoice = "obsolete";
        panelState.selectOpen = "";
      }
      helpers.rerender();
      return true;
    }
    if (panelState.docModal !== "obsolete") {
      return false;
    }
    const modalDismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (modalDismiss) {
      event.preventDefault();
      panelState.docModal = "";
      panelState.selectOpen = "";
      helpers.rerender();
      return true;
    }
    const obsoleteChoice = event.target.closest("[data-isf-obsolete-choice]");
    if (obsoleteChoice) {
      panelState.obsoleteChoice = obsoleteChoice.getAttribute("data-isf-obsolete-choice") || "obsolete";
      helpers.rerender();
      return true;
    }
    const choiceLabel = event.target.closest(".isf-obsolete-modal__choice");
    if (choiceLabel) {
      const input = choiceLabel.querySelector("[data-isf-obsolete-choice]");
      if (input) {
        panelState.obsoleteChoice = input.getAttribute("data-isf-obsolete-choice") || "obsolete";
        helpers.rerender();
        return true;
      }
    }
    const obsoleteConfirm = event.target.closest("[data-isf-obsolete-confirm]");
    if (obsoleteConfirm) {
      event.preventDefault();
      toast(`Marking ${row.transactionId} as ${panelState.obsoleteChoice === "obsolete" ? "obsolete" : "not obsolete"} is not available in this sample.`, "notice");
      panelState.docModal = "";
      helpers.rerender();
      return true;
    }
    return false;
  }

  function render(row, meta = {}) {
    resetIfNewRow(row, meta.keepTab);
    const detail = buildIsfDetail(row);
    return `<div class="isf-detail-layout">
      ${renderDocPanel(row, detail)}
      ${renderRecordPanel(row, detail, meta)}
    </div>
    ${renderPrintModal(row, detail)}
    ${renderAddDocModal(row, detail)}
    ${renderObsoleteModal(row, state)}`;
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
      return handleDocPanelClick(event, row, state, helpers);
    }
    const docIdxBtn = event.target.closest("[data-isf-doc-index]");
    if (docIdxBtn) {
      return handleDocPanelClick(event, row, state, helpers);
    }
    const zoomIn = event.target.closest("[data-isf-zoom-in]:not(:disabled)");
    if (zoomIn) {
      return handleDocPanelClick(event, row, state, helpers);
    }
    const zoomOut = event.target.closest("[data-isf-zoom-out]:not(:disabled)");
    if (zoomOut) {
      return handleDocPanelClick(event, row, state, helpers);
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
      return handlePrintModalClick(event, row, state, helpers);
    }
    const addDocOpen = event.target.closest("[data-isf-add-doc-open]");
    if (addDocOpen) {
      return handleAddDocModalClick(event, row, state, helpers);
    }
    const obsoleteOpen = event.target.closest("[data-isf-obsolete-open]");
    if (obsoleteOpen) {
      return handleObsoleteModalClick(event, row, state, helpers);
    }
    const modalDismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (modalDismiss) {
      event.preventDefault();
      if (state.docModal === "print") {
        return handlePrintModalClick(event, row, state, helpers);
      }
      if (state.docModal === "add") {
        return handleAddDocModalClick(event, row, state, helpers);
      }
      if (state.docModal === "obsolete") {
        return handleObsoleteModalClick(event, row, state, helpers);
      }
      state.docModal = "";
      state.selectOpen = "";
      helpers.rerender();
      return true;
    }
    if (handlePrintModalClick(event, row, state, helpers)) {
      return true;
    }
    if (handleAddDocModalClick(event, row, state, helpers)) {
      return true;
    }
    if (handleObsoleteModalClick(event, row, state, helpers)) {
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
      state.addDocFiles = [];
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
    if (handleAddDocModalInput(event, state, helpers)) {
      return true;
    }
    return false;
  }

  function handleChange(event, row, helpers) {
    if (handleAddDocModalChange(event, state, helpers)) {
      return true;
    }
    return false;
  }

  function handleDrop(event, row, helpers) {
    if (handleAddDocModalDrop(event, state, helpers)) {
      return true;
    }
    return false;
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
            <div class="skeleton-stack">
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

  window.KNIsfDetail = {
    renderTransactionSidePanel,
    prepareTransactionSidePanel,
    renderTransactionDrawer,
    prepareTransactionDrawer,
    render,
    handleClick,
    handleKeydown,
    handleInput,
    handleChange,
    handleDrop,
    renderSkeleton,
    buildDetail: buildIsfDetail,
    docCategories: () => DOC_CATEGORIES,
    docCode,
    docReceivedDate,
    seedFor,
    createDocPanelState,
    defaultDocPanelCategory,
    renderDocRail,
    renderDocPreviewArea,
    renderDocumentPageMock,
    renderDocumentPreview,
    renderPdfDocumentPreview,
    renderEmailThreadPreview,
    documentAssetUrl,
    documentViewerHash,
    openDocumentInNewTab,
    productionDocId,
    viewerRecordId,
    viewerRecordIdOptions,
    isFeaturedEmailDoc,
    iconPrint,
    iconAdd,
    iconSearch,
    iconExternal,
    iconDownload,
    iconZoomIn,
    iconZoomOut,
    iconDocCat,
    iconCalendar,
    iconFieldWarn,
    handleDocPanelClick,
    renderPrintModal,
    handlePrintModalClick,
    renderAddDocModal,
    handleAddDocModalClick,
    handleAddDocModalInput,
    handleAddDocModalChange,
    handleAddDocModalDrop,
    renderObsoleteModal,
    handleObsoleteModalClick,
    wrapDocArtifact,
    previewDocFormat,
    renderScanImagePreview
  };
})();
