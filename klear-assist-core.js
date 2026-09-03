/**
 * Shared Klear Assist core — context contract, trigger scope, and session key.
 * Full-page shell (agentic-broker.js) and the docked panel (script.js) both
 * consume this. Spark wave stays full-page; ChatInput / message / GenUI CSS
 * is already shared so Spark-pass polish inherits on both surfaces.
 */
(function () {
  "use strict";

  const RENAME_SEEN_KEY = "kn-klear-assist-rename-seen";
  const SHORTCUT_LABEL = "Klear Assist";

  const TXN_ROUTES = [
    { base: "#transaction-us-isf", kind: "isf", noun: "ISF", api: () => window.KNUsIsf, mode: "history" },
    { base: "#transaction-us-entry", kind: "entry", noun: "Entry", api: () => window.KNUsEntry, mode: "filing" },
    { base: "#transaction-us-in-bond", kind: "in-bond", noun: "in-bond filing", api: () => window.KNUsInBond, mode: "history" },
    { base: "#transaction-us-ftz", kind: "ftz", noun: "FTZ filing", api: () => window.KNUsFtz, mode: "history" },
    { base: "#transaction-us-psc", kind: "psc", noun: "PSC", api: () => window.KNUsPsc, mode: "history" },
    { base: "#transaction-us-delivery-order", kind: "delivery-order", noun: "delivery order", api: () => window.KNUsDeliveryOrder, mode: "history" },
    { base: "#transaction-us-shipments", kind: "tm-shipment", noun: "shipment", api: () => window.KNUsShipments, mode: "history" }
  ];

  function hashPath(hash = location.hash) {
    return (hash || "").split("?")[0];
  }

  function hashParams(hash = location.hash) {
    return new URLSearchParams((hash || "").split("?")[1] || "");
  }

  function visDetailId() {
    try {
      if (typeof visState !== "undefined" && visState?.detailId) {
        return String(visState.detailId);
      }
    } catch (_error) {
      /* visState not in this document */
    }
    return hashParams().get("id") || "";
  }

  function parseTxnRecord(path = hashPath()) {
    for (const route of TXN_ROUTES) {
      const re = new RegExp(`^${route.base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(history|filing)/([^/]+)$`);
      const match = path.match(re);
      if (!match) {
        continue;
      }
      return {
        ...route,
        id: decodeURIComponent(match[2]),
        segment: match[1]
      };
    }
    return null;
  }

  function findTxnRow(route) {
    if (!route) {
      return null;
    }
    const rows = [...(route.api()?.list?.() || []), ...(route.api()?.listShipments?.() || [])];
    return rows.find((row) => row.id === route.id) || null;
  }

  function visRow(detailId) {
    const rows = window.KNShipments || [];
    return rows.find((item) => item.id === detailId || item.container === detailId) || null;
  }

  function statementDetailId(path = hashPath()) {
    const match = path.match(/^#payment-(us|ca)-statements\/(?:detail|history)\/([^/]+)$/);
    return match ? { region: match[1], id: decodeURIComponent(match[2]) } : null;
  }

  function isFullPageAssist(path = hashPath()) {
    return path === "#agentic-broker";
  }

  /**
   * Docked panel + record context: only on a single record. Lists, dashboard,
   * admin, billing, analytics, notifications, and full-page Assist are excluded.
   */
  function isTriggerRoute(path = hashPath()) {
    if (isFullPageAssist(path)) {
      return false;
    }
    if (path === "#klearhub-visibility" && visDetailId()) {
      return true;
    }
    if (parseTxnRecord(path)) {
      return true;
    }
    if (statementDetailId(path)) {
      return true;
    }
    return false;
  }

  /**
   * Top-nav pill is visible only on full-page Assist (#agentic-broker).
   * Hidden on dashboard, lists, admin, billing, record pages, and all other routes.
   * The docked panel still only opens on isTriggerRoute() (record pages).
   */
  function isTriggerVisible(path = hashPath()) {
    return isFullPageAssist(path);
  }

  function contextOf(fields) {
    return {
      kind: fields.kind,
      area: fields.area,
      title: fields.title,
      headline: fields.headline,
      summary: fields.summary,
      hint: fields.hint,
      details: fields.details || [],
      prompts: (fields.prompts || []).slice(0, 3),
      manualPath: fields.manualPath,
      facts: fields.facts || {},
      scopeKey: fields.scopeKey
    };
  }

  function txnContext(route) {
    const row = findTxnRow(route);
    const label = row?.transactionId || row?.shipmentId || row?.entryNumber || route.id;
    const looking = `Looking at ${route.noun} ${label}`;
    return contextOf({
      kind: route.kind,
      area: route.noun,
      title: label,
      headline: looking,
      summary: `${looking}. I can explain status, documents, and next steps on this record. I cannot file or edit it from here.`,
      hint: "Ask about status, documents, or what to do next. I cannot change this filing.",
      details: [
        row?.companyName ? `Importer: ${row.companyName}.` : "",
        row?.status || row?.transactionState ? `Status: ${row.status || row.transactionState}.` : "",
        row?.entryNumber ? `Entry: ${row.entryNumber}.` : ""
      ].filter(Boolean),
      prompts: [
        { label: "Current status", prompt: `What is the current status of ${label}?` },
        { label: "What needs action", prompt: `What still needs action on ${label}?` },
        { label: "Where to file", prompt: `Where do I take the next filing step for ${label}?` }
      ],
      manualPath: `Transactions → US → ${route.noun} → ${label}`,
      facts: { recordId: route.id, label, row, route: route.base },
      scopeKey: `${route.base}/${route.segment}/${route.id}`
    });
  }

  function visibilityContext() {
    const detailId = visDetailId();
    if (!detailId) {
      return null;
    }
    const row = visRow(detailId);
    const looking = `Looking at Shipment ${detailId}`;
    return contextOf({
      kind: "visibility-detail",
      area: "Visibility",
      title: detailId,
      headline: looking,
      summary: `${looking}. I can explain the status on this record; I cannot clear holds or edit milestones.`,
      hint: "Ask about status, holds, or where to take action. I cannot update this shipment.",
      details: [
        row?.status ? `Status: ${row.status}.` : "",
        row?.container ? `Container: ${row.container}.` : ""
      ].filter(Boolean),
      prompts: [
        { label: "Current status", prompt: `What is the current status of ${detailId}?` },
        { label: "Why flagged", prompt: "Why would this shipment be flagged in this view?" },
        { label: "Where to take action", prompt: "Where do I go if I need to take action on it?" }
      ],
      manualPath: "KlearHub → Visibility → open shipment",
      facts: { detailId, row },
      scopeKey: `#klearhub-visibility?id=${detailId}`
    });
  }

  function statementContext() {
    const parsed = statementDetailId();
    if (!parsed) {
      return null;
    }
    const looking = `Looking at Statement ${parsed.id}`;
    const region = parsed.region === "ca" ? "Canada" : "US";
    return contextOf({
      kind: "statement-detail",
      area: `${region} Statements`,
      title: parsed.id,
      headline: looking,
      summary: `${looking}. I can explain ACH timing and unpaid lines. I cannot authorize a debit from here.`,
      hint: "Ask about ACH, unpaid lines, or where to pay. I cannot change the statement.",
      details: [`Region: ${region}.`],
      prompts: [
        { label: "ACH timing", prompt: `When does ACH debit ${parsed.id}?` },
        { label: "Unpaid lines", prompt: `What is still unpaid on statement ${parsed.id}?` },
        { label: "Where to pay", prompt: `Where do I pay statement ${parsed.id}?` }
      ],
      manualPath: `Payment → ${region} Statements → ${parsed.id}`,
      facts: { statementId: parsed.id, region: parsed.region },
      scopeKey: `#payment-${parsed.region}-statements/detail/${parsed.id}`
    });
  }

  function getContext() {
    if (!isTriggerRoute()) {
      return null;
    }
    const vis = visibilityContext();
    if (vis) {
      return vis;
    }
    const txn = parseTxnRecord();
    if (txn) {
      return txnContext(txn);
    }
    return statementContext();
  }

  function lookingAtLine(context = getContext()) {
    if (context?.headline) {
      return context.headline;
    }
    if (context?.title) {
      return `Looking at ${context.title}`;
    }
    return "Looking at this record";
  }

  function sessionKey(context = getContext()) {
    return context?.scopeKey || "";
  }

  function shortcutGlyph() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "") || navigator.userAgentData?.platform === "macOS";
    return mac ? "⌘J" : "Ctrl+J";
  }

  function triggerLabel(expanded) {
    return expanded ? "Close Klear Assist" : "Klear Assist";
  }

  function syncTriggerVisibility(shell = document.querySelector(".app-shell")) {
    const on = isTriggerVisible();
    shell?.classList.toggle("ai-assist-trigger-on", on);
    document.querySelectorAll(".ai-assistant-trigger").forEach((trigger) => {
      trigger.hidden = !on;
      trigger.toggleAttribute("inert", !on);
      if (!on) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    return on;
  }

  function isAssistShortcut(event) {
    if (event.key !== "j" && event.key !== "J") {
      return false;
    }
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
      return false;
    }
    return true;
  }

  window.KNAssistCore = {
    RENAME_SEEN_KEY,
    SHORTCUT_LABEL,
    hashPath,
    isTriggerRoute,
    isTriggerVisible,
    isFullPageAssist,
    getContext,
    lookingAtLine,
    sessionKey,
    triggerLabel,
    shortcutGlyph,
    syncTriggerVisibility,
    isAssistShortcut,
    parseTxnRecord,
    nestedListHash(path = hashPath()) {
      for (const route of TXN_ROUTES) {
        if (path.startsWith(`${route.base}/`) || path === route.base) {
          return route.base;
        }
      }
      if (path.startsWith("#kn-role-management")) {
        return "#kn-role-management";
      }
      if (path.startsWith("#kn-user-management")) {
        return "#kn-user-management";
      }
      if (path.startsWith("#default-role-management")) {
        return "#default-role-management";
      }
      return path;
    }
  };
})();
