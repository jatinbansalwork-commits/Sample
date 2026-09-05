/**
 * Verify GenUI spacing contract modifiers for GRID / TABLE / ALERT blocks.
 * Run: PORT=8082 node tests/genui-spacing-contract-verify.mjs
 */
import puppeteer from "puppeteer";

const port = Number(process.env.PORT) || 8082;
const url = `http://localhost:${port}/index.html?v=genui-spacing-${Date.now()}#agentic-broker`;

const schema = {
  components: [
    { component: "TEXT", content: "Briefing paragraph before the metric grid." },
    {
      component: "GRID",
      columns: 2,
      gap: "small",
      children: [
        { component: "CARD", title: "Card A", children: [{ component: "TEXT", content: "One" }] },
        { component: "CARD", title: "Card B", children: [{ component: "TEXT", content: "Two" }] }
      ]
    },
    {
      component: "TABLE",
      headers: ["Col A", "Col B"],
      rows: [
        [{ component: "TEXT", value: "Row 1" }, { component: "TEXT", value: "Data" }]
      ]
    },
    {
      component: "ALERT",
      color: "notice",
      title: "Heads up",
      description: "Spacing after the table should follow the Schema UI contract."
    },
    { component: "BUTTON", text: "Next step", action: { type: "prompt", data: { prompt: "Continue" } } }
  ]
};

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForFunction(() => window.KNGenUI?.mount, { timeout: 15000 });

  const result = await page.evaluate((testSchema) => {
    const host = document.createElement("div");
    host.style.width = "640px";
    document.body.appendChild(host);
    window.KNGenUI.mount(host, testSchema, { animate: false });
    const items = [...host.querySelectorAll(":scope > .kn-genui__item")];
    const spacing7 = getComputedStyle(document.documentElement).getPropertyValue("--theme-spacing-7").trim();
    const spacing4 = getComputedStyle(document.documentElement).getPropertyValue("--theme-spacing-4").trim();
    const spacing3 = getComputedStyle(document.documentElement).getPropertyValue("--theme-spacing-3").trim();
    const toPx = (value) => {
      const probe = document.createElement("div");
      probe.style.marginTop = value;
      document.body.appendChild(probe);
      const px = getComputedStyle(probe).marginTop;
      probe.remove();
      return px;
    };
    const expected7 = toPx(spacing7);
    const expected4 = toPx(spacing4);
    const expected3 = toPx(spacing3);
    const marginTop = (el) => getComputedStyle(el).marginTop;
    return {
      count: items.length,
      gridMod: items[1]?.className || "",
      tableMod: items[2]?.className || "",
      alertMod: items[3]?.className || "",
      buttonMod: items[4]?.className || "",
      gridMargin: marginTop(items[1]),
      tableMargin: marginTop(items[2]),
      alertMargin: marginTop(items[3]),
      buttonMargin: marginTop(items[4]),
      expected7,
      expected4,
      expected3,
      buttonClass: items[4]?.querySelector("button")?.className || ""
    };
  }, schema);

  await browser.close();

  const failures = [];
  if (result.count !== 5) failures.push(`expected 5 items, got ${result.count}`);
  if (!result.gridMod.includes("kn-genui__item--after-text-block")) {
    failures.push(`GRID modifier missing: ${result.gridMod}`);
  }
  if (!result.tableMod.includes("kn-genui__item--after-text-block")) {
    failures.push(`TABLE modifier missing: ${result.tableMod}`);
  }
  if (!result.alertMod.includes("kn-genui__item--after-text-block")) {
    failures.push(`ALERT modifier missing: ${result.alertMod}`);
  }
  if (!result.buttonMod.includes("kn-genui__item--after-block-action")) {
    failures.push(`BUTTON modifier missing: ${result.buttonMod}`);
  }
  if (result.gridMargin !== result.expected7) {
    failures.push(`GRID margin ${result.gridMargin} !== ${result.expected7}`);
  }
  if (result.tableMargin !== result.expected7) {
    failures.push(`TABLE margin ${result.tableMargin} !== ${result.expected7}`);
  }
  if (result.alertMargin !== result.expected7) {
    failures.push(`ALERT margin ${result.alertMargin} !== ${result.expected7}`);
  }
  if (result.buttonMargin !== result.expected4) {
    failures.push(`BUTTON margin ${result.buttonMargin} !== ${result.expected4} (after-block-action)`);
  }
  if (!result.buttonClass.includes("kn-btn--secondary")) {
    failures.push(`GenUI BUTTON should use kn-btn--secondary: ${result.buttonClass}`);
  }

  if (failures.length) {
    console.error("FAIL genui-spacing-contract-verify");
    failures.forEach((line) => console.error(`  - ${line}`));
    process.exit(1);
  }

  console.log("PASS genui-spacing-contract-verify");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
