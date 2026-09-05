/**
 * Shell-wide ⌘K / Ctrl+K command palette — renders from KNShellSearchIndex.
 */
(function () {
  "use strict";

  const SECTION_LABELS = {
    entry: "Entries",
    chat: "Chat history",
    module: "Jump to",
    action: "Actions"
  };

  const SECTION_ORDER = ["entry", "chat", "module", "action"];

  let menu = null;
  let search = null;
  let list = null;
  let empty = null;
  let trigger = null;
  let closeBtn = null;
  let clearBtn = null;
  let titleEl = null;
  let activeIndex = 0;
  let renderedItems = [];

  function shortcutLabel() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "") || navigator.userAgentData?.platform === "macOS";
    return mac ? "⌘K" : "Ctrl+K";
  }

  function knTokenPx(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) {
      return fallback;
    }
    if (raw.endsWith("rem")) {
      return parseFloat(raw) * 16;
    }
    if (raw.endsWith("px")) {
      return parseFloat(raw);
    }
    const asNumber = Number.parseFloat(raw);
    return Number.isFinite(asNumber) ? asNumber : fallback;
  }

  function positionMenu() {
    if (!menu) {
      return;
    }
    const gutter = knTokenPx("--theme-size-16", 16);
    const width = Math.min(knTokenPx("--theme-size-420", 420), window.innerWidth - gutter * 2);
    const triggerRect = trigger?.getBoundingClientRect();
    const triggerVisible = Boolean(triggerRect && triggerRect.width && triggerRect.height);
    menu.classList.add("is-centered");
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.round((window.innerWidth - width) / 2)}px`;
    if (!triggerVisible) {
      menu.style.top = "18vh";
      return;
    }
    const offset = knTokenPx("--theme-size-8", 8);
    let top = triggerRect.bottom + offset;
    const menuHeight = menu.offsetHeight;
    if (menuHeight && top + menuHeight > window.innerHeight - gutter) {
      const above = triggerRect.top - menuHeight - offset;
      top = above >= gutter ? above : Math.max(gutter, (window.innerHeight - menuHeight) / 3);
    }
    menu.style.top = `${top}px`;
  }

  function iconForKind(kind) {
    const map = {
      entry: "./assets/quick-actions/table.svg",
      chat: "./assets/quick-actions/bolt.svg",
      module: "./assets/quick-actions/sitemap.svg",
      action: "./assets/quick-actions/bolt.svg"
    };
    return map[kind] || "./assets/quick-actions/search.svg";
  }

  function renderResults(query) {
    if (!list) {
      return;
    }
    const index = window.KNShellSearchIndex;
    if (!index) {
      return;
    }
    const results = index.search(query, { limit: 28 });
    renderedItems = results;
    if (!results.length) {
      list.innerHTML = "";
      if (empty) {
        empty.hidden = false;
      }
      activeIndex = -1;
      syncActive();
      return;
    }
    if (empty) {
      empty.hidden = true;
    }
    const grouped = new Map(SECTION_ORDER.map((kind) => [kind, []]));
    results.forEach((item) => {
      grouped.get(item.kind)?.push(item);
    });
    list.innerHTML = SECTION_ORDER.filter((kind) => grouped.get(kind)?.length)
      .map((kind) => {
        const items = grouped.get(kind);
        return `<div class="action-list-section kn-action-list__section shell-command__section" role="group" aria-label="${index.escapeHtml(SECTION_LABELS[kind] || kind)}">
          <p class="action-list-section__title type-ui-sm type-weight-medium kn-action-list__section-title">${index.escapeHtml(SECTION_LABELS[kind] || kind)}</p>
          ${items
            .map((item, itemIndex) => {
              const globalIndex = results.indexOf(item);
              const itemId = `shell-command-item-${globalIndex}`;
              return `<button class="action-list-item type-ui-sm type-weight-medium kn-action-list__item shell-command__item" type="button" role="option" id="${itemId}" data-shell-index="${globalIndex}" data-label="${index.escapeHtml(item.label)}">
                <span class="action-list-item__icon kn-action-list__leading" aria-hidden="true">
                  <img src="${iconForKind(item.kind)}" width="20" height="20" alt="" />
                </span>
                <span class="action-list-item__copy kn-action-list__copy">
                  <span>${index.escapeHtml(item.label)}</span>
                  ${item.subtitle ? `<span class="action-list-item__why type-caption-sm">${index.escapeHtml(item.subtitle)}</span>` : ""}
                </span>
              </button>`;
            })
            .join("")}
        </div>`;
      })
      .join("");
    activeIndex = 0;
    syncActive();
  }

  function visibleItems() {
    return Array.from(list?.querySelectorAll(".shell-command__item:not([hidden])") || []);
  }

  function syncActive() {
    const visible = visibleItems();
    if (!search) {
      return;
    }
    if (!visible.length) {
      activeIndex = -1;
      search.removeAttribute("aria-activedescendant");
      return;
    }
    if (activeIndex < 0) {
      activeIndex = 0;
    }
    if (activeIndex >= visible.length) {
      activeIndex = visible.length - 1;
    }
    visible.forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.scrollIntoView({ block: "nearest" });
        search.setAttribute("aria-activedescendant", item.id);
      }
    });
  }

  function executeRecord(record) {
    if (!record) {
      return;
    }
    setOpen(false);
    if (record.kind === "entry" || record.kind === "module") {
      if (record.href) {
        const navLink = document.querySelector(`.side-nav-link[href="${CSS.escape(record.href)}"]`);
        if (navLink) {
          navLink.click();
        } else {
          location.hash = record.href.replace(/^#/, "");
        }
      }
      return;
    }
    if (record.kind === "chat") {
      if (location.hash.split("?")[0].replace(/^#\/?/, "") !== "agentic-broker") {
        location.hash = "#agentic-broker";
      }
      window.requestAnimationFrame(() => window.KNAgenticBroker?.openHistoryChat?.(record.chatId));
      return;
    }
    if (record.kind === "action") {
      if (typeof record.run === "function") {
        record.run();
        return;
      }
      if (record.visOpen && typeof applyVisibilityFilters === "function") {
        applyVisibilityFilters(record.visOpen);
      }
      if (record.href) {
        document.querySelector(`.side-nav-link[href="${CSS.escape(record.href)}"]`)?.click();
      }
      if (record.rolePath) {
        window.requestAnimationFrame(() => window.KNRoles?.open(record.rolePath));
      }
      if (record.userPath) {
        window.requestAnimationFrame(() => window.KNUsers?.open(record.userPath));
      }
      window.requestAnimationFrame(() => {
        if (record.focus) {
          document.querySelector(record.focus)?.focus();
        }
      });
    }
  }

  function selectActive() {
    const visible = visibleItems();
    if (activeIndex < 0 || !visible[activeIndex]) {
      return;
    }
    const index = Number(visible[activeIndex].getAttribute("data-shell-index"));
    executeRecord(renderedItems[index]);
  }

  function setOpen(isOpen) {
    if (!menu || !trigger || !search) {
      return;
    }
    if (isOpen && typeof setProfileMenuOpen === "function") {
      setProfileMenuOpen(false);
    }
    if (isOpen && typeof setDashDatePickerOpen === "function") {
      setDashDatePickerOpen(false);
    }
    menu.hidden = !isOpen;
    trigger.setAttribute("aria-expanded", String(isOpen));
    search.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) {
      search.removeAttribute("aria-activedescendant");
      return;
    }
    window.KNShellSearchIndex?.rebuild?.();
    search.value = "";
    if (clearBtn) {
      clearBtn.hidden = true;
    }
    renderResults("");
    positionMenu();
    menu.style.position = "fixed";
    window.requestAnimationFrame(() => {
      search.focus();
      positionMenu();
    });
  }

  function toggle() {
    setOpen(menu.hidden);
  }

  function onSearchInput() {
    if (clearBtn) {
      clearBtn.hidden = !search.value.length;
    }
    renderResults(search.value);
  }

  function bind() {
    menu = document.getElementById("quick-actions-menu");
    search = document.getElementById("quick-actions-search");
    list = document.getElementById("quick-actions-list");
    empty = document.getElementById("quick-actions-empty");
    trigger = document.getElementById("quick-actions-trigger");
    closeBtn = document.getElementById("quick-actions-close");
    clearBtn = document.getElementById("quick-actions-clear");
    titleEl = document.getElementById("quick-actions-title");
    if (!menu || !search || !list) {
      return;
    }
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    if (titleEl) {
      titleEl.textContent = "Command palette";
    }
    search.setAttribute("placeholder", "Search entries, modules, or actions…");
    search.setAttribute("aria-label", "Search entries, modules, or actions");

    trigger?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });
    closeBtn?.addEventListener("click", () => {
      setOpen(false);
      trigger?.focus();
    });
    search.addEventListener("input", onSearchInput);
    clearBtn?.addEventListener("click", () => {
      search.value = "";
      clearBtn.hidden = true;
      renderResults("");
      search.focus();
    });
    list.addEventListener("click", (event) => {
      const item = event.target.closest("[data-shell-index]");
      if (!item) {
        return;
      }
      event.preventDefault();
      executeRecord(renderedItems[Number(item.getAttribute("data-shell-index"))]);
    });
    list.addEventListener("mousemove", (event) => {
      const item = event.target.closest(".shell-command__item");
      if (!item) {
        return;
      }
      const visible = visibleItems();
      activeIndex = visible.indexOf(item);
      syncActive();
    });
    window.addEventListener("resize", () => {
      if (!menu.hidden) {
        positionMenu();
      }
    });
    document.addEventListener("click", (event) => {
      if (menu.hidden) {
        return;
      }
      if (!menu.contains(event.target) && !trigger?.contains(event.target)) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      const isToggle = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isToggle) {
        event.preventDefault();
        toggle();
        return;
      }
      if (menu.hidden) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger?.focus();
        return;
      }
      const visible = visibleItems();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!visible.length) {
          return;
        }
        activeIndex = (activeIndex + 1) % visible.length;
        syncActive();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!visible.length) {
          return;
        }
        activeIndex = (activeIndex - 1 + visible.length) % visible.length;
        syncActive();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectActive();
      }
    });

    const codeEl = trigger?.querySelector("code");
    if (codeEl) {
      codeEl.textContent = shortcutLabel();
    }
    const footerHint = menu.querySelector(".dropdown-footer .type-caption-sm");
    if (footerHint) {
      footerHint.textContent = `Use ↑↓ to navigate, ↵ to select, ${shortcutLabel()} to toggle, esc to close`;
    }

    window.KNShellCommandPalette = {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle,
      render: renderResults,
      execute: executeRecord
    };
    window.setQuickActionsOpen = setOpen;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
