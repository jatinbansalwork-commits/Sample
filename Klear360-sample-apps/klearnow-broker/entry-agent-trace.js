(() => {
  "use strict";

  function escapeHtml(v) {
    return window.KNAdminUX?.escapeHtml?.(v) ?? String(v ?? "");
  }

  function slug(key = "") {
    return String(key).replace(/[^a-z0-9]+/gi, "-");
  }

  function jsonBlock(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (_error) {
      return String(obj);
    }
  }

  function step(tool, input, output) {
    return { tool, input, output };
  }

  function htsTrace(fieldKey, field) {
    const desc = field.value === "6204.62.4020"
      ? "Women's woven trousers, cotton blend"
      : "Stamped steel brackets, motor vehicle body";
    const hts = field.value || "8708.29.5060";
    const coo = field.value === "6204.62.4020" ? "BE" : "MX";
    return [
      step("resolve_hs_code", {
        description: desc,
        sku: fieldKey.match(/line:(\d+)/)?.[1] ? `APRL-${fieldKey.match(/line:(\d+)/)[1]}` : "WDGHT-441",
        countryOfOrigin: coo,
        documents: ["Commercial Invoice"]
      }, {
        hts,
        confidence: field.confidence ?? 92,
        heading: field.value === "6204.62.4020" ? "Women's trousers, cotton" : "Parts and accessories of bodies"
      }),
      step("compute_entry_duties", {
        hts,
        countryOfOrigin: coo,
        enteredValueUsd: field.value === "6204.62.4020" ? 4824 : 12500
      }, {
        dutyRatePct: field.value === "6204.62.4020" ? 9.9 : 2.5,
        mpfUsd: 31.67,
        hmfUsd: 15.63,
        source: "HTS Column 1 + ACE schedule lookup"
      }),
      step("validate_entry_header", {
        field: fieldKey,
        hts,
        value: hts
      }, {
        aceReady: field.status !== "error",
        warnings: field.status === "error" ? ["COO/HTS mismatch flagged"] : []
      })
    ];
  }

  function cooTrace(fieldKey, field) {
    return [
      step("read_certificate_of_origin", {
        document: "Certificate of Origin",
        field: fieldKey
      }, {
        country: field.value || "VN",
        certifier: "Manufacturer"
      }),
      step("validate_country_code", {
        isoCode: field.value || "VN",
        htsField: fieldKey.replace(":coo", ":hts")
      }, {
        valid: field.status !== "error",
        catair398: field.status === "error" ? "COO/HTS mismatch flagged" : null
      })
    ];
  }

  function bolTrace(fieldKey, field) {
    const kind = fieldKey.split(":")[1] || "field";
    return [
      step("parse_bill_of_lading", {
        document: "Master/House Bill of Lading",
        pages: [1, 2]
      }, {
        mbl: kind === "mbl" ? field.value : "EGLV1975001234",
        carrier: "EVERGREEN",
        vessel: "EVER SUPERB"
      }),
      step(`extract_bol_${kind}`, {
        bolDocumentId: "doc-bol-1",
        target: kind
      }, {
        [kind]: field.value,
        confidence: field.confidence ?? 95
      }),
      step("validate_entry_header", {
        field: kind,
        value: field.value
      }, {
        aceReady: true,
        warnings: []
      })
    ];
  }

  function txnTrace(fieldKey, field) {
    if (fieldKey === "txn:bondType") {
      return [
        step("lookup_importer_bond", {
          importerOfRecord: "V1368823019",
          filerCode: "0AF"
        }, {
          bondType: "8 - CONTINUOUS",
          limitUsd: 500000,
          usedUsd: 448000
        }),
        step("infer_bond_type", {
          bondRecord: "8 - CONTINUOUS",
          entryType: "01 Consumption"
        }, {
          value: field.value,
          confidence: field.confidence ?? 74
        })
      ];
    }
    return [
      step("match_prior_filing", {
        importer: "US COMPANY 3",
        field: fieldKey.replace("txn:", "")
      }, {
        priorValue: field.value,
        filingCount: 12
      }),
      step("validate_entry_header", {
        field: fieldKey,
        value: field.value
      }, {
        valid: true,
        confidence: field.confidence ?? 88
      })
    ];
  }

  function partyTrace(fieldKey, field) {
    const role = fieldKey.split(":")[1] || "party";
    return [
      step("extract_party_from_invoice", {
        document: "Commercial Invoice",
        role
      }, {
        name: field.value,
        identifier: fieldKey.endsWith(":number") ? "MID / bond record" : "Legal name"
      }),
      step("validate_party_record", {
        role,
        value: field.value
      }, {
        matched: true,
        confidence: field.confidence ?? 81
      })
    ];
  }

  function invoiceLineTrace(fieldKey, field) {
    const col = fieldKey.split(":").pop();
    if (col === "hts") {
      return htsTrace(fieldKey, field);
    }
    if (col === "coo") {
      return cooTrace(fieldKey, field);
    }
    if (col === "unitPrice" || col === "quantity") {
      return [
        step("extract_invoice_line", {
          document: "Commercial Invoice",
          column: col,
          field: fieldKey
        }, {
          rawText: field.value,
          currency: "USD"
        }),
        step("compute_line_value", {
          quantity: col === "quantity" ? field.value : undefined,
          unitPrice: col === "unitPrice" ? field.value : undefined
        }, {
          lineValue: col === "quantity" ? "Derived on blur" : field.value
        })
      ];
    }
    return [
      step("extract_invoice_line", {
        document: "Commercial Invoice",
        column: col,
        field: fieldKey
      }, {
        value: field.value,
        confidence: field.confidence ?? 93
      })
    ];
  }

  function genericTrace(fieldKey, field) {
    return [
      step("extract_from_document", {
        field: fieldKey,
        documents: ["Commercial Invoice", "Bill of Lading", "Packing List"]
      }, {
        value: field.value,
        confidence: field.confidence ?? 80
      }),
      step("validate_entry_header", {
        field: fieldKey,
        value: field.value
      }, {
        accepted: field.status === "agent_final",
        draft: field.status === "agent_draft"
      })
    ];
  }

  function buildTrace(fieldKey, field) {
    if (!field || (field.status !== "agent_draft" && field.status !== "agent_final")) {
      return null;
    }
    if (Array.isArray(field.toolTrace) && field.toolTrace.length) {
      return { fieldKey, steps: field.toolTrace };
    }
    if (fieldKey.endsWith(":hts")) {
      return { fieldKey, steps: htsTrace(fieldKey, field) };
    }
    if (fieldKey.endsWith(":coo")) {
      return { fieldKey, steps: cooTrace(fieldKey, field) };
    }
    if (fieldKey.startsWith("bol:")) {
      return { fieldKey, steps: bolTrace(fieldKey, field) };
    }
    if (fieldKey.startsWith("txn:")) {
      return { fieldKey, steps: txnTrace(fieldKey, field) };
    }
    if (fieldKey.startsWith("parties:")) {
      return { fieldKey, steps: partyTrace(fieldKey, field) };
    }
    if (fieldKey.startsWith("invoice:")) {
      return { fieldKey, steps: invoiceLineTrace(fieldKey, field) };
    }
    if (fieldKey.startsWith("container:")) {
      return {
        fieldKey,
        steps: [
          step("extract_from_packing_list", {
            document: "Packing List",
            field: fieldKey
          }, { value: field.value }),
          step("validate_container_manifest", {
            field: fieldKey,
            value: field.value
          }, { confidence: field.confidence ?? 78 })
        ]
      };
    }
    return { fieldKey, steps: genericTrace(fieldKey, field) };
  }

  function renderTrace(fieldKey, field, options = {}) {
    const trace = buildTrace(fieldKey, field);
    if (!trace?.steps?.length) {
      return "";
    }
    const expanded = Boolean(options.expanded);
    const panelId = `entry-agent-trace-panel-${slug(fieldKey)}`;
    const label = options.fieldLabel ? ` for ${options.fieldLabel}` : "";
    const stepsHtml = trace.steps
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

    return `<div class="entry-agent-trace${options.compact ? " entry-agent-trace--compact" : ""}">
      <button
        type="button"
        class="entry-agent-trace__toggle type-caption-sm"
        data-entry-agent-trace-toggle="${escapeHtml(fieldKey)}"
        aria-expanded="${expanded}"
        aria-controls="${panelId}"
      >
        <span class="entry-agent-trace__toggle-label">How KlearAgent got this</span>
        <svg class="entry-agent-trace__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
      </button>
      <div class="entry-agent-trace__panel" id="${panelId}" role="region" aria-label="KlearAgent tool sequence${escapeHtml(label)}" ${expanded ? "" : "hidden"}>
        <ol class="entry-agent-trace__steps">${stepsHtml}</ol>
      </div>
    </div>`;
  }

  function attachTraceToUpdate(fieldKey, field, update) {
    const merged = { ...field, ...update };
    const trace = buildTrace(fieldKey, merged);
    if (trace?.steps?.length) {
      return { ...update, toolTrace: trace.steps };
    }
    return update;
  }

  window.KNEntryAgentTrace = {
    buildTrace,
    renderTrace,
    attachTraceToUpdate
  };
})();
