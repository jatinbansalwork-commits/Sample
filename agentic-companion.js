/**
 * Klear Agent — context companion panel (split view beside the thread).
 * Resolves the active conversation topic and mounts the related broker surface.
 */
(function () {
  "use strict";

  let companionMap = null;
  let companionMarkerLayer = null;
  let open = false;
  let lastContext = null;

  const ENTRY_DEMO_MAP = Object.freeze({
    "74-8823019": "entry-1",
    "217-01302402": "entry-2",
    "217-01302401": "entry-1",
    "0AF-3000693": "entry-2",
    "217-01308333": "entry-3",
    "KX-M3Q8-21": "entry-4"
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rootEl() {
    return document.getElementById("agentic-thread");
  }

  function panelEl() {
    return document.getElementById("agentic-thread-companion");
  }

  function bodyEl() {
    return document.getElementById("agentic-thread-companion-body");
  }

  function titleEl() {
    return document.getElementById("agentic-thread-companion-title");
  }

  function subtitleEl() {
    return document.getElementById("agentic-thread-companion-subtitle");
  }

  function openLinkEl() {
    return document.getElementById("agentic-thread-companion-open");
  }

  function toggleBtn() {
    return document.getElementById("agentic-thread-sidebar-toggle");
  }

  function collectThreadText(thread) {
    const messages = thread?.messages || [];
    const lastUser = [...messages].reverse().find((item) => item.senderType === "self");
    const lastOther = [...messages].reverse().find((item) => item.senderType !== "self");
    return [lastUser?.text, lastOther?.text, thread?.title].filter(Boolean).join(" ");
  }

  function extractRecordId(text) {
    const match = String(text || "").match(/\b(\d{2}-\d{7}|KX-[A-Z0-9-]+|S1F\d+|KH5-\d+|6WL-\d+)\b/i);
    return match ? match[1].toUpperCase() : "";
  }

  function resolveEntryRow(entryNumber) {
    const needle = String(entryNumber || "").trim();
    if (!needle) {
      return null;
    }
    const entries = window.KNUsEntry?.list?.() || [];
    const direct = entries.find((row) => String(row.entryNumber || "").trim().toUpperCase() === needle.toUpperCase());
    if (direct) {
      return direct;
    }
    const mappedId = ENTRY_DEMO_MAP[needle.toUpperCase()];
    if (mappedId) {
      return entries.find((row) => row.id === mappedId) || { id: mappedId, entryNumber: needle, companyName: "ILLUMINATE USA LLC" };
    }
    return null;
  }

  function resolveContext(thread) {
    const text = collectThreadText(thread);
    const lower = text.toLowerCase();
    const recordId = extractRecordId(text);

    if (/statement|ach|debit cycle|today'?s statements/i.test(lower)) {
      return {
        kind: "statements",
        title: "Today's statements",
        subtitle: "ACH review and duty totals due today",
        href: "#payment-us-statements"
      };
    }
    if (/hold|cbp|pga|fda|reject|ace status|entry status|clear to file|8823019/i.test(lower) || (recordId && /hold|cbp|entry|ace status|entry status/i.test(lower))) {
      const row = resolveEntryRow(recordId || "74-8823019");
      const api = window.KNEntryStatusDetail;
      const messages = api?.buildStatusMessages?.({ row: row || { id: "entry-1" }, findings: [] }) || [];
      const holdMessage =
        messages.find((msg) => msg.type === "error") ||
        ({
          description:
            "Entry is held under a PGA (FDA) referral — the commercial invoice lists a food-contact product, which triggers automatic FDA review regardless of value."
        });
      return {
        kind: "entry",
        title: recordId ? `Entry ${recordId}` : row?.entryNumber ? `Entry ${row.entryNumber}` : "Entry status",
        subtitle: "ACE / CBP status and hold detail",
        cause: holdMessage.description,
        href: row?.id ? `#transaction-us-entry/filing/${encodeURIComponent(row.id)}` : "#transaction-us-entry",
        entryNumber: recordId || row?.entryNumber || "74-8823019",
        row
      };
    }
    if (/queue|working list|recent entries|my queue|due today|cbp rejected/i.test(lower)) {
      return {
        kind: "queue",
        title: "Working queue",
        subtitle: "Entries in progress, rejects, and holds",
        href: "#transaction-us-entry"
      };
    }
    if (/shipment|visibility|map|operations|in transit|demurrage|delay|transport mode|ocean|air freight/i.test(lower)) {
      const filter = /hold/i.test(lower) ? "hold" : /delay/i.test(lower) ? "delayed" : "all";
      return {
        kind: "visibility",
        title: "Shipment visibility",
        subtitle: "Live map and shipment cards",
        href: filter === "hold" ? "#klearhub-visibility" : "#klearhub-visibility",
        filter
      };
    }
    if (/dashboard|personal dashboard/i.test(lower)) {
      return {
        kind: "dashboard",
        title: "Dashboard",
        subtitle: "Live snapshot and shipment map",
        href: "#dashboard"
      };
    }
    if (/isf/i.test(lower)) {
      return {
        kind: "isf",
        title: "ISF filings",
        subtitle: "Pending and at-risk ISF-10 filings",
        cause:
          "ISF-10 must be on file 24 hours before vessel departure. Pending submission rows are the only ones you can still complete from Transaction Manager today.",
        href: "#transaction-us-isf"
      };
    }
    if (recordId) {
      const row = resolveEntryRow(recordId);
      if (row) {
        return {
          kind: "entry",
          title: `Entry ${row.entryNumber || recordId}`,
          subtitle: "Entry filing workstation",
          href: `#transaction-us-entry/filing/${encodeURIComponent(row.id)}`,
          entryNumber: row.entryNumber || recordId,
          row
        };
      }
    }
    return {
      kind: "empty",
      title: "Related view",
      subtitle: "Ask about shipments, entries, or your queue to open a matching panel.",
      href: "#dashboard"
    };
  }

  function filterShipments(filter) {
    const rows = window.KNShipments || [];
    if (filter === "hold") {
      return rows.filter((row) => row.statusTone === "negative" || /hold/i.test(row.status || ""));
    }
    if (filter === "delayed") {
      return rows.filter((row) => row.statusTone === "notice" || /delay/i.test(row.status || "") || /delay/i.test(row.delay || ""));
    }
    return rows.slice(0, 12);
  }

  function companionCardHtml(item) {
    return `<article class="vis-card agentic-companion-vis__card" data-companion-shipment="${escapeHtml(item.id)}">
      <header class="vis-card__head">
        <div class="vis-card__copy">
          <p class="vis-card__id type-ui-md type-weight-semibold">${escapeHtml(item.id)}</p>
          <p class="vis-card__company type-caption-sm">${escapeHtml(item.company || "")}</p>
        </div>
        <div class="vis-card__badges">
          <span class="kn-badge kn-badge--small kn-badge--${item.statusTone === "negative" ? "negative" : item.statusTone === "notice" ? "notice" : "positive"}">${escapeHtml(item.status || "")}</span>
        </div>
      </header>
      <p class="type-caption-sm">${escapeHtml(item.origin?.city || "—")} → ${escapeHtml(item.dest?.city || "—")}</p>
    </article>`;
  }

  function destroyCompanionMap() {
    if (companionMap) {
      companionMap.remove();
      companionMap = null;
      companionMarkerLayer = null;
    }
  }

  function renderCompanionMap(rows) {
    const el = document.getElementById("agentic-companion-map");
    if (!el || typeof L === "undefined" || typeof createConstrainedMap !== "function") {
      if (el) {
        el.classList.add("shipment-map--fallback");
        el.innerHTML = '<p class="type-body-sm">Live map could not be loaded.</p>';
      }
      return;
    }
    destroyCompanionMap();
    el.classList.remove("shipment-map--fallback");
    el.innerHTML = "";
    const mapLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      mapTileOptions({
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd"
      })
    );
    companionMap = createConstrainedMap(el);
    mapLayer.addTo(companionMap);
    companionMarkerLayer = L.layerGroup().addTo(companionMap);
    const markers = (rows.length ? rows : window.KNShipments || []).slice(0, 20).map((item) => window.knToMapItem?.(item)).filter(Boolean);
    markers.forEach((vessel) => {
      const icon = window.KNMapUx?.createPillIcon?.(vessel);
      if (!icon) {
        return;
      }
      const marker = L.marker([vessel.lat, vessel.lng], { icon });
      marker.bindTooltip(vessel.label || vessel.id || "", { direction: "top", opacity: 0.95 });
      marker.on("click", () => {
        location.hash = "#klearhub-visibility";
        window.openKnShipmentDetail?.(vessel.id);
      });
      companionMarkerLayer.addLayer(marker);
    });
    if (companionMarkerLayer.getLayers().length) {
      const group = L.featureGroup(companionMarkerLayer.getLayers());
      companionMap.fitBounds(group.getBounds().pad(0.18));
    }
    window.requestAnimationFrame(() => companionMap?.invalidateSize());
  }

  function mountVisibility(ctx) {
    const rows = filterShipments(ctx.filter);
    return `<div class="agentic-companion-vis">
      <div class="agentic-companion-vis__split">
        <div class="agentic-companion-vis__list" role="list">${rows.map(companionCardHtml).join("") || '<p class="type-body-sm">No shipments match this filter.</p>'}</div>
        <div class="map-stage agentic-companion-vis__map-stage">
          <div class="shipment-map" id="agentic-companion-map" role="region" aria-label="Live shipment map"></div>
        </div>
      </div>
    </div>`;
  }

  function mountQueue() {
    const rows = (window.KNUsEntry?.list?.() || []).slice(0, 8);
    const body = rows
      .map(
        (row) => `<tr>
          <td class="type-ui-sm"><span class="code">${escapeHtml(row.entryNumber || row.transactionId)}</span></td>
          <td class="type-body-sm">${escapeHtml(row.companyName || "—")}</td>
          <td><span class="kn-badge kn-badge--small kn-badge--neutral">${escapeHtml(row.entrySummary || row.statusChip || "—")}</span></td>
        </tr>`
      )
      .join("");
    return `<div class="agentic-companion-queue kn-card">
      <div class="kn-card__body">
        <table class="kn-genui__table vis-table">
          <thead><tr><th>Entry</th><th>Importer</th><th>Status</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }

  function mountEntry(ctx) {
    const entryNumber = ctx.entryNumber || "74-8823019";
    const row = ctx.row || resolveEntryRow(entryNumber);
    const api = window.KNEntryStatusDetail;
    const messages = api?.buildStatusMessages?.({ row: row || { id: "entry-1" }, findings: [] }) || [];
    const holdMessage =
      messages.find((msg) => msg.type === "error") ||
      ({
        type: "error",
        description:
          "Entry is held under a PGA (FDA) referral — the commercial invoice lists a food-contact product, which triggers automatic FDA review regardless of value.",
        rawCode: "PGA-FDA",
        timestamp: new Date().toISOString()
      });
    const summary = api?.summaryLabel?.(api?.summarizeMessages?.(messages) || { errors: 1 }) || "1 error • FDA referral";
    return `<div class="agentic-companion-entry">
      <article class="kn-card agentic-companion-entry__card">
        <div class="kn-card__header"><div class="kn-card__copy">
          <p class="kn-card__title type-ui-md type-weight-semibold">${escapeHtml(entryNumber)}</p>
          <p class="kn-card__subtitle type-caption-sm">${escapeHtml(row?.companyName || "ILLUMINATE USA LLC")}</p>
        </div></div>
        <div class="kn-card__body">
          <p class="type-caption-sm">${escapeHtml(summary)}</p>
          <div class="kn-alert kn-alert--notice kn-alert--subtle kn-alert--full" role="alert">
            <span class="kn-alert__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M10.3 5.2 3.2 17.5A2 2 0 0 0 4.9 20.5h14.2a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/></svg></span>
            <div class="kn-alert__content">
              <p class="kn-alert__title">${escapeHtml(holdMessage.rawCode || "Hold")}</p>
              <p class="kn-alert__desc">${escapeHtml(holdMessage.description)}</p>
            </div>
          </div>
        </div>
        <div class="kn-card__footer">
          <a class="btn btn--secondary btn--sm kn-btn kn-btn--secondary kn-btn--small type-ui-sm" href="${escapeHtml(ctx.href || "#transaction-us-entry")}">Open entry filing</a>
        </div>
      </article>
    </div>`;
  }

  function mountStatements() {
    const statements = window.KNPaymentUsStatements?.list?.() || window.KNPaymentUsStatements?.all?.() || [];
    const pending = statements.filter?.((row) => row.status !== "approved") || [];
    const cards = (pending.length ? pending : [{ id: "stmt-today", company: "ILLUMINATE USA LLC", totalDue: 42900, debitDate: "Sep 4, 2026" }])
      .slice(0, 4)
      .map(
        (row) => `<article class="kn-card agentic-companion-statement">
          <div class="kn-card__header"><div class="kn-card__copy">
            <p class="kn-card__title type-ui-md type-weight-semibold">${escapeHtml(row.company || "Statement")}</p>
            <p class="kn-card__subtitle type-caption-sm">Debit ${escapeHtml(row.debitDate || "today")}</p>
          </div></div>
          <div class="kn-card__body"><p class="type-heading-h6 type-weight-semibold">${escapeHtml(
            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(row.totalDue) || 0)
          )}</p></div>
        </article>`
      )
      .join("");
    return `<div class="agentic-companion-statements">${cards}</div>`;
  }

  function mountDashboard() {
    const summary = window.knSummarizeShipments?.(window.KNShipments || []) || {};
    return `<div class="agentic-companion-dashboard">
      <div class="agentic-companion-dashboard__stats">
        <article class="kn-card kn-card--metric"><div class="kn-card__body"><p class="type-caption-sm">Active shipments</p><p class="type-heading-h4 type-weight-semibold">${escapeHtml(String(summary.shipments || 0))}</p></div></article>
        <article class="kn-card kn-card--metric"><div class="kn-card__body"><p class="type-caption-sm">On hold</p><p class="type-heading-h4 type-weight-semibold">${escapeHtml(String(summary.hold || 0))}</p></div></article>
        <article class="kn-card kn-card--metric"><div class="kn-card__body"><p class="type-caption-sm">Delayed</p><p class="type-heading-h4 type-weight-semibold">${escapeHtml(String(summary.delayed || 0))}</p></div></article>
      </div>
      <div class="map-stage agentic-companion-dashboard__map">
        <div class="shipment-map" id="agentic-companion-map" role="region" aria-label="Dashboard shipment map"></div>
      </div>
    </div>`;
  }

  function insightAiMark(size = 14) {
    return (
      window.KNAssistCore?.aiMarkHtml?.({ size, suggest: true, className: "ai-msg__context-insight-mark" }) ||
      `<svg class="klear-assistant-mark ai-suggest-mark ai-msg__context-insight-mark" viewBox="0 0 24 24" width="${size}" height="${size}" focusable="false" aria-hidden="true"><use href="#klear-assist-ray"></use></svg>`
    );
  }

  function insightNoticeIcon() {
    const stroke =
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg ${stroke}><path d="M10.3 5.2 3.2 17.5A2 2 0 0 0 4.9 20.5h14.2a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/></svg>`;
  }

  function buildInsightFacts(ctx) {
    const facts = [];
    if (ctx.kind === "queue") {
      const rows = (window.KNUsEntry?.list?.() || []).slice(0, 3);
      rows.forEach((row) => {
        facts.push({
          key: row.entryNumber || row.transactionId || "Entry",
          value: row.entrySummary || row.statusChip || "In progress"
        });
      });
      if (!facts.length) {
        facts.push({ key: "Queue", value: "No entries in queue right now." });
      }
    } else if (ctx.kind === "entry") {
      const entryNumber = ctx.entryNumber || "74-8823019";
      const row = ctx.row || resolveEntryRow(entryNumber);
      const api = window.KNEntryStatusDetail;
      const messages = api?.buildStatusMessages?.({ row: row || { id: "entry-1" }, findings: [] }) || [];
      const holdMessage = messages.find((msg) => msg.type === "error");
      facts.push({ key: entryNumber, value: row?.companyName || "ILLUMINATE USA LLC" });
      facts.push({
        key: "Status",
        value: holdMessage?.rawCode ? `${holdMessage.rawCode} hold active` : "ACE status available"
      });
    } else if (ctx.kind === "isf") {
      const isf = window.KNUsIsf?.list?.() || [];
      const pending = isf.filter((row) => row.statusChip === "pending");
      facts.push({
        key: "Pending",
        value: `${pending.length} submission${pending.length === 1 ? "" : "s"} on your desk`
      });
      pending.slice(0, 2).forEach((row) => {
        facts.push({
          key: row.transactionId || "ISF",
          value: `${row.vesselName || "Vessel TBD"} · ETD ${row.etd || "—"}`
        });
      });
      if (facts.length <= 1 && !pending.length) {
        facts.push({ key: "Queue", value: "No pending ISF filings in queue." });
      }
    } else if (ctx.kind === "visibility") {
      const rows = filterShipments(ctx.filter).slice(0, 2);
      rows.forEach((row) => {
        facts.push({
          key: row.id || "Shipment",
          value: `${row.status || "In transit"} · ${row.origin?.city || "—"} → ${row.dest?.city || "—"}`
        });
      });
      const total = filterShipments(ctx.filter).length;
      if (total > 2) {
        facts.push({
          key: "More",
          value: `${total - 2} shipment${total - 2 === 1 ? "" : "s"} in this view`
        });
      }
      if (!facts.length) {
        facts.push({ key: "Shipments", value: "No shipments match this filter." });
      }
    } else if (ctx.kind === "statements") {
      const statements = window.KNPaymentUsStatements?.list?.() || window.KNPaymentUsStatements?.all?.() || [];
      const pending = (statements.filter?.((row) => row.status !== "approved") || []).slice(0, 2);
      const fallback = [{ company: "ILLUMINATE USA LLC", totalDue: 42900, debitDate: "Sep 4, 2026" }];
      (pending.length ? pending : fallback).forEach((row) => {
        facts.push({
          key: row.company || "Statement",
          value: `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(row.totalDue) || 0)} due ${row.debitDate || "today"}`
        });
      });
    } else if (ctx.kind === "dashboard") {
      const summary = window.knSummarizeShipments?.(window.KNShipments || []) || {};
      facts.push({ key: "Active shipments", value: String(summary.shipments || 0) });
      facts.push({ key: "Exceptions", value: `${summary.hold || 0} on hold · ${summary.delayed || 0} delayed` });
    }
    return facts.slice(0, 3);
  }

  function buildInsightHtml(ctx) {
    if (!ctx || ctx.kind === "empty") {
      return "";
    }

    const facts = buildInsightFacts(ctx);
    if (!facts.length) {
      return "";
    }

    const title = ctx.title || "Related view";
    const subtitle = ctx.subtitle || "";
    const factsHtml = `<dl class="info-group ai-msg__context-insight-facts">${facts
      .map(
        (fact) =>
          `<div class="info-item"><span class="info-item__key type-caption-sm">${escapeHtml(fact.key)}</span><span class="info-item__value type-ui-sm type-weight-semibold">${escapeHtml(fact.value)}</span></div>`
      )
      .join("")}</dl>`;
    const cause = ctx.cause
      ? `<div class="kn-alert kn-alert--notice kn-alert--subtle kn-alert--full ai-msg__context-insight-cause" role="status" aria-live="polite"><span class="kn-alert__icon" aria-hidden="true">${insightNoticeIcon()}</span><div class="kn-alert__content"><p class="kn-alert__desc type-caption-sm">${escapeHtml(ctx.cause)}</p></div></div>`
      : "";

    return `<aside class="ai-msg__context-insight kn-card" role="complementary" aria-label="Context insight">
      <header class="kn-card__header ai-msg__context-insight-chrome">
        <div class="kn-card__leading">
          ${insightAiMark(14)}
          <p class="ai-msg__context-insight-eyebrow type-caption-sm type-weight-medium">Context insight</p>
        </div>
      </header>
      <div class="kn-card__body">
        <div class="kn-card__copy">
          <p class="kn-card__title type-ui-sm type-weight-semibold">${escapeHtml(title)}</p>
          ${subtitle ? `<p class="kn-card__subtitle type-caption-sm">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        ${cause}
        ${factsHtml}
      </div>
      <footer class="kn-card__footer">
        <button type="button" class="kn-link type-ui-sm ai-msg__context-insight-toggle" data-agentic-companion-toggle>Open ${escapeHtml(title)}</button>
      </footer>
    </aside>`;
  }

  function mountBody(ctx) {
    switch (ctx.kind) {
      case "visibility":
        return mountVisibility(ctx);
      case "queue":
        return mountQueue();
      case "entry":
        return mountEntry(ctx);
      case "statements":
        return mountStatements();
      case "dashboard":
        return mountDashboard();
      case "isf":
        return `<div class="kn-empty kn-empty--section"><div class="kn-empty__copy"><p class="kn-empty__title type-ui-md type-weight-semibold">ISF filings</p><p class="kn-empty__desc type-body-sm">Open the ISF list to review pending and at-risk filings.</p></div><div class="kn-empty__actions"><a class="btn btn--secondary btn--sm kn-btn type-ui-sm" href="#transaction-us-isf">Open ISF</a></div></div>`;
      default:
        return `<div class="kn-empty kn-empty--section"><div class="kn-empty__copy"><p class="kn-empty__title type-ui-md type-weight-semibold">No related view yet</p><p class="kn-empty__desc type-body-sm">Ask about shipments, entries on hold, your queue, or today's statements — then open this panel again.</p></div></div>`;
    }
  }

  function syncToggleLabel(ctx) {
    const btn = toggleBtn();
    if (!btn) {
      return;
    }
    const label = ctx?.title ? `Open ${ctx.title} panel` : "Open related panel";
    btn.setAttribute("aria-label", open ? `Close ${ctx?.title || "related"} panel` : label);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.classList.toggle("is-active", open);
  }

  function mount(ctx) {
    lastContext = ctx;
    const panel = panelEl();
    const body = bodyEl();
    if (!panel || !body) {
      return;
    }
    destroyCompanionMap();
    if (titleEl()) {
      titleEl().textContent = ctx.title || "Related view";
    }
    if (subtitleEl()) {
      subtitleEl().textContent = ctx.subtitle || "";
    }
    if (openLinkEl()) {
      if (ctx.href) {
        openLinkEl().href = ctx.href;
        openLinkEl().hidden = false;
        openLinkEl().setAttribute("aria-label", `Open ${ctx.title || "full page"}`);
      } else {
        openLinkEl().hidden = true;
      }
    }
    body.innerHTML = mountBody(ctx);
    if (ctx.kind === "visibility" || ctx.kind === "dashboard") {
      renderCompanionMap(filterShipments(ctx.filter));
    }
    syncToggleLabel(ctx);
  }

  function setOpen(next) {
    open = Boolean(next);
    const thread = rootEl();
    const panel = panelEl();
    if (thread) {
      thread.classList.toggle("is-companion-open", open);
    }
    if (panel) {
      panel.hidden = !open;
    }
    syncToggleLabel(lastContext || { title: "Related view" });
    if (open) {
      window.requestAnimationFrame(() => {
        if (lastContext?.kind === "visibility" || lastContext?.kind === "dashboard") {
          renderCompanionMap(filterShipments(lastContext.filter));
        } else {
          companionMap?.invalidateSize();
        }
      });
    } else {
      destroyCompanionMap();
    }
  }

  function sync({ thread } = {}) {
    const ctx = resolveContext(thread || {});
    mount(ctx);
    return ctx;
  }

  function toggle({ thread, force } = {}) {
    const ctx = sync({ thread });
    if (typeof force === "boolean") {
      setOpen(force);
      return ctx;
    }
    setOpen(!open);
    return ctx;
  }

  function close() {
    setOpen(false);
  }

  window.KNAgenticCompanion = Object.freeze({
    resolve: resolveContext,
    buildInsightHtml,
    sync,
    toggle,
    close,
    isOpen: () => open
  });
})();
