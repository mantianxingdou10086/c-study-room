"use client";

import { AlertTriangle, CheckCircle2, Info, TimerOff, XCircle } from "lucide-react";
import type { RunResult } from "@/lib/c-runner/engine";
import { cn } from "@/lib/utils";

/** 把退出码/阶段翻译成人话，别让学生看 exit=139 发呆 */
function statusOf(r: RunResult) {
  if (r.stage === "timeout") {
    return {
      icon: TimerOff,
      text: "运行超时",
      tone: "text-warning",
      hint: "程序没有在限定时间内结束，多半是循环缺少结束条件。",
    };
  }
  if (r.stage === "compile") {
    return {
      icon: XCircle,
      text: "编译没有通过",
      tone: "text-danger",
      hint: "先看下面第一行报错——编译器通常一次只报第一个真问题。",
    };
  }
  if (r.stage === "init") {
    return {
      icon: AlertTriangle,
      text: "运行环境没准备好",
      tone: "text-danger",
      hint: "刷新页面重试；如果一直失败，切到「JSCPP（秒开模式）」。",
    };
  }
  if (r.ok) {
    return {
      icon: CheckCircle2,
      text: "运行结束（退出码 0）",
      tone: "text-success",
      hint: null,
    };
  }
  return {
    icon: XCircle,
    text: `程序以非 0 状态结束（退出码 ${r.exitCode ?? "未知"}）`,
    tone: "text-danger",
    hint: "退出码非 0 说明程序运行时出了问题。",
  };
}

export function OutputPane({ result }: { result: RunResult | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-border bg-code-bg p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          点「运行」后，程序的输出会显示在这里。
        </p>
      </div>
    );
  }

  const s = statusOf(result);
  const Icon = s.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
        <span className={cn("flex items-center gap-1.5 text-sm font-medium", s.tone)}>
          <Icon className="h-4 w-4" />
          {s.text}
        </span>
        <span className="text-xs text-subtle-foreground tabular-nums">
          {result.ms} ms · {result.engine}
          {result.truncated ? " · 输出已截断" : ""}
        </span>
      </div>

      {s.hint && (
        <p className="border-b border-border px-4 py-2 text-xs leading-relaxed text-muted-foreground">
          {s.hint}
        </p>
      )}

      {result.notes?.length ? (
        <ul className="border-b border-border bg-warning-soft/60 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
          {result.notes.map((n) => (
            <li key={n}>注意：{n}</li>
          ))}
        </ul>
      ) : null}

      <div className="max-h-80 overflow-auto p-4">
        {result.stderr && (
          <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-6 text-danger">
            {result.stderr}
          </pre>
        )}
        {result.stdout ? (
          <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-6 text-foreground">
            {result.stdout}
          </pre>
        ) : !result.stderr ? (
          <p className="font-mono text-[12.5px] text-subtle-foreground">
            （程序没有任何输出）
          </p>
        ) : null}
      </div>
    </div>
  );
}
