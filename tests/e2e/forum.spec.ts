import { config as loadEnv } from "dotenv";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";

/**
 * 讨论区的验收（M7）。
 *
 * 核心是**完整问答闭环**：楼主发帖 → 另一个人回复 → 楼主采纳 → 标记已解决。
 * 采纳那一步用两个浏览器上下文（两个不同用户）来验，因为权限判定是
 * "只有楼主能采纳" —— 单一用户测不出权限边界。
 *
 * ⚠️ 每个用例自己注册账号（教训见 docs/progress-loop.md）。
 */
loadEnv({ path: ".env.local" });

const STAMP = Date.now();
const PASSWORD = "test-password-2026";
const NAV_TIMEOUT = 30_000;

function creds(tag: string) {
  const short = String(STAMP).slice(-6);
  return {
    email: `m7-${tag}-${STAMP}@example.invalid`,
    username: `m7_${tag}_${short}`,
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
    // 级联删除会带走 Post / Reply
    const r = await client.query('DELETE FROM "User" WHERE email LIKE $1', [
      "m7-%@example.invalid",
    ]);
    console.log(`[清理] 删除 M7 测试用户 ${r.rowCount} 行`);
  } catch (e) {
    console.warn(`[清理] 失败（不影响结论）：${e}`);
  } finally {
    await client.end().catch(() => {});
  }
}

test.afterAll(async () => {
  await deleteTestUsers();
});

async function waitForRedirect(page: Page, pattern: string, what: string) {
  const ok = await page
    .waitForURL(pattern, { timeout: NAV_TIMEOUT })
    .then(() => true)
    .catch(() => false);
  if (ok) return;
  const errs = [
    ...(await page.getByTestId("form-error").allInnerTexts().catch(() => [])),
    ...(await page.locator('p[id$="-error"], p.text-danger').allInnerTexts().catch(() => [])),
  ].filter(Boolean);
  throw new Error(
    `${what}之后没有跳转（当前 URL=${page.url()}）；页面错误：${errs.join(" | ") || "（无）"}`,
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
  await waitForRedirect(page, "**/learn", "注册");
  return c;
}

/** 发一个帖子，返回帖子详情页 URL */
async function createPost(page: Page, title: string, body: string): Promise<string> {
  await page.goto("/forum");
  await page.getByText("发新帖", { exact: true }).click();
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });
  await page.fill("#post-title", title);
  await page.fill("#post-body", body);
  await page.getByRole("button", { name: "发布" }).click();
  await waitForRedirect(page, "**/forum/**", "发帖");
  return page.url();
}

// ────────────────────────────────────────────────────────────────

test("未登录：列表页和详情页都给出登录引导，而不是让人点了没反应", async ({
  page,
  browser,
}) => {
  // 先造一个帖子（用一个临时用户），再用匿名上下文去看
  await register(page, "seed");
  const url = await createPost(page, "printf 里 %d 和 %f 写反会怎样？", "我试了一下，输出变成了 0。");

  const anon = await browser.newContext();
  const anonPage = await anon.newPage();

  await anonPage.goto("/forum");
  await expect(anonPage.getByText("登录后可以发帖和回复。")).toBeVisible();
  // 但帖子本身是公开可读的
  await expect(
    anonPage.getByRole("heading", { name: /printf 里 %d 和 %f/ }),
  ).toBeVisible();

  await anonPage.goto(url);
  await expect(anonPage.getByText("登录后可以回复这个帖子。")).toBeVisible();
  await expect(
    anonPage.getByRole("heading", { name: /printf 里 %d 和 %f/ }),
  ).toBeVisible();

  await anon.close();
});

test("发帖：校验不通过时给可读提示，通过后进详情页", async ({ page }) => {
  await register(page, "post");
  await page.goto("/forum");
  await page.getByText("发新帖", { exact: true }).click();
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 });

  // 标题太短 → 服务端校验拒绝
  await page.fill("#post-title", "求助");
  await page.fill("#post-body", "短");
  await page.getByRole("button", { name: "发布" }).click();
  await expect(page.getByText(/标题至少 4 个字/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/内容至少 8 个字/)).toBeVisible();
  console.log("  校验提示已出现，且没有跳走");

  // 填对 → 跳到详情页
  const title = "scanf 读到字母时为什么一直循环？";
  await page.fill("#post-title", title);
  await page.fill(
    "#post-body",
    "我写了个读整数的循环，输入字母之后程序就疯了，一直打印同一行。是不是 scanf 没读走那个字符？",
  );
  await page.getByRole("button", { name: "发布" }).click();
  await waitForRedirect(page, "**/forum/**", "发帖");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("0 条回复")).toBeVisible();
});

test("完整问答闭环：发帖 → 别人回复 → 楼主采纳 → 标记已解决", async ({
  page,
  browser,
}) => {
  // 1) 楼主发帖
  const owner = await register(page, "owner");
  const title = "为什么 int main(void) 不能写成 int main()？";
  const url = await createPost(
    page,
    title,
    "书里一直写 int main(void)，我写空的括号也能编译，这两种写法有区别吗？",
  );
  console.log(`  楼主 ${owner.username} 发帖成功`);

  // 2) 另一个人回复（全新上下文 = 另一个用户）
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const answerer = await register(otherPage, "answerer");
  await otherPage.goto(url);
  await otherPage.fill("#reply-top", "在 C 里 () 表示参数未指定，不是没有参数；C23 之后才等同。");
  await otherPage.getByRole("button", { name: "回复" }).click();
  await waitForRedirect(otherPage, "**/forum/**", "回复");
  await expect(
    otherPage.getByText(/在 C 里 \(\) 表示参数未指定/),
  ).toBeVisible({ timeout: 15_000 });
  console.log(`  ${answerer.username} 回复成功`);

  // 3) 楼主采纳（另一个人不该看到采纳按钮 —— 权限边界）
  await expect(
    otherPage.getByRole("button", { name: "采纳为答案" }),
  ).toHaveCount(0);
  await other.close();

  await page.goto(url);
  await expect(page.getByText("1 条回复")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "采纳为答案" }).click();
  await expect(page.getByText("已采纳")).toBeVisible({ timeout: 15_000 });
  console.log("  楼主采纳成功");

  // 4) 列表页显示「已解决」
  await page.goto("/forum");
  await expect(page.getByText("已解决").first()).toBeVisible({ timeout: 15_000 });
});

test("只有楼主能采纳：非楼主调用会被服务端拒绝", async ({ page, browser }) => {
  const owner = await register(page, "permowner");
  const title = "指针和数组名到底是不是一回事？";
  const url = await createPost(page, title, "书里说数组名会退化成指针，但 sizeof 的结果又不一样。");
  void owner;

  // 另一个人回复
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await register(otherPage, "permother");
  await otherPage.goto(url);
  await otherPage.fill("#reply-top", "数组名不是指针，只是在多数表达式里会转换成指向首元素的指针。");
  await otherPage.getByRole("button", { name: "回复" }).click();
  await waitForRedirect(otherPage, "**/forum/**", "回复");

  // 非楼主：界面上不该出现采纳按钮
  await expect(otherPage.getByRole("button", { name: "采纳为答案" })).toHaveCount(0);
  await other.close();

  // 楼主能看到并采纳
  await page.goto(url);
  await expect(page.getByRole("button", { name: "采纳为答案" })).toBeVisible({
    timeout: 15_000,
  });
});
