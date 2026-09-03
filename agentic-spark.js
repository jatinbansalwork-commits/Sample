/**
 * Agentic chat Spark atmosphere.
 * One KlearSense (WebGL glass) at a time. KlearSenseGradient is the icon overlay
 * for success only (check mask). Empty is plain — no bottomWave, no klear glyph.
 * States: empty → thinking → success → idle transcript.
 */
(function () {
  "use strict";

  const ASSETS = "./assets/spark";
  const SUCCESS_HOLD_MS = 2200;
  const PRELOAD_PRESETS = ["rippleWave", "circleSlideUp"];

  const SENSE_PROPS = {
    thinking: {
      preset: "rippleWave",
      width: "100%",
      height: "100%",
      edgeFeather: [0.12, 0.08, 0.2, 0.08],
    },
    success: {
      preset: "circleSlideUp",
      width: "100%",
      height: "100%",
      edgeFeather: [0, 0, 0.2, 0],
    },
  };

  // Success only. Empty must not get mask "klear" (or any other brand glyph).
  const GRADIENT = {
    success: { mask: "check", size: 52, origin: [0.5, 0.5], className: "kn-spark__mark kn-spark__mark--success" },
  };

  let root = null;
  let senseHost = null;
  let gradientHost = null;
  let gradientHome = null;
  let sense = null;
  let gradient = null;
  let mode = "idle";
  let gen = 0;
  let successTimer = null;
  let preloaded = false;
  let startedBackground = false;
  let pageVisible = false;
  let pinRetry = 0;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isPageLive() {
    const page = document.getElementById("agentic-broker-page");
    if (!page) {
      return false;
    }
    if (document.documentElement.dataset.knRoute === "agentic-broker") {
      return true;
    }
    return !page.hidden;
  }

  function sparkApi() {
    return window.KNKlearSense;
  }

  function cacheEls() {
    root = document.querySelector("[data-spark-root]");
    senseHost = root?.querySelector("[data-spark-sense]") || null;
    gradientHost = document.querySelector("[data-spark-gradient]");
    if (gradientHost && !gradientHome) {
      gradientHome = gradientHost.parentElement;
    }
  }

  function clearSuccessTimer() {
    if (successTimer) {
      window.clearTimeout(successTimer);
      successTimer = null;
    }
  }

  function parkGradientHost() {
    if (!gradientHost) {
      return;
    }
    const home = gradientHome || document.getElementById("agentic-broker-page");
    if (!home) {
      return;
    }
    const spark = home.querySelector("[data-spark-root]");
    if (spark) {
      spark.after(gradientHost);
    } else if (gradientHost.parentElement !== home) {
      home.appendChild(gradientHost);
    }
  }

  function resetGradientHost() {
    if (!gradientHost) {
      return;
    }
    window.cancelAnimationFrame(pinRetry);
    pinRetry = 0;
    gradientHost.hidden = true;
    gradientHost.replaceChildren();
    gradientHost.classList.remove("is-pinned");
    gradientHost.removeAttribute("style");
    parkGradientHost();
  }

  function disposeLayer() {
    sense?.dispose();
    gradient?.dispose();
    sense = null;
    gradient = null;
    if (senseHost) senseHost.replaceChildren();
    resetGradientHost();
  }

  function completionTarget() {
    const messages = document.getElementById("agentic-thread-messages");
    const assistants = messages?.querySelectorAll(".agentic-thread-msg--assistant");
    return assistants?.[assistants.length - 1] || null;
  }

  function pinGradientToCompletion() {
    const target = completionTarget();
    if (!target || !gradientHost) {
      return false;
    }
    if (!gradientHome) {
      gradientHome = gradientHost.parentElement;
    }
    if (gradientHost.parentElement !== target) {
      target.appendChild(gradientHost);
    }
    gradientHost.hidden = false;
    gradientHost.classList.add("is-pinned");
    gradientHost.style.position = "absolute";
    gradientHost.style.inset = "auto";
    gradientHost.style.top = "0";
    gradientHost.style.left = "0";
    gradientHost.style.width = "52px";
    gradientHost.style.height = "52px";
    gradientHost.style.zIndex = "4";
    gradientHost.style.display = "flex";
    gradientHost.style.alignItems = "center";
    gradientHost.style.justifyContent = "center";
    gradientHost.style.pointerEvents = "none";
    return true;
  }

  function setPressed(next) {
    const recipeState = { empty: "empty", thinking: "prompt", success: "success", idle: "chat" }[next] || next;
    document.querySelectorAll("[data-spark-recipe-state]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-spark-recipe-state") === recipeState ? "true" : "false");
    });
  }

  function canRun() {
    return Boolean(sparkApi()?.mountKlearSense) && !prefersReducedMotion();
  }

  async function ensurePreloaded(preset) {
    const api = sparkApi();
    if (!api?.preloadKlearSenseAssets) return;
    if (!startedBackground) {
      startedBackground = true;
      PRELOAD_PRESETS.forEach((name) => {
        if (name !== preset) {
          api.preloadKlearSenseAssets(name, ASSETS).catch(() => null);
        }
      });
    }
    await api.preloadKlearSenseAssets(preset, ASSETS);
    preloaded = true;
  }

  async function setState(next, { settleToIdle = true } = {}) {
    const id = ++gen;
    clearSuccessTimer();
    mode = next;
    cacheEls();
    if (!root) return;
    root.dataset.sparkMode = next;
    setPressed(next === "idle" ? "chat" : next);

    if (next === "idle" || next === "empty" || !isPageLive()) {
      disposeLayer();
      return;
    }

    const preset = SENSE_PROPS[next]?.preset;
    if (!preset) {
      disposeLayer();
      return;
    }

    disposeLayer();
    if (next === "success") {
      pinGradientToCompletion();
      pinRetry = window.requestAnimationFrame(() => {
        pinGradientToCompletion();
        pinRetry = window.requestAnimationFrame(pinGradientToCompletion);
      });
    }

    if (!canRun() || !senseHost) {
      if (next === "success" && settleToIdle) {
        successTimer = window.setTimeout(() => {
          if (id !== gen) return;
          setState("idle");
        }, SUCCESS_HOLD_MS);
      }
      return;
    }

    try {
      await ensurePreloaded(preset);
    } catch (_error) {
      return;
    }
    if (id !== gen) return;

    try {
      sense = await sparkApi().mountKlearSense(senseHost, {
        assetsPath: ASSETS,
        ...SENSE_PROPS[next],
      });
      if (id !== gen) {
        disposeLayer();
        if (next === "success") {
          pinGradientToCompletion();
        }
        return;
      }
      const gradientOpts = GRADIENT[next];
      if (gradientOpts && gradientHost && sparkApi().mountKlearSenseGradient) {
        if (next !== "success") {
          gradientHost.hidden = false;
        }
        gradient = sparkApi().mountKlearSenseGradient(gradientHost, gradientOpts);
      }
    } catch (_error) {
      sense?.dispose();
      gradient?.dispose();
      sense = null;
      gradient = null;
      if (senseHost) senseHost.replaceChildren();
      if (next === "success") {
        pinGradientToCompletion();
      }
    }

    if (next === "success" && settleToIdle) {
      successTimer = window.setTimeout(() => {
        if (id !== gen) return;
        setState("idle");
      }, SUCCESS_HOLD_MS);
    }
  }

  function pauseForHidden() {
    if (document.hidden || !pageVisible) {
      sense?.pause();
      return;
    }
    sense?.play();
  }

  function sync(visible) {
    pageVisible = Boolean(visible);
    cacheEls();
    if (!pageVisible) {
      clearSuccessTimer();
      gen += 1;
      disposeLayer();
      if (root) root.dataset.sparkMode = "idle";
      return;
    }
    pauseForHidden();
  }

  function init() {
    cacheEls();
    document.addEventListener("visibilitychange", pauseForHidden);
    const recipe = document.querySelector("[data-spark-recipe]");
    if (recipe) {
      window.KNButton?.hydrate(recipe);
    }
    if (root?.dataset.sparkMode === "empty" && mode === "idle" && isPageLive()) {
      setState("empty");
    }
  }

  window.KNAgenticSpark = {
    init,
    sync,
    setState,
    getMode() {
      return mode;
    },
    preload: () => ensurePreloaded("default"),
  };
})();
