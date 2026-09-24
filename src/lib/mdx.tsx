/**
 * MDX 渲染管道。
 *
 * ⚠️ 为什么不用 next-mdx-remote（实测结论，见 docs/content-pipeline.md）：
 *   next-mdx-remote v6 的 `compileMDX`（RSC 路径）会**静默丢掉 JSX 表达式**——
 *   `<Goals items={["a","b"]} />` 的 items 变成 undefined，`<TryIt>{`code`}</TryIt>`
 *   的 children 变成空。同一个 source 用 @mdx-js/mdx 的 `evaluate` 编译则一切正常：
 *     评估 A：s=string | n=number | arr=Array(2) | children=string
 *     评估 B：s=string | children=string          ← 表达式被吃掉
 *   所以这里直接用 @mdx-js/mdx，少一层封装、行为可预测。
 *
 * 另外两个自制的小东西（避免再引依赖）：
 *  - `rehypeHeadingIds`：给 h2/h3 加 id（等价于 rehype-slug）
 *  - `extractToc`：从源码抽目录。**约定：标题里不要写行内代码或强调**，
 *     否则源码文本与渲染文本不一致，锚点会错位。
 */
import * as React from "react";
import { evaluate, type EvaluateOptions } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/components/learn/mdx-components";

export type TocItem = { depth: 2 | 3; text: string; id: string };

export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

function textOf(node: HastNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

function walk(node: HastNode, fn: (n: HastNode) => void) {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

const rehypeHeadingIds = () => (tree: HastNode) => {
  walk(tree, (n) => {
    if (n.type === "element" && (n.tagName === "h2" || n.tagName === "h3")) {
      n.properties = { ...n.properties, id: slugifyHeading(textOf(n)) };
    }
  });
};

/** 从源码抽目录：跳过代码块里的 # 注释 */
export function extractToc(source: string): TocItem[] {
  const out: TocItem[] = [];
  let inFence = false;
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ depth: m[1].length as 2 | 3, text: m[2], id: slugifyHeading(m[2]) });
  }
  return out;
}

const MDX_OPTIONS: Pick<EvaluateOptions, "remarkPlugins" | "rehypePlugins"> = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [
    rehypeHeadingIds,
    [
      rehypePrettyCode,
      {
        // 双主题：浅色 github-light、深色 github-dark（CSS 里按 .dark 切变量）
        theme: { light: "github-light", dark: "github-dark" },
        keepBackground: false,
        defaultLang: { block: "c", inline: "c" },
      },
    ],
  ] as EvaluateOptions["rehypePlugins"],
};

/** 编译并渲染一节讲义（同一请求内多次调用只编译一次，靠 React cache） */
export const renderLesson = React.cache(async function renderLesson(
  source: string,
): Promise<React.ReactElement> {
  const mod = await evaluate(source, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
    ...MDX_OPTIONS,
  });
  const MDXContent = mod.default as React.ComponentType<{
    components?: Record<string, unknown>;
  }>;
  return <MDXContent components={mdxComponents as unknown as Record<string, unknown>} />;
});
