/**
 * Entry filing validation — deterministic CATAIR engine, agent cross-check,
 * HTS/duty verification, citation guardrails, and OFAC/BIS passthrough.
 */
(() => {
  const SEVERITY = Object.freeze({
    CRITICAL: "critical",
    WARNING: "warning",
    INFO: "info"
  });

  const CATAIR_CITATIONS = Object.freeze({
    398: {
      code: "398",
      title: "HTS Number / Country of Origin combination invalid",
      ref: "CATAIR Ch. 3B, Reject 398"
    },
    601: {
      code: "601",
      title: "Importer of Record name required",
      ref: "CATAIR Ch. 2A, Reject 601"
    },
    712: {
      code: "712",
      title: "Merchandise Processing Fee calculation mismatch",
      ref: "CATAIR Ch. 4D, Reject 712"
    },
    884: {
      code: "884",
      title: "Estimated duty does not match HTS rate schedule",
      ref: "CATAIR Ch. 3C, Reject 884"
    }
  });

  const HTS_DUTY_RATES = Object.freeze({
    "9403.60.8081": 0.0,
    "8544.42.9090": 2.6,
    "6110.20.2079": 16.5,
    "6204.62.4020": 9.9,
    "3923.50.0000": 3.4
  });

  const SCREENING_FIELD = "compliance:ofac";

  function dutyRateForHts(hts = "") {
    const normalized = String(hts || "").trim();
    if (HTS_DUTY_RATES[normalized] != null) {
      return HTS_DUTY_RATES[normalized];
    }
    const prefix = normalized.slice(0, 4);
    if (prefix === "9403") {
      return 0.0;
    }
    if (prefix === "8544") {
      return 2.6;
    }
    return 5.0;
  }

  function isInvalidHtsCoo(hts = "", coo = "") {
    return String(hts).trim() === "6204.62.4020" && String(coo).trim().toUpperCase() === "BE";
  }

  function hasRealCitation(citation) {
    if (!citation || typeof citation !== "object") {
      return false;
    }
    const code = String(citation.code || "").trim();
    const title = String(citation.title || "").trim();
    const ref = String(citation.ref || "").trim();
    return Boolean(code && title && ref);
  }

  function isScreeningHit(value = "") {
    const text = String(value || "").toLowerCase();
    return /hit|match|hold|entity list|sdn|denied|blocked|bis-|ofac-/.test(text)
      && !/no match|cleared|screened — no match/.test(text);
  }

  function tabForFieldKey(fieldKey = "") {
    if (fieldKey.startsWith("parties:")) {
      return "parties";
    }
    if (fieldKey.startsWith("txn:") || fieldKey.startsWith("duties:") || fieldKey.startsWith("compliance:")) {
      return "transaction";
    }
    if (fieldKey.startsWith("bol:")) {
      return "bol";
    }
    if (fieldKey.startsWith("isf:")) {
      return "isf";
    }
    if (fieldKey.startsWith("container:")) {
      return "containers";
    }
    if (fieldKey.startsWith("invoice:")) {
      return "invoices";
    }
    return "transaction";
  }

  function navigateForField(fieldKey = "") {
    const tab = tabForFieldKey(fieldKey);
    const nav = { tab, fieldKey, focusSelector: `[data-entry-field="${fieldKey}"]` };
    const invoiceMatch = fieldKey.match(/^invoice:(\d+):/);
    if (invoiceMatch) {
      nav.invoiceTab = invoiceMatch[1];
    }
    return nav;
  }

  function makeFinding(partial) {
    return {
      id: partial.id || `vf-${partial.fieldKey || "global"}-${partial.severity}-${Math.random().toString(36).slice(2, 8)}`,
      severity: partial.severity || SEVERITY.WARNING,
      fieldKey: partial.fieldKey || "",
      fieldLabel: partial.fieldLabel || partial.fieldKey || "Entry",
      description: partial.description || "",
      citation: partial.citation || null,
      navigate: partial.navigate || (partial.fieldKey ? navigateForField(partial.fieldKey) : null),
      source: partial.source || "catair",
      disagreement: partial.disagreement || null,
      screeningPassthrough: Boolean(partial.screeningPassthrough),
      suppressed: Boolean(partial.suppressed),
      suppressReason: partial.suppressReason || "",
      suggestedDutyRate: partial.suggestedDutyRate ?? null,
      dutyVerified: partial.dutyVerified ?? null,
      verifiedDutyRate: partial.verifiedDutyRate ?? null
    };
  }

  function parseMoney(value = "") {
    const n = parseFloat(String(value).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function invoiceLinePrefixes(fields = {}) {
    const prefixes = new Set();
    Object.keys(fields).forEach((key) => {
      const m = key.match(/^(invoice:\d+:line:\d+):/);
      if (m) {
        prefixes.add(m[1]);
      }
    });
    return [...prefixes].sort();
  }

  function runCatairEngine(ctx) {
    const { fields = {}, fieldLabel = (k) => k } = ctx;
    const findings = [];

    invoiceLinePrefixes(fields).forEach((prefix) => {
      const htsKey = `${prefix}:hts`;
      const cooKey = `${prefix}:coo`;
      const hts = fields[htsKey]?.value || "";
      const coo = fields[cooKey]?.value || "";
      if (hts && coo && isInvalidHtsCoo(hts, coo)) {
        [htsKey, cooKey].forEach((fieldKey) => {
          findings.push(makeFinding({
            id: `catair-398-${fieldKey}`,
            severity: SEVERITY.CRITICAL,
            fieldKey,
            fieldLabel: fieldLabel(fieldKey),
            description: `HTS ${hts} is not valid for country of origin ${coo}.`,
            citation: CATAIR_CITATIONS[398],
            source: "catair"
          }));
        });
      }
    });

    const iorName = fields["parties:ior:name"]?.value || "";
    if (!String(iorName).trim()) {
      findings.push(makeFinding({
        id: "catair-601-ior",
        severity: SEVERITY.CRITICAL,
        fieldKey: "parties:ior:name",
        fieldLabel: fieldLabel("parties:ior:name"),
        description: "Importer of Record name is required before filing.",
        citation: CATAIR_CITATIONS[601],
        source: "catair"
      }));
    }

    let totalEntered = 0;
    let expectedDuty = 0;
    invoiceLinePrefixes(fields).forEach((prefix) => {
      const value = parseMoney(fields[`${prefix}:value`]?.value);
      const hts = fields[`${prefix}:hts`]?.value || "";
      totalEntered += value;
      expectedDuty += value * (dutyRateForHts(hts) / 100);
    });
    expectedDuty = Math.round(expectedDuty * 100) / 100;
    const recordedDuty = parseMoney(fields["duties:totalDuty"]?.value);
    if (totalEntered > 0 && Math.abs(recordedDuty - expectedDuty) > 0.02) {
      findings.push(makeFinding({
        id: "catair-884-duty",
        severity: SEVERITY.CRITICAL,
        fieldKey: "duties:totalDuty",
        fieldLabel: fieldLabel("duties:totalDuty"),
        description: `Recorded duty ${fields["duties:totalDuty"]?.value || "—"} does not match HTS schedule (${expectedDuty.toFixed(2)} expected).`,
        citation: CATAIR_CITATIONS[884],
        source: "catair"
      }));
    }

    Object.keys(fields).forEach((fieldKey) => {
      const f = fields[fieldKey];
      if (f?.status === "agent_draft" && fieldKey.startsWith("txn:")) {
        findings.push(makeFinding({
          id: `catair-draft-${fieldKey}`,
          severity: SEVERITY.WARNING,
          fieldKey,
          fieldLabel: fieldLabel(fieldKey),
          description: "Agent proposal pending review — must be accepted or corrected before ACE submission.",
          citation: {
            code: "PRE",
            title: "Pre-submission review required",
            ref: "ACE Entry Summary Business Rules — agent draft fields"
          },
          source: "catair"
        }));
      }
    });

    return findings;
  }

  function generateAgentFindings(ctx) {
    const { fields = {}, fieldLabel = (k) => k, row = {} } = ctx;
    const findings = [];

    invoiceLinePrefixes(fields).forEach((prefix) => {
      const htsKey = `${prefix}:hts`;
      const cooKey = `${prefix}:coo`;
      const hts = fields[htsKey]?.value || "";
      const coo = fields[cooKey]?.value || "";
      if (hts && coo && isInvalidHtsCoo(hts, coo)) {
        findings.push(makeFinding({
          id: `agent-hts-ok-${htsKey}`,
          severity: SEVERITY.INFO,
          fieldKey: htsKey,
          fieldLabel: fieldLabel(htsKey),
          description: "Agent assessment: HTS and country of origin pairing appears acceptable for filing.",
          citation: null,
          source: "agent"
        }));
        findings.push(makeFinding({
          id: `agent-duty-suggest-${htsKey}`,
          severity: SEVERITY.WARNING,
          fieldKey: htsKey,
          fieldLabel: fieldLabel(htsKey),
          description: `Agent recommends duty rate 0.0% for HTS ${hts} (unverified against schedule).`,
          citation: {
            code: "AGT",
            title: "Agent HTS duty suggestion",
            ref: "Klear Agent classification assistant"
          },
          source: "agent",
          suggestedDutyRate: 0.0
        }));
      }
    });

    if (!fields["parties:consignee:name"]?.value?.trim()) {
      findings.push(makeFinding({
        id: "agent-consignee-missing",
        severity: SEVERITY.WARNING,
        fieldKey: "parties:consignee:name",
        fieldLabel: fieldLabel("parties:consignee:name"),
        description: "Consignee name is empty — verify against shipping documents.",
        citation: null,
        source: "agent"
      }));
    }

    if (row.id === "entry-1") {
      findings.push(makeFinding({
        id: "agent-voyage-note",
        severity: SEVERITY.WARNING,
        fieldKey: "bol:voyage",
        fieldLabel: fieldLabel("bol:voyage"),
        description: "Voyage number confidence is below auto-accept threshold.",
        citation: {
          code: "DOC",
          title: "Document extraction confidence",
          ref: "Commercial Invoice / BOL cross-reference"
        },
        source: "agent"
      }));
    }

    return findings;
  }

  function screeningFindings(ctx) {
    const { fields = {}, fieldLabel = (k) => k } = ctx;
    const value = fields[SCREENING_FIELD]?.value || "";
    if (!isScreeningHit(value)) {
      return [];
    }
    return [makeFinding({
      id: "screening-ofac-bis",
      severity: SEVERITY.CRITICAL,
      fieldKey: SCREENING_FIELD,
      fieldLabel: fieldLabel(SCREENING_FIELD),
      description: value,
      citation: {
        code: "SCR",
        title: "OFAC/BIS/DPL screening result",
        ref: "Compliance screening system — not subject to agent interpretation"
      },
      source: "screening",
      screeningPassthrough: true
    })];
  }

  function verifyHtsDutyFinding(finding, ctx) {
    if (finding.source !== "agent" || finding.suggestedDutyRate == null) {
      return finding;
    }
    const { fields = {} } = ctx;
    const hts = fields[finding.fieldKey]?.value || "";
    const scheduled = dutyRateForHts(hts);
    if (Math.abs(finding.suggestedDutyRate - scheduled) > 0.01) {
      return {
        ...finding,
        description: `${finding.description} Schedule rate is ${scheduled.toFixed(1)}% — agent recommendation withheld until verified.`,
        severity: SEVERITY.WARNING,
        verifiedDutyRate: scheduled,
        dutyVerified: false
      };
    }
    return { ...finding, dutyVerified: true, verifiedDutyRate: scheduled };
  }

  function crossCheckAgentFinding(agentFinding, catairFindings) {
    if (agentFinding.source !== "agent" || !agentFinding.fieldKey) {
      return [];
    }
    const relatedCatair = catairFindings.filter((f) =>
      f.fieldKey === agentFinding.fieldKey
      || (agentFinding.fieldKey.endsWith(":hts") && f.fieldKey.endsWith(":coo"))
      || (agentFinding.fieldKey.endsWith(":coo") && f.fieldKey.endsWith(":hts"))
    );
    const disagreements = [];
    relatedCatair.forEach((catairFinding) => {
      const agentSaysOk = /acceptable|appears acceptable|looks acceptable/i.test(agentFinding.description);
      const catairCritical = catairFinding.severity === SEVERITY.CRITICAL;
      if (agentSaysOk && catairCritical) {
        disagreements.push(makeFinding({
          id: `disagree-${agentFinding.id}-${catairFinding.id}`,
          severity: SEVERITY.CRITICAL,
          fieldKey: agentFinding.fieldKey,
          fieldLabel: agentFinding.fieldLabel,
          description: "Agent assessment disagrees with the deterministic CATAIR engine — CATAIR finding takes precedence.",
          citation: catairFinding.citation,
          source: "guardrail",
          disagreement: {
            catairSays: catairFinding.description,
            agentSays: agentFinding.description,
            catairCode: catairFinding.citation?.code || ""
          }
        }));
      }
    });
    return disagreements;
  }

  function applyGuardrails(rawFindings, catairFindings, ctx) {
    const visible = [];
    const suppressed = [];
    const agentRaw = rawFindings.filter((f) => f.source === "agent");

    agentRaw.forEach((agentFinding) => {
      crossCheckAgentFinding(agentFinding, catairFindings).forEach((disagreement) => {
        if (hasRealCitation(disagreement.citation) && !visible.some((v) => v.id === disagreement.id)) {
          visible.push(disagreement);
        }
      });
    });

    rawFindings.forEach((finding) => {
      if (finding.screeningPassthrough) {
        visible.push(finding);
        return;
      }

      let processed = verifyHtsDutyFinding(finding, ctx);

      if (!hasRealCitation(processed.citation)) {
        suppressed.push({
          ...processed,
          suppressed: true,
          suppressReason: "No real citation — finding suppressed per guardrail policy."
        });
        return;
      }

      if (processed.source === "agent" && processed.suggestedDutyRate != null && processed.dutyVerified === false) {
        suppressed.push({
          ...processed,
          suppressed: true,
          suppressReason: "HTS duty recommendation failed schedule verification — withheld from display."
        });
        return;
      }

      visible.push(processed);
    });

    catairFindings.forEach((catairFinding) => {
      if (!hasRealCitation(catairFinding.citation)) {
        return;
      }
      if (!visible.some((v) => v.id === catairFinding.id)) {
        visible.push(catairFinding);
      }
    });

    return { findings: visible, suppressed };
  }

  function runValidation(ctx, options = {}) {
    const scope = options.scope || "full";
    const targetField = options.fieldKey || "";

    let catairFindings = runCatairEngine(ctx);
    let agentFindings = generateAgentFindings(ctx);
    let screening = screeningFindings(ctx);

    if (scope === "targeted" && targetField) {
      const related = (f) =>
        f.fieldKey === targetField
        || (targetField.endsWith(":hts") && f.fieldKey.endsWith(":coo"))
        || (targetField.endsWith(":coo") && f.fieldKey.endsWith(":hts"));
      catairFindings = catairFindings.filter(related);
      agentFindings = agentFindings.filter(related);
      if (targetField === SCREENING_FIELD) {
        screening = screeningFindings(ctx);
      } else {
        screening = [];
      }
    }

    const raw = [...screening, ...catairFindings, ...agentFindings];
    const { findings, suppressed } = applyGuardrails(raw, catairFindings, ctx);

    const severityRank = { critical: 0, warning: 1, info: 2 };
    findings.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));

    return {
      scope,
      fieldKey: targetField || null,
      findings,
      suppressed,
      summary: summarizeFindings(findings)
    };
  }

  function runFullEntryValidation(ctx) {
    return runValidation(ctx, { scope: "full" });
  }

  function runTargetedValidation(ctx, fieldKey) {
    return runValidation(ctx, { scope: "targeted", fieldKey });
  }

  function summarizeFindings(findings = []) {
    const visible = findings.filter((f) => !f.suppressed);
    const critical = visible.filter((f) => f.severity === SEVERITY.CRITICAL).length;
    const warning = visible.filter((f) => f.severity === SEVERITY.WARNING).length;
    const info = visible.filter((f) => f.severity === SEVERITY.INFO).length;
    const total = visible.length;
    return { total, critical, warning, info };
  }

  function summaryLabel(summary = {}) {
    const parts = [];
    if (summary.total) {
      parts.push(`${summary.total} ${summary.total === 1 ? "issue" : "issues"}`);
    }
    if (summary.critical) {
      parts.push(`${summary.critical} critical`);
    }
    if (summary.warning) {
      parts.push(`${summary.warning} ${summary.warning === 1 ? "warning" : "warnings"}`);
    }
    return parts.length ? parts.join(" • ") : "No issues";
  }

  function findingsForTab(findings = [], tabId) {
    return findings.filter((f) => !f.suppressed && tabForFieldKey(f.fieldKey) === tabId);
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNEntryValidation = Object.freeze({
    SEVERITY,
    CATAIR_CITATIONS,
    SCREENING_FIELD,
    dutyRateForHts,
    isInvalidHtsCoo,
    hasRealCitation,
    isScreeningHit,
    tabForFieldKey,
    navigateForField,
    runFullEntryValidation,
    runTargetedValidation,
    summarizeFindings,
    summaryLabel,
    findingsForTab
  });
})();
