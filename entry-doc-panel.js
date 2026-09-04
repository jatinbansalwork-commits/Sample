/**
 * Entry filing Document Panel — categories, catalog, and preview page content
 * with selectable regions for rubber-banding.
 */
(() => {
  const DOC_CATEGORIES = [
    { id: "email", label: "Emails", icon: "email" },
    { id: "bol", label: "Bill of Lading", icon: "bol" },
    { id: "an", label: "Arrival Notice", icon: "an" },
    { id: "ci_pl", label: "Packing List / Commercial Invoice", icon: "invoice" },
    { id: "misc", label: "Miscellaneous", icon: "misc" }
  ];

  const TYPE_TO_CATEGORY = {
    email: "email",
    bol: "bol",
    an: "an",
    ci: "ci_pl",
    pl: "ci_pl",
    coo: "misc",
    isf: "misc",
    adcvd: "misc",
    misc: "misc"
  };

  function mapTypeToCategory(typeId = "") {
    return TYPE_TO_CATEGORY[typeId] || "misc";
  }

  function iconEmail() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
  }
  function iconBol() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18h16"/><path d="M6 18V8l6-4 6 4v10"/><path d="M9 12h6"/></svg>`;
  }
  function iconAn() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  }
  function iconInvoice() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>`;
  }
  function iconMisc() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`;
  }
  function iconPrint() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 8V4h10v4"/><rect x="5" y="8" width="14" height="10" rx="2"/><path d="M7 14h10v6H7z"/></svg>`;
  }
  function iconZoomIn() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M21 21l-4-4"/></svg>`;
  }
  function iconZoomOut() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M21 21l-4-4"/></svg>`;
  }
  function iconPin() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v4"/><path d="m8 3 8 4-3 7 4 2-2 4-6-3 2-4-3-7Z"/></svg>`;
  }

  function categoryIcon(id) {
    const map = { email: iconEmail, bol: iconBol, an: iconAn, ci_pl: iconInvoice, misc: iconMisc };
    return (map[id] || iconMisc)();
  }

  function seedDemoDocuments(row = {}) {
    const n = parseInt(String(row.id || "1").replace(/\D/g, ""), 10) || 1;
    return [
      { id: "seed-ci", fileName: "Commercial_Invoice.pdf", typeId: "ci", categoryId: "ci_pl", pages: 3, status: "done" },
      { id: "seed-pl", fileName: "Packing_List.pdf", typeId: "pl", categoryId: "ci_pl", pages: 1, status: "done" },
      { id: "seed-bol", fileName: "Bill_of_Lading.pdf", typeId: "bol", categoryId: "bol", pages: 2, status: "done" },
      { id: "seed-an", fileName: "Arrival_Notice.pdf", typeId: "an", categoryId: "an", pages: 1, status: "done" },
      { id: "seed-email", fileName: "Broker_thread.eml", typeId: "email", categoryId: "email", pages: 1, status: "done" },
      { id: "seed-coo", fileName: "Certificate_of_Origin.pdf", typeId: "coo", categoryId: "misc", pages: 1, status: "done" },
      { id: "seed-isf", fileName: `ISF_${n}.pdf`, typeId: "isf", categoryId: "misc", pages: 1, status: "done" }
    ];
  }

  function normalizeUploadedDoc(doc) {
    return {
      ...doc,
      categoryId: doc.categoryId || mapTypeToCategory(doc.typeId),
      pages: doc.pages || 1,
      status: doc.status || "done"
    };
  }

  function buildCatalog(uploadedDocs = [], row = {}) {
    const source = uploadedDocs.length
      ? uploadedDocs.map(normalizeUploadedDoc)
      : seedDemoDocuments(row);
    const byCategory = {};
    DOC_CATEGORIES.forEach((cat) => {
      byCategory[cat.id] = [];
    });
    source.forEach((doc) => {
      const cat = doc.categoryId || mapTypeToCategory(doc.typeId);
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(doc);
    });
    return { byCategory, all: source };
  }

  function docLabel(doc, index = 0) {
    if (!doc) {
      return "Document";
    }
    const base = doc.fileName || doc.label || `Document ${index + 1}`;
    return base.replace(/\.(pdf|eml|msg|png|jpe?g)$/i, "");
  }

  function previewRegions(categoryId, doc, pageIndex, row = {}) {
    const n = parseInt(String(row.id || "1").replace(/\D/g, ""), 10) || 1;
    const pages = {
      ci_pl: [
        [
          { text: row.companyName || "ILLUMINATE USA LLC", region: "header, Importer" },
          { text: `INV-2024-${1000 + n}`, region: "header, Invoice #" },
          { text: "9403.60.8081", region: "line 3, HTS" },
          { text: "45.20", region: "line 4, unit price" },
          { text: "120", region: "line 3, quantity" }
        ],
        [
          { text: "6204.62.4020", region: "line 5, HTS" },
          { text: "VN", region: "line 5, COO" },
          { text: "Women's cotton trousers", region: "line 5, description" }
        ],
        [
          { text: "SHENZHEN PRECISION MFG CO LTD", region: "footer, manufacturer" }
        ]
      ],
      bol: [
        [
          { text: row.mbl || "EGLV1975001234", region: "field 1, MBL" },
          { text: row.hbl || "SHAA240518047", region: "field 2, HBL" }
        ],
        [
          { text: row.vesselName || "EVER SUPERB", region: "vessel name block" },
          { text: row.portUnlading || "5301 - HOUSTON, TX, US", region: "port of discharge" },
          { text: "EVERGREEN", region: "carrier SCAC" }
        ]
      ],
      an: [[
        { text: row.eta || row.fspdDate || "May 28, 2024", region: "ETA block" },
        { text: row.portUnlading || "5301 - HOUSTON, TX, US", region: "port of arrival" }
      ]],
      email: [[
        { text: row.companyName || "ILLUMINATE USA LLC", region: "body, consignee" },
        { text: "Please confirm IOR for this shipment.", region: "paragraph 2" }
      ]],
      misc: [[
        { text: "CN-MID-88421", region: "MID block" },
        { text: row.isfTransactionId || "ISF-021D-8", region: "ISF reference" }
      ]]
    };
    const catPages = pages[categoryId] || pages.misc;
    return catPages[pageIndex] || catPages[0] || [{ text: docLabel(doc), region: "page body" }];
  }

  function renderPreviewPageHtml(categoryId, doc, pageIndex, row, escapeHtml) {
    const regions = previewRegions(categoryId, doc, pageIndex, row);
    const lines = regions.map(
      (r) => `<p class="entry-doc-preview__line type-body-sm"><span class="entry-doc-preview__pick" data-entry-doc-text="${escapeHtml(r.text)}" data-entry-doc-region="${escapeHtml(r.region)}" tabindex="0" role="button">${escapeHtml(r.text)}</span></p>`
    ).join("");
    return `<div class="entry-doc-preview__page" data-entry-doc-page="${pageIndex + 1}">
      <p class="type-caption-sm entry-doc-preview__page-label">Page ${pageIndex + 1} of ${doc?.pages || 1}</p>
      ${lines}
    </div>`;
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNEntryDocPanel = Object.freeze({
    DOC_CATEGORIES,
    mapTypeToCategory,
    buildCatalog,
    docLabel,
    previewRegions,
    renderPreviewPageHtml,
    categoryIcon,
    iconPrint,
    iconZoomIn,
    iconZoomOut,
    iconPin,
    ZOOM_MIN: 50,
    ZOOM_MAX: 200
  });
})();
