(() => {
  const SHIP_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18l-2-6H8L3 17Z"/><path d="M8 11V7h8l2 4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>';
  const PORT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v8"/><circle cx="12" cy="7" r="2"/><path d="M6 12h12"/><path d="M7 16c1.2 2.4 3 4 5 5 2-1 3.8-2.6 5-5"/></svg>';
  const AIR_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"/></svg>';
  const TRUCK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3V7Z"/><path d="M14 10h4l3 3v3h-7v-6Z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
  const RAIL_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 16v3M16 16v3M6 21h12"/><path d="M8 8h8"/></svg>';
  const MOT_ICONS = { ship: SHIP_ICON, port: PORT_ICON, ocean: SHIP_ICON, air: AIR_ICON, truck: TRUCK_ICON, rail: RAIL_ICON };
  const MOT_LABELS = { ocean: "Ocean", air: "Air", truck: "Truck", rail: "Rail", ship: "Ocean", port: "Ocean" };

  const registry = new Map();
  let openId = "";
  let openMapId = "";
  let hoverId = "";
  let listSelectedId = "";
  let preview = null;
  let previewMap = null;
  let moveHandler = null;

  const mapKey = (map, id) => `${map?._leaflet_id || "map"}:${id}`;

  const entriesFor = (id) => [...registry.values()].filter((entry) => entry.data.id === String(id));

  const pickEntry = (id) => {
    const matches = entriesFor(id);
    return (
      matches.find((entry) => !entry.map.getContainer()?.closest("[hidden]")) ||
      matches[0] ||
      null
    );
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const pillLabel = (data) => {
    if (Number(data.count) > 1) {
      return String(data.count);
    }
    const id = String(data.name || data.id || "");
    return id.length > 11 ? `${id.slice(0, 10)}…` : id;
  };

  const kindOf = (data) => {
    if (data.mot === "air" || data.mot === "truck" || data.mot === "rail") {
      return data.mot;
    }
    if (data.kind === "air" || data.kind === "truck" || data.kind === "rail" || data.kind === "port") {
      return data.kind;
    }
    return "ship";
  };

  const toneOf = (data) => {
    if (Number(data.count) > 1) {
      return "cluster";
    }
    if (data.statusTone === "negative") {
      return "notice";
    }
    if (data.statusTone === "positive") {
      return "positive";
    }
    if (data.statusTone === "notice") {
      return "notice";
    }
    const status = `${data.status || ""} ${data.emphasis || ""}`.toLowerCase();
    if (data.emphasis === "priority" || /hold|demurrage|risk/.test(status)) {
      return "notice";
    }
    if (/ready|delivered|pickup/.test(status)) {
      return "positive";
    }
    if (data.kind === "port" || /port|pod|waiting/.test(status)) {
      return "port";
    }
    return "ship";
  };

  const badgeTone = (data) => {
    if (data.statusTone) {
      return data.statusTone;
    }
    const value = String(data.status || "").toLowerCase();
    if (/hold|fail|risk|demurrage/.test(value)) {
      return "negative";
    }
    if (/ready|delivered|filed|pickup/.test(value)) {
      return "positive";
    }
    if (/port|pod|waiting/.test(value)) {
      return "notice";
    }
    return "information";
  };

  const markerEl = (marker) => marker?.getElement?.() || marker?._icon || null;

  const setElState = (id) => {
    entriesFor(id).forEach((entry) => {
      const el = markerEl(entry.marker);
      if (!el) {
        return;
      }
      const selected = (openId === id && String(entry.map._leaflet_id) === String(openMapId)) || listSelectedId === id;
      const hovered = hoverId === id || selected;
      el.classList.toggle("is-hovered", hovered && !selected);
      el.classList.toggle("is-selected", selected);
      el.querySelector(".map-pill")?.classList.toggle("is-hovered", hovered && !selected);
      el.querySelector(".map-pill")?.classList.toggle("is-selected", selected);
      entry.marker.setZIndexOffset(selected ? 1200 : hovered ? 600 : 0);
    });
  };

  function createPillIcon(data) {
    const kind = kindOf(data);
    const tone = toneOf(data);
    const icon = MOT_ICONS[kind] || SHIP_ICON;
    return L.divIcon({
      className: "map-pill-wrap",
      html: `<span class="map-pill map-pill--${tone}" data-map-pill="${escapeHtml(data.id || "")}">
        <span class="map-pill__icon" aria-hidden="true">${icon}</span>
        <span class="map-pill__label type-caption-sm type-weight-semibold">${escapeHtml(pillLabel(data))}</span>
      </span>
      <span class="map-pill__pin map-pill__pin--${tone}" aria-hidden="true"></span>`,
      iconSize: [168, 48],
      iconAnchor: [84, 48]
    });
  }

  function stageOf(map) {
    return map?.getContainer?.()?.closest(".map-stage") || map?.getContainer?.()?.parentElement || null;
  }

  function ensurePreview(stage) {
    let node = stage.querySelector(":scope > .map-preview");
    if (node) {
      return node;
    }
    node = document.createElement("div");
    node.className = "map-preview";
    node.hidden = true;
    stage.appendChild(node);
    return node;
  }

  function closePreview() {
    const previous = openId;
    const previousMap = openMapId;
    openId = "";
    openMapId = "";
    if (preview) {
      preview.hidden = true;
      preview.replaceChildren();
    }
    if (previewMap && moveHandler) {
      previewMap.off("move", moveHandler);
      previewMap.off("click", closePreview);
    }
    previewMap = null;
    moveHandler = null;
    if (previous) {
      setElState(previous);
    }
    document.querySelectorAll("[data-map-id].is-map-active").forEach((node) => {
      node.classList.remove("is-map-active");
    });
  }

  function positionPreview(entry) {
    if (!preview || !entry?.map || preview.hidden) {
      return;
    }
    const stage = stageOf(entry.map);
    const latlng = entry.marker.getLatLng();
    const point = entry.map.latLngToContainerPoint(latlng);
    const card = preview.querySelector(".map-preview__card");
    const width = card?.offsetWidth || 280;
    const height = card?.offsetHeight || 220;
    const pad = 12;
    const maxX = Math.max(pad, (stage?.clientWidth || 0) - width - pad);
    const maxY = Math.max(pad, (stage?.clientHeight || 0) - height - pad);
    const left = Math.min(maxX, Math.max(pad, point.x - width / 2));
    const top = Math.min(maxY, Math.max(pad, point.y - height - 28));
    preview.style.setProperty("--map-preview-left", `${left}px`);
    preview.style.setProperty("--map-preview-top", `${top}px`);
  }

  function previewHtml(data) {
    const id = data.name || data.id;
    const status = data.status || "In transit";
    const route = data.route || "";
    const company = data.company || "";
    const container = data.container || "";
    const mot = MOT_LABELS[data.mot || data.kind] || "";
    const sog = Number.isFinite(Number(data.sog)) && Number(data.sog) > 0 ? `${Number(data.sog).toFixed(1)} kn` : "";
    const extras = Array.isArray(data.items)
      ? data.items
          .slice(0, 4)
          .map((item) => `<li class="type-caption-sm">${escapeHtml(item.id || item.container)}</li>`)
          .join("")
      : "";
    const query = JSON.stringify({ query: String(data.id || id) });
    return `
      <article class="map-preview__card" role="dialog" aria-label="${escapeHtml(id)}">
        <button class="icon-btn map-preview__close" type="button" aria-label="Close preview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div class="map-preview__hero map-preview__hero--${kindOf(data)}" aria-hidden="true">
          ${MOT_ICONS[kindOf(data)] || SHIP_ICON}
        </div>
        <div class="map-preview__body">
          <code class="code type-caption-sm">${escapeHtml(id)}</code>
          <span class="badge badge--${badgeTone(data)} type-caption-sm type-weight-medium">${escapeHtml(status)}</span>
          ${company ? `<p class="type-body-sm">${escapeHtml(company)}</p>` : ""}
          ${route ? `<p class="type-caption-sm map-preview__meta">${escapeHtml(route)}${mot ? ` · ${escapeHtml(mot)}` : ""}</p>` : ""}
          ${container ? `<p class="type-caption-sm map-preview__meta">Container ${escapeHtml(container)}</p>` : ""}
          ${sog ? `<p class="type-caption-sm map-preview__meta">${escapeHtml(sog)}</p>` : ""}
          ${extras ? `<ul class="map-preview__stack">${extras}</ul>` : ""}
          <a class="btn btn--primary btn--sm type-ui-sm" href="#klearhub-visibility" data-vis-open='${query}'>View in Visibility</a>
        </div>
      </article>
    `;
  }

  function openPreview(id) {
    const entry = pickEntry(id);
    if (!entry) {
      return;
    }
    const stage = stageOf(entry.map);
    if (!stage) {
      return;
    }
    if (openId && (openId !== id || String(openMapId) !== String(entry.map._leaflet_id))) {
      const previous = openId;
      openId = "";
      openMapId = "";
      setElState(previous);
    }
    preview = ensurePreview(stage);
    preview.innerHTML = previewHtml(entry.data);
    preview.hidden = false;
    openId = String(id);
    openMapId = String(entry.map._leaflet_id);
    setElState(openId);
    document.querySelectorAll("[data-map-id]").forEach((node) => {
      node.classList.toggle("is-map-active", node.getAttribute("data-map-id") === id);
    });
    preview.querySelector(".map-preview__close")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePreview();
    });
    const card = preview.querySelector(".map-preview__card");
    if (card && typeof L !== "undefined") {
      L.DomEvent.disableClickPropagation(card);
      L.DomEvent.disableScrollPropagation(card);
    }
    previewMap = entry.map;
    moveHandler = () => positionPreview(entry);
    entry.map.on("move", moveHandler);
    entry.map.off("click", closePreview);
    window.requestAnimationFrame(() => {
      positionPreview(entry);
      const latlng = entry.marker.getLatLng();
      if (!entry.map.getBounds().pad(-0.18).contains(latlng)) {
        entry.map.panTo(latlng, { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
      }
      entry.map.once("click", closePreview);
    });
  }

  function attach(map, marker, data) {
    const id = String(data.id || data.name || "");
    if (!id || !map || !marker) {
      return;
    }
    const key = mapKey(map, id);
    const previous = registry.get(key);
    if (previous?.marker && previous.marker !== marker) {
      previous.marker.off("mouseover");
      previous.marker.off("mouseout");
      previous.marker.off("click");
    }
    registry.set(key, { map, marker, data: { ...data, id } });
    marker.off("mouseover");
    marker.off("mouseout");
    marker.off("click");
    marker.on("mouseover", () => {
      hoverId = id;
      setElState(id);
    });
    marker.on("mouseout", () => {
      if (hoverId === id) {
        hoverId = "";
      }
      setElState(id);
    });
    marker.on("click", (event) => {
      if (typeof L !== "undefined") {
        L.DomEvent.stopPropagation(event);
      }
      if (openId === id && String(openMapId) === String(map._leaflet_id)) {
        closePreview();
        return;
      }
      openPreview(id);
    });
  }

  function detach(map, id) {
    if (!map || id == null) {
      return;
    }
    if (openId === String(id) && String(openMapId) === String(map._leaflet_id)) {
      closePreview();
    }
    registry.delete(mapKey(map, id));
  }

  function clearMap(map) {
    [...registry.entries()].forEach(([key, entry]) => {
      if (entry.map === map) {
        if (openId === entry.data.id && String(openMapId) === String(map._leaflet_id)) {
          closePreview();
        }
        registry.delete(key);
      }
    });
  }

  function refresh(id, data) {
    entriesFor(id).forEach((entry) => {
      entry.data = { ...entry.data, ...data, id: entry.data.id };
      if (openId === entry.data.id && String(openMapId) === String(entry.map._leaflet_id) && preview) {
        preview.innerHTML = previewHtml(entry.data);
        preview.querySelector(".map-preview__close")?.addEventListener("click", (event) => {
          event.preventDefault();
          closePreview();
        });
        positionPreview(entry);
      }
    });
  }

  function hover(id, on) {
    if (on) {
      hoverId = String(id);
      setElState(hoverId);
      return;
    }
    const previous = hoverId;
    hoverId = "";
    if (previous) {
      setElState(previous);
    }
  }

  function bindList(root) {
    if (!root || root.dataset.mapUxBound === "true") {
      return;
    }
    root.dataset.mapUxBound = "true";
    root.addEventListener("pointerover", (event) => {
      const item = event.target.closest("[data-map-id]");
      if (item) {
        hover(item.getAttribute("data-map-id"), true);
      }
    });
    root.addEventListener("pointerout", (event) => {
      const item = event.target.closest("[data-map-id]");
      if (item) {
        hover(item.getAttribute("data-map-id"), false);
      }
    });
    root.addEventListener("click", (event) => {
      const item = event.target.closest("[data-map-id]");
      if (!item || event.target.closest("a, button")) {
        return;
      }
      openPreview(item.getAttribute("data-map-id"));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openId) {
      closePreview();
    }
  });

  window.KNMapUx = {
    icons: { ship: SHIP_ICON, port: PORT_ICON, air: AIR_ICON, truck: TRUCK_ICON, rail: RAIL_ICON },
    createPillIcon,
    attach,
    detach,
    refresh,
    hover,
    open: openPreview,
    close: closePreview,
    bindList,
    follow(map, id) {
      const entry = id == null ? pickEntry(map) : registry.get(mapKey(map, id)) || pickEntry(id);
      if (entry && openId === entry.data.id) {
        positionPreview(entry);
      }
    },
    syncSelection(id, { pulse = false } = {}) {
      const previous = listSelectedId;
      listSelectedId = String(id || "");
      if (previous && previous !== listSelectedId) {
        setElState(previous);
      }
      if (listSelectedId) {
        setElState(listSelectedId);
        if (pulse && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          entriesFor(listSelectedId).forEach((entry) => {
            const pill = markerEl(entry.marker)?.querySelector(".map-pill");
            if (!pill) {
              return;
            }
            pill.classList.remove("is-pulse");
            void pill.offsetWidth;
            pill.classList.add("is-pulse");
            pill.addEventListener("animationend", () => pill.classList.remove("is-pulse"), { once: true });
          });
        }
      }
    },
    clearMap
  };
})();
