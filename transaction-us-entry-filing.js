// Entry Summary Filing workstation — Document Panel / Entry Summary Form /
// Utility Panel, for a single US Entry row (see transaction-us-entry.js's
// list, and its "filingRouteId()" sub-route dispatch into this module).
//
// This is a demo-scale representative slice of CBP Form 7501 (~24 fields
// across 6 sections), not a complete implementation — see docs in
// docs/klearnow_agentic_broker_vision (project memory) for the full spec
// this build demonstrates: six visible field states, an audit-trail patch
// per settled change, and a session-level Agent Interaction Mode that
// changes how agent-proposed changes get applied (never what the agent may
// see/suggest). Follows transaction-us-isf-detail.js's module shape/helpers
// closely — same escapeHtml/toast/statusBadge/modalShell/focus-management
// conventions — but fields here are genuinely editable (ISF's are
// permanently disabled), since user_override requires real typing.
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

  function agentBatchFieldLabel(count) {
    return count === 1 ? "1 field" : `${count} fields`;
  }

  function formatAgentBatchSource(labels = []) {
    const unique = [...new Set(labels.map((label) => String(label || "").trim()).filter(Boolean))];
    if (!unique.length) {
      return "uploaded documents";
    }
    if (unique.length === 1) {
      return unique[0];
    }
    if (unique.length === 2) {
      return `${unique[0]} and ${unique[1]}`;
    }
    return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
  }

  /** Brief confirmation when the agent updates multiple fields without per-field clicks. */
  function toastAgentBatchUpdate({ count = 0, source = "agent", suffix = "", color = "positive" } = {}) {
    if (!count) {
      return;
    }
    let message = `${agentBatchFieldLabel(count)} updated from ${source}.`;
    if (suffix) {
      message = `${message} ${suffix}`;
    }
    toast(message, color);
  }

  // ---------------------------------------------------------------------
  // Deterministic per-row synthetic data — same seeded-by-id approach as
  // transaction-us-isf-detail.js's seedFor()/pick() (no Math.random, stable
  // across renders).
  // ---------------------------------------------------------------------

  function seedFor(row) {
    const n = parseInt(String(row.id).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function pick(list, n, offset = 0) {
    return list[(n + offset) % list.length];
  }

  const ENTRY_TYPE_CODES = ["01 - CONSUMPTION", "11 - INFORMAL", "02 - CONSUMPTION QUOTA"];
  const BOND_TYPES = ["8 - CONTINUOUS", "9 - SINGLE"];
  const IMPORTER_ID_SUFFIX = ["00", "01", "02"];
  const HTS_LINES_SEED = [
    { hts: "9403.60.8081", desc: "Wooden household furniture, other", country: "VN", uom: "NO", dutyRate: "0.0%" },
    { hts: "8544.42.9090", desc: "Insulated electric cable assemblies", country: "CN", uom: "KG", dutyRate: "2.6%" },
    { hts: "6110.20.2079", desc: "Cotton knit pullovers", country: "IN", uom: "DOZ", dutyRate: "16.5%" }
  ];
  // Line 2 always renders with a deliberately invalid HTS/country pairing so
  // the `error` state + citation path is always demonstrable.
  const INVALID_COMBO = { hts: "6204.62.4020", country: "BE", desc: "Women's cotton trousers" };
  const CATAIR_CITATIONS = {
    398: {
      code: "398",
      title: "HTS Number / Country of Origin combination invalid",
      ref: "CATAIR Ch. 3B, Reject 398 (sample citation)"
    }
  };

  function validationApi() {
    return window.KNEntryValidation;
  }

  function statusApi() {
    return window.KNEntryStatusDetail;
  }

  function money(n) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const detailCache = new Map();

  function buildFilingDetail(row) {
    if (detailCache.has(row.id)) {
      return detailCache.get(row.id);
    }
    const n = seedFor(row);
    const line1 = pick(HTS_LINES_SEED, n);
    const enteredValue1 = 8000 + ((n * 137) % 42000);
    const enteredValue2 = 3000 + ((n * 211) % 15000);
    const totalDuty = Math.round(enteredValue1 * 0.026 * 100) / 100;
    const mpf = Math.max(29.66, Math.min(614.35, Math.round((enteredValue1 + enteredValue2) * 0.003464 * 100) / 100));
    const hmf = Math.round((enteredValue1 + enteredValue2) * 0.00125 * 100) / 100;
    const detail = {
      entryType: pick(ENTRY_TYPE_CODES, n),
      bondType: pick(BOND_TYPES, n, 1),
      importerNumber: `${row.firmsCode || "V136"}${pick(IMPORTER_ID_SUFFIX, n)}`,
      line1: { ...line1, quantity: 100 + ((n * 13) % 900), enteredValue: enteredValue1, unitPrice: Math.round((enteredValue1 / (100 + ((n * 13) % 900))) * 100) / 100, sku: `WDGHT-${440 + n}` },
      line2: { ...INVALID_COMBO, quantity: 50 + ((n * 17) % 400), enteredValue: enteredValue2, dutyRate: "9.9%", unitPrice: Math.round((enteredValue2 / (50 + ((n * 17) % 400))) * 100) / 100, sku: `APRL-${220 + n}` },
      totalDuty,
      mpf,
      hmf,
      totalEstimatedDuty: Math.round((totalDuty + mpf + hmf) * 100) / 100,
      parties: {
        ior: { name: row.companyName, number: `${row.firmsCode || "V136"}${pick(IMPORTER_ID_SUFFIX, n)}` },
        buyer: { name: row.companyName, number: `${row.firmsCode || "V136"}${pick(IMPORTER_ID_SUFFIX, n)}` },
        manufacturer: { name: "SHENZHEN PRECISION MFG CO LTD", number: "CN-MID-88421" },
        consignee: { name: "", number: "" },
        shipTo: { name: "", number: "" },
        shipper: { name: "SHENZHEN PRECISION MFG CO LTD", number: "CN-MID-88421" }
      },
      bol: {
        mbl: row.mbl || "EGLV1975001234",
        hbl: row.hbl || "SHAA240518047",
        carrier: pick(["EVERGREEN", "MSC", "CMA CGM", "ONE"], n),
        vessel: row.vesselName || "EVER SUPERB",
        voyage: `V${240 + (n % 90)}`
      },
      isf: {
        transactionId: row.isfTransactionId || "ISF-021D-8",
        status: "Accepted",
        filingDate: row.filingDate || "May 18, 2025",
        linkId: row.isfLinkId || "isf-1"
      },
      containers: [
        { number: `MSCU${8234560 + n}`, size: "40HC", seal: `SL${789010 + n}`, grossWeight: `${18500 + (n * 120)} KG` },
        { number: `TCLU${9123400 + n}`, size: "20GP", seal: `SL${789011 + n}`, grossWeight: `${9200 + (n * 80)} KG` }
      ],
      invoices: [
        {
          id: "1",
          number: `INV-2024-${pad(100 + n, 4)}`,
          lines: [
            { sku: `WDGHT-${440 + n}`, description: line1.desc, hts: line1.hts, coo: line1.country, quantity: 100 + ((n * 13) % 900), unitPrice: Math.round((enteredValue1 / (100 + ((n * 13) % 900))) * 100) / 100, value: enteredValue1 },
            { sku: `APRL-${220 + n}`, description: INVALID_COMBO.desc, hts: INVALID_COMBO.hts, coo: INVALID_COMBO.country, quantity: 50 + ((n * 17) % 400), unitPrice: Math.round((enteredValue2 / (50 + ((n * 17) % 400))) * 100) / 100, value: enteredValue2 }
          ]
        },
        {
          id: "2",
          number: `INV-2024-${pad(200 + n, 4)}`,
          lines: [
            { sku: `MISC-${100 + n}`, description: "Packaging materials and accessories", hts: "3923.50.0000", coo: "CN", quantity: 200, unitPrice: 12.5, value: 2500 }
          ]
        }
      ]
    };
    detailCache.set(row.id, detail);
    return detail;
  }

  function pad(n, width) {
    return String(n).padStart(width, "0");
  }

  // ---------------------------------------------------------------------
  // Six-state field model
  // ---------------------------------------------------------------------
  // empty | agent_draft | agent_final | user_override | locked | error
  //
  // One patch is logged per *settled* decision (accept/reject/edit/fill/
  // submit), not per proposal — an unreviewed agent_draft logs nothing
  // until the human (or Auto-accept) decides.

  const MODE_KEY = "kn-entry-agent-mode";

  function formStateApi() {
    return window.KNEntryFormState;
  }

  function streamApi() {
    return window.KNEntryAgentStream;
  }

  function nextActionsApi() {
    return window.KNNextActions;
  }

  function brokerMemoryApi() {
    return window.KNBrokerMemory;
  }

  function defaultRerender() {
    window.dispatchEvent(new Event("hashchange"));
  }

  function auditForEntry(entryId) {
    return formStateApi()
      .getPatches(entryId)
      .map(formStateApi().patchToLegacyDisplay)
      .reverse();
  }

  function isPscActive() {
    return Boolean(state.pscMode);
  }

  function patchMetaExtras() {
    return isPscActive() ? { patch_type: "psc_amendment" } : {};
  }

  function logPatch(entryId, legacyPatch) {
    const api = formStateApi();
    legacyPatch = { ...legacyPatch, ...patchMetaExtras() };
    const key = legacyPatch.fieldKey;
    if (key && state.fields[key]) {
      const updates = {};
      if (legacyPatch.action === "accept" || legacyPatch.action === "fill") {
        updates[key] = {
          status: "agent_final",
          value: legacyPatch.newValue ?? state.fields[key].value
        };
      } else if (legacyPatch.action === "reject") {
        updates[key] = { status: "empty", value: "" };
      } else if (legacyPatch.action === "edit") {
        updates[key] = {
          status: "user_override",
          value: legacyPatch.newValue ?? state.fields[key].value
        };
      } else {
        updates[key] = { value: legacyPatch.newValue ?? state.fields[key].value };
      }
      api.applyFieldUpdates(entryId, updates, {
        source: legacyPatch.source || "unknown",
        tool_call: legacyPatch.tool_call ?? null,
        meta: legacyPatch
      });
      return;
    }
    api.appendPatch(entryId, {
      fields_changed: [],
      source: legacyPatch.source || "human",
      tool_call: legacyPatch.tool_call ?? null,
      meta: legacyPatch
    });
  }

  function getMode() {
    if (state.mode) {
      return state.mode;
    }
    let stored = "";
    try {
      stored = window.sessionStorage.getItem(MODE_KEY) || "";
    } catch (e) {
      stored = "";
    }
    state.mode = stored === "auto-accept" || stored === "deny-all" ? stored : "permission";
    return state.mode;
  }

  function setMode(mode) {
    state.mode = mode;
    try {
      window.sessionStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      // session storage unavailable — mode still works for this render
    }
  }

  // Static rationale text shown in the review popover, by state. Field-
  // specific detail (confidence/citation) is layered in separately.
  const RATIONALE_BY_STATE = {
    agent_draft: "Klear Agent extracted this value from the source documents but confidence was below the auto-accept threshold. Review before filing.",
    agent_final: "Klear Agent extracted this value from the source documents with high confidence.",
    user_override: "You entered this value directly.",
    locked: "",
    error: "Validation failed against the cited edit."
  };

  /** Below this confidence, agent-filled fields read as needing review at a glance. */
  const AGENT_CONFIDENCE_REVIEW_THRESHOLD = 70;

  const PARTY_ROLES = [
    { id: "ior", label: "Importer of Record", sameAs: [] },
    { id: "buyer", label: "Buyer", sameAs: [{ source: "ior", label: "Importer of Record" }] },
    { id: "manufacturer", label: "Manufacturer", sameAs: [{ source: "ior", label: "Importer of Record" }, { source: "buyer", label: "Buyer" }] },
    { id: "consignee", label: "Consignee", sameAs: [{ source: "ior", label: "Importer of Record" }, { source: "buyer", label: "Buyer" }] },
    { id: "shipTo", label: "Ship To", sameAs: [{ source: "consignee", label: "Consignee" }, { source: "ior", label: "Importer of Record" }] },
    { id: "shipper", label: "Shipper", sameAs: [{ source: "manufacturer", label: "Manufacturer" }, { source: "ior", label: "Importer of Record" }] }
  ];

  const HTS_DUTY_RATES = {
    "9403.60.8081": 0.0,
    "8544.42.9090": 2.6,
    "6110.20.2079": 16.5,
    "6204.62.4020": 9.9,
    "3923.50.0000": 3.4
  };

  function validationContext() {
    return {
      fields: state.fields,
      row: { id: state.rowId },
      fieldLabel,
      parseMoney,
      invoiceLinePrefixes
    };
  }

  function runEntryValidation(options = {}, helpers) {
    const api = validationApi();
    if (!api) {
      state.validationFindings = [];
      state.validationSummary = { total: 0, critical: 0, warning: 0, info: 0 };
      state.validationStreamActive = false;
      state.validationRevealedCount = 0;
      return;
    }
    const ctx = validationContext();
    const result = options.scope === "targeted" && options.fieldKey
      ? api.runTargetedValidation(ctx, options.fieldKey)
      : api.runFullEntryValidation(ctx);
    state.validationFindings = result.findings || [];
    state.validationSummary = result.summary || api.summarizeFindings(state.validationFindings);
    state.validationScope = result.scope || "full";
    state.validationTargetField = result.fieldKey || null;
    refreshStatusMessages({ id: state.rowId });

    const visibleFindings = state.validationFindings.filter((f) => !f.suppressed);
    const rerender = helpers?.rerender || defaultRerender;
    const stream = options.stream !== false
      && options.scope !== "targeted"
      && visibleFindings.length > 0;

    if (stream) {
      startValidationStream(rerender, visibleFindings.length);
    } else {
      streamApi()?.cancel?.("validation");
      state.validationStreamActive = false;
      state.validationRevealedCount = visibleFindings.length;
    }
  }

  function startValidationStream(rerender, total) {
    const stream = streamApi();
    stream?.cancel?.("validation");
    if (stream?.prefersReducedMotion?.()) {
      state.validationStreamActive = false;
      state.validationRevealedCount = total;
      return;
    }
    state.validationRevealedCount = 0;
    state.validationStreamActive = total > 0;
    rerender();
    stream?.streamReveal?.("validation", total, {
      intervalMs: 160,
      onReveal: (index) => {
        state.validationRevealedCount = index + 1;
        rerender();
      },
      onDone: () => {
        state.validationStreamActive = false;
        state.validationRevealedCount = total;
        rerender();
        const summary = state.validationSummary || {};
        toast(`Validation complete — ${validationApi()?.summaryLabel?.(summary) || "done"}.`, summary.critical ? "notice" : "positive");
      }
    });
  }

  function setAgentReplyStreaming(text, helpers) {
    const stream = streamApi();
    const rerender = helpers?.rerender || defaultRerender;
    const full = String(text || "");
    stream?.cancel?.("agent-reply");

    if (!full) {
      state.agentResolveReply = "";
      state.agentResolveReplyFull = "";
      state.agentResolveReplyVisible = "";
      state.agentResolveReplyStreaming = false;
      rerender();
      return;
    }

    if (stream?.prefersReducedMotion?.()) {
      state.agentResolveReply = full;
      state.agentResolveReplyFull = "";
      state.agentResolveReplyVisible = "";
      state.agentResolveReplyStreaming = false;
      rerender();
      return;
    }

    state.agentResolveReply = "";
    state.agentResolveReplyFull = full;
    state.agentResolveReplyVisible = "";
    state.agentResolveReplyStreaming = true;
    rerender();

    stream.streamText("agent-reply", full, {
      onTick: (visible) => {
        state.agentResolveReplyVisible = visible;
        if (!stream.patchText("[data-entry-agent-reply-text]", visible)) {
          rerender();
        }
      },
      onDone: (done) => {
        state.agentResolveReply = done;
        state.agentResolveReplyFull = "";
        state.agentResolveReplyVisible = "";
        state.agentResolveReplyStreaming = false;
        rerender();
      }
    });
  }

  function refreshStatusMessages(row = { id: state.rowId }) {
    const api = statusApi();
    if (!api) {
      state.statusMessages = [];
      state.statusSummary = { errors: 0, warnings: 0, infos: 0, successes: 0, total: 0, latest: null };
      return;
    }
    state.statusMessages = api.buildStatusMessages({
      row,
      findings: state.validationFindings || [],
      extra: state.statusExtraMessages || []
    });
    state.statusSummary = api.summarizeMessages(state.statusMessages);
  }

  function dutyRateForHts(hts = "") {
    return validationApi()?.dutyRateForHts?.(hts) ?? 5.0;
  }

  function isInvalidHtsCoo(hts = "", coo = "") {
    return validationApi()?.isInvalidHtsCoo?.(hts, coo) ?? false;
  }

  function minimalSeedFieldEntries(row, detail) {
    const entries = {};
    const set = (key, def) => { entries[key] = def; };
    set("txn:firmsCode", { status: "locked", value: row.firmsCode || "V136", rationale: "Tied to the filer's CBP-assigned FIRMS code — cannot be edited here." });
    set("txn:eta", { status: "locked", value: row.eta || row.fspdDate || "", rationale: "Derived from carrier schedule — not editable on the entry." });
    set("isf:transactionId", { status: "locked", value: detail.isf.transactionId, rationale: "Linked ISF transaction — open in ISF module to edit." });
    set("isf:status", { status: "locked", value: detail.isf.status, rationale: "ISF acceptance status from CBP." });
    set("isf:filingDate", { status: "locked", value: detail.isf.filingDate, rationale: "Date the linked ISF was accepted." });
    set("compliance:ofac", { status: "locked", value: "Screened — no match", rationale: "OFAC/BIS/DPL screening can only be cleared by a compliance officer, regardless of Agent Interaction Mode." });
    PARTY_ROLES.forEach((role) => {
      set(`parties:${role.id}:name`, { status: "empty", value: "" });
      set(`parties:${role.id}:number`, { status: "empty", value: "" });
    });
    ["txn:entryType", "txn:entryDate", "txn:portOfEntry", "txn:bondType", "txn:mot", "bol:mbl", "bol:hbl", "bol:carrier", "bol:vessel", "bol:voyage"].forEach((key) => {
      set(key, { status: "empty", value: "" });
    });
    detail.containers.forEach((container, index) => {
      const i = index + 1;
      ["number", "size", "seal", "grossWeight"].forEach((suffix) => {
        set(`container:${i}:${suffix}`, { status: "empty", value: "" });
      });
    });
    detail.invoices.forEach((invoice) => {
      set(`invoice:${invoice.id}:number`, { status: "empty", value: "" });
      invoice.lines.forEach((line, lineIndex) => {
        const li = lineIndex + 1;
        const prefix = `invoice:${invoice.id}:line:${li}`;
        ["sku", "description", "hts", "coo", "quantity", "unitPrice"].forEach((col) => {
          set(`${prefix}:${col}`, { status: "empty", value: "" });
        });
        set(`${prefix}:value`, { status: "locked", value: "", rationale: "Computed as Quantity × Unit Price." });
      });
    });
    set("duties:totalDuty", { status: "locked", value: money(0), rationale: "Computed from invoice line HTS classifications." });
    set("duties:mpf", { status: "locked", value: money(0), rationale: "Merchandise Processing Fee, computed per 19 CFR 24.23 — not directly editable." });
    set("duties:hmf", { status: "locked", value: money(0), rationale: "Harbor Maintenance Fee, computed from entered value — not directly editable." });
    set("duties:totalEstimatedDuty", { status: "locked", value: money(0), rationale: "Sum of duty, MPF, and HMF above." });
    return entries;
  }

  function seedFieldEntries(row, detail) {
    if (String(row.id || "").startsWith("entry-upload-")) {
      return minimalSeedFieldEntries(row, detail);
    }
    const n = seedFor(row);
    const entries = {};
    const set = (key, def) => { entries[key] = def; };

    // Transaction / header fields
    set("txn:entryType", { status: n % 2 === 0 ? "agent_final" : "agent_draft", value: detail.entryType, confidence: 88 + (n % 10), rationale: "Matched to the commercial invoice terms and prior filings for this importer." });
    set("txn:entryDate", { status: "empty", value: "" });
    set("txn:portOfEntry", { status: "agent_final", value: row.portUnlading, confidence: 96, rationale: "Read directly from the Bill of Lading discharge port." });
    set("txn:firmsCode", { status: "locked", value: row.firmsCode, rationale: "Tied to the filer's CBP-assigned FIRMS code — cannot be edited here." });
    set("txn:bondType", { status: "agent_draft", value: detail.bondType, confidence: 74, rationale: "Inferred from the importer's continuous bond on file; confidence is below auto-accept threshold." });
    set("txn:mot", { status: "agent_final", value: row.mot || "OCEAN", confidence: 99, rationale: "Read from the Bill of Lading." });
    set("txn:eta", { status: "locked", value: row.eta || row.fspdDate || "", rationale: "Derived from carrier schedule — not editable on the entry." });

    // Parties — six roles, name + identifier each
    PARTY_ROLES.forEach((role) => {
      const seed = detail.parties[role.id] || { name: "", number: "" };
      const nameStatus = role.id === "ior" ? "agent_final" : role.id === "consignee" || role.id === "shipTo" ? "empty" : role.id === "buyer" ? "agent_final" : "agent_draft";
      const numStatus = role.id === "ior" ? "agent_draft" : role.id === "consignee" || role.id === "shipTo" ? "empty" : "agent_draft";
      set(`parties:${role.id}:name`, {
        status: nameStatus,
        value: seed.name,
        confidence: nameStatus === "agent_final" ? 99 : nameStatus === "agent_draft" ? 81 : null,
        rationale: role.id === "ior" ? "Matched to the Importer of Record on the commercial invoice." : "Extracted from shipping documents."
      });
      set(`parties:${role.id}:number`, {
        status: numStatus,
        value: seed.number,
        confidence: numStatus === "agent_draft" ? 81 : null,
        rationale: "Derived from the importer bond record and MID database."
      });
    });

    // BOL
    set("bol:mbl", { status: "agent_final", value: detail.bol.mbl, confidence: 99, rationale: "Read directly from the Master Bill of Lading." });
    set("bol:hbl", { status: "agent_final", value: detail.bol.hbl, confidence: 97, rationale: "Read from the House Bill of Lading." });
    set("bol:carrier", { status: "agent_final", value: detail.bol.carrier, confidence: 68, rationale: "Carrier SCAC inferred from the BOL header — confidence is below auto-accept threshold; verify before filing." });
    set("bol:vessel", { status: "agent_final", value: detail.bol.vessel, confidence: 94, rationale: "Vessel name from the BOL." });
    set("bol:voyage", { status: "agent_draft", value: detail.bol.voyage, confidence: 78, rationale: "Voyage number inferred from the sailing schedule." });

    // ISF cross-reference (mostly locked)
    set("isf:transactionId", { status: "locked", value: detail.isf.transactionId, rationale: "Linked ISF transaction — open in ISF module to edit." });
    set("isf:status", { status: "locked", value: detail.isf.status, rationale: "ISF acceptance status from CBP." });
    set("isf:filingDate", { status: "locked", value: detail.isf.filingDate, rationale: "Date the linked ISF was accepted." });

    // Containers
    detail.containers.forEach((container, index) => {
      const i = index + 1;
      set(`container:${i}:number`, { status: "agent_final", value: container.number, confidence: 98, rationale: "Container number from the packing list." });
      set(`container:${i}:size`, { status: "agent_final", value: container.size, confidence: 96, rationale: "Equipment size/type from the BOL." });
      set(`container:${i}:seal`, { status: "agent_draft", value: container.seal, confidence: 72, rationale: "Seal number extracted from the packing list — verify before filing." });
      set(`container:${i}:grossWeight`, { status: "agent_draft", value: container.grossWeight, confidence: 80, rationale: "Gross weight from carrier weight certificate." });
    });

    // Invoices + line items
    detail.invoices.forEach((invoice) => {
      set(`invoice:${invoice.id}:number`, { status: "agent_final", value: invoice.number, confidence: 97, rationale: "Invoice number from the commercial invoice document." });
      invoice.lines.forEach((line, lineIndex) => {
        const li = lineIndex + 1;
        const prefix = `invoice:${invoice.id}:line:${li}`;
        const htsInvalid = isInvalidHtsCoo(line.hts, line.coo);
        set(`${prefix}:sku`, { status: "agent_final", value: line.sku, confidence: 95, rationale: "SKU from the commercial invoice line." });
        set(`${prefix}:description`, { status: "agent_final", value: line.description, confidence: 93, rationale: "Description from the commercial invoice." });
        set(`${prefix}:hts`, { status: htsInvalid ? "error" : "agent_draft", value: line.hts, confidence: htsInvalid ? null : 92, rationale: "Classified from the product description.", citations: htsInvalid ? [CATAIR_CITATIONS[398]] : [] });
        set(`${prefix}:coo`, { status: htsInvalid ? "error" : "agent_final", value: line.coo, confidence: htsInvalid ? null : 97, rationale: "Country of origin from the certificate of origin.", citations: htsInvalid ? [CATAIR_CITATIONS[398]] : [] });
        set(`${prefix}:quantity`, { status: "user_override", value: String(line.quantity) });
        set(`${prefix}:unitPrice`, { status: "agent_final", value: String(line.unitPrice), confidence: 96, rationale: "Unit price from the commercial invoice." });
        set(`${prefix}:value`, { status: "locked", value: money(line.value), rationale: "Computed as Quantity × Unit Price." });
      });
    });

    // Duties — computed, always locked
    set("duties:totalDuty", { status: "locked", value: money(detail.totalDuty), rationale: "Computed from invoice line HTS classifications." });
    set("duties:mpf", { status: "locked", value: money(detail.mpf), rationale: "Merchandise Processing Fee, computed per 19 CFR 24.23 — not directly editable." });
    set("duties:hmf", { status: "locked", value: money(detail.hmf), rationale: "Harbor Maintenance Fee, computed from entered value — not directly editable." });
    set("duties:totalEstimatedDuty", { status: "locked", value: money(detail.totalEstimatedDuty), rationale: "Sum of duty, MPF, and HMF above." });

    // Compliance
    if (row.id === "entry-2") {
      set("compliance:ofac", {
        status: "locked",
        value: "BIS Entity List — potential match (Ref: BIS-2024-88421)",
        rationale: "OFAC/BIS/DPL screening can only be cleared by a compliance officer, regardless of Agent Interaction Mode."
      });
    } else {
      set("compliance:ofac", { status: "locked", value: "Screened — no match", rationale: "OFAC/BIS/DPL screening can only be cleared by a compliance officer, regardless of Agent Interaction Mode." });
    }

    return entries;
  }

  // ---------------------------------------------------------------------
  // View state — module-level, reset whenever the viewed row changes, same
  // convention as every other page module in this app.
  // ---------------------------------------------------------------------

  const TABS = [
    { id: "parties", label: "Parties" },
    { id: "transaction", label: "Transaction" },
    { id: "bol", label: "BOL" },
    { id: "isf", label: "ISF" },
    { id: "containers", label: "Containers" },
    { id: "invoices", label: "Invoices" },
    { id: "status", label: "Status Detail" }
  ];

  const UTILITY_TABS = [
    { id: "chat", label: "Klear Agent" },
    { id: "validation", label: "Validation" },
    { id: "journey", label: "Journey" }
  ];

  const QUEUE_FILTER_CHIPS = [
    { id: "recent", label: "Recently added" },
    { id: "working", label: "My Working List" },
    { id: "rejected", label: "CBP Rejected" },
    { id: "hold", label: "On hold" },
    { id: "completed", label: "Completed" }
  ];

  const SEARCH_ALIASES = {
    s1f01000405: "entry-1"
  };

  const MODE_OPTIONS = [
    { id: "permission", label: "Permission-per-change" },
    { id: "auto-accept", label: "Auto-accept-all" },
    { id: "deny-all", label: "Deny-all" }
  ];

  const state = {
    rowId: "",
    tab: "header",
    utilityTab: "chat",
    mode: "",
    fields: {},
    panelOpen: "",
    aceModalOpen: false,
    denyNotes: [],
    utilityQueueFilter: "working",
    utilityShowResults: false,
    utilityResults: [],
    utilitySelectedId: "",
    utilitySearchQuery: "",
    utilityQueueSyncKey: "",
    utilityShowStatements: false,
    utilityStatementCards: [],
    utilitySelectedStatementKey: "",
    activeStatementId: "",
    activeStatementLineId: "",
    statementSyncKey: "",
    statementApproveModalOpen: false,
    missingDocLabels: [],
    docsPanelPriority: false,
    docsPanelSyncKey: "",
    docsJustUploaded: false,
    invoiceTab: "1",
    editFocus: null,
    brokerLookAtKey: "",
    documents: [],
    docPipeline: {
      active: false,
      elapsedMs: 0,
      pageCount: 0,
      conflicts: [],
      fieldsTotal: 0,
      fieldsApplied: 0,
      currentDocLabel: ""
    },
    docCategory: "ci_pl",
    docDocIndex: 0,
    docPreviewPage: 0,
    docZoom: 100,
    docRailOpen: "ci_pl",
    docUploadOpen: false,
    docOverlayOpen: false,
    docsPinned: true,
    recordPinned: true,
    layoutMode: "pinned",
    rubberBandArmed: null,
    validationFindings: [],
    validationSummary: { total: 0, critical: 0, warning: 0, info: 0 },
    validationScope: "full",
    validationTargetField: null,
    statusMessages: [],
    statusSummary: { errors: 0, warnings: 0, infos: 0, successes: 0, total: 0, latest: null },
    pendingAgentResolve: null,
    agentResolveReply: "",
    agentResolveReplyFull: "",
    agentResolveReplyVisible: "",
    agentResolveReplyStreaming: false,
    extractionFeed: [],
    validationStreamActive: false,
    validationRevealedCount: 0,
    transmitModalOpen: false,
    transmitPscStep: 0,
    pscMode: false,
    pscId: "",
    pscOriginalEsStatus: "",
    pscSyncKey: "",
    catairResolveSyncKey: "",
    statusExtraMessages: [],
    proactiveFlags: [],
    dismissedProactiveFlagIds: [],
    agentTraceExpanded: {},
    journeyFocusPatchId: "",
    journeyDescending: true,
    sectionExpanded: {},
    sectionManual: {}
  };

  function resetIfNewRow(row) {
    if (state.rowId === row.id) {
      return;
    }
    const preserveQueue = state.utilityShowResults;
    const detail = buildFilingDetail(row);
    state.rowId = row.id;
    state.tab = "parties";
    state.utilityTab = "chat";
    state.invoiceTab = "1";
    state.editFocus = null;
    state.brokerLookAtKey = "";
    state.fields = formStateApi().getOrCreate(row.id, seedFieldEntries(row, detail)).fields;
    state.panelOpen = "";
    state.aceModalOpen = false;
    state.denyNotes = [];
    if (!preserveQueue) {
      state.utilityQueueFilter = "working";
      state.utilityShowResults = false;
      state.utilityResults = [];
      state.utilitySearchQuery = "";
    }
    state.utilitySelectedId = row.id;
    state.docsJustUploaded = false;
    state.pendingAgentResolve = null;
    state.agentResolveReply = "";
    state.agentResolveReplyFull = "";
    state.agentResolveReplyVisible = "";
    state.agentResolveReplyStreaming = false;
    state.extractionFeed = [];
    state.validationStreamActive = false;
    state.validationRevealedCount = 0;
    streamApi()?.cancelAll?.();
    state.statusExtraMessages = [];
    state.transmitModalOpen = false;
    state.transmitPscStep = 0;
    state.pscMode = false;
    state.pscId = "";
    state.pscOriginalEsStatus = "";
    state.pscSyncKey = "";
    state.catairResolveSyncKey = "";
    state.proactiveFlags = [];
    state.dismissedProactiveFlagIds = [];
    state.agentTraceExpanded = {};
    state.journeyFocusPatchId = "";
    state.journeyDescending = true;
    state.sectionExpanded = {};
    state.sectionManual = {};
    if (!preserveQueue) {
      state.documents = [];
      state.docPipeline = { active: false, elapsedMs: 0, pageCount: 0, conflicts: [], fieldsTotal: 0, fieldsApplied: 0, currentDocLabel: "" };
    }
    // Auto-accept-all seeds settle immediately, on load, matching what a
    // "the agent already ran" experience looks like in this mode — matches
    // the same per-mode behavior a live agent proposal would trigger.
    if (getMode() === "auto-accept") {
      Object.keys(state.fields).forEach((key) => applyAutoAccept(row.id, key));
    } else if (getMode() === "deny-all") {
      Object.keys(state.fields).forEach((key) => moveDraftToAdvisory(key));
    }
    recalculateDuties(row.id);
    runEntryValidation({ scope: "full", stream: false });
    refreshStatusMessages(row);
    runSilentOutlierChecks("load", { row });
    brokerMemoryApi()?.init?.();
  }

  function outlierApi() {
    return window.KNEntryOutlierChecks;
  }

  function runSilentOutlierChecks(trigger = "silent", options = {}) {
    const api = outlierApi();
    if (!api?.run) {
      state.proactiveFlags = [];
      return;
    }
    const row = options.row || { id: state.rowId };
    const flags = api.run({
      ...validationContext(),
      row,
      trigger,
      fieldKey: options.fieldKey || null
    });
    state.proactiveFlags = flags.filter((flag) => !state.dismissedProactiveFlagIds.includes(flag.id));
  }

  function fieldLabel(key) {
    const labels = {
      "txn:entryType": "Entry Type Code", "txn:entryDate": "Entry Date", "txn:portOfEntry": "Port of Entry",
      "txn:firmsCode": "FIRMS Code", "txn:bondType": "Bond Type", "txn:mot": "Mode of Transport", "txn:eta": "ETA",
      "parties:ior:name": "IOR Name", "parties:ior:number": "IOR Number",
      "parties:buyer:name": "Buyer Name", "parties:buyer:number": "Buyer Number",
      "parties:manufacturer:name": "Manufacturer Name", "parties:manufacturer:number": "Manufacturer MID",
      "parties:consignee:name": "Consignee Name", "parties:consignee:number": "Consignee Number",
      "parties:shipTo:name": "Ship To Name", "parties:shipTo:number": "Ship To Number",
      "parties:shipper:name": "Shipper Name", "parties:shipper:number": "Shipper Number",
      "bol:mbl": "Master BOL", "bol:hbl": "House BOL", "bol:carrier": "Carrier", "bol:vessel": "Vessel", "bol:voyage": "Voyage",
      "isf:transactionId": "ISF Transaction ID", "isf:status": "ISF Status", "isf:filingDate": "ISF Filing Date",
      "duties:totalDuty": "Total Duty", "duties:mpf": "MPF", "duties:hmf": "HMF", "duties:totalEstimatedDuty": "Total Estimated Duty",
      "compliance:ofac": "OFAC/BIS/DPL Hold Status"
    };
    if (labels[key]) {
      return labels[key];
    }
    const containerMatch = key.match(/^container:(\d+):(\w+)$/);
    if (containerMatch) {
      const labelMap = { number: "Container #", size: "Size/Type", seal: "Seal #", grossWeight: "Gross Weight" };
      return `${labelMap[containerMatch[2]] || containerMatch[2]} (Container ${containerMatch[1]})`;
    }
    const invoiceHeaderMatch = key.match(/^invoice:(\d+):number$/);
    if (invoiceHeaderMatch) {
      return `Invoice ${invoiceHeaderMatch[1]} Number`;
    }
    const lineMatch = key.match(/^invoice:(\d+):line:(\d+):(\w+)$/);
    if (lineMatch) {
      const colMap = { sku: "SKU", description: "Description", hts: "HTS", coo: "COO", quantity: "Quantity", unitPrice: "Unit Price", value: "Value" };
      return `${colMap[lineMatch[3]] || lineMatch[3]} (Inv ${lineMatch[1]} L${lineMatch[2]})`;
    }
    return key;
  }

  function fieldSection(key) {
    return key.split(":")[0];
  }

  function isFieldRequired(key) {
    if (key === "parties:ior:name" || key === "txn:entryType" || key === "txn:portOfEntry" || key === "bol:mbl") {
      return true;
    }
    if (/^container:\d+:number$/.test(key)) {
      return true;
    }
    if (/^invoice:\d+:number$/.test(key)) {
      return true;
    }
    return false;
  }

  function fieldHasAgentConfidence(f) {
    return Boolean(
      f
      && (f.status === "agent_draft" || f.status === "agent_final")
      && typeof f.confidence === "number"
    );
  }

  function fieldConfidenceNeedsReview(f) {
    return fieldHasAgentConfidence(f) && f.confidence < AGENT_CONFIDENCE_REVIEW_THRESHOLD;
  }

  function confidenceTier(confidence) {
    if (confidence < AGENT_CONFIDENCE_REVIEW_THRESHOLD) {
      return "low";
    }
    if (confidence >= 85) {
      return "high";
    }
    return "mid";
  }

  function renderFieldConfidenceIndicator(f) {
    if (!fieldHasAgentConfidence(f)) {
      return "";
    }
    const pct = Math.max(0, Math.min(100, Math.round(f.confidence)));
    const tier = confidenceTier(pct);
    const reviewNote = tier === "low" ? ", review recommended" : "";
    return `<span class="entry-field-confidence entry-field-confidence--${tier}${tier === "low" ? " entry-field-confidence--review" : ""}" role="img" aria-label="Agent confidence ${pct} percent${reviewNote}">
      <span class="entry-field-confidence__bar" aria-hidden="true"><span class="entry-field-confidence__fill" style="width:${pct}%"></span></span>
      <span class="entry-field-confidence__pct type-caption-sm" aria-hidden="true">${pct}%</span>
    </span>`;
  }

  function fieldNeedsAttention(key) {
    const f = state.fields[key];
    if (!f) {
      return false;
    }
    if (f.status === "error" || f.status === "agent_draft") {
      return true;
    }
    if (f.status === "agent_final" && fieldConfidenceNeedsReview(f)) {
      return true;
    }
    if (f.status === "empty" && isFieldRequired(key)) {
      return true;
    }
    return false;
  }

  function fieldIsLowSignal(key) {
    const f = state.fields[key];
    if (!f) {
      return true;
    }
    if (fieldNeedsAttention(key)) {
      return false;
    }
    if (f.status === "agent_final" || f.status === "locked" || f.status === "user_override") {
      return true;
    }
    if (f.status === "empty") {
      return !isFieldRequired(key);
    }
    return false;
  }

  function sectionAttentionSummary(fieldKeys = []) {
    let errors = 0;
    let drafts = 0;
    let emptyRequired = 0;
    fieldKeys.forEach((key) => {
      const f = state.fields[key];
      if (!f) {
        return;
      }
      if (f.status === "error") {
        errors += 1;
      } else if (f.status === "agent_draft" || (f.status === "agent_final" && fieldConfidenceNeedsReview(f))) {
        drafts += 1;
      } else if (f.status === "empty" && isFieldRequired(key)) {
        emptyRequired += 1;
      }
    });
    const needsAttention = errors + drafts + emptyRequired > 0;
    return { errors, drafts, emptyRequired, needsAttention };
  }

  function sectionIdForField(key) {
    if (key.startsWith("isf:")) {
      return "section:isf";
    }
    const containerMatch = key.match(/^container:(\d+):/);
    if (containerMatch) {
      return `section:container:${containerMatch[1]}`;
    }
    if (key.startsWith("duties:")) {
      return "section:txn:duties";
    }
    if (key.startsWith("compliance:")) {
      return "section:txn:compliance";
    }
    const partyMatch = key.match(/^parties:([^:]+):/);
    if (partyMatch) {
      return `section:party:${partyMatch[1]}`;
    }
    return "";
  }

  function expandSectionForField(key) {
    const sectionId = sectionIdForField(key);
    if (!sectionId || !fieldNeedsAttention(key)) {
      return;
    }
    state.sectionExpanded[sectionId] = true;
    delete state.sectionManual[sectionId];
  }

  function resolveSectionExpanded(sectionId, fieldKeys = []) {
    const summary = sectionAttentionSummary(fieldKeys);
    if (summary.needsAttention) {
      state.sectionExpanded[sectionId] = true;
      delete state.sectionManual[sectionId];
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(state.sectionManual, sectionId)) {
      return Boolean(state.sectionManual[sectionId]);
    }
    if (!fieldKeys.length) {
      return true;
    }
    return !fieldKeys.every((key) => fieldIsLowSignal(key));
  }

  function sectionCollapsedLabel(fieldKeys = [], summary) {
    if (summary?.needsAttention) {
      return "";
    }
    if (fieldKeys.every((key) => state.fields[key]?.status === "locked")) {
      return "Linked · read-only";
    }
    const verified = fieldKeys.filter((key) => {
      const f = state.fields[key];
      return f?.status === "agent_final" && !fieldConfidenceNeedsReview(f);
    }).length;
    if (verified === fieldKeys.length) {
      return `${verified} verified`;
    }
    return `${fieldKeys.length} fields settled`;
  }

  function sectionAttentionBadge(summary) {
    if (!summary.needsAttention) {
      return "";
    }
    if (summary.errors) {
      return `<span class="badge badge--negative type-caption-sm kn-badge">${summary.errors} error${summary.errors === 1 ? "" : "s"}</span>`;
    }
    if (summary.drafts) {
      return `<span class="badge badge--notice type-caption-sm kn-badge">${summary.drafts} to review</span>`;
    }
    return `<span class="badge badge--notice type-caption-sm kn-badge">${summary.emptyRequired} required</span>`;
  }

  function collapsibleChevron() {
    return `<svg class="kn-collapsible__chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg>`;
  }

  function renderCollapsibleSection({ id, title, fieldKeys = [], bodyHtml = "", lead = "" }) {
    const expanded = resolveSectionExpanded(id, fieldKeys);
    const summary = sectionAttentionSummary(fieldKeys);
    const bodyId = `entry-section-body-${String(id).replace(/[^a-z0-9]+/gi, "-")}`;
    const toneClass = summary.needsAttention ? "entry-summary-section--attention" : "entry-summary-section--settled";
    return `<div class="kn-collapsible entry-summary-section ${toneClass}${expanded ? "" : " entry-summary-section--collapsed"}" data-entry-section="${escapeHtml(id)}">
      <button
        type="button"
        class="kn-collapsible__trigger entry-summary-section__trigger"
        aria-expanded="${expanded}"
        aria-controls="${bodyId}"
        data-entry-section-toggle="${escapeHtml(id)}"
        data-kn-collapsible-managed
      >
        <span class="entry-summary-section__title type-ui-sm type-weight-semibold">${escapeHtml(title)}</span>
        ${summary.needsAttention ? sectionAttentionBadge(summary) : `<span class="type-caption-sm entry-summary-section__summary">${escapeHtml(sectionCollapsedLabel(fieldKeys, summary))}</span>`}
        ${collapsibleChevron()}
      </button>
      <div class="kn-collapsible__body entry-summary-section__body" id="${bodyId}" role="region"${expanded ? "" : " hidden"}>
        ${lead}
        ${bodyHtml}
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Agent Interaction Mode → apply logic
  // ---------------------------------------------------------------------

  function applyAutoAccept(entryId, key) {
    const f = state.fields[key];
    if (!f || f.status !== "agent_draft") {
      return;
    }
    logPatch(entryId, {
      fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
      action: "fill", previousValue: "", newValue: f.value,
      source: "agent", actor: "agent", mode: "auto-accept",
      confidence: f.confidence ?? null, rationale: f.rationale || "",
      citation: f.citations?.[0] || null
    });
  }

  function moveDraftToAdvisory(key) {
    const f = state.fields[key];
    if (!f || f.status !== "agent_draft") {
      return;
    }
    // Deny-all: the field itself never changes — the proposal only ever
    // appears as read-only advisory text in the Chat tab's "Klear Agent
    // Notes" list. Nothing here mutates state.fields[key].status.
    state.denyNotes.push({ fieldKey: key, fieldLabel: fieldLabel(key), value: f.value, confidence: f.confidence ?? null, rationale: f.rationale || "" });
  }

  // ---------------------------------------------------------------------
  // Icons — small inline SVGs, same authoring convention as every other
  // page module in this app.
  // ---------------------------------------------------------------------

  function iconFinal() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M5.5 8.2l1.7 1.7 3.3-3.8"/></svg>`;
  }
  function iconOverride() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3-7.3 7.3-3.7.7.7-3.7 7.3-7.3Z"/></svg>`;
  }
  function iconError() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 5.25v3.5M8 10.75h.01"/></svg>`;
  }
  function iconStatusSuccess() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M5.5 8.2l1.7 1.7 3.3-3.8"/></svg>`;
  }
  function iconStatusInfo() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7v4M8 5.25h.01"/></svg>`;
  }
  function iconStatusWarning() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 15 13.5H1L8 1.5Z"/><path d="M8 6.25v3M8 11.5h.01"/></svg>`;
  }
  function statusIcon(type) {
    const map = { error: iconError, warning: iconStatusWarning, info: iconStatusInfo, success: iconStatusSuccess };
    return (map[type] || iconStatusInfo)();
  }
  function iconClose() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
  }

  // ---------------------------------------------------------------------
  // Field status indicators — token-accurate six-state visuals (WCAG 2.1 AA:
  // every state pairs color with icon or text; empty has no marker).
  // ---------------------------------------------------------------------

  function brokerMemoryMatch(key, f) {
    const api = brokerMemoryApi();
    if (!api?.lookup || !f || (f.status !== "agent_draft" && f.status !== "agent_final")) {
      return null;
    }
    return api.lookup({
      fieldKey: key,
      agentValue: f.value,
      fields: state.fields
    });
  }

  function popoverBody(key, f) {
    if (f.status === "locked") {
      return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(f.rationale || "This field cannot be edited.")}</p>`;
    }
    if (f.status === "error") {
      const c = f.citations?.[0];
      return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(RATIONALE_BY_STATE.error)}</p>
        ${c ? `<div class="entry-citation">
          <span class="badge badge--negative type-caption-sm kn-badge">Reject ${escapeHtml(c.code)}</span>
          <span class="badge badge--neutral type-caption-sm kn-badge">Sample citation</span>
          <p class="type-caption-sm entry-citation__ref">${escapeHtml(c.title)} — ${escapeHtml(c.ref)}</p>
          <p class="type-caption-sm entry-citation__disclaimer">Demo citation — not a real CBP ruling.</p>
        </div>` : ""}`;
    }
    if (f.status === "user_override") {
      const patch = auditForEntry(state.rowId).find((p) => p.fieldKey === key && p.action !== "fill");
      const who = patch ? patch.actor : "you";
      const when = patch ? new Date(patch.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "just now";
      return `<p class="type-caption-sm entry-field-panel__msg">Entered by ${escapeHtml(who)} · ${escapeHtml(when)}.</p>`;
    }
    // agent_draft / agent_final
    const confidence = typeof f.confidence === "number" ? `<span class="badge badge--ai type-caption-sm kn-badge">Confidence ${f.confidence}%</span>` : "";
    const memory = brokerMemoryApi()?.renderNote?.(brokerMemoryMatch(key, f)) || "";
    return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(f.rationale || RATIONALE_BY_STATE[f.status] || "")}</p>${confidence}${memory}`;
  }

  function popoverActions(key, f) {
    if (f.status === "agent_draft") {
      return `<div class="entry-field-panel__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-reject="${escapeHtml(key)}">Reject</button>
        <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-accept="${escapeHtml(key)}">Accept</button>
      </div>`;
    }
    if (f.status === "agent_final") {
      return `<div class="entry-field-panel__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-correct="${escapeHtml(key)}">Correct this</button>
      </div>`;
    }
    return "";
  }

  function userOverrideTimestamp(key) {
    const patch = auditForEntry(state.rowId).find((p) => p.fieldKey === key && p.action === "edit");
    if (!patch?.ts) {
      return "Just now";
    }
    return new Date(patch.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function fieldErrorText(key, f) {
    if (f.status !== "error") {
      return "";
    }
    const c = f.citations?.[0];
    if (c) {
      return `${c.title} (Reject ${c.code})`;
    }
    return RATIONALE_BY_STATE.error;
  }

  function fieldsForTab(tabId) {
    return Object.keys(state.fields).filter((key) => {
      if (tabId === "parties") {
        return key.startsWith("parties:");
      }
      if (tabId === "transaction") {
        return key.startsWith("txn:") || key.startsWith("duties:") || key.startsWith("compliance:");
      }
      if (tabId === "bol") {
        return key.startsWith("bol:");
      }
      if (tabId === "isf") {
        return key.startsWith("isf:");
      }
      if (tabId === "containers") {
        return key.startsWith("container:");
      }
      if (tabId === "invoices") {
        return key.startsWith("invoice:");
      }
      if (tabId === "status") {
        return false;
      }
      return false;
    });
  }

  function errorCountForTab(tabId) {
    const api = validationApi();
    if (api && state.validationFindings?.length) {
      return api.findingsForTab(state.validationFindings, tabId).length;
    }
    return fieldsForTab(tabId).filter((key) => state.fields[key]?.status === "error").length;
  }

  function fieldStatusClass(status, f) {
    let cls = status && status !== "empty" ? ` entry-field--status-${status}` : " entry-field--empty";
    if (f && fieldConfidenceNeedsReview(f)) {
      cls += " entry-field--confidence-low";
    }
    if (f && fieldHasAgentConfidence(f)) {
      cls += " entry-field--has-confidence";
    }
    return cls;
  }

  function renderFieldPopover(key, f, isOpen) {
    if (!isOpen || (f.status !== "agent_draft" && f.status !== "agent_final")) {
      return "";
    }
    return `<div class="entry-field-panel" role="dialog" aria-label="${escapeHtml(fieldLabel(key))} review">
            <div class="entry-field-panel__head">
        <span class="entry-field-panel__badge">Klear Agent</span>
              <button class="icon-btn" type="button" data-entry-field-close aria-label="Close">${iconClose()}</button>
            </div>
            ${popoverBody(key, f)}
            ${popoverActions(key, f)}
    </div>`;
  }

  function renderFieldStatusIndicator(key, f, { isOpen = false, compact = false } = {}) {
    if (!f || f.status === "empty") {
      return "";
    }
    const confidenceHtml = renderFieldConfidenceIndicator(f);
    const lowConfidence = fieldConfidenceNeedsReview(f);
    if (f.status === "agent_draft") {
      return `<span class="entry-field-status entry-field-status--draft${compact ? " entry-field-status--compact" : ""}${lowConfidence ? " entry-field-status--review" : ""}">
        ${confidenceHtml}
        <button type="button" class="entry-field-status__review type-caption-sm" data-entry-field-toggle="${escapeHtml(key)}" aria-haspopup="dialog" aria-expanded="${isOpen}" aria-label="Agent draft — ${escapeHtml(fieldLabel(key))}, ${typeof f.confidence === "number" ? `${Math.round(f.confidence)}% confidence. ` : ""}${escapeHtml(f.rationale || "Review proposal.")}">
          <span class="entry-field-status__label" aria-hidden="true">Draft</span>
        </button>
      </span>`;
    }
    if (f.status === "agent_final") {
      const reviewLabel = lowConfidence ? "Review recommended" : "Agent verified";
      return `<span class="entry-field-status entry-field-status--final${compact ? " entry-field-status--compact" : ""}${lowConfidence ? " entry-field-status--review" : ""}">
        ${confidenceHtml}
        <button type="button" class="entry-field-status__check-btn" data-entry-field-toggle="${escapeHtml(key)}" aria-haspopup="dialog" aria-expanded="${isOpen}" aria-label="${reviewLabel} — ${escapeHtml(fieldLabel(key))}${typeof f.confidence === "number" ? `, ${Math.round(f.confidence)}% confidence` : ""}">
          <span class="visually-hidden">${reviewLabel}</span>
          <span class="entry-field-status__check" aria-hidden="true">${iconFinal()}</span>
        </button>
      </span>`;
    }
    if (f.status === "user_override") {
      const when = userOverrideTimestamp(key);
      return `<span class="entry-field-status entry-field-status--override${compact ? " entry-field-status--compact" : ""}">
        <span class="visually-hidden">Edited by you — ${escapeHtml(fieldLabel(key))}</span>
        <span class="entry-field-status__pencil" aria-hidden="true" title="Edited by you">${iconOverride()}</span>
        <time class="entry-field-status__time type-caption-sm" datetime="${escapeHtml(when)}">${escapeHtml(when)}</time>
      </span>`;
    }
    if (f.status === "locked") {
      return `<span class="entry-field-status entry-field-status--locked${compact ? " entry-field-status--compact" : ""}" aria-live="polite">
        <span class="entry-field-status__spinner" aria-hidden="true"></span>
        <span class="entry-field-status__label type-caption-sm">Locked</span>
        <span class="visually-hidden"> — ${escapeHtml(f.rationale || "This field cannot be edited.")}</span>
      </span>`;
    }
    if (f.status === "error") {
      return `<span class="entry-field-status entry-field-status--error${compact ? " entry-field-status--compact" : ""}">
        <span class="visually-hidden">Validation error — ${escapeHtml(fieldErrorText(key, f))}</span>
        <span class="entry-field-status__error-icon" aria-hidden="true">${iconError()}</span>
        <span class="entry-field-status__label type-caption-sm" aria-hidden="true">Error</span>
      </span>`;
    }
    return "";
  }

  function agentTraceApi() {
    return window.KNEntryAgentTrace;
  }

  function renderAgentTraceBlock(key, opts = {}) {
    const f = state.fields[key];
    const api = agentTraceApi();
    if (!api?.renderTrace || !f) {
      return "";
    }
    return api.renderTrace(key, f, {
      expanded: Boolean(state.agentTraceExpanded[key]),
      compact: Boolean(opts.compact),
      fieldLabel: fieldLabel(key)
    });
  }

  function renderFieldControl(key, opts = {}) {
    const f = state.fields[key];
    if (!f) {
      return "";
    }
    const isOpen = state.panelOpen === key;
    const locked = f.status === "locked";
    const invalid = f.status === "error";
    const empty = f.status === "empty";
    const rationaleId = `entry-rationale-${key.replace(/[^a-z0-9]+/gi, "-")}`;
    const errorId = `entry-error-${key.replace(/[^a-z0-9]+/gi, "-")}`;
    const draftTooltip = f.status === "agent_draft" && f.rationale ? f.rationale : "";
    const describedBy = [
      draftTooltip ? rationaleId : "",
      invalid ? errorId : ""
    ].filter(Boolean).join(" ") || undefined;
    const inputClasses = [
      "kn-field__control",
      opts.compact ? "entry-invoice-cell__input" : ""
    ].filter(Boolean).join(" ");
    return `<div class="entry-field__control-wrap${opts.compact ? " entry-field__control-wrap--compact" : ""}">
      ${draftTooltip ? `<span class="visually-hidden" id="${rationaleId}">${escapeHtml(draftTooltip)}</span>` : ""}
        <input
        class="${inputClasses}"
        id="${opts.inputId || `entry-input-${escapeHtml(key)}`}"
          type="text"
          data-entry-field="${escapeHtml(key)}"
          value="${escapeHtml(f.value || "")}"
          placeholder="${empty ? "Not filled" : "—"}"
          ${locked ? "disabled" : ""}
        ${draftTooltip ? `title="${escapeHtml(draftTooltip)}"` : ""}
          aria-invalid="${invalid ? "true" : "false"}"
        ${describedBy ? `aria-describedby="${describedBy}"` : ""}
        />
      ${renderFieldStatusIndicator(key, f, { isOpen, compact: opts.compact })}
      ${renderFieldPopover(key, f, isOpen)}
      </div>
    ${invalid ? `<p class="entry-field__error type-caption-sm" id="${errorId}" role="alert">${escapeHtml(fieldErrorText(key, f))}</p>` : ""}
      ${renderAgentTraceBlock(key, opts)}
    ${brokerMemoryApi()?.renderInlineNote?.(brokerMemoryMatch(key, f)) || ""}`;
  }

  // Composes the canonical `.kn-field` / `.kn-form-label` / `.kn-field__control`
  // shell (components.css) — status visuals use design tokens (marigold-500,
  // green-500, primary-500, blue-sapphire-300, red-500) plus icon/text labels.
  function field(key, opts = {}) {
    const f = state.fields[key];
    if (!f) {
      return "";
    }
    const locked = f.status === "locked";
    const invalid = f.status === "error";
    const rubberArmed = rubberBandEnabled() && state.rubberBandArmed === key;
    const rubberTarget = rubberBandEnabled() && !locked;
    return `<div class="kn-field entry-field${fieldStatusClass(f.status, f)}${locked ? " is-disabled" : ""}${invalid ? " is-invalid" : ""}${rubberArmed ? " entry-field--rubber-armed" : ""}${rubberTarget ? " entry-field--rubber-target" : ""}" data-entry-field-row="${escapeHtml(key)}" data-entry-field-status="${escapeHtml(f.status)}"${fieldHasAgentConfidence(f) ? ` data-entry-field-confidence="${Math.round(f.confidence)}"` : ""}>
      <label class="kn-form-label${rubberTarget ? " entry-field__label--rubber" : ""}" for="entry-input-${escapeHtml(key)}"${rubberTarget ? ` title="Click to arm — then pick text in the document preview"` : ""}>${escapeHtml(fieldLabel(key))}${opts.required ? " *" : ""}${rubberArmed ? `<span class="entry-field__rubber-badge type-caption-sm">Armed</span>` : ""}</label>
      ${renderFieldControl(key, opts)}
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Document Panel — upload, type detection, extraction, progress
  // ---------------------------------------------------------------------

  function extractApi() {
    return window.KNEntryDocExtract;
  }

  function renderExtractionFeed(options = {}) {
    const limit = options.limit || 8;
    const compact = Boolean(options.compact);
    const feed = (state.extractionFeed || []).slice(-limit);
    if (!feed.length && !state.docPipeline.active) {
      return "";
    }
    const items = feed.map((item) => {
      const conf = typeof item.confidence === "number" ? ` · ${item.confidence}%` : "";
      return `<li class="entry-extraction-feed__item${compact ? " entry-extraction-feed__item--compact" : ""}">
        <span class="type-caption-sm entry-extraction-feed__field">${escapeHtml(item.fieldLabel)}</span>
        <span class="type-body-sm entry-extraction-feed__value">${escapeHtml(item.value || "—")}</span>
        <span class="type-caption-sm entry-extraction-feed__meta">${escapeHtml(item.docLabel || "")}${conf}</span>
      </li>`;
    }).join("");
    const pending = state.docPipeline.active
      ? `<li class="entry-extraction-feed__item entry-extraction-feed__item--pending" aria-hidden="true">
          <span class="entry-extraction-feed__pulse type-caption-sm">Reading ${escapeHtml(state.docPipeline.currentDocLabel || "documents")}…</span>
        </li>`
      : "";
    return `<div class="entry-extraction-feed${compact ? " entry-extraction-feed--compact" : ""}" aria-live="polite" aria-relevant="additions">
      <p class="type-ui-sm type-weight-semibold entry-extraction-feed__title">Extraction${state.docPipeline.active ? " in progress" : ""}</p>
      <ol class="entry-extraction-feed__list">${items}${pending}</ol>
    </div>`;
  }

  function renderPipelineProgressNote() {
    const p = state.docPipeline;
    if (p.active) {
      const pct = p.fieldsTotal ? Math.round((p.fieldsApplied / Math.max(p.fieldsTotal, 1)) * 100) : 0;
      return `<div class="entry-doc-pipeline entry-doc-pipeline--live" role="status" aria-live="polite">
        <p class="type-caption-sm entry-doc-pipeline__note">
          Extracting <span data-entry-pipeline-fields>${p.fieldsApplied} / ${p.fieldsTotal || "…"} fields</span>
          · <span data-entry-pipeline-elapsed">${(p.elapsedMs / 1000).toFixed(1)}s</span>
          ${p.currentDocLabel ? ` · ${escapeHtml(p.currentDocLabel)}` : ""}
        </p>
        <div class="entry-doc-pipeline__bar" data-entry-pipeline-bar style="--entry-pipeline-progress: ${pct}%">
          <div class="entry-doc-pipeline__bar-fill"></div>
        </div>
        ${renderExtractionFeed({ limit: 4, compact: true })}
      </div>`;
    }
    if (p.elapsedMs) {
      return `<p class="type-caption-sm entry-doc-pipeline__note entry-doc-pipeline__note--done">Processed ${p.pageCount} pages in ${(p.elapsedMs / 1000).toFixed(1)}s · ${p.fieldsApplied} fields extracted</p>`;
    }
    return "";
  }

  function docSummaryCounts() {
    return extractApi()?.computeSummary?.(state.fields) || { filled: 0, needReview: 0, notInDocs: 0 };
  }

  function renderDocSummaryBar() {
    const { filled, needReview, notInDocs } = docSummaryCounts();
    return `<div class="entry-doc-summary" aria-live="polite" aria-atomic="true">
      <span class="entry-doc-summary__stat"><strong>${filled}</strong> filled</span>
      <span class="entry-doc-summary__sep" aria-hidden="true">|</span>
      <span class="entry-doc-summary__stat entry-doc-summary__stat--review"><strong>${needReview}</strong> need review</span>
      <span class="entry-doc-summary__sep" aria-hidden="true">|</span>
      <span class="entry-doc-summary__stat entry-doc-summary__stat--missing"><strong>${notInDocs}</strong> not in docs</span>
    </div>`;
  }

  function docRowStatusLabel(doc) {
    const map = {
      queued: "Queued",
      uploading: "Uploading",
      detecting: "Detecting type",
      extracting: "Extracting",
      done: "Extracted",
      error: "Failed"
    };
    return map[doc.status] || doc.status;
  }

  function docTypeBadge(typeId) {
    const label = extractApi()?.typeLabel?.(typeId) || typeId;
    return `<span class="badge badge--information type-caption-sm kn-badge entry-doc-row__type">${escapeHtml(label)}</span>`;
  }

  function renderDocProgress(doc) {
    if (doc.status === "done") {
      return `<span class="badge badge--positive type-caption-sm kn-badge">${doc.extractedCount || 0} fields</span>`;
    }
    if (doc.status === "error") {
      return `<span class="badge badge--negative type-caption-sm kn-badge">${escapeHtml(doc.errorText || "Error")}</span>`;
    }
    const pct = Math.max(0, Math.min(100, doc.progress || 0));
    const typeLabel = extractApi()?.typeLabel?.(doc.typeId) || doc.fileName;
    return `<div class="entry-doc-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${escapeHtml(typeLabel)} — ${escapeHtml(docRowStatusLabel(doc))}">
      <div class="entry-doc-progress__fill" style="--entry-doc-progress: ${pct}%"></div>
    </div>`;
  }

  function renderDocUploadZone() {
    return `<div class="kn-file-upload kn-file-upload--variable entry-doc-upload" data-upload-type="multiple" data-kn-component="file-upload">
      <div class="kn-file-upload__dropzone entry-doc-upload__dropzone" tabindex="0" role="button" aria-label="Upload import documents">
        <span class="kn-file-upload__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></svg></span>
        <p class="type-body-sm kn-file-upload__copy">Drop a packet or <button type="button" class="kn-link kn-file-upload__link entry-doc-upload__browse">browse files</button></p>
        <p class="type-caption-sm entry-doc-upload__hint">Commercial Invoice, BOL, Packing List, Arrival Notice, COO, ISF, AD/CVD, email · target ≤30s for 10 pages</p>
        <input class="kn-file-upload__input visually-hidden" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.tif,.tiff" data-entry-doc-upload />
      </div>
    </div>`;
  }

  function docPanelApi() {
    return window.KNEntryDocPanel;
  }

  function rubberBandEnabled() {
    return Boolean(state.docsPinned && state.recordPinned && state.layoutMode === "pinned");
  }

  function layoutClasses() {
    const classes = ["entry-filing-layout"];
    if (state.docsPinned) {
      classes.push("entry-filing-layout--docs-pinned");
    }
    if (state.recordPinned) {
      classes.push("entry-filing-layout--record-pinned");
    }
    if (state.layoutMode === "hover") {
      classes.push("entry-filing-layout--layout-hover");
    }
    if (state.layoutMode === "overlay") {
      classes.push("entry-filing-layout--layout-overlay");
    }
    if (state.layoutMode === "overlay" && state.docOverlayOpen) {
      classes.push("entry-filing-layout--doc-overlay-open");
    }
    if (state.docsPanelPriority) {
      classes.push("entry-filing-layout--docs-priority");
    }
    if (isPscActive()) {
      classes.push("entry-filing-layout--psc");
    }
    if (rubberBandEnabled() && state.rubberBandArmed) {
      classes.push("entry-filing-layout--rubber-armed");
    }
    return classes.join(" ");
  }

  function getDocCatalog(row) {
    return docPanelApi()?.buildCatalog(state.documents, row) || { byCategory: {}, all: [] };
  }

  function selectedDocInCatalog(catalog) {
    const list = catalog.byCategory[state.docCategory] || [];
    const index = Math.min(Math.max(0, state.docDocIndex), Math.max(0, list.length - 1));
    return { doc: list[index] || null, list, index };
  }

  function applyRubberBandPick(entryId, key, text, citation, helpers) {
    const f = state.fields[key];
    if (!f || f.status === "locked" || !text) {
      return;
    }
    const previousValue = f.value;
    const citationObj = { title: citation, ref: citation };
    formStateApi().applyFieldUpdates(entryId, {
      [key]: {
        status: "user_override",
        value: text,
        rationale: `Copied from ${citation}`,
        citations: [citationObj]
      }
    }, {
      source: "human",
      meta: {
        action: "edit",
        fieldKey: key,
        fieldLabel: fieldLabel(key),
        section: fieldSection(key),
        previousValue,
        newValue: text,
        actor: "jatin.bansal@klearnow.com",
        mode: getMode(),
        rationale: `Copied from ${citation}`,
        citation: citationObj,
        ...patchMetaExtras()
      }
    });
    validateField(key);
    cascadeFromField(entryId, key);
    runEntryValidation({ scope: "targeted", fieldKey: key });
    runSilentOutlierChecks("field-change", {
      row: { id: entryId, companyName: state.fields["parties:ior:name"]?.value || "" },
      fieldKey: key
    });
    state.rubberBandArmed = null;
    toast(`Set ${fieldLabel(key)} from ${citation}.`, "positive");
    helpers.rerender();
  }

  function renderDocCategoryRail(catalog) {
    const api = docPanelApi();
    const cats = api?.DOC_CATEGORIES || [];
    return cats.map((cat) => {
      const count = (catalog.byCategory[cat.id] || []).length;
      const isActive = state.docCategory === cat.id;
      const isOpen = state.docRailOpen === cat.id;
      const badge = `<span class="badge badge--information entry-doc-rail__count kn-badge" aria-label="${count} documents">${count}</span>`;
      const header = `<button class="entry-doc-rail__item${isActive ? " is-active" : ""}${isOpen ? " is-open" : ""}" type="button" role="tab" aria-selected="${isActive}" aria-expanded="${isOpen}" tabindex="${isActive ? "0" : "-1"}" data-entry-doc-cat="${cat.id}" data-tooltip="${escapeHtml(cat.label)}">
        ${api.categoryIcon(cat.id)}
        <span class="visually-hidden">${escapeHtml(cat.label)}</span>
        ${badge}
      </button>`;
      const docs = isOpen
        ? count === 0
          ? `<div class="entry-doc-rail__docs entry-doc-rail__docs--empty type-caption-sm">None</div>`
          : `<div class="entry-doc-rail__docs${count > 8 ? " entry-doc-rail__docs--scroll" : ""}">
              ${(catalog.byCategory[cat.id] || []).map((doc, i) => `<button class="entry-doc-rail__doc${state.docDocIndex === i && isActive ? " is-active" : ""}" type="button" data-entry-doc-index="${i}" data-tooltip="${escapeHtml(api.docLabel(doc, i))}">${i + 1}</button>`).join("")}
            </div>`
        : "";
      return header + docs;
    }).join("");
  }

  function renderDocListPanel(docs, selectedIndex) {
    if (!docs.length) {
      return `<p class="type-caption-sm entry-doc-list-panel__empty">No documents in this category.</p>`;
    }
    return `<ul class="entry-doc-list-panel__list">${docs.map((doc, i) => {
      const active = i === selectedIndex;
      const inProgress = doc.status && doc.status !== "done" && doc.status !== "error";
      return `<li><button class="entry-doc-list-panel__item${active ? " is-active" : ""}${inProgress ? " is-pending" : ""}" type="button" data-entry-doc-item="${i}">
        <span class="type-body-sm entry-doc-list-panel__name">${escapeHtml(doc.fileName || docPanelApi()?.docLabel(doc, i))}</span>
        ${doc.typeId ? docTypeBadge(doc.typeId) : ""}
        ${inProgress ? renderDocProgress(doc) : `<span class="type-caption-sm entry-doc-list-panel__meta">${doc.pages || 1} pg</span>`}
      </button></li>`;
    }).join("")}</ul>`;
  }

  function renderDocPreview(row, doc, pageIndex) {
    const api = docPanelApi();
    if (!doc) {
      return `<div class="entry-doc-preview entry-doc-preview--empty">
        <p class="type-body-sm">Select a document to preview.</p>
      </div>`;
    }
    const pages = doc.pages || 1;
    const pageHtml = api.renderPreviewPageHtml(state.docCategory, doc, pageIndex, row, escapeHtml);
    const pickClass = rubberBandEnabled() && state.rubberBandArmed ? " entry-doc-preview--pick" : "";
    const thumbs = Array.from({ length: pages }, (_, i) => `<button class="entry-doc-thumb${i === pageIndex ? " is-active" : ""}" type="button" data-entry-doc-page="${i}" aria-label="Page ${i + 1}" aria-current="${i === pageIndex ? "true" : "false"}">
      <span class="entry-doc-thumb__frame">${i + 1}</span>
    </button>`).join("");
    return `<div class="entry-doc-preview-wrap">
      <div class="entry-doc-toolbar">
        <button class="icon-btn" type="button" data-entry-doc-print aria-label="Print document">${api.iconPrint()}</button>
        <span class="type-caption-sm entry-doc-toolbar__label">${escapeHtml(api.docLabel(doc, state.docDocIndex))}</span>
      </div>
      <div class="entry-doc-preview${pickClass}" style="--entry-doc-zoom: ${state.docZoom}%" data-entry-doc-preview>
        ${pageHtml}
      </div>
      <div class="entry-doc-thumbs" role="tablist" aria-label="Page thumbnails">${thumbs}</div>
      <div class="entry-doc-zoom">
        <button class="icon-btn" type="button" data-entry-doc-zoom-out aria-label="Zoom out"${state.docZoom <= (api.ZOOM_MIN || 50) ? " disabled" : ""}>${api.iconZoomOut()}</button>
        <span class="type-caption-sm entry-doc-zoom__value">${state.docZoom}%</span>
        <button class="icon-btn" type="button" data-entry-doc-zoom-in aria-label="Zoom in"${state.docZoom >= (api.ZOOM_MAX || 200) ? " disabled" : ""}>${api.iconZoomIn()}</button>
      </div>
    </div>`;
  }

  function renderDocLayoutModes() {
    const modes = [
      { id: "pinned", label: "Pinned" },
      { id: "hover", label: "Hover" },
      { id: "overlay", label: "Overlay" }
    ];
    return `<div class="entry-doc-layout-modes" role="radiogroup" aria-label="Document panel layout">
      ${modes.map((m) => `<button class="entry-doc-layout-modes__btn${state.layoutMode === m.id ? " is-active" : ""}" type="button" role="radio" aria-checked="${state.layoutMode === m.id}" data-entry-layout-mode="${m.id}">${escapeHtml(m.label)}</button>`).join("")}
    </div>`;
  }

  function renderDocPanel(row) {
    const api = docPanelApi();
    const catalog = getDocCatalog(row);
    const { doc, list, index } = selectedDocInCatalog(catalog);
    const pageIndex = Math.min(state.docPreviewPage, Math.max(0, (doc?.pages || 1) - 1));
    const pipelineNote = renderPipelineProgressNote();
    const conflictNote = state.docPipeline.conflicts?.length
      ? `<p class="type-caption-sm entry-doc-conflicts" role="alert">${state.docPipeline.conflicts.length} cross-document ${state.docPipeline.conflicts.length === 1 ? "conflict" : "conflicts"} flagged as errors</p>`
      : "";
    const rubberHint = rubberBandEnabled() && state.rubberBandArmed
      ? `<p class="entry-doc-rubber-hint type-caption-sm" role="status">Armed: <strong>${escapeHtml(fieldLabel(state.rubberBandArmed))}</strong> — click or highlight text in the preview</p>`
      : rubberBandEnabled()
        ? `<p class="entry-doc-rubber-hint entry-doc-rubber-hint--idle type-caption-sm">Rubber-band: click a form field, then pick text in the preview</p>`
        : "";
    const uploadBlock = state.docUploadOpen
      ? renderDocUploadZone()
      : "";
    const missingDocAlert = state.missingDocLabels?.length
      ? `<div class="kn-alert kn-alert--negative kn-alert--subtle entry-doc-missing-alert" role="alert">
          <p class="type-body-sm type-weight-semibold">Missing documents on file</p>
          <p class="type-caption-sm">${state.missingDocLabels.map((label) => escapeHtml(label)).join(" · ")}</p>
          <p class="type-caption-sm entry-doc-missing-alert__hint">Upload below — standard ingestion will classify and extract. Klear Agent will not edit entry fields for you.</p>
        </div>`
      : "";
    const overlayToggle = state.layoutMode === "overlay"
      ? `<button class="btn btn--tertiary btn--sm type-ui-sm kn-btn entry-doc-overlay-toggle" type="button" data-entry-doc-overlay-toggle>${state.docOverlayOpen ? "Hide documents" : "Show documents"}</button>`
      : "";

    return `<div class="entry-doc-panel entry-filing-panel entry-filing-panel--docs" id="entry-doc-panel">
      <header class="entry-filing-panel__header entry-filing-panel__header--docs">
        <h2 class="type-heading-h6 type-weight-semibold">Documents</h2>
        <div class="entry-doc-panel__header-actions">
          ${renderDocLayoutModes()}
          ${overlayToggle}
          <button class="icon-btn entry-doc-pin${state.docsPinned ? " is-pinned" : ""}" type="button" data-entry-docs-pin aria-label="${state.docsPinned ? "Unpin document panel" : "Pin document panel"}" aria-pressed="${state.docsPinned}" data-tooltip="${state.docsPinned ? "Pinned" : "Unpinned"}">${api?.iconPin?.() || ""}</button>
        </div>
      </header>
      ${renderDocSummaryBar()}
      ${missingDocAlert}
      ${pipelineNote}
      ${conflictNote}
      ${rubberHint}
      <div class="entry-doc-panel__upload-row">
        <button class="kn-link type-caption-sm" type="button" data-entry-doc-upload-toggle>${state.docUploadOpen ? "Hide upload" : "Upload documents"}</button>
      </div>
      ${uploadBlock}
      <div class="entry-doc-panel__body">
        <div class="entry-doc-rail-scroll">
          <div class="entry-doc-rail" role="tablist" aria-label="Document categories">${renderDocCategoryRail(catalog)}</div>
        </div>
        <div class="entry-doc-main">
          <div class="entry-doc-list-panel">
            <h3 class="type-caption-sm type-weight-semibold entry-doc-list-panel__title">${escapeHtml((api?.DOC_CATEGORIES || []).find((c) => c.id === state.docCategory)?.label || "Documents")}</h3>
            ${renderDocListPanel(list, index)}
          </div>
          ${renderDocPreview(row, doc, pageIndex)}
        </div>
      </div>
    </div>`;
  }

  function handleDocPanelClick(event, row, helpers) {
    const api = docPanelApi();
    const catBtn = event.target.closest("[data-entry-doc-cat]");
    if (catBtn) {
      event.preventDefault();
      const cat = catBtn.getAttribute("data-entry-doc-cat") || "ci_pl";
      state.docCategory = cat;
      state.docRailOpen = state.docRailOpen === cat ? "" : cat;
      state.docDocIndex = 0;
      state.docPreviewPage = 0;
      helpers.rerender();
      return true;
    }
    const docIndexBtn = event.target.closest("[data-entry-doc-index]");
    if (docIndexBtn) {
      event.preventDefault();
      state.docDocIndex = Number(docIndexBtn.getAttribute("data-entry-doc-index")) || 0;
      state.docPreviewPage = 0;
      helpers.rerender();
      return true;
    }
    const docItem = event.target.closest("[data-entry-doc-item]");
    if (docItem) {
      event.preventDefault();
      state.docDocIndex = Number(docItem.getAttribute("data-entry-doc-item")) || 0;
      state.docPreviewPage = 0;
      helpers.rerender();
      return true;
    }
    const pageBtn = event.target.closest("[data-entry-doc-page]");
    if (pageBtn) {
      event.preventDefault();
      state.docPreviewPage = Number(pageBtn.getAttribute("data-entry-doc-page")) || 0;
      helpers.rerender();
      return true;
    }
    const zoomIn = event.target.closest("[data-entry-doc-zoom-in]");
    if (zoomIn) {
      event.preventDefault();
      state.docZoom = Math.min(api?.ZOOM_MAX || 200, state.docZoom + 10);
      helpers.rerender();
      return true;
    }
    const zoomOut = event.target.closest("[data-entry-doc-zoom-out]");
    if (zoomOut) {
      event.preventDefault();
      state.docZoom = Math.max(api?.ZOOM_MIN || 50, state.docZoom - 10);
      helpers.rerender();
      return true;
    }
    const printBtn = event.target.closest("[data-entry-doc-print]");
    if (printBtn) {
      event.preventDefault();
      toast("Opening print dialog for the current document preview.", "notice");
      window.print();
      return true;
    }
    const docsPin = event.target.closest("[data-entry-docs-pin]");
    if (docsPin) {
      event.preventDefault();
      state.docsPinned = !state.docsPinned;
      if (!rubberBandEnabled()) {
        state.rubberBandArmed = null;
      }
      helpers.rerender();
      return true;
    }
    const recordPin = event.target.closest("[data-entry-record-pin]");
    if (recordPin) {
      event.preventDefault();
      state.recordPinned = !state.recordPinned;
      if (!rubberBandEnabled()) {
        state.rubberBandArmed = null;
      }
      helpers.rerender();
      return true;
    }
    const layoutBtn = event.target.closest("[data-entry-layout-mode]");
    if (layoutBtn) {
      event.preventDefault();
      state.layoutMode = layoutBtn.getAttribute("data-entry-layout-mode") || "pinned";
      if (state.layoutMode !== "overlay") {
        state.docOverlayOpen = false;
      }
      if (!rubberBandEnabled()) {
        state.rubberBandArmed = null;
      }
      helpers.rerender();
      return true;
    }
    const overlayToggle = event.target.closest("[data-entry-doc-overlay-toggle]");
    if (overlayToggle) {
      event.preventDefault();
      state.docOverlayOpen = !state.docOverlayOpen;
      helpers.rerender();
      return true;
    }
    const uploadToggle = event.target.closest("[data-entry-doc-upload-toggle]");
    if (uploadToggle) {
      event.preventDefault();
      state.docUploadOpen = !state.docUploadOpen;
      helpers.rerender();
      return true;
    }
    const textPick = event.target.closest("[data-entry-doc-text]");
    if (textPick && state.rubberBandArmed) {
      event.preventDefault();
      const text = textPick.getAttribute("data-entry-doc-text") || textPick.textContent.trim();
      const region = textPick.getAttribute("data-entry-doc-region") || "selection";
      const catalog = getDocCatalog(row);
      const { doc } = selectedDocInCatalog(catalog);
      const label = api?.docLabel(doc, state.docDocIndex) || "Document";
      const citation = `${label} p.${state.docPreviewPage + 1}, ${region}`;
      applyRubberBandPick(row.id, state.rubberBandArmed, text, citation, helpers);
      return true;
    }
    return false;
  }

  function handleRubberArmClick(event, helpers) {
    if (!rubberBandEnabled()) {
      return false;
    }
    if (event.target.closest("[data-entry-field], [data-entry-field-toggle], button, a")) {
      return false;
    }
    const rowEl = event.target.closest("[data-entry-field-row]");
    if (!rowEl) {
      return false;
    }
    const key = rowEl.getAttribute("data-entry-field-row") || "";
    const f = state.fields[key];
    if (!f || f.status === "locked") {
      return false;
    }
    event.preventDefault();
    state.rubberBandArmed = state.rubberBandArmed === key ? null : key;
    if (state.rubberBandArmed) {
      toast(`Armed ${fieldLabel(key)} — pick text in the document preview.`, "notice");
    }
    helpers.rerender();
    return true;
  }

  function handleMouseUp(event, row, helpers) {
    if (!state.rubberBandArmed) {
      return false;
    }
    const preview = event.target.closest("[data-entry-doc-preview]");
    if (!preview) {
      return false;
    }
    if (event.target.closest("[data-entry-doc-text]")) {
      return false;
    }
    const sel = window.getSelection?.()?.toString?.()?.trim();
    if (!sel) {
      return false;
    }
    const api = docPanelApi();
    const catalog = getDocCatalog(row);
    const { doc } = selectedDocInCatalog(catalog);
    const label = api?.docLabel(doc, state.docDocIndex) || "Document";
    const citation = `${label} p.${state.docPreviewPage + 1}, highlighted selection`;
    applyRubberBandPick(row.id, state.rubberBandArmed, sel, citation, helpers);
    window.getSelection()?.removeAllRanges?.();
    return true;
  }

  function applyOneExtractionField(entryId, patch, appliedInRun) {
    const key = patch.fieldKey;
    const current = state.fields[key];
    if (!key || !current) {
      return { applied: false };
    }
    if (current.status === "user_override" || current.status === "locked") {
      return { applied: false };
    }

    const prior = appliedInRun.get(key);
    let update;
    let conflict = null;

    if (prior && prior.value !== patch.value) {
      const conflictMsg = `${prior.docLabel}: ${prior.citation} → ${prior.value} · ${patch.docLabel}: ${patch.sourceCitation} → ${patch.value}`;
      conflict = { fieldKey: key, message: conflictMsg };
      update = {
        status: "error",
        value: patch.value,
        confidence: null,
        rationale: `Cross-document conflict — ${conflictMsg}`,
        citations: [{ code: "XDOC", title: "Cross-document value conflict", ref: conflictMsg }]
      };
      appliedInRun.set(key, { value: patch.value, conflict: true, docLabel: patch.docLabel, citation: patch.sourceCitation });
    } else {
      const mode = getMode();
      update = {
        status: mode === "auto-accept" ? "agent_final" : "agent_draft",
        value: patch.value,
        confidence: patch.confidence,
        rationale: patch.sourceCitation,
        fill_source: patch.docType
      };
      update = agentTraceApi()?.attachTraceToUpdate?.(key, current, update) || update;
      appliedInRun.set(key, { value: patch.value, docLabel: patch.docLabel, citation: patch.sourceCitation });
    }

    formStateApi().applyFieldUpdates(entryId, { [key]: update }, {
      source: "agent",
      meta: { action: "extract", fieldKey: key, fieldLabel: fieldLabel(key), docLabel: patch.docLabel }
    });

    if (/:(quantity|unitPrice)$/.test(key)) {
      recalcLineValue(key);
    }
    if (key.endsWith(":hts")) {
      validateField(key);
    }

    return { applied: true, conflict };
  }

  function applyExtractionUpdates(entryId, updates, conflicts = [], row = null) {
    if (!Object.keys(updates).length) {
      return;
    }
    formStateApi().applyFieldUpdates(entryId, updates, {
      source: "agent",
      meta: { action: "extract", conflicts: conflicts.length }
    });
    invoiceLinePrefixes().forEach((prefix) => {
      recalcLineValue(`${prefix}:quantity`);
      validateField(`${prefix}:hts`);
    });
    recalculateDuties(entryId);
    runSilentOutlierChecks("extraction", { row: row || { id: entryId } });
  }

  function runDocumentPipeline(row, helpers) {
    const api = extractApi();
    const stream = streamApi();
    if (!api || !state.documents.length || !stream) {
      return;
    }

    stream.cancelAll();
    const EXTRACTION_TARGET_MS = 30000;
    const started = performance.now();
    const pageCount = api.totalPages(state.documents);

    state.extractionFeed = [];
    state.docPipeline = {
      active: true,
      elapsedMs: 0,
      pageCount,
      conflicts: [],
      fieldsTotal: 0,
      fieldsApplied: 0,
      currentDocLabel: ""
    };
    state.docsJustUploaded = true;
    state.utilityTab = "chat";

    state.documents.forEach((doc) => {
      doc.status = "queued";
      doc.progress = 0;
      doc.extractedCount = 0;
    });
    helpers.rerender();

    stream.runInterval("extraction-timer", 400, () => {
      state.docPipeline.elapsedMs = Math.round(performance.now() - started);
      stream.patchText("[data-entry-pipeline-elapsed]", `${(state.docPipeline.elapsedMs / 1000).toFixed(1)}s`);
      stream.patchText(
        "[data-entry-pipeline-fields]",
        `${state.docPipeline.fieldsApplied} / ${state.docPipeline.fieldsTotal || "…"} fields`
      );
      const pct = state.docPipeline.fieldsTotal
        ? Math.round((state.docPipeline.fieldsApplied / state.docPipeline.fieldsTotal) * 100)
        : 0;
      const bar = document.querySelector("[data-entry-pipeline-bar]");
      if (bar) {
        bar.style.setProperty("--entry-pipeline-progress", `${pct}%`);
      }
    });

    (async () => {
      const fieldQueue = [];
      const docCount = state.documents.length;
      const docPhaseMs = Math.min(6000, EXTRACTION_TARGET_MS * 0.2);
      const perDocMs = docPhaseMs / Math.max(docCount, 1);

      for (let docIndex = 0; docIndex < docCount; docIndex += 1) {
        const doc = state.documents[docIndex];
        doc.status = "detecting";
        doc.progress = 10;
        state.docPipeline.currentDocLabel = api.typeLabel(doc.typeId) || doc.fileName;
        helpers.rerender();
        await stream.delay(perDocMs * 0.35);

        doc.typeId = doc.typeId || api.detectDocumentType(doc.fileName);
        doc.status = "extracting";
        doc.progress = 30;
        helpers.rerender();
        await stream.delay(perDocMs * 0.35);

        const patches = api.extractFromDocument(doc, row);
        patches.forEach((patch) => {
          fieldQueue.push({
            ...patch,
            docId: doc.id,
            docLabel: patch.docLabel || api.typeLabel(doc.typeId)
          });
        });
        helpers.rerender();
        await stream.delay(perDocMs * 0.3);
      }

      state.docPipeline.fieldsTotal = fieldQueue.length;
      const elapsed = performance.now() - started;
      const fieldPhaseMs = Math.max(4000, EXTRACTION_TARGET_MS - elapsed);
      const msPerField = Math.min(
        900,
        Math.max(120, Math.floor(fieldPhaseMs / Math.max(fieldQueue.length, 1)))
      );

      const appliedInRun = new Map();
      const conflicts = [];
      const appliedSources = [];

      for (let fi = 0; fi < fieldQueue.length; fi += 1) {
        const patch = fieldQueue[fi];
        const doc = state.documents.find((item) => item.id === patch.docId);
        if (doc) {
          state.docPipeline.currentDocLabel = patch.docLabel;
          doc.status = "extracting";
          doc.progress = Math.min(95, 30 + Math.round((fi / Math.max(fieldQueue.length, 1)) * 65));
        }

        const result = applyOneExtractionField(row.id, patch, appliedInRun);
        if (result.conflict) {
          conflicts.push(result.conflict);
          state.docPipeline.conflicts = conflicts;
        }
        if (result.applied) {
          expandSectionForField(patch.fieldKey);
          state.docPipeline.fieldsApplied += 1;
          if (patch.docLabel) {
            appliedSources.push(patch.docLabel);
          }
          state.extractionFeed.push({
            fieldKey: patch.fieldKey,
            fieldLabel: fieldLabel(patch.fieldKey),
            value: patch.value,
            confidence: patch.confidence,
            docLabel: patch.docLabel,
            ts: Date.now()
          });
          if (doc) {
            doc.extractedCount = (doc.extractedCount || 0) + 1;
          }
        }

        helpers.rerender();
        await stream.delay(msPerField);
      }

      state.documents.forEach((doc) => {
        doc.status = "done";
        doc.progress = 100;
      });
      stream.cancel("extraction-timer");

      invoiceLinePrefixes().forEach((prefix) => {
        recalcLineValue(`${prefix}:quantity`);
        validateField(`${prefix}:hts`);
      });
      recalculateDuties(row.id);
      runSilentOutlierChecks("extraction", { row });

      state.docPipeline = {
        active: false,
        elapsedMs: Math.round(performance.now() - started),
        pageCount,
        conflicts,
        fieldsTotal: fieldQueue.length,
        fieldsApplied: state.docPipeline.fieldsApplied,
        currentDocLabel: ""
      };

      runEntryValidation({ scope: "full", stream: true }, helpers);
      helpers.rerender();
      const appliedCount = state.docPipeline.fieldsApplied;
      if (appliedCount) {
        toastAgentBatchUpdate({
          count: appliedCount,
          source: formatAgentBatchSource(appliedSources),
          suffix: conflicts.length
            ? `${conflicts.length} cross-document ${conflicts.length === 1 ? "conflict" : "conflicts"} flagged.`
            : "",
          color: conflicts.length ? "notice" : "positive"
        });
      }
    })();
  }

  function startDocumentUpload(fileList, row, helpers) {
    const api = extractApi();
    if (!api) {
      toast("Document extraction is unavailable.", "notice");
      return;
    }
    const normalized = api.normalizeUploadedFiles(fileList);
    if (!normalized.length) {
      return;
    }
    state.documents = normalized.map((doc) => ({
      ...doc,
      status: "queued",
      progress: 0,
      extractedCount: 0
    }));
    runDocumentPipeline(row, helpers);
  }

  function handleDocUploadChange(event, row, helpers) {
    const input = event.target.closest("[data-entry-doc-upload]");
    if (!input?.files?.length) {
      return false;
    }
    startDocumentUpload(input.files, row, helpers);
    input.value = "";
    return true;
  }

  function handleDocUploadClick(event, row, helpers) {
    const browse = event.target.closest(".entry-doc-upload__browse");
    const dropzone = event.target.closest(".entry-doc-upload__dropzone");
    if (browse) {
      event.preventDefault();
      event.stopPropagation();
      document.querySelector("[data-entry-doc-upload]")?.click();
      return true;
    }
    if (dropzone && !event.target.closest(".entry-doc-upload__browse")) {
      event.preventDefault();
      document.querySelector("[data-entry-doc-upload]")?.click();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Validation, cascade, and duty recalculation
  // ---------------------------------------------------------------------

  function parseMoney(value = "") {
    const n = parseFloat(String(value).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function invoiceLineKeys() {
    return Object.keys(state.fields).filter((key) => /^invoice:\d+:line:\d+:/.test(key));
  }

  function invoiceLinePrefixes() {
    const prefixes = new Set();
    invoiceLineKeys().forEach((key) => {
      const m = key.match(/^(invoice:\d+:line:\d+):/);
      if (m) {
        prefixes.add(m[1]);
      }
    });
    return [...prefixes].sort();
  }

  function htsKeyForLinePrefix(prefix) {
    return `${prefix}:hts`;
  }

  function cooKeyForLinePrefix(prefix) {
    return `${prefix}:coo`;
  }

  function validateHtsCooPair(htsKey, cooKey) {
    const hts = state.fields[htsKey]?.value || "";
    const coo = state.fields[cooKey]?.value || "";
    if (!hts || !coo) {
      return { valid: true };
    }
    if (isInvalidHtsCoo(hts, coo)) {
      return { valid: false, citations: [validationApi()?.CATAIR_CITATIONS?.[398] || CATAIR_CITATIONS[398]] };
    }
    return { valid: true };
  }

  function applyFieldStatusUpdates(updates, entryId, meta = {}) {
    if (!Object.keys(updates).length) {
      return;
    }
    formStateApi().applyFieldUpdates(entryId, updates, { source: meta.source || "validation", meta });
  }

  function validateField(key) {
    if (key.endsWith(":hts") || key.endsWith(":coo")) {
      const htsKey = key.endsWith(":hts") ? key : key.replace(":coo", ":hts");
      const cooKey = key.endsWith(":coo") ? key : key.replace(":hts", ":coo");
      if (!state.fields[htsKey] || !state.fields[cooKey]) {
        return;
      }
      const result = validateHtsCooPair(htsKey, cooKey);
      const updates = {};
      if (!result.valid) {
        [htsKey, cooKey].forEach((fieldKey) => {
          if (state.fields[fieldKey].status !== "locked") {
            updates[fieldKey] = { status: "error", citations: result.citations };
          }
        });
      } else {
        [htsKey, cooKey].forEach((fieldKey) => {
          const f = state.fields[fieldKey];
          if (f.status === "error") {
            updates[fieldKey] = { status: f.value ? "agent_draft" : "empty", citations: [] };
          }
        });
      }
      applyFieldStatusUpdates(updates, state.rowId, { action: "validate" });
    }
  }

  function recalcLineValue(changedKey) {
    const m = changedKey.match(/^(invoice:\d+:line:\d+):(quantity|unitPrice)$/);
    if (!m) {
      return;
    }
    const prefix = m[1];
    const qty = parseFloat(state.fields[`${prefix}:quantity`]?.value) || 0;
    const price = parseFloat(state.fields[`${prefix}:unitPrice`]?.value) || 0;
    const value = Math.round(qty * price * 100) / 100;
    applyFieldStatusUpdates({
      [`${prefix}:value`]: { status: "locked", value: money(value), rationale: "Computed as Quantity × Unit Price." }
    }, state.rowId, { source: "system", action: "cascade" });
  }

  function recalculateDuties(entryId) {
    let totalEntered = 0;
    let totalDuty = 0;
    invoiceLinePrefixes().forEach((prefix) => {
      const value = parseMoney(state.fields[`${prefix}:value`]?.value);
      const hts = state.fields[`${prefix}:hts`]?.value || "";
      const rate = dutyRateForHts(hts) / 100;
      totalEntered += value;
      totalDuty += value * rate;
    });
    totalDuty = Math.round(totalDuty * 100) / 100;
    const mpf = Math.max(29.66, Math.min(614.35, Math.round(totalEntered * 0.003464 * 100) / 100));
    const hmf = Math.round(totalEntered * 0.00125 * 100) / 100;
    const totalEstimated = Math.round((totalDuty + mpf + hmf) * 100) / 100;
    applyFieldStatusUpdates({
      "duties:totalDuty": { status: "locked", value: money(totalDuty), rationale: "Computed from invoice line HTS classifications." },
      "duties:mpf": { status: "locked", value: money(mpf) },
      "duties:hmf": { status: "locked", value: money(hmf) },
      "duties:totalEstimatedDuty": { status: "locked", value: money(totalEstimated) }
    }, entryId, { source: "system", action: "cascade" });
  }

  function cascadeFromField(entryId, key) {
    if (key.endsWith(":quantity") || key.endsWith(":unitPrice")) {
      recalcLineValue(key);
    }
    if (key.endsWith(":hts") || key.endsWith(":coo") || key.endsWith(":quantity") || key.endsWith(":unitPrice") || key.endsWith(":value")) {
      recalculateDuties(entryId);
    }
  }

  function commitUserEdit(entryId, key, newValue, previousValue) {
    if (newValue === previousValue && state.fields[key]?.status === "user_override") {
      state.fields[key].value = newValue;
      return;
    }
    logPatch(entryId, {
      fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
      action: "edit", previousValue, newValue,
      source: "human", actor: "jatin.bansal@klearnow.com", mode: getMode(),
      confidence: null, rationale: RATIONALE_BY_STATE.user_override, citation: null
    });
  }

  function applySameAs(entryId, targetRole, sourceRole) {
    const updates = {};
    ["name", "number"].forEach((suffix) => {
      const srcKey = `parties:${sourceRole}:${suffix}`;
      const tgtKey = `parties:${targetRole}:${suffix}`;
      if (!state.fields[srcKey] || !state.fields[tgtKey] || state.fields[tgtKey].status === "locked") {
        return;
      }
      updates[tgtKey] = { status: "user_override", value: state.fields[srcKey].value, rationale: RATIONALE_BY_STATE.user_override };
    });
    if (!Object.keys(updates).length) {
      return;
    }
    formStateApi().applyFieldUpdates(entryId, updates, {
      source: "human",
      meta: { action: "same-as", from: sourceRole, to: targetRole, actor: "jatin.bansal@klearnow.com" }
    });
    toast(`Copied ${sourceRole} values to ${targetRole}.`, "positive");
  }

  function invoiceIds() {
    const ids = new Set();
    Object.keys(state.fields).forEach((key) => {
      const m = key.match(/^invoice:(\d+):/);
      if (m) {
        ids.add(m[1]);
      }
    });
    return [...ids].sort();
  }

  function invoiceLineIds(invoiceId) {
    const ids = new Set();
    Object.keys(state.fields).forEach((key) => {
      const m = key.match(new RegExp(`^invoice:${invoiceId}:line:(\\d+):`));
      if (m) {
        ids.add(m[1]);
      }
    });
    return [...ids].sort((a, b) => Number(a) - Number(b));
  }

  // ---------------------------------------------------------------------
  // Entry Summary Form (record panel)
  // ---------------------------------------------------------------------

  function renderRecordHeader(row) {
    const mbl = state.fields["bol:mbl"]?.value || row.mbl || "—";
    const importer = state.fields["parties:ior:name"]?.value || row.companyName;
    return `<div class="entry-record-header">
      <dl class="entry-record-header__grid">
        <div class="entry-record-header__item"><dt class="type-caption-sm">Entry #</dt><dd class="type-ui-sm type-weight-semibold">${escapeHtml(row.entryNumber)}</dd></div>
        <div class="entry-record-header__item"><dt class="type-caption-sm">MBL</dt><dd class="type-ui-sm type-weight-semibold">${escapeHtml(mbl)}</dd></div>
        <div class="entry-record-header__item"><dt class="type-caption-sm">Transaction ID</dt><dd class="type-ui-sm type-weight-semibold">${escapeHtml(row.transactionId)}</dd></div>
        <div class="entry-record-header__item"><dt class="type-caption-sm">Importer</dt><dd class="type-ui-sm type-weight-semibold">${escapeHtml(importer)}</dd></div>
      </dl>
    </div>`;
  }

  function renderPartiesTab() {
    return `<div class="entry-parties">
      ${PARTY_ROLES.map((role) => {
        const fieldKeys = [`parties:${role.id}:name`, `parties:${role.id}:number`];
        const shortcuts = role.sameAs.length
          ? `<div class="entry-party-block__shortcuts kn-box kn-box--flex kn-box--wrap">
            ${role.sameAs.map((shortcut) => `<button type="button" class="btn btn--tertiary btn--sm type-ui-sm kn-btn" data-entry-same-as-target="${role.id}" data-entry-same-as-source="${shortcut.source}">Same as ${escapeHtml(shortcut.label)}</button>`).join("")}
          </div>`
          : "";
        return renderCollapsibleSection({
          id: `section:party:${role.id}`,
          title: role.label,
          fieldKeys,
          bodyHtml: `<div class="entry-field-grid entry-field-grid--party">
            ${field(`parties:${role.id}:name`, { required: role.id === "ior" })}
            ${field(`parties:${role.id}:number`)}
          </div>`,
          lead: shortcuts ? `<div class="entry-party-block__shortcuts-row">${shortcuts}</div>` : ""
        });
      }).join("")}
    </div>`;
  }

  function renderTransactionTab() {
    const dutiesKeys = ["duties:totalDuty", "duties:mpf", "duties:hmf", "duties:totalEstimatedDuty"];
    const complianceKeys = ["compliance:ofac"];
    return `<div class="entry-transaction">
      <div class="entry-field-grid">
        ${field("txn:entryType", { required: true })}
        ${field("txn:entryDate")}
        ${field("txn:portOfEntry", { required: true })}
        ${field("txn:firmsCode")}
        ${field("txn:bondType")}
        ${field("txn:mot")}
        ${field("txn:eta")}
      </div>
      ${renderCollapsibleSection({
        id: "section:txn:duties",
        title: "Duties & Fees",
        fieldKeys: dutiesKeys,
        bodyHtml: `<div class="entry-field-grid">
          ${field("duties:totalDuty")}
          ${field("duties:mpf")}
          ${field("duties:hmf")}
          ${field("duties:totalEstimatedDuty")}
        </div>`
      })}
      ${renderCollapsibleSection({
        id: "section:txn:compliance",
        title: "Compliance",
        fieldKeys: complianceKeys,
        bodyHtml: `<div class="entry-field-grid">${field("compliance:ofac")}</div>`
      })}
    </div>`;
  }

  function renderBolTab() {
    return `<div class="entry-field-grid">
      ${field("bol:mbl", { required: true })}
      ${field("bol:hbl")}
      ${field("bol:carrier")}
      ${field("bol:vessel")}
      ${field("bol:voyage")}
    </div>`;
  }

  function renderIsfTab(row) {
    const fieldKeys = fieldsForTab("isf");
    const isfId = state.fields["isf:transactionId"]?.value || row.isfTransactionId || "";
    const link = row.isfLinkId ? `#transaction-us-isf/detail/${encodeURIComponent(row.isfLinkId)}` : "#transaction-us-isf";
    return renderCollapsibleSection({
      id: "section:isf",
      title: "ISF cross-reference",
      fieldKeys,
      lead: `<p class="type-body-sm entry-isf-xref__lead">Linked ISF filing for this entry. Cross-reference fields are read-only — open the ISF record to edit.</p>`,
      bodyHtml: `<div class="entry-field-grid">
          ${field("isf:transactionId")}
          ${field("isf:status")}
          ${field("isf:filingDate")}
        </div>
        ${isfId ? `<a class="btn btn--tertiary btn--sm type-ui-sm kn-btn entry-isf-xref__link" href="${escapeHtml(link)}">Open ${escapeHtml(isfId)} in ISF</a>` : ""}`
    });
  }

  function renderContainersTab() {
    const containerIndexes = [...new Set(Object.keys(state.fields).map((key) => {
      const m = key.match(/^container:(\d+):/);
      return m ? m[1] : null;
    }).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    return `<div class="entry-containers">
      ${containerIndexes.map((index) => {
        const fieldKeys = ["number", "size", "seal", "grossWeight"].map((suffix) => `container:${index}:${suffix}`);
        return renderCollapsibleSection({
          id: `section:container:${index}`,
          title: `Container ${index}`,
          fieldKeys,
          bodyHtml: `<div class="entry-field-grid">
            ${field(`container:${index}:number`, { required: true })}
            ${field(`container:${index}:size`)}
            ${field(`container:${index}:seal`)}
            ${field(`container:${index}:grossWeight`)}
          </div>`
        });
      }).join("")}
    </div>`;
  }

  function renderInvoiceLineRow(invoiceId, lineId) {
    const prefix = `invoice:${invoiceId}:line:${lineId}`;
    const cols = ["sku", "description", "hts", "coo", "quantity", "unitPrice", "value"];
    return `<tr data-entry-invoice-line="${invoiceId}:${lineId}">
      ${cols.map((col) => {
        const key = `${prefix}:${col}`;
        const f = state.fields[key];
        if (!f) {
          return `<td>—</td>`;
        }
        return `<td class="entry-invoice-cell entry-field${fieldStatusClass(f.status, f)}" data-entry-field-row="${escapeHtml(key)}" data-entry-field-status="${escapeHtml(f.status)}"${fieldHasAgentConfidence(f) ? ` data-entry-field-confidence="${Math.round(f.confidence)}"` : ""}>
          ${renderFieldControl(key, { compact: true, inputId: `entry-input-${key.replace(/[^a-z0-9]+/gi, "-")}` })}
        </td>`;
      }).join("")}
    </tr>`;
  }

  function renderInvoicesTab() {
    const ids = invoiceIds();
    const active = state.invoiceTab && ids.includes(state.invoiceTab) ? state.invoiceTab : ids[0] || "1";
    return `<div class="entry-invoices">
      <div class="entry-invoice-tabs" role="tablist" aria-label="Commercial invoices">
        ${ids.map((id) => `<button type="button" class="entry-invoice-tabs__item ${active === id ? "is-active" : ""}" role="tab" aria-selected="${active === id}" data-entry-invoice-tab="${id}">Invoice ${escapeHtml(id)}</button>`).join("")}
      </div>
      <div class="entry-invoice-panel" role="tabpanel">
        <div class="entry-field-grid entry-field-grid--single">${field(`invoice:${active}:number`, { required: true })}</div>
        <div class="entry-invoice-table-wrap">
          <table class="entry-invoice-table">
            <thead>
              <tr>
                <th class="type-caption-sm">SKU</th>
                <th class="type-caption-sm">Description</th>
                <th class="type-caption-sm">HTS</th>
                <th class="type-caption-sm">COO</th>
                <th class="type-caption-sm">Quantity</th>
                <th class="type-caption-sm">Unit Price</th>
                <th class="type-caption-sm">Value</th>
              </tr>
            </thead>
            <tbody>${invoiceLineIds(active).map((lineId) => renderInvoiceLineRow(active, lineId)).join("")}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function transmitDisabled() {
    return (state.validationSummary?.critical || 0) > 0;
  }

  function renderFormToolbar(row) {
    const transmitBlocked = transmitDisabled();
    const psc = isPscActive();
    const transmitLabel = psc ? "Submit correction to CBP" : "Transmit to CBP";
    const transmitTitle = transmitBlocked
      ? "Resolve all critical validation errors before submitting"
      : psc
        ? "Submit post-summary correction to CBP"
        : "Transmit entry summary to CBP";
    return `<div class="entry-form-toolbar">
      <button class="btn btn--secondary btn--sm type-ui-sm kn-btn" type="button" data-entry-review-7501>Review 7501 PDF</button>
      <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-entry-transmit-cbp ${transmitBlocked ? "disabled" : ""} aria-disabled="${transmitBlocked}" title="${escapeHtml(transmitTitle)}">${escapeHtml(transmitLabel)}</button>
    </div>`;
  }

  function renderPscStatusBar(row) {
    const originalEs = state.pscOriginalEsStatus || "ACCEPTED";
    const pscRef = state.pscId ? ` · PSC ${escapeHtml(state.pscId)}` : "";
    return `<div class="entry-psc-status-bar" role="status" aria-live="polite">
      <div class="entry-psc-status-bar__copy">
        <span class="entry-psc-status-bar__label type-ui-sm type-weight-semibold">PSC — Original ES: ${escapeHtml(originalEs)}</span>
        <span class="type-caption-sm entry-psc-status-bar__note">Post-summary correction on ${escapeHtml(row.entryNumber)}${pscRef} — not a fresh filing.</span>
      </div>
      <span class="badge badge--notice type-caption-sm kn-badge">PSC amendment</span>
    </div>`;
  }

  function renderStatusDetailTab(row) {
    const api = statusApi();
    const summary = state.statusSummary || {};
    const summaryText = api?.summaryLabel?.(summary) || "No status messages";
    const messages = state.statusMessages || [];
    return `<div class="entry-status-detail">
      ${renderStatusNextActions(row)}
      <div class="entry-status-detail__summary" aria-live="polite">
        <span class="type-ui-sm type-weight-semibold">${escapeHtml(summaryText)}</span>
      </div>
      ${messages.length
        ? `<ul class="entry-status-detail__list">${messages.map((msg) => {
          return `<li class="entry-status-detail__item entry-status-detail__item--${escapeHtml(msg.type)}">
            <span class="entry-status-detail__icon entry-status-detail__icon--${escapeHtml(msg.type)}" aria-hidden="true">${statusIcon(msg.type)}</span>
            <div class="entry-status-detail__body">
              <div class="entry-status-detail__meta">
                <span class="badge ${msg.type === "error" ? "badge--negative" : msg.type === "warning" ? "badge--notice" : msg.type === "success" ? "badge--positive" : "badge--information"} type-caption-sm kn-badge">${escapeHtml(api?.typeLabel?.(msg.type) || msg.type)}</span>
                <time class="type-caption-sm entry-status-detail__time" datetime="${escapeHtml(msg.timestamp)}">${escapeHtml(api?.formatTimestamp?.(msg.timestamp) || msg.timestamp)}</time>
              </div>
              <p class="type-body-sm entry-status-detail__desc">${escapeHtml(msg.description)}</p>
              <p class="type-caption-sm entry-status-detail__code"><span class="entry-status-detail__code-label">Code:</span> <code>${escapeHtml(msg.rawCode)}</code></p>
              ${msg.screeningPassthrough ? `<span class="type-caption-sm entry-status-detail__no-resolve">Compliance review required — agent cannot resolve screening hits</span>` : ""}
            </div>
          </li>`;
        }).join("")}</ul>`
        : `<p class="type-body-sm entry-utility__empty">No status messages for this entry.</p>`}
    </div>`;
  }

  function renderTabPanel(row) {
    if (state.tab === "parties") {
      return renderPartiesTab();
    }
    if (state.tab === "transaction") {
      return renderTransactionTab();
    }
    if (state.tab === "bol") {
      return renderBolTab();
    }
    if (state.tab === "isf") {
      return renderIsfTab(row);
    }
    if (state.tab === "containers") {
      return renderContainersTab();
    }
    if (state.tab === "invoices") {
      return renderInvoicesTab();
    }
    if (state.tab === "status") {
      return renderStatusDetailTab(row);
    }
    return "";
  }

  function renderTabs() {
    const api = validationApi();
    return `<div class="entry-tabs" role="tablist" aria-label="Entry Summary sections">
      ${TABS.map((t) => {
        let tabFindings = api?.findingsForTab?.(state.validationFindings || [], t.id) || [];
        let count = tabFindings.length;
        let hasCritical = tabFindings.some((f) => f.severity === "critical");
        if (t.id === "status") {
          count = (state.statusSummary?.errors || 0) + (state.statusSummary?.warnings || 0);
          hasCritical = (state.statusSummary?.errors || 0) > 0;
        }
        const badge = count
          ? `<span class="entry-tabs__error-badge badge ${hasCritical ? "badge--negative" : "badge--notice"} type-caption-sm kn-badge" aria-label="${count} ${t.id === "status" ? "status" : "validation"} ${count === 1 ? "item" : "items"}">${count}</span>`
          : "";
        return `<button class="entry-tabs__item ${state.tab === t.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${state.tab === t.id}" data-entry-tab="${t.id}">${escapeHtml(t.label)}${badge}</button>`;
      }).join("")}
    </div>`;
  }

  function navigateToFinding(findingId, helpers) {
    const finding = (state.validationFindings || []).find((f) => f.id === findingId);
    if (!finding?.navigate) {
      return;
    }
    state.tab = finding.navigate.tab || state.tab;
    if (finding.navigate.invoiceTab) {
      state.invoiceTab = finding.navigate.invoiceTab;
    }
    if (finding.fieldKey) {
      expandSectionForField(finding.fieldKey);
    }
    state.utilityTab = "validation";
    state.validationTargetField = finding.fieldKey || null;
    helpers.rerender();
    requestAnimationFrame(() => {
      const el = document.querySelector(finding.navigate.focusSelector || `[data-entry-field="${finding.fieldKey}"]`);
      el?.focus?.({ preventScroll: true });
      el?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    });
  }

  function handleValidationClick(event, helpers) {
    const gotoBtn = event.target.closest("[data-entry-validation-goto]");
    if (gotoBtn) {
      event.preventDefault();
      navigateToFinding(gotoBtn.getAttribute("data-entry-validation-goto") || "", helpers);
      return true;
    }
    return false;
  }

  function isSettled(key) {
    const s = state.fields[key].status;
    return s === "agent_final" || s === "user_override" || s === "locked" || s === "empty";
  }

  function submitAceDisabled() {
    return Object.keys(state.fields).some((key) => {
      const s = state.fields[key].status;
      return s === "error" || s === "agent_draft";
    });
  }

  function renderRecordPanel(row) {
    const disabled = submitAceDisabled();
    const api = docPanelApi();
    return `<div class="entry-filing-panel entry-filing-panel--record">
      ${renderStatementDetailsSection(row)}
      <header class="entry-filing-panel__header entry-filing-panel__header--record">
        <div class="entry-record-panel__title-row">
          <h2 class="type-heading-h6 type-weight-semibold">Entry Summary</h2>
          <button class="icon-btn entry-record-pin${state.recordPinned ? " is-pinned" : ""}" type="button" data-entry-record-pin aria-label="${state.recordPinned ? "Unpin entry form" : "Pin entry form"}" aria-pressed="${state.recordPinned}" data-tooltip="${state.recordPinned ? "Pinned" : "Unpinned"}">${api?.iconPin?.() || ""}</button>
        </div>
        ${renderRecordHeader(row)}
      </header>
      ${renderFormToolbar(row)}
      ${renderTabs()}
      <div class="entry-filing-panel__body" role="tabpanel">
        ${renderTabPanel(row)}
      </div>
      <footer class="entry-filing-footer">
        <p class="type-caption-sm entry-filing-footer__note">Klear Agent cannot perform this action for you — regardless of Agent Interaction Mode.</p>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-submit-ace ${disabled ? "disabled" : ""}>Submit to ACE</button>
      </footer>
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Utility Panel — mode switch (always visible) + Chat / Validation /
  // Journey (append-only patch timeline) tabs.
  // ---------------------------------------------------------------------

  function renderModeSwitch() {
    const current = getMode();
    return `<div class="entry-mode-switch" role="radiogroup" aria-label="Agent Interaction Mode">
      ${MODE_OPTIONS.map((m) => `<button
        class="entry-mode-switch__item ${current === m.id ? "is-active" : ""}"
        type="button" role="radio" aria-checked="${current === m.id}"
        tabindex="${current === m.id ? "0" : "-1"}"
        data-entry-mode="${m.id}"
      >${escapeHtml(m.label)}</button>`).join("")}
    </div>`;
  }

  function renderValidationTab() {
    const api = validationApi();
    const summary = state.validationSummary || { total: 0, critical: 0, warning: 0, info: 0 };
    const summaryText = api?.summaryLabel?.(summary) || "No issues";
    const findings = (state.validationFindings || []).filter((f) => !f.suppressed);
    const revealed = state.validationStreamActive
      ? findings.slice(0, state.validationRevealedCount)
      : findings;
    const pendingCount = state.validationStreamActive
      ? Math.max(0, findings.length - state.validationRevealedCount)
      : 0;
    const toolbar = renderValidationNextActions();
    const summaryBar = `<div class="entry-validation__summary${summary.total ? "" : " entry-validation__summary--clear"}" aria-live="polite">
      <span class="type-ui-sm type-weight-semibold">${escapeHtml(summaryText)}</span>
      ${state.validationScope === "targeted" && state.validationTargetField ? `<span class="type-caption-sm entry-validation__scope">Targeted · ${escapeHtml(fieldLabel(state.validationTargetField))}</span>` : ""}
    </div>`;
    if (!findings.length) {
      return `${toolbar}${summaryBar}<p class="type-body-sm entry-utility__empty">No open validation findings.</p>`;
    }
    const streamingTail = pendingCount
      ? `<li class="entry-validation-row entry-validation-row--streaming" aria-hidden="true">
          <div class="entry-validation-row__link entry-validation-row__link--pending">
            <p class="type-caption-sm">Checking… ${pendingCount} more ${pendingCount === 1 ? "finding" : "findings"}</p>
            <span class="entry-validation-row__stream-dots" aria-hidden="true"></span>
          </div>
        </li>`
      : "";
    const severityBadge = (severity) => {
      const map = {
        critical: `<span class="badge badge--negative type-caption-sm kn-badge">Critical</span>`,
        warning: `<span class="badge badge--notice type-caption-sm kn-badge">Warning</span>`,
        info: `<span class="badge badge--information type-caption-sm kn-badge">Info</span>`
      };
      return map[severity] || map.warning;
    };
    const sourceBadge = (finding) => {
      if (finding.screeningPassthrough) {
        return `<span class="badge badge--negative type-caption-sm kn-badge">Screening</span>`;
      }
      if (finding.disagreement) {
        return `<span class="badge badge--negative type-caption-sm kn-badge">CATAIR disagreement</span>`;
      }
      const map = { catair: "CATAIR", agent: "Agent", guardrail: "Guardrail", screening: "Screening" };
      return `<span class="badge badge--neutral type-caption-sm kn-badge">${escapeHtml(map[finding.source] || finding.source)}</span>`;
    };
    return `${toolbar}${summaryBar}<ul class="entry-validation-list">${revealed.map((finding) => {
      const c = finding.citation;
      const nav = finding.navigate || {};
      const tabLabel = TABS.find((t) => t.id === nav.tab)?.label || nav.tab || "";
      const path = [tabLabel, nav.invoiceTab ? `Invoice ${nav.invoiceTab}` : "", finding.fieldLabel].filter(Boolean).join(" → ");
      return `<li class="entry-validation-row entry-validation-row--${escapeHtml(finding.severity)}">
        <button class="entry-validation-row__link" type="button" data-entry-validation-goto="${escapeHtml(finding.id)}">
          <div class="entry-validation-row__head">
            ${severityBadge(finding.severity)}
            ${sourceBadge(finding)}
          </div>
          <p class="type-ui-sm type-weight-semibold entry-validation-row__field">${escapeHtml(finding.fieldLabel)}</p>
          <p class="type-body-sm entry-validation-row__desc">${escapeHtml(finding.description)}</p>
          ${c ? `<p class="type-caption-sm entry-validation-row__citation"><span class="badge badge--neutral type-caption-sm kn-badge">Reject ${escapeHtml(c.code)}</span> ${escapeHtml(c.title)} — ${escapeHtml(c.ref)}</p>` : ""}
          ${finding.disagreement ? `<div class="entry-validation-row__disagreement type-caption-sm">
            <p><strong>CATAIR:</strong> ${escapeHtml(finding.disagreement.catairSays)}</p>
            <p><strong>Agent:</strong> ${escapeHtml(finding.disagreement.agentSays)}</p>
          </div>` : ""}
          ${finding.screeningPassthrough ? `<p class="type-caption-sm entry-validation-row__screening-note">Screening result passed through unchanged — agent cannot interpret or dismiss.</p>` : ""}
          <p class="type-caption-sm entry-validation-row__path">Go to ${escapeHtml(path)}</p>
        </button>
      </li>`;
    }).join("")}${streamingTail}</ul>`;
  }

  function bucketForRow(row) {
    if (row.id === "entry-2") {
      return "rejected";
    }
    const chip = String(row.statusChip || "").toLowerCase();
    if (chip === "complete") {
      return "completed";
    }
    if (chip === "hold") {
      return "hold";
    }
    if (chip === "recent") {
      return "recent";
    }
    return "working";
  }

  function rowToCard(row) {
    return {
      id: row.transactionId,
      entryId: row.id,
      name: row.companyName,
      eta: row.eta || row.fspdDate || "—",
      mot: row.mot || "Ocean",
      bol: row.mbl || row.hbl || row.entryNumber || "—",
      bucket: bucketForRow(row)
    };
  }

  function allQueueCards() {
    const list = window.KNUsEntry?.list?.() || [];
    return list.map(rowToCard);
  }

  function normalizeSearchQuery(query = "") {
    return String(query || "")
      .trim()
      .replace(/^find\s+entry\s+/i, "")
      .trim();
  }

  function searchCards(cards, query = "") {
    const raw = String(query || "").trim();
    if (!raw) {
      return cards;
    }
    const index = window.KNShellSearchIndex;
    if (index?.entryIdsMatching) {
      const ids = index.entryIdsMatching(raw);
      if (ids) {
        return cards.filter((card) => ids.has(card.entryId));
      }
    }
    const term = normalizeSearchQuery(raw).toLowerCase();
    const aliasEntry = SEARCH_ALIASES[term.replace(/[^a-z0-9]/gi, "")];
    if (aliasEntry) {
      const hit = cards.find((card) => card.entryId === aliasEntry);
      return hit ? [hit] : cards.filter((card) => card.entryId === aliasEntry);
    }
    return cards.filter((card) =>
      [card.id, card.name, card.bol, card.entryId, card.eta, card.mot]
        .some((value) => String(value || "").toLowerCase().includes(term))
    );
  }

  function filterCards(cards, filterId = "all") {
    if (!filterId || filterId === "all") {
      return cards;
    }
    return cards.filter((card) => card.bucket === filterId);
  }

  function resolveUtilityContextKey() {
    const fields = Object.values(state.fields || {});
    if (fields.some((field) => field.status === "error")) {
      return "cbp-error";
    }
    if (!submitAceDisabled()) {
      return "ready-to-file";
    }
    if (state.docsJustUploaded) {
      return "docs-uploaded";
    }
    const filled = fields.filter((field) => field.value && field.status !== "empty").length;
    if (filled > 3 && filled < fields.length - 1) {
      return "partially-filled";
    }
    return "idle";
  }

  function renderUtilityPromptChips() {
    const api = nextActionsApi();
    if (!api?.render) {
      return "";
    }
    return api.render(api.entryUtilityActions(resolveUtilityContextKey()), {
      ariaLabel: "Suggested prompts",
      modifier: "utility"
    });
  }

  function renderValidationNextActions() {
    const api = nextActionsApi();
    if (!api?.render) {
      return "";
    }
    return api.render(api.entryValidationActions({ state, fieldLabel }), {
      ariaLabel: "Validation actions",
      modifier: "validation"
    });
  }

  function renderStatusNextActions(row) {
    const api = nextActionsApi();
    if (!api?.render) {
      return "";
    }
    return api.render(api.entryStatusActions({ state, row, transmitDisabled }), {
      ariaLabel: "CBP resolution actions",
      modifier: "status"
    });
  }

  function nextActionHandlers(row, helpers) {
    return {
      onPrompt: (query) => handleUtilityPrompt(query, helpers, row),
      onValidationFull: () => {
        runEntryValidation({ scope: "full", stream: true }, helpers);
        state.utilityTab = "validation";
        helpers.rerender();
      },
      onValidationTargeted: (fieldKey) => {
        if (!fieldKey) {
          return;
        }
        runEntryValidation({ scope: "targeted", fieldKey, stream: false }, helpers);
        state.utilityTab = "validation";
        helpers.rerender();
      },
      onStatusResolve: (messageId) => armStatusResolve(messageId, helpers),
      onResubmit: () => {
        if (transmitDisabled()) {
          toast("Cannot resubmit — critical validation errors remain.", "notice");
          return;
        }
        state.transmitModalOpen = true;
        helpers.rerender();
      }
    };
  }

  function statementsApi() {
    return window.KNPaymentUsStatements;
  }

  function parseFilingHashParams() {
    const hash = String(location.hash || "");
    const qs = hash.includes("?") ? hash.split("?")[1].split("#")[0] : "";
    return qs ? new URLSearchParams(qs) : new URLSearchParams();
  }

  function parseFilingHashDocsPanel() {
    const params = parseFilingHashParams();
    return {
      panel: params.get("panel") || "",
      upload: params.get("upload") === "1",
      missing: (params.get("missing") || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    };
  }

  function buildFilingHref(entryId, { statement = "", stmtEntry = "", queue = "" } = {}) {
    const params = new URLSearchParams();
    if (statement) {
      params.set("statement", statement);
    }
    if (stmtEntry) {
      params.set("stmtEntry", stmtEntry);
    }
    if (queue) {
      params.set("queue", queue);
    }
    const qs = params.toString();
    return `#transaction-us-entry/filing/${encodeURIComponent(entryId)}${qs ? `?${qs}` : ""}`;
  }

  function statementCardKey(card) {
    return `${card.statementId}:${card.lineId}`;
  }

  function renderUtilityStatementCards(cards, selectedKey) {
    const api = statementsApi();
    if (!cards.length) {
      return `<p class="type-body-sm entry-utility__empty">No pending statements matched.</p>`;
    }
    return `<div class="ai-shipment-list entry-utility-chat__cards" role="list">
      ${cards
        .map((card) => {
          const key = statementCardKey(card);
          const isSelected = selectedKey ? key === selectedKey : false;
          return `<button type="button" class="ai-shipment-card ai-statement-card${isSelected ? " is-selected" : ""}" role="listitem" data-entry-utility-stmt="${escapeHtml(key)}">
            <span class="ai-shipment-card__row">
              <span class="ai-shipment-card__name type-ui-sm type-weight-semibold">${escapeHtml(card.entryNumber)}</span>
              ${isSelected ? `<span class="ai-shipment-card__badge type-caption-sm">✓ Selected</span>` : ""}
            </span>
            <span class="type-caption-sm ai-statement-card__company">${escapeHtml(card.company)}</span>
            <span class="ai-shipment-card__meta type-caption-sm">Due: ${escapeHtml(api?.money?.(card.totalDue) || card.totalDue)} · Duty ${escapeHtml(api?.money?.(card.duty) || card.duty)} · MPF ${escapeHtml(api?.money?.(card.mpf) || card.mpf)} · HMF ${escapeHtml(api?.money?.(card.hmf) || card.hmf)}</span>
            <span class="type-caption-sm ai-statement-card__stmt">Statement ${escapeHtml(card.statementId)} · ${escapeHtml(card.paymentMethod)}</span>
          </button>`;
        })
        .join("")}
    </div>`;
  }

  function applyUtilityStatementSearch(helpers, row, { autoSelect = true } = {}) {
    const cards = statementsApi()?.listEntryCards?.() || [];
    state.utilityShowStatements = true;
    state.utilityShowResults = false;
    state.utilityStatementCards = cards;
    const first = cards[0];
    state.utilitySelectedStatementKey = first ? statementCardKey(first) : "";
    if (autoSelect && first) {
      selectUtilityStatement(first, helpers, row);
      return;
    }
    helpers?.rerender?.();
  }

  function selectUtilityStatement(card, helpers, row) {
    if (!card) {
      return;
    }
    const key = statementCardKey(card);
    state.utilitySelectedStatementKey = key;
    state.activeStatementId = card.statementId;
    state.activeStatementLineId = card.lineId;
    state.utilityShowStatements = true;
    const targetEntry = card.entryId || row.id;
    const href = buildFilingHref(targetEntry, {
      statement: card.statementId,
      stmtEntry: card.lineId,
      queue: parseFilingHashQueue()
    });
    if (helpers?.goto) {
      helpers.goto(href);
      return;
    }
    helpers?.rerender?.();
  }

  function utilityStatementsBrief() {
    const count = state.utilityStatementCards.length;
    if (!count) {
      return "No pending periodic daily statements posted today.";
    }
    return `${count} entry ${count === 1 ? "line" : "lines"} on pending statements. Select one to review details above the entry form — approval requires your explicit click.`;
  }

  function renderStatementDetailsSection(row) {
    const api = statementsApi();
    const statement = api?.find?.(state.activeStatementId);
    if (!statement) {
      return "";
    }
    const totals = api.statementTotals?.(statement) || {};
    const line = statement.entries.find((entry) => entry.id === state.activeStatementLineId);
    const entryLine = line ? api.entryLine?.(statement, line) : null;
    const paymentMethod = api.paymentMethodLabel?.(statement) || "—";
    return `<section class="entry-statement-details" aria-labelledby="entry-statement-details-title">
      <div class="entry-statement-details__head">
        <div class="entry-statement-details__copy">
          <h2 class="type-heading-h6 type-weight-semibold" id="entry-statement-details-title">Statement Details</h2>
          <p class="type-caption-sm entry-statement-details__note">Klear Agent surfaces this for review — only you can approve (INT-09).</p>
        </div>
        ${entryLine ? `<span class="kn-badge kn-badge--small kn-badge--information">${escapeHtml(line.entryNumber)}</span>` : ""}
      </div>
      <dl class="entry-statement-details__grid">
        <div><dt class="type-caption-sm">Statement Number</dt><dd class="type-body-sm type-weight-semibold">${escapeHtml(statement.id)}</dd></div>
        <div><dt class="type-caption-sm">Date</dt><dd class="type-body-sm">${escapeHtml(statement.statementDate)}</dd></div>
        <div><dt class="type-caption-sm">Duty</dt><dd class="type-body-sm">${escapeHtml(api.money?.(totals.duty) || totals.duty)}</dd></div>
        <div><dt class="type-caption-sm">MPF</dt><dd class="type-body-sm">${escapeHtml(api.money?.(totals.mpf) || totals.mpf)}</dd></div>
        <div><dt class="type-caption-sm">HMF</dt><dd class="type-body-sm">${escapeHtml(api.money?.(totals.hmf) || totals.hmf)}</dd></div>
        <div><dt class="type-caption-sm">Total Due</dt><dd class="type-body-sm type-weight-semibold">${escapeHtml(api.money?.(totals.totalDue) || totals.totalDue)}</dd></div>
        <div class="entry-statement-details__payment"><dt class="type-caption-sm">Payment method</dt><dd class="type-body-sm">${escapeHtml(paymentMethod)}</dd></div>
      </dl>
      ${
        entryLine
          ? `<p class="type-caption-sm entry-statement-details__line">Selected entry line · Duty ${escapeHtml(api.money(entryLine.duty))} · MPF ${escapeHtml(api.money(entryLine.mpf))} · HMF ${escapeHtml(api.money(entryLine.hmf))}</p>`
          : ""
      }
      ${
        statement.achStatus === "missing"
          ? `<div class="kn-alert kn-alert--notice kn-alert--subtle entry-statement-details__alert" role="status">
              <p class="type-body-sm"><strong>ACH authorization missing.</strong> CBP will still debit this statement — a failed pull becomes a bond claim.</p>
            </div>`
          : ""
      }
      <div class="entry-statement-details__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-stmt-update>Update</button>
        <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-entry-stmt-approve>Approve</button>
      </div>
    </section>`;
  }

  function renderStatementApproveModal(row) {
    const api = statementsApi();
    const statement = api?.find?.(state.activeStatementId);
    if (!state.statementApproveModalOpen || !statement) {
      return "";
    }
    const totals = api.statementTotals?.(statement) || {};
    const bodyHtml = `<p class="type-body-md">Approve statement <strong>${escapeHtml(statement.id)}</strong> for <strong>${escapeHtml(api.money?.(totals.totalDue) || totals.totalDue)}</strong>?</p>
      <p class="type-body-sm">This posts approval to the finance backend (INT-09) for ${escapeHtml(statement.company)}. ACH debit is scheduled for ${escapeHtml(statement.debitDate)} unless ACH is missing on file.</p>
      <p class="type-body-sm statement-approval-modal__disclaimer">Klear Agent cannot perform this action for you — regardless of Agent Interaction Mode.</p>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-entry-stmt-approve-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-stmt-approve-confirm>Confirm approval</button>`;
    return ux().modalShell?.({
      open: true,
      id: "kn-entry-stmt-approve-modal",
      titleId: "kn-entry-stmt-approve-title",
      title: "Approve statement",
      dismissAttr: "data-entry-stmt-approve-dismiss",
      bodyHtml,
      footerHtml
    }) || "";
  }

  function parseFilingHashPsc() {
    const params = parseFilingHashParams();
    return {
      mode: params.get("mode") || "",
      pscId: params.get("pscId") || ""
    };
  }

  function resolveOriginalEsStatus(row) {
    const summary = String(row?.entrySummary || "").trim().toUpperCase();
    if (summary === "FILED" || summary === "ACCEPTED") {
      return "ACCEPTED";
    }
    return "ACCEPTED";
  }

  function syncPscFromHash(row, helpers) {
    const { mode, pscId } = parseFilingHashPsc();
    if (mode !== "psc") {
      if (state.pscMode) {
        state.pscMode = false;
        state.pscId = "";
        state.pscOriginalEsStatus = "";
        state.pscSyncKey = "";
        helpers?.rerender?.();
      }
      return;
    }
    const syncKey = `${row.id}:${pscId}:${location.hash}`;
    if (state.pscSyncKey === syncKey) {
      return;
    }
    state.pscSyncKey = syncKey;
    state.pscMode = true;
    state.pscId = pscId;
    state.pscOriginalEsStatus = resolveOriginalEsStatus(row);
    helpers?.rerender?.();
  }

  function syncCatairResolveFromHash(row, helpers) {
    const focus = parseFilingHashParams().get("focus") || "";
    if (focus !== "catair398") {
      return;
    }
    const syncKey = `${row.id}:catair398:${location.hash}`;
    if (state.catairResolveSyncKey === syncKey) {
      return;
    }
    state.catairResolveSyncKey = syncKey;
    state.utilityTab = "validation";
    state.utilityShowResults = false;
    state.utilityShowStatements = false;
    runEntryValidation({ scope: "full", stream: false });
    helpers?.rerender?.();
  }

  function parseFilingHashQueue() {
    return parseFilingHashParams().get("queue") || "";
  }

  function parseFilingHashStatement() {
    return {
      statementId: parseFilingHashParams().get("statement") || "",
      lineId: parseFilingHashParams().get("stmtEntry") || ""
    };
  }

  function syncDocsFromHash(row, helpers) {
    const { panel, upload, missing } = parseFilingHashDocsPanel();
    if (panel !== "docs") {
      return;
    }
    const syncKey = `${row.id}:${panel}:${upload}:${missing.join("|")}:${location.hash}`;
    if (state.docsPanelSyncKey === syncKey) {
      return;
    }
    state.docsPanelSyncKey = syncKey;
    state.docsPanelPriority = true;
    state.layoutMode = "overlay";
    state.docOverlayOpen = true;
    state.docsPinned = true;
    state.recordPinned = false;
    state.docUploadOpen = upload;
    state.missingDocLabels = missing.length
      ? missing.map((token) => {
          const map = {
            commercial: "Commercial Invoice",
            bill: "Bill of Lading",
            packing: "Packing List",
            arrival: "Arrival Notice"
          };
          return map[token] || token;
        })
      : window.KNOpsShipmentsAssistant?.find?.(row.shipments || row.shipmentId || "")?.missing || [];
    helpers?.rerender?.();
  }

  function syncStatementFromHash(row, helpers) {
    const { statementId, lineId } = parseFilingHashStatement();
    if (!statementId) {
      return;
    }
    const syncKey = `${row.id}:${statementId}:${lineId}:${location.hash}`;
    if (state.statementSyncKey === syncKey) {
      return;
    }
    const statement = statementsApi()?.find?.(statementId);
    if (!statement) {
      return;
    }
    state.statementSyncKey = syncKey;
    state.activeStatementId = statementId;
    state.activeStatementLineId = lineId || statement.entries[0]?.id || "";
    state.utilityShowStatements = true;
    state.utilityStatementCards = statementsApi()?.listEntryCards?.() || [];
    state.utilitySelectedStatementKey = `${statementId}:${state.activeStatementLineId}`;
    state.utilityTab = "chat";
    helpers?.rerender?.();
  }

  function utilityResultsBrief() {
    const count = state.utilityResults.length;
    const filterLabel =
      QUEUE_FILTER_CHIPS.find((chip) => chip.id === state.utilityQueueFilter)?.label || "Queue";
    if (!count) {
      return `No entries matched ${filterLabel.toLowerCase()}. Try another filter or search by BOL.`;
    }
    return `${count} ${count === 1 ? "entry" : "entries"} in ${filterLabel.toLowerCase()}. The first result is selected in the center panel — click another card to switch.`;
  }

  function syncQueueFromHash(row, helpers) {
    const queue = parseFilingHashQueue();
    if (!queue) {
      return;
    }
    const syncKey = `${row.id}:${queue}:${location.hash}`;
    if (state.utilityQueueSyncKey === syncKey) {
      return;
    }
    const filterMap = {
      recent: "recent",
      working: "working",
      rejected: "rejected",
      hold: "hold",
      completed: "completed"
    };
    const filter = filterMap[queue];
    if (!filter) {
      return;
    }
    state.utilityQueueSyncKey = syncKey;
    state.utilityTab = "chat";
    applyUtilityQueueSearch("", { filter, helpers, row, autoSelect: true });
  }

  function renderUtilityFilterChips() {
    return `<div class="entry-utility-chat__filters kn-chip-group kn-chip-group--small" role="radiogroup" aria-label="Queue filters">
      ${QUEUE_FILTER_CHIPS.map((chip) => {
        const active = state.utilityQueueFilter === chip.id;
        return `<button type="button" class="kn-chip kn-chip--small type-caption-sm${active ? " is-selected" : ""}" role="radio" aria-checked="${active}" data-entry-utility-filter="${chip.id}">${escapeHtml(chip.label)}</button>`;
      }).join("")}
    </div>`;
  }

  function renderUtilityShipmentCards(cards, selectedId) {
    if (!cards.length) {
      return `<p class="type-body-sm entry-utility__empty">No entries matched that search.</p>`;
    }
    return `<div class="ai-shipment-list entry-utility-chat__cards" role="list">
      ${cards
        .map((item, index) => {
          const isSelected = selectedId ? item.entryId === selectedId : index === 0;
          return `<button type="button" class="ai-shipment-card${isSelected ? " is-selected" : ""}" role="listitem" data-entry-utility-select="${escapeHtml(item.entryId)}">
            <span class="ai-shipment-card__row">
              <span class="ai-shipment-card__name type-ui-sm type-weight-semibold">${escapeHtml(item.name)}</span>
              ${isSelected ? `<span class="ai-shipment-card__badge type-caption-sm">✓ Selected</span>` : ""}
            </span>
            <span class="ai-shipment-card__meta type-caption-sm">ETA: ${escapeHtml(item.eta)} · MOT: ${escapeHtml(item.mot)} · BOL: ${escapeHtml(item.bol)}</span>
          </button>`;
        })
        .join("")}
    </div>`;
  }

  function applyUtilityQueueSearch(query, { filter = state.utilityQueueFilter, helpers, row, autoSelect = true } = {}) {
    const normalized = String(query || "").trim();
    let cards = searchCards(allQueueCards(), normalized);
    if (filter && filter !== "all") {
      cards = filterCards(cards, filter);
    }
    state.utilitySearchQuery = normalized;
    state.utilityQueueFilter = filter || state.utilityQueueFilter;
    state.utilityShowResults = true;
    state.utilityResults = cards;
    const selected = autoSelect ? cards[0]?.entryId || "" : state.utilitySelectedId;
    state.utilitySelectedId = selected;
    if (autoSelect && selected && selected !== row.id && helpers?.goto) {
      helpers.goto(
        buildFilingHref(selected, {
          queue: state.utilityQueueFilter,
          statement: state.activeStatementId,
          stmtEntry: state.activeStatementLineId
        })
      );
      return;
    }
    helpers?.rerender?.();
  }

  function selectUtilityEntry(entryId, helpers, row) {
    if (!entryId) {
      return;
    }
    state.utilitySelectedId = entryId;
    if (entryId !== row.id && helpers?.goto) {
      helpers.goto(
        buildFilingHref(entryId, {
          queue: state.utilityQueueFilter,
          statement: state.activeStatementId,
          stmtEntry: state.activeStatementLineId
        })
      );
      return;
    }
    helpers?.rerender?.();
  }

  const QUEUE_QUERY_PATTERN =
    /\b(find\s+entry|recent(ly)?(\s+added)?(\s+entries?)?(\s+in|\s+to)?\s+my\s+queue|my\s+working\s+list|working\s*list|cbp\s*reject|on\s+hold|completed\s+entries?|items?\s+due\s+today|all\s+items?\s+due\s+today)\b/i;

  const STATEMENT_QUERY_PATTERN = /today.?s?\s*statements?|pending\s+statements?/i;

  function isStatementQuery(query = "") {
    return STATEMENT_QUERY_PATTERN.test(String(query || "").trim());
  }

  function isQueueQuery(query = "") {
    return QUEUE_QUERY_PATTERN.test(String(query || "").trim());
  }

  function resolveUtilityQuery(query = "") {
    const q = String(query || "").trim();
    const lower = q.toLowerCase();
    if (/cbp\s*reject/i.test(lower)) {
      return { filter: "rejected", query: "" };
    }
    if (/\bon\s+hold\b/i.test(lower)) {
      return { filter: "hold", query: "" };
    }
    if (/completed\s+entries?/i.test(lower)) {
      return { filter: "completed", query: "" };
    }
    if (/working\s*list/i.test(lower)) {
      return { filter: "working", query: "" };
    }
    if (/recent/i.test(lower) && /queue|entries?|added/i.test(lower)) {
      return { filter: "recent", query: "" };
    }
    if (/items?\s+due\s+today|all\s+items?\s+due\s+today/i.test(lower)) {
      return { filter: "working", query: "" };
    }
    return { filter: state.utilityQueueFilter, query: q };
  }

  function appendStatusExtra(message) {
    state.statusExtraMessages = [message, ...(state.statusExtraMessages || [])].slice(0, 10);
  }

  function applyAgentResolveFix(entryId, proposal, row, helpers) {
    const mode = getMode();
    const key = proposal.fieldKey;
    const f = state.fields[key];
    if (!f || f.status === "locked") {
      return { applied: false, fieldCount: 0 };
    }
    if (mode === "deny-all") {
      state.denyNotes.push({
        fieldKey: key,
        fieldLabel: fieldLabel(key),
        value: proposal.value,
        rationale: proposal.rationale
      });
      setAgentReplyStreaming(`In deny-all mode, I can only suggest setting ${fieldLabel(key)} to "${proposal.value}". ${proposal.rationale}`, helpers);
      return { applied: true, fieldCount: 0, advisoryOnly: true };
    }
    const nextStatus = mode === "auto-accept" ? "agent_final" : "agent_draft";
    const updates = {
      [key]: {
        status: nextStatus,
        value: proposal.value,
        rationale: proposal.rationale,
        confidence: mode === "auto-accept" ? 94 : 81,
        citations: []
      }
    };
    if (key.endsWith(":coo")) {
      const htsKey = key.replace(":coo", ":hts");
      if (state.fields[htsKey]) {
        updates[htsKey] = { status: nextStatus, citations: [] };
      }
    }
    formStateApi().applyFieldUpdates(entryId, updates, {
      source: "agent",
      meta: { action: "resolve-status", rawCode: proposal.rawCode, fieldKey: key }
    });
    if (mode === "auto-accept") {
      logPatch(entryId, {
        fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
        action: "fill", previousValue: f.value, newValue: proposal.value,
        source: "agent", actor: "Klear Agent", mode,
        confidence: 94, rationale: proposal.rationale, citation: null
      });
    }
    validateField(key);
    cascadeFromField(entryId, key);
    setAgentReplyStreaming(
      mode === "auto-accept"
        ? `Applied fix for ${proposal.rawCode}: ${fieldLabel(key)} set to "${proposal.value}". Entry re-validated and queued for ACE resubmission.`
        : `Proposed fix for ${proposal.rawCode}: set ${fieldLabel(key)} to "${proposal.value}" — open the draft flag on the form to accept. Entry re-validated.`,
      helpers
    );
    return { applied: true, fieldCount: Object.keys(updates).length, rawCode: proposal.rawCode };
  }

  function resubmitAfterResolve(row, helpers) {
    runEntryValidation({ scope: "full", stream: true }, helpers);
    appendStatusExtra({
      id: `status-resubmit-${Date.now()}`,
      type: "info",
      timestamp: new Date().toISOString(),
      description: "Entry summary queued for ACE resubmission after Klear Agent fix.",
      rawCode: "ACE-1102",
      source: "transmit",
      resolvable: false
    });
    refreshStatusMessages(row);
  }

  function processAgentResolveQuery(text, row, helpers) {
    const api = statusApi();
    if (!api) {
      return false;
    }
    let message = state.pendingAgentResolve;
    if (!message) {
      const parsed = api.parseResolveQuery(text);
      if (parsed) {
        message = (state.statusMessages || []).find((m) =>
          m.rawCode === parsed.rawCode || m.description === parsed.description
        );
      }
    }
    if (!message && !/^resolve status error/i.test(text)) {
      return false;
    }
    if (!message) {
      toast("Could not match that status error — open Status Detail and use Resolve with KlearAgent.", "notice");
      return true;
    }
    if (message.screeningPassthrough) {
      toast("Screening hits cannot be resolved by the agent.", "notice");
      state.pendingAgentResolve = null;
      helpers?.rerender?.();
      return true;
    }
    const fix = api.lookupFix(message.rawCode, message.fieldKey, state.fields, row);
    if (!fix) {
      toast("No automated fix available for this status code — manual correction required.", "notice");
      state.pendingAgentResolve = null;
      helpers?.rerender?.();
      return true;
    }
    const result = applyAgentResolveFix(row.id, fix, row, helpers);
    if (result.advisoryOnly) {
      state.pendingAgentResolve = null;
      state.utilityTab = "chat";
      state.utilityShowResults = false;
      helpers?.rerender?.();
      return true;
    }
    if (!result.applied) {
      toast("Could not apply an automated fix for this field.", "notice");
      state.pendingAgentResolve = null;
      helpers?.rerender?.();
      return true;
    }
    resubmitAfterResolve(row, helpers);
    state.pendingAgentResolve = null;
    state.utilityTab = "chat";
    state.utilityShowResults = false;
    helpers?.rerender?.();
    if (result.fieldCount) {
      const source = result.rawCode ? `CBP error ${result.rawCode}` : "error resolution";
      toastAgentBatchUpdate({
        count: result.fieldCount,
        source,
        suffix: "Queued for ACE resubmission.",
        color: "positive"
      });
    } else {
      toast("Queued for ACE resubmission.", "positive");
    }
    return true;
  }

  function armStatusResolve(messageId, helpers) {
    const api = statusApi();
    const message = (state.statusMessages || []).find((m) => m.id === messageId);
    if (!message?.resolvable) {
      return;
    }
    state.pendingAgentResolve = message;
    state.utilityTab = "chat";
    state.utilityShowResults = false;
    state.utilitySearchQuery = api?.resolvePrompt?.(message) || `Resolve status error ${message.rawCode}`;
    helpers.rerender();
    requestAnimationFrame(() => {
      const input = document.getElementById("entry-utility-search-input");
      input?.focus({ preventScroll: true });
      input?.select?.();
    });
  }

  function handleUtilityPrompt(query, helpers, row) {
    const text = String(query || "").trim();
    if (!text) {
      return;
    }
    if (processAgentResolveQuery(text, row, helpers)) {
      return;
    }
    if (/pre-submit validation|run validation|validate this entry|validation on this entry/i.test(text)) {
      runEntryValidation({ scope: "full", stream: true }, helpers);
      state.utilityTab = "validation";
      state.utilityShowResults = false;
      helpers?.rerender?.();
      return;
    }
    if (/validation error|explain.*reject|catair reject 398|fix the hts/i.test(text)) {
      runEntryValidation({ scope: "full", stream: true }, helpers);
      state.utilityTab = "validation";
      state.utilityShowResults = false;
      helpers?.rerender?.();
      return;
    }
    if (/resolve.*catair.*398|help me resolve.*398|walk me through fixing catair 398/i.test(text)) {
      runEntryValidation({ scope: "full", stream: true }, helpers);
      state.utilityTab = "validation";
      state.utilityShowResults = false;
      state.utilityShowStatements = false;
      helpers?.rerender?.();
      return;
    }
    if (isStatementQuery(text)) {
      applyUtilityStatementSearch(helpers, row);
      return;
    }
    if (window.KNClassificationAssistant?.isClassificationIntent?.(text)) {
      if (window.KNAssistant?.ask) {
        window.KNAssistant.ask(text);
        return;
      }
    }
    if (isQueueQuery(text)) {
      const resolved = resolveUtilityQuery(text);
      applyUtilityQueueSearch(resolved.query || text, { filter: resolved.filter, helpers, row });
      return;
    }
    if (/fill the entry using uploaded documents/i.test(text)) {
      if (state.documents?.length) {
        runDocumentPipeline(row, helpers);
        setAgentReplyStreaming("Reviewing uploaded documents and filling fields on the entry form.", helpers);
      } else {
        state.docUploadOpen = true;
        toast("Upload documents first — I'll fill the entry once they're on file.", "notice");
      }
      helpers.rerender();
      return;
    }
    state.utilitySearchQuery = text;
    state.utilityShowResults = false;
    helpers?.rerender?.();
  }

  function chatModeMessage() {
    const mode = getMode();
    if (mode === "deny-all") {
      return "Deny-all mode: Klear Agent's suggestions appear here as advisory notes only — nothing on the form changes until you enter it yourself.";
    }
    if (mode === "auto-accept") {
      return "Auto-accept-all mode: Klear Agent fills fields directly on the form. Every agent-filled field stays one click away from review — open its flag to see the rationale or correct it.";
    }
    return "Permission-per-change mode: Klear Agent proposes values on the form — look for the purple Klear AI flag on each field, then open it to accept or reject before it's applied.";
  }

  function renderChatTab(row) {
    const notes = getMode() === "deny-all" ? state.denyNotes : [];
    const notesHtml = notes.length
      ? `<div class="entry-advisory-list">
          <p class="type-ui-sm type-weight-semibold entry-advisory-list__title">Klear Agent Notes</p>
          ${notes.map((n) => `<div class="entry-advisory-row">
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(n.fieldLabel)}</p>
            <p class="type-caption-sm">Suggested: <strong>${escapeHtml(n.value)}</strong>${typeof n.confidence === "number" ? ` · ${n.confidence}% confidence` : ""}</p>
            <p class="type-caption-sm">${escapeHtml(n.rationale)}</p>
            <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-copy-note="${escapeHtml(n.value)}">Copy value</button>
          </div>`).join("")}
        </div>`
      : "";
    const resultsBlock = state.utilityShowStatements
      ? `<div class="entry-utility-chat__results">
          <div class="entry-utility-chat__agent-brief" role="status">
            <p class="type-ui-sm type-weight-semibold">Klear Agent</p>
            <p class="type-body-sm">${escapeHtml(utilityStatementsBrief())}</p>
          </div>
          ${renderUtilityStatementCards(state.utilityStatementCards, state.utilitySelectedStatementKey)}
        </div>`
      : state.utilityShowResults
      ? `<div class="entry-utility-chat__results">
          <div class="entry-utility-chat__agent-brief" role="status">
            <p class="type-ui-sm type-weight-semibold">Klear Agent</p>
            <p class="type-body-sm">${escapeHtml(utilityResultsBrief())}</p>
          </div>
          ${renderUtilityFilterChips()}
          ${renderUtilityShipmentCards(state.utilityResults, state.utilitySelectedId || row.id)}
        </div>`
      : `<p class="type-body-sm entry-utility-chat__hint">${escapeHtml(chatModeMessage())}</p>${notesHtml}`;
    const replyFull = state.agentResolveReplyFull || state.agentResolveReply || "";
    const replyVisible = state.agentResolveReplyStreaming
      ? (state.agentResolveReplyVisible || "")
      : replyFull;
    const extractionBlock = (state.docPipeline.active || state.extractionFeed.length)
      ? renderExtractionFeed({ limit: 6 })
      : "";
    const resolveReply = replyFull
      ? `<div class="entry-agent-resolve-reply${state.agentResolveReplyStreaming ? " entry-agent-resolve-reply--streaming" : ""}" role="status">
          <p class="type-ui-sm type-weight-semibold">Klear Agent</p>
          <p class="type-body-sm" data-entry-agent-reply-text>${escapeHtml(replyVisible)}</p>
        </div>`
      : "";
    return `<div class="entry-utility-chat">
      ${resolveReply}
      ${extractionBlock}
      ${renderUtilityPromptChips()}
      <form class="entry-utility-chat__composer" data-entry-utility-search-form autocomplete="off">
        <label class="visually-hidden" for="entry-utility-search-input">Search entries</label>
        <input
          id="entry-utility-search-input"
          class="entry-utility-chat__input type-body-sm"
          type="search"
          name="q"
          value="${escapeHtml(state.utilitySearchQuery)}"
          placeholder="Find entry, BOL, or company…"
        />
        <button class="btn btn--secondary btn--sm type-ui-sm kn-btn entry-utility-chat__submit" type="submit">Search</button>
      </form>
      ${resultsBlock}
    </div>`;
  }

  function journeyApi() {
    return window.KNEntryJourney;
  }

  function renderJourneyTab() {
    const api = journeyApi();
    if (!api?.render) {
      return `<p class="type-body-sm entry-utility__empty">Patch journey unavailable.</p>`;
    }
    return api.render({
      patches: formStateApi().getPatches(state.rowId),
      fieldLabel,
      focusPatchId: state.journeyFocusPatchId,
      descending: state.journeyDescending !== false
    });
  }

  function journeyInteractionCtx(row, helpers) {
    return {
      state,
      row,
      helpers,
      patches: () => formStateApi().getPatches(row.id),
      fieldLabel,
      afterRestore: () => {
        recalculateDuties(row.id);
        runEntryValidation({ scope: "full", stream: true }, helpers);
      }
    };
  }

  function renderProactiveFlags() {
    const flags = state.proactiveFlags || [];
    if (!flags.length) {
      return "";
    }
    return `<div class="entry-proactive-flags" role="list" aria-label="Klear Agent proactive flags">
      ${flags.map((flag) => {
        const tone = flag.tone || "notice";
        return `<aside class="kn-alert kn-alert--${escapeHtml(tone)} kn-alert--full kn-alert--subtle entry-proactive-flag" role="alert" data-entry-proactive-flag="${escapeHtml(flag.id)}">
          <span class="kn-alert__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg>
          </span>
          <div class="kn-alert__content">
            <p class="type-ui-sm type-weight-semibold entry-proactive-flag__title">${escapeHtml(flag.title)}</p>
            <p class="kn-alert__desc type-body-sm">${escapeHtml(flag.description)}</p>
            <p class="type-caption-sm entry-proactive-flag__guardrail">Flag only — Klear Agent will not change this field. Review and decide on the form.</p>
          </div>
          <button class="icon-btn kn-alert__dismiss" type="button" data-entry-proactive-dismiss="${escapeHtml(flag.id)}" aria-label="Dismiss ${escapeHtml(flag.title)}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </aside>`;
      }).join("")}
    </div>`;
  }

  function renderUtilityPanel(row) {
    const tabContent = state.utilityTab === "chat" ? renderChatTab(row) : state.utilityTab === "validation" ? renderValidationTab() : renderJourneyTab();
    const issueCount = state.validationSummary?.total || 0;
    const proactiveCount = state.proactiveFlags?.length || 0;
    return `<aside class="entry-filing-panel entry-filing-panel--utility" id="entry-utility-panel">
      <header class="entry-filing-panel__header entry-filing-panel__header--utility">
        <h2 class="type-heading-h6 type-weight-semibold">Klear Agent${proactiveCount ? `<span class="entry-proactive-flags__count kn-badge kn-badge--small kn-badge--notice" aria-label="${proactiveCount} proactive flag${proactiveCount === 1 ? "" : "s"}">${proactiveCount}</span>` : ""}</h2>
        ${renderModeSwitch()}
      </header>
      ${renderProactiveFlags()}
      <div class="entry-tabs entry-tabs--utility" role="tablist" aria-label="Utility panel views">
        ${UTILITY_TABS.map((t) => {
          const badge = t.id === "validation" && issueCount
            ? `<span class="entry-tabs__error-badge badge badge--negative type-caption-sm kn-badge" aria-label="${issueCount} validation ${issueCount === 1 ? "issue" : "issues"}">${issueCount}</span>`
            : "";
          return `<button class="entry-tabs__item ${state.utilityTab === t.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${state.utilityTab === t.id}" data-entry-utility-tab="${t.id}">${escapeHtml(t.label)}${badge}</button>`;
        }).join("")}
      </div>
      <div class="entry-filing-panel__body" role="tabpanel">${tabContent}</div>
    </aside>`;
  }

  // ---------------------------------------------------------------------
  // Submit to ACE — confirmation modal. Uses modalShell (proven working
  // via ISF's own obsolete/print modals) — deliberately not
  // confirmDialog/confirmModal (those reference an out-of-scope
  // `isNegative` variable and throw when opened).
  // ---------------------------------------------------------------------

  function renderTransmitModal(row) {
    if (!state.transmitModalOpen) {
      return "";
    }
    const psc = isPscActive();
    const step = state.transmitPscStep;
    if (psc && step === 2) {
      const bodyHtml = `<p class="type-body-md">You are about to submit a <strong>post-summary correction</strong> for ${escapeHtml(row.transactionId)} to CBP.</p>
        <p class="type-body-sm entry-ace-modal__disclaimer">CBP already has the original accepted entry summary on file. This action amends that record — it cannot be treated like a first-time filing. Klear Agent cannot submit on your behalf.</p>`;
      const footerHtml = `
        <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-transmit-confirm>Submit correction to CBP</button>`;
      return ux().modalShell({
        open: true,
        id: "kn-entry-transmit-modal",
        titleId: "kn-entry-transmit-title",
        title: "Confirm PSC submission",
        dismissAttr: "data-admin-modal-dismiss",
        bodyHtml,
        footerHtml
      });
    }
    if (psc) {
      const bodyHtml = `<p class="type-body-md">Submit correction for ${escapeHtml(row.transactionId)} to CBP via ACE?</p>
        <p class="type-body-sm entry-ace-modal__disclaimer">Original entry summary status: <strong>${escapeHtml(state.pscOriginalEsStatus || "ACCEPTED")}</strong>. Edits in this session are logged as PSC amendments in the audit trail.</p>`;
      const footerHtml = `
        <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-transmit-confirm>Continue</button>`;
      return ux().modalShell({
        open: true,
        id: "kn-entry-transmit-modal",
        titleId: "kn-entry-transmit-title",
        title: "Submit correction to CBP",
        dismissAttr: "data-admin-modal-dismiss",
        bodyHtml,
        footerHtml
      });
    }
    const bodyHtml = `<p class="type-body-md">Transmit ${escapeHtml(row.transactionId)} to CBP via ACE?</p>
      <p class="type-body-sm entry-ace-modal__disclaimer">This sends the current entry summary to CBP. All critical validation errors must be resolved first — Klear Agent cannot transmit on your behalf.</p>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-transmit-confirm>Confirm transmit</button>`;
    return ux().modalShell({
      open: true, id: "kn-entry-transmit-modal", titleId: "kn-entry-transmit-title", title: "Transmit to CBP",
      dismissAttr: "data-admin-modal-dismiss", bodyHtml, footerHtml
    });
  }

  function renderAceModal(row) {
    if (!state.aceModalOpen) {
      return "";
    }
    const bodyHtml = `<p class="type-body-md">You're about to submit ${escapeHtml(row.transactionId)} to ACE.</p>
      <p class="type-body-sm entry-ace-modal__disclaimer">Klear Agent cannot perform this action for you — regardless of Agent Interaction Mode. This confirms a human decision to file.</p>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-ace-confirm>Confirm &amp; Submit</button>`;
    return ux().modalShell({
      open: true, id: "kn-entry-ace-modal", titleId: "kn-entry-ace-title", title: "Submit to ACE",
      dismissAttr: "data-admin-modal-dismiss", bodyHtml, footerHtml
    });
  }

  // ---------------------------------------------------------------------
  // Top-level render
  // ---------------------------------------------------------------------

  function render(row) {
    resetIfNewRow(row);
    return `${isPscActive() ? renderPscStatusBar(row) : ""}<div class="${layoutClasses()}">
      ${renderDocPanel(row)}
      ${renderRecordPanel(row)}
      ${renderUtilityPanel(row)}
    </div>
    ${renderAceModal(row)}
    ${renderTransmitModal(row)}
    ${renderStatementApproveModal(row)}`;
  }

  // ---------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------

  function capturePosition(root) {
    const active = document.activeElement;
    const key = active && root.contains(active) ? active.getAttribute("data-entry-field") : null;
    if (!key) {
      return null;
    }
    return { key, start: active.selectionStart, end: active.selectionEnd };
  }

  function restorePosition(root, pos) {
    if (!pos) {
      return;
    }
    const el = root.querySelector(`[data-entry-field="${pos.key}"]`);
    if (el && typeof el.setSelectionRange === "function") {
      noteBrokerLookAt(pos.key);
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(pos.start, pos.end); } catch (e) { /* not a text-selectable input state */ }
    }
  }

  function rerenderPreservingFocus(helpers) {
    const root = document.getElementById("kn-entry-root");
    const pos = root ? capturePosition(root) : null;
    helpers.rerender();
    if (root) {
      requestAnimationFrame(() => restorePosition(document.getElementById("kn-entry-root"), pos));
    }
  }

  let pendingUploadFiles = null;

  function queueDocumentUpload(fileList) {
    pendingUploadFiles = fileList;
  }

  function consumePendingUpload(row, helpers) {
    if (!pendingUploadFiles?.length) {
      return;
    }
    const files = pendingUploadFiles;
    pendingUploadFiles = null;
    startDocumentUpload(files, row, helpers);
  }

  function handleClick(event, row, helpers) {
    const proactiveDismiss = event.target.closest("[data-entry-proactive-dismiss]");
    if (proactiveDismiss) {
      event.preventDefault();
      event.stopPropagation();
      const id = proactiveDismiss.getAttribute("data-entry-proactive-dismiss") || "";
      if (id && !state.dismissedProactiveFlagIds.includes(id)) {
        state.dismissedProactiveFlagIds.push(id);
      }
      state.proactiveFlags = (state.proactiveFlags || []).filter((flag) => flag.id !== id);
      helpers.rerender();
      return true;
    }
    if (handleDocUploadClick(event, row, helpers)) {
      return true;
    }
    if (handleDocPanelClick(event, row, helpers)) {
      return true;
    }
    if (handleRubberArmClick(event, helpers)) {
      return true;
    }
    if (handleValidationClick(event, helpers)) {
      return true;
    }
    if (nextActionsApi()?.handleClick?.(event, nextActionHandlers(row, helpers))) {
      return true;
    }
    const sectionToggle = event.target.closest("[data-entry-section-toggle]");
    if (sectionToggle) {
      event.preventDefault();
      const sectionId = sectionToggle.getAttribute("data-entry-section-toggle") || "";
      const expanded = sectionToggle.getAttribute("aria-expanded") === "true";
      state.sectionManual[sectionId] = !expanded;
      helpers.rerender();
      return true;
    }
    const tabBtn = event.target.closest("[data-entry-tab]");
    if (tabBtn) {
      event.preventDefault();
      state.tab = tabBtn.getAttribute("data-entry-tab") || "header";
      state.panelOpen = "";
      helpers.rerender();
      return true;
    }
    const utilityTabBtn = event.target.closest("[data-entry-utility-tab]");
    if (utilityTabBtn) {
      event.preventDefault();
      state.utilityTab = utilityTabBtn.getAttribute("data-entry-utility-tab") || "chat";
      helpers.rerender();
      if (state.utilityTab === "journey") {
        journeyApi()?.scrollFocusIntoView?.();
      }
      return true;
    }
    if (journeyApi()?.handleInteraction?.(event, journeyInteractionCtx(row, helpers))) {
      return true;
    }
    const modeBtn = event.target.closest("[data-entry-mode]");
    if (modeBtn) {
      event.preventDefault();
      const next = modeBtn.getAttribute("data-entry-mode") || "permission";
      // Switching mode only affects the *next* proposal — already-decided
      // fields are untouched, so no confirmation is needed here.
      setMode(next);
      helpers.rerender();
      return true;
    }
    const traceToggle = event.target.closest("[data-entry-agent-trace-toggle]");
    if (traceToggle) {
      event.preventDefault();
      event.stopPropagation();
      const key = traceToggle.getAttribute("data-entry-agent-trace-toggle") || "";
      if (state.agentTraceExpanded[key]) {
        delete state.agentTraceExpanded[key];
      } else {
        state.agentTraceExpanded[key] = true;
      }
      helpers.rerender();
      return true;
    }
    const toggle = event.target.closest("[data-entry-field-toggle]");
    if (toggle) {
      event.preventDefault();
      const key = toggle.getAttribute("data-entry-field-toggle") || "";
      state.panelOpen = state.panelOpen === key ? "" : key;
      if (state.panelOpen) {
        noteBrokerLookAt(state.panelOpen);
      }
      helpers.rerender();
      if (state.panelOpen) {
        requestAnimationFrame(() => {
          const panel = document.querySelector(`[data-entry-field-row="${state.panelOpen}"] .entry-field-panel`);
          const first = panel && ux().focusables ? ux().focusables(panel)[0] : panel?.querySelector("button, input");
          first?.focus({ preventScroll: true });
        });
      }
      return true;
    }
    const closeBtn = event.target.closest("[data-entry-field-close]");
    if (closeBtn) {
      event.preventDefault();
      const key = state.panelOpen;
      state.panelOpen = "";
      helpers.rerender();
      requestAnimationFrame(() => document.querySelector(`[data-entry-field-toggle="${key}"]`)?.focus({ preventScroll: true }));
      return true;
    }
    const accept = event.target.closest("[data-entry-field-accept]");
    if (accept) {
      event.preventDefault();
      const key = accept.getAttribute("data-entry-field-accept") || "";
      const f = state.fields[key];
      if (f) {
        logPatch(row.id, {
          fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
          action: "accept", previousValue: "", newValue: f.value,
          source: "agent", actor: "jatin.bansal@klearnow.com", mode: getMode(),
          confidence: f.confidence ?? null, rationale: f.rationale || "", citation: f.citations?.[0] || null
        });
        toast("Field confirmed.", "positive");
      }
      state.panelOpen = "";
      helpers.rerender();
      return true;
    }
    const reject = event.target.closest("[data-entry-field-reject]");
    if (reject) {
      event.preventDefault();
      const key = reject.getAttribute("data-entry-field-reject") || "";
      const f = state.fields[key];
      if (f) {
        const previousValue = f.value;
        logPatch(row.id, {
          fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
          action: "reject", previousValue, newValue: "",
          source: "human", actor: "jatin.bansal@klearnow.com", mode: getMode(),
          confidence: null, rationale: "", citation: null
        });
        toast("Flagged for manual entry.", "notice");
      }
      state.panelOpen = "";
      helpers.rerender();
      return true;
    }
    const correct = event.target.closest("[data-entry-field-correct]");
    if (correct) {
      event.preventDefault();
      const key = correct.getAttribute("data-entry-field-correct") || "";
      state.panelOpen = "";
      helpers.rerender();
      requestAnimationFrame(() => document.getElementById(`entry-input-${key}`)?.focus({ preventScroll: true }));
      return true;
    }
    const copyNote = event.target.closest("[data-entry-copy-note]");
    if (copyNote) {
      event.preventDefault();
      const value = copyNote.getAttribute("data-entry-copy-note") || "";
      if (value && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).then(() => toast(`Copied "${value}".`), () => toast("Copy the value from the note.", "notice"));
      }
      return true;
    }
    const sameAsBtn = event.target.closest("[data-entry-same-as-target]");
    if (sameAsBtn) {
      event.preventDefault();
      applySameAs(row.id, sameAsBtn.getAttribute("data-entry-same-as-target") || "", sameAsBtn.getAttribute("data-entry-same-as-source") || "");
      helpers.rerender();
      return true;
    }
    const invoiceTabBtn = event.target.closest("[data-entry-invoice-tab]");
    if (invoiceTabBtn) {
      event.preventDefault();
      state.invoiceTab = invoiceTabBtn.getAttribute("data-entry-invoice-tab") || "1";
      helpers.rerender();
      return true;
    }
    const utilityStmtSelect = event.target.closest("[data-entry-utility-stmt]");
    if (utilityStmtSelect) {
      event.preventDefault();
      const key = utilityStmtSelect.getAttribute("data-entry-utility-stmt") || "";
      const card = state.utilityStatementCards.find((item) => statementCardKey(item) === key);
      if (card) {
        selectUtilityStatement(card, helpers, row);
      }
      return true;
    }
    const stmtUpdate = event.target.closest("[data-entry-stmt-update]");
    if (stmtUpdate) {
      event.preventDefault();
      const api = statementsApi();
      const statement = api?.find?.(state.activeStatementId);
      if (statement) {
        api.applyUpdates?.(statement);
        helpers.rerender();
      }
      return true;
    }
    const stmtApprove = event.target.closest("[data-entry-stmt-approve]");
    if (stmtApprove) {
      event.preventDefault();
      if (statementsApi()?.find?.(state.activeStatementId)) {
        state.statementApproveModalOpen = true;
        helpers.rerender();
      }
      return true;
    }
    const stmtApproveDismiss = event.target.closest("[data-entry-stmt-approve-dismiss]");
    if (stmtApproveDismiss) {
      event.preventDefault();
      state.statementApproveModalOpen = false;
      helpers.rerender();
      return true;
    }
    const stmtApproveConfirm = event.target.closest("[data-entry-stmt-approve-confirm]");
    if (stmtApproveConfirm) {
      event.preventDefault();
      const api = statementsApi();
      const statement = api?.find?.(state.activeStatementId);
      if (statement) {
        const result = api.approveViaInt09?.(statement);
        state.statementApproveModalOpen = false;
        if (result?.ok) {
          state.activeStatementId = "";
          state.activeStatementLineId = "";
          state.utilityShowStatements = false;
          state.utilityStatementCards = api.listEntryCards?.() || [];
        }
        helpers.rerender();
      }
      return true;
    }
    const utilityFilter = event.target.closest("[data-entry-utility-filter]");
    if (utilityFilter) {
      event.preventDefault();
      const filter = utilityFilter.getAttribute("data-entry-utility-filter") || "working";
      applyUtilityQueueSearch(state.utilitySearchQuery, { filter, helpers, row });
      return true;
    }
    const utilitySelect = event.target.closest("[data-entry-utility-select]");
    if (utilitySelect) {
      event.preventDefault();
      selectUtilityEntry(utilitySelect.getAttribute("data-entry-utility-select") || "", helpers, row);
      return true;
    }
    const review7501 = event.target.closest("[data-entry-review-7501]");
    if (review7501) {
      event.preventDefault();
      toast("Opening CBP Form 7501 preview in the document panel.", "notice");
      state.docCategory = "ci_pl";
      state.docDocIndex = 0;
      state.docPreviewPage = 0;
      if (state.layoutMode === "overlay") {
        state.docOverlayOpen = true;
      }
      helpers.rerender();
      return true;
    }
    const transmitBtn = event.target.closest("[data-entry-transmit-cbp]:not(:disabled)");
    if (transmitBtn) {
      event.preventDefault();
      state.transmitModalOpen = true;
      state.transmitPscStep = isPscActive() ? 1 : 0;
      helpers.rerender();
      return true;
    }
    const submitAce = event.target.closest("[data-entry-submit-ace]:not(:disabled)");
    if (submitAce) {
      event.preventDefault();
      state.aceModalOpen = true;
      helpers.rerender();
      return true;
    }
    const dismiss = event.target.closest("[data-admin-modal-dismiss]");
    if (dismiss) {
      event.preventDefault();
      state.aceModalOpen = false;
      state.transmitModalOpen = false;
      state.transmitPscStep = 0;
      helpers.rerender();
      return true;
    }
    const confirmTransmit = event.target.closest("[data-entry-transmit-confirm]");
    if (confirmTransmit) {
      event.preventDefault();
      if (isPscActive() && state.transmitPscStep === 1) {
        state.transmitPscStep = 2;
        helpers.rerender();
        return true;
      }
      if (transmitDisabled()) {
        toast("Cannot transmit — critical validation errors remain.", "notice");
        state.transmitModalOpen = false;
        state.transmitPscStep = 0;
        helpers.rerender();
        return true;
      }
      const psc = isPscActive();
      logPatch(row.id, {
        fieldKey: "", fieldLabel: psc ? "Post Summary Correction" : "Entry Summary", section: "submission",
        action: psc ? "submit-psc" : "submit-ace",
        previousValue: "",
        newValue: psc ? "PSC correction submitted to CBP" : "Transmitted to CBP",
        source: "human", actor: "jatin.bansal@klearnow.com", mode: getMode(),
        confidence: null, rationale: psc ? "Human-confirmed PSC submission to CBP." : "", citation: null
      });
      appendStatusExtra({
        id: `status-transmit-${Date.now()}`,
        type: "success",
        timestamp: new Date().toISOString(),
        description: psc
          ? "Post-summary correction submitted to CBP via ACE."
          : "Entry summary transmitted to CBP via ACE.",
        rawCode: psc ? "ACE-PSC-2000" : "ACE-2000",
        source: "transmit",
        resolvable: false
      });
      refreshStatusMessages(row);
      state.transmitModalOpen = false;
      state.transmitPscStep = 0;
      toast(
        psc ? `${row.transactionId} PSC correction submitted to CBP.` : `${row.transactionId} transmitted to CBP.`,
        "positive"
      );
      helpers.rerender();
      return true;
    }
    const confirmAce = event.target.closest("[data-entry-ace-confirm]");
    if (confirmAce) {
      event.preventDefault();
      logPatch(row.id, {
        fieldKey: "", fieldLabel: "Entry Summary", section: "submission",
        action: "submit-ace", previousValue: "", newValue: "Submitted",
        source: "human", actor: "jatin.bansal@klearnow.com", mode: getMode(),
        confidence: null, rationale: "", citation: null
      });
      state.aceModalOpen = false;
      toast(`${row.transactionId} submitted to ACE.`, "positive");
      helpers.rerender();
      return true;
    }
    return false;
  }

  function handleSubmit(event, row, helpers) {
    const form = event.target.closest("[data-entry-utility-search-form]");
    if (!form) {
      return false;
    }
    event.preventDefault();
    const query = String(new FormData(form).get("q") || "").trim();
    handleUtilityPrompt(query, helpers, row);
    return true;
  }

  function handleChange(event, row, helpers) {
    if (handleDocUploadChange(event, row, helpers)) {
      return true;
    }
    if (journeyApi()?.handleInteraction?.(event, journeyInteractionCtx(row, helpers))) {
      return true;
    }
    return false;
  }

  function noteBrokerLookAt(key) {
    if (key) {
      state.brokerLookAtKey = key;
    }
  }

  function getBrokerLookAtKey() {
    if (state.editFocus?.key) {
      return state.editFocus.key;
    }
    if (state.panelOpen) {
      return state.panelOpen;
    }
    const root = document.getElementById("kn-entry-root");
    const active = document.activeElement;
    if (root && active && root.contains(active)) {
      const fromInput = active.getAttribute("data-entry-field");
      if (fromInput) {
        return fromInput;
      }
      const fromRow = active.closest("[data-entry-field-row]")?.getAttribute("data-entry-field-row");
      if (fromRow) {
        return fromRow;
      }
    }
    return state.brokerLookAtKey || "";
  }

  function handleFocus(event) {
    const input = event.target.closest("[data-entry-field]");
    if (!input) {
      return false;
    }
    const key = input.getAttribute("data-entry-field") || "";
    noteBrokerLookAt(key);
    state.editFocus = {
      key,
      originalValue: input.value
    };
    return true;
  }

  function handleInput(event, row, helpers) {
    const input = event.target.closest("[data-entry-field]");
    if (!input) {
      return false;
    }
    const key = input.getAttribute("data-entry-field") || "";
    const f = state.fields[key];
    if (!f || f.status === "locked") {
      return false;
    }
    f.value = input.value;
    return true;
  }

  function handleBlur(event, row, helpers) {
    const input = event.target.closest("[data-entry-field]");
    if (!input) {
      return false;
    }
    const key = input.getAttribute("data-entry-field") || "";
    const f = state.fields[key];
    if (!f || f.status === "locked") {
      return false;
    }
    const newValue = input.value;
    const original = state.editFocus?.key === key ? state.editFocus.originalValue : f.value;
    state.editFocus = null;
    if (newValue === original) {
      return false;
    }
    commitUserEdit(row.id, key, newValue, original);
    validateField(key);
    cascadeFromField(row.id, key);
    runEntryValidation({ scope: "targeted", fieldKey: key });
    runSilentOutlierChecks("field-change", { row, fieldKey: key });
    state.validationTargetField = key;
    const stayingInForm = event.relatedTarget?.closest?.("[data-entry-field]");
    if (!stayingInForm) {
      helpers.rerender();
    }
    return true;
  }

  function handleKeydown(event, row, helpers) {
    const root = document.getElementById("kn-entry-root");
    if (state.aceModalOpen || state.transmitModalOpen) {
      if (ux().handleOverlayKeydown(root, event)) {
        return;
      }
      if (event.key === "Escape") {
        state.aceModalOpen = false;
        state.transmitModalOpen = false;
        state.transmitPscStep = 0;
        helpers.rerender();
      }
      return;
    }
    if (state.panelOpen) {
      const panel = document.querySelector(`[data-entry-field-row="${state.panelOpen}"] .entry-field-panel`);
      if (panel && ux().trapFocus(panel, event)) {
        return;
      }
      if (event.key === "Escape") {
        const key = state.panelOpen;
        state.panelOpen = "";
        helpers.rerender();
        requestAnimationFrame(() => document.querySelector(`[data-entry-field-toggle="${key}"]`)?.focus({ preventScroll: true }));
      }
      return;
    }
    if (event.key === "Escape" && state.rubberBandArmed) {
      state.rubberBandArmed = null;
      helpers.rerender();
      return;
    }
    const modeBtn = event.target.closest?.("[data-entry-mode]");
    if (modeBtn && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      event.preventDefault();
      const ids = MODE_OPTIONS.map((m) => m.id);
      const idx = ids.indexOf(getMode());
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const next = ids[(idx + dir + ids.length) % ids.length];
      setMode(next);
      helpers.rerender();
      requestAnimationFrame(() => document.querySelector(`[data-entry-mode="${next}"]`)?.focus({ preventScroll: true }));
    }
  }

  function syncOverlay() {
    const root = document.getElementById("kn-entry-root");
    if (root) {
      ux().syncOverlayFocus(root);
      window.KNCollapsible?.hydrate?.(root);
    }
  }

  function bindSectionAutoExpand() {
    const api = formStateApi();
    if (!api?.subscribe) {
      return;
    }
    api.subscribe(api.EVENT_FIELD, (event) => {
      const detail = event.detail || {};
      if (detail.entry_id !== state.rowId) {
        return;
      }
      if (!fieldNeedsAttention(detail.field_key)) {
        return;
      }
      expandSectionForField(detail.field_key);
      if (String(location.hash || "").includes("/filing/")) {
        window.dispatchEvent(new Event("hashchange"));
      }
    });
  }

  function bindUtilityEvents() {
    if (window.__knEntryUtilityBound) {
      return;
    }
    window.__knEntryUtilityBound = true;
    window.addEventListener("kn-entry-utility-query", (event) => {
      const query = event.detail?.query;
      if (!query) {
        return;
      }
      const filingMatch = String(location.hash || "").match(/^#transaction-us-entry\/filing\/([^/?#]+)/);
      if (!filingMatch) {
        return;
      }
      const entryId = decodeURIComponent(filingMatch[1]);
      const row = window.KNUsEntry?.list?.()?.find((item) => item.id === entryId);
      if (!row) {
        return;
      }
      handleUtilityPrompt(query, {
        rerender: () => window.dispatchEvent(new Event("hashchange")),
        goto: (hash) => {
          if (location.hash === hash) {
            window.dispatchEvent(new Event("hashchange"));
            return;
          }
          location.hash = hash;
        }
      }, row);
    });
  }

  function runValidationFromPalette(options = {}) {
    if (!state.rowId) {
      return false;
    }
    runEntryValidation({ ...options, stream: options.stream ?? true });
    state.utilityTab = "validation";
    window.dispatchEvent(new Event("hashchange"));
    return true;
  }

  function bindJourneyPatchListener() {
    const api = formStateApi();
    if (!api?.subscribe) {
      return;
    }
    api.subscribe(api.EVENT_PATCH, (event) => {
      const detail = event.detail || {};
      if (detail.entry_id !== state.rowId || state.utilityTab !== "journey") {
        return;
      }
      state.journeyFocusPatchId = detail.patch?.patch_id || state.journeyFocusPatchId;
      window.dispatchEvent(new Event("hashchange"));
    });
  }

  bindUtilityEvents();
  bindJourneyPatchListener();
  bindSectionAutoExpand();

  window.KNEntryFiling = {
    render,
    handleClick,
    handleSubmit,
    handleChange,
    handleFocus,
    handleInput,
    handleBlur,
    handleKeydown,
    handleMouseUp,
    syncOverlay,
    handleUtilityPrompt,
    startDocumentUpload,
    queueDocumentUpload,
    syncQueueFromHash,
    syncStatementFromHash,
    syncDocsFromHash,
    syncPscFromHash,
    syncCatairResolveFromHash,
    consumePendingUpload,
    runValidationOnEntry: runValidationFromPalette,
    getBrokerLookAtKey,
    noteBrokerLookAt
  };
})();
