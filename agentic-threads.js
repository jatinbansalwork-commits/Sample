/**
 * Shared Klear Assist thread store.
 * One localStorage record (`kn-agentic-threads-v1`) consumed by the full-page
 * thread, the sidebar drawer, and later the contextual panel. Do not add a
 * second conversation key.
 */
(function () {
  "use strict";

  const THREADS_KEY = "kn-agentic-threads-v1";
  const ACTIVE_KEY = "kn-agentic-active-v1";

  function brokerUserId() {
    const name = document.querySelector(".profile-text__name")?.textContent?.trim() || "";
    return name.toLowerCase().replace(/\s+/g, "-") || "broker";
  }

  function isSeededId(id) {
    return String(id || "").startsWith("chat-");
  }

  function read() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(THREADS_KEY) || "null");
      if (parsed && Array.isArray(parsed.threads)) {
        return parsed;
      }
    } catch (_error) {
      /* ignore */
    }
    return { userId: brokerUserId(), threads: [] };
  }

  function write(store) {
    const next = { userId: brokerUserId(), threads: store.threads || [] };
    window.localStorage.setItem(THREADS_KEY, JSON.stringify(next));
    return next;
  }

  function readActiveId() {
    try {
      return window.localStorage.getItem(ACTIVE_KEY) || "";
    } catch (_error) {
      return "";
    }
  }

  function writeActiveId(id) {
    try {
      if (id) {
        window.localStorage.setItem(ACTIVE_KEY, id);
      } else {
        window.localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (_error) {
      /* ignore */
    }
  }

  function find(store, id) {
    return (store.threads || []).find((thread) => thread.id === id) || null;
  }

  function emitChange(threadId) {
    window.dispatchEvent(new CustomEvent("kn-thread-store-change", { detail: { threadId: threadId || "" } }));
  }

  function persist(thread, { touchUpdatedAt = true } = {}) {
    const store = read();
    const index = store.threads.findIndex((item) => item.id === thread.id);
    const next = {
      ...thread,
      updatedAt: touchUpdatedAt ? Date.now() : thread.updatedAt || Date.now(),
      userId: thread.userId || brokerUserId()
    };
    if (index >= 0) {
      store.threads[index] = next;
    } else {
      store.threads.unshift(next);
    }
    write(store);
    emitChange(next.id);
    return next;
  }

  /** One stable title per thread — first user message or explicit seed title only. */
  function deriveThreadTitle(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      return "Conversation";
    }
    const firstSentence = raw.match(/^[^.!?\n]+[.!?]?/)?.[0]?.trim() || raw;
    const source = firstSentence.length <= 40 ? firstSentence : raw;
    return source.length > 40 ? `${source.slice(0, 40)}…` : source;
  }

  function ensureLiveThread(title) {
    const store = read();
    const activeId = readActiveId();
    let thread = activeId ? find(store, activeId) : null;
    if (thread && isSeededId(thread.id)) {
      thread = null;
    }
    if (!thread) {
      thread = {
        id: `thread-${Date.now()}`,
        title: deriveThreadTitle(title) || "Conversation",
        userId: brokerUserId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        scopeKey: "",
        surface: "page"
      };
      store.threads.unshift(thread);
      write(store);
    }
    writeActiveId(thread.id);
    return find(read(), thread.id) || thread;
  }

  function findByScopeKey(scopeKey) {
    if (!scopeKey) {
      return null;
    }
    return (read().threads || []).find((thread) => thread.scopeKey === scopeKey && !isSeededId(thread.id)) || null;
  }

  function activateScope(scopeKey) {
    const existing = findByScopeKey(scopeKey);
    if (existing) {
      writeActiveId(existing.id);
    }
    return existing;
  }

  function startScopedThread({ title, scopeKey, surface } = {}) {
    const existing = findByScopeKey(scopeKey);
    if (existing) {
      writeActiveId(existing.id);
      return existing;
    }
    const thread = {
      id: `thread-${Date.now()}`,
      title: title || "Conversation",
      userId: brokerUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      scopeKey: scopeKey || "",
      surface: surface || "panel"
    };
    persist(thread);
    writeActiveId(thread.id);
    return find(read(), thread.id) || thread;
  }

  function ensureScopedThread({ title, scopeKey, surface } = {}) {
    const existing = findByScopeKey(scopeKey);
    if (existing) {
      writeActiveId(existing.id);
      return existing;
    }
    const store = read();
    const activeId = readActiveId();
    const thread = activeId ? find(store, activeId) : null;
    if (thread && !isSeededId(thread.id) && scopeKey && thread.scopeKey === scopeKey) {
      return thread;
    }
    return startScopedThread({ title, scopeKey, surface });
  }

  function serializeFiles(files) {
    return (files || []).map((file) => ({
      id: file.id || "",
      name: file.name || "file",
      size: Number(file.size) || 0,
      type: file.type || ""
    }));
  }

  function appendMessage(message) {
    const thread = ensureLiveThread(message.text || "Conversation");
    thread.messages = thread.messages || [];
    const isFirstUserMessage =
      message.senderType === "self" &&
      message.text &&
      !(thread.messages || []).some((item) => item.senderType === "self");
    thread.messages.push(message);
    if (isFirstUserMessage) {
      thread.title = deriveThreadTitle(message.text);
    }
    persist(thread);
    return message;
  }

  function patchMessage(id, patch) {
    const activeId = readActiveId();
    if (!id || !activeId) {
      return null;
    }
    const store = read();
    const thread = find(store, activeId);
    if (!thread) {
      return null;
    }
    const index = (thread.messages || []).findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }
    thread.messages[index] = { ...thread.messages[index], ...patch };
    persist(thread);
    return thread.messages[index];
  }

  function getActiveLiveThread() {
    const id = readActiveId();
    if (!id || isSeededId(id)) {
      return null;
    }
    return find(read(), id);
  }

  window.KNThreadStore = {
    THREADS_KEY,
    ACTIVE_KEY,
    brokerUserId,
    isSeededId,
    read,
    write,
    readActiveId,
    writeActiveId,
    find,
    persist,
    deriveThreadTitle,
    ensureLiveThread,
    startScopedThread,
    ensureScopedThread,
    findByScopeKey,
    activateScope,
    serializeFiles,
    appendMessage,
    patchMessage,
    getActiveLiveThread
  };
})();
