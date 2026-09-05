(() => {
  const VIEWER_CATS = ["EML", "AN", "BL", "CI", "ISF", "PL", "MISC"];
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 5;
  const ZOOM_WHEEL_GAIN = 0.0018;
  const SPLIT_MODE_DEFAULT_ZOOM = 70;
  const DOCUMENT_MODE_DEFAULT_ZOOM = 100;

  function clampZoom(value) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value) || DOCUMENT_MODE_DEFAULT_ZOOM));
  }

  function defaultZoomForMode(mode) {
    return isSplitMode(mode) ? SPLIT_MODE_DEFAULT_ZOOM : DOCUMENT_MODE_DEFAULT_ZOOM;
  }

  function resetPreviewViewportForMode(mode, previousMode) {
    const ps = panelState();
    if (!ps) {
      return;
    }
    ps.zoom = defaultZoomForMode(mode);
    ps.previewPanX = 0;
    ps.previewPanY = 0;
    if (isSplitMode(mode) !== isSplitMode(previousMode)) {
      state.lastFitKey = "";
    }
  }

  function computeSplitFitZoom(canvas, stage) {
    const artifact = stage?.querySelector(".isf-doc-artifact");
    if (!canvas || !artifact) {
      return SPLIT_MODE_DEFAULT_ZOOM;
    }
    const stageStyle = window.getComputedStyle(stage);
    const padX =
      (parseFloat(stageStyle.paddingLeft) || 0) + (parseFloat(stageStyle.paddingRight) || 0);
    const available = Math.max(0, canvas.clientWidth - padX);
    const img = artifact.querySelector(".isf-doc-artifact__image");
    const naturalWidth =
      img?.naturalWidth || artifact.scrollWidth || artifact.getBoundingClientRect().width;
    if (!naturalWidth || !available) {
      return SPLIT_MODE_DEFAULT_ZOOM;
    }
    const fit = Math.floor((available / naturalWidth) * 100);
    return clampZoom(Math.min(DOCUMENT_MODE_DEFAULT_ZOOM, Math.max(ZOOM_MIN, fit)));
  }

  function renderPreviewZoomBar(ps, icons) {
    return `<div class="isf-doc-viewer__zoom-bar" aria-label="Zoom controls">
      <button class="icon-btn isf-doc-viewer__zoom-btn" type="button" data-isf-preview-zoom-out aria-label="Zoom out"${ps.zoom <= ZOOM_MIN ? " disabled" : ""}>${icons.zoomOut}</button>
      <label class="isf-doc-viewer__zoom-slider">
        <span class="visually-hidden">Zoom level</span>
        <input type="range" min="${ZOOM_MIN}" max="${ZOOM_MAX}" step="1" value="${ps.zoom}" data-isf-preview-zoom-slider aria-valuemin="${ZOOM_MIN}" aria-valuemax="${ZOOM_MAX}" aria-valuenow="${ps.zoom}" aria-valuetext="${ps.zoom} percent" />
      </label>
      <span class="isf-doc-viewer__zoom-label type-caption-sm" data-isf-preview-zoom-label>${ps.zoom}%</span>
      <button class="icon-btn isf-doc-viewer__zoom-btn" type="button" data-isf-preview-zoom-in aria-label="Zoom in"${ps.zoom >= ZOOM_MAX ? " disabled" : ""}>${icons.zoomIn}</button>
    </div>`;
  }

  function detailApi() {
    return window.KNIsfDetail;
  }

  function ux() {
    return window.KNAdminUX;
  }

  function escapeHtml(value) {
    return ux().escapeHtml(value);
  }

  function toast(content, color = "notice") {
    if (typeof window.showKnToast === "function") {
      window.showKnToast({ content, color });
    }
  }

  const state = {
    rowId: "",
    panel: null,
    previewKey: "",
    lastFitKey: ""
  };

  function panelState() {
    return state.panel;
  }

  function fullLocationHash() {
    const raw = String(location.hash || "");
    if (!raw || raw === "#") {
      return "";
    }
    return raw.startsWith("#") ? raw : `#${raw.replace(/^\/?/, "")}`;
  }

  function parseViewMode(viewParam) {
    if (viewParam === "edit") {
      return "edit";
    }
    if (viewParam === "transaction") {
      return "transaction";
    }
    return "document";
  }

  function isSplitMode(mode) {
    return mode === "transaction" || mode === "edit";
  }

  function viewQueryForMode(mode) {
    if (mode === "transaction") {
      return "&view=transaction";
    }
    if (mode === "edit") {
      return "&view=edit";
    }
    return "";
  }

  function parseRoute() {
    const hash = fullLocationHash();
    const match = hash.match(/^#transaction-us-isf\/documents\/([^/?#]+)/);
    if (!match) {
      return null;
    }
    const qs = hash.includes("?") ? hash.split("?")[1].split("#")[0] : "";
    const params = new URLSearchParams(qs);
    return {
      rowId: decodeURIComponent(match[1]),
      cat: params.get("cat") || "",
      index: Number(params.get("doc") ?? params.get("index") ?? 0) || 0,
      view: parseViewMode(params.get("view"))
    };
  }

  function applyRouteMode(route) {
    const ps = panelState();
    if (!ps || !route) {
      return;
    }
    const previousMode = ps.viewerPageMode;
    ps.viewerPageMode = parseViewMode(route.view);
    ps.viewerIdMode = isSplitMode(ps.viewerPageMode) ? "filing" : "document";
    if (previousMode !== ps.viewerPageMode) {
      resetPreviewViewportForMode(ps.viewerPageMode, previousMode);
    }
  }

  function syncHash(row) {
    const ps = panelState();
    if (!ps) {
      return;
    }
    const viewQuery = viewQueryForMode(ps.viewerPageMode);
    const next = `#transaction-us-isf/documents/${encodeURIComponent(row.id)}?cat=${encodeURIComponent(ps.docCategory)}&doc=${ps.docIndex}${viewQuery}`;
    const current = fullLocationHash();
    if (current !== next) {
      history.replaceState(null, "", next);
    }
  }

  function initState(row, route) {
    const detail = detailApi().buildDetail(row);
    const cat =
      route?.cat && VIEWER_CATS.includes(route.cat)
        ? route.cat
        : VIEWER_CATS.find((id) => (detail.docCounts[id] || 0) > 0) || "EML";
    const count = detail.docCounts[cat] || 0;
    const index = count > 0 ? Math.min(Math.max(0, route?.index || 0), count - 1) : 0;
    state.rowId = row.id;
    state.lastFitKey = "";
    state.panel = detailApi().createDocPanelState({
      docCategory: cat,
      docRailOpen: cat,
      docIndex: index,
      instanceFolderOpen: false,
      zoom: defaultZoomForMode(parseViewMode(route?.view)),
      selectOpen: "",
      previewPanX: 0,
      previewPanY: 0,
      viewerPageMode: parseViewMode(route?.view),
      viewerIdMode: isSplitMode(parseViewMode(route?.view)) ? "filing" : "document"
    });
  }

  function viewerCategories() {
    return detailApi()
      .docCategories()
      .filter((cat) => VIEWER_CATS.includes(cat.id));
  }

  function iconInfoDoc() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><circle cx="10" cy="14" r="0.75" fill="currentColor" stroke="none"/><path d="M10 11v1"/></svg>`;
  }

  function renderObsoleteTool(row, ps) {
    const open = ps.docModal === "obsolete";
    return `<span class="isf-doc-viewer__obsolete-anchor">
      <button class="icon-btn isf-doc-viewer__tool${open ? " is-active" : ""}" type="button" data-isf-obsolete-open aria-label="Mark obsolete" aria-expanded="${open}" aria-haspopup="dialog"${open ? ' aria-controls="kn-isf-obsolete-popover"' : ""} data-tooltip="Mark Obsolete">${iconInfoDoc()}</button>
      ${open ? detailApi().renderObsoleteModal?.(row, ps, { variant: "popover" }) || "" : ""}
    </span>`;
  }

  function renderViewerRail(row, detail) {
    const ps = panelState();
    const activeCat = ps.docCategory;
    const cats = viewerCategories();

    const catRows = cats
      .map((cat) => {
        const count = detail.docCounts[cat.id] || 0;
        const missing = Boolean(cat.required) && count === 0;
        const isActive = cat.id === activeCat;
        const isOpen = ps.docRailOpen === cat.id;
        const tooltip = missing ? `${cat.label} — required, not yet received` : cat.label;
        const cornerBadge = !isOpen
          ? missing
            ? `<span class="isf-doc-viewer__cat-warn" aria-label="Required, missing">${detailApi().iconFieldWarn?.() || "!"}</span>`
            : count > 0
              ? `<span class="isf-doc-viewer__cat-count">${count}</span>`
              : ""
          : "";
        const label =
          isOpen && count > 0
            ? `<span class="isf-doc-viewer__cat-label"><span class="isf-doc-viewer__cat-count-inline">${count}</span><span class="isf-doc-viewer__cat-code">${escapeHtml(cat.id)}</span></span>`
            : `<span class="isf-doc-viewer__cat-code">${escapeHtml(cat.id)}</span>`;
        const instances =
          isOpen && count > 0
            ? `<div class="isf-doc-viewer__cat-instances" role="group" aria-label="${escapeHtml(cat.label)} documents">
                ${Array.from({ length: count }, (_, i) => {
                  const code = detailApi().productionDocId(row, cat.id, i);
                  const docActive = isActive && ps.docIndex === i;
                  return `<button class="isf-doc-viewer__instance${docActive ? " is-active" : ""}" type="button" data-isf-doc-index="${i}" data-isf-doc-cat-ref="${cat.id}" data-tooltip="${escapeHtml(code)}" aria-label="${escapeHtml(code)}">${i + 1}</button>`;
                }).join("")}
              </div>`
            : isOpen && count === 0
              ? `<div class="isf-doc-viewer__cat-instances isf-doc-viewer__cat-instances--empty type-caption-sm">None</div>`
              : "";

        return `<div class="isf-doc-viewer__cat-group">
          <button class="isf-doc-viewer__cat${isActive ? " is-active" : ""}${isOpen ? " is-open" : ""}${missing ? " is-missing" : ""}${count === 0 && !missing ? " is-empty" : ""}" type="button" role="tab" aria-selected="${isActive}" aria-expanded="${isOpen}" tabindex="${isActive ? "0" : "-1"}" data-isf-doc-cat="${cat.id}" data-tooltip="${escapeHtml(tooltip)}">
            ${cornerBadge}
            <span class="isf-doc-viewer__cat-icon" aria-hidden="true">${cat.icon()}</span>
            ${label}
          </button>
          ${instances}
        </div>`;
      })
      .join("");

    return `<div class="isf-doc-viewer__rail panel card kn-card">
      <div class="isf-doc-viewer__cats-scroll">
        <nav class="isf-doc-viewer__cats" role="tablist" aria-label="Document categories">
          ${catRows}
        </nav>
      </div>
    </div>`;
  }

  function renderPreviewContent(row, detail) {
    const ps = panelState();
    const activeCat = ps.docCategory;
    const count = detail.docCounts[activeCat] || 0;
    if (count === 0) {
      const cat = viewerCategories().find((item) => item.id === activeCat);
      const inner = `<div class="isf-doc-preview__placeholder">
        ${detailApi().iconDocCat?.() || ""}
        <p class="type-body-sm type-weight-medium">${escapeHtml(cat?.label || activeCat)}</p>
        <p class="type-caption-sm">${cat?.required ? "Required document not yet received." : "No document in this category."}</p>
      </div>`;
      return detailApi().wrapDocArtifact?.(inner, "empty", { ariaLabel: `${cat?.label || activeCat} not available`, role: "status" }) || inner;
    }
    return detailApi().renderDocumentPreview(row, activeCat, ps.docIndex, detail, {
      searchQuery: ps.docSearchQuery
    });
  }

  function renderDocSearchTool(ps, icons) {
    const q = ps.docSearchQuery || "";
    if (!ps.docSearchOpen) {
      return `<button class="icon-btn isf-doc-viewer__tool isf-doc-viewer__search-toggle" type="button" data-isf-doc-search-toggle aria-label="Search document" aria-expanded="false" data-tooltip="Search">${icons.search}</button>`;
    }
    return `<div class="isf-doc-viewer__search is-open">
      <label class="search-input isf-doc-viewer__search-field kn-autocomplete__field">
        <span class="search-input__icon kn-autocomplete__prefix" aria-hidden="true">${icons.search}</span>
        <input class="search-input__field type-body-sm kn-autocomplete__input" type="search" placeholder="Search in document…" value="${escapeHtml(q)}" data-isf-doc-preview-search aria-label="Search in document" autocomplete="off" />
        <button class="search-input__clear icon-btn" type="button" data-isf-doc-search-clear${q ? "" : " hidden"} aria-label="Clear search">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      </label>
      <button class="icon-btn isf-doc-viewer__search-close" type="button" data-isf-doc-search-close aria-label="Close search" data-tooltip="Close search">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>`;
  }

  function render(row, meta = {}) {
    const route = parseRoute();
    if (state.rowId !== row.id) {
      initState(row, route || { cat: "", index: 0, view: "document" });
    } else {
      applyRouteMode(route);
    }
    const detail = detailApi().buildDetail(row);
    const ps = panelState();
    const splitMode = isSplitMode(ps.viewerPageMode);
    if (splitMode) {
      detailApi().prepareTransactionSidePanel?.(row, { keepTab: meta.keepTab });
    }
    const activeCat = ps.docCategory;
    const count = detail.docCounts[activeCat] || 0;
    const icons = {
      print: detailApi().iconPrint?.() || "",
      add: detailApi().iconAdd?.() || "",
      search: detailApi().iconSearch?.() || "",
      external: detailApi().iconExternal?.() || "",
      download: detailApi().iconDownload?.() || "",
      zoomIn: detailApi().iconZoomIn?.() || "",
      zoomOut: detailApi().iconZoomOut?.() || ""
    };

    const activeMeta = viewerCategories().find((cat) => cat.id === activeCat);
    const folderMeta = count > 0 ? `${ps.docIndex + 1}/${count}` : "—";
    const folderMetaLabel =
      count > 0
        ? `Document ${ps.docIndex + 1} of ${count} in ${activeMeta?.label || activeCat}`
        : activeMeta?.required
          ? "Required — not on file"
          : `No ${activeMeta?.label?.toLowerCase() || "documents"} yet`;
    const recordOptions = detailApi().viewerRecordIdOptions?.(row) || [];
    const recordValue =
      recordOptions.find((item) => item.id === ps.viewerIdMode)?.id || recordOptions[0]?.id || "document";

    const previewFormat = detailApi().previewDocFormat?.(activeCat, ps.docIndex, count) || "page";

    const sidePanel = splitMode
      ? detailApi().renderTransactionSidePanel?.(row, detail, {
          hasPrev: Boolean(meta.hasPrev),
          hasNext: Boolean(meta.hasNext),
          panelMode: ps.viewerPageMode
        }) || ""
      : "";

    return `<div class="isf-doc-viewer" data-isf-viewer-mode="${escapeHtml(ps.viewerPageMode || "document")}">
      <aside class="isf-doc-viewer__aside" aria-label="Document folders">
        ${renderViewerRail(row, detail)}
      </aside>
      <section class="isf-doc-viewer__main">
        <header class="isf-doc-viewer__header">
          <div class="isf-doc-viewer__header-zone isf-doc-viewer__header-zone--identity">
            ${
              recordOptions.length
                ? `<div class="isf-doc-viewer__record-select">
                    ${ux().select({
                      id: "kn-isf-viewer-record-select",
                      name: "isfViewerRecord",
                      value: recordValue,
                      options: recordOptions,
                      placeholder: "Select record ID",
                      openKey: "isf-viewer-record",
                      open: ps.selectOpen,
                      compact: true
                    })}
                  </div>`
                : `<span class="isf-doc-viewer__record-id type-ui-sm type-weight-semibold">${escapeHtml(detailApi().viewerRecordId?.(row) || row.transactionId)}</span>`
            }
            <span class="isf-doc-viewer__folder-meta type-caption-sm" title="${escapeHtml(folderMetaLabel)}">${escapeHtml(folderMeta)}</span>
          </div>
          <div class="isf-doc-viewer__header-zone isf-doc-viewer__header-zone--controls">
            <div class="isf-doc-viewer__action-group" role="group" aria-label="Document actions">
              <button class="isf-doc-viewer__action" type="button" data-isf-doc-open aria-label="Open in new window" data-tooltip="Open in new window">
                ${icons.external}
                <span class="isf-doc-viewer__action-label">Open</span>
              </button>
              <button class="isf-doc-viewer__action" type="button" data-isf-doc-hub-inert="Download is not available in this sample." data-tooltip="Download">
                ${icons.download}
                <span class="isf-doc-viewer__action-label">Download</span>
              </button>
            </div>
            <div class="isf-doc-viewer__tool-group" role="toolbar" aria-label="Document tools">
              <button class="icon-btn isf-doc-viewer__tool" type="button" data-isf-print-open aria-label="Print" data-tooltip="Print">${icons.print}</button>
              <button class="icon-btn isf-doc-viewer__tool" type="button" data-isf-add-doc-open aria-label="Add document" data-tooltip="Add">${icons.add}</button>
              ${renderDocSearchTool(ps, icons)}
              ${renderObsoleteTool(row, ps)}
            </div>
          </div>
        </header>
        <div class="isf-doc-viewer__preview" data-isf-preview-viewport>
          <div class="isf-doc-viewer__preview-canvas" data-isf-preview-canvas>
            <div class="isf-doc-viewer__preview-stage" data-isf-preview-stage style="--isf-doc-zoom: ${ps.zoom}">
              <div class="isf-doc-viewer__preview-content" data-doc-format="${previewFormat}">
                ${renderPreviewContent(row, detail)}
              </div>
            </div>
          </div>
          ${renderPreviewZoomBar(ps, icons)}
        </div>
      </section>
      ${sidePanel}
    </div>
    ${detailApi().renderPrintModal?.(row, detail, ps, viewerCategories()) || ""}
    ${detailApi().renderAddDocModal?.(row, detail, ps) || ""}`;
  }

  function renderSkeleton() {
    const route = parseRoute();
    const splitMode = isSplitMode(parseViewMode(route?.view));
    return `<div class="isf-doc-viewer isf-doc-viewer--skeleton${splitMode ? " isf-doc-viewer--split" : ""}" data-isf-viewer-mode="${escapeHtml(parseViewMode(route?.view))}" aria-busy="true">
      <aside class="isf-doc-viewer__aside">
        <div class="isf-doc-viewer__rail panel card kn-card">
          <span class="skeleton skeleton--line" style="width: 4rem"></span>
          <span class="skeleton skeleton--line" style="width: 7rem"></span>
          <span class="skeleton skeleton--line" style="width: 100%"></span>
          ${Array.from({ length: 7 }, () => `<span class="skeleton skeleton--row"></span>`).join("")}
        </div>
      </aside>
      <section class="isf-doc-viewer__main panel card kn-card">
        <header class="isf-doc-viewer__header isf-doc-viewer__header--skeleton">
          <span class="skeleton skeleton--line" style="width: 14rem"></span>
          <span class="skeleton skeleton--btn skeleton--btn-md" style="width: 11rem"></span>
          <span class="skeleton skeleton--line" style="width: 6rem"></span>
        </header>
        <span class="skeleton" style="flex: 1; min-height: 24rem"></span>
      </section>
      ${
        splitMode
          ? `<aside class="isf-doc-viewer__side panel card kn-card">
              <span class="skeleton skeleton--line" style="width: 12rem"></span>
              <span class="skeleton skeleton--line" style="width: 100%"></span>
              ${Array.from({ length: 6 }, () => `<span class="skeleton skeleton--row"></span>`).join("")}
            </aside>`
          : ""
      }
    </div>`;
  }

  let previewAbort = null;

  function applyPreviewTransform(viewport, zoom, panX, panY) {
    const stage = viewport.querySelector("[data-isf-preview-stage]");
    const slider = viewport.querySelector("[data-isf-preview-zoom-slider]");
    const label = viewport.querySelector("[data-isf-preview-zoom-label]");
    const zoomIn = viewport.querySelector("[data-isf-preview-zoom-in]");
    const zoomOut = viewport.querySelector("[data-isf-preview-zoom-out]");
    const scale = zoom / 100;
    if (stage) {
      stage.style.setProperty("--isf-doc-zoom", String(zoom));
      stage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
    }
    if (slider) {
      slider.value = String(Math.round(zoom));
      slider.setAttribute("aria-valuenow", String(Math.round(zoom)));
      slider.setAttribute("aria-valuetext", `${Math.round(zoom)} percent`);
    }
    if (label) {
      label.textContent = `${Math.round(zoom)}%`;
    }
    if (zoomIn) {
      zoomIn.disabled = zoom >= ZOOM_MAX;
    }
    if (zoomOut) {
      zoomOut.disabled = zoom <= ZOOM_MIN;
    }
  }

  function hydratePreview(root, helpers) {
    previewAbort?.abort();
    const viewport = root.querySelector("[data-isf-preview-viewport]");
    if (!viewport) {
      return;
    }
    const canvas = viewport.querySelector("[data-isf-preview-canvas]");
    const stage = viewport.querySelector("[data-isf-preview-stage]");
    if (!canvas || !stage) {
      return;
    }

    const controller = new AbortController();
    previewAbort = controller;
    const { signal } = controller;

    let zoom = clampZoom(panelState().zoom);
    let panX = panelState().previewPanX || 0;
    let panY = panelState().previewPanY || 0;
    const ps = panelState();
    const previewKey = `${ps.docCategory}-${ps.docIndex}`;
    if (state.previewKey !== previewKey) {
      panX = 0;
      panY = 0;
      ps.previewPanX = 0;
      ps.previewPanY = 0;
      state.previewKey = previewKey;
      state.lastFitKey = "";
      if (isSplitMode(ps.viewerPageMode)) {
        zoom = defaultZoomForMode(ps.viewerPageMode);
        ps.zoom = zoom;
      }
    }
    let interacting = false;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let pinchStartDist = 0;
    let pinchStartZoom = zoom;

    const setInteracting = (next) => {
      interacting = next;
      stage.classList.toggle("is-interacting", next);
      canvas.classList.toggle("is-grabbing", next && dragging);
    };

    const commitZoom = () => {
      panelState().zoom = Math.round(zoom);
    };

    const apply = () => {
      ps.previewPanX = panX;
      ps.previewPanY = panY;
      canvas.classList.add("is-pannable");
      applyPreviewTransform(viewport, zoom, panX, panY);
      commitZoom();
    };

    const zoomAt = (nextZoom, clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const originX = clientX - (rect.left + rect.width / 2);
      const originY = clientY - (rect.top + rect.height / 2);
      const oldZoom = zoom;
      const clamped = clampZoom(nextZoom);
      if (clamped === oldZoom) {
        return;
      }
      const ratio = clamped / oldZoom;
      panX = originX - (originX - panX) * ratio;
      panY = originY - (originY - panY) * ratio;
      zoom = clamped;
      apply();
    };

    apply();

    const scheduleSplitFitZoom = () => {
      if (!isSplitMode(ps.viewerPageMode)) {
        return;
      }
      const fitKey = `${ps.viewerPageMode}-${previewKey}`;
      if (state.lastFitKey === fitKey) {
        return;
      }
      const runFit = () => {
        if (signal.aborted) {
          return;
        }
        const nextZoom = computeSplitFitZoom(canvas, stage);
        state.lastFitKey = fitKey;
        if (nextZoom !== zoom) {
          zoom = nextZoom;
          panX = 0;
          panY = 0;
          ps.previewPanX = 0;
          ps.previewPanY = 0;
          apply();
        }
      };
      const img = stage.querySelector(".isf-doc-artifact__image");
      if (img && !img.complete) {
        img.addEventListener("load", runFit, { once: true, signal });
      }
      window.requestAnimationFrame(() => window.requestAnimationFrame(runFit));
    };

    scheduleSplitFitZoom();

    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        setInteracting(true);
        const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_GAIN);
        zoomAt(zoom * factor, event.clientX, event.clientY);
        window.requestAnimationFrame(() => setInteracting(false));
      },
      { passive: false, signal }
    );

    canvas.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          const [a, b] = event.touches;
          pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          pinchStartZoom = zoom;
          setInteracting(true);
        }
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length !== 2 || !pinchStartDist) {
          return;
        }
        event.preventDefault();
        const [a, b] = event.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        zoomAt(pinchStartZoom * (dist / pinchStartDist), midX, midY);
      },
      { passive: false, signal }
    );

    canvas.addEventListener(
      "touchend",
      (event) => {
        if (event.touches.length < 2) {
          pinchStartDist = 0;
          setInteracting(false);
          apply();
        }
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "mousedown",
      (event) => {
        if (event.button !== 0) {
          return;
        }
        if (event.target.closest("a, button, input, textarea, select, label")) {
          return;
        }
        dragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        panStartX = panX;
        panStartY = panY;
        setInteracting(true);
        event.preventDefault();
      },
      { signal }
    );

    window.addEventListener(
      "mousemove",
      (event) => {
        if (!dragging) {
          return;
        }
        panX = panStartX + (event.clientX - dragStartX);
        panY = panStartY + (event.clientY - dragStartY);
        apply();
      },
      { signal }
    );

    window.addEventListener(
      "mouseup",
      () => {
        if (!dragging) {
          return;
        }
        dragging = false;
        setInteracting(false);
      },
      { signal }
    );

    viewport.addEventListener(
      "click",
      (event) => {
        const zoomIn = event.target.closest("[data-isf-preview-zoom-in]:not(:disabled)");
        if (zoomIn) {
          event.preventDefault();
          const rect = canvas.getBoundingClientRect();
          zoomAt(zoom + ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
          return;
        }
        const zoomOut = event.target.closest("[data-isf-preview-zoom-out]:not(:disabled)");
        if (zoomOut) {
          event.preventDefault();
          const rect = canvas.getBoundingClientRect();
          zoomAt(zoom - ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      },
      { signal }
    );

    viewport.addEventListener(
      "input",
      (event) => {
        const slider = event.target.closest("[data-isf-preview-zoom-slider]");
        if (!slider) {
          return;
        }
        setInteracting(true);
        const rect = canvas.getBoundingClientRect();
        zoomAt(Number(slider.value), rect.left + rect.width / 2, rect.top + rect.height / 2);
        setInteracting(false);
      },
      { signal }
    );

    viewport.addEventListener(
      "dblclick",
      (event) => {
        if (event.target.closest(".isf-doc-viewer__zoom-bar")) {
          return;
        }
        zoom = defaultZoomForMode(ps.viewerPageMode);
        panX = 0;
        panY = 0;
        ps.previewPanX = 0;
        ps.previewPanY = 0;
        state.lastFitKey = "";
        apply();
        scheduleSplitFitZoom();
      },
      { signal }
    );
  }

  function handleClick(event, row, helpers) {
    if (event.target.closest("[data-isf-preview-zoom-in], [data-isf-preview-zoom-out], [data-isf-preview-zoom-slider]")) {
      return true;
    }
    const ps = panelState();
    if (detailApi().handlePrintModalClick?.(event, row, ps, { rerender: helpers.rerender }, viewerCategories())) {
      return true;
    }
    if (detailApi().handleAddDocModalClick?.(event, row, ps, { rerender: helpers.rerender })) {
      return true;
    }
    if (detailApi().handleObsoleteModalClick?.(event, row, ps, { rerender: helpers.rerender })) {
      return true;
    }
    if (ps.docModal === "obsolete" && !event.target.closest(".isf-doc-viewer__obsolete-anchor")) {
      ps.docModal = "";
      helpers.rerender();
      return true;
    }
    const searchToggle = event.target.closest("[data-isf-doc-search-toggle]");
    if (searchToggle) {
      event.preventDefault();
      ps.docSearchOpen = true;
      helpers.rerender();
      return true;
    }
    const searchClose = event.target.closest("[data-isf-doc-search-close]");
    if (searchClose) {
      event.preventDefault();
      ps.docSearchOpen = false;
      ps.docSearchQuery = "";
      helpers.rerender();
      return true;
    }
    const searchClear = event.target.closest("[data-isf-doc-search-clear]");
    if (searchClear) {
      event.preventDefault();
      ps.docSearchQuery = "";
      helpers.rerender();
      return true;
    }
    const openDoc = event.target.closest("[data-isf-doc-open]");
    if (openDoc) {
      event.preventDefault();
      detailApi().openDocumentInNewTab?.(row, ps.docCategory, ps.docIndex);
      return true;
    }
    const prevTxn = event.target.closest("[data-isf-detail-prev]:not(:disabled)");
    if (prevTxn) {
      event.preventDefault();
      const prevId = helpers.adjacentTxnId?.(row.id, -1);
      if (prevId) {
        helpers.keepDetailTab?.();
        const viewQuery = viewQueryForMode(ps.viewerPageMode);
        helpers.goto?.(
          `#transaction-us-isf/documents/${encodeURIComponent(prevId)}?cat=${encodeURIComponent(ps.docCategory)}&doc=${ps.docIndex}${viewQuery}`
        );
      }
      return true;
    }
    const nextTxn = event.target.closest("[data-isf-detail-next]:not(:disabled)");
    if (nextTxn) {
      event.preventDefault();
      const nextId = helpers.adjacentTxnId?.(row.id, 1);
      if (nextId) {
        helpers.keepDetailTab?.();
        const viewQuery = viewQueryForMode(ps.viewerPageMode);
        helpers.goto?.(
          `#transaction-us-isf/documents/${encodeURIComponent(nextId)}?cat=${encodeURIComponent(ps.docCategory)}&doc=${ps.docIndex}${viewQuery}`
        );
      }
      return true;
    }
    const handled = detailApi().handleDocPanelClick(event, row, panelState(), {
      rerender: () => {
        syncHash(row);
        helpers.rerender();
      },
      onCategoryChange: () => syncHash(row)
    });
    if (handled) {
      return true;
    }
    if (isSplitMode(ps.viewerPageMode)) {
      const sideHandled = detailApi().handleClick?.(event, row, { rerender: helpers.rerender });
      if (sideHandled) {
        return true;
      }
    }
    const selectHandled = ux().handleSelectClick(event, {
      open: panelState().selectOpen,
      setOpen: (next) => {
        panelState().selectOpen = next;
        helpers.rerender();
      },
      onChange: (key, value) => {
        if (key === "isf-add-doc-type") {
          panelState().addDocType = value;
          helpers.rerender();
          return;
        }
        if (key !== "isf-viewer-record") {
          return;
        }
        if (value === "filing") {
          const prevMode = panelState().viewerPageMode;
          panelState().viewerIdMode = "filing";
          panelState().viewerPageMode = "transaction";
          resetPreviewViewportForMode("transaction", prevMode);
          syncHash(row);
          helpers.rerender();
          return;
        }
        panelState().viewerIdMode = value || "document";
        const prevMode = panelState().viewerPageMode;
        panelState().viewerPageMode = "document";
        resetPreviewViewportForMode("document", prevMode);
        syncHash(row);
        helpers.rerender();
      }
    });
    return Boolean(selectHandled);
  }

  function handleInput(event, row, helpers) {
    if (event.target.closest("[data-isf-preview-zoom-slider]")) {
      return true;
    }
    const ps = panelState();
    if (detailApi().handleAddDocModalInput?.(event, ps, { rerender: helpers.rerender })) {
      return true;
    }
    const searchInput = event.target.closest("[data-isf-doc-preview-search]");
    if (searchInput) {
      ps.docSearchQuery = searchInput.value;
      helpers.rerender();
      return true;
    }
    return false;
  }

  function handleChange(event, row, helpers) {
    const ps = panelState();
    if (detailApi().handleAddDocModalChange?.(event, ps, { rerender: helpers.rerender })) {
      return true;
    }
    return false;
  }

  function handleDrop(event, row, helpers) {
    const ps = panelState();
    if (detailApi().handleAddDocModalDrop?.(event, ps, { rerender: helpers.rerender })) {
      return true;
    }
    return false;
  }

  function hydrateSearch(root) {
    const input = root.querySelector("[data-isf-doc-preview-search]");
    if (!input || document.activeElement === input) {
      return;
    }
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }

  window.KNIsfDocViewer = {
    render,
    renderSkeleton,
    handleClick,
    handleInput,
    handleChange,
    handleDrop,
    hydratePreview,
    hydrateSearch,
    parseRoute,
    closeSelects() {
      if (!state.panel?.selectOpen) {
        return false;
      }
      state.panel.selectOpen = "";
      return true;
    },
    closeOverlays() {
      if (!state.panel) {
        return false;
      }
      let changed = false;
      if (state.panel.selectOpen) {
        state.panel.selectOpen = "";
        changed = true;
      }
      if (state.panel.docModal) {
        state.panel.docModal = "";
        state.panel.addDocFiles = [];
        changed = true;
      }
      if (state.panel.docSearchOpen) {
        state.panel.docSearchOpen = false;
        state.panel.docSearchQuery = "";
        changed = true;
      }
      return changed;
    }
  };
})();
