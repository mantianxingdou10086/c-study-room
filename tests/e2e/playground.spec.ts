import { expect, test } from "@playwright/test";

/**
 * M1.2 的验收：浏览器内真实编译运行 C。
 *
 * 这组用例的意义在于"不许自欺"：
 *  - 断言页面确实处于 cross-origin isolated（wasmer 的硬要求）
 *  - 断言输出是编译器真实产出的文本，而不是我们编的
 *  - 断言死循环被超时拦住（学生写的死循环不能把页面卡死）
 *  - 断言编译错误给出的是 clang 原始诊断（M5 的"人话诊断"要基于它做）
 */
test.describe.configure({ mode: "serial" });

async function pickExample(page: import("@playwright/test").Page, label: string) {
  await page.getByLabel("示例").selectOption({ label });
}

async function runAndWait(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "运行", exact: true }).click();
  // 等状态行出现（首次可能要下 34MB + 实例化 wasm，给足时间）
  await expect(page.getByText(/运行结束|编译没有通过|运行超时/)).toBeVisible({
    timeout: 240_000,
  });
}

test("页面处于 cross-origin isolated，且默认引擎是真实编译器", async ({ page }) => {
  await page.goto("/playground");
  const isolated = await page.evaluate(() => globalThis.crossOriginIsolated);
  console.log("crossOriginIsolated =", isolated);
  expect(isolated).toBe(true);

  const engine = await page.getByLabel("选择运行引擎").inputValue();
  console.log("默认引擎 =", engine);
  expect(engine).toBe("clang-wasm");
  await expect(page.getByText("真编译器")).toBeVisible();
});

test("hello：真实编译器输出 Hello, world!", async ({ page }) => {
  await page.goto("/playground");
  await pickExample(page, "1. 第一个程序");
  const t0 = Date.now();
  await runAndWait(page);
  console.log(`首次运行（含工具链准备）耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await expect(page.getByText("运行结束（退出码 0）")).toBeVisible();
  const out = await page.locator("pre").last().innerText();
  console.log("stdout =", JSON.stringify(out));
  expect(out).toContain("Hello, world!");

  // 第二次运行：工具链已就绪，应该是秒级
  const t1 = Date.now();
  await runAndWait(page);
  console.log(`第二次运行耗时 ${((Date.now() - t1) / 1000).toFixed(1)}s`);
});

test("scanf：标准输入被正确喂给程序", async ({ page }) => {
  await page.goto("/playground");
  await pickExample(page, "2. 读入一个整数");
  await page.getByLabel(/标准输入/).fill("21");
  await runAndWait(page);
  const out = await page.locator("pre").last().innerText();
  console.log("stdout =", JSON.stringify(out));
  expect(out).toContain("42");
});

test("结构体：真实编译器支持，秒开模式不支持（能力差异被如实呈现）", async ({ page }) => {
  await page.goto("/playground");
  await pickExample(page, "5. 结构体（秒开模式不支持）");

  // 先用真编译器
  await runAndWait(page);
  let out = await page.locator("pre").last().innerText();
  console.log("[clang] stdout =", JSON.stringify(out));
  expect(out).toContain("(3, 4)");

  // 再切秒开模式，应当明确告知"不支持"而不是给出错误结果
  await page.getByLabel("选择运行引擎").selectOption("jscpp");
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByText("编译没有通过")).toBeVisible({ timeout: 60_000 });
  out = await page.locator("pre").first().innerText();
  console.log("[jscpp] stderr =", JSON.stringify(out));
  expect(out).toContain("不支持结构体");
});

test("编译错误：给出 clang 原始诊断与行列号", async ({ page }) => {
  await page.goto("/playground");
  await pickExample(page, "7. 编译错误长什么样");
  await runAndWait(page);
  await expect(page.getByText("编译没有通过")).toBeVisible();
  const err = await page.locator("pre").first().innerText();
  console.log("clang stderr =", JSON.stringify(err));
  expect(err).toMatch(/error:/);
  expect(err).toMatch(/main\.c:5:/); // 指向缺分号那一行
});

test("死循环：被超时拦住，页面仍可交互", async ({ page }) => {
  await page.goto("/playground");
  await pickExample(page, "6. 死循环（测超时保护）");

  const t0 = Date.now();
  await page.getByRole("button", { name: "运行", exact: true }).click();

  // 死循环期间页面必须还能响应（点一下"还原示例"按钮，它应当被 enabled 之外的方式验证：
  // 这里直接读 DOM，能读到就说明主线程没被冻住）
  await page.waitForTimeout(2000);
  const stillAlive = await page.evaluate(() => document.readyState);
  console.log("运行中页面 readyState =", stillAlive, `(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  expect(stillAlive).toBe("complete");

  await expect(page.getByText("运行超时")).toBeVisible({ timeout: 60_000 });
  console.log(`超时被拦住，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 超时后还能继续正常跑别的程序
  await pickExample(page, "1. 第一个程序");
  await runAndWait(page);
  await expect(page.locator("pre").last()).toContainText("Hello, world!");
});
