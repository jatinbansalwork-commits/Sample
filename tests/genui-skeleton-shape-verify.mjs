/**
 * Verify GenUI typed skeletons match final TABLE/CARD shell geometry.
 * Run: PORT=8082 node tests/genui-skeleton-shape-verify.mjs
 */
import puppeteer from "puppeteer";

const port = Number(process.env.PORT) || 8082;
const url = `http://localhost:${port}/index.html?v=skeleton-verify-${Date.now()}#agentic-broker`;

function rect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    width: Math.round(r.width),
    height: Math.round(r.height),
    top: Math.round(r.top),
    left: Math.round(r.left),
    borderRadius: cs.borderRadius,
    borderWidth: cs.borderWidth
  };
}

async function runCase(page, name, skeletonSchema, finalSchema) {
  return page.evaluate(async (caseName, skSchema, finSchema) => {
    const host = document.createElement("div");
    host.id = `verify-${caseName}`;
    host.style.width = "720px";
    document.body.appendChild(host);

    const measure = () => {
      const skeleton = host.querySelector(".kn-genui__skeleton");
      const tableWrap = host.querySelector(".kn-genui__table-wrap:not(.kn-genui__skeleton)");
      const card = host.querySelector(".kn-genui__card:not(.kn-genui__skeleton)");
      const target = skeleton || tableWrap || card;
      return {
        hasSkeleton: Boolean(skeleton),
        skeletonIsTableWrap: skeleton?.classList.contains("kn-genui__table-wrap") || false,
        skeletonIsCard: skeleton?.classList.contains("kn-genui__card") || false,
        skeletonRows: skeleton?.querySelectorAll(".kn-genui__skeleton-row").length || 0,
        skeletonCols: skeleton?.querySelectorAll(".kn-genui__table thead th").length || 0,
        hasTable: Boolean(host.querySelector(".kn-genui__table")),
        hasCard: Boolean(card),
        target: target
          ? {
              width: Math.round(target.getBoundingClientRect().width),
              height: Math.round(target.getBoundingClientRect().height),
              top: Math.round(target.getBoundingClientRect().top),
              left: Math.round(target.getBoundingClientRect().left),
              borderRadius: getComputedStyle(target).borderRadius,
              borderWidth: getComputedStyle(target).borderWidth
            }
          : null,
        tableWrap: tableWrap
          ? {
              width: Math.round(tableWrap.getBoundingClientRect().width),
              height: Math.round(tableWrap.getBoundingClientRect().height),
              top: Math.round(tableWrap.getBoundingClientRect().top),
              left: Math.round(tableWrap.getBoundingClientRect().left),
              borderRadius: getComputedStyle(tableWrap).borderRadius,
              borderWidth: getComputedStyle(tableWrap).borderWidth
            }
          : null,
        card: card
          ? {
              width: Math.round(card.getBoundingClientRect().width),
              height: Math.round(card.getBoundingClientRect().height),
              top: Math.round(card.getBoundingClientRect().top),
              borderRadius: getComputedStyle(card).borderRadius
            }
          : null
      };
    };

    window.KNGenUI.mount(host, skSchema, {
      animate: false,
      skeletonUntilComplete: true
    });
    const skeletonPhase = measure();
    window.KNGenUI.mount(host, finSchema, { animate: false });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const finalPhase = measure();
    host.remove();

    const skeletonTarget = skeletonPhase.target;
    const finalTarget = finalPhase.tableWrap || finalPhase.card;
    const widthDelta = skeletonTarget && finalTarget ? Math.abs(finalTarget.width - skeletonTarget.width) : null;
    const heightDelta = skeletonTarget && finalTarget ? Math.abs(finalTarget.height - skeletonTarget.height) : null;
    const topDelta = skeletonTarget && finalTarget ? Math.abs(finalTarget.top - skeletonTarget.top) : null;

    return {
      caseName,
      skeletonPhase,
      finalPhase,
      deltas: { widthDelta, heightDelta, topDelta }
    };
  }, name, skeletonSchema, finalSchema);
}

const tableSchema = {
  components: [
    {
      component: "TABLE",
      headers: ["Entry", "Company", "Total due", "Duty", "Status"],
      rows: [
        ["74-8823019", "Acme Corp", "$1,240.00", "$980.00", "Pending"],
        ["74-8823020", "Globex LLC", "$860.00", "$610.00", "Ready"],
        ["74-8823021", "Initech", "$420.00", "$300.00", "Pending"]
      ]
    }
  ]
};

const tableSkeletonSchema = {
  components: [{ component: "TABLE", headers: ["Entry", "Company", "Total due", "Duty", "Status"], rows: [] }]
};

const cardSchema = {
  components: [
    {
      component: "CARD",
      title: "3",
      description: "Entries in progress",
      children: [{ component: "BADGE", text: "Working queue", color: "notice" }]
    }
  ]
};

const cardSkeletonSchema = {
  components: [{ component: "CARD", children: [] }]
};

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.KNGenUI?.mount), {
    timeout: 15000
  });

  const tableResult = await runCase(page, "table", tableSkeletonSchema, tableSchema);
  const cardResult = await runCase(page, "card", cardSkeletonSchema, cardSchema);

  function evaluate(result, { table = false, card = false } = {}) {
    const s = result.skeletonPhase;
    const f = result.finalPhase;
    const d = result.deltas;
    const checks = {
      skeletonCaptured: s.hasSkeleton,
      skeletonUsesTableShell: table ? s.skeletonIsTableWrap : true,
      skeletonUsesCardShell: card ? s.skeletonIsCard : true,
      skeletonHasRows: table ? s.skeletonRows >= 3 : true,
      skeletonHasCols: table ? s.skeletonCols >= 2 : true,
      finalRendered: table ? f.hasTable : f.hasCard,
      widthShiftUnder24px: d.widthDelta == null ? false : d.widthDelta <= 24,
      heightShiftUnder80px: d.heightDelta == null ? false : d.heightDelta <= 80,
      topShiftUnder8px: d.topDelta == null ? false : d.topDelta <= 8,
      sameBorderRadius:
        s.target?.borderRadius && (f.tableWrap || f.card)
          ? s.target.borderRadius === (f.tableWrap || f.card).borderRadius
          : true
    };
    return { ...result, checks, pass: Object.values(checks).every(Boolean) };
  }

  const report = {
    table: evaluate(tableResult, { table: true }),
    card: evaluate(cardResult, { card: true }),
    pass: false
  };
  report.pass = report.table.pass && report.card.pass;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
