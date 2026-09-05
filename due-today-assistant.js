(() => {
  "use strict";

  const INTENT = /\ball\s*items?\s*due\s*today|items?\s*due\s*today|what'?s?\s+due\s+today\b/i;

  const URGENCY = Object.freeze({
    late: 1000,
    due_today: 500,
    due_soon: 100
  });

  function todayLong() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }

  function collectDueItems() {
    const items = [];
    const seen = new Set();

    function push(item) {
      const key = `${item.type}:${item.title}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      items.push(item);
    }

    const isfRows = (window.KNUsIsf?.list?.() || []);
    const lateIsf = isfRows.find((row) => row.transactionId === "ISF-021D-5");
    if (lateIsf) {
      push({
        type: "isf",
        typeLabel: "ISF",
        title: lateIsf.transactionId,
        company: lateIsf.companyName,
        detail: `Vessel **${lateIsf.vesselName || "—"}** · MBL ${lateIsf.mbl || "—"}`,
        dueReason:
          "**Regulatory due:** 24 hours before loading — this vessel lading window passed **2 hours ago**. Not the same as an internal ops target.",
        urgency: "late",
        urgencyLabel: "Late · past loading cutoff",
        href: `#transaction-us-isf/history/${encodeURIComponent(lateIsf.id)}`,
        actionLabel: "Open ISF filing"
      });
    }

    isfRows
      .filter((row) => row.statusChip === "pending" || row.status === "NEW")
      .slice(0, 3)
      .forEach((row) => {
        if (lateIsf && row.id === lateIsf.id) {
          return;
        }
        push({
          type: "isf",
          typeLabel: "ISF",
          title: row.transactionId,
          company: row.companyName,
          detail: `MBL **${row.mbl || "—"}** · ${row.vesselName || "Ocean"}`,
          dueReason:
            "**Regulatory due today:** ISF must be on file **24 hours before loading** (CBP). Cutoff closes tonight.",
          urgency: "due_today",
          urgencyLabel: "Due today",
          href: `#transaction-us-isf/history/${encodeURIComponent(row.id)}`,
          actionLabel: "Open ISF filing"
        });
      });

    const stmt =
      window.KNPaymentUsStatements?.find?.("26-0903-C") ||
      (window.KNPaymentUsStatements?.list?.() || []).find((row) => row.id === "26-0903-C");
    if (stmt) {
      push({
        type: "statement",
        typeLabel: "Statement",
        title: stmt.id,
        company: stmt.company,
        detail: `Periodic daily statement · ${window.KNPaymentUsStatements?.money?.(stmt.totalDue) || stmt.totalDue} due`,
        dueReason:
          stmt.achStatus === "missing"
            ? "**Finance due today:** statement posts on today's cycle — **ACH not authorized** on file. Approval is explicit on the statement screen."
            : "**Finance due today:** periodic daily statement posts on today's ACH cycle.",
        urgency: "due_today",
        urgencyLabel: stmt.achStatus === "missing" ? "Due today · ACH gap" : "Due today",
        href: `#payment-us-statements/approval/${encodeURIComponent(stmt.id)}`,
        actionLabel: "Open statement approval"
      });
    }

    const entries = window.KNUsEntry?.list?.() || [];
    const lateEntry = entries.find((row) => row.statusChip === "hold" || /hold/i.test(row.entrySummary || ""));
    if (lateEntry) {
      push({
        type: "entry",
        typeLabel: "Entry",
        title: lateEntry.entryNumber || lateEntry.transactionId,
        company: lateEntry.companyName,
        detail: `${lateEntry.entrySummary || "HOLD"} · ${lateEntry.cargoRelease || "—"}`,
        dueReason: "**Late:** entry summary window passed — escalate before CBP delinquent status.",
        urgency: "late",
        urgencyLabel: "Late · summary overdue",
        href: `#transaction-us-entry/filing/${encodeURIComponent(lateEntry.id)}?queue=working`,
        actionLabel: "Open working queue"
      });
    }

    const entryDue =
      entries.find((row) => row.id === "entry-1" && row.id !== lateEntry?.id) ||
      entries.find((row) => /in progress/i.test(row.entrySummary || "") && row.id !== lateEntry?.id) ||
      entries.find((row) => row.id !== lateEntry?.id);
    if (entryDue) {
      push({
        type: "entry",
        typeLabel: "Entry",
        title: entryDue.entryNumber || entryDue.transactionId,
        company: entryDue.companyName,
        detail: `Transaction **${entryDue.transactionId || entryDue.id}** · ${entryDue.entrySummary || "IN PROGRESS"}`,
        dueReason:
          "**Operational due today:** entry summary filing target on the working queue — internal SLA, not a CBP statutory clock.",
        urgency: "due_today",
        urgencyLabel: "Due today",
        href: `#transaction-us-entry/filing/${encodeURIComponent(entryDue.id)}?queue=working`,
        actionLabel: "Open working queue"
      });
    }

    return items.sort((a, b) => (URGENCY[b.urgency] || 0) - (URGENCY[a.urgency] || 0));
  }

  function typeBadge(type) {
    const colors = { entry: "positive", isf: "information", statement: "notice" };
    return { component: "BADGE", text: type === "entry" ? "Entry" : type === "isf" ? "ISF" : "Statement", color: colors[type] || "neutral" };
  }

  function urgencyBadge(item) {
    const color = item.urgency === "late" ? "negative" : item.urgency === "due_today" ? "notice" : "information";
    return { component: "BADGE", text: item.urgencyLabel || "Due today", color };
  }

  function entityCard(item) {
    return {
      component: "CARD",
      title: item.title,
      description: item.company,
      children: [
        typeBadge(item.type),
        urgencyBadge(item),
        { component: "TEXT", content: item.detail },
        { component: "TEXT", content: item.dueReason },
        {
          component: "BUTTON",
          text: item.actionLabel,
          action: { type: "navigate", data: { href: item.href } }
        }
      ]
    };
  }

  function answer(question) {
    if (!INTENT.test(String(question || "").trim())) {
      return null;
    }
    const items = collectDueItems();
    const late = items.filter((row) => row.urgency === "late");
    const dueToday = items.filter((row) => row.urgency === "due_today");
    const counts = {
      entry: items.filter((row) => row.type === "entry").length,
      isf: items.filter((row) => row.type === "isf").length,
      statement: items.filter((row) => row.type === "statement").length
    };

    return {
      mode: "schema",
      title: "All items due today",
      thinking: [
        "Queried entries, ISF filings, and pending statements for today's window",
        "Ranked already-late items ahead of due-today",
        "Labeled each row by entity type for mixed-list scanning"
      ],
      leadIn:
        late.length > 0
          ? `**${late.length} already late**, **${dueToday.length} due today** across entries, ISF, and statements on **${todayLong()}**. Triage only — open each card in its normal workflow.`
          : `**${items.length}** items due today on **${todayLong()}**. Nothing is actioned from this list.`,
      schema: {
        components: [
          { component: "TEXT", content: "# Due today" },
          {
            component: "TEXT",
            content: `**${counts.entry}** ${counts.entry === 1 ? "entry" : "entries"} · **${counts.isf}** ISF · **${counts.statement}** ${counts.statement === 1 ? "statement" : "statements"} — ranked **most urgent first** (${late.length ? "**late leads**" : "none late yet"}).`
          },
          late.length
            ? {
                component: "ALERT",
                color: "negative",
                title: `${late.length} already late`,
                description: late.map((row) => `**${row.typeLabel}** ${row.title} (${row.company})`).join(" · ")
              }
            : { component: "SPACER" },
          items.length
            ? {
                component: "GRID",
                columns: 1,
                gap: "small",
                children: items.map(entityCard)
              }
            : { component: "TEXT", content: "Nothing due today in the demo queue." },
          {
            component: "ALERT",
            color: "notice",
            title: "Triage only",
            description:
              "Cards route to Working Queue, ISF filing, or Statement Approval — nothing is filed, approved, or updated from this list."
          },
          {
            component: "ALERT",
            color: "information",
            title: "“Due” differs by filing type",
            description:
              "ISF uses the **24-hours-before-loading** regulatory clock. Statements use the **periodic daily / ACH** cycle. Entry targets here are **operational SLAs** — not interchangeable. Confirm definitions with compliance before production."
          },
          {
            component: "BUTTON",
            text: "Open ISF Dashboard",
            action: { type: "navigate", data: { href: "#transaction-us-isf" } }
          },
          {
            component: "BUTTON",
            text: "Open US Statements",
            action: { type: "navigate", data: { href: "#payment-us-statements" } }
          }
        ]
      },
      followUps: [
        { label: "Today's Statements", prompt: "Today's Statements" },
        { label: "Working queue", prompt: "Recent entries in my queue" },
        { label: "ISF Dashboard", prompt: "ISF Dashboard" }
      ]
    };
  }

  window.KNDueTodayAssistant = {
    answer,
    collectDueItems,
    isIntent: (question) => INTENT.test(String(question || ""))
  };
})();
