(() => {
  "use strict";

  const INTENT =
    /recent\s+shipments\s+in\s+operations|shipments\s+in\s+operations|missing\s+documents?|document\s+(gaps|completeness)|ops\s+shipments?/i;

  const REQUIRED_DOCS = ["Commercial Invoice", "Bill of Lading", "Packing List", "Arrival Notice"];

  const OPS_SHIPMENTS = [
    {
      id: "ops-vn-441",
      shipmentId: "VN-OB1K-441",
      company: "ILLUMINATE USA LLC",
      eta: "Feb 17, 2025",
      carrier: "ONE (Ocean Network Express)",
      vesselName: "WAN HAI 512",
      mot: "Ocean",
      entryId: "entry-5",
      stage: "Pre-entry · ISF sent",
      received: ["Commercial Invoice", "Packing List"],
      missing: ["Bill of Lading", "Arrival Notice"]
    },
    {
      id: "ops-cn-118",
      shipmentId: "CN-OB3M-118",
      company: "BASF AGRICULTURAL SOLUTIONS INC LLC",
      eta: "May 03, 2025",
      carrier: "Evergreen Line",
      vesselName: "EVER LISSOME",
      mot: "Ocean",
      entryId: "entry-6",
      stage: "Pre-entry · ISF pending",
      received: ["Commercial Invoice"],
      missing: ["Bill of Lading", "Packing List", "Arrival Notice"]
    },
    {
      id: "ops-kr-283",
      shipmentId: "KR-OB0T-283",
      company: "GLOBAL-PAK",
      eta: "Feb 11, 2025",
      carrier: "CMA CGM",
      vesselName: "APL LE HAVRE",
      mot: "Ocean",
      entryId: "entry-4",
      stage: "In bond · entry in progress",
      received: ["Commercial Invoice", "Bill of Lading", "Packing List", "Arrival Notice"],
      missing: []
    },
    {
      id: "ops-kx-10",
      shipmentId: "KX-BCWL-10",
      company: "ILLUMINATE USA, LLC",
      eta: "Aug 14, 2024",
      carrier: "DHL Freight",
      vesselName: "CMA CGM S. WASHINGTON",
      mot: "Truck",
      entryId: "entry-2",
      stage: "Shipment only · no entry filed",
      received: [],
      missing: ["Commercial Invoice", "Bill of Lading", "Packing List", "Arrival Notice"]
    },
    {
      id: "ops-kx-12",
      shipmentId: "KX-BCWL-12",
      company: "TEST COMPANY 1",
      eta: "Oct 05, 2024",
      carrier: "Wan Hai Lines",
      vesselName: "WAN HAI 512",
      mot: "Ocean",
      entryId: "entry-1",
      stage: "Documents in progress",
      received: ["Commercial Invoice", "Bill of Lading"],
      missing: ["Packing List", "Arrival Notice"]
    }
  ];

  function escapeHtml(v) {
    return window.KNAdminUX?.escapeHtml?.(v) ?? String(v ?? "");
  }

  function list() {
    return OPS_SHIPMENTS.map((row) => ({
      ...row,
      completeness: row.missing.length ? (row.received.length ? "partial" : "missing") : "complete",
      missingCount: row.missing.length,
      docStatusLabel: row.missing.length
        ? `${row.missing.length} missing`
        : "Complete"
    }));
  }

  function find(id) {
    const needle = String(id || "").trim();
    return list().find((row) => row.id === needle || row.shipmentId === needle) || null;
  }

  function resolveEntryId(shipment) {
    if (!shipment?.entryId) {
      return "";
    }
    const entries = window.KNUsEntry?.list?.() || [];
    if (entries.some((row) => row.id === shipment.entryId)) {
      return shipment.entryId;
    }
    return shipment.entryId;
  }

  function filingHref(shipment, { upload = false, focusMissing = true } = {}) {
    const entryId = resolveEntryId(shipment);
    if (!entryId) {
      return "#transaction-us-entry";
    }
    const params = new URLSearchParams();
    params.set("panel", "docs");
    if (upload || shipment.missing.length) {
      params.set("upload", "1");
    }
    if (focusMissing && shipment.missing.length) {
      params.set("missing", shipment.missing.map((label) => label.split(" ")[0].toLowerCase()).join(","));
    }
    return `#transaction-us-entry/filing/${encodeURIComponent(entryId)}?${params.toString()}`;
  }

  function isCoordinator() {
    return window.KNPersona?.resolve?.()?.roleKey === "coordinator";
  }

  function docBadge(row) {
    if (!row.missingCount) {
      return { component: "BADGE", text: "Complete", color: "positive" };
    }
    return {
      component: "BADGE",
      text: `${row.missingCount} missing · ${row.missing.slice(0, 2).join(", ")}${row.missing.length > 2 ? "…" : ""}`,
      color: "negative"
    };
  }

  function answer(question) {
    const q = String(question || "").trim();
    if (!INTENT.test(q)) {
      return null;
    }
    const rows = list().sort((a, b) => b.missingCount - a.missingCount || a.eta.localeCompare(b.eta));
    const gaps = rows.filter((row) => row.missingCount);
    const maria = isCoordinator();

    const tableRows = rows.map((row) => {
      const href = filingHref(row, { upload: false });
      return [
        genuiLink(row.shipmentId, href),
        { component: "TEXT", value: row.company },
        { component: "TEXT", value: row.eta },
        { component: "TEXT", value: row.carrier },
        docBadge(row),
        row.missingCount
          ? genuiNav("Upload gap", filingHref(row, { upload: true }))
          : genuiNav("Open docs", href)
      ];
    });

    return {
      mode: "schema",
      title: "Shipments in operations",
      thinking: [
        "Listed pre-entry operations shipments — not filed CBP entries",
        "Ranked document gaps before ETA",
        maria ? "Maria's view: chase or upload — no form edits from this flow" : "Cross-checked TM shipment IDs against entry document folders"
      ],
      leadIn: maria
        ? `**${rows.length}** operations shipments. **${gaps.length}** still have missing documents — that's the loudest signal. Select one to open the **Document Panel** first; you decide what to chase or upload.`
        : `**${rows.length}** recent operations shipments (pre-entry stage). **${gaps.length}** with document gaps.`,
      schema: {
        components: [
          { component: "TEXT", content: "# Shipments in operations" },
          {
            component: "TEXT",
            content:
              "These are **operations shipments** — ISF / in-bond / document intake — **not** full CBP entry summaries. Selecting one opens the workstation with the **Document Panel** prioritized."
          },
          gaps.length
            ? {
                component: "ALERT",
                color: "negative",
                title: `${gaps.length} shipment${gaps.length === 1 ? "" : "s"} with missing documents`,
                description: gaps
                  .slice(0, 3)
                  .map((row) => `**${row.shipmentId}** (${row.company}): ${row.missing.join(", ")}`)
                  .join(" · ")
              }
            : {
                component: "ALERT",
                color: "positive",
                title: "All listed shipments have complete document sets",
                description: "Open any row to review uploaded files in the document panel."
              },
          {
            component: "TABLE",
            headers: ["Shipment", "Company", "ETA", "Carrier", "Documents", "Action"],
            rows: tableRows
          },
          {
            component: "ALERT",
            color: "notice",
            title: maria ? "Coordinator scope" : "Document-first handoff",
            description: maria
              ? "You can upload missing documents and flag gaps — Klear Agent will not edit entry fields or approve statements for your role."
              : "Uploading a missing document routes into the standard ingestion flow. The agent surfaces gaps; you decide what to chase."
          },
          genuiNav("Open US Entry shipments", "#transaction-us-entry")
        ]
      },
      followUps: gaps.length
        ? [
            { label: `Missing on ${gaps[0].shipmentId}`, prompt: `What documents are missing on ${gaps[0].shipmentId}?` },
            { label: "Upload on first gap", prompt: "Recent shipments in operations" }
          ]
        : [{ label: "Items due today", prompt: "All items due today" }]
    };
  }

  function genuiLink(text, href) {
    return { component: "LINK", text, action: { type: "navigate", data: { href } } };
  }

  function genuiNav(text, href) {
    return { component: "BUTTON", text, action: { type: "navigate", data: { href } } };
  }

  window.KNOpsShipmentsAssistant = {
    answer,
    list,
    find,
    filingHref,
    REQUIRED_DOCS,
    isIntent: (question) => INTENT.test(String(question || ""))
  };
})();
