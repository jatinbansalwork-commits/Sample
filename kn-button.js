/**
 * Klear360 Button — primary mouse-tracking radial gradient.
 * Mirrors StyledBaseButton.web.tsx hover gradient behavior.
 */
(function () {
  "use strict";

  const PRIMARY_SELECTOR = ".kn-btn.btn--primary, .btn.btn--primary, .kn-btn.kn-btn--primary";

  function isPrimary(btn) {
    return (
      btn.matches?.(PRIMARY_SELECTOR) ||
      btn.classList.contains("btn--primary") ||
      btn.classList.contains("kn-btn--primary")
    );
  }

  function bind(btn) {
    if (!btn || btn.dataset.knButtonBound || !isPrimary(btn)) {
      return;
    }
    btn.dataset.knButtonBound = "1";
    btn.addEventListener("mousemove", (event) => {
      if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
        return;
      }
      const rect = btn.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty("--kn-btn-mouse-x", `${x}%`);
      btn.style.setProperty("--kn-btn-mouse-y", `${y}%`);
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.removeProperty("--kn-btn-mouse-x");
      btn.style.removeProperty("--kn-btn-mouse-y");
    });
  }

  function scan(root = document) {
    root.querySelectorAll?.(PRIMARY_SELECTOR).forEach(bind);
    root.querySelectorAll?.(".btn--primary, .kn-btn--primary").forEach((btn) => {
      if (btn.classList.contains("kn-btn") || btn.classList.contains("btn")) {
        bind(btn);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan());
  } else {
    scan();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) {
          return;
        }
        if (node.matches?.(PRIMARY_SELECTOR)) {
          bind(node);
        }
        scan(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.KNButton = { bind, scan };
})();
