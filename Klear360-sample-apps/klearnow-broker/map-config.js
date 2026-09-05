const MAP_ZOOM = {
  minFloor: 2,
  max: 8,
  home: 3,
  fitMax: 5,
  select: 5
};

const MAP_MAX_BOUNDS = [
  [-85.051128, -180],
  [85.051128, 180]
];

function mapTileOptions(extra) {
  return {
    noWrap: true,
    bounds: MAP_MAX_BOUNDS,
    minZoom: MAP_ZOOM.minFloor,
    maxZoom: MAP_ZOOM.max,
    keepBuffer: 2,
    ...extra
  };
}

function createConstrainedMap(el) {
  const map = L.map(el, {
    zoomControl: false,
    scrollWheelZoom: true,
    wheelPxPerZoomLevel: 120,
    worldCopyJump: false,
    bounceAtZoomLimits: true,
    minZoom: MAP_ZOOM.minFloor,
    maxZoom: MAP_ZOOM.max,
    zoomSnap: 1,
    zoomDelta: 1,
    maxBounds: L.latLngBounds(MAP_MAX_BOUNDS),
    maxBoundsViscosity: 1
  }).setView([22, 20], MAP_ZOOM.home);

  map.on("zoomend", () => {
    if (map.options.maxBounds) {
      map.panInsideBounds(map.options.maxBounds, { animate: false });
    }
  });

  return map;
}

function minZoomToFill(map) {
  const size = map.getSize();
  if (!size.x || !size.y) {
    return MAP_ZOOM.minFloor;
  }
  const tileSize = 256;
  const zoom = Math.ceil(Math.log2(Math.max(size.x, size.y) / tileSize));
  return Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.minFloor, zoom));
}

function applyMapZoomRules(map) {
  if (!map) {
    return;
  }
  const minZoom = minZoomToFill(map);
  map.setMinZoom(minZoom);
  map.setMaxZoom(MAP_ZOOM.max);
  if (map.getZoom() < minZoom) {
    map.setZoom(minZoom, { animate: false });
  }
  if (map.getZoom() > MAP_ZOOM.max) {
    map.setZoom(MAP_ZOOM.max, { animate: false });
  }
  if (map.options.maxBounds) {
    map.panInsideBounds(map.options.maxBounds, { animate: false });
  }
}

/**
 * Split a lat/lng path at ±180 when consecutive points span more than 180° of longitude.
 * Returns an array of polyline segments (each [lat, lng][]). Avoids unwrapping past maxBounds.
 */
function splitAntimeridianPoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return points?.length ? [points.slice()] : [];
  }
  const parts = [];
  let part = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = part[part.length - 1];
    const curr = points[i];
    const dLng = curr[1] - prev[1];
    if (Math.abs(dLng) > 180) {
      const unwrapped = curr[1] + (dLng > 0 ? -360 : 360);
      const bridgeLng = dLng > 0 ? -180 : 180;
      const span = unwrapped - prev[1];
      const t = span === 0 ? 0 : (bridgeLng - prev[1]) / span;
      const bridgeLat = prev[0] + t * (curr[0] - prev[0]);
      part.push([bridgeLat, bridgeLng]);
      parts.push(part);
      part = [[bridgeLat, -bridgeLng], curr];
    } else {
      part.push(curr);
    }
  }
  parts.push(part);
  return parts;
}

function fitMapToPoints(map, points) {
  if (!map) {
    return;
  }
  applyMapZoomRules(map);
  if (!points.length) {
    map.setView([22, 20], Math.max(map.getMinZoom(), MAP_ZOOM.home), { animate: false });
    return;
  }
  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds.pad(0.12), {
    padding: [32, 32],
    maxZoom: Math.max(map.getMinZoom(), MAP_ZOOM.fitMax),
    animate: false
  });
  applyMapZoomRules(map);
}

function syncMapZoomButtons(map, zoomInBtn, zoomOutBtn) {
  const sync = () => {
    if (zoomInBtn) {
      zoomInBtn.disabled = map.getZoom() >= map.getMaxZoom();
    }
    if (zoomOutBtn) {
      zoomOutBtn.disabled = map.getZoom() <= map.getMinZoom();
    }
  };
  map.on("zoomend zoomlevelschange", sync);
  sync();
}

function knThemeColor(token, fallback = "") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

function knMapRouteColor() {
  return knThemeColor("--kn-color-map-route", knThemeColor("--kn-color-border-interactive-primary-default", "#005d7b"));
}
