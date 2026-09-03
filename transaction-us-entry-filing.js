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
      line1: { ...line1, quantity: 100 + ((n * 13) % 900), enteredValue: enteredValue1 },
      line2: { ...INVALID_COMBO, quantity: 50 + ((n * 17) % 400), enteredValue: enteredValue2, dutyRate: "9.9%" },
      totalDuty,
      mpf,
      hmf,
      totalEstimatedDuty: Math.round((totalDuty + mpf + hmf) * 100) / 100
    };
    detailCache.set(row.id, detail);
    return detail;
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
  const AUDIT_KEY = "kn-entry-audit-v1";
  const MAX_AUDIT = 200;

  function readAudit() {
    try {
      return JSON.parse(window.localStorage.getItem(AUDIT_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeAudit(list) {
    try {
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, MAX_AUDIT)));
    } catch (e) {
      // storage unavailable — patches simply won't persist across reload
    }
  }

  function logPatch(entryId, patch) {
    const list = readAudit();
    list.unshift({
      id: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entryId,
      ts: new Date().toISOString(),
      ...patch
    });
    writeAudit(list);
  }

  function auditForEntry(entryId) {
    return readAudit().filter((p) => p.entryId === entryId);
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
    agent_draft: "KlearAgent extracted this value from the source documents but confidence was below the auto-accept threshold. Review before filing.",
    agent_final: "KlearAgent extracted this value from the source documents with high confidence.",
    user_override: "You entered this value directly.",
    locked: "",
    error: "Validation failed against the cited edit."
  };

  function seedFieldEntries(row, detail) {
    const n = seedFor(row);
    const entries = {};
    const set = (key, def) => { entries[key] = def; };

    // 1. Header / Filing Info
    set("header:entryNumber", { state: "locked", value: row.entryNumber, lockedReason: "System-assigned once the entry is created — cannot be edited." });
    set("header:entryType", { state: n % 2 === 0 ? "agent_final" : "agent_draft", value: detail.entryType, confidence: 88 + (n % 10), rationale: "Matched to the commercial invoice terms and prior filings for this importer." });
    set("header:entryDate", { state: "empty", value: "" });
    set("header:portOfEntry", { state: "agent_final", value: row.portUnlading, confidence: 96, rationale: "Read directly from the Bill of Lading discharge port." });
    set("header:firmsCode", { state: "locked", value: row.firmsCode, lockedReason: "Tied to the filer's CBP-assigned FIRMS code — cannot be edited here." });
    set("header:bondType", { state: "agent_draft", value: detail.bondType, confidence: 74, rationale: "Inferred from the importer's continuous bond on file; confidence is below auto-accept threshold." });

    // 2. Parties
    set("parties:importerName", { state: "agent_final", value: row.companyName, confidence: 99, rationale: "Matched to the Importer of Record on the commercial invoice." });
    set("parties:importerNumber", { state: "agent_draft", value: detail.importerNumber, confidence: 81, rationale: "Derived from the FIRMS code and importer bond record." });
    set("parties:consigneeName", { state: n % 3 === 0 ? "user_override" : "empty", value: n % 3 === 0 ? row.companyName : "" });
    set("parties:ultimateConsigneeName", { state: "empty", value: "" });

    // 3. Merchandise / HTS lines
    set("merch:line1:hts", { state: "agent_draft", value: detail.line1.hts, confidence: 92, rationale: "Classified from the product description and prior classifications for this importer." });
    set("merch:line1:country", { state: "agent_final", value: detail.line1.country, confidence: 97, rationale: "Read from the certificate of origin." });
    set("merch:line1:description", { state: "agent_final", value: detail.line1.desc, confidence: 95, rationale: "Extracted from the commercial invoice line item." });
    set("merch:line1:quantity", { state: "user_override", value: String(detail.line1.quantity) });
    set("merch:line1:enteredValue", { state: "agent_final", value: money(detail.line1.enteredValue), confidence: 98, rationale: "Extracted from the commercial invoice line total." });
    set("merch:line1:dutyRate", { state: "locked", value: detail.line1.dutyRate, lockedReason: "Computed from the HTS classification — edit the HTS Number to change it." });
    set("merch:line2:hts", { state: "error", value: detail.line2.hts, citation: CATAIR_CITATIONS[398] });
    set("merch:line2:country", { state: "error", value: detail.line2.country, citation: CATAIR_CITATIONS[398] });
    set("merch:line2:description", { state: "agent_draft", value: detail.line2.desc, confidence: 68, rationale: "Classification is uncertain pending the HTS/country conflict above." });
    set("merch:line2:quantity", { state: "empty", value: "" });
    set("merch:line2:enteredValue", { state: "agent_draft", value: money(detail.line2.enteredValue), confidence: 85, rationale: "Extracted from the commercial invoice line total." });
    set("merch:line2:dutyRate", { state: "locked", value: detail.line2.dutyRate, lockedReason: "Computed from the HTS classification — resolve the classification error above first." });

    // 4. Duties, Taxes & Fees — computed, always locked
    set("duties:totalDuty", { state: "locked", value: money(detail.totalDuty), lockedReason: "Computed from the HTS lines above." });
    set("duties:mpf", { state: "locked", value: money(detail.mpf), lockedReason: "Merchandise Processing Fee, computed per 19 CFR 24.23 — not directly editable." });
    set("duties:hmf", { state: "locked", value: money(detail.hmf), lockedReason: "Harbor Maintenance Fee, computed from entered value — not directly editable." });
    set("duties:totalEstimatedDuty", { state: "locked", value: money(detail.totalEstimatedDuty), lockedReason: "Sum of duty, MPF, and HMF above." });

    // 5. Compliance / Holds — always locked, demonstrates the never-auto-
    // finalize rule at field level.
    set("compliance:ofac", { state: "locked", value: "Screened — no match", lockedReason: "OFAC/BIS/DPL screening can only be cleared by a compliance officer, regardless of Agent Interaction Mode." });

    // 6. References
    set("refs:billOfLading", { state: "agent_final", value: row.mbl, confidence: 99, rationale: "Read directly from the Bill of Lading." });
    set("refs:manifestNumber", { state: "empty", value: "" });

    return entries;
  }

  // ---------------------------------------------------------------------
  // View state — module-level, reset whenever the viewed row changes, same
  // convention as every other page module in this app.
  // ---------------------------------------------------------------------

  const TABS = [
    { id: "header", label: "Header" },
    { id: "parties", label: "Parties" },
    { id: "merch", label: "Merchandise" },
    { id: "duties", label: "Duties & Fees" },
    { id: "compliance", label: "Compliance" },
    { id: "refs", label: "References" }
  ];

  const UTILITY_TABS = [
    { id: "chat", label: "KlearAgent" },
    { id: "validation", label: "Validation" },
    { id: "audit", label: "Audit Trail" }
  ];

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
    denyNotes: []
  };

  function resetIfNewRow(row) {
    if (state.rowId === row.id) {
      return;
    }
    const detail = buildFilingDetail(row);
    state.rowId = row.id;
    state.tab = "header";
    state.utilityTab = "chat";
    state.fields = seedFieldEntries(row, detail);
    state.panelOpen = "";
    state.aceModalOpen = false;
    state.denyNotes = [];
    // Auto-accept-all seeds settle immediately, on load, matching what a
    // "the agent already ran" experience looks like in this mode — matches
    // the same per-mode behavior a live agent proposal would trigger.
    if (getMode() === "auto-accept") {
      Object.keys(state.fields).forEach((key) => applyAutoAccept(row.id, key));
    } else if (getMode() === "deny-all") {
      Object.keys(state.fields).forEach((key) => moveDraftToAdvisory(key));
    }
  }

  function fieldLabel(key) {
    const labels = {
      "header:entryNumber": "Entry Number", "header:entryType": "Entry Type Code", "header:entryDate": "Entry Date",
      "header:portOfEntry": "Port of Entry", "header:firmsCode": "FIRMS Code", "header:bondType": "Bond Type",
      "parties:importerName": "Importer of Record", "parties:importerNumber": "IOR Number",
      "parties:consigneeName": "Consignee", "parties:ultimateConsigneeName": "Ultimate Consignee",
      "merch:line1:hts": "HTS Number (Line 1)", "merch:line1:country": "Country of Origin (Line 1)",
      "merch:line1:description": "Description (Line 1)", "merch:line1:quantity": "Quantity (Line 1)",
      "merch:line1:enteredValue": "Entered Value (Line 1)", "merch:line1:dutyRate": "Duty Rate (Line 1)",
      "merch:line2:hts": "HTS Number (Line 2)", "merch:line2:country": "Country of Origin (Line 2)",
      "merch:line2:description": "Description (Line 2)", "merch:line2:quantity": "Quantity (Line 2)",
      "merch:line2:enteredValue": "Entered Value (Line 2)", "merch:line2:dutyRate": "Duty Rate (Line 2)",
      "duties:totalDuty": "Total Duty", "duties:mpf": "MPF", "duties:hmf": "HMF", "duties:totalEstimatedDuty": "Total Estimated Duty",
      "compliance:ofac": "OFAC/BIS/DPL Hold Status",
      "refs:billOfLading": "Bill of Lading Number", "refs:manifestNumber": "Manifest Number"
    };
    return labels[key] || key;
  }

  function fieldSection(key) {
    return key.split(":")[0];
  }

  // ---------------------------------------------------------------------
  // Agent Interaction Mode → apply logic
  // ---------------------------------------------------------------------

  function applyAutoAccept(entryId, key) {
    const f = state.fields[key];
    if (!f || f.state !== "agent_draft") {
      return;
    }
    const previousValue = f.value;
    f.state = "agent_final";
    logPatch(entryId, {
      fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
      action: "fill", previousValue: "", newValue: f.value,
      source: "agent", actor: "agent", mode: "auto-accept",
      confidence: f.confidence ?? null, rationale: f.rationale || "", citation: f.citation || null
    });
    void previousValue;
  }

  function moveDraftToAdvisory(key) {
    const f = state.fields[key];
    if (!f || f.state !== "agent_draft") {
      return;
    }
    // Deny-all: the field itself never changes — the proposal only ever
    // appears as read-only advisory text in the Chat tab's "KlearAgent
    // Notes" list. Nothing here mutates state.fields[key].state.
    state.denyNotes.push({ fieldKey: key, fieldLabel: fieldLabel(key), value: f.value, confidence: f.confidence ?? null, rationale: f.rationale || "" });
  }

  // ---------------------------------------------------------------------
  // Icons — small inline SVGs, same authoring convention as every other
  // page module in this app.
  // ---------------------------------------------------------------------

  function iconDraft() {
    return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1Z" fill="currentColor"/></svg>`;
  }
  function iconFinal() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M5.5 8.2l1.7 1.7 3.3-3.8"/></svg>`;
  }
  function iconOverride() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3-7.3 7.3-3.7.7.7-3.7 7.3-7.3Z"/></svg>`;
  }
  function iconLocked() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7.25" width="10" height="6.5" rx="1.25"/><path d="M5.25 7.25V5a2.75 2.75 0 0 1 5.5 0v2.25"/></svg>`;
  }
  function iconError() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 15 13.5H1L8 1.5Z"/><path d="M8 6.25v3M8 11.5h.01"/></svg>`;
  }
  function iconClose() {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
  }
  function iconStar() {
    return `<span class="entry-ai-mark${state.__reduceMotion ? "" : " is-rotating"}" aria-hidden="true">${iconDraft()}</span>`;
  }

  const FLAG_META = {
    agent_draft: { icon: iconStar, label: "KlearAgent proposed — click to review" },
    agent_final: { icon: iconFinal, label: "KlearAgent filled this — click to review" },
    user_override: { icon: iconOverride, label: "You entered this value — click for details" },
    locked: { icon: iconLocked, label: "Locked — click to see why" },
    error: { icon: iconError, label: "Validation failed — click for details" }
  };

  // ---------------------------------------------------------------------
  // The generic six-state field renderer.
  // ---------------------------------------------------------------------

  function popoverBody(key, f) {
    if (f.state === "locked") {
      return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(f.lockedReason || "This field cannot be edited.")}</p>`;
    }
    if (f.state === "error") {
      const c = f.citation;
      return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(RATIONALE_BY_STATE.error)}</p>
        ${c ? `<div class="entry-citation">
          <span class="badge badge--negative type-caption-sm kn-badge">Reject ${escapeHtml(c.code)}</span>
          <span class="badge badge--neutral type-caption-sm kn-badge">Sample citation</span>
          <p class="type-caption-sm entry-citation__ref">${escapeHtml(c.title)} — ${escapeHtml(c.ref)}</p>
          <p class="type-caption-sm entry-citation__disclaimer">Demo citation — not a real CBP ruling.</p>
        </div>` : ""}`;
    }
    if (f.state === "user_override") {
      const patch = auditForEntry(state.rowId).find((p) => p.fieldKey === key && p.action !== "fill");
      const who = patch ? patch.actor : "you";
      const when = patch ? new Date(patch.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "just now";
      return `<p class="type-caption-sm entry-field-panel__msg">Entered by ${escapeHtml(who)} · ${escapeHtml(when)}.</p>`;
    }
    // agent_draft / agent_final
    const confidence = typeof f.confidence === "number" ? `<span class="badge badge--ai type-caption-sm kn-badge">Confidence ${f.confidence}%</span>` : "";
    return `<p class="type-caption-sm entry-field-panel__msg">${escapeHtml(f.rationale || RATIONALE_BY_STATE[f.state] || "")}</p>${confidence}`;
  }

  function popoverActions(key, f) {
    if (f.state === "agent_draft") {
      return `<div class="entry-field-panel__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-reject="${escapeHtml(key)}">Reject</button>
        <button class="btn btn--primary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-accept="${escapeHtml(key)}">Accept</button>
      </div>`;
    }
    if (f.state === "agent_final") {
      return `<div class="entry-field-panel__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-field-correct="${escapeHtml(key)}">Correct this</button>
      </div>`;
    }
    return "";
  }

  // Composes the canonical `.kn-field` / `.kn-form-label` / `.kn-field__control`
  // shell (components.css) — not a parallel field system. The six-state
  // review flag/popover has no canonical equivalent (it's new UI), so that
  // part stays custom, layered on top of the standard control. `locked` and
  // `error` map onto the shell's own `.is-disabled` / `.is-invalid` +
  // `aria-invalid` modifiers instead of hand-rolled styling.
  function field(key, opts = {}) {
    const f = state.fields[key];
    const isOpen = state.panelOpen === key;
    const meta = FLAG_META[f.state];
    const flag = meta
      ? `<span class="entry-field-flag-wrap">
          <button class="entry-field-flag entry-field-flag--${f.state}" type="button" data-entry-field-toggle="${escapeHtml(key)}" aria-haspopup="dialog" aria-expanded="${isOpen}" aria-label="${escapeHtml(meta.label)}" data-tooltip="${escapeHtml(meta.label)}">${f.state === "agent_draft" ? iconStar() : meta.icon()}</button>
          ${isOpen ? `<div class="entry-field-panel" role="dialog" aria-label="${escapeHtml(fieldLabel(key))} review">
            <div class="entry-field-panel__head">
              <span class="entry-field-panel__badge">KlearAgent</span>
              <button class="icon-btn" type="button" data-entry-field-close aria-label="Close">${iconClose()}</button>
            </div>
            ${popoverBody(key, f)}
            ${popoverActions(key, f)}
          </div>` : ""}
        </span>`
      : "";
    const locked = f.state === "locked";
    const invalid = f.state === "error";
    const empty = f.state === "empty";
    return `<div class="kn-field entry-field${locked ? " is-disabled" : ""}${invalid ? " is-invalid" : ""}${empty ? " entry-field--empty" : ""}" data-entry-field-row="${escapeHtml(key)}">
      <label class="kn-form-label" for="entry-input-${escapeHtml(key)}">${escapeHtml(fieldLabel(key))}${opts.required ? " *" : ""}</label>
      <div class="entry-field__control-wrap">
        <input
          class="kn-field__control"
          id="entry-input-${escapeHtml(key)}"
          type="text"
          data-entry-field="${escapeHtml(key)}"
          value="${escapeHtml(f.value || "")}"
          placeholder="${empty ? "Not filled" : "—"}"
          ${locked ? "disabled" : ""}
          aria-invalid="${invalid ? "true" : "false"}"
        />
        ${flag}
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Document Panel — evidence list. Deliberately simple (no PDF preview):
  // the point of this build is the field-state/audit/mode mechanics, not a
  // document viewer. Missing/extraction-error rows are visually unmissable
  // per Maria Rodriguez's persona requirement.
  // ---------------------------------------------------------------------

  const DOCS = [
    { id: "ci", label: "Commercial Invoice", status: "received" },
    { id: "pl", label: "Packing List", status: "received" },
    { id: "bl", label: "Bill of Lading", status: "received" },
    { id: "coo", label: "Certificate of Origin", status: "extraction-error" },
    { id: "isf", label: "ISF Filing", status: "received" },
    { id: "pwr", label: "Power of Attorney", status: "missing" }
  ];

  function docStatusBadge(status) {
    if (status === "missing") return `<span class="badge badge--negative type-caption-sm kn-badge">Missing</span>`;
    if (status === "extraction-error") return `<span class="badge badge--notice type-caption-sm kn-badge">Extraction error</span>`;
    return `<span class="badge badge--positive type-caption-sm kn-badge">Received</span>`;
  }

  function renderDocPanel(row) {
    const items = DOCS.map((d) => `<li class="entry-doc-row entry-doc-row--${d.status}">
      <span class="type-body-sm entry-doc-row__label">${escapeHtml(d.label)}</span>
      ${docStatusBadge(d.status)}
    </li>`).join("");
    const missingCount = DOCS.filter((d) => d.status !== "received").length;
    return `<div class="entry-filing-panel entry-filing-panel--docs">
      <header class="entry-filing-panel__header">
        <h2 class="type-heading-h6 type-weight-semibold">Documents</h2>
        ${missingCount ? `<span class="badge badge--notice type-caption-sm kn-badge">${missingCount} need attention</span>` : ""}
      </header>
      <ul class="entry-doc-list">${items}</ul>
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Entry Summary Form (record panel)
  // ---------------------------------------------------------------------

  function sectionFields(sectionId) {
    const bySection = {
      header: ["header:entryNumber", "header:entryType", "header:entryDate", "header:portOfEntry", "header:firmsCode", "header:bondType"],
      parties: ["parties:importerName", "parties:importerNumber", "parties:consigneeName", "parties:ultimateConsigneeName"],
      merch: ["merch:line1:hts", "merch:line1:country", "merch:line1:description", "merch:line1:quantity", "merch:line1:enteredValue", "merch:line1:dutyRate",
        "merch:line2:hts", "merch:line2:country", "merch:line2:description", "merch:line2:quantity", "merch:line2:enteredValue", "merch:line2:dutyRate"],
      duties: ["duties:totalDuty", "duties:mpf", "duties:hmf", "duties:totalEstimatedDuty"],
      compliance: ["compliance:ofac"],
      refs: ["refs:billOfLading", "refs:manifestNumber"]
    };
    return bySection[sectionId] || [];
  }

  function renderTabs() {
    return `<div class="entry-tabs" role="tablist" aria-label="Entry Summary sections">
      ${TABS.map((t) => `<button class="entry-tabs__item ${state.tab === t.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${state.tab === t.id}" data-entry-tab="${t.id}">${escapeHtml(t.label)}</button>`).join("")}
    </div>`;
  }

  function isSettled(key) {
    const s = state.fields[key].state;
    return s === "agent_final" || s === "user_override" || s === "locked" || s === "empty";
  }

  function submitAceDisabled() {
    return Object.keys(state.fields).some((key) => {
      const s = state.fields[key].state;
      return s === "error" || s === "agent_draft";
    });
  }

  function renderRecordPanel(row) {
    const fieldsHtml = sectionFields(state.tab).map((key) => field(key)).join("");
    const disabled = submitAceDisabled();
    return `<div class="entry-filing-panel entry-filing-panel--record">
      <header class="entry-filing-panel__header entry-filing-panel__header--record">
        <div>
          <h2 class="type-heading-h6 type-weight-semibold">${escapeHtml(row.transactionId)}</h2>
          <p class="type-caption-sm entry-filing-panel__sub">${escapeHtml(row.companyName)} · Entry ${escapeHtml(row.entryNumber)}</p>
        </div>
      </header>
      ${renderTabs()}
      <div class="entry-filing-panel__body" role="tabpanel">
        <div class="entry-field-grid">${fieldsHtml}</div>
      </div>
      <footer class="entry-filing-footer">
        <p class="type-caption-sm entry-filing-footer__note">KlearAgent cannot perform this action for you — regardless of Agent Interaction Mode.</p>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-entry-submit-ace ${disabled ? "disabled" : ""}>Submit to ACE</button>
      </footer>
    </div>`;
  }

  // ---------------------------------------------------------------------
  // Utility Panel — mode switch (always visible) + Chat / Validation /
  // Audit Trail tabs.
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
    const errorFields = Object.keys(state.fields).filter((k) => state.fields[k].state === "error");
    if (!errorFields.length) {
      return `<p class="type-body-sm entry-utility__empty">No open validation findings.</p>`;
    }
    return `<ul class="entry-validation-list">${errorFields.map((key) => {
      const f = state.fields[key];
      const c = f.citation;
      return `<li class="entry-validation-row">
        <p class="type-ui-sm type-weight-semibold">${escapeHtml(fieldLabel(key))}</p>
        ${c ? `<p class="type-caption-sm">${escapeHtml(c.title)}</p><span class="badge badge--negative type-caption-sm kn-badge">Reject ${escapeHtml(c.code)}</span> <span class="badge badge--neutral type-caption-sm kn-badge">Sample citation</span>` : ""}
      </li>`;
    }).join("")}</ul>`;
  }

  function chatModeMessage() {
    const mode = getMode();
    if (mode === "deny-all") {
      return "Deny-all mode: KlearAgent's suggestions appear here as advisory notes only — nothing on the form changes until you enter it yourself.";
    }
    if (mode === "auto-accept") {
      return "Auto-accept-all mode: KlearAgent fills fields directly on the form. Every agent-filled field stays one click away from review — open its flag to see the rationale or correct it.";
    }
    return "Permission-per-change mode: KlearAgent proposes values on the form (look for the purple sparkle flag) — open one to accept or reject before it's applied.";
  }

  function renderChatTab() {
    const notes = getMode() === "deny-all" ? state.denyNotes : [];
    const notesHtml = notes.length
      ? `<div class="entry-advisory-list">
          <p class="type-ui-sm type-weight-semibold entry-advisory-list__title">KlearAgent Notes</p>
          ${notes.map((n) => `<div class="entry-advisory-row">
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(n.fieldLabel)}</p>
            <p class="type-caption-sm">Suggested: <strong>${escapeHtml(n.value)}</strong>${typeof n.confidence === "number" ? ` · ${n.confidence}% confidence` : ""}</p>
            <p class="type-caption-sm">${escapeHtml(n.rationale)}</p>
            <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-entry-copy-note="${escapeHtml(n.value)}">Copy value</button>
          </div>`).join("")}
        </div>`
      : "";
    return `<div class="entry-utility__chat">
      <p class="type-body-sm entry-utility__empty">${escapeHtml(chatModeMessage())}</p>
      ${notesHtml}
    </div>`;
  }

  function renderAuditTab() {
    const patches = auditForEntry(state.rowId);
    if (!patches.length) {
      return `<p class="type-body-sm entry-utility__empty">No changes recorded yet.</p>`;
    }
    return `<ul class="entry-audit-list">${patches.map((p) => {
      const isAgent = p.source === "agent";
      const actionLabel = { fill: "auto-filled", accept: "confirmed", reject: "rejected", edit: "edited", "submit-ace": "submitted to ACE" }[p.action] || p.action;
      return `<li class="entry-audit-row">
        <span class="entry-audit-row__marker entry-audit-row__marker--${isAgent ? "agent" : "human"}" aria-hidden="true"></span>
        <div class="entry-audit-row__body">
          <div class="entry-audit-row__topline">
            <p class="type-ui-sm type-weight-semibold">${escapeHtml(isAgent ? "KlearAgent" : p.actor)} ${escapeHtml(actionLabel)} "${escapeHtml(p.fieldLabel)}"</p>
            ${isAgent ? `<span class="badge badge--ai type-caption-sm kn-badge">Agent</span>` : `<span class="badge badge--information type-caption-sm kn-badge">Human</span>`}
          </div>
          <p class="type-caption-sm">${escapeHtml(p.newValue || "—")}${typeof p.confidence === "number" ? ` · confidence ${p.confidence}%` : ""} · ${escapeHtml(new Date(p.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</p>
          ${p.rationale ? `<p class="type-caption-sm entry-audit-row__rationale">${escapeHtml(p.rationale)}</p>` : ""}
        </div>
      </li>`;
    }).join("")}</ul>`;
  }

  function renderUtilityPanel() {
    const tabContent = state.utilityTab === "chat" ? renderChatTab() : state.utilityTab === "validation" ? renderValidationTab() : renderAuditTab();
    return `<aside class="entry-filing-panel entry-filing-panel--utility" id="entry-utility-panel">
      <header class="entry-filing-panel__header entry-filing-panel__header--utility">
        <h2 class="type-heading-h6 type-weight-semibold">KlearAgent</h2>
        ${renderModeSwitch()}
      </header>
      <div class="entry-tabs entry-tabs--utility" role="tablist" aria-label="Utility panel views">
        ${UTILITY_TABS.map((t) => `<button class="entry-tabs__item ${state.utilityTab === t.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${state.utilityTab === t.id}" data-entry-utility-tab="${t.id}">${escapeHtml(t.label)}</button>`).join("")}
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

  function renderAceModal(row) {
    if (!state.aceModalOpen) {
      return "";
    }
    const bodyHtml = `<p class="type-body-md">You're about to submit ${escapeHtml(row.transactionId)} to ACE.</p>
      <p class="type-body-sm entry-ace-modal__disclaimer">KlearAgent cannot perform this action for you — regardless of Agent Interaction Mode. This confirms a human decision to file.</p>`;
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
    return `<div class="entry-filing-layout">
      ${renderDocPanel(row)}
      ${renderRecordPanel(row)}
      ${renderUtilityPanel()}
    </div>
    ${renderAceModal(row)}`;
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

  function handleClick(event, row, helpers) {
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
    const toggle = event.target.closest("[data-entry-field-toggle]");
    if (toggle) {
      event.preventDefault();
      const key = toggle.getAttribute("data-entry-field-toggle") || "";
      state.panelOpen = state.panelOpen === key ? "" : key;
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
        f.state = "agent_final";
        logPatch(row.id, {
          fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
          action: "accept", previousValue: "", newValue: f.value,
          source: "agent", actor: "jatin.bansal@klearnow.com", mode: getMode(),
          confidence: f.confidence ?? null, rationale: f.rationale || "", citation: f.citation || null
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
        f.state = "empty";
        f.value = "";
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

  function handleInput(event, row, helpers) {
    const input = event.target.closest("[data-entry-field]");
    if (!input) {
      return;
    }
    const key = input.getAttribute("data-entry-field") || "";
    const f = state.fields[key];
    if (!f || f.state === "locked") {
      return;
    }
    const previousValue = f.value;
    const previousState = f.state;
    f.value = input.value;
    f.state = "user_override";
    if (previousState !== "user_override") {
      logPatch(row.id, {
        fieldKey: key, fieldLabel: fieldLabel(key), section: fieldSection(key),
        action: previousState === "empty" ? "fill" : "edit", previousValue, newValue: f.value,
        source: "human", actor: "jatin.bansal@klearnow.com", mode: getMode(),
        confidence: null, rationale: "", citation: null
      });
    }
    rerenderPreservingFocus(helpers);
  }

  function handleKeydown(event, row, helpers) {
    const root = document.getElementById("kn-entry-root");
    if (state.aceModalOpen) {
      if (ux().handleOverlayKeydown(root, event)) {
        return;
      }
      if (event.key === "Escape") {
        state.aceModalOpen = false;
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
    }
  }

  window.KNEntryFiling = { render, handleClick, handleInput, handleKeydown, syncOverlay };
})();
