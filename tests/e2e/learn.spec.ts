import { expect, test } from "@playwright/test";

/**
 * 课程与讲义的验收（M3）。
 * 重点验证"内容真的渲染出来了"，而不是"页面没报错"：
 *  - 课程地图把 28 章 / 5 阶段都列出来，未上线的章节不可点
 *  - 讲义页：标题、目录锚点、代码高亮、可运行示例、随堂检测都在
 *  - 目录里的锚点必须真的能跳到对应标题（这是最容易悄悄坏掉的地方）
 */
test.describe("课程地图", () => {
  test("列出五个阶段与前 10 章，11~28 章标记为即将上线", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.getByRole("heading", { name: "课程地图" })).toBeVisible();

    for (const stage of ["C 入门", "基本构件", "组织数据与逻辑", "指针与抽象", "工程与标准库"]) {
      await expect(page.getByRole("heading", { name: stage })).toBeVisible();
    }

    // 第 1 章可点（章节标题是 h3，课时行才是 link），第 11 章标记为即将上线
    await expect(page.getByRole("heading", { name: /第 1 章 · C 语言概述/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /第 11 章 · 指针/ })).toBeVisible();
    const upcoming = await page.getByText("即将上线").count();
    console.log(`标记「即将上线」的章节数 = ${upcoming}`);
    expect(upcoming).toBe(18); // 第 11~28 章
  });

  test("第 1 章的四节课都能从地图点进去", async ({ page }) => {
    await page.goto("/learn");
    for (const title of [
      "C 到底是一门什么样的语言",
      "从源代码到能运行的程序",
      "拆开第一个程序",
      "动手：故意把程序改坏",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
    }
  });
});

test.describe("讲义页", () => {
  test("正文、目录、代码高亮、随堂检测都渲染出来", async ({ page }) => {
    await page.goto("/learn/ch01-introducing-c/why-c");

    await expect(page.getByRole("heading", { name: "C 到底是一门什么样的语言" })).toBeVisible();

    // 讲义正文（不是"编写中"占位）。注意用 heading 角色：
    // 目录里的链接文字与标题相同，getByText 会命中两个元素（strict mode 报错）
    await expect(page.getByText("这一节的讲义还在编写中")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "先从「你在跟谁打交道」说起" }),
    ).toBeVisible();

    // 目录存在，且锚点真的指向存在的标题
    const tocLinks = page.locator('aside a[href^="#"]');
    const tocCount = await tocLinks.count();
    console.log(`目录条目数 = ${tocCount}`);
    expect(tocCount).toBeGreaterThan(3);
    for (let i = 0; i < tocCount; i++) {
      const href = await tocLinks.nth(i).getAttribute("href");
      const id = href!.slice(1);
      await expect(page.locator(`#${id}`), `锚点 ${href} 应该对应一个真实标题`).toHaveCount(1);
    }

    // 代码高亮：rehype-pretty-code 的 figure 应该出现
    const figures = await page.locator("[data-rehype-pretty-code-figure]").count();
    console.log(`高亮代码块数 = ${figures}`);
    expect(figures).toBeGreaterThan(0);

    // 可运行示例与随堂检测
    await expect(page.getByRole("button", { name: "运行", exact: true }).first()).toBeVisible();
    await expect(page.getByText("随堂检测").first()).toBeVisible();
    await expect(page.getByText("ch01-why-c-q1")).toBeVisible();
  });

  test("随堂检测：答错有反馈、答对有绿色提示（判分器真的在跑）", async ({ page }) => {
    await page.goto("/learn/ch01-introducing-c/why-c");

    const firstQuiz = page.locator("section", { hasText: "ch01-why-c-q1" }).first();
    // 选一个错误选项（第 1 个选项是干扰项）
    await firstQuiz.getByRole("radio").first().check();
    await firstQuiz.getByRole("button", { name: "检查答案" }).click();
    await expect(firstQuiz.getByText(/选的是第 1 个/)).toBeVisible();
    console.log("答错反馈 →", await firstQuiz.getByText(/选的是第 1 个/).innerText());

    // 换成正确选项（第 2 个）
    await firstQuiz.getByRole("radio").nth(1).check();
    await firstQuiz.getByRole("button", { name: "检查答案" }).click();
    await expect(firstQuiz.getByText("答对了。")).toBeVisible();
  });

  test("提示是逐级展开的，参考答案要主动点开", async ({ page }) => {
    await page.goto("/learn/ch01-introducing-c/from-source-to-program");
    const quiz = page.locator("section", { hasText: "ch01-from-source-to-program-q3" }).first();
    // 按钮文案形如「提示 1/2」，别写死总数——题目有几条提示是题库数据说了算
    const hintButton = quiz.getByRole("button", { name: /^提示 1\// });
    await expect(hintButton).toBeVisible();
    // 点之前不应该有提示内容（题干里虽然也提到 reference，但那是题干不是提示）
    await expect(quiz.getByText("这个词", { exact: false })).toHaveCount(0);
    await hintButton.click();
    // 断言的是**提示本身的文字**，不是题干
    const hintText = quiz.getByText("这个词", { exact: false }).first();
    await expect(hintText).toBeVisible();
    console.log("第一条提示 →", await hintText.innerText());
  });

  /**
   * 这一条原来是「挑一个还没写讲义的章，断言显示『编写中』而不是 500」。
   * 第 8~10 章交付后（CONTENT_READY_CHAPTERS = 10），MVP 范围内**已经没有任何未写讲义的课时**，
   * 那条断言的前提消失了——但「讲义缺失时不能 500」这件事仍然必须被盯着。
   *
   * 改成**按 sitemap 全量回读**：我们向搜索引擎宣称收录的每一个讲义 URL，
   * 都必须真的渲染出东西（要么真讲义，要么「编写中」兜底），一个都不许白屏或 500。
   *
   * 这样写还有个好处：下一批往 `lessons.ts` 里排新章课时、但 MDX 还没写时，
   * 「编写中」那条分支会**自动**被这条覆盖到，不用再手工把断言改指某个 URL
   * （前三轮每次都因为"这一章写完了"而不得不改它，改到第三次就知道该换个写法了）。
   */
  test("sitemap 里宣称收录的每个讲义页都真的能渲染（讲义或「编写中」兜底）", async ({
    page,
    request,
  }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const paths = [...xml.matchAll(/<loc>[^<]*?(\/learn\/[^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .filter((p) => !p.includes("#"));
    expect(paths.length, "sitemap 里应当有讲义页").toBeGreaterThan(0);
    console.log(`sitemap 宣称收录讲义页 ${paths.length} 个`);

    const bad: string[] = [];
    for (const p of paths) {
      const res = await page.goto(p);
      if (res?.status() !== 200) {
        bad.push(`${p} → HTTP ${res?.status()}`);
        continue;
      }
      const hasLecture = (await page.locator("article h2").count()) > 0;
      const hasFallback = await page
        .getByText("这一节的讲义还在编写中")
        .isVisible()
        .catch(() => false);
      if (!hasLecture && !hasFallback) bad.push(`${p} → 既没有讲义正文，也没有「编写中」兜底`);
      if (hasFallback) {
        const hasTakeaway = await page
          .getByText("本节要点：")
          .isVisible()
          .catch(() => false);
        if (!hasTakeaway) bad.push(`${p} → 兜底页缺少「本节要点：」`);
      }
    }
    expect(bad, `这些讲义页渲染不出来：\n${bad.join("\n")}`).toEqual([]);
  });

  test("上一节 / 下一节能跨章连续走", async ({ page }) => {
    await page.goto("/learn/ch01-introducing-c/lab-read-the-error");
    const next = page.getByRole("link", { name: /下一节/ });
    await expect(next).toContainText("变量");
  });

  test("第 2 章（含 Pitfall 里的代码块）也正常渲染", async ({ page }) => {
    await page.goto("/learn/ch02-fundamentals/variables-and-assignment");

    await expect(
      page.getByRole("heading", { name: "变量：给数据起个名字" }),
    ).toBeVisible();
    await expect(page.getByText("这一节的讲义还在编写中")).toHaveCount(0);

    // Pitfall 组件里的 fenced code block：这是 MDX 里最容易坏的一种嵌套。
    // 注意这两个 Pitfall 都传了自定义标题，所以页面上没有默认的「常见坑」字样
    await expect(page.getByText("用了没初始化的变量")).toBeVisible();
    await expect(page.getByText("把赋值写成数学等式")).toBeVisible();
    // 代码块里的注释文字必须存在，才说明 Pitfall 内部的 markdown 真的被解析了
    await expect(page.getByText("打印的是垃圾值，不是 0")).toBeVisible();

    // 高亮代码块与随堂检测
    expect(await page.locator("[data-rehype-pretty-code-figure]").count()).toBeGreaterThan(2);
    await expect(page.getByText("ch02-variables-and-assignment-q1")).toBeVisible();
    await expect(page.getByText("ch02-variables-and-assignment-q3")).toBeVisible();
  });

  test("第 2 章的动手课有可运行示例与代码题", async ({ page }) => {
    await page.goto("/learn/ch02-fundamentals/lab-first-calculator");
    await expect(
      page.getByRole("heading", { name: "动手：把公式写成程序" }),
    ).toBeVisible();
    await expect(page.getByText("ch02-lab-first-calculator-q1")).toBeVisible();
    // 代码题应该有"运行并检查"按钮，而不是普通的"检查答案"
    await expect(page.getByRole("button", { name: "运行并检查" }).first()).toBeVisible();
  });
});
