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
    chevronMenu: '<path d="M4 6l4 4 4-4"/>',
    pin:
      '<path clip-rule="evenodd" fill-rule="evenodd" d="M20.4057 4.08833L20.4086 4.09121L20.4115 4.09408L23.255 6.93898C23.5829 7.26713 23.7671 7.71207 23.7671 8.17601C23.7671 8.63976 23.5826 9.08492 23.255 9.41304L18.3527 14.3307C19.1644 16.7901 17.7647 19.0587 17.0272 20.0396L17.0234 20.0446C16.8725 20.2428 16.681 20.4064 16.4618 20.5246C16.2425 20.6428 16.0005 20.7128 15.7521 20.73C15.5036 20.7472 15.2543 20.7112 15.0208 20.6243C14.7874 20.5374 14.5752 20.4017 14.3984 20.2262L14.3959 20.2236L10.0427 15.8708L6.00514 19.9083C5.61461 20.2989 4.98145 20.2989 4.59092 19.9083C4.2004 19.5178 4.2004 18.8846 4.59092 18.4941L8.62844 14.4566L4.27617 10.1039L4.27361 10.1014C4.09813 9.92459 3.96241 9.71239 3.87552 9.47895C3.78863 9.24551 3.75257 8.99622 3.76976 8.74773C3.78695 8.49925 3.85698 8.25729 3.97518 8.03804C4.09338 7.81878 4.25702 7.62728 4.45516 7.47634L4.46021 7.47255C5.44111 6.73511 7.70967 5.33539 10.1691 6.1471L15.0871 1.24445C15.4153 0.916751 15.86 0.732675 16.3238 0.732675C16.7877 0.732675 17.2327 0.916954 17.5609 1.24489L20.4057 4.08833ZM10.7522 13.752L10.75 13.7498L10.7478 13.7476L5.89997 8.89932C6.93372 8.18261 8.49317 7.48591 9.9575 8.2184C10.342 8.41073 10.8064 8.33578 11.1109 8.03226L16.3235 2.83591L18.9918 5.50289L18.9944 5.50541L18.9969 5.50794L21.6639 8.17624L16.4675 13.3889C16.164 13.6934 16.0891 14.1578 16.2814 14.5423C17.0139 16.0066 16.3172 17.5661 15.6005 18.5998L10.7522 13.752Z"/>'
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
    const fill = filled || name === "pin" ? ' fill="currentColor"' : ' fill="none"';
    const stroke = filled || name === "pin" ? "" : ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
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
