import puppeteer from "../.claude/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js";

const URL = "http://localhost:8080/index.html#agentic-broker";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--window-size=1280,900"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

try {
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.KNAgenticBroker), { timeout: 10000 });

  const openChat = async (promptText) => {
    await page.evaluate((text) => {
      const btn = [...document.querySelectorAll("[data-agentic-home-prompt]")].find((el) =>
        el.textContent.includes(text)
      );
      btn?.click();
    }, promptText);
    await page.waitForSelector("#agentic-thread:not([hidden])", { timeout: 10000 });
  };

  await openChat("Recent entries in my queue");

  const duringEnter = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    const rows = [...messages.querySelectorAll(".agentic-thread-msg")];
    return rows.map((row) => ({
      role: row.classList.contains("agentic-thread-msg--user") ? "user" : "assistant",
      rowEntering: row.classList.contains("is-entering"),
      rowAnimation: getComputedStyle(row).animationName,
      chatAnimation: getComputedStyle(row.querySelector(".kn-chat-msg, .ai-msg")).animationName
    }));
  });

  await page.waitForSelector("#agentic-thread-messages .kn-genui", { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2500));

  const afterFirst = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    const rows = [...messages.querySelectorAll(".agentic-thread-msg")];
    const styles = rows.map((row) => {
      const chat = row.querySelector(".kn-chat-msg, .ai-msg");
      return {
        role: row.classList.contains("agentic-thread-msg--user") ? "user" : "assistant",
        rowEntering: row.classList.contains("is-entering"),
        chatAnimation: chat ? getComputedStyle(chat).animationName : null,
        rowAnimation: getComputedStyle(row).animationName
      };
    });
    return {
      count: rows.length,
      styles,
      scrollTop: messages.scrollTop,
      nearBottom:
        messages.scrollHeight - messages.clientHeight - messages.scrollTop <= 80
    };
  });

  const scrollUpCheck = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    messages.scrollTop = 0;
    const before = messages.scrollTop;
    const prompt = document.getElementById("agentic-thread-input");
    prompt.value = "My Working List";
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("agentic-thread-form")?.requestSubmit();
    return { scrolledUp: before === 0 };
  });

  await page.waitForFunction(
    () => document.querySelectorAll("#agentic-thread-messages .agentic-thread-msg").length >= 4,
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 1200));

  const afterSecondWhileScrolledUp = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    const last = messages.querySelector(".agentic-thread-msg:last-child");
    return {
      scrollTop: messages.scrollTop,
      stayedScrolledUp: messages.scrollTop < 40,
      lastHadEnter: last?.classList.contains("is-entering") ?? false,
      lastAnimation: last ? getComputedStyle(last).animationName : null
    };
  });

  await page.evaluate(() => {
    document.getElementById("agentic-thread-messages").scrollTop =
      document.getElementById("agentic-thread-messages").scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 400));

  const historyCheck = await page.evaluate(() => {
    const item = [...document.querySelectorAll("[data-agentic-chat-item]")].find((el) =>
      /my working list/i.test(el.textContent || "")
    );
    if (!item) {
      return { clicked: false, titles: [...document.querySelectorAll("[data-agentic-chat-item]")].map((el) => el.textContent.trim()) };
    }
    item.click();
    return { clicked: true, title: item.textContent.trim() };
  });
  await new Promise((r) => setTimeout(r, 800));

  const afterHistoryRestore = await page.evaluate(() => {
    const messages = document.getElementById("agentic-thread-messages");
    const rows = [...messages.querySelectorAll(".agentic-thread-msg")];
    return {
      count: rows.length,
      anyEntering: rows.some((row) => row.classList.contains("is-entering")),
      chatAnimations: rows.map((row) => getComputedStyle(row.querySelector(".kn-chat-msg, .ai-msg") || row).animationName),
      title: document.getElementById("agentic-thread-title")?.textContent?.trim() || ""
    };
  });

  const reducedMotion = await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  void reducedMotion;
  await page.evaluate(() => {
    const prompt = document.getElementById("agentic-thread-input");
    prompt.value = "All items due today";
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("agentic-thread-form")?.requestSubmit();
  });
  await new Promise((r) => setTimeout(r, 500));

  const reducedCheck = await page.evaluate(() => {
    const last = document.querySelector("#agentic-thread-messages .agentic-thread-msg:last-child");
    return {
      entering: last?.classList.contains("is-entering") ?? false,
      animation: last ? getComputedStyle(last).animationName : null
    };
  });

  const pass =
    duringEnter.some((s) => s.rowEntering || s.rowAnimation === "kn-agentic-thread-msg-enter") &&
    afterFirst.count >= 2 &&
    afterFirst.styles.every((s) => s.chatAnimation === "none") &&
    afterFirst.nearBottom &&
    scrollUpCheck.scrolledUp &&
    afterSecondWhileScrolledUp.stayedScrolledUp &&
    historyCheck.clicked &&
    afterHistoryRestore.count >= 2 &&
    !afterHistoryRestore.anyEntering &&
    afterHistoryRestore.chatAnimations.every((name) => name === "none") &&
    reducedCheck.animation === "none";

  console.log(
    JSON.stringify(
      {
        pass,
        duringEnter,
        afterFirst,
        scrollUpCheck,
        afterSecondWhileScrolledUp,
        historyCheck,
        afterHistoryRestore,
        reducedCheck
      },
      null,
      2
    )
  );
  if (!pass) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("VERIFY_FAIL", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
