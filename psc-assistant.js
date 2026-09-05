(() => {
  "use strict";

  const INTENT = /post\s*summary\s*correction/i;

  const ENTRY_NUMBER_PATTERN =
    /\b(?:entry\s*(?:#|number)?\s*)?((?:\d{3}-\d{8})|(?:KH5|6WL|CW|BII)-[\w-]+|\d{8,})\b/i;

  const DEMO_ACCEPTED = [
    {
      entryId: "entry-3",
      entryNumber: "KH5-03038401",
      company: "TEST COMPANY 1",
      transactionId: "KN-CDML-44",
      filingDate: "May 18, 2024",
      reason: "HTS reclassification — 314-day window",
      pscId: "psc-1"
    },
    {
      entryId: "entry-2",
      entryNumber: "6WL-85800822",
      company: "TEST COMPANY 1",
      transactionId: "KN-CDML-43",
      filingDate: "Aug 21, 2025",
      reason: "Value adjustment (transfer-pricing true-up)",
      pscId: "psc-2"
    }
  ];

  function originalEsAccepted(entry) {
    const summary = String(entry?.entrySummary || "").trim().toUpperCase();
    return summary === "FILED" || summary === "ACCEPTED";
  }

  function pscForEntry(entry, pscRows) {
    return (
      pscRows.find((row) => row.entryLinkId === entry.id) ||
      pscRows.find((row) => row.entryNumber === entry.entryNumber) ||
      null
    );
  }

  function reasonForPsc(psc) {
    const status = String(psc?.pscStatus || "").trim();
    if (/none/i.test(status)) {
      return "Correction not yet filed — window open";
    }
    if (/in process/i.test(status)) {
      return "Value adjustment in progress";
    }
    if (/ready/i.test(status)) {
      return "USMCA preference now qualifies";
    }
    return "Post-summary correction eligible";
  }

  function collectAcceptedEntries() {
    const entries = window.KNUsEntry?.list?.() || [];
    const pscs = window.KNUsPsc?.list?.() || [];
    const seen = new Set();
    const rows = [];

    entries
      .filter(originalEsAccepted)
      .sort((a, b) => (b.filingSort || 0) - (a.filingSort || 0))
      .forEach((entry) => {
        if (seen.has(entry.id)) {
          return;
        }
        seen.add(entry.id);
        const psc = pscForEntry(entry, pscs);
        rows.push({
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          company: entry.companyName,
          transactionId: entry.transactionId,
          filingDate: entry.filingDate || psc?.filingDate || "—",
          originalEs: "ACCEPTED",
          reason: psc ? reasonForPsc(psc) : "Original entry summary accepted by CBP",
          pscId: psc?.id || ""
        });
      });

    DEMO_ACCEPTED.forEach((demo) => {
      if (seen.has(demo.entryId)) {
        return;
      }
      const live = entries.find((row) => row.id === demo.entryId);
      seen.add(demo.entryId);
      rows.push({
        entryId: demo.entryId,
        entryNumber: live?.entryNumber || demo.entryNumber,
        company: live?.companyName || demo.company,
        transactionId: live?.transactionId || demo.transactionId,
        filingDate: live?.filingDate || demo.filingDate,
        originalEs: "ACCEPTED",
        reason: demo.reason,
        pscId: demo.pscId
      });
    });

    return rows.slice(0, 8);
  }

  function workstationHref(row) {
    const params = new URLSearchParams({ mode: "psc" });
    if (row.pscId) {
      params.set("pscId", row.pscId);
    }
    return `#transaction-us-entry/filing/${encodeURIComponent(row.entryId)}?${params}`;
  }

  function findByReference(question) {
    const q = String(question || "").trim();
    const match = q.match(ENTRY_NUMBER_PATTERN);
    const needle = match?.[1] || q;
    const accepted = collectAcceptedEntries();
    return (
      accepted.find(
        (row) =>
          row.entryNumber === needle ||
          row.entryId === needle ||
          row.transactionId === needle
      ) ||
      accepted.find(
        (row) =>
          row.entryNumber.includes(needle) ||
          row.transactionId.includes(needle)
      ) ||
      null
    );
  }

  function entityCard(row) {
    return {
      component: "CARD",
      title: row.entryNumber,
      description: `${row.company} · ${row.transactionId}`,
      children: [
        { component: "BADGE", text: "Original ES: ACCEPTED", color: "positive" },
        { component: "BADGE", text: "PSC", color: "notice" },
        { component: "TEXT", content: row.reason },
        {
          component: "BUTTON",
          text: "Open correction workstation",
          action: { type: "navigate", data: { href: workstationHref(row) } }
        }
      ]
    };
  }

  function answer(question) {
    if (!INTENT.test(String(question || "").trim())) {
      return null;
    }

    const accepted = collectAcceptedEntries();
    const specific = findByReference(question);

    if (specific && ENTRY_NUMBER_PATTERN.test(String(question || ""))) {
      return {
        mode: "schema",
        title: "Post Summary Correction",
        thinking: [
          "Matched an accepted entry summary on file with CBP",
          "Routing to workstation in PSC mode — not a fresh filing",
          "Corrections log as PSC amendments in the audit trail"
        ],
        leadIn: `**${specific.entryNumber}** (${specific.company}) — original entry summary **ACCEPTED**. Open the workstation to draft the correction; submit requires your explicit click.`,
        schema: {
          components: [
            { component: "TEXT", content: "# Post Summary Correction" },
            entityCard(specific),
            {
              component: "ALERT",
              color: "notice",
              title: "Amends a record CBP already has",
              description:
                "PSC patches carry **regulatory meaning** distinct from pre-submission edits. Transmit uses **Submit correction to CBP** with an extra confirmation step."
            },
            {
              component: "BUTTON",
              text: "Open correction workstation",
              action: { type: "navigate", data: { href: workstationHref(specific) } }
            }
          ]
        },
        followUps: [
          { label: "Other accepted entries", prompt: "Post Summary Corrections" },
          { label: "All items due today", prompt: "All items due today" }
        ]
      };
    }

    return {
      mode: "schema",
      title: "Post Summary Corrections",
      thinking: [
        "Listed recently accepted entry summaries eligible for PSC",
        "Each row opens workstation mode with Original ES: ACCEPTED status",
        "No correction is filed from chat — explicit workstation submit only"
      ],
      leadIn:
        accepted.length > 1
          ? `**${accepted.length} recently accepted entries** can be corrected inside the 314-day PSC window. Which entry needs a correction?`
          : accepted.length === 1
            ? `**${accepted[0].entryNumber}** is the most recent accepted entry on file. Open it to draft a PSC — or name another entry number.`
            : "No accepted entry summaries matched in the demo queue. Name an entry number to continue.",
      schema: {
        components: [
          { component: "TEXT", content: "# Post Summary Corrections" },
          {
            component: "TEXT",
            content:
              "Select an **accepted** entry to correct. The workstation status bar reads **PSC — Original ES: ACCEPTED** so a correction never looks like a fresh filing."
          },
          accepted.length
            ? {
                component: "GRID",
                columns: 1,
                gap: "small",
                children: accepted.map(entityCard)
              }
            : { component: "TEXT", content: "No accepted entries in the demo data." },
          accepted.length
            ? {
                component: "TABLE",
                headers: ["Entry", "Importer", "Accepted", "Reason", "Open"],
                rows: accepted.map((row) => [
                  { component: "TEXT", value: row.entryNumber },
                  { component: "TEXT", value: row.company },
                  { component: "BADGE", text: row.originalEs, color: "positive" },
                  { component: "TEXT", value: row.reason },
                  {
                    component: "BUTTON",
                    text: "Select",
                    action: { type: "navigate", data: { href: workstationHref(row) } }
                  }
                ])
              }
            : { component: "SPACER" },
          {
            component: "ALERT",
            color: "information",
            title: "Which entry needs correction?",
            description:
              "Reply with an **entry number** (e.g. KH5-03038401) if the list does not include the row you need. Klear Agent will route to PSC workstation mode."
          },
          {
            component: "ALERT",
            color: "notice",
            title: "Audit trail: PSC amendment",
            description:
              "Field edits in PSC mode write **`patch_type: psc_amendment`** — not pre-submission edits. Transmit reuses the filing action with **Submit correction to CBP** copy and a second confirmation."
          },
          {
            component: "BUTTON",
            text: "Open US PSC list",
            action: { type: "navigate", data: { href: "#transaction-us-psc" } }
          }
        ]
      },
      followUps: [
        { label: "All items due today", prompt: "All items due today" },
        { label: "Working queue", prompt: "Recent entries in my queue" }
      ]
    };
  }

  window.KNPscAssistant = {
    answer,
    collectAcceptedEntries,
    workstationHref,
    isIntent: (question) => INTENT.test(String(question || ""))
  };
})();
