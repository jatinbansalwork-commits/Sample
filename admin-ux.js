(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Missing read-only display values use an em-dash. Keep "N/A" for true not-applicable. */
  function emptyDisplay(value) {
    if (value == null) {
      return "—";
    }
    const text = String(value).trim();
    return text || "—";
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

  function formatMetaDate(iso) {
    if (!iso) {
      return "Not updated";
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "Not updated";
    }
    return `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}`;
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

  function toolbar({ chips: chipItems, insight: insightOpts, applied, results }) {
    return `${insight(insightOpts?.copy, insightOpts?.action, insightOpts?.chip, insightOpts || {})}
    ${appliedFilters(applied)}
    <div class="admin-toolbar vis-toolbar">
      ${chips(chipItems || [])}
    </div>
    ${results ? `<p class="visually-hidden" aria-live="polite">${escapeHtml(results)}</p>` : ""}`;
  }

  function colFilter({ attr, key, value, label, placeholder }) {
    const id = `${attr.replace(/^data-/, "")}-${key}`;
    const ph = placeholder || (label ? `Search by ${label}` : "Search");
    return `<th scope="col">
      <label class="visually-hidden" for="${escapeHtml(id)}">Filter ${escapeHtml(label)}</label>
      <input class="vis-th-filter type-caption-sm" id="${escapeHtml(id)}" ${attr}="${escapeHtml(key)}" type="search" placeholder="${escapeHtml(ph)}" value="${escapeHtml(value || "")}" aria-label="Filter ${escapeHtml(label)}" autocomplete="off" spellcheck="false" />
    </th>`;
  }

  function colSelect({ attr, key, value, label, options }) {
    const id = `${attr.replace(/^data-/, "")}-${key}`;
    const opts = options
      .map(
        (item) => `<option value="${escapeHtml(item.value)}"${item.value === value ? " selected" : ""}>${escapeHtml(item.label)}</option>`
      )
      .join("");
    return `<th scope="col">
      <label class="visually-hidden" for="${escapeHtml(id)}">Filter ${escapeHtml(label)}</label>
      <select class="vis-th-filter vis-th-filter--select type-caption-sm" id="${escapeHtml(id)}" ${attr}="${escapeHtml(key)}" aria-label="Filter ${escapeHtml(label)}">
        <option value="">All</option>
        ${opts}
      </select>
    </th>`;
  }

  function colBladeSelect({ attr, key, value, label, options, open }) {
    const uid = `${attr.replace(/^data-/, "")}-${key}`;
    const labelId = `${uid}-label`;
    return `<th scope="col" class="vis-th-filter-cell--blade-select">
      <span class="visually-hidden" id="${escapeHtml(labelId)}">Filter ${escapeHtml(label)}</span>
      ${select({
        id: uid,
        name: key,
        value: value || "",
        options: options.map((item) => ({ id: item.value, label: item.label })),
        placeholder: "All",
        labelledBy: labelId,
        openKey: key,
        open,
        compact: true,
        includeEmpty: true,
        emptyLabel: "All"
      })}
    </th>`;
  }

  function emptyColFilter() {
    return `<th scope="col" aria-hidden="true"></th>`;
  }

  function captureColFilterFocus(scope) {
    const el = document.activeElement;
    if (!el || !scope?.contains(el)) {
      return null;
    }
    const attr = ["data-user-filter", "data-role-filter", "data-drole-filter"].find((name) => el.hasAttribute(name));
    if (!attr) {
      return null;
    }
    return {
      attr,
      key: el.getAttribute(attr) || "",
      start: el.selectionStart,
      end: el.selectionEnd
    };
  }

  function restoreColFilterFocus(scope, saved) {
    if (!saved || !scope) {
      return;
    }
    const el = scope.querySelector(`[${saved.attr}="${CSS.escape(saved.key)}"]`);
    if (!el) {
      return;
    }
    el.focus({ preventScroll: true });
    if (typeof el.setSelectionRange === "function") {
      const start = saved.start ?? el.value.length;
      const end = saved.end ?? el.value.length;
      el.setSelectionRange(start, end);
    }
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
      <p class="type-caption-sm vis-pagination__label" aria-live="polite">Showing ${from}–${to} of ${total}</p>
      <div class="vis-pagination__pages">
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" ${pageAttr}="${current - 1}" ${current <= 1 ? "disabled" : ""} aria-label="Previous page">Previous</button>
        ${numbers}
        <button class="btn btn--tertiary btn--sm type-ui-sm" type="button" ${pageAttr}="${current + 1}" ${current >= safePages ? "disabled" : ""} aria-label="Next page">Next</button>
      </div>
      <label class="vis-pagination__size type-caption-sm">Rows per page ${sizeSelect || ""}</label>
    </nav>`;
  }

  function sortHeader({ key, label, sortKey, sortDir, attr }) {
    const active = sortKey === key;
    const dir = active ? sortDir : "asc";
    const aria = active ? (dir === "desc" ? "descending" : "ascending") : "none";
    const next = active && dir === "asc" ? "descending" : "ascending";
    return `<th scope="col" aria-sort="${aria}">
      <button class="role-sort type-caption-sm type-weight-medium" type="button" ${attr}="${escapeHtml(key)}" aria-pressed="${active}" aria-label="Sort by ${escapeHtml(label)}, ${active ? aria : `currently unsorted, activate for ${next}`}">
        ${escapeHtml(label)}
        <span class="role-sort__icon" aria-hidden="true">${dir === "desc" ? "↓" : "↑"}</span>
      </button>
    </th>`;
  }

  function titleCell({ title, subtitle, href, navAttr, initials: letters, tone = "information" }) {
    return `<div class="admin-person">
      <span class="avatar avatar--${escapeHtml(tone)} type-caption-sm type-weight-semibold" aria-hidden="true">${escapeHtml(letters || initials(title))}</span>
      <a class="blade-link admin-name-link" href="${href}" ${navAttr || ""}>
        <span class="type-body-sm type-weight-medium">${escapeHtml(title)}</span>
        <span class="type-caption-sm">${subtitle}</span>
      </a>
    </div>`;
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

  function pickFrom(list, seed) {
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!items.length) {
      return "";
    }
    const s = String(seed || "kn");
    let hash = 0;
    for (let i = 0; i < s.length; i += 1) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return items[Math.abs(hash) % items.length];
  }

  function inferRoleArchetype(name) {
    const n = String(name || "").toLowerCase();
    if (/read.?only|viewer|subscriber/.test(n)) return "readonly";
    if (/admin|administrator/.test(n)) return "admin";
    if (/finance|credit|billing|klear 360|k360/.test(n)) return "finance";
    if (/visib|track/.test(n)) return "visibility";
    if (/broker/.test(n)) return "broker";
    if (/entity|customer/.test(n)) return "entity";
    if (/ops|operation/.test(n)) return "ops";
    if (/content|publish/.test(n)) return "content";
    if (/notif/.test(n)) return "notify";
    if (/isf|filing|customs|transaction/.test(n)) return "customs";
    if (/analytics|report/.test(n)) return "analytics";
    if (/user.?access|user.?manage/.test(n)) return "users";
    if (/drayage/.test(n)) return "drayage";
    return "";
  }

  function permissionGroupCoverage(permissions, catalog) {
    const set = permissions instanceof Set ? permissions : new Set(permissions || []);
    return (catalog || [])
      .map((group) => {
        const moduleIds = (group.modules || []).map((mod) => mod.id);
        let count = 0;
        let total = 0;
        moduleIds.forEach((id) => {
          ["create", "update", "delete", "read"].forEach((action) => {
            total += 1;
            if (set.has(`${id}:${action}`)) {
              count += 1;
            }
          });
        });
        return { id: group.id, title: group.title, count, total };
      })
      .filter((group) => group.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  function permCategoryStats(permissions, catalog, actions = ["create", "update", "delete", "read"]) {
    const set = permissions instanceof Set ? permissions : new Set(permissions || []);
    const all = (catalog || []).map((group) => {
      const keys = (group.modules || []).flatMap((mod) => actions.map((action) => `${mod.id}:${action}`));
      const count = keys.filter((key) => set.has(key)).length;
      const total = keys.length;
      return {
        id: group.id,
        title: group.title,
        group,
        count,
        total,
        ratio: total ? count / total : 0
      };
    });
    const used = all
      .filter((item) => item.count > 0)
      .sort((a, b) => b.ratio - a.ratio || b.count - a.count || a.title.localeCompare(b.title));
    const unused = all.filter((item) => item.count === 0);
    return {
      all,
      used,
      unused,
      selected: set.size,
      total: all.reduce((sum, item) => sum + item.total, 0)
    };
  }

  function permCategoryTone(count, total) {
    if (!count) {
      return "neutral";
    }
    if (total && count >= total) {
      return "positive";
    }
    return "notice";
  }

  function accessSummary(permissions, catalog, actions) {
    const stats = permCategoryStats(permissions, catalog, actions);
    const { selected, total, used } = stats;
    if (!selected) {
      return "No permissions selected";
    }
    if (used.length === 1) {
      return `${selected} of ${total} permissions, mostly in ${used[0].title}`;
    }
    if (used.length && used[0].count / selected >= 0.5) {
      return `${selected} of ${total} permissions, mostly in ${used[0].title}`;
    }
    if (used.length === 2) {
      return `${selected} of ${total} permissions, mainly in ${used[0].title} and ${used[1].title}`;
    }
    if (used.length && used.every((item) => item.count === item.total) && unusedEmpty(stats)) {
      return `${selected} of ${total} permissions across all categories`;
    }
    if (used.length) {
      return `${selected} of ${total} permissions across ${used.length} categories`;
    }
    return `${selected} of ${total} permissions`;
  }

  function unusedEmpty(stats) {
    return !stats.unused.length;
  }

  const OPS_FLAG_DISMISS_KEY = "kn-ai-ops-flags-dismissed-v1";

  function readOpsFlagDismissed() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(OPS_FLAG_DISMISS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function isOpsFlagDismissed(id) {
    return Boolean(readOpsFlagDismissed()[id]);
  }

  function dismissOpsFlag(id) {
    if (!id) {
      return;
    }
    const next = { ...readOpsFlagDismissed(), [id]: true };
    try {
      window.localStorage.setItem(OPS_FLAG_DISMISS_KEY, JSON.stringify(next));
    } catch (_error) {
      /* ignore quota */
    }
    window.dispatchEvent(new CustomEvent("kn-ai-ops-flag-change", { detail: { id } }));
  }

  function humanizeModuleId(id, catalog) {
    const raw = String(id || "").trim();
    if (!raw) {
      return "";
    }
    for (const group of catalog || []) {
      const match = (group.modules || []).find((mod) => mod.id === raw);
      if (match?.title) {
        return match.title;
      }
    }
    return raw
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function viewerDeleteAnomaly(name, permissions) {
    const label = String(name || "").trim();
    if (!/viewer|read[ -]?only/i.test(label)) {
      return null;
    }
    const set = permissions instanceof Set ? permissions : new Set(permissions || []);
    const deletes = [...set].filter((key) => /:delete$/i.test(key));
    if (!deletes.length) {
      return null;
    }
    const modules = [...new Set(deletes.map((key) => key.split(":")[0]))];
    return { name: label, deletes, modules };
  }

  function opsFlagHtml({ id, title, body, href, hrefLabel, tone = "notice" }) {
    if (!id || isOpsFlagDismissed(id)) {
      return "";
    }
    const observe = tone === "observe";
    const link = href
      ? `<a class="ai-ops-flag__link blade-link type-caption-sm" href="${escapeHtml(href)}">${escapeHtml(hrefLabel || "Open")}</a>`
      : "";
    const icon = observe
      ? `<span class="ai-ops-flag__icon" aria-hidden="true">✦</span>`
      : `<span class="ai-ops-flag__icon ai-ops-flag__icon--notice" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg>
        </span>`;
    return `<aside class="ai-ops-flag${observe ? " ai-ops-flag--observe" : ""}" data-ai-ops-flag="${escapeHtml(id)}" role="status">
      ${icon}
      <div class="ai-ops-flag__content">
        <div class="ai-ops-flag__head">
          <p class="ai-ops-flag__title type-ui-sm type-weight-semibold">${escapeHtml(title)}</p>
          <div class="ai-ops-flag__actions">
            ${link}
            <button class="icon-btn" type="button" data-ai-ops-dismiss="${escapeHtml(id)}" aria-label="Dismiss flag">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
        </div>
        <p class="ai-ops-flag__body type-caption-sm">${body}</p>
      </div>
    </aside>`;
  }

  function permissionAnomalyFlagHtml(name, permissions, { idPrefix = "perm-anomaly", catalog } = {}) {
    const hit = viewerDeleteAnomaly(name, permissions);
    if (!hit) {
      return "";
    }
    const moduleLabels = hit.modules
      .slice(0, 3)
      .map((id) => humanizeModuleId(id, catalog))
      .filter(Boolean);
    const modules = moduleLabels.join(", ");
    const extra = hit.modules.length > 3 ? ` +${hit.modules.length - 3} more` : "";
    return opsFlagHtml({
      id: `${idPrefix}-${String(name || "").toLowerCase().replace(/\s+/g, "-")}`,
      tone: "observe",
      title: "Permission anomaly",
      body: `<strong>${escapeHtml(hit.name)}</strong> includes <strong>Delete</strong>${
        modules ? ` on <strong>${escapeHtml(modules)}${escapeHtml(extra)}</strong>` : ""
      }. <span class="ai-ops-flag__note">Observation only — nothing was changed.</span>`,
      href: "",
      hrefLabel: ""
    });
  }

  function diffRoleCategories(permsA, permsB, catalog, actions = ["create", "update", "delete", "read"]) {
    const left = permCategoryStats(permsA, catalog, actions);
    const right = permCategoryStats(permsB, catalog, actions);
    return left.all
      .map((item) => {
        const peer = right.all.find((row) => row.id === item.id);
        if (!peer || item.count === peer.count) {
          return null;
        }
        return {
          id: item.id,
          title: item.title,
          a: item.count,
          b: peer.count,
          total: item.total
        };
      })
      .filter(Boolean);
  }

  function sortedJoin(values) {
    return [...(values || [])].map(String).sort().join("\0");
  }

  function snapshotRoleForm(form) {
    const perms = form?.permissions;
    const permList = perms instanceof Set ? [...perms] : [...(perms || [])];
    return {
      name: String(form?.name || "").trim(),
      applicable: sortedJoin(form?.applicable),
      permissions: sortedJoin(permList),
      services: sortedJoin(form?.services)
    };
  }

  function isRoleFormDirty(form, snapshot) {
    if (!snapshot) {
      return false;
    }
    const current = snapshotRoleForm(form);
    return (
      current.name !== snapshot.name ||
      current.applicable !== snapshot.applicable ||
      current.permissions !== snapshot.permissions ||
      current.services !== snapshot.services
    );
  }

  function submitButtonAttrs(disabled) {
    return disabled ? `disabled aria-disabled="true"` : `aria-disabled="false"`;
  }

  function roleMetaLine({
    owner,
    updatedAt,
    count,
    countSingular,
    countPlural,
    countHref,
    coveragePct,
    detailsOpen,
    detailsId,
    detailsHtml,
    toggleAttr
  }) {
    const noun = count === 1 ? countSingular || "person" : countPlural || "people";
    const countLabel = `${count || 0} ${noun}`;
    const countPart =
      countHref && count
        ? `<a class="blade-link type-caption-sm" href="${escapeHtml(countHref)}">${escapeHtml(countLabel)}</a>`
        : `<span>${escapeHtml(countLabel)}</span>`;
    const cov = typeof coveragePct === "number" ? `${coveragePct}% coverage` : "";
    const bits = [
      `<span>${escapeHtml(owner || "Unknown")}</span>`,
      `<span>${escapeHtml(formatMetaDate(updatedAt))}</span>`,
      countPart,
      cov ? `<span>${escapeHtml(cov)}</span>` : ""
    ].filter(Boolean);
    const open = Boolean(detailsOpen);
    const panelId = detailsId || "role-meta-details";
    return `<div class="role-meta">
      <div class="role-meta__bar">
        <p class="role-meta-line type-caption-sm">${bits.join(`<span class="role-meta-line__dot" aria-hidden="true"> · </span>`)}</p>
        <button class="blade-link type-caption-sm role-meta__details-btn" type="button" ${toggleAttr || "data-admin-details-toggle"} aria-expanded="${open}" aria-controls="${escapeHtml(panelId)}">Details</button>
      </div>
      <div class="role-meta__panel" id="${escapeHtml(panelId)}" ${open ? "" : "hidden"}>
        ${detailsHtml || ""}
      </div>
    </div>`;
  }

  function roleViewEditToggle({ expanded, controlsId, attr }) {
    const open = Boolean(expanded);
    return `<button class="btn btn--secondary btn--sm type-ui-sm" type="button" ${attr || "data-admin-drawer-mode"} aria-expanded="${open}" aria-controls="${escapeHtml(controlsId || "")}">
      ${open ? "Collapse editor" : "Edit"}
    </button>`;
  }

  /** Heavy roles (≈KN Administrator scale): optional light view mode only. */
  function isHeavyRole(permissions, totalCount) {
    const count = permissions instanceof Set ? permissions.size : (permissions || []).length;
    const total = Math.max(1, Number(totalCount) || 0);
    const pct = (count / total) * 100;
    return pct >= 70 || count >= Math.ceil(total / 2);
  }

  function aiRoleAssist({ name, permissions, catalog, mode = "role", seed } = {}) {
    const trimmed = String(name || "").trim();
    const arch = inferRoleArchetype(trimmed);
    const groups = permissionGroupCoverage(permissions, catalog);
    const top = groups[0];
    const second = groups[1];
    const isDefault = mode === "drole";
    const namedPlaceholders = {
      admin: `e.g. ${trimmed} needs full account access to manage users, roles, and entities`,
      readonly: `e.g. ${trimmed} should view shipments and reports without making changes`,
      finance: `e.g. ${trimmed} owns credits, promo codes, and billing exceptions`,
      visibility: `e.g. ${trimmed} monitors shipment visibility and flags tracking exceptions`,
      entity: `e.g. ${trimmed} manages customer entities and broker associations`,
      broker: `e.g. ${trimmed} reviews broker filings and manages broker associations`,
      ops: `e.g. ${trimmed} reviews operational exceptions in Intelligent OPS Hub`,
      content: `e.g. ${trimmed} publishes release notes, user guides, and announcements`,
      notify: `e.g. ${trimmed} owns notification templates and trigger management`,
      customs: `e.g. ${trimmed} reviews broker filings and approves customs docs`,
      analytics: `e.g. ${trimmed} views analytics dashboards and reporting metrics`,
      users: `e.g. ${trimmed} manages user access, roles, and access control`,
      drayage: `e.g. ${trimmed} manages drayage marketplace bookings and exceptions`
    };
    let placeholder;
    if (trimmed && namedPlaceholders[arch]) {
      placeholder = namedPlaceholders[arch];
    } else if (trimmed && top) {
      placeholder = `e.g. ${trimmed} typically works in ${top.title} — describe what they should do`;
    } else if (trimmed) {
      placeholder = `e.g. Describe what ${trimmed} should be able to do day to day`;
    } else {
      placeholder = pickFrom(
        isDefault
          ? [
              "e.g. Customer users who view shipments and manage their own entity profile",
              "e.g. Broker users who file customs docs and track associated shipments",
              "e.g. Company admins who inherit finance, entity, and visibility defaults"
            ]
          : [
              "e.g. This person manages KlearNow operator access and reviews role assignments",
              "e.g. This person monitors shipment visibility and flags exceptions for ops",
              "e.g. This person owns finance credits, promo codes, and billing exceptions"
            ],
        seed
      );
    }

    const chips = [];
    const seen = new Set();
    const addChip = (id, label, prompt) => {
      if (!label || !prompt || seen.has(label) || chips.length >= 3) {
        return;
      }
      seen.add(label);
      chips.push({ id, label, prompt });
    };

    if (arch === "admin") {
      addChip("full-access", "Full customer account access", "Full customer account access — manage users, roles, and customer entities");
      addChip("users-roles", "Users + role management", "This person manages users, roles, and access control");
    } else if (arch === "readonly") {
      addChip("read-vis", "Read-only visibility for customer users", "Read-only visibility for customer users tracking shipments");
      addChip("reports-only", "View reports without edits", "This person views analytics dashboards and reporting metrics without making changes");
    } else if (arch === "finance") {
      addChip("billing-only", "Billing + credits only", "Billing + entity management only — finance credits and promo codes");
      addChip("finance-own", "Own finance exceptions", "This person owns finance credits, billing, and payment exceptions");
    } else if (arch === "visibility") {
      addChip("track-ship", "Shipment tracking access", "This person monitors shipment visibility and cargo tracking");
      addChip("vis-read", "Read-only visibility", "Read-only visibility for ops reviewing shipment tracking");
    } else if (arch === "broker") {
      addChip("broker-file", "Broker filing and tracking", "This person reviews broker filings and approve customs docs");
      addChip("broker-rel", "Broker relationship admin", "This person manages broker associations and freight broker access");
    } else if (arch === "entity") {
      addChip("entity-admin", "Customer + entity management", "This person manages customers, clients, and entity profiles");
      addChip("entity-broker", "Entities and brokers", "This person manages customer entities and broker associations");
    } else if (arch === "customs") {
      addChip("customs-docs", "Customs filings and docs", "This person reviews broker filings and approves customs docs");
      addChip("isf-ops", "ISF and import operations", "This person handles ISF filings, import, and export transactions");
    } else if (arch === "ops") {
      addChip("ops-review", "Operational exception review", "This person reviews operational exceptions in Intelligent OPS Hub");
    } else if (arch === "users") {
      addChip("user-access", "User access management", "This person manages users, add user, and access control");
    } else if (arch === "notify") {
      addChip("notify-own", "Notification ownership", "This person owns notification templates, alerts, and trigger management");
    } else if (arch === "content") {
      addChip("content-pub", "Publish product content", "This person publishes release notes, user guides, and announcements");
    } else if (arch === "analytics") {
      addChip("analytics-view", "Analytics and reporting", "This person views analytics dashboards, reporting, and metrics");
    } else if (arch === "drayage") {
      addChip("drayage-ops", "Drayage marketplace access", "This person manages drayage bookings and related exceptions");
    }

    if (top && top.count >= 2) {
      const keyword =
        top.id === "administration"
          ? "users, roles, and access control"
          : top.id === "entity"
            ? "customers and entity profiles"
            : top.id === "finance"
              ? "finance credits and billing"
              : top.id === "klearhub" || top.id === "visibility"
                ? "shipment visibility and tracking"
                : top.id === "notifications"
                  ? "notifications and alerts"
                  : top.id === "content"
                    ? "release notes and announcements"
                    : top.id === "ops-hub"
                      ? "operations in Intelligent OPS Hub"
                      : top.id === "transaction-us"
                        ? "customs filings and ISF"
                        : top.id === "analytics"
                          ? "analytics dashboards and reporting"
                          : top.title.toLowerCase();
      addChip(`focus-${top.id}`, `${top.title} focused`, `This role is concentrated in ${top.title} — ${keyword}`);
    }
    if (trimmed && second) {
      addChip(
        `also-${second.id}`,
        `Also include ${second.title.toLowerCase()}`,
        `Roles similar to ${trimmed} typically also include ${second.title} — ${second.title.toLowerCase()}`
      );
    }

    if (isDefault) {
      addChip("cust-self", "Customer account self-service", "Customer users who manage their entity profile and view shipment visibility");
      addChip("broker-file-fb", "Broker filing and tracking", "Broker users who review broker filings and approve customs docs");
      addChip("company-inherit", "Company-wide inherited defaults", "Company admins who inherit finance, entity, and visibility defaults");
    } else {
      addChip("full-ops", "Full internal operator access", "This person manages users, roles, and access control across KlearNow");
      addChip("ro-vis", "Read-only visibility for ops", "Read-only visibility for customer users tracking shipments");
      addChip("billing-entity", "Billing + entity management only", "Billing + entity management only — finance credits and customer entities");
    }

    return { placeholder, prompts: chips.slice(0, 3) };
  }

  function permFilters({ query, selectedOnly, aiDescribe, aiLoading, aiNoMatch, aiAttr, totalCount, selectedCount, placeholder, prompts, inputMode = "describe" }) {
    const assistantMark = `<img class="ai-describe-icon" src="./assets/klear-assistant-mark.png" alt="" width="18" height="18" />`;
    const searchIcon = `<svg class="search-input__svg-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><circle cx="6.5" cy="6.5" r="4"/><path d="M10.5 10.5 L14 14"/></svg>`;
    const attr = escapeHtml(aiAttr || "role");
    const searchOpen = inputMode === "search";
    const searchId = `perm-smart-search-${attr}`;
    const describeId = `ai-describe-input-${attr}`;
    const loadingDots =
      aiLoading && !searchOpen
        ? `<span class="ai-describe-loading" aria-live="polite" aria-label="Generating suggestions">
          <span></span><span></span><span></span>
        </span>`
        : "";
    const noMatchBanner = aiNoMatch
      ? `<p class="ai-describe-no-match type-caption-sm" role="alert">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" width="14" height="14"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/></svg>
          No strong matches — refine the description or switch to Search.
        </p>`
      : "";
    const charCount = (aiDescribe || "").length;
    const charCountId = `ai-describe-count-${attr}`;
    const charHint = !searchOpen && charCount > 0 ? `<span class="ai-describe-char-count type-caption-sm" id="${charCountId}" aria-live="polite">${charCount}/200</span>` : "";
    const selCount = typeof selectedCount === "number" ? selectedCount : 0;
    const totCount = typeof totalCount === "number" ? totalCount : 0;
    const field = searchOpen
      ? `<input class="ai-describe-field type-body-sm" id="${searchId}" data-admin-perm-q type="search" placeholder="Search permissions…" value="${escapeHtml(query || "")}" aria-label="Search permissions" autocomplete="off" />`
      : `<input
          class="ai-describe-field type-body-sm"
          id="${describeId}"
          data-ai-describe="${attr}"
          type="text"
          placeholder="${escapeHtml(placeholder || "Describe what this role should be able to do")}"
          value="${escapeHtml(aiDescribe || "")}"
          maxlength="200"
          aria-label="Describe the role to get AI-suggested permissions"
          ${charCount > 0 ? `aria-describedby="${charCountId}"` : ""}
          autocomplete="off"
        />`;
    const clearBtn =
      !searchOpen && aiDescribe
        ? `<button class="ai-describe-clear icon-btn" type="button" data-ai-describe-clear="${attr}" aria-label="Clear AI suggestions">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" width="14" height="14"><path d="M4 4 L12 12 M12 4 L4 12"/></svg>
        </button>`
        : "";
    const suffix =
      !searchOpen && (loadingDots || charHint || clearBtn)
        ? `<span class="ai-describe-suffix">${loadingDots}${charHint}${clearBtn}</span>`
        : "";
    const describeExtras = `${
      !searchOpen && !aiDescribe && prompts?.length
        ? `<div class="ai-describe-prompts" role="group">
            <div class="ai-describe-prompts__chips">
              ${prompts
                .map(
                  (item) => `<button type="button" class="ai-describe-chip type-caption-sm" data-ai-prompt="${attr}" data-ai-prompt-text="${escapeHtml(item.prompt)}" aria-label="Use suggestion: ${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`
                )
                .join("")}
            </div>
          </div>`
        : ""
    }
        ${noMatchBanner}`;
    return `<div class="admin-perm-tools perm-smart ${searchOpen ? "is-search" : "is-describe"}">
      <div class="perm-smart__input-row">
        <div class="perm-mode-toggle" role="group" aria-label="Find permissions">
          <button type="button" class="perm-mode-toggle__btn type-caption-sm type-weight-medium${!searchOpen ? " is-active" : ""}" data-perm-input-mode="describe" aria-pressed="${!searchOpen}">Describe</button>
          <button type="button" class="perm-mode-toggle__btn type-caption-sm type-weight-medium${searchOpen ? " is-active" : ""}" data-perm-input-mode="search" aria-pressed="${searchOpen}">Search</button>
        </div>
        <div class="ai-describe-input-wrap${aiLoading && !searchOpen ? " is-loading" : ""}">
          <span class="ai-describe-input-icon" aria-hidden="true">${searchOpen ? searchIcon : assistantMark}</span>
          ${field}
          ${suffix}
        </div>
      </div>
      ${describeExtras}
      <div class="perm-toolbar">
        <div class="perm-toolbar__row">
          ${totCount > 0 ? `<span class="perm-running-total type-caption-sm">${selCount} of ${totCount} selected</span>` : ""}
          <button class="perm-selected-toggle${selectedOnly ? " is-active" : ""} type-ui-sm" type="button" data-admin-perm-selected aria-pressed="${selectedOnly}">
            <span class="perm-selected-toggle__pip"></span>
            Selected only
          </button>
          ${selectedCount > 0 ? `<button class="perm-clear-all type-caption-sm blade-link" type="button" data-admin-perm-clear-all>Clear all</button>` : ""}
        </div>
      </div>
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
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
    options,
    chipsInTrigger = false,
    chips
  }) {
    const chevron =
      '<svg class="btn-icon-glyph" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
    const selected = (options || []).some((item) => item.checked);
    const chipItems = chipsInTrigger ? chips || [] : [];
    const triggerAria = `${triggerAttr} aria-haspopup="listbox" aria-expanded="${open}" aria-controls="${escapeHtml(menuId)}" aria-labelledby="${escapeHtml(labelledBy)}"`;
    const triggerBody = chipItems.length
      ? `<div class="blade-select__chips">${chipItems
          .map((chip) => {
            const label = escapeHtml(chip.label);
            return `<span class="badge type-caption-sm blade-select__chip">
              <span class="blade-select__chip-label">${label}</span>
              <button class="blade-select__chip-remove" type="button" ${chip.removeAttr} aria-label="Remove ${label}">×</button>
            </span>`;
          })
          .join("")}</div>`
      : `<span class="${selected && !chipsInTrigger ? "" : "blade-select__placeholder"}">${escapeHtml(triggerLabel)}</span>`;
    const trigger = chipsInTrigger
      ? `<div class="blade-field__control blade-select__trigger type-body-sm${chipItems.length ? " blade-select__trigger--filled" : ""}" role="combobox" aria-autocomplete="list" tabindex="0" ${triggerAria}>
        ${triggerBody}
        ${chevron}
      </div>`
      : `<button class="blade-field__control blade-select__trigger type-body-sm" type="button" ${triggerAria}>
        ${triggerBody}
        ${chevron}
      </button>`;
    return `<div class="vis-menu blade-select blade-select--multi${chipsInTrigger ? " blade-select--chips" : ""}">
      ${trigger}
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

  function accordionItem({ id, title, trailing, open, body, modules, includesLabel, tone, leadingExtra = "" }) {
    const panelId = `kn-acc-${id}`;
    const btnId = `${panelId}-btn`;
    const nameId = `${panelId}-name`;
    const titles = (modules || []).map((mod) => mod.title).filter(Boolean);
    const intro = includesLabel || "Includes:";
    const toneClass = tone ? ` role-perm__group--tone-${escapeHtml(tone)}` : "";
    const infoBtn = titles.length
      ? `<button class="info-tip role-perm__info" type="button" data-perm-info data-tooltip-placement="bottom" data-tooltip-title="${escapeHtml(intro)}" data-tooltip="${escapeHtml(titles.map((item) => `• ${item}`).join("\n"))}" aria-label="What’s included in ${escapeHtml(title)}" aria-describedby="${escapeHtml(panelId)}-includes" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg>
        </button>
        <span class="visually-hidden" id="${escapeHtml(panelId)}-includes">${escapeHtml(intro)} ${escapeHtml(titles.join(", "))}</span>`
      : "";
    return `<div class="role-perm__group blade-accordion-item${open ? " is-open" : ""}${toneClass}" data-perm-group="${escapeHtml(id)}">
      <h3 class="role-perm__heading">
        <div class="role-perm__summary">
          <button class="role-perm__toggle" type="button" id="${escapeHtml(btnId)}" data-admin-accordion="${escapeHtml(id)}" aria-expanded="${open}" aria-controls="${escapeHtml(panelId)}" aria-labelledby="${escapeHtml(nameId)}">
            <span class="role-perm__lead">
              <span class="type-ui-sm type-weight-semibold role-perm__name" id="${escapeHtml(nameId)}">${escapeHtml(title)}</span>
              ${leadingExtra || ""}
            </span>
          </button>
          <span class="role-perm__trailing">
            <span class="role-perm__info-slot">${infoBtn}</span>
            <span class="role-perm__count-slot">${trailing || ""}</span>
            <svg class="kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" width="16" height="16"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </h3>
      <div class="role-perm__body" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(btnId)}" ${open ? "" : "hidden"}>
        ${body}
      </div>
    </div>`;
  }

  function unusedCategoriesBlock({ count, open, body, suffix = "role", label }) {
    const panelId = `kn-acc-unused-${escapeHtml(suffix)}`;
    const btnId = `${panelId}-btn`;
    const nameId = `${panelId}-name`;
    const title = label || `Other categories (${count})`;
    return `<div class="role-perm__group role-perm__group--unused blade-accordion-item${open ? " is-open" : ""}">
      <h3 class="role-perm__heading">
        <div class="role-perm__summary">
          <button class="role-perm__toggle" type="button" id="${escapeHtml(btnId)}" data-admin-unused-toggle aria-expanded="${open}" aria-controls="${escapeHtml(panelId)}" aria-labelledby="${escapeHtml(nameId)}">
            <span class="role-perm__lead">
              <span class="type-ui-sm type-weight-semibold role-perm__name" id="${escapeHtml(nameId)}">${escapeHtml(title)}</span>
            </span>
          </button>
          <span class="role-perm__trailing">
            <span class="role-perm__info-slot" aria-hidden="true"></span>
            <span class="role-perm__count-slot" aria-hidden="true"></span>
            <svg class="kh-accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" width="16" height="16"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </h3>
      <div class="role-perm__body role-perm__unused-body" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(btnId)}" ${open ? "" : "hidden"}>
        ${body}
      </div>
    </div>`;
  }

  /** Resolve the header control even when the click lands on decorative children (badge/chevron). */
  function resolvePermHeaderControl(event, selector) {
    if (event.target.closest("[data-perm-info]")) {
      return null;
    }
    const direct = event.target.closest(selector);
    if (direct) {
      return direct;
    }
    const summary = event.target.closest(".role-perm__summary");
    return summary ? summary.querySelector(selector) : null;
  }

  function handleAccordionClick(event, { openGroups, setOpen }) {
    if (event.target.closest("[data-perm-info]")) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    const button = resolvePermHeaderControl(event, "[data-admin-accordion]");
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

  function handlePermInputModeClick(event, { mode, setMode }) {
    const btn = event.target.closest("[data-perm-input-mode]");
    if (!btn) {
      return false;
    }
    event.preventDefault();
    const next = btn.getAttribute("data-perm-input-mode") === "search" ? "search" : "describe";
    if (next !== mode) {
      setMode(next);
    }
    return true;
  }

  function handlePermInputModeKey(event, { mode, setMode }) {
    const btn = event.target.closest("[data-perm-input-mode]");
    if (!btn) {
      return false;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return false;
    }
    event.preventDefault();
    const next = btn.getAttribute("data-perm-input-mode") === "search" ? "search" : "describe";
    if (next !== mode) {
      setMode(next);
    }
    return true;
  }

  function applicableHead({ titleId, title, allSelected, attr }) {
    return `<div class="blade-field__head">
      <span class="type-caption-sm type-weight-medium blade-field__label" id="${escapeHtml(titleId)}">${escapeHtml(title)}</span>
      <button class="blade-link type-caption-sm" type="button" ${attr}>${allSelected ? "Clear all" : "Select all"}</button>
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
      (preferred || focusables(overlay)[0])?.focus({ preventScroll: true });
    });
    return overlay;
  }

  function drawerScrollBody(scope) {
    if (!scope) {
      return null;
    }
    const overlay = activeOverlay(scope) || scope.querySelector?.(".blade-drawer[aria-modal='true']");
    if (!overlay) {
      return null;
    }
    if (overlay.matches(".blade-drawer__body")) {
      return overlay;
    }
    return overlay.querySelector(".blade-drawer__body");
  }

  function captureDrawerScroll(scope) {
    const body = drawerScrollBody(scope);
    return body ? { top: body.scrollTop, left: body.scrollLeft } : null;
  }

  function captureDrawerFocus(scope) {
    const active = document.activeElement;
    const body = drawerScrollBody(scope);
    if (!body || !active || !body.contains(active)) {
      return null;
    }
    if (active.id) {
      return `#${CSS.escape(active.id)}`;
    }
    if (active.hasAttribute("data-admin-perm-q")) {
      return "[data-admin-perm-q]";
    }
    if (active.hasAttribute("data-ai-describe")) {
      return `[data-ai-describe="${CSS.escape(active.getAttribute("data-ai-describe") || "")}"]`;
    }
    if (active.name) {
      let selector = `${active.tagName.toLowerCase()}[name="${CSS.escape(active.name)}"]`;
      if (active.type) {
        selector += `[type="${CSS.escape(active.type)}"]`;
      }
      if (active.value != null && active.value !== "") {
        selector += `[value="${CSS.escape(active.value)}"]`;
      }
      return selector;
    }
    return null;
  }

  function restoreDrawerScroll(scope, saved, { focusSelector } = {}) {
    if (!saved) {
      return;
    }
    const body = drawerScrollBody(scope);
    if (!body) {
      return;
    }
    const apply = () => {
      body.scrollTop = saved.top;
      body.scrollLeft = saved.left;
    };
    apply();
    requestAnimationFrame(apply);
    if (focusSelector) {
      requestAnimationFrame(() => {
        const el = scope.querySelector(focusSelector) || document.querySelector(focusSelector);
        el?.focus({ preventScroll: true });
      });
    }
  }

  function chipsOverflow(items, max = 2) {
    const list = (items || []).map((item) => String(item || "").trim()).filter(Boolean);
    if (!list.length) {
      return `<span class="type-caption-sm">None assigned</span>`;
    }
    // Table pattern: "Customer, Sub-customer, +2" (first N labels, then remainder count)
    if (list.length <= max) {
      return `<span class="type-body-sm admin-multi-value" data-tooltip="${escapeHtml(list.join(", "))}">${escapeHtml(list.join(", "))}</span>`;
    }
    const visible = list.slice(0, max);
    const hidden = list.length - max;
    const summary = `${visible.join(", ")}, +${hidden}`;
    return `<span class="type-body-sm admin-multi-value" data-tooltip="${escapeHtml(list.join(", "))}">${escapeHtml(visible.join(", "))}, <span class="admin-multi-value__more">+${hidden}</span></span>`;
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

  const DEFAULT_PERM_ACTIONS = ["create", "update", "delete", "read"];
  const PERM_ACTION_LABEL = { create: "Create", update: "Update", delete: "Delete", read: "Read" };
  const PERM_BLOCKED_READ_MSG = "Read is required for Create/Update/Delete access on this item";

  function permKeyOf(moduleId, action) {
    return `${moduleId}:${action}`;
  }

  function parsePermKey(key) {
    const raw = String(key || "");
    const idx = raw.lastIndexOf(":");
    if (idx <= 0) {
      return { moduleId: raw, action: "" };
    }
    return { moduleId: raw.slice(0, idx), action: raw.slice(idx + 1) };
  }

  function writeActionsOf(actions = DEFAULT_PERM_ACTIONS) {
    return actions.filter((action) => action !== "read");
  }

  function allKeysSelected(set, keys) {
    const list = Array.isArray(keys) ? keys : [];
    return Boolean(list.length) && list.every((key) => set.has(key));
  }

  /**
   * Row/col master checkbox is indeterminate only when some — but not zero and not all —
   * of the leaf keys are selected.
   */
  function someKeysSelected(set, keys) {
    const list = Array.isArray(keys) ? keys : [];
    if (!list.length) {
      return false;
    }
    let selected = 0;
    for (const key of list) {
      if (set.has(key)) {
        selected += 1;
      }
    }
    return selected > 0 && selected < list.length;
  }

  function bindIndeterminate(root) {
    if (!root) {
      return;
    }
    root.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const should = input.hasAttribute("data-indeterminate");
      if (input.indeterminate !== should) {
        input.indeterminate = should;
      }
    });
  }

  function emptyPermDepResult(permissions) {
    return {
      permissions,
      autoCheckedRead: false,
      blockedUncheckRead: false,
      triggerAction: null,
      autoCheckedKeys: [],
      blockedModules: []
    };
  }

  /**
   * Apply Read-dependency for a single permission key toggle.
   * Write actions (create/update/delete) imply Read; Read alone does not imply writes.
   * Unchecking Read while any write remains is blocked.
   */
  function applyPermDependency(permissionsSet, key, checked, actions = DEFAULT_PERM_ACTIONS) {
    // Always copy — never mutate the caller's Set. Callers that sync via clear()+add
    // will wipe everything if we return the same reference.
    const permissions = new Set(toKeyList(permissionsSet));
    const { moduleId, action } = parsePermKey(key);
    if (!moduleId || !action) {
      return emptyPermDepResult(permissions);
    }
    const writes = writeActionsOf(actions);
    const hasRead = actions.includes("read");
    const readKey = permKeyOf(moduleId, "read");
    let autoCheckedRead = false;
    let blockedUncheckRead = false;
    let triggerAction = null;
    const autoCheckedKeys = [];
    const blockedModules = [];

    if (checked) {
      permissions.add(key);
      if (hasRead && writes.includes(action) && !permissions.has(readKey)) {
        permissions.add(readKey);
        autoCheckedRead = true;
        triggerAction = action;
        autoCheckedKeys.push(readKey);
      }
    } else if (action === "read" && hasRead) {
      const anyWrite = writes.some((wa) => permissions.has(permKeyOf(moduleId, wa)));
      if (anyWrite) {
        blockedUncheckRead = true;
        permissions.add(readKey);
        blockedModules.push(moduleId);
      } else {
        permissions.delete(key);
      }
    } else {
      permissions.delete(key);
    }

    return {
      permissions,
      autoCheckedRead,
      blockedUncheckRead,
      triggerAction,
      autoCheckedKeys,
      blockedModules
    };
  }

  /**
   * Bulk toggle keys with the same per-row Read dependency.
   * Turning writes on also adds Read per module. Turning Read off is allowed only when
   * all writes for that module are also being removed (or already absent).
   */
  function applyPermDependencyToggle(permissionsSet, keys, actions = DEFAULT_PERM_ACTIONS) {
    // Always copy — row/col/group toggles call syncPermSet(target, result.permissions).
    // Returning the same Set made syncPermSet clear()+forEach a full cascade wipe.
    const permissions = new Set(toKeyList(permissionsSet));
    const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
    if (!list.length) {
      return emptyPermDepResult(permissions);
    }
    const keySet = new Set(list);
    const allOn = list.every((key) => permissions.has(key));
    const turnOn = !allOn;
    const writes = writeActionsOf(actions);
    const hasRead = actions.includes("read");
    const autoCheckedKeys = [];
    const blockedModules = [];
    let autoCheckedRead = false;
    let blockedUncheckRead = false;
    let triggerAction = null;

    if (turnOn) {
      const before = new Set(permissions);
      list.forEach((key) => permissions.add(key));
      const modulesTouched = new Set();
      list.forEach((key) => {
        const { moduleId, action } = parsePermKey(key);
        if (writes.includes(action)) {
          modulesTouched.add(moduleId);
          if (!triggerAction) {
            triggerAction = action;
          }
        }
      });
      if (hasRead) {
        modulesTouched.forEach((moduleId) => {
          const readKey = permKeyOf(moduleId, "read");
          const wasPresent = before.has(readKey);
          const inBatch = keySet.has(readKey);
          permissions.add(readKey);
          if (!wasPresent && !inBatch && !autoCheckedKeys.includes(readKey)) {
            autoCheckedKeys.push(readKey);
          }
        });
      }
      autoCheckedRead = autoCheckedKeys.length > 0;
      if (autoCheckedRead && !triggerAction) {
        triggerAction = writes[0] || "create";
      }
    } else {
      list.forEach((key) => {
        const { moduleId, action } = parsePermKey(key);
        if (action === "read" && hasRead) {
          const wouldHaveWrite = writes.some((wa) => {
            const writeKey = permKeyOf(moduleId, wa);
            return permissions.has(writeKey) && !keySet.has(writeKey);
          });
          if (wouldHaveWrite) {
            blockedUncheckRead = true;
            permissions.add(permKeyOf(moduleId, "read"));
            if (!blockedModules.includes(moduleId)) {
              blockedModules.push(moduleId);
            }
            return;
          }
        }
        permissions.delete(key);
      });
    }

    return {
      permissions,
      autoCheckedRead,
      blockedUncheckRead,
      triggerAction,
      autoCheckedKeys,
      blockedModules
    };
  }

  /** Ensure every module with a write action also has Read (e.g. AI suggest). */
  function ensureWriteImpliesRead(permissionsSet, actions = DEFAULT_PERM_ACTIONS) {
    const permissions = new Set(toKeyList(permissionsSet));
    if (!actions.includes("read")) {
      return emptyPermDepResult(permissions);
    }
    const writes = writeActionsOf(actions);
    const autoCheckedKeys = [];
    const modules = new Set();
    permissions.forEach((key) => {
      const { moduleId, action } = parsePermKey(key);
      if (writes.includes(action)) {
        modules.add(moduleId);
      }
    });
    modules.forEach((moduleId) => {
      const readKey = permKeyOf(moduleId, "read");
      if (!permissions.has(readKey)) {
        permissions.add(readKey);
        autoCheckedKeys.push(readKey);
      }
    });
    return {
      permissions,
      autoCheckedRead: autoCheckedKeys.length > 0,
      blockedUncheckRead: false,
      triggerAction: autoCheckedKeys.length ? writes[0] || "create" : null,
      autoCheckedKeys,
      blockedModules: []
    };
  }

  /**
   * Merge multi-select state when only a subset of options is rendered in the DOM
   * (search, accordion filter, collapsed unused groups, etc.).
   * Visible keys take the DOM checked state; non-visible keys keep prior selections.
   */
  function toKeyList(list) {
    if (!list) {
      return [];
    }
    if (Array.isArray(list)) {
      return list;
    }
    if (typeof list[Symbol.iterator] === "function") {
      return [...list];
    }
    return [];
  }

  /**
   * Copy permission keys into `target` without identity hazards.
   * If `target === next`, this is a no-op (already the desired Set).
   * The old clear()+forEach pattern wiped the catalog whenever helpers
   * returned the same Set reference they mutated.
   */
  function syncPermissionSet(target, next) {
    if (!target || typeof target.clear !== "function" || typeof target.add !== "function") {
      return target;
    }
    if (target === next) {
      return target;
    }
    // Refuse to clear when next is missing — a null/undefined next used to empty the catalog.
    if (next == null) {
      return target;
    }
    target.clear();
    toKeyList(next).forEach((key) => {
      if (key) {
        target.add(key);
      }
    });
    return target;
  }

  function mergeDomMultiSelect(priorList, domCheckedKeys, domVisibleKeys) {
    const prior = toKeyList(priorList);
    const visible = new Set(domVisibleKeys || []);
    const checked = (domCheckedKeys || []).filter(Boolean);
    return [...prior.filter((key) => key && !visible.has(key)), ...checked];
  }

  /**
   * Merge permission Sets safely when the permission matrix is only partially in the DOM.
   * Never replace the whole Set from checked inputs alone.
   */
  function mergePermissionSelections(priorPermissions, domCheckedKeys, domVisibleKeys) {
    return new Set(mergeDomMultiSelect(priorPermissions, domCheckedKeys, domVisibleKeys));
  }

  /**
   * Immutable scoped permission toggle (single key) with Read-dependency rules.
   * Leaves all unrelated permissions untouched.
   */
  function applyPermissionToggle(permissions, key, checked, actions = DEFAULT_PERM_ACTIONS) {
    const base = new Set(toKeyList(permissions));
    const result = applyPermDependency(base, key, checked, actions);
    return {
      permissions: new Set(result.permissions),
      autoCheckedRead: result.autoCheckedRead,
      blockedUncheckRead: result.blockedUncheckRead,
      triggerAction: result.triggerAction,
      autoCheckedKeys: result.autoCheckedKeys.slice(),
      blockedModules: result.blockedModules.slice()
    };
  }

  /** Immutable scoped user-form field update — only the given key changes. */
  function applyUserField(form, key, value) {
    const base = form && typeof form === "object" ? form : {};
    return { ...base, [key]: value };
  }

  /**
   * Detect a save that would significantly strip permissions (data-loss safety net).
   * Returns null when safe; otherwise details for a hard confirm dialog.
   */
  function permissionReductionRisk(originalPermissions, nextPermissions, inheritanceCount = 0, opts = {}) {
    const original = new Set(toKeyList(originalPermissions));
    const next = new Set(toKeyList(nextPermissions));
    const originalCount = original.size;
    const nextCount = next.size;
    const removed = originalCount - nextCount;
    const minRemoved = opts.minRemoved ?? 5;
    const ratio = opts.ratio ?? 0.25;
    if (removed <= 0) {
      return null;
    }
    const ratioHit = originalCount > 0 && removed / originalCount >= ratio;
    if (removed < minRemoved && !ratioHit) {
      return null;
    }
    return {
      removed,
      originalCount,
      nextCount,
      inheritanceCount: Number(inheritanceCount) || 0
    };
  }

  function formatPermissionReductionConfirm(risk, noun = "customers") {
    if (!risk) {
      return "";
    }
    const who =
      risk.inheritanceCount > 0
        ? ` a role used by ${risk.inheritanceCount} ${noun}`
        : " this role";
    return `This will remove ~${risk.removed} permissions from${who}. Are you sure?`;
  }

  /**
   * Prefer the richer of stored vs drawer-open snapshot when evaluating save risk.
   * Prevents a silent wipe when localStorage was already corrupted mid-session.
   */
  function permissionBaselineForSave(storedPermissions, formSnapshot) {
    const stored = toKeyList(storedPermissions);
    const opened = formSnapshot?.permissions
      ? String(formSnapshot.permissions)
          .split("\0")
          .map((key) => key.trim())
          .filter(Boolean)
      : [];
    return opened.length > stored.length ? opened : stored;
  }

  /**
   * Block saves that would blank previously filled required user fields as a side effect.
   * Returns list of cleared field keys (empty when safe).
   */
  function detectClearedRequiredUserFields(snapshot, next, requiredKeys = ["name", "email", "roles"]) {
    if (!snapshot || !next) {
      return [];
    }
    const cleared = [];
    requiredKeys.forEach((key) => {
      const was = snapshot[key];
      const now = next[key];
      const wasFilled =
        key === "roles" ? Array.isArray(was) && was.length > 0 : Boolean(String(was ?? "").trim());
      const nowEmpty =
        key === "roles" ? !Array.isArray(now) || now.length === 0 : !String(now ?? "").trim();
      if (wasFilled && nowEmpty) {
        cleared.push(key);
      }
    });
    return cleared;
  }

  /**
   * Repair seeded roles that look wiped (near-empty vs known seed catalog).
   * Returns { roles, repairs: [{ id, name, from, to }] }.
   */
  function repairNearEmptySeedRoles(storedRoles, seedRoles, opts = {}) {
    const ratio = opts.ratio ?? 0.25;
    const minSeed = opts.minSeed ?? 8;
    const seeds = Array.isArray(seedRoles) ? seedRoles : [];
    const repairs = [];
    const roles = (Array.isArray(storedRoles) ? storedRoles : []).map((role) => {
      const seed = seeds.find((item) => item.id === role.id || item.name === role.name);
      if (!seed) {
        return role;
      }
      const seedPerms = seed.permissions || [];
      const currPerms = role.permissions || [];
      const seedCount = seedPerms.length;
      const currCount = currPerms.length;
      if (seedCount < minSeed) {
        return role;
      }
      if (currCount >= Math.max(3, Math.floor(seedCount * ratio))) {
        return role;
      }
      repairs.push({
        id: role.id,
        name: role.name,
        from: currCount,
        to: seedCount
      });
      return {
        ...role,
        permissions: seedPerms.slice(),
        updatedAt: new Date().toISOString()
      };
    });
    return { roles, repairs };
  }

  function permDependencyMessage(result, actionLabels = PERM_ACTION_LABEL) {
    const parts = [];
    if (result?.autoCheckedRead && result.triggerAction) {
      const label = actionLabels[result.triggerAction] || result.triggerAction;
      parts.push(`Read auto-selected because ${label} requires Read`);
    } else if (result?.autoCheckedRead) {
      parts.push("Read auto-selected because a write action requires Read");
    }
    if (result?.blockedUncheckRead) {
      parts.push(PERM_BLOCKED_READ_MSG);
    }
    return parts.join(". ");
  }

  window.KNAdminUX = {
    escapeHtml,
    emptyDisplay,
    initials,
    relativeTime,
    formatMetaDate,
    coverage,
    search,
    chips,
    insight,
    toolbar,
    colFilter,
    colSelect,
    colBladeSelect,
    emptyColFilter,
    captureColFilterFocus,
    restoreColFilterFocus,
    personCell,
    titleCell,
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
    unusedCategoriesBlock,
    resolvePermHeaderControl,
    handleAccordionClick,
    handlePermInputModeClick,
    handlePermInputModeKey,
    applicableHead,
    activeOverlay,
    handleOverlayKeydown,
    syncOverlayFocus,
    captureDrawerScroll,
    captureDrawerFocus,
    restoreDrawerScroll,
    permFilters,
    permCategoryStats,
    permCategoryTone,
    accessSummary,
    opsFlagHtml,
    dismissOpsFlag,
    isOpsFlagDismissed,
    permissionAnomalyFlagHtml,
    viewerDeleteAnomaly,
    diffRoleCategories,
    snapshotRoleForm,
    isRoleFormDirty,
    submitButtonAttrs,
    roleMetaLine,
    roleViewEditToggle,
    isHeavyRole,
    aiRoleAssist,
    appliedFilters,
    beginNavigation,
    consumeNavigation,
    tryNavigate,
    adminApiForHash,
    DEFAULT_PERM_ACTIONS,
    PERM_ACTION_LABEL,
    PERM_BLOCKED_READ_MSG,
    permKeyOf,
    parsePermKey,
    allKeysSelected,
    someKeysSelected,
    bindIndeterminate,
    applyPermDependency,
    applyPermDependencyToggle,
    ensureWriteImpliesRead,
    permDependencyMessage,
    mergeDomMultiSelect,
    mergePermissionSelections,
    syncPermissionSet,
    applyPermissionToggle,
    applyUserField,
    permissionReductionRisk,
    formatPermissionReductionConfirm,
    permissionBaselineForSave,
    detectClearedRequiredUserFields,
    repairNearEmptySeedRoles
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
