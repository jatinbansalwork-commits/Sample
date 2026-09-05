(() => {
  "use strict";

  const ROUTE = "#payment-us-statements";
  const APPROVAL_PREFIX = "#payment-us-statements/approval/";

  const PENDING = [
    {
      id: "26-0903-A",
      company: "GLOBAL-PAK",
      status: "pending",
      achStatus: "scheduled",
      filerCode: "0AF",
      statementDate: "Sep 3, 2026",
      debitDate: "Sep 4, 2026",
      totalDue: 18240,
      duty: 15400,
      mpf: 2240,
      hmf: 600,
      entries: [
        { id: "ln-a1", entryNumber: "217-01302401", company: "GLOBAL-PAK", duty: 3850, mpf: 560, hmf: 150 },
        { id: "ln-a2", entryNumber: "217-01302408", company: "GLOBAL-PAK", duty: 4200, mpf: 580, hmf: 160 },
        { id: "ln-a3", entryNumber: "217-01302415", company: "GLOBAL-PAK", duty: 3650, mpf: 550, hmf: 140 },
        { id: "ln-a4", entryNumber: "217-01302422", company: "GLOBAL-PAK", duty: 3700, mpf: 550, hmf: 150 }
      ]
    },
    {
      id: "26-0903-B",
      company: "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
      status: "pending",
      achStatus: "scheduled",
      filerCode: "0AF",
      statementDate: "Sep 3, 2026",
      debitDate: "Sep 4, 2026",
      totalDue: 6120,
      duty: 4980,
      mpf: 920,
      hmf: 220,
      entries: [
        { id: "ln-b1", entryNumber: "0AF-3000693", company: "CAMERON INTERNATIONAL CORPORATION (SUB QC)", duty: 2480, mpf: 460, hmf: 110 },
        { id: "ln-b2", entryNumber: "217-01308333", company: "CAMERON INTERNATIONAL CORPORATION (SUB QC)", duty: 2500, mpf: 460, hmf: 110 }
      ]
    },
    {
      id: "26-0903-C",
      company: "ILLUMINATE USA LLC",
      status: "pending",
      achStatus: "missing",
      filerCode: "0AF",
      statementDate: "Sep 3, 2026",
      debitDate: "Sep 4, 2026",
      totalDue: 42900,
      duty: 36200,
      mpf: 5200,
      hmf: 1500,
      entries: [
        { id: "ln-c1", entryNumber: "74-8823019", company: "ILLUMINATE USA LLC", duty: 18200, mpf: 2600, hmf: 750 },
        { id: "ln-c2", entryNumber: "217-01302402", company: "ILLUMINATE USA LLC", duty: 18000, mpf: 2600, hmf: 750 }
      ]
    }
  ];

  const state = {
    ready: false,
    booting: false,
    selectedId: "",
    approveModalOpen: false,
    edits: {}
  };

  function escapeHtml(v) {
    return window.KNAdminUX?.escapeHtml?.(v) ?? String(v ?? "");
  }

  function ux() {
    return window.KNAdminUX || {};
  }

  function toast(content, color = "positive") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  function money(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      Number(amount) || 0
    );
  }

  function approvalRouteId() {
    const match = location.hash.match(/^#payment-us-statements\/approval\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function pendingStatements() {
    return PENDING.filter((row) => row.status === "pending");
  }

  function findStatement(id) {
    return PENDING.find((row) => row.id === id) || null;
  }

  function lineEdits(statementId) {
    if (!state.edits[statementId]) {
      state.edits[statementId] = {};
    }
    return state.edits[statementId];
  }

  function entryLine(statement, entry) {
    const edits = lineEdits(statement.id)[entry.id] || {};
    return {
      ...entry,
      duty: edits.duty ?? entry.duty,
      mpf: edits.mpf ?? entry.mpf,
      hmf: edits.hmf ?? entry.hmf
    };
  }

  function statementTotals(statement) {
    const lines = statement.entries.map((entry) => entryLine(statement, entry));
    const duty = lines.reduce((sum, row) => sum + Number(row.duty) || 0, 0);
    const mpf = lines.reduce((sum, row) => sum + Number(row.mpf) || 0, 0);
    const hmf = lines.reduce((sum, row) => sum + Number(row.hmf) || 0, 0);
    return { duty, mpf, hmf, totalDue: duty + mpf + hmf };
  }

  function syncSelectionFromRoute() {
    const routeId = approvalRouteId();
    if (routeId && findStatement(routeId)) {
      state.selectedId = routeId;
      return;
    }
    const first = pendingStatements()[0];
    state.selectedId = first?.id || "";
  }

  function achBadge(status) {
    if (status === "scheduled") {
      return `<span class="kn-badge kn-badge--small kn-badge--positive">ACH scheduled</span>`;
    }
    if (status === "missing") {
      return `<span class="kn-badge kn-badge--small kn-badge--negative">No ACH on file</span>`;
    }
    return `<span class="kn-badge kn-badge--small kn-badge--neutral">${escapeHtml(status)}</span>`;
  }

  function renderList() {
    const rows = pendingStatements();
    if (!rows.length) {
      return `<div class="statement-approval-empty type-body-md">No statements pending approval.</div>`;
    }
    return `<div class="role-table-card kn-table-surface statement-approval-list">
      <table class="tm-table vis-table--admin statement-approval-table">
        <thead>
          <tr>
            <th scope="col">Statement</th>
            <th scope="col">Company</th>
            <th scope="col">Total due</th>
            <th scope="col">Duty</th>
            <th scope="col">MPF</th>
            <th scope="col">HMF</th>
            <th scope="col">ACH</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const totals = statementTotals(row);
              const selected = row.id === state.selectedId;
              return `<tr class="statement-approval-row${selected ? " is-selected" : ""}" data-stmt-select="${escapeHtml(row.id)}" tabindex="0" role="button" aria-pressed="${selected}">
                <td><span class="code">${escapeHtml(row.id)}</span></td>
                <td>${escapeHtml(row.company)}</td>
                <td>${money(totals.totalDue)}</td>
                <td>${money(totals.duty)}</td>
                <td>${money(totals.mpf)}</td>
                <td>${money(totals.hmf)}</td>
                <td>${achBadge(row.achStatus)}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function renderDetail(statement) {
    if (!statement) {
      return "";
    }
    const totals = statementTotals(statement);
    return `<section class="statement-approval-detail" aria-labelledby="stmt-detail-title">
      <div class="statement-approval-detail__head">
        <div>
          <h2 class="type-heading-h5 type-weight-semibold" id="stmt-detail-title">Statement ${escapeHtml(statement.id)}</h2>
          <p class="type-body-sm statement-approval-detail__meta">${escapeHtml(statement.company)} · Filer ${escapeHtml(statement.filerCode)} · Posted ${escapeHtml(statement.statementDate)}</p>
        </div>
        <div class="statement-approval-detail__badges">${achBadge(statement.achStatus)}</div>
      </div>
      <dl class="statement-approval-detail__grid">
        <div><dt class="type-caption-sm">Total due</dt><dd class="type-body-md type-weight-semibold">${money(totals.totalDue)}</dd></div>
        <div><dt class="type-caption-sm">Duty</dt><dd class="type-body-md">${money(totals.duty)}</dd></div>
        <div><dt class="type-caption-sm">MPF</dt><dd class="type-body-md">${money(totals.mpf)}</dd></div>
        <div><dt class="type-caption-sm">HMF</dt><dd class="type-body-md">${money(totals.hmf)}</dd></div>
        <div><dt class="type-caption-sm">ACH debit</dt><dd class="type-body-md">${escapeHtml(statement.debitDate)}</dd></div>
      </dl>
      ${
        statement.achStatus === "missing"
          ? `<div class="kn-alert kn-alert--notice statement-approval-detail__alert" role="status">
              <p class="type-body-sm"><strong>ACH authorization missing.</strong> CBP will still debit this statement — a failed pull becomes a bond claim.</p>
            </div>`
          : ""
      }
    </section>`;
  }

  function renderEntryForm(statement) {
    if (!statement) {
      return "";
    }
    const lines = statement.entries.map((entry) => entryLine(statement, entry));
    return `<form class="statement-approval-form" id="statement-approval-form" novalidate>
      <div class="statement-approval-form__head">
        <h3 class="type-heading-h6 type-weight-semibold">Entry summaries</h3>
        <p class="type-caption-sm">Adjust duty, MPF, or HMF before approval. Changes stay on this statement until you click Update.</p>
      </div>
      <div class="role-table-card kn-table-surface">
        <table class="tm-table vis-table--admin statement-approval-entry-table">
          <thead>
            <tr>
              <th scope="col">Entry</th>
              <th scope="col">Company</th>
              <th scope="col">Duty</th>
              <th scope="col">MPF</th>
              <th scope="col">HMF</th>
              <th scope="col">Line total</th>
            </tr>
          </thead>
          <tbody>
            ${lines
              .map((line) => {
                const lineTotal = (Number(line.duty) || 0) + (Number(line.mpf) || 0) + (Number(line.hmf) || 0);
                return `<tr>
                  <td><span class="code">${escapeHtml(line.entryNumber)}</span></td>
                  <td>${escapeHtml(line.company)}</td>
                  <td><input class="vis-th-filter type-body-sm statement-approval-input" type="number" min="0" step="1" name="duty-${escapeHtml(line.id)}" data-stmt-line="${escapeHtml(line.id)}" data-stmt-field="duty" value="${Number(line.duty) || 0}" aria-label="Duty for ${escapeHtml(line.entryNumber)}" /></td>
                  <td><input class="vis-th-filter type-body-sm statement-approval-input" type="number" min="0" step="1" name="mpf-${escapeHtml(line.id)}" data-stmt-line="${escapeHtml(line.id)}" data-stmt-field="mpf" value="${Number(line.mpf) || 0}" aria-label="MPF for ${escapeHtml(line.entryNumber)}" /></td>
                  <td><input class="vis-th-filter type-body-sm statement-approval-input" type="number" min="0" step="1" name="hmf-${escapeHtml(line.id)}" data-stmt-line="${escapeHtml(line.id)}" data-stmt-field="hmf" value="${Number(line.hmf) || 0}" aria-label="HMF for ${escapeHtml(line.entryNumber)}" /></td>
                  <td class="type-body-sm type-weight-semibold" data-stmt-line-total="${escapeHtml(line.id)}">${money(lineTotal)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="statement-approval-form__actions">
        <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-stmt-update>Update</button>
        <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-stmt-approve>Approve</button>
      </div>
      <p class="type-caption-sm statement-approval-form__note">Approval requires an explicit click — Klear Agent cannot approve statements on your behalf.</p>
    </form>`;
  }

  function renderApproveModal(statement) {
    if (!state.approveModalOpen || !statement) {
      return "";
    }
    const totals = statementTotals(statement);
    const bodyHtml = `<p class="type-body-md">Approve statement <strong>${escapeHtml(statement.id)}</strong> for <strong>${money(totals.totalDue)}</strong>?</p>
      <p class="type-body-sm">This authorizes the periodic daily statement for ${escapeHtml(statement.company)}. ACH debit is scheduled for ${escapeHtml(statement.debitDate)} unless ACH is missing on file.</p>
      <p class="type-body-sm statement-approval-modal__disclaimer">Klear Agent cannot perform this action for you — regardless of Agent Interaction Mode.</p>`;
    const footerHtml = `
      <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-admin-modal-dismiss>Cancel</button>
      <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-stmt-approve-confirm>Confirm approval</button>`;
    return ux().modalShell?.({
      open: true,
      id: "kn-stmt-approve-modal",
      titleId: "kn-stmt-approve-title",
      title: "Approve statement",
      dismissAttr: "data-admin-modal-dismiss",
      bodyHtml,
      footerHtml
    }) || "";
  }

  function render() {
    const page = document.getElementById("kn-statement-page");
    const root = document.getElementById("kn-statement-root");
    if (!page || !root || page.hidden) {
      return;
    }
    syncSelectionFromRoute();
    const statement = findStatement(state.selectedId);
    root.innerHTML = `<div class="tm-page-head statement-approval-head">
        <h1 class="type-heading-h3 type-weight-semibold">Statement Approval</h1>
        <p class="type-body-sm statement-approval-head__sub">Review pending periodic daily statements before ACH debit.</p>
      </div>
      ${renderList()}
      ${statement ? renderDetail(statement) : ""}
      ${statement ? renderEntryForm(statement) : ""}
      ${renderApproveModal(statement)}`;
    window.KNConfirmation?.hydrate?.(root);
  }

  function navigateToStatement(id) {
    if (!id) {
      location.hash = ROUTE;
      return;
    }
    location.hash = `${APPROVAL_PREFIX}${encodeURIComponent(id)}`;
  }

  function readFormEdits(statement) {
    const root = document.getElementById("kn-statement-root");
    if (!root || !statement) {
      return;
    }
    const edits = lineEdits(statement.id);
    root.querySelectorAll("[data-stmt-line][data-stmt-field]").forEach((input) => {
      const lineId = input.getAttribute("data-stmt-line");
      const field = input.getAttribute("data-stmt-field");
      if (!lineId || !field) {
        return;
      }
      if (!edits[lineId]) {
        edits[lineId] = {};
      }
      edits[lineId][field] = Number(input.value) || 0;
    });
  }

  function applyUpdates(statement) {
    readFormEdits(statement);
    const totals = statementTotals(statement);
    statement.duty = totals.duty;
    statement.mpf = totals.mpf;
    statement.hmf = totals.hmf;
    statement.totalDue = totals.totalDue;
    toast(`Statement ${statement.id} updated.`, "positive");
    const page = document.getElementById("kn-statement-page");
    if (page && !page.hidden) {
      render();
    }
    return { ok: true, totals };
  }

  /** INT-09 — finance backend periodic daily statement approval (sample mock). */
  function approveViaInt09(statement) {
    if (!statement || statement.status !== "pending") {
      return { ok: false, error: "Statement is not pending approval." };
    }
    readFormEdits(statement);
    statement.status = "approved";
    toast(`Statement ${statement.id} approved for ${money(statementTotals(statement).totalDue)} via INT-09.`, "positive");
    return { ok: true, statementId: statement.id, totalDue: statementTotals(statement).totalDue };
  }

  function approveStatement(statement) {
    const result = approveViaInt09(statement);
    if (!result.ok) {
      return result;
    }
    state.approveModalOpen = false;
    const next = pendingStatements()[0];
    if (next) {
      navigateToStatement(next.id);
    } else {
      state.selectedId = "";
      location.hash = ROUTE;
    }
    render();
    return result;
  }

  function resolveEntryRowId(entryNumber) {
    const needle = String(entryNumber || "").trim();
    const entries = window.KNUsEntry?.list?.() || [];
    const direct = entries.find((row) => String(row.entryNumber || "").trim() === needle);
    if (direct) {
      return direct.id;
    }
    const demoMap = {
      "74-8823019": "entry-1",
      "217-01302402": "entry-2",
      "217-01302401": "entry-1",
      "0AF-3000693": "entry-2",
      "217-01308333": "entry-3"
    };
    return demoMap[needle] || entries[0]?.id || "entry-1";
  }

  function paymentMethodLabel(statement) {
    if (!statement) {
      return "—";
    }
    if (statement.achStatus === "missing") {
      return "ACH — not authorized on file";
    }
    if (statement.achStatus === "scheduled") {
      return "ACH scheduled";
    }
    return String(statement.achStatus || "—");
  }

  function listEntryCards() {
    return pendingStatements().flatMap((statement) =>
      statement.entries.map((entry) => {
        const line = entryLine(statement, entry);
        const duty = Number(line.duty) || 0;
        const mpf = Number(line.mpf) || 0;
        const hmf = Number(line.hmf) || 0;
        return {
          statementId: statement.id,
          lineId: entry.id,
          entryNumber: entry.entryNumber,
          company: entry.company,
          duty,
          mpf,
          hmf,
          totalDue: duty + mpf + hmf,
          entryId: resolveEntryRowId(entry.entryNumber),
          statementDate: statement.statementDate,
          debitDate: statement.debitDate,
          paymentMethod: paymentMethodLabel(statement),
          achStatus: statement.achStatus
        };
      })
    );
  }

  function bind(page) {
    page.addEventListener("click", (event) => {
      const row = event.target.closest("[data-stmt-select]");
      if (row) {
        event.preventDefault();
        navigateToStatement(row.getAttribute("data-stmt-select") || "");
        return;
      }
      if (event.target.closest("[data-stmt-update]")) {
        event.preventDefault();
        const statement = findStatement(state.selectedId);
        if (statement) {
          applyUpdates(statement);
        }
        return;
      }
      if (event.target.closest("[data-stmt-approve]")) {
        event.preventDefault();
        const statement = findStatement(state.selectedId);
        if (statement) {
          readFormEdits(statement);
          state.approveModalOpen = true;
          render();
        }
        return;
      }
      if (event.target.closest("[data-stmt-approve-confirm]")) {
        event.preventDefault();
        const statement = findStatement(state.selectedId);
        if (statement) {
          approveStatement(statement);
        }
        return;
      }
      if (event.target.closest("[data-admin-modal-dismiss]")) {
        event.preventDefault();
        state.approveModalOpen = false;
        render();
      }
    });

    page.addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-stmt-select]");
      if (row && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        navigateToStatement(row.getAttribute("data-stmt-select") || "");
      }
      if (event.key === "Escape" && state.approveModalOpen) {
        state.approveModalOpen = false;
        render();
      }
    });

    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-stmt-line][data-stmt-field]");
      if (!input) {
        return;
      }
      const lineId = input.getAttribute("data-stmt-line");
      const duty = Number(page.querySelector(`[data-stmt-line="${lineId}"][data-stmt-field="duty"]`)?.value) || 0;
      const mpf = Number(page.querySelector(`[data-stmt-line="${lineId}"][data-stmt-field="mpf"]`)?.value) || 0;
      const hmf = Number(page.querySelector(`[data-stmt-line="${lineId}"][data-stmt-field="hmf"]`)?.value) || 0;
      const totalCell = page.querySelector(`[data-stmt-line-total="${lineId}"]`);
      if (totalCell) {
        totalCell.textContent = money(duty + mpf + hmf);
      }
    });
  }

  function suspend() {
    state.approveModalOpen = false;
  }

  function sync() {
    const page = document.getElementById("kn-statement-page");
    if (!page || page.hidden) {
      return;
    }
    if (!state.ready) {
      state.booting = true;
      render();
      window.requestAnimationFrame(() => {
        state.booting = false;
        state.ready = true;
        syncSelectionFromRoute();
        render();
      });
      return;
    }
    syncSelectionFromRoute();
    render();
  }

  function init() {
    const page = document.getElementById("kn-statement-page");
    if (!page || page.dataset.bound) {
      return;
    }
    page.dataset.bound = "true";
    bind(page);
  }

  window.KNPaymentUsStatements = {
    init,
    sync,
    suspend,
    route: ROUTE,
    find: findStatement,
    list: pendingStatements,
    all: () => PENDING.slice(),
    money,
    entryLine,
    statementTotals,
    lineEdits,
    readFormEdits,
    applyUpdates,
    approveViaInt09,
    approve: approveStatement,
    resolveEntryRowId,
    paymentMethodLabel,
    listEntryCards
  };
})();
