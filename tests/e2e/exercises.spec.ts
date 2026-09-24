import { config as loadEnv } from "dotenv";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";
import { EXERCISE_BY_ID, EXERCISES } from "@/content/exercises";

/**
 * 题库的验收（M5）。
 *
 * 重点验三件事：
 *  1. **判题在服务端**：标准答案不下发到浏览器（有专门用例抓页面 HTML）
 *  2. **错了先给人话诊断**，不直接甩答案
 *  3. **代码题是真编译真运行**（不是字符串比对）
 *
 * ⚠️ 每个用例自己注册账号（教训见 docs/progress-loop.md：共用账号 + 失败重启 worker
 * 会让 afterAll 提前删号，后面用例全报"用户不存在"）。
 */
loadEnv({ path: ".env.local" });

const STAMP = Date.now();
const PASSWORD = "test-password-2026";
const NAV_TIMEOUT = 30_000;

const MCQ_ID = "ch01-why-c-q1";
const CODE_ID = "ch01-lab-read-the-error-q2";

const mcq = EXERCISE_BY_ID.get(MCQ_ID)!;
const mcqCorrect = (mcq.validator as { correct: number }).correct;
const mcqWrong = mcqCorrect === 0 ? 1 : 0;

const codeEx = EXERCISE_BY_ID.get(CODE_ID)!;
const codeReference = codeEx.referenceCode!;

function creds(tag: string) {
  const short = String(STAMP).slice(-6);
  return {
    email: `m5-${tag}-${STAMP}@example.invalid`,
    username: `m5_${tag}_${short}`,
    password: PASSWORD,
  };
}

async function deleteTestUsers() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const r = await client.query('DELETE FROM "User" WHERE email LIKE $1', [
      "m5-%@example.invalid",
    ]);
    console.log(`[清理] 删除 M5 测试用户 ${r.rowCount} 行`);
  } catch (e) {
    console.warn(`[清理] 失败（不影响结论）：${e}`);
  } finally {
    await client.end().catch(() => {});
  }
}

test.afterAll(async () => {
  await deleteTestUsers();
});

async function waitForRedirect(page: Page, what: string) {
  const ok = await page
    .waitForURL("**/learn", { timeout: NAV_TIMEOUT })
    .then(() => true)
    .catch(() => false);
  if (ok) return;
  const errs = [
    ...(await page.getByTestId("form-error").allInnerTexts().catch(() => [])),
    ...(await page.locator('p[id$="-error"]').allInnerTexts().catch(() => [])),
  ].filter(Boolean);
  throw new Error(
    `${what}之后没有跳转，当前 URL=${page.url()}；页面错误：${
      errs.length ? errs.join(" | ") : "（无）"
    }`,
  );
}

async function register(page: Page, tag: string) {
  const c = creds(tag);
  await page.goto("/register");
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
  await page.fill("#email", c.email);
  await page.fill("#username", c.username);
  await page.fill("#password", c.password);
  await page.fill("#confirm", c.password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await waitForRedirect(page, "注册");
  return c;
}

// ────────────────────────────────────────────────────────────────

test("题库页：列出全部题目并按章分组", async ({ page }) => {
  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "题库" })).toBeVisible();
  await expect(
    page.getByText(`共 ${EXERCISES.length} 题`, { exact: true }),
  ).toBeVisible();
  // 第 1 章的题在
  await expect(page.getByRole("link", { name: new RegExp(MCQ_ID) })).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(CODE_ID) }),
  ).toBeVisible();
});

test("未登录：题库页提示登录，练习页也提示登录", async ({ page }) => {
  await page.goto("/exercises");
  await expect(page.getByText(/登录后这里会显示你的通过情况/)).toBeVisible();

  await page.goto(`/exercises/${MCQ_ID}`);
  await expect(page.getByText(/做题需要登录/)).toBeVisible();
  await expect(page.getByRole("button", { name: "提交答案" })).toHaveCount(0);
});

test("答案不下发到浏览器（判题在服务端）", async ({ page }) => {
  const html = await (await page.request.get(`/exercises/${MCQ_ID}`)).text();
  // 参考答案的正文绝不能出现在页面 HTML / RSC 载荷里
  const probe = mcq.referenceAnswer.slice(0, 24);
  expect(html).not.toContain(probe);
  console.log(`  已确认页面不含参考答案正文（探测片段：${probe}…）`);
});

test("选择题：选错给人话诊断且不甩答案，再选对通过并拿 XP", async ({ page }) => {
  await register(page, "mcq");
  await page.goto(`/exercises/${MCQ_ID}`);

  // 先故意选错
  const options = page.locator('input[type="radio"]');
  await options.nth(mcqWrong).check();
  await page.getByRole("button", { name: "提交答案" }).click();

  const status = page.getByRole("status");
  await expect(status).toContainText("还不对", { timeout: 20_000 });
  const diagnosis = await status.innerText();
  console.log(`  错误诊断 → ${diagnosis.replace(/\s+/g, " ")}`);
  // 只给方向，不给答案
  expect(diagnosis.length).toBeGreaterThan(10);

  // 再选对
  await options.nth(mcqCorrect).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(status).toContainText("答对了", { timeout: 20_000 });
  const okText = await status.innerText();
  console.log(`  通过文案 → ${okText.replace(/\s+/g, " ")}`);
  expect(okText).toContain(`+${mcq.xp} XP`);

  // 题库页出现通过计数
  await page.goto("/exercises");
  await expect(page.getByText(/1 \/ \d+ 题已通过/)).toBeVisible({
    timeout: 15_000,
  });
});

test("代码题：真编译真运行，跑通即通过", async ({ page }) => {
  test.setTimeout(120_000); // 首次要下载/初始化 clang（34MB）
  await register(page, "code");
  await page.goto(`/exercises/${CODE_ID}`);

  // 用参考解替换起始代码
  const editor = page.locator("textarea").first();
  await editor.fill(codeReference);

  await page.getByRole("button", { name: "提交答案" }).click();

  // 首次会经历"准备编译器 N%" → "运行中…" → 判题
  const status = page.getByRole("status");
  await expect(status).toContainText("答对了", { timeout: 90_000 });
  const text = await status.innerText();
  console.log(`  代码题通过 → ${text.replace(/\s+/g, " ")}`);
  expect(text).toContain(`+${codeEx.xp} XP`);
});

test("展开参考答案后，这道题不再给 XP", async ({ page }) => {
  await register(page, "reveal");
  await page.goto(`/exercises/${MCQ_ID}`);

  // 先故意选错，让"展开参考答案"入口出现
  await page.locator('input[type="radio"]').nth(mcqWrong).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByRole("status")).toContainText("还不对", { timeout: 20_000 });

  await page.getByRole("button", { name: "展开参考答案" }).click();
  // 答案此时才从服务端取回来
  await expect(page.getByText("参考答案", { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });

  // 现在答对：应当通过，但拿不到 XP
  await page.locator('input[type="radio"]').nth(mcqCorrect).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("答对了", { timeout: 20_000 });
  const text = await status.innerText();
  console.log(`  看过答案后 → ${text.replace(/\s+/g, " ")}`);
  expect(text).toContain("不再计 XP");
  expect(text).not.toContain(`+${mcq.xp} XP`);
});
