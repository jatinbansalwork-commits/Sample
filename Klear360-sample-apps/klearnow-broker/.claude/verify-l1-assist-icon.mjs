import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
const url = "http://localhost:8080/index.html?v=422#agentic-broker";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".side-nav-link--agentic-broker .klear-assistant-mark", { timeout: 15000 });

const staticProbe = await page.evaluate(() => {
  const link = document.querySelector(".side-nav-link--agentic-broker");
  const iconWrap = link?.querySelector(".side-nav-link__icon");
  const mark = iconWrap?.querySelector(".klear-assistant-mark");
  const cs = mark ? getComputedStyle(mark) : null;
  const root = getComputedStyle(document.documentElement);
  const accent = root.getPropertyValue("--kn-color-ai-accent").trim();
  const useEl = mark?.querySelector("use");
  const href = useEl?.getAttribute("href") || useEl?.getAttribute("xlink:href") || null;
  const pathCount = mark?.querySelectorAll("path").length ?? 0;
  return {
    tagName: mark?.tagName?.toLowerCase() ?? null,
    hasSpinClass: mark?.classList.contains("klear-assistant-mark--spin") ?? false,
    useHref: href,
    pathCount,
    hasImg: Boolean(iconWrap?.querySelector("img.klear-assistant-mark")),
    color: cs?.color ?? null,
    fill: cs?.fill ?? null,
    filter: cs?.filter ?? null,
    animationName: cs?.animationName ?? null,
    animationDuration: cs?.animationDuration ?? null,
    animationTimingFunction: cs?.animationTimingFunction ?? null,
    accentToken: accent,
    width: cs?.width ?? null,
    height: cs?.height ?? null,
  };
});

await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, "l1-assist-icon-static.png"), fullPage: false });

const rotationSamples = [];
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 160));
  const sample = await page.evaluate(() => {
    const mark = document.querySelector(".side-nav-link--agentic-broker .klear-assistant-mark");
    const cs = mark ? getComputedStyle(mark) : null;
    const transform = cs?.transform ?? "none";
    let angleDeg = null;
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(",").map((v) => parseFloat(v.trim()));
      if (parts.length >= 2) {
        angleDeg = Math.round((Math.atan2(parts[1], parts[0]) * 180) / Math.PI);
      }
    }
    return { transform, angleDeg };
  });
  rotationSamples.push(sample);
}

const angles = rotationSamples.map((s) => s.angleDeg).filter((a) => a !== null);
const uniqueAngles = [...new Set(angles)];
const rotates = uniqueAngles.length > 1;

const pass = {
  starOnlySvg: staticProbe.tagName === "svg" && !staticProbe.hasImg && staticProbe.useHref === "#klear-assist-ray",
  noDot: staticProbe.pathCount === 0 && staticProbe.useHref === "#klear-assist-ray",
  purpleColor: staticProbe.color.includes("rgb") && staticProbe.color !== "rgb(0, 0, 0)",
  spinClass: staticProbe.hasSpinClass,
  animationActive: staticProbe.animationName !== "none",
  rotationObserved: rotates,
};

const allPass = Object.values(pass).every(Boolean);

console.log(
  JSON.stringify(
    {
      url,
      staticProbe,
      rotationSamples,
      uniqueAngles,
      pass,
      allPass,
    },
    null,
    2
  )
);

await browser.close();
process.exit(allPass ? 0 : 1);
