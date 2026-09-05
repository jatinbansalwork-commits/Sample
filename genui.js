(function () {
  "use strict";

  const STRUCTURED_MODES = [
    "schema",
    "draft",
    "review",
    "shipments",
    "findings",
    "classification",
    "duty",
    "entry-status"
  ];
  const BLOCK_TYPES = new Set(["CARD", "TABLE", "ENTRY_STATUS_TABLE", "DUTY_BREAKDOWN"]);
  const CARD_TABLE = new Set(["CARD", "TABLE"]);
  const VISUAL_BLOCKS = new Set([
    "CARD",
    "TABLE",
    "GRID",
    "STACK",
    "CHART",
    "INFO_GROUP",
    "ALERT",
    "ENTRY_STATUS_TABLE",
    "DUTY_BREAKDOWN"
  ]);
  const ACTION_TYPES = new Set(["BUTTON", "LINK"]);
  const FEEDBACK = new Set(["information", "negative", "notice", "positive", "neutral", "primary"]);
  const BUILTIN_TYPES = new Set([
    "TEXT",
    "CHART",
    "TABLE",
    "CARD",
    "BADGE",
    "STACK",
    "GRID",
    "INFO_GROUP",
    "BUTTON",
    "LINK",
    "ALERT",
    "DIVIDER",
    "AMOUNT",
    "DATE",
    "INDICATOR",
    "SPACER"
  ]);
  const customRenderers = Object.create(null);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function feedbackColor(color, fallback) {
    const key = String(color || "").toLowerCase();
    return FEEDBACK.has(key) ? key : fallback || "neutral";
  }

  function gapClass(gap) {
    const key = String(gap || "small").toLowerCase();
    if (key === "medium" || key === "large") return key;
    return "small";
  }

  function startsWithH3(content) {
    return /^#{3,6}\s/.test(String(content || "").trimStart());
  }

  function endsWithH3(content) {
    const lines = String(content || "")
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return /^#{3,6}\s/.test(lines[lines.length - 1] || "");
  }

  function itemModifier(previous, current) {
    if (!previous?.component || !current?.component) return "";
    const prevType = previous.component;
    const currType = current.component;
    if (VISUAL_BLOCKS.has(currType) && prevType === "TEXT") {
      return endsWithH3(previous.content) ? "kn-genui__item--after-h3-block" : "kn-genui__item--after-text-block";
    }
    if (currType === "TEXT" && startsWithH3(current.content)) {
      return VISUAL_BLOCKS.has(prevType) ? "kn-genui__item--after-h3-block" : "kn-genui__item--h3";
    }
    if (VISUAL_BLOCKS.has(prevType) && ACTION_TYPES.has(currType)) {
      return "kn-genui__item--after-block-action";
    }
    if (ACTION_TYPES.has(prevType) && ACTION_TYPES.has(currType)) {
      return "kn-genui__item--after-action";
    }
    if (VISUAL_BLOCKS.has(prevType) && VISUAL_BLOCKS.has(currType)) {
      return "kn-genui__item--after-text-block";
    }
    return "";
  }

  function animateWords(html, animate) {
    if (!animate || prefersReducedMotion()) return html;
    const wrap = (text) =>
      text.replace(/(\S+)/g, '<span data-animate-word>$1</span>');
    return html.replace(/>([^<]+)</g, (_, text) => `>${wrap(text)}<`);
  }

  function inlineMarkdown(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code class="kn-genui__code">$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out = out.replace(
      /\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a class="kn-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return out;
  }

  function renderMarkdown(content, animate) {
    const lines = String(content || "").split("\n");
    const parts = [];
    let list = null;

    const flushList = () => {
      if (!list) return;
      parts.push(`<${list.tag} class="kn-genui__${list.tag === "ol" ? "ol" : "ul"}">${list.items.join("")}</${list.tag}>`);
      list = null;
    };

    lines.forEach((raw) => {
      const line = raw.trimEnd();
      const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());
      const ol = /^(\d+)\.\s+(.*)$/.exec(line.trim());
      const ul = /^[-*]\s+(.*)$/.exec(line.trim());
      if (heading) {
        flushList();
        const level = heading[1].length;
        parts.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        return;
      }
      if (ol) {
        if (!list || list.tag !== "ol") {
          flushList();
          list = { tag: "ol", items: [] };
        }
        list.items.push(`<li><span class="kn-genui__li-copy">${inlineMarkdown(ol[2])}</span></li>`);
        return;
      }
      if (ul) {
        if (!list || list.tag !== "ul") {
          flushList();
          list = { tag: "ul", items: [] };
        }
        list.items.push(`<li><span class="kn-genui__li-copy">${inlineMarkdown(ul[1])}</span></li>`);
        return;
      }
      flushList();
      if (!line.trim()) return;
      parts.push(`<p>${inlineMarkdown(line.trim())}</p>`);
    });
    flushList();
    return `<div class="kn-genui__text">${animateWords(parts.join(""), animate)}</div>`;
  }

  function formatDate(value, format) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "-");
    if (format && /HH/.test(format)) {
      return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatAmount(value, currency) {
    const num = typeof value === "string" ? Number.parseFloat(value) : Number(value);
    if (!Number.isFinite(num)) return "-";
    const code = currency || "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(num);
    } catch {
      return `${code} ${num}`;
    }
  }

  function amountClassName(node = {}) {
    const type = ["body", "heading", "display"].includes(node.type) ? node.type : "body";
    const size = node.size || "medium";
    const weight = node.weight ? ` kn-amount--weight-${node.weight}` : "";
    const color = ["negative", "positive", "notice", "information"].includes(node.color)
      ? ` kn-amount--${node.color}`
      : "";
    const strike = node.isStrikethrough ? " kn-amount--strikethrough" : "";
    const affix = node.isAffixSubtle === false ? " kn-amount--solid-affix" : " kn-amount--subtle-affix";
    return `kn-amount kn-amount--${type} kn-amount--${size}${weight}${color}${strike}${affix}`;
  }

  function amountHtml(value, currency, extra = {}) {
    if (typeof window.knAmountHtml === "function") {
      return window.knAmountHtml(value, extra.className || "kn-amount kn-amount--body kn-amount--medium kn-amount--subtle-affix", {
        currency: currency || extra.currency || "USD",
        suffix: extra.suffix,
        fractionDigits: extra.fractionDigits,
        currencyIndicator: extra.currencyIndicator
      });
    }
    const label = formatAmount(value, currency);
    const match = label.match(/^(\D*)([\d,]+)(\.\d+)?(.*)$/);
    if (!match) {
      return `<span class="kn-amount kn-amount--body kn-amount--medium kn-amount--subtle-affix">${escapeHtml(label)}</span>`;
    }
    return `<span class="kn-amount kn-amount--body kn-amount--medium kn-amount--subtle-affix"><span class="kn-amount__sign"></span><span class="kn-amount__currency">${escapeHtml(match[1])}</span><span class="kn-amount__integer">${escapeHtml(match[2])}</span><span class="kn-amount__decimal">${escapeHtml(match[3] || "")}</span><span class="kn-amount__compact">${escapeHtml(match[4] || "")}</span></span>`;
  }

  function badgeHtml(text, color) {
    const tone = feedbackColor(color, "neutral");
    return `<span class="kn-badge kn-badge--subtle kn-badge--medium kn-badge--${tone}"><span class="kn-badge__label">${escapeHtml(text || "-")}</span></span>`;
  }

  function indicatorHtml(text, color) {
    const tone = feedbackColor(color, "neutral");
    return `<span class="kn-genui__copy"><span class="indicator indicator--${tone}" aria-hidden="true"></span><span>${escapeHtml(text || "-")}</span></span>`;
  }

  function dispatchAction(root, action, extra) {
    if (!action) return;
    root.dispatchEvent(
      new CustomEvent("kn-genui-action", {
        bubbles: true,
        composed: true,
        detail: { ...action, ...(extra || {}) }
      })
    );
  }

  function cellHtml(cell) {
    if (!cell || typeof cell !== "object") {
      return escapeHtml(cell ?? "-");
    }
    switch (cell.component) {
      case "AMOUNT":
        return amountHtml(cell.value, cell.currency, {
          suffix: cell.suffix,
          fractionDigits: cell.fractionDigits,
          currencyIndicator: cell.currencyIndicator,
          className: amountClassName(cell)
        });
      case "BADGE":
        return badgeHtml(cell.value || cell.text, cell.color);
      case "INDICATOR":
        return indicatorHtml(cell.value, cell.color);
      case "DATE":
        return escapeHtml(formatDate(cell.value, cell.dateFormat));
      case "LINK":
        return `<button type="button" class="kn-link" data-kn-genui-action="${escapeHtml(JSON.stringify(cell.action || {}))}">${escapeHtml(cell.text || "Open")}</button>`;
      case "TEXT":
        if (cell.copyable && cell.value) {
          return `<button type="button" class="kn-genui__copy kn-link" data-kn-genui-copy="${escapeHtml(cell.value)}">${escapeHtml(cell.value)}</button>`;
        }
        return escapeHtml(cell.value ?? cell.content ?? "-");
      default:
        return escapeHtml(cell.value ?? "-");
    }
  }

  function chartSeriesMeta(key) {
    const catalog = {
      ocean: { tone: "blue", label: "Ocean", token: "var(--kn-color-background-interactive-primary-default)" },
      air: { tone: "green", label: "Air", token: "var(--kn-color-background-feedback-positive-intense)" },
      truck: { tone: "gold", label: "Truck", token: "var(--kn-color-background-feedback-notice-intense)" },
      rail: { tone: "purple", label: "Rail", token: "var(--kn-primitive-purple-500)" },
      value: { tone: "blue", label: "Value", token: "var(--kn-color-background-interactive-primary-default)" }
    };
    const normalized = String(key || "").toLowerCase();
    if (catalog[normalized]) {
      return { key, ...catalog[normalized] };
    }
    const byLabel = Object.entries(catalog).find(([, meta]) => meta.label.toLowerCase() === normalized);
    if (byLabel) {
      return { key, ...byLabel[1] };
    }
    return { key, tone: "blue", label: String(key || "Value"), token: catalog.value.token };
  }

  function chartPlotKeys(firstItem, xAxis) {
    const preferred = ["ocean", "air", "truck", "rail"];
    const numeric = Object.keys(firstItem || {}).filter((key) => key !== xAxis && typeof firstItem[key] === "number");
    const ordered = preferred.filter((key) => numeric.includes(key));
    if (ordered.length) {
      return ordered;
    }
    if (numeric.includes("value")) {
      return ["value"];
    }
    return numeric;
  }

  function formatChartLegendValue(value, formatter) {
    const num = Number(value) || 0;
    if (formatter?.type === "percentage") {
      return `${Math.round(num)}%`;
    }
    if (formatter?.type === "number") {
      return String(num);
    }
    return String(value ?? "");
  }

  function chartCenterLabelHtml(label) {
    if (!label) {
      return "";
    }
    const parts = String(label).trim().split(/\s+/);
    const strong = parts.shift() || "";
    const rest = parts.join(" ") || "active";
    return `<span class="kn-chart__center dash-donut__center"><strong class="type-heading-h5">${escapeHtml(strong)}</strong><span class="type-caption-sm">${escapeHtml(rest)}</span></span>`;
  }

  function chartHtml(node) {
    const data = Array.isArray(node.data) ? node.data.filter((row) => row && node.xAxis && row[node.xAxis] != null) : [];
    const compact = node.variant === "compact" || node.variant === "tiny";
    const chartClass = compact ? "kn-genui__chart" : "kn-genui__chart kn-genui__chart--full";
    if (!node.chartType || !node.xAxis || !data.length || !node.valueFormatter?.type) {
      return `<div class="${chartClass} skeleton skeleton--bar" aria-hidden="true"></div>`;
    }

    if (node.chartType === "donut" || node.chartType === "pie") {
      const rows = data.map((row) => ({
        label: String(row[node.xAxis]),
        value: Number(row.value ?? row.count ?? 0) || 0,
        meta: chartSeriesMeta(row[node.xAxis])
      }));
      const total = rows.reduce((sum, row) => sum + row.value, 0);
      let cursor = 0;
      const gradientRows = total > 0 ? rows.filter((row) => row.value > 0) : rows.slice(0, 1);
      const stops = gradientRows.map((row) => {
        const slice = total > 0 ? (row.value / total) * 100 : 100;
        const start = cursor;
        cursor += slice;
        return `${row.meta.token} ${start}% ${cursor}%`;
      });
      const aria = rows.map((row) => `${formatChartLegendValue(row.value, node.valueFormatter)} ${row.label}`).join(", ");
      const legend = rows
        .map(
          (row) =>
            `<li class="kn-chart__item"><span class="kn-chart__swatch dash-legend__swatch chart-cat--${row.meta.tone}"></span> ${escapeHtml(row.meta.label)} ${formatChartLegendValue(row.value, node.valueFormatter)}</li>`
        )
        .join("");
      return `<div class="kn-chart kn-chart--donut dash-donut-wrap ${chartClass}">
        <div class="kn-chart__plot dash-donut" role="img" aria-label="${escapeHtml(aria)}" style="background: conic-gradient(${stops.join(",")})">
          ${chartCenterLabelHtml(node.centerLabel)}
        </div>
        <ul class="kn-chart__legend kn-chart__legend--vertical dash-donut__legend type-caption-sm">${legend}</ul>
      </div>`;
    }

    const firstItem = data[0];
    const keysToPlot = chartPlotKeys(firstItem, node.xAxis);
    if (!keysToPlot.length) {
      return `<div class="${chartClass} skeleton skeleton--bar" aria-hidden="true"></div>`;
    }
    const max = Math.max(
      ...data.map((row) => keysToPlot.reduce((sum, key) => sum + (Number(row[key]) || 0), 0)),
      1
    );
    const bars = data
      .map((row) => {
        const total = keysToPlot.reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
        const segments = keysToPlot
          .map((key) => {
            const value = Number(row[key]) || 0;
            if (!value) {
              return "";
            }
            const meta = chartSeriesMeta(key);
            return `<span class="kn-chart__seg dash-bars__seg chart-cat--${meta.tone}" style="width:${Math.round((value / max) * 100)}%"></span>`;
          })
          .join("");
        return `<div class="kn-chart__row dash-bars__row">
          <span class="kn-chart__tick dash-bars__label type-caption-sm">${escapeHtml(String(row[node.xAxis]))}</span>
          <div class="kn-chart__track dash-bars__track">${segments}</div>
          <strong class="kn-chart__value dash-bars__value type-caption-sm">${total}</strong>
        </div>`;
      })
      .join("");
    const legendKeys = keysToPlot.includes("value") ? keysToPlot : ["ocean", "air", "truck", "rail"];
    const legend = legendKeys
      .map((key) => {
        const meta = chartSeriesMeta(key);
        return `<li class="kn-chart__item"><span class="kn-chart__swatch dash-legend__swatch chart-cat--${meta.tone}"></span> ${escapeHtml(meta.label)}</li>`;
      })
      .join("");
    return `<div class="kn-chart kn-chart--bar ${chartClass}">
      <div class="kn-chart__plot dash-bars" role="img" aria-label="${escapeHtml(node.title || "Chart")}">${bars}</div>
      <ul class="kn-chart__legend dash-legend type-caption-sm">${legend}</ul>
    </div>`;
  }

  function infoGroupHtml(node, ctx) {
    const items = (node.items || []).filter((item) => item?.key?.children && item?.value?.children != null && item.value.children !== "");
    if (!items.length) return "";
    return `<dl class="info-group">${items
      .map((item) => {
        const value = item.value.children;
        const valueHtml = typeof value === "object" ? renderNode(value, ctx) : escapeHtml(String(value));
        return `<div class="info-item"><dt>${escapeHtml(item.key.children)}</dt><dd>${valueHtml}</dd></div>`;
      })
      .join("")}</dl>`;
  }

  function alertIcon(tone) {
    const stroke =
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    if (tone === "negative") {
      return `<svg ${stroke}><path d="M7.8 4.5h8.4L21 12l-4.8 7.5H7.8L3 12l4.8-7.5Z"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.75" fill="currentColor"/></svg>`;
    }
    if (tone === "notice") {
      return `<svg ${stroke}><path d="M10.3 5.2 3.2 17.5A2 2 0 0 0 4.9 20.5h14.2a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/></svg>`;
    }
    if (tone === "positive") {
      return `<svg ${stroke}><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5 5-5.5"/></svg>`;
    }
    return `<svg ${stroke}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/></svg>`;
  }

  function alertHtml(node) {
    const tone = feedbackColor(node.color, "neutral");
    const emphasis = String(node.emphasis || "subtle").toLowerCase() === "intense" ? "intense" : "subtle";
    const title = node.title ? `<p class="kn-alert__title">${escapeHtml(node.title)}</p>` : "";
    const desc = node.description ? `<p class="kn-alert__desc">${escapeHtml(node.description)}</p>` : "";
    if (!title && !desc) return "";
    const role = tone === "negative" || tone === "notice" ? "alert" : "status";
    const live = tone === "notice" ? ' aria-live="polite"' : "";
    return `<div class="kn-alert kn-alert--${tone} kn-alert--${emphasis} kn-alert--full" role="${role}"${live}><span class="kn-alert__icon" aria-hidden="true">${alertIcon(tone)}</span><div class="kn-alert__content">${title}${desc}</div></div>`;
  }

  function wrapRing(inner, ctx = {}) {
    if (prefersReducedMotion() || ctx.settledRing) {
      return `<div class="kn-genui__ring kn-genui__ring--static is-settled"><div class="kn-genui__ring-content">${inner}</div></div>`;
    }
    return `<div class="kn-genui__ring" data-kn-genui-ring><span class="kn-genui__ring-glow" aria-hidden="true"></span><div class="kn-genui__ring-content">${inner}<span class="kn-genui__ring-shade" aria-hidden="true"></span></div></div>`;
  }

  function isBlockComplete(node) {
    if (!node?.component) {
      return false;
    }
    const type = String(node.component);
    if (type === "TABLE" || type === "ENTRY_STATUS_TABLE") {
      const rows = Array.isArray(node.rows) ? node.rows.filter((row) => Array.isArray(row) && row.length) : [];
      return Array.isArray(node.headers) && node.headers.length > 0 && rows.length > 0;
    }
    if (type === "DUTY_BREAKDOWN") {
      return Array.isArray(node.lines) && node.lines.filter((line) => line?.label).length > 0;
    }
    if (type === "CARD") {
      const kids = Array.isArray(node.children) ? node.children : [];
      return Boolean(node.title || node.description || kids.length);
    }
    return true;
  }

  function tableSkeleton(node, { cols: colsOverride, rows: rowsOverride } = {}) {
    const headers = Array.isArray(node?.headers) ? node.headers : [];
    const rowData = Array.isArray(node?.rows) ? node.rows.filter((row) => Array.isArray(row) && row.length) : [];
    const cols = Math.max(colsOverride ?? headers.length, 2);
    const rows = Math.max(rowsOverride ?? rowData.length, 3);
    const head = Array.from({ length: cols }, () => '<th><span class="skeleton skeleton--caption" style="width:72%" aria-hidden="true"></span></th>').join("");
    const body = Array.from({ length: rows }, () =>
      `<tr class="kn-genui__skeleton-row" aria-hidden="true">${Array.from({ length: cols }, () =>
        '<td><span class="skeleton skeleton--tm-cell" aria-hidden="true"></span></td>'
      ).join("")}</tr>`
    ).join("");
    return `<div class="kn-genui__table-wrap kn-genui__skeleton" aria-hidden="true"><table class="kn-genui__table vis-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function cardSkeleton(node) {
    const hasHeader = Boolean(node?.title || node?.description);
    const kids = Array.isArray(node?.children) ? node.children.length : 0;
    const bodyRows = Math.max(kids, 2);
    const header = hasHeader
      ? `<div class="kn-card__header"><div class="kn-card__copy"><span class="skeleton skeleton--title" style="width:55%" aria-hidden="true"></span><span class="skeleton skeleton--caption" style="width:38%" aria-hidden="true"></span></div></div>`
      : `<div class="kn-card__header"><div class="kn-card__copy"><span class="skeleton skeleton--title" style="width:48%" aria-hidden="true"></span></div></div>`;
    const body = `<div class="kn-card__body"><div class="skeleton-stack">${Array.from({ length: bodyRows }, (_, index) =>
      `<span class="skeleton skeleton--row" style="width:${Math.max(100 - index * 12, 52)}%" aria-hidden="true"></span>`
    ).join("")}</div></div>`;
    return `<article class="kn-card kn-genui__card kn-genui__skeleton" aria-hidden="true">${header}${body}</article>`;
  }

  function blockSkeleton(type, node) {
    if (type === "TABLE" || type === "ENTRY_STATUS_TABLE") {
      return tableSkeleton(node);
    }
    if (type === "DUTY_BREAKDOWN") {
      return tableSkeleton(node, { cols: 2, rows: 4 });
    }
    if (type === "CARD") {
      return cardSkeleton(node);
    }
    return `<div class="skeleton-stack kn-genui__skeleton" aria-hidden="true"><span class="skeleton skeleton--title" style="width:42%" aria-hidden="true"></span><span class="skeleton skeleton--row" aria-hidden="true"></span><span class="skeleton skeleton--row" aria-hidden="true"></span></div>`;
  }

  function skeletonForBlock(type, node, ctx) {
    const skeleton = blockSkeleton(type, node);
    return BLOCK_TYPES.has(type) ? wrapRing(skeleton, ctx) : skeleton;
  }

  function validTypeNames() {
    return [...BUILTIN_TYPES, ...Object.keys(customRenderers)];
  }

  function isPartialTypeName(type) {
    if (!type || BUILTIN_TYPES.has(type) || customRenderers[type]) {
      return false;
    }
    return validTypeNames().some((name) => name.startsWith(type));
  }

  function repairPartialJson(input) {
    let s = String(input || "").trim();
    if (!s) {
      return null;
    }
    try {
      return JSON.parse(s);
    } catch (_error) {
      /* continue */
    }
    let inString = false;
    let escape = false;
    const stack = [];
    for (let i = 0; i < s.length; i += 1) {
      const ch = s[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        stack.push("}");
      } else if (ch === "[") {
        stack.push("]");
      } else if (ch === "}" || ch === "]") {
        stack.pop();
      }
    }
    if (inString) {
      s += '"';
    }
    s = s.replace(/,\s*$/, "");
    s = s.replace(/("[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*)$/, "$1null");
    while (stack.length) {
      s += stack.pop();
    }
    try {
      return JSON.parse(s);
    } catch (_error) {
      return null;
    }
  }

  function schemaComponents(schema) {
    if (Array.isArray(schema?.components)) {
      return schema.components;
    }
    if (Array.isArray(schema)) {
      return schema;
    }
    return [];
  }

  function renderNode(node, ctx) {
    if (!node?.component) return "";
    const type = String(node.component);
    if (isPartialTypeName(type)) {
      return "";
    }
    if ((ctx.streaming || ctx.skeletonUntilComplete) && BLOCK_TYPES.has(type) && !isBlockComplete(node)) {
      return skeletonForBlock(type, node, ctx);
    }
    try {
      switch (type) {
      case "TEXT":
        return node.content ? renderMarkdown(node.content, ctx.animate) : node.value ? `<p>${escapeHtml(node.value)}</p>` : "";
      case "AMOUNT":
        return amountHtml(node.value, node.currency, {
          suffix: node.suffix,
          fractionDigits: node.fractionDigits,
          currencyIndicator: node.currencyIndicator,
          className: amountClassName(node)
        });
      case "BADGE":
        return badgeHtml(node.text || node.value, node.color);
      case "INDICATOR":
        return node.value ? indicatorHtml(node.value, node.color) : "";
      case "DATE":
        return node.value ? `<span>${escapeHtml(formatDate(node.value, node.dateFormat))}</span>` : "";
      case "LINK":
        if (!node.text) return "";
        return `<button type="button" class="kn-link" data-kn-genui-action="${escapeHtml(JSON.stringify(node.action || {}))}">${escapeHtml(node.text)}</button>`;
      case "BUTTON":
        if (!node.text) return "";
        return `<button type="button" class="btn btn--secondary btn--sm kn-btn kn-btn--secondary kn-btn--small type-ui-sm" data-kn-genui-action="${escapeHtml(JSON.stringify(node.action || {}))}">${escapeHtml(node.text)}</button>`;
      case "ALERT":
        return alertHtml(node);
      case "SPACER":
        return `<span class="kn-genui__spacer kn-genui__spacer--${gapClass(node.size)}" aria-hidden="true"></span>`;
      case "DIVIDER":
        return `<hr class="kn-divider" role="separator" />`;
      case "INFO_GROUP":
        return infoGroupHtml(node, ctx);
      case "CHART":
        return chartHtml(node);
      case "STACK": {
        const children = (node.children || []).map((child) => renderNode(child, ctx)).join("");
        return `<div class="kn-genui__stack kn-genui__stack--${node.direction === "horizontal" ? "horizontal" : "vertical"} kn-genui__stack--gap-${gapClass(node.gap)}">${children}</div>`;
      }
      case "GRID": {
        const cols = Math.max(1, Number(node.columns) || 1);
        const children = (node.children || []).map((child) => renderNode(child, ctx)).join("");
        return `<div class="kn-genui__grid kn-genui__stack--gap-${gapClass(node.gap)}" style="--kn-genui-cols:${cols}">${children}</div>`;
      }
      case "CARD": {
        const kids = Array.isArray(node.children) ? node.children : [];
        if (!node.title && !node.description && !kids.length) {
          return skeletonForBlock("CARD", node, ctx);
        }
        const header =
          node.title || node.description
            ? `<div class="kn-card__header"><div class="kn-card__copy"><p class="kn-card__title type-ui-md type-weight-semibold">${escapeHtml(node.title || "")}</p>${node.description ? `<p class="kn-card__subtitle type-caption-sm">${escapeHtml(node.description)}</p>` : ""}</div></div>`
            : "";
        const body = kids.length ? kids.map((child) => renderNode(child, ctx)).join("") : blockSkeleton("CARD", node);
        const footer = node.footer ? `<div class="kn-card__footer"><p class="type-caption-sm">${escapeHtml(node.footer)}</p></div>` : "";
        const card = `<article class="kn-card kn-genui__card">${header}<div class="kn-card__body">${body}</div>${footer}</article>`;
        return wrapRing(card, ctx);
      }
      case "TABLE": {
        const rows = (node.rows || []).filter((row) => Array.isArray(row) && row.length);
        if (!node.headers?.length || !rows.length) {
          return skeletonForBlock("TABLE", node, ctx);
        }
        const head = node.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
        const body = rows
          .map(
            (row) =>
              `<tr>${(row || []).map((cell) => `<td>${cellHtml(cell)}</td>`).join("")}</tr>`
          )
          .join("");
        const table = `<div class="kn-genui__table-wrap"><table class="kn-genui__table vis-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
        return wrapRing(table, ctx);
      }
      default: {
        const custom = customRenderers[type];
        if (typeof custom === "function") {
          return custom(node, ctx) || "";
        }
        return "";
      }
      }
    } catch (_error) {
      return blockSkeleton(type, node);
    }
  }

  function bind(root) {
    if (root.dataset.knGenuiBound === "true") {
      return;
    }
    root.dataset.knGenuiBound = "true";
    root.addEventListener("click", (event) => {
      const copyBtn = event.target.closest("[data-kn-genui-copy]");
      if (copyBtn) {
        event.preventDefault();
        navigator.clipboard?.writeText(copyBtn.getAttribute("data-kn-genui-copy") || "").catch(() => {});
        return;
      }
      const actionBtn = event.target.closest("[data-kn-genui-action]");
      if (!actionBtn) return;
      event.preventDefault();
      let action = {};
      try {
        action = JSON.parse(actionBtn.getAttribute("data-kn-genui-action") || "{}");
      } catch {
        action = {};
      }
      dispatchAction(root, action);
      if (action?.data?.href) {
        window.location.hash = action.data.href;
      }
    });
  }

  function settleRings(root) {
    root.querySelectorAll("[data-kn-genui-ring]").forEach((ring) => {
      const box = () => ring.querySelector(".kn-genui__ring-content") || ring;
      const measure = () => {
        const target = box();
        const w = target.clientWidth;
        const h = target.clientHeight;
        if (w <= 0 || h <= 0) {
          return false;
        }
        const spacing = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--theme-spacing-2")) || 8;
        const xMargin = Math.min(Math.max(spacing, h * 0.12), w * 0.1);
        ring.style.setProperty("--kn-genui-x-start", `${xMargin.toFixed(1)}px`);
        ring.style.setProperty("--kn-genui-x-end", `${(w - xMargin).toFixed(1)}px`);
        return true;
      };
      const measureSoon = () => {
        if (measure()) {
          return;
        }
        window.requestAnimationFrame(measure);
      };
      measureSoon();
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(measure).observe(box());
      }
      // Ring fade matches the source (~1s). Force-unmask shortly after so a
      // failed mask interpolation cannot leave cards in the shimmer stage.
      window.setTimeout(() => ring.classList.add("is-settled"), 1200);
    });
  }

  function mount(el, schema, opts) {
    if (!el) return el;
    try {
      const components = schemaComponents(schema).filter((component) => component && !isPartialTypeName(component.component));
      const animate = Boolean(opts?.animate) && !prefersReducedMotion();
      const ctx = {
        animate,
        streaming: Boolean(opts?.streaming),
        skeletonUntilComplete: Boolean(opts?.skeletonUntilComplete),
        settledRing: Boolean(opts?.settledRing)
      };
      el.classList.add("kn-genui");
      if (animate && components.length > 1) {
        el.classList.add("kn-stagger");
      } else {
        el.classList.remove("kn-stagger");
      }
      el.innerHTML = components
        .map((component, index) => {
          const html = renderNode(component, ctx);
          if (!html) return "";
          const mod = itemModifier(components[index - 1], component);
          return `<div class="kn-genui__item ${mod}">${html}</div>`;
        })
        .join("");
      bind(el);
      if ((animate || el.querySelector("[data-kn-genui-ring]")) && !ctx.settledRing) {
        settleRings(el);
      }
    } catch (_error) {
      el.innerHTML = `<p class="type-body-sm">This structured answer could not be rendered.</p>`;
    }
    return el;
  }

  /** Swap skeleton placeholders in-place so text/cards already on screen do not remount. */
  function revealSkeletonBlocks(el, schema) {
    if (!el) {
      return el;
    }
    const components = schemaComponents(schema).filter((component) => component && !isPartialTypeName(component.component));
    const items = el.querySelectorAll(":scope > .kn-genui__item");
    const ctx = {
      animate: false,
      streaming: false,
      skeletonUntilComplete: false,
      settledRing: true
    };
    components.forEach((component, index) => {
      const item = items[index];
      if (!item?.querySelector(".kn-genui__skeleton")) {
        return;
      }
      const html = renderNode(component, ctx);
      if (!html) {
        return;
      }
      const mod = itemModifier(components[index - 1], component);
      item.className = `kn-genui__item ${mod}`.trim();
      item.innerHTML = html;
      item.classList.add("is-revealed");
    });
    bind(el);
    return el;
  }

  function html(schema, opts) {
    const host = document.createElement("div");
    mount(host, schema, opts);
    return host.outerHTML;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function stream(el, schema, opts = {}) {
    if (!el) {
      return el;
    }
    const components = schemaComponents(schema);
    const payload = JSON.stringify({ components });
    const signal = opts.signal;
    const reduce = prefersReducedMotion();
    if (reduce || payload.length < 48) {
      mount(el, { components }, { animate: Boolean(opts.animate) });
      return el;
    }
    if (opts.preStreamDelay) {
      await delay(opts.preStreamDelay);
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    }
    const chunkInterval = opts.interval ?? 36;
    if (opts.skeletonUntilComplete) {
      mount(el, { components }, { animate: false, skeletonUntilComplete: true });
      opts.onChunk?.(null);
      const chunks = Math.max(4, Math.ceil(payload.length / 100));
      for (let i = 0; i < chunks; i += 1) {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        await delay(chunkInterval);
        opts.onChunk?.(null);
      }
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (!reduce) {
        await delay(opts.preRevealDelay ?? opts.settleDelay ?? 140);
      }
      revealSkeletonBlocks(el, { components });
      opts.onDone?.(components);
      return el;
    } else {
      const step = Math.max(36, Math.ceil(payload.length / 48));
      for (let i = step; i < payload.length; i += step) {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        const parsed = repairPartialJson(payload.slice(0, i));
        if (!parsed) {
          await delay(chunkInterval);
          continue;
        }
        const partial = schemaComponents(parsed);
        mount(el, { components: partial }, { animate: false, streaming: true, skeletonUntilComplete: Boolean(opts.skeletonUntilComplete) });
        opts.onChunk?.(partial);
        await delay(chunkInterval);
      }
    }
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (!reduce) {
      await delay(opts.preRevealDelay ?? opts.settleDelay ?? 140);
    }
    mount(el, { components }, { animate: Boolean(opts.animate) && !reduce });
    opts.onDone?.(components);
    return el;
  }

  function register(name, renderer) {
    if (name && typeof renderer === "function") {
      customRenderers[name] = renderer;
    }
  }

  function actionButton(action) {
    if (!action?.label) {
      return "";
    }
    return `<button type="button" class="btn btn--primary kn-btn kn-btn--primary kn-btn--small" data-kn-genui-action="${escapeHtml(JSON.stringify(action))}">${escapeHtml(action.label)}</button>`;
  }

  register("CLASSIFICATION_RESULT", (node) => {
    if (!node?.hts) {
      return blockSkeleton("CARD", node);
    }
    const rate = node.dutyRate ? badgeHtml(node.dutyRate, "information") : "";
    const conf = node.confidence ? badgeHtml(String(node.confidence), node.confidence === "high" ? "positive" : "notice") : "";
    const chapter99 = node.chapter99?.code
      ? `<div class="info-item"><dt>Chapter 99 overlay</dt><dd><span class="kn-badge kn-badge--small kn-badge--notice">${escapeHtml(node.chapter99.code)}</span> <span class="type-caption-sm">${escapeHtml(node.chapter99.note || "")}</span></dd></div>`
      : "";
    const alternatives = Array.isArray(node.alternatives) && node.alternatives.length
      ? `<div class="kn-classification-alts">
          <p class="type-caption-sm type-weight-semibold">Alternatives considered</p>
          <ul class="kn-classification-alts__list">
            ${node.alternatives
              .map(
                (alt) =>
                  `<li class="type-caption-sm"><strong>${escapeHtml(alt.hts)}</strong> — ${escapeHtml(alt.reason || "Rejected")}</li>`
              )
              .join("")}
          </ul>
        </div>`
      : "";
    const crossRulings = Array.isArray(node.crossRulings) && node.crossRulings.length
      ? `<div class="kn-classification-cross">
          <p class="type-caption-sm type-weight-semibold">CROSS ruling references</p>
          <ul class="kn-classification-cross__list">
            ${node.crossRulings
              .map((ruling) => `<li class="type-caption-sm"><strong>${escapeHtml(ruling.id)}</strong> — ${escapeHtml(ruling.summary || "")}</li>`)
              .join("")}
          </ul>
        </div>`
      : "";
    const trace = node.trace?.length && window.KNClassificationAssistant?.renderTraceHtml
      ? window.KNClassificationAssistant.renderTraceHtml(node.trace, node.traceId || "trace")
      : "";
    return `<article class="kn-card kn-genui__card kn-classification-card">
      <div class="kn-card__header"><div class="kn-card__copy">
        <p class="kn-card__title type-ui-md type-weight-semibold">${escapeHtml(node.hts)}</p>
        <p class="kn-card__subtitle type-caption-sm">${escapeHtml(node.description || "Classification")}</p>
      </div></div>
      <div class="kn-card__body">
        <dl class="info-group">
          ${node.origin ? `<div class="info-item"><dt>Origin</dt><dd>${escapeHtml(node.origin)}</dd></div>` : ""}
          ${node.preference ? `<div class="info-item"><dt>Preference</dt><dd>${escapeHtml(node.preference)}</dd></div>` : ""}
          ${rate ? `<div class="info-item"><dt>Duty rate</dt><dd>${rate}</dd></div>` : ""}
          ${conf ? `<div class="info-item"><dt>Confidence</dt><dd>${conf}</dd></div>` : ""}
          ${chapter99}
        </dl>
        ${alternatives}
        ${crossRulings}
        ${trace}
      </div>
      ${node.action ? `<div class="kn-card__footer">${actionButton(node.action)}</div>` : ""}
    </article>`;
  });

  register("DUTY_BREAKDOWN", (node, ctx) => {
    const lines = Array.isArray(node?.lines) ? node.lines.filter((line) => line?.label) : [];
    if (!lines.length) {
      return skeletonForBlock("DUTY_BREAKDOWN", node, ctx);
    }
    const rows = lines
      .map(
        (line) =>
          `<tr><td>${escapeHtml(line.label)}</td><td>${amountHtml(line.amount, node.currency || line.currency || "USD", { suffix: "none" })}</td></tr>`
      )
      .join("");
    const total = node.total != null
      ? `<tfoot><tr><th>Estimated duty</th><td>${amountHtml(node.total, node.currency || "USD", { suffix: "none" })}</td></tr></tfoot>`
      : "";
    const table = `<div class="kn-genui__table-wrap"><table class="kn-genui__table vis-table"><thead><tr><th>Line</th><th>Amount</th></tr></thead><tbody>${rows}</tbody>${total}</table></div>`;
    return wrapRing(table);
  });

  register("ENTRY_STATUS_TABLE", (node, ctx) => {
    const headers = Array.isArray(node?.headers) ? node.headers : [];
    const rows = Array.isArray(node?.rows) ? node.rows.filter((row) => Array.isArray(row) && row.length) : [];
    if (!headers.length || !rows.length) {
      return skeletonForBlock("ENTRY_STATUS_TABLE", node, ctx);
    }
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const body = rows
      .map((row) => `<tr>${(row || []).map((cell) => `<td>${cellHtml(cell)}</td>`).join("")}</tr>`)
      .join("");
    const table = `<div class="kn-genui__table-wrap"><table class="kn-genui__table vis-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    return wrapRing(table);
  });

  function isStructuredResult(result) {
    if (!result) {
      return false;
    }
    if (Array.isArray(result.schema?.components) && result.schema.components.length) {
      return true;
    }
    if (STRUCTURED_MODES.includes(result.mode)) {
      return true;
    }
    return Boolean(String(result.text || result.leadIn || "").trim());
  }

  function textSchema(text, leadIn) {
    const components = [];
    const lead = String(leadIn || "").trim();
    const body = String(text || "").trim();
    if (lead) {
      components.push({ component: "TEXT", content: lead });
    }
    if (body) {
      components.push({ component: "TEXT", content: body });
    }
    if (!components.length) {
      components.push({
        component: "TEXT",
        content: "I could not process that request right now. Please try again."
      });
    }
    return { components };
  }

  function schemaFromResult(result) {
    if (!result) {
      return { components: [{ component: "TEXT", content: "I could not process that request right now. Please try again." }] };
    }
    if (result.mode === "schema" && result.schema) {
      const components = schemaComponents(result.schema).slice();
      if (result.leadIn) {
        const first = components[0];
        const already = first?.component === "TEXT" && String(first.content || "") === String(result.leadIn);
        if (!already) {
          components.unshift({ component: "TEXT", content: result.leadIn });
        }
      }
      return { components };
    }
    const components = [];
    if (result.leadIn) {
      components.push({ component: "TEXT", content: result.leadIn });
    }
    if (result.mode === "classification") {
      components.push({
        component: "CLASSIFICATION_RESULT",
        hts: result.hts,
        description: result.description,
        dutyRate: result.dutyRate,
        origin: result.origin,
        preference: result.preference,
        confidence: result.confidence,
        chapter99: result.chapter99,
        alternatives: result.alternatives,
        crossRulings: result.crossRulings,
        trace: result.trace,
        traceId: result.traceId,
        action: result.action
      });
    } else if (result.mode === "duty") {
      components.push({
        component: "DUTY_BREAKDOWN",
        currency: result.currency || "USD",
        total: result.total,
        lines: result.lines || []
      });
    } else if (result.mode === "entry-status") {
      components.push({
        component: "ENTRY_STATUS_TABLE",
        headers: result.headers,
        rows: result.rows || []
      });
    } else if (result.mode === "draft" && result.draft) {
      components.push({ component: "KN_DRAFT", draft: result.draft });
    } else if (result.mode === "review") {
      components.push({ component: "KN_REVIEW", items: result.items || [] });
    } else if (result.mode === "shipments") {
      components.push({ component: "KN_SHIPMENTS", items: result.items || [] });
    } else if (result.mode === "findings") {
      components.push({ component: "KN_FINDINGS", findings: result.findings || [] });
    } else if (result.text) {
      components.push({ component: "TEXT", content: result.text });
    }
    return { components };
  }

  window.KNGenUI = {
    STRUCTURED_MODES,
    mount,
    html,
    stream,
    register,
    schemaFromResult,
    textSchema,
    isStructuredResult,
    repairPartialJson,
    blockSkeletonHtml: blockSkeleton
  };
  (window.__knGenUIPending || []).forEach((entry) => register(entry[0], entry[1]));
  window.__knGenUIPending = [];
})();
