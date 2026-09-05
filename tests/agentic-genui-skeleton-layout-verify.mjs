/**
 * Verify GenUI skeleton shape matches final table/card and layout shift is minimal.
 * Run: PORT=8082 node tests/agentic-genui-skeleton-layout-verify.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8082;
const manageServer = process.env.MANAGE_SERVER === "1";
const url = `http://localhost:${port}/index.html?v=${Date.now()}#agentic-broker`;

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
    }, 8000);
  });
}

function rect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    top: Math.round(r.top),
    left: Math.round(r.left),
    width: Math.round(r.width),
    height: Math.round(r.height),
    borderRadius: cs.borderRadius,
    borderWidth: cs.borderWidth,
    display: cs.display
  };
}

async function measureBlock(page) {
  return page.evaluate(() => {
    const assistant = document.querySelector("#agentic-thread-messages .agentic-thread-msg--assistant:last-child");
    const ring = assistant?.querySelector(".kn-genui__ring");
    const skeleton = assistant?.querySelector(".kn-genui__skeleton");
    const tableWrap = assistant?.querySelector(".kn-genui__table-wrap");
    const table = assistant?.querySelector(".kn-genui__table");
    const card = assistant?.querySelector(".kn-genui__card");
    const target = tableWrap || card || skeleton;
    const body = assistant?.querySelector(".ai-msg__body");

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        borderRadius: cs.borderRadius,
        borderWidth: cs.borderWidth,
        display: cs.display
      };
    };

    return {
      hasSkeleton: Boolean(skeleton),
      skeletonIsTableWrap: Boolean(skeleton?.classList.contains("kn-genui__table-wrap")),
      skeletonIsCard: Boolean(skeleton?.classList.contains("kn-genui__card")),
      skeletonRows: skeleton?.querySelectorAll(".kn-genui__skeleton-row").length ?? 0,
      skeletonCols: skeleton?.querySelectorAll(".kn-genui__table thead th").length ?? 0,
      hasTable: Boolean(table),
      hasRing: Boolean(ring),
      ringStatic: ring?.classList.contains("kn-genui__ring--static") ?? false,
      target: rect(target),
      tableWrap: rect(tableWrap),
      body: rect(body),
      message: rect(assistant)
    };
  });
}

async function main() {
  const puppeteer = await import("puppeteer").then((m) => m.default).catch(async () => {
    const { execSync } = await import("node:child_process");
    execSync("npm install puppeteer --no-save", { cwd: root, stdio: "inherit" });
    return (await import("puppeteer")).default;
  });

  let server = null;
  if (manageServer) {
    server = await startServer();
    await wait(300);
  }

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.KNAgenticBroker && window.KNGenUI), { timeout: 15000 });

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("[data-agentic-home-prompt], .kn-next-actions__chip")].find((el) =>
        (el.textContent || "").includes("Recent entries in my queue")
      );
      btn?.click();
    });
    await page.waitForSelector("#agentic-thread-messages:not([hidden])", { timeout: 15000 });

    const samples = [];
    let skeletonSample = null;

    for (let i = 0; i < 40; i += 1) {
      const sample = await measureBlock(page);
      samples.push({ t: i * 150, ...sample });
      if (sample.hasSkeleton && sample.target && !skeletonSample) {
        skeletonSample = { t: i * 150, ...sample };
      }
      if (sample.hasTable && !sample.hasSkeleton) {
        break;
      }
      await wait(150);
    }

    await page.waitForSelector("#agentic-thread-messages .kn-genui__table", { timeout: 30000 });
    await wait(1800);
    const finalSample = await measureBlock(page);

    const widthDelta =
      skeletonSample?.target && finalSample.target
        ? Math.abs(finalSample.target.width - skeletonSample.target.width)
        : null;
    const heightDelta =
      skeletonSample?.target && finalSample.target
        ? Math.abs(finalSample.target.height - skeletonSample.target.height)
        : null;
    const topDelta =
      skeletonSample?.target && finalSample.target
        ? Math.abs(finalSample.target.top - skeletonSample.target.top)
        : null;

    const checks = {
      capturedSkeletonPhase: Boolean(skeletonSample),
      skeletonUsesTableShell: Boolean(skeletonSample?.skeletonIsTableWrap),
      skeletonHasRows: (skeletonSample?.skeletonRows ?? 0) >= 3,
      skeletonHasCols: (skeletonSample?.skeletonCols ?? 0) >= 2,
      skeletonHasRing: Boolean(skeletonSample?.hasRing),
      finalTableRendered: Boolean(finalSample.hasTable),
      finalHasTableWrap: Boolean(finalSample.tableWrap),
      widthShiftUnder24px: widthDelta == null ? false : widthDelta <= 24,
      heightShiftUnder80px: heightDelta == null ? false : heightDelta <= 80,
      topShiftUnder8px: topDelta == null ? false : topDelta <= 8,
      sameBorderRadius:
        skeletonSample?.target?.borderRadius && finalSample.target?.borderRadius
          ? skeletonSample.target.borderRadius === finalSample.target.borderRadius ||
            (skeletonSample.target.borderRadius.includes("8") && finalSample.tableWrap?.borderRadius.includes("8"))
          : true
    };

    const report = {
      url,
      skeletonSample: skeletonSample
        ? {
            t: skeletonSample.t,
            target: skeletonSample.target,
            skeletonRows: skeletonSample.skeletonRows,
            skeletonCols: skeletonSample.skeletonCols,
            skeletonIsTableWrap: skeletonSample.skeletonIsTableWrap
          }
        : null,
      finalSample: {
        target: finalSample.target,
        tableWrap: finalSample.tableWrap,
        hasTable: finalSample.hasTable
      },
      deltas: { widthDelta, heightDelta, topDelta },
      checks,
      pass: Object.values(checks).every(Boolean)
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server?.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
