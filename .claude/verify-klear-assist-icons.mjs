import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
const baseUrl = "http://localhost:8080/index.html?v=426";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${baseUrl}#agentic-broker`, { waitUntil: "networkidle0", timeout: 60000 });

await page.waitForSelector(".side-nav-link--agentic-broker .klear-assistant-mark", { timeout: 15000 });

// Enable top-nav trigger visibility (hidden by default until route logic runs)
await page.evaluate(() => {
  document.querySelectorAll(".ai-assistant-trigger").forEach((el) => {
    el.hidden = false;
    el.removeAttribute("hidden");
  });
  document.documentElement.classList.add("ai-assist-trigger-on");
  document.querySelector(".app-shell")?.classList.add("ai-assist-trigger-on");
});

await page.waitForSelector("#ai-assistant-trigger .klear-assistant-mark", { timeout: 5000 });

const l1 = await page.evaluate(() => {
  const mark = document.querySelector(".side-nav-link--agentic-broker .klear-assistant-mark");
  if (!mark) return { found: false };
  const cs = getComputedStyle(mark);
  return {
    found: true,
    tagName: mark.tagName.toLowerCase(),
    src: mark.getAttribute("src"),
    hasSpin: mark.classList.contains("klear-assistant-mark--spin"),
    width: cs.width,
    height: cs.height,
    filter: cs.filter,
    animationName: cs.animationName,
  };
});

const topNav = await page.evaluate(() => {
  const mark = document.querySelector("#ai-assistant-trigger .klear-assistant-mark");
  if (!mark) return { found: false };
  const cs = getComputedStyle(mark);
  return {
    found: true,
    tagName: mark.tagName.toLowerCase(),
    src: mark.getAttribute("src"),
    hasSpin: mark.classList.contains("klear-assistant-mark--spin"),
    width: cs.width,
    height: cs.height,
    filter: cs.filter,
    animationName: cs.animationName,
  };
});

const mobileNav = await page.evaluate(() => {
  const mark = document.querySelector("#ai-assistant-trigger-mobile .klear-assistant-mark");
  if (!mark) return { found: false };
  const cs = getComputedStyle(mark);
  return {
    found: true,
    tagName: mark.tagName.toLowerCase(),
    src: mark.getAttribute("src"),
    hasSpin: mark.classList.contains("klear-assistant-mark--spin"),
    width: cs.width,
    height: cs.height,
    filter: cs.filter,
    animationName: cs.animationName,
  };
});

// Open assistant panel
await page.click("#ai-assistant-trigger");
await page.waitForSelector("#ai-assistant-panel:not([hidden])", { timeout: 5000 });

const panel = await page.evaluate(() => {
  const mark = document.querySelector("#ai-assistant-panel .ai-assistant-mark .klear-assistant-mark");
  if (!mark) return { found: false };
  const cs = getComputedStyle(mark);
  return {
    found: true,
    tagName: mark.tagName.toLowerCase(),
    src: mark.getAttribute("src"),
    hasSpin: mark.classList.contains("klear-assistant-mark--spin"),
    width: cs.width,
    height: cs.height,
    filter: cs.filter,
    animationName: cs.animationName,
  };
});

await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, "verify-l1-topnav-panel.png") });

// Full-page agentic empty state — no static mark in hero; verify page loads
const fullPage = await page.evaluate(() => {
  const greeting = document.querySelector("#agentic-home-greeting");
  const pageEl = document.querySelector("#agentic-broker-page");
  const rayUses = document.querySelectorAll('use[href="#klear-assist-ray"], use[xlink\\:href="#klear-assist-ray"]').length;
  const pngMarks = document.querySelectorAll('img.klear-assistant-mark[src*="klear-assistant-mark.png"]').length;
  return {
    fullPageVisible: pageEl && !pageEl.hidden,
    greetingText: greeting?.textContent?.trim() ?? null,
    raySvgUsesRemaining: rayUses,
    pngMarkCount: pngMarks,
  };
});

const pass = {
  l1IsPng: l1.found && l1.tagName === "img" && l1.src?.includes("klear-assistant-mark.png"),
  l1HasSpin: l1.hasSpin === true,
  l1HasFilter: l1.filter !== "none",
  topNavIsPng: topNav.found && topNav.tagName === "img" && topNav.src?.includes("klear-assistant-mark.png"),
  topNavHasSpin: topNav.hasSpin === true,
  mobileNavIsPng: mobileNav.found && mobileNav.tagName === "img",
  panelIsPng: panel.found && panel.tagName === "img" && panel.src?.includes("klear-assistant-mark.png"),
  panelHasSpin: panel.hasSpin === true,
  noRaySvgUses: fullPage.raySvgUsesRemaining === 0,
  fullPageLoads: fullPage.fullPageVisible === true,
};

const allPass = Object.values(pass).every(Boolean);

console.log(
  JSON.stringify(
    {
      url: `${baseUrl}#agentic-broker`,
      probes: { l1, topNav, mobileNav, panel, fullPage },
      pass,
      allPass,
    },
    null,
    2
  )
);

await browser.close();
process.exit(allPass ? 0 : 1);
