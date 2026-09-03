/**
 * Verify the agentic thread message list scrolls up through history.
 * Run: node tests/agentic-thread-scroll-verify.mjs
 * Requires: static server on PORT (default 8080), puppeteer in .claude/node_modules.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8080;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPuppeteer() {
  try {
    return (await import("puppeteer")).default;
  } catch {
    return (await import(path.join(root, ".claude/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js"))).default;
  }
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
      if (!ready) {
        reject(new Error("Static server did not start in time"));
      }
    }, 5000);
  });
}

async function main() {
  const puppeteer = await loadPuppeteer();
  let server;
  try {
    server = await startServer();
  } catch (error) {
    if (String(error.message || error).includes("did not start")) {
      server = null;
    } else {
      throw error;
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`http://localhost:${port}/index.html#agentic-broker`, { waitUntil: "networkidle0" });

    await page.evaluate(() => {
      const pill = [...document.querySelectorAll("[data-agentic-home-prompt]")].find((node) =>
        node.textContent.includes("Today's Statements")
      );
      pill?.click();
    });
    await page.waitForSelector("#agentic-thread-messages .kn-genui", { timeout: 15000 });
    await wait(2000);

    const result = await page.evaluate(() => {
      const messages = document.getElementById("agentic-thread-messages");
      if (!messages) {
        return { ok: false, reason: "messages container missing" };
      }

      for (let i = 0; i < 8; i += 1) {
        const row = document.createElement("div");
        row.className = "agentic-thread-msg agentic-thread-msg--user";
        row.innerHTML = `<article class="ai-msg ai-msg--user"><div class="ai-msg__body"><p>Earlier message ${i} ${"word ".repeat(40)}</p></div></article>`;
        messages.insertBefore(row, messages.firstChild);
      }

      const maxScroll = messages.scrollHeight - messages.clientHeight;
      if (maxScroll <= 0) {
        return {
          ok: false,
          reason: "messages list is not scrollable",
          scrollHeight: messages.scrollHeight,
          clientHeight: messages.clientHeight
        };
      }

      messages.scrollTop = maxScroll;
      const atBottom = messages.scrollTop;
      messages.scrollTop = 0;
      const atTop = messages.scrollTop;

      const firstRect = messages.firstElementChild?.getBoundingClientRect();
      const containerRect = messages.getBoundingClientRect();
      const firstVisible = Boolean(firstRect && firstRect.top >= containerRect.top - 2);

      return {
        ok: atTop === 0 && atBottom > 0 && firstVisible,
        maxScroll,
        atBottom,
        atTop,
        firstVisible,
        firstLabel: messages.firstElementChild?.textContent?.trim().slice(0, 40) || ""
      };
    });

    console.log(JSON.stringify(result, null, 2));

    if (!result.ok) {
      throw new Error(result.reason || "Thread scroll verification failed");
    }

    console.log("PASS: agentic thread scrolls up to earlier messages");
  } finally {
    await browser.close();
    server?.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
