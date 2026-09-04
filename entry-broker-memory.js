/**
 * Soft memory layer — extends the append-only audit trail with cross-entry
 * broker override patterns. Surfaces notes like "You've corrected this 4 times
 * before." Never auto-applies; informational only (Continuous Learning).
 */
(() => {
  "use strict";

  const STORAGE_KEY = "kn-broker-soft-memory-v1";
  const MIN_NOTE_COUNT = 2;
  const MAX_SAMPLES = 8;

  const DEMO_SEEDS = Object.freeze({
    "jane-cooper": [
      {
        memoryKey: "hts|sku-family:wdght|agent:8544.42.9090",
        fieldKind: "hts",
        productLabel: "sku-family:wdght",
        agentValue: "8544.42.9090",
        overrideCount: 4,
        lastBrokerValue: "8708.29.5060"
      }
    ]
  });

  let bound = false;

  function brokerId() {
    return window.KNPersona?.resolve?.()?.id || "default-broker";
  }

  function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function fieldSuffix(fieldKey = "") {
    const parts = String(fieldKey).split(":");
    return parts[parts.length - 1] || fieldKey;
  }

  function linePrefix(fieldKey = "") {
    const match = String(fieldKey).match(/^(invoice:\d+:line:\d+):/);
    return match ? match[1] : null;
  }

  function productFingerprint(fieldKey, fields = {}) {
    const prefix = linePrefix(fieldKey);
    if (!prefix) {
      return null;
    }
    const sku = normalizeText(fields[`${prefix}:sku`]?.value);
    if (sku) {
      const family = sku.replace(/-\d+$/, "");
      return family ? `sku-family:${family}` : `sku:${sku}`;
    }
    const description = normalizeText(fields[`${prefix}:description`]?.value);
    if (description) {
      return `desc:${description.slice(0, 48)}`;
    }
    return null;
  }

  function buildMemoryKey(fieldKey, agentValue, fields = {}) {
    const suffix = fieldSuffix(fieldKey);
    const normalizedAgentValue = normalizeText(agentValue);
    if (!suffix || !normalizedAgentValue) {
      return "";
    }
    const fingerprint = productFingerprint(fieldKey, fields);
    if (fingerprint) {
      return `${suffix}|${fingerprint}|agent:${normalizedAgentValue}`;
    }
    return `${fieldKey}|agent:${normalizedAgentValue}`;
  }

  function readStore() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function writeStore(store) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (_error) {
      // storage unavailable — memory works in-session only via in-memory fallback
    }
  }

  function brokerBucket(store, id = brokerId()) {
    if (!store.memories) {
      store.memories = {};
    }
    if (!store.memories[id]) {
      store.memories[id] = {};
    }
    return store.memories[id];
  }

  function noteText(count) {
    if (count < MIN_NOTE_COUNT) {
      return "";
    }
    if (count === 1) {
      return "You've corrected this once before.";
    }
    return `You've corrected this ${count} times before.`;
  }

  function recordOverride({
    fieldKey,
    agentValue,
    brokerValue = "",
    fields = {},
    entryId = "",
    timestamp = new Date().toISOString()
  } = {}) {
    const memoryKey = buildMemoryKey(fieldKey, agentValue, fields);
    if (!memoryKey) {
      return null;
    }

    const store = readStore();
    const bucket = brokerBucket(store);
    const existing = bucket[memoryKey] || {
      memoryKey,
      fieldKind: fieldSuffix(fieldKey),
      productLabel: "",
      agentValue: String(agentValue ?? "").trim(),
      overrideCount: 0,
      lastBrokerValue: "",
      lastOverrideAt: null,
      samples: []
    };

    existing.overrideCount += 1;
    existing.lastBrokerValue = String(brokerValue ?? "").trim();
    existing.lastOverrideAt = timestamp;
    existing.productLabel = productFingerprint(fieldKey, fields) || existing.productLabel;
    existing.samples = [
      { entryId, fieldKey, timestamp },
      ...(existing.samples || [])
    ].slice(0, MAX_SAMPLES);

    bucket[memoryKey] = existing;
    store.bootstrapped = store.bootstrapped || {};
    store.bootstrapped[brokerId()] = true;
    writeStore(store);
    return existing;
  }

  function lookup({ fieldKey, agentValue, fields = {} } = {}) {
    const memoryKey = buildMemoryKey(fieldKey, agentValue, fields);
    if (!memoryKey) {
      return null;
    }
    const bucket = brokerBucket(readStore());
    const hit = bucket[memoryKey];
    if (!hit || hit.overrideCount < MIN_NOTE_COUNT) {
      return null;
    }
    return {
      ...hit,
      note: noteText(hit.overrideCount)
    };
  }

  function agentProposalField(field) {
    return Boolean(field && (field.status === "agent_draft" || field.status === "agent_final"));
  }

  function ingestPatch(detail = {}) {
    const patch = detail.patch;
    if (!patch) {
      return null;
    }

    const meta = patch.meta || {};
    const action = meta.action;
    if (action !== "reject" && action !== "edit") {
      return null;
    }

    const changed = patch.fields_changed?.[0];
    const fieldKey = meta.fieldKey || changed?.field_key;
    if (!fieldKey) {
      return null;
    }

    const fields = detail.snapshot?.fields || {};
    const before = changed?.before;
    if (!agentProposalField(before) && action !== "reject") {
      return null;
    }

    const agentValue = meta.previousValue ?? before?.value ?? "";
    const brokerValue = meta.newValue ?? changed?.after?.value ?? "";
    if (!String(agentValue).trim()) {
      return null;
    }
    if (action === "edit" && normalizeText(agentValue) === normalizeText(brokerValue)) {
      return null;
    }

    return recordOverride({
      fieldKey,
      agentValue,
      brokerValue,
      fields,
      entryId: detail.entry_id || "",
      timestamp: patch.timestamp || new Date().toISOString()
    });
  }

  function seedDemoMemories() {
    const id = brokerId();
    const seeds = DEMO_SEEDS[id];
    if (!seeds?.length) {
      return;
    }
    const store = readStore();
    const bucket = brokerBucket(store);
    seeds.forEach((seed) => {
      if (!bucket[seed.memoryKey]) {
        bucket[seed.memoryKey] = {
          ...seed,
          lastOverrideAt: new Date().toISOString(),
          samples: []
        };
      }
    });
    store.bootstrapped = store.bootstrapped || {};
    store.bootstrapped[id] = true;
    writeStore(store);
  }

  function bootstrapFromAudit() {
    const store = readStore();
    const id = brokerId();
    if (store.bootstrapped?.[id]) {
      return;
    }

    let formState = {};
    try {
      formState = JSON.parse(window.localStorage.getItem("kn-entry-form-state-v1") || "{}");
    } catch (_error) {
      formState = {};
    }

    Object.entries(formState).forEach(([entryId, entry]) => {
      const patches = Array.isArray(entry?.patches) ? entry.patches : [];
      patches.forEach((patch) => {
        ingestPatch({
          entry_id: entryId,
          patch,
          snapshot: { fields: entry.fields || {} }
        });
      });
    });

    const bucket = brokerBucket(readStore());
    if (!Object.keys(bucket).length) {
      seedDemoMemories();
    }

    const nextStore = readStore();
    nextStore.bootstrapped = nextStore.bootstrapped || {};
    nextStore.bootstrapped[id] = true;
    writeStore(nextStore);
  }

  function renderNote(match) {
    if (!match?.note) {
      return "";
    }
    return `<p class="entry-field-panel__memory type-caption-sm" role="note">${escapeHtml(match.note)}</p>`;
  }

  function renderInlineNote(match) {
    if (!match?.note) {
      return "";
    }
    return `<p class="entry-field__memory type-caption-sm" role="note">${escapeHtml(match.note)}</p>`;
  }

  function escapeHtml(value) {
    return window.KNAdminUX?.escapeHtml?.(value) ?? String(value ?? "");
  }

  function bindPatchListener() {
    if (bound) {
      return;
    }
    const formState = window.KNEntryFormState;
    if (!formState?.subscribe) {
      return;
    }
    bound = true;
    formState.subscribe(formState.EVENT_PATCH, (event) => {
      ingestPatch(event.detail || {});
    });
  }

  function init() {
    bootstrapFromAudit();
    bindPatchListener();
  }

  window.KNBrokerMemory = Object.freeze({
    MIN_NOTE_COUNT,
    buildMemoryKey,
    lookup,
    recordOverride,
    ingestPatch,
    bootstrapFromAudit,
    renderNote,
    renderInlineNote,
    noteText,
    init
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
