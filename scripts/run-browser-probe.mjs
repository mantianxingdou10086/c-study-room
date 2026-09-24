/**
 * 用 Playwright 打开探针页并把日志打出来（M1 调试用）。
 * 用法：PROBE_URL=http://127.0.0.1:3100/dev/runner-probe node scripts/run-browser-probe.mjs
 * 会额外记录：失败的请求、worker 生命周期、控制台错误——用来判断 SDK 自带的 worker 有没有起来。
 */
import { chromium } from "@playwright/test";

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:3100/dev/runner-probe";

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

page.on("console", (m) => {
  const t = m.text();
  if (!t.includes("Download the React DevTools")) console.log(`[console:${m.type()}] ${t}`);
});
page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) =>
  console.log(`[requestfailed] ${r.method()} ${r.url().slice(0, 140)} → ${r.failure()?.errorText}`),
);
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`[http ${r.status()}] ${r.url().slice(0, 140)}`);
});
page.on("worker", (w) => console.log(`[worker+] ${w.url().slice(0, 160)}`));
context.on("weberror", (e) => console.log(`[weberror] ${e.error()?.message}`));

console.log(`打开 ${URL} …`);
await page.goto(URL, { waitUntil: "domcontentloaded" });

try {
  await page.waitForFunction(
    () => document.querySelector('[data-testid="probe-done"]')?.textContent === "DONE",
    { timeout: 420_000 },
  );
} catch {
  console.log("等待超时，打印当前已有日志：");
}

const log = await page.locator('[data-testid="probe-log"]').innerText();
console.log("\n================ 探针日志 ================\n" + log + "\n=========================================");

await browser.close();
