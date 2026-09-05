(() => {
  "use strict";

  /**
   * Silent outlier checks for Klear Agent proactive flags.
   * Advisory only — never mutates field state (agent_draft human-in-the-loop).
   */

  const DEFAULT_PROFILE = Object.freeze({
    label: "this importer",
    dutyRatePct: { min: 0, max: 5, typical: 2.5 },
    lineValueUsd: { min: 2500, max: 45000, typical: 18000 },
    bondLimitUsd: 500000,
    bondUsedUsd: 380000
  });

  const IMPORTER_PROFILES = Object.freeze({
    "US COMPANY 3": {
      label: "US COMPANY 3",
      dutyRatePct: { min: 0, max: 5, typical: 2.5 },
      lineValueUsd: { min: 3000, max: 12000, typical: 8000 },
      bondLimitUsd: 500000,
      bondUsedUsd: 448000
    },
    "US COMPANY 1": {
      label: "US COMPANY 1",
      dutyRatePct: { min: 0, max: 3, typical: 0 },
      lineValueUsd: { min: 5000, max: 35000, typical: 16000 },
      bondLimitUsd: 750000,
      bondUsedUsd: 512000
    },
    "ILLUMINATE USA": {
      label: "ILLUMINATE USA LLC",
      dutyRatePct: { min: 0, max: 4, typical: 1.5 },
      lineValueUsd: { min: 8000, max: 95000, typical: 42000 },
      bondLimitUsd: 250000,
      bondUsedUsd: 228500
    },
    "GLOBAL-PAK": {
      label: "GLOBAL-PAK",
      dutyRatePct: { min: 0, max: 6, typical: 3.0 },
      lineValueUsd: { min: 4000, max: 85000, typical: 32000 },
      bondLimitUsd: 1000000,
      bondUsedUsd: 612000
    }
  });

  function normalizeCompany(name = "") {
    return String(name || "").trim().toUpperCase();
  }

  function resolveProfile(row = {}, fields = {}) {
    const company = row.companyName || fields["parties:ior:name"]?.value || "";
    const normalized = normalizeCompany(company);
    const match = Object.keys(IMPORTER_PROFILES).find((key) => normalized.includes(normalizeCompany(key)));
    if (match) {
      return { ...IMPORTER_PROFILES[match] };
    }
    return { ...DEFAULT_PROFILE, label: company || DEFAULT_PROFILE.label };
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      Number(n) || 0
    );
  }

  function pct(n) {
    return `${Math.round((Number(n) || 0) * 1000) / 10}%`;
  }

  function run(ctx = {}) {
    const {
      fields = {},
      row = {},
      parseMoney = (v) => Number(String(v || "").replace(/[^0-9.-]/g, "")) || 0,
      invoiceLinePrefixes = () => [],
      dutyRateForHts = () => 0,
      fieldLabel = (k) => k,
      trigger = "silent"
    } = ctx;

    const flags = [];
    const profile = resolveProfile(row, fields);
    const prefixes = invoiceLinePrefixes(fields);

    const estimatedTotal = parseMoney(fields["duties:totalEstimatedDuty"]?.value);
    const bondUsed = profile.bondUsedUsd;
    const bondLimit = profile.bondLimitUsd;
    const bondAfterEntry = bondUsed + estimatedTotal;
    const bondPct = bondLimit > 0 ? bondUsed / bondLimit : 0;
    const projectedPct = bondLimit > 0 ? bondAfterEntry / bondLimit : 0;

    if (bondPct >= 0.85 || projectedPct >= 0.9) {
      flags.push({
        id: `bond-limit-${row.id || "entry"}`,
        kind: "bond-limit",
        tone: projectedPct >= 0.95 ? "negative" : "notice",
        title: "Bond capacity nearing limit",
        description: `Continuous bond for ${profile.label} is at ${pct(bondPct)} capacity (${money(bondUsed)} of ${money(bondLimit)}). This entry adds ~${money(estimatedTotal)} in estimated duties — projected utilization ${pct(projectedPct)}.`,
        fieldKey: "txn:bondType",
        fieldLabel: fieldLabel("txn:bondType"),
        trigger
      });
    }

    prefixes.forEach((prefix) => {
      const htsKey = `${prefix}:hts`;
      const valueKey = `${prefix}:value`;
      const hts = String(fields[htsKey]?.value || "").trim();
      const value = parseMoney(fields[valueKey]?.value);
      if (!hts && !value) {
        return;
      }

      const rate = Number(dutyRateForHts(hts)) || 0;
      if (hts && rate > profile.dutyRatePct.max + 0.01) {
        flags.push({
          id: `duty-outlier-${prefix}-${hts.replace(/\W/g, "")}`,
          kind: "duty-outlier",
          tone: "notice",
          title: "Duty rate outside importer history",
          description: `${fieldLabel(htsKey)} — HTS ${hts} carries ${rate}% duty. Typical range for ${profile.label} is ${profile.dutyRatePct.min}–${profile.dutyRatePct.max}% (median ~${profile.dutyRatePct.typical}%).`,
          fieldKey: htsKey,
          fieldLabel: fieldLabel(htsKey),
          trigger
        });
      }

      const highWater = profile.lineValueUsd.max * 1.15;
      if (value > highWater) {
        flags.push({
          id: `invoice-outlier-${prefix}-${Math.round(value / 1000)}k`,
          kind: "invoice-outlier",
          tone: "notice",
          title: "Invoice value outside historical range",
          description: `${fieldLabel(valueKey)} — line value ${money(value)} exceeds this importer's typical ceiling (~${money(profile.lineValueUsd.max)}; median ~${money(profile.lineValueUsd.typical)}).`,
          fieldKey: valueKey,
          fieldLabel: fieldLabel(valueKey),
          trigger
        });
      }
    });

    return flags;
  }

  window.KNEntryOutlierChecks = {
    run,
    resolveProfile,
    IMPORTER_PROFILES
  };
})();
