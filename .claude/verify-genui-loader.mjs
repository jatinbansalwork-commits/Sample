import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
const url = "http://localhost:8080/index.html?v=431#agentic-broker";

function isPurpleish(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return b > g && r > 80 && b > 120 && r > b * 0.55;
}

function isGreenish(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return g > r && g > b && g > 100;
}

async function countTables(page) {
  return page.evaluate(() => document.querySelectorAll(".kn-genui__table").length);
}

async function ringGlowColor(page) {
  return page.evaluate(() => {
    const glow = document.querySelector(".agentic-thread__messages .kn-genui__ring-glow");
    if (!glow) return null;
    return getComputedStyle(glow).backgroundImage;
  });
}

async function hasAnimatedRing(page) {
  return page.evaluate(() => Boolean(document.querySelector(".agentic-thread__messages .kn-genui__ring[data-kn-genui-ring]:not(.kn-genui__ring--static)")));
}

async function hasSkeleton(page) {
  return page.evaluate(() => Boolean(document.querySelector(".agentic-thread__messages .kn-genui__skeleton")));
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector("[data-agentic-home-prompt]", { timeout: 15000 });

const snapshots = [];

async function snap(label) {
  const shot = {
    label,
    tables: await countTables(page),
    skeleton: await hasSkeleton(page),
    animatedRing: await hasAnimatedRing(page),
    ringBg: await ringGlowColor(page)
  };
  snapshots.push(shot);
  return shot;
}

await snap("before-click");

await page.click('[data-agentic-home-prompt="Recent entries in my queue"]');

// Poll during loading for double-mount / flicker
for (let i = 0; i < 30; i += 1) {
  await new Promise((r) => setTimeout(r, 200));
  await snap(`t-${i * 200}ms`);
}

// Wait for final settle
await page.waitForSelector(".agentic-thread__messages .kn-genui__table", { timeout: 20000 });
await new Promise((r) => setTimeout(r, 1500));
await snap("final");

const tableCounts = snapshots.map((s) => s.tables);
const maxTables = Math.max(...tableCounts);
const hadDoubleMount = tableCounts.some((c) => c > 1) || (maxTables >= 1 && snapshots.some((s, i) => i > 0 && s.tables === 0 && snapshots[i - 1]?.tables >= 1));

const finalRing = snapshots.at(-1)?.ringBg || "";
const purpleRing = isPurpleish(finalRing) || snapshots.some((s) => s.animatedRing && s.ringBg && isPurpleish(s.ringBg));
const greenRing = snapshots.some((s) => s.animatedRing && s.ringBg && isGreenish(s.ringBg));

const hadSkeletonPhase = snapshots.some((s) => s.skeleton);
const hadRingPhase = snapshots.some((s) => s.animatedRing);
const sensibleTiming = snapshots.length >= 10;

const checks = {
  noDoubleMount: !hadDoubleMount,
  purpleRing,
  notGreenRing: !greenRing,
  hadSkeletonPhase,
  hadRingPhase,
  finalTableRendered: (snapshots.at(-1)?.tables || 0) >= 1,
  sensibleTiming
};

await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, "genui-loader-final.png"), fullPage: false });
const report = { url, snapshots, checks, pass: Object.values(checks).every(Boolean) };
await writeFile(path.join(outDir, "genui-loader-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks, pass: report.pass, snapshotCount: snapshots.length }, null, 2));
await browser.close();
process.exit(report.pass ? 0 : 1);
