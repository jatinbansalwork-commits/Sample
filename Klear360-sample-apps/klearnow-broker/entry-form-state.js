/**
 * Canonical entry form state — single source of truth for Entry Form,
 * Klear Agent field proposals, and validation.
 *
 * Per field: value, status, confidence, fill_source, tool_used, rationale,
 * citations, locked_until, alternatives.
 *
 * Patches are append-only (never mutate history). Emits DOM events for a
 * future SSE bridge — patch events dispatch within PATCH_VISIBILITY_MS.
 */
(() => {
  const FIELD_STATUSES = Object.freeze([
    "empty",
    "agent_draft",
    "agent_final",
    "user_override",
    "locked",
    "error"
  ]);

  const STORAGE_KEY = "kn-entry-form-state-v1";
  const LEGACY_AUDIT_KEY = "kn-entry-audit-v1";
  const MAX_PATCHES_PER_ENTRY = 500;
  /** Target budget for patch visibility on the event bus (future SSE layer). */
  const PATCH_VISIBILITY_MS = 500;

  const EVENT_PATCH = "kn-entry-form-state:patch";
  const EVENT_SNAPSHOT = "kn-entry-form-state:snapshot";
  const EVENT_FIELD = "kn-entry-form-state:field";

  const bus = typeof EventTarget !== "undefined" ? new EventTarget() : null;
  const registry = new Map();

  function createPatchId() {
    return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function cloneField(field) {
    if (!field) {
      return null;
    }
    return {
      value: field.value ?? "",
      status: field.status,
      confidence: field.confidence ?? null,
      fill_source: field.fill_source ?? null,
      tool_used: field.tool_used ?? null,
      rationale: field.rationale ?? null,
      citations: Array.isArray(field.citations) ? field.citations.map((c) => ({ ...c })) : [],
      locked_until: field.locked_until ?? null,
      alternatives: Array.isArray(field.alternatives) ? field.alternatives.map((a) => ({ ...a })) : []
    };
  }

  /**
   * Normalize legacy seed shapes (`state`, `citation`, `lockedReason`) into
   * the canonical field record.
   */
  function normalizeField(input = {}) {
    const status = FIELD_STATUSES.includes(input.status)
      ? input.status
      : FIELD_STATUSES.includes(input.state)
        ? input.state
        : "empty";

    let citations = [];
    if (Array.isArray(input.citations)) {
      citations = input.citations;
    } else if (input.citation) {
      citations = [input.citation];
    }

    return {
      value: input.value ?? "",
      status,
      confidence: typeof input.confidence === "number" ? input.confidence : input.confidence ?? null,
      fill_source: input.fill_source ?? input.fillSource ?? null,
      tool_used: input.tool_used ?? input.toolUsed ?? null,
      rationale: input.rationale ?? input.lockedReason ?? null,
      citations,
      locked_until: input.locked_until ?? input.lockedUntil ?? null,
      alternatives: Array.isArray(input.alternatives) ? input.alternatives : []
    };
  }

  function readStorage() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeStorage(all) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      // storage unavailable — in-memory registry still works for the session
    }
  }

  function migrateLegacyAudit(entryId, entryState) {
    try {
      const legacy = JSON.parse(window.localStorage.getItem(LEGACY_AUDIT_KEY) || "[]");
      if (!Array.isArray(legacy) || !legacy.length) {
        return;
      }
      const forEntry = legacy.filter((row) => row.entryId === entryId);
      if (!forEntry.length || entryState.patches.length) {
        return;
      }
      forEntry.reverse().forEach((row) => {
        const fieldKey = row.fieldKey || "";
        const before = fieldKey && entryState.fields[fieldKey] ? cloneField(entryState.fields[fieldKey]) : null;
        const after =
          fieldKey && entryState.fields[fieldKey]
            ? cloneField({
                ...entryState.fields[fieldKey],
                value: row.newValue ?? entryState.fields[fieldKey].value,
                status:
                  row.action === "reject"
                    ? "empty"
                    : row.action === "accept" || row.action === "fill"
                      ? "agent_final"
                      : entryState.fields[fieldKey].status
              })
            : null;
        entryState.patches.push({
          patch_id: row.id || createPatchId(),
          fields_changed: fieldKey
            ? [{ field_key: fieldKey, before, after }]
            : [],
          source: row.source || row.actor || "unknown",
          timestamp: row.ts || new Date().toISOString(),
          tool_call: row.tool_call ?? null,
          meta: { ...row, migrated: true }
        });
      });
      if (entryState.patches.length > MAX_PATCHES_PER_ENTRY) {
        entryState.patches = entryState.patches.slice(-MAX_PATCHES_PER_ENTRY);
      }
      persistEntry(entryState);
    } catch (error) {
      // ignore corrupt legacy audit
    }
  }

  function persistEntry(entryState) {
    const all = readStorage();
    all[entryState.entry_id] = {
      entry_id: entryState.entry_id,
      fields: entryState.fields,
      patches: entryState.patches,
      updated_at: entryState.updated_at
    };
    writeStorage(all);
  }

  function importSnapshot(snapshot) {
    if (!snapshot?.entry_id) {
      return null;
    }
    const fields = {};
    Object.entries(snapshot.fields || {}).forEach(([key, value]) => {
      fields[key] = normalizeField(value);
    });
    const entryState = {
      entry_id: snapshot.entry_id,
      fields,
      patches: Array.isArray(snapshot.patches) ? [...snapshot.patches] : [],
      updated_at: snapshot.updated_at || new Date().toISOString()
    };
    registry.set(snapshot.entry_id, entryState);
    persistEntry(entryState);
    dispatch(EVENT_SNAPSHOT, {
      entry_id: snapshot.entry_id,
      snapshot: getSnapshot(snapshot.entry_id)
    });
    return entryState;
  }

  function dispatch(type, detail) {
    const started = performance.now();
    const emit = () => {
      const payload = { detail, bubbles: true, cancelable: false };
      bus?.dispatchEvent(new CustomEvent(type, payload));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(type, payload));
      }
    };
    const elapsed = () => performance.now() - started;
    queueMicrotask(() => {
      emit();
      if (elapsed() > PATCH_VISIBILITY_MS) {
        console.warn(`[KNEntryFormState] patch event exceeded ${PATCH_VISIBILITY_MS}ms budget`);
      }
    });
  }

  function createEntryState(entryId, initialFields = {}) {
    const fields = {};
    Object.entries(initialFields).forEach(([key, value]) => {
      fields[key] = normalizeField(value);
    });
    return {
      entry_id: entryId,
      fields,
      patches: [],
      updated_at: new Date().toISOString()
    };
  }

  function hydrateFromStorage(entryId) {
    const stored = readStorage()[entryId];
    if (!stored) {
      return null;
    }
    const fields = {};
    Object.entries(stored.fields || {}).forEach(([key, value]) => {
      fields[key] = normalizeField(value);
    });
    return {
      entry_id: entryId,
      fields,
      patches: Array.isArray(stored.patches) ? [...stored.patches] : [],
      updated_at: stored.updated_at || new Date().toISOString()
    };
  }

  function getOrCreate(entryId, initialFields) {
    if (!entryId) {
      throw new Error("entryId is required");
    }
    if (registry.has(entryId)) {
      return registry.get(entryId);
    }
    let entryState = hydrateFromStorage(entryId);
    if (!entryState) {
      entryState = createEntryState(entryId, initialFields || {});
      persistEntry(entryState);
    } else if (initialFields && Object.keys(initialFields).length) {
      Object.entries(initialFields).forEach(([key, value]) => {
        if (!entryState.fields[key]) {
          entryState.fields[key] = normalizeField(value);
        }
      });
      persistEntry(entryState);
    }
    migrateLegacyAudit(entryId, entryState);
    registry.set(entryId, entryState);
    return entryState;
  }

  function get(entryId) {
    return registry.get(entryId) || hydrateFromStorage(entryId);
  }

  function getSnapshot(entryId) {
    const entryState = get(entryId);
    if (!entryState) {
      return null;
    }
    return {
      entry_id: entryState.entry_id,
      fields: Object.fromEntries(Object.entries(entryState.fields).map(([k, v]) => [k, cloneField(v)])),
      patches: [...entryState.patches],
      updated_at: entryState.updated_at
    };
  }

  function getFields(entryId) {
    const entryState = getOrCreate(entryId, {});
    return entryState.fields;
  }

  function getPatches(entryId) {
    const entryState = get(entryId);
    return entryState ? [...entryState.patches] : [];
  }

  function appendPatch(entryId, patchInput = {}) {
    const entryState = getOrCreate(entryId, {});
    const patch = {
      patch_id: patchInput.patch_id || createPatchId(),
      fields_changed: Array.isArray(patchInput.fields_changed) ? patchInput.fields_changed : [],
      source: patchInput.source || "unknown",
      timestamp: patchInput.timestamp || new Date().toISOString(),
      tool_call: patchInput.tool_call ?? null
    };
    if (patchInput.meta && typeof patchInput.meta === "object") {
      patch.meta = { ...patchInput.meta };
    }

    entryState.patches = [...entryState.patches, patch];
    if (entryState.patches.length > MAX_PATCHES_PER_ENTRY) {
      entryState.patches = entryState.patches.slice(-MAX_PATCHES_PER_ENTRY);
    }
    entryState.updated_at = patch.timestamp;
    persistEntry(entryState);
    dispatch(EVENT_PATCH, {
      entry_id: entryId,
      patch,
      snapshot: getSnapshot(entryId)
    });
    return patch;
  }

  function applyFieldUpdates(entryId, updates = {}, patchMeta = {}) {
    const entryState = getOrCreate(entryId, {});
    const fields_changed = [];

    Object.entries(updates).forEach(([fieldKey, partial]) => {
      const before = entryState.fields[fieldKey] ? cloneField(entryState.fields[fieldKey]) : null;
      const after = normalizeField({ ...(before || {}), ...partial });
      entryState.fields[fieldKey] = after;
      fields_changed.push({
        field_key: fieldKey,
        before,
        after: cloneField(after)
      });
    });

    if (!fields_changed.length) {
      return null;
    }

    entryState.updated_at = new Date().toISOString();
    persistEntry(entryState);

    fields_changed.forEach(({ field_key, after }) => {
      dispatch(EVENT_FIELD, {
        entry_id: entryId,
        field_key,
        field: cloneField(after),
        snapshot: getSnapshot(entryId)
      });
    });

    return appendPatch(entryId, {
      fields_changed,
      source: patchMeta.source || "unknown",
      tool_call: patchMeta.tool_call ?? null,
      meta: patchMeta.meta || patchMeta
    });
  }

  function subscribe(eventType, handler) {
    if (!bus || typeof handler !== "function") {
      return () => {};
    }
    bus.addEventListener(eventType, handler);
    return () => bus.removeEventListener(eventType, handler);
  }

  function patchToLegacyDisplay(patch) {
    const meta = patch.meta || {};
    const first = patch.fields_changed?.[0];
    const fieldKey = meta.fieldKey || first?.field_key || "";
    return {
      ...meta,
      id: patch.patch_id,
      ts: patch.timestamp,
      source: patch.source,
      fieldKey,
      fieldLabel: meta.fieldLabel || fieldKey,
      newValue: meta.newValue ?? first?.after?.value ?? "",
      previousValue: meta.previousValue ?? first?.before?.value ?? "",
      action: meta.action || "edit",
      actor: meta.actor || patch.source,
      confidence: meta.confidence ?? first?.after?.confidence ?? null,
      rationale: meta.rationale ?? first?.after?.rationale ?? "",
      citation: meta.citation ?? first?.after?.citations?.[0] ?? null,
      tool_call: patch.tool_call
    };
  }

  const root = typeof window !== "undefined" ? window : globalThis;

  root.KNEntryFormState = Object.freeze({
    FIELD_STATUSES,
    PATCH_VISIBILITY_MS,
    EVENT_PATCH,
    EVENT_SNAPSHOT,
    EVENT_FIELD,
    normalizeField,
    cloneField,
    getOrCreate,
    get,
    getSnapshot,
    getFields,
    getPatches,
    appendPatch,
    applyFieldUpdates,
    importSnapshot,
    subscribe,
    patchToLegacyDisplay
  });
})();
