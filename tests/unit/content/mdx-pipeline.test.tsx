import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractToc, renderLesson, slugifyHeading } from "@/lib/mdx";

/**
 * 讲义管道的回归测试。
 *
 * 这里守的是一条**踩过的坑**：next-mdx-remote v6 的 compileMDX（RSC 路径）
 * 会静默丢掉 JSX 表达式——数组属性变 undefined、模板字符串子节点变空。
 * 讲义里 `<Goals items={[...]}>` 和 `<TryIt>{`code`}</TryIt>` 都依赖表达式，
 * 所以必须有一个测试盯着它，否则将来换依赖时会出现"讲义里代码块全空"这种诡异现象。
 */
describe("MDX 讲义管道", () => {
  it("表达式属性（数组）能传进组件", async () => {
    const el = await renderLesson(`<Goals items={["第一条目标", "第二条目标"]} />`);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("第一条目标");
    expect(html).toContain("第二条目标");
  });

  it("模板字符串子节点能传进组件（TryIt 的代码就靠这个）", async () => {
    const el = await renderLesson("<TryIt>{`printf(\"hi\");`}</TryIt>");
    const html = renderToStaticMarkup(el);
    expect(html).toContain("printf");
  });

  it("字符串属性照常工作", async () => {
    const el = await renderLesson(`<BookRef pages="22~27" note="第 1 章" />`);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("22~27");
    expect(html).toContain("第 1 章");
  });

  it("代码块被高亮（rehype-pretty-code 生效）", async () => {
    const el = await renderLesson("```c\nint main(void) { return 0; }\n```");
    const html = renderToStaticMarkup(el);
    expect(html).toContain("data-rehype-pretty-code-figure");
    // 双主题下每行会带 shiki 的 css 变量
    expect(html).toContain("--shiki-light");
  });

  it("h2/h3 会被加上与目录一致的锚点 id", async () => {
    const el = await renderLesson("## 算术运算符\n\n正文\n\n### 整数除法\n");
    const html = renderToStaticMarkup(el);
    expect(html).toContain(`id="${slugifyHeading("算术运算符")}"`);
    expect(html).toContain(`id="${slugifyHeading("整数除法")}"`);
  });

  it("目录提取会跳过代码块里的注释", () => {
    const toc = extractToc("## 真的标题\n\n```c\n// ## 假的标题\n```\n\n### 小标题\n");
    expect(toc.map((t) => t.text)).toEqual(["真的标题", "小标题"]);
    expect(toc.map((t) => t.depth)).toEqual([2, 3]);
  });
});
