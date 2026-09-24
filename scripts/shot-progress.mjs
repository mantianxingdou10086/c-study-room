/**
 * 给 M4 的进度功能拍实景截图：注册 → 标记完成 → 课程地图/讲义页/进度页各拍一张。
 * 用法：node scripts/shot-progress.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local" });

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const STAMP = Date.now();
const EMAIL = `shot-${STAMP}@example.invalid`;
const USERNAME = `shot_${String(STAMP).slice(-6)}`;
const OUT = "screenshots";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

console.log("1) 注册");
await page.goto(`${BASE}/register`);
await page.waitForSelector('form[data-hydrated="true"]');
await page.fill("#email", EMAIL);
await page.fill("#username", USERNAME);
await page.fill("#password", "test-password-2026");
await page.fill("#confirm", "test-password-2026");
await page.getByRole("button", { name: "创建账号" }).click();
await page.waitForURL("**/learn", { timeout: 30_000 });

console.log("2) 进第 1 章第 1 节并标记完成");
await page.goto(`${BASE}/learn/ch01-introducing-c/why-c`);
await page.getByRole("button", { name: "标记本课已学完" }).click();
await page.getByRole("status").waitFor({ state: "visible", timeout: 15_000 });
console.log("   提示：", (await page.getByRole("status").innerText()).replace(/\s+/g, " "));
await page.screenshot({ path: join(OUT, "10-lesson-marked-done.png"), fullPage: true });

console.log("3) 再看第 2 节（留下足迹，让「继续上次学习」有目标）");
await page.goto(`${BASE}/learn/ch01-introducing-c/from-source-to-program`);
await page.waitForTimeout(1200);

console.log("4) 课程地图（带进度与继续学习）");
await page.goto(`${BASE}/learn`);
await page.waitForTimeout(1500);
await page.screenshot({ path: join(OUT, "11-learn-with-progress.png"), fullPage: true });

console.log("5) 进度页");
await page.goto(`${BASE}/progress`);
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, "12-progress-page.png"), fullPage: true });

await browser.close();

console.log("6) 清理截图用的账号");
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const r = await c.query('DELETE FROM "User" WHERE email LIKE $1', ["shot-%@example.invalid"]);
console.log(`   删除 ${r.rowCount} 行`);
await c.end();

console.log("截图完成：10/11/12 三张");
