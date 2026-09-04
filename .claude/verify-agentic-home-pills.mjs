import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
const url = "http://localhost:8081/index.html?v=477#agentic-broker";
const CHIP = ".kn-next-actions__chip";

function isPurpleish(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return b > g && r > 80 && b > 120 && r > b * 0.55;
}

async function measurePills(page, label) {
  return page.evaluate((label, chipSel) => {
    const pills = Array.from(document.querySelectorAll(chipSel));
    const pick = (el) => {
      const cs = getComputedStyle(el);
      const icon = el.querySelector(".kn-next-actions__icon");
      const iconCs = icon ? getComputedStyle(icon) : null;
      return {
        text: el.querySelector(".kn-next-actions__label")?.textContent?.trim() ?? "",
        className: el.className,
        borderColor: cs.borderColor,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        borderRadius: cs.borderRadius,
        iconColor: iconCs?.color ?? null,
      };
    };
    return {
      label,
      count: pills.length,
      pills: pills.slice(0, 3).map(pick),
    };
  }, label, CHIP);
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(CHIP, { timeout: 15000 });

const rest = await measurePills(page, "rest");
await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, "agentic-home-pills-rest.png"), fullPage: false });

await page.hover(CHIP);
const hover = await measurePills(page, "hover");
await page.screenshot({ path: path.join(outDir, "agentic-home-pills-hover.png"), fullPage: false });

await page.focus(CHIP);
const focus = await measurePills(page, "focus");
await page.screenshot({ path: path.join(outDir, "agentic-home-pills-focus.png"), fullPage: false });

const checks = {
  pillCount: rest.count >= 7,
  usesNextActionsChip: rest.pills.every((p) => p.className.includes("kn-next-actions__chip")),
  noTertiaryBtn: rest.pills.every((p) => !p.className.includes("kn-btn--tertiary")),
  iconPurple: rest.pills.every((p) => isPurpleish(p.iconColor)),
  hoverPurpleTint: hover.pills.some((p) => isPurpleish(p.borderColor) || isPurpleish(p.backgroundColor)),
  pillRadius: rest.pills.every((p) => parseFloat(p.borderRadius) >= 900),
};

const report = { rest, hover, focus, checks, pass: Object.values(checks).every(Boolean) };
await writeFile(path.join(outDir, "agentic-home-pills-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.pass ? 0 : 1);
