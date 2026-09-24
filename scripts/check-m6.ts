/**
 * M6 实景验证：注册 → 学完一节课 → 做对一道题 → 打开进度页，
 * 检查徽章墙和热力图是不是真的反映了数据。
 * 用法：npx tsx scripts/check-m6.ts [baseUrl]
 */
import { chromium } from "@playwright/test";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { EXERCISE_BY_ID } from "@/content/exercises";

loadEnv({ path: ".env.local" });

async function main() {
  const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
  const STAMP = Date.now();
  const EMAIL = `m6-${STAMP}@example.invalid`;
  const USERNAME = `m6_${String(STAMP).slice(-6)}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  console.log("1) 注册");
  await page.goto(`${BASE}/register`);
  await page.waitForSelector('form[data-hydrated="true"]');
  await page.fill("#email", EMAIL);
  await page.fill("#username", USERNAME);
  await page.fill("#password", "test-password-2026");
  await page.fill("#confirm", "test-password-2026");
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.waitForURL("**/learn", { timeout: 30_000 });

  console.log("2) 学完第 1 章第 1 节");
  await page.goto(`${BASE}/learn/ch01-introducing-c/why-c`);
  await page.getByRole("button", { name: "标记本课已学完" }).click();
  await page.getByRole("status").waitFor({ timeout: 15_000 });

  console.log("3) 做对一道选择题");
  const mcq = EXERCISE_BY_ID.get("ch01-why-c-q2")!;
  const correct = (mcq.validator as { correct: number }).correct;
  await page.goto(`${BASE}/exercises/ch01-why-c-q2`);
  await page.locator('input[type="radio"]').nth(correct).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await page.getByRole("status").waitFor({ timeout: 20_000 });
  console.log(
    "   结果：",
    (await page.getByRole("status").innerText()).replace(/\s+/g, " "),
  );

  console.log("4) 打开进度页");
  await page.goto(`${BASE}/progress`);
  await page.waitForTimeout(1200);

  const checks = await page.evaluate(() => {
    const text = document.body.innerText;
    const heatCells = document.querySelectorAll('[role="img"] > span');
    const filled = [...heatCells].filter(
      (c) => !c.className.includes("bg-surface-muted"),
    ).length;
    return {
      badgeSection: text.includes("徽章"),
      badgeCount: (text.match(/(\d+) \/ 7/) ?? [])[1] ?? "?",
      heatmapSection: text.includes("学习热力图"),
      heatSummary: (text.match(/最近 12 周：[^\n]+/) ?? [])[0] ?? "(没找到)",
      heatCells: heatCells.length,
      filledCells: filled,
      earnedBadge: text.includes("开张"),
    };
  });
  console.log("   徽章墙：", checks.badgeSection, "| 已得", checks.badgeCount, "/ 7");
  console.log(
    "   热力图：",
    checks.heatmapSection,
    "| 格子数",
    checks.heatCells,
    "| 有颜色的",
    checks.filledCells,
  );
  console.log("   汇总文案：", checks.heatSummary);

  await page.screenshot({
    path: join("screenshots", "20-progress-badges-heatmap.png"),
    fullPage: true,
  });
  await browser.close();

  console.log("5) 清理");
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query('DELETE FROM "User" WHERE email LIKE $1', [
    "m6-%@example.invalid",
  ]);
  console.log(`   删除 ${r.rowCount} 行`);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
