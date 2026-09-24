"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Lightbulb,
  Loader2,
  Play,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/code/code-editor";
import { OutputPane } from "@/components/code/output-pane";
import { CRunner } from "@/lib/c-runner/client";
import type { RunResult } from "@/lib/c-runner/engine";
import { DEFAULT_ENGINE } from "@/lib/c-runner/registry";
import {
  revealReferenceAnswer,
  submitExercise,
  type SubmitResult,
} from "@/app/actions/exercises";
import type { PublicExercise } from "@/lib/exercises/public";
import { cn } from "@/lib/utils";

export type InitialState = {
  passed: boolean;
  attempts: number;
  usedHint: boolean;
  viewedAnswer: boolean;
  xpAwarded: number;
  code: string | null;
  option: number | null;
  blanks: string[] | null;
  text: string | null;
} | null;

const KIND_LABEL = {
  MCQ: "选择",
  FILL: "填空",
  OUTPUT: "读程序写结果",
  CODE: "动手写代码",
} as const;

/**
 * 单题练习界面。
 *
 * 判题在服务端（标准答案不下发浏览器）；代码题例外——代码必须在浏览器里跑（clang 是 WASM），
 * 所以是「本地跑出 stdout → 把 stdout 交给服务端 → 服务端比对标准答案」。
 */
export function Practice({
  exercise,
  initial,
  backHref,
  backLabel,
}: {
  exercise: PublicExercise;
  initial: InitialState;
  /** 回讲义的链接（由服务端页面算好，别在客户端拼路由） */
  backHref: string;
  backLabel: string;
}) {
  const [option, setOption] = React.useState<number | null>(initial?.option ?? null);
  const [blanks, setBlanks] = React.useState<string[]>(
    initial?.blanks ?? Array.from({ length: exercise.blankCount ?? 0 }, () => ""),
  );
  const [text, setText] = React.useState(initial?.text ?? "");
  const [code, setCode] = React.useState(initial?.code ?? exercise.starterCode ?? "");

  const [hintsShown, setHintsShown] = React.useState(0);
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "preparing" | "running">("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [passed, setPassed] = React.useState(initial?.passed ?? false);
  // 看过参考答案就不计 XP —— 状态来自服务端（刷新页面也保持）
  const [viewedAnswer, setViewedAnswer] = React.useState(
    initial?.viewedAnswer ?? false,
  );

  const runnerRef = React.useRef<CRunner | null>(null);
  React.useEffect(() => () => runnerRef.current?.dispose(), []);

  /** 在浏览器里真编译运行（只给看输出，不判分） */
  async function runCode(): Promise<RunResult | null> {
    const runner = (runnerRef.current ??= new CRunner());
    setPhase("preparing");
    setProgress(0);
    try {
      if (!runner.isReady(DEFAULT_ENGINE)) {
        await runner.prepare(DEFAULT_ENGINE, setProgress);
      }
      setPhase("running");
      const res = await runner.run(DEFAULT_ENGINE, code, {
        stdin: exercise.stdin ?? "",
        timeoutMs: 5000,
      });
      setRunResult(res);
      return res;
    } catch (e) {
      setError(`运行环境出问题了：${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      setPhase("idle");
    }
  }

  async function onRun() {
    setBusy(true);
    setError(null);
    setResult(null);
    await runCode();
    setBusy(false);
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let stdout: string | undefined;
      if (exercise.kind === "CODE") {
        const res = await runCode();
        if (!res) return;
        if (!res.ok) {
          setError("代码没能跑起来，先看下面的编译报错");
          return;
        }
        stdout = res.stdout;
      }

      const r = await submitExercise({
        exerciseId: exercise.id,
        option,
        blanks,
        text,
        stdout,
        code: exercise.kind === "CODE" ? code : undefined,
        usedHint: hintsShown > 0,
        viewedAnswer,
      });
      setResult(r);
      if (r.ok && r.passed) setPassed(true);
    } catch {
      setError("网络出问题了，稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function onReveal() {
    setBusy(true);
    setError(null);
    try {
      const r = await revealReferenceAnswer(exercise.id);
      if (r.ok && r.answer) {
        setRevealed(r.answer);
        setViewedAnswer(true);
      } else setError(r.error ?? "取不到参考答案");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    exercise.kind === "MCQ"
      ? option !== null
      : exercise.kind === "FILL"
        ? blanks.some((b) => b.trim() !== "")
        : exercise.kind === "OUTPUT"
          ? text.trim() !== ""
          : code.trim() !== "";

  return (
    <div className="space-y-5">
      {/* 题干 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{KIND_LABEL[exercise.kind]}</Badge>
        <Badge>{exercise.xp} XP</Badge>
        {exercise.difficulty === 3 && <Badge tone="warning">挑战</Badge>}
        {passed && (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" />
            已通过
          </Badge>
        )}
        {initial && initial.attempts > 0 && (
          <span className="text-xs text-subtle-foreground">
            已提交 {initial.attempts} 次
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">
        <pre className="whitespace-pre-wrap font-sans">{exercise.prompt}</pre>
      </div>

      {/* 作答区 */}
      {exercise.kind === "MCQ" && (
        <fieldset className="space-y-2">
          <legend className="sr-only">选择一项</legend>
          {(exercise.options ?? []).map((opt, i) => (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
                option === i
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name={`opt-${exercise.id}`}
                checked={option === i}
                onChange={() => setOption(i)}
                className="mt-0.5"
              />
              <span className="font-mono text-xs text-subtle-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
            </label>
          ))}
        </fieldset>
      )}

      {exercise.kind === "FILL" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            共 {exercise.blankCount} 空，按顺序填：
          </p>
          {blanks.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right font-mono text-xs text-subtle-foreground">
                #{i + 1}
              </span>
              <input
                value={v}
                onChange={(e) => {
                  const next = [...blanks];
                  next[i] = e.target.value;
                  setBlanks(next);
                }}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ))}
        </div>
      )}

      {exercise.kind === "OUTPUT" && (
        <div>
          <label htmlFor="out-answer" className="text-xs text-muted-foreground">
            这个程序会打印什么？（一行一行写出来）
          </label>
          <textarea
            id="out-answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {exercise.kind === "CODE" && (
        <div className="space-y-2">
          {exercise.stdin && (
            <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              程序运行时输入（scanf 会读到）：{JSON.stringify(exercise.stdin)}
            </p>
          )}
          <CodeEditor value={code} onChange={setCode} filename="main.c" minRows={10} />
        </div>
      )}

      {/* 操作区 */}
      <div className="flex flex-wrap items-center gap-2">
        {exercise.kind === "CODE" && (
          <Button type="button" variant="secondary" onClick={onRun} disabled={busy}>
            {phase === "preparing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                准备编译器 {Math.round(progress * 100)}%
              </>
            ) : phase === "running" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                运行中…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                先跑一下
              </>
            )}
          </Button>
        )}
        <Button type="button" onClick={onSubmit} disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          提交答案
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setHintsShown((n) => Math.min(n + 1, exercise.hints.length))}
          disabled={hintsShown >= exercise.hints.length}
        >
          <Lightbulb className="h-4 w-4" />
          {hintsShown === 0
            ? `看提示（共 ${exercise.hints.length} 条）`
            : hintsShown >= exercise.hints.length
              ? "提示已全部展开"
              : `再看一条（${hintsShown}/${exercise.hints.length}）`}
        </Button>
      </div>

      {/* 逐级提示 */}
      {hintsShown > 0 && (
        <ol className="space-y-2">
          {exercise.hints.slice(0, hintsShown).map((h, i) => (
            <li
              key={i}
              className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                <span className="mr-1 font-medium text-warning">提示 {i + 1}</span>
                {h}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* 运行输出 */}
      {exercise.kind === "CODE" && runResult && <OutputPane result={runResult} />}

      {/* 判题结果 */}
      {result?.ok && (
        <div
          role="status"
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            result.passed
              ? "border-success/30 bg-success-soft"
              : "border-danger/30 bg-danger-soft",
          )}
        >
          <p
            className={cn(
              "flex items-center gap-2 font-medium",
              result.passed ? "text-success" : "text-danger",
            )}
          >
            {result.passed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {result.passed ? "答对了" : "还不对"}
            {result.partial && (
              <span className="font-normal text-muted-foreground">
                （对 {result.partial.correct}/{result.partial.total} 空）
              </span>
            )}
          </p>
          <p className="mt-1.5 text-foreground">{result.message}</p>

          {result.passed && (
            <p className="mt-2 text-xs text-muted-foreground">
              {result.xpGained ? (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-success">
                  <Sparkles className="h-3.5 w-3.5" />+{result.xpGained} XP
                  {result.level ? ` · 等级 ${result.level}` : ""}
                  {result.streak ? ` · 连续 ${result.streak} 天` : ""}
                  {result.newBadges?.length
                    ? ` · 新徽章「${result.newBadges.map((b) => b.name).join("、")}」`
                    : ""}
                </span>
              ) : (
                <span>
                  {viewedAnswer
                    ? "看过参考答案，这道题不再计 XP"
                    : "这道题的 XP 之前已经拿过了"}
                </span>
              )}
            </p>
          )}

          {!result.passed && (
            <p className="mt-2 text-xs text-muted-foreground">
              先看提示，或{" "}
              <button
                type="button"
                onClick={onReveal}
                className="text-primary underline underline-offset-2"
              >
                展开参考答案
              </button>
              （看过之后这道题不再计 XP）
            </p>
          )}
        </div>
      )}

      {/* 参考答案 */}
      {revealed && (
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            参考答案
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {revealed}
          </pre>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <p className="text-xs text-subtle-foreground">
        想不起来相关知识点？回{" "}
        <Link href={backHref} className="text-primary underline underline-offset-2">
          {backLabel}
        </Link>{" "}
        看看讲义。
      </p>
    </div>
  );
}
