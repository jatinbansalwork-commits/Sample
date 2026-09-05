/**
 * QA-only Spark state switcher.
 * Loaded exclusively when the page URL includes ?preview=spark-states
 * (see the gated loader in index.html). This repo has no bundler step that
 * can strip the file at build time — query-param gating is the accepted
 * limitation, not a silent gap. Must not join the default script list.
 */
(function () {
  "use strict";

  if (new URLSearchParams(window.location.search).get("preview") !== "spark-states") {
    return;
  }

  const page = document.getElementById("agentic-broker-page");
  const spark = page?.querySelector("[data-spark-root]");
  if (!page || !spark || page.querySelector("[data-spark-recipe]")) {
    return;
  }

  const css = document.createElement("style");
  css.textContent = `
    .agentic-spark-recipe {
      position: absolute;
      top: var(--theme-spacing-4);
      left: var(--theme-spacing-4);
      right: auto;
      z-index: 3;
      flex-wrap: wrap;
      gap: var(--theme-spacing-2);
      padding: var(--theme-spacing-2);
      border-radius: var(--theme-border-radius-medium);
      background: color-mix(in srgb, var(--kn-color-background-surface-gray-intense) 88%, transparent);
      box-shadow: var(--theme-elevation-lowRaised);
      pointer-events: auto;
    }
    .agentic-spark-recipe__label {
      color: var(--kn-color-text-surface-gray-muted);
      padding-inline: var(--theme-spacing-2);
    }
    .agentic-spark-recipe .kn-btn[aria-pressed="true"] {
      background: var(--kn-color-background-interactive-gray-fadedHighlighted);
      font-weight: var(--kn-weight-semibold);
    }
  `;
  document.head.appendChild(css);

  const strip = document.createElement("div");
  strip.className = "kn-box kn-box--flex kn-box--row kn-box--center kn-box--wrap agentic-spark-recipe";
  strip.setAttribute("data-spark-recipe", "");
  strip.setAttribute("role", "group");
  strip.setAttribute("aria-label", "Gen AI chat recipe (preview only)");
  strip.innerHTML = `
    <span class="type-caption-sm agentic-spark-recipe__label">Recipe</span>
    <button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-spark-recipe-state="empty" aria-pressed="true">
      <span class="kn-btn__label">Empty</span>
    </button>
    <button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-spark-recipe-state="prompt" aria-pressed="false">
      <span class="kn-btn__label">Prompt</span>
    </button>
    <button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-spark-recipe-state="stop" aria-pressed="false">
      <span class="kn-btn__label">Stop</span>
    </button>
    <button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-spark-recipe-state="success" aria-pressed="false">
      <span class="kn-btn__label">Success</span>
    </button>
    <button type="button" class="kn-btn kn-btn--tertiary kn-btn--small btn btn--tertiary btn--sm type-ui-sm" data-spark-recipe-state="chat" aria-pressed="false">
      <span class="kn-btn__label">Chat</span>
    </button>
  `;
  spark.after(strip);
  window.KNButton?.hydrate(strip);
})();
