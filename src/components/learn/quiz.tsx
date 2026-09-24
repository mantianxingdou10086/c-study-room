"use client";

import * as React from "react";
import { CheckCircle2, Eye, Lightbulb, Loader2, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/code/code-editor";
import { OutputPane } from "@/components/code/output-pane";
import { CRunner } from "@/lib/c-runner/client";
import type { RunResult } from "@/lib/c-runner/engine";
import { DEFAULT_ENGINE } from "@/lib/c-runner/registry";
import { getExercise } from "@/lib/content";
import type { FillValidator, McqValidator } from "@/lib/content/schema";
import { judge, type JudgeResult } from "@/lib/judge/validators";
import { cn } from "@/lib/utils";

/**
 * 讲义里的随堂检测。
 *
 * 判分用的是 src/lib/judge/validators.ts —— 和题库页（M5）**同一套**判分代码，
 * 所以这里测出来的行为就是将来正式判题的行为，不会出现"课上判对、题库判错"。
 *
 * 反馈原则：错了不直接给答案，先给"哪一步不对"的方向；答案要主动展开才给（看过后该题不再计 XP）。
 */
export function Quiz({ id }: { id: string }) {
  const exercise = getExercise(id);
  if (!exercise) {
    return (
      <div className="my-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
        题目 {id} 不存在（内容数据里没有这个 id）。
      </div>
    );
  }

  return <QuizInner key={id} exercise={exercise} />;
}

function QuizInner({ exercise }: { exercise: NonNullable<ReturnType<typeof getExercise>> }) {
  const [hintsShown, setHintsShown] = React.useState(0);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [result, setResult] = React.useState<JudgeResult | null>(null);

  const [option, setOption] = React.useState<number | null>(null);
  const [text, setText] = React.useState("");
  const [blanks, setBlanks] = React.useState<string[]>([]);
  const [code, setCode] = React.useState(exercise.starterCode ?? "");

  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "preparing" | "running">("idle");
  const [progress, setProgress] = React.useState(0);
  const runnerRef = React.useRef<CRunner | null>(null);
  React.useEffect(() => () => runnerRef.current?.dispose(), []);

  const kindLabel = {
    MCQ: "选择",
    FILL: "填空",
    OUTPUT: "读程序写结果",
    CODE: "动手写代码",
  }[exercise.kind];

  function check() {
    setResult(
      judge(exercise, {
        option,
        blanks,
        text,
        stdout: runResult?.stdout,
      }),
    );
  }

  async function runAndCheck() {
    const runner = (runnerRef.current ??= new CRunner());
    setBusy(true);
    setRunResult(null);
    setResult(null);
    try {
      if (!runner.isReady(DEFAULT_ENGINE)) {
        setPhase("preparing");
        await runner.prepare(DEFAULT_ENGINE, setProgress);
      }
      setPhase("running");
      const res = await runner.run(DEFAULT_ENGINE, code, {
        stdin: exercise.stdin ?? "",
        timeoutMs: 5000,
      });
      setRunResult(res);
      if (res.ok) {
        setResult(judge(exercise, { stdout: res.stdout }));
      }
    } finally {
      setPhase("idle");
      setBusy(false);
    }
  }

  const blankCount =
    exercise.kind === "FILL"
      ? ((exercise.validator as FillValidator).blanks.length ?? 1)
      : 0;

  return (
    <section className="my-5 overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-muted/50 px-4 py-2.5">
        <Badge tone="primary">随堂检测 · {kindLabel}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">
          难度 {"★".repeat(exercise.difficulty)}
          {"☆".repeat(3 - exercise.difficulty)} · {exercise.xp} XP
        </span>
        <span className="ml-auto font-mono text-[11px] text-subtle-foreground">
          {exercise.id}
        </span>
      </header>

      <div className="space-y-4 p-4">
        <Prompt text={exercise.prompt} />

        {/* ── 答题区 ── */}
        {exercise.kind === "MCQ" && (
          <fieldset className="space-y-2">
            <legend className="sr-only">选择一项</legend>
            {(exercise.validator as McqValidator).options.map((opt, i) => (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
                  option === i
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-border-strong hover:bg-surface-muted",
                )}
              >
                <input
                  type="radio"
                  name={exercise.id}
                  checked={option === i}
                  onChange={() => setOption(i)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <span>
                  <span className="mr-1.5 font-mono text-xs text-subtle-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {exercise.kind === "FILL" && (
          <div className="space-y-2">
            {exercise.starterCode && (
              <pre className="overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[12.5px] leading-6">
                {exercise.starterCode}
              </pre>
            )}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: blankCount }, (_, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">第 {i + 1} 空</span>
                  <input
                    value={blanks[i] ?? ""}
                    onChange={(e) => {
                      const next = [...blanks];
                      next[i] = e.target.value;
                      setBlanks(next);
                    }}
                    className="h-9 w-48 rounded-lg border border-border bg-code-bg px-2.5 font-mono text-[13px] outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {exercise.kind === "OUTPUT" && (
          <div>
            <label className="text-xs text-muted-foreground" htmlFor={`out-${exercise.id}`}>
              这个程序的输出是（逐字写出，注意换行）
            </label>
            <textarea
              id={`out-${exercise.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              spellCheck={false}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-code-bg px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>
        )}

        {exercise.kind === "CODE" && (
          <div className="space-y-3">
            <CodeEditor value={code} onChange={setCode} minRows={8} />
            {exercise.stdin !== undefined && exercise.stdin !== "" && (
              <p className="text-xs text-muted-foreground">
                这道题会喂给程序的标准输入：
                <code className="ml-1 rounded bg-surface-muted px-1.5 py-0.5 font-mono">
                  {JSON.stringify(exercise.stdin)}
                </code>
              </p>
            )}
            {runResult && (
              runResult.stage === "compile" ? (
                <div className="rounded-xl border border-danger/30 bg-danger-soft p-3">
                  <p className="text-sm font-medium text-danger">编译没有通过</p>
                  <pre className="mt-2 overflow-auto font-mono text-[12px] leading-5 text-danger whitespace-pre-wrap">
                    {runResult.stderr}
                  </pre>
                </div>
              ) : (
                <OutputPane result={runResult} />
              )
            )}
          </div>
        )}

        {/* ── 操作区 ── */}
        <div className="flex flex-wrap items-center gap-2">
          {exercise.kind === "CODE" ? (
            <Button size="sm" onClick={runAndCheck} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {phase === "preparing" ? `准备编译器 ${Math.round(progress * 100)}%` : "运行并检查"}
            </Button>
          ) : (
            <Button size="sm" onClick={check}>
              检查答案
            </Button>
          )}

          {hintsShown < exercise.hints.length && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setHintsShown((n) => n + 1)}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              提示 {hintsShown + 1}/{exercise.hints.length}
            </Button>
          )}

          {result && !result.passed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAnswer(true)}
              disabled={showAnswer}
            >
              <Eye className="h-3.5 w-3.5" />
              {showAnswer ? "答案已展开" : "看参考答案"}
            </Button>
          )}
        </div>

        {hintsShown > 0 && (
          <ul className="space-y-1.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
            {exercise.hints.slice(0, hintsShown).map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-xs text-muted-foreground">提示 {i + 1}</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-sm",
              result.passed
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger",
            )}
          >
            {result.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>
              {result.message}
              {result.passed && (
                <span className="ml-2 text-xs text-muted-foreground">
                  （本题 {exercise.xp} XP）
                </span>
              )}
            </span>
          </div>
        )}

        {showAnswer && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">
              参考答案（看过之后本题不计入 XP）
            </p>
            <p className="mt-1.5 text-sm">{exercise.referenceAnswer}</p>
            {exercise.kind === "CODE" && exercise.referenceCode && (
              <pre className="mt-2 overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[12.5px] leading-6">
                {exercise.referenceCode}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * 题干渲染：题干里用 ``` 包起来的代码块单独用等宽样式显示。
 * 刻意不引 markdown 渲染器——题干是我们自己写的，格式可控，少一个依赖少一份风险。
 */
function Prompt({ text }: { text: string }) {
  const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i];
    if (plain) {
      nodes.push(
        <p key={`t${i}`} className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {plain.trim()}
        </p>,
      );
    }
    const lang = parts[i + 1];
    const codeText = parts[i + 2];
    if (codeText) {
      nodes.push(
        <pre
          key={`c${i}`}
          className="overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[12.5px] leading-6"
        >
          {codeText.replace(/\n$/, "")}
          {lang ? "" : ""}
        </pre>,
      );
    }
  }
  return <div className="space-y-3">{nodes}</div>;
}
