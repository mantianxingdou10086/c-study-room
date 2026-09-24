/**
 * 线上端到端冒烟测试：在真实浏览器（Playwright 无头 Chromium）里打开练习场，
 * 跑一段 C 代码，确认「浏览器内跑真 C」这条链路真的通。
 *
 * 这是唯一能验证核心功能的手段 —— curl 只能证明文件可访问、HTTP 200，
 * 证明不了 COOP/COEP 隔离、Worker 能否启动、clang WASM 能否编译执行。
 *
 * 用法：
 *   node scripts/check-live-runner.cjs                        # 默认测线上
 *   node scripts/check-live-runner.cjs http://localhost:3100   # 测本地（对照组）
 *
 * 判据：页面文本里出现 `1+2+...+10 = 55` 即通过。首次要下 34 MB 工具链，
 * 线上实测约 30 秒出结果。
 *
 * 会顺带打印控制台错误、失败请求、以及对 toolchain/wasmer/.wasm 的网络请求，
 * 用来定位是"资源没下发"还是"被浏览器拦掉"。
 */
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "https://c-study-room.netlify.app";
const PROGRAM = `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("1+2+...+10 = %d\\n", sum);
    return 0;
}
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (m) => {
    const t = m.text().replace(/\s+/g, " ").slice(0, 220);
    if (m.type() === "error" || m.type() === "warning") console.log(`  [console.${m.type()}] ${t}`);
  });
  page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 300)}`));
  page.on("response", (r) => {
    const u = r.url();
    if (/toolchain|wasmer|\.wasm|\.pkg/.test(u)) {
      console.log(`  [net ${r.status()}] ${u.replace(BASE, "").slice(0, 90)}`);
    }
  });
  page.on("requestfailed", (r) => {
    console.log(`  [net FAILED] ${r.url().replace(BASE, "").slice(0, 90)} :: ${r.failure()?.errorText}`);
  });

  console.log(`打开 ${BASE}/playground`);
  await page.goto(`${BASE}/playground`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  const editor = page.locator("textarea").first();
  await editor.fill(PROGRAM);
  console.log("已写入程序");

  // 确认编译器选的是 Clang（真实编译器）
  const compilerSelect = page.locator("select").nth(1);
  if (await compilerSelect.count()) {
    const val = await compilerSelect.inputValue().catch(() => "?");
    console.log("编译器选择框当前值:", val);
  }

  const runButton = page.locator("button").filter({ hasText: /^运行$/ }).first();
  console.log("点击「运行」…");
  await runButton.click();

  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => document.body.innerText);
    const has = /1\+2\+\.\.\.\+10\s*=\s*55/.test(text);
    console.log(`  [${i * 5}s] 输出区含预期结果: ${has} | 文本长度 ${text.length}`);
    if (has) {
      console.log("\n🎉 成功！程序真的在浏览器里跑出了结果。");
      const idx = text.indexOf("1+2+...+10");
      console.log("上下文:", text.slice(Math.max(0, idx - 300), idx + 120).replace(/\n+/g, " | "));
      await browser.close();
      return;
    }
    if (i % 4 === 0) {
      // 每 20 秒 dump 一次尾部文本，看卡在哪
      console.log("  尾部文本:", text.slice(-400).replace(/\n+/g, " | "));
    }
  }

  const text = await page.evaluate(() => document.body.innerText);
  console.log("\n❌ 150 秒未出结果。完整页面文本:");
  console.log(text.slice(-2000));
  await browser.close();
})().catch((e) => {
  console.log("测试脚本异常:", e.message);
  process.exit(1);
});
