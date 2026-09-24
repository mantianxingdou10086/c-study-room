"use client";

import * as React from "react";
import { Download, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CodeEditor } from "./code-editor";
import { OutputPane } from "./output-pane";
import { CRunner } from "@/lib/c-runner/client";
import type { RunResult } from "@/lib/c-runner/engine";
import { DEFAULT_ENGINE, ENGINE_INFO, type EngineName } from "@/lib/c-runner/registry";
import { cn } from "@/lib/utils";

export type Example = {
  id: string;
  title: string;
  note: string;
  code: string;
  stdin?: string;
  engine?: EngineName;
};

/**
 * 运行面板：编辑器 + 引擎选择 + 运行 + 输出。
 * 三件必须让学生看见的事：正在下编译器（进度）、跑了多久、错在哪。
 */
export function RunPanel({
  examples,
  initialExampleId,
  minRows = 16,
}: {
  examples: Example[];
  initialExampleId?: string;
  minRows?: number;
}) {
  const runnerRef = React.useRef<CRunner | null>(null);
  const [exampleId, setExampleId] = React.useState(
    initialExampleId ?? examples[0]?.id ?? "",
  );
  const current = examples.find((e) => e.id === exampleId) ?? examples[0];

  const [code, setCode] = React.useState(current?.code ?? "");
  const [stdin, setStdin] = React.useState(current?.stdin ?? "");
  const [engine, setEngine] = React.useState<EngineName>(
    current?.engine ?? DEFAULT_ENGINE,
  );

  const [result, setResult] = React.useState<RunResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "preparing" | "running">("idle");
  const [progress, setProgress] = React.useState(0);
  const [prepareError, setPrepareError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => runnerRef.current?.dispose();
  }, []);

  function runner() {
    runnerRef.current ??= new CRunner();
    return runnerRef.current;
  }

  function pickExample(id: string) {
    const ex = examples.find((e) => e.id === id);
    if (!ex) return;
    setExampleId(id);
    setCode(ex.code);
    setStdin(ex.stdin ?? "");
    setEngine(ex.engine ?? engine);
    setResult(null);
    setPrepareError(null);
  }

  async function run(target: EngineName = engine) {
    setBusy(true);
    setResult(null);
    setPrepareError(null);
    const r = runner();

    try {
      if (!r.isReady(target)) {
        setPhase("preparing");
        setProgress(0);
        await r.prepare(target, (ratio) => setProgress(ratio));
      }
      setPhase("running");
      const res = await r.run(target, code, { stdin, timeoutMs: 5000 });
      setResult(res);
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase("idle");
      setBusy(false);
    }
  }

  const info = ENGINE_INFO[engine];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* 左：编辑器 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="example-select">
            示例
          </label>
          <select
            id="example-select"
            value={exampleId}
            onChange={(e) => pickExample(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm"
          >
            {examples.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {current?.note}
          </span>
        </div>

        <CodeEditor
          value={code}
          onChange={setCode}
          minRows={minRows}
          filename="main.c"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => run()} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {phase === "preparing" ? "准备编译器中…" : "运行"}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => pickExample(exampleId)}
          >
            <RotateCcw className="h-4 w-4" />
            还原示例
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="选择运行引擎"
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineName)}
              className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm"
            >
              {(Object.keys(ENGINE_INFO) as EngineName[]).map((k) => (
                <option key={k} value={k}>
                  {ENGINE_INFO[k].label}
                </option>
              ))}
            </select>
            {info.accuracy === "real" ? (
              <Badge tone="primary">真编译器</Badge>
            ) : (
              <Badge tone="warning">兼容模式</Badge>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{info.description}</p>

        {phase === "preparing" && engine === "clang-wasm" && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4 text-primary" />
              正在准备 C 编译器（约 {info.downloadMB} MB，只需一次，之后走缓存）
            </p>
            <Progress value={progress * 100} className="mt-3" />
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {prepareError && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
            <p className="font-medium text-danger">编译器没能准备好</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {prepareError}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setEngine("jscpp");
                void run("jscpp");
              }}
            >
              <Sparkles className="h-4 w-4" />
              用秒开模式试试
            </Button>
          </div>
        )}
      </div>

      {/* 右：输出 + stdin */}
      <div className="space-y-3">
        <div>
          <label
            htmlFor="stdin"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            程序的标准输入（scanf 读的就是这里，一行一个输入）
          </label>
          <textarea
            id="stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={"例如：\n21"}
            className={cn(
              "w-full resize-y rounded-xl border border-border bg-code-bg px-3 py-2.5",
              "font-mono text-[13px] leading-6 outline-none placeholder:text-subtle-foreground",
            )}
          />
        </div>
        <OutputPane result={result} />
      </div>
    </div>
  );
}
