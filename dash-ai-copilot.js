(function () {
  "use strict";

  const HOST_ID = "dash-ai-insights-genui";
  let streamAbort = null;
  let wired = false;
  let generating = false;

  function todayLong() {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  }

  function plural(count, noun, pluralNoun) {
    const n = Number(count) || 0;
    const word = n === 1 ? noun : pluralNoun || `${noun}s`;
    return `${n} ${word}`;
  }

  function genuiNav(text, href) {
    return { component: "BUTTON", text, action: { type: "navigate", data: { href } } };
  }

  function genuiPrompt(text, prompt) {
    return { component: "BUTTON", text, action: { type: "prompt", data: { prompt } } };
  }

  function genuiLink(text, href) {
    return { component: "LINK", text, action: { type: "navigate", data: { href } } };
  }

  function priorityRows(summary) {
    const rows = [];
    (summary.holdRows || []).slice(0, 2).forEach((row) => {
      rows.push({
        id: row.id,
        kind: "Hold",
        detail: `${row.container || row.id} · ${row.reason || "Exam hold"}`,
        tone: "notice",
        href: "#klearhub-visibility"
      });
    });
    (summary.delayedRows || []).slice(0, 2).forEach((row) => {
      rows.push({
        id: row.id,
        kind: "Delay",
        detail: `${row.origin?.city || "—"} → ${row.dest?.city || "—"} · ETA slipped`,
        tone: "negative",
        href: "#klearhub-visibility"
      });
    });
    if (!rows.length) {
      (summary.newest || summary.rows || []).slice(0, 3).forEach((row) => {
        rows.push({
          id: row.id,
          kind: "Active",
          detail: `${row.company || "—"} · ${row.status || "In transit"}`,
          tone: row.statusTone === "negative" ? "negative" : "positive",
          href: "#klearhub-visibility"
        });
      });
    }
    return rows.slice(0, 4);
  }

  function buildInsightsSchema(summary) {
    const stats = summary || {};
    const hold = (stats.holdRows || [])[0];
    const demurrage = (stats.demurrageExceeded || 0) + (stats.demurrageRisk || 0);
    const health = stats.total ? Math.round((stats.ontime / stats.total) * 100) : 0;
    const priorities = priorityRows(stats).slice(0, 2);
    const duty = (stats.rows || []).reduce((sum, item) => sum + (stats.amounts?.[item.id] || 0), 0);
    const dutyLabel =
      typeof window.knFormatUsd === "function"
        ? window.knFormatUsd(duty)
        : `$${Math.round(duty).toLocaleString()}`;

    const lead = hold
      ? `**${hold.id}** — ${hold.reason || "Exam hold"} on **${hold.container || "container"}**. Review before today's filings.`
      : demurrage
        ? `${plural(demurrage, "container")} at demurrage risk. Open Visibility before terminal free time ends.`
        : stats.delayed
          ? `${plural(stats.delayed, "shipment")} delayed${stats.earliestDelayEta ? ` · earliest ETA ${stats.earliestDelayEta}` : ""}.`
          : `${health}% on track · ${dutyLabel} duty exposure (est.).`;

    const components = [
      { component: "TEXT", content: lead },
      {
        component: "STACK",
        direction: "horizontal",
        gap: "small",
        children: [
          { component: "BADGE", text: `${stats.hold || 0} hold`, color: stats.hold ? "notice" : "positive" },
          { component: "BADGE", text: `${stats.delayed || 0} delayed`, color: stats.delayed ? "negative" : "positive" },
          { component: "BADGE", text: `${health}% on track`, color: health >= 75 ? "positive" : "notice" }
        ]
      }
    ];

    if (priorities.length) {
      components.push({
        component: "TABLE",
        headers: ["Next up", "Detail", "Status"],
        rows: priorities.map((row) => [
          genuiLink(row.id, row.href),
          { component: "TEXT", value: row.detail },
          { component: "BADGE", text: row.kind, color: row.tone }
        ])
      });
    }

    components.push({
      component: "STACK",
      direction: "horizontal",
      gap: "small",
      children: [
        hold
          ? genuiNav(`Open ${hold.id}`, "#klearhub-visibility")
          : genuiNav("Open Visibility", "#klearhub-visibility"),
        genuiPrompt("Items due today", "All items due today"),
        genuiNav("Open Agent", "#agentic-broker")
      ]
    });

    return { components };
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function currentSummary() {
    return typeof window.knSummarizeShipments === "function"
      ? window.knSummarizeShipments(window.KNShipments)
      : null;
  }

  function chatEls() {
    return {
      input: document.getElementById("dash-ai-insights-text"),
      send: document.getElementById("dash-ai-insights-send"),
      form: document.getElementById("dash-ai-insights-form")
    };
  }

  function setGenerating(next) {
    generating = Boolean(next);
    const { send } = chatEls();
    const panel = document.querySelector(".dash-ai-copilot");
    panel?.classList.toggle("is-generating", generating);
    const mark = document.querySelector(".dash-ai-copilot__mark .klear-assistant-mark, .dash-ai-copilot__ray");
    mark?.classList.toggle("klear-assistant-mark--spin", generating);
    if (send) {
      send.disabled = generating;
      send.setAttribute("data-generating", generating ? "true" : "false");
      send.classList.toggle("is-stop", generating);
      send.querySelector(".kn-chat-input__icon--send")?.toggleAttribute("hidden", generating);
      send.querySelector(".kn-chat-input__icon--stop")?.toggleAttribute("hidden", !generating);
      send.setAttribute("aria-label", generating ? "Stop generating" : "Submit");
    }
  }

  function syncSendEnabled() {
    const { input, send } = chatEls();
    if (!send || generating) {
      return;
    }
    send.disabled = !String(input?.value || "").trim();
  }

  function handleAction(detail) {
    if (!detail) {
      return;
    }
    if (detail.type === "navigate" && detail.data?.href) {
      window.location.hash = detail.data.href.replace(/^#/, "");
      return;
    }
    if (detail.type === "prompt" && detail.data?.prompt) {
      expandComposer();
      askAssist(detail.data.prompt);
    }
  }

  function askAssist(prompt) {
    const text = String(prompt || "").trim();
    if (!text) {
      return;
    }
    window.KNAssistant?.ask?.(text);
  }

  function expandComposer(focus = false) {
    const wrap = document.getElementById("dash-ai-insights-composer-wrap");
    const toggle = document.getElementById("dash-ai-insights-ask-toggle");
    const panel = document.querySelector(".dash-ai-copilot");
    if (!wrap) {
      return;
    }
    wrap.hidden = false;
    panel?.classList.add("is-composer-open");
    toggle?.setAttribute("aria-expanded", "true");
    if (focus) {
      chatEls().input?.focus({ preventScroll: true });
    }
  }

  function collapseComposer() {
    const wrap = document.getElementById("dash-ai-insights-composer-wrap");
    const toggle = document.getElementById("dash-ai-insights-ask-toggle");
    const panel = document.querySelector(".dash-ai-copilot");
    if (!wrap) {
      return;
    }
    wrap.hidden = true;
    panel?.classList.remove("is-composer-open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  function wirePanel() {
    if (wired) {
      return;
    }
    wired = true;

    document.addEventListener("kn-genui-action", (event) => {
      if (!event.target?.closest?.(".dash-ai-copilot")) {
        return;
      }
      handleAction(event.detail);
    });

    document.getElementById("dash-ai-insights-refresh")?.addEventListener("click", () => {
      mount(currentSummary(), { animate: !prefersReducedMotion() });
    });

    document.getElementById("dash-ai-insights-suggestions")?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-dash-ai-prompt]");
      if (!chip) {
        return;
      }
      expandComposer();
      askAssist(chip.getAttribute("data-dash-ai-prompt"));
    });

    document.getElementById("dash-ai-insights-ask-toggle")?.addEventListener("click", () => {
      const wrap = document.getElementById("dash-ai-insights-composer-wrap");
      const expanded = wrap && !wrap.hidden;
      if (expanded) {
        collapseComposer();
      } else {
        expandComposer(true);
      }
    });

    const { form, input, send } = chatEls();
    input?.addEventListener("input", syncSendEnabled);
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (generating) {
        streamAbort?.abort();
        setGenerating(false);
        return;
      }
      const value = String(input?.value || "").trim();
      if (!value) {
        return;
      }
      askAssist(value);
      input.value = "";
      syncSendEnabled();
    });
    send?.addEventListener("click", (event) => {
      if (generating) {
        event.preventDefault();
        streamAbort?.abort();
        setGenerating(false);
      }
    });

    const markSlot = document.getElementById("dash-ai-insights-mark");
    if (markSlot && window.KNAssistCore?.aiMarkHtml) {
      markSlot.innerHTML = window.KNAssistCore.aiMarkHtml({ size: 20, className: "dash-ai-copilot__ray" });
    }

    window.KNChatInput?.hydrate?.(document.getElementById("dash-ai-insights-input"));
    document.querySelectorAll(".dash-ai-copilot__suggestion").forEach((chip) => window.KNChip?.hydrate?.(chip));
    syncSendEnabled();
  }

  async function mount(summary, { animate = true } = {}) {
    const host = document.getElementById(HOST_ID);
    if (!host || !window.KNGenUI?.mount) {
      return;
    }

    wirePanel();
    streamAbort?.abort();
    streamAbort = new AbortController();
    const signal = streamAbort.signal;
    setGenerating(true);

    host.innerHTML = "";
    host.setAttribute("data-kn-genui-provider", "");
    const schema = buildInsightsSchema(summary);

    try {
      if (animate && window.KNGenUI.stream && !prefersReducedMotion()) {
        await window.KNGenUI.stream(host, schema, { animate: true, signal });
      } else {
        window.KNGenUI.mount(host, schema, { animate: false });
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        window.KNGenUI.mount(host, schema, { animate: false });
      }
    } finally {
      if (streamAbort?.signal === signal) {
        streamAbort = null;
      }
      setGenerating(false);
    }
  }

  window.KNDashAiCopilot = {
    buildInsightsSchema,
    mount
  };
})();
