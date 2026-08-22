(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return "KN";
    }
    return ((parts[0][0] || "") + (parts[1]?.[0] || parts[0][1] || "")).toUpperCase();
  }

  function relativeTime(iso) {
    if (!iso) {
      return "No recent activity";
    }
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return "No recent activity";
    }
    const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 14) return `${days}d ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
  }

  function coverage(selected, total) {
    const count = Array.isArray(selected) ? selected.length : selected?.size || 0;
    const max = Math.max(1, total || 0);
    const pct = Math.round((count / max) * 100);
    const tone = pct >= 80 ? "positive" : pct >= 30 ? "information" : "notice";
    return `<div class="admin-coverage" aria-label="${count} of ${max} permissions">
      <span class="type-caption-sm type-weight-medium">${count}/${max}</span>
      <span class="admin-coverage__track" aria-hidden="true"><span class="admin-coverage__fill" style="width: ${pct}%"></span></span>
      <span class="badge badge--${tone} type-caption-sm type-weight-medium">${pct}%</span>
    </div>`;
  }

  function search({ value, placeholder, label }) {
    return `<div class="search-input vis-search admin-search">
      <span class="search-input__icon" aria-hidden="true">
        <img src="./assets/quick-actions/search.svg" width="16" height="16" alt="" />
      </span>
      <input class="search-input__field type-body-sm" data-admin-q type="search" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value || "")}" aria-label="${escapeHtml(label)}" autocomplete="off" />
      <button class="search-input__clear icon-btn" type="button" data-admin-q-clear ${value ? "" : "hidden"} aria-label="Clear search">
        <img src="./assets/quick-actions/close.svg" width="16" height="16" alt="" />
      </button>
    </div>`;
  }

  function chips(items) {
    return `<div class="vis-chips vis-quickfilters admin-chips" role="radiogroup" aria-label="Quick filters">
      ${items
        .map(
          (item) => `<button class="vis-chip type-ui-sm ${item.selected ? "is-selected" : ""}" type="button" role="radio" data-admin-chip="${escapeHtml(item.id)}" aria-checked="${item.selected}">
            ${escapeHtml(item.label)}
            <span class="counter type-caption-sm">${item.count}</span>
          </button>`
        )
        .join("")}
    </div>`;
  }

  function insight(copy, actionLabel, chip, extras = {}) {
    if (!copy) {
      return "";
    }
    const review = extras.review;
    const action = actionLabel
      ? `<button class="blade-link type-ui-sm" type="button" ${review ? `data-admin-review="${escapeHtml(chip || "inactive")}"` : `data-admin-chip="${escapeHtml(chip || "")}"`}>${escapeHtml(actionLabel)}</button>`
      : "";
    return `<aside class="blade-alert blade-alert--${extras.tone || "information"} admin-insight" role="status">
      <span class="blade-alert__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg>
      </span>
      <p class="type-body-sm blade-alert__desc">${copy}</p>
      ${action}
    </aside>`;
  }

  function toolbar({ search: searchOpts, chips: chipItems, insight: insightOpts, applied }) {
    return `${insight(insightOpts?.copy, insightOpts?.action, insightOpts?.chip, insightOpts || {})}
    ${appliedFilters(applied)}
    <div class="admin-toolbar vis-toolbar">
      ${chips(chipItems || [])}
      ${search(searchOpts)}
    </div>`;
  }

  function appliedFilters(items) {
    const list = (items || []).filter((item) => item && item.label);
    if (!list.length) {
      return "";
    }
    return `<div class="admin-applied" role="list" aria-label="Applied filters">
      ${list
        .map(
          (item) => `<button class="admin-applied__chip type-caption-sm" type="button" role="listitem" data-admin-filter-dismiss="${escapeHtml(item.id)}">
            ${escapeHtml(item.label)}
            <span aria-hidden="true">×</span>
          </button>`
        )
        .join("")}
    </div>`;
  }

  function statusBadge(active) {
    return `<span class="badge badge--${active ? "positive" : "negative"} type-caption-sm type-weight-medium">${active ? "Active" : "Inactive"}</span>`;
  }

  function statusSwitch({ active, toggleAttr, labelId }) {
    return `<div class="admin-drawer-status role-status">
      <span class="type-caption-sm type-weight-medium ${active ? "user-status-label" : "user-status-label--negative"}" id="${escapeHtml(labelId)}">${active ? "Active" : "Inactive"}</span>
      <label class="blade-switch">
        <input type="checkbox" role="switch" ${toggleAttr} ${active ? "checked" : ""} aria-labelledby="${escapeHtml(labelId)}" />
        <span class="blade-switch__ui"></span>
      </label>
    </div>`;
  }

  function pageItems(page, pages) {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, index) => index + 1);
    }
    const items = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(pages - 1, page + 1);
    if (start > 2) {
      items.push("…");
    } else if (start === 2) {
      items.push(2);
    }
    for (let next = start; next <= end; next += 1) {
      if (next !== 1 && next !== pages && !items.includes(next)) {
        items.push(next);
      }
    }
    if (end < pages - 1) {
      items.push("…");
    } else if (end === pages - 1 && !items.includes(pages - 1)) {
      items.push(pages - 1);
    }
    if (!items.includes(pages)) {
      items.push(pages);
    }
    return items;
  }

  function pagination({ page, pages, total, pageSize, pageAttr, sizeSelect, label }) {
    const safePages = Math.max(1, pages || 1);
    const current = Math.min(Math.max(1, page || 1), safePages);
    const from = total ? (current - 1) * pageSize + 1 : 0;
    const to = Math.min(current * pageSize, total);
    const numbers = pageItems(current, safePages)
      .map((item) => {
        if (item === "…") {
          return `<span class="vis-pagination__ellipsis type-caption-sm" aria-hidden="true">…</span>`;
        }
        const on = item === current;
        return `<button class="btn btn--tertiary btn--sm type-ui-sm vis-pagination__page${on ? " is-current" : ""}" type="button" ${pageAttr}="${item}" ${on ? 'aria-current="page"' : ""} aria-label="Page ${item}">${item}</button>`;
      })
      .join("");
    return `<nav class="admin-table__footer vis-pagination" aria-label="${escapeHtml(label || "Pagination")}">
      <p class="type-caption-sm vis-pagination__label">Showing ${from}–${to} of ${total}</p>
      <div class="vis-pagination__pages">
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" ${pageAttr}="${current - 1}" ${current <= 1 ? "disabled" : ""} aria-label="Previous page">Previous</button>
        ${numbers}
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" ${pageAttr}="${current + 1}" ${current >= safePages ? "disabled" : ""} aria-label="Next page">Next</button>
      </div>
      <label class="vis-pagination__size type-caption-sm">Rows ${sizeSelect || ""}</label>
    </nav>`;
  }

  function sortHeader({ key, label, sortKey, sortDir, attr }) {
    const active = sortKey === key;
    const dir = active ? sortDir : "asc";
    const aria = active ? (dir === "desc" ? "descending" : "ascending") : "none";
    return `<th scope="col" aria-sort="${aria}">
      <button class="role-sort type-caption-sm type-weight-medium" type="button" ${attr}="${escapeHtml(key)}" aria-pressed="${active}">
        ${escapeHtml(label)}
        <span class="role-sort__icon" aria-hidden="true">${dir === "desc" ? "↓" : "↑"}</span>
      </button>
    </th>`;
  }

  function moreMenu({ id, open, items }) {
    const dots =
      '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="3" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="8" cy="13" r="1.25"/></svg>';
    return `<div class="vis-menu vis-menu--end admin-more">
      <button class="icon-btn" type="button" data-admin-more-toggle="${escapeHtml(id)}" aria-haspopup="menu" aria-expanded="${open}" aria-label="More actions">${dots}</button>
      <div class="menu-overlay vis-menu__list" ${open ? "" : "hidden"} role="menu">
        ${(items || [])
          .map(
            (item) => `<button class="action-list-item type-ui-sm${item.tone === "negative" ? " is-negative" : ""}" type="button" role="menuitem" ${item.attr}>
              <span>${escapeHtml(item.label)}</span>
            </button>`
          )
          .join("")}
      </div>
    </div>`;
  }

  function handleMoreClick(event, { open, setOpen }) {
    const toggle = event.target.closest("[data-admin-more-toggle]");
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      const key = toggle.getAttribute("data-admin-more-toggle") || "";
      setOpen(open === key ? "" : key);
      return true;
    }
    if (event.target.closest(".admin-more .vis-menu__list")) {
      setOpen("");
      return false;
    }
    return false;
  }

  function permFilters({ query, selectedOnly }) {
    return `<div class="admin-perm-tools">
      <div class="search-input vis-search admin-search admin-perm-search">
        <span class="search-input__icon" aria-hidden="true">
          <img src="./assets/quick-actions/search.svg" width="16" height="16" alt="" />
        </span>
        <input class="search-input__field type-body-sm" data-admin-perm-q type="search" placeholder="Search permissions" value="${escapeHtml(query || "")}" aria-label="Search permissions" autocomplete="off" />
      </div>
      <button class="vis-chip admin-perm-chip type-ui-sm${selectedOnly ? " is-selected" : ""}" type="button" data-admin-perm-selected aria-pressed="${selectedOnly}">Selected only</button>
    </div>`;
  }

  function personCell(user, href) {
    const sub = [user.title, relativeTime(user.lastActive)].filter(Boolean).join(" · ");
    return `<div class="admin-person">
      <span class="avatar avatar--information type-caption-sm type-weight-semibold" aria-hidden="true">${escapeHtml(initials(user.name))}</span>
      <a class="blade-link admin-name-link" href="${href}" data-user-nav="detail" data-user-id="${escapeHtml(user.id)}">
        <span class="type-body-sm type-weight-medium">${escapeHtml(user.name)}</span>
        <span class="type-caption-sm">${escapeHtml(sub)}</span>
      </a>
    </div>`;
  }

  function select({
    id,
    name,
    value,
    options,
    placeholder,
    labelledBy,
    openKey,
    open,
    compact,
    includeEmpty = false,
    emptyLabel = "All"
  }) {
    const selected = options.find((item) => item.id === value);
    const isOpen = open === openKey;
    const check =
      '<svg class="action-list-item__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
    const chevron =
      '<svg class="btn-icon-glyph" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
    const empty = includeEmpty
      ? `<button class="action-list-item type-ui-sm" type="button" role="option" data-admin-select="${escapeHtml(openKey)}" data-admin-select-value="" aria-selected="${!value}">
          ${!value ? check : '<span class="action-list-item__icon" aria-hidden="true"></span>'}
          <span>${escapeHtml(emptyLabel)}</span>
        </button>`
      : "";
    return `<div class="vis-menu blade-select${compact ? " blade-select--compact" : ""}">
      <input type="hidden" id="${escapeHtml(id)}" name="${escapeHtml(name || id)}" value="${escapeHtml(value)}" />
      <button class="${compact ? "vis-th-filter" : "blade-field__control"} blade-select__trigger ${compact ? "type-caption-sm" : "type-body-sm"}" type="button" data-admin-select-toggle="${escapeHtml(openKey)}" aria-haspopup="listbox" aria-expanded="${isOpen}" aria-controls="${escapeHtml(id)}-menu"${labelledBy ? ` aria-labelledby="${escapeHtml(labelledBy)}"` : ""}>
        <span class="${selected ? "" : "blade-select__placeholder"}">${escapeHtml(selected?.label || placeholder)}</span>
        ${chevron}
      </button>
      <div class="menu-overlay vis-menu__list blade-select__menu" id="${escapeHtml(id)}-menu" ${isOpen ? "" : "hidden"} role="listbox">
        ${empty}
        ${options
          .map((item) => {
            const on = item.id === value;
            return `<button class="action-list-item type-ui-sm" type="button" role="option" data-admin-select="${escapeHtml(openKey)}" data-admin-select-value="${escapeHtml(item.id)}" aria-selected="${on}">
              ${on ? check : '<span class="action-list-item__icon" aria-hidden="true"></span>'}
              <span class="action-list-item__copy">
                <span>${escapeHtml(item.label)}</span>
                ${item.hint ? `<span class="type-caption-sm action-list-item__why">${escapeHtml(item.hint)}</span>` : ""}
              </span>
            </button>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  function handleSelectClick(event, { open, setOpen, onChange }) {
    const toggle = event.target.closest("[data-admin-select-toggle]");
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      const key = toggle.getAttribute("data-admin-select-toggle") || "";
      setOpen(open === key ? "" : key);
      return true;
    }
    const option = event.target.closest("[data-admin-select]");
    if (option) {
      event.preventDefault();
      event.stopPropagation();
      onChange(option.getAttribute("data-admin-select"), option.getAttribute("data-admin-select-value") || "");
      setOpen("");
      return true;
    }
    return false;
  }

  function confirmIcon(tone = "negative") {
    const isNegative = tone === "negative";
    return `<span class="blade-confirm__asset blade-confirm__asset--${isNegative ? "negative" : "neutral"}" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        ${
          isNegative
            ? `<path d="M10.3 5.2 3.2 17.5A2 2 0 0 0 4.9 20.5h14.2a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/>`
            : `<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.75" fill="currentColor"/>`
        }
      </svg>
    </span>`;
  }

  function confirmDialog({
    open,
    title,
    description,
    titleId,
    descId,
    dismissAttr,
    confirmAttr,
    confirmLabel,
    secondaryLabel,
    tone = "negative"
  }) {
    if (!open) {
      return "";
    }
    const primary = tone === "negative" ? "btn--primary btn--color-negative" : "btn--primary";
    return `<div class="blade-modal-root">
      <div class="blade-modal__overlay" ${dismissAttr} tabindex="-1"></div>
      <div class="blade-modal blade-modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="${escapeHtml(titleId)}" aria-describedby="${escapeHtml(descId)}">
        <header class="blade-modal__header">
          <button class="icon-btn" type="button" ${dismissAttr} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </header>
        <div class="blade-modal__body blade-confirm">
          ${confirmIcon(tone)}
          <div class="blade-confirm__copy">
            <p class="type-body-lg type-weight-semibold" id="${escapeHtml(titleId)}">${escapeHtml(title)}</p>
            <p class="type-body-md" id="${escapeHtml(descId)}">${escapeHtml(description)}</p>
          </div>
          <div class="blade-confirm__actions">
            <button class="btn btn--tertiary btn--md type-ui-md" type="button" ${dismissAttr}>${escapeHtml(secondaryLabel)}</button>
            <button class="btn ${primary} btn--md type-ui-md" type="button" ${confirmAttr}>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function discardModal({ open, title, description, confirmLabel }) {
    return confirmDialog({
      open,
      title: title || "Discard changes",
      description: description || "Unsaved changes will be lost.",
      titleId: "kn-admin-leave-title",
      descId: "kn-admin-leave-desc",
      dismissAttr: "data-admin-leave-dismiss",
      confirmAttr: "data-admin-leave-confirm",
      confirmLabel: confirmLabel || "Discard",
      secondaryLabel: "Keep editing"
    });
  }

  function confirmModal({ open, title, description, actionLabel, actionAttr }) {
    return confirmDialog({
      open,
      title,
      description: String(description || ""),
      titleId: "kn-admin-confirm-title",
      descId: "kn-admin-confirm-desc",
      dismissAttr: "data-admin-modal-dismiss",
      confirmAttr: actionAttr,
      confirmLabel: actionLabel,
      secondaryLabel: "Cancel"
    });
  }

  function multiSelect({
    labelledBy,
    triggerAttr,
    triggerLabel,
    open,
    menuId,
    searchId,
    searchValue,
    searchPlaceholder,
    searchLabel,
    emptyLabel,
    options
  }) {
    const chevron =
      '<svg class="btn-icon-glyph" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
    const selected = (options || []).some((item) => item.checked);
    return `<div class="vis-menu blade-select blade-select--multi">
      <button class="blade-field__control blade-select__trigger type-body-sm" type="button" ${triggerAttr} aria-haspopup="listbox" aria-expanded="${open}" aria-controls="${escapeHtml(menuId)}" aria-labelledby="${escapeHtml(labelledBy)}">
        <span class="${selected ? "" : "blade-select__placeholder"}">${escapeHtml(triggerLabel)}</span>
        ${chevron}
      </button>
      <div class="menu-overlay vis-menu__list blade-select__menu blade-select__menu--multi" id="${escapeHtml(menuId)}" ${open ? "" : "hidden"} role="listbox" aria-multiselectable="true" aria-labelledby="${escapeHtml(labelledBy)}">
        <div class="blade-select__search">
          <input class="blade-field__control type-body-sm" id="${escapeHtml(searchId)}" type="search" placeholder="${escapeHtml(searchPlaceholder)}" value="${escapeHtml(searchValue || "")}" aria-label="${escapeHtml(searchLabel)}" />
        </div>
        <div class="blade-select__options">
          ${
            (options || []).length
              ? options
                  .map((item) => {
                    const on = Boolean(item.checked);
                    return `<label class="blade-check blade-select__option ${on ? "is-selected" : ""}">
                      <input type="checkbox" ${item.attr} ${on ? "checked" : ""} />
                      <span class="blade-check__box" aria-hidden="true"></span>
                      <span class="type-body-sm">${escapeHtml(item.label)}</span>
                    </label>`;
                  })
                  .join("")
              : `<p class="type-caption-sm blade-select__empty">${escapeHtml(emptyLabel || "No matches.")}</p>`
          }
        </div>
      </div>
    </div>`;
  }

  function accordionItem({ id, title, trailing, open, body }) {
    const panelId = `kn-acc-${id}`;
    const btnId = `${panelId}-btn`;
    return `<div class="role-perm__group blade-accordion-item${open ? " is-open" : ""}" data-perm-group="${escapeHtml(id)}">
      <h3 class="role-perm__heading">
        <button class="role-perm__summary" type="button" id="${escapeHtml(btnId)}" data-admin-accordion="${escapeHtml(id)}" aria-expanded="${open}" aria-controls="${escapeHtml(panelId)}">
          <span class="type-ui-sm type-weight-semibold role-perm__name">${escapeHtml(title)}</span>
          <span class="role-perm__trailing">
            ${trailing}
            <svg class="kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </button>
      </h3>
      <div class="role-perm__body" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(btnId)}" ${open ? "" : "hidden"}>
        ${body}
      </div>
    </div>`;
  }

  function handleAccordionClick(event, { openGroups, setOpen }) {
    const button = event.target.closest("[data-admin-accordion]");
    if (!button) {
      return false;
    }
    event.preventDefault();
    const id = button.getAttribute("data-admin-accordion") || "";
    const next = new Set(openGroups || []);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setOpen(next);
    return true;
  }

  function applicableHead({ titleId, title, allSelected, attr }) {
    return `<div class="blade-field__head">
      <span class="type-caption-sm type-weight-medium blade-field__label" id="${escapeHtml(titleId)}">${escapeHtml(title)}</span>
      <button class="blade-link type-caption-sm" type="button" ${attr}>${allSelected ? "Deselect all" : "Select all"}</button>
    </div>`;
  }

  const overlayKeys = new WeakMap();

  function isVisible(el) {
    if (!el || el.closest("[hidden]")) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function focusables(container) {
    if (!container) {
      return [];
    }
    return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
      (el) => isVisible(el)
    );
  }

  function activeOverlay(scope) {
    if (!scope) {
      return null;
    }
    const modalRoot = [...scope.querySelectorAll(".blade-modal-root")].find(
      (node) => !node.hasAttribute("hidden") && node.querySelector("[aria-modal='true']")
    );
    const modal = modalRoot?.querySelector("[aria-modal='true']");
    if (modal) {
      return modal;
    }
    const drawerRoot = [...scope.querySelectorAll(".blade-drawer-root.is-open")].find((node) => !node.hasAttribute("hidden"));
    return drawerRoot?.querySelector(".blade-drawer[aria-modal='true']") || null;
  }

  function trapFocus(container, event) {
    if (event.key !== "Tab" || !container) {
      return false;
    }
    const nodes = focusables(container);
    if (!nodes.length) {
      event.preventDefault();
      container.focus();
      return true;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && (active === last || !container.contains(active))) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function handleOverlayKeydown(scope, event) {
    return trapFocus(activeOverlay(scope), event);
  }

  function syncOverlayFocus(scope) {
    const overlay = activeOverlay(scope);
    const key = overlay ? overlay.getAttribute("aria-labelledby") || "open" : "";
    if (overlayKeys.get(scope) === key) {
      return overlay;
    }
    overlayKeys.set(scope, key);
    if (!overlay) {
      return null;
    }
    const preferred = overlay.querySelector("h2[tabindex='-1']");
    requestAnimationFrame(() => {
      (preferred || focusables(overlay)[0])?.focus();
    });
    return overlay;
  }

  function chipsOverflow(items, max = 2) {
    const list = items || [];
    if (!list.length) {
      return `<span class="type-caption-sm">None assigned</span>`;
    }
    const shown = list.slice(0, max).map((item) => `<span class="badge type-caption-sm">${escapeHtml(item)}</span>`);
    const rest = list.length - max;
    if (rest > 0) {
      shown.push(`<span class="badge type-caption-sm">+${rest}</span>`);
    }
    return `<div class="user-chips">${shown.join("")}</div>`;
  }

  function emptyState({ title, description, primaryLabel, primaryHref, primaryAttr, secondaryLabel, secondaryAttr }) {
    const secondary = secondaryLabel
      ? `<button class="btn btn--tertiary btn--md type-ui-md" type="button" ${secondaryAttr || ""}>${escapeHtml(secondaryLabel)}</button>`
      : "";
    const primary = primaryLabel
      ? primaryHref
        ? `<a class="btn btn--primary btn--md type-ui-md" href="${escapeHtml(primaryHref)}" ${primaryAttr || ""}>${escapeHtml(primaryLabel)}</a>`
        : `<button class="btn btn--primary btn--md type-ui-md" type="button" ${primaryAttr || ""}>${escapeHtml(primaryLabel)}</button>`
      : "";
    return `<div class="empty-state role-empty">
      <h2 class="type-heading-h5 type-weight-semibold">${escapeHtml(title)}</h2>
      <p class="type-body-sm">${escapeHtml(description)}</p>
      <div class="empty-state__actions">${secondary}${primary}</div>
    </div>`;
  }

  let navigationLock = 0;

  function beginNavigation() {
    navigationLock += 1;
  }

  function consumeNavigation() {
    if (navigationLock > 0) {
      navigationLock -= 1;
      return true;
    }
    return false;
  }

  function adminApiForHash(hash) {
    const path = String(hash || "").split("?")[0];
    if (path.startsWith("#kn-user-management")) {
      return window.KNUsers;
    }
    if (path.startsWith("#kn-role-management")) {
      return window.KNRoles;
    }
    if (path.startsWith("#default-role-management")) {
      return window.KNDefaultRoles;
    }
    return null;
  }

  function tryNavigate(nextHash) {
    if (navigationLock > 0) {
      return true;
    }
    const current = (location.hash || "#dashboard").split("?")[0];
    const next = String(nextHash || "").split("?")[0];
    if (!next || next === current) {
      return true;
    }
    const api = adminApiForHash(current);
    if (api?.isDirty?.()) {
      api.requestLeave(nextHash);
      return false;
    }
    return true;
  }

  window.KNAdminUX = {
    escapeHtml,
    initials,
    relativeTime,
    coverage,
    search,
    chips,
    insight,
    toolbar,
    personCell,
    chipsOverflow,
    select,
    handleSelectClick,
    discardModal,
    confirmModal,
    emptyState,
    statusBadge,
    statusSwitch,
    pagination,
    moreMenu,
    handleMoreClick,
    sortHeader,
    multiSelect,
    accordionItem,
    handleAccordionClick,
    applicableHead,
    activeOverlay,
    handleOverlayKeydown,
    syncOverlayFocus,
    permFilters,
    appliedFilters,
    beginNavigation,
    consumeNavigation,
    tryNavigate,
    adminApiForHash
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest(".blade-select, [data-admin-select-toggle], .admin-more, [data-admin-more-toggle]")) {
      return;
    }
    document.dispatchEvent(new CustomEvent("kn-close-selects"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (!event.target.matches("tr[data-user-id], tr[data-role-id], tr[data-drole-id]")) {
      return;
    }
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
})();
