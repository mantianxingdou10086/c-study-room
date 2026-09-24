import { config as loadEnv } from "dotenv";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";

/**
 * 学习进度闭环的验收（M4）。
 *
 * 核心验收点（对应最初需求里的第一条）：
 * **标记完成 → 进度存到服务器 → 换一个浏览器上下文登录，进度还在。**
 * 用全新 context 而不是刷新页面，是为了排除 localStorage 之类的假象。
 *
 * ⚠️ 一条踩过的教训：**每个用例必须自己注册账号，不要共用**。
 * 原因：任何一个用例失败，Playwright 会重启 worker，而文件级 `afterAll`
 * （清理测试账号）会**在重启前提前执行** —— 于是后面依赖那个账号的用例全部失败，
 * 报的是"用户不存在"这种和真实原因完全无关的错。
 * 之前 auth 测试里"测试 2/4/6 莫名失败"查了很久，根因就是这个。
 */
loadEnv({ path: ".env.local" });

const STAMP = Date.now();
const PASSWORD = "test-password-2026";

/** 第 1 章第 1 节：READING 型 → 完成得 10 XP */
const LESSON_PATH = "/learn/ch01-introducing-c/why-c";

const NAV_TIMEOUT = 30_000;

type Creds = { email: string; username: string; password: string };

/** 每个用例用自己的 tag，账号互不影响。
 *  用户名要控制在 20 字符内（应用的校验规则）：tag + 时间戳后 6 位，别拼完整时间戳。 */
function creds(tag: string): Creds {
  const short = String(STAMP).slice(-6);
  return {
    email: `m4-${tag}-${STAMP}@example.invalid`,
    username: `m4_${tag}_${short}`,
    password: PASSWORD,
  };
}

/** 等跳转；没跳成就把页面上的错误抓出来报 —— 否则只能看到 30 秒超时，看不出真正原因 */
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
    `${what}之后没有跳转到 /learn，当前 URL=${page.url()}；页面上的错误：${
      errs.length ? errs.join(" | ") : "（没有任何错误提示）"
    }`,
  );
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
    // 级联删除会带走 LessonProgress / Submission / UserBadge 等
    const r = await client.query('DELETE FROM "User" WHERE email LIKE $1', [
      "m4-%@example.invalid",
    ]);
    console.log(`[清理] 删除 M4 测试用户 ${r.rowCount} 行`);
  } catch (e) {
    console.warn(`[清理] 失败（不影响结论）：${e}`);
  } finally {
    await client.end().catch(() => {});
  }
}

test.afterAll(async () => {
  await deleteTestUsers();
});

async function register(page: Page, c: Creds) {
  await page.goto("/register");
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
  await page.fill("#email", c.email);
  await page.fill("#username", c.username);
  await page.fill("#password", c.password);
  await page.fill("#confirm", c.password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await waitForRedirect(page, "注册");
}

async function login(page: Page, c: Creds) {
  await page.goto("/login");
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
  await page.fill("#email", c.email);
  await page.fill("#password", c.password);
  await page.getByRole("button", { name: "登录" }).click();
  await waitForRedirect(page, "登录");
}

/** 进讲义页并等进度数据加载完（数据到位前按钮位置是占位空盒） */
async function openLesson(page: Page) {
  await page.goto(LESSON_PATH);
  await expect(
    page.getByRole("button", { name: /标记本课已学完|已完成（点此取消）/ }),
  ).toBeVisible({ timeout: 15_000 });
}

test("标记完成：拿到 XP，按钮状态翻转，进度写进服务器", async ({ page }) => {
  const c = creds("done");
  await register(page, c);
  await openLesson(page);

  await page.getByRole("button", { name: "标记本课已学完" }).click();

  await expect(
    page.getByRole("button", { name: /已完成（点此取消）/ }),
  ).toBeVisible({ timeout: 15_000 });

  const status = page.getByRole("status");
  await expect(status).toContainText("+10 XP");
  await expect(status).toContainText("连续 1 天");
  await expect(status).toContainText("开张");
  console.log(`  提示文案 → ${(await status.innerText()).replace(/\s+/g, " ")}`);

  // 进度页显示真实的 1 节。
  // ⚠️ 分母是"讲义已经写完"的课时数，会随交付进度长大（15 → 49），
  // 所以这里**只钉分子**（完成了 1 节），分母用 \d+ 通配——
  // 把 15 写死过一次，第 8~10 章一交付就红了（这类断言和"内容有多少"绑在一起，注定会过期）。
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: `${c.username} 的学习进度` }),
  ).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+$/).first()).toBeVisible();
  await expect(page.getByText("10 XP", { exact: true })).toBeVisible();
});

test("XP 幂等：取消完成再标记，不会重复加分", async ({ page }) => {
  const c = creds("idem");
  await register(page, c);
  await openLesson(page);

  // 先标记完成
  await page.getByRole("button", { name: "标记本课已学完" }).click();
  await expect(page.getByRole("status")).toContainText("+10 XP", {
    timeout: 15_000,
  });

  // 取消完成（XP 不追回）
  await page.getByRole("button", { name: /已完成（点此取消）/ }).click();
  await expect(page.getByRole("status")).toContainText("已取消完成标记", {
    timeout: 15_000,
  });

  // 再标记完成：应当提示"之前已经发过了"，而不是再加 10 XP
  await page.getByRole("button", { name: "标记本课已学完" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("已经发过", { timeout: 15_000 });
  console.log(`  提示文案 → ${(await status.innerText()).replace(/\s+/g, " ")}`);

  // 进度页的 XP 应该还是 10，不是 20
  await page.goto("/progress");
  await expect(page.getByText("10 XP", { exact: true })).toBeVisible();
});

test("换一个浏览器上下文登录，进度仍然在（存在服务端）", async ({ page, browser }) => {
  const c = creds("persist");

  // 在 fixture 的 page 上注册并标记完成
  await register(page, c);
  await openLesson(page);
  await page.getByRole("button", { name: "标记本课已学完" }).click();
  await expect(page.getByRole("status")).toContainText("+10 XP", {
    timeout: 15_000,
  });

  // 全新 context = 全新 cookie 罐，模拟"换了浏览器/设备"
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();

  await login(freshPage, c);

  // 进度页：数字必须还是 1（如果存在 localStorage，这里会是 0）
  await freshPage.goto("/progress");
  // 同上：只钉"完成了 1 节"，分母不写死
  await expect(freshPage.getByText(/^1 \/ \d+$/).first()).toBeVisible({ timeout: 15_000 });

  // 课程地图：第 1 章显示已完成节数
  await freshPage.goto("/learn");
  await expect(freshPage.getByText(/已完成 \d+\/\d+ 节/).first()).toBeVisible({
    timeout: 15_000,
  });

  // 讲义页左侧课时列表上有完成标记
  await freshPage.goto(LESSON_PATH);
  await expect(freshPage.getByLabel("已完成").first()).toBeVisible({
    timeout: 15_000,
  });

  // 「继续上次学习」应当指向**未完成**的那一节：
  // 刚把第 1 节标记完成，再去看第 2 节，足迹就会落在第 2 节上
  await freshPage.goto("/learn/ch01-introducing-c/from-source-to-program");
  await expect(
    freshPage.getByRole("button", { name: "标记本课已学完" }),
  ).toBeVisible({ timeout: 15_000 });
  await freshPage.goto("/learn");
  await expect(
    freshPage.getByRole("link", { name: "继续上次学习" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    freshPage.getByRole("link", { name: "继续上次学习" }),
  ).toHaveAttribute("href", "/learn/ch01-introducing-c/from-source-to-program");

  await fresh.close();
});

test("未登录时不显示标记按钮，而是引导登录", async ({ page }) => {
  await page.goto(LESSON_PATH);
  await expect(page.getByText("登录后可以把「学完了」存到服务器上")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "标记本课已学完" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "去登录" })).toBeVisible();
});

test("未登录时课程地图不显示进度标记（保持静态，不报错）", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "课程地图" })).toBeVisible();
  await expect(page.getByRole("link", { name: "继续上次学习" })).toHaveCount(0);
  await expect(page.getByLabel("已完成")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /第 1 章 · C 语言概述/ }),
  ).toBeVisible();
});

test("进度页：徽章墙与热力图反映真实数据", async ({ page }) => {
  const c = creds("badge");
  await register(page, c);
  await openLesson(page);
  await page.getByRole("button", { name: "标记本课已学完" }).click();
  await expect(page.getByRole("status")).toContainText("+10 XP", {
    timeout: 15_000,
  });

  await page.goto("/progress");

  // 徽章墙：7 枚全列出来（未解锁的也要显示，才有目标感），拿到「开张」
  await expect(page.getByRole("heading", { name: "徽章" })).toBeVisible();
  await expect(page.getByText("1 / 7")).toBeVisible();
  await expect(page.getByText("开张")).toBeVisible();

  // 热力图：**今天必须算进"有学习记录"**。
  // 曾经因为网格对齐算错（最后一格是本周周一，今天不在网格里），
  // 这里会显示"0 天有学习记录"，而汇总 XP 又是对的 —— 只有断言这行才抓得住。
  await expect(page.getByRole("heading", { name: "学习热力图" })).toBeVisible();
  await expect(page.getByText(/最近 12 周：1 天有学习记录/)).toBeVisible();
});
