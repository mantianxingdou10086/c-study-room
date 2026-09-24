"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 轻量代码编辑器：textarea + 行号 + Tab 缩进。
 * 刻意不引入 Monaco/CodeMirror——首版只需要"能舒服地敲 C"，
 * 少 1MB 依赖换来更快的首屏。
 */
export function CodeEditor({
  value,
  onChange,
  filename = "main.c",
  readOnly = false,
  minRows = 16,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  filename?: string;
  readOnly?: boolean;
  minRows?: number;
  className?: string;
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

  const lineCount = Math.max(value.split("\n").length, minRows);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: en } = ta;
    if (e.shiftKey) {
      // 反缩进：删掉行首最多 4 个空格
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const before = value.slice(lineStart, s);
      const drop = before.match(/^ {1,4}/)?.[0].length ?? 0;
      if (drop > 0) {
        const next = value.slice(0, lineStart) + value.slice(lineStart + drop);
        onChange(next);
        requestAnimationFrame(() => ta.setSelectionRange(s - drop, en - drop));
      }
      return;
    }
    const next = value.slice(0, s) + "    " + value.slice(en);
    onChange(next);
    requestAnimationFrame(() => ta.setSelectionRange(s + 4, s + 4));
  }

  function syncScroll() {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl border border-border bg-code-bg",
        className,
      )}
    >
      <div
        ref={gutterRef}
        aria-hidden
        className="select-none overflow-hidden border-r border-border bg-surface-muted/60 px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-muted-foreground"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={`代码编辑器 ${filename}`}
        rows={lineCount}
        className={cn(
          "flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[13px] leading-6",
          "text-foreground outline-none placeholder:text-subtle-foreground",
        )}
      />
    </div>
  );
}
