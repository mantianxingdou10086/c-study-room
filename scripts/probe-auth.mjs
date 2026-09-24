/**
 * 登录流程探针 v2：把「提交后到底发生了什么」看清楚。
 * 用法：node scripts/probe-auth.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const STAMP = Date.now();

const browser = await chromium.launch();

async function dump(page, label) {
  const btn = await page.locator('button[type="submit"]').innerText().catch(() => "?");
  const alerts = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
  const errs = await page
    .locator("text=/Application error|Unhandled|error/i")
    .allInnerTexts()
    .catch(() => []);
  console.log(`  [${label}] URL=${page.url()}`);
  console.log(`  [${label}] 提交按钮文字="${btn.replace(/\s+/g, " ").trim()}"`);
  console.log(`  [${label}] alert=${JSON.stringify(alerts)}`);
  if (errs.length) console.log(`  [${label}] 疑似错误文本=${JSON.stringify(errs.slice(0, 3))}`);
}

async function attach(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [${tag} console:error]`, m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => console.log(`  [${tag} pageerror]`, e.message.slice(0, 300)));
  page.on("response", async (r) => {
    if (r.status() >= 400) console.log(`  [${tag} http ${r.status()}]`, r.url().slice(0, 120));
  });
}

// ── A) 密码错误 ────────────────────────────────────────────────
console.log("═══ A) 用不存在的账号登录 ═══");
{
  const page = await browser.newPage();
  attach(page, "A");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "nobody@example.invalid");
  await page.fill("#password", "whatever-12345");
  await page.click('button[type="submit"]');
  for (const s of [2, 5, 10]) {
    await page.waitForTimeout(s * 1000 - (s === 2 ? 0 : s === 5 ? 2000 : 5000));
    await dump(page, `A +${s}s`);
  }
  await page.close();
}

// ── B) 注册新账号 ──────────────────────────────────────────────
console.log("\n═══ B) 注册一个全新账号（预期：跳转到 /learn）═══");
{
  const page = await browser.newPage();
  attach(page, "B");
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill("#email", `probe-${STAMP}@example.invalid`);
  await page.fill("#username", `probe_${STAMP}`);
  await page.fill("#password", "test-password-2026");
  await page.fill("#confirm", "test-password-2026");
  await page.click('button[type="submit"]');
  for (const s of [2, 5, 10]) {
    await page.waitForTimeout(s * 1000 - (s === 2 ? 0 : s === 5 ? 2000 : 5000));
    await dump(page, `B +${s}s`);
  }
  console.log(`  [B] 最终 URL = ${page.url()}`);
  await page.close();
}

await browser.close();
console.log("\n提示：把上面输出和服务端日志对照着看。");
