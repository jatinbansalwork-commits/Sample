/**
 * Klear Agent shell — adaptive main region (Chat Mode vs Workstation Mode).
 * Mode follows entry load state; there is no manual chat/workstation toggle.
 */
(() => {
  "use strict";

  const MODE_CHAT = "chat";
  const MODE_WORKSTATION = "workstation";

  const page = () => document.getElementById("agentic-broker-page");
  const chatMount = () => document.getElementById("agentic-shell-chat-mount");
  const utilityMount = () => document.getElementById("agentic-shell-utility-chat-mount");
  const chatView = () => document.getElementById("agentic-shell-chat-view");
  const workstationView = () => document.getElementById("agentic-shell-workstation-view");
  const chatEl = () => document.getElementById("kn-agent-chat");

  function hashPath() {
    const raw = (location.hash || "#agentic-broker").split("?")[0].replace(/^#\/?/, "") || "agentic-broker";
    return raw;
  }

  function isAgenticRoute(path = hashPath()) {
    return path === "agentic-broker" || path.startsWith("agentic-broker/");
  }

  /** Entry loaded → Workstation Mode. Supports #agentic-broker/entry/{id} or ?entry= */
  function parseLoadedEntryId(path = hashPath()) {
    const match = path.match(/^agentic-broker\/entry\/([^/?#]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    const query = (location.hash.split("?")[1] || "").trim();
    if (!query) {
      return null;
    }
    const params = new URLSearchParams(query);
    const entry = params.get("entry");
    return entry ? decodeURIComponent(entry) : null;
  }

  function resolveMode(entryId = parseLoadedEntryId()) {
    return entryId ? MODE_WORKSTATION : MODE_CHAT;
  }

  function mountChat(mode) {
    const chat = chatEl();
    const target = mode === MODE_WORKSTATION ? utilityMount() : chatMount();
    if (!chat || !target || chat.parentElement === target) {
      return;
    }
    target.appendChild(chat);
    chat.dataset.agenticChatPlacement = mode === MODE_WORKSTATION ? "utility" : "main";
  }

  function setShellClass(mode) {
    const shell = page();
    if (!shell) {
      return;
    }
    shell.dataset.agenticMode = mode;
    const entryId = parseLoadedEntryId();
    if (entryId) {
      shell.dataset.agenticEntryId = entryId;
    } else {
      delete shell.dataset.agenticEntryId;
    }
    document.documentElement.dataset.agenticMode = mode;
  }

  function setViewVisibility(mode) {
    const chat = chatView();
    const workstation = workstationView();
    if (chat) {
      chat.hidden = mode !== MODE_CHAT;
    }
    if (workstation) {
      workstation.hidden = mode !== MODE_WORKSTATION;
    }
  }

  function syncTopNavToggle(mode) {
    const onAgent = isAgenticRoute() && page() && !page().hidden;
    document.querySelector(".app-shell")?.classList.toggle("is-agentic-route", onAgent);
    document.querySelectorAll(".ai-assistant-trigger").forEach((trigger) => {
      if (!onAgent) {
        return;
      }
      trigger.setAttribute("aria-pressed", mode === MODE_CHAT ? "true" : "false");
      trigger.setAttribute("aria-expanded", "true");
    });
  }

  function clearTopNavChrome() {
    document.querySelector(".app-shell")?.classList.remove("is-agentic-route");
  }

  function sync() {
    if (!page() || page().hidden) {
      return null;
    }
    const mode = resolveMode();
    setShellClass(mode);
    setViewVisibility(mode);
    mountChat(mode);
    syncTopNavToggle(mode);
    page().dispatchEvent(
      new CustomEvent("kn-agentic-mode-change", {
        bubbles: true,
        detail: { mode, entryId: parseLoadedEntryId() }
      })
    );
    return mode;
  }

  function loadEntry(entryId) {
    if (!entryId) {
      return;
    }
    const base = `#agentic-broker/entry/${encodeURIComponent(entryId)}`;
    if (location.hash.split("?")[0] === base) {
      sync();
      return;
    }
    history.replaceState(null, "", base);
    window.dispatchEvent(new CustomEvent("kn-route-change", { detail: { hash: base } }));
  }

  function clearEntry() {
    if (hashPath() === "agentic-broker") {
      sync();
      return;
    }
    history.replaceState(null, "", "#agentic-broker");
    window.dispatchEvent(new CustomEvent("kn-route-change", { detail: { hash: "#agentic-broker" } }));
  }

  window.KNAgenticShell = Object.freeze({
    MODE_CHAT,
    MODE_WORKSTATION,
    hashPath,
    isAgenticRoute,
    parseLoadedEntryId,
    resolveMode,
    sync,
    loadEntry,
    clearEntry
  });

  window.addEventListener("hashchange", () => {
    if (isAgenticRoute()) {
      sync();
    } else {
      clearTopNavChrome();
    }
  });
  window.addEventListener("kn-route-change", () => {
    if (isAgenticRoute()) {
      sync();
    } else {
      clearTopNavChrome();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (isAgenticRoute()) {
        sync();
      }
    });
  } else if (isAgenticRoute()) {
    sync();
  }
})();
