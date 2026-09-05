(function () {
  "use strict";

  const ICONS = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    queue:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h5"/></svg>',
    statements:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M8 12h6M8 16h6"/></svg>',
    shipments:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16V6a1 1 0 0 1 1-1h9v11"/><path d="M13 9h4l3 3v4h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    dueToday:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6M19 4l1.5 1.5M4 4 2.5 5.5"/></svg>',
    corrections:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0L4 16v4Z"/><path d="M13.5 6.5l3 3"/></svg>',
    isf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="M9.5 12l1.8 1.8L14.5 10"/></svg>',
  };

  const PROMPT_CARDS = [
    { key: "dashboard", icon: "dashboard", label: "Personal dashboard", kind: "prompt", prompt: "Show my personal dashboard" },
    { key: "queue", icon: "queue", label: "Recent entries in my queue", kind: "prompt", prompt: "Recent entries in my queue" },
    { key: "statements", icon: "statements", label: "Today's statements", kind: "prompt", prompt: "Today's Statements" },
    { key: "hts", icon: "queue", label: "HTS classification", kind: "prompt", prompt: "Classify this product" },
    { key: "catair", icon: "corrections", label: "CATAIR code 398", kind: "prompt", prompt: "CATAIR code 398" },
    { key: "shipments", icon: "shipments", label: "Recent shipments", kind: "prompt", prompt: "Recent shipments in operations" },
    { key: "dueToday", icon: "dueToday", label: "Items due today", kind: "prompt", prompt: "All items due today" },
    { key: "corrections", icon: "corrections", label: "Post summary corrections", kind: "prompt", prompt: "Post Summary Corrections" },
    { key: "isf", icon: "isf", label: "ISF dashboard", kind: "prompt", prompt: "ISF Dashboard" }
  ];

  function promptCardsForPersona() {
    const allowed = window.KNPersona?.getHomePromptKeys?.() || "*";
    if (allowed === "*") {
      return PROMPT_CARDS.slice();
    }
    return PROMPT_CARDS.filter((card) => allowed.includes(card.key));
  }

  // Seeded sidebar chat history — the question a broker asked in a past session,
  // and the KlearAgent answer that was given. Rendered dynamically into
  // Today/Yesterday/This week/etc. groups by daysAgo (see renderChatGroups).
  // Titles are the FULL conversation title — the sidebar row truncates them
  // visually via CSS mask, not by baking "..." into the text.
  const CHAT_HISTORY = {
    "chat-01": {
      title: "ISF filing for Acme Corp shipment",
      question: "File an ISF for the Acme Corp shipment arriving next week.",
      answer:
        "I pulled the Acme Corp shipment (ETA Apr 12) and pre-filled the ISF-10 from the commercial invoice and bill of lading already on file — importer of record, consignee, manufacturer (MID), HTS, and country of origin are all in.\n\nTwo fields need your input:\n- **Container stuffing location**\n- **Consolidator name**\n\nNeither appears in the uploaded documents. Once those are set I can file it — just say the word.",
      daysAgo: 0
    },
    "chat-02": {
      title: "ISF late-filing penalty exposure",
      question: "What's our penalty exposure for the ISF that was filed 6 hours before vessel departure instead of 24?",
      answer:
        "Filing an ISF-10 six hours before departure instead of the required 24-hour window is a **late-filing violation** under 19 CFR 149.6 — CBP's standard mitigated penalty for a first-time late filing is typically **$5,000**, though it can be reduced further if this is the importer's first violation in the past 12 months and the ISF was otherwise complete and accurate.\n\nI don't see a Liquidated Damages notice on this entry yet — CBP doesn't always issue one for a single late filing with no cargo hold. I'd recommend documenting the delay reason now in case a notice does come through.",
      daysAgo: 0
    },
    "chat-03": {
      title: "HTS classification for auto parts",
      question: "What HTS classification applies to stamped steel auto body brackets from Mexico?",
      answer:
        "Stamped steel brackets used as motor vehicle body parts typically classify under **8708.29.5060** (parts and accessories of bodies, other) rather than 7326 (other articles of iron or steel), since the essential character is automotive, not generic metal fabrication.\n\nFrom Mexico, they likely qualify for **USMCA preferential duty** (free) if the regional value content test is met — I'd need the bill of materials to confirm origin. Want me to check the CROSS database for a matching ruling?",
      daysAgo: 1
    },
    "chat-04": {
      title: "CBP hold resolution for entry 74-8823019",
      question: "Why is entry 74-8823019 on CBP hold?",
      answer:
        "Entry 74-8823019 is held under a **PGA (FDA) referral** — the commercial invoice lists a food-contact product, which triggers automatic FDA review regardless of value.\n\nThe hold clears once FDA disposition posts (usually 1-2 business days); no broker action is needed unless FDA requests additional documentation. I'll flag this entry if a Notice of Action comes back.",
      daysAgo: 2
    },
    "chat-05": {
      title: "Duty drawback calculation for Q3 re-exports",
      question: "Calculate the duty drawback available for Q3 re-exported inventory.",
      answer:
        "Based on the Q3 export records matched against the original import entries, **$18,240** in duty is eligible for drawback under 19 USC 1313(j) (unused merchandise drawback) — that's 99% of the $18,424 originally paid, since drawback claims cap at 99%.\n\nI matched 34 of 37 export line items; the remaining 3 need a corrected HTS on the export declaration before they qualify. Want the full match report?",
      daysAgo: 4
    },
    "chat-06": {
      title: "De minimis eligibility for split shipment",
      question: "Can we still claim Section 321 de minimis if this order was split into two packages to stay under $800 each?",
      answer:
        "No — CBP treats **intentional splitting of a single order to stay under the $800 de minimis threshold** as a form of manipulation, and Section 321 (19 USC 1321) explicitly excludes shipments split for the purpose of evading duty. If both packages ship to the same consignee on the same conveyance and were clearly one order, they should be entered together as a single formal or informal entry instead.\n\nI'd flag this to the importer before it's filed as two separate de minimis entries — that's the kind of pattern CBP's automated targeting has gotten much better at catching.",
      daysAgo: 6
    },
    "chat-07": {
      title: "FDA prior notice requirements for seafood",
      question: "What FDA prior notice is required for a seafood shipment from Vietnam?",
      answer:
        "Seafood is FDA-regulated food, so **Prior Notice** must be submitted no less than 2 hours before arrival by vessel (8 hours for rail, 4 hours for truck/air). You'll need the FDA product code, manufacturer/shipper registration number, and country of production.\n\nI don't see a Prior Notice confirmation number on this shipment yet — want me to check if one was filed under a different transaction ID?",
      daysAgo: 8
    },
    "chat-08": {
      title: "Anti-dumping duty review on steel fittings",
      question: "Does this steel pipe fitting shipment fall under an active AD/CVD order?",
      answer:
        "Yes — carbon steel butt-weld pipe fittings from China are covered under **AD order A-570-814** and **CVD order C-570-815**.\n\nThe current combined cash deposit rate is elevated; I'd recommend confirming the exact rate with the ACE deposit rate query before filing, since AD/CVD rates update periodically by administrative review. Want me to pull the latest Federal Register rate notice?",
      daysAgo: 12
    },
    "chat-09": {
      title: "FTZ weekly entry summary report — Zone 281",
      question: "Generate the FTZ weekly entry summary report for Zone 281.",
      answer:
        "Zone 281's weekly summary shows **14 entries filed**, totaling **$412,600** in merchandise value with **$31,840** in estimated duty deferred.\n\nOne entry (FTZ-281-0912) is missing its zone status designation — that needs to be corrected before the weekly consumption entry is filed on Friday. I can flag it to the zone operator now if you'd like.",
      daysAgo: 16
    },
    "chat-10": {
      title: "Broker power of attorney renewal check",
      question: "Is the power of attorney for Heritage Customs LLC still valid for Acme Corp?",
      answer:
        "The POA on file for Acme Corp was executed **March 2023** and has no expiration date, so it remains valid under 19 CFR 141.34 as long as the corporate officer who signed it is still authorized.\n\nI don't see a corporate resolution confirming current signing authority in the file — worth requesting an updated one if it's been over 2 years, which is standard practice even though not strictly required.",
      daysAgo: 20
    },
    "chat-11": {
      title: "Section 232 exclusion status for steel coil",
      question: "Is there an active Section 232 exclusion for this cold-rolled steel coil from South Korea?",
      answer:
        "South Korea ships steel under a **negotiated quota arrangement**, not the standard Section 232 25% tariff — as long as this shipment falls within Korea's product-category quota for cold-rolled coil and the quota hasn't already been exhausted for the period, it should enter duty-free of the Section 232 measure (ordinary duty still applies).\n\nI'd check the current quota fill status before filing — Korean steel quotas have run out mid-period before, at which point the 25% tariff kicks back in for the remainder of the period.",
      daysAgo: 24
    },
    "chat-12": {
      title: "Antidumping cash deposit rate for this exporter",
      question: "What's the current AD cash deposit rate for this exporter under the aluminum extrusions order from China?",
      answer:
        "This exporter isn't on the list of companies with an individually-calculated rate, so the applicable rate is the **China-wide rate**, which is significantly higher than the lowest company-specific rates under this order.\n\nIf the exporter can document that it operates independently of Chinese government control, a **separate rate application** in the next administrative review could get them a lower deposit rate going forward — but that won't help this entry. Want me to pull the current all-others rate from the latest Federal Register notice to confirm the exact figure?",
      daysAgo: 28
    },
    "chat-13": {
      title: "Lacey Act declaration for wood furniture import",
      question: "Does this wood furniture import require a Lacey Act declaration?",
      answer:
        "Yes — wood furniture falls under a Lacey Act-covered HTS heading, so **PPQ Form 505** (Lacey Act declaration) is required at entry. It needs the plant species (scientific name), country of harvest, and quantity.\n\nI only see the commercial invoice's generic \"oak furniture\" description — that won't satisfy the species-level requirement, so I'd flag this for the importer before filing.",
      daysAgo: 32
    },
    "chat-14": {
      title: "Reconciliation entries flagged for Q4 2024",
      question: "Which Q4 2024 entries are flagged for reconciliation?",
      answer:
        "**9 entries** from Q4 2024 are flagged under the open reconciliation blanket for value adjustments — mostly related to a retroactive transfer-pricing true-up. Total estimated additional duty owed is **$6,150**.\n\nThe reconciliation entry is due within 21 months of the underlying entry summary date, so this batch needs to be filed by **June 2026**.",
      daysAgo: 38
    },
    "chat-15": {
      title: "Tariff exclusion request for Chinese-origin component",
      question: "Is there an active Section 301 exclusion for this Chinese-origin component?",
      answer:
        "I checked the current USTR exclusion list — there is **no active exclusion** covering this HTS/product description combination; the most recent exclusion for a similar component expired and was not renewed. Section 301 List 3 duties (25%) apply in addition to normal duty.\n\nIf the importer wants to pursue a new exclusion request, USTR's process typically takes several months and isn't guaranteed.",
      daysAgo: 44
    },
    "chat-16": {
      title: "Customs bond sufficiency check",
      question: "Is the continuous bond sufficient for this importer's current activity?",
      answer:
        "The importer's continuous bond is set at **$50,000**, but trailing 12-month duty, tax, and fee liability is running about **$620,000** — under CBP's standard 10% rule, the bond should be closer to **$62,000**.\n\nI'd recommend requesting a bond increase before the next major entry to avoid a CBP bond-insufficiency hold.",
      daysAgo: 50
    },
    "chat-17": {
      title: "Quarterly duty-savings audit",
      question: "Run a duty-savings audit across all FTA-eligible SKUs for Q1 and flag anything we're not claiming preference on.",
      answer:
        "I cross-referenced 412 line items filed in Q1 against USMCA and other active FTA schedules. **37 line items** ($284,600 in entered value) qualify for preferential treatment under USMCA Annex 4-B but were filed at the standard column-1 rate — an estimated **$19,940 in duty** that's still recoverable, since the 314-day post-summary correction window hasn't closed on any of them.\n\n- **22 line items** — regional value content already documented in the supplier COOs on file; ready to reclassify now\n- **15 line items** — need a signed USMCA certification from the supplier before preference can be claimed\n\nWant me to start the PSCs for the 22 that are ready?",
      download: "duty-savings-summary-q1.csv",
      daysAgo: 55
    },
    "chat-18": {
      title: "C-TPAT certification renewal timeline",
      question: "When does our C-TPAT certification need to be renewed, and what documentation do we need to prepare?",
      answer:
        "C-TPAT partners are subject to a **security profile revalidation every 4 years**, plus an annual self-assessment in between. Based on the last validation date on file, the next full revalidation is coming up — CBP typically opens the renewal window about 90 days ahead.\n\nYou'll want the updated supply chain security profile, any incident reports since the last validation, and confirmation that all business partners in the chain still meet minimum security criteria. I can put together a documentation checklist if that's helpful.",
      daysAgo: 70
    },
    "chat-19": {
      title: "FTZ admission procedure for new SKU",
      question: "Walk me through admitting a new SKU into the FTZ that hasn't been zone-classified yet.",
      answer:
        "Before admission, the SKU needs a **zone status designation** (privileged foreign, non-privileged foreign, or domestic) filed on CBP Form 214 — this locks in the applicable duty rate and classification at the time of admission rather than at withdrawal, which matters if the SKU's HTS rate is expected to change.\n\nSince this SKU hasn't been zone-classified, I'd recommend privileged foreign status if the current duty rate is favorable, since it fixes that rate regardless of any future inverted tariff relief at withdrawal. Want me to draft the CBP Form 214 filing?",
      daysAgo: 95
    },
    "chat-20": {
      title: "USMCA certificate of origin validation",
      question: "Is this USMCA certificate of origin from our Mexican supplier valid for the entry we're filing tomorrow?",
      answer:
        "The certificate covers the required nine data elements under USMCA Article 5.2 (importer/exporter/producer info, description, HTS, origin criterion, blanket period, and authorized signature) and the blanket period listed still covers tomorrow's shipment date, so it should hold up.\n\nOne thing worth double-checking: the **origin criterion box lists \"B\"** (regional value content), which means the supplier is claiming the RVC calculation rather than a wholly-obtained or tariff-shift basis — if CBP requests supporting documentation later, you'll need the supplier's RVC worksheet, not just this certificate.",
      daysAgo: 130
    }
  };

  // --- Sidebar chat history: date-bucket grouping -----------------------

  const CHAT_BUCKETS = [
    { key: "today", label: "Today", test: (d) => d === 0 },
    { key: "yesterday", label: "Yesterday", test: (d) => d === 1 },
    { key: "week", label: "This week", test: (d) => d >= 2 && d <= 6 },
    { key: "month", label: "This month", test: (d) => d >= 7 && d <= 29 },
    { key: "last-month", label: "Last month", test: (d) => d >= 30 && d <= 59 },
    { key: "older", label: "Older", test: (d) => d >= 60 }
  ];

  /** Demo session binding — restores route, entry form, and agent mode with the transcript. */
  function sessionForSeededChat(chatId, entry = {}) {
    const agentMode = window.KNPersona?.resolve?.()?.agentMode || "auto-accept";
    const brokerCtx = {
      routeHash: "#agentic-broker",
      agentMode,
      contextMeta: { area: "Klear Agent", title: "Klear Agent", kind: "agentic-broker" }
    };
    const byId = {
      "chat-01": {
        routeHash: "#transaction-us-isf",
        agentMode,
        contextMeta: { area: "ISF", title: "ISF", kind: "transaction-us-isf" }
      },
      "chat-02": brokerCtx,
      "chat-03": brokerCtx,
      "chat-04": {
        routeHash: "#transaction-us-entry/filing/entry-1",
        entryId: "entry-1",
        agentMode: "permission",
        contextMeta: { area: "US Entry", title: "Entry filing", kind: "transaction-us-entry", recordId: "entry-1" }
      },
      "chat-05": {
        routeHash: "#transaction-us-entry",
        agentMode,
        contextMeta: { area: "US Entry", title: "Entry", kind: "transaction-us-entry" }
      },
      "chat-07": {
        routeHash: "#transaction-us-isf",
        agentMode,
        contextMeta: { area: "ISF", title: "ISF", kind: "transaction-us-isf" }
      },
      "chat-08": {
        routeHash: "#transaction-us-entry/filing/entry-2",
        entryId: "entry-2",
        agentMode: "deny-all",
        contextMeta: { area: "US Entry", title: "Entry filing", kind: "transaction-us-entry", recordId: "entry-2" }
      },
      "chat-17": {
        routeHash: "#transaction-us-entry/filing/entry-3",
        entryId: "entry-3",
        agentMode,
        contextMeta: { area: "US Entry", title: "Entry filing", kind: "transaction-us-entry", recordId: "entry-3" }
      }
    };
    return byId[chatId] || entry.session || brokerCtx;
  }

  const STRUCTURED_MODES = window.KNGenUI?.STRUCTURED_MODES || [
    "schema",
    "draft",
    "review",
    "shipments",
    "findings",
    "classification",
    "duty",
    "entry-status"
  ];
  const storeApi = () => window.KNThreadStore;

  function brokerUserId() {
    return storeApi()?.brokerUserId?.() || "broker";
  }

  function daysSince(ts) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const day = new Date(ts);
    day.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((start.getTime() - day.getTime()) / 86400000));
  }

  function readThreadStore() {
    return storeApi()?.read() || { userId: brokerUserId(), threads: [] };
  }

  function writeThreadStore(store) {
    return storeApi()?.write(store) || store;
  }

  function readActiveThreadId() {
    return storeApi()?.readActiveId() || "";
  }

  function writeActiveThreadId(id) {
    storeApi()?.writeActiveId(id);
    activeThreadId = id || "";
  }

  let activeThreadId = readActiveThreadId();
  let lockedHeaderThreadId = "";
  let lockedHeaderTitle = "";

  function deriveThreadTitle(text) {
    return storeApi()?.deriveThreadTitle?.(text) || String(text || "Conversation").trim() || "Conversation";
  }

  function setThreadHeaderTitle(title) {
    const { title: titleEl } = els();
    if (titleEl) {
      titleEl.textContent = title || "Conversation";
    }
  }

  function lockThreadHeaderTitle(title) {
    lockedHeaderTitle = title || "Conversation";
    lockedHeaderThreadId = activeThreadId;
    setThreadHeaderTitle(lockedHeaderTitle);
  }

  function clearThreadHeaderLock() {
    lockedHeaderThreadId = "";
    lockedHeaderTitle = "";
  }

  function findThread(store, id) {
    return storeApi()?.find(store, id) || null;
  }

  function persistThread(thread, options) {
    const next = storeApi()?.persist(thread, options) || thread;
    return next;
  }

  function ensureLiveThread(title) {
    const thread = storeApi()?.ensureLiveThread(title);
    activeThreadId = thread?.id || "";
    return thread;
  }

  function serializeFiles(files) {
    return storeApi()?.serializeFiles(files) || [];
  }

  function appendThreadMessage(message) {
    const saved = storeApi()?.appendMessage(message);
    activeThreadId = storeApi()?.readActiveId() || activeThreadId;
    renderChatGroups();
    return saved || message;
  }

  function patchThreadMessage(id, patch) {
    const saved = storeApi()?.patchMessage(id, patch);
    renderChatGroups();
    return saved;
  }

  function historyEntries() {
    const store = readThreadStore();
    const live = (store.threads || []).map((thread) => ({
      id: thread.id,
      entry: {
        title: thread.title || "Conversation",
        daysAgo: daysSince(thread.updatedAt || thread.createdAt || Date.now()),
        persisted: true
      }
    }));
    const liveIds = new Set(live.map((item) => item.id));
    const seeded = Object.keys(CHAT_HISTORY)
      .filter((id) => !liveIds.has(id))
      .map((id) => ({ id, entry: CHAT_HISTORY[id] }));
    return live.concat(seeded);
  }

  function bucketFor(daysAgo) {
    return CHAT_BUCKETS.find((bucket) => bucket.test(daysAgo)) || CHAT_BUCKETS[CHAT_BUCKETS.length - 1];
  }

  function chatRowHtml(id, entry) {
    const title = escapeHtml(entry.title);
    return `<li class="side-nav-chat-row" data-chat-id="${id}">
      <button type="button" class="side-nav-chat-item type-ui-sm" data-agentic-chat-item data-tooltip="${title}">${title}</button>
    </li>`;
  }

  function renderChatGroups() {
    const mount = document.querySelector("[data-chat-groups-mount]");
    if (!mount) return;
    const buckets = new Map(CHAT_BUCKETS.map((bucket) => [bucket.key, []]));
    historyEntries()
      .sort((a, b) => a.entry.daysAgo - b.entry.daysAgo)
      .forEach(({ id, entry }) => {
        buckets.get(bucketFor(entry.daysAgo).key).push(chatRowHtml(id, entry));
      });
    mount.innerHTML = CHAT_BUCKETS.filter((bucket) => buckets.get(bucket.key).length)
      .map(
        (bucket) => `<div class="side-nav-chat-group" data-chat-group>
          <p class="side-nav-chat-group__label type-caption-sm">${bucket.label}</p>
          <ul class="side-nav-chat-list" data-chat-list>${buckets.get(bucket.key).join("")}</ul>
        </div>`
      )
      .join("");
    window.KNShellSearchIndex?.rebuild?.();
    window.KNAgenticNav?.refilterChatHistory?.();
  }

  function escapeHtml(text) {
    return window.KNAiSuggest?.escapeHtml
      ? window.KNAiSuggest.escapeHtml(text)
      : String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function knMotionDurationMs(tokenName, fallbackMs) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || !raw) {
      return fallbackMs;
    }
    if (raw.endsWith("s") && !raw.endsWith("ms")) {
      return n * 1000;
    }
    return n;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function greetingCopy() {
    const hour = new Date().getHours();
    const period = hour >= 17 || hour < 5 ? "evening" : "morning";
    const name =
      document.querySelector(".profile-text__name")?.textContent?.trim()?.split(/\s+/)[0] || "there";
    return `Good ${period}, ${name}`;
  }

  let homePromptsExpanded = false;

  function renderCards() {
    const grid = document.getElementById("agentic-home-cards");
    if (!grid) {
      return;
    }
    grid.innerHTML = window.KNNextActions?.render?.(window.KNNextActions.homeActions(), {
      ariaLabel: "Suggested questions",
      align: "center",
      maxVisible: homePromptsExpanded ? undefined : 3,
      expanded: homePromptsExpanded
    }) || "";
  }

  function syncGreeting() {
    const greetingEl = document.getElementById("agentic-home-greeting");
    if (greetingEl) {
      greetingEl.textContent = greetingCopy();
    }
  }

  // --- Ghost autocomplete (composer) -----------------------------------

  let threadGhost = null;

  function ghostPromptPhrases() {
    const cards = (window.KNNextActions?.homeActions?.() || promptCardsForPersona().map((card) => ({ query: card.prompt }))).map((item) => item.query);
    const expert = (window.KNKnowledgeExpert?.getPrompts?.(3) || []).map((item) => item.prompt);
    const merged = [...cards];
    expert.forEach((prompt) => {
      if (merged.length >= 12) {
        return;
      }
      if (!merged.includes(prompt)) {
        merged.push(prompt);
      }
    });
    return merged;
  }

  function seededBrokerQuestions() {
    return Object.values(CHAT_HISTORY)
      .map((entry) => entry.question)
      .filter(Boolean);
  }

  function initThreadGhost() {
    const input = document.getElementById("agentic-thread-input");
    const ghostEl = document.getElementById("agentic-thread-ghost");
    if (!input || !ghostEl || !window.KNAgentGhost?.bind) {
      return;
    }
    threadGhost = window.KNAgentGhost.bind(input, {
      ghostEl,
      getPromptPhrases: ghostPromptPhrases,
      getSeededQuestions: seededBrokerQuestions,
      isPaused: () => isAsking,
      restorePlaceholder: (field) => {
        syncComposerPlaceholder();
        if (!field.value.trim()) {
          field.placeholder = field.getAttribute("data-placeholder") || field.placeholder || "";
        }
      }
    });
  }

  function syncGhostSuggestion() {
    threadGhost?.sync?.();
  }

  function startGhostCycle() {
    threadGhost?.startIdleCycle?.();
  }

  function stopGhostCycle() {
    threadGhost?.stopIdleCycle?.();
  }

  function handleComposerKeydown(event) {
    const input = event.target.closest("#agentic-thread-input");
    if (!input) {
      return;
    }
    if (window.KNAgentGhost?.handleKeydown?.(event)) {
      return;
    }
    // Enter submits; Shift+Enter inserts a newline (textarea default).
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const root = composerRoot(input);
      if (isComposerSubmitDisabled(root) && !isAsking) {
        return;
      }
      input.closest("form")?.requestSubmit();
    }
  }

  const CHAT_ACCEPT = ".jpg,.jpeg,.png,.pdf,.xlsx";
  const CHAT_MAX_FILES = 3;
  const CHAT_MAX_BYTES = 5 * 1024 * 1024;
  const composerFiles = new Map();
  const FILE_ITEM_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>';
  const FILE_CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const FILE_TRASH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12"/></svg>';
  const FILE_RETRY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M5.5 9A8 8 0 0 1 20 12M18.5 15A8 8 0 0 1 4 12"/></svg>';

  function isFileAccepted(file, acceptedFiles) {
    if (!file || !acceptedFiles) {
      return true;
    }
    const accepted = acceptedFiles.split(",");
    const fileName = file.name || "";
    const mimeType = String(file.type || "").toLowerCase();
    const baseMimeType = mimeType.replace(/\/.*$/, "");
    return accepted.some((type) => {
      const validType = type.trim().toLowerCase();
      if (validType.startsWith(".")) {
        return fileName.toLowerCase().endsWith(validType);
      }
      if (validType.endsWith("/*")) {
        return baseMimeType === validType.replace(/\/.*$/, "");
      }
      return mimeType === validType;
    });
  }

  function formatFileSize(bytes) {
    const kb = Number(bytes || 0) / 1024;
    const mb = kb / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  }

  function composerKey(root) {
    return root?.querySelector("form")?.id || root?.id || "chat";
  }

  function composerState(root) {
    const key = composerKey(root);
    if (!composerFiles.has(key)) {
      composerFiles.set(key, { files: [], timers: new Map() });
    }
    return composerFiles.get(key);
  }

  function composerTextarea(root) {
    return root?.querySelector("textarea");
  }

  function isComposerSubmitDisabled(root) {
    if (!root) {
      return true;
    }
    const text = (composerTextarea(root)?.value || "").trim();
    const files = composerState(root).files;
    const hasErrorFiles = files.some((file) => file.status === "error" || file.status === "uploading");
    return (!text && !files.length) || hasErrorFiles;
  }

  function syncComposerSubmit(root) {
    const sendBtn = root?.querySelector(".agentic-home__send, .kn-chat-input__submit");
    if (!sendBtn || sendBtn.dataset.generating === "true") {
      return;
    }
    sendBtn.disabled = isComposerSubmitDisabled(root);
  }

  function stopFileTimer(state, fileId) {
    const timer = state.timers.get(fileId);
    if (timer) {
      clearInterval(timer);
      state.timers.delete(fileId);
    }
  }

  function clearComposerFiles(root) {
    const state = composerState(root);
    Array.from(state.timers.keys()).forEach((id) => stopFileTimer(state, id));
    state.files = [];
    renderComposerFiles(root);
    syncComposerSubmit(root);
  }

  function fileItemHtml(file) {
    const status = file.status || "success";
    const percent = Number.isFinite(file.uploadPercent) ? ` (${file.uploadPercent}%)` : "";
    const meta = file.errorText || `${formatFileSize(file.size)}${status === "uploading" ? percent : ""}`;
    const name = escapeHtml(file.name);
    let actions = "";
    if (status === "uploading") {
      actions = `<button type="button" class="icon-btn" data-chat-file-dismiss="${file.id}" aria-label="Remove ${name}">${FILE_CLOSE_ICON}</button>`;
    } else if (status === "error") {
      actions = `<button type="button" class="icon-btn" data-chat-file-reupload="${file.id}" aria-label="Reupload ${name}">${FILE_RETRY_ICON}</button>
        <button type="button" class="icon-btn" data-chat-file-remove="${file.id}" aria-label="Remove ${name}">${FILE_TRASH_ICON}</button>`;
    } else {
      actions = `<button type="button" class="icon-btn" data-chat-file-remove="${file.id}" aria-label="Remove ${name}">${FILE_TRASH_ICON}</button>`;
    }
    const progress =
      status === "uploading"
        ? `<div class="kn-file-upload__progress"><div class="kn-file-upload__progress-fill" style="--kn-file-upload-progress: ${file.uploadPercent || 0}%"></div></div>`
        : "";
    return `<div class="kn-chat-input__file">
      <div class="kn-file-upload__item${status === "error" ? " is-error" : ""}" data-status="${status}" data-file-id="${file.id}">
        <div class="kn-file-upload__item-body">
          <span class="kn-file-upload__item-icon" aria-hidden="true">${FILE_ITEM_ICON}</span>
          <div class="kn-file-upload__item-copy">
            <p class="kn-file-upload__item-name type-ui-sm">${name}</p>
            <p class="kn-file-upload__item-meta type-caption-sm">${escapeHtml(meta)}</p>
          </div>
          <div class="kn-file-upload__item-actions">${actions}</div>
        </div>
        ${progress}
      </div>
    </div>`;
  }

  function renderComposerFiles(root) {
    const row = root?.querySelector("[data-chat-files]");
    const host = root?.querySelector("[data-chat-files-host]") || row;
    if (!row || !host) {
      return;
    }
    const files = composerState(root).files;
    const prevCount = row.childElementCount;
    if (!files.length) {
      host.classList.remove("is-open");
      const hideMs = prefersReducedMotion() ? 0 : knMotionDurationMs("--theme-motion-duration-quick", 200);
      window.setTimeout(() => {
        if (!composerState(root).files.length) {
          row.innerHTML = "";
        }
      }, hideMs);
      return;
    }
    row.innerHTML = files.map(fileItemHtml).join("");
    host.classList.add("is-open");
    if (files.length > prevCount) {
      row.scrollTo({ left: row.scrollWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
    window.KNButton?.hydrate(row);
  }

  function startFileUpload(root, fileId) {
    const state = composerState(root);
    stopFileTimer(state, fileId);
    const tick = () => {
      const file = state.files.find((item) => item.id === fileId);
      if (!file) {
        stopFileTimer(state, fileId);
        return;
      }
      file.uploadPercent = Math.min(100, (file.uploadPercent || 0) + 25);
      if (file.uploadPercent >= 100) {
        stopFileTimer(state, fileId);
        if (file.size > CHAT_MAX_BYTES) {
          file.status = "error";
          file.errorText = "File is too large";
        } else {
          file.status = "success";
          file.errorText = undefined;
        }
      }
      renderComposerFiles(root);
      syncComposerSubmit(root);
    };
    state.timers.set(fileId, setInterval(tick, prefersReducedMotion() ? 80 : 200));
  }

  function addComposerFiles(root, incoming) {
    if (!root || !incoming?.length) {
      return;
    }
    const state = composerState(root);
    const accepted = incoming.filter((file) => isFileAccepted(file, CHAT_ACCEPT));
    if (accepted.length !== incoming.length) {
      showComposerValidationError(root, "That file type isn’t supported. Use JPG, PNG, PDF, or XLSX.");
    } else {
      hideComposerValidationError(root);
    }
    if (!accepted.length) {
      return;
    }
    if (state.files.length + accepted.length > CHAT_MAX_FILES) {
      showComposerValidationError(root, "You can attach a maximum of 3 files.");
      return;
    }
    const next = accepted.map((file) => {
      const id = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        uploadPercent: 0,
        raw: file
      };
    });
    state.files = state.files.concat(next);
    renderComposerFiles(root);
    syncComposerSubmit(root);
    next.forEach((file) => startFileUpload(root, file.id));
  }

  function removeComposerFile(root, fileId, { dismiss = false } = {}) {
    const state = composerState(root);
    stopFileTimer(state, fileId);
    state.files = state.files.filter((file) => file.id !== fileId);
    renderComposerFiles(root);
    syncComposerSubmit(root);
    void dismiss;
  }

  function reuploadComposerFile(root, fileId) {
    const state = composerState(root);
    const file = state.files.find((item) => item.id === fileId);
    if (!file) {
      return;
    }
    file.status = "uploading";
    file.uploadPercent = 0;
    file.errorText = undefined;
    renderComposerFiles(root);
    syncComposerSubmit(root);
    startFileUpload(root, fileId);
  }

  // --- Thread rendering -----------------------------------------------

  function els() {
    return {
      thread: document.getElementById("agentic-thread"),
      header: document.getElementById("agentic-thread-header"),
      empty: document.getElementById("agentic-chat-empty"),
      title: document.getElementById("agentic-thread-title"),
      messages: document.getElementById("agentic-thread-messages"),
      threadForm: document.getElementById("agentic-thread-form"),
      threadInput: document.getElementById("agentic-thread-input")
    };
  }

  function hasThreadMessages() {
    return Boolean(els().messages?.querySelector(".agentic-thread-msg"));
  }

  function syncComposerPlaceholder() {
    const input = els().threadInput;
    if (!input) {
      return;
    }
    const inConversation = hasThreadMessages();
    const placeholder = inConversation
      ? input.getAttribute("data-placeholder-followup") || "Ask a follow-up…"
      : input.getAttribute("data-placeholder-empty") || "Ask a question...";
    input.setAttribute("data-placeholder", placeholder);
    if (!input.value.trim()) {
      input.placeholder = placeholder;
    }
  }

  function enterEmptyState() {
    const { empty, header, messages, threadForm, threadInput } = els();
    if (empty) {
      empty.hidden = false;
    }
    if (header) {
      header.hidden = true;
    }
    if (messages) {
      messages.innerHTML = "";
      messages.hidden = true;
    }
    hideComposerValidationError(threadForm);
    clearComposerFiles(composerRoot(threadForm));
    if (threadInput) {
      threadInput.value = "";
      autoResizeTextarea(threadInput);
      syncComposerSubmit(composerRoot(threadForm));
    }
    syncComposerPlaceholder();
    homePromptsExpanded = false;
    renderCards();
    syncGreeting();
    threadGhost?.refresh?.();
    startGhostCycle();
    window.KNAgenticSpark?.setState?.("empty");
    window.requestAnimationFrame(() => {
      const page = document.getElementById("agentic-broker-page");
      if (page && !page.hidden) {
        threadInput?.focus({ preventScroll: true });
      }
    });
  }

  function enterConversationMode(title) {
    const { empty, header, messages, threadForm, threadInput } = els();
    if (empty) {
      empty.hidden = true;
    }
    if (header) {
      header.hidden = false;
    }
    if (messages) {
      messages.hidden = false;
    }
    if (!lockedHeaderThreadId || lockedHeaderThreadId !== activeThreadId) {
      lockThreadHeaderTitle(title);
    } else {
      setThreadHeaderTitle(lockedHeaderTitle);
    }
    hideComposerValidationError(threadForm);
    if (threadInput && !threadInput.value) {
      autoResizeTextarea(threadInput);
    }
    syncComposerPlaceholder();
    stopGhostCycle();
    syncGhostSuggestion();
  }

  function showNewChat() {
    enterEmptyState();
  }

  function showThread(title) {
    enterConversationMode(title);
  }

  function assistantMessageHtml(innerHtml, id, footerHtml, { loading = false, traces = "" } = {}) {
    const idAttr = id ? ` id="${id}" data-message-id="${id}"` : "";
    const loadingClass = loading ? " ai-msg--loading is-loading" : "";
    const leadingClass = loading ? " is-rotating" : "";
    return `<div class="agentic-thread-msg agentic-thread-msg--assistant">
      <article class="ai-msg ai-msg--assistant kn-chat-msg kn-chat-msg--other${loadingClass}" data-kn-component="chat-message"${idAttr}>
        <div class="kn-chat-msg__row ai-msg__row">
          <span class="kn-chat-msg__leading ai-msg__leading agentic-thread-msg__avatar${leadingClass}" aria-hidden="true"><svg class="klear-assistant-mark" viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><use href="#klear-assist-ray" /></svg></span>
          <div class="ai-msg__stack">${traces}<div class="ai-msg__body type-body-md kn-chat-msg__bubble">${innerHtml}</div><div class="ai-msg__footer kn-chat-msg__actions">${footerHtml || ""}</div></div>
        </div>
      </article>
    </div>`;
  }

  function messageActionsHtml() {
    return `<div class="agentic-msg-actions" role="group" aria-label="Message actions">
      <button type="button" class="agentic-msg-action icon-btn" data-agentic-copy aria-label="Copy response" data-tooltip="Copy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M5 16V5a1 1 0 0 1 1-1h11"/></svg>
      </button>
      <button type="button" class="agentic-msg-action icon-btn" data-agentic-feedback="up" aria-label="Good response" aria-pressed="false" data-tooltip="Good response">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 3.6 1.2L13.8 9H18a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H10a3 3 0 0 1-3-3v-6Z"/></svg>
      </button>
      <button type="button" class="agentic-msg-action icon-btn" data-agentic-feedback="down" aria-label="Bad response" aria-pressed="false" data-tooltip="Bad response">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4 7a2 2 0 0 1-3.6-1.2l.8-3.8H6a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 7.2 4H14a3 3 0 0 1 3 3v6Z"/></svg>
      </button>
    </div>`;
  }

  function userMessageHtml(text, files = [], meta = {}) {
    const copy = text ? `<p>${escapeHtml(text)}</p>` : "";
    const attachments = (files || [])
      .map((file) => `<li>${escapeHtml(file.name)} <span class="type-caption-sm">(${escapeHtml(formatFileSize(file.size))})</span></li>`)
      .join("");
    const fileList = attachments ? `<ul class="agentic-msg-files type-caption-sm">${attachments}</ul>` : "";
    const id = meta.id ? ` data-message-id="${escapeHtml(meta.id)}"` : "";
    const isError = meta.status === "error";
    const error = isError
      ? `<p class="kn-chat-msg__error type-caption-sm">${escapeHtml(meta.errorText || "Message not sent.")}</p>
         <div class="kn-chat-msg__actions"><button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-agentic-retry="${escapeHtml(meta.id || "")}">Retry</button></div>`
      : "";
    return `<div class="agentic-thread-msg agentic-thread-msg--user">
      <article class="ai-msg ai-msg--user kn-chat-msg kn-chat-msg--self${isError ? " is-error" : ""}" data-kn-component="chat-message"${id}><div class="ai-msg__body type-body-md kn-chat-msg__bubble">${copy}${fileList}</div>${error}</article>
    </div>`;
  }

  function thinkingDotsHtml() {
    return `<span class="ai-thinking-dots" role="status" aria-label="Thinking"><span></span><span></span><span></span></span>`;
  }

  const THINKING_STEPS = ["Reading the request…", "Checking HTS and ACE records…", "Compiling the response…"];

  // Rolling loading text cycles phrases while the answer is assembled.
  function rollingLoadingTextHtml(steps) {
    const items = (steps || THINKING_STEPS).map((step) => `<span class="ai-rolling-loading__item type-caption-sm">${escapeHtml(step)}</span>`).join("");
    return `<span class="ai-rolling-loading" role="status" aria-label="Thinking">
      <span class="ai-rolling-loading__viewport"><span class="ai-rolling-loading__track">${items}</span></span>
    </span>`;
  }

  function followUpChipsHtml(items) {
    const prompts = (items || []).filter((item) => item?.label && item?.prompt).slice(0, 5);
    if (!prompts.length) {
      return "";
    }
    return `<div class="ai-msg__related" role="group" aria-label="Related questions">
      <p class="ai-msg__related-label type-caption-sm">Related</p>
      <div class="ai-msg__related-chips">
        ${prompts
          .map(
            (item) =>
              `<button type="button" class="ai-msg__related-chip kn-chip kn-chip--small type-caption-sm" data-agentic-thread-prompt="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`
          )
          .join("")}
      </div>
    </div>`;
  }

  function deriveThreadFollowUps(thread, savedFollowUps) {
    if (Array.isArray(savedFollowUps) && savedFollowUps.length) {
      return savedFollowUps;
    }
    const messages = thread?.messages || [];
    const lastUser = [...messages].reverse().find((item) => item.senderType === "self" && item.text);
    const skip = String(lastUser?.text || "").toLowerCase();
    return (window.KNNextActions?.homeActions?.() || [])
      .map((action) => ({ label: action.label, prompt: action.query }))
      .filter((item) => item.label && item.prompt && item.prompt.toLowerCase() !== skip)
      .slice(0, 3);
  }

  function attachRelatedChipsToMessage(msgId, items) {
    const related = followUpChipsHtml(items);
    if (!related || !msgId) {
      return;
    }
    const node = document.getElementById(msgId);
    const stack = node?.querySelector(".ai-msg__stack");
    if (!stack) {
      return;
    }
    stack.querySelector(":scope > .ai-msg__related")?.remove();
    const footer = stack.querySelector(":scope > .ai-msg__footer, :scope > .kn-chat-msg__actions");
    if (footer) {
      footer.insertAdjacentHTML("beforebegin", related);
    } else {
      stack.insertAdjacentHTML("beforeend", related);
    }
    window.KNChatMessage?.hydrate(node);
  }

  const THREAD_SCROLL_BOTTOM_THRESHOLD = 80;

  function isThreadNearBottom(messages) {
    if (!messages) {
      return true;
    }
    const distance = messages.scrollHeight - messages.clientHeight - messages.scrollTop;
    return distance <= THREAD_SCROLL_BOTTOM_THRESHOLD;
  }

  function scrollThreadMessages({ force = false, behavior } = {}) {
    const { messages } = els();
    if (!messages) {
      return;
    }
    if (force || isThreadNearBottom(messages)) {
      const scrollBehavior = behavior ?? (prefersReducedMotion() ? "auto" : "smooth");
      messages.scrollTo({ top: messages.scrollHeight, behavior: scrollBehavior });
    }
  }

  function bindThreadMessageEnter(row, { animate = true } = {}) {
    if (!row || !animate || prefersReducedMotion()) {
      return;
    }
    row.classList.add("is-entering");
    const finish = () => {
      row.classList.remove("is-entering");
    };
    row.addEventListener(
      "animationend",
      (event) => {
        if (event.target === row) {
          finish();
        }
      },
      { once: true }
    );
    window.setTimeout(finish, knMotionDurationMs("--theme-motion-duration-xmoderate", 360) + 80);
  }

  function appendMessages(html, { scroll = true, forceScroll = false, animate = true } = {}) {
    const { messages } = els();
    if (!messages) return;
    const beforeCount = messages.querySelectorAll(".agentic-thread-msg").length;
    messages.insertAdjacentHTML("beforeend", html);
    const rows = messages.querySelectorAll(".agentic-thread-msg");
    for (let i = beforeCount; i < rows.length; i += 1) {
      bindThreadMessageEnter(rows[i], { animate });
    }
    window.KNChatMessage?.hydrate(messages);
    if (scroll) {
      scrollThreadMessages({ force: forceScroll });
    }
  }

  function announceThread(text) {
    const target = document.getElementById("agentic-thread-live");
    if (!target) {
      return;
    }
    const next = String(text || "").replace(/\s+/g, " ").trim();
    if (!next) {
      return;
    }
    target.textContent = "";
    window.requestAnimationFrame(() => {
      target.textContent = next;
    });
  }

  function announceAssistantBody(node) {
    const bodyEl = node?.querySelector(".ai-msg__body");
    announceThread((bodyEl?.textContent || "").replace(/\s+/g, " ").trim() || "Response ready");
  }

  function reasoningTracesHtml(result) {
    return window.KNAssistant?.thinkingPanel
      ? window.KNAssistant.thinkingPanel(result?.thinking, false, { status: "complete" })
      : "";
  }

  const TRACE_SPINNER =
    '<span class="kn-spinner kn-spinner--accent" role="progressbar" aria-label="Loading"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="kn-spinner__track" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z" fill="currentColor"/><path d="M24 12C24 13.8937 23.5518 15.7606 22.6921 17.4479C21.8324 19.1352 20.5855 20.5951 19.0534 21.7082C17.5214 22.8213 15.7476 23.556 13.8772 23.8523C12.0068 24.1485 10.0928 23.9979 8.29181 23.4127L9.21886 20.5595C10.5696 20.9984 12.0051 21.1114 13.4079 20.8892C14.8107 20.667 16.141 20.116 17.2901 19.2812C18.4391 18.4463 19.3743 17.3514 20.0191 16.0859C20.6639 14.8204 21 13.4203 21 12H24Z" fill="currentColor"/></svg></span>';

  function thinkingTraceListHtml(steps, activeIndex) {
    return (steps || [])
      .map((step, index) => {
        const isLast = index === steps.length - 1;
        let status = "is-pending";
        if (index < activeIndex) {
          status = "is-complete";
        } else if (index === activeIndex) {
          status = "is-active";
        }
        const railInner =
          status === "is-active"
            ? `<span class="ai-msg__trace-active-icon">${TRACE_SPINNER}</span>`
            : `<span class="ai-msg__trace-dot" aria-hidden="true"></span>`;
        return `<li class="${status}">
          <span class="ai-msg__trace-rail" aria-hidden="true">
            ${railInner}
            ${isLast ? "" : '<span class="ai-msg__trace-connector"></span>'}
          </span>
          <p class="ai-msg__trace-label type-caption-sm">${escapeHtml(step)}</p>
        </li>`;
      })
      .join("");
  }

  async function animateThinkingTracesComplete(node, steps, reduceMotion) {
    const items = (steps || THINKING_STEPS).filter(Boolean);
    if (!items.length || !node) {
      return;
    }
    const stack = node.querySelector(".ai-msg__stack");
    const bodyEl = node.querySelector(".ai-msg__body");
    if (!stack || !bodyEl) {
      return;
    }
    const traceId = `agentic-trace-${Date.now()}`;
    stack.querySelectorAll(":scope > .ai-msg__thinking-panel, :scope > .kn-chat-msg__traces").forEach((el) => el.remove());
    bodyEl.insertAdjacentHTML(
      "beforebegin",
      `<div class="ai-msg__thinking-panel kn-collapsible kn-chat-msg__traces" data-reasoning-status="loading">
        <button type="button" class="ai-msg__thinking-toggle kn-collapsible__trigger type-caption-sm" aria-expanded="true" aria-controls="${traceId}">
          ${TRACE_SPINNER}
          <span class="ai-msg__thinking-toggle-label">Exploring…</span>
        </button>
        <div class="ai-msg__thinking-trace kn-collapsible__body" id="${traceId}">
          <ol class="ai-msg__thinking-list type-caption-sm">${thinkingTraceListHtml(items, 0)}</ol>
        </div>
      </div>`
    );
    scrollThreadMessages();
    if (reduceMotion) {
      const panel = stack.querySelector(".ai-msg__thinking-panel");
      const completeHtml = window.KNAssistant?.thinkingPanel?.(items, true, { status: "complete" }) || "";
      if (panel && completeHtml) {
        panel.outerHTML = completeHtml;
      }
      window.KNChatMessage?.hydrate(node);
      return;
    }
    const stepDelay = 520;
    for (let i = 0; i < items.length; i += 1) {
      if (i > 0) {
        await delay(stepDelay);
      }
      const list = stack.querySelector(".ai-msg__thinking-list");
      if (!list) {
        break;
      }
      list.innerHTML = thinkingTraceListHtml(items, i);
      scrollThreadMessages();
    }
    await delay(stepDelay);
    const panel = stack.querySelector(".ai-msg__thinking-panel");
    const completeHtml = window.KNAssistant?.thinkingPanel?.(items, true, { status: "complete" }) || "";
    if (panel && completeHtml) {
      panel.outerHTML = completeHtml;
    }
    window.KNChatMessage?.hydrate(node);
  }

  function resultBodyHtml(result, context) {
    const schema = structuredSchema(result);
    if (schema?.components?.length) {
      return `<div class="kn-genui" data-kn-genui></div>`;
    }
    const renderText = (text) => (window.KNAssistant?.renderText ? window.KNAssistant.renderText(text, context) : `<p>${escapeHtml(text)}</p>`);
    return `${renderText(result?.text || "I could not process that request right now. Please try again.")}`;
  }

  function fillAssistantMessage(
    node,
    { traces = "", body = "", related = "", actions = "", schema = null, animate = true, skipGenUIMount = false, keepTraces = false } = {}
  ) {
    if (!node) {
      return;
    }
    const stack = node.querySelector(".ai-msg__stack");
    const bodyEl = node.querySelector(".ai-msg__body");
    node.classList.remove("ai-msg--loading", "is-loading");
    if (bodyEl && body != null) {
      bodyEl.innerHTML = body;
      if (schema && window.KNGenUI?.mount && !skipGenUIMount) {
        window.KNGenUI.mount(bodyEl.querySelector("[data-kn-genui]"), schema, { animate });
      }
      if (!prefersReducedMotion()) {
        bodyEl.classList.add("is-content-entering");
        bodyEl.addEventListener(
          "animationend",
          () => {
            bodyEl.classList.remove("is-content-entering");
          },
          { once: true }
        );
      }
    }
    if (stack) {
      if (!keepTraces) {
        stack.querySelectorAll(":scope > .ai-msg__thinking-panel, :scope > .kn-chat-msg__traces, :scope > .ai-msg__related").forEach((el) => el.remove());
        if (traces && bodyEl) {
          bodyEl.insertAdjacentHTML("beforebegin", traces);
        }
      } else if (traces && bodyEl) {
        stack.querySelectorAll(":scope > .ai-msg__thinking-panel, :scope > .kn-chat-msg__traces").forEach((el) => el.remove());
        bodyEl.insertAdjacentHTML("beforebegin", traces);
      }
      let footer = stack.querySelector(":scope > .ai-msg__footer, :scope > .kn-chat-msg__actions");
      if (related) {
        if (footer) {
          footer.insertAdjacentHTML("beforebegin", related);
        } else {
          stack.insertAdjacentHTML("beforeend", related);
        }
      }
      if (!footer) {
        stack.insertAdjacentHTML("beforeend", `<div class="ai-msg__footer kn-chat-msg__actions"></div>`);
        footer = stack.querySelector(":scope > .ai-msg__footer, :scope > .kn-chat-msg__actions");
      }
      if (footer) {
        footer.innerHTML = actions || "";
      }
    }
    window.KNChatMessage?.hydrate(node);
    announceAssistantBody(node);
    scrollThreadMessages();
  }

  let streamAbort = null;

  function structuredSchema(result) {
    if (!result) {
      return null;
    }
    if (result.schema?.components?.length) {
      return result.schema;
    }
    return window.KNGenUI?.schemaFromResult ? window.KNGenUI.schemaFromResult(result) : null;
  }

  async function streamGenUI(node, schema, animate) {
    const host = node?.querySelector("[data-kn-genui]");
    if (!host || !schema) {
      return;
    }
    streamAbort?.abort();
    streamAbort = new AbortController();
    try {
      const { messages } = els();
      const followScroll = () => {
        if (isThreadNearBottom(messages)) {
          scrollThreadMessages({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
        }
      };
      if (window.KNGenUI?.stream) {
        await window.KNGenUI.stream(host, schema, {
          animate,
          signal: streamAbort.signal,
          onChunk: followScroll,
          interval: animate ? 48 : 28,
          preStreamDelay: animate ? 420 : 0,
          preRevealDelay: animate ? 320 : 0,
          skeletonUntilComplete: true
        });
      } else {
        window.KNGenUI?.mount(host, schema, { animate });
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      window.KNGenUI?.mount(host, schema, { animate: false });
    }
    scrollThreadMessages();
  }
  // True while a question is in its "thinking" delay. Blocks a new
  // submission from starting until this one resolves — without this, a
  // rapid second ask would bump `generation` and cause the first call's
  // `genId !== generation` check below to abandon its own thinking-dots
  // node forever (never replaced, never removed): a permanently "thinking"
  // bubble stuck in the thread. Found via stress-testing rapid submissions.
  let generation = 0;
  let isAsking = false;
  // The id of the currently in-flight "thinking" bubble, if any. Scopes
  // stopGeneration()'s cleanup to that one node — a node.id, once set, is
  // never cleared after resolving into a real answer, so a broad
  // [id^="agentic-thinking-"] query would also match (and delete) every
  // already-resolved assistant message in the thread.
  let pendingThinkingId = null;

  const SEND_ICON = ".kn-chat-input__icon--send";
  const STOP_ICON = ".kn-chat-input__icon--stop";

  // Submit becomes a stop control while a response is generating.
  // Only the thread follow-up composer stays visible during the thinking
  // delay — the home composer transitions away via showThread() — so this
  // only ever needs to target the thread's own send button.
  function setThreadGenerating(isGenerating) {
    const sendBtn = document.querySelector("#agentic-thread-form .agentic-home__send");
    if (!sendBtn) {
      return;
    }
    sendBtn.dataset.generating = isGenerating ? "true" : "false";
    sendBtn.classList.toggle("is-stop", isGenerating);
    sendBtn.disabled = false;
    sendBtn.setAttribute("aria-label", isGenerating ? "Stop generation" : "Submit");
    const sendIcon = sendBtn.querySelector(SEND_ICON);
    const stopIcon = sendBtn.querySelector(STOP_ICON);
    if (isGenerating) {
      sendIcon?.setAttribute("hidden", "");
      stopIcon?.removeAttribute("hidden");
    } else {
      sendIcon?.removeAttribute("hidden");
      stopIcon?.setAttribute("hidden", "");
      syncComposerSubmit(document.getElementById("agentic-thread-form")?.closest("[data-kn-component='chat-input']"));
    }
  }

  function stopGeneration() {
    if (!isAsking && !streamAbort) {
      return;
    }
    generation += 1;
    streamAbort?.abort();
    streamAbort = null;
    isAsking = false;
    const thinking = pendingThinkingId ? document.getElementById(pendingThinkingId) : null;
    if (thinking?.querySelector("[data-kn-genui]")) {
      thinking.classList.remove("ai-msg--loading", "is-loading");
      if (!thinking.querySelector(".ai-msg__stopped")) {
        const note = document.createElement("p");
        note.className = "ai-msg__stopped type-caption-sm";
        note.textContent = "Generation stopped.";
        thinking.querySelector(".ai-msg__body")?.appendChild(note);
      }
      appendThreadMessage({
        id: pendingThinkingId,
        senderType: "other",
        text: "Generation stopped.",
        schema: lastStreamSchema,
        timestamp: Date.now(),
        status: "stopped"
      });
      pendingThinkingId = null;
    } else if (pendingThinkingId) {
      thinking?.closest(".agentic-thread-msg")?.remove();
      pendingThinkingId = null;
    }
    lastStreamSchema = null;
    setThreadGenerating(false);
    announceThread("Generation stopped.");
    window.KNAgenticSpark?.setState?.("idle");
    const { threadInput } = els();
    threadInput?.focus();
  }

  let lastStreamSchema = null;

  async function askInline(question, files = [], opts = {}) {
    const text = String(question || "").trim();
    const attachments = Array.isArray(files) ? files.slice() : [];
    if ((!text && !attachments.length) || isAsking) return;
    isAsking = true;
    if (text) {
      threadGhost?.recordSubmitted?.(text);
    }
    const titleSource = text || attachments[0]?.name || "Conversation";
    const derivedTitle = deriveThreadTitle(titleSource);
    const userId = opts.userMessageId || `msg-user-${Date.now()}`;
    if (!hasThreadMessages()) {
      ensureLiveThread(derivedTitle);
      enterConversationMode(derivedTitle);
    }
    if (opts.userMessageId) {
      document.querySelector(`[data-message-id="${CSS.escape(userId)}"]`)?.closest(".agentic-thread-msg")?.remove();
    }
    const userRecord = {
      id: userId,
      senderType: "self",
      text,
      attachments: serializeFiles(attachments),
      timestamp: Date.now(),
      status: "sending"
    };
    try {
      if (!opts.userMessageId) {
        appendThreadMessage(userRecord);
      } else {
        patchThreadMessage(userId, { status: "sending", errorText: "" });
      }
    } catch (_error) {
      isAsking = false;
      appendMessages(
        userMessageHtml(text, attachments, {
          id: userId,
          status: "error",
          errorText: "Could not save this message. Retry to keep it on the record."
        })
      );
      announceThread("Message not saved.");
      return;
    }
    appendMessages(userMessageHtml(text, attachments, { id: userId, status: "sent" }));
    patchThreadMessage(userId, { status: "sent" });
    const prompt =
      text ||
      `Review the attached file${attachments.length > 1 ? "s" : ""}: ${attachments.map((file) => file.name).join(", ")}`;
    const genId = ++generation;
    const thinkingId = `agentic-thinking-${genId}`;
    pendingThinkingId = thinkingId;
    lastStreamSchema = null;
    const reduceMotion = prefersReducedMotion();
    const loadingTraces = window.KNAssistant?.thinkingPanel?.(THINKING_STEPS, true, { status: "loading" }) || "";
    appendMessages(
      assistantMessageHtml(reduceMotion ? thinkingDotsHtml() : rollingLoadingTextHtml(), thinkingId, "", {
        loading: true,
        traces: loadingTraces
      })
    );
    announceThread("Checking classification and ACE records.");
    setThreadGenerating(true);
    window.KNAgenticSpark?.setState?.("thinking");
    await delay(reduceMotion ? 100 : 1500);
    if (genId !== generation) {
      isAsking = false;
      return;
    }
    try {
      const result = window.KNAssistant?.answer ? window.KNAssistant.answer(prompt) : null;
      const context = { kind: "agentic-broker" };
      const schema = structuredSchema(result);
      lastStreamSchema = schema;
      const thinkingNode = document.getElementById(thinkingId);
      thinkingNode?.classList.remove("ai-msg--loading", "is-loading");
      const thinkingSteps = result?.thinking?.length ? result.thinking : THINKING_STEPS;
      await animateThinkingTracesComplete(thinkingNode, thinkingSteps, reduceMotion);
      if (genId !== generation) {
        isAsking = false;
        return;
      }
      await delay(reduceMotion ? 50 : 580);
      if (genId !== generation) {
        isAsking = false;
        return;
      }
      fillAssistantMessage(thinkingNode, {
        body: resultBodyHtml(result, context),
        related: followUpChipsHtml(result?.followUps),
        actions: messageActionsHtml(),
        keepTraces: true,
        skipGenUIMount: Boolean(schema),
        animate: false
      });
      if (schema) {
        await streamGenUI(thinkingNode, schema, !reduceMotion);
      }
      if (genId !== generation) {
        return;
      }
      appendThreadMessage({
        id: thinkingId,
        senderType: "other",
        text: result?.leadIn || result?.text || "",
        schema,
        thinking: result?.thinking || [],
        followUps: result?.followUps || [],
        timestamp: Date.now(),
        status: "sent"
      });
      window.KNAgenticSpark?.setState?.("idle");
    } catch (_error) {
      if (genId !== generation) {
        return;
      }
      fillAssistantMessage(document.getElementById(thinkingId), {
        body: "<p>I could not process that request right now. Please try again.</p>",
        actions: messageActionsHtml()
      });
      appendThreadMessage({
        id: thinkingId,
        senderType: "other",
        text: "I could not process that request right now. Please try again.",
        timestamp: Date.now(),
        status: "error"
      });
      window.KNAgenticSpark?.setState?.("idle");
    } finally {
      if (genId === generation) {
        pendingThinkingId = null;
        isAsking = false;
        setThreadGenerating(false);
      }
    }
  }

  function highlightSidebarChat(chatId) {
    document.querySelectorAll(".side-nav-chat-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });
    const item = document.querySelector(`[data-chat-id="${CSS.escape(chatId || "")}"] [data-agentic-chat-item]`);
    item?.classList.add("is-active");
    item?.setAttribute("aria-current", "true");
  }

  function consumeExpandHandoff() {
    const key = storeApi()?.EXPAND_HANDOFF_KEY || "kn-assist-expand-handoff";
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }
      window.sessionStorage.removeItem(key);
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function openExpandedPanelThread(handoff, thread) {
    generation += 1;
    streamAbort?.abort();
    streamAbort = null;
    isAsking = false;
    pendingThinkingId = null;
    lastStreamSchema = null;
    setThreadGenerating(false);

    activeThreadId = handoff?.threadId || thread?.id || readActiveThreadId();
    writeActiveThreadId(activeThreadId);
    clearThreadHeaderLock();

    const { messages, threadInput, threadForm } = els();
    if (messages) {
      messages.innerHTML = "";
    }
    if (threadInput) {
      threadInput.value = "";
      autoResizeTextarea(threadInput);
      clearComposerFiles(composerRoot(threadForm));
    }

    const ctx = handoff?.context || thread?.contextMeta || {};
    const displayTitle = handoff?.title || ctx.headline || ctx.title || thread?.title || "Conversation";
    showThread(displayTitle);

    const schema =
      window.KNAssistCore?.contextConnectionSchema?.(ctx, { expanded: true }) ||
      window.KNGenUI?.textSchema?.(
        "Your side-panel conversation continues here with more room.",
        window.KNAssistCore?.lookingAtLine?.(ctx) || displayTitle
      ) ||
      null;
    const msgId = `ctx-${Date.now()}`;
    appendMessages(assistantMessageHtml(`<div class="kn-genui" data-kn-genui></div>`, msgId, messageActionsHtml()), {
      animate: false,
      scroll: false
    });
    if (schema) {
      window.KNGenUI?.mount(document.getElementById(msgId)?.querySelector("[data-kn-genui]"), schema, {
        animate: !prefersReducedMotion()
      });
    }
    scrollThreadMessages({ force: true });
    announceThread(displayTitle);
    window.KNAgenticSpark?.setState?.("idle");
    highlightSidebarChat(activeThreadId);
  }

  function restoreThread(thread) {
    if (!thread) {
      return false;
    }
    activeThreadId = thread.id || activeThreadId;
    clearThreadHeaderLock();
    const { messages, threadInput, threadForm } = els();
    if (messages) {
      messages.innerHTML = "";
    }
    if (threadInput) {
      threadInput.value = "";
      autoResizeTextarea(threadInput);
      clearComposerFiles(composerRoot(threadForm));
    }
    showThread(thread.title);
    let lastAssistantId = null;
    (thread.messages || []).forEach((msg) => {
      if (msg.senderType === "self") {
        appendMessages(userMessageHtml(msg.text, msg.attachments, { id: msg.id, status: msg.status, errorText: msg.errorText }), {
          animate: false,
          scroll: false
        });
        return;
      }
      lastAssistantId = msg.id;
      const schema =
        msg.schema ||
        (msg.text && window.KNGenUI?.schemaFromResult ? window.KNGenUI.schemaFromResult({ mode: "text", text: msg.text }) : null);
      const body = schema?.components?.length
        ? `<div class="kn-genui" data-kn-genui></div>`
        : window.KNAssistant?.renderText
          ? window.KNAssistant.renderText(msg.text, { kind: "agentic-broker" })
          : `<p>${escapeHtml(msg.text || "")}</p>`;
      const traces = msg.thinking?.length
        ? window.KNAssistant?.thinkingPanel?.(msg.thinking, false, { status: "complete" }) || ""
        : "";
      appendMessages(assistantMessageHtml(body, msg.id, messageActionsHtml(), { traces }), { animate: false, scroll: false });
      if (schema?.components?.length) {
        window.KNGenUI?.mount(document.getElementById(msg.id)?.querySelector("[data-kn-genui]"), schema, {
          animate: !prefersReducedMotion()
        });
      }
    });
    if (lastAssistantId) {
      const lastAssistant = (thread.messages || []).find((item) => item.id === lastAssistantId);
      attachRelatedChipsToMessage(lastAssistantId, deriveThreadFollowUps(thread, lastAssistant?.followUps));
    }
    scrollThreadMessages({ force: true });
    announceThread(thread.title);
    window.KNAgenticSpark?.setState?.("idle");
    highlightSidebarChat(thread.id);
    return true;
  }

  function openHistoryChat(chatId) {
    generation += 1;
    streamAbort?.abort();
    streamAbort = null;
    isAsking = false;
    pendingThinkingId = null;
    lastStreamSchema = null;
    setThreadGenerating(false);
    const store = readThreadStore();
    const live = findThread(store, chatId);
    const seededEntry = CHAT_HISTORY[chatId];

    const finishRestore = (thread, entry) => {
      const session = thread.session || sessionForSeededChat(chatId, entry || {});
      const ensureBroker = () => {
        const path = (location.hash || "").split("?")[0];
        if (path === "#agentic-broker" || path === "#/agentic-broker") {
          return Promise.resolve();
        }
        if (typeof window.setRouteHash === "function") {
          return window.KNAgentSession?.restore?.({ routeHash: "#agentic-broker" }, { navigate: true }) || Promise.resolve();
        }
        location.hash = "#agentic-broker";
        return Promise.resolve();
      };
      ensureBroker().then(() => {
        const restore = window.KNAgentSession?.restore?.(session, { chatId, navigate: false }) || Promise.resolve();
        return restore;
      }).then(() => {
        if (session.contextMeta) {
          thread.contextMeta = session.contextMeta;
        }
        activeThreadId = thread.id;
        writeActiveThreadId(activeThreadId);
        restoreThread(thread);
        renderChatGroups();
        highlightSidebarChat(thread.id);
      });
    };

    if (live) {
      finishRestore(live, seededEntry);
      return;
    }
    if (!seededEntry) {
      showKnToast?.({ content: "That conversation could not be found.", color: "notice" });
      return;
    }
    const persisted = {
      id: chatId,
      title: seededEntry.title,
      userId: brokerUserId(),
      createdAt: Date.now() - seededEntry.daysAgo * 86400000,
      updatedAt: Date.now() - seededEntry.daysAgo * 86400000,
      session: sessionForSeededChat(chatId, seededEntry),
      messages: [
        {
          id: `${chatId}-user`,
          senderType: "self",
          text: seededEntry.question,
          timestamp: Date.now() - seededEntry.daysAgo * 86400000,
          status: "sent"
        },
        {
          id: `${chatId}-assistant`,
          senderType: "other",
          text: seededEntry.answer,
          timestamp: Date.now() - seededEntry.daysAgo * 86400000,
          status: "sent"
        }
      ]
    };
    persistThread(persisted, { touchUpdatedAt: false });
    finishRestore(persisted, seededEntry);
  }

  function downloadStubHtml(filename) {
    return `<button type="button" class="ai-download-stub" data-agentic-home-unavailable="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>
      <span>${escapeHtml(filename)}</span>
      <svg class="ai-download-stub__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v13M6 12l6 6 6-6"/></svg>
    </button>`;
  }

  const RECIPE_PROMPT = "Find a clear-to-file entry I can hand off today.";
  const RECIPE_SUCCESS_HTML =
    "<p>KX-M3Q8-21 is clear to file. Duty is estimated and ready — I can hand this off to your queue whenever you are.</p>";
  const RECIPE_THINKING_ID = "agentic-spark-recipe-thinking";

  function ensureRecipeThread() {
    const { messages } = els();
    if (!hasThreadMessages()) {
      enterConversationMode("Spark preview");
    }
    if (messages && !messages.querySelector(".agentic-thread-msg--user")) {
      appendMessages(userMessageHtml(RECIPE_PROMPT));
    }
  }

  function recipeThinkingBubble() {
    document.getElementById(RECIPE_THINKING_ID)?.closest(".agentic-thread-msg")?.remove();
    const reduceMotion = prefersReducedMotion();
    appendMessages(
      assistantMessageHtml(reduceMotion ? thinkingDotsHtml() : rollingLoadingTextHtml(), RECIPE_THINKING_ID, "", {
        loading: true,
      }),
    );
  }

  function cancelInFlightAsk() {
    streamAbort?.abort();
    streamAbort = null;
    generation += 1;
    isAsking = false;
    pendingThinkingId = null;
    setThreadGenerating(false);
  }

  function playSparkRecipe(state) {
    // Preview-only. Default Assist must not honor recipe clicks without ?preview=spark-states.
    if (new URLSearchParams(window.location.search).get("preview") !== "spark-states") {
      return;
    }
    if (state === "empty") {
      newChat();
      return;
    }
    if (state === "prompt") {
      cancelInFlightAsk();
      askInline("Show my personal dashboard");
      return;
    }
    if (state === "stop") {
      if (isAsking || streamAbort) {
        stopGeneration();
      } else {
        window.KNAgenticSpark?.setState?.("idle");
      }
      document.querySelectorAll("[data-spark-recipe-state]").forEach((btn) => {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-spark-recipe-state") === "stop" ? "true" : "false");
      });
      return;
    }
    if (state === "success") {
      generation += 1;
      streamAbort?.abort();
      streamAbort = null;
      isAsking = false;
      setThreadGenerating(false);
      ensureRecipeThread();
      const hostId = pendingThinkingId || RECIPE_THINKING_ID;
      if (!document.getElementById(hostId) && !document.getElementById(RECIPE_THINKING_ID)) {
        recipeThinkingBubble();
      }
      const node = document.getElementById(pendingThinkingId) || document.getElementById(RECIPE_THINKING_ID) || els().messages?.querySelector(".agentic-thread-msg--assistant .kn-chat-msg");
      const result = window.KNAssistant?.answer?.("Show my personal dashboard");
      const schema = structuredSchema(result);
      if (node && schema) {
        fillAssistantMessage(node, {
          body: resultBodyHtml(result, { kind: "agentic-broker" }),
          actions: messageActionsHtml(),
          related: followUpChipsHtml(result?.followUps)
        });
        window.KNGenUI?.mount(node.querySelector("[data-kn-genui]"), schema, { animate: false });
      } else if (node) {
        fillAssistantMessage(node, {
          body: RECIPE_SUCCESS_HTML,
          actions: messageActionsHtml()
        });
      }
      pendingThinkingId = null;
      announceThread("Handoff ready");
      window.KNAgenticSpark?.setState?.("success");
      return;
    }
    if (state === "chat") {
      generation += 1;
      streamAbort?.abort();
      streamAbort = null;
      isAsking = false;
      setThreadGenerating(false);
      ensureRecipeThread();
      if (!els().messages?.querySelector(".agentic-thread-msg--assistant")) {
        appendMessages(assistantMessageHtml(RECIPE_SUCCESS_HTML, undefined, messageActionsHtml()));
      }
      window.KNAgenticSpark?.setState?.("idle");
    }
  }

  function newChat() {
    streamAbort?.abort();
    streamAbort = null;
    generation += 1;
    isAsking = false;
    pendingThinkingId = null;
    lastStreamSchema = null;
    setThreadGenerating(false);
    activeThreadId = "";
    writeActiveThreadId("");
    clearThreadHeaderLock();
    showNewChat();
    document.querySelectorAll(".side-nav-chat-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });
  }

  function handleClick(event) {
    const recipeBtn = event.target.closest("[data-spark-recipe-state]");
    if (recipeBtn) {
      event.preventDefault();
      playSparkRecipe(recipeBtn.getAttribute("data-spark-recipe-state"));
      return;
    }
    const uploadBtn = event.target.closest("[data-chat-upload]");
    if (uploadBtn) {
      event.preventDefault();
      composerRoot(uploadBtn)?.querySelector("[data-chat-file-input]")?.click();
      return;
    }
    const reuploadBtn = event.target.closest("[data-chat-file-reupload]");
    if (reuploadBtn) {
      event.preventDefault();
      reuploadComposerFile(composerRoot(reuploadBtn), reuploadBtn.getAttribute("data-chat-file-reupload"));
      return;
    }
    const dismissBtn = event.target.closest("[data-chat-file-dismiss]");
    if (dismissBtn) {
      event.preventDefault();
      removeComposerFile(composerRoot(dismissBtn), dismissBtn.getAttribute("data-chat-file-dismiss"), { dismiss: true });
      return;
    }
    const removeBtn = event.target.closest("[data-chat-file-remove]");
    if (removeBtn) {
      event.preventDefault();
      removeComposerFile(composerRoot(removeBtn), removeBtn.getAttribute("data-chat-file-remove"));
      return;
    }
    const errorDismiss = event.target.closest("[data-agentic-error-dismiss]");
    if (errorDismiss) {
      event.preventDefault();
      hideComposerValidationError(errorDismiss);
      return;
    }
    const stopBtn = event.target.closest('.agentic-home__send[data-generating="true"]');
    if (stopBtn) {
      event.preventDefault();
      stopGeneration();
      return;
    }
    const copyBtn = event.target.closest("[data-agentic-copy]");
    if (copyBtn) {
      event.preventDefault();
      const bodyClone = copyBtn.closest(".ai-msg")?.querySelector(".ai-msg__body")?.cloneNode(true);
      bodyClone?.querySelectorAll(".ai-download-stub").forEach((el) => el.remove());
      const text = bodyClone?.innerText.trim() || "";
      navigator.clipboard
        ?.writeText(text)
        .then(() => {
          copyBtn.classList.add("is-copied");
          // FLAG: 1600ms copied hold — no delay token.
          setTimeout(() => copyBtn.classList.remove("is-copied"), 1600);
        })
        .catch(() => {});
      return;
    }
    const feedbackBtn = event.target.closest("[data-agentic-feedback]");
    if (feedbackBtn) {
      event.preventDefault();
      const group = feedbackBtn.closest(".agentic-msg-actions");
      const wasPressed = feedbackBtn.getAttribute("aria-pressed") === "true";
      group?.querySelectorAll("[data-agentic-feedback]").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
      feedbackBtn.setAttribute("aria-pressed", wasPressed ? "false" : "true");
      return;
    }
    const retryBtn = event.target.closest("[data-agentic-retry]");
    if (retryBtn) {
      event.preventDefault();
      const id = retryBtn.getAttribute("data-agentic-retry");
      const store = readThreadStore();
      const thread = findThread(store, activeThreadId);
      const msg = thread?.messages?.find((item) => item.id === id);
      if (msg) {
        askInline(msg.text, msg.attachments, { userMessageId: msg.id });
      }
      return;
    }
    if (window.KNNextActions?.handleClick?.(event, {
      onPrompt: (query) => askInline(query),
      onExpandHome: () => {
        homePromptsExpanded = true;
        renderCards();
      }
    })) {
      return;
    }
    const prompt = event.target.closest("[data-agentic-thread-prompt]");
    if (prompt) {
      event.preventDefault();
      askInline(prompt.getAttribute("data-agentic-thread-prompt"));
      return;
    }
    const unavailable = event.target.closest("[data-agentic-home-unavailable]");
    if (unavailable) {
      event.preventDefault();
      showKnToast({ content: "Not available in this sample.", color: "notice" });
      return;
    }
  }

  const MIN_QUESTION_LENGTH = 3;

  function composerRoot(from) {
    if (!from) {
      return null;
    }
    if (from.matches?.("[data-kn-component='chat-input']")) {
      return from;
    }
    return from.closest("[data-kn-component='chat-input']") || from;
  }

  function showComposerValidationError(from, message) {
    const root = composerRoot(from);
    const banner = root?.querySelector("[data-agentic-error]");
    const text = banner?.querySelector("[data-agentic-error-text]");
    const field = root?.querySelector("textarea");
    if (!banner || !text) {
      return;
    }
    text.textContent = message;
    banner.classList.add("is-visible");
    if (field) {
      field.setAttribute("aria-invalid", "true");
      if (text.id) {
        field.setAttribute("aria-describedby", text.id);
      }
    }
  }

  function hideComposerValidationError(from) {
    const root = composerRoot(from);
    const banner = root?.querySelector("[data-agentic-error]");
    const field = root?.querySelector("textarea");
    banner?.classList.remove("is-visible");
    if (field) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
  }

  function handleSubmit(event) {
    const threadForm = event.target.closest("#agentic-thread-form");
    if (!threadForm) {
      return;
    }
    event.preventDefault();
    if (isAsking) {
      return;
    }
    const form = threadForm;
    const root = composerRoot(form);
    const input = document.getElementById("agentic-thread-input");
    const question = (input?.value || "").trim();
    const files = composerState(root).files.slice();
    if (isComposerSubmitDisabled(root)) {
      return;
    }
    if (!question && !files.length) {
      showComposerValidationError(form, "Add a message or attach a file to continue.");
      return;
    }
    if (question && question.length < MIN_QUESTION_LENGTH && !files.length) {
      showComposerValidationError(form, "That's too short to be a real question — try adding a bit more detail.");
      return;
    }
    hideComposerValidationError(form);
    if (input) {
      input.value = "";
      autoResizeTextarea(input);
    }
    const readyFiles = files.filter((file) => file.status === "success");
    clearComposerFiles(root);
    syncGhostSuggestion();
    askInline(question, readyFiles);
  }

  function autoResizeTextarea(textarea) {
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight) || Infinity;
    const next = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${next}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function handleInput(event) {
    const input = event.target.closest("#agentic-thread-input");
    if (!input) {
      return;
    }
    autoResizeTextarea(input);
    const root = composerRoot(input);
    syncComposerSubmit(root);
    hideComposerValidationError(root);
    syncGhostSuggestion();
  }

  function handleFileInputChange(event) {
    const input = event.target.closest("[data-chat-file-input]");
    if (!input) {
      return;
    }
    const root = composerRoot(input);
    addComposerFiles(root, Array.from(input.files || []));
    input.value = "";
  }

  function handleComposerPaste(event) {
    const field = event.target.closest("#agentic-thread-input");
    if (!field) {
      return;
    }
    const clipboardFiles = Array.from(event.clipboardData?.files || []);
    if (!clipboardFiles.length) {
      return;
    }
    event.preventDefault();
    addComposerFiles(composerRoot(field), clipboardFiles);
  }

  function handleComposerMouseDownCapture(event) {
    const card = event.target.closest(".kn-chat-input__card");
    if (!card || event.target.closest("textarea")) {
      return;
    }
    event.preventDefault();
  }

  let bound = false;
  let wasOnPage = false;

  document.addEventListener("kn-genui-action", (event) => {
    const detail = event.detail || {};
    const hts = detail.data?.hts;
    if (detail.type === "apply-hts-confirm" && detail.data && event.target?.closest?.("#agentic-broker-page")) {
      const data = detail.data;
      const confirmed = window.confirm(
        `Apply HS ${data.hts} to line ${data.lineNum || ""} on entry ${data.entryNumber || data.entryId}?\n\nThis writes an agent_draft patch — you still review it on the entry form before filing.`
      );
      if (!confirmed) {
        return;
      }
      const result = window.KNClassificationAssistant?.applyConfirmedClassification?.(data);
      showKnToast?.({
        content: result?.ok
          ? `HS ${data.hts} applied as agent_draft on line ${data.lineNum}. Review the purple flag on the entry form.`
          : result?.error || "Could not apply classification.",
        color: result?.ok ? "positive" : "negative"
      });
      return;
    }
    if ((detail.type === "apply-hts" || hts) && event.target?.closest?.("#agentic-broker-page")) {
      showKnToast?.({
        content: hts
          ? `HS ${hts} is noted on this thread. Open an entry to apply with confirmation.`
          : "Classification noted. Apply from an open entry form.",
        color: "notice"
      });
      return;
    }
    const prompt = detail.data?.prompt;
    if (!prompt) {
      return;
    }
    if (event.target?.closest?.("#ai-assistant-panel")) {
      return;
    }
    askInline(prompt);
  });

  function init() {
    renderCards();
    renderChatGroups();
    initThreadGhost();
    window.addEventListener("kn-thread-store-change", () => {
      const { empty } = els();
      if (!empty || empty.hidden) {
        activeThreadId = readActiveThreadId();
      }
      renderChatGroups();
    });
    if (!bound) {
      const page = document.getElementById("agentic-broker-page");
      if (!page) {
        return;
      }
      page.addEventListener("click", handleClick);
      page.addEventListener("submit", handleSubmit);
      page.addEventListener("input", handleInput);
      page.addEventListener("change", handleFileInputChange);
      page.addEventListener("paste", handleComposerPaste);
      page.addEventListener("keydown", handleComposerKeydown);
      page.addEventListener("mousedown", handleComposerMouseDownCapture, true);
      bound = true;
    }
    window.KNAgenticSpark?.init?.();
  }

  function sync() {
    syncGreeting();
    renderCards();
    window.KNAgenticSpark?.sync?.(true);
    if (!wasOnPage) {
      activeThreadId = readActiveThreadId();
      const handoff = consumeExpandHandoff();
      if (handoff?.threadId) {
        activeThreadId = handoff.threadId;
        writeActiveThreadId(activeThreadId);
        const store = readThreadStore();
        const thread = findThread(store, handoff.threadId);
        if (thread?.messages?.length) {
          restoreThread(thread);
        } else {
          openExpandedPanelThread(handoff, thread);
        }
        renderChatGroups();
        wasOnPage = true;
        return;
      }
      const store = readThreadStore();
      const live = activeThreadId ? findThread(store, activeThreadId) : null;
      if (live?.messages?.length) {
        restoreThread(live);
      } else {
        showNewChat();
      }
      renderChatGroups();
    }
    wasOnPage = true;
  }

  function suspend() {
    wasOnPage = false;
    if (isAsking || streamAbort) {
      stopGeneration();
    }
    writeActiveThreadId(activeThreadId);
    stopGhostCycle();
    window.KNAgenticSpark?.sync?.(false);
  }

  window.KNAgenticBroker = { init, sync, suspend, newChat, openHistoryChat, playRecipe: playSparkRecipe, historyEntries };
})();
