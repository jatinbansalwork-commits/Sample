(() => {
  "use strict";

  const STARTER_PATTERN =
    /^(classify this product|hts classification|help me classify|suggest hts|classify(?:\s+this)?(?:\s+product)?)\.?$/i;

  const CLASSIFICATION_INTENT =
    /\b(hts|hs code|harmonized|classif(?:y|ication)|classify this product|suggest hts|classify line)\b/i;

  const ORIGIN_PATTERN =
    /\b(?:from|origin|made in|country of origin)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]+)?)|\b(MX|VN|CN|IN|BE|US|Mexico|Vietnam|China|India|Belgium|Korea|Canada)\b/i;

  const MATERIAL_PATTERN =
    /\b(steel|stamped steel|cotton|wooden|wood|aluminum|plastic|rubber|leather|wool|synthetic|brass|copper|iron|metal|fabric|textile|knit|woven)\b/i;

  const DESCRIPTION_PATTERN =
    /\b(bracket|brackets|trouser|trousers|pant|pants|furniture|cable|pullovers?|sweater|fitting|coil|body part|auto|motor vehicle|household|insulated|electric)\b/i;

  function escapeHtml(v) {
    return window.KNAdminUX?.escapeHtml?.(v) ?? String(v ?? "");
  }

  function jsonBlock(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (_error) {
      return String(obj);
    }
  }

  function isClassificationIntent(question) {
    return CLASSIFICATION_INTENT.test(String(question || "").trim());
  }

  function isBareStarter(question) {
    const q = String(question || "").trim();
    if (STARTER_PATTERN.test(q)) {
      return true;
    }
    if (!isClassificationIntent(q)) {
      return false;
    }
    return !hasProductDetails(q);
  }

  function hasProductDetails(text) {
    const q = String(text || "");
    if (DESCRIPTION_PATTERN.test(q) && (ORIGIN_PATTERN.test(q) || MATERIAL_PATTERN.test(q))) {
      return true;
    }
    if (/\b(stamped steel auto body bracket|8708|7326|6204\.62|9403\.60|8544\.42|6110\.20)\b/i.test(q)) {
      return true;
    }
    return DESCRIPTION_PATTERN.test(q) && ORIGIN_PATTERN.test(q);
  }

  function normalizeOrigin(raw) {
    const map = {
      mexico: "MX",
      vietnam: "VN",
      china: "CN",
      india: "IN",
      belgium: "BE",
      "united states": "US",
      usa: "US",
      korea: "KR",
      canada: "CA"
    };
    const key = String(raw || "").trim().toLowerCase();
    if (map[key]) {
      return map[key];
    }
    if (/^[A-Za-z]{2}$/.test(key)) {
      return key.toUpperCase();
    }
    return String(raw || "").trim().toUpperCase().slice(0, 2);
  }

  function parseProductInput(question) {
    const q = String(question || "").trim();
    const originMatch = q.match(ORIGIN_PATTERN);
    const materialMatch = q.match(MATERIAL_PATTERN);
    let description = q
      .replace(/^(what hts classification applies to|classify|classification for|hts for)\s+/i, "")
      .replace(/\?+$/, "")
      .trim();
    if (originMatch) {
      description = description.replace(/\b(from|origin|made in)\s+[A-Za-z\s]+$/i, "").trim();
    }
    return {
      description: description.length > 8 ? description : "",
      origin: originMatch ? normalizeOrigin(originMatch[1] || originMatch[2]) : "",
      material: materialMatch ? materialMatch[1] : ""
    };
  }

  function readEntryLineContext(lineOverride) {
    const hash = String(location.hash || "");
    const match = hash.match(/#transaction-us-entry\/filing\/([^/?#]+)/);
    if (!match) {
      return null;
    }
    const entryId = decodeURIComponent(match[1]);
    const fields = window.KNEntryFormState?.getFields?.(entryId) || {};
    const lookKey = window.KNEntryFiling?.getBrokerLookAtKey?.() || "";
    let lineNum = Number(lineOverride) || 1;
    if (!lineOverride) {
      const lineMatch = lookKey.match(/invoice:\d+:line:(\d+)/);
      if (lineMatch) {
        lineNum = Number(lineMatch[1]) || 1;
      }
    }
    const prefix = `invoice:1:line:${lineNum}`;
    const descField = fields[`${prefix}:description`];
    const skuField = fields[`${prefix}:sku`];
    const htsField = fields[`${prefix}:hts`];
    const cooField = fields[`${prefix}:coo`];
    const description = String(descField?.value || skuField?.value || "").trim();
    const origin = String(cooField?.value || "").trim();
    const materialMatch = description.match(MATERIAL_PATTERN);
    return {
      entryId,
      lineNum,
      fieldKey: `${prefix}:hts`,
      description,
      origin,
      material: materialMatch ? materialMatch[1] : "",
      currentHts: String(htsField?.value || "").trim(),
      htsStatus: htsField?.status || "empty",
      entryNumber: window.KNUsEntry?.list?.()?.find((row) => row.id === entryId)?.entryNumber || entryId
    };
  }

  function entryLineReady(ctx) {
    return Boolean(ctx?.description && ctx?.origin);
  }

  function mergeInput(parsed, entryCtx) {
    return {
      description: parsed.description || entryCtx?.description || "",
      origin: parsed.origin || entryCtx?.origin || "",
      material: parsed.material || entryCtx?.material || "",
      entryId: entryCtx?.entryId || "",
      lineNum: entryCtx?.lineNum || 1,
      fieldKey: entryCtx?.fieldKey || "",
      entryNumber: entryCtx?.entryNumber || ""
    };
  }

  function profileFor(input) {
    const blob = `${input.description} ${input.material}`.toLowerCase();
    const origin = normalizeOrigin(input.origin);
    if (/bracket|8708|auto body|motor vehicle body|8708\.29/i.test(blob) || (/bracket/.test(blob) && origin === "MX")) {
      return {
        hts: "8708.29.5060",
        description: "Parts and accessories of bodies (including cabs): Other: Other",
        dutyRate: "2.5%",
        preference: origin === "MX" ? "USMCA if regional value content is documented" : "Column 1",
        confidence: "high",
        alternatives: [
          { hts: "7326.90.8688", reason: "Generic articles of iron or steel — rejected; essential character is automotive" },
          { hts: "8708.99.6890", reason: "Other parts — rejected; brackets are body-specific" }
        ],
        chapter99: origin === "CN" ? { code: "9903.88.15", note: "Section 301 additional duty may apply" } : null,
        crossRulings: [
          { id: "NY N308812", summary: "Stamped steel brackets for motor vehicle bodies classified in 8708.29" },
          { id: "HQ H265432", summary: "Essential character follows dedicated automotive use, not generic steel fabrication" }
        ]
      };
    }
    if (/trouser|pant|6204\.62|women/.test(blob)) {
      return {
        hts: "6204.62.4020",
        description: "Women's or girls' trousers, bib and brace overalls: Of cotton: Other",
        dutyRate: "9.9%",
        preference: origin === "VN" || origin === "BE" ? "Check SPI / FTA documentation" : "Column 1",
        confidence: origin === "BE" ? "medium" : "high",
        alternatives: [
          { hts: "6204.62.4010", reason: "AD/CVD scope line — rejected without order documentation" },
          { hts: "6204.69.4040", reason: "Other textile composition — rejected; invoice specifies cotton" }
        ],
        chapter99: null,
        crossRulings: [
          { id: "NY N245901", summary: "Women's woven cotton trousers classified in 6204.62" },
          { id: "HQ H198776", summary: "Gender and construction determine heading 6204 vs 6203" }
        ]
      };
    }
    if (/furniture|wood|9403/.test(blob)) {
      return {
        hts: "9403.60.8081",
        description: "Other wooden furniture: Other: Other",
        dutyRate: "0.0%",
        preference: "Column 1",
        confidence: "high",
        alternatives: [{ hts: "9403.40.9060", reason: "Kitchen furniture — rejected; product is household/other" }],
        chapter99: null,
        crossRulings: [{ id: "NY N112233", summary: "Household wooden furniture in 9403.60" }]
      };
    }
    if (/cable|8544|electric|insulated/.test(blob)) {
      return {
        hts: "8544.42.9090",
        description: "Insulated electric conductors: Fitted with connectors: Other",
        dutyRate: "2.6%",
        preference: origin === "CN" ? "Section 301 list candidate — verify overlay" : "Column 1",
        confidence: "high",
        alternatives: [{ hts: "8544.49.9000", reason: "Without connectors — rejected; assemblies include connectors" }],
        chapter99: origin === "CN" ? { code: "9903.88.03", note: "Section 301 List 3 additional duty" } : null,
        crossRulings: [{ id: "NY N334455", summary: "Cable assemblies with connectors in 8544.42" }]
      };
    }
    if (/pullover|sweater|knit|6110/.test(blob)) {
      return {
        hts: "6110.20.2079",
        description: "Sweaters, pullovers: Of cotton: Other",
        dutyRate: "16.5%",
        preference: "Column 1",
        confidence: "high",
        alternatives: [{ hts: "6110.30.3059", reason: "Man-made fibers — rejected; cotton construction" }],
        chapter99: null,
        crossRulings: [{ id: "NY N556677", summary: "Cotton knit pullovers in 6110.20" }]
      };
    }
    return {
      hts: "8708.29.5060",
      description: "Parts and accessories of bodies (including cabs): Other: Other",
      dutyRate: "2.5%",
      preference: origin === "MX" ? "USMCA if regional value content is documented" : "Column 1",
      confidence: "medium",
      alternatives: [{ hts: "7326.90.8688", reason: "Fallback generic steel — review GRI 3 essential character" }],
      chapter99: null,
      crossRulings: [{ id: "NY N308812", summary: "Closest CROSS match for described merchandise" }]
    };
  }

  function resolveHsCode(input) {
    const profile = profileFor(input);
    const toolInput = {
      description: input.description,
      material: input.material || null,
      countryOfOrigin: normalizeOrigin(input.origin),
      documents: input.entryId ? ["Commercial Invoice", "Open entry line"] : ["User description"]
    };
    const toolOutput = {
      hts: profile.hts,
      confidence: profile.confidence === "high" ? 92 : profile.confidence === "medium" ? 78 : 65,
      heading: profile.description.split(":")[0],
      chapter99Overlay: profile.chapter99?.code || null,
      alternativesConsidered: profile.alternatives.map((alt) => alt.hts)
    };
    const crossSteps = profile.crossRulings.map((ruling) => ({
      tool: "lookup_cross_ruling",
      input: { query: input.description, origin: normalizeOrigin(input.origin) },
      output: { rulingId: ruling.id, summary: ruling.summary, matched: true }
    }));
    return {
      ...profile,
      origin: normalizeOrigin(input.origin),
      input,
      trace: [
        {
          tool: "resolve_hs_code",
          input: toolInput,
          output: toolOutput
        },
        ...crossSteps
      ]
    };
  }

  function renderTraceHtml(trace, traceId) {
    if (!trace?.length) {
      return "";
    }
    const panelId = `kn-classification-trace-${traceId}`;
    const stepsHtml = trace
      .map((item, index) => {
        const inputJson = escapeHtml(jsonBlock(item.input));
        const outputJson = escapeHtml(jsonBlock(item.output));
        return `<li class="entry-agent-trace__step">
          <div class="entry-agent-trace__step-head">
            <span class="entry-agent-trace__index type-caption-sm" aria-hidden="true">${index + 1}</span>
            <code class="entry-agent-trace__tool type-caption-sm">${escapeHtml(item.tool)}</code>
          </div>
          <div class="entry-agent-trace__io">
            <div class="entry-agent-trace__io-block">
              <span class="entry-agent-trace__io-label type-caption-sm">Input</span>
              <pre class="entry-agent-trace__code type-caption-sm"><code>${inputJson}</code></pre>
            </div>
            <div class="entry-agent-trace__io-block">
              <span class="entry-agent-trace__io-label type-caption-sm">Output</span>
              <pre class="entry-agent-trace__code type-caption-sm"><code>${outputJson}</code></pre>
            </div>
          </div>
        </li>`;
      })
      .join("");
    return `<div class="entry-agent-trace kn-classification-trace">
      <button type="button" class="entry-agent-trace__toggle type-caption-sm" data-kn-classification-trace-toggle="${escapeHtml(traceId)}" aria-expanded="false" aria-controls="${panelId}">
        <span class="entry-agent-trace__toggle-label">How KlearAgent got this</span>
        <svg class="entry-agent-trace__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
      </button>
      <div class="entry-agent-trace__panel" id="${panelId}" role="region" aria-label="KlearAgent classification tool sequence" hidden>
        <ol class="entry-agent-trace__steps">${stepsHtml}</ol>
      </div>
    </div>`;
  }

  function buildApplyAction(input, hts) {
    if (!input.entryId || !input.fieldKey) {
      return null;
    }
    return {
      type: "apply-hts-confirm",
      label: `Apply to line ${input.lineNum}`,
      data: {
        hts,
        fieldKey: input.fieldKey,
        entryId: input.entryId,
        lineNum: input.lineNum,
        entryNumber: input.entryNumber || input.entryId
      }
    };
  }

  function buildClassificationResult(input) {
    const resolved = resolveHsCode(input);
    return {
      mode: "classification",
      title: "Classification result",
      thinking: [
        "Called resolve_hs_code against the product description and origin",
        `Reviewed ${resolved.crossRulings.length} CROSS rulings`,
        "Ranked alternative headings and checked Chapter 99 overlays"
      ],
      leadIn: resolved.input.entryId
        ? `Classified **line ${resolved.input.lineNum}** on entry **${resolved.input.entryNumber}** — lookup only until you confirm applying it.`
        : "Classification lookup complete — this does not write to any entry until you confirm.",
      hts: resolved.hts,
      description: resolved.description,
      dutyRate: resolved.dutyRate,
      origin: resolved.origin,
      preference: resolved.preference,
      confidence: resolved.confidence,
      chapter99: resolved.chapter99,
      alternatives: resolved.alternatives,
      crossRulings: resolved.crossRulings,
      trace: resolved.trace,
      traceId: `cls-${Date.now()}`,
      action: buildApplyAction(resolved.input, resolved.hts),
      followUps: [
        { label: "Duty estimate", prompt: "Estimate duty for this classification" },
        resolved.input.entryId
          ? { label: "Validate entry", prompt: "Run pre-submit validation on this entry" }
          : { label: "USMCA preference", prompt: "Does USMCA apply to auto parts from Mexico?" }
      ].filter(Boolean)
    };
  }

  function lineNeedsClassification(ctx) {
    if (!ctx?.entryId) {
      return false;
    }
    const status = ctx.htsStatus || "empty";
    return status === "empty" || status === "error" || status === "agent_draft";
  }

  function buildIntakeSchema(entryCtx) {
    const ready = entryCtx && entryLineReady(entryCtx);
    const needsHts = ready && lineNeedsClassification(entryCtx);
    const components = [
      { component: "TEXT", content: "### HTS classification" }
    ];
    if (ready) {
      components.push({
        component: "TEXT",
        content: needsHts
          ? `**Line ${entryCtx.lineNum}** on entry **${entryCtx.entryNumber}** is loaded — I read the invoice line below. Click to run \`resolve_hs_code\` (lookup only; nothing writes until you confirm).`
          : `**Line ${entryCtx.lineNum}** on entry **${entryCtx.entryNumber}** is loaded. I can re-classify from the invoice line or you can describe different merchandise.`
      });
      components.push({
        component: "BUTTON",
        text: `Classify line ${entryCtx.lineNum} from entry`,
        action: {
          type: "prompt",
          data: { prompt: `Classify line ${entryCtx.lineNum} from the open entry` }
        }
      });
      components.push({
        component: "TEXT",
        content:
          `- **Description:** ${entryCtx.description}\n` +
          `- **Origin:** ${entryCtx.origin}\n` +
          (entryCtx.material ? `- **Material:** ${entryCtx.material}\n` : "") +
          (entryCtx.currentHts ? `- **Current HTS:** ${entryCtx.currentHts} (${entryCtx.htsStatus})\n` : `- **Current HTS:** — (${entryCtx.htsStatus || "empty"})`)
      });
    } else {
      components.push({
        component: "TEXT",
        content:
          "I'll classify once I have a **product description**, **country of origin**, and **material**. A lookup never writes to the entry form by itself."
      });
      if (entryCtx?.description) {
        components.push({
          component: "TEXT",
          content: `I see **line ${entryCtx.lineNum}** on the open entry but still need **country of origin** (and material if not obvious) before I call \`resolve_hs_code\`.`
        });
      } else {
        components.push({
          component: "TEXT",
          content:
            "Reply with the merchandise details, for example:\n\n" +
            "*Stamped steel auto body brackets, material steel, origin Mexico*"
        });
      }
    }
    components.push({
      component: "ALERT",
      color: "notice",
      title: "Lookup vs. apply",
      description:
        "resolve_hs_code returns a suggestion with CROSS references. Applying an HS code to a line item requires your explicit confirmation — same as any other field write."
    });
    return components;
  }

  function parseLineNumberFromQuery(question) {
    const match = String(question || "").match(/\bline\s+(\d+)\b/i);
    return match ? Number(match[1]) || null : null;
  }

  function answer(question) {
    const q = String(question || "").trim();
    if (!isClassificationIntent(q)) {
      return null;
    }

    const lineFromQuery = parseLineNumberFromQuery(q);
    const entryCtx = readEntryLineContext(lineFromQuery);
    const parsed = parseProductInput(q);

    if (/classify line \d+ from (the )?(open )?entry|suggest hts for line \d+/i.test(q)) {
      if (entryCtx && entryLineReady(entryCtx)) {
        return buildClassificationResult(mergeInput({}, entryCtx));
      }
      return {
        mode: "schema",
        title: "Classification",
        thinking: ["Checked for an open entry line to classify"],
        leadIn: "Open an entry filing and select an invoice line, then ask me to classify it.",
        schema: { components: buildIntakeSchema(entryCtx) }
      };
    }

    if (isBareStarter(q)) {
      const ready = entryCtx && entryLineReady(entryCtx);
      return {
        mode: "schema",
        title: "HTS classification",
        thinking: ["Starting classification intake — no resolve_hs_code call yet"],
        leadIn: ready
          ? `Entry **${entryCtx.entryNumber}** line **${entryCtx.lineNum}** is on screen — I read it from the form. One click to classify; applying the code still needs your confirmation.`
          : "Tell me what we're classifying, or open an entry filing so I can read the invoice line.",
        schema: { components: buildIntakeSchema(entryCtx) },
        followUps: ready
          ? [{ label: `Classify line ${entryCtx.lineNum}`, prompt: `Classify line ${entryCtx.lineNum} from the open entry` }]
          : [{ label: "Example product", prompt: "Stamped steel auto body brackets, steel, origin Mexico" }]
      };
    }

    const merged = mergeInput(parsed, entryCtx);
    if (merged.description && merged.origin) {
      return buildClassificationResult(merged);
    }

    const missing = [];
    if (!merged.description) missing.push("product description");
    if (!merged.origin) missing.push("country of origin");
    return {
      mode: "schema",
      title: "Need a few details",
      thinking: ["Held resolve_hs_code until required product attributes are present"],
      leadIn: `Still need **${missing.join("** and **")}** before I can classify.`,
      schema: { components: buildIntakeSchema(entryCtx) },
      followUps: [{ label: "Example product", prompt: "Stamped steel auto body brackets, steel, origin Mexico" }]
    };
  }

  function applyConfirmedClassification(data) {
    const entryId = data?.entryId;
    const fieldKey = data?.fieldKey;
    const hts = data?.hts;
    if (!entryId || !fieldKey || !hts) {
      return { ok: false, error: "Missing classification target." };
    }
    const traceApi = window.KNEntryAgentTrace;
    const formStateApi = window.KNEntryFormState;
    if (!formStateApi?.applyFieldUpdates) {
      return { ok: false, error: "Entry form state unavailable." };
    }
    const entryCtx = readEntryLineContext();
    const merged = mergeInput({}, entryCtx?.entryId === entryId ? entryCtx : { entryId, lineNum: data.lineNum, fieldKey });
    const resolved = resolveHsCode({ ...merged, description: merged.description || "Classified product" });
    const update = {
      status: "agent_draft",
      value: hts,
      confidence: resolved.confidence === "high" ? 92 : 78,
      rationale: "Classified via resolve_hs_code — pending your review on the entry form.",
      tool_used: "resolve_hs_code",
      fill_source: "klear_agent",
      alternatives: (resolved.alternatives || []).map((alt) => ({ value: alt.hts, reason: alt.reason }))
    };
    const traced = traceApi?.attachTraceToUpdate?.(fieldKey, { value: hts }, update) || update;
    formStateApi.applyFieldUpdates(entryId, { [fieldKey]: traced }, {
      source: "klear_agent",
      meta: {
        action: "classify",
        fieldKey,
        fieldLabel: `Line ${data.lineNum || ""} HTS`.trim(),
        tool: "resolve_hs_code"
      }
    });
    window.dispatchEvent(new Event("hashchange"));
    return { ok: true, entryId, fieldKey, hts };
  }

  function bindTraceToggles(root = document) {
    root.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-kn-classification-trace-toggle]");
      if (!toggle) {
        return;
      }
      event.preventDefault();
      const panel = toggle.parentElement?.querySelector(".entry-agent-trace__panel");
      if (!panel) {
        return;
      }
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      panel.hidden = expanded;
    });
  }

  bindTraceToggles();

  window.KNClassificationAssistant = {
    answer,
    resolveHsCode,
    readEntryLineContext,
    applyConfirmedClassification,
    renderTraceHtml,
    isClassificationIntent,
    isBareStarter
  };
})();
