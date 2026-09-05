import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
const url = "http://localhost:8080/index.html#agentic-broker";

function pickStyles(styles) {
  const keys = [
    "width",
    "height",
    "minHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderRadius",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderColor",
    "backgroundColor",
    "color",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "gap",
    "boxSizing",
    "display",
    "justifyContent",
    "textAlign",
    "boxShadow",
  ];
  return Object.fromEntries(keys.map((k) => [k, styles[k]]));
}

async function measure(page, label) {
  return page.evaluate((label) => {
    const btn =
      document.querySelector(".side-nav-chat-new__btn") ||
      document.querySelector(".side-nav-chat-new .btn");
    const search = document.querySelector(".side-nav-chat-search .search-input");
    const btnWrap = document.querySelector(".side-nav-chat-new");
    const searchWrap = document.querySelector(".side-nav-chat-search");
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
        styles: Object.fromEntries(
          [
            "width",
            "height",
            "minHeight",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
            "marginTop",
            "marginRight",
            "marginBottom",
            "marginLeft",
            "borderRadius",
            "borderTopWidth",
            "borderColor",
            "backgroundColor",
            "color",
            "fontSize",
            "fontWeight",
            "lineHeight",
            "gap",
            "boxSizing",
            "display",
            "justifyContent",
            "textAlign",
            "boxShadow",
          ].map((k) => [k, cs[k]])
        ),
      };
    };
    const gap =
      btn && search
        ? search.getBoundingClientRect().top - btn.getBoundingClientRect().bottom
        : null;
    return {
      label,
      btn: pick(btn),
      search: pick(search),
      btnWrap: pick(btnWrap),
      searchWrap: pick(searchWrap),
      gapPx: gap,
      l2Width: document.querySelector("#side-nav-l2")?.getBoundingClientRect().width ?? null,
    };
  }, label);
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".side-nav-chat-new__btn, .side-nav-chat-new .btn", { timeout: 15000 });
await page.waitForSelector(".side-nav-chat-search .search-input", { timeout: 15000 });

const before = await measure(page, "before");
await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, "l2-toolbar-before.png"), fullPage: false });

console.log(JSON.stringify({ before }, null, 2));
await browser.close();
