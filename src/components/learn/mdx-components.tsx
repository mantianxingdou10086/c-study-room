import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Bug, Info, Lightbulb, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { TryIt } from "./try-it";
import { Quiz } from "./quiz";

/**
 * 讲义可用的 MDX 组件 + 基础排版。
 *
 * 讲义只用这一套"受控词汇"来写（Callout/Pitfall/KeyPoint/TryIt/Quiz/BookRef），
 * 好处是 50 节讲义的结构和视觉完全一致，而且以后想统一改样式只改这里。
 */

// ── 结构组件 ────────────────────────────────────────────────────────

const TONES = {
  tip: {
    icon: Lightbulb,
    className: "border-primary/25 bg-primary-soft",
    iconClass: "text-primary",
    label: "小技巧",
  },
  info: {
    icon: Info,
    className: "border-border bg-surface-muted",
    iconClass: "text-muted-foreground",
    label: "补充",
  },
  warn: {
    icon: AlertTriangle,
    className: "border-warning/30 bg-warning-soft",
    iconClass: "text-warning",
    label: "注意",
  },
} as const;

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
}) {
  const t = TONES[type];
  const Icon = t.icon;
  return (
    <aside className={cn("my-5 flex gap-3 rounded-xl border p-4", t.className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.iconClass)} />
      <div className="min-w-0 space-y-1.5 text-sm leading-relaxed">
        <p className="font-medium">{title ?? t.label}</p>
        <div className="space-y-2 text-foreground/90">{children}</div>
      </div>
    </aside>
  );
}

/** 常见坑：全站统一用这个，学生一眼就知道"这里是会出错的地方" */
export function Pitfall({ children, title }: { children?: React.ReactNode; title?: string }) {
  return (
    <aside className="my-5 rounded-xl border border-danger/30 bg-danger-soft p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-danger">
        <Bug className="h-4 w-4" />
        {title ?? "常见坑"}
      </p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </aside>
  );
}

/** 这一节的一句话结论（与课时数据的 takeaway 呼应） */
export function KeyPoint({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-5 flex gap-3 rounded-xl border-l-4 border-l-primary border-y border-r border-border bg-surface p-4">
      <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-sm font-medium leading-relaxed">{children}</p>
    </div>
  );
}

/** 延伸阅读：只给原书页码，不给原文（版权） */
export function BookRef({ pages, note }: { pages: string; note?: string }) {
  return (
    <p className="my-5 flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
      <BookOpen className="h-3.5 w-3.5 shrink-0" />
      <span>
        想更系统地看这一节的内容，可对照原书 PDF 第 <strong className="font-medium text-foreground">{pages}</strong> 页
        {note ? `（${note}）` : ""}。本站讲义为独立编写，不是原书替代品。
      </span>
    </p>
  );
}

/** 学习目标清单 */
export function Goals({ items }: { items: string[] }) {
  return (
    <div className="my-5 rounded-xl border border-border bg-surface-muted p-4">
      <p className="text-sm font-medium">学完这一节，你应该能：</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 基础排版 ────────────────────────────────────────────────────────

const components = {
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-10 scroll-mt-20 border-b border-border pb-2 text-xl font-semibold tracking-tight"
      {...p}
    />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-7 scroll-mt-20 text-base font-semibold tracking-tight" {...p} />
  ),
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 text-[15px] leading-7" {...p} />
  ),
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7" {...p} />
  ),
  ol: (p: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-7" {...p} />
  ),
  li: (p: React.LiHTMLAttributes<HTMLLIElement>) => <li className="pl-1" {...p} />,
  strong: (p: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...p} />
  ),
  a: ({ href = "", ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-primary underline underline-offset-2" {...p} />
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-2"
        {...p}
      />
    ),
  code: (p: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
      {...p}
    />
  ),
  pre: (p: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-5 overflow-x-auto rounded-xl border border-border bg-code-bg p-4 font-mono text-[13px] leading-6"
      {...p}
    />
  ),
  blockquote: (p: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-5 border-l-4 border-border pl-4 text-sm text-muted-foreground" {...p} />
  ),
  table: (p: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="border-b border-border bg-surface-muted px-3 py-2 text-left font-medium"
      {...p}
    />
  ),
  td: (p: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-b border-border px-3 py-2 align-top" {...p} />
  ),
  hr: () => <hr className="my-8 border-border" />,

  // ── 讲义专用组件 ──
  Callout,
  Pitfall,
  KeyPoint,
  BookRef,
  Goals,
  TryIt,
  Quiz,
};

export const mdxComponents = components;
