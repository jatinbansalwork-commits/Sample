/**
 * KlearNow side navigation — data-driven L1/L2/L3 with API sync hook.
 *
 * Tech integration (no URL in API — stable module ids only):
 *   window.KNNavigation.syncFromApi({ items: [...] });
 *   window.KNNavigation.fetchAndSync("/api/v1/navigation");
 *
 * Payload shape matches getCatalog() nodes: { id, label, icon?, route?, children?, badge? }
 * Frontend owns route hashes via internal catalog; backend sends ids + labels only.
 */
(function () {
  "use strict";

  const MOUNT_SELECTOR = "[data-kn-nav-mount]";
  /* Flat single-tone outline at rest — dual-tone (a soft currentColor fill
     alongside the stroke) is applied selectively via CSS instead, only for
     the current/selected row (.side-nav-link[aria-current="page"] .side-nav-link__icon svg,
     styles.css) rather than blanket here. A blanket fill on every icon
     read as busy/noisy across the whole rail; reserving it for "you are
     here" makes it an actual signal. */
  const STROKE =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  /** L1 icon glyphs — design-owned; backend sends icon key, not SVG. */
  const NAV_ICONS = Object.freeze({
    agentic: null,
    dashboard:
      '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    administration:
      '<circle cx="9" cy="8" r="3.25"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="8.5" r="2.25"/><path d="M17.5 13.5a3.6 3.6 0 0 1 3 1.7"/>',
    entity:
      '<rect x="8" y="2.5" width="8" height="5.5" rx="1.25"/><path d="M12 8v3.5M7 11.5h10"/><rect x="2.5" y="16" width="7" height="5.5" rx="1.25"/><rect x="14.5" y="16" width="7" height="5.5" rx="1.25"/><path d="M6 16v-4.5M18 16v-4.5"/>',
    "master-data":
      '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"/>',
    finance:
      '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>',
    billing:
      '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.25"/><path d="M3 10h18"/>',
    klearhub:
      '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-7h6v7"/><path d="M4 20h16"/>',
    transaction:
      '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/>',
    drayage:
      '<path d="M3 16.5V8.75A1.75 1.75 0 0 1 4.75 7H14v9.5"/><path d="M14 10h3.2L20 13.2V16.5h-6"/><circle cx="7" cy="17.5" r="1.75"/><circle cx="17" cy="17.5" r="1.75"/>',
    analytics:
      '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 14l4-4 3 3 6-7"/><path d="M16 6h4v4"/>',
    /* Was a byte-for-byte copy of `billing` above (side nav audit finding)
       — same rounded rect + centered circle + top divider, so the two L1
       modules were visually identical at rest. This is a banknote instead:
       still a rounded rect, but the circle is a watermark with no divider
       line, and the two short vertical ticks (bill guilloche marks) replace
       billing's single horizontal one — a different silhouette, not just a
       different meaning for the same shape. */
    payment:
      '<rect x="2" y="7" width="20" height="10" rx="1.5"/><circle cx="12" cy="12" r="2"/><path d="M5.5 9v6M18.5 9v6"/>',
    einvoices:
      '<path d="M7 3.5h8.5L20 8v12.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M15.5 3.5V8H20"/><path d="M9 12h6M9 15.5h4"/>',
    notification:
      '<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 20a2 2 0 0 1-3.46 0"/>',

    /* L2/L3 glyphs — one per recurring concept below a parent, not one per
       label, so the same icon means the same thing everywhere it appears
       (every "Overview" is "dashboard", …). Country rows use NAV_FLAGS
       below instead of a shared placeholder — see that block's own
       comment for why. */
    invoice:
      '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 11h6M9 14h6"/><path d="M9 17.5h6"/>',
    list: '<circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/><path d="M8.5 6h11M8.5 12h11M8.5 18h7"/>',
    "arrow-export": '<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
    "arrow-import": '<path d="M17 7 7 17"/><path d="M7 9v8h8"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    route:
      '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3H9a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h7"/>',
    tag: '<path d="M12 2h7a1 1 0 0 1 1 1v7a1 1 0 0 1-.3.7l-9 9a1 1 0 0 1-1.4 0l-7-7a1 1 0 0 1 0-1.4l9-9A1 1 0 0 1 12 2z"/><circle cx="16.5" cy="7.5" r="1.15"/>',
    "user-check": '<circle cx="9" cy="8" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M17 11l2 2 4-4"/>',
    users: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M10 20a6 6 0 0 1 12 0"/>',
    "file-text": '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 12.5h6M9 16h6"/>',
    building:
      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    coins: '<circle cx="8" cy="9" r="6"/><circle cx="15" cy="15" r="6"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    "bar-chart": '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    reports:
      '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8.5 17l2-3 2 1.5 2.5-4"/>'
  });

  /* Country flags for the GB/NL/ES/US/CA rows — a real flag reads by its
     actual national colors, so unlike every other icon here these carry
     hardcoded fills rather than inheriting currentColor: a monochrome
     outline can't tell one flag from another, and a flag's colors are a
     fixed physical fact, not something that should invert with the app's
     own light/dark theme (see iconHtml, which renders this set through a
     plain, non-stroke wrapper for exactly that reason). Each shares the
     same 20x14 flag rect (x=2 y=5) so they sit at a consistent size and
     position inside the 24x24 icon slot every other row uses, plus a
     shared hairline border since a mostly-white flag (Spain, the US)
     would otherwise have no visible edge against a light rail background. */
  const FLAG_BORDER = '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="none" stroke="var(--kn-color-border-surface-gray-muted, #d6d9de)"/>';
  const NAV_FLAGS = Object.freeze({
    "flag-gb":
      '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="#00247D"/>' +
      '<path d="M2 5 22 19M22 5 2 19" stroke="#FFFFFF" stroke-width="2.8"/>' +
      '<path d="M2 5 22 19M22 5 2 19" stroke="#CF142B" stroke-width="1.1"/>' +
      '<path d="M12 5v14M2 12h20" stroke="#FFFFFF" stroke-width="4.4"/>' +
      '<path d="M12 5v14M2 12h20" stroke="#CF142B" stroke-width="2"/>' +
      FLAG_BORDER,
    "flag-us":
      '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="#FFFFFF"/>' +
      '<rect x="2" y="5" width="20" height="2" fill="#B22234"/><rect x="2" y="9" width="20" height="2" fill="#B22234"/>' +
      '<rect x="2" y="13" width="20" height="2" fill="#B22234"/><rect x="2" y="17" width="20" height="2" fill="#B22234"/>' +
      '<rect x="2" y="5" width="9" height="8" fill="#3C3B6E"/>' +
      FLAG_BORDER,
    "flag-es":
      '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="#AA151B"/>' +
      '<rect x="2" y="8.5" width="20" height="7" fill="#F1BF00"/>' +
      FLAG_BORDER,
    "flag-nl":
      '<rect x="2" y="5" width="20" height="4.67" fill="#AE1C28"/>' +
      '<rect x="2" y="9.67" width="20" height="4.67" fill="#FFFFFF"/>' +
      '<rect x="2" y="14.33" width="20" height="4.67" fill="#21468B"/>' +
      FLAG_BORDER,
    "flag-ca":
      '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="#FFFFFF"/>' +
      '<rect x="2" y="5" width="5" height="14" fill="#FF0000"/><rect x="17" y="5" width="5" height="14" fill="#FF0000"/>' +
      '<path d="M12 7.5l1 2.2 2.3-.7-1 2 1.8 1.4-2.3.3.1 2-1.9-1.1-1.9 1.1.1-2-2.3-.3 1.8-1.4-1-2 2.3.7z" fill="#FF0000"/>' +
      FLAG_BORDER
  });

  const CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  /**
   * Canonical nav catalog — same shape backend should return in `items`.
   * `id` values align with role-management module / group ids where possible.
   */
  const NAV_CATALOG = [
    {
      id: "agentic-broker",
      label: "Klear Agent",
      icon: "agentic",
      route: "#agentic-broker"
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      route: "#dashboard"
    },
    {
      id: "administration",
      label: "Administration",
      icon: "administration",
      route: "#kn-role-management",
      l2PanelId: "sidenav-level-administration",
      children: [
        { id: "role-management", label: "Role Management", route: "#kn-role-management", icon: "user-check" },
        { id: "user-management", label: "User Management", route: "#kn-user-management", icon: "users" },
        { id: "contract-management", label: "Contract Management", route: "#contract-management", icon: "file-text" }
      ]
    },
    {
      id: "entity",
      label: "Entity Management",
      icon: "entity",
      route: "#kn-customers",
      l2PanelId: "sidenav-level-entity",
      children: [
        { id: "customer-profile", label: "KN Customers", route: "#kn-customers", icon: "building" },
        { id: "companies-profile", label: "Broker Association", route: "#broker-association", icon: "link" }
      ]
    },
    {
      id: "master-data",
      label: "Master Data Management",
      icon: "master-data",
      route: "#notification-table",
      l2PanelId: "sidenav-level-master-data",
      children: [{ id: "notification-table", label: "Notification Table", route: "#notification-table", icon: "notification" }]
    },
    {
      id: "finance",
      label: "Finance Management",
      icon: "finance",
      route: "#kn-credits-management",
      l2PanelId: "sidenav-level-finance",
      children: [
        { id: "credit-tracking", label: "KN Credits Management", route: "#kn-credits-management", icon: "coins" },
        { id: "credit-purchase", label: "KN Promo Code Management", route: "#kn-promo-code-management", icon: "percent" }
      ]
    },
    {
      id: "billing",
      label: "Billing Management",
      icon: "billing",
      route: "#billing-ar-invoices",
      l2PanelId: "sidenav-level-billing",
      tree: true,
      children: [
        {
          id: "billing-ar",
          label: "AR",
          route: "#billing-ar",
          icon: "invoice",
          l3PanelId: "sidenav-l3-billing-ar",
          children: [
            { id: "ar-invoices", label: "Invoices", route: "#billing-ar-invoices", icon: "invoice" },
            { id: "ar-charge-list", label: "Charge List", route: "#billing-ar-charge-list", icon: "list" },
            { id: "ar-overview", label: "Overview", route: "#billing-ar-overview", icon: "dashboard" }
          ]
        },
        {
          id: "billing-ap",
          label: "AP",
          route: "#billing-ap",
          icon: "invoice",
          l3PanelId: "sidenav-l3-billing-ap",
          children: [
            { id: "ap-invoices", label: "Invoices", route: "#billing-ap-invoices", icon: "invoice" },
            { id: "ap-charge-list", label: "Charge List", route: "#billing-ap-charge-list", icon: "list" },
            { id: "ap-overview", label: "Overview", route: "#billing-ap-overview", icon: "dashboard" }
          ]
        },
        {
          id: "billing-broker-invoice",
          label: "Broker Invoice",
          route: "#billing-broker-invoice",
          icon: "invoice",
          l3PanelId: "sidenav-l3-billing-broker",
          children: [
            { id: "broker-invoice-us", label: "US", route: "#billing-broker-invoice-us", icon: "flag-us" },
            { id: "broker-invoice-ca", label: "CA", route: "#billing-broker-invoice-ca", icon: "flag-ca" }
          ]
        },
        { id: "invoices-360", label: "360 Invoices", route: "#billing-360-invoices", leaf: true, icon: "invoice" }
      ]
    },
    {
      id: "klearhub",
      label: "Klearhub",
      icon: "klearhub",
      route: "#klearhub-overview",
      l2PanelId: "sidenav-level-klearhub",
      tree: true,
      children: [
        { id: "klearhub-overview", label: "By mode", route: "#klearhub-overview", leaf: true, icon: "dashboard" },
        {
          id: "klearhub-visibility",
          label: "Visibility",
          route: "#klearhub-visibility",
          icon: "eye",
          l3PanelId: "sidenav-l3-klearhub-visibility",
          children: [
            { id: "visibility-engine", label: "Engine", route: "#klearhub-visibility-engine", icon: "zap" },
            { id: "visibility-360", label: "360", route: "#klearhub-visibility", icon: "dashboard" }
          ]
        }
      ]
    },
    {
      id: "transaction",
      label: "Transaction Manager",
      icon: "transaction",
      route: "#transaction-gb-exports",
      l2PanelId: "sidenav-level-transaction",
      tree: true,
      children: [
        {
          id: "txn-gb",
          label: "GB",
          route: "#transaction-gb",
          icon: "flag-gb",
          l3PanelId: "sidenav-l3-transaction-gb",
          children: [{ id: "export-uk", label: "Exports", route: "#transaction-gb-exports", icon: "arrow-export" }]
        },
        {
          id: "txn-nl",
          label: "NL",
          route: "#transaction-nl",
          icon: "flag-nl",
          l3PanelId: "sidenav-l3-transaction-nl",
          children: [
            { id: "import-nl", label: "Imports", route: "#transaction-nl-imports", icon: "arrow-import" },
            { id: "export-nl", label: "Exports", route: "#transaction-nl-exports", icon: "arrow-export" }
          ]
        },
        {
          id: "txn-es",
          label: "ES",
          route: "#transaction-es",
          icon: "flag-es",
          l3PanelId: "sidenav-l3-transaction-es",
          children: [
            { id: "import-es", label: "Imports", route: "#transaction-es-imports", icon: "arrow-import" },
            { id: "export-es", label: "Exports", route: "#transaction-es-exports", icon: "arrow-export" }
          ]
        },
        {
          id: "txn-us",
          label: "US",
          route: "#transaction-us",
          icon: "flag-us",
          l3PanelId: "sidenav-l3-transaction-us",
          children: [
            { id: "isf-us", label: "ISF", route: "#transaction-us-isf", icon: "shield" },
            { id: "inbond-us", label: "IN Bond", route: "#transaction-us-in-bond", icon: "lock" },
            { id: "entry-us", label: "Entry", route: "#transaction-us-entry", icon: "login" },
            { id: "export-us", label: "Export", route: "#transaction-us-export", icon: "arrow-export" },
            { id: "psc-us", label: "PSC", route: "#transaction-us-psc", icon: "edit" },
            { id: "do-us", label: "Delivery Order", route: "#transaction-us-delivery-order", icon: "package" },
            { id: "shipments-us", label: "Shipments", route: "#transaction-us-shipments", icon: "route" }
          ]
        },
        {
          id: "txn-ca",
          label: "CA",
          route: "#transaction-ca",
          icon: "flag-ca",
          l3PanelId: "sidenav-l3-transaction-ca",
          children: [
            { id: "entry-ca", label: "Entry", route: "#transaction-ca-entry", icon: "login" },
            { id: "do-ca", label: "Delivery Order", route: "#transaction-ca-delivery-order", icon: "package" },
            { id: "lvs-ca", label: "LVS", route: "#transaction-ca-lvs", icon: "tag" }
          ]
        }
      ]
    },
    {
      id: "drayage",
      label: "Drayage",
      icon: "drayage",
      route: "#drayage",
      l2PanelId: "sidenav-level-drayage",
      children: [{ id: "drayage-marketplace", label: "Overview", route: "#drayage", icon: "dashboard" }]
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "analytics",
      route: "#analytics-klearhub-dashboard",
      l2PanelId: "sidenav-level-analytics",
      children: [
        { id: "klearhub-dashboard", label: "KlearHub Dashboard", route: "#analytics-klearhub-dashboard", icon: "bar-chart" },
        { id: "customs-engine-reports", label: "Customs Engine Reports", route: "#analytics-customs-engine", icon: "reports" },
        { id: "klearhub-reports", label: "KlearHub Reports", route: "#analytics-klearhub-reports", icon: "reports" },
        { id: "data-engine-reports", label: "Data Engine Reports", route: "#analytics-data-engine", icon: "reports" }
      ]
    },
    {
      id: "payment",
      label: "Payment",
      icon: "payment",
      route: "#payment-us-statements",
      l2PanelId: "sidenav-level-payment",
      tree: true,
      children: [
        {
          id: "payment-us",
          label: "US",
          route: "#payment-us",
          icon: "flag-us",
          l3PanelId: "sidenav-l3-payment-us",
          children: [{ id: "statement-us", label: "Statements", route: "#payment-us-statements", icon: "invoice" }]
        },
        {
          id: "payment-ca",
          label: "CA",
          route: "#payment-ca",
          icon: "flag-ca",
          l3PanelId: "sidenav-l3-payment-ca",
          children: [{ id: "statement-ca", label: "Statements", route: "#payment-ca-statements", icon: "invoice" }]
        }
      ]
    },
    {
      id: "einvoices",
      label: "E-Invoices & Documents",
      icon: "einvoices",
      route: "#e-invoices",
      l2PanelId: "sidenav-level-einvoices",
      children: [{ id: "einvoices-docs", label: "Overview", route: "#e-invoices", icon: "dashboard" }]
    },
    {
      id: "notification-mgmt",
      label: "Notification Management",
      icon: "notification",
      route: "#notification-management",
      badge: { count: 3, key: "notifications" }
    }
  ];

  let activeCatalog = NAV_CATALOG.slice();
  let initialized = false;

  function chevronHtml() {
    return CHEVRON;
  }

  function iconHtml(name) {
    if (name === "agentic") {
      if (window.KlearAgentCore?.aiMarkHtml) {
        return window.KlearAgentCore.aiMarkHtml({
          size: 24,
          spin: true,
          className: "klear-assistant-mark klear-assistant-mark--spin"
        });
      }
      return '<svg class="klear-assistant-mark klear-assistant-mark--spin" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true"><use href="#klear-agent-ray" /></svg>';
    }
    const flag = NAV_FLAGS[name];
    if (flag) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${flag}</svg>`;
    }
    const paths = NAV_ICONS[name];
    if (!paths) {
      return "";
    }
    return `<svg ${STROKE} aria-hidden="true">${paths}</svg>`;
  }

  function routeFromNode(node) {
    return node.route || (node.id ? `#${node.id}` : "#");
  }

  function currentRouteKey() {
    const raw = document.documentElement.dataset.knRoute || "agentic-broker";
    return raw === "agentic" ? "agentic-broker" : raw;
  }

  function routeMatchesCurrent(route) {
    const key = route.replace(/^#/, "");
    const current = currentRouteKey();
    return current === key || current.startsWith(`${key}/`);
  }

  function badgeHtml(node) {
    const badge = node.badge;
    if (!badge || badge.count == null || Number(badge.count) <= 0) {
      return "";
    }
    const count = Number(badge.count);
    const key = badge.key || node.id;
    const label = badge.label || `${count} items need action`;
    return `<span class="counter hide-when-collapsed kn-counter" data-nav-count="${key}" aria-label="${label}">${count}</span>`;
  }

  function renderFlatL2Link(node) {
    const href = routeFromNode(node);
    return `<li>
      <a class="side-nav-link" href="${href}" data-level="2" data-module-id="${node.id}">
        <span class="side-nav-link__icon" aria-hidden="true">${iconHtml(node.icon)}</span>
        <span class="side-nav-link__title type-ui-md">${node.label}</span>
      </a>
    </li>`;
  }

  function renderTreeLeaf(node, level) {
    const href = routeFromNode(node);
    const isLeafChevron = level >= 3 || node.leaf;
    return `<li class="side-nav-tree__item">
      <a class="side-nav-link side-nav-tree__row" href="${href}" data-level="${level}" data-module-id="${node.id}">
        <span class="side-nav-link__icon" aria-hidden="true">${iconHtml(node.icon)}</span>
        <span class="side-nav-tree__chevron${isLeafChevron ? " side-nav-tree__chevron--leaf" : ""}" aria-hidden="true"></span>
        <span class="side-nav-link__title side-nav-tree__title type-ui-md">${node.label}</span>
      </a>
    </li>`;
  }

  function renderTreeBranch(node, level) {
    const href = routeFromNode(node);
    const panelId = node.l3PanelId || `sidenav-l3-${node.id}`;
    const childLevel = level + 1;
    const inner = (node.children || []).map((child) => {
      if (child.children?.length) {
        return renderTreeBranch(child, childLevel);
      }
      if (child.leaf && childLevel === 2) {
        return renderTreeLeaf(child, 2);
      }
      return renderTreeLeaf(child, childLevel);
    }).join("");
    return `<li class="side-nav-tree__item" data-tree-level="1">
      <a class="side-nav-link side-nav-tree__row" href="${href}" data-level="${level}" data-tree-trigger="true" data-module-id="${node.id}" aria-expanded="false" aria-controls="${panelId}">
        <span class="side-nav-link__icon" aria-hidden="true">${iconHtml(node.icon)}</span>
        <span class="side-nav-tree__chevron" aria-hidden="true">${chevronHtml()}</span>
        <span class="side-nav-link__title side-nav-tree__title type-ui-md">${node.label}</span>
      </a>
      <ul class="side-nav-tree__group" id="${panelId}" hidden>${inner}</ul>
    </li>`;
  }

  function renderL2Panel(node) {
    const children = node.children || [];
    if (!children.length) {
      return "";
    }
    const panelId = node.l2PanelId || `sidenav-level-${node.id}`;
    const treeClass = node.tree ? " side-nav-tree" : "";
    const inner = children.map((child) => {
      if (node.tree) {
        if (child.children?.length) {
          return renderTreeBranch(child, 2);
        }
        return renderTreeLeaf(child, 2);
      }
      return renderFlatL2Link(child);
    }).join("");
    return `<ul class="side-nav-level${treeClass}" id="${panelId}" data-level="2" hidden>${inner}</ul>`;
  }

  function renderL1Item(node) {
    const href = routeFromNode(node);
    const hasChildren = Boolean(node.children?.length) && !node.agentShell;
    const isAgentic = node.id === "agentic-broker";
    const isCurrent = routeMatchesCurrent(href);
    const agenticCurrent = isAgentic && (currentRouteKey() === "agentic-broker" || currentRouteKey().startsWith("agentic-broker/"));
    const ariaCurrent = isCurrent || agenticCurrent ? ' aria-current="page"' : "";
    const linkClass = isAgentic ? "side-nav-link side-nav-link--agentic-broker" : "side-nav-link";
    const panelId = node.l2PanelId || (hasChildren ? `sidenav-level-${node.id}` : "");
    const l2Trigger = hasChildren || node.agentShell;
    const expanded = node.agentShell && agenticCurrent ? ' aria-expanded="true"' : hasChildren ? ' aria-expanded="false"' : "";
    const controls = l2Trigger && panelId ? ` aria-controls="${panelId}"` : "";
    const l2Attr = l2Trigger ? ' data-l2trigger="true"' : "";
    const icon = iconHtml(node.icon);
    const chevron =
      l2Trigger && !node.agentShell
        ? `<span class="side-nav-link__chevron hide-when-collapsed" aria-hidden="true">${chevronHtml()}</span>`
        : "";
    const badge = badgeHtml(node);
    const l2Html = hasChildren ? renderL2Panel(node) : "";

    return `<li class="l1-item-wrapper" data-nav-key="${node.id}" data-module-id="${node.id}">
      <a class="${linkClass}" href="${href}" data-level="1" aria-label="${node.label}"${l2Attr}${ariaCurrent}${expanded}${controls}>
        <span class="side-nav-link__icon" aria-hidden="true">${icon}</span>
        <span class="side-nav-link__title type-ui-md hide-when-collapsed">${node.label}</span>
        ${chevron}
        ${badge}
      </a>
      ${l2Html}
    </li>`;
  }

  function getMount() {
    return document.querySelector(MOUNT_SELECTOR);
  }

  function renderCatalog(items, mount) {
    const el = mount || getMount();
    if (!el) {
      return false;
    }
    el.innerHTML = items.map(renderL1Item).join("");
    return true;
  }

  function mergeCatalogNode(defaultNode, apiNode) {
    const merged = { ...defaultNode, ...apiNode, id: apiNode.id || defaultNode.id };
    if (defaultNode.children && apiNode.children) {
      const childMap = new Map(defaultNode.children.map((c) => [c.id, c]));
      merged.children = apiNode.children.map((apiChild) => {
        const base = childMap.get(apiChild.id);
        return base ? mergeCatalogNode(base, apiChild) : apiChild;
      });
    } else if (apiNode.children) {
      merged.children = apiNode.children;
    }
    if (apiNode.badge) {
      merged.badge = { ...defaultNode.badge, ...apiNode.badge };
    }
    return merged;
  }

  function indexCatalog(nodes, map = new Map()) {
    nodes.forEach((node) => {
      map.set(node.id, node);
      if (node.children) {
        indexCatalog(node.children, map);
      }
    });
    return map;
  }

  function filterCatalogByIds(nodes, allowedSet) {
    return nodes
      .map((node) => {
        if (node.agentShell && allowedSet.has(node.id)) {
          return { ...node };
        }
        const copy = { ...node };
        if (copy.children) {
          copy.children = filterCatalogByIds(copy.children, allowedSet);
        }
        const selfAllowed = allowedSet.has(copy.id);
        const hasChildren = copy.children?.length;
        if (selfAllowed || hasChildren) {
          return copy;
        }
        return null;
      })
      .filter(Boolean);
  }

  function normalizeApiPayload(payload) {
    if (!payload) {
      return { items: NAV_CATALOG.slice() };
    }
    const root = payload.navigation || payload;
    if (Array.isArray(root.items)) {
      return { items: root.items, badges: root.badges || payload.badges };
    }
    if (Array.isArray(root.allowedModuleIds) || Array.isArray(root.allowedIds)) {
      const allowed = new Set(root.allowedModuleIds || root.allowedIds);
      return { items: filterCatalogByIds(NAV_CATALOG, allowed), badges: root.badges || payload.badges };
    }
    if (Array.isArray(payload)) {
      return { items: payload };
    }
    return { items: NAV_CATALOG.slice() };
  }

  function applyBadges(items, badges) {
    if (!badges || typeof badges !== "object") {
      return items;
    }
    const byId = indexCatalog(items);
    Object.entries(badges).forEach(([id, value]) => {
      const node = byId.get(id);
      if (!node) {
        return;
      }
      if (typeof value === "number") {
        node.badge = { ...(node.badge || {}), count: value };
      } else if (value && typeof value === "object") {
        node.badge = { ...(node.badge || {}), ...value };
      }
    });
    return items;
  }

  function enrichFromDefaults(items) {
    const defaults = indexCatalog(NAV_CATALOG);
    return items.map((item) => {
      const base = defaults.get(item.id);
      if (!base) {
        return item;
      }
      return mergeCatalogNode(base, item);
    });
  }

  function dispatchSynced(detail) {
    window.dispatchEvent(new CustomEvent("kn-navigation-synced", { detail: detail || {} }));
  }

  function syncFromApi(payload) {
    const normalized = normalizeApiPayload(payload);
    let items = enrichFromDefaults(normalized.items.slice());
    items = applyBadges(items, normalized.badges);
    activeCatalog = items;
    renderCatalog(items);
    initialized = true;
    dispatchSynced({ items, source: "api" });
    return items;
  }

  function init(options) {
    if (options?.items) {
      return syncFromApi(options);
    }
    if (!initialized) {
      activeCatalog = NAV_CATALOG.slice();
      renderCatalog(activeCatalog);
      initialized = true;
      dispatchSynced({ items: activeCatalog, source: "default" });
    }
    return activeCatalog;
  }

  async function fetchAndSync(url, fetchOptions) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      ...fetchOptions
    });
    if (!response.ok) {
      throw new Error(`Navigation API failed (${response.status})`);
    }
    const payload = await response.json();
    return syncFromApi(payload);
  }

  window.KNNavigation = {
    init,
    syncFromApi,
    fetchAndSync,
    getCatalog: () => activeCatalog.slice(),
    getDefaultCatalog: () => NAV_CATALOG.slice(),
    render: () => renderCatalog(activeCatalog),
    routeForModuleId(moduleId) {
      const node = indexCatalog(activeCatalog).get(moduleId);
      return node ? routeFromNode(node) : null;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }
})();
