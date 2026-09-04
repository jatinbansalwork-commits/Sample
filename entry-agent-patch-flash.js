/**
 * Agent patch land feedback — marigold sweep on the field the broker is looking at.
 * Subscribes to KNEntryFormState patch events; respects prefers-reduced-motion.
 */
(function () {
  "use strict";

  const FLASH_MS = 600;
  const AGENT_SOURCES = new Set(["agent", "klear_agent", "klear-agent"]);

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function resolveLookAtKey() {
    const fromApi = window.KNEntryFiling?.getBrokerLookAtKey?.();
    if (fromApi) {
      return fromApi;
    }
    const active = document.activeElement;
    if (active?.matches?.("[data-entry-field]")) {
      return active.getAttribute("data-entry-field") || "";
    }
    const row = active?.closest?.("[data-entry-field-row]");
    if (row) {
      return row.getAttribute("data-entry-field-row") || "";
    }
    const openPanel = document.querySelector(".entry-field-panel:not([hidden])");
    if (openPanel) {
      return openPanel.closest("[data-entry-field-row]")?.getAttribute("data-entry-field-row") || "";
    }
    return "";
  }

  function isAgentFieldChange(change) {
    const after = change?.after;
    if (!after) {
      return false;
    }
    if (after.status !== "agent_draft" && after.status !== "agent_final") {
      return false;
    }
    const beforeVal = change.before?.value ?? "";
    const afterVal = after.value ?? "";
    const beforeStatus = change.before?.status ?? "";
    return beforeVal !== afterVal || beforeStatus !== after.status;
  }

  function fieldFlashTarget(key) {
    const row = document.querySelector(`[data-entry-field-row="${CSS.escape(key)}"]`);
    if (!row) {
      return null;
    }
    return row.querySelector(".kn-field__control") || row;
  }

  function flashField(key) {
    const target = fieldFlashTarget(key);
    if (!target) {
      return;
    }
    target.classList.remove("entry-field--agent-patch-flash", "entry-field--agent-patch-flash-static");
    void target.offsetWidth;
    if (prefersReducedMotion()) {
      target.classList.add("entry-field--agent-patch-flash-static");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          target.classList.remove("entry-field--agent-patch-flash-static");
        });
      });
      return;
    }
    target.classList.add("entry-field--agent-patch-flash");
    window.setTimeout(() => {
      target.classList.remove("entry-field--agent-patch-flash");
    }, FLASH_MS);
  }

  function onPatch(event) {
    const detail = event.detail || {};
    const source = String(detail.patch?.source || "").toLowerCase();
    if (!AGENT_SOURCES.has(source)) {
      return;
    }
    const lookAt = resolveLookAtKey();
    if (!lookAt) {
      return;
    }
    const hit = (detail.patch?.fields_changed || []).some(
      (change) => change.field_key === lookAt && isAgentFieldChange(change)
    );
    if (!hit) {
      return;
    }
    const run = () => flashField(lookAt);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run);
    } else {
      run();
    }
  }

  function init() {
    const api = window.KNEntryFormState;
    if (!api?.subscribe) {
      return;
    }
    api.subscribe(api.EVENT_PATCH, onPatch);
    window.KNEntryAgentPatchFlash = { flashField, resolveLookAtKey };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
