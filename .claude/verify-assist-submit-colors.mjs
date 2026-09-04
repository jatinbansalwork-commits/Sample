import puppeteer from "puppeteer";

const url = "http://localhost:8080/index.html?v=434#agentic-broker";
const PURPLE = "#6c5dd3";
const PURPLE_HOVER = "#5648b8";
const NAVY = "#003f5b";

function rgbToHex(rgb) {
  if (!rgb || rgb === "transparent") return rgb;
  if (rgb.startsWith("#")) return rgb.toLowerCase();
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb;
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function probeButton(btn) {
  if (!btn) return { found: false };
  const cs = getComputedStyle(btn);
  return {
    found: true,
    disabled: btn.disabled,
    classes: btn.className,
    background: rgbToHex(cs.backgroundColor),
    color: rgbToHex(cs.color),
    opacity: cs.opacity,
  };
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".agentic-home__send.kn-chat-input__submit", { timeout: 15000 });

const homeEmpty = await page.evaluate(probeButton, await page.$("#agentic-home-form .agentic-home__send"));

await page.type("#agentic-home-input", "test message");
const homeEnabled = await page.evaluate(probeButton, await page.$("#agentic-home-form .agentic-home__send"));

await page.hover("#agentic-home-form .agentic-home__send");
const homeHover = await page.evaluate(probeButton, await page.$("#agentic-home-form .agentic-home__send"));

await page.evaluate(() => {
  document.querySelectorAll(".ai-assistant-trigger").forEach((el) => {
    el.hidden = false;
    el.removeAttribute("hidden");
  });
  document.documentElement.classList.add("ai-assist-trigger-on");
  document.querySelector(".app-shell")?.classList.add("ai-assist-trigger-on");
});
await page.click("#ai-assistant-trigger");
await page.waitForSelector("#ai-assistant-panel:not([hidden])", { timeout: 5000 });

const panelEmpty = await page.evaluate(probeButton, await page.$("#ai-assistant-send"));
await page.type("#ai-assistant-input", "panel test");
const panelEnabled = await page.evaluate(probeButton, await page.$("#ai-assistant-send"));

const pass = {
  homeEmptyGray: homeEmpty.found && homeEmpty.disabled && homeEmpty.background !== NAVY && homeEmpty.background !== PURPLE,
  homeEnabledPurple: homeEnabled.found && !homeEnabled.disabled && homeEnabled.background === PURPLE,
  homeHoverDarkerPurple: homeHover.found && homeHover.background === PURPLE_HOVER,
  homeEnabledNotNavy: homeEnabled.background !== NAVY,
  panelEmptyGray: panelEmpty.found && panelEmpty.disabled && panelEmpty.background !== NAVY && panelEmpty.background !== PURPLE,
  panelEnabledPurple: panelEnabled.found && !panelEnabled.disabled && panelEnabled.background === PURPLE,
  panelEnabledNotNavy: panelEnabled.background !== NAVY,
};

console.log(
  JSON.stringify(
    {
      url,
      expected: { enabled: PURPLE, hover: PURPLE_HOVER, navyWrong: NAVY },
      probes: { homeEmpty, homeEnabled, homeHover, panelEmpty, panelEnabled },
      pass,
      allPass: Object.values(pass).every(Boolean),
    },
    null,
    2
  )
);

await browser.close();
process.exit(Object.values(pass).every(Boolean) ? 0 : 1);
