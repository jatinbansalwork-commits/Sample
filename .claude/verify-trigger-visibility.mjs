import puppeteer from "puppeteer";

const baseUrl = "http://localhost:8080/index.html";

function triggerState(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".app-shell");
    const triggers = [...document.querySelectorAll(".ai-assistant-trigger")];
    const core = window.KNAssistCore;
    return {
      hash: location.hash,
      isTriggerVisible: core?.isTriggerVisible?.(),
      isTriggerRoute: core?.isTriggerRoute?.(),
      isFullPageAssist: core?.isFullPageAssist?.(),
      shellClassOn: shell?.classList.contains("ai-assist-trigger-on") ?? false,
      triggers: triggers.map((el) => ({
        id: el.id,
        hidden: el.hidden,
        display: getComputedStyle(el).display,
        inert: el.hasAttribute("inert")
      }))
    };
  });
}

function assertRoute(label, state, expectVisible) {
  const anyVisible = state.triggers.some((t) => !t.hidden && t.display !== "none");
  const allHidden = state.triggers.every((t) => t.hidden || t.display === "none");
  const ok = expectVisible ? anyVisible && state.isTriggerVisible && state.shellClassOn : allHidden && !state.isTriggerVisible && !state.shellClassOn;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  console.log(`  hash=${state.hash} isTriggerVisible=${state.isTriggerVisible} shellClassOn=${state.shellClassOn}`);
  state.triggers.forEach((t) => {
    console.log(`  #${t.id}: hidden=${t.hidden} display=${t.display}`);
  });
  if (!ok) {
    process.exitCode = 1;
  }
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const routes = [
  { hash: "#agentic-broker", expectVisible: true },
  { hash: "#dashboard", expectVisible: false },
  { hash: "#klearhub-visibility", expectVisible: false }
];

for (const route of routes) {
  await page.goto(`${baseUrl}${route.hash}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => window.KNAssistCore?.syncTriggerVisibility, { timeout: 15000 });
  await page.waitForFunction(
    (expectVisible) => {
      const on = window.KNAssistCore?.isTriggerVisible?.();
      const shellOn = document.querySelector(".app-shell")?.classList.contains("ai-assist-trigger-on");
      return Boolean(on) === expectVisible && Boolean(shellOn) === expectVisible;
    },
    { timeout: 5000 },
    route.expectVisible
  );
  const state = await triggerState(page);
  assertRoute(route.hash, state, route.expectVisible);
}

await browser.close();
console.log("\nDone.");
