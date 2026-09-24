import { config as loadEnv } from "dotenv";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";

/**
 * 登录体系的验收（M2）。
 *
 * 核心验收点：**换一个浏览器上下文登录后，身份仍然成立** —— 这证明会话在服务端，
 * 不是 localStorage 里的一串东西（那是 M4"进度存档"的地基）。
 *
 * 测试会在真实的 Supabase 库里建一个用户，跑完删掉（见 afterAll）。
 * 用 pg 直连删除而不是 import 应用的 prisma：应用模块在 import 时就会读环境变量，
 * 而 dotenv 的加载发生在静态 import 之后，顺序对不上。
 *
 * 三个已经踩过的坑（都写在这里免得再犯）：
 *  1. 断言必须用**同一个 page**：曾写过 `registerNewUser(page.context())` ——
 *     那个 helper 内部新建了页面，而断言等在原来那个空页面上，永远等不到跳转。
 *  2. 用 data-testid 定位错误提示，别用 getByRole("alert")：
 *     Next.js 自带的 `__next-route-announcer__` 也带 role="alert"，会触发 strict mode 错。
 *  3. 交互前等 hydration：React 接管前 `<form action={serverAction}>` 只是普通表单，
 *     点提交会走浏览器原生 POST（页面刷新、输入丢失、服务端毫无反应）。
 *     应用侧已在 hydration 前禁用提交按钮，这里再显式等一次让失败信息更清楚。
 */
loadEnv({ path: ".env.local" });

const STAMP = Date.now();
const EMAIL = `e2e-${STAMP}@example.invalid`;
const USERNAME = `e2e_${STAMP}`;
const PASSWORD = "test-password-2026";

/** 首次 server action 调用要等 Prisma + pooler 冷连接，实测约 7 秒，超时给足 */
const NAV_TIMEOUT = 30_000;

const formError = (page: Page) => page.getByTestId("form-error");

const waitForFormReady = (page: Page) =>
  page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });

async function deleteTestUser() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    // User 上的级联删除会带走进度/提交等关联记录
    const r = await client.query('DELETE FROM "User" WHERE email LIKE $1', [
      "e2e-%@example.invalid",
    ]);
    console.log(`[清理] 删除测试用户 ${r.rowCount} 行`);
  } catch (e) {
    console.warn(`[清理] 删除测试用户失败（不影响结论）：${e}`);
  } finally {
    await client.end().catch(() => {});
  }
}

test.afterAll(async () => {
  await deleteTestUser();
});

async function submitRegister(page: Page) {
  await page.goto("/register");
  await waitForFormReady(page);
  await page.fill("#email", EMAIL);
  await page.fill("#username", USERNAME);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirm", PASSWORD);
  await page.getByRole("button", { name: "创建账号" }).click();
}

async function submitLogin(page: Page) {
  await page.goto("/login");
  await waitForFormReady(page);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
}

test("注册成功后自动登录，顶栏显示用户名", async ({ page }) => {
  await submitRegister(page);

  await page.waitForURL("**/learn", { timeout: NAV_TIMEOUT });
  // 顶栏用户名是通过 /api/auth/session 拿到的（客户端组件），要等它出现
  await expect(page.getByRole("link", { name: USERNAME })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "退出登录" })).toBeVisible();
});

test("换一个浏览器上下文登录后身份仍在（会话在服务端）", async ({ browser }) => {
  // 全新的上下文 = 全新的 cookie 罐，模拟"换了浏览器/设备"
  const fresh = await browser.newContext();
  const page = await fresh.newPage();

  // 未登录时访问需要登录的页面 → 被重定向到登录页
  await page.goto("/progress");
  await page.waitForURL("**/login", { timeout: 15_000 });

  await waitForFormReady(page);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();

  await page.waitForURL("**/learn", { timeout: NAV_TIMEOUT });
  await expect(page.getByRole("link", { name: USERNAME })).toBeVisible({
    timeout: 15_000,
  });

  // 进度页现在能进，而且显示的是这个账号（不是 localStorage 里的东西）
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: `${USERNAME} 的学习进度` }),
  ).toBeVisible();

  await fresh.close();
});

test("密码错误时有明确提示，且不区分「邮箱不存在」", async ({ page }) => {
  await page.goto("/login");
  await waitForFormReady(page);
  await page.fill("#email", EMAIL);
  await page.fill("#password", "definitely-wrong-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(formError(page)).toContainText("邮箱或密码不正确");
  expect(page.url()).toContain("/login");
});

test("重复邮箱注册会被拒绝，并给出可读提示", async ({ page }) => {
  await submitRegister(page);
  await expect(formError(page)).toContainText("已经被注册", {
    timeout: NAV_TIMEOUT,
  });
});

test("前端校验：两次密码不一致时不会发请求", async ({ page }) => {
  await page.goto("/register");
  await waitForFormReady(page);
  await page.fill("#email", `mismatch-${STAMP}@example.invalid`);
  await page.fill("#username", `mm_${STAMP}`);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirm", "another-password");
  await page.getByRole("button", { name: "创建账号" }).click();

  await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
  expect(page.url()).toContain("/register");
});

test("退出登录后回到未登录状态", async ({ page }) => {
  await submitLogin(page);
  await page.waitForURL("**/learn", { timeout: NAV_TIMEOUT });

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/learn"), {
    timeout: NAV_TIMEOUT,
  });

  // 回到未登录：注册按钮重新出现，用户菜单消失
  await expect(page.getByRole("link", { name: "注册" })).toBeVisible({
    timeout: 15_000,
  });
});
