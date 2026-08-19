(() => {
  const MAX_VESSELS = 50;
  const listeners = new Set();
  const vessels = new Map();
  const demo = [];
  let live = false;
  let reason = "connecting";
  let source = null;
  let demoTimer = 0;
  const layers = new Map();

  function emit() {
    const list = [...vessels.values()].slice(0, MAX_VESSELS);
    const state = { live, reason, vessels: list };
    listeners.forEach((fn) => fn(state));
    layers.forEach((layer) => layer.sync(state));
    document.querySelectorAll("[data-ais-status]").forEach((node) => {
      const label = node.querySelector("[data-ais-label]");
      const dot = node.querySelector(".indicator");
      if (label) {
        label.textContent = list.length ? `Live positions · ${list.length}` : "Connecting…";
      }
      if (dot) {
        const isLive = list.length > 0;
        dot.classList.toggle("indicator--positive", isLive);
        dot.classList.toggle("indicator--notice", !isLive);
      }
      node.setAttribute(
        "data-tooltip",
        list.length ? "Vessel positions update as they report in" : "Waiting for vessel positions"
      );
    });
  }

  function setVessels(list, nextLive, nextReason) {
    live = Boolean(nextLive);
    reason = nextReason || (live ? "" : "demo");
    vessels.clear();
    list.forEach((item) => {
      if (item?.id && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        vessels.set(String(item.id), item);
      }
    });
    emit();
  }

  function seedDemo(fallbackShips) {
    demo.length = 0;
    fallbackShips.forEach((item) => {
      demo.push({
        id: item.id,
        name: item.name || item.id,
        lat: item.lat,
        lng: item.lng,
        heading: 40,
        sog: 12,
        route: item.route,
        status: item.status,
        statusTone: item.statusTone,
        company: item.company,
        container: item.container,
        mot: item.mot,
        kind: item.kind || "ship"
      });
    });
    if (!live) {
      setVessels(demo, false, reason);
    }
  }

  function tickDemo() {
    if (live || !demo.length) {
      return;
    }
    demo.forEach((item) => {
      if (item.kind !== "ship") {
        return;
      }
      const rad = ((item.heading || 40) * Math.PI) / 180;
      const step = 0.04;
      item.lat = Math.max(-80, Math.min(80, item.lat + Math.cos(rad) * step * 0.35));
      item.lng += Math.sin(rad) * step;
      if (item.lng > 180) {
        item.lng -= 360;
      }
      if (item.lng < -180) {
        item.lng += 360;
      }
      item.heading = (item.heading + (Math.random() - 0.5) * 8 + 360) % 360;
    });
    setVessels(demo, false, reason || "demo");
  }

  function connect(url) {
    if (source) {
      source.close();
    }
    const es = new EventSource(url);
    source = es;
    const onPayload = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data.vessels)) {
          reason = data.reason || "";
          if (data.live && data.vessels.length) {
            setVessels(data.vessels, true, "");
            return;
          }
          live = false;
          reason = data.reason || "demo";
          if (demo.length) {
            setVessels(demo, false, reason);
          } else {
            emit();
          }
        }
      } catch (error) {
        /* ignore malformed chunks */
      }
    };
    es.addEventListener("status", onPayload);
    es.addEventListener("vessels", onPayload);
    return es;
  }

  function start() {
    const urls = [`${location.origin}/ais`, "http://127.0.0.1:8787/ais"];
    const unique = [...new Set(urls)];
    let index = 0;
    const tryNext = () => {
      if (index >= unique.length) {
        live = false;
        reason = "demo";
        if (demo.length) {
          setVessels(demo, false, "demo");
        }
        return;
      }
      const url = unique[index];
      index += 1;
      const es = connect(url);
      const timer = window.setTimeout(() => {
        if (!live && source === es) {
          es.close();
          source = null;
          tryNext();
        }
      }, 1800);
      const stopTimer = () => window.clearTimeout(timer);
      es.addEventListener("status", stopTimer);
      es.addEventListener("vessels", stopTimer);
      es.addEventListener("error", () => {
        window.clearTimeout(timer);
        if (source === es) {
          es.close();
          source = null;
          tryNext();
        }
      });
    };
    tryNext();
    if (!demoTimer) {
      demoTimer = window.setInterval(tickDemo, 2200);
    }
  }

  function shipIcon(vessel, factory) {
    if (typeof factory === "function") {
      return factory(vessel);
    }
    if (window.KNMapUx) {
      return window.KNMapUx.createPillIcon({ ...vessel, kind: "ship" });
    }
    const heading = Number(vessel.heading || 0);
    return L.divIcon({
      className: "",
      html: `<span class="shipment-marker shipment-marker--live" style="transform: rotate(${heading}deg)">${typeof SHIP_ICON === "string" ? SHIP_ICON : ""}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });
  }

  function bindMap(map, options = {}) {
    if (!map || typeof L === "undefined") {
      return;
    }
    const layer = L.layerGroup().addTo(map);
    const markers = new Map();
    if (options.fallbackShips?.length) {
      seedDemo(options.fallbackShips);
    }

    const sync = (state) => {
      const list = options.liveOnly && !state.live ? [] : state.vessels.slice(0, options.limit || MAX_VESSELS);
      const seen = new Set();
      list.forEach((vessel) => {
        seen.add(vessel.id);
        const existing = markers.get(vessel.id);
        if (existing) {
          existing.setLatLng([vessel.lat, vessel.lng]);
          window.KNMapUx?.refresh(vessel.id, vessel);
          window.KNMapUx?.follow(map, vessel.id);
          return;
        }
        const marker = L.marker([vessel.lat, vessel.lng], {
          icon: shipIcon(vessel, options.icon),
          riseOnHover: true,
          keyboard: true,
          title: vessel.name || vessel.id
        });
        window.KNMapUx?.attach(map, marker, { ...vessel, kind: vessel.kind || "ship" });
        layer.addLayer(marker);
        markers.set(vessel.id, marker);
      });
      markers.forEach((marker, id) => {
        if (!seen.has(id)) {
          window.KNMapUx?.detach(map, id);
          layer.removeLayer(marker);
          markers.delete(id);
        }
      });
    };

    layers.set(map, {
      sync,
      getPoints: () => [...markers.values()].map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lat, latlng.lng];
      })
    });
    sync({ live, reason, vessels: [...vessels.values()] });
  }

  function getFitPoints(map) {
    return layers.get(map)?.getPoints() || [...vessels.values()].map((item) => [item.lat, item.lng]);
  }

  window.KNAis = {
    start,
    subscribe(fn) {
      listeners.add(fn);
      fn({ live, reason, vessels: [...vessels.values()] });
      return () => listeners.delete(fn);
    },
    bindMap,
    getFitPoints,
    isLive: () => live,
    seedDemo
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
