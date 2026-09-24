/**
 * 验证「成功登录」这条路（之前只验过失败登录）。
 * 用法：node scripts/probe-login.mjs <email> <password> [baseUrl]
 */
import { chromium } from "@playwright/test";

const email = process.argv[2];
const password = process.argv[3];
const BASE = process.argv[4] ?? "http://127.0.0.1:3000";
if (!email || !password) throw new Error("用法：node scripts/probe-login.mjs <email> <password>");

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log(`[console:${m.type()}]`, m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));

console.log(`登录 ${email} @ ${BASE}`);
await page.goto(`${BASE}/login`);
await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
await page.fill("#email", email);
await page.fill("#password", password);

// 看看表单实际会提交什么（这是关键：name 属性对不对）
const formData = await page.evaluate(() => {
  const f = document.querySelector("form");
  const fd = new FormData(f);
  return [...fd.entries()].map(([k, v]) => `${k}=${String(v).slice(0, 40)}`);
});
console.log("表单将提交：", JSON.stringify(formData));
const names = await page.evaluate(() =>
  [...document.querySelectorAll("form input")].map((i) => `${i.id}:name=${i.getAttribute("name")}`),
);
console.log("输入框的 name：", JSON.stringify(names));

await page.getByRole("button", { name: "登录" }).click();
for (let i = 1; i <= 10; i++) {
  await page.waitForTimeout(1000);
  const err = await page.getByTestId("form-error").allInnerTexts().catch(() => []);
  console.log(`  +${i}s URL=${page.url()} 错误=${JSON.stringify(err)}`);
  if (page.url().includes("/learn")) break;
}

await browser.close();
