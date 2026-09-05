/**
 * Entry filing Status Detail — ACE/CBP message list, summaries, and
 * deterministic error lookup for Klear Agent resolve proposals.
 */
(() => {
  const MESSAGE_TYPES = Object.freeze({
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
    SUCCESS: "success"
  });

  const ERROR_FIXES = Object.freeze({
    398: {
      fieldKeys: (fields) => {
        const keys = [];
        Object.keys(fields).forEach((key) => {
          if (key.endsWith(":coo") && fields[key]?.value?.toUpperCase?.() === "BE") {
            const htsKey = key.replace(":coo", ":hts");
            if (fields[htsKey]?.value === "6204.62.4020") {
              keys.push(key);
            }
          }
        });
        return keys;
      },
      propose: (fieldKey) => ({
        fieldKey,
        value: "VN",
        rationale: "Certificate of origin shows Vietnam — aligns HTS 6204.62.4020 with valid COO pairing per CATAIR Reject 398 guidance."
      })
    },
    601: {
      fieldKeys: () => ["parties:ior:name"],
      propose: (fieldKey, fields, row) => ({
        fieldKey,
        value: row?.companyName || fields["parties:buyer:name"]?.value || "",
        rationale: "Importer of Record name copied from buyer / entry header — required before ACE resubmission."
      })
    },
    884: {
      fieldKeys: () => ["duties:totalDuty"],
      propose: () => null
    },
    PRE: {
      fieldKeys: (fields) => Object.keys(fields).filter((k) => fields[k]?.status === "agent_draft" && k.startsWith("txn:")),
      propose: (fieldKey, fields) => ({
        fieldKey,
        value: fields[fieldKey]?.value || "",
        rationale: "Agent proposal accepted for pre-submission review item."
      })
    }
  });

  function formatTimestamp(date = new Date()) {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function makeMessage(partial) {
    const type = partial.type || MESSAGE_TYPES.INFO;
    return {
      id: partial.id || `sm-${type}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: partial.timestamp || new Date().toISOString(),
      description: partial.description || "",
      rawCode: partial.rawCode || "",
      fieldKey: partial.fieldKey || "",
      findingId: partial.findingId || "",
      resolvable: partial.resolvable !== false && type === MESSAGE_TYPES.ERROR && !partial.screeningPassthrough,
      screeningPassthrough: Boolean(partial.screeningPassthrough),
      source: partial.source || "cbp"
    };
  }

  function rowBaselineMessages(row = {}) {
    const messages = [];
    const now = Date.now();
    if (row.id === "entry-3") {
      messages.push(makeMessage({
        id: "status-filed",
        type: MESSAGE_TYPES.SUCCESS,
        timestamp: new Date(now - 86400000 * 2).toISOString(),
        description: "Entry summary accepted by CBP — cargo release authorized.",
        rawCode: "ACE-0000",
        source: "ace"
      }));
      return messages;
    }
    if (row.id === "entry-2") {
      messages.push(makeMessage({
        id: "status-bis-hold",
        type: MESSAGE_TYPES.ERROR,
        timestamp: new Date(now - 3600000 * 4).toISOString(),
        description: "BIS Entity List screening returned a potential match — entry held pending compliance review.",
        rawCode: "SCR-BIS-88421",
        fieldKey: "compliance:ofac",
        resolvable: false,
        screeningPassthrough: true,
        source: "screening"
      }));
    }
    messages.push(makeMessage({
      id: "status-ace-received",
      type: MESSAGE_TYPES.INFO,
      timestamp: new Date(now - 3600000 * 12).toISOString(),
      description: "Entry summary received by ACE — awaiting validation and transmission.",
      rawCode: "ACE-1001",
      source: "ace"
    }));
    return messages;
  }

  function findingsToMessages(findings = []) {
    return findings
      .filter((f) => !f.suppressed && f.severity === "critical")
      .map((f, i) => makeMessage({
        id: `status-finding-${f.id}`,
        type: MESSAGE_TYPES.ERROR,
        timestamp: new Date(Date.now() - (i + 1) * 600000).toISOString(),
        description: f.description,
        rawCode: f.citation?.code ? `ACE-${f.citation.code}` : "ACE-VALIDATION",
        fieldKey: f.fieldKey || "",
        findingId: f.id,
        resolvable: !f.screeningPassthrough,
        screeningPassthrough: Boolean(f.screeningPassthrough),
        source: f.screeningPassthrough ? "screening" : "cbp"
      }));
  }

  function warningFindingsToMessages(findings = []) {
    return findings
      .filter((f) => !f.suppressed && f.severity === "warning")
      .map((f, i) => makeMessage({
        id: `status-warn-${f.id}`,
        type: MESSAGE_TYPES.WARNING,
        timestamp: new Date(Date.now() - (i + 4) * 600000).toISOString(),
        description: f.description,
        rawCode: f.citation?.code ? `ACE-W${f.citation.code}` : "ACE-WARN",
        fieldKey: f.fieldKey || "",
        findingId: f.id,
        resolvable: false,
        source: "cbp"
      }));
  }

  function buildStatusMessages(ctx = {}) {
    const { row = {}, findings = [], extra = [] } = ctx;
    const baseline = rowBaselineMessages(row);
    const errors = findingsToMessages(findings);
    const warnings = warningFindingsToMessages(findings);
    const all = [...baseline, ...errors, ...warnings, ...extra];
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return all;
  }

  function summarizeMessages(messages = []) {
    const errors = messages.filter((m) => m.type === MESSAGE_TYPES.ERROR).length;
    const warnings = messages.filter((m) => m.type === MESSAGE_TYPES.WARNING).length;
    const infos = messages.filter((m) => m.type === MESSAGE_TYPES.INFO).length;
    const successes = messages.filter((m) => m.type === MESSAGE_TYPES.SUCCESS).length;
    const latest = messages[0]?.timestamp || null;
    return { errors, warnings, infos, successes, total: messages.length, latest };
  }

  function summaryLabel(summary = {}) {
    const parts = [];
    if (summary.errors) {
      parts.push(`${summary.errors} ${summary.errors === 1 ? "error" : "errors"}`);
    }
    if (summary.warnings) {
      parts.push(`${summary.warnings} ${summary.warnings === 1 ? "warning" : "warnings"}`);
    }
    if (!parts.length) {
      parts.push("No errors");
    }
    if (summary.latest) {
      parts.push(`Updated ${formatTimestamp(summary.latest)}`);
    }
    return parts.join(" • ");
  }

  function resolvePrompt(message = {}) {
    const code = message.rawCode || "unknown";
    return `Resolve status error ${code}: ${message.description}`;
  }

  function parseResolveQuery(query = "") {
    const match = String(query).match(/^Resolve status error\s+([^\s:]+(?:-[^\s:]+)*)\s*:\s*(.+)$/i);
    if (!match) {
      return null;
    }
    return { rawCode: match[1].trim(), description: match[2].trim() };
  }

  function lookupFix(rawCode = "", fieldKey = "", fields = {}, row = {}) {
    if (/SCR|BIS|OFAC/i.test(rawCode)) {
      return null;
    }
    const code = String(rawCode).replace(/^ACE-W?/i, "").replace(/^ACE-/i, "");
    const fixDef = ERROR_FIXES[code];
    if (!fixDef) {
      return null;
    }
    const keys = fixDef.fieldKeys(fields);
    const targetKey = keys.includes(fieldKey) ? fieldKey : keys[0];
    if (!targetKey) {
      return null;
    }
    const proposal = fixDef.propose(targetKey, fields, row);
    if (!proposal) {
      return null;
    }
    return { ...proposal, rawCode, code };
  }

  function typeLabel(type) {
    const map = {
      error: "Error",
      warning: "Warning",
      info: "Information",
      success: "Success"
    };
    return map[type] || type;
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNEntryStatusDetail = Object.freeze({
    MESSAGE_TYPES,
    buildStatusMessages,
    summarizeMessages,
    summaryLabel,
    resolvePrompt,
    parseResolveQuery,
    lookupFix,
    typeLabel,
    formatTimestamp
  });
})();
