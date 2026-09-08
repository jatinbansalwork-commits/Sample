/**
 * Klear360 iconography for vanilla HTML sample apps.
 * Stroked 24×24 glyphs, semantic color via currentColor on host, size via .kn-icon--*.
 * @see klear360-iconography skill
 */
(function () {
  "use strict";

  const SIZE_CLASS = Object.freeze({
    xsmall: "kn-icon--xsmall",
    small: "kn-icon--small",
    medium: "kn-icon--medium",
    large: "kn-icon--large",
    xlarge: "kn-icon--xlarge",
    "2xlarge": "kn-icon--2xlarge"
  });

  /** Inner SVG markup — names mirror Klear360 *Icon components where possible. */
  const PATHS = Object.freeze({
    eye:
      '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    createTxn:
      '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M12 11v6"/><path d="M9 14h6"/>',
    doc:
      '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/>',
    intake:
      '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a4 4 0 0 1 4 4v7"/>',
    list:
      '<circle cx="4" cy="6" r="1"/><path d="M9 6h11"/><circle cx="4" cy="12" r="1"/><path d="M9 12h11"/><circle cx="4" cy="18" r="1"/><path d="M9 18h11"/>',
    pencil:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    edit:
      '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/>',
    refresh:
      '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>',
    do:
      '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8 12h8"/><path d="M8 16h6"/>',
    copy:
      '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
    delete:
      '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>',
    trash:
      '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>',
    close:
      '<path d="M6 6l12 12M18 6 6 18"/>',
    closeMd:
      '<path d="M4 4l8 8M12 4l-8 8"/>',
    bell:
      '<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    chevronDown: '<path d="M4 6l4 4 4-4"/>',
    chevronRight: '<path d="M6 4l4 4-4 4"/>',
    filter:
      '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    search:
      '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    upload:
      '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    file:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    warn:
      '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
    check:
      '<path d="M4 12.5 9 17l11-11"/>',
    more:
      '<circle cx="8" cy="3" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="8" cy="13" r="1.25"/>',
    chevronMenu: '<path d="M4 6l4 4 4-4"/>'
  });

  const VIEWBOX = Object.freeze({
    chevronDown: "0 0 16 16",
    chevronRight: "0 0 16 16",
    closeMd: "0 0 16 16",
    more: "0 0 16 16",
    chevronMenu: "0 0 16 16"
  });

  /**
   * @param {keyof PATHS} name
   * @param {{ size?: keyof SIZE_CLASS, className?: string, filled?: boolean }} [opts]
   */
  function html(name, { size = "medium", className = "", filled = false } = {}) {
    const paths = PATHS[name];
    if (!paths) {
      return "";
    }
    const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.medium;
    const cls = ["kn-icon", sizeCls, className].filter(Boolean).join(" ");
    const viewBox = VIEWBOX[name] || "0 0 24 24";
    const fill = filled ? ' fill="currentColor"' : ' fill="none"';
    const stroke = filled ? "" : ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg class="${cls}" viewBox="${viewBox}"${fill}${stroke} aria-hidden="true">${paths}</svg>`;
  }

  /** Chevron for expand/collapse — 16px grid, medium density. */
  function chevron(expanded, opts = {}) {
    return html(expanded ? "chevronDown" : "chevronRight", opts);
  }

  /** Map legacy tmTableIcons keys → KNIcons names. */
  function tmIcon(name) {
    return html(name);
  }

  window.KNIcons = {
    html,
    chevron,
    tmIcon,
    PATHS,
    SIZE_CLASS
  };
})();
