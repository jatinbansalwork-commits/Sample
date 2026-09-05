/**
 * Progressive agent output for entry filing — text chunks, list reveal,
 * and shared timing helpers. Respects prefers-reduced-motion.
 */
(() => {
  "use strict";

  const sessions = new Map();

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function textChunks(text) {
    const source = String(text || "");
    if (!source) {
      return [""];
    }
    const parts = [];
    let buffer = "";
    source.split(/(\s+)/).forEach((token) => {
      buffer += token;
      if (buffer.length >= 18 || /\n$/.test(buffer)) {
        parts.push(buffer);
        buffer = "";
      }
    });
    if (buffer) {
      parts.push(buffer);
    }
    return parts.length ? parts : [source];
  }

  function cancel(key) {
    const session = sessions.get(key);
    if (!session) {
      return;
    }
    session.cancelled = true;
    session.timers.forEach((id) => window.clearTimeout(id));
    if (session.intervalId) {
      window.clearInterval(session.intervalId);
    }
    sessions.delete(key);
  }

  function cancelAll() {
    [...sessions.keys()].forEach(cancel);
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  /**
   * Stream plain text in word-ish chunks.
   * onTick(visible, full) — update UI; onDone(full) when finished.
   */
  function streamText(key, fullText, options = {}) {
    cancel(key);
    const full = String(fullText || "");
    const onTick = typeof options.onTick === "function" ? options.onTick : () => {};
    const onDone = typeof options.onDone === "function" ? options.onDone : () => {};
    const chunkDelay = options.chunkDelay ?? 32;

    if (prefersReducedMotion()) {
      onTick(full, full);
      onDone(full);
      return;
    }

    const session = { cancelled: false, timers: [] };
    sessions.set(key, session);
    const chunks = textChunks(full);
    let visible = "";
    let index = 0;

    const step = () => {
      if (session.cancelled) {
        return;
      }
      if (index >= chunks.length) {
        onTick(full, full);
        onDone(full);
        sessions.delete(key);
        return;
      }
      visible += chunks[index];
      index += 1;
      onTick(visible, full);
      const timer = window.setTimeout(step, chunkDelay + (index % 3) * 8);
      session.timers.push(timer);
    };

    step();
  }

  /**
   * Reveal list items one index at a time (0 .. total-1).
   */
  function streamReveal(key, total, options = {}) {
    cancel(key);
    const count = Math.max(0, Number(total) || 0);
    const onReveal = typeof options.onReveal === "function" ? options.onReveal : () => {};
    const onDone = typeof options.onDone === "function" ? options.onDone : () => {};
    const intervalMs = options.intervalMs ?? 140;
    const startIndex = Math.max(0, Number(options.startIndex) || 0);

    if (prefersReducedMotion() || count <= startIndex) {
      for (let i = startIndex; i < count; i += 1) {
        onReveal(i, count);
      }
      onDone(count);
      return;
    }

    const session = { cancelled: false, timers: [] };
    sessions.set(key, session);
    let index = startIndex;

    const step = () => {
      if (session.cancelled) {
        return;
      }
      if (index >= count) {
        onDone(count);
        sessions.delete(key);
        return;
      }
      onReveal(index, count);
      index += 1;
      const timer = window.setTimeout(step, intervalMs);
      session.timers.push(timer);
    };

    step();
  }

  /** Patch text nodes without a full shell rerender when possible. */
  function patchText(selector, text) {
    const el = document.querySelector(selector);
    if (el) {
      el.textContent = text;
      return true;
    }
    return false;
  }

  /** Run fn on an interval until cancelled; returns cancel(). */
  function runInterval(key, ms, fn) {
    cancel(key);
    const session = { cancelled: false, timers: [], intervalId: null };
    sessions.set(key, session);
    session.intervalId = window.setInterval(() => {
      if (session.cancelled) {
        return;
      }
      fn();
    }, ms);
    return () => cancel(key);
  }

  window.KNEntryAgentStream = Object.freeze({
    prefersReducedMotion,
    textChunks,
    streamText,
    streamReveal,
    cancel,
    cancelAll,
    delay,
    patchText,
    runInterval
  });
})();
