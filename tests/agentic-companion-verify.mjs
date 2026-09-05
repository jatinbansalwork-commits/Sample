/**
 * Verify context companion panel resolves topics and opens split view.
 * Run: node tests/agentic-companion-verify.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8767;

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
    await page.goto(`http://localhost:${port}/index.html#agentic`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.KNAgenticCompanion?.resolve);

    const cases = [
      { text: "Recent entries in my queue", kind: "queue", titleIncludes: "queue" },
      { text: "What is the shipment status for KX-M3Q8-21?", kind: "visibility", titleIncludes: "visibility" },
      { text: "Entry 74-8823019 on CBP hold", kind: "entry", titleIncludes: "74-8823019" },
      { text: "Today's statements due for ACH", kind: "statements", titleIncludes: "statements" }
    ];

    for (const item of cases) {
      const ctx = await page.evaluate(
        (prompt) =>
          window.KNAgenticCompanion.resolve({
            title: prompt,
            messages: [
              { senderType: "self", text: prompt },
              { senderType: "other", text: "Sample assistant reply." }
            ]
          }),
        item.text
      );
      if (ctx.kind !== item.kind) {
        throw new Error(`Expected kind "${item.kind}" for "${item.text}", got "${ctx.kind}"`);
      }
      if (!String(ctx.title || "").toLowerCase().includes(item.titleIncludes)) {
        throw new Error(`Expected title to include "${item.titleIncludes}" for "${item.text}", got "${ctx.title}"`);
      }
    }

    await page.evaluate(() => {
      window.KNAgenticBroker?.newChat?.();
    });
    await wait(200);

    await page.evaluate(() => {
      const thread = {
        id: "test-companion",
        title: "Recent entries in my queue",
        messages: [
          { senderType: "self", text: "Recent entries in my queue" },
          { senderType: "other", text: "Here are the entries in your working queue." }
        ]
      };
      window.KNAgenticCompanion.sync({ thread });
      window.KNAgenticCompanion.toggle({ thread, force: true });
    });
    await wait(300);

    const openState = await page.evaluate(() => ({
      companionOpen: !document.getElementById("agentic-thread-companion")?.hidden,
      threadHasClass: document.getElementById("agentic-thread")?.classList.contains("is-companion-open"),
      bodyHasQueueTable: Boolean(document.querySelector("#agentic-thread-companion-body .agentic-companion-queue table tbody tr")),
      title: document.getElementById("agentic-thread-companion-title")?.textContent?.trim() || "",
      hasCloseButton: Boolean(document.getElementById("agentic-thread-companion-close"))
    }));

    if (!openState.companionOpen || !openState.threadHasClass) {
      throw new Error("Companion panel did not open");
    }
    if (openState.hasCloseButton) {
      throw new Error("Companion close button should be removed");
    }
    if (!openState.bodyHasQueueTable) {
      throw new Error("Queue companion body did not render table rows");
    }
    if (!openState.title.toLowerCase().includes("queue")) {
      throw new Error(`Companion title unexpected: "${openState.title}"`);
    }

    console.log("PASS: agentic companion context + split panel");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
