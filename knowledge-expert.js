(() => {
  "use strict";

  const EXPERT_PLACEHOLDER =
    "Ask about HTS, tariffs, FTA, CBP regulations, or CATAIR codes…";

  const PROMPTS = [
    {
      label: "HTS classification",
      prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?",
      icon: "ask"
    },
    {
      label: "CATAIR code 398",
      prompt: "What does CATAIR code 398 mean and how do I fix it?",
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

  function answerCatair(question) {
    if (!/\b(catair|398|error code)\b/i.test(question)) {
      return null;
    }
    return schemaAnswer({
      title: "CATAIR code 398 — Country of origin required",
      thinking: [
        "Matched ACE reject code 398 against CATAIR Appendix V",
        "Checked entry line country-of-origin field requirements",
        "Cross-referenced fix path on the entry summary"
      ],
      leadIn:
        "CATAIR **398** means ACE rejected the entry because **country of origin is missing or invalid** on at least one invoice line.",
      schema: {
        components: [
          { component: "TEXT", content: "### What triggered it" },
          {
            component: "TEXT",
            content:
              "ACE expects a valid ISO country code on every line item. Blank, **US** when the goods are foreign, or a code that disagrees with the HTS chapter note will surface as 398."
          },
          { component: "TEXT", content: "### How to fix" },
          {
            component: "TEXT",
            content:
              "- Open the entry → **Invoices** tab → select the flagged line.\n" +
              "- Set **Country of origin** to the ISO code where the goods were manufactured (e.g. **VN**, **MX**, **CN**).\n" +
              "- Re-run validation, then resubmit the entry summary.\n" +
              "- If USMCA/FTA preference is claimed, ensure the origin matches the certifying country."
          },
          {
            component: "ALERT",
            color: "notice",
            title: "Agent guardrail",
            description:
              "Klear Agent can suggest the correct COO from documents — it cannot transmit or approve the corrected entry for you."
          }
        ]
      },
      followUps: [
        { label: "USMCA origin rules", prompt: "Does USMCA apply to auto parts from Mexico?" },
        { label: "HTS for brackets", prompt: "What HTS classification applies to stamped steel auto body brackets from Mexico?" }
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
        { label: "CATAIR 398", prompt: "What does CATAIR code 398 mean and how do I fix it?" }
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
        { label: "CATAIR codes", prompt: "What does CATAIR code 398 mean and how do I fix it?" }
      ]
    });
  }

  function answerHts(question) {
    if (!/\b(hts|hs code|harmonized|classif(?:y|ication))\b/i.test(question)) {
      return null;
    }
    return {
      mode: "classification",
      title: "Classification result",
      thinking: [
        "Read the product description against GRI 1–3",
        "Checked heading 8708 versus 7326",
        "Cross-referenced ACE entry practice for this heading"
      ],
      leadIn:
        "Stamped steel auto body brackets from Mexico classify as motor-vehicle body parts, not generic articles of steel.",
      hts: "8708.29.5060",
      description: "Parts and accessories of bodies (including cabs): Other: Other",
      dutyRate: "2.5%",
      origin: "MX",
      preference: "USMCA if regional value content is documented",
      confidence: "high",
      action: { type: "apply-hts", label: "Apply this HS code", data: { hts: "8708.29.5060" } },
      followUps: [
        { label: "Duty estimate", prompt: "Estimate duty for this classification" },
        { label: "USMCA preference", prompt: "Does USMCA apply to auto parts from Mexico?" }
      ]
    };
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
    placeholder: EXPERT_PLACEHOLDER,
    PROMPTS
  };
})();
