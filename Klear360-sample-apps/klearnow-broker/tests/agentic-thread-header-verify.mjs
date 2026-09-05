/**
 * Verify agentic thread title placement vs message column and composer.
 * Run: node tests/agentic-thread-header-verify.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8766;
const chatId = "chat-07";

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
      title: rect(title),
      thread: rect(thread),
      messages: rect(messages),
      composer: rect(composer),
      assistantBody: rect(firstAssistant),
      titleLeftDeltaFromComposer: title && composer ? Math.round(title.getBoundingClientRect().left - composer.getBoundingClientRect().left) : null,
      titleLeftDeltaFromThread: title && thread ? Math.round(title.getBoundingClientRect().left - thread.getBoundingClientRect().left) : null,
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
    const alignOk = data.titleLeftDeltaFromComposer === 0;
    const maxWidthMatch = data.threadMaxWidth === data.homeInnerMaxWidth;

    console.log(`Top offset from nav bottom: ${topGap}px (target spacing.6 = 20px)`);
    console.log(`Title vs composer left delta: ${data.titleLeftDeltaFromComposer}px (target 0)`);
    console.log(`Thread max-width: ${data.threadMaxWidth}, home inner: ${data.homeInnerMaxWidth}`);

    if (Math.abs(topGap - 20) > 2) {
      throw new Error(`Top offset ${topGap}px is not ~20px (spacing.6 below TopNav)`);
    }
    if (!alignOk) {
      throw new Error(`Title left edge differs from composer by ${data.titleLeftDeltaFromComposer}px`);
    }
    if (!maxWidthMatch) {
      throw new Error(`Thread max-width (${data.threadMaxWidth}) does not match home inner (${data.homeInnerMaxWidth})`);
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
