/**
 * 注册流程复现：完全按 e2e 测试的步骤走，把每一步的结果打出来。
 * 用法：node scripts/probe-register.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const STAMP = Date.now();
const EMAIL = `probe-${STAMP}@example.invalid`;
const USERNAME = `probe_${STAMP}`;

console.log(`目标：${BASE}`);
console.log(`将注册：${EMAIL} / ${USERNAME}\n`);

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (m) => console.log(`[console:${m.type()}]`, m.text().slice(0, 400)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 400)));
page.on("response", async (r) => {
  if (r.status() >= 400) console.log(`[http ${r.status()}]`, r.request().method(), r.url().slice(0, 100));
});

await page.goto(`${BASE}/register`);
console.log("1) 页面已打开，URL =", page.url());

await page.fill("#email", EMAIL);
await page.fill("#username", USERNAME);
await page.fill("#password", "test-password-2026");
await page.fill("#confirm", "test-password-2026");
console.log("2) 表单已填写");

await page.getByRole("button", { name: "创建账号" }).click();
console.log("3) 已点击提交，等待 8 秒…");
await page.waitForTimeout(8000);

console.log("4) 结果：");
console.log("   URL =", page.url());
const err = await page.getByTestId("form-error").allInnerTexts().catch(() => []);
console.log("   表单错误 =", JSON.stringify(err));
const fieldErrors = await page.locator('p[id$="-error"]').allInnerTexts().catch(() => []);
console.log("   字段错误 =", JSON.stringify(fieldErrors));
const btn = await page.locator('button[type="submit"]').innerText().catch(() => "?");
console.log("   按钮文字 =", JSON.stringify(btn.replace(/\s+/g, " ").trim()));
const body = await page.locator("body").innerText();
console.log("   页面文本（前 400 字）：\n", body.slice(0, 400));

await browser.close();
