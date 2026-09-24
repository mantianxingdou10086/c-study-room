/**
 * 视觉与主题验收（M1.4）：截图 + 打印真实的计算样式。
 * 颜色这种事不该靠"看着像"，先读 computedStyle 拿硬证据，再让人（或视觉模型）看版式。
 *
 * 用法：BASE_URL=http://127.0.0.1:3100 node scripts/visual-check.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = join(process.cwd(), "screenshots");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function probe(label) {
  const info = await page.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const root = cs(document.documentElement);
    const body = cs(document.body);
    const primaryBtn = document.querySelector("button.bg-primary, a.bg-primary");
    return {
      htmlClass: document.documentElement.className.replace(/\s+/g, " ").trim(),
      colorScheme: root.colorScheme,
      bodyBg: body.backgroundColor,
      bodyFg: body.color,
      primaryVar: root.getPropertyValue("--primary").trim(),
      backgroundVar: root.getPropertyValue("--background").trim(),
      surfaceVar: root.getPropertyValue("--surface").trim(),
      borderVar: root.getPropertyValue("--border").trim(),
      primaryBtnBg: primaryBtn ? cs(primaryBtn).backgroundColor : null,
      docScrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    };
  });
  console.log(`\n[${label}]`);
  for (const [k, v] of Object.entries(info)) console.log(`  ${k}: ${v}`);
  return info;
}

// ---- 1) 首页（默认主题）----
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await probe("首页 · 默认主题");
await page.screenshot({ path: join(OUT, "01-home-light.png"), fullPage: true });

// ---- 2) 设计令牌页（浅色）----
await page.goto(`${BASE}/dev/tokens`, { waitUntil: "networkidle" });
await probe("设计令牌 · 浅色");
await page.screenshot({ path: join(OUT, "02-tokens-light.png"), fullPage: true });

// ---- 3) 切到深色 ----
await page.getByRole("button", { name: "切换主题（浅色 / 深色）" }).click();
await page.waitForTimeout(300);
await probe("设计令牌 · 深色");
await page.screenshot({ path: join(OUT, "03-tokens-dark.png"), fullPage: true });

// 深色是否被记住（刷新后仍是深色）
await page.reload({ waitUntil: "networkidle" });
const afterReload = await probe("刷新后 · 应保持深色");
console.log(`  深色被记住: ${afterReload.htmlClass.includes("dark")}`);

// 切回浅色
await page.getByRole("button", { name: "切换主题（浅色 / 深色）" }).click();
await page.waitForTimeout(200);

// ---- 4) 练习场 ----
await page.goto(`${BASE}/playground`, { waitUntil: "networkidle" });
await probe("练习场 · 浅色");
await page.screenshot({ path: join(OUT, "04-playground.png"), fullPage: true });

// ---- 4.5) 课程地图与讲义页（M3）----
await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
await probe("课程地图 · 浅色");
await page.screenshot({ path: join(OUT, "06-learn-map.png"), fullPage: true });

await page.goto(`${BASE}/learn/ch01-introducing-c/why-c`, { waitUntil: "networkidle" });
await probe("讲义页 · 浅色");
await page.screenshot({ path: join(OUT, "07-lesson-light.png"), fullPage: true });

// 讲义页的深色版本（代码高亮要换成 github-dark）
await page.getByRole("button", { name: "切换主题（浅色 / 深色）" }).click();
await page.waitForTimeout(300);
await probe("讲义页 · 深色");
await page.screenshot({ path: join(OUT, "08-lesson-dark.png"), fullPage: true });
await page.getByRole("button", { name: "切换主题（浅色 / 深色）" }).click();
await page.waitForTimeout(200);

// ---- 5) 移动端 375px 不横向滚动 ----
const mobile = await browser.newPage({ viewport: { width: 375, height: 800 } });
for (const path of ["/", "/learn", "/learn/ch01-introducing-c/why-c", "/playground", "/dev/tokens"]) {
  await mobile.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const r = await mobile.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  console.log(`\n[移动端 375px ${path}] scrollWidth=${r.scrollW} innerWidth=${r.innerW} 横向溢出=${r.scrollW > r.innerW}`);
}
await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mobile.screenshot({ path: join(OUT, "05-home-mobile.png"), fullPage: true });

console.log(`\n截图已保存到 ${OUT}`);
await browser.close();
