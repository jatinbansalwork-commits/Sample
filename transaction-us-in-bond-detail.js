(() => {
  const ROUTE = "#transaction-us-in-bond";

  const TABS = [
    { id: "header", label: "Header" },
    { id: "parties", label: "Parties" },
    { id: "bol", label: "BOL Info" },
    { id: "container", label: "Containers" },
    { id: "references", label: "References" },
    { id: "merchandise", label: "Merchandise" }
  ];

  const PARTY_GROUPS = [
    { id: "primary", label: "Primary Parties" },
    { id: "logistics", label: "Logistics Parties" }
  ];

  const detailCache = new Map();

  const state = {
    rowId: "",
    tab: "header",
    statusOpen: false,
    statusRowExpanded: new Set(),
    partiesExpanded: new Set()
  };

  function ux() {
    return window.KNAdminUX;
  }

  function isfApi() {
    return window.KNIsfDetail;
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

  function pad(n, width) {
    return String(n).padStart(width, "0");
  }

  function seedFor(row) {
    const n = parseInt(String(row?.id || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function adaptInbRow(row) {
    if (!row) {
      return row;
    }
    if (row.isfLinkId) {
      try {
        const isf = window.KNUsIsf?.list?.()?.find((item) => item.id === row.isfLinkId);
        if (isf) {
          return {
            ...isf,
            id: row.id,
            transactionId: row.transactionId,
            companyName: row.companyName || isf.companyName,
            shipments: row.shipments || isf.shipments,
            mbl: row.mbl || isf.mbl,
            hbl: row.hbl || isf.hbl
          };
        }
      } catch (_) {
        /* KNUsIsf may not be loaded yet */
      }
    }
    return {
      id: row.id,
      transactionId: row.transactionId,
      companyName: row.companyName,
      country: row.countryExport || row.countryImport || "US - United States of America",
      shipments: row.shipments,
      mbl: row.mbl,
      hbl: row.hbl || "",
      username: row.username || "",
      status: row.transactionState,
      statusChip: row.statusChip,
      etd: row.eta,
      filingDate: row.filingDate || ""
    };
  }

  function motLabel(mot) {
    if (mot === "AIR") {
      return "40 - AIR";
    }
    if (mot === "TRUCK") {
      return "30 - TRUCK";
    }
    return "11 - OCEAN";
  }

  function inbondNumberFromRow(row, n) {
    const raw = String(row.entryNumber || "").replace(/^undefined-/i, "");
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 6) {
      return digits.padStart(9, "0").slice(-9);
    }
    return pad((n * 97) % 1000000000, 9);
  }

  function buildInbDetail(row) {
    if (detailCache.has(row.id)) {
      return detailCache.get(row.id);
    }
    const n = seedFor(row);
    const isfDetail = isfApi()?.buildDetail?.(adaptInbRow(row)) || {
      parties: [],
      bol: [],
      merchandise: [],
      container: [],
      references: [],
      statusHistory: [],
      docCounts: { EML: 1, BL: 1, AN: 0, CI: 0, ISF: 0, PL: 0, MISC: 0 }
    };
    const header = {
      importingMot: motLabel(row.mot),
      inBondType: "",
      bondedCarrierCode: "",
      carrierId: "",
      portOfDeparture: "",
      portOfDestination: n % 5 !== 0 ? "2004" : "",
      foreignDestinationPort: n % 3 !== 0 ? "55224" : "",
      merchandiseValue: "",
      inBondQuantity: "",
      btaFda: n % 4 === 0,
      ftzBondedWarehouse: false
    };
    const detail = {
      ...isfDetail,
      header,
      inbondNumber: inbondNumberFromRow(row, n),
      shipmentId: row.shipments || ""
    };
    detailCache.set(row.id, detail);
    return detail;
  }

  function resetIfNewRow(row, keepTab) {
    if (state.rowId !== row.id) {
      state.rowId = row.id;
      if (!keepTab) {
        state.tab = "header";
      }
      state.statusOpen = false;
      state.statusRowExpanded = new Set();
      state.partiesExpanded = new Set();
    }
  }

  function iconBack() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`;
  }

  function iconNext() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
  }

  function iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }

  function iconSearch() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  }

  function iconInfo() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>`;
  }

  function iconAdd() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
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

  function field(label, value, opts = {}) {
    const empty = value === "" || value == null;
    const displayValue = empty ? "" : String(value);
    const placeholder = opts.placeholder || "—";
    return `<div class="form-display-field">
      <span class="form-display-field__label inb-field-label">${escapeHtml(label)}</span>
      <div class="isf-input-field">
        <input class="kn-field__control isf-input-field__control" type="text" value="${escapeHtml(displayValue)}" placeholder="${escapeHtml(placeholder)}" disabled aria-label="${escapeHtml(label)}" />
      </div>
    </div>`;
  }

  function selectField(label, value, placeholder = "Select") {
    const displayValue = value || placeholder;
    return `<div class="form-display-field">
      <span class="form-display-field__label inb-field-label">${escapeHtml(label)}</span>
      <div class="isf-input-field">
        <select class="kn-field__control isf-input-field__control" disabled aria-label="${escapeHtml(label)}">
          <option selected>${escapeHtml(displayValue)}</option>
        </select>
      </div>
    </div>`;
  }

  function portField(label, value) {
    const displayValue = value || "";
    return `<div class="form-display-field">
      <span class="form-display-field__label inb-field-label">${escapeHtml(label)}</span>
      <div class="isf-input-field isf-input-field--port">
        <span class="isf-input-field__icon isf-input-field__icon--lead" aria-hidden="true">${iconInfo()}</span>
        <input class="kn-field__control isf-input-field__control" type="text" value="${escapeHtml(displayValue)}" placeholder="—" disabled aria-label="${escapeHtml(label)}" />
        <button class="icon-btn isf-input-field__icon isf-input-field__icon--trail" type="button" data-inb-detail-inert="Port lookup is not available in this sample." aria-label="Search ${escapeHtml(label)}" data-tooltip="Search">${iconSearch()}</button>
      </div>
    </div>`;
  }

  function checkboxField(label, checked, opts = {}) {
    const info = opts.info
      ? `<button class="icon-btn inb-field-info" type="button" data-inb-detail-inert="Additional information is not available in this sample." aria-label="More information about ${escapeHtml(label)}" data-tooltip="Info">${iconInfo()}</button>`
      : "";
    const variantClass = opts.variant === "solo" ? " inb-checkbox-field--solo" : "";
    return `<div class="form-display-field inb-checkbox-field${variantClass}">
      <label class="inb-checkbox-field__label">
        <input type="checkbox" disabled${checked ? " checked" : ""} aria-label="${escapeHtml(label)}" />
        <span class="inb-field-label">${escapeHtml(label)}</span>
        ${info}
      </label>
    </div>`;
  }

  function renderHeaderTab(row, detail) {
    const h = detail.header;
    return `<div class="inb-header-form">
      <div class="isf-detail-grid">
        ${selectField("Importing Mode of Transp", h.importingMot)}
        ${selectField("In-Bond Type", h.inBondType, "Select")}
        ${field("Bonded Carrier Code", h.bondedCarrierCode)}
        ${field("Carrier ID", h.carrierId)}
        ${portField("In-Bond Port of Departure", h.portOfDeparture)}
        ${portField("In-Bond Port of Destination", h.portOfDestination)}
        ${portField("Foreign Destination Port", h.foreignDestinationPort)}
      </div>
      <div class="isf-detail-grid inb-header-form__row">
        ${field("Merchandise Value", h.merchandiseValue)}
        ${field("In-Bond Quantity", h.inBondQuantity)}
        ${checkboxField("BTA/FDA", h.btaFda, { info: true })}
      </div>
      <div class="isf-detail-grid inb-header-form__row inb-header-form__row--solo">
        ${checkboxField("FTZ/Bonded Warehouse", h.ftzBondedWarehouse, { variant: "solo" })}
      </div>
    </div>`;
  }

  function renderRecordFields(rows, fieldDefs, { emptyHint = "No records on file.", sectionLabel = "Line" } = {}) {
    if (!rows.length) {
      return `<div class="isf-detail-fields">
        <p class="type-caption-sm isf-detail-fields__empty">${escapeHtml(emptyHint)}</p>
        <div class="isf-detail-grid">
          ${fieldDefs.map((def) => field(def.label, "")).join("")}
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
                  return field(def.label, value ?? "");
                })
                .join("")}
            </div>
          </div>`;
        })
        .join("")}
    </div>`;
  }

  function renderPartyAccordionItem(p) {
    const open = state.partiesExpanded.has(p.id);
    const badge = p.complete
      ? `<span class="badge badge--positive type-caption-sm type-weight-medium kn-badge">Complete</span>`
      : `<span class="badge badge--notice type-caption-sm type-weight-medium kn-badge">Needs info</span>`;
    const body = `<div class="isf-detail-grid isf-detail-grid--party">
      ${field("Full Name", p.fullName)}
      ${field("Identification Type", p.idType)}
      ${field("Identification Number", p.idNumber, { placeholder: "Missing" })}
      ${field("City", p.city)}
      ${field("State / Province", p.state)}
      ${field("Zip / Postal Code", p.zip, { placeholder: "Missing" })}
      ${field("Country", p.country)}
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

  function renderPartiesTab(row, detail) {
    const completeCount = detail.parties.filter((p) => p.complete).length;
    const allExpanded = detail.parties.length > 0 && detail.parties.every((p) => state.partiesExpanded.has(p.id));
    return `<div class="isf-parties">
      <div class="kn-field__head isf-parties__head">
        <span class="type-caption-sm type-weight-medium kn-field__label kn-form-label">${completeCount} of ${detail.parties.length} parties complete</span>
        <button class="kn-link type-caption-sm" type="button" data-inb-parties-expand-all>${allExpanded ? "Collapse All" : "Expand All"}</button>
      </div>
      ${PARTY_GROUPS.map((group) => {
        const groupParties = detail.parties.filter((p) => p.group === group.id);
        if (!groupParties.length) {
          return "";
        }
        return `<div class="isf-parties__group">
          <h3 class="type-caption-sm type-weight-semibold isf-parties__group-label">${escapeHtml(group.label)}</h3>
          <div class="role-perm">
            ${groupParties.map((p) => renderPartyAccordionItem(p)).join("")}
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function editableTable(columns, rows) {
    const body = rows.length
      ? rows
          .map(
            (row) => `<tr>
          ${columns.map((col) => `<td class="type-body-sm">${escapeHtml(row[col.key] ?? "")}</td>`).join("")}
          <td class="isf-row-delete"><button class="icon-btn" type="button" data-inb-detail-inert="Removing a row is not available in this sample." aria-label="Remove row">${iconTrash()}</button></td>
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
                ${columns.map((col) => `<th scope="col">${escapeHtml(col.label)}</th>`).join("")}
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>`
        : ""}
      <div class="isf-editable-table__actions">
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-inb-detail-inert="Adding a row is not available in this sample.">${iconAdd()} Add</button>
      </div>
    </div>`;
  }

  function renderTabBody(row, detail) {
    switch (state.tab) {
      case "parties":
        return renderPartiesTab(row, detail);
      case "bol":
        return renderRecordFields(
          detail.bol,
          [
            { key: "shipmentId", label: "Shipment ID" },
            { key: "type", label: "Type" },
            { key: "billOfLading", label: "Bill of Lading" },
            { key: "status", label: "Status" }
          ],
          { sectionLabel: "BOL", emptyHint: "No BOL records on file." }
        );
      case "container":
        return renderRecordFields(
          detail.container,
          [
            { key: "containerNumber", label: "Container Number" },
            { key: "sealNumber", label: "Seal Number" },
            { key: "sizeType", label: "Size / Type" },
            { key: "grossWeight", label: "Gross Weight" }
          ],
          { sectionLabel: "Container", emptyHint: "No containers on file." }
        );
      case "references":
        return editableTable(
          [
            { key: "entryNumber", label: "Entry Number" },
            { key: "type", label: "Type" },
            { key: "relatedTo", label: "Related To" }
          ],
          detail.references
        );
      case "merchandise":
        return renderRecordFields(
          detail.merchandise,
          [
            { key: "hts", label: "HTS" },
            { key: "co", label: "C/O" },
            { key: "mfr", label: "MFR" },
            { key: "description", label: "Description" }
          ],
          { sectionLabel: "Line", emptyHint: "No merchandise lines on file." }
        );
      default:
        return renderHeaderTab(row, detail);
    }
  }

  function renderStatusPanel(row, detail) {
    if (!state.statusOpen) {
      return "";
    }
    const base = new Date(Date.UTC(2024, 10, 23, 1, 30, 0));
    const entries = detail.statusHistory || [];
    return `<div class="isf-status-panel">
      <div class="isf-status-timeline">
        ${entries
          .map((entry, i) => {
            const rowId = `${entry.fileId}-${entry.type}-${i}`;
            const ts = new Date(base.getTime() + (entry.offsetMin || i) * 60000);
            const stamp = `${ts.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${ts.toISOString().slice(11, 19)} UTC`;
            const isLast = i === entries.length - 1;
            return `<div class="isf-status-step isf-status-step--${entry.tone || "neutral"}${isLast ? " isf-status-step--last" : ""}">
              <div class="isf-status-step__rail" aria-hidden="true">
                <span class="isf-status-step__marker">${iconStatusTone(entry.tone)}</span>
              </div>
              <div class="isf-status-step__content">
                <div class="isf-status-step__row">
                  <div class="isf-status-step__main">
                    <span class="type-body-sm type-weight-semibold isf-status-step__title">${escapeHtml(entry.status)}</span>
                    <span class="type-caption-sm isf-status-step__meta">${escapeHtml(entry.fileId || row.transactionId)} · ${escapeHtml(entry.type || "")} · ${escapeHtml(stamp)}</span>
                  </div>
                </div>
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  function renderRecordPanel(row, detail, meta) {
    const txnStatus = row.transactionState || "NEW";
    const txnTone = row.statusChip || "pending";
    return `<div class="isf-record-panel inb-record-panel">
      <header class="isf-record-panel__header">
        <div class="isf-record-panel__top">
          <div class="isf-record-panel__title">
            <h2 class="type-heading-h6 type-weight-semibold inb-record-panel__title">IN BOND FILING</h2>
          </div>
          <div class="isf-record-panel__nav">
            <button class="icon-btn" type="button" data-isf-detail-prev aria-label="Previous transaction" data-tooltip="Previous"${meta.hasPrev ? "" : " disabled"}>${iconBack()}</button>
            <button class="icon-btn" type="button" data-isf-detail-next aria-label="Next transaction" data-tooltip="Next"${meta.hasNext ? "" : " disabled"}>${iconNext()}</button>
          </div>
        </div>
        <div class="isf-record-panel__ids">
          <span class="type-caption-sm"><strong>Transaction ID:</strong> ${escapeHtml(row.transactionId)} <button class="isf-copy-btn" type="button" data-inb-copy="${escapeHtml(row.transactionId)}" aria-label="Copy transaction ID" data-tooltip="Copy">${iconCopy()}</button></span>
          <span class="type-caption-sm"><strong>Shipment ID:</strong> ${escapeHtml(detail.shipmentId)} <button class="isf-copy-btn" type="button" data-inb-copy="${escapeHtml(detail.shipmentId)}" aria-label="Copy shipment ID" data-tooltip="Copy">${iconCopy()}</button></span>
          <span class="type-caption-sm"><strong>Inbond Number:</strong> ${escapeHtml(detail.inbondNumber)} <button class="isf-copy-btn" type="button" data-inb-copy="${escapeHtml(detail.inbondNumber)}" aria-label="Copy inbond number" data-tooltip="Copy">${iconCopy()}</button></span>
        </div>
      </header>
      <div class="isf-record-panel__status">
        <span class="type-caption-sm isf-record-panel__status-item"><strong>Transaction Status:</strong> ${statusBadge(txnStatus, txnTone)}</span>
        <span class="type-caption-sm isf-record-panel__status-item"><strong>Customs Status:</strong> ${statusBadge("Custom None", "notice")}</span>
        <button class="btn btn--tertiary btn--sm type-ui-sm kn-btn" type="button" data-inb-status-toggle>${state.statusOpen ? "Hide Status" : "Show Status"}</button>
      </div>
      ${renderStatusPanel(row, detail)}
      <div class="kn-detail-tabs kn-detailed-view__tabs" role="tablist" aria-label="In-Bond sections">
        ${TABS.map((t) => {
          const missing = t.id === "parties" ? detail.parties.filter((p) => !p.complete).length : 0;
          const badge = missing
            ? `<span class="counter counter--negative counter--intense kn-tab__badge kn-counter${missing > 9 ? " kn-counter--wide counter--wide" : ""}" aria-hidden="true">${missing}</span>`
            : "";
          return `<button class="kn-tab type-ui-sm ${t.id === state.tab ? "is-active type-weight-semibold" : "type-weight-medium"}" type="button" role="tab" id="kn-inb-detail-tab-${t.id}" aria-selected="${t.id === state.tab}" aria-controls="kn-inb-detail-panel" tabindex="${t.id === state.tab ? "0" : "-1"}" data-inb-detail-tab="${t.id}">${escapeHtml(t.label)}${badge}</button>`;
        }).join("")}
      </div>
      <div class="isf-record-panel__body" id="kn-inb-detail-panel" role="tabpanel" tabindex="-1" aria-labelledby="kn-inb-detail-tab-${state.tab}">
        ${renderTabBody(row, detail)}
      </div>
    </div>`;
  }

  function renderTransactionSidePanel(row, detail, meta = {}) {
    const modeLabel = meta.panelMode === "edit" ? "Edit In-Bond transaction" : "View In-Bond transaction";
    return `<aside class="isf-doc-viewer__side panel card kn-card" aria-label="${escapeHtml(modeLabel)}">
      ${renderRecordPanel(row, detail, meta)}
    </aside>`;
  }

  function prepareTransactionSidePanel(row, meta = {}) {
    resetIfNewRow(row, meta.keepTab);
  }

  function renderSkeleton() {
    const fieldSkeletons = Array.from(
      { length: 10 },
      () => `<div class="skeleton-stack"><span class="skeleton skeleton--caption" style="width: 55%"></span><span class="skeleton skeleton--line" style="width: 85%"></span></div>`
    ).join("");
    return `<div class="isf-detail-layout isf-doc-viewer--split" aria-busy="true">
      <div class="isf-record-panel inb-record-panel">
        <header class="isf-record-panel__header">
          <div class="isf-record-panel__top"><span class="skeleton skeleton--title" style="width: 10rem"></span></div>
          <div class="isf-record-panel__ids"><span class="skeleton skeleton--caption" style="width: 12rem"></span></div>
        </header>
        <div class="kn-detail-tabs" aria-hidden="true">
          ${TABS.map((t) => `<span class="skeleton skeleton--btn" style="width: ${4 + t.label.length * 0.4}rem"></span>`).join("")}
        </div>
        <div class="isf-record-panel__body"><div class="isf-detail-grid">${fieldSkeletons}</div></div>
      </div>
    </div>`;
  }

  function copyToClipboard(value) {
    const done = () => toast(`Copied ${value}.`, "positive");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done, done);
      return;
    }
    done();
  }

  function handleClick(event, row, helpers) {
    const tabBtn = event.target.closest("[data-inb-detail-tab]");
    if (tabBtn) {
      event.preventDefault();
      state.tab = tabBtn.getAttribute("data-inb-detail-tab") || "header";
      helpers.rerender();
      return true;
    }
    const statusToggle = event.target.closest("[data-inb-status-toggle]");
    if (statusToggle) {
      event.preventDefault();
      state.statusOpen = !state.statusOpen;
      helpers.rerender();
      return true;
    }
    const expandAll = event.target.closest("[data-inb-parties-expand-all]");
    if (expandAll) {
      event.preventDefault();
      const detail = buildInbDetail(row);
      const allExpanded = detail.parties.every((p) => state.partiesExpanded.has(p.id));
      if (allExpanded) {
        state.partiesExpanded = new Set();
      } else {
        state.partiesExpanded = new Set(detail.parties.map((p) => p.id));
      }
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
    const copyBtn = event.target.closest("[data-inb-copy]");
    if (copyBtn) {
      event.preventDefault();
      copyToClipboard(copyBtn.getAttribute("data-inb-copy") || "");
      return true;
    }
    const inert = event.target.closest("[data-inb-detail-inert]");
    if (inert) {
      event.preventDefault();
      toast(inert.getAttribute("data-inb-detail-inert") || "Not available in this sample.", "notice");
      return true;
    }
    return false;
  }

  function handleKeydown(event, row, helpers) {
    const tabBtn = event.target.closest('[role="tab"][data-inb-detail-tab]');
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
    document.getElementById(`kn-inb-detail-tab-${state.tab}`)?.focus();
    return true;
  }

  function documentViewerHash(row, catId, index) {
    return `${ROUTE}/documents/${encodeURIComponent(row.id)}?cat=${encodeURIComponent(catId)}&doc=${index}`;
  }

  function viewerRecordId(row) {
    return isfApi()?.productionDocId?.(adaptInbRow(row), "EML", 0) || row.transactionId;
  }

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

  function proxy(name) {
    return (...args) => {
      const api = isfApi();
      if (!api?.[name]) {
        return undefined;
      }
      if (args[0] && typeof args[0] === "object" && args[0].id && name !== "buildDetail") {
        return api[name](adaptInbRow(args[0]), ...args.slice(1));
      }
      return api[name](...args);
    };
  }

  if (!isfApi()) {
    return;
  }

  window.KNInbDetail = {
    renderTransactionSidePanel,
    prepareTransactionSidePanel,
    renderTransactionDrawer: renderTransactionSidePanel,
    prepareTransactionDrawer: prepareTransactionSidePanel,
    handleClick,
    handleKeydown,
    renderSkeleton,
    buildDetail: buildInbDetail,
    documentViewerHash,
    viewerRecordId,
    viewerRecordIdOptions,
    createDocPanelState: proxy("createDocPanelState"),
    defaultDocPanelCategory: proxy("defaultDocPanelCategory"),
    docCategories: proxy("docCategories"),
    docCode: proxy("docCode"),
    docReceivedDate: proxy("docReceivedDate"),
    seedFor,
    renderDocRail: proxy("renderDocRail"),
    renderDocPreviewArea: proxy("renderDocPreviewArea"),
    renderDocumentPageMock: proxy("renderDocumentPageMock"),
    renderDocumentPreview(row, catId, index, detail, opts) {
      return isfApi().renderDocumentPreview(adaptInbRow(row), catId, index, detail, opts);
    },
    renderPdfDocumentPreview: proxy("renderPdfDocumentPreview"),
    renderEmailThreadPreview: proxy("renderEmailThreadPreview"),
    documentAssetUrl(row, catId, index, count) {
      return isfApi().documentAssetUrl(adaptInbRow(row), catId, index, count);
    },
    openDocumentInNewTab(row, catId, index) {
      return isfApi().openDocumentInNewTab(adaptInbRow(row), catId, index);
    },
    productionDocId(row, catId, index) {
      return isfApi().productionDocId(adaptInbRow(row), catId, index);
    },
    previewDocFormat: proxy("previewDocFormat"),
    iconPrint: proxy("iconPrint"),
    iconAdd: proxy("iconAdd"),
    iconSearch: proxy("iconSearch"),
    iconExternal: proxy("iconExternal"),
    iconDownload: proxy("iconDownload"),
    iconZoomIn: proxy("iconZoomIn"),
    iconZoomOut: proxy("iconZoomOut"),
    iconDocCat: proxy("iconDocCat"),
    iconCalendar: proxy("iconCalendar"),
    iconFieldWarn: proxy("iconFieldWarn"),
    handleDocPanelClick: proxy("handleDocPanelClick"),
    renderPrintModal: proxy("renderPrintModal"),
    handlePrintModalClick: proxy("handlePrintModalClick"),
    renderAddDocModal: proxy("renderAddDocModal"),
    handleAddDocModalClick: proxy("handleAddDocModalClick"),
    handleAddDocModalInput: proxy("handleAddDocModalInput"),
    handleAddDocModalChange: proxy("handleAddDocModalChange"),
    handleAddDocModalDrop: proxy("handleAddDocModalDrop"),
    wrapDocArtifact: proxy("wrapDocArtifact")
  };
})();
