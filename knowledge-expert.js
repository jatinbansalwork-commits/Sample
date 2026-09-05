(() => {
  "use strict";

  const EXPERT_PLACEHOLDER =
    "Ask about HTS, tariffs, FTA, CBP regulations, or CATAIR codes…";

  const PROMPTS = [
    {
      label: "HTS classification",
      prompt: "Classify this product",
      icon: "ask"
    },
    {
      label: "CATAIR code 398",
      prompt: "CATAIR code 398",
      icon: "flag",
      new: true
    },
    {
      label: "USMCA preference",
      prompt: "Does USMCA apply to auto parts from Mexico?",
      icon: "ask"
    },
    {
      label: "Section 301 tariffs",
      prompt: "How do Section 301 tariffs apply to goods from China?",
      icon: "ask"
    },
    {
      label: "CBP filing rules",
      prompt: "What CBP regulations govern entry summary filing deadlines?",
      icon: "ask"
    }
  ];

  function textAnswer({ title, thinking, text, followUps }) {
    return {
      mode: "text",
      title: title || "",
      thinking: Array.isArray(thinking) ? thinking.filter(Boolean) : [],
      text: text || "",
      followUps: Array.isArray(followUps) ? followUps.filter(Boolean) : []
    };
  }

  function schemaAnswer({ title, thinking, leadIn, schema, followUps }) {
    return {
      mode: "schema",
      title: title || "",
      thinking: Array.isArray(thinking) ? thinking.filter(Boolean) : [],
      leadIn: leadIn || "",
      text: leadIn || "",
      schema: schema || { components: [] },
      followUps: Array.isArray(followUps) ? followUps.filter(Boolean) : []
    };
  }

  function matchesExpert(question) {
    return /\b(hts|harmonized|hs code|tariff|duty|duties|fta|usmca|nafta|preferential|origin|coo|cbp|regulation|19 cfr|catair|7501|ace|section 301|section 232|mpf|hmf|classification|classif)\b/i.test(
      String(question || "")
    );
  }

  function catair398Citation() {
    return (
      window.KNEntryValidation?.CATAIR_CITATIONS?.[398] || {
        code: "398",
        title: "HTS Number / Country of Origin combination invalid",
        ref: "CATAIR Ch. 3B, Reject 398",
        definition:
          "The HTS number and country of origin code combination for this entry line is invalid under the HTS schedule country notes, or the country of origin is missing or not permitted for the reported HTS number."
      }
    );
  }

  function isCatair398Query(question) {
    const q = String(question || "").trim();
    if (/^catair code 398$/i.test(q)) {
      return true;
    }
    if (/\bcatair\b/i.test(q) && /\b398\b/.test(q)) {
      return true;
    }
    if (/\berror code\b/i.test(q) && /\b398\b/.test(q)) {
      return true;
    }
    if (/\breject\s*398\b/i.test(q)) {
      return true;
    }
    if (/what is catair/i.test(q) && /\b398\b/.test(q)) {
      return true;
    }
    return false;
  }

  function fieldsHaveCatair398(fields, row, validation) {
    if (!fields || !Object.keys(fields).length) {
      return false;
    }
    const citedError = Object.values(fields).some(
      (field) =>
        field?.status === "error" &&
        (field?.citations || []).some((citation) => String(citation?.code) === "398")
    );
    if (citedError) {
      return true;
    }
    if (validation?.run) {
      const findings = validation.run({ fields, rowId: row?.id, row })?.findings || [];
      return findings.some((finding) => String(finding?.citation?.code) === "398");
    }
    return false;
  }

  function findEntryWithCatair398() {
    const entries = window.KNUsEntry?.list?.() || [];
    const formState = window.KNEntryFormState;
    const validation = window.KNEntryValidation;

    const hashMatch = String(location.hash || "").match(/#transaction-us-entry\/filing\/([^/?#]+)/);
    if (hashMatch) {
      const entryId = decodeURIComponent(hashMatch[1]);
      const row = entries.find((item) => item.id === entryId);
      const fields = formState?.getFields?.(entryId);
      if (row && fieldsHaveCatair398(fields, row, validation)) {
        return bridgeEntry(row);
      }
    }

    for (const row of entries) {
      const fields = formState?.getFields?.(row.id);
      if (!fields || !Object.keys(fields).length) {
        continue;
      }
      if (fieldsHaveCatair398(fields, row, validation)) {
        return bridgeEntry(row);
      }
    }

    return null;
  }

  function bridgeEntry(row) {
    return {
      entryId: row.id,
      entryNumber: row.entryNumber,
      transactionId: row.transactionId,
      href: `#transaction-us-entry/filing/${encodeURIComponent(row.id)}?queue=rejected&focus=catair398`
    };
  }

  function answerCatair(question) {
    if (!isCatair398Query(question)) {
      return null;
    }
    const citation = catair398Citation();
    const affectedEntry = findEntryWithCatair398();
    const components = [
      { component: "TEXT", content: "# CATAIR reject 398" },
      { component: "TEXT", content: "### CATAIR edit definition (authoritative)" },
      {
        component: "INFO_GROUP",
        items: [
          { key: { children: "Reject code" }, value: { children: `**${citation.code}**` } },
          { key: { children: "CATAIR reference" }, value: { children: citation.ref } },
          { key: { children: "Official title" }, value: { children: citation.title } },
          { key: { children: "Edit definition" }, value: { children: citation.definition } }
        ]
      },
      { component: "TEXT", content: "### In plain language" },
      {
        component: "TEXT",
        content:
          "ACE is rejecting the **HTS number / country of origin pair** on an invoice line — the COO is missing, not allowed for that tariff line, or conflicts with the HTS schedule country notes. Fix the line on the entry before resubmitting."
      },
      { component: "TEXT", content: "### What usually triggers it" },
      {
        component: "TEXT",
        content:
          "Blank COO, **US** when the goods are foreign, or a COO the HTS chapter note does not permit for the reported line (demo seed: **6204.62.4020** with **BE**)."
      }
    ];

    if (affectedEntry) {
      components.push({
        component: "ALERT",
        color: "notice",
        title: `Entry ${affectedEntry.entryNumber} is showing this error right now`,
        description: "Want me to resolve it? I'll open the validation panel — nothing changes until you edit the field and confirm."
      });
      components.push({
        component: "BUTTON",
        text: "Yes — resolve on entry form",
        action: { type: "navigate", data: { href: affectedEntry.href } }
      });
      components.push({
        component: "BUTTON",
        text: "Explain fix steps here only",
        action: {
          type: "prompt",
          data: { prompt: `Walk me through fixing CATAIR 398 on entry ${affectedEntry.entryNumber} without changing fields` }
        }
      });
    } else {
      components.push({
        component: "ALERT",
        color: "information",
        title: "Information only",
        description:
          "No entry in your queue is currently flagged with reject **398**. This path explains the code — it cannot change any field on a record."
      });
    }

    components.push({
      component: "ALERT",
      color: "notice",
      title: "Citation guardrail (§10.1)",
      description:
        "The edit definition above is quoted from **CATAIR** — not a paraphrase presented as fact. Klear Agent can suggest the correct COO from documents but cannot transmit or approve the corrected entry for you."
    });

    return schemaAnswer({
      title: "CATAIR code 398",
      thinking: [
        `Matched ACE reject 398 to ${citation.ref}`,
        "Quoted the CATAIR edit definition verbatim",
        affectedEntry
          ? `Entry ${affectedEntry.entryNumber} has reject 398 on file — offering W10 resolution bridge only`
          : "No affected entry detected — informational response only"
      ],
      leadIn: affectedEntry
        ? `**Entry #${affectedEntry.entryNumber}** is showing CATAIR reject **398** right now — want me to resolve it?`
        : "Here's **CATAIR reject 398** in plain language, with the authoritative edit definition cited above.",
      schema: { components },
      followUps: affectedEntry
        ? [
            {
              label: "Resolve on entry form",
              prompt: `Help me resolve CATAIR 398 on entry ${affectedEntry.entryNumber}`
            },
            { label: "USMCA origin rules", prompt: "Does USMCA apply to auto parts from Mexico?" }
          ]
        : [
            { label: "USMCA origin rules", prompt: "Does USMCA apply to auto parts from Mexico?" },
            { label: "HTS classification", prompt: "Classify this product" }
          ]
    });
  }

  function answerFta(question) {
    if (!/\b(usmca|nafta|fta|preferential|free trade|origin claim|rvc|regional value)\b/i.test(question)) {
      return null;
    }
    return schemaAnswer({
      title: "USMCA preference for auto parts",
      thinking: [
        "Checked USMCA Chapter 4 origin rules for motor-vehicle parts",
        "Reviewed tariff-shift and RVC options for stamped steel brackets",
        "Flagged documentation ACE expects on the entry"
      ],
      leadIn:
        "Stamped steel auto body brackets from **Mexico** can qualify for **USMCA** preferential treatment when origin criteria and supporting docs are on file.",
      schema: {
        components: [
          {
            component: "TABLE",
            headers: ["Requirement", "Typical evidence"],
            rows: [
              [{ component: "TEXT", value: "Origin criterion" }, { component: "TEXT", value: "Tariff shift or 75% RVC (net cost)" }],
              [{ component: "TEXT", value: "Importer cert" }, { component: "TEXT", value: "USMCA certification of origin on file" }],
              [{ component: "TEXT", value: "Entry claim" }, { component: "TEXT", value: "SPI **S** + correct COO **MX** on the line" }]
            ]
          },
          {
            component: "TEXT",
            content:
              "Without documentation, file at the **Column 1** rate. ACE will not apply USMCA duty savings retroactively after liquidation."
          }
        ]
      },
      followUps: [
        { label: "Duty estimate", prompt: "Estimate duty for stamped steel auto body brackets from Mexico" },
        { label: "CATAIR 398", prompt: "CATAIR code 398" }
      ]
    });
  }

  function answerTariffs(question) {
    if (!/\b(tariff|section 301|section 232|trade measure|additional duty|china tariff)\b/i.test(question)) {
      return null;
    }
    return textAnswer({
      title: "Section 301 tariffs — China origin",
      thinking: [
        "Indexed HTS subheadings on the Section 301 Lists 1–4",
        "Checked whether the product subheading carries an additional Chapter 99 duty",
        "Separated base Column 1 rate from 301 overlay"
      ],
      text:
        "**Section 301** additional duties apply by **HTS subheading + country of origin**, not by product description alone.\n\n" +
        "For China-origin goods:\n" +
        "- Look up the **base rate** on the 8-digit HTS line.\n" +
        "- Check **Chapter 99** overlay codes (Lists 1–4) for the subheading — many carry **7.5%–25%** additional duty depending on the list and exclusion status.\n" +
        "- **MPF/HMF** still apply on entered value **including** 301 duties.\n\n" +
        "Exclusions and retroactive refunds require a formal request — Klear Agent can flag likely overlays but cannot file exclusions for you.",
      followUps: [
        { label: "Duty estimate", prompt: "Estimate duty for this classification" },
        { label: "HTS classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" }
      ]
    });
  }

  function answerCbpRegs(question) {
    if (!/\b(cbp regulation|19 cfr|customs regulation|filing deadline|entry summary deadline|liquidation|protest)\b/i.test(question)) {
      return null;
    }
    return textAnswer({
      title: "CBP entry summary filing deadlines",
      thinking: [
        "Cross-referenced 19 CFR §142 entry summary timing",
        "Checked ACE entry-type variations (consumption vs warehouse)",
        "Noted protest window tied to liquidation"
      ],
      text:
        "For standard **consumption entries**, CBP expects the entry summary within **10 working days** of entry (19 CFR §142.12), unless an extension is granted.\n\n" +
        "Key broker checkpoints:\n" +
        "- **ISF** must be on file **24 hours before lading** for ocean.\n" +
        "- **Entry summary** due within the 10-day window after release conditions are met.\n" +
        "- **Protest** generally within **180 days** of liquidation (19 CFR Part 174) — HTS reclassification protests follow the same window.\n\n" +
        "Missed deadlines can move the entry to **delinquent** status in ACE and trigger cargo holds.",
      followUps: [
        { label: "ACE status", prompt: "What is the ACE status for today's entries?" },
        { label: "CATAIR codes", prompt: "CATAIR code 398" }
      ]
    });
  }

  function answerHts(question) {
    return window.KNClassificationAssistant?.answer?.(question) || null;
  }

  function answerDuty(question) {
    if (!/\b(duty|duties|landed cost|mpf|hmf)\b/i.test(question)) {
      return null;
    }
    return {
      mode: "duty",
      title: "Duty estimate",
      thinking: [
        "Applied the classified heading and rate",
        "Checked MPF and HMF on the entered value",
        "Left preference unverified until RVC support is on file"
      ],
      leadIn: "Estimate only — not an ACE liquidation. Confirm entered value and any USMCA claim before you file.",
      currency: "USD",
      total: 1840,
      lines: [
        { label: "Merchandise duty (2.5%)", amount: 1250 },
        { label: "MPF", amount: 485 },
        { label: "HMF", amount: 105 }
      ],
      followUps: [
        { label: "Classification", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" },
        { label: "Section 301 tariffs", prompt: "How do Section 301 tariffs apply to goods from China?" }
      ]
    };
  }

  function answer(question) {
    const q = String(question || "").trim();
    if (!q) {
      return null;
    }
    return (
      answerCatair(q) ||
      answerFta(q) ||
      answerTariffs(q) ||
      answerCbpRegs(q) ||
      answerHts(q) ||
      answerDuty(q) ||
      null
    );
  }

  function getPrompts(limit = 3) {
    return PROMPTS.slice(0, limit);
  }

  window.KNKnowledgeExpert = {
    answer,
    matchesExpert,
    getPrompts,
    findEntryWithCatair398,
    catair398Citation,
    isCatair398Query,
    placeholder: EXPERT_PLACEHOLDER,
    PROMPTS
  };
})();
