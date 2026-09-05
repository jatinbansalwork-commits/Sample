(() => {
  "use strict";

  const STATUS_INTENT =
    /\b(isf\s+status|isf\s+filings?\s+(at\s+risk|pending|across)|pending\s+submission|which\s+isf\s+filings?|24[\s-]*hour|pre[\s-]*loading)\b/i;

  const FILE_INTENT = /\b(file\s+(an\s+)?isf|isf\s+for\b|submit\s+isf|complete\s+(the\s+)?isf)\b/i;

  const CONFIRM_INTENT =
    /\b(file\s+it|go\s+ahead|yes[\s,]*file|submit\s+it|just\s+say\s+the\s+word|confirm\s+isf|file\s+the\s+isf)\b/i;

  const PENDING_KEY = "kn-isf-agent-pending-file";
  const PREFILL_KEY = "kn-isf-agent-prefill";

  const URGENCY = Object.freeze({
    late: 1000,
    at_risk: 500,
    pending: 100,
    filed: 0
  });

  const GAP_FIELDS = Object.freeze([
    { id: "containerStuffing", label: "Container stuffing location" },
    { id: "consolidator", label: "Consolidator name" }
  ]);

  const DEMO_FILING = Object.freeze({
    isfId: "isf-10",
    aliases: ["acme corp", "acme", "basf", "cn-ob3m-118", "isf-021d-5"],
    displayCompany: "Acme Corp",
    displayEta: "Apr 12, 2025"
  });

  function listRows() {
    return window.KNUsIsf?.list?.() || [];
  }

  function findRow(needle) {
    const q = String(needle || "").trim().toLowerCase();
    if (!q) {
      return null;
    }
    const demo = DEMO_FILING.aliases.some((alias) => q.includes(alias));
    if (demo) {
      return listRows().find((row) => row.id === DEMO_FILING.isfId) || null;
    }
    return (
      listRows().find(
        (row) =>
          row.id === needle ||
          row.transactionId === needle ||
          row.shipments === needle ||
          String(row.companyName || "").toLowerCase().includes(q) ||
          String(row.mbl || "").toLowerCase().includes(q)
      ) || null
    );
  }

  function displayForRow(row) {
    const demo = row?.id === DEMO_FILING.isfId;
    return {
      company: demo ? DEMO_FILING.displayCompany : row.companyName,
      eta: demo ? DEMO_FILING.displayEta : row.etd || "—"
    };
  }

  function buildPrefill(row) {
    const detail = window.KNIsfDetail?.buildDetail?.(row);
    const manufacturer = detail?.parties?.find((party) => party.id === "manufacturers");
    const merchandise = detail?.merchandise?.[0];
    return {
      importer: row.companyName,
      consignee: row.companyName,
      manufacturer: manufacturer?.name || manufacturer?.fullName || "—",
      mid: manufacturer?.idNumber || "—",
      hts: merchandise?.hts || "—",
      countryOfOrigin: merchandise?.co || row.country || "—"
    };
  }

  function classifyRow(row) {
    if (row.statusChip === "submitted") {
      return {
        bucket: "filed",
        urgency: URGENCY.filed,
        urgencyLabel: row.status || "Filed",
        badgeColor: "positive",
        detail: `Vessel **${row.vesselName || "—"}** · MBL ${row.mbl || "—"}`
      };
    }
    if (row.transactionId === "ISF-021D-5") {
      return {
        bucket: "late",
        urgency: URGENCY.late,
        urgencyLabel: "Late · past 24h cutoff",
        badgeColor: "negative",
        detail: "Regulatory window passed — file immediately or expect CBP hold"
      };
    }
    if (row.status === "REJECTED" || /reject/i.test(row.status || "")) {
      return {
        bucket: "at_risk",
        urgency: URGENCY.at_risk,
        urgencyLabel: "At risk · CBP rejected",
        badgeColor: "negative",
        detail: "Replace-file before vessel loading"
      };
    }
    if (row.statusChip === "pending") {
      return {
        bucket: "pending",
        urgency: URGENCY.pending,
        urgencyLabel: "Pending submission",
        badgeColor: "notice",
        detail: `ETD **${row.etd || "—"}** · MBL ${row.mbl || "—"}`
      };
    }
    return {
      bucket: "filed",
      urgency: URGENCY.filed,
      urgencyLabel: row.status || "On file",
      badgeColor: "information",
      detail: row.mbl || "—"
    };
  }

  function collectStatusRows() {
    return listRows()
      .map((row) => ({ row, ...classifyRow(row) }))
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 10);
  }

  function isfHref(row, { prefill = false } = {}) {
    const params = new URLSearchParams({ view: "edit" });
    if (prefill) {
      params.set("agent", "prefill");
    }
    return `#transaction-us-isf/documents/${encodeURIComponent(row.id)}?${params}`;
  }

  function setPrefill(isfId) {
    try {
      sessionStorage.setItem(`${PREFILL_KEY}:${isfId}`, "1");
      sessionStorage.setItem(PENDING_KEY, isfId);
    } catch (_error) {
      // session storage unavailable — in-memory prefill still works this session
    }
    window.KNIsfDetail?.invalidateDetail?.(isfId);
  }

  function hasPrefill(isfId) {
    try {
      return sessionStorage.getItem(`${PREFILL_KEY}:${isfId}`) === "1";
    } catch (_error) {
      return false;
    }
  }

  function getPendingFileId() {
    try {
      return sessionStorage.getItem(PENDING_KEY) || "";
    } catch (_error) {
      return "";
    }
  }

  function clearPending() {
    const id = getPendingFileId();
    try {
      sessionStorage.removeItem(PENDING_KEY);
      if (id) {
        sessionStorage.removeItem(`${PREFILL_KEY}:${id}`);
      }
    } catch (_error) {
      // ignore
    }
    if (id) {
      window.KNIsfDetail?.invalidateDetail?.(id);
    }
  }

  function markFiled(isfId) {
    const row = listRows().find((item) => item.id === isfId);
    if (!row) {
      return { ok: false, error: "ISF record not found." };
    }
    if (row.statusChip !== "pending") {
      return { ok: false, error: `${row.transactionId} is already on file (${row.status}).` };
    }
    row.status = "SENT";
    row.statusChip = "submitted";
    row.filingDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
    row.filingSort = Date.now();
    clearPending();
    window.dispatchEvent(new Event("hashchange"));
    return { ok: true, row };
  }

  function fileConfirmed(isfId) {
    const id = isfId || getPendingFileId();
    if (!id) {
      return { ok: false, error: "No ISF filing is ready to submit." };
    }
    const row = listRows().find((item) => item.id === id);
    if (!row) {
      return { ok: false, error: "ISF record not found." };
    }
    const display = displayForRow(row);
    const confirmed = window.confirm(
      `Submit ISF-10 for ${row.transactionId} (${display.company}) to CBP?\n\nThis transmits the Importer Security Filing. Klear Agent cannot file without your explicit approval.`
    );
    if (!confirmed) {
      return { ok: false, cancelled: true };
    }
    return markFiled(id);
  }

  function statusCard(item) {
    return {
      component: "CARD",
      title: item.row.transactionId,
      description: `${item.row.companyName} · ${item.row.shipments || "—"}`,
      children: [
        { component: "BADGE", text: "ISF", color: "information" },
        { component: "BADGE", text: item.urgencyLabel, color: item.badgeColor },
        { component: "TEXT", content: item.detail },
        {
          component: "BUTTON",
          text: item.bucket === "filed" ? "Open ISF record" : "Open ISF filing",
          action: { type: "navigate", data: { href: isfHref(item.row) } }
        }
      ]
    };
  }

  function prefillSchema(row) {
    const display = displayForRow(row);
    const prefill = buildPrefill(row);
    setPrefill(row.id);
    return {
      mode: "schema",
      title: "ISF-10 pre-filled",
      thinking: [
        "Read commercial invoice and bill of lading already on the shipment",
        "Mapped importer, consignee, manufacturer, HTS, and country of origin",
        "Flagged container stuffing location and consolidator as document gaps"
      ],
      leadIn: `I pulled the **${display.company}** shipment (ETA **${display.eta}**) and pre-filled the ISF-10 from the commercial invoice and bill of lading already on file — importer of record, consignee, manufacturer (MID), HTS, and country of origin are all in.\n\nTwo fields need your input:\n- **Container stuffing location**\n- **Consolidator name**\n\nNeither appears in the uploaded documents. Once those are set I can file it — **just say the word**.`,
      schema: {
        components: [
          { component: "TEXT", content: "# ISF-10 from documents on file" },
          {
            component: "TABLE",
            headers: ["Field", "Value", "Source"],
            rows: [
              ["Importer of record", prefill.importer, "Commercial Invoice"],
              ["Consignee", prefill.consignee, "Bill of Lading"],
              ["Manufacturer (MID)", `${prefill.manufacturer} · ${prefill.mid}`, "Commercial Invoice"],
              ["HTS", prefill.hts, "Commercial Invoice"],
              ["Country of origin", prefill.countryOfOrigin, "Commercial Invoice"]
            ].map((cells) => cells.map((value) => ({ component: "TEXT", value })))
          },
          {
            component: "ALERT",
            color: "notice",
            title: "2 fields still open",
            description:
              "**Container stuffing location** and **Consolidator name** are not in the uploaded CI/BOL. Open the ISF form to enter them, or confirm filing when ready."
          },
          {
            component: "BUTTON",
            text: "Open ISF filing",
            action: { type: "navigate", data: { href: isfHref(row, { prefill: true }) } }
          },
          {
            component: "BUTTON",
            text: "File ISF-10 to CBP",
            action: { type: "file-isf-confirm", data: { isfId: row.id, transactionId: row.transactionId } }
          }
        ]
      },
      followUps: [
        { label: "ISF status across shipments", prompt: "Which ISF filings are at risk under the 24-hour rule?" },
        { label: "ISF Dashboard", prompt: "ISF Dashboard" }
      ]
    };
  }

  function answerStatus(question) {
    if (!STATUS_INTENT.test(String(question || ""))) {
      return null;
    }
    const items = collectStatusRows();
    const late = items.filter((row) => row.bucket === "late" || row.bucket === "at_risk");
    const pending = items.filter((row) => row.bucket === "pending");
    const filed = items.filter((row) => row.bucket === "filed");

    return {
      mode: "schema",
      title: "ISF status across shipments",
      thinking: [
        "Queried ISF-10 records by filing status",
        "Ranked late and 24-hour at-risk filings ahead of pending and filed",
        "Labeled each row filed, pending, or at risk of the pre-loading deadline"
      ],
      leadIn:
        late.length > 0
          ? `**${late.length} at risk or late**, **${pending.length} pending**, **${filed.length} filed** across active shipments — ranked **most urgent first**.`
          : `**${pending.length} pending** and **${filed.length} filed** ISF-10 records — nothing past cutoff yet.`,
      schema: {
        components: [
          { component: "TEXT", content: "# ISF shipment status" },
          {
            component: "TEXT",
            content:
              "Status buckets: **filed** (on file with CBP), **pending submission**, or **at risk** of the **24-hour pre-loading** deadline."
          },
          late.length
            ? {
                component: "ALERT",
                color: "negative",
                title: `${late.length} need immediate attention`,
                description: late
                  .map((item) => `**${item.row.transactionId}** (${item.row.companyName})`)
                  .join(" · ")
              }
            : { component: "SPACER" },
          {
            component: "GRID",
            columns: 1,
            gap: "small",
            children: items.map(statusCard)
          },
          {
            component: "ALERT",
            color: "information",
            title: "24-hour rule",
            description:
              "ISF-10 must be on file **24 hours before loading**. Triage from this list — filing always requires your explicit go-ahead on the ISF form or confirm button."
          },
          {
            component: "BUTTON",
            text: "Open ISF Transaction Manager",
            action: { type: "navigate", data: { href: "#transaction-us-isf" } }
          }
        ]
      },
      followUps: [
        { label: "File pending ISF", prompt: "File an ISF for the Acme Corp shipment arriving next week." },
        { label: "All items due today", prompt: "All items due today" }
      ]
    };
  }

  function answerFile(question) {
    if (!FILE_INTENT.test(String(question || ""))) {
      return null;
    }
    const q = String(question || "");
    const row =
      findRow(q) ||
      findRow(DEMO_FILING.displayCompany) ||
      listRows().find((item) => item.statusChip === "pending" && item.transactionId === "ISF-021D-5");
    if (!row) {
      return {
        mode: "schema",
        title: "File ISF-10",
        leadIn: "Name a **company**, **MBL**, or **ISF transaction ID** and I'll pre-fill from documents on file.",
        schema: {
          components: [
            { component: "TEXT", content: "# Which shipment?" },
            {
              component: "TEXT",
              content:
                "Example: **File an ISF for the Acme Corp shipment arriving next week.** I'll read CI/BOL and surface the two fields documents never carry."
            }
          ]
        },
        followUps: collectStatusRows()
          .filter((item) => item.bucket !== "filed")
          .slice(0, 2)
          .map((item) => ({
            label: item.row.transactionId,
            prompt: `File ISF for ${item.row.companyName}`
          }))
      };
    }
    return prefillSchema(row);
  }

  function answerConfirm(question) {
    if (!CONFIRM_INTENT.test(String(question || ""))) {
      return null;
    }
    const pendingId = getPendingFileId();
    if (!pendingId) {
      return null;
    }
    const result = fileConfirmed(pendingId);
    if (result.cancelled) {
      return {
        mode: "text",
        text: "ISF filing cancelled — nothing was transmitted to CBP."
      };
    }
    if (!result.ok) {
      return {
        mode: "text",
        text: result.error || "Could not file ISF."
      };
    }
    const row = result.row;
    const display = displayForRow(row);
    return {
      mode: "schema",
      title: "ISF filed",
      thinking: [
        "Confirmed broker approval to transmit ISF-10",
        "Submitted to CBP via ACE",
        "Recorded filing confirmation — not a silent action"
      ],
      leadIn: `**${row.transactionId}** for **${display.company}** is **filed** — transmitted to CBP. You'll see **SENT** on the ISF record; this was not submitted silently.`,
      schema: {
        components: [
          { component: "TEXT", content: "# ISF-10 submitted" },
          {
            component: "ALERT",
            color: "positive",
            title: "Filing confirmed",
            description: `${row.transactionId} · ${row.mbl || "MBL on file"} · status **${row.status}**`
          },
          {
            component: "BUTTON",
            text: "Open ISF record",
            action: { type: "navigate", data: { href: isfHref(row) } }
          },
          {
            component: "BUTTON",
            text: "ISF Dashboard",
            action: { type: "prompt", data: { prompt: "ISF Dashboard" } }
          }
        ]
      },
      followUps: [
        { label: "ISF status", prompt: "Which ISF filings are at risk under the 24-hour rule?" },
        { label: "All items due today", prompt: "All items due today" }
      ]
    };
  }

  function syncFromHash(row) {
    const hash = String(location.hash || "");
    const qs = hash.includes("?") ? hash.split("?")[1].split("#")[0] : "";
    const params = qs ? new URLSearchParams(qs) : new URLSearchParams();
    if (params.get("agent") === "prefill" && row?.id) {
      setPrefill(row.id);
    }
  }

  function answer(question) {
    const q = String(question || "").trim();
    return answerConfirm(q) || answerFile(q) || answerStatus(q);
  }

  window.KNIsfAssistant = {
    answer,
    collectStatusRows,
    buildPrefill,
    displayForRow,
    findRow,
    hasPrefill,
    setPrefill,
    getPendingFileId,
    clearPending,
    fileConfirmed,
    markFiled,
    isfHref,
    syncFromHash,
    isStatusIntent: (question) => STATUS_INTENT.test(String(question || "")),
    isFileIntent: (question) => FILE_INTENT.test(String(question || "")),
    isConfirmIntent: (question) => CONFIRM_INTENT.test(String(question || ""))
  };
})();
