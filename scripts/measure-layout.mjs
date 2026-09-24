/**
 * 客观测量页面布局：容器宽度、居中情况、横向溢出、字号。
 * 不看截图（长图缩放后容易被误判），直接量 DOM。
 * 用法：node scripts/measure-layout.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";

const browser = await chromium.launch();

for (const [label, width, height] of [
  ["桌面 1440", 1440, 1000],
  ["笔记本 1280", 1280, 900],
  ["手机 375", 375, 800],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });

  const m = await page.evaluate(() => {
    const main = document.querySelector("main");
    const container = main?.firstElementChild;
    const r = container?.getBoundingClientRect();
    const bodyStyle = getComputedStyle(document.body);
    return {
      viewport: window.innerWidth,
      containerWidth: r ? Math.round(r.width) : null,
      leftGap: r ? Math.round(r.left) : null,
      rightGap: r ? Math.round(window.innerWidth - r.right) : null,
      // 有没有横向溢出
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyFontSize: bodyStyle.fontSize,
      // 页面主要文字的字号（取第一个段落的计算值）
      pFontSize: (() => {
        const p = main?.querySelector("p");
        return p ? getComputedStyle(p).fontSize : null;
      })(),
      h1FontSize: (() => {
        const h = main?.querySelector("h1");
        return h ? getComputedStyle(h).fontSize : null;
      })(),
    };
  });

  const centered =
    m.leftGap !== null && m.rightGap !== null
      ? Math.abs(m.leftGap - m.rightGap) <= 2
        ? "✅ 居中"
        : `❌ 不居中（左 ${m.leftGap} / 右 ${m.rightGap}）`
      : "?";
  const overflow =
    m.scrollWidth > m.clientWidth
      ? `❌ 横向溢出 ${m.scrollWidth - m.clientWidth}px`
      : "✅ 无横向溢出";

  console.log(`【${label}】`);
  console.log(
    `  容器宽 ${m.containerWidth}px / 视口 ${m.viewport}px · ${centered} · ${overflow}`,
  );
  console.log(
    `  字号：h1 ${m.h1FontSize} · 正文 ${m.pFontSize} · body ${m.bodyFontSize}`,
  );
  await page.close();
}

await browser.close();
