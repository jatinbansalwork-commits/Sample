/**
 * Entry document upload pipeline — type detection, simulated extraction,
 * cross-document conflict detection, and field summary counts.
 */
(() => {
  const DOCUMENT_TYPES = Object.freeze({
    ci: { id: "ci", label: "Commercial Invoice", patterns: [/commercial.?invoice|\bci\b|invoice/i] },
    bol: { id: "bol", label: "Bill of Lading", patterns: [/bill.?of.?lading|\bbol\b|\bmbl\b|b\.?l/i] },
    pl: { id: "pl", label: "Packing List", patterns: [/packing.?list|\bpl\b|pack.?list/i] },
    an: { id: "an", label: "Arrival Notice", patterns: [/arrival.?notice|\ban\b/i] },
    coo: { id: "coo", label: "Certificate of Origin/Analysis", patterns: [/certificate.?(of.?)?origin|c\.?o\.?o|origin.?cert|analysis.?cert/i] },
    isf: { id: "isf", label: "ISF", patterns: [/\bisf\b|importer.?security/i] },
    adcvd: { id: "adcvd", label: "AD/CVD ruling", patterns: [/ad\/?cvd|anti.?dump|countervailing/i] },
    email: { id: "email", label: "Email", patterns: [/\.eml$|\.msg$|\bemail\b|thread/i] },
    misc: { id: "misc", label: "Miscellaneous", patterns: [] }
  });

  /** Demo standard 10-page packet — mapped when user uploads any file(s). */
  const STANDARD_PACKET = [
    { fileName: "Commercial_Invoice.pdf", typeId: "ci", pages: 3 },
    { fileName: "Bill_of_Lading.pdf", typeId: "bol", pages: 2 },
    { fileName: "Packing_List.pdf", typeId: "pl", pages: 1 },
    { fileName: "Arrival_Notice.pdf", typeId: "an", pages: 1 },
    { fileName: "Certificate_of_Origin.pdf", typeId: "coo", pages: 1 },
    { fileName: "ISF_Confirmation.pdf", typeId: "isf", pages: 1 },
    { fileName: "ADCVD_ruling.pdf", typeId: "adcvd", pages: 1 },
    { fileName: "Broker_email_thread.eml", typeId: "email", pages: 1 }
  ];

  const EXPECTED_FROM_DOCS = [
    "parties:ior:name", "parties:ior:number", "bol:mbl", "bol:hbl", "bol:vessel",
    "invoice:1:number", "invoice:1:line:1:sku", "invoice:1:line:1:hts", "invoice:1:line:1:coo",
    "invoice:1:line:1:quantity", "invoice:1:line:1:unitPrice", "container:1:number",
    "txn:portOfEntry", "txn:mot", "isf:transactionId"
  ];

  const TYPE_LABEL = (id) => DOCUMENT_TYPES[id]?.label || DOCUMENT_TYPES.misc.label;

  function detectDocumentType(fileName = "") {
    const name = String(fileName || "");
    for (const type of Object.values(DOCUMENT_TYPES)) {
      if (type.id === "misc") {
        continue;
      }
      if (type.patterns.some((re) => re.test(name))) {
        return type.id;
      }
    }
    return "misc";
  }

  function normalizeUploadedFiles(fileList = []) {
    const files = Array.from(fileList || []);
    if (!files.length) {
      return [];
    }
    if (files.length >= STANDARD_PACKET.length) {
      return files.map((file, index) => ({
        id: `doc-${Date.now()}-${index}`,
        fileName: file.name,
        typeId: detectDocumentType(file.name),
        pages: Math.max(1, Math.round((file.size || 50000) / 50000)),
        file
      }));
    }
    return STANDARD_PACKET.map((item, index) => ({
      id: `doc-${Date.now()}-${index}`,
      fileName: files[index]?.name || item.fileName,
      typeId: files[index] ? detectDocumentType(files[index].name) : item.typeId,
      pages: item.pages,
      file: files[index] || null
    }));
  }

  function extractFromDocument(doc, row = {}) {
    const patches = [];
    const push = (fieldKey, value, confidence, sourceCitation) => {
      patches.push({
        fieldKey,
        value: String(value),
        confidence,
        sourceCitation,
        docId: doc.id,
        docLabel: TYPE_LABEL(doc.typeId),
        docType: doc.typeId
      });
    };

    const n = parseInt(String(row.id || "entry-1").replace(/\D/g, ""), 10) || 1;

    if (doc.typeId === "ci") {
      push("invoice:1:number", `INV-2024-${1000 + n}`, 97, "CI header, invoice #");
      push("parties:ior:name", row.companyName || "ILLUMINATE USA LLC", 99, "CI line 1, Importer of Record");
      push("parties:buyer:name", row.companyName || "ILLUMINATE USA LLC", 94, "CI line 2, Buyer");
      push("invoice:1:line:1:sku", `WDGHT-${440 + n}`, 96, "CI line 3, SKU WDGHT-440");
      push("invoice:1:line:1:description", "Wooden household furniture, other", 95, "CI line 3, description");
      push("invoice:1:line:1:hts", "9403.60.8081", 91, "CI line 3, HTS");
      push("invoice:1:line:1:coo", "VN", 93, "CI line 3, COO VN");
      push("invoice:1:line:1:quantity", "120", 97, "CI line 3, qty 120");
      push("invoice:1:line:1:unitPrice", "45.20", 98, "CI line 4, $45.20");
      push("invoice:1:line:2:sku", `APRL-${220 + n}`, 94, "CI line 5, SKU");
      push("invoice:1:line:2:description", "Women's cotton trousers", 92, "CI line 5, description");
      push("invoice:1:line:2:hts", "6204.62.4020", 88, "CI line 5, HTS");
      push("invoice:1:line:2:coo", "VN", 90, "CI line 5, COO VN");
    }

    if (doc.typeId === "bol") {
      push("bol:mbl", row.mbl || "EGLV1975001234", 99, "BOL field 1, MBL");
      push("bol:hbl", row.hbl || "SHAA240518047", 97, "BOL field 2, HBL");
      push("bol:carrier", "EVERGREEN", 95, "BOL carrier SCAC");
      push("bol:vessel", row.vesselName || "EVER SUPERB", 96, "BOL vessel name");
      push("bol:voyage", `V${240 + (n % 90)}`, 82, "BOL voyage #");
      push("txn:mot", row.mot || "OCEAN", 98, "BOL mode ocean");
      push("txn:portOfEntry", row.portUnlading || "5301 - HOUSTON, TX, US", 94, "BOL port of discharge");
    }

    if (doc.typeId === "pl") {
      push("container:1:number", `MSCU${8234560 + n}`, 97, "PL container 1");
      push("container:1:size", "40HC", 96, "PL equipment size");
      push("container:1:seal", `SL${789010 + n}`, 78, "PL seal #");
      push("container:1:grossWeight", `${18500 + n * 120} KG`, 84, "PL gross weight");
      push("container:2:number", `TCLU${9123400 + n}`, 95, "PL container 2");
    }

    if (doc.typeId === "an") {
      push("txn:eta", row.eta || row.fspdDate || "May 28, 2024", 92, "AN ETA date");
      push("txn:portOfEntry", row.portUnlading || "5301 - HOUSTON, TX, US", 90, "AN port of arrival");
    }

    if (doc.typeId === "coo") {
      push("invoice:1:line:1:coo", "VN", 97, "COO line 1, origin VN");
      push("invoice:1:line:2:coo", "CN", 96, "COO line 2, origin CN");
      push("parties:manufacturer:name", "SHENZHEN PRECISION MFG CO LTD", 93, "COO manufacturer block");
      push("parties:manufacturer:number", "CN-MID-88421", 91, "COO MID");
    }

    if (doc.typeId === "isf") {
      push("isf:transactionId", row.isfTransactionId || "ISF-021D-8", 99, "ISF confirmation #");
      push("parties:shipper:name", "SHENZHEN PRECISION MFG CO LTD", 94, "ISF shipper name");
    }

    if (doc.typeId === "adcvd") {
      push("invoice:1:line:2:hts", "6204.62.4010", 75, "AD/CVD scope HTS line 12");
    }

    if (doc.typeId === "email") {
      push("parties:consignee:name", row.companyName || "ILLUMINATE USA LLC", 72, "Email body, consignee mention");
      push("txn:entryDate", new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), 68, "Email date reference");
    }

    if (doc.typeId === "misc") {
      push("txn:bondType", "8 - CONTINUOUS", 70, `${doc.fileName} p.1, bond reference`);
    }

    return patches;
  }

  function mergeExtractions(allPatches = [], existingFields = {}) {
    const grouped = new Map();
    allPatches.forEach((patch) => {
      if (!grouped.has(patch.fieldKey)) {
        grouped.set(patch.fieldKey, []);
      }
      grouped.get(patch.fieldKey).push(patch);
    });

    const updates = {};
    const conflicts = [];

    grouped.forEach((patches, fieldKey) => {
      const current = existingFields[fieldKey];
      if (current?.status === "user_override" || current?.status === "locked") {
        return;
      }

      const values = [...new Set(patches.map((p) => p.value))];
      if (values.length > 1) {
        const conflictMsg = patches.map((p) => `${p.docLabel}: ${p.sourceCitation} → ${p.value}`).join(" · ");
        conflicts.push({ fieldKey, patches, message: conflictMsg });
        updates[fieldKey] = {
          status: "error",
          value: values[0],
          confidence: null,
          rationale: `Cross-document conflict — ${conflictMsg}`,
          citations: [{
            code: "XDOC",
            title: "Cross-document value conflict",
            ref: conflictMsg
          }]
        };
        return;
      }

      const patch = patches[0];
      updates[fieldKey] = {
        status: "agent_draft",
        value: patch.value,
        confidence: patch.confidence,
        rationale: patch.sourceCitation,
        fill_source: patch.docType
      };
    });

    return { updates, conflicts };
  }

  function computeSummary(fields = {}) {
    const keys = Object.keys(fields);
    let filled = 0;
    let needReview = 0;
    let notInDocs = 0;

    keys.forEach((key) => {
      const f = fields[key];
      if (!f) {
        return;
      }
      const value = String(f.value || "").trim();
      if (f.status === "agent_draft") {
        needReview += 1;
      } else if (f.status === "error") {
        needReview += 1;
      } else if (f.status === "empty" || !value) {
        if (EXPECTED_FROM_DOCS.includes(key)) {
          notInDocs += 1;
        }
      } else {
        filled += 1;
      }
    });

    return { filled, needReview, notInDocs };
  }

  function totalPages(documents = []) {
    return documents.reduce((sum, doc) => sum + (doc.pages || 1), 0);
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNEntryDocExtract = Object.freeze({
    DOCUMENT_TYPES,
    STANDARD_PACKET,
    EXPECTED_FROM_DOCS,
    detectDocumentType,
    normalizeUploadedFiles,
    extractFromDocument,
    mergeExtractions,
    computeSummary,
    totalPages,
    typeLabel: TYPE_LABEL
  });
})();
