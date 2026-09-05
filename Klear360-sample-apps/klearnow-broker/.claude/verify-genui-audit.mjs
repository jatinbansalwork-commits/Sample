import puppeteer from "../.claude/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js";

const URL = "http://localhost:8080/index.html#agentic-broker";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--window-size=1280,900"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const results = {};

try {
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.KNAgenticBroker), { timeout: 10000 });

  // Fresh ask — "Recent entries in my queue"
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("[data-agentic-home-prompt]")].find((el) =>
      el.textContent.includes("Recent entries in my queue")
    );
    btn?.click();
  });
  await page.waitForSelector("#agentic-thread:not([hidden])", { timeout: 10000 });

  const mountCounts = [];
  await page.exposeFunction("recordMount", () => mountCounts.push(Date.now()));
  await page.evaluate(() => {
    const orig = window.KNGenUI?.mount;
    if (!orig) return;
    window.KNGenUI.mount = (...args) => {
      window.recordMount();
      return orig(...args);
    };
  });

  await page.waitForSelector("#agentic-thread-messages .kn-genui", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3500));

  const freshAsk = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    const assistant = messages?.querySelector(".agentic-thread-msg--assistant:last-child");
    const bubble = assistant?.querySelector(".ai-msg__body");
    const ring = assistant?.querySelector("[data-kn-genui-ring]");
    const table = assistant?.querySelector(".kn-genui__table");
    const glow = ring ? getComputedStyle(ring.querySelector(".kn-genui__ring-glow") || ring) : null;
    const gap = messages ? getComputedStyle(messages).gap : null;
    const fontSize = bubble ? getComputedStyle(bubble).fontSize : null;
    const row = assistant?.querySelector(".kn-chat-msg__row");
    const avatarInRow = Boolean(assistant?.querySelector(".kn-chat-msg__row .agentic-thread-msg__avatar"));
    return {
      hasRing: Boolean(ring),
      ringSettled: ring?.classList.contains("is-settled") ?? false,
      hasTable: Boolean(table),
      genuiHosts: messages?.querySelectorAll("[data-kn-genui]").length ?? 0,
      gap,
      fontSize,
      avatarInRow,
      hasRow: Boolean(row),
      glowUsesPurple: glow?.backgroundImage?.includes("conic-gradient") ?? false
    };
  });

  results.freshAsk = { ...freshAsk, mountCount: mountCounts.length };

  // Restore from sidebar — open same thread via history after new chat
  await page.evaluate(() => {
    const title = document.getElementById("agentic-thread-title")?.textContent?.trim() || "";
    window.__restoreTitle = title;
  });

  await page.evaluate(() => {
    document.querySelector("[data-agentic-new-chat]")?.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const restored = await page.evaluate(() => {
    const title = window.__restoreTitle || "";
    const item = [...document.querySelectorAll("[data-agentic-chat-item]")].find((el) =>
      el.textContent.includes(title.slice(0, 20))
    );
    item?.click();
    return { clicked: Boolean(item), title };
  });
  await page.waitForSelector("#agentic-thread-messages .kn-genui", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1800));

  const afterRestore = await page.evaluate(() => {
    const assistant = document.querySelector("#agentic-thread-messages .agentic-thread-msg--assistant");
    const ring = assistant?.querySelector("[data-kn-genui-ring]");
    return {
      clicked: true,
      hasRing: Boolean(ring),
      ringAnimating: ring ? getComputedStyle(ring.querySelector(".kn-genui__ring-glow") || ring).animationName !== "none" : false,
      ringSettled: ring?.classList.contains("is-settled") ?? false
    };
  });

  results.restore = { ...restored, ...afterRestore };

  const pass =
    results.freshAsk.hasRing &&
    results.freshAsk.hasTable &&
    results.freshAsk.genuiHosts === 1 &&
    results.freshAsk.avatarInRow &&
    results.freshAsk.hasRow &&
    results.freshAsk.gap === "8px" &&
    parseFloat(results.freshAsk.fontSize) >= 13 &&
    results.restore.hasRing;

  results.pass = pass;
  console.log(JSON.stringify(results, null, 2));
  if (!pass) process.exitCode = 1;
} catch (error) {
  console.error("VERIFY_FAIL", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
