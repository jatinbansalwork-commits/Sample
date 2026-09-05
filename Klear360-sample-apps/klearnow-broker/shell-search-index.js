/**
 * Shared shell search index — consumed by Working Queue, Chat History, and ⌘K palette.
 * One corpus, one normalizer, one ranker. Do not duplicate entry/chat matching elsewhere.
 */
(function () {
  "use strict";

  const ENTRY_ALIASES = {
    s1f01000405: "entry-1"
  };

  const CACHE_MS = 4000;
  let cache = null;
  let cacheAt = 0;

  function normalizeQuery(raw = "") {
    return String(raw || "")
      .trim()
      .replace(/^find\s+entry\s+/i, "")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bucketForEntryRow(row) {
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

  function entryRows() {
    return window.KNUsEntry?.list?.() || [];
  }

  function entryRecords() {
    return entryRows().map((row) => {
      const label = row.companyName || row.entryNumber || row.id;
      const bol = row.mbl || row.hbl || row.entryNumber || "—";
      const eta = row.eta || row.fspdDate || "—";
      const mot = row.mot || "Ocean";
      return {
        id: `entry:${row.id}`,
        kind: "entry",
        label,
        subtitle: `Entry · ETA ${eta} · ${mot} · BOL ${bol}`,
        href: `#transaction-us-entry/filing/${encodeURIComponent(row.id)}`,
        entryId: row.id,
        bucket: bucketForEntryRow(row),
        score: 500,
        tokens: [row.id, row.transactionId, row.companyName, row.entryNumber, row.mbl, row.hbl, row.eta, row.fspdDate, row.mot, bol]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      };
    });
  }

  function chatRecords() {
    const entries = window.KNAgenticBroker?.historyEntries?.() || [];
    return entries.map(({ id, entry }) => ({
      id: `chat:${id}`,
      kind: "chat",
      label: entry.title || "Conversation",
      subtitle: entry.question ? String(entry.question).slice(0, 72) : "Conversation",
      chatId: id,
      score: 450,
      tokens: [entry.title, entry.question].filter(Boolean).join(" ").toLowerCase()
    }));
  }

  function moduleRecords() {
    const seen = new Set();
    const out = [];
    document.querySelectorAll(".side-nav-link[href^='#']").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (!href || href === "#" || seen.has(href)) {
        return;
      }
      const label = link.querySelector(".side-nav-link__title")?.textContent?.trim() || "";
      if (!label) {
        return;
      }
      seen.add(href);
      out.push({
        id: `module:${href}`,
        kind: "module",
        label,
        subtitle: "Module",
        href,
        score: 400,
        tokens: label.toLowerCase()
      });
    });
    return out;
  }

  function onEntryFilingRoute() {
    return /^#transaction-us-entry\/filing\/[^/]+/.test(window.KNAssistCore?.hashPath?.() || location.hash);
  }

  function actionRecords() {
    const actions = [
      {
        id: "action:validate-entry",
        kind: "action",
        label: "Run validation on this entry",
        subtitle: "Full entry validation · Utility panel",
        score: 920,
        when: onEntryFilingRoute,
        run: () => window.KNEntryFiling?.runValidationOnEntry?.({ scope: "full" })
      },
      {
        id: "action:view-holds",
        kind: "action",
        label: "View Holds",
        subtitle: "KlearHub Visibility",
        score: 380,
        href: "#klearhub-visibility",
        visOpen: { risk: "hold" }
      },
      {
        id: "action:demurrage",
        kind: "action",
        label: "View demurrage risk",
        subtitle: "Arrived shipments",
        score: 370,
        href: "#klearhub-visibility",
        visOpen: { record: "all", risk: "arrived" }
      },
      {
        id: "action:visibility",
        kind: "action",
        label: "Open Visibility",
        subtitle: "KlearHub shipments",
        score: 360,
        href: "#klearhub-visibility"
      },
      {
        id: "action:vis-search",
        kind: "action",
        label: "Search Visibility",
        subtitle: "Focus shipment search",
        score: 350,
        href: "#klearhub-visibility",
        focus: "#vis-search"
      },
      {
        id: "action:add-user",
        kind: "action",
        label: "Add New User",
        subtitle: "Administration",
        score: 340,
        href: "#kn-user-management",
        userPath: "add"
      },
      {
        id: "action:add-role",
        kind: "action",
        label: "Add New Role",
        subtitle: "Administration",
        score: 335,
        href: "#kn-role-management",
        rolePath: "add"
      },
      {
        id: "action:overview",
        kind: "action",
        label: "By mode",
        subtitle: "KlearHub overview",
        score: 330,
        href: "#klearhub-overview"
      },
      {
        id: "action:shipments",
        kind: "action",
        label: "Shipments",
        subtitle: "KlearHub Visibility",
        score: 325,
        href: "#klearhub-visibility"
      },
      {
        id: "action:klear-agent",
        kind: "action",
        label: "Open Klear Agent",
        subtitle: window.KNAssistCore?.shortcutGlyph?.() || "⌘J",
        score: 310,
        href: "#agentic-broker"
      },
      {
        id: "action:statements",
        kind: "action",
        label: "Statement approval",
        subtitle: "Payment US",
        score: 300,
        href: "#payment-us-statements"
      }
    ];
    return actions.filter((item) => !item.when || item.when());
  }

  function allRecords() {
    const now = Date.now();
    if (cache && now - cacheAt < CACHE_MS) {
      return cache;
    }
    cache = [...entryRecords(), ...chatRecords(), ...moduleRecords(), ...actionRecords()];
    cacheAt = now;
    return cache;
  }

  function rebuild() {
    cache = null;
    return allRecords();
  }

  function resolveEntryAlias(term) {
    const key = term.replace(/[^a-z0-9]/gi, "");
    return ENTRY_ALIASES[key] || "";
  }

  function rankRecord(record, term) {
    if (!term) {
      return record.score || 0;
    }
    const label = String(record.label || "").toLowerCase();
    const tokens = String(record.tokens || label).toLowerCase();
    if (record.kind === "entry" && record.entryId === resolveEntryAlias(term)) {
      return 2000;
    }
    if (label.startsWith(term)) {
      return 1500 + (record.score || 0);
    }
    if (label.includes(term)) {
      return 1200 + (record.score || 0);
    }
    if (tokens.includes(term)) {
      return 900 + (record.score || 0);
    }
    return -1;
  }

  function search(rawQuery, { kinds, limit = 24 } = {}) {
    const term = normalizeQuery(rawQuery);
    const allow = kinds ? new Set(kinds) : null;
    let pool = allRecords().filter((record) => !allow || allow.has(record.kind));
    if (!term) {
      return pool.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
    }
    return pool
      .map((record) => ({ record, rank: rankRecord(record, term) }))
      .filter((row) => row.rank >= 0)
      .sort((a, b) => b.rank - a.rank || (a.record.label || "").localeCompare(b.record.label || ""))
      .slice(0, limit)
      .map((row) => row.record);
  }

  function filterEntries(rawQuery) {
    return search(rawQuery, { kinds: ["entry"], limit: 48 });
  }

  function filterChats(rawQuery) {
    return search(rawQuery, { kinds: ["chat"], limit: 48 });
  }

  function entryIdsMatching(rawQuery) {
    const term = normalizeQuery(rawQuery);
    if (!term) {
      return null;
    }
    const aliasId = resolveEntryAlias(term);
    if (aliasId) {
      return new Set([aliasId]);
    }
    return new Set(filterEntries(rawQuery).map((item) => item.entryId));
  }

  function chatIdsMatching(rawQuery) {
    const term = normalizeQuery(rawQuery);
    if (!term) {
      return null;
    }
    return new Set(filterChats(rawQuery).map((item) => item.chatId));
  }

  window.KNShellSearchIndex = {
    ENTRY_ALIASES,
    normalizeQuery,
    escapeHtml,
    rebuild,
    search,
    filterEntries,
    filterChats,
    entryIdsMatching,
    chatIdsMatching,
    bucketForEntryRow,
    entryRows
  };
})();
