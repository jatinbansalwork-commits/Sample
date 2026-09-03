/**
 * Verify seeded sidebar chats stay in their date bucket after read-only open.
 * Run: node tests/chat-history-open-verify.mjs
 * Requires: static server on PORT (default 8765), puppeteer (npx puppeteer).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8765;
const chatId = "chat-07";
const expectedGroup = "This month";

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
      if (!ready) {
        reject(new Error("Static server did not start in time"));
      }
    }, 5000);
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
    await page.goto(`http://localhost:${port}/#agentic-broker`, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      localStorage.removeItem("kn-agentic-threads-v1");
      localStorage.removeItem("kn-agentic-active-v1");
    });
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(`[data-chat-id="${chatId}"] [data-agentic-chat-item]`);

    const before = await page.evaluate((id) => {
      const row = document.querySelector(`[data-chat-id="${id}"]`);
      const group = row?.closest("[data-chat-group]");
      return group?.querySelector(".side-nav-chat-group__label")?.textContent?.trim() || "";
    }, chatId);

    await page.click(`[data-chat-id="${chatId}"] [data-agentic-chat-item]`);
    await wait(400);

    const after = await page.evaluate((id) => {
      const row = document.querySelector(`[data-chat-id="${id}"]`);
      const group = row?.closest("[data-chat-group]");
      const store = JSON.parse(localStorage.getItem("kn-agentic-threads-v1") || "null");
      const thread = store?.threads?.find((item) => item.id === id);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const day = new Date(thread?.updatedAt || 0);
      day.setHours(0, 0, 0, 0);
      const daysAgo = Math.max(0, Math.round((start.getTime() - day.getTime()) / 86400000));
      return {
        groupLabel: group?.querySelector(".side-nav-chat-group__label")?.textContent?.trim() || "",
        daysAgo,
        hasThread: Boolean(thread)
      };
    }, chatId);

    console.log(`Before click: "${before}"`);
    console.log(`After click:  "${after.groupLabel}" (daysAgo=${after.daysAgo}, persisted=${after.hasThread})`);

    if (before !== expectedGroup) {
      throw new Error(`Precondition failed: expected "${chatId}" in "${expectedGroup}", found "${before}"`);
    }
    if (after.groupLabel !== before) {
      throw new Error(`Regression: group moved from "${before}" to "${after.groupLabel}" on read-only open`);
    }
    if (after.daysAgo === 0) {
      throw new Error("Regression: updatedAt was bumped to today on read-only open");
    }

    console.log("PASS: read-only open preserves sidebar date bucket");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
