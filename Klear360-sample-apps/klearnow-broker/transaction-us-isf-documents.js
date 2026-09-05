(() => {
  const STORAGE_KEY = "kn-isf-doc-uploads-v1";
  const UPLOADERS = ["You", "ARUN-OPS", "KNSFUSER", "ISF OPS", "KAMAL SINGH", "PRIYA SHARMA"];
  const SORT_OPTIONS = [
    { id: "newest", label: "Newest first" },
    { id: "oldest", label: "Oldest first" },
    { id: "name", label: "Name A–Z" },
    { id: "category", label: "Category" }
  ];

  const state = {
    rowId: "",
    folderFilter: "",
    query: "",
    filter: "all",
    sort: "newest",
    selectedId: "",
    uploadType: "MISC",
    selectOpen: "",
    pendingFiles: [],
    docPanel: null
  };

  function panelState() {
    if (!state.docPanel) {
      state.docPanel = detailApi().createDocPanelState();
    }
    return state.docPanel;
  }

  function docIdForPanel(row, ps) {
    return `${row.id}-${ps.docCategory}-${ps.docIndex}`;
  }

  function syncPanelFromDoc(row, doc) {
    if (!doc || doc.status === "missing") {
      return;
    }
    const ps = panelState();
    ps.docCategory = doc.categoryId;
    ps.docRailOpen = doc.categoryId;
    if (doc.kind === "received") {
      const match = doc.id.match(/-(\d+)$/);
      ps.docIndex = match ? Number(match[1]) : 0;
    } else {
      ps.docIndex = 0;
    }
    state.selectedId = doc.id;
    state.folderFilter = doc.categoryId;
  }

  function syncSelectionFromPanel(row) {
    const ps = panelState();
    const detail = detailApi().buildDetail(row);
    const count = detail.docCounts[ps.docCategory] || 0;
    if (count > 0) {
      state.selectedId = docIdForPanel(row, ps);
      state.folderFilter = ps.docCategory;
      return;
    }
    state.selectedId = "";
  }

  function ux() {
    return window.KNAdminUX;
  }

  function detailApi() {
    return window.KNIsfDetail;
  }

  function escapeHtml(value) {
    return ux().escapeHtml(value);
  }

  function toast(content, color = "notice") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  function statusBadge(label, tone) {
    return ux().tmStatusBadge(label, tone);
  }

  function iconFile() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`;
  }

  function iconUpload() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>`;
  }

  function iconSearch() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
  }
  function iconEye() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function iconDownload() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>`;
  }

  function iconWarn() {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;
  }

  function readAllUploads() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeAllUploads(map) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function loadUploads(rowId) {
    return readAllUploads()[rowId] || [];
  }

  function saveUploads(rowId, uploads) {
    const map = readAllUploads();
    map[rowId] = uploads;
    writeAllUploads(map);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "—";
    }
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} B`;
  }

  function docSize(row, catId, index) {
    const n = detailApi().seedFor(row);
    const kb = 120 + ((n * 31 + index * 17 + catId.length * 11) % 4800);
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  }

  function uploadedBy(row, catId, index) {
    const n = detailApi().seedFor(row);
    const catOffset = catId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return UPLOADERS[(n + catOffset + index) % UPLOADERS.length];
  }

  function parseDocDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function buildInventory(row) {
    const detail = detailApi().buildDetail(row);
    const categories = detailApi().docCategories();
    const docs = [];

    categories.forEach((cat) => {
      const count = detail.docCounts[cat.id] || 0;
      if (count === 0 && cat.required) {
        docs.push({
          id: `missing-${cat.id}`,
          kind: "missing",
          categoryId: cat.id,
          categoryLabel: cat.label,
          name: `${cat.singular} required`,
          code: "—",
          fileName: "",
          status: "missing",
          statusLabel: "Missing",
          tone: "negative",
          uploadedBy: "—",
          uploadedAt: "—",
          uploadedAtSort: 0,
          size: "—",
          required: true,
          source: "system"
        });
      }
      for (let i = 0; i < count; i += 1) {
        const code = detailApi().docCode(row, cat.id, i);
        const date = detailApi().docReceivedDate(row, cat.id, i);
        docs.push({
          id: `${row.id}-${cat.id}-${i}`,
          kind: "received",
          categoryId: cat.id,
          categoryLabel: cat.label,
          name: code,
          code,
          fileName: `${code}.pdf`,
          status: "received",
          statusLabel: "Received",
          tone: "positive",
          uploadedBy: uploadedBy(row, cat.id, i),
          uploadedAt: date,
          uploadedAtSort: parseDocDate(date),
          size: docSize(row, cat.id, i),
          required: Boolean(cat.required),
          source: i % 3 === 0 ? "customer" : "broker"
        });
      }
    });

    loadUploads(row.id).forEach((upload) => {
      const cat = categories.find((item) => item.id === upload.categoryId) || { label: "Miscellaneous", id: "MISC" };
      docs.push({
        id: upload.id,
        kind: "upload",
        categoryId: cat.id,
        categoryLabel: cat.label,
        name: upload.name,
        code: upload.code,
        fileName: upload.fileName,
        status: "uploaded",
        statusLabel: "Uploaded",
          tone: "information",
        uploadedBy: upload.uploadedBy || "You",
        uploadedAt: upload.uploadedAt,
        uploadedAtSort: parseDocDate(upload.uploadedAt),
        size: formatBytes(upload.size),
        required: Boolean(cat.required),
        source: "upload"
      });
    });

    const requiredCats = categories.filter((cat) => cat.required);
    const requiredMissing = requiredCats.filter((cat) => (detail.docCounts[cat.id] || 0) === 0).length;
    const receivedCount = docs.filter((doc) => doc.kind === "received" || doc.kind === "upload").length;
    const uploadCount = docs.filter((doc) => doc.kind === "upload").length;

    return {
      docs,
      detail,
      categories,
      stats: {
        total: receivedCount,
        requiredTotal: requiredCats.length,
        requiredReceived: requiredCats.length - requiredMissing,
        missing: requiredMissing,
        uploads: uploadCount
      }
    };
  }

  function filteredDocs(inventory) {
    let rows = inventory.docs.slice();
    const query = state.query.trim().toLowerCase();

    if (state.folderFilter) {
      rows = rows.filter((doc) => doc.categoryId === state.folderFilter);
    }
    if (state.filter === "required") {
      rows = rows.filter((doc) => doc.required);
    } else if (state.filter === "missing") {
      rows = rows.filter((doc) => doc.status === "missing");
    } else if (state.filter === "uploads") {
      rows = rows.filter((doc) => doc.kind === "upload");
    }
    if (query) {
      rows = rows.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.categoryLabel.toLowerCase().includes(query) ||
          doc.uploadedBy.toLowerCase().includes(query) ||
          doc.fileName.toLowerCase().includes(query)
      );
    }

    rows.sort((a, b) => {
      if (state.sort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (state.sort === "category") {
        return a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name);
      }
      if (state.sort === "oldest") {
        return a.uploadedAtSort - b.uploadedAtSort;
      }
      return b.uploadedAtSort - a.uploadedAtSort;
    });

    return rows;
  }

  function categoryCounts(inventory) {
    const counts = { all: inventory.docs.length };
    inventory.categories.forEach((cat) => {
      counts[cat.id] = inventory.docs.filter((doc) => doc.categoryId === cat.id).length;
    });
    return counts;
  }

  function uploadTypeOptions(categories) {
    return categories.map((cat) => ({ id: cat.id, label: cat.label }));
  }

  function renderPendingFiles() {
    if (!state.pendingFiles.length) {
      return "";
    }
    return `<ul class="isf-doc-hub__pending" aria-label="Files ready to upload">
      ${state.pendingFiles
        .map(
          (file) => `<li class="isf-doc-hub__pending-item">
          <span class="isf-doc-hub__pending-name type-ui-sm">${escapeHtml(file.name)}</span>
          <span class="type-caption-sm">${escapeHtml(formatBytes(file.size))}</span>
          <button class="icon-btn" type="button" aria-label="Remove ${escapeHtml(file.name)}" data-isf-doc-pending-remove="${escapeHtml(file.id)}">${iconTrash()}</button>
        </li>`
        )
        .join("")}
    </ul>`;
  }

  function renderPreviewPanel(row, inventory) {
    return detailApi().renderDocPreviewArea(row, inventory.detail, panelState());
  }

  function renderFolderRail(row, inventory) {
    return detailApi().renderDocRail(row, inventory.detail, panelState());
  }

  function renderTableRows(rows) {
    if (!rows.length) {
      return `<tr><td colspan="7"><div class="empty-state vis-empty-state kn-empty isf-doc-hub__empty">
        <div class="kn-empty__copy">
          <p class="kn-empty__title type-heading-h6 type-weight-semibold">No documents match</p>
          <p class="kn-empty__desc type-body-sm">Try clearing filters or upload a new file for this transaction.</p>
        </div>
      </div></td></tr>`;
    }
    return rows
      .map((doc) => {
        const isSelected = doc.id === state.selectedId;
        const sourceLabel =
          doc.source === "customer" ? "Customer portal" : doc.source === "broker" ? "Broker intake" : doc.source === "upload" ? "Manual upload" : "—";
        return `<tr class="isf-doc-hub__row${isSelected ? " is-selected" : ""}${doc.status === "missing" ? " is-missing" : ""}" data-isf-doc-row="${escapeHtml(doc.id)}">
          <td>
            <button class="isf-doc-hub__doc-btn" type="button" data-isf-doc-select="${escapeHtml(doc.id)}">
              <span class="isf-doc-hub__doc-icon" aria-hidden="true">${iconFile()}</span>
              <span class="isf-doc-hub__doc-copy">
                <span class="type-ui-sm type-weight-semibold">${escapeHtml(doc.name)}</span>
                <span class="type-caption-sm">${escapeHtml(doc.code)}</span>
              </span>
            </button>
          </td>
          <td><span class="type-body-sm">${escapeHtml(doc.categoryLabel)}</span></td>
          <td>${statusBadge(doc.statusLabel, doc.tone)}</td>
          <td><span class="type-body-sm">${escapeHtml(doc.uploadedBy)}</span></td>
          <td><span class="type-body-sm">${escapeHtml(doc.uploadedAt)}</span></td>
          <td><span class="type-body-sm">${escapeHtml(doc.size)}</span></td>
          <td>
            <div class="isf-doc-hub__actions">
              ${
                doc.status === "missing"
                  ? `<button class="btn btn--secondary btn--sm type-ui-sm kn-btn" type="button" data-isf-doc-upload-missing="${escapeHtml(doc.categoryId)}">Upload</button>`
                  : `<button class="icon-btn" type="button" aria-label="Preview ${escapeHtml(doc.name)}" data-tooltip="Preview" data-isf-doc-select="${escapeHtml(doc.id)}">${iconEye()}</button>
                     <button class="icon-btn" type="button" aria-label="Download ${escapeHtml(doc.name)}" data-tooltip="Download" data-isf-doc-download="${escapeHtml(doc.id)}">${iconDownload()}</button>
                     ${
                       doc.kind === "upload"
                         ? `<button class="icon-btn" type="button" aria-label="Remove ${escapeHtml(doc.name)}" data-tooltip="Remove" data-isf-doc-remove="${escapeHtml(doc.id)}">${iconTrash()}</button>`
                         : ""
                     }`
              }
            </div>
            <span class="type-caption-sm isf-doc-hub__source">${escapeHtml(sourceLabel)}</span>
          </td>
        </tr>`;
      })
      .join("");
  }

  function render(row) {
    if (state.rowId !== row.id) {
      state.rowId = row.id;
      state.folderFilter = "";
      state.query = "";
      state.filter = "all";
      state.sort = "newest";
      state.selectedId = "";
      state.uploadType = "MISC";
      state.selectOpen = "";
      state.pendingFiles = [];
      const detail = detailApi().buildDetail(row);
      const defaultCat = detailApi().defaultDocPanelCategory(detail);
      state.docPanel = detailApi().createDocPanelState({
        docCategory: defaultCat,
        docRailOpen: defaultCat,
        docIndex: 0
      });
      syncSelectionFromPanel(row);
    }

    const inventory = buildInventory(row);
    const rows = filteredDocs(inventory);
    const typeOptions = uploadTypeOptions(inventory.categories);
    const missingTone = inventory.stats.missing ? "negative" : "positive";
    const ps = panelState();
    const activeCat = inventory.categories.find((cat) => cat.id === ps.docCategory);

    return `<div class="isf-doc-hub">
      <header class="isf-doc-hub__head">
        <div class="isf-doc-hub__title-block">
          <p class="type-caption-sm isf-doc-hub__eyebrow">Transaction documents</p>
          <div class="isf-doc-hub__title-row">
            <h1 class="type-heading-h3">${escapeHtml(row.transactionId)}</h1>
            ${statusBadge(row.status, row.statusChip)}
          </div>
          <p class="type-body-sm isf-doc-hub__sub">${escapeHtml(row.companyName)} · MBL ${escapeHtml(row.mbl)} · Shipment ${escapeHtml(row.shipments)}</p>
        </div>
        <div class="isf-doc-hub__head-actions">
          <a class="btn btn--secondary btn--md type-ui-md kn-btn" href="#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=EML&doc=0&view=edit">Open filing</a>
          <a class="btn btn--tertiary btn--md type-ui-md kn-btn" href="#transaction-us-isf">Back to list</a>
        </div>
      </header>

      <div class="isf-doc-hub__stats" role="list" aria-label="Document summary">
        <article class="isf-doc-hub__stat" role="listitem">
          <span class="type-caption-sm">Total on file</span>
          <strong class="type-heading-h5">${inventory.stats.total}</strong>
        </article>
        <article class="isf-doc-hub__stat" role="listitem">
          <span class="type-caption-sm">Required received</span>
          <strong class="type-heading-h5">${inventory.stats.requiredReceived} / ${inventory.stats.requiredTotal}</strong>
        </article>
        <article class="isf-doc-hub__stat isf-doc-hub__stat--${missingTone}" role="listitem">
          <span class="type-caption-sm">Missing required</span>
          <strong class="type-heading-h5">${inventory.stats.missing}</strong>
        </article>
        <article class="isf-doc-hub__stat" role="listitem">
          <span class="type-caption-sm">Your uploads</span>
          <strong class="type-heading-h5">${inventory.stats.uploads}</strong>
        </article>
      </div>

      <div class="isf-doc-hub__layout">
        <aside class="isf-doc-hub__folders panel card kn-card" aria-label="Document folders">
          <div class="isf-doc-hub__folders-head">
            <p class="type-caption-sm type-weight-semibold">Folders</p>
            ${
              state.folderFilter
                ? `<button class="kn-link type-caption-sm" type="button" data-isf-doc-show-all>Show all</button>`
                : `<span class="type-caption-sm isf-doc-hub__folders-meta">${inventory.docs.length} total</span>`
            }
          </div>
          ${renderFolderRail(row, inventory)}
        </aside>

        <section class="isf-doc-hub__main">
          <div class="isf-doc-hub__toolbar">
            <label class="search-input kn-detail-search">
              <span class="search-input__icon" aria-hidden="true">${iconSearch()}</span>
              <input class="search-input__field type-body-sm" type="search" placeholder="Search name, category, uploader…" value="${escapeHtml(state.query)}" data-isf-doc-search aria-label="Search documents" autocomplete="off" />
            </label>
            <div class="isf-doc-hub__chips" role="tablist" aria-label="Document filters">
              ${[
                { id: "all", label: "All" },
                { id: "required", label: "Required" },
                { id: "missing", label: "Missing" },
                { id: "uploads", label: "My uploads" }
              ]
                .map(
                  (chip) => `<button class="btn ${state.filter === chip.id ? "btn--primary" : "btn--tertiary"} btn--sm type-ui-sm" type="button" role="tab" aria-selected="${state.filter === chip.id}" data-isf-doc-filter="${chip.id}">${chip.label}</button>`
                )
                .join("")}
            </div>
            ${ux().select({
              id: "kn-isf-doc-sort",
              name: "isfDocSort",
              value: state.sort,
              options: SORT_OPTIONS,
              placeholder: "Sort",
              openKey: "isf-doc-sort",
              open: state.selectOpen,
              compact: true
            })}
          </div>

          <section class="panel card kn-card isf-doc-hub__upload" aria-labelledby="isf-doc-upload-title">
            <header class="isf-doc-hub__upload-head">
              <div>
                <h2 class="type-heading-h6 type-weight-semibold" id="isf-doc-upload-title">Upload documents</h2>
                <p class="type-caption-sm">Drag files here or browse — PDF, images, email (.eml), and scans supported.</p>
              </div>
              <span class="isf-doc-hub__upload-icon" aria-hidden="true">${iconUpload()}</span>
            </header>
            <div class="kn-file-upload kn-file-upload--variable isf-doc-hub__drop" data-upload-type="multiple" data-kn-component="file-upload">
              <div class="kn-file-upload__dropzone isf-doc-hub__dropzone" tabindex="0" role="button" aria-label="Upload documents for this transaction">
                <span class="kn-file-upload__icon" aria-hidden="true">${iconUpload()}</span>
                <p class="type-body-sm kn-file-upload__copy">Drop files or <button type="button" class="kn-link kn-file-upload__link isf-doc-hub__browse">browse</button></p>
                <p class="type-caption-sm isf-doc-hub__drop-hint">Assign a document type before adding to the transaction record.</p>
                <input class="kn-file-upload__input visually-hidden" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.tif,.tiff" data-isf-doc-upload-input />
              </div>
            </div>
            ${renderPendingFiles()}
            <div class="isf-doc-hub__upload-row">
              <div class="kn-field isf-doc-hub__type-field">
                ${ux().select({
                  id: "kn-isf-doc-upload-type",
                  name: "isfDocUploadType",
                  value: state.uploadType,
                  options: typeOptions,
                  placeholder: "Document type",
                  openKey: "isf-doc-upload-type",
                  open: state.selectOpen
                })}
              </div>
              <button class="btn btn--primary btn--md type-ui-md kn-btn" type="button" data-isf-doc-upload-confirm${state.pendingFiles.length ? "" : " disabled"}>Add to transaction</button>
            </div>
          </section>

          <div class="role-table-card isf-doc-hub__table-card">
            <div class="vis-table-wrap">
              <table class="tm-table admin-table isf-doc-hub__table">
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Uploaded by</th>
                    <th scope="col">Date</th>
                    <th scope="col">Size</th>
                    <th scope="col"><span class="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>${renderTableRows(rows)}</tbody>
              </table>
            </div>
            <p class="type-caption-sm isf-doc-hub__table-meta">${rows.length} document${rows.length === 1 ? "" : "s"} shown${state.folderFilter && activeCat ? ` in ${activeCat.label}` : ""} · ${inventory.stats.requiredReceived} of ${inventory.stats.requiredTotal} required on file</p>
          </div>
        </section>

        <aside class="isf-doc-hub__preview-wrap" aria-label="Document preview">
          ${renderPreviewPanel(row, inventory)}
        </aside>
      </div>
    </div>`;
  }

  function renderSkeleton() {
    return `<div class="isf-doc-hub isf-doc-hub--skeleton" aria-busy="true">
      <header class="isf-doc-hub__head">
        <div class="skeleton-stack">
          <span class="skeleton skeleton--caption" style="width: 8rem"></span>
          <span class="skeleton skeleton--title" style="width: 16rem"></span>
          <span class="skeleton skeleton--line" style="width: 24rem"></span>
        </div>
      </header>
      <div class="isf-doc-hub__stats">
        ${Array.from({ length: 4 }, () => `<article class="isf-doc-hub__stat"><span class="skeleton skeleton--line"></span><span class="skeleton skeleton--title" style="width: 3rem"></span></article>`).join("")}
      </div>
      <div class="isf-doc-hub__layout">
        <aside class="isf-doc-hub__rail panel card kn-card">${Array.from({ length: 8 }, () => `<span class="skeleton skeleton--icon" style="width: 3rem; height: 3.25rem"></span>`).join("")}</aside>
        <section class="isf-doc-hub__main">
          <span class="skeleton skeleton--row"></span>
          <section class="panel card kn-card isf-doc-hub__upload"><span class="skeleton" style="height: 7rem"></span></section>
          <div class="role-table-card">${Array.from({ length: 6 }, () => `<span class="skeleton skeleton--row"></span>`).join("")}</div>
        </section>
        <aside class="isf-doc-hub__preview-wrap panel card kn-card"><span class="skeleton" style="height: 18rem"></span></aside>
      </div>
    </div>`;
  }

  function addPendingFiles(fileList) {
    const next = [...state.pendingFiles];
    Array.from(fileList).forEach((file, index) => {
      next.push({
        id: `pending-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type
      });
    });
    state.pendingFiles = next;
  }

  function commitUploads(row) {
    if (!state.pendingFiles.length) {
      return;
    }
    const categories = detailApi().docCategories();
    const cat = categories.find((item) => item.id === state.uploadType) || categories[categories.length - 1];
    const existing = loadUploads(row.id);
    const now = new Date();
    const stamp = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const additions = state.pendingFiles.map((file, index) => {
      const code = `${cat.id}-UP-${String(existing.length + index + 1).padStart(2, "0")}`;
      return {
        id: `upload-${row.id}-${Date.now()}-${index}`,
        categoryId: cat.id,
        name: file.name.replace(/\.[^.]+$/, ""),
        code,
        fileName: file.name,
        size: file.size,
        uploadedBy: "You",
        uploadedAt: stamp
      };
    });
    saveUploads(row.id, existing.concat(additions));
    state.pendingFiles = [];
    toast(`${additions.length} document${additions.length === 1 ? "" : "s"} added to ${row.transactionId}.`, "positive");
  }

  function removeUpload(row, uploadId) {
    const next = loadUploads(row.id).filter((item) => item.id !== uploadId);
    saveUploads(row.id, next);
    if (state.selectedId === uploadId) {
      state.selectedId = "";
    }
    toast("Upload removed from this transaction.", "notice");
  }

  function handleClick(event, row, helpers) {
    const panelHandled = detailApi().handleDocPanelClick(event, row, panelState(), {
      rerender: helpers.rerender,
      onCategoryChange: (cat, index) => {
        state.folderFilter = cat;
        const count = detailApi().buildDetail(row).docCounts[cat] || 0;
        if (count > 0) {
          state.selectedId = `${row.id}-${cat}-${index}`;
        }
      }
    });
    if (panelHandled) {
      return true;
    }

    const showAll = event.target.closest("[data-isf-doc-show-all]");
    if (showAll) {
      event.preventDefault();
      state.folderFilter = "";
      helpers.rerender();
      return true;
    }

    const filter = event.target.closest("[data-isf-doc-filter]");
    if (filter) {
      event.preventDefault();
      state.filter = filter.getAttribute("data-isf-doc-filter") || "all";
      helpers.rerender();
      return true;
    }

    const selectDoc = event.target.closest("[data-isf-doc-select]");
    if (selectDoc) {
      event.preventDefault();
      const id = selectDoc.getAttribute("data-isf-doc-select") || "";
      const doc = buildInventory(row).docs.find((item) => item.id === id);
      syncPanelFromDoc(row, doc);
      helpers.rerender();
      return true;
    }

    const removePending = event.target.closest("[data-isf-doc-pending-remove]");
    if (removePending) {
      event.preventDefault();
      const id = removePending.getAttribute("data-isf-doc-pending-remove");
      state.pendingFiles = state.pendingFiles.filter((file) => file.id !== id);
      helpers.rerender();
      return true;
    }

    const uploadMissing = event.target.closest("[data-isf-doc-upload-missing]");
    if (uploadMissing) {
      event.preventDefault();
      state.uploadType = uploadMissing.getAttribute("data-isf-doc-upload-missing") || "MISC";
      document.querySelector(".isf-doc-hub__upload")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      helpers.rerender();
      return true;
    }

    const confirmUpload = event.target.closest("[data-isf-doc-upload-confirm]");
    if (confirmUpload) {
      event.preventDefault();
      commitUploads(row);
      helpers.rerender();
      return true;
    }

    const removeUploadBtn = event.target.closest("[data-isf-doc-remove]");
    if (removeUploadBtn) {
      event.preventDefault();
      removeUpload(row, removeUploadBtn.getAttribute("data-isf-doc-remove"));
      helpers.rerender();
      return true;
    }

    const download = event.target.closest("[data-isf-doc-download]");
    if (download) {
      event.preventDefault();
      toast("Download will be available when connected to document storage.", "notice");
      return true;
    }

    const browse = event.target.closest(".isf-doc-hub__browse");
    if (browse) {
      event.preventDefault();
      event.stopPropagation();
      document.querySelector("[data-isf-doc-upload-input]")?.click();
      return true;
    }

    const dropzone = event.target.closest(".isf-doc-hub__dropzone");
    if (dropzone && !event.target.closest(".isf-doc-hub__browse")) {
      event.preventDefault();
      document.querySelector("[data-isf-doc-upload-input]")?.click();
      return true;
    }

    const selectHandled = ux().handleSelectClick(event, {
      open: state.selectOpen,
      setOpen: (next) => {
        state.selectOpen = next;
        helpers.rerender();
      },
      onChange: (key, value) => {
        if (key === "isf-doc-sort") {
          state.sort = value;
        }
        if (key === "isf-doc-upload-type") {
          state.uploadType = value;
        }
        helpers.rerender();
      }
    });
    return Boolean(selectHandled);
  }

  function handleInput(event, row, helpers) {
    const search = event.target.closest("[data-isf-doc-search]");
    if (!search) {
      return false;
    }
    state.query = search.value;
    helpers.rerender();
    return true;
  }

  function handleChange(event, row, helpers) {
    const input = event.target.closest("[data-isf-doc-upload-input]");
    if (!input?.files?.length) {
      return false;
    }
    addPendingFiles(input.files);
    input.value = "";
    helpers.rerender();
    return true;
  }

  window.KNIsfDocuments = {
    render,
    renderSkeleton,
    handleClick,
    handleInput,
    handleChange
  };
})();
