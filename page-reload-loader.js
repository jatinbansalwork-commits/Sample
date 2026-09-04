/**
 * On browser reload, show a skeleton for the active route, then refresh page data.
 * Simulates a backend round-trip before re-rendering the same route.
 */
(function () {
  "use strict";

  const LOADING_MS = 1200;
  let reloadHandled = false;

  function isReload() {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav?.type === "reload") {
      return true;
    }
    return performance.navigation?.type === 1;
  }

  function loadingMs() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return 0;
    }
    return LOADING_MS;
  }

  function currentPath() {
    if (typeof window.getHashPath === "function") {
      return window.getHashPath();
    }
    const raw = (location.hash || "").split("?")[0];
    return raw && raw !== "#" ? raw : "#agentic-broker";
  }

  function shouldDeferInitialRender() {
    if (!isReload()) {
      return false;
    }
    const path = currentPath();
    return path === "#klearhub-visibility" || path.startsWith("#klearhub-visibility");
  }

  function tableSkeletonRows({ cols = 6, rows = 8 } = {}) {
    if (window.KNAdminUX?.tableSkeletonRows) {
      return window.KNAdminUX.tableSkeletonRows({ cols, rows });
    }
    const cells = Array.from({ length: cols }, () => '<td><span class="skeleton skeleton--tm-cell" aria-hidden="true"></span></td>').join("");
    return Array.from({ length: rows }, () => `<tr class="tm-skeleton-row" aria-hidden="true">${cells}</tr>`).join("");
  }

  function adminListSkeleton({ cols = 6, rows = 8 } = {}) {
    return `<div class="page-reload-skeleton admin-reload-skeleton" role="status" aria-live="polite">
      <span class="visually-hidden">Loading page…</span>
      <header class="admin-reload-skeleton__head">
        <div class="skeleton-stack">
          <span class="skeleton skeleton--title" style="width: 14rem"></span>
          <span class="skeleton skeleton--line" style="width: 22rem"></span>
        </div>
        <span class="skeleton skeleton--btn skeleton--btn-md" style="width: 7.5rem"></span>
      </header>
      <div class="admin-reload-skeleton__chips">
        <span class="skeleton skeleton--badge" style="width: 4.5rem"></span>
        <span class="skeleton skeleton--badge" style="width: 5.25rem"></span>
        <span class="skeleton skeleton--badge" style="width: 6rem"></span>
        <span class="skeleton skeleton--badge" style="width: 7rem"></span>
      </div>
      <div class="role-table-card admin-reload-skeleton__table">
        <div class="vis-table-wrap">
          <table class="tm-table admin-table" aria-hidden="true">
            <thead>
              <tr>${Array.from({ length: cols }, () => '<th><span class="skeleton skeleton--caption" style="width: 72%"></span></th>').join("")}</tr>
            </thead>
            <tbody>${tableSkeletonRows({ cols, rows })}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function genericSkeleton() {
    return `<div class="page-reload-skeleton generic-reload-skeleton" role="status" aria-live="polite">
      <span class="visually-hidden">Loading page…</span>
      <div class="skeleton-stack">
        <span class="skeleton skeleton--title" style="width: 16rem"></span>
        <span class="skeleton skeleton--line" style="width: 24rem"></span>
      </div>
      <section class="panel card kn-card admin-reload-skeleton__panel">
        <div class="skeleton-stack">
          <span class="skeleton skeleton--row"></span>
          <span class="skeleton skeleton--row"></span>
          <span class="skeleton skeleton--row"></span>
          <span class="skeleton skeleton--row"></span>
        </div>
      </section>
    </div>`;
  }

  function mountRootSkeleton(root, kind, opts = {}) {
    if (!root) {
      return;
    }
    root.innerHTML =
      kind === "admin-list" || kind === "tm-table"
        ? adminListSkeleton({ cols: opts.cols || (kind === "tm-table" ? 8 : 6), rows: opts.rows || 8 })
        : genericSkeleton();
    root.classList.add("is-reload-skeleton");
  }

  function clearRootSkeleton(root) {
    if (!root) {
      return;
    }
    root.classList.remove("is-reload-skeleton");
  }

  function mountAgenticSkeleton(page) {
    if (!page || page.querySelector(".agentic-reload-skeleton")) {
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "page-reload-skeleton agentic-reload-skeleton";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `<span class="visually-hidden">Loading Klear Agent…</span>
      <div class="skeleton-stack agentic-reload-skeleton__hero">
        <span class="skeleton skeleton--title" style="width: 14rem"></span>
        <span class="skeleton skeleton--line" style="width: 20rem"></span>
      </div>
      <div class="agentic-reload-skeleton__pills">
        <span class="skeleton skeleton--btn skeleton--btn-md" style="width: 11rem"></span>
        <span class="skeleton skeleton--btn skeleton--btn-md" style="width: 9rem"></span>
        <span class="skeleton skeleton--btn skeleton--btn-md" style="width: 10.5rem"></span>
      </div>
      <span class="skeleton skeleton--composer agentic-reload-skeleton__composer"></span>`;
    page.appendChild(overlay);
    page.setAttribute("aria-busy", "true");
    page.classList.add("is-reloading");
  }

  function clearAgenticSkeleton(page) {
    if (!page) {
      return;
    }
    page.querySelector(".agentic-reload-skeleton")?.remove();
    page.removeAttribute("aria-busy");
    page.classList.remove("is-reloading");
  }

  function beginReload({ page, root, kind, cols, rows }) {
    if (kind === "visibility") {
      window.startVisibilityLoading?.("page");
      return;
    }
    if (kind === "agentic") {
      mountAgenticSkeleton(page);
      return;
    }
    if (root) {
      mountRootSkeleton(root, kind, { cols, rows });
    }
    page?.setAttribute("aria-busy", "true");
    page?.classList.add("is-reloading");
  }

  function endReload({ page, root, kind }) {
    if (kind === "visibility") {
      window.stopVisibilityLoading?.();
      return;
    }
    if (kind === "agentic") {
      clearAgenticSkeleton(page);
      return;
    }
    clearRootSkeleton(root);
    page?.removeAttribute("aria-busy");
    page?.classList.remove("is-reloading");
  }

  /**
   * On hard reload: skeleton → delayed refresh. Otherwise: refresh immediately.
   * Returns true when reload deferral was started.
   */
  function run({ page, root, kind = "admin-list", refresh, cols, rows }) {
    if (!page || page.hidden) {
      refresh?.();
      return false;
    }
    if (!isReload()) {
      refresh?.();
      return false;
    }
    if (reloadHandled) {
      refresh?.();
      return false;
    }
    reloadHandled = true;
    beginReload({ page, root, kind, cols, rows });

    window.setTimeout(() => {
      try {
        refresh?.();
      } finally {
        endReload({ page, root, kind });
        window.dispatchEvent(new CustomEvent("kn-page-reload-complete"));
      }
    }, loadingMs());
    return true;
  }

  window.KNPageReload = {
    isReload,
    loadingMs,
    shouldDeferInitialRender,
    run
  };
})();
