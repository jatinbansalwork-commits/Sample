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
    payment:
      '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.25"/><path d="M3 10h18"/>',
    einvoices:
      '<path d="M7 3.5h8.5L20 8v12.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M15.5 3.5V8H20"/><path d="M9 12h6M9 15.5h4"/>',
    notification:
      '<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 20a2 2 0 0 1-3.46 0"/>'
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
      route: "#agentic-broker",
      l2PanelId: "sidenav-level-agentic-broker",
      agentShell: true
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
        { id: "role-management", label: "Role Management", route: "#kn-role-management" },
        { id: "user-management", label: "User Management", route: "#kn-user-management" },
        { id: "contract-management", label: "Contract Management", route: "#contract-management" }
      ]
    },
    {
      id: "entity",
      label: "Entity Management",
      icon: "entity",
      route: "#kn-customers",
      l2PanelId: "sidenav-level-entity",
      children: [
        { id: "customer-profile", label: "KN Customers", route: "#kn-customers" },
        { id: "companies-profile", label: "Broker Association", route: "#broker-association" }
      ]
    },
    {
      id: "master-data",
      label: "Master Data Management",
      icon: "master-data",
      route: "#notification-table",
      l2PanelId: "sidenav-level-master-data",
      children: [{ id: "notification-table", label: "Notification Table", route: "#notification-table" }]
    },
    {
      id: "finance",
      label: "Finance Management",
      icon: "finance",
      route: "#kn-credits-management",
      l2PanelId: "sidenav-level-finance",
      children: [
        { id: "credit-tracking", label: "KN Credits Management", route: "#kn-credits-management" },
        { id: "credit-purchase", label: "KN Promo Code Management", route: "#kn-promo-code-management" }
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
          l3PanelId: "sidenav-l3-billing-ar",
          children: [
            { id: "ar-invoices", label: "Invoices", route: "#billing-ar-invoices" },
            { id: "ar-charge-list", label: "Charge List", route: "#billing-ar-charge-list" },
            { id: "ar-overview", label: "Overview", route: "#billing-ar-overview" }
          ]
        },
        {
          id: "billing-ap",
          label: "AP",
          route: "#billing-ap",
          l3PanelId: "sidenav-l3-billing-ap",
          children: [
            { id: "ap-invoices", label: "Invoices", route: "#billing-ap-invoices" },
            { id: "ap-charge-list", label: "Charge List", route: "#billing-ap-charge-list" },
            { id: "ap-overview", label: "Overview", route: "#billing-ap-overview" }
          ]
        },
        {
          id: "billing-broker-invoice",
          label: "Broker Invoice",
          route: "#billing-broker-invoice",
          l3PanelId: "sidenav-l3-billing-broker",
          children: [
            { id: "broker-invoice-us", label: "US", route: "#billing-broker-invoice-us" },
            { id: "broker-invoice-ca", label: "CA", route: "#billing-broker-invoice-ca" }
          ]
        },
        { id: "invoices-360", label: "360 Invoices", route: "#billing-360-invoices", leaf: true }
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
        { id: "klearhub-overview", label: "By mode", route: "#klearhub-overview", leaf: true },
        {
          id: "klearhub-visibility",
          label: "Visibility",
          route: "#klearhub-visibility",
          l3PanelId: "sidenav-l3-klearhub-visibility",
          children: [
            { id: "visibility-engine", label: "Engine", route: "#klearhub-visibility-engine" },
            { id: "visibility-360", label: "360", route: "#klearhub-visibility" }
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
          l3PanelId: "sidenav-l3-transaction-gb",
          children: [{ id: "export-uk", label: "Exports", route: "#transaction-gb-exports" }]
        },
        {
          id: "txn-nl",
          label: "NL",
          route: "#transaction-nl",
          l3PanelId: "sidenav-l3-transaction-nl",
          children: [
            { id: "import-nl", label: "Imports", route: "#transaction-nl-imports" },
            { id: "export-nl", label: "Exports", route: "#transaction-nl-exports" }
          ]
        },
        {
          id: "txn-es",
          label: "ES",
          route: "#transaction-es",
          l3PanelId: "sidenav-l3-transaction-es",
          children: [
            { id: "import-es", label: "Imports", route: "#transaction-es-imports" },
            { id: "export-es", label: "Exports", route: "#transaction-es-exports" }
          ]
        },
        {
          id: "txn-us",
          label: "US",
          route: "#transaction-us",
          l3PanelId: "sidenav-l3-transaction-us",
          children: [
            { id: "isf-us", label: "ISF", route: "#transaction-us-isf" },
            { id: "inbond-us", label: "IN Bond", route: "#transaction-us-in-bond" },
            { id: "entry-us", label: "Entry", route: "#transaction-us-entry" },
            { id: "export-us", label: "Export", route: "#transaction-us-export" },
            { id: "psc-us", label: "PSC", route: "#transaction-us-psc" },
            { id: "do-us", label: "Delivery Order", route: "#transaction-us-delivery-order" },
            { id: "shipments-us", label: "Shipments", route: "#transaction-us-shipments" }
          ]
        },
        {
          id: "txn-ca",
          label: "CA",
          route: "#transaction-ca",
          l3PanelId: "sidenav-l3-transaction-ca",
          children: [
            { id: "entry-ca", label: "Entry", route: "#transaction-ca-entry" },
            { id: "do-ca", label: "Delivery Order", route: "#transaction-ca-delivery-order" },
            { id: "lvs-ca", label: "LVS", route: "#transaction-ca-lvs" }
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
      children: [{ id: "drayage-marketplace", label: "Overview", route: "#drayage" }]
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "analytics",
      route: "#analytics-klearhub-dashboard",
      l2PanelId: "sidenav-level-analytics",
      children: [
        { id: "klearhub-dashboard", label: "KlearHub Dashboard", route: "#analytics-klearhub-dashboard" },
        { id: "customs-engine-reports", label: "Customs Engine Reports", route: "#analytics-customs-engine" },
        { id: "klearhub-reports", label: "KlearHub Reports", route: "#analytics-klearhub-reports" },
        { id: "data-engine-reports", label: "Data Engine Reports", route: "#analytics-data-engine" }
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
          l3PanelId: "sidenav-l3-payment-us",
          children: [{ id: "statement-us", label: "Statements", route: "#payment-us-statements" }]
        },
        {
          id: "payment-ca",
          label: "CA",
          route: "#payment-ca",
          l3PanelId: "sidenav-l3-payment-ca",
          children: [{ id: "statement-ca", label: "Statements", route: "#payment-ca-statements" }]
        }
      ]
    },
    {
      id: "einvoices",
      label: "E-Invoices & Documents",
      icon: "einvoices",
      route: "#e-invoices",
      l2PanelId: "sidenav-level-einvoices",
      children: [{ id: "einvoices-docs", label: "Overview", route: "#e-invoices" }]
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
      if (window.KNAssistCore?.aiMarkHtml) {
        return window.KNAssistCore.aiMarkHtml({
          size: 24,
          spin: true,
          className: "klear-assistant-mark klear-assistant-mark--spin"
        });
      }
      return '<svg class="klear-assistant-mark klear-assistant-mark--spin" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true"><use href="#klear-assist-ray" /></svg>';
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
        <span class="side-nav-link__title type-ui-md">${node.label}</span>
      </a>
    </li>`;
  }

  function renderTreeLeaf(node, level) {
    const href = routeFromNode(node);
    const isLeafChevron = level >= 3 || node.leaf;
    return `<li class="side-nav-tree__item">
      <a class="side-nav-link side-nav-tree__row" href="${href}" data-level="${level}" data-module-id="${node.id}">
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
      <a class="${linkClass}" href="${href}" data-level="1"${l2Attr}${ariaCurrent}${expanded}${controls}>
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
