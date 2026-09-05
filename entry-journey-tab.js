/**
 * Entry filing — Journey tab: append-only patch timeline with scrub + restore.
 */
(() => {
  "use strict";

  const ACTION_LABELS = Object.freeze({
    fill: "auto-filled",
    accept: "confirmed",
    reject: "rejected",
    edit: "edited",
    extract: "extracted",
    restore: "restored version",
    "submit-ace": "submitted to ACE",
    "submit-psc": "submitted PSC correction"
  });

  function escapeHtml(v) {
    return window.KNAdminUX?.escapeHtml?.(v) ?? String(v ?? "");
  }

  function brokerActor() {
    try {
      return window.KNPersona?.resolve?.()?.name || "Jane Cooper";
    } catch (_error) {
      return "Jane Cooper";
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function formatWhen(iso) {
    if (!iso) {
      return "—";
    }
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function displayValue(value) {
    const text = value == null ? "" : String(value);
    return text.trim() ? text : "—";
  }

  function patchActor(patch) {
    const meta = patch.meta || {};
    if (patch.source === "agent") {
      return "Klear Agent";
    }
    if (meta.action === "restore") {
      return meta.actor || brokerActor();
    }
    return meta.actor || patch.source || brokerActor();
  }

  function patchActionLabel(patch) {
    const meta = patch.meta || {};
    if (meta.patch_type === "psc_amendment" && meta.action === "edit") {
      return "PSC amendment";
    }
    return ACTION_LABELS[meta.action] || meta.action || "changed";
  }

  function patchSourceTone(patch) {
    const meta = patch.meta || {};
    if (meta.action === "restore") {
      return "restore";
    }
    return patch.source === "agent" ? "agent" : "human";
  }

  function orderedPatches(patches, descending) {
    const list = Array.isArray(patches) ? [...patches] : [];
    return descending ? list.reverse() : list;
  }

  function resolveFocusIndex(ordered, focusPatchId) {
    if (!ordered.length) {
      return -1;
    }
    if (focusPatchId) {
      const idx = ordered.findIndex((p) => p.patch_id === focusPatchId);
      if (idx >= 0) {
        return idx;
      }
    }
    return 0;
  }

  function renderFieldDiff(fieldChange, fieldLabel) {
    const key = fieldChange.field_key || "";
    const before = fieldChange.before?.value ?? "";
    const after = fieldChange.after?.value ?? "";
    const label = fieldChange.meta?.fieldLabel || fieldLabel?.(key) || key || "Field";
    return `<div class="entry-journey__diff-row">
      <dt class="type-caption-sm">${escapeHtml(label)}</dt>
      <dd class="type-body-sm entry-journey__diff-values">
        <span class="entry-journey__value entry-journey__value--before">${escapeHtml(displayValue(before))}</span>
        <span class="entry-journey__arrow" aria-hidden="true">→</span>
        <span class="entry-journey__value entry-journey__value--after">${escapeHtml(displayValue(after))}</span>
      </dd>
    </div>`;
  }

  function renderPatchItem(patch, index, focusIndex, fieldLabel) {
    const meta = patch.meta || {};
    const tone = patchSourceTone(patch);
    const isActive = index === focusIndex;
    const changes = Array.isArray(patch.fields_changed) ? patch.fields_changed : [];
    const canRestore = changes.length > 0;
    const actor = patchActor(patch);
    const action = patchActionLabel(patch);

    const diffBlock = changes.length
      ? `<dl class="entry-journey__diff">${changes.map((fc) => renderFieldDiff(fc, fieldLabel)).join("")}</dl>`
      : `<p class="type-body-sm entry-journey__summary">${escapeHtml(meta.fieldLabel || meta.newValue || "Record event")}</p>`;

    const restoreNote = meta.restored_from_patch_id
      ? `<p class="type-caption-sm entry-journey__restore-ref">Restored from patch <code>${escapeHtml(meta.restored_from_patch_id)}</code></p>`
      : "";

    const toolLine = patch.tool_call
      ? `<p class="type-caption-sm entry-journey__tool">Tool: ${escapeHtml(typeof patch.tool_call === "string" ? patch.tool_call : patch.tool_call.name || "agent")}</p>`
      : "";

    return `<li
      class="entry-journey__item kn-journey__item${isActive ? " is-scrub-active" : ""}"
      id="entry-journey-point-${escapeHtml(String(index))}"
      data-entry-journey-index="${index}"
      data-entry-journey-patch="${escapeHtml(patch.patch_id)}"
    >
      <button
        class="entry-journey__scrub-hit"
        type="button"
        data-entry-journey-focus="${escapeHtml(patch.patch_id)}"
        aria-current="${isActive ? "step" : "false"}"
        aria-label="Scrub to ${escapeHtml(actor)} ${escapeHtml(action)} at ${escapeHtml(formatWhen(patch.timestamp))}"
      >
        <span class="entry-journey__marker kn-journey__marker entry-journey__marker--${tone}" aria-hidden="true">
          ${tone === "agent"
            ? `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="3"/></svg>`
            : tone === "restore"
              ? `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M3 8a5 5 0 0 1 8.5-3.5M13 8a5 5 0 0 1-8.5 3.5"/><path d="M3 4v4h4M13 12v-4H9"/></svg>`
              : `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1"/></svg>`}
        </span>
      </button>
      <div class="entry-journey__body kn-journey__body">
        <div class="entry-journey__topline kn-journey__topline">
          <span class="badge badge--${tone === "agent" ? "ai" : tone === "restore" ? "notice" : "information"} type-caption-sm kn-badge">${escapeHtml(tone === "agent" ? "Agent" : tone === "restore" ? "Restore" : "Human")}</span>
          <time class="type-caption-sm entry-journey__when" datetime="${escapeHtml(patch.timestamp)}">${escapeHtml(formatWhen(patch.timestamp))}</time>
        </div>
        <p class="type-ui-sm type-weight-semibold entry-journey__who">${escapeHtml(actor)} <span class="entry-journey__action">${escapeHtml(action)}</span></p>
        ${diffBlock}
        ${restoreNote}
        ${toolLine}
        ${meta.patch_type === "psc_amendment" ? `<span class="badge badge--notice type-caption-sm kn-badge entry-journey__psc-type">PSC amendment</span>` : ""}
        ${canRestore
          ? `<button class="btn btn--tertiary btn--sm type-ui-sm kn-btn entry-journey__restore" type="button" data-entry-journey-restore="${escapeHtml(patch.patch_id)}">Restore this version</button>`
          : `<p class="type-caption-sm entry-journey__no-restore">No field snapshot — record event only.</p>`}
      </div>
    </li>`;
  }

  function render(options = {}) {
    const {
      patches = [],
      fieldLabel = (key) => key,
      focusPatchId = "",
      descending = true
    } = options;

    if (!patches.length) {
      return `<p class="type-body-sm entry-utility__empty">No changes recorded yet. Every settled field decision will appear here as an append-only patch.</p>`;
    }

    const ordered = orderedPatches(patches, descending);
    const focusIndex = resolveFocusIndex(ordered, focusPatchId);
    const scrubMax = Math.max(ordered.length - 1, 0);
    const scrubValue = focusIndex >= 0 ? focusIndex : 0;

    return `<div class="entry-journey-page">
      <header class="entry-journey-head kn-journey-head">
        <div class="kn-journey-head__lead">
          <div class="kn-journey-title">
            <h3 class="type-heading-h6 type-weight-semibold">Patch journey</h3>
            <span class="badge badge--neutral type-caption-sm kn-badge">${ordered.length} ${ordered.length === 1 ? "patch" : "patches"}</span>
          </div>
          <p class="type-caption-sm entry-journey-head__lead">Append-only legal record — nothing is ever silently erased.</p>
        </div>
        <label class="entry-journey-order">
          <span class="type-caption-sm">Newest first</span>
          <input type="checkbox" role="switch" ${descending ? "checked" : ""} data-entry-journey-order aria-label="Order patches newest first" />
        </label>
      </header>
      <div class="entry-journey-scrub">
        <label class="type-caption-sm entry-journey-scrub__label" for="entry-journey-scrub-range">Scrub timeline</label>
        <input
          id="entry-journey-scrub-range"
          class="entry-journey-scrub__range"
          type="range"
          min="0"
          max="${scrubMax}"
          step="1"
          value="${scrubValue}"
          data-entry-journey-scrub
          aria-valuetext="${escapeHtml(formatWhen(ordered[scrubValue]?.timestamp))} · ${scrubValue + 1} of ${ordered.length}"
          aria-label="Scrub through patch history"
        />
        <span class="type-caption-sm entry-journey-scrub__pos" aria-live="polite">${scrubValue + 1} / ${ordered.length}</span>
      </div>
      <ol class="entry-journey kn-journey" role="list" aria-label="Patch history timeline">${ordered
        .map((patch, index) => renderPatchItem(patch, index, focusIndex, fieldLabel))
        .join("")}</ol>
    </div>`;
  }

  function findPatch(patches, patchId) {
    return (patches || []).find((p) => p.patch_id === patchId) || null;
  }

  function restoreFromPatch(entryId, patch, fieldLabel) {
    const api = window.KNEntryFormState;
    if (!api || !patch?.fields_changed?.length) {
      return null;
    }

    const updates = {};
    patch.fields_changed.forEach(({ field_key, after }) => {
      if (!field_key || !after) {
        return;
      }
      updates[field_key] = api.cloneField(after);
    });

    const keys = Object.keys(updates);
    if (!keys.length) {
      return null;
    }

    const actor = brokerActor();
    return api.applyFieldUpdates(entryId, updates, {
      source: "human",
      meta: {
        action: "restore",
        actor,
        restored_from_patch_id: patch.patch_id,
        fieldKey: keys[0],
        fieldLabel: keys.length === 1 ? fieldLabel(keys[0]) : `${keys.length} fields`,
        source: "human"
      }
    });
  }

  function scrollFocusIntoView() {
    requestAnimationFrame(() => {
      const item = document.querySelector(".entry-journey__item.is-scrub-active");
      if (!item) {
        return;
      }
      item.scrollIntoView({
        block: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    });
  }

  function handleInteraction(event, ctx) {
    const { state, row, helpers, patches, fieldLabel } = ctx;
    if (!row?.id) {
      return false;
    }

    const orderToggle = event.target.closest("[data-entry-journey-order]");
    if (orderToggle) {
      event.preventDefault();
      state.journeyDescending = orderToggle.checked;
      helpers.rerender();
      scrollFocusIntoView();
      return true;
    }

    const scrub = event.target.closest("[data-entry-journey-scrub]");
    if (scrub && event.type === "input") {
      const ordered = orderedPatches(patches(), state.journeyDescending !== false);
      const idx = Number.parseInt(scrub.value, 10);
      const patch = ordered[idx];
      if (patch) {
        state.journeyFocusPatchId = patch.patch_id;
        helpers.rerender();
        scrollFocusIntoView();
      }
      return true;
    }

    const focusBtn = event.target.closest("[data-entry-journey-focus]");
    if (focusBtn) {
      event.preventDefault();
      state.journeyFocusPatchId = focusBtn.getAttribute("data-entry-journey-focus") || "";
      helpers.rerender();
      scrollFocusIntoView();
      return true;
    }

    const restoreBtn = event.target.closest("[data-entry-journey-restore]");
    if (restoreBtn) {
      event.preventDefault();
      const patchId = restoreBtn.getAttribute("data-entry-journey-restore") || "";
      const patch = findPatch(patches(), patchId);
      if (!patch) {
        return true;
      }
      const newPatch = restoreFromPatch(row.id, patch, fieldLabel);
      if (!newPatch) {
        window.KNAdminUX?.toast?.("Nothing to restore on this point.", "notice");
        return true;
      }
      state.journeyFocusPatchId = newPatch.patch_id;
      ctx.afterRestore?.(row, newPatch);
      helpers.rerender();
      scrollFocusIntoView();
      window.KNAdminUX?.toast?.("Restored — new patch appended to the record.", "positive");
      return true;
    }

    return false;
  }

  window.KNEntryJourney = Object.freeze({
    render,
    restoreFromPatch,
    handleInteraction,
    scrollFocusIntoView,
    orderedPatches
  });
})();
