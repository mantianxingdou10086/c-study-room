import { expect, test } from "@playwright/test";

/**
 * 站点级元数据的验收（M8 的一部分）。
 *
 * 这几条容易"写完就忘了为什么这么写"，所以用测试把**刻意的决定**钉住。
 */
test("sitemap.xml：收录讲义页，且**不收录**题库详情页", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();

  // 讲义页要收录（这是内容主体）
  expect(xml).toContain("/learn/ch01-introducing-c/why-c");
  expect(xml).toContain("/learn");
  expect(xml).toContain("/exercises");

  // 题库详情页**刻意不收录**：未登录时那页只有登录引导、没有题干，
  // 属于薄内容，收录了反而拉低整站质量。这条断言是防止以后"顺手"加回去。
  expect(xml).not.toContain("/exercises/ch01-why-c-q1");

  // 个人化页面也不该出现
  expect(xml).not.toContain("/progress");
  expect(xml).not.toContain("/settings");
});

test("robots.txt：允许内容页，禁止个人化页面与 API", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const txt = await res.text();

  expect(txt).toContain("User-Agent: *");
  expect(txt).toContain("Allow: /");
  for (const path of ["/progress", "/settings", "/login", "/register", "/api/"]) {
    expect(txt).toContain(`Disallow: ${path}`);
  }
  expect(txt).toContain("Sitemap:");
});

test("不存在的地址：显示 404 页并给出出路", async ({ page }) => {
  const res = await page.goto("/learn/ch99-nope/nope");
  expect(res?.status()).toBe(404);

  await expect(
    page.getByRole("heading", { name: "这个地址没有对应的页面" }),
  ).toBeVisible();
  // 三条出路都要在，别让人自己找回去
  await expect(page.getByRole("link", { name: /去课程地图/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "去题库" })).toBeVisible();
  await expect(page.getByRole("link", { name: "回首页" })).toBeVisible();
});

test("首页与讲义页有可分享的元数据（OG/标题）", async ({ page }) => {
  await page.goto("/learn/ch01-introducing-c/why-c");
  const og = await page
    .locator('meta[property="og:site_name"]')
    .getAttribute("content");
  expect(og).toBeTruthy();
  // 标题模板生效：%s · 站名
  await expect(page).toHaveTitle(/·/);
});
