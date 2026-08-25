function knShipmentIsMoving(item) {
  return item.mot === "ocean" && /enroute|in transit/i.test(item.status || "");
}

function knToMapItem(item) {
  const moving = knShipmentIsMoving(item);
  return {
    id: item.id,
    name: item.id,
    container: item.container,
    company: item.company,
    mot: item.mot,
    kind: moving ? "ship" : item.mot === "ocean" ? "port" : item.mot,
    emphasis: item.statusTone === "negative" || item.statusTone === "notice" ? "priority" : "default",
    status: item.status,
    statusTone: item.statusTone,
    route: `${item.origin.city} → ${item.dest.city}`,
    lat: item.lat,
    lng: item.lng
  };
}

window.knShipmentIsMoving = knShipmentIsMoving;
window.knToMapItem = knToMapItem;

const KN_ORIGIN_COUNTRY = {
  Charleston: "United States",
  Shanghai: "China",
  Yantian: "China",
  London: "United Kingdom",
  Ningbo: "China",
  "Nhava Sheva": "India",
  Singapore: "Singapore",
  Laredo: "Mexico",
  Dubai: "United Arab Emirates",
  Tokyo: "Japan"
};

const KN_MOT_LABELS = { ocean: "Ocean", air: "Air", truck: "Truck", rail: "Rail" };

function knIsActionNeeded(item) {
  return item.statusTone === "negative" || item.delayTone === "negative" || item.status === "On Hold";
}

function knIsInTransit(item) {
  return /enroute|in transit/i.test(item.status || "");
}

function knShipmentAmount(id) {
  let hash = 0;
  String(id || "").split("").forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  });
  return 8600 + (hash % 34800);
}

function knFormatUsd(value) {
  return `$${Number(value || 0).toLocaleString("en-US")}`;
}

function knFormatEta(dateStr) {
  const match = /ETA\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(dateStr || "");
  if (!match) {
    return dateStr || "";
  }
  return `${match[2].slice(0, 3)} ${match[1]}, ${match[3]}`;
}

function knHoldReason(item) {
  const delay = (item.delay || "").toLowerCase();
  if (delay.includes("document")) {
    return "Document Review";
  }
  if (delay.includes("exam")) {
    return "Exam Hold";
  }
  if (delay.includes("agriculture") || delay.includes("usda")) {
    return "Agriculture Inspection";
  }
  return item.delay || "On Hold";
}

function knSummarizeShipments(list) {
  const rows = list || window.KNShipments || [];
  const mot = { ocean: 0, air: 0, truck: 0, rail: 0 };
  const origin = {};
  rows.forEach((item) => {
    mot[item.mot] = (mot[item.mot] || 0) + 1;
    const country = KN_ORIGIN_COUNTRY[item.origin.city] || item.origin.city;
    origin[country] = origin[country] || { total: 0, ocean: 0, air: 0, truck: 0, rail: 0 };
    origin[country].total += 1;
    origin[country][item.mot] += 1;
  });
  const total = rows.length;
  const pct = (count) => (total ? Math.round((count / total) * 100) : 0);
  const delayed = rows.filter((item) => item.delayTone === "negative");
  const hold = rows.filter((item) => item.status === "On Hold");
  const atTerminal = rows.filter((item) =>
    /on hold|port of delivery|ready for pickup/i.test(item.status || "")
  );
  const newest = [...rows].sort((a, b) => new Date(b.created) - new Date(a.created));
  const earliestDelayed = [...delayed].sort((a, b) => String(a.dest.date).localeCompare(String(b.dest.date)))[0];
  return {
    rows,
    total,
    shipments: rows.filter((item) => item.record === "shipment").length,
    containers: rows.filter((item) => item.record === "container").length,
    inTransit: rows.filter(knIsInTransit).length,
    hold: hold.length,
    waiting: rows.filter((item) => /waiting to depart/i.test(item.status || "")).length,
    readyPickup: rows.filter((item) => /ready for pickup/i.test(item.status || "")).length,
    atPod: rows.filter((item) => /port of delivery/i.test(item.status || "")).length,
    arrived: rows.filter((item) => /ready for pickup|port of delivery/i.test(item.status || "")).length,
    action: rows.filter(knIsActionNeeded).length,
    delayed: delayed.length,
    ontime: rows.filter((item) => !knIsActionNeeded(item)).length,
    demurrageExceeded: hold.filter((item) => item.mot === "ocean").length,
    demurrageRisk: rows.filter((item) => /port of delivery|ready for pickup/i.test(item.status || "") && item.mot === "ocean").length,
    perDiemExceeded: 0,
    perDiemRisk: 0,
    notReleased: rows.filter((item) => /on hold|waiting to depart/i.test(item.status || "")).length,
    gateOut: 0,
    mot,
    motPct: {
      ocean: pct(mot.ocean),
      air: pct(mot.air),
      truck: pct(mot.truck),
      rail: pct(mot.rail)
    },
    origin,
    holdRows: hold.map((item) => ({
      id: item.id,
      container: item.container,
      reason: knHoldReason(item),
      location: item.dest.city,
      release: knFormatEta(item.dest.date),
      document: item.mbol || item.document || "",
      broker: item.broker || "",
      brokerUserId: item.brokerUserId || ""
    })),
    delayedRows: delayed,
    earliestDelayEta: earliestDelayed ? knFormatEta(earliestDelayed.dest.date) : "",
    arrivals: atTerminal,
    newest,
    amounts: Object.fromEntries(rows.map((item) => [item.id, knShipmentAmount(item.id)]))
  };
}

window.knIsActionNeeded = knIsActionNeeded;
window.knShipmentAmount = knShipmentAmount;
window.knFormatUsd = knFormatUsd;
window.knFormatEta = knFormatEta;
window.knSummarizeShipments = knSummarizeShipments;
window.KN_MOT_LABELS = KN_MOT_LABELS;

window.KNShipments = [
  {
    id: "KX-A7J4-73",
    company: "Schlumberger Argentina S.A.",
    direction: "Import",
    record: "shipment",
    mot: "ocean",
    status: "Enroute to POU",
    statusTone: "positive",
    delay: "Departed early (2 days)",
    delayTone: "information",
    origin: { flag: "🇺🇸", city: "Charleston", code: "USCHS", date: "ETD 12 Aug 2026" },
    dest: { flag: "🇩🇪", city: "Hamburg", code: "DEHAM", date: "ETA 28 Aug 2026" },
    container: "MSKU7654321",
    po: "PO-88421",
    mbol: "MBOL-A7J4",
    lat: 47.2,
    lng: -18.4,
    created: "2026-08-18T09:12:00Z"
  },
  {
    id: "KX-A7J4-74",
    company: "Schlumberger Argentina S.A.",
    direction: "Import",
    record: "shipment",
    mot: "ocean",
    status: "Enroute to POU",
    statusTone: "positive",
    delay: "Departed late (1 day)",
    delayTone: "negative",
    origin: { flag: "🇺🇸", city: "Charleston", code: "USCHS", date: "ETD 11 Aug 2026" },
    dest: { flag: "🇩🇪", city: "Hamburg", code: "DEHAM", date: "ETA 29 Aug 2026" },
    container: "MSKU7654338",
    po: "PO-88422",
    mbol: "MBOL-A7J5",
    lat: 49.1,
    lng: -8.6,
    created: "2026-08-17T16:40:00Z"
  },
  {
    id: "KX-B2M1-19",
    company: "Schlumberger USA Inc.",
    direction: "Import",
    record: "shipment",
    mot: "ocean",
    status: "At Port of Delivery",
    statusTone: "notice",
    delay: "On schedule",
    delayTone: "information",
    origin: { flag: "🇨🇳", city: "Shanghai", code: "CNSHA", date: "ETD 02 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Los Angeles", code: "USLAX", date: "ETA 22 Aug 2026" },
    container: "COSU5566778",
    po: "PO-11092",
    mbol: "MBOL-B2M1",
    lat: 33.74,
    lng: -118.27,
    created: "2026-08-16T11:05:00Z"
  },
  {
    id: "KX-C9K2-44",
    company: "Schlumberger Brazil Ltda.",
    direction: "Export",
    record: "shipment",
    mot: "ocean",
    status: "In Transit",
    statusTone: "information",
    delay: "Departed early (1 day)",
    delayTone: "information",
    origin: { flag: "🇨🇳", city: "Yantian", code: "CNYTN", date: "ETD 06 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Long Beach", code: "USLGB", date: "ETA 26 Aug 2026" },
    container: "MAEU9988776",
    po: "PO-55210",
    mbol: "MBOL-C9K2",
    lat: 22.3,
    lng: 114.17,
    created: "2026-08-15T08:22:00Z"
  },
  {
    id: "KX-D4P8-02",
    company: "Schlumberger UK Ltd.",
    direction: "Import",
    record: "shipment",
    mot: "air",
    status: "Enroute to POD",
    statusTone: "positive",
    delay: "Departed early (4 hours)",
    delayTone: "information",
    origin: { flag: "🇬🇧", city: "London", code: "EGLL", date: "ETD 18 Aug 2026" },
    dest: { flag: "🇺🇸", city: "New York", code: "KJFK", date: "ETA 18 Aug 2026" },
    container: "AKE44192",
    po: "PO-77801",
    mbol: "MAWB-D4P8",
    lat: 51.47,
    lng: -0.45,
    created: "2026-08-25T06:10:00Z"
  },
  {
    id: "KX-E1R6-88",
    company: "Schlumberger Norway AS",
    direction: "Import",
    record: "container",
    mot: "ocean",
    status: "On Hold",
    statusTone: "negative",
    delay: "Document review",
    delayTone: "notice",
    origin: { flag: "🇨🇳", city: "Ningbo", code: "CNNGB", date: "ETD 01 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Long Beach", code: "USLGB", date: "ETA 20 Aug 2026" },
    container: "TCLU4567890",
    po: "PO-33014",
    mbol: "MBOL-E1R6",
    broker: "Priya Menon",
    brokerUserId: "priya-menon",
    lat: 33.77,
    lng: -118.19,
    created: "2026-08-14T13:48:00Z"
  },
  {
    id: "KX-F7T3-15",
    company: "Schlumberger India Pvt.",
    direction: "Export",
    record: "shipment",
    mot: "ocean",
    status: "In Transit",
    statusTone: "information",
    delay: "On schedule",
    delayTone: "positive",
    origin: { flag: "🇮🇳", city: "Nhava Sheva", code: "INNSA", date: "ETD 08 Aug 2026" },
    dest: { flag: "🇳🇱", city: "Rotterdam", code: "NLRTM", date: "ETA 30 Aug 2026" },
    container: "WHLU2211009",
    po: "PO-66108",
    mbol: "MBOL-F7T3",
    lat: 18.5,
    lng: 68.2,
    created: "2026-08-13T10:00:00Z"
  },
  {
    id: "KX-G5H0-61",
    company: "Schlumberger Singapore Pte.",
    direction: "Export",
    record: "shipment",
    mot: "ocean",
    status: "Waiting to Depart POL",
    statusTone: "notice",
    delay: "ETD change in last 4 days",
    delayTone: "notice",
    origin: { flag: "🇸🇬", city: "Singapore", code: "SGSIN", date: "ETD 19 Aug 2026" },
    dest: { flag: "🇩🇪", city: "Hamburg", code: "DEHAM", date: "ETA 12 Sep 2026" },
    container: "OOLU1122334",
    po: "PO-21990",
    mbol: "MBOL-G5H0",
    lat: 1.26,
    lng: 103.84,
    created: "2026-08-12T07:33:00Z"
  },
  {
    id: "KX-H8J9-33",
    company: "Schlumberger GmbH",
    direction: "Import",
    record: "shipment",
    mot: "ocean",
    status: "Ready for Pickup",
    statusTone: "positive",
    delay: "Arrived early (1 day)",
    delayTone: "information",
    origin: { flag: "🇸🇬", city: "Singapore", code: "SGSIN", date: "ETD 28 Jul 2026" },
    dest: { flag: "🇩🇪", city: "Hamburg", code: "DEHAM", date: "ETA 16 Aug 2026" },
    container: "SUDU5647382",
    po: "PO-44812",
    mbol: "MBOL-H8J9",
    lat: 53.54,
    lng: 9.98,
    created: "2026-08-11T15:18:00Z"
  },
  {
    id: "KX-J2L4-07",
    company: "Schlumberger Mexico S.A.",
    direction: "Import",
    record: "shipment",
    mot: "truck",
    status: "In Transit",
    statusTone: "information",
    delay: "On schedule",
    delayTone: "positive",
    origin: { flag: "🇲🇽", city: "Laredo", code: "USLRD", date: "ETD 17 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Houston", code: "USHOU", date: "ETA 19 Aug 2026" },
    container: "TRU220198",
    po: "PO-90544",
    mbol: "HBL-J2L4",
    lat: 27.5,
    lng: -99.5,
    created: "2026-08-05T04:55:00Z"
  },
  {
    id: "KX-K6N5-50",
    company: "Schlumberger Middle East",
    direction: "Import",
    record: "shipment",
    mot: "air",
    status: "Enroute to POD",
    statusTone: "positive",
    delay: "Departed late (3 hours)",
    delayTone: "negative",
    origin: { flag: "🇦🇪", city: "Dubai", code: "OMDB", date: "ETD 18 Aug 2026" },
    dest: { flag: "🇩🇪", city: "Frankfurt", code: "EDDF", date: "ETA 18 Aug 2026" },
    container: "AKE88210",
    po: "PO-17330",
    mbol: "MAWB-K6N5",
    lat: 25.25,
    lng: 55.36,
    created: "2026-08-22T02:40:00Z"
  },
  {
    id: "KX-M3Q8-21",
    company: "Schlumberger Japan K.K.",
    direction: "Export",
    record: "container",
    mot: "ocean",
    status: "On Hold",
    statusTone: "negative",
    delay: "Exam hold",
    delayTone: "notice",
    origin: { flag: "🇯🇵", city: "Tokyo", code: "JPTYO", date: "ETD 20 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Los Angeles", code: "USLAX", date: "ETA 03 Sep 2026" },
    container: "KKFU1029384",
    po: "PO-61207",
    mbol: "MBOL-M3Q8",
    broker: "Priya Menon",
    brokerUserId: "priya-menon",
    lat: 35.0,
    lng: 139.8,
    created: "2026-08-10T12:12:00Z"
  },
  {
    id: "KX-P4W2-07",
    company: "Schlumberger USA Inc.",
    direction: "Import",
    record: "container",
    mot: "ocean",
    status: "On Hold",
    statusTone: "negative",
    delay: "Agriculture inspection",
    delayTone: "notice",
    origin: { flag: "🇨🇳", city: "Yantian", code: "CNYTN", date: "ETD 05 Aug 2026" },
    dest: { flag: "🇺🇸", city: "New York", code: "USNYC", date: "ETA 22 Aug 2026" },
    container: "MSKU1122334",
    po: "PO-44190",
    mbol: "MBOL-P4W2",
    broker: "Daniel Chen",
    brokerUserId: "daniel-chen",
    lat: 40.64,
    lng: -73.78,
    created: "2026-08-12T08:20:00Z"
  },
  {
    id: "KX-R9C1-44",
    company: "Schlumberger USA Inc.",
    direction: "Import",
    record: "container",
    mot: "ocean",
    status: "On Hold",
    statusTone: "negative",
    delay: "Document review",
    delayTone: "notice",
    origin: { flag: "🇨🇳", city: "Shanghai", code: "CNSHA", date: "ETD 06 Aug 2026" },
    dest: { flag: "🇺🇸", city: "Houston", code: "USHOU", date: "ETA 28 Aug 2026" },
    container: "TCLU9080706",
    po: "PO-55218",
    mbol: "MBOL-R9C1",
    broker: "Priya Menon",
    brokerUserId: "priya-menon",
    lat: 29.76,
    lng: -95.37,
    created: "2026-08-11T15:05:00Z"
  }
];

const KN_PLACE_META = {
  Charleston: { locode: "CHS", region: "SC", countryCode: "US" },
  Shanghai: { locode: "SHA", region: "SH", countryCode: "CN" },
  Yantian: { locode: "YTN", region: "GD", countryCode: "CN" },
  London: { locode: "LHR", region: "ENG", countryCode: "GB" },
  Ningbo: { locode: "NGB", region: "ZJ", countryCode: "CN" },
  "Nhava Sheva": { locode: "NSA", region: "MH", countryCode: "IN" },
  Singapore: { locode: "SIN", region: "SG", countryCode: "SG" },
  Laredo: { locode: "LRD", region: "TX", countryCode: "US" },
  Dubai: { locode: "DXB", region: "DU", countryCode: "AE" },
  Tokyo: { locode: "TYO", region: "TK", countryCode: "JP" },
  Hamburg: { locode: "HAM", region: "HH", countryCode: "DE" },
  "Los Angeles": { locode: "LAX", region: "CA", countryCode: "US" },
  "Long Beach": { locode: "LGB", region: "CA", countryCode: "US" },
  "New York": { locode: "JFK", region: "NY", countryCode: "US" },
  Rotterdam: { locode: "RTM", region: "ZH", countryCode: "NL" },
  Houston: { locode: "HOU", region: "TX", countryCode: "US" },
  Frankfurt: { locode: "FRA", region: "HE", countryCode: "DE" }
};

function knPlaceMeta(place) {
  const extra = KN_PLACE_META[place.city] || {};
  return {
    ...place,
    locode: extra.locode || (place.code || "").slice(-3),
    region: extra.region || "",
    countryCode: extra.countryCode || (place.code || "").slice(0, 2)
  };
}

function knMasterBill(item) {
  let hash = 0;
  String(item.id || "")
    .split("")
    .forEach((char) => {
      hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
    });
  return String(40000000000 + (hash % 19999999999));
}

function knFormatPort(place) {
  const locode = place.locode || (place.code || "").slice(-3);
  const bits = [place.city ? place.city.toUpperCase() : "", place.region, place.countryCode].filter(Boolean);
  return `[${locode}] ${bits.join(", ")}`;
}

function knFormatPortDate(dateStr) {
  const match = /(ETD|ETA)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(dateStr || "");
  if (!match) {
    return dateStr || "";
  }
  return `${match[3].slice(0, 3)} ${match[2]}, ${match[4]} ${match[1]}`;
}

window.KNShipments = window.KNShipments.map((item, index) => {
  const origin = knPlaceMeta(item.origin);
  const dest = knPlaceMeta(item.dest);
  const extraContainers = item.mot === "ocean" && index % 3 === 0 ? 1 : 0;
  const extraPo = item.mot === "ocean" && index % 4 === 0 ? 1 : 0;
  const hbol =
    item.mot === "truck"
      ? item.mbol
      : item.mot === "air" || item.record === "container"
        ? "N/A"
        : `H${item.id.replace(/[^A-Z0-9]/g, "").slice(0, 10)}`;
  return {
    ...item,
    origin,
    dest,
    masterBill: knMasterBill(item),
    hbol,
    extraContainers,
    extraPo,
    polLabel: knFormatPort(origin),
    pouLabel: knFormatPort(dest),
    etdLabel: knFormatPortDate(origin.date),
    etaLabel: knFormatPortDate(dest.date),
    destCountry: dest.countryCode,
    statusSecondary: item.status === "At Port of Delivery" ? "Likely Arrived" : "",
    statusSecondaryTone: "notice"
  };
});

window.knFormatPort = knFormatPort;
window.knFormatPortDate = knFormatPortDate;
