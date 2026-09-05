#!/usr/bin/env node
/**
 * Local AISStream.io proxy.
 * AISStream blocks browser WebSockets, so this process holds the API key
 * and forwards positions to the dashboard over Server-Sent Events.
 *
 *   1. Copy .env.example to .env and paste your free key
 *   2. node ais-proxy.mjs
 *   3. Open http://127.0.0.1:8787/
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const file = path.join(ROOT, ".env");
  try {
    const raw = fs.readFileSync(file, "utf8");
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }
      const eq = trimmed.indexOf("=");
      if (eq < 1) {
        return;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not read .env:", error.message);
    }
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 8787);
const API_KEY = (process.env.AISSTREAM_API_KEY || "").trim();

const BOXES = [
  [
    [5, 100],
    [42, 145]
  ],
  [
    [15, -160],
    [48, -116]
  ],
  [
    [48, -8],
    [56, 12]
  ],
  [
    [29, 31],
    [32.5, 33.5]
  ]
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const clients = new Set();
const vessels = new Map();
let aisLive = false;
let aisSocket = null;
let reconnectTimer = 0;

function payload(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function snapshot() {
  const list = [...vessels.values()].sort((a, b) => b.ts - a.ts).slice(0, 80);
  return {
    live: aisLive,
    count: list.length,
    vessels: list,
    reason: API_KEY ? (aisLive ? "" : "connecting") : "missing-key"
  };
}

function broadcast(event, data) {
  const body = payload(event, data);
  clients.forEach((res) => {
    res.write(body);
  });
}

function remember(vessel) {
  vessels.set(vessel.id, vessel);
  if (vessels.size <= 140) {
    return;
  }
  [...vessels.values()]
    .sort((a, b) => a.ts - b.ts)
    .slice(0, vessels.size - 100)
    .forEach((item) => vessels.delete(item.id));
}

function parseAisMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
  } catch (error) {
    return null;
  }
  const meta = msg.MetaData || {};
  const report = msg.Message?.PositionReport || {};
  const mmsi = String(meta.MMSI || report.UserID || "");
  const lat = Number(meta.latitude ?? report.Latitude);
  const lng = Number(meta.longitude ?? report.Longitude);
  if (!mmsi || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) {
    return null;
  }
  return {
    id: mmsi,
    name: String(meta.ShipName || "").trim() || `MMSI ${mmsi}`,
    lat,
    lng,
    sog: Number(report.Sog || 0),
    cog: Number(report.Cog || 0),
    heading: Number(report.TrueHeading > 360 ? report.Cog : report.TrueHeading || report.Cog || 0),
    ts: Date.now()
  };
}

function connectAis() {
  clearTimeout(reconnectTimer);
  if (!API_KEY) {
    aisLive = false;
    broadcast("status", snapshot());
    console.log("No AISSTREAM_API_KEY in .env — dashboard will use demo motion.");
    return;
  }
  if (typeof WebSocket === "undefined") {
    console.error("This Node version has no WebSocket client. Use Node 22+.");
    return;
  }

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
  aisSocket = ws;

  ws.addEventListener("open", () => {
    aisLive = true;
    ws.send(
      JSON.stringify({
        APIKey: API_KEY,
        Apikey: API_KEY,
        BoundingBoxes: BOXES,
        FilterMessageTypes: ["PositionReport"]
      })
    );
    broadcast("status", snapshot());
    console.log("Connected to AISStream.");
  });

  ws.addEventListener("message", (event) => {
    const vessel = parseAisMessage(event.data);
    if (vessel) {
      remember(vessel);
    }
  });

  ws.addEventListener("close", () => {
    aisLive = false;
    broadcast("status", snapshot());
    reconnectTimer = setTimeout(connectAis, 4000);
  });

  ws.addEventListener("error", () => {
    ws.close();
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function sendSse(req, res) {
  cors(res);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.write(payload("status", snapshot()));
  clients.add(res);
  req.on("close", () => {
    clients.delete(res);
  });
}

function sendFile(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/" || filePath === "/dashboard") {
    filePath = "/index.html";
  }
  const resolved = path.resolve(ROOT, `.${filePath}`);
  if (!resolved.startsWith(ROOT) || resolved.includes(`${path.sep}.env`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(resolved, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(resolved)] || "application/octet-stream"
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/ais") {
    sendSse(req, res);
    return;
  }
  if (url.pathname === "/ais/health") {
    cors(res);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, ...snapshot(), hasKey: Boolean(API_KEY) }));
    return;
  }
  sendFile(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`KlearNow AIS proxy at http://127.0.0.1:${PORT}/`);
  connectAis();
});

setInterval(() => {
  if (!clients.size) {
    return;
  }
  broadcast("vessels", snapshot());
}, 900);

setInterval(() => {
  clients.forEach((res) => res.write(": ping\n\n"));
}, 15000);
