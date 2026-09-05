(function () {
  "use strict";

  const HOST_ID = "dash-ai-insights-genui";
  const MSG_ID = "dash-ai-insights-msg";
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
    const priorities = priorityRows(stats);
    const duty = (stats.rows || []).reduce((sum, item) => sum + (stats.amounts?.[item.id] || 0), 0);

    const priorityCopy = hold
      ? `Start with **${hold.id}** (${hold.reason?.toLowerCase() || "hold"}) on ${hold.container || "container"}, then clear filings due today.`
      : demurrage
        ? `${plural(demurrage, "container")} at demurrage risk — review terminal free time before cutoff.`
        : stats.delayed
          ? `${plural(stats.delayed, "shipment")} delayed vs original ETA. Earliest revised ETA ${stats.earliestDelayEta || "pending"}.`
          : "All live shipments are on track. Review filings and statements due today.";

    return {
      components: [
        { component: "TEXT", content: "### Today's priorities" },
        {
          component: "TEXT",
          content: `**${todayLong()}** · ${plural(stats.total || 0, "active shipment")}, **${stats.hold || 0}** on hold, **${stats.delayed || 0}** delayed. ${priorityCopy}`
        },
        {
          component: "GRID",
          columns: 3,
          gap: "small",
          children: [
            {
              component: "CARD",
              title: "Needs attention",
              description: hold ? `${hold.id} · ${hold.reason}` : "Queue status",
              children: [
                {
                  component: "BADGE",
                  text: hold ? "Exam hold" : demurrage ? "Demurrage" : "Clear",
                  color: hold || demurrage ? "notice" : "positive"
                },
                {
                  component: "TEXT",
                  content: hold
                    ? `${hold.container || hold.id} at ${hold.location || "terminal"}.`
                    : demurrage
                      ? `${plural(demurrage, "container")} approaching terminal free time.`
                      : "No containers on hold right now."
                }
              ]
            },
            {
              component: "CARD",
              title: "On-track rate",
              description: "Active shipment health",
              children: [
                { component: "BADGE", text: `${health}%`, color: health >= 75 ? "positive" : "notice" },
                {
                  component: "TEXT",
                  content: `${plural(stats.ontime || 0, "shipment")} on schedule · ${plural(stats.inTransit || 0, "in transit")}.`
                }
              ]
            },
            {
              component: "CARD",
              title: "Duty exposure",
              description: "Estimated from live values",
              children: [
                { component: "AMOUNT", value: duty, currency: "USD" },
                { component: "BADGE", text: "Estimate", color: "information" }
              ]
            }
          ]
        },
        { component: "TEXT", content: "### Priority queue" },
        {
          component: "TABLE",
          headers: ["Shipment", "Type", "Detail", "Status"],
          rows: priorities.map((row) => [
            genuiLink(row.id, row.href),
            { component: "TEXT", value: row.kind },
            { component: "TEXT", value: row.detail },
            { component: "BADGE", text: row.kind, color: row.tone }
          ])
        },
        {
          component: "ALERT",
          color: hold || demurrage ? "notice" : "positive",
          title: hold ? `${hold.id} needs a broker decision` : demurrage ? "Demurrage watch" : "Queue is current",
          description: hold
            ? `Review the ${hold.reason?.toLowerCase() || "hold"} before filing today's ISF and statement items.`
            : demurrage
              ? "Terminal free time is ending on one or more containers — open Visibility to act before fees accrue."
              : "No holds blocking release. Use Assist for filings, statements, or entry questions."
        },
        {
          component: "STACK",
          direction: "horizontal",
          gap: "small",
          children: [
            genuiNav("Open Visibility", "#klearhub-visibility"),
            genuiPrompt("All items due today", "All items due today"),
            genuiPrompt("Ask about this queue", "What's in my queue today?")
          ]
        }
      ]
    };
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
      form: document.getElementById("dash-ai-insights-form"),
      msg: document.getElementById(MSG_ID),
      leading: document.querySelector(".dash-ai-copilot__avatar")
    };
  }

  function setGenerating(next) {
    generating = Boolean(next);
    const { send, leading } = chatEls();
    const panel = document.querySelector(".dash-ai-copilot");
    panel?.classList.toggle("is-generating", generating);
    leading?.classList.toggle("is-rotating", generating);
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
      askAssist(chip.getAttribute("data-dash-ai-prompt"));
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
    window.KNChatMessage?.hydrate?.(document.getElementById(MSG_ID));
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
      window.KNChatMessage?.hydrate?.(document.getElementById(MSG_ID));
    }
  }

  window.KNDashAiCopilot = {
    buildInsightsSchema,
    mount
  };
})();
