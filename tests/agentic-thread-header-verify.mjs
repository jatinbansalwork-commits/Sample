/**
 * Verify agentic thread title placement vs message column and composer.
 * Run: node tests/agentic-thread-header-verify.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8766;
const chatId = "chat-02";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, ".claude/static-server.mjs")], {
      cwd: root,
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let ready = false;
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (!ready && text.includes(`localhost:${port}`)) {
        ready = true;
        resolve(child);
      }
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    setTimeout(() => {
      if (!ready) reject(new Error("Static server did not start in time"));
    }, 5000);
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const title = document.getElementById("agentic-thread-title");
    const header = document.getElementById("agentic-thread-header");
    const headerBar = document.querySelector(".agentic-thread__header-bar");
    const favorite = document.getElementById("agentic-thread-favorite");
    const thread = document.getElementById("agentic-thread");
    const messages = document.getElementById("agentic-thread-messages");
    const composer = document.querySelector("#agentic-thread .kn-chat-input__card");
    const firstAssistant = messages?.querySelector(".agentic-thread-msg--assistant .ai-msg__body");
    const topNav = document.querySelector(".top-nav");

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        paddingTop: cs.paddingTop,
        paddingLeft: cs.paddingLeft,
        maxWidth: cs.maxWidth
      };
    };

    return {
      topNav: rect(topNav),
      header: rect(header),
      headerBar: rect(headerBar),
      title: rect(title),
      favorite: rect(favorite),
      thread: rect(thread),
      messages: rect(messages),
      composer: rect(composer),
      assistantBody: rect(firstAssistant),
      titleLeftDeltaFromComposer: title && composer ? Math.round(title.getBoundingClientRect().left - composer.getBoundingClientRect().left) : null,
      headerLeftDeltaFromComposer: headerBar && composer ? Math.round(headerBar.getBoundingClientRect().left - composer.getBoundingClientRect().left) : null,
      headerWidthDeltaFromThread: header && thread ? Math.round(header.getBoundingClientRect().width - thread.getBoundingClientRect().width) : null,
      titleLeftDeltaFromThread: title && thread ? Math.round(title.getBoundingClientRect().left - thread.getBoundingClientRect().left) : null,
      headerHasFavorite: Boolean(favorite),
      threadMaxWidth: thread ? getComputedStyle(thread).maxWidth : null,
      homeInnerMaxWidth: document.querySelector(".agentic-home__inner")?.style.maxWidth || getComputedStyle(document.querySelector(".agentic-home__inner") || document.body).maxWidth
    };
  });
}

async function main() {
  const puppeteer = await import("puppeteer").then((m) => m.default).catch(async () => {
    const { execSync } = await import("node:child_process");
    execSync("npm install puppeteer --no-save", { cwd: root, stdio: "inherit" });
    return (await import("puppeteer")).default;
  });

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`http://localhost:${port}/index.html#agentic-broker`, { waitUntil: "networkidle0" });
    await page.waitForSelector(`[data-chat-id="${chatId}"] [data-agentic-chat-item]`);
    await page.click(`[data-chat-id="${chatId}"] [data-agentic-chat-item]`);
    await page.waitForSelector("#agentic-thread:not([hidden]) #agentic-thread-title");
    await wait(500);

    const data = await measure(page);
    console.log(JSON.stringify(data, null, 2));

    const topGap = data.title.top - (data.topNav?.top + data.topNav?.height);
    const headerFullWidth = data.headerWidthDeltaFromThread === 0;
    const headerBarFullWidth =
      data.headerBar && data.thread
        ? Math.abs(data.headerBar.width - data.thread.width) <= 2
        : false;
    const headerBarLeftAligned =
      data.headerBar && data.thread
        ? Math.abs(data.headerBar.left - data.thread.left) <= 2
        : false;
    const maxWidthMatch = data.threadMaxWidth === "none" || data.threadMaxWidth === "100%";

    console.log(`Top offset from nav bottom: ${topGap}px (target spacing.3 = 8px)`);
    console.log(`Header vs thread width delta: ${data.headerWidthDeltaFromThread}px (target 0)`);
    console.log(`Header bar vs thread width delta: ${data.headerBar && data.thread ? data.headerBar.width - data.thread.width : "n/a"}px (target 0)`);
    console.log(`Header bar vs thread left delta: ${data.headerBar && data.thread ? data.headerBar.left - data.thread.left : "n/a"}px (target 0)`);
    console.log(`Title vs composer left delta: ${data.titleLeftDeltaFromComposer}px`);
    console.log(`Thread max-width: ${data.threadMaxWidth}, home inner: ${data.homeInnerMaxWidth}`);

    if (!data.headerHasFavorite) {
      throw new Error("Thread header is missing favorite control");
    }
    if (data.favorite && data.title && data.favorite.left >= data.title.left) {
      throw new Error("Favorite control should appear before the title");
    }
    if (data.favorite && data.title && Math.abs(data.favorite.top - data.title.top) > 4) {
      throw new Error(`Favorite control is not vertically aligned with title (${data.favorite.top - data.title.top}px delta)`);
    }

    if (Math.abs(topGap - 8) > 2) {
      throw new Error(`Top offset ${topGap}px is not ~8px (spacing.3 below TopNav)`);
    }
    if (!headerFullWidth) {
      throw new Error(`Header width differs from thread by ${data.headerWidthDeltaFromThread}px`);
    }
    if (!headerBarFullWidth) {
      throw new Error(
        `Header bar width differs from thread by ${data.headerBar && data.thread ? data.headerBar.width - data.thread.width : "unknown"}px`
      );
    }
    if (!headerBarLeftAligned) {
      throw new Error(
        `Header bar left edge differs from thread by ${data.headerBar && data.thread ? data.headerBar.left - data.thread.left : "unknown"}px`
      );
    }
    if (!maxWidthMatch) {
      throw new Error(`Thread max-width (${data.threadMaxWidth}) is not full width`);
    }

    console.log("PASS: agentic thread header placement");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
