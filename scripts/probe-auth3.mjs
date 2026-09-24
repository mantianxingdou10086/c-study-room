/**
 * 用与 e2e 测试**完全相同**的条件复现注册流程（含 devices["Desktop Chrome"] 设备模拟），
 * 逐秒观察 URL 变化。
 * 用法：node scripts/probe-auth3.mjs
 */
import { chromium, devices } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const STAMP = Date.now();
const EMAIL = `p3-${STAMP}@example.invalid`;
const USERNAME = `p3_${STAMP}`;

const browser = await chromium.launch();
// 与 playwright.config.ts 的 use 一致
const context = await browser.newContext({
  ...devices["Desktop Chrome"],
  baseURL: BASE,
});
const page = await context.newPage();
page.on("console", (m) => console.log(`[console:${m.type()}]`, m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));

console.log(`目标 ${BASE}，注册 ${EMAIL}`);

await page.goto("/register");
await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
console.log("表单已 hydration");

await page.fill("#email", EMAIL);
await page.fill("#username", USERNAME);
await page.fill("#password", "test-password-2026");
await page.fill("#confirm", "test-password-2026");

console.log("点击提交…");
const t0 = Date.now();
await page.getByRole("button", { name: "创建账号" }).click();

for (let i = 1; i <= 12; i++) {
  await page.waitForTimeout(1000);
  console.log(`  +${i}s  URL=${page.url()}  （${Date.now() - t0}ms）`);
  if (page.url().includes("/learn")) {
    console.log("→ 已跳到 /learn");
    break;
  }
}

// 试试 waitForURL 的 glob 到底能不能匹配
try {
  await page.waitForURL("**/learn", { timeout: 3000 });
  console.log("waitForURL('**/learn') 匹配成功");
} catch {
  console.log(`waitForURL('**/learn') 匹配失败（当前 URL=${page.url()}）`);
}

// 会话是否真的建立了
const sess = await page.evaluate(async () => {
  const r = await fetch("/api/auth/session");
  return { status: r.status, body: await r.text() };
});
console.log("session →", sess.status, sess.body.slice(0, 200));

await browser.close();
