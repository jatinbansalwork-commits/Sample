/**
 * KNNextActions — unified "what next" chip row for Klear Agent surfaces.
 * State-aware actions ranked most-likely first; one visual system everywhere.
 */
(() => {
  "use strict";

  const ICONS = Object.freeze({
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    queue:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h5"/></svg>',
    statements:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M8 12h6M8 16h6"/></svg>',
    shipments:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16V6a1 1 0 0 1 1-1h9v11"/><path d="M13 9h4l3 3v4h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    dueToday:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6M19 4l1.5 1.5M4 4 2.5 5.5"/></svg>',
    corrections:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0L4 16v4Z"/><path d="M13.5 6.5l3 3"/></svg>',
    isf:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="M9.5 12l1.8 1.8L14.5 10"/></svg>',
    validate:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9 17l11-11"/></svg>',
    transmit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg>'
  });

  const HOME_ACTIONS = Object.freeze([
    { key: "queue", icon: "queue", label: "Recent entries in my queue", query: "Recent entries in my queue", rank: 100 },
    { key: "dueToday", icon: "dueToday", label: "Items due today", query: "All items due today", rank: 96 },
    { key: "dashboard", icon: "dashboard", label: "Personal dashboard", query: "Show my personal dashboard", rank: 88 },
    { key: "statements", icon: "statements", label: "Today's statements", query: "Today's Statements", rank: 84 },
    { key: "hts", icon: "queue", label: "HTS classification", query: "What HTS classification applies to stamped steel auto body brackets from Mexico?", rank: 72 },
    { key: "catair", icon: "corrections", label: "CATAIR code 398", query: "What does CATAIR code 398 mean and how do I fix it?", rank: 70 },
    { key: "shipments", icon: "shipments", label: "Recent shipments", query: "Recent shipments in operations", rank: 66 },
    { key: "corrections", icon: "corrections", label: "Post summary corrections", query: "Post Summary Corrections", rank: 62 },
    { key: "isf", icon: "isf", label: "ISF dashboard", query: "ISF Dashboard", rank: 58 }
  ]);

  const ENTRY_UTILITY_ACTIONS = Object.freeze({
    queue: [
      { label: "Recent entries in my queue", query: "Recent entries in my queue", rank: 100, icon: "queue" },
      { label: "My Working List", query: "My Working List", rank: 92, icon: "queue" },
      { label: "Find entry by number", query: "Find entry S1F01000405", rank: 80, icon: "shipments" }
    ],
    idle: [
      { label: "Search my queue", query: "Recent entries in my queue", rank: 90, icon: "queue" },
      { label: "Items due today", query: "All items due today", rank: 86, icon: "dueToday" },
      { label: "Find entry S1F01000405", query: "Find entry S1F01000405", rank: 78, icon: "shipments" }
    ],
    "docs-uploaded": [
      { label: "Extract from invoice", query: "Fill header fields from the commercial invoice", rank: 100, icon: "corrections" },
      { label: "Validate documents", query: "Are all required documents received?", rank: 88, icon: "validate" },
      { label: "Classify line 1 HTS", query: "Suggest HTS for line 1 from the invoice", rank: 82, icon: "isf" }
    ],
    "partially-filled": [
      { label: "What's still empty?", query: "Which required fields are still empty on this entry?", rank: 100, icon: "validate" },
      { label: "Review agent drafts", query: "Show fields pending my review", rank: 94, icon: "corrections" },
      { label: "Estimate duty", query: "Estimate total duty on this entry", rank: 76, icon: "statements" }
    ],
    "cbp-error": [
      { label: "Explain CBP reject", query: "Explain the validation error on this entry", rank: 100, icon: "corrections" },
      { label: "Fix HTS mismatch", query: "How do I fix the HTS and country of origin mismatch?", rank: 96, icon: "validate" },
      { label: "Show citation", query: "What is CATAIR reject 398?", rank: 82, icon: "isf" }
    ],
    "ready-to-file": [
      { label: "Pre-submit checklist", query: "Run pre-submit validation on this entry", rank: 100, icon: "validate" },
      { label: "Confirm duty total", query: "Confirm total estimated duty before filing", rank: 90, icon: "statements" },
      { label: "Submit readiness", query: "Is this entry ready to submit to ACE?", rank: 84, icon: "transmit" }
    ]
  });

  function escapeHtml(value) {
    return window.KNAdminUX?.escapeHtml?.(value) ?? String(value ?? "");
  }

  function normalizeAction(raw = {}, index = 0) {
    const label = String(raw.label || "").trim();
    const query = String(raw.query || raw.prompt || label).trim();
    return {
      id: raw.id || raw.key || `next-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      query,
      kind: raw.kind || "prompt",
      icon: raw.icon || null,
      rank: typeof raw.rank === "number" ? raw.rank : Math.max(0, 70 - index * 4),
      fieldKey: raw.fieldKey || "",
      messageId: raw.messageId || "",
      disabled: Boolean(raw.disabled),
      tone: raw.tone === "primary" ? "primary" : "default"
    };
  }

  function sortActions(actions = []) {
    return actions.map(normalizeAction).sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label));
  }

  function chipAttributes(action) {
    const attrs = [`data-kn-next-action="${escapeHtml(action.kind)}"`];
    if (action.query) {
      attrs.push(`data-kn-next-query="${escapeHtml(action.query)}"`);
    }
    if (action.fieldKey) {
      attrs.push(`data-kn-next-field="${escapeHtml(action.fieldKey)}"`);
    }
    if (action.messageId) {
      attrs.push(`data-kn-next-message="${escapeHtml(action.messageId)}"`);
    }
    return attrs.join(" ");
  }

  function renderChip(action) {
    const iconHtml = action.icon && ICONS[action.icon]
      ? `<span class="kn-next-actions__icon" aria-hidden="true">${ICONS[action.icon]}</span>`
      : "";
    const toneClass = action.tone === "primary" ? " kn-next-actions__chip--primary" : "";
    return `<button type="button" class="kn-next-actions__chip type-ui-sm${toneClass}" ${chipAttributes(action)}${action.disabled ? " disabled" : ""}>
      ${iconHtml}
      <span class="kn-next-actions__label">${escapeHtml(action.label)}</span>
    </button>`;
  }

  function render(actions = [], options = {}) {
    const sorted = sortActions(actions).filter((action) => action.label);
    if (!sorted.length) {
      return "";
    }
    const ariaLabel = options.ariaLabel || "Suggested next actions";
    const modifier = options.modifier ? ` kn-next-actions--${options.modifier}` : "";
    const align = options.align ? ` kn-next-actions--${options.align}` : "";
    return `<div class="kn-next-actions${modifier}${align}" role="group" aria-label="${escapeHtml(ariaLabel)}">${sorted.map(renderChip).join("")}</div>`;
  }

  function homeActions() {
    const allowed = window.KNPersona?.getHomePromptKeys?.() || "*";
    const list = allowed === "*"
      ? HOME_ACTIONS.slice()
      : HOME_ACTIONS.filter((item) => allowed.includes(item.key));
    return list.map((item) => ({
      id: item.key,
      label: item.label,
      query: item.query,
      icon: item.icon,
      kind: "prompt",
      rank: item.rank,
      disabled: item.unavailable === true
    }));
  }

  function entryUtilityActions(contextKey = "idle") {
    const list = ENTRY_UTILITY_ACTIONS[contextKey] || ENTRY_UTILITY_ACTIONS.idle;
    return list.map((item) => ({ ...item, kind: "prompt" }));
  }

  function entryValidationActions(ctx = {}) {
    const { state = {}, fieldLabel = (key) => key } = ctx;
    const findings = (state.validationFindings || []).filter((f) => !f.suppressed);
    const critical = state.validationSummary?.critical || 0;
    const actions = [];

    actions.push({
      id: "validation-full",
      label: findings.length ? "Re-run full validation" : "Run full entry validation",
      kind: "validation-full",
      icon: "validate",
      rank: critical > 0 ? 100 : 84,
      tone: critical > 0 ? "primary" : "default"
    });

    if (state.validationTargetField) {
      actions.push({
        id: "validation-targeted",
        label: `Re-validate ${fieldLabel(state.validationTargetField)}`,
        kind: "validation-targeted",
        fieldKey: state.validationTargetField,
        icon: "validate",
        rank: 92
      });
    }

    if (critical > 0) {
      actions.push({
        id: "explain-reject",
        label: "Explain top validation error",
        kind: "prompt",
        query: "Explain the validation error on this entry",
        icon: "corrections",
        rank: 88
      });
    }

    return actions;
  }

  function entryStatusActions(ctx = {}) {
    const { state = {}, row = {}, transmitDisabled = () => false } = ctx;
    const actions = [];
    const messages = state.statusMessages || [];
    const resolvable = messages.find((msg) => msg.resolvable && msg.type === "error");
    const critical = state.validationSummary?.critical || 0;
    const canTransmit = !transmitDisabled();
    const resubmitQueued = (state.statusExtraMessages || []).some((msg) => /resubmission/i.test(msg.description || ""));

    if (resolvable) {
      actions.push({
        id: `resolve-${resolvable.id}`,
        label: `Resolve ${resolvable.rawCode}`,
        kind: "status-resolve",
        messageId: resolvable.id,
        icon: "corrections",
        rank: 100,
        tone: "primary"
      });
    }

    if (canTransmit && (resubmitQueued || resolvable || row.id === "entry-2")) {
      actions.push({
        id: "resubmit-ace",
        label: "Resubmit to ACE",
        kind: "resubmit",
        icon: "transmit",
        rank: resolvable ? 94 : 98,
        tone: "primary"
      });
    }

    if (critical > 0) {
      actions.push({
        id: "validation-full-status",
        label: "Re-run validation",
        kind: "validation-full",
        icon: "validate",
        rank: 86
      });
    }

    if (resolvable) {
      const api = window.KNEntryStatusDetail;
      actions.push({
        id: "prompt-resolve",
        label: "Ask Klear Agent to fix",
        kind: "prompt",
        query: api?.resolvePrompt?.(resolvable) || `Resolve status error ${resolvable.rawCode}`,
        icon: "queue",
        rank: 80
      });
    }

    return actions;
  }

  function handleClick(event, handlers = {}) {
    const chip = event.target.closest("[data-kn-next-action]");
    if (!chip || chip.disabled) {
      return false;
    }
    event.preventDefault();

    const kind = chip.getAttribute("data-kn-next-action") || "prompt";
    if (kind === "prompt") {
      const query = chip.getAttribute("data-kn-next-query") || chip.textContent.trim();
      handlers.onPrompt?.(query);
      return true;
    }
    if (kind === "validation-full") {
      handlers.onValidationFull?.();
      return true;
    }
    if (kind === "validation-targeted") {
      handlers.onValidationTargeted?.(chip.getAttribute("data-kn-next-field") || "");
      return true;
    }
    if (kind === "status-resolve") {
      handlers.onStatusResolve?.(chip.getAttribute("data-kn-next-message") || "");
      return true;
    }
    if (kind === "resubmit") {
      handlers.onResubmit?.();
      return true;
    }
    return false;
  }

  window.KNNextActions = Object.freeze({
    ICONS,
    render,
    sortActions,
    homeActions,
    entryUtilityActions,
    entryValidationActions,
    entryStatusActions,
    handleClick
  });
})();
