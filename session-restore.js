/**
 * Capture + restore full Klear Agent session state (route, entry form, agent mode, context).
 */
(() => {
  function normalizeHash(hash = location.hash) {
    const raw = String(hash || "#agentic-broker").split("?")[0];
    if (!raw || raw === "#") {
      return "#agentic-broker";
    }
    return raw.startsWith("#") ? raw : `#${raw.replace(/^#\/?/, "")}`;
  }

  function filingEntryIdFromHash(hash = location.hash) {
    const match = normalizeHash(hash).match(/^#transaction-us-entry\/filing\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function captureSessionSnapshot() {
    const routeHash = normalizeHash();
    const entryId = filingEntryIdFromHash(routeHash);
    let agentMode = "permission";
    try {
      agentMode = window.sessionStorage.getItem("kn-entry-agent-mode") || "permission";
    } catch (_error) {
      agentMode = "permission";
    }

    const contextMeta = window.KNAssistCore?.contextOf?.() || window.KNAssistant?.getContext?.() || null;
    const entryForm = entryId && window.KNEntryFormState?.getSnapshot
      ? window.KNEntryFormState.getSnapshot(entryId)
      : null;

    return {
      routeHash,
      entryId: entryId || "",
      agentMode,
      contextMeta: contextMeta ? { ...contextMeta } : null,
      entryForm
    };
  }

  function importEntryFormSnapshot(snapshot) {
    if (!snapshot?.entry_id || !window.KNEntryFormState?.importSnapshot) {
      return;
    }
    window.KNEntryFormState.importSnapshot(snapshot);
  }

  function applyAgentMode(mode) {
    if (!mode) {
      return;
    }
    try {
      window.sessionStorage.setItem("kn-entry-agent-mode", mode);
    } catch (_error) {
      /* ignore */
    }
  }

  function waitForRoute(targetHash) {
    const next = normalizeHash(targetHash);
    if (normalizeHash() === next) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const done = () => {
        window.removeEventListener("hashchange", done);
        window.removeEventListener("kn-route-change", done);
        resolve();
      };
      window.addEventListener("hashchange", done, { once: true });
      window.addEventListener("kn-route-change", done, { once: true });
      if (typeof window.setRouteHash === "function") {
        window.setRouteHash(next);
      } else {
        location.hash = next;
      }
    });
  }

  function demoEntryFormForChat(chatId, entryId) {
    if (!entryId || !window.KNEntryFormState?.normalizeField) {
      return null;
    }
    const normalize = window.KNEntryFormState.normalizeField;
    const fields = {
      "txn:entryType": normalize({ status: "agent_final", value: "01 - CONSUMPTION", confidence: 92, rationale: "Restored from chat session." }),
      "txn:portOfEntry": normalize({ status: "agent_draft", value: "2704 - Los Angeles", confidence: 78, rationale: "Agent proposal pending review." }),
      "parties:ior:name": normalize({ status: "agent_final", value: "ILLUMINATE USA LLC", confidence: 99 }),
      "invoice:1:line:1:hts": normalize({ status: "agent_draft", value: "9403.60.8081", confidence: 88, rationale: "Classification from invoice." })
    };
    if (chatId === "chat-04") {
      fields["compliance:ofac"] = normalize({
        status: "locked",
        value: "Exam hold — FDA referral",
        rationale: "Cannot clear without compliance officer action."
      });
    }
    return {
      entry_id: entryId,
      fields,
      patches: [],
      updated_at: new Date().toISOString()
    };
  }

  async function restoreSessionSnapshot(session = {}, { chatId = "", navigate = false } = {}) {
    if (!session || typeof session !== "object") {
      return;
    }

    applyAgentMode(session.agentMode);

    const entryId = session.entryId || session.entryForm?.entry_id || "";
    if (session.entryForm) {
      importEntryFormSnapshot(session.entryForm);
    } else if (entryId && chatId) {
      importEntryFormSnapshot(demoEntryFormForChat(chatId, entryId));
    }

    if (navigate && session.routeHash) {
      await waitForRoute(session.routeHash);
    }

    if (entryId && navigate && String(session.routeHash || "").includes("/filing/")) {
      window.KNEntryFiling?.syncOverlay?.();
    }

    if (session.contextMeta) {
      window.dispatchEvent(
        new CustomEvent("kn-agent-session-restored", {
          detail: { session, chatId, contextMeta: session.contextMeta }
        })
      );
    }
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNAgentSession = Object.freeze({
    capture: captureSessionSnapshot,
    restore: restoreSessionSnapshot,
    demoEntryFormForChat
  });
})();
