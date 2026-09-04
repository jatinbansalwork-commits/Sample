/**
 * Shared Klear Agent core — context contract, trigger scope, and session key.
 * Full-page shell (agentic-broker.js) and the docked panel (script.js) both
 * consume this. Spark wave stays full-page; ChatInput / message / GenUI CSS
 * is already shared so Spark-pass polish inherits on both surfaces.
 */
(function () {
  "use strict";

  const RENAME_SEEN_KEY = "kn-klear-assist-rename-seen";
  const SHORTCUT_LABEL = "Klear Agent";

  const TXN_ROUTES = [
    { base: "#transaction-us-isf", kind: "isf", noun: "ISF", api: () => window.KNUsIsf, mode: "history" },
    { base: "#transaction-us-entry", kind: "entry", noun: "Entry", api: () => window.KNUsEntry, mode: "filing" },
    { base: "#transaction-us-in-bond", kind: "in-bond", noun: "in-bond filing", api: () => window.KNUsInBond, mode: "history" },
    { base: "#transaction-us-ftz", kind: "ftz", noun: "FTZ filing", api: () => window.KNUsFtz, mode: "history" },
    { base: "#transaction-us-psc", kind: "psc", noun: "PSC", api: () => window.KNUsPsc, mode: "history" },
    { base: "#transaction-us-delivery-order", kind: "delivery-order", noun: "delivery order", api: () => window.KNUsDeliveryOrder, mode: "history" },
    { base: "#transaction-us-shipments", kind: "tm-shipment", noun: "Shipments", api: () => window.KNUsShipments, mode: "history" },
    { base: "#transaction-us-export", kind: "export", noun: "Export", api: () => window.KNUsExport, mode: "history" }
  ];

  function hashPath(hash = location.hash) {
    if (typeof window.getHashPath === "function") {
      return window.getHashPath(hash);
    }
    const raw = (hash || "").split("?")[0];
    if (!raw || raw === "#") {
      const fromPath =
        typeof window.hashFromPathname === "function" ? window.hashFromPathname() : "";
      if (fromPath) {
        return fromPath;
      }
      return "";
    }
    return `#${raw.replace(/^#\/?/, "")}`;
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
    const match = path.match(/^#payment-(us|ca)-statements\/(?:detail|history|approval)\/([^/]+)$/);
    return match ? { region: match[1], id: decodeURIComponent(match[2]) } : null;
  }

  function isFullPageAssist(path = hashPath()) {
    return path === "#agentic-broker";
  }

  function parseTmListRoute(path = hashPath()) {
    return TXN_ROUTES.find((route) => path === route.base) || null;
  }

  function tmListRows(route) {
    const api = route.api?.();
    if (!api) {
      return [];
    }
    const txn = api.list?.() || [];
    const ship = api.listShipments?.() || [];
    return txn.length ? txn : ship;
  }

  function promptItem(fields) {
    return {
      label: fields.label,
      prompt: fields.prompt,
      icon: fields.icon || "",
      action: fields.action || null,
      new: Boolean(fields.new)
    };
  }

  function resolvePromptItem(item, context) {
    if (typeof item === "function") {
      return resolvePromptItem(item(context), context);
    }
    if (!item) {
      return null;
    }
    const label = typeof item.label === "function" ? item.label(context) : item.label;
    const prompt = typeof item.prompt === "function" ? item.prompt(context) : item.prompt;
    if (!label || !prompt) {
      return null;
    }
    return {
      label: String(label).trim(),
      prompt: String(prompt).trim(),
      icon: item.icon || "",
      action: item.action || null,
      new: Boolean(item.new)
    };
  }

  function playbookFor(context) {
    const kind = context?.kind || "";
    const book = PAGE_PLAYBOOKS[kind];
    if (!book) {
      return null;
    }
    if (context.facts?.listView && book.list) {
      return book.list(context);
    }
    if (book.record && (context.facts?.recordId || context.facts?.row || context.facts?.detailId)) {
      return book.record(context);
    }
    if (book.record && /\/(history|filing)\//.test(hashPath())) {
      return book.record(context);
    }
    if (book.page) {
      return book.page(context);
    }
    if (book.list) {
      return book.list(context);
    }
    return book.record || null;
  }

  function smartPrompts(context) {
    const book = playbookFor(context);
    if (!book) {
      return (context?.prompts || []).slice(0, 3);
    }
    const items = []
      .concat(book.primary ? [book.primary] : [])
      .concat(Array.isArray(book.secondary) ? book.secondary : book.secondary ? [book.secondary] : [])
      .map((item) => resolvePromptItem(item, context))
      .filter(Boolean);
    const seen = new Set();
    const deduped = items.filter((item) => {
      const key = `${item.label}|${item.prompt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return deduped.slice(0, 3);
  }

  function enrichContext(context) {
    if (!context) {
      return context;
    }
    const prompts = smartPrompts(context);
    return {
      ...context,
      prompts: prompts.length ? prompts : context.prompts || []
    };
  }

  /** Slim page context for panel → full-page handoff (sessionStorage-safe). */
  function handoffContext(context = {}, route = hashPath()) {
    const facts = context.facts || {};
    const slimRows = Array.isArray(facts.rows)
      ? facts.rows.map((row) => ({
          id: row.id,
          statusChip: row.statusChip,
          entrySummary: row.entrySummary
        }))
      : undefined;
    return {
      title: context.title || "",
      headline: context.headline || "",
      area: context.area || "",
      kind: context.kind || "",
      summary: context.summary || "",
      prompts: context.prompts,
      facts: {
        listView: facts.listView,
        recordId: facts.recordId,
        label: facts.label,
        detailId: facts.detailId,
        row: facts.row,
        rows: slimRows
      },
      route: route || hashPath()
    };
  }

  function runPageAction(action) {
    if (!action || typeof action !== "object") {
      return false;
    }
    if (action.type === "click") {
      const root = action.scope ? document.querySelector(action.scope) : document;
      const el = root?.querySelector?.(action.selector) || document.querySelector(action.selector);
      if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") {
        return false;
      }
      el.click();
      return true;
    }
    if (action.type === "navigate" && action.href) {
      if (location.hash === action.href) {
        return true;
      }
      location.hash = action.href;
      return true;
    }
    return false;
  }

  const PAGE_PLAYBOOKS = {
    entry: {
      list(ctx) {
        const rows = ctx.facts?.rows || [];
        const inProgress = rows.filter((row) => String(row.entrySummary || "").toUpperCase() === "IN PROGRESS").length;
        return {
          primary: promptItem({
            label: "Create manual transaction",
            prompt: "What fields are required to create a manual entry transaction?",
            icon: "nav",
            action: { type: "click", selector: "[data-entry-create]" }
          }),
          secondary: [
            promptItem({
              label: "Active entries",
              prompt: "How many active entries are on this list?",
              icon: "chart"
            }),
            inProgress
              ? promptItem({
                  label: "In progress filings",
                  prompt: "Which entries are still in progress and need action today?",
                  icon: "flag"
                })
              : promptItem({
                  label: "Reject and hold",
                  prompt: "Which entries are on reject or hold?",
                  icon: "flag"
                })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "Current status",
            prompt: `What is the current status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Submit to ACE",
              prompt: "What do I need before submitting this entry to ACE?",
              icon: "tip",
              action: { type: "click", selector: "[data-entry-submit-ace]" }
            }),
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            })
          ]
        };
      }
    },
    isf: {
      list(ctx) {
        const rows = ctx.facts?.rows || [];
        const pending = rows.filter((row) => row.statusChip === "pending");
        return {
          primary: pending.length
            ? promptItem({
                label: `${pending.length} pending ISF filings`,
                prompt: "Which ISF filings are still pending submission?",
                icon: "flag"
              })
            : promptItem({
                label: "ISF Dashboard",
                prompt: "ISF Dashboard",
                icon: "chart"
              }),
          secondary: [
            promptItem({
              label: "24-hour rule",
              prompt: "Which ISF filings are at risk under the 24-hour rule?",
              icon: "tip"
            }),
            promptItem({
              label: "Fin Bill Match",
              prompt: "Which ISF records are waiting on Fin Bill Match?",
              icon: "flag"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "Current status",
            prompt: `What is the current status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Documents needed",
              prompt: `What documents are still needed for ${label}?`,
              icon: "tip"
            }),
            promptItem({
              label: "Next filing step",
              prompt: `Where do I take the next filing step for ${label}?`,
              icon: "nav"
            })
          ]
        };
      }
    },
    "in-bond": {
      list(ctx) {
        return {
          primary: promptItem({
            label: "Pending in-bond filings",
            prompt: "Which in-bond filings still need action on this list?",
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Active transactions",
              prompt: "How many active in-bond transactions are visible?",
              icon: "chart"
            }),
            promptItem({
              label: "Filter by MBL",
              prompt: "How do I find an in-bond filing by master bill number?",
              icon: "tip"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "Current status",
            prompt: `What is the current status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            }),
            promptItem({
              label: "Linked entry",
              prompt: `Is ${label} linked to an entry or ISF I should review?`,
              icon: "nav"
            })
          ]
        };
      }
    },
    ftz: {
      list(ctx) {
        return {
          primary: promptItem({
            label: "FTZ filings in progress",
            prompt: "Which FTZ filings are still in progress on this list?",
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Recent FTZ activity",
              prompt: "Which FTZ records were updated most recently?",
              icon: "chart"
            }),
            promptItem({
              label: "Shipment vs transaction",
              prompt: "When should I use the Shipment tab versus Transaction tab for FTZ?",
              icon: "tip"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "Current status",
            prompt: `What is the current status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            }),
            promptItem({
              label: "Next FTZ step",
              prompt: `Where do I take the next FTZ step for ${label}?`,
              icon: "nav"
            })
          ]
        };
      }
    },
    psc: {
      list(ctx) {
        return {
          primary: promptItem({
            label: "Post Summary Corrections",
            prompt: "Post Summary Corrections",
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "PSC due soon",
              prompt: "Which PSC transactions are due or overdue?",
              icon: "flag"
            }),
            promptItem({
              label: "Active PSC count",
              prompt: "How many active PSC records are on this list?",
              icon: "chart"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "PSC status",
            prompt: `What is the PSC status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Correction type",
              prompt: `What kind of correction applies to ${label}?`,
              icon: "tip"
            }),
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            })
          ]
        };
      }
    },
    "delivery-order": {
      list(ctx) {
        const rows = ctx.facts?.rows || [];
        const inProgress = rows.filter((row) => /progress/i.test(String(row.shipmentState || row.status || ""))).length;
        return {
          primary: promptItem({
            label: inProgress ? "DOs in progress" : "Delivery orders to publish",
            prompt: inProgress
              ? "Which delivery orders are still in progress?"
              : "Which delivery orders still need to be published?",
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Shipment vs transaction",
              prompt: "When should I work delivery orders from the Shipment tab versus Transaction tab?",
              icon: "tip"
            }),
            promptItem({
              label: "Doc generated",
              prompt: "Which delivery orders have documents generated but not published?",
              icon: "chart"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "DO status",
            prompt: `What is the delivery order status for ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Publish readiness",
              prompt: `Is ${label} ready to publish?`,
              icon: "tip"
            }),
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            })
          ]
        };
      }
    },
    "tm-shipment": {
      list(ctx) {
        return {
          primary: promptItem({
            label: "More filters",
            prompt: "What filters are available for US Shipments?",
            icon: "nav",
            action: { type: "click", selector: "[data-tmship-more-filters]" }
          }),
          secondary: [
            promptItem({
              label: "Group view",
              prompt: "How do I set up a shipment group in Group View?",
              icon: "tip",
              action: { type: "click", selector: "[data-tmship-view=\"group\"]" }
            }),
            promptItem({
              label: "Empty list",
              prompt: "Why are there no shipment transactions on this list?",
              icon: "ask"
            })
          ]
        };
      },
      record(ctx) {
        const label = ctx.facts?.label || ctx.title;
        return {
          primary: promptItem({
            label: "Shipment status",
            prompt: `What is the current status of shipment ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Linked transactions",
              prompt: `What transactions are linked to shipment ${label}?`,
              icon: "nav"
            }),
            promptItem({
              label: "What needs action",
              prompt: `What still needs action on ${label}?`,
              icon: "flag"
            })
          ]
        };
      }
    },
    export: {
      list() {
        return {
          primary: promptItem({
            label: "Export workflow",
            prompt: "How does the US Export transaction workflow work on this page?",
            icon: "tip"
          }),
          secondary: [
            promptItem({
              label: "Shipment tab",
              prompt: "What belongs on the Export Shipment tab versus Transaction tab?",
              icon: "ask"
            }),
            promptItem({
              label: "Start an export",
              prompt: "Where do I start a new US export filing?",
              icon: "nav"
            })
          ]
        };
      }
    },
    dashboard: {
      page(ctx) {
        const stats = ctx.facts?.stats || {};
        return {
          primary: promptItem({
            label: "Shipments needing action",
            prompt: "How many shipments currently need action on this dashboard?",
            icon: "flag"
          }),
          secondary: [
            stats.hold
              ? promptItem({
                  label: "View holds",
                  prompt: "Which shipments are on hold in this dashboard view?",
                  icon: "flag",
                  action: { type: "navigate", href: "#klearhub-visibility" }
                })
              : promptItem({
                  label: "Delayed shipments",
                  prompt: "Which shipments are delayed right now?",
                  icon: "flag"
                }),
            promptItem({
              label: "Personal dashboard",
              prompt: "Show my personal dashboard",
              icon: "chart"
            })
          ]
        };
      }
    },
    visibility: {
      page(ctx) {
        const stats = ctx.facts?.stats || {};
        return {
          primary: promptItem({
            label: "Shipments on hold",
            prompt: "Which shipments are on hold in this Visibility view?",
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Hold → document → broker",
              prompt: "For a shipment on hold, what is the linked document and responsible broker?",
              icon: "flag"
            }),
            stats.delayed
              ? promptItem({
                  label: `${stats.delayed} delayed`,
                  prompt: "Which shipments are delayed versus on track?",
                  icon: "chart"
                })
              : promptItem({
                  label: "Arrived containers",
                  prompt: "Where should I look first among containers that have arrived?",
                  icon: "nav"
                })
          ]
        };
      }
    },
    "visibility-detail": {
      record(ctx) {
        const label = ctx.facts?.detailId || ctx.title;
        return {
          primary: promptItem({
            label: "Current status",
            prompt: `What is the current status of ${label}?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Why flagged",
              prompt: "Why would this shipment be flagged in this view?",
              icon: "tip"
            }),
            promptItem({
              label: "Open in Visibility",
              prompt: "Where do I take action on this shipment?",
              icon: "nav"
            })
          ]
        };
      }
    },
    overview: {
      page() {
        return {
          primary: promptItem({
            label: "Ocean vs air volume",
            prompt: "How does ocean volume compare with air on this page?",
            icon: "chart"
          }),
          secondary: [
            promptItem({
              label: "Mode with most delay",
              prompt: "Which mode is carrying the most delay risk?",
              icon: "flag"
            }),
            promptItem({
              label: "Open Visibility",
              prompt: "Where do I drill into shipment-level exceptions?",
              icon: "nav",
              action: { type: "navigate", href: "#klearhub-visibility" }
            })
          ]
        };
      }
    },
    roles: {
      page(ctx) {
        const lowest = ctx.facts?.lowest;
        return {
          primary: promptItem({
            label: "Add KN role",
            prompt: "What should I know before adding a new KN role?",
            icon: "nav",
            action: { type: "click", selector: '[data-role-nav="add"]' }
          }),
          secondary: [
            lowest
              ? promptItem({
                  label: "Lowest coverage",
                  prompt: `Which role has the lowest permission coverage — is it ${lowest.name}?`,
                  icon: "chart"
                })
              : promptItem({
                  label: "Catalog overview",
                  prompt: "Which roles are visible in KN Role Management?",
                  icon: "chart"
                }),
            promptItem({
              label: "Inactive roles",
              prompt: "Which KN roles are inactive on this page?",
              icon: "flag"
            })
          ]
        };
      }
    },
    "role-detail": {
      record(ctx) {
        const role = ctx.facts?.role;
        const name = role?.name || ctx.title;
        return {
          primary: promptItem({
            label: "What this role grants",
            prompt: `What does ${name} actually grant?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Edit role",
              prompt: `What should I review before updating ${name}?`,
              icon: "tip"
            }),
            promptItem({
              label: "Coverage compare",
              prompt: `How does ${name}'s coverage compare with other KN roles?`,
              icon: "compare"
            })
          ]
        };
      }
    },
    "role-add": {
      page() {
        return {
          primary: promptItem({
            label: "Before you save",
            prompt: "What should I know before saving a new KN role?",
            icon: "tip"
          }),
          secondary: [
            promptItem({
              label: "Permission groups",
              prompt: "How do permission groups on this form map to KlearNow modules?",
              icon: "ask"
            }),
            promptItem({
              label: "Easy to miss",
              prompt: "What is easy to miss on this form?",
              icon: "tip"
            })
          ]
        };
      }
    },
    users: {
      page(ctx) {
        const elevated = ctx.facts?.elevatedInactive || [];
        return {
          primary: promptItem({
            label: "Add user",
            prompt: "What should I check before adding a new user?",
            icon: "nav",
            action: { type: "click", selector: '[data-user-nav="add"]' }
          }),
          secondary: [
            elevated.length
              ? promptItem({
                  label: "Elevated while inactive",
                  prompt: "Which users are inactive but still hold elevated access?",
                  icon: "flag"
                })
              : promptItem({
                  label: "Roster split",
                  prompt: "How are KlearNow, customer, and broker users split on this list?",
                  icon: "chart"
                }),
            promptItem({
              label: "Inactive users",
              prompt: "Which users are inactive on this page?",
              icon: "flag"
            })
          ]
        };
      }
    },
    "user-detail": {
      record(ctx) {
        const user = ctx.facts?.user;
        const name = user?.name || ctx.title;
        return {
          primary: promptItem({
            label: "Access held",
            prompt: `What access does ${name} currently hold?`,
            icon: "flag"
          }),
          secondary: [
            promptItem({
              label: "Assigned roles",
              prompt: `Which roles are assigned to ${name}?`,
              icon: "chart"
            }),
            promptItem({
              label: "Before deactivating",
              prompt: `What should I check before deactivating ${name}?`,
              icon: "tip"
            })
          ]
        };
      }
    },
    "user-add": {
      page() {
        return {
          primary: promptItem({
            label: "Before you save",
            prompt: "What should I check before saving a new user?",
            icon: "tip"
          }),
          secondary: [
            promptItem({
              label: "Required fields",
              prompt: "Which fields are required on the Add User form?",
              icon: "ask"
            }),
            promptItem({
              label: "Role assignment",
              prompt: "How should I choose roles for a new user?",
              icon: "tip"
            })
          ]
        };
      }
    },
    defaults: {
      page(ctx) {
        const top = ctx.facts?.top;
        return {
          primary: promptItem({
            label: "Add default role",
            prompt: "What should I check before publishing a default role?",
            icon: "nav",
            action: { type: "click", selector: '[data-drole-nav="add"]' }
          }),
          secondary: [
            top
              ? promptItem({
                  label: "Most inherited",
                  prompt: `Which default role has the most customers inheriting it — is it ${top.name}?`,
                  icon: "chart"
                })
              : promptItem({
                  label: "Inheritance explained",
                  prompt: "What does inheritance mean on this page?",
                  icon: "ask"
                }),
            promptItem({
              label: "Inactive templates",
              prompt: "Are any inactive templates still inherited?",
              icon: "flag"
            })
          ]
        };
      }
    },
    "default-detail": {
      record(ctx) {
        const role = ctx.facts?.role;
        const name = role?.name || ctx.title;
        return {
          primary: promptItem({
            label: "Who inherits this",
            prompt: `How many customers inherit ${name}?`,
            icon: "chart"
          }),
          secondary: [
            promptItem({
              label: "Permission coverage",
              prompt: `What is the permission coverage on ${name}?`,
              icon: "compare"
            }),
            promptItem({
              label: "Services and parties",
              prompt: "Which services and parties does this template apply to?",
              icon: "tip"
            })
          ]
        };
      }
    },
    "default-add": {
      page() {
        return {
          primary: promptItem({
            label: "Before you publish",
            prompt: "What should I check before publishing a default role?",
            icon: "tip"
          }),
          secondary: [
            promptItem({
              label: "Vs KN internal role",
              prompt: "How is this template different from a KN internal role?",
              icon: "compare"
            }),
            promptItem({
              label: "Inheritance meaning",
              prompt: "What does inheritance mean once customers join?",
              icon: "ask"
            })
          ]
        };
      }
    },
    "statement-detail": {
      record(ctx) {
        const id = ctx.facts?.statementId || ctx.title;
        return {
          primary: promptItem({
            label: "ACH timing",
            prompt: `When does ACH debit ${id}?`,
            icon: "tip"
          }),
          secondary: [
            promptItem({
              label: "Unpaid lines",
              prompt: `What is still unpaid on statement ${id}?`,
              icon: "flag"
            }),
            promptItem({
              label: "Where to pay",
              prompt: `Where do I pay statement ${id}?`,
              icon: "nav"
            })
          ]
        };
      }
    },
    "agentic-broker": {
      page() {
        return {
          primary: promptItem({
            label: "Recent entries in my queue",
            prompt: "Recent entries in my queue",
            icon: "chart"
          }),
          secondary: [
            promptItem({
              label: "ISF Dashboard",
              prompt: "ISF Dashboard",
              icon: "flag"
            }),
            promptItem({
              label: "Today's Statements",
              prompt: "Today's Statements",
              icon: "tip"
            })
          ]
        };
      }
    }
  };

  function tmListContext(route) {
    const rows = tmListRows(route);
    const count = rows.length;
    const area = `US ${route.noun}`;
    const details = [`${count.toLocaleString()} record${count === 1 ? "" : "s"} on this list.`];

    if (route.kind === "isf") {
      const pending = rows.filter((row) => row.statusChip === "pending");
      const submitted = rows.filter((row) => row.statusChip === "submitted");
      const finBill = rows.filter((row) => row.statusChip === "finBill");
      if (pending.length || submitted.length || finBill.length) {
        details.push(
          `${pending.length} pending submission, ${submitted.length} submitted${finBill.length ? `, ${finBill.length} Fin Bill Match` : ""}.`
        );
      }
    }

    if (route.kind === "entry") {
      const active = rows.filter((row) => row.statusChip === "active" || row.entrySummary === "IN PROGRESS");
      if (active.length) {
        details.push(`${active.length} active entries in the current filter.`);
      }
    }

    return enrichContext(
      contextOf({
        kind: route.kind,
        area,
        title: area,
        headline: `Looking at ${area} in Transaction Manager`,
        summary: `You're on the **${area}** list in Transaction Manager. I can explain statuses, filters, and next steps on what you see here. I cannot file or edit records from this panel.`,
        hint: "Ask about counts, statuses, or what to do next on this list.",
        details,
        prompts: [],
        manualPath: `Transaction Manager → US → ${route.noun}`,
        facts: { listView: true, rows, count, route: route.base },
        scopeKey: route.base
      })
    );
  }

  /**
   * Docked panel + record context: single-record views (TM filing/history, visibility
   * detail, statement detail). Used for session scoping hints — not panel visibility.
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
   * Routes where the top-nav Klear Agent pill opens the docked panel instead of
   * navigating away — every in-app page except full-page Klear Agent itself.
   */
  function isPanelRoute(path = hashPath()) {
    return !isFullPageAssist(path);
  }

  /**
   * Top-nav pill is visible across the main app (dashboard, lists, record pages, Assist).
   * The docked panel opens on isPanelRoute(); full-page Assist uses #agentic-broker.
   */
  function isTriggerVisible(_path = hashPath()) {
    return true;
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
    return enrichContext(
      contextOf({
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
        prompts: [],
        manualPath: `Transactions → US → ${route.noun} → ${label}`,
        facts: { recordId: route.id, label, row, route: route.base },
        scopeKey: `${route.base}/${route.segment}/${route.id}`
      })
    );
  }

  function visibilityContext() {
    const detailId = visDetailId();
    if (!detailId) {
      return null;
    }
    const row = visRow(detailId);
    const looking = `Looking at Shipment ${detailId}`;
    return enrichContext(
      contextOf({
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
        prompts: [],
        manualPath: "KlearHub → Visibility → open shipment",
        facts: { detailId, row },
        scopeKey: `#klearhub-visibility?id=${detailId}`
      })
    );
  }

  function statementContext() {
    const parsed = statementDetailId();
    if (!parsed) {
      return null;
    }
    const looking = `Looking at Statement ${parsed.id}`;
    const region = parsed.region === "ca" ? "Canada" : "US";
    return enrichContext(
      contextOf({
        kind: "statement-detail",
        area: `${region} Statements`,
        title: parsed.id,
        headline: looking,
        summary: `${looking}. I can explain ACH timing and unpaid lines. I cannot authorize a debit from here.`,
        hint: "Ask about ACH, unpaid lines, or where to pay. I cannot change the statement.",
        details: [`Region: ${region}.`],
        prompts: [],
        manualPath: `Payment → ${region} Statements → ${parsed.id}`,
        facts: { statementId: parsed.id, region: parsed.region },
        scopeKey: `#payment-${parsed.region}-statements/detail/${parsed.id}`
      })
    );
  }

  function getContext() {
    const path = hashPath();
    if (isFullPageAssist(path)) {
      return null;
    }
    const vis = visibilityContext();
    if (vis) {
      return vis;
    }
    const txn = parseTxnRecord(path);
    if (txn) {
      return txnContext(txn);
    }
    const listRoute = parseTmListRoute(path);
    if (listRoute) {
      return tmListContext(listRoute);
    }
    if (!isTriggerRoute(path)) {
      return null;
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
    return context?.scopeKey || hashPath();
  }

  function shortcutGlyph() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "") || navigator.userAgentData?.platform === "macOS";
    return mac ? "⌘J" : "Ctrl+J";
  }

  function triggerLabel(expanded) {
    return expanded ? "Close Klear Agent" : "Klear Agent";
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

  /** GenUI schema for panel expand / empty contextual thread on full-page Assist. */
  function contextConnectionSchema(context = {}, { expanded = false } = {}) {
    const prompts = smartPrompts(context);
    const components = [
      {
        component: "ALERT",
        color: "information",
        title: context.headline || context.title || "Page context",
        description: lookingAtLine(context)
      },
      {
        component: "TEXT",
        content: expanded
          ? "Your side-panel conversation continues here with more room."
          : "Ask about what you see on this page."
      }
    ];
    prompts.slice(0, 3).forEach((item) => {
      if (!item?.label || !item?.prompt) {
        return;
      }
      components.push({
        component: "BUTTON",
        text: item.label,
        action: { type: "prompt", data: { prompt: item.prompt } }
      });
    });
    return { components };
  }

  window.KNAssistCore = {
    RENAME_SEEN_KEY,
    SHORTCUT_LABEL,
    hashPath,
    isTriggerRoute,
    isPanelRoute,
    isTriggerVisible,
    isFullPageAssist,
    getContext,
    enrichContext,
    handoffContext,
    contextConnectionSchema,
    smartPrompts,
    runPageAction,
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
      if (path.startsWith("#payment-us-statements")) {
        return "#payment-us-statements";
      }
      return path;
    }
  };
})();
