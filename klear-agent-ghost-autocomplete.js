/**
 * Klear Agent ghost-text autocomplete — shared by full-page composer and docked panel.
 * Tab accepts, Escape dismisses, typing past a suggestion never blocks manual entry.
 */
(function () {
  "use strict";

  const PAST_QUERIES_KEY = "kn-agent-ghost-past-queries-v1";
  const MAX_PAST = 48;
  const IDLE_CYCLE_MS = 4000;

  const controllers = new WeakMap();

  function knMotionDurationMs(tokenName, fallbackMs) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || !raw) {
      return fallbackMs;
    }
    if (raw.endsWith("s") && !raw.endsWith("ms")) {
      return n * 1000;
    }
    return n;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      /* quota / private mode */
    }
  }

  function normalizePhrase(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function readPastQueries() {
    const stored = readJson(PAST_QUERIES_KEY, []);
    return Array.isArray(stored) ? stored.map(normalizePhrase).filter(Boolean) : [];
  }

  function collectThreadQueries() {
    const out = [];
    try {
      const store = window.KNThreadStore?.read?.();
      (store?.threads || []).forEach((thread) => {
        (thread.messages || []).forEach((msg) => {
          if (msg?.senderType === "self" && msg.text) {
            out.push(normalizePhrase(msg.text));
          }
        });
      });
    } catch (_error) {
      /* ignore */
    }
    return out;
  }

  function recordQuery(text) {
    const phrase = normalizePhrase(text);
    if (!phrase) {
      return;
    }
    const next = [phrase, ...readPastQueries().filter((item) => item.toLowerCase() !== phrase.toLowerCase())].slice(
      0,
      MAX_PAST
    );
    writeJson(PAST_QUERIES_KEY, next);
  }

  function buildCorpus({ promptPhrases = [], seededQuestions = [], includePast = true } = {}) {
    const seen = new Set();
    const entries = [];

    function push(text, score) {
      const phrase = normalizePhrase(text);
      if (!phrase) {
        return;
      }
      const key = phrase.toLowerCase();
      if (seen.has(key)) {
        const existing = entries.find((item) => item.text.toLowerCase() === key);
        if (existing && score > existing.score) {
          existing.score = score;
        }
        return;
      }
      seen.add(key);
      entries.push({ text: phrase, score });
    }

    if (includePast) {
      readPastQueries().forEach((phrase, index) => push(phrase, 1200 - index));
      collectThreadQueries().forEach((phrase, index) => push(phrase, 1100 - index));
    }

    seededQuestions.forEach((phrase, index) => push(phrase, 800 - index));
    promptPhrases.forEach((phrase, index) => push(phrase, 600 - index));

    return entries.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
  }

  function findMatch(typed, corpus) {
    const raw = String(typed ?? "");
    const lower = raw.toLowerCase();
    if (!lower) {
      return null;
    }
    let best = null;
    corpus.forEach((entry) => {
      const text = entry.text;
      const textLower = text.toLowerCase();
      if (!textLower.startsWith(lower) || text.length <= raw.length) {
        return;
      }
      if (
        !best ||
        entry.score > best.score ||
        (entry.score === best.score && text.length < best.text.length)
      ) {
        best = {
          full: text,
          suffix: text.slice(raw.length),
          score: entry.score
        };
      }
    });
    return best;
  }

  function ensureGhostLayers(ghostText) {
    if (!ghostText) {
      return { prefixEl: null, suffixEl: null, outEl: null };
    }
    let prefixEl = ghostText.querySelector("[data-chat-ghost-prefix]");
    let suffixEl = ghostText.querySelector("[data-chat-ghost-suffix]");
    if (!prefixEl || !suffixEl) {
      ghostText.innerHTML =
        '<span class="kn-chat-input__ghost-prefix" data-chat-ghost-prefix aria-hidden="true"></span>' +
        '<span class="kn-chat-input__ghost-suffix" data-chat-ghost-suffix></span>';
      prefixEl = ghostText.querySelector("[data-chat-ghost-prefix]");
      suffixEl = ghostText.querySelector("[data-chat-ghost-suffix]");
    }
    const outEl = ghostText.parentElement?.querySelector("[data-chat-ghost-out]") || null;
    return { prefixEl, suffixEl, outEl };
  }

  function setGhostLayers(ghostText, { prefix = "", suffix = "" }) {
    const { prefixEl, suffixEl } = ensureGhostLayers(ghostText);
    if (prefixEl) {
      prefixEl.textContent = prefix;
    }
    if (suffixEl) {
      suffixEl.textContent = suffix;
    }
  }

  function bind(input, options = {}) {
    if (!input || !options.ghostEl) {
      return null;
    }

    const ghostEl = options.ghostEl;
    const ghostText = ghostEl.querySelector("[data-chat-ghost-text]");
    const ghostBadge = ghostEl.querySelector(".kn-chat-input__ghost-badge");

    let idleTimer = null;
    let idleFadeTimer = null;
    let idleIndex = 0;
    let idlePool = [];
    let activeFull = "";
    let dismissedAt = null;
    let mode = "idle";

    function corpus() {
      return buildCorpus({
        promptPhrases: options.getPromptPhrases?.() || [],
        seededQuestions: options.getSeededQuestions?.() || [],
        includePast: options.includePast !== false
      });
    }

    function idleCandidates() {
      return corpus().map((entry) => entry.text);
    }

    function isPaused() {
      return Boolean(options.isPaused?.());
    }

    function restorePlaceholder() {
      options.restorePlaceholder?.(input);
    }

    function hideGhost() {
      ghostEl.classList.remove("is-visible", "is-crossfading", "is-fading");
      ghostEl.hidden = true;
      ghostEl.setAttribute("aria-hidden", "true");
      setGhostLayers(ghostText, { prefix: "", suffix: "" });
      const { outEl } = ensureGhostLayers(ghostText);
      if (outEl) {
        outEl.textContent = "";
      }
      restorePlaceholder();
    }

    function showGhost({ prefix = "", suffix = "", full = "" }) {
      const completion = suffix || full;
      if (!completion) {
        hideGhost();
        return;
      }
      activeFull = prefix + completion;
      setGhostLayers(ghostText, { prefix, suffix: completion });
      ghostEl.hidden = false;
      ghostEl.setAttribute("aria-hidden", "false");
      ghostEl.classList.add("is-visible");
      ghostEl.classList.remove("is-fading");
      if (ghostBadge) {
        ghostBadge.hidden = false;
      }
      if (input.value.trim()) {
        input.placeholder = "";
      }
    }

    function clearIdleCrossfade() {
      if (idleFadeTimer) {
        clearTimeout(idleFadeTimer);
        idleFadeTimer = null;
      }
      ghostEl.classList.remove("is-crossfading");
      const { outEl } = ensureGhostLayers(ghostText);
      if (outEl) {
        outEl.textContent = "";
      }
    }

    function stopIdleCycle() {
      if (idleTimer) {
        clearInterval(idleTimer);
        idleTimer = null;
      }
      clearIdleCrossfade();
    }

    function beginIdleCrossfade(nextText) {
      const reduce = prefersReducedMotion();
      const fadeMs = knMotionDurationMs("--theme-motion-duration-xmoderate", 360);
      const { suffixEl, outEl } = ensureGhostLayers(ghostText);
      const from = suffixEl?.textContent || "";
      if (!reduce && outEl && from && from !== nextText) {
        outEl.textContent = from;
        setGhostLayers(ghostText, { prefix: "", suffix: nextText });
        ghostEl.classList.remove("is-crossfading");
        void ghostEl.offsetWidth;
        ghostEl.classList.add("is-crossfading");
      } else {
        setGhostLayers(ghostText, { prefix: "", suffix: nextText });
        ghostEl.classList.remove("is-crossfading");
        if (outEl) {
          outEl.textContent = "";
        }
      }
      if (idleFadeTimer) {
        clearTimeout(idleFadeTimer);
      }
      idleFadeTimer = setTimeout(() => {
        idleFadeTimer = null;
        ghostEl.classList.remove("is-crossfading");
        if (outEl) {
          outEl.textContent = "";
        }
      }, reduce ? 0 : fadeMs);
    }

    function syncIdleSuggestion() {
      const suggestion = idlePool[idleIndex] || "";
      activeFull = suggestion;
      mode = "idle";
      if (!suggestion) {
        hideGhost();
        return;
      }
      showGhost({ full: suggestion });
      input.placeholder = "";
    }

    function startIdleCycle() {
      stopIdleCycle();
      idlePool = idleCandidates();
      idleIndex = idlePool.length ? Math.floor(Math.random() * idlePool.length) : 0;
      syncIdleSuggestion();
      if (idlePool.length < 2 || prefersReducedMotion() || isPaused() || input.value.trim()) {
        return;
      }
      idleTimer = setInterval(() => {
        if (idleFadeTimer || isPaused() || input.value.trim() || dismissedAt !== null) {
          return;
        }
        idlePool = idleCandidates();
        if (idlePool.length < 2) {
          return;
        }
        idleIndex = (idleIndex + 1) % idlePool.length;
        activeFull = idlePool[idleIndex] || "";
        mode = "idle";
        showGhost({ full: activeFull });
        beginIdleCrossfade(activeFull);
      }, IDLE_CYCLE_MS);
    }

    function sync() {
      if (isPaused()) {
        hideGhost();
        return;
      }

      const typed = input.value;
      if (!typed.trim()) {
        dismissedAt = null;
        mode = "idle";
        if (!idleTimer && !idlePool.length) {
          idlePool = idleCandidates();
          idleIndex = idlePool.length ? Math.floor(Math.random() * idlePool.length) : 0;
        }
        syncIdleSuggestion();
        if (!idleTimer && idlePool.length > 1 && !prefersReducedMotion()) {
          startIdleCycle();
        }
        return;
      }

      stopIdleCycle();

      if (dismissedAt !== null && typed === dismissedAt) {
        hideGhost();
        return;
      }
      if (dismissedAt !== null && typed !== dismissedAt) {
        dismissedAt = null;
      }

      const match = findMatch(typed, corpus());
      if (!match?.suffix) {
        mode = "none";
        hideGhost();
        restorePlaceholder();
        return;
      }

      mode = "inline";
      showGhost({ prefix: typed, suffix: match.suffix });
    }

    function accept() {
      if (isPaused() || !ghostEl.classList.contains("is-visible")) {
        return false;
      }
      if (mode === "inline") {
        const typed = input.value;
        const match = findMatch(typed, corpus());
        if (!match?.full) {
          return false;
        }
        input.value = match.full;
      } else if (mode === "idle" && activeFull) {
        input.value = activeFull;
      } else {
        return false;
      }
      dismissedAt = null;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      sync();
      return true;
    }

    function dismiss() {
      dismissedAt = input.value;
      hideGhost();
    }

    function refresh() {
      idlePool = idleCandidates();
      idleIndex = 0;
      stopIdleCycle();
      sync();
    }

    const controller = {
      sync,
      accept,
      dismiss,
      refresh,
      startIdleCycle,
      stopIdleCycle,
      recordSubmitted(text) {
        recordQuery(text);
        refresh();
      }
    };

    controllers.set(input, controller);
    sync();
    return controller;
  }

  function getController(input) {
    return controllers.get(input) || null;
  }

  function handleKeydown(event) {
    const input = event.target?.closest?.("textarea");
    if (!input) {
      return false;
    }
    const controller = getController(input);
    if (!controller) {
      return false;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      if (controller.accept()) {
        event.preventDefault();
        return true;
      }
    }
    if (event.key === "Escape") {
      const field = input.closest(".kn-chat-input__field, .agentic-home__field");
      const ghost = field?.querySelector("[data-chat-ghost]");
      if (ghost?.classList.contains("is-visible")) {
        controller.dismiss();
        event.preventDefault();
        return true;
      }
    }
    return false;
  }

  window.KNAgentGhost = {
    PAST_QUERIES_KEY,
    buildCorpus,
    recordQuery,
    findMatch,
    bind,
    getController,
    handleKeydown
  };
})();
