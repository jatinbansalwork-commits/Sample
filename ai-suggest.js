/**
 * Shared AI Suggest & Draft (Phase 2).
 * Suggests and prefills only — never creates/updates/deletes or submits forms.
 */
(() => {
  const AUDIT_KEY = "kn-ai-audit-v1";
  const DRAFT_KEY = "kn-ai-draft-v1";
  const MAX_AUDIT = 200;

  const MESSAGES = {
    reviewOnly: "AI only suggests — review and adjust before saving.",
    noMatch: "No strong matches — try refining your description or search manually.",
    ambiguous: "That description matches a few areas — I listed the strongest suggestions. Review and keep what fits.",
    multiIntent: "I heard more than one goal. Drafting the primary one; ask again for the other.",
    lowConfidence: "Low confidence on this match — treat it as a starting point, not a final assignment.",
    draftReady: "Draft only — Apply prefills the form; it does not save."
  };

  /** KN Role Management permission keyword map */
  const ROLE_PERM_MAP = [
    {
      keywords: ["user", "users", "manage users", "add user", "remove user", "access control", "user management"],
      groupId: "administration",
      moduleId: "user-management",
      reason: "Involves managing user access"
    },
    {
      keywords: ["role", "roles", "permissions", "assign role", "role management"],
      groupId: "administration",
      moduleId: "role-management",
      reason: "Involves managing roles and permissions"
    },
    {
      keywords: ["contract", "contracts", "agreement", "contract management"],
      groupId: "administration",
      moduleId: "contract-management",
      reason: "Involves contract management"
    },
    {
      keywords: ["customer", "customers", "client", "clients", "customer profile", "entity"],
      groupId: "entity",
      moduleId: "customer-profile",
      reason: "Involves customer or entity management"
    },
    {
      keywords: ["sub-customer", "sub customer", "subcustomer", "subsidiary"],
      groupId: "entity",
      moduleId: "sub-customer-profile",
      reason: "Involves sub-customer entities"
    },
    {
      keywords: ["company", "companies", "company profile", "companies profile"],
      groupId: "entity",
      moduleId: "companies-profile",
      reason: "Involves company profiles"
    },
    {
      keywords: ["finance", "credit", "credits", "credit tracking", "financial"],
      groupId: "finance",
      moduleId: "credit-tracking",
      reason: "Involves financial or credit management"
    },
    {
      keywords: ["purchase", "buy credits", "credit purchase"],
      groupId: "finance",
      moduleId: "credit-purchase",
      reason: "Involves purchasing credits"
    },
    {
      keywords: ["invoice", "invoicing", "ar invoice", "billing", "accounts receivable", "ap invoice"],
      groupId: "billing",
      moduleId: "ar-invoices",
      reason: "Involves billing and invoices"
    },
    {
      keywords: ["broker", "broker invoice", "customs broker", "forwarder"],
      groupId: "billing",
      moduleId: "broker-invoice-us",
      reason: "Involves broker invoicing"
    },
    {
      keywords: ["visibility", "shipment visibility", "tracking", "track shipments", "cargo tracking", "klearhub"],
      groupId: "klearhub",
      moduleId: "visibility",
      reason: "Involves shipment visibility data"
    },
    {
      keywords: ["visibility 2", "vis 2.0", "visibility 2.0"],
      groupId: "klearhub",
      moduleId: "visibility-2",
      reason: "Involves Visibility 2.0"
    },
    {
      keywords: ["visibility 360", "vis 360"],
      groupId: "klearhub",
      moduleId: "visibility-360",
      reason: "Involves Visibility 360"
    },
    {
      keywords: ["visibility 3", "vis 3.0", "visibility 3.0"],
      groupId: "klearhub",
      moduleId: "visibility-3",
      reason: "Involves Visibility 3.0"
    },
    {
      keywords: ["overview", "summary", "hub overview"],
      groupId: "klearhub",
      moduleId: "overview",
      reason: "Involves hub overview access"
    },
    {
      keywords: ["analytics", "dashboard", "reporting", "report", "metrics", "klearhub dashboard", "customs engine reports", "data engine reports"],
      groupId: "analytics",
      moduleId: "klearhub-dashboard",
      reason: "Involves analytics and reporting"
    },
    {
      keywords: ["notification", "notify", "alert", "email notification", "notification management"],
      groupId: "notifications",
      moduleId: "notification-management",
      reason: "Involves notification management"
    },
    {
      keywords: ["ops", "operations", "intake", "supervisor", "intake/pp"],
      groupId: "operations",
      moduleId: "intake-pp",
      reason: "Involves operational management"
    },
    {
      keywords: ["customs", "filing", "isf", "import", "export", "transaction", "customs docs", "inbond", "ftz", "entry"],
      groupId: "txn-us",
      moduleId: "isf-us",
      reason: "Involves customs or filing operations"
    },
    {
      keywords: ["drayage", "dray", "marketplace"],
      groupId: "drayage",
      moduleId: "drayage-marketplace",
      reason: "Involves drayage marketplace"
    },
    {
      keywords: ["e-invoice", "einvoice", "documents", "e-invoices"],
      groupId: "einvoices",
      moduleId: "einvoices-docs",
      reason: "Involves e-invoices and documents"
    },
    {
      keywords: ["payment", "statement", "payment us", "payment ca"],
      groupId: "payment-us",
      moduleId: "statement-us",
      reason: "Involves payment statements"
    },
    {
      keywords: ["read-only", "readonly", "read only", "view only", "viewer"],
      groupId: "analytics",
      moduleId: "klearhub-dashboard",
      reason: "Read-only / viewer access implied",
      readOnlyHint: true
    }
  ];

  /** Default Role Management keyword map (permissions + applicable + services) */
  const DROLE_PERM_MAP = [
    {
      keywords: ["user", "users", "manage users", "add user", "access control"],
      groupId: "administration",
      moduleId: "user-management",
      reason: "Involves managing user access",
      applicables: [],
      services: []
    },
    {
      keywords: ["role", "roles", "permissions", "assign role"],
      groupId: "administration",
      moduleId: "role-management",
      reason: "Involves managing roles and permissions",
      applicables: [],
      services: []
    },
    {
      keywords: ["contract", "contracts", "agreement"],
      groupId: "administration",
      moduleId: "contract-management",
      reason: "Involves contract management",
      applicables: ["customer", "company"],
      services: []
    },
    {
      keywords: ["customer", "client", "customer profile", "customer facing"],
      groupId: "entity",
      moduleId: "customer-profile",
      reason: "Involves customer-facing access",
      applicables: ["customer"],
      services: []
    },
    {
      keywords: ["sub-customer", "sub customer", "subcustomer", "subsidiary"],
      groupId: "entity",
      moduleId: "sub-customer-profile",
      reason: "Involves sub-customer entities",
      applicables: ["sub-customer"],
      services: []
    },
    {
      keywords: ["company", "companies", "company profile"],
      groupId: "entity",
      moduleId: "companies-profile",
      reason: "Involves company profiles",
      applicables: ["company"],
      services: []
    },
    {
      keywords: ["party", "parties", "shipper", "consignee"],
      groupId: "entity",
      moduleId: "party-profile",
      reason: "Involves trade parties",
      applicables: ["parties"],
      services: []
    },
    {
      keywords: ["credit", "credits", "finance", "financial", "billing"],
      groupId: "finance",
      moduleId: "credit-tracking",
      reason: "Involves financial credit tracking",
      applicables: ["customer"],
      services: []
    },
    {
      keywords: ["purchase", "buy credits", "credit purchase"],
      groupId: "finance",
      moduleId: "credit-purchase",
      reason: "Involves purchasing credits",
      applicables: ["customer"],
      services: []
    },
    {
      keywords: ["visibility", "shipment visibility", "tracking", "track shipments", "cargo", "klearhub", "visibility 360", "overview"],
      groupId: "visibility",
      moduleId: "visibility",
      reason: "Involves shipment visibility",
      applicables: ["customer", "sub-customer"],
      services: ["klear-360"]
    },
    {
      keywords: ["visibility 2", "vis 2.0", "visibility 2.0"],
      groupId: "visibility",
      moduleId: "visibility-2",
      reason: "Involves Visibility 2.0",
      applicables: ["customer", "sub-customer"],
      services: ["klear-360"]
    },
    {
      keywords: ["analytics", "dashboard", "reporting", "report", "metrics", "klearhub dashboard", "customs engine reports", "data engine reports", "hevo"],
      groupId: "analytics",
      moduleId: "klearnow-dashboards",
      reason: "Involves analytics and reporting",
      applicables: ["customer", "company"],
      services: []
    },
    {
      keywords: ["invoice", "invoicing", "ar invoice", "accounts receivable"],
      groupId: "billing",
      moduleId: "ar-invoices",
      reason: "Involves invoice management",
      applicables: ["customer"],
      services: []
    },
    {
      keywords: ["broker", "customs broker", "broker invoice", "broker filing", "forwarder"],
      groupId: "billing",
      moduleId: "broker-invoice-us",
      reason: "Involves broker invoicing",
      applicables: ["parties", "company"],
      services: ["customs-broker"]
    },
    {
      keywords: ["customs", "filing", "isf", "import", "entry", "customs docs", "customs clearance", "inbond", "ftz"],
      groupId: "txn-us",
      moduleId: "isf-us",
      reason: "Involves US customs filings",
      applicables: ["customer", "company"],
      services: ["customs-broker", "customs-engine"]
    },
    {
      keywords: ["export", "export filing", "exports"],
      groupId: "txn-us",
      moduleId: "export-us",
      reason: "Involves export filings",
      applicables: ["customer", "company"],
      services: ["customs-broker"]
    },
    {
      keywords: ["netherlands", "nl transaction", "dutch"],
      groupId: "txn-nl",
      moduleId: "import-nl",
      reason: "Involves Netherlands transactions",
      applicables: ["customer", "company"],
      services: ["customs-engine"]
    },
    {
      keywords: ["spain", "es transaction", "spanish"],
      groupId: "txn-es",
      moduleId: "import-es",
      reason: "Involves Spain transactions",
      applicables: ["customer", "company"],
      services: ["customs-engine"]
    },
    {
      keywords: ["payment us", "us statement", "payment statement"],
      groupId: "payment-us",
      moduleId: "statement-us",
      reason: "Involves US payment statements",
      applicables: ["customer"],
      services: []
    },
    {
      keywords: ["drayage", "trucking", "inland transport", "dray provider"],
      groupId: "drayage",
      moduleId: "drayage-marketplace",
      reason: "Involves drayage operations",
      applicables: ["customer", "parties"],
      services: ["drayage"]
    },
    {
      keywords: ["notification", "notify", "alert", "email notification", "notification management"],
      groupId: "notifications",
      moduleId: "notifications-system",
      reason: "Involves notification management",
      applicables: [],
      services: []
    },
    {
      keywords: ["master data", "parts library", "customs master", "hts", "ports", "currency", "country table"],
      groupId: "master-data",
      moduleId: "customs-master-hts",
      reason: "Involves master data management",
      applicables: [],
      services: []
    }
  ];

  /** Title/description → catalog role name suggestions */
  const USER_ROLE_MAP = [
    {
      keywords: ["admin", "administrator", "access manager", "user access"],
      roles: ["KN Administrator", "User Access Manager", "Company Admin"],
      reason: "Title implies elevated access administration"
    },
    {
      keywords: ["visibility", "tracking", "shipment", "cargo", "klearhub", "vis 2"],
      roles: ["Vis 2.0", "Klearhub Visibility", "Visibility 3.0 Operator", "Visibility Read Only"],
      reason: "Title relates to shipment visibility"
    },
    {
      keywords: ["read-only", "readonly", "viewer", "analyst"],
      roles: ["Visibility Read Only", "Analytics Viewer", "Party Broker/Forwarder Analytics"],
      reason: "Implies view-only or analytics access"
    },
    {
      keywords: ["isf", "customs", "filing", "compliance", "trade", "psc"],
      roles: ["ISF Filing Specialist", "PSC Module"],
      reason: "Title relates to customs / ISF / PSC"
    },
    {
      keywords: ["finance", "credit", "billing", "controller", "accounts"],
      roles: ["Finance Credits Owner", "Party Broker/Forwarder Finance Admin"],
      reason: "Title relates to finance or credits"
    },
    {
      keywords: ["broker", "forwarder", "party", "heritage", "customs broker"],
      roles: [
        "Party Broker/Forwarder Admin",
        "Party Broker/Forwarder Transaction Manager",
        "Party Broker/Forwarder Finance Admin",
        "Party Broker/Forwarder Analytics"
      ],
      reason: "Title relates to party broker / forwarder services"
    },
    {
      keywords: ["customer", "entity", "account manager", "subcustomer", "sub-customer"],
      roles: ["Customer Entity Admin", "KlearNow CS Subcustomer"],
      reason: "Title relates to customer / sub-customer management"
    },
    {
      keywords: ["canada", "transaction manager", "ca tm"],
      roles: ["CANADA TRANSACTION MANAGER"],
      reason: "Title relates to Canada transaction management"
    },
    {
      keywords: ["company", "hub+", "hub plus"],
      roles: ["Company Admin", "HUB+ COMPANY ADMIN", "HUB+ COMPANY USER"],
      reason: "Title relates to company / HUB+ access"
    },
    {
      keywords: ["content", "publisher", "release notes", "documentation", "einvoice", "e-invoice"],
      roles: ["E-Invoice Publisher"],
      reason: "Title relates to e-invoice publishing"
    },
    {
      keywords: ["notification", "alert", "ops"],
      roles: ["Notification Admin", "Notification Owner", "OPS Hub Reviewer"],
      reason: "Title relates to notifications or ops"
    },
    {
      keywords: ["analytics", "dashboard", "reporting", "data", "parts"],
      roles: ["Analytics Viewer", "Parts", "Party Broker/Forwarder Analytics"],
      reason: "Title relates to analytics, reporting, or parts"
    },
    {
      keywords: ["new hire", "onboard", "junior", "associate"],
      roles: ["Visibility Read Only", "Analytics Viewer", "HUB+ COMPANY USER"],
      reason: "New-hire / junior profiles often start read-only"
    }
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchEntries(text, map) {
    const lower = normalizeText(text);
    if (!lower) {
      return [];
    }
    const hits = [];
    for (const entry of map) {
      const matchedKw = (entry.keywords || []).filter((kw) => lower.includes(kw));
      if (!matchedKw.length) {
        continue;
      }
      const trigger = [...matchedKw].sort((a, b) => b.length - a.length)[0];
      hits.push({
        ...entry,
        matchedKeywords: matchedKw,
        reason: `Matched “${trigger}”`,
        score: matchedKw.reduce((sum, kw) => sum + kw.length, 0)
      });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  function classifyConfidence(matches) {
    if (!matches.length) {
      return { level: "none", noMatch: true, ambiguous: false, multiIntent: false, lowConfidence: false };
    }
    const groups = new Set(matches.map((m) => m.groupId || m.roles?.[0] || m.moduleId).filter(Boolean));
    const top = matches[0]?.score || 0;
    const second = matches[1]?.score || 0;
    const ambiguous = matches.length >= 3 && second >= top * 0.7;
    const multiIntent = groups.size >= 3;
    const lowConfidence = top < 8 && matches.length <= 2;
    return {
      level: multiIntent ? "multi" : ambiguous ? "ambiguous" : lowConfidence ? "low" : "strong",
      noMatch: false,
      ambiguous,
      multiIntent,
      lowConfidence
    };
  }

  function edgeCaseMessage(meta) {
    if (!meta || meta.noMatch) {
      return MESSAGES.noMatch;
    }
    if (meta.multiIntent) {
      return MESSAGES.multiIntent;
    }
    if (meta.ambiguous) {
      return MESSAGES.ambiguous;
    }
    if (meta.lowConfidence) {
      return MESSAGES.lowConfidence;
    }
    return "";
  }

  function defaultKeyOf(moduleId, action) {
    return `${moduleId}:${action}`;
  }

  function derivePermissionSuggestions(description, { map, actions, keyOf } = {}) {
    const keywordMap = map || ROLE_PERM_MAP;
    const act = actions || ["create", "update", "delete", "read"];
    const makeKey = keyOf || defaultKeyOf;
    const matches = matchEntries(description, keywordMap);
    const meta = classifyConfidence(matches);
    const suggestions = new Map();
    const groups = new Set();
    const applicables = new Set();
    const services = new Set();
    const reasonsByField = {};

    const useMatches = meta.multiIntent ? matches.slice(0, 2) : matches;
    for (const entry of useMatches) {
      if (entry.groupId) {
        groups.add(entry.groupId);
      }
      const actionsForEntry = entry.readOnlyHint ? act.filter((a) => a === "read") : act;
      for (const action of actionsForEntry) {
        if (!entry.moduleId) {
          continue;
        }
        const key = makeKey(entry.moduleId, action);
        if (!suggestions.has(key)) {
          suggestions.set(key, entry.reason);
          reasonsByField[`perm:${key}`] = entry.reason;
        }
      }
      (entry.applicables || []).forEach((id) => {
        applicables.add(id);
        if (!reasonsByField[`applicable:${id}`]) {
          reasonsByField[`applicable:${id}`] = entry.reason;
        }
      });
      (entry.services || []).forEach((id) => {
        services.add(id);
        if (!reasonsByField[`service:${id}`]) {
          reasonsByField[`service:${id}`] = entry.reason;
        }
      });
    }

    return {
      suggestions,
      groups,
      applicables: [...applicables],
      services: [...services],
      reasonsByField,
      matches: useMatches,
      ...meta,
      edgeMessage: edgeCaseMessage(meta)
    };
  }

  function deriveRolePermissions(description, opts = {}) {
    return derivePermissionSuggestions(description, { ...opts, map: ROLE_PERM_MAP });
  }

  function deriveDefaultRoleSuggestions(description, opts = {}) {
    return derivePermissionSuggestions(description, { ...opts, map: DROLE_PERM_MAP });
  }

  function deriveUserRoles(description, catalog = []) {
    const matches = matchEntries(description, USER_ROLE_MAP);
    const meta = classifyConfidence(matches);
    const catalogSet = new Set((catalog || []).map(String));
    const byName = new Map();
    const useMatches = meta.multiIntent ? matches.slice(0, 2) : matches;
    for (const entry of useMatches) {
      for (const name of entry.roles || []) {
        if (catalogSet.size && !catalogSet.has(name)) {
          continue;
        }
        if (!byName.has(name)) {
          byName.set(name, {
            name,
            reason: entry.reason,
            score: entry.score
          });
        }
      }
    }
    const roles = [...byName.values()].sort((a, b) => b.score - a.score);
    return {
      roles,
      ...meta,
      noMatch: roles.length === 0 && Boolean(normalizeText(description)),
      edgeMessage: edgeCaseMessage({
        ...meta,
        noMatch: roles.length === 0 && Boolean(normalizeText(description))
      })
    };
  }

  function titleCaseWords(text) {
    return String(text || "")
      .replace(/[^a-z0-9\s-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 6)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  function deriveRoleDraft(question) {
    const text = String(question || "").trim();
    const lower = normalizeText(text);
    const isDefault =
      /\bdefault role\b/.test(lower) || /\btemplate\b/.test(lower) || /\bcustomer\/broker\b/.test(lower);
    const derived = isDefault
      ? deriveDefaultRoleSuggestions(text)
      : deriveRolePermissions(text);
    const readOnly = /\bread[- ]?only\b|\bviewer\b|\bview only\b/.test(lower);
    let nameHint = "";
    const named = text.match(/(?:called|named)\s+["']?([A-Za-z0-9][\w\s-]{1,40})["']?/i);
    if (named) {
      nameHint = named[1].trim();
    } else if (/analytics/.test(lower) && readOnly) {
      nameHint = "Analytics Viewer";
    } else if (/visibility/.test(lower) && readOnly) {
      nameHint = "Visibility Read Only";
    } else if (/new hire|onboard/.test(lower)) {
      nameHint = "New Hire Read Only";
    } else {
      const stripped = lower
        .replace(/\b(draft|create|suggest|make|build|add|a|an|the|role|for|new|hire|please|me)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      nameHint = titleCaseWords(stripped) || (isDefault ? "Customer Default Template" : "Suggested Role");
    }

    const applicable = isDefault
      ? derived.applicables.length
        ? derived.applicables
        : ["customer"]
      : derived.applicables?.length
        ? derived.applicables
        : ["customer"];
    const applicableReason = isDefault
      ? derived.reasonsByField[`applicable:${applicable[0]}`] || "Inferred from description"
      : derived.reasonsByField?.[`applicable:${applicable[0]}`] || "Inferred from description";

    const permSummary = [];
    if (readOnly) {
      permSummary.push("Read-focused permissions (viewer posture)");
    }
    derived.matches.slice(0, 4).forEach((m) => {
      if (m.reason && !permSummary.includes(m.reason)) {
        permSummary.push(m.reason);
      }
    });
    if (!permSummary.length) {
      permSummary.push("Permission set will be filled from the description on the form");
    }

    const permissions = {};
    derived.suggestions.forEach((reason, key) => {
      permissions[key] = reason;
    });

    return {
      type: isDefault ? "default-role" : "role",
      name: nameHint,
      nameReason: "Drafted from your request wording",
      applicable,
      applicableReasons: Object.fromEntries(applicable.map((id) => [id, applicableReason])),
      services: derived.services || [],
      serviceReasons: Object.fromEntries(
        (derived.services || []).map((id) => [id, derived.reasonsByField[`service:${id}`] || "Inferred from description"])
      ),
      permissions,
      permSummary,
      description: text,
      confidence: derived.level,
      edgeMessage: derived.edgeMessage,
      reasoning: derived.edgeMessage || MESSAGES.draftReady
    };
  }

  function deriveUserDraft(question) {
    const text = String(question || "").trim();
    const roleResult = deriveUserRoles(text);
    let title = "";
    const titleMatch = text.match(/(?:title|as a|as an)\s+["']?([A-Za-z][\w\s-]{1,40})["']?/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (/new hire/.test(normalizeText(text))) {
      title = "New Hire";
    }
    return {
      type: "user",
      title,
      titleReason: title ? "Pulled from your draft request" : "",
      roles: roleResult.roles,
      description: text,
      confidence: roleResult.level,
      edgeMessage: roleResult.edgeMessage,
      reasoning: roleResult.edgeMessage || MESSAGES.draftReady
    };
  }

  function permCount(role) {
    return Array.isArray(role?.permissions) ? role.permissions.length : 0;
  }

  function rolesNeedingReview(roles = []) {
    const list = Array.isArray(roles) ? roles : [];
    const items = [];
    const inactive = list.filter((r) => r.active === false);
    inactive.forEach((role) => {
      items.push({
        id: role.id,
        name: role.name,
        reason: "Inactive — confirm whether access should remain assigned",
        kind: "inactive",
        href: `#kn-role-management/edit/${encodeURIComponent(role.id)}`
      });
    });
    const withPerms = list
      .map((role) => ({ role, count: permCount(role) }))
      .sort((a, b) => a.count - b.count);
    const thin = withPerms.filter((row) => row.count > 0 && row.count <= 4).slice(0, 3);
    thin.forEach(({ role, count }) => {
      if (items.some((item) => item.id === role.id)) {
        return;
      }
      items.push({
        id: role.id,
        name: role.name,
        reason: `Low coverage (${count} permission${count === 1 ? "" : "s"}) — review if still adequate`,
        kind: "low-coverage",
        href: `#kn-role-management/edit/${encodeURIComponent(role.id)}`
      });
    });
    const staleCutoff = Date.now() - 1000 * 60 * 60 * 24 * 45;
    list.forEach((role) => {
      const updated = Date.parse(role.updatedAt || "");
      if (!updated || updated > staleCutoff) {
        return;
      }
      if (items.some((item) => item.id === role.id)) {
        return;
      }
      items.push({
        id: role.id,
        name: role.name,
        reason: "Not updated recently — worth a permissions review",
        kind: "stale",
        href: `#kn-role-management/edit/${encodeURIComponent(role.id)}`
      });
    });
    return items.slice(0, 6);
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      /* private mode / quota */
    }
  }

  function logAudit(event) {
    const entry = {
      ts: new Date().toISOString(),
      source: "ai-suggest",
      ...event
    };
    const log = readJson(AUDIT_KEY, []);
    const next = Array.isArray(log) ? log : [];
    next.unshift(entry);
    writeJson(AUDIT_KEY, next.slice(0, MAX_AUDIT));
    return entry;
  }

  function getAuditLog() {
    return readJson(AUDIT_KEY, []);
  }

  function stageDraft(draft) {
    const payload = {
      ...draft,
      stagedAt: new Date().toISOString(),
      id: `draft-${Date.now()}`
    };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (_error) {
      window.__knAiDraft = payload;
    }
    logAudit({
      action: "stage-draft",
      draftType: payload.type,
      field: "draft",
      origin: "ai",
      value: payload.name || payload.title || payload.type
    });
    return payload;
  }

  function peekDraft(type) {
    let payload = null;
    try {
      payload = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
    } catch (_error) {
      payload = window.__knAiDraft || null;
    }
    if (!payload) {
      return null;
    }
    if (type && payload.type !== type) {
      return null;
    }
    return payload;
  }

  function consumeDraft(type) {
    const payload = peekDraft(type);
    if (!payload) {
      return null;
    }
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch (_error) {
      /* ignore */
    }
    window.__knAiDraft = null;
    logAudit({
      action: "consume-draft",
      draftType: payload.type,
      field: "draft",
      origin: "ai",
      value: payload.name || payload.title || payload.type
    });
    return payload;
  }

  function reasonTag(reason, { inline = false } = {}) {
    if (!reason) {
      return "";
    }
    const cls = inline ? "ai-suggest-tag ai-suggest-tag--inline type-caption-sm" : "ai-suggest-tag type-caption-sm";
    return `<span class="${cls}" title="${escapeHtml(reason)}" aria-label="AI suggestion: ${escapeHtml(reason)}">✦ ${escapeHtml(reason)}</span>`;
  }

  function reviewHint(extra = "") {
    return `<p class="type-caption-sm ai-describe-hint ai-suggest-review-hint">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" width="12" height="12"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/></svg>
      ${escapeHtml(MESSAGES.reviewOnly)}${extra ? ` ${escapeHtml(extra)}` : ""}
    </p>`;
  }

  function draftCardHtml(draft) {
    if (!draft) {
      return "";
    }
    const isUser = draft.type === "user";
    const title = isUser ? "Suggested user draft" : draft.type === "default-role" ? "Suggested default role draft" : "Suggested role draft";
    const nameLine = isUser
      ? `<div class="ai-draft-card__row"><span class="ai-draft-card__label">Title</span><span class="ai-draft-card__value">${escapeHtml(draft.title || "—")} ${draft.titleReason ? reasonTag(draft.titleReason, { inline: true }) : ""}</span></div>`
      : `<div class="ai-draft-card__row"><span class="ai-draft-card__label">Name</span><span class="ai-draft-card__value">${escapeHtml(draft.name || "—")} ${reasonTag(draft.nameReason || "Drafted from request", { inline: true })}</span></div>`;
    const applicableLine = isUser
      ? `<div class="ai-draft-card__row"><span class="ai-draft-card__label">Roles</span><span class="ai-draft-card__value">${
          (draft.roles || [])
            .map((r) => `${escapeHtml(r.name)} ${reasonTag(r.reason, { inline: true })}`)
            .join("<br/>") || "—"
        }</span></div>`
      : `<div class="ai-draft-card__row"><span class="ai-draft-card__label">Applicable to</span><span class="ai-draft-card__value">${escapeHtml(
          (draft.applicable || []).join(", ") || "—"
        )} ${reasonTag((draft.applicable || []).map((id) => draft.applicableReasons?.[id]).find(Boolean) || "Inferred", { inline: true })}</span></div>`;
    const permLine = isUser
      ? ""
      : `<div class="ai-draft-card__row"><span class="ai-draft-card__label">Permissions</span><span class="ai-draft-card__value">${escapeHtml(
          (draft.permSummary || []).slice(0, 3).join(" · ") || "—"
        )}</span></div>`;
    const applyLabel = isUser ? "Apply to form" : "Apply to form";
    const createLabel = isUser ? "Create draft" : "Create draft";
    return `<article class="ai-draft-card" data-ai-draft-id="${escapeHtml(draft.id || "")}" data-ai-draft-type="${escapeHtml(draft.type)}">
      <header class="ai-draft-card__head">
        <span class="ai-draft-card__mark" aria-hidden="true">✦</span>
        <div>
          <p class="type-ui-sm type-weight-semibold">${escapeHtml(title)}</p>
          <p class="type-caption-sm ai-draft-card__sub">${escapeHtml(draft.reasoning || MESSAGES.draftReady)}</p>
        </div>
      </header>
      <div class="ai-draft-card__body">
        ${nameLine}
        ${applicableLine}
        ${permLine}
      </div>
      <footer class="ai-draft-card__actions">
        <button type="button" class="btn btn--primary btn--sm type-ui-sm" data-ai-draft-apply="${escapeHtml(draft.type)}">${applyLabel}</button>
        <button type="button" class="btn btn--secondary btn--sm type-ui-sm" data-ai-draft-apply="${escapeHtml(draft.type)}" data-ai-draft-apply-alt="1">${createLabel}</button>
        <button type="button" class="btn btn--tertiary btn--sm type-ui-sm" data-ai-draft-dismiss>Dismiss</button>
      </footer>
    </article>`;
  }

  function reviewChecklistHtml(items) {
    if (!items?.length) {
      return `<p class="type-body-sm">No roles currently look inactive, thin, or stale on this catalog.</p>`;
    }
    return `<div class="ai-review-list" role="list">
      <p class="type-caption-sm ai-suggest-review-hint">${escapeHtml(MESSAGES.reviewOnly)} Opening a role does not change it.</p>
      ${items
        .map(
          (item) => `<a class="ai-review-item" role="listitem" href="${escapeHtml(item.href)}" data-ai-review-open="${escapeHtml(item.id)}">
            <span class="ai-review-item__name type-ui-sm type-weight-semibold">${escapeHtml(item.name)}</span>
            <span class="ai-review-item__reason type-caption-sm">${escapeHtml(item.reason)}</span>
          </a>`
        )
        .join("")}
    </div>`;
  }

  function shipmentCardsHtml(items, selectedId) {
    if (!items?.length) {
      return `<p class="type-body-sm">No shipments matched that query.</p>`;
    }
    return `<div class="ai-shipment-list" role="list">
      ${items
        .map((item, index) => {
          const isSelected = selectedId ? item.id === selectedId : index === 0;
          return `<a class="ai-shipment-card${isSelected ? " is-selected" : ""}" role="listitem" href="${escapeHtml(item.href)}" data-ai-shipment-open="${escapeHtml(item.id)}">
            <span class="ai-shipment-card__row">
              <span class="ai-shipment-card__name type-ui-sm type-weight-semibold">${escapeHtml(item.name)}</span>
              ${isSelected ? `<span class="ai-shipment-card__badge type-caption-sm">✓ Selected</span>` : ""}
            </span>
            <span class="ai-shipment-card__meta type-caption-sm">ETA: ${escapeHtml(item.eta)} · MOT: ${escapeHtml(item.mot)} · BOL: ${escapeHtml(item.bol)}</span>
          </a>`;
        })
        .join("")}
    </div>`;
  }

  function findingsListHtml(findings) {
    if (!findings?.length) {
      return `<p class="type-body-sm">No issues found — this entry passes all available checks.</p>`;
    }
    const critical = findings.filter((item) => item.severity === "critical").length;
    const warnings = findings.length - critical;
    return `<div class="ai-findings-list" role="list">
      <p class="type-caption-sm ai-findings-summary">${findings.length} issue${findings.length === 1 ? "" : "s"} found · ${critical} critical · ${warnings} warning${warnings === 1 ? "" : "s"}</p>
      ${findings
        .map(
          (item) => `<button type="button" class="ai-finding-item ai-finding-item--${escapeHtml(item.severity)}" role="listitem" data-ai-finding-open="${escapeHtml(item.fieldKey || "")}">
            <span class="ai-finding-item__head">
              <span class="ai-finding-item__icon" aria-hidden="true">${item.severity === "critical" ? "❌" : "⚠️"}</span>
              <span class="ai-finding-item__name type-ui-sm type-weight-semibold">${escapeHtml(item.name)}</span>
            </span>
            <span class="ai-finding-item__desc type-caption-sm">${escapeHtml(item.description)}</span>
            <span class="ai-finding-item__path type-caption-sm">${escapeHtml(item.path)} →</span>
          </button>`
        )
        .join("")}
    </div>`;
  }

  function userRoleChipsHtml(suggestions, { selected = [], aiOnly = [] } = {}) {
    const selectedSet = new Set(selected);
    const aiSet = new Set(aiOnly);
    if (!suggestions?.length) {
      return "";
    }
    return `<div class="ai-user-role-suggest" data-ai-user-role-suggest>
      <div class="ai-user-role-suggest__head">
        <p class="type-caption-sm type-weight-medium">AI role suggestions</p>
        ${aiSet.size ? `<button type="button" class="kn-link type-caption-sm" data-ai-user-roles-clear>Clear AI-only</button>` : ""}
      </div>
      ${reviewHint()}
      <div class="ai-user-role-suggest__chips" role="group" aria-label="Suggested roles">
        ${suggestions
          .map((item) => {
            const on = selectedSet.has(item.name);
            const isAi = aiSet.has(item.name);
            return `<button type="button" class="ai-role-chip type-caption-sm${on ? " is-selected" : ""}${isAi ? " is-ai-suggested" : ""}" data-ai-user-role-chip="${escapeHtml(item.name)}" aria-pressed="${on}" title="${escapeHtml(item.reason)}">
              <span class="ai-role-chip__label">✦ ${escapeHtml(item.name)}</span>
              <span class="ai-role-chip__reason">${escapeHtml(item.reason)}</span>
            </button>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  const DRAFT_INTENT =
    /\b(draft|suggest|create|make|build|propose)\b.{0,40}\b(role|user|template|default role)\b|\b(role|user|template)\b.{0,20}\b(draft|suggest)\b/i;
  const REVIEW_INTENT =
    /\b(roles? needing review|stale roles?|inactive roles?|low coverage|which roles? (should|need) (i )?review|review checklist)\b/i;
  const HARD_WRITE_INTENT =
    /\b(delete|remove|deactivate|activate|save|submit|assign to|update the live|publish now)\b/i;

  function detectIntent(question) {
    const q = String(question || "").trim();
    if (!q) {
      return { type: "empty" };
    }
    if (REVIEW_INTENT.test(q)) {
      return { type: "review-roles", question: q };
    }
    if (DRAFT_INTENT.test(q)) {
      const lower = q.toLowerCase();
      const userBias =
        /\b(for a|for an|new user|add user|user titled|job title|engineer|hire)\b/.test(lower) ||
        (/\broles?\b/.test(lower) && /\b(for|user)\b/.test(lower) && !/\b(create|draft|make|build)\s+(a\s+)?(default\s+)?role\b/.test(lower));
      if (/\bdefault role\b|\btemplate\b/.test(lower) && !userBias) {
        return { type: "draft-default-role", question: q };
      }
      if (userBias || (/\buser\b/.test(lower) && !/\b(create|draft|make|build)\s+(a\s+)?role\b/.test(lower))) {
        return { type: "draft-user", question: q };
      }
      return { type: "draft-role", question: q };
    }
    if (HARD_WRITE_INTENT.test(q) && !/\b(where|how do i|how to|what should i|before)\b/i.test(q)) {
      return { type: "action-blocked", question: q };
    }
    return { type: "qa", question: q };
  }

  /**
   * Merge AI picks into current selections without wiping manual ones.
   * Returns { next, aiOnly } — aiOnly is keys newly added (or still owned) by AI.
   */
  function mergeAiSelections(current, suggested, previousAiOnly = []) {
    const base = current instanceof Set ? [...current] : [...(current || [])];
    const baseSet = new Set(base);
    const prevAi = new Set(previousAiOnly || []);
    const out = new Set(base);
    const only = new Set();
    (suggested || []).forEach((id) => {
      if (!baseSet.has(id)) {
        out.add(id);
        only.add(id);
      } else if (prevAi.has(id)) {
        only.add(id);
      }
    });
    return { next: [...out], aiOnly: [...only] };
  }

  function clearAiOnly(current, aiOnly) {
    const drop = new Set(aiOnly || []);
    const base = current instanceof Set ? [...current] : [...(current || [])];
    return base.filter((id) => !drop.has(id));
  }

  /**
   * Apply a Describe suggestion layer without claiming ownership of keys already selected.
   * Strips previousAiOnly first so a new Describe replaces the prior AI layer.
   * Returns { permissions, baseline } — call finalizeAiPermissionOwnership after ensureWriteImpliesRead.
   */
  function applyAiPermissionLayer({ current, previousAiOnly = [], suggestedKeys = [] } = {}) {
    const prevAi = new Set(previousAiOnly || []);
    const currentList = current instanceof Set ? [...current] : [...(current || [])];
    const baseline = new Set(currentList.filter((key) => !prevAi.has(key)));
    const permissions = new Set(baseline);
    (suggestedKeys || []).forEach((key) => {
      if (key) {
        permissions.add(key);
      }
    });
    return { permissions, baseline };
  }

  /**
   * Mark as AI-owned only keys that were not in baseline (newly added suggestions + auto-Reads).
   */
  function finalizeAiPermissionOwnership({ baseline, permissions, reasonsByKey = {} } = {}) {
    const base = baseline instanceof Set ? baseline : new Set(baseline || []);
    const perms = permissions instanceof Set ? permissions : new Set(permissions || []);
    const aiOnly = [];
    const aiSuggestions = {};
    perms.forEach((key) => {
      if (!base.has(key)) {
        aiOnly.push(key);
        aiSuggestions[key] = reasonsByKey[key] || "Suggested from description";
      }
    });
    return { aiOnly, aiSuggestions };
  }

  function applyDraftNavigation(draft) {
    if (!draft) {
      return;
    }
    stageDraft(draft);
    let target = "#kn-role-management/add";
    if (draft.type === "user") {
      target = "#kn-user-management/add";
    } else if (draft.type === "default-role") {
      target = "#default-role-management/add";
    }
    if (location.hash === target) {
      if (draft.type === "user") {
        window.KNUsers?.sync?.();
      } else if (draft.type === "default-role") {
        window.KNDefaultRoles?.sync?.();
      } else {
        window.KNRoles?.sync?.();
      }
      return;
    }
    location.hash = target;
  }

  window.KNAiSuggest = {
    AUDIT_KEY,
    DRAFT_KEY,
    MESSAGES,
    ROLE_PERM_MAP,
    DROLE_PERM_MAP,
    USER_ROLE_MAP,
    escapeHtml,
    matchEntries,
    classifyConfidence,
    edgeCaseMessage,
    derivePermissionSuggestions,
    deriveRolePermissions,
    deriveDefaultRoleSuggestions,
    deriveUserRoles,
    deriveRoleDraft,
    deriveUserDraft,
    rolesNeedingReview,
    logAudit,
    getAuditLog,
    stageDraft,
    peekDraft,
    consumeDraft,
    reasonTag,
    reviewHint,
    draftCardHtml,
    reviewChecklistHtml,
    shipmentCardsHtml,
    findingsListHtml,
    userRoleChipsHtml,
    detectIntent,
    mergeAiSelections,
    clearAiOnly,
    applyAiPermissionLayer,
    finalizeAiPermissionOwnership,
    applyDraftNavigation
  };

  function registerGenUIWidgets() {
    const pending = (name, renderer) => {
      if (window.KNGenUI?.register) {
        window.KNGenUI.register(name, renderer);
        return;
      }
      window.__knGenUIPending = window.__knGenUIPending || [];
      window.__knGenUIPending.push([name, renderer]);
    };
    const skeleton = () =>
      `<div class="skeleton-stack kn-genui__skeleton" aria-hidden="true"><span class="skeleton skeleton--title" style="width:48%"></span><span class="skeleton skeleton--row"></span><span class="skeleton skeleton--row"></span></div>`;
    pending("KN_DRAFT", (node) => {
      const draft = node?.draft;
      if (!draft || (draft.type == null && !draft.name && !draft.title)) {
        return skeleton();
      }
      try {
        return draftCardHtml(draft);
      } catch (_error) {
        return skeleton();
      }
    });
    pending("KN_REVIEW", (node) => {
      if (!Array.isArray(node?.items)) {
        return skeleton();
      }
      try {
        return reviewChecklistHtml(node.items.filter((item) => item?.id && item?.name));
      } catch (_error) {
        return skeleton();
      }
    });
    pending("KN_SHIPMENTS", (node) => {
      if (!Array.isArray(node?.items)) {
        return skeleton();
      }
      try {
        return shipmentCardsHtml(node.items.filter((item) => item?.id && item?.name), node.selectedId);
      } catch (_error) {
        return skeleton();
      }
    });
    pending("KN_FINDINGS", (node) => {
      if (!Array.isArray(node?.findings)) {
        return skeleton();
      }
      try {
        return findingsListHtml(node.findings);
      } catch (_error) {
        return skeleton();
      }
    });
  }

  registerGenUIWidgets();
})();
